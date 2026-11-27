import { useCallback, useEffect, useRef, useState } from 'react';

export interface BarnabyDragOptions {
  /** Approximate rendered width/height of the floating Barnaby character in px */
  characterSize?: number;
  /** Minimum clearance from the top of the viewport (keeps header clear) */
  minTop?: number;
  /** Minimum clearance from the bottom of the viewport (keeps mobile BottomNav clear) */
  minBottom?: number;
  /** Horizontal inset from left/right viewport margins when docked */
  edgeMargin?: number;
  onSingleTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
}

export interface DragVelocity {
  vx: number;
  vy: number;
}

export interface DragOffset {
  dx: number;
  dy: number;
}

export interface BarnabyDragPhysicsResult {
  pos: { x: number; y: number };
  dragOffset: DragOffset;
  dragVelocity: DragVelocity;
  isDragging: boolean;
  dockSide: 'left' | 'right';
  isHydrated: boolean;
  resetToSafeCorner: () => void;
  handlers: {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  };
}

const DRAG_THRESHOLD_PX = 6;
const DOUBLE_TAP_WINDOW_MS = 260;
const LONG_PRESS_DURATION_MS = 580;

export const POS_STORAGE_KEY = 'barnaby_pos_v15';
const LEGACY_POS_KEYS = [
  'barnaby_pos_v1',
  'barnaby_pos_v2',
  'barnaby_pos_v3',
  'barnaby_pos_v4',
  'barnaby_pos_v5',
  'barnaby_pos_v6',
  'barnaby_pos_v7',
  'barnaby_pos_v8',
  'barnaby_pos_v9',
  'barnaby_pos_v10',
  'barnaby_pos_v11',
  'barnaby_pos_v12',
  'barnaby_pos_v13',
  'barnaby_pos_v14',
  'bandsprint_barnaby_pos_v1',
  'bandsprint_barnaby_float_pos_v1',
  'bandsprint_barnaby_float_pos_v2',
];

const MOBILE_CHAR_SIZE = 76;
const DESKTOP_CHAR_SIZE = 96;
const MOBILE_BOTTOM_OFFSET = 68;
const DESKTOP_BOTTOM_OFFSET = 24;
const MOBILE_RIGHT_OFFSET = 12;
const DESKTOP_RIGHT_OFFSET = 24;

function getViewportMetrics(customSize?: number) {
  if (typeof window === 'undefined') {
    return {
      vw: 1024,
      vh: 768,
      isMobile: false,
      effSize: customSize ?? DESKTOP_CHAR_SIZE,
      bottomOffset: DESKTOP_BOTTOM_OFFSET,
      rightOffset: DESKTOP_RIGHT_OFFSET,
    };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobile = vw < 768;
  const effSize = isMobile ? MOBILE_CHAR_SIZE : customSize ?? DESKTOP_CHAR_SIZE;
  const bottomOffset = isMobile ? MOBILE_BOTTOM_OFFSET : DESKTOP_BOTTOM_OFFSET;
  const rightOffset = isMobile ? MOBILE_RIGHT_OFFSET : DESKTOP_RIGHT_OFFSET;
  return { vw, vh, isMobile, effSize, bottomOffset, rightOffset };
}

function getHeroSafeMaxUpwardDy(
  vh: number,
  effSize: number,
  bottomOffset: number,
  minTop: number
): number {
  const defaultTopY = vh - bottomOffset - effSize;
  let safeMinTopY = minTop;

  if (typeof document !== 'undefined') {
    const heroEl = document.querySelector('[data-testid="daily-command-center-hero"]');
    if (heroEl) {
      const heroRect = heroEl.getBoundingClientRect();
      // If there is room below the green hero card, keep default spawn below it so Exam Day 42d is never covered
      if (heroRect.bottom > 0 && heroRect.bottom + 8 <= defaultTopY) {
        safeMinTopY = Math.max(minTop, Math.round(heroRect.bottom + 8));
      }
    }
  }

  return -Math.max(0, defaultTopY - safeMinTopY);
}

function clampDragOffset(
  dx: number,
  dy: number,
  minTop: number,
  customSize?: number,
  enforceHeroGap = false
): { dx: number; dy: number; x: number; y: number; dockSide: 'left' | 'right' } {
  const { vw, vh, effSize, bottomOffset, rightOffset } = getViewportMetrics(customSize);
  const anchorX = Math.max(rightOffset, vw - effSize - rightOffset);
  const anchorY = Math.max(minTop, vh - effSize - bottomOffset);

  const minDx = -Math.max(0, anchorX - rightOffset);
  const maxDx = 0;

  const minAllowedDy = enforceHeroGap
    ? getHeroSafeMaxUpwardDy(vh, effSize, bottomOffset, minTop)
    : -Math.max(0, anchorY - minTop);
  const maxAllowedDy = 0;

  const clampedDx = Math.round(Math.max(minDx, Math.min(maxDx, dx)));
  const clampedDy = Math.round(Math.max(minAllowedDy, Math.min(maxAllowedDy, dy)));
  const x = anchorX + clampedDx;
  const y = anchorY + clampedDy;
  const dockSide: 'left' | 'right' = x + effSize / 2 < vw / 2 ? 'left' : 'right';

  return { dx: clampedDx, dy: clampedDy, x, y, dockSide };
}

function clearLegacyStoredPositions(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    LEGACY_POS_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {}
}

function readStoredPosition(
  minTop: number,
  customSize?: number
): { dx: number; dy: number; x: number; y: number; dockSide: 'left' | 'right' } | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(POS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { dx?: unknown; dy?: unknown };
    if (
      typeof parsed.dx === 'number' &&
      typeof parsed.dy === 'number' &&
      Number.isFinite(parsed.dx) &&
      Number.isFinite(parsed.dy)
    ) {
      return clampDragOffset(parsed.dx, parsed.dy, minTop, customSize, true);
    }
    return null;
  } catch {
    return null;
  }
}

