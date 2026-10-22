import assert from 'node:assert/strict';
import {
  parseOptionItem,
  extractWordLimitFromQuestion,
  isListeningAnswerCorrect,
  isListeningOptionCorrect,
  formatDisplayedCorrectAnswer,
  resolveDialogueLineSpeakerId,
  inferDialogueSpeakerGender,
  assignSectionDialogueSpeakers,
  IELTS_LISTENING_PARTS,
  getListeningPartMeta,
  getListeningQuestionProgress,
  formatIELTSSpeechText,
  SPEAKER_EDGE_VOICE_MAP
} from '../listeningAnswerEvaluator';
import { inferSpeechDeliveryProfile, SPEECH_DELIVERY_PROFILES } from '../../config/speechDirection';
import { questionEngine, IELTSQuestion } from '../../services/QuestionEngine';
import { zeroRepetitionEngine, extractQuestionScriptText } from '../../services/ZeroRepetitionEngine';
import { audioManager } from '../../services/AudioManager';
import {
  registerUser,
  getActiveUser,
  recordExamAttempt,
  isFullMockExamRecord
} from '../userStorage';
import { addMistake, getMistakes, clearMistakes } from '../vaultStorage';
import { evaluateAchievements } from '../../services/achievementService';

function ensureLocalStorageShim() {
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, val: string) => {
        store.set(key, String(val));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      }
    };
  }
  if (typeof (globalThis as any).window === 'undefined') {
    (globalThis as any).window = {
      dispatchEvent: () => true
    };
  }
  if (typeof (globalThis as any).CustomEvent === 'undefined') {
    (globalThis as any).CustomEvent = class CustomEvent {
      type: string;
      detail: any;
      constructor(type: string, opts?: { detail?: any }) {
        this.type = type;
        this.detail = opts?.detail;
      }
    };
  }
}

