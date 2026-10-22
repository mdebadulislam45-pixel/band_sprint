import React, { useState } from 'react';
import {
  Award,
  Crown,
  Trophy,
  Flame,
  Sparkles,
  Zap,
  Lock,
  CheckCircle2,
  Headphones,
  BookOpen,
  Mic,
  PenTool,
  Target,
  ShieldCheck,
  Gem,
  Radio,
  BookMarked,
  Archive,
  ChevronRight,
  X,
  Play
} from 'lucide-react';
import {
  AchievementBadge,
  UserGamificationState,
  TIER_CONFIGS,
  toggleAchievementManual,
  fireAchievementConfetti
} from '../../services/achievementService';
import { soundManager } from '../../utils/audioEffects';
import { ResponsiveModal } from '../common/ResponsiveModal';

interface AchievementsSectionProps {
  badges: AchievementBadge[];
  gamification: UserGamificationState;
  onNavigate: (route: string) => void;
  onRefreshBadges: () => void;
  onOpenSpeedBlitz: () => void;
}

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  badges,
  gamification,
  onNavigate,
  onRefreshBadges,
  onOpenSpeedBlitz
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null);

  // Map icon names to Lucide icons
  const renderIcon = (name: string, className = 'w-5 h-5') => {
    switch (name) {
      case 'Crown':
        return <Crown className={className} />;
      case 'Trophy':
        return <Trophy className={className} />;
      case 'Gem':
        return <Gem className={className} />;
      case 'Headphones':
        return <Headphones className={className} />;
      case 'Radio':
        return <Radio className={className} />;
      case 'Mic':
        return <Mic className={className} />;
      case 'PenTool':
        return <PenTool className={className} />;
      case 'BookMarked':
        return <BookMarked className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      case 'ShieldCheck':
        return <ShieldCheck className={className} />;
      case 'Target':
        return <Target className={className} />;
      case 'Archive':
        return <Archive className={className} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  const filteredBadges = badges.filter((b) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'unlocked') return b.isUnlocked;
    if (selectedFilter === 'vocabulary') return b.category === 'vocabulary';
    if (selectedFilter === 'exam')
      return b.category === 'listening' || b.category === 'speaking' || b.category === 'writing';
    if (selectedFilter === 'streak') return b.category === 'streak' || b.category === 'mastery';
    return true;
  });

  const handleBadgeClick = (badge: AchievementBadge) => {
    setSelectedBadge(badge);
    soundManager.playBeep(badge.isUnlocked ? 700 : 500, 0.04);
  };

  const handleTestToggleUnlock = (badge: AchievementBadge) => {
    const isNowUnlocked = toggleAchievementManual(badge.id);
    onRefreshBadges();
    if (isNowUnlocked) {
      setSelectedBadge((prev) => (prev ? { ...prev, isUnlocked: true, progressPercent: 100 } : null));
    } else {
      setSelectedBadge((prev) => (prev ? { ...prev, isUnlocked: false } : null));
    }
  };

  const handleActionNavigate = (badge: AchievementBadge) => {
    setSelectedBadge(null);
    if (badge.category === 'vocabulary') onNavigate('vocab');
    else if (badge.category === 'listening') onNavigate('listening');
    else if (badge.category === 'speaking') onNavigate('speaking');
    else if (badge.category === 'writing') onNavigate('writing');
    else if (badge.category === 'streak') onNavigate('mocktest');
    else onNavigate('history');
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header with Level & Anti-Boredom Mini Blitz Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-900 border border-amber-400/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-600" />
              MILESTONE REWARDS & BADGES
            </span>
            <span className="text-xs font-bold text-slate-500 font-mono">
              {gamification.unlockedCount} / {gamification.totalCount} Unlocked
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900">
            Achievements & Virtual Badges
          </h2>
          <p className="text-xs text-slate-500">
            Unlock badges for mastering vocabulary, hitting Band 9.0 in listening, and building daily consistency.
          </p>
        </div>

        {/* Quick Anti-Boredom Blitz Button */}
        <button
          onClick={onOpenSpeedBlitz}
          className="self-start sm:self-auto min-h-[44px] px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs shadow-xs transition active:scale-95 flex items-center gap-2 shrink-0"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>Speed Blitz Challenge (60s)</span>
        </button>
      </div>

      {/* Gamification Level Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center justify-center font-mono font-black text-base shadow-2xs">
              L{gamification.level}
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono font-bold text-indigo-300">
                Current Rank
              </div>
              <div className="text-sm sm:text-base font-black text-white">
                {gamification.levelTitle}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase font-mono text-slate-400">Total XP</div>
            <div className="text-base sm:text-lg font-black text-amber-300 font-mono">
              {gamification.totalXp.toLocaleString()} XP
            </div>
          </div>
        </div>

        {/* Progress Bar to next level */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-slate-300">
            <span>Level {gamification.level} Progress</span>
            <span>{gamification.xpForNextLevel > 0 ? `${gamification.xpForNextLevel} XP to Level ${gamification.level + 1}` : 'Max Tier'}</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-700"
              style={{ width: `${gamification.levelProgressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {[
          { id: 'all', label: 'All Badges' },
          { id: 'unlocked', label: `Unlocked (${gamification.unlockedCount})` },
          { id: 'vocabulary', label: 'Vocabulary' },
          { id: 'exam', label: 'Exam Skills' },
          { id: 'streak', label: 'Streaks & Grit' }
        ].map((tab) => {
          const isActive = selectedFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedFilter(tab.id);
                soundManager.playBeep(600, 0.03);
              }}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-black'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        {filteredBadges.map((badge) => {
          const tierConfig = TIER_CONFIGS[badge.tier];
          return (
            <div
              key={badge.id}
              onClick={() => handleBadgeClick(badge)}
              className={`p-4 rounded-2xl border transition cursor-pointer relative overflow-hidden group flex flex-col justify-between space-y-3 ${
                badge.isUnlocked
                  ? `bg-white hover:shadow-md ${tierConfig.border} border-2`
                  : 'bg-slate-50/70 border-slate-200/90 hover:border-slate-300 opacity-90'
              }`}
            >
              {/* Subtle metallic corner glow for unlocked badges */}
              {badge.isUnlocked && (
                <div
                  className={`absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-gradient-to-br ${tierConfig.glow} blur-lg pointer-events-none`}
                />
              )}

              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition shadow-2xs ${
                      badge.isUnlocked
                        ? `${tierConfig.badgeBg} border ${tierConfig.border}`
                        : 'bg-slate-200/80 text-slate-400'
                    }`}
                  >
                    {renderIcon(badge.iconName, 'w-5 h-5')}
                  </div>

                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${tierConfig.badgeBg} ${tierConfig.border}`}
                    >
                      {tierConfig.label}
                    </span>

                    {badge.isUnlocked ? (
                      <span className="p-1 rounded-full bg-emerald-100 text-emerald-700" title="Unlocked">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="p-1 rounded-full bg-slate-200 text-slate-500" title="Locked">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-700 transition leading-snug">
                    {badge.title}
                  </h3>
                  <div className="text-xs font-bold text-slate-500 mt-0.5">
                    {badge.subtitle}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {badge.description}
                  </p>
                </div>
              </div>

              {/* Progress Bar / Unlocked Tag */}
              <div className="pt-2 border-t border-slate-100 space-y-1">
                {badge.isUnlocked ? (
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Unlocked!</span>
                    </span>
                    <span className="font-mono text-slate-400 font-semibold">+{badge.xpReward} XP</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>
                        {badge.currentValue} / {badge.milestoneGoal} {badge.unit}
                      </span>
                      <span>{badge.progressPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${badge.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Badge Detail Inspector Modal (Word Apprentice & all achievements) */}
      <ResponsiveModal
        isOpen={Boolean(selectedBadge)}
        onClose={() => setSelectedBadge(null)}
        maxWidth="md"
        title={
          selectedBadge ? (
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                  TIER_CONFIGS[selectedBadge.tier].badgeBg
                } ${TIER_CONFIGS[selectedBadge.tier].border}`}
              >
                {TIER_CONFIGS[selectedBadge.tier].label} Tier
              </span>
              <span className="text-sm sm:text-base font-black truncate">{selectedBadge.title}</span>
            </div>
          ) : undefined
        }
        subtitle={selectedBadge?.subtitle}
        footer={
          selectedBadge ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={() => handleActionNavigate(selectedBadge)}
                className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Practice Now →</span>
              </button>

              <button
                type="button"
                onClick={() => handleTestToggleUnlock(selectedBadge)}
                className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                title="Toggle unlock state for demonstration & testing"
              >
                {selectedBadge.isUnlocked ? 'Re-lock' : 'Test Unlock 🎉'}
              </button>
            </div>
          ) : undefined
        }
      >
        {selectedBadge && (
          <div className="space-y-4">
            {/* Top Badge Icon Showcase */}
            <div className="flex items-center justify-center py-1">
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border-2 shadow-xs transition ${
                  selectedBadge.isUnlocked
                    ? `${TIER_CONFIGS[selectedBadge.tier].badgeBg} ${TIER_CONFIGS[selectedBadge.tier].border}`
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
                }`}
              >
                {renderIcon(selectedBadge.iconName, 'w-7 h-7 sm:w-8 sm:h-8')}
              </div>
            </div>

            {/* Description & Requirements Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-700/80 text-xs space-y-2">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {selectedBadge.description}
              </p>
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-1">
                <span className="font-mono text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  🎯 How to Unlock:
                </span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  {selectedBadge.howToEarn}
                </span>
              </div>
            </div>

            {/* Progress Box */}
            <div className="p-3.5 rounded-xl sm:rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 space-y-2 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="font-bold text-indigo-900 dark:text-indigo-200">Current Progress</span>
                <span className="font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">
                  {selectedBadge.currentValue} / {selectedBadge.milestoneGoal} {selectedBadge.unit} ({selectedBadge.progressPercent}%)
                </span>
              </div>
              <div className="w-full h-2 bg-indigo-200 dark:bg-indigo-900/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, selectedBadge.progressPercent))}%` }}
                />
              </div>
              <div className="flex justify-between items-center pt-0.5 text-[11px] text-indigo-800 dark:text-indigo-300">
                <span>Reward Value:</span>
                <span className="font-mono font-black text-amber-600 dark:text-amber-400">+{selectedBadge.xpReward} XP</span>
              </div>
            </div>
          </div>
        )}
      </ResponsiveModal>
    </div>
  );
};
