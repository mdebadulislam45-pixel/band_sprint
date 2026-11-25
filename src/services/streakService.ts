/**
 * BandSprint Streak, Study Minutes & XP Service — atomic local persistence.
 *
 * Persists streak, Weekly XP, Today's Goal minutes, and completed daily tasks
 * atomically in localStorage using the user's local calendar date key so
 * "Today's Study Tasks", "Today's Goal", "Weekly XP", and <BarnabyCompanion />
 * always stay 100% synchronized in real time.
 */

export type ActivitySource = 'mission' | 'mission_bonus' | 'challenge' | 'diagnostic' | 'mock';

export interface StreakState {
  /** Lifetime XP earned from real activities. */
  totalXp: number;
  /** Consecutive active days, ending today (or yesterday if today is not active yet). */
  currentStreak: number;
  /** Best consecutive run ever. */
  longestStreak: number;
  /** Local YYYY-MM-DD of the most recent active day, or null. */
  lastActiveDate: string | null;
  /** XP earned per day, keyed by local YYYY-MM-DD. */
  xpByDate: Record<string, number>;
  /** Study minutes earned per day, keyed by local YYYY-MM-DD. */
  minutesByDate: Record<string, number>;
  /** Completed daily mission IDs per day, keyed by local YYYY-MM-DD. */
  completedMissionsByDate: Record<string, string[]>;
  /** Idempotency keys currently awarded, keyed by local YYYY-MM-DD. */
  awarded: Record<string, string[]>;
}

const STORAGE_KEY = 'bandsprint_streak_v1';

/** Weekly XP goal: 3 missions/day (10 XP each) + all-3 bonus (20 XP) + daily sprint (25 XP) = 75 XP/day, 525/week. */
export const WEEKLY_XP_GOAL = 500;

/** XP awarded per completed daily mission drill. */
export const XP_PER_MISSION = 10;
/** Bonus XP when all 3 daily missions are complete. */
export const XP_ALL_MISSIONS_BONUS = 20;
/** XP awarded for finishing the 5-question daily sprint challenge. */
export const XP_DAILY_CHALLENGE = 25;
/** XP awarded for completing the diagnostic test. */
export const XP_DIAGNOSTIC = 50;
/** XP awarded for completing a full mock test. */
export const XP_MOCK = 100;

const EMPTY_STATE: StreakState = {
  totalXp: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  xpByDate: {},
  minutesByDate: {},
  completedMissionsByDate: {},
  awarded: {},
};

/** Local YYYY-MM-DD (local time, not UTC — a streak belongs to the user's day). */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function yesterdayKey(today: string): string {
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return localDateKey(d);
}

function broadcastSyncEvents(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('bandsprint_streak_updated'));
  window.dispatchEvent(new CustomEvent('bandsprint_tasks_updated'));
}

function pruneOldDates(state: StreakState, today: string): void {
  const cutoff = new Date(`${today}T12:00:00`);
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffKey = localDateKey(cutoff);
  for (const key of Object.keys(state.xpByDate)) {
    if (key < cutoffKey) delete state.xpByDate[key];
  }
  for (const key of Object.keys(state.minutesByDate)) {
    if (key < cutoffKey) delete state.minutesByDate[key];
  }
  for (const key of Object.keys(state.completedMissionsByDate)) {
    if (key < cutoffKey) delete state.completedMissionsByDate[key];
  }
  for (const key of Object.keys(state.awarded)) {
    if (key < cutoffKey) delete state.awarded[key];
  }
}

