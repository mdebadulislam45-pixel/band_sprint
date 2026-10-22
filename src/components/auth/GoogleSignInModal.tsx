import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Loader2,
  Mail,
  Flame,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { firebaseSyncService } from '../../services/firebaseSyncService';
import { validateGmailAddress } from '../../utils/googleAuth';
import firebaseConfig from '../../../firebase-applet-config.json';

interface GoogleSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (candidateInfo: { email: string; name?: string; targetBand?: number }) => void;
}

export const GoogleSignInModal: React.FC<GoogleSignInModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [gmailInput, setGmailInput] = useState('');
  const [gmailName, setGmailName] = useState('');
  const [showManualGmail, setShowManualGmail] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  if (!isOpen) return null;

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleGooglePopupClick = async () => {
    soundManager.playBeep(550, 0.05);
    setIsLoading(true);
    setErrorMsg(null);
    setErrorDetails(null);

    try {
      const fbUser = await firebaseSyncService.signInWithGoogle();
      if (fbUser && fbUser.email) {
        soundManager.playSuccess();
        setIsLoading(false);
        onSuccess({
          email: fbUser.email,
          name: fbUser.displayName || undefined
        });
        onClose();
      } else {
        setIsLoading(false);
        setErrorMsg('No account details received from Google.');
      }
    } catch (err: any) {
      setIsLoading(false);
      soundManager.playBeep(350, 0.1);
      console.error('[GoogleSignInModal] Firebase Google Sign-In error:', err);

      const code = err?.code || '';
      const msg = err?.message || String(err);

      if (code === 'auth/popup-blocked') {
        setErrorMsg('The sign-in popup was blocked by your browser.');
        setErrorDetails('Please allow popups for this site, or use the direct Gmail sign-in below.');
        setShowManualGmail(true);
      } else if (code === 'auth/unauthorized-domain') {
        setErrorMsg('Firebase domain authorization needed.');
        setErrorDetails(
          `Domain "${currentHostname}" needs to be added to Authorized Domains in Firebase Console (Authentication > Settings > Authorized domains). You can also sign in below using your Gmail directly.`
        );
        setShowManualGmail(true);
      } else if (code === 'auth/popup-closed-by-user') {
        setErrorMsg('Sign-in cancelled. Popup was closed before completion.');
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMsg('Google Sign-In provider is disabled in Firebase Console.');
        setErrorDetails('Enable Google under Authentication > Sign-in method in Firebase Console.');
        setShowManualGmail(true);
      } else {
        setErrorMsg(msg.includes('Unexpected token') ? 'Authentication service connection reset.' : (err?.message || 'Unable to connect to Google sign-in.'));
        setShowManualGmail(true);
      }
    }
  };

  const handleManualGmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playBeep(520, 0.04);

    const validation = validateGmailAddress(gmailInput);
    if (!validation.isValid) {
      soundManager.playBeep(350, 0.08);
      setErrorMsg(validation.error || 'Please enter a valid @gmail.com address.');
      return;
    }

    soundManager.playSuccess();
    const derivedName = gmailName.trim() || gmailInput.split('@')[0]
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    onSuccess({
      email: gmailInput.trim().toLowerCase(),
      name: derivedName
    });
    onClose();
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
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
            {/* Header with Google Logo & Firebase Status */}
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
                <h3 className="text-lg font-black text-white flex items-center gap-1.5">
                  Sign in with Google
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  <span>Firebase Authentication Live</span>
                </p>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1.5">
                <div className="flex items-start gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
                {errorDetails && (
                  <p className="text-[11px] leading-relaxed text-rose-200 pl-6">
                    {errorDetails}
                  </p>
                )}
                {errorDetails && errorDetails.includes('Authorized Domains') && (
                  <div className="pl-6 pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyDomain}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-700/50 text-[10px] text-rose-200 flex items-center gap-1 font-mono transition cursor-pointer"
                    >
                      {copiedDomain ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedDomain ? 'Copied domain!' : `Copy: ${currentHostname}`}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Value Proposition Overview */}
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Cloud Firestore Data Persistence</span>
              </div>
              <ul className="text-slate-400 space-y-1 text-[11px] list-disc list-inside">
                <li>Automatic sync with project <code className="text-blue-300 font-mono text-[10px]">{firebaseConfig.projectId}</code></li>
                <li>Preserves vocabulary flashcards, test scorecards & Mistake Vault</li>
                <li>Protected under candidate security isolation rules</li>
              </ul>
            </div>

            {/* Primary Action Button: Firebase Google Popup */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleGooglePopupClick}
                disabled={isLoading}
                className="w-full min-h-[50px] py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-xl flex items-center justify-center gap-3 transition active:scale-98 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Connecting to Google Accounts...</span>
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

              {/* Divider / Toggle for Direct Gmail */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualGmail(!showManualGmail)}
                  className="w-full text-center text-[11px] text-slate-400 hover:text-blue-400 transition cursor-pointer py-1"
                >
                  {showManualGmail ? 'Hide direct Gmail login' : 'Or sign in directly using your Gmail address →'}
                </button>
              </div>

              {/* Direct Gmail Input Section */}
              {showManualGmail && (
                <form
                  onSubmit={handleManualGmailSubmit}
                  className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2.5 animate-fadeIn"
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    <span>Quick Gmail Candidate Access</span>
                  </div>
                  <div>
                    <input
                      type="email"
                      value={gmailInput}
                      onChange={(e) => setGmailInput(e.target.value)}
                      placeholder="e.g. mdebadulislam45@gmail.com"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={gmailName}
                      onChange={(e) => setGmailName(e.target.value)}
                      placeholder="Candidate name (optional)"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Sign In with Gmail</span>
                  </button>
                </form>
              )}
            </div>

            {/* Footer Trust Indicator */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1 text-slate-400">
                <Flame className="w-3 h-3 text-amber-500" /> Firebase Auth
              </span>
              <span className="text-[10px] text-slate-400">IELTS Sprint</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
