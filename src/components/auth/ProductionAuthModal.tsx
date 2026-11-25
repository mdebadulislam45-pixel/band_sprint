import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Lock,
  CheckCircle2,
  Smartphone,
  ArrowRight,
  RefreshCw,
  Mail,
  User as UserIcon,
  AlertCircle,
  Loader2,
  Info,
  Eye,
  EyeOff,
  Target,
  Mic,
  PenTool,
  SlidersHorizontal,
  Sparkles,
  Wallet
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { BandSprintMark } from '../common/BandSprintMark';
import { getCurrentUser, createDefaultProgress, getAllUsers, saveUser, registerUser, ACTIVE_USER_KEY } from '../../utils/userStorage';
import { firebaseSyncService } from '../../services/firebaseSyncService';
import {
  loginCandidateWithServer,
  registerCandidateWithServer,
  fetchPhoneVerificationStatus,
  requestServerPhoneOtp,
  verifyServerPhoneOtp,
  normalizeBangladeshPhoneClient
} from '../../services/authService';
import {
  loadOnboardingSurvey,
  OnboardingSurveyData,
  PURPOSE_LABELS,
  WEAK_SKILL_META,
  PAIN_POINT_META
} from '../../services/onboardingSurveyStore';
import { loadExamSetup, saveExamSetup } from '../../services/examSetupService';
import { UserProfile } from '../../types';

interface ProductionAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  onSuccess?: () => void;
  initialMode?: 'signin' | 'register';
  onOpenOnboardingSurvey?: () => void;
}

