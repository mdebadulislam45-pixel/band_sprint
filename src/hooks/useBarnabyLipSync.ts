import { useCallback, useEffect, useRef, useState } from 'react';
import { audioService } from '../services/audioService';

export type BarnabyFiveViseme =
  | 'rest'
  | 'open-ah'
  | 'round-oh'
  | 'wide-ee'
  | 'soft-consonant';

/** Granular 8-step mouth shape index driven by amplitude bands + Web Speech onboundary phonemes */
export type BarnabyMouthShapeIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface BarnabyMouthShapeSpec {
  index: BarnabyMouthShapeIndex;
  viseme: BarnabyFiveViseme;
  label: string;
  minAmplitude: number;
  maxAmplitude: number;
  jawOpen: number;
  lipWidth: number;
  lipRound: number;
  cheekPuff: number;
  smileLift: number;
}

export const MOUTH_AMPLITUDE_TO_VISEME_TABLE: readonly BarnabyMouthShapeSpec[] = [
  {
    index: 0,
    viseme: 'rest',
    label: 'rest-closed',
    minAmplitude: 0,
    maxAmplitude: 0.06,
    jawOpen: 0,
    lipWidth: 1.0,
    lipRound: 0,
    cheekPuff: 0,
    smileLift: 0.12,
  },
  {
    index: 1,
    viseme: 'soft-consonant',
    label: 'soft-bilabial-press',
    minAmplitude: 0.06,
    maxAmplitude: 0.18,
    jawOpen: 0.11,
    lipWidth: 0.94,
    lipRound: 0.12,
    cheekPuff: 0.12,
    smileLift: 0.16,
  },
  {
    index: 2,
    viseme: 'soft-consonant',
    label: 'soft-alveolar-part',
    minAmplitude: 0.18,
    maxAmplitude: 0.3,
    jawOpen: 0.24,
    lipWidth: 0.99,
    lipRound: 0.16,
    cheekPuff: 0.2,
    smileLift: 0.22,
  },
  {
    index: 3,
    viseme: 'wide-ee',
    label: 'wide-ee-spread',
    minAmplitude: 0.3,
    maxAmplitude: 0.52,
    jawOpen: 0.38,
    lipWidth: 1.26,
    lipRound: 0.06,
    cheekPuff: 0.32,
    smileLift: 0.72,
  },
  {
    index: 4,
    viseme: 'open-ah',
    label: 'open-ah-mid',
    minAmplitude: 0.44,
    maxAmplitude: 0.66,
    jawOpen: 0.64,
    lipWidth: 1.04,
    lipRound: 0.22,
    cheekPuff: 0.24,
    smileLift: 0.28,
  },
  {
    index: 5,
    viseme: 'open-ah',
    label: 'open-ah-peak',
    minAmplitude: 0.66,
    maxAmplitude: 1.0,
    jawOpen: 0.92,
    lipWidth: 1.1,
    lipRound: 0.2,
    cheekPuff: 0.34,
    smileLift: 0.32,
  },
  {
    index: 6,
    viseme: 'round-oh',
    label: 'round-oh-mid',
    minAmplitude: 0.32,
    maxAmplitude: 0.62,
    jawOpen: 0.52,
    lipWidth: 0.74,
    lipRound: 0.88,
    cheekPuff: 0.74,
    smileLift: 0.14,
  },
  {
    index: 7,
    viseme: 'round-oh',
    label: 'round-oo-puff',
    minAmplitude: 0.62,
    maxAmplitude: 1.0,
    jawOpen: 0.66,
    lipWidth: 0.64,
    lipRound: 0.98,
    cheekPuff: 0.96,
    smileLift: 0.1,
  },
] as const;

