import { UserProfile } from '../types';
import { auth, FIREBASE_GOOGLE_OAUTH_CONFIG } from '../lib/firebase';
import firebaseAppletConfig from '../../firebase-applet-config.json';
import { openDB } from 'idb';
import {
  saveUser,
  getActiveUser,
  ACTIVE_USER_KEY,
  createDefaultProgress,
  checkAndUpdateStreak
} from '../utils/userStorage';

export const SESSION_TOKEN_KEY = 'ielts_session_token_v2';
export const ACTIVE_SUBSCRIPTION_KEY = 'ielts_user_subscription_v2';
export const LEGACY_AUTH_SESSION_KEY = 'ielts_auth_session';

/**
 * Read a /api response as JSON only when it actually is JSON.
 * On the static Netlify site there is no Express server, so /api/* returns
 * Netlify's HTML 404 page. Calling res.json() on that HTML throws
 * "Unexpected token '<', '<!DOCTYPE '... is not valid JSON" — that raw
 * technical error was surfacing in the sign-in modal. Returns null instead.
 */
async function readJsonSafely(res: Response): Promise<any | null> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

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
  firebaseConfigured: boolean;
  clientId: string | null;
  oAuthClientId: string | null;
  projectId: string;
  authDomain: string;
  redirectUrl: string;
  serverCallbackUrl: string;
  scopes: string[];
  stripeConfigured: boolean;
  smsProviderConfigured?: boolean;
}

export interface AuthResult {
  success: boolean;
  message?: string;
  error?: string;
  user?: UserProfile;
  subscription?: ServerSubscriptionInfo;
  sessionToken?: string;
}

export interface PhoneVerificationStatusResponse {
  smsProviderConfigured: boolean;
  provider: string | null;
  optional: boolean;
}

export interface ClientPhoneNormalization {
  valid: boolean;
  e164?: string;
  national?: string;
  operatorPrefix?: string;
  error?: string;
}

const VALID_BD_PREFIXES = new Set(['013', '014', '015', '016', '017', '018', '019']);

/**
 * Normalizes a Bangladesh mobile phone number on the client before submitting to server.
 */
export function normalizeBangladeshPhoneClient(rawInput: string): ClientPhoneNormalization {
  if (!rawInput || typeof rawInput !== 'string') {
    return { valid: false, error: 'Phone number is required.' };
  }
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { valid: false, error: 'Phone number is required.' };
  }
  const compact = trimmed.replace(/[\s\-()]/g, '');
  if (!/^\+?\d+$/.test(compact)) {
    return {
      valid: false,
      error: 'Phone number must contain digits only (e.g., 01712345678 or +8801712345678).'
    };
  }

  let national = '';
  if (compact.startsWith('+880')) {
    const rest = compact.slice(4);
    national = rest.startsWith('0') ? rest : `0${rest}`;
  } else if (compact.startsWith('880') && compact.length >= 13) {
    const rest = compact.slice(3);
    national = rest.startsWith('0') ? rest : `0${rest}`;
  } else if (compact.startsWith('01')) {
    national = compact;
  } else if (/^1[3-9]\d{8}$/.test(compact)) {
    national = `0${compact}`;
  } else {
    return {
      valid: false,
      error: 'Enter a valid 11-digit Bangladesh mobile number starting with 013–019.'
    };
  }

  if (national.length !== 11) {
    return {
      valid: false,
      error: 'Bangladesh mobile numbers must be 11 digits (01XXXXXXXXX) or 10 digits after +880.'
    };
  }

  const operatorPrefix = national.slice(0, 3);
  if (!VALID_BD_PREFIXES.has(operatorPrefix)) {
    return {
      valid: false,
      error: `Invalid mobile operator prefix "${operatorPrefix}". Supported prefixes are 013–019.`
    };
  }

  return {
    valid: true,
    e164: `+88${national}`,
    national,
    operatorPrefix
  };
}

const DB_NAME = 'bandsprint_auth_db_v1';
const STORE_NAME = 'auth_store';
const DB_VERSION = 1;

async function getAuthDB() {
  try {
    return await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  } catch (err) {
    return null;
  }
}

let memorySessionToken: string | null = null;

if (typeof window !== 'undefined') {
  getAuthDB().then(async (db) => {
    if (db) {
      try {
        memorySessionToken = await db.get(STORE_NAME, 'sessionToken') || null;
      } catch {}
    }
    if (!memorySessionToken && typeof localStorage !== 'undefined') {
      memorySessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
      if (memorySessionToken && db) {
        await db.put(STORE_NAME, memorySessionToken, 'sessionToken').catch(() => {});
      }
    }
  }).catch(() => {});
}

/**
 * Retrieve current stored session token (IndexedDB with localStorage/memory fallback)
 */
