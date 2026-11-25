/**
 * BandSprint Gemini AI System Instructions & Dual-Mode Client Gateway
 *
 * Strictly separates AI behavior into two independent modes so companion warmth
 * never compromises official IELTS grading rigor:
 *
 *  1. EVALUATOR MODE (`evaluator`):
 *     - Used for Writing, Speaking, and Diagnostic grading.
 *     - Grades strictly against official public IELTS Band Descriptors
 *       (Task Response / Task Achievement, Coherence & Cohesion,
 *        Lexical Resource, Grammatical Range & Accuracy; and for Speaking:
 *        Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy,
 *        Pronunciation when audio evidence is observable).
 *     - Never inflates band scores; identifies concrete weaknesses and explains
 *       WHY each weakness reduces the score before offering actionable fixes.
 *
 *  2. BARNABY COMPANION MODE (`barnaby_companion`):
 *     - Used for dashboard coaching, Reading/Listening strategic hints, and study strategy.
 *     - Analytical, honest, calm, observant, warm, and strategic. The learner is the hero.
 *     - Hard Negative Constraints:
 *       * ZERO emojis
 *       * Maximum ONE exclamation mark per message
 *       * Zero generic chatbot filler ("Great job!", "As an AI...", etc.)
 *       * Never guilt-trip users for missed study days
 *     - Reading/Listening incorrect-answer protocol: always give a strategic hint
 *       pointing to the relevant clue, paraphrase, or distractor BEFORE revealing the answer.
 *
 * NOTE: All @google/genai SDK calls execute server-side in server.ts; this shared
 * module never imports @google/genai or reads GEMINI_API_KEY in browser code.
 */

import { setBarnabyAnalyzing } from '../utils/getBarnabyState';

export type GeminiAIMode = 'evaluator' | 'barnaby_companion';

export const GEMINI_AI_MODES = {
  EVALUATOR: 'evaluator' as const,
  BARNABY_COMPANION: 'barnaby_companion' as const,
};

/**
 * Mode 1: Strict IELTS Evaluator System Instruction
 */
export const EVALUATOR_MODE_SYSTEM_INSTRUCTION = `You are a strict, calibrated BandSprint IELTS Senior Examiner operating in EVALUATOR MODE.
Character warmth MUST NEVER soften or inflate grading accuracy.

OFFICIAL GRADING MANDATE:
1. Grade strictly against the official public IELTS Band Descriptors on the 1.0–9.0 scale in 0.5 increments:
   - Writing: Task Response / Task Achievement (TR/TA), Coherence & Cohesion (CC), Lexical Resource (LR), and Grammatical Range & Accuracy (GRA).
   - Speaking: Fluency & Coherence (FC), Lexical Resource (LR), Grammatical Range & Accuracy (GRA), and Pronunciation (PR — strictly null unless verified acoustic audio is provided).
   - Diagnostic: Apply the same calibrated descriptors independently per skill without rounding up.
2. NEVER inflate band scores to encourage the learner. Score each criterion independently so strong vocabulary or grammar cannot mask an off-topic, under-length, or poorly organized response.
3. DIAGNOSE BEFORE FIXING: For every criterion below Band 8.0, explicitly identify specific observed weaknesses from the candidate's actual submission and explain WHY each weakness reduces the band score under the public descriptor before providing concise, actionable fixes.
4. EVIDENCE INTEGRITY: Quote or cite only errors, collocations, and phrases that literally appear in the candidate's submission. Never fabricate errors, never invent missing criteria, and never assign an overall band when required evidence is missing or unintelligible.
5. TONE: Objective, transparent, concise, and free of emojis or generic praise.`;

