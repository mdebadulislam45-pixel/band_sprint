import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import {
  BARNABY_ANALYZING_EVENT,
  BarnabyAnalyzingDetail,
  BarnabyPoseState,
  getGlobalBarnabyAnalyzing,
} from '../utils/getBarnabyState';
import {
  BARNABY_CORE_TAGLINE,
  BarnabyMode,
  BarnabyVisibilitySetting,
} from '../types/barnaby';
import {
  BARNABY_CELEBRATION_DURATION_MS,
  BARNABY_CELEBRATION_EVENT,
  BARNABY_VISIBILITY_EVENT,
  getBarnabyExpressionConfig,
  getBarnabyVisibility,
  resolveBarnabyExpression,
  resolveBarnabyMode,
} from '../utils/barnabyStateEngine';
import {
  BarnabyActiveScreenContext,
  BarnabyScreenId,
  buildBarnabyScreenBriefing,
  publishBarnabyScreenContext,
} from '../services/barnabyBrain';
import { BarnabyCrest } from './common/BarnabyCrest';
import { BarnabyRig } from './BarnabyRig';
import { BarnabyTutorDrawer } from './BarnabyTutorDrawer';
import { soundManager } from '../utils/audioEffects';

export interface BarnabyCompanionProps {
  /** Optional explicit canonical pose override (e.g. 'studying' on Learn, 'analyzing' on Progress) */
  pose?: BarnabyPoseState;
  /** Active host screen for context-aware briefings */
  screen?: BarnabyScreenId;
  /** Candidate display name */
  userName?: string;
  /** Verified or diagnostic overall band estimate, or null ("Not assessed") */
  currentEstimate: number | null;
  /** Target IELTS band (e.g. 7.5) */
  targetBand: number;
  /** Target exam ISO date */
  examDate?: string | null;
  /** Days remaining until exam day */
  daysRemaining?: number | null;
  /** Whole calendar days since last activity */
  daysInactive?: number;
  /** True when all Today's Study Tasks are checked off */
  allDailyTasksCompleted?: boolean;
  /** Logged priority weakness label (e.g. "True/False/Not Given", "Task 2 Coherence") */
  topWeakness?: string | null;
  /** Latest band delta on Progress analytics */
  bandDelta?: number | null;
  /** Pending unresolved items in Mistake Vault */
  mistakeCount?: number;
  /** Live context override forwarded into BarnabyTutorDrawer */
  screenContext?: Partial<BarnabyActiveScreenContext>;
  /** Optional explicit override while Gemini is grading Writing/Speaking/Diagnostic */
  isAnalyzing?: boolean;
  /** Explicit flag to hide during active Listening audio simulations or full Mock Exams */
  isActiveExam?: boolean;
  /** Current router path for exam integrity enforcement */
  currentPath?: string;
  /** Navigation handler */
  onNavigate: (path: string) => void;
  /** Exam mode for coaching context */
  examMode?: 'Academic' | 'General Training';
  /** Wide horizontal card rhythm for top-of-page placement above the fold */
  compactStrip?: boolean;
  /** Omit inline BarnabyRig avatar when the persistent FloatingBarnaby is active on the screen */
  hideRig?: boolean;
}

const TIMED_EXAM_PATHS = new Set([
  '/practice/listening',
  '/practice/reading',
  '/practice/writing',
  '/practice/speaking',
  '/practice/mock-tests',
]);

function isGlobalExamRunning(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as unknown as Record<string, unknown>).__BANDSPRINT_ACTIVE_EXAM__);
}

