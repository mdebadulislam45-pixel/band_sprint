import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Award,
  Headphones,
  Mic,
  ShieldCheck,
  Zap,
  BookOpen
} from 'lucide-react';
import { IELTSSprintLogo } from '../common/IELTSSprintLogo';
import { loginCandidateWithServer } from '../../services/authService';
import { UserProfile } from '../../types';
import { soundManager } from '../../utils/audioEffects';

interface LoginScreenProps {
  onSuccess: (user: UserProfile) => void;
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
  onBack: () => void;
  onGoogleSignIn: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSuccess,
  onSwitchToRegister,
  onForgotPassword,
  onBack,
  onGoogleSignIn
}) => {
  const [emailOrName, setEmailOrName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [targetBand, setTargetBand] = useState<number>(7.5);

  const [touched, setTouched] = useState<{ identifier?: boolean; password?: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const BAND_DESCRIPTIONS: Record<number, { level: string; label: string; color: string }> = {
    6.5: { level: 'B2 Competent', label: 'Solid foundation for undergraduate admissions', color: 'from-blue-500 to-cyan-500' },
    7.0: { level: 'C1 Good User', label: 'Standard requirement for international universities', color: 'from-indigo-500 to-blue-500' },
    7.5: { level: 'C1 Advanced', label: 'Top Tier UK, Canadian & Australian visas & scholarships', color: 'from-amber-400 to-orange-500' },
    8.0: { level: 'C2 Very Good', label: 'Medical, legal & advanced post-graduate requirement', color: 'from-emerald-400 to-teal-500' },
    8.5: { level: 'C2 Expert', label: 'Near-native fluency with sophisticated nuance', color: 'from-rose-500 to-purple-500' },
    9.0: { level: 'C2 Master', label: 'Flawless academic precision & native naturalness', color: 'from-amber-300 via-rose-400 to-indigo-400' }
  };

  const identifierError =
    touched.identifier && !emailOrName.trim()
      ? 'Please enter your candidate email or username.'
      : null;

  const passwordError =
    touched.password && !password
      ? 'Please enter your password.'
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ identifier: true, password: true });
    setErrorMsg(null);

    if (!emailOrName.trim() || !password) {
      soundManager.playBeep(400, 0.08);
      return;
    }

    setIsSubmitting(true);
    soundManager.playBeep(520, 0.04);

    const result = await loginCandidateWithServer({
      email: emailOrName.trim(),
      password
    });

    setIsSubmitting(false);

    if (result.success && result.user) {
      soundManager.playSuccess();
      onSuccess(result.user);
    } else {
      soundManager.playBeep(350, 0.12);
      setErrorMsg(result.error || 'Login failed. Please verify credentials.');
    }
  };

  const handleGoogleAuth = () => {
    soundManager.playBeep(580, 0.04);
    setErrorMsg(null);
    onGoogleSignIn();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-7 max-w-lg mx-auto relative overflow-hidden select-none">
      {/* Dynamic Animated Ambient Glow */}
      <div className="absolute top-0 left-1/4 -mt-20 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 right-0 -mb-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between pb-2">
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(500, 0.04);
            onBack();
          }}
          aria-label="Back to welcome"
          className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition active:scale-95 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <IELTSSprintLogo variant="full" size="sm" className="brightness-125" />
        <div className="w-9" />
      </header>

      {/* Main Login Experience */}
      <main className="relative z-10 flex-1 flex flex-col justify-center py-4">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="space-y-4 sm:space-y-5"
        >
          {/* Headlines & Value Proposition Pill */}
          <div className="text-left space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Official Cambridge Band 9 Preparation</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Continue your structured IELTS journey with real British audio & AI examiners.
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
            {/* Email/Username field */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-300 mb-1">
                Candidate Email or Username
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  id="login-email"
                  type="text"
                  required
                  value={emailOrName}
                  onBlur={() => setTouched(prev => ({ ...prev, identifier: true }))}
                  onChange={e => {
                    setEmailOrName(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="e.g. candidate@example.com"
                  className={`w-full bg-slate-900/90 border rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner ${
                    identifierError ? 'border-rose-500/60' : 'border-slate-800 focus:border-blue-500'
                  }`}
                />
              </div>
              {identifierError && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {identifierError}
                </p>
              )}
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-pass" className="text-xs font-semibold text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  id="login-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Enter your candidate password"
                  className={`w-full bg-slate-900/90 border rounded-2xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner ${
                    passwordError ? 'border-rose-500/60' : 'border-slate-800 focus:border-blue-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {passwordError}
                </p>
              )}
            </div>

            {/* 🎯 Interactive Target Band Selector */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" /> Target IELTS Band
                </span>
                <span className="text-amber-300 font-bold">
                  {targetBand.toFixed(1)} · {BAND_DESCRIPTIONS[targetBand]?.level}
                </span>
              </div>

              {/* Band Pills */}
              <div className="grid grid-cols-6 gap-1.5 p-1 bg-slate-900/90 rounded-2xl border border-slate-800">
                {[6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      setTargetBand(b);
                      soundManager.playBeep(600 + b * 40, 0.04);
                    }}
                    className={`py-1.5 text-xs font-mono font-black rounded-xl transition cursor-pointer ${
                      targetBand === b
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 scale-105'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {b.toFixed(1)}
                  </button>
                ))}
              </div>

              <div className="text-[10px] text-slate-400 italic px-1 truncate">
                💡 {BAND_DESCRIPTIONS[targetBand]?.label}
              </div>
            </div>

            {/* Submit CTA with gradient shine */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[50px] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
            >
              <span>{isSubmitting ? 'Verifying Credentials...' : 'Log In to IELTS Sprint'}</span>
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Live British Audio System Status */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900/80 to-indigo-950/60 border border-blue-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Headphones className="w-4 h-4 animate-pulse" />
              </div>
              <div className="text-left">
                <div className="text-[11px] font-bold text-slate-200">
                  Cambridge Audio & Real-time AI
                </div>
                <div className="text-[10px] text-slate-400">
                  1-on-1 Voice Examiner · Multi-Speaker Dialogues · Band 9 Model Answers
                </div>
              </div>
            </div>
            <div className="flex items-end gap-1 shrink-0 h-4 px-2">
              <span className="w-1 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span className="w-1 h-3.5 bg-indigo-400 rounded-full animate-pulse delay-75" />
              <span className="w-1 h-1.5 bg-blue-300 rounded-full animate-pulse delay-150" />
              <span className="w-1 h-4 bg-amber-400 rounded-full animate-pulse delay-100" />
            </div>
          </div>

          {/* Divider */}
          <div className="relative py-1 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800/80" />
            </div>
            <span className="relative bg-slate-950 px-3 text-xs text-slate-500 font-medium">
              or continue with
            </span>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            className="w-full min-h-[50px] py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs border border-slate-200 flex items-center justify-between transition active:scale-98 shadow-md cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center shrink-0">
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
              </div>
              <span className="text-slate-850">
                Continue with Google
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200 shrink-0">
              Firebase Auth
            </span>
          </button>

          {/* Trust & Security Badges */}
          <div className="pt-1 flex items-center justify-center gap-4 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Cambridge-aligned scoring</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>Real-time voice AI</span>
            </span>
          </div>
        </motion.div>
      </main>

      {/* Switch to Register */}
      <footer className="relative z-10 pt-3 pb-1 text-center text-xs text-slate-400">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(600, 0.04);
            onSwitchToRegister();
          }}
          className="font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
        >
          Create one
        </button>
      </footer>
    </div>
  );
};
