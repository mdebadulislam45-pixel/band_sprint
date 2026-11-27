import React, { useEffect, useRef, useState } from 'react';

export interface BarnabyPawDustEmitterProps {
  /** Whether Barnaby is actively walking along the bottom ledge */
  isWalking: boolean;
  /** Current horizontal patrol direction */
  facingDirection: 'left' | 'right';
  /** Normalized walk speed multiplier (ease-in / ease-out envelope) */
  walkSpeedFactor?: number;
  /** Optional hop / landing signal to emit a dual-paw landing puff */
  hopSignal?: number;
  /** Disable emission while dragging */
  isDragging?: boolean;
}

export interface PawDustPuffParticle {
  id: number;
  /** Percentage X coordinate inside Barnaby's character box (0..100) */
  xPct: number;
  /** Percentage Y coordinate from bottom of Barnaby's character box */
  bottomPct: number;
  /** Horizontal drift in px (trails opposite to walking direction) */
  driftX: number;
  /** Vertical billow lift in px (negative = upward) */
  driftY: number;
  /** Base sprite diameter in px */
  sizePx: number;
  /** Lifetime duration in ms */
  durationMs: number;
  /** Spawn timestamp (performance.now()) */
  spawnedAt: number;
  /** Visual variant: 'cloud' (clustered 3-lobe puff) or 'wisp' (soft round mote) */
  variant: 'cloud' | 'wisp';
  /** Initial rotation in deg */
  rotationDeg: number;
}

/**
 * Shared stride angular velocity (rad/s at walkSpeedFactor = 1) used by both
 * BarnabyRig and BarnabyPawDustEmitter so dust puffs fire at the exact peak
 * of Barnaby's two-beat stride bounce.
 */
export const BARNABY_STRIDE_BASE_OMEGA = 8.4;

/**
 * Tactile Paw Dust Puff Particle Emitter (`src/components/BarnabyPawDustEmitter.tsx`).
 * Spawns tiny studio dust puff sprites at Barnaby's front and hind paw positions
 * whenever his stride bounce reaches its peak, grounding his walk cycle on the ledge.
 */
