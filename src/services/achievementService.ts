/**
 * BandSprint — Milestone & Achievement Badges System
 * Rewards candidates with unlockable digital badges, XP, levels, and cloud-synced pins
 * driven strictly by real streak consistency, daily target completions, and validated exam scores.
 */

import confetti from 'canvas-confetti';
import { UserProfile, ExamHistoryRecord } from '../types';
import { questionEngine } from './QuestionEngine';
import { soundManager } from '../utils/audioEffects';
import { aggregateExamHistory } from '../utils/historyAggregation';
import { getStreakState, localDateKey } from './streakService';
import { loadDailySprintProgress } from '../utils/dailySprintProgressStore';

export type AchievementCategory =
  | 'vocabulary'
  | 'listening'
  | 'reading'
  | 'speaking'
  | 'writing'
  | 'streak'
  | 'mastery';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface AchievementBadge {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  iconName: string;
  milestoneGoal: number;
  currentValue: number;
  progressPercent: number;
  isUnlocked: boolean;
  unlockedAt?: number;
  xpReward: number;
  unit: string;
  howToEarn: string;
}

export interface UserGamificationState {
  totalXp: number;
  level: number;
  levelTitle: string;
  xpForNextLevel: number;
  levelProgressPercent: number;
  unlockedCount: number;
  totalCount: number;
}

export interface AchievementsPersistenceState {
  unlockedAtById: Record<string, number>;
  pinnedBadgeIds: string[];
  updatedAt: number;
}

const STORAGE_UNLOCKED_KEY = 'ielts_sprint_unlocked_badges_v2';
const STORAGE_PINNED_KEY = 'bandsprint_pinned_badges_v1';
const STORAGE_META_UPDATED_KEY = 'bandsprint_achievements_updated_at_v1';

export const ACHIEVEMENTS_SAVED_EVENT = 'bandsprint_achievements_saved';

// Tier styling configs (editorial light + dark parity)
export const TIER_CONFIGS: Record<
  AchievementTier,
  {
    label: string;
    badgeBg: string;
    border: string;
    ring: string;
    accentText: string;
    glow: string;
  }
> = {
  bronze: {
    label: 'Bronze',
    badgeBg: 'bg-amber-900/10 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300',
    border: 'border-amber-700/30 dark:border-amber-500/40',
    ring: 'ring-amber-700/20 dark:ring-amber-500/25',
    accentText: 'text-amber-800 dark:text-amber-300',
    glow: 'from-amber-700/15 to-orange-600/5'
  },
  silver: {
    label: 'Silver',
    badgeBg: 'bg-slate-200/70 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200',
    border: 'border-slate-300 dark:border-slate-600',
    ring: 'ring-slate-400/20 dark:ring-slate-500/25',
    accentText: 'text-slate-700 dark:text-slate-200',
    glow: 'from-slate-300/25 to-zinc-400/10'
  },
  gold: {
    label: 'Gold',
    badgeBg: 'bg-[#F4A62A]/15 text-[#9A630B] dark:text-[#F4A62A]',
    border: 'border-[#F4A62A]/50',
    ring: 'ring-[#F4A62A]/30',
    accentText: 'text-[#9A630B] dark:text-[#F4A62A]',
    glow: 'from-[#F4A62A]/25 to-amber-300/10'
  },
  platinum: {
    label: 'Platinum',
    badgeBg: 'bg-[#0F4C45]/10 dark:bg-[#1F8A70]/20 text-[#0F4C45] dark:text-[#6EE7B7]',
    border: 'border-[#0F4C45]/40 dark:border-[#1F8A70]/50',
    ring: 'ring-[#0F4C45]/25 dark:ring-[#1F8A70]/30',
    accentText: 'text-[#0F4C45] dark:text-[#6EE7B7]',
    glow: 'from-[#0F4C45]/20 to-[#1F8A70]/10'
  },
  diamond: {
    label: 'Diamond',
    badgeBg: 'bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-800 dark:text-indigo-200',
    border: 'border-indigo-400/50 dark:border-indigo-400/45',
    ring: 'ring-indigo-400/30',
    accentText: 'text-indigo-800 dark:text-indigo-200',
    glow: 'from-indigo-500/20 to-teal-500/10'
  }
};

