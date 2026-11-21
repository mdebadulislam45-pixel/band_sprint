/**
 * BAND SPRINT — PHASE 3B.3 FULL MOCK FOUR-SKILL COMPLETENESS & SCORING INTEGRITY SUITE
 * Tests all 11 mandatory completeness, provenance, backward-compatibility, and reviewability scenarios:
 *  1. All four skills complete and valid
 *  2. Speaking transcript-only with three valid criteria
 *  3. Speaking with null pronunciation
 *  4. Speaking with fabricated or missing evidence flags
 *  5. Speaking with invalid criterion scores
 *  6. Missing Writing, Listening, or Reading results
 *  7. Unavailable and insufficient-evidence Speaking results
 *  8. Genuine valid zero Listening/Reading results vs unattempted
 *  9. Historical incomplete records vs valid historical four-skill records
 * 10. No overall band or completed status when any skill is incomplete
 * 11. Valid individual skill results remain reviewable
 */

import assert from 'node:assert/strict';
import {
  calculateMockExamScores,
  validateSpeakingTurnForFullMock,
  isValidIeltsCriterionBand
} from '../../utils/mockExamScoring';
import { calculateFourSkillOverallBand } from '../../utils/ieltsBandConversion';
import {
  isFullMockExamRecord,
  describeExamHistoryDisplay,
  summarizeExamHistoryCounts
} from '../../utils/userStorage';
import { MOCK_EXAM_SETS, SPEAKING_TOPIC_BANK } from '../../data/mockExams';
import { SpeakingAnswerRecord } from '../../types/speakingTypes';
import { ExamHistoryRecord } from '../../types';

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  [PASS] ${name}`);
  } catch (err: any) {
    failed += 1;
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err?.message || err}`);
  }
}

const examSet = MOCK_EXAM_SETS[0];
const topicSet = SPEAKING_TOPIC_BANK[0];

const FULL_TASK1_TEXT = `
  The bar chart illustrates the volume of international visitors arriving in four major European capitals—Paris, London, Rome, and Madrid—between 2015 and 2020.
  Overall, it is evident that Paris consistently welcomed the highest proportion of overseas travelers throughout the entire survey period, whereas Rome experienced the most pronounced upward trajectory in tourist arrivals prior to the final year.
  In 2015, approximately 15.2 million international tourists visited Paris, compared with 12.4 million in London. Over the subsequent four years, arrivals in Paris grew steadily to reach a substantial peak of 19.1 million by 2019, while London expanded at a more moderate pace to 14.8 million over the same interval.
  In contrast, Rome recorded only 7.1 million foreign arrivals in the initial year, trailing Madrid at 8.3 million. However, Rome climbed sharply to 11.6 million by 2019, surpassing Madrid, which plateaued at 10.2 million visitors. Finally, in 2020, all four destinations experienced a significant contraction due to global travel restrictions, although Paris retained its leading position.
`;

const FULL_TASK2_TEXT = `
  In contemporary society, university education is increasingly viewed as an indispensable prerequisite for long-term professional advancement.
  While some commentators argue that tertiary qualifications provide essential theoretical rigor and specialized expertise, others contend that vocational apprenticeships and hands-on workplace experience offer more immediate economic utility.
  This essay will examine both perspectives and substantiate the view that academic higher education remains paramount for systemic innovation and sustainable career trajectories.

  On the one hand, specialized professions in domains such as civil engineering, clinical medicine, and international jurisprudence necessitate structured university curricula. Without a foundational command of empirical methodology and theoretical frameworks, practitioners cannot safely navigate complex problem-solving environments. Furthermore, universities cultivate critical inquiry, analytical synthesis, and scholarly discipline, which empower graduates to adapt when technological disruptions render narrow technical routines obsolete.

  On the other hand, practical vocational training provides immediate employability without burdening young adults with substantial student debt. Skilled trades, digital maintenance, and applied technical vocations frequently experience acute labor shortages, offering lucrative remuneration and rapid career entry for school leavers who prefer experiential learning over abstract lectures.

  Nevertheless, a balanced assessment indicates that while vocational pathways fulfill vital operational demands, advanced tertiary education underpins broader socioeconomic progress. Research institutions drive scientific discovery and equip future leaders with the interdisciplinary perspective required to mitigate global challenges.

  In conclusion, although vocational training offers undeniable pragmatic advantages for direct entry into the workforce, university education remains indispensable for intellectual leadership, professional versatility, and long-term societal development. Consequently, educational policymakers should invest in both academic scholarship and applied technical training to ensure a resilient modern economy.
`;

