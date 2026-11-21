import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Flame,
  Award,
  BookOpen,
  Bookmark,
  Sliders,
  TrendingUp,
  Headphones,
  Check,
  RefreshCw,
  Archive,
  Info
} from 'lucide-react';
import { SHADOWING_ITEMS, ShadowingItem } from '../../data/shadowingSentences';
import { audioService } from '../../services/audioService';
import { soundManager } from '../../utils/audioEffects';
import { addMistake } from '../../utils/vaultStorage';
import { AudioWaveformVisualizer } from '../audio/AudioWaveformVisualizer';
import { PronunciationDrillStudio } from './PronunciationDrillStudio';
import { SpeakingTranscriptHighlighter } from './SpeakingTranscriptHighlighter';
import {
  evaluateShadowingAttempt,
  type ShadowingPracticeEvaluation
} from '../../utils/scoringIntegrity';

interface ShadowingPracticeProps {
  onShowToast: (msg: string) => void;
  onNavigateToVault?: () => void;
}

type EvaluationResult = ShadowingPracticeEvaluation;

export const ShadowingPractice: React.FC<ShadowingPracticeProps> = ({
  onShowToast,
  onNavigateToVault
}) => {
  // Studio View: Native Shadowing vs Dedicated Pronunciation & Minimal-Pair Drills
  const [studioMode, setStudioMode] = useState<'shadowing' | 'pronunciation'>('shadowing');

  // Category & Item selection
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Practice Modes: 'echo' (listen then repeat), 'simultaneous' (speak together), 'loop' (repeat until 90%)
  const [practiceMode, setPracticeMode] = useState<'echo' | 'simultaneous' | 'loop'>('echo');

  // Playback & Speech states
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [selectedVoice, setSelectedVoice] = useState<'speaker_04' | 'speaker_05' | 'speaker_01' | 'speaker_02' | 'speaker_03'>('speaker_04');

  // Recording & Speech Recognition states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);

  // Saved / Vault state
  const [savedToVault, setSavedToVault] = useState<boolean>(false);

  // Session Stats
  const [practicedCount, setPracticedCount] = useState<number>(0);
  const [accuracySum, setAccuracySum] = useState<number>(0);
  const [currentStreak, setCurrentStreak] = useState<number>(0);

  // Loop mode drill attempts
  const [loopAttempts, setLoopAttempts] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const transcriptRef = useRef<string>('');
  const recognitionConfidenceRef = useRef<number[]>([]);
  const recognitionErrorRef = useRef<string | null>(null);
  const hasAudioBlobRef = useRef<boolean>(false);
  const recordingStartTimeRef = useRef<number>(0);
  const handleStopRecordingRef = useRef<() => void>(() => {});

  // Filtered items
  const filteredItems = React.useMemo(() => {
    if (selectedCategory === 'all') return SHADOWING_ITEMS;
    return SHADOWING_ITEMS.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  const currentItem: ShadowingItem = filteredItems[currentIndex] || filteredItems[0] || SHADOWING_ITEMS[0];

  // Set default model voice when item changes
  useEffect(() => {
    if (currentItem?.modelVoice) {
      setSelectedVoice(currentItem.modelVoice);
    }
    setEvaluation(null);
    setTranscript('');
    setRecordedAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSavedToVault(false);
    setLoopAttempts(0);
    audioService.stop();
    setIsPlayingAudio(false);
  }, [currentItem]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      audioService.stop();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      try {
        mediaRecorderRef.current?.stop();
      } catch {}
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  // Native Audio Playback
  const handlePlayNativeAudio = useCallback(() => {
    if (isPlayingAudio) {
      audioService.stop();
      setIsPlayingAudio(false);
      return;
    }

    soundManager.playBeep(600, 0.05);
    setIsPlayingAudio(true);
    audioService.setPlaybackRate(playbackSpeed);

    audioService.speak(currentItem.targetSentence, {
      speakerId: selectedVoice,
      gender: selectedVoice === 'speaker_05' || selectedVoice === 'speaker_02' ? 'female' : 'male',
      deliveryProfile: 'pronunciation_model',
      onStart: () => setIsPlayingAudio(true),
      onEnd: () => {
        setIsPlayingAudio(false);
        // If in simultaneous mode and recording, allow candidate a brief buffer to finish
        if (practiceMode === 'simultaneous' && isRecordingRef.current) {
          setTimeout(() => {
            handleStopRecordingRef.current();
          }, 800);
        }
      },
      onError: () => {
        setIsPlayingAudio(false);
        onShowToast('Audio stream reconnecting. Ready to repeat.');
      }
    });
  }, [isPlayingAudio, currentItem, selectedVoice, playbackSpeed, practiceMode, isRecording]);

  // Start Mic Recording & Speech Recognition
  const handleStartRecording = async () => {
    soundManager.playBeep(520, 0.08);
    transcriptRef.current = '';
    recognitionConfidenceRef.current = [];
    recognitionErrorRef.current = null;
    hasAudioBlobRef.current = false;
    setTranscript('');
    setEvaluation(null);
    setRecordedAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    isRecordingRef.current = true;
    setIsRecording(true);
    const now = Date.now();
    recordingStartTimeRef.current = now;
    setRecordingStartTime(now);

    // Capture live candidate voice via MediaRecorder for instant playback comparison
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        audioChunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          if (blob.size > 0) {
            setRecordedAudioUrl(URL.createObjectURL(blob));
          }
          stream.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        };
        recorder.start();
      }
    } catch {
      // Non-blocking: continue with speech recognition if MediaRecorder unavailable
    }

    // If simultaneous mode, trigger native audio with a micro 250ms lead
    if (practiceMode === 'simultaneous' && !isPlayingAudio) {
      setTimeout(() => {
        handlePlayNativeAudio();
      }, 200);
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-GB';

        let fullSpoken = '';

        recognition.onresult = (e: any) => {
          let interim = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const piece = e.results[i][0].transcript;
            if (e.results[i].isFinal) {
              fullSpoken += ' ' + piece;
            } else {
              interim += piece;
            }
          }
          const currentText = (fullSpoken + ' ' + interim).trim();
          transcriptRef.current = currentText;
          setTranscript(currentText);

          // Reset silence countdown timer
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            // Auto finish after 2.5s silence if student has spoken enough words
            if (currentText.split(/\s+/).length >= Math.floor(currentItem.targetSentence.split(/\s+/).length * 0.7)) {
              handleStopRecordingRef.current();
            }
          }, 2500);
        };

        recognition.onerror = (e: any) => {
          recognitionErrorRef.current = e?.error || 'speech_recognition_error';
        };

        recognition.onend = () => {
          // If ended unexpectedly while still marked recording
        };

        recognition.start();
      } catch (err: any) {
        recognitionErrorRef.current = err?.message || 'speech_recognition_unavailable';
      }
    } else {
      recognitionErrorRef.current = 'browser_speech_recognition_unsupported';
    }
  };

  // Stop Recording & Process Honest Shadowing Practice Metrics (Never Fabricates an IELTS Band)
  const handleStopRecording = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (!isRecordingRef.current && !isRecording) return;

    soundManager.playBeep(650, 0.05);
    isRecordingRef.current = false;
    setIsRecording(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        if (audioChunksRef.current.length > 0) {
          hasAudioBlobRef.current = true;
        }
        mediaRecorderRef.current.stop();
      }
    } catch {}

    setIsEvaluating(true);
    const startTs = recordingStartTimeRef.current || recordingStartTime;
    const durationSec = Math.max(1, (Date.now() - startTs) / 1000);

    setTimeout(() => {
      setIsEvaluating(false);
      // NEVER fabricate a fake transcript when speech recognition fails or captures silence
      const rawSpoken = (transcriptRef.current || transcript).trim();
      const confSamples = recognitionConfidenceRef.current;
      const avgConf =
        confSamples.length > 0
          ? confSamples.reduce((a, b) => a + b, 0) / confSamples.length
          : null;
      const targetWordCount = currentItem.targetSentence.split(/\s+/).filter(Boolean).length;
      const expectedDurationSec = (targetWordCount / 140) * 60 / Math.max(0.5, playbackSpeed);

      const result = evaluateShadowingAttempt({
        targetText: currentItem.targetSentence,
        spokenTranscript: rawSpoken,
        elapsedSec: durationSec,
        expectedDurationSec,
        hasAudioBlob: hasAudioBlobRef.current || Boolean(recordedAudioUrl),
        recognitionConfidence: avgConf,
        recognitionError: recognitionErrorRef.current
      });
      setEvaluation(result);

      if (result.status !== 'valid') {
        onShowToast(result.honestSummary);
        return;
      }

      // Update Session Practice Stats ONLY on valid speech capture
      setPracticedCount((prev) => prev + 1);
      setAccuracySum((prev) => prev + result.wordAccuracyPct);
      if (result.wordAccuracyPct >= 80) {
        setCurrentStreak((prev) => prev + 1);
        soundManager.playSuccess();
      } else {
        setCurrentStreak(0);
      }

      // Check loop mode condition
      if (practiceMode === 'loop') {
        setLoopAttempts((prev) => prev + 1);
        if (result.wordAccuracyPct >= 90) {
          onShowToast('90%+ transcript alignment reached in Loop Drill. Listen back to verify rhythm and stress.');
        } else {
          onShowToast(`Word alignment: ${result.wordAccuracyPct}%. Try another pass to reach 90%+.`);
        }
      }
    }, 450);
  };

  handleStopRecordingRef.current = handleStopRecording;

  // Save problematic phrase to Mistake Vault
  const handleSaveToVault = () => {
    if (savedToVault) return;

    addMistake({
      title: `Shadowing: ${currentItem.topic} (${currentItem.bandTarget})`,
      userAnswer: transcript || 'Spoken trial recorded with accent divergence',
      correctAnswer: currentItem.targetSentence,
      explanation: `${currentItem.focusTip} Key phonetic focus words: ${currentItem.phoneticKeyWords.join(', ')}.`,
      module: 'speaking'
    });

    setSavedToVault(true);
    soundManager.playSuccess();
    onShowToast('Saved to Mistake Vault under Speaking Pronunciation!');
  };

  // Navigation handlers
  const handleNextSentence = () => {
    if (currentIndex < filteredItems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
    soundManager.playBeep(600, 0.03);
  };

  const handlePrevSentence = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      setCurrentIndex(filteredItems.length - 1);
    }
    soundManager.playBeep(600, 0.03);
  };

  const avgAccuracy = practicedCount > 0 ? Math.round(accuracySum / practicedCount) : 0;

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* 1. Header Banner & Studio Mode Toggle */}
      <div className="bg-[#0F4C45] text-white p-6 sm:p-7 rounded-2xl border border-[#1F8A70]/45 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0B3833] text-[#F4A62A] text-[11px] font-mono font-bold border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span>BAND 8.5+ PRONUNCIATION &amp; SHADOWING LAB</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5 flex-wrap">
              <span>Shadowing &amp; Pronunciation Studio</span>
              <span className="text-xs font-mono font-bold bg-[#F4A62A] text-[#0E1F1E] px-2.5 py-0.5 rounded-lg">
                British RP · EN + বাংলা
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[#EEF3F1]/85 max-w-2xl leading-relaxed">
              Train native rhythm, intonation peaks, and consonant linking with live shadowing — or drill tricky IELTS minimal pairs, academic word stress, and voice-playback filler audits.
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex items-center gap-3 bg-[#0B3833] px-4 py-3 rounded-xl border border-white/10 shrink-0 tabular-nums">
            <div className="text-center px-2">
              <div className="text-[10px] text-[#EEF3F1]/70 uppercase font-bold font-mono">Practiced</div>
              <div className="text-lg font-bold text-white font-mono">{practicedCount}</div>
            </div>
            <div className="w-px h-8 bg-white/15"></div>
            <div className="text-center px-2">
              <div className="text-[10px] text-[#EEF3F1]/70 uppercase font-bold font-mono">Avg Match</div>
              <div className="text-lg font-bold text-[#F4A62A] font-mono">{avgAccuracy}%</div>
            </div>
            <div className="w-px h-8 bg-white/15"></div>
            <div className="text-center px-2">
              <div className="text-[10px] text-[#EEF3F1]/70 uppercase font-bold font-mono">Streak</div>
              <div className="text-lg font-bold text-emerald-300 font-mono flex items-center gap-1 justify-center">
                <Flame className="w-4 h-4 text-[#F4A62A]" />
                <span>{currentStreak}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Prominent 2-Mode Switcher: Shadowing vs Pronunciation & Minimal-Pair Drill */}
        <div className="inline-flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#0B3833] border border-white/15">
          <button
            type="button"
            onClick={() => {
              setStudioMode('shadowing');
              soundManager.playBeep(600, 0.03);
            }}
            className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              studioMode === 'shadowing'
                ? 'bg-[#F4A62A] text-[#0E1F1E]'
                : 'text-[#EEF3F1]/85 hover:text-white hover:bg-white/10'
            }`}
          >
            <Headphones className="w-4 h-4" />
            <span>1. Native Shadowing &amp; Cadence</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setStudioMode('pronunciation');
              soundManager.playBeep(640, 0.03);
            }}
            className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              studioMode === 'pronunciation'
                ? 'bg-[#F4A62A] text-[#0E1F1E]'
                : 'text-[#EEF3F1]/85 hover:text-white hover:bg-white/10'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>2. Pronunciation &amp; Minimal-Pair Drill (IPA + বাংলা)</span>
          </button>
        </div>
      </div>

      {studioMode === 'pronunciation' ? (
        <PronunciationDrillStudio onShowToast={onShowToast} />
      ) : (
        <>
      {/* 2. Sticky Category Filter & Mode Switcher Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Category Pills (Touch Targets >= 44px on mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {[
            { id: 'all', label: 'All Modules' },
            { id: 'part1_fluency', label: 'Part 1: Everyday Fluency' },
            { id: 'part2_narrative', label: 'Part 2: Vivid Narratives' },
            { id: 'part3_academic', label: 'Part 3: Academic Arguments' },
            { id: 'collocations_markers', label: 'Band 8-9 Markers' },
            { id: 'pronunciation_drills', label: 'Consonant & Stress Drills' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setCurrentIndex(0);
                soundManager.playBeep(600, 0.03);
              }}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => {
              setPracticeMode('echo');
              soundManager.playBeep(600, 0.03);
            }}
            className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center ${
              practiceMode === 'echo'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Listen first, then repeat with micro-pause"
          >
            Echo (Listen & Repeat)
          </button>
          <button
            onClick={() => {
              setPracticeMode('simultaneous');
              soundManager.playBeep(600, 0.03);
            }}
            className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center ${
              practiceMode === 'simultaneous'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Speak concurrently with native speaker (200ms delay)"
          >
            Simultaneous (Pacing)
          </button>
          <button
            onClick={() => {
              setPracticeMode('loop');
              soundManager.playBeep(600, 0.03);
            }}
            className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center ${
              practiceMode === 'loop'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Repeat until 90%+ accuracy is reached"
          >
            Loop Drill
          </button>
        </div>
      </div>

      {/* 3. Main Practice Card with Docked Telemetry & Waveform Controls */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col flex-1 gap-4">
        {/* Card Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-mono font-black">
              {currentIndex + 1} of {filteredItems.length}
            </span>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono truncate">
              {currentItem.topic}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono font-bold">
              Band {currentItem.bandTarget}
            </span>
          </div>

          {/* Speed & Voice Controls */}
          <div className="flex items-center gap-2">
            {/* Speed Selector */}
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-mono font-bold">
              {[0.75, 0.9, 1.0, 1.1].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setPlaybackSpeed(s);
                    audioService.setPlaybackRate(s);
                    soundManager.playBeep(600, 0.02);
                  }}
                  className={`min-h-[32px] px-2 py-0.5 rounded-lg transition cursor-pointer flex items-center ${
                    playbackSpeed === s
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={s === 0.75 ? 'Slow pace for phonetic articulation' : `${s}x speed`}
                >
                  {s}×
                </button>
              ))}
            </div>

            {/* Voice Model Selector (Male & Female British RP Voices) */}
            <select
              value={selectedVoice}
              onChange={(e) => {
                setSelectedVoice(e.target.value as any);
                soundManager.playBeep(600, 0.03);
              }}
              className="min-h-[36px] bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-2.5 py-1 outline-none"
              title="Select authentic British Model Voice"
            >
              <option value="speaker_04">Prof. Arthur · Male British RP</option>
              <option value="speaker_05">Dr. Clara · Female British RP</option>
              <option value="speaker_01">Thomas · Male Conversational</option>
              <option value="speaker_02">Libby · Female Natural</option>
              <option value="speaker_03">Alistair · Academic Lecturer</option>
            </select>
          </div>
        </div>

        {/* 4. Target Sentence Prompt Container: Smooth Scrollable with Max-Height */}
        <div className="relative p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border-2 border-indigo-100/80 space-y-3 max-h-[32vh] sm:max-h-[38vh] overflow-y-auto overscroll-contain scroll-smooth shrink-0">
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
            <span className="flex items-center gap-1 font-bold text-indigo-900">
              <Headphones className="w-3.5 h-3.5 text-indigo-600" />
              <span>Target Model Speech (Native British English)</span>
            </span>
            <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px]">
              Intonation: {currentItem.intonationPattern}
            </span>
          </div>

          {/* Big Sentence Text */}
          <div className="text-lg sm:text-2xl font-black text-slate-900 leading-snug tracking-tight">
            "{currentItem.targetSentence}"
          </div>

          {/* Linguistic Coaching & Phonetic Focus */}
          <div className="p-3 rounded-xl bg-white/90 border border-indigo-200/70 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-indigo-950">Pronunciation Coaching: </span>
                <span>{currentItem.focusTip}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono font-bold text-slate-400">Key Terms:</span>
              {currentItem.phoneticKeyWords.map((word) => (
                <span
                  key={word}
                  className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 font-mono text-[11px] font-bold"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Docked Action Controls, Telemetry & Waveform Directly Below Question Card */}
        <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pt-3 pb-[max(0.75rem,calc(env(safe-area-inset-bottom)+4.25rem))] sm:pb-3 rounded-b-2xl shadow-lg mt-auto shrink-0 space-y-3">
          {/* Main Action Buttons: Listen & Record (Touch Targets >= 48px) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Native Audio Listen Button */}
            <button
              onClick={handlePlayNativeAudio}
              className={`min-h-[48px] px-5 py-3 rounded-2xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer ${
                isPlayingAudio
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
              }`}
              title="Listen to authentic British male pronunciation"
            >
              {isPlayingAudio ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Native Audio</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span>Listen to Native Model ({playbackSpeed}×)</span>
                </>
              )}
            </button>

            {/* Candidate Microphone Record Button */}
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`min-h-[48px] px-5 py-3 rounded-2xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer ${
                isRecording
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/40 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
              }`}
              title={isRecording ? 'Click to finish speaking' : 'Click to shadow and record repetition'}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-4 h-4 animate-spin" />
                  <span>Done Speaking (Recording...)</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>{practiceMode === 'simultaneous' ? 'Start Simultaneous Shadow' : 'Shadow Now (Record)'}</span>
                </>
              )}
            </button>
          </div>

          {/* Live Audio Waveform when recording */}
          {isRecording && (
            <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1.5 animate-fade-in">
              <div className="flex items-center justify-between text-xs text-rose-900 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                  <span>Recording Candidate Repetition... Speak with rhythm</span>
                </span>
                <span className="font-mono text-[10px]">Web Audio API Live</span>
              </div>
              <AudioWaveformVisualizer isRecording={isRecording} height={38} showMetrics={false} />
            </div>
          )}

          {/* Evaluating loader */}
          {isEvaluating && (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
              <span>Analyzing phonetics, lexical tokens, and rhythm alignment...</span>
            </div>
          )}

          {/* Honest Shadowing Practice Metrics (Never Fabricates an IELTS Band) */}
          {evaluation && (
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-3.5 animate-fade-in max-h-[38vh] overflow-y-auto overscroll-contain">
              {evaluation.status !== 'valid' ? (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-800">
                      {evaluation.status === 'recognition_failed'
                        ? 'Speech Recognition Unavailable'
                        : 'No Clear Speech Captured'}
                    </span>
                    <button
                      onClick={handleStartRecording}
                      className="min-h-[34px] px-3 py-1 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Try Recording Again</span>
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-rose-900">{evaluation.honestSummary}</p>
                  <p className="text-[11px] text-rose-700">{evaluation.practiceGuidance}</p>
                </div>
              ) : (
                <>
                  {/* Header Score Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black text-white shadow-sm shrink-0 ${
                          evaluation.wordAccuracyPct >= 85
                            ? 'bg-emerald-600'
                            : evaluation.wordAccuracyPct >= 70
                            ? 'bg-blue-600'
                            : 'bg-amber-600'
                        }`}
                      >
                        <span className="text-base leading-none">{evaluation.wordAccuracyPct}%</span>
                        <span className="text-[8px] uppercase font-mono opacity-80">Words</span>
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900 flex items-center gap-1.5 flex-wrap">
                          <span>Shadowing Alignment (Practice Only)</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold font-mono">
                            {evaluation.wpm} WPM · {evaluation.paceStatus.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold font-mono">
                            Not an IELTS Band
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">{evaluation.honestSummary}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{evaluation.practiceGuidance}</div>
                      </div>
                    </div>

                    {/* Action Buttons: Save to Vault & Retry */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleSaveToVault}
                        disabled={savedToVault}
                        className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                          savedToVault
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
                        }`}
                        title="Save sentence to Mistake Vault for targeted spaced repetition"
                      >
                        <Archive className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{savedToVault ? 'Saved' : 'Save'}</span>
                      </button>

                      <button
                        onClick={handleStartRecording}
                        className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    </div>
                  </div>

                  {/* Transparent Metric Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[11px]">
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <div className="text-slate-400 font-mono uppercase text-[9px]">Matched</div>
                      <div className="font-black text-emerald-700">{evaluation.matchedCount}/{evaluation.targetWordCount}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <div className="text-slate-400 font-mono uppercase text-[9px]">Missing</div>
                      <div className="font-black text-rose-700">{evaluation.missingCount}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <div className="text-slate-400 font-mono uppercase text-[9px]">Substituted</div>
                      <div className="font-black text-amber-700">{evaluation.substitutedCount}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <div className="text-slate-400 font-mono uppercase text-[9px]">Extra</div>
                      <div className="font-black text-purple-700">{evaluation.extraCount}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <div className="text-slate-400 font-mono uppercase text-[9px]">Timing Sync</div>
                      <div className="font-black text-slate-700 capitalize">{evaluation.timingSyncStatus.replace('_', ' ')}</div>
                    </div>
                  </div>

                  {/* Word-by-Word DP Alignment Grid */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-700 font-mono uppercase tracking-wider flex items-center justify-between flex-wrap gap-1">
                      <span>Transcript Word Alignment</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Green = Match · Amber = Near/Sub · Red = Missing · Purple = Extra
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-wrap gap-1.5 text-sm leading-relaxed">
                      {evaluation.alignment.map((token, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 rounded-lg font-bold transition text-xs ${
                            token.status === 'matched'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : token.status === 'near_match' || token.status === 'substituted'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : token.status === 'extra'
                              ? 'bg-purple-50 text-purple-800 border border-purple-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-300 line-through opacity-75'
                          }`}
                          title={
                            token.status === 'matched'
                              ? 'Word matched in speech recognition'
                              : token.status === 'near_match'
                              ? `Close match (heard "${token.spokenWord}")`
                              : token.status === 'substituted'
                              ? `Expected "${token.targetWord}", heard "${token.spokenWord}"`
                              : token.status === 'extra'
                              ? `Extra spoken word "${token.spokenWord}"`
                              : `Missing word "${token.targetWord}"`
                          }
                        >
                          {token.status === 'extra'
                            ? `+${token.spokenWord}`
                            : token.status === 'substituted'
                            ? `${token.targetWord} → ${token.spokenWord}`
                            : token.targetWord}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">{evaluation.disclaimer}</p>
                </>
              )}

              {/* Candidate Voice Playback & Filler-Word Highlighter */}
              {(transcript || recordedAudioUrl) && (
                <SpeakingTranscriptHighlighter
                  transcript={transcript}
                  audioUrl={recordedAudioUrl}
                  contextLabel={`Shadowing: ${currentItem.topic}`}
                  onShowToast={onShowToast}
                  compact
                />
              )}
            </div>
          )}

          {/* Bottom Navigation Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              onClick={handlePrevSentence}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="text-xs text-slate-400 font-mono">
              Sentence {currentIndex + 1} of {filteredItems.length}
            </div>

            <button
              onClick={handleNextSentence}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 8. Spaced Repetition Coaching Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-blue-950 text-sm">How Shadowing Builds Spoken Rhythm &amp; Chunking</div>
            <p className="text-blue-800 mt-0.5 leading-relaxed">
              Shadowing 10 sentences daily helps train natural phrase chunking, pacing, and sentence stress. Always compare your playback against the model audio — shadowing is a rhythm drill and does not produce an IELTS band score.
            </p>
          </div>
        </div>

        {onNavigateToVault && (
          <button
            onClick={onNavigateToVault}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-900 font-bold border border-blue-300 shrink-0 transition flex items-center gap-1.5 shadow-2xs"
          >
            <Archive className="w-4 h-4 text-blue-600" />
            <span>View Saved Mistakes</span>
          </button>
        )}
      </div>
        </>
      )}
    </div>
  );
};
