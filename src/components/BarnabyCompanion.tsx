import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Compass,
  Loader2,
  MessageSquare,
  Send,
  X,
} from 'lucide-react';
import {
  BARNABY_ANALYZING_EVENT,
  BARNABY_POSE_ASSETS,
  BarnabyAnalyzingDetail,
  BarnabyPoseState,
  getBarnabyGuidanceCopy,
  getBarnabyState,
  getGlobalBarnabyAnalyzing,
} from '../utils/getBarnabyState';
import { askBarnabyCompanion } from '../services/geminiService';
import { soundManager } from '../utils/audioEffects';

export interface BarnabyCompanionProps {
  /** Candidate display name */
  userName?: string;
  /** Verified or diagnostic overall band estimate, or null ("Not assessed") */
  currentEstimate: number | null;
  /** Target IELTS band (e.g. 7.5) */
  targetBand: number;
  /** Whole calendar days since last activity */
  daysInactive?: number;
  /** True when all Today's Study Tasks are checked off */
  allDailyTasksCompleted?: boolean;
  /** Logged priority weakness label (e.g. "True/False/Not Given", "Task 2 Coherence") */
  topWeakness?: string | null;
  /** Optional explicit override while Gemini is grading Writing/Speaking/Diagnostic */
  isAnalyzing?: boolean;
  /** Explicit flag to hide during active Listening audio simulations or full Mock Exams */
  isActiveExam?: boolean;
  /** Current router path for exam integrity enforcement */
  currentPath?: string;
  /** Optional navigation handler */
  onNavigate: (path: string) => void;
  /** Optional exam mode for coaching context */
  examMode?: 'Academic' | 'General Training';
}

const TIMED_EXAM_PATHS = new Set([
  '/practice/listening',
  '/practice/reading',
  '/practice/writing',
  '/practice/speaking',
]);

function isGlobalExamRunning(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as unknown as Record<string, unknown>).__BANDSPRINT_ACTIVE_EXAM__);
}

