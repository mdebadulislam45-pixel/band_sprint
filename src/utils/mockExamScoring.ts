import { QuestionItem, MockExamSet, SpeakingTopicSet, SPEAKING_TOPIC_BANK } from '../data/mockExams';
import { SpeakingAnswerRecord } from '../types/speakingTypes';
import {
  calculateOfficialListeningBand,
  calculateOfficialAcademicReadingBand,
  calculateOfficialGeneralTrainingReadingBand,
  isAnswerCorrect
} from './listeningAnswerEvaluator';
import {
  checkWritingWordThreshold,
  evaluateWritingSubmission,
  WritingEvaluationReport
} from '../services/WritingEvaluationService';
import { roundOfficialIELTSBand } from './scoringIntegrity';

export type FullMockSkillKey = 'listening' | 'reading' | 'writing' | 'speaking';

export interface SpeakingTurnValidationResult {
  isCompleteEvaluated: boolean;
  isTranscriptOnlyDiagnostic: boolean;
  band: number | null;
  diagnosticIndex: number | null;
  reason: string | null;
}

/**
 * Validates an individual IELTS criterion or productive skill band (1.0–9.0 in 0.5 increments).
 * Rejects null, undefined, NaN, Infinity, 0.0, out-of-range values, and non-half-band numbers.
 */
export function isValidIeltsCriterionBand(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  if (value < 1.0 || value > 9.0) return false;
  return Math.abs(value * 2 - Math.round(value * 2)) < 1e-6;
}

/**
 * Validates whether a single Speaking turn qualifies as a genuinely completed four-criterion
 * audio-backed IELTS Speaking turn for Full Mock scoring.
 *
 * Strictly requires positive evidence:
 * - assessmentStatus === 'evaluated'
 * - evidenceMode === 'audio_and_transcript'
 * - pronunciationObservable === true
 * - isPartialAssessment !== true
 * - no unassessedCriteria entries
 * - valid finite overallBand in [1.0, 9.0] (0.5 increments) matching the 4-criterion IELTS average
 * - all four criterion bands (FC, LR, GRA, PR) valid in [1.0, 9.0] (0.5 increments)
 *
 * Transcript-only turns (3 valid criteria, pronunciation unassessed) are recognized separately
 * as reviewable diagnostics (isTranscriptOnlyDiagnostic: true) but NEVER qualify as complete Speaking.
 */
