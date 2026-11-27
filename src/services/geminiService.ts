/**
 * BandSprint Gemini AI System Instructions & Dual-Mode Client Gateway
 *
 * Strictly separates AI behavior into two independent modes so companion warmth
 * never compromises official IELTS grading rigor:
 *  - IELTS_EVALUATOR_PROMPT (Writing, Speaking, Diagnostic)
 *  - BARNABY_TUTOR_PROMPT (Coaching, Hints, Mistake Analysis, Briefings, Q&A)
 *
 * NOTE: All @google/genai SDK calls execute server-side in server.ts; this shared
 * module never imports @google/genai or reads GEMINI_API_KEY in browser code.
 */

import { setBarnabyAnalyzing } from '../utils/getBarnabyState';
import {
  GEMINI_AI_MODES,
  IELTS_EVALUATOR_PROMPT,
  BARNABY_TUTOR_PROMPT,
  EVALUATOR_MODE_SYSTEM_INSTRUCTION,
  BARNABY_COMPANION_SYSTEM_INSTRUCTION,
  BARNABY_COMPANION_PROMPT,
  buildEvaluatorSystemInstruction,
  buildBarnabyCompanionSystemInstruction,
  enforceBarnabyCompanionConstraints,
  scrubAnswerFromUnrevealedHint,
} from '../prompts/barnabySystem';

export type { GeminiAIMode } from '../prompts/barnabySystem';

export {
  GEMINI_AI_MODES,
  IELTS_EVALUATOR_PROMPT,
  BARNABY_TUTOR_PROMPT,
  EVALUATOR_MODE_SYSTEM_INSTRUCTION,
  BARNABY_COMPANION_SYSTEM_INSTRUCTION,
  BARNABY_COMPANION_PROMPT,
  buildEvaluatorSystemInstruction,
  buildBarnabyCompanionSystemInstruction,
  enforceBarnabyCompanionConstraints,
  scrubAnswerFromUnrevealedHint,
};

export interface WritingCriterionDetail {
  score: number;
  explanation: string;
}

export interface WritingCriteriaBreakdown {
  taskAchievementOrResponse: WritingCriterionDetail;
  coherenceAndCohesion: WritingCriterionDetail;
  lexicalResource: WritingCriterionDetail;
  grammaticalRangeAndAccuracy: WritingCriterionDetail;
}

export interface WritingSentenceUpgrade {
  originalSentence: string;
  flawTag: string;
  band85Rewrite: string;
  explanation?: string;
}

export interface SpeakingTopicVocabUpgrade {
  phrase: string;
  bandLevel: string;
  topicContext?: string;
  meaning: string;
  exampleInContext?: string;
}

export interface SpeakingCriterionNotes {
  fluency: string;
  lexical: string;
  grammar: string;
  pronunciation: string;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token =
      localStorage.getItem('ielts_session_token_v2') ||
      localStorage.getItem('ielts_sprint_session_token');
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
  attemptMode?: 'hint_before_reveal' | 'reveal_explanation';
}

export interface PracticeHintResponse {
  headline: string;
  stepByStepExplanation: string;
  distractorTrapAnalysis: string;
  keyConceptRule: string;
  lexicalTakeaways?: Array<{ term: string; meaning: string }>;
  banglaSummary?: string;
  isAiPowered?: boolean;
}

/**
 * Calls server-side mentor endpoint in BARNABY COMPANION MODE.
 * Defaults `isAnswerRevealed: false` so incorrect practice answers receive a
 * strategic clue/distractor hint before revealing the final key.
 */
export async function requestBarnabyPracticeHint(
  req: PracticeHintRequest
): Promise<PracticeHintResponse> {
  const response = await fetch('/api/mentor/explain', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...req,
      isAnswerRevealed: req.isAnswerRevealed ?? false,
      attemptMode:
        req.attemptMode ??
        (req.isAnswerRevealed ? 'reveal_explanation' : 'hint_before_reveal'),
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