export const BarnabyCompanion: React.FC<BarnabyCompanionProps> = ({
  pose,
  screen = 'home',
  userName = 'Candidate',
  currentEstimate,
  targetBand,
  examDate = null,
  daysRemaining = null,
  daysInactive = 0,
  allDailyTasksCompleted = false,
  topWeakness = null,
  bandDelta = null,
  mistakeCount = 0,
  screenContext,
  isAnalyzing: propIsAnalyzing = false,
  isActiveExam = false,
  currentPath = '/',
  onNavigate,
  examMode = 'Academic',
  compactStrip = false,
  hideRig = false,
}) => {
  const [visibility, setVisibility] = useState<BarnabyVisibilitySetting>(() =>
    getBarnabyVisibility()
  );
  const [globalExamActive, setGlobalExamActive] = useState<boolean>(() => isGlobalExamRunning());
  const [analyzingState, setAnalyzingState] = useState<BarnabyAnalyzingDetail>(() =>
    getGlobalBarnabyAnalyzing()
  );
  const [isTemporaryCelebration, setIsTemporaryCelebration] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const celebrationTimerRef = useRef<number | null>(null);
  const drawerTimerRef = useRef<number | null>(null);
  const prevTasksCompleteRef = useRef<boolean>(allDailyTasksCompleted);

  // Visibility setting listener
  useEffect(() => {
    const onVisibilityChange = (e: Event) => {
      const next = (e as CustomEvent<BarnabyVisibilitySetting>).detail;
      if (next) setVisibility(next);
    };
    window.addEventListener(BARNABY_VISIBILITY_EVENT, onVisibilityChange);
    return () => window.removeEventListener(BARNABY_VISIBILITY_EVENT, onVisibilityChange);
  }, []);

  // Exam Integrity Listener: hide immediately whenever a timed simulation or Mock Exam starts
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

  // Analyzing State Listener: transition to `analyzing` whenever Gemini grades
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

  // 4-second auto-reverting celebration listener
  const startTimedCelebration = (durationMs = BARNABY_CELEBRATION_DURATION_MS) => {
    setIsTemporaryCelebration(true);
    if (celebrationTimerRef.current !== null) {
      window.clearTimeout(celebrationTimerRef.current);
    }
    celebrationTimerRef.current = window.setTimeout(() => {
      setIsTemporaryCelebration(false);
      celebrationTimerRef.current = null;
    }, durationMs);
  };

  useEffect(() => {
    const onCelebrate = (e: Event) => {
      const detail = (e as CustomEvent<{ durationMs?: number }>).detail;
      startTimedCelebration(detail?.durationMs ?? BARNABY_CELEBRATION_DURATION_MS);
    };
    window.addEventListener(BARNABY_CELEBRATION_EVENT, onCelebrate);
    return () => {
      window.removeEventListener(BARNABY_CELEBRATION_EVENT, onCelebrate);
      if (celebrationTimerRef.current !== null) {
        window.clearTimeout(celebrationTimerRef.current);
      }
    };
  }, []);

  // Trigger temporary celebration when Today's Study Tasks transition from incomplete -> complete
  useEffect(() => {
    if (!prevTasksCompleteRef.current && allDailyTasksCompleted) {
      startTimedCelebration(BARNABY_CELEBRATION_DURATION_MS);
    }
    prevTasksCompleteRef.current = allDailyTasksCompleted;
  }, [allDailyTasksCompleted]);

  const normalizedPath = (currentPath || '/').replace(/\/+$/, '') || '/';
  const isEffectiveAnalyzing = propIsAnalyzing || analyzingState.isAnalyzing;

  // Keep live Barnaby screen memory synchronized for Ask Barnaby drawer
  useEffect(() => {
    const screenTitleMap: Record<BarnabyScreenId, string> = {
      home: 'Home Dashboard',
      learn: 'Free Learning Library',
      progress: 'Progress & Analytics',
      practice: 'Practice Hub',
    };
    publishBarnabyScreenContext({
      screen,
      screenTitle: screenContext?.screenTitle || screenTitleMap[screen],
      route: normalizedPath,
      topWeakness: topWeakness ?? null,
      currentEstimate,
      targetBand,
      examMode,
      examDate,
      daysRemaining,
      mistakeCount,
      ...screenContext,
    });
  }, [
    screen,
    normalizedPath,
    topWeakness,
    currentEstimate,
    targetBand,
    examMode,
    examDate,
    daysRemaining,
    mistakeCount,
    screenContext,
  ]);

  const mode: BarnabyMode = useMemo(
    () =>
      resolveBarnabyMode({
        isActiveExam,
        globalExamActive,
        currentPath: normalizedPath,
        isCelebrating: isTemporaryCelebration,
        isTutorHint: screen === 'practice',
        isDrawerOpen,
        timedPaths: TIMED_EXAM_PATHS,
      }),
    [
      isActiveExam,
      globalExamActive,
      normalizedPath,
      isTemporaryCelebration,
      screen,
      isDrawerOpen,
    ]
  );

  const briefing = useMemo(
    () =>
      buildBarnabyScreenBriefing({
        screen,
        userName,
        currentEstimate,
        targetBand,
        examDate,
        daysRemaining,
        daysInactive,
        allDailyTasksCompleted,
        topWeakness,
        isAnalyzing: isEffectiveAnalyzing,
        analyzingLabel: analyzingState.label,
        mistakeCount,
        bandDelta,
        forcedPose: pose,
      }),
    [
      screen,
      userName,
      currentEstimate,
      targetBand,
      examDate,
      daysRemaining,
      daysInactive,
      allDailyTasksCompleted,
      topWeakness,
      isEffectiveAnalyzing,
      analyzingState.label,
      mistakeCount,
      bandDelta,
      pose,
    ]
  );

  const emotionalCue =
    briefing.situation === 'overwhelmed_or_tired'
      ? ('overwhelmed_or_tired' as const)
      : briefing.situation === 'repeated_mistakes'
      ? ('repeated_mistakes' as const)
      : briefing.situation === 'genuine_achievement'
      ? ('genuine_achievement' as const)
      : ('neutral' as const);

  const expression = useMemo(
    () =>
      resolveBarnabyExpression({
        mode,
        pose: briefing.pose,
        isAnalyzing: isEffectiveAnalyzing,
        isDrawerOpen,
        isTutorHint: mode === 'tutor',
        currentEstimate,
        targetBand,
        daysInactive,
        allDailyTasksCompleted,
        topWeakness,
        bandDelta,
        emotionalCue,
      }),
    [
      mode,
      briefing.pose,
      isEffectiveAnalyzing,
      isDrawerOpen,
      currentEstimate,
      targetBand,
      daysInactive,
      allDailyTasksCompleted,
      topWeakness,
      bandDelta,
      emotionalCue,
    ]
  );

  const exprConfig = getBarnabyExpressionConfig(expression);

  // EXAM INTEGRITY & ACCESSIBILITY VISIBILITY RULE:
  // Completely return null during timed exams ('focus') or when user chooses Hidden / Focus Only.
  if (mode === 'focus' || visibility === 'hidden_focus_only') {
    return null;
  }

  const isUnassessed = currentEstimate === null;

  const openTutorDrawer = () => {
    soundManager.playBeep(560, 0.04);
    if (drawerTimerRef.current !== null) {
      window.clearTimeout(drawerTimerRef.current);
    }
    drawerTimerRef.current = window.setTimeout(() => {
      setIsDrawerOpen(true);
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (drawerTimerRef.current !== null) {
        window.clearTimeout(drawerTimerRef.current);
      }
    };
  }, []);

  // MINIMAL BADGE VISIBILITY SETTING:
  if (visibility === 'minimal_badge') {
    return (
      <>
        <section
          data-testid="barnaby-minimal-badge"
          data-barnaby-mode={mode}
          data-barnaby-state={briefing.pose}
          data-barnaby-expression={expression}
          aria-label="Barnaby Minimal Study Companion"
          className="px-4 py-3 rounded-2xl bg-white dark:bg-[#11201E] border border-[#134E41]/15 dark:border-[#1F8A70]/35 flex flex-wrap items-center justify-between gap-3 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <BarnabyCrest
              size={26}
              variant="badge"
              animated={mode === 'celebration' || isEffectiveAnalyzing}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                  Barnaby
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap ${exprConfig.pillClasses}`}
                >
                  {exprConfig.statusLabel}
                </span>
                <span className="text-xs text-[#566664] dark:text-slate-300 truncate">
                  {briefing.headline}
                </span>
              </div>
              {isUnassessed && (
                <p className="text-[11px] text-[#566664] dark:text-slate-400 mt-0.5">
                  {BARNABY_CORE_TAGLINE}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(560, 0.04);
                onNavigate(briefing.ctaRoute);
              }}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#134E41] hover:bg-[#0D3A30] text-white font-semibold text-xs transition inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <span>{briefing.ctaLabel}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
            <button
              type="button"
              onClick={openTutorDrawer}
              aria-label="Ask Barnaby"
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#134E41]/15 dark:border-[#1F8A70]/30 text-[#134E41] dark:text-[#EEF3F1] hover:border-[#134E41]/40 text-xs font-semibold transition inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Ask Barnaby</span>
            </button>
          </div>
        </section>

        <BarnabyTutorDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onNavigate={onNavigate}
          userName={userName}
          currentEstimate={currentEstimate}
          targetBand={targetBand}
          examMode={examMode}
          topWeakness={topWeakness}
          screenContextOverride={screenContext}
        />
      </>
    );
  }

  return (
    <>
      <section
        data-testid="barnaby-companion-card"
        data-barnaby-mode={mode}
        data-barnaby-state={briefing.pose}
        data-barnaby-expression={expression}
        aria-label="Barnaby AI Learning Companion"
        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#11201E] border border-[#134E41]/15 dark:border-[#1F8A70]/35 transition-colors"
      >
        <div
          className={
            compactStrip
              ? 'flex flex-col md:flex-row md:items-center justify-between gap-4'
              : 'space-y-4'
          }
        >
          {/* Left / Main Identity & Guidance */}
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
            {/* Clickable Articulated Vector Rig Frame (Omitted when hideRig prevents Home duplication) */}
            {!hideRig && (
              <button
                type="button"
                onClick={openTutorDrawer}
                aria-label="Open Ask Barnaby tutor drawer"
                title="Tap to open Ask Barnaby"
                className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-transparent flex items-center justify-center shrink-0 overflow-visible cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#134E41]"
              >
                <BarnabyRig
                  expression={expression}
                  mode={mode}
                  animationState={
                    mode === 'celebration' || (typeof bandDelta === 'number' && bandDelta >= 0.5)
                      ? 'celebratory'
                      : isDrawerOpen
                      ? 'speaking'
                      : isEffectiveAnalyzing || screen === 'practice'
                      ? 'focused'
                      : 'idle'
                  }
                  moodState={
                    mode === 'celebration' || (typeof bandDelta === 'number' && bandDelta >= 0.5)
                      ? 'celebratory'
                      : isEffectiveAnalyzing || screen === 'practice'
                      ? 'focused'
                      : 'neutral'
                  }
                  isSpeaking={isDrawerOpen || isEffectiveAnalyzing}
                  interactive
                  className="w-full h-full p-0.5"
                  testId="barnaby-inline-rig"
                />

                {isEffectiveAnalyzing && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1.5 -right-1.5 bg-white dark:bg-[#0D1A19] rounded-full p-0.5 shadow-xs border border-[#134E41]/20"
                  >
                    <BarnabyCrest size={18} variant="inline" animated />
                  </span>
                )}
              </button>
            )}

            <div className="min-w-0 flex-1 space-y-1.5">
              {/* Top Meta Strip: Barnaby Identity + Stage + Expression & Focus Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                  Barnaby
                </span>
                <span className="text-[11px] font-medium text-[#566664] dark:text-slate-400">
                  · Stage {briefing.progression.stage}: {briefing.progression.title}
                </span>
                <span
                  data-testid="barnaby-expression-pill"
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap ${exprConfig.pillClasses}`}
                >
                  {isEffectiveAnalyzing && <Loader2 className="w-2.5 h-2.5 animate-spin shrink-0" />}
                  <span>{exprConfig.statusLabel}</span>
                </span>
                <span
                  data-testid="barnaby-focus-badge"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F59E0B]/15 text-[#B45309] dark:text-[#FBBF24] text-[10px] font-semibold whitespace-nowrap"
                >
                  <span>{briefing.focusLabel}</span>
                </span>
              </div>

              <h2 className="font-display text-sm sm:text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1] leading-snug">
                {briefing.headline}
              </h2>

              <p className="text-xs text-[#566664] dark:text-slate-300 leading-relaxed max-w-2xl">
                {briefing.message}
              </p>

              {isUnassessed && (
                <p
                  data-testid="barnaby-core-tagline"
                  className="text-[11px] font-medium text-[#134E41]/80 dark:text-[#6EE7B7]/85 italic"
                >
                  {BARNABY_CORE_TAGLINE}
                </p>
              )}
            </div>
          </div>

          {/* Right / Action Buttons */}
          <div
            className={`flex items-center gap-2 shrink-0 ${
              compactStrip ? 'w-full md:w-auto' : 'w-full'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(560, 0.04);
                onNavigate(briefing.ctaRoute);
              }}
              className={`${
                compactStrip ? 'flex-1 md:flex-initial' : 'flex-1'
              } min-h-[40px] px-4 py-2 rounded-xl bg-[#134E41] hover:bg-[#0D3A30] active:scale-[0.99] text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer`}
            >
              <span className="truncate">{briefing.ctaLabel}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>

            <button
              type="button"
              onClick={openTutorDrawer}
              aria-expanded={isDrawerOpen}
              aria-label="Open Ask Barnaby tutor drawer"
              className={`min-h-[40px] px-3.5 py-2 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                isDrawerOpen
                  ? 'bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#B45309] dark:text-[#FBBF24]'
                  : 'bg-[#F7F9F8] dark:bg-[#0B1514] border-[#134E41]/15 dark:border-[#1F8A70]/30 text-[#134E41] dark:text-[#EEF3F1] hover:border-[#134E41]/40'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>Ask Barnaby</span>
            </button>
          </div>
        </div>
      </section>

      <BarnabyTutorDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNavigate={onNavigate}
        userName={userName}
        currentEstimate={currentEstimate}
        targetBand={targetBand}
        examMode={examMode}
        topWeakness={topWeakness}
        screenContextOverride={screenContext}
      />
    </>
  );
};