function isValidBadgeId(id: string): boolean {
  return /^[a-z0-9_-]{1,48}$/i.test(id);
}

/**
 * Sanitizes an achievements state payload for safe localStorage & Firestore storage.
 */
export function sanitizeAchievementsState(raw: unknown): AchievementsPersistenceState {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const unlockedAtById: Record<string, number> = {};

  if (obj.unlockedAtById && typeof obj.unlockedAtById === 'object') {
    const entries = Object.entries(obj.unlockedAtById as Record<string, unknown>);
    for (const [key, val] of entries) {
      if (Object.keys(unlockedAtById).length >= 40) break;
      const cleanKey = String(key).trim();
      if (!isValidBadgeId(cleanKey)) continue;
      if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
        unlockedAtById[cleanKey] = Math.floor(val);
      }
    }
  }

  const pinnedBadgeIds: string[] = [];
  if (Array.isArray(obj.pinnedBadgeIds)) {
    const seen = new Set<string>();
    for (const item of obj.pinnedBadgeIds) {
      if (typeof item !== 'string') continue;
      const clean = item.trim();
      if (clean && isValidBadgeId(clean) && !seen.has(clean)) {
        seen.add(clean);
        pinnedBadgeIds.push(clean);
        if (pinnedBadgeIds.length >= 3) break;
      }
    }
  }

  const updatedAt =
    typeof obj.updatedAt === 'number' && Number.isFinite(obj.updatedAt) && obj.updatedAt > 0
      ? Math.floor(obj.updatedAt)
      : 0;

  return { unlockedAtById, pinnedBadgeIds, updatedAt };
}

/**
 * Reads locally persisted badge unlock map.
 */
function getUnlockedMap(): Record<string, number> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_UNLOCKED_KEY);
    if (!raw) return {};
    return sanitizeAchievementsState({ unlockedAtById: JSON.parse(raw) }).unlockedAtById;
  } catch {
    return {};
  }
}

/**
 * Loads full local achievements persistence state (unlocked map + pinned badge IDs).
 */
export function loadAchievementsState(): AchievementsPersistenceState {
  if (typeof localStorage === 'undefined') {
    return { unlockedAtById: {}, pinnedBadgeIds: [], updatedAt: 0 };
  }
  try {
    const unlockedRaw = localStorage.getItem(STORAGE_UNLOCKED_KEY);
    const pinnedRaw = localStorage.getItem(STORAGE_PINNED_KEY);
    const updatedRaw = localStorage.getItem(STORAGE_META_UPDATED_KEY);
    return sanitizeAchievementsState({
      unlockedAtById: unlockedRaw ? JSON.parse(unlockedRaw) : {},
      pinnedBadgeIds: pinnedRaw ? JSON.parse(pinnedRaw) : [],
      updatedAt: updatedRaw ? Number(updatedRaw) : 0
    });
  } catch {
    return { unlockedAtById: {}, pinnedBadgeIds: [], updatedAt: 0 };
  }
}

/**
 * Saves achievements persistence state locally and optionally notifies Firestore cloud sync.
 */
export function saveAchievementsState(
  state: AchievementsPersistenceState,
  options?: { skipCloud?: boolean }
): AchievementsPersistenceState {
  const clean = sanitizeAchievementsState({
    ...state,
    updatedAt: state.updatedAt || Date.now()
  });

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_UNLOCKED_KEY, JSON.stringify(clean.unlockedAtById));
      localStorage.setItem(STORAGE_PINNED_KEY, JSON.stringify(clean.pinnedBadgeIds));
      localStorage.setItem(STORAGE_META_UPDATED_KEY, String(clean.updatedAt));
    } catch {
      // ignore storage quota failures
    }
  }

  if (typeof window !== 'undefined' && !options?.skipCloud) {
    window.dispatchEvent(new CustomEvent(ACHIEVEMENTS_SAVED_EVENT, { detail: clean }));
  }

  return clean;
}

/**
 * Merges local and remote achievements states without losing earliest unlock timestamps.
 */
