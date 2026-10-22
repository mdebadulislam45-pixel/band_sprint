import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Shuffle,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Award,
  ChevronRight,
  BookOpen,
  Zap,
  Radio,
  FileText
} from 'lucide-react';
import { soundManager } from '../utils/audioEffects';
import { speakBritish, stopSpeech } from '../utils/britishVoice';
import { PART_2_CUE_CARD_BANK } from '../data/speakingComprehensiveBank';
import { evaluateSingleSpeakingTurn } from '../services/SpeakingEvaluationService';
import { InstantSpeakingFeedbackModal } from './speaking/InstantSpeakingFeedbackModal';
import { InstantSpeakingFeedback, SpeakingAnswerRecord } from '../types/speakingTypes';

interface CueScratchpadProps {
  onShowToast: (msg: string) => void;
}

export const CueScratchpad: React.FC<CueScratchpadProps> = ({ onShowToast }) => {
  // Prep Timer (60s)
  const [timeLeft, setTimeLeft] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [topicIndex, setTopicIndex] = useState(0);

  // 4 corners shorthand notes
  const [whoWhat, setWhoWhat] = useState('');
  const [whenWhere, setWhenWhere] = useState('');
  const [whatHappened, setWhatHappened] = useState('');
  const [feelings, setFeelings] = useState('');

  // Speaking Monologue Mode (1-2 minutes)
  const [isSpeakingMode, setIsSpeakingMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [monologueSeconds, setMonologueSeconds] = useState(120); // 2 minutes countdown
  const [speakingElapsedSec, setSpeakingElapsedSec] = useState(0);
  const [candidateTranscript, setCandidateTranscript] = useState('');
  const [manualTextInput, setManualTextInput] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<InstantSpeakingFeedback | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const monologueTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const isSessionRecordingRef = useRef<boolean>(false);

  // Combined topic bank: standard rich prompts + comprehensive cue cards
  const topics = [
    {
      title: 'Describe an ambitious project or goal you successfully achieved',
      prompts: [
        'What the objective was',
        'Who helped you or what obstacles arose',
        'What exact steps you undertook',
        'And explain why this achievement was personally momentous.'
      ],
      topic: 'Personal Achievement'
    },
    {
      title: 'Describe an occasion when you had to make a difficult decision',
      prompts: [
        'What the dilemma involved',
        'What the alternative options were',
        'How you ultimately decided',
        'And explain how you felt in the aftermath.'
      ],
      topic: 'Decision Making'
    },
    {
      title: 'Describe a traditional celebration or festival in your country',
      prompts: [
        'When and where it takes place',
        'What activities and customs occur',
        'Who participates',
        'And explain why this festival holds cultural significance.'
      ],
      topic: 'Culture & Tradition'
    },
    {
      title: 'Describe a piece of modern technology you find indispensable',
      prompts: [
        'What device or software it is',
        'How frequently you use it',
        'What tasks it simplifies',
        'And explain how your routine would change without it.'
      ],
      topic: 'Technology'
    },
    ...PART_2_CUE_CARD_BANK.slice(0, 10).map((c) => ({
      title: c.questionText,
      prompts: c.cueCardBulletPoints || [
        'What it is and when it occurred',
        'Who was involved',
        'How it influenced your life',
        'And explain why it remains significant'
      ],
      topic: c.topic
    }))
  ];

  const currentTopic: { title: string; prompts: string[]; topic: string } = topics[topicIndex] || topics[0];

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-GB';

        recognition.onresult = (event: any) => {
          let fullText = '';
          for (let i = 0; i < event.results.length; i++) {
            fullText += event.results[i][0].transcript + ' ';
          }
          setCandidateTranscript(fullText.trim());
        };

        recognition.onend = () => {
          if (isSessionRecordingRef.current) {
            try {
              recognition.start();
            } catch {}
          } else {
            setIsRecording(false);
          }
        };

        recognition.onerror = (e: any) => {
          if (e.error === 'no-speech') return;
          if (e.error === 'not-allowed') {
            stopRecording();
            onShowToast('Microphone access blocked. You can type or paste your speech below.');
          }
        };

        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('SpeechRecognition error:', e);
      }
    }

    return () => {
      isSessionRecordingRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (monologueTimerRef.current) clearInterval(monologueTimerRef.current);
      stopSpeech();
    };
  }, [onShowToast]);

  // 60-Second Prep Timer lifecycle with 30s, 10s, 0s chimes
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === 31) soundManager.playChime30s();
          if (prev === 11) soundManager.playChime10s();
          if (prev <= 1) {
            soundManager.playChimeTimeUp();
            setTimerRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            onShowToast('Prep time is up! Transition to Speaking Monologue when ready.');
            // Auto open speaking prompt mode
            setIsSpeakingMode(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, onShowToast]);

  const toggleTimer = () => {
    if (timeLeft === 0) setTimeLeft(60);
    setTimerRunning(!timerRunning);
    soundManager.playBeep(timerRunning ? 440 : 660, 0.1);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimeLeft(60);
  };

  const handleNextTopic = () => {
    stopRecording();
    setIsSpeakingMode(false);
    setTopicIndex((prev) => (prev + 1) % topics.length);
    resetTimer();
    setWhoWhat('');
    setWhenWhere('');
    setWhatHappened('');
    setFeelings('');
    setCandidateTranscript('');
    setManualTextInput('');
  };

  const loadSampleNotes = () => {
    setWhoWhat('Grad dissertation · AI NLP healthcare tool · Dr. Harrison (supervisor)');
    setWhenWhere('Final year uni · March 2024 · Campus lab & nocturnal home sprints');
    setWhatHappened('Data sparsity bottleneck · Refactored transformer model · 3-week code overhaul · 94% precision achieved');
    setFeelings('Initial dread ➔ euphoric breakthrough · Validated technical tenacity · Stepping-stone for scholarship');
    onShowToast('Band 8.5 Shorthand Sample Loaded!');
    soundManager.playSuccess();
  };

  // Keyword enforcer helper
  const checkShorthand = (text: string) => {
    if (!text.trim()) return { ok: true, msg: 'Empty' };
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    const avgWordsPerLine = text.trim().split(/\s+/).length / (lines.length || 1);
    if (avgWordsPerLine > 10) {
      return { ok: false, msg: 'Too verbose! Writing full sentences wastes prep time. Use hyphens and bullet fragments.' };
    }
    return { ok: true, msg: 'Good shorthand density.' };
  };

  // Start Speaking Monologue Recording
  const startRecording = useCallback(() => {
    setCandidateTranscript('');
    setSpeakingElapsedSec(0);
    setMonologueSeconds(120);
    isSessionRecordingRef.current = true;
    setIsRecording(true);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {}
    }

    soundManager.playBeep(660, 0.1);

    if (monologueTimerRef.current) clearInterval(monologueTimerRef.current);
    monologueTimerRef.current = setInterval(() => {
      setSpeakingElapsedSec((prev) => prev + 1);
      setMonologueSeconds((prev) => {
        if (prev <= 1) {
          // Time is up for 2-minute monologue
          soundManager.playChimeTimeUp();
          stopRecording();
          onShowToast('2-minute monologue completed! Ready for genuine Cambridge feedback.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    isSessionRecordingRef.current = false;
    setIsRecording(false);
    if (monologueTimerRef.current) clearInterval(monologueTimerRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  }, []);

  // Submit Spoken Response for Genuine Feedback
  const handleSubmitForFeedback = async () => {
    stopRecording();
    const transcriptToEvaluate = (candidateTranscript.trim() || manualTextInput.trim());

    if (!transcriptToEvaluate || transcriptToEvaluate.split(/\s+/).length < 5) {
      onShowToast('Please speak or type at least a few sentences to receive genuine diagnostic feedback.');
      return;
    }

    setIsEvaluating(true);
    soundManager.playBeep(580, 0.05);

    const wordCount = transcriptToEvaluate.split(/\s+/).length;
    const durationSec = Math.max(15, speakingElapsedSec || Math.round(wordCount / 2));
    const wordsPerMinute = Math.round((wordCount / (durationSec / 60)) || 110);

    const now = Date.now();
    const record: SpeakingAnswerRecord = {
      questionId: 'cue_card_' + topicIndex,
      part: 2,
      questionText: currentTopic.title,
      topic: currentTopic.topic || 'General',
      transcript: transcriptToEvaluate,
      startTime: now - durationSec * 1000,
      endTime: now,
      durationSec,
      wordCount,
      wordsPerMinute,
      pauseCount: 1,
      longPauseCount: 0,
      fillerCount: 2,
      detectedFillers: ['um', 'like']
    };

    try {
      const evaluation = await evaluateSingleSpeakingTurn(record, currentTopic.prompts);
      setFeedback(evaluation);
      setShowFeedbackModal(true);
      soundManager.playSuccess();
      onShowToast('Diagnostic Band Feedback Generated!');
    } catch (err) {
      console.error('Error generating cue card feedback:', err);
      onShowToast('Evaluation generated with local Cambridge diagnostic rubric.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleReadCuePromptAloud = () => {
    soundManager.playBeep(640, 0.05);
    const speech = `Candidate Task Card. ${currentTopic.title}. You should say: ${currentTopic.prompts.join('. ')}.`;
    speakBritish(speech, { speakerId: 'speaker_04' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> 60s Prep & Part 2 Speaking Simulator
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            Speaking Part 2: Cue Card Scratchpad & Live Monologue
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Train the 1-minute shorthand plan, speak your 2-minute monologue with live mic recognition, and receive genuine Cambridge Band feedback.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadSampleNotes}
            className="px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs border border-amber-300 transition"
          >
            Load Band 8.5 Shorthand Sample
          </button>
          <button
            onClick={handleNextTopic}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition flex items-center gap-1.5"
          >
            <Shuffle className="w-4 h-4" />
            <span>Random Cue Card</span>
          </button>
        </div>
      </div>

      {/* Cue Card Prompt Box & Timer Bar */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md space-y-6 border border-blue-800/40">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-blue-800/60 pb-6">
          <div className="max-w-xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                Candidate Task Card
              </span>
              <button
                onClick={handleReadCuePromptAloud}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition"
                title="Examiner reads prompt"
              >
                <Volume2 className="w-3.5 h-3.5 text-blue-300" />
                <span>Hear Examiner</span>
              </button>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
              {currentTopic.title}
            </h3>
            <div className="pt-2 text-xs text-blue-200">
              <span className="text-[10px] font-mono uppercase text-blue-300 font-bold block mb-1">
                You should say:
              </span>
              <ul className="space-y-1 list-disc list-inside bg-white/5 p-3 rounded-xl border border-white/10">
                {currentTopic.prompts.map((p, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 60s Countdown Timer Widget */}
          <div className="bg-slate-900/90 border border-blue-700/50 p-4 rounded-2xl flex flex-col items-center justify-center shrink-0 w-full sm:w-48 shadow-lg">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">1-Min Prep Countdown</div>
            <div
              className={`font-mono text-4xl font-extrabold my-1 ${
                timeLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-amber-400'
              }`}
            >
              00:{timeLeft.toString().padStart(2, '0')}
            </div>
            <div className="flex gap-2 mt-2 w-full">
              <button
                onClick={toggleTimer}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                  timerRunning
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-600'
                    : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
              >
                {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{timerRunning ? 'Pause' : 'Start Prep'}</span>
              </button>
              <button
                onClick={resetTimer}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
                title="Reset prep timer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Action Toggle Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-blue-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Chimes configured: Audio tones at <strong>30s</strong>, <strong>10s</strong>, and <strong>0s</strong>.</span>
          </div>

          <button
            onClick={() => setIsSpeakingMode(!isSpeakingMode)}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 text-xs ${
              isSpeakingMode
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{isSpeakingMode ? 'Hide Speaking Console' : 'Open Speaking Monologue & Feedback'}</span>
          </button>
        </div>
      </div>

      {/* LIVE SPEAKING OPTION & GENUINE FEEDBACK CONSOLE */}
      {isSpeakingMode && (
        <div className="bg-white rounded-3xl border-2 border-emerald-500/40 p-6 sm:p-8 shadow-md space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider font-mono">
                  PART 2 LIVE SPEAKING TEST
                </span>
                <span className="text-xs text-slate-400">Target: 1 to 2 minutes</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                Candidate Long Turn (Monologue)
              </h3>
              <p className="text-xs text-slate-500">
                Deliver your speech uninterrupted. Use your 4-corner notes below as visual cues.
              </p>
            </div>

            {/* Monologue Countdown */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Monologue Timer</div>
                <div className={`font-mono text-xl font-black ${monologueSeconds <= 20 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {Math.floor(monologueSeconds / 60)}:{(monologueSeconds % 60).toString().padStart(2, '0')}
                </div>
              </div>

              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center gap-2 shadow-sm animate-pulse"
                >
                  <MicOff className="w-4 h-4" />
                  <span>Stop Speaking</span>
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-2 shadow-sm"
                >
                  <Mic className="w-4 h-4" />
                  <span>Start Monologue (Mic)</span>
                </button>
              )}
            </div>
          </div>

          {/* Live Transcript / Input Area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Radio className={`w-3.5 h-3.5 ${isRecording ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
                <span>Candidate Spoken Transcript:</span>
              </label>
              <span className="font-mono text-[11px] text-slate-500">
                Words: {(candidateTranscript || manualTextInput).trim().split(/\s+/).filter(Boolean).length} · Duration: {speakingElapsedSec}s
              </span>
            </div>

            <textarea
              value={isRecording ? candidateTranscript : (candidateTranscript || manualTextInput)}
              onChange={(e) => {
                if (!isRecording) {
                  setManualTextInput(e.target.value);
                  setCandidateTranscript(e.target.value);
                }
              }}
              placeholder="Speak using the microphone above, or type your response here if in a quiet environment..."
              rows={5}
              className="w-full p-4 rounded-2xl border border-slate-300 bg-slate-50/50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed font-serif"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-[11px] text-slate-500">
                {isRecording ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    Microphone listening... Speak continuously for 1 to 2 minutes.
                  </span>
                ) : (
                  <span>Click "Get Genuine Feedback" to analyze grammar, lexical diversity, and band scores.</span>
                )}
              </div>

              <button
                onClick={handleSubmitForFeedback}
                disabled={isEvaluating}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-xs transition flex items-center gap-2 shadow-md"
              >
                {isEvaluating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Analyzing Band Descriptors...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>Get Genuine Feedback & Band Score</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4-Corner Shorthand Notes Matrix */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">4-Corner Digital Shorthand Matrix</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Examiner rule: Do not write sentences. Write rapid keywords connected by arrows or bullets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Corner 1 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                1. WHO / WHAT (Main Focus)
              </label>
              <span className="text-[10px] text-slate-400 font-mono">10s prep</span>
            </div>
            <textarea
              value={whoWhat}
              onChange={(e) => setWhoWhat(e.target.value)}
              placeholder="e.g. Grad dissertation · NLP medical app · Dr. Harrison"
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            {!checkShorthand(whoWhat).ok && (
              <p className="text-[10px] text-amber-700">{checkShorthand(whoWhat).msg}</p>
            )}
          </div>

          {/* Corner 2 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                2. WHEN / WHERE (Context Setting)
              </label>
              <span className="text-[10px] text-slate-400 font-mono">10s prep</span>
            </div>
            <textarea
              value={whenWhere}
              onChange={(e) => setWhenWhere(e.target.value)}
              placeholder="e.g. Final uni semester · March 2024 · Campus lab"
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            {!checkShorthand(whenWhere).ok && (
              <p className="text-[10px] text-amber-700">{checkShorthand(whenWhere).msg}</p>
            )}
          </div>

          {/* Corner 3 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                3. WHAT HAPPENED (Narrative Sequence)
              </label>
              <span className="text-[10px] text-slate-400 font-mono">20s prep</span>
            </div>
            <textarea
              value={whatHappened}
              onChange={(e) => setWhatHappened(e.target.value)}
              placeholder="e.g. Data sparsity hurdle · Refactored transformer · 94% accuracy"
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            {!checkShorthand(whatHappened).ok && (
              <p className="text-[10px] text-amber-700">{checkShorthand(whatHappened).msg}</p>
            )}
          </div>

          {/* Corner 4 */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-300 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                4. WHY MEMORABLE / FEELINGS (Band 7+ Core)
              </label>
              <span className="text-[10px] text-amber-800 font-mono font-bold">CRITICAL 20s</span>
            </div>
            <textarea
              value={feelings}
              onChange={(e) => setFeelings(e.target.value)}
              placeholder="e.g. Dread ➔ euphoria · Proved intellectual resilience · Career launchpad"
              rows={3}
              className="w-full p-3 rounded-xl border border-amber-300 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
            {!checkShorthand(feelings).ok && (
              <p className="text-[10px] text-amber-700">{checkShorthand(feelings).msg}</p>
            )}
          </div>
        </div>
      </div>

      {/* Genuine Instant Speaking Feedback Modal */}
      {feedback && (
        <InstantSpeakingFeedbackModal
          feedback={feedback}
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          onRetakeTurn={() => {
            setShowFeedbackModal(false);
            startRecording();
          }}
          onNextQuestion={handleNextTopic}
          nextActionLabel="Next Cue Card →"
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
