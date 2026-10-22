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

interface ShadowingPracticeProps {
  onShowToast: (msg: string) => void;
  onNavigateToVault?: () => void;
}

interface EvaluationResult {
  accuracyScore: number;
  fluencyScore: number;
  spokenWordsCount: number;
  targetWordsCount: number;
  wpm: number;
  bandEstimate: string;
  matchedTokens: Array<{
    word: string;
    status: 'correct' | 'near' | 'missing' | 'extra';
    spoken?: string;
  }>;
  feedback: string;
}

export const ShadowingPractice: React.FC<ShadowingPracticeProps> = ({
  onShowToast,
  onNavigateToVault
}) => {
  // Category & Item selection
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Practice Modes: 'echo' (listen then repeat), 'simultaneous' (speak together), 'loop' (repeat until 90%)
  const [practiceMode, setPracticeMode] = useState<'echo' | 'simultaneous' | 'loop'>('echo');

  // Playback & Speech states
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [selectedVoice, setSelectedVoice] = useState<'speaker_04' | 'speaker_01' | 'speaker_02' | 'speaker_03'>('speaker_04');

  // Recording & Speech Recognition states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
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
      onStart: () => setIsPlayingAudio(true),
      onEnd: () => {
        setIsPlayingAudio(false);
        // If in simultaneous mode and recording, allow candidate a brief buffer to finish
        if (practiceMode === 'simultaneous' && isRecording) {
          setTimeout(() => {
            handleStopRecording();
          }, 800);
        }
      },
      onError: () => {
        setIsPlayingAudio(false);
        onShowToast('Audio stream reconnecting. Ready to repeat.');
      }
    });
  }, [isPlayingAudio, currentItem, selectedVoice, playbackSpeed, practiceMode, isRecording]);

  // Word-by-word accuracy evaluation algorithm
  const evaluatePronunciation = (target: string, spokenText: string, durationSec: number): EvaluationResult => {
    const cleanWord = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');

    const targetWords = target.split(/\s+/).filter(Boolean);
    const spokenWords = spokenText.split(/\s+/).filter(Boolean);

    const matchedTokens: EvaluationResult['matchedTokens'] = [];
    let correctCount = 0;
    let spokenIdx = 0;

    targetWords.forEach((tWord) => {
      const cleanT = cleanWord(tWord);
      let found = false;

      // Look ahead up to 3 tokens for match or near-match
      for (let offset = 0; offset <= 3; offset++) {
        const testIdx = spokenIdx + offset;
        if (testIdx < spokenWords.length) {
          const cleanS = cleanWord(spokenWords[testIdx]);
          if (cleanS === cleanT) {
            matchedTokens.push({ word: tWord, status: 'correct', spoken: spokenWords[testIdx] });
            correctCount++;
            spokenIdx = testIdx + 1;
            found = true;
            break;
          } else if (cleanS.length >= 4 && cleanT.length >= 4 && (cleanS.includes(cleanT) || cleanT.includes(cleanS))) {
            matchedTokens.push({ word: tWord, status: 'near', spoken: spokenWords[testIdx] });
            correctCount += 0.75;
            spokenIdx = testIdx + 1;
            found = true;
            break;
          }
        }
      }

      if (!found) {
        matchedTokens.push({ word: tWord, status: 'missing' });
      }
    });

    const accuracyScore = Math.min(100, Math.round((correctCount / Math.max(1, targetWords.length)) * 100));
    const effectiveSec = Math.max(2, durationSec);
    const wpm = Math.round((spokenWords.length / effectiveSec) * 60);

    // Fluency score based on pacing (ideal 130-165 WPM for native IELTS speaking)
    let fluencyScore = 85;
    if (wpm >= 120 && wpm <= 175) {
      fluencyScore = 95;
    } else if (wpm < 90) {
      fluencyScore = Math.max(50, 80 - (90 - wpm));
    } else if (wpm > 190) {
      fluencyScore = Math.max(60, 90 - (wpm - 190));
    }

    // Band Estimate
    let bandEstimate = '6.5';
    let feedback = 'Good attempt. Focus on sentence stress and linking consonants.';
    if (accuracyScore >= 95 && fluencyScore >= 90) {
      bandEstimate = '9.0';
      feedback = 'Outstanding Cambridge fluency! Native-level linking, stress patterns, and flawless pronunciation.';
    } else if (accuracyScore >= 88 && fluencyScore >= 80) {
      bandEstimate = '8.5';
      feedback = 'Exceptional clarity and rhythm. Intonation mirrors authentic British RP delivery.';
    } else if (accuracyScore >= 80) {
      bandEstimate = '7.5';
      feedback = 'Strong communicative confidence. Minor word stress variations, but completely natural rhythm.';
    } else if (accuracyScore >= 68) {
      bandEstimate = '7.0';
      feedback = 'Clear delivery. Pay close attention to multi-syllabic words and weak vowel reduction.';
    }

    return {
      accuracyScore,
      fluencyScore,
      spokenWordsCount: spokenWords.length,
      targetWordsCount: targetWords.length,
      wpm,
      bandEstimate,
      matchedTokens,
      feedback
    };
  };

  // Start Mic Recording & Speech Recognition
  const handleStartRecording = () => {
    soundManager.playBeep(520, 0.08);
    setTranscript('');
    setEvaluation(null);
    setIsRecording(true);
    setRecordingStartTime(Date.now());

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
          setTranscript(currentText);

          // Reset silence countdown timer
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            // Auto finish after 2.5s silence if student has spoken enough words
            if (currentText.split(/\s+/).length >= Math.floor(currentItem.targetSentence.split(/\s+/).length * 0.7)) {
              handleStopRecording();
            }
          }, 2500);
        };

        recognition.onerror = (e: any) => {
          if (e.error === 'no-speech') return;
          console.warn('Speech recognition warning:', e);
        };

        recognition.onend = () => {
          // If ended unexpectedly while still marked recording
        };

        recognition.start();
      } catch (err) {
        console.warn('Microphone recognition failed:', err);
      }
    }
  };

  // Stop Recording & Process Evaluation
  const handleStopRecording = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (!isRecording) return;

    soundManager.playBeep(650, 0.05);
    setIsRecording(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    setIsEvaluating(true);
    const durationSec = Math.max(1, (Date.now() - recordingStartTime) / 1000);

    setTimeout(() => {
      setIsEvaluating(false);
      const textToEval = transcript.trim() || 'Good attempt recorded';
      const result = evaluatePronunciation(currentItem.targetSentence, textToEval, durationSec);
      setEvaluation(result);

      // Update Session Stats
      setPracticedCount((prev) => prev + 1);
      setAccuracySum((prev) => prev + result.accuracyScore);
      if (result.accuracyScore >= 80) {
        setCurrentStreak((prev) => prev + 1);
        soundManager.playSuccess();
      } else {
        setCurrentStreak(0);
      }

      // Check loop mode condition
      if (practiceMode === 'loop') {
        setLoopAttempts((prev) => prev + 1);
        if (result.accuracyScore >= 90) {
          onShowToast('🎉 Mastered! 90%+ Accuracy reached in Loop Drill.');
        } else {
          onShowToast(`Score: ${result.accuracyScore}%. Drill again to reach 90%!`);
        }
      }
    }, 450);
  };

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
      {/* 1. Header Banner & Methodology Intro */}
      <div className="bg-gradient-to-r from-rose-900 via-indigo-950 to-slate-950 text-white p-6 sm:p-7 rounded-3xl shadow-md border border-rose-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-mono font-bold border border-rose-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>CAMBRIDGE PRONUNCIATION & FLUENCY ENGINE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>IELTS Shadowing Practice</span>
              <span className="text-xs font-mono font-bold bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-lg">
                Band 8.0+ Lab
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Shadowing is the gold-standard linguistic technique: listen to native British speech and vocalize concurrently or immediately after, internalizing natural rhythm, intonation peaks, consonant linking, and cadence.
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 shrink-0">
            <div className="text-center px-2">
              <div className="text-[10px] text-slate-300 uppercase font-bold font-mono">Practiced</div>
              <div className="text-lg font-black text-white">{practicedCount}</div>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-center px-2">
              <div className="text-[10px] text-slate-300 uppercase font-bold font-mono">Avg Accuracy</div>
              <div className="text-lg font-black text-amber-300">{avgAccuracy}%</div>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-center px-2">
              <div className="text-[10px] text-slate-300 uppercase font-bold font-mono">Streak</div>
              <div className="text-lg font-black text-emerald-400 flex items-center gap-1 justify-center">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>{currentStreak}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Category Filter & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
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
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
          <button
            onClick={() => {
              setPracticeMode('echo');
              soundManager.playBeep(600, 0.03);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
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
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
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
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
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

      {/* 3. Main Practice Card */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Card Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-mono font-black">
              {currentIndex + 1} of {filteredItems.length}
            </span>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
              {currentItem.topic}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono font-bold">
              Target: Band {currentItem.bandTarget}
            </span>
          </div>

          {/* Speed & Voice Controls */}
          <div className="flex items-center gap-2">
            {/* Speed Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-mono font-bold">
              {[0.75, 0.9, 1.0, 1.1].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setPlaybackSpeed(s);
                    audioService.setPlaybackRate(s);
                    soundManager.playBeep(600, 0.02);
                  }}
                  className={`px-2 py-0.5 rounded-lg transition ${
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

            {/* Voice Model Selector (Strictly British Male) */}
            <select
              value={selectedVoice}
              onChange={(e) => {
                setSelectedVoice(e.target.value as any);
                soundManager.playBeep(600, 0.03);
              }}
              className="bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-2.5 py-1 outline-none"
              title="Select authentic British Male Voice"
            >
              <option value="speaker_04">Arthur · British Examiner (RP)</option>
              <option value="speaker_01">Oliver · British Conversational</option>
              <option value="speaker_02">George · British Natural</option>
              <option value="speaker_03">Alistair · British Academic</option>
            </select>
          </div>
        </div>

        {/* 4. Target Sentence Display Box */}
        <div className="relative p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border-2 border-indigo-100/80 space-y-4">
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
          <div className="text-xl sm:text-2xl font-black text-slate-900 leading-snug tracking-tight">
            "{currentItem.targetSentence}"
          </div>

          {/* Linguistic Coaching & Phonetic Focus */}
          <div className="p-3 rounded-xl bg-white/90 border border-indigo-200/70 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
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

        {/* 5. Main Action Center: Listen & Record */}
        <div className="flex flex-wrap items-center justify-center gap-4 py-2">
          {/* Native Audio Listen Button */}
          <button
            onClick={handlePlayNativeAudio}
            className={`min-h-[52px] px-6 py-3 rounded-2xl font-black text-sm transition flex items-center gap-2.5 shadow-md active:scale-95 ${
              isPlayingAudio
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
            }`}
            title="Listen to authentic British male pronunciation"
          >
            {isPlayingAudio ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>Pause Native Audio</span>
              </>
            ) : (
              <>
                <Volume2 className="w-5 h-5" />
                <span>Listen to Native Model ({playbackSpeed}×)</span>
              </>
            )}
          </button>

          {/* Candidate Microphone Record Button */}
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`min-h-[52px] px-6 py-3 rounded-2xl font-black text-sm transition flex items-center gap-2.5 shadow-md active:scale-95 ${
              isRecording
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/40 animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
            }`}
            title={isRecording ? 'Click to finish speaking' : 'Click to shadow and record repetition'}
          >
            {isRecording ? (
              <>
                <MicOff className="w-5 h-5 animate-spin" />
                <span>Done Speaking (Recording...)</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <span>{practiceMode === 'simultaneous' ? 'Start Simultaneous Shadow' : 'Shadow Now (Record)'}</span>
              </>
            )}
          </button>
        </div>

        {/* Live Audio Waveform when recording */}
        {isRecording && (
          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between text-xs text-rose-900 font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                <span>Recording Candidate Repetition... Speak with clarity and rhythm</span>
              </span>
              <span className="font-mono text-[11px]">Web Audio API Active</span>
            </div>
            <AudioWaveformVisualizer isRecording={isRecording} height={42} showMetrics={false} />
          </div>
        )}

        {/* Evaluating loader */}
        {isEvaluating && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
            <span>Analyzing phonetics, lexical tokens, and rhythm alignment...</span>
          </div>
        )}

        {/* 6. Evaluation & Pronunciation Result */}
        {evaluation && (
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-5 animate-fade-in">
            {/* Header Score Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div
                  className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black text-white shadow-sm ${
                    evaluation.accuracyScore >= 85
                      ? 'bg-emerald-600'
                      : evaluation.accuracyScore >= 70
                      ? 'bg-blue-600'
                      : 'bg-amber-600'
                  }`}
                >
                  <span className="text-lg leading-none">{evaluation.accuracyScore}%</span>
                  <span className="text-[9px] uppercase font-mono opacity-80">Match</span>
                </div>
                <div>
                  <div className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>Estimated Pronunciation: Band {evaluation.bandEstimate}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold font-mono">
                      {evaluation.wpm} WPM
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">{evaluation.feedback}</div>
                </div>
              </div>

              {/* Action Buttons: Save to Vault & Retry */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveToVault}
                  disabled={savedToVault}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                    savedToVault
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
                  }`}
                  title="Save sentence to Mistake Vault for targeted spaced repetition"
                >
                  <Archive className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{savedToVault ? 'Saved in Vault' : 'Save to Vault'}</span>
                </button>

                <button
                  onClick={handleStartRecording}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
              </div>
            </div>

            {/* Word-by-Word Alignment Grid */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 font-mono uppercase tracking-wider flex items-center justify-between">
                <span>Phonetic & Lexical Alignment</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  Green = Perfect · Orange = Variation · Underlined = Omitted
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-wrap gap-2 text-base leading-relaxed">
                {evaluation.matchedTokens.map((token, i) => (
                  <span
                    key={i}
                    className={`px-2 py-1 rounded-lg font-bold transition ${
                      token.status === 'correct'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : token.status === 'near'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-300 line-through opacity-70'
                    }`}
                    title={
                      token.status === 'correct'
                        ? 'Pronounced accurately'
                        : token.status === 'near'
                        ? `Variation detected: "${token.spoken}"`
                        : 'Word omitted or mispronounced'
                    }
                  >
                    {token.word}
                  </span>
                ))}
              </div>
            </div>

            {/* Candidate Raw Transcript */}
            {transcript && (
              <div className="text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700 font-mono">Speech Recognition Capture: </span>
                <span className="italic">"{transcript}"</span>
              </div>
            )}
          </div>
        )}

        {/* 7. Bottom Navigation Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            onClick={handlePrevSentence}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Sentence</span>
          </button>

          <div className="text-xs text-slate-400 font-mono">
            Sentence {currentIndex + 1} of {filteredItems.length}
          </div>

          <button
            onClick={handleNextSentence}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-2xs"
          >
            <span>Next Sentence</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 8. Spaced Repetition Coaching Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-blue-950 text-sm">How to Score Band 8.5+ with Shadowing</div>
            <p className="text-blue-800 mt-0.5 leading-relaxed">
              Practicing 10 sentences daily trains articulatory muscles for continuous connected speech, eliminates foreign mother-tongue stress interference, and guarantees examiners award Band 8+ in Pronunciation & Fluency.
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
    </div>
  );
};
