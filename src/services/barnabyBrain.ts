/**
 * Barnaby Brain — Emotional Intelligence, Situational Adaptation,
 * 5-Stage Anti-Grinding Progression System & Live Screen Context Registry.
 *
 * Personality & Guardrails:
 * - Eclipse Celestial Companion inside BandSprint: brilliant friend + patient tutor + curious explorer.
 * - Concise on dashboard cards (1–2 sentences); structured and thorough when teaching.
 * - Hard constraints: ZERO emojis, max ONE exclamation mark, zero generic chatbot filler,
 *   zero guilt or streak-shaming.
 */

import { getCurrentUser, getTopWeakness } from '../utils/userStorage';
import { loadDiagnosticResult } from './diagnosticResultStore';
import { getMistakes } from '../utils/vaultStorage';
import { aggregateExamHistory, validateOptionalHalfBand } from '../utils/historyAggregation';
import { enforceBarnabyCompanionConstraints } from './geminiService';
import type { BarnabyPoseState } from '../utils/getBarnabyState';

export type BarnabyProgressionStageNumber = 1 | 2 | 3 | 4 | 5;

export interface BarnabyMilestones {
  diagnosticCompleted: boolean;
  drillsCompleted: number;
  weaknessDrillsCompleted: number;
  verifiedBandJump: number;
  skillsMasteredCount: number;
  mockTestsCompleted: number;
  mistakesResolvedCount: number;
  tutorQuestionsAsked: number;
}

export interface BarnabyProgressionSnapshot {
  stage: BarnabyProgressionStageNumber;
  title: string;
  roleLabel: string;
  description: string;
  nextMilestoneHint: string;
  milestones: BarnabyMilestones;
}

export type BarnabySituation =
  | 'analyzing'
  | 'inactive_return'
  | 'overwhelmed_or_tired'
  | 'repeated_mistakes'
  | 'wrong_answer_attempt_1'
  | 'genuine_achievement'
  | 'baseline_needed'
  | 'targeted_weakness'
  | 'steady_study';

export type BarnabyScreenId = 'home' | 'learn' | 'progress' | 'practice';

export interface BarnabyActiveScreenContext {
  screen: BarnabyScreenId;
  screenTitle: string;
  route: string;
  topWeakness?: string | null;
  currentEstimate?: number | null;
  targetBand?: number;
  examMode?: 'Academic' | 'General Training';
  examDate?: string | null;
  daysRemaining?: number | null;
  passageSnippet?: string | null;
  essayDraft?: string | null;
  activeQuestion?: string | null;
  bandTrendSummary?: string | null;
  mistakeCount?: number;
  mistakeSummary?: string | null;
  skillBands?: {
    listening: number | null;
    reading: number | null;
    writing: number | null;
    speaking: number | null;
  };
}

export interface BarnabyBriefingInput {
  screen: BarnabyScreenId;
  userName?: string;
  currentEstimate: number | null;
  targetBand: number;
  examDate?: string | null;
  daysRemaining?: number | null;
  daysInactive?: number;
  allDailyTasksCompleted?: boolean;
  topWeakness?: string | null;
  isAnalyzing?: boolean;
  analyzingLabel?: string;
  consecutiveErrors?: number;
  isOverwhelmed?: boolean;
  mistakeCount?: number;
  bandDelta?: number | null;
  assessedSkillCount?: number;
  forcedPose?: BarnabyPoseState;
}

export interface BarnabyBriefingResult {
  pose: BarnabyPoseState;
  situation: BarnabySituation;
  focusLabel: string;
  headline: string;
  message: string;
  ctaLabel: string;
  ctaRoute: string;
  progression: BarnabyProgressionSnapshot;
}

const MILESTONE_STORAGE_KEY = 'bandsprint_barnaby_milestones_v1';
export const BARNABY_PROGRESSION_EVENT = 'bandsprint_barnaby_progression_updated';
export const BARNABY_CONTEXT_EVENT = 'bandsprint_barnaby_context_updated';

