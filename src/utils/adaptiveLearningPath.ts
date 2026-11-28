import {
  DailySprintGrammarRule,
  DailySprintVocabItem,
  SprintQuotaTier
} from '../data/dailyBanglaSprintData';
import { MistakeItem, UserProfile } from '../types';
import { getMistakes } from './vaultStorage';
import {
  DailySprintProgressState,
  getTodayDateKey
} from './dailySprintProgressStore';
import { getStreakState, localDateKey, StreakState } from '../services/streakService';

export type AdaptiveDifficultyTier = 'recovery' | 'balanced' | 'stretch';
export type DifficultyModePreference = 'auto' | AdaptiveDifficultyTier;

export interface AdaptivePriorityTag {
  score: number;
  frequencyHits: number;
  reason: string;
  tag: 'Vault Priority' | 'Difficulty Calibrated';
}

export interface VaultErrorFrequencyCluster {
  key: string;
  label: string;
  module: MistakeItem['module'];
  count: number;
  unresolvedCount: number;
  weight: number;
  sampleTerms: string[];
}

export interface AdaptivePathSummary {
  difficultyTier: AdaptiveDifficultyTier;
  prioritizedVocabIds: string[];
  prioritizedGrammarIds: string[];
  priorityByItemId: Record<string, AdaptivePriorityTag>;
  topErrorClusters: VaultErrorFrequencyCluster[];
  totalVaultMistakesAnalyzed: number;
}

export interface VelocityTrendPoint {
  dateKey: string;
  label: string;
  isPrediction: boolean;
  actualVelocity: number | null;
  predictedVelocity: number | null;
  targetPace: number;
  focusMinutes: number;
  xpEarned: number;
}

export interface SmartSprintIntelligenceReport {
  velocityScore: number; // 0-100+ composite pace index
  velocityDeltaPct: number; // vs 7-day rolling baseline
  velocityTrendLabel: 'Accelerating' | 'Steady' | 'Building' | 'Needs Spark';
  recommendedDifficulty: AdaptiveDifficultyTier;
  activeDifficulty: AdaptiveDifficultyTier;
  difficultyPreference: DifficultyModePreference;
  difficultyLabel: string;
  difficultyBandFocus: string;
  difficultyRationale: string;
  recommendedQuotaTier: SprintQuotaTier;
  todayCompletionPct: number;
  remainingTargetsToday: number;
  adjustedRemainingTargets: number;
  totalTargetsToday: number;
  completedTargetsToday: number;
  focusMinutesToday: number;
  dailyGoalMinutes: number;
  unresolvedVaultCount: number;
  projectedSevenDayReadiness: number; // 0-100
  projectedWeeklyCompletions: number;
  topErrorClusters: VaultErrorFrequencyCluster[];
  velocityTrendPoints: VelocityTrendPoint[];
}

export const ADAPTIVE_DIFFICULTY_STORAGE_KEY = 'bandsprint_adaptive_difficulty_v1';
export const ADAPTIVE_DIFFICULTY_UPDATED_EVENT = 'bandsprint_adaptive_difficulty_updated';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'your', 'have', 'been',
  'were', 'will', 'would', 'could', 'should', 'about', 'there', 'their', 'which', 'when',
  'what', 'where', 'while', 'does', 'dont', 'very', 'more', 'most', 'some', 'many', 'much',
  'task', 'ielts', 'band', 'item', 'rule', 'error', 'mistake', 'correct', 'answer', 'question',
  'sentence', 'upgrade', 'review', 'section', 'practice', 'passage', 'audio', 'word', 'words'
]);

