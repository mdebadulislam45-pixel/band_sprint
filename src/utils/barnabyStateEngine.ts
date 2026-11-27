import type {
  BarnabyAuraTone,
  BarnabyCanonicalPose,
  BarnabyExpression,
  BarnabyExpressionConfig,
  BarnabyMode,
  BarnabyVisibilitySetting,
} from '../types/barnaby';
import type { BarnabyPoseState } from './getBarnabyState';

export const BARNABY_VISIBILITY_STORAGE_KEY = 'bandsprint_barnaby_visibility_v1';
export const BARNABY_VISIBILITY_EVENT = 'bandsprint_barnaby_visibility_updated';
export const BARNABY_CELEBRATION_EVENT = 'bandsprint_barnaby_celebration_triggered';
export const BARNABY_CELEBRATION_DURATION_MS = 4000;

const AURA_STYLES: Record<
  BarnabyAuraTone,
  { hex: string; ringClasses: string; pillClasses: string }
> = {
  emerald: {
    hex: '#134E41',
    ringClasses: 'ring-2 ring-[#134E41]/30 border-[#134E41]/25',
    pillClasses:
      'bg-[#134E41]/10 text-[#134E41] dark:bg-[#1F8A70]/20 dark:text-[#6EE7B7]',
  },
  gold: {
    hex: '#F59E0B',
    ringClasses: 'ring-2 ring-[#F59E0B]/40 border-[#F59E0B]/35',
    pillClasses:
      'bg-[#F59E0B]/15 text-[#B45309] dark:bg-[#F59E0B]/20 dark:text-[#FBBF24]',
  },
  lavender: {
    hex: '#A78BFA',
    ringClasses: 'ring-2 ring-[#A78BFA]/40 border-[#A78BFA]/35',
    pillClasses:
      'bg-[#A78BFA]/15 text-[#5B21B6] dark:bg-[#A78BFA]/20 dark:text-[#DDD6FE]',
  },
};

function makeExpr(
  expression: BarnabyExpression,
  pose: BarnabyCanonicalPose,
  statusLabel: string,
  auraTone: BarnabyAuraTone,
  hoverDurationSec: number
): BarnabyExpressionConfig {
  const aura = AURA_STYLES[auraTone];
  return {
    expression,
    pose,
    spritePath: `/assets/barnaby/${pose}.png`,
    statusLabel,
    auraTone,
    auraHex: aura.hex,
    ringClasses: aura.ringClasses,
    pillClasses: aura.pillClasses,
    hoverDurationSec,
  };
}

/**
 * Deterministic 20-expression registry mapping every emotional state to:
 * - One of the 5 canonical Barnaby sprites
 * - Distinct plain-text status label (zero emojis)
 * - Subtle aura ring (#134E41 emerald / #F59E0B gold / #A78BFA celestial lavender)
 * - Weightless floating physics speed
 */
export const BARNABY_EXPRESSION_MAP: Record<BarnabyExpression, BarnabyExpressionConfig> = {
  neutral: makeExpr('neutral', 'studying', 'Ready', 'emerald', 4.2),
  happy: makeExpr('happy', 'greeting', 'Pleased', 'gold', 3.9),
  curious: makeExpr('curious', 'analyzing', 'Curious', 'lavender', 4.0),
  thinking: makeExpr('thinking', 'analyzing', 'Thinking', 'lavender', 4.6),
  analytical: makeExpr('analytical', 'analyzing', 'Analyzing', 'emerald', 4.5),
  focused: makeExpr('focused', 'studying', 'Focused', 'emerald', 5.0),
  encouraging: makeExpr('encouraging', 'encouraging', 'Encouraging', 'emerald', 4.2),
  proud: makeExpr('proud', 'celebrating', 'Proud', 'gold', 3.6),
  excited: makeExpr('excited', 'celebrating', 'Excited', 'gold', 3.2),
  celebrating: makeExpr('celebrating', 'celebrating', 'Milestone', 'gold', 3.1),
  confused: makeExpr('confused', 'analyzing', 'Checking', 'lavender', 4.5),
  surprised: makeExpr('surprised', 'greeting', 'Noticed', 'gold', 3.5),
  sleepy: makeExpr('sleepy', 'encouraging', 'Calm Pace', 'lavender', 5.6),
  relaxed: makeExpr('relaxed', 'studying', 'Steady', 'emerald', 5.2),
  empathetic: makeExpr('empathetic', 'encouraging', 'With You', 'lavender', 4.8),
  determined: makeExpr('determined', 'studying', 'Targeted', 'emerald', 3.8),
  playful: makeExpr('playful', 'greeting', 'Light Sprint', 'gold', 3.4),
  shy: makeExpr('shy', 'greeting', 'Quiet Support', 'lavender', 4.8),
  listening: makeExpr('listening', 'analyzing', 'Listening', 'emerald', 4.4),
  welcoming: makeExpr('welcoming', 'greeting', 'Welcome Back', 'gold', 4.1),
};

