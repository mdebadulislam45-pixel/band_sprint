/**
 * Cross-device Daily Sprint Hub & Spaced-Repetition Review Queue store.
 * Kept lightweight (no Firebase imports) so pre-login chunks remain fast.
 */

export type SprintQuotaTier = 'standard' | 'light';

export interface ReviewScheduleEntry {
  missCount: number;
  repetition: number;
  nextReviewDate: string; // YYYY-MM-DD
  lastMissedAt: string;   // ISO timestamp
}

export interface DailyMasteryExamCompactSummary {
  dateKey: string;
  completedAt: string;
  totalCorrect: number;
  totalQuestions: number;
  scorePct: number;
  estimatedBand: number;
}

export interface DailySprintProgressState {
  dateKey: string;
  quotaTier: SprintQuotaTier;
  pomodoroBlocksCompleted: number;
  pomodoroFocusMinutesLogged: number;
  masteredVocabIds: string[];
  masteredIdiomIds: string[];
  masteredPhraseIds: string[];
  masteredSpellingIds: string[];
  masteredGrammarIds: string[];
  reviewQueueIds: string[];
  reviewSchedule: Record<string, ReviewScheduleEntry>;
  lastExamSummary: DailyMasteryExamCompactSummary | null;
}

export const SPRINT_HUB_STORAGE_KEY = 'bandsprint_bangla_pomodoro_sprint_v1';
export const DAILY_SPRINT_SAVED_EVENT = 'bandsprint_daily_sprint_saved';
export const DAILY_SPRINT_SYNCED_EVENT = 'bandsprint_daily_sprint_synced';

export function getTodayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const base = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) {
    return getTodayDateKey();
  }
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function sanitizeIdArray(raw: unknown, maxLen: number): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const clean = item.trim().slice(0, 64);
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        out.push(clean);
        if (out.length >= maxLen) break;
      }
    }
  }
  return out;
}

function sanitizeReviewSchedule(
  raw: unknown,
  allowedIds?: Set<string>
): Record<string, ReviewScheduleEntry> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, ReviewScheduleEntry> = {};
  const entries = Object.entries(raw as Record<string, unknown>);
  for (const [key, val] of entries) {
    if (Object.keys(out).length >= 60) break;
    const cleanKey = String(key).trim().slice(0, 64);
    if (!cleanKey) continue;
    if (allowedIds && !allowedIds.has(cleanKey)) continue;
    if (!val || typeof val !== 'object') continue;
    const v = val as Partial<ReviewScheduleEntry>;
    const missCount =
      typeof v.missCount === 'number' && Number.isFinite(v.missCount) && v.missCount >= 1
        ? Math.min(100, Math.floor(v.missCount))
        : 1;
    const repetition =
      typeof v.repetition === 'number' && Number.isFinite(v.repetition) && v.repetition >= 0
        ? Math.min(20, Math.floor(v.repetition))
        : 0;
    const nextReviewDate =
      typeof v.nextReviewDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.nextReviewDate)
        ? v.nextReviewDate
        : getTodayDateKey();
    const lastMissedAt =
      typeof v.lastMissedAt === 'string' && v.lastMissedAt.length <= 64
        ? v.lastMissedAt
        : new Date().toISOString();
    out[cleanKey] = { missCount, repetition, nextReviewDate, lastMissedAt };
  }
  return out;
}