export function getStreakState(): StreakState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...EMPTY_STATE,
        xpByDate: {},
        minutesByDate: {},
        completedMissionsByDate: {},
        awarded: {},
      };
    }
    const parsed = JSON.parse(raw) as Partial<StreakState>;
    return {
      totalXp: typeof parsed.totalXp === 'number' ? Math.max(0, parsed.totalXp) : 0,
      currentStreak: typeof parsed.currentStreak === 'number' ? Math.max(0, parsed.currentStreak) : 0,
      longestStreak: typeof parsed.longestStreak === 'number' ? Math.max(0, parsed.longestStreak) : 0,
      lastActiveDate: typeof parsed.lastActiveDate === 'string' ? parsed.lastActiveDate : null,
      xpByDate: parsed.xpByDate && typeof parsed.xpByDate === 'object' ? parsed.xpByDate : {},
      minutesByDate:
        parsed.minutesByDate && typeof parsed.minutesByDate === 'object' ? parsed.minutesByDate : {},
      completedMissionsByDate:
        parsed.completedMissionsByDate && typeof parsed.completedMissionsByDate === 'object'
          ? parsed.completedMissionsByDate
          : {},
      awarded: parsed.awarded && typeof parsed.awarded === 'object' ? parsed.awarded : {},
    };
  } catch {
    return {
      ...EMPTY_STATE,
      xpByDate: {},
      minutesByDate: {},
      completedMissionsByDate: {},
      awarded: {},
    };
  }
}

function saveStreakState(state: StreakState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable — state remains in memory only
  }
}

/** XP earned in the last 7 days (including today). Used for the weekly goal bar. */
export function getWeeklyXp(state: StreakState = getStreakState()): number {
  const today = localDateKey();
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - i);
    total += state.xpByDate[localDateKey(d)] || 0;
  }
  return total;
}

/** Study minutes logged today from completed daily tasks, blitz sprints, diagnostics, and mocks. */
export function getTodayMinutes(state: StreakState = getStreakState()): number {
  const today = localDateKey();
  const explicitMinutes = state.minutesByDate?.[today] || 0;
  if (explicitMinutes > 0) return explicitMinutes;
  // Backwards-compatible fallback for legacy records saved before minutesByDate existed
  const xpToday = state.xpByDate?.[today] || 0;
  return xpToday > 0 ? Math.round(xpToday / 5) * 3 : 0;
}