function runListeningIntegrityTests() {
  ensureLocalStorageShim();
  console.log('=== Running IELTS Sprint Phase 5B & 5B.2 Listening Integrity Regression Suite ===\n');

  const allListening = questionEngine.getAllQuestions().filter((q) => q.module === 'listening');
  assert.ok(allListening.length >= 156, `Expected at least 156 listening questions in bank, found ${allListening.length}`);

  // ---------------------------------------------------------------------------
  // STEP 2: Answer Marking Regression Tests (9 Required Cases)
  // ---------------------------------------------------------------------------

  // Case 1: A correct multiple-choice letter matching an answer stored as "B) Marine Engineering"
  const mcPrefixedAnswerQuestion: IELTSQuestion = {
    ...allListening.find((q) => q.id === 'lis_s2_04')!,
    options: [
      'A) Structural Bridge Design',
      'B) Marine Engineering',
      'C) Aerospace Propulsion'
    ],
    correctAnswer: 'B) Marine Engineering'
  };
  assert.equal(
    isListeningAnswerCorrect(mcPrefixedAnswerQuestion, 'B'),
    true,
    'Case 1 Failed: Bare letter "B" must match correctAnswer stored as "B) Marine Engineering"'
  );
  assert.equal(
    isListeningAnswerCorrect(mcPrefixedAnswerQuestion, 'b'),
    true,
    'Case 1b Failed: Lowercase letter "b" must match correctAnswer stored as "B) Marine Engineering"'
  );
  console.log('PASS [Step 2.1]: Multiple-choice letter "B" matches answer stored as "B) Marine Engineering".');

  // Case 2: A correct answer stored as a bare letter
  const mcBareLetterQuestion = allListening.find((q) => q.id === 'lis_s2_04')!;
  assert.equal(mcBareLetterQuestion.correctAnswer, 'B');
  assert.equal(
    isListeningAnswerCorrect(mcBareLetterQuestion, 'B'),
    true,
    'Case 2 Failed: Bare letter "B" must match correctAnswer stored as bare letter "B"'
  );
  assert.equal(
    isListeningAnswerCorrect(mcBareLetterQuestion, 'Heavy-duty steel-toe boots and leather gloves'),
    true,
    'Case 2b Failed: Exact option label must also match bare-letter correctAnswer "B"'
  );
  console.log('PASS [Step 2.2]: Multiple-choice selection matches answer stored as bare letter "B".');

  // Case 3: A wrong multiple-choice selection
  assert.equal(
    isListeningAnswerCorrect(mcBareLetterQuestion, 'A'),
    false,
    'Case 3 Failed: Wrong multiple-choice letter "A" must be marked false'
  );
  assert.equal(
    isListeningAnswerCorrect(mcPrefixedAnswerQuestion, 'C'),
    false,
    'Case 3b Failed: Wrong multiple-choice letter "C" must be marked false'
  );
  console.log('PASS [Step 2.3]: Wrong multiple-choice selections are rejected.');

  // Case 4: Completion answers with harmless case and whitespace differences
  const surnameQuestion = allListening.find((q) => q.id === 'lis_s1_01')!; // BRAITHWAITE
  assert.equal(
    isListeningAnswerCorrect(surnameQuestion, '  braithwaite  '),
    true,
    'Case 4 Failed: Harmless case and leading/trailing whitespace differences must be accepted'
  );
  assert.equal(
    isListeningAnswerCorrect(surnameQuestion, 'Braithwaite'),
    true,
    'Case 4b Failed: Mixed case "Braithwaite" must be accepted'
  );
  console.log('PASS [Step 2.4]: Completion answers normalize harmless case and whitespace differences.');

  // Case 5: Valid configured acceptable-answer variants
  const rentQuestion = allListening.find((q) => q.id === 'lis_s1_12')!; // 1650 / 1,650 / one thousand six hundred and fifty
  assert.equal(
    isListeningAnswerCorrect(rentQuestion, '1,650'),
    true,
    'Case 5a Failed: Acceptable variant "1,650" must be marked correct'
  );
  assert.equal(
    isListeningAnswerCorrect(rentQuestion, 'one thousand six hundred and fifty'),
    true,
    'Case 5b Failed: Acceptable multi-word variant on question without word limit must be marked correct'
  );
  const dietaryQuestion = allListening.find((q) => q.id === 'lis_s1_13')!; // GLUTEN FREE / gluten-free
  assert.equal(
    isListeningAnswerCorrect(dietaryQuestion, 'gluten-free'),
    true,
    'Case 5c Failed: Acceptable hyphenated variant "gluten-free" must be marked correct'
  );
  console.log('PASS [Step 2.5]: Configured acceptable-answer variants are accepted.');

  // Case 6: A valid answer within a configured word limit
  const generatedOneWordSample = zeroRepetitionEngine.generateFreshOriginalSectionQuestions(4, 1, 1)[0];
  // generatedOneWordSample prompt includes "(ONE WORD ONLY)"
  assert.equal(
    extractWordLimitFromQuestion(generatedOneWordSample),
    1,
    'Case 6 Failed: Should extract word limit of 1 from "(ONE WORD ONLY)" prompt'
  );
  assert.equal(
    isListeningAnswerCorrect(generatedOneWordSample, String(generatedOneWordSample.correctAnswer)),
    true,
    'Case 6b Failed: Single-word correct answer within ONE WORD ONLY limit must be accepted'
  );
  console.log('PASS [Step 2.6]: Valid answer within configured word limit is accepted.');

  // Case 7: An otherwise correct answer that exceeds that word limit
  const wordLimitedQuestionWithLongVariant: IELTSQuestion = {
    ...generatedOneWordSample,
    correctAnswer: 'SEDIMENT',
    acceptableAnswers: ['sediment', 'coastal sediment', 'accumulated coastal sediment']
  };
  assert.equal(
    isListeningAnswerCorrect(wordLimitedQuestionWithLongVariant, 'coastal sediment'),
    false,
    'Case 7 Failed: 2-word answer "coastal sediment" must be rejected when prompt specifies ONE WORD ONLY'
  );
  const twoWordLimitQuestion: IELTSQuestion = {
    ...allListening.find((q) => q.id === 'lis_s1_03')!, // HYBRID COMPACT
    prompt: 'Write NO MORE THAN TWO WORDS: Vehicle category selected: [3]',
    acceptableAnswers: ['hybrid compact', 'compact hybrid vehicle']
  };
  assert.equal(extractWordLimitFromQuestion(twoWordLimitQuestion), 2);
  assert.equal(
    isListeningAnswerCorrect(twoWordLimitQuestion, 'hybrid compact'),
    true,
    'Case 7b Failed: 2-word answer within NO MORE THAN TWO WORDS must be accepted'
  );
  assert.equal(
    isListeningAnswerCorrect(twoWordLimitQuestion, 'compact hybrid vehicle'),
    false,
    'Case 7c Failed: 3-word answer exceeding NO MORE THAN TWO WORDS must be rejected'
  );
  console.log('PASS [Step 2.7]: Otherwise matching answer that exceeds configured word limit is rejected.');

  // Case 8: A long answer containing the target word as part of unrelated text
  const rachisQuestion = allListening.find((q) => q.id === 'lis_s4_exp_35')!; // RACHIS
  assert.equal(
    isListeningAnswerCorrect(rachisQuestion, 'I think the brittle rachis shattered in the wind'),
    false,
    'Case 8a Failed: Long sentence containing target word "rachis" must be rejected'
  );
  assert.equal(
    isListeningAnswerCorrect(surnameQuestion, 'Her surname is Braithwaite and first name Eleanor'),
    false,
    'Case 8b Failed: Unrelated phrase containing target word "Braithwaite" must be rejected'
  );
  console.log('PASS [Step 2.8]: Long answers containing target word inside unrelated text are rejected.');

  // Case 9: Consistency between submission scoring and review-table correctness
  zeroRepetitionEngine.resetRegistry();
  const exam40 = zeroRepetitionEngine.generateUniqueListeningExam40({ deferRegistration: true });
  assert.equal(exam40.questions.length, 40, 'Expected 40 questions in generated exam');

  const simulatedUserAnswers: Record<string, string> = {};
  exam40.questions.forEach((q, idx) => {
    if (idx % 3 === 0) {
      // Correct answer (for MC with options, simulate selecting the option letter as UI does)
      if (q.options && q.options.length > 0) {
        const corrStr = Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer || 'A';
        const letterMatch = corrStr.trim().match(/^([A-Za-z])/);
        simulatedUserAnswers[q.id] = letterMatch ? letterMatch[1].toUpperCase() : corrStr;
      } else {
        const corrStr = Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer || '';
        simulatedUserAnswers[q.id] = `  ${corrStr.toLowerCase()} `;
      }
    } else if (idx % 3 === 1) {
      // Wrong answer containing substring or wrong letter
      simulatedUserAnswers[q.id] = q.options ? 'Z' : `unrelated text mentioning ${q.correctAnswer}`;
    } else {
      // Blank answer
      simulatedUserAnswers[q.id] = '';
    }
  });

  let submissionScoreCount = 0;
  const submissionPerQuestion: boolean[] = [];
  exam40.questions.forEach((q) => {
    const ok = isListeningAnswerCorrect(q, simulatedUserAnswers[q.id] || '');
    submissionPerQuestion.push(ok);
    if (ok) submissionScoreCount++;
  });

  let reviewTableCorrectCount = 0;
  exam40.questions.forEach((q, idx) => {
    const reviewOk = isListeningAnswerCorrect(q, (simulatedUserAnswers[q.id] || '').trim());
    const displayedCorrect = formatDisplayedCorrectAnswer(q);
    assert.equal(
      reviewOk,
      submissionPerQuestion[idx],
      `Case 9 Failed: Mismatch at Q${idx + 1} (${q.id}) between submission scoring and review table`
    );
    assert.ok(displayedCorrect.length > 0, `Displayed correct answer should not be empty for Q${idx + 1}`);
    if (reviewOk) reviewTableCorrectCount++;
  });
  assert.equal(submissionScoreCount, reviewTableCorrectCount);
  assert.equal(submissionScoreCount, 14, 'Expected exactly 14 correct answers (indices 0, 3, 6, ..., 39)');
  console.log(`PASS [Step 2.9]: Submission score (${submissionScoreCount}/40) and review-table markings are 100% consistent.`);

  // ---------------------------------------------------------------------------
  // STEP 3: Speaker Identity Preservation Regression Tests
  // ---------------------------------------------------------------------------
  const femaleSection1Line = {
    speaker: 'Charlotte (Student - Asking Questions)',
    speakerId: 'speaker_05',
    gender: 'female' as const,
    text: 'Good morning, I would like to register.'
  };
  assert.equal(
    resolveDialogueLineSpeakerId(femaleSection1Line, 1),
    'speaker_05',
    'Step 3 Failed: Resolved female speaker_05 in Section 1 must not be overwritten with speaker_01'
  );

  const australianFemaleSection2Line = {
    speaker: 'Natasha (Australian Park Guide)',
    speakerId: 'speaker_07',
    gender: 'female' as const,
    text: 'Welcome to the wetland park.'
  };
  assert.equal(
    resolveDialogueLineSpeakerId(australianFemaleSection2Line, 2),
    'speaker_07',
    'Step 3 Failed: Resolved speaker_07 in Section 2 must not be overwritten with speaker_01'
  );

  const fallbackMissingSpeakerIdLine = {
    speaker: 'Receptionist (Charlotte)',
    gender: 'female' as const,
    text: 'How may I help you?'
  };
  assert.equal(
    resolveDialogueLineSpeakerId(fallbackMissingSpeakerIdLine, 1),
    'speaker_05',
    'Step 3 Failed: Missing speakerId with female speaker should resolve to speaker_05'
  );

  const assignedProfiles = audioManager.assignDistinctSpeakerProfiles([
    { speaker: 'Examiner (Arthur)', speakerId: 'speaker_04', gender: 'male', text: 'Section 1.' },
    { speaker: 'Student (Charlotte)', speakerId: 'speaker_05', gender: 'female', text: 'Hello!' },
    { speaker: 'Advisor (Arthur)', speakerId: 'speaker_04', gender: 'male', text: 'Welcome.' }
  ]);
  assert.equal(assignedProfiles[0].speakerId, 'speaker_04');
  assert.equal(assignedProfiles[1].speakerId, 'speaker_05');
  assert.equal(assignedProfiles[2].speakerId, 'speaker_04');
  console.log('PASS [Step 3]: Speaker identities (speaker_05, speaker_07, speaker_04) are preserved across Sections 1–4.');

  // ---------------------------------------------------------------------------
  // STEP 5 & 6: Deferred Registration & ZeroRepetitionEngine / Freeze Benchmarks
  // ---------------------------------------------------------------------------
  zeroRepetitionEngine.resetRegistry();
  const summaryBefore = zeroRepetitionEngine.getRegistrySummary();
  assert.equal(summaryBefore.totalUniqueQuestionsUsed, 0);

  const t0 = performance.now();
  const deferredExam = zeroRepetitionEngine.generateUniqueListeningExam40({ deferRegistration: true });
  const elapsedMs = performance.now() - t0;

  const summaryAfterDeferred = zeroRepetitionEngine.getRegistrySummary();
  assert.equal(
    summaryAfterDeferred.totalUniqueQuestionsUsed,
    0,
    'Step 5 Failed: deferRegistration: true must not mark questions as used before the user starts or submits the exam'
  );
  assert.equal(deferredExam.questions.length, 40);
  assert.equal(deferredExam.questions.filter((q) => q.section === 1).length, 10);
  assert.equal(deferredExam.questions.filter((q) => q.section === 2).length, 10);
  assert.equal(deferredExam.questions.filter((q) => q.section === 3).length, 10);
  assert.equal(deferredExam.questions.filter((q) => q.section === 4).length, 10);

  // Now register as when user starts/completes the exam
  const combinedScript = deferredExam.questions.map((q) => extractQuestionScriptText(q)).join('\n');
  zeroRepetitionEngine.registerCompletedOrPublishedExam({
    examId: deferredExam.examId,
    examType: 'cd_listening_40',
    questions: deferredExam.questions,
    rawScripts: [combinedScript],
    provenance: deferredExam.provenance.provenance
  });
  const summaryAfterRegistered = zeroRepetitionEngine.getRegistrySummary();
  assert.equal(summaryAfterRegistered.totalUniqueQuestionsUsed, 40);
  console.log(
    `PASS [Step 5]: Deferred registration verified (0 marked on instruction load -> 40 marked on start/submit). Exam generated in ${elapsedMs.toFixed(2)}ms.`
  );

  // Step 6: isScriptUnique() verification across all 5 required scenarios
  const sampleScript = extractQuestionScriptText(deferredExam.questions[0]);
  // 1. Exact duplicate script
  const exactDupCheck = zeroRepetitionEngine.isScriptUnique(sampleScript);
  assert.equal(exactDupCheck.isUnique, false, 'Exact duplicate script must return isUnique: false');
  assert.equal(exactDupCheck.maxSimilarity, 1.0);

  // 2. Near-duplicate script (minor word/punctuation tweak)
  const nearDupScript = sampleScript + ' Thank you.';
  const nearDupCheck = zeroRepetitionEngine.isScriptUnique(nearDupScript);
  assert.equal(nearDupCheck.isUnique, false, 'Near-duplicate script must return isUnique: false');
  assert.ok(nearDupCheck.maxSimilarity >= 0.82, `Expected similarity >= 0.82, got ${nearDupCheck.maxSimilarity}`);

  // 3. Clearly different script with normal shared English vocabulary
  const distinctScript =
    'Good morning everyone. In today lecture on marine biology, we will investigate how hydrothermal vent organisms survive extreme pressure in the Pacific Ocean.';
  const distinctCheck = zeroRepetitionEngine.isScriptUnique(distinctScript);
  assert.equal(distinctCheck.isUnique, true, 'Clearly different script with shared English words must return isUnique: true');

  // 4. Empty or very short text
  const emptyCheck1 = zeroRepetitionEngine.isScriptUnique('');
  const emptyCheck2 = zeroRepetitionEngine.isScriptUnique('   ');
  const shortCheck = zeroRepetitionEngine.isScriptUnique(' Room 12B ');
  assert.equal(emptyCheck1.isUnique, true, 'Empty string must not falsely collide');
  assert.equal(emptyCheck2.isUnique, true, 'Whitespace-only string must not falsely collide');
  assert.equal(shortCheck.isUnique, true, 'Short unused text must return isUnique: true');

  // 5. Candidate selection across all four sections across multiple consecutive 40-question exams
  const tMultiStart = performance.now();
  const exam2 = zeroRepetitionEngine.generateUniqueListeningExam40({ deferRegistration: false });
  const exam3 = zeroRepetitionEngine.generateUniqueListeningExam40({ deferRegistration: false });
  const multiElapsedMs = performance.now() - tMultiStart;

  const ids1 = new Set(deferredExam.questions.map((q) => q.id));
  const ids2 = new Set(exam2.questions.map((q) => q.id));
  const ids3 = new Set(exam3.questions.map((q) => q.id));
  for (const id of ids2) {
    assert.equal(ids1.has(id), false, `Duplicate question ID ${id} between Exam 1 and Exam 2`);
  }
  for (const id of ids3) {
    assert.equal(ids1.has(id), false, `Duplicate question ID ${id} between Exam 1 and Exam 3`);
    assert.equal(ids2.has(id), false, `Duplicate question ID ${id} between Exam 2 and Exam 3`);
  }
  console.log(
    `PASS [Step 6]: isScriptUnique() verified for exact duplicates, near-duplicates, distinct scripts, empty/short text, and 3 consecutive 40-question exams (0 overlap, ${multiElapsedMs.toFixed(2)}ms).`
  );

  // ---------------------------------------------------------------------------
  // PHASE 5B.2: Data Integrity & Integration Regression Suite (Scenarios 1–9)
  // ---------------------------------------------------------------------------
  console.log('\n--- Running Phase 5B.2 Data Integrity Regression Checks ---');

  // Initialize clean test user profile
  localStorage.clear();
  clearMistakes();
  registerUser('Tasnim Ahmed', 'tasnim@ieltssprint.bd', 7.5, 'Academic', 'UK');

  // Scenario 1, 2, 3: Submitting a Listening-only 40-question exam records Listening result
  // without fake Reading/Writing 0 bands, without overall IELTS band, without adding 'livemock',
  // and without unlocking full-mock achievements ('mock_graduate', 'cambridge_elite').
  recordExamAttempt({
    id: 'cd_listening_test_001',
    examType: 'listening_only',
    overallBand: null,
    listeningBand: 8.5,
    readingBand: null,
    writingBand: null,
    wordCount: 0,
    submissionType: 'manual',
    correctCount: 38,
    totalQuestions: 40
  });

  const userAfterListening = getActiveUser()!;
  assert.equal(userAfterListening.progress.examHistory.length, 1);
  const firstRec = userAfterListening.progress.examHistory[0];
  assert.equal(firstRec.id, 'cd_listening_test_001');
  assert.equal(firstRec.examType, 'listening_only');
  assert.equal(firstRec.listeningBand, 8.5);
  assert.equal(firstRec.overallBand, null, 'Listening-only record must not set overallBand');
  assert.equal(firstRec.readingBand, null, 'Listening-only record must not set fake readingBand: 0');
  assert.equal(firstRec.writingBand, null, 'Listening-only record must not set fake writingBand: 0');
  assert.equal(isFullMockExamRecord(firstRec), false, 'isFullMockExamRecord must be false for Listening-only attempt');
  assert.equal(
    userAfterListening.progress.completedModules.includes('livemock'),
    false,
    'Listening-only attempt must not add "livemock" to completedModules'
  );
  assert.equal(
    userAfterListening.progress.completedModules.includes('listening'),
    true,
    'Listening-only attempt should add "listening" to completedModules'
  );

  // Check backward-compatibility with legacy Listening-only record (readingBand: 0, writingBand: 0, no examType)
  const legacyListeningRec = {
    id: 'legacy_lis_1',
    timestamp: Date.now() - 10000,
    overallBand: 7.5,
    listeningBand: 7.5,
    readingBand: 0,
    writingBand: 0,
    wordCount: 0,
    submissionType: 'manual' as const,
    correctCount: 33,
    totalQuestions: 40
  };
  assert.equal(
    isFullMockExamRecord(legacyListeningRec),
    false,
    'Legacy Listening-only record with readingBand: 0 and writingBand: 0 must not be treated as a full mock exam'
  );

  const badgesAfterListeningOnly = evaluateAchievements(userAfterListening, 0);
  const mockGradBadge = badgesAfterListeningOnly.find((b) => b.id === 'mock_graduate')!;
  const eliteBadge = badgesAfterListeningOnly.find((b) => b.id === 'cambridge_elite')!;
  const listeningAceBadge = badgesAfterListeningOnly.find((b) => b.id === 'listening_ace')!;
  assert.equal(mockGradBadge.isUnlocked, false, 'Listening-only attempt must not unlock First Full Mock Exam');
  assert.equal(eliteBadge.isUnlocked, false, 'Listening-only Band 8.5 must not unlock Overall Band 8.0+ full-mock badge');
  assert.equal(listeningAceBadge.isUnlocked, true, 'Listening-only Band 8.5 should unlock Listening Ace badge');
  console.log('PASS [5B.2 Scenarios 1–3]: Listening-only attempt semantics, completedModules, and achievements verified.');

  // Scenario 4 & 7: Duplicate submission guard by examId + Newest-first ordering across multiple exam records
  recordExamAttempt({
    id: 'cd_listening_test_001', // Duplicate ID!
    examType: 'listening_only',
    overallBand: null,
    listeningBand: 8.5,
    readingBand: null,
    writingBand: null,
    wordCount: 0,
    submissionType: 'timer',
    correctCount: 38,
    totalQuestions: 40
  });
  assert.equal(
    getActiveUser()!.progress.examHistory.length,
    1,
    'Duplicate recordExamAttempt with same id must be ignored'
  );

  // Now record a genuine Full Mock Exam
  recordExamAttempt({
    id: 'full_mock_002',
    examType: 'full_mock',
    overallBand: 8.0,
    listeningBand: 8.5,
    readingBand: 8.0,
    writingBand: 7.5,
    wordCount: 420,
    submissionType: 'manual',
    correctCount: 72,
    totalQuestions: 80
  });

  const userAfterFullMock = getActiveUser()!;
  assert.equal(userAfterFullMock.progress.examHistory.length, 2);
  // Newest record must be at index 0 (unshift)
  assert.equal(
    userAfterFullMock.progress.examHistory[0].id,
    'full_mock_002',
    'Newest exam record must be at index 0'
  );
  assert.equal(
    userAfterFullMock.progress.examHistory[1].id,
    'cd_listening_test_001',
    'Older exam record must be at index 1'
  );
  assert.equal(isFullMockExamRecord(userAfterFullMock.progress.examHistory[0]), true);
  assert.equal(userAfterFullMock.progress.completedModules.includes('livemock'), true);

  const badgesAfterFullMock = evaluateAchievements(userAfterFullMock, 0);
  assert.equal(
    badgesAfterFullMock.find((b) => b.id === 'mock_graduate')!.isUnlocked,
    true,
    'Full Mock Exam should unlock First Full Mock Exam badge'
  );
  assert.equal(
    badgesAfterFullMock.find((b) => b.id === 'cambridge_elite')!.isUnlocked,
    true,
    'Full Mock Exam with Overall Band 8.0 should unlock Cambridge Elite badge'
  );
  console.log('PASS [5B.2 Scenarios 4 & 7]: Newest-first ordering and idempotent examHistory recording verified.');

  // Scenario 5 & 6: One wrong Listening answer produces exactly 1 Mistake Vault entry and 1 QuestionEngine attempt,
  // and saves the formatted option label for multiple-choice questions.
  clearMistakes();
  const attemptsBeforeCount = questionEngine.getHistory().length;
  const wrongMcQ = allListening.find((q) => q.id === 'lis_s2_04')!; // correctAnswer: 'B', option B: 'Heavy-duty steel-toe boots and leather gloves'
  const formattedAns = formatDisplayedCorrectAnswer(wrongMcQ);
  assert.equal(
    formattedAns,
    'B) Heavy-duty steel-toe boots and leather gloves',
    'formatDisplayedCorrectAnswer must format bare letter B with its option label'
  );

  // Simulate submission path used by both AuthenticIELTSListeningTest and ListeningLab
  addMistake({
    module: 'listening',
    title: `CD-IELTS Listening Q14: ${wrongMcQ.prompt}`,
    userAnswer: 'A',
    correctAnswer: formattedAns,
    explanation: wrongMcQ.explanation || 'Review script.'
  });
  questionEngine.recordAttempt({
    questionId: wrongMcQ.id,
    module: 'listening',
    questionType: wrongMcQ.questionType,
    topic: wrongMcQ.topic,
    userAnswer: 'A',
    isCorrect: false,
    score: 0,
    mistakeType: 'listening_comprehension',
    explanation: wrongMcQ.explanation || 'Review script.',
    skipMistakeVault: true
  });

  const vaultItems = getMistakes();
  const attemptsAfterCount = questionEngine.getHistory().length;
  assert.equal(
    vaultItems.length,
    1,
    `Expected exactly 1 Mistake Vault entry for 1 wrong answer, found ${vaultItems.length}`
  );
  assert.equal(
    attemptsAfterCount - attemptsBeforeCount,
    1,
    'Expected exactly 1 QuestionEngine attempt record for 1 wrong answer'
  );
  assert.equal(
    vaultItems[0].correctAnswer,
    'B) Heavy-duty steel-toe boots and leather gloves',
    'Mistake Vault entry must store the formatted multiple-choice option label'
  );
  console.log('PASS [5B.2 Scenarios 5 & 6]: Single Mistake Vault write + formatted MC option answer verified.');

  // Scenario 8: Reloading instruction screen before starting does not mark questions used;
  // starting afterwards registers the persisted testState.testId and is idempotent on submit.
  zeroRepetitionEngine.resetRegistry();
  const initialDeferred = zeroRepetitionEngine.generateUniqueListeningExam40({ deferRegistration: true });
  // Simulate persisted instruction-screen state across browser reload (examGenerationMeta is null after reload, testState has testId & questions)
  const persistedInstructionState = {
    testId: initialDeferred.examId,
    status: 'instruction' as const,
    questions: initialDeferred.questions,
    provenance: initialDeferred.provenance.provenance
  };
  assert.equal(
    zeroRepetitionEngine.getRegistrySummary().totalUniqueQuestionsUsed,
    0,
    'Before starting (including after instruction-screen reload), 0 questions may be marked used'
  );

  // Candidate clicks Start after reload: activeTestId resolves from persistedInstructionState.testId
  const activeTestIdAfterReload = (null as any)?.examId || persistedInstructionState.testId;
  assert.equal(activeTestIdAfterReload, initialDeferred.examId);
  const reloadScript = persistedInstructionState.questions.map((q) => extractQuestionScriptText(q)).join('\n');
  zeroRepetitionEngine.registerCompletedOrPublishedExam({
    examId: activeTestIdAfterReload,
    examType: 'cd_listening_40',
    questions: persistedInstructionState.questions,
    rawScripts: [reloadScript],
    provenance: persistedInstructionState.provenance
  });
  // Candidate later submits the same exam: calling registerCompletedOrPublishedExam again with the same examId must not duplicate examHistoryLog
  zeroRepetitionEngine.registerCompletedOrPublishedExam({
    examId: activeTestIdAfterReload,
    examType: 'cd_listening_40',
    questions: persistedInstructionState.questions,
    rawScripts: [reloadScript],
    provenance: persistedInstructionState.provenance
  });
  const regSummary = zeroRepetitionEngine.getRegistrySummary();
  assert.equal(regSummary.totalUniqueQuestionsUsed, 40);
  assert.equal(
    regSummary.totalExamsCompleted,
    1,
    'Calling registerCompletedOrPublishedExam on start and submit for the same examId must record only 1 exam log entry'
  );
  console.log('PASS [5B.2 Scenario 8]: Deferred registration across instruction-screen reload & idempotent exam registration verified.');

  // Scenario 9: ListeningLab review highlighting (isListeningOptionCorrect) matches isListeningAnswerCorrect
  // for bare letters, prefixed options, label-only answers, and acceptable variants.
  const labelOnlyCorrectQ: IELTSQuestion = {
    ...mcBareLetterQuestion,
    options: [
      'A) Structural Bridge Design',
      'B) Marine Engineering',
      'C) Aerospace Propulsion'
    ],
    correctAnswer: 'Marine Engineering',
    acceptableAnswers: ['B) Marine Engineering']
  };
  assert.equal(isListeningAnswerCorrect(labelOnlyCorrectQ, 'B'), true);
  assert.equal(
    isListeningOptionCorrect(labelOnlyCorrectQ, 'B) Marine Engineering', 1),
    true,
    'isListeningOptionCorrect must highlight option B when correctAnswer is label-only "Marine Engineering"'
  );
  assert.equal(
    isListeningOptionCorrect(labelOnlyCorrectQ, 'A) Structural Bridge Design', 0),
    false,
    'isListeningOptionCorrect must not highlight wrong option A'
  );
  assert.equal(
    isListeningOptionCorrect(mcBareLetterQuestion, mcBareLetterQuestion.options![1], 1),
    true,
    'isListeningOptionCorrect must highlight option B when correctAnswer is bare letter "B"'
  );
  assert.equal(
    isListeningOptionCorrect(mcPrefixedAnswerQuestion, 'B) Marine Engineering', 1),
    true,
    'isListeningOptionCorrect must highlight option B when correctAnswer is prefixed "B) Marine Engineering"'
  );
  console.log('PASS [5B.2 Scenario 9]: ListeningLab option review highlighting matches isListeningAnswerCorrect() across all option formats.');

  // ---------------------------------------------------------------------------
  // PHASE 5B.3: Multi-Speaker Separation & Map-Labelling Alignment Checks
  // ---------------------------------------------------------------------------
  console.log('\n--- Running Phase 5B.3 Multi-Speaker & Map-Labelling Checks ---');

  // 1. Verify female name inference overrides accidental male default
  assert.equal(
    inferDialogueSpeakerGender({ speaker: 'Customer (Eleanor)', gender: 'male' }),
    'female',
    'Customer (Eleanor) must resolve to female gender'
  );
  assert.equal(
    inferDialogueSpeakerGender({ speaker: 'Student (Chloe)', gender: 'male' }),
    'female',
    'Student (Chloe) must resolve to female gender'
  );
  assert.equal(
    inferDialogueSpeakerGender({ speaker: 'Student (Priya)', gender: 'male' }),
    'female',
    'Student (Priya) must resolve to female gender'
  );

  // 2. Verify 2-speaker Section 1 dialogue gets 2 distinct speakerIds
  const s1Q = allListening.find((q) => q.id === 'lis_s1_01')!;
  const assignedS1 = assignSectionDialogueSpeakers(s1Q.dialogue!, 1);
  const s1Speakers = new Map<string, string>();
  for (const line of assignedS1) {
    if (s1Speakers.has(line.speaker)) {
      assert.equal(s1Speakers.get(line.speaker), line.speakerId, 'Same speaker must keep consistent speakerId');
    } else {
      s1Speakers.set(line.speaker, line.speakerId);
    }
  }
  assert.equal(s1Speakers.size, 2, 'Section 1 dialogue should have 2 speakers');
  assert.equal(
    new Set(s1Speakers.values()).size,
    2,
    'Section 1 two-speaker dialogue must assign 2 distinct speakerIds'
  );

  // 3. Verify 3-speaker Section 3 academic tutorial gets 3 distinct speakerIds (no collision between Tutor and Male Student)
  const s3Q29 = allListening.find((q) => q.id === 'lis_s3_exp_29')!;
  const s3Q30 = allListening.find((q) => q.id === 'lis_s3_exp_30')!;
  const combinedS3Dialogue = [...(s3Q29.dialogue || []), ...(s3Q30.dialogue || [])];
  const assignedS3 = assignSectionDialogueSpeakers(combinedS3Dialogue, 3);
  const s3Speakers = new Map<string, string>();
  for (const line of assignedS3) {
    if (s3Speakers.has(line.speaker)) {
      assert.equal(s3Speakers.get(line.speaker), line.speakerId, 'Same speaker in Section 3 must keep consistent speakerId');
    } else {
      s3Speakers.set(line.speaker, line.speakerId);
    }
  }
  assert.equal(s3Speakers.size, 3, 'Section 3 tutorial dialogue (Dr. Evans, Leo, Chloe) must have 3 speakers');
  assert.equal(
    new Set(s3Speakers.values()).size,
    3,
    `Section 3 three-speaker tutorial must assign 3 distinct speakerIds, got: ${JSON.stringify(Array.from(s3Speakers.entries()))}`
  );

  // 4. Verify all map_labelling questions in the Listening bank have valid A-D options and evaluate accurately
  const mapQuestions = allListening.filter((q) => q.questionType === 'map_labelling');
  assert.ok(mapQuestions.length >= 6, `Expected at least 6 map_labelling questions, found ${mapQuestions.length}`);
  for (const mq of mapQuestions) {
    assert.ok(mq.options && mq.options.length === 4, `Map question ${mq.id} must have 4 options (A-D)`);
    const correctLetter = String(mq.correctAnswer).trim().toUpperCase();
    assert.ok(['A', 'B', 'C', 'D'].includes(correctLetter), `Map question ${mq.id} correctAnswer must be A-D`);
    assert.equal(
      isListeningAnswerCorrect(mq, correctLetter),
      true,
      `Map question ${mq.id} must accept bare letter ${correctLetter}`
    );
  }
  console.log(
    `PASS [5B.3]: 2-speaker Section 1 separation, 3-speaker Section 3 separation (${Array.from(s3Speakers.entries()).map(([k, v]) => `${k}->${v}`).join(', ')}), and ${mapQuestions.length} map-labelling questions verified.`
  );

  // ---------------------------------------------------------------------------
  // PHASE 5B.4: Four-Part Listening Structure & Audio Quality Regression Checks
  // ---------------------------------------------------------------------------
  console.log('\n--- Running Phase 5B.4 Four-Part UX & Audio Quality Checks ---');

  // 1. Verify Four-Part structure metadata (Parts 1–4, 10 questions each, 40 total)
  assert.equal(IELTS_LISTENING_PARTS.length, 4, 'Must define exactly 4 IELTS Listening parts');
  assert.deepEqual(
    IELTS_LISTENING_PARTS.map((p) => [p.part, p.startQuestion, p.endQuestion, p.isMonologue]),
    [
      [1, 1, 10, false],
      [2, 11, 20, true],
      [3, 21, 30, false],
      [4, 31, 40, true]
    ],
    'Parts 1–4 must map to Q1–10 (dialogue), Q11–20 (monologue), Q21–30 (dialogue), Q31–40 (monologue)'
  );

  // 2. Verify overall and part progress computation across all part boundaries
  const pQ1 = getListeningQuestionProgress(0, 40);
  assert.equal(pQ1.part, 1);
  assert.equal(pQ1.overallLabel, 'Question 1 of 40');
  assert.equal(pQ1.partLabel, 'Question 1 of 10');

  const pQ12 = getListeningQuestionProgress(11, 40);
  assert.equal(pQ12.part, 2);
  assert.equal(pQ12.overallQuestionNumber, 12);
  assert.equal(pQ12.partQuestionNumber, 2);
  assert.equal(pQ12.overallLabel, 'Question 12 of 40');
  assert.equal(pQ12.partLabel, 'Question 2 of 10');

  const pQ21 = getListeningQuestionProgress(20, 40);
  assert.equal(pQ21.part, 3);
  assert.equal(pQ21.overallLabel, 'Question 21 of 40');
  assert.equal(pQ21.partLabel, 'Question 1 of 10');

  const pQ40 = getListeningQuestionProgress(39, 40);
  assert.equal(pQ40.part, 4);
  assert.equal(pQ40.overallLabel, 'Question 40 of 40');
  assert.equal(pQ40.partLabel, 'Question 10 of 10');
  console.log('PASS [5B.4.1]: Four-part structure metadata and overall/part progress calculations verified.');

  // 3. Verify Part 2 and Part 4 single-speaker monologue lock (even across mixed sub-topic questions)
  const mixedPart2Input = [
    { speaker: 'Tour Guide (Charlotte)', speakerId: 'speaker_05', gender: 'female' as const, text: 'Welcome to the riverside gardens.' },
    { speaker: 'Park Warden (Arthur)', speakerId: 'speaker_04', gender: 'male' as const, text: 'Next, look at the map of the west wing.' }
  ];
  const resolvedPart2Monologue = assignSectionDialogueSpeakers(mixedPart2Input, 2, 'Guide');
  const part2SpeakerIds = new Set(resolvedPart2Monologue.map((l) => l.speakerId));
  assert.equal(
    part2SpeakerIds.size,
    1,
    `Part 2 monologue must maintain a single consistent speaker voice across all lines, got: ${Array.from(part2SpeakerIds).join(', ')}`
  );

  const mixedPart4Input = [
    { speaker: 'Professor Arthur Sterling', speakerId: 'speaker_04', gender: 'male' as const, text: 'In today lecture we examine coastal sediment.' },
    { speaker: 'Lecturer (Dr. Alistair)', speakerId: 'speaker_03', gender: 'male' as const, text: 'Moving on to hydrothermal vent ecosystems.' }
  ];
  const resolvedPart4Monologue = assignSectionDialogueSpeakers(mixedPart4Input, 4, 'Lecturer');
  const part4SpeakerIds = new Set(resolvedPart4Monologue.map((l) => l.speakerId));
  assert.equal(
    part4SpeakerIds.size,
    1,
    `Part 4 academic monologue must maintain a single consistent lecturer voice across all lines, got: ${Array.from(part4SpeakerIds).join(', ')}`
  );
  console.log('PASS [5B.4.2]: Part 2 and Part 4 single-speaker monologue voice consistency verified.');

  // 4. Verify speech text formatting for spelled-out names, UK postcodes, and UK phone numbers
  const formattedSpelling = formatIELTSSpeechText('That is spelled H-A-W-T-H-O-R-N-E.');
  assert.ok(
    formattedSpelling.includes('H, A, W, T, H, O, R, N, E'),
    `Spelled-out name must be spaced with pauses for clear letter-by-letter synthesis, got: "${formattedSpelling}"`
  );

  const formattedPostcode = formatIELTSSpeechText('Our postcode is OX14 3JP.');
  assert.ok(
    formattedPostcode.includes('O X 14, 3 J P'),
    `UK postcode must be formatted for clear alphanumeric articulation, got: "${formattedPostcode}"`
  );

  const formattedPhone = formatIELTSSpeechText('You can reach me on 07700 900331.');
  assert.ok(
    formattedPhone.includes('0 7 7 0 0, 9 0 0, 3 3 1'),
    `UK phone number must be grouped digit-by-digit, got: "${formattedPhone}"`
  );
  // ---------------------------------------------------------------------------
  // STEP 6: Phase 5B.5 Speaker Separation & Audio Quality Tests
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 6: Phase 5B.5 Speaker Separation & Voice Integrity ---');

  // 1. Verify speaker_03 and speaker_04 use genuinely distinct neural voice models (critical blocker)
  const voice03 = SPEAKER_EDGE_VOICE_MAP['speaker_03'];
  const voice04 = SPEAKER_EDGE_VOICE_MAP['speaker_04'];
  assert.ok(voice03, 'speaker_03 must have a mapped neural voice');
  assert.ok(voice04, 'speaker_04 must have a mapped neural voice');
  assert.notEqual(
    voice03,
    voice04,
    `CRITICAL AUDIT: speaker_03 and speaker_04 must NOT share the same neural voice! (Found: ${voice03} vs ${voice04})`
  );
  console.log(`PASS [5B.5.1]: speaker_03 (${voice03}) and speaker_04 (${voice04}) have distinct neural voices.`);

  // 2. Verify speaker_01 and speaker_08 use genuinely distinct neural voice models (critical blocker)
  const voice01 = SPEAKER_EDGE_VOICE_MAP['speaker_01'];
  const voice08 = SPEAKER_EDGE_VOICE_MAP['speaker_08'];
  assert.ok(voice01, 'speaker_01 must have a mapped neural voice');
  assert.ok(voice08, 'speaker_08 must have a mapped neural voice');
  assert.notEqual(
    voice01,
    voice08,
    `CRITICAL AUDIT: speaker_01 and speaker_08 must NOT share the same neural voice! (Found: ${voice01} vs ${voice08})`
  );
  console.log(`PASS [5B.5.2]: speaker_01 (${voice01}) and speaker_08 (${voice08}) have distinct neural voices.`);

  // 3. Verify that all 17 system character voices are 100% globally unique with ZERO voice sharing
  const allSpeakerKeys = Object.keys(SPEAKER_EDGE_VOICE_MAP);
  const allAssignedVoices = Object.values(SPEAKER_EDGE_VOICE_MAP);
  const uniqueVoices = new Set(allAssignedVoices);
  assert.equal(
    allAssignedVoices.length,
    uniqueVoices.size,
    `CRITICAL AUDIT: All 17 system characters must map to 17 unique neural voice models! Total voices: ${allAssignedVoices.length}, Unique: ${uniqueVoices.size}`
  );
  console.log(`PASS [5B.5.3]: Global Voice Uniqueness verified: 17 characters mapped to 17 distinct neural models (0 collisions).`);

  // 4. Verify Part 1 dialogue speaker separation: 2 speakers with 100% disjoint neural voices
  const part1Dialogue = [
    { speaker: 'Receptionist (Charlotte)', text: 'Good morning, how can I help you today?' },
    { speaker: 'Applicant (Thomas)', text: 'I am calling to register for the evening language courses.' },
    { speaker: 'Receptionist (Charlotte)', text: 'Certainly, could I take your full name and student ID?' },
    { speaker: 'Applicant (Thomas)', text: 'Yes, it is Thomas Henderson, ID 4082.' }
  ];
  const assignedPart1 = assignSectionDialogueSpeakers(part1Dialogue, 1, 'Speaker');
  const part1Voices = new Set(assignedPart1.map((l) => SPEAKER_EDGE_VOICE_MAP[l.speakerId]));
  assert.equal(
    part1Voices.size,
    2,
    `Part 1 dialogue must have exactly 2 distinct neural voice models across conversation participants, got: ${Array.from(part1Voices).join(', ')}`
  );
  console.log('PASS [5B.5.4]: Part 1 dialogue speaker separation verified: 2 conversation turns use 2 distinct neural models.');

  // 5. Verify Part 3 academic discussion separation: up to 4 participants with 100% disjoint neural voices
  const part3Discussion = [
    { speaker: 'Dr. Alistair Sterling (Academic Tutor)', text: 'Let us review your field research findings on coastal wetland ecosystems.' },
    { speaker: 'Thomas (Student 1)', text: 'We surveyed the mangrove estuary at high and low tides.' },
    { speaker: 'Charlotte (Student 2)', text: 'And we noticed significant differences in salinity levels near the river mouth.' },
    { speaker: 'Callum (Student 3)', text: 'Our satellite telemetry data confirmed the migratory waterfowl nesting patterns.' },
    { speaker: 'Dr. Alistair Sterling (Academic Tutor)', text: 'Excellent progress. Now summarize your methodology for next week.' }
  ];
  const assignedPart3 = assignSectionDialogueSpeakers(part3Discussion, 3, 'Discussion');
  const part3Voices = new Set(assignedPart3.map((l) => SPEAKER_EDGE_VOICE_MAP[l.speakerId]));
  assert.equal(
    part3Voices.size,
    4,
    `Part 3 academic discussion must assign 4 completely distinct neural voice models to all 4 participants, got: ${Array.from(part3Voices).join(', ')}`
  );
  console.log('PASS [5B.5.5]: Part 3 academic seminar speaker separation verified: 4 participants use 4 distinct neural models.');

  // ---------------------------------------------------------------------------
  // STEP 7: Phase 5B.6 Natural & Expressive Speech Delivery Tests
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 7: Phase 5B.6 Speech Delivery Profiles & Expressive Tone ---');

  // 1. Verify delivery profile inference for questions vs statements
  const questionProfile = inferSpeechDeliveryProfile({ text: 'Where is the main library reception desk?' }, 1);
  assert.ok(
    questionProfile === 'curious_question' || questionProfile === 'polite_enquiry',
    `Questions should infer 'curious_question' or 'polite_enquiry', got: ${questionProfile}`
  );

  const lectureProfile = inferSpeechDeliveryProfile({ text: 'Today we examine coastal erosion patterns.' }, 4);
  assert.equal(
    lectureProfile,
    'formal_lecture',
    `Section 4 lectures should infer 'formal_lecture', got: ${lectureProfile}`
  );

  const seminarProfile = inferSpeechDeliveryProfile({ text: 'I am not sure about the data sample.', role: 'Research Student 1' }, 3);
  assert.equal(
    seminarProfile,
    'uncertain_student',
    `Hesitant seminar student statements should infer 'uncertain_student', got: ${seminarProfile}`
  );

  const tourProfile = inferSpeechDeliveryProfile({ text: 'Welcome to the botanic gardens.', role: 'Tour Guide' }, 2);
  assert.equal(
    tourProfile,
    'warm_tour_guide',
    `Section 2 monologues should infer 'warm_tour_guide', got: ${tourProfile}`
  );
  console.log('PASS [5B.6.1]: Speech delivery profile inference rules verified across conversational, seminar, and lecture contexts.');

  // 2. Verify assignSectionDialogueSpeakers attaches deliveryProfile correctly
  const sampleDialogue = [
    { speaker: 'Guide (Charlotte)', text: 'Welcome to the campus tour. Where would you like to start?' },
    { speaker: 'Visitor (Thomas)', text: 'Can we visit the science library first?' }
  ];
  const assignedDelivery = assignSectionDialogueSpeakers(sampleDialogue, 1, 'Speaker');
  assert.equal(assignedDelivery.length, 2, 'Assigned dialogue length must match');
  assert.ok(assignedDelivery[0].deliveryProfile, 'First dialogue line must have a deliveryProfile attached');
  assert.ok(assignedDelivery[1].deliveryProfile, 'Second dialogue line must have a deliveryProfile attached');
  console.log(`PASS [5B.6.2]: Dialogue lines correctly assigned delivery profiles: "${assignedDelivery[0].deliveryProfile}" and "${assignedDelivery[1].deliveryProfile}".`);

  // 3. Verify SPEECH_DELIVERY_PROFILES parameters for synthesis application
  const friendlyProf = SPEECH_DELIVERY_PROFILES['friendly_conversation'];
  assert.equal(friendlyProf.rateOffsetPercent, -2);
  assert.equal(friendlyProf.pitchOffsetHz, 1);

  const lectureProf = SPEECH_DELIVERY_PROFILES['formal_lecture'];
  assert.equal(lectureProf.rateOffsetPercent, -4);
  assert.equal(lectureProf.pitchOffsetHz, -2);
  console.log('PASS [5B.6.3]: SPEECH_DELIVERY_PROFILES rate and pitch offset parameters verified.');

  console.log('\n=== ALL PHASE 5B, 5B.2, 5B.3, 5B.4, 5B.5 & 5B.6 REGRESSION TESTS PASSED ===');
}

runListeningIntegrityTests();


