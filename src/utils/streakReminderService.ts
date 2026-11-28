/**
 * Recurring Daily BandSprint Browser Notification & Streak Reminder Engine
 *
 * Features:
 * - User-defined daily reminder time (HH:MM) and recurring days of the week (Sun–Sat)
 * - Timezone-accurate local calendar date rollover (never shifts at UTC midnight)
 * - Smart daily task awareness: computes remaining Daily Sprint tasks & due SR cards
 * - Service Worker showNotification() + Window Notification fallback + click-to-navigate
 * - Snooze support (15m), instant test notification, and bidirectional sync with
 *   adaptivePreferencesStore (which syncs reminderEnabled + reminderTime to Firestore)
 */

import { getCompletedMissionsToday, getStreakState } from '../services/streakService';
import {
  isReviewItemDueToday,
  loadDailySprintProgress
} from './dailySprintProgressStore';

export interface StreakReminderSettings {
  enabled: boolean;
  reminderTime: string; // HH:MM (24-hour)
  daysOfWeek: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  skipIfCompletedToday: boolean;
  lastTriggeredDate: string; // Local YYYY-MM-DD
  snoozeUntil: number | null; // Epoch ms if snoozed
}

export interface DailySprintTaskSnapshot {
  completedTasks: number;
  totalTasks: number;
  remainingTasks: number;
  allTasksCompleted: boolean;
  focusMinutesLogged: number;
  dueReviewCount: number;
  currentStreak: number;
}

export interface ReminderNotificationPayload {
  title: string;
  body: string;
  tag: string;
  url: string;
  isTest: boolean;
  snapshot: DailySprintTaskSnapshot;
  firedAt: number;
}

export interface ReminderDeliveryResult {
  browserDelivered: boolean;
  permission: BrowserNotificationPermission;
  payload: ReminderNotificationPayload;
}

export type BrowserNotificationPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export const REMINDER_STORAGE_KEY = 'bandsprint_daily_reminder_v1';
export const LEGACY_REMINDER_STORAGE_KEY = 'bandsprint_streak_reminder_v1';
export const STREAK_REMINDER_UPDATED_EVENT = 'bandsprint_streak_reminder_updated';
export const STREAK_REMINDER_FIRED_EVENT = 'bandsprint_streak_reminder_fired';

export const ALL_DAYS: number[] = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAY_DAYS: number[] = [1, 2, 3, 4, 5];
export const DAY_SHORT_LABELS: readonly string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DAILY_RING_TASK_IDS = [
  'sprint_vocab_idioms',
  'sprint_grammar_accuracy',
  'sprint_timed_drill',
  'sprint_vault_review'
] as const;

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeReminderTime(raw: unknown): string {
  if (typeof raw !== 'string') return '20:00';
  const match = /^(\d{2}):(\d{2})$/.exec(raw.trim());
  if (!match) return '20:00';
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return '20:00';
  }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function normalizeDaysOfWeek(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [...ALL_DAYS];
  const unique = Array.from(
    new Set(
      raw
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    )
  ).sort((a, b) => a - b);
  return unique.length > 0 ? unique : [...ALL_DAYS];
}

export function getDefaultReminderSettings(): StreakReminderSettings {
  return {
    enabled: false,
    reminderTime: '20:00',
    daysOfWeek: [...ALL_DAYS],
    skipIfCompletedToday: true,
    lastTriggeredDate: '',
    snoozeUntil: null
  };
}

export function loadStreakReminderSettings(): StreakReminderSettings {
  if (typeof localStorage === 'undefined') return getDefaultReminderSettings();
  try {
    const raw =
      localStorage.getItem(REMINDER_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_REMINDER_STORAGE_KEY);
    if (!raw) return getDefaultReminderSettings();
    const parsed = JSON.parse(raw) as Partial<StreakReminderSettings> & { time?: string };
    const reminderTime = normalizeReminderTime(parsed.reminderTime ?? parsed.time);
    const snoozeUntil =
      typeof parsed.snoozeUntil === 'number' &&
      Number.isFinite(parsed.snoozeUntil) &&
      parsed.snoozeUntil > 0
        ? parsed.snoozeUntil
        : null;

    return {
      enabled: Boolean(parsed.enabled),
      reminderTime,
      daysOfWeek: normalizeDaysOfWeek(parsed.daysOfWeek),
      skipIfCompletedToday:
        typeof parsed.skipIfCompletedToday === 'boolean' ? parsed.skipIfCompletedToday : true,
      lastTriggeredDate:
        typeof parsed.lastTriggeredDate === 'string' ? parsed.lastTriggeredDate.slice(0, 10) : '',
      snoozeUntil
    };
  } catch {
    return getDefaultReminderSettings();
  }
}