export function getStoredSessionToken(): string | null {
  if (memorySessionToken) return memorySessionToken;
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  }
  return null;
}

/**
 * Store session token in IndexedDB and browser storage
 */
export function storeSessionToken(token: string): void {
  memorySessionToken = token;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  getAuthDB().then((db) => {
    if (db) {
      db.put(STORE_NAME, token, 'sessionToken').catch(() => {});
    }
  }).catch(() => {});
}

/**
 * Clear session token and legacy auth markers from IndexedDB and storage
 */
export function clearSessionToken(): void {
  memorySessionToken = null;
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(ACTIVE_SUBSCRIPTION_KEY);
    localStorage.removeItem(LEGACY_AUTH_SESSION_KEY);
  }
  getAuthDB().then((db) => {
    if (db) {
      db.delete(STORE_NAME, 'sessionToken').catch(() => {});
      db.delete(STORE_NAME, 'subscription').catch(() => {});
    }
  }).catch(() => {});
}

/**
 * Returns the canonical Firebase & Google OAuth handshake mapping derived from
 * firebase-applet-config.json and the active browser origin.
 */
export function getFirebaseGoogleAuthConfig() {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin.replace(/\/$/, '')
      : '';
  const oAuthClientId =
    FIREBASE_GOOGLE_OAUTH_CONFIG.oAuthClientId ||
    String((firebaseAppletConfig as { oAuthClientId?: string }).oAuthClientId || '').trim() ||
    null;
  const authDomain = FIREBASE_GOOGLE_OAUTH_CONFIG.authDomain || firebaseAppletConfig.authDomain;
  return {
    firebaseConfigured: Boolean(firebaseAppletConfig.apiKey && firebaseAppletConfig.projectId),
    projectId: FIREBASE_GOOGLE_OAUTH_CONFIG.projectId || firebaseAppletConfig.projectId,
    authDomain,
    oAuthClientId,
    redirectUrl: `https://${authDomain}/__/auth/handler`,
    serverCallbackUrl: origin ? `${origin}/api/auth/google/callback` : '/api/auth/google/callback',
    scopes: [...FIREBASE_GOOGLE_OAUTH_CONFIG.scopes]
  };
}

/**
 * Fetch server-side auth configuration merged with Firebase Google OAuth metadata
 */
export async function fetchAuthConfig(): Promise<AuthConfigResponse> {
  const fbAuth = getFirebaseGoogleAuthConfig();
  try {
    const res = await fetch('/api/auth/config');
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      return {
        configured: false,
        firebaseConfigured: fbAuth.firebaseConfigured,
        clientId: fbAuth.oAuthClientId,
        oAuthClientId: fbAuth.oAuthClientId,
        projectId: fbAuth.projectId,
        authDomain: fbAuth.authDomain,
        redirectUrl: fbAuth.redirectUrl,
        serverCallbackUrl: fbAuth.serverCallbackUrl,
        scopes: fbAuth.scopes,
        stripeConfigured: false,
        smsProviderConfigured: false
      };
    }
    const serverData = await res.json();
    const resolvedClientId = serverData.clientId || serverData.oAuthClientId || fbAuth.oAuthClientId;
    return {
      configured: Boolean(serverData.configured),
      firebaseConfigured:
        typeof serverData.firebaseConfigured === 'boolean'
          ? serverData.firebaseConfigured
          : fbAuth.firebaseConfigured,
      clientId: resolvedClientId,
      oAuthClientId: serverData.oAuthClientId || fbAuth.oAuthClientId || resolvedClientId,
      projectId: serverData.projectId || fbAuth.projectId,
      authDomain: serverData.authDomain || fbAuth.authDomain,
      redirectUrl: serverData.redirectUrl || fbAuth.redirectUrl,
      serverCallbackUrl: serverData.callbackUrl || fbAuth.serverCallbackUrl,
      scopes: Array.isArray(serverData.scopes) && serverData.scopes.length > 0 ? serverData.scopes : fbAuth.scopes,
      stripeConfigured: Boolean(serverData.stripeConfigured),
      smsProviderConfigured: Boolean(serverData.smsProviderConfigured)
    };
  } catch (err) {
    return {
      configured: false,
      firebaseConfigured: fbAuth.firebaseConfigured,
      clientId: fbAuth.oAuthClientId,
      oAuthClientId: fbAuth.oAuthClientId,
      projectId: fbAuth.projectId,
      authDomain: fbAuth.authDomain,
      redirectUrl: fbAuth.redirectUrl,
      serverCallbackUrl: fbAuth.serverCallbackUrl,
      scopes: fbAuth.scopes,
      stripeConfigured: false,
      smsProviderConfigured: false
    };
  }
}

/**
 * Checks whether a real SMS OTP gateway is configured on the server
 */
