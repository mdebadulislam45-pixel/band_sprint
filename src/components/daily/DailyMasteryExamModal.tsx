import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  X,
  XCircle,
  ArrowRight,
  BookOpen,
  Volume2
} from 'lucide-react';
import {
  DailyMasteryExamQuestion,
  MasteryExamSectionId
} from '../../data/dailyBanglaSprintData';
import { audioManager } from '../../services/AudioManager';
import { triggerBarnabyCelebration } from '../../utils/barnabyStateEngine';
import { recordDailyChallengeComplete } from '../../services/streakService';
import {
  getTodayDateKey,
  loadDailySprintProgress,
  recordMasteryExamOutcome
} from '../../utils/dailySprintProgressStore';
import {
  buildSmartMasteryExamQuestions,
  getRotatedDailySprintPools
} from '../../utils/smartSprintEngine';
import { speakBanglaCue } from '../../utils/banglaSpeech';
import { recordSM2Review } from '../../utils/vaultStorage';

export interface DailyMasteryExamSummary {
  completedAt: string;
  totalCorrect: number;
  totalQuestions: number;
  scorePct: number;
  estimatedBand: number;
  sectionScores: Record<
    MasteryExamSectionId,
    { label: string; correct: number; total: number; pct: number }
  >;
}

const MASTERY_EXAM_STORAGE_KEY = 'bandsprint_daily_mastery_exam_v1';

export function loadTodayMasteryExamSummary(): DailyMasteryExamSummary | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(MASTERY_EXAM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyMasteryExamSummary & { dateKey?: string };
      const todayKey = getTodayDateKey();
      if (!parsed.dateKey || parsed.dateKey === todayKey) {
        return parsed;
      }
    }
    const cloudSummary = loadDailySprintProgress().lastExamSummary;
    if (cloudSummary && cloudSummary.dateKey === getTodayDateKey()) {
      return {
        completedAt: cloudSummary.completedAt,
        totalCorrect: cloudSummary.totalCorrect,
        totalQuestions: cloudSummary.totalQuestions,
        scorePct: cloudSummary.scorePct,
        estimatedBand: cloudSummary.estimatedBand,
        sectionScores: {
          vocabulary: { label: 'Vocabulary & Synonyms', correct: 0, total: 4, pct: cloudSummary.scorePct },
          idioms_phrases: { label: 'Idioms & Collocations', correct: 0, total: 4, pct: cloudSummary.scorePct },
          spelling: { label: 'IELTS Spelling Accuracy', correct: 0, total: 4, pct: cloudSummary.scorePct },
          grammar: { label: 'IELTS Grammar Mastery', correct: 0, total: 4, pct: cloudSummary.scorePct }
        }
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveTodayMasteryExamSummary(summary: DailyMasteryExamSummary): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const todayKey = new Date().toISOString().slice(0, 10);
    localStorage.setItem(
      MASTERY_EXAM_STORAGE_KEY,
      JSON.stringify({ ...summary, dateKey: todayKey })
    );
  } catch {}
}

interface DailyMasteryExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExamCompleted?: (summary: DailyMasteryExamSummary) => void;
  onShowToast?: (msg: string) => void;
  cycleOffset?: number;
}

const EXAM_DURATION_SECONDS = 12 * 60; // 12 minutes timed sitting

const SECTION_META: Record<MasteryExamSectionId, { label: string; banglaLabel: string }> = {
  vocabulary: { label: 'Vocabulary & Synonyms', banglaLabel: 'ভোকাবুলারি ও প্রতিশব্দ' },
  idioms_phrases: { label: 'Idioms & Collocations', banglaLabel: 'ইডিয়ম ও ফ্রেজ' },
  spelling: { label: 'IELTS Spelling Accuracy', banglaLabel: 'বানান শুদ্ধতা (৩০–৫০ শব্দ)' },
  grammar: { label: 'IELTS Grammar Mastery', banglaLabel: 'গ্রামার ও বাক্য গঠন' }
};