function buildAllCorrectAnswers(): Record<number, string> {
  const map: Record<number, string> = {};
  for (const q of examSet.questions) {
    map[q.id] = q.correctAnswer;
  }
  return map;
}

function buildAllWrongAnswers(): Record<number, string> {
  const map: Record<number, string> = {};
  for (const q of examSet.questions) {
    map[q.id] = 'COMPLETELY_INCORRECT_ANSWER_XYZ';
  }
  return map;
}

function makeAudioBackedTurn(
  part: 1 | 2 | 3,
  questionId: string,
  criteria: { fc: number; lr: number; gra: number; pr: number },
  overallBand: number
): SpeakingAnswerRecord {
  return {
    questionId,
    part,
    topic: topicSet.title,
    questionText: 'Discuss your experience.',
    transcript:
      'I have lived in my hometown for nearly two decades and have witnessed substantial improvements in public transportation and municipal green spaces.',
    startTime: 0,
    endTime: 30_000,
    durationSec: 30,
    wordCount: 22,
    wordsPerMinute: 120,
    pauseCount: null,
    longPauseCount: null,
    fillerCount: 0,
    detectedFillers: [],
    instantFeedback: {
      questionId,
      questionText: 'Discuss your experience.',
      part,
      topic: topicSet.title,
      candidateTranscript:
        'I have lived in my hometown for nearly two decades and have witnessed substantial improvements in public transportation and municipal green spaces.',
      isValidAttempt: true,
      assessmentStatus: 'evaluated',
      evidenceMode: 'audio_and_transcript',
      pronunciationObservable: true,
      isPartialAssessment: false,
      unassessedCriteria: [],
      wordCount: 22,
      overallBand,
      partialThreeCriterionIndex: null,
      criteria,
      durationSec: 30,
      wordsPerMinute: 120,
      estimatedBand: overallBand,
      estimatedBands: {
        fluency: criteria.fc,
        lexical: criteria.lr,
        grammar: criteria.gra,
        pronunciation: criteria.pr,
        overall: overallBand
      },
      grammaticalErrors: [],
      pronunciation: {
        clarityBand: criteria.pr,
        cadenceWpm: 120,
        trickyWords: [],
        connectedSpeechTips: [],
        intonationPattern: 'Natural pitch variation',
        rhythmVerdict: 'Consistent'
      },
      band8Answer: {
        bandScore: 8.5,
        modelAnswer: 'Sample Band 8.5 response.',
        highlightedCollocations: [],
        keyDiscourseMarkers: [],
        examinerRationale: 'Strong cohesion.'
      },
      actionableTips: []
    }
  };
}

function makeCompleteAudioSpeakingSet(): SpeakingAnswerRecord[] {
  return [
    makeAudioBackedTurn(1, `${topicSet.id}_p1_0`, { fc: 7.0, lr: 7.5, gra: 7.0, pr: 7.0 }, 7.0),
    makeAudioBackedTurn(1, `${topicSet.id}_p1_1`, { fc: 7.5, lr: 7.5, gra: 7.5, pr: 7.5 }, 7.5),
    makeAudioBackedTurn(2, `${topicSet.id}_p2`, { fc: 7.5, lr: 8.0, gra: 7.5, pr: 7.0 }, 7.5),
    makeAudioBackedTurn(3, `${topicSet.id}_p3_0`, { fc: 7.0, lr: 7.5, gra: 7.5, pr: 7.0 }, 7.5),
    makeAudioBackedTurn(3, `${topicSet.id}_p3_1`, { fc: 7.5, lr: 7.5, gra: 7.0, pr: 7.5 }, 7.5)
  ];
}

