import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Award,
  BookMarked,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Crown,
  Flame,
  Gem,
  Headphones,
  Lock,
  Mic,
  PenTool,
  Pin,
  Radio,
  ShieldCheck,
  Sparkles,
  Sunrise,
  Target,
  Trophy,
  Zap,
  LucideIcon
} from 'lucide-react';
import { UserProfile } from '../../types';
import {
  ACHIEVEMENTS_SAVED_EVENT,
  AchievementBadge,
  TIER_CONFIGS,
  evaluateAchievements,
  fireAchievementConfetti,
  getGamificationStats,
  loadAchievementsState,
  togglePinnedBadge
} from '../../services/achievementService';
import { soundManager } from '../../utils/audioEffects';
import {
  DAILY_SPRINT_SAVED_EVENT,
  DAILY_SPRINT_SYNCED_EVENT
} from '../../utils/dailySprintProgressStore';

const ICON_MAP: Record<string, LucideIcon> = {
  Archive,
  Award,
  BookMarked,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Crown,
  Flame,
  Gem,
  Headphones,
  Mic,
  PenTool,
  Radio,
  ShieldCheck,
  Sparkles,
  Sunrise,
  Target,
  Trophy,
  Zap
};

type CategoryFilter = 'all' | 'streak' | 'mastery' | 'skills';
type StatusFilter = 'all' | 'unlocked' | 'in_progress';

interface BandSprintAchievementsPanelProps {
  user?: UserProfile | null;
  mistakeCount?: number;
  onShowToast?: (msg: string) => void;
  onNavigate?: (path: string) => void;
}

function formatShortDate(ts?: number): string {
  if (!ts || !Number.isFinite(ts)) return '';
  try {
    return new Date(ts).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '';
  }
}

export const PinnedBadgesStrip: React.FC<{
  user?: UserProfile | null;
  mistakeCount?: number;
}> = ({ user, mistakeCount = 0 }) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener(ACHIEVEMENTS_SAVED_EVENT, refresh);
    window.addEventListener('bandsprint_streak_updated', refresh);
    window.addEventListener(DAILY_SPRINT_SAVED_EVENT, refresh);
    window.addEventListener(DAILY_SPRINT_SYNCED_EVENT, refresh);
    window.addEventListener('bandsprint_cloud_sync_updated', refresh);
    return () => {
      window.removeEventListener(ACHIEVEMENTS_SAVED_EVENT, refresh);
      window.removeEventListener('bandsprint_streak_updated', refresh);
      window.removeEventListener(DAILY_SPRINT_SAVED_EVENT, refresh);
      window.removeEventListener(DAILY_SPRINT_SYNCED_EVENT, refresh);
      window.removeEventListener('bandsprint_cloud_sync_updated', refresh);
    };
  }, []);

  const { displayed, unlockedCount, totalCount } = useMemo(() => {
    const badges = evaluateAchievements(user, mistakeCount);
    const persisted = loadAchievementsState();
    const unlocked = badges.filter((b) => b.isUnlocked);
    const pinned = persisted.pinnedBadgeIds
      .map((id) => unlocked.find((b) => b.id === id))
      .filter((b): b is AchievementBadge => Boolean(b));
    const fallback = unlocked.slice(0, 3);
    return {
      displayed: pinned.length > 0 ? pinned : fallback,
      unlockedCount: unlocked.length,
      totalCount: badges.length
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, mistakeCount, tick]);

  if (displayed.length === 0) {
    return (
      <div className="pt-2 text-xs text-[#EEF3F1]/75 flex items-center gap-2">
        <Trophy className="w-3.5 h-3.5 text-[#F4A62A] shrink-0" />
        <span className="tabular-nums">
          0 of {totalCount} BandSprint badges unlocked yet — complete a daily target or study before 9:00 AM to earn your first emblem.
        </span>
      </div>
    );
  }

  return (
    <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#EEF3F1]/90">
      <span className="font-mono text-[11px] text-[#F4A62A] font-semibold tabular-nums">
        {unlockedCount}/{totalCount} Badges
      </span>
      {displayed.map((badge) => {
        const Icon = ICON_MAP[badge.iconName] || Award;
        return (
          <span
            key={badge.id}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white/95"
          >
            <Icon className="w-3.5 h-3.5 text-[#F4A62A] shrink-0" />
            <span>{badge.title}</span>
          </span>
        );
      })}
    </div>
  );
};

