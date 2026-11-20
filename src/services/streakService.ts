/**
 * BandSprint Streak & XP Service — fully local, no server required.
 *
 * Persists streak + XP in localStorage. A "day" is counted when the user
 * completes any real activity (a daily mission drill, the 5-question daily
 * sprint, a diagnostic or a mock). XP is earned, never revoked, and each
 * activity can only award XP once per day (idempotency keys stop farming
 * by toggling a mission on/off or replaying the daily sprint).
 *
 * This is the single source of truth for streaks. It does NOT invent other
 * users, leagues or leaderboards — the only comparison is against the user's
 * own weekly XP goal.
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
  /** Idempotency keys already awarded, keyed by local YYYY-MM-DD. */
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
/** XP awarded for completing the diagnostic test (wired by the diagnostic flow). */
export const XP_DIAGNOSTIC = 50;
/** XP awarded for completing a full mock test (wired by the mock flow). */
export const XP_MOCK = 100;

const EMPTY_STATE: StreakState = {
  totalXp: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  xpByDate: {},
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

export function getStreakState(): StreakState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_STATE, xpByDate: {}, awarded: {} };
    const parsed = JSON.parse(raw) as Partial<StreakState>;
    return {
      totalXp: typeof parsed.totalXp === 'number' ? parsed.totalXp : 0,
      currentStreak: typeof parsed.currentStreak === 'number' ? parsed.currentStreak : 0,
      longestStreak: typeof parsed.longestStreak === 'number' ? parsed.longestStreak : 0,
      lastActiveDate: typeof parsed.lastActiveDate === 'string' ? parsed.lastActiveDate : null,
      xpByDate: parsed.xpByDate && typeof parsed.xpByDate === 'object' ? parsed.xpByDate : {},
      awarded: parsed.awarded && typeof parsed.awarded === 'object' ? parsed.awarded : {},
    };
  } catch {
    return { ...EMPTY_STATE, xpByDate: {}, awarded: {} };
  }
}

function saveStreakState(state: StreakState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable — streak simply does not persist
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

/**
 * Record a real completed activity.
 *
 * @param source Which activity was completed.
 * @param xp XP to award.
 * @param idempotencyKey Optional key (e.g. `mission:mission_listening`) — if this
 *   key was already awarded today, nothing changes and the current state is returned.
 * @returns The updated (persisted) streak state.
 */
export function recordActivity(
  source: ActivitySource,
  xp: number,
  idempotencyKey?: string
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
    awarded: { ...state.awarded },
  };

  // Streak: same day keeps it, yesterday extends it, any gap restarts it at 1.
  if (state.lastActiveDate === today) {
    // already active today — streak unchanged
  } else if (state.lastActiveDate === yesterdayKey(today)) {
    next.currentStreak = state.currentStreak + 1;
  } else {
    next.currentStreak = 1;
  }
  next.longestStreak = Math.max(state.longestStreak, next.currentStreak);
  next.lastActiveDate = today;

  next.totalXp = state.totalXp + xp;
  next.xpByDate[today] = (state.xpByDate[today] || 0) + xp;

  if (idempotencyKey) {
    next.awarded[today] = [...(state.awarded[today] || []), idempotencyKey];
  }

  // Keep storage small: only retain the last 30 days of per-day data.
  const cutoff = new Date(`${today}T12:00:00`);
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffKey = localDateKey(cutoff);
  for (const key of Object.keys(next.xpByDate)) {
    if (key < cutoffKey) delete next.xpByDate[key];
  }
  for (const key of Object.keys(next.awarded)) {
    if (key < cutoffKey) delete next.awarded[key];
  }

  saveStreakState(next);
  return next;
}

/** Convenience: record a completed daily mission drill (10 XP, once per mission per day). */
export function recordMissionComplete(missionId: string): StreakState {
  return recordActivity('mission', XP_PER_MISSION, `mission:${missionId}`);
}

/** Convenience: record the all-3-missions bonus (20 XP, once per day). */
export function recordAllMissionsBonus(): StreakState {
  return recordActivity('mission_bonus', XP_ALL_MISSIONS_BONUS, 'mission_bonus');
}

/** Convenience: record finishing the 5-question daily sprint (25 XP, once per day). */
export function recordDailyChallengeComplete(): StreakState {
  return recordActivity('challenge', XP_DAILY_CHALLENGE, 'challenge');
}
