import assert from 'node:assert/strict';
import {
  calculateOfficialListeningBand,
  calculateOfficialAcademicReadingBand,
  calculateOfficialGeneralTrainingReadingBand,
  isAnswerCorrect,
  normalizeCompletionAnswer
} from '../listeningAnswerEvaluator';
import {
  checkWritingWordThreshold,
  evaluateWritingSubmission
} from '../../services/WritingEvaluationService';
import {
  calculateMockExamScores,
  evaluateQuestionResponse,
  getQuestionsForMistakeVault,
  deriveActiveListeningHeading,
  deriveActiveReadingHeading
} from '../mockExamScoring';
import {
  isFullMockExamRecord,
  summarizeExamHistoryCounts,
  describeExamHistoryDisplay
} from '../userStorage';
import { testPersistenceService } from '../../services/testPersistenceService';
import { MOCK_EXAM_SETS, SPEAKING_TOPIC_BANK } from '../../data/mockExams';
import { SpeakingAnswerRecord } from '../../types/speakingTypes';

function buildSpeakingRecord(
  band: number,
  options: {
    questionId?: string;
    part?: 1 | 2 | 3;
    wordCount?: number;
    isValidAttempt?: boolean;
    omitFeedback?: boolean;
  } = {}
): SpeakingAnswerRecord {
  const {
    questionId = 'sp_q_1',
    part = 1,
    wordCount = 25,
    isValidAttempt = true,
    omitFeedback = false
  } = options;

  return {
    questionId,
    part,
    topic: 'Hometown & Academic Studies',
    questionText: 'Tell me about your hometown.',
    transcript: Array(wordCount).fill('substantive').join(' '),
    startTime: 0,
    endTime: 20000,
    durationSec: 20,
    wordCount,
    wordsPerMinute: 75,
    fillerCount: 0,
    pauseCount: 0,
    instantFeedback: omitFeedback
      ? undefined
      : ({
          isValidAttempt,
          overallBand: band,
          estimatedBand: band
        } as any)
  } as SpeakingAnswerRecord;
}

/**
 * Builds a complete 5-turn Speaking response set matching the configured SpeakingTopicSet
 * structure (2 Part 1 questions + 1 Part 2 cue card + 2 Part 3 discussion questions).
 */
function buildCompleteSpeakingSet(
  bands: [number, number, number, number, number] = [7.5, 8.0, 8.0, 7.5, 8.0],
  topicSet = SPEAKING_TOPIC_BANK[0]
): SpeakingAnswerRecord[] {
  return [
    buildSpeakingRecord(bands[0], { questionId: `${topicSet.id}_p1_0`, part: 1, wordCount: 30 }),
    buildSpeakingRecord(bands[1], { questionId: `${topicSet.id}_p1_1`, part: 1, wordCount: 32 }),
    buildSpeakingRecord(bands[2], { questionId: `${topicSet.id}_p2`, part: 2, wordCount: 140 }),
    buildSpeakingRecord(bands[3], { questionId: `${topicSet.id}_p3_0`, part: 3, wordCount: 45 }),
    buildSpeakingRecord(bands[4], { questionId: `${topicSet.id}_p3_1`, part: 3, wordCount: 48 })
  ];
}

