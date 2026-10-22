import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { IELTSSprintLogo } from '../common/IELTSSprintLogo';

interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid candidate email address.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-5 sm:p-8 max-w-md mx-auto relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between pb-3">
        <button
          type="button"
          onClick={onBackToLogin}
          aria-label="Back to login"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <IELTSSprintLogo variant="full" size="sm" className="brightness-125" />
        <div className="w-8" />
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col justify-center py-4">
        {!isSubmitted ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-5 text-left"
          >
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Reset your password
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Enter your email and we'll send you a secure password-reset link.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-300 mb-1">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[50px] py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-98"
              >
                <span>{isSubmitting ? 'Sending link...' : 'Send Reset Link'}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl backdrop-blur-md"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white">Check your email</h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                If an account exists for <span className="font-mono text-blue-400">{email}</span>, you'll receive instructions shortly.
              </p>
            </div>

            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs transition"
            >
              Back to Log In
            </button>
          </motion.div>
        )}
      </main>

      <footer className="relative z-10 pt-4 pb-2 text-center text-xs text-slate-400">
        Remember your password?{' '}
        <button
          type="button"
          onClick={onBackToLogin}
          className="font-bold text-blue-400 hover:text-blue-300 underline"
        >
          Back to Log In
        </button>
      </footer>
    </div>
  );
};
