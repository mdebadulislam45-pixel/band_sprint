import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  Crown,
  Headphones,
  PenTool,
  Mic,
  Award,
  Zap,
  Clock,
  Tag,
  Check,
  Gift
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { useTheme } from '../../context/ThemeContext';
import {
  fetchPlans,
  startCheckout,
  startFreeTrial,
  redeemPromoCode,
  fetchTrialStatus,
  fetchSubscriptionStatus,
  createBkashOrder,
  fetchBkashStatus,
  BkashMerchantStatusResponse,
  ClientPlan,
  getCachedSubscription
} from '../../services/billingService';

interface PremiumPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
  onSubscribeSuccess?: () => void;
}

export const PremiumPricingModal: React.FC<PremiumPricingModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onSubscribeSuccess
}) => {
  const { resolvedTheme } = useTheme();
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [plans, setPlans] = useState<Record<string, ClientPlan>>({});
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [isRedeemingPromo, setIsRedeemingPromo] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [showPromoField, setShowPromoField] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [trialStatus, setTrialStatus] = useState<{
    eligible: boolean;
    isTrialing: boolean;
    trialUsed: boolean;
    trialStart?: number | null;
    trialEnd?: number | null;
    hoursRemaining: number;
  } | null>(null);

  const [bkashStatus, setBkashStatus] = useState<BkashMerchantStatusResponse | null>(null);
  const [isBkashLoading, setIsBkashLoading] = useState(false);

  const [currentSub, setCurrentSub] = useState(() => getCachedSubscription());

  const isCurrentlyPremium =
    (currentSub?.status === 'active' || currentSub?.status === 'trialing') &&
    (currentSub.planId === 'pro' || currentSub.planId === 'master');

  const isTrialing = currentSub?.status === 'trialing';

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      fetchPlans().then((res) => {
        setPlans(res.plans);
        setStripeConfigured(res.stripeConfigured);
      });
      fetchTrialStatus().then((ts) => {
        if (ts) setTrialStatus(ts);
      });
      fetchBkashStatus().then((bs) => {
        if (bs) setBkashStatus(bs);
      });
      fetchSubscriptionStatus().then((subRes) => {
        if (subRes?.subscription) {
          setCurrentSub(subRes.subscription);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBkashCheckout = async () => {
    soundManager.playBeep(650, 0.05);
    setIsBkashLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await createBkashOrder('pro', billingInterval);
    setIsBkashLoading(false);

    if (result.success && result.bkashURL) {
      soundManager.playSuccess();
      window.location.href = result.bkashURL;
    } else if (result.pendingApproval) {
      soundManager.playBeep(450, 0.05);
      setErrorMsg(
        'bKash Business application submitted. Live bKash checkout will be activated upon merchant approval. In the meantime, please enjoy your 3-Day Free Trial or redeem an access voucher.'
      );
      onShowToast?.('bKash Business verification pending. Try 3-day free trial or voucher.');
    } else {
      soundManager.playBeep(350, 0.1);
      setErrorMsg(result.error || 'Failed to initiate bKash order.');
      onShowToast?.(result.error || 'bKash order initiation failed.');
    }
  };

  const handleStartTrial = async () => {
    soundManager.playBeep(650, 0.05);
    setIsStartingTrial(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await startFreeTrial();
    setIsStartingTrial(false);

    if (result.success && result.subscription) {
      soundManager.playSuccess();
      setCurrentSub(result.subscription);
      setSuccessMsg('3-Day Free Trial activated! Full Sprint Premium unlocked.');
      onShowToast?.('3-Day Free Trial activated! Enjoy 72 hours of Sprint Premium.');
      onSubscribeSuccess?.();
      // Refresh trial status
      const updatedTS = await fetchTrialStatus();
      if (updatedTS) setTrialStatus(updatedTS);
    } else {
      soundManager.playBeep(350, 0.1);
      const msg = result.error || 'Failed to start free trial.';
      setErrorMsg(msg);
      onShowToast?.(msg);
    }
  };

  const handleRedeemPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCodeInput.trim()) return;

    soundManager.playBeep(600, 0.04);
    setIsRedeemingPromo(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await redeemPromoCode(promoCodeInput.trim());
    setIsRedeemingPromo(false);

    if (result.success && result.subscription) {
      soundManager.playSuccess();
      setCurrentSub(result.subscription);
      setPromoCodeInput('');
      const msg = result.message || 'Promotional code redeemed successfully!';
      setSuccessMsg(msg);
      onShowToast?.(msg);
      onSubscribeSuccess?.();
    } else {
      soundManager.playBeep(350, 0.1);
      const msg = result.error || 'Failed to redeem promotional code.';
      setErrorMsg(msg);
      onShowToast?.(msg);
    }
  };

  const handleSubscribe = async () => {
    soundManager.playBeep(650, 0.05);
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await startCheckout('pro', billingInterval);
    setIsLoading(false);

    if (result.success) {
      soundManager.playSuccess();
      onShowToast?.('Checkout initiated successfully.');
      onSubscribeSuccess?.();
    } else {
      soundManager.playBeep(350, 0.1);
      const msg = result.error || 'Payment gateway setup pending. Premium checkout will open when merchant keys are active.';
      setErrorMsg(msg);
      onShowToast?.(msg);
    }
  };

  const premiumFeatures = [
    {
      icon: Mic,
      title: '1-on-1 Interactive AI Voice Examiner',
      description: 'Realistic oral interview simulation with certified British male voices & pitch-locked formant DSP.'
    },
    {
      icon: Headphones,
      title: 'Unlimited Speaking Diagnostics',
      description: 'Instant fluency, grammatical fault breakdown, and IPA pronunciation coach on every turn.'
    },
    {
      icon: PenTool,
      title: 'Task 1 & Task 2 Writing AI Evaluator',
      description: 'Deep Cambridge criteria scoring across Task Response, Coherence, Lexical Resource, and GRA.'
    },
    {
      icon: Award,
      title: 'Band 9 Model Answer Vaults',
      description: 'Full official model answers with highlighted C1/C2 vocabulary collocations and examiner rationale.'
    },
    {
      icon: Zap,
      title: 'Spaced Repetition Mistake Vault',
      description: 'Automatic error capture and customized spaced repetition flashcard drills.'
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-2xl bg-white dark:bg-[#0B1224] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-white my-6 max-h-[92vh] flex flex-col"
        >
          {/* Top Decorative Gradient Accent */}
          <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500" />

          {/* Close Button */}
          <button
            onClick={() => {
              soundManager.playBeep(450, 0.04);
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition z-10 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Main Scrollable Body */}
          <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
            {/* Header Badge & Title */}
            <div className="text-center space-y-2 max-w-lg mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold font-mono">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <span>IELTS SPRINT PREMIUM</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                Accelerate Your Target Band 8.0+
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Full access to Cambridge AI Voice Examiner, unlimited speaking/writing diagnostics, and Band 9 model answer vaults.
              </p>
            </div>

            {/* Trial Active Banner */}
            {isTrialing && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-blue-500/15 to-indigo-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs block">3-Day Free Trial Active</span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      {trialStatus?.hoursRemaining
                        ? `Approximately ${trialStatus.hoursRemaining} hour(s) remaining in your trial.`
                        : 'Your free trial is currently active with full Sprint Premium access.'}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider shrink-0">
                  Active
                </span>
              </div>
            )}

            {/* Price Highlight Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 text-white shadow-xl border border-blue-800/60 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-300">
                      Monthly Sprint Pass
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                      Best Value
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {billingInterval === 'yearly' ? '৳1,500' : '৳150'}
                    </span>
                    <span className="text-xs text-blue-200 font-mono">
                      {billingInterval === 'yearly' ? '/ year (৳125/mo)' : '/ month'}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-200/80 mt-1">
                    Complete BDT currency pricing with no hidden charges.
                  </p>
                </div>

                {/* Interval Toggle Button */}
                <div className="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-700 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setBillingInterval('monthly');
                      soundManager.playBeep(550, 0.03);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      billingInterval === 'monthly'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Monthly (৳150)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBillingInterval('yearly');
                      soundManager.playBeep(650, 0.03);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      billingInterval === 'yearly'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Annual (৳1,500)
                  </button>
                </div>
              </div>
            </div>

            {/* 3-Day Free Trial Callout (If eligible and not currently trialing or subscribed) */}
            {!isCurrentlyPremium && (!trialStatus || trialStatus.eligible) && (
              <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border-2 border-dashed border-blue-300 dark:border-blue-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold font-mono uppercase tracking-wider text-blue-800 dark:text-blue-300">
                      3-Day Free Trial Available
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Try full AI Voice Examiner, unlimited evaluations & Band 9 model answers free for 72 hours.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isStartingTrial}
                  onClick={handleStartTrial}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isStartingTrial ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Activating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Start 3-Day Free Trial</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Success Notification */}
            {successMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">Success</span>
                  <span className="text-[11px] leading-relaxed block">{successMsg}</span>
                </div>
              </div>
            )}

            {/* Error Notification */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">Notice</span>
                  <span className="text-[11px] leading-relaxed block">{errorMsg}</span>
                </div>
              </div>
            )}

            {/* Verified Premium Benefits List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                Verified Premium Features Included
              </h3>

              <div className="grid grid-cols-1 gap-2.5">
                {premiumFeatures.map((feat, index) => {
                  const IconComp = feat.icon;
                  return (
                    <div
                      key={index}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3 transition hover:border-blue-400 dark:hover:border-blue-500"
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{feat.title}</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                          {feat.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Promo Code Redemption Section */}
            <div className="pt-1">
              {!showPromoField ? (
                <button
                  type="button"
                  onClick={() => setShowPromoField(true)}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Have a promo code or campus voucher?</span>
                </button>
              ) : (
                <form
                  onSubmit={handleRedeemPromo}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-blue-500" />
                      <span>Redeem Promotional Code</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPromoField(false)}
                      className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Hide
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. SPRINT7, BAND8PLUS"
                      className="flex-1 px-3 py-2 text-xs font-mono font-bold tracking-wider rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    />
                    <button
                      type="submit"
                      disabled={isRedeemingPromo || !promoCodeInput.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      {isRedeemingPromo ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>Apply</span>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Enter your voucher code to unlock complimentary access. Single-use per account.
                  </p>
                </form>
              )}
            </div>

            {/* bKash Payment Gateway Preparation Card */}
            <div className="p-4 rounded-2xl bg-[#E2136E]/10 dark:bg-[#E2136E]/15 border border-[#E2136E]/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#E2136E] text-white font-black text-xs flex items-center justify-center">
                    ৳
                  </span>
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                    bKash Direct Gateway (৳150 BDT)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#E2136E]/20 text-[#E2136E] dark:text-pink-300 text-[10px] font-mono font-bold">
                  {bkashStatus?.isConfigured ? 'Ready' : 'Merchant Pending'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Official bKash Business integration architecture is prepared. Direct checkout will unlock once merchant credentials are verified.
              </p>
              <button
                type="button"
                disabled={isBkashLoading}
                onClick={handleBkashCheckout}
                className="w-full py-2.5 px-4 rounded-xl bg-[#E2136E] hover:bg-[#C10E5C] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isBkashLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Checking Order...</span>
                  </>
                ) : (
                  <>
                    <span>Pay with bKash — ৳150</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Primary Action Button (Placeholder 'Subscribe' Button) */}
            <div className="pt-2 space-y-3">
              {isCurrentlyPremium && !isTrialing ? (
                <div className="w-full py-3.5 px-5 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center border border-emerald-500/30 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>You are currently subscribed to Sprint Premium</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSubscribe}
                  className="w-full min-h-[50px] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 hover:from-blue-500 hover:to-amber-400 text-white font-black text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span>Subscribe Now — ৳150 / Month</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

              {/* Trust Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>256-bit Encrypted Checkout</span>
                </span>
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Cancel Anytime</span>
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
