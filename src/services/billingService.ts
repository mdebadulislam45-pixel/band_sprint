import { getStoredSessionToken, ACTIVE_SUBSCRIPTION_KEY, ServerSubscriptionInfo } from './authService';

export interface PlanLimits {
  speakingEvaluationsPerDay: number;
  writingEvaluationsPerDay: number;
  mockExamsPerMonth: number;
  aiVoiceExaminer: boolean;
  band9ModelAnswers: boolean;
  personalizedExaminerFeedback: boolean;
}

export interface ClientPlan {
  id: 'free' | 'pro' | 'master';
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
  limits: PlanLimits;
}

export interface SubscriptionStatusResponse {
  subscription: ServerSubscriptionInfo;
  plan: ClientPlan;
  entitlements: {
    isPro: boolean;
    isMaster: boolean;
    status: string;
    limits: PlanLimits;
  };
}

/**
 * Fetch available subscription plans from server
 */
export async function fetchPlans(): Promise<{ plans: Record<string, ClientPlan>; stripeConfigured: boolean }> {
  try {
    const res = await fetch('/api/billing/plans');
    if (!res.ok) throw new Error('Failed to load plans');
    return await res.json();
  } catch (err) {
    console.warn('[billingService] Using default plans cache:', err);
    return {
      plans: {
        free: {
          id: 'free',
          name: 'Candidate Free',
          tagline: 'Essential practice for self-paced IELTS learners',
          priceMonthly: 0,
          priceYearly: 0,
          currency: 'BDT',
          features: [
            'Standard Listening & Reading Question Banks',
            'Beginner 101 Diagnostic & Study Modules',
            'Spelling Lab & Vocabulary Flashcards',
            'Basic Band Estimator Calculator',
            '2 Free AI Speaking Evaluations per day',
            '1 Free AI Writing Evaluation per day'
          ],
          limits: {
            speakingEvaluationsPerDay: 2,
            writingEvaluationsPerDay: 1,
            mockExamsPerMonth: 1,
            aiVoiceExaminer: false,
            band9ModelAnswers: false,
            personalizedExaminerFeedback: false
          }
        },
        pro: {
          id: 'pro',
          name: 'Sprint Premium',
          tagline: 'Interactive 1-on-1 AI voice examiner & unlimited Cambridge evaluations',
          priceMonthly: 150,
          priceYearly: 1500,
          currency: 'BDT',
          features: [
            'Interactive 1-on-1 Voice Examiner (British Male Voices)',
            'Unlimited Speaking Fluency & Grammar Diagnostics',
            'Task 1 & Task 2 Writing Band Evaluator',
            'Band 9 Official Cambridge Model Answers',
            'Comprehensive Mistake Vault with Spaced Repetition'
          ],
          limits: {
            speakingEvaluationsPerDay: 100,
            writingEvaluationsPerDay: 50,
            mockExamsPerMonth: 10,
            aiVoiceExaminer: true,
            band9ModelAnswers: true,
            personalizedExaminerFeedback: false
          }
        },
        master: {
          id: 'master',
          name: 'Sprint Master & Intensive',
          tagline: 'Guaranteed Band 8.0+ preparation with live mock exams',
          priceMonthly: 300,
          priceYearly: 3000,
          currency: 'BDT',
          features: [
            'Everything included in Sprint Premium',
            'Full Timed Live Mock Test Simulations',
            'Deep AI Examiner Diagnostic Breakdown across all 4 Criteria',
            'Priority High-Fidelity Audio Streaming',
            'Verified Cambridge Band Certificate of Completion'
          ],
          limits: {
            speakingEvaluationsPerDay: 9999,
            writingEvaluationsPerDay: 9999,
            mockExamsPerMonth: 9999,
            aiVoiceExaminer: true,
            band9ModelAnswers: true,
            personalizedExaminerFeedback: true
          }
        }
      },
      stripeConfigured: false
    };
  }
}

/**
 * Initiates checkout on the server
 */
export async function startCheckout(
  planId: 'pro' | 'master',
  billingInterval: 'monthly' | 'yearly' = 'monthly'
): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> {
  const token = getStoredSessionToken();
  if (!token) {
    return {
      success: false,
      error: 'Please log in or register before upgrading your subscription.'
    };
  }

  try {
    const res = await fetch('/api/billing/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ planId, billingInterval })
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Failed to initialize checkout session.'
      };
    }

    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return { success: true, checkoutUrl: data.checkoutUrl };
    }

    return {
      success: false,
      error: 'Server did not return a valid checkout redirect URL.'
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network failure while creating checkout session.'
    };
  }
}

/**
 * Fetches verified subscription status from the server
 */
export async function fetchSubscriptionStatus(): Promise<SubscriptionStatusResponse | null> {
  const token = getStoredSessionToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/billing/subscription-status', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return null;
    const data: SubscriptionStatusResponse = await res.json();

    if (typeof localStorage !== 'undefined' && data.subscription) {
      localStorage.setItem(ACTIVE_SUBSCRIPTION_KEY, JSON.stringify(data.subscription));
    }

    return data;
  } catch (err) {
    console.warn('[billingService] Failed to fetch subscription status:', err);
    return null;
  }
}

