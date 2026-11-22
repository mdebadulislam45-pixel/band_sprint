import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  Send,
  Volume2,
  Heart,
  Cookie,
  Zap,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  ArrowRight,
  Compass,
  Pause,
  Play,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Wind
} from 'lucide-react';
import {
  BarnabyCompanionState,
  BarnabyMessage,
  BARNABY_STATE_EVENT,
  loadBarnabyState,
  petBarnaby,
  feedBarnabyWordTreat,
  startBarnabyMiniQuiz,
  answerBarnabyMiniQuiz,
  rateBarnabyMessage,
  sendBarnabyChatMessage,
  clearBarnabyChat,
  toggleBarnabyFreeRoam,
  getBondStage,
  getContextualWhisper,
  getStudentContextSnapshot,
  generateContextAwareCoachTip
} from '../../services/barnabyCompanionStore';
import {
  BarnabyCompanionEventDetail,
  BarnabyFacing,
  BarnabyLocomotionState,
  BarnabyPoint,
  BARNABY_COMPANION_EVENT,
  clampBarnabyPosition,
  collectScreenObstacles,
  computeFacing,
  computeFlightDurationMs,
  computeWalkStepTarget,
  findNonObstructiveSpot,
  getBarnabySize,
  getSafeViewportBounds,
  pickApproachTarget,
  pickNextRoamTarget,
  pickRestPerch
} from '../../services/barnabyRoamEngine';
import { ACTIVE_USER_KEY } from '../../utils/userStorage';
import { soundManager } from '../../utils/audioEffects';
import { audioManager } from '../../services/AudioManager';
import {
  BarnabyAvatarState,
  BarnabyDragonAvatar,
  mapBarnabyMoodToAvatarState
} from './BarnabyDragonAvatar';

interface FloatingBarnabyProps {
  onNavigate?: (path: string) => void;
  currentPath?: string;
}

interface FloatingParticle {
  id: number;
  emoji: string;
  offsetX: number;
}

const getScopedUserKey = () => {
  try {
    return (typeof localStorage !== 'undefined' && localStorage.getItem(ACTIVE_USER_KEY)) || 'guest';
  } catch {
    return 'guest';
  }
};
const getRestSpotKey = () => `barnaby_rest_spot_v2_${getScopedUserKey()}`;
const getHiddenPrefKey = () => `barnaby_user_hidden_v2_${getScopedUserKey()}`;

function loadUserRestSpot(): BarnabyPoint | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getRestSpotKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

function saveUserRestSpot(pos: BarnabyPoint): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getRestSpotKey(), JSON.stringify({ x: Math.round(pos.x), y: Math.round(pos.y) }));
  } catch {
    // Ignore
  }
}

function loadUserHiddenPref(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(getHiddenPrefKey()) === '1';
  } catch {
    return false;
  }
}

function saveUserHiddenPref(hidden: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getHiddenPrefKey(), hidden ? '1' : '0');
  } catch {
    // Ignore
  }
}

