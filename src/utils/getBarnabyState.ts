/**
 * Deterministic state router for BandSprint's canonical AI learning companion, Barnaby.
 *
 * Priority order (strict):
 * 1. `analyzing`   — Gemini is actively grading Writing, Speaking, or Diagnostic.
 * 2. `greeting`    — Current estimate is null ("Not assessed") OR daysInactive >= 3.
 * 3. `celebrating` — All daily tasks completed OR currentEstimate >= targetBand.
 * 4. `encouraging` — currentEstimate < targetBand OR a logged topWeakness exists.
 * 5. `studying`    — Default active state during regular practice.
 */

export type BarnabyPoseState =
  | 'analyzing'
  | 'greeting'
  | 'celebrating'
  | 'encouraging'
  | 'studying';

export interface GetBarnabyStateInput {
  /** True while Gemini is grading a Writing essay, Speaking recording, or Diagnostic test. */
  isAnalyzing?: boolean;
  /** Verified or diagnostic overall band estimate, or null when not assessed yet. */
  currentEstimate: number | null;
  /** Candidate's target IELTS band (e.g. 7.0, 7.5, 8.0), or null if unset. */
  targetBand?: number | null;
  /** Whole calendar days since the candidate's last recorded study activity. */
  daysInactive?: number;
  /** True when every task in Today's Study Tasks has been checked off. */
  allDailyTasksCompleted?: boolean;
  /** Highest-priority weakness label (e.g. "True/False/Not Given", "Task 2 Coherence"), or null. */
  topWeakness?: string | null;
}

export interface BarnabyAssetMap {
  greeting: string;
  analyzing: string;
  encouraging: string;
  studying: string;
  celebrating: string;
}

export const BARNABY_POSE_ASSETS: BarnabyAssetMap = {
  greeting: '/assets/barnaby/greeting.png',
  analyzing: '/assets/barnaby/analyzing.png',
  encouraging: '/assets/barnaby/encouraging.png',
  studying: '/assets/barnaby/studying.png',
  celebrating: '/assets/barnaby/celebrating.png',
};

export const BARNABY_ANALYZING_EVENT = 'bandsprint_barnaby_analyzing';

export interface BarnabyAnalyzingDetail {
  isAnalyzing: boolean;
  label?: string;
}

/**
 * Broadcasts when Gemini begins or finishes grading Writing, Speaking, or Diagnostic work
 * so <BarnabyCompanion /> transitions deterministically to `analyzing` and back.
 */
export function setBarnabyAnalyzing(isAnalyzing: boolean, label?: string): void {
  if (typeof window === 'undefined') return;
  const win = window as unknown as Record<string, unknown>;
  win.__BANDSPRINT_BARNABY_ANALYZING__ = isAnalyzing;
  win.__BANDSPRINT_BARNABY_ANALYZING_LABEL__ = isAnalyzing ? label || '' : '';
  window.dispatchEvent(
    new CustomEvent<BarnabyAnalyzingDetail>(BARNABY_ANALYZING_EVENT, {
      detail: { isAnalyzing, label },
    })
  );
}

export function getGlobalBarnabyAnalyzing(): BarnabyAnalyzingDetail {
  if (typeof window === 'undefined') return { isAnalyzing: false };
  const win = window as unknown as Record<string, unknown>;
  return {
    isAnalyzing: Boolean(win.__BANDSPRINT_BARNABY_ANALYZING__),
    label: typeof win.__BANDSPRINT_BARNABY_ANALYZING_LABEL__ === 'string'
      ? win.__BANDSPRINT_BARNABY_ANALYZING_LABEL__
      : undefined,
  };
}

/**
 * Computes whole calendar days since the user's most recent study date or exam attempt.
 * Returns 0 if no prior activity exists yet (brand-new users are handled via currentEstimate === null).
 */
export function computeDaysInactive(
  lastActiveDate: string | null | undefined,
  latestActivityTimestamp?: number | null
): number {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  let latestMs: number | null = null;

  if (typeof lastActiveDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lastActiveDate)) {
    const [y, m, d] = lastActiveDate.split('-').map(Number);
    const parsed = new Date(y, m - 1, d).getTime();
    if (Number.isFinite(parsed)) {
      latestMs = parsed;
    }
  }

  if (typeof latestActivityTimestamp === 'number' && Number.isFinite(latestActivityTimestamp)) {
    const dt = new Date(latestActivityTimestamp);
    const tsMidnight = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
    if (latestMs === null || tsMidnight > latestMs) {
      latestMs = tsMidnight;
    }
  }

  if (latestMs === null) return 0;
  const diffDays = Math.floor((todayMidnight - latestMs) / 86_400_000);
  return Math.max(0, diffDays);
}

/**
 * Deterministic Barnaby state router.
 */
export function getBarnabyState(input: GetBarnabyStateInput): BarnabyPoseState {
  const {
    isAnalyzing = false,
    currentEstimate,
    targetBand = null,
    daysInactive = 0,
    allDailyTasksCompleted = false,
    topWeakness = null,
  } = input;

  // 1. Analyzing takes top priority whenever Gemini is grading
  if (isAnalyzing) {
    return 'analyzing';
  }

  // 2. Greeting when not yet assessed OR returning after 3+ inactive days
  if (currentEstimate === null || daysInactive >= 3) {
    return 'greeting';
  }

  const hasTargetBand =
    typeof targetBand === 'number' && Number.isFinite(targetBand) && targetBand > 0;

  // 3. Celebrating when all daily tasks are done OR target band is reached/exceeded
  if (allDailyTasksCompleted || (hasTargetBand && currentEstimate >= targetBand)) {
    return 'celebrating';
  }

  // 4. Encouraging when below targetBand OR a specific topWeakness is logged
  const hasWeakness = typeof topWeakness === 'string' && topWeakness.trim().length > 0;
  if ((hasTargetBand && currentEstimate < targetBand) || hasWeakness) {
    return 'encouraging';
  }

  // 5. Default active practice state
  return 'studying';
}

