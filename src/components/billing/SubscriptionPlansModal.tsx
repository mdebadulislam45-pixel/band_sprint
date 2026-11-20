import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  CreditCard,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  Crown
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import {
  fetchPlans,
  startCheckout,
  ClientPlan,
  getCachedSubscription
} from '../../services/billingService';

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const SubscriptionPlansModal: React.FC<SubscriptionPlansModalProps> = ({
  isOpen,
  onClose,
  onShowToast
}) => {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [plans, setPlans] = useState<Record<string, ClientPlan>>({});
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeSubscription = getCachedSubscription();
  const currentPlanId = activeSubscription?.status === 'active' ? activeSubscription.planId : 'free';

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      fetchPlans().then((res) => {
        setPlans(res.plans);
        setStripeConfigured(res.stripeConfigured);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectUpgrade = async (planId: 'pro' | 'master') => {
    soundManager.playBeep(650, 0.05);
    setLoadingPlan(planId);
    setErrorMsg(null);

    const result = await startCheckout(planId, billingInterval);
    setLoadingPlan(null);

    if (!result.success) {
      soundManager.playBeep(350, 0.1);
      setErrorMsg(result.error || 'Failed to initialize checkout.');
      onShowToast(result.error || 'Checkout initialization failed.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-white my-8 max-h-[92vh] flex flex-col"
        >
          {/* Top Brand Accent Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-500" />

          {/* Close button */}
          <button
            onClick={() => {
              soundManager.playBeep(450, 0.04);
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition z-10"
            aria-label="Close subscription plans"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Scrollable Container */}
          <div className="p-5 sm:p-8 overflow-y-auto space-y-6">
            {/* Header */}
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-bold">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Practice Band 8.0+ Academic Upgrade</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Unlock Full AI Voice Examiner & Band 9 Suite
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Choose the preparation tier designed for your target band and university requirements. Transparent pricing with zero hidden fees.
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 max-w-2xl mx-auto">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold block">Checkout Notification</span>
                  <span className="text-[11px] leading-relaxed block text-rose-200">{errorMsg}</span>
                </div>
              </div>
            )}

            {/* Billing Interval Toggle */}
            <div className="flex items-center justify-center pt-1">
              <div className="flex items-center p-1 bg-slate-950 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setBillingInterval('monthly');
                    soundManager.playBeep(550, 0.03);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    billingInterval === 'monthly'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBillingInterval('yearly');
                    soundManager.playBeep(650, 0.03);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    billingInterval === 'yearly'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Annual Billing</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold">
                    Save 35%
                  </span>
                </button>
              </div>
            </div>

            {/* Plan Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Plan 1: Free Starter */}
              <div className={`p-5 rounded-3xl border flex flex-col justify-between transition ${
                currentPlanId === 'free'
                  ? 'bg-slate-950/60 border-slate-700'
                  : 'bg-slate-950/40 border-slate-800'
              }`}>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Candidate Free</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Essential self-paced study</p>
                  </div>
                  <div className="pt-2">
                    <span className="text-3xl font-black text-white">৳0</span>
                    <span className="text-xs text-slate-500"> / forever</span>
                  </div>
                  <div className="border-t border-slate-800 pt-3 space-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Reading & Listening Question Banks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Beginner 101 Diagnostic Module</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Spelling Lab & Flashcards</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>2 Free AI Speaking & 1 Writing/day</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <div className="w-full py-2.5 px-4 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold text-center">
                    {currentPlanId === 'free' ? 'Current Active Plan' : 'Free Tier'}
                  </div>
                </div>
              </div>

              {/* Plan 2: Sprint Premium (Featured) */}
              <div className="relative p-5 rounded-3xl border-2 border-blue-500 bg-gradient-to-b from-blue-950/50 via-slate-900 to-indigo-950/40 flex flex-col justify-between shadow-xl shadow-blue-500/10">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-mono text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  Most Popular · Band 7.5+
                </div>

                <div className="space-y-4 pt-1">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-1.5">
                      <span>Sprint Premium</span>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </h3>
                    <p className="text-[11px] text-blue-200 mt-0.5">High-yield AI voice examiner</p>
                  </div>
                  <div className="pt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">
                        {billingInterval === 'yearly' ? '৳1,500' : '৳150'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {billingInterval === 'yearly' ? '/ year (৳125/mo)' : '/ month'}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-blue-500/20 pt-3 space-y-2 text-xs text-slate-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <strong className="font-semibold">Interactive 1-on-1 Voice Examiner</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>Unlimited Fluency & Grammar Diagnostics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>Task 1 & Task 2 Writing AI Scoring</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>Band 9 Practice Model Answers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>Mistake Vault with Spaced Repetition</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  {currentPlanId === 'pro' ? (
                    <div className="w-full py-2.5 px-4 rounded-xl bg-blue-500/20 text-blue-300 text-xs font-bold text-center border border-blue-500/40">
                      ✓ Current Active Plan
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={loadingPlan === 'pro'}
                      onClick={() => handleSelectUpgrade('pro')}
                      className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer disabled:opacity-60"
                    >
                      {loadingPlan === 'pro' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Initiating Checkout...</span>
                        </>
                      ) : (
                        <>
                          <span>Upgrade to Sprint Premium (৳150/mo)</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Plan 3: Sprint Master & Intensive */}
              <div className="p-5 rounded-3xl border border-amber-500/40 bg-gradient-to-b from-amber-950/20 via-slate-900 to-slate-950 flex flex-col justify-between shadow-lg">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-black text-amber-300 flex items-center gap-1.5">
                      <span>Sprint Master</span>
                      <Crown className="w-4 h-4 text-amber-400" />
                    </h3>
                    <p className="text-[11px] text-amber-200/70 mt-0.5">Full timed live mock exams</p>
                  </div>
                  <div className="pt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">
                        {billingInterval === 'yearly' ? '৳3,000' : '৳300'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {billingInterval === 'yearly' ? '/ year' : '/ month'}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-amber-500/20 pt-3 space-y-2 text-xs text-slate-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <strong className="font-semibold">Everything included in Premium</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Full Timed Practice Live Mock Tests</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Detailed Criteria Breakdown (FC, LR, GRA, PR)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Priority High-Fidelity Audio Delivery</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Practice Band 8.5+ Verified Certificate</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  {currentPlanId === 'master' ? (
                    <div className="w-full py-2.5 px-4 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-bold text-center border border-amber-500/40">
                      ✓ Current Active Plan
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={loadingPlan === 'master'}
                      onClick={() => handleSelectUpgrade('master')}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer disabled:opacity-60"
                    >
                      {loadingPlan === 'master' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Initiating Checkout...</span>
                        </>
                      ) : (
                        <>
                          <span>Upgrade to Master (৳300/mo)</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Trust Footer */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Stripe 256-bit Encrypted</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Cancel Anytime in 1-Click</span>
                </span>
              </div>
              <span>BandSprint Candidate Entitlements</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