const GRAMMAR_SIGNAL_GROUPS: Array<{ id: string; label: string; patterns: string[] }> = [
  {
    id: 'inversion',
    label: 'Inversion & Emphasis',
    patterns: ['inversion', 'not only', 'rarely', 'seldom', 'never have', 'hardly', 'emphatic']
  },
  {
    id: 'subject_verb',
    label: 'Subject-Verb Agreement',
    patterns: ['agreement', 'subject-verb', 'singular', 'plural', 's/es', 'verb form', 'third person']
  },
  {
    id: 'articles',
    label: 'Articles & Determiners',
    patterns: ['article', 'a/an', 'the ', 'determiner', 'uncountable', 'countable']
  },
  {
    id: 'tenses',
    label: 'Tense Consistency & Aspect',
    patterns: ['tense', 'present perfect', 'past simple', 'passive', 'voice', 'participle', 'had been']
  },
  {
    id: 'complex_clauses',
    label: 'Complex & Relative Clauses',
    patterns: ['clause', 'relative', 'subordinat', 'although', 'whereas', 'despite', 'comma splice', 'run-on', 'fragment']
  },
  {
    id: 'conditionals',
    label: 'Conditionals & Hedging',
    patterns: ['conditional', 'would', 'if ', 'modal', 'hedging', 'may', 'might', 'speculat']
  },
  {
    id: 'cohesion',
    label: 'Cohesion & Linkers',
    patterns: ['cohesion', 'coherence', 'linker', 'connector', 'transition', 'furthermore', 'however', 'moreover']
  },
  {
    id: 'prepositions',
    label: 'Prepositions & Collocations',
    patterns: ['preposition', 'collocation', 'detrimental to', 'impact on', 'depend on', 'result in', 'in terms of']
  },
  {
    id: 'nominalization',
    label: 'Academic Nominalization',
    patterns: ['nominalization', 'register', 'informal', 'academic tone', 'lexical', 'precision', 'paraphrase']
  }
];

export function loadDifficultyPreference(): DifficultyModePreference {
  if (typeof localStorage === 'undefined') return 'auto';
  try {
    const raw = localStorage.getItem(ADAPTIVE_DIFFICULTY_STORAGE_KEY);
    if (raw === 'auto' || raw === 'recovery' || raw === 'balanced' || raw === 'stretch') {
      return raw;
    }
    return 'auto';
  } catch {
    return 'auto';
  }
}

export function saveDifficultyPreference(pref: DifficultyModePreference): DifficultyModePreference {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(ADAPTIVE_DIFFICULTY_STORAGE_KEY, pref);
    } catch {}
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ADAPTIVE_DIFFICULTY_UPDATED_EVENT, { detail: pref }));
  }
  return pref;
}

function tokenizeNormalized(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^['-]+|['-]+$/g, ''))
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

function getBandNumeric(level: DailySprintVocabItem['bandLevel'] | string): number {
  const match = String(level).match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 8.0;
}

/**
 * Extracts frequency-weighted error clusters and normalized token weights from the Mistake Vault.
 * Unresolved mistakes and repeated misses (via SM-2 low repetition / recency) receive higher priority weight.
 */
