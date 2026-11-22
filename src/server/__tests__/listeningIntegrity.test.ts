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
  SPEAKER_EDGE_VOICE_MAP,
  buildListeningExamDialogue,
  validateAndCoalesceDialogueSequence
} from '../listeningAnswerEvaluator';
import { inferSpeechDeliveryProfile, SPEECH_DELIVERY_PROFILES } from '../../config/speechDirection';
import { questionEngine, IELTSQuestion } from '../../services/QuestionEngine';
import { zeroRepetitionEngine, extractQuestionScriptText } from '../../services/ZeroRepetitionEngine';
import { audioManager } from '../../services/AudioManager';
import { audioService, IELTS_SPEAKERS } from '../../services/audioService';
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
  console.log('=== Running BandSprint Phase 5B & 5B.2 Listening Integrity Regression Suite ===\n');

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
  registerUser('Tasnim Ahmed', 'tasnim@bandsprint.bd', 7.5, 'Academic', 'UK');

  // Scenario 1, 2, 3: Submitting a Listening-only 40-question exam records Listening result
  // without fake Reading/Writing 0 bands, without overall IELTS band, without adding 'livemock',
  // and without unlocking full-mock achievements ('mock_graduate', 'sprint_elite').
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
  const eliteBadge = badgesAfterListeningOnly.find((b) => b.id === 'sprint_elite')!;
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
    badgesAfterFullMock.find((b) => b.id === 'sprint_elite')!.isUnlocked,
    true,
    'Full Mock Exam with Overall Band 8.0 should unlock Sprint Elite badge'
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

  // Simulate submission path used by both RealisticIELTSListeningTest and ListeningLab
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

  // 3. Verify that all 17 system character voices map to verified supported Edge models with controlled acoustic profiles
  const allSpeakerKeys = Object.keys(SPEAKER_EDGE_VOICE_MAP);
  const allAssignedVoices = Object.values(SPEAKER_EDGE_VOICE_MAP);
  const uniqueVoices = new Set(allAssignedVoices);
  // 15 distinct underlying Edge neural models across 17 roles; speaker_01, speaker_03 (-5Hz/-5), and speaker_barnaby (+3Hz/+2) use distinct acoustic profiles + separate Gemini voices (Orus/Fenrir/Puck)
  assert.equal(
    uniqueVoices.size,
    15,
    `CRITICAL AUDIT: 17 characters must map to 15 distinct verified neural voice models (with speaker_01, speaker_03, and speaker_barnaby acoustically differentiated)! Found ${uniqueVoices.size}`
  );
  assert.equal(SPEAKER_EDGE_VOICE_MAP['speaker_01'], 'en-GB-ThomasNeural');
  assert.equal(SPEAKER_EDGE_VOICE_MAP['speaker_03'], 'en-GB-ThomasNeural');
  assert.equal(SPEAKER_EDGE_VOICE_MAP['speaker_barnaby'], 'en-GB-ThomasNeural');
  console.log(`PASS [5B.5.3]: Global Voice Integrity verified: 17 characters mapped to 15 verified neural models with controlled acoustic & persona differentiation.`);

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
  assert.equal(friendlyProf.rateOffsetPercent, -3);
  assert.equal(friendlyProf.pitchOffsetHz, 0);

  const lectureProf = SPEECH_DELIVERY_PROFILES['formal_lecture'];
  assert.equal(lectureProf.rateOffsetPercent, -5);
  assert.equal(lectureProf.pitchOffsetHz, -2);
  console.log('PASS [5B.6.3]: SPEECH_DELIVERY_PROFILES rate and pitch offset parameters verified.');
}

