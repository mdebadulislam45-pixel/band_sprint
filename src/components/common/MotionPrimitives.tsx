import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

/**
 * Editorial, restrained motion tokens for BandSprint.
 * Crisp quint-out deceleration and damped springs — never bouncy or distracting.
 */
export const EASE_EDITORIAL = [0.22, 1, 0.36, 1] as const;

export const SPRING_SNAPPY = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 32,
  mass: 0.7
};

export const SPRING_GENTLE = {
  type: 'spring' as const,
  stiffness: 280,
  damping: 28,
  mass: 0.85
};

interface FadeInSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  immediate?: boolean;
}

export const FadeInSection: React.FC<FadeInSectionProps> = ({
  children,
  className = '',
  delay = 0,
  y = 14,
  immediate = false
}) => {
  if (immediate) {
    return (
      <motion.div
        initial={{ opacity: 0, y }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, delay, ease: EASE_EDITORIAL }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.14 }}
      transition={{ duration: 0.42, delay, ease: EASE_EDITORIAL }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface StaggerGroupProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
  immediate?: boolean;
}

export const StaggerGroup: React.FC<StaggerGroupProps> = ({
  children,
  className = '',
  stagger = 0.05,
  delayChildren = 0.03,
  immediate = true
}) => {
  const variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: stagger,
        delayChildren
      }
    }
  };

  if (immediate) {
    return (
      <motion.div
        variants={variants}
        initial="hidden"
        animate="visible"
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.14 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 12 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.34, ease: EASE_EDITORIAL }
      }
    }}
    className={className}
  >
    {children}
  </motion.div>
);

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Smooth tabular-nums counter for Band scores, day countdowns, and percentages.
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals = 1,
  prefix = '',
  suffix = '',
  className = ''
}) => {
  const spring = useSpring(value, { stiffness: 180, damping: 24, mass: 0.8 });
  const rounded = useTransform(spring, (latest) => {
    if (!Number.isFinite(latest)) return value.toFixed(decimals);
    return decimals === 0 ? String(Math.round(latest)) : latest.toFixed(decimals);
  });
  const [display, setDisplay] = useState(() =>
    decimals === 0 ? String(Math.round(value)) : value.toFixed(decimals)
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    return rounded.on('change', (latest) => setDisplay(latest));
  }, [rounded]);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
};
