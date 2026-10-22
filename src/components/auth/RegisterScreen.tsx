import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react';
import { IELTSSprintLogo } from '../common/IELTSSprintLogo';
import { registerCandidateWithServer } from '../../services/authService';
import { UserProfile } from '../../types';

interface RegisterScreenProps {
  onSuccess: (user: UserProfile, needsVerification: boolean) => void;
  onSwitchToLogin: () => void;
  onBack: () => void;
  onGoogleSignIn: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onSuccess,
  onSwitchToLogin,
  onBack,
  onGoogleSignIn
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Field touch tracking for clean inline validation
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; password?: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Password strength calculations
  const calculatePasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'Empty', color: 'bg-slate-700' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd) || /[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-blue-500' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = calculatePasswordStrength(password);

  // Inline validation rules
  const nameError = touched.name && !fullName.trim() ? 'Please enter your full name.' : null;
  const emailError =
    touched.email && (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      ? 'Please enter a valid candidate email (e.g. name@domain.com).'
      : null;
  const passwordError =
    touched.password && password.length < 6
      ? 'Password must contain at least 6 characters.'
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    setGeneralError(null);

    if (!fullName.trim() || !email.trim() || password.length < 6) {
      return;
    }

    if (!agreeTerms) {
      setGeneralError('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setIsSubmitting(true);

    const result = await registerCandidateWithServer({
      name: fullName.trim(),
      email: email.trim(),
      password,
      targetBand: 7.5,
      intendedFormat: 'Academic',
      targetCountry: 'United Kingdom / Canada / Australia'
    });

    setIsSubmitting(false);

    if (result.success && result.user) {
      onSuccess(result.user, true); // Directs to email verification step
    } else {
      setGeneralError(result.error || 'Registration failed. Please check your details.');
    }
  };

  const handleGoogleAuth = () => {
    setGeneralError(null);
    onGoogleSignIn();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-5 sm:p-8 max-w-md mx-auto relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <header className="relative z-10 flex items-center justify-between pb-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to welcome"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <IELTSSprintLogo variant="full" size="sm" className="brightness-125" />
        <div className="w-8" />
      </header>

      {/* Main Registration Card */}
      <main className="relative z-10 flex-1 flex flex-col justify-center py-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-5"
        >
          {/* Headlines */}
          <div className="text-left space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Create your account
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Start building your personalized IELTS preparation plan.
            </p>
          </div>

          {/* General alert if any */}
          {generalError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {/* Full Name */}
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-300 mb-1">
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={fullName}
                  onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                  onChange={e => {
                    setFullName(e.target.value);
                    if (generalError) setGeneralError(null);
                  }}
                  placeholder="e.g. John Doe"
                  className={`w-full bg-slate-900/90 border rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                    nameError ? 'border-rose-500/60' : 'border-slate-800 focus:border-blue-500'
                  }`}
                />
              </div>
              {nameError && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {nameError}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-300 mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (generalError) setGeneralError(null);
                  }}
                  placeholder="name@example.com"
                  className={`w-full bg-slate-900/90 border rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                    emailError ? 'border-rose-500/60' : 'border-slate-800 focus:border-blue-500'
                  }`}
                />
              </div>
              {emailError && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {emailError}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (generalError) setGeneralError(null);
                  }}
                  placeholder="At least 6 characters"
                  className={`w-full bg-slate-900/90 border rounded-2xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
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

              {/* Password strength bar */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Strength: {strength.label}</span>
                    <span>{strength.score}/4</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    {[1, 2, 3, 4].map(idx => (
                      <div
                        key={idx}
                        className={`h-full rounded-full transition-all ${
                          idx <= strength.score ? strength.color : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {passwordError && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {passwordError}
                </p>
              )}
            </div>

            {/* Terms Checkbox */}
            <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={e => setAgreeTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-400 leading-snug">
                I agree to the <span className="text-blue-400 underline">Terms of Service</span> and{' '}
                <span className="text-blue-400 underline">Privacy Policy</span>.
              </span>
            </label>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[50px] py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-98"
            >
              <span>{isSubmitting ? 'Creating account...' : 'Create Account'}</span>
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Divider */}
          <div className="relative py-2 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <span className="relative bg-slate-950 px-3 text-xs text-slate-500 font-medium">
              or continue with
            </span>
          </div>

          {/* Google Button */}
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
                Sign up with Google
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200 shrink-0">
              Firebase Auth
            </span>
          </button>
        </motion.div>
      </main>

      {/* Footer Switch */}
      <footer className="relative z-10 pt-4 pb-2 text-center text-xs text-slate-400">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-bold text-blue-400 hover:text-blue-300 underline"
        >
          Log in
        </button>
      </footer>
    </div>
  );
};