export const ProductionAuthModal: React.FC<ProductionAuthModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onSuccess,
  initialMode = 'signin',
  onOpenOnboardingSurvey
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [authMode, setAuthMode] = useState<'signin' | 'register'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [surveyData, setSurveyData] = useState<OnboardingSurveyData | null>(() => loadOnboardingSurvey());

  // Email/password fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTargetBand, setSelectedTargetBand] = useState<number>(() => surveyData?.targetBand || 7.5);
  const [selectedTrack, setSelectedTrack] = useState<'Academic' | 'General Training'>(
    () => surveyData?.examTrack || 'Academic'
  );

  // Authenticated candidate state from Step 1
  const [authenticatedUser, setAuthenticatedUser] = useState<UserProfile | null>(null);

  // Phone verification state (Step 2 - Optional / Real Provider Only)
  const [smsProviderConfigured, setSmsProviderConfigured] = useState<boolean | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setAuthMode(initialMode);
    setAuthError('');
    setAuthNotice('');
    setPhoneError('');
    setOtpError('');
    const freshSurvey = loadOnboardingSurvey();
    setSurveyData(freshSurvey);
    if (freshSurvey) {
      setSelectedTargetBand(freshSurvey.targetBand);
      setSelectedTrack(freshSurvey.examTrack);
    }
    fetchPhoneVerificationStatus().then((status) => {
      setSmsProviderConfigured(Boolean(status.smsProviderConfigured));
    });
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isLoading, onClose]);

  useEffect(() => {
    if (!otpSent || resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpSent, resendCountdown]);

  const applySurveyToUser = (user: UserProfile): UserProfile => {
    const latestSurvey = loadOnboardingSurvey();
    const baseProgress = user.progress || createDefaultProgress(selectedTargetBand, user.name);
    const shouldApplySurvey = Boolean(latestSurvey && (authMode === 'register' || !baseProgress.weakestSkill));
    const effectiveTrack = latestSurvey?.examTrack || selectedTrack || baseProgress.intendedFormat || 'Academic';
    const effectiveTarget =
      shouldApplySurvey && latestSurvey
        ? latestSurvey.targetBand
        : authMode === 'register'
        ? selectedTargetBand
        : baseProgress.targetBand || selectedTargetBand;

    const mergedUser: UserProfile = {
      ...user,
      progress: {
        ...baseProgress,
        targetBand: effectiveTarget,
        intendedFormat: effectiveTrack,
        targetCountry:
          shouldApplySurvey && latestSurvey
            ? PURPOSE_LABELS[latestSurvey.purpose].countryHint
            : baseProgress.targetCountry || 'United Kingdom / Canada / Australia',
        examDate:
          shouldApplySurvey && latestSurvey?.examDate
            ? latestSurvey.examDate
            : baseProgress.examDate,
        weakestSkill:
          shouldApplySurvey && latestSurvey
            ? latestSurvey.weakestSkill
            : baseProgress.weakestSkill,
        dailyMinutes:
          shouldApplySurvey && latestSurvey
            ? latestSurvey.dailyMinutes
            : baseProgress.dailyMinutes,
        studyGoal:
          shouldApplySurvey && latestSurvey
            ? PURPOSE_LABELS[latestSurvey.purpose].short
            : baseProgress.studyGoal,
        coachingPainPoint:
          shouldApplySurvey && latestSurvey
            ? latestSurvey.coachingPainPoint
            : baseProgress.coachingPainPoint,
        currentBandEstimate:
          shouldApplySurvey && latestSurvey && typeof latestSurvey.currentBand === 'number'
            ? latestSurvey.currentBand
            : baseProgress.currentBandEstimate ?? null
      }
    };

    try {
      const existingSetup = loadExamSetup();
      saveExamSetup({
        ...existingSetup,
        targetBand: mergedUser.progress.targetBand,
        examMode: mergedUser.progress.intendedFormat,
        examDate: mergedUser.progress.examDate || existingSetup.examDate
      });
    } catch {
      // Non-fatal
    }

    return mergedUser;
  };

  const finalizeAndClose = (user: UserProfile, toastMessage?: string) => {
    const personalizedUser = applySurveyToUser(user);
    saveUser(personalizedUser);
    if (
      personalizedUser.id &&
      personalizedUser.id !== 'default_candidate' &&
      firebaseSyncService.getCurrentFirebaseUser()?.uid === personalizedUser.id
    ) {
      const currentSetup = loadExamSetup();
      firebaseSyncService
        .saveStudyStateToFirestore(personalizedUser.id, 'examSetup', {
          ...currentSetup,
          targetBand: personalizedUser.progress.targetBand,
          examMode: personalizedUser.progress.intendedFormat,
          examDate: personalizedUser.progress.examDate || currentSetup.examDate
        })
        .catch(() => {});
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_USER_KEY, personalizedUser.id);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: personalizedUser }));
    }
    soundManager.playSuccess();
    onShowToast(toastMessage || `Welcome to BandSprint, ${personalizedUser.name}!`);
    onClose();
    if (onSuccess) onSuccess();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleAuthUpdated = (e: any) => {
      const active = e?.detail || getCurrentUser();
      if (active && active.id && active.email && active.id !== 'default_candidate') {
        setAuthenticatedUser(active);
        setIsLoading(false);
        soundManager.playSuccess();
        onShowToast(`Signed in as ${active.name}!`);
        onClose();
        if (onSuccess) onSuccess();
      }
    };
    window.addEventListener('user_auth_updated', handleAuthUpdated);
    return () => window.removeEventListener('user_auth_updated', handleAuthUpdated);
  }, [isOpen, onClose, onShowToast, onSuccess]);

  if (!isOpen) return null;

  const detectOperator = (num: string): { name: string; color: string } | null => {
    const clean = num.replace(/\D/g, '');
    const prefix = clean.startsWith('880')
      ? clean.substring(3, 6)
      : clean.startsWith('1') && clean.length <= 10
      ? `0${clean.substring(0, 2)}`
      : clean.substring(0, 3);

    if (['017', '013'].includes(prefix)) {
      return { name: 'Grameenphone', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-300' };
    }
    if (['019', '014'].includes(prefix)) {
      return { name: 'Banglalink', color: 'bg-orange-500/10 text-orange-700 border-orange-300' };
    }
    if (['018'].includes(prefix)) {
      return { name: 'Robi', color: 'bg-red-500/10 text-red-700 border-red-300' };
    }
    if (['016'].includes(prefix)) {
      return { name: 'Airtel', color: 'bg-blue-500/10 text-blue-700 border-blue-300' };
    }
    if (['015'].includes(prefix)) {
      return { name: 'Teletalk', color: 'bg-indigo-500/10 text-indigo-700 border-indigo-300' };
    }
    return null;
  };

  const operatorInfo = detectOperator(phoneNumber);

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    setAuthError('');
    setAuthNotice('');
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError('Enter your email address above first so we can send a password reset link.');
      return;
    }
    setIsLoading(true);
    try {
      await firebaseSyncService.sendResetPasswordEmail(cleanEmail);
      setIsLoading(false);
      setAuthNotice(`Password reset link sent to ${cleanEmail}. Check your inbox and spam folder.`);
      onShowToast(`Password reset instructions sent to ${cleanEmail}.`);
    } catch (err: any) {
      setIsLoading(false);
      setAuthError(err?.message || 'Unable to send password reset email. Verify your email address.');
    }
  };

  // Step 1A: Real Google Sign-In via Firebase Auth + Server Session Bridge
  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    soundManager.playBeep(600, 0.04);
    setAuthError('');
    setAuthNotice('');
    setIsLoading(true);

    try {
      const fbUser = await firebaseSyncService.signInWithGoogle();
      if (!fbUser) {
        onShowToast('Connecting with Google…');
        return;
      }

      const syncedUser = getCurrentUser();
      const resolvedUser: UserProfile = {
        id: fbUser.uid,
        name: fbUser.displayName || syncedUser?.name || fbUser.email?.split('@')[0] || 'IELTS Candidate',
        email: fbUser.email || syncedUser?.email || '',
        createdAt: syncedUser?.createdAt || Date.now(),
        progress:
          syncedUser?.progress && syncedUser.email?.toLowerCase() === (fbUser.email || '').toLowerCase()
            ? syncedUser.progress
            : createDefaultProgress(selectedTargetBand, fbUser.displayName || 'IELTS Candidate')
      };
      saveUser(resolvedUser);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(ACTIVE_USER_KEY, fbUser.uid);
      }

      setAuthenticatedUser(resolvedUser);
      setIsLoading(false);

      if (smsProviderConfigured) {
        setStep(2);
        onShowToast(`Signed in with Google as ${resolvedUser.email}.`);
      } else {
        finalizeAndClose(resolvedUser, `Welcome back, ${resolvedUser.name}!`);
      }
    } catch (err: any) {
      setIsLoading(false);
      const code = err?.code || '';
      const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

      if (code === 'auth/popup-blocked') {
        if (!isInIframe) {
          try {
            onShowToast('Popup blocked. Redirecting to Google Sign-In…');
            await firebaseSyncService.signInWithGoogleRedirect();
            return;
          } catch (redirErr: any) {
            setAuthError(redirErr?.message || 'Unable to start Google sign-in. Allow popups or sign in with email below.');
            return;
          }
        }
        setAuthError('Your browser blocked the Google Sign-In popup. Allow popups for this site or sign in with email below.');
        return;
      }
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError('Google sign-in was closed before finishing. Click "Continue with Google" again to try again.');
        return;
      }
      if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        setAuthError(
          `Domain "${host}" is not yet authorized in Firebase Authentication. Sign in or create an account with email below.`
        );
        return;
      }
      if (code === 'auth/network-request-failed') {
        setAuthError('Network error while contacting Google Authentication. Check your internet connection.');
        return;
      }
      setAuthError(err?.message || 'Google sign-in failed. Try again or continue with email below.');
    }
  };

  // Step 1B: Real Email & Password Sign-In or Registration
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setAuthError('');
    setAuthNotice('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }
    if (authMode === 'register' && !fullName.trim()) {
      setAuthError('Please enter your full name to create your account.');
      return;
    }

    setIsLoading(true);
    try {
      if (authMode === 'register') {
        const serverRes = await registerCandidateWithServer({
          name: fullName.trim(),
          email: cleanEmail,
          password,
          targetBand: selectedTargetBand,
          intendedFormat: selectedTrack,
          targetCountry: 'United Kingdom / Canada / Australia'
        });

        if (!serverRes.success || !serverRes.user) {
          const isServerUnavailable =
            serverRes.error === 'SERVER_UNAVAILABLE' ||
            (serverRes.error || '').toLowerCase().includes('network error');

          if (isServerUnavailable) {
            try {
              const fbProfile = await firebaseSyncService.registerWithEmail(
                fullName.trim(),
                cleanEmail,
                password,
                selectedTargetBand,
                selectedTrack,
                'United Kingdom / Canada / Australia'
              );
              setAuthenticatedUser(fbProfile);
              setIsLoading(false);
              finalizeAndClose(fbProfile, `Account created! Welcome to BandSprint, ${fbProfile.name}.`);
              return;
            } catch (fbErr: any) {
              const fbCode = fbErr?.code || '';
              if (fbCode === 'auth/email-already-in-use') {
                setAuthError('An account with this email already exists. Switch to Log in below.');
                setIsLoading(false);
                return;
              }
              const localRes = registerUser(
                fullName.trim(),
                cleanEmail,
                selectedTargetBand,
                selectedTrack,
                'United Kingdom / Canada / Australia',
                undefined,
                password
              );
              if (localRes.success && localRes.user) {
                setAuthenticatedUser(localRes.user);
                setIsLoading(false);
                finalizeAndClose(localRes.user, localRes.message);
                return;
              }
              setAuthError(localRes.message || fbErr?.message || 'Registration failed. Please try again.');
              setIsLoading(false);
              return;
            }
          }

          setAuthError(serverRes.error || 'Registration failed. Please check your details.');
          setIsLoading(false);
          return;
        }

        setAuthenticatedUser(serverRes.user);
        setIsLoading(false);
        if (smsProviderConfigured) {
          setStep(2);
          onShowToast('Account created! You may optionally link a mobile number.');
        } else {
          finalizeAndClose(serverRes.user, serverRes.message);
        }
      } else {
        const serverRes = await loginCandidateWithServer({
          email: cleanEmail,
          password
        });

        if (!serverRes.success || !serverRes.user) {
          try {
            const fbProfile = await firebaseSyncService.loginWithEmail(cleanEmail, password);
            setAuthenticatedUser(fbProfile);
            setIsLoading(false);
            finalizeAndClose(fbProfile, `Welcome back, ${fbProfile.name}!`);
            return;
          } catch {
            const localUsers = getAllUsers();
            const localMatch = localUsers.find(
              (u) => u.email.toLowerCase() === cleanEmail
            );
            if (localMatch && (!localMatch.password || localMatch.password === password)) {
              setAuthenticatedUser(localMatch);
              setIsLoading(false);
              finalizeAndClose(localMatch, `Welcome back, ${localMatch.name}!`);
              return;
            }

            const friendlyErr =
              serverRes.error === 'SERVER_UNAVAILABLE'
                ? 'No matching account found. Check your email and password or create a free account below.'
                : serverRes.error || 'Invalid email or password. Please try again.';
            setAuthError(friendlyErr);
            setIsLoading(false);
            return;
          }
        }

        setAuthenticatedUser(serverRes.user);
        setIsLoading(false);
        finalizeAndClose(serverRes.user, serverRes.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setAuthError(err?.message || 'Authentication failed. Please try again.');
    }
  };

  // Step 2: Optional Real Server-Side Phone OTP Request
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setPhoneError('');

    const normalized = normalizeBangladeshPhoneClient(phoneNumber);
    if (!normalized.valid || !normalized.e164) {
      setPhoneError(normalized.error || 'Enter a valid 11-digit Bangladesh mobile number (013–019).');
      soundManager.playBeep(300, 0.05);
      return;
    }

    setIsLoading(true);
    const result = await requestServerPhoneOtp(normalized.e164);
    setIsLoading(false);

    if (!result.success) {
      if (result.code === 'SMS_PROVIDER_UNAVAILABLE') {
        setSmsProviderConfigured(false);
      }
      if (result.retryAfterSeconds) {
        setResendCountdown(result.retryAfterSeconds);
      }
      setPhoneError(result.error || 'Unable to send SMS verification code at this time.');
      soundManager.playBeep(300, 0.05);
      return;
    }

    setNormalizedPhone(result.normalizedPhone || normalized.e164);
    setOtpValues(['', '', '', '', '', '']);
    setOtpSent(true);
    setResendCountdown(45);
    soundManager.playSuccess();
    onShowToast(`Verification code sent via SMS to ${result.normalizedPhone || normalized.e164}.`);
    setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
  };

  const handleOtpChange = (index: number, value: string) => {
    const val = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otpValues];
    newOtp[index] = val;
    setOtpValues(newOtp);

    if (val && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const next = ['', '', '', '', '', ''];
      for (let i = 0; i < pasted.length && i < 6; i++) {
        next[i] = pasted[i];
      }
      setOtpValues(next);
      otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const handleVerifyOtpAndComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    const code = otpValues.join('');
    if (code.length !== 6) {
      setOtpError('Please enter the 6-digit SMS verification code.');
      soundManager.playBeep(300, 0.05);
      return;
    }

    setOtpError('');
    setIsLoading(true);
    const verifyRes = await verifyServerPhoneOtp(normalizedPhone || phoneNumber, code);
    setIsLoading(false);

    if (!verifyRes.success || !verifyRes.user) {
      setOtpError(verifyRes.error || 'Invalid or expired verification code.');
      soundManager.playBeep(300, 0.05);
      return;
    }

    finalizeAndClose(
      verifyRes.user,
      `Phone number verified! Welcome to BandSprint, ${verifyRes.user.name}.`
    );
  };

  const handleResendOtp = async () => {
    if (isLoading || resendCountdown > 0) return;
    setOtpError('');
    setIsLoading(true);
    const result = await requestServerPhoneOtp(normalizedPhone || phoneNumber);
    setIsLoading(false);

    if (!result.success) {
      if (result.retryAfterSeconds) {
        setResendCountdown(result.retryAfterSeconds);
      }
      setOtpError(result.error || 'Could not resend verification code.');
      return;
    }

    setOtpValues(['', '', '', '', '', '']);
    setResendCountdown(45);
    onShowToast('A new 6-digit verification code has been sent via SMS.');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 bg-[#F7F9F8] text-[#0E1F1E] overflow-y-auto flex flex-col select-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-page-title"
      >
        {/* Clean Minimal IELTSly-Style Top Bar */}
        <header className="sticky top-0 z-20 bg-[#F7F9F8]/95 backdrop-blur-sm border-b border-[#D3DDDA]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(480, 0.03);
                onClose();
              }}
              className="inline-flex items-center gap-2.5 cursor-pointer rounded-lg py-1"
              aria-label="Return to BandSprint home"
            >
              <BandSprintMark size={28} />
              <span className="font-display text-lg font-bold tracking-tight text-[#0E1F1E]">
                BandSprint
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(450, 0.03);
                onClose();
              }}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#D3DDDA] bg-white hover:bg-[#EEF3F1] text-[#0E1F1E] text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#566664]" />
              <span>Back to home</span>
            </button>
          </div>
        </header>

        {/* Main Split Auth Workspace */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
          <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            {/* Left Editorial Value Column (Desktop — Personalized Roadmap OR Why BandSprint vs Coaching Center) */}
            <div className="hidden lg:flex lg:col-span-6 flex-col justify-between rounded-2xl bg-[#0F4C45] text-white p-8 xl:p-10 border border-[#1F8A70]/40">
              {surveyData ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#F4A62A]">
                      Your Personalized Study Blueprint
                    </p>
                    {onOpenOnboardingSurvey && (
                      <button
                        type="button"
                        onClick={onOpenOnboardingSurvey}
                        className="text-xs font-semibold text-[#EEF3F1]/80 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Edit goals</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <h2 className="font-display text-3xl font-bold tracking-tight leading-tight text-white">
                      Your Band {surveyData.targetBand.toFixed(1)} {surveyData.examTrack} plan is ready to unlock.
                    </h2>
                    <p className="text-sm text-[#EEF3F1]/80 leading-relaxed">
                      Create your free account or log in to save these targets and jump straight into your {WEAK_SKILL_META[surveyData.weakestSkill].label} priority drills.
                    </p>
                  </div>

                  {/* Survey Summary Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 rounded-xl bg-white/10 border border-white/15">
                      <div className="text-[11px] text-[#EEF3F1]/75">Aim Band</div>
                      <div className="font-mono text-xl font-bold text-[#F4A62A] tabular-nums mt-0.5">
                        Band {surveyData.targetBand.toFixed(1)}
                      </div>
                      <div className="text-[11px] text-[#EEF3F1]/75 mt-0.5 truncate">
                        {PURPOSE_LABELS[surveyData.purpose].short}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/10 border border-white/15">
                      <div className="text-[11px] text-[#EEF3F1]/75">Priority Skill</div>
                      <div className="text-lg font-bold text-white mt-0.5">
                        {WEAK_SKILL_META[surveyData.weakestSkill].label}
                      </div>
                      <div className="text-[11px] text-[#EEF3F1]/75 mt-0.5 font-mono">
                        {surveyData.dailyMinutes} min/day sprint
                      </div>
                    </div>
                  </div>

                  {/* Tailored Coaching Advantage Reminder */}
                  <div className="p-4 rounded-xl bg-[#0B3833] border border-[#F4A62A]/30 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F4A62A]">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>Why this beats offline coaching</span>
                    </div>
                    <p className="text-xs text-[#EEF3F1]/90 leading-relaxed">
                      {PAIN_POINT_META[surveyData.coachingPainPoint].bandSprintFix}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#F4A62A]">
                    Why Candidates Switch From Coaching Centers
                  </p>

                  <div className="space-y-3">
                    <h2 className="font-display text-3xl font-bold tracking-tight leading-tight text-white">
                      {authMode === 'signin'
                        ? 'Pick up your personalized IELTS plan right where you left off.'
                        : 'Smarter than a ৳20,000 coaching batch — built around your aim band.'}
                    </h2>
                    <p className="text-sm text-[#EEF3F1]/80 leading-relaxed">
                      Skip rigid traffic commutes and generic lectures. Get instant 4-criteria rubric feedback, private 24/7 AI speaking simulations, and English + বাংলা trap explanations.
                    </p>
                  </div>

                  {/* Crisp Coaching-vs-BandSprint Advantage List */}
                  <div className="space-y-3.5 pt-1">
                    {[
                      {
                        icon: Wallet,
                        title: 'Free to Start vs. ৳15,000–৳25,000 Batch Fees',
                        desc: '5 full mocks, 10-min diagnostic, and daily AI Speaking + Writing checks at ৳0.'
                      },
                      {
                        icon: PenTool,
                        title: 'Instant Rubric Fixes vs. 5-Day Teacher Wait',
                        desc: 'Exact Task Response, Coherence, Lexical & Grammar scoring with Band 8+ rewrites.'
                      },
                      {
                        icon: Mic,
                        title: 'Private 24/7 AI Examiner vs. Crowded Classroom',
                        desc: 'Unlimited speaking fluency, pronunciation shadowing, and zero stage fright.'
                      },
                      {
                        icon: Target,
                        title: 'Built Around Your Aim Band & Weakest Skill',
                        desc: 'Daily study minutes automatically weight toward the module holding you back.'
                      }
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.title} className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 mt-0.5">
                            <Icon className="w-4 h-4 text-[#F4A62A]" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white leading-snug">
                              {item.title}
                            </div>
                            <div className="text-xs text-[#EEF3F1]/75 leading-relaxed mt-0.5">
                              {item.desc}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {onOpenOnboardingSurvey && (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playBeep(580, 0.03);
                        onOpenOnboardingSurvey();
                      }}
                      className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#F4A62A] hover:bg-[#d98f1d] text-[#0E1F1E] text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <SlidersHorizontal className="w-4 h-4 shrink-0" />
                      <span>Take 60-sec Aim Band &amp; Study Plan Survey</span>
                    </button>
                  )}
                </div>
              )}

              <div className="pt-6 mt-6 border-t border-white/15 flex items-center justify-between text-xs text-[#EEF3F1]/80">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[#F4A62A] shrink-0" />
                  Free account · No card needed
                </span>
                <span className="font-mono text-[11px] text-[#EEF3F1]/70">
                  Cloud Sync Active
                </span>
              </div>
            </div>

            {/* Right Focused Auth Card (Primary Conversion Carrier) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="lg:col-span-6 flex items-center"
            >
              <div className="w-full max-w-md mx-auto bg-white border border-[#D3DDDA] rounded-2xl p-6 sm:p-8 shadow-xs space-y-5">
                {/* Mobile Compact Survey Blueprint Banner OR Quick Survey Link */}
                {step === 1 && (
                  <div className="lg:hidden">
                    {surveyData ? (
                      <div className="p-3.5 rounded-xl bg-[#0F4C45] text-white flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] text-[#F4A62A] font-semibold">
                            Your {surveyData.examTrack} Plan Ready
                          </div>
                          <div className="text-xs font-bold truncate mt-0.5">
                            Aim Band {surveyData.targetBand.toFixed(1)} · Priority: {WEAK_SKILL_META[surveyData.weakestSkill].label} · {surveyData.dailyMinutes}m/day
                          </div>
                        </div>
                        {onOpenOnboardingSurvey && (
                          <button
                            type="button"
                            onClick={onOpenOnboardingSurvey}
                            className="text-[11px] font-semibold text-[#EEF3F1] underline shrink-0 cursor-pointer"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    ) : (
                      onOpenOnboardingSurvey && (
                        <button
                          type="button"
                          onClick={onOpenOnboardingSurvey}
                          className="w-full p-3 rounded-xl bg-[#EEF3F1] hover:bg-[#E2ECE9] border border-[#D3DDDA] text-left flex items-center justify-between gap-2 transition-colors cursor-pointer"
                        >
                          <div>
                            <div className="text-xs font-bold text-[#0F4C45]">
                              New to BandSprint? Build your custom plan first
                            </div>
                            <div className="text-[11px] text-[#566664]">
                              60-sec aim band, weak-skill &amp; coaching-comparison survey
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#0F4C45] shrink-0" />
                        </button>
                      )
                    )}
                  </div>
                )}

                {/* Heading */}
                <div className="space-y-1.5">
                  <h1
                    id="auth-page-title"
                    className="font-display text-2xl sm:text-[26px] font-bold text-[#0E1F1E] tracking-tight"
                  >
                    {step === 1
                      ? authMode === 'signin'
                        ? 'Log in to BandSprint'
                        : surveyData
                        ? 'Save your personalized plan'
                        : 'Create your free account'
                      : 'Link Bangladesh Mobile (+880)'}
                  </h1>
                  <p className="text-xs sm:text-sm text-[#566664] leading-relaxed">
                    {step === 1
                      ? authMode === 'signin'
                        ? 'Continue your study plan, mock tests, and daily band tracker.'
                        : surveyData
                        ? `Unlock your Band ${surveyData.targetBand.toFixed(1)} roadmap, 5 full mocks, and daily AI feedback — free.`
                        : 'Start free with your 10-minute diagnostic, 5 full mocks, and daily AI Speaking & Writing feedback.'
                      : `Signed in as ${authenticatedUser?.email || 'Candidate'}. Optionally link your mobile number.`}
                  </p>
                </div>

                {/* Step 1: Google + Email/Password */}
                {step === 1 && (
                  <div className="space-y-4">
                    {authError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span>{authError}</span>
                      </div>
                    )}

                    {authNotice && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{authNotice}</span>
                      </div>
                    )}

                    {/* Primary Google Sign-In */}
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                      className="w-full min-h-[48px] bg-white hover:bg-[#F7F9F8] border border-[#D3DDDA] hover:border-[#0F4C45] rounded-xl transition flex items-center justify-center gap-3 active:scale-[0.99] cursor-pointer disabled:opacity-60"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#0F4C45]" />
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
                      <span className="font-semibold text-[#0E1F1E] text-sm">
                        Continue with Google
                      </span>
                    </button>

                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-[#D3DDDA]" />
                      <span className="flex-shrink mx-3 text-xs font-medium text-[#566664]">
                        or continue with email
                      </span>
                      <div className="flex-grow border-t border-[#D3DDDA]" />
                    </div>

                    <form onSubmit={handleEmailAuth} className="space-y-3.5">
                      {authMode === 'register' && (
                        <div>
                          <label htmlFor="auth-fullname" className="block text-xs font-semibold text-[#0E1F1E] mb-1.5">
                            Full Name
                          </label>
                          <div className="relative">
                            <UserIcon className="w-4 h-4 text-[#566664] absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              id="auth-fullname"
                              type="text"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="Enter your full name"
                              className="w-full min-h-[46px] pl-10 pr-3.5 rounded-xl border border-[#D3DDDA] bg-[#F7F9F8] text-sm text-[#0E1F1E] focus:outline-none focus:border-[#0F4C45] focus:bg-white transition"
                              required
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label htmlFor="auth-email" className="block text-xs font-semibold text-[#0E1F1E] mb-1.5">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-[#566664] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            id="auth-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full min-h-[46px] pl-10 pr-3.5 rounded-xl border border-[#D3DDDA] bg-[#F7F9F8] text-sm text-[#0E1F1E] focus:outline-none focus:border-[#0F4C45] focus:bg-white transition"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label htmlFor="auth-password" className="block text-xs font-semibold text-[#0E1F1E]">
                            Password
                          </label>
                          {authMode === 'signin' && (
                            <button
                              type="button"
                              onClick={handleForgotPassword}
                              className="text-xs font-semibold text-[#0F4C45] hover:underline cursor-pointer"
                            >
                              Forgot password?
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-[#566664] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            id="auth-password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            minLength={6}
                            className="w-full min-h-[46px] pl-10 pr-11 rounded-xl border border-[#D3DDDA] bg-[#F7F9F8] text-sm text-[#0E1F1E] focus:outline-none focus:border-[#0F4C45] focus:bg-white transition"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#566664] hover:text-[#0E1F1E] cursor-pointer"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {authMode === 'register' && (
                        <div className="grid grid-cols-2 gap-3 pt-0.5">
                          <div>
                            <label htmlFor="auth-track" className="block text-xs font-semibold text-[#0E1F1E] mb-1.5">
                              IELTS Track
                            </label>
                            <select
                              id="auth-track"
                              value={selectedTrack}
                              onChange={(e) => setSelectedTrack(e.target.value as 'Academic' | 'General Training')}
                              className="w-full min-h-[44px] px-3 rounded-xl border border-[#D3DDDA] bg-[#F7F9F8] text-xs font-semibold text-[#0E1F1E] focus:outline-none focus:border-[#0F4C45] focus:bg-white cursor-pointer"
                            >
                              <option value="Academic">Academic</option>
                              <option value="General Training">General Training</option>
                            </select>
                          </div>
                          <div>
                            <label htmlFor="auth-target" className="block text-xs font-semibold text-[#0E1F1E] mb-1.5">
                              Target Band
                            </label>
                            <select
                              id="auth-target"
                              value={selectedTargetBand}
                              onChange={(e) => setSelectedTargetBand(Number(e.target.value))}
                              className="w-full min-h-[44px] px-3 rounded-xl border border-[#D3DDDA] bg-[#F7F9F8] text-xs font-mono font-semibold text-[#0F4C45] focus:outline-none focus:border-[#0F4C45] focus:bg-white cursor-pointer"
                            >
                              {[6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map((band) => (
                                <option key={band} value={band}>
                                  Band {band.toFixed(1)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full min-h-[48px] rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <span>
                              {authMode === 'signin' ? 'Log in' : 'Create free account'}
                            </span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>

                    {/* Clean Single-Line Mode Toggle */}
                    <div className="pt-2 text-center text-xs sm:text-sm text-[#566664]">
                      {authMode === 'signin' ? (
                        <>
                          New to BandSprint?{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode('register');
                              setAuthError('');
                              setAuthNotice('');
                            }}
                            className="font-bold text-[#0F4C45] hover:underline cursor-pointer"
                          >
                            Create a free account
                          </button>
                        </>
                      ) : (
                        <>
                          Already have an account?{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode('signin');
                              setAuthError('');
                              setAuthNotice('');
                            }}
                            className="font-bold text-[#0F4C45] hover:underline cursor-pointer"
                          >
                            Log in
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 2: Optional Real Bangladesh Mobile Verification */}
                {step === 2 && (
                  <div className="space-y-4">
                    {smsProviderConfigured === false ? (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-[#FDF6E7] border border-[#F4A62A]/40 text-xs text-[#6B4200] flex items-start gap-2.5 leading-relaxed">
                          <Info className="w-4 h-4 text-[#C27D0E] shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">SMS Gateway Not Configured</p>
                            <p className="mt-1">
                              Your account is already active and verified via{' '}
                              <strong>{authenticatedUser?.email}</strong>.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (authenticatedUser) {
                              finalizeAndClose(authenticatedUser);
                            } else {
                              onClose();
                            }
                          }}
                          className="w-full min-h-[48px] rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span>Continue to Dashboard</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    ) : !otpSent ? (
                      <form onSubmit={handleSendOtp} className="space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-semibold text-[#0E1F1E]">
                              Bangladesh Mobile Number
                            </label>
                            {operatorInfo && (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${operatorInfo.color}`}
                              >
                                {operatorInfo.name}
                              </span>
                            )}
                          </div>

                          <div className="flex rounded-xl overflow-hidden border border-[#D3DDDA] focus-within:border-[#0F4C45] bg-[#F7F9F8]">
                            <div className="flex items-center gap-1.5 px-3.5 bg-[#EEF3F1] border-r border-[#D3DDDA] text-[#0E1F1E] font-mono text-xs font-bold shrink-0">
                              <span>+880</span>
                            </div>
                            <input
                              type="tel"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              placeholder="01712345678"
                              className="w-full min-h-[46px] px-3.5 bg-transparent text-[#0E1F1E] text-sm font-mono focus:outline-none"
                              maxLength={14}
                              autoFocus
                            />
                          </div>
                          {phoneError && (
                            <p className="text-[11px] text-rose-700 font-semibold">{phoneError}</p>
                          )}
                        </div>

                        <div className="p-3 rounded-xl bg-[#EEF3F1] border border-[#D3DDDA] text-xs text-[#566664] flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-[#0F4C45] shrink-0" />
                          <span>We will send a 6-digit verification code via SMS.</span>
                        </div>

                        <button
                          type="submit"
                          disabled={isLoading}
                          className="w-full min-h-[48px] rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <span>Send Verification Code (OTP)</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (authenticatedUser) {
                              finalizeAndClose(authenticatedUser);
                            } else {
                              onClose();
                            }
                          }}
                          className="w-full py-2 text-xs font-semibold text-[#566664] hover:text-[#0E1F1E] transition cursor-pointer text-center"
                        >
                          Skip for now — Continue to Dashboard
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyOtpAndComplete} className="space-y-4">
                        <div className="space-y-2 text-center sm:text-left">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#0E1F1E]">Enter 6-Digit SMS Code</span>
                            <span className="text-[#0F4C45] font-mono font-bold tabular-nums">
                              {normalizedPhone || phoneNumber}
                            </span>
                          </div>

                          <div
                            className="flex justify-center sm:justify-between gap-2 py-2"
                            onPaste={handleOtpPaste}
                          >
                            {otpValues.map((val, idx) => (
                              <input
                                key={idx}
                                ref={(el) => {
                                  otpInputRefs.current[idx] = el;
                                }}
                                type="text"
                                inputMode="numeric"
                                value={val}
                                onChange={(e) => handleOtpChange(idx, e.target.value)}
                                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                maxLength={1}
                                className="w-11 h-12 text-center text-lg font-bold rounded-lg border-2 border-[#D3DDDA] focus:border-[#0F4C45] bg-[#F7F9F8] text-[#0E1F1E] font-mono transition"
                              />
                            ))}
                          </div>

                          {otpError && (
                            <p className="text-[11px] text-rose-700 font-semibold text-center sm:text-left">
                              {otpError}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-[#566664] pt-1">
                          <span>Code expires in 5 minutes</span>
                          {resendCountdown > 0 ? (
                            <span className="font-mono tabular-nums text-[#566664]">
                              Resend in 0:{resendCountdown < 10 ? `0${resendCountdown}` : resendCountdown}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleResendOtp}
                              disabled={isLoading}
                              className="text-[#0F4C45] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" /> Resend Code
                            </button>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={isLoading}
                          className="w-full min-h-[48px] rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Verify &amp; Complete</span>
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* Quiet Legal Footer */}
                <div className="pt-4 border-t border-[#EEF3F1] flex items-center justify-between text-[11px] text-[#566664]">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#0F4C45]" />
                    <span>Encrypted · Cloud synced</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href="#terms"
                      onClick={(e) => {
                        e.preventDefault();
                        window.dispatchEvent(
                          new CustomEvent('open_legal_modal', { detail: { tab: 'terms' } })
                        );
                      }}
                      className="hover:text-[#0F4C45] hover:underline"
                    >
                      Terms
                    </a>
                    <span>·</span>
                    <a
                      href="#privacy"
                      onClick={(e) => {
                        e.preventDefault();
                        window.dispatchEvent(
                          new CustomEvent('open_legal_modal', { detail: { tab: 'privacy' } })
                        );
                      }}
                      className="hover:text-[#0F4C45] hover:underline"
                    >
                      Privacy
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
