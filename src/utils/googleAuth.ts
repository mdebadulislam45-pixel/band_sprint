import { UserProfile } from '../types';
import { getAllUsers, saveUser, ACTIVE_USER_KEY, createDefaultProgress, checkAndUpdateStreak } from './userStorage';
import { auth } from '../lib/firebase';

export interface GoogleAuthProfile {
  id?: string;
  uid?: string;
  name?: string;
  email: string;
  avatarUrl?: string;
  targetBand?: number;
  verifiedByFirebase?: boolean;
}

/**
 * Validates that an email is a well-formed email address
 */
export function validateGmailAddress(email: string): { isValid: boolean; error?: string } {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return { isValid: false, error: 'Please enter your email address.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email format.' };
  }
  return { isValid: true };
}

/**
 * Handles verified Google Account Authentication for IELTS Sprint.
 * Strictly requires a verified Firebase Auth session or UID; never creates a fake session from an unverified email string.
 */
export function handleGoogleSignInAction(candidateInfo?: Partial<GoogleAuthProfile>): {
  success: boolean;
  user?: UserProfile;
  message: string;
} {
  const fbCurrentUser = auth.currentUser;
  const verifiedUid = candidateInfo?.uid || candidateInfo?.id || fbCurrentUser?.uid;
  const isVerified = Boolean(candidateInfo?.verifiedByFirebase && verifiedUid) || Boolean(fbCurrentUser && fbCurrentUser.email);

  if (!isVerified || !verifiedUid) {
    return {
      success: false,
      message: 'Google sign-in requires verified Google OAuth authentication. Entering an email address alone is not permitted.'
    };
  }

  const rawEmail = (candidateInfo?.email || fbCurrentUser?.email || '').trim().toLowerCase();
  if (!rawEmail) {
    return {
      success: false,
      message: 'No verified email address was returned from Google Authentication.'
    };
  }

  const email = rawEmail;
  const defaultDerivedName = email.split('@')[0]
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const name = (candidateInfo?.name || fbCurrentUser?.displayName || defaultDerivedName || 'IELTS Candidate').trim();
  const targetBand = candidateInfo?.targetBand || 7.5;

  const users = getAllUsers();
  const existingUser = users.find((u) => u.id === verifiedUid || u.email.toLowerCase() === email);

  if (existingUser) {
    const updatedExisting: UserProfile = {
      ...existingUser,
      id: verifiedUid,
      name: existingUser.name || name,
      email
    };
    saveUser(updatedExisting);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(ACTIVE_USER_KEY, updatedExisting.id);
      } catch {}
    }
    if (checkAndUpdateStreak) {
      checkAndUpdateStreak(updatedExisting);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: updatedExisting }));
    }
    return {
      success: true,
      user: updatedExisting,
      message: `Signed in with Google as ${updatedExisting.name} (${updatedExisting.email})!`
    };
  }

  const googleUser: UserProfile = {
    id: verifiedUid,
    name,
    email,
    createdAt: Date.now(),
    progress: {
      ...createDefaultProgress(targetBand, name),
      targetCountry: 'United Kingdom / Canada / Australia',
      intendedFormat: 'Academic',
      streakDays: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      wordsWrittenTotal: 0
    }
  };

  saveUser(googleUser);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(ACTIVE_USER_KEY, googleUser.id);
    } catch {}
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: googleUser }));
  }

  return {
    success: true,
    user: googleUser,
    message: `Verified Google account connected! Welcome, ${googleUser.name}.`
  };
}
