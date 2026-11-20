import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { BandSprintLogo } from '../common/BandSprintLogo';
import { firebaseSyncService } from '../../services/firebaseSyncService';
import { getCurrentUser } from '../../utils/userStorage';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRealGoogleAuth = async () => {
    if (isLoading) return;
    soundManager.playBeep(600, 0.04);
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const fbUser = await firebaseSyncService.signInWithGoogle();
      setIsLoading(false);
      if (!fbUser) {
        setErrorMessage('Google sign-in did not return an authenticated user.');
        return;
      }

      const active = getCurrentUser();
      soundManager.playSuccess();
      onShowToast(`Successfully signed in with Google as ${active?.name || fbUser.displayName || fbUser.email}`);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setIsLoading(false);
      const code = err?.code || '';
      const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
      if (code === 'auth/popup-blocked') {
        if (!isInIframe) {
          try {
            onShowToast('Popup blocked by browser. Redirecting to Google Sign-In...');
            await firebaseSyncService.signInWithGoogleRedirect();
            return;
          } catch (redirErr: any) {
            setErrorMessage(redirErr?.message || 'Unable to start Google redirect sign-in.');
            return;
          }
        }
        setErrorMessage('Browser blocked the Google sign-in popup. Please allow popups for this site and try again.');
        return;
      }
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setErrorMessage('Google sign-in window was closed before completion. Please try again.');
        return;
      }
      setErrorMessage(err?.message || 'Google authentication failed. Please try again.');
    }
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
                <BandSprintLogo variant="full" size="sm" showBadge={true} />
              </div>
              <div>
                <h3 id="google-auth-title" className="text-xl font-black text-slate-900 tracking-tight">
                  Sign in to BandSprint
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Save your test history, mistake vault, and official Practice scorecards across all devices.
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleRealGoogleAuth}
                disabled={isLoading}
                className="w-full h-12 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium text-sm shadow-xs transition flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
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
                )}
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Candidate Security Note */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-[11px] text-slate-600">
              <div className="flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Authenticated via Google OAuth 2.0 & Firebase Identity Platform.
                </p>
              </div>
              <div className="pt-1 border-t border-slate-200 flex items-center justify-center gap-3 text-slate-500 font-medium">
                <a
                  href="#terms"
                  onClick={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('open_legal_modal', { detail: { tab: 'terms' } }));
                  }}
                  className="hover:underline"
                >
                  Terms of Service
                </a>
                <span>•</span>
                <a
                  href="#privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('open_legal_modal', { detail: { tab: 'privacy' } }));
                  }}
                  className="hover:underline"
                >
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
