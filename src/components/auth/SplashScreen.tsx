import React from 'react';
import { motion } from 'motion/react';
import { IELTSSprintLogo } from '../common/IELTSSprintLogo';

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white select-none px-6"
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center text-center"
      >
        {/* Brand Mark with forward kinetic glow */}
        <motion.div
          initial={{ rotate: -4 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative mb-6"
        >
          <div className="absolute inset-0 bg-blue-500/30 blur-xl rounded-2xl transform scale-125" />
          <IELTSSprintLogo variant="symbol" size="xl" className="relative drop-shadow-2xl" />
        </motion.div>

        {/* Wordmark lockup */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2"
        >
          IELTS <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-300">Sprint</span>
        </motion.h1>

        {/* Value proposition subtext */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.45 }}
          className="text-sm sm:text-base text-slate-300 font-medium tracking-wide max-w-xs"
        >
          Your smarter path to Band 9.
        </motion.p>
      </motion.div>

      {/* Discreet loading bar */}
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 140, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
        className="absolute bottom-12 h-1 bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-400 rounded-full overflow-hidden"
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
