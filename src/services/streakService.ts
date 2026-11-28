/**
 * BandSprint Streak, Study Minutes, XP & Streak Rescue Service — atomic local persistence.
 *
 * Persists streak, Weekly XP, Today's Goal minutes, completed daily tasks,
 * earned Streak Freezes, and guilt-free Streak Rescue quests atomically in localStorage.
 */

export type ActivitySource =
  | 'mission'
  | 'mission_bonus'
  | 'challenge'
  | 'diagnostic'
  | 'mock'
  | 'practice_hint_recovery'
  | 'spoken_warmup'
  | 'streak_rescue';

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
  /** Earned Streak Freezes (unlocked at 300+ Weekly XP, max 2 held). */
  streakFreezesAvailable?: number;
  /** Week identifier (YYYY-Www) when a weekly XP freeze was last granted. */
  lastFreezeEarnedWeekKey?: string | null;
  /** Prior streak length eligible for a 48-hour guilt-free Streak Repair Quest. */
  brokenStreakToRescue?: number;
  /** Date key when the streak was detected as broken. */
  brokenStreakDate?: string | null;
}

export interface StreakRescueStatus {
  status: 'healthy' | 'at_risk' | 'rescue_available';
  currentStreak: number;
  brokenStreakToRescue: number;
  freezesAvailable: number;
  weeklyXp: number;
  weeklyXpToNextFreeze: number;
  activeToday: boolean;
}

const STORAGE_KEY = 'bandsprint_streak_v1';

/** Weekly XP goal: 3 missions/day (10 XP each) + all-3 bonus (20 XP) + daily sprint (25 XP) = 75 XP/day, 525/week. */
export const WEEKLY_XP_GOAL = 500;
export const WEEKLY_XP_FREEZE_THRESHOLD = 300;
export const MAX_STREAK_FREEZES = 2;

export const XP_PER_MISSION = 10;
export const XP_ALL_MISSIONS_BONUS = 20;
export const XP_DAILY_CHALLENGE = 25;
export const XP_DIAGNOSTIC = 50;
export const XP_MOCK = 100;
export const XP_HINT_RECOVERY = 15;
export const XP_SPOKEN_WARMUP = 15;
export const XP_STREAK_RESCUE = 20;

const EMPTY_STATE: StreakState = {
  totalXp: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  xpByDate: {},
  minutesByDate: {},
  completedMissionsByDate: {},
  awarded: {},
  streakFreezesAvailable: 0,
  lastFreezeEarnedWeekKey: null,
  brokenStreakToRescue: 0,
  brokenStreakDate: null,
};

