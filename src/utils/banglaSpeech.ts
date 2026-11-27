/**
 * Studio-grade bilingual speech helper for English (en-GB) and Bangla (bn-BD).
 * Primary: Server-side cached Neural TTS (/api/tts/stream with bn-BD-NabanitaNeural & en-GB-SoniaNeural).
 * Fallback: Client-side Web Speech API when offline or unavailable.
 */

export type SpeechPlaybackMode = 'english' | 'bangla' | 'fallback' | 'unsupported';

const clientAudioCache = new Map<string, string>();
let activeHtmlAudio: HTMLAudioElement | null = null;

function stopHtmlAudioOnly(): void {
  if (activeHtmlAudio) {
    try {
      activeHtmlAudio.pause();
      activeHtmlAudio.currentTime = 0;
    } catch {}
    activeHtmlAudio = null;
  }
}

export function stopAllSpeech(): void {
  stopHtmlAudioOnly();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

function pickVoice(voices: SpeechSynthesisVoice[], langPrefixes: string[]): SpeechSynthesisVoice | null {
  for (const prefix of langPrefixes) {
    const exact = voices.find((v) => v.lang.toLowerCase() === prefix.toLowerCase());
    if (exact) return exact;
  }
  for (const prefix of langPrefixes) {
    const base = prefix.split('-')[0].toLowerCase();
    const partial = voices.find((v) => v.lang.toLowerCase().startsWith(base));
    if (partial) return partial;
  }
  return null;
}

function speakWithBrowserEnglish(text: string, rate = 0.94): SpeechPlaybackMode {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) {
    return 'unsupported';
  }
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.trim());
    const voices = window.speechSynthesis.getVoices();
    const gbVoice = pickVoice(voices, ['en-GB', 'en-AU', 'en-US']);
    if (gbVoice) utter.voice = gbVoice;
    utter.lang = gbVoice?.lang || 'en-GB';
    utter.rate = rate;
    window.speechSynthesis.speak(utter);
    return 'english';
  } catch {
    return 'unsupported';
  }
}

function speakWithBrowserBangla(banglaText: string, englishPhoneticFallback?: string): SpeechPlaybackMode {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return 'unsupported';
  }
  try {
    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices();
    const bnVoice = pickVoice(voices, ['bn-BD', 'bn-IN', 'bn']);

    if (bnVoice || !englishPhoneticFallback) {
      const utter = new SpeechSynthesisUtterance(banglaText.trim());
      if (bnVoice) utter.voice = bnVoice;
      utter.lang = bnVoice?.lang || 'bn-BD';
      utter.rate = 0.95;
      window.speechSynthesis.speak(utter);
      return bnVoice ? 'bangla' : 'fallback';
    }

    const utter = new SpeechSynthesisUtterance(englishPhoneticFallback.trim());
    const gbVoice = pickVoice(voices, ['en-GB', 'en-US']);
    if (gbVoice) utter.voice = gbVoice;
    utter.lang = gbVoice?.lang || 'en-GB';
    utter.rate = 0.92;
    window.speechSynthesis.speak(utter);
    return 'fallback';
  } catch {
    return 'unsupported';
  }
}

export const OFFLINE_AUDIO_CACHE_NAME = 'bandsprint-audio-pack-v1';

export function buildTtsStreamUrl(
  text: string,
  speakerId: string,
  accent: string,
  speed: number
): string {
  const params = new URLSearchParams({
    text: text.trim(),
    speakerId,
    accent,
    speed: String(speed),
    profile: accent === 'bn-BD' ? 'friendly_conversation' : 'pronunciation_model',
    v: 'bn_v2'
  });
  return `/api/tts/stream?${params.toString()}`;
}

async function getBlobUrlFromPersistentCache(url: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await caches.open(OFFLINE_AUDIO_CACHE_NAME);
    const matched = await cache.match(url);
    if (!matched) return null;
    const blob = await matched.blob();
    if (!blob || blob.size < 256) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

async function storeResponseInPersistentCache(url: string, res: Response): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await caches.open(OFFLINE_AUDIO_CACHE_NAME);
    await cache.put(url, res);
  } catch {}
}

