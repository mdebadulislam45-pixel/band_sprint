/**
 * IELTS SPRINT — SPEECH RECOGNITION (STT) & WEB AUDIO ACOUSTIC TELEMETRY SERVICE
 * Robust browser speech recognition with graceful silence handling,
 * auto-restart resilience, error recovery, transcript collation, and
 * real-time Web Audio API (AnalyserNode) pitch & volume envelope telemetry.
 */

import { AcousticTelemetry } from '../types/speakingTypes';

export interface SpeechRecognitionCallbacks {
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onSilenceTimeout?: () => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: 'listening' | 'paused' | 'stopped' | 'error') => void;
  onAcousticMetrics?: (metrics: AcousticTelemetry) => void;
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

  // Web Audio API Acoustic Telemetry State
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyserNode: AnalyserNode | null = null;
  private acousticInterval: number | null = null;
  private pitchSamples: number[] = [];
  private volumeSamples: number[] = [];
  private energyDropOffCount: number = 0;
  private wasSpeakingLoudly: boolean = false;
  private lastAcousticTelemetry: AcousticTelemetry = {
    volumeRms: 0,
    pitchHz: 0,
    pitchVarianceHz: 0,
    expressivenessScore: 68,
    energyDropOffs: 0
  };

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

  /**
   * Starts non-blocking Web Audio API microphone analysis for real-time RMS volume
   * and fundamental pitch variance (intonation expressiveness vs. monotone detection).
   */
  private async startAcousticTelemetry(): Promise<void> {
    this.stopAcousticTelemetry();
    this.pitchSamples = [];
    this.volumeSamples = [];
    this.energyDropOffCount = 0;
    this.wasSpeakingLoudly = false;

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      if (this.isManuallyStopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      this.mediaStream = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioCtx();
      this.audioContext = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      this.analyserNode = analyser;

      const timeData = new Float32Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount);

      this.acousticInterval = window.setInterval(() => {
        if (!this.analyserNode || !this.audioContext) return;

        this.analyserNode.getFloatTimeDomainData(timeData);
        this.analyserNode.getByteFrequencyData(freqData);

        // 1. Calculate RMS Volume (0 - 100 normalized)
        let sumSquares = 0;
        for (let i = 0; i < timeData.length; i++) {
          sumSquares += timeData[i] * timeData[i];
        }
        const rms = Math.sqrt(sumSquares / timeData.length);
        const volumeRms = Math.min(100, Math.round(rms * 360));

        // Track sudden energy drop-offs mid-utterance
        if (volumeRms >= 28) {
          this.wasSpeakingLoudly = true;
          this.volumeSamples.push(volumeRms);
        } else if (this.wasSpeakingLoudly && volumeRms < 8) {
          this.energyDropOffCount += 1;
          this.wasSpeakingLoudly = false;
        }

        // 2. Estimate Fundamental Vocal Frequency (85 Hz - 340 Hz human speech band)
        let dominantPitchHz = 0;
        if (volumeRms >= 12) {
          const nyquist = this.audioContext.sampleRate / 2;
          const binHz = nyquist / freqData.length;
          const minBin = Math.max(1, Math.floor(85 / binHz));
          const maxBin = Math.min(freqData.length - 1, Math.ceil(340 / binHz));

          let maxAmp = 0;
          let maxBinIdx = minBin;
          for (let b = minBin; b <= maxBin; b++) {
            if (freqData[b] > maxAmp) {
              maxAmp = freqData[b];
              maxBinIdx = b;
            }
          }

          if (maxAmp > 45) {
            dominantPitchHz = Math.round(maxBinIdx * binHz);
            this.pitchSamples.push(dominantPitchHz);
            if (this.pitchSamples.length > 150) {
              this.pitchSamples.shift();
            }
          }
        }

        // 3. Calculate Pitch Variance (Standard Deviation of active speech frames)
        let pitchVarianceHz = 0;
        if (this.pitchSamples.length >= 4) {
          const mean =
            this.pitchSamples.reduce((acc, v) => acc + v, 0) / this.pitchSamples.length;
          const variance =
            this.pitchSamples.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) /
            this.pitchSamples.length;
          pitchVarianceHz = Math.round(Math.sqrt(variance));
        }

        // Optimal Sprint intonation variance is ~22-55 Hz std dev
        const expressivenessScore =
          this.pitchSamples.length < 3
            ? 68
            : Math.min(
                98,
                Math.max(42, Math.round(50 + Math.min(48, pitchVarianceHz * 1.15)))
              );

        this.lastAcousticTelemetry = {
          volumeRms,
          pitchHz: dominantPitchHz,
          pitchVarianceHz,
          expressivenessScore,
          energyDropOffs: this.energyDropOffCount
        };

        this.callbacks.onAcousticMetrics?.(this.lastAcousticTelemetry);
      }, 120);
    } catch {
      // Gracefully continue with SpeechRecognition if raw audio stream is blocked
    }
  }

  private stopAcousticTelemetry(): void {
    if (this.acousticInterval !== null) {
      clearInterval(this.acousticInterval);
      this.acousticInterval = null;
    }
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.mediaStream = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
    this.analyserNode = null;
  }

  public getLastAcousticTelemetry(): AcousticTelemetry {
    return { ...this.lastAcousticTelemetry };
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
      recognition.lang = 'en-GB'; // Standard Sprint English recognition
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
      void this.startAcousticTelemetry();
      return true;
    } catch (err: any) {
      this.callbacks.onError?.(err?.message || 'Failed to start microphone speech engine.');
      return false;
    }
  }

  public stopListening(preserveTranscript: boolean = false): string {
    this.isManuallyStopped = true;
    this.stopAcousticTelemetry();
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

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }
}

export const speechRecognitionService = new SpeechRecognitionService();