export function mapAmplitudeToVisemeShape(
  amplitude: number,
  hintViseme?: BarnabyFiveViseme
): BarnabyMouthShapeSpec {
  const amp = Math.max(0, Math.min(1, amplitude));
  if (amp < 0.055 || hintViseme === 'rest') {
    return MOUTH_AMPLITUDE_TO_VISEME_TABLE[0];
  }

  if (hintViseme === 'round-oh') {
    if (amp >= 0.62) return MOUTH_AMPLITUDE_TO_VISEME_TABLE[7];
    if (amp >= 0.22) return MOUTH_AMPLITUDE_TO_VISEME_TABLE[6];
    return MOUTH_AMPLITUDE_TO_VISEME_TABLE[2];
  }

  if (hintViseme === 'wide-ee') {
    if (amp >= 0.68) return MOUTH_AMPLITUDE_TO_VISEME_TABLE[5];
    if (amp >= 0.22) return MOUTH_AMPLITUDE_TO_VISEME_TABLE[3];
    return MOUTH_AMPLITUDE_TO_VISEME_TABLE[2];
  }

  if (hintViseme === 'open-ah') {
    if (amp >= 0.66) return MOUTH_AMPLITUDE_TO_VISEME_TABLE[5];
    if (amp >= 0.34) return MOUTH_AMPLITUDE_TO_VISEME_TABLE[4];
    return MOUTH_AMPLITUDE_TO_VISEME_TABLE[2];
  }

  if (hintViseme === 'soft-consonant') {
    if (amp >= 0.58) return MOUTH_AMPLITUDE_TO_VISEME_TABLE[4];
    if (amp >= 0.18) return MOUTH_AMPLITUDE_TO_VISEME_TABLE[2];
    return MOUTH_AMPLITUDE_TO_VISEME_TABLE[1];
  }

  // Amplitude-only fallback curve across indices 1..5
  if (amp < 0.18) return MOUTH_AMPLITUDE_TO_VISEME_TABLE[1];
  if (amp < 0.32) return MOUTH_AMPLITUDE_TO_VISEME_TABLE[2];
  if (amp < 0.48) return MOUTH_AMPLITUDE_TO_VISEME_TABLE[3];
  if (amp < 0.68) return MOUTH_AMPLITUDE_TO_VISEME_TABLE[4];
  return MOUTH_AMPLITUDE_TO_VISEME_TABLE[5];
}

export interface BarnabyLipSyncState {
  isSpeaking: boolean;
  viseme: BarnabyFiveViseme;
  /** Granular mouth-shape index [0..7] triggered by amplitude & onboundary events */
  mouthShapeIndex: BarnabyMouthShapeIndex;
  /** Normalized smoothed RMS volume [0..1] */
  rms: number;
  /** Mouth aperture opening weight [0..1] */
  jawOpen: number;
  /** Horizontal mouth stretch factor [0.64..1.28] */
  lipWidth: number;
  /** Lip rounding factor for 'round-oh' [0..1] */
  lipRound: number;
  /** Soft 2.5D cheek puff / smile lift [0..1] (peaks on 'round-oh') */
  cheekPuff: number;
  /** Stressed-syllable impulse [0..1] driving 3-5 deg head nod, ear perk & eye-squint smile */
  syllableStress: number;
}

export interface UseBarnabyLipSyncOptions {
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onLipSyncChange?: (state: BarnabyLipSyncState) => void;
}

export interface UseBarnabyLipSyncResult {
  lipSync: BarnabyLipSyncState;
  speak: (text: string) => void;
  stop: () => void;
}

/** Custom event so any external audio player in BandSprint can feed RMS amplitude to Barnaby */
export const BARNABY_AUDIO_RMS_EVENT = 'bandsprint_barnaby_audio_rms';

export function emitBarnabyAudioRms(rms: number, active: boolean): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(BARNABY_AUDIO_RMS_EVENT, { detail: { rms, active } })
  );
}

const INITIAL_LIP_SYNC_STATE: BarnabyLipSyncState = {
  isSpeaking: false,
  viseme: 'rest',
  mouthShapeIndex: 0,
  rms: 0,
  jawOpen: 0,
  lipWidth: 1,
  lipRound: 0,
  cheekPuff: 0,
  syllableStress: 0,
};

