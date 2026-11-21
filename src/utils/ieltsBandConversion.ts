/**
 * BandSprint — Canonical IELTS Raw-Score to Band Conversion Engine
 *
 * IMPORTANT CALIBRATION NOTICE:
 * In IELTS examinations administered by the IELTS partners, IDP,
 * and the British Council, exact raw-score-to-band boundaries can fluctuate slightly
 * from one test version to another to account for minor variations in difficulty.
 *
 * The conversions provided below represent standard published benchmark guidance
 * (widely recognized across IELTS Books and IDP/British Council advisory charts).
 * They strictly distinguish Academic Reading from General Training Reading and replace
 * uncalibrated linear approximations.
 */

import { roundIELTSBand } from './cdieltsEvaluationEngine';

export { roundIELTSBand };

/**
 * Standard Published Guidance Conversion: Listening (Academic & General Training)
 * Total questions: 40
 */
export function convertListeningRawScoreToBand(rawScore: number): number {
  if (typeof rawScore !== 'number' || isNaN(rawScore) || rawScore <= 0) return 0.0;
  const score = Math.floor(Math.min(40, rawScore));

  if (score >= 39) return 9.0;
  if (score >= 37) return 8.5;
  if (score >= 35) return 8.0;
  if (score >= 32) return 7.5;
  if (score >= 30) return 7.0;
  if (score >= 26) return 6.5;
  if (score >= 23) return 6.0;
  if (score >= 18) return 5.5;
  if (score >= 16) return 5.0;
  if (score >= 13) return 4.5;
  if (score >= 10) return 4.0;
  if (score >= 8) return 3.5;
  if (score >= 6) return 3.0;
  if (score >= 4) return 2.5;
  if (score >= 2) return 2.0;
  return 1.0;
}

/**
 * Standard Published Guidance Conversion: Academic Reading
 * Total questions: 40
 */
export function convertAcademicReadingRawScoreToBand(rawScore: number): number {
  if (typeof rawScore !== 'number' || isNaN(rawScore) || rawScore <= 0) return 0.0;
  const score = Math.floor(Math.min(40, rawScore));

  if (score >= 39) return 9.0;
  if (score >= 37) return 8.5;
  if (score >= 35) return 8.0;
  if (score >= 33) return 7.5;
  if (score >= 30) return 7.0;
  if (score >= 27) return 6.5;
  if (score >= 23) return 6.0;
  if (score >= 19) return 5.5;
  if (score >= 15) return 5.0;
  if (score >= 13) return 4.5;
  if (score >= 10) return 4.0;
  if (score >= 8) return 3.5;
  if (score >= 6) return 3.0;
  if (score >= 4) return 2.5;
  if (score >= 2) return 2.0;
  return 1.0;
}

/**
 * Standard Published Guidance Conversion: General Training Reading
 * Total questions: 40
 * Note: GT Reading requires higher raw scores at every band tier compared to Academic Reading.
 */
export function convertGeneralTrainingReadingRawScoreToBand(rawScore: number): number {
  if (typeof rawScore !== 'number' || isNaN(rawScore) || rawScore <= 0) return 0.0;
  const score = Math.floor(Math.min(40, rawScore));

  if (score === 40) return 9.0;
  if (score === 39) return 8.5;
  if (score >= 37) return 8.0;
  if (score === 36) return 7.5;
  if (score >= 34) return 7.0;
  if (score >= 32) return 6.5;
  if (score >= 30) return 6.0;
  if (score >= 27) return 5.5;
  if (score >= 23) return 5.0;
  if (score >= 19) return 4.5;
  if (score >= 15) return 4.0;
  if (score >= 12) return 3.5;
  if (score >= 9) return 3.0;
  if (score >= 6) return 2.5;
  if (score >= 4) return 2.0;
  if (score >= 2) return 1.5;
  return 1.0;
}

/**
 * Unified raw-score to band converter for objective modules (Listening and Reading).
 */
export function convertRawScoreToBand(
  rawScore: number,
  module: 'listening' | 'reading' | string,
  edition: 'Academic' | 'General Training' | string = 'Academic'
): number {
  const normModule = (module || '').toLowerCase();
  if (normModule === 'listening') {
    return convertListeningRawScoreToBand(rawScore);
  }
  if (normModule === 'reading') {
    const isGT = (edition || '').toLowerCase().includes('general');
    return isGT
      ? convertGeneralTrainingReadingRawScoreToBand(rawScore)
      : convertAcademicReadingRawScoreToBand(rawScore);
  }
  return 0.0;
}

