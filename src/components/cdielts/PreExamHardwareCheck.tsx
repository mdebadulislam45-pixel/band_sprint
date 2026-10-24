import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  Maximize2,
  ShieldAlert,
  ArrowRight,
  X,
  HelpCircle,
  Headphones
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

interface PreExamHardwareCheckProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToExam: () => void;
  testTitle?: string;
  moduleType?: 'reading' | 'listening' | 'full_mock' | 'speaking';
}

export const PreExamHardwareCheck: React.FC<PreExamHardwareCheckProps> = ({
  isOpen,
  onClose,
  onProceedToExam,
  testTitle = 'IELTS Academic Computer-Delivered Simulation',
  moduleType = 'listening'
}) => {
  // Step checks
  const [hasTestedAudio, setHasTestedAudio] = useState(false);
  const [hasTestedMic, setHasTestedMic] = useState(false);
  const [confirmedRules, setConfirmedRules] = useState(false);

  // Audio test state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioVolume, setAudioVolume] = useState<number>(0.8);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Mic test state
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [micAudioUrl, setMicAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [micCountdown, setMicCountdown] = useState(5);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!isOpen) {
      // Cleanup
      if (micAudioUrl) {
        URL.revokeObjectURL(micAudioUrl);
        setMicAudioUrl(null);
      }
      setIsPlayingAudio(false);
      setIsRecordingMic(false);
    }
  }, [isOpen, micAudioUrl]);

  if (!isOpen) return null;

  // Synthesize an official Cambridge test audio tone or prompt
  const handlePlaySoundSample = () => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    soundManager.playBeep(440, 0.2);

    // Use Web Speech or synthetic chime sequence for authentic British test tone
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        'This is a sound check for the Computer-Delivered IELTS test. You should adjust the volume so that you can hear clearly.'
      );
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = audioVolume;

      // Try British English voice
      const voices = window.speechSynthesis.getVoices();
      const ukVoice = voices.find((v) => v.lang === 'en-GB' || v.name.includes('British') || v.name.includes('UK'));
      if (ukVoice) utterance.voice = ukVoice;

      utterance.onend = () => {
        setIsPlayingAudio(false);
        setHasTestedAudio(true);
      };
      utterance.onerror = () => {
        setIsPlayingAudio(false);
        setHasTestedAudio(true);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        setIsPlayingAudio(false);
        setHasTestedAudio(true);
      }, 1500);
    }
  };

  // Test microphone by recording 4 seconds and playing back
  const handleStartMicTest = async () => {
    setMicError(null);
    setMicAudioUrl(null);
    recordedChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setMicAudioUrl(url);
        setHasTestedMic(true);
        stream.getTracks().forEach((t) => t.stop());
        soundManager.playSuccess();
      };

      recorder.start();
      setIsRecordingMic(true);
      setMicCountdown(4);

      let remaining = 4;
      const interval = setInterval(() => {
        remaining -= 1;
        setMicCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
          if (recorder.state === 'recording') {
            recorder.stop();
          }
          setIsRecordingMic(false);
        }
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone permission check warning:', err);
      setMicError('Microphone permission was denied or unavailable. You can still proceed if your test does not include Speaking.');
      // Auto-allow if not in speaking
      if (moduleType !== 'speaking') {
        setHasTestedMic(true);
      }
    }
  };

  const handleEnterFullscreenAndStart = () => {
    soundManager.playSuccess();
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {}
    onProceedToExam();
    onClose();
  };

  const canProceed = hasTestedAudio && (hasTestedMic || moduleType === 'reading' || moduleType === 'listening') && confirmedRules;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-fade-in text-slate-900 dark:text-slate-100">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Pre-Exam Device & Environment Check</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official British Council & IDP Test Center Pre-flight
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* 1. Headphones Sound Check */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider">1. Sound & Headphone Test</span>
              </div>
              {hasTestedAudio && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Passed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Put on your headphones. Click below to verify you can hear the official test audio clearly.
            </p>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handlePlaySoundSample}
                disabled={isPlayingAudio}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isPlayingAudio ? 'Playing Sample...' : 'Play Audio Sample'}</span>
              </button>

              <div className="flex-1 flex items-center gap-2">
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioVolume}
                  onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasTestedAudio}
                onChange={(e) => setHasTestedAudio(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                I can hear the audio sample clearly and without distortion.
              </span>
            </label>
          </div>

          {/* 2. Microphone Check (If Speaking or Full Mock) */}
          {(moduleType === 'speaking' || moduleType === 'full_mock') && (
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold uppercase tracking-wider">2. Microphone Recording Test</span>
                </div>
                {hasTestedMic && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Passed
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Say: <span className="italic font-medium">"My name is candidate and I am ready for the test."</span>
              </p>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleStartMicTest}
                  disabled={isRecordingMic}
                  className={`px-4 py-2 rounded-xl text-white font-semibold text-xs transition flex items-center gap-1.5 ${
                    isRecordingMic ? 'bg-rose-600 animate-pulse' : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isRecordingMic ? `Recording (${micCountdown}s)...` : 'Record Mic Test (4s)'}</span>
                </button>

                {micAudioUrl && (
                  <audio src={micAudioUrl} controls className="h-8 max-w-[200px]" />
                )}
              </div>

              {micError && (
                <div className="text-xs text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{micError}</span>
                </div>
              )}
            </div>
          )}

          {/* 3. Examination Environment Rules */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <ShieldAlert className="w-4 h-4 text-blue-600" />
              <span>Official British Council Exam Rules</span>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4">
              <li>Do not leave or switch browser tabs. Exam integrity monitor is active.</li>
              <li>In Computer-Delivered IELTS, no additional transfer time is provided at the end of Reading.</li>
              <li>A 10-minute and 5-minute warning indicator will alert you before the clock expires.</li>
            </ul>

            <label className="flex items-start gap-2 pt-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmedRules}
                onChange={(e) => setConfirmedRules(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium text-slate-800 dark:text-slate-200">
                I understand the rules and confirm that I am in a quiet test environment.
              </span>
            </label>
          </div>

          {/* CTA Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!canProceed}
              onClick={handleEnterFullscreenAndStart}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-2 disabled:opacity-40"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Enter 1:1 CD-IELTS Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
