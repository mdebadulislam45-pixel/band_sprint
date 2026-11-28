import type {
  BarnabyAnimationState,
  BarnabyExpression,
  BarnabyFelineBehavior,
  BarnabyMoodState,
} from '../types/barnaby';
import type { DailySprintProgressState } from './dailySprintProgressStore';

/** Exact 5-minute user inactivity threshold before Barnaby enters the 'encouraging' mood. */
export const BARNABY_INACTIVITY_ENCOURAGE_MS = 5 * 60 * 1000;

/** Duration Barnaby remains visible on screen without interaction before smoothly disappearing. */
export const BARNABY_AUTO_DISAPPEAR_MS = 25 * 1000;

/** Dwell time after an encouraging or celebratory appearance before smoothly fading out again. */
export const BARNABY_MOOD_APPEAR_DWELL_MS = 18 * 1000;

export type BarnabyBehaviorMood =
  | 'happy'
  | 'encouraging'
  | 'focused'
  | 'curious'
  | 'auto_hidden';

export interface BarnabyMoodMachineInput {
  /** True when today's daily goal (missions, sprint target, or mastery exam) is met or celebrating */
  dailyGoalMet: boolean;
  /** True during an active celebratory trigger (daily goal just completed, milestone, streak) */
  isCelebrating: boolean;
  /** Milliseconds since the last meaningful user input (pointer/key/scroll/navigation) */
  userInactiveMs: number;
  /** Milliseconds since Barnaby was last shown or directly interacted with */
  companionIdleMs: number;
  /** True while user is hovering, dragging, speaking with, or viewing Barnaby's drawer */
  isUserEngagedWithBarnaby: boolean;
  /** True when Barnaby is actively analyzing or the user is on a focused drill */
  isAnalyzingOrFocused: boolean;
  /** True when user manually docked/minimized Barnaby */
  isManuallyMinimized: boolean;
  /** True when user explicitly woke Barnaby or an encouraging nudge just triggered */
  encouragementWindowActive: boolean;
}

export interface BarnabyMoodResolution {
  mood: BarnabyBehaviorMood;
  /** Triggers joyful celebratory spinning animation */
  shouldSpin: boolean;
  /** Triggers warm rhythmic encouraging idle animation */
  shouldEncourageIdle: boolean;
  /** Whether the floating companion should be rendered on screen or softly disappeared */
  isVisible: boolean;
  expression: BarnabyExpression;
  moodState: BarnabyMoodState;
  animationState: BarnabyAnimationState;
  felineBehavior: BarnabyFelineBehavior;
  statusLabel: string;
}

export const BARNABY_ENCOURAGING_PROMPTS: readonly string[] = [
  '5 minutes quiet—ready for one quick 60-second Band 8 warm-up?',
  'Small steady sprints beat cramming. Want a 3-question recall check?',
  'Still here if you need a nudge—let’s clear one Mistake Vault card together.',
  'Short pause logged. Tap me whenever you want to resume your Band 8.0 path.',
];

export interface DailyGoalProgressEvaluation {
  isDailyGoalMet: boolean;
  completionPct: number;
  metSummary: string;
}

/**
 * Evaluates whether the candidate has met today's study goal across
 * daily missions, Daily Sprint quotas, Pomodoro focus blocks, or Mastery Exam.
 */
export function evaluateDailyGoalProgress(
  sprint: DailySprintProgressState,
  completedMissionsToday: number
): DailyGoalProgressEvaluation {
  const isStandard = sprint.quotaTier === 'standard';
  const vocabTarget = isStandard ? 20 : 10;
  const grammarTarget = isStandard ? 6 : 4;
  const phraseIdiomTarget = isStandard ? 20 : 10;
  const spellingTarget = isStandard ? 40 : 20;

  const vocabRatio = Math.min(1, sprint.masteredVocabIds.length / vocabTarget);
  const grammarRatio = Math.min(1, sprint.masteredGrammarIds.length / grammarTarget);
  const phraseRatio = Math.min(
    1,
    (sprint.masteredIdiomIds.length + sprint.masteredPhraseIds.length) / phraseIdiomTarget
  );
  const spellingRatio = Math.min(1, sprint.masteredSpellingIds.length / spellingTarget);
  const missionRatio = Math.min(1, completedMissionsToday / 3);

  const hasMasteryExamToday = Boolean(
    sprint.lastExamSummary && sprint.lastExamSummary.dateKey === sprint.dateKey
  );
  const sprintCompletionPct = Math.round(
    ((vocabRatio + grammarRatio + phraseRatio + spellingRatio) / 4) * 100
  );
  const completionPct = Math.max(
    sprintCompletionPct,
    Math.round(missionRatio * 100),
    hasMasteryExamToday ? 100 : 0
  );

  const isDailyGoalMet =
    completedMissionsToday >= 3 ||
    sprintCompletionPct >= 100 ||
    hasMasteryExamToday ||
    sprint.pomodoroBlocksCompleted >= 2;

  const metSummary = hasMasteryExamToday
    ? `Daily Mastery Exam completed (${sprint.lastExamSummary?.scorePct ?? 100}%)`
    : completedMissionsToday >= 3
    ? 'All 3 daily missions completed'
    : sprintCompletionPct >= 100
    ? 'Full Daily Sprint quota reached'
    : sprint.pomodoroBlocksCompleted >= 2
    ? `${sprint.pomodoroBlocksCompleted} Pomodoro sprint blocks completed`
    : `${completionPct}% of today’s goal complete`;

  return { isDailyGoalMet, completionPct, metSummary };
}

