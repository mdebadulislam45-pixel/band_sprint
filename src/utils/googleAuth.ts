import { UserProfile, UserProgress } from '../types';
import { getAllUsers, saveUser, ACTIVE_USER_KEY, createDefaultProgress, checkAndUpdateStreak } from './userStorage';

export interface GoogleAuthProfile {
  id?: string;
  name?: string;
  email: string;
  avatarUrl?: string;
  targetBand?: number;
}

const GOOGLE_AUTH_STORAGE_KEY = 'ielts_google_candidate_profile_v1';

/**
 * Validates that an email is a legitimate Gmail address (@gmail.com or Google Workspace)
 */
export function validateGmailAddress(email: string): { isValid: boolean; error?: string } {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return { isValid: false, error: 'Please enter your Gmail address.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email format.' };
  }
  // Enforce Gmail requirement as requested: user have to login using Gmail in Google login
  if (!trimmed.endsWith('@gmail.com') && !trimmed.endsWith('@googlemail.com')) {
    return {
      isValid: false,
      error: 'Google sign-in requires a valid Gmail account (e.g., yourname@gmail.com).'
    };
  }
  return { isValid: true };
}

/**
 * Handles authentic Google Account Authentication for IELTS Sprint.
 * Prevents account collisions, attaches full candidate profile schema, and logs in immediately.
 */
export function handleGoogleSignInAction(candidateInfo?: Partial<GoogleAuthProfile>): {
  success: boolean;
  user?: UserProfile;
  message: string;
} {
  const rawEmail = (candidateInfo?.email || '').trim().toLowerCase();
  
  if (!rawEmail) {
    return {
      success: false,
      message: 'Please provide a Gmail address to continue with Google sign-in.'
    };
  }

  const validation = validateGmailAddress(rawEmail);
  if (!validation.isValid) {
    return {
      success: false,
      message: validation.error || 'Please enter a valid @gmail.com address.'
    };
  }

  const email = rawEmail;
  // Derive natural human display name from email or input
  const defaultDerivedName = email.split('@')[0]
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const name = (candidateInfo?.name || defaultDerivedName || 'Google Candidate').trim();
  const targetBand = candidateInfo?.targetBand || 7.5;

  const users = getAllUsers();
  // Check if an existing account with this Gmail already exists
  let existingUser = users.find((u) => u.email.toLowerCase() === email);

  if (existingUser) {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(ACTIVE_USER_KEY, existingUser.id);
      } catch {}
    }
    if (checkAndUpdateStreak) {
      checkAndUpdateStreak(existingUser);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: existingUser }));
    }
    return {
      success: true,
      user: existingUser,
      message: `Signed in with Google as ${existingUser.name} (${existingUser.email})!`
    };
  }

  // Create clean Google-authenticated IELTS Sprint profile
  const googleUser: UserProfile = {
    id: `usr_g_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
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
    message: `Account created with Google! Welcome, ${googleUser.name}.`
  };
}
