import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Award } from 'lucide-react';
import { IELTSSprintLogo } from '../common/IELTSSprintLogo';

interface WelcomeScreenProps {
  onCreateAccount: () => void;
  onLogin: () => void;
  onGoogleSignIn?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onCreateAccount,
  onLogin,
  onGoogleSignIn
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-8 max-w-md mx-auto relative overflow-hidden select-none">
      {/* Background ambient radial gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 right-0 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Logo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 flex items-center justify-center pt-4"
      >
        <IELTSSprintLogo variant="full" size="md" className="brightness-125" showBadge={true} />
      </motion.div>

      {/* Hero Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="relative z-10 flex flex-col items-center text-center space-y-6 my-auto py-8"
      >
        {/* Minimal Academic Trust Card */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/25 text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Cambridge Rubric-Aligned Practice</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
            Ready to start your IELTS journey?
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs mx-auto">
            Build stronger English, practise in a realistic computer-delivered exam layout, and track your estimated band progress.
          </p>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-around text-[11px] text-slate-400 font-mono">
            <span>✓ 4 Core Modules</span>
            <span>✓ CD-IELTS Mode</span>
            <span>✓ AI Band Estimates</span>
          </div>
        </div>
      </motion.div>

      {/* Bottom Action Group */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="relative z-10 space-y-3 pt-4 pb-2"
      >
        <button
          type="button"
          onClick={onCreateAccount}
          className="w-full min-h-[52px] py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-98"
        >
          <span>Create Free Account</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {onGoogleSignIn && (
          <button
            type="button"
            onClick={onGoogleSignIn}
            className="w-full min-h-[50px] py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm border border-slate-200 flex items-center justify-center gap-2.5 transition active:scale-98 shadow-md cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        )}

        <button
          type="button"
          onClick={onLogin}
          className="w-full min-h-[48px] py-3.5 px-6 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-sm border border-slate-800 transition active:scale-98"
        >
          I already have an account
        </button>

        <p className="text-[11px] text-center text-slate-400 pt-1 font-medium">
          Free to start • Your progress stays synced
        </p>
      </motion.div>
    </div>
  );
};