export function mergeAchievementsState(
  local: AchievementsPersistenceState,
  remoteRaw: unknown
): AchievementsPersistenceState {
  const remote = sanitizeAchievementsState(remoteRaw);
  const mergedUnlocked: Record<string, number> = { ...local.unlockedAtById };

  for (const [id, remoteTs] of Object.entries(remote.unlockedAtById)) {
    if (Object.keys(mergedUnlocked).length >= 40 && !(id in mergedUnlocked)) break;
    if (!mergedUnlocked[id] || remoteTs < mergedUnlocked[id]) {
      mergedUnlocked[id] = remoteTs;
    }
  }

  const pinnedBadgeIds =
    remote.updatedAt >= local.updatedAt && remote.pinnedBadgeIds.length > 0
      ? remote.pinnedBadgeIds
      : local.pinnedBadgeIds.length > 0
      ? local.pinnedBadgeIds
      : remote.pinnedBadgeIds;

  return sanitizeAchievementsState({
    unlockedAtById: mergedUnlocked,
    pinnedBadgeIds: pinnedBadgeIds.slice(0, 3),
    updatedAt: Math.max(local.updatedAt, remote.updatedAt, Date.now())
  });
}

/**
 * Persists a single newly unlocked badge record and notifies cloud sync.
 */
function saveUnlockedBatch(newlyUnlockedIds: string[]): void {
  if (newlyUnlockedIds.length === 0) return;
  const current = loadAchievementsState();
  let changed = false;
  const now = Date.now();
  const nextMap = { ...current.unlockedAtById };
  for (const id of newlyUnlockedIds) {
    if (!nextMap[id]) {
      nextMap[id] = now;
      changed = true;
    }
  }
  if (changed) {
    saveAchievementsState({
      unlockedAtById: nextMap,
      pinnedBadgeIds: current.pinnedBadgeIds,
      updatedAt: now
    });
  }
}

/**
 * Pins or unpins an unlocked badge for display on the candidate profile banner (max 3).
 */
export function togglePinnedBadge(badgeId: string): string[] {
  const current = loadAchievementsState();
  const exists = current.pinnedBadgeIds.includes(badgeId);
  let nextPinned: string[];
  if (exists) {
    nextPinned = current.pinnedBadgeIds.filter((id) => id !== badgeId);
  } else {
    nextPinned = [...current.pinnedBadgeIds, badgeId].slice(-3);
  }
  const saved = saveAchievementsState({
    unlockedAtById: current.unlockedAtById,
    pinnedBadgeIds: nextPinned,
    updatedAt: Date.now()
  });
  return saved.pinnedBadgeIds;
}

/**
 * Triggers a multi-stage celebratory confetti explosion
 */
export function fireAchievementConfetti() {
  soundManager.playCelebration();

  confetti({
    particleCount: 70,
    spread: 68,
    origin: { y: 0.6 },
    colors: ['#0F4C45', '#1F8A70', '#F4A62A', '#34D399', '#FBBF24']
  });

  setTimeout(() => {
    confetti({
      particleCount: 45,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#F4A62A', '#0F4C45', '#1F8A70']
    });
    confetti({
      particleCount: 45,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#0F4C45', '#F4A62A', '#34D399']
    });
  }, 240);
}

/**
 * Evaluates all BandSprint milestones across streaks, daily targets, grammar, vocab, and validated exams.
 */
