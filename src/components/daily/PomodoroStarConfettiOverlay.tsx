import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, Variants } from 'framer-motion';

export interface StarParticleSpec {
  id: number;
  startX: number; // vw %
  startY: number; // vh %
  deltaX: number; // px drift
  peakY: number; // px upward impulse
  endY: number; // px gravity fall
  size: number; // px
  color: string;
  rotation: number;
  duration: number;
  delay: number;
  shape: 'five-star' | 'four-spark' | 'diamond';
}

const BARNABY_GOLD_STAR_PALETTE = [
  '#F59E0B', // Warm Amber Gold (Barnaby primary star)
  '#FDE68A', // Soft Champagne Gold (Barnaby inner star)
  '#F4A62A', // BandSprint Gold
  '#FBBF24', // Radiant Gold
  '#10B981', // Emerald Accent Spark
  '#FEF3C7'  // Starlight Cream
];

/**
 * Framer Motion container variant coordinating staggered gold star particle bursts
 */
export const confettiOverlayVariants: Variants = {
  hidden: {
    opacity: 0
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.016,
      delayChildren: 0.02
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.45,
      ease: 'easeOut'
    }
  }
};

/**
 * Framer Motion particle variant driving each gold star's trajectory, scale, spin, and fade
 * consistent with Barnaby's celebration star burst animation.
 */
export const goldStarParticleVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
    x: 0,
    y: 0,
    rotate: 0
  },
  visible: (particle: StarParticleSpec) => ({
    opacity: [0, 1, 1, 0.92, 0],
    scale: [0, 1.3, 1.05, 0.85, 0.2],
    x: [0, particle.deltaX * 0.55, particle.deltaX],
    y: [0, particle.peakY, particle.endY],
    rotate: [0, particle.rotation * 0.6, particle.rotation],
    transition: {
      duration: particle.duration,
      delay: particle.delay,
      ease: [0.22, 1, 0.36, 1],
      times: [0, 0.24, 0.55, 0.82, 1]
    }
  }),
  exit: {
    opacity: 0,
    scale: 0,
    transition: { duration: 0.25 }
  }
};

export const celebrationPillVariants: Variants = {
  hidden: { opacity: 0, y: -24, scale: 0.88 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 380,
      damping: 24
    }
  },
  exit: {
    opacity: 0,
    y: -18,
    scale: 0.92,
    transition: { duration: 0.25, ease: 'easeIn' }
  }
};

function createGoldStarParticles(seed: number, count = 46): StarParticleSpec[] {
  const particles: StarParticleSpec[] = [];
  const shapes: StarParticleSpec['shape'][] = ['five-star', 'four-spark', 'diamond'];

  for (let i = 0; i < count; i++) {
    // Deterministic pseudo-random distribution seeded by burst count + index
    const t = (i * 9301 + seed * 49297) % 233280;
    const r1 = (t / 233280);
    const r2 = ((i * 7919 + seed * 104729) % 1000) / 1000;
    const r3 = ((i * 3571 + seed * 65537) % 1000) / 1000;

    // Emit from 3 celebratory focal zones: upper-center sky, left-center, and Barnaby's bottom-right corner
    const zone = i % 4;
    let startX = 12 + r1 * 76;
    let startY = 18 + r2 * 25;

    if (zone === 3) {
      // Barnaby companion celebration corner (bottom-right)
      startX = 78 + r1 * 16;
      startY = 68 + r2 * 16;
    } else if (zone === 0) {
      // Center Pomodoro timer crest
      startX = 32 + r1 * 36;
      startY = 22 + r2 * 18;
    }

    const angle = (r1 * Math.PI * 2);
    const spread = 90 + r2 * 220;
    const deltaX = Math.cos(angle) * spread;
    const peakY = -(75 + r3 * 165);
    const endY = 120 + r2 * 240;

    particles.push({
      id: i,
      startX,
      startY,
      deltaX,
      peakY,
      endY,
      size: 13 + Math.round(r3 * 14),
      color: BARNABY_GOLD_STAR_PALETTE[i % BARNABY_GOLD_STAR_PALETTE.length],
      rotation: (i % 2 === 0 ? 1 : -1) * (180 + Math.round(r2 * 360)),
      duration: 1.85 + r3 * 0.95,
      delay: (i % 12) * 0.028,
      shape: shapes[i % shapes.length]
    });
  }

  return particles;
}

export interface PomodoroStarConfettiOverlayProps {
  /** Optional external trigger counter; incrementing triggers a fresh gold star confetti burst */
  triggerKey?: number;
  /** Optional custom banner label */
  bannerText?: string;
}

