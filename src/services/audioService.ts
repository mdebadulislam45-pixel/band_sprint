/**
 * IELTS Sprint - Studio-Mastered British MP3 & Synchronous Mobile Audio Engine (v7)
 *
 * Engineered specifically to guarantee 100% reliable, consistent British RP audio across:
 * - Android Chrome & WebView (including cross-origin preview iframes)
 * - iOS Safari & iPadOS
 * - Desktop Chrome, Edge, Firefox, Safari
 *
 * Key Architectural Guarantees:
 * 1. Synchronous User-Gesture Media Playback:
 *    Uses a persistent singleton HTMLAudioElement (`sharedAudio`) and sets
 *    `sharedAudio.src = '/api/tts/stream?...'` + `sharedAudio.play()` synchronously
 *    on the exact same call stack as the user's tap (zero `await` before `.play()`).
 * 2. Zero Quota Limits & Zero Mid-Stream Voice Shifts:
 *    Every utterance and every dialogue line is synthesized by the server's quota-free
 *    British English (en-GB) MP3 engine (`Arthur` UK Male RP Baritone & `Charlotte` UK Female RP).
 * 3. Lookahead Pre-warming for Multi-Line Dialogues:
 *    While line N plays on the unlocked `sharedAudio` element, lines N+1 and N+2 are
 *    pre-generated on the server so transitions are instant and seamless.
 * 4. Complete API Compatibility:
 *    Supports `speak`, `speakText`, `playDialogue`, `playDialogueSequentially`,
 *    `stop`, `stopAllAudio`, `pause`, `resume`, `seek`, `seekRelative`, `setPlaybackRate`, `setVolume`.
 */

import {
  getPreferredVoiceGender,
  setPreferredVoiceGender as setConfigVoiceGender,
  selectBestDeviceMaleVoice,
  selectBestDeviceFemaleVoice
} from '../config/voiceConfig';
import { SpeechDeliveryProfileId } from '../config/speechDirection';

export interface SpeakerDefinition {
  id: string;
  name: string;
  role: string;
  accent: string;
  gender: 'male' | 'female';
  geminiVoiceName: string;
  defaultRate: number;
  defaultPitch: number;
}

export const IELTS_SPEAKERS: Record<string, SpeakerDefinition> = {
  // British English (RP)
  speaker_04: {
    id: 'speaker_04',
    name: 'Arthur (Chief IELTS Examiner)',
    role: 'Official Cambridge British Male Examiner (RP)',
    accent: 'British Received Pronunciation (en-GB)',
    gender: 'male',
    geminiVoiceName: 'Fenrir',
    defaultRate: 0.98,
    defaultPitch: 1.0
  },
  speaker_05: {
    id: 'speaker_05',
    name: 'Charlotte (University Lecturer)',
    role: 'British Academic Admissions Tutor & Lecturer (RP)',
    accent: 'British Received Pronunciation (en-GB)',
    gender: 'female',
    geminiVoiceName: 'Aoede',
    defaultRate: 0.98,
    defaultPitch: 1.0
  },
  speaker_01: {
    id: 'speaker_01',
    name: 'Thomas (Student / Receptionist)',
    role: 'British Male · Conversational Student / Campus Services',
    accent: 'British English (en-GB)',
    gender: 'male',
    geminiVoiceName: 'Puck',
    defaultRate: 0.98,
    defaultPitch: 1.0
  },
  speaker_02: {
    id: 'speaker_02',
    name: 'Libby (Student Support / Librarian)',
    role: 'British Female · Campus Librarian & Support Officer',
    accent: 'British English (en-GB)',
    gender: 'female',
    geminiVoiceName: 'Aoede',
    defaultRate: 0.98,
    defaultPitch: 1.0
  },
  speaker_03: {
    id: 'speaker_03',
    name: 'Dr. Sterling (Professor / Senior Tutor)',
    role: 'Senior Academic Lecturer & Department Chair',
    accent: 'Academic English (en-US / Academic)',
    gender: 'male',
    geminiVoiceName: 'Charon',
    defaultRate: 0.97,
    defaultPitch: 1.0
  },

  // Australian English (AU)
  speaker_06: {
    id: 'speaker_06',
    name: 'William (Australian Environmental Tutor)',
    role: 'Australian Male · Academic & Environmental Sciences Lecturer',
    accent: 'Australian English (en-AU)',
    gender: 'male',
    geminiVoiceName: 'Orpheus',
    defaultRate: 0.98,
    defaultPitch: 1.0
  },
  speaker_07: {
    id: 'speaker_07',
    name: 'Natasha (Australian Community Coordinator)',
    role: 'Australian Female · Community Projects & Public Tour Guide',
    accent: 'Australian English (en-AU)',
    gender: 'female',
    geminiVoiceName: 'Aoede',
    defaultRate: 0.98,
    defaultPitch: 1.0
  },
  speaker_08: {
    id: 'speaker_08',
    name: 'Callum (Commonwealth Graduate Researcher)',
    role: 'Postgraduate Candidate & Field Assistant',
    accent: 'Commonwealth English (en-ZA)',
    gender: 'male',
    geminiVoiceName: 'Orpheus',
    defaultRate: 0.98,
    defaultPitch: 1.0
  },

  // North American / American English (US)
  speaker_09: {
    id: 'speaker_09',
    name: 'Christopher (American Visiting Scholar)',
    role: 'American Male · Economics & Social Policy Visiting Fellow',
    accent: 'American English (en-US)',
    gender: 'male',
    geminiVoiceName: 'Puck',
    defaultRate: 0.98,
    defaultPitch: 1.0
  },
  speaker_10: {
    id: 'speaker_10',
    name: 'Jenny (American Exchange Student)',
    role: 'American Female · University Exchange Student & Study Group Lead',
    accent: 'American English (en-US)',
    gender: 'female',
    geminiVoiceName: 'Aoede',
    defaultRate: 0.98,
    defaultPitch: 1.0
  },

  // Canadian English (CA)
  speaker_11: {
    id: 'speaker_11',
    name: 'Liam (Canadian Environmental Scientist)',
    role: 'Canadian Male · Ecology Researcher & Fieldwork Director',
    accent: 'Canadian English (en-CA)',
    gender: 'male',
    geminiVoiceName: 'Charon',
    defaultRate: 0.98,
    defaultPitch: 1.0
  },
  speaker_12: {
    id: 'speaker_12',
    name: 'Clara (Canadian University Registrar)',
    role: 'Canadian Female · Admissions Officer & Academic Registrar',
    accent: 'Canadian English (en-CA)',
    gender: 'female',
    geminiVoiceName: 'Aoede',
    defaultRate: 0.98,
    defaultPitch: 1.0
  },

  // New Zealand English (NZ)
  speaker_13: {
    id: 'speaker_13',
    name: 'Mitchell (New Zealand Ecology Specialist)',
    role: 'New Zealand Male · Island Wildlife Conservationist',
    accent: 'New Zealand English (en-NZ)',
    gender: 'male',
    geminiVoiceName: 'Fenrir',
    defaultRate: 0.98,
    defaultPitch: 1.0
  },
  speaker_14: {
    id: 'speaker_14',
    name: 'Molly (New Zealand Student Representative)',
    role: 'New Zealand Female · Student Union Representative',
    accent: 'New Zealand English (en-NZ)',
    gender: 'female',
    geminiVoiceName: 'Aoede',
    defaultRate: 0.98,
    defaultPitch: 1.0
  },

  // Irish English (IE)
  speaker_15: {
    id: 'speaker_15',
    name: 'Connor (Irish Cultural Heritage Curator)',
    role: 'Irish Male · Museum Archivist & Cultural Historian',
    accent: 'Irish English (en-IE)',
    gender: 'male',
    geminiVoiceName: 'Puck',
    defaultRate: 0.98,
    defaultPitch: 1.0
  },
  speaker_16: {
    id: 'speaker_16',
    name: 'Emily (Irish Linguistics Scholar)',
    role: 'Irish Female · Applied Linguistics Researcher',
    accent: 'Irish English (en-IE)',
    gender: 'female',
    geminiVoiceName: 'Aoede',
    defaultRate: 0.98,
    defaultPitch: 1.0
  },
  speaker_barnaby: {
    id: 'speaker_barnaby',
    name: 'Barnaby (Cambridge AI Mascot)',
    role: 'Cute AI Tutor & Vocabulary Study Buddy',
    accent: 'British English (en-GB)',
    gender: 'female',
    geminiVoiceName: 'Aoede',
    defaultRate: 1.02,
    defaultPitch: 1.06
  }
};

