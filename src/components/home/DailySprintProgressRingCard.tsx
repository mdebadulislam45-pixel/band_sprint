import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  ArrowUpRight,
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  PartyPopper,
  Sparkles,
  Target
} from 'lucide-react';
import {
  getCompletedMissionsToday,
  getStreakState,
  toggleMissionProgress,
  type StreakState
} from '../../services/streakService';
import {
  DAILY_SPRINT_SYNCED_EVENT,
  loadDailySprintProgress,
  type DailySprintProgressState
} from '../../utils/dailySprintProgressStore';
import {
  formatDaysSummary,
  formatTime12Hour,
  loadStreakReminderSettings,
  STREAK_REMINDER_UPDATED_EVENT,
  type StreakReminderSettings
} from '../../utils/streakReminderService';
import { DailyReminderSettingsPanel } from '../reminders/DailyReminderSettingsPanel';
import { audioManager } from '../../services/AudioManager';

export interface DailySprintTaskItem {
  id: string;
  label: string;
  detail: string;
  minutes: number;
  route: string;
}

export interface DailySprintProgressRingCardProps {
  onNavigate: (path: string) => void;
  onShowToast?: (msg: string) => void;
  weakestSkillLabel?: string | null;
  unresolvedMistakes?: number;
}

const DAILY_SPRINT_TASKS: DailySprintTaskItem[] = [
  {
    id: 'sprint_vocab_idioms',
    label: 'Daily Vocab & Idioms Sprint',
    detail: 'Master today’s Bangla-paired Band 8 words',
    minutes: 10,
    route: '/learn/daily-sprint'
  },
  {
    id: 'sprint_grammar_accuracy',
    label: 'Grammar & Spelling Target',
    detail: 'Lock in complex clauses & high-trap spellings',
    minutes: 10,
    route: '/learn/grammar'
  },
  {
    id: 'sprint_timed_drill',
    label: 'Timed Question Bank Drill',
    detail: 'Complete 1 blind-verified Cambridge-style drill',
    minutes: 10,
    route: '/practice/question-bank'
  },
  {
    id: 'sprint_vault_review',
    label: 'Mistake Vault Rescue',
    detail: 'Clear due errors before they cost half a band',
    minutes: 5,
    route: '/progress/mistakes'
  }
];