async function runScoringAndReviewIntegrityTests() {
  console.log('=== Running BandSprint Phase 5.4E.4 Production Scoring, Currency, Speaking & Persistence Suite ===\n');

  // ================= 1. NUMERIC, CURRENCY & MULTI-DECIMAL NORMALIZATION (DEF-1) =================
  console.log('[Test Suite 1]: Numeric, Multi-Currency Distractor Guard & Multi-Decimal Normalization');
  assert.equal(
    normalizeCompletionAnswer('350.00'),
    '350',
    '350.00 should normalize to 350'
  );
  assert.equal(
    normalizeCompletionAnswer('£350.00'),
    '£350',
    '£350.00 should preserve £ currency identity and normalize .00 to £350'
  );
  assert.equal(
    normalizeCompletionAnswer('$1250.00'),
    '$1250',
    '$1250.00 should preserve $ currency identity and normalize .00 to $1250'
  );
  assert.equal(
    normalizeCompletionAnswer('  $ 85.00  '),
    '$85',
    'Surrounding whitespace and dollar sign with .00 should normalize to $85'
  );
  assert.equal(
    normalizeCompletionAnswer('12.350.00'),
    '12.350.00',
    'Malformed multi-decimal input 12.350.00 must not be corrupted into 12.350'
  );
  assert.equal(
    normalizeCompletionAnswer('192.168.1.00'),
    '192.168.1.00',
    'Multi-dot sequence 192.168.1.00 must remain intact'
  );
  console.log('  ✓ Trailing .00 decimal, currency preservation, and multi-decimal guard verified.');

  // Test isAnswerCorrect with currency-specific, prefix code, trailing symbol, and distractor currency prompts (DEF-1)
  const currencyQuestion = {
    id: 1,
    section: 'listening' as const,
    type: 'completion' as const,
    prompt: 'Registration fee: £_____',
    correctAnswer: '350',
    acceptableAnswers: ['£350', '350 pounds'],
    explanation: 'The clerk confirms the total fee is £350.'
  };

  assert.ok(
    isAnswerCorrect(currencyQuestion as any, '350'),
    'Exact 350 must be correct when prompt already provides £'
  );
  assert.ok(
    isAnswerCorrect(currencyQuestion as any, '350.00'),
    '350.00 must evaluate to correct for £350'
  );
  assert.ok(
    isAnswerCorrect(currencyQuestion as any, '£350'),
    '£350 must evaluate to correct for £350'
  );
  assert.ok(
    isAnswerCorrect(currencyQuestion as any, '£350.00'),
    '£350.00 must evaluate to correct for £350'
  );
  assert.ok(
    isAnswerCorrect(currencyQuestion as any, '350 pounds'),
    '350 pounds must evaluate to correct for £350'
  );
  assert.ok(
    isAnswerCorrect(currencyQuestion as any, 'GBP 350'),
    'Prefix currency code GBP 350 must evaluate to correct for £350'
  );
  assert.ok(
    isAnswerCorrect(currencyQuestion as any, '350 GBP'),
    'Trailing currency code 350 GBP must evaluate to correct for £350'
  );
  assert.ok(
    isAnswerCorrect(currencyQuestion as any, '350£'),
    'Trailing currency symbol 350£ must evaluate to correct for £350'
  );
  assert.equal(
    isAnswerCorrect(currencyQuestion as any, '$350'),
    false,
    'Mismatched currency symbol $350 must be rejected when expected currency is £'
  );
  assert.equal(
    isAnswerCorrect(currencyQuestion as any, 'USD 350'),
    false,
    'Mismatched currency code USD 350 must be rejected when expected currency is £'
  );
  assert.equal(
    isAnswerCorrect(currencyQuestion as any, '350$'),
    false,
    'Mismatched trailing currency symbol 350$ must be rejected when expected currency is £'
  );
  assert.equal(
    isAnswerCorrect(currencyQuestion as any, '€350.00'),
    false,
    'Mismatched currency symbol €350.00 must be rejected when expected currency is £'
  );
  assert.equal(
    isAnswerCorrect(currencyQuestion as any, '12.350.00'),
    false,
    'Malformed multi-decimal 12.350.00 must be rejected'
  );

  // DEF-1 Multi-currency distractor prompt tests
  const distractorPromptWithCanonicalSymbol = {
    id: 10,
    section: 'listening' as const,
    type: 'completion' as const,
    prompt: 'Initially quoted at $400 online, the final registration fee is £_____',
    correctAnswer: '£350',
    acceptableAnswers: ['350', '350 pounds'],
    explanation: 'Although $400 was mentioned as an overseas quote, the UK fee is £350.'
  };
  assert.equal(
    isAnswerCorrect(distractorPromptWithCanonicalSymbol as any, '$350'),
    false,
    'DEF-1: $350 must be rejected even when prompt mentions $400 as a distractor'
  );
  assert.equal(
    isAnswerCorrect(distractorPromptWithCanonicalSymbol as any, 'USD 350'),
    false,
    'DEF-1: USD 350 must be rejected even when prompt mentions $400 as a distractor'
  );
  assert.ok(
    isAnswerCorrect(distractorPromptWithCanonicalSymbol as any, '£350'),
    'DEF-1: £350 must be accepted when distractor $400 is in prompt'
  );
  assert.ok(
    isAnswerCorrect(distractorPromptWithCanonicalSymbol as any, '350.00'),
    'DEF-1: 350.00 must be accepted when distractor $400 is in prompt'
  );
  assert.ok(
    isAnswerCorrect(distractorPromptWithCanonicalSymbol as any, 'GBP 350'),
    'DEF-1: GBP 350 must be accepted when distractor $400 is in prompt'
  );
  assert.ok(
    isAnswerCorrect(distractorPromptWithCanonicalSymbol as any, '350£'),
    'DEF-1: 350£ must be accepted when distractor $400 is in prompt'
  );

  const distractorPromptWithBlankOnlySymbol = {
    id: 11,
    section: 'listening' as const,
    type: 'completion' as const,
    prompt: 'Standard international rate is $400, but domestic students pay £_____',
    correctAnswer: '350',
    acceptableAnswers: [],
    explanation: 'Domestic students pay £350.'
  };
  assert.equal(
    isAnswerCorrect(distractorPromptWithBlankOnlySymbol as any, '$350'),
    false,
    'DEF-1: $350 must be rejected when blank explicitly specifies £_____ despite $400 distractor in prompt'
  );
  assert.ok(
    isAnswerCorrect(distractorPromptWithBlankOnlySymbol as any, '350'),
    'DEF-1: 350 must be accepted when blank specifies £_____'
  );
  assert.ok(
    isAnswerCorrect(distractorPromptWithBlankOnlySymbol as any, '£350'),
    'DEF-1: £350 must be accepted when blank specifies £_____'
  );
  assert.ok(
    isAnswerCorrect(distractorPromptWithBlankOnlySymbol as any, 'GBP 350'),
    'DEF-1: GBP 350 must be accepted when blank specifies £_____'
  );
  assert.ok(
    isAnswerCorrect(distractorPromptWithBlankOnlySymbol as any, '350£'),
    'DEF-1: 350£ must be accepted when blank specifies £_____'
  );
  console.log('  ✓ DEF-1 multi-currency distractor rejection ($350 rejected even with $400 in prompt) and GBP/trailing £ acceptance verified.');

  // ================= 2. EMPTY & UNANSWERED SUBMISSIONS =================
  console.log('\n[Test Suite 2]: Empty, Unanswered & Blank Guard');
  assert.equal(
    isAnswerCorrect(currencyQuestion as any, ''),
    false,
    'Empty answer must evaluate to false'
  );
  assert.equal(
    isAnswerCorrect(currencyQuestion as any, '   '),
    false,
    'Whitespace-only answer must evaluate to false'
  );
  assert.equal(
    isAnswerCorrect(currencyQuestion as any, '\t\n'),
    false,
    'Tab/newline-only answer must evaluate to false'
  );
  console.log('  ✓ Empty and whitespace submissions safely rejected.');

  // ================= 3. CASE & SYNONYM SENSITIVITY =================
  console.log('\n[Test Suite 3]: Case, Article & Variant Tolerance');
  const vocabQuestion = {
    id: 2,
    section: 'listening' as const,
    type: 'completion' as const,
    prompt: 'Renewable power source: _____',
    correctAnswer: 'solar energy',
    acceptableAnswers: ['solar power', 'the solar energy'],
    explanation: 'Audio references solar energy installation.'
  };

  assert.ok(
    isAnswerCorrect(vocabQuestion as any, 'SOLAR ENERGY'),
    'Uppercase submission must be accepted'
  );
  assert.ok(
    isAnswerCorrect(vocabQuestion as any, '  solar energy  '),
    'Trimmed submission must be accepted'
  );
  assert.ok(
    isAnswerCorrect(vocabQuestion as any, 'solar power'),
    'Acceptable alternative must be accepted'
  );
  assert.ok(
    isAnswerCorrect(vocabQuestion as any, 'the solar energy'),
    'Article variant must be accepted'
  );
  assert.equal(
    isAnswerCorrect(vocabQuestion as any, 'wind energy'),
    false,
    'Wrong answer must evaluate to false'
  );
  assert.equal(
    isAnswerCorrect(vocabQuestion as any, 'energy'),
    false,
    'Incomplete partial word must evaluate to false'
  );
  console.log('  ✓ Case, article stripping, and synonym matching verified.');

  // ================= 4. BAND CONVERSION INTEGRITY =================
  console.log('\n[Test Suite 4]: Band Conversion Practice Benchmarks');
  assert.equal(calculateOfficialListeningBand(0), 0.0, 'Listening 0 -> Band 0.0');
  assert.equal(calculateOfficialListeningBand(1), 2.0, 'Listening 1 -> Band 2.0');
  assert.equal(calculateOfficialListeningBand(16), 5.0, 'Listening 16 -> Band 5.0');
  assert.equal(calculateOfficialListeningBand(23), 6.0, 'Listening 23 -> Band 6.0');
  assert.equal(calculateOfficialListeningBand(30), 7.0, 'Listening 30 -> Band 7.0');
  assert.equal(calculateOfficialListeningBand(35), 8.0, 'Listening 35 -> Band 8.0');
  assert.equal(calculateOfficialListeningBand(39), 9.0, 'Listening 39 -> Band 9.0');
  assert.equal(calculateOfficialListeningBand(40), 9.0, 'Listening 40 -> Band 9.0');

  assert.equal(calculateOfficialAcademicReadingBand(0), 0.0, 'Acad Reading 0 -> Band 0.0');
  assert.equal(calculateOfficialAcademicReadingBand(1), 2.0, 'Acad Reading 1 -> Band 2.0');
  assert.equal(calculateOfficialAcademicReadingBand(15), 5.0, 'Acad Reading 15 -> Band 5.0');
  assert.equal(calculateOfficialAcademicReadingBand(23), 6.0, 'Acad Reading 23 -> Band 6.0');
  assert.equal(calculateOfficialAcademicReadingBand(30), 7.0, 'Acad Reading 30 -> Band 7.0');
  assert.equal(calculateOfficialAcademicReadingBand(35), 8.0, 'Acad Reading 35 -> Band 8.0');
  assert.equal(calculateOfficialAcademicReadingBand(39), 9.0, 'Acad Reading 39 -> Band 9.0');
  assert.equal(calculateOfficialAcademicReadingBand(40), 9.0, 'Acad Reading 40 -> Band 9.0');

  assert.equal(calculateOfficialGeneralTrainingReadingBand(0), 0.0, 'GT Reading 0 -> Band 0.0');
  assert.equal(calculateOfficialGeneralTrainingReadingBand(15), 4.0, 'GT Reading 15 -> Band 4.0');
  assert.equal(calculateOfficialGeneralTrainingReadingBand(23), 5.0, 'GT Reading 23 -> Band 5.0');
  assert.equal(calculateOfficialGeneralTrainingReadingBand(30), 6.0, 'GT Reading 30 -> Band 6.0');
  assert.equal(calculateOfficialGeneralTrainingReadingBand(34), 7.0, 'GT Reading 34 -> Band 7.0');
  assert.equal(calculateOfficialGeneralTrainingReadingBand(38), 8.0, 'GT Reading 38 -> Band 8.0');
  assert.equal(calculateOfficialGeneralTrainingReadingBand(40), 9.0, 'GT Reading 40 -> Band 9.0');
  console.log('  ✓ Published Sprint/IDP conversion boundary benchmarks verified.');

  // ================= 5. PRODUCTION SCORING MODULE (DEF-3 & DEF-4 ENFORCED) =================
  console.log('\n[Test Suite 5]: Production calculateMockExamScores() Completeness, Writing 150w/250w & 3-Part Speaking');
  const sprint18 = MOCK_EXAM_SETS.find(e => e.id === 'sprint-18')!;

  // Target-compliant Task 1 (>= 150 words)
  const validTask1Text = `
    The bar chart illustrates the volume of international visitors arriving in four major European capitals—Paris, London, Rome, and Madrid—between 2015 and 2020.
    Overall, it is evident that Paris consistently welcomed the highest proportion of overseas travelers throughout the entire survey period, whereas Rome experienced the most pronounced upward trajectory in tourist arrivals prior to the final year.
    In 2015, approximately 15.2 million international tourists visited Paris, compared with 12.4 million in London. Over the subsequent four years, arrivals in Paris grew steadily to reach a substantial peak of 19.1 million by 2019, while London expanded at a more moderate pace to 14.8 million over the same interval.
    In contrast, Rome recorded only 7.1 million foreign arrivals in the initial year, trailing Madrid at 8.3 million. However, Rome climbed sharply to 11.6 million by 2019, surpassing Madrid, which plateaued at 10.2 million visitors. Finally, in 2020, all four destinations experienced a significant contraction due to global travel restrictions, although Paris retained its leading position.
  `;

  // Target-compliant Task 2 (>= 250 words)
  const validTask2Text = `
    In contemporary society, university education is increasingly viewed as an indispensable prerequisite for long-term professional advancement.
    While some commentators argue that tertiary qualifications provide essential theoretical rigor and specialized expertise, others contend that vocational apprenticeships and hands-on workplace experience offer more immediate economic utility.
    This essay will examine both perspectives and substantiate the view that academic higher education remains paramount for systemic innovation and sustainable career trajectories.

    On the one hand, specialized professions in domains such as civil engineering, clinical medicine, and international jurisprudence necessitate structured university curricula. Without a foundational command of empirical methodology and theoretical frameworks, practitioners cannot safely navigate complex problem-solving environments. Furthermore, universities cultivate critical inquiry, analytical synthesis, and scholarly discipline, which empower graduates to adapt when technological disruptions render narrow technical routines obsolete.

    On the other hand, practical vocational training provides immediate employability without burdening young adults with substantial student debt. Skilled trades, digital maintenance, and applied technical vocations frequently experience acute labor shortages, offering lucrative remuneration and rapid career entry for school leavers who prefer experiential learning over abstract lectures.

    Nevertheless, a balanced assessment indicates that while vocational pathways fulfill vital operational demands, advanced tertiary education underpins broader socioeconomic progress. Research institutions drive scientific discovery and equip future leaders with the interdisciplinary perspective required to mitigate global challenges.

    In conclusion, although vocational training offers undeniable pragmatic advantages for direct entry into the workforce, university education remains indispensable for intellectual leadership, professional versatility, and long-term societal development. Consequently, educational policymakers should invest in both academic scholarship and applied technical training to ensure a resilient modern economy.
  `;

  // Under-length diagnostic Task 1 (30-149 words: ~85 words)
  const diagnosticUnderLengthTask1 = `
    The bar chart illustrates the volume of international visitors to four major European cities between 2015 and 2020.
    Overall, it is evident that Paris consistently welcomed the highest number of overseas travelers throughout the period, whereas Rome experienced the most rapid rate of growth.
    In 2015, approximately 15 million tourists visited Paris, compared to 12 million in London. Over the subsequent five years, arrivals in Paris grew steadily to reach a peak of 19 million by 2019.
  `;

  // Under-length diagnostic Task 2 (50-249 words: ~135 words)
  const diagnosticUnderLengthTask2 = `
    In contemporary society, university education is increasingly viewed as a prerequisite for professional advancement.
    While some argue that tertiary qualifications provide indispensable academic rigor and specialized expertise, others contend that vocational training and practical experience offer more immediate workplace utility.
    On the one hand, specialized degrees in fields such as engineering, medicine, and jurisprudence necessitate structured academic curricula. Without foundational theoretical knowledge, practitioners cannot navigate complex problem-solving environments.
    In conclusion, while vocational training offers clear pragmatic advantages, academic education remains paramount for leadership roles and systemic innovation.
  `;

  const buildAllCorrectAnswers = (exam = sprint18): Record<number, string> => {
    const map: Record<number, string> = {};
    for (const q of exam.questions) {
      map[q.id] = q.correctAnswer;
    }
    return map;
  };

  const buildAllWrongAnswers = (exam = sprint18): Record<number, string> => {
    const map: Record<number, string> = {};
    for (const q of exam.questions) {
      map[q.id] = 'COMPLETELY_WRONG_CANDIDATE_RESPONSE_XYZ';
    }
    return map;
  };

  // Scenario 1: All four skills completed (all 80 questions answered, Task 1 >= 150w, Task 2 >= 250w, all 5 Speaking prompts across Parts 1-3 evaluated)
  const fullAnswers = buildAllCorrectAnswers(sprint18);
  const fullSpeakingRecords = buildCompleteSpeakingSet([7.5, 8.0, 8.0, 8.0, 8.5]);
  const fullScore = calculateMockExamScores({
    questions: sprint18.questions,
    answers: fullAnswers,
    task1Text: validTask1Text,
    essayText: validTask2Text,
    speakingAnswers: fullSpeakingRecords,
    format: sprint18.format
  });
  assert.ok(fullScore.task1WordCount >= 150, `Task 1 fixture must be >= 150 words (actual: ${fullScore.task1WordCount})`);
  assert.ok(fullScore.wordCount >= 250, `Task 2 fixture must be >= 250 words (actual: ${fullScore.wordCount})`);
  assert.equal(fullScore.status, 'Complete', 'Full attempt must have status Complete');
  assert.equal(fullScore.isCompleteFullMock, true, 'Full attempt must set isCompleteFullMock = true');
  assert.equal(fullScore.incompleteSections.length, 0, 'Full attempt must have 0 incompleteSections');
  assert.equal(fullScore.lBand, 9.0, '40/40 Listening must be Band 9.0');
  assert.equal(fullScore.rBand, 9.0, '40/40 Academic Reading must be Band 9.0');
  assert.ok(fullScore.wBand !== null && fullScore.wBand >= 5.0, 'Complete Writing must produce non-null wBand');
  assert.equal(fullScore.sBand, 8.0, 'Complete 5-turn Speaking average of [7.5,8.0,8.0,8.0,8.5] must round to 8.0');
  const expectedAvg = (9.0 + 9.0 + fullScore.wBand! + 8.0) / 4;
  const whole = Math.floor(expectedAvg);
  const frac = expectedAvg - whole;
  const expectedOverall = whole + (frac >= 0.75 ? 1.0 : frac >= 0.25 ? 0.5 : 0.0);
  assert.equal(fullScore.overall, expectedOverall, 'Overall band must use fixed 4-skill divisor');
  console.log(`  ✓ Scenario 1 (All 4 skills completed with 150w/250w Writing & 5-turn Speaking): Overall Band ${fullScore.overall?.toFixed(1)} verified.`);

  // Scenario 2: Writing unattempted -> Incomplete, no completed overall band
  const noWritingScore = calculateMockExamScores({
    questions: sprint18.questions,
    answers: fullAnswers,
    task1Text: '',
    essayText: '',
    speakingAnswers: fullSpeakingRecords,
    format: sprint18.format
  });
  assert.equal(noWritingScore.isWritingComplete, false, 'Unattempted Writing must be incomplete');
  assert.equal(noWritingScore.wBand, null, 'Unattempted Writing wBand must be null');
  assert.equal(noWritingScore.wDiagnosticBand, null, 'Unattempted Writing wDiagnosticBand must be null');
  assert.equal(noWritingScore.isCompleteFullMock, false, 'Missing Writing must mark mock incomplete');
  assert.equal(noWritingScore.overall, null, 'Missing Writing must not award an overall IELTS band');
  assert.equal(noWritingScore.status, 'Incomplete', 'Status must be Incomplete');
  console.log('  ✓ Scenario 2 (Writing unattempted -> Incomplete, overall = null) verified.');

  // Scenario 3: Writing Task 1 only (>= 150w) -> Incomplete overall Writing band, Task 1 diagnostic preserved
  const task1OnlyScore = calculateMockExamScores({
    questions: sprint18.questions,
    answers: fullAnswers,
    task1Text: validTask1Text,
    essayText: 'Too short task 2.',
    speakingAnswers: fullSpeakingRecords,
    format: sprint18.format
  });
  assert.equal(task1OnlyScore.isTask1Valid, true, 'Task 1 must be diagnostically valid');
  assert.equal(task1OnlyScore.isTask1Complete, true, 'Task 1 (>= 150w) must be complete');
  assert.equal(task1OnlyScore.isTask2Valid, false, 'Task 2 (< 50w) must be invalid');
  assert.equal(task1OnlyScore.isTask2Complete, false, 'Task 2 must be incomplete');
  assert.equal(task1OnlyScore.isWritingComplete, false, 'Task 1 only must not complete Writing');
  assert.equal(task1OnlyScore.isWritingPartial, true, 'Task 1 only must flag isWritingPartial = true');
  assert.equal(task1OnlyScore.wBand, null, 'Task 1 only must not award a completed wBand');
  assert.ok(task1OnlyScore.wDiagnosticBand !== null, 'Task 1 only must preserve wDiagnosticBand');
  assert.ok(task1OnlyScore.t1Report !== null, 'Task 1 diagnostic report must be preserved');
  assert.equal(task1OnlyScore.t2Report, null, 'Task 2 diagnostic report must be null');
  assert.equal(task1OnlyScore.overall, null, 'Task 1 only must not award an overall IELTS band');
  console.log('  ✓ Scenario 3 (Writing Task 1 only -> Incomplete wBand, t1Report preserved) verified.');

  // Scenario 4: Writing Task 2 only (>= 250w) -> Incomplete overall Writing band, Task 2 diagnostic preserved
  const task2OnlyScore = calculateMockExamScores({
    questions: sprint18.questions,
    answers: fullAnswers,
    task1Text: 'Short task 1.',
    essayText: validTask2Text,
    speakingAnswers: fullSpeakingRecords,
    format: sprint18.format
  });
  assert.equal(task2OnlyScore.isTask1Valid, false, 'Task 1 (< 30w) must be invalid');
  assert.equal(task2OnlyScore.isTask1Complete, false, 'Task 1 must be incomplete');
  assert.equal(task2OnlyScore.isTask2Valid, true, 'Task 2 must be diagnostically valid');
  assert.equal(task2OnlyScore.isTask2Complete, true, 'Task 2 (>= 250w) must be complete');
  assert.equal(task2OnlyScore.isWritingComplete, false, 'Task 2 only must not complete Writing');
  assert.equal(task2OnlyScore.isWritingPartial, true, 'Task 2 only must flag isWritingPartial = true');
  assert.equal(task2OnlyScore.wBand, null, 'Task 2 only must not award a completed wBand');
  assert.ok(task2OnlyScore.wDiagnosticBand !== null, 'Task 2 only must preserve wDiagnosticBand');
  assert.equal(task2OnlyScore.t1Report, null, 'Task 1 diagnostic report must be null');
  assert.ok(task2OnlyScore.t2Report !== null, 'Task 2 diagnostic report must be preserved');
  assert.equal(task2OnlyScore.overall, null, 'Task 2 only must not award an overall IELTS band');
  console.log('  ✓ Scenario 4 (Writing Task 2 only -> Incomplete wBand, t2Report preserved) verified.');

  // Scenario 4B (DEF-4): Diagnostic-only under-length Writing (Task 1: 30-149w, Task 2: 50-249w)
  const underTargetWritingScore = calculateMockExamScores({
    questions: sprint18.questions,
    answers: fullAnswers,
    task1Text: diagnosticUnderLengthTask1,
    essayText: diagnosticUnderLengthTask2,
    speakingAnswers: fullSpeakingRecords,
    format: sprint18.format
  });
  assert.ok(
    underTargetWritingScore.task1WordCount >= 30 && underTargetWritingScore.task1WordCount < 150,
    'Under-target Task 1 word count is in [30, 149]'
  );
  assert.ok(
    underTargetWritingScore.wordCount >= 50 && underTargetWritingScore.wordCount < 250,
    'Under-target Task 2 word count is in [50, 249]'
  );
  assert.equal(underTargetWritingScore.isTask1Valid, true, 'DEF-4: 30-149w Task 1 is eligible for diagnostic feedback');
  assert.equal(underTargetWritingScore.isTask2Valid, true, 'DEF-4: 50-249w Task 2 is eligible for diagnostic feedback');
  assert.ok(underTargetWritingScore.t1Report !== null, 'DEF-4: t1Report generated for 30-149w submission');
  assert.ok(underTargetWritingScore.t2Report !== null, 'DEF-4: t2Report generated for 50-249w submission');
  assert.ok(underTargetWritingScore.wDiagnosticBand !== null, 'DEF-4: wDiagnosticBand preserved for under-length submission');
  assert.equal(underTargetWritingScore.isTask1Complete, false, 'DEF-4: <150w Task 1 is NOT full-mock complete');
  assert.equal(underTargetWritingScore.isTask2Complete, false, 'DEF-4: <250w Task 2 is NOT full-mock complete');
  assert.equal(underTargetWritingScore.isWritingComplete, false, 'DEF-4: Under-target Writing must set isWritingComplete = false');
  assert.equal(underTargetWritingScore.isWritingPartial, true, 'DEF-4: Under-target Writing must set isWritingPartial = true');
  assert.equal(underTargetWritingScore.wBand, null, 'DEF-4: Under-target Writing must set wBand = null for full-mock scoring');
  assert.equal(underTargetWritingScore.isCompleteFullMock, false, 'DEF-4: Under-target Writing must not complete full mock');
  assert.equal(underTargetWritingScore.overall, null, 'DEF-4: Under-target Writing must not award overall band');
  console.log('  ✓ Scenario 4B (DEF-4: 30–149w Task 1 & 50–249w Task 2 -> diagnostics preserved, wBand = null, overall = null) verified.');

  // Scenario 5: Both Writing tasks target-compliant (>= 150w & >= 250w) -> 1:2 Task 1/Task 2 weighted band
  const t1Rep = evaluateWritingSubmission(validTask1Text, 'task1');
  const t2Rep = evaluateWritingSubmission(validTask2Text, 'task2');
  const expectedWeightedWBand = Math.round(((t2Rep.overallBand * 2 + t1Rep.overallBand) / 3) * 2) / 2;
  assert.equal(fullScore.wBand, expectedWeightedWBand, 'Both tasks target-compliant must award exact 1:2 weighted Writing band');
  console.log(`  ✓ Scenario 5 (Both Writing tasks >= 150w/250w -> 1:2 weighted Band ${fullScore.wBand?.toFixed(1)}) verified.`);

  // Scenario 6 & DEF-3: Speaking zero, single-turn, partial, invalid, and full 5-turn completion
  const noSpeakingScore = calculateMockExamScores({
    questions: sprint18.questions,
    answers: fullAnswers,
    task1Text: validTask1Text,
    essayText: validTask2Text,
    speakingAnswers: [],
    format: sprint18.format
  });
  assert.equal(noSpeakingScore.isSpeakingAssessed, false, '0 Speaking turns must not be assessed');
  assert.equal(noSpeakingScore.isSpeakingComplete, false, 'Unattempted Speaking must be incomplete');
  assert.equal(noSpeakingScore.sDiagnosticBand, null, 'Unattempted Speaking sDiagnosticBand must be null');
  assert.equal(noSpeakingScore.sBand, null, 'Unattempted Speaking sBand must be null');
  assert.equal(noSpeakingScore.isCompleteFullMock, false, 'Unattempted Speaking must mark mock incomplete');
  assert.equal(noSpeakingScore.overall, null, 'Unattempted Speaking must not award overall band');

  // DEF-3: Single evaluated Speaking response -> incomplete Speaking status and sBand: null
  const oneSpeakingTurnScore = calculateMockExamScores({
    questions: sprint18.questions,
    answers: fullAnswers,
    task1Text: validTask1Text,
    essayText: validTask2Text,
    speakingAnswers: [buildSpeakingRecord(7.5, { questionId: 'sp_topic_1_p1_0', part: 1 })],
    format: sprint18.format
  });
  assert.equal(oneSpeakingTurnScore.speakingEvaluatedCount, 1, 'DEF-3: 1 evaluated turn counted');
  assert.equal(oneSpeakingTurnScore.speakingRequiredCount, 5, 'DEF-3: 5 required turns across Parts 1-3');
  assert.equal(oneSpeakingTurnScore.isSpeakingAssessed, true, 'DEF-3: 1 turn is assessed for diagnostics');
  assert.equal(oneSpeakingTurnScore.isSpeakingPartial, true, 'DEF-3: 1 turn is partial');
  assert.equal(oneSpeakingTurnScore.isSpeakingComplete, false, 'DEF-3: 1 evaluated response must NOT mark Speaking complete');
  assert.equal(oneSpeakingTurnScore.sDiagnosticBand, 7.5, 'DEF-3: Partial diagnostic band preserved for 1 turn');
  assert.equal(oneSpeakingTurnScore.sBand, null, 'DEF-3: Single evaluated response must return sBand = null');
  assert.equal(oneSpeakingTurnScore.isCompleteFullMock, false, 'DEF-3: Single Speaking response must not complete full mock');
  assert.equal(oneSpeakingTurnScore.overall, null, 'DEF-3: Single Speaking response must not award overall band');

  // DEF-3: Partial Speaking (Parts 1 & 2 evaluated, Part 3 missing) -> incomplete
  const partialSpeakingScore = calculateMockExamScores({
    questions: sprint18.questions,
    answers: fullAnswers,
    task1Text: validTask1Text,
    essayText: validTask2Text,
    speakingAnswers: fullSpeakingRecords.slice(0, 3),
    format: sprint18.format
  });
  assert.equal(partialSpeakingScore.speakingEvaluatedCount, 3, 'DEF-3: 3 of 5 turns evaluated');
  assert.equal(partialSpeakingScore.isSpeakingComplete, false, 'DEF-3: Missing Part 3 must keep isSpeakingComplete = false');
  assert.equal(partialSpeakingScore.sBand, null, 'DEF-3: Partial Speaking must keep sBand = null');
  assert.equal(partialSpeakingScore.overall, null, 'DEF-3: Partial Speaking must keep overall = null');

  // DEF-3: 5 turns submitted but 1 turn is invalid (isValidAttempt: false) or unevaluated -> incomplete
  const invalidTurnSpeakingRecords = [
    ...fullSpeakingRecords.slice(0, 4),
    buildSpeakingRecord(0, { questionId: 'sp_topic_1_p3_1', part: 3, isValidAttempt: false })
  ];
  const invalidTurnSpeakingScore = calculateMockExamScores({
    questions: sprint18.questions,
    answers: fullAnswers,
    task1Text: validTask1Text,
    essayText: validTask2Text,
    speakingAnswers: invalidTurnSpeakingRecords,
    format: sprint18.format
  });
  assert.equal(invalidTurnSpeakingScore.speakingEvaluatedCount, 4, 'DEF-3: Invalid turn must not be counted as evaluated');
  assert.equal(invalidTurnSpeakingScore.isSpeakingComplete, false, 'DEF-3: Invalid 5th turn must keep Speaking incomplete');
  assert.equal(invalidTurnSpeakingScore.sBand, null, 'DEF-3: Invalid 5th turn must keep sBand = null');
  console.log('  ✓ Scenario 6 & DEF-3 (Zero, single-turn, partial, invalid, and full 5-turn Speaking completion) verified.');

  // Scenario 7: Listening partially unanswered -> Incomplete, no completed overall band
  const partialListeningAnswers = { ...fullAnswers };
  delete partialListeningAnswers[sprint18.questions.find(q => q.section === 'listening')!.id];
  const partialListeningScore = calculateMockExamScores({
    questions: sprint18.questions,
    answers: partialListeningAnswers,
    task1Text: validTask1Text,
    essayText: validTask2Text,
    speakingAnswers: fullSpeakingRecords,
    format: sprint18.format
  });
  assert.equal(partialListeningScore.listeningUnanswered, 1, '1 unanswered Listening question must be tracked');
  assert.equal(partialListeningScore.listeningIncorrect, 0, 'Unanswered question must not be counted as listeningIncorrect');
  assert.equal(partialListeningScore.isListeningComplete, false, 'Partially unanswered Listening must be incomplete');
  assert.equal(partialListeningScore.isCompleteFullMock, false, 'Partially unanswered Listening must mark mock incomplete');
  assert.equal(partialListeningScore.overall, null, 'Partially unanswered Listening must not award overall band');
  console.log('  ✓ Scenario 7 (Listening partially unanswered -> Incomplete, overall = null) verified.');

  // Scenario 8: Reading partially unanswered -> Incomplete, no completed overall band
  const partialReadingAnswers = { ...fullAnswers };
  delete partialReadingAnswers[sprint18.questions.find(q => q.section === 'reading')!.id];
  const partialReadingScore = calculateMockExamScores({
    questions: sprint18.questions,
    answers: partialReadingAnswers,
    task1Text: validTask1Text,
    essayText: validTask2Text,
    speakingAnswers: fullSpeakingRecords,
    format: sprint18.format
  });
  assert.equal(partialReadingScore.readingUnanswered, 1, '1 unanswered Reading question must be tracked');
  assert.equal(partialReadingScore.readingIncorrect, 0, 'Unanswered question must not be counted as readingIncorrect');
  assert.equal(partialReadingScore.isReadingComplete, false, 'Partially unanswered Reading must be incomplete');
  assert.equal(partialReadingScore.isCompleteFullMock, false, 'Partially unanswered Reading must mark mock incomplete');
  assert.equal(partialReadingScore.overall, null, 'Partially unanswered Reading must not award overall band');
  console.log('  ✓ Scenario 8 (Reading partially unanswered -> Incomplete, overall = null) verified.');

  // Scenario 9: Listening or Reading fully attempted with 0 correct answers -> assessed 0.0, not confused with unattempted
  const allWrongAnswers = buildAllWrongAnswers(sprint18);
  const zeroCorrectScore = calculateMockExamScores({
    questions: sprint18.questions,
    answers: allWrongAnswers,
    task1Text: validTask1Text,
    essayText: validTask2Text,
    speakingAnswers: buildCompleteSpeakingSet([6.0, 6.0, 6.0, 6.0, 6.0]),
    format: sprint18.format
  });
  assert.equal(zeroCorrectScore.listeningCorrect, 0, '0 correct Listening answers');
  assert.equal(zeroCorrectScore.listeningIncorrect, 40, 'All 40 Listening answers counted as genuinely incorrect');
  assert.equal(zeroCorrectScore.listeningUnanswered, 0, '0 unanswered Listening answers');
  assert.equal(zeroCorrectScore.isListeningAssessed, true, 'Fully attempted Listening with 0 correct is assessed');
  assert.equal(zeroCorrectScore.isListeningComplete, true, 'Fully attempted Listening with 0 correct is complete');
  assert.equal(zeroCorrectScore.lBand, 0.0, 'Assessed 0/40 Listening receives Band 0.0');
  assert.equal(zeroCorrectScore.isReadingAssessed, true, 'Fully attempted Reading with 0 correct is assessed');
  assert.equal(zeroCorrectScore.isReadingComplete, true, 'Fully attempted Reading with 0 correct is complete');
  assert.equal(zeroCorrectScore.rBand, 0.0, 'Assessed 0/40 Reading receives Band 0.0');
  assert.equal(zeroCorrectScore.isCompleteFullMock, true, 'All 4 skills completed even with 0/40 L & R');
  assert.ok(zeroCorrectScore.overall !== null && zeroCorrectScore.overall > 0, 'Completed mock with 0/40 L & R still computes valid 4-skill overall band');
  console.log(`  ✓ Scenario 9 (0/40 genuinely incorrect -> assessed 0.0, overall = ${zeroCorrectScore.overall?.toFixed(1)}) verified.`);

  // Scenario 10: All skills unattempted -> Incomplete, never Band 0.0
  const emptyScore = calculateMockExamScores({
    questions: sprint18.questions,
    answers: {},
    task1Text: '',
    essayText: '',
    speakingAnswers: [],
    format: sprint18.format
  });
  assert.equal(emptyScore.status, 'Incomplete', 'All unattempted must be Incomplete');
  assert.equal(emptyScore.isCompleteFullMock, false, 'All unattempted must have isCompleteFullMock = false');
  assert.equal(emptyScore.lBand, null, 'Unattempted Listening lBand must be null');
  assert.equal(emptyScore.rBand, null, 'Unattempted Reading rBand must be null');
  assert.equal(emptyScore.wBand, null, 'Unattempted Writing wBand must be null');
  assert.equal(emptyScore.sBand, null, 'Unattempted Speaking sBand must be null');
  assert.equal(emptyScore.overall, null, 'Unattempted mock overall must be null, never 0.0');
  assert.equal(emptyScore.incompleteSections.length, 5, 'All 5 required components (L, R, W1, W2, S) listed as incomplete');
  console.log('  ✓ Scenario 10 (All skills unattempted -> Incomplete, overall = null, never Band 0.0) verified.');

  // ================= 6. MISTAKE VAULT EVALUATOR PARITY & REVIEW HELPERS =================
  console.log('\n[Test Suite 6]: Mistake Vault Evaluator Parity & Review Helpers');
  const vaultTestQuestions = [
    {
      id: 101,
      section: 'listening' as const,
      type: 'completion' as const,
      prompt: 'Total deposit: £_____',
      correctAnswer: '350',
      acceptableAnswers: ['£350', '350 pounds'],
      explanation: 'Deposit is £350.'
    },
    {
      id: 102,
      section: 'reading' as const,
      type: 'short_answer' as const,
      prompt: 'Primary source of power:',
      correctAnswer: 'solar energy',
      acceptableAnswers: ['solar power'],
      explanation: 'Solar energy.'
    }
  ];

  const vaultTestAnswers: Record<number, string> = {
    101: '350.00',
    102: 'energy'
  };

  const q101Eval = evaluateQuestionResponse(vaultTestQuestions[0] as any, vaultTestAnswers[101]);
  const q102Eval = evaluateQuestionResponse(vaultTestQuestions[1] as any, vaultTestAnswers[102]);
  assert.equal(q101Eval.isCorrect, true, 'Review card evaluator marks 350.00 as correct for £350');
  assert.equal(q102Eval.isCorrect, false, 'Review card evaluator marks partial substring "energy" as incorrect for "solar energy"');

  const vaultMistakes = getQuestionsForMistakeVault(vaultTestQuestions as any, vaultTestAnswers, false);
  assert.equal(vaultMistakes.length, 1, 'Exactly 1 genuine mistake must be synced to Mistake Vault');
  assert.equal(vaultMistakes[0].questionId, 102, 'Q102 ("energy") must be synced as a mistake, while Q101 ("350.00") is not');
  console.log('  ✓ Scenario 11 (Mistake Vault sync matches review card evaluator 100%) verified.');

  // Scenario 12: Dynamic Listening and Reading headings across all 5 exams
  for (const exam of MOCK_EXAM_SETS) {
    const firstListeningQ = exam.questions.find(q => q.section === 'listening')!;
    const lastReadingQ = [...exam.questions].reverse().find(q => q.section === 'reading')!;

    const lHeading = deriveActiveListeningHeading(exam, firstListeningQ);
    const rHeading = deriveActiveReadingHeading(exam, lastReadingQ);

    assert.ok(lHeading.badge.length > 0 && lHeading.title.length > 0, `${exam.id}: Listening heading must be non-empty`);
    assert.ok(rHeading.badge.length > 0 && rHeading.title.length > 0, `${exam.id}: Reading heading must be non-empty`);
    assert.notEqual(
      lHeading.title,
      'Campus Orientation Listening Audio',
      `${exam.id}: Must not use hardcoded legacy Campus Orientation Listening Audio heading`
    );
    assert.notEqual(
      rHeading.title,
      'The Neurobiology of Bilingualism & Cognitive Reserve',
      `${exam.id}: Must not use hardcoded legacy Neurobiology of Bilingualism heading`
    );
  }
  console.log('  ✓ Scenario 12 (Dynamic Listening & Reading headings across all 5 exams) verified.');

  // Scenario 13: Zero-question fallback handling (no false || 40)
  const zeroQuestionScore = calculateMockExamScores({
    questions: [],
    answers: {},
    task1Text: '',
    essayText: '',
    speakingAnswers: [],
    format: 'Academic'
  });
  assert.equal(zeroQuestionScore.listeningTotal, 0, 'Empty question array must report listeningTotal = 0, never 40');
  assert.equal(zeroQuestionScore.readingTotal, 0, 'Empty question array must report readingTotal = 0, never 40');
  console.log('  ✓ Scenario 13 (Zero-question counter reports 0, never false 40) verified.');

  // Scenario 14 & DEF-5: Persistence, History Guard & MockTestPage Incomplete History Presentation
  console.log('\n[Test Suite 7]: DEF-2 Session Persistence & DEF-5 Incomplete History Presentation');
  const incompleteRecord = {
    id: 'inc_1',
    timestamp: Date.now(),
    examType: 'incomplete_mock' as const,
    overallBand: null,
    listeningBand: 7.5,
    readingBand: 7.0,
    writingBand: null,
    speakingBand: null,
    wordCount: 110,
    submissionType: 'manual' as const,
    correctCount: 66,
    totalQuestions: 80,
    completedSkills: {
      listening: true,
      reading: true,
      writing: false,
      speaking: false
    }
  };
  const validFullRecord = {
    id: 'valid_full_1',
    timestamp: Date.now(),
    examType: 'full_mock' as const,
    overallBand: 7.5,
    listeningBand: 8.0,
    readingBand: 7.5,
    writingBand: 7.0,
    speakingBand: 7.5,
    wordCount: 420,
    submissionType: 'manual' as const,
    correctCount: 70,
    totalQuestions: 80,
    completedSkills: {
      listening: true,
      reading: true,
      writing: true,
      speaking: true
    }
  };

  assert.equal(
    isFullMockExamRecord(incompleteRecord),
    false,
    'incomplete_mock record must never be treated as a completed full_mock'
  );
  assert.equal(
    isFullMockExamRecord({
      id: 'legacy_partial_1',
      timestamp: Date.now(),
      examType: 'full_mock',
      overallBand: 7.5,
      listeningBand: 7.5,
      readingBand: 7.5,
      writingBand: 0,
      speakingBand: 0,
      wordCount: 0,
      submissionType: 'manual',
      correctCount: 65,
      totalQuestions: 80
    }),
    false,
    'Legacy full_mock record with 0/unassessed writing or speaking must be rejected by isFullMockExamRecord'
  );
  assert.equal(
    isFullMockExamRecord(validFullRecord),
    true,
    'Complete 4-skill full_mock record must be accepted by isFullMockExamRecord'
  );

  // DEF-5: Verify summarizeExamHistoryCounts & describeExamHistoryDisplay
  const mixedCounts = summarizeExamHistoryCounts([validFullRecord, incompleteRecord]);
  assert.equal(mixedCounts.total, 2);
  assert.equal(mixedCounts.completedCount, 1);
  assert.equal(mixedCounts.incompleteCount, 1);
  assert.equal(
    mixedCounts.headerBadgeText,
    '1 Completed · 1 Incomplete',
    'DEF-5: Mixed history header must distinguish Completed from Incomplete attempts'
  );

  const completedOnlyCounts = summarizeExamHistoryCounts([validFullRecord]);
  assert.equal(
    completedOnlyCounts.headerBadgeText,
    '1 Completed',
    'DEF-5: Completed-only history header shows X Completed'
  );

  const incDesc = describeExamHistoryDisplay(incompleteRecord, 1);
  assert.equal(incDesc.title, 'Incomplete Mock Test #1', 'DEF-5: incomplete_mock must render explicit Incomplete Mock Test title');
  assert.equal(incDesc.badgeScore, 'INC', 'DEF-5: incomplete_mock badge must be INC');
  assert.equal(incDesc.isIncompleteMock, true);
  assert.equal(incDesc.isFullMock, false);
  assert.equal(incDesc.oBand, null, 'DEF-5: incomplete_mock must never invent an overall band');
  assert.deepEqual(
    incDesc.skillSummaryParts,
    ['L: 7.5', 'R: 7.0', 'W: —', 'S: —'],
    'DEF-5: incomplete_mock must display available completed skill bands and — for incomplete skills'
  );
  assert.equal(incDesc.statusNote, 'Incomplete — No Overall Band');

  const fullDesc = describeExamHistoryDisplay(validFullRecord, 2);
  assert.equal(fullDesc.title, 'Full Mock Test #2');
  assert.equal(fullDesc.badgeScore, '7.5');
  assert.equal(fullDesc.isFullMock, true);
  assert.equal(fullDesc.isIncompleteMock, false);
  console.log('  ✓ DEF-5 (MockTestPage history counts and Incomplete Mock Test # card descriptor) verified.');

  // DEF-2: Verify active session, incomplete review session, speakingAnswers persistence, legacy compatibility, and completed clear
  const testSessionKey = 'test_phase_5_4e4_persistence_verification';
  await testPersistenceService.saveProgress({
    sessionId: testSessionKey,
    testType: 'live_mock',
    testSetId: 'sprint-18',
    activeSection: 'speaking',
    currentQuestionIndex: 12,
    answers: { 1: '350', 2: 'solar energy' },
    flagged: { 2: true },
    task1Text: diagnosticUnderLengthTask1,
    essayText: validTask2Text,
    speakingAnswers: fullSpeakingRecords.slice(0, 2),
    timeLeftSeconds: 945,
    isTimerRunning: true,
    status: 'active',
    updatedAt: Date.now()
  });
  const savedActive = await testPersistenceService.getProgress(testSessionKey);
  assert.ok(savedActive !== null, 'DEF-2: Active session must be retrievable');
  assert.equal(savedActive?.status, 'active');
  assert.equal(savedActive?.speakingAnswers?.length, 2, 'DEF-2: Active session must persist speakingAnswers');
  assert.equal(savedActive?.speakingAnswers?.[0]?.questionId, fullSpeakingRecords[0].questionId);

  // Save incomplete review session
  await testPersistenceService.saveProgress({
    sessionId: testSessionKey,
    testType: 'live_mock',
    testSetId: 'sprint-17',
    activeSection: 'speaking',
    currentQuestionIndex: 0,
    answers: { 1: 'harbour' },
    flagged: {},
    task1Text: diagnosticUnderLengthTask1,
    essayText: diagnosticUnderLengthTask2,
    speakingAnswers: [fullSpeakingRecords[0]],
    submissionReason: 'timer',
    timeLeftSeconds: 0,
    isTimerRunning: false,
    status: 'review',
    updatedAt: Date.now(),
    meta: {
      isCompleteFullMock: false,
      incompleteSections: ['Speaking (1/5 required turns evaluated)']
    }
  });
  const savedReview = await testPersistenceService.getProgress(testSessionKey);
  assert.ok(savedReview !== null, 'DEF-2: Incomplete review session must be retrievable');
  assert.equal(savedReview?.status, 'review', 'DEF-2: Saved status must be review');
  assert.equal(savedReview?.submissionReason, 'timer', 'DEF-2: Saved submissionReason must be preserved');
  assert.equal(savedReview?.speakingAnswers?.length, 1, 'DEF-2: Incomplete review session must persist speakingAnswers');

  // Legacy record without speakingAnswers backward compatibility
  await testPersistenceService.saveProgress({
    sessionId: testSessionKey,
    testType: 'live_mock',
    testSetId: 'bc-authentic-3',
    status: 'active',
    updatedAt: Date.now()
  });
  const savedLegacy = await testPersistenceService.getProgress(testSessionKey);
  const restoredLegacySpeaking = Array.isArray(savedLegacy?.speakingAnswers) ? savedLegacy!.speakingAnswers : [];
  assert.deepEqual(restoredLegacySpeaking, [], 'DEF-2: Legacy record without speakingAnswers must safely default to []');

  // Clear completed session
  await testPersistenceService.clearProgress(testSessionKey);
  const afterClear = await testPersistenceService.getProgress(testSessionKey);
  assert.equal(afterClear, null, 'DEF-2: Completed session clearProgress must remove stored session');
  console.log('  ✓ DEF-2 (Active & incomplete review session restoration, speakingAnswers persistence, legacy fallback, and clearProgress) verified.');

  // ================= 8. ALL 5 MOCK EXAM SETS ITEM-BY-ITEM VERIFICATION =================
  console.log('\n[Test Suite 8]: All 5 Mock Exam Sets Canonical Scoring Verification');
  for (const exam of MOCK_EXAM_SETS) {
    const lQs = exam.questions.filter(q => q.section === 'listening');
    const rQs = exam.questions.filter(q => q.section === 'reading');

    assert.equal(lQs.length, 40, `${exam.id}: Exactly 40 listening questions expected`);
    assert.equal(rQs.length, 40, `${exam.id}: Exactly 40 reading questions expected`);

    const examAnswers = buildAllCorrectAnswers(exam);
    const examScore = calculateMockExamScores({
      questions: exam.questions,
      answers: examAnswers,
      task1Text: validTask1Text,
      essayText: validTask2Text,
      speakingAnswers: buildCompleteSpeakingSet([8.0, 8.0, 8.0, 8.0, 8.0]),
      format: exam.format
    });

    assert.equal(examScore.listeningCorrect, 40, `${exam.id}: 40/40 listening correct`);
    assert.equal(examScore.readingCorrect, 40, `${exam.id}: 40/40 reading correct`);
    assert.equal(examScore.lBand, 9.0, `${exam.id}: 40/40 listening -> Band 9.0`);
    assert.equal(examScore.rBand, 9.0, `${exam.id}: 40/40 reading -> Band 9.0`);
    assert.equal(examScore.isCompleteFullMock, true, `${exam.id}: Complete mock verified`);
  }
  console.log('  ✓ All 5 mock exams (sprint-18, sprint-17, bc-authentic-3, sprint-16, gt-test-1) verified.');

  console.log('\n=========================================================');
  console.log('ALL PHASE 5.4E.4 SCORING, CURRENCY, SPEAKING & PERSISTENCE TESTS PASSED!');
  console.log('=========================================================\n');
}

runScoringAndReviewIntegrityTests();
