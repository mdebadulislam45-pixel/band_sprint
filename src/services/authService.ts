import { UserProfile, UserProgress } from '../types';
import {
  saveUser,
  getActiveUser,
  ACTIVE_USER_KEY,
  createDefaultProgress,
  checkAndUpdateStreak
} from '../utils/userStorage';

export const SESSION_TOKEN_KEY = 'ielts_session_token_v2';
export const ACTIVE_SUBSCRIPTION_KEY = 'ielts_user_subscription_v2';

export interface ServerSubscriptionInfo {
  userId: string;
  planId: 'free' | 'pro' | 'master';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  trialStart?: number;
  trialEnd?: number;
  trialUsed?: boolean;
  promoCode?: string;
  paymentMethod?: string;
  updatedAt: number;
}

export interface AuthConfigResponse {
  configured: boolean;
  clientId: string | null;
  stripeConfigured: boolean;
}

export interface AuthResult {
  success: boolean;
  message?: string;
  error?: string;
  user?: UserProfile;
  subscription?: ServerSubscriptionInfo;
  sessionToken?: string;
}

/**
 * Retrieve current stored session token
 */
export function getStoredSessionToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

/**
 * Store session token in browser storage
 */
export function storeSessionToken(token: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
}

/**
 * Clear session token
 */
export function clearSessionToken(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(ACTIVE_SUBSCRIPTION_KEY);
  }
}

/**
 * Fetch server-side auth configuration (Google OAuth client ID status)
 */
export async function fetchAuthConfig(): Promise<AuthConfigResponse> {
  try {
    const res = await fetch('/api/auth/config');
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      return { configured: false, clientId: null, stripeConfigured: false };
    }
    return await res.json();
  } catch (err) {
    console.warn('[authService] Failed to fetch auth config:', err);
    return { configured: false, clientId: null, stripeConfigured: false };
  }
}

/**
 * Initiate real Google OAuth 2.0 redirect flow
 */
export async function initiateGoogleOAuthRedirect(): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/auth/google/url');
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: false,
        error: 'Google authentication is powered by Firebase Authentication in the app.'
      };
    }
    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Google OAuth is not configured on the server. Please use Firebase Google login.'
      };
    }

    if (data.url) {
      window.location.href = data.url;
      return { success: true };
    }

    return { success: false, error: 'No authorization URL returned from server.' };
  } catch (err: any) {
    console.error('[authService] Google OAuth initiation failed:', err);
    return { success: false, error: 'Google authentication is powered by Firebase Authentication.' };
  }
}

/**
 * Verifies a Google ID Token credential (e.g. from Google Identity Services button)
 */
export async function verifyGoogleCredentialToken(credential: string): Promise<AuthResult> {
  try {
    const res = await fetch('/api/auth/google/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Failed to verify Google credential with server.'
      };
    }

    if (data.sessionToken) {
      storeSessionToken(data.sessionToken);
    }

    if (data.subscription && typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_SUBSCRIPTION_KEY, JSON.stringify(data.subscription));
    }

    // Convert or preserve into client UserProfile schema
    const clientUser = syncServerUserToClientProfile(data.user, data.subscription);

    return {
      success: true,
      user: clientUser,
      subscription: data.subscription,
      sessionToken: data.sessionToken,
      message: `Successfully authenticated with Google as ${clientUser.name}!`
    };
  } catch (err: any) {
    console.error('[authService] verifyGoogleCredentialToken error:', err);
    return {
      success: false,
      error: err.message || 'Network failure while verifying Google credential.'
    };
  }
}

/**
 * Register candidate account with email & password (server-side verification)
 */
