/**
 * IELTS SPRINT — SPEECH RECOGNITION (STT) SERVICE
 * Robust browser speech recognition with graceful silence handling,
 * auto-restart resilience, error recovery, and transcript collation.
 */

export interface SpeechRecognitionCallbacks {
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onSilenceTimeout?: () => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: 'listening' | 'paused' | 'stopped' | 'error') => void;
}

export class SpeechRecognitionService {
  private recognition: any = null;
  private isListening: boolean = false;
  private isManuallyStopped: boolean = false;
  private currentTranscript: string = '';
  private interimTranscript: string = '';
  private callbacks: SpeechRecognitionCallbacks = {};
  private silenceTimer: NodeJS.Timeout | null = null;
  private silenceThresholdMs: number = 3200; // 3.2s natural thinking pause allowed
  private speechStartTime: number = 0;
  private isSupported: boolean = false;

  constructor() {
    this.checkSupport();
  }

  public checkSupport(): boolean {
    if (typeof window === 'undefined') return false;
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;
    this.isSupported = !!SpeechRecognition;
    return this.isSupported;
  }

  public setSilenceThreshold(ms: number): void {
    this.silenceThresholdMs = ms;
  }

  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.isListening && !this.isManuallyStopped && this.currentTranscript.trim().length > 0) {
      this.silenceTimer = setTimeout(() => {
        if (this.isListening && !this.isManuallyStopped) {
          this.callbacks.onSilenceTimeout?.();
        }
      }, this.silenceThresholdMs);
    }
  }

  public startListening(callbacks: SpeechRecognitionCallbacks): boolean {
    if (!this.checkSupport()) {
      callbacks.onError?.('Speech recognition is not supported in this browser. You can type answers in Practice Mode.');
      return false;
    }

    this.stopListening(true);
    this.callbacks = callbacks;
    this.isManuallyStopped = false;
    this.currentTranscript = '';
    this.interimTranscript = '';
    this.speechStartTime = Date.now();

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-GB'; // Standard Cambridge English recognition
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        this.isListening = true;
        this.callbacks.onStatusChange?.('listening');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalSegment = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalSegment += item[0].transcript + ' ';
          } else {
            interim += item[0].transcript;
          }
        }

        if (finalSegment) {
          this.currentTranscript += finalSegment;
          this.callbacks.onFinalResult?.(this.currentTranscript.trim());
        }

        this.interimTranscript = interim;
        this.callbacks.onInterimResult?.((this.currentTranscript + ' ' + interim).trim());

        // Refresh candidate silence detector
        this.resetSilenceTimer();
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // Normal pause in speech - do not abort
          return;
        }
        if (event.error === 'aborted' && this.isManuallyStopped) {
          return;
        }

        if (event.error === 'not-allowed') {
          this.callbacks.onError?.('Microphone access was denied. Please allow microphone permissions in your browser.');
        } else {
          this.callbacks.onError?.(`Microphone notice: ${event.error}`);
        }
        this.callbacks.onStatusChange?.('error');
      };

      recognition.onend = () => {
        this.isListening = false;
        // If not manually stopped, auto-restart to prevent browser timeout disconnects
        if (!this.isManuallyStopped) {
          try {
            recognition.start();
            this.isListening = true;
            this.callbacks.onStatusChange?.('listening');
          } catch {
            this.callbacks.onStatusChange?.('stopped');
          }
        } else {
          this.callbacks.onStatusChange?.('stopped');
        }
      };

      this.recognition = recognition;
      recognition.start();
      return true;
    } catch (err: any) {
      this.callbacks.onError?.(err?.message || 'Failed to start microphone speech engine.');
      return false;
    }
  }

  public stopListening(preserveTranscript: boolean = false): string {
    this.isManuallyStopped = true;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }

    this.isListening = false;
    this.callbacks.onStatusChange?.('stopped');

    const result = (this.currentTranscript + ' ' + this.interimTranscript).trim();
    if (!preserveTranscript) {
      this.currentTranscript = '';
      this.interimTranscript = '';
    }
    return result;
  }

  public getTranscript(): string {
    return (this.currentTranscript + ' ' + this.interimTranscript).trim();
  }

  public getElapsedTimeSec(): number {
    if (!this.speechStartTime) return 0;
    return Math.max(0, Math.floor((Date.now() - this.speechStartTime) / 1000));
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
