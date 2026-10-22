import crypto from 'crypto';
import { serverDb } from './db.ts';

export interface SubscriptionPlan {
  id: 'free' | 'pro' | 'master';
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  displayPrice: string;
  features: string[];
  limits: {
    speakingEvaluationsPerDay: number;
    writingEvaluationsPerDay: number;
    mockExamsPerMonth: number;
    aiVoiceExaminer: boolean;
    band9ModelAnswers: boolean;
    personalizedExaminerFeedback: boolean;
  };
}

export const SUBSCRIPTION_PLANS: Record<'free' | 'pro' | 'master', SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Candidate Free',
    tagline: 'Essential practice for self-paced IELTS learners',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'BDT',
    displayPrice: '৳0',
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
    displayPrice: '৳150/month',
    features: [
      'Interactive 1-on-1 Voice Examiner (British Male Voices)',
      'Unlimited Speaking Fluency & Grammar Diagnostics',
      'Task 1 & Task 2 Writing Band Evaluator',
      'Band 9 Official Cambridge Model Answers',
      'Comprehensive Mistake Vault with Spaced Repetition',
      'Advanced Academic Collocation & C1 Idiom Labs'
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
    displayPrice: '৳300/month',
    features: [
      'Everything included in Sprint Premium',
      'Full Timed Live Mock Test Simulations',
      'Deep AI Examiner Diagnostic Breakdown across all 4 Criteria',
      'Priority High-Fidelity Audio Streaming',
      'Customized 30-Day Band 8.5 Study Plan',
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
};

export function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export async function createCheckoutSession(params: {
  userId: string;
  userEmail: string;
  planId: 'pro' | 'master';
  billingInterval: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}): Promise<{ checkoutUrl: string; sessionId: string; isSimulated: boolean }> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const plan = SUBSCRIPTION_PLANS[params.planId];
  if (!plan) {
    throw new Error(`Invalid plan ID: ${params.planId}`);
  }

  if (stripeKey) {
    try {
      const price = params.billingInterval === 'yearly' ? plan.priceYearly : plan.priceMonthly;
      const unitAmountCents = Math.round(price * 100);

      const bodyParams = new URLSearchParams({
        customer_email: params.userEmail,
        client_reference_id: params.userId,
        mode: 'subscription',
        success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: params.cancelUrl,
        'line_items[0][price_data][currency]': plan.currency.toLowerCase(),
        'line_items[0][price_data][product_data][name]': `IELTS Sprint ${plan.name}`,
        'line_items[0][price_data][product_data][description]': plan.tagline,
        'line_items[0][price_data][unit_amount]': unitAmountCents.toString(),
        'line_items[0][price_data][recurring][interval]': params.billingInterval === 'yearly' ? 'year' : 'month',
        'line_items[0][quantity]': '1',
        'metadata[userId]': params.userId,
        'metadata[planId]': params.planId,
        'metadata[billingInterval]': params.billingInterval
      });

      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: bodyParams
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Stripe] Checkout creation failed:', errorText);
        throw new Error(`Stripe error: ${response.status}`);
      }

      const data = await response.json();
      return {
        checkoutUrl: data.url,
        sessionId: data.id,
        isSimulated: false
      };
    } catch (err: any) {
      console.error('[Stripe] Session creation exception:', err.message);
      throw err;
    }
  }

  throw new Error('Payment gateway credentials not configured on the server. Please configure merchant API credentials to initiate live checkout.');
}