interface StoredLocalMilestones {
  drillsCompleted: number;
  weaknessDrillsCompleted: number;
  mistakesResolvedCount: number;
  tutorQuestionsAsked: number;
}

const DEFAULT_LOCAL_MILESTONES: StoredLocalMilestones = {
  drillsCompleted: 0,
  weaknessDrillsCompleted: 0,
  mistakesResolvedCount: 0,
  tutorQuestionsAsked: 0,
};

let activeScreenContext: BarnabyActiveScreenContext = {
  screen: 'home',
  screenTitle: 'Daily Command Center',
  route: '/',
};

function readLocalMilestones(): StoredLocalMilestones {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_LOCAL_MILESTONES };
  try {
    const raw = localStorage.getItem(MILESTONE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LOCAL_MILESTONES };
    const parsed = JSON.parse(raw) as Partial<StoredLocalMilestones>;
    return {
      drillsCompleted: Math.max(0, Number(parsed.drillsCompleted) || 0),
      weaknessDrillsCompleted: Math.max(0, Number(parsed.weaknessDrillsCompleted) || 0),
      mistakesResolvedCount: Math.max(0, Number(parsed.mistakesResolvedCount) || 0),
      tutorQuestionsAsked: Math.max(0, Number(parsed.tutorQuestionsAsked) || 0),
    };
  } catch {
    return { ...DEFAULT_LOCAL_MILESTONES };
  }
}

export function recordBarnabyMilestone(
  event: 'drill_completed' | 'weakness_drill_completed' | 'mistake_resolved' | 'tutor_question_asked'
): BarnabyProgressionSnapshot {
  const current = readLocalMilestones();
  if (event === 'drill_completed') current.drillsCompleted += 1;
  if (event === 'weakness_drill_completed') {
    current.drillsCompleted += 1;
    current.weaknessDrillsCompleted += 1;
  }
  if (event === 'mistake_resolved') current.mistakesResolvedCount += 1;
  if (event === 'tutor_question_asked') current.tutorQuestionsAsked += 1;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MILESTONE_STORAGE_KEY, JSON.stringify(current));
    }
  } catch {
    // ignore storage quota errors
  }

  const snapshot = getBarnabyProgressionSnapshot();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BARNABY_PROGRESSION_EVENT, { detail: snapshot }));
  }
  return snapshot;
}

/**
 * Computes Barnaby's 5-stage familiarity from genuine learning milestones
 * (diagnostic completion, targeted drills, weakness mastery, verified band jumps, full mocks)
 * — explicitly decoupled from calendar streak grinding.
 */