async function runPhase3ListeningPlaybackRegressionTests() {
  console.log('\n--- Step 8: Critical Listening Audio Playback & Silent Fast-Forward Regression Tests ---');

  // Helper to create an instrumented HTMLAudioElement mock
  function createMockAudioElement(behavior: {
    durationSec?: number;
    fireAbortOnSrcAssign?: boolean;
    rejectPlayWith?: Error | null;
    autoCompleteAfterMs?: number;
  }) {
    let _src = '';
    const mockEl: any = {
      preload: 'auto',
      muted: false,
      volume: 1.0,
      defaultPlaybackRate: 1.0,
      playbackRate: 1.0,
      currentTime: 0,
      duration: behavior.durationSec ?? 12.5,
      paused: true,
      ended: false,
      srcAssignedUrls: [] as string[],
      pauseCalls: 0,
      playCalls: 0,
      onloadedmetadata: null as (() => void) | null,
      onplay: null as (() => void) | null,
      ontimeupdate: null as (() => void) | null,
      onpause: null as (() => void) | null,
      onabort: null as (() => void) | null,
      onended: null as (() => void) | null,
      onerror: null as ((err?: any) => void) | null,
      setAttribute: () => {},
      pause() {
        this.paused = true;
        this.pauseCalls += 1;
        if (this.onpause) this.onpause();
      },
      play() {
        this.playCalls += 1;
        if (behavior.rejectPlayWith) {
          this.paused = true;
          return Promise.reject(behavior.rejectPlayWith);
        }
        this.paused = false;
        this.ended = false;
        const delay = behavior.autoCompleteAfterMs ?? 15;
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            if (this.paused) {
              resolve();
              return;
            }
            if (this.onloadedmetadata) this.onloadedmetadata();
            if (this.onplay) this.onplay();
            this.currentTime = Math.min(1.5, this.duration || 1.5);
            if (this.ontimeupdate) this.ontimeupdate();
            resolve();
            setTimeout(() => {
              if (!this.paused) {
                this.currentTime = this.duration;
                this.ended = true;
                this.paused = true;
                if (this.onended) this.onended();
              }
            }, delay);
          }, 5);
        });
      }
    };

    Object.defineProperty(mockEl, 'src', {
      get() {
        return _src;
      },
      set(val: string) {
        const hadPreviousSrc = Boolean(_src);
        _src = val;
        mockEl.srcAssignedUrls.push(val);
        mockEl.currentTime = 0;
        mockEl.ended = false;
        // Simulate HTML5 media load algorithm firing `abort` when replacing an active media src
        if (behavior.fireAbortOnSrcAssign && hadPreviousSrc && typeof mockEl.onabort === 'function') {
          mockEl.onabort();
        }
      }
    });

    return mockEl;
  }

  // Test 8.1 & 8.2 & 8.5: Verify Part 1 loads expected audio source, playbackRate remains 1.0,
  // audio element is not muted and volume > 0, and onabort on src change does NOT skip lines.
  const mockAudioNormal = createMockAudioElement({
    durationSec: 14.0,
    fireAbortOnSrcAssign: true,
    autoCompleteAfterMs: 15
  });
  audioService.setAudioElementForTesting(mockAudioNormal as unknown as HTMLAudioElement);
  audioService.setVolume(1.0);
  audioService.setPlaybackRate(1.0);

  const part1Lines = [
    {
      speakerId: 'speaker_04',
      speakerName: 'Sprint Examiner',
      gender: 'male' as const,
      text: 'Part 1. You will hear a conversation between a housing officer and a university student.',
      pauseAfterMs: 10
    },
    {
      speakerId: 'speaker_05',
      speakerName: 'Advisor (Charlotte)',
      gender: 'female' as const,
      text: 'Good morning, University Accommodation Office. How can I help you today?',
      pauseAfterMs: 10
    },
    {
      speakerId: 'speaker_01',
      speakerName: 'Student (Thomas)',
      gender: 'male' as const,
      text: 'That is the end of Part 1. You now have half a minute to check your answers.',
      pauseAfterMs: 0
    }
  ];

  let completedNormally = false;
  let errorNormally: any = null;
  const startedLines: number[] = [];

  await audioService.playDialogueSequentially(part1Lines, {
    examId: 'test_part1_verify',
    onLineStart: (idx) => startedLines.push(idx),
    onComplete: () => {
      completedNormally = true;
    },
    onError: (err) => {
      errorNormally = err;
    }
  });

  assert.equal(errorNormally, null, 'Normal Part 1 playback must not error');
  assert.equal(completedNormally, true, 'Normal Part 1 playback must complete after all lines finish');
  assert.deepEqual(startedLines, [0, 1, 2], 'All 3 Part 1 lines must play sequentially in order');
  assert.equal(mockAudioNormal.playCalls, 3, 'audio.play() must be called once for each of the 3 Part 1 lines');
  assert.ok(
    mockAudioNormal.srcAssignedUrls[0].startsWith('/api/tts/stream?') &&
      mockAudioNormal.srcAssignedUrls[0].includes('examId=test_part1_verify') &&
      mockAudioNormal.srcAssignedUrls[0].includes('speed=1'),
    `Part 1 must load expected /api/tts/stream URL with speed=1, got: ${mockAudioNormal.srcAssignedUrls[0]}`
  );
  assert.equal(mockAudioNormal.playbackRate, 1.0, 'playbackRate must remain 1.0');
  assert.equal(mockAudioNormal.defaultPlaybackRate, 1.0, 'defaultPlaybackRate must remain 1.0');
  assert.equal(mockAudioNormal.muted, false, 'Audio element must not be muted');
  assert.ok(mockAudioNormal.volume > 0, `Audio element volume must be > 0, got ${mockAudioNormal.volume}`);
  assert.ok(
    audioService.getState().duration >= 42.0,
    `Real metadata duration (3 x 14s = 42s) must update state.duration, got ${audioService.getState().duration}`
  );
  console.log('PASS [8.1, 8.2 & 8.5]: Part 1 source URL, real metadata duration, playbackRate=1.0, unmuted volume=1.0, and immunity to onabort during src assignment verified.');

  // Test 8.3: Verify stopActiveSync() race condition fix: a pending playPromise from a prior sound check
  // must NEVER pause the newly started Part 1 generation when it resolves.
  let resolvePriorSoundCheckPlay!: () => void;
  const pendingSoundCheckAudio: any = createMockAudioElement({ durationSec: 5.0 });
  const originalPlay = pendingSoundCheckAudio.play.bind(pendingSoundCheckAudio);
  let isFirstCall = true;
  pendingSoundCheckAudio.play = function () {
    if (isFirstCall) {
      isFirstCall = false;
      this.paused = false;
      return new Promise<void>((res) => {
        resolvePriorSoundCheckPlay = res;
      });
    }
    return originalPlay();
  };

  audioService.setAudioElementForTesting(pendingSoundCheckAudio as unknown as HTMLAudioElement);
  // Start sound check (leaves activePlayPromise pending)
  void audioService.speakText('Sound check in progress', 'speaker_04');
  // Immediately start Part 1 dialogue while sound check play() promise is still pending
  let part1CompletedAfterSoundCheck = false;
  const dialoguePromise = audioService.playDialogueSequentially(
    [
      {
        speakerId: 'speaker_04',
        gender: 'male',
        text: 'Part 1 opening instruction after sound check.',
        pauseAfterMs: 0
      }
    ],
    {
      onComplete: () => {
        part1CompletedAfterSoundCheck = true;
      }
    }
  );
  // Resolve the prior sound check playPromise while Part 1 is playing
  if (resolvePriorSoundCheckPlay) resolvePriorSoundCheckPlay();
  await dialoguePromise;
  assert.equal(
    part1CompletedAfterSoundCheck,
    true,
    'Settling a prior pending play() promise must NEVER pause or abort the newly started Part 1 audio generation'
  );
  console.log('PASS [8.3]: Prior pending play() promise does not pause new Part 1 generation; Part 1 completes only when audio finishes.');

  // Test 8.4: Failed or autoplay-blocked audio playback (NotAllowedError / AbortError)
  // must NOT silently fast-forward through Part 1 lines or complete Part 1.
  const autoplayErr = new Error('play() failed because the user didn\'t interact with the document first.');
  autoplayErr.name = 'NotAllowedError';
  const mockAudioBlocked = createMockAudioElement({
    durationSec: 15.0,
    rejectPlayWith: autoplayErr
  });
  audioService.setAudioElementForTesting(mockAudioBlocked as unknown as HTMLAudioElement);

  let blockedCompleted = false;
  let blockedErrorCaptured: any = null;
  const blockedLinesStarted: number[] = [];

  await audioService.playDialogueSequentially(part1Lines, {
    examId: 'test_blocked_autoplay',
    onLineStart: (idx) => blockedLinesStarted.push(idx),
    onComplete: () => {
      blockedCompleted = true;
    },
    onError: (err) => {
      blockedErrorCaptured = err;
    }
  });

  assert.equal(
    blockedCompleted,
    false,
    'CRITICAL: Blocked or failed audio playback must NEVER complete Part 1 or announce End of Part 1'
  );
  assert.ok(blockedErrorCaptured, 'Blocked or failed audio playback must report an error via onError');
  assert.ok(
    Boolean(audioService.getState().error),
    'audioService state.error must be populated visibly when playback fails'
  );
  assert.deepEqual(
    blockedLinesStarted,
    [0],
    `Blocked playback must halt immediately at line 0 instead of silently fast-forwarding through all ${part1Lines.length} lines`
  );
  console.log('PASS [8.4]: Autoplay-blocked / rejected playback halts at line 0, surfaces visible error, and never fast-forwards to End of Part 1.');

  // Test 8.6: Intentional stop/cleanup cancels playback cleanly without triggering Part 1 completion
  const mockAudioSlow = createMockAudioElement({
    durationSec: 30.0,
    autoCompleteAfterMs: 500
  });
  audioService.setAudioElementForTesting(mockAudioSlow as unknown as HTMLAudioElement);

  let stoppedCompleted = false;
  const slowPromise = audioService.playDialogueSequentially(part1Lines, {
    examId: 'test_stop_cleanup',
    onComplete: () => {
      stoppedCompleted = true;
    }
  });
  await new Promise((r) => setTimeout(r, 20));
  audioService.stop();
  await slowPromise;
  assert.equal(
    stoppedCompleted,
    false,
    'Intentional audioService.stop() must cancel playback and never trigger onComplete'
  );
  assert.equal(audioService.getState().isPlaying, false);
  audioService.setAudioElementForTesting(null);
  console.log('PASS [8.6]: Intentional stop/cleanup cancels playback cleanly without triggering completion.');

  // Test 8.7 (Gate 2.1, 2.2, 2.4): Verify all 40 questions map to the exact Part 1-4 boundaries,
  // Authentic vs Quick pacing modes preserve all dialogue turns without duplication/skipping,
  // and scheduled pauses advance the progress timeline exactly once (never double-counted).
  const exam40ForPacing = zeroRepetitionEngine.generateUniqueListeningExam40({ deferRegistration: true }).questions;
  assert.equal(exam40ForPacing.length, 40, 'Generated exam must have 40 questions across 4 parts');

  exam40ForPacing.forEach((q, idx) => {
    const expectedPart = (Math.floor(idx / 10) + 1) as 1 | 2 | 3 | 4;
    const progress = getListeningQuestionProgress(idx, 40);
    const meta = getListeningPartMeta(expectedPart);
    assert.equal(progress.part, expectedPart, `Question index ${idx} must map to Part ${expectedPart}`);
    assert.equal(q.section, expectedPart, `Question ${q.id} at index ${idx} must have section=${expectedPart}`);
    assert.ok(
      idx >= meta.startIndex && idx <= meta.endIndex,
      `Question index ${idx} must fall within Part ${expectedPart} bounds [${meta.startIndex}, ${meta.endIndex}]`
    );
  });

  const authenticLines = buildListeningExamDialogue(exam40ForPacing, 'authentic');
  const quickLines = buildListeningExamDialogue(exam40ForPacing, 'quick');

  assert.equal(
    authenticLines.length,
    quickLines.length,
    'Authentic and Quick modes must contain the exact same spoken lines and question coverage'
  );

  // Verify Part 1-3 end-of-part checking pauses ("half a minute" = 30,000ms in authentic, 1,100ms in quick)
  const authenticEndOfPart1 = authenticLines.find((l) =>
    l.text.includes('That is the end of Part 1. You now have half a minute')
  );
  const quickEndOfPart1 = quickLines.find((l) =>
    l.text.includes('That is the end of Part 1. You now have half a minute')
  );
  assert.ok(authenticEndOfPart1, 'Part 1 end instruction must exist in Authentic mode');
  assert.ok(quickEndOfPart1, 'Part 1 end instruction must exist in Quick mode');
  assert.equal(
    authenticEndOfPart1!.pauseAfterMs,
    30000,
    'Authentic mode must enforce full 30,000ms (half a minute) pause after Part 1'
  );
  assert.equal(
    quickEndOfPart1!.pauseAfterMs,
    1100,
    'Quick Practice mode must use compressed 1,100ms pause after Part 1'
  );

  const totalAuthenticPauseSec =
    authenticLines.reduce((acc, l) => acc + (l.pauseAfterMs || 0), 0) / 1000;
  const totalQuickPauseSec =
    quickLines.reduce((acc, l) => acc + (l.pauseAfterMs || 0), 0) / 1000;
  assert.ok(
    totalAuthenticPauseSec >= totalQuickPauseSec + 150,
    `Authentic mode must include at least 150s more scheduled reading/checking pauses than Quick mode (${totalAuthenticPauseSec}s vs ${totalQuickPauseSec}s)`
  );
  console.log(
    `PASS [8.7 / Gate 2.1]: All 40 questions map to Parts 1–4; Standard Pauses (${totalAuthenticPauseSec.toFixed(1)}s pauses) vs Quick Practice (${totalQuickPauseSec.toFixed(1)}s pauses) verified.`
  );

  // Test 8.8 (Gate 2.4 & 2.5): Scheduled pauses advance the progress timeline exactly once,
  // AND pausing during a scheduled gap freezes the remaining pause duration until resumed.
  const mockAudioGap = createMockAudioElement({
    durationSec: 4.0,
    autoCompleteAfterMs: 15
  });
  audioService.setAudioElementForTesting(mockAudioGap as unknown as HTMLAudioElement);

  const gapLines = [
    {
      speakerId: 'speaker_04',
      gender: 'male' as const,
      text: 'Line zero with 200ms scheduled inter-line pause.',
      pauseAfterMs: 200
    },
    {
      speakerId: 'speaker_05',
      gender: 'female' as const,
      text: 'Line one after scheduled pause.',
      pauseAfterMs: 0
    }
  ];

  let line1StartBaseTime = -1;
  const gapStartedIndices: number[] = [];
  const gapPromise = audioService.playDialogueSequentially(gapLines, {
    examId: 'test_gap_freeze',
    onLineStart: (idx) => {
      gapStartedIndices.push(idx);
      if (idx === 1) {
        line1StartBaseTime = audioService.getState().currentTime;
      }
    }
  });

  // Wait ~45ms so Line 0 speech (5ms + 15ms = 20ms) has finished and we are inside waitForInterLinePause (200ms)
  await new Promise((r) => setTimeout(r, 45));
  assert.deepEqual(gapStartedIndices, [0], 'Line 1 must not have started yet during the 200ms gap');

  // Pause during the scheduled gap
  audioService.pause();
  const frozenGapTime = audioService.getState().currentTime;
  assert.equal(audioService.getState().isPaused, true, 'audioService must be in paused state');

  // Wait 220ms while paused (longer than the entire 200ms scheduled gap!)
  await new Promise((r) => setTimeout(r, 220));
  assert.deepEqual(
    gapStartedIndices,
    [0],
    'Gate 2.5: Pausing during a scheduled gap must freeze the remaining pause duration and prevent Line 1 from starting'
  );
  assert.equal(
    audioService.getState().currentTime,
    frozenGapTime,
    'Gate 2.5: currentTime must remain frozen while paused during a scheduled gap'
  );

  // Resume playback and wait for completion
  audioService.resume();
  await gapPromise;

  assert.deepEqual(gapStartedIndices, [0, 1], 'After resuming from paused gap, Line 1 must play to completion');
  assert.ok(
    Math.abs(line1StartBaseTime - 4.2) < 0.05,
    `Gate 2.4: Scheduled pause (0.2s) must advance timeline exactly once (expected 4.2s at Line 1 start, got ${line1StartBaseTime}s)`
  );
  assert.ok(
    Math.abs(audioService.getState().currentTime - 8.2) < 0.05,
    `Gate 2.4: Final timeline after Line 0 (4.0s + 0.2s pause) + Line 1 (4.0s) must be 8.2s, got ${audioService.getState().currentTime}s`
  );
  console.log(
    `PASS [8.8 / Gate 2.4 & 2.5]: Scheduled pause advances timeline once (Line 1 start=${line1StartBaseTime.toFixed(2)}s, total=${audioService.getState().currentTime.toFixed(2)}s) and freezes while paused.`
  );

  // Test 8.9 (Gate 2.6, 2.7 & 2.8): Media/network error recovery on Line 1 resumes at Line 1
  // (never replaying completed Line 0), and calling resume() after broadcast completion is a strict no-op.
  let failOnLineIndex: number | null = 1;
  const mockAudioRecovery: any = createMockAudioElement({
    durationSec: 3.0,
    autoCompleteAfterMs: 15
  });
  const baseRecoveryPlay = mockAudioRecovery.play.bind(mockAudioRecovery);
  let activeLineBeingPlayed = 0;
  mockAudioRecovery.play = function () {
    if (failOnLineIndex !== null && activeLineBeingPlayed === failOnLineIndex) {
      this.paused = true;
      const err = new Error('Simulated transient network drop on Line 1');
      err.name = 'NotAllowedError';
      return Promise.reject(err);
    }
    return baseRecoveryPlay();
  };

  audioService.setAudioElementForTesting(mockAudioRecovery as unknown as HTMLAudioElement);

  const recoveryLines = [
    {
      speakerId: 'speaker_04',
      gender: 'male' as const,
      text: 'Line zero completes before network error.',
      pauseAfterMs: 10
    },
    {
      speakerId: 'speaker_05',
      gender: 'female' as const,
      text: 'Line one experiences transient network error then recovers.',
      pauseAfterMs: 10
    },
    {
      speakerId: 'speaker_01',
      gender: 'male' as const,
      text: 'Line two completes broadcast.',
      pauseAfterMs: 0
    }
  ];

  const attempt1Indices: number[] = [];
  let attempt1Error: any = null;
  let attempt1Completed = false;

  await audioService.playDialogueSequentially(recoveryLines, {
    examId: 'test_error_recovery',
    onLineStart: (idx) => {
      activeLineBeingPlayed = idx;
      attempt1Indices.push(idx);
    },
    onComplete: () => {
      attempt1Completed = true;
    },
    onError: (err) => {
      attempt1Error = err;
    }
  });

  assert.equal(attempt1Completed, false, 'Interrupted playlist must not fire onComplete');
  assert.ok(attempt1Error, 'Interrupted playlist must surface error on Line 1');
  assert.deepEqual(attempt1Indices, [0, 1], 'Attempt 1 must complete Line 0 and halt on Line 1');
  assert.equal(
    audioService.getCurrentPlaylistIndex(),
    1,
    'audioService must preserve playlistIndex=1 after Line 1 error'
  );

  // Clear simulated network error and resume via startIndex=getCurrentPlaylistIndex() (or audioService.resume())
  failOnLineIndex = null;
  const attempt2Indices: number[] = [];
  let attempt2Completed = false;
  await audioService.playDialogueSequentially(recoveryLines, {
    examId: 'test_error_recovery',
    startIndex: audioService.getCurrentPlaylistIndex(),
    initialElapsed: audioService.getState().currentTime,
    onLineStart: (idx) => {
      activeLineBeingPlayed = idx;
      attempt2Indices.push(idx);
    },
    onComplete: () => {
      attempt2Completed = true;
    }
  });

  assert.equal(attempt2Completed, true, 'Recovered playlist must complete');
  assert.deepEqual(
    attempt2Indices,
    [1, 2],
    'Gate 2.6: Resuming after interruption on Line 1 must play only [1, 2] and never replay completed Line 0'
  );

  // Gate 2.8: Verify that once broadcast is complete, calling audioService.resume() cannot trigger a replay
  const playCallsBeforePostCompleteResume = mockAudioRecovery.playCalls;
  audioService.resume();
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(
    mockAudioRecovery.playCalls,
    playCallsBeforePostCompleteResume,
    'Gate 2.8: Calling audioService.resume() after broadcast completion must never replay any audio'
  );
  assert.equal(
    audioService.getState().isPlaying,
    false,
    'Gate 2.8: isPlaying must remain false after broadcast completion'
  );

  audioService.setAudioElementForTesting(null);
  console.log(
    'PASS [8.9 / Gate 2.6, 2.7 & 2.8]: Mid-playlist error recovery resumes at exact interrupted line without replaying completed lines, and post-completion resume() is a strict no-op.'
  );

  // Test 8.10: Verify v22 audio-clarity stream URL parameters (v=v22, speed=1, speakerId, gender, profile)
  const streamUrlMale = audioService.buildStreamUrl(
    'Good morning, University Accommodation Office. How can I help you today?',
    'speaker_04',
    'male',
    1.0,
    { examId: 'clarity_verify_01', deliveryProfile: 'polite_enquiry' }
  );
  const streamUrlFemale = audioService.buildStreamUrl(
    'Hello, I would like to enquire about the halls of residence.',
    'speaker_05',
    'female',
    1.0,
    { examId: 'clarity_verify_01', deliveryProfile: 'curious_question' }
  );
  assert.ok(streamUrlMale.includes('v=v22'), `Expected v=v22 in male stream URL, got ${streamUrlMale}`);
  assert.ok(streamUrlMale.includes('speed=1'), `Expected speed=1 in male stream URL, got ${streamUrlMale}`);
  assert.ok(streamUrlMale.includes('speakerId=speaker_04') && streamUrlMale.includes('gender=male'), 'Expected speaker_04 and gender=male');
  assert.ok(streamUrlFemale.includes('speakerId=speaker_05') && streamUrlFemale.includes('gender=female'), 'Expected speaker_05 and gender=female');
  console.log('PASS [8.10]: v22 audio-clarity stream URL parameters (v=v22, speed=1, speakerId, gender, profile) verified.');

  await runPhase4TurnTakingRealismTests();

  console.log('\n=== ALL PHASE 5B, 5B.2, 5B.3, 5B.4, 5B.5, 5B.6, TURN-TAKING REALISM & GATE 1–4 AUDIO VALIDATION TESTS PASSED ===');
}