export function evaluateAchievements(
  user?: UserProfile | null,
  mistakeCount: number = 0
): AchievementBadge[] {
  const unlockedMap = getUnlockedMap();
  const history: ExamHistoryRecord[] = user?.progress?.examHistory || [];
  const historyAgg = aggregateExamHistory(history);
  const completedModules = user?.progress?.completedModules || ['beginner'];
  const qAttempts = questionEngine.getHistory();
  const streakState = getStreakState();
  const dailySprint = loadDailySprintProgress();
  const todayKey = localDateKey();

  // Compute total vocabulary words mastered across Vocab Deck + Daily Sprint
  let vocabMasteredCount = 0;
  let totalSavedVocab = 0;
  if (typeof localStorage !== 'undefined') {
    try {
      const savedVocab =
        localStorage.getItem('ielts_vocab_cards_v5') || localStorage.getItem('ielts_vocab_cards_v4');
      if (savedVocab) {
        const cards = JSON.parse(savedVocab);
        if (Array.isArray(cards)) {
          totalSavedVocab = cards.length;
          vocabMasteredCount = cards.filter((c: { mastered?: boolean }) => c.mastered).length;
        }
      }
    } catch {
      // ignore
    }
  }

  const dailyVocabCount = dailySprint.masteredVocabIds.length;
  const effectiveVocabCount = Math.max(
    vocabMasteredCount + dailyVocabCount,
    Math.min(totalSavedVocab, completedModules.length * 25)
  );

  // Listening highest score (strictly from validated evaluated history)
  const highestListeningBand = historyAgg.skills.listening.best ?? 0;
  const hasPerfectListening =
    highestListeningBand >= 9.0 ||
    historyAgg.evaluatedRecords.some(
      (ev) =>
        ev.listeningBand !== null &&
        (ev.listeningBand >= 9.0 ||
          (ev.record.totalQuestions > 0 && ev.record.correctCount === ev.record.totalQuestions))
    );

  // Speaking highest score (strictly from validated evaluated Speaking)
  const highestSpeakingBand = historyAgg.skills.speaking.best ?? 0;

  // Overall accuracy
  const totalAttempted =
    qAttempts.length + history.reduce((acc, h) => acc + (h.totalQuestions || 0), 0);
  const totalCorrect =
    qAttempts.filter((a) => a.isCorrect).length +
    history.reduce((acc, h) => acc + (h.correctCount || 0), 0);
  const overallAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  // Real streak consistency (combine profile streak + atomic streakService)
  const effectiveStreakDays = Math.max(
    user?.progress?.streakDays || 0,
    streakState.currentStreak || 0,
    streakState.longestStreak || 0
  );

  // Daily target completions from streakService + Daily Sprint Hub
  const fullMissionDaysCount = Object.values(streakState.completedMissionsByDate).filter(
    (missions) => Array.isArray(missions) && missions.length >= 3
  ).length;
  const quotaStd = dailySprint.quotaTier === 'standard';
  const dailySprintCompletedToday =
    dailySprint.masteredVocabIds.length >= (quotaStd ? 20 : 10) &&
    dailySprint.masteredGrammarIds.length >= (quotaStd ? 6 : 4);
  const dailyTargetDaysCompleted = Math.max(
    fullMissionDaysCount,
    dailySprintCompletedToday ? 1 : 0
  );

  // Early Bird check: completed an exam before 9:00 AM local time OR logged real study activity before 9:00 AM today
  const nowHour = new Date().getHours();
  const hasEarlyExam = history.some((h) => {
    if (typeof h.timestamp !== 'number' || !Number.isFinite(h.timestamp)) return false;
    const hour = new Date(h.timestamp).getHours();
    return hour >= 4 && hour < 9;
  });
  const hasActiveToday =
    (streakState.xpByDate[todayKey] || 0) > 0 ||
    (streakState.minutesByDate[todayKey] || 0) > 0 ||
    dailySprint.pomodoroBlocksCompleted > 0 ||
    dailySprint.masteredVocabIds.length > 0 ||
    dailySprint.masteredGrammarIds.length > 0;
  const earnedEarlyBirdNow = hasEarlyExam || (nowHour >= 4 && nowHour < 9 && hasActiveToday);

  // Grammar Guru check: mastered >= 6 Band 8+ grammar rules in Daily Sprint OR scored >= 85% on Daily Mastery Exam
  const masteredGrammarCount = dailySprint.masteredGrammarIds.length;
  const dailyExamScorePct = dailySprint.lastExamSummary?.scorePct ?? 0;
  const isGrammarGuru = masteredGrammarCount >= 6 || dailyExamScorePct >= 85;

  // Deep Focus study minutes (sum of 30-day logged minutes + today's Pomodoro minutes)
  const loggedStreakMinutes = Object.values(streakState.minutesByDate).reduce(
    (sum, m) => sum + (typeof m === 'number' && Number.isFinite(m) ? m : 0),
    0
  );
  const totalFocusMinutes = Math.max(loggedStreakMinutes, dailySprint.pomodoroFocusMinutesLogged);

  // Words written
  const wordsWritten = user?.progress?.wordsWrittenTotal || 0;

  const badgeDefinitions: Array<{
    id: string;
    title: string;
    subtitle: string;
    description: string;
    category: AchievementCategory;
    tier: AchievementTier;
    iconName: string;
    milestoneGoal: number;
    currentValue: number;
    unit: string;
    xpReward: number;
    howToEarn: string;
    customCondition?: boolean;
  }> = [
    // Signature BandSprint Streak & Daily Target Badges
    {
      id: 'early_bird',
      title: 'Early Bird',
      subtitle: 'Pre-9:00 AM Study Sprint',
      description: 'Complete an IELTS drill, mock exam, or Daily Sprint session before 9:00 AM local time.',
      category: 'streak',
      tier: 'silver',
      iconName: 'Sunrise',
      milestoneGoal: 1,
      currentValue: earnedEarlyBirdNow || Boolean(unlockedMap.early_bird) ? 1 : 0,
      unit: 'morning',
      xpReward: 250,
      howToEarn: 'Finish any Daily Sprint task or timed practice before 9:00 AM.',
      customCondition: earnedEarlyBirdNow
    },
    {
      id: 'daily_finisher',
      title: 'Daily Finisher',
      subtitle: '100% Daily Target Met',
      description: 'Clear all 3 daily study missions or complete a full Daily Sprint vocabulary and grammar quota.',
      category: 'streak',
      tier: 'bronze',
      iconName: 'CheckCircle2',
      milestoneGoal: 1,
      currentValue: dailyTargetDaysCompleted,
      unit: 'day',
      xpReward: 200,
      howToEarn: 'Complete all 3 daily missions on Home or finish your Daily Sprint vocab & grammar quota.'
    },
    {
      id: 'streak_3',
      title: 'Momentum Spark',
      subtitle: '3-Day Study Streak',
      description: 'Build an early IELTS habit with three consecutive days of focused practice.',
      category: 'streak',
      tier: 'bronze',
      iconName: 'Flame',
      milestoneGoal: 3,
      currentValue: effectiveStreakDays,
      unit: 'days',
      xpReward: 150,
      howToEarn: 'Complete at least one study activity on 3 consecutive days.'
    },
    {
      id: 'streak_7',
      title: 'Week of Fire',
      subtitle: '7-Day Study Streak',
      description: 'Maintain an unbroken 7-day IELTS preparation streak without missing a single day.',
      category: 'streak',
      tier: 'gold',
      iconName: 'Flame',
      milestoneGoal: 7,
      currentValue: effectiveStreakDays,
      unit: 'days',
      xpReward: 600,
      howToEarn: 'Study every day for 7 consecutive days in BandSprint.'
    },
    {
      id: 'sprint_legend',
      title: 'Sprint Legend',
      subtitle: '14-Day Streak or 5 Full Target Days',
      description: 'Demonstrate elite exam consistency with a 14-day streak or 5 fully completed daily target days.',
      category: 'streak',
      tier: 'diamond',
      iconName: 'Zap',
      milestoneGoal: 14,
      currentValue: Math.max(effectiveStreakDays, Math.min(14, Math.round((dailyTargetDaysCompleted / 5) * 14))),
      unit: 'days',
      xpReward: 1000,
      howToEarn: 'Reach a 14-day study streak or hit 100% daily targets on 5 separate days.',
      customCondition: effectiveStreakDays >= 14 || dailyTargetDaysCompleted >= 5
    },
    {
      id: 'streak_30',
      title: 'Iron Discipline',
      subtitle: '30-Day Momentum',
      description: 'A full month of relentless consistency: 30 consecutive days of dedicated IELTS practice.',
      category: 'streak',
      tier: 'platinum',
      iconName: 'ShieldCheck',
      milestoneGoal: 30,
      currentValue: effectiveStreakDays,
      unit: 'days',
      xpReward: 1200,
      howToEarn: 'Keep your study streak active for 30 consecutive days.'
    },
    {
      id: 'deep_focus',
      title: 'Focus Architect',
      subtitle: '120+ Focus Minutes',
      description: 'Accumulate 120 minutes of deliberate Pomodoro or timed IELTS practice sessions.',
      category: 'streak',
      tier: 'gold',
      iconName: 'Clock',
      milestoneGoal: 120,
      currentValue: totalFocusMinutes,
      unit: 'mins',
      xpReward: 500,
      howToEarn: 'Log 120 total minutes across Daily Sprint Pomodoro blocks and timed sessions.'
    },

    // Grammar & Mastery Milestones
    {
      id: 'grammar_guru',
      title: 'Grammar Guru',
      subtitle: '6 Band 8+ Rules or 85% Mastery Exam',
      description: 'Master complex clauses, inversion, and cohesion rules in the Daily Sprint grammar drill.',
      category: 'mastery',
      tier: 'gold',
      iconName: 'BookOpenCheck',
      milestoneGoal: 6,
      currentValue: isGrammarGuru ? 6 : masteredGrammarCount,
      unit: 'rules',
      xpReward: 550,
      howToEarn: 'Master 6 Band 8+ grammar rules in Daily Sprint or score 85%+ on the Daily Mastery Exam.',
      customCondition: isGrammarGuru
    },
    {
      id: 'precision_sniper',
      title: 'Precision Ace',
      subtitle: '85%+ Accuracy Rate',
      description: 'Answer at least 40 questions with an overall diagnostic accuracy above 85%.',
      category: 'mastery',
      tier: 'gold',
      iconName: 'Target',
      milestoneGoal: 85,
      currentValue: overallAccuracy,
      unit: '%',
      xpReward: 500,
      howToEarn: 'Solve 40+ questions accurately across Listening, Reading, and Question Bank.',
      customCondition: totalAttempted >= 40 && overallAccuracy >= 85
    },
    {
      id: 'trap_dodger',
      title: 'Trap Conqueror',
      subtitle: '15 Traps Mastered',
      description: 'Overcome distractors and review 15 difficult questions in your Mistake Vault.',
      category: 'mastery',
      tier: 'silver',
      iconName: 'Archive',
      milestoneGoal: 15,
      currentValue: Math.max(0, mistakeCount),
      unit: 'items',
      xpReward: 350,
      howToEarn: 'Save and review 15 tricky examiner traps inside your Mistake Vault.'
    },
    {
      id: 'mock_graduate',
      title: 'Exam Veteran',
      subtitle: 'First Full Mock Exam',
      description: 'Sit through and complete your very first authentic 4-skill Sprint simulated test.',
      category: 'mastery',
      tier: 'bronze',
      iconName: 'Award',
      milestoneGoal: 1,
      currentValue: historyAgg.completedFullMockCount,
      unit: 'exams',
      xpReward: 300,
      howToEarn: 'Complete a full 4-skill mock exam in the Mock Test center.'
    },
    {
      id: 'sprint_elite',
      title: 'Sprint Elite',
      subtitle: 'Overall Band 8.0+',
      description: 'Earn an overall composite Band 8.0 or higher across all 4 IELTS test components.',
      category: 'mastery',
      tier: 'platinum',
      iconName: 'Trophy',
      milestoneGoal: 8.0,
      currentValue: historyAgg.overall.best ?? 0,
      unit: 'Band',
      xpReward: 1000,
      howToEarn: 'Achieve an overall composite score of Band 8.0 or above in a full Mock Exam.'
    },

    // Vocabulary Milestones
    {
      id: 'vocab_50',
      title: 'Word Apprentice',
      subtitle: '50 Vocabulary Words',
      description: 'Master your first 50 academic words and collocations in the Vocab Deck.',
      category: 'vocabulary',
      tier: 'bronze',
      iconName: 'BookMarked',
      milestoneGoal: 50,
      currentValue: effectiveVocabCount,
      unit: 'words',
      xpReward: 150,
      howToEarn: 'Review and mark 50 words as mastered in the Vocab Lab or Daily Sprint.'
    },
    {
      id: 'vocab_200',
      title: 'Lexical Scholar',
      subtitle: '200 Vocabulary Words',
      description: 'Expand your Band 7+ working vocabulary to 200 high-yield academic words.',
      category: 'vocabulary',
      tier: 'silver',
      iconName: 'Sparkles',
      milestoneGoal: 200,
      currentValue: effectiveVocabCount,
      unit: 'words',
      xpReward: 350,
      howToEarn: 'Practice flashcards and expand your mastered list to 200 words.'
    },
    {
      id: 'vocab_500',
      title: 'Vocabulary Titan',
      subtitle: '500 Vocabulary Words',
      description: 'A monument of lexical resource: 500 academic words, collocations, and C1 phrases mastered.',
      category: 'vocabulary',
      tier: 'gold',
      iconName: 'Crown',
      milestoneGoal: 500,
      currentValue: effectiveVocabCount,
      unit: 'words',
      xpReward: 750,
      howToEarn: 'Conquer 500 words across Academic Words, Collocations, and Useful Phrases.'
    },
    {
      id: 'vocab_1000',
      title: 'Lexical Legend',
      subtitle: '1,000 Vocabulary Words',
      description: 'The pinnacle of Lexical Resource: 1,000 advanced words and idioms mastered.',
      category: 'vocabulary',
      tier: 'diamond',
      iconName: 'Gem',
      milestoneGoal: 1000,
      currentValue: effectiveVocabCount,
      unit: 'words',
      xpReward: 1500,
      howToEarn: 'Reach 1,000 mastered vocabulary cards across all IELTS categories.'
    },

    // Skill-Specific Milestones
    {
      id: 'listening_ace',
      title: 'Acoustic Specialist',
      subtitle: 'Band 8.0+ Listening',
      description: 'Demonstrate effortless audio comprehension with a Band 8.0+ in Listening.',
      category: 'listening',
      tier: 'silver',
      iconName: 'Radio',
      milestoneGoal: 8.0,
      currentValue: highestListeningBand,
      unit: 'Band',
      xpReward: 400,
      howToEarn: 'Attain Band 8.0 or higher in a full Listening test or Section 1-4 practice.'
    },
    {
      id: 'perfect_listening',
      title: 'Aural Prodigy',
      subtitle: 'Perfect Listening Score',
      description: 'Achieve an impeccable Band 9.0 in IELTS Listening with zero margin of error.',
      category: 'listening',
      tier: 'diamond',
      iconName: 'Headphones',
      milestoneGoal: 9.0,
      currentValue: highestListeningBand,
      unit: 'Band',
      xpReward: 1200,
      howToEarn: 'Score Band 9.0 on a full 40-question Listening Mock Test or CD simulation.',
      customCondition: hasPerfectListening
    },
    {
      id: 'speaking_maestro',
      title: 'Fluency Virtuoso',
      subtitle: 'Band 8.0+ Speaking Maestro',
      description: 'Deliver natural discourse markers, varied intonation, and minimal hesitation in Speaking.',
      category: 'speaking',
      tier: 'gold',
      iconName: 'Mic',
      milestoneGoal: 8.0,
      currentValue: highestSpeakingBand,
      unit: 'Band',
      xpReward: 800,
      howToEarn: 'Complete a full Speaking Part 1, 2, and 3 simulation scoring Band 8.0 or higher.'
    },
    {
      id: 'essay_architect',
      title: 'Task 2 Scribe',
      subtitle: '1,000 Words Written',
      description: 'Draft over 1,000 words across timed Task 1 reports and Task 2 opinion essays.',
      category: 'writing',
      tier: 'silver',
      iconName: 'PenTool',
      milestoneGoal: 1000,
      currentValue: wordsWritten,
      unit: 'words',
      xpReward: 450,
      howToEarn: 'Write and submit essays in the Writing Lab or timed Mock Test.'
    }
  ];

  const newlyUnlockedIds: string[] = [];
  const now = Date.now();

  const evaluated = badgeDefinitions.map((def) => {
    const conditionMet =
      def.customCondition !== undefined
        ? def.customCondition
        : def.currentValue >= def.milestoneGoal;

    const previouslyUnlocked = Boolean(unlockedMap[def.id]);
    const isUnlocked = conditionMet || previouslyUnlocked;

    if (conditionMet && !previouslyUnlocked) {
      newlyUnlockedIds.push(def.id);
    }

    const progressPercent = Math.min(
      100,
      Math.max(0, Math.round((def.currentValue / def.milestoneGoal) * 100))
    );

    return {
      id: def.id,
      title: def.title,
      subtitle: def.subtitle,
      description: def.description,
      category: def.category,
      tier: def.tier,
      iconName: def.iconName,
      milestoneGoal: def.milestoneGoal,
      currentValue: def.currentValue,
      progressPercent: isUnlocked ? 100 : progressPercent,
      isUnlocked,
      unlockedAt: unlockedMap[def.id] || (isUnlocked ? now : undefined),
      xpReward: def.xpReward,
      unit: def.unit,
      howToEarn: def.howToEarn
    };
  });

  if (newlyUnlockedIds.length > 0) {
    saveUnlockedBatch(newlyUnlockedIds);
  }

  return evaluated;
}