function makeTranscriptOnlyTurn(part: 1 | 2 | 3, questionId: string): SpeakingAnswerRecord {
  const base = makeAudioBackedTurn(part, questionId, { fc: 7.0, lr: 7.0, gra: 7.0, pr: 7.0 }, 7.0);
  return {
    ...base,
    instantFeedback: {
      ...base.instantFeedback!,
      assessmentStatus: 'partial_transcript_only',
      evidenceMode: 'transcript_only',
      pronunciationObservable: false,
      isPartialAssessment: true,
      unassessedCriteria: ['Pronunciation'],
      overallBand: null,
      estimatedBand: null,
      partialThreeCriterionIndex: 7.0,
      criteria: { fc: 7.0, lr: 7.0, gra: 7.0, pr: null },
      estimatedBands: {
        fluency: 7.0,
        lexical: 7.0,
        grammar: 7.0,
        pronunciation: null,
        overall: null
      }
    }
  };
}

console.log('\n==============================================================');
console.log('BAND SPRINT — PHASE 3B.3 FULL MOCK COMPLETENESS SUITE');
console.log('==============================================================\n');

// 1. All four skills complete and valid
runTest('1. All four skills complete with audio-backed 4-criterion Speaking produces Complete status and valid overall band', () => {
  const result = calculateMockExamScores({
    questions: examSet.questions,
    answers: buildAllCorrectAnswers(),
    task1Text: FULL_TASK1_TEXT,
    essayText: FULL_TASK2_TEXT,
    speakingAnswers: makeCompleteAudioSpeakingSet(),
    format: examSet.format,
    speakingTopicSet: topicSet
  });

  assert.equal(result.status, 'Complete');
  assert.equal(result.isCompleteFullMock, true);
  assert.deepEqual(result.incompleteSkills, []);
  assert.equal(result.incompleteSections.length, 0);
  assert.equal(result.isListeningComplete, true);
  assert.equal(result.isReadingComplete, true);
  assert.equal(result.isWritingComplete, true);
  assert.equal(result.isSpeakingComplete, true);
  assert.equal(result.speakingAssessmentStatus, 'evaluated');
  assert.equal(result.speakingPronunciationObservable, true);
  assert.equal(result.speakingTranscriptOnlyCount, 0);
  assert.equal(result.sBand, 7.5);
  assert.ok(result.overall !== null && result.overall >= 1.0 && result.overall <= 9.0);
});

// 2. Speaking transcript-only with three valid criteria
runTest('2. Transcript-only Speaking (all 5 turns, 3 valid criteria each) NEVER completes Full Mock and preserves reviewable diagnostics', () => {
  const transcriptTurns = [
    makeTranscriptOnlyTurn(1, `${topicSet.id}_p1_0`),
    makeTranscriptOnlyTurn(1, `${topicSet.id}_p1_1`),
    makeTranscriptOnlyTurn(2, `${topicSet.id}_p2`),
    makeTranscriptOnlyTurn(3, `${topicSet.id}_p3_0`),
    makeTranscriptOnlyTurn(3, `${topicSet.id}_p3_1`)
  ];

  const result = calculateMockExamScores({
    questions: examSet.questions,
    answers: buildAllCorrectAnswers(),
    task1Text: FULL_TASK1_TEXT,
    essayText: FULL_TASK2_TEXT,
    speakingAnswers: transcriptTurns,
    format: examSet.format,
    speakingTopicSet: topicSet
  });

  assert.equal(result.status, 'Incomplete');
  assert.equal(result.isCompleteFullMock, false);
  assert.equal(result.overall, null);
  assert.deepEqual(result.incompleteSkills, ['speaking']);
  assert.equal(result.isSpeakingComplete, false);
  assert.equal(result.isSpeakingTranscriptOnly, true);
  assert.equal(result.speakingAssessmentStatus, 'partial_transcript_only');
  assert.equal(result.speakingPronunciationObservable, false);
  assert.equal(result.speakingEvaluatedCount, 0);
  assert.equal(result.speakingTranscriptOnlyCount, 5);
  assert.equal(result.sBand, null);
  // Valid individual skill results and Speaking diagnostic index remain reviewable
  assert.equal(result.sDiagnosticBand, 7.0);
  assert.equal(result.lBand, 9.0);
  assert.equal(result.rBand, 9.0);
  assert.ok(result.wBand !== null && result.wBand >= 5.0);
  assert.ok(result.t1Report !== null && result.t2Report !== null);
});