export function saveStreakReminderSettings(
  settings: Partial<StreakReminderSettings> & Pick<StreakReminderSettings, 'enabled' | 'reminderTime'>,
  options?: { skipAdaptiveSync?: boolean }
): StreakReminderSettings {
  const existing = loadStreakReminderSettings();
  const clean: StreakReminderSettings = {
    enabled: Boolean(settings.enabled),
    reminderTime: normalizeReminderTime(settings.reminderTime),
    daysOfWeek: normalizeDaysOfWeek(settings.daysOfWeek ?? existing.daysOfWeek),
    skipIfCompletedToday:
      typeof settings.skipIfCompletedToday === 'boolean'
        ? settings.skipIfCompletedToday
        : existing.skipIfCompletedToday,
    lastTriggeredDate:
      typeof settings.lastTriggeredDate === 'string'
        ? settings.lastTriggeredDate.slice(0, 10)
        : existing.lastTriggeredDate,
    snoozeUntil:
      settings.snoozeUntil === undefined
        ? existing.snoozeUntil
        : settings.snoozeUntil && Number.isFinite(settings.snoozeUntil)
        ? settings.snoozeUntil
        : null
  };

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // ignore storage quota errors
    }
  }

  // Mirror reminderEnabled + reminderTime into adaptivePreferences for Firestore cloud sync
  if (!options?.skipAdaptiveSync && typeof localStorage !== 'undefined') {
    try {
      const prefRaw = localStorage.getItem('bandsprint_adaptive_preferences_v1');
      const prefObj = prefRaw ? JSON.parse(prefRaw) : {};
      const changed =
        Boolean(prefObj.reminderEnabled) !== clean.enabled ||
        prefObj.reminderTime !== clean.reminderTime;
      if (changed || !prefRaw) {
        const nextPrefs = {
          difficultyPreference: prefObj.difficultyPreference || 'auto',
          listeningAccent: prefObj.listeningAccent || 'uk',
          strictExamListening: Boolean(prefObj.strictExamListening),
          ...prefObj,
          reminderEnabled: clean.enabled,
          reminderTime: clean.reminderTime,
          updatedAt: Date.now()
        };
        localStorage.setItem('bandsprint_adaptive_preferences_v1', JSON.stringify(nextPrefs));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('bandsprint_adaptive_preferences_saved', { detail: nextPrefs })
          );
        }
      }
    } catch {
      // non-fatal
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STREAK_REMINDER_UPDATED_EVENT, { detail: clean }));
  }

  return clean;
}

export function snoozeDailyReminder(minutes: number = 15): StreakReminderSettings {
  const current = loadStreakReminderSettings();
  const safeMins = Math.max(1, Math.min(180, Math.round(minutes)));
  return saveStreakReminderSettings(
    {
      ...current,
      snoozeUntil: Date.now() + safeMins * 60_000
    },
    { skipAdaptiveSync: true }
  );
}

export function getBrowserNotificationStatus(): BrowserNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return window.Notification.permission;
}

export async function requestStreakNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (window.Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    const result = await window.Notification.requestPermission();
    return result;
  } catch {
    return window.Notification.permission || 'default';
  }
}

export function getDailySprintCompletionSnapshot(): DailySprintTaskSnapshot {
  const streakState = getStreakState();
  const sprintState = loadDailySprintProgress();
  const completedMissionIds = getCompletedMissionsToday(streakState);

  const completedSet = new Set<string>(completedMissionIds);
  if (
    sprintState.masteredVocabIds.length >= 3 ||
    sprintState.masteredIdiomIds.length >= 2
  ) {
    completedSet.add('sprint_vocab_idioms');
  }
  if (
    sprintState.masteredGrammarIds.length >= 1 ||
    sprintState.masteredSpellingIds.length >= 3
  ) {
    completedSet.add('sprint_grammar_accuracy');
  }
  if (sprintState.pomodoroBlocksCompleted >= 1 || sprintState.lastExamSummary !== null) {
    completedSet.add('sprint_timed_drill');
  }

  const totalTasks = DAILY_RING_TASK_IDS.length;
  const completedTasks = DAILY_RING_TASK_IDS.filter((id) => completedSet.has(id)).length;
  const remainingTasks = Math.max(0, totalTasks - completedTasks);
  const dueReviewCount = sprintState.reviewQueueIds.filter((id) =>
    isReviewItemDueToday(sprintState.reviewSchedule[id])
  ).length;

  return {
    completedTasks,
    totalTasks,
    remainingTasks,
    allTasksCompleted: remainingTasks === 0,
    focusMinutesLogged: sprintState.pomodoroFocusMinutesLogged,
    dueReviewCount,
    currentStreak: streakState.currentStreak
  };
}

