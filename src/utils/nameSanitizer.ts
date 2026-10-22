/**
 * IELTS Sprint - Candidate Name Sanitizer
 *
 * Ensures candidate display names are always clean, professional, and personal.
 * Sanitizes raw emails, database IDs (usr_123), numeric suffixes (Imran001),
 * and Honorific prefixes (Md/Mohammad) to display a crisp first name.
 */
export function sanitizeCandidateName(name?: string, email?: string): string {
  if (name && name.trim()) {
    let clean = name.trim();
    if (clean.includes('@')) {
      clean = clean.split('@')[0];
    }
    // Remove database ID patterns like usr_123 or candidate_456
    clean = clean.replace(/^(usr|user|cand|candidate|id)[-_]/i, '');
    // Remove trailing numbers (e.g. Imran001 -> Imran)
    clean = clean.replace(/\d+$/, '');
    clean = clean.replace(/[_-]+/g, ' ');
    // Split camelCase if present
    clean = clean.replace(/([a-z])([A-Z])/g, '$1 $2');

    // Pick the most meaningful name token (skip prefix like Md / Md. / Mohammad if secondary token exists)
    const tokens = clean.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 1 && /^md\.?$|^mohammad$/i.test(tokens[0])) {
      const candidate = tokens[1].replace(/[^a-zA-Z]/g, '');
      if (candidate.length >= 2) {
        return candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
      }
    }
    if (tokens.length > 0) {
      const first = tokens[0].replace(/[^a-zA-Z]/g, '');
      if (first.length >= 2) {
        return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
      }
    }
  }

  if (email && email.trim()) {
    let username = email.trim().split('@')[0];
    username = username.replace(/\d+$/, '');
    username = username.replace(/^md\.?|^mohammad\.?|^md/i, '');
    username = username.replace(/[._-]+/g, ' ').trim();
    const parts = username.split(/\s+/).filter(Boolean);
    if (parts.length > 0) {
      const part = parts[0].replace(/[^a-zA-Z]/g, '');
      if (part.length >= 2) {
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      }
    }
  }

  return 'Candidate';
}