export function getBarnabyProgressionSnapshot(): BarnabyProgressionSnapshot {
  const user = getCurrentUser();
  const diagnostic = loadDiagnosticResult();
  const local = readLocalMilestones();
  const examHistory = user?.progress?.examHistory || [];
  const agg = aggregateExamHistory(examHistory);
  const targetBand = user?.progress?.targetBand || 7.5;

  const diagnosticOverall = validateOptionalHalfBand(diagnostic?.scores?.overall, 1.0);
  const diagnosticCompleted = diagnosticOverall !== null;

  const historyBands = examHistory
    .map((a) => validateOptionalHalfBand(a.overallBand, 1.0))
    .filter((b): b is number => b !== null);

  const baselineBand =
    diagnosticOverall ?? (historyBands.length > 0 ? historyBands[historyBands.length - 1] : null);
  const bestOverallBand =
    historyBands.length > 0
      ? Math.max(...historyBands)
      : diagnosticOverall;

  const verifiedBandJump =
    baselineBand !== null && bestOverallBand !== null
      ? Math.max(0, Number((bestOverallBand - baselineBand).toFixed(1)))
      : 0;

  const skillBands = [
    agg.skills.listening.latest ?? validateOptionalHalfBand(diagnostic?.scores?.listening, 0.0),
    agg.skills.reading.latest ?? validateOptionalHalfBand(diagnostic?.scores?.reading, 0.0),
    agg.skills.writing.latest ?? validateOptionalHalfBand(diagnostic?.scores?.writing, 1.0),
    agg.skills.speaking.latest ?? validateOptionalHalfBand(diagnostic?.scores?.speaking, 1.0),
  ].filter((v): v is number => v !== null);

  const skillsMasteredCount = skillBands.filter((b) => b >= targetBand).length;
  const mockTestsCompleted = agg.completedFullMockCount;
  const totalDrills = local.drillsCompleted + examHistory.length;

  const mistakes = getMistakes();
  const resolvedMistakes =
    local.mistakesResolvedCount + mistakes.filter((m) => m.mastered).length;

  const milestones: BarnabyMilestones = {
    diagnosticCompleted,
    drillsCompleted: totalDrills,
    weaknessDrillsCompleted: local.weaknessDrillsCompleted,
    verifiedBandJump,
    skillsMasteredCount,
    mockTestsCompleted,
    mistakesResolvedCount: resolvedMistakes,
    tutorQuestionsAsked: local.tutorQuestionsAsked,
  };

  // Stage 5: Independent Learner — 2+ full mocks and consistently at or within 0.5 of target band
  if (
    mockTestsCompleted >= 2 &&
    agg.overall.latest !== null &&
    agg.overall.latest >= Math.max(6.5, targetBand - 0.5)
  ) {
    return {
      stage: 5,
      title: 'Independent Learner',
      roleLabel: 'Peer Strategist',
      description:
        'You diagnose traps independently and hold steady under timed exam conditions. Barnaby steps back into a concise peer-strategist role.',
      nextMilestoneHint: 'Maintain exam rhythm with timed sittings before test day.',
      milestones,
    };
  }

  // Stage 4: Achievement Partner — measurable band jump (>= +0.5) or mastered 2+ skills at target
  if (verifiedBandJump >= 0.5 || skillsMasteredCount >= 2 || mockTestsCompleted >= 1) {
    return {
      stage: 4,
      title: 'Achievement Partner',
      roleLabel: 'Performance Analyst',
      description:
        'Measurable skill gains are showing up in your results. Barnaby focuses on turning fragile improvements into repeatable exam-day accuracy.',
      nextMilestoneHint: 'Complete two full timed mock tests near your target band to reach Stage 5.',
      milestones,
    };
  }

  // Stage 3: Trusted Companion — 3+ completed drills/attempts or active weakness resolution
  if (totalDrills >= 3 || local.weaknessDrillsCompleted >= 2 || resolvedMistakes >= 3) {
    return {
      stage: 3,
      title: 'Trusted Companion',
      roleLabel: 'Pattern Tracker',
      description:
        'Barnaby has enough evidence to spot recurring question traps and steer your sessions straight toward your highest-leverage weakness.',
      nextMilestoneHint: 'Earn a +0.5 band jump or complete a full timed mock to unlock Stage 4.',
      milestones,
    };
  }

  // Stage 2: Learning Partners — diagnostic done or first drill logged
  if (diagnosticCompleted || totalDrills >= 1 || local.tutorQuestionsAsked >= 1) {
    return {
      stage: 2,
      title: 'Learning Partners',
      roleLabel: 'Adaptive Guide',
      description:
        'Your baseline and study pace are mapped. Barnaby calibrates daily tasks directly to your target band without busywork.',
      nextMilestoneHint: 'Complete three targeted drills or resolve three Mistake Vault items for Stage 3.',
      milestones,
    };
  }

  // Stage 1: First Meeting
  return {
    stage: 1,
    title: 'First Meeting',
    roleLabel: 'Diagnostic Guide',
    description:
      'Welcome to BandSprint. Barnaby starts by mapping your honest four-skill baseline before recommending drills.',
    nextMilestoneHint: 'Finish the 10-minute Diagnostic or your first practice drill to reach Stage 2.',
    milestones,
  };
}

/**
 * Publishes active screen context so the "Ask Barnaby" slide-over drawer always opens
 * pre-loaded with the student's current passage, essay draft, band trends, or mistake history.
 */
