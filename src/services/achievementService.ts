/**
 * IELTS Sprint — Milestone & Achievement Badges System
 * Rewards users with virtual badges, XP, levels, and celebratory milestones
 */

import confetti from 'canvas-confetti';
import { UserProfile, ExamHistoryRecord } from '../types';
import { questionEngine } from './QuestionEngine';
import { soundManager } from '../utils/audioEffects';
import { isFullMockExamRecord } from '../utils/userStorage';

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

const STORAGE_UNLOCKED_KEY = 'ielts_sprint_unlocked_badges_v2';
const STORAGE_USER_XP_KEY = 'ielts_sprint_gamification_xp_v2';

// Tier styling configs
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
    badgeBg: 'bg-amber-900/10 text-amber-800',
    border: 'border-amber-700/30',
    ring: 'ring-amber-700/20',
    accentText: 'text-amber-800',
    glow: 'from-amber-700/20 to-orange-600/10'
  },
  silver: {
    label: 'Silver',
    badgeBg: 'bg-slate-200/60 text-slate-700',
    border: 'border-slate-300',
    ring: 'ring-slate-400/20',
    accentText: 'text-slate-700',
    glow: 'from-slate-300/30 to-zinc-400/10'
  },
  gold: {
    label: 'Gold',
    badgeBg: 'bg-amber-400/20 text-amber-800',
    border: 'border-amber-400/50',
    ring: 'ring-amber-400/30',
    accentText: 'text-amber-700',
    glow: 'from-amber-400/30 to-yellow-300/20'
  },
  platinum: {
    label: 'Platinum',
    badgeBg: 'bg-cyan-500/15 text-cyan-800',
    border: 'border-cyan-400/50',
    ring: 'ring-cyan-400/30',
    accentText: 'text-cyan-700',
    glow: 'from-cyan-400/30 to-blue-500/20'
  },
  diamond: {
    label: 'Diamond',
    badgeBg: 'bg-purple-500/15 text-purple-800',
    border: 'border-purple-400/60',
    ring: 'ring-purple-400/40',
    accentText: 'text-purple-700',
    glow: 'from-purple-500/30 to-indigo-500/20'
  }
};

/**
 * Reads locally persisted badge unlock records
 */
function getUnlockedMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_UNLOCKED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Persists an unlock record
 */
function saveUnlocked(badgeId: string): void {
  try {
    const map = getUnlockedMap();
    if (!map[badgeId]) {
      map[badgeId] = Date.now();
      localStorage.setItem(STORAGE_UNLOCKED_KEY, JSON.stringify(map));
    }
  } catch {}
}

/**
 * Triggers a multi-stage celebratory confetti explosion
 */
export function fireAchievementConfetti() {
  soundManager.playCelebration();

  // Burst 1: Center fireworks
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
  });

  // Burst 2: Left/right streamers with delay
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#f59e0b', '#3b82f6', '#10b981']
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#8b5cf6', '#ec4899', '#3b82f6']
    });
  }, 250);
}

/**
 * Evaluates all user milestones across modules
 */