export function buildVaultFrequencyProfile(
  mistakesInput?: MistakeItem[],
  reviewSchedule?: DailySprintProgressState['reviewSchedule']
): {
  tokenWeights: Map<string, number>;
  grammarSignalWeights: Map<string, number>;
  moduleWeights: Record<MistakeItem['module'], number>;
  clusters: VaultErrorFrequencyCluster[];
  totalAnalyzed: number;
} {
  let mistakes: MistakeItem[] = [];
  if (Array.isArray(mistakesInput)) {
    mistakes = mistakesInput;
  } else {
    try {
      mistakes = getMistakes();
    } catch {
      mistakes = [];
    }
  }

  const tokenWeights = new Map<string, number>();
  const grammarSignalWeights = new Map<string, number>();
  const moduleWeights: Record<MistakeItem['module'], number> = {
    listening: 0,
    reading: 0,
    writing: 0,
    speaking: 0,
    vocab: 0
  };
  const clusterMap = new Map<string, VaultErrorFrequencyCluster>();

  const now = Date.now();

  for (const m of mistakes) {
    // Unresolved errors get 2.5x weight; mastered past errors still retain 0.65x historical frequency signal
    const unresolvedMultiplier = m.mastered ? 0.65 : 2.5;
    const daysOld = Math.max(0, (now - (m.timestamp || now)) / (1000 * 60 * 60 * 24));
    const recencyMultiplier = daysOld <= 7 ? 1.4 : daysOld <= 21 ? 1.15 : 0.9;
    const srMissCount = reviewSchedule?.[`vault_${m.id}`]?.missCount || 1;
    const repetitionPenalty = m.mastered ? 1 : 1 + Math.max(0, 2 - (m.repetition || 0)) * 0.25;
    const itemWeight = Number(
      (unresolvedMultiplier * recencyMultiplier * repetitionPenalty * Math.min(4, srMissCount)).toFixed(2)
    );

    moduleWeights[m.module] = (moduleWeights[m.module] || 0) + itemWeight;

    const combinedText = [
      m.title,
      m.questionType || '',
      m.userAnswer || '',
      m.correctAnswer || '',
      m.explanation || '',
      m.trapExplanationEn || '',
      m.sourceContext || ''
    ].join(' ');
    const lowerCombined = combinedText.toLowerCase();

    // Token frequency weights
    const uniqueTokens = new Set(tokenizeNormalized(combinedText));
    uniqueTokens.forEach((tok) => {
      tokenWeights.set(tok, (tokenWeights.get(tok) || 0) + itemWeight);
    });

    // Exact target answer boost
    const answerTokens = tokenizeNormalized(m.correctAnswer || '');
    answerTokens.forEach((tok) => {
      tokenWeights.set(tok, (tokenWeights.get(tok) || 0) + itemWeight * 2.2);
    });

    // Grammar rule family matching
    let matchedSignalLabel: string | null = null;
    for (const group of GRAMMAR_SIGNAL_GROUPS) {
      if (group.patterns.some((p) => lowerCombined.includes(p))) {
        grammarSignalWeights.set(
          group.id,
          (grammarSignalWeights.get(group.id) || 0) + itemWeight
        );
        if (!matchedSignalLabel) matchedSignalLabel = group.label;
      }
    }

    // Build human-readable frequency clusters for UI telemetry & reasoning
    const clusterLabel =
      matchedSignalLabel ||
      (m.questionType && m.questionType.length <= 36 ? m.questionType : '') ||
      `${m.module.charAt(0).toUpperCase() + m.module.slice(1)} Precision`;
    const clusterKey = `${m.module}::${clusterLabel.toLowerCase()}`;
    const existing = clusterMap.get(clusterKey);
    const sampleTerm = (m.correctAnswer || m.title || '').trim().slice(0, 34);

    if (existing) {
      existing.count += 1;
      if (!m.mastered) existing.unresolvedCount += 1;
      existing.weight = Number((existing.weight + itemWeight).toFixed(2));
      if (sampleTerm && existing.sampleTerms.length < 3 && !existing.sampleTerms.includes(sampleTerm)) {
        existing.sampleTerms.push(sampleTerm);
      }
    } else {
      clusterMap.set(clusterKey, {
        key: clusterKey,
        label: clusterLabel,
        module: m.module,
        count: 1,
        unresolvedCount: m.mastered ? 0 : 1,
        weight: itemWeight,
        sampleTerms: sampleTerm ? [sampleTerm] : []
      });
    }
  }

  const clusters = Array.from(clusterMap.values()).sort(
    (a, b) => b.weight - a.weight || b.unresolvedCount - a.unresolvedCount || b.count - a.count
  );

  return {
    tokenWeights,
    grammarSignalWeights,
    moduleWeights,
    clusters,
    totalAnalyzed: mistakes.length
  };
}

/**
 * Scores and reorders daily vocabulary targets so high-frequency Vault errors surface first,
 * and remaining slots calibrate cleanly to the active Adaptive Difficulty Tier.
 */