export function publishBarnabyScreenContext(
  partial: Partial<BarnabyActiveScreenContext>
): BarnabyActiveScreenContext {
  activeScreenContext = {
    ...activeScreenContext,
    ...partial,
  };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(BARNABY_CONTEXT_EVENT, { detail: activeScreenContext })
    );
  }
  return activeScreenContext;
}

export function getBarnabyScreenContext(): BarnabyActiveScreenContext {
  const mistakes = getMistakes();
  const unmastered = mistakes.filter((m) => !m.mastered);
  const topMistakeSummary =
    unmastered.length > 0
      ? unmastered
          .slice(0, 3)
          .map((m) => `${m.questionType || m.module}: ${m.title || m.prompt || ''}`.trim())
          .filter(Boolean)
          .join(' | ')
      : null;

  return {
    ...activeScreenContext,
    topWeakness: activeScreenContext.topWeakness ?? getTopWeakness(),
    mistakeCount: activeScreenContext.mistakeCount ?? unmastered.length,
    mistakeSummary: activeScreenContext.mistakeSummary ?? topMistakeSummary,
  };
}

/**
 * Detects emotional or cognitive overload cues in student messages so Barnaby responds
 * with calm pacing, concrete single-step simplification, and zero guilt.
 */
export function detectEmotionalCueFromMessage(
  message: string
): 'overwhelmed_or_tired' | 'repeated_mistakes' | 'genuine_achievement' | 'neutral' {
  const lower = (message || '').toLowerCase();
  if (
    /\b(overwhelmed|tired|exhausted|burned out|burnt out|stressed|too much|cant focus|can't focus|give up|anxious|panic)\b/.test(
      lower
    )
  ) {
    return 'overwhelmed_or_tired';
  }
  if (
    /\b(keep missing|keep getting wrong|always fail|stuck|frustrated|confused|makes no sense|still wrong|again wrong|never get)\b/.test(
      lower
    )
  ) {
    return 'repeated_mistakes';
  }
  if (
    /\b(hit my target|reached band|got band 8|got band 7\.5|improved by|passed|nailed|finally got)\b/.test(
      lower
    )
  ) {
    return 'genuine_achievement';
  }
  return 'neutral';
}

export function resolveWeaknessPracticeRoute(topWeakness?: string | null): string {
  const lower = (topWeakness || '').toLowerCase();
  if (lower.includes('listen') || lower.includes('distractor') || lower.includes('map')) {
    return '/practice/listening';
  }
  if (
    lower.includes('read') ||
    lower.includes('true/false') ||
    lower.includes('tfng') ||
    lower.includes('heading') ||
    lower.includes('inference')
  ) {
    return '/practice/reading';
  }
  if (
    lower.includes('writ') ||
    lower.includes('task 1') ||
    lower.includes('task 2') ||
    lower.includes('coherence') ||
    lower.includes('cohesion') ||
    lower.includes('grammar') ||
    lower.includes('lexical') ||
    lower.includes('essay')
  ) {
    return '/practice/writing';
  }
  if (
    lower.includes('speak') ||
    lower.includes('fluency') ||
    lower.includes('pronunciation') ||
    lower.includes('cue card')
  ) {
    return '/practice/speaking';
  }
  return '/practice/reading';
}