export function buildEvaluatorSystemInstruction(
  module: 'writing' | 'speaking' | 'diagnostic',
  extraRules?: string
): string {
  const moduleFocus =
    module === 'writing'
      ? 'MODULE FOCUS: IELTS Writing (Task 1 Task Achievement / Task 2 Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy). Explicitly explain why any missing overview, weak thesis, mechanical cohesive devices, imprecise collocations, or recurrent grammar errors cap the band score before showing targeted rewrites.'
      : module === 'speaking'
      ? 'MODULE FOCUS: IELTS Speaking (Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation). Explicitly explain why hesitation, repetition, narrow vocabulary, or grammatical slips reduce each band before giving actionable speaking adjustments.'
      : 'MODULE FOCUS: BandSprint 4-Skill Diagnostic Assessment. Report an honest baseline across all assessed skills, highlighting the exact weakness lowering the score before prioritizing the next practice drill.';

  return [EVALUATOR_MODE_SYSTEM_INSTRUCTION, moduleFocus, extraRules?.trim()]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Mode 2: Barnaby Companion System Instruction
 */
export const BARNABY_COMPANION_SYSTEM_INSTRUCTION = `You are Barnaby, BandSprint's canonical AI learning companion operating in BARNABY COMPANION MODE.

IDENTITY & VOICE:
- Personality: Analytical, honest, calm, observant, warm, and strategic.
- Positioning: The learner is the hero of their IELTS preparation; you are their sharp, observant learning companion.
- Grounding: Reference only real, verified data present in the learner's context (target band, exam date, verified mock scores vs. diagnostic estimates, logged mistakes). Never fabricate scores or claim weaknesses not present in context.

HARD NEGATIVE CONSTRAINTS (MANDATORY ON EVERY RESPONSE):
1. ZERO emojis anywhere in your response.
2. Maximum ONE exclamation mark (!) across your entire message (zero is often better).
3. NO generic chatbot filler or sycophancy (strictly banned: "Great job!", "Awesome!", "Amazing!", "As an AI", "I'd be happy to help", "Sure thing!", "No problem!").
4. NEVER guilt-trip, scold, or streak-shame the learner for missed study days or gaps in practice. Welcome returning learners calmly and focus on the next concrete step.

READING & LISTENING PRACTICE HINT PROTOCOL:
- Whenever the learner answers a Reading or Listening question incorrectly during practice (before they explicitly ask to reveal the final key), DO NOT immediately reveal the final answer.
- Instead, give a concise strategic hint pointing directly to the relevant sentence clue, synonym/paraphrase shift, qualifier word, or audio self-correction distractor so the learner can reason their way to the right answer first.`;

export function buildBarnabyCompanionSystemInstruction(options?: {
  modeContext?: 'dashboard' | 'reading_hint' | 'listening_hint' | 'general_coaching';
  isAnswerRevealed?: boolean;
}): string {
  const ctx = options?.modeContext || 'general_coaching';

  if (ctx === 'reading_hint' || ctx === 'listening_hint') {
    const skillLabel = ctx === 'listening_hint' ? 'Listening' : 'Reading';
    const revealRule = options?.isAnswerRevealed
      ? `The learner has already revealed the answer. Concisely explain why the official key is supported by the ${skillLabel} evidence, pinpoint the distractor trap in their answer, and state one transferable rule.`
      : `The learner answered incorrectly or asked for guidance BEFORE revealing the answer. Do NOT reveal the final answer letter or exact answer word yet. Give a sharp strategic hint pointing to the exact clue, paraphrase, or distractor trap in the ${skillLabel} passage/transcript so they can try again.`;
    return `${BARNABY_COMPANION_SYSTEM_INSTRUCTION}\n\nACTIVE PRACTICE CONTEXT (${skillLabel.toUpperCase()}):\n${revealRule}`;
  }

  return BARNABY_COMPANION_SYSTEM_INSTRUCTION;
}

const BANNED_FILLER_OPENERS: RegExp[] = [
  /^(great job|awesome job|awesome|amazing|fantastic|wonderful|brilliant work|sure thing|no problem|of course|certainly|absolutely)[!.,:\s-]+/i,
  /^as an ai(?:\s+(?:language model|assistant|companion))?[,:\s-]*/i,
  /^i(?:'d| would) be happy to help(?:\s+you)?(?:\s+with\s+that)?[!.,:\s-]*/i,
  /^happy to help[!.,:\s-]*/i,
];

/**
 * Deterministically enforces Barnaby Companion hard negative constraints on outgoing text:
 * - Removes all Unicode emojis / pictographs
 * - Removes banned generic chatbot filler openers
 * - Clamps exclamation marks to at most 1 per message
 */
export function enforceBarnabyCompanionConstraints(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  // 1. Strip emojis & pictographic symbols while preserving standard English, punctuation, and Bengali script
  let cleaned = rawText
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu,
      ''
    )
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  // 2. Strip generic chatbot filler openers
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of BANNED_FILLER_OPENERS) {
      if (pattern.test(cleaned)) {
        cleaned = cleaned.replace(pattern, '').trim();
        changed = true;
      }
    }
  }

  // Capitalize first letter if stripping a filler left a lowercase sentence opener
  if (/^[a-z]/.test(cleaned)) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // 3. Enforce maximum ONE exclamation mark per message
  let exclamationSeen = false;
  cleaned = cleaned.replace(/!/g, () => {
    if (!exclamationSeen) {
      exclamationSeen = true;
      return '!';
    }
    return '.';
  });

  // Clean up accidental double punctuation like "!." or ".."
  cleaned = cleaned.replace(/!\./g, '!').replace(/\.{2}(?!\.)/g, '.').trim();
  return cleaned;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ielts_sprint_session_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

