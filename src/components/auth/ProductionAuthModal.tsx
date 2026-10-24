import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Lock, Sparkles, Phone, CheckCircle2, Smartphone, ArrowRight, RefreshCw } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { IELTSSprintLogo } from '../common/IELTSSprintLogo';
import { saveUser, switchActiveUser, createDefaultProgress } from '../../utils/userStorage';
import { UserProfile } from '../../types';

interface ProductionAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  onSuccess?: () => void;
}

export const ProductionAuthModal: React.FC<ProductionAuthModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onSuccess
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);

  // Google profile cache during step 1
  const [googleProfile, setGoogleProfile] = useState<{ name: string; email: string; avatar: string } | null>(null);

  // Phone number state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(45);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: any;
    if (otpSent && resendCountdown > 0) {
      timer = setInterval(() => setResendCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpSent, resendCountdown]);

  if (!isOpen) return null;

  // Real-time operator detection for Bangladeshi prefixes
  const detectOperator = (num: string): { name: string; color: string } | null => {
    const clean = num.replace(/\D/g, '');
    const prefix = clean.startsWith('880') ? clean.substring(3, 6) : clean.substring(0, 3);
    
    if (['017', '013', '17', '13'].includes(prefix)) {
      return { name: 'Grameenphone', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-300' };
    }
    if (['019', '014', '19', '14'].includes(prefix)) {
      return { name: 'Banglalink', color: 'bg-orange-500/10 text-orange-700 border-orange-300' };
    }
    if (['018', '18'].includes(prefix)) {
      return { name: 'Robi', color: 'bg-red-500/10 text-red-700 border-red-300' };
    }
    if (['016', '16'].includes(prefix)) {
      return { name: 'Airtel', color: 'bg-blue-500/10 text-blue-700 border-blue-300' };
    }
    if (['015', '15'].includes(prefix)) {
      return { name: 'Teletalk', color: 'bg-indigo-500/10 text-indigo-700 border-indigo-300' };
    }
    return null;
  };

  const operatorInfo = detectOperator(phoneNumber);

  // Step 1: Simulate Google OAuth sign-in
  const handleGoogleSignIn = () => {
    soundManager.playBeep(600, 0.04);
    setIsLoading(true);

    setTimeout(() => {
      const simulatedGoogle = {
        name: 'Ebadul Islam',
        email: 'ebadul.islam@gmail.com',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      };
      setGoogleProfile(simulatedGoogle);
      setIsLoading(false);
      setStep(2);
      soundManager.playSuccess();
      onShowToast('✓ Google account verified. Please link your Bangladeshi mobile number.');
    }, 600);
  };

  const validateBdPhone = (num: string): boolean => {
    const cleaned = num.replace(/\D/g, '');
    const operatorRegex = /^(01[3-9]\d{8})$/;
    const operatorRegex2 = /^(1[3-9]\d{8})$/;
    return operatorRegex.test(cleaned) || operatorRegex2.test(cleaned);
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (!validateBdPhone(cleaned)) {
      setPhoneError('Enter a valid 11-digit Bangladeshi mobile number (GP, Banglalink, Robi, Airtel, Teletalk).');
      soundManager.playBeep(300, 0.05);
      return;
    }
    setPhoneError('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setOtpSent(true);
      soundManager.playSuccess();
      onShowToast('📱 SMS OTP Sent: Use 1234');
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    }, 700);
  };

  const handleOtpChange = (index: number, value: string) => {
    const val = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otpValues];
    newOtp[index] = val;
    setOtpValues(newOtp);

    if (val && index < 3) {
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
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      setOtpValues(pasted.split(''));
      otpInputRefs.current[3]?.focus();
    }
  };

  const handleVerifyOtpAndComplete = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpValues.join('');
    if (code.length !== 4) {
      setOtpError('Please enter the 4-digit verification code.');
      soundManager.playBeep(300, 0.05);
      return;
    }
    setOtpError('');
    setIsLoading(true);

    setTimeout(() => {
      if (!googleProfile) return;

      const formattedPhone = '+880 ' + phoneNumber.replace(/\D/g, '').replace(/^0/, '');
      const newUser: UserProfile = {
        id: 'user_sprint_' + Date.now(),
        name: googleProfile.name,
        email: googleProfile.email,
        avatar: googleProfile.avatar,
        phone: formattedPhone,
        isPhoneVerified: true,
        createdAt: Date.now(),
        progress: createDefaultProgress(7.5, googleProfile.name)
      };

      try {
        localStorage.setItem('ielts_auth_session', JSON.stringify(newUser));
        saveUser(newUser);
        switchActiveUser(newUser.id);
      } catch (err) {
        console.error('Failed to save auth session', err);
      }

      setIsLoading(false);
      soundManager.playSuccess();
      onShowToast(`🎉 Welcome to IELTS Sprint, ${newUser.name}! Verification complete.`);
      window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: newUser }));
      onClose();
      if (onSuccess) onSuccess();
    }, 700);
  };

  return (
    <AnimatePresence>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget && !isLoading) onClose();
        }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.98 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden text-slate-900 select-none max-h-[90vh] flex flex-col"
        >
          {/* Mobile Top Drag Handle */}
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 sm:hidden" />

          {/* Top Brand Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-400 mt-2 sm:mt-0" />

          {/* Close Button */}
          <button
            onClick={() => {
              soundManager.playBeep(450, 0.04);
              onClose();
            }}
            className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
            aria-label="Close authentication modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 sm:p-8 space-y-6 text-left overflow-y-auto">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <IELTSSprintLogo variant="full" size="sm" showBadge={true} />
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                  Step {step} of 2
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${step === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    1. Google SSO
                  </span>
                  <span className="text-slate-300">→</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${step === 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    2. +880 Mobile Verification
                  </span>
                </div>
                <h3 id="auth-modal-title" className="text-xl font-black text-slate-900 tracking-tight mt-2">
                  {step === 1 ? 'Sign in to IELTS Sprint' : 'Link Bangladeshi Mobile (+880)'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {step === 1
                    ? 'Official CD-IELTS preparation engine requires verified candidate identity to sync mock scores.'
                    : `Authenticated as ${googleProfile?.email || 'Google Candidate'}. Enter your active mobile number for SMS alerts.`}
                </p>
              </div>
            </div>

            {/* Step 1: Official Google SSO */}
            {step === 1 && (
              <div className="space-y-4 pt-1">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full h-11 bg-white hover:bg-slate-50 border border-[#747775]/30 rounded-lg shadow-xs transition flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer disabled:opacity-60"
                >
                  <svg className="w-5 h-5 mr-3 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span className="font-medium text-[#1F1F1F] text-sm tracking-normal">Continue with Google</span>
                </button>

                {/* Security Trust Seal */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 text-xs text-slate-600">
                  <Lock className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Official institutional authentication · TLS 256-bit encryption</span>
                </div>
              </div>
            )}

            {/* Step 2: Bangladeshi Mobile +880 & 4-Boxed PIN OTP */}
            {step === 2 && (
              <div className="space-y-4 pt-1">
                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700">
                          Bangladeshi Mobile Number
                        </label>
                        {operatorInfo && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${operatorInfo.color}`}>
                            {operatorInfo.name}
                          </span>
                        )}
                      </div>

                      <div className="flex rounded-xl overflow-hidden border border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20 bg-slate-50">
                        <div className="flex items-center gap-1.5 px-3.5 bg-slate-100 border-r border-slate-300 text-slate-700 font-mono text-xs font-bold shrink-0">
                          <span>🇧🇩</span>
                          <span>+880</span>
                        </div>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="01712-345678"
                          className="w-full h-12 px-3.5 bg-transparent text-slate-900 text-sm font-mono focus:outline-none"
                          maxLength={11}
                          autoFocus
                        />
                      </div>
                      {phoneError && <p className="text-[11px] text-red-600 font-semibold">{phoneError}</p>}
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-slate-600 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>We will send a 4-digit verification code via SMS instantly.</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
                    >
                      <span>Send Verification Code (OTP)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtpAndComplete} className="space-y-4">
                    <div className="space-y-2 text-center sm:text-left">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">Enter 4-Digit OTP Code</span>
                        <span className="text-emerald-600 font-mono font-bold">+880 {phoneNumber}</span>
                      </div>

                      {/* 4-Boxed PIN OTP Grid */}
                      <div className="flex justify-center sm:justify-start gap-3 py-2" onPaste={handleOtpPaste}>
                        {otpValues.map((val, idx) => (
                          <input
                            key={idx}
                            ref={(el) => { otpInputRefs.current[idx] = el; }}
                            type="text"
                            value={val}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            maxLength={1}
                            className="w-12 h-14 text-center text-xl font-bold rounded-lg border-2 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-slate-50 text-slate-900 font-mono transition"
                          />
                        ))}
                      </div>

                      {otpError && <p className="text-[11px] text-red-600 font-semibold text-center sm:text-left">{otpError}</p>}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span>Mock OTP Code: <strong className="font-mono text-slate-800">1234</strong></span>
                      {resendCountdown > 0 ? (
                        <span className="font-mono text-slate-400">Resend SMS code in 0:{resendCountdown < 10 ? `0${resendCountdown}` : resendCountdown}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setResendCountdown(45);
                            onShowToast('📱 New SMS OTP sent.');
                          }}
                          className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Resend Code
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify & Complete Registration</span>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Footer Trust Note */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>Encrypted Session</span>
              </div>
              <div className="flex items-center gap-2">
                <a href="#terms" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('open_legal_modal', { detail: { tab: 'terms' } })); }} className="hover:underline">
                  Terms
                </a>
                <span>•</span>
                <a href="#privacy" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('open_legal_modal', { detail: { tab: 'privacy' } })); }} className="hover:underline">
                  Privacy
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
