import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import type { UserProfile } from '../types';
import type {
  BarnabyAnimationState,
  BarnabyExpression,
  BarnabyFelineBehavior,
  BarnabyMode,
  BarnabyMoodState,
  BarnabyVisibilitySetting,
} from '../types/barnaby';
import {
  BARNABY_CELEBRATION_DURATION_MS,
  BARNABY_CELEBRATION_EVENT,
  BARNABY_VISIBILITY_EVENT,
  getBarnabyVisibility,
  resolveBarnabyExpression,
  resolveBarnabyMode,
} from '../utils/barnabyStateEngine';
import {
  BARNABY_ANALYZING_EVENT,
  BarnabyAnalyzingDetail,
  computeDaysInactive,
  getGlobalBarnabyAnalyzing,
} from '../utils/getBarnabyState';
import {
  BARNABY_AUTO_DISAPPEAR_MS,
  BARNABY_ENCOURAGING_PROMPTS,
  BARNABY_INACTIVITY_ENCOURAGE_MS,
  BARNABY_MOOD_APPEAR_DWELL_MS,
  evaluateDailyGoalProgress,
  resolveBarnabyMoodMachine,
} from '../utils/barnabyMoodMachine';
import {
  DAILY_SPRINT_SAVED_EVENT,
  DAILY_SPRINT_SYNCED_EVENT,
  loadDailySprintProgress,
} from '../utils/dailySprintProgressStore';
import { LEARNING_PATH_UPDATED_EVENT } from './learn/InteractiveLearningPath';
import { getBarnabyScreenContext } from '../services/barnabyBrain';
import { loadDiagnosticResult } from '../services/diagnosticResultStore';
import { aggregateExamHistory, validateOptionalHalfBand } from '../utils/historyAggregation';
import { sanitizeCandidateName } from '../utils/nameSanitizer';
import { getTopWeakness, TOP_WEAKNESS_UPDATED_EVENT } from '../utils/userStorage';
import { getCompletedMissionsToday, getStreakState } from '../services/streakService';
import { useBarnabyDragPhysics } from '../hooks/useBarnabyDragPhysics';
import { BarnabyRig } from './BarnabyRig';
import {
  BARNABY_STRIDE_BASE_OMEGA,
  BarnabyPawDustEmitter,
} from './BarnabyPawDustEmitter';
import { BarnabyCrest } from './common/BarnabyCrest';
import { BarnabyTutorDrawer } from './BarnabyTutorDrawer';

export interface FloatingBarnabyProps {
  currentPath: string;
  user?: UserProfile | null;
  examMode?: 'Academic' | 'General Training';
  onNavigate: (path: string) => void;
  isLoading?: boolean;
}

const MINIMIZED_STORAGE_KEY = 'bandsprint_barnaby_float_minimized_v1';
const MICRO_BUBBLE_DURATION_MS = 3500;
const ENERGETIC_DURATION_MS = 2800;
const SETTLING_DURATION_MS = 2500;
const PAW_LICK_DURATION_MS = 4800;
const BORED_PHASE_DURATION_MS = 5500;
const SLEEP_PHASE_DURATION_MS = 7500;
const DEEP_SLEEP_IDLE_MS = 35000;
const WRITING_TYPING_IDLE_WAKE_MS = 4500;
const STUDY_FATIGUE_INTERVAL_MS = 35 * 60 * 1000;

type AutonomousPhase =
  | 'settling'
  | 'walking_out'
  | 'paw_licking'
  | 'walking_back'
  | 'bored'
  | 'sleeping';

// Timed Listening, Speaking & full CD-IELTS Mock rooms (globalExamActive) strictly unmount Barnaby
const TIMED_EXAM_PATHS = new Set(['/practice/listening', '/practice/speaking']);

const AMBIENT_TIPS: readonly string[] = [
  'Ooh, spotted a sneaky distractor pattern!',
  'Band 8.5 collocation alert—let’s crush it! ✨',
  'Psst! Listen for the speaker changing their mind!',
  'Pro tip: IELTS Reading loves clever paraphrases!',
  'Strong Task 2 overview = instant Band boost! ✍️',
  'Steady precision always beats rushing 🎯',
  '2-minute Speaking sprint? You’ve totally got this!',
  'Polishing complex clauses—Band 8 energy! 🌟',
  'False vs Not Given: never guess beyond the text!',
  'Tap me anytime for a quick strategy hint!',
];

function isGlobalExamRunning(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as unknown as Record<string, unknown>).__BANDSPRINT_ACTIVE_EXAM__);
}