function sanitizeLastExamSummary(raw: unknown): DailyMasteryExamCompactSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<DailyMasteryExamCompactSummary>;
  const dateKey =
    typeof r.dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.dateKey)
      ? r.dateKey
      : typeof r.completedAt === 'string' && /^\d{4}-\d{2}-\d{2}/.test(r.completedAt)
      ? r.completedAt.slice(0, 10)
      : getTodayDateKey();
  const totalQuestions =
    typeof r.totalQuestions === 'number' && Number.isFinite(r.totalQuestions) && r.totalQuestions > 0
      ? Math.min(100, Math.floor(r.totalQuestions))
      : 16;
  const totalCorrect =
    typeof r.totalCorrect === 'number' && Number.isFinite(r.totalCorrect) && r.totalCorrect >= 0
      ? Math.min(totalQuestions, Math.floor(r.totalCorrect))
      : 0;
  const scorePct =
    typeof r.scorePct === 'number' && Number.isFinite(r.scorePct)
      ? Math.min(100, Math.max(0, Math.round(r.scorePct)))
      : Math.round((totalCorrect / totalQuestions) * 100);
  const estimatedBand =
    typeof r.estimatedBand === 'number' && Number.isFinite(r.estimatedBand)
      ? Math.min(9.0, Math.max(4.0, Math.round(r.estimatedBand * 2) / 2))
      : 6.5;
  const completedAt =
    typeof r.completedAt === 'string' && r.completedAt.length <= 64
      ? r.completedAt
      : new Date().toISOString();

  return {
    dateKey,
    completedAt,
    totalCorrect,
    totalQuestions,
    scorePct,
    estimatedBand
  };
}

export function createDefaultDailySprintProgress(
  quotaTier: SprintQuotaTier = 'standard'
): DailySprintProgressState {
  return {
    dateKey: getTodayDateKey(),
    quotaTier,
    pomodoroBlocksCompleted: 0,
    pomodoroFocusMinutesLogged: 0,
    masteredVocabIds: [],
    masteredIdiomIds: [],
    masteredPhraseIds: [],
    masteredSpellingIds: [],
    masteredGrammarIds: [],
    reviewQueueIds: [],
    reviewSchedule: {},
    lastExamSummary: null
  };
}

export function sanitizeDailySprintProgress(raw: unknown): DailySprintProgressState {
  const todayKey = getTodayDateKey();
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<DailySprintProgressState>;
  const quotaTier: SprintQuotaTier = r.quotaTier === 'light' ? 'light' : 'standard';
  const storedDateKey =
    typeof r.dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.dateKey)
      ? r.dateKey
      : todayKey;

  const reviewQueueIds = sanitizeIdArray(r.reviewQueueIds, 60);
  const reviewSchedule = sanitizeReviewSchedule(r.reviewSchedule, new Set(reviewQueueIds));
  // Ensure every queued ID has a valid schedule entry
  for (const id of reviewQueueIds) {
    if (!reviewSchedule[id]) {
      reviewSchedule[id] = {
        missCount: 1,
        repetition: 0,
        nextReviewDate: todayKey,
        lastMissedAt: new Date().toISOString()
      };
    }
  }

  const rawExam = sanitizeLastExamSummary(r.lastExamSummary);
  const examForToday = rawExam && rawExam.dateKey === todayKey ? rawExam : null;

  // Daily counters roll over automatically on a new date while preserving quotaTier & Spaced-Repetition queue
  if (storedDateKey !== todayKey) {
    return {
      ...createDefaultDailySprintProgress(quotaTier),
      reviewQueueIds,
      reviewSchedule,
      lastExamSummary: examForToday
    };
  }

  return {
    dateKey: todayKey,
    quotaTier,
    pomodoroBlocksCompleted:
      typeof r.pomodoroBlocksCompleted === 'number' &&
      Number.isFinite(r.pomodoroBlocksCompleted) &&
      r.pomodoroBlocksCompleted >= 0
        ? Math.min(500, Math.floor(r.pomodoroBlocksCompleted))
        : 0,
    pomodoroFocusMinutesLogged:
      typeof r.pomodoroFocusMinutesLogged === 'number' &&
      Number.isFinite(r.pomodoroFocusMinutesLogged) &&
      r.pomodoroFocusMinutesLogged >= 0
        ? Math.min(5000, Math.floor(r.pomodoroFocusMinutesLogged))
        : 0,
    masteredVocabIds: sanitizeIdArray(r.masteredVocabIds, 50),
    masteredIdiomIds: sanitizeIdArray(r.masteredIdiomIds, 50),
    masteredPhraseIds: sanitizeIdArray(r.masteredPhraseIds, 50),
    masteredSpellingIds: sanitizeIdArray(r.masteredSpellingIds, 100),
    masteredGrammarIds: sanitizeIdArray(r.masteredGrammarIds, 50),
    reviewQueueIds,
    reviewSchedule,
    lastExamSummary: examForToday
  };
}

