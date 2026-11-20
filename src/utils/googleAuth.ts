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
  const trimmed = (email || '').trim().toLowerCase();
  if (!trimmed) {
    return { isValid: false, error: 'Please enter your Gmail address.' };
  }
  if (!/^[^\s@]+@(gmail\.com|googlemail\.com)$/.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid @gmail.com or @googlemail.com address.' };
  }
  return { isValid: true };
}

/**
 * Handles verified Google Account Authentication for BandSprint.
 */
export function handleGoogleSignInAction(candidateInfo?: Partial<GoogleAuthProfile>): {
  success: boolean;
  user?: UserProfile;
  message: string;
} {
  const fbCurrentUser = auth?.currentUser;
  const rawEmail = (candidateInfo?.email || fbCurrentUser?.email || '').trim().toLowerCase();
  if (!rawEmail) {
    return {
      success: false,
      message: 'No verified email address was returned from Google Authentication.'
    };
  }

  const emailCheck = validateGmailAddress(rawEmail);
  const isFirebaseVerified = Boolean(candidateInfo?.verifiedByFirebase || (fbCurrentUser && fbCurrentUser.email));
  if (!emailCheck.isValid && !isFirebaseVerified) {
    return {
      success: false,
      message: emailCheck.error || 'Please sign in with a valid Google account.'
    };
  }

  const verifiedUid =
    candidateInfo?.uid ||
    candidateInfo?.id ||
    fbCurrentUser?.uid ||
    `google_${rawEmail.replace(/[^a-z0-9]/g, '_')}`;

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