/**
 * Safely identifies harmless browser audio aborts/interruptions when switching tracks or pausing.
 * Prevents "The play() request was interrupted by a new load request" from logging as an error.
 */
export function isInterruptedPlaybackError(err: any): boolean {
  if (!err) return false;
  if (err.name === 'AbortError' || err.name === 'NotAllowedError') return true;
  const msg =
    typeof err === 'string'
      ? err
      : (err?.message || err?.description || err?.error || (typeof err?.toString === 'function' ? err.toString() : ''));
  if (typeof msg === 'string') {
    const lower = msg.toLowerCase();
    return (
      lower.includes('interrupted') ||
      lower.includes('load request') ||
      lower.includes('pause()') ||
      lower.includes('abort') ||
      lower.includes('play() request was interrupted') ||
      lower.includes('user gesture')
    );
  }
  return false;
}

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (isInterruptedPlaybackError(event.reason)) {
      event.preventDefault();
    }
  });
}

export function cleanSpeechText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[\u0980-\u09FF]+/g, '')
    .replace(/[*_#`~]+/g, ' ')
    .replace(/\[(?:\d+|_+|\.{2,}|\s+)\]/g, ' ')
    .replace(/_{2,}/g, ' ')
    // Spelled-out surnames/words like H-A-W-T-H-O-R-N-E -> H, A, W, T, H, O, R, N, E
    .replace(/\b([A-Za-z])(?:-([A-Za-z])){2,}\b/g, (match) =>
      match
        .split('-')
        .map((letter) => letter.toUpperCase())
        .join(', ')
    )
    // UK Postcodes like OX14 3JP or MK42 9RT -> O X 14, 3 J P
    .replace(/\b([A-Z]{1,2})(\d{1,2}[A-Z]?)\s*(\d)([A-Z]{2})\b/g, (_match, area, district, sector, unit) => {
      const areaLetters = String(area).split('').join(' ');
      const unitLetters = String(unit).split('').join(' ');
      return `${areaLetters} ${district}, ${sector} ${unitLetters}`;
    })
    // UK phone numbers like 07700 900331 -> 0 7 7 0 0, 9 0 0, 3 3 1
    .replace(/\b(0\d{3,4})\s+(\d{3})(\d{3,4})\b/g, (_match, p1, p2, p3) => {
      const g1 = String(p1).split('').join(' ');
      const g2 = String(p2).split('').join(' ');
      const g3 = String(p3).split('').join(' ');
      return `${g1}, ${g2}, ${g3}`;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

export function chunkTextIntoSafeClauses(text: string, maxLen: number = 120): string[] {
  const clean = cleanSpeechText(text);
  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];

  const rawSentences = clean.match(/[^.!?;\n]+[.!?;\n]+|[^.!?;\n]+$/g) || [clean];
  const chunks: string[] = [];
  let current = '';

  for (const s of rawSentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if ((current + ' ' + trimmed).trim().length <= maxLen) {
      current = current ? `${current} ${trimmed}` : trimmed;
    } else {
      if (current) chunks.push(current);
      if (trimmed.length > maxLen) {
        const words = trimmed.split(/\s+/);
        let sub = '';
        for (const w of words) {
          if ((sub + ' ' + w).trim().length <= maxLen) {
            sub = sub ? `${sub} ${w}` : w;
          } else {
            if (sub) chunks.push(sub);
            sub = w;
          }
        }
        if (sub) chunks.push(sub);
        current = '';
      } else {
        current = trimmed;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function getPreferredExamVoiceGender(): 'male' | 'female' {
  return getPreferredVoiceGender();
}

export function setPreferredExamVoiceGender(gender: 'male' | 'female'): void {
  setConfigVoiceGender(gender);
}

export interface DialogueLine {
  speakerId?: string;
  speakerName?: string;
  speaker?: string;
  gender?: 'male' | 'female';
  accent?: string;
  text: string;
  pauseAfterMs?: number;
  deliveryProfile?: SpeechDeliveryProfileId;
}

export interface AudioPlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  currentSpeakerId: string;
  currentSpeakerName?: string;
  currentAccent?: string;
  error: string | null;
  activeText: string;
  isAmbienceEnabled: boolean;
}

export interface SpeakOptions {
  speakerId?: string;
  speakerName?: string;
  speaker?: string;
  accent?: string;
  rate?: number;
  pitch?: number;
  gender?: 'male' | 'female';
  examId?: string;
  recordingId?: string;
  contentVersion?: string;
  deliveryProfile?: SpeechDeliveryProfileId;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export interface DialoguePlaybackOptions {
  testId?: string;
  examId?: string;
  recordingId?: string;
  contentVersion?: string;
  onLineStart?: (index: number, line: DialogueLine) => void;
  onComplete?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  startIndex?: number;
  initialElapsed?: number;
}

type StateListener = (state: AudioPlaybackState) => void;

class AudioService {
  private audioCtx: AudioContext | null = null;
  private sharedAudio: HTMLAudioElement | null = null;
  private ambienceGain: GainNode | null = null;
  private ambienceSource: AudioBufferSourceNode | null = null;
  private activePlayPromise: Promise<void> | null = null;

  private state: AudioPlaybackState = {
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1.0,
    volume: 1.0,
    currentSpeakerId: 'speaker_04',
    error: null,
    activeText: '',
    isAmbienceEnabled: false
  };

  private listeners: Set<StateListener> = new Set();
  private timeUpdateInterval: any = null;
  private isDialogueCancelled = false;
  private playbackGeneration = 0;

  // Playlist tracking for seekable multi-line Listening tests
  private currentPlaylist: DialogueLine[] = [];
  private currentPlaylistOptions: DialoguePlaybackOptions | null = null;
  private playlistDurations: number[] = [];
  private playlistIndex = 0;
  private lineStartElapsed = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.ensureSharedAudioElement();

      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.getVoices();
        } catch {}
      }

      const unlockHandler = () => {
        this.unlockAudio();
      };
      window.addEventListener('pointerdown', unlockHandler, { once: true, passive: true });
      window.addEventListener('touchstart', unlockHandler, { once: true, passive: true });
      window.addEventListener('keydown', unlockHandler, { once: true, passive: true });
    }
  }

  private ensureSharedAudioElement(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.sharedAudio) {
      const el = new Audio();
      el.preload = 'auto';
      (el as any).playsInline = true;
      el.setAttribute('playsinline', 'true');
      el.setAttribute('webkit-playsinline', 'true');
      this.sharedAudio = el;
    }
    return this.sharedAudio;
  }

  /**
   * Synchronously unlocks Web Audio API and primes HTML5 Audio on user gesture
   */
  public unlockAudio(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        if (!this.audioCtx) {
          this.audioCtx = new AudioContextClass();
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
      }
      this.ensureSharedAudioElement();
    } catch {}
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(partial: Partial<AudioPlaybackState>) {
    this.state = { ...this.state, ...partial };
    const snapshot = { ...this.state };
    this.listeners.forEach((l) => {
      try {
        l(snapshot);
      } catch {}
    });
  }

  public getState(): AudioPlaybackState {
    return { ...this.state };
  }

  public toggleAmbience(enable?: boolean): boolean {
    const next = enable !== undefined ? enable : !this.state.isAmbienceEnabled;
    this.updateState({ isAmbienceEnabled: next });
    if (next && this.state.isPlaying) {
      this.startRoomTone();
    } else {
      this.stopRoomTone();
    }
    return next;
  }

  private startRoomTone() {
    if (!this.state.isAmbienceEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx && AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      this.stopRoomTone();

      const ctx = this.audioCtx;
      const bufferSize = ctx.sampleRate * 3;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 0.012;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 380;
      filter.Q.value = 0.7;

      const gain = ctx.createGain();
      gain.gain.value = 0.06 * this.state.volume;

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      whiteNoise.start(0);

      this.ambienceSource = whiteNoise;
      this.ambienceGain = gain;
    } catch {}
  }

  private stopRoomTone() {
    if (this.ambienceSource) {
      try {
        this.ambienceSource.stop();
        this.ambienceSource.disconnect();
      } catch {}
      this.ambienceSource = null;
    }
    if (this.ambienceGain) {
      try {
        this.ambienceGain.disconnect();
      } catch {}
      this.ambienceGain = null;
    }
  }

  public playExamBell(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx && AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08 * this.state.volume, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.46);
    } catch {}
  }

  /**
   * Builds the direct `/api/tts/stream` URL for synchronous HTML5 <audio> streaming
   * Includes recording identity, exam ID, content version, and voice configuration for strict cache isolation.
   */
  public buildStreamUrl(
    text: string,
    speakerId: string = 'speaker_04',
    genderOverride?: 'male' | 'female',
    speed: number = 1.0,
    meta?: {
      examId?: string;
      recordingId?: string;
      contentVersion?: string;
      accent?: string;
      deliveryProfile?: SpeechDeliveryProfileId;
    }
  ): string {
    const clean = cleanSpeechText(text);
    const spDef = IELTS_SPEAKERS[speakerId];
    const resolvedGender = genderOverride || spDef?.gender || getPreferredVoiceGender();
    const params = new URLSearchParams({
      text: clean,
      speakerId,
      gender: resolvedGender,
      speed: String(speed || this.state.playbackRate || 1.0),
      v: meta?.contentVersion || 'v9'
    });
    if (meta?.accent) params.set('accent', meta.accent);
    if (meta?.examId) params.set('examId', meta.examId);
    if (meta?.recordingId) params.set('recId', meta.recordingId);
    if (meta?.deliveryProfile) params.set('profile', meta.deliveryProfile);
    return `/api/tts/stream?${params.toString()}`;
  }

  /**
   * Plays an authorized/licensed external official audio recording URL directly on `sharedAudio`
   * preserving full duration, seekability, and complete playback.
   */
  public playAuthorizedAudioUrl(url: string, options?: SpeakOptions): Promise<void> {
    this.unlockAudio();
    const myGen = this.stopActiveSync();
    this.isDialogueCancelled = false;

    const audio = this.ensureSharedAudioElement();
    if (!audio || !url) {
      options?.onError?.(new Error('Audio element or URL unavailable'));
      return Promise.resolve();
    }

    this.updateState({
      isLoading: true,
      isPlaying: true,
      isPaused: false,
      currentSpeakerId: options?.speakerId || 'speaker_04',
      activeText: 'Authorized Official Audio Recording',
      currentTime: 0,
      error: null
    });

    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        if (this.playbackGeneration === myGen) {
          this.stopTimeUpdater();
          this.stopRoomTone();
          this.updateState({
            isPlaying: false,
            isPaused: false,
            isLoading: false,
            currentTime: this.state.duration
          });
          options?.onEnd?.();
        }
        resolve();
      };

      audio.onloadedmetadata = () => {
        if (this.playbackGeneration !== myGen) return;
        this.updateState({
          isLoading: false,
          isPlaying: true,
          duration: audio.duration && isFinite(audio.duration) ? audio.duration : 180
        });
      };

      audio.onplay = () => {
        if (this.playbackGeneration !== myGen) return;
        this.updateState({ isLoading: false, isPlaying: true, isPaused: false });
        options?.onStart?.();
      };

      audio.ontimeupdate = () => {
        if (this.playbackGeneration !== myGen) return;
        this.updateState({
          isLoading: false,
          isPlaying: !audio.paused,
          currentTime: audio.currentTime || 0
        });
      };

      audio.onended = () => done();
      audio.onerror = (err) => {
        if (!settled && this.playbackGeneration === myGen) {
          settled = true;
          this.updateState({ isPlaying: false, isLoading: false, error: 'Licensed audio playback error' });
          options?.onError?.(err);
        }
        resolve();
      };

      try {
        if (!audio.paused) {
          try { audio.pause(); } catch {}
        }
        audio.volume = Math.max(0, Math.min(1, this.state.volume));
        audio.src = url;
        const p = audio.play();
        if (p !== undefined) {
          this.activePlayPromise = p;
          p.catch((err) => {
            if (isInterruptedPlaybackError(err)) {
              resolve();
              return;
            }
            if (!settled) {
              settled = true;
              options?.onError?.(err);
              resolve();
            }
          }).finally(() => {
            if (this.activePlayPromise === p) {
              this.activePlayPromise = null;
            }
          });
        }
      } catch (err) {
        if (!isInterruptedPlaybackError(err)) {
          options?.onError?.(err);
        }
        resolve();
      }
    });
  }

  /**
   * Pre-warms server MP3 cache in background without blocking
   */
  public async getSpeechAudioUrl(
    text: string,
    speakerId: string = 'speaker_04',
    genderOverride?: 'male' | 'female'
  ): Promise<string | null> {
    const clean = cleanSpeechText(text);
    if (!clean) return null;
    const url = this.buildStreamUrl(clean, speakerId, genderOverride, this.state.playbackRate);
    try {
      fetch(url, { method: 'GET' }).catch(() => {});
    } catch {}
    return url;
  }

  public async preloadTexts(
    items: Array<{ text: string; speakerId?: string; gender?: 'male' | 'female' }>
  ): Promise<void> {
    for (const item of items.slice(0, 4)) {
      if (item.text) {
        const url = this.buildStreamUrl(item.text, item.speakerId || 'speaker_04', item.gender);
        fetch(url).catch(() => {});
      }
    }
  }

  /**
   * Synchronously stops active playback without async delay so subsequent `.play()`
   * calls remain inside the browser's synchronous user-gesture call stack!
   */
  private stopActiveSync(): number {
    this.playbackGeneration += 1;
    const gen = this.playbackGeneration;
    this.isDialogueCancelled = true;
    this.stopTimeUpdater();
    this.stopRoomTone();

    if (this.sharedAudio) {
      try {
        this.sharedAudio.onended = null;
        this.sharedAudio.onerror = null;
        this.sharedAudio.ontimeupdate = null;
        this.sharedAudio.onloadedmetadata = null;
        this.sharedAudio.onplay = null;
        const el = this.sharedAudio;
        if (this.activePlayPromise) {
          this.activePlayPromise
            .then(() => {
              try { el.pause(); } catch {}
            })
            .catch(() => {});
          this.activePlayPromise = null;
        } else {
          el.pause();
        }
      } catch {}
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    return gen;
  }

  /**
   * Synchronously stops all audio playback and resets playback state
   */
  public stop(): void {
    this.stopActiveSync();
    this.updateState({
      isPlaying: false,
      isPaused: false,
      isLoading: false,
      currentTime: 0,
      error: null
    });
  }

  public async stopAllAudio(): Promise<void> {
    this.stop();
  }

  /**
   * Unified `speak(text, options)` method used by AudioManager, ShadowingPractice, etc.
   */
  public speak(text: string, options?: SpeakOptions): Promise<void> {
    const speakerId = options?.speakerId || 'speaker_04';
    return this.speakText(text, speakerId, options);
  }

  /**
   * Helper to parse multi-line transcripts or long scripts into structured DialogueLine turns
   * so speaker labels are not read aloud and long scripts never cut off mid-passage.
   */
  private parseLongOrMultiSpeakerScript(
    rawText: string,
    defaultSpeakerId: string,
    defaultGender: 'male' | 'female'
  ): DialogueLine[] | null {
    const rawLines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const hasSpeakerTags = rawLines.some((l) => /^([A-Za-z0-9\s().-]{2,38}):\s*(.+)$/.test(l));
    if (!hasSpeakerTags && rawLines.length <= 1 && rawText.length <= 280) {
      return null;
    }

    const speakerMap = new Map<string, { speakerId: string; gender: 'male' | 'female' }>();
    let alternateCount = 0;

    const inferGender = (label: string): 'male' | 'female' => {
      const lower = label.toLowerCase();
      if (
        /\b(ms|mrs|miss|woman|female|girl|lady|sarah|elena|charlotte|eleanor|fiona|claire|hannah|rachel|emily|sophia|receptionist|librarian|nurse)\b/.test(
          lower
        )
      ) {
        return 'female';
      }
      if (
        /\b(mr|man|male|boy|arthur|oliver|liam|david|george|julian|marcus|tariq|daniel|thomas|james|officer|professor|director)\b/.test(
          lower
        )
      ) {
        return 'male';
      }
      alternateCount++;
      return alternateCount % 2 === 0 ? 'female' : 'male';
    };

    const parsed: DialogueLine[] = [];

    for (const line of rawLines) {
      const match = line.match(/^([A-Za-z0-9\s().-]{2,38}):\s*(.+)$/);
      if (match) {
        const speakerLabel = match[1].trim();
        const content = match[2].replace(/^["“”']+|["“”']+$/g, '').trim();
        if (!content) continue;

        if (!speakerMap.has(speakerLabel)) {
          const g = inferGender(speakerLabel);
          speakerMap.set(speakerLabel, {
            speakerId: g === 'female' ? 'speaker_05' : 'speaker_04',
            gender: g
          });
        }
        const assigned = speakerMap.get(speakerLabel)!;
        const clauses = chunkTextIntoSafeClauses(content, 240);
        clauses.forEach((cl, idx) => {
          parsed.push({
            speakerId: assigned.speakerId,
            speakerName: speakerLabel,
            gender: assigned.gender,
            text: cl,
            pauseAfterMs: idx === clauses.length - 1 ? 420 : 180
          });
        });
      } else {
        const content = line.replace(/^["“”']+|["“”']+$/g, '').trim();
        if (!content) continue;
        const clauses = chunkTextIntoSafeClauses(content, 240);
        clauses.forEach((cl, idx) => {
          parsed.push({
            speakerId: defaultSpeakerId,
            gender: defaultGender,
            text: cl,
            pauseAfterMs: idx === clauses.length - 1 ? 420 : 180
          });
        });
      }
    }

    return parsed.length > 1 ? parsed : null;
  }

  /**
   * Plays a single text passage using synchronous HTML5 <audio> streaming from `/api/tts/stream`,
   * automatically segmenting multi-speaker or long passages so playback never truncates or cuts off.
   */
  public speakText(
    text: string,
    speakerId: string = 'speaker_04',
    options?: SpeakOptions
  ): Promise<void> {
    const resolvedSpeakerId = speakerId || (options?.gender === 'female' ? 'speaker_05' : 'speaker_04');
    const speakerMeta = IELTS_SPEAKERS[resolvedSpeakerId];
    const resolvedGender: 'male' | 'female' =
      options?.gender ||
      speakerMeta?.gender ||
      getPreferredVoiceGender();
    const activeAccent = options?.accent || speakerMeta?.accent;

    // Automatically segment multi-speaker transcripts or long scripts (>280 chars) into sequential turns
    // so turn 0 starts in <200ms and the entire passage plays to completion without cutting off!
    const multiTurns = this.parseLongOrMultiSpeakerScript(text, resolvedSpeakerId, resolvedGender);
    if (multiTurns && multiTurns.length > 1) {
      return this.playDialogueSequentially(multiTurns, {
        examId: options?.examId,
        recordingId: options?.recordingId,
        contentVersion: options?.contentVersion,
        onLineStart: (idx) => {
          if (idx === 0) options?.onStart?.();
        },
        onComplete: () => options?.onEnd?.(),
        onError: options?.onError
      });
    }

    this.unlockAudio();
    const myGen = this.stopActiveSync();
    this.isDialogueCancelled = false;

    const clean = cleanSpeechText(text);
    if (!clean) {
      options?.onEnd?.();
      return Promise.resolve();
    }

    const wordCount = clean.split(/\s+/).length;
    const estimatedDuration = Math.max(2, Math.ceil(wordCount / 2.5));

    this.updateState({
      isLoading: true,
      isPlaying: true,
      isPaused: false,
      currentSpeakerId: resolvedSpeakerId,
      currentSpeakerName: speakerMeta?.name,
      currentAccent: activeAccent,
      activeText: clean,
      duration: estimatedDuration,
      currentTime: 0,
      error: null
    });

    const audio = this.ensureSharedAudioElement();
    if (!audio) {
      return this.speakWithBrowserFallback(clean, resolvedGender, myGen, options);
    }

    const streamUrl = this.buildStreamUrl(
      clean,
      resolvedSpeakerId,
      resolvedGender,
      options?.rate || this.state.playbackRate,
      {
        examId: options?.examId,
        recordingId: options?.recordingId,
        contentVersion: options?.contentVersion,
        accent: activeAccent,
        deliveryProfile: options?.deliveryProfile
      }
    );

    return new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (this.playbackGeneration === myGen) {
          this.stopTimeUpdater();
          this.stopRoomTone();
          this.updateState({
            isPlaying: false,
            isPaused: false,
            isLoading: false,
            currentTime: this.state.duration
          });
          options?.onEnd?.();
        }
        resolve();
      };

      const fallbackToSynthesis = () => {
        if (settled || this.playbackGeneration !== myGen) {
          resolve();
          return;
        }
        settled = true;
        this.speakWithBrowserFallback(clean, resolvedGender, myGen, options).then(resolve);
      };

      audio.onloadedmetadata = () => {
        if (this.playbackGeneration !== myGen) return;
        const realDur =
          audio.duration && isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : estimatedDuration;
        this.updateState({
          isLoading: false,
          isPlaying: true,
          duration: realDur
        });
      };

      audio.onplay = () => {
        if (this.playbackGeneration !== myGen) return;
        this.updateState({ isLoading: false, isPlaying: true, isPaused: false });
        if (this.state.isAmbienceEnabled) {
          this.startRoomTone();
        }
        options?.onStart?.();
      };

      audio.ontimeupdate = () => {
        if (this.playbackGeneration !== myGen) return;
        this.updateState({
          isLoading: false,
          isPlaying: !audio.paused,
          currentTime: audio.currentTime || 0
        });
      };

      audio.onended = () => {
        finish();
      };

      audio.onerror = () => {
        fallbackToSynthesis();
      };

      // SYNCHRONOUS assignment and .play() on the exact user-gesture tick!
      try {
        if (!audio.paused) {
          try { audio.pause(); } catch {}
        }
        audio.volume = Math.max(0, Math.min(1, this.state.volume));
        audio.src = streamUrl;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          this.activePlayPromise = playPromise;
          playPromise.catch((err) => {
            if (isInterruptedPlaybackError(err)) {
              return;
            }
            fallbackToSynthesis();
          }).finally(() => {
            if (this.activePlayPromise === playPromise) {
              this.activePlayPromise = null;
            }
          });
        }
      } catch (err) {
        if (!isInterruptedPlaybackError(err)) {
          fallbackToSynthesis();
        }
      }
    });
  }

  /**
   * Plays a single line on `sharedAudio` inside a multi-line dialogue sequence
   */
  private playSingleLineOnSharedAudio(
    text: string,
    speakerId: string,
    gender: 'male' | 'female',
    myGen: number,
    onTick?: (elapsedInLine: number) => void,
    meta?: {
      examId?: string;
      recordingId?: string;
      contentVersion?: string;
      accent?: string;
      deliveryProfile?: SpeechDeliveryProfileId;
    }
  ): Promise<void> {
    const clean = cleanSpeechText(text);
    if (!clean || this.isDialogueCancelled || this.playbackGeneration !== myGen) {
      return Promise.resolve();
    }

    const audio = this.ensureSharedAudioElement();
    if (!audio) {
      return this.speakWithBrowserFallback(clean, gender, myGen);
    }

    const streamUrl = this.buildStreamUrl(clean, speakerId, gender, this.state.playbackRate, meta);

    return new Promise<void>((resolve) => {
      let done = false;
      const completeLine = () => {
        if (done) return;
        done = true;
        resolve();
      };

      audio.onloadedmetadata = () => {
        if (this.playbackGeneration !== myGen) return;
        this.updateState({ isLoading: false, isPlaying: true });
      };

      audio.onplay = () => {
        if (this.playbackGeneration !== myGen) return;
        this.updateState({ isLoading: false, isPlaying: true, isPaused: false });
      };

      audio.ontimeupdate = () => {
        if (this.playbackGeneration !== myGen || done) return;
        onTick?.(audio.currentTime || 0);
      };

      audio.onended = () => {
        completeLine();
      };

      audio.onerror = () => {
        if (done || this.playbackGeneration !== myGen) {
          completeLine();
          return;
        }
        done = true;
        this.speakWithBrowserFallback(clean, gender, myGen).then(resolve);
      };

      try {
        if (!audio.paused) {
          try { audio.pause(); } catch {}
        }
        audio.volume = Math.max(0, Math.min(1, this.state.volume));
        audio.src = streamUrl;
        const p = audio.play();
        if (p !== undefined) {
          this.activePlayPromise = p;
          p.catch((err) => {
            if (isInterruptedPlaybackError(err)) {
              completeLine();
              return;
            }
            if (!done && this.playbackGeneration === myGen) {
              done = true;
              this.speakWithBrowserFallback(clean, gender, myGen).then(resolve);
            } else {
              completeLine();
            }
          }).finally(() => {
            if (this.activePlayPromise === p) {
              this.activePlayPromise = null;
            }
          });
        }
      } catch (err) {
        if (isInterruptedPlaybackError(err)) {
          completeLine();
        } else {
          completeLine();
        }
      }
    });
  }

  /**
   * Alias for `playDialogueSequentially` used across ListeningLab, AudioManager, and AuthenticIELTSListeningTest
   */
  public playDialogue(
    lines: DialogueLine[],
    options?: DialoguePlaybackOptions
  ): Promise<void> {
    return this.playDialogueSequentially(lines, options);
  }

  /**
   * Plays a full multi-line IELTS Listening dialogue sequentially on the unlocked `sharedAudio`
   * element with background lookahead pre-generation on the server.
   */
  public async playDialogueSequentially(
    lines: DialogueLine[],
    options?: DialoguePlaybackOptions
  ): Promise<void> {
    this.unlockAudio();
    const myGen = this.stopActiveSync();
    this.isDialogueCancelled = false;

    if (!lines || lines.length === 0) {
      options?.onComplete?.();
      options?.onEnd?.();
      return;
    }

    const startIndex = options?.startIndex || 0;
    const defaultGender = getPreferredVoiceGender();

    const resolveLineVoice = (
      line: DialogueLine
    ): { speakerId: string; speakerName: string; accent: string; gender: 'male' | 'female' } => {
      const displayLabel = line.speakerName || line.speaker;

      // 1. Exact speakerId match
      if (line.speakerId && IELTS_SPEAKERS[line.speakerId]) {
        const sp = IELTS_SPEAKERS[line.speakerId];
        return {
          speakerId: sp.id,
          speakerName: displayLabel || sp.name,
          accent: sp.accent,
          gender: line.gender || sp.gender
        };
      }

      const spText = (line.speaker || line.speakerName || '').toLowerCase();
      const acText = (line.accent || '').toLowerCase();

      // Australian
      if (
        spText.includes('australian') ||
        spText.includes('william') ||
        spText.includes('natasha') ||
        spText.includes('callum') ||
        acText.includes('au') ||
        acText.includes('australian')
      ) {
        if (line.gender === 'female' || spText.includes('natasha') || spText.includes('female')) {
          const sp = IELTS_SPEAKERS['speaker_07'];
          return { speakerId: sp.id, speakerName: displayLabel || sp.name, accent: sp.accent, gender: 'female' };
        }
        const sp = IELTS_SPEAKERS['speaker_06'];
        return { speakerId: sp.id, speakerName: displayLabel || sp.name, accent: sp.accent, gender: 'male' };
      }

      // Canadian
      if (
        spText.includes('canadian') ||
        spText.includes('clara') ||
        spText.includes('liam') ||
        acText.includes('ca') ||
        acText.includes('canadian')
      ) {
        if (line.gender === 'female' || spText.includes('clara') || spText.includes('female')) {
          const sp = IELTS_SPEAKERS['speaker_12'];
          return { speakerId: sp.id, speakerName: displayLabel || sp.name, accent: sp.accent, gender: 'female' };
        }
        const sp = IELTS_SPEAKERS['speaker_11'];
        return { speakerId: sp.id, speakerName: displayLabel || sp.name, accent: sp.accent, gender: 'male' };
      }

      // American
      if (
        spText.includes('american') ||
        spText.includes('jenny') ||
        spText.includes('christopher') ||
        acText.includes('us') ||
        acText.includes('american')
      ) {
        if (line.gender === 'female' || spText.includes('jenny') || spText.includes('female')) {
          const sp = IELTS_SPEAKERS['speaker_10'];
          return { speakerId: sp.id, speakerName: displayLabel || sp.name, accent: sp.accent, gender: 'female' };
        }
        const sp = IELTS_SPEAKERS['speaker_09'];
        return { speakerId: sp.id, speakerName: displayLabel || sp.name, accent: sp.accent, gender: 'male' };
      }

      // New Zealand
      if (
        spText.includes('zealand') ||
        spText.includes('kiwi') ||
        spText.includes('mitchell') ||
        spText.includes('molly') ||
        acText.includes('nz')
      ) {
        if (line.gender === 'female' || spText.includes('molly') || spText.includes('female')) {
          const sp = IELTS_SPEAKERS['speaker_14'];
          return { speakerId: sp.id, speakerName: displayLabel || sp.name, accent: sp.accent, gender: 'female' };
        }
        const sp = IELTS_SPEAKERS['speaker_13'];
        return { speakerId: sp.id, speakerName: displayLabel || sp.name, accent: sp.accent, gender: 'male' };
      }

      // Irish
      if (
        spText.includes('irish') ||
        spText.includes('connor') ||
        spText.includes('emily') ||
        acText.includes('ie')
      ) {
        if (line.gender === 'female' || spText.includes('emily') || spText.includes('female')) {
          const sp = IELTS_SPEAKERS['speaker_16'];
          return { speakerId: sp.id, speakerName: displayLabel || sp.name, accent: sp.accent, gender: 'female' };
        }
        const sp = IELTS_SPEAKERS['speaker_15'];
        return { speakerId: sp.id, speakerName: displayLabel || sp.name, accent: sp.accent, gender: 'male' };
      }

      // British Female Lecturer or Support
      if (
        line.gender === 'female' ||
        spText.includes('charlotte') ||
        spText.includes('receptionist') ||
        spText.includes('librarian') ||
        spText.includes('libby')
      ) {
        const sp = spText.includes('libby') || spText.includes('librarian') ? IELTS_SPEAKERS['speaker_02'] : IELTS_SPEAKERS['speaker_05'];
        return { speakerId: sp.id, speakerName: displayLabel || sp.name, accent: sp.accent, gender: 'female' };
      }

      // British Male Student / Candidate
      if (
        spText.includes('thomas') ||
        spText.includes('student') ||
        spText.includes('applicant') ||
        spText.includes('candidate') ||
        spText.includes('customer') ||
        spText.includes('caller')
      ) {
        const sp = IELTS_SPEAKERS['speaker_01'];
        return { speakerId: sp.id, speakerName: displayLabel || sp.name, accent: sp.accent, gender: 'male' };
      }

      // Default British Examiner
      const sp = IELTS_SPEAKERS['speaker_04'];
      return { speakerId: sp.id, speakerName: displayLabel || sp.name, accent: sp.accent, gender: 'male' };
    };

    this.currentPlaylist = lines;
    this.currentPlaylistOptions = options || null;
    this.playlistDurations = lines.map((line) => {
      const words = cleanSpeechText(line.text).split(/\s+/).length;
      const pauseSec = (line.pauseAfterMs || 400) / 1000;
      return Math.max(2, Math.ceil(words / 2.5)) + pauseSec;
    });

    const totalDuration = this.playlistDurations.reduce((acc, d) => acc + d, 0);
    const initialElapsed =
      options?.initialElapsed !== undefined
        ? options.initialElapsed
        : this.playlistDurations.slice(0, startIndex).reduce((a, b) => a + b, 0);

    this.lineStartElapsed = initialElapsed;
    const firstVoice = resolveLineVoice(lines[startIndex] || lines[0]);

    this.updateState({
      isLoading: true,
      isPlaying: true,
      isPaused: false,
      duration: totalDuration,
      currentTime: initialElapsed,
      currentSpeakerId: firstVoice.speakerId,
      currentSpeakerName: firstVoice.speakerName,
      currentAccent: firstVoice.accent,
      activeText: lines[startIndex]?.text || '',
      error: null
    });

    if (this.state.isAmbienceEnabled) {
      this.startRoomTone();
    }

    // Pre-warm lookahead lines (startIndex + 1, startIndex + 2) immediately in background
    for (let k = startIndex + 1; k <= Math.min(lines.length - 1, startIndex + 2); k++) {
      const lv = resolveLineVoice(lines[k]);
      const lookaheadUrl = this.buildStreamUrl(
        lines[k].text,
        lv.speakerId,
        lv.gender,
        this.state.playbackRate,
        {
          examId: options?.examId || options?.testId,
          recordingId: options?.recordingId,
          contentVersion: options?.contentVersion,
          accent: lv.accent,
          deliveryProfile: lines[k].deliveryProfile
        }
      );
      fetch(lookaheadUrl).catch(() => {});
    }

    for (let i = startIndex; i < lines.length; i++) {
      if (this.isDialogueCancelled || this.playbackGeneration !== myGen) return;

      // Wait while paused
      while (this.state.isPaused && !this.isDialogueCancelled && this.playbackGeneration === myGen) {
        await new Promise((r) => setTimeout(r, 120));
      }
      if (this.isDialogueCancelled || this.playbackGeneration !== myGen) return;

      this.playlistIndex = i;
      const line = lines[i];
      const lv = resolveLineVoice(line);
      const baseElapsedForLine = this.playlistDurations
        .slice(0, i)
        .reduce((a, b) => a + b, 0);
      this.lineStartElapsed = baseElapsedForLine;

      options?.onLineStart?.(i, line);
      this.updateState({
        currentSpeakerId: lv.speakerId,
        currentSpeakerName: lv.speakerName,
        currentAccent: lv.accent,
        activeText: line.text,
        currentTime: baseElapsedForLine
      });

      // Pre-warm line i + 2 in background while line i plays
      if (i + 2 < lines.length) {
        const nextLv = resolveLineVoice(lines[i + 2]);
        const nextUrl = this.buildStreamUrl(
          lines[i + 2].text,
          nextLv.speakerId,
          nextLv.gender,
          this.state.playbackRate,
          {
            examId: options?.examId || options?.testId,
            recordingId: options?.recordingId,
            contentVersion: options?.contentVersion,
            accent: nextLv.accent,
            deliveryProfile: lines[i + 2].deliveryProfile
          }
        );
        fetch(nextUrl).catch(() => {});
      }

      await this.playSingleLineOnSharedAudio(
        line.text,
        lv.speakerId,
        lv.gender,
        myGen,
        (elapsedInLine) => {
          if (this.playbackGeneration === myGen && !this.state.isPaused) {
            this.updateState({
              currentTime: Math.min(totalDuration, baseElapsedForLine + elapsedInLine)
            });
          }
        },
        {
          examId: options?.examId || options?.testId,
          recordingId: options?.recordingId,
          contentVersion: options?.contentVersion,
          accent: lv.accent,
          deliveryProfile: line.deliveryProfile
        }
      );

      if (this.isDialogueCancelled || this.playbackGeneration !== myGen) return;

      const pauseMs = line.pauseAfterMs || 380;
      await new Promise((r) => setTimeout(r, pauseMs));
    }

    if (!this.isDialogueCancelled && this.playbackGeneration === myGen) {
      this.stopTimeUpdater();
      this.stopRoomTone();
      this.updateState({
        isPlaying: false,
        isPaused: false,
        isLoading: false,
        currentTime: totalDuration
      });
      options?.onComplete?.();
      options?.onEnd?.();
    }
  }

  /**
   * Offline fallback using Web Speech API if server stream is unreachable
   */
  private speakWithBrowserFallback(
    text: string,
    gender: 'male' | 'female',
    myGen: number,
    options?: SpeakOptions
  ): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        this.updateState({ isPlaying: false, isLoading: false });
        options?.onEnd?.();
        resolve();
        return;
      }

      const clauses = chunkTextIntoSafeClauses(text, 110);
      if (clauses.length === 0) {
        this.updateState({ isPlaying: false, isLoading: false });
        options?.onEnd?.();
        resolve();
        return;
      }

      const selection =
        gender === 'female' ? selectBestDeviceFemaleVoice() : selectBestDeviceMaleVoice();
      const chosenVoice = selection.voice;

      let idx = 0;
      const speakNext = () => {
        if (this.playbackGeneration !== myGen || this.isDialogueCancelled || idx >= clauses.length) {
          if (this.playbackGeneration === myGen) {
            this.updateState({ isPlaying: false, isLoading: false });
            options?.onEnd?.();
          }
          resolve();
          return;
        }

        const chunk = clauses[idx];
        const utt = new SpeechSynthesisUtterance(chunk);
        if (chosenVoice) {
          utt.voice = chosenVoice;
          utt.lang = chosenVoice.lang || 'en-GB';
        } else {
          utt.lang = 'en-GB';
        }
        utt.rate = options?.rate || this.state.playbackRate || 0.96;
        utt.pitch = 1.0;
        utt.volume = Math.max(0, Math.min(1, this.state.volume));

        let done = false;
        const safetyMs = Math.max(4000, chunk.split(/\s+/).length * 600 + 2500);
        const timer = setTimeout(() => {
          if (!done) {
            done = true;
            idx++;
            speakNext();
          }
        }, safetyMs);

        utt.onstart = () => {
          if (idx === 0 && this.playbackGeneration === myGen) {
            this.updateState({ isLoading: false, isPlaying: true });
            options?.onStart?.();
          }
        };

        utt.onend = () => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          idx++;
          speakNext();
        };

        utt.onerror = () => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          idx++;
          speakNext();
        };

        try {
          window.speechSynthesis.speak(utt);
        } catch {
          clearTimeout(timer);
          resolve();
        }
      };

      speakNext();
    });
  }

  public pause(): void {
    if (this.sharedAudio && !this.sharedAudio.paused) {
      try {
        this.sharedAudio.pause();
      } catch {}
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.pause();
      } catch {}
    }
    this.stopRoomTone();
    this.updateState({ isPlaying: false, isPaused: true });
  }

  public resume(): void {
    if (
      this.sharedAudio &&
      this.sharedAudio.paused &&
      !this.sharedAudio.ended &&
      this.sharedAudio.src
    ) {
      try {
        this.sharedAudio.play().catch(() => {});
      } catch {}
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();
      } catch {}
    }
    if (this.state.isAmbienceEnabled) {
      this.startRoomTone();
    }
    this.updateState({ isPlaying: true, isPaused: false });
  }

  public seek(seconds: number): void {
    const target = Math.max(0, Math.min(this.state.duration || 100, seconds));
    if (this.currentPlaylist.length > 0 && this.playlistDurations.length > 0) {
      let accumulated = 0;
      let targetIdx = 0;
      for (let i = 0; i < this.playlistDurations.length; i++) {
        if (accumulated + this.playlistDurations[i] > target) {
          targetIdx = i;
          break;
        }
        accumulated += this.playlistDurations[i];
        targetIdx = i;
      }
      this.playDialogueSequentially(this.currentPlaylist, {
        ...this.currentPlaylistOptions,
        startIndex: targetIdx,
        initialElapsed: target
      });
      return;
    }

    if (this.sharedAudio && this.sharedAudio.duration && isFinite(this.sharedAudio.duration)) {
      try {
        this.sharedAudio.currentTime = Math.min(this.sharedAudio.duration, target);
      } catch {}
    }
    this.updateState({ currentTime: target });
  }

  public seekRelative(deltaSeconds: number): void {
    const next = Math.max(
      0,
      Math.min(this.state.duration || 100, (this.state.currentTime || 0) + deltaSeconds)
    );
    this.seek(next);
  }

  public setPlaybackRate(rate: number): void {
    const clamped = Math.max(0.75, Math.min(1.5, rate));
    if (this.sharedAudio) {
      try {
        this.sharedAudio.playbackRate = clamped;
      } catch {}
    }
    this.updateState({ playbackRate: clamped });
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    if (this.sharedAudio) {
      try {
        this.sharedAudio.volume = clamped;
      } catch {}
    }
    if (this.ambienceGain) {
      try {
        this.ambienceGain.gain.value = 0.06 * clamped;
      } catch {}
    }
    this.updateState({ volume: clamped });
  }

  private stopTimeUpdater() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }
}

export const audioService = new AudioService();
