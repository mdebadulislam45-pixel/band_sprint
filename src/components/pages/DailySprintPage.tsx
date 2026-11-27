import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  BellOff,
  Brain,
  CheckCircle2,
  Clock,
  Cloud,
  CloudOff,
  Eye,
  Flame,
  ListChecks,
  Mic,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Volume2
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { DailyMasteryExamQuestion } from '../../data/dailyBanglaSprintData';
import { PomodoroDailySprintHub } from '../daily/PomodoroDailySprintHub';
import { SpeakingShadowingDrill } from '../daily/SpeakingShadowingDrill';
import { DailySprintMissionHub } from '../home/DailySprintMissionHub';
import { audioManager } from '../../services/AudioManager';
import {
  completeReviewQueueItem,
  DailySprintProgressState,
  DAILY_SPRINT_SYNCED_EVENT,
  getTodayDateKey,
  isReviewItemDueToday,
  loadDailySprintProgress,
  syncUnresolvedVaultToDailySprint
} from '../../utils/dailySprintProgressStore';
import {
  computeSmartSprintBrief,
  getRotatedDailySprintPools,
  resolveSmartExamQuestionById
} from '../../utils/smartSprintEngine';
import { speakBanglaCue, speakEnglishTerm } from '../../utils/banglaSpeech';
import { getMistakes, recordSM2Review } from '../../utils/vaultStorage';
import {
  isDailyReminderDueNow,
  loadStreakReminderSettings,
  requestStreakNotificationPermission,
  saveStreakReminderSettings,
  StreakReminderSettings,
  triggerStreakReminderNotification
} from '../../utils/streakReminderService';
import { SPRING_SNAPPY, EASE_EDITORIAL } from '../common/MotionPrimitives';
import { UserProfile } from '../../types';

interface DailySprintPageProps {
  user?: UserProfile | null;
  onNavigate: (path: string) => void;
  onShowToast: (msg: string) => void;
}

type StudioWorkspaceTab = 'focus' | 'review' | 'missions' | 'speaking';