export function verifyStripeSignature(payload: string | Buffer, header: string, secret: string): boolean {
  if (!header || !secret) return false;

  const parts = header.split(',');
  let timestamp = '';
  const signatures: string[] = [];

  for (const part of parts) {
    const [k, v] = part.trim().split('=');
    if (k === 't') timestamp = v;
    if (k === 'v1') signatures.push(v);
  }

  if (!timestamp || signatures.length === 0) return false;

  const now = Math.floor(Date.now() / 1000);
  const eventTime = parseInt(timestamp, 10);
  if (isNaN(eventTime) || Math.abs(now - eventTime) > 300) {
    console.warn('[Stripe Webhook] Timestamp outside tolerance window');
    return false;
  }

  const payloadString = Buffer.isBuffer(payload) ? payload.toString('utf-8') : payload;
  const signedPayload = `${timestamp}.${payloadString}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

  for (const sig of signatures) {
    try {
      const a = Buffer.from(sig, 'hex');
      const b = Buffer.from(expectedSignature, 'hex');
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

export function processStripeWebhookEvent(event: any): { processed: boolean; reason?: string } {
  if (serverDb.isWebhookEventProcessed(event.id)) {
    return { processed: true, reason: 'Duplicate event already processed' };
  }

  const obj = event.data?.object || {};

  switch (event.type) {
    case 'checkout.session.completed': {
      const userId = obj.client_reference_id || obj.metadata?.userId;
      const planId = obj.metadata?.planId || 'pro';
      const customerId = obj.customer;
      const subscriptionId = obj.subscription;

      if (userId) {
        serverDb.saveSubscription({
          userId,
          planId: planId as 'pro' | 'master',
          status: 'active',
          paymentMethod: 'stripe',
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          currentPeriodStart: Date.now(),
          currentPeriodEnd: Date.now() + 32 * 24 * 3600 * 1000,
          cancelAtPeriodEnd: false,
          updatedAt: Date.now()
        });
      }
      break;
    }
    case 'customer.subscription.updated': {
      const status = obj.status;
      const currentPeriodEnd = (obj.current_period_end || 0) * 1000;
      const cancelAtPeriodEnd = !!obj.cancel_at_period_end;
      const customerId = obj.customer;

      const sub = serverDb.findSubscriptionByCustomerId(customerId);
      if (sub) {
        sub.status = status === 'active' ? 'active' : status === 'past_due' ? 'past_due' : 'canceled';
        if (currentPeriodEnd) sub.currentPeriodEnd = currentPeriodEnd;
        sub.cancelAtPeriodEnd = cancelAtPeriodEnd;
        serverDb.saveSubscription(sub);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const customerId = obj.customer;
      const sub = serverDb.findSubscriptionByCustomerId(customerId);
      if (sub) {
        sub.status = 'expired';
        sub.planId = 'free';
        sub.cancelAtPeriodEnd = false;
        serverDb.saveSubscription(sub);
      }
      break;
    }
    case 'invoice.payment_failed': {
      const customerId = obj.customer;
      const sub = serverDb.findSubscriptionByCustomerId(customerId);
      if (sub) {
        sub.status = 'past_due';
        serverDb.saveSubscription(sub);
      }
      break;
    }
  }

  serverDb.recordWebhookEvent(event.id);
  return { processed: true };
}

export function checkUserEntitlement(
  userId: string,
  requiredFeature?: string
): { hasAccess: boolean; planId: string; status: string; reason?: string } {
  const sub = serverDb.getSubscription(userId);
  const plan = SUBSCRIPTION_PLANS[sub.planId] || SUBSCRIPTION_PLANS.free;

  if (sub.status !== 'active' && sub.status !== 'trialing') {
    return {
      hasAccess: false,
      planId: sub.planId,
      status: sub.status,
      reason: `Subscription is currently ${sub.status}. Please renew your subscription to access premium features.`
    };
  }

  // Check boolean feature limits
  if (requiredFeature && requiredFeature in plan.limits) {
    const featureVal = (plan.limits as any)[requiredFeature];
    if (typeof featureVal === 'boolean' && !featureVal) {
      return {
        hasAccess: false,
        planId: sub.planId,
        status: sub.status,
        reason: `This feature requires a Sprint Premium or Master subscription.`
      };
    }
  }

  // Check daily rate limits for speaking evaluations
  if (requiredFeature === 'speakingEvaluationsPerDay') {
    const dailyLimit = plan.limits.speakingEvaluationsPerDay;
    const todayUsage = serverDb.getDailyUsage(userId).speakingEvaluations || 0;
    if (todayUsage >= dailyLimit) {
      return {
        hasAccess: false,
        planId: sub.planId,
        status: sub.status,
        reason: `You have reached your daily limit of ${dailyLimit} AI Speaking evaluation(s) on the Free plan. Upgrade to Sprint Premium (৳150/month) for unlimited evaluations.`
      };
    }
  }

  // Check daily rate limits for writing evaluations
  if (requiredFeature === 'writingEvaluationsPerDay') {
    const dailyLimit = plan.limits.writingEvaluationsPerDay;
    const todayUsage = serverDb.getDailyUsage(userId).writingEvaluations || 0;
    if (todayUsage >= dailyLimit) {
      return {
        hasAccess: false,
        planId: sub.planId,
        status: sub.status,
        reason: `You have reached your daily limit of ${dailyLimit} AI Writing evaluation(s) on the Free plan. Upgrade to Sprint Premium (৳150/month) for unlimited evaluations.`
      };
    }
  }

  return {
    hasAccess: true,
    planId: sub.planId,
    status: sub.status
  };
}