// 3. Speaking with null pronunciation (even if overallBand and status 'evaluated' are injected)
runTest('3. Speaking turn claiming status evaluated with null pronunciation is rejected as incomplete', () => {
  const turns = makeCompleteAudioSpeakingSet();
  turns[2] = {
    ...turns[2],
    instantFeedback: {
      ...turns[2].instantFeedback!,
      criteria: { fc: 7.5, lr: 8.0, gra: 7.5, pr: null },
      estimatedBands: { fluency: 7.5, lexical: 8.0, grammar: 7.5, pronunciation: null, overall: 7.5 },
      overallBand: 7.5
    }
  };

  assert.equal(validateSpeakingTurnForFullMock(turns[2]).isCompleteEvaluated, false);

  const result = calculateMockExamScores({
    questions: examSet.questions,
    answers: buildAllCorrectAnswers(),
    task1Text: FULL_TASK1_TEXT,
    essayText: FULL_TASK2_TEXT,
    speakingAnswers: turns,
    format: examSet.format,
    speakingTopicSet: topicSet
  });

  assert.equal(result.isSpeakingComplete, false);
  assert.equal(result.isCompleteFullMock, false);
  assert.equal(result.sBand, null);
  assert.equal(result.overall, null);
  assert.deepEqual(result.incompleteSkills, ['speaking']);
});

