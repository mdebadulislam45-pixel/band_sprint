/**
 * BandSprint — Ultra-Realistic AI Speaking Examiner Avatar Types
 *
 * Defines the explicit state machine, phoneme-viseme animation telemetry,
 * examiner identity profiles, and provider adapter contracts.
 */

export type ExaminerId = 'arthur' | 'clara';

export type ExaminerGender = 'male' | 'female';

/**
 * The 7 mandatory conversational animation states for the IELTS Examiner:
 * 1. 'idle'               - Natural blinking, subtle breathing, relaxed posture, calm direct gaze
 * 2. 'examiner_speaking'  - Mouth visemes synchronized with spoken audio/phonemes, brow/head gestures
 * 3. 'examiner_listening' - Closed/relaxed mouth, attentive gaze, restrained natural posture
 * 4. 'candidate_speaking' - Examiner actively listens with subtle empathetic nods (never speaks simultaneously)
 * 5. 'thinking'           - Subtle contemplative gaze shift and natural pause while preparing next turn
 * 6. 'transition'         - Smooth damped interpolation between conversational states
 * 7. 'loading' | 'error'  - Honest status indicator and stable fallback presentation
 */
export type ExaminerConversationalState =
  | 'idle'
  | 'examiner_speaking'
  | 'examiner_listening'
  | 'candidate_speaking'
  | 'thinking'
  | 'transition'
  | 'loading'
  | 'error';

/**
 * Standard MPEG-4 / ARKit inspired viseme categories for English speech synchronization
 */
export type VisemeShape =
  | 'sil' // Silence / neutral closed lips
  | 'mbp' // Bilabial closure (m, b, p)
  | 'fv'  // Labiodental (f, v)
  | 'dd'  // Alveolar / dental (t, d, s, z, n, l, th)
  | 'ee'  // Spread front vowel (ee, i, e, y)
  | 'aa'  // Open vowel (a, ah, ar, i_long)
  | 'oh'  // Rounded mid/back vowel (o, aw, or, ow)
  | 'oo'; // Tight rounded vowel/glide (oo, u, w, r, sh, ch)

export interface VisemeKeyframe {
  startMs: number;
  endMs: number;
  viseme: VisemeShape;
  openness: number;   // 0.0 to 1.0 vertical jaw/lip opening
  spread: number;     // -0.4 (pursed) to +0.5 (wide smile/spread)
  rounding: number;   // 0.0 to 1.0 lip rounding
  stress: number;     // 0.0 to 1.0 syllable emphasis for head/brow micro-gesture
}

export type AvatarProviderMode =
  | 'canvas2d_neural_portrait'
  | 'external_webrtc_stream';

export type AvatarConnectionStatus =
  | 'initializing'
  | 'ready'
  | 'streaming'
  | 'fallback_active'
  | ' unavailable'
  | 'error';

export interface ExaminerIdentityProfile {
  id: ExaminerId;
  name: string;
  shortLabel: string;
  gender: ExaminerGender;
  title: string;
  credentials: string;
  accent: string;
  speakerId: 'speaker_04' | 'speaker_05';
  speechRate: number;
  speechPitch: number;
  animationProfile: {
    blinkIntervalMs: [number, number];
    blinkDurationMs: number;
    breathingCycleMs: number;
    breathingAmplitudePx: number;
    nodFrequencyHz: number;
    browExpressiveness: number;
    jawRangeScale: number;
  };
}

export interface AvatarFrameTelemetry {
  examinerId: ExaminerId;
  state: ExaminerConversationalState;
  previousState: ExaminerConversationalState;
  transitionProgress: number; // 0.0 to 1.0
  currentViseme: VisemeShape;
  mouthOpenness: number;      // 0.0 to 1.0
  mouthSpread: number;        // -0.5 to +0.5
  lipRounding: number;        // 0.0 to 1.0
  jawDrop: number;            // 0.0 to 1.0
  blinkProgress: number;      // 0.0 (open) to 1.0 (closed)
  gazeX: number;              // -1.0 to +1.0
  gazeY: number;              // -1.0 to +1.0
  headPitch: number;          // Vertical nod offset (-1.0 to +1.0)
  headYaw: number;            // Horizontal turn offset (-1.0 to +1.0)
  headRoll: number;           // Subtle tilt in degrees
  breathPhase: number;        // 0 to 2*PI
  browLift: number;           // -0.5 (furrow) to +1.0 (raised)
  noteTakingActive?: boolean; // Authentic Sprint rubric notation posture & HUD indicator
  isMuted: boolean;
  isPaused: boolean;
  providerMode: AvatarProviderMode;
  connectionStatus: AvatarConnectionStatus;
  errorMessage: string | null;
}

export interface AvatarProviderSnapshot {
  examiner: ExaminerIdentityProfile;
  state: ExaminerConversationalState;
  previousState: ExaminerConversationalState;
  isMuted: boolean;
  isPaused: boolean;
  providerMode: AvatarProviderMode;
  connectionStatus: AvatarConnectionStatus;
  externalProviderAvailable: boolean;
  externalProviderName: string | null;
  errorMessage: string | null;
}

export interface IExaminerAvatarProvider {
  initialize(initialExaminer?: ExaminerId): Promise<void>;
  connect(): Promise<AvatarConnectionStatus>;
  switchExaminer(examinerId: ExaminerId): Promise<ExaminerIdentityProfile>;
  setSpeaking(spokenText?: string, speechRate?: number): void;
  setListening(isCandidateSpeaking?: boolean, candidateVolumeRms?: number): void;
  setThinking(): void;
  setIdle(): void;
  setMuted(muted: boolean): void;
  setPaused(paused: boolean): void;
  setError(message: string | null): void;
  attachVideoElement(videoEl: HTMLVideoElement | null): void;
  getFrameTelemetry(nowMs?: number): AvatarFrameTelemetry;
  getSnapshot(): AvatarProviderSnapshot;
  subscribe(listener: (snapshot: AvatarProviderSnapshot) => void): () => void;
  disconnect(): void;
  dispose(): void;
}