function saveStoredPosition(dx: number, dy: number, dockSide: 'left' | 'right'): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      POS_STORAGE_KEY,
      JSON.stringify({ dx: Math.round(dx), dy: Math.round(dy), dockSide })
    );
  } catch {}
}

export function useBarnabyDragPhysics(
  options: BarnabyDragOptions = {}
): BarnabyDragPhysicsResult {
  const {
    characterSize = DESKTOP_CHAR_SIZE,
    minTop = 76,
    onSingleTap,
    onDoubleTap,
    onLongPress,
  } = options;

  const [isHydrated, setIsHydrated] = useState(false);
  const [dragOffset, setDragOffset] = useState<DragOffset>({ dx: 0, dy: 0 });
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const initial = clampDragOffset(0, 0, minTop, characterSize, true);
    return { x: initial.x, y: initial.y };
  });
  const [dockSide, setDockSide] = useState<'left' | 'right'>('right');
  const [isDragging, setIsDragging] = useState(false);
  const [dragVelocity, setDragVelocity] = useState<DragVelocity>({ vx: 0, vy: 0 });

  const offsetRef = useRef<DragOffset>(dragOffset);
  offsetRef.current = dragOffset;

  const velRef = useRef<DragVelocity>({ vx: 0, vy: 0 });
  const singleTapTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const lastTapAtRef = useRef<number>(0);

  const callbacksRef = useRef({ onSingleTap, onDoubleTap, onLongPress });
  callbacksRef.current = { onSingleTap, onDoubleTap, onLongPress };

  const dragStateRef = useRef({
    active: false,
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    originDx: 0,
    originDy: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    moved: false,
    longPressed: false,
  });

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Hydrate persisted v15 position (clearing all legacy v1..v14 keys) & keep clamped on resize
  useEffect(() => {
    if (typeof window === 'undefined') return;
    clearLegacyStoredPositions();
    const restored = readStoredPosition(minTop, characterSize);
    const initial = restored ?? clampDragOffset(0, 0, minTop, characterSize, true);
    offsetRef.current = { dx: initial.dx, dy: initial.dy };
    setDragOffset({ dx: initial.dx, dy: initial.dy });
    setPos({ x: initial.x, y: initial.y });
    setDockSide(initial.dockSide);
    setIsHydrated(true);

    const onResize = () => {
      const clamped = clampDragOffset(
        offsetRef.current.dx,
        offsetRef.current.dy,
        minTop,
        characterSize,
        false
      );
      offsetRef.current = { dx: clamped.dx, dy: clamped.dy };
      setDragOffset({ dx: clamped.dx, dy: clamped.dy });
      setPos({ x: clamped.x, y: clamped.y });
      setDockSide(clamped.dockSide);
    };

    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      clearLongPress();
      if (singleTapTimerRef.current !== null) {
        window.clearTimeout(singleTapTimerRef.current);
      }
    };
  }, [characterSize, clearLongPress, minTop]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-no-drag="true"]')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      clearLongPress();

      const now = performance.now();
      dragStateRef.current = {
        active: true,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originDx: offsetRef.current.dx,
        originDy: offsetRef.current.dy,
        lastX: e.clientX,
        lastY: e.clientY,
        lastTime: now,
        moved: false,
        longPressed: false,
      };

      longPressTimerRef.current = window.setTimeout(() => {
        if (dragStateRef.current.active && !dragStateRef.current.moved) {
          dragStateRef.current.longPressed = true;
          dragStateRef.current.active = false;
          dragStateRef.current.pointerId = null;
          setIsDragging(false);
          if (singleTapTimerRef.current !== null) {
            window.clearTimeout(singleTapTimerRef.current);
            singleTapTimerRef.current = null;
          }
          callbacksRef.current.onLongPress?.();
        }
      }, LONG_PRESS_DURATION_MS);
    },
    [clearLongPress]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const ds = dragStateRef.current;
      if (!ds.active || ds.pointerId !== e.pointerId) return;

      const deltaX = e.clientX - ds.startX;
      const deltaY = e.clientY - ds.startY;

      if (!ds.moved) {
        if (Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) return;
        ds.moved = true;
        clearLongPress();
        setIsDragging(true);
        try {
          e.currentTarget.setPointerCapture?.(e.pointerId);
        } catch {}
      }

      const now = performance.now();
      const dt = Math.max(0.008, (now - ds.lastTime) / 1000);
      const rawVx = (e.clientX - ds.lastX) / dt;
      const rawVy = (e.clientY - ds.lastY) / dt;
      const smoothVx = velRef.current.vx * 0.55 + rawVx * 0.45;
      const smoothVy = velRef.current.vy * 0.55 + rawVy * 0.45;
      velRef.current = { vx: smoothVx, vy: smoothVy };
      ds.lastX = e.clientX;
      ds.lastY = e.clientY;
      ds.lastTime = now;

      const clamped = clampDragOffset(
        ds.originDx + deltaX,
        ds.originDy + deltaY,
        minTop,
        characterSize,
        false
      );
      offsetRef.current = { dx: clamped.dx, dy: clamped.dy };
      setDragOffset({ dx: clamped.dx, dy: clamped.dy });
      setPos({ x: clamped.x, y: clamped.y });
      setDockSide(clamped.dockSide);
      setDragVelocity({ vx: smoothVx, vy: smoothVy });
    },
    [characterSize, clearLongPress, minTop]
  );

  const finishPointer = useCallback(
    (e: React.PointerEvent<HTMLElement>, isCancel: boolean) => {
      const ds = dragStateRef.current;
      clearLongPress();

      if (!ds.active || ds.pointerId !== e.pointerId) return;

      const wasMoved = ds.moved;
      const wasLongPressed = ds.longPressed;
      ds.active = false;
      ds.pointerId = null;
      ds.moved = false;
      ds.longPressed = false;
      setIsDragging(false);
      velRef.current = { vx: 0, vy: 0 };
      setDragVelocity({ vx: 0, vy: 0 });

      try {
        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {}

      if (wasLongPressed) return;

      if (wasMoved) {
        const clamped = clampDragOffset(
          offsetRef.current.dx,
          offsetRef.current.dy,
          minTop,
          characterSize,
          false
        );
        offsetRef.current = { dx: clamped.dx, dy: clamped.dy };
        setDragOffset({ dx: clamped.dx, dy: clamped.dy });
        setPos({ x: clamped.x, y: clamped.y });
        setDockSide(clamped.dockSide);
        saveStoredPosition(clamped.dx, clamped.dy, clamped.dockSide);
        return;
      }

      if (isCancel) return;

      const now = performance.now();
      if (now - lastTapAtRef.current <= DOUBLE_TAP_WINDOW_MS) {
        lastTapAtRef.current = 0;
        if (singleTapTimerRef.current !== null) {
          window.clearTimeout(singleTapTimerRef.current);
          singleTapTimerRef.current = null;
        }
        callbacksRef.current.onDoubleTap?.();
      } else {
        lastTapAtRef.current = now;
        if (singleTapTimerRef.current !== null) {
          window.clearTimeout(singleTapTimerRef.current);
        }
        singleTapTimerRef.current = window.setTimeout(() => {
          singleTapTimerRef.current = null;
          lastTapAtRef.current = 0;
          callbacksRef.current.onSingleTap?.();
        }, DOUBLE_TAP_WINDOW_MS);
      }
    },
    [characterSize, clearLongPress, minTop]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => finishPointer(e, false),
    [finishPointer]
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLElement>) => finishPointer(e, true),
    [finishPointer]
  );

  const resetToSafeCorner = useCallback(() => {
    const corner = clampDragOffset(0, 0, minTop, characterSize, true);
    offsetRef.current = { dx: 0, dy: 0 };
    setDragOffset({ dx: 0, dy: 0 });
    setPos({ x: corner.x, y: corner.y });
    setDockSide('right');
    velRef.current = { vx: 0, vy: 0 };
    setDragVelocity({ vx: 0, vy: 0 });
    saveStoredPosition(0, 0, 'right');
  }, [characterSize, minTop]);

  return {
    pos,
    dragOffset,
    dragVelocity,
    isDragging,
    dockSide,
    isHydrated,
    resetToSafeCorner,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}