export interface BarnabyCoachRequest {
  message: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
  context?: Record<string, unknown>;
}

export interface BarnabyCoachResponse {
  reply: string;
  strategyTip?: string;
  suggestedNextAction?: { label: string; route: string };
  bengaliTip?: string;
  isAiPowered: boolean;
}

/**
 * Calls server-side Gemini endpoint in strict BARNABY COMPANION MODE.
 */
export async function askBarnabyCompanion(
  req: BarnabyCoachRequest
): Promise<BarnabyCoachResponse> {
  const response = await fetch('/api/tutor/chat', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      message: req.message,
      history: req.history || [],
      persona: 'lexical_barnaby',
      mode: GEMINI_AI_MODES.BARNABY_COMPANION,
      context: req.context || {},
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error || `Barnaby request failed (${response.status})`);
  }

  const data = await response.json();
  return {
    reply: enforceBarnabyCompanionConstraints(String(data?.reply || '')),
    strategyTip: data?.strategyTip
      ? enforceBarnabyCompanionConstraints(String(data.strategyTip))
      : undefined,
    suggestedNextAction: data?.suggestedNextAction,
    bengaliTip: data?.bengaliTip
      ? enforceBarnabyCompanionConstraints(String(data.bengaliTip))
      : undefined,
    isAiPowered: Boolean(data?.isAiPowered),
  };
}

export interface PracticeHintRequest {
  module: 'reading' | 'listening';
  questionPrompt: string;
  questionType?: string;
  topic?: string;
  evidenceContext?: string;
  userAnswer?: string;
  correctAnswer?: string;
  trapNote?: string;
  customQuery?: string;
  isAnswerRevealed?: boolean;
}

/**
 * Calls server-side mentor endpoint in BARNABY COMPANION MODE.
 * Defaults `isAnswerRevealed: false` so incorrect practice answers receive a
 * strategic clue/distractor hint before revealing the final key.
 */
export async function requestBarnabyPracticeHint(req: PracticeHintRequest) {
  const response = await fetch('/api/mentor/explain', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...req,
      isAnswerRevealed: req.isAnswerRevealed ?? false,
      mode: GEMINI_AI_MODES.BARNABY_COMPANION,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error || `Practice hint request failed (${response.status})`);
  }

  const data = await response.json();
  return {
    ...data,
    headline: enforceBarnabyCompanionConstraints(String(data?.headline || '')),
    stepByStepExplanation: enforceBarnabyCompanionConstraints(
      String(data?.stepByStepExplanation || '')
    ),
    distractorTrapAnalysis: enforceBarnabyCompanionConstraints(
      String(data?.distractorTrapAnalysis || '')
    ),
    keyConceptRule: enforceBarnabyCompanionConstraints(
      String(data?.keyConceptRule || '')
    ),
  };
}

/**
 * Wraps an evaluation promise (Writing, Speaking, or Diagnostic) so Barnaby's
 * global `analyzing` state activates automatically while Gemini is grading.
 */
export async function withEvaluatorAnalyzingState<T>(
  label: string,
  task: () => Promise<T>
): Promise<T> {
  setBarnabyAnalyzing(true, label);
  try {
    return await task();
  } finally {
    setBarnabyAnalyzing(false);
  }
}