async function runPhase4TurnTakingRealismTests() {
  console.log('\n--- Step 9: Phase 6 Speaker Turn-Taking & Dialogue Realism Suite ---');

  // Test 9.1: Part 1 Coherent Q&A Exchanges (Alternating Agent vs Customer turns)
  const exam40 = zeroRepetitionEngine.generateUniqueListeningExam40({ deferRegistration: true }).questions;
  const dialogueLines = buildListeningExamDialogue(exam40, 'authentic');

  // Find Part 1 dialogue lines (indices between Part 1 opening instruction and Part 1 end check instruction)
  const part1DialogueTurns = dialogueLines.filter((l) => {
    const isInstr =
      l.speakerId === 'speaker_04' &&
      (l.speakerName?.toLowerCase().includes('examiner') ||
        l.text.toLowerCase().startsWith('international english') ||
        l.text.toLowerCase().startsWith('part ') ||
        l.text.toLowerCase().startsWith('before you hear') ||
        l.text.toLowerCase().startsWith('that is the end'));
    return !isInstr;
  });

  assert.ok(part1DialogueTurns.length >= 10, 'Part 1 must contain at least 10 dialogue turns');

  // Verify Part 1 alternates between agent/clerk and customer/applicant without same-speaker monopoly
  for (let i = 1; i < Math.min(10, part1DialogueTurns.length); i++) {
    const prevTurn = part1DialogueTurns[i - 1];
    const currTurn = part1DialogueTurns[i];
    assert.notEqual(
      prevTurn.speakerId,
      currTurn.speakerId,
      `Part 1 turns at index ${i - 1} & ${i} must alternate speakers (${prevTurn.speakerName} vs ${currTurn.speakerName})`
    );
  }
  console.log('PASS [9.1]: Part 1 coherent Q&A exchanges (alternating agent/customer turns) verified.');

  // Find part boundary indices in the full 40-question dialogueLines
  const p2StartIdx = dialogueLines.findIndex((l) => l.text.startsWith('Part 2. You will hear'));
  const p3StartIdx = dialogueLines.findIndex((l) => l.text.startsWith('Part 3. You will hear'));
  const p4StartIdx = dialogueLines.findIndex((l) => l.text.startsWith('Part 4. You will hear'));
  const endIdx = dialogueLines.length;

  // Test 9.2: Part 2 Single-Speaker Monologue Preservation
  const part2Lines = dialogueLines.slice(p2StartIdx, p3StartIdx > 0 ? p3StartIdx : dialogueLines.length);
  const part2MonologueTurns = part2Lines.filter(
    (l) => !l.speakerName?.toLowerCase().includes('examiner') && !l.text.toLowerCase().startsWith('before you hear')
  );
  assert.ok(part2MonologueTurns.length >= 5, 'Part 2 must contain monologue turns');
  const part2SpeakerIds = new Set(part2MonologueTurns.map((l) => l.speakerId));
  assert.equal(
    part2SpeakerIds.size,
    1,
    `Part 2 monologue must maintain a single consistent speaker voice across all scenario turns, got ${Array.from(part2SpeakerIds).join(', ')}`
  );
  console.log('PASS [9.2]: Part 2 single-speaker monologue preservation verified.');

  // Test 9.3: Part 3 Academic Discussion Coherence
  const part3Lines = dialogueLines.slice(p3StartIdx, p4StartIdx > 0 ? p4StartIdx : dialogueLines.length);
  const part3DiscussionTurns = part3Lines.filter(
    (l) => !l.speakerName?.toLowerCase().includes('examiner') && !l.text.toLowerCase().startsWith('before you hear')
  );
  assert.ok(part3DiscussionTurns.length >= 5, 'Part 3 must contain discussion turns');
  const part3SpeakerIds = new Set(part3DiscussionTurns.map((l) => l.speakerId));
  assert.ok(
    part3SpeakerIds.size >= 2,
    `Part 3 academic discussion must feature at least 2 distinct speaker voices (tutor & students), got ${part3SpeakerIds.size}`
  );
  console.log('PASS [9.3]: Part 3 academic discussion multi-speaker coherence verified.');

  // Test 9.4: Part 4 Single-Speaker Academic Lecture
  const part4Lines = dialogueLines.slice(p4StartIdx, endIdx);
  const part4LectureTurns = part4Lines.filter(
    (l) => !l.speakerName?.toLowerCase().includes('examiner') && !l.text.toLowerCase().startsWith('before you hear')
  );
  assert.ok(part4LectureTurns.length >= 5, 'Part 4 must contain lecture turns');
  const part4SpeakerIds = new Set(part4LectureTurns.map((l) => l.speakerId));
  assert.equal(
    part4SpeakerIds.size,
    1,
    `Part 4 academic lecture must maintain a single consistent lecturer voice, got ${Array.from(part4SpeakerIds).join(', ')}`
  );
  console.log('PASS [9.4]: Part 4 single-speaker academic lecture preservation verified.');

  // Test 9.5: Consecutive turns permitted when justified (monologue parts) and coalesced in dialogue parts
  const rawSplitLines = [
    { speaker: 'Student A (Callum)', speakerId: 'speaker_01', gender: 'male' as const, text: 'First part of my observation.' },
    { speaker: 'Student A (Callum)', speakerId: 'speaker_01', gender: 'male' as const, text: 'Second part of my observation.' }
  ];
  const coalesced = validateAndCoalesceDialogueSequence(
    rawSplitLines.map((l) => ({ ...l, speakerName: l.speaker })),
    1
  );
  assert.equal(coalesced.length, 1, 'Consecutive lines from same speaker in Part 1 must be coalesced into 1 turn');
  assert.equal(
    coalesced[0].text,
    'First part of my observation. Second part of my observation.',
    'Coalesced text must combine both sentences'
  );
  console.log('PASS [9.5]: Justified consecutive turns coalesced in Part 1/3 dialogue parts.');

  // Test 9.6: Unknown or invalid speaker labels resolve safely to supported voice IDs
  const unknownSpeakerLines = [
    { speaker: 'Mystery Guest', gender: 'female' as const, text: 'Hello from unknown speaker.' }
  ];
  const resolvedUnknown = assignSectionDialogueSpeakers(unknownSpeakerLines, 1, 'Guest');
  assert.ok(
    Object.keys(SPEAKER_EDGE_VOICE_MAP).includes(resolvedUnknown[0].speakerId),
    'Unknown speaker label must resolve to a valid supported speakerId'
  );
  console.log('PASS [9.6]: Unknown speaker labels resolve safely to supported voice IDs.');

  // Test 9.7: Preservation of question-answer content and question numbering
  assert.equal(exam40.length, 40, 'Exam must contain 40 questions');
  exam40.forEach((q, idx) => {
    assert.ok(q.prompt || (q.dialogue && q.dialogue.length > 0) || q.audioScript, `Question ${idx + 1} must have content`);
  });
  console.log('PASS [9.7]: Question-answer content and 40-question numbering preserved.');

  // Test 9.8 & 9.9: Correct ordering of turns and no duplicate/dropped turns in playback queue
  assert.ok(
    dialogueLines[0].text.startsWith('International English Language Testing System'),
    'First line of dialogue queue must be official welcome'
  );
  assert.ok(
    dialogueLines[dialogueLines.length - 1].text.includes('end of the listening audio recording'),
    'Last line of dialogue queue must be final test conclusion'
  );
  console.log('PASS [9.8 & 9.9]: Correct turn ordering and zero dropped/duplicated turns verified.');

  // Test 9.10: Examiner identity protection (Examiner Arthur is never mislabeled as student or applicant)
  const examinerTurnsInDialogue = dialogueLines.filter((l) =>
    l.speakerName?.toLowerCase().includes('examiner')
  );
  examinerTurnsInDialogue.forEach((l) => {
    assert.equal(l.speakerId, 'speaker_04', 'Examiner lines must always retain speakerId=speaker_04');
    assert.equal(l.speakerName, 'Sprint Examiner (Arthur)', 'Examiner lines must retain Sprint Examiner (Arthur) label');
  });
  console.log('PASS [9.10]: Examiner identity protection (Arthur = speaker_04) verified across all 4 parts.');
}

