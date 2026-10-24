import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Lock, Sparkles, ArrowRight, UserCheck } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { IELTSSprintLogo } from '../common/IELTSSprintLogo';
import { saveUser, switchActiveUser, createDefaultProgress } from '../../utils/userStorage';
import { UserProfile } from '../../types';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  onSuccess?: () => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleAuthSimulate = () => {
    soundManager.playSuccess();
    setIsLoading(true);

    setTimeout(() => {
      const simulatedUser: UserProfile = {
        id: 'user_google_' + Date.now(),
        name: 'Ebadul Islam',
        email: 'candidate@gmail.com',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        createdAt: Date.now(),
        progress: createDefaultProgress(7.5, 'Ebadul Islam')
      };

      try {
        // Save to both ielts_auth_session and user storage
        localStorage.setItem('ielts_auth_session', JSON.stringify(simulatedUser));
        saveUser(simulatedUser);
        switchActiveUser(simulatedUser.id);
      } catch (e) {
        console.error('Failed to save auth session', e);
      }

      setIsLoading(false);
      onShowToast('✓ Successfully signed in with Google (Ebadul Islam)');
      window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: simulatedUser }));
      onClose();
      if (onSuccess) onSuccess();
    }, 600);
  };

  const handleGuestLogin = () => {
    soundManager.playSuccess();
    setIsLoading(true);

    setTimeout(() => {
      const guestUser: UserProfile = {
        id: 'user_guest_' + Date.now(),
        name: 'Guest Candidate',
        email: 'guest.candidate@ieltssprint.com',
        avatar: '',
        createdAt: Date.now(),
        progress: createDefaultProgress(7.0, 'Guest Candidate')
      };

      try {
        localStorage.setItem('ielts_auth_session', JSON.stringify(guestUser));
        saveUser(guestUser);
        switchActiveUser(guestUser.id);
      } catch (e) {
        console.error('Failed to save guest session', e);
      }

      setIsLoading(false);
      onShowToast('✓ Continuing as Guest Candidate. All practice tests unlocked!');
      window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: guestUser }));
      onClose();
      if (onSuccess) onSuccess();
    }, 400);
  };

  return (
    <AnimatePresence>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget && !isLoading) onClose();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-auth-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden text-slate-900 select-none"
        >
          {/* Top Brand Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-400" />

          {/* Close Button */}
          <button
            onClick={() => {
              soundManager.playBeep(450, 0.04);
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
            aria-label="Close authentication modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 sm:p-8 space-y-6 text-left">
            {/* Header */}
            <div className="space-y-2 text-center sm:text-left">
              <div className="flex justify-center sm:justify-start">
                <IELTSSprintLogo variant="full" size="sm" showBadge={true} />
              </div>
              <div>
                <h3 id="google-auth-title" className="text-xl font-black text-slate-900 tracking-tight">
                  Sign in to IELTS Sprint
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Save your test history, mistake vault, and official Cambridge scorecards across all devices.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {/* Google Sign In Button (Pixel-perfect Google Brand Guidelines) */}
              <button
                onClick={handleGoogleAuthSimulate}
                disabled={isLoading}
                className="w-full h-12 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium text-sm shadow-xs transition flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer disabled:opacity-60"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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

              {/* Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-[11px] font-mono uppercase font-bold">OR</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Guest Candidate Button */}
              <button
                onClick={handleGuestLogin}
                disabled={isLoading}
                className="w-full h-12 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer disabled:opacity-60"
              >
                <UserCheck className="w-4 h-4 text-amber-400" />
                <span>Continue as Guest Candidate (Try Free Test)</span>
              </button>
            </div>

            {/* Candidate Security Note */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-[11px] text-slate-600">
              <div className="flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Your mock session data and audio recordings are stored securely in local browser storage and never shared.
                </p>
              </div>
              <div className="pt-1 border-t border-slate-200 flex items-center justify-center gap-3 text-slate-500 font-medium">
                <a href="#terms" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('open_legal_modal', { detail: { tab: 'terms' } })); }} className="hover:underline">
                  Terms of Service
                </a>
                <span>•</span>
                <a href="#privacy" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('open_legal_modal', { detail: { tab: 'privacy' } })); }} className="hover:underline">
                  Privacy Policy
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
