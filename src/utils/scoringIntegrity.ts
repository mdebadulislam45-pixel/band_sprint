/**
 * BAND SPRINT — GLOBAL IELTS SCORING INTEGRITY & ANTI-FABRICATION ENGINE
 *
 * Single authoritative calculation, validation, anti-inflation, and alignment layer
 * shared across backend API routes (server.ts) and frontend assessment services.
 *
 * Core Principles:
 * 1. Honest Assessment Over Impressive Numbers.
 * 2. Never fabricate an IELTS band score when evidence is missing, unobservable, or AI fails.
 * 3. Never allow text-only transcripts to claim acoustic pronunciation measurement.
 * 4. Shadowing practice produces practice metrics ONLY — never an IELTS band score.
 * 5. Overall bands are always authoritatively recalculated using official IELTS rounding
 *    (.25 -> .5, .75 -> next whole band) and return null if any required component is missing.
 */

export type AssessmentStatus =
  | 'evaluated'
  | 'partial_transcript_only'
  | 'insufficient_evidence'
  | 'unavailable';

export interface TextQualitySignals {
  wordCount: number;
  alphaWordCount: number;
  uniqueWordCount: number;
  lexicalDiversityRatio: number;
  sentenceCount: number;
  repeatedSentenceRatio: number;
  repeatedBigramRatio: number;
  fillerCount: number;
  fillerDensity: number;
  memorizedTemplateHits: string[];
  isGibberish: boolean;
  isHighlyRepetitive: boolean;
}

const MEMORIZED_TEMPLATE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /with the rapid development of science and technology/i, label: 'with the rapid development of science and technology' },
  { pattern: /every coin has two sides/i, label: 'every coin has two sides' },
  { pattern: /since the dawn of human civilization/i, label: 'since the dawn of human civilization' },
  { pattern: /is a hotly debated topic in modern society/i, label: 'is a hotly debated topic in modern society' },
  { pattern: /this essay will discuss both views and give my opinion/i, label: 'memorized thesis template' },
  { pattern: /it is an indisputable fact that/i, label: 'it is an indisputable fact that' },
  { pattern: /from time immemorial/i, label: 'from time immemorial' }
];

const SPOKEN_FILLER_REGEX = /\b(um+|uh+|er+|erm+|ah+|like|you know|i mean|basically|actually|sort of|kind of)\b/gi;

/**
 * Official IELTS Rounding Rule:
 * - Fractional < 0.25 -> floor whole band
 * - Fractional >= 0.25 and < 0.75 -> floor + 0.5
 * - Fractional >= 0.75 -> ceil whole band (capped at 9.0)
 */
export function roundOfficialIELTSBand(rawAverage: number): number {
  if (typeof rawAverage !== 'number' || !Number.isFinite(rawAverage)) {
    return 0.0;
  }
  if (rawAverage <= 0) return 0.0;
  const clamped = Math.max(0.0, Math.min(9.0, rawAverage));
  const whole = Math.floor(clamped);
  const frac = clamped - whole;
  // Floating-point safe thresholds
  if (frac >= 0.75 - 1e-9) return Math.min(9.0, whole + 1.0);
  if (frac >= 0.25 - 1e-9) return whole + 0.5;
  return whole;
}

/**
 * Validates an individual criterion score as a strict legal IELTS half-band in [1.0, 9.0].
 * Returns null if missing, non-finite, NaN, outside [1.0, 9.0], or NOT on a 0.5 increment.
 */
export function validateCriterionBand(value: unknown): number | null {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  const num = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof num !== 'number' || !Number.isFinite(num)) return null;
  if (num < 1.0 || num > 9.0) return null;
  if (Math.abs(num * 2 - Math.round(num * 2)) > 1e-6) return null;
  return Math.round(num * 2) / 2;
}

/**
 * Formats a nullable IELTS band safely without converting null/NaN to 0.0 or crashing on .toFixed().
 */
export function formatNullableBand(value: number | null | undefined, fallback: string = '—'): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return value.toFixed(1);
}

/**
 * Calculates an official 4-skill or 4-criterion IELTS overall band.
 * Strictly returns null if ANY of the 4 inputs is missing or invalid.
 */
export function calculateStrictFourPartBand(
  part1: number | null | undefined,
  part2: number | null | undefined,
  part3: number | null | undefined,
  part4: number | null | undefined
): number | null {
  const v1 = validateCriterionBand(part1);
  const v2 = validateCriterionBand(part2);
  const v3 = validateCriterionBand(part3);
  const v4 = validateCriterionBand(part4);
  if (v1 === null || v2 === null || v3 === null || v4 === null) {
    return null;
  }
  return roundOfficialIELTSBand((v1 + v2 + v3 + v4) / 4);
}

/**
 * Extracts deterministic text quality and anti-gaming signals from a written or spoken transcript.
 */
export function analyzeTextQualitySignals(text: string): TextQualitySignals {
  const clean = (text || '').trim();
  if (!clean) {
    return {
      wordCount: 0,
      alphaWordCount: 0,
      uniqueWordCount: 0,
      lexicalDiversityRatio: 0,
      sentenceCount: 0,
      repeatedSentenceRatio: 0,
      repeatedBigramRatio: 0,
      fillerCount: 0,
      fillerDensity: 0,
      memorizedTemplateHits: [],
      isGibberish: true,
      isHighlyRepetitive: false
    };
  }

  const tokens = clean.split(/\s+/).filter(Boolean);
  const wordCount = tokens.length;
  const alphaWords = tokens
    .map((w) => w.toLowerCase().replace(/[^a-z'-]/g, ''))
    .filter((w) => /[a-z]{2,}/.test(w) || w === 'i' || w === 'a');
  const alphaWordCount = alphaWords.length;

  const uniqueWords = new Set(alphaWords);
  const uniqueWordCount = uniqueWords.size;
  const lexicalDiversityRatio = alphaWordCount > 0 ? uniqueWordCount / alphaWordCount : 0;

  // Detect keyboard-mash / consonant-cluster nonsense (words with no vowels or huge repetition of single char)
  const plausibleEnglishWords = alphaWords.filter(
    (w) => w.length <= 24 && /[aeiouy]/i.test(w) && !/(.)\1{3,}/i.test(w)
  );
  const plausibleRatio = alphaWordCount > 0 ? plausibleEnglishWords.length / alphaWordCount : 0;

  // Sentence-level repetition detection
  const sentences = clean
    .split(/[.!?]+/)
    .map((s) => s.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' '))
    .filter((s) => s.split(' ').filter(Boolean).length >= 3);
  const sentenceCount = sentences.length;
  const uniqueSentenceCount = new Set(sentences).size;
  const repeatedSentenceRatio =
    sentenceCount >= 2 ? 1 - uniqueSentenceCount / sentenceCount : 0;

  // Bigram repetition detection (catches "the cat sat on the mat" repeated without punctuation)
  let repeatedBigramRatio = 0;
  if (alphaWords.length >= 10) {
    const bigrams: string[] = [];
    for (let i = 0; i < alphaWords.length - 1; i++) {
      bigrams.push(`${alphaWords[i]} ${alphaWords[i + 1]}`);
    }
    const uniqueBigrams = new Set(bigrams).size;
    repeatedBigramRatio = 1 - uniqueBigrams / bigrams.length;
  }

  const fillerMatches = clean.match(SPOKEN_FILLER_REGEX) || [];
  const fillerCount = fillerMatches.length;
  const fillerDensity = wordCount > 0 ? fillerCount / wordCount : 0;

  const memorizedTemplateHits = MEMORIZED_TEMPLATE_PATTERNS.filter((p) => p.pattern.test(clean)).map(
    (p) => p.label
  );

  const isGibberish =
    wordCount > 0 &&
    (alphaWordCount < Math.min(4, Math.ceil(wordCount * 0.5)) ||
      plausibleRatio < 0.65 ||
      (wordCount >= 12 && uniqueWordCount < 4));

  const isHighlyRepetitive =
    (sentenceCount >= 3 && repeatedSentenceRatio >= 0.45) ||
    (alphaWordCount >= 25 && repeatedBigramRatio >= 0.45) ||
    (alphaWordCount >= 30 && lexicalDiversityRatio < 0.25);

  return {
    wordCount,
    alphaWordCount,
    uniqueWordCount,
    lexicalDiversityRatio: Number(lexicalDiversityRatio.toFixed(3)),
    sentenceCount,
    repeatedSentenceRatio: Number(repeatedSentenceRatio.toFixed(3)),
    repeatedBigramRatio: Number(repeatedBigramRatio.toFixed(3)),
    fillerCount,
    fillerDensity: Number(fillerDensity.toFixed(3)),
    memorizedTemplateHits,
    isGibberish,
    isHighlyRepetitive
  };
}

// ============================================================================
// SPEAKING AI PAYLOAD VALIDATOR (ANTI-FABRICATION & ANTI-INFLATION)
// ============================================================================

export interface ValidatedSpeakingEvaluation {
  valid: boolean;
  reason?: string;
  assessmentStatus: AssessmentStatus;
  evidenceMode: 'audio_and_transcript' | 'transcript_only';
  pronunciationObservable: boolean;
  isPartialAssessment: boolean;
  criteria: {
    fc: number | null;
    lr: number | null;
    gra: number | null;
    pr: number | null;
  };
  overallBand: number | null;
  partialThreeCriterionIndex: number | null;
  unassessedCriteria: string[];
  calibrationNotes: string[];
}

export function validateSpeakingAiPayload(
  rawPayload: any,
  context: {
    transcript: string;
    hasAudioEvidence: boolean;
    part?: number;
    durationSec?: number;
    pauseCount?: number;
  }
): ValidatedSpeakingEvaluation {
  const signals = analyzeTextQualitySignals(context.transcript);

  if (signals.wordCount < 5 || signals.isGibberish) {
    return {
      valid: false,
      reason: 'Insufficient or unintelligible speech transcript for reliable IELTS assessment.',
      assessmentStatus: 'insufficient_evidence',
      evidenceMode: context.hasAudioEvidence ? 'audio_and_transcript' : 'transcript_only',
      pronunciationObservable: false,
      isPartialAssessment: true,
      criteria: { fc: null, lr: null, gra: null, pr: null },
      overallBand: null,
      partialThreeCriterionIndex: null,
      unassessedCriteria: ['fc', 'lr', 'gra', 'pr'],
      calibrationNotes: ['Transcript did not meet minimum intelligibility or length threshold.']
    };
  }

  if (!rawPayload || typeof rawPayload !== 'object') {
    return {
      valid: false,
      reason: 'AI evaluation payload was empty or malformed.',
      assessmentStatus: 'unavailable',
      evidenceMode: context.hasAudioEvidence ? 'audio_and_transcript' : 'transcript_only',
      pronunciationObservable: false,
      isPartialAssessment: true,
      criteria: { fc: null, lr: null, gra: null, pr: null },
      overallBand: null,
      partialThreeCriterionIndex: null,
      unassessedCriteria: ['fc', 'lr', 'gra', 'pr'],
      calibrationNotes: ['Backend rejected malformed AI response rather than fabricating fallback scores.']
    };
  }

  const rawBands = rawPayload.estimatedBands || rawPayload.criteria || {};
  let fc = validateCriterionBand(rawBands.fluency ?? rawBands.fc);
  let lr = validateCriterionBand(rawBands.lexical ?? rawBands.lexicalResource ?? rawBands.lr);
  let gra = validateCriterionBand(rawBands.grammar ?? rawBands.grammaticalRange ?? rawBands.gra);
  let pr = context.hasAudioEvidence
    ? validateCriterionBand(
        rawBands.pronunciation ?? rawBands.pr ?? rawPayload.pronunciation?.clarityBand
      )
    : null;

  if (fc === null || lr === null || gra === null) {
    return {
      valid: false,
      reason: 'AI evaluation omitted required IELTS Speaking criterion scores (FC, LR, or GRA).',
      assessmentStatus: 'unavailable',
      evidenceMode: context.hasAudioEvidence ? 'audio_and_transcript' : 'transcript_only',
      pronunciationObservable: false,
      isPartialAssessment: true,
      criteria: { fc: null, lr: null, gra: null, pr: null },
      overallBand: null,
      partialThreeCriterionIndex: null,
      unassessedCriteria: ['fc', 'lr', 'gra', 'pr'],
      calibrationNotes: ['Backend rejected incomplete AI criteria rather than defaulting to Band 7.0.']
    };
  }

  if (context.hasAudioEvidence && pr === null) {
    return {
      valid: false,
      reason: 'AI evaluation omitted Pronunciation score despite audio evidence being supplied.',
      assessmentStatus: 'unavailable',
      evidenceMode: 'audio_and_transcript',
      pronunciationObservable: false,
      isPartialAssessment: true,
      criteria: { fc: null, lr: null, gra: null, pr: null },
      overallBand: null,
      partialThreeCriterionIndex: null,
      unassessedCriteria: ['pr'],
      calibrationNotes: ['Backend rejected missing Pronunciation band rather than substituting a default.']
    };
  }

  const calibrationNotes: string[] = [];

  // Anti-inflation guardrails based on directly observed transcript evidence
  if (signals.wordCount < 12) {
    if (fc > 5.0) {
      fc = 5.0;
      calibrationNotes.push('Fluency & Coherence capped at 5.0 due to very brief response (<12 words).');
    }
    if (lr > 5.5) {
      lr = 5.5;
      calibrationNotes.push('Lexical Resource capped at 5.5 due to insufficient lexical sample (<12 words).');
    }
  } else if (context.part === 2 && signals.wordCount < 55) {
    if (fc > 5.5) {
      fc = 5.5;
      calibrationNotes.push('Part 2 long-turn Fluency capped at 5.5 due to under-developed response (<55 words).');
    }
  }

  if (signals.isHighlyRepetitive) {
    if (fc > 4.5) fc = 4.5;
    if (lr > 4.5) lr = 4.5;
    calibrationNotes.push('Severe repetition detected; Fluency and Lexical Resource capped at 4.5.');
  }

  if (signals.fillerDensity >= 0.18 && signals.fillerCount >= 4) {
    if (fc > 5.5) {
      fc = 5.5;
      calibrationNotes.push('High hesitation/filler density detected; Fluency & Coherence capped at 5.5.');
    }
  }

  if (signals.memorizedTemplateHits.length > 0 && fc > 6.0) {
    fc = 6.0;
    calibrationNotes.push('Formulaic/memorized phraseology detected; Fluency & Coherence moderated.');
  }

  // Authoritative overall recalculation — NEVER trust raw LLM overallBand arithmetic
  if (context.hasAudioEvidence && pr !== null) {
    const overallBand = roundOfficialIELTSBand((fc + lr + gra + pr) / 4);
    return {
      valid: true,
      assessmentStatus: 'evaluated',
      evidenceMode: 'audio_and_transcript',
      pronunciationObservable: true,
      isPartialAssessment: false,
      criteria: { fc, lr, gra, pr },
      overallBand,
      partialThreeCriterionIndex: null,
      unassessedCriteria: [],
      calibrationNotes
    };
  }

  // Transcript-only mode: Pronunciation is NOT acoustically observable and MUST stay null.
  // A complete IELTS Speaking overallBand MUST remain null; expose the 3-criterion average separately.
  const partialThreeCriterionIndex = roundOfficialIELTSBand((fc + lr + gra) / 3);
  calibrationNotes.push(
    'Transcript-only evaluation: Pronunciation was not measured from audio (Unassessed). No complete IELTS Speaking band was assigned.'
  );

  return {
    valid: true,
    assessmentStatus: 'partial_transcript_only',
    evidenceMode: 'transcript_only',
    pronunciationObservable: false,
    isPartialAssessment: true,
    criteria: { fc, lr, gra, pr: null },
    overallBand: null,
    partialThreeCriterionIndex,
    unassessedCriteria: ['pronunciation'],
    calibrationNotes
  };
}

// ============================================================================
// WRITING AI PAYLOAD VALIDATOR (ANTI-FABRICATION & ANTI-INFLATION)
// ============================================================================

export interface ValidatedWritingEvaluation {
  valid: boolean;
  reason?: string;
  assessmentStatus: AssessmentStatus;
  wordCount: number;
  targetWords: number;
  criteria: {
    ta: number | null;
    cc: number | null;
    lr: number | null;
    gra: number | null;
  };
  overallBand: number | null;
  calibrationNotes: string[];
}

export function validateWritingAiPayload(
  rawPayload: any,
  context: {
    essayText: string;
    taskType: 'task1' | 'task2';
    promptText?: string;
  }
): ValidatedWritingEvaluation {
  const minThreshold = context.taskType === 'task1' ? 30 : 50;
  const targetWords = context.taskType === 'task1' ? 150 : 250;
  const signals = analyzeTextQualitySignals(context.essayText);

  if (signals.wordCount < minThreshold || signals.isGibberish) {
    return {
      valid: false,
      reason: signals.isGibberish
        ? 'Submission appears unintelligible or gibberish and cannot be validly scored.'
        : `Submission too short (${signals.wordCount} words; minimum ${minThreshold} words required for diagnostic evaluation).`,
      assessmentStatus: 'insufficient_evidence',
      wordCount: signals.wordCount,
      targetWords,
      criteria: { ta: null, cc: null, lr: null, gra: null },
      overallBand: null,
      calibrationNotes: ['Below minimum assessable threshold.']
    };
  }

  if (!rawPayload || typeof rawPayload !== 'object') {
    return {
      valid: false,
      reason: 'AI writing evaluation payload was empty or malformed.',
      assessmentStatus: 'unavailable',
      wordCount: signals.wordCount,
      targetWords,
      criteria: { ta: null, cc: null, lr: null, gra: null },
      overallBand: null,
      calibrationNotes: ['Backend rejected malformed AI response rather than fabricating fallback scores.']
    };
  }

  if (rawPayload.assessmentStatus === 'insufficient_evidence') {
    return {
      valid: false,
      reason:
        typeof rawPayload.error === 'string' && rawPayload.error.trim()
          ? rawPayload.error
          : 'Writing submission has insufficient evidence for IELTS scoring.',
      assessmentStatus: 'insufficient_evidence',
      wordCount: signals.wordCount,
      targetWords,
      criteria: { ta: null, cc: null, lr: null, gra: null },
      overallBand: null,
      calibrationNotes: ['Upstream payload declared insufficient_evidence.']
    };
  }

  if (rawPayload.isValidAttempt === false || rawPayload.assessmentStatus === 'unavailable') {
    return {
      valid: false,
      reason:
        typeof rawPayload.error === 'string' && rawPayload.error.trim()
          ? rawPayload.error
          : 'AI writing evaluation was marked unavailable.',
      assessmentStatus: 'unavailable',
      wordCount: signals.wordCount,
      targetWords,
      criteria: { ta: null, cc: null, lr: null, gra: null },
      overallBand: null,
      calibrationNotes: ['Rejected unavailable payload rather than reading stale criterion fields.']
    };
  }

  let ta = validateCriterionBand(rawPayload.trScore ?? rawPayload.taScore ?? rawPayload.ta);
  let cc = validateCriterionBand(rawPayload.ccScore ?? rawPayload.cc);
  let lr = validateCriterionBand(rawPayload.lrScore ?? rawPayload.lr);
  let gra = validateCriterionBand(rawPayload.graScore ?? rawPayload.gra);

  if (ta === null || cc === null || lr === null || gra === null) {
    return {
      valid: false,
      reason:
        'AI writing evaluation omitted or returned invalid IELTS criteria (must be finite 1.0–9.0 half-band scores for TA/TR, CC, LR, GRA).',
      assessmentStatus: 'unavailable',
      wordCount: signals.wordCount,
      targetWords,
      criteria: { ta: null, cc: null, lr: null, gra: null },
      overallBand: null,
      calibrationNotes: ['Backend rejected incomplete or invalid AI criteria rather than defaulting to Band 7.0.']
    };
  }

  const calibrationNotes: string[] = [];

  // Strict under-length TA/TR calibration
  const lengthRatio = signals.wordCount / targetWords;
  if (lengthRatio < 0.5) {
    if (ta > 4.5) {
      ta = 4.5;
      calibrationNotes.push(
        `Severely under-length (${signals.wordCount}/${targetWords} words); Task Achievement/Response capped at 4.5.`
      );
    }
  } else if (lengthRatio < 0.8) {
    if (ta > 5.5) {
      ta = 5.5;
      calibrationNotes.push(
        `Under-length (${signals.wordCount}/${targetWords} words); Task Achievement/Response capped at 5.5.`
      );
    }
  } else if (lengthRatio < 0.96) {
    if (ta > 6.5) {
      ta = 6.5;
      calibrationNotes.push(
        `Slightly under recommended length (${signals.wordCount}/${targetWords} words); Task Achievement/Response capped at 6.5.`
      );
    }
  }

  // Anti-repetition / anti-gaming cap
  if (signals.isHighlyRepetitive) {
    if (ta > 4.0) ta = 4.0;
    if (cc > 4.5) cc = 4.5;
    if (lr > 4.0) lr = 4.0;
    if (gra > 4.5) gra = 4.5;
    calibrationNotes.push('Severe sentence/phrase repetition detected; all criteria capped conservatively.');
  }

  // Memorized template moderation
  if (signals.memorizedTemplateHits.length > 0) {
    if (ta > 6.0) ta = 6.0;
    if (lr > 6.5) lr = 6.5;
    calibrationNotes.push(
      `Memorized cliché template detected (${signals.memorizedTemplateHits[0]}); TA/LR moderated.`
    );
  }

  // Authoritative 4-criterion overall recalculation
  const overallBand = roundOfficialIELTSBand((ta + cc + lr + gra) / 4);

  return {
    valid: true,
    assessmentStatus: 'evaluated',
    wordCount: signals.wordCount,
    targetWords,
    criteria: { ta, cc, lr, gra },
    overallBand,
    calibrationNotes
  };
}

export interface ClientWritingValidationResult {
  valid: boolean;
  assessmentStatus: 'evaluated' | 'insufficient_evidence' | 'unavailable';
  criteria: {
    ta: number | null;
    cc: number | null;
    lr: number | null;
    gra: number | null;
  };
  overallBand: number | null;
  reason?: string;
}

/**
 * Strict client-side validator for server Writing API responses (/api/evaluate-writing,
 * /api/writing/deep-evaluate, /api/grammar-feedback/writing).
 * Enforces:
 * - Required assessmentStatus === 'evaluated' (honors 'insufficient_evidence' with all null scores)
 * - Finite numeric values in [1.0, 9.0] strictly on 0.5 increments for all 4 criteria + overallBand
 * - Authoritative 4-criterion math agreement (overallBand === roundOfficialIELTSBand((ta+cc+lr+gra)/4))
 * - Rejects malformed, partial, or non-half-band payloads as 'unavailable' with all null scores.
 */
export function validateClientWritingEvaluation(rawPayload: any): ClientWritingValidationResult {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return {
      valid: false,
      assessmentStatus: 'unavailable',
      criteria: { ta: null, cc: null, lr: null, gra: null },
      overallBand: null,
      reason: 'Writing evaluation response was empty or malformed. No score was assigned.'
    };
  }

  if (rawPayload.assessmentStatus === 'insufficient_evidence') {
    return {
      valid: false,
      assessmentStatus: 'insufficient_evidence',
      criteria: { ta: null, cc: null, lr: null, gra: null },
      overallBand: null,
      reason:
        typeof rawPayload.error === 'string' && rawPayload.error.trim()
          ? rawPayload.error
          : typeof rawPayload.trComment === 'string' && rawPayload.trComment.trim()
          ? rawPayload.trComment
          : 'Submission did not contain sufficient assessable writing evidence.'
    };
  }

  if (
    rawPayload.isValidAttempt === false ||
    rawPayload.assessmentStatus !== 'evaluated'
  ) {
    return {
      valid: false,
      assessmentStatus: 'unavailable',
      criteria: { ta: null, cc: null, lr: null, gra: null },
      overallBand: null,
      reason:
        typeof rawPayload.error === 'string' && rawPayload.error.trim()
          ? rawPayload.error
          : 'Writing evaluation did not return a verified evaluated status. No score was assigned.'
    };
  }

  const ta = validateCriterionBand(
    rawPayload.trScore ?? rawPayload.taScore ?? rawPayload.ta ?? rawPayload.estimatedBands?.taskAchievement
  );
  const cc = validateCriterionBand(
    rawPayload.ccScore ?? rawPayload.cc ?? rawPayload.estimatedBands?.coherenceCohesion
  );
  const lr = validateCriterionBand(
    rawPayload.lrScore ?? rawPayload.lr ?? rawPayload.estimatedBands?.lexicalResource
  );
  const gra = validateCriterionBand(
    rawPayload.graScore ?? rawPayload.gra ?? rawPayload.estimatedBands?.grammaticalRange
  );
  const rawOverall = validateCriterionBand(
    rawPayload.overallBand ?? rawPayload.estimatedBands?.overall
  );

  if (ta === null || cc === null || lr === null || gra === null || rawOverall === null) {
    return {
      valid: false,
      assessmentStatus: 'unavailable',
      criteria: { ta: null, cc: null, lr: null, gra: null },
      overallBand: null,
      reason:
        'Writing evaluation returned incomplete, out-of-range, or non-half-band criterion scores. No fallback score was fabricated.'
    };
  }

  const expectedOverall = roundOfficialIELTSBand((ta + cc + lr + gra) / 4);
  if (Math.abs(rawOverall - expectedOverall) > 1e-6) {
    return {
      valid: false,
      assessmentStatus: 'unavailable',
      criteria: { ta: null, cc: null, lr: null, gra: null },
      overallBand: null,
      reason:
        'Writing overall band did not match the 4-criterion IELTS average. Response rejected rather than fabricating a score.'
    };
  }

  return {
    valid: true,
    assessmentStatus: 'evaluated',
    criteria: { ta, cc, lr, gra },
    overallBand: expectedOverall
  };
}

// ============================================================================
// DEDICATED SHADOWING PRACTICE EVALUATOR (ZERO IELTS BAND FABRICATION)
// ============================================================================

export type ShadowingTokenStatus = 'matched' | 'near_match' | 'missing' | 'substituted' | 'extra';

export interface ShadowingAlignedToken {
  targetWord: string | null;
  spokenWord: string | null;
  status: ShadowingTokenStatus;
}

export interface ShadowingPracticeEvaluation {
  status: 'valid' | 'insufficient_speech' | 'recognition_failed';
  /** Practice-only word match accuracy (0–100). NEVER an IELTS Band Score. */
  wordAccuracyPct: number;
  matchedCount: number;
  nearMatchCount: number;
  missingCount: number;
  substitutedCount: number;
  extraCount: number;
  targetWordCount: number;
  spokenWordCount: number;
  wpm: number;
  paceStatus: 'too_slow' | 'ideal' | 'too_fast' | 'unknown';
  timingSyncStatus: 'aligned' | 'slightly_off' | 'out_of_sync' | 'unmeasured';
  recordingQuality: 'audio_captured' | 'transcript_only' | 'no_audio';
  recognitionConfidence: number | null;
  alignment: ShadowingAlignedToken[];
  missingWords: string[];
  substitutedPairs: Array<{ expected: string; heard: string }>;
  extraWords: string[];
  honestSummary: string;
  practiceGuidance: string;
  disclaimer: string;
}

function normalizeWordForShadowing(raw: string): string {
  return (raw || '').toLowerCase().replace(/[^a-z0-9']/g, '');
}

function levenshteinCharDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[n];
}

function isNearLexicalMatch(target: string, spoken: string): boolean {
  if (!target || !spoken) return false;
  if (target === spoken) return true;
  if (target.length < 4 || spoken.length < 4) return false;
  const dist = levenshteinCharDistance(target, spoken);
  return dist <= 1 || (target.length >= 7 && dist <= 2 && target.slice(0, 3) === spoken.slice(0, 3));
}

/**
 * Evaluates a Shadowing practice attempt using exact Needleman-Wunsch / Levenshtein
 * word-level alignment. Produces honest practice metrics ONLY and NEVER fabricates
 * an IELTS Band Score or claims acoustic pronunciation mastery from STT text alone.
 */
export function evaluateShadowingAttempt(input: {
  targetText: string;
  spokenTranscript: string;
  elapsedSec: number;
  expectedDurationSec?: number;
  hasAudioBlob?: boolean;
  recognitionConfidence?: number | null;
  recognitionError?: string | null;
}): ShadowingPracticeEvaluation {
  const DISCLAIMER =
    'Practice Metrics Only — Not an IELTS Band Score. Browser speech recognition measures word match and pacing, not acoustic phoneme quality, intonation, or official IELTS Pronunciation.';

  const targetDisplayTokens = (input.targetText || '').trim().split(/\s+/).filter(Boolean);
  const targetNorm = targetDisplayTokens.map(normalizeWordForShadowing).filter(Boolean);
  const spokenDisplayTokens = (input.spokenTranscript || '').trim().split(/\s+/).filter(Boolean);
  const spokenNorm = spokenDisplayTokens.map(normalizeWordForShadowing).filter(Boolean);

  const recordingQuality: ShadowingPracticeEvaluation['recordingQuality'] = input.hasAudioBlob
    ? 'audio_captured'
    : spokenNorm.length > 0
    ? 'transcript_only'
    : 'no_audio';

  const confidence =
    typeof input.recognitionConfidence === 'number' &&
    Number.isFinite(input.recognitionConfidence) &&
    input.recognitionConfidence >= 0 &&
    input.recognitionConfidence <= 1
      ? Number(input.recognitionConfidence.toFixed(2))
      : null;

  // Handle recognition failure or empty/unintelligible speech honestly
  if (input.recognitionError && spokenNorm.length === 0) {
    return {
      status: 'recognition_failed',
      wordAccuracyPct: 0,
      matchedCount: 0,
      nearMatchCount: 0,
      missingCount: targetNorm.length,
      substitutedCount: 0,
      extraCount: 0,
      targetWordCount: targetNorm.length,
      spokenWordCount: 0,
      wpm: 0,
      paceStatus: 'unknown',
      timingSyncStatus: 'unmeasured',
      recordingQuality,
      recognitionConfidence: confidence,
      alignment: targetDisplayTokens.map((w) => ({
        targetWord: w,
        spokenWord: null,
        status: 'missing'
      })),
      missingWords: targetDisplayTokens,
      substitutedPairs: [],
      extraWords: [],
      honestSummary: `Speech recognition failed (${input.recognitionError}). No practice accuracy score could be calculated.`,
      practiceGuidance: 'Check microphone permission, reduce background noise, and try recording again.',
      disclaimer: DISCLAIMER
    };
  }

  if (spokenNorm.length < 2) {
    return {
      status: 'insufficient_speech',
      wordAccuracyPct: 0,
      matchedCount: 0,
      nearMatchCount: 0,
      missingCount: targetNorm.length,
      substitutedCount: 0,
      extraCount: 0,
      targetWordCount: targetNorm.length,
      spokenWordCount: spokenNorm.length,
      wpm: 0,
      paceStatus: 'unknown',
      timingSyncStatus: 'unmeasured',
      recordingQuality,
      recognitionConfidence: confidence,
      alignment: targetDisplayTokens.map((w) => ({
        targetWord: w,
        spokenWord: null,
        status: 'missing'
      })),
      missingWords: targetDisplayTokens,
      substitutedPairs: [],
      extraWords: [],
      honestSummary:
        spokenNorm.length === 0
          ? 'No intelligible speech was captured. Please speak clearly into your microphone and retry.'
          : 'Only 1 word was recognized — not enough speech to measure shadowing alignment.',
      practiceGuidance: 'Speak at normal volume near your microphone and read the full model sentence.',
      disclaimer: DISCLAIMER
    };
  }

  // Dynamic Programming word-level alignment (minimum edit distance with exact/near/sub/del/ins)
  const m = targetNorm.length;
  const n = spokenNorm.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  const op: Array<Array<'match' | 'near' | 'sub' | 'del' | 'ins'>> = Array.from(
    { length: m + 1 },
    () => Array(n + 1).fill('match')
  );

  for (let i = 1; i <= m; i++) {
    dp[i][0] = i;
    op[i][0] = 'del';
  }
  for (let j = 1; j <= n; j++) {
    dp[0][j] = j;
    op[0][j] = 'ins';
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const exact = targetNorm[i - 1] === spokenNorm[j - 1];
      const near = !exact && isNearLexicalMatch(targetNorm[i - 1], spokenNorm[j - 1]);
      const diagCost = dp[i - 1][j - 1] + (exact ? 0 : near ? 0.35 : 1.35);
      const delCost = dp[i - 1][j] + 1.0;
      const insCost = dp[i][j - 1] + 1.0;

      if (diagCost <= delCost && diagCost <= insCost) {
        dp[i][j] = diagCost;
        op[i][j] = exact ? 'match' : near ? 'near' : 'sub';
      } else if (delCost <= insCost) {
        dp[i][j] = delCost;
        op[i][j] = 'del';
      } else {
        dp[i][j] = insCost;
        op[i][j] = 'ins';
      }
    }
  }

  // Backtrack optimal alignment
  const alignment: ShadowingAlignedToken[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    const step = op[i][j];
    if (i > 0 && j > 0 && (step === 'match' || step === 'near' || step === 'sub')) {
      alignment.push({
        targetWord: targetDisplayTokens[i - 1],
        spokenWord: spokenDisplayTokens[j - 1],
        status: step === 'match' ? 'matched' : step === 'near' ? 'near_match' : 'substituted'
      });
      i--;
      j--;
    } else if (i > 0 && (j === 0 || step === 'del')) {
      alignment.push({
        targetWord: targetDisplayTokens[i - 1],
        spokenWord: null,
        status: 'missing'
      });
      i--;
    } else {
      alignment.push({
        targetWord: null,
        spokenWord: spokenDisplayTokens[j - 1],
        status: 'extra'
      });
      j--;
    }
  }
  alignment.reverse();

  let matchedCount = 0;
  let nearMatchCount = 0;
  let missingCount = 0;
  let substitutedCount = 0;
  let extraCount = 0;
  const missingWords: string[] = [];
  const substitutedPairs: Array<{ expected: string; heard: string }> = [];
  const extraWords: string[] = [];

  for (const tok of alignment) {
    if (tok.status === 'matched') matchedCount++;
    else if (tok.status === 'near_match') nearMatchCount++;
    else if (tok.status === 'missing') {
      missingCount++;
      if (tok.targetWord) missingWords.push(tok.targetWord);
    } else if (tok.status === 'substituted') {
      substitutedCount++;
      if (tok.targetWord && tok.spokenWord) {
        substitutedPairs.push({ expected: tok.targetWord, heard: tok.spokenWord });
      }
    } else if (tok.status === 'extra') {
      extraCount++;
      if (tok.spokenWord) extraWords.push(tok.spokenWord);
    }
  }

  // Word-Error-Rate grounded accuracy (penalizes missing, substituted, AND extra words)
  const denominator = Math.max(1, targetNorm.length + extraCount);
  const weightedCorrect = matchedCount + nearMatchCount * 0.7;
  const wordAccuracyPct = Math.max(0, Math.min(100, Math.round((weightedCorrect / denominator) * 100)));

  const safeElapsed = Math.max(1, input.elapsedSec || 1);
  const wpm = Math.round((spokenNorm.length / safeElapsed) * 60);

  let paceStatus: ShadowingPracticeEvaluation['paceStatus'] = 'unknown';
  if (safeElapsed >= 2 && spokenNorm.length >= 4) {
    if (wpm < 95) paceStatus = 'too_slow';
    else if (wpm > 175) paceStatus = 'too_fast';
    else paceStatus = 'ideal';
  }

  let timingSyncStatus: ShadowingPracticeEvaluation['timingSyncStatus'] = 'unmeasured';
  if (typeof input.expectedDurationSec === 'number' && input.expectedDurationSec > 1) {
    const ratio = safeElapsed / input.expectedDurationSec;
    if (ratio >= 0.75 && ratio <= 1.35) timingSyncStatus = 'aligned';
    else if (ratio >= 0.55 && ratio <= 1.65) timingSyncStatus = 'slightly_off';
    else timingSyncStatus = 'out_of_sync';
  }

  let honestSummary = '';
  if (wordAccuracyPct >= 90 && extraCount <= 1) {
    honestSummary = `Strong transcript alignment (${wordAccuracyPct}%). Listen back to your recording against the model audio to check stress and intonation yourself.`;
  } else if (wordAccuracyPct >= 70) {
    honestSummary = `Partial alignment (${wordAccuracyPct}%): ${missingCount} missing, ${substitutedCount} substituted, ${extraCount} extra word(s). Replay the model slowly and repeat missed phrases.`;
  } else {
    honestSummary = `Low alignment (${wordAccuracyPct}%): ${missingCount} missing, ${substitutedCount} substituted, ${extraCount} extra word(s). Slow down to 0.75× and shadow one phrase at a time.`;
  }

  let practiceGuidance = '';
  if (paceStatus === 'too_slow') {
    practiceGuidance = `Pace was slow (${wpm} WPM). Practice chunking 3–5 words together without pausing between every word.`;
  } else if (paceStatus === 'too_fast') {
    practiceGuidance = `Pace was rushed (${wpm} WPM). Slow down slightly so consonant endings and stressed syllables stay crisp.`;
  } else if (paceStatus === 'ideal') {
    practiceGuidance = `Speaking pace (${wpm} WPM) was within a comfortable conversational range.`;
  } else {
    practiceGuidance = 'Record a full sentence pass to measure your conversational pace (WPM).';
  }

  return {
    status: 'valid',
    wordAccuracyPct,
    matchedCount,
    nearMatchCount,
    missingCount,
    substitutedCount,
    extraCount,
    targetWordCount: targetNorm.length,
    spokenWordCount: spokenNorm.length,
    wpm,
    paceStatus,
    timingSyncStatus,
    recordingQuality,
    recognitionConfidence: confidence,
    alignment,
    missingWords,
    substitutedPairs,
    extraWords,
    honestSummary,
    practiceGuidance,
    disclaimer: DISCLAIMER
  };
}