export function resolveWeaknessLearnDeck(topWeakness?: string | null): {
  title: string;
  route: string;
  reason: string;
} {
  const lower = (topWeakness || '').toLowerCase();
  if (lower.includes('grammar') || lower.includes('gra') || lower.includes('clause')) {
    return {
      title: 'Grammar Lab',
      route: '/learn/grammar',
      reason: 'targets complex clause accuracy and error patterns pulling down Grammatical Range',
    };
  }
  if (lower.includes('lexical') || lower.includes('vocab') || lower.includes('lr')) {
    return {
      title: 'Academic Collocations',
      route: '/learn/collocations',
      reason: 'replaces repetitive phrasing with precise C1–C2 word pairings',
    };
  }
  if (lower.includes('coherence') || lower.includes('cohesion') || lower.includes('cc')) {
    return {
      title: 'Useful Phrases',
      route: '/learn/phrases',
      reason: 'tightens logical paragraph progression and natural contrastive linkers',
    };
  }
  if (
    lower.includes('task 1') ||
    lower.includes('task 2') ||
    lower.includes('writing') ||
    lower.includes('task response') ||
    lower.includes('task achievement')
  ) {
    return {
      title: 'Band 9 Model Answers',
      route: '/learn/model-answers',
      reason: 'shows how top scripts frame clear overviews and fully developed arguments',
    };
  }
  if (lower.includes('pronunciation') || lower.includes('fluency') || lower.includes('speaking')) {
    return {
      title: 'Shadowing & Pronunciation',
      route: '/learn/shadowing',
      reason: 'builds natural British cadence, stress control, and smoother spoken transitions',
    };
  }
  if (lower.includes('spell') || lower.includes('listen')) {
    return {
      title: 'Spelling & Dictation Lab',
      route: '/learn/spelling',
      reason: 'sharpens British dictation accuracy on high-frequency Listening traps',
    };
  }
  return {
    title: 'Vocabulary Deck',
    route: '/learn/vocabulary',
    reason: 'builds high-yield paraphrase recognition for Reading and Listening questions',
  };
}

/**
 * Generates Barnaby's emotionally intelligent, screen-specific briefing while strictly
 * respecting zero emojis, max one exclamation mark, zero generic praise, and zero guilt.
 */