async function playCachedNeuralStream(
  text: string,
  speakerId: string,
  accent: string,
  speed: number,
  onFallback: () => void
): Promise<void> {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
  const trimmed = text.trim();
  if (!trimmed) return;

  const cacheKey = `${speakerId}::${accent}::${speed.toFixed(2)}::${trimmed}`;
  const streamUrl = buildTtsStreamUrl(trimmed, speakerId, accent, speed);

  try {
    let playUrl = clientAudioCache.get(cacheKey);
    if (!playUrl) {
      const persistedUrl = await getBlobUrlFromPersistentCache(streamUrl);
      if (persistedUrl) {
        playUrl = persistedUrl;
      } else {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          onFallback();
          return;
        }
        const res = await fetch(streamUrl);
        if (!res.ok) {
          throw new Error(`TTS HTTP ${res.status}`);
        }
        const resForCache = res.clone();
        const blob = await res.blob();
        if (!blob || blob.size < 256) {
          throw new Error('Empty neural audio blob');
        }
        void storeResponseInPersistentCache(streamUrl, resForCache);
        playUrl = URL.createObjectURL(blob);
      }

      if (clientAudioCache.size > 80) {
        const firstKey = clientAudioCache.keys().next().value;
        if (firstKey) {
          const oldUrl = clientAudioCache.get(firstKey);
          if (oldUrl) URL.revokeObjectURL(oldUrl);
          clientAudioCache.delete(firstKey);
        }
      }
      clientAudioCache.set(cacheKey, playUrl);
    }

    stopAllSpeech();
    const audio = new Audio(playUrl);
    activeHtmlAudio = audio;
    audio.onended = () => {
      if (activeHtmlAudio === audio) activeHtmlAudio = null;
    };
    audio.onerror = () => {
      if (activeHtmlAudio === audio) activeHtmlAudio = null;
      onFallback();
    };
    await audio.play();
  } catch {
    onFallback();
  }
}

export async function countOfflineAudioPackClips(): Promise<number> {
  if (typeof window === 'undefined' || !('caches' in window)) return 0;
  try {
    const cache = await caches.open(OFFLINE_AUDIO_CACHE_NAME);
    const keys = await cache.keys();
    return keys.length;
  } catch {
    return 0;
  }
}

export async function precacheDailyAudioPack(
  items: Array<{ english?: string; bangla?: string }>,
  onProgress?: (done: number, total: number) => void
): Promise<{ cached: number; total: number }> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return { cached: 0, total: 0 };
  }
  const urls: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (item.english && item.english.trim()) {
      const u = buildTtsStreamUrl(item.english.trim(), 'speaker_05', 'en-GB', 0.94);
      if (!seen.has(u)) {
        seen.add(u);
        urls.push(u);
      }
    }
    if (item.bangla && item.bangla.trim()) {
      const u = buildTtsStreamUrl(item.bangla.trim(), 'speaker_bn_f', 'bn-BD', 0.96);
      if (!seen.has(u)) {
        seen.add(u);
        urls.push(u);
      }
    }
    if (urls.length >= 60) break;
  }

  const total = urls.length;
  if (total === 0) return { cached: 0, total: 0 };

  let cache: Cache;
  try {
    cache = await caches.open(OFFLINE_AUDIO_CACHE_NAME);
  } catch {
    return { cached: 0, total };
  }

  let done = 0;
  let cachedCount = 0;
  onProgress?.(0, total);

  for (let i = 0; i < urls.length; i += 4) {
    const batch = urls.slice(i, i + 4);
    await Promise.all(
      batch.map(async (url) => {
        try {
          const existing = await cache.match(url);
          if (existing) {
            cachedCount += 1;
          } else {
            const res = await fetch(url);
            if (res.ok) {
              const contentType = res.headers.get('content-type') || '';
              if (contentType.includes('audio') || contentType.includes('octet-stream') || contentType === '') {
                await cache.put(url, res);
                cachedCount += 1;
              }
            }
          }
        } catch {
          // Ignore individual failures cleanly so offline pack completes cleanly
        } finally {
          done += 1;
          onProgress?.(done, total);
        }
      })
    );
  }

  return { cached: cachedCount, total };
}

export function speakEnglishTerm(text: string, rate = 0.94): SpeechPlaybackMode {
  const trimmed = text.trim();
  if (!trimmed) return 'unsupported';
  stopAllSpeech();

  // Instant neural British RP audio with seamless persistent cache & browser Web Speech fallback
  void playCachedNeuralStream(trimmed, 'speaker_05', 'en-GB', rate, () => {
    speakWithBrowserEnglish(trimmed, rate);
  });
  return 'english';
}

export function speakBanglaCue(
  banglaText: string,
  englishPhoneticFallback?: string
): SpeechPlaybackMode {
  const trimmed = banglaText.trim();
  if (!trimmed) return 'unsupported';
  stopAllSpeech();

  // Studio-quality Bangladeshi Bengali (bn-BD-NabanitaNeural) with persistent cache & fallback
  void playCachedNeuralStream(trimmed, 'speaker_bn_f', 'bn-BD', 0.96, () => {
    speakWithBrowserBangla(trimmed, englishPhoneticFallback);
  });
  return 'bangla';
}
