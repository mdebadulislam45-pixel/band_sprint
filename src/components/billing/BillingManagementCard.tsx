import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ShieldCheck,
  Crown,
  Sparkles,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowUpRight
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import {
  fetchSubscriptionStatus,
  cancelSubscription,
  SubscriptionStatusResponse
} from '../../services/billingService';

interface BillingManagementCardProps {
  onOpenUpgradeModal: () => void;
  onShowToast: (msg: string) => void;
}

export const BillingManagementCard: React.FC<BillingManagementCardProps> = ({
  onOpenUpgradeModal,
  onShowToast
}) => {
  const [data, setData] = useState<SubscriptionStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  const loadStatus = async () => {
    setIsLoading(true);
    const res = await fetchSubscriptionStatus();
    setData(res);
    setIsLoading(false);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleCancel = async () => {
    soundManager.playBeep(400, 0.08);
    setIsCancelling(true);
    const res = await cancelSubscription();
    setIsCancelling(false);
    setShowConfirmCancel(false);

    if (res.success) {
      soundManager.playSuccess();
      onShowToast(res.message || 'Subscription will not renew at the end of the current period.');
      loadStatus();
    } else {
      soundManager.playBeep(350, 0.1);
      onShowToast(res.error || 'Failed to cancel subscription.');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        <span>Loading subscription status...</span>
      </div>
    );
  }

  const sub = data?.subscription;
  const plan = data?.plan;
  const isPaid = sub && (sub.planId === 'pro' || sub.planId === 'master') && sub.status === 'active';
  const periodEndDate = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : null;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
            isPaid
              ? sub?.planId === 'master'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-blue-100 text-blue-700'
              : 'bg-slate-100 text-slate-600'
          }`}>
            {sub?.planId === 'master' ? (
              <Crown className="w-5 h-5" />
            ) : isPaid ? (
              <Sparkles className="w-5 h-5" />
            ) : (
              <CreditCard className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900">
                {plan?.name || 'Candidate Starter (Free)'}
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                isPaid
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {sub?.status === 'active' ? 'Active' : sub?.status || 'Free'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {plan?.tagline || 'Essential practice for IELTS candidates'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(600, 0.04);
              onOpenUpgradeModal();
            }}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>{isPaid ? 'Change Plan' : 'Upgrade to Pro'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Details & Entitlements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
          <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Billing Cycle</div>
          <div className="font-semibold text-slate-800">
            {isPaid ? (periodEndDate ? `Renews / Active until ${periodEndDate}` : 'Active Paid Tier') : 'Free Tier (No charges)'}
          </div>
          {sub?.cancelAtPeriodEnd && (
            <div className="text-[11px] text-amber-600 font-medium">
              ⚠ Scheduled to cancel at end of current period.
            </div>
          )}
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
          <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Entitlements</div>
          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {isPaid
                ? sub?.planId === 'master'
                  ? 'Unlimited AI Voice Examiner + Full Mocks'
                  : 'AI Voice Examiner + Instant Scoring'
                : 'Standard Practice Banks & Diagnostic'}
            </span>
          </div>
        </div>
      </div>

      {/* Cancellation option for active paid accounts */}
      {isPaid && !sub?.cancelAtPeriodEnd && (
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-400">Need to cancel your subscription?</span>
          {!showConfirmCancel ? (
            <button
              type="button"
              onClick={() => setShowConfirmCancel(true)}
              className="text-slate-500 hover:text-rose-600 text-xs font-semibold underline cursor-pointer"
            >
              Cancel Subscription
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-rose-600 font-semibold">Are you sure?</span>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleCancel}
                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-500"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmCancel(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium text-[11px]"
              >
                Keep Plan
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