export function prioritizeDailyVocabulary(
  fullPool: DailySprintVocabItem[],
  baselineRotated: DailySprintVocabItem[],
  targetCount: number,
  difficultyTier: AdaptiveDifficultyTier,
  mistakesInput?: MistakeItem[],
  reviewSchedule?: DailySprintProgressState['reviewSchedule']
): {
  items: DailySprintVocabItem[];
  prioritizedIds: string[];
  priorityReasons: Record<string, AdaptivePriorityTag>;
} {
  const profile = buildVaultFrequencyProfile(mistakesInput, reviewSchedule);
  const priorityReasons: Record<string, AdaptivePriorityTag> = {};

  const scoreItem = (item: DailySprintVocabItem): { vaultScore: number; hits: number; difficultyBonus: number; matchedToken: string } => {
    const wordLower = item.word.trim().toLowerCase();
    let vaultScore = 0;
    let hits = 0;
    let matchedToken = '';

    // 1. Direct target word match in Mistake Vault
    const directWeight = profile.tokenWeights.get(wordLower) || 0;
    if (directWeight > 0) {
      vaultScore += directWeight * 6;
      hits += Math.max(1, Math.round(directWeight / 2));
      matchedToken = item.word;
    }

    // 2. Synonym overlap with Mistake Vault words
    for (const syn of item.synonyms) {
      const synLower = syn.trim().toLowerCase();
      const sw = profile.tokenWeights.get(synLower) || 0;
      if (sw > 0) {
        vaultScore += sw * 3.2;
        hits += 1;
        if (!matchedToken) matchedToken = syn;
      }
    }

    // 3. Semantic overlap across English definition + example sentence
    const itemTokens = new Set(tokenizeNormalized(`${item.englishDefinition} ${item.exampleSentence}`));
    let semanticMatches = 0;
    itemTokens.forEach((tok) => {
      const tw = profile.tokenWeights.get(tok) || 0;
      if (tw > 0) {
        vaultScore += Math.min(6, tw * 0.9);
        semanticMatches += 1;
        if (!matchedToken) matchedToken = tok;
      }
    });
    if (semanticMatches >= 2) {
      hits += 1;
    }

    // 4. Difficulty calibration bonus (applied to ordering)
    const bandNum = getBandNumeric(item.bandLevel);
    let difficultyBonus = 0;
    if (difficultyTier === 'recovery') {
      difficultyBonus = bandNum <= 8.0 ? 2.5 : -1.0;
    } else if (difficultyTier === 'stretch') {
      difficultyBonus = bandNum >= 8.5 ? 2.8 : -0.5;
    } else {
      difficultyBonus = bandNum === 8.0 || bandNum === 8.5 ? 1.2 : 0.4;
    }

    return { vaultScore, hits, difficultyBonus, matchedToken };
  };

  // Evaluate the entire pool so high-frequency Mistake Vault words are pulled into today's sprint immediately
  const scoredFull = fullPool.map((item) => ({
    item,
    ...scoreItem(item)
  }));

  const vaultMatched = scoredFull
    .filter((entry) => entry.vaultScore >= 2.2)
    .sort((a, b) => b.vaultScore + b.difficultyBonus - (a.vaultScore + a.difficultyBonus));

  const maxVaultSlots = Math.min(Math.ceil(targetCount * 0.6), vaultMatched.length);
  const selected: DailySprintVocabItem[] = [];
  const selectedIds = new Set<string>();
  const prioritizedIds: string[] = [];

  for (let i = 0; i < maxVaultSlots; i++) {
    const entry = vaultMatched[i];
    selected.push(entry.item);
    selectedIds.add(entry.item.id);
    prioritizedIds.push(entry.item.id);
    priorityReasons[entry.item.id] = {
      score: Number(entry.vaultScore.toFixed(1)),
      frequencyHits: Math.max(1, entry.hits),
      tag: 'Vault Priority',
      reason: entry.matchedToken
        ? `Prioritized from Vault errors around "${entry.matchedToken}"`
        : 'Prioritized from high-frequency Mistake Vault errors'
    };
  }

  // Fill remaining slots from today's rotated slice (and fullPool fallback), sorted by difficulty calibration
  const remainingCandidates = [...baselineRotated, ...fullPool]
    .filter((item) => !selectedIds.has(item.id))
    .filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx);

  const calibratedRemainder = remainingCandidates
    .slice(0, Math.max(targetCount * 2, 24))
    .map((item, origIdx) => {
      const s = scoreItem(item);
      return { item, difficultyBonus: s.difficultyBonus, origIdx };
    })
    .sort((a, b) => b.difficultyBonus - a.difficultyBonus || a.origIdx - b.origIdx);

  for (const entry of calibratedRemainder) {
    if (selected.length >= targetCount) break;
    selected.push(entry.item);
    selectedIds.add(entry.item.id);
    if (difficultyTier !== 'balanced' && entry.difficultyBonus > 1.5 && Object.keys(priorityReasons).length < maxVaultSlots + 3) {
      priorityReasons[entry.item.id] = {
        score: Number(entry.difficultyBonus.toFixed(1)),
        frequencyHits: 0,
        tag: 'Difficulty Calibrated',
        reason:
          difficultyTier === 'stretch'
            ? `Elevated to ${entry.item.bandLevel} for Stretch velocity`
            : `Focused on ${entry.item.bandLevel} high-yield mastery`
      };
    }
  }

  return {
    items: selected.slice(0, targetCount),
    prioritizedIds,
    priorityReasons
  };
}