// 4. Speaking with fabricated or missing evidence flags
runTest('4. Speaking turns with bare overallBand, missing evidenceMode, pronunciationObservable: false, partial flags, or mismatched overall are rejected', () => {
  const base = makeCompleteAudioSpeakingSet()[0];

  // (a) Bare legacy shape { isValidAttempt: true, overallBand: 7.5 } without positive provenance
  const bareLegacy: SpeakingAnswerRecord = {
    ...base,
    instantFeedback: { isValidAttempt: true, overallBand: 7.5, estimatedBand: 7.5 } as any
  };
  assert.equal(validateSpeakingTurnForFullMock(bareLegacy).isCompleteEvaluated, false);

  // (b) pronunciationObservable: false despite numeric criteria
  const unobservablePr: SpeakingAnswerRecord = {
    ...base,
    instantFeedback: { ...base.instantFeedback!, pronunciationObservable: false }
  };
  assert.equal(validateSpeakingTurnForFullMock(unobservablePr).isCompleteEvaluated, false);

  // (c) evidenceMode: 'transcript_only' despite status 'evaluated'
  const wrongMode: SpeakingAnswerRecord = {
    ...base,
    instantFeedback: { ...base.instantFeedback!, evidenceMode: 'transcript_only' }
  };
  assert.equal(validateSpeakingTurnForFullMock(wrongMode).isCompleteEvaluated, false);

  // (d) isPartialAssessment: true or non-empty unassessedCriteria
  const flaggedPartial: SpeakingAnswerRecord = {
    ...base,
    instantFeedback: { ...base.instantFeedback!, isPartialAssessment: true }
  };
  assert.equal(validateSpeakingTurnForFullMock(flaggedPartial).isCompleteEvaluated, false);

  const hasUnassessed: SpeakingAnswerRecord = {
    ...base,
    instantFeedback: { ...base.instantFeedback!, unassessedCriteria: ['Pronunciation'] }
  };
  assert.equal(validateSpeakingTurnForFullMock(hasUnassessed).isCompleteEvaluated, false);

  // (e) Fabricated overallBand that does not match the 4 criteria (avg of 5.0,5.0,5.0,5.0 is 5.0, not 8.0)
  const mismatchedOverall = makeAudioBackedTurn(
    1,
    'q_mismatch',
    { fc: 5.0, lr: 5.0, gra: 5.0, pr: 5.0 },
    8.0
  );
  assert.equal(validateSpeakingTurnForFullMock(mismatchedOverall).isCompleteEvaluated, false);
  assert.equal(validateSpeakingTurnForFullMock(mismatchedOverall).reason, 'inconsistent_overall_vs_criteria');

  // Full mock using bareLegacy turns MUST be Incomplete with overall: null
  const bareSet = makeCompleteAudioSpeakingSet().map((t) => ({
    ...t,
    instantFeedback: { isValidAttempt: true, overallBand: 7.5, estimatedBand: 7.5 } as any
  }));
  const res = calculateMockExamScores({
    questions: examSet.questions,
    answers: buildAllCorrectAnswers(),
    task1Text: FULL_TASK1_TEXT,
    essayText: FULL_TASK2_TEXT,
    speakingAnswers: bareSet,
    format: examSet.format,
    speakingTopicSet: topicSet
  });
  assert.equal(res.isCompleteFullMock, false);
  assert.equal(res.overall, null);
  assert.equal(res.sBand, null);
});

// 5. Speaking with invalid criterion scores
runTest('5. Speaking turns with NaN, 0, >9, negative, or non-half-band criterion scores are rejected', () => {
  assert.equal(isValidIeltsCriterionBand(Number.NaN), false);
  assert.equal(isValidIeltsCriterionBand(0), false);
  assert.equal(isValidIeltsCriterionBand(9.5), false);
  assert.equal(isValidIeltsCriterionBand(-1), false);
  assert.equal(isValidIeltsCriterionBand(6.3), false);
  assert.equal(isValidIeltsCriterionBand(7.5), true);

  const badCriteriaTurns = [
    makeAudioBackedTurn(1, 'bad_nan', { fc: Number.NaN, lr: 7.0, gra: 7.0, pr: 7.0 }, 7.0),
    makeAudioBackedTurn(1, 'bad_zero', { fc: 7.0, lr: 0, gra: 7.0, pr: 7.0 }, 7.0),
    makeAudioBackedTurn(2, 'bad_oob', { fc: 7.0, lr: 7.0, gra: 9.5, pr: 7.0 }, 7.5),
    makeAudioBackedTurn(3, 'bad_step', { fc: 7.0, lr: 7.0, gra: 7.0, pr: 6.7 }, 7.0)
  ];
  for (const t of badCriteriaTurns) {
    assert.equal(validateSpeakingTurnForFullMock(t).isCompleteEvaluated, false);
  }
});