/**
 * Cancels active subscription at end of period
 */
export async function cancelSubscription(): Promise<{ success: boolean; message?: string; error?: string }> {
  const token = getStoredSessionToken();
  if (!token) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const res = await fetch('/api/billing/cancel-subscription', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to cancel subscription.' };
    }

    if (data.subscription && typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_SUBSCRIPTION_KEY, JSON.stringify(data.subscription));
    }

    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error during subscription cancellation.' };
  }
}

/**
 * Checks cached entitlement status
 */
export function getCachedSubscription(): ServerSubscriptionInfo | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVE_SUBSCRIPTION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isProOrMaster(): boolean {
  const sub = getCachedSubscription();
  if (!sub) return false;
  return (sub.planId === 'pro' || sub.planId === 'master') && (sub.status === 'active' || sub.status === 'trialing');
}

export function isMasterTier(): boolean {
  const sub = getCachedSubscription();
  if (!sub) return false;
  return sub.planId === 'master' && (sub.status === 'active' || sub.status === 'trialing');
}

/**
 * Activates the 3-day (72 hours) Free Trial on the server
 */
export async function startFreeTrial(): Promise<{
  success: boolean;
  subscription?: ServerSubscriptionInfo;
  message?: string;
  error?: string;
}> {
  const token = getStoredSessionToken();
  if (!token) {
    return {
      success: false,
      error: 'Please sign in or create an account to start your 3-day free trial.'
    };
  }

  try {
    const res = await fetch('/api/subscription/start-trial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Failed to start free trial.'
      };
    }

    if (data.subscription && typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_SUBSCRIPTION_KEY, JSON.stringify(data.subscription));
    }

    return {
      success: true,
      subscription: data.subscription,
      message: data.message
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error while initiating 3-day free trial.'
    };
  }
}

/**
 * Retrieves candidate's trial status and remaining hours from server
 */
export async function fetchTrialStatus(): Promise<{
  eligible: boolean;
  isTrialing: boolean;
  trialUsed: boolean;
  trialStart?: number | null;
  trialEnd?: number | null;
  hoursRemaining: number;
} | null> {
  const token = getStoredSessionToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/subscription/trial-status', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[billingService] Failed to fetch trial status:', err);
    return null;
  }
}

/**
 * Redeems a promotional code on the server
 */
export async function redeemPromoCode(code: string): Promise<{
  success: boolean;
  subscription?: ServerSubscriptionInfo;
  message?: string;
  error?: string;
}> {
  const token = getStoredSessionToken();
  if (!token) {
    return {
      success: false,
      error: 'Please sign in or create an account to redeem promotional codes.'
    };
  }

  try {
    const res = await fetch('/api/subscription/redeem-promo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ code })
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Failed to redeem promotional code.'
      };
    }

    if (data.subscription && typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_SUBSCRIPTION_KEY, JSON.stringify(data.subscription));
    }

    return {
      success: true,
      subscription: data.subscription,
      message: data.message
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error while redeeming promotional code.'
    };
  }
}

/**
 * Fetches redemption history for the current candidate
 */
export async function fetchPromoHistory(): Promise<{
  redemptions: Array<{
    code: string;
    redeemedAt: number;
    expiresAt: number;
    planId: 'pro' | 'master';
    durationDays: number;
  }>;
}> {
  const token = getStoredSessionToken();
  if (!token) return { redemptions: [] };

  try {
    const res = await fetch('/api/subscription/promo-history', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return { redemptions: [] };
    return await res.json();
  } catch {
    return { redemptions: [] };
  }
}

export interface BkashMerchantStatusResponse {
  isConfigured: boolean;
  isSandbox: boolean;
  merchantApprovalStatus: 'pending_approval' | 'ready';
  message: string;
}

/**
 * Checks bKash Merchant approval and gateway configuration status
 */
export async function fetchBkashStatus(): Promise<BkashMerchantStatusResponse | null> {
  try {
    const res = await fetch('/api/payment/bkash/status');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[billingService] Failed to fetch bKash merchant status:', err);
    return null;
  }
}

/**
 * Creates a server-controlled pending order for bKash payment
 */
export async function createBkashOrder(
  planId: 'pro' | 'master' = 'pro',
  billingInterval: 'monthly' | 'yearly' = 'monthly'
): Promise<{
  success: boolean;
  pendingApproval?: boolean;
  order?: any;
  paymentId?: string;
  bkashURL?: string;
  message?: string;
  error?: string;
}> {
  const token = getStoredSessionToken();
  if (!token) {
    return {
      success: false,
      error: 'Please sign in or register before initiating bKash payment.'
    };
  }

  try {
    const res = await fetch('/api/payment/bkash/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ planId, billingInterval })
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network exception while creating bKash payment order.'
    };
  }
}

/**
 * Fetches candidate's own payment orders with ownership enforcement
 */
export async function fetchUserPaymentOrders(): Promise<{ orders: any[] }> {
  const token = getStoredSessionToken();
  if (!token) return { orders: [] };

  try {
    const res = await fetch('/api/payment/orders', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return { orders: [] };
    return await res.json();
  } catch {
    return { orders: [] };
  }
}