function readMinimizedPreference(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(MINIMIZED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export const FloatingBarnaby: React.FC<FloatingBarnabyProps> = ({
  currentPath,
  user,
  examMode = 'Academic',
  onNavigate,
}) => {
  const [visibility, setVisibility] = useState<BarnabyVisibilitySetting>(() =>
    getBarnabyVisibility()
  );
  const [globalExamActive, setGlobalExamActive] = useState<boolean>(() => isGlobalExamRunning());
  const [analyzingState, setAnalyzingState] = useState<BarnabyAnalyzingDetail>(() =>
    getGlobalBarnabyAnalyzing()
  );
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(() => readMinimizedPreference());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 7-Activity Feline State Machine phases
  const [autonomousPhase, setAutonomousPhase] = useState<AutonomousPhase>('settling');
  const [isDeepSleeping, setIsDeepSleeping] = useState(false);
  const [isWritingTypingSleep, setIsWritingTypingSleep] = useState(false);
  const [isEnergetic, setIsEnergetic] = useState(false);
  const [isSelectionThinking, setIsSelectionThinking] = useState(false);
  const [isPurring, setIsPurring] = useState(false);

  const [hopSignal, setHopSignal] = useState(0);
  const [affectionSignal, setAffectionSignal] = useState(0);
  const [microBubbleText, setMicroBubbleText] = useState<string | null>(null);
  const [, setTipIndex] = useState(0);

  // Voice cue state (zero autoplay)
  const [isSpeakingCue, setIsSpeakingCue] = useState(false);
  const [speakCueSignal, setSpeakCueSignal] = useState(0);
  const [stopCueSignal, setStopCueSignal] = useState(0);
  const [isExternalSpeaking, setIsExternalSpeaking] = useState(false);

  // Bottom-ledge patrol horizontal offset & walking stride phase
  const [patrolDx, setPatrolDx] = useState(0);
  const [walkSpeedFactor, setWalkSpeedFactor] = useState(1);
  const [facingDirection, setFacingDirection] = useState<'left' | 'right'>('left');
  const [phase, setPhase] = useState(0);
  const [gazeRotationDeg, setGazeRotationDeg] = useState(0);
  const [gazeOffset, setGazeOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isLandingToIdle, setIsLandingToIdle] = useState(false);
  const [isCelebratingSpin, setIsCelebratingSpin] = useState(false);
  const patrolDxRef = useRef(0);
  patrolDxRef.current = patrolDx;
  const characterBoxRef = useRef<HTMLDivElement | null>(null);
  const lastPeakCycleRef = useRef<number>(-1);
  const activeParticleTimeoutsRef = useRef<Set<number>>(new Set());
  const landingTimerRef = useRef<number | null>(null);
  const spinTimerRef = useRef<number | null>(null);
  const prevAutonomousPhaseRef = useRef<AutonomousPhase>(autonomousPhase);

  const prefersReducedMotion = useReducedMotion();
  const [userInactiveMs, setUserInactiveMs] = useState(0);
  const [companionIdleMs, setCompanionIdleMs] = useState(0);
  const [isHoveredOnBarnaby, setIsHoveredOnBarnaby] = useState(false);
  const [encouragementWindowActive, setEncouragementWindowActive] = useState(false);
  const [dailyGoalEval, setDailyGoalEval] = useState(() =>
    evaluateDailyGoalProgress(
      loadDailySprintProgress(),
      getCompletedMissionsToday(getStreakState()).length
    )
  );

  const lastInteractionTsRef = useRef(Date.now());
  const lastBarnabyActiveTsRef = useRef(Date.now());
  const prevDailyGoalMetRef = useRef(dailyGoalEval.isDailyGoalMet);
  const encouragementNotifiedRef = useRef(false);
  const encouragementPromptIdxRef = useRef(0);
  const encouragementHideTimerRef = useRef<number | null>(null);
  const celebrationTimerRef = useRef<number | null>(null);
  const energeticTimerRef = useRef<number | null>(null);
  const purrTimerRef = useRef<number | null>(null);
  const bubbleTimerRef = useRef<number | null>(null);
  const drawerTimerRef = useRef<number | null>(null);
  const writingIdleWakeTimerRef = useRef<number | null>(null);
  const selectionThinkingTimerRef = useRef<number | null>(null);
  const walkRafRef = useRef<number | null>(null);
  const phaseTimerRef = useRef<number | null>(null);

  // Petting stroke refs
  const petReversalsRef = useRef(0);
  const lastStrokeDirRef = useRef<'left' | 'right' | null>(null);
  const lastStrokeTimeRef = useRef(0);
  const lastStrokeXRef = useRef(0);
  const petCooldownRef = useRef(false);

  const normalizedPath = (currentPath || '/').replace(/\/+$/, '') || '/';

  const showMicroBubble = useCallback((text: string, durationMs = MICRO_BUBBLE_DURATION_MS) => {
    setMicroBubbleText(text);
    if (bubbleTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(bubbleTimerRef.current);
    }
    if (typeof window !== 'undefined') {
      bubbleTimerRef.current = window.setTimeout(() => {
        setMicroBubbleText(null);
        bubbleTimerRef.current = null;
      }, durationMs);
    }
  }, []);

  const touchBarnabyPresence = useCallback(() => {
    lastBarnabyActiveTsRef.current = Date.now();
    setCompanionIdleMs(0);
  }, []);

  const registerActivity = useCallback(() => {
    lastInteractionTsRef.current = Date.now();
    encouragementNotifiedRef.current = false;
    setUserInactiveMs(0);
    setEncouragementWindowActive(false);
    touchBarnabyPresence();
    setIsDeepSleeping(false);
    setIsWritingTypingSleep(false);
    setAutonomousPhase((prev) =>
      prev === 'bored' || prev === 'sleeping' ? 'settling' : prev
    );
  }, [touchBarnabyPresence]);

  const triggerLandingSquash = useCallback(() => {
    setIsLandingToIdle(true);
    if (landingTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(landingTimerRef.current);
    }
    if (typeof window !== 'undefined') {
      landingTimerRef.current = window.setTimeout(() => {
        setIsLandingToIdle(false);
        landingTimerRef.current = null;
      }, 420);
    }
  }, []);

  const triggerCelebrationSpinAndStars = useCallback(
    (bubbleMsg?: string) => {
      registerActivity();
      setAutonomousPhase('settling');
      setIsCelebrating(true);
      setIsEnergetic(true);
      setIsCelebratingSpin(true);
      setAffectionSignal((n) => n + 1);
      setHopSignal((n) => n + 1);
      if (bubbleMsg) {
        showMicroBubble(bubbleMsg, 4200);
      }
      if (spinTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(spinTimerRef.current);
      }
      if (typeof window !== 'undefined') {
        spinTimerRef.current = window.setTimeout(() => {
          setIsCelebratingSpin(false);
          triggerLandingSquash();
          spinTimerRef.current = null;
        }, 760);
      }
      if (energeticTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(energeticTimerRef.current);
      }
      if (typeof window !== 'undefined') {
        energeticTimerRef.current = window.setTimeout(() => {
          setIsEnergetic(false);
          setIsCelebrating(false);
          triggerLandingSquash();
          energeticTimerRef.current = null;
        }, ENERGETIC_DURATION_MS);
      }
    },
    [registerActivity, showMicroBubble, triggerLandingSquash]
  );

  // Trigger vertical landing squash-and-stretch whenever Barnaby returns to idle from walking or energetic states
  useEffect(() => {
    const prev = prevAutonomousPhaseRef.current;
    if (
      (prev === 'walking_out' || prev === 'walking_back') &&
      autonomousPhase !== 'walking_out' &&
      autonomousPhase !== 'walking_back'
    ) {
      triggerLandingSquash();
    }
    prevAutonomousPhaseRef.current = autonomousPhase;
  }, [autonomousPhase, triggerLandingSquash]);

  const triggerEnergeticBurst = useCallback(
    (durationMs = ENERGETIC_DURATION_MS) => {
      registerActivity();
      setAutonomousPhase('settling');
      setIsEnergetic(true);
      setAffectionSignal((n) => n + 1);
      setHopSignal((n) => n + 1);
      if (energeticTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(energeticTimerRef.current);
      }
      if (typeof window !== 'undefined') {
        energeticTimerRef.current = window.setTimeout(() => {
          setIsEnergetic(false);
          triggerLandingSquash();
          energeticTimerRef.current = null;
        }, durationMs);
      }
    },
    [registerActivity, triggerLandingSquash]
  );

  const toggleMinimized = useCallback((nextVal: boolean) => {
    setIsMinimized(nextVal);
    if (nextVal) {
      setMicroBubbleText(null);
      setStopCueSignal((n) => n + 1);
    }
    try {
      localStorage.setItem(MINIMIZED_STORAGE_KEY, String(nextVal));
    } catch {}
  }, []);

  const handleToggleSpeakCue = useCallback(() => {
    if (isSpeakingCue) {
      setStopCueSignal((n) => n + 1);
    } else {
      setSpeakCueSignal((n) => n + 1);
    }
  }, [isSpeakingCue]);

  const handleSingleTap = useCallback(() => {
    const wasResting =
      isDeepSleeping ||
      isWritingTypingSleep ||
      autonomousPhase === 'bored' ||
      autonomousPhase === 'sleeping';
    registerActivity();
    if (wasResting) {
      setAutonomousPhase('settling');
      triggerEnergeticBurst(1600);
      showMicroBubble('Wide awake! Ready to crush today’s sprint ✨', 3200);
      return;
    }
    setStopCueSignal((n) => n + 1);
    setHopSignal((n) => n + 1);
    if (drawerTimerRef.current !== null) {
      window.clearTimeout(drawerTimerRef.current);
    }
    drawerTimerRef.current = window.setTimeout(() => {
      setIsDrawerOpen(true);
    }, 110);
  }, [
    autonomousPhase,
    isDeepSleeping,
    isWritingTypingSleep,
    registerActivity,
    showMicroBubble,
    triggerEnergeticBurst,
  ]);

  const resetToCornerRef = useRef<() => void>(() => {});

  // Double-tap -> Snap back + energetic gold star burst!
  const handleDoubleTap = useCallback(() => {
    registerActivity();
    setPatrolDx(0);
    resetToCornerRef.current();
    triggerEnergeticBurst(ENERGETIC_DURATION_MS);
    showMicroBubble('Gold star energy unlocked! Let’s keep going ✨', 2800);
  }, [registerActivity, showMicroBubble, triggerEnergeticBurst]);

  const handleLongPress = useCallback(() => {
    toggleMinimized(true);
  }, [toggleMinimized]);

  const { dragOffset, dragVelocity, isDragging, dockSide, resetToSafeCorner, handlers } =
    useBarnabyDragPhysics({
      characterSize: 96,
      minTop: 76,
      minBottom: 68,
      edgeMargin: 12,
      onSingleTap: handleSingleTap,
      onDoubleTap: handleDoubleTap,
      onLongPress: handleLongPress,
    });

  resetToCornerRef.current = resetToSafeCorner;

  // Hovering wakes Barnaby gently and pauses auto-disappear timer
  const handleHoverWake = useCallback(() => {
    setIsHoveredOnBarnaby(true);
    touchBarnabyPresence();
    if (autonomousPhase === 'bored') {
      registerActivity();
    }
  }, [autonomousPhase, registerActivity, touchBarnabyPresence]);

  const handleHoverLeave = useCallback(() => {
    setIsHoveredOnBarnaby(false);
    touchBarnabyPresence();
  }, [touchBarnabyPresence]);

  // Tactile petting gesture back-and-forth
  const handlePettingPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (isDragging || petCooldownRef.current) return;
      if (autonomousPhase === 'bored') registerActivity();
      if (isDeepSleeping || isWritingTypingSleep || autonomousPhase === 'sleeping') return;

      const now = performance.now();
      const currentX = e.clientX;

      if (lastStrokeTimeRef.current === 0 || now - lastStrokeTimeRef.current > 500) {
        lastStrokeXRef.current = currentX;
        lastStrokeTimeRef.current = now;
        petReversalsRef.current = 0;
        lastStrokeDirRef.current = null;
        return;
      }

      const dx = currentX - lastStrokeXRef.current;
      if (Math.abs(dx) > 6) {
        const currentDir = dx > 0 ? 'right' : 'left';
        if (lastStrokeDirRef.current && lastStrokeDirRef.current !== currentDir) {
          petReversalsRef.current += 1;
          if (petReversalsRef.current >= 3) {
            petReversalsRef.current = 0;
            petCooldownRef.current = true;
            setIsPurring(true);
            triggerEnergeticBurst(2600);

            const petQuotes = [
              'Feeling recharged and ready to coach! ✨',
              'High-five! Let’s chase that Band 8.5! 💖',
              'Barnaby is cheering for your streak~',
              'Good vibes + smart strategy = Band 8+ 🌟',
            ];
            showMicroBubble(petQuotes[Math.floor(Math.random() * petQuotes.length)], 3200);

            if (purrTimerRef.current !== null) window.clearTimeout(purrTimerRef.current);
            purrTimerRef.current = window.setTimeout(() => {
              setIsPurring(false);
              purrTimerRef.current = null;
            }, 2600);

            window.setTimeout(() => {
              petCooldownRef.current = false;
            }, 5000);
          }
        }
        lastStrokeDirRef.current = currentDir;
        lastStrokeXRef.current = currentX;
        lastStrokeTimeRef.current = now;
      }
    },
    [
      autonomousPhase,
      isDeepSleeping,
      isDragging,
      isWritingTypingSleep,
      registerActivity,
      showMicroBubble,
      triggerEnergeticBurst,
    ]
  );

  useEffect(() => {
    if (isDragging) {
      registerActivity();
      setPatrolDx(0);
      setAutonomousPhase('settling');
    }
  }, [isDragging, registerActivity]);

  // Listen to visibility, global active exam, analyzing & drawer speaking events
  useEffect(() => {
    const onVis = (e: Event) => {
      const next = (e as CustomEvent<BarnabyVisibilitySetting>).detail;
      if (next) setVisibility(next);
    };
    window.addEventListener(BARNABY_VISIBILITY_EVENT, onVis);
    return () => window.removeEventListener(BARNABY_VISIBILITY_EVENT, onVis);
  }, []);

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

  useEffect(() => {
    const onAnalyzing = (e: Event) => {
      const detail = (e as CustomEvent<BarnabyAnalyzingDetail>).detail;
      if (detail) {
        const nextAnalyzing = Boolean(detail.isAnalyzing);
        setAnalyzingState({ isAnalyzing: nextAnalyzing, label: detail.label });
        if (nextAnalyzing) {
          showMicroBubble(detail.label || 'Analyzing your response...', MICRO_BUBBLE_DURATION_MS);
        }
      }
    };
    window.addEventListener(BARNABY_ANALYZING_EVENT, onAnalyzing);
    return () => window.removeEventListener(BARNABY_ANALYZING_EVENT, onAnalyzing);
  }, [showMicroBubble]);

  useEffect(() => {
    const onTutorSpeaking = (e: Event) => {
      const detail = (e as CustomEvent<{ speaking?: boolean }>).detail;
      setIsExternalSpeaking(Boolean(detail?.speaking));
    };
    window.addEventListener('bandsprint_barnaby_speaking', onTutorSpeaking);
    return () => window.removeEventListener('bandsprint_barnaby_speaking', onTutorSpeaking);
  }, []);

  useEffect(() => {
    const onCelebrate = (e: Event) => {
      const detail = (e as CustomEvent<{ reason?: string; durationMs?: number }>).detail;
      const dur = detail?.durationMs ?? BARNABY_CELEBRATION_DURATION_MS;
      triggerCelebrationSpinAndStars(
        detail?.reason ? `${detail.reason}!` : 'Target milestone reached!'
      );
      if (celebrationTimerRef.current !== null) window.clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = window.setTimeout(() => {
        setIsCelebrating(false);
        celebrationTimerRef.current = null;
      }, dur);
    };
    const onDiagnosticSaved = () => {
      triggerCelebrationSpinAndStars('Baseline calibrated! Your personalized plan is live.');
      if (celebrationTimerRef.current !== null) window.clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = window.setTimeout(() => {
        setIsCelebrating(false);
        celebrationTimerRef.current = null;
      }, BARNABY_CELEBRATION_DURATION_MS);
    };
    window.addEventListener(BARNABY_CELEBRATION_EVENT, onCelebrate);
    window.addEventListener('bandsprint_diagnostic_saved', onDiagnosticSaved);
    return () => {
      window.removeEventListener(BARNABY_CELEBRATION_EVENT, onCelebrate);
      window.removeEventListener('bandsprint_diagnostic_saved', onDiagnosticSaved);
      if (celebrationTimerRef.current !== null) window.clearTimeout(celebrationTimerRef.current);
    };
  }, [triggerCelebrationSpinAndStars]);

  // Daily Goal Transition Monitor -> Triggers joyful 'happy' celebratory spin when today's goal is met
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncDailyGoal = () => {
      const nextEval = evaluateDailyGoalProgress(
        loadDailySprintProgress(),
        getCompletedMissionsToday(getStreakState()).length
      );
      setDailyGoalEval(nextEval);
      if (!prevDailyGoalMetRef.current && nextEval.isDailyGoalMet) {
        triggerCelebrationSpinAndStars(`Daily goal met! ${nextEval.metSummary}`);
      }
      prevDailyGoalMetRef.current = nextEval.isDailyGoalMet;
    };

    window.addEventListener(DAILY_SPRINT_SAVED_EVENT, syncDailyGoal);
    window.addEventListener(DAILY_SPRINT_SYNCED_EVENT, syncDailyGoal);
    window.addEventListener('bandsprint_tasks_updated', syncDailyGoal);
    window.addEventListener('bandsprint_streak_updated', syncDailyGoal);
    window.addEventListener(LEARNING_PATH_UPDATED_EVENT, syncDailyGoal);
    return () => {
      window.removeEventListener(DAILY_SPRINT_SAVED_EVENT, syncDailyGoal);
      window.removeEventListener(DAILY_SPRINT_SYNCED_EVENT, syncDailyGoal);
      window.removeEventListener('bandsprint_tasks_updated', syncDailyGoal);
      window.removeEventListener('bandsprint_streak_updated', syncDailyGoal);
      window.removeEventListener(LEARNING_PATH_UPDATED_EVENT, syncDailyGoal);
    };
  }, [triggerCelebrationSpinAndStars]);

  // Circadian greeting on initial mount
  const circadianGreetedRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined' || circadianGreetedRef.current || isMinimized) return;
    circadianGreetedRef.current = true;

    const timer = window.setTimeout(() => {
      const hour = new Date().getHours();
      const displayName = user ? sanitizeCandidateName(user.name, user.email) : 'Candidate';
      let greet = '';
      if (hour >= 5 && hour < 12) {
        greet = `Good morning, ${displayName}! Let's lock in Band 8+ today ☀️`;
      } else if (hour >= 12 && hour < 17) {
        greet = `Good afternoon, ${displayName}! 15 minutes of spaced practice keeps your edge sharp ⚡`;
      } else if (hour >= 17 && hour < 22) {
        greet = `Evening sprint, ${displayName}! Reviewing phrases before bed cements memory 🌙`;
      } else {
        greet = `Midnight scholar, ${displayName}! Deep sleep consolidates IELTS vocabulary 🌟`;
      }
      showMicroBubble(greet, 4200);
    }, 950);

    return () => window.clearTimeout(timer);
  }, [isMinimized, showMicroBubble, user]);

  // Study Fatigue Monitor (35 continuous minutes)
  const sessionStartRef = useRef(Date.now());
  const lastFatigueNoticeRef = useRef(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fatigueTimer = window.setInterval(() => {
      const now = Date.now();
      if (
        now - sessionStartRef.current >= STUDY_FATIGUE_INTERVAL_MS &&
        now - lastFatigueNoticeRef.current >= 25 * 60 * 1000
      ) {
        lastFatigueNoticeRef.current = now;
        showMicroBubble('☕ 35 mins of deep focus! Take a quick 60-second eye rest.', 4600);
      }
    }, 30000);
    return () => window.clearInterval(fatigueTimer);
  }, [showMicroBubble]);

  // Reset route-scoped states cleanly on navigation
  useEffect(() => {
    setIsWritingTypingSleep(false);
    setPatrolDx(0);
    setAutonomousPhase('settling');
    registerActivity();
  }, [normalizedPath, registerActivity]);

  // Inactivity (5-minute 'encouraging' trigger), auto-disappear dwell clock & Writing typing sleep monitor
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onWindowActivity = () => {
      lastInteractionTsRef.current = Date.now();
      encouragementNotifiedRef.current = false;
      setUserInactiveMs(0);
      setEncouragementWindowActive(false);
      if (encouragementHideTimerRef.current !== null) {
        window.clearTimeout(encouragementHideTimerRef.current);
        encouragementHideTimerRef.current = null;
      }
      if (isDeepSleeping) {
        setIsDeepSleeping(false);
        setAutonomousPhase('settling');
      }
    };

    const onWritingKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isWritingSurface =
        normalizedPath.startsWith('/practice/writing') ||
        normalizedPath.startsWith('/learn/argument-matrix');
      if (
        isWritingSurface &&
        target &&
        (target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        setIsWritingTypingSleep(true);
        setAutonomousPhase('sleeping');
        if (writingIdleWakeTimerRef.current !== null) {
          window.clearTimeout(writingIdleWakeTimerRef.current);
        }
        writingIdleWakeTimerRef.current = window.setTimeout(() => {
          setIsWritingTypingSleep(false);
          setAutonomousPhase('settling');
          writingIdleWakeTimerRef.current = null;
        }, WRITING_TYPING_IDLE_WAKE_MS);
      }
    };

    window.addEventListener('pointerdown', onWindowActivity, { passive: true });
    window.addEventListener('keydown', onWindowActivity, { passive: true });
    window.addEventListener('keydown', onWritingKeyDown, { passive: true });
    window.addEventListener('touchstart', onWindowActivity, { passive: true });
    window.addEventListener('scroll', onWindowActivity, { passive: true });

    const idleCheckTimer = window.setInterval(() => {
      const now = Date.now();
      const idleMs = now - lastInteractionTsRef.current;
      const compIdleMs = now - lastBarnabyActiveTsRef.current;

      setUserInactiveMs(idleMs);
      setCompanionIdleMs(compIdleMs);

      if (isDragging || isDrawerOpen || isMinimized || isCelebrating || isEnergetic) return;

      // 5+ minutes of user inactivity -> wake Barnaby into 'encouraging' idle mood!
      if (idleMs >= BARNABY_INACTIVITY_ENCOURAGE_MS && !encouragementNotifiedRef.current) {
        encouragementNotifiedRef.current = true;
        setIsDeepSleeping(false);
        setAutonomousPhase('settling');
        setEncouragementWindowActive(true);
        lastBarnabyActiveTsRef.current = now;
        setCompanionIdleMs(0);

        const prompt =
          BARNABY_ENCOURAGING_PROMPTS[
            encouragementPromptIdxRef.current % BARNABY_ENCOURAGING_PROMPTS.length
          ];
        encouragementPromptIdxRef.current += 1;
        showMicroBubble(prompt, 6200);

        if (encouragementHideTimerRef.current !== null) {
          window.clearTimeout(encouragementHideTimerRef.current);
        }
        encouragementHideTimerRef.current = window.setTimeout(() => {
          setEncouragementWindowActive(false);
          lastBarnabyActiveTsRef.current = Date.now() - BARNABY_AUTO_DISAPPEAR_MS;
          setCompanionIdleMs(BARNABY_AUTO_DISAPPEAR_MS);
          encouragementHideTimerRef.current = null;
        }, BARNABY_MOOD_APPEAR_DWELL_MS);
        return;
      }

      if (idleMs >= DEEP_SLEEP_IDLE_MS && idleMs < BARNABY_INACTIVITY_ENCOURAGE_MS && !isDeepSleeping) {
        setIsDeepSleeping(true);
      }
    }, 1000);

    return () => {
      window.removeEventListener('pointerdown', onWindowActivity);
      window.removeEventListener('keydown', onWindowActivity);
      window.removeEventListener('keydown', onWritingKeyDown);
      window.removeEventListener('touchstart', onWindowActivity);
      window.removeEventListener('scroll', onWindowActivity);
      window.clearInterval(idleCheckTimer);
      if (writingIdleWakeTimerRef.current !== null) {
        window.clearTimeout(writingIdleWakeTimerRef.current);
      }
    };
  }, [
    isCelebrating,
    isDeepSleeping,
    isDragging,
    isDrawerOpen,
    isEnergetic,
    isMinimized,
    normalizedPath,
    showMicroBubble,
  ]);

  // Visible Autonomous 7-Activity Feline State Machine Loop:
  // settling (2.5s thinking) -> walking_out (bottom-ledge patrol left) -> paw_licking (4.8s grooming)
  // -> walking_back (to home dock) -> bored (5.5s half-lidded tail flick) -> sleeping (7.5s curled nap) -> repeat
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      isMinimized ||
      isDragging ||
      isDrawerOpen ||
      isDeepSleeping ||
      isWritingTypingSleep ||
      isEnergetic ||
      isCelebrating ||
      isSpeakingCue ||
      isExternalSpeaking ||
      isSelectionThinking ||
      analyzingState.isAnalyzing
    ) {
      if (walkRafRef.current !== null) {
        cancelAnimationFrame(walkRafRef.current);
        walkRafRef.current = null;
      }
      if (phaseTimerRef.current !== null) {
        window.clearTimeout(phaseTimerRef.current);
        phaseTimerRef.current = null;
      }
      return;
    }

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    if (autonomousPhase === 'settling') {
      phaseTimerRef.current = window.setTimeout(() => {
        phaseTimerRef.current = null;
        if (patrolDxRef.current < -16) {
          setAutonomousPhase('walking_back');
        } else {
          setAutonomousPhase('walking_out');
        }
      }, SETTLING_DURATION_MS);
      return () => {
        if (phaseTimerRef.current !== null) {
          window.clearTimeout(phaseTimerRef.current);
          phaseTimerRef.current = null;
        }
      };
    }

    if (autonomousPhase === 'paw_licking') {
      phaseTimerRef.current = window.setTimeout(() => {
        phaseTimerRef.current = null;
        setAutonomousPhase('walking_back');
      }, PAW_LICK_DURATION_MS);
      return () => {
        if (phaseTimerRef.current !== null) {
          window.clearTimeout(phaseTimerRef.current);
          phaseTimerRef.current = null;
        }
      };
    }

    if (autonomousPhase === 'bored') {
      phaseTimerRef.current = window.setTimeout(() => {
        phaseTimerRef.current = null;
        setAutonomousPhase('sleeping');
      }, BORED_PHASE_DURATION_MS);
      return () => {
        if (phaseTimerRef.current !== null) {
          window.clearTimeout(phaseTimerRef.current);
          phaseTimerRef.current = null;
        }
      };
    }

    if (autonomousPhase === 'sleeping') {
      phaseTimerRef.current = window.setTimeout(() => {
        phaseTimerRef.current = null;
        setAutonomousPhase('settling');
      }, SLEEP_PHASE_DURATION_MS);
      return () => {
        if (phaseTimerRef.current !== null) {
          window.clearTimeout(phaseTimerRef.current);
          phaseTimerRef.current = null;
        }
      };
    }

    // Active directional walking strictly within the empty right-hand viewport gutter outside content cards/text
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw < 768;
    const effWidth = isMobile ? 76 : 96;
    const effHeight = isMobile ? 76 : 96;
    const rightInset = isMobile ? 12 : 16;
    const bottomInset = isMobile ? 76 : 16;
    const baseAnchorX = vw - effWidth - rightInset + dragOffset.dx;
    const barnabyTopY = vh - bottomInset - effHeight + dragOffset.dy;
    const barnabyBottomY = barnabyTopY + effHeight;

    let minLeftX = 16;
    // Measure active content containers & cards so patrol NEVER overlaps card copy or buttons
    if (typeof document !== 'undefined') {
      const protectedNodes = document.querySelectorAll<HTMLElement>(
        '[data-testid="daily-command-center-hero"], main .max-w-6xl, main .max-w-5xl, main .max-w-4xl, main .max-w-3xl, main section, main article'
      );
      protectedNodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const overlapsVertically =
          barnabyTopY < rect.bottom + 16 && barnabyBottomY > rect.top - 16;
        if (overlapsVertically) {
          minLeftX = Math.max(minLeftX, Math.ceil(rect.right + 16));
        }
      });
    }

    const maxRightX = vw - effWidth - rightInset;
    const safeMinLeftX = Math.min(maxRightX, minLeftX);
    const minRelDx = Math.min(0, safeMinLeftX - baseAnchorX);
    const maxRelDx = Math.min(0, maxRightX - baseAnchorX);
    const availableSpan =
      baseAnchorX >= minLeftX ? Math.max(0, maxRelDx - minRelDx) : 0;

    const startDx = patrolDxRef.current;
    let targetDx = 0;

    if (autonomousPhase === 'walking_out') {
      // Never patrol horizontally on mobile or whenever there is no clear empty gutter outside content cards
      if (isMobile || availableSpan < 64) {
        if (patrolDxRef.current !== 0) {
          patrolDxRef.current = 0;
          setPatrolDx(0);
        }
        setAutonomousPhase('paw_licking');
        return;
      }
      const legDistRatio = 0.45 + Math.random() * 0.25;
      targetDx = Math.max(minRelDx, Math.round(-availableSpan * legDistRatio));
    } else {
      targetDx = 0;
    }

    if (Math.abs(targetDx - startDx) < 10) {
      patrolDxRef.current = targetDx;
      setPatrolDx(targetDx);
      setAutonomousPhase(autonomousPhase === 'walking_out' ? 'paw_licking' : 'bored');
      return;
    }

    setFacingDirection(targetDx < startDx ? 'left' : 'right');
    let curDx = startDx;
    let lastTs = performance.now();
    let localStridePhase = 0;
    const totalLegDistance = Math.max(12, Math.abs(targetDx - startDx));
    const baseWalkSpeedPxPerSec = 42;

    const stepWalk = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.004, (now - lastTs) / 1000));
      lastTs = now;
      const diff = targetDx - curDx;
      const traveled = Math.abs(curDx - startDx);
      const progress = Math.max(0, Math.min(1, traveled / totalLegDistance));

      // Smooth ease-in at start of patrol & ease-out before stopping/turning
      const easeEnvelope = 0.52 + 0.62 * Math.sin(progress * Math.PI);
      localStridePhase += dt * BARNABY_STRIDE_BASE_OMEGA * easeEnvelope;
      // Subtle per-step paw push-off surge so horizontal movement feels physically driven by his paws
      const pawPushModulation = 1 + 0.14 * Math.sin(localStridePhase * 2);

      setWalkSpeedFactor(Number(easeEnvelope.toFixed(2)));
      setPhase(localStridePhase);
      const step = baseWalkSpeedPxPerSec * easeEnvelope * pawPushModulation * dt;

      if (Math.abs(diff) <= step + 0.6) {
        curDx = targetDx;
        patrolDxRef.current = curDx;
        setPatrolDx(curDx);
        setWalkSpeedFactor(1);
        setPhase(0);
        walkRafRef.current = null;
        setAutonomousPhase(autonomousPhase === 'walking_out' ? 'paw_licking' : 'bored');
        return;
      }

      curDx += Math.sign(diff) * step;
      patrolDxRef.current = curDx;
      setPatrolDx(curDx);
      walkRafRef.current = requestAnimationFrame(stepWalk);
    };

    walkRafRef.current = requestAnimationFrame(stepWalk);
    return () => {
      if (walkRafRef.current !== null) {
        cancelAnimationFrame(walkRafRef.current);
        walkRafRef.current = null;
      }
    };
  }, [
    analyzingState.isAnalyzing,
    autonomousPhase,
    dragOffset.dx,
    dragOffset.dy,
    isCelebrating,
    isDeepSleeping,
    isDragging,
    isDrawerOpen,
    isEnergetic,
    isExternalSpeaking,
    isMinimized,
    isSelectionThinking,
    isSpeakingCue,
    isWritingTypingSleep,
    normalizedPath,
  ]);

  // Snap patrol back to the clean viewport dock on route change or viewport resize
  useEffect(() => {
    patrolDxRef.current = 0;
    setPatrolDx(0);
    setAutonomousPhase('settling');

    const handleViewportResize = () => {
      if (patrolDxRef.current !== 0) {
        patrolDxRef.current = 0;
        setPatrolDx(0);
        setAutonomousPhase('settling');
      }
    };
    window.addEventListener('resize', handleViewportResize, { passive: true });
    return () => window.removeEventListener('resize', handleViewportResize);
  }, [normalizedPath]);

  // Monitor the `phase` of Barnaby's walking stride and emit a small `div` (puff of dust)
  // with the `animate-barnaby-particle` class at the current `pawX` and `pawY` coordinates
  // whenever `Math.sin(phase)` reaches its peak, removing the DOM element after 1.3s (1300ms).
  useEffect(() => {
    const isWalkingNow =
      autonomousPhase === 'walking_out' || autonomousPhase === 'walking_back';
    if (!isWalkingNow || isDragging || isMinimized || phase <= 0) {
      lastPeakCycleRef.current = -1;
      return;
    }

    const container = characterBoxRef.current;
    if (!container || typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    const sinVal = Math.sin(phase);
    // Math.sin(phase) reaches its peak (+1.0) once per 2*PI cycle around phase = PI/2 + 2*k*PI
    const cycleIndex = Math.floor((phase + Math.PI * 0.5) / (Math.PI * 2));
    if (sinVal >= 0.92 && cycleIndex > lastPeakCycleRef.current) {
      lastPeakCycleRef.current = cycleIndex;

      const boxW = container.clientWidth || 76;
      const boxH = container.clientHeight || 76;
      const pawX = Math.round(
        facingDirection === 'left' ? boxW * 0.34 : boxW * 0.66
      );
      const pawY = Math.round(boxH * 0.86);

      const dustDiv = document.createElement('div');
      dustDiv.className =
        'animate-barnaby-particle pointer-events-none select-none absolute w-2.5 h-2.5 rounded-full bg-[#1F8A70]/25 dark:bg-[#6EE7B7]/25 z-20';
      dustDiv.setAttribute('data-testid', 'barnaby-stride-dust-puff');
      dustDiv.style.left = `${pawX}px`;
      dustDiv.style.top = `${pawY}px`;
      container.appendChild(dustDiv);

      const removeTimer = window.setTimeout(() => {
        activeParticleTimeoutsRef.current.delete(removeTimer);
        if (dustDiv.parentNode) {
          dustDiv.parentNode.removeChild(dustDiv);
        }
      }, 1300);
      activeParticleTimeoutsRef.current.add(removeTimer);
    }
  }, [autonomousPhase, facingDirection, isDragging, isMinimized, phase]);

  useEffect(() => {
    const timeouts = activeParticleTimeoutsRef.current;
    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
      timeouts.clear();
    };
  }, []);

  // Cursor Gaze-Tracking Effect: updates Barnaby's head rotation (`barnaby-rig-look-head`)
  // slightly based on the cursor's proximity and angle relative to his container, giving
  // the illusion he is watching mouse movement across the dashboard.
  useEffect(() => {
    if (typeof window === 'undefined' || isMinimized) return;
    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let rafId: number | null = null;
    let latestClientX = 0;
    let latestClientY = 0;

    const applyGazeFromCursor = () => {
      rafId = null;
      const container = characterBoxRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const centerX = rect.left + rect.width * 0.5;
      const centerY = rect.top + rect.height * 0.42;
      const dx = latestClientX - centerX;
      const dy = latestClientY - centerY;
      const dist = Math.hypot(dx, dy);

      // Proximity falloff: strongest attention within 40px..420px, gently tapering across the dashboard (up to 960px)
      const maxTrackingRadius = 960;
      const proximity = Math.max(0, Math.min(1, 1 - dist / maxTrackingRadius));
      const weightedProximity = proximity * (0.35 + 0.65 * proximity);

      const normX = Math.max(-1, Math.min(1, dx / 260));
      const normY = Math.max(-1, Math.min(1, dy / 220));

      // Subtle head rotation (-8.5deg to +8.5deg) and micro-gaze shift (-2.4px to +2.4px)
      const nextRotDeg = Number(
        ((normX * 6.5 + normY * 2.0 * (normX >= 0 ? 1 : -1)) * weightedProximity).toFixed(2)
      );
      const nextOffsetX = Number((normX * 2.4 * weightedProximity).toFixed(2));
      const nextOffsetY = Number((normY * 1.8 * weightedProximity).toFixed(2));

      setGazeRotationDeg((prev) => (Math.abs(prev - nextRotDeg) >= 0.12 ? nextRotDeg : prev));
      setGazeOffset((prev) =>
        Math.abs(prev.x - nextOffsetX) >= 0.1 || Math.abs(prev.y - nextOffsetY) >= 0.1
          ? { x: nextOffsetX, y: nextOffsetY }
          : prev
      );

      // Also update any `.barnaby-rig-look-head` node inside the container directly for instant 60fps response
      const lookHeadEl = container.querySelector<HTMLElement>('.barnaby-rig-look-head');
      if (lookHeadEl) {
        lookHeadEl.dataset.gazeTracking = weightedProximity > 0.02 ? 'true' : 'false';
        lookHeadEl.dataset.gazeRotation = String(nextRotDeg);
        lookHeadEl.style.setProperty('--barnaby-gaze-rotate', `${nextRotDeg}deg`);
        lookHeadEl.style.setProperty('--barnaby-gaze-x', `${nextOffsetX}px`);
        lookHeadEl.style.setProperty('--barnaby-gaze-y', `${nextOffsetY}px`);
      }
    };

    const handlePointerMove = (e: PointerEvent | MouseEvent) => {
      latestClientX = e.clientX;
      latestClientY = e.clientY;
      if (rafId === null) {
        rafId = window.requestAnimationFrame(applyGazeFromCursor);
      }
    };

    const handlePointerLeaveWindow = () => {
      setGazeRotationDeg(0);
      setGazeOffset({ x: 0, y: 0 });
      const container = characterBoxRef.current;
      const lookHeadEl = container?.querySelector<HTMLElement>('.barnaby-rig-look-head');
      if (lookHeadEl) {
        lookHeadEl.dataset.gazeTracking = 'false';
        lookHeadEl.dataset.gazeRotation = '0';
        lookHeadEl.style.setProperty('--barnaby-gaze-rotate', '0deg');
        lookHeadEl.style.setProperty('--barnaby-gaze-x', '0px');
        lookHeadEl.style.setProperty('--barnaby-gaze-y', '0px');
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeaveWindow);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('mouseleave', handlePointerLeaveWindow);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [isMinimized]);

  // Live BandSprint Study Event Reactions
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onMistakeUpserted = () => {
      registerActivity();
      setHopSignal((n) => n + 1);
      showMicroBubble('Logged to Mistake Vault. Fixing traps builds Band 8+!', 3800);
    };
    const onStreakUpdated = () => {
      triggerEnergeticBurst(ENERGETIC_DURATION_MS);
      showMicroBubble('Daily streak extended! Keep that momentum alive 🎯', 3800);
    };
    const onTasksUpdated = () => {
      showMicroBubble('Study tasks updated! You’re crushing it ✨', 3500);
    };
    const onTopWeaknessUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ topic?: string; skill?: string }>).detail;
      const label = detail?.topic || detail?.skill || 'focus area';
      showMicroBubble(`New mission: ${label}. Let’s conquer it!`, 3800);
    };
    const onSpellingSaved = () => {
      showMicroBubble('Spelling drill verified! Clean orthography saves marks ✨', 3500);
    };
    const onDrillCorrect = () => {
      triggerEnergeticBurst(ENERGETIC_DURATION_MS);
      showMicroBubble('Boom! Band 8.5 precision right there 🎯', 3000);
    };
    const onDrillMistake = () => {
      showMicroBubble('Close one! Check the distractor cue before moving on.', 3500);
    };
    const onWritingWordCount = (e: Event) => {
      const detail = (e as CustomEvent<{ count?: number }>).detail;
      if (detail?.count === 150) {
        triggerEnergeticBurst(2400);
        showMicroBubble('150 words hit! Task 1 minimum unlocked ✍️', 3800);
      } else if (detail?.count === 250) {
        triggerEnergeticBurst(ENERGETIC_DURATION_MS);
        showMicroBubble('250 words hit! Task 2 target unlocked 🏆', 4000);
      }
    };

    let selectionTimer: number | null = null;
    const onSelectionChange = () => {
      if (selectionTimer !== null) window.clearTimeout(selectionTimer);
      selectionTimer = window.setTimeout(() => {
        const activeEl = document.activeElement;
        if (
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            (activeEl as HTMLElement).isContentEditable)
        ) {
          return;
        }
        const sel = window.getSelection()?.toString().trim();
        if (sel && sel.length >= 3 && sel.length <= 35 && !sel.includes('\n')) {
          const truncated = sel.length > 18 ? sel.slice(0, 18) + '...' : sel;
          setIsSelectionThinking(true);
          if (selectionThinkingTimerRef.current !== null) {
            window.clearTimeout(selectionThinkingTimerRef.current);
          }
          selectionThinkingTimerRef.current = window.setTimeout(() => {
            setIsSelectionThinking(false);
            selectionThinkingTimerRef.current = null;
          }, 3600);
          showMicroBubble(`Want Band 8+ synonyms for "${truncated}"? Tap me!`, 3600);
        }
      }, 850);
    };

    const onPomodoroCompleted = (e: Event) => {
      const detail = (e as CustomEvent<{ minutes?: number; blocks?: number }>).detail;
      const mins = detail?.minutes ?? 25;
      triggerCelebrationSpinAndStars(
        `Pomodoro focus sprint complete (+${mins}m)! Time for a breather or the Daily Mastery Exam 🌟`
      );
    };
    const onMasteryExamCompleted = (e: Event) => {
      const detail = (e as CustomEvent<{ scorePct?: number; bandEst?: number }>).detail;
      const score = detail?.scorePct ?? 100;
      triggerCelebrationSpinAndStars(
        `Daily Mastery Exam conquered (${score}%)! সাবাশ! Band 8+ momentum locked in 🏆✨`
      );
    };

    window.addEventListener('bandsprint_mistake_upserted', onMistakeUpserted);
    window.addEventListener('bandsprint_streak_updated', onStreakUpdated);
    window.addEventListener('bandsprint_tasks_updated', onTasksUpdated);
    window.addEventListener(TOP_WEAKNESS_UPDATED_EVENT, onTopWeaknessUpdated);
    window.addEventListener('bandsprint_spelling_progress_saved', onSpellingSaved);
    window.addEventListener('bandsprint_drill_correct', onDrillCorrect);
    window.addEventListener('bandsprint_drill_mistake', onDrillMistake);
    window.addEventListener('bandsprint_writing_word_count', onWritingWordCount);
    window.addEventListener('bandsprint_pomodoro_completed', onPomodoroCompleted);
    window.addEventListener('bandsprint_mastery_exam_completed', onMasteryExamCompleted);
    document.addEventListener('selectionchange', onSelectionChange);

    return () => {
      window.removeEventListener('bandsprint_mistake_upserted', onMistakeUpserted);
      window.removeEventListener('bandsprint_streak_updated', onStreakUpdated);
      window.removeEventListener('bandsprint_tasks_updated', onTasksUpdated);
      window.removeEventListener(TOP_WEAKNESS_UPDATED_EVENT, onTopWeaknessUpdated);
      window.removeEventListener('bandsprint_spelling_progress_saved', onSpellingSaved);
      window.removeEventListener('bandsprint_drill_correct', onDrillCorrect);
      window.removeEventListener('bandsprint_drill_mistake', onDrillMistake);
      window.removeEventListener('bandsprint_writing_word_count', onWritingWordCount);
      window.removeEventListener('bandsprint_pomodoro_completed', onPomodoroCompleted);
      window.removeEventListener('bandsprint_mastery_exam_completed', onMasteryExamCompleted);
      document.removeEventListener('selectionchange', onSelectionChange);
      if (selectionTimer !== null) window.clearTimeout(selectionTimer);
    };
  }, [registerActivity, showMicroBubble, triggerCelebrationSpinAndStars, triggerEnergeticBurst]);

  // Ambient study tips only while Barnaby is actively visible & awake
  const isSleepActive =
    isDeepSleeping || isWritingTypingSleep || autonomousPhase === 'sleeping';
  const isBoredActive = !isSleepActive && autonomousPhase === 'bored';

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      isMinimized ||
      isSleepActive ||
      isBoredActive ||
      companionIdleMs >= BARNABY_AUTO_DISAPPEAR_MS
    ) {
      return;
    }
    if (prefersReducedMotion) return;

    const timer = window.setInterval(() => {
      if (isSleepActive || isDrawerOpen || isBoredActive) return;
      if (Date.now() - lastBarnabyActiveTsRef.current >= BARNABY_AUTO_DISAPPEAR_MS) return;
      setTipIndex((prev) => {
        const next = (prev + 1) % AMBIENT_TIPS.length;
        showMicroBubble(AMBIENT_TIPS[next], MICRO_BUBBLE_DURATION_MS);
        return next;
      });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [
    companionIdleMs,
    isBoredActive,
    isDrawerOpen,
    isMinimized,
    isSleepActive,
    prefersReducedMotion,
    showMicroBubble,
  ]);

  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current !== null) window.clearTimeout(celebrationTimerRef.current);
      if (energeticTimerRef.current !== null) window.clearTimeout(energeticTimerRef.current);
      if (purrTimerRef.current !== null) window.clearTimeout(purrTimerRef.current);
      if (bubbleTimerRef.current !== null) window.clearTimeout(bubbleTimerRef.current);
      if (drawerTimerRef.current !== null) window.clearTimeout(drawerTimerRef.current);
      if (writingIdleWakeTimerRef.current !== null) {
        window.clearTimeout(writingIdleWakeTimerRef.current);
      }
      if (selectionThinkingTimerRef.current !== null) {
        window.clearTimeout(selectionThinkingTimerRef.current);
      }
      if (encouragementHideTimerRef.current !== null) {
        window.clearTimeout(encouragementHideTimerRef.current);
      }
      if (phaseTimerRef.current !== null) window.clearTimeout(phaseTimerRef.current);
      if (walkRafRef.current !== null) cancelAnimationFrame(walkRafRef.current);
    };
  }, []);

  const mode: BarnabyMode = useMemo(
    () =>
      resolveBarnabyMode({
        globalExamActive,
        currentPath: normalizedPath,
        isCelebrating: isCelebrating || isEnergetic,
        isDrawerOpen,
        timedPaths: TIMED_EXAM_PATHS,
      }),
    [globalExamActive, normalizedPath, isCelebrating, isEnergetic, isDrawerOpen]
  );

  // Strict unmounting during timed IELTS exams or Hidden preference
  if (mode === 'focus' || visibility === 'hidden_focus_only') {
    return null;
  }

  const diagnostic = loadDiagnosticResult();
  const agg = aggregateExamHistory(user?.progress?.examHistory || []);
  const currentEstimate =
    agg.overall.latest ??
    validateOptionalHalfBand(diagnostic?.scores?.overall, 1.0) ??
    validateOptionalHalfBand(user?.progress?.currentBandEstimate, 1.0);
  const targetBand = diagnostic?.targetBand || user?.progress?.targetBand || 7.5;
  const topWeakness =
    getTopWeakness() || diagnostic?.weakest || user?.progress?.weakestSkill || null;
  const userName = user ? sanitizeCandidateName(user.name, user.email) : 'Candidate';
  const streak = getStreakState();
  const daysInactive = computeDaysInactive(streak.lastActiveDate);
  const allDailyTasksCompleted = getCompletedMissionsToday(streak).length >= 3;

  const baseExpression = resolveBarnabyExpression({
    mode,
    isAnalyzing: analyzingState.isAnalyzing,
    isDrawerOpen,
    currentEstimate,
    targetBand,
    daysInactive,
    allDailyTasksCompleted,
    topWeakness,
  });

  const moodResolution = resolveBarnabyMoodMachine({
    dailyGoalMet: dailyGoalEval.isDailyGoalMet || allDailyTasksCompleted,
    isCelebrating: isCelebrating || isCelebratingSpin,
    userInactiveMs,
    companionIdleMs,
    isUserEngagedWithBarnaby:
      isHoveredOnBarnaby ||
      isDragging ||
      isDrawerOpen ||
      isSpeakingCue ||
      isExternalSpeaking,
    isAnalyzingOrFocused: analyzingState.isAnalyzing || isSelectionThinking,
    isManuallyMinimized: isMinimized,
    encouragementWindowActive,
  });

  // Resolve active feline behavior layered with the Mood State Machine
  const activeFelineBehavior: BarnabyFelineBehavior =
    moodResolution.mood === 'happy' && moodResolution.shouldSpin
      ? 'energetic'
      : moodResolution.mood === 'encouraging'
      ? 'hovering'
      : isCelebrating || isEnergetic || isPurring
      ? 'energetic'
      : isSpeakingCue || isExternalSpeaking
      ? 'speaking'
      : isDrawerOpen || analyzingState.isAnalyzing || isSelectionThinking
      ? 'thinking'
      : isSleepActive
      ? 'sleeping'
      : isBoredActive
      ? 'bored'
      : autonomousPhase === 'walking_out' || autonomousPhase === 'walking_back'
      ? 'walking'
      : autonomousPhase === 'paw_licking'
      ? 'paw-licking'
      : 'thinking';

  const expression: BarnabyExpression =
    moodResolution.mood === 'happy' && moodResolution.shouldSpin
      ? 'celebrating'
      : moodResolution.mood === 'encouraging'
      ? 'encouraging'
      : activeFelineBehavior === 'sleeping'
      ? 'sleepy'
      : activeFelineBehavior === 'energetic'
      ? 'excited'
      : activeFelineBehavior === 'speaking'
      ? 'welcoming'
      : activeFelineBehavior === 'bored'
      ? 'sleepy'
      : isDragging
      ? 'playful'
      : baseExpression;

  const animationState: BarnabyAnimationState =
    moodResolution.mood === 'happy' && moodResolution.shouldSpin
      ? 'celebratory'
      : moodResolution.mood === 'encouraging'
      ? 'idle'
      : activeFelineBehavior === 'sleeping'
      ? 'sleeping'
      : activeFelineBehavior === 'energetic'
      ? 'energetic'
      : activeFelineBehavior === 'paw-licking'
      ? 'paw-licking'
      : activeFelineBehavior === 'walking'
      ? 'walking'
      : activeFelineBehavior === 'bored'
      ? 'bored'
      : activeFelineBehavior === 'speaking'
      ? 'speaking'
      : 'thinking';

  const moodState: BarnabyMoodState =
    moodResolution.mood === 'happy'
      ? 'celebratory'
      : moodResolution.mood === 'encouraging'
      ? 'encouraging'
      : activeFelineBehavior === 'energetic'
      ? 'celebratory'
      : activeFelineBehavior === 'sleeping'
      ? 'sleepy'
      : activeFelineBehavior === 'bored'
      ? 'bored'
      : analyzingState.isAnalyzing || isDrawerOpen
      ? 'focused'
      : 'neutral';

  const showCollapsedCrest = isMinimized || visibility === 'minimal_badge';
  const screenCtx = getBarnabyScreenContext();

  // Compute safe horizontal render offset combining manual drag + smooth bottom-ledge patrol (zero snapping)
  const combinedDx = Math.round(dragOffset.dx + patrolDx);
  const shouldPlayHappySpin = !prefersReducedMotion && (moodResolution.shouldSpin || isCelebratingSpin);
  const shouldPlayEncouragingIdle =
    !prefersReducedMotion && !shouldPlayHappySpin && moodResolution.shouldEncourageIdle;

  return (
    <>
      {showCollapsedCrest ? (
        <div
          data-testid="floating-barnaby-docked"
          data-barnaby-mode={mode}
          data-barnaby-mood-machine={moodResolution.mood}
          data-barnaby-dock-side={dockSide}
          className="fixed right-3 bottom-[76px] md:right-4 md:bottom-4 z-30 select-none"
        >
          <button
            type="button"
            data-testid="floating-barnaby-crest-badge"
            onClick={() => {
              touchBarnabyPresence();
              if (visibility === 'minimal_badge') {
                handleSingleTap();
              } else {
                toggleMinimized(false);
              }
            }}
            aria-label={
              visibility === 'minimal_badge'
                ? 'Open Ask Barnaby tutor drawer'
                : 'Wake floating Barnaby companion'
            }
            title="Tap to wake Barnaby"
            className="w-11 h-11 rounded-full bg-[#134E41]/95 dark:bg-[#0D3A30]/95 border border-[#F59E0B]/70 shadow-[0_8px_22px_rgba(19,78,65,0.38)] backdrop-blur-md flex items-center justify-center hover:scale-105 hover:border-[#FDE68A] transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
          >
            <BarnabyCrest
              size={24}
              variant="inline"
              animated={mode === 'celebration' || analyzingState.isAnalyzing}
            />
          </button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {moodResolution.isVisible ? (
            <motion.div
              key="floating-barnaby-active"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.84, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.72, y: 18 }}
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Strictly viewport-clamped frosted micro-bubble above the corner dock */}
              <div
                data-testid="floating-barnaby-micro-bubble"
                aria-live="polite"
                className={`pointer-events-none fixed right-3 bottom-[164px] md:right-4 md:bottom-[128px] max-w-[calc(100vw-24px)] z-30 transition-all duration-300 ease-out ${
                  microBubbleText && !isDragging
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-1.5 scale-95'
                }`}
              >
                {microBubbleText && (
                  <div className="backdrop-blur-md bg-white/92 dark:bg-slate-900/92 text-[#0E1F1E] dark:text-[#EEF3F1] text-xs font-medium px-3 py-1.5 rounded-2xl shadow-md border border-[#134E41]/15 max-w-full sm:max-w-xs flex items-center gap-1.5 pointer-events-auto">
                    <span className="leading-snug break-words">{microBubbleText}</span>
                    <button
                      type="button"
                      data-no-drag="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        touchBarnabyPresence();
                        handleToggleSpeakCue();
                      }}
                      aria-label={isSpeakingCue ? 'Stop Barnaby voice' : 'Listen to Barnaby'}
                      title={isSpeakingCue ? 'Stop Barnaby voice' : 'Tap to hear Barnaby'}
                      className={`p-1 rounded-full transition-colors cursor-pointer shrink-0 ${
                        isSpeakingCue
                          ? 'bg-[#134E41]/15 text-[#134E41] dark:bg-[#10B981]/25 dark:text-[#6EE7B7]'
                          : 'text-[#566664] hover:text-[#134E41] dark:hover:text-[#F59E0B]'
                      }`}
                    >
                      {isSpeakingCue ? (
                        <VolumeX className="w-3.5 h-3.5" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Safe-zone bottom ledge strictly below green hero card stat row */}
              <div
                data-testid="floating-barnaby-root"
                data-barnaby-mode={mode}
                data-barnaby-mood-machine={moodResolution.mood}
                data-barnaby-auto-hidden="false"
                data-barnaby-mood-state={moodState}
                data-barnaby-animation-state={animationState}
                data-barnaby-behavior={activeFelineBehavior}
                data-barnaby-facing={facingDirection}
                data-barnaby-expression={expression}
                data-barnaby-dragging={isDragging ? 'true' : 'false'}
                data-barnaby-dock-side={dockSide}
                onPointerEnter={handleHoverWake}
                onPointerLeave={handleHoverLeave}
                onPointerDown={handlers.onPointerDown}
                onPointerMove={handlers.onPointerMove}
                onPointerUp={handlers.onPointerUp}
                onPointerCancel={handlers.onPointerCancel}
                style={
                  {
                    transform: `translate3d(${combinedDx}px, ${dragOffset.dy}px, 0)`,
                    touchAction: 'none',
                    '--barnaby-stride-cycle': `${(
                      (Math.PI * 2) /
                      (BARNABY_STRIDE_BASE_OMEGA * Math.max(0.55, walkSpeedFactor))
                    ).toFixed(2)}s`,
                  } as React.CSSProperties
                }
                className="fixed right-3 bottom-[76px] md:right-4 md:bottom-4 z-30 select-none group"
              >
                <motion.div
                  ref={characterBoxRef}
                  role="button"
                  tabIndex={0}
                  data-testid="floating-barnaby-character"
                  data-barnaby-landing={isLandingToIdle ? 'true' : 'false'}
                  data-barnaby-celebrating-spin={shouldPlayHappySpin ? 'true' : 'false'}
                  data-barnaby-encouraging-idle={shouldPlayEncouragingIdle ? 'true' : 'false'}
                  onPointerMove={handlePettingPointerMove}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSingleTap();
                    }
                  }}
                  animate={
                    shouldPlayHappySpin
                      ? {
                          rotate: [0, -14, 360],
                          y: [0, -16, 0],
                          scale: [1, 1.12, 1],
                        }
                      : shouldPlayEncouragingIdle
                      ? {
                          rotate: [0, -5, 5, -3, 0],
                          y: [0, -5, 0],
                          scale: [1, 1.03, 1],
                        }
                      : isLandingToIdle
                      ? {
                          y: 2.5,
                          scaleX: 1.07,
                          scaleY: 0.91,
                          rotate: 0,
                        }
                      : {
                          y: 0,
                          scaleX: 1,
                          scaleY: 1,
                          scale: 1,
                          rotate: 0,
                        }
                  }
                  transition={
                    shouldPlayHappySpin
                      ? { duration: 0.78, ease: [0.22, 1, 0.36, 1] }
                      : shouldPlayEncouragingIdle
                      ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
                      : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
                  }
                  aria-label="Barnaby AI Companion. Tap to ask, double-tap for gold star burst, drag to move, or long-press to dock."
                  title="Tap to ask · Double-tap for gold star burst · Drag to move · Long-press to dock"
                  className={`relative w-[76px] h-[76px] sm:w-24 sm:h-24 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]/70 rounded-2xl ${
                    isLandingToIdle ? 'animate-barnaby-land' : ''
                  } ${
                    isDragging
                      ? 'cursor-grabbing'
                      : isSleepActive
                      ? 'cursor-pointer'
                      : 'cursor-grab'
                  }`}
                >
                  <BarnabyRig
                    expression={expression}
                    mode={mode}
                    felineBehavior={activeFelineBehavior}
                    animationState={animationState}
                    moodState={moodState}
                    locomotion={activeFelineBehavior === 'walking' ? 'walk' : 'stand'}
                    walkSpeedFactor={walkSpeedFactor}
                    facingDirection={facingDirection}
                    spokenText={microBubbleText}
                    speakSignal={speakCueSignal}
                    stopSpeakSignal={stopCueSignal}
                    enableVoiceCues={false}
                    onSpeakingChange={setIsSpeakingCue}
                    isSpeaking={isSpeakingCue || isExternalSpeaking}
                    interactive
                    dragVelocity={dragVelocity}
                    isDragging={isDragging}
                    hopSignal={hopSignal}
                    affectionSignal={affectionSignal}
                    isAffectionate={isEnergetic || moodResolution.mood === 'happy'}
                    isSleeping={isSleepActive && moodResolution.mood !== 'encouraging'}
                    isPurring={isPurring}
                    showCelestialStars
                    gazeRotationDeg={isSleepActive ? 0 : gazeRotationDeg}
                    gazeOffset={isSleepActive ? { x: 0, y: 0 } : gazeOffset}
                    testId="floating-barnaby-rig"
                    className="relative w-full h-full"
                    canvasClassName="w-[76px] h-[76px] sm:w-24 sm:h-24 pointer-events-none select-none"
                  />
                  <BarnabyPawDustEmitter
                    isWalking={activeFelineBehavior === 'walking'}
                    facingDirection={facingDirection}
                    walkSpeedFactor={walkSpeedFactor}
                    hopSignal={hopSignal + affectionSignal}
                    isDragging={isDragging}
                  />
                </motion.div>

                {/* Subtle Hover-Only Edge-Dock Action */}
                <button
                  type="button"
                  data-no-drag="true"
                  data-testid="floating-barnaby-dock-action"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMinimized(true);
                  }}
                  aria-label="Dock Barnaby to screen edge"
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-200 mx-auto -mt-1 flex items-center justify-center px-2 py-0.5 rounded-full backdrop-blur-md bg-white/85 dark:bg-slate-900/85 border border-[#134E41]/15 text-[10px] font-semibold text-[#566664] dark:text-slate-300 hover:text-[#134E41] dark:hover:text-[#F59E0B] shadow-xs cursor-pointer"
                >
                  Dock
                </button>
              </div>
            </motion.div>
          ) : (
            /* Quiet low-opacity edge summon crest after Barnaby automatically disappears */
            <motion.div
              key="floating-barnaby-auto-hidden"
              data-testid="floating-barnaby-auto-hidden"
              data-barnaby-mood-machine="auto_hidden"
              data-barnaby-auto-hidden="true"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.25 }}
              className="fixed right-3 bottom-[76px] md:right-4 md:bottom-4 z-30 select-none"
            >
              <button
                type="button"
                data-testid="floating-barnaby-summon-btn"
                onClick={() => {
                  touchBarnabyPresence();
                  setAutonomousPhase('settling');
                  showMicroBubble('Back whenever you need a Band 8 strategy check.', 3200);
                }}
                aria-label="Summon Barnaby study companion"
                title="Barnaby is resting out of the way · Tap to summon"
                className="w-9 h-9 rounded-full bg-white/70 dark:bg-[#11201E]/70 border border-[#D3DDDA] dark:border-[#1F8A70]/35 opacity-35 hover:opacity-100 focus-visible:opacity-100 backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:scale-105 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4A62A]"
              >
                <BarnabyCrest size={19} variant="inline" animated={false} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <BarnabyTutorDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          touchBarnabyPresence();
        }}
        onNavigate={onNavigate}
        userName={userName}
        currentEstimate={currentEstimate}
        targetBand={targetBand}
        examMode={examMode}
        topWeakness={topWeakness}
        screenContextOverride={screenCtx}
      />
    </>
  );
};