export async function registerCandidateWithServer(details: {
  name: string;
  email: string;
  password?: string;
  targetBand?: number;
  intendedFormat?: 'Academic' | 'General Training';
  targetCountry?: string;
}): Promise<AuthResult> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details)
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Registration failed.'
      };
    }

    if (data.sessionToken) {
      storeSessionToken(data.sessionToken);
    }
    if (data.subscription && typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_SUBSCRIPTION_KEY, JSON.stringify(data.subscription));
    }

    const clientUser = syncServerUserToClientProfile(data.user, data.subscription);

    return {
      success: true,
      user: clientUser,
      subscription: data.subscription,
      sessionToken: data.sessionToken,
      message: `Account created successfully! Welcome to IELTS Sprint, ${clientUser.name}.`
    };
  } catch (err: any) {
    console.error('[authService] register error:', err);
    return {
      success: false,
      error: err.message || 'Network error during registration.'
    };
  }
}

/**
 * Login candidate with email & password (server-side verification)
 */
export async function loginCandidateWithServer(credentials: {
  email: string;
  password?: string;
}): Promise<AuthResult> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Login failed. Please verify credentials.'
      };
    }

    if (data.sessionToken) {
      storeSessionToken(data.sessionToken);
    }
    if (data.subscription && typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_SUBSCRIPTION_KEY, JSON.stringify(data.subscription));
    }

    const clientUser = syncServerUserToClientProfile(data.user, data.subscription);

    return {
      success: true,
      user: clientUser,
      subscription: data.subscription,
      sessionToken: data.sessionToken,
      message: `Welcome back, ${clientUser.name}!`
    };
  } catch (err: any) {
    console.error('[authService] login error:', err);
    return {
      success: false,
      error: err.message || 'Network error during login.'
    };
  }
}

/**
 * Validates current session against server and retrieves verified profile & subscription
 */
export async function validateCurrentServerSession(): Promise<AuthResult> {
  const token = getStoredSessionToken();
  if (!token) {
    return { success: false, error: 'No active session token' };
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      clearSessionToken();
      return { success: false, error: 'Session expired or invalidated' };
    }

    const data = await res.json();
    if (data.subscription && typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_SUBSCRIPTION_KEY, JSON.stringify(data.subscription));
    }

    const clientUser = syncServerUserToClientProfile(data.user, data.subscription);

    return {
      success: true,
      user: clientUser,
      subscription: data.subscription,
      sessionToken: token
    };
  } catch (err: any) {
    // If network fails temporarily, don't wipe local state
    const existing = getActiveUser();
    return {
      success: !!existing,
      user: existing || undefined,
      error: err.message
    };
  }
}

/**
 * Sign out and invalidate server session
 */
export async function logoutCandidate(): Promise<void> {
  const token = getStoredSessionToken();
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {}
  }

  clearSessionToken();
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(ACTIVE_USER_KEY);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: null }));
  }
}

/**
 * Preserves existing client user progress (vocabulary, exam history, streaks) while synchronizing server profile
 */
function syncServerUserToClientProfile(serverUser: any, subscription?: ServerSubscriptionInfo): UserProfile {
  const existing = getActiveUser();
  const targetBand = serverUser.targetBand || existing?.progress.targetBand || 7.5;
  const intendedFormat = serverUser.intendedFormat || existing?.progress.intendedFormat || 'Academic';
  const targetCountry = serverUser.targetCountry || existing?.progress.targetCountry || 'United Kingdom / Canada / Australia';

  const userProfile: UserProfile = {
    id: serverUser.id,
    name: serverUser.name || 'Candidate Student',
    email: serverUser.email,
    createdAt: serverUser.createdAt || Date.now(),
    progress: existing && existing.email.toLowerCase() === serverUser.email.toLowerCase()
      ? {
          ...existing.progress,
          targetBand,
          intendedFormat,
          targetCountry
        }
      : {
          ...createDefaultProgress(targetBand, serverUser.name),
          targetCountry,
          intendedFormat
        }
  };

  saveUser(userProfile);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(ACTIVE_USER_KEY, userProfile.id);
  }
  checkAndUpdateStreak(userProfile);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: userProfile }));
  }

  return userProfile;
}