/** Completed daily mission IDs for today (local date key). */
export function getCompletedMissionsToday(state: StreakState = getStreakState()): string[] {
  const today = localDateKey();
  const stored = state.completedMissionsByDate?.[today];
  if (Array.isArray(stored)) return stored;
  // Migrate any legacy UTC-keyed mission list on first read
  try {
    const legacyKey = `ielts_sprint_missions_${today}`;
    const legacyRaw = localStorage.getItem(legacyKey);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string');
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Record a real completed activity with optional study minutes.
 */
export function recordActivity(
  source: ActivitySource,
  xp: number,
  idempotencyKey?: string,
  minutes: number = 0
): StreakState {
  const state = getStreakState();
  const today = localDateKey();

  if (idempotencyKey) {
    const awardedToday = state.awarded[today] || [];
    if (awardedToday.includes(idempotencyKey)) {
      return state; // already awarded today — no farming
    }
  }

  const next: StreakState = {
    ...state,
    xpByDate: { ...state.xpByDate },
    minutesByDate: { ...state.minutesByDate },
    completedMissionsByDate: { ...state.completedMissionsByDate },
    awarded: { ...state.awarded },
  };

  if (state.lastActiveDate === today) {
    // already active today — streak unchanged
  } else if (state.lastActiveDate === yesterdayKey(today)) {
    next.currentStreak = state.currentStreak + 1;
  } else {
    next.currentStreak = 1;
  }
  next.longestStreak = Math.max(state.longestStreak, next.currentStreak);
  next.lastActiveDate = today;

  next.totalXp = Math.max(0, state.totalXp + xp);
  next.xpByDate[today] = Math.max(0, (state.xpByDate[today] || 0) + xp);
  if (minutes > 0) {
    next.minutesByDate[today] = Math.max(0, (state.minutesByDate[today] || 0) + minutes);
  }

  if (idempotencyKey) {
    next.awarded[today] = [...(state.awarded[today] || []), idempotencyKey];
  }

  pruneOldDates(next, today);
  saveStreakState(next);
  broadcastSyncEvents();
  return next;
}

/**
 * Atomically checks or unchecks a Today's Study Task, keeping completed IDs,
 * Today's Goal minutes, Weekly XP, and all-missions bonus strictly in sync.
 */
export function toggleMissionProgress(
  missionId: string,
  missionMinutes: number,
  allMissionIds: string[]
): {
  state: StreakState;
  completedIds: string[];
  isNowCompleted: boolean;
  allCompletedNow: boolean;
  xpDelta: number;
  minutesDelta: number;
} {
  const state = getStreakState();
  const today = localDateKey();
  const currentCompleted = getCompletedMissionsToday(state);
  const wasCompleted = currentCompleted.includes(missionId);

  const next: StreakState = {
    ...state,
    xpByDate: { ...state.xpByDate },
    minutesByDate: { ...state.minutesByDate },
    completedMissionsByDate: { ...state.completedMissionsByDate },
    awarded: { ...state.awarded },
  };

  const awardedToday = new Set<string>(next.awarded[today] || []);
  const missionKey = `mission:${missionId}`;
  const bonusKey = 'mission_bonus';

  let xpDelta = 0;
  let minutesDelta = 0;
  let nextCompleted: string[];

  if (wasCompleted) {
    // Unchecking a task today atomically reverses its minutes and today's XP (and bonus if all were done)
    nextCompleted = currentCompleted.filter((id) => id !== missionId);
    minutesDelta = -Math.max(0, missionMinutes);
    if (awardedToday.has(missionKey)) {
      awardedToday.delete(missionKey);
      xpDelta -= XP_PER_MISSION;
    }
    if (awardedToday.has(bonusKey)) {
      awardedToday.delete(bonusKey);
      xpDelta -= XP_ALL_MISSIONS_BONUS;
    }
  } else {
    // Checking a task today atomically increments minutes + XP + optional all-3 bonus
    nextCompleted = Array.from(new Set([...currentCompleted, missionId]));
    minutesDelta = Math.max(0, missionMinutes);

    if (!awardedToday.has(missionKey)) {
      awardedToday.add(missionKey);
      xpDelta += XP_PER_MISSION;
    }

    const allDoneNow =
      allMissionIds.length > 0 && allMissionIds.every((id) => nextCompleted.includes(id));
    if (allDoneNow && !awardedToday.has(bonusKey)) {
      awardedToday.add(bonusKey);
      xpDelta += XP_ALL_MISSIONS_BONUS;
    }

    if (state.lastActiveDate === today) {
      // already active today
    } else if (state.lastActiveDate === yesterdayKey(today)) {
      next.currentStreak = state.currentStreak + 1;
    } else {
      next.currentStreak = 1;
    }
    next.longestStreak = Math.max(state.longestStreak, next.currentStreak);
    next.lastActiveDate = today;
  }

  next.totalXp = Math.max(0, state.totalXp + xpDelta);
  next.xpByDate[today] = Math.max(0, (state.xpByDate[today] || 0) + xpDelta);
  next.minutesByDate[today] = Math.max(0, (state.minutesByDate[today] || 0) + minutesDelta);
  next.completedMissionsByDate[today] = nextCompleted;
  next.awarded[today] = Array.from(awardedToday);

  pruneOldDates(next, today);
  saveStreakState(next);

  try {
    localStorage.setItem(`ielts_sprint_missions_${today}`, JSON.stringify(nextCompleted));
  } catch {
    // ignore legacy key write errors
  }

  broadcastSyncEvents();

  const allCompletedNow =
    !wasCompleted &&
    allMissionIds.length > 0 &&
    allMissionIds.every((id) => nextCompleted.includes(id));

  return {
    state: next,
    completedIds: nextCompleted,
    isNowCompleted: !wasCompleted,
    allCompletedNow,
    xpDelta,
    minutesDelta,
  };
}

/** Convenience: record a completed daily mission drill (10 XP, once per mission per day). */
export function recordMissionComplete(missionId: string, minutes: number = 10): StreakState {
  return recordActivity('mission', XP_PER_MISSION, `mission:${missionId}`, minutes);
}

/** Convenience: record the all-3-missions bonus (20 XP, once per day). */
export function recordAllMissionsBonus(): StreakState {
  return recordActivity('mission_bonus', XP_ALL_MISSIONS_BONUS, 'mission_bonus', 0);
}

/** Convenience: record finishing the 5-question daily sprint (25 XP + 5 min, once per day). */
export function recordDailyChallengeComplete(): StreakState {
  return recordActivity('challenge', XP_DAILY_CHALLENGE, 'challenge', 5);
}