export async function fetchPhoneVerificationStatus(): Promise<PhoneVerificationStatusResponse> {
  try {
    const res = await fetch('/api/auth/phone/status');
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      return { smsProviderConfigured: false, provider: null, optional: true };
    }
    return await res.json();
  } catch {
    return { smsProviderConfigured: false, provider: null, optional: true };
  }
}

/**
 * Requests a real SMS OTP code from the server for the currently authenticated user
 */
export async function requestServerPhoneOtp(phone: string): Promise<{
  success: boolean;
  code?: string;
  error?: string;
  normalizedPhone?: string;
  expiresAt?: number;
  resendAvailableAt?: number;
  retryAfterSeconds?: number;
}> {
  const token = getStoredSessionToken();
  if (!token) {
    return {
      success: false,
      error: 'Please sign in with Google or Email first before verifying a phone number.'
    };
  }

  try {
    const res = await fetch('/api/auth/phone/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        code: data.code,
        error: data.error || 'Unable to send verification SMS.',
        retryAfterSeconds: data.retryAfterSeconds,
        resendAvailableAt: data.resendAvailableAt
      };
    }
    return {
      success: true,
      normalizedPhone: data.normalizedPhone,
      expiresAt: data.expiresAt,
      resendAvailableAt: data.resendAvailableAt
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error while requesting SMS verification code.'
    };
  }
}

/**
 * Verifies a 6-digit SMS OTP code with the server
 */
export async function verifyServerPhoneOtp(
  phone: string,
  code: string
): Promise<{
  success: boolean;
  error?: string;
  remainingAttempts?: number;
  user?: UserProfile;
}> {
  const token = getStoredSessionToken();
  if (!token) {
    return {
      success: false,
      error: 'Your authentication session has expired. Please sign in again.'
    };
  }

  try {
    const res = await fetch('/api/auth/phone/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ phone, code })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Verification failed. Please check the code and try again.',
        remainingAttempts: data.remainingAttempts
      };
    }

    const updatedProfile = syncServerUserToClientProfile(data.user);
    return {
      success: true,
      user: updatedProfile
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error while verifying SMS code.'
    };
  }
}

/**
 * Exchanges a verified Firebase ID token for an Express server session token,
 * ensuring Firebase UID and server user identity remain unified.
 */
