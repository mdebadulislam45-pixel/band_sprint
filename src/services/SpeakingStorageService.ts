import { SpeakingSessionRecord, ActiveSpeakingSessionSnapshot } from '../types/speakingTypes';

const STORAGE_KEY_SPEAKING_HISTORY = 'ielts_speaking_session_history_v1';
const STORAGE_KEY_UNFINISHED_SESSION = 'ielts_speaking_unfinished_session_v1';

const NON_PERSISTABLE_STATUSES = new Set(['unavailable', 'insufficient_evidence']);

export function isValidSpeakingBandValue(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  if (value < 1.0 || value > 9.0) return false;
  return Math.abs(value * 2 - Math.round(value * 2)) < 1e-6;
}

function normalizeOptionalSpeakingBand(value: unknown): { valid: boolean; value: number | null } {
  if (value === null || value === undefined) {
    return { valid: true, value: null };
  }
  if (isValidSpeakingBandValue(value)) {
    return { valid: true, value: Math.round(value * 2) / 2 };
  }
  return { valid: false, value: null };
}

/**
 * Validates and sanitizes a SpeakingSessionRecord for local persistence or hydration.
 * - Rejects unavailable, insufficient, or invalid-attempt records.
 * - Rejects NaN, out-of-range, or non-half-band scores instead of converting them to 6.0 or 0.0.
 * - Preserves partial transcript-only assessments with overallBand: null, pronunciationBand: null,
 *   and partialThreeCriterionIndex separately.
 * - Preserves legitimate complete 4-criterion historical sessions.
 */
export function sanitizeSpeakingSessionRecord(raw: unknown): SpeakingSessionRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Partial<SpeakingSessionRecord>;

  if (typeof rec.testId !== 'string' || !rec.testId.trim()) return null;
  if (!rec.evaluation || typeof rec.evaluation !== 'object') return null;

  const evalStatus = rec.evaluation.assessmentStatus;
  if (rec.evaluation.isValidAttempt === false) return null;
  if (typeof evalStatus === 'string' && NON_PERSISTABLE_STATUSES.has(evalStatus)) return null;

  const overallCheck = normalizeOptionalSpeakingBand(rec.overallBand);
  const fluencyCheck = normalizeOptionalSpeakingBand(rec.fluencyBand);
  const lexicalCheck = normalizeOptionalSpeakingBand(rec.lexicalBand);
  const grammarCheck = normalizeOptionalSpeakingBand(rec.grammarBand);
  const pronunciationCheck = normalizeOptionalSpeakingBand(rec.pronunciationBand);
  const partialCheck = normalizeOptionalSpeakingBand(
    rec.partialThreeCriterionIndex ?? rec.evaluation.partialThreeCriterionIndex
  );

  if (
    !overallCheck.valid ||
    !fluencyCheck.valid ||
    !lexicalCheck.valid ||
    !grammarCheck.valid ||
    !pronunciationCheck.valid ||
    !partialCheck.valid
  ) {
    return null;
  }

  const isPartial =
    evalStatus === 'partial_transcript_only' ||
    rec.evaluation.isPartialAssessment === true ||
    rec.evaluation.pronunciationObservable === false ||
    pronunciationCheck.value === null;

  if (isPartial) {
    // Partial transcript-only sessions must have at least the 3 transcript criteria assessed and NEVER carry a complete overallBand
    if (fluencyCheck.value === null || lexicalCheck.value === null || grammarCheck.value === null) {
      return null;
    }
    const derivedPartialIndex =
      partialCheck.value ??
      Math.round(((fluencyCheck.value + lexicalCheck.value + grammarCheck.value) / 3) * 2) / 2;

    return {
      ...(rec as SpeakingSessionRecord),
      overallBand: null,
      partialThreeCriterionIndex: derivedPartialIndex,
      fluencyBand: fluencyCheck.value,
      lexicalBand: lexicalCheck.value,
      grammarBand: grammarCheck.value,
      pronunciationBand: null,
      evaluation: {
        ...rec.evaluation,
        isValidAttempt: true,
        assessmentStatus: 'partial_transcript_only',
        evidenceMode: 'transcript_only',
        pronunciationObservable: false,
        isPartialAssessment: true,
        unassessedCriteria:
          Array.isArray(rec.evaluation.unassessedCriteria) && rec.evaluation.unassessedCriteria.length > 0
            ? rec.evaluation.unassessedCriteria
            : ['Pronunciation'],
        overallBand: null,
        partialThreeCriterionIndex: derivedPartialIndex,
        fluencyBand: fluencyCheck.value,
        lexicalBand: lexicalCheck.value,
        grammarBand: grammarCheck.value,
        pronunciationBand: null
      }
    };
  }

  // Complete 4-criterion Speaking session must have valid numeric overallBand and all 4 criteria
  if (
    overallCheck.value === null ||
    fluencyCheck.value === null ||
    lexicalCheck.value === null ||
    grammarCheck.value === null ||
    pronunciationCheck.value === null
  ) {
    return null;
  }

  return {
    ...(rec as SpeakingSessionRecord),
    overallBand: overallCheck.value,
    partialThreeCriterionIndex: null,
    fluencyBand: fluencyCheck.value,
    lexicalBand: lexicalCheck.value,
    grammarBand: grammarCheck.value,
    pronunciationBand: pronunciationCheck.value,
    evaluation: {
      ...rec.evaluation,
      isValidAttempt: true,
      assessmentStatus: 'evaluated',
      evidenceMode: rec.evaluation.evidenceMode || 'audio_and_transcript',
      pronunciationObservable: true,
      isPartialAssessment: false,
      unassessedCriteria: [],
      overallBand: overallCheck.value,
      partialThreeCriterionIndex: null,
      fluencyBand: fluencyCheck.value,
      lexicalBand: lexicalCheck.value,
      grammarBand: grammarCheck.value,
      pronunciationBand: pronunciationCheck.value
    }
  };
}

