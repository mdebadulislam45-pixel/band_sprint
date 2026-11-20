import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface ServerUser {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  passwordSalt?: string;
  avatarUrl?: string;
  googleId?: string;
  firebaseUid?: string;
  emailVerified?: boolean;
  phone?: string;
  isPhoneVerified?: boolean;
  phoneVerifiedAt?: number;
  targetBand?: number;
  intendedFormat?: 'Academic' | 'General Training';
  targetCountry?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PhoneOtpChallenge {
  userId: string;
  phone: string;
  otpHash: string;
  otpSalt: string;
  createdAt: number;
  expiresAt: number;
  resendAvailableAt: number;
  attempts: number;
  maxAttempts: number;
  consumedAt?: number;
}

export interface ServerSession {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  userAgent?: string;
  ip?: string;
}

export interface ServerSubscription {
  userId: string;
  planId: 'free' | 'pro' | 'master';
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'expired';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  paymentMethod?: 'stripe' | 'bkash' | 'promo' | 'manual';
  promoCode?: string;
  trialStart?: number;
  trialEnd?: number;
  trialUsed?: boolean;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  updatedAt: number;
}

export interface DailyUsageRecord {
  speakingEvaluations: number;
  writingEvaluations: number;
  mockExamsGenerated?: number;
}

export interface PromoCode {
  code: string;
  description: string;
  planId: 'pro' | 'master';
  durationDays: number;
  maxRedemptions: number;
  currentRedemptions: number;
  expiresAt: number | null; // null if no expiration
  isActive: boolean;
}

export interface PromoRedemptionRecord {
  code: string;
  userId: string;
  redeemedAt: number;
  expiresAt: number;
  planId: 'pro' | 'master';
  durationDays: number;
}

export type PaymentOrderStatus = 'pending' | 'initiated' | 'completed' | 'failed' | 'cancelled' | 'expired';
export type PaymentProvider = 'bkash' | 'stripe' | 'manual';

export interface PaymentOrder {
  orderId: string;
  userId: string;
  planId: 'pro' | 'master';
  billingInterval: 'monthly' | 'yearly';
  amount: number; // Server-authoritative amount (৳150 / ৳1500)
  currency: 'BDT';
  provider: PaymentProvider;
  status: PaymentOrderStatus;
  providerPaymentId?: string; // e.g. bKash paymentID
  providerTrxId?: string; // e.g. bKash trxID
  providerRef?: string;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  metadata?: Record<string, any>;
}

export interface QuestionProblemReport {
  id: string;
  questionId: string | number;
  moduleId: 'reading' | 'listening' | 'writing' | 'speaking';
  examId?: string;
  examTitle?: string;
  issueType: 'wrong_key' | 'ambiguous_wording' | 'audio_mismatch' | 'typo' | 'other';
  comment?: string;
  studentUserId?: string;
  studentEmail?: string;
  reportedAt: number;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
}

export interface AIDraftExam {
  id: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
  model: string;
  examType: 'academic_reading' | 'general_reading' | 'listening' | 'writing' | 'speaking';
  status: 'REQUESTED' | 'GENERATING' | 'VALIDATING' | 'REPAIRING' | 'PENDING_REVIEW' | 'APPROVED' | 'VALIDATION_FAILED' | 'FAILED' | 'REJECTED';
  pipelineStatus?: 'draft' | 'checked' | 'reviewed' | 'published';
  isLive?: boolean;
  origin?: {
    model: string;
    solverModel?: string;
    date: string;
    promptVersion: string;
    topicId?: string;
    topicTitle?: string;
    tokenUsage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
    passageCallCount?: number;
  };
  validationStatus: 'PASSED' | 'FAILED' | 'REPAIRED';
  repairAttempts: number;
  validationFindings: {
    passed: boolean;
    structuralOk: boolean;
    answersOk: boolean;
    evidenceOk: boolean;
    qualityOk: boolean;
    errors: string[];
    warnings: string[];
  };
  solverResult?: {
    solverModel: string;
    testedAt: number;
    passed: boolean;
    matchCount: number;
    mismatchCount: number;
    needsReview: boolean;
    summary: string;
    details: any[];
  };
  duplicateCheck?: {
    isDuplicate: boolean;
    maxSimilarity: number;
    matchedId?: string;
    matchedTitle?: string;
    reason?: string;
  };
  isBeta?: boolean;
  codeChecksResult?: any;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    thoughtsTokens?: number;
  };
  reviewedBy?: string;
  reviewedAt?: number;
  rejectionReason?: string;
  content?: any;
}