export const BarnabyPawDustEmitter: React.FC<BarnabyPawDustEmitterProps> = ({
  isWalking,
  facingDirection,
  walkSpeedFactor = 1,
  hopSignal = 0,
  isDragging = false,
}) => {
  const [puffs, setPuffs] = useState<PawDustPuffParticle[]>([]);
  const nextIdRef = useRef(1);
  const stridePhaseRef = useRef(0);
  const lastStepIndexRef = useRef(-1);
  const prevHopSignalRef = useRef(hopSignal);

  const liveStateRef = useRef({
    isWalking,
    facingDirection,
    walkSpeedFactor,
    isDragging,
  });
  liveStateRef.current = {
    isWalking,
    facingDirection,
    walkSpeedFactor,
    isDragging,
  };

  // Emit a dual-paw landing dust burst when Barnaby hops
  useEffect(() => {
    if (hopSignal > prevHopSignalRef.current && !isDragging) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const burst: PawDustPuffParticle[] = [
        {
          id: nextIdRef.current++,
          xPct: 34,
          bottomPct: 9,
          driftX: -11,
          driftY: -6,
          sizePx: 11,
          durationMs: 480,
          spawnedAt: now,
          variant: 'cloud',
          rotationDeg: -15,
        },
        {
          id: nextIdRef.current++,
          xPct: 66,
          bottomPct: 9,
          driftX: 11,
          driftY: -6,
          sizePx: 11,
          durationMs: 480,
          spawnedAt: now,
          variant: 'cloud',
          rotationDeg: 18,
        },
        {
          id: nextIdRef.current++,
          xPct: 50,
          bottomPct: 8,
          driftX: 0,
          driftY: -8,
          sizePx: 7.5,
          durationMs: 420,
          spawnedAt: now,
          variant: 'wisp',
          rotationDeg: 0,
        },
      ];
      setPuffs((prev) => [...prev.slice(-14), ...burst]);
    }
    prevHopSignalRef.current = hopSignal;
  }, [hopSignal, isDragging]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.004, (now - lastTs) / 1000));
      lastTs = now;
      const st = liveStateRef.current;

      if (st.isWalking && !st.isDragging) {
        const speedMult = Math.max(0.55, Math.min(1.4, st.walkSpeedFactor));
        stridePhaseRef.current += dt * BARNABY_STRIDE_BASE_OMEGA * speedMult;

        // Two-beat stride bounce abs(sin(stridePhase)) reaches its peak at
        // stridePhase = PI/2 + k * PI (i.e. shiftedPhase = stridePhase - PI/2 crosses k * PI)
        const shiftedPhase = stridePhaseRef.current - Math.PI * 0.5;
        if (shiftedPhase >= 0) {
          const stepIndex = Math.floor(shiftedPhase / Math.PI);
          if (stepIndex > lastStepIndexRef.current) {
            lastStepIndexRef.current = stepIndex;
            const isFrontBeat = stepIndex % 2 === 0;
            const trailSign = st.facingDirection === 'left' ? 1 : -1;

            // Map paw contact position in % of the 260x260 studio frame:
            // Facing left: front paw ~ 33%, hind paw ~ 66%
            // Facing right: front paw ~ 67%, hind paw ~ 34%
            const primaryPawXPct =
              st.facingDirection === 'left'
                ? isFrontBeat
                  ? 33
                  : 65
                : isFrontBeat
                ? 67
                : 35;

            const secondaryPawXPct =
              st.facingDirection === 'left'
                ? isFrontBeat
                  ? 61
                  : 39
                : isFrontBeat
                ? 39
                : 61;

            const newPuffs: PawDustPuffParticle[] = [
              // Primary multi-lobe dust puff at lead stepping paw
              {
                id: nextIdRef.current++,
                xPct: primaryPawXPct + (Math.random() * 3 - 1.5),
                bottomPct: 9.5 + (Math.random() * 1.5 - 0.75),
                driftX: trailSign * (8 + Math.random() * 5) * speedMult,
                driftY: -(4.5 + Math.random() * 3.5),
                sizePx: (9.5 + Math.random() * 2.2) * Math.min(1.15, 0.82 + speedMult * 0.25),
                durationMs: 470,
                spawnedAt: now,
                variant: 'cloud',
                rotationDeg: Math.round(Math.random() * 40 - 20),
              },
              // Trailing micro-wisp behind the primary paw
              {
                id: nextIdRef.current++,
                xPct: primaryPawXPct + trailSign * 3.5,
                bottomPct: 8.8,
                driftX: trailSign * (12 + Math.random() * 4) * speedMult,
                driftY: -(6.5 + Math.random() * 2.5),
                sizePx: 6.2 + Math.random() * 1.6,
                durationMs: 410,
                spawnedAt: now,
                variant: 'wisp',
                rotationDeg: 0,
              },
              // Subtle secondary diagonal paw dust mote
              {
                id: nextIdRef.current++,
                xPct: secondaryPawXPct,
                bottomPct: 9.2,
                driftX: trailSign * (6.5 + Math.random() * 3) * speedMult,
                driftY: -(3.5 + Math.random() * 2.2),
                sizePx: 6.8 + Math.random() * 1.4,
                durationMs: 430,
                spawnedAt: now,
                variant: 'wisp',
                rotationDeg: 0,
              },
            ];

            setPuffs((prev) => {
              const alive = prev.filter((p) => now - p.spawnedAt < p.durationMs);
              return [...alive.slice(-15), ...newPuffs];
            });
          }
        }
      } else {
        stridePhaseRef.current = 0;
        lastStepIndexRef.current = -1;
      }

      // Prune expired particles once they finish fading
      setPuffs((prev) => {
        if (prev.length === 0) return prev;
        const alive = prev.filter((p) => now - p.spawnedAt < p.durationMs);
        return alive.length === prev.length ? prev : alive;
      });

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return (
    <div
      data-testid="barnaby-paw-dust-emitter"
      data-active={isWalking && !isDragging ? 'true' : 'false'}
      aria-hidden="true"
      className="pointer-events-none select-none absolute inset-0 overflow-visible z-20"
    >
      {puffs.map((puff) => {
        const age = Math.max(0, now - puff.spawnedAt);
        const progress = Math.max(0, Math.min(1, age / puff.durationMs));
        // Fast pop-in (0..0.18) then smooth billow & fade-out (0.18..1.0)
        const easeOut = 1 - Math.pow(1 - progress, 2.2);
        const scale = 0.38 + easeOut * 0.96;
        const opacity =
          progress < 0.16
            ? (progress / 0.16) * 0.86
            : Math.max(0, (1 - (progress - 0.16) / 0.84) * 0.86);
        const tx = puff.driftX * easeOut;
        const ty = puff.driftY * easeOut;
        const rot = puff.rotationDeg + easeOut * (puff.driftX >= 0 ? 18 : -18);

        return (
          <span
            key={puff.id}
            data-testid="barnaby-dust-puff"
            style={{
              left: `${puff.xPct.toFixed(1)}%`,
              bottom: `${puff.bottomPct.toFixed(1)}%`,
              width: `${puff.sizePx.toFixed(1)}px`,
              height: `${puff.sizePx.toFixed(1)}px`,
              opacity: Number(opacity.toFixed(3)),
              transform: `translate3d(calc(-50% + ${tx.toFixed(1)}px), ${ty.toFixed(
                1
              )}px, 0) scale(${scale.toFixed(3)}) rotate(${rot.toFixed(1)}deg)`,
            }}
            className="absolute block will-change-transform"
          >
            {puff.variant === 'cloud' ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-full h-full"
              >
                <circle cx="9.5" cy="13.5" r="5.5" fill="#A7F3D0" fillOpacity="0.42" />
                <circle cx="14.5" cy="12.5" r="6" fill="#6EE7B7" fillOpacity="0.38" />
                <circle cx="12" cy="9.5" r="4.8" fill="#34D399" fillOpacity="0.34" />
                <circle cx="7.5" cy="11.5" r="3.4" fill="#10B981" fillOpacity="0.28" />
              </svg>
            ) : (
              <span
                className="block w-full h-full rounded-full"
                style={{
                  background:
                    'radial-gradient(circle at 40% 38%, rgba(110,231,183,0.45) 0%, rgba(52,211,153,0.28) 55%, rgba(16,185,129,0) 100%)',
                }}
              />
            )}
          </span>
        );
      })}
    </div>
  );
};