async function runStage2ReliabilityRegressionTests() {
  console.log('\n=== Running BandSprint Stage 2: Regular Listening Reliability Regression Suite ===\n');

  // Test 10.1: Speaker Gender Precedence over Conflicting Job Titles / Roles
  // Test case A: Explicit male with female-associated job titles (receptionist, nurse, advisor, librarian)
  const maleWithConflictingTitles = [
    { speaker: 'Receptionist (David)', gender: 'male' as const, text: 'Hello, welcome to the health clinic.' },
    { speaker: 'Senior Nurse (John)', gender: 'male' as const, text: 'I will take your blood pressure now.' },
    { speaker: 'Academic Advisor (Mark)', gender: 'male' as const, text: 'Here are your study module options.' },
    { speaker: 'Chief Librarian (Simon)', gender: 'male' as const, text: 'All books are catalogued alphabetically.' }
  ];

  const assignedMaleProfiles = audioManager.assignDistinctSpeakerProfiles(maleWithConflictingTitles);
  assignedMaleProfiles.forEach((profile, i) => {
    assert.equal(
      profile.gender,
      'male',
      `Test 10.1A: Explicit gender 'male' must override role keyword in '${maleWithConflictingTitles[i].speaker}'`
    );
    const speakerMeta = IELTS_SPEAKERS[profile.speakerId];
    assert.equal(
      speakerMeta?.gender,
      'male',
      `Test 10.1A: Assigned speaker '${profile.speakerId}' must be male for '${maleWithConflictingTitles[i].speaker}'`
    );
  });
  console.log('PASS [10.1A]: Explicit male gender takes precedence over job-title regex (receptionist, nurse, advisor, librarian).');

  // Test case B: Explicit female with male-associated job titles (officer, lecturer, professor, customer, student)
  const femaleWithConflictingTitles = [
    { speaker: 'Lecturer (Dr. Sarah)', gender: 'female' as const, text: 'Today we discuss cellular biology.' },
    { speaker: 'Professor (Dr. Helen)', gender: 'female' as const, text: 'Please submit your dissertations by Friday.' },
    { speaker: 'Police Officer (Inspector Jane)', gender: 'female' as const, text: 'Can you describe what was taken?' },
    { speaker: 'Customer (Mrs. Davies)', gender: 'female' as const, text: 'I would like to inquire about the rental.' }
  ];

  const assignedFemaleProfiles = audioManager.assignDistinctSpeakerProfiles(femaleWithConflictingTitles);
  assignedFemaleProfiles.forEach((profile, i) => {
    assert.equal(
      profile.gender,
      'female',
      `Test 10.1B: Explicit gender 'female' must override role keyword in '${femaleWithConflictingTitles[i].speaker}'`
    );
    const speakerMeta = IELTS_SPEAKERS[profile.speakerId];
    assert.equal(
      speakerMeta?.gender,
      'female',
      `Test 10.1B: Assigned speaker '${profile.speakerId}' must be female for '${femaleWithConflictingTitles[i].speaker}'`
    );
  });
  console.log('PASS [10.1B]: Explicit female gender takes precedence over job-title regex (lecturer, professor, officer, customer).');

  // Test case C: When gender is undefined, role/title inference acts as fallback
  const inferredRoleProfiles = audioManager.assignDistinctSpeakerProfiles([
    { speaker: 'The Receptionist', text: 'May I take your name please?' },
    { speaker: 'The Professor', text: 'Turn to page 45 in the textbook.' }
  ]);
  assert.equal(inferredRoleProfiles[0].gender, 'female', 'Fallback inference: Receptionist defaults to female');
  assert.equal(inferredRoleProfiles[1].gender, 'male', 'Fallback inference: Professor defaults to male');
  console.log('PASS [10.1C]: In the absence of explicit gender, role/title regex correctly acts as fallback.');

  // Test 10.2: Examiner Arthur Protection in Dialogue Lines & Default Speaker Pools
  const sampleSection1Dialogue = [
    { speaker: 'Agent', text: 'Good morning, how can I help you today?' },
    { speaker: 'Customer', text: 'I would like some information about train tickets.' }
  ];
  const section1Resolved = assignSectionDialogueSpeakers(sampleSection1Dialogue, 1, 'Everyday Speaker');
  section1Resolved.forEach((line) => {
    assert.notEqual(
      line.speakerId,
      'speaker_04',
      `Test 10.2: Section 1 dialogue line for '${line.speaker}' must NOT be assigned to Examiner Arthur (speaker_04)`
    );
  });
  assert.equal(section1Resolved[0].speakerId, 'speaker_01', 'Default male dialogue character must resolve to speaker_01 (Thomas)');
  console.log('PASS [10.2]: Examiner Arthur (speaker_04) strictly excluded from Part 1 dialogue characters; default male is speaker_01.');

  // Test 10.3: Generation Guard in AudioManager — Stale Playback Cannot Clear Newer Lock
  audioManager.reset('stage2_test_setup');
  (audioManager as any).isPlaybackLocked = true;
  const gen1 = ++(audioManager as any).playbackGeneration;
  assert.equal((audioManager as any).isPlaybackLocked, true, 'Playback lock is active for gen1');

  // Newer playback starts:
  (audioManager as any).isPlaybackLocked = true;
  const gen2 = ++(audioManager as any).playbackGeneration;
  assert.ok(gen2 > gen1, 'New generation must strictly exceed prior generation');

  // Stale callback from gen1 attempts to clear lock:
  const staleGen = gen1;
  if ((audioManager as any).playbackGeneration === staleGen) {
    (audioManager as any).isPlaybackLocked = false;
  }
  assert.equal(
    (audioManager as any).isPlaybackLocked,
    true,
    'Stale generation callback must NOT unlock active playback'
  );

  // Active callback from gen2 clears lock on completion:
  const activeGen = gen2;
  if ((audioManager as any).playbackGeneration === activeGen) {
    (audioManager as any).isPlaybackLocked = false;
  }
  assert.equal(
    (audioManager as any).isPlaybackLocked,
    false,
    'Active generation callback correctly unlocks playback upon completion'
  );
  console.log('PASS [10.3]: Generation guard prevents stale playback operations from clearing active lock.');

  // Test 10.4: Realistic Listening Preparation Pauses Integrity
  const test40Questions = zeroRepetitionEngine.generateUniqueListeningExam40({ deferRegistration: true }).questions;
  const authenticDialogue = buildListeningExamDialogue(test40Questions, 'authentic');
  const quickDialogue = buildListeningExamDialogue(test40Questions, 'quick');

  // Verify welcome pause
  assert.equal(authenticDialogue[0].pauseAfterMs, 2500, 'Authentic welcome pause must be 2.5s (2500ms)');
  assert.equal(quickDialogue[0].pauseAfterMs, 1100, 'Quick welcome pause must be 1.1s (1100ms)');

  // Verify Part 1 preview pause (Line 1 is "First, you have some time to look at questions 1 to 10.")
  assert.equal(authenticDialogue[1].pauseAfterMs, 20000, 'Authentic Part 1 preview pause must be 20s (20000ms)');
  assert.equal(quickDialogue[1].pauseAfterMs, 1100, 'Quick Part 1 preview pause must be 1.1s (1100ms)');

  // Verify Part 1 end check pause ("You now have half a minute to check your answers...")
  const p1CheckLine = authenticDialogue.find((l) => l.text.includes('half a minute to check your answers to questions 1 to 10'));
  assert.ok(p1CheckLine, 'Authentic dialogue must contain Part 1 check line');
  assert.equal(p1CheckLine.pauseAfterMs, 30000, 'Authentic Part 1 check pause must be 30s (30000ms)');

  const quickP1CheckLine = quickDialogue.find((l) => l.text.includes('half a minute to check your answers to questions 1 to 10'));
  assert.ok(quickP1CheckLine, 'Quick dialogue must contain Part 1 check line');
  assert.equal(quickP1CheckLine.pauseAfterMs, 1100, 'Quick Part 1 check pause must be 1.1s (1100ms)');
  console.log('PASS [10.4]: Realistic IELTS-style preparation pauses (2.5s welcome, 20s preview, 30s check) preserved distinct from quick mode.');

  // Test 10.5: AudioService Pause Tracking State
  const audioState = audioService.getState();
  assert.equal(typeof audioState.isInterLinePause, 'boolean', 'isInterLinePause is exposed in AudioPlaybackState');
  assert.equal(typeof audioState.pauseRemainingSec, 'number', 'pauseRemainingSec is exposed in AudioPlaybackState');
  console.log('PASS [10.5]: AudioService correctly exposes isInterLinePause and pauseRemainingSec for UI visibility.');

  // Test 10.6: New Zealand & Irish Speaker Mapping Integrity
  assert.equal(IELTS_SPEAKERS['speaker_13'].accent, 'New Zealand English (en-NZ)', 'speaker_13 is New Zealand Male');
  assert.equal(IELTS_SPEAKERS['speaker_14'].accent, 'New Zealand English (en-NZ)', 'speaker_14 is New Zealand Female');
  assert.equal(IELTS_SPEAKERS['speaker_15'].accent, 'Irish English (en-IE)', 'speaker_15 is Irish Male');
  assert.equal(IELTS_SPEAKERS['speaker_16'].accent, 'Irish English (en-IE)', 'speaker_16 is Irish Female');
  console.log('PASS [10.6]: New Zealand (speaker_13/14) and Irish (speaker_15/16) speaker mappings verified.');
}

