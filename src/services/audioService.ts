/**
 * BandSprint - Studio-Mastered British MP3 & Synchronous Mobile Audio Engine (v7)
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
  selectBestDeviceFemaleVoice,
  resolveExaminerVoiceProfile,
  BARNABY_VOICE_PROFILE,
  isBarnabyCompanionVoice
} from '../config/voiceConfig';
import { SpeechDeliveryProfileId } from '../config/speechDirection';

export interface SpeechDeliveryMetrics {
  wordCount: number;
  durationSec: number;
  estimatedWpm: number;
  withinTargetRange: boolean;
}

/**
 * Measures spoken word count and actual delivery rate (WPM) from sample duration.
 * Target examiner prompt cadence is ~125-135 WPM (with 115-145 WPM natural variance).
 */
export function estimateSpeechDeliveryMetrics(
  text: string,
  durationSec: number
): SpeechDeliveryMetrics {
  const clean = cleanSpeechText(text);
  const words = clean ? clean.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const validDuration = durationSec > 0 && isFinite(durationSec) ? durationSec : 0;
  const estimatedWpm =
    wordCount > 0 && validDuration > 0 ? Math.round((wordCount / validDuration) * 60) : 0;
  return {
    wordCount,
    durationSec: Number(validDuration.toFixed(2)),
    estimatedWpm,
    withinTargetRange: estimatedWpm >= 115 && estimatedWpm <= 145
  };
}

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
    name: 'Prof. Arthur Pendelton (Chief IELTS Examiner)',
    role: 'Senior British Male Examiner (RP)',
    accent: 'British Received Pronunciation (en-GB)',
    gender: 'male',
    geminiVoiceName: 'Charon',
    defaultRate: 0.98,
    defaultPitch: 1.0
  },
  speaker_05: {
    id: 'speaker_05',
    name: 'Dr. Clara Sterling (Senior IELTS Examiner)',
    role: 'Senior British Female Examiner (RP)',
    accent: 'British Received Pronunciation (en-GB)',
    gender: 'female',
    geminiVoiceName: 'Aoede',
    defaultRate: 0.98,
    defaultPitch: 1.0
  },
  speaker_01: {
    id: 'speaker_01',
    name: 'Thomas (Academic Presenter)',
    role: 'British Male Academic Presenter & Campus Officer (RP)',
    accent: 'British Received Pronunciation (en-GB)',
    gender: 'male',
    geminiVoiceName: 'Orus',
    defaultRate: 1.0,
    defaultPitch: 1.0
  },
  speaker_02: {
    id: 'speaker_02',
    name: 'Libby (Academic Coordinator)',
    role: 'British Female Academic Officer (RP)',
    accent: 'British Received Pronunciation (en-GB)',
    gender: 'female',
    geminiVoiceName: 'Kore',
    defaultRate: 1.0,
    defaultPitch: 1.0
  },
  speaker_03: {
    id: 'speaker_03',
    name: 'Dr. Alistair Sterling (Senior Professor)',
    role: 'Senior Sprint Academic Examiner & Chair (RP)',
    accent: 'British Received Pronunciation (en-GB)',
    gender: 'male',
    geminiVoiceName: 'Fenrir',
    defaultRate: 1.0,
    defaultPitch: 1.0
  },

  // Australian English (AU)
  speaker_06: {
    id: 'speaker_06',
    name: 'William (Australian Environmental Tutor)',
    role: 'Australian Male · Academic & Environmental Sciences Lecturer',
    accent: 'Australian English (en-AU)',
    gender: 'male',
    geminiVoiceName: 'Fenrir',
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
    geminiVoiceName: 'Puck',
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
    name: 'Barnaby (British IELTS Mentor Companion)',
    role: 'Warm, articulate, encouraging British English IELTS mentor and study companion',
    accent: 'British English (en-GB · Mentor)',
    gender: 'male',
    geminiVoiceName: 'Puck',
    defaultRate: 1.02,
    defaultPitch: 1.03
  },

  // British Regional Speaking Examiners (Northern UK & Scottish Standard)
  speaker_uk_northern_m: {
    id: 'speaker_uk_northern_m',
    name: 'Prof. Arthur Pendelton (Northern UK)',
    role: 'Sprint Speaking Assessor · Manchester & Yorkshire Cadence',
    accent: 'Northern British English (en-GB)',
    gender: 'male',
    geminiVoiceName: 'Puck',
    defaultRate: 0.97,
    defaultPitch: 1.0
  },
  speaker_uk_northern_f: {
    id: 'speaker_uk_northern_f',
    name: 'Dr. Clara Sterling (Northern UK)',
    role: 'Sprint Speaking Assessor · Manchester & Yorkshire Cadence',
    accent: 'Northern British English (en-GB)',
    gender: 'female',
    geminiVoiceName: 'Aoede',
    defaultRate: 0.97,
    defaultPitch: 1.0
  },
  speaker_uk_scottish_m: {
    id: 'speaker_uk_scottish_m',
    name: 'Prof. Arthur Pendelton (Scottish)',
    role: 'Sprint Speaking Assessor · Edinburgh & Glasgow Standard',
    accent: 'Scottish Standard English (en-GB)',
    gender: 'male',
    geminiVoiceName: 'Fenrir',
    defaultRate: 0.96,
    defaultPitch: 1.0
  },
  speaker_uk_scottish_f: {
    id: 'speaker_uk_scottish_f',
    name: 'Dr. Clara Sterling (Scottish)',
    role: 'Sprint Speaking Assessor · Edinburgh & Glasgow Standard',
    accent: 'Scottish Standard English (en-GB)',
    gender: 'female',
    geminiVoiceName: 'Aoede',
    defaultRate: 0.96,
    defaultPitch: 1.0
  }
};

/**
 * Safely identifies harmless browser audio aborts/interruptions when switching tracks or pausing.
 * Prevents "The play() request was interrupted by a new load request" from logging as an error.
 */
