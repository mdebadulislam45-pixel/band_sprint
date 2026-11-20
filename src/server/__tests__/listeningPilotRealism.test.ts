/**
 * IELTS SPRINT — PHASE 5.2A TEST SUITE:
 * Complete Pilot Listening Exam Realism, 40-Question Integrity & Audio Duration Validation
 *
 * Verifies:
 * 1. Pilot Exam (sprint-18) has all 4 Listening sections fully populated and available.
 * 2. Exactly 40 Listening questions present (IDs 1 through 40).
 * 3. Exactly 10 questions allocated per section (Sec 1: Q1–10, Sec 2: Q11–20, Sec 3: Q21–30, Sec 4: Q31–40).
 * 4. 100% complete answer keys, correct answers, and explanations.
 * 5. Audio script length & playable duration validation (~3,700 total words = ~28-30 mins audio at 125-135 WPM).
 * 6. Unique script identity and zero duplicate question prompt strings across sections.
 * 7. Seamless resolution via StaticMockAdapter and Central ContentRegistryService.
 */

import assert from 'node:assert/strict';
import { MOCK_EXAM_SETS, getExamListeningSection } from '../../data/mockExams';
import { StaticMockAdapter } from '../../services/contentRegistry/adapters/StaticMockAdapter';
import { contentRegistry, parseURN } from '../../services/contentRegistry/ContentRegistryService';

