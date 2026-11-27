/**
 * Daily Streak & Exam Reminder scheduler using safe browser Notification feature detection
 * and persistent localStorage configuration (no forced permission prompts on load).
 */

export interface StreakReminderSettings {
  enabled: boolean;
  reminderTime: string; // HH:MM (24-hour)
  lastTriggeredDate: string; // YYYY-MM-DD
}

const REMINDER_STORAGE_KEY = 'bandsprint_daily_reminder_v1';

export function getDefaultReminderSettings(): StreakReminderSettings {
  return {
    enabled: false,
    reminderTime: '20:00',
    lastTriggeredDate: ''
  };
}

export function loadStreakReminderSettings(): StreakReminderSettings {
  if (typeof localStorage === 'undefined') return getDefaultReminderSettings();
  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) return getDefaultReminderSettings();
    const parsed = JSON.parse(raw) as Partial<StreakReminderSettings>;
    const reminderTime =
      typeof parsed.reminderTime === 'string' && /^\d{2}:\d{2}$/.test(parsed.reminderTime)
        ? parsed.reminderTime
        : '20:00';
    return {
      enabled: Boolean(parsed.enabled),
      reminderTime,
      lastTriggeredDate:
        typeof parsed.lastTriggeredDate === 'string' ? parsed.lastTriggeredDate.slice(0, 10) : ''
    };
  } catch {
    return getDefaultReminderSettings();
  }
}

export function saveStreakReminderSettings(
  settings: StreakReminderSettings
): StreakReminderSettings {
  const clean: StreakReminderSettings = {
    enabled: Boolean(settings.enabled),
    reminderTime: /^\d{2}:\d{2}$/.test(settings.reminderTime) ? settings.reminderTime : '20:00',
    lastTriggeredDate: settings.lastTriggeredDate.slice(0, 10)
  };
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(clean));
    } catch {}
  }
  return clean;
}

export function getBrowserNotificationStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return window.Notification.permission;
}

export async function requestStreakNotificationPermission(): Promise<
  'granted' | 'denied' | 'default' | 'unsupported'
> {
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

export function isDailyReminderDueNow(
  settings: StreakReminderSettings,
  todayMinutesLogged: number,
  now: Date = new Date()
): boolean {
  if (!settings.enabled) return false;
  const todayKey = now.toISOString().slice(0, 10);
  if (settings.lastTriggeredDate === todayKey) return false;
  if (todayMinutesLogged >= 15) return false;

  const [hhStr, mmStr] = settings.reminderTime.split(':');
  const hh = Number(hhStr);
  const mm = Number(mmStr);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return false;

  const currentMins = now.getHours() * 60 + now.getMinutes();
  const targetMins = hh * 60 + mm;
  return currentMins >= targetMins;
}

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
      icon: '/daily-sprint-icon.svg'
    });
    return true;
  } catch {
    return false;
  }
}
