import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Use explicit VITE_FIREBASE_AUTH_DOMAIN if configured; otherwise use the provisioned Firebase authDomain
const envAuthDomain =
  typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN
    ? String((import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN).trim()
    : '';

const resolvedAuthDomain = envAuthDomain || firebaseConfig.authDomain;
const resolvedOAuthClientId = String((firebaseConfig as { oAuthClientId?: string }).oAuthClientId || '').trim();

export const FIREBASE_GOOGLE_OAUTH_SCOPES = ['openid', 'email', 'profile'] as const;

export const FIREBASE_GOOGLE_OAUTH_CONFIG = {
  projectId: firebaseConfig.projectId,
  authDomain: resolvedAuthDomain,
  oAuthClientId: resolvedOAuthClientId,
  redirectUrl: `https://${resolvedAuthDomain}/__/auth/handler`,
  scopes: [...FIREBASE_GOOGLE_OAUTH_SCOPES]
} as const;

const resolvedConfig = {
  ...firebaseConfig,
  authDomain: resolvedAuthDomain
};

// Initialize Firebase App
export const app = initializeApp(resolvedConfig);

// Initialize Cloud Firestore using the configured database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Authentication & set local persistence
export const auth = getAuth(app);
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
  });
}

export const googleAuthProvider = new GoogleAuthProvider();
FIREBASE_GOOGLE_OAUTH_SCOPES.forEach((scope) => {
  googleAuthProvider.addScope(scope);
});
// NOTE: no prompt:'select_account' here on purpose. Forcing the account
// chooser on every sign-in added a full extra step for returning users and
// made Google sign-in feel slow. Google still shows the chooser when the
// user has multiple accounts or is signed out.

export {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  firebaseSignOut
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Standardized Firestore error handler providing structured telemetry
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// NOTE: removed the startup testConnection() Firestore read (getDocFromServer
// on test/connection 1.2s after load). It was a dev diagnostic that cost a
// server round-trip on every first visit and slowed the pre-login page.