// 6. Missing Writing, Listening, or Reading results
runTest('6. Missing Listening, Reading, or Writing marks mock Incomplete, exposes exact incompleteSkills, and keeps other valid skills reviewable', () => {
  const fullAnswers = buildAllCorrectAnswers();
  const fullSpeaking = makeCompleteAudioSpeakingSet();

  // Missing Listening only
  const readingOnlyAnswers: Record<number, string> = {};
  for (const q of examSet.questions) {
    if (q.section === 'reading') readingOnlyAnswers[q.id] = q.correctAnswer;
  }
  const missingListening = calculateMockExamScores({
    questions: examSet.questions,
    answers: readingOnlyAnswers,
    task1Text: FULL_TASK1_TEXT,
    essayText: FULL_TASK2_TEXT,
    speakingAnswers: fullSpeaking,
    format: examSet.format,
    speakingTopicSet: topicSet
  });
  assert.equal(missingListening.isCompleteFullMock, false);
  assert.equal(missingListening.overall, null);
  assert.deepEqual(missingListening.incompleteSkills, ['listening']);
  assert.equal(missingListening.lBand, null);
  assert.equal(missingListening.rBand, 9.0);
  assert.ok(missingListening.wBand !== null);
  assert.equal(missingListening.sBand, 7.5);

  // Missing Reading only
  const listeningOnlyAnswers: Record<number, string> = {};
  for (const q of examSet.questions) {
    if (q.section === 'listening') listeningOnlyAnswers[q.id] = q.correctAnswer;
  }
  const missingReading = calculateMockExamScores({
    questions: examSet.questions,
    answers: listeningOnlyAnswers,
    task1Text: FULL_TASK1_TEXT,
    essayText: FULL_TASK2_TEXT,
    speakingAnswers: fullSpeaking,
    format: examSet.format,
    speakingTopicSet: topicSet
  });
  assert.equal(missingReading.isCompleteFullMock, false);
  assert.equal(missingReading.overall, null);
  assert.deepEqual(missingReading.incompleteSkills, ['reading']);
  assert.equal(missingReading.lBand, 9.0);
  assert.equal(missingReading.rBand, null);

  // Missing Writing only
  const missingWriting = calculateMockExamScores({
    questions: examSet.questions,
    answers: fullAnswers,
    task1Text: '',
    essayText: '',
    speakingAnswers: fullSpeaking,
    format: examSet.format,
    speakingTopicSet: topicSet
  });
  assert.equal(missingWriting.isCompleteFullMock, false);
  assert.equal(missingWriting.overall, null);
  assert.deepEqual(missingWriting.incompleteSkills, ['writing']);
  assert.equal(missingWriting.wBand, null);
  assert.equal(missingWriting.lBand, 9.0);
  assert.equal(missingWriting.rBand, 9.0);
  assert.equal(missingWriting.sBand, 7.5);
});

// 7. Unavailable and insufficient-evidence Speaking results
runTest('7. Unavailable and insufficient-evidence Speaking turns produce Incomplete mock with overall: null and zero fabricated bands', () => {
  const unavailableTurns = makeCompleteAudioSpeakingSet().map((t) => ({
    ...t,
    instantFeedback: {
      ...t.instantFeedback!,
      isValidAttempt: false,
      assessmentStatus: 'unavailable' as const,
      evidenceMode: 'unavailable' as const,
      pronunciationObservable: false,
      overallBand: null,
      estimatedBand: null,
      criteria: { fc: null, lr: null, gra: null, pr: null }
    }
  }));

  const unavailRes = calculateMockExamScores({
    questions: examSet.questions,
    answers: buildAllCorrectAnswers(),
    task1Text: FULL_TASK1_TEXT,
    essayText: FULL_TASK2_TEXT,
    speakingAnswers: unavailableTurns,
    format: examSet.format,
    speakingTopicSet: topicSet
  });
  assert.equal(unavailRes.isCompleteFullMock, false);
  assert.equal(unavailRes.overall, null);
  assert.equal(unavailRes.sBand, null);
  assert.equal(unavailRes.sDiagnosticBand, null);
  assert.equal(unavailRes.speakingAssessmentStatus, 'unavailable');
  assert.deepEqual(unavailRes.incompleteSkills, ['speaking']);

  const insufficientTurns = makeCompleteAudioSpeakingSet().map((t) => ({
    ...t,
    wordCount: 2,
    transcript: 'Yes ok',
    instantFeedback: {
      ...t.instantFeedback!,
      isValidAttempt: false,
      assessmentStatus: 'insufficient_evidence' as const,
      pronunciationObservable: false,
      overallBand: null
    }
  }));

  const insuffRes = calculateMockExamScores({
    questions: examSet.questions,
    answers: buildAllCorrectAnswers(),
    task1Text: FULL_TASK1_TEXT,
    essayText: FULL_TASK2_TEXT,
    speakingAnswers: insufficientTurns,
    format: examSet.format,
    speakingTopicSet: topicSet
  });
  assert.equal(insuffRes.isCompleteFullMock, false);
  assert.equal(insuffRes.overall, null);
  assert.equal(insuffRes.sBand, null);
  assert.equal(insuffRes.speakingAssessmentStatus, 'insufficient_evidence');
});