function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\*[^*]+\*/g, '')
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}✦☕✨💖🌟✍️🎯🏆☀️⚡🌙]/gu,
      ''
    )
    .replace(/~+/g, '')
    .replace(/\.{2,}/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveDuoBrowserVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const duoVoiceNames = /libby|sonia|maisie|jenny|serena|kate|hazel|female/i;
  const ukVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('en-gb') ||
      v.lang.toLowerCase() === 'en_gb' ||
      /british|united kingdom|\buk\b/i.test(v.name)
  );

  if (ukVoices.length > 0) {
    const duoUk = ukVoices.find((v) => duoVoiceNames.test(v.name));
    if (duoUk) return duoUk;
    const naturalUk = ukVoices.find((v) => /natural|neural|online/i.test(v.name));
    if (naturalUk) return naturalUk;
    return ukVoices[0];
  }

  const anyDuo = voices.find(
    (v) => duoVoiceNames.test(v.name) && v.lang.toLowerCase().startsWith('en')
  );
  if (anyDuo) return anyDuo;

  return (
    voices.find((v) => /natural|neural|online/i.test(v.name) && v.lang.startsWith('en')) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
    null
  );
}

/**
 * Classifies a word/syllable character slice into one of the 5 feline visemes
 * based on English vowel/consonant articulatory features.
 */
function classifyTextSliceToViseme(slice: string): BarnabyFiveViseme {
  const lower = slice.toLowerCase();
  if (/oo|ou|ow|au|oa|[ouqw]/.test(lower) && !/^(e|i|a)/.test(lower)) {
    return 'round-oh';
  }
  if (/ee|ea|ey|ay|ie|[ei]/.test(lower)) {
    return 'wide-ee';
  }
  if (/[a]/.test(lower)) {
    return 'open-ah';
  }
  if (/[ou]/.test(lower)) {
    return 'round-oh';
  }
  if (/[a-z]/.test(lower)) {
    return 'soft-consonant';
  }
  return 'rest';
}

interface BoundaryPhonemeCue {
  atMs: number;
  viseme: BarnabyFiveViseme;
  ampBias: number;
}

/**
 * Expands a single Web Speech onboundary word into 1-4 timed sub-syllable phoneme cues
 * so Barnaby cycles naturally through consonant press -> vowel aperture -> trailing sound.
 */
function buildWordVisemeTimeline(wordSlice: string): BoundaryPhonemeCue[] {
  const clean = wordSlice.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) {
    return [{ atMs: 0, viseme: 'rest', ampBias: 0.1 }];
  }

  const tokens = clean.match(/(?:oo|ou|ow|au|oa|ee|ea|ey|ay|[aeiouy]|[^aeiouy]+)/g) || [clean];
  const cues: BoundaryPhonemeCue[] = [];
  const stepMs = Math.max(58, Math.min(96, Math.round(280 / Math.max(1, tokens.length))));

  for (let i = 0; i < Math.min(4, tokens.length); i++) {
    const tok = tokens[i];
    const viseme = classifyTextSliceToViseme(tok);
    const ampBias =
      viseme === 'round-oh'
        ? tok.length >= 2
          ? 0.74
          : 0.56
        : viseme === 'open-ah'
        ? 0.72
        : viseme === 'wide-ee'
        ? 0.46
        : 0.22;
    cues.push({
      atMs: i * stepMs,
      viseme,
      ampBias,
    });
  }

  return cues;
}

/**
 * Classifies live AnalyserNode time-domain RMS + spectral bands into 5 visemes.
 */
function classifySpectrumToViseme(
  rms: number,
  freqBins: Uint8Array
): BarnabyFiveViseme {
  if (rms < 0.055) return 'rest';
  if (rms < 0.17) return 'soft-consonant';

  // Low formant energy (F1 ~ bins 1..5), mid formant (bins 6..12), bright F2/F3 (bins 13..24)
  let low = 0;
  let mid = 0;
  let high = 0;
  const maxBin = Math.min(freqBins.length, 26);
  for (let i = 1; i < maxBin; i++) {
    const val = freqBins[i];
    if (i <= 5) low += val;
    else if (i <= 12) mid += val;
    else high += val;
  }

  const lowAvg = low / 5;
  const midAvg = mid / 7;
  const highAvg = high / Math.max(1, maxBin - 13);

  // High F2/F3 spread relative to low F1 => 'wide-ee'
  if (highAvg > lowAvg * 0.72 && highAvg > 38) {
    return 'wide-ee';
  }
  // Strong rounded low F1 without wide upper spread => 'round-oh'
  if (lowAvg > midAvg * 1.18 && lowAvg > 65) {
    return 'round-oh';
  }
  // Strong mid/open F1 => 'open-ah'
  if (rms >= 0.24) {
    return 'open-ah';
  }
  return 'soft-consonant';
}