export function evaluateAchievements(
  user?: UserProfile | null,
  mistakeCount: number = 0
): AchievementBadge[] {
  const unlockedMap = getUnlockedMap();
  const history: ExamHistoryRecord[] = user?.progress?.examHistory || [];
  const fullMockHistory = history.filter((h) => isFullMockExamRecord(h));
  const completedModules = user?.progress?.completedModules || ['beginner'];
  const qAttempts = questionEngine.getHistory();
  const listeningStats = questionEngine.getModuleStats('listening');
  const readingStats = questionEngine.getModuleStats('reading');
  const speakingStats = questionEngine.getModuleStats('speaking');
  const writingStats = questionEngine.getModuleStats('writing');

  // Compute total vocabulary words known / mastered
  let vocabMasteredCount = 0;
  let totalSavedVocab = 0;
  try {
    const savedVocab = localStorage.getItem('ielts_vocab_cards_v5') || localStorage.getItem('ielts_vocab_cards_v4');
    if (savedVocab) {
      const cards = JSON.parse(savedVocab);
      if (Array.isArray(cards)) {
        totalSavedVocab = cards.length;
        vocabMasteredCount = cards.filter((c: any) => c.mastered).length;
      }
    }
  } catch {}

  // If newly started with default items, ensure real activity is accurately represented
  const effectiveVocabCount = Math.max(vocabMasteredCount, Math.min(totalSavedVocab, completedModules.length * 25));

  // Listening highest score
  const highestListeningBand = Math.max(
    listeningStats.estimatedBand || 0,
    ...history.map((h) => h.listeningBand || 0)
  );
  const hasPerfectListening =
    highestListeningBand >= 9.0 ||
    history.some((h) => (h.listeningBand || 0) >= 9.0 || (h.totalQuestions > 0 && h.correctCount === h.totalQuestions));

  // Speaking highest score
  const highestSpeakingBand = Math.max(
    speakingStats.estimatedBand || 0,
    ...history.map((h) => (h as any).speakingBand || 0)
  );

  // Overall accuracy
  const totalAttempted = qAttempts.length + history.reduce((acc, h) => acc + (h.totalQuestions || 0), 0);
  const totalCorrect = qAttempts.filter((a) => a.isCorrect).length + history.reduce((acc, h) => acc + (h.correctCount || 0), 0);
  const overallAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  // Streak
  const streakDays = user?.progress?.streakDays || 1;

  // Words written
  const wordsWritten = user?.progress?.wordsWrittenTotal || 0;

  // Raw badge definitions
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
    // 1. Vocabulary Milestones
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
      howToEarn: 'Review and mark 50 words as mastered in the Vocab Lab.'
    },
    {
      id: 'vocab_200',
      title: 'Lexical Scholar',
      subtitle: '200 Vocabulary Words',
      description: 'Expand your Band 7+ working vocabulary to 200 high-yield words.',
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
      description: 'A monument of lexical resource: 500 academic words, collocations, and C1 phrases fully mastered.',
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
      description: 'The pinnacle of Cambridge Lexical Resource: 1,000 advanced words and idioms.',
      category: 'vocabulary',
      tier: 'diamond',
      iconName: 'Gem',
      milestoneGoal: 1000,
      currentValue: effectiveVocabCount,
      unit: 'words',
      xpReward: 1500,
      howToEarn: 'Reach 1,000 mastered vocabulary cards across all IELTS categories.'
    },

    // 2. Listening Milestones
    {
      id: 'perfect_listening',
      title: 'Aural Prodigy',
      subtitle: 'Perfect Listening Score',
      description: 'Achieve an impeccable Band 9.0 in Authentic IELTS Listening with zero margin of error.',
      category: 'listening',
      tier: 'diamond',
      iconName: 'Headphones',
      milestoneGoal: 9.0,
      currentValue: highestListeningBand,
      unit: 'Band',
      xpReward: 1200,
      howToEarn: 'Score Band 9.0 on a full 40-question Listening Mock Test or CD Listening simulation.',
      customCondition: hasPerfectListening
    },
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
      howToEarn: 'Attain Band 8.0 or higher in a full Listening test or Cambridge Section 1-4 practice.'
    },

    // 3. Speaking & Pronunciation
    {
      id: 'speaking_maestro',
      title: 'Fluency Virtuoso',
      subtitle: 'Band 8.0+ Speaking Maestro',
      description: 'Deliver natural British discourse markers, varied intonation, and zero hesitation in Voice Examiner.',
      category: 'speaking',
      tier: 'gold',
      iconName: 'Mic',
      milestoneGoal: 8.0,
      currentValue: highestSpeakingBand,
      unit: 'Band',
      xpReward: 800,
      howToEarn: 'Complete a full Speaking Part 1, 2, and 3 simulation scoring Band 8.0 or higher.'
    },

    // 4. Writing & Scribe
    {
      id: 'essay_architect',
      title: 'Task 2 Scribe',
      subtitle: '1,000 Words Written',
      description: 'Draft over 1,000 words across timed Cambridge Task 1 reports and Task 2 opinion essays.',
      category: 'writing',
      tier: 'silver',
      iconName: 'PenTool',
      milestoneGoal: 1000,
      currentValue: wordsWritten,
      unit: 'words',
      xpReward: 450,
      howToEarn: 'Write and submit essays in the Writing Lab or timed Mock Test.'
    },

    // 5. Streaks & Momentum
    {
      id: 'streak_7',
      title: 'Week of Fire',
      subtitle: '7-Day Study Streak',
      description: 'Maintain an unbroken 7-day IELTS preparation streak without missing a single day.',
      category: 'streak',
      tier: 'gold',
      iconName: 'Flame',
      milestoneGoal: 7,
      currentValue: streakDays,
      unit: 'days',
      xpReward: 600,
      howToEarn: 'Study every day for 7 consecutive days in IELTS Sprint.'
    },
    {
      id: 'streak_30',
      title: 'Iron Discipline',
      subtitle: '30-Day Momentum',
      description: 'A month of relentless consistency: 30 consecutive days of dedicated IELTS practice.',
      category: 'streak',
      tier: 'platinum',
      iconName: 'ShieldCheck',
      milestoneGoal: 30,
      currentValue: streakDays,
      unit: 'days',
      xpReward: 1200,
      howToEarn: 'Keep your study streak burning for 30 straight days.'
    },

    // 6. Accuracy & Mastery
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
      howToEarn: 'Solve questions accurately across Listening, Reading, and Question Bank.',
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
      currentValue: Math.max(mistakeCount, 5),
      unit: 'items',
      xpReward: 350,
      howToEarn: 'Save and review tricky examiner traps inside the Mistake Vault.'
    },

    // 7. Full Mock Exams
    {
      id: 'mock_graduate',
      title: 'Exam Veteran',
      subtitle: 'First Full Mock Exam',
      description: 'Sit through and complete your very first authentic 4-skill Cambridge simulated test.',
      category: 'mastery',
      tier: 'bronze',
      iconName: 'Award',
      milestoneGoal: 1,
      currentValue: fullMockHistory.length,
      unit: 'exams',
      xpReward: 300,
      howToEarn: 'Complete a full mock exam in the Mock Test center.'
    },
    {
      id: 'cambridge_elite',
      title: 'Cambridge Elite',
      subtitle: 'Overall Band 8.0+',
      description: 'Earn an overall composite Band 8.0 or higher across all 4 IELTS test components.',
      category: 'mastery',
      tier: 'platinum',
      iconName: 'Trophy',
      milestoneGoal: 8.0,
      currentValue: fullMockHistory.length
        ? Math.max(...fullMockHistory.map((h) => h.overallBand || 0))
        : 0,
      unit: 'Band',
      xpReward: 1000,
      howToEarn: 'Achieve an overall composite score of Band 8.0 or above in a full Mock Exam.'
    }
  ];

  return badgeDefinitions.map((def) => {
    // Check if unlocked either via real stats or previous unlock
    const conditionMet = def.customCondition !== undefined
      ? def.customCondition
      : def.currentValue >= def.milestoneGoal;

    const previouslyUnlocked = !!unlockedMap[def.id];
    const isUnlocked = conditionMet || previouslyUnlocked;

    if (conditionMet && !previouslyUnlocked) {
      saveUnlocked(def.id);
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
      unlockedAt: unlockedMap[def.id] || (isUnlocked ? Date.now() : undefined),
      xpReward: def.xpReward,
      unit: def.unit,
      howToEarn: def.howToEarn
    };
  });
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

  // Add baseline XP for study actions
  const attemptsCount = questionEngine.getHistory().length;
  const examsCount = user?.progress?.examHistory?.length || 0;
  const streakDays = user?.progress?.streakDays || 1;

  earnedXp += attemptsCount * 15;
  earnedXp += examsCount * 250;
  earnedXp += streakDays * 50;

  // Level thresholds: Level 1 = 0-500, Level 2 = 500-1200, etc.
  const levels = [
    { level: 1, minXp: 0, maxXp: 400, title: 'Novice Aspirant' },
    { level: 2, minXp: 400, maxXp: 900, title: 'Band 6.5 Challenger' },
    { level: 3, minXp: 900, maxXp: 1600, title: 'Band 7.0 Explorer' },
    { level: 4, minXp: 1600, maxXp: 2600, title: 'Band 7.5 Scholar' },
    { level: 5, minXp: 2600, maxXp: 4000, title: 'Band 8.0 Virtuoso' },
    { level: 6, minXp: 4000, maxXp: 6000, title: 'Band 8.5 Master' },
    { level: 7, minXp: 6000, maxXp: 10000, title: 'Cambridge Grandmaster (Band 9.0)' }
  ];

  let currentLevel = levels[0];
  for (const lvl of levels) {
    if (earnedXp >= lvl.minXp) {
      currentLevel = lvl;
    }
  }

  const range = currentLevel.maxXp - currentLevel.minXp;
  const inLevelXp = earnedXp - currentLevel.minXp;
  const levelProgressPercent = Math.min(100, Math.max(0, Math.round((inLevelXp / range) * 100)));

  return {
    totalXp: earnedXp,
    level: currentLevel.level,
    levelTitle: currentLevel.title,
    xpForNextLevel: currentLevel.maxXp - earnedXp,
    levelProgressPercent,
    unlockedCount: badges.filter((b) => b.isUnlocked).length,
    totalCount: badges.length
  };
}

/**
 * Manually unlocks or toggles an achievement for testing/celebration
 */
export function toggleAchievementManual(badgeId: string): boolean {
  const map = getUnlockedMap();
  if (map[badgeId]) {
    delete map[badgeId];
    localStorage.setItem(STORAGE_UNLOCKED_KEY, JSON.stringify(map));
    return false;
  } else {
    map[badgeId] = Date.now();
    localStorage.setItem(STORAGE_UNLOCKED_KEY, JSON.stringify(map));
    fireAchievementConfetti();
    return true;
  }
}
