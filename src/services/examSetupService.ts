import { loadDiagnosticResult } from '../services/diagnosticResultStore';
import { MOCK_EXAM_SETS } from '../data/mockExams';

export type ExamMode = 'Academic' | 'General Training';
export type ExamScope = 'full' | 'listening' | 'reading' | 'writing' | 'speaking';

export interface ExamSetup {
  /** Aim band, 4.0–9.0 in 0.5 steps. */
  targetBand: number;
  /** Exam date (YYYY-MM-DD) or null when the student has no date yet. */
  examDate: string | null;
  examMode: ExamMode;
  mockSetId: string;
  scope: ExamScope;
}

export const EXAM_SETUP_STORAGE_KEY = 'bandsprint_exam_setup_v1';

export const AIM_BANDS: number[] = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

export const MODULE_TIMINGS: Record<ExamScope, { label: string; minutes: string }> = {
  full: { label: 'Full mock test', minutes: 'Listening ~30 min · Reading 60 min · Writing 60 min · Speaking 11–14 min' },
  listening: { label: 'Listening only', minutes: '~30 min audio + 2 min to check your answers' },
  reading: { label: 'Reading only', minutes: '60 min · 3 passages · 40 questions' },
  writing: { label: 'Writing only', minutes: '60 min · Task 1 (20 min) + Task 2 (40 min)' },
  speaking: { label: 'Speaking only', minutes: '11–14 min · Part 1, Part 2 & Part 3' },
};

/**
 * APPROXIMATE raw-score conversions for Listening & Academic Reading
 * (correct answers out of 40). These are the widely published approximate
 * conversions — they are a study guide, NOT official IELTS scores.
 * General Training Reading uses a slightly different scale.
 */
export const BAND_RAW_SCORE: Record<number, { min: number; max: number }> = {
  4: { min: 10, max: 12 },
  4.5: { min: 13, max: 15 },
  5: { min: 16, max: 19 },
  5.5: { min: 20, max: 22 },
  6: { min: 23, max: 25 },
  6.5: { min: 26, max: 29 },
  7: { min: 30, max: 31 },
  7.5: { min: 32, max: 34 },
  8: { min: 35, max: 36 },
  8.5: { min: 37, max: 38 },
  9: { min: 39, max: 40 },
};

/** e.g. Band 7 → "30–31". Returns "—" for out-of-range bands. */
export function correctAnswersNeeded(band: number): string {
  const range = BAND_RAW_SCORE[band];
  if (!range) return '—';
  return `${range.min}–${range.max}`;
}

export const DEFAULT_EXAM_SETUP: ExamSetup = {
  targetBand: 7.0,
  examDate: null,
  examMode: 'Academic',
  mockSetId: 'practice-16',
  scope: 'full',
};

function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

function normaliseBand(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : DEFAULT_EXAM_SETUP.targetBand;
  const rounded = Math.round(n * 2) / 2;
  return Math.min(9, Math.max(4, rounded));
}

function sanitiseSetup(raw: unknown): ExamSetup {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<ExamSetup>;
  const setIds = MOCK_EXAM_SETS.map((s) => s.id);
  return {
    targetBand: normaliseBand(r.targetBand),
    examDate: isValidDateString(r.examDate) ? r.examDate : null,
    examMode: r.examMode === 'General Training' ? 'General Training' : 'Academic',
    mockSetId: typeof r.mockSetId === 'string' && setIds.includes(r.mockSetId) ? r.mockSetId : DEFAULT_EXAM_SETUP.mockSetId,
    scope: ['full', 'listening', 'reading', 'writing', 'speaking'].includes(r.scope as string)
      ? (r.scope as ExamScope)
      : 'full',
  };
}

/**
 * Loads the saved exam setup. When nothing is saved yet, pre-fills the aim
 * band, exam date and exam type from the diagnostic test result if one exists.
 */
export function loadExamSetup(): ExamSetup {
  try {
    const raw = localStorage.getItem(EXAM_SETUP_STORAGE_KEY);
    if (raw) return sanitiseSetup(JSON.parse(raw));
  } catch {
    // fall through to diagnostic pre-fill / defaults
  }
  const diag = loadDiagnosticResult();
  if (diag) {
    return sanitiseSetup({
      targetBand: diag.targetBand,
      examDate: isValidDateString(diag.examDate) ? diag.examDate : null,
      examMode: diag.examType,
      mockSetId: diag.examType === 'General Training' ? 'gt-test-1' : 'practice-16',
      scope: 'full',
    });
  }
  return { ...DEFAULT_EXAM_SETUP };
}

export function saveExamSetup(
  setup: ExamSetup,
  options?: { skipCloud?: boolean }
): void {
  const clean = sanitiseSetup(setup);
  try {
    localStorage.setItem(EXAM_SETUP_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // storage unavailable — setup simply won't persist
  }
  if (!options?.skipCloud && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bandsprint_exam_setup_saved', { detail: clean }));
  }
}

export function clearExamSetup(): void {
  try {
    localStorage.removeItem(EXAM_SETUP_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Whole days until the exam date, or null when no date is set / date is past. */
export function daysUntilExam(examDate: string | null): number | null {
  if (!isValidDateString(examDate)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${examDate}T00:00:00`);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  return diff >= 0 ? diff : null;
}

/** e.g. "12 Dec 2026", or "No date set". */
export function formatExamDate(examDate: string | null): string {
  if (!isValidDateString(examDate)) return 'No date set';
  const d = new Date(`${examDate}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