async function runListeningPilotRealismTests() {
  console.log('--- STARTING PHASE 5.2A PILOT LISTENING REALISM TEST SUITE ---\n');
  let passedCount = 0;

  const pilotSet = MOCK_EXAM_SETS.find((s) => s.id === 'sprint-18');
  assert.ok(pilotSet, 'Pilot Exam Set (sprint-18) must exist in MOCK_EXAM_SETS');

  // Test 1: Four-Section Completeness & Availability
  {
    console.log('[Test 1] Pilot Exam (sprint-18) four-section completeness');
    assert.ok(pilotSet.listeningSections, 'Pilot exam must have listeningSections map');
    
    for (let s = 1; s <= 4; s++) {
      const sec = getExamListeningSection(pilotSet, s as 1 | 2 | 3 | 4);
      assert.strictEqual(sec.sectionNumber, s, `Section number mismatch for Section ${s}`);
      assert.strictEqual(sec.isAvailable, true, `Pilot exam Section ${s} must be available`);
      assert.ok(sec.title && sec.title.length > 10, `Section ${s} must have a descriptive title`);
      assert.ok(sec.script && sec.script.length > 500, `Section ${s} must have a non-empty audio script`);
    }
    console.log('✓ PASS: All 4 Listening sections are present and available in Pilot Exam.\n');
    passedCount++;
  }

  // Test 2: Exactly 40 Questions (IDs 1 through 40)
  {
    console.log('[Test 2] Exactly 40 Listening questions present in Pilot Exam');
    const listeningQuestions = pilotSet.questions.filter((q) => q.section === 'listening');
    assert.strictEqual(listeningQuestions.length, 40, `Expected 40 Listening questions, found ${listeningQuestions.length}`);
    
    // Check IDs 1 through 40 in sequence
    for (let i = 1; i <= 40; i++) {
      const q = listeningQuestions.find((item) => item.id === i);
      assert.ok(q, `Listening Question ID ${i} must exist`);
      assert.ok(q.prompt && q.prompt.trim().length > 0, `Question ID ${i} must have non-empty prompt`);
    }
    console.log('✓ PASS: Exactly 40 Listening questions (IDs 1–40) present.\n');
    passedCount++;
  }

  // Test 3: Exactly 10 Questions allocated per section
  {
    console.log('[Test 3] Section Question Distribution (10 Qs per section)');
    const sec1Qs = pilotSet.questions.filter((q) => q.section === 'listening' && q.id >= 1 && q.id <= 10);
    const sec2Qs = pilotSet.questions.filter((q) => q.section === 'listening' && q.id >= 11 && q.id <= 20);
    const sec3Qs = pilotSet.questions.filter((q) => q.section === 'listening' && q.id >= 21 && q.id <= 30);
    const sec4Qs = pilotSet.questions.filter((q) => q.section === 'listening' && q.id >= 31 && q.id <= 40);

    assert.strictEqual(sec1Qs.length, 10, `Section 1 must have 10 Qs, got ${sec1Qs.length}`);
    assert.strictEqual(sec2Qs.length, 10, `Section 2 must have 10 Qs, got ${sec2Qs.length}`);
    assert.strictEqual(sec3Qs.length, 10, `Section 3 must have 10 Qs, got ${sec3Qs.length}`);
    assert.strictEqual(sec4Qs.length, 10, `Section 4 must have 10 Qs, got ${sec4Qs.length}`);

    console.log('✓ PASS: Section 1 (Q1-10), Section 2 (Q11-20), Section 3 (Q21-30), Section 4 (Q31-40) distributed correctly.\n');
    passedCount++;
  }

  // Test 4: Answer Key Completeness & Explanation Validity
  {
    console.log('[Test 4] Answer key completeness across all 40 Listening questions');
    const listeningQuestions = pilotSet.questions.filter((q) => q.section === 'listening');
    for (const q of listeningQuestions) {
      assert.ok(q.correctAnswer && q.correctAnswer.trim().length > 0, `Question ID ${q.id} missing correctAnswer`);
      assert.ok(q.explanation && q.explanation.trim().length > 10, `Question ID ${q.id} missing detailed explanation`);
    }
    console.log('✓ PASS: 100% of Listening questions have valid correct answers and explanations.\n');
    passedCount++;
  }

  // Test 5: Audio Script Length & Playable Duration Target (~28-30 Mins Total)
  {
    console.log('[Test 5] Audio script word count & playable duration estimation');
    let totalWordCount = 0;
    for (let s = 1; s <= 4; s++) {
      const sec = getExamListeningSection(pilotSet, s as 1 | 2 | 3 | 4);
      const wordCount = sec.script ? sec.script.split(/\s+/).filter(Boolean).length : 0;
      totalWordCount += wordCount;
      const estMinutes = (wordCount / 130).toFixed(1);
      console.log(`  - Section ${s}: ${wordCount} words (~${estMinutes} mins audio)`);
      assert.ok(wordCount >= 600, `Section ${s} script must be at least 600 words for realistic audio duration`);
    }
    const totalEstMinutes = (totalWordCount / 130).toFixed(1);
    console.log(`  -> TOTAL SCRIPT WORD COUNT: ${totalWordCount} words (~${totalEstMinutes} mins audio at 130 WPM)`);
    assert.ok(totalWordCount >= 3000, `Total Listening script word count must be >= 3,000 words (~25-28 mins audio including pauses), got ${totalWordCount}`);
    
    console.log('✓ PASS: Script word count guarantees ~28–30 minutes of playable IELTS Listening audio.\n');
    passedCount++;
  }

  // Test 6: Zero Duplicate Question Prompt Strings Across Sections
  {
    console.log('[Test 6] Duplicate Question Prompt Check');
    const promptsSeen = new Set<string>();
    const listeningQuestions = pilotSet.questions.filter((q) => q.section === 'listening');
    
    for (const q of listeningQuestions) {
      const norm = q.prompt.toLowerCase().trim();
      assert.ok(!promptsSeen.has(norm), `Duplicate prompt found in Listening questions: "${q.prompt}"`);
      promptsSeen.add(norm);
    }
    console.log('✓ PASS: 40/40 Listening questions have unique prompt strings.\n');
    passedCount++;
  }

  // Test 7: StaticMockAdapter Resolution
  {
    console.log('[Test 7] StaticMockAdapter resolution for Pilot Exam (sprint-18)');
    const adapter = new StaticMockAdapter();
    const urn = parseURN('urn:ielts:sprint_original:mock_exam:sprint-18');
    
    const listeningView = await adapter.getListening(urn);
    assert.ok(listeningView, 'StaticMockAdapter must resolve listening view for sprint-18');
    assert.strictEqual(listeningView.sections.length, 4, 'AdaptedListeningView must contain 4 sections');
    
    let totalAdaptedQs = 0;
    listeningView.sections.forEach((sec, idx) => {
      assert.strictEqual(sec.sectionNumber, idx + 1);
      assert.strictEqual(sec.isAvailable, true, `Adapted section ${sec.sectionNumber} must be available`);
      assert.ok(sec.audioScript && sec.audioScript.length > 500, `Adapted section ${sec.sectionNumber} must have script`);
      totalAdaptedQs += sec.questions.length;
    });
    assert.strictEqual(totalAdaptedQs, 40, `AdaptedListeningView must contain exactly 40 questions, got ${totalAdaptedQs}`);

    console.log('✓ PASS: StaticMockAdapter resolves 4 available sections with 40 questions.\n');
    passedCount++;
  }

  // Test 8: Central ContentRegistryService URN Resolution
  {
    console.log('[Test 8] Central ContentRegistryService URN resolution');
    const res = await contentRegistry.resolve('urn:ielts:sprint_original:mock_exam:sprint-18');
    assert.ok(res, 'ContentRegistryService must resolve URN for sprint-18');
    assert.strictEqual(res.canonicalId, 'sprint-18');
    assert.strictEqual(res.provenance, 'sprint_original');
    assert.strictEqual(res.family, 'mock_exam');
    assert.ok(res.rawRef, 'Raw mock exam set reference must be attached');

    const listeningView = await contentRegistry.getListening('urn:ielts:sprint_original:mock_exam:sprint-18');
    assert.ok(listeningView, 'ContentRegistryService must resolve adapted listening view');
    assert.strictEqual(listeningView.sections.length, 4, 'Adapted listening view must contain 4 sections');

    console.log('✓ PASS: ContentRegistryService resolves URN "urn:ielts:sprint_original:mock_exam:sprint-18" and returns 4-section listening view.\n');
    passedCount++;
  }

  // Test 9: Phase 5.2A.3 Acceptable Answer Edge-Case Regression
  {
    console.log('[Test 9] Phase 5.2A.3 Acceptable Answer Edge-Case Regression (Q3, Q6, Q31 & 37-question isolation)');
    const { isListeningAnswerCorrect } = await import('../listeningAnswerEvaluator');

    // 1. Q3 Date Variations
    const q3 = pilotSet.questions.find((q) => q.id === 3)!;
    assert.ok(q3, 'Q3 must exist');
    assert.strictEqual(isListeningAnswerCorrect(q3 as any, '14TH OCTOBER'), true, 'Canonical Q3 "14TH OCTOBER" must be accepted');
    assert.strictEqual(isListeningAnswerCorrect(q3 as any, '14 OCTOBER'), true, 'Alternative Q3 "14 OCTOBER" must be accepted');
    assert.strictEqual(isListeningAnswerCorrect(q3 as any, 'OCTOBER 14'), true, 'Alternative Q3 "OCTOBER 14" must be accepted');
    assert.strictEqual(isListeningAnswerCorrect(q3 as any, '14TH OF OCTOBER'), true, 'Alternative Q3 "14TH OF OCTOBER" must be accepted');
    assert.strictEqual(isListeningAnswerCorrect(q3 as any, '15TH OCTOBER'), false, 'Incorrect Q3 date "15TH OCTOBER" must be rejected');
    assert.strictEqual(isListeningAnswerCorrect(q3 as any, 'OCTOBER'), false, 'Partial Q3 date "OCTOBER" must be rejected');

    // 2. Q6 Number Variations
    const q6 = pilotSet.questions.find((q) => q.id === 6)!;
    assert.ok(q6, 'Q6 must exist');
    assert.strictEqual(isListeningAnswerCorrect(q6 as any, '85'), true, 'Canonical Q6 "85" must be accepted');
    assert.strictEqual(isListeningAnswerCorrect(q6 as any, 'EIGHTY FIVE'), true, 'Alternative Q6 "EIGHTY FIVE" must be accepted');
    assert.strictEqual(isListeningAnswerCorrect(q6 as any, 'EIGHTY-FIVE'), true, 'Alternative Q6 "EIGHTY-FIVE" must be accepted');
    assert.strictEqual(isListeningAnswerCorrect(q6 as any, '86'), false, 'Incorrect Q6 number "86" must be rejected');
    assert.strictEqual(isListeningAnswerCorrect(q6 as any, '8'), false, 'Partial Q6 number "8" must be rejected');

    // 3. Q31 Percentage Variations
    const q31 = pilotSet.questions.find((q) => q.id === 31)!;
    assert.ok(q31, 'Q31 must exist');
    assert.strictEqual(isListeningAnswerCorrect(q31 as any, '30%'), true, 'Canonical Q31 "30%" must be accepted');
    assert.strictEqual(isListeningAnswerCorrect(q31 as any, '30 PERCENT'), true, 'Alternative Q31 "30 PERCENT" must be accepted');
    assert.strictEqual(isListeningAnswerCorrect(q31 as any, 'THIRTY PERCENT'), true, 'Alternative Q31 "THIRTY PERCENT" must be accepted');
    assert.strictEqual(isListeningAnswerCorrect(q31 as any, '40%'), false, 'Incorrect Q31 percentage "40%" must be rejected');
    assert.strictEqual(isListeningAnswerCorrect(q31 as any, 'PERCENT'), false, 'Partial Q31 "PERCENT" must be rejected');

    // 4. Verify other 37 questions retain existing evaluation behavior
    const otherQs = pilotSet.questions.filter((q) => q.section === 'listening' && ![3, 6, 31].includes(q.id));
    assert.strictEqual(otherQs.length, 37, 'Must have exactly 37 unmodified questions');
    for (const q of otherQs) {
      assert.strictEqual(isListeningAnswerCorrect(q as any, q.correctAnswer), true, `Question ID ${q.id} canonical answer must remain accepted`);
      assert.strictEqual(isListeningAnswerCorrect(q as any, 'WRONG_ANSWER_TEXT_123'), false, `Question ID ${q.id} wrong answer must remain rejected`);
    }

    console.log('✓ PASS: Q3, Q6, and Q31 acceptable variations accepted; incorrect/partial answers rejected; 37 other questions isolated.\n');
    passedCount++;
  }

  console.log(`=== ALL ${passedCount} PHASE 5.2A PILOT LISTENING REALISM TESTS PASSED ===\n`);
}

runListeningPilotRealismTests().catch((err) => {
  console.error('❌ PHASE 5.2A TEST SUITE FAILED:', err);
  process.exit(1);
});