/**
 * Calculates current XP, level, and next-tier progress
 */
export function getGamificationStats(
  badges: AchievementBadge[],
  user?: UserProfile | null
): UserGamificationState {
  let earnedXp = badges
    .filter((b) => b.isUnlocked)
    .reduce((sum, b) => sum + b.xpReward, 0);

  const attemptsCount = questionEngine.getHistory().length;
  const examsCount = user?.progress?.examHistory?.length || 0;
  const streakState = getStreakState();
  const streakDays = Math.max(user?.progress?.streakDays || 0, streakState.currentStreak || 0);

  earnedXp += attemptsCount * 15;
  earnedXp += examsCount * 250;
  earnedXp += streakDays * 50;
  earnedXp += streakState.totalXp || 0;

  const levels = [
    { level: 1, minXp: 0, maxXp: 400, title: 'Novice Aspirant' },
    { level: 2, minXp: 400, maxXp: 900, title: 'Band 6.5 Challenger' },
    { level: 3, minXp: 900, maxXp: 1600, title: 'Band 7.0 Explorer' },
    { level: 4, minXp: 1600, maxXp: 2600, title: 'Band 7.5 Scholar' },
    { level: 5, minXp: 2600, maxXp: 4000, title: 'Band 8.0 Virtuoso' },
    { level: 6, minXp: 4000, maxXp: 6000, title: 'Band 8.5 Master' },
    { level: 7, minXp: 6000, maxXp: 10000, title: 'Sprint Grandmaster (Band 9.0)' }
  ];

  let currentLevel = levels[0];
  for (const lvl of levels) {
    if (earnedXp >= lvl.minXp) {
      currentLevel = lvl;
    }
  }

  const range = Math.max(1, currentLevel.maxXp - currentLevel.minXp);
  const inLevelXp = earnedXp - currentLevel.minXp;
  const levelProgressPercent = Math.min(100, Math.max(0, Math.round((inLevelXp / range) * 100)));

  return {
    totalXp: earnedXp,
    level: currentLevel.level,
    levelTitle: currentLevel.title,
    xpForNextLevel: Math.max(0, currentLevel.maxXp - earnedXp),
    levelProgressPercent,
    unlockedCount: badges.filter((b) => b.isUnlocked).length,
    totalCount: badges.length
  };
}

/**
 * Manually unlocks or toggles an achievement for testing/celebration
 */
export function toggleAchievementManual(badgeId: string): boolean {
  const current = loadAchievementsState();
  const nextMap = { ...current.unlockedAtById };
  if (nextMap[badgeId]) {
    delete nextMap[badgeId];
    saveAchievementsState({
      unlockedAtById: nextMap,
      pinnedBadgeIds: current.pinnedBadgeIds.filter((id) => id !== badgeId),
      updatedAt: Date.now()
    });
    return false;
  } else {
    nextMap[badgeId] = Date.now();
    saveAchievementsState({
      unlockedAtById: nextMap,
      pinnedBadgeIds: current.pinnedBadgeIds,
      updatedAt: Date.now()
    });
    fireAchievementConfetti();
    return true;
  }
}