export function buildBarnabyScreenBriefing(input: BarnabyBriefingInput): BarnabyBriefingResult {
  const progression = getBarnabyProgressionSnapshot();
  const firstName = (input.userName || 'Candidate').trim().split(/\s+/)[0] || 'Candidate';
  const targetStr = Number.isFinite(input.targetBand) ? input.targetBand.toFixed(1) : '7.5';
  const cleanWeakness = input.topWeakness?.trim() || getTopWeakness();
  const daysInactive = input.daysInactive ?? 0;

  const finalize = (result: Omit<BarnabyBriefingResult, 'progression'>): BarnabyBriefingResult => ({
    ...result,
    pose: input.forcedPose ?? result.pose,
    headline: enforceBarnabyCompanionConstraints(result.headline),
    message: enforceBarnabyCompanionConstraints(result.message),
    progression,
  });

  // 1. Live grading always takes top priority
  if (input.isAnalyzing) {
    return finalize({
      pose: 'analyzing',
      situation: 'analyzing',
      focusLabel: 'Grading in progress',
      headline: 'Reviewing against IELTS descriptors',
      message:
        input.analyzingLabel ||
        'Checking your response across Task Response, Coherence, Lexical Resource, and Grammar without score inflation.',
      ctaLabel: 'Open Progress Log',
      ctaRoute: '/progress',
    });
  }

  // 2. Learn screen strategist (studying pose)
  if (input.screen === 'learn') {
    const deck = resolveWeaknessLearnDeck(cleanWeakness);
    if (cleanWeakness) {
      return finalize({
        pose: 'studying',
        situation: 'targeted_weakness',
        focusLabel: `Recommended · ${deck.title}`,
        headline: `Target ${cleanWeakness} first`,
        message: `Open ${deck.title} next—it ${deck.reason}. Ten focused minutes here will carry directly into your next timed drill.`,
        ctaLabel: `Open ${deck.title}`,
        ctaRoute: deck.route,
      });
    }
    return finalize({
      pose: 'studying',
      situation: 'steady_study',
      focusLabel: 'Library guide',
      headline: `Build Band ${targetStr} foundations`,
      message:
        'Start with the 10-minute diagnostic to identify your exact weak spot, or sharpen paraphrase accuracy in the Vocabulary Deck.',
      ctaLabel: input.currentEstimate === null ? 'Take 10-Min Diagnostic' : `Open ${deck.title}`,
      ctaRoute: input.currentEstimate === null ? '/learn/diagnostic' : deck.route,
    });
  }

  // 3. Progress screen analyst (analyzing pose)
  if (input.screen === 'progress') {
    if (input.currentEstimate === null) {
      return finalize({
        pose: 'analyzing',
        situation: 'baseline_needed',
        focusLabel: 'Baseline needed',
        headline: 'No verified band trend yet',
        message: `Complete the 10-minute diagnostic or a full mock sitting so we can measure your true gap to Band ${targetStr} honestly.`,
        ctaLabel: 'Start 10-Min Diagnostic',
        ctaRoute: '/learn/diagnostic',
      });
    }

    const gap = Math.max(0, Number((input.targetBand - input.currentEstimate).toFixed(1)));
    const trendNote =
      typeof input.bandDelta === 'number' && input.bandDelta > 0
        ? `Your latest sitting rose by +${input.bandDelta.toFixed(1)} band.`
        : typeof input.bandDelta === 'number' && input.bandDelta < 0
        ? `Your latest sitting dipped by ${Math.abs(input.bandDelta).toFixed(1)} band—a normal signal to inspect specific errors rather than rush.`
        : `Your current standing sits at Band ${input.currentEstimate.toFixed(1)}.`;

    if (gap === 0) {
      return finalize({
        pose: 'analyzing',
        situation: 'genuine_achievement',
        focusLabel: `Target ${targetStr} reached`,
        headline: `Holding Band ${input.currentEstimate.toFixed(1)} at target`,
        message: `${trendNote} Keep this level reliable under full exam timing${cleanWeakness ? ` while tightening ${cleanWeakness}` : ''}.`,
        ctaLabel: 'Run Full Mock Test',
        ctaRoute: '/practice/mock-tests',
      });
    }

    return finalize({
      pose: 'analyzing',
      situation: 'targeted_weakness',
      focusLabel: `${gap.toFixed(1)} band to target`,
      headline: cleanWeakness
        ? `${cleanWeakness} is your biggest lever`
        : `Closing the ${gap.toFixed(1)}-band gap to ${targetStr}`,
      message: `${trendNote} ${
        cleanWeakness
          ? `Lifting ${cleanWeakness} will move your overall average faster than repeating strong sections.`
          : 'Inspect your Mistake Vault to clear repeating error patterns before your next timed sitting.'
      }`,
      ctaLabel: cleanWeakness ? `Drill ${cleanWeakness}` : 'Open Mistake Vault',
      ctaRoute: cleanWeakness ? resolveWeaknessPracticeRoute(cleanWeakness) : '/progress/saved',
    });
  }

  // 4. Home screen emotional intelligence & situational routing
  if (input.isOverwhelmed) {
    return finalize({
      pose: 'encouraging',
      situation: 'overwhelmed_or_tired',
      focusLabel: 'Light 5-min reset',
      headline: 'Keep today light and manageable',
      message:
        'When your energy is low, forcing a long mock hurts retention. Pick one calm 5-minute drill or take a clean break and return fresh.',
      ctaLabel: 'Open Vocabulary Deck',
      ctaRoute: '/learn/vocabulary',
    });
  }

  if ((input.consecutiveErrors ?? 0) >= 2) {
    return finalize({
      pose: 'encouraging',
      situation: 'repeated_mistakes',
      focusLabel: 'Step-by-step reset',
      headline: 'Slow down to one concrete clue',
      message: cleanWeakness
        ? `Repeated misses on ${cleanWeakness} usually point to one specific distractor habit. Let us isolate a single short drill and break down the rule.`
        : 'Repeated misses usually come from rushing past a single qualifier word. Slow down to one short untimed passage and trace each clue.',
      ctaLabel: cleanWeakness ? `Short ${cleanWeakness} Drill` : 'Open Mistake Vault',
      ctaRoute: cleanWeakness ? resolveWeaknessPracticeRoute(cleanWeakness) : '/progress/saved',
    });
  }

  // Inactive 3+ days: zero guilt, exact warm welcome-back
  if (daysInactive >= 3) {
    return finalize({
      pose: 'greeting',
      situation: 'inactive_return',
      focusLabel: 'Welcome back',
      headline: `Hey, ${firstName}—good to see you`,
      message:
        "Hey, you're back. We don't need to make up for lost time—let's start with one 5-minute win.",
      ctaLabel: cleanWeakness ? `5-Min ${cleanWeakness} Warm-Up` : 'Start 5-Min Practice',
      ctaRoute: cleanWeakness ? resolveWeaknessPracticeRoute(cleanWeakness) : '/practice',
    });
  }

  // Unassessed baseline (Stage 1 First Meeting)
  if (input.currentEstimate === null) {
    return finalize({
      pose: 'greeting',
      situation: 'baseline_needed',
      focusLabel: 'Stage 1 · Baseline',
      headline: `I'm Barnaby, your IELTS companion`,
      message: `Your four-skill band is not assessed yet. Run the 10-minute diagnostic so we can chart your clearest path to Band ${targetStr}${
        typeof input.daysRemaining === 'number' && input.daysRemaining > 0
          ? ` over the next ${input.daysRemaining} days`
          : ''
      }.`,
      ctaLabel: 'Start 10-Min Diagnostic',
      ctaRoute: '/learn/diagnostic',
    });
  }

  // Genuine achievement (all daily tasks done OR target band reached)
  if (input.allDailyTasksCompleted || input.currentEstimate >= input.targetBand) {
    if (input.currentEstimate >= input.targetBand) {
      return finalize({
        pose: 'celebrating',
        situation: 'genuine_achievement',
        focusLabel: 'Target band reached',
        headline: `Band ${input.currentEstimate.toFixed(1)} meets your ${targetStr} goal!`,
        message:
          'You earned this mark through real practice evidence. Verify it holds under full timed conditions in a complete sitting.',
        ctaLabel: 'Take a Full Mock Test',
        ctaRoute: '/practice/mock-tests',
      });
    }
    return finalize({
      pose: 'celebrating',
      situation: 'genuine_achievement',
      focusLabel: 'Daily sprint complete',
      headline: 'Today’s study plan is complete!',
      message:
        'You finished every planned task for today. Review one Mistake Vault card if you have energy, or close out cleanly.',
      ctaLabel: 'Review Mistake Vault',
      ctaRoute: '/progress/saved',
    });
  }

  // Below target or logged topWeakness -> Encouraging strategist
  const gap = Math.max(0, Number((input.targetBand - input.currentEstimate).toFixed(1)));
  const countdownClause =
    typeof input.daysRemaining === 'number' && input.daysRemaining > 0
      ? ` with ${input.daysRemaining} days until exam day`
      : '';

  if (cleanWeakness) {
    const stagePrefix =
      progression.stage >= 3
        ? `Your recurring pattern in ${cleanWeakness} is the fastest lever left`
        : `Focusing on ${cleanWeakness} is the fastest way to lift your score`;
    return finalize({
      pose: 'encouraging',
      situation: 'targeted_weakness',
      focusLabel: `Focus · ${cleanWeakness}`,
      headline:
        gap > 0
          ? `${gap.toFixed(1)} band to close before Band ${targetStr}`
          : `Sharpen ${cleanWeakness}`,
      message: `${stagePrefix}${countdownClause}. Run one focused drill now and inspect the exact trap before moving on.`,
      ctaLabel: `Drill ${cleanWeakness}`,
      ctaRoute: resolveWeaknessPracticeRoute(cleanWeakness),
    });
  }

  // Default studying state
  return finalize({
    pose: 'studying',
    situation: 'steady_study',
    focusLabel: `Stage ${progression.stage} · ${progression.title}`,
    headline: `Steady pace toward Band ${targetStr}`,
    message: `Stay consistent with one time-boxed skill block${countdownClause} to lock in accuracy across all four papers.`,
    ctaLabel: 'Open Practice Hub',
    ctaRoute: '/practice',
  });
}
