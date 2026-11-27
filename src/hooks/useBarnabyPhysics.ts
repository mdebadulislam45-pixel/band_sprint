import { useCallback, useEffect, useRef, useState } from 'react';
import type { BarnabyAnimationState, BarnabyExpression, BarnabyMode } from '../types/barnaby';

export interface UseBarnabyPhysicsOptions {
  mode?: BarnabyMode;
  expression?: BarnabyExpression;
  animationState?: BarnabyAnimationState;
  locomotion?: 'walk' | 'stand' | 'hover';
  isSpeaking?: boolean;
  interactive?: boolean;
  trackWindowPointer?: boolean;
  /** External pointer drag / magnetic-glide velocity in px/sec */
  dragVelocity?: { vx: number; vy: number };
  /** True while user is actively carrying Barnaby */
  isDragging?: boolean;
  /** Incrementing signal to fire a weightless tap hop + star burst */
  hopSignal?: number;
  /** Incrementing signal to fire an affectionate double-tap sparkle burst */
  affectionSignal?: number;
}

export interface BarnabyPhysicsSnapshot {
  bodyY: number;
  bodyX: number;
  bodyTilt: number;
  bodyScale: number;
  headTilt: number;
  tiltX: number;
  tiltY: number;
  earLeftAngle: number;
  earRightAngle: number;
  tailBaseAngle: number;
  tailMidAngle: number;
  tailTipAngle: number;
  pupilOffset: { x: number; y: number };
  isBlinking: boolean;
  spectaclesOffsetY: number;
  particlesPhase: number;
  celebrationBurst: number;
  isTapSparkling: boolean;
  isAffectionSparkling: boolean;
  speakPhase: number;
  breathWave: number;
}

interface SpringState {
  value: number;
  velocity: number;
}

function stepSpring(
  state: SpringState,
  target: number,
  stiffness: number,
  damping: number,
  mass: number,
  dt: number
): SpringState {
  const force = (target - state.value) * stiffness;
  const dampingForce = state.velocity * damping;
  const accel = (force - dampingForce) / mass;
  const nextVel = state.velocity + accel * dt;
  const nextVal = state.value + nextVel * dt;
  return { value: nextVal, velocity: nextVel };
}

function getExpressionPosture(
  expression: BarnabyExpression,
  mode: BarnabyMode,
  animationState?: BarnabyAnimationState
) {
  if (
    animationState === 'celebratory' ||
    mode === 'celebration' ||
    expression === 'celebrating' ||
    expression === 'proud' ||
    expression === 'excited'
  ) {
    return {
      earTarget: -10,
      headTiltBase: -3,
      floatAmp: 5.5,
      floatFreq: 2.2,
      tailFreq: 3.1,
      tailAmp: 12,
      spectaclesShift: -0.6,
    };
  }
  if (animationState === 'bored') {
    return {
      earTarget: 15,
      headTiltBase: 7.0,
      floatAmp: 1.8,
      floatFreq: 0.65,
      tailFreq: 0.72,
      tailAmp: 3.2,
      spectaclesShift: 1.2,
    };
  }
  if (animationState === 'focused') {
    return {
      earTarget: -8,
      headTiltBase: 2.0,
      floatAmp: 1.4,
      floatFreq: 0.95,
      tailFreq: 0.9,
      tailAmp: 2.8,
      spectaclesShift: 1.1,
    };
  }
  if (expression === 'analytical' || expression === 'thinking' || expression === 'confused') {
    return {
      earTarget: -6,
      headTiltBase: 6.5,
      floatAmp: 3.5,
      floatFreq: 1.4,
      tailFreq: 1.6,
      tailAmp: 6,
      spectaclesShift: 1.6,
    };
  }
  if (expression === 'curious' || expression === 'surprised' || expression === 'listening') {
    return {
      earTarget: -9,
      headTiltBase: -5,
      floatAmp: 4.5,
      floatFreq: 1.8,
      tailFreq: 2.3,
      tailAmp: 9,
      spectaclesShift: -0.9,
    };
  }
  if (expression === 'sleepy' || expression === 'relaxed') {
    return {
      earTarget: 13,
      headTiltBase: 3.5,
      floatAmp: 2.8,
      floatFreq: 1.05,
      tailFreq: 1.1,
      tailAmp: 4.5,
      spectaclesShift: 0.4,
    };
  }
  if (expression === 'empathetic' || expression === 'shy') {
    return {
      earTarget: 9,
      headTiltBase: 4,
      floatAmp: 3.4,
      floatFreq: 1.3,
      tailFreq: 1.4,
      tailAmp: 5.5,
      spectaclesShift: 0.3,
    };
  }
  return {
    earTarget: -2,
    headTiltBase: 0,
    floatAmp: 4.4,
    floatFreq: 1.55,
    tailFreq: 1.85,
    tailAmp: 7.5,
    spectaclesShift: 0,
  };
}

