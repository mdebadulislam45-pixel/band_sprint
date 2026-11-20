import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, CheckCircle2, ArrowRight, RotateCw, AlertCircle } from 'lucide-react';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { BandSprintLogo } from '../common/BandSprintLogo';

interface EmailVerificationScreenProps {
  email: string;
  onVerified: () => void;
  onChangeEmail: () => void;
}

export const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({
  email,
  onVerified,
  onChangeEmail
}) => {
  const [cooldown, setCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setErrorMsg(null);
    setResendStatus(null);

    if (!auth.currentUser) {
      setErrorMsg('No active Firebase session found to send a verification email.');
      return;
    }

    setIsResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setCooldown(45);
      setResendStatus('A verification link has been sent to your email inbox.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to send verification email right now. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    setErrorMsg(null);
    setIsChecking(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          onVerified();
          return;
        }
        setErrorMsg('Your email is not marked as verified yet. Please click the verification link in your inbox and try again.');
      } else {
        onVerified();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not check verification status.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-5 sm:p-8 max-w-md mx-auto relative overflow-hidden text-center">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-center pt-2 pb-4">
        <BandSprintLogo variant="full" size="sm" className="brightness-125" />
      </header>

      {/* Main card */}
      <main className="relative z-10 flex-1 flex flex-col justify-center py-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-md space-y-5"
        >
          {/* Mail Icon */}
          <div className="w-16 h-16 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
            <Mail className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Verify your email
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Check your inbox at{' '}
              <span className="font-mono font-bold text-blue-400 block sm:inline mt-0.5">{email}</span>.
            </p>
          </div>

          {resendStatus && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 text-left">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{resendStatus}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleCheckVerification}
              disabled={isChecking}
              className="w-full min-h-[50px] py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-98"
            >
              <span>{isChecking ? 'Checking status...' : 'I Have Verified My Email'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isResending}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 disabled:opacity-50 text-slate-300 text-xs font-semibold border border-slate-700/60 flex items-center justify-center gap-2 transition"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
              <span>
                {cooldown > 0 ? `Resend email (${cooldown}s)` : 'Send Verification Email'}
              </span>
            </button>
          </div>
        </motion.div>
      </main>

      {/* Footer link to change email */}
      <footer className="relative z-10 pt-4 pb-2 text-xs text-slate-400">
        Wrong email address?{' '}
        <button
          type="button"
          onClick={onChangeEmail}
          className="font-bold text-blue-400 hover:text-blue-300 underline"
        >
          Change Email
        </button>
      </footer>
    </div>
  );
};
