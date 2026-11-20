/**
 * Cross-device Spelling Lab mastery storage.
 * Kept lightweight so pre-login chunks never import Firebase directly.
 */

export interface SpellingProgressState {
  correctCount: number;
  attemptedCount: number;
  masteredWords: string[];
  wrongWords: string[];
}

export const SPELLING_PROGRESS_STORAGE_KEY = 'bandsprint_spelling_progress_v1';

const DEFAULT_SPELLING_PROGRESS: SpellingProgressState = {
  correctCount: 0,
  attemptedCount: 0,
  masteredWords: [],
  wrongWords: []
};

function sanitizeWordList(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    if (typeof item === 'string') {
      const clean = item.trim().slice(0, 64);
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        out.push(clean);
        if (out.length >= 750) break;
      }
    }
  }
  return out;
}

export function sanitizeSpellingProgress(raw: unknown): SpellingProgressState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<SpellingProgressState>;
  return {
    correctCount:
      typeof r.correctCount === 'number' && Number.isFinite(r.correctCount) && r.correctCount >= 0
        ? Math.min(100000, Math.floor(r.correctCount))
        : 0,
    attemptedCount:
      typeof r.attemptedCount === 'number' && Number.isFinite(r.attemptedCount) && r.attemptedCount >= 0
        ? Math.min(100000, Math.floor(r.attemptedCount))
        : 0,
    masteredWords: sanitizeWordList(r.masteredWords),
    wrongWords: sanitizeWordList(r.wrongWords)
  };
}

export function loadSpellingProgress(): SpellingProgressState {
  try {
    const raw = localStorage.getItem(SPELLING_PROGRESS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SPELLING_PROGRESS };
    return sanitizeSpellingProgress(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SPELLING_PROGRESS };
  }
}

export function saveSpellingProgress(
  state: SpellingProgressState,
  options?: { skipCloud?: boolean }
): SpellingProgressState {
  const clean = sanitizeSpellingProgress(state);
  try {
    localStorage.setItem(SPELLING_PROGRESS_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // Private mode / storage full
  }
  if (!options?.skipCloud && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bandsprint_spelling_progress_saved', { detail: clean }));
  }
  return clean;
}