/** Local YYYY-MM-DD (local time, not UTC — a streak belongs to the user's day). */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shiftDateKey(baseKey: string, deltaDays: number): string {
  const d = new Date(`${baseKey}T12:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return localDateKey(d);
}

function yesterdayKey(today: string): string {
  return shiftDateKey(today, -1);
}

function daysBetweenKeys(earlierKey: string, laterKey: string): number {
  const a = new Date(`${earlierKey}T12:00:00`).getTime();
  const b = new Date(`${laterKey}T12:00:00`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 999;
  return Math.round((b - a) / 86_400_000);
}

function currentIsoWeekKey(date: Date = new Date()): string {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNo =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86_400_000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    );
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function broadcastSyncEvents(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('bandsprint_streak_updated'));
  window.dispatchEvent(new CustomEvent('bandsprint_tasks_updated'));
}

function pruneOldDates(state: StreakState, today: string): void {
  const cutoffKey = shiftDateKey(today, -30);
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
  if (typeof localStorage === 'undefined') {
    return {
      ...EMPTY_STATE,
      xpByDate: {},
      minutesByDate: {},
      completedMissionsByDate: {},
      awarded: {},
    };
  }
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
      streakFreezesAvailable:
        typeof parsed.streakFreezesAvailable === 'number'
          ? Math.max(0, Math.min(MAX_STREAK_FREEZES, Math.floor(parsed.streakFreezesAvailable)))
          : 0,
      lastFreezeEarnedWeekKey:
        typeof parsed.lastFreezeEarnedWeekKey === 'string' ? parsed.lastFreezeEarnedWeekKey : null,
      brokenStreakToRescue:
        typeof parsed.brokenStreakToRescue === 'number' ? Math.max(0, Math.floor(parsed.brokenStreakToRescue)) : 0,
      brokenStreakDate: typeof parsed.brokenStreakDate === 'string' ? parsed.brokenStreakDate : null,
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
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable
  }
}

/** XP earned in the last 7 days (including today). Used for the weekly goal bar. */
export function getWeeklyXp(state: StreakState = getStreakState()): number {
  const today = localDateKey();
  let total = 0;
  for (let i = 0; i < 7; i++) {
    total += state.xpByDate[shiftDateKey(today, -i)] || 0;
  }
  return total;
}

/** Study minutes logged today from completed daily tasks, blitz sprints, diagnostics, and mocks. */
export function getTodayMinutes(state: StreakState = getStreakState()): number {
  const today = localDateKey();
  const explicitMinutes = state.minutesByDate?.[today] || 0;
  if (explicitMinutes > 0) return explicitMinutes;
  const xpToday = state.xpByDate?.[today] || 0;
  return xpToday > 0 ? Math.round(xpToday / 5) * 3 : 0;
}

/** Completed daily mission IDs for today (local date key). */
export function getCompletedMissionsToday(state: StreakState = getStreakState()): string[] {
  const today = localDateKey();
  const stored = state.completedMissionsByDate?.[today];
  if (Array.isArray(stored)) return stored;
  if (typeof localStorage !== 'undefined') {
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
  }
  return [];
}

/**
 * Evaluates whether the candidate's streak is healthy, at risk today, or eligible
 * for Barnaby's guilt-free Streak Repair Quest / Streak Freeze.
 */
export function getStreakRescueStatus(
  state: StreakState = getStreakState(),
  today: string = localDateKey()
): StreakRescueStatus {
  const weeklyXp = getWeeklyXp(state);
  const freezesAvailable = state.streakFreezesAvailable || 0;
  const weeklyXpToNextFreeze = Math.max(0, WEEKLY_XP_FREEZE_THRESHOLD - weeklyXp);
  const activeToday = state.lastActiveDate === today && (state.xpByDate[today] || 0) > 0;

  // Check if a recent streak (>= 2 days) just lapsed by 2-3 days and is eligible for rescue
  if (state.lastActiveDate && state.lastActiveDate !== today) {
    const gapDays = daysBetweenKeys(state.lastActiveDate, today);
    if (gapDays >= 2 && gapDays <= 3 && state.currentStreak >= 2) {
      return {
        status: 'rescue_available',
        currentStreak: 0,
        brokenStreakToRescue: state.currentStreak,
        freezesAvailable,
        weeklyXp,
        weeklyXpToNextFreeze,
        activeToday: false,
      };
    }
    if (gapDays === 1 && state.currentStreak >= 1) {
      return {
        status: 'at_risk',
        currentStreak: state.currentStreak,
        brokenStreakToRescue: 0,
        freezesAvailable,
        weeklyXp,
        weeklyXpToNextFreeze,
        activeToday: false,
      };
    }
  }

  // Also check if a broken streak was explicitly captured in state within 48h
  if (
    (state.brokenStreakToRescue || 0) >= 2 &&
    state.brokenStreakDate &&
    daysBetweenKeys(state.brokenStreakDate, today) <= 2
  ) {
    return {
      status: 'rescue_available',
      currentStreak: state.currentStreak,
      brokenStreakToRescue: state.brokenStreakToRescue || 0,
      freezesAvailable,
      weeklyXp,
      weeklyXpToNextFreeze,
      activeToday,
    };
  }

  return {
    status: 'healthy',
    currentStreak: state.currentStreak,
    brokenStreakToRescue: 0,
    freezesAvailable,
    weeklyXp,
    weeklyXpToNextFreeze,
    activeToday,
  };
}

function maybeGrantWeeklyFreeze(next: StreakState): void {
  const weekKey = currentIsoWeekKey();
  const weeklyXp = getWeeklyXp(next);
  const freezes = next.streakFreezesAvailable || 0;
  if (
    weeklyXp >= WEEKLY_XP_FREEZE_THRESHOLD &&
    freezes < MAX_STREAK_FREEZES &&
    next.lastFreezeEarnedWeekKey !== weekKey
  ) {
    next.streakFreezesAvailable = freezes + 1;
    next.lastFreezeEarnedWeekKey = weekKey;
  }
}

/**
 * Consumes 1 earned Streak Freeze to protect or restore a missed day without losing streak momentum.
 */
export function applyStreakFreeze(): { applied: boolean; state: StreakState } {
  const state = getStreakState();
  const today = localDateKey();
  const freezes = state.streakFreezesAvailable || 0;
  if (freezes <= 0) return { applied: false, state };

  const rescue = getStreakRescueStatus(state, today);
  const restoredCount =
    rescue.status === 'rescue_available'
      ? Math.max(state.currentStreak, rescue.brokenStreakToRescue)
      : Math.max(1, state.currentStreak);

  const next: StreakState = {
    ...state,
    currentStreak: restoredCount,
    longestStreak: Math.max(state.longestStreak, restoredCount),
    lastActiveDate: today,
    streakFreezesAvailable: freezes - 1,
    brokenStreakToRescue: 0,
    brokenStreakDate: null,
  };

  saveStreakState(next);
  broadcastSyncEvents();
  return { applied: true, state: next };
}

/**
 * Completes Barnaby's guilt-free Streak Repair Quest, healing a recently lapsed streak (+20 XP).
 */
export function completeStreakRescueQuest(): { rescued: boolean; restoredStreak: number; state: StreakState } {
  const state = getStreakState();
  const today = localDateKey();
  const rescue = getStreakRescueStatus(state, today);
  if (rescue.status !== 'rescue_available' || rescue.brokenStreakToRescue < 2) {
    return { rescued: false, restoredStreak: state.currentStreak, state };
  }

  const healedStreak = rescue.brokenStreakToRescue + 1;
  const next: StreakState = {
    ...state,
    xpByDate: { ...state.xpByDate },
    minutesByDate: { ...state.minutesByDate },
    completedMissionsByDate: { ...state.completedMissionsByDate },
    awarded: { ...state.awarded },
    currentStreak: healedStreak,
    longestStreak: Math.max(state.longestStreak, healedStreak),
    lastActiveDate: today,
    totalXp: state.totalXp + XP_STREAK_RESCUE,
    brokenStreakToRescue: 0,
    brokenStreakDate: null,
  };
  next.xpByDate[today] = (next.xpByDate[today] || 0) + XP_STREAK_RESCUE;
  next.minutesByDate[today] = (next.minutesByDate[today] || 0) + 3;
  next.awarded[today] = Array.from(new Set([...(next.awarded[today] || []), 'streak_rescue']));

  maybeGrantWeeklyFreeze(next);
  pruneOldDates(next, today);
  saveStreakState(next);
  broadcastSyncEvents();
  return { rescued: true, restoredStreak: healedStreak, state: next };
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
      return state;
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
    // already active today
  } else if (state.lastActiveDate === yesterdayKey(today)) {
    next.currentStreak = state.currentStreak + 1;
  } else {
    // Capture recently lapsed streak (2-3 days gap) for guilt-free Barnaby Streak Repair Quest
    if (
      state.lastActiveDate &&
      state.currentStreak >= 2 &&
      daysBetweenKeys(state.lastActiveDate, today) <= 3
    ) {
      next.brokenStreakToRescue = state.currentStreak;
      next.brokenStreakDate = today;
    }
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

  maybeGrantWeeklyFreeze(next);
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
      if (
        state.lastActiveDate &&
        state.currentStreak >= 2 &&
        daysBetweenKeys(state.lastActiveDate, today) <= 3
      ) {
        next.brokenStreakToRescue = state.currentStreak;
        next.brokenStreakDate = today;
      }
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

  maybeGrantWeeklyFreeze(next);
  pruneOldDates(next, today);
  saveStreakState(next);

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`ielts_sprint_missions_${today}`, JSON.stringify(nextCompleted));
    } catch {
      // ignore
    }
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

export function recordMissionComplete(missionId: string, minutes: number = 10): StreakState {
  return recordActivity('mission', XP_PER_MISSION, `mission:${missionId}`, minutes);
}

export function recordAllMissionsBonus(): StreakState {
  return recordActivity('mission_bonus', XP_ALL_MISSIONS_BONUS, 'mission_bonus', 0);
}

export function recordDailyChallengeComplete(): StreakState {
  return recordActivity('challenge', XP_DAILY_CHALLENGE, 'challenge', 5);
}

export function recordHintRecoveryXp(questionKey: string): StreakState {
  const cleanKey = questionKey.trim() || 'practice_q';
  return recordActivity('practice_hint_recovery', XP_HINT_RECOVERY, `hint_recovery:${cleanKey}`, 1);
}

export function recordSpokenWarmupComplete(): StreakState {
  return recordActivity('spoken_warmup', XP_SPOKEN_WARMUP, 'spoken_warmup_daily', 2);
}
