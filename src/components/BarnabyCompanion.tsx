import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  HeartHandshake,
  Loader2,
  MessageSquare,
  Mic,
  ShieldCheck,
  Sparkles,
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
  triggerBarnabyCelebration,
} from '../utils/barnabyStateEngine';
import {
  BarnabyActiveScreenContext,
  BarnabyScreenId,
  buildBarnabyScreenBriefing,
  publishBarnabyScreenContext,
} from '../services/barnabyBrain';
import { BarnabyCrest } from './common/BarnabyCrest';
import { BarnabyRig } from './BarnabyRig';
import { BarnabyDrawerTab, BarnabyTutorDrawer } from './BarnabyTutorDrawer';
import { soundManager } from '../utils/audioEffects';
import {
  applyStreakFreeze,
  completeStreakRescueQuest,
  getCompletedMissionsToday,
  getStreakRescueStatus,
  getStreakState,
  StreakRescueStatus,
} from '../services/streakService';
import {
  BARNABY_FLAIRS,
  BARNABY_FLAIR_UPDATED_EVENT,
  BarnabyFlairId,
  loadSelectedBarnabyFlair,
} from '../utils/barnabyFlair';
import { ACHIEVEMENTS_SAVED_EVENT } from '../services/achievementService';
import {
  BARNABY_ENCOURAGING_PROMPTS,
  BARNABY_INACTIVITY_ENCOURAGE_MS,
  evaluateDailyGoalProgress,
  resolveBarnabyMoodMachine,
} from '../utils/barnabyMoodMachine';
import {
  DAILY_SPRINT_SAVED_EVENT,
  DAILY_SPRINT_SYNCED_EVENT,
  loadDailySprintProgress,
} from '../utils/dailySprintProgressStore';

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
  const [microCelebrationNote, setMicroCelebrationNote] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerInitialTab, setDrawerInitialTab] = useState<BarnabyDrawerTab>('coach');
  const [streakRescue, setStreakRescue] = useState<StreakRescueStatus>(() =>
    getStreakRescueStatus()
  );
  const prefersReducedMotion = useReducedMotion();
  const [equippedFlairId, setEquippedFlairId] = useState<BarnabyFlairId>(() =>
    loadSelectedBarnabyFlair()
  );
  const [userInactiveMs, setUserInactiveMs] = useState(0);
  const [dailyGoalEval, setDailyGoalEval] = useState(() =>
    evaluateDailyGoalProgress(
      loadDailySprintProgress(),
      getCompletedMissionsToday(getStreakState()).length
    )
  );
  const celebrationTimerRef = useRef<number | null>(null);
  const drawerTimerRef = useRef<number | null>(null);
  const lastActivityTsRef = useRef(Date.now());
  const prevTasksCompleteRef = useRef<boolean>(allDailyTasksCompleted);
  const prevDailyGoalMetRef = useRef<boolean>(dailyGoalEval.isDailyGoalMet);

  const equippedFlair = useMemo(
    () => BARNABY_FLAIRS.find((f) => f.id === equippedFlairId) || BARNABY_FLAIRS[0],
    [equippedFlairId]
  );

  // Visibility setting listener
  useEffect(() => {
    const onVisibilityChange = (e: Event) => {
      const next = (e as CustomEvent<BarnabyVisibilitySetting>).detail;
      if (next) setVisibility(next);
    };
    window.addEventListener(BARNABY_VISIBILITY_EVENT, onVisibilityChange);
    return () => window.removeEventListener(BARNABY_VISIBILITY_EVENT, onVisibilityChange);
  }, []);

  // Live Flair & Streak Rescue listeners
  useEffect(() => {
    const onFlairUpdated = (e: Event) => {
      const next = (e as CustomEvent<BarnabyFlairId>).detail;
      setEquippedFlairId(next || loadSelectedBarnabyFlair());
    };
    const refreshStreak = () => setStreakRescue(getStreakRescueStatus());
    window.addEventListener(BARNABY_FLAIR_UPDATED_EVENT, onFlairUpdated);
    window.addEventListener('bandsprint_streak_updated', refreshStreak);
    window.addEventListener('storage', refreshStreak);
    return () => {
      window.removeEventListener(BARNABY_FLAIR_UPDATED_EVENT, onFlairUpdated);
      window.removeEventListener('bandsprint_streak_updated', refreshStreak);
      window.removeEventListener('storage', refreshStreak);
    };
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

  // 4-second auto-reverting celebration listener + Automatic Achievement / Vault Micro-Celebrations
  const startTimedCelebration = (
    durationMs = BARNABY_CELEBRATION_DURATION_MS,
    note?: string
  ) => {
    setIsTemporaryCelebration(true);
    if (note) setMicroCelebrationNote(note);
    if (celebrationTimerRef.current !== null) {
      window.clearTimeout(celebrationTimerRef.current);
    }
    celebrationTimerRef.current = window.setTimeout(() => {
      setIsTemporaryCelebration(false);
      setMicroCelebrationNote(null);
      celebrationTimerRef.current = null;
    }, durationMs);
  };

  useEffect(() => {
    const onCelebrate = (e: Event) => {
      const detail = (e as CustomEvent<{ durationMs?: number; note?: string }>).detail;
      startTimedCelebration(detail?.durationMs ?? BARNABY_CELEBRATION_DURATION_MS, detail?.note);
    };
    const onAchievementSaved = () => {
      startTimedCelebration(
        4800,
        'New milestone logged—check Barnaby Flair Locker for newly unlocked academic emblems.'
      );
    };
    const onVaultMastered = () => {
      startTimedCelebration(4500, 'Mistake Vault trap cleared—your adaptive path just got sharper.');
    };
    window.addEventListener(BARNABY_CELEBRATION_EVENT, onCelebrate);
    window.addEventListener(ACHIEVEMENTS_SAVED_EVENT, onAchievementSaved);
    window.addEventListener('bandsprint_vault_mastered', onVaultMastered);
    return () => {
      window.removeEventListener(BARNABY_CELEBRATION_EVENT, onCelebrate);
      window.removeEventListener(ACHIEVEMENTS_SAVED_EVENT, onAchievementSaved);
      window.removeEventListener('bandsprint_vault_mastered', onVaultMastered);
      if (celebrationTimerRef.current !== null) {
        window.clearTimeout(celebrationTimerRef.current);
      }
    };
  }, []);

  // Trigger temporary celebration when Today's Study Tasks transition from incomplete -> complete
  useEffect(() => {
    if (!prevTasksCompleteRef.current && allDailyTasksCompleted) {
      startTimedCelebration(
        BARNABY_CELEBRATION_DURATION_MS,
        'All daily targets cleared—momentum secured for today.'
      );
    }
    prevTasksCompleteRef.current = allDailyTasksCompleted;
  }, [allDailyTasksCompleted]);

  // Monitor 5-minute user inactivity ('encouraging' idle) & daily goal transitions ('happy' spin)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onActivity = () => {
      lastActivityTsRef.current = Date.now();
      setUserInactiveMs(0);
    };
    const syncDailyGoal = () => {
      const next = evaluateDailyGoalProgress(
        loadDailySprintProgress(),
        getCompletedMissionsToday(getStreakState()).length
      );
      setDailyGoalEval(next);
      if (!prevDailyGoalMetRef.current && next.isDailyGoalMet) {
        startTimedCelebration(
          BARNABY_CELEBRATION_DURATION_MS,
          `Daily goal reached: ${next.metSummary}.`
        );
      }
      prevDailyGoalMetRef.current = next.isDailyGoalMet;
    };

    window.addEventListener('pointerdown', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity, { passive: true });
    window.addEventListener('touchstart', onActivity, { passive: true });
    window.addEventListener('scroll', onActivity, { passive: true });
    window.addEventListener(DAILY_SPRINT_SAVED_EVENT, syncDailyGoal);
    window.addEventListener(DAILY_SPRINT_SYNCED_EVENT, syncDailyGoal);
    window.addEventListener('bandsprint_tasks_updated', syncDailyGoal);
    window.addEventListener('bandsprint_streak_updated', syncDailyGoal);

    const idleInterval = window.setInterval(() => {
      setUserInactiveMs(Date.now() - lastActivityTsRef.current);
    }, 5000);

    return () => {
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('touchstart', onActivity);
      window.removeEventListener('scroll', onActivity);
      window.removeEventListener(DAILY_SPRINT_SAVED_EVENT, syncDailyGoal);
      window.removeEventListener(DAILY_SPRINT_SYNCED_EVENT, syncDailyGoal);
      window.removeEventListener('bandsprint_tasks_updated', syncDailyGoal);
      window.removeEventListener('bandsprint_streak_updated', syncDailyGoal);
      window.clearInterval(idleInterval);
    };
  }, []);

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

  // Empathetic Friction Recovery override when recent score dipped
  const isScoreDipRecovery =
    !isEffectiveAnalyzing &&
    !isTemporaryCelebration &&
    typeof bandDelta === 'number' &&
    bandDelta < 0;

  const displayHeadline = isScoreDipRecovery
    ? 'Short dips are normal before a Band jump.'
    : briefing.headline;

  const displayMessage = isScoreDipRecovery
    ? `Your latest attempt dipped by ${Math.abs(bandDelta).toFixed(1)} band—almost every Band 8 candidate hits a brief plateau while upgrading strategy. Take one calm 5-minute ${
        topWeakness || 'Mistake Vault'
      } review instead of a full timed paper.`
    : briefing.message;

  const emotionalCue = isScoreDipRecovery
    ? ('repeated_mistakes' as const)
    : briefing.situation === 'overwhelmed_or_tired'
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

  const moodResolution = useMemo(
    () =>
      resolveBarnabyMoodMachine({
        dailyGoalMet: allDailyTasksCompleted || dailyGoalEval.isDailyGoalMet,
        isCelebrating: isTemporaryCelebration || mode === 'celebration',
        userInactiveMs,
        companionIdleMs: 0,
        isUserEngagedWithBarnaby: true,
        isAnalyzingOrFocused: isEffectiveAnalyzing || screen === 'practice',
        isManuallyMinimized: false,
        encouragementWindowActive: userInactiveMs >= BARNABY_INACTIVITY_ENCOURAGE_MS,
      }),
    [
      allDailyTasksCompleted,
      dailyGoalEval.isDailyGoalMet,
      isTemporaryCelebration,
      mode,
      userInactiveMs,
      isEffectiveAnalyzing,
      screen,
    ]
  );

  const effectiveExpression =
    moodResolution.mood === 'encouraging'
      ? 'encouraging'
      : moodResolution.mood === 'happy' && moodResolution.shouldSpin
      ? 'celebrating'
      : expression;

  const exprConfig = getBarnabyExpressionConfig(effectiveExpression);

  // EXAM INTEGRITY & ACCESSIBILITY VISIBILITY RULE:
  // Completely return null during timed exams ('focus') or when user chooses Hidden / Focus Only.
  if (mode === 'focus' || visibility === 'hidden_focus_only') {
    return null;
  }

  const isUnassessed = currentEstimate === null;

  const openTutorDrawer = (tab: BarnabyDrawerTab = 'coach') => {
    soundManager.playBeep(560, 0.04);
    setDrawerInitialTab(tab);
    if (drawerTimerRef.current !== null) {
      window.clearTimeout(drawerTimerRef.current);
    }
    drawerTimerRef.current = window.setTimeout(() => {
      setIsDrawerOpen(true);
    }, 90);
  };

  const handleUseStreakFreeze = () => {
    const res = applyStreakFreeze();
    if (res.applied) {
      setStreakRescue(getStreakRescueStatus());
      triggerBarnabyCelebration('streak_freeze_applied');
      startTimedCelebration(
        4500,
        `Streak Freeze applied—your ${res.state.currentStreak}-day study streak is safely protected.`
      );
      soundManager.playBeep(720, 0.06);
    }
  };

  const handleCompleteRescueQuest = () => {
    const res = completeStreakRescueQuest();
    if (res.rescued) {
      setStreakRescue(getStreakRescueStatus());
      triggerBarnabyCelebration('streak_rescue_complete');
      startTimedCelebration(
        4800,
        `Streak healed to ${res.restoredStreak} days (+20 XP). Guilt-free comeback complete.`
      );
      soundManager.playBeep(780, 0.07);
    }
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
                <span className="text-[11px] font-semibold text-[#0F4C45] dark:text-[#6EE7B7]">
                  · {exprConfig.statusLabel}
                </span>
                <span className="text-xs text-[#566664] dark:text-slate-300 truncate">
                  {displayHeadline}
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
              onClick={() => openTutorDrawer('warmup')}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#134E41]/15 dark:border-[#1F8A70]/30 text-[#0F4C45] dark:text-[#6EE7B7] text-xs font-semibold transition inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span>60s Warm-Up</span>
            </button>
            <button
              type="button"
              onClick={() => openTutorDrawer('coach')}
              aria-label="Ask Barnaby"
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#134E41] hover:bg-[#0D3A30] text-white text-xs font-semibold transition inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
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
          initialTab={drawerInitialTab}
        />
      </>
    );
  }

  return (
    <>
      <section
        data-testid="barnaby-companion-card"
        data-barnaby-mode={mode}
        data-barnaby-mood-machine={moodResolution.mood}
        data-barnaby-state={briefing.pose}
        data-barnaby-expression={effectiveExpression}
        aria-label="Barnaby AI Learning Companion"
        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#11201E] border border-[#134E41]/15 dark:border-[#1F8A70]/35 space-y-3.5 transition-colors"
      >
        <div
          className={
            compactStrip
              ? 'flex flex-col lg:flex-row lg:items-center justify-between gap-4'
              : 'space-y-4'
          }
        >
          {/* Left / Main Identity & Guidance */}
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
            {/* Clickable Articulated Vector Rig Frame (Omitted when hideRig prevents Home duplication) */}
            {!hideRig && (
              <button
                type="button"
                onClick={() => openTutorDrawer('coach')}
                aria-label="Open Ask Barnaby tutor drawer"
                title="Tap to open Ask Barnaby"
                className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-transparent flex items-center justify-center shrink-0 overflow-visible cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#134E41]"
              >
                <motion.div
                  className="w-full h-full"
                  animate={
                    !prefersReducedMotion && moodResolution.shouldSpin
                      ? { rotate: [0, -12, 360], y: [0, -10, 0], scale: [1, 1.08, 1] }
                      : !prefersReducedMotion && moodResolution.shouldEncourageIdle
                      ? { rotate: [0, -4, 4, -2, 0], y: [0, -4, 0] }
                      : { rotate: 0, y: 0, scale: 1 }
                  }
                  transition={
                    !prefersReducedMotion && moodResolution.shouldSpin
                      ? { duration: 0.78, ease: [0.22, 1, 0.36, 1] }
                      : !prefersReducedMotion && moodResolution.shouldEncourageIdle
                      ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
                      : { duration: 0.2 }
                  }
                >
                  <BarnabyRig
                    expression={effectiveExpression}
                    mode={mode}
                    animationState={
                      moodResolution.shouldSpin ||
                      mode === 'celebration' ||
                      (typeof bandDelta === 'number' && bandDelta >= 0.5)
                        ? 'celebratory'
                        : isDrawerOpen
                        ? 'speaking'
                        : isEffectiveAnalyzing || screen === 'practice'
                        ? 'focused'
                        : 'idle'
                    }
                    moodState={
                      moodResolution.mood === 'encouraging'
                        ? 'encouraging'
                        : moodResolution.mood === 'happy' ||
                          mode === 'celebration' ||
                          (typeof bandDelta === 'number' && bandDelta >= 0.5)
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
                </motion.div>

                {equippedFlair.id !== 'classic' && !isEffectiveAnalyzing && (
                  <span
                    title={`Equipped Flair: ${equippedFlair.label}`}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-xs border-2 border-white dark:border-[#11201E]"
                    style={{ backgroundColor: equippedFlair.accentHex }}
                  >
                    <Award className="w-3.5 h-3.5" />
                  </span>
                )}

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
              {/* Clean Typographic Meta Strip (Zero Pill Clutter) */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                <span className="font-display text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                  Barnaby
                </span>
                <span className="font-medium text-[#566664] dark:text-slate-400">
                  Stage {briefing.progression.stage} · {briefing.progression.title}
                </span>
                <span aria-hidden="true" className="text-[#566664]/50">
                  ·
                </span>
                <span
                  data-testid="barnaby-expression-pill"
                  className="inline-flex items-center gap-1 font-semibold text-[#0F4C45] dark:text-[#6EE7B7]"
                >
                  {isEffectiveAnalyzing && <Loader2 className="w-2.5 h-2.5 animate-spin shrink-0" />}
                  <span>
                    {moodResolution.mood === 'encouraging'
                      ? 'Encouraging'
                      : moodResolution.shouldSpin
                      ? 'Goal Reached'
                      : isScoreDipRecovery
                      ? 'Supportive'
                      : exprConfig.statusLabel}
                  </span>
                </span>
                <span aria-hidden="true" className="text-[#566664]/50">
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => openTutorDrawer('flair')}
                  data-testid="barnaby-flair-indicator"
                  className="inline-flex items-center gap-1 font-semibold text-[#9A630B] dark:text-[#F4A62A] hover:underline cursor-pointer"
                >
                  <Award className="w-3 h-3" />
                  <span>{equippedFlair.shortLabel}</span>
                </button>
              </div>

              <h2 className="font-display text-sm sm:text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1] leading-snug">
                {moodResolution.mood === 'encouraging'
                  ? BARNABY_ENCOURAGING_PROMPTS[0]
                  : displayHeadline}
              </h2>

              <p className="text-xs text-[#566664] dark:text-slate-300 leading-relaxed max-w-2xl">
                {displayMessage}
              </p>

              {microCelebrationNote && (
                <div
                  data-testid="barnaby-micro-celebration"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0F4C45] dark:text-[#6EE7B7]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F4A62A] shrink-0" />
                  <span>{microCelebrationNote}</span>
                </div>
              )}

              {isUnassessed && !microCelebrationNote && (
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
            className={`flex flex-wrap items-center gap-2 shrink-0 ${
              compactStrip ? 'w-full lg:w-auto' : 'w-full'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(560, 0.04);
                onNavigate(briefing.ctaRoute);
              }}
              className={`${
                compactStrip ? 'flex-1 lg:flex-initial' : 'flex-1'
              } min-h-[40px] px-4 py-2 rounded-xl bg-[#134E41] hover:bg-[#0D3A30] active:scale-[0.99] text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer`}
            >
              <span className="truncate">{briefing.ctaLabel}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>

            <button
              type="button"
              data-testid="barnaby-60s-warmup-btn"
              onClick={() => openTutorDrawer('warmup')}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#134E41]/15 dark:border-[#1F8A70]/30 text-[#0F4C45] dark:text-[#6EE7B7] hover:border-[#134E41]/45 text-xs font-semibold transition flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5 text-[#F4A62A] shrink-0" />
              <span>60s Warm-Up</span>
            </button>

            <button
              type="button"
              onClick={() => openTutorDrawer('coach')}
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

        {/* Guilt-Free Streak Rescue & Earned Streak Freeze Strip */}
        {(streakRescue.status === 'rescue_available' || streakRescue.status === 'at_risk') && (
          <div
            data-testid="barnaby-streak-rescue-strip"
            className="pt-3 border-t border-[#134E41]/12 dark:border-[#1F8A70]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <HeartHandshake className="w-4 h-4 text-[#F4A62A] shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-[#0E1F1E] dark:text-[#EEF3F1] leading-snug">
                {streakRescue.status === 'rescue_available' ? (
                  <>
                    <strong>Streak Rescue Available:</strong> Heal your{' '}
                    <span className="font-mono font-bold tabular-nums">
                      {streakRescue.brokenStreakToRescue}-day
                    </span>{' '}
                    streak guilt-free with a 3-minute repair quest or an earned Freeze.
                  </>
                ) : (
                  <>
                    <strong>Keep your {streakRescue.currentStreak}-day streak alive:</strong> Finish
                    any 60-second warm-up today or protect it with an earned Streak Freeze (
                    <span className="font-mono tabular-nums">{streakRescue.freezesAvailable}</span>{' '}
                    ready).
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {streakRescue.freezesAvailable > 0 && (
                <button
                  type="button"
                  data-testid="apply-streak-freeze-btn"
                  onClick={handleUseStreakFreeze}
                  className="min-h-[34px] px-3 py-1.5 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#0F4C45]/25 dark:border-[#1F8A70]/40 text-[#0F4C45] dark:text-[#6EE7B7] font-semibold text-[11px] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer hover:bg-[#D3DDDA] dark:hover:bg-[#17302C] transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#F4A62A]" />
                  <span>Use Freeze ({streakRescue.freezesAvailable})</span>
                </button>
              )}

              {streakRescue.status === 'rescue_available' && (
                <button
                  type="button"
                  data-testid="complete-streak-rescue-btn"
                  onClick={handleCompleteRescueQuest}
                  className="min-h-[34px] px-3 py-1.5 rounded-xl bg-[#0F4C45] hover:bg-[#0D3A30] text-white font-semibold text-[11px] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition"
                >
                  <span>Heal Streak (+20 XP)</span>
                </button>
              )}
            </div>
          </div>
        )}
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
        initialTab={drawerInitialTab}
      />
    </>
  );
};