export async function bridgeFirebaseSessionWithServer(
  idToken: string,
  profileHints?: {
    name?: string;
    targetBand?: number;
    intendedFormat?: 'Academic' | 'General Training';
    targetCountry?: string;
  }
): Promise<AuthResult> {
  try {
    // Fail fast: on the static Netlify site there is no Express server, so
    // /api/auth/firebase-session 404s. Without a timeout a slow network
    // could stall sign-in for many seconds waiting on a dead endpoint.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    let res: Response;
    try {
      res = await fetch('/api/auth/firebase-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          ...profileHints
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await readJsonSafely(res);
    if (!res.ok || !data) {
      // No server on static hosting: Firebase login still works, the
      // server session is simply skipped. Never surface a JSON parse error.
      return {
        success: false,
        error: 'Server session is not available on this site — signed in with Firebase only.'
      };
    }
    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Failed to establish server session from Firebase token.'
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
      message: `Authenticated as ${clientUser.name}`
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'Server session is not available on this site — signed in with Firebase only.'
    };
  }
}

/**
 * Initiate real Google OAuth 2.0 redirect flow (explicit cross-domain origin binding)
 */
export async function initiateGoogleOAuthRedirect(): Promise<{ success: boolean; error?: string }> {
  try {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const query = currentOrigin ? `?origin=${encodeURIComponent(currentOrigin)}` : '';
    const res = await fetch(`/api/auth/google/url${query}`);
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
      if (data.state && typeof sessionStorage !== 'undefined') {
        try {
          sessionStorage.setItem('bandsprint_oauth_state', String(data.state));
        } catch {}
      }
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

    const data = await readJsonSafely(res);
    if (!res.ok || !data) {
      return {
        success: false,
        error: 'Google credential could not be verified with the server. Please use Firebase Google login.'
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
      message: `Successfully authenticated with Google as ${clientUser.name}!`
    };
  } catch (err: any) {
    console.error('[authService] verifyGoogleCredentialToken error:', err);
    return {
      success: false,
      error: 'Network failure while verifying Google credential. Please try again.'
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

    const data = await readJsonSafely(res);
    if (!data) {
      return {
        success: false,
        error: 'SERVER_UNAVAILABLE'
      };
    }
    if (!res.ok || data.success === false) {
      return {
        success: false,
        error: data.error || 'Registration failed. Please check your details.'
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
      message: `Account created successfully! Welcome to BandSprint, ${clientUser.name}.`
    };
  } catch (err: any) {
    console.error('[authService] register error:', err);
    return {
      success: false,
      error: 'Network error during registration. Please check your connection and try again.'
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

    const data = await readJsonSafely(res);
    if (!data) {
      return {
        success: false,
        error: 'SERVER_UNAVAILABLE'
      };
    }
    if (!res.ok || data.success === false) {
      return {
        success: false,
        error: data.error || 'Invalid email or password. Please try again.'
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
      error: 'Network error during login. Please check your connection and try again.'
    };
  }
}

/**
 * Validates current session against server and retrieves verified profile & subscription
 */
export async function validateCurrentServerSession(): Promise<AuthResult> {
  const token = getStoredSessionToken();

  // Wait for Firebase Auth IndexedDB persistence to finish hydrating before checking currentUser
  try {
    await auth.authStateReady();
  } catch {}

  // If token is missing, attempt auto-refresh from Firebase Auth current user if available
  if (!token && auth.currentUser) {
    try {
      const freshIdToken = await auth.currentUser.getIdToken(true);
      if (freshIdToken) {
        const bridgeRes = await bridgeFirebaseSessionWithServer(freshIdToken, {
          name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'IELTS Candidate'
        });
        if (bridgeRes.success && bridgeRes.user) {
          return {
            success: true,
            user: bridgeRes.user,
            subscription: bridgeRes.subscription,
            sessionToken: bridgeRes.sessionToken
          };
        }
      }
    } catch (refreshErr) {
      console.warn('[authService] Auto-refresh from Firebase Auth failed:', refreshErr);
    }
  }

  // Fallback to local active user if no token
  if (!token) {
    const existing = getActiveUser();
    if (existing && existing.id && existing.id !== 'default_candidate') {
      return { success: true, user: existing };
    }
    return { success: false, error: 'No active session token' };
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      // If server session expired or server restarted, attempt token refresh via Firebase Auth if available
      if (auth.currentUser) {
        try {
          const freshIdToken = await auth.currentUser.getIdToken(true);
          if (freshIdToken) {
            const bridgeRes = await bridgeFirebaseSessionWithServer(freshIdToken);
            if (bridgeRes.success && bridgeRes.user) {
              return {
                success: true,
                user: bridgeRes.user,
                subscription: bridgeRes.subscription,
                sessionToken: bridgeRes.sessionToken
              };
            }
          }
        } catch {}
      }

      // Fallback to local active user if available rather than clearing session
      const existing = getActiveUser();
      if (existing && existing.id && existing.id !== 'default_candidate') {
        return { success: true, user: existing };
      }

      clearSessionToken();
      return { success: false, error: 'Session expired or invalidated' };
    }

    const data = await res.json();
    if (data.subscription && typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_SUBSCRIPTION_KEY, JSON.stringify(data.subscription));
    }

    const clientUser = syncServerUserToClientProfile(data.user, data.subscription);

    try {
      if (typeof localStorage !== 'undefined' && clientUser) {
        saveUser(clientUser);
        localStorage.setItem(ACTIVE_USER_KEY, clientUser.id);
      }
    } catch {}

    return {
      success: true,
      user: clientUser,
      subscription: data.subscription,
      sessionToken: token
    };
  } catch (err: any) {
    // If network fails temporarily or server restarted, fallback to local active user
    const existing = getActiveUser();
    return {
      success: !!(existing && existing.id !== 'default_candidate'),
      user: existing || undefined,
      error: err.message
    };
  }
}

/**
 * Sign out and invalidate server session and all local authentication markers
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
    localStorage.removeItem(LEGACY_AUTH_SESSION_KEY);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: null }));
  }
}

/**
 * Preserves existing client user progress (vocabulary, exam history, streaks) while synchronizing server profile
 */
export function syncServerUserToClientProfile(serverUser: any, _subscription?: ServerSubscriptionInfo): UserProfile {
  const existing = getActiveUser();
  const targetBand = serverUser.targetBand || existing?.progress.targetBand || 7.5;
  const intendedFormat = serverUser.intendedFormat || existing?.progress.intendedFormat || 'Academic';
  const targetCountry =
    serverUser.targetCountry || existing?.progress.targetCountry || 'United Kingdom / Canada / Australia';

  const userProfile: UserProfile = {
    id: serverUser.id,
    name: serverUser.name || 'Candidate Student',
    email: serverUser.email,
    createdAt: serverUser.createdAt || Date.now(),
    progress:
      existing && existing.email.toLowerCase() === serverUser.email.toLowerCase()
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
    // Remove any legacy unverified mock session object so session restoration relies on verified state
    localStorage.removeItem(LEGACY_AUTH_SESSION_KEY);
  }
  checkAndUpdateStreak(userProfile);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: userProfile }));
  }

  return userProfile;
}