export const SERVER_PLAN_PRICES: Record<'pro' | 'master', { monthly: number; yearly: number }> = {
  pro: { monthly: 150, yearly: 1500 },
  master: { monthly: 300, yearly: 3000 }
};

export const MAX_RETAINED_FAILED_DRAFTS_PER_USER = 20;

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE_NAME = process.env.STORE_PATH
  ? path.basename(process.env.STORE_PATH)
  : 'sprint_store.json';
const DB_FILE = path.join(DATA_DIR, DB_FILE_NAME);

const DEFAULT_PROMO_CODES: Record<string, PromoCode> = {
  SPRINT7: {
    code: 'SPRINT7',
    description: '7-Day Sprint Premium Complimentary Access Pass',
    planId: 'pro',
    durationDays: 7,
    maxRedemptions: 500,
    currentRedemptions: 0,
    expiresAt: null,
    isActive: true
  },
  BAND8PLUS: {
    code: 'BAND8PLUS',
    description: '14-Day IELTS Band 8.0+ Advanced Intensive Pass',
    planId: 'pro',
    durationDays: 14,
    maxRedemptions: 250,
    currentRedemptions: 0,
    expiresAt: null,
    isActive: true
  },
  IELTS2026: {
    code: 'IELTS2026',
    description: '30-Day BandSprint 2026 Launch Special Voucher',
    planId: 'pro',
    durationDays: 30,
    maxRedemptions: 100,
    currentRedemptions: 0,
    expiresAt: null,
    isActive: true
  },
  CAMBRIDGE: {
    code: 'CAMBRIDGE',
    description: '7-Day Sprint Master Exam Simulation & VIP Diagnostic Pass',
    planId: 'master',
    durationDays: 7,
    maxRedemptions: 100,
    currentRedemptions: 0,
    expiresAt: null,
    isActive: true
  },
  FREEPASS: {
    code: 'FREEPASS',
    description: '3-Day Extended Sprint Premium Access',
    planId: 'pro',
    durationDays: 3,
    maxRedemptions: 1000,
    currentRedemptions: 0,
    expiresAt: null,
    isActive: true
  }
};

