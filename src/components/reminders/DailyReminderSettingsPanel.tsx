import React, { useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  Check,
  Clock,
  Send,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import {
  ALL_DAYS,
  BrowserNotificationPermission,
  DAY_SHORT_LABELS,
  formatDaysSummary,
  formatNextReminderLabel,
  formatTime12Hour,
  getBrowserNotificationStatus,
  getDailySprintCompletionSnapshot,
  loadStreakReminderSettings,
  requestStreakNotificationPermission,
  saveStreakReminderSettings,
  sendTestStreakReminderNotification,
  STREAK_REMINDER_UPDATED_EVENT,
  StreakReminderSettings,
  WEEKDAY_DAYS
} from '../../utils/streakReminderService';
import { DAILY_SPRINT_SYNCED_EVENT } from '../../utils/dailySprintProgressStore';
import { audioManager } from '../../services/AudioManager';

interface DailyReminderSettingsPanelProps {
  onShowToast?: (msg: string) => void;
  onNavigate?: (path: string) => void;
  targetBand?: number;
  compact?: boolean;
}

const TIME_PRESETS = [
  { label: 'Morning', time: '08:00' },
  { label: 'Midday', time: '13:00' },
  { label: 'Evening', time: '19:30' },
  { label: 'Night', time: '21:00' }
] as const;

export const DailyReminderSettingsPanel: React.FC<DailyReminderSettingsPanelProps> = ({
  onShowToast,
  onNavigate,
  targetBand,
  compact = false
}) => {
  const [settings, setSettings] = useState<StreakReminderSettings>(() =>
    loadStreakReminderSettings()
  );
  const [permission, setPermission] = useState<BrowserNotificationPermission>(() =>
    getBrowserNotificationStatus()
  );
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSettings(loadStreakReminderSettings());
      setPermission(getBrowserNotificationStatus());
      setNowTick(Date.now());
    };
    window.addEventListener(STREAK_REMINDER_UPDATED_EVENT, sync);
    window.addEventListener('bandsprint_cloud_sync_updated', sync);
    window.addEventListener('bandsprint_streak_updated', sync);
    window.addEventListener(DAILY_SPRINT_SYNCED_EVENT, sync);
    const interval = window.setInterval(() => setNowTick(Date.now()), 30_000);
    return () => {
      window.removeEventListener(STREAK_REMINDER_UPDATED_EVENT, sync);
      window.removeEventListener('bandsprint_cloud_sync_updated', sync);
      window.removeEventListener('bandsprint_streak_updated', sync);
      window.removeEventListener(DAILY_SPRINT_SYNCED_EVENT, sync);
      window.clearInterval(interval);
    };
  }, []);

  const snapshot = getDailySprintCompletionSnapshot();
  const nextLabel = formatNextReminderLabel(
    settings,
    new Date(nowTick),
    snapshot.allTasksCompleted
  );

  const handleToggleEnabled = async () => {
    audioManager.playUiClick('toggle');
    const nextEnabled = !settings.enabled;
    if (nextEnabled) {
      const perm = await requestStreakNotificationPermission();
      setPermission(perm);
      const saved = saveStreakReminderSettings({
        ...settings,
        enabled: true,
        snoozeUntil: null
      });
      setSettings(saved);
      onShowToast?.(
        perm === 'granted'
          ? `Recurring daily reminder active at ${formatTime12Hour(saved.reminderTime)} (${formatDaysSummary(saved.daysOfWeek)}).`
          : `Daily reminder scheduled for ${formatTime12Hour(saved.reminderTime)} — in-app alerts active while browser notifications are ${perm}.`
      );
    } else {
      const saved = saveStreakReminderSettings({
        ...settings,
        enabled: false,
        snoozeUntil: null
      });
      setSettings(saved);
      onShowToast?.('Recurring daily BandSprint reminders paused.');
    }
  };

  const handleRequestPermission = async () => {
    audioManager.playUiClick('soft');
    const perm = await requestStreakNotificationPermission();
    setPermission(perm);
    if (perm === 'granted') {
      onShowToast?.('Browser notifications enabled for BandSprint!');
    } else if (perm === 'denied') {
      onShowToast?.('Browser notifications are blocked — unblock in site settings to receive OS alerts.');
    } else {
      onShowToast?.('Browser notification prompt dismissed. In-app reminders remain active.');
    }
  };

  const handleTimeChange = (nextTime: string) => {
    if (!/^\d{2}:\d{2}$/.test(nextTime)) return;
    const saved = saveStreakReminderSettings({
      ...settings,
      reminderTime: nextTime,
      lastTriggeredDate: '',
      snoozeUntil: null
    });
    setSettings(saved);
    onShowToast?.(`Daily reminder time updated to ${formatTime12Hour(saved.reminderTime)}.`);
  };

  const handleToggleDay = (dayIdx: number) => {
    audioManager.playUiClick('soft');
    const exists = settings.daysOfWeek.includes(dayIdx);
    const nextDays = exists
      ? settings.daysOfWeek.filter((d) => d !== dayIdx)
      : [...settings.daysOfWeek, dayIdx].sort((a, b) => a - b);

    if (nextDays.length === 0) {
      onShowToast?.('Select at least one day for recurring reminders.');
      return;
    }

    const saved = saveStreakReminderSettings({
      ...settings,
      daysOfWeek: nextDays
    });
    setSettings(saved);
  };

  const handleApplyDayPreset = (days: number[]) => {
    audioManager.playUiClick('soft');
    const saved = saveStreakReminderSettings({
      ...settings,
      daysOfWeek: [...days]
    });
    setSettings(saved);
  };

  const handleToggleSmartSkip = () => {
    audioManager.playUiClick('toggle');
    const saved = saveStreakReminderSettings({
      ...settings,
      skipIfCompletedToday: !settings.skipIfCompletedToday
    });
    setSettings(saved);
  };

  const handleSendTest = async () => {
    if (isSendingTest) return;
    setIsSendingTest(true);
    audioManager.playUiClick('check');
    try {
      const result = await sendTestStreakReminderNotification({
        targetBand,
        onNavigate
      });
      setPermission(result.permission);
      if (result.browserDelivered) {
        onShowToast?.('Test browser notification sent! Check your system notification tray.');
      } else if (result.permission === 'denied') {
        onShowToast?.(
          'Browser alerts are blocked in this browser/preview — in-app reminder banners will still fire on schedule.'
        );
      } else {
        onShowToast?.(
          `In-app preview: "${result.payload.title}" — ${result.payload.body}`
        );
      }
    } finally {
      setIsSendingTest(false);
    }
  };

  const isEveryDay = settings.daysOfWeek.length === 7;
  const isWeekdaysOnly =
    settings.daysOfWeek.length === 5 &&
    WEEKDAY_DAYS.every((d) => settings.daysOfWeek.includes(d));

  return (
    <section
      data-testid="daily-reminder-settings-panel"
      className={`rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 ${
        compact ? 'p-4 space-y-4' : 'p-5 space-y-5'
      }`}
    >
      {/* Header + Master Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3.5 border-b border-[#D3DDDA]/70 dark:border-[#1F8A70]/25">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#566664] dark:text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[#0F4C45] dark:text-[#6EE7B7] inline-flex items-center gap-1.5">
              {settings.enabled ? (
                <BellRing className="w-3.5 h-3.5 text-[#F4A62A]" />
              ) : (
                <BellOff className="w-3.5 h-3.5 text-[#566664] dark:text-slate-400" />
              )}
              <span>Daily Study Reminder</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">
              {nextLabel}
            </span>
          </div>
          <h3 className="font-display text-base font-bold text-[#0E1F1E] dark:text-white">
            Recurring BandSprint Streak Notifications
          </h3>
          <p className="text-xs text-[#566664] dark:text-slate-400 leading-relaxed">
            Get a browser notification at your chosen time every scheduled day so you never break your study streak.
          </p>
        </div>

        <button
          type="button"
          data-testid="reminder-master-toggle"
          aria-pressed={settings.enabled}
          onClick={handleToggleEnabled}
          className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition ${
            settings.enabled
              ? 'bg-[#0F4C45] hover:bg-[#0B3833] text-white'
              : 'bg-[#EEF3F1] dark:bg-[#0B1514] hover:bg-[#D3DDDA] dark:hover:bg-[#17302C] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-[#0E1F1E] dark:text-white'
          }`}
        >
          {settings.enabled ? (
            <>
              <Bell className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span>Reminders On</span>
            </>
          ) : (
            <>
              <BellOff className="w-3.5 h-3.5" />
              <span>Enable Reminders</span>
            </>
          )}
        </button>
      </div>

      {/* Permission Status Row (Explicit Icon + Label — never color-only) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 text-[#566664] dark:text-slate-300">
          {permission === 'granted' ? (
            <>
              <Check className="w-4 h-4 text-[#1F8A70] dark:text-[#6EE7B7] shrink-0" />
              <span>
                <strong className="text-[#0E1F1E] dark:text-white">Browser Alerts Active</strong> · System &amp; in-app alerts ready
              </span>
            </>
          ) : permission === 'denied' ? (
            <>
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong className="text-[#0E1F1E] dark:text-white">Browser Alerts Blocked</strong> · In-app reminders remain active (allow in browser site settings for desktop alerts)
              </span>
            </>
          ) : permission === 'default' ? (
            <>
              <Bell className="w-4 h-4 text-[#0F4C45] dark:text-[#F4A62A] shrink-0" />
              <span>
                <strong className="text-[#0E1F1E] dark:text-white">Permission Needed</strong> · Grant browser alert permission for desktop &amp; background reminders
              </span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4 text-[#566664] shrink-0" />
              <span>
                <strong className="text-[#0E1F1E] dark:text-white">In-App Reminders Only</strong> · Browser Notification API unavailable in this environment
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {permission === 'default' && (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#FEF6E8] dark:bg-[#F4A62A]/15 border border-[#F4A62A]/50 text-[#8F5B0E] dark:text-[#F4A62A] text-xs font-bold whitespace-nowrap cursor-pointer transition hover:brightness-95"
            >
              Allow Browser Alerts
            </button>
          )}
          <button
            type="button"
            data-testid="reminder-send-test-btn"
            disabled={isSendingTest}
            onClick={handleSendTest}
            className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#EEF3F1] dark:bg-[#0B1514] hover:bg-[#D3DDDA] dark:hover:bg-[#17302C] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-[#0F4C45] dark:text-[#6EE7B7] text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5 text-[#F4A62A]" />
            <span>{isSendingTest ? 'Sending...' : 'Send Test Alert'}</span>
          </button>
        </div>
      </div>

      {/* Time Picker + Quick Presets */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
        <div className="md:col-span-5 space-y-2">
          <label
            htmlFor="bandsprint-reminder-time-input"
            className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-[#566664] dark:text-slate-400"
          >
            <Clock className="w-3.5 h-3.5 text-[#F4A62A]" />
            <span>Reminder Time (Local)</span>
          </label>

          <div className="flex items-center gap-2">
            <input
              id="bandsprint-reminder-time-input"
              data-testid="reminder-time-input"
              type="time"
              value={settings.reminderTime}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="min-h-[42px] px-3 py-2 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-sm font-mono font-bold text-[#0E1F1E] dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F4C45]"
            />
            <span className="text-xs font-mono text-[#566664] dark:text-slate-400 tabular-nums whitespace-nowrap">
              {formatTime12Hour(settings.reminderTime)}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {TIME_PRESETS.map((preset) => {
              const active = settings.reminderTime === preset.time;
              return (
                <button
                  key={preset.time}
                  type="button"
                  onClick={() => handleTimeChange(preset.time)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#0F4C45] text-white'
                      : 'bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/25 text-[#566664] dark:text-slate-300 hover:border-[#0F4C45]'
                  }`}
                >
                  {preset.label} · {preset.time}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recurring Days of Week */}
        <div className="md:col-span-7 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#566664] dark:text-slate-400">
              Repeat Schedule ({formatDaysSummary(settings.daysOfWeek)})
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyDayPreset(ALL_DAYS)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer transition whitespace-nowrap ${
                  isEveryDay
                    ? 'bg-[#0F4C45] text-white'
                    : 'text-[#566664] dark:text-slate-400 hover:text-[#0E1F1E] dark:hover:text-white'
                }`}
              >
                Every day
              </button>
              <button
                type="button"
                onClick={() => handleApplyDayPreset(WEEKDAY_DAYS)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer transition whitespace-nowrap ${
                  isWeekdaysOnly
                    ? 'bg-[#0F4C45] text-white'
                    : 'text-[#566664] dark:text-slate-400 hover:text-[#0E1F1E] dark:hover:text-white'
                }`}
              >
                Weekdays
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {DAY_SHORT_LABELS.map((label, dayIdx) => {
              const selected = settings.daysOfWeek.includes(dayIdx);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={selected}
                  data-testid={`reminder-day-${dayIdx}`}
                  onClick={() => handleToggleDay(dayIdx)}
                  className={`min-h-[40px] rounded-xl text-xs font-bold border transition cursor-pointer ${
                    selected
                      ? 'bg-[#0F4C45] border-[#0F4C45] text-white'
                      : 'bg-[#F7F9F8] dark:bg-[#0B1514] border-[#D3DDDA] dark:border-[#1F8A70]/25 text-[#566664] dark:text-slate-400 hover:border-[#0F4C45]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Smart Skip Completed Toggle */}
          <label className="pt-1.5 flex items-center justify-between gap-3 cursor-pointer select-none">
            <span className="text-xs text-[#566664] dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#F4A62A] shrink-0" />
              <span>Skip alert if today’s 4 Daily Sprint tasks are already 100% done</span>
            </span>
            <input
              type="checkbox"
              checked={settings.skipIfCompletedToday}
              onChange={handleToggleSmartSkip}
              className="w-4 h-4 accent-[#0F4C45] rounded cursor-pointer shrink-0"
            />
          </label>
        </div>
      </div>
    </section>
  );
};