/**
 * Scores and reorders daily grammar rules based on past Mistake Vault frequency.
 */
export function prioritizeDailyGrammar(
  fullPool: DailySprintGrammarRule[],
  baselineRotated: DailySprintGrammarRule[],
  targetCount: number,
  difficultyTier: AdaptiveDifficultyTier,
  mistakesInput?: MistakeItem[],
  reviewSchedule?: DailySprintProgressState['reviewSchedule']
): {
  items: DailySprintGrammarRule[];
  prioritizedIds: string[];
  priorityReasons: Record<string, AdaptivePriorityTag>;
} {
  const profile = buildVaultFrequencyProfile(mistakesInput, reviewSchedule);
  const priorityReasons: Record<string, AdaptivePriorityTag> = {};

  const scoreRule = (rule: DailySprintGrammarRule): { vaultScore: number; hits: number; difficultyBonus: number; matchedCluster: string } => {
    const ruleText = `${rule.title} ${rule.englishExplanation} ${rule.commonMistake} ${rule.band8Correction}`.toLowerCase();
    let vaultScore = 0;
    let hits = 0;
    let matchedCluster = '';

    // 1. Grammar rule family match against Vault errors
    for (const group of GRAMMAR_SIGNAL_GROUPS) {
      const signalWeight = profile.grammarSignalWeights.get(group.id) || 0;
      if (signalWeight > 0 && group.patterns.some((p) => ruleText.includes(p))) {
        vaultScore += signalWeight * 4.5;
        hits += Math.max(1, Math.round(signalWeight / 2.2));
        if (!matchedCluster) matchedCluster = group.label;
      }
    }

    // 2. Direct token overlap with Vault titles/explanations/errors
    const ruleTokens = new Set(tokenizeNormalized(`${rule.title} ${rule.commonMistake}`));
    ruleTokens.forEach((tok) => {
      const tw = profile.tokenWeights.get(tok) || 0;
      if (tw > 0) {
        vaultScore += Math.min(8, tw * 1.4);
        hits += 1;
      }
    });

    // 3. Writing/Speaking Vault load boost for core Band 8+ rules
    if (profile.moduleWeights.writing >= 4 && ruleText.includes('cohesion')) {
      vaultScore += 2.0;
    }

    const bandNum = getBandNumeric(rule.bandImpact);
    let difficultyBonus = 0;
    if (difficultyTier === 'recovery') {
      difficultyBonus = bandNum <= 7.5 ? 2.5 : -0.6;
    } else if (difficultyTier === 'stretch') {
      difficultyBonus = bandNum >= 8.0 ? 2.5 : -0.4;
    } else {
      difficultyBonus = 0.8;
    }

    return { vaultScore, hits, difficultyBonus, matchedCluster };
  };

  const scoredFull = fullPool.map((rule) => ({
    rule,
    ...scoreRule(rule)
  }));

  const vaultMatched = scoredFull
    .filter((entry) => entry.vaultScore >= 2.0)
    .sort((a, b) => b.vaultScore + b.difficultyBonus - (a.vaultScore + a.difficultyBonus));

  const maxVaultSlots = Math.min(Math.max(2, Math.ceil(targetCount * 0.65)), vaultMatched.length);
  const selected: DailySprintGrammarRule[] = [];
  const selectedIds = new Set<string>();
  const prioritizedIds: string[] = [];

  for (let i = 0; i < maxVaultSlots; i++) {
    const entry = vaultMatched[i];
    selected.push(entry.rule);
    selectedIds.add(entry.rule.id);
    prioritizedIds.push(entry.rule.id);
    priorityReasons[entry.rule.id] = {
      score: Number(entry.vaultScore.toFixed(1)),
      frequencyHits: Math.max(1, entry.hits),
      tag: 'Vault Priority',
      reason: entry.matchedCluster
        ? `Prioritized · Recurring ${entry.matchedCluster} errors in Vault`
        : 'Prioritized · High-frequency Grammar target from Mistake Vault'
    };
  }

  const remainingCandidates = [...baselineRotated, ...fullPool]
    .filter((rule) => !selectedIds.has(rule.id))
    .filter((rule, idx, arr) => arr.findIndex((x) => x.id === rule.id) === idx);

  const calibratedRemainder = remainingCandidates
    .map((rule, origIdx) => ({
      rule,
      difficultyBonus: scoreRule(rule).difficultyBonus,
      origIdx
    }))
    .sort((a, b) => b.difficultyBonus - a.difficultyBonus || a.origIdx - b.origIdx);

  for (const entry of calibratedRemainder) {
    if (selected.length >= targetCount) break;
    selected.push(entry.rule);
    selectedIds.add(entry.rule.id);
  }

  return {
    items: selected.slice(0, targetCount),
    prioritizedIds,
    priorityReasons
  };
}