class DatabaseStore {
  private saveTimeout: NodeJS.Timeout | null = null;
  public maxRetainedFailedDraftsPerUser: number = MAX_RETAINED_FAILED_DRAFTS_PER_USER;
  public data: {
    users: Record<string, ServerUser>;
    sessions: Record<string, ServerSession>;
    subscriptions: Record<string, ServerSubscription>;
    processedWebhookEvents: Record<string, number>;
    dailyUsage?: Record<string, Record<string, DailyUsageRecord>>;
    promoCodes?: Record<string, PromoCode>;
    promoRedemptions?: Record<string, PromoRedemptionRecord[]>;
    paymentOrders?: Record<string, PaymentOrder>;
    otpChallenges?: Record<string, PhoneOtpChallenge>;
    aiDraftExams?: Record<string, AIDraftExam>;
    analyticsEvents?: Record<string, any>;
    analyticsIdempotencyIndex?: Record<string, string>;
    questionProblemReports?: Record<string, QuestionProblemReport>;
    adminDailyGenerations?: Record<string, Record<string, number>>;
  } = {
    users: {},
    sessions: {},
    subscriptions: {},
    processedWebhookEvents: {},
    dailyUsage: {},
    promoCodes: {},
    promoRedemptions: {},
    paymentOrders: {},
    otpChallenges: {},
    aiDraftExams: {},
    analyticsEvents: {},
    analyticsIdempotencyIndex: {},
    questionProblemReports: {},
    adminDailyGenerations: {}
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.users) this.data.users = {};
        if (!this.data.sessions) this.data.sessions = {};
        if (!this.data.subscriptions) this.data.subscriptions = {};
        if (!this.data.processedWebhookEvents) this.data.processedWebhookEvents = {};
        if (!this.data.dailyUsage) this.data.dailyUsage = {};
        if (!this.data.promoCodes || Object.keys(this.data.promoCodes).length === 0) {
          this.data.promoCodes = { ...DEFAULT_PROMO_CODES };
        }
        if (!this.data.promoRedemptions) this.data.promoRedemptions = {};
        if (!this.data.paymentOrders) this.data.paymentOrders = {};
        if (!this.data.otpChallenges) this.data.otpChallenges = {};
        if (!this.data.aiDraftExams) this.data.aiDraftExams = {};
        if (!this.data.analyticsEvents) this.data.analyticsEvents = {};
        if (!this.data.analyticsIdempotencyIndex) this.data.analyticsIdempotencyIndex = {};
      } else {
        this.data.promoCodes = { ...DEFAULT_PROMO_CODES };
        this.persistSync();
      }
    } catch (err) {
      this.data.promoCodes = { ...DEFAULT_PROMO_CODES };
    }
  }

  public persistSync() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.${Date.now()}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('[DB] Persist error:', err);
    }
  }

  private scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.persistSync();
    }, 150);
  }

  public findUserById(id: string): ServerUser | null {
    return this.data.users[id] || null;
  }

  public findUserByFirebaseUid(firebaseUid: string): ServerUser | null {
    if (!firebaseUid) return null;
    if (this.data.users[firebaseUid]) return this.data.users[firebaseUid];
    return Object.values(this.data.users).find((u) => u.firebaseUid === firebaseUid) || null;
  }

  public findUserByEmail(email: string): ServerUser | null {
    const clean = email.trim().toLowerCase();
    return Object.values(this.data.users).find((u) => u.email.toLowerCase() === clean) || null;
  }

  public findUserByGoogleId(googleId: string): ServerUser | null {
    return Object.values(this.data.users).find((u) => u.googleId === googleId) || null;
  }

  public saveOtpChallenge(challenge: PhoneOtpChallenge): PhoneOtpChallenge {
    if (!this.data.otpChallenges) this.data.otpChallenges = {};
    this.data.otpChallenges[challenge.userId] = challenge;
    this.scheduleSave();
    return challenge;
  }

  public getOtpChallenge(userId: string): PhoneOtpChallenge | null {
    if (!this.data.otpChallenges) return null;
    return this.data.otpChallenges[userId] || null;
  }

  public deleteOtpChallenge(userId: string): void {
    if (this.data.otpChallenges && this.data.otpChallenges[userId]) {
      delete this.data.otpChallenges[userId];
      this.scheduleSave();
    }
  }

  public saveUser(user: ServerUser): ServerUser {
    user.updatedAt = Date.now();
    this.data.users[user.id] = user;

    if (!this.data.subscriptions[user.id]) {
      this.data.subscriptions[user.id] = {
        userId: user.id,
        planId: 'free',
        status: 'active',
        paymentMethod: 'stripe',
        trialUsed: false,
        currentPeriodStart: Date.now(),
        currentPeriodEnd: Date.now() + 365 * 24 * 3600 * 1000,
        cancelAtPeriodEnd: false,
        updatedAt: Date.now()
      };
    }
    this.scheduleSave();
    return user;
  }

  public createSession(userId: string, userAgent?: string, ip?: string): ServerSession {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const session: ServerSession = {
      token,
      userId,
      createdAt: now,
      expiresAt: now + 30 * 24 * 3600 * 1000,
      userAgent,
      ip
    };
    this.data.sessions[token] = session;
    this.scheduleSave();
    return session;
  }

  public getSession(token: string): ServerSession | null {
    const session = this.data.sessions[token];
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      delete this.data.sessions[token];
      this.scheduleSave();
      return null;
    }
    return session;
  }

  public deleteSession(token: string): boolean {
    if (this.data.sessions[token]) {
      delete this.data.sessions[token];
      this.scheduleSave();
      return true;
    }
    return false;
  }

  public getSubscription(userId: string): ServerSubscription {
    let sub = this.data.subscriptions[userId];
    const now = Date.now();
    if (!sub) {
      sub = {
        userId,
        planId: 'free',
        status: 'active',
        paymentMethod: 'stripe',
        trialUsed: false,
        currentPeriodStart: now,
        currentPeriodEnd: now + 365 * 24 * 3600 * 1000,
        cancelAtPeriodEnd: false,
        updatedAt: now
      };
      this.data.subscriptions[userId] = sub;
      this.scheduleSave();
    } else {
      // Expiration check for paid active subscriptions
      if (sub.status === 'active' && sub.planId !== 'free' && now > sub.currentPeriodEnd) {
        sub.status = 'expired';
        sub.planId = 'free';
        sub.updatedAt = now;
        this.scheduleSave();
      }
      // Trial expiration check (revert safely to free, preserving user data)
      if (sub.status === 'trialing' && sub.trialEnd && now > sub.trialEnd) {
        sub.status = 'expired';
        sub.planId = 'free';
        sub.updatedAt = now;
        this.scheduleSave();
      }
    }
    return sub;
  }

  public findSubscriptionByCustomerId(customerId: string): ServerSubscription | null {
    return Object.values(this.data.subscriptions).find((s) => s.stripeCustomerId === customerId) || null;
  }

  public saveSubscription(sub: ServerSubscription): ServerSubscription {
    sub.updatedAt = Date.now();
    this.data.subscriptions[sub.userId] = sub;
    this.scheduleSave();
    return sub;
  }

  /**
   * Starts a server-controlled 3-day (72 hours) Free Trial for an eligible user
   */
  public startUserTrial(userId: string): { success: boolean; subscription?: ServerSubscription; error?: string } {
    const sub = this.getSubscription(userId);
    const now = Date.now();

    // 1. Prevent concurrent or duplicate trial if currently active
    if (sub.status === 'trialing' && sub.trialEnd && now < sub.trialEnd) {
      return {
        success: false,
        error: 'A 3-day free trial is already active on this account.'
      };
    }

    // 2. Prevent trial if user already has an active paid subscription
    if (sub.status === 'active' && sub.planId !== 'free' && now < sub.currentPeriodEnd) {
      return {
        success: false,
        error: 'You already have an active paid subscription with full premium access.'
      };
    }

    // 3. Enforce exactly one trial per user account
    if (sub.trialUsed) {
      return {
        success: false,
        error: 'This account has already utilized its one-time 3-day free trial.'
      };
    }

    // 4. Activate exactly 72 hours trial
    const trialDurationMs = 72 * 60 * 60 * 1000; // 72 hours
    sub.status = 'trialing';
    sub.planId = 'pro';
    sub.trialStart = now;
    sub.trialEnd = now + trialDurationMs;
    sub.trialUsed = true;
    sub.currentPeriodStart = now;
    sub.currentPeriodEnd = sub.trialEnd;
    sub.paymentMethod = 'manual';
    sub.cancelAtPeriodEnd = false;
    sub.updatedAt = now;

    this.saveSubscription(sub);
    return {
      success: true,
      subscription: sub
    };
  }

  /**
   * Find a promo code (case-insensitive & trimmed)
   */
  public findPromoCode(rawCode: string): PromoCode | null {
    if (!rawCode || typeof rawCode !== 'string') return null;
    const clean = rawCode.trim().toUpperCase();
    if (!this.data.promoCodes) return null;
    return this.data.promoCodes[clean] || null;
  }

  /**
   * Redeems a promotional code for an authenticated user
   */
  public redeemPromoCode(
    userId: string,
    rawCode: string
  ): {
    success: boolean;
    subscription?: ServerSubscription;
    message?: string;
    error?: string;
    promo?: PromoCode;
  } {
    if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
      return { success: false, error: 'Please enter a valid promotional code.' };
    }

    const clean = rawCode.trim().toUpperCase();
    const promo = this.findPromoCode(clean);

    if (!promo) {
      return { success: false, error: `Invalid promotional code "${clean}". Please verify and try again.` };
    }

    if (!promo.isActive) {
      return { success: false, error: `Promotional code "${clean}" has been deactivated.` };
    }

    const now = Date.now();
    if (promo.expiresAt !== null && now > promo.expiresAt) {
      return { success: false, error: `Promotional code "${clean}" expired on ${new Date(promo.expiresAt).toLocaleDateString()}.` };
    }

    if (promo.maxRedemptions > 0 && promo.currentRedemptions >= promo.maxRedemptions) {
      return { success: false, error: `Promotional code "${clean}" has reached its maximum global redemptions.` };
    }

    // Check user's redemption history
    if (!this.data.promoRedemptions) this.data.promoRedemptions = {};
    const userHistory = this.data.promoRedemptions[userId] || [];
    const alreadyRedeemed = userHistory.some((r) => r.code === promo.code);

    if (alreadyRedeemed) {
      return { success: false, error: `You have already redeemed promotional code "${clean}" on this account.` };
    }

    // Apply promo period
    const durationMs = promo.durationDays * 24 * 60 * 60 * 1000;
    const sub = this.getSubscription(userId);

    // Calculate period end: if user already has an active period, stack/extend; otherwise start from now
    const baseStart = (sub.status === 'active' || sub.status === 'trialing') && sub.currentPeriodEnd > now
      ? sub.currentPeriodEnd
      : now;
    const newPeriodEnd = baseStart + durationMs;

    sub.planId = promo.planId;
    sub.status = 'active';
    sub.paymentMethod = 'promo';
    sub.promoCode = promo.code;
    sub.currentPeriodStart = now;
    sub.currentPeriodEnd = newPeriodEnd;
    sub.cancelAtPeriodEnd = false;
    sub.updatedAt = now;

    // Increment promo usage counter
    promo.currentRedemptions += 1;

    // Record redemption
    if (!this.data.promoRedemptions[userId]) {
      this.data.promoRedemptions[userId] = [];
    }
    this.data.promoRedemptions[userId].push({
      code: promo.code,
      userId,
      redeemedAt: now,
      expiresAt: newPeriodEnd,
      planId: promo.planId,
      durationDays: promo.durationDays
    });

    this.saveSubscription(sub);

    const planName = promo.planId === 'master' ? 'Sprint Master' : 'Sprint Premium';
    return {
      success: true,
      subscription: sub,
      message: `Promotional code "${promo.code}" applied! You have been granted ${promo.durationDays} days of ${planName} access.`,
      promo
    };
  }

  public getUserPromoRedemptions(userId: string): PromoRedemptionRecord[] {
    if (!this.data.promoRedemptions) return [];
    return this.data.promoRedemptions[userId] || [];
  }

  public addOrUpdatePromoCode(promo: PromoCode): void {
    if (!this.data.promoCodes) this.data.promoCodes = {};
    const clean = promo.code.trim().toUpperCase();
    this.data.promoCodes[clean] = {
      ...promo,
      code: clean
    };
    this.scheduleSave();
  }

  public isWebhookEventProcessed(eventId: string): boolean {
    return !!this.data.processedWebhookEvents[eventId];
  }

  public recordWebhookEvent(eventId: string) {
    this.data.processedWebhookEvents[eventId] = Date.now();
    this.scheduleSave();
  }

  public getDailyUsage(userId: string, dateStr?: string): DailyUsageRecord {
    const dStr = dateStr || new Date().toISOString().split('T')[0];
    if (!this.data.dailyUsage) this.data.dailyUsage = {};
    if (!this.data.dailyUsage[userId]) this.data.dailyUsage[userId] = {};
    if (!this.data.dailyUsage[userId][dStr]) {
      this.data.dailyUsage[userId][dStr] = {
        speakingEvaluations: 0,
        writingEvaluations: 0
      };
    }
    return this.data.dailyUsage[userId][dStr];
  }

  public incrementDailyUsage(
    userId: string,
    feature: 'speakingEvaluations' | 'writingEvaluations' | 'mockExamsGenerated',
    dateStr?: string
  ): DailyUsageRecord {
    const usage = this.getDailyUsage(userId, dateStr);
    usage[feature] = (usage[feature] || 0) + 1;
    this.scheduleSave();
    return usage;
  }

  public getMonthlyUsage(
    userId: string,
    dateOrMonthStr?: string
  ): { mockExamsPerMonth: number; monthKey: string } {
    const rawStr = dateOrMonthStr && typeof dateOrMonthStr === 'string' && dateOrMonthStr.trim()
      ? dateOrMonthStr.trim()
      : new Date().toISOString().split('T')[0];
    const monthKey = rawStr.slice(0, 7);
    if (!this.data.dailyUsage || !this.data.dailyUsage[userId]) {
      return { mockExamsPerMonth: 0, monthKey };
    }
    let totalMockExams = 0;
    for (const [dKey, rec] of Object.entries(this.data.dailyUsage[userId])) {
      if (dKey.startsWith(monthKey) && rec && typeof rec.mockExamsGenerated === 'number') {
        totalMockExams += rec.mockExamsGenerated;
      }
    }
    return { mockExamsPerMonth: totalMockExams, monthKey };
  }

  /**
   * Creates a pending payment order with strict server-controlled price and unique order ID
   */
  public createPaymentOrder(params: {
    userId: string;
    planId: 'pro' | 'master';
    billingInterval?: 'monthly' | 'yearly';
    provider?: PaymentProvider;
    metadata?: Record<string, any>;
  }): PaymentOrder {
    const interval = params.billingInterval || 'monthly';
    const planPricing = SERVER_PLAN_PRICES[params.planId] || SERVER_PLAN_PRICES.pro;
    const amount = interval === 'yearly' ? planPricing.yearly : planPricing.monthly;
    const provider = params.provider || 'bkash';
    const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderId = `ORD_${provider.toUpperCase()}_${dateStr}_${randomSuffix}`;
    const now = Date.now();

    const order: PaymentOrder = {
      orderId,
      userId: params.userId,
      planId: params.planId,
      billingInterval: interval,
      amount,
      currency: 'BDT',
      provider,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      metadata: params.metadata || {}
    };

    if (!this.data.paymentOrders) this.data.paymentOrders = {};
    this.data.paymentOrders[orderId] = order;
    this.scheduleSave();
    return order;
  }

  public findPaymentOrder(orderId: string): PaymentOrder | null {
    if (!this.data.paymentOrders) return null;
    return this.data.paymentOrders[orderId] || null;
  }

  /**
   * Strict user ownership check: only returns orders owned by the authenticated userId
   */
  public getUserPaymentOrders(userId: string): PaymentOrder[] {
    if (!this.data.paymentOrders) return [];
    return Object.values(this.data.paymentOrders)
      .filter((o) => o.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Idempotent state machine transition for payment orders
   */
  public updatePaymentOrderStatus(
    orderId: string,
    newStatus: PaymentOrderStatus,
    updates?: Partial<PaymentOrder>
  ): { success: boolean; order?: PaymentOrder; error?: string } {
    const order = this.findPaymentOrder(orderId);
    if (!order) {
      return { success: false, error: `Order ${orderId} not found.` };
    }

    // Idempotency: if already completed and target is completed, return successfully without re-charging
    if (order.status === 'completed' && newStatus === 'completed') {
      return { success: true, order };
    }

    // State machine rule: cannot revert or alter terminal completed state
    if (order.status === 'completed' && newStatus !== 'completed') {
      return {
        success: false,
        error: `Order ${orderId} has already been completed and cannot transition to ${newStatus}.`
      };
    }

    const now = Date.now();
    order.status = newStatus;
    order.updatedAt = now;

    if (updates) {
      if (updates.providerPaymentId) order.providerPaymentId = updates.providerPaymentId;
      if (updates.providerTrxId) order.providerTrxId = updates.providerTrxId;
      if (updates.providerRef) order.providerRef = updates.providerRef;
      if (updates.errorMessage) order.errorMessage = updates.errorMessage;
      if (updates.metadata) order.metadata = { ...order.metadata, ...updates.metadata };
    }

    // When verified complete, activate candidate's subscription automatically & idempotently
    if (newStatus === 'completed') {
      order.completedAt = now;
      const durationDays = order.billingInterval === 'yearly' ? 365 : 30;
      const sub = this.getSubscription(order.userId);
      const baseStart =
        (sub.status === 'active' || sub.status === 'trialing') && sub.currentPeriodEnd > now
          ? sub.currentPeriodEnd
          : now;

      sub.planId = order.planId;
      sub.status = 'active';
      sub.paymentMethod = order.provider;
      sub.currentPeriodStart = now;
      sub.currentPeriodEnd = baseStart + durationDays * 24 * 3600 * 1000;
      sub.cancelAtPeriodEnd = false;
      sub.updatedAt = now;
      this.saveSubscription(sub);
    }

    this.scheduleSave();
    return { success: true, order };
  }

  /**
   * User-scoped bounded retention cleanup for AI drafts (Phase 5.5H.12F.2 — MED-02 & Phase 5.5H.12F.3).
   * Preserves all PENDING_REVIEW, APPROVED, REJECTED, and active in-progress (REQUESTED, GENERATING,
   * VALIDATING, REPAIRING) drafts, as well as the activeDraftId currently being saved.
   * Only prunes excess terminal failed drafts (VALIDATION_FAILED, FAILED)
   * belonging to the same userId beyond maxFailedDrafts (newest retained, oldest pruned).
   */
  public pruneUserAiDraftExams(
    userId: string,
    activeDraftId?: string,
    maxFailedDrafts: number = this.maxRetainedFailedDraftsPerUser
  ): number {
    if (!userId || !this.data.aiDraftExams) return 0;
    const safeLimit = Math.max(1, Math.floor(maxFailedDrafts));
    const prunableStatuses = new Set(['VALIDATION_FAILED', 'FAILED']);

    const prunableUserDrafts = Object.values(this.data.aiDraftExams)
      .filter((d) => d && d.userId === userId && prunableStatuses.has(d.status))
      .sort((a, b) => {
        if (a.id === activeDraftId) return -1;
        if (b.id === activeDraftId) return 1;
        if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });

    if (prunableUserDrafts.length <= safeLimit) {
      return 0;
    }

    const toDelete = prunableUserDrafts.slice(safeLimit).filter((d) => d.id !== activeDraftId);
    for (const draft of toDelete) {
      delete this.data.aiDraftExams[draft.id];
    }
    return toDelete.length;
  }

  public saveAiDraftExam(draft: AIDraftExam): AIDraftExam {
    if (!this.data.aiDraftExams) this.data.aiDraftExams = {};
    const now = Date.now();
    draft.updatedAt = now;
    const storedDraft: AIDraftExam = {
      ...draft,
      updatedAt: now,
      validationFindings: draft.validationFindings
        ? {
            ...draft.validationFindings,
            errors: Array.isArray(draft.validationFindings.errors) ? [...draft.validationFindings.errors] : [],
            warnings: Array.isArray(draft.validationFindings.warnings) ? [...draft.validationFindings.warnings] : []
          }
        : draft.validationFindings
    };
    this.data.aiDraftExams[storedDraft.id] = storedDraft;
    this.pruneUserAiDraftExams(storedDraft.userId, storedDraft.id);
    this.scheduleSave();
    return storedDraft;
  }

  public getAiDraftExam(id: string): AIDraftExam | null {
    if (!this.data.aiDraftExams) return null;
    return this.data.aiDraftExams[id] || null;
  }

  public getUserAiDraftExams(userId: string): AIDraftExam[] {
    if (!this.data.aiDraftExams) return [];
    return Object.values(this.data.aiDraftExams)
      .filter((d) => d.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  public listAiDraftExams(): AIDraftExam[] {
    if (!this.data.aiDraftExams) return [];
    return Object.values(this.data.aiDraftExams).sort((a, b) => b.createdAt - a.createdAt);
  }

  public saveAnalyticsEvent(record: any): any {
    if (!this.data.analyticsEvents) this.data.analyticsEvents = {};
    if (!this.data.analyticsIdempotencyIndex) this.data.analyticsIdempotencyIndex = {};

    this.data.analyticsEvents[record.id] = record;
    if (record.userId && record.idempotencyKey) {
      this.data.analyticsIdempotencyIndex[`${record.userId}:${record.idempotencyKey}`] = record.id;
    }

    // Bounded Retention: enforce maximum 5,000 events to prevent unbounded storage growth
    const MAX_ANALYTICS_EVENTS = 5000;
    const eventKeys = Object.keys(this.data.analyticsEvents);
    if (eventKeys.length > MAX_ANALYTICS_EVENTS) {
      // Sort oldest first by serverTimestamp
      const sortedEvents = Object.values(this.data.analyticsEvents)
        .sort((a: any, b: any) => (a.serverTimestamp || 0) - (b.serverTimestamp || 0));

      const excessCount = sortedEvents.length - MAX_ANALYTICS_EVENTS;
      for (let i = 0; i < excessCount; i++) {
        const oldest = sortedEvents[i];
        if (oldest) {
          delete this.data.analyticsEvents[oldest.id];
          // Clean corresponding idempotency index reference
          if (oldest.userId && oldest.idempotencyKey) {
            delete this.data.analyticsIdempotencyIndex[`${oldest.userId}:${oldest.idempotencyKey}`];
          }
        }
      }
    }

    this.scheduleSave();
    return record;
  }

  public getAnalyticsEventById(id: string): any | null {
    if (!this.data.analyticsEvents) return null;
    return this.data.analyticsEvents[id] || null;
  }

  public getAnalyticsEventByIdempotencyKey(userId: string, idempotencyKey: string): any | null {
    if (!this.data.analyticsIdempotencyIndex || !this.data.analyticsEvents) return null;
    const eventId = this.data.analyticsIdempotencyIndex[`${userId}:${idempotencyKey}`];
    if (!eventId) return null;
    return this.data.analyticsEvents[eventId] || null;
  }

  public getUserAnalyticsEvents(userId: string, limit = 100): any[] {
    if (!this.data.analyticsEvents) return [];
    return Object.values(this.data.analyticsEvents)
      .filter((e: any) => e.userId === userId && e.category === 'candidate')
      .sort((a: any, b: any) => b.serverTimestamp - a.serverTimestamp)
      .slice(0, limit);
  }

  public getFactoryOperationalEvents(limit = 200): any[] {
    if (!this.data.analyticsEvents) return [];
    return Object.values(this.data.analyticsEvents)
      .filter((e: any) => e.category === 'factory_operational')
      .sort((a: any, b: any) => b.serverTimestamp - a.serverTimestamp)
      .slice(0, limit);
  }

  public saveQuestionProblemReport(report: QuestionProblemReport): QuestionProblemReport {
    if (!this.data.questionProblemReports) {
      this.data.questionProblemReports = {};
    }
    this.data.questionProblemReports[report.id] = report;
    this.scheduleSave();
    return report;
  }

  public listQuestionProblemReports(): QuestionProblemReport[] {
    if (!this.data.questionProblemReports) return [];
    return Object.values(this.data.questionProblemReports).sort((a, b) => b.reportedAt - a.reportedAt);
  }

  public getQuestionProblemReport(id: string): QuestionProblemReport | null {
    if (!this.data.questionProblemReports) return null;
    return this.data.questionProblemReports[id] || null;
  }

  public getAdminDailyGenerations(adminId: string, dateStr: string): number {
    if (!this.data.adminDailyGenerations) return 0;
    return this.data.adminDailyGenerations[dateStr]?.[adminId] || 0;
  }

  public incrementAdminDailyGenerations(adminId: string, dateStr: string): number {
    if (!this.data.adminDailyGenerations) {
      this.data.adminDailyGenerations = {};
    }
    if (!this.data.adminDailyGenerations[dateStr]) {
      this.data.adminDailyGenerations[dateStr] = {};
    }
    const current = this.data.adminDailyGenerations[dateStr][adminId] || 0;
    const next = current + 1;
    this.data.adminDailyGenerations[dateStr][adminId] = next;
    this.scheduleSave();
    return next;
  }
}

export const serverDb = new DatabaseStore();