export class SpeakingStorageService {
  public getAllSessions(userId?: string): SpeakingSessionRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SPEAKING_HISTORY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const sanitized: SpeakingSessionRecord[] = [];
      for (const item of parsed) {
        const clean = sanitizeSpeakingSessionRecord(item);
        if (!clean) continue;
        if (!userId || clean.userId === userId || !clean.userId) {
          sanitized.push(clean);
        }
      }
      return sanitized;
    } catch {
      return [];
    }
  }

  public saveCompletedSession(session: SpeakingSessionRecord): boolean {
    if (typeof window === 'undefined') return false;
    const sanitized = sanitizeSpeakingSessionRecord(session);
    if (!sanitized) {
      return false;
    }
    try {
      const existing = this.getAllSessions();
      // Remove matching testId if already saved
      const updated = existing.filter((s) => s.testId !== sanitized.testId);
      updated.unshift(sanitized);
      localStorage.setItem(STORAGE_KEY_SPEAKING_HISTORY, JSON.stringify(updated.slice(0, 50)));

      // Clear any unfinished session state
      this.clearUnfinishedSession();

      // Trigger global event so UI updates immediately
      window.dispatchEvent(new CustomEvent('speaking_history_updated', { detail: sanitized }));
      return true;
    } catch {
      return false;
    }
  }

  public getSessionById(testId: string): SpeakingSessionRecord | undefined {
    const list = this.getAllSessions();
    return list.find((s) => s.testId === testId);
  }

  public deleteSession(testId: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const existing = this.getAllSessions();
      const updated = existing.filter((s) => s.testId !== testId);
      localStorage.setItem(STORAGE_KEY_SPEAKING_HISTORY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('speaking_history_updated'));
      return true;
    } catch {
      return false;
    }
  }

  // --- Session Recovery & Unfinished Session Preservation ---
  public saveUnfinishedSession(snapshot: ActiveSpeakingSessionSnapshot): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_UNFINISHED_SESSION, JSON.stringify(snapshot));
    } catch {}
  }

  public getUnfinishedSession(): ActiveSpeakingSessionSnapshot | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_UNFINISHED_SESSION);
      if (!raw) return null;
      const parsed: ActiveSpeakingSessionSnapshot = JSON.parse(raw);
      // Valid if saved in the previous 4 hours
      if (Date.now() - parsed.updatedAt < 4 * 60 * 60 * 1000) {
        return parsed;
      }
      this.clearUnfinishedSession();
      return null;
    } catch {
      return null;
    }
  }

  public clearUnfinishedSession(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEY_UNFINISHED_SESSION);
    } catch {}
  }
}

export const speakingStorageService = new SpeakingStorageService();