export interface BarnabyGuidanceCopy {
  focusLabel: string;
  headline: string;
  message: string;
  ctaLabel: string;
  ctaRoute: string;
}

function resolveWeaknessRoute(topWeakness?: string | null): string {
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

/**
 * Generates analytical, honest, calm, warm, strategic copy for each deterministic state.
 * Strictly obeys: zero emojis, at most one exclamation mark, zero generic filler, zero guilt.
 */
export function getBarnabyGuidanceCopy(
  state: BarnabyPoseState,
  input: GetBarnabyStateInput & {
    userName?: string;
    analyzingLabel?: string;
    completedTasksCount?: number;
    totalTasksCount?: number;
  }
): BarnabyGuidanceCopy {
  const firstName = (input.userName || 'Candidate').trim().split(/\s+/)[0] || 'Candidate';
  const targetNum =
    typeof input.targetBand === 'number' && Number.isFinite(input.targetBand) && input.targetBand > 0
      ? input.targetBand
      : null;
  const targetStr = targetNum !== null ? targetNum.toFixed(1) : '7.5';
  const cleanWeakness = input.topWeakness?.trim() || null;

  if (state === 'analyzing') {
    return {
      focusLabel: 'Grading in progress',
      headline: 'Reviewing against IELTS criteria',
      message:
        input.analyzingLabel ||
        'Checking your response against official Band Descriptors for accuracy, coherence, and lexical range.',
      ctaLabel: 'Open Progress Log',
      ctaRoute: '/progress',
    };
  }

  if (state === 'greeting') {
    if (input.currentEstimate === null) {
      return {
        focusLabel: 'Baseline needed',
        headline: `Welcome, ${firstName}`,
        message: `Your four-skill band estimate is not assessed yet. Run the 10-minute diagnostic so we can pinpoint your highest-leverage path to Band ${targetStr}.`,
        ctaLabel: 'Start 10-Min Diagnostic',
        ctaRoute: '/learn/diagnostic',
      };
    }

    return {
      focusLabel: 'Welcome back',
      headline: `Good to see you, ${firstName}`,
      message: `Take a calm five-minute warm-up to get your timing back on track for Band ${targetStr}. Steady sessions matter far more than an unbroken calendar.`,
      ctaLabel: cleanWeakness ? `Warm Up: ${cleanWeakness}` : 'Open Practice Hub',
      ctaRoute: cleanWeakness ? resolveWeaknessRoute(cleanWeakness) : '/practice',
    };
  }

  if (state === 'celebrating') {
    if (input.currentEstimate !== null && targetNum !== null && input.currentEstimate >= targetNum) {
      return {
        focusLabel: 'Target reached',
        headline: `Band ${input.currentEstimate.toFixed(1)} hit your ${targetStr} goal!`,
        message:
          'Your recent performance meets your target band. Lock in this consistency under timed conditions with a full sitting.',
        ctaLabel: 'Take a Full Mock Test',
        ctaRoute: '/practice/mock-tests',
      };
    }

    return {
      focusLabel: 'Daily sprint complete',
      headline: 'All daily study tasks finished!',
      message:
        'You completed today’s planned drills and logged your minutes and XP. Review any pending items in the Mistake Vault or try a timed sitting.',
      ctaLabel: 'Open Full Mock Tests',
      ctaRoute: '/practice/mock-tests',
    };
  }

  if (state === 'encouraging') {
    const gap =
      input.currentEstimate !== null && targetNum !== null
        ? Math.max(0, Number((targetNum - input.currentEstimate).toFixed(1)))
        : null;

    if (cleanWeakness) {
      return {
        focusLabel: `Focus: ${cleanWeakness}`,
        headline:
          gap !== null && gap > 0
            ? `${gap.toFixed(1)} band to close before Band ${targetStr}`
            : `Targeted drill: ${cleanWeakness}`,
        message: `Focusing on ${cleanWeakness} is the fastest way to lift your score right now. Run one focused drill and inspect the exact distractor pattern.`,
        ctaLabel: `Practise ${cleanWeakness}`,
        ctaRoute: resolveWeaknessRoute(cleanWeakness),
      };
    }

    return {
      focusLabel: `Target Band ${targetStr}`,
      headline:
        gap !== null && gap > 0
          ? `Steady climb from ${input.currentEstimate?.toFixed(1)} to ${targetStr}`
          : 'Targeted skill refinement',
      message:
        'Isolating recurring error patterns moves your band faster than repeating untimed passages. Pick one focused skill block next.',
      ctaLabel: 'Open Targeted Practice',
      ctaRoute: '/practice',
    };
  }

  // Default: studying
  return {
    focusLabel: 'Active study session',
    headline: 'Keep a steady exam rhythm',
    message: `Work through today’s time-boxed tasks at test pace to build accuracy toward Band ${targetStr}.`,
    ctaLabel: 'Continue Study Plan',
    ctaRoute: '/learn/study-plan',
  };
}