export function isDailyReminderDueNow(
  settings: StreakReminderSettings,
  todayMinutesLogged: number,
  now: Date = new Date(),
  options?: { allTasksCompleted?: boolean }
): boolean {
  if (!settings.enabled) return false;

  const nowMs = now.getTime();
  const todayKey = getLocalDateKey(now);

  // If user snoozed an earlier reminder, fire as soon as snooze expires
  if (settings.snoozeUntil !== null) {
    if (nowMs < settings.snoozeUntil) {
      return false;
    }
    return true;
  }

  // Already fired today — wait until next scheduled day
  if (settings.lastTriggeredDate === todayKey) return false;

  // Check if today's weekday is enabled
  const allowedDays = normalizeDaysOfWeek(settings.daysOfWeek);
  if (!allowedDays.includes(now.getDay())) return false;

  // Respect smart skip when all daily tasks (or >=15m fallback when options not passed) are done
  if (settings.skipIfCompletedToday) {
    if (options?.allTasksCompleted === true) return false;
    if (options?.allTasksCompleted === undefined && todayMinutesLogged >= 15) return false;
  }

  const [hhStr, mmStr] = normalizeReminderTime(settings.reminderTime).split(':');
  const hh = Number(hhStr);
  const mm = Number(mmStr);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return false;

  const currentMins = now.getHours() * 60 + now.getMinutes();
  const targetMins = hh * 60 + mm;
  return currentMins >= targetMins;
}

export function getNextReminderDate(
  settings: StreakReminderSettings,
  now: Date = new Date(),
  alreadyCompletedToday: boolean = false
): Date | null {
  if (!settings.enabled) return null;

  if (settings.snoozeUntil && settings.snoozeUntil > now.getTime()) {
    return new Date(settings.snoozeUntil);
  }

  const allowedDays = new Set(normalizeDaysOfWeek(settings.daysOfWeek));
  const [hhStr, mmStr] = normalizeReminderTime(settings.reminderTime).split(':');
  const hh = Number(hhStr);
  const mm = Number(mmStr);
  const todayKey = getLocalDateKey(now);

  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset,
      hh,
      mm,
      0,
      0
    );
    if (!allowedDays.has(candidate.getDay())) continue;
    if (offset === 0) {
      if (settings.lastTriggeredDate === todayKey) continue;
      if (settings.skipIfCompletedToday && alreadyCompletedToday) continue;
      if (candidate.getTime() <= now.getTime()) {
        // Still due today right now
        return now;
      }
    }
    return candidate;
  }

  return null;
}

export function formatTime12Hour(hhmm: string): string {
  const [hhStr, mmStr] = normalizeReminderTime(hhmm).split(':');
  const hh = Number(hhStr);
  const period = hh >= 12 ? 'PM' : 'AM';
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}:${mmStr} ${period}`;
}

export function formatDaysSummary(daysOfWeek: number[]): string {
  const days = normalizeDaysOfWeek(daysOfWeek);
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && WEEKDAY_DAYS.every((d) => days.includes(d))) return 'Weekdays';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
  return days.map((d) => DAY_SHORT_LABELS[d]).join(', ');
}

export function formatNextReminderLabel(
  settings: StreakReminderSettings,
  now: Date = new Date(),
  alreadyCompletedToday: boolean = false
): string {
  if (!settings.enabled) return 'Paused';
  const next = getNextReminderDate(settings, now, alreadyCompletedToday);
  if (!next) return 'Paused';

  const diffMs = next.getTime() - now.getTime();
  const formattedTime = formatTime12Hour(
    `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`
  );

  if (settings.snoozeUntil && settings.snoozeUntil > now.getTime()) {
    const minsLeft = Math.max(1, Math.ceil(diffMs / 60_000));
    return `Snoozed · rings in ${minsLeft}m (${formattedTime})`;
  }

  const todayKey = getLocalDateKey(now);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowKey = getLocalDateKey(tomorrow);
  const nextKey = getLocalDateKey(next);

  if (nextKey === todayKey) {
    if (diffMs <= 60_000) return `Due now (${formattedTime})`;
    const totalMins = Math.ceil(diffMs / 60_000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const countdown = hrs > 0 ? (mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`) : `${mins}m`;
    return `Today at ${formattedTime} · in ${countdown}`;
  }

  if (nextKey === tomorrowKey) {
    return `Tomorrow at ${formattedTime}`;
  }

  return `${DAY_SHORT_LABELS[next.getDay()]} at ${formattedTime}`;
}

