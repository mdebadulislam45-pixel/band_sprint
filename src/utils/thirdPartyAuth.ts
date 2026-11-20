import { UserProfile } from '../types';

/**
 * Checks if third-party test material (Sprint Practice Set 16-18, BC Authentic 3, Private Vault, Sprint Library)
 * is permitted for the given user under the SHOW_THIRD_PARTY_CONTENT environment flag and admin privileges.
 */
export function canShowThirdPartyContent(user?: UserProfile | null): boolean {
  const envFlag = typeof import.meta !== 'undefined' && (
    import.meta.env.SHOW_THIRD_PARTY_CONTENT === 'true' ||
    import.meta.env.VITE_SHOW_THIRD_PARTY_CONTENT === 'true'
  );
  const runtimeWindowFlag = typeof window !== 'undefined' && (window as any).__SHOW_THIRD_PARTY_CONTENT === true;
  
  if (!envFlag && !runtimeWindowFlag) {
    return false;
  }

  if (!user) {
    return false;
  }

  const email = (user.email || '').trim().toLowerCase();
  const adminEmails = (
    (typeof import.meta !== 'undefined' && (import.meta.env.VITE_ADMIN_EMAILS || import.meta.env.ADMIN_EMAILS)) || ''
  ).split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);

  if (adminEmails.length > 0 && adminEmails.includes(email)) {
    return true;
  }

  if ((user as any).isAdmin || (user as any).emailVerified) {
    return true;
  }

  return false;
}
