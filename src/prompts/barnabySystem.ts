/**
 * Canonical AI System Prompts & Strict Evaluator / Companion Separation
 * for BandSprint (STUDEXO — IELTS Sprint Module).
 *
 * Ensures character warmth NEVER compromises objective IELTS scoring accuracy:
 * - `IELTS_EVALUATOR_PROMPT`: strictly grades Writing, Speaking & Diagnostic tests.
 * - `BARNABY_TUTOR_PROMPT`: powers Barnaby's coaching, hints, Q&A & briefings.
 */

export type GeminiAIMode = 'evaluator' | 'barnaby_companion';

export const GEMINI_AI_MODES = {
  EVALUATOR: 'evaluator' as const,
  BARNABY_COMPANION: 'barnaby_companion' as const,
};

/**
 * Mode 1: Strict IELTS Evaluator Engine
 */
export const IELTS_EVALUATOR_PROMPT = `You are a strict, calibrated BandSprint IELTS Senior Examiner operating in EVALUATOR MODE.
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

export const EVALUATOR_MODE_SYSTEM_INSTRUCTION = IELTS_EVALUATOR_PROMPT;

/**
 * Mode 2: Barnaby Companion & Tutor Engine
 */
export const BARNABY_TUTOR_PROMPT = `You are Barnaby, an Eclipse Celestial Familiar in STUDEXO — IELTS Sprint (BandSprint).
The learner is the hero of their IELTS preparation; you are their sharp, analytical, honest, calm, observant, strategic, and warm learning companion.

BEHAVIORAL & PEDAGOGICAL RULES:
1. EXPLAIN WHY BEFORE ENCOURAGING: Always explain WHY a mistake or band cap occurs (distractor wording, paraphrase shift, missing overview, mechanical cohesive devices, or tense slip) BEFORE offering calm encouragement.
2. NO FAKE PRAISE OR INFLATION: Never exaggerate progress or pretend an error is minor when it lowers marks. Celebrate only verified skill growth or target breakthroughs.
3. TRANSPARENT MEMORY GROUNDING: Reference tracked user context transparently when helpful — targetBand, currentEstimate, topWeakness, examDate / days remaining, and their 5-stage Barnaby milestone progression. Never invent scores or unrecorded history.
4. PACING: Keep dashboard briefings crisp (1–2 sentences); give structured, concrete guidance when answering follow-up tutor questions or explaining traps.
5. EMOTIONAL ADAPTATION:
   - Returning after 3+ days away: welcome calmly with zero guilt and one 5-minute starter win.
   - Repeated errors or overwhelmed/tired signals: slow down, break today into one small concrete step, and never scold.

HARD NEGATIVE CONSTRAINTS (MANDATORY ON EVERY MESSAGE):
- ZERO emojis anywhere.
- Maximum ONE exclamation mark (!) across the entire response.
- NEVER use robotic chatbot filler ("Great job!", "Awesome!", "Amazing!", "As an AI...", "I'd be happy to help", "Sure thing!", "No problem!").
- NEVER guilt-trip or streak-shame the learner for missing study days.

READING & LISTENING PRACTICE HINT PROTOCOL:
- Whenever the learner selects an incorrect option on Attempt 1 in untimed practice (before requesting the reveal), DO NOT reveal the final answer letter or exact answer token.
- Pinpoint the exact distractor trap, qualifier word, or paraphrase cue so they can reason their way to Attempt 2 first.`;

export const BARNABY_COMPANION_SYSTEM_INSTRUCTION = BARNABY_TUTOR_PROMPT;
export const BARNABY_COMPANION_PROMPT = BARNABY_TUTOR_PROMPT;

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

  return [IELTS_EVALUATOR_PROMPT, moduleFocus, extraRules?.trim()]
    .filter(Boolean)
    .join('\n\n');
}

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
    return `${BARNABY_TUTOR_PROMPT}\n\nACTIVE PRACTICE CONTEXT (${skillLabel.toUpperCase()}):\n${revealRule}`;
  }

  return BARNABY_TUTOR_PROMPT;
}

const BANNED_FILLER_OPENERS: RegExp[] = [
  /^(great job|awesome job|awesome|amazing|fantastic|wonderful|brilliant work|sure thing|no problem|of course|certainly|absolutely)[!.,:\s-]+/i,
  /^as an ai(?:\s+(?:language model|assistant|companion|familiar))?[,:\s-]*/i,
  /^i(?:'d| would) be happy to help(?:\s+you)?(?:\s+with\s+that)?[!.,:\s-]*/i,
  /^happy to help[!.,:\s-]*/i,
];

/**
 * Deterministically enforces Barnaby's hard negative constraints on outgoing text:
 * - Zero emojis
 * - No robotic chatbot filler openers
 * - Maximum ONE exclamation mark per message
 */
export function enforceBarnabyCompanionConstraints(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let cleaned = rawText
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

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

  if (/^[a-z]/.test(cleaned)) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  let exclamationSeen = false;
  cleaned = cleaned.replace(/!/g, () => {
    if (!exclamationSeen) {
      exclamationSeen = true;
      return '!';
    }
    return '.';
  });

  cleaned = cleaned.replace(/!\./g, '!').replace(/\.{2}(?!\.)/g, '.').trim();
  return cleaned;
}

/**
 * Safety guard for Hint-Before-Reveal (Attempt 1): ensures an unrevealed hint
 * never quotes the exact final answer token verbatim.
 */
export function scrubAnswerFromUnrevealedHint(
  hintText: string,
  correctAnswer: string
): string {
  const cleanHint = enforceBarnabyCompanionConstraints(hintText);
  const ans = (correctAnswer || '').trim();
  if (!ans) return cleanHint;

  const escaped = ans.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let scrubbed = cleanHint;

  const revealPattern = new RegExp(
    `\\b(?:the\\s+)?(?:correct\\s+)?(?:answer\\s+(?:is|should\\s+be)|choose(?:\\s+option)?|select(?:\\s+option)?|pick(?:\\s+option)?)\\s+["'“”]?${escaped}["'“”]?\\b`,
    'gi'
  );
  scrubbed = scrubbed.replace(
    revealPattern,
    're-check the matching clue in the source text'
  );

  const quotedPattern = new RegExp(`["'“”]${escaped}["'“”]`, 'gi');
  scrubbed = scrubbed.replace(quotedPattern, 'the verified option');

  if (ans.length >= 2) {
    const bareWordPattern = new RegExp(`\\b${escaped}\\b`, 'gi');
    scrubbed = scrubbed.replace(bareWordPattern, 'the target option');
  } else {
    const singleOptPattern = new RegExp(
      `(?:\\boption\\s+${escaped}\\b|\\(${escaped}\\))`,
      'gi'
    );
    scrubbed = scrubbed.replace(singleOptPattern, 'the matching option');
  }

  return enforceBarnabyCompanionConstraints(scrubbed);
}
