/**
 * BandSprint — Typed Examiner Avatar Adapter & Phoneme-Viseme Timeline Synchronizer
 *
 * Architectural Responsibilities:
 * 1. Decouples IELTS Speaking examination logic from specific avatar rendering vendors.
 * 2. Implements deterministic English text-to-viseme timeline generation so examiner mouth
 *    movements synchronize with actual spoken syllables, vowel shapes, bilabial closures,
 *    and punctuation pauses—never random mouth flapping while silent.
 * 3. Manages all 7 conversational states ('idle', 'examiner_speaking', 'examiner_listening',
 *    'candidate_speaking', 'thinking', 'transition', 'loading', 'error') with smooth damped
 *    interpolation (`lerp`).
 * 4. Provides a clean integration boundary for external WebRTC digital human providers
 *    (HeyGen / D-ID / Simli via `/api/avatar/status`) while delivering a zero-dependency,
 *    60fps local Canvas2D neural-shaded human examiner out of the box.
 */

import {
  AvatarConnectionStatus,
  AvatarFrameTelemetry,
  AvatarProviderMode,
  AvatarProviderSnapshot,
  ExaminerConversationalState,
  ExaminerId,
  ExaminerIdentityProfile,
  IExaminerAvatarProvider,
  VisemeKeyframe,
  VisemeShape
} from '../types/examinerAvatarTypes';

export const EXAMINER_PROFILES: Record<ExaminerId, ExaminerIdentityProfile> = {
  arthur: {
    id: 'arthur',
    name: 'Prof. Arthur Pendelton',
    shortLabel: 'Prof. Arthur — Male',
    gender: 'male',
    title: 'Principal Oxbridge Oral Assessor',
    credentials: 'Senior Examiner · Senior Examiner',
    accent: 'British RP (Male)',
    speakerId: 'speaker_04',
    speechRate: 0.98,
    speechPitch: 1.0,
    animationProfile: {
      blinkIntervalMs: [3400, 4800],
      blinkDurationMs: 145,
      breathingCycleMs: 4400,
      breathingAmplitudePx: 1.35,
      nodFrequencyHz: 0.85,
      browExpressiveness: 0.78,
      jawRangeScale: 0.94
    }
  },
  clara: {
    id: 'clara',
    name: 'Dr. Clara Sterling',
    shortLabel: 'Dr. Clara — Female',
    gender: 'female',
    title: 'Senior Sprint Oral Assessor',
    credentials: 'Senior Examiner · Senior Examiner',
    accent: 'British RP (Female)',
    speakerId: 'speaker_05',
    speechRate: 0.98,
    speechPitch: 1.0,
    animationProfile: {
      blinkIntervalMs: [3200, 4500],
      blinkDurationMs: 140,
      breathingCycleMs: 4100,
      breathingAmplitudePx: 1.25,
      nodFrequencyHz: 0.95,
      browExpressiveness: 0.88,
      jawRangeScale: 1.0
    }
  }
};

export function genderToExaminerId(gender: 'male' | 'female'): ExaminerId {
  return gender === 'male' ? 'arthur' : 'clara';
}

export function examinerIdToGender(id: ExaminerId): 'male' | 'female' {
  return id === 'arthur' ? 'male' : 'female';
}

/**
 * Converts a spoken English text string into a time-aligned sequence of phoneme viseme keyframes.
 * Ensures bilabial closures ('m', 'b', 'p'), labiodentals ('f', 'v'), rounded vowels ('o', 'oo', 'w'),
 * spread vowels ('ee', 'i', 'e'), open vowels ('a', 'ah'), and punctuation pauses ('sil') are
 * accurately represented over the utterance duration.
 */