export function useBarnabyPhysics(options: UseBarnabyPhysicsOptions = {}) {
  const {
    mode = 'ambient',
    expression = 'neutral',
    animationState,
    locomotion = 'stand',
    isSpeaking = false,
    interactive = true,
    trackWindowPointer = false,
    dragVelocity = { vx: 0, vy: 0 },
    isDragging = false,
    hopSignal = 0,
    affectionSignal = 0,
  } = options;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerNormRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  const dragInputRef = useRef({ vx: 0, vy: 0, isDragging: false });
  dragInputRef.current = { vx: dragVelocity.vx, vy: dragVelocity.vy, isDragging };

  const [reducedMotion, setReducedMotion] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isTapSparkling, setIsTapSparkling] = useState(false);
  const [isAffectionSparkling, setIsAffectionSparkling] = useState(false);
  const tapSparkTimerRef = useRef<number | null>(null);
  const affectionTimerRef = useRef<number | null>(null);

  const physicsRef = useRef({
    bodyY: { value: 0, velocity: 0 },
    bodyX: { value: 0, velocity: 0 },
    bodyTilt: { value: 0, velocity: 0 },
    bodyScale: { value: 1, velocity: 0 },
    headTilt: { value: 0, velocity: 0 },
    tiltX: { value: 0, velocity: 0 },
    tiltY: { value: 0, velocity: 0 },
    earLeft: { value: 0, velocity: 0 },
    earRight: { value: 0, velocity: 0 },
    tailBase: { value: 0, velocity: 0 },
    tailMid: { value: 0, velocity: 0 },
    tailTip: { value: 0, velocity: 0 },
    pupilX: { value: 0, velocity: 0 },
    pupilY: { value: 0, velocity: 0 },
    spectaclesY: { value: 0, velocity: 0 },
    celebrationBurst: { value: 0, velocity: 0 },
    earTwitchLeft: 0,
    earTwitchRight: 0,
    nextTwitchAt: 0,
    elapsed: 0,
  });

  const [snapshot, setSnapshot] = useState<BarnabyPhysicsSnapshot>(() => ({
    bodyY: 0,
    bodyX: 0,
    bodyTilt: 0,
    bodyScale: 1,
    headTilt: 0,
    tiltX: 0,
    tiltY: 0,
    earLeftAngle: 0,
    earRightAngle: 0,
    tailBaseAngle: 0,
    tailMidAngle: 0,
    tailTipAngle: 0,
    pupilOffset: { x: 0, y: 0 },
    isBlinking: false,
    spectaclesOffsetY: 0,
    particlesPhase: 0,
    celebrationBurst: mode === 'celebration' ? 1 : 0,
    isTapSparkling: false,
    isAffectionSparkling: false,
    speakPhase: 0,
    breathWave: 0,
  }));

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  // Natural randomized single/double blink loop every 3-5 seconds
  useEffect(() => {
    if (typeof window === 'undefined' || reducedMotion) return;
    let blinkTimeout: number | null = null;
    let step1Timeout: number | null = null;
    let step2Timeout: number | null = null;
    let step3Timeout: number | null = null;

    const clearAll = () => {
      if (blinkTimeout !== null) window.clearTimeout(blinkTimeout);
      if (step1Timeout !== null) window.clearTimeout(step1Timeout);
      if (step2Timeout !== null) window.clearTimeout(step2Timeout);
      if (step3Timeout !== null) window.clearTimeout(step3Timeout);
    };

    const scheduleBlink = () => {
      const delayMs = 3000 + Math.random() * 2000;
      blinkTimeout = window.setTimeout(() => {
        // First blink
        setIsBlinking(true);
        step1Timeout = window.setTimeout(() => {
          setIsBlinking(false);
          // Second quick blink (double-blink ~60% of the time)
          if (Math.random() < 0.6) {
            step2Timeout = window.setTimeout(() => {
              setIsBlinking(true);
              step3Timeout = window.setTimeout(() => {
                setIsBlinking(false);
                scheduleBlink();
              }, 95);
            }, 78);
          } else {
            scheduleBlink();
          }
        }, 105);
      }, delayMs);
    };

    scheduleBlink();
    return clearAll;
  }, [reducedMotion]);

  // Trigger burst impulse when entering celebration mode or celebratory animation state
  useEffect(() => {
    if (mode !== 'celebration' && animationState !== 'celebratory') return;
    const p = physicsRef.current;
    p.bodyY.velocity -= 115;
    p.bodyScale.velocity += 2.2;
    p.earLeft.velocity -= 95;
    p.earRight.velocity += 95;
    p.tailBase.velocity += 80;
    p.celebrationBurst.value = 0.2;
    p.celebrationBurst.velocity = 6.5;
  }, [animationState, mode]);

  const updatePointerFromClient = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxDist = Math.max(rect.width, 160);
    const nx = Math.max(-1, Math.min(1, (clientX - cx) / maxDist));
    const ny = Math.max(-1, Math.min(1, (clientY - cy) / maxDist));
    pointerNormRef.current = { x: nx, y: ny, active: true };
  }, []);

  // Optional window-level pointer & touch tracking (for persistent FloatingBarnaby)
  useEffect(() => {
    if (!interactive || !trackWindowPointer || typeof window === 'undefined') return;
    const onMove = (e: PointerEvent) => {
      updatePointerFromClient(e.clientX, e.clientY);
    };
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) updatePointerFromClient(t.clientX, t.clientY);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('touchstart', onTouch);
      window.removeEventListener('touchmove', onTouch);
    };
  }, [interactive, trackWindowPointer, updatePointerFromClient]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!interactive) return;
      updatePointerFromClient(e.clientX, e.clientY);
    },
    [interactive, updatePointerFromClient]
  );

  const onPointerLeave = useCallback(() => {
    if (!trackWindowPointer) {
      pointerNormRef.current = { x: 0, y: 0, active: false };
    }
  }, [trackWindowPointer]);

  const triggerTapBounce = useCallback(() => {
    const p = physicsRef.current;
    p.bodyY.velocity -= 165;
    p.bodyScale.velocity += 2.8;
    p.earLeft.velocity -= 125;
    p.earRight.velocity += 125;
    p.tailBase.velocity += 95;
    p.tailMid.velocity -= 75;
    p.celebrationBurst.velocity += 6.2;

    setIsTapSparkling(true);
    if (tapSparkTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(tapSparkTimerRef.current);
    }
    if (typeof window !== 'undefined') {
      tapSparkTimerRef.current = window.setTimeout(() => {
        setIsTapSparkling(false);
        tapSparkTimerRef.current = null;
      }, 920);
    }
  }, []);

  const triggerAffectionBurst = useCallback(() => {
    const p = physicsRef.current;
    p.bodyY.velocity -= 130;
    p.bodyScale.velocity += 2.4;
    p.headTilt.velocity -= 65;
    p.earLeft.velocity -= 90;
    p.earRight.velocity += 90;
    p.tailBase.velocity += 125;
    p.tailMid.velocity -= 105;
    p.celebrationBurst.value = Math.max(p.celebrationBurst.value, 0.35);
    p.celebrationBurst.velocity += 7.5;

    setIsAffectionSparkling(true);
    if (affectionTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(affectionTimerRef.current);
    }
    if (typeof window !== 'undefined') {
      affectionTimerRef.current = window.setTimeout(() => {
        setIsAffectionSparkling(false);
        affectionTimerRef.current = null;
      }, 1900);
    }
  }, []);

  useEffect(() => {
    if (hopSignal > 0) {
      triggerTapBounce();
    }
  }, [hopSignal, triggerTapBounce]);

  useEffect(() => {
    if (affectionSignal > 0) {
      triggerAffectionBurst();
    }
  }, [affectionSignal, triggerAffectionBurst]);

  const prevDraggingRef = useRef(isDragging);
  useEffect(() => {
    if (prevDraggingRef.current && !isDragging) {
      // Elastic touchdown squash & spring recovery
      const p = physicsRef.current;
      p.bodyScale.velocity -= 1.8;
      p.bodyY.velocity += 90;
      p.earLeft.velocity += 55;
      p.earRight.velocity -= 55;
      p.tailBase.velocity -= 70;
    }
    prevDraggingRef.current = isDragging;
  }, [isDragging]);

  // Smooth spring anticipation & settle impulses on locomotion changes (walk <-> stand <-> hover)
  const prevLocomotionRef = useRef(locomotion);
  useEffect(() => {
    if (prevLocomotionRef.current !== locomotion) {
      const prev = prevLocomotionRef.current;
      const p = physicsRef.current;
      if (locomotion === 'walk') {
        // Anticipation crouch into 4-paw stride
        p.bodyY.velocity += 68;
        p.bodyScale.velocity -= 1.25;
        p.headTilt.velocity += 24;
        p.tailBase.velocity += 65;
      } else if (locomotion === 'hover') {
        // Buoyant upward lift impulse
        p.bodyY.velocity -= 95;
        p.bodyScale.velocity += 1.4;
        p.earLeft.velocity -= 60;
        p.earRight.velocity += 60;
      } else if (locomotion === 'stand') {
        // Settle bounce back to upright scholar posture
        p.bodyY.velocity += prev === 'hover' ? 85 : 52;
        p.bodyScale.velocity -= 1.35;
        p.earLeft.velocity += 45;
        p.earRight.velocity -= 45;
        p.tailMid.velocity -= 55;
      }
      prevLocomotionRef.current = locomotion;
    }
  }, [locomotion]);

  useEffect(() => {
    return () => {
      if (tapSparkTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(tapSparkTimerRef.current);
      }
      if (affectionTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(affectionTimerRef.current);
      }
    };
  }, []);

  // Spring-damper rAF physics loop
  useEffect(() => {
    if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') return;

    if (reducedMotion) {
      const posture = getExpressionPosture(expression, mode, animationState);
      setSnapshot((prev) => ({
        ...prev,
        bodyY: 0,
        bodyX: 0,
        bodyTilt: 0,
        bodyScale: 1,
        headTilt: posture.headTiltBase * 0.4,
        tiltX: 0,
        tiltY: 0,
        earLeftAngle: posture.earTarget,
        earRightAngle: -posture.earTarget,
        tailBaseAngle: 0,
        tailMidAngle: 0,
        tailTipAngle: 0,
        spectaclesOffsetY: posture.spectaclesShift,
        celebrationBurst:
          mode === 'celebration' || animationState === 'celebratory' ? 1 : 0,
        isAffectionSparkling,
      }));
      return;
    }

    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const rawDt = (now - lastTs) / 1000;
      lastTs = now;
      const dt = Math.min(0.035, Math.max(0.004, rawDt));

      const p = physicsRef.current;
      p.elapsed += dt;
      const t = p.elapsed;
      const posture = getExpressionPosture(expression, mode, animationState);
      const drag = dragInputRef.current;
      const dragSpeed = Math.hypot(drag.vx, drag.vy);

      // Subtle randomized idle ear twitch every 2.8 - 4.8s
      if (t >= p.nextTwitchAt) {
        p.nextTwitchAt = t + 2.8 + Math.random() * 2.0;
        if (Math.random() < 0.5) {
          p.earTwitchLeft = -8;
        } else {
          p.earTwitchRight = 8;
        }
      }
      p.earTwitchLeft *= Math.pow(0.04, dt);
      p.earTwitchRight *= Math.pow(0.04, dt);

      // Desynchronized multi-phase harmonic hover & breathing (no robotic loop)
      const hoverScale = drag.isDragging ? 0.35 : 1;
      const organicBreath =
        Math.sin(t * 1.13) * 0.62 + Math.sin(t * 1.79 + 1.2) * 0.38;
      const targetY =
        (Math.sin(t * posture.floatFreq * 0.91) * 0.65 +
          Math.sin(t * posture.floatFreq * 1.47 + 1.2) * 0.35) *
        posture.floatAmp *
        hoverScale;
      const targetX =
        (Math.cos(t * 0.73 + 0.4) * 0.65 + Math.sin(t * 1.37 + 2.1) * 0.35) *
        2.1 *
        hoverScale;
      const targetScale = drag.isDragging ? 1.05 : mode === 'celebration' ? 1.03 : 1.0;

      // Lean body smoothly into horizontal drag vector
      const targetBodyTilt = Math.max(-17, Math.min(17, drag.vx * 0.019));

      p.bodyY = stepSpring(p.bodyY, targetY, 95, 11, 1.0, dt);
      p.bodyX = stepSpring(p.bodyX, targetX, 75, 10, 1.0, dt);
      p.bodyTilt = stepSpring(p.bodyTilt, targetBodyTilt, 125, 13.5, 0.95, dt);
      p.bodyScale = stepSpring(p.bodyScale, targetScale, 150, 12, 0.9, dt);

      // Pointer tracking & head tilt
      const ptr = pointerNormRef.current;
      const idleGazeX = Math.sin(t * 0.61) * 0.55 + Math.sin(t * 0.97 + 1.7) * 0.35;
      const idleGazeY = Math.cos(t * 0.43 + 0.9) * 0.38;
      const targetPupilX = ptr.active ? ptr.x * 3.4 : idleGazeX;
      const targetPupilY = ptr.active ? ptr.y * 2.5 : idleGazeY;

      p.pupilX = stepSpring(p.pupilX, targetPupilX, 220, 18, 0.7, dt);
      p.pupilY = stepSpring(p.pupilY, targetPupilY, 220, 18, 0.7, dt);

      const pointerTilt = ptr.active
        ? ptr.x * 4.5
        : Math.sin(t * 0.83) * 1.1 + Math.sin(t * 1.31 + 1.4) * 0.7;
      const dragHeadTilt = Math.max(-8, Math.min(8, drag.vx * 0.008));
      const targetHeadTilt = posture.headTiltBase + pointerTilt + dragHeadTilt;
      p.headTilt = stepSpring(p.headTilt, targetHeadTilt, 110, 13, 1.0, dt);

      // Subtle 3D perspective turn toward cursor/touch (perspective 600px rotateY / rotateX)
      const targetTiltY = ptr.active
        ? ptr.x * 13
        : Math.sin(t * 0.79) * 1.8 + Math.cos(t * 1.19 + 0.8) * 1.0;
      const targetTiltX = ptr.active
        ? -ptr.y * 9
        : Math.cos(t * 0.57 + 0.5) * 1.4;
      p.tiltY = stepSpring(p.tiltY, targetTiltY, 130, 15, 0.9, dt);
      p.tiltX = stepSpring(p.tiltX, targetTiltX, 130, 15, 0.9, dt);

      // Independent ears: vertical velocity follow-through + gentle aerodynamic sweep-back while dragging
      const velocityLag = Math.max(-14, Math.min(14, p.bodyY.velocity * 0.14));
      const earDragSweep = Math.min(18, dragSpeed * 0.018);
      const earLeftTarget = posture.earTarget + velocityLag + p.earTwitchLeft - earDragSweep * 0.85;
      const earRightTarget = -posture.earTarget - velocityLag + p.earTwitchRight + earDragSweep * 0.85;

      p.earLeft = stepSpring(p.earLeft, earLeftTarget, 145, 11, 0.85, dt);
      p.earRight = stepSpring(p.earRight, earRightTarget, 145, 11, 0.85, dt);

      // 3-segment physics tail with desynchronized multi-harmonic figure-eight inertia
      const dragTailX = Math.max(-24, Math.min(24, -drag.vx * 0.026));
      const dragTailY = Math.max(-18, Math.min(18, drag.vy * 0.02));

      const tailBaseTarget =
        (Math.sin(t * posture.tailFreq * 1.13) * 0.68 +
          Math.sin(t * posture.tailFreq * 1.79 + 1.2) * 0.32) *
          posture.tailAmp +
        p.bodyY.velocity * 0.12 +
        dragTailX * 0.75 +
        dragTailY * 0.55;
      p.tailBase = stepSpring(p.tailBase, tailBaseTarget, 90, 9.5, 1.0, dt);

      const tailMidTarget =
        (Math.sin(t * posture.tailFreq * 1.13 - 0.72) * 0.65 +
          Math.cos(t * posture.tailFreq * 1.79 + 0.5) * 0.35) *
          (posture.tailAmp * 0.95) -
        p.tailBase.velocity * 0.085 +
        p.bodyY.velocity * 0.09 +
        dragTailX * 0.95 +
        dragTailY * 0.65;
      p.tailMid = stepSpring(p.tailMid, tailMidTarget, 76, 8.0, 1.1, dt);

      const tailTipTarget =
        (Math.sin(t * posture.tailFreq * 1.13 - 1.45) * 0.65 +
          Math.sin(t * posture.tailFreq * 1.79 + 2.1) * 0.35) *
          (posture.tailAmp * 1.05) -
        p.tailMid.velocity * 0.11 +
        dragTailX * 1.15;
      p.tailTip = stepSpring(p.tailTip, tailTipTarget, 64, 7.0, 1.18, dt);

      p.spectaclesY = stepSpring(p.spectaclesY, posture.spectaclesShift, 135, 14, 0.8, dt);

      const burstTarget =
        mode === 'celebration' || animationState === 'celebratory' || isAffectionSparkling
          ? 1
          : 0;
      p.celebrationBurst = stepSpring(p.celebrationBurst, burstTarget, 105, 11, 0.9, dt);

      setSnapshot({
        bodyY: p.bodyY.value,
        bodyX: p.bodyX.value,
        bodyTilt: p.bodyTilt.value,
        bodyScale: Math.max(0.92, Math.min(1.16, p.bodyScale.value)),
        headTilt: p.headTilt.value,
        tiltX: p.tiltX.value,
        tiltY: p.tiltY.value,
        earLeftAngle: p.earLeft.value,
        earRightAngle: p.earRight.value,
        tailBaseAngle: p.tailBase.value,
        tailMidAngle: p.tailMid.value,
        tailTipAngle: p.tailTip.value,
        pupilOffset: { x: p.pupilX.value, y: p.pupilY.value },
        isBlinking,
        spectaclesOffsetY: p.spectaclesY.value,
        particlesPhase: t,
        celebrationBurst: Math.max(0, Math.min(1.3, p.celebrationBurst.value)),
        isTapSparkling,
        isAffectionSparkling,
        speakPhase: isSpeaking ? Math.abs(Math.sin(t * 14)) : 0,
        breathWave: organicBreath,
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [animationState, expression, isAffectionSparkling, isBlinking, isSpeaking, isTapSparkling, mode, reducedMotion]);

  return {
    containerRef,
    physics: snapshot,
    onPointerMove,
    onPointerLeave,
    triggerTapBounce,
    triggerAffectionBurst,
  };
}
