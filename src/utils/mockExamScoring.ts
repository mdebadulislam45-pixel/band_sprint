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
  speakingRequiredCount: number;
  speakingPart1Evaluated: number;
  speakingPart2Evaluated: number;
  speakingPart3Evaluated: number;
  isSpeakingPartial: boolean;
  isSpeakingAssessed: boolean;
  isSpeakingComplete: boolean;
  /** Heuristic diagnostic band when at least one Speaking turn is validly evaluated */
  sDiagnosticBand: number | null;
  /** Full-mock Speaking band (strictly null unless all required Part 1, Part 2, and Part 3 prompts are validly evaluated) */
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

  for (const q of questions) {
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

  for (const q of questions) {
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

  // 2. Full IELTS Writing completion requires BOTH tasks to be diagnostically valid AND meet 150w / 250w targets
  const isTask1Complete = isTask1Valid && task1WordCount >= task1TargetWords;
  const isTask2Complete = isTask2Valid && wordCount >= task2TargetWords;
  const isWritingComplete = isTask1Complete && isTask2Complete;
  const isWritingAssessed = isTask1Valid || isTask2Valid;
  const isWritingPartial = isWritingAssessed && !isWritingComplete;

  let wDiagnosticBand: number | null = null;
  if (t1Report && t2Report) {
    const weightedDiag = (t2Report.overallBand * 2 + t1Report.overallBand) / 3;
    wDiagnosticBand = Math.round(weightedDiag * 2) / 2;
  } else if (t2Report) {
    wDiagnosticBand = t2Report.overallBand;
  } else if (t1Report) {
    wDiagnosticBand = t1Report.overallBand;
  }

  let wBand: number | null = null;
  if (isWritingComplete && t1Report && t2Report) {
    const weighted = (t2Report.overallBand * 2 + t1Report.overallBand) / 3;
    wBand = Math.round(weighted * 2) / 2;
  }

  // Speaking Evaluation:
  // Derive required Speaking turns across Parts 1, 2, and 3 from the configured SpeakingTopicSet
  const activeTopicSet = speakingTopicSet ?? SPEAKING_TOPIC_BANK[0];
  const requiredPart1Turns = activeTopicSet?.part1Questions?.length ?? 2;
  const requiredPart2Turns = activeTopicSet?.part2CueCard ? 1 : 1;
  const requiredPart3Turns = activeTopicSet?.part3Questions?.length ?? 2;
  const speakingRequiredCount = requiredPart1Turns + requiredPart2Turns + requiredPart3Turns;

  // Deduplicate speaking answers by questionId (retaining latest turn record) and validate each turn
  const uniqueSpeakingByQuestion = new Map<string, SpeakingAnswerRecord>();
  (speakingAnswers || []).forEach((rec, idx) => {
    if (!rec) return;
    const key = rec.questionId || `turn_${rec.part}_${idx}`;
    uniqueSpeakingByQuestion.set(key, rec);
  });

  let speakingPart1Evaluated = 0;
  let speakingPart2Evaluated = 0;
  let speakingPart3Evaluated = 0;
  const evaluatedSpeakingBands: number[] = [];

  for (const a of uniqueSpeakingByQuestion.values()) {
    const band = a.instantFeedback?.overallBand ?? a.instantFeedback?.estimatedBand;
    const isValidTurn =
      Boolean(a.instantFeedback) &&
      a.instantFeedback?.isValidAttempt !== false &&
      (a.wordCount || 0) >= 5 &&
      typeof band === 'number' &&
      !Number.isNaN(band) &&
      band > 0;

    if (isValidTurn && typeof band === 'number') {
      evaluatedSpeakingBands.push(band);
      if (a.part === 1) speakingPart1Evaluated++;
      else if (a.part === 2) speakingPart2Evaluated++;
      else if (a.part === 3) speakingPart3Evaluated++;
    }
  }

  const speakingEvaluatedCount = evaluatedSpeakingBands.length;
  const isSpeakingAssessed = speakingEvaluatedCount > 0;
  const isSpeakingComplete =
    speakingPart1Evaluated >= requiredPart1Turns &&
    speakingPart2Evaluated >= requiredPart2Turns &&
    speakingPart3Evaluated >= requiredPart3Turns &&
    speakingEvaluatedCount >= speakingRequiredCount;
  const isSpeakingPartial = isSpeakingAssessed && !isSpeakingComplete;

  const sDiagnosticBand: number | null = isSpeakingAssessed
    ? Math.round(
        (evaluatedSpeakingBands.reduce((a, b) => a + b, 0) / evaluatedSpeakingBands.length) * 2
      ) / 2
    : null;
  const sBand: number | null = isSpeakingComplete ? sDiagnosticBand : null;

  // Incomplete sections tracking
  const incompleteSections: string[] = [];
  if (!isListeningComplete) {
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
    if (readingTotal === 0) {
      incompleteSections.push('Reading (0 questions configured)');
    } else if (!isReadingAssessed) {
      incompleteSections.push(`Reading (Unattempted — 0/${readingTotal} answered)`);
    } else {
      incompleteSections.push(`Reading (${readingUnanswered} of ${readingTotal} unanswered)`);
    }
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
    if (!isSpeakingAssessed) {
      incompleteSections.push(
        `Speaking (No evaluated speaking responses — 0/${speakingRequiredCount} required turns across Parts 1–3)`
      );
    } else {
      incompleteSections.push(
        `Speaking (${speakingEvaluatedCount}/${speakingRequiredCount} required turns evaluated — Part 1: ${speakingPart1Evaluated}/${requiredPart1Turns}, Part 2: ${speakingPart2Evaluated}/${requiredPart2Turns}, Part 3: ${speakingPart3Evaluated}/${requiredPart3Turns})`
      );
    }
  }

  const isCompleteFullMock =
    isListeningComplete && isReadingComplete && isWritingComplete && isSpeakingComplete;
  const status: 'Complete' | 'Incomplete' = isCompleteFullMock ? 'Complete' : 'Incomplete';

  let overall: number | null = null;
  if (
    isCompleteFullMock &&
    lBand !== null &&
    rBand !== null &&
    wBand !== null &&
    sBand !== null
  ) {
    // Strictly divide by 4 across all four required skills
    const avg = (lBand + rBand + wBand + sBand) / 4;
    if (avg > 0) {
      const whole = Math.floor(avg);
      const frac = avg - whole;
      overall = whole;
      if (frac >= 0.75) overall += 1.0;
      else if (frac >= 0.25) overall += 0.5;
    } else {
      overall = 0.0;
    }
  }

  return {
    status,
    isCompleteFullMock,
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
    speakingRequiredCount,
    speakingPart1Evaluated,
    speakingPart2Evaluated,
    speakingPart3Evaluated,
    isSpeakingPartial,
    isSpeakingAssessed,
    isSpeakingComplete,
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

