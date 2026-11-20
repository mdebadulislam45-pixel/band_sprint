/**
 * Diagnostic result storage — tiny standalone module.
 *
 * Kept separate from the DiagnosticTest component on purpose: the exam setup
 * service, dashboard and study plan only need to READ the saved result. If
 * they imported it from DiagnosticTest.tsx, the bundler would drag the whole
 * diagnostic component (and its heavy imports) into their chunks.
 */

export type DiagnosticSkill = 'listening' | 'reading' | 'writing' | 'speaking';

export interface DiagnosticResult {
  id: string;
  createdAt: number;
  targetBand: number;
  examDate: string;
  dailyMinutes: number;
  examType: 'Academic' | 'General Training';
  scores: Record<DiagnosticSkill, number> & { overall: number };
  correct: { listening: number; reading: number };
  weakest: DiagnosticSkill;
  writingWords: number;
  speakingRecorded: boolean;
}

export const DIAGNOSTIC_STORAGE_KEY = 'bandsprint_diagnostic_result_v1';

export function loadDiagnosticResult(): DiagnosticResult | null {
  try {
    const raw = localStorage.getItem(DIAGNOSTIC_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DiagnosticResult) : null;
  } catch {
    return null;
  }
}

export function saveDiagnosticResult(
  res: DiagnosticResult,
  options?: { skipCloud?: boolean }
): void {
  try {
    localStorage.setItem(DIAGNOSTIC_STORAGE_KEY, JSON.stringify(res));
  } catch {
    // Private mode / full storage — the result simply is not persisted.
  }
  if (!options?.skipCloud && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bandsprint_diagnostic_saved', { detail: res }));
  }
}