function shapeSpecToTargets(spec: BarnabyMouthShapeSpec, rms: number) {
  const amp = Math.max(0, Math.min(1, rms));
  const puffBonus = spec.viseme === 'round-oh' ? 0.14 * amp : 0;
  return {
    jawOpen: Math.min(1, spec.jawOpen * (0.65 + amp * 0.42)),
    lipWidth: spec.lipWidth,
    lipRound: spec.lipRound,
    cheekPuff: Math.min(1, spec.cheekPuff * (0.72 + amp * 0.34) + puffBonus),
  };
}

// Global single-voice lock so FloatingBarnaby, BarnabyTutorDrawer, or rapid clicks never overlap audio
let activeBarnabyGlobalStop: (() => void) | null = null;

export function stopAllBarnabyVoices(): void {
  if (activeBarnabyGlobalStop) {
    try {
      activeBarnabyGlobalStop();
    } catch {}
    activeBarnabyGlobalStop = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

export function useBarnabyLipSync(
  options: UseBarnabyLipSyncOptions = {}
): UseBarnabyLipSyncResult {
  const { onSpeakingChange, onLipSyncChange } = options;

  const [lipSync, setLipSync] = useState<BarnabyLipSyncState>(INITIAL_LIP_SYNC_STATE);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const safetyTimerRef = useRef<number | null>(null);
  const sessionIdRef = useRef<number>(0);

  const callbacksRef = useRef({ onSpeakingChange, onLipSyncChange });
  callbacksRef.current = { onSpeakingChange, onLipSyncChange };

  // Dynamic articulation state inside animation loop
  const synthStateRef = useRef({
    boundaryBoost: 0,
    stressBoost: 0,
    currentViseme: 'rest' as BarnabyFiveViseme,
    currentMouthShapeIndex: 0 as BarnabyMouthShapeIndex,
    wordCueQueue: [] as BoundaryPhonemeCue[],
    boundaryOriginTs: 0,
    smoothedRms: 0,
    smoothedJaw: 0,
    smoothedWidth: 1,
    smoothedRound: 0,
    smoothedCheek: 0,
    smoothedStress: 0,
    externalRms: 0,
    externalActive: false,
    lastSyllableTime: 0,
  });

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    const s = synthStateRef.current;
    s.boundaryBoost = 0;
    s.stressBoost = 0;
    s.currentViseme = 'rest';
    s.currentMouthShapeIndex = 0;
    s.wordCueQueue = [];
    s.boundaryOriginTs = 0;
    s.smoothedRms = 0;
    s.smoothedJaw = 0;
    s.smoothedWidth = 1;
    s.smoothedRound = 0;
    s.smoothedCheek = 0;
    s.smoothedStress = 0;

    setLipSync(INITIAL_LIP_SYNC_STATE);
    callbacksRef.current.onLipSyncChange?.(INITIAL_LIP_SYNC_STATE);
  }, []);

  const stopLocalOnly = useCallback(() => {
    // Invalidate any pending async callbacks from earlier utterances
    sessionIdRef.current += 1;
    stopLoop();
    if (audioRef.current) {
      try {
        // Detach listeners FIRST so pausing/resetting NEVER fires onerror -> robotic WebSpeech fallback!
        audioRef.current.onplay = null;
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    try {
      audioService.stop();
    } catch {}
    if (safetyTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    callbacksRef.current.onSpeakingChange?.(false);
  }, [stopLoop]);

  const stop = useCallback(() => {
    if (activeBarnabyGlobalStop === stopLocalOnly) {
      activeBarnabyGlobalStop = null;
    }
    stopLocalOnly();
  }, [stopLocalOnly]);

  const startLoop = useCallback((sourceMode: 'audio' | 'speech_synthesis' | 'external') => {
    if (typeof window === 'undefined') return;
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
    }

    const analyser = analyserRef.current;
    const timeBins = analyser ? new Uint8Array(analyser.fftSize) : null;
    const freqBins = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.008, (now - lastTs) / 1000));
      lastTs = now;
      const s = synthStateRef.current;

      let rawRms = 0;
      let targetViseme: BarnabyFiveViseme = 'rest';

      if (
        sourceMode === 'audio' &&
        analyser &&
        timeBins &&
        freqBins &&
        audioCtxRef.current?.state === 'running'
      ) {
        analyser.getByteTimeDomainData(timeBins);
        let sumSq = 0;
        for (let i = 0; i < timeBins.length; i++) {
          const norm = (timeBins[i] - 128) / 128;
          sumSq += norm * norm;
        }
        const rmsVal = Math.sqrt(sumSq / timeBins.length);
        rawRms = Math.min(1, Math.max(0, (rmsVal - 0.012) / 0.18));

        analyser.getByteFrequencyData(freqBins);
        targetViseme = classifySpectrumToViseme(rawRms, freqBins);

        if (rawRms > s.smoothedRms + 0.14 && now - s.lastSyllableTime > 260) {
          s.stressBoost = Math.min(1, 0.65 + rawRms * 0.35);
          s.lastSyllableTime = now;
        }
      } else if (sourceMode === 'audio') {
        // Smooth organic vocal envelope when AudioContext capture is unavailable/suspended
        const wave =
          0.28 +
          0.22 * Math.abs(Math.sin(now * 0.0157)) +
          0.16 * Math.abs(Math.sin(now * 0.0251 + 0.9));
        rawRms = Math.min(1, wave);
        const phaseMod = Math.sin(now * 0.0143);
        targetViseme =
          wave > 0.54
            ? 'open-ah'
            : phaseMod < -0.45
            ? 'round-oh'
            : wave > 0.36
            ? 'wide-ee'
            : 'soft-consonant';
        if (wave > 0.56 && now - s.lastSyllableTime > 340) {
          s.stressBoost = 0.85;
          s.lastSyllableTime = now;
        }
      } else if (sourceMode === 'external') {
        rawRms = Math.min(1, Math.max(0, s.externalRms));
        const phaseMod = Math.sin(now * 0.019);
        targetViseme =
          rawRms < 0.06
            ? 'rest'
            : rawRms < 0.18
            ? 'soft-consonant'
            : phaseMod > 0.35
            ? 'wide-ee'
            : phaseMod < -0.35
            ? 'round-oh'
            : 'open-ah';
        if (rawRms > 0.45 && now - s.lastSyllableTime > 320) {
          s.stressBoost = Math.min(1, rawRms * 0.85);
          s.lastSyllableTime = now;
        }
      } else {
        // Web Speech API speech_synthesis mode: advance queued sub-word onboundary phoneme indices
        s.boundaryBoost *= Math.pow(0.08, dt);
        let activeCueAmp = 0.25;
        if (s.wordCueQueue.length > 0 && s.boundaryOriginTs > 0) {
          const elapsedInWord = Math.max(0, now - s.boundaryOriginTs);
          let chosenCue = s.wordCueQueue[0];
          for (let i = 0; i < s.wordCueQueue.length; i++) {
            if (elapsedInWord >= s.wordCueQueue[i].atMs) {
              chosenCue = s.wordCueQueue[i];
            } else {
              break;
            }
          }
          s.currentViseme = chosenCue.viseme;
          activeCueAmp = chosenCue.ampBias;
        }
        const syllableWave =
          0.22 +
          0.2 * Math.abs(Math.sin(now * 0.0173)) +
          0.14 * Math.abs(Math.sin(now * 0.0289 + 1.1));
        rawRms = Math.min(1, Math.max(s.boundaryBoost * activeCueAmp + 0.18, syllableWave));
        targetViseme =
          s.currentViseme !== 'rest' ? s.currentViseme : rawRms > 0.32 ? 'open-ah' : 'soft-consonant';
      }

      s.stressBoost *= Math.pow(0.035, dt);

      const mappedSpec = mapAmplitudeToVisemeShape(rawRms, targetViseme);
      s.currentMouthShapeIndex = mappedSpec.index;

      const targets = shapeSpecToTargets(mappedSpec, rawRms);
      const blendFast = 1 - Math.exp(-22 * dt);
      const blendMed = 1 - Math.exp(-15 * dt);

      s.smoothedRms += (rawRms - s.smoothedRms) * blendFast;
      s.smoothedJaw += (targets.jawOpen - s.smoothedJaw) * blendFast;
      s.smoothedWidth += (targets.lipWidth - s.smoothedWidth) * blendMed;
      s.smoothedRound += (targets.lipRound - s.smoothedRound) * blendMed;
      s.smoothedCheek += (targets.cheekPuff - s.smoothedCheek) * blendMed;
      s.smoothedStress += (s.stressBoost - s.smoothedStress) * blendMed;

      const nextState: BarnabyLipSyncState = {
        isSpeaking: true,
        viseme: mappedSpec.viseme,
        mouthShapeIndex: mappedSpec.index,
        rms: s.smoothedRms,
        jawOpen: s.smoothedJaw,
        lipWidth: s.smoothedWidth,
        lipRound: s.smoothedRound,
        cheekPuff: s.smoothedCheek,
        syllableStress: s.smoothedStress,
      };

      setLipSync(nextState);
      callbacksRef.current.onLipSyncChange?.(nextState);

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
  }, []);

  // Listen to optional external audio RMS events from other BandSprint audio players
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onExternalRms = (e: Event) => {
      const detail = (e as CustomEvent<{ rms?: number; active?: boolean }>).detail;
      if (!detail) return;
      const s = synthStateRef.current;
      s.externalRms = typeof detail.rms === 'number' ? detail.rms : 0;
      if (detail.active && !s.externalActive) {
        s.externalActive = true;
        callbacksRef.current.onSpeakingChange?.(true);
        startLoop('external');
      } else if (!detail.active && s.externalActive) {
        s.externalActive = false;
        stopLoop();
        callbacksRef.current.onSpeakingChange?.(false);
      }
    };
    window.addEventListener(BARNABY_AUDIO_RMS_EVENT, onExternalRms);
    return () => window.removeEventListener(BARNABY_AUDIO_RMS_EVENT, onExternalRms);
  }, [startLoop, stopLoop]);

  const speak = useCallback(
    (rawText: string) => {
      if (typeof window === 'undefined') return;
      const cleaned = cleanTextForSpeech(rawText);
      if (!cleaned || cleaned.length < 2) return;

      // Stop ANY other Barnaby instance (e.g. FloatingBarnaby vs Drawer) + any lingering WebSpeech
      if (activeBarnabyGlobalStop && activeBarnabyGlobalStop !== stopLocalOnly) {
        try {
          activeBarnabyGlobalStop();
        } catch {}
      }
      stopLocalOnly();
      activeBarnabyGlobalStop = stopLocalOnly;

      const mySessionId = sessionIdRef.current;
      let fallbackUsed = false;

      const fallbackToWebSpeech = () => {
        if (mySessionId !== sessionIdRef.current || fallbackUsed) return;
        fallbackUsed = true;

        // Guarantee HTML5 audio is completely silenced before falling back to Web Speech
        if (audioRef.current) {
          try {
            audioRef.current.onplay = null;
            audioRef.current.onended = null;
            audioRef.current.onerror = null;
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          } catch {}
        }

        if (!('speechSynthesis' in window)) {
          stop();
          return;
        }
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(cleaned);
          const voice = resolveDuoBrowserVoice();
          if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang || 'en-GB';
          } else {
            utterance.lang = 'en-GB';
          }
          utterance.rate = 1.07;
          utterance.pitch = 1.14;
          utterance.volume = 0.96;

          utterance.onstart = () => {
            if (mySessionId !== sessionIdRef.current) {
              try {
                window.speechSynthesis.cancel();
              } catch {}
              return;
            }
            const s = synthStateRef.current;
            const firstWordMatch = cleaned.slice(0, 18).match(/^\S+/);
            const firstWord = firstWordMatch ? firstWordMatch[0] : cleaned.slice(0, 6);
            const cues = buildWordVisemeTimeline(firstWord);
            s.wordCueQueue = cues;
            s.boundaryOriginTs = performance.now();
            s.boundaryBoost = 0.86;
            s.stressBoost = 0.78;
            s.currentViseme = cues[0]?.viseme ?? classifyTextSliceToViseme(firstWord);
            s.currentMouthShapeIndex = mapAmplitudeToVisemeShape(
              cues[0]?.ampBias ?? 0.6,
              s.currentViseme
            ).index;
            callbacksRef.current.onSpeakingChange?.(true);
            startLoop('speech_synthesis');

            if (safetyTimerRef.current !== null) window.clearTimeout(safetyTimerRef.current);
            safetyTimerRef.current = window.setTimeout(() => {
              if (mySessionId === sessionIdRef.current) stop();
            }, 16000);
          };

          utterance.onboundary = (event) => {
            if (mySessionId !== sessionIdRef.current) return;
            const s = synthStateRef.current;
            const idx = typeof event.charIndex === 'number' ? event.charIndex : 0;
            let len =
              typeof event.charLength === 'number' && event.charLength > 0 ? event.charLength : 0;
            if (len === 0) {
              const tail = cleaned.slice(idx);
              const nextSpace = tail.search(/\s/);
              len = nextSpace > 0 ? nextSpace : Math.min(10, tail.length);
            }
            const wordSlice = cleaned.slice(idx, idx + len);
            const cues = buildWordVisemeTimeline(wordSlice);
            const initialCue = cues[0];
            const initialSpec = mapAmplitudeToVisemeShape(
              initialCue?.ampBias ?? 0.62,
              initialCue?.viseme ?? classifyTextSliceToViseme(wordSlice)
            );

            s.wordCueQueue = cues;
            s.boundaryOriginTs = performance.now();
            s.boundaryBoost = 0.96;
            s.currentViseme = initialSpec.viseme;
            s.currentMouthShapeIndex = initialSpec.index;

            if (wordSlice.trim().length >= 4 || performance.now() - s.lastSyllableTime > 360) {
              s.stressBoost = 0.95;
              s.lastSyllableTime = performance.now();
            }
          };

          utterance.onend = () => {
            if (mySessionId === sessionIdRef.current) stop();
          };
          utterance.onerror = () => {
            if (mySessionId === sessionIdRef.current) stop();
          };

          window.speechSynthesis.speak(utterance);
        } catch {
          if (mySessionId === sessionIdRef.current) stop();
        }
      };

      const streamUrl = `/api/tts/stream?text=${encodeURIComponent(
        cleaned
      )}&speakerId=speaker_barnaby&profile=barnaby_companion`;

      let audio = audioRef.current;
      if (!audio) {
        audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audioRef.current = audio;
      }

      try {
        if (!audioCtxRef.current) {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioCtx) {
            audioCtxRef.current = new AudioCtx();
          }
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume().catch(() => {});
        }
        if (
          audioCtxRef.current &&
          audioCtxRef.current.state === 'running' &&
          !mediaSourceRef.current
        ) {
          mediaSourceRef.current = audioCtxRef.current.createMediaElementSource(audio);
          analyserRef.current = audioCtxRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          analyserRef.current.smoothingTimeConstant = 0.6;
          mediaSourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioCtxRef.current.destination);
        }
      } catch {
        // Safe fallback if browser blocks Web Audio capture
      }

      audio.src = streamUrl;
      audio.preload = 'auto';

      audio.onplay = () => {
        if (mySessionId !== sessionIdRef.current) {
          try {
            audio.pause();
          } catch {}
          return;
        }
        // Belt-and-suspenders: ensure zero overlapping browser speechSynthesis when neural stream plays
        if ('speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
          } catch {}
        }
        synthStateRef.current.stressBoost = 0.8;
        callbacksRef.current.onSpeakingChange?.(true);
        startLoop('audio');

        if (safetyTimerRef.current !== null) window.clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = window.setTimeout(() => {
          if (mySessionId === sessionIdRef.current) stop();
        }, 16000);
      };

      audio.onended = () => {
        if (mySessionId === sessionIdRef.current) stop();
      };
      audio.onerror = () => {
        if (mySessionId === sessionIdRef.current) fallbackToWebSpeech();
      };

      audio.play().catch((err: unknown) => {
        if (mySessionId !== sessionIdRef.current) return;
        const errName = (err as { name?: string } | null)?.name;
        if (errName === 'AbortError') return;
        fallbackToWebSpeech();
      });
    },
    [startLoop, stop, stopLocalOnly]
  );

  useEffect(() => {
    return () => {
      stop();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stop]);

  return {
    lipSync,
    speak,
    stop,
  };
}
