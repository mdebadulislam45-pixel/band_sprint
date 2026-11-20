import React from 'react';
import { motion } from 'motion/react';
import { BandSprintMark } from '../common/BandSprintMark';

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0F4C45] text-white select-none px-6"
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#F4A62A]/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center text-center"
      >
        <motion.div
          initial={{ rotate: -4 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative mb-6"
        >
          <BandSprintMark size={72} variant="dark" />
        </motion.div>

        {/* Wordmark lockup */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white mb-2"
        >
          BandSprint
        </motion.h1>

        {/* Value proposition subtext */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.45 }}
          className="text-sm sm:text-base text-[#EEF3F1]/90 font-medium tracking-wide max-w-xs"
        >
          Reach your band.
        </motion.p>
      </motion.div>

      {/* Discreet loading bar */}
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 140, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
        className="absolute bottom-12 h-1 bg-[#F4A62A] rounded-full overflow-hidden"
      >
        <motion.div
          animate={{ x: [-140, 140] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          className="w-1/2 h-full bg-white/60 blur-xs"
        />
      </motion.div>
    </div>
  );
};