export function buildReminderPayload(options?: {
  isTest?: boolean;
  snapshot?: DailySprintTaskSnapshot;
  targetBand?: number;
}): ReminderNotificationPayload {
  const snapshot = options?.snapshot ?? getDailySprintCompletionSnapshot();
  const isTest = Boolean(options?.isTest);
  const bandLabel = options?.targetBand ? `Band ${options.targetBand.toFixed(1)}` : 'your target band';

  const title = isTest
    ? 'BandSprint Test Reminder'
    : snapshot.currentStreak > 0
    ? `Protect Your ${snapshot.currentStreak}-Day BandSprint Streak`
    : 'Time for Your Daily BandSprint';

  let body: string;
  if (isTest) {
    body =
      snapshot.remainingTasks > 0
        ? `Notifications are working! You have ${snapshot.remainingTasks} daily ${
            snapshot.remainingTasks === 1 ? 'task' : 'tasks'
          } left today toward ${bandLabel}.`
        : `Notifications are working! Today’s Daily Sprint is already 100% done — you are on pace for ${bandLabel}.`;
  } else if (snapshot.remainingTasks > 0 && snapshot.dueReviewCount > 0) {
    body = `You have ${snapshot.remainingTasks} daily ${
      snapshot.remainingTasks === 1 ? 'task' : 'tasks'
    } and ${snapshot.dueReviewCount} due recall ${
      snapshot.dueReviewCount === 1 ? 'card' : 'cards'
    } waiting. Knock out a quick sprint to stay on track for ${bandLabel}.`;
  } else if (snapshot.remainingTasks > 0) {
    body = `${snapshot.remainingTasks} of ${snapshot.totalTasks} daily BandSprint ${
      snapshot.remainingTasks === 1 ? 'task is' : 'tasks are'
    } left today. Complete a quick session to keep your streak alive!`;
  } else {
    body = `Keep your IELTS momentum sharp with a quick 15m Daily Sprint toward ${bandLabel}.`;
  }

  return {
    title,
    body,
    tag: isTest ? 'bandsprint-daily-reminder-test' : 'bandsprint-daily-reminder',
    url: '/learn/daily-sprint',
    isTest,
    snapshot,
    firedAt: Date.now()
  };
}

export async function deliverDailyReminderNotification(options?: {
  isTest?: boolean;
  snapshot?: DailySprintTaskSnapshot;
  targetBand?: number;
  onNavigate?: (path: string) => void;
}): Promise<ReminderDeliveryResult> {
  const payload = buildReminderPayload(options);
  const permission = getBrowserNotificationStatus();
  let browserDelivered = false;

  if (typeof window !== 'undefined' && permission === 'granted') {
    const notifOptions: NotificationOptions = {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/daily-sprint-icon.svg',
      tag: payload.tag,
      data: { url: payload.url }
    };

    // Prefer active Service Worker registration (works reliably on mobile PWAs & background tabs)
    if ('serviceWorker' in navigator) {
      try {
        const reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 900))
        ]);
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(payload.title, notifOptions);
          browserDelivered = true;
        }
      } catch {
        // Fallback to direct Window Notification below
      }
    }

    if (!browserDelivered && 'Notification' in window) {
      try {
        const notif = new window.Notification(payload.title, notifOptions);
        notif.onclick = () => {
          try {
            window.focus();
            notif.close();
          } catch {
            // ignore
          }
          if (options?.onNavigate) {
            options.onNavigate(payload.url);
          } else {
            window.dispatchEvent(
              new CustomEvent('bandsprint_navigate_request', { detail: { path: payload.url } })
            );
          }
        };
        browserDelivered = true;
      } catch {
        browserDelivered = false;
      }
    }
  }

  if (typeof window !== 'undefined' && !payload.isTest) {
    window.dispatchEvent(new CustomEvent(STREAK_REMINDER_FIRED_EVENT, { detail: payload }));
  }

  return {
    browserDelivered,
    permission,
    payload
  };
}

export async function sendTestStreakReminderNotification(options?: {
  targetBand?: number;
  onNavigate?: (path: string) => void;
}): Promise<ReminderDeliveryResult> {
  let perm = getBrowserNotificationStatus();
  if (perm === 'default') {
    perm = await requestStreakNotificationPermission();
  }
  return deliverDailyReminderNotification({
    isTest: true,
    targetBand: options?.targetBand,
    onNavigate: options?.onNavigate
  });
}

/**
 * Backwards-compatible synchronous helper kept for any existing callers.
 */
export function triggerStreakReminderNotification(dueQueueCount: number): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (window.Notification.permission !== 'granted') return false;
  try {
    const body =
      dueQueueCount > 0
        ? `Your ${dueQueueCount} due IELTS review cards and 15m Pomodoro Sprint are waiting to protect your streak.`
        : 'Keep your IELTS Band 8+ streak alive — knock out one quick 15m Daily Sprint block today.';
    new window.Notification('BandSprint Daily IELTS Reminder', {
      body,
      icon: '/icon-192.png',
      tag: 'bandsprint-daily-reminder'
    });
    return true;
  } catch {
    return false;
  }
}