// 8. Genuine valid zero Listening/Reading results vs unattempted
runTest('8. Genuine 0/40 attempted Listening & Reading is distinguished from unattempted and supported in complete Full Mock', () => {
  const zeroAttemptedRes = calculateMockExamScores({
    questions: examSet.questions,
    answers: buildAllWrongAnswers(),
    task1Text: FULL_TASK1_TEXT,
    essayText: FULL_TASK2_TEXT,
    speakingAnswers: makeCompleteAudioSpeakingSet(),
    format: examSet.format,
    speakingTopicSet: topicSet
  });

  assert.equal(zeroAttemptedRes.isListeningAssessed, true);
  assert.equal(zeroAttemptedRes.isListeningComplete, true);
  assert.equal(zeroAttemptedRes.lBand, 0.0);
  assert.equal(zeroAttemptedRes.isReadingAssessed, true);
  assert.equal(zeroAttemptedRes.isReadingComplete, true);
  assert.equal(zeroAttemptedRes.rBand, 0.0);
  assert.equal(zeroAttemptedRes.isCompleteFullMock, true);
  assert.equal(zeroAttemptedRes.status, 'Complete');
  assert.ok(zeroAttemptedRes.overall !== null && zeroAttemptedRes.overall > 0);

  // Unattempted Listening/Reading MUST yield null (never 0.0) and Incomplete
  const unattemptedRes = calculateMockExamScores({
    questions: examSet.questions,
    answers: {},
    task1Text: FULL_TASK1_TEXT,
    essayText: FULL_TASK2_TEXT,
    speakingAnswers: makeCompleteAudioSpeakingSet(),
    format: examSet.format,
    speakingTopicSet: topicSet
  });
  assert.equal(unattemptedRes.isListeningAssessed, false);
  assert.equal(unattemptedRes.isListeningComplete, false);
  assert.equal(unattemptedRes.lBand, null);
  assert.equal(unattemptedRes.rBand, null);
  assert.equal(unattemptedRes.isCompleteFullMock, false);
  assert.equal(unattemptedRes.overall, null);
  assert.deepEqual(unattemptedRes.incompleteSkills, ['listening', 'reading']);

  // calculateFourSkillOverallBand also permits genuine 0.0 L/R ONLY when completedSkills explicitly confirms completion
  assert.equal(
    calculateFourSkillOverallBand({
      listeningBand: 0.0,
      readingBand: 0.0,
      writingBand: 6.0,
      speakingBand: 6.0,
      examType: 'full_mock',
      completedSkills: { listening: true, reading: true, writing: true, speaking: true }
    }),
    3.0
  );
  // Without explicit completedSkills confirmation, 0.0 is conservatively rejected as unattempted
  assert.equal(
    calculateFourSkillOverallBand({
      listeningBand: 0.0,
      readingBand: 7.0,
      writingBand: 7.0,
      speakingBand: 7.0,
      examType: 'full_mock'
    }),
    null
  );
});

