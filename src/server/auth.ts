import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { serverDb, type ServerUser, type PhoneOtpChallenge } from './db.ts';

declare global {
  var __DEV_SESSION_SECRET__: string | undefined;
}

function resolveSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[SECURITY WARNING] SESSION_SECRET environment variable is missing or shorter than 32 characters in production. Auto-generating robust ephemeral session secret.'
    );
  }
  if (!globalThis.__DEV_SESSION_SECRET__) {
    globalThis.__DEV_SESSION_SECRET__ = crypto.randomBytes(32).toString('hex');
  }
  return globalThis.__DEV_SESSION_SECRET__;
}

export const SESSION_SECRET = resolveSessionSecret();

interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
  authDomain?: string;
  oAuthClientId?: string;
}

function loadFirebaseAppletConfig(): FirebaseAppletConfig {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return {
        projectId: process.env.FIREBASE_PROJECT_ID || parsed.projectId || 'my-exam-portal-668a9',
        apiKey: process.env.FIREBASE_API_KEY || parsed.apiKey || '',
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || parsed.authDomain,
        oAuthClientId: process.env.GOOGLE_CLIENT_ID || parsed.oAuthClientId
      };
    }
  } catch (err) {
  }
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || 'my-exam-portal-668a9',
    apiKey: process.env.FIREBASE_API_KEY || '',
    oAuthClientId: process.env.GOOGLE_CLIENT_ID
  };
}

export function isMockAuthAllowedInCurrentEnv(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return process.env.NODE_ENV === 'test' && process.env.ALLOW_TEST_FIREBASE_TOKEN === 'true';
}

export const GOOGLE_OAUTH_SCOPES = ['openid', 'email', 'profile'] as const;

interface PendingOAuthState {
  redirectUri: string;
  returnOrigin?: string;
  createdAt: number;
}

const pendingOAuthStates = new Map<string, PendingOAuthState>();
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export function createOAuthState(redirectUri: string, returnOrigin?: string): string {
  const now = Date.now();
  for (const [key, value] of pendingOAuthStates.entries()) {
    if (now - value.createdAt > OAUTH_STATE_TTL_MS) {
      pendingOAuthStates.delete(key);
    }
  }
  const state = crypto.randomBytes(24).toString('hex');
  pendingOAuthStates.set(state, {
    redirectUri,
    returnOrigin,
    createdAt: now
  });
  return state;
}

export function consumeOAuthState(state?: string): PendingOAuthState | null {
  if (!state || typeof state !== 'string') return null;
  const entry = pendingOAuthStates.get(state);
  if (!entry) return null;
  pendingOAuthStates.delete(state);
  if (Date.now() - entry.createdAt > OAUTH_STATE_TTL_MS) {
    return null;
  }
  return entry;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleClientId(): string | null {
  const fbConfig = loadFirebaseAppletConfig();
  return process.env.GOOGLE_CLIENT_ID || fbConfig.oAuthClientId || null;
}

export function getFirebaseAuthMetadata() {
  const fbConfig = loadFirebaseAppletConfig();
  const authDomain = fbConfig.authDomain || `${fbConfig.projectId}.firebaseapp.com`;
  return {
    firebaseConfigured: Boolean(fbConfig.apiKey && fbConfig.projectId),
    projectId: fbConfig.projectId,
    authDomain,
    oAuthClientId: fbConfig.oAuthClientId || null,
    redirectUrl: `https://${authDomain}/__/auth/handler`,
    scopes: [...GOOGLE_OAUTH_SCOPES]
  };
}

export function getGoogleAuthUrl(redirectUri: string, state?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured in server environment.');
  }
  const nonce = crypto.randomBytes(16).toString('hex');
  const actualState = state || crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_OAUTH_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: actualState,
    nonce
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface VerifiedGoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<VerifiedGoogleProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured on server.');
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!tokenRes.ok) {
    const errorBody = await tokenRes.text();
    console.error('[Google OAuth] Token exchange failed:', errorBody);
    throw new Error(`Google token exchange failed: ${tokenRes.status}`);
  }

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error('No access token returned from Google.');
  }

  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });

  if (!userRes.ok) {
    throw new Error('Failed to retrieve user profile from Google.');
  }

  const profile = await userRes.json();
  if (!profile.email) {
    throw new Error('Google account did not provide an email address.');
  }

  return {
    sub: profile.sub,
    email: profile.email.toLowerCase(),
    name: profile.name || profile.email.split('@')[0],
    picture: profile.picture,
    email_verified: profile.email_verified === true || profile.email_verified === 'true'
  };
}

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleProfile> {
  const allowedClientIds = [
    process.env.GOOGLE_CLIENT_ID,
    loadFirebaseAppletConfig().oAuthClientId
  ].filter(Boolean) as string[];

  const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!verifyRes.ok) {
    const errText = await verifyRes.text();
    console.error('[Google TokenInfo] Validation error:', errText);
    throw new Error('Invalid or expired Google credential.');
  }

  const payload = await verifyRes.json();
  if (allowedClientIds.length > 0 && payload.aud && !allowedClientIds.includes(payload.aud)) {
    throw new Error('Google token audience does not match BandSprint client ID.');
  }
  if (payload.iss && payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
    throw new Error('Google token issuer is invalid.');
  }
  if (payload.exp) {
    const expTime = Number(payload.exp) * 1000;
    if (Date.now() > expTime) {
      throw new Error('Google token has expired.');
    }
  }

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email.split('@')[0],
    picture: payload.picture,
    email_verified: payload.email_verified === true || payload.email_verified === 'true'
  };
}