export function loadDailySprintProgress(): DailySprintProgressState {
  if (typeof localStorage === 'undefined') return createDefaultDailySprintProgress();
  try {
    const raw = localStorage.getItem(SPRINT_HUB_STORAGE_KEY);
    if (!raw) return createDefaultDailySprintProgress();
    return sanitizeDailySprintProgress(JSON.parse(raw));
  } catch {
    return createDefaultDailySprintProgress();
  }
}

export function saveDailySprintProgress(
  state: DailySprintProgressState,
  options?: { skipCloud?: boolean }
): DailySprintProgressState {
  const clean = sanitizeDailySprintProgress(state);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SPRINT_HUB_STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // Storage full / private mode
    }
  }
  if (typeof window !== 'undefined') {
    if (!options?.skipCloud) {
      window.dispatchEvent(new CustomEvent(DAILY_SPRINT_SAVED_EVENT, { detail: clean }));
    }
    window.dispatchEvent(new CustomEvent(DAILY_SPRINT_SYNCED_EVENT, { detail: clean }));
  }
  return clean;
}

export function mergeDailySprintProgress(
  localRaw: DailySprintProgressState,
  remoteRaw: unknown
): DailySprintProgressState {
  const local = sanitizeDailySprintProgress(localRaw);
  const remote = sanitizeDailySprintProgress(remoteRaw);

  const unionIds = (a: string[], b: string[], maxLen: number) =>
    Array.from(new Set([...a, ...b])).slice(0, maxLen);

  // Merge spaced-repetition review queue & schedule across devices
  const mergedQueueIds = unionIds(remote.reviewQueueIds, local.reviewQueueIds, 60);
  const mergedSchedule: Record<string, ReviewScheduleEntry> = {};
  for (const id of mergedQueueIds) {
    const l = local.reviewSchedule[id];
    const r = remote.reviewSchedule[id];
    if (l && r) {
      const lTime = Date.parse(l.lastMissedAt) || 0;
      const rTime = Date.parse(r.lastMissedAt) || 0;
      const newer = lTime >= rTime ? l : r;
      mergedSchedule[id] = {
        missCount: Math.max(l.missCount, r.missCount),
        repetition: newer.repetition,
        nextReviewDate: newer.nextReviewDate,
        lastMissedAt: newer.lastMissedAt
      };
    } else if (l) {
      mergedSchedule[id] = l;
    } else if (r) {
      mergedSchedule[id] = r;
    }
  }

  let mergedExam = local.lastExamSummary;
  if (remote.lastExamSummary) {
    if (!mergedExam) {
      mergedExam = remote.lastExamSummary;
    } else {
      const localTs = Date.parse(mergedExam.completedAt) || 0;
      const remoteTs = Date.parse(remote.lastExamSummary.completedAt) || 0;
      if (remoteTs > localTs) {
        mergedExam = remote.lastExamSummary;
      }
    }
  }

  return sanitizeDailySprintProgress({
    dateKey: getTodayDateKey(),
    quotaTier: local.quotaTier === 'light' || remote.quotaTier === 'light'
      ? (local.pomodoroBlocksCompleted >= remote.pomodoroBlocksCompleted ? local.quotaTier : remote.quotaTier)
      : 'standard',
    pomodoroBlocksCompleted: Math.max(local.pomodoroBlocksCompleted, remote.pomodoroBlocksCompleted),
    pomodoroFocusMinutesLogged: Math.max(
      local.pomodoroFocusMinutesLogged,
      remote.pomodoroFocusMinutesLogged
    ),
    masteredVocabIds: unionIds(remote.masteredVocabIds, local.masteredVocabIds, 50),
    masteredIdiomIds: unionIds(remote.masteredIdiomIds, local.masteredIdiomIds, 50),
    masteredPhraseIds: unionIds(remote.masteredPhraseIds, local.masteredPhraseIds, 50),
    masteredSpellingIds: unionIds(remote.masteredSpellingIds, local.masteredSpellingIds, 100),
    masteredGrammarIds: unionIds(remote.masteredGrammarIds, local.masteredGrammarIds, 50),
    reviewQueueIds: mergedQueueIds,
    reviewSchedule: mergedSchedule,
    lastExamSummary: mergedExam
  });
}

