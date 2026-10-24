import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Loader2,
  Flame,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { firebaseSyncService } from '../../services/firebaseSyncService';

interface GoogleSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (candidateInfo: {
    uid: string;
    email: string;
    name?: string;
    targetBand?: number;
    verifiedByFirebase: boolean;
  }) => void;
}

export const GoogleSignInModal: React.FC<GoogleSignInModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleGooglePopupClick = async () => {
    soundManager.playBeep(550, 0.05);
    setIsLoading(true);
    setErrorMsg(null);
    setErrorDetails(null);
    setErrorCode(null);

    try {
      const fbUser = await firebaseSyncService.signInWithGoogle();
      if (fbUser && fbUser.email) {
        soundManager.playSuccess();
        setIsLoading(false);
        onSuccess({
          uid: fbUser.uid,
          email: fbUser.email,
          name: fbUser.displayName || undefined,
          verifiedByFirebase: true
        });
        onClose();
      } else {
        setIsLoading(false);
        setErrorMsg('Google Authentication Incomplete');
        setErrorDetails('No verified email address was returned by Google. Please try again or use Email & Password.');
      }
    } catch (err: any) {
      setIsLoading(false);
      soundManager.playBeep(350, 0.1);
      const code = err?.code || '';
      setErrorCode(code);

      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setErrorMsg('Google Sign-In Window Closed');
        setErrorDetails('The Google sign-in window was closed before completing verification. Click below to try again or use the Full-Page Redirect option on mobile.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('Browser Blocked the Sign-In Popup');
        setErrorDetails('Your browser blocked the Google popup window. Please allow popups for this site or use the "Continue via Full-Page Redirect" button below.');
      } else if (code === 'auth/unauthorized-domain') {
        setErrorMsg('Domain Authorization Required in Firebase Console');
        setErrorDetails(
          `The domain "${currentHostname}" must be added to Firebase Console → Authentication → Settings → Authorized domains for project "fine-runner-5szp9". Until then, please sign in using Email & Password.`
        );
      } else {
        setErrorMsg('Google Sign-In Could Not Complete');
        setErrorDetails(
          err?.message || 'Unable to verify Google credentials at this moment. Please try again or use Email & Password sign-in.'
        );
      }
    }
  };

  const handleGoogleRedirectClick = async () => {
    soundManager.playBeep(550, 0.05);
    setIsRedirecting(true);
    setErrorMsg(null);
    try {
      await firebaseSyncService.signInWithGoogleRedirect();
    } catch (err: any) {
      setIsRedirecting(false);
      setErrorMsg('Redirect Sign-In Error');
      setErrorDetails(err?.message || 'Could not initiate Google redirect flow.');
    }
  };

  const handleCopyDomain = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget && !isLoading) onClose();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-signin-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-white"
        >
          {/* Top Google Brand Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-red-500 via-amber-400 to-green-500" />

          {/* Close button */}
          <button
            onClick={() => {
              soundManager.playBeep(450, 0.04);
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close Google sign-in dialog"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 sm:p-7 space-y-4 text-left max-h-[85vh] overflow-y-auto">
            {/* Header with Google Logo & IELTS Sprint Branding */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white p-2.5 flex items-center justify-center shadow-md shrink-0">
                <svg className="w-full h-full" viewBox="0 0 24 24">
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
              </div>
              <div>
                <h3 id="google-signin-title" className="text-lg font-black text-white flex items-center gap-1.5">
                  Sign in to IELTS SPRINT
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  <span>Verified Google OAuth 2.0 · Firebase Auth</span>
                </p>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
                <div className="flex items-start gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
                {errorDetails && (
                  <p className="text-[11px] leading-relaxed text-rose-200 pl-6">
                    {errorDetails}
                  </p>
                )}
                {errorCode === 'auth/unauthorized-domain' && (
                  <div className="pl-6 pt-1 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyDomain}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-700/50 text-[10px] text-rose-200 flex items-center gap-1.5 font-mono transition cursor-pointer"
                    >
                      {copiedDomain ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedDomain ? 'Copied domain!' : `Copy Domain: ${currentHostname}`}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Security & Sync Assurance */}
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified Candidate Cloud Sync</span>
              </div>
              <ul className="text-slate-400 space-y-1 text-[11px] list-disc list-inside">
                <li>Authenticates strictly via official Google OAuth token verification</li>
                <li>Syncs your test scorecards, vocabulary deck & Mistake Vault to Firestore</li>
                <li>Merges any existing local practice progress into your cloud account</li>
              </ul>
            </div>

            {/* Primary Action Button: Firebase Google Popup */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleGooglePopupClick}
                disabled={isLoading || isRedirecting}
                className="w-full min-h-[50px] py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-xl flex items-center justify-center gap-3 transition active:scale-98 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Verifying with Google Accounts...</span>
                  </>
                ) : (
                  <>
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
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                  </>
                )}
              </button>

              {/* Secondary Option: Full-page Redirect for Mobile Browsers / Popup Blockers */}
              <button
                type="button"
                onClick={handleGoogleRedirectClick}
                disabled={isLoading || isRedirecting}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700/90 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isRedirecting ? 'animate-spin' : ''}`} />
                <span>
                  {isRedirecting
                    ? 'Redirecting to Google...'
                    : 'Popup blocked on mobile? Use Full-Page Redirect'}
                </span>
              </button>
            </div>

            {/* Footer Trust Indicator */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1 text-slate-400">
                <Flame className="w-3 h-3 text-amber-500" /> Firebase OAuth 2.0
              </span>
              <span className="text-[10px] text-slate-400">IELTS SPRINT</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