export const FloatingBarnaby: React.FC<FloatingBarnabyProps> = ({
  onNavigate,
  currentPath = '/'
}) => {
  const [companion, setCompanion] = useState<BarnabyCompanionState>(() => loadBarnabyState(currentPath));
  const [isOpen, setIsOpen] = useState(false);
  const [isHiddenByExam, setIsHiddenByExam] = useState(false);
  const [isUserHidden, setIsUserHidden] = useState<boolean>(() => loadUserHiddenPref());
  const [isPageHidden, setIsPageHidden] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.hidden : false
  );
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const [expressionOverride, setExpressionOverride] = useState<BarnabyAvatarState | null>(null);

  // Viewport & full-body independent floating coordinates
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  }));

  const [pos, setPos] = useState<BarnabyPoint>(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
    const savedRest = loadUserRestSpot();
    if (savedRest) {
      return clampBarnabyPosition(savedRest, vw, vh);
    }
    const bounds = getSafeViewportBounds(vw, vh);
    return { x: bounds.maxX, y: Math.max(bounds.minY + 18, Math.round(bounds.minY + (bounds.maxY - bounds.minY) * 0.24)) };
  });

  const [locomotion, setLocomotion] = useState<BarnabyLocomotionState>('perched');
  const [facing, setFacing] = useState<BarnabyFacing>('left');
  const [flightDurationMs, setFlightDurationMs] = useState<number>(1150);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [bodyAnim, setBodyAnim] = useState<'none' | 'hop' | 'wiggle'>('none');
  const [whisper, setWhisper] = useState<{ text: string; actionLabel?: string; actionRoute?: string } | null>(null);
  const [userRestSpot, setUserRestSpot] = useState<BarnabyPoint | null>(() => loadUserRestSpot());

  // Refs to keep timers/event handlers allocation-light and avoid unnecessary re-renders
  const posRef = useRef<BarnabyPoint>(pos);
  posRef.current = pos;
  const facingRef = useRef<BarnabyFacing>(facing);
  facingRef.current = facing;
  const locomotionRef = useRef<BarnabyLocomotionState>(locomotion);
  locomotionRef.current = locomotion;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const isDraggingRef = useRef(isDragging);
  isDraggingRef.current = isDragging;
  const isUserHiddenRef = useRef(isUserHidden);
  isUserHiddenRef.current = isUserHidden;
  const isHiddenByExamRef = useRef(isHiddenByExam);
  isHiddenByExamRef.current = isHiddenByExam;
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const freeRoamRef = useRef(companion.freeRoam);
  freeRoamRef.current = companion.freeRoam;
  const userRestSpotRef = useRef<BarnabyPoint | null>(userRestSpot);
  userRestSpotRef.current = userRestSpot;

  const dragStartRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);
  const suppressNextClickRef = useRef(false);
  const lastActivityAtRef = useRef<number>(Date.now());
  const isSleepingIdleRef = useRef<boolean>(false);
  const hasGreetedDashboardRef = useRef<boolean>(false);
  const lastMistakeReactionAtRef = useRef<number>(0);

  const flightTimerRef = useRef<number | null>(null);
  const landTimerRef = useRef<number | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const whisperTimerRef = useRef<number | null>(null);
  const expressionTimerRef = useRef<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const characterSize = useMemo(() => getBarnabySize(viewport.width), [viewport.width]);

  const clearLocomotionTimers = useCallback(() => {
    if (flightTimerRef.current) {
      window.clearTimeout(flightTimerRef.current);
      flightTimerRef.current = null;
    }
    if (landTimerRef.current) {
      window.clearTimeout(landTimerRef.current);
      landTimerRef.current = null;
    }
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const flashExpression = useCallback((nextExpr: BarnabyAvatarState, durationMs = 3600) => {
    setExpressionOverride(nextExpr);
    if (expressionTimerRef.current) {
      window.clearTimeout(expressionTimerRef.current);
    }
    expressionTimerRef.current = window.setTimeout(() => {
      setExpressionOverride(null);
      expressionTimerRef.current = null;
    }, durationMs);
  }, []);

  const showWhisper = useCallback(
    (nextWhisper: { text: string; actionLabel?: string; actionRoute?: string }, durationMs = 6800) => {
      if (isOpenRef.current || isHiddenByExamRef.current || isUserHiddenRef.current) return;
      setWhisper(nextWhisper);
      if (whisperTimerRef.current) {
        window.clearTimeout(whisperTimerRef.current);
      }
      whisperTimerRef.current = window.setTimeout(() => {
        setWhisper(null);
        whisperTimerRef.current = null;
      }, durationMs);
    },
    []
  );

  const spawnParticles = useCallback((emojis: string[]) => {
    const now = Date.now();
    const created = emojis.map((emoji, i) => ({
      id: now + i,
      emoji,
      offsetX: (i - (emojis.length - 1) / 2) * 18
    }));
    setParticles((prev) => [...prev.slice(-6), ...created]);
    window.setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !created.some((c) => c.id === p.id)));
    }, 1350);
  }, []);

  const triggerBodyAnim = useCallback((kind: 'hop' | 'wiggle', durationMs = 950) => {
    setBodyAnim(kind);
    window.setTimeout(() => setBodyAnim('none'), durationMs);
  }, []);

  /**
   * Core organic flight controller:
   * - Turns Barnaby toward the destination
   * - Enters 'flying' posture with proportional duration (never teleporting)
   * - Smoothly touches down with 'landing' settle -> 'perched' (or optional 'sleeping')
   */
  const flyToPosition = useCallback(
    (
      target: BarnabyPoint,
      opts?: {
        endLocomotion?: 'perched' | 'hovering' | 'sleeping';
        endFacing?: BarnabyFacing;
        durationOverrideMs?: number;
        onArrive?: () => void;
      }
    ) => {
      if (typeof window === 'undefined') return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const clampedTarget = clampBarnabyPosition(target, vw, vh);
      const from = posRef.current;

      clearLocomotionTimers();

      const nextFacing = computeFacing(from, clampedTarget, facingRef.current);
      const duration = reducedMotionRef.current
        ? 180
        : opts?.durationOverrideMs ?? computeFlightDurationMs(from, clampedTarget);

      setFacing(nextFacing);
      setFlightDurationMs(duration);
      setLocomotion(reducedMotionRef.current ? 'perched' : 'flying');
      setPos(clampedTarget);

      flightTimerRef.current = window.setTimeout(() => {
        flightTimerRef.current = null;
        if (opts?.endFacing) {
          setFacing(opts.endFacing);
        } else {
          // Naturally face inward toward the workspace center when perched near an edge
          setFacing(clampedTarget.x > vw * 0.5 ? 'left' : 'right');
        }

        if (opts?.endLocomotion === 'hovering') {
          setLocomotion('hovering');
          opts?.onArrive?.();
          return;
        }

        if (reducedMotionRef.current) {
          setLocomotion(opts?.endLocomotion === 'sleeping' ? 'sleeping' : 'perched');
          opts?.onArrive?.();
          return;
        }

        setLocomotion('landing');
        landTimerRef.current = window.setTimeout(() => {
          landTimerRef.current = null;
          setLocomotion(opts?.endLocomotion === 'sleeping' ? 'sleeping' : 'perched');
          opts?.onArrive?.();
        }, 440);
      }, duration);
    },
    [clearLocomotionTimers]
  );

  // Sync companion store on path / auth / BARNABY_STATE_EVENT changes
  useEffect(() => {
    const syncAll = () => {
      setCompanion(loadBarnabyState(currentPath));
      setUserRestSpot(loadUserRestSpot());
      setIsUserHidden(loadUserHiddenPref());
    };
    syncAll();

    window.addEventListener(BARNABY_STATE_EVENT, syncAll);
    window.addEventListener('user_auth_updated', syncAll);
    window.addEventListener('user_progress_updated', syncAll);
    window.addEventListener('bandsprint_diagnostic_saved', syncAll);
    return () => {
      window.removeEventListener(BARNABY_STATE_EVENT, syncAll);
      window.removeEventListener('user_auth_updated', syncAll);
      window.removeEventListener('user_progress_updated', syncAll);
      window.removeEventListener('bandsprint_diagnostic_saved', syncAll);
    };
  }, [currentPath]);

  // Pause timers & animations cleanly when browser tab is hidden or user prefers reduced motion
  useEffect(() => {
    const handleVisibility = () => {
      setIsPageHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let mediaQuery: MediaQueryList | null = null;
    const handleMotionPref = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);
      mediaQuery.addEventListener?.('change', handleMotionPref);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      mediaQuery?.removeEventListener?.('change', handleMotionPref);
    };
  }, []);

  // Exam auto-hide + external drawer open events (preserving SP-3 & SP-4B contracts)
  useEffect(() => {
    const hide = () => {
      setIsHiddenByExam(true);
      setIsOpen(false);
      setWhisper(null);
      clearLocomotionTimers();
      audioManager.stopAll();
      setIsSpeaking(false);
      setSpeakingMsgId(null);
    };
    const show = () => {
      setIsHiddenByExam(false);
    };
    const openDrawer = (event: Event) => {
      const custom = event as CustomEvent<{ focusInput?: boolean }>;
      setIsUserHidden(false);
      saveUserHiddenPref(false);
      setIsOpen(true);
      setWhisper(null);
      if (custom?.detail?.focusInput) {
        window.setTimeout(() => inputRef.current?.focus(), 140);
      }
    };
    window.addEventListener('barnaby-float-hide', hide);
    window.addEventListener('barnaby-float-show', show);
    window.addEventListener('barnaby-float-open', openDrawer);
    return () => {
      window.removeEventListener('barnaby-float-hide', hide);
      window.removeEventListener('barnaby-float-show', show);
      window.removeEventListener('barnaby-float-open', openDrawer);
    };
  }, [clearLocomotionTimers]);

  // Responsive viewport resize + obstacle evasion
  useEffect(() => {
    let resizeRaf = 0;
    const handleResize = () => {
      if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
      resizeRaf = window.requestAnimationFrame(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        setViewport({ width: vw, height: vh });
        const clamped = clampBarnabyPosition(posRef.current, vw, vh);
        const obstacles = collectScreenObstacles();
        const evaded = findNonObstructiveSpot({
          current: clamped,
          viewportWidth: vw,
          viewportHeight: vh,
          obstacles
        });
        setPos(evaded || clamped);
      });
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
    };
  }, []);

  // Intelligent Screen Awareness: evade immediately when user focuses an input or opens a modal/dialog
  useEffect(() => {
    if (isHiddenByExam || isUserHidden) return;

    const evadeIfObstructed = () => {
      if (isDraggingRef.current || isOpenRef.current || isHiddenByExamRef.current || isUserHiddenRef.current) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const obstacles = collectScreenObstacles();
      const safeSpot = findNonObstructiveSpot({
        current: posRef.current,
        viewportWidth: vw,
        viewportHeight: vh,
        obstacles
      });
      if (safeSpot) {
        flyToPosition(safeSpot, { durationOverrideMs: 780 });
      }
    };

    const handleFocusIn = (ev: FocusEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!target || target.closest('[data-barnaby-overlay="true"]')) return;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        window.setTimeout(evadeIfObstructed, 40);
      }
    };

    let mutationTimer: number | null = null;
    const observer =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => {
            if (mutationTimer) return;
            mutationTimer = window.setTimeout(() => {
              mutationTimer = null;
              // Only run obstacle check when a dialog/modal is present in the DOM
              if (document.querySelector('[role="dialog"], [aria-modal="true"]')) {
                evadeIfObstructed();
              }
            }, 240);
          })
        : null;

    document.addEventListener('focusin', handleFocusIn, true);
    if (observer && document.body) {
      observer.observe(document.body, { childList: true, subtree: false });
    }

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
      observer?.disconnect();
      if (mutationTimer) window.clearTimeout(mutationTimer);
    };
  }, [isHiddenByExam, isUserHidden, flyToPosition]);

  // Dashboard fly-in welcome & route-change awareness
  useEffect(() => {
    if (isHiddenByExam || isUserHidden) return;
    const isDashboard = currentPath === '/' || currentPath === '/home';

    if (isDashboard && !hasGreetedDashboardRef.current) {
      hasGreetedDashboardRef.current = true;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const bounds = getSafeViewportBounds(vw, vh);

      // Start slightly higher right then glide gracefully into a welcoming unobstructed spot
      const entryPoint: BarnabyPoint = {
        x: bounds.maxX,
        y: bounds.minY + 12
      };
      setPos(entryPoint);

      const timer = window.setTimeout(() => {
        if (isDraggingRef.current || isOpenRef.current || isHiddenByExamRef.current || isUserHiddenRef.current) return;
        const obstacles = collectScreenObstacles();
        const welcomeSpot = pickApproachTarget({
          current: entryPoint,
          viewportWidth: vw,
          viewportHeight: vh,
          obstacles
        });
        flyToPosition(welcomeSpot, {
          durationOverrideMs: 1180,
          onArrive: () => {
            flashExpression('greeting', 4200);
            const ctx = getStudentContextSnapshot(currentPath);
            const whisperTip = getContextualWhisper(currentPath, ctx);
            showWhisper(whisperTip, 6200);
          }
        });
      }, 420);

      return () => window.clearTimeout(timer);
    }

    // On other routes, gently ensure Barnaby isn't covering newly mounted interactive controls
    const checkTimer = window.setTimeout(() => {
      if (isDraggingRef.current || isOpenRef.current || isHiddenByExamRef.current || isUserHiddenRef.current) return;
      const obstacles = collectScreenObstacles();
      const safeSpot = findNonObstructiveSpot({
        current: posRef.current,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        obstacles
      });
      if (safeSpot) {
        flyToPosition(safeSpot, { durationOverrideMs: 920 });
      }
    }, 380);

    return () => window.clearTimeout(checkTimer);
  }, [currentPath, isHiddenByExam, isUserHidden, flyToPosition, flashExpression, showWhisper]);

  // Track user activity (throttled ref update — zero React re-renders) for natural sleep / wake
  useEffect(() => {
    const markActive = () => {
      const now = Date.now();
      if (now - lastActivityAtRef.current < 3000) return;
      lastActivityAtRef.current = now;
      if (isSleepingIdleRef.current) {
        isSleepingIdleRef.current = false;
        setLocomotion('perched');
        setExpressionOverride(null);
      }
    };

    window.addEventListener('pointerdown', markActive, { passive: true });
    window.addEventListener('keydown', markActive, { passive: true });
    window.addEventListener('scroll', markActive, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', markActive);
      window.removeEventListener('keydown', markActive);
      window.removeEventListener('scroll', markActive);
    };
  }, []);

  // Autonomous Life & Movement Loop (organic intervals: fly, hover, look around, walk, rest, sleep)
  useEffect(() => {
    const isActive =
      companion.freeRoam &&
      !isOpen &&
      !isDragging &&
      !isHiddenByExam &&
      !isUserHidden &&
      !isPageHidden &&
      !reducedMotion;

    if (!isActive) return;

    let loopTimer: number | null = null;

    const scheduleNextBehavior = (delayMs?: number) => {
      const nextDelay = delayMs ?? 9200 + Math.floor(Math.random() * 5800);
      loopTimer = window.setTimeout(() => {
        if (
          !freeRoamRef.current ||
          isOpenRef.current ||
          isDraggingRef.current ||
          isHiddenByExamRef.current ||
          isUserHiddenRef.current ||
          reducedMotionRef.current
        ) {
          return;
        }

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const idleMs = Date.now() - lastActivityAtRef.current;

        // 1. Inactivity sleep (> 75s): glide to a peaceful resting perch and nap
        if (idleMs > 75_000) {
          if (!isSleepingIdleRef.current) {
            isSleepingIdleRef.current = true;
            const obstacles = collectScreenObstacles();
            const restPoint = pickRestPerch({
              current: posRef.current,
              viewportWidth: vw,
              viewportHeight: vh,
              obstacles,
              userRestSpot: userRestSpotRef.current
            });
            flyToPosition(restPoint, { endLocomotion: 'sleeping' });
          }
          scheduleNextBehavior(14000);
          return;
        }

        // 2. Skip if currently mid-flight or landing
        if (locomotionRef.current === 'flying' || locomotionRef.current === 'landing') {
          scheduleNextBehavior(5000);
          return;
        }

        const obstacles = collectScreenObstacles();
        const roll = Math.random();

        if (roll < 0.44) {
          // Organic flight to a fresh, obstacle-free screen position
          const target = pickNextRoamTarget({
            current: posRef.current,
            viewportWidth: vw,
            viewportHeight: vh,
            obstacles
          });
          flyToPosition(target.point, {
            endLocomotion: target.kind === 'air' ? 'hovering' : 'perched',
            onArrive: () => {
              if (target.kind === 'air') {
                hoverTimerRef.current = window.setTimeout(() => {
                  hoverTimerRef.current = null;
                  if (isDraggingRef.current || isOpenRef.current) return;
                  const landObstacles = collectScreenObstacles();
                  const perch = pickRestPerch({
                    current: posRef.current,
                    viewportWidth: window.innerWidth,
                    viewportHeight: window.innerHeight,
                    obstacles: landObstacles,
                    userRestSpot: userRestSpotRef.current
                  });
                  flyToPosition(perch, { endLocomotion: 'perched' });
                }, 3800);
              }
            }
          });
        } else if (roll < 0.62) {
          // Hover gently in place for a few seconds, then settle back down
          setLocomotion('hovering');
          hoverTimerRef.current = window.setTimeout(() => {
            hoverTimerRef.current = null;
            if (!isDraggingRef.current) {
              setLocomotion('landing');
              landTimerRef.current = window.setTimeout(() => {
                landTimerRef.current = null;
                setLocomotion('perched');
              }, 440);
            }
          }, 3200);
        } else if (roll < 0.78) {
          // Curious look-around & occasional direction turn
          setLocomotion('looking');
          if (Math.random() < 0.5) {
            setFacing((prev) => (prev === 'left' ? 'right' : 'left'));
          }
          hoverTimerRef.current = window.setTimeout(() => {
            hoverTimerRef.current = null;
            if (!isDraggingRef.current) setLocomotion('perched');
          }, 2700);
        } else if (roll < 0.91) {
          // Short playful walk/hop along the current perch if unobstructed
          const walkStep = computeWalkStepTarget({
            current: posRef.current,
            viewportWidth: vw,
            viewportHeight: vh,
            obstacles
          });
          if (walkStep) {
            setFacing(walkStep.facing);
            setFlightDurationMs(920);
            setLocomotion('walking');
            setPos(walkStep.point);
            flightTimerRef.current = window.setTimeout(() => {
              flightTimerRef.current = null;
              setLocomotion('perched');
            }, 950);
          } else {
            setLocomotion('looking');
            hoverTimerRef.current = window.setTimeout(() => {
              hoverTimerRef.current = null;
              setLocomotion('perched');
            }, 2200);
          }
        } else if (userRestSpotRef.current) {
          // Naturally return to user's chosen resting perch
          const restPoint = pickRestPerch({
            current: posRef.current,
            viewportWidth: vw,
            viewportHeight: vh,
            obstacles,
            userRestSpot: userRestSpotRef.current
          });
          flyToPosition(restPoint, { endLocomotion: 'perched' });
        }

        scheduleNextBehavior();
      }, nextDelay);
    };

    // First autonomous movement happens after a calm pause so initial arrival feels composed
    scheduleNextBehavior(8200);

    return () => {
      if (loopTimer) window.clearTimeout(loopTimer);
    };
  }, [
    companion.freeRoam,
    isOpen,
    isDragging,
    isHiddenByExam,
    isUserHidden,
    isPageHidden,
    reducedMotion,
    flyToPosition
  ]);

  // Study dwell encouragement (calm, non-intrusive check-in after studying for ~3 minutes)
  useEffect(() => {
    if (isHiddenByExam || isUserHidden || isPageHidden) return;
    const isStudyRoute = currentPath.startsWith('/practice') || currentPath.startsWith('/learn');
    if (!isStudyRoute) return;

    const dwellTimer = window.setTimeout(() => {
      if (isOpenRef.current || isDraggingRef.current || isHiddenByExamRef.current || isUserHiddenRef.current) return;
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
        return; // Never interrupt active typing
      }
      const obstacles = collectScreenObstacles();
      const approach = pickApproachTarget({
        current: posRef.current,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        obstacles
      });
      flyToPosition(approach, {
        onArrive: () => {
          flashExpression('encouraging', 4500);
          const ctx = getStudentContextSnapshot(currentPath);
          const tip = generateContextAwareCoachTip(ctx);
          showWhisper(
            {
              text: `Keep going — small daily steps win! ${tip.suggestedAction.label}?`,
              actionLabel: tip.suggestedAction.label,
              actionRoute: tip.suggestedAction.route
            },
            7200
          );
        }
      });
    }, 180_000);

    return () => window.clearTimeout(dwellTimer);
  }, [currentPath, isHiddenByExam, isUserHidden, isPageHidden, flyToPosition, flashExpression, showWhisper]);

  // AI-Driven / Learning Event Reactions (mistakes, achievements, task completions, summon/hide)
  useEffect(() => {
    const handleCompanionEvent = (event: Event) => {
      const detail = (event as CustomEvent<BarnabyCompanionEventDetail>)?.detail;
      if (!detail) return;

      if (detail.type === 'summon') {
        setIsUserHidden(false);
        saveUserHiddenPref(false);
        const obstacles = collectScreenObstacles();
        const spot = pickApproachTarget({
          current: posRef.current,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          obstacles
        });
        flyToPosition(spot, {
          onArrive: () => {
            flashExpression('greeting', 3400);
            spawnParticles(['✨', '💙']);
          }
        });
        return;
      }

      if (detail.type === 'hide') {
        setIsUserHidden(true);
        saveUserHiddenPref(true);
        setIsOpen(false);
        setWhisper(null);
        return;
      }

      if (isHiddenByExamRef.current || isUserHiddenRef.current) return;

      if (detail.type === 'achievement' || detail.type === 'task_completed') {
        isSleepingIdleRef.current = false;
        flashExpression('celebrating', 4200);
        triggerBodyAnim('hop', 1100);
        spawnParticles(['🎉', '⭐', '✨']);
        if (detail.message) {
          showWhisper({ text: detail.message, actionLabel: 'Open Barnaby' }, 5800);
        }
      } else if (detail.type === 'mistake_detected') {
        isSleepingIdleRef.current = false;
        const obstacles = collectScreenObstacles();
        const approach = pickApproachTarget({
          current: posRef.current,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          obstacles
        });
        flyToPosition(approach, {
          onArrive: () => {
            flashExpression('correcting', 4400);
            showWhisper(
              {
                text: detail.message || 'Spotted a tricky item! Want to unpack that trap together?',
                actionLabel: 'Review Mistake',
                actionRoute: detail.route || '/progress/mistakes'
              },
              6600
            );
          }
        });
      } else if (detail.type === 'study_encouragement') {
        isSleepingIdleRef.current = false;
        flashExpression('encouraging', 4000);
        if (detail.message) {
          showWhisper({ text: detail.message }, 6000);
        }
      }
    };

    const handleMistakeUpserted = () => {
      if (isHiddenByExamRef.current || isUserHiddenRef.current || isOpenRef.current) return;
      const now = Date.now();
      if (now - lastMistakeReactionAtRef.current < 15_000) return;
      lastMistakeReactionAtRef.current = now;
      flashExpression('correcting', 4000);
      showWhisper(
        {
          text: 'Saved that mistake to your Vault — click me anytime to dissect the IELTS trap.',
          actionLabel: 'Open Vault',
          actionRoute: '/progress/mistakes'
        },
        6200
      );
    };

    window.addEventListener(BARNABY_COMPANION_EVENT, handleCompanionEvent);
    window.addEventListener('bandsprint_mistake_upserted', handleMistakeUpserted);
    return () => {
      window.removeEventListener(BARNABY_COMPANION_EVENT, handleCompanionEvent);
      window.removeEventListener('bandsprint_mistake_upserted', handleMistakeUpserted);
    };
  }, [flyToPosition, flashExpression, triggerBodyAnim, spawnParticles, showWhisper]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearLocomotionTimers();
      if (whisperTimerRef.current) window.clearTimeout(whisperTimerRef.current);
      if (expressionTimerRef.current) window.clearTimeout(expressionTimerRef.current);
    };
  }, [clearLocomotionTimers]);

  // Scroll drawer messages to latest
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [companion.messages, isOpen]);

  // Pointer Drag Handling (Mouse + Touch — >6px threshold prevents accidental click/pet!)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    // Ignore pointer downs originating from quick-action buttons
    const target = e.target as HTMLElement;
    if (target.closest('button[data-barnaby-control="true"]')) return;

    lastActivityAtRef.current = Date.now();
    isSleepingIdleRef.current = false;
    clearLocomotionTimers();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic PointerEvent in tests
    }

    dragStartRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: posRef.current.x,
      origY: posRef.current.y,
      moved: false
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== e.pointerId) return;

    const dx = e.clientX - start.startX;
    const dy = e.clientY - start.startY;

    if (!start.moved && Math.hypot(dx, dy) > 6) {
      start.moved = true;
      suppressNextClickRef.current = true;
      setIsDragging(true);
      setLocomotion('dragging');
      setWhisper(null);
      setFlightDurationMs(0);
    }

    if (start.moved) {
      if (dx < -4) setFacing('left');
      else if (dx > 4) setFacing('right');

      const nextPos = clampBarnabyPosition(
        { x: start.origX + dx, y: start.origY + dy },
        window.innerWidth,
        window.innerHeight
      );
      setPos(nextPos);
    }
  };

  const finishPointerDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const wasDragged = start.moved;
    dragStartRef.current = null;

    if (wasDragged) {
      setIsDragging(false);
      const finalSpot = clampBarnabyPosition(posRef.current, window.innerWidth, window.innerHeight);
      setPos(finalSpot);
      setUserRestSpot(finalSpot);
      saveUserRestSpot(finalSpot);
      setLocomotion(reducedMotionRef.current ? 'perched' : 'landing');
      if (!reducedMotionRef.current) {
        landTimerRef.current = window.setTimeout(() => {
          landTimerRef.current = null;
          setLocomotion('perched');
        }, 440);
      }
      // Keep click suppressed for this release gesture so dragging NEVER triggers chat or pet
      window.setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 80);
    }
  };

  const handleCharacterClick = () => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    lastActivityAtRef.current = Date.now();
    isSleepingIdleRef.current = false;
    setLocomotion('perched');
    soundManager.playBeep(560, 0.04);
    setWhisper(null);
    setIsOpen((prev) => !prev);
  };

  // Manual "Fly Now" action for interactive delight & testing
  const handleFlySomewhereNew = useCallback(() => {
    lastActivityAtRef.current = Date.now();
    isSleepingIdleRef.current = false;
    const obstacles = collectScreenObstacles();
    const target = pickNextRoamTarget({
      current: posRef.current,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      obstacles,
      minDistance: viewport.width < 640 ? 90 : 160
    });
    soundManager.playBeep(620, 0.04);
    flyToPosition(target.point, { endLocomotion: 'perched' });
  }, [flyToPosition, viewport.width]);

  const handleToggleHide = useCallback((hide: boolean) => {
    setIsUserHidden(hide);
    saveUserHiddenPref(hide);
    if (hide) {
      setIsOpen(false);
      setWhisper(null);
      clearLocomotionTimers();
      audioManager.stopAll();
      setIsSpeaking(false);
      setSpeakingMsgId(null);
    } else {
      lastActivityAtRef.current = Date.now();
      isSleepingIdleRef.current = false;
      const obstacles = collectScreenObstacles();
      const spot = pickApproachTarget({
        current: posRef.current,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        obstacles
      });
      flyToPosition(spot, {
        onArrive: () => {
          flashExpression('greeting', 3600);
          spawnParticles(['✨', '💙']);
          showWhisper({ text: 'Back with you! Ready to make today count?' }, 4800);
        }
      });
    }
  }, [clearLocomotionTimers, flyToPosition, flashExpression, spawnParticles, showWhisper]);

  // Companion Actions (Pet, Word Treat, 15s Mini Quiz, TTS, Ratings, Chat — 100% preserved)
  const handlePet = () => {
    lastActivityAtRef.current = Date.now();
    isSleepingIdleRef.current = false;
    const { state } = petBarnaby();
    setCompanion(state);
    soundManager.playBeep(680, 0.05);
    triggerBodyAnim('wiggle', 750);
    flashExpression('encouraging', 3200);
    spawnParticles(['❤️', '✨', '💙']);
  };

  const handleFeedTreat = () => {
    lastActivityAtRef.current = Date.now();
    isSleepingIdleRef.current = false;
    const { state } = feedBarnabyWordTreat();
    setCompanion(state);
    soundManager.playBeep(740, 0.06);
    triggerBodyAnim('hop', 900);
    flashExpression('celebrating', 3400);
    spawnParticles(['🍪', '✨', '⭐']);
  };

  const handleStartQuiz = () => {
    lastActivityAtRef.current = Date.now();
    isSleepingIdleRef.current = false;
    const { state } = startBarnabyMiniQuiz();
    setCompanion(state);
    soundManager.playBeep(600, 0.05);
    flashExpression('teaching', 3600);
  };

  const handleAnswerQuiz = (msgId: string, idx: number) => {
    const { state, isCorrect } = answerBarnabyMiniQuiz(msgId, idx);
    setCompanion(state);
    soundManager.playBeep(isCorrect ? 820 : 340, 0.07);
    if (isCorrect) {
      triggerBodyAnim('hop', 950);
      flashExpression('celebrating', 3800);
      spawnParticles(['🎉', '⭐', '+15']);
    } else {
      flashExpression('correcting', 3800);
    }
  };

  const handleRateMessage = (msgId: string, rating: 'up' | 'down') => {
    const state = rateBarnabyMessage(msgId, rating);
    setCompanion(state);
    soundManager.playBeep(rating === 'up' ? 720 : 420, 0.04);
    if (rating === 'up') {
      spawnParticles(['💙', '✨']);
    }
  };

  const handleSpeak = async (msg: BarnabyMessage) => {
    if (isSpeaking && speakingMsgId === msg.id) {
      audioManager.stopAll();
      setIsSpeaking(false);
      setSpeakingMsgId(null);
      return;
    }

    setIsSpeaking(true);
    setSpeakingMsgId(msg.id);
    try {
      await audioManager.playText(msg.text, {
        speakerId: 'speaker_barnaby',
        onEnd: () => {
          setIsSpeaking(false);
          setSpeakingMsgId(null);
        }
      });
    } catch {
      setIsSpeaking(false);
      setSpeakingMsgId(null);
    }
  };

  const handleSend = async (customText?: string) => {
    const query = (customText ?? inputText).trim();
    if (!query || isSending) return;
    if (!customText) setInputText('');
    setIsSending(true);
    lastActivityAtRef.current = Date.now();
    isSleepingIdleRef.current = false;

    const optimisticMsg: BarnabyMessage = {
      id: `temp_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: Date.now()
    };
    setCompanion((prev) => ({
      ...prev,
      mood: 'thinking',
      messages: [...prev.messages, optimisticMsg]
    }));

    try {
      const { state } = await sendBarnabyChatMessage(query, currentPath);
      setCompanion(state);
      soundManager.playBeep(640, 0.04);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleFreeRoam = () => {
    const next = toggleBarnabyFreeRoam();
    setCompanion(next);
    soundManager.playBeep(520, 0.04);
    if (!next.freeRoam) {
      clearLocomotionTimers();
      setLocomotion('perched');
    }
  };

  const handleClearChat = () => {
    const next = clearBarnabyChat(currentPath);
    setCompanion(next);
  };

  // Hide completely during active IELTS examinations (restored automatically via barnaby-float-show)
  if (isHiddenByExam) return null;

  const bondStage = getBondStage(companion.bondXp);
  const avatarState =
    isSpeaking
      ? 'speaking'
      : expressionOverride ||
        mapBarnabyMoodToAvatarState(companion.mood, {
          isSpeaking,
          isThinking: isSending
        });

  const isAnimationPaused = isPageHidden || reducedMotion;
  const whisperOnLeft = pos.x > viewport.width * 0.45;
  const whisperAbove = pos.y > viewport.height * 0.42;

  // Dynamic body motion class reflecting physical locomotion state
  const outerMotionClass = isAnimationPaused
    ? ''
    : bodyAnim === 'hop'
    ? 'animate-barnaby-hop'
    : bodyAnim === 'wiggle'
    ? 'animate-barnaby-wiggle'
    : locomotion === 'dragging'
    ? 'animate-barnaby-drag'
    : locomotion === 'flying'
    ? 'animate-barnaby-flight-swoop'
    : locomotion === 'hovering'
    ? 'animate-barnaby-hover'
    : locomotion === 'landing'
    ? 'animate-barnaby-land'
    : locomotion === 'walking'
    ? 'animate-barnaby-walk-body'
    : locomotion === 'sleeping' || avatarState === 'sleeping'
    ? 'animate-barnaby-nap'
    : 'animate-barnaby-float';

  // Subtle banking lean while flying left/right
  const flightTiltDeg =
    locomotion === 'flying' && !isAnimationPaused
      ? facing === 'left'
        ? -7
        : 7
      : 0;

  return (
    <div
      data-barnaby-overlay="true"
      data-testid="barnaby-floating-layer"
      className="fixed inset-0 z-40 pointer-events-none overflow-hidden no-print"
    >
      {/* ================= SUMMON TAB WHEN TEMPORARILY HIDDEN ================= */}
      {isUserHidden && (
        <div className="fixed bottom-20 md:bottom-5 right-4 pointer-events-auto">
          <button
            type="button"
            data-testid="barnaby-summon-btn"
            onClick={() => handleToggleHide(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3A35] text-white border border-[#1F8A70]/60 shadow-lg text-xs font-semibold transition-transform hover:-translate-y-0.5 cursor-pointer"
            title="Bring Barnaby back to your screen"
          >
            <BarnabyDragonAvatar
              variant="bust"
              framed="circle"
              size="xs"
              state="greeting"
              isSpeaking={false}
              paused={isAnimationPaused}
              testId="barnaby-summon-mini-avatar"
            />
            <span>Call Barnaby</span>
          </button>
        </div>
      )}

      {/* ================= COMPANION INTERACTION DRAWER ================= */}
      {!isUserHidden && isOpen && (
        <div
          data-testid="barnaby-companion-drawer"
          className="fixed bottom-20 md:bottom-5 right-2 sm:right-5 w-[calc(100vw-1rem)] sm:w-[395px] h-[min(78vh,610px)] bg-white dark:bg-[#11201E] rounded-2xl shadow-2xl border border-[#D3DDDA] dark:border-[#1F8A70]/40 flex flex-col overflow-hidden pointer-events-auto animate-scale-in"
        >
          {/* Header: Companion Avatar, Bond Level & Controls */}
          <div className="bg-[#0F4C45] text-white px-4 py-3 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={handlePet}
                  title="Tap to pet Barnaby (+5 Bond XP)"
                  className="relative group focus:outline-none cursor-pointer"
                >
                  <BarnabyDragonAvatar
                    state={avatarState}
                    isSpeaking={isSpeaking}
                    paused={isAnimationPaused}
                    size="md"
                    framed="circle"
                    testId="barnaby-drawer-avatar"
                    className="border-2 border-[#F4A62A] shadow-md group-hover:scale-105 transition-transform"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0F4C45] ${
                      isSpeaking ? 'bg-[#38BDF8]' : 'bg-[#F4A62A]'
                    }`}
                  />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-display font-bold text-sm tracking-tight truncate">
                      Barnaby
                    </h3>
                    <span className="px-1.5 py-0.5 rounded bg-[#F4A62A]/20 text-[#F6C25B] text-[9px] font-bold uppercase tracking-wider shrink-0">
                      Lv.{bondStage.level} {bondStage.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#EEF3F1]/80 truncate">
                    {isSpeaking
                      ? 'Speaking with British mentor voice…'
                      : isSending
                      ? 'Thinking carefully…'
                      : `Roaming ${companion.freeRoam ? 'active' : 'paused'} · IELTS Mentor`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleFreeRoam}
                  title={companion.freeRoam ? 'Pause autonomous flying' : 'Resume autonomous flying'}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    companion.freeRoam
                      ? 'bg-[#1F8A70] text-white hover:bg-[#1F8A70]/80'
                      : 'bg-white/10 text-white/75 hover:bg-white/20'
                  }`}
                >
                  {companion.freeRoam ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleHide(true)}
                  title="Hide Barnaby temporarily"
                  className="p-1.5 rounded-lg bg-white/10 text-white/75 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Reset chat thread"
                  className="p-1.5 rounded-lg bg-white/10 text-white/75 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close Barnaby companion"
                  className="p-1.5 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bond XP Progress Bar */}
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-[#F4A62A] rounded-full transition-all duration-300"
                  style={{ width: `${bondStage.progressPct}%` }}
                />
              </div>
              <span
                data-testid="barnaby-bond-xp"
                className="text-[10px] font-mono text-[#EEF3F1]/85 tabular-nums shrink-0"
              >
                {companion.bondXp} XP
              </span>
            </div>

            {/* Care, Play & Roam Action Strip */}
            <div className="mt-2.5 grid grid-cols-4 gap-1.5">
              <button
                type="button"
                data-testid="barnaby-drawer-pet-btn"
                onClick={handlePet}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white/12 hover:bg-white/20 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5 text-[#FB7185]" />
                <span>Pet</span>
              </button>
              <button
                type="button"
                data-testid="barnaby-drawer-treat-btn"
                onClick={handleFeedTreat}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white/12 hover:bg-white/20 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                <Cookie className="w-3.5 h-3.5 text-[#F6C25B]" />
                <span>Treat</span>
              </button>
              <button
                type="button"
                data-testid="barnaby-drawer-quiz-btn"
                onClick={handleStartQuiz}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white/12 hover:bg-white/20 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-[#F4A62A]" />
                <span>15s Quiz</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  window.setTimeout(handleFlySomewhereNew, 80);
                }}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white/12 hover:bg-white/20 text-[11px] font-semibold transition-colors cursor-pointer"
                title="Watch Barnaby glide to a new spot"
              >
                <Wind className="w-3.5 h-3.5 text-[#9ED9FB]" />
                <span>Fly</span>
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#F7F9F8] dark:bg-[#0B1514]">
            {companion.messages.map((msg) => {
              const isBarnaby = msg.sender === 'barnaby';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isBarnaby ? 'items-start' : 'items-end'}`}
                >
                  {isBarnaby && msg.badge && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#1F8A70] dark:text-[#6EA098] mb-1 ml-1">
                      {msg.badge}
                    </span>
                  )}

                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-xs ${
                      isBarnaby
                        ? 'bg-white dark:bg-[#11201E] text-[#0E1F1E] dark:text-[#EEF3F1] border border-[#D3DDDA] dark:border-[#1F8A70]/30 rounded-tl-sm'
                        : 'bg-[#0F4C45] text-white rounded-tr-sm'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Word Treat Mini Card */}
                    {msg.treatWord && (
                      <div className="mt-2 p-2.5 rounded-xl bg-[#FEF6E8] dark:bg-[#1D2D2A] border border-[#F4A62A]/30 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#0F4C45] dark:text-[#F6C25B]">
                            {msg.treatWord.word}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-[#9B6314] dark:text-[#F6C25B]">
                            {msg.treatWord.band}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#384543] dark:text-[#D3DDDA] mt-0.5">
                          {msg.treatWord.meaning}
                        </p>
                        <p className="text-[11px] italic text-[#566664] dark:text-[#9EBEB8] mt-1">
                          "{msg.treatWord.example}"
                        </p>
                      </div>
                    )}

                    {/* Interactive 15s Mini Trap Quiz */}
                    {msg.quiz && (
                      <div className="mt-2.5 space-y-1.5">
                        {msg.quiz.options.map((opt, idx) => {
                          const answered = typeof msg.quiz!.selectedIndex === 'number';
                          const isSelected = msg.quiz!.selectedIndex === idx;
                          const isCorrectOpt = idx === msg.quiz!.correctIndex;
                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={answered}
                              onClick={() => handleAnswerQuiz(msg.id, idx)}
                              className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center justify-between gap-2 ${
                                answered
                                  ? isCorrectOpt
                                    ? 'bg-[#EEF3F1] dark:bg-[#1F8A70]/25 border-[#1F8A70] text-[#0F4C45] dark:text-white'
                                    : isSelected
                                    ? 'bg-[#FDF2F2] dark:bg-[#8C1D18]/25 border-[#CC3333] text-[#8C1D18] dark:text-[#FADCDC]'
                                    : 'bg-transparent border-[#D3DDDA]/60 dark:border-white/10 opacity-60'
                                  : 'bg-[#F7F9F8] dark:bg-[#0B1514] border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45] cursor-pointer'
                              }`}
                            >
                              <span>{opt}</span>
                              {answered && isCorrectOpt && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#1F8A70] shrink-0" />
                              )}
                              {answered && isSelected && !isCorrectOpt && (
                                <XCircle className="w-3.5 h-3.5 text-[#CC3333] shrink-0" />
                              )}
                            </button>
                          );
                        })}
                        {typeof msg.quiz.selectedIndex === 'number' && (
                          <div className="mt-1.5 p-2 rounded-lg bg-[#EEF3F1] dark:bg-[#0B1514] text-[11px] text-[#384543] dark:text-[#D3DDDA]">
                            {msg.quiz.explanation}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Optional Navigation CTA */}
                    {msg.suggestedAction && onNavigate && (
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate(msg.suggestedAction!.route);
                          setIsOpen(false);
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#0F4C45] dark:text-[#F6C25B] hover:underline cursor-pointer"
                      >
                        <span>{msg.suggestedAction.label}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Barnaby Message Footer: Speak Aloud + Feedback Rating */}
                  {isBarnaby && (
                    <div className="flex items-center gap-2 mt-1 ml-1 text-[#566664] dark:text-[#9EBEB8]">
                      <button
                        type="button"
                        onClick={() => handleSpeak(msg)}
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold hover:text-[#0F4C45] dark:hover:text-white transition-colors cursor-pointer ${
                          isSpeaking && speakingMsgId === msg.id ? 'text-[#1F8A70]' : ''
                        }`}
                        title="Hear Barnaby speak this aloud"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>{isSpeaking && speakingMsgId === msg.id ? 'Stop' : 'Speak'}</span>
                      </button>

                      <span className="text-[#D3DDDA] dark:text-white/15">•</span>

                      <button
                        type="button"
                        onClick={() => handleRateMessage(msg.id, 'up')}
                        className={`p-0.5 rounded hover:text-[#1F8A70] transition-colors cursor-pointer ${
                          msg.rating === 'up' ? 'text-[#1F8A70]' : ''
                        }`}
                        title="Helpful (+3 Bond XP)"
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRateMessage(msg.id, 'down')}
                        className={`p-0.5 rounded hover:text-[#CC3333] transition-colors cursor-pointer ${
                          msg.rating === 'down' ? 'text-[#CC3333]' : ''
                        }`}
                        title="Could be sharper"
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-center gap-2 text-xs text-[#566664] dark:text-[#9EBEB8] pl-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1F8A70]" />
                <span>Barnaby is thinking…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 pt-2 pb-1.5 bg-white dark:bg-[#11201E] border-t border-[#D3DDDA]/70 dark:border-[#1F8A70]/20 flex items-center gap-1.5 overflow-x-auto shrink-0">
            {[
              'What should I study next?',
              'Give me a Band 8 word',
              'TFNG tip please',
              'Writing Task 2 structure'
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={isSending}
                onClick={() => handleSend(prompt)}
                className="px-2.5 py-1 rounded-lg bg-[#EEF3F1] dark:bg-[#0B1514] hover:bg-[#D3DDDA] dark:hover:bg-[#1F8A70]/25 text-[11px] font-medium text-[#0E1F1E] dark:text-[#EEF3F1] whitespace-nowrap transition-colors cursor-pointer shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white dark:bg-[#11201E] border-t border-[#D3DDDA] dark:border-[#1F8A70]/25 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask Barnaby anything about IELTS…"
              className="flex-1 bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 rounded-xl px-3 py-2 text-xs text-[#0E1F1E] dark:text-[#EEF3F1] placeholder:text-[#566664] focus:outline-none focus:border-[#0F4C45]"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              aria-label="Send message to Barnaby"
              className="p-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3A35] disabled:opacity-45 text-white transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* ================= INDEPENDENT FREELY ROAMING FULL-BODY BARNABY ================= */}
      {!isUserHidden && (
        <div
          data-testid="barnaby-roaming-actor"
          data-locomotion={locomotion}
          data-facing={facing}
          data-free-roam={companion.freeRoam ? 'true' : 'false'}
          data-pos-x={Math.round(pos.x)}
          data-pos-y={Math.round(pos.y)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsHovered(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setIsHovered(false);
            }
          }}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: `${characterSize.width}px`,
            height: `${characterSize.height}px`,
            transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
            transition: isDragging
              ? 'none'
              : `transform ${flightDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            willChange: 'transform',
            touchAction: 'none'
          }}
          className="pointer-events-auto select-none group"
        >
          {/* Floating Heart / Sparkle Reaction Particles */}
          {particles.map((p) => (
            <span
              key={p.id}
              className="pointer-events-none absolute -top-3 left-1/2 text-sm font-bold animate-barnaby-particle"
              style={{ marginLeft: `${p.offsetX}px` }}
            >
              {p.emoji}
            </span>
          ))}

          {/* Contextual Whisper Bubble (auto-positioned away from screen edges) */}
          {whisper && !isOpen && !isDragging && (
            <div
              data-testid="barnaby-whisper-bubble"
              className={`absolute ${whisperAbove ? 'bottom-full mb-2' : 'top-full mt-2'} ${
                whisperOnLeft ? 'right-0' : 'left-0'
              } w-64 max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-[#11201E]/95 backdrop-blur-sm text-[#0E1F1E] dark:text-[#EEF3F1] border border-[#D3DDDA] dark:border-[#1F8A70]/45 rounded-2xl p-3 shadow-xl animate-fade-in z-10`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs leading-snug font-medium">{whisper.text}</p>
                <button
                  type="button"
                  data-barnaby-control="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    setWhisper(null);
                  }}
                  aria-label="Dismiss Barnaby tip"
                  className="text-[#566664] hover:text-[#0E1F1E] dark:hover:text-white p-0.5 cursor-pointer shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                {whisper.actionLabel && whisper.actionRoute && onNavigate ? (
                  <button
                    type="button"
                    data-barnaby-control="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(whisper.actionRoute!);
                      setWhisper(null);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0F4C45] dark:text-[#F6C25B] hover:underline cursor-pointer"
                  >
                    <span>{whisper.actionLabel}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    data-barnaby-control="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      setWhisper(null);
                      setIsOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0F4C45] dark:text-[#F6C25B] hover:underline cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Chat with Barnaby</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Unclipped Full-Body Draggable Dragon Character */}
          <div
            role="button"
            tabIndex={0}
            data-testid="barnaby-drag-handle"
            aria-label={`Barnaby the blue dragon (${locomotion}, Level ${bondStage.level}). Drag to move or press to chat.`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishPointerDrag}
            onPointerCancel={finishPointerDrag}
            onClick={handleCharacterClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCharacterClick();
              }
            }}
            className={`relative w-full h-full flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4A62A] rounded-2xl ${
              isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab hover:scale-105'
            } transition-transform duration-150 ${outerMotionClass}`}
            style={{
              filter: 'drop-shadow(0 10px 14px rgba(15, 76, 69, 0.22))'
            }}
          >
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                transform: flightTiltDeg ? `rotate(${flightTiltDeg}deg)` : undefined,
                transition: 'transform 260ms ease'
              }}
            >
              <BarnabyDragonAvatar
                variant="full"
                framed="none"
                size="studio"
                state={avatarState}
                locomotion={locomotion}
                facing={facing}
                isSpeaking={isSpeaking}
                paused={isAnimationPaused}
                testId="barnaby-floating-avatar"
                className="w-full h-full max-w-none"
              />
            </div>

            {/* Subtle Level Tag when hovered (no heavy boxed chrome) */}
            {!isDragging && isHovered && !isOpen && (
              <span className="pointer-events-none absolute -top-2 right-0 px-1.5 py-0.5 rounded-md bg-[#0F4C45]/90 text-[#F6C25B] text-[9px] font-bold tracking-wide shadow-sm">
                Lv.{bondStage.level}
              </span>
            )}
          </div>

          {/* Subtle Hover / Focus Quick Controls Bar (Pause/Resume, Pet, Fly, Hide) */}
          {!isDragging && !isOpen && (
            <div
              data-testid="barnaby-quick-controls"
              className={`absolute left-1/2 -translate-x-1/2 ${
                pos.y > viewport.height - 155 ? '-top-9' : '-bottom-8'
              } flex items-center gap-1 px-1.5 py-1 rounded-xl bg-[#0F4C45]/92 text-white border border-white/15 shadow-lg backdrop-blur-xs transition-opacity duration-150 ${
                isHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
              }`}
            >
              <button
                type="button"
                data-barnaby-control="true"
                data-testid="barnaby-toggle-roam"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFreeRoam();
                }}
                title={companion.freeRoam ? 'Pause Barnaby movement' : 'Resume Barnaby movement'}
                aria-label={companion.freeRoam ? 'Pause movement' : 'Resume movement'}
                className="p-1 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
              >
                {companion.freeRoam ? (
                  <Pause className="w-3 h-3 text-[#F6C25B]" />
                ) : (
                  <Play className="w-3 h-3 text-[#9ED9FB]" />
                )}
              </button>
              <button
                type="button"
                data-barnaby-control="true"
                data-testid="barnaby-fly-now"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFlySomewhereNew();
                }}
                title="Fly to another spot"
                aria-label="Fly to another spot"
                className="p-1 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
              >
                <Compass className="w-3 h-3 text-[#9ED9FB]" />
              </button>
              <button
                type="button"
                data-barnaby-control="true"
                data-testid="barnaby-quick-pet"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePet();
                }}
                title="Pet Barnaby (+5 Bond XP)"
                aria-label="Pet Barnaby"
                className="p-1 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
              >
                <Heart className="w-3 h-3 text-[#FB7185]" />
              </button>
              <button
                type="button"
                data-barnaby-control="true"
                data-testid="barnaby-hide-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleHide(true);
                }}
                title="Temporarily hide Barnaby"
                aria-label="Hide Barnaby"
                className="p-1 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
              >
                <EyeOff className="w-3 h-3 text-white/80" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