/**
 * Updates the Spaced-Repetition Review Queue whenever a Mastery Exam finishes.
 * - Missed items enter (or reset inside) the review queue due immediately/tomorrow.
 * - Previously queued items answered accurately advance repetition (+1) and graduate at >= 2.
 */
export function recordMasteryExamOutcome(
  missedQuestionIds: string[],
  correctQuestionIds: string[],
  summary: DailyMasteryExamCompactSummary
): DailySprintProgressState {
  const current = loadDailySprintProgress();
  const todayKey = getTodayDateKey();
  const nowIso = new Date().toISOString();

  const nextSchedule: Record<string, ReviewScheduleEntry> = { ...current.reviewSchedule };
  const nextQueueSet = new Set<string>(current.reviewQueueIds);

  for (const qId of missedQuestionIds) {
    const existing = nextSchedule[qId];
    nextQueueSet.add(qId);
    nextSchedule[qId] = {
      missCount: (existing?.missCount || 0) + 1,
      repetition: 0,
      nextReviewDate: todayKey,
      lastMissedAt: nowIso
    };
  }

  for (const qId of correctQuestionIds) {
    if (!nextQueueSet.has(qId)) continue;
    const existing = nextSchedule[qId];
    const nextRep = (existing?.repetition || 0) + 1;
    if (nextRep >= 2) {
      nextQueueSet.delete(qId);
      delete nextSchedule[qId];
    } else {
      nextSchedule[qId] = {
        missCount: existing?.missCount || 1,
        repetition: nextRep,
        nextReviewDate: addDaysToDateKey(todayKey, 2),
        lastMissedAt: existing?.lastMissedAt || nowIso
      };
    }
  }

  return saveDailySprintProgress({
    ...current,
    reviewQueueIds: Array.from(nextQueueSet).slice(0, 60),
    reviewSchedule: nextSchedule,
    lastExamSummary: summary
  });
}

/**
 * Marks a single item in the Spaced-Repetition Missed-Item Warm-Up Queue as reviewed.
 * - recalledCorrectly=true: advances interval (+2d -> graduate out of queue on 2nd pass, or immediate remove if graduateNow=true)
 * - recalledCorrectly=false: keeps due today with repetition reset to 0
 */
export function completeReviewQueueItem(
  questionId: string,
  recalledCorrectly: boolean,
  graduateNow = false
): DailySprintProgressState {
  const current = loadDailySprintProgress();
  const todayKey = getTodayDateKey();
  const nextSchedule: Record<string, ReviewScheduleEntry> = { ...current.reviewSchedule };
  const nextQueueSet = new Set<string>(current.reviewQueueIds);
  const existing = nextSchedule[questionId];

  if (recalledCorrectly) {
    const nextRep = (existing?.repetition || 0) + 1;
    if (graduateNow || nextRep >= 2) {
      nextQueueSet.delete(questionId);
      delete nextSchedule[questionId];
    } else {
      nextQueueSet.add(questionId);
      nextSchedule[questionId] = {
        missCount: existing?.missCount || 1,
        repetition: nextRep,
        nextReviewDate: addDaysToDateKey(todayKey, 2),
        lastMissedAt: existing?.lastMissedAt || new Date().toISOString()
      };
    }
  } else {
    nextQueueSet.add(questionId);
    nextSchedule[questionId] = {
      missCount: (existing?.missCount || 0) + 1,
      repetition: 0,
      nextReviewDate: todayKey,
      lastMissedAt: new Date().toISOString()
    };
  }

  return saveDailySprintProgress({
    ...current,
    reviewQueueIds: Array.from(nextQueueSet).slice(0, 60),
    reviewSchedule: nextSchedule
  });
}

export function isReviewItemDueToday(entry?: ReviewScheduleEntry): boolean {
  if (!entry) return true;
  return entry.nextReviewDate <= getTodayDateKey();
}