export function isInterruptedPlaybackError(err: any): boolean {
  if (!err) return false;
  if (err.name === 'AbortError') return true;
  const msg =
    typeof err === 'string'
      ? err
      : (err?.message || err?.description || err?.error || (typeof err?.toString === 'function' ? err.toString() : ''));
  if (typeof msg === 'string') {
    const lower = msg.toLowerCase();
    return (
      lower.includes('interrupted') ||
      lower.includes('new load request') ||
      lower.includes('call to pause') ||
      lower.includes('pause()') ||
      lower.includes('operation was aborted') ||
      lower.includes('the play() request was interrupted')
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
  activeSynthesisProvider?: 'cloud-neural' | 'browser-speech-synthesis';
  activeVoiceId?: string;
  error: string | null;
  activeText: string;
  isAmbienceEnabled: boolean;
  isInterLinePause?: boolean;
  pauseRemainingSec?: number;
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
  rate?: number;
  accent?: string;
  deliveryProfile?: SpeechDeliveryProfileId;
  onStart?: () => void;
  onLineStart?: (index: number, line: DialogueLine) => void;
  onLineSkipped?: (index: number, line: DialogueLine, error: any) => void;
  onLineRetry?: (index: number, line: DialogueLine, attempt: number, error: any) => void;
  onComplete?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  requireAllLinesComplete?: boolean;
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
  private activePlaybackResolver: (() => void) | null = null;
  private dialoguePauseTimer: ReturnType<typeof setTimeout> | null = null;
  private dialoguePauseResolver: (() => void) | null = null;
  private loadTimeoutMs = 25000;

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
    isAmbienceEnabled: false,
    isInterLinePause: false,
    pauseRemainingSec: 0
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
  private skippedDialogueTurns: Array<{
    lineIndex: number;
    speaker: string;
    speakerId: string;
    text: string;
    error: any;
  }> = [];

  public getSkippedDialogueTurns(): Array<{
    lineIndex: number;
    speaker: string;
    speakerId: string;
    text: string;
    error: any;
  }> {
    return [...this.skippedDialogueTurns];
  }

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

  /**
   * Test hook for injecting a mock or instrumented HTMLAudioElement in automated tests
   */
  public setAudioElementForTesting(el: HTMLAudioElement | null): void {
    this.sharedAudio = el;
  }

  /**
   * Test hook for configuring startup load watchdog timeout in automated tests
   */
  public setLoadTimeoutForTesting(timeoutMs: number): void {
    this.loadTimeoutMs = Math.max(20, timeoutMs);
  }

  private detachAudioHandlers(audio: HTMLAudioElement | null): void {
    if (!audio) return;
    try {
      audio.onended = null;
      audio.onerror = null;
      audio.ontimeupdate = null;
      audio.onloadedmetadata = null;
      audio.onplay = null;
      audio.onpause = null;
      audio.onabort = null;
    } catch {}
  }

  private clearActivePlaybackResolver(): void {
    if (this.activePlaybackResolver) {
      const resolve = this.activePlaybackResolver;
      this.activePlaybackResolver = null;
      resolve();
    }
  }

  private clearDialoguePauseTimer(): void {
    if (this.dialoguePauseTimer) {
      clearTimeout(this.dialoguePauseTimer);
      this.dialoguePauseTimer = null;
    }
    if (this.state.isInterLinePause) {
      this.updateState({ isInterLinePause: false, pauseRemainingSec: 0 });
    }
    if (this.dialoguePauseResolver) {
      const resolve = this.dialoguePauseResolver;
      this.dialoguePauseResolver = null;
      resolve();
    }
  }

  private waitForInterLinePause(
    pauseMs: number,
    myGen: number,
    onPauseTick?: (elapsedPauseSec: number) => void
  ): Promise<void> {
    if (pauseMs <= 0 || this.isDialogueCancelled || this.playbackGeneration !== myGen) {
      return Promise.resolve();
    }
    this.clearDialoguePauseTimer();
    const isSignificantPause = pauseMs >= 1000;
    if (isSignificantPause) {
      this.updateState({
        isInterLinePause: true,
        pauseRemainingSec: Math.ceil(pauseMs / 1000)
      });
    }

    return new Promise<void>((resolve) => {
      this.dialoguePauseResolver = () => {
        if (isSignificantPause) {
          this.updateState({ isInterLinePause: false, pauseRemainingSec: 0 });
        }
        resolve();
      };
      let accumulatedMs = 0;
      const stepMs = Math.max(10, Math.min(100, pauseMs));

      const tick = () => {
        if (this.isDialogueCancelled || this.playbackGeneration !== myGen) {
          this.dialoguePauseTimer = null;
          this.dialoguePauseResolver = null;
          if (isSignificantPause) {
            this.updateState({ isInterLinePause: false, pauseRemainingSec: 0 });
          }
          resolve();
          return;
        }
        if (!this.state.isPaused) {
          accumulatedMs += stepMs;
          const remainingSec = Math.max(0, Math.ceil((pauseMs - accumulatedMs) / 1000));
          if (isSignificantPause) {
            this.updateState({
              isInterLinePause: true,
              pauseRemainingSec: remainingSec
            });
          }
          onPauseTick?.(Math.min(pauseMs, accumulatedMs) / 1000);
        }
        if (accumulatedMs >= pauseMs) {
          this.dialoguePauseTimer = null;
          this.dialoguePauseResolver = null;
          if (isSignificantPause) {
            this.updateState({ isInterLinePause: false, pauseRemainingSec: 0 });
          }
          resolve();
          return;
        }
        this.dialoguePauseTimer = setTimeout(tick, stepMs);
      };

      this.dialoguePauseTimer = setTimeout(tick, stepMs);
    });
  }

  private ensureSharedAudioElement(): HTMLAudioElement | null {
    if (this.sharedAudio) {
      if (this.sharedAudio.muted) {
        this.sharedAudio.muted = false;
      }
      if (this.sharedAudio.volume <= 0 && this.state.volume > 0) {
        this.sharedAudio.volume = Math.max(0.05, Math.min(1, this.state.volume));
      }
      return this.sharedAudio;
    }
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
    const el = new Audio();
    el.preload = 'auto';
    el.muted = false;
    el.defaultPlaybackRate = 1.0;
    el.playbackRate = 1.0;
    el.volume = this.state.volume > 0 ? Math.max(0.05, Math.min(1, this.state.volume)) : 1.0;
    (el as any).playsInline = true;
    el.setAttribute('playsinline', 'true');
    el.setAttribute('webkit-playsinline', 'true');
    this.sharedAudio = el;
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
    const isBarnaby = isBarnabyCompanionVoice(speakerId) || meta?.deliveryProfile === 'barnaby_companion';
    const defaultVersion = isBarnaby ? 'barnaby_v2_mentor' : 'v24';
    const params = new URLSearchParams({
      text: clean,
      speakerId,
      gender: resolvedGender,
      speed: String(speed || this.state.playbackRate || 1.0),
      v: meta?.contentVersion || defaultVersion
    });
    if (meta?.accent) params.set('accent', meta.accent);
    if (meta?.examId) params.set('examId', meta.examId);
    if (meta?.recordingId) params.set('recId', meta.recordingId);
    if (meta?.deliveryProfile) {
      params.set('profile', meta.deliveryProfile);
    } else if (isBarnaby) {
      params.set('profile', 'barnaby_companion');
    }
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
      let hasFiredStart = false;
      let loadTimer: ReturnType<typeof setTimeout> | null = null;

      const clearLoadTimer = () => {
        if (loadTimer) {
          clearTimeout(loadTimer);
          loadTimer = null;
        }
      };

      const settlePromise = () => {
        if (this.activePlaybackResolver === cancelPlayback) {
          this.activePlaybackResolver = null;
        }
        resolve();
      };

      const cancelPlayback = () => {
        if (settled) return;
        settled = true;
        clearLoadTimer();
        settlePromise();
      };

      this.activePlaybackResolver = cancelPlayback;

      const done = () => {
        if (settled) return;
        settled = true;
        clearLoadTimer();
        if (this.playbackGeneration === myGen) {
          this.detachAudioHandlers(audio);
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
        settlePromise();
      };

      const failPlayback = (err: any) => {
        if (settled) return;
        settled = true;
        clearLoadTimer();
        if (this.playbackGeneration === myGen) {
          this.detachAudioHandlers(audio);
          this.stopTimeUpdater();
          this.stopRoomTone();
          this.updateState({
            isPlaying: false,
            isPaused: false,
            isLoading: false,
            error: 'Licensed audio playback error'
          });
          options?.onError?.(err);
        }
        settlePromise();
      };

      loadTimer = setTimeout(() => {
        if (!settled && this.playbackGeneration === myGen) {
          failPlayback(new Error('Audio load timeout'));
        }
      }, this.loadTimeoutMs);

      audio.onloadedmetadata = () => {
        if (this.playbackGeneration !== myGen || settled) return;
        clearLoadTimer();
        this.updateState({
          isLoading: false,
          isPlaying: true,
          duration: audio.duration && isFinite(audio.duration) ? audio.duration : 180
        });
      };

      audio.onplay = () => {
        if (this.playbackGeneration !== myGen || settled) return;
        clearLoadTimer();
        this.updateState({ isLoading: false, isPlaying: true, isPaused: false });
        if (!hasFiredStart) {
          hasFiredStart = true;
          options?.onStart?.();
        }
      };

      audio.ontimeupdate = () => {
        if (this.playbackGeneration !== myGen || settled) return;
        clearLoadTimer();
        this.updateState({
          isLoading: false,
          isPlaying: !audio.paused,
          currentTime: audio.currentTime || 0
        });
      };

      audio.onpause = () => {
        if (this.playbackGeneration !== myGen || settled || audio.ended) return;
        this.updateState({ isPlaying: false, isPaused: true, isLoading: false });
      };

      audio.onabort = () => {
        if (settled) return;
        settled = true;
        clearLoadTimer();
        if (this.playbackGeneration === myGen) {
          this.detachAudioHandlers(audio);
          this.updateState({ isPlaying: false, isPaused: false, isLoading: false });
        }
        settlePromise();
      };

      audio.onended = () => done();
      audio.onerror = (err) => failPlayback(err);

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
              cancelPlayback();
              return;
            }
            failPlayback(err);
          }).finally(() => {
            if (this.activePlayPromise === p) {
              this.activePlayPromise = null;
            }
          });
        }
      } catch (err) {
        if (isInterruptedPlaybackError(err)) {
          cancelPlayback();
        } else {
          failPlayback(err);
        }
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
    this.clearDialoguePauseTimer();
    this.clearActivePlaybackResolver();
    this.stopTimeUpdater();
    this.stopRoomTone();

    if (this.sharedAudio) {
      try {
        this.detachAudioHandlers(this.sharedAudio);
        this.activePlayPromise = null;
        if (!this.sharedAudio.paused) {
          this.sharedAudio.pause();
        }
      } catch {}
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
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
    const speakerId = options?.speakerId || (options?.gender === 'female' ? 'speaker_05' : 'speaker_04');
    return this.speakText(text, speakerId, options);
  }

  /**
   * Helper to parse multi-line transcripts or long scripts into structured DialogueLine turns
   * so speaker labels are not read aloud and long scripts never cut off mid-passage.
   * Preserves locked single-speaker identity when speaking coaching notes or single-examiner prompts.
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

    const NON_SPEAKER_LABEL_REGEX =
      /\b(tip|note|part|section|task|step|question|example|band|rule|time|warning|hint|score|target|answer|summary|topic|cue|card|instruction|module|test|phase|grammar|lexical|fluency|pronunciation)\b/i;

    const isGenuineSpeakerTagLine = (line: string): RegExpMatchArray | null => {
      const m = line.match(/^([A-Za-z0-9\s().-]{2,32}):\s*(.+)$/);
      if (!m) return null;
      const label = m[1].trim();
      if (NON_SPEAKER_LABEL_REGEX.test(label)) return null;
      return m;
    };

    // Only parse speaker tags when the input is a multi-line script with at least 2 lines
    const hasMultiLineSpeakerTags =
      rawLines.length >= 2 && rawLines.some((l) => isGenuineSpeakerTagLine(l) !== null);

    // Preserve natural cross-sentence intonation and connected speech for single-speaker examiner prompts:
    // Synthesize single-speaker prompts up to 850 characters in a single contextual pass rather than splitting
    // every framing phrase or sentence into separate fragments.
    if (!hasMultiLineSpeakerTags && rawText.length <= 850) {
      return null;
    }

    // If this is a single-speaker very long passage (>850 chars), split at sentence boundaries up to 600 chars
    // while strictly preserving the caller's defaultSpeakerId and defaultGender!
    if (!hasMultiLineSpeakerTags) {
      const clauses = chunkTextIntoSafeClauses(rawText, 600);
      if (clauses.length <= 1) return null;
      return clauses.map((cl, idx) => ({
        speakerId: defaultSpeakerId,
        gender: defaultGender,
        text: cl,
        pauseAfterMs: idx === clauses.length - 1 ? 0 : 260
      }));
    }

    const speakerMap = new Map<string, { speakerId: string; gender: 'male' | 'female' }>();
    let alternateCount = 0;

    const inferGender = (label: string): 'male' | 'female' => {
      const lower = label.toLowerCase();
      if (
        /\b(ms|mrs|miss|woman|female|girl|lady|clara|sarah|elena|charlotte|eleanor|fiona|claire|hannah|rachel|emily|sophia|natasha|libby|sonia|maisie|molly|beatrice|receptionist|librarian|nurse)\b/.test(
          lower
        )
      ) {
        return 'female';
      }
      if (
        /\b(mr|man|male|boy|arthur|oliver|liam|david|george|julian|marcus|tariq|daniel|thomas|james|william|connor|mitchell|alistair|officer|professor|director)\b/.test(
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
      const match = isGenuineSpeakerTagLine(line);
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
        const clauses = chunkTextIntoSafeClauses(content, 550);
        clauses.forEach((cl, idx) => {
          parsed.push({
            speakerId: assigned.speakerId,
            speakerName: speakerLabel,
            gender: assigned.gender,
            text: cl,
            pauseAfterMs: idx === clauses.length - 1 ? 240 : 120
          });
        });
      } else {
        const content = line.replace(/^["“”']+|["“”']+$/g, '').trim();
        if (!content) continue;
        const clauses = chunkTextIntoSafeClauses(content, 550);
        clauses.forEach((cl, idx) => {
          parsed.push({
            speakerId: defaultSpeakerId,
            gender: defaultGender,
            text: cl,
            pauseAfterMs: idx === clauses.length - 1 ? 240 : 120
          });
        });
      }
    }

    if (parsed.length > 0) {
      parsed[parsed.length - 1].pauseAfterMs = 0;
    }

    return parsed.length > 1 ? parsed : null;
  }

  /**
   * Plays a single text passage using synchronous HTML5 <audio> streaming from `/api/tts/stream`,
   * automatically segmenting multi-speaker or very long passages so playback never truncates or cuts off.
   */
  public speakText(
    text: string,
    speakerId: string = 'speaker_04',
    options?: SpeakOptions
  ): Promise<void> {
    const resolvedSpeakerId =
      options?.gender === 'female' && (!speakerId || speakerId === 'speaker_04')
        ? 'speaker_05'
        : options?.gender === 'male' && speakerId === 'speaker_05'
        ? 'speaker_04'
        : speakerId || (options?.gender === 'female' ? 'speaker_05' : 'speaker_04');
    const speakerMeta = IELTS_SPEAKERS[resolvedSpeakerId];
    const resolvedGender: 'male' | 'female' =
      options?.gender ||
      speakerMeta?.gender ||
      getPreferredVoiceGender();
    const activeAccent = options?.accent || speakerMeta?.accent;

    // Automatically segment multi-speaker transcripts or very long scripts (>850 chars) into sequential turns
    // while preserving rate, accent, deliveryProfile, and exact start/end callbacks
    const multiTurns = this.parseLongOrMultiSpeakerScript(text, resolvedSpeakerId, resolvedGender);
    if (multiTurns && multiTurns.length > 1) {
      return this.playDialogueSequentially(multiTurns, {
        examId: options?.examId,
        recordingId: options?.recordingId,
        contentVersion: options?.contentVersion,
        rate: options?.rate,
        accent: activeAccent,
        deliveryProfile: options?.deliveryProfile,
        onStart: options?.onStart,
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
      let hasFiredStart = false;
      let loadTimer: ReturnType<typeof setTimeout> | null = null;

      const clearLoadTimer = () => {
        if (loadTimer) {
          clearTimeout(loadTimer);
          loadTimer = null;
        }
      };

      const settlePromise = () => {
        if (this.activePlaybackResolver === cancelPlayback) {
          this.activePlaybackResolver = null;
        }
        resolve();
      };

      const cancelPlayback = () => {
        if (settled) return;
        settled = true;
        clearLoadTimer();
        settlePromise();
      };

      this.activePlaybackResolver = cancelPlayback;

      const finish = () => {
        if (settled) return;
        settled = true;
        clearLoadTimer();
        if (this.playbackGeneration === myGen) {
          this.detachAudioHandlers(audio);
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
        settlePromise();
      };

      const fallbackToSynthesis = (mediaError?: any) => {
        if (settled || this.playbackGeneration !== myGen) {
          clearLoadTimer();
          settlePromise();
          return;
        }
        settled = true;
        clearLoadTimer();
        this.detachAudioHandlers(audio);
        this.speakWithBrowserFallback(
          clean,
          resolvedGender,
          myGen,
          options,
          mediaError || new Error('Audio stream playback failed')
        ).then(settlePromise);
      };

      // Startup watchdog: only fires if audio fails to load or start within loadTimeoutMs.
      // Cleared immediately once metadata/play/timeupdate arrives so active playback always waits for real `ended`.
      loadTimer = setTimeout(() => {
        if (!settled && this.playbackGeneration === myGen) {
          fallbackToSynthesis(new Error('Audio stream load timeout'));
        }
      }, this.loadTimeoutMs);

      audio.onloadedmetadata = () => {
        if (this.playbackGeneration !== myGen || settled) return;
        clearLoadTimer();
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
        if (this.playbackGeneration !== myGen || settled) return;
        clearLoadTimer();
        this.updateState({
          isLoading: false,
          isPlaying: true,
          isPaused: false,
          activeSynthesisProvider: 'cloud-neural',
          activeVoiceId: speakerMeta?.geminiVoiceName
            ? `gemini-neural-tts:${speakerMeta.geminiVoiceName}`
            : resolvedSpeakerId
        });
        if (this.state.isAmbienceEnabled) {
          this.startRoomTone();
        }
        if (!hasFiredStart) {
          hasFiredStart = true;
          options?.onStart?.();
        }
      };

      audio.ontimeupdate = () => {
        if (this.playbackGeneration !== myGen || settled) return;
        clearLoadTimer();
        this.updateState({
          isLoading: false,
          isPlaying: !audio.paused,
          currentTime: audio.currentTime || 0
        });
      };

      audio.onpause = () => {
        if (this.playbackGeneration !== myGen || settled || audio.ended) return;
        this.updateState({ isPlaying: false, isPaused: true, isLoading: false });
      };

      audio.onended = () => {
        finish();
      };

      audio.onerror = (err) => {
        fallbackToSynthesis(err || new Error('HTMLAudioElement error event'));
      };

      // SYNCHRONOUS assignment and .play() on the exact user-gesture tick!
      try {
        if (!audio.paused) {
          try { audio.pause(); } catch {}
        }
        // Server stream URL already includes `speed`, which is calibrated via server-side rubberband/atempo.
        // Keep client HTMLAudioElement playbackRate at 1.0 to prevent double rate compounding and phase artifacts.
        audio.muted = false;
        audio.defaultPlaybackRate = 1.0;
        audio.volume = this.state.volume > 0 ? Math.max(0.05, Math.min(1, this.state.volume)) : 1.0;
        audio.src = streamUrl;
        audio.playbackRate = 1.0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          this.activePlayPromise = playPromise;
          playPromise.catch((err) => {
            if (isInterruptedPlaybackError(err) && (this.isDialogueCancelled || this.playbackGeneration !== myGen)) {
              cancelPlayback();
              return;
            }
            fallbackToSynthesis(err);
          }).finally(() => {
            if (this.activePlayPromise === playPromise) {
              this.activePlayPromise = null;
            }
          });
        }
      } catch (err) {
        if (isInterruptedPlaybackError(err) && (this.isDialogueCancelled || this.playbackGeneration !== myGen)) {
          cancelPlayback();
        } else {
          fallbackToSynthesis(err);
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
      rate?: number;
      onFirstPlay?: () => void;
      onMetadataLoaded?: (durationSec: number) => void;
      onLineCompleted?: (playedSec: number) => void;
      onError?: (err: any) => void;
    }
  ): Promise<void> {
    const clean = cleanSpeechText(text);
    if (!clean || this.isDialogueCancelled || this.playbackGeneration !== myGen) {
      return Promise.resolve();
    }

    const audio = this.ensureSharedAudioElement();
    if (!audio) {
      return this.speakWithBrowserFallback(clean, gender, myGen, {
        rate: meta?.rate,
        onStart: meta?.onFirstPlay,
        onEnd: () => meta?.onLineCompleted?.(0),
        onError: meta?.onError
      });
    }

    const effectiveRate = meta?.rate || this.state.playbackRate || 1.0;
    const streamUrl = this.buildStreamUrl(clean, speakerId, gender, effectiveRate, meta);

    return new Promise<void>((resolve) => {
      let done = false;
      let hasNotifiedPlay = false;
      let hasProgressedAudio = false;
      let validDurationSec = 0;
      let maxCurrentTimeSec = 0;
      let loadTimer: ReturnType<typeof setTimeout> | null = null;

      const clearLoadTimer = () => {
        if (loadTimer) {
          clearTimeout(loadTimer);
          loadTimer = null;
        }
      };

      const completeLine = (playedSecOverride?: number) => {
        if (done) return;
        done = true;
        clearLoadTimer();
        if (this.activePlaybackResolver === completeLine) {
          this.activePlaybackResolver = null;
        }
        if (this.playbackGeneration === myGen) {
          this.detachAudioHandlers(audio);
          const actualPlayed =
            playedSecOverride !== undefined
              ? playedSecOverride
              : Math.max(validDurationSec, maxCurrentTimeSec);
          meta?.onLineCompleted?.(actualPlayed);
        }
        resolve();
      };

      this.activePlaybackResolver = completeLine;

      const handleLineFailure = (err: any) => {
        if (done || this.playbackGeneration !== myGen || this.isDialogueCancelled) {
          completeLine(0);
          return;
        }
        done = true;
        clearLoadTimer();
        if (this.activePlaybackResolver === completeLine) {
          this.activePlaybackResolver = null;
        }
        this.detachAudioHandlers(audio);

        const errName = String(err?.name || '');
        const errMsg = String(err?.message || '');
        const isAutoplayBlocked =
          errName === 'NotAllowedError' ||
          /notallowed|user didn't interact|gesture|permission/i.test(errMsg);

        if (isAutoplayBlocked) {
          meta?.onError?.(
            err instanceof Error
              ? err
              : new Error('Browser blocked audio playback. Please click Play / Resume Audio.')
          );
          resolve();
          return;
        }

        this.speakWithBrowserFallback(
          clean,
          gender,
          myGen,
          {
            rate: meta?.rate,
            onStart: !hasNotifiedPlay ? meta?.onFirstPlay : undefined,
            onEnd: () => meta?.onLineCompleted?.(0),
            onError: meta?.onError
          },
          err || new Error('Dialogue line audio failed')
        ).then(resolve);
      };

      // Startup watchdog: prevents dialogue from hanging indefinitely if a line's audio fails to load or never starts.
      // Cleared immediately once metadata/play/timeupdate fires so normal playback strictly waits for `onended`.
      loadTimer = setTimeout(() => {
        if (!done && this.playbackGeneration === myGen && !this.isDialogueCancelled) {
          handleLineFailure(new Error('Dialogue line load timeout'));
        }
      }, this.loadTimeoutMs);

      audio.onloadedmetadata = () => {
        if (this.playbackGeneration !== myGen || done) return;
        clearLoadTimer();
        const dur =
          audio.duration && isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
        if (dur > 0) {
          validDurationSec = dur;
          meta?.onMetadataLoaded?.(dur);
        }
        this.updateState({ isLoading: false, isPlaying: true });
      };

      audio.onplay = () => {
        if (this.playbackGeneration !== myGen || done) return;
        clearLoadTimer();
        hasProgressedAudio = true;
        this.updateState({ isLoading: false, isPlaying: true, isPaused: false });
        if (!hasNotifiedPlay) {
          hasNotifiedPlay = true;
          meta?.onFirstPlay?.();
        }
      };

      audio.ontimeupdate = () => {
        if (this.playbackGeneration !== myGen || done) return;
        clearLoadTimer();
        const cur = audio.currentTime || 0;
        if (cur > 0) {
          hasProgressedAudio = true;
          if (cur > maxCurrentTimeSec) {
            maxCurrentTimeSec = cur;
          }
        }
        const dur =
          audio.duration && isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
        if (dur > 0 && validDurationSec === 0) {
          validDurationSec = dur;
          meta?.onMetadataLoaded?.(dur);
        }
        onTick?.(cur);
      };

      audio.onpause = () => {
        if (this.playbackGeneration !== myGen || done || audio.ended) return;
        this.updateState({ isPlaying: false, isPaused: true, isLoading: false });
      };

      audio.onended = () => {
        if (this.playbackGeneration !== myGen || done) return;
        const dur =
          validDurationSec ||
          (audio.duration && isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0);
        if (!hasProgressedAudio && dur <= 0 && maxCurrentTimeSec <= 0) {
          handleLineFailure(new Error('Audio element ended prematurely with zero duration'));
          return;
        }
        // Small 120ms buffer drain guard to allow mobile hardware/Bluetooth PCM buffers to flush before resolving line completion
        setTimeout(() => {
          if (this.playbackGeneration === myGen && !done) {
            completeLine(Math.max(dur, maxCurrentTimeSec));
          }
        }, 120);
      };

      audio.onerror = (err) => {
        handleLineFailure(err || new Error('Dialogue line HTMLAudioElement error'));
      };

      try {
        if (!audio.paused) {
          try { audio.pause(); } catch {}
        }
        // Server stream URL already includes `speed` calibrated via server-side rubberband/atempo.
        // Keep client HTMLAudioElement playbackRate at 1.0 to avoid compounding speed twice.
        audio.muted = false;
        audio.defaultPlaybackRate = 1.0;
        audio.volume = this.state.volume > 0 ? Math.max(0.05, Math.min(1, this.state.volume)) : 1.0;
        audio.src = streamUrl;
        audio.playbackRate = 1.0;
        const p = audio.play();
        if (p !== undefined) {
          this.activePlayPromise = p;
          p.catch((err) => {
            if (
              isInterruptedPlaybackError(err) &&
              (this.isDialogueCancelled || this.playbackGeneration !== myGen)
            ) {
              completeLine(0);
              return;
            }
            handleLineFailure(err);
          }).finally(() => {
            if (this.activePlayPromise === p) {
              this.activePlayPromise = null;
            }
          });
        }
      } catch (err) {
        if (
          isInterruptedPlaybackError(err) &&
          (this.isDialogueCancelled || this.playbackGeneration !== myGen)
        ) {
          completeLine(0);
        } else {
          handleLineFailure(err);
        }
      }
    });
  }

  /**
   * Alias for `playDialogueSequentially` used across ListeningLab, AudioManager, and RealisticIELTSListeningTest
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
    this.skippedDialogueTurns = [];

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
          accent: line.accent || options?.accent || sp.accent,
          gender: line.gender || sp.gender
        };
      }

      const spText = (line.speaker || line.speakerName || '').toLowerCase();
      const acText = (line.accent || options?.accent || '').toLowerCase();

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

      // Canadian (only when Canadian/CA accent is explicitly specified, so British Dr. Clara Sterling is never misrouted!)
      if (
        spText.includes('canadian') ||
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

      // Female speakers
      if (
        line.gender === 'female' ||
        spText.includes('clara') ||
        spText.includes('charlotte') ||
        spText.includes('sonia') ||
        spText.includes('receptionist') ||
        spText.includes('librarian') ||
        spText.includes('libby') ||
        spText.includes('emily') ||
        spText.includes('natasha') ||
        spText.includes('sarah') ||
        spText.includes('student') ||
        spText.includes('applicant')
      ) {
        let spKey = 'speaker_05'; // Dr. Clara / Charlotte
        if (spText.includes('libby') || spText.includes('librarian') || spText.includes('receptionist') || spText.includes('student') || spText.includes('applicant') || spText.includes('support')) {
          spKey = 'speaker_02'; // Libby (Conversational British Female)
        } else if (spText.includes('emily') || spText.includes('irish')) {
          spKey = 'speaker_16'; // Emily (Irish Female)
        } else if (spText.includes('natasha') || spText.includes('australian')) {
          spKey = 'speaker_07'; // Natasha (Australian Female)
        } else if (spText && spText !== 'examiner' && spText !== 'speaker') {
          // Dynamic hash distribution for named female characters
          const femalePool = ['speaker_05', 'speaker_02', 'speaker_16', 'speaker_07'];
          let charCodeSum = 0;
          for (let i = 0; i < spText.length; i++) charCodeSum += spText.charCodeAt(i);
          spKey = femalePool[charCodeSum % femalePool.length];
        }
        const sp = IELTS_SPEAKERS[spKey] || IELTS_SPEAKERS['speaker_05'];
        return { speakerId: sp.id, speakerName: displayLabel || sp.name, accent: sp.accent, gender: 'female' };
      }

      // Male speakers
      if (
        spText.includes('thomas') ||
        spText.includes('student') ||
        spText.includes('applicant') ||
        spText.includes('candidate') ||
        spText.includes('customer') ||
        spText.includes('caller') ||
        spText.includes('alistair') ||
        spText.includes('professor') ||
        spText.includes('lecturer')
      ) {
        let spKey = 'speaker_01'; // Thomas (Conversational British Male)
        if (spText.includes('alistair') || spText.includes('professor') || spText.includes('lecturer') || spText.includes('tutor')) {
          spKey = 'speaker_03'; // Alistair (Senior Academic Male)
        }
        const sp = IELTS_SPEAKERS[spKey] || IELTS_SPEAKERS['speaker_01'];
        return { speakerId: sp.id, speakerName: displayLabel || sp.name, accent: sp.accent, gender: 'male' };
      }

      // Default British Male Examiner (Prof. Arthur Pendelton)
      const sp = IELTS_SPEAKERS['speaker_04'];
      return { speakerId: sp.id, speakerName: displayLabel || sp.name, accent: sp.accent, gender: defaultGender && line.gender ? line.gender : 'male' };
    };

    const effectiveRate = options?.rate || this.state.playbackRate || 1.0;
    this.currentPlaylist = lines;
    this.currentPlaylistOptions = options || null;
    this.playlistDurations = lines.map((line, idx) => {
      const words = cleanSpeechText(line.text).split(/\s+/).filter(Boolean).length;
      const isLastLine = idx === lines.length - 1;
      const pauseSec = isLastLine ? 0 : (line.pauseAfterMs ?? 220) / 1000;
      return Math.max(2, Math.ceil(words / 2.05)) + pauseSec;
    });

    let totalDuration = this.playlistDurations.reduce((acc, d) => acc + d, 0);
    const initialElapsed =
      options?.initialElapsed !== undefined
        ? options.initialElapsed
        : this.playlistDurations.slice(0, startIndex).reduce((a, b) => a + b, 0);

    let actualCumulativeElapsed = initialElapsed;
    this.lineStartElapsed = actualCumulativeElapsed;
    const firstVoice = resolveLineVoice(lines[startIndex] || lines[0]);

    this.updateState({
      isLoading: true,
      isPlaying: true,
      isPaused: false,
      duration: totalDuration,
      currentTime: actualCumulativeElapsed,
      currentSpeakerId: firstVoice.speakerId,
      currentSpeakerName: firstVoice.speakerName,
      currentAccent: firstVoice.accent,
      activeText: lines[startIndex]?.text || '',
      error: null
    });

    if (this.state.isAmbienceEnabled) {
      this.startRoomTone();
    }

    let hasFiredDialogueStart = false;
    let fatalLineError: any = null;
    let completedLinesCount = 0;
    let consecutiveFailures = 0;
    const expectedLinesCount = lines.length - startIndex;

    for (let i = startIndex; i < lines.length; i++) {
      if (this.isDialogueCancelled || this.playbackGeneration !== myGen) return;

      // Wait while paused
      while (this.state.isPaused && !this.isDialogueCancelled && this.playbackGeneration === myGen) {
        await new Promise((r) => setTimeout(r, 80));
      }
      if (this.isDialogueCancelled || this.playbackGeneration !== myGen) return;

      this.playlistIndex = i;
      const line = lines[i];
      const lv = resolveLineVoice(line);
      const isLastLine = i === lines.length - 1;
      const nextLine = !isLastLine ? lines[i + 1] : null;
      const nextLv = nextLine ? resolveLineVoice(nextLine) : null;
      const defaultTurnPauseMs = nextLv && nextLv.speakerId === lv.speakerId ? 140 : 220;
      const pauseMs = isLastLine ? 0 : (line.pauseAfterMs ?? defaultTurnPauseMs);
      const pauseSec = pauseMs / 1000;

      const lineBaseElapsed = actualCumulativeElapsed;
      this.lineStartElapsed = lineBaseElapsed;

      options?.onLineStart?.(i, line);
      this.updateState({
        currentSpeakerId: lv.speakerId,
        currentSpeakerName: lv.speakerName,
        currentAccent: lv.accent,
        activeText: line.text,
        currentTime: lineBaseElapsed
      });

      let lineErrorOccurred: any = null;
      let linePlayedDurationSec = 0;

      await this.playSingleLineOnSharedAudio(
        line.text,
        lv.speakerId,
        lv.gender,
        myGen,
        (elapsedInLine) => {
          if (this.playbackGeneration === myGen && !this.state.isPaused) {
            this.updateState({
              currentTime: Math.min(totalDuration, lineBaseElapsed + elapsedInLine)
            });
          }
        },
        {
          examId: options?.examId || options?.testId,
          recordingId: options?.recordingId,
          contentVersion: options?.contentVersion,
          accent: lv.accent,
          deliveryProfile: line.deliveryProfile || options?.deliveryProfile,
          rate: effectiveRate,
          onMetadataLoaded: (realDurSec) => {
            if (this.playbackGeneration === myGen && realDurSec > 0) {
              this.playlistDurations[i] = realDurSec + pauseSec;
              totalDuration = Math.max(
                lineBaseElapsed + realDurSec + pauseSec,
                this.playlistDurations.reduce((acc, d) => acc + d, 0)
              );
              this.updateState({ duration: totalDuration });
            }
          },
          onFirstPlay: () => {
            if (!hasFiredDialogueStart && this.playbackGeneration === myGen) {
              hasFiredDialogueStart = true;
              options?.onStart?.();
            }
            // Stagger lookahead pre-warming by 1200ms to allow active line's audio stream to buffer without socket contention
            if (i + 1 < lines.length && typeof fetch === 'function') {
              setTimeout(() => {
                if (this.playbackGeneration === myGen && !this.isDialogueCancelled) {
                  const lookaheadLv = resolveLineVoice(lines[i + 1]);
                  const lookaheadUrl = this.buildStreamUrl(
                    lines[i + 1].text,
                    lookaheadLv.speakerId,
                    lookaheadLv.gender,
                    effectiveRate,
                    {
                      examId: options?.examId || options?.testId,
                      recordingId: options?.recordingId,
                      contentVersion: options?.contentVersion,
                      accent: lookaheadLv.accent,
                      deliveryProfile: lines[i + 1].deliveryProfile || options?.deliveryProfile
                    }
                  );
                  fetch(lookaheadUrl).catch(() => {});
                }
              }, 1200);
            }
          },
          onLineCompleted: (playedSec) => {
            linePlayedDurationSec = playedSec;
          },
          onError: (err) => {
            lineErrorOccurred = err;
          }
        }
      );

      if (this.isDialogueCancelled || this.playbackGeneration !== myGen) return;

      let turnSucceeded = false;
      let turnPlayedDurationSec = 0;

      if (!lineErrorOccurred) {
        turnSucceeded = true;
        turnPlayedDurationSec = linePlayedDurationSec;
        consecutiveFailures = 0;
      } else {
        const errName = String(lineErrorOccurred?.name || '');
        const errMsg = String(lineErrorOccurred?.message || lineErrorOccurred || '');
        const isAutoplayBlocked =
          errName === 'NotAllowedError' ||
          /notallowed|user didn't interact|gesture|permission/i.test(errMsg);

        if (isAutoplayBlocked) {
          // Browser audio output is blocked by policy; continuing would silently drop all sound
          fatalLineError = lineErrorOccurred;
          break;
        }

        // Bounded retry: attempt at most one retry for transient line failures
        if (!this.isDialogueCancelled && this.playbackGeneration === myGen) {
          options?.onLineRetry?.(i, line, 2, lineErrorOccurred);

          // Cancellable 200ms cooldown to allow transient buffer or network drop to settle
          await new Promise((r) => setTimeout(r, 200));
          if (this.isDialogueCancelled || this.playbackGeneration !== myGen) return;

          let retryErrorOccurred: any = null;
          let retryPlayedSec = 0;

          await this.playSingleLineOnSharedAudio(
            line.text,
            lv.speakerId,
            lv.gender,
            myGen,
            (elapsedInLine) => {
              if (this.playbackGeneration === myGen && !this.state.isPaused) {
                this.updateState({
                  currentTime: Math.min(totalDuration, lineBaseElapsed + elapsedInLine)
                });
              }
            },
            {
              examId: options?.examId || options?.testId,
              recordingId: options?.recordingId,
              contentVersion: options?.contentVersion,
              accent: lv.accent,
              deliveryProfile: line.deliveryProfile || options?.deliveryProfile,
              rate: effectiveRate,
              onMetadataLoaded: (realDurSec) => {
                if (this.playbackGeneration === myGen && realDurSec > 0) {
                  this.playlistDurations[i] = realDurSec + pauseSec;
                  totalDuration = Math.max(
                    lineBaseElapsed + realDurSec + pauseSec,
                    this.playlistDurations.reduce((acc, d) => acc + d, 0)
                  );
                  this.updateState({ duration: totalDuration });
                }
              },
              onLineCompleted: (playedSec) => {
                retryPlayedSec = playedSec;
              },
              onError: (err) => {
                retryErrorOccurred = err;
              }
            }
          );

          if (this.isDialogueCancelled || this.playbackGeneration !== myGen) return;

          if (!retryErrorOccurred) {
            turnSucceeded = true;
            turnPlayedDurationSec = retryPlayedSec;
            consecutiveFailures = 0;
          } else {
            consecutiveFailures += 1;
            const finalLineError = retryErrorOccurred || lineErrorOccurred;

            // If 3 consecutive turns fail completely even after retry, audio connection is permanently broken
            if (consecutiveFailures >= 3) {
              fatalLineError = finalLineError;
              console.error(
                `[AudioService] 3 consecutive dialogue turns failed after retries. Halting dialogue safely to prevent inconsistent state.`
              );
              break;
            }

            // Record skipped turn clearly in diagnostics without terminating the exam
            const skippedTurnRecord = {
              lineIndex: i,
              speaker: lv.speakerName || line.speaker || 'Speaker',
              speakerId: lv.speakerId,
              text: line.text,
              error: finalLineError
            };
            this.skippedDialogueTurns.push(skippedTurnRecord);
            options?.onLineSkipped?.(i, line, finalLineError);
          }
        }
      }

      if (turnSucceeded) {
        completedLinesCount += 1;
        const spokenAdvanceSec =
          turnPlayedDurationSec > 0
            ? turnPlayedDurationSec
            : Math.max(0.5, this.playlistDurations[i] - pauseSec);
        actualCumulativeElapsed = Math.min(totalDuration, lineBaseElapsed + spokenAdvanceSec);
      } else {
        // Advance timeline using estimated duration so cues and questions stay in sync
        const estimatedAdvanceSec = Math.max(1.0, this.playlistDurations[i] - pauseSec);
        actualCumulativeElapsed = Math.min(totalDuration, lineBaseElapsed + estimatedAdvanceSec);
      }
      const postSpeechElapsed = actualCumulativeElapsed;

      // Only pause between consecutive lines; never add an artificial delay after the final line finishes
      if (!isLastLine && pauseMs > 0) {
        await this.waitForInterLinePause(pauseMs, myGen, (elapsedPauseSec) => {
          if (!this.isDialogueCancelled && this.playbackGeneration === myGen) {
            const currentWithPause = Math.min(totalDuration, postSpeechElapsed + elapsedPauseSec);
            actualCumulativeElapsed = currentWithPause;
            this.updateState({ currentTime: currentWithPause });
          }
        });
        actualCumulativeElapsed = Math.min(totalDuration, postSpeechElapsed + pauseSec);
      }
    }

    if (!this.isDialogueCancelled && this.playbackGeneration === myGen) {
      this.stopTimeUpdater();
      this.stopRoomTone();
      const allowSkippedLines = options?.requireAllLinesComplete === false;
      const hasFatalFailure =
        fatalLineError !== null ||
        (!allowSkippedLines && this.skippedDialogueTurns.length > 0) ||
        (completedLinesCount === 0 && this.skippedDialogueTurns.length > 0);

      if (hasFatalFailure) {
        const errObj =
          fatalLineError ||
          this.skippedDialogueTurns[0]?.error ||
          new Error('Audio playback interrupted before completion.');
        this.updateState({
          isPlaying: false,
          isPaused: false,
          isLoading: false,
          error:
            typeof errObj?.message === 'string'
              ? errObj.message
              : 'Audio playback error. Please click Resume / Retry Audio.'
        });
        options?.onError?.(errObj);
      } else {
        this.playlistIndex = this.currentPlaylist.length;
        this.lineStartElapsed = totalDuration;
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
  }

  /**
   * Offline fallback using Web Speech API if server stream is unreachable
   */
  private speakWithBrowserFallback(
    text: string,
    gender: 'male' | 'female',
    myGen: number,
    options?: SpeakOptions,
    fromMediaError?: any
  ): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      const settleOnce = (cb?: () => void) => {
        if (settled) return;
        settled = true;
        if (this.activePlaybackResolver === cancelFallback) {
          this.activePlaybackResolver = null;
        }
        cb?.();
        resolve();
      };

      const cancelFallback = () => {
        settleOnce();
      };

      this.activePlaybackResolver = cancelFallback;

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        settleOnce(() => {
          if (this.playbackGeneration === myGen) {
            if (fromMediaError) {
              const errMsg =
                typeof fromMediaError?.message === 'string'
                  ? fromMediaError.message
                  : 'Audio playback failed';
              this.updateState({
                isPlaying: false,
                isPaused: false,
                isLoading: false,
                error: errMsg
              });
              options?.onError?.(fromMediaError);
            } else {
              this.updateState({ isPlaying: false, isPaused: false, isLoading: false });
              options?.onEnd?.();
            }
          }
        });
        return;
      }

      // Avoid splitting prompts into small fragments; keep up to 320 chars per sentence group
      const clauses = chunkTextIntoSafeClauses(text, 320);
      if (clauses.length === 0) {
        settleOnce(() => {
          if (this.playbackGeneration === myGen) {
            this.updateState({ isPlaying: false, isPaused: false, isLoading: false });
            options?.onEnd?.();
          }
        });
        return;
      }

      const isBarnaby =
        isBarnabyCompanionVoice(options?.speakerId) ||
        isBarnabyCompanionVoice(this.state.currentSpeakerId) ||
        options?.deliveryProfile === 'barnaby_companion';
      const persona = resolveExaminerVoiceProfile(gender);
      const selection =
        gender === 'female' ? selectBestDeviceFemaleVoice() : selectBestDeviceMaleVoice();
      const chosenVoice = selection.voice;

      // Clearly distinguish browser speech synthesis fallback from cloud neural TTS
      this.updateState({
        activeSynthesisProvider: 'browser-speech-synthesis',
        activeVoiceId: chosenVoice?.name || `browser-${isBarnaby ? BARNABY_VOICE_PROFILE.locale : persona.locale}`
      });

      const targetBrowserRatePref = isBarnaby
        ? BARNABY_VOICE_PROFILE.browserRatePreference
        : persona.browserRatePreference;
      const targetBrowserPitchPref = isBarnaby
        ? BARNABY_VOICE_PROFILE.pitchPreference
        : persona.pitchPreference || 1.0;

      // Apply conservative browser speaking rate preference per persona (~0.92-0.94 for examiners, 0.98 for Barnaby)
      const requestedRate = options?.rate || this.state.playbackRate;
      const safeBrowserRate =
        requestedRate && isFinite(requestedRate) && requestedRate > 0.5 && requestedRate <= 1.25
          ? Math.min(requestedRate, targetBrowserRatePref)
          : targetBrowserRatePref;

      let idx = 0;
      const speakNext = () => {
        if (settled || this.playbackGeneration !== myGen || this.isDialogueCancelled) {
          settleOnce();
          return;
        }

        if (idx >= clauses.length) {
          settleOnce(() => {
            if (this.playbackGeneration === myGen && !this.isDialogueCancelled) {
              this.updateState({ isPlaying: false, isPaused: false, isLoading: false });
              options?.onEnd?.();
            }
          });
          return;
        }

        const chunk = clauses[idx];
        const utt = new SpeechSynthesisUtterance(chunk);
        if (chosenVoice) {
          utt.voice = chosenVoice;
          utt.lang = chosenVoice.lang || persona.locale || 'en-GB';
        } else {
          utt.lang = persona.locale || 'en-GB';
        }
        utt.rate = safeBrowserRate;
        utt.pitch = targetBrowserPitchPref;
        utt.volume = this.state.volume > 0 ? Math.max(0.05, Math.min(1, this.state.volume)) : 1.0;

        let done = false;
        let hasUtteranceStarted = false;
        const safetyMs = Math.max(4500, chunk.split(/\s+/).length * 600 + 2500);
        const timer = setTimeout(() => {
          if (!done) {
            done = true;
            if (!hasUtteranceStarted && fromMediaError && this.playbackGeneration === myGen) {
              settleOnce(() => {
                this.updateState({
                  isPlaying: false,
                  isPaused: false,
                  isLoading: false,
                  error:
                    typeof fromMediaError?.message === 'string'
                      ? fromMediaError.message
                      : 'Audio playback failed'
                });
                options?.onError?.(fromMediaError);
              });
              return;
            }
            idx++;
            speakNext();
          }
        }, safetyMs);

        utt.onstart = () => {
          hasUtteranceStarted = true;
          if (idx === 0 && this.playbackGeneration === myGen && !settled) {
            this.updateState({ isLoading: false, isPlaying: true });
            options?.onStart?.();
          }
        };

        utt.onend = () => {
          if (done || settled) return;
          done = true;
          clearTimeout(timer);
          idx++;
          if (idx < clauses.length && !settled && this.playbackGeneration === myGen && !this.isDialogueCancelled) {
            setTimeout(() => speakNext(), 240);
          } else {
            speakNext();
          }
        };

        utt.onerror = (err) => {
          if (done || settled) return;
          done = true;
          clearTimeout(timer);
          if (fromMediaError && this.playbackGeneration === myGen) {
            settleOnce(() => {
              this.updateState({
                isPlaying: false,
                isPaused: false,
                isLoading: false,
                error: 'Audio playback failed'
              });
              options?.onError?.(err || fromMediaError);
            });
            return;
          }
          idx++;
          speakNext();
        };

        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utt);
        } catch (err) {
          clearTimeout(timer);
          settleOnce(() => {
            if (this.playbackGeneration === myGen) {
              this.updateState({
                isPlaying: false,
                isPaused: false,
                isLoading: false,
                error: 'Audio playback failed'
              });
              options?.onError?.(err || fromMediaError);
            }
          });
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

  public getCurrentPlaylistIndex(): number {
    return this.playlistIndex;
  }

  public resume(): void {
    // If a playlist has already completed all lines, never replay or restart it on resume().
    if (this.currentPlaylist.length > 0 && this.playlistIndex >= this.currentPlaylist.length) {
      return;
    }

    // If a multi-line playlist was interrupted by an error or lost its media element source,
    // resume playDialogueSequentially from the active playlistIndex rather than restarting from 0.
    if (
      this.currentPlaylist.length > 0 &&
      this.playlistIndex < this.currentPlaylist.length &&
      (!this.sharedAudio ||
        !this.sharedAudio.src ||
        this.sharedAudio.ended ||
        Boolean(this.state.error)) &&
      !this.dialoguePauseTimer
    ) {
      void this.playDialogueSequentially(this.currentPlaylist, {
        ...this.currentPlaylistOptions,
        startIndex: this.playlistIndex,
        initialElapsed: this.lineStartElapsed
      });
      return;
    }

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
    this.updateState({ isPlaying: true, isPaused: false, error: null });
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
        initialElapsed: accumulated
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