// 9. Historical incomplete records & backward compatibility
runTest('9. Historical incomplete records (missing Speaking, partial Speaking provenance) are rejected conservatively while valid 4-skill history is preserved', () => {
  // Legacy record missing speakingBand entirely (previously falsely accepted!)
  const legacyMissingSpeaking: ExamHistoryRecord = {
    id: 'hist_legacy_no_speaking',
    timestamp: Date.now() - 86_400_000,
    examType: 'full_mock',
    overallBand: 7.0,
    listeningBand: 7.5,
    readingBand: 7.0,
    writingBand: 6.5,
    speakingBand: undefined,
    wordCount: 410,
    submissionType: 'manual',
    correctCount: 64,
    totalQuestions: 80
  };
  assert.equal(isFullMockExamRecord(legacyMissingSpeaking), false);

  // Legacy record with partial transcript-only Speaking provenance
  const partialSpeakingHistory: ExamHistoryRecord = {
    id: 'hist_partial_speaking',
    timestamp: Date.now() - 43_200_000,
    examType: 'full_mock',
    overallBand: 7.0,
    listeningBand: 7.5,
    readingBand: 7.0,
    writingBand: 6.5,
    speakingBand: 7.0,
    wordCount: 410,
    submissionType: 'manual',
    correctCount: 64,
    totalQuestions: 80,
    completedSkills: { listening: true, reading: true, writing: true, speaking: true },
    speakingAssessmentStatus: 'partial_transcript_only',
    speakingPronunciationObservable: false
  };
  assert.equal(isFullMockExamRecord(partialSpeakingHistory), false);

  // calculateFourSkillOverallBand rejects transcript-only Speaking provenance and incomplete_mock
  assert.equal(
    calculateFourSkillOverallBand({
      listeningBand: 7.5,
      readingBand: 7.0,
      writingBand: 6.5,
      speakingBand: 7.0,
      examType: 'full_mock',
      speakingAssessmentStatus: 'partial_transcript_only',
      speakingPronunciationObservable: false,
      completedSkills: { listening: true, reading: true, writing: true, speaking: true }
    }),
    null
  );
  assert.equal(
    calculateFourSkillOverallBand({
      listeningBand: 7.5,
      readingBand: 7.0,
      writingBand: 6.5,
      speakingBand: 7.0,
      examType: 'incomplete_mock'
    }),
    null
  );

  // Historical incomplete record displays valid L/R/W bands for review with oBand: null and Incomplete status
  const legacyDesc = describeExamHistoryDisplay(legacyMissingSpeaking, 1);
  assert.equal(legacyDesc.isFullMock, false);
  assert.equal(legacyDesc.isIncompleteMock, true);
  assert.equal(legacyDesc.oBand, null);
  assert.equal(legacyDesc.lBand, 7.5);
  assert.equal(legacyDesc.rBand, 7.0);
  assert.equal(legacyDesc.wBand, 6.5);
  assert.equal(legacyDesc.sBand, null);
  assert.equal(legacyDesc.statusNote, 'Incomplete — No Overall Band');

  // Valid historical 4-skill record is preserved untouched
  const validHistorical: ExamHistoryRecord = {
    id: 'hist_valid_4skill',
    timestamp: Date.now() - 10_000,
    examType: 'full_mock',
    overallBand: 7.5,
    listeningBand: 8.0,
    readingBand: 7.5,
    writingBand: 7.0,
    speakingBand: 7.5,
    wordCount: 430,
    submissionType: 'manual',
    correctCount: 70,
    totalQuestions: 80,
    completedSkills: { listening: true, reading: true, writing: true, speaking: true }
  };
  assert.equal(isFullMockExamRecord(validHistorical), true);

  const counts = summarizeExamHistoryCounts([validHistorical, legacyMissingSpeaking, partialSpeakingHistory]);
  assert.equal(counts.completedCount, 1);
  assert.equal(counts.incompleteCount, 2);
  assert.equal(counts.headerBadgeText, '1 Completed · 2 Incomplete');
});

console.log('\n--------------------------------------------------------------');
console.log(`PHASE 3B.3 SUITE SUMMARY: ${passed} passed, ${failed} failed`);
console.log('--------------------------------------------------------------\n');

if (failed > 0) {
  process.exit(1);
}