export const DailySprintPage: React.FC<DailySprintPageProps> = ({
  user,
  onNavigate,
  onShowToast
}) => {
  const [sprintState, setSprintState] = useState<DailySprintProgressState>(() =>
    loadDailySprintProgress()
  );
  const [cycleOffset, setCycleOffset] = useState<number>(0);
  const [activeStudioTab, setActiveStudioTab] = useState<StudioWorkspaceTab>('focus');
  const [revealedQueueIds, setRevealedQueueIds] = useState<Record<string, boolean>>({});
  const [showAllQueued, setShowAllQueued] = useState<boolean>(false);
  const [activeSpeakingIdx, setActiveSpeakingIdx] = useState<number>(0);
  const [reminderSettings, setReminderSettings] = useState<StreakReminderSettings>(() =>
    loadStreakReminderSettings()
  );
  const [showDueReminderBanner, setShowDueReminderBanner] = useState<boolean>(false);

  useEffect(() => {
    // Hydrate any unresolved Mistake Vault entries into the Smart Review Queue on load
    const synced = syncUnresolvedVaultToDailySprint(getMistakes());
    setSprintState(synced);

    const syncState = () => setSprintState(loadDailySprintProgress());
    window.addEventListener(DAILY_SPRINT_SYNCED_EVENT, syncState);
    window.addEventListener('vault_updated', syncState);
    window.addEventListener('bandsprint_cloud_sync_updated', syncState);
    window.addEventListener('bandsprint_mastery_exam_completed', syncState);
    return () => {
      window.removeEventListener(DAILY_SPRINT_SYNCED_EVENT, syncState);
      window.removeEventListener('vault_updated', syncState);
      window.removeEventListener('bandsprint_cloud_sync_updated', syncState);
      window.removeEventListener('bandsprint_mastery_exam_completed', syncState);
    };
  }, []);

  useEffect(() => {
    if (isDailyReminderDueNow(reminderSettings, sprintState.pomodoroFocusMinutesLogged)) {
      const todayKey = getTodayDateKey();
      const updated = saveStreakReminderSettings({
        ...reminderSettings,
        lastTriggeredDate: todayKey
      });
      setReminderSettings(updated);
      setShowDueReminderBanner(true);
      triggerStreakReminderNotification(
        sprintState.reviewQueueIds.filter((id) => isReviewItemDueToday(sprintState.reviewSchedule[id])).length
      );
    }
  }, [reminderSettings, sprintState.pomodoroFocusMinutesLogged, sprintState.reviewQueueIds, sprintState.reviewSchedule]);

  const isCloudSignedIn = Boolean(user && user.id && user.id !== 'default_candidate');

  const smartBrief = useMemo(
    () => computeSmartSprintBrief(user, sprintState),
    [sprintState, user]
  );

  const pools = useMemo(
    () => getRotatedDailySprintPools(sprintState.quotaTier, getTodayDateKey(), cycleOffset),
    [cycleOffset, sprintState.quotaTier]
  );

  const quotaCounts = useMemo(() => {
    const done =
      pools.vocabulary.filter((v) => sprintState.masteredVocabIds.includes(v.id)).length +
      pools.idioms.filter((i) => sprintState.masteredIdiomIds.includes(i.id)).length +
      pools.phrases.filter((p) => sprintState.masteredPhraseIds.includes(p.id)).length +
      pools.spelling.filter((s) => sprintState.masteredSpellingIds.includes(s.id)).length +
      pools.grammar.filter((g) => sprintState.masteredGrammarIds.includes(g.id)).length;

    const total =
      pools.vocabulary.length +
      pools.idioms.length +
      pools.phrases.length +
      pools.spelling.length +
      pools.grammar.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { done, total, pct };
  }, [pools, sprintState]);

  const queuedQuestions = useMemo(() => {
    return sprintState.reviewQueueIds
      .map((id) => ({
        question: resolveSmartExamQuestionById(id),
        schedule: sprintState.reviewSchedule[id]
      }))
      .filter(
        (
          entry
        ): entry is {
          question: DailyMasteryExamQuestion;
          schedule: DailySprintProgressState['reviewSchedule'][string] | undefined;
        } => Boolean(entry.question)
      );
  }, [sprintState.reviewQueueIds, sprintState.reviewSchedule]);

  const dueQueueItems = useMemo(
    () => queuedQuestions.filter((item) => isReviewItemDueToday(item.schedule)),
    [queuedQuestions]
  );

  const visibleQueueItems = showAllQueued ? queuedQuestions : dueQueueItems;
  const activeSpeakingCard =
    pools.speakingCards[activeSpeakingIdx % Math.max(1, pools.speakingCards.length)] ||
    pools.speakingCards[0];

  const handleReviewAction = (
    q: DailyMasteryExamQuestion,
    recalled: boolean,
    graduateNow = false
  ) => {
    audioManager.playUiClick(recalled ? 'check' : 'soft');
    const next = completeReviewQueueItem(q.id, recalled, graduateNow);
    if (q.id.startsWith('vault_')) {
      recordSM2Review(q.id.slice(6), recalled ? (graduateNow ? 5 : 4) : 1);
    }
    setSprintState(next);
    setRevealedQueueIds((prev) => {
      const copy = { ...prev };
      delete copy[q.id];
      return copy;
    });
    if (recalled && (graduateNow || !next.reviewQueueIds.includes(q.id))) {
      onShowToast(`"${q.targetTerm}" mastered and graduated from your review queue!`);
    } else if (recalled) {
      onShowToast(`"${q.targetTerm}" scheduled for spaced review in 2 days.`);
    } else {
      onShowToast(`"${q.targetTerm}" kept in today's due warm-up queue.`);
    }
  };

  const handleToggleStreakReminder = async () => {
    audioManager.playUiClick('toggle');
    const nextEnabled = !reminderSettings.enabled;
    if (nextEnabled) {
      const perm = await requestStreakNotificationPermission();
      const saved = saveStreakReminderSettings({ ...reminderSettings, enabled: true });
      setReminderSettings(saved);
      onShowToast(
        perm === 'granted'
          ? `Daily streak reminder active for ${saved.reminderTime}.`
          : `In-app streak reminder saved for ${saved.reminderTime} (browser alerts muted or unsupported).`
      );
    } else {
      const saved = saveStreakReminderSettings({ ...reminderSettings, enabled: false });
      setReminderSettings(saved);
      setShowDueReminderBanner(false);
      onShowToast('Daily streak reminder paused.');
    }
  };

  const handleReminderTimeChange = (nextTime: string) => {
    const saved = saveStreakReminderSettings({ ...reminderSettings, reminderTime: nextTime });
    setReminderSettings(saved);
  };

  const studioTabs: Array<{
    id: StudioWorkspaceTab;
    label: string;
    meta?: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    {
      id: 'focus',
      label: 'Focus & 5 Targets',
      meta: `${quotaCounts.pct}%`,
      icon: Flame
    },
    {
      id: 'review',
      label: 'Smart Review Queue',
      meta: dueQueueItems.length > 0 ? `${dueQueueItems.length} due` : 'Clear',
      icon: RefreshCw
    },
    {
      id: 'missions',
      label: 'Daily Missions',
      meta: smartBrief.weakestLabel,
      icon: ListChecks
    },
    {
      id: 'speaking',
      label: 'Speaking & Bangla Coach',
      icon: Mic
    }
  ];

  return (
    <div
      data-testid="daily-sprint-dedicated-page"
      className="w-full max-w-6xl mx-auto space-y-6 pb-24 md:pb-16 animate-fade-in"
    >
      {/* =====================================================================
          1. SMART DAILY SPRINT STUDIO HEADER
      ===================================================================== */}
      <section className="rounded-2xl bg-[#0F4C45] text-white border border-[#1F8A70]/40 p-5 sm:p-7 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#EEF3F1]/85">
              <button
                type="button"
                onClick={() => {
                  audioManager.playUiClick('soft');
                  onNavigate('/');
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-[#EEF3F1] transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>

              <span className="font-mono uppercase tracking-wider text-[#F4A62A] font-semibold">
                Smart Daily Sprint Studio
              </span>

              <span aria-hidden="true" className="text-white/30">·</span>

              <span
                data-testid="daily-sprint-cloud-status"
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#EEF3F1]/85"
              >
                {isCloudSignedIn ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Cloud Sync Active</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="w-3.5 h-3.5 text-[#F4A62A]" />
                    <span>Saved Locally</span>
                  </>
                )}
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Pomodoro &amp; Adaptive IELTS Sprint
            </h1>
            <p
              data-testid="smart-sprint-coach-headline"
              className="text-xs sm:text-sm text-[#EEF3F1]/90 leading-relaxed"
            >
              {smartBrief.coachHeadline}
            </p>
          </div>

          {/* Clean Tabular KPI Readout */}
          <div className="grid grid-cols-3 gap-2.5 shrink-0">
            <div className="px-3.5 py-3 rounded-xl bg-[#0B3833] border border-white/10">
              <div className="text-[11px] text-[#EEF3F1]/75 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#F4A62A]" />
                <span>Focus Today</span>
              </div>
              <div className="text-lg font-mono font-bold text-white tabular-nums mt-0.5">
                {sprintState.pomodoroFocusMinutesLogged}m
              </div>
              <div className="text-[10px] text-[#EEF3F1]/65 font-mono">
                {sprintState.pomodoroBlocksCompleted} blocks
              </div>
            </div>

            <div className="px-3.5 py-3 rounded-xl bg-[#0B3833] border border-white/10">
              <div className="text-[11px] text-[#EEF3F1]/75 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-[#F4A62A]" />
                <span>5 Targets</span>
              </div>
              <div className="text-lg font-mono font-bold text-[#F4A62A] tabular-nums mt-0.5">
                {quotaCounts.pct}%
              </div>
              <div className="text-[10px] text-[#EEF3F1]/65 font-mono tabular-nums">
                {quotaCounts.done}/{quotaCounts.total} done
              </div>
            </div>

            <div className="px-3.5 py-3 rounded-xl bg-[#0B3833] border border-white/10">
              <div className="text-[11px] text-[#EEF3F1]/75 flex items-center gap-1">
                <Brain className="w-3.5 h-3.5 text-[#F4A62A]" />
                <span>SR Queue</span>
              </div>
              <div className="text-lg font-mono font-bold text-white tabular-nums mt-0.5">
                {dueQueueItems.length}
              </div>
              <div className="text-[10px] text-[#EEF3F1]/65 font-mono tabular-nums">
                {queuedQuestions.length} queued
              </div>
            </div>
          </div>
        </div>

        {/* Clean Single-Row Daily Streak Reminder Control */}
        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-[#EEF3F1]/85">
            {reminderSettings.enabled ? (
              <Bell className="w-3.5 h-3.5 text-[#F4A62A] shrink-0" />
            ) : (
              <BellOff className="w-3.5 h-3.5 text-white/60 shrink-0" />
            )}
            <span className="font-semibold">Daily Streak Reminder</span>
            <span aria-hidden="true" className="text-white/30">·</span>
            <span className="text-[#EEF3F1]/70">
              {reminderSettings.enabled
                ? `Scheduled daily at ${reminderSettings.reminderTime}`
                : 'Protect your IELTS streak with an opt-in daily nudge'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              type="time"
              value={reminderSettings.reminderTime}
              onChange={(e) => handleReminderTimeChange(e.target.value)}
              aria-label="Daily reminder time"
              className="px-2.5 py-1.5 rounded-lg bg-[#0B3833] border border-white/15 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-[#F4A62A]"
            />
            <button
              type="button"
              data-testid="daily-streak-reminder-toggle"
              onClick={handleToggleStreakReminder}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                reminderSettings.enabled
                  ? 'bg-[#F4A62A] text-[#0E1F1E] hover:bg-[#d98f1d]'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              {reminderSettings.enabled ? 'Reminder On' : 'Enable Reminder'}
            </button>
          </div>
        </div>
      </section>

      {showDueReminderBanner && (
        <div
          role="status"
          className="rounded-2xl bg-[#FEF6E8] dark:bg-amber-950/30 border border-[#F4A62A]/50 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#66410B] dark:text-amber-200"
        >
          <span>
            <strong>Streak Nudge:</strong> Knock out one 15m Pomodoro focus block or clear your {dueQueueItems.length} due recall items today!
          </span>
          <button
            type="button"
            onClick={() => setShowDueReminderBanner(false)}
            className="px-2.5 py-1 rounded-lg bg-white/70 dark:bg-black/30 text-xs font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =====================================================================
          2. CLEAN 4-TAB WORKSPACE SWITCHER (ZERO WALL-OF-CARDS CLUTTER)
      ===================================================================== */}
      <div
        role="tablist"
        aria-label="Daily Sprint Studio Sections"
        className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30"
      >
        {studioTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeStudioTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-testid={`studio-tab-${tab.id}`}
              onClick={() => {
                audioManager.playUiClick('tab');
                setActiveStudioTab(tab.id);
              }}
              className={`relative flex-1 min-w-[140px] min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                isActive
                  ? 'text-white'
                  : 'text-[#566664] dark:text-slate-300 hover:text-[#0E1F1E] dark:hover:text-white'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="daily-sprint-studio-tab"
                  transition={SPRING_SNAPPY}
                  className="absolute inset-0 rounded-xl bg-[#0F4C45]"
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.meta && (
                  <span
                    className={`font-mono text-[10px] tabular-nums ${
                      isActive ? 'text-[#FDE68A]' : 'text-[#566664] dark:text-slate-400'
                    }`}
                  >
                    ({tab.meta})
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          3. ACTIVE TAB WORKSPACE CONTENT
      ===================================================================== */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStudioTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: EASE_EDITORIAL }}
        >
          {activeStudioTab === 'focus' && (
            <PomodoroDailySprintHub
              user={user}
              pools={pools}
              smartBrief={smartBrief}
              cycleOffset={cycleOffset}
              onCycleOffsetChange={setCycleOffset}
              onNavigate={onNavigate}
              onShowToast={onShowToast}
            />
          )}

          {activeStudioTab === 'review' && (
            <section
              data-testid="spaced-repetition-warmup-queue"
              className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 p-5 sm:p-6 space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EEF3F1] dark:border-[#1F8A70]/25">
                <div className="space-y-1">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#9B6314] dark:text-[#F4A62A] font-semibold">
                    Spaced-Repetition Active Recall · {dueQueueItems.length} due today
                  </div>
                  <h2 className="font-display text-lg font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                    Missed-Item Smart Review Queue (মিস হওয়া প্রশ্নগুলোর রিভিশন)
                  </h2>
                  <p className="text-xs text-[#566664] dark:text-slate-400">
                    Questions missed in your Mastery Exam stay queued until you recall them twice across sessions.
                  </p>
                </div>

                {queuedQuestions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      audioManager.playUiClick('toggle');
                      setShowAllQueued((v) => !v);
                    }}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] hover:bg-[#D3DDDA] text-[#0F4C45] dark:text-[#6EE7B7] text-xs font-semibold cursor-pointer shrink-0"
                  >
                    {showAllQueued
                      ? `Show Due Only (${dueQueueItems.length})`
                      : `Show All Queued (${queuedQuestions.length})`}
                  </button>
                )}
              </div>

              {visibleQueueItems.length === 0 ? (
                <div className="p-5 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                      {queuedQuestions.length === 0
                        ? 'Zero missed items in your queue right now.'
                        : 'All caught up for today!'}
                    </div>
                    <p className="text-xs text-[#566664] dark:text-slate-400">
                      Run a Daily Mastery Exam inside Focus &amp; 5 Targets — any tricky misses surface here automatically.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      audioManager.playUiClick('tab');
                      setActiveStudioTab('focus');
                    }}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0F4C45] text-white text-xs font-bold shrink-0 cursor-pointer"
                  >
                    Go to Focus &amp; Targets
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visibleQueueItems.map(({ question: q, schedule }) => {
                    const isRevealed = Boolean(revealedQueueIds[q.id]);
                    const isDue = isReviewItemDueToday(schedule);
                    return (
                      <div
                        key={q.id}
                        data-testid={`sr-queue-card-${q.id}`}
                        className="p-4 sm:p-5 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/35 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="text-[11px] font-mono text-[#566664] dark:text-slate-400">
                              <span className="font-semibold text-[#0F4C45] dark:text-[#6EE7B7]">
                                {q.sectionLabel}
                              </span>
                              {' · '}
                              <span className={isDue ? 'text-[#9B6314] dark:text-[#F4A62A] font-semibold' : ''}>
                                {isDue ? 'Due Today' : `Next: ${schedule?.nextReviewDate}`}
                              </span>
                              {schedule ? ` · Rep ${schedule.repetition}/2` : ''}
                            </div>
                            <h3 className="font-display text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                              {q.targetTerm}
                            </h3>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              audioManager.playUiClick('soft');
                              speakEnglishTerm(q.targetTerm);
                            }}
                            title="Hear British pronunciation"
                            className="p-2 rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-[#0F4C45] dark:text-[#6EE7B7] cursor-pointer"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-xs text-[#384543] dark:text-slate-300 leading-relaxed">
                          {q.prompt}
                        </p>

                        {isRevealed && (
                          <div className="p-3.5 rounded-xl bg-white dark:bg-[#11201E] border border-[#1F8A70]/30 space-y-1.5 text-xs">
                            <div className="font-bold text-emerald-700 dark:text-emerald-300">
                              ✓ Answer: {q.options[q.correctIndex]}
                            </div>
                            <div className="font-semibold text-[#0F4C45] dark:text-[#6EE7B7]">
                              বাংলা অর্থ: {q.banglaMeaning}
                            </div>
                            <div className="text-[#384543] dark:text-slate-300">
                              {q.explanationBangla}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                audioManager.playUiClick('soft');
                                speakBanglaCue(q.explanationBangla, q.explanationEnglish);
                              }}
                              className="mt-1 px-2.5 py-1 rounded-lg bg-[#EEF3F1] dark:bg-[#0B1514] text-[#0F4C45] dark:text-[#6EE7B7] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Volume2 className="w-3 h-3" />
                              <span>বাংলা ব্যাখ্যা শুনুন</span>
                            </button>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              audioManager.playUiClick('soft');
                              setRevealedQueueIds((prev) => ({ ...prev, [q.id]: !prev[q.id] }));
                            }}
                            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-xs font-semibold text-[#0E1F1E] dark:text-[#EEF3F1] inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#F4A62A]" />
                            <span>{isRevealed ? 'Hide Answer' : 'Reveal Answer & Bangla'}</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleReviewAction(q, false)}
                              className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Still Tricky</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewAction(q, true)}
                              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Got It</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeStudioTab === 'missions' && (
            <DailySprintMissionHub
              weakestSkill={smartBrief.weakestSkill}
              onNavigate={onNavigate}
              onShowToast={onShowToast}
            />
          )}

          {activeStudioTab === 'speaking' && activeSpeakingCard && (
            <section
              data-testid="speaking-bangla-confidence-hub"
              className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 p-5 sm:p-6 space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EEF3F1] dark:border-[#1F8A70]/25">
                <div className="space-y-1">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#0F4C45] dark:text-[#6EE7B7] font-semibold">
                    British Model (EN-GB) · বাংলা কনফিডেন্স কোচিং (BN-BD)
                  </div>
                  <h2 className="font-display text-lg font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                    Speaking Part 2 &amp; 3 Cue Card Coach
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    audioManager.playUiClick('soft');
                    onNavigate('/practice/speaking');
                  }}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] hover:bg-[#D3DDDA] text-[#0F4C45] dark:text-[#6EE7B7] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F4A62A]" />
                  <span>Open AI Speaking Lab</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {pools.speakingCards.map((card, idx) => {
                  const isActive = idx === activeSpeakingIdx % pools.speakingCards.length;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => {
                        audioManager.playUiClick('tab');
                        setActiveSpeakingIdx(idx);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                        isActive
                          ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                          : 'bg-[#F7F9F8] dark:bg-[#0B1514] text-[#0E1F1E] dark:text-[#EEF3F1] border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45]'
                      }`}
                    >
                      {card.partLabel}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-6 p-4 sm:p-5 rounded-2xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-3">
                  <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
                    {activeSpeakingCard.partLabel}
                  </div>
                  <h3 className="font-display text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                    {activeSpeakingCard.topicTitle}
                  </h3>
                  <p className="text-xs text-[#384543] dark:text-slate-300 leading-relaxed">
                    {activeSpeakingCard.cuePrompt}
                  </p>
                  <ul className="space-y-1 text-xs text-[#566664] dark:text-slate-400 list-disc pl-4">
                    {activeSpeakingCard.bulletPoints.map((bp, i) => (
                      <li key={i}>{bp}</li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t border-[#D3DDDA]/60 dark:border-[#1F8A70]/25 text-xs text-[#0F4C45] dark:text-[#6EE7B7]">
                    <strong className="text-[#0E1F1E] dark:text-white">Target C1 Phrases:</strong>{' '}
                    {activeSpeakingCard.targetPhrases.join(' · ')}
                  </div>
                </div>

                <div className="lg:col-span-6 p-4 sm:p-5 rounded-2xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#1F8A70]/30 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
                        Band 8.5 Sample Opener (EN-GB)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          audioManager.playUiClick('soft');
                          speakEnglishTerm(activeSpeakingCard.band8OpenerEnglish, 0.92);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#0F4C45] hover:bg-[#0B3833] text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#F4A62A]" />
                        <span>Hear British Model</span>
                      </button>
                    </div>
                    <p className="p-3 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/25 text-xs italic text-[#0E1F1E] dark:text-[#EEF3F1] leading-relaxed">
                      “{activeSpeakingCard.band8OpenerEnglish}”
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#92400E] dark:text-[#FDE68A]">
                        বাংলা কনফিডেন্স ও উচ্চারণ টিপস
                      </span>
                      <button
                        type="button"
                        data-testid="speaking-bangla-audio-btn"
                        onClick={() => {
                          audioManager.playUiClick('soft');
                          speakBanglaCue(
                            `${activeSpeakingCard.banglaConfidenceTip} ${activeSpeakingCard.banglaPronunciationFocus}`,
                            activeSpeakingCard.englishTipFallback
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#F4A62A] hover:bg-[#d98f1d] text-[#0E1F1E] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>বাংলা অডিও টিপ শুনুন</span>
                      </button>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-[#11201E] border border-[#F4A62A]/40 text-xs space-y-1.5">
                      <p className="font-semibold text-[#0E1F1E] dark:text-[#EEF3F1] leading-relaxed">
                        {activeSpeakingCard.banglaConfidenceTip}
                      </p>
                      <p className="text-[#0F4C45] dark:text-[#6EE7B7] leading-relaxed">
                        {activeSpeakingCard.banglaPronunciationFocus}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <SpeakingShadowingDrill
                card={activeSpeakingCard}
                onShowToast={onShowToast}
              />
            </section>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
