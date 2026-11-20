/**
 * IELTS SPRINT — UNIFIED AUDIO ENGINE (`IELTSAudioEngine`)
 *
 * Architecture & Lifecycle Guarantees:
 * 1. Wraps existing `audioService` and `audioManager` without duplicating TTS provider logic
 *    or creating circular dependencies or secondary caches.
 * 2. Explicit session ownership with monotonic token protection (`operationToken`).
 *    Stale callbacks or delayed watchdogs cannot modify state for a newer operation.
 * 3. Structured lifecycle states: `idle` | `unlocking` | `loading` | `playing` | `completed` | `cancelled` | `error`.
 * 4. Configurable watchdogs based on operation type (e.g. `sound_check` vs `utterance` vs `section`).
 * 5. Non-destructive preemption: stopping audio never terminates candidate microphone recording (`MediaRecorder`)
 *    or speech recognition (`SpeechRecognition`).
 */

import { audioService } from './audioService';
import { speakBritish } from '../utils/britishVoice';

export type AudioEngineState =
  | 'idle'
  | 'unlocking'
  | 'loading'
  | 'playing'
  | 'completed'
  | 'cancelled'
  | 'error';

export type AudioOperationType = 'sound_check' | 'utterance' | 'dialogue' | 'section';

export interface WatchdogConfig {
  startupTimeoutMs: number; // Time waiting for playback start (0 = disabled)
  completionTimeoutMs: number; // Time waiting for playback completion after start (0 = disabled)
}

export interface PlayAudioOptions {
  type: AudioOperationType;
  text?: string;
  speakerId?: string;
  speed?: number;
  deliveryProfile?: string;
  customStreamUrl?: string;
  watchdogConfig?: Partial<WatchdogConfig>;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export interface AudioEngineStatus {
  state: AudioEngineState;
  activeOperationId: string | null;
  activeType: AudioOperationType | null;
  errorMessage: string | null;
  isPlaying: boolean;
}

const DEFAULT_WATCHDOG_CONFIGS: Record<AudioOperationType, WatchdogConfig> = {
  sound_check: {
    startupTimeoutMs: 10000,
    completionTimeoutMs: 15000
  },
  utterance: {
    startupTimeoutMs: 12000,
    completionTimeoutMs: 30000
  },
  dialogue: {
    startupTimeoutMs: 15000,
    completionTimeoutMs: 0 // Disabled for long dialogues
  },
  section: {
    startupTimeoutMs: 20000,
    completionTimeoutMs: 0 // Disabled for full Listening sections (up to 30 mins)
  }
};

export class IELTSAudioEngineService {
  private state: AudioEngineState = 'idle';
  private activeOperationId: string | null = null;
  private activeType: AudioOperationType | null = null;
  private errorMessage: string | null = null;
  private operationToken: number = 0;

  private startupTimer: NodeJS.Timeout | null = null;
  private completionTimer: NodeJS.Timeout | null = null;

  private listeners: Set<(status: AudioEngineStatus) => void> = new Set();

  constructor() {
    // Synchronize with low-level audioService state changes
    audioService.subscribe((serviceState) => {
      if (!serviceState.isPlaying && !serviceState.isLoading && this.state === 'playing') {
        // Handled via explicit onEnd / onError callbacks
      }
    });
  }

  public subscribe(listener: (status: AudioEngineStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  public getStatus(): AudioEngineStatus {
    return {
      state: this.state,
      activeOperationId: this.activeOperationId,
      activeType: this.activeType,
      errorMessage: this.errorMessage,
      isPlaying: this.state === 'playing' || this.state === 'loading' || this.state === 'unlocking'
    };
  }

  private setState(newState: AudioEngineState, errorMsg: string | null = null): void {
    this.state = newState;
    this.errorMessage = errorMsg;
    const status = this.getStatus();
    this.listeners.forEach((fn) => fn(status));
  }

  private clearTimers(): void {
    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }
    if (this.completionTimer) {
      clearTimeout(this.completionTimer);
      this.completionTimer = null;
    }
  }

  /**
   * Synchronously unlocks browser Web Audio context and HTML5 Audio element within user-gesture context
   */
  public unlockAudio(): void {
    try {
      audioService.unlockAudio();
    } catch {
      // Ignored if non-interactive environment
    }
  }

  /**
   * Stops any currently active IELTSAudioEngine playback operation cleanly.
   * Does NOT touch candidate microphone recording (MediaRecorder) or SpeechRecognition.
   */
  public stopCurrentOperation(reason = 'preempted'): void {
    this.clearTimers();
    this.operationToken += 1;
    if (this.state !== 'idle' && this.state !== 'completed' && this.state !== 'cancelled') {
      audioService.stop();
      this.setState('cancelled');
    }
    this.activeOperationId = null;
    this.activeType = null;
  }

  /**
   * Executes a managed Sound Check operation with full lifecycle watchdogs,
   * token protection, and user feedback callbacks.
   */
  public async playSoundCheck(options?: {
    speakerId?: string;
    sampleText?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: Error) => void;
  }): Promise<void> {
    const text =
      options?.sampleText ||
      'This is a sound check for the IELTS Listening test. Please adjust your headphones for clear audio.';
    const speakerId = options?.speakerId || 'speaker_04';

    return this.playAudio({
      type: 'sound_check',
      text,
      speakerId,
      watchdogConfig: DEFAULT_WATCHDOG_CONFIGS.sound_check,
      onStart: options?.onStart,
      onEnd: options?.onEnd,
      onError: options?.onError
    });
  }