/**
 * Calculates a genuine four-skill IELTS Overall Band score.
 * MANDATORY SAFEGUARD:
 * Under IELTS rules, a candidate must complete ALL FOUR test skills
 * (Listening, Reading, Writing, Speaking) to receive an Overall Band score.
 *
 * If any of the four skills is missing, undefined, null, or 0, this function
 * strictly returns `null` to prevent incomplete attempts from being represented
 * as complete four-skill results.
 */
export function calculateFourSkillOverallBand(bands: {
  listeningBand?: number | null;
  readingBand?: number | null;
  writingBand?: number | null;
  speakingBand?: number | null;
  examType?: string;
  isFullMock?: boolean;
  speakingAssessmentStatus?: string;
  speakingPronunciationObservable?: boolean;
  isPartialSpeaking?: boolean;
  completedSkills?: {
    listening?: boolean;
    reading?: boolean;
    writing?: boolean;
    speaking?: boolean;
  };
  totalQuestions?: number;
  listeningTotalQuestions?: number;
  readingTotalQuestions?: number;
  writingTasksCompleted?: number;
}): number | null {
  const {
    listeningBand,
    readingBand,
    writingBand,
    speakingBand,
    examType,
    speakingAssessmentStatus,
    speakingPronunciationObservable,
    isPartialSpeaking,
    completedSkills,
    totalQuestions,
    listeningTotalQuestions,
    readingTotalQuestions,
    writingTasksCompleted
  } = bands;

  // Metadata guard: If examType is explicitly incomplete, partial, or single-skill, reject Overall Band
  if (
    examType &&
    (examType === 'incomplete_mock' ||
      examType === 'partial_lrw' ||
      examType === 'listening_only' ||
      examType === 'reading_only' ||
      examType === 'writing_only' ||
      examType === 'speaking_only')
  ) {
    return null;
  }

  // Speaking provenance guard: transcript-only, unavailable, insufficient, or unobservable Pronunciation never completes a Full Mock
  if (
    isPartialSpeaking === true ||
    speakingPronunciationObservable === false ||
    speakingAssessmentStatus === 'partial_transcript_only' ||
    speakingAssessmentStatus === 'insufficient_evidence' ||
    speakingAssessmentStatus === 'unavailable'
  ) {
    return null;
  }

  // Writing two-task guard when task completion count is supplied
  if (
    writingTasksCompleted !== undefined &&
    (typeof writingTasksCompleted !== 'number' ||
      !Number.isFinite(writingTasksCompleted) ||
      writingTasksCompleted < 2)
  ) {
    return null;
  }

  // Metadata guard: If completedSkills is present, all four must be explicitly completed
  if (completedSkills) {
    if (
      completedSkills.listening !== true ||
      completedSkills.reading !== true ||
      completedSkills.writing !== true ||
      completedSkills.speaking !== true
    ) {
      return null;
    }
  }

  const isHalfBand = (val: unknown): val is number =>
    typeof val === 'number' &&
    Number.isFinite(val) &&
    Math.abs(val * 2 - Math.round(val * 2)) < 1e-6;

  // Genuine 0.0 Listening/Reading requires completedSkills confirmation AND must NOT have 0 attempted questions
  const hasListeningAttemptEvidence =
    listeningTotalQuestions !== undefined
      ? typeof listeningTotalQuestions === 'number' && Number.isFinite(listeningTotalQuestions) && listeningTotalQuestions > 0
      : totalQuestions !== undefined
      ? typeof totalQuestions === 'number' && Number.isFinite(totalQuestions) && totalQuestions > 0
      : true;
  const hasReadingAttemptEvidence =
    readingTotalQuestions !== undefined
      ? typeof readingTotalQuestions === 'number' && Number.isFinite(readingTotalQuestions) && readingTotalQuestions > 0
      : totalQuestions !== undefined
      ? typeof totalQuestions === 'number' && Number.isFinite(totalQuestions) && totalQuestions > 0
      : true;

  const allowZeroL = completedSkills?.listening === true && hasListeningAttemptEvidence;
  const allowZeroR = completedSkills?.reading === true && hasReadingAttemptEvidence;

  const l =
    isHalfBand(listeningBand) && listeningBand <= 9.0 && listeningBand >= (allowZeroL ? 0.0 : 1.0)
      ? listeningBand
      : null;
  const r =
    isHalfBand(readingBand) && readingBand <= 9.0 && readingBand >= (allowZeroR ? 0.0 : 1.0)
      ? readingBand
      : null;
  const w =
    isHalfBand(writingBand) && writingBand >= 1.0 && writingBand <= 9.0 ? writingBand : null;
  const s =
    isHalfBand(speakingBand) && speakingBand >= 1.0 && speakingBand <= 9.0 ? speakingBand : null;

  // Strictly require all four evaluated skills
  if (l === null || r === null || w === null || s === null) {
    return null;
  }

  const average = (l + r + w + s) / 4;
  return roundIELTSBand(average);
}