export const PomodoroStarConfettiOverlay: React.FC<PomodoroStarConfettiOverlayProps> = ({
  triggerKey = 0,
  bannerText
}) => {
  const [activeBurstId, setActiveBurstId] = useState<number | null>(null);
  const [label, setLabel] = useState<string>(
    bannerText || 'Pomodoro Sprint Complete! Barnaby Gold Star Bonus ★'
  );

  const triggerCelebration = useCallback((customLabel?: string) => {
    if (customLabel) {
      setLabel(customLabel);
    }
    setActiveBurstId(Date.now());
  }, []);

  // Respond to external prop triggerKey increments
  useEffect(() => {
    if (triggerKey > 0) {
      triggerCelebration(bannerText);
    }
  }, [triggerKey, bannerText, triggerCelebration]);

  // Listen globally for Pomodoro sprint completion & Daily Mastery Exam completion events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePomodoroDone = (e: Event) => {
      const detail = (e as CustomEvent<{ minutes?: number }>).detail;
      const mins = detail?.minutes || 25;
      triggerCelebration(`★ ${mins}m Pomodoro Sprint Complete! Barnaby is celebrating with you!`);
    };

    const handleMasteryExamDone = (e: Event) => {
      const detail = (e as CustomEvent<{ percentage?: number }>).detail;
      const pct = detail?.percentage ?? 100;
      triggerCelebration(`★ Daily Mastery Exam Complete (${pct}%)! Gold Star Achievement!`);
    };

    window.addEventListener('bandsprint_pomodoro_completed', handlePomodoroDone);
    window.addEventListener('bandsprint_mastery_exam_completed', handleMasteryExamDone);
    return () => {
      window.removeEventListener('bandsprint_pomodoro_completed', handlePomodoroDone);
      window.removeEventListener('bandsprint_mastery_exam_completed', handleMasteryExamDone);
    };
  }, [triggerCelebration]);

  // Auto-clear confetti overlay after animation finishes
  useEffect(() => {
    if (activeBurstId === null) return;
    const timer = window.setTimeout(() => {
      setActiveBurstId(null);
    }, 3100);
    return () => window.clearTimeout(timer);
  }, [activeBurstId]);

  const particles = useMemo(
    () => (activeBurstId ? createGoldStarParticles(activeBurstId % 997, 48) : []),
    [activeBurstId]
  );

  return (
    <AnimatePresence>
      {activeBurstId !== null && (
        <motion.div
          key={activeBurstId}
          data-testid="pomodoro-gold-star-confetti"
          variants={confettiOverlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[110] pointer-events-none overflow-hidden select-none"
          aria-hidden="true"
        >
          {/* Floating Gold Star Banner Pill */}
          <div className="w-full flex justify-center pt-16 sm:pt-20 px-4">
            <motion.div
              variants={celebrationPillVariants}
              className="px-4 py-2 rounded-2xl bg-[#0E1F1E]/95 text-[#FDE68A] border border-[#F59E0B]/60 shadow-xl flex items-center gap-2.5 text-xs sm:text-sm font-bold tracking-wide"
            >
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#F59E0B] animate-ping" />
              <span>{label}</span>
            </motion.div>
          </div>

          {/* Gold Star Confetti Particles synced with Barnaby's celebration aesthetic */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              custom={particle}
              variants={goldStarParticleVariants}
              style={{
                position: 'absolute',
                left: `${particle.startX}%`,
                top: `${particle.startY}%`,
                width: particle.size,
                height: particle.size,
                filter: 'drop-shadow(0 2px 6px rgba(245, 158, 11, 0.45))'
              }}
            >
              {particle.shape === 'five-star' && (
                <svg
                  viewBox="0 0 24 24"
                  className="w-full h-full"
                  fill={particle.color}
                >
                  <path d="M12 2L14.9 8.6L22 9.3L16.6 14L18.2 21L12 17.3L5.8 21L7.4 14L2 9.3L9.1 8.6L12 2Z" />
                </svg>
              )}
              {particle.shape === 'four-spark' && (
                <svg
                  viewBox="0 0 24 24"
                  className="w-full h-full"
                  fill={particle.color}
                >
                  <path d="M12 1L14.8 9.2L23 12L14.8 14.8L12 23L9.2 14.8L1 12L9.2 9.2L12 1Z" />
                </svg>
              )}
              {particle.shape === 'diamond' && (
                <svg
                  viewBox="0 0 24 24"
                  className="w-full h-full"
                  fill={particle.color}
                >
                  <polygon points="12,2 20,12 12,22 4,12" />
                </svg>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
