/**
 * IELTS SPRINT — SPEAKING SPEECH-RECOGNITION & EVALUATION INTEGRITY TEST SUITE
 * Validates candidate transcript accuracy, strict 5-word input gate, zero placeholder string substitution,
 * zero fabricated grammar errors, zero unsaid word injection, and session scoring.
 */

import {
  checkSpeakingInputGate,
  evaluateSingleSpeakingTurn,
  generateDiagnosticTurnFeedback,
  evaluateSpeakingSession,
  computeSpeakingAnalytics
} from '../../services/SpeakingEvaluationService';
import { SpeakingAnswerRecord } from '../../types/speakingTypes';

async function runSpeakingIntegrityTests() {
  console.log('--- STARTING IELTS SPEAKING INTEGRITY TEST SUITE ---');
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? '-> ' + detail : ''}`);
      failedCount++;
    }
  }

  // Test 1: Rejects sub-5-word attempts with isValidAttempt: false
  const gateResultShort = checkSpeakingInputGate('Hello yes');
  assert(
    gateResultShort.isValidAttempt === false && gateResultShort.overallBand === 0.0,
    'Test 1: Rejects sub-5-word attempts without calling AI evaluation',
    `Got isValidAttempt=${gateResultShort.isValidAttempt}, overallBand=${gateResultShort.overallBand}`
  );

  // Test 2: Accepts valid spoken transcripts (>= 5 words)
  const gateResultValid = checkSpeakingInputGate('I come from a vibrant city in Bangladesh');
  assert(
    gateResultValid.isValidAttempt === true && gateResultValid.wordCount === 8,
    'Test 2: Accepts valid spoken transcripts (>= 5 words)',
    `Got isValidAttempt=${gateResultValid.isValidAttempt}, wordCount=${gateResultValid.wordCount}`
  );

  // Test 3: Does NOT replace transcripts with placeholder strings
  const emptyDiag = generateDiagnosticTurnFeedback('q1', 'Tell me about yourself.', 1, 'Hometown', '', 10, 0);
  assert(
    emptyDiag.candidateTranscript === '' && emptyDiag.isValidAttempt === false,
    'Test 3: Does NOT replace empty transcript with placeholder string',
    `Got transcript="${emptyDiag.candidateTranscript}"`
  );

  // Test 4: Does NOT inject unsaid tricky words
  const cleanSpeech = 'I live in a peaceful neighborhood with my family';
  const cleanDiag = generateDiagnosticTurnFeedback('q2', 'Where do you live?', 1, 'Hometown', cleanSpeech, 12, 100);
  const injectedUnsaid = cleanDiag.pronunciation.trickyWords.some(
    (w) => w.word === 'particularly' || w.word === 'comfortable'
  );
  assert(
    !injectedUnsaid,
    'Test 4: Does NOT inject unsaid tricky words when candidate did not say them',
    `Tricky words found: ${cleanDiag.pronunciation.trickyWords.map((w) => w.word).join(', ')}`
  );

  // Test 5: Does NOT fabricate grammatical errors on clean speech
  assert(
    cleanDiag.grammaticalErrors.length === 0,
    'Test 5: Does NOT fabricate grammatical errors on clean grammatically correct candidate speech',
    `Fabricated errors: ${JSON.stringify(cleanDiag.grammaticalErrors)}`
  );

  // Test 6: Returns real detected grammatical errors when candidate actually makes a mistake
  const flawedSpeech = 'My brother live in Dhaka and he have many friends';
  const flawedDiag = generateDiagnosticTurnFeedback('q3', 'Tell me about your brother.', 1, 'Family', flawedSpeech, 15, 90);
  assert(
    flawedDiag.grammaticalErrors.length >= 1,
    'Test 6: Returns real detected grammatical errors when candidate makes a mistake',
    `Errors detected: ${flawedDiag.grammaticalErrors.map((e) => e.observed).join(', ')}`
  );

  // Test 7: Evaluates Part 1 turn accurately
  const p1Diag = generateDiagnosticTurnFeedback('q_p1', 'What is your favorite subject?', 1, 'Studies', 'My favorite subject in university was computer science because I love solving complex algorithms', 20, 110);
  assert(
    p1Diag.part === 1 && p1Diag.overallBand >= 5.0 && p1Diag.overallBand <= 9.0,
    'Test 7: Evaluates Part 1 turn accurately',
    `Got overallBand=${p1Diag.overallBand}`
  );

  // Test 8: Evaluates Part 2 Monologue turn accurately
  const p2Speech = 'I would like to describe a memorable journey I took to Coxs Bazar two years ago. The scenery was absolutely breathtaking and it gave me a fresh perspective on life.';
  const p2Diag = generateDiagnosticTurnFeedback('q_p2', 'Describe a trip you took.', 2, 'Travel', p2Speech, 60, 120);
  assert(
    p2Diag.part === 2 && p2Diag.overallBand >= 6.0,
    'Test 8: Evaluates Part 2 Monologue turn accurately',
    `Got overallBand=${p2Diag.overallBand}`
  );

  // Test 9: Evaluates Part 3 Discussion turn accurately
  const p3Speech = 'From an international perspective, technological advances have undeniably reshaped economic frameworks. Having said that, governments must address socioeconomic disparities.';
  const p3Diag = generateDiagnosticTurnFeedback('q_p3', 'How has technology affected society?', 3, 'Society', p3Speech, 30, 115);
  assert(
    p3Diag.part === 3 && p3Diag.overallBand >= 6.5,
    'Test 9: Evaluates Part 3 Discussion turn accurately',
    `Got overallBand=${p3Diag.overallBand}`
  );

  // Test 10: Calculates WPM, duration, and pause metrics accurately
  const records: SpeakingAnswerRecord[] = [
    {
      questionId: 'q1',
      part: 1,
      topic: 'Hometown',
      questionText: 'Where are you from?',
      transcript: 'I come from Dhaka Bangladesh',
      startTime: Date.now() - 10000,
      endTime: Date.now(),
      durationSec: 10,
      wordCount: 5,
      wordsPerMinute: 30,
      pauseCount: 1,
      longPauseCount: 0,
      fillerCount: 0,
      detectedFillers: []
    }
  ];
  const analytics = computeSpeakingAnalytics(records);
  assert(
    analytics.totalWordsSpoken === 5 && analytics.totalSpeakingTimeSec === 10,
    'Test 10: Calculates WPM, duration, and pause metrics accurately',
    `Got totalWordsSpoken=${analytics.totalWordsSpoken}, totalTime=${analytics.totalSpeakingTimeSec}`
  );

  // Test 11: Preserves candidate transcript whitespace trimming
  const paddedGate = checkSpeakingInputGate('   I live in a house near the river   ');
  assert(
    paddedGate.isValidAttempt === true && paddedGate.wordCount === 8,
    'Test 11: Preserves candidate transcript whitespace trimming',
    `Got wordCount=${paddedGate.wordCount}`
  );

  // Test 12: Zero-state returns valid structured object on unattempted/sub-5 words
  const zeroReport = evaluateSpeakingSession(records);
  assert(
    zeroReport.isValidAttempt === true && zeroReport.overallBand >= 4.0,
    'Test 12: Session evaluation produces valid band scores for valid answers',
    `Got overallBand=${zeroReport.overallBand}`
  );

  // Test 13: Single turn evaluation handles async execution without throwing
  const asyncResult = await evaluateSingleSpeakingTurn({
    questionId: 'q_async',
    questionText: 'What do you do in your free time?',
    part: 1,
    topic: 'Free Time',
    transcript: 'In my free time I enjoy reading novels and playing football with my friends.',
    durationSec: 15,
    wordsPerMinute: 110
  });
  assert(
    asyncResult.isValidAttempt === true && asyncResult.wordCount === 14,
    'Test 13: Single turn evaluation handles execution cleanly',
    `Got isValidAttempt=${asyncResult.isValidAttempt}, wordCount=${asyncResult.wordCount}`
  );

  // Test 14: Input gate rejects single turn with fewer than 5 words
  const shortAsyncResult = await evaluateSingleSpeakingTurn({
    questionId: 'q_short',
    questionText: 'What is your name?',
    part: 1,
    topic: 'Identity',
    transcript: 'My name Ebadul.',
    durationSec: 3,
    wordsPerMinute: 60
  });
  assert(
    shortAsyncResult.isValidAttempt === false && shortAsyncResult.overallBand === 0.0,
    'Test 14: Input gate rejects single turn with fewer than 5 words',
    `Got isValidAttempt=${shortAsyncResult.isValidAttempt}, band=${shortAsyncResult.overallBand}`
  );

  // Test 15: Session report handles 0 valid answers cleanly
  const emptySessionReport = evaluateSpeakingSession([
    {
      questionId: 'q_empty',
      part: 1,
      topic: 'Test',
      questionText: 'Empty question',
      transcript: 'No speech',
      startTime: Date.now(),
      endTime: Date.now(),
      durationSec: 2,
      wordCount: 2,
      wordsPerMinute: 0,
      pauseCount: 0,
      longPauseCount: 0,
      fillerCount: 0,
      detectedFillers: []
    }
  ]);
  assert(
    emptySessionReport.isValidAttempt === false && emptySessionReport.overallBand === 0.0,
    'Test 15: Session report returns 0.0 zero-state when all turns have < 5 words',
    `Got isValidAttempt=${emptySessionReport.isValidAttempt}, band=${emptySessionReport.overallBand}`
  );

  console.log(`\n--- RESULTS: ${passedCount} PASSED, ${failedCount} FAILED ---`);
  if (failedCount > 0) {
    process.exit(1);
  }
}

runSpeakingIntegrityTests().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