/**
 * Detailed semantic evaluation result distinguishing valid attempted tests,
 * unattempted sittings, and invalid non-numeric/out-of-bounds inputs.
 */
export interface BandEvaluationResult {
  band: number | null;
  status: 'scored' | 'zero_attempted' | 'unattempted' | 'invalid_input';
  bandLabel: string;
  isAttempted: boolean;
  diagnostic: string;
}

/**
 * Evaluates raw objective scores with strict IELTS band semantics.
 *
 * IELTS Semantics:
 * - Band 0: Reserved exclusively for "Did not attempt the test. No assessable information provided."
 * - Band 1.0: "Non-user". The candidate attended/attempted the exam but demonstrated no ability beyond isolated words.
 * - Attempted 0 correct: Raw score is 0/40; published benchmark conversion tables do not map 0 correct
 *   to an official band score. The band estimate is marked unavailable (null) with a clear raw score label.
 * - Invalid Input: Non-numeric, NaN, non-finite, negative, non-integer, or > 40 questions.
 */
export function evaluateRawScoreDetailed(
  rawScore: unknown,
  module: 'listening' | 'reading' | string,
  options?: {
    edition?: 'Academic' | 'General Training' | string;
    isAttempted?: boolean;
  }
): BandEvaluationResult {
  const isAttempted = options?.isAttempted ?? true;
  const edition = options?.edition ?? 'Academic';

  // Guard against non-numeric, NaN, infinite, or negative inputs
  if (typeof rawScore !== 'number' || isNaN(rawScore) || !Number.isFinite(rawScore) || rawScore < 0) {
    return {
      band: null,
      status: 'invalid_input',
      bandLabel: 'Invalid Input',
      isAttempted,
      diagnostic: 'Raw score must be a finite non-negative number between 0 and 40.'
    };
  }

  // Guard against scores exceeding the standard 40-item test length
  if (rawScore > 40) {
    return {
      band: null,
      status: 'invalid_input',
      bandLabel: 'Invalid Input',
      isAttempted,
      diagnostic: `Raw score ${rawScore} exceeds the maximum 40 questions on standard IELTS Listening/Reading.`
    };
  }

  // Guard against non-integers on discrete objective question sets
  if (!Number.isInteger(rawScore)) {
    return {
      band: null,
      status: 'invalid_input',
      bandLabel: 'Invalid Input',
      isAttempted,
      diagnostic: `Raw score ${rawScore} must be an integer; objective test items cannot be fractional.`
    };
  }

  // Handle zero raw score
  if (rawScore === 0) {
    if (!isAttempted) {
      return {
        band: 0.0,
        status: 'unattempted',
        bandLabel: 'Band 0.0 (Did not attempt)',
        isAttempted: false,
        diagnostic: 'IELTS Band 0 is reserved exclusively for candidates who did not attempt the test.'
      };
    }
    return {
      band: null,
      status: 'zero_attempted',
      bandLabel: '0/40 (Band estimate unavailable)',
      isAttempted: true,
      diagnostic: 'Candidate completed the test with 0 correct answers. Published IELTS benchmark conversion tables do not map 0 correct to an official band score. Raw score is 0/40 and band estimate is unavailable.'
    };
  }

  // Normal positive scored calculation
  const band = convertRawScoreToBand(rawScore, module, edition);
  return {
    band,
    status: 'scored',
    bandLabel: `Band ${band.toFixed(1)}`,
    isAttempted: true,
    diagnostic: `Valid benchmark score conversion (${rawScore}/40).`
  };
}