const RING_SIZE = 132;
const STROKE_WIDTH = 11;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export const DailySprintProgressRingCard: React.FC<DailySprintProgressRingCardProps> = ({
  onNavigate,
  onShowToast,
  weakestSkillLabel,
  unresolvedMistakes = 0
}) => {
  const [streakState, setStreakState] = useState<StreakState>(() => getStreakState());
  const [sprintState, setSprintState] = useState<DailySprintProgressState>(() =>
    loadDailySprintProgress()
  );
  const [justCelebrated, setJustCelebrated] = useState(false);
  const [reminderSettings, setReminderSettings] = useState<StreakReminderSettings>(() =>
    loadStreakReminderSettings()
  );
  const [isReminderPanelOpen, setIsReminderPanelOpen] = useState(false);

  const ringContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sync = () => {
      setStreakState(getStreakState());
      setSprintState(loadDailySprintProgress());
      setReminderSettings(loadStreakReminderSettings());
    };
    window.addEventListener('bandsprint_streak_updated', sync);
    window.addEventListener('bandsprint_tasks_updated', sync);
    window.addEventListener(DAILY_SPRINT_SYNCED_EVENT, sync);
    window.addEventListener('bandsprint_cloud_sync_updated', sync);
    window.addEventListener(STREAK_REMINDER_UPDATED_EVENT, sync);
    return () => {
      window.removeEventListener('bandsprint_streak_updated', sync);
      window.removeEventListener('bandsprint_tasks_updated', sync);
      window.removeEventListener(DAILY_SPRINT_SYNCED_EVENT, sync);
      window.removeEventListener('bandsprint_cloud_sync_updated', sync);
      window.removeEventListener(STREAK_REMINDER_UPDATED_EVENT, sync);
    };
  }, []);

  const tasks = useMemo(() => {
    return DAILY_SPRINT_TASKS.map((t) => {
      if (t.id === 'sprint_timed_drill' && weakestSkillLabel) {
        return {
          ...t,
          detail: `Target your ${weakestSkillLabel} accuracy with 1 fresh drill`
        };
      }
      if (t.id === 'sprint_vault_review' && unresolvedMistakes > 0) {
        return {
          ...t,
          detail: `${unresolvedMistakes} pending ${unresolvedMistakes === 1 ? 'item' : 'items'} waiting in Mistake Vault`
        };
      }
      return t;
    });
  }, [weakestSkillLabel, unresolvedMistakes]);

  const allTaskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);
  const completedMissionIds = useMemo(
    () => getCompletedMissionsToday(streakState),
    [streakState]
  );

  // Auto-detect organic completion from Daily Sprint Hub activity too
  const effectiveCompletedSet = useMemo(() => {
    const set = new Set<string>(completedMissionIds);
    if (
      sprintState.masteredVocabIds.length >= 3 ||
      sprintState.masteredIdiomIds.length >= 2
    ) {
      set.add('sprint_vocab_idioms');
    }
    if (
      sprintState.masteredGrammarIds.length >= 1 ||
      sprintState.masteredSpellingIds.length >= 3
    ) {
      set.add('sprint_grammar_accuracy');
    }
    if (sprintState.pomodoroBlocksCompleted >= 1 || sprintState.lastExamSummary !== null) {
      set.add('sprint_timed_drill');
    }
    return set;
  }, [completedMissionIds, sprintState]);

  const completedCount = useMemo(
    () => tasks.filter((t) => effectiveCompletedSet.has(t.id)).length,
    [effectiveCompletedSet, tasks]
  );

  const totalCount = tasks.length;
  const completionPct = Math.round((completedCount / totalCount) * 100);
  const isGoalReached = completionPct >= 100;
  const dashOffset = CIRCUMFERENCE * (1 - completionPct / 100);
  const previousCompletionPctRef = useRef<number>(completionPct);

  const triggerRingConfetti = useCallback(() => {
    if (prefersReducedMotion()) return;
    let origin = { x: 0.35, y: 0.45 };
    const el = ringContainerRef.current;
    if (el && typeof window !== 'undefined' && window.innerWidth > 0 && window.innerHeight > 0) {
      const rect = el.getBoundingClientRect();
      origin = {
        x: Math.min(0.9, Math.max(0.1, (rect.left + rect.width / 2) / window.innerWidth)),
        y: Math.min(0.85, Math.max(0.15, (rect.top + rect.height / 2) / window.innerHeight))
      };
    }

    try {
      confetti({
        particleCount: 42,
        spread: 62,
        startVelocity: 24,
        scalar: 0.78,
        ticks: 110,
        origin,
        colors: ['#0F4C45', '#1F8A70', '#F4A62A', '#6EE7B7', '#FDE68A'],
        disableForReducedMotion: true
      });
    } catch {
      // Non-fatal if canvas-confetti cannot mount
    }
  }, []);

  // Fire a tasteful burst the instant completion transitions into 100%
  useEffect(() => {
    if (completionPct >= 100 && previousCompletionPctRef.current < 100) {
      triggerRingConfetti();
      setJustCelebrated(true);
      const timer = window.setTimeout(() => setJustCelebrated(false), 3600);
      previousCompletionPctRef.current = completionPct;
      return () => window.clearTimeout(timer);
    }
    previousCompletionPctRef.current = completionPct;
  }, [completionPct, triggerRingConfetti]);

  const handleToggleTask = (task: DailySprintTaskItem) => {
    const result = toggleMissionProgress(task.id, task.minutes, allTaskIds);
    setStreakState(result.state);
    audioManager.playUiClick(result.isNowCompleted ? 'check' : 'soft');

    if (result.allCompletedNow) {
      onShowToast?.('Daily Sprint goal reached! +20 bonus XP earned.');
    } else if (result.isNowCompleted) {
      onShowToast?.(`Completed "${task.label}" (+${task.minutes}m, +10 XP)`);
    }
  };

  return (
    <section
      data-testid="daily-sprint-progress-ring-card"
      className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 p-5 sm:p-6 space-y-5"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#566664] dark:text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[#0F4C45] dark:text-[#6EE7B7] inline-flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span>Daily Sprint Progress</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">
              {completedCount} of {totalCount} tasks done
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {sprintState.pomodoroFocusMinutesLogged}m focus logged
            </span>
          </div>
          <h2 className="font-display text-base sm:text-lg font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
            {isGoalReached
              ? 'Today’s Daily Sprint Goal Completed'
              : 'Complete Your 4 Daily Band-Builder Tasks'}
          </h2>
        </div>

        {isGoalReached ? (
          <button
            type="button"
            data-testid="daily-sprint-replay-confetti-btn"
            onClick={() => {
              audioManager.playUiClick('check');
              triggerRingConfetti();
            }}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#FEF6E8] dark:bg-[#F4A62A]/15 border border-[#F4A62A]/50 text-[#9B6314] dark:text-[#F4A62A] text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition hover:brightness-95"
          >
            <PartyPopper className="w-3.5 h-3.5" />
            <span>Goal Reached</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              audioManager.playUiClick('soft');
              onNavigate('/learn/daily-sprint');
            }}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] hover:bg-[#D3DDDA] dark:hover:bg-[#17302C] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-[#0F4C45] dark:text-[#6EE7B7] text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition"
          >
            <span>Open Sprint Hub</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#F4A62A]" />
          </button>
        )}
      </div>

      {/* Ring + Checklist Split */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Animated SVG Progress Ring */}
        <div className="md:col-span-4 flex flex-col items-center justify-center py-1">
          <div
            ref={ringContainerRef}
            className="relative flex items-center justify-center"
            style={{ width: RING_SIZE, height: RING_SIZE }}
          >
            <svg
              width={RING_SIZE}
              height={RING_SIZE}
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
              className="-rotate-90"
              role="img"
              aria-label={`Daily Sprint Progress: ${completionPct} percent complete`}
            >
              <defs>
                <linearGradient id="dailySprintRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0F4C45" />
                  <stop offset="65%" stopColor="#1F8A70" />
                  <stop offset="100%" stopColor="#F4A62A" />
                </linearGradient>
              </defs>

              {/* Base Track */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth={STROKE_WIDTH}
                className="text-[#EEF3F1] dark:text-[#0B1514]"
              />

              {/* Animated Progress Arc */}
              <motion.circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="url(#dailySprintRingGradient)"
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                initial={false}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>

            {/* Center Tabular Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span
                data-testid="daily-sprint-ring-percentage"
                className="font-mono text-2xl font-bold text-[#0E1F1E] dark:text-white tabular-nums leading-none"
              >
                {completionPct}%
              </span>
              <span className="mt-1 text-[11px] font-mono text-[#566664] dark:text-slate-400 tabular-nums">
                {completedCount}/{totalCount} tasks
              </span>
            </div>
          </div>

          <p className="mt-2.5 text-center text-[11px] text-[#566664] dark:text-slate-400 max-w-[180px] leading-snug">
            {justCelebrated || isGoalReached ? (
              <span className="font-semibold text-[#0F4C45] dark:text-[#6EE7B7] inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#F4A62A] shrink-0" />
                <span>All daily targets locked in!</span>
              </span>
            ) : (
              `${totalCount - completedCount} ${
                totalCount - completedCount === 1 ? 'task' : 'tasks'
              } left to hit 100% today`
            )}
          </p>
        </div>

        {/* Interactive Daily Task Checklist */}
        <div className="md:col-span-8 space-y-2">
          {tasks.map((task) => {
            const isDone = effectiveCompletedSet.has(task.id);
            return (
              <div
                key={task.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition ${
                  isDone
                    ? 'bg-[#EEF3F1]/75 dark:bg-[#0B1514]/80 border-[#1F8A70]/35'
                    : 'bg-[#F7F9F8] dark:bg-[#0B1514] border-[#D3DDDA] dark:border-[#1F8A70]/20 hover:border-[#0F4C45]/60'
                }`}
              >
                <button
                  type="button"
                  data-testid={`daily-sprint-task-toggle-${task.id}`}
                  onClick={() => handleToggleTask(task)}
                  aria-pressed={isDone}
                  className="flex items-start gap-3 text-left min-w-0 flex-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C45] rounded-lg"
                >
                  <span
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                      isDone
                        ? 'bg-[#0F4C45] border-[#0F4C45] text-white'
                        : 'bg-white dark:bg-[#11201E] border-[#B9C9C5] dark:border-[#1F8A70]/50 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.6]" />
                  </span>

                  <div className="min-w-0">
                    <div
                      className={`text-xs sm:text-sm font-semibold leading-snug ${
                        isDone
                          ? 'line-through text-[#566664] dark:text-slate-400'
                          : 'text-[#0E1F1E] dark:text-[#EEF3F1]'
                      }`}
                    >
                      {task.label}
                    </div>
                    <div className="text-[11px] text-[#566664] dark:text-slate-400 truncate mt-0.5">
                      {task.detail} · <span className="font-mono tabular-nums">{task.minutes}m</span>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audioManager.playUiClick('soft');
                    onNavigate(task.route);
                  }}
                  aria-label={`Open ${task.label}`}
                  title={`Open ${task.label}`}
                  className="min-h-[38px] min-w-[38px] rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45] text-[#0F4C45] dark:text-[#6EE7B7] flex items-center justify-center shrink-0 cursor-pointer transition"
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-[#1F8A70]" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recurring Daily Reminder Quick Strip */}
      <div className="pt-3.5 border-t border-[#D3DDDA]/70 dark:border-[#1F8A70]/25 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-[#566664] dark:text-slate-300 min-w-0">
            {reminderSettings.enabled ? (
              <Bell className="w-3.5 h-3.5 text-[#F4A62A] shrink-0" />
            ) : (
              <BellOff className="w-3.5 h-3.5 text-[#566664] dark:text-slate-400 shrink-0" />
            )}
            <span className="truncate">
              {reminderSettings.enabled ? (
                <>
                  <strong className="text-[#0E1F1E] dark:text-white">Daily Reminder On</strong> ·{' '}
                  <span className="font-mono tabular-nums">
                    {formatTime12Hour(reminderSettings.reminderTime)}
                  </span>{' '}
                  · {formatDaysSummary(reminderSettings.daysOfWeek)}
                </>
              ) : (
                'Set a recurring daily browser reminder to protect your BandSprint streak'
              )}
            </span>
          </div>

          <button
            type="button"
            data-testid="home-daily-reminder-configure-btn"
            onClick={() => {
              audioManager.playUiClick('soft');
              setIsReminderPanelOpen((v) => !v);
            }}
            className="min-h-[34px] px-3 py-1.5 rounded-lg bg-[#EEF3F1] dark:bg-[#0B1514] hover:bg-[#D3DDDA] dark:hover:bg-[#17302C] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-[#0F4C45] dark:text-[#6EE7B7] text-xs font-bold whitespace-nowrap cursor-pointer transition shrink-0"
          >
            {isReminderPanelOpen
              ? 'Done'
              : reminderSettings.enabled
              ? 'Edit Reminder'
              : 'Set Daily Reminder'}
          </button>
        </div>

        {isReminderPanelOpen && (
          <DailyReminderSettingsPanel
            compact
            onShowToast={onShowToast}
            onNavigate={onNavigate}
          />
        )}
      </div>
    </section>
  );
};