export function findOrCreateGoogleUser(googleUser: VerifiedGoogleProfile): ServerUser {
  let user = serverDb.findUserByGoogleId(googleUser.sub);
  if (user) {
    if (googleUser.picture && !user.avatarUrl) {
      user.avatarUrl = googleUser.picture;
    }
    if (googleUser.email_verified) {
      user.emailVerified = true;
    }
    serverDb.saveUser(user);
    return user;
  }

  // Only link by email if Google explicitly verified the email address
  if (googleUser.email && googleUser.email_verified !== false) {
    user = serverDb.findUserByEmail(googleUser.email);
    if (user) {
      user.googleId = googleUser.sub;
      user.emailVerified = true;
      if (googleUser.picture && !user.avatarUrl) {
        user.avatarUrl = googleUser.picture;
      }
      serverDb.saveUser(user);
      return user;
    }
  }

  const newUser: ServerUser = {
    id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    email: googleUser.email,
    name: googleUser.name,
    avatarUrl: googleUser.picture,
    googleId: googleUser.sub,
    emailVerified: googleUser.email_verified !== false,
    targetBand: 7.5,
    intendedFormat: 'Academic',
    targetCountry: 'United Kingdom / Canada / Australia',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  return serverDb.saveUser(newUser);
}

// ============================================================================
// FIREBASE ID TOKEN VERIFICATION & SERVER SESSION BRIDGE
// ============================================================================

export interface VerifiedFirebaseIdentity {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  googleSub?: string;
  signInProvider?: string;
}

let cachedGoogleCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getGoogleSecureTokenCerts(): Promise<Record<string, string>> {
  if (cachedGoogleCerts && Date.now() < cachedGoogleCerts.expiresAt) {
    return cachedGoogleCerts.certs;
  }

  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch Google SecureToken public certificates (${res.status})`);
  }

  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSeconds = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;

  const certs = (await res.json()) as Record<string, string>;
  cachedGoogleCerts = {
    certs,
    expiresAt: Date.now() + maxAgeSeconds * 1000
  };
  return certs;
}

function base64UrlToBuffer(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLength), 'base64');
}

/**
 * Creates a cryptographically signed test token ONLY for automated regression tests
 * when NODE_ENV === 'test' and ALLOW_TEST_FIREBASE_TOKEN === 'true'.
 * Strictly rejected in production.
 */
export function createSignedTestFirebaseToken(claims: {
  uid: string;
  email: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
  googleSub?: string;
  signInProvider?: string;
  expOffsetSeconds?: number;
  audOverride?: string;
  issOverride?: string;
}): string {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Test Firebase tokens are strictly forbidden in production.');
  }
  const fbConfig = loadFirebaseAppletConfig();
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT', kid: 'test-suite-hmac' };
  const payload = {
    iss: claims.issOverride || `https://securetoken.google.com/${fbConfig.projectId}`,
    aud: claims.audOverride || fbConfig.projectId,
    sub: claims.uid,
    user_id: claims.uid,
    email: claims.email,
    email_verified: claims.emailVerified ?? true,
    name: claims.name || claims.email.split('@')[0],
    picture: claims.picture,
    iat: nowSec - 5,
    exp: nowSec + (claims.expOffsetSeconds ?? 3600),
    firebase: {
      sign_in_provider: claims.signInProvider || 'google.com',
      identities: claims.googleSub ? { 'google.com': [claims.googleSub] } : {}
    }
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(signingInput)
    .digest('base64url');

  return `${signingInput}.${signature}`;
}

/**
 * Verifies a Firebase ID token securely on the server using:
 * 1. Cryptographic RS256 verification against Google's x509 SecureToken certificates + strict JWT claim checks, OR
 * 2. Firebase Identity Toolkit accounts:lookup server verification.
 * Never trusts an unverified client payload, email, or UID.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseIdentity> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Firebase ID token is required.');
  }

  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed Firebase ID token.');
  }

  let header: any;
  let payload: any;
  try {
    header = JSON.parse(base64UrlToBuffer(parts[0]).toString('utf-8'));
    payload = JSON.parse(base64UrlToBuffer(parts[1]).toString('utf-8'));
  } catch {
    throw new Error('Invalid JWT encoding in Firebase ID token.');
  }

  const fbConfig = loadFirebaseAppletConfig();
  const expectedAud = fbConfig.projectId;
  const expectedIss = `https://securetoken.google.com/${expectedAud}`;
  const nowSec = Math.floor(Date.now() / 1000);

  // Common claim validations (enforced for all tokens)
  if (!payload || typeof payload !== 'object') {
    throw new Error('Empty Firebase token payload.');
  }
  if (payload.aud !== expectedAud) {
    throw new Error(`Firebase token audience mismatch (expected ${expectedAud}).`);
  }
  if (payload.iss !== expectedIss) {
    throw new Error(`Firebase token issuer mismatch (expected ${expectedIss}).`);
  }
  if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.length > 128) {
    throw new Error('Firebase token subject (UID) is missing or invalid.');
  }
  if (typeof payload.exp !== 'number' || nowSec >= payload.exp) {
    throw new Error('Firebase ID token has expired.');
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + 300) {
    throw new Error('Firebase ID token issued-at time is invalid.');
  }

  // Test environment HMAC token verification (strictly blocked in production)
  if (header.alg === 'HS256' && header.kid === 'test-suite-hmac') {
    if (!isMockAuthAllowedInCurrentEnv()) {
      throw new Error('Test authentication tokens are forbidden outside controlled test mode.');
    }
    const signingInput = `${parts[0]}.${parts[1]}`;
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(signingInput)
      .digest('base64url');

    const actualBuf = Buffer.from(parts[2]);
    const expectedBuf = Buffer.from(expectedSig);
    if (actualBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(actualBuf, expectedBuf)) {
      throw new Error('Invalid signature on test Firebase token.');
    }

    const googleIdentities = payload.firebase?.identities?.['google.com'];
    return {
      uid: payload.sub,
      email: (payload.email || '').trim().toLowerCase(),
      emailVerified: Boolean(payload.email_verified),
      name: payload.name,
      picture: payload.picture,
      googleSub: Array.isArray(googleIdentities) && googleIdentities[0] ? String(googleIdentities[0]) : undefined,
      signInProvider: payload.firebase?.sign_in_provider
    };
  }

  // Production RS256 cryptographic signature verification
  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported Firebase token signing algorithm.');
  }

  let signatureVerified = false;
  try {
    const certs = await getGoogleSecureTokenCerts();
    const certPem = certs[header.kid];
    if (certPem) {
      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(`${parts[0]}.${parts[1]}`);
      verifier.end();
      signatureVerified = verifier.verify(certPem, base64UrlToBuffer(parts[2]));
      if (!signatureVerified) {
        throw new Error('Cryptographic RSA-SHA256 signature verification failed for Firebase ID token.');
      }
    }
  } catch (certErr: any) {
    if (certErr?.message?.includes('signature verification failed')) {
      throw certErr;
    }
    // If x509 cert endpoint is unreachable, fall back to Identity Toolkit lookup below
  }

  // Fallback or supplemental verification via Google Identity Toolkit accounts:lookup
  if (!signatureVerified) {
    if (!fbConfig.apiKey) {
      throw new Error('Unable to verify Firebase ID token: no public certificate or Firebase API key available.');
    }
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(fbConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      }
    );
    if (!lookupRes.ok) {
      throw new Error('Firebase Identity Toolkit rejected the ID token.');
    }
    const lookupData = await lookupRes.json();
    const account = lookupData?.users?.[0];
    if (!account || account.localId !== payload.sub) {
      throw new Error('Firebase Identity Toolkit account lookup mismatch.');
    }
  }

  if (!payload.email || typeof payload.email !== 'string') {
    throw new Error('Authenticated Firebase account does not contain a valid email address.');
  }

  const googleIdentities = payload.firebase?.identities?.['google.com'];
  return {
    uid: payload.sub,
    email: payload.email.trim().toLowerCase(),
    emailVerified: Boolean(payload.email_verified),
    name: payload.name || payload.email.split('@')[0],
    picture: payload.picture,
    googleSub: Array.isArray(googleIdentities) && googleIdentities[0] ? String(googleIdentities[0]) : undefined,
    signInProvider: payload.firebase?.sign_in_provider
  };
}

/**
 * Safely finds or creates a ServerUser from a verified Firebase identity.
 * - Preserves Firebase UID consistency (new users get id === verified.uid).
 * - Never creates duplicate accounts when linking a verified email.
 * - Never merges accounts by email unless the email is verified.
 */
export function findOrCreateFirebaseUser(
  verified: VerifiedFirebaseIdentity,
  profileHints?: {
    name?: string;
    targetBand?: number;
    intendedFormat?: 'Academic' | 'General Training';
    targetCountry?: string;
  }
): ServerUser {
  // 1. Exact lookup by Firebase UID or primary ID
  let user = serverDb.findUserByFirebaseUid(verified.uid) || serverDb.findUserById(verified.uid);

  // 2. Lookup by Google provider sub if present
  if (!user && verified.googleSub) {
    user = serverDb.findUserByGoogleId(verified.googleSub);
  }

  // 3. Safe account linking by email ONLY when email is verified by the provider
  if (!user && verified.email) {
    const existingByEmail = serverDb.findUserByEmail(verified.email);
    if (existingByEmail) {
      if (!verified.emailVerified) {
        throw new Error(
          'An account with this email already exists. Please verify your email address before linking providers.'
        );
      }
      user = existingByEmail;
    }
  }

  const resolvedName =
    (profileHints?.name && profileHints.name.trim()) ||
    verified.name ||
    user?.name ||
    verified.email.split('@')[0];

  if (user) {
    user.firebaseUid = verified.uid;
    if (verified.googleSub && !user.googleId) {
      user.googleId = verified.googleSub;
    }
    if (verified.emailVerified) {
      user.emailVerified = true;
    }
    if (verified.picture && !user.avatarUrl) {
      user.avatarUrl = verified.picture;
    }
    if (resolvedName && (!user.name || user.name === user.email.split('@')[0])) {
      user.name = resolvedName;
    }
    if (typeof profileHints?.targetBand === 'number') {
      user.targetBand = profileHints.targetBand;
    }
    if (profileHints?.intendedFormat === 'Academic' || profileHints?.intendedFormat === 'General Training') {
      user.intendedFormat = profileHints.intendedFormat;
    }
    if (profileHints?.targetCountry) {
      user.targetCountry = profileHints.targetCountry;
    }
    return serverDb.saveUser(user);
  }

  // Create new ServerUser with id === verified.uid so Firebase UID and Express userId are 100% identical
  const newUser: ServerUser = {
    id: verified.uid,
    firebaseUid: verified.uid,
    email: verified.email,
    name: resolvedName,
    avatarUrl: verified.picture,
    googleId: verified.googleSub,
    emailVerified: verified.emailVerified,
    isPhoneVerified: false,
    targetBand: typeof profileHints?.targetBand === 'number' ? profileHints.targetBand : 7.5,
    intendedFormat: profileHints?.intendedFormat === 'General Training' ? 'General Training' : 'Academic',
    targetCountry: profileHints?.targetCountry || 'United Kingdom / Canada / Australia',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  return serverDb.saveUser(newUser);
}

// ============================================================================
// BANGLADESH PHONE NORMALIZATION & SERVER-SIDE OTP VERIFICATION
// ============================================================================

export interface NormalizedBangladeshPhone {
  valid: boolean;
  e164?: string;
  national?: string;
  operatorPrefix?: string;
  error?: string;
}

const VALID_BD_OPERATOR_PREFIXES = new Set(['013', '014', '015', '016', '017', '018', '019']);

/**
 * Normalizes Bangladesh mobile numbers into canonical E.164 format (+8801[3-9]XXXXXXXX).
 * Accepts:
 *  - 01712345678
 *  - 1712345678
 *  - 8801712345678
 *  - +8801712345678
 *  - Formatted variants with spaces or hyphens (e.g. "+880 1712-345678")
 */
export function normalizeBangladeshPhone(rawInput: string): NormalizedBangladeshPhone {
  if (!rawInput || typeof rawInput !== 'string') {
    return { valid: false, error: 'Phone number is required.' };
  }

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { valid: false, error: 'Phone number is required.' };
  }

  // Strip formatting characters (spaces, hyphens, parentheses)
  const compact = trimmed.replace(/[\s\-()]/g, '');

  // Reject any characters other than leading '+' and digits
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
      error: 'Bangladesh mobile numbers must be exactly 11 digits (01XXXXXXXXX) or 10 digits after +880.'
    };
  }

  const operatorPrefix = national.slice(0, 3);
  if (!VALID_BD_OPERATOR_PREFIXES.has(operatorPrefix)) {
    return {
      valid: false,
      error: `Invalid mobile operator prefix "${operatorPrefix}". Supported prefixes are 013, 014, 015, 016, 017, 018, and 019.`
    };
  }

  if (!/^01[3-9]\d{8}$/.test(national)) {
    return {
      valid: false,
      error: 'Invalid Bangladesh mobile number format.'
    };
  }

  return {
    valid: true,
    e164: `+88${national}`,
    national,
    operatorPrefix
  };
}