/**
 * Deterministic finite state machine for Barnaby's mood-based behavior & auto-disappear lifecycle:
 * 1. 'happy'       -> Active when a daily goal is met / celebrating (triggers celebratory spin).
 * 2. 'encouraging' -> Triggered once user has been inactive for >= 5 minutes (gentle encouraging idle sway).
 * 3. 'auto_hidden' -> After BARNABY_AUTO_DISAPPEAR_MS without companion interaction (and not celebrating
 *                     or in an active encouragement window), Barnaby gracefully disappears from view.
 * 4. 'focused'     -> Active during analysis or direct study engagement.
 * 5. 'curious'     -> Calm attentive default while visible.
 */
export function resolveBarnabyMoodMachine(
  input: BarnabyMoodMachineInput
): BarnabyMoodResolution {
  if (input.isManuallyMinimized) {
    return {
      mood: 'auto_hidden',
      shouldSpin: false,
      shouldEncourageIdle: false,
      isVisible: false,
      expression: 'relaxed',
      moodState: 'neutral',
      animationState: 'idle',
      felineBehavior: 'thinking',
      statusLabel: 'Docked',
    };
  }

  // 1. Happy celebratory state (daily goal met or active celebration burst)
  if (input.isCelebrating) {
    return {
      mood: 'happy',
      shouldSpin: true,
      shouldEncourageIdle: false,
      isVisible: true,
      expression: 'celebrating',
      moodState: 'celebratory',
      animationState: 'celebratory',
      felineBehavior: 'energetic',
      statusLabel: 'Goal Reached',
    };
  }

  // 2. Encouraging idle state when user has been inactive for > 5 minutes
  const isInactiveOverFiveMin = input.userInactiveMs >= BARNABY_INACTIVITY_ENCOURAGE_MS;
  if (isInactiveOverFiveMin && (input.encouragementWindowActive || input.isUserEngagedWithBarnaby)) {
    return {
      mood: 'encouraging',
      shouldSpin: false,
      shouldEncourageIdle: true,
      isVisible: true,
      expression: 'encouraging',
      moodState: 'encouraging',
      animationState: 'idle',
      felineBehavior: 'hovering',
      statusLabel: 'Encouraging',
    };
  }

  // 3. Auto-disappear after dwell period when not actively engaged
  if (!input.isUserEngagedWithBarnaby && input.companionIdleMs >= BARNABY_AUTO_DISAPPEAR_MS) {
    return {
      mood: 'auto_hidden',
      shouldSpin: false,
      shouldEncourageIdle: false,
      isVisible: false,
      expression: 'relaxed',
      moodState: 'neutral',
      animationState: 'idle',
      felineBehavior: 'thinking',
      statusLabel: 'Resting',
    };
  }

  // 4. Focused coaching state while analyzing or engaged
  if (input.isAnalyzingOrFocused) {
    return {
      mood: 'focused',
      shouldSpin: false,
      shouldEncourageIdle: false,
      isVisible: true,
      expression: 'analytical',
      moodState: 'focused',
      animationState: 'focused',
      felineBehavior: 'thinking',
      statusLabel: 'Focused',
    };
  }

  // 5. Daily goal already met (warm happy glow without continuous spin)
  if (input.dailyGoalMet) {
    return {
      mood: 'happy',
      shouldSpin: false,
      shouldEncourageIdle: false,
      isVisible: true,
      expression: 'happy',
      moodState: 'celebratory',
      animationState: 'energetic',
      felineBehavior: 'energetic',
      statusLabel: 'Happy',
    };
  }

  // 6. Default attentive curious state
  return {
    mood: 'curious',
    shouldSpin: false,
    shouldEncourageIdle: false,
    isVisible: true,
    expression: 'curious',
    moodState: 'curious',
    animationState: 'idle',
    felineBehavior: 'thinking',
    statusLabel: 'Attentive',
  };
}