export function getBarnabyExpressionConfig(
  expression: BarnabyExpression
): BarnabyExpressionConfig {
  return BARNABY_EXPRESSION_MAP[expression] || BARNABY_EXPRESSION_MAP.neutral;
}

export function poseToDefaultExpression(pose: BarnabyPoseState): BarnabyExpression {
  switch (pose) {
    case 'analyzing':
      return 'analytical';
    case 'greeting':
      return 'welcoming';
    case 'celebrating':
      return 'celebrating';
    case 'encouraging':
      return 'encouraging';
    case 'studying':
    default:
      return 'focused';
  }
}

export interface ResolveBarnabyExpressionInput {
  mode: BarnabyMode;
  pose?: BarnabyPoseState;
  isAnalyzing?: boolean;
  isDrawerOpen?: boolean;
  isTutorHint?: boolean;
  currentEstimate: number | null;
  targetBand: number;
  daysInactive?: number;
  allDailyTasksCompleted?: boolean;
  topWeakness?: string | null;
  bandDelta?: number | null;
  emotionalCue?:
    | 'overwhelmed_or_tired'
    | 'repeated_mistakes'
    | 'genuine_achievement'
    | 'neutral';
}

export function resolveBarnabyExpression(
  input: ResolveBarnabyExpressionInput
): BarnabyExpression {
  if (input.mode === 'celebration') return 'celebrating';
  if (input.isAnalyzing) return 'analytical';
  if (input.emotionalCue === 'overwhelmed_or_tired') return 'sleepy';
  if (input.emotionalCue === 'repeated_mistakes') return 'empathetic';
  if (input.emotionalCue === 'genuine_achievement') return 'proud';
  if (input.isTutorHint) return 'curious';
  if (input.isDrawerOpen) return 'listening';

  if (input.pose) {
    if (input.pose === 'analyzing' && typeof input.bandDelta === 'number') {
      if (input.bandDelta >= 0.5) return 'proud';
      if (input.bandDelta < 0) return 'analytical';
      return 'thinking';
    }
    if (input.pose === 'studying' && input.topWeakness) {
      return 'determined';
    }
    return poseToDefaultExpression(input.pose);
  }

  if (input.currentEstimate === null) return 'welcoming';
  if ((input.daysInactive ?? 0) >= 3) return 'welcoming';
  if (input.allDailyTasksCompleted || input.currentEstimate >= input.targetBand) {
    return 'celebrating';
  }
  if (input.topWeakness) return 'determined';
  if (input.currentEstimate < input.targetBand) return 'encouraging';
  return 'focused';
}

export function resolveBarnabyMode(params: {
  isActiveExam?: boolean;
  globalExamActive?: boolean;
  currentPath?: string;
  isCelebrating?: boolean;
  isTutorHint?: boolean;
  isDrawerOpen?: boolean;
  timedPaths?: ReadonlySet<string>;
}): BarnabyMode {
  const normalized = (params.currentPath || '/').replace(/\/+$/, '') || '/';
  if (
    params.isActiveExam ||
    params.globalExamActive ||
    params.timedPaths?.has(normalized)
  ) {
    return 'focus';
  }
  if (params.isCelebrating) return 'celebration';
  if (params.isTutorHint) return 'tutor';
  if (params.isDrawerOpen) return 'companion';
  return 'ambient';
}

export function getBarnabyVisibility(): BarnabyVisibilitySetting {
  if (typeof localStorage === 'undefined') return 'ambient_and_tutor';
  try {
    const raw = localStorage.getItem(BARNABY_VISIBILITY_STORAGE_KEY);
    if (
      raw === 'ambient_and_tutor' ||
      raw === 'minimal_badge' ||
      raw === 'hidden_focus_only'
    ) {
      return raw;
    }
  } catch {
    // ignore storage read errors
  }
  return 'ambient_and_tutor';
}

export function setBarnabyVisibility(setting: BarnabyVisibilitySetting): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(BARNABY_VISIBILITY_STORAGE_KEY, setting);
    }
  } catch {
    // ignore storage write errors
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<BarnabyVisibilitySetting>(BARNABY_VISIBILITY_EVENT, {
        detail: setting,
      })
    );
  }
}

export function triggerBarnabyCelebration(reason?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<{ reason?: string; durationMs: number }>(
      BARNABY_CELEBRATION_EVENT,
      {
        detail: {
          reason,
          durationMs: BARNABY_CELEBRATION_DURATION_MS,
        },
      }
    )
  );
}