export const BarnabyCompanion: React.FC<BarnabyCompanionProps> = ({
  userName = 'Candidate',
  currentEstimate,
  targetBand,
  daysInactive = 0,
  allDailyTasksCompleted = false,
  topWeakness = null,
  isAnalyzing: propIsAnalyzing = false,
  isActiveExam = false,
  currentPath = '/',
  onNavigate,
  examMode = 'Academic',
}) => {
  const [globalExamActive, setGlobalExamActive] = useState<boolean>(() => isGlobalExamRunning());
  const [analyzingState, setAnalyzingState] = useState<BarnabyAnalyzingDetail>(() =>
    getGlobalBarnabyAnalyzing()
  );
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [coachReply, setCoachReply] = useState<{
    reply: string;
    strategyTip?: string;
    suggestedNextAction?: { label: string; route: string };
  } | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  // Exam Integrity Listener: hide immediately whenever a timed Listening simulation or Full Mock starts
  useEffect(() => {
    const onHide = () => setGlobalExamActive(true);
    const onShow = () => setGlobalExamActive(false);
    window.addEventListener('barnaby-float-hide', onHide);
    window.addEventListener('barnaby-float-show', onShow);
    return () => {
      window.removeEventListener('barnaby-float-hide', onHide);
      window.removeEventListener('barnaby-float-show', onShow);
    };
  }, []);

  // Analyzing State Listener: transition to `analyzing` whenever Gemini grades Writing/Speaking/Diagnostic
  useEffect(() => {
    const onAnalyzing = (e: Event) => {
      const detail = (e as CustomEvent<BarnabyAnalyzingDetail>).detail;
      if (detail) {
        setAnalyzingState({
          isAnalyzing: Boolean(detail.isAnalyzing),
          label: detail.label,
        });
      }
    };
    window.addEventListener(BARNABY_ANALYZING_EVENT, onAnalyzing);
    return () => window.removeEventListener(BARNABY_ANALYZING_EVENT, onAnalyzing);
  }, []);

  const isEffectiveAnalyzing = propIsAnalyzing || analyzingState.isAnalyzing;

  const state: BarnabyPoseState = useMemo(
    () =>
      getBarnabyState({
        isAnalyzing: isEffectiveAnalyzing,
        currentEstimate,
        targetBand,
        daysInactive,
        allDailyTasksCompleted,
        topWeakness,
      }),
    [
      isEffectiveAnalyzing,
      currentEstimate,
      targetBand,
      daysInactive,
      allDailyTasksCompleted,
      topWeakness,
    ]
  );

  const guidance = useMemo(
    () =>
      getBarnabyGuidanceCopy(state, {
        isAnalyzing: isEffectiveAnalyzing,
        currentEstimate,
        targetBand,
        daysInactive,
        allDailyTasksCompleted,
        topWeakness,
        userName,
        analyzingLabel: analyzingState.label,
      }),
    [
      state,
      isEffectiveAnalyzing,
      currentEstimate,
      targetBand,
      daysInactive,
      allDailyTasksCompleted,
      topWeakness,
      userName,
      analyzingState.label,
    ]
  );

  // EXAM INTEGRITY RULE: Completely hide during active timed Listening simulations & full Mock Exams
  const normalizedPath = (currentPath || '/').replace(/\/+$/, '') || '/';
  if (isActiveExam || globalExamActive || TIMED_EXAM_PATHS.has(normalizedPath)) {
    return null;
  }

  const assetSrc = BARNABY_POSE_ASSETS[state];
  const showFallbackAvatar = Boolean(failedImages[state]);

  const handleAskBarnaby = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isAsking) return;

    setIsAsking(true);
    setAskError(null);
    try {
      const res = await askBarnabyCompanion({
        message: trimmed,
        context: {
          module: 'dashboard',
          userName,
          targetBand,
          examMode,
          latestVerifiedOverallBand: currentEstimate,
          weakestSkill: topWeakness || '',
          currentPage: normalizedPath,
        },
      });
      setCoachReply(res);
      setQuestion('');
    } catch (err) {
      setAskError(
        err instanceof Error ? err.message : 'Unable to reach Barnaby right now. Please try again.'
      );
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <section
      data-testid="barnaby-companion-card"
      data-barnaby-state={state}
      aria-label="Barnaby AI Learning Companion"
      className="p-5 rounded-2xl bg-white dark:bg-[#11201E] border border-[#134E41]/15 dark:border-[#1F8A70]/35 space-y-4 transition-colors"
    >
      {/* Header: Barnaby Identity + Focus Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-display text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1] truncate">
            Barnaby
          </span>
          <span className="text-[11px] text-[#566664] dark:text-slate-400 truncate">
            · Study Companion
          </span>
        </div>

        <span
          data-testid="barnaby-focus-badge"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F59E0B]/15 text-[#B45309] dark:text-[#FBBF24] text-[11px] font-semibold whitespace-nowrap shrink-0"
        >
          {state === 'analyzing' && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
          <span>{guidance.focusLabel}</span>
        </span>
      </div>

      {/* Visual Stage + Copy */}
      <div className="flex items-start gap-3.5">
        {/* 1:1 Character Frame or Clean Emerald/Gold Fallback Ring */}
        <div
          className="w-20 h-20 rounded-xl bg-white border border-[#134E41]/15 flex items-center justify-center shrink-0 overflow-hidden"
          aria-hidden="true"
        >
          {!showFallbackAvatar ? (
            <img
              key={state}
              src={assetSrc}
              alt={`Barnaby companion (${state})`}
              referrerPolicy="no-referrer"
              onError={() =>
                setFailedImages((prev) => ({
                  ...prev,
                  [state]: true,
                }))
              }
              className="w-full h-full object-contain p-0.5 select-none"
            />
          ) : (
            <div
              data-testid="barnaby-fallback-avatar"
              className="w-14 h-14 rounded-full border-2 border-[#134E41] ring-2 ring-[#F59E0B]/70 ring-offset-2 ring-offset-white bg-[#134E41]/10 flex items-center justify-center text-[#134E41]"
            >
              <Compass className="w-6 h-6 text-[#F59E0B]" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="font-display text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1] leading-snug">
            {guidance.headline}
          </h2>
          <p className="text-xs text-[#566664] dark:text-slate-300 leading-relaxed">
            {guidance.message}
          </p>
        </div>
      </div>

      {/* Primary Action + Secondary Ask Toggle */}
      <div className="flex items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(560, 0.04);
            onNavigate(guidance.ctaRoute);
          }}
          className="flex-1 min-h-[40px] px-3.5 py-2 rounded-xl bg-[#134E41] hover:bg-[#0D3A30] active:scale-[0.99] text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
        >
          <span className="truncate">{guidance.ctaLabel}</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(520, 0.035);
            setIsCoachOpen((prev) => !prev);
          }}
          aria-expanded={isCoachOpen}
          aria-label="Ask Barnaby a study strategy question"
          className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
            isCoachOpen
              ? 'bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#B45309] dark:text-[#FBBF24]'
              : 'bg-[#F7F9F8] dark:bg-[#0B1514] border-[#134E41]/15 dark:border-[#1F8A70]/30 text-[#134E41] dark:text-[#EEF3F1] hover:border-[#134E41]/40'
          }`}
        >
          {isCoachOpen ? <X className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
          <span>{isCoachOpen ? 'Close' : 'Ask'}</span>
        </button>
      </div>

      {/* Inline Coaching Drawer (Zero Floating Overlap) */}
      {isCoachOpen && (
        <div className="pt-3 border-t border-[#134E41]/10 dark:border-[#1F8A70]/25 space-y-2.5">
          {coachReply && (
            <div className="p-3 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#134E41]/10 dark:border-[#1F8A70]/25 space-y-2 text-xs">
              <p className="text-[#0E1F1E] dark:text-[#EEF3F1] leading-relaxed">
                {coachReply.reply}
              </p>
              {coachReply.strategyTip && (
                <p className="text-[11px] text-[#566664] dark:text-slate-400 leading-relaxed">
                  Strategy note: {coachReply.strategyTip}
                </p>
              )}
              {coachReply.suggestedNextAction?.route && (
                <button
                  type="button"
                  onClick={() => onNavigate(coachReply.suggestedNextAction!.route)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#134E41] dark:text-[#FBBF24] hover:underline cursor-pointer"
                >
                  <span>{coachReply.suggestedNextAction.label}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {askError && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400">{askError}</p>
          )}

          <form onSubmit={handleAskBarnaby} className="flex items-center gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about TFNG traps, Task 2 structure, or pacing..."
              className="flex-1 min-w-0 min-h-[38px] px-3 py-1.5 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#134E41]/15 dark:border-[#1F8A70]/30 text-xs text-[#0E1F1E] dark:text-[#EEF3F1] placeholder:text-[#566664]/70 focus:outline-none focus:border-[#134E41]"
            />
            <button
              type="submit"
              disabled={isAsking || !question.trim()}
              aria-label="Send question to Barnaby"
              className="min-w-[38px] min-h-[38px] rounded-xl bg-[#134E41] hover:bg-[#0D3A30] disabled:opacity-50 text-white flex items-center justify-center transition cursor-pointer shrink-0"
            >
              {isAsking ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </form>
        </div>
      )}
    </section>
  );
};