export function isSmsProviderConfigured(): boolean {
  const hasTwilio = Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
  );
  const hasBulkSmsBd = Boolean(
    process.env.BULKSMSBD_API_KEY && process.env.BULKSMSBD_SENDER_ID
  );
  const hasSslWireless = Boolean(
    process.env.SSL_WIRELESS_API_TOKEN && process.env.SSL_WIRELESS_SID
  );
  return hasTwilio || hasBulkSmsBd || hasSslWireless;
}

export function getConfiguredSmsProviderName(): 'twilio' | 'bulksmsbd' | 'sslwireless' | null {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
    return 'twilio';
  }
  if (process.env.BULKSMSBD_API_KEY && process.env.BULKSMSBD_SENDER_ID) {
    return 'bulksmsbd';
  }
  if (process.env.SSL_WIRELESS_API_TOKEN && process.env.SSL_WIRELESS_SID) {
    return 'sslwireless';
  }
  return null;
}

function hashOtpCode(code: string, salt: string): string {
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${salt}:${code}`)
    .digest('hex');
}

async function dispatchSmsViaProvider(e164Phone: string, otpCode: string): Promise<void> {
  const provider = getConfiguredSmsProviderName();
  const message = `Your BandSprint verification code is ${otpCode}. It expires in 5 minutes. Do not share this code.`;

  if (provider === 'twilio') {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const token = process.env.TWILIO_AUTH_TOKEN!;
    const from = process.env.TWILIO_FROM_NUMBER!;
    const authHeader = Buffer.from(`${sid}:${token}`).toString('base64');

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: e164Phone,
        From: from,
        Body: message
      })
    });
    if (!res.ok) {
      throw new Error(`SMS gateway failed with status ${res.status}`);
    }
    return;
  }

  if (provider === 'bulksmsbd') {
    const apiKey = process.env.BULKSMSBD_API_KEY!;
    const senderId = process.env.BULKSMSBD_SENDER_ID!;
    const number = e164Phone.replace(/^\+/, '');
    const res = await fetch('http://bulksmsbd.net/api/smsapi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        type: 'text',
        number,
        senderid: senderId,
        message
      })
    });
    if (!res.ok) {
      throw new Error(`BulkSMSBD gateway failed with status ${res.status}`);
    }
    return;
  }

  if (provider === 'sslwireless') {
    const apiToken = process.env.SSL_WIRELESS_API_TOKEN!;
    const sid = process.env.SSL_WIRELESS_SID!;
    const msisdn = e164Phone.replace(/^\+/, '');
    const res = await fetch('https://smsplus.sslwireless.com/api/v3/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_token: apiToken,
        sid,
        msisdn,
        sms: message,
        csms_id: `ielts_${Date.now()}`
      })
    });
    if (!res.ok) {
      throw new Error(`SSL Wireless SMS gateway failed with status ${res.status}`);
    }
    return;
  }

  throw new Error('No SMS provider is configured.');
}

export const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const OTP_RESEND_COOLDOWN_MS = 45 * 1000; // 45 seconds
export const OTP_MAX_ATTEMPTS = 5;

export interface RequestOtpResult {
  success: boolean;
  code?: 'INVALID_PHONE' | 'USER_NOT_FOUND' | 'COOLDOWN_ACTIVE' | 'SMS_PROVIDER_UNAVAILABLE' | 'DELIVERY_FAILED';
  error?: string;
  normalizedPhone?: string;
  expiresAt?: number;
  resendAvailableAt?: number;
  retryAfterSeconds?: number;
}

export async function requestPhoneOtpChallenge(
  userId: string,
  rawPhone: string,
  options?: {
    now?: number;
    customSenderForTest?: (e164Phone: string, otpCode: string) => Promise<void>;
  }
): Promise<RequestOtpResult> {
  const now = options?.now ?? Date.now();
  const user = serverDb.findUserById(userId);
  if (!user) {
    return {
      success: false,
      code: 'USER_NOT_FOUND',
      error: 'Authenticated user record not found.'
    };
  }

  const normalized = normalizeBangladeshPhone(rawPhone);
  if (!normalized.valid || !normalized.e164) {
    return {
      success: false,
      code: 'INVALID_PHONE',
      error: normalized.error || 'Invalid Bangladesh phone number.'
    };
  }

  const existing = serverDb.getOtpChallenge(userId);
  if (existing && !existing.consumedAt && now < existing.resendAvailableAt) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resendAvailableAt - now) / 1000));
    return {
      success: false,
      code: 'COOLDOWN_ACTIVE',
      error: `Please wait ${retryAfterSeconds} seconds before requesting another verification code.`,
      retryAfterSeconds,
      resendAvailableAt: existing.resendAvailableAt
    };
  }

  const allowTestSender = Boolean(options?.customSenderForTest && isMockAuthAllowedInCurrentEnv());
  if (!isSmsProviderConfigured() && !allowTestSender) {
    return {
      success: false,
      code: 'SMS_PROVIDER_UNAVAILABLE',
      error:
        'Live SMS gateway is not configured in this environment. Phone verification is optional and your account is already active.'
    };
  }

  const otpCode = String(crypto.randomInt(100000, 1000000));
  const otpSalt = crypto.randomBytes(16).toString('hex');
  const otpHash = hashOtpCode(otpCode, otpSalt);

  const challenge: PhoneOtpChallenge = {
    userId,
    phone: normalized.e164,
    otpHash,
    otpSalt,
    createdAt: now,
    expiresAt: now + OTP_EXPIRY_MS,
    resendAvailableAt: now + OTP_RESEND_COOLDOWN_MS,
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS
  };

  try {
    if (allowTestSender && options?.customSenderForTest) {
      await options.customSenderForTest(normalized.e164, otpCode);
    } else {
      await dispatchSmsViaProvider(normalized.e164, otpCode);
    }
  } catch (err: any) {
    return {
      success: false,
      code: 'DELIVERY_FAILED',
      error: err?.message || 'Failed to dispatch SMS verification code. Please try again later.'
    };
  }

  serverDb.saveOtpChallenge(challenge);

  return {
    success: true,
    normalizedPhone: normalized.e164,
    expiresAt: challenge.expiresAt,
    resendAvailableAt: challenge.resendAvailableAt
  };
}

export interface VerifyOtpResult {
  success: boolean;
  code?:
    | 'INVALID_PHONE'
    | 'INVALID_OTP_FORMAT'
    | 'NO_ACTIVE_CHALLENGE'
    | 'OTP_ALREADY_USED'
    | 'OTP_EXPIRED'
    | 'MAX_ATTEMPTS_EXCEEDED'
    | 'PHONE_MISMATCH'
    | 'INCORRECT_OTP'
    | 'USER_NOT_FOUND';
  error?: string;
  remainingAttempts?: number;
  user?: ServerUser;
}

export function verifyPhoneOtpChallenge(
  userId: string,
  rawPhone: string,
  submittedCode: string,
  options?: { now?: number }
): VerifyOtpResult {
  const now = options?.now ?? Date.now();
  const user = serverDb.findUserById(userId);
  if (!user) {
    return {
      success: false,
      code: 'USER_NOT_FOUND',
      error: 'Authenticated user record not found.'
    };
  }

  const normalized = normalizeBangladeshPhone(rawPhone);
  if (!normalized.valid || !normalized.e164) {
    return {
      success: false,
      code: 'INVALID_PHONE',
      error: normalized.error || 'Invalid Bangladesh phone number.'
    };
  }

  const cleanCode = (submittedCode || '').trim();
  if (!/^\d{6}$/.test(cleanCode)) {
    return {
      success: false,
      code: 'INVALID_OTP_FORMAT',
      error: 'Verification code must be a 6-digit number.'
    };
  }

  const challenge = serverDb.getOtpChallenge(userId);
  if (!challenge) {
    return {
      success: false,
      code: 'NO_ACTIVE_CHALLENGE',
      error: 'No active verification code found. Please request a new SMS code.'
    };
  }

  if (challenge.consumedAt) {
    return {
      success: false,
      code: 'OTP_ALREADY_USED',
      error: 'This verification code has already been used. Please request a new code if needed.'
    };
  }

  if (challenge.phone !== normalized.e164) {
    return {
      success: false,
      code: 'PHONE_MISMATCH',
      error: 'Phone number does not match the number where the verification code was sent.'
    };
  }

  if (now > challenge.expiresAt) {
    return {
      success: false,
      code: 'OTP_EXPIRED',
      error: 'Verification code has expired. Please request a new SMS code.'
    };
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    return {
      success: false,
      code: 'MAX_ATTEMPTS_EXCEEDED',
      error: 'Maximum verification attempts exceeded. Please request a new SMS code.'
    };
  }

  challenge.attempts += 1;
  serverDb.saveOtpChallenge(challenge);

  const candidateHash = hashOtpCode(cleanCode, challenge.otpSalt);
  const expectedBuf = Buffer.from(challenge.otpHash, 'hex');
  const candidateBuf = Buffer.from(candidateHash, 'hex');
  const isMatch =
    expectedBuf.length === candidateBuf.length && crypto.timingSafeEqual(expectedBuf, candidateBuf);

  if (!isMatch) {
    const remainingAttempts = Math.max(0, challenge.maxAttempts - challenge.attempts);
    return {
      success: false,
      code: remainingAttempts === 0 ? 'MAX_ATTEMPTS_EXCEEDED' : 'INCORRECT_OTP',
      error:
        remainingAttempts === 0
          ? 'Maximum verification attempts exceeded. Please request a new SMS code.'
          : `Incorrect verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
      remainingAttempts
    };
  }

  challenge.consumedAt = now;
  serverDb.saveOtpChallenge(challenge);

  user.phone = normalized.e164;
  user.isPhoneVerified = true;
  user.phoneVerifiedAt = now;
  const savedUser = serverDb.saveUser(user);

  return {
    success: true,
    user: savedUser
  };
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const testHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
}