export function validateSpeakingTurnForFullMock(
  record: SpeakingAnswerRecord | null | undefined
): SpeakingTurnValidationResult {
  if (!record || !record.instantFeedback) {
    return {
      isCompleteEvaluated: false,
      isTranscriptOnlyDiagnostic: false,
      band: null,
      diagnosticIndex: null,
      reason: 'missing_feedback'
    };
  }

  const fb = record.instantFeedback;
  const effectiveWordCount =
    typeof record.wordCount === 'number' && Number.isFinite(record.wordCount) && record.wordCount > 0
      ? record.wordCount
      : (record.transcript || '').trim().split(/\s+/).filter(Boolean).length;

  if (fb.assessmentStatus === 'unavailable') {
    return {
      isCompleteEvaluated: false,
      isTranscriptOnlyDiagnostic: false,
      band: null,
      diagnosticIndex: null,
      reason: 'unavailable'
    };
  }

  if (
    effectiveWordCount < 5 ||
    fb.isValidAttempt === false ||
    fb.assessmentStatus === 'insufficient_evidence'
  ) {
    return {
      isCompleteEvaluated: false,
      isTranscriptOnlyDiagnostic: false,
      band: null,
      diagnosticIndex: null,
      reason: 'insufficient_evidence'
    };
  }

  const fc = fb.criteria?.fc ?? fb.estimatedBands?.fluency;
  const lr = fb.criteria?.lr ?? fb.estimatedBands?.lexical;
  const gra = fb.criteria?.gra ?? fb.estimatedBands?.grammar;
  const pr = fb.criteria?.pr ?? fb.estimatedBands?.pronunciation;

  const hasThreeTranscriptCriteria =
    isValidIeltsCriterionBand(fc) &&
    isValidIeltsCriterionBand(lr) &&
    isValidIeltsCriterionBand(gra);
  const hasAllFourValidCriteria = hasThreeTranscriptCriteria && isValidIeltsCriterionBand(pr);

  const hasUnassessedCriteria =
    Array.isArray(fb.unassessedCriteria) && fb.unassessedCriteria.length > 0;
  const isFlaggedPartial = fb.isPartialAssessment === true;

  // Positive evidence gate for complete 4-criterion audio-backed Speaking turn
  const hasPositiveAudioProvenance =
    fb.assessmentStatus === 'evaluated' &&
    fb.evidenceMode === 'audio_and_transcript' &&
    fb.pronunciationObservable === true &&
    !isFlaggedPartial &&
    !hasUnassessedCriteria;

  if (hasPositiveAudioProvenance && hasAllFourValidCriteria && isValidIeltsCriterionBand(fb.overallBand)) {
    const expectedOverall = roundOfficialIELTSBand((fc + lr + gra + pr) / 4);
    if (Math.abs(fb.overallBand - expectedOverall) < 1e-6) {
      return {
        isCompleteEvaluated: true,
        isTranscriptOnlyDiagnostic: false,
        band: fb.overallBand,
        diagnosticIndex: fb.overallBand,
        reason: null
      };
    }
    return {
      isCompleteEvaluated: false,
      isTranscriptOnlyDiagnostic: false,
      band: null,
      diagnosticIndex: null,
      reason: 'inconsistent_overall_vs_criteria'
    };
  }

  // Transcript-only 3-criterion diagnostic turn: reviewable, NEVER counts toward complete Speaking
  if (
    fb.assessmentStatus === 'partial_transcript_only' &&
    hasThreeTranscriptCriteria &&
    fb.pronunciationObservable !== true
  ) {
    const diagnosticIndex = isValidIeltsCriterionBand(fb.partialThreeCriterionIndex)
      ? fb.partialThreeCriterionIndex
      : roundOfficialIELTSBand((fc + lr + gra) / 3);
    return {
      isCompleteEvaluated: false,
      isTranscriptOnlyDiagnostic: true,
      band: null,
      diagnosticIndex,
      reason: 'partial_transcript_only'
    };
  }

  // Missing provenance, fabricated flags, null pronunciation, or invalid criteria
  const reason = !hasAllFourValidCriteria
    ? 'invalid_or_missing_criteria'
    : fb.pronunciationObservable !== true
    ? 'pronunciation_not_observable'
    : fb.evidenceMode !== 'audio_and_transcript'
    ? 'missing_audio_evidence_provenance'
    : fb.assessmentStatus !== 'evaluated'
    ? 'status_not_evaluated'
    : 'invalid_overall_band';

  return {
    isCompleteEvaluated: false,
    isTranscriptOnlyDiagnostic: false,
    band: null,
    diagnosticIndex: null,
    reason
  };
}

export interface QuestionEvaluationResult {
  questionId: number;
  section: 'listening' | 'reading';
  rawUserAns: string;
  trimmedUserAns: string;
  isUnanswered: boolean;
  isCorrect: boolean;
  /** Strictly true ONLY when the question was answered and the answer is wrong. Never true for unanswered questions. */
  isIncorrect: boolean;
  /** True when either incorrect or unanswered (for review filter tabs). */
  needsReview: boolean;
}

export interface VaultMistakeCandidate {
  questionId: number;
  module: 'listening' | 'reading';
  title: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  question: QuestionItem;
  isUnanswered: boolean;
  isIncorrect: boolean;
}

export interface MockExamScoringInput {
  questions: QuestionItem[];
  answers: Record<number | string, string>;
  essayText: string;
  task1Text: string;
  speakingAnswers: SpeakingAnswerRecord[];
  format?: 'Academic' | 'General Training';
  speakingTopicSet?: SpeakingTopicSet;
}

export interface MockExamScoringResult {
  status: 'Complete' | 'Incomplete';
  isCompleteFullMock: boolean;
  incompleteSkills: FullMockSkillKey[];
  incompleteSections: string[];

  // Listening metrics
  listeningTotal: number;
  listeningAttempted: number;
  listeningCorrect: number;
  listeningIncorrect: number;
  listeningUnanswered: number;
  isListeningAssessed: boolean;
  isListeningComplete: boolean;
  lBand: number | null;

  // Reading metrics
  readingTotal: number;
  readingAttempted: number;
  readingCorrect: number;
  readingIncorrect: number;
  readingUnanswered: number;
  isReadingAssessed: boolean;
  isReadingComplete: boolean;
  rBand: number | null;

  // Writing metrics
  task1WordCount: number;
  wordCount: number;
  task1MinWords: number;
  task2MinWords: number;
  task1TargetWords: number;
  task2TargetWords: number;
  /** Diagnostic eligibility (>= 30 words & non-gibberish for Task 1) */
  isTask1Valid: boolean;
  /** Diagnostic eligibility (>= 50 words & non-gibberish for Task 2) */
  isTask2Valid: boolean;
  /** Full IELTS Task 1 completion (>= 150 words & diagnostically valid) */
  isTask1Complete: boolean;
  /** Full IELTS Task 2 completion (>= 250 words & diagnostically valid) */
  isTask2Complete: boolean;
  isWritingPartial: boolean;
  isWritingAssessed: boolean;
  isWritingComplete: boolean;
  t1Report: WritingEvaluationReport | null;
  t2Report: WritingEvaluationReport | null;
  /** Heuristic diagnostic band when at least one task is diagnostically eligible (even if under 150w/250w) */
  wDiagnosticBand: number | null;
  /** Full-mock Writing band (strictly null unless BOTH Task 1 >= 150w and Task 2 >= 250w are complete) */
  wBand: number | null;

  // Speaking metrics
  speakingEvaluatedCount: number;
  speakingTranscriptOnlyCount: number;
  speakingRequiredCount: number;
  speakingPart1Evaluated: number;
  speakingPart2Evaluated: number;
  speakingPart3Evaluated: number;
  isSpeakingPartial: boolean;
  isSpeakingTranscriptOnly: boolean;
  isSpeakingAssessed: boolean;
  isSpeakingComplete: boolean;
  speakingAssessmentStatus: 'evaluated' | 'partial_transcript_only' | 'insufficient_evidence' | 'unavailable';
  speakingPronunciationObservable: boolean;
  speakingIncompleteReason: string | null;
  /** Diagnostic band/index when at least one Speaking turn has valid evaluated or transcript-only diagnostics */
  sDiagnosticBand: number | null;
  /** Full-mock Speaking band (strictly null unless all required Part 1–3 prompts have complete 4-criterion audio-backed evaluations) */
  sBand: number | null;

  // Overall band (strictly null when any required skill or writing/speaking component is incomplete)
  overall: number | null;
}

/**
 * Evaluates a single Listening or Reading question submission using the canonical
 * isAnswerCorrect() rules while strictly separating unanswered items from incorrect items.
 */
export function evaluateQuestionResponse(
  question: QuestionItem,
  rawUserAns: string | undefined | null
): QuestionEvaluationResult {
  const safeRaw = rawUserAns ?? '';
  const trimmedUserAns = safeRaw.trim();
  const isUnanswered = trimmedUserAns.length === 0;
  const isCorrect = !isUnanswered && isAnswerCorrect(question as any, safeRaw);
  const isIncorrect = !isUnanswered && !isCorrect;

  return {
    questionId: question.id,
    section: question.section,
    rawUserAns: safeRaw,
    trimmedUserAns,
    isUnanswered,
    isCorrect,
    isIncorrect,
    needsReview: !isCorrect
  };
}

/**
 * Returns questions eligible for Mistake Vault synchronization using the exact same
 * production isAnswerCorrect() logic as scoring and review cards.
 * By default, only genuinely incorrect attempted answers are returned as errors unless
 * includeUnanswered is explicitly set to true.
 */
export function getQuestionsForMistakeVault(
  questions: QuestionItem[],
  answers: Record<number | string, string>,
  includeUnanswered: boolean = false
): VaultMistakeCandidate[] {
  const results: VaultMistakeCandidate[] = [];

  const seenQuestionKeys = new Set<string>();
  for (const q of questions) {
    const key = `${q.section}:${q.id}`;
    if (seenQuestionKeys.has(key)) continue;
    seenQuestionKeys.add(key);
    const evalStatus = evaluateQuestionResponse(q, answers[q.id]);
    if (evalStatus.isIncorrect || (includeUnanswered && evalStatus.isUnanswered)) {
      results.push({
        questionId: q.id,
        module: q.section,
        title: `Live Mock Error: Q${q.id} (${q.type})`,
        userAnswer: evalStatus.isUnanswered ? '(unanswered)' : evalStatus.trimmedUserAns,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        question: q,
        isUnanswered: evalStatus.isUnanswered,
        isIncorrect: evalStatus.isIncorrect
      });
    }
  }

  return results;
}

/**
 * Pure production scoring function for the 4-skill Live Mock Examination.
 * Enforces strict full-mock completeness:
 * - Listening: all questions must be answered (listeningTotal > 0 && listeningUnanswered === 0).
 * - Reading: all questions must be answered (readingTotal > 0 && readingUnanswered === 0).
 * - Writing: separates diagnostic eligibility (Task 1 >= 30 words, Task 2 >= 50 words) from
 *   full IELTS Writing completion (Task 1 >= 150 words AND Task 2 >= 250 words).
 *   Under-length or single-task submissions receive diagnostic reports (t1Report, t2Report, wDiagnosticBand),
 *   while wBand remains null unless both tasks satisfy full IELTS completion.
 * - Speaking: derives required prompts across Part 1, Part 2 (Cue Card), and Part 3 from the configured
 *   SpeakingTopicSet (2 Part 1 questions + 1 Part 2 cue card + 2 Part 3 questions = 5 prompts).
 *   Partial responses preserve sDiagnosticBand while sBand remains null until all required components are evaluated.
 * - Overall Band: computed with a strict divisor of 4 ONLY when all four skills are complete.
 *   Never removes missing skills from the divisor and never awards a completed overall band
 *   to an incomplete attempt.
 */
export function calculateMockExamScores(input: MockExamScoringInput): MockExamScoringResult {
  const {
    questions = [],
    answers = {},
    essayText = '',
    task1Text = '',
    speakingAnswers = [],
    format = 'Academic',
    speakingTopicSet
  } = input;

  let listeningTotal = 0;
  let listeningAttempted = 0;
  let listeningCorrect = 0;
  let listeningIncorrect = 0;
  let listeningUnanswered = 0;

  let readingTotal = 0;
  let readingAttempted = 0;
  let readingCorrect = 0;
  let readingIncorrect = 0;
  let readingUnanswered = 0;

  const seenQuestionKeys = new Set<string>();
  for (const q of questions) {
    const key = `${q.section}:${q.id}`;
    if (seenQuestionKeys.has(key)) continue;
    seenQuestionKeys.add(key);
    const evalRes = evaluateQuestionResponse(q, answers[q.id]);

    if (q.section === 'listening') {
      listeningTotal++;
      if (evalRes.isUnanswered) {
        listeningUnanswered++;
      } else {
        listeningAttempted++;
        if (evalRes.isCorrect) listeningCorrect++;
        else listeningIncorrect++;
      }
    } else if (q.section === 'reading') {
      readingTotal++;
      if (evalRes.isUnanswered) {
        readingUnanswered++;
      } else {
        readingAttempted++;
        if (evalRes.isCorrect) readingCorrect++;
        else readingIncorrect++;
      }
    }
  }

  // A module is assessed only if it has questions and at least one question was attempted.
  // A module is complete only if it has questions and all questions were answered.
  const isListeningAssessed = listeningTotal > 0 && listeningAttempted > 0;
  const isListeningComplete = listeningTotal > 0 && listeningUnanswered === 0;
  const lBand: number | null = isListeningAssessed
    ? calculateOfficialListeningBand(listeningCorrect, listeningTotal)
    : null;

  const isReadingAssessed = readingTotal > 0 && readingAttempted > 0;
  const isReadingComplete = readingTotal > 0 && readingUnanswered === 0;
  const rBand: number | null = isReadingAssessed
    ? format === 'General Training'
      ? calculateOfficialGeneralTrainingReadingBand(readingCorrect, readingTotal)
      : calculateOfficialAcademicReadingBand(readingCorrect, readingTotal)
    : null;

  // Writing Task 1 & Task 2 Evaluation:
  // 1. Diagnostic eligibility gate (Task 1 >= 30 words, Task 2 >= 50 words, non-gibberish)
  const writingGate1 = checkWritingWordThreshold(task1Text, 'task1');
  const writingGate2 = checkWritingWordThreshold(essayText, 'task2');
  const task1WordCount = writingGate1.wordCount;
  const wordCount = writingGate2.wordCount;
  const task1MinWords = writingGate1.minRequiredWords; // 30 (diagnostic gate)
  const task2MinWords = writingGate2.minRequiredWords; // 50 (diagnostic gate)
  const task1TargetWords = 150; // IELTS Task 1 minimum word target
  const task2TargetWords = 250; // IELTS Task 2 minimum word target

  const isTask1Valid = writingGate1.isValidAttempt;
  const isTask2Valid = writingGate2.isValidAttempt;

  const t1Report: WritingEvaluationReport | null = isTask1Valid
    ? evaluateWritingSubmission(task1Text, 'task1')
    : null;
  const t2Report: WritingEvaluationReport | null = isTask2Valid
    ? evaluateWritingSubmission(essayText, 'task2')
    : null;

  // 2. Full IELTS Writing completion requires BOTH tasks to be diagnostically valid, produce valid bands, AND meet 150w / 250w targets
  const hasValidT1Score = Boolean(t1Report && isValidIeltsCriterionBand(t1Report.overallBand));
  const hasValidT2Score = Boolean(t2Report && isValidIeltsCriterionBand(t2Report.overallBand));
  const isTask1Complete = isTask1Valid && hasValidT1Score && task1WordCount >= task1TargetWords;
  const isTask2Complete = isTask2Valid && hasValidT2Score && wordCount >= task2TargetWords;
  const isWritingComplete = isTask1Complete && isTask2Complete;
  const isWritingAssessed = hasValidT1Score || hasValidT2Score;
  const isWritingPartial = isWritingAssessed && !isWritingComplete;

  let wDiagnosticBand: number | null = null;
  if (hasValidT1Score && hasValidT2Score && t1Report && t2Report) {
    const weightedDiag = (t2Report.overallBand * 2 + t1Report.overallBand) / 3;
    wDiagnosticBand = roundOfficialIELTSBand(weightedDiag);
  } else if (hasValidT2Score && t2Report) {
    wDiagnosticBand = t2Report.overallBand;
  } else if (hasValidT1Score && t1Report) {
    wDiagnosticBand = t1Report.overallBand;
  }

  let wBand: number | null = null;
  if (isWritingComplete && t1Report && t2Report && hasValidT1Score && hasValidT2Score) {
    const weighted = (t2Report.overallBand * 2 + t1Report.overallBand) / 3;
    wBand = roundOfficialIELTSBand(weighted);
  }

  // Speaking Evaluation:
  // Derive required Speaking turns across Parts 1, 2, and 3 from the configured SpeakingTopicSet
  const activeTopicSet = speakingTopicSet ?? SPEAKING_TOPIC_BANK[0];
  const requiredPart1Turns = activeTopicSet?.part1Questions?.length ?? 2;
  const requiredPart2Turns = activeTopicSet?.part2CueCard ? 1 : 1;
  const requiredPart3Turns = activeTopicSet?.part3Questions?.length ?? 2;
  const speakingRequiredCount = requiredPart1Turns + requiredPart2Turns + requiredPart3Turns;

  // Deduplicate speaking answers by questionId (retaining latest turn record) and strictly validate positive audio evidence
  const uniqueSpeakingByQuestion = new Map<string, SpeakingAnswerRecord>();
  (speakingAnswers || []).forEach((rec, idx) => {
    if (!rec) return;
    const key = rec.questionId || `turn_${rec.part}_${idx}`;
    uniqueSpeakingByQuestion.set(key, rec);
  });

  let speakingPart1Evaluated = 0;
  let speakingPart2Evaluated = 0;
  let speakingPart3Evaluated = 0;
  let speakingTranscriptOnlyCount = 0;
  let speakingUnavailableCount = 0;
  let speakingInvalidProvenanceCount = 0;
  const evaluatedSpeakingBands: number[] = [];
  const diagnosticSpeakingIndices: number[] = [];

  for (const a of uniqueSpeakingByQuestion.values()) {
    const turnValidation = validateSpeakingTurnForFullMock(a);

    if (turnValidation.isCompleteEvaluated && turnValidation.band !== null) {
      evaluatedSpeakingBands.push(turnValidation.band);
      diagnosticSpeakingIndices.push(turnValidation.band);
      if (a.part === 1) speakingPart1Evaluated++;
      else if (a.part === 2) speakingPart2Evaluated++;
      else if (a.part === 3) speakingPart3Evaluated++;
    } else if (turnValidation.isTranscriptOnlyDiagnostic && turnValidation.diagnosticIndex !== null) {
      speakingTranscriptOnlyCount++;
      diagnosticSpeakingIndices.push(turnValidation.diagnosticIndex);
    } else if (turnValidation.reason === 'unavailable') {
      speakingUnavailableCount++;
    } else if (
      turnValidation.reason &&
      turnValidation.reason !== 'missing_feedback' &&
      turnValidation.reason !== 'insufficient_evidence'
    ) {
      speakingInvalidProvenanceCount++;
    }
  }

  const speakingEvaluatedCount = evaluatedSpeakingBands.length;
  const isSpeakingAssessed = speakingEvaluatedCount > 0 || speakingTranscriptOnlyCount > 0;
  const isSpeakingComplete =
    speakingPart1Evaluated >= requiredPart1Turns &&
    speakingPart2Evaluated >= requiredPart2Turns &&
    speakingPart3Evaluated >= requiredPart3Turns &&
    speakingEvaluatedCount >= speakingRequiredCount &&
    speakingTranscriptOnlyCount === 0;
  const isSpeakingPartial = isSpeakingAssessed && !isSpeakingComplete;
  const isSpeakingTranscriptOnly = !isSpeakingComplete && speakingTranscriptOnlyCount > 0;
  const speakingPronunciationObservable = isSpeakingComplete;

  const speakingAssessmentStatus: MockExamScoringResult['speakingAssessmentStatus'] =
    isSpeakingComplete
      ? 'evaluated'
      : speakingTranscriptOnlyCount > 0
      ? 'partial_transcript_only'
      : speakingUnavailableCount > 0 || speakingInvalidProvenanceCount > 0
      ? 'unavailable'
      : 'insufficient_evidence';

  const sDiagnosticBand: number | null =
    diagnosticSpeakingIndices.length > 0
      ? roundOfficialIELTSBand(
          diagnosticSpeakingIndices.reduce((acc, val) => acc + val, 0) /
            diagnosticSpeakingIndices.length
        )
      : null;

  const sBand: number | null =
    isSpeakingComplete && evaluatedSpeakingBands.length >= speakingRequiredCount
      ? roundOfficialIELTSBand(
          evaluatedSpeakingBands.reduce((acc, val) => acc + val, 0) /
            evaluatedSpeakingBands.length
        )
      : null;

  let speakingIncompleteReason: string | null = null;
  if (!isSpeakingComplete) {
    if (speakingTranscriptOnlyCount > 0) {
      speakingIncompleteReason = `Transcript-only Speaking (${speakingTranscriptOnlyCount}/${speakingRequiredCount} turns — Pronunciation unassessed; audio evidence required for Full Mock)`;
    } else if (speakingInvalidProvenanceCount > 0) {
      speakingIncompleteReason =
        'Speaking evidence incomplete (missing Pronunciation observation, audio provenance, or valid 4-criterion scores)';
    } else if (speakingUnavailableCount > 0 && speakingEvaluatedCount === 0) {
      speakingIncompleteReason = 'Speaking AI evaluation unavailable (no complete turns scored)';
    } else if (speakingEvaluatedCount === 0) {
      speakingIncompleteReason = `No complete audio-backed speaking responses — 0/${speakingRequiredCount} required turns across Parts 1–3`;
    } else {
      speakingIncompleteReason = `${speakingEvaluatedCount}/${speakingRequiredCount} required turns completely evaluated — Part 1: ${speakingPart1Evaluated}/${requiredPart1Turns}, Part 2: ${speakingPart2Evaluated}/${requiredPart2Turns}, Part 3: ${speakingPart3Evaluated}/${requiredPart3Turns}`;
    }
  }

  // Incomplete skills & human-readable sections tracking
  const incompleteSkills: FullMockSkillKey[] = [];
  const incompleteSections: string[] = [];

  if (!isListeningComplete) {
    incompleteSkills.push('listening');
    if (listeningTotal === 0) {
      incompleteSections.push('Listening (0 questions configured)');
    } else if (!isListeningAssessed) {
      incompleteSections.push(`Listening (Unattempted — 0/${listeningTotal} answered)`);
    } else {
      incompleteSections.push(
        `Listening (${listeningUnanswered} of ${listeningTotal} unanswered)`
      );
    }
  }

  if (!isReadingComplete) {
    incompleteSkills.push('reading');
    if (readingTotal === 0) {
      incompleteSections.push('Reading (0 questions configured)');
    } else if (!isReadingAssessed) {
      incompleteSections.push(`Reading (Unattempted — 0/${readingTotal} answered)`);
    } else {
      incompleteSections.push(`Reading (${readingUnanswered} of ${readingTotal} unanswered)`);
    }
  }

  if (!isWritingComplete) {
    incompleteSkills.push('writing');
  }
  if (!isTask1Valid) {
    incompleteSections.push(
      `Writing Task 1 (${task1WordCount}/${task1MinWords} min diagnostic words; ${task1TargetWords} words required for full mock)`
    );
  } else if (!isTask1Complete) {
    incompleteSections.push(
      `Writing Task 1 (${task1WordCount}/${task1TargetWords} target words required for full mock — diagnostic available)`
    );
  }

  if (!isTask2Valid) {
    incompleteSections.push(
      `Writing Task 2 (${wordCount}/${task2MinWords} min diagnostic words; ${task2TargetWords} words required for full mock)`
    );
  } else if (!isTask2Complete) {
    incompleteSections.push(
      `Writing Task 2 (${wordCount}/${task2TargetWords} target words required for full mock — diagnostic available)`
    );
  }

  if (!isSpeakingComplete) {
    incompleteSkills.push('speaking');
    incompleteSections.push(
      `Speaking (${speakingIncompleteReason || `0/${speakingRequiredCount} required turns evaluated`})`
    );
  }

  const isCompleteFullMock =
    incompleteSkills.length === 0 &&
    isListeningComplete &&
    isReadingComplete &&
    isWritingComplete &&
    isSpeakingComplete &&
    speakingPronunciationObservable &&
    speakingAssessmentStatus === 'evaluated';
  const status: 'Complete' | 'Incomplete' = isCompleteFullMock ? 'Complete' : 'Incomplete';

  let overall: number | null = null;
  const hasValidListeningFinal =
    isListeningComplete &&
    typeof lBand === 'number' &&
    Number.isFinite(lBand) &&
    lBand >= 0.0 &&
    lBand <= 9.0;
  const hasValidReadingFinal =
    isReadingComplete &&
    typeof rBand === 'number' &&
    Number.isFinite(rBand) &&
    rBand >= 0.0 &&
    rBand <= 9.0;
  const hasValidWritingFinal = isWritingComplete && isValidIeltsCriterionBand(wBand);
  const hasValidSpeakingFinal =
    isSpeakingComplete &&
    speakingPronunciationObservable &&
    speakingAssessmentStatus === 'evaluated' &&
    isValidIeltsCriterionBand(sBand);

  if (
    isCompleteFullMock &&
    hasValidListeningFinal &&
    hasValidReadingFinal &&
    hasValidWritingFinal &&
    hasValidSpeakingFinal &&
    lBand !== null &&
    rBand !== null &&
    wBand !== null &&
    sBand !== null
  ) {
    // Strictly divide by 4 across all four verified skills
    const avg = (lBand + rBand + wBand + sBand) / 4;
    overall = avg > 0 ? roundOfficialIELTSBand(avg) : 0.0;
  }

  return {
    status,
    isCompleteFullMock,
    incompleteSkills,
    incompleteSections,
    listeningTotal,
    listeningAttempted,
    listeningCorrect,
    listeningIncorrect,
    listeningUnanswered,
    isListeningAssessed,
    isListeningComplete,
    lBand,
    readingTotal,
    readingAttempted,
    readingCorrect,
    readingIncorrect,
    readingUnanswered,
    isReadingAssessed,
    isReadingComplete,
    rBand,
    task1WordCount,
    wordCount,
    task1MinWords,
    task2MinWords,
    task1TargetWords,
    task2TargetWords,
    isTask1Valid,
    isTask2Valid,
    isTask1Complete,
    isTask2Complete,
    isWritingPartial,
    isWritingAssessed,
    isWritingComplete,
    t1Report,
    t2Report,
    wDiagnosticBand,
    wBand,
    speakingEvaluatedCount,
    speakingTranscriptOnlyCount,
    speakingRequiredCount,
    speakingPart1Evaluated,
    speakingPart2Evaluated,
    speakingPart3Evaluated,
    isSpeakingPartial,
    isSpeakingTranscriptOnly,
    isSpeakingAssessed,
    isSpeakingComplete,
    speakingAssessmentStatus,
    speakingPronunciationObservable,
    speakingIncompleteReason,
    sDiagnosticBand,
    sBand,
    overall
  };
}

/**
 * Derives the active Listening section badge and heading from the active exam's metadata
 * and current question, avoiding any hardcoded titles from other exams.
 */
export function deriveActiveListeningHeading(
  exam: Partial<MockExamSet> | null | undefined,
  currentQuestion?: QuestionItem | null
): { badge: string; title: string } {
  const questions = exam?.questions || [];
  const listeningQuestions = questions.filter((q) => q.section === 'listening');

  let sectionNum: 1 | 2 | 3 | 4 = 1;
  if (currentQuestion && currentQuestion.section === 'listening' && listeningQuestions.length > 0) {
    const lIdx = listeningQuestions.findIndex((q) => q.id === currentQuestion.id);
    if (lIdx >= 0) {
      if (listeningQuestions.length >= 4) {
        const perSection = Math.ceil(listeningQuestions.length / 4);
        sectionNum = Math.min(4, Math.floor(lIdx / perSection) + 1) as 1 | 2 | 3 | 4;
      } else {
        sectionNum = 1;
      }
    }
  }

  const sectionDetail = exam?.listeningSections?.[sectionNum];
  const badge =
    listeningQuestions.length >= 4 ? `Listening · Section ${sectionNum}` : 'Listening Section';
  const title =
    sectionDetail?.title ||
    exam?.listeningTitle ||
    exam?.title ||
    'Listening Examination Audio';

  return { badge, title };
}