export const BandSprintAchievementsPanel: React.FC<BandSprintAchievementsPanelProps> = ({
  user,
  mistakeCount = 0,
  onShowToast,
  onNavigate
}) => {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshTick, setRefreshTick] = useState(0);
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => loadAchievementsState().pinnedBadgeIds);

  useEffect(() => {
    const sync = () => {
      setPinnedIds(loadAchievementsState().pinnedBadgeIds);
      setRefreshTick((t) => t + 1);
    };
    window.addEventListener(ACHIEVEMENTS_SAVED_EVENT, sync);
    window.addEventListener('bandsprint_streak_updated', sync);
    window.addEventListener(DAILY_SPRINT_SAVED_EVENT, sync);
    window.addEventListener(DAILY_SPRINT_SYNCED_EVENT, sync);
    window.addEventListener('bandsprint_cloud_sync_updated', sync);
    return () => {
      window.removeEventListener(ACHIEVEMENTS_SAVED_EVENT, sync);
      window.removeEventListener('bandsprint_streak_updated', sync);
      window.removeEventListener(DAILY_SPRINT_SAVED_EVENT, sync);
      window.removeEventListener(DAILY_SPRINT_SYNCED_EVENT, sync);
      window.removeEventListener('bandsprint_cloud_sync_updated', sync);
    };
  }, []);

  const { badges, stats } = useMemo(() => {
    const evaluated = evaluateAchievements(user, mistakeCount);
    const gamification = getGamificationStats(evaluated, user);
    return { badges: evaluated, stats: gamification };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, mistakeCount, refreshTick]);

  const filteredBadges = useMemo(() => {
    return badges
      .filter((badge) => {
        if (categoryFilter === 'streak') return badge.category === 'streak';
        if (categoryFilter === 'mastery') return badge.category === 'mastery';
        if (categoryFilter === 'skills') {
          return (
            badge.category === 'vocabulary' ||
            badge.category === 'listening' ||
            badge.category === 'reading' ||
            badge.category === 'writing' ||
            badge.category === 'speaking'
          );
        }
        return true;
      })
      .filter((badge) => {
        if (statusFilter === 'unlocked') return badge.isUnlocked;
        if (statusFilter === 'in_progress') return !badge.isUnlocked;
        return true;
      })
      .sort((a, b) => {
        if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? -1 : 1;
        return b.progressPercent - a.progressPercent;
      });
  }, [badges, categoryFilter, statusFilter]);

  const nextClosestBadge = useMemo(() => {
    const locked = badges.filter((b) => !b.isUnlocked);
    if (locked.length === 0) return null;
    return [...locked].sort((a, b) => b.progressPercent - a.progressPercent)[0];
  }, [badges]);

  const handleTogglePin = (badge: AchievementBadge) => {
    if (!badge.isUnlocked) return;
    soundManager.playBeep(620, 0.035);
    const updated = togglePinnedBadge(badge.id);
    setPinnedIds(updated);
    const isNowPinned = updated.includes(badge.id);
    onShowToast?.(
      isNowPinned
        ? `Pinned "${badge.title}" to your Candidate Profile header.`
        : `Unpinned "${badge.title}" from your profile header.`
    );
  };

  const handleCelebrate = (badge: AchievementBadge) => {
    if (!badge.isUnlocked) return;
    fireAchievementConfetti();
    onShowToast?.(`${badge.title} · +${badge.xpReward} XP earned!`);
  };

  const categoryButtons: Array<{ id: CategoryFilter; label: string }> = [
    { id: 'all', label: 'All Badges' },
    { id: 'streak', label: 'Streak & Daily' },
    { id: 'mastery', label: 'Grammar & Mastery' },
    { id: 'skills', label: 'Skills & Vocab' }
  ];

  return (
    <section
      data-testid="bandsprint-achievements-panel"
      className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 p-5 sm:p-6 space-y-6"
    >
      {/* Editorial Section Header & Level Progress */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#EEF3F1] dark:border-[#1F8A70]/25">
        <div className="space-y-1.5">
          <div className="text-[11px] font-mono font-semibold text-[#0F4C45] dark:text-[#F4A62A] tracking-wide">
            BandSprint Achievements · Level {stats.level} · {stats.levelTitle}
          </div>
          <h2 className="font-display text-xl font-bold text-[#0E1F1E] dark:text-white tracking-tight">
            Unlockable Digital Badges
          </h2>
          <p className="text-xs sm:text-sm text-[#566664] dark:text-slate-400 max-w-2xl leading-relaxed">
            Earned strictly from real streak consistency, daily target completions, grammar drills, and validated IELTS sittings. Pin up to three earned emblems to your profile banner.
          </p>
        </div>

        {/* Tabular XP & Unlock Summary */}
        <div className="flex flex-wrap items-center gap-6 shrink-0">
          <div>
            <div className="text-[11px] text-[#566664] dark:text-slate-400">Unlocked</div>
            <div className="font-mono text-lg font-bold text-[#0E1F1E] dark:text-white tabular-nums">
              {stats.unlockedCount}
              <span className="text-xs font-normal text-[#566664] dark:text-slate-400">
                /{stats.totalCount}
              </span>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#566664] dark:text-slate-400">Total XP</div>
            <div className="font-mono text-lg font-bold text-[#0F4C45] dark:text-[#F4A62A] tabular-nums">
              {stats.totalXp.toLocaleString()}
            </div>
          </div>
          <div className="w-40 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[#566664] dark:text-slate-400 tabular-nums">
              <span>Level {stats.level}</span>
              <span>{stats.levelProgressPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#EEF3F1] dark:bg-[#0B1514] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#0F4C45] dark:bg-[#F4A62A] transition-all duration-300"
                style={{ width: `${stats.levelProgressPercent}%` }}
              />
            </div>
            <div className="text-[11px] text-[#566664] dark:text-slate-400 tabular-nums">
              {stats.xpForNextLevel > 0
                ? `${stats.xpForNextLevel.toLocaleString()} XP to Level ${stats.level + 1}`
                : 'Top tier reached'}
            </div>
          </div>
        </div>
      </div>

      {/* Next Closest Milestone Callout */}
      {nextClosestBadge && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-4 rounded-xl bg-[#EEF3F1]/75 dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/25">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-[#0E1F1E] dark:text-white">
              Next Milestone: {nextClosestBadge.title}{' '}
              <span className="font-mono text-[#0F4C45] dark:text-[#F4A62A] tabular-nums">
                ({nextClosestBadge.progressPercent}%)
              </span>
            </div>
            <p className="text-xs text-[#566664] dark:text-slate-400">
              {nextClosestBadge.howToEarn}
            </p>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(560, 0.035);
                onNavigate('/learn/daily-sprint');
              }}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
            >
              Open Daily Sprint
            </button>
          )}
        </div>
      )}

      {/* Segmented Category & Status Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/25"
          role="tablist"
          aria-label="Achievement categories"
        >
          {categoryButtons.map((btn) => {
            const active = categoryFilter === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  soundManager.playBeep(520, 0.03);
                  setCategoryFilter(btn.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#0F4C45] text-white'
                    : 'text-[#566664] dark:text-slate-300 hover:text-[#0E1F1E] dark:hover:text-white'
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/25 self-start sm:self-auto">
          {(
            [
              { id: 'all' as StatusFilter, label: 'All' },
              { id: 'unlocked' as StatusFilter, label: 'Unlocked' },
              { id: 'in_progress' as StatusFilter, label: 'Locked' }
            ] as const
          ).map((item) => {
            const active = statusFilter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  soundManager.playBeep(500, 0.025);
                  setStatusFilter(item.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-white dark:bg-[#11201E] text-[#0E1F1E] dark:text-white shadow-xs'
                    : 'text-[#566664] dark:text-slate-400 hover:text-[#0E1F1E] dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Badge Grid */}
      {filteredBadges.length === 0 ? (
        <div className="py-10 text-center space-y-2 border border-dashed border-[#D3DDDA] dark:border-[#1F8A70]/30 rounded-xl">
          <p className="text-sm font-semibold text-[#0E1F1E] dark:text-white">
            No badges in this filter yet
          </p>
          <p className="text-xs text-[#566664] dark:text-slate-400">
            Switch filters or complete a Daily Sprint target to unlock new emblems.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBadges.map((badge) => {
            const Icon = ICON_MAP[badge.iconName] || Award;
            const tierCfg = TIER_CONFIGS[badge.tier];
            const isPinned = pinnedIds.includes(badge.id);

            return (
              <article
                key={badge.id}
                data-testid={`achievement-card-${badge.id}`}
                className={`rounded-xl p-4 border transition flex flex-col justify-between gap-4 ${
                  badge.isUnlocked
                    ? `bg-gradient-to-br ${tierCfg.glow} bg-white dark:bg-[#0D1A18] ${tierCfg.border}`
                    : 'bg-[#FAFBFB] dark:bg-[#0B1514]/80 border-[#E2EAE8] dark:border-[#1F8A70]/20'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                        badge.isUnlocked
                          ? `${tierCfg.badgeBg} ${tierCfg.border}`
                          : 'bg-[#EEF3F1] dark:bg-[#11201E] text-[#8A9A98] dark:text-slate-500 border-[#D3DDDA] dark:border-[#1F8A70]/20'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {badge.isUnlocked ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleTogglePin(badge)}
                            title={isPinned ? 'Unpin from Profile header' : 'Pin to Profile header'}
                            className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-semibold transition inline-flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                              isPinned
                                ? 'bg-[#0F4C45] text-white'
                                : 'bg-white/80 dark:bg-[#11201E] text-[#566664] dark:text-slate-300 border border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45]'
                            }`}
                          >
                            <Pin className="w-3 h-3" />
                            <span>{isPinned ? 'Pinned' : 'Pin'}</span>
                          </button>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#6B7B79] dark:text-slate-500">
                          <Lock className="w-3 h-3" />
                          <span>Locked</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#566664] dark:text-slate-400 tabular-nums">
                      <span className={badge.isUnlocked ? tierCfg.accentText : ''}>
                        {tierCfg.label}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>+{badge.xpReward} XP</span>
                      {badge.isUnlocked && badge.unlockedAt && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{formatShortDate(badge.unlockedAt)}</span>
                        </>
                      )}
                    </div>
                    <h3 className="font-display text-sm font-bold text-[#0E1F1E] dark:text-white leading-snug">
                      {badge.title}
                    </h3>
                    <p className="text-xs text-[#566664] dark:text-slate-400 leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                </div>

                {/* Progress / Unlocked Footer */}
                <div className="pt-3 border-t border-[#E6EEEC] dark:border-[#1F8A70]/20 space-y-2">
                  {badge.isUnlocked ? (
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F4C45] dark:text-[#6EE7B7]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Unlocked</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCelebrate(badge)}
                        className="text-xs font-semibold text-[#9A630B] dark:text-[#F4A62A] hover:underline cursor-pointer"
                      >
                        Celebrate
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#566664] dark:text-slate-400 tabular-nums">
                        <span>
                          {badge.currentValue} / {badge.milestoneGoal} {badge.unit}
                        </span>
                        <span className="font-semibold text-[#0E1F1E] dark:text-slate-200">
                          {badge.progressPercent}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#E6EEEC] dark:bg-[#11201E] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#0F4C45] dark:bg-[#1F8A70] transition-all duration-300"
                          style={{ width: `${badge.progressPercent}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-[#6B7B79] dark:text-slate-400 leading-snug">
                        {badge.howToEarn}
                      </p>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