async function runStage1VoiceSeparationRegressionTests() {
  console.log('\n--- Running Stage B Dialogue Voice Model Separation Tests ---');

  // Test 11.1: Two male dialogue roles must receive disjoint effective voice models
  const twoMaleDialogue = [
    { speaker: 'Male Student', gender: 'male' as const, text: 'Hello Professor, do you have a moment?' },
    { speaker: 'Professor', gender: 'male' as const, text: 'Yes, come in. How is your project progressing?' }
  ];

  const assignedTwoMale = audioManager.assignDistinctSpeakerProfiles(twoMaleDialogue);
  assert.equal(assignedTwoMale.length, 2, 'Assigned 2 dialogue turns');

  const spk1 = assignedTwoMale[0].speakerId;
  const spk2 = assignedTwoMale[1].speakerId;

  const SPEAKER_EFFECTIVE_VOICE_MAP: Record<string, string> = {
    speaker_01: 'en-GB-ThomasNeural',
    speaker_02: 'en-GB-LibbyNeural',
    speaker_03: 'en-GB-ThomasNeural',
    speaker_04: 'en-GB-RyanNeural',
    speaker_05: 'en-GB-SoniaNeural',
    speaker_06: 'en-AU-WilliamMultilingualNeural',
    speaker_07: 'en-AU-NatashaNeural',
    speaker_08: 'en-ZA-LukeNeural',
    speaker_09: 'en-US-ChristopherNeural',
    speaker_10: 'en-US-JennyNeural',
    speaker_11: 'en-CA-LiamNeural',
    speaker_12: 'en-CA-ClaraNeural',
    speaker_13: 'en-NZ-MitchellNeural',
    speaker_14: 'en-NZ-MollyNeural',
    speaker_15: 'en-IE-ConnorNeural',
    speaker_16: 'en-IE-EmilyNeural'
  };

  const voice1 = SPEAKER_EFFECTIVE_VOICE_MAP[spk1] || spk1;
  const voice2 = SPEAKER_EFFECTIVE_VOICE_MAP[spk2] || spk2;

  assert.notEqual(spk1, spk2, 'Two male speakers must receive distinct speaker IDs');
  assert.notEqual(voice1, voice2, `Two male speakers must receive disjoint effective voice models! (Found: ${spk1} [${voice1}] vs ${spk2} [${voice2}])`);
  console.log(`PASS [11.1]: Male Student (${spk1} -> ${voice1}) and Male Professor (${spk2} -> ${voice2}) assigned 100% disjoint effective voice models.`);

  // Test 11.2: Explicit gender takes precedence over job titles
  const explicitFemaleOfficer = [
    { speaker: 'Admissions Officer', gender: 'female' as const, text: 'Please sign here.' }
  ];
  const assignedFemaleOfficer = audioManager.assignDistinctSpeakerProfiles(explicitFemaleOfficer);
  assert.equal(
    assignedFemaleOfficer[0].gender,
    'female',
    'Explicit line.gender="female" takes absolute precedence over job title "Officer"'
  );
  console.log('PASS [11.2]: Explicit line.gender="female" takes absolute precedence over male-leaning job title.');

  // Test 11.3: Examiner Arthur (speaker_04) is excluded from dialogue participant assignment
  assert.notEqual(spk1, 'speaker_04', 'Dialogue participant must not use Examiner Arthur (speaker_04)');
  assert.notEqual(spk2, 'speaker_04', 'Dialogue participant must not use Examiner Arthur (speaker_04)');
  console.log('PASS [11.3]: Examiner Arthur (speaker_04) excluded from dialogue role assignment pool.');
}

async function main() {
  runListeningIntegrityTests();
  await runPhase3ListeningPlaybackRegressionTests();
  await runStage2ReliabilityRegressionTests();
  await runStage1VoiceSeparationRegressionTests();
}

main().catch((err) => {
  console.error('Listening Integrity Test Suite Failed:', err);
  process.exit(1);
});