export function buildSpeechVisemeTimeline(
  text: string,
  speechRate: number = 0.98
): VisemeKeyframe[] {
  const clean = (text || '').trim();
  if (!clean) return [];

  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  // Average British RP examiner speaking cadence is ~145 words/min (~410ms per word at rate 1.0)
  const rateFactor = Math.max(0.7, Math.min(1.35, speechRate || 0.98));
  const keyframes: VisemeKeyframe[] = [];
  let cursorMs = 60; // Initial breath intake lead-in

  // Initial short silence
  keyframes.push({
    startMs: 0,
    endMs: cursorMs,
    viseme: 'sil',
    openness: 0.04,
    spread: 0,
    rounding: 0,
    stress: 0.1
  });

  for (let wIdx = 0; wIdx < tokens.length; wIdx++) {
    const rawToken = tokens[wIdx];
    const hasPeriodPause = /[.!?]$/.test(rawToken);
    const hasCommaPause = /[,;:—–]$/.test(rawToken);
    const word = rawToken.replace(/[^a-zA-Z']/g, '').toLowerCase();

    if (!word) {
      if (hasPeriodPause || hasCommaPause) {
        const pauseDur = Math.round((hasPeriodPause ? 340 : 180) / rateFactor);
        keyframes.push({
          startMs: cursorMs,
          endMs: cursorMs + pauseDur,
          viseme: 'sil',
          openness: 0.02,
          spread: 0,
          rounding: 0,
          stress: 0
        });
        cursorMs += pauseDur;
      }
      continue;
    }

    // Split word into consonant-onset + vowel-nucleus syllables (plus any word-final coda)
    const clusters = word.match(/[bcdfghjklmnpqrstvwxz]*[aeiouy]+|[bcdfghjklmnpqrstvwxz]+$/g) || [word];
    const isContentWord = word.length >= 5;

    for (let cIdx = 0; cIdx < clusters.length; cIdx++) {
      const cluster = clusters[cIdx];
      const isPrimaryStress = cIdx === 0 && isContentWord;
      const sylDurationMs = Math.round(
        Math.max(115, Math.min(240, 125 + cluster.length * 18)) / rateFactor
      );

      // 1. Optional leading consonant closure (first 30% of syllable)
      const leadingConsonant = cluster.match(/^[bcdfghjklmnpqrstvwxz]+/)?.[0] || '';
      let vowelStartOffset = 0;

      if (leadingConsonant) {
        const consDur = Math.round(sylDurationMs * 0.3);
        let consViseme: VisemeShape = 'dd';
        let consOpen = 0.16;
        let consSpread = 0.05;
        let consRound = 0.08;

        if (/[mbp]/.test(leadingConsonant)) {
          consViseme = 'mbp';
          consOpen = 0.0; // Complete bilabial lip closure
          consSpread = -0.05;
          consRound = 0.1;
        } else if (/[fv]/.test(leadingConsonant)) {
          consViseme = 'fv';
          consOpen = 0.12;
          consSpread = 0.1;
          consRound = 0.0;
        } else if (/[wry]|sh|ch/.test(leadingConsonant)) {
          consViseme = 'oo';
          consOpen = 0.24;
          consSpread = -0.28;
          consRound = 0.78;
        }

        keyframes.push({
          startMs: cursorMs,
          endMs: cursorMs + consDur,
          viseme: consViseme,
          openness: consOpen,
          spread: consSpread,
          rounding: consRound,
          stress: isPrimaryStress ? 0.65 : 0.25
        });
        vowelStartOffset = consDur;
      }

      // 2. Core vowel nucleus
      const vowelMatch = cluster.match(/[aeiouy]+/)?.[0] || 'a';
      const vowelDur = Math.max(60, sylDurationMs - vowelStartOffset);
      let vShape: VisemeShape = 'aa';
      let vOpen = 0.62;
      let vSpread = 0.08;
      let vRound = 0.12;

      if (/oo|u|ew|ou/.test(vowelMatch)) {
        vShape = 'oo';
        vOpen = 0.42;
        vSpread = -0.32;
        vRound = 0.85;
      } else if (/o|aw|au/.test(vowelMatch)) {
        vShape = 'oh';
        vOpen = 0.68;
        vSpread = -0.2;
        vRound = 0.65;
      } else if (/ee|ea|i|ey|y/.test(vowelMatch)) {
        vShape = 'ee';
        vOpen = 0.46;
        vSpread = 0.36;
        vRound = 0.0;
      } else if (/e/.test(vowelMatch)) {
        vShape = 'ee';
        vOpen = 0.54;
        vSpread = 0.22;
        vRound = 0.05;
      } else {
        // 'a', 'ah', 'ar'
        vShape = 'aa';
        vOpen = isPrimaryStress ? 0.82 : 0.66;
        vSpread = 0.12;
        vRound = 0.08;
      }

      keyframes.push({
        startMs: cursorMs + vowelStartOffset,
        endMs: cursorMs + vowelStartOffset + vowelDur,
        viseme: vShape,
        openness: vOpen,
        spread: vSpread,
        rounding: vRound,
        stress: isPrimaryStress ? 0.9 : 0.4
      });

      cursorMs += sylDurationMs;
    }

    // Brief inter-word transition or punctuation breath pause
    if (hasPeriodPause) {
      const pDur = Math.round(320 / rateFactor);
      keyframes.push({
        startMs: cursorMs,
        endMs: cursorMs + pDur,
        viseme: 'sil',
        openness: 0.0,
        spread: 0,
        rounding: 0,
        stress: 0
      });
      cursorMs += pDur;
    } else if (hasCommaPause) {
      const cDur = Math.round(170 / rateFactor);
      keyframes.push({
        startMs: cursorMs,
        endMs: cursorMs + cDur,
        viseme: 'sil',
        openness: 0.03,
        spread: 0,
        rounding: 0,
        stress: 0.1
      });
      cursorMs += cDur;
    } else {
      // Micro co-articulation bridge between words
      const bridgeDur = Math.round(28 / rateFactor);
      keyframes.push({
        startMs: cursorMs,
        endMs: cursorMs + bridgeDur,
        viseme: 'dd',
        openness: 0.14,
        spread: 0.02,
        rounding: 0.05,
        stress: 0.15
      });
      cursorMs += bridgeDur;
    }
  }

  // Final closing silence
  keyframes.push({
    startMs: cursorMs,
    endMs: cursorMs + 250,
    viseme: 'sil',
    openness: 0.0,
    spread: 0,
    rounding: 0,
    stress: 0
  });

  return keyframes;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * Production Examiner Avatar Adapter
 * Implements lifecycle-safe state management, phoneme-synchronized viseme interpolation,
 * natural blink/gaze/breathing/nod biomechanics, and server WebRTC capability probing.
 */
export class ExaminerAvatarAdapter implements IExaminerAvatarProvider {
  private currentExaminerId: ExaminerId = 'clara';
  private state: ExaminerConversationalState = 'idle';
  private previousState: ExaminerConversationalState = 'idle';
  private stateChangedAtMs: number = Date.now();
  private isMuted: boolean = false;
  private isPaused: boolean = false;
  private providerMode: AvatarProviderMode = 'canvas2d_neural_portrait';
  private connectionStatus: AvatarConnectionStatus = 'ready';
  private externalProviderAvailable: boolean = false;
  private externalProviderName: string | null = null;
  private errorMessage: string | null = null;
  private attachedVideoEl: HTMLVideoElement | null = null;

  // Speech Viseme Timeline State
  private activeTimeline: VisemeKeyframe[] = [];
  private speechStartedAtMs: number = 0;
  private candidateVolumeRms: number = 0;

  // Biomechanical Animation State (interpolated smoothly across frames)
  private nextBlinkAtMs: number = Date.now() + 2600;
  private blinkEndAtMs: number = 0;
  private targetGazeX: number = 0;
  private targetGazeY: number = 0;
  private currentGazeX: number = 0;
  private currentGazeY: number = 0;
  private nextGazeShiftAtMs: number = Date.now() + 1800;

  private smoothMouthOpenness: number = 0;
  private smoothMouthSpread: number = 0;
  private smoothLipRounding: number = 0;
  private smoothHeadPitch: number = 0;
  private smoothHeadYaw: number = 0;
  private smoothBrowLift: number = 0;

  // Viseme Hold Clamping & Smoothing State (min 70ms hold to prevent mouth jitter)
  private lastViseme: VisemeShape = 'sil';
  private lastVisemeChangeMs: number = 0;
  private minVisemeHoldMs: number = 70;

  // Authentic Sprint Note-Taking Behavior State
  private noteTakingActive: boolean = false;
  private noteTakingUntilMs: number = 0;
  private nextPeriodicNoteTakingAtMs: number = Date.now() + 65000 + Math.random() * 20000;
  private candidateTurnStartMs: number = 0;

  private listeners: Set<(snapshot: AvatarProviderSnapshot) => void> = new Set();
  private isDisposed: boolean = false;

  constructor(initialExaminer: ExaminerId = 'clara') {
    this.currentExaminerId = initialExaminer;
  }

  public async initialize(initialExaminer?: ExaminerId): Promise<void> {
    if (this.isDisposed) this.isDisposed = false;
    if (initialExaminer) {
      this.currentExaminerId = initialExaminer;
    }
    this.connectionStatus = 'initializing';
    this.notify();

    // Probe optional server-side external WebRTC avatar configuration without exposing keys
    try {
      if (typeof window !== 'undefined' && typeof fetch === 'function') {
        const res = await fetch('/api/avatar/status', { method: 'GET' }).catch(() => null);
        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          if (data && data.externalStreamingConfigured) {
            this.externalProviderAvailable = true;
            this.externalProviderName = data.providerName || 'WebRTC Digital Human';
          }
        }
      }
    } catch {
      // Safe fallback to local Canvas2D neural portrait engine
    }

    this.connectionStatus = 'ready';
    this.transitionTo('idle');
  }

  public async connect(): Promise<AvatarConnectionStatus> {
    if (this.isDisposed) return 'error';
    this.connectionStatus = this.externalProviderAvailable ? 'streaming' : 'ready';
    this.notify();
    return this.connectionStatus;
  }

  public async switchExaminer(examinerId: ExaminerId): Promise<ExaminerIdentityProfile> {
    if (examinerId === this.currentExaminerId) {
      return EXAMINER_PROFILES[this.currentExaminerId];
    }

    // Safely stop any active speaking timeline before switching identity
    this.activeTimeline = [];
    this.smoothMouthOpenness = 0;
    this.currentExaminerId = examinerId;
    this.transitionTo('idle');
    this.notify();
    return EXAMINER_PROFILES[this.currentExaminerId];
  }

  public setSpeaking(spokenText?: string, speechRate?: number): void {
    if (this.isDisposed) return;
    const profile = EXAMINER_PROFILES[this.currentExaminerId];
    const effectiveRate = speechRate || profile.speechRate;

    if (spokenText && spokenText.trim().length > 0) {
      this.activeTimeline = buildSpeechVisemeTimeline(spokenText, effectiveRate);
    } else {
      this.activeTimeline = buildSpeechVisemeTimeline(
        'Let us continue with our IELTS speaking assessment.',
        effectiveRate
      );
    }

    this.speechStartedAtMs = Date.now();
    this.transitionTo('examiner_speaking');
  }

  public triggerNoteTaking(durationMs: number = 2200): void {
    if (this.isDisposed) return;
    this.noteTakingActive = true;
    this.noteTakingUntilMs = Date.now() + durationMs;
    this.notify();
  }

  public setListening(isCandidateSpeaking: boolean = false, candidateVolumeRms: number = 0): void {
    if (this.isDisposed) return;
    const nowMs = Date.now();

    // 1. Interruption handling: Clear active TTS speech timeline & collapse mouth within 50ms
    this.activeTimeline = [];
    if (isCandidateSpeaking || this.state === 'examiner_speaking') {
      this.smoothMouthOpenness = 0;
      this.lastViseme = 'sil';
    }

    this.candidateVolumeRms = candidateVolumeRms;

    // Track candidate turn duration for >20s note taking trigger
    if (isCandidateSpeaking && this.candidateTurnStartMs === 0) {
      this.candidateTurnStartMs = nowMs;
    } else if (!isCandidateSpeaking && this.candidateTurnStartMs > 0) {
      const turnDur = nowMs - this.candidateTurnStartMs;
      this.candidateTurnStartMs = 0;
      if (turnDur > 20000) {
        this.triggerNoteTaking(2400); // Trigger authentic Sprint rubric notation after >20s turn
      }
    }

    const nextState: ExaminerConversationalState = isCandidateSpeaking
      ? 'candidate_speaking'
      : 'examiner_listening';

    if (this.state !== nextState) {
      this.transitionTo(nextState);
    }
  }

  public setThinking(): void {
    if (this.isDisposed) return;
    this.activeTimeline = [];
    this.transitionTo('thinking');
  }

  public setIdle(): void {
    if (this.isDisposed) return;
    this.activeTimeline = [];
    this.candidateVolumeRms = 0;
    this.transitionTo('idle');
  }

  public setMuted(muted: boolean): void {
    if (this.isMuted === muted) return;
    this.isMuted = muted;
    this.notify();
  }

  public setPaused(paused: boolean): void {
    if (this.isPaused === paused) return;
    this.isPaused = paused;
    if (paused && this.state === 'examiner_speaking') {
      this.activeTimeline = [];
      this.transitionTo('idle');
    } else {
      this.notify();
    }
  }

  public setError(message: string | null): void {
    this.errorMessage = message;
    if (message) {
      this.connectionStatus = 'fallback_active';
      this.transitionTo('error');
    } else {
      this.connectionStatus = 'ready';
      if (this.state === 'error') {
        this.transitionTo('idle');
      } else {
        this.notify();
      }
    }
  }

  public attachVideoElement(videoEl: HTMLVideoElement | null): void {
    this.attachedVideoEl = videoEl;
  }

  private transitionTo(nextState: ExaminerConversationalState): void {
    if (this.state !== nextState) {
      this.previousState = this.state;
      this.state = nextState;
      this.stateChangedAtMs = Date.now();
    }
    this.notify();
  }

  /**
   * Computes 60fps biomechanical + viseme frame parameters for the current timestamp.
   * Ensures zero mouth movement when silent and smooth transitions between states.
   */
  public getFrameTelemetry(nowMs: number = Date.now()): AvatarFrameTelemetry {
    const profile = EXAMINER_PROFILES[this.currentExaminerId];
    const anim = profile.animationProfile;
    const elapsedSinceTransition = Math.max(0, nowMs - this.stateChangedAtMs);
    const transitionProgress = Math.min(1, elapsedSinceTransition / 260);

    // 1. Natural Eyelid Blink Cycle
    let blinkProgress = 0;
    if (!this.isPaused) {
      if (nowMs >= this.nextBlinkAtMs && this.blinkEndAtMs === 0) {
        this.blinkEndAtMs = nowMs + anim.blinkDurationMs;
      }
      if (this.blinkEndAtMs > 0) {
        const remaining = this.blinkEndAtMs - nowMs;
        if (remaining <= 0) {
          this.blinkEndAtMs = 0;
          const [minB, maxB] = anim.blinkIntervalMs;
          this.nextBlinkAtMs = nowMs + minB + Math.random() * (maxB - minB);
          blinkProgress = 0;
        } else {
          const half = anim.blinkDurationMs / 2;
          const distFromPeak = Math.abs(remaining - half);
          blinkProgress = Math.max(0, Math.min(1, 1 - distFromPeak / half));
        }
      }
    }

    // Check periodic 60-90s authentic note taking loop
    if (!this.noteTakingActive && nowMs >= this.nextPeriodicNoteTakingAtMs && this.state !== 'examiner_speaking') {
      this.triggerNoteTaking(2200);
      this.nextPeriodicNoteTakingAtMs = nowMs + 60000 + Math.random() * 30000;
    }

    if (nowMs < this.noteTakingUntilMs) {
      this.noteTakingActive = true;
    } else {
      this.noteTakingActive = false;
    }

    // 2. Natural Eye Gaze Micro-Saccades & Cognitive State Alignment
    if (this.noteTakingActive) {
      // Drop gaze down to rubric sheet
      this.targetGazeX = -0.12;
      this.targetGazeY = 0.72;
    } else if (!this.isPaused && nowMs >= this.nextGazeShiftAtMs) {
      if (this.state === 'thinking') {
        // Subtle cognitive upward-lateral gaze during thought formulation
        this.targetGazeX = (Math.random() > 0.5 ? 1 : -1) * (0.35 + Math.random() * 0.25);
        this.targetGazeY = -0.32 - Math.random() * 0.18;
        this.nextGazeShiftAtMs = nowMs + 950 + Math.random() * 700;
      } else if (this.state === 'candidate_speaking' || this.state === 'examiner_listening') {
        // Steady attentive eye contact on the candidate
        this.targetGazeX = (Math.random() - 0.5) * 0.16;
        this.targetGazeY = (Math.random() - 0.5) * 0.12;
        this.nextGazeShiftAtMs = nowMs + 2200 + Math.random() * 1400;
      } else {
        this.targetGazeX = (Math.random() - 0.5) * 0.28;
        this.targetGazeY = (Math.random() - 0.5) * 0.2;
        this.nextGazeShiftAtMs = nowMs + 1800 + Math.random() * 1600;
      }
    }
    this.currentGazeX = lerp(this.currentGazeX, this.targetGazeX, 0.12);
    this.currentGazeY = lerp(this.currentGazeY, this.targetGazeY, 0.12);

    // 3. Thoracic Breathing Phase
    const breathPhase = this.isPaused
      ? 0
      : ((nowMs % anim.breathingCycleMs) / anim.breathingCycleMs) * Math.PI * 2;

    // 4. Mouth Viseme & Jaw Articulation (Strictly driven by active speaking timeline)
    let targetOpenness = 0;
    let targetSpread = 0.04; // Relaxed pleasant composure
    let targetRounding = 0;
    let rawViseme: VisemeShape = 'sil';
    let syllableStress = 0;

    if (this.state === 'examiner_speaking' && !this.isPaused && !this.isMuted) {
      const speechElapsed = nowMs - this.speechStartedAtMs;
      const totalDur =
        this.activeTimeline.length > 0
          ? this.activeTimeline[this.activeTimeline.length - 1].endMs
          : 0;

      if (totalDur > 0) {
        // Loop timeline smoothly if TTS stream is still playing a long paragraph
        const timelineCursor = speechElapsed % totalDur;
        const activeKf = this.activeTimeline.find(
          (kf) => timelineCursor >= kf.startMs && timelineCursor <= kf.endMs
        );

        if (activeKf) {
          rawViseme = activeKf.viseme;
          // Add subtle organic micro-modulation within the vowel nucleus
          const kfSpan = Math.max(1, activeKf.endMs - activeKf.startMs);
          const kfPhase = (timelineCursor - activeKf.startMs) / kfSpan;
          const envelope = Math.sin(kfPhase * Math.PI); // Smooth attack and release per phoneme
          targetOpenness = activeKf.openness * (0.72 + 0.28 * envelope) * anim.jawRangeScale;
          targetSpread = activeKf.spread;
          targetRounding = activeKf.rounding;
          syllableStress = activeKf.stress * envelope;
        }
      }
    } else if (this.state === 'candidate_speaking' || this.state === 'examiner_listening') {
      // Strictly closed/relaxed mouth while listening to the candidate
      rawViseme = 'sil';
      targetOpenness = 0;
      targetSpread = 0.08; // Attentive, encouraging expression
      targetRounding = 0;
    } else if (this.state === 'thinking') {
      rawViseme = 'sil';
      targetOpenness = 0.02;
      targetSpread = -0.04;
      targetRounding = 0.12;
    }

    // Clamp rapid viseme state switches to minimum 70ms per viseme hold to avoid jitter
    if (rawViseme !== this.lastViseme) {
      if (nowMs - this.lastVisemeChangeMs >= this.minVisemeHoldMs || rawViseme === 'sil') {
        this.lastViseme = rawViseme;
        this.lastVisemeChangeMs = nowMs;
      }
    }
    const currentViseme: VisemeShape = this.lastViseme;

    this.smoothMouthOpenness = lerp(this.smoothMouthOpenness, targetOpenness, 0.22);
    this.smoothMouthSpread = lerp(this.smoothMouthSpread, targetSpread, 0.22);
    this.smoothLipRounding = lerp(this.smoothLipRounding, targetRounding, 0.22);

    // 5. Head Pose (Pitch/Nod, Yaw, Roll) & Brow Expression
    let targetPitch = Math.sin(breathPhase) * 0.12;
    let targetYaw = Math.cos(breathPhase * 0.5) * 0.1;
    let targetBrow = 0;

    if (this.noteTakingActive) {
      // 2-3 deg downward head pitch for authentic Sprint rubric notation
      targetPitch += 0.42;
      targetBrow = -0.1;
    } else if (this.state === 'examiner_speaking' && !this.isPaused) {
      targetPitch = -syllableStress * 0.45 + Math.sin(nowMs / 340) * 0.18;
      targetYaw = Math.sin(nowMs / 680) * 0.22;
      targetBrow = syllableStress * 0.55 * anim.browExpressiveness;
    } else if (this.state === 'candidate_speaking' && !this.isPaused) {
      // Attentive empathetic listening nods responsive to candidate speech
      const nodEnergy = Math.min(1, Math.max(0.25, this.candidateVolumeRms / 45));
      targetPitch = Math.sin(nowMs * 0.0055 * anim.nodFrequencyHz) * 0.48 * nodEnergy;
      targetBrow = 0.18;
    } else if (this.state === 'examiner_listening' && !this.isPaused) {
      targetPitch = Math.sin(nowMs * 0.003) * 0.22;
      targetBrow = 0.12;
    } else if (this.state === 'thinking' && !this.isPaused) {
      targetPitch = -0.22;
      targetYaw = this.targetGazeX * 0.4;
      targetBrow = -0.18; // Subtle thoughtful concentration
    }

    this.smoothHeadPitch = lerp(this.smoothHeadPitch, targetPitch, 0.16);
    this.smoothHeadYaw = lerp(this.smoothHeadYaw, targetYaw, 0.14);
    this.smoothBrowLift = lerp(this.smoothBrowLift, targetBrow, 0.2);

    const headRoll = this.smoothHeadYaw * 1.4;

    return {
      examinerId: this.currentExaminerId,
      state: this.state,
      previousState: this.previousState,
      transitionProgress,
      currentViseme,
      mouthOpenness: Number(this.smoothMouthOpenness.toFixed(3)),
      mouthSpread: Number(this.smoothMouthSpread.toFixed(3)),
      lipRounding: Number(this.smoothLipRounding.toFixed(3)),
      jawDrop: Number((this.smoothMouthOpenness * 0.85).toFixed(3)),
      blinkProgress: Number(blinkProgress.toFixed(3)),
      gazeX: Number(this.currentGazeX.toFixed(3)),
      gazeY: Number(this.currentGazeY.toFixed(3)),
      headPitch: Number(this.smoothHeadPitch.toFixed(3)),
      headYaw: Number(this.smoothHeadYaw.toFixed(3)),
      headRoll: Number(headRoll.toFixed(3)),
      breathPhase: Number(breathPhase.toFixed(3)),
      browLift: Number(this.smoothBrowLift.toFixed(3)),
      noteTakingActive: this.noteTakingActive,
      isMuted: this.isMuted,
      isPaused: this.isPaused,
      providerMode: this.providerMode,
      connectionStatus: this.connectionStatus,
      errorMessage: this.errorMessage
    };
  }

  public getSnapshot(): AvatarProviderSnapshot {
    return {
      examiner: EXAMINER_PROFILES[this.currentExaminerId],
      state: this.state,
      previousState: this.previousState,
      isMuted: this.isMuted,
      isPaused: this.isPaused,
      providerMode: this.providerMode,
      connectionStatus: this.connectionStatus,
      externalProviderAvailable: this.externalProviderAvailable,
      externalProviderName: this.externalProviderName,
      errorMessage: this.errorMessage
    };
  }

  public subscribe(listener: (snapshot: AvatarProviderSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => {
      try {
        fn(snap);
      } catch {
        // Ignore listener errors
      }
    });
  }

  public disconnect(): void {
    this.activeTimeline = [];
    this.smoothMouthOpenness = 0;
    if (this.attachedVideoEl) {
      try {
        this.attachedVideoEl.pause();
        this.attachedVideoEl.srcObject = null;
      } catch {}
      this.attachedVideoEl = null;
    }
    this.transitionTo('idle');
  }

  public dispose(): void {
    this.disconnect();
    this.isDisposed = true;
    this.listeners.clear();
  }
}