  /**
   * Universal audio playback dispatcher for IELTSAudioEngine
   */
  public async playAudio(options: PlayAudioOptions): Promise<void> {
    // 1. Stop prior active operation
    this.stopCurrentOperation('new_request');

    // 2. Increment token & assign unique operation ID
    this.operationToken += 1;
    const currentToken = this.operationToken;
    const opId = `op_${options.type}_${currentToken}_${Date.now()}`;
    this.activeOperationId = opId;
    this.activeType = options.type;

    const defaultConfig = DEFAULT_WATCHDOG_CONFIGS[options.type] || DEFAULT_WATCHDOG_CONFIGS.utterance;
    const watchdog: WatchdogConfig = {
      startupTimeoutMs: options.watchdogConfig?.startupTimeoutMs ?? defaultConfig.startupTimeoutMs,
      completionTimeoutMs: options.watchdogConfig?.completionTimeoutMs ?? defaultConfig.completionTimeoutMs
    };

    // Helper to check if token remains valid
    const isValid = () => this.operationToken === currentToken && this.activeOperationId === opId;

    // 3. Perform synchronous audio unlock in user gesture
    this.setState('unlocking');
    this.unlockAudio();

    if (!isValid()) return;
    this.setState('loading');

    // 4. Setup startup watchdog timer
    if (watchdog.startupTimeoutMs > 0) {
      this.startupTimer = setTimeout(() => {
        if (!isValid()) return;
        this.clearTimers();
        audioService.stop();
        const err = new Error(`Audio playback failed to start within ${watchdog.startupTimeoutMs / 1000}s`);
        this.setState('error', err.message);
        if (options.onError) options.onError(err);
      }, watchdog.startupTimeoutMs);
    }

    const onStartCallback = () => {
      if (!isValid()) return;
      if (this.startupTimer) {
        clearTimeout(this.startupTimer);
        this.startupTimer = null;
      }
      this.setState('playing');

      // Setup completion watchdog after playback actually begins
      if (watchdog.completionTimeoutMs > 0) {
        this.completionTimer = setTimeout(() => {
          if (!isValid()) return;
          this.clearTimers();
          audioService.stop();
          const err = new Error(`Audio playback exceeded max completion window (${watchdog.completionTimeoutMs / 1000}s)`);
          this.setState('error', err.message);
          if (options.onError) options.onError(err);
        }, watchdog.completionTimeoutMs);
      }

      if (options.onStart) options.onStart();
    };

    const onEndCallback = () => {
      if (!isValid()) return;
      this.clearTimers();
      this.setState('completed');
      this.activeOperationId = null;
      this.activeType = null;
      if (options.onEnd) options.onEnd();
    };

    const onErrorCallback = (errReason: any) => {
      if (!isValid()) return;
      this.clearTimers();
      const errorObj = errReason instanceof Error ? errReason : new Error(String(errReason || 'Playback error'));
      this.setState('error', errorObj.message);
      this.activeOperationId = null;
      this.activeType = null;
      if (options.onError) options.onError(errorObj);
    };

    try {
      if (options.text) {
        speakBritish(options.text, {
          speakerId: options.speakerId || 'speaker_04',
          rate: options.speed || 1.0,
          deliveryProfile: options.deliveryProfile as any,
          onStart: onStartCallback,
          onEnd: onEndCallback,
          onError: onErrorCallback
        });
      } else {
        throw new Error('Text parameter is required for audio playback');
      }
    } catch (err: any) {
      if (isValid()) {
        onErrorCallback(err);
      }
    }
  }
}

export const ieltsAudioEngine = new IELTSAudioEngineService();