/**
 * Computes the Smart Sprint Intelligence report:
 * - Real Sprint Velocity Index (0-100) from today's Pomodoro + mastered items + 7-day Streak history
 * - Dynamic Remaining Target Difficulty ('recovery' | 'balanced' | 'stretch')
 * - 12-day Historical (7d) + Predictive (5d) Sprint Velocity Trend Series
 */
export function computeSmartSprintIntelligence(
  sprintState: DailySprintProgressState,
  options?: {
    user?: UserProfile | null;
    streakState?: StreakState;
    mistakes?: MistakeItem[];
    difficultyPreference?: DifficultyModePreference;
    now?: Date;
  }
): SmartSprintIntelligenceReport {
  const now = options?.now ?? new Date();
  const streak = options?.streakState ?? getStreakState();
  const pref = options?.difficultyPreference ?? loadDifficultyPreference();
  const vaultProfile = buildVaultFrequencyProfile(options?.mistakes, sprintState.reviewSchedule);
  const unresolvedVaultCount = vaultProfile.clusters.reduce((acc, c) => acc + c.unresolvedCount, 0);

  const dailyGoalMinutes = Math.max(15, options?.user?.progress?.dailyMinutes || 30);
  const totalTargetsToday = sprintState.quotaTier === 'standard' ? 86 : 44;
  const completedTargetsToday =
    sprintState.masteredVocabIds.length +
    sprintState.masteredIdiomIds.length +
    sprintState.masteredPhraseIds.length +
    sprintState.masteredSpellingIds.length +
    sprintState.masteredGrammarIds.length;
  const todayCompletionPct = Math.min(
    100,
    Math.round((completedTargetsToday / Math.max(1, totalTargetsToday)) * 100)
  );
  const remainingTargetsToday = Math.max(0, totalTargetsToday - completedTargetsToday);

  const todayLocalKey = localDateKey(now);
  const todayStreakMins = streak.minutesByDate[todayLocalKey] || 0;
  const focusMinutesToday = Math.max(sprintState.pomodoroFocusMinutesLogged, todayStreakMins);

  // Build 7-day actual historical velocity series (D-6 ... Today)
  const dayFormatter = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short' });

  const actualPoints: VelocityTrendPoint[] = [];
  const pastVelocityValues: number[] = [];

  for (let offset = -6; offset <= 0; offset++) {
    const d = new Date(now);
    d.setDate(now.getDate() + offset);
    const dk = localDateKey(d);
    const mins = offset === 0 ? focusMinutesToday : (streak.minutesByDate[dk] || 0);
    const xp = streak.xpByDate[dk] || 0;
    const missionsCount = (streak.completedMissionsByDate[dk] || []).length;

    // Velocity index (0-100): blends focus-minutes vs daily goal (50%), XP pace (25%), and sprint/mission output (25%)
    const minScore = Math.min(1, mins / dailyGoalMinutes) * 50;
    const xpScore = Math.min(1, xp / 75) * 25;
    const outputScore =
      offset === 0
        ? Math.min(1, completedTargetsToday / Math.max(12, totalTargetsToday * 0.5)) * 25
        : Math.min(1, missionsCount / 3) * 25;

    const velocity = Math.min(100, Math.round(minScore + xpScore + outputScore));
    if (offset < 0) pastVelocityValues.push(velocity);

    actualPoints.push({
      dateKey: dk,
      label: offset === 0 ? 'Today' : dayFormatter(d),
      isPrediction: false,
      actualVelocity: velocity,
      predictedVelocity: offset === 0 ? velocity : null,
      targetPace: 75,
      focusMinutes: mins,
      xpEarned: xp
    });
  }

  const todayVelocity = actualPoints[actualPoints.length - 1]?.actualVelocity ?? 0;
  const prevSixAvg =
    pastVelocityValues.length > 0
      ? pastVelocityValues.reduce((s, v) => s + v, 0) / pastVelocityValues.length
      : 0;

  // Blend today's momentum with recent 3-day pace so the velocity readout stays responsive but stable
  const recentThree = actualPoints.slice(-3).map((p) => p.actualVelocity ?? 0);
  const recentAvg = recentThree.reduce((s, v) => s + v, 0) / Math.max(1, recentThree.length);
  const velocityScore = Math.min(100, Math.round(todayVelocity * 0.65 + recentAvg * 0.35));

  const velocityDeltaPct =
    prevSixAvg > 0
      ? Math.round(((velocityScore - prevSixAvg) / Math.max(10, prevSixAvg)) * 100)
      : velocityScore > 0
      ? 100
      : 0;

  // Compute linear slope across recent 4 days for predictive trajectory
  const slopeWindow = actualPoints.slice(-4).map((p) => p.actualVelocity ?? 0);
  const slopeRaw =
    slopeWindow.length >= 2
      ? (slopeWindow[slopeWindow.length - 1] - slopeWindow[0]) / (slopeWindow.length - 1)
      : 0;
  const clampedSlope = Math.max(-6, Math.min(8, slopeRaw));
  const streakMomentumBoost = streak.currentStreak >= 3 ? 2.2 : streak.currentStreak >= 1 ? 1.1 : 0.4;

  // Build 5-day predictive trend points (+1d ... +5d)
  const predictivePoints: VelocityTrendPoint[] = [];
  let runningPrediction = Math.max(velocityScore, todayVelocity);
  for (let futureOffset = 1; futureOffset <= 5; futureOffset++) {
    const d = new Date(now);
    d.setDate(now.getDate() + futureOffset);
    const dk = localDateKey(d);
    const stepDelta = clampedSlope * 0.45 + streakMomentumBoost;
    runningPrediction = Math.max(
      18,
      Math.min(100, Math.round(runningPrediction + (stepDelta === 0 ? 1.5 : stepDelta)))
    );
    predictivePoints.push({
      dateKey: dk,
      label: `+${futureOffset}d`,
      isPrediction: true,
      actualVelocity: null,
      predictedVelocity: runningPrediction,
      targetPace: 75,
      focusMinutes: 0,
      xpEarned: 0
    });
  }

  const velocityTrendPoints = [...actualPoints, ...predictivePoints];
  const projectedSevenDayReadiness =
    predictivePoints[predictivePoints.length - 1]?.predictedVelocity ?? velocityScore;

  let velocityTrendLabel: SmartSprintIntelligenceReport['velocityTrendLabel'] = 'Steady';
  if (velocityScore >= 72 || velocityDeltaPct >= 15) {
    velocityTrendLabel = 'Accelerating';
  } else if (velocityScore >= 40) {
    velocityTrendLabel = 'Steady';
  } else if (velocityScore >= 15) {
    velocityTrendLabel = 'Building';
  } else {
    velocityTrendLabel = 'Needs Spark';
  }

  // Dynamically determine Recommended Remaining Target Difficulty
  const examScorePct =
    sprintState.lastExamSummary?.dateKey === getTodayDateKey()
      ? sprintState.lastExamSummary.scorePct
      : null;
  const currentHour = now.getHours();
  const isLateDayWithBacklog = currentHour >= 20 && todayCompletionPct < 35;

  let recommendedDifficulty: AdaptiveDifficultyTier = 'balanced';
  let difficultyRationale =
    'Steady pace detected — keeping balanced Band 8.0 targets with Mistake Vault items pinned to the top.';

  if (
    (examScorePct !== null && examScorePct >= 82) ||
    velocityScore >= 75 ||
    todayCompletionPct >= 65
  ) {
    recommendedDifficulty = 'stretch';
    difficultyRationale =
      examScorePct !== null && examScorePct >= 82
        ? `Strong ${examScorePct}% Mastery Exam accuracy — elevating remaining targets to Band 8.5–9.0 C1/C2 stretch items.`
        : `High Sprint Velocity (${velocityScore}/100) — upgrading remaining daily targets to Band 8.5–9.0 academic precision.`;
  } else if (
    (examScorePct !== null && examScorePct < 62) ||
    unresolvedVaultCount >= 6 ||
    isLateDayWithBacklog
  ) {
    recommendedDifficulty = 'recovery';
    difficultyRationale =
      unresolvedVaultCount >= 6
        ? `${unresolvedVaultCount} unresolved Vault mistakes queued — focusing remaining targets on high-yield Band 7.5–8.0 recovery drills.`
        : isLateDayWithBacklog
        ? 'Late-day sprint protection — tightening remaining workload to high-yield Band 7.5–8.0 targets to preserve your streak.'
        : `Mastery Exam dipped to ${examScorePct}% — calibrating remaining targets to foundational Band 7.5–8.0 rules before stretching.`;
  }

  const activeDifficulty: AdaptiveDifficultyTier =
    pref === 'auto' ? recommendedDifficulty : pref;

  const difficultyMeta: Record<
    AdaptiveDifficultyTier,
    { label: string; bandFocus: string; quota: SprintQuotaTier; remainingFactor: number }
  > = {
    recovery: {
      label: 'Recovery Focus',
      bandFocus: 'Band 7.5–8.0 Core',
      quota: 'light',
      remainingFactor: 0.65
    },
    balanced: {
      label: 'Balanced Mastery',
      bandFocus: 'Band 8.0 Standard',
      quota: 'standard',
      remainingFactor: 1.0
    },
    stretch: {
      label: 'Stretch Surge',
      bandFocus: 'Band 8.5–9.0 C1/C2',
      quota: 'standard',
      remainingFactor: 1.0
    }
  };

  const activeMeta = difficultyMeta[activeDifficulty];
  const adjustedRemainingTargets = Math.max(
    0,
    Math.min(
      remainingTargetsToday,
      Math.ceil(remainingTargetsToday * activeMeta.remainingFactor)
    )
  );

  const projectedWeeklyCompletions = Math.max(
    1,
    Math.min(7, Math.round((projectedSevenDayReadiness / 100) * 7))
  );

  return {
    velocityScore,
    velocityDeltaPct,
    velocityTrendLabel,
    recommendedDifficulty,
    activeDifficulty,
    difficultyPreference: pref,
    difficultyLabel: activeMeta.label,
    difficultyBandFocus: activeMeta.bandFocus,
    difficultyRationale,
    recommendedQuotaTier: activeMeta.quota,
    todayCompletionPct,
    remainingTargetsToday,
    adjustedRemainingTargets,
    totalTargetsToday,
    completedTargetsToday,
    focusMinutesToday,
    dailyGoalMinutes,
    unresolvedVaultCount,
    projectedSevenDayReadiness,
    projectedWeeklyCompletions,
    topErrorClusters: vaultProfile.clusters.slice(0, 5),
    velocityTrendPoints
  };
}
