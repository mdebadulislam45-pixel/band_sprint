import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Headphones,
  Sliders,
  Activity,
  Radio,
  RotateCcw
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { speakBritish, stopSpeech, audioService } from '../../utils/britishVoice';
import { ieltsAudioEngine } from '../../services/IELTSAudioEngine';
import { getPreferredVoiceGender } from '../../config/voiceConfig';
import {
  CDIELTSColorScheme,
  CDIELTSZoomLevel,
  getCDIELTSThemeClasses,
  getCDIELTSFontSizeClass
} from './CDIELTSThemeContainer';

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
  moduleType = 'speaking'
}) => {
  // Theme & Contrast State matching official CD-IELTS UI
  const [colorScheme, setColorScheme] = useState<CDIELTSColorScheme>('standard');
  const [zoomLevel, setZoomLevel] = useState<CDIELTSZoomLevel>('100%');

  // Step check flags
  const [hasTestedAudio, setHasTestedAudio] = useState(false);
  const [hasTestedStereo, setHasTestedStereo] = useState(false);
  const [hasTestedMic, setHasTestedMic] = useState(false);
  const [isSensitivityVerified, setIsSensitivityVerified] = useState(false);
  const [confirmedRules, setConfirmedRules] = useState(false);

  // Audio test state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioVolume, setAudioVolume] = useState<number>(0.85);
  const [testingChannel, setTestingChannel] = useState<'left' | 'right' | null>(null);

  // Live Microphone Decibel Meter & Sensitivity state
  const [isLiveMicMonitoring, setIsLiveMicMonitoring] = useState(false);
  const [currentDecibels, setCurrentDecibels] = useState<number>(-60);
  const [peakDecibels, setPeakDecibels] = useState<number>(-60);
  const [optimalSpeakingStreakSec, setOptimalSpeakingStreakSec] = useState<number>(0);
  const [micGainMultiplier, setMicGainMultiplier] = useState<number>(1.2);
  const [micStatusLabel, setMicStatusLabel] = useState<string>('Mic Idle (Click Start Check)');

  // 4-Second Recorded Test Playback state
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [micAudioUrl, setMicAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [micCountdown, setMicCountdown] = useState(4);

  // Web Audio API refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Sound check tokenized watchdogs
  const soundCheckTokenRef = useRef<number>(0);
  const soundCheckStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundCheckCompletionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSoundCheckTimers = useCallback(() => {
    if (soundCheckStartTimerRef.current) {
      clearTimeout(soundCheckStartTimerRef.current);
      soundCheckStartTimerRef.current = null;
    }
    if (soundCheckCompletionTimerRef.current) {
      clearTimeout(soundCheckCompletionTimerRef.current);
      soundCheckCompletionTimerRef.current = null;
    }
  }, []);

  // Cleanup on modal close or unmount
  const stopLiveMicMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsLiveMicMonitoring(false);
    setCurrentDecibels(-60);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (micAudioUrl) {
        URL.revokeObjectURL(micAudioUrl);
        setMicAudioUrl(null);
      }
      clearSoundCheckTimers();
      stopSpeech();
      audioService.stop();
      setIsPlayingAudio(false);
      setIsRecordingMic(false);
      stopLiveMicMonitoring();
    }
    return () => {
      clearSoundCheckTimers();
    };
  }, [isOpen, micAudioUrl, stopLiveMicMonitoring, clearSoundCheckTimers]);

  // Handle dynamic mic gain adjustment
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = micGainMultiplier;
    }
  }, [micGainMultiplier]);

  // Start real-time Web Audio API decibel metering
  const handleStartLiveSoundCheck = async () => {
    setMicError(null);
    stopLiveMicMonitoring();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const gainNode = ctx.createGain();
      gainNode.gain.value = micGainMultiplier;
      gainNodeRef.current = gainNode;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      analyserRef.current = analyser;

      source.connect(gainNode);
      gainNode.connect(analyser);

      setIsLiveMicMonitoring(true);
      setMicStatusLabel('Listening... Speak into your microphone');

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      let streakCount = 0;
      let lastPeak = -60;

      const processAudio = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(dataArray);

        // Compute Root Mean Square (RMS)
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const norm = (dataArray[i] - 128) / 128;
          sumSquares += norm * norm;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);

        // Convert RMS to dBFS (-60 dB to 0 dB)
        let dB = -60;
        if (rms > 0.0001) {
          dB = Math.max(-60, Math.min(0, 20 * Math.log10(rms)));
        }

        setCurrentDecibels(Math.round(dB));

        if (dB > lastPeak) {
          lastPeak = Math.round(dB);
          setPeakDecibels(lastPeak);
        }

        // Evaluate sensitivity range for CD-IELTS Speaking
        // Optimal range: -36 dB to -8 dB
        if (dB >= -36 && dB <= -8) {
          streakCount += 1;
          setMicStatusLabel('Optimal Speaking Level (-36 dB to -8 dB)');
          if (streakCount >= 45 && !isSensitivityVerified) {
            // ~1.5s of sustained speech
            setIsSensitivityVerified(true);
            setHasTestedMic(true);
            soundManager.playSuccess();
          }
        } else if (dB > -8) {
          setMicStatusLabel('Too Loud / Clipping Risk! Lower microphone volume or move away');
        } else {
          setMicStatusLabel('Detecting room ambient level (Speak louder to test)');
        }

        animationFrameRef.current = requestAnimationFrame(processAudio);
      };

      animationFrameRef.current = requestAnimationFrame(processAudio);
    } catch (err: any) {
      setMicError('Microphone access denied or unavailable. Please enable microphone permissions in your browser.');
      if (moduleType !== 'speaking') {
        setHasTestedMic(true);
      }
    }
  };

  // Synthesize official Practice sound check prompt with unified IELTSAudioEngine
  const handlePlaySoundSample = () => {
    if (isPlayingAudio) return;
    stopSpeech();

    setAudioError(null);
    setIsPlayingAudio(true);
    soundManager.playBeep(440, 0.12);

    const preferredGender = getPreferredVoiceGender();
    const speakerId = preferredGender === 'female' ? 'speaker_05' : 'speaker_04';
    const sampleText =
      'This is a sound check for the Computer-Delivered IELTS test. You should adjust the volume control until you can hear clearly.';

    ieltsAudioEngine.playSoundCheck({
      speakerId,
      sampleText,
      onStart: () => {
        setIsPlayingAudio(true);
      },
      onEnd: () => {
        setIsPlayingAudio(false);
        setAudioError(null);
        setHasTestedAudio(true);
      },
      onError: (err) => {
        setIsPlayingAudio(false);
        setHasTestedAudio(false);
        const msg = typeof err?.message === 'string' ? err.message : 'Audio stream playback failed or was blocked by your browser.';
        setAudioError(msg);
      }
    });
  };

  // Dual-Ear Stereo Channel Balance Test (Left & Right Cup Verification)
  const handleTestChannel = (channel: 'left' | 'right') => {
    setTestingChannel(channel);
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(channel === 'left' ? 440 : 880, ctx.currentTime);

      gain.gain.setValueAtTime(audioVolume * 0.4, ctx.currentTime);

      if (ctx.createStereoPanner) {
        const panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(channel === 'left' ? -1 : 1, ctx.currentTime);
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(ctx.destination);
      } else {
        osc.connect(gain);
        gain.connect(ctx.destination);
      }

      osc.start();
      osc.stop(ctx.currentTime + 0.6);

      setTimeout(() => {
        setTestingChannel(null);
        setHasTestedStereo(true);
        setHasTestedAudio(true);
        ctx.close().catch(() => {});
      }, 650);
    } catch {
      setTestingChannel(null);
      setHasTestedStereo(true);
      setHasTestedAudio(true);
    }
  };

  // 4-Second Micro Recording Sample Test
  const handleStartMicTestRecording = async () => {
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
        setIsSensitivityVerified(true);
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
      setMicError('Microphone permission denied or busy. Check system sound settings.');
      if (moduleType !== 'speaking') {
        setHasTestedMic(true);
      }
    }
  };

  const handleEnterFullscreenAndStart = () => {
    stopLiveMicMonitoring();
    soundManager.playSuccess();
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {}
    onProceedToExam();
    onClose();
  };

  if (!isOpen) return null;

  const theme = getCDIELTSThemeClasses(colorScheme);
  const fontSizeClass = getCDIELTSFontSizeClass(zoomLevel);

  // Map dB to 20 segments for the visual VU meter
  // -60 dB -> 0 segments, -36 dB -> 8 segments, -18 dB -> 14 segments, 0 dB -> 20 segments
  const meterPercent = Math.max(0, Math.min(100, ((currentDecibels + 60) / 60) * 100));
  const activeSegments = Math.round((meterPercent / 100) * 20);

  const canProceed =
    hasTestedAudio &&
    (hasTestedMic || moduleType !== 'speaking') &&
    confirmedRules;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div
        className={`relative w-full max-w-2xl ${theme.bg} ${fontSizeClass} border-2 ${theme.border} shadow-2xl overflow-hidden animate-fade-in font-sans flex flex-col max-h-[92vh]`}
      >
        {/* ================= 1. OFFICIAL CD-IELTS WORKSTATION HEADER ================= */}
        <header
          className={`px-4 sm:px-6 py-3 border-b-2 ${theme.border} ${theme.headerBg} flex items-center justify-between shrink-0 font-mono`}
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#F4A62A] text-[#0E1F1E] rounded-md">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-[#F4A62A]">
                BANDSPRINT EXAM WORKSTATION CHECK
              </div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-white">
                Pre-Exam Audio &amp; Microphone Verification
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Contrast Mode Selector */}
            <select
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value as CDIELTSColorScheme)}
              className="bg-black text-white text-xs font-mono font-bold p-1 border border-gray-600 outline-none cursor-pointer hidden sm:block"
              title="Display Contrast Mode"
            >
              <option value="standard">Standard Contrast</option>
              <option value="black-on-yellow">Black on Yellow</option>
              <option value="yellow-on-black">Yellow on Black</option>
              <option value="white-on-black">White on Black</option>
            </select>

            <button
              onClick={() => {
                stopLiveMicMonitoring();
                onClose();
              }}
              className="p-1.5 hover:bg-gray-700 text-gray-300 border border-gray-600 cursor-pointer"
              title="Cancel and Exit Pre-Exam Check"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ================= 2. SOUND CHECK & CALIBRATION CONTENT ================= */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* MODULE 1: HEADPHONE AUDIO & STEREO CHANNEL TEST */}
          <div className={`p-4 border-2 ${theme.border} ${theme.cardBg} space-y-3`}>
            <div className="flex items-center justify-between border-b border-gray-400/60 pb-2">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#0F4C45]" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  Step 1 · Audio &amp; Headphone Sound Check
                </span>
              </div>
              {hasTestedAudio && (
                <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Passed
                </span>
              )}
            </div>

            <p className="text-xs leading-relaxed opacity-90">
              Put on your headphones. Click the sample audio button below to verify volume level and ensure both left and right audio channels are balanced.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {/* Play Audio Sample */}
              <button
                type="button"
                onClick={handlePlaySoundSample}
                disabled={isPlayingAudio}
                className={`px-4 py-2 text-xs font-mono font-bold border transition flex items-center gap-2 cursor-pointer ${
                  isPlayingAudio ? 'bg-[#F4A62A] text-[#0E1F1E]' : theme.accentBtn
                } disabled:opacity-50`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isPlayingAudio ? 'Playing Sample Audio...' : 'Play Sound Check'}</span>
              </button>

              {/* Stereo Left & Right Channel Checks */}
              <div className="flex items-center gap-1 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => handleTestChannel('left')}
                  className={`px-2.5 py-1.5 border border-gray-500 font-bold transition cursor-pointer ${
                    testingChannel === 'left' ? 'bg-sky-600 text-white' : 'hover:bg-black/10'
                  }`}
                  title="Test Left Ear Cup Tone (440Hz)"
                >
                  {testingChannel === 'left' ? '● Left Tone' : 'Test Left Ear'}
                </button>
                <button
                  type="button"
                  onClick={() => handleTestChannel('right')}
                  className={`px-2.5 py-1.5 border border-gray-500 font-bold transition cursor-pointer ${
                    testingChannel === 'right' ? 'bg-sky-600 text-white' : 'hover:bg-black/10'
                  }`}
                  title="Test Right Ear Cup Tone (880Hz)"
                >
                  {testingChannel === 'right' ? '● Right Tone' : 'Test Right Ear'}
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex-1 min-w-[180px] flex items-center gap-2 pl-2">
                <VolumeX className="w-3.5 h-3.5 opacity-60" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioVolume}
                  onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                  title="Headset Master Volume"
                />
                <span className="text-xs font-mono font-bold w-10 text-right">
                  {Math.round(audioVolume * 100)}%
                </span>
              </div>
            </div>

            {audioError && (
              <div className="p-2.5 bg-red-600/15 border border-red-600 text-red-700 dark:text-red-300 text-xs font-mono flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{audioError}</span>
              </div>
            )}

            <label className="flex items-center gap-2 pt-1 text-xs font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasTestedAudio}
                onChange={(e) => {
                  setHasTestedAudio(e.target.checked);
                  if (e.target.checked) setAudioError(null);
                }}
                className="w-4 h-4 accent-sky-600 cursor-pointer"
              />
              <span>I confirm that the audio sample and stereo channels play clearly without static or distortion.</span>
            </label>
          </div>

          {/* MODULE 2: SYSTEM SOUND CHECK & VISUAL DECIBEL METER (CD-IELTS SPEAKING ENVIRONMENT) */}
          <div className={`p-4 border-2 ${theme.border} ${theme.cardBg} space-y-3`}>
            <div className="flex items-center justify-between border-b border-gray-400/60 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  Step 2 · Microphone Input & Visual Decibel VU Meter (Speaking Calibrator)
                </span>
              </div>
              {isSensitivityVerified ? (
                <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Calibrated
                </span>
              ) : (
                <span className="text-xs font-mono text-amber-600 dark:text-amber-400">
                  Required for Speaking
                </span>
              )}
            </div>

            <p className="text-xs leading-relaxed opacity-90">
              The CD-IELTS Speaking practice engine requires a clear microphone signal. Start the live sound check and speak the verification sentence below:
            </p>

            <div className="p-3 border border-current/25 bg-black/5 font-mono text-xs font-bold">
              "My candidate number is {candidateCode()} and I am ready to begin the speaking evaluation."
            </div>

            {/* LIVE VU DECIBEL METER */}
            <div className="p-3 border border-gray-500 bg-neutral-900 text-white rounded-none space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isLiveMicMonitoring ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'
                    }`}
                  />
                  <span className="font-bold text-gray-200">
                    Live Input Level: <strong className="text-emerald-400">{currentDecibels} dBFS</strong>
                  </span>
                </div>
                <span className="text-[11px] text-gray-400 font-mono">
                  Peak: {peakDecibels} dBFS | Zone: -36 to -8 dB
                </span>
              </div>

              {/* 20-Segment LED Meter */}
              <div className="grid grid-cols-20 gap-1 h-5 w-full bg-black/60 p-1 border border-neutral-700">
                {Array.from({ length: 20 }).map((_, idx) => {
                  const isLit = idx < activeSegments;
                  // Color coding:
                  // 0-7: Green (Silence to soft)
                  // 8-14: Bright Emerald / Cyan (Optimal Speaking Zone)
                  // 15-17: Amber (High Gain)
                  // 18-19: Red (Clipping)
                  let litClass = 'bg-emerald-500';
                  if (idx >= 8 && idx <= 14) litClass = 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]';
                  else if (idx >= 15 && idx <= 17) litClass = 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]';
                  else if (idx >= 18) litClass = 'bg-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.9)]';

                  return (
                    <div
                      key={idx}
                      className={`h-full transition-all duration-75 ${
                        isLit ? litClass : 'bg-neutral-800'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Live Status & Calibration Feedback */}
              <div className="flex items-center justify-between text-[11px] font-mono text-gray-300 pt-1">
                <span className="truncate">Status: {micStatusLabel}</span>
                {isSensitivityVerified && (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Optimal Sensitivity Locked
                  </span>
                )}
              </div>
            </div>

            {/* Microphone Controls: Live Meter Toggle, Mic Gain Booster, 4s Recording Test */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={isLiveMicMonitoring ? stopLiveMicMonitoring : handleStartLiveSoundCheck}
                  className={`px-3.5 py-1.5 text-xs font-mono font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                    isLiveMicMonitoring ? 'bg-emerald-600 text-white' : theme.accentBtn
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>{isLiveMicMonitoring ? 'Monitoring Active (Click to Stop)' : 'Start Live Decibel Meter'}</span>
                </button>

                {/* 4s Audio Recorder Check */}
                <button
                  type="button"
                  onClick={handleStartMicTestRecording}
                  disabled={isRecordingMic}
                  className={`px-3 py-1.5 text-xs font-mono font-bold border border-gray-500 hover:bg-black/10 transition flex items-center gap-1.5 cursor-pointer ${
                    isRecordingMic ? 'bg-rose-700 text-white animate-pulse' : ''
                  }`}
                  title="Record a 4-second speech sample to test your microphone playback"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isRecordingMic ? `Recording (${micCountdown}s)...` : 'Record 4s Clip'}</span>
                </button>
              </div>

              {/* Software Mic Gain Boost Slider */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <Sliders className="w-3.5 h-3.5 opacity-70" />
                <span>Gain Boost:</span>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={micGainMultiplier}
                  onChange={(e) => setMicGainMultiplier(parseFloat(e.target.value))}
                  className="w-24 accent-sky-600 cursor-pointer"
                  title="Microphone Software Sensitivity Boost"
                />
                <span className="font-bold w-10">{micGainMultiplier.toFixed(1)}x</span>
              </div>
            </div>

            {/* Playback preview of the 4-second audio recording */}
            {micAudioUrl && (
              <div className="p-2 border border-gray-400 bg-white/10 flex items-center justify-between gap-3">
                <span className="text-xs font-mono font-bold">Playback Recorded Audio Clip:</span>
                <audio src={micAudioUrl} controls className="h-7 max-w-xs" />
              </div>
            )}

            {micError && (
              <div className="p-2 bg-rose-100 border border-rose-500 text-rose-800 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{micError}</span>
              </div>
            )}
          </div>

          {/* MODULE 3: OFFICIAL CD-IELTS EXAM INTEGRITY RULES */}
          <div className={`p-4 border-2 ${theme.border} ${theme.cardBg} space-y-2`}>
            <div className="flex items-center gap-2 font-mono font-bold text-xs uppercase tracking-wider text-sky-800 dark:text-sky-400">
              <ShieldAlert className="w-4 h-4" />
              <span>Computer-Delivered IELTS Simulation Protocol</span>
            </div>
            <ul className="text-xs space-y-1 list-disc pl-4 opacity-90 leading-relaxed font-sans">
              <li>Do not leave, switch, or minimize the browser window during the test. Integrity monitor will log tab switches.</li>
              <li>In Computer-Delivered IELTS, no additional 10-minute answer transfer time is provided at the end of Reading.</li>
              <li>A 10-minute and 5-minute flashing alert will notify you before the countdown concludes.</li>
            </ul>

            <label className="flex items-start gap-2 pt-2 text-xs font-bold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmedRules}
                onChange={(e) => setConfirmedRules(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-sky-600 cursor-pointer"
              />
              <span>
                I confirm that I am in a quiet environment, my headset and microphone are verified, and I understand the examination rules.
              </span>
            </label>
          </div>
        </div>

        {/* ================= 3. FOOTER ACTIONS ================= */}
        <footer
          className={`px-4 sm:px-6 py-3 border-t-2 ${theme.border} ${theme.headerBg} flex items-center justify-between shrink-0 font-mono`}
        >
          <button
            type="button"
            onClick={() => {
              stopLiveMicMonitoring();
              onClose();
            }}
            className="px-4 py-2 text-xs font-bold text-gray-300 hover:text-white border border-gray-600 hover:bg-gray-800 cursor-pointer"
          >
            Cancel & Exit
          </button>

          <button
            type="button"
            disabled={!canProceed}
            onClick={handleEnterFullscreenAndStart}
            className={`px-6 py-2.5 text-xs sm:text-sm font-bold uppercase transition flex items-center gap-2 cursor-pointer rounded-md ${
              canProceed ? 'bg-[#F4A62A] hover:bg-[#D0891F] text-[#0E1F1E]' : 'bg-white/15 text-white/50 cursor-not-allowed'
            }`}
          >
            <Maximize2 className="w-4 h-4" />
            <span>Launch Practice Exam Workstation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </footer>
      </div>
    </div>
  );
};

function candidateCode(): string {
  return 'CD-482910';
}