export const DailyMasteryExamModal: React.FC<DailyMasteryExamModalProps> = ({
  isOpen,
  onClose,
  onExamCompleted,
  onShowToast,
  cycleOffset = 0
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(EXAM_DURATION_SECONDS);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showAllReview, setShowAllReview] = useState(false);
  const [questions, setQuestions] = useState<DailyMasteryExamQuestion[]>(() => {
    const progress = loadDailySprintProgress();
    const pools = getRotatedDailySprintPools(progress.quotaTier, getTodayDateKey(), cycleOffset);
    return buildSmartMasteryExamQuestions(pools, progress);
  });

  useEffect(() => {
    if (!isOpen) return;
    const progress = loadDailySprintProgress();
    const pools = getRotatedDailySprintPools(progress.quotaTier, getTodayDateKey(), cycleOffset);
    setQuestions(buildSmartMasteryExamQuestions(pools, progress));
    setCurrentIdx(0);
    setAnswers({});
    setSecondsLeft(EXAM_DURATION_SECONDS);
    setIsSubmitted(false);
    setShowAllReview(false);
  }, [isOpen, cycleOffset]);

  useEffect(() => {
    if (!isOpen || isSubmitted) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen, isSubmitted]);

  const activeQuestion: DailyMasteryExamQuestion = questions[currentIdx] || questions[0];

  const summary = useMemo<DailyMasteryExamSummary>(() => {
    const sectionScores: DailyMasteryExamSummary['sectionScores'] = {
      vocabulary: { label: SECTION_META.vocabulary.label, correct: 0, total: 0, pct: 0 },
      idioms_phrases: { label: SECTION_META.idioms_phrases.label, correct: 0, total: 0, pct: 0 },
      spelling: { label: SECTION_META.spelling.label, correct: 0, total: 0, pct: 0 },
      grammar: { label: SECTION_META.grammar.label, correct: 0, total: 0, pct: 0 }
    };

    let totalCorrect = 0;
    for (const q of questions) {
      const sec = sectionScores[q.section];
      sec.total += 1;
      if (answers[q.id] === q.correctIndex) {
        sec.correct += 1;
        totalCorrect += 1;
      }
    }

    (Object.keys(sectionScores) as MasteryExamSectionId[]).forEach((key) => {
      const s = sectionScores[key];
      s.pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    });

    const scorePct = Math.round((totalCorrect / questions.length) * 100);
    const estimatedBand =
      scorePct >= 92
        ? 8.5
        : scorePct >= 80
        ? 8.0
        : scorePct >= 68
        ? 7.5
        : scorePct >= 55
        ? 7.0
        : 6.5;

    return {
      completedAt: new Date().toISOString(),
      totalCorrect,
      totalQuestions: questions.length,
      scorePct,
      estimatedBand,
      sectionScores
    };
  }, [answers, questions]);

  const handleSubmitExam = () => {
    if (isSubmitted) return;
    setIsSubmitted(true);
    saveTodayMasteryExamSummary(summary);
    audioManager.playPomodoroComplete();

    const missedIds = questions
      .filter((q) => answers[q.id] !== q.correctIndex)
      .map((q) => q.id);
    const correctIds = questions
      .filter((q) => answers[q.id] === q.correctIndex)
      .map((q) => q.id);

    recordMasteryExamOutcome(missedIds, correctIds, {
      dateKey: getTodayDateKey(),
      completedAt: summary.completedAt,
      totalCorrect: summary.totalCorrect,
      totalQuestions: summary.totalQuestions,
      scorePct: summary.scorePct,
      estimatedBand: summary.estimatedBand
    });

    // Keep Mistake Vault SM-2 intervals synced bidirectionally
    for (const qId of missedIds) {
      if (qId.startsWith('vault_')) {
        recordSM2Review(qId.slice(6), 1);
      }
    }
    for (const qId of correctIds) {
      if (qId.startsWith('vault_')) {
        recordSM2Review(qId.slice(6), 4);
      }
    }

    try {
      recordDailyChallengeComplete();
      triggerBarnabyCelebration('daily_mastery_exam');
      window.dispatchEvent(
        new CustomEvent('bandsprint_mastery_exam_completed', {
          detail: {
            scorePct: summary.scorePct,
            bandEst: summary.estimatedBand,
            missedCount: missedIds.length
          }
        })
      );
      window.dispatchEvent(new CustomEvent('bandsprint_streak_updated'));
      window.dispatchEvent(new CustomEvent('bandsprint_tasks_updated'));
    } catch {}

    onExamCompleted?.(summary);
    onShowToast?.(
      missedIds.length > 0
        ? `Daily Mastery Exam: ${summary.totalCorrect}/${summary.totalQuestions} (${summary.scorePct}%). ${missedIds.length} missed items added to your Spaced-Repetition Queue!`
        : `Daily Mastery Exam completed: ${summary.totalCorrect}/${summary.totalQuestions} (100%) · Band ${summary.estimatedBand.toFixed(1)} mastery!`
    );
  };

  useEffect(() => {
    if (isOpen && !isSubmitted && secondsLeft === 0) {
      handleSubmitExam();
    }
  });

  if (!isOpen) return null;

  const formatClock = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const missedQuestions = questions.filter((q) => answers[q.id] !== q.correctIndex);
  const reviewItems = showAllReview || missedQuestions.length === 0 ? questions : missedQuestions;

  return (
    <div
      data-testid="daily-mastery-exam-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Post-Sprint Daily Mastery Exam"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#0E1F1E]/75 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/40 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Modal Header */}
        <header className="px-5 py-4 bg-[#0F4C45] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-[#F4A62A]/45 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-[#F4A62A]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base sm:text-lg font-bold tracking-tight truncate">
                  Post-Sprint Daily Mastery Exam
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-[#F4A62A]/20 text-[#FDE68A] text-[11px] font-semibold">
                  বাংলা অর্থসহ
                </span>
              </div>
              <p className="text-xs text-[#EEF3F1]/80 truncate">
                Vocabulary · Idioms & Phrases · 30–50 Word Spelling · IELTS Grammar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {!isSubmitted && (
              <div
                data-testid="mastery-exam-timer"
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 border ${
                  secondsLeft < 90
                    ? 'bg-red-500/20 border-red-300 text-red-100'
                    : 'bg-[#0B3833] border-white/15 text-[#FDE68A]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatClock(secondsLeft)}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Daily Mastery Exam"
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Exam Body or Score Summary */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {!isSubmitted ? (
            <>
              {/* Question Progress Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EEF3F1] dark:border-[#1F8A70]/25">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#0F4C45]/10 dark:bg-[#1F8A70]/20 text-[#0F4C45] dark:text-[#6EE7B7] text-xs font-bold">
                    {activeQuestion.sectionLabel}
                  </span>
                  <span className="text-xs text-[#566664] dark:text-slate-400">
                    ({SECTION_META[activeQuestion.section].banglaLabel})
                  </span>
                </div>
                <div className="text-xs font-mono font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                  Question {currentIdx + 1} of {questions.length} · {answeredCount}/{questions.length} answered
                </div>
              </div>

              {/* Quick Question Number Selector */}
              <div className="flex flex-wrap gap-1.5">
                {questions.map((q, idx) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isCurrent = idx === currentIdx;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIdx(idx)}
                      className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                        isCurrent
                          ? 'bg-[#0F4C45] text-white ring-2 ring-[#F4A62A]'
                          : isAnswered
                          ? 'bg-[#1F8A70]/20 text-[#0F4C45] dark:text-[#6EE7B7] border border-[#1F8A70]/40'
                          : 'bg-[#EEF3F1] dark:bg-[#0B1514] text-[#566664] dark:text-slate-400 hover:bg-[#D3DDDA]'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Active Question Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-4">
                <h3 className="text-sm sm:text-base font-semibold text-[#0E1F1E] dark:text-[#EEF3F1] leading-relaxed">
                  {activeQuestion.prompt}
                </h3>

                <div className="space-y-2.5">
                  {activeQuestion.options.map((opt, optIdx) => {
                    const isSelected = answers[activeQuestion.id] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        data-testid={`mastery-exam-option-${optIdx}`}
                        onClick={() => {
                          audioManager.playUiClick('soft');
                          setAnswers((prev) => ({ ...prev, [activeQuestion.id]: optIdx }));
                        }}
                        className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium transition flex items-center gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-[#0F4C45] text-white border-[#0F4C45] dark:bg-[#1F8A70] dark:border-[#1F8A70]'
                            : 'bg-white dark:bg-[#11201E] text-[#0E1F1E] dark:text-[#EEF3F1] border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45]'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-[#EEF3F1] dark:bg-[#0B1514] text-[#0F4C45] dark:text-[#6EE7B7]'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="leading-snug">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  className="px-4 py-2.5 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] text-[#0E1F1E] dark:text-[#EEF3F1] text-xs font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>

                <div className="flex items-center gap-2.5">
                  {currentIdx < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                      className="px-5 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Next Question</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : null}

                  <button
                    type="button"
                    data-testid="submit-daily-mastery-exam"
                    onClick={handleSubmitExam}
                    className="px-5 py-2.5 rounded-xl bg-[#F4A62A] hover:bg-[#d98f1d] text-[#0E1F1E] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Finish & Grade Exam</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Per-Section Score Summary + Bangla & English Review */
            <div data-testid="mastery-exam-results" className="space-y-6">
              {/* Top Score Banner */}
              <div className="p-5 rounded-2xl bg-[#0F4C45] text-white border border-[#1F8A70]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FDE68A]">
                    <Sparkles className="w-4 h-4" />
                    <span>Daily Mastery Exam Completed · সাবাশ!</span>
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold">
                    Score: {summary.totalCorrect} / {summary.totalQuestions} ({summary.scorePct}%)
                  </h3>
                  <p className="text-xs text-[#EEF3F1]/85">
                    Today’s Sprint Readiness Estimate:{' '}
                    <strong className="text-[#FDE68A]">Band {summary.estimatedBand.toFixed(1)}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setAnswers({});
                      setCurrentIdx(0);
                      setSecondsLeft(EXAM_DURATION_SECONDS);
                      setIsSubmitted(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retake Exam</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-[#F4A62A] hover:bg-[#d98f1d] text-[#0E1F1E] text-xs font-bold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>

              {/* 4-Section Score Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.keys(summary.sectionScores) as MasteryExamSectionId[]).map((secKey) => {
                  const sec = summary.sectionScores[secKey];
                  return (
                    <div
                      key={secKey}
                      className="p-3.5 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-1"
                    >
                      <div className="text-[11px] font-semibold text-[#566664] dark:text-slate-400 truncate">
                        {sec.label}
                      </div>
                      <div className="text-lg font-mono font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
                        {sec.correct}/{sec.total}{' '}
                        <span className="text-xs font-normal">({sec.pct}%)</span>
                      </div>
                      <div className="text-[11px] text-[#566664] dark:text-slate-400">
                        {SECTION_META[secKey].banglaLabel}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Missed Items & Full Bilingual Explanation List */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-display text-sm sm:text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1] flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#0F4C45] dark:text-[#6EE7B7]" />
                    <span>
                      {missedQuestions.length > 0 && !showAllReview
                        ? `Missed Items Review (${missedQuestions.length}) — ইংরেজি ও বাংলা ব্যাখ্যা`
                        : `Complete Exam Review (${questions.length}) — ইংরেজি ও বাংলা ব্যাখ্যা`}
                    </span>
                  </h4>
                  {missedQuestions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllReview((v) => !v)}
                      className="text-xs font-semibold text-[#0F4C45] dark:text-[#6EE7B7] underline cursor-pointer"
                    >
                      {showAllReview ? 'Show Missed Items Only' : 'Show All 16 Questions'}
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {reviewItems.map((q) => {
                    const userChoice = answers[q.id];
                    const isCorrect = userChoice === q.correctIndex;
                    return (
                      <div
                        key={q.id}
                        className={`p-4 rounded-xl border space-y-2 ${
                          isCorrect
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-600/25'
                            : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-500/35'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            )}
                            <span className="text-xs font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
                              {q.targetTerm}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-[#0F4C45]/10 dark:bg-[#1F8A70]/25 text-[#0E1F1E] dark:text-[#EEF3F1] text-xs font-semibold">
                              বাংলা অর্থ: {q.banglaMeaning}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-[#566664] dark:text-slate-400 shrink-0">
                            {q.sectionLabel}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm font-medium text-[#0E1F1E] dark:text-[#EEF3F1]">
                          {q.prompt}
                        </p>

                        <div className="text-xs space-y-1 pt-1">
                          {!isCorrect && (
                            <div className="text-red-700 dark:text-red-300">
                              <strong>Your answer:</strong>{' '}
                              {userChoice !== undefined ? q.options[userChoice] : 'Unanswered'}
                            </div>
                          )}
                          <div className="text-emerald-800 dark:text-emerald-300">
                            <strong>Correct Band 8+ Answer:</strong> {q.options[q.correctIndex]}
                          </div>
                          <div className="text-[#384543] dark:text-slate-300 pt-0.5">
                            <strong>English Explanation:</strong> {q.explanationEnglish}
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                            <div className="text-[#0F4C45] dark:text-[#6EE7B7] font-medium">
                              <strong>বাংলা ব্যাখ্যা:</strong> {q.explanationBangla}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                audioManager.playUiClick('soft');
                                speakBanglaCue(q.explanationBangla, q.explanationEnglish);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#0F4C45]/10 hover:bg-[#0F4C45]/20 dark:bg-[#1F8A70]/25 text-[#0F4C45] dark:text-[#6EE7B7] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Volume2 className="w-3 h-3" />
                              <span>বাংলা অডিও</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