/**
 * Derives the active Reading passage/section badge and heading from the active exam's metadata
 * and current question, preserving Academic vs. General Training format and avoiding hardcoded titles.
 */
export function deriveActiveReadingHeading(
  exam: Partial<MockExamSet> | null | undefined,
  currentQuestion?: QuestionItem | null
): { badge: string; title: string; passageNumber: 1 | 2 | 3 } {
  const isGT = exam?.format === 'General Training';
  const questions = exam?.questions || [];
  const readingQuestions = questions.filter((q) => q.section === 'reading');

  let partNum: 1 | 2 | 3 = 1;
  if (currentQuestion && currentQuestion.section === 'reading') {
    if (currentQuestion.passage === 1 || currentQuestion.passage === 2 || currentQuestion.passage === 3) {
      partNum = currentQuestion.passage;
    } else if (readingQuestions.length > 0) {
      const rIdx = readingQuestions.findIndex((q) => q.id === currentQuestion.id);
      if (rIdx >= 0) {
        if (readingQuestions.length >= 30) {
          partNum = rIdx < 13 ? 1 : rIdx < 26 ? 2 : 3;
        } else if (readingQuestions.length >= 3) {
          const perPart = Math.ceil(readingQuestions.length / 3);
          partNum = Math.min(3, Math.floor(rIdx / perPart) + 1) as 1 | 2 | 3;
        }
      }
    }
  }

  const unitLabel = isGT ? 'Section' : 'Passage';
  const formatLabel = isGT ? 'General Training Reading' : 'Academic Reading';
  const badge =
    readingQuestions.length >= 3
      ? `${formatLabel} · ${unitLabel} ${partNum}`
      : formatLabel;

  const title =
    exam?.readingTitle ||
    (isGT ? 'General Training Reading Text' : 'Academic Reading Passage');

  return { badge, title, passageNumber: partNum };
}

/**
 * Extracts the specific Reading passage/section text block (Passage 1, 2, or 3)
 * associated with the currently active Reading question.
 */
export function extractActiveReadingPassage(
  exam: Partial<MockExamSet> | null | undefined,
  currentQuestion?: QuestionItem | null
): {
  passageNumber: 1 | 2 | 3;
  activePassageText: string;
  allPassageBlocks: string[];
} {
  const { passageNumber } = deriveActiveReadingHeading(exam, currentQuestion);
  const fullText = (exam?.readingPassage || '').trim();
  if (!fullText) {
    return { passageNumber, activePassageText: '', allPassageBlocks: [] };
  }

  const blocks = fullText
    .split(/(?:\n\n---\n\n|\n\n)(?=(?:#{1,3}\s*)?(?:PASSAGE|SECTION)\s+[123]\b)/i)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length >= 3) {
    return {
      passageNumber,
      activePassageText: blocks[passageNumber - 1] || fullText,
      allPassageBlocks: blocks
    };
  }

  return {
    passageNumber,
    activePassageText: fullText,
    allPassageBlocks: [fullText]
  };
}

