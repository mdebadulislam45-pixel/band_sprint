import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BellRing, Clock, Flame, X } from 'lucide-react';
import { UserProfile } from '../../types';
import {
  deliverDailyReminderNotification,
  getDailySprintCompletionSnapshot,
  getLocalDateKey,
  getNextReminderDate,
  isDailyReminderDueNow,
  loadStreakReminderSettings,
  ReminderNotificationPayload,
  saveStreakReminderSettings,
  snoozeDailyReminder,
  STREAK_REMINDER_UPDATED_EVENT
} from '../../utils/streakReminderService';
import { audioManager } from '../../services/AudioManager';

interface DailyReminderManagerProps {
  currentPath: string;
  user?: UserProfile | null;
  onNavigate: (path: string) => void;
  onShowToast: (msg: string) => void;
}

const TIMED_EXAM_ROUTES = ['/practice/mock-tests'];

export const DailyReminderManager: React.FC<DailyReminderManagerProps> = ({
  currentPath,
  user,
  onNavigate,
  onShowToast
}) => {
  const [activeReminder, setActiveReminder] = useState<ReminderNotificationPayload | null>(null);
  const timerRef = useRef<number | null>(null);
  const isCheckingRef = useRef<boolean>(false);

  const isInTimedExam = TIMED_EXAM_ROUTES.some((prefix) => currentPath.startsWith(prefix));
  const targetBand = user?.progress?.targetBand;

  const evaluateAndSchedule = useCallback(async () => {
    if (typeof window === 'undefined' || isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      const settings = loadStreakReminderSettings();
      if (!settings.enabled) return;

      const now = new Date();
      const snapshot = getDailySprintCompletionSnapshot();

      if (
        isDailyReminderDueNow(settings, snapshot.focusMinutesLogged, now, {
          allTasksCompleted: snapshot.allTasksCompleted
        })
      ) {
        const todayKey = getLocalDateKey(now);
        saveStreakReminderSettings(
          {
            ...settings,
            lastTriggeredDate: todayKey,
            snoozeUntil: null
          },
          { skipAdaptiveSync: true }
        );

        const delivery = await deliverDailyReminderNotification({
          snapshot,
          targetBand,
          onNavigate
        });

        // Show clean in-app reminder banner when not inside a timed mock exam
        if (!isInTimedExam) {
          setActiveReminder(delivery.payload);
          audioManager.playUiClick('check');
        }
      }

      // Schedule exact next wakeup (capped at 60s chunks to avoid background tab timer drift)
      const refreshed = loadStreakReminderSettings();
      const nextDate = getNextReminderDate(refreshed, new Date(), snapshot.allTasksCompleted);
      if (nextDate) {
        const msUntilNext = Math.max(2_000, nextDate.getTime() - Date.now());
        const delay = Math.min(msUntilNext, 60_000);
        timerRef.current = window.setTimeout(() => {
          void evaluateAndSchedule();
        }, delay);
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, [isInTimedExam, onNavigate, targetBand]);

  // Recurring timer + tab visibility / focus wakeup + settings update re-arm
  useEffect(() => {
    void evaluateAndSchedule();

    const interval = window.setInterval(() => {
      void evaluateAndSchedule();
    }, 30_000);

    const handleWakeup = () => {
      if (document.visibilityState === 'visible') {
        void evaluateAndSchedule();
      }
    };

    const handleSettingsUpdated = () => {
      void evaluateAndSchedule();
    };

    const handleNavRequest = (e: Event) => {
      const custom = e as CustomEvent<{ path?: string }>;
      if (custom.detail?.path) {
        onNavigate(custom.detail.path);
      }
    };

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'BANDSPRINT_NAVIGATE' && event.data.path) {
        onNavigate(event.data.path);
      }
    };

    document.addEventListener('visibilitychange', handleWakeup);
    window.addEventListener('focus', handleSettingsUpdated);
    window.addEventListener(STREAK_REMINDER_UPDATED_EVENT, handleSettingsUpdated);
    window.addEventListener('bandsprint_cloud_sync_updated', handleSettingsUpdated);
    window.addEventListener('bandsprint_navigate_request', handleNavRequest);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleWakeup);
      window.removeEventListener('focus', handleSettingsUpdated);
      window.removeEventListener(STREAK_REMINDER_UPDATED_EVENT, handleSettingsUpdated);
      window.removeEventListener('bandsprint_cloud_sync_updated', handleSettingsUpdated);
      window.removeEventListener('bandsprint_navigate_request', handleNavRequest);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, [evaluateAndSchedule, onNavigate]);

  const handleStartSprint = () => {
    audioManager.playUiClick('check');
    setActiveReminder(null);
    onNavigate('/learn/daily-sprint');
  };

  const handleSnooze = () => {
    audioManager.playUiClick('soft');
    snoozeDailyReminder(15);
    setActiveReminder(null);
    onShowToast('Daily BandSprint reminder snoozed for 15 minutes.');
  };

  const handleDismiss = () => {
    audioManager.playUiClick('soft');
    setActiveReminder(null);
  };

  return (
    <AnimatePresence>
      {activeReminder && !isInTimedExam && (
        <motion.aside
          role="status"
          aria-live="polite"
          data-testid="daily-reminder-live-banner"
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.97 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-20 md:bottom-6 left-4 right-4 md:right-auto md:w-[400px] z-50 rounded-2xl bg-[#0F4C45] text-white border border-[#1F8A70]/60 shadow-2xl p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#F4A62A]/15 border border-[#F4A62A]/40 text-[#F4A62A] flex items-center justify-center shrink-0 mt-0.5">
                <BellRing className="w-4 h-4" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#F4A62A] font-semibold">
                  <Flame className="w-3.5 h-3.5 shrink-0" />
                  <span>Daily BandSprint Reminder</span>
                </div>
                <h4 className="text-sm font-bold text-white leading-snug">
                  {activeReminder.title}
                </h4>
                <p className="text-xs text-[#EEF3F1]/85 leading-relaxed">
                  {activeReminder.body}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss reminder"
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleStartSprint}
              className="flex-1 min-h-[38px] px-3.5 py-2 rounded-xl bg-[#F4A62A] hover:bg-[#d98f1d] text-[#0E1F1E] text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition"
            >
              <span>Start Daily Sprint</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleSnooze}
              className="min-h-[38px] px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition"
            >
              <Clock className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span>Snooze 15m</span>
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
