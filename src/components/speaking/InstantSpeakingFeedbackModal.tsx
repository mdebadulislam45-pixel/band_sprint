import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Save,
  Award,
  X,
  Check,
  Headphones,
  Zap,
  Activity,
  BookmarkPlus
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend
} from 'recharts';
import { InstantSpeakingFeedback, DetailedGrammarError } from '../../types/speakingTypes';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';
import { addMistake } from '../../utils/vaultStorage';

interface InstantSpeakingFeedbackModalProps {
  feedback: InstantSpeakingFeedback;
  isOpen: boolean;
  onClose: () => void;
  onNextQuestion?: () => void;
  onRetakeTurn?: () => void;
  nextActionLabel?: string;
  isFinalTurn?: boolean;
  onShowToast: (msg: string) => void;
}

export const InstantSpeakingFeedbackModal: React.FC<InstantSpeakingFeedbackModalProps> = ({
  feedback,
  isOpen,
  onClose,
  onNextQuestion,
  onRetakeTurn,
  nextActionLabel = 'Next Question →',
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'radar' | 'model' | 'errors' | 'pronunciation'>('radar');
  const [isPlayingModelAudio, setIsPlayingModelAudio] = useState(false);
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [savedErrors, setSavedErrors] = useState<Record<string, boolean>>({});
  const [savedCollocations, setSavedCollocations] = useState<Record<string, boolean>>({});

  const radarData = useMemo(() => {
    if (!feedback || !feedback.estimatedBands) return [];
    const bands = feedback.estimatedBands;
    const rawFluency = typeof bands.fluency === 'number' ? bands.fluency : null;
    const rawLexical = typeof bands.lexical === 'number' ? bands.lexical : null;
    const rawGrammar = typeof bands.grammar === 'number' ? bands.grammar : null;
    const rawPronunciation =
      typeof bands.pronunciation === 'number' && bands.pronunciation > 0 ? bands.pronunciation : null;

    if (rawFluency === null || rawLexical === null || rawGrammar === null) {
      return [];
    }

    const wpm = feedback.wordsPerMinute || 0;
    const pacingScore =
      wpm >= 110 && wpm <= 165
        ? rawFluency
        : wpm > 0
        ? Math.max(1.0, Number((rawFluency - 0.5).toFixed(1)))
        : rawFluency;

    const axes = [
      {
        subject: 'Fluency & Flow',
        candidate: Number(rawFluency.toFixed(1)),
        benchmark: 8.0,
        fullMark: 9.0
      },
      {
        subject: 'Coherence',
        candidate: Number(rawFluency.toFixed(1)),
        benchmark: 8.0,
        fullMark: 9.0
      },
      {
        subject: 'Pace & Delivery',
        candidate: Number(pacingScore.toFixed(1)),
        benchmark: 8.0,
        fullMark: 9.0
      },
      {
        subject: 'Lexical Precision',
        candidate: Number(rawLexical.toFixed(1)),
        benchmark: 8.0,
        fullMark: 9.0
      },
      {
        subject: 'Grammar Range',
        candidate: Number(rawGrammar.toFixed(1)),
        benchmark: 8.0,
        fullMark: 9.0
      }
    ];

    if (rawPronunciation !== null) {
      axes.push({
        subject: 'Pronunciation',
        candidate: Number(rawPronunciation.toFixed(1)),
        benchmark: 8.0,
        fullMark: 9.0
      });
    }

    return axes;
  }, [feedback]);

  if (!isOpen || !feedback) return null;

  const handlePlayModelAnswer = () => {
    if (isPlayingModelAudio) {
      stopSpeech();
      setIsPlayingModelAudio(false);
      return;
    }

    soundManager.playBeep(640, 0.05);
    setIsPlayingModelAudio(true);

    const textToRead = feedback.band8Answer.modelAnswer;
    speakBritish(textToRead, {
      speakerId: 'speaker_04',
      rate: 0.96,
      onEnd: () => setIsPlayingModelAudio(false),
      onError: () => setIsPlayingModelAudio(false)
    });
  };

  const handlePlayWordPronunciation = (word: string) => {
    soundManager.playBeep(700, 0.05);
    setPlayingWord(word);
    speakBritish(word, {
      speakerId: 'speaker_04',
      rate: 0.85,
      onEnd: () => setPlayingWord(null),
      onError: () => setPlayingWord(null)
    });
  };

  const handleSaveGrammarError = (err: DetailedGrammarError, idx: number) => {
    const key = `err_${idx}_${err.observed}`;
    if (savedErrors[key]) return;

    addMistake({
      module: 'speaking',
      title: `Speaking Grammar: ${err.ruleCategory}`,
      prompt: feedback.questionText,
      questionType: `Part ${feedback.part} · ${err.ruleCategory}`,
      userAnswer: err.observed,
      correctAnswer: err.corrected,
      explanation: err.explanation,
      sourceContext: `Speaking Lab · Part ${feedback.part} (${feedback.topic})`
    });

    setSavedErrors((prev) => ({ ...prev, [key]: true }));
    soundManager.playSuccess();
    onShowToast('Saved grammar rule to SuperMemo SM-2 Mistake Vault!');
  };

  const handleSaveCollocation = (phrase: string, meaning: string, bandLevel: string, idx: number) => {
    const key = `col_${idx}_${phrase}`;
    if (savedCollocations[key]) return;

    addMistake({
      module: 'speaking',
      title: `Speaking ${bandLevel} Collocation: "${phrase}"`,
      prompt: feedback.questionText,
      questionType: `Part ${feedback.part} Lexical & Coherence Upgrade`,
      userAnswer: feedback.candidateTranscript.slice(0, 90) || 'Basic spoken phrasing',
      correctAnswer: phrase,
      explanation: `${meaning} — Deploy in Part ${feedback.part} discussions on ${feedback.topic}.`,
      sourceContext: `Speaking Band 8+ Coach · ${feedback.topic}`
    });

    setSavedCollocations((prev) => ({ ...prev, [key]: true }));
    soundManager.playSuccess();
    onShowToast(`Saved "${phrase}" to SM-2 Mistake Vault!`);
  };

  const handleModalClose = () => {
    stopSpeech();
    setIsPlayingModelAudio(false);
    onClose();
  };

  const bands = feedback.estimatedBands || {
    fluency: null,
    lexical: null,
    grammar: null,
    pronunciation: null,
    overall: null
  };
  const fmtBand = (val: number | null | undefined): string =>
    typeof val === 'number' && Number.isFinite(val) ? val.toFixed(1) : 'Unassessed';

  const fluencyScore = typeof bands.fluency === 'number' ? bands.fluency : null;
  const lexicalScore = typeof bands.lexical === 'number' ? bands.lexical : null;
  const grammarScore = typeof bands.grammar === 'number' ? bands.grammar : null;
  const pronunciationScore =
    typeof bands.pronunciation === 'number' && bands.pronunciation > 0
      ? bands.pronunciation
      : null;
  const overallScore =
    typeof feedback.overallBand === 'number'
      ? feedback.overallBand
      : typeof bands.overall === 'number' && bands.overall > 0 && pronunciationScore !== null
      ? bands.overall
      : null;
  const partialIndex =
    typeof feedback.partialThreeCriterionIndex === 'number'
      ? feedback.partialThreeCriterionIndex
      : null;
  const isPartialTranscriptOnly =
    overallScore === null &&
    (feedback.assessmentStatus === 'partial_transcript_only' || partialIndex !== null);

  const coherenceAxis = radarData[1]?.candidate ?? fluencyScore;
  const fcDelta =
    fluencyScore !== null && coherenceAxis !== null
      ? Number((fluencyScore - coherenceAxis).toFixed(1))
      : 0;

  const isUnavailable =
    feedback.assessmentStatus === 'unavailable' ||
    (feedback.isValidAttempt === false && feedback.wordCount >= 5 && feedback.assessmentStatus !== 'insufficient_evidence');

  const isValidAttempt =
    feedback.isValidAttempt !== false &&
    feedback.assessmentStatus !== 'unavailable' &&
    feedback.assessmentStatus !== 'insufficient_evidence' &&
    feedback.wordCount >= 5 &&
    fluencyScore !== null &&
    lexicalScore !== null &&
    grammarScore !== null;

  if (!isValidAttempt) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in">
        <div
          className={`bg-white dark:bg-slate-900 rounded-3xl border shadow-2xl w-full max-w-xl overflow-hidden flex flex-col ${
            isUnavailable
              ? 'border-amber-200 dark:border-amber-800/80'
              : 'border-rose-200 dark:border-rose-800/80'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Warning Header */}
          <div
            className={`text-white px-6 py-5 flex items-center justify-between gap-4 ${
              isUnavailable
                ? 'bg-gradient-to-r from-amber-950 via-amber-900 to-slate-900'
                : 'bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${
                  isUnavailable
                    ? 'bg-amber-500/20 border-amber-400/40'
                    : 'bg-rose-500/20 border-rose-400/40'
                }`}
              >
                <AlertTriangle
                  className={`w-6 h-6 ${isUnavailable ? 'text-amber-300' : 'text-rose-300'}`}
                />
              </div>
              <div>
                <span
                  className={`text-[11px] font-mono uppercase tracking-wider font-bold block ${
                    isUnavailable ? 'text-amber-300' : 'text-rose-300'
                  }`}
                >
                  {isUnavailable
                    ? feedback.authRequired
                      ? 'Authentication Required · No Score Generated'
                      : 'Assessment Unavailable · No Score Generated'
                    : 'Unattempted / Insufficient Speech'}
                </span>
                <h2 className="text-lg font-extrabold tracking-tight text-white">
                  {feedback.feedbackTitle ||
                    (isUnavailable
                      ? 'AI Speaking Evaluation Unavailable'
                      : 'No Candidate Speech Detected')}
                </h2>
              </div>
            </div>
            <button
              onClick={handleModalClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
              title="Close Warning"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Warning Body */}
          <div className="p-6 space-y-5">
            <div
              className={`p-4 rounded-2xl border space-y-2.5 ${
                isUnavailable
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/70'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/70'
              }`}
            >
              <div
                className={`flex items-center justify-between text-xs font-mono font-bold ${
                  isUnavailable
                    ? 'text-amber-800 dark:text-amber-300'
                    : 'text-rose-800 dark:text-rose-300'
                }`}
              >
                <span>
                  {isUnavailable
                    ? 'HONEST ASSESSMENT GATE · ZERO FALLBACK SCORES'
                    : 'STRICT INPUT GATE · MINIMUM 5 WORDS REQUIRED'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded ${
                    isUnavailable
                      ? 'bg-amber-200/80 dark:bg-amber-900 text-amber-950 dark:text-amber-100'
                      : 'bg-rose-200/80 dark:bg-rose-900 text-rose-950 dark:text-rose-100'
                  }`}
                >
                  {feedback.wordCount} word{feedback.wordCount === 1 ? '' : 's'} detected
                </span>
              </div>
              <p
                className={`text-sm font-semibold leading-relaxed ${
                  isUnavailable
                    ? 'text-amber-950 dark:text-amber-100'
                    : 'text-rose-950 dark:text-rose-100'
                }`}
              >
                {feedback.feedbackEn ||
                  feedback.error ||
                  'You spoke fewer than 5 words. The examiner cannot assess your English without audible, sustained speech.'}
              </p>
              <p
                className={`text-xs font-medium leading-relaxed pt-1 border-t ${
                  isUnavailable
                    ? 'text-amber-800 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60'
                    : 'text-rose-800 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60'
                }`}
              >
                {feedback.feedbackBn ||
                  (isUnavailable
                    ? 'AI স্পিকিং মূল্যায়ন এই মুহূর্তে উপলব্ধ নয়। কোনো ভুয়া ব্যান্ড স্কোর তৈরি করা হয়নি।'
                    : 'পর্যাপ্ত শব্দ শনাক্ত করা যায়নি (কমপক্ষে ৫টি শব্দ প্রয়োজন)। অনুগ্রহ করে মাইক্রোফোন অন করে স্পষ্টভাবে কথা বলুন।')}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Examiner Question Prompt (Part {feedback.part})
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                &ldquo;{feedback.questionText}&rdquo;
              </p>
              <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                Captured Transcript:{' '}
                <span className="font-mono italic text-slate-700 dark:text-slate-300">
                  {feedback.candidateTranscript
                    ? `"${feedback.candidateTranscript}"`
                    : '(No audible speech captured)'}
                </span>
              </div>
            </div>
          </div>

          {/* Immediate Try Again / Re-record Action */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleModalClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => {
                stopSpeech();
                if (onRetakeTurn) {
                  onRetakeTurn();
                } else {
                  onClose();
                }
              }}
              className={`px-6 py-2.5 rounded-xl text-white text-xs sm:text-sm font-black shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95 ${
                isUnavailable ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isUnavailable ? 'Retry / Re-record' : 'Try Again / Re-record'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 shrink-0 relative">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black uppercase tracking-wide">
                  <Zap className="w-3 h-3 fill-slate-950" />
                  {isPartialTranscriptOnly
                    ? 'PARTIAL TRANSCRIPT DIAGNOSTIC (3/4 CRITERIA)'
                    : 'INSTANT AI FEEDBACK · BAND 8+ COACH'}
                </span>
                <span className="text-xs text-indigo-200 font-mono">
                  Part {feedback.part} · {feedback.topic}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1 leading-snug">
                "{feedback.questionText}"
              </h2>
            </div>

            <button
              onClick={handleModalClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition shrink-0 cursor-pointer"
              title="Close Feedback"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Score Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-4 mt-2 border-t border-white/10 text-center">
            <div className="p-2 rounded-xl bg-white/10 border border-white/10">
              <div className="text-[10px] text-indigo-200 uppercase font-bold">
                {overallScore !== null ? 'Overall Band' : 'Partial Index (3/4)'}
              </div>
              <div className="text-base sm:text-lg font-black text-amber-300 font-mono tabular-nums">
                {overallScore !== null
                  ? overallScore.toFixed(1)
                  : partialIndex !== null
                  ? partialIndex.toFixed(1)
                  : 'Unassessed'}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white/10 border border-white/10">
              <div className="text-[10px] text-indigo-200 uppercase font-bold">Fluency & Coherence</div>
              <div className="text-sm sm:text-base font-bold text-white font-mono tabular-nums">
                {fmtBand(fluencyScore)}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white/10 border border-white/10">
              <div className="text-[10px] text-indigo-200 uppercase font-bold">Lexical Resource</div>
              <div className="text-sm sm:text-base font-bold text-white font-mono tabular-nums">
                {fmtBand(lexicalScore)}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white/10 border border-white/10">
              <div className="text-[10px] text-indigo-200 uppercase font-bold">Grammar Accuracy</div>
              <div className="text-sm sm:text-base font-bold text-white font-mono tabular-nums">
                {fmtBand(grammarScore)}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 p-2 rounded-xl bg-white/10 border border-white/10">
              <div className="text-[10px] text-indigo-200 uppercase font-bold">Pronunciation</div>
              <div className="text-sm sm:text-base font-bold text-emerald-300 font-mono tabular-nums">
                {pronunciationScore !== null ? pronunciationScore.toFixed(1) : 'Unassessed'}
              </div>
            </div>
          </div>

          {isPartialTranscriptOnly && (
            <div className="mt-3 px-3 py-2 rounded-xl bg-amber-400/15 border border-amber-300/30 text-[11px] text-amber-100 leading-snug">
              <strong>Partial Transcript-Only Estimate:</strong> Reflects Fluency &amp; Coherence, Lexical Resource, and Grammar only. Acoustic Pronunciation was not measured — this is not a complete IELTS Speaking band.
            </div>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-3 shrink-0 gap-2 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('radar');
              soundManager.playBeep(600, 0.04);
            }}
            className={`pb-2.5 px-3.5 text-xs font-extrabold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'radar'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
            <span>Fluency vs. Coherence Spider Chart</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('model');
              soundManager.playBeep(600, 0.04);
            }}
            className={`pb-2.5 px-3.5 text-xs font-extrabold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'model'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Better Answer (Band 8.5+)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('errors');
              soundManager.playBeep(600, 0.04);
            }}
            className={`pb-2.5 px-3.5 text-xs font-extrabold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'errors'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>Grammar Corrections</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                feedback.grammaticalErrors.length > 0
                  ? 'bg-rose-100 text-rose-700 font-bold'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {feedback.grammaticalErrors.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('pronunciation');
              soundManager.playBeep(600, 0.04);
            }}
            className={`pb-2.5 px-3.5 text-xs font-extrabold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'pronunciation'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Headphones className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pronunciation & Stress</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Candidate Spoken Transcript Strip */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span>Your Spoken Answer</span>
              <span className="font-mono text-slate-600 tabular-nums">
                {feedback.wordCount} words · {feedback.wordsPerMinute} WPM
              </span>
            </div>
            <p className="font-medium text-slate-900 leading-relaxed italic">
              "{feedback.candidateTranscript}"
            </p>
          </div>

          {/* TAB 0: FLUENCY VS. COHERENCE SPIDER CHART */}
          {activeTab === 'radar' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-7 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                      Fluency vs. Coherence Spider Chart
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Target: Band 8.0
                    </span>
                  </div>
                  <div className="w-full h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: '#1e293b', fontSize: 10, fontWeight: 700 }}
                        />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, 9]}
                          tickCount={5}
                          tick={{ fill: '#64748b', fontSize: 9 }}
                        />
                        <Radar
                          name="Band 8.0 Benchmark"
                          dataKey="benchmark"
                          stroke="#10b981"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          fill="#10b981"
                          fillOpacity={0.12}
                        />
                        <Radar
                          name="Your Turn Score"
                          dataKey="candidate"
                          stroke="#4f46e5"
                          strokeWidth={2.5}
                          fill="#4f46e5"
                          fillOpacity={0.35}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '10px',
                            color: '#f8fafc',
                            fontSize: '11px'
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right 5 Cols: Fluency vs Coherence Diagnostic Breakdown */}
                <div className="md:col-span-5 space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                      Speech Equilibrium Diagnosis
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                      <div className="p-2 rounded-xl bg-white/10">
                        <div className="text-[10px] text-slate-300">Fluency Flow</div>
                        <div className="text-base font-black text-amber-300 tabular-nums">
                          {fmtBand(fluencyScore)}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/10">
                        <div className="text-[10px] text-slate-300">Coherence</div>
                        <div className="text-base font-black text-emerald-300 tabular-nums">
                          {fmtBand(coherenceAxis)}
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed pt-1">
                      {Math.abs(fcDelta) <= 0.4
                        ? 'Your acoustic delivery pace and logical discourse linking are well balanced.'
                        : fcDelta > 0
                        ? 'Your speech rate is faster than your logical structuring. Deploy more C1 discourse markers to boost Coherence.'
                        : 'Your logical organization is strong, but mid-sentence hesitations slightly lowered raw Fluency.'}
                    </p>
                  </div>

                  {/* Actionable Coaching Tips */}
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1.5 text-xs">
                    <div className="font-extrabold text-indigo-950 uppercase text-[11px]">
                      Priority Adjustments for Next Turn:
                    </div>
                    <ul className="space-y-1 text-slate-700 list-disc list-inside text-[11px]">
                      {feedback.actionableTips.slice(0, 3).map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: BETTER ANSWER BAND 8+ */}
          {activeTab === 'model' && (
            <div className="space-y-4 animate-fade-in">
              {/* Model Header & Audio Player */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-blue-50/60 to-purple-50/80 border border-indigo-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-200/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-700 text-white font-mono text-xs font-extrabold">
                      Band {feedback.band8Answer.bandScore.toFixed(1)} Model Response
                    </span>
                    <span className="text-[11px] text-indigo-700 font-bold">
                      🇬🇧 British Received Pronunciation
                    </span>
                  </div>

                  <button
                    onClick={handlePlayModelAnswer}
                    className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer ${
                      isPlayingModelAudio
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {isPlayingModelAudio ? (
                      <>
                        <VolumeX className="w-4 h-4 animate-pulse" />
                        <span>Stop Audio</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span>Listen to Band 8+ Answer</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-xs sm:text-sm text-slate-900 font-serif leading-relaxed space-y-2 select-text">
                  <p className="whitespace-pre-wrap">{feedback.band8Answer.modelAnswer}</p>
                </div>

                {/* Examiner Rationale */}
                <div className="pt-2 border-t border-indigo-200/60 text-xs text-indigo-950 leading-relaxed flex items-start gap-2">
                  <Award className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Examiner Note:</strong> {feedback.band8Answer.examinerRationale}
                  </div>
                </div>
              </div>

              {/* Highlighted C1/C2 Collocations with SM-2 Vault Save */}
              {feedback.band8Answer.highlightedCollocations.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    High-Yield Collocations in Model Answer (Save to SM-2 Vault)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {feedback.band8Answer.highlightedCollocations.map((col, idx) => {
                      const colKey = `col_${idx}_${col.phrase}`;
                      const isColSaved = savedCollocations[colKey];
                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-indigo-950 font-serif">
                                "{col.phrase}"
                              </span>
                              <span className="px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold">
                                {col.bandLevel}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-snug">
                              {col.meaning}
                            </p>
                          </div>

                          <button
                            onClick={() => handleSaveCollocation(col.phrase, col.meaning, col.bandLevel, idx)}
                            disabled={isColSaved}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                              isColSaved
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700'
                            }`}
                          >
                            {isColSaved ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Saved in SM-2 Vault</span>
                              </>
                            ) : (
                              <>
                                <BookmarkPlus className="w-3 h-3" />
                                <span>Save Collocation to Vault</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Key Spoken Discourse Markers */}
              {feedback.band8Answer.keyDiscourseMarkers.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Discourse Anchors:
                  </span>
                  {feedback.band8Answer.keyDiscourseMarkers.map((marker, mIdx) => (
                    <span
                      key={mIdx}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-bold"
                    >
                      {marker}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GRAMMAR ERRORS & CORRECTIONS */}
          {activeTab === 'errors' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Targeted Grammatical Error Corrections
                </h3>
                <span className="text-xs text-slate-500">
                  {feedback.grammaticalErrors.length} observation{feedback.grammaticalErrors.length !== 1 ? 's' : ''}
                </span>
              </div>

              {feedback.grammaticalErrors.length === 0 ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-extrabold text-emerald-900">
                    No Critical Grammatical Errors Detected!
                  </h4>
                  <p className="text-xs text-emerald-700 max-w-md mx-auto">
                    Your response maintained strong grammatical accuracy across simple and compound sentences. Continue incorporating advanced modal structures and inverted conditionals.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feedback.grammaticalErrors.map((err, idx) => {
                    const isSaved = savedErrors[`err_${idx}_${err.observed}`];
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono text-[11px] font-bold">
                            {err.ruleCategory}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              err.severity === 'critical'
                                ? 'bg-rose-100 text-rose-800'
                                : err.severity === 'moderate'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {err.severity} impact
                          </span>
                        </div>

                        {/* Observed vs Corrected comparison */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                            <span className="text-[10px] font-bold uppercase text-rose-700 block mb-0.5">
                              Observed in Candidate Speech:
                            </span>
                            <span className="font-mono text-rose-950 font-bold line-through">
                              "{err.observed}"
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                            <span className="text-[10px] font-bold uppercase text-emerald-700 block mb-0.5">
                              Band 8+ Accurate Correction:
                            </span>
                            <span className="font-mono text-emerald-950 font-bold">
                              "{err.corrected}"
                            </span>
                          </div>
                        </div>

                        {/* Explanation & Save button */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {err.explanation}
                          </p>

                          <button
                            onClick={() => handleSaveGrammarError(err, idx)}
                            disabled={isSaved}
                            className={`min-h-[32px] px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer ${
                              isSaved
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                            <span>{isSaved ? 'Saved to Vault' : 'Save to SM-2 Vault'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRONUNCIATION & PHONETICS */}
          {activeTab === 'pronunciation' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-900 uppercase">
                    Pronunciation Clarity & Cadence
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-950 font-mono text-xs font-bold">
                    {typeof feedback.pronunciation?.clarityBand === 'number'
                      ? `Band ${feedback.pronunciation.clarityBand.toFixed(1)}`
                      : 'Unassessed (Audio Required)'}
                  </span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {feedback.pronunciation?.rhythmVerdict ||
                    'Acoustic pronunciation was not assessed from transcript-only input.'}
                </p>
              </div>

              {/* Tricky Words with Syllable Stress */}
              {feedback.pronunciation.trickyWords.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5 text-emerald-600" />
                    Syllable Stress & Phonetics Coach
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {feedback.pronunciation.trickyWords.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-slate-900">
                              {item.word}
                            </span>
                            <button
                              onClick={() => handlePlayWordPronunciation(item.word)}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                playingWord === item.word
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                              }`}
                              title="Listen to pronunciation"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">
                              {item.ipa}
                            </span>
                            <span className="font-mono text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                              {item.syllableStress}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                            {item.tip}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Connected Speech & Intonation */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Connected Speech & Intonation Guidance
                </h4>

                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0 mt-1.5"></span>
                    <p>
                      <strong>Intonation Pattern:</strong> {feedback.pronunciation.intonationPattern}
                    </p>
                  </div>
                  {feedback.pronunciation.connectedSpeechTips.map((tip, tIdx) => (
                    <div key={tIdx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5"></span>
                      <p>{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onRetakeTurn && (
              <button
                onClick={() => {
                  stopSpeech();
                  onRetakeTurn();
                }}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Practice Turn Again</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleModalClose}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>

            {onNextQuestion && (
              <button
                onClick={() => {
                  stopSpeech();
                  onNextQuestion();
                }}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <span>{nextActionLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