export const VAULT_QUEUE_PREFIX = 'vault_';

export function toVaultQueueId(mistakeId: string): string {
  return `${VAULT_QUEUE_PREFIX}${mistakeId}`.slice(0, 64);
}

export function isVaultQueueId(questionId: string): boolean {
  return questionId.startsWith(VAULT_QUEUE_PREFIX);
}

/**
 * Enqueues one or more Mistake Vault entries into the Daily Sprint Spaced-Repetition Queue.
 */
export function pushManyMistakesToDailySprint(mistakeIds: string[]): DailySprintProgressState {
  const cleanIds = mistakeIds
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter(Boolean)
    .map(toVaultQueueId);

  if (cleanIds.length === 0) return loadDailySprintProgress();

  const current = loadDailySprintProgress();
  const todayKey = getTodayDateKey();
  const nowIso = new Date().toISOString();
  const nextSchedule: Record<string, ReviewScheduleEntry> = { ...current.reviewSchedule };
  const nextQueueSet = new Set<string>(current.reviewQueueIds);

  for (const qId of cleanIds) {
    const existing = nextSchedule[qId];
    nextQueueSet.add(qId);
    nextSchedule[qId] = {
      missCount: existing ? existing.missCount : 1,
      repetition: existing ? Math.min(existing.repetition, 1) : 0,
      nextReviewDate: todayKey,
      lastMissedAt: nowIso
    };
  }

  return saveDailySprintProgress({
    ...current,
    reviewQueueIds: Array.from(nextQueueSet).slice(0, 60),
    reviewSchedule: nextSchedule
  });
}

export function pushMistakeToDailySprint(mistakeId: string): DailySprintProgressState {
  return pushManyMistakesToDailySprint([mistakeId]);
}

export function removeVaultMistakeFromDailySprint(mistakeId: string): DailySprintProgressState {
  const qId = toVaultQueueId(mistakeId);
  const current = loadDailySprintProgress();
  if (!current.reviewQueueIds.includes(qId) && !current.reviewSchedule[qId]) {
    return current;
  }
  const nextQueue = current.reviewQueueIds.filter((id) => id !== qId);
  const nextSchedule = { ...current.reviewSchedule };
  delete nextSchedule[qId];
  return saveDailySprintProgress({
    ...current,
    reviewQueueIds: nextQueue,
    reviewSchedule: nextSchedule
  });
}

export function syncUnresolvedVaultToDailySprint(
  mistakes: Array<{ id: string; mastered: boolean; repetition?: number }>
): DailySprintProgressState {
  const current = loadDailySprintProgress();
  const todayKey = getTodayDateKey();
  const nowIso = new Date().toISOString();

  const unresolvedIds = new Set(
    mistakes.filter((m) => !m.mastered).map((m) => toVaultQueueId(m.id))
  );
  const masteredIds = new Set(
    mistakes.filter((m) => m.mastered).map((m) => toVaultQueueId(m.id))
  );

  let changed = false;
  const nextQueueSet = new Set<string>();
  const nextSchedule: Record<string, ReviewScheduleEntry> = {};

  for (const id of current.reviewQueueIds) {
    if (isVaultQueueId(id) && (masteredIds.has(id) || !unresolvedIds.has(id))) {
      changed = true;
      continue;
    }
    nextQueueSet.add(id);
    if (current.reviewSchedule[id]) {
      nextSchedule[id] = current.reviewSchedule[id];
    }
  }

  for (const qId of unresolvedIds) {
    if (!nextQueueSet.has(qId) && nextQueueSet.size < 60) {
      changed = true;
      nextQueueSet.add(qId);
      nextSchedule[qId] = {
        missCount: 1,
        repetition: 0,
        nextReviewDate: todayKey,
        lastMissedAt: nowIso
      };
    }
  }

  if (!changed) return current;

  return saveDailySprintProgress({
    ...current,
    reviewQueueIds: Array.from(nextQueueSet).slice(0, 60),
    reviewSchedule: nextSchedule
  });
}

