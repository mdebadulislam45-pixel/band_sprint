import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import 'dotenv/config';
import { validateAcademicReadingExam } from '../../server/ai/validationEngine.ts';
import { questionFactory } from '../../server/ai/questionFactory.ts';
import { serverDb } from '../../server/db.ts';
import { MOCK_EXAM_SETS } from '../../data/mockExams.ts';

describe('Phase 5.5H.9A — Academic Reading Pilot & Factory Validation Test Suite', () => {

  test('1. Independent Validator correctly accepts a valid 3-passage 40-question draft', () => {
    const validDraft = {
      examId: 'test-acad-reading-001',
      title: 'IELTS Academic Reading Practice Set 1',
      format: 'Academic',
      passages: [
        {
          passageNumber: 1,
          title: 'Deep-Sea Coral Ecosystems',
          text: 'Deep-sea corals grow in cold, dark ocean waters at depths ranging from 50 to 3,000 meters. Unlike tropical reef-building corals, cold-water corals do not rely on symbiotic algae for energy, as sunlight cannot penetrate these depths. Instead, they capture organic particles and plankton floating in ocean currents. These slow-growing structures provide vital habitat for hundreds of fish species.',
          questions: Array.from({ length: 13 }, (_, i) => ({
            id: i + 1,
            type: i < 7 ? 'true_false_not_given' : 'sentence_completion',
            prompt: i < 7 ? `Statement ${i + 1} regarding deep-sea corals.` : `Fill in blank for question ${i + 1} (NO MORE THAN TWO WORDS).`,
            correctAnswer: i < 7 ? (i % 2 === 0 ? 'TRUE' : 'FALSE') : 'ocean currents',
            explanation: `Explanation for question ${i + 1}`,
            passageEvidence: 'Deep-sea corals grow in cold, dark ocean waters'
          }))
        },
        {
          passageNumber: 2,
          title: 'History of Cryptography',
          text: 'Cryptography has evolved from ancient manual ciphers to modern mathematical encryption algorithms. The Caesar cipher substituted letters by a fixed offset. During World War II, mechanical rotor cipher machines like the Enigma machine dramatically altered military intelligence. Today, public-key cryptography underpins secure global internet communication.',
          questions: Array.from({ length: 13 }, (_, i) => ({
            id: i + 14,
            type: i < 6 ? 'matching_headings' : 'summary_completion',
            prompt: `Question ${i + 14} regarding cryptography history.`,
            correctAnswer: i < 6 ? 'Heading III' : 'Caesar cipher',
            explanation: `Explanation for question ${i + 14}`,
            passageEvidence: 'The Caesar cipher substituted letters by a fixed offset'
          }))
        },
        {
          passageNumber: 3,
          title: 'Cognitive Benefits of Multilingualism',
          text: 'Recent neuroimaging studies demonstrate that speaking multiple languages enhances executive function and cognitive flexibility throughout life. Multilingual individuals consistently outperform monolinguals on tasks requiring working memory, task-switching, and selective attention. Furthermore, lifelong bilingualism delays the onset of dementia symptoms by four to five years.',
          questions: Array.from({ length: 14 }, (_, i) => ({
            id: i + 27,
            type: i < 7 ? 'yes_no_not_given' : 'multiple_choice',
            prompt: i < 7 ? `Statement ${i + 27} regarding bilingual cognition.` : `Multiple choice prompt for question ${i + 27}?`,
            options: i >= 7 ? ['A) Improves memory', 'B) Decreases focus', 'C) No effect', 'D) Causes fatigue'] : undefined,
            correctAnswer: i < 7 ? 'YES' : 'A',
            explanation: `Explanation for question ${i + 27}`,
            passageEvidence: 'speaking multiple languages enhances executive function'
          }))
        }
      ]
    };

    const validation = validateAcademicReadingExam(validDraft);
    assert.equal(validation.passed, true, `Validation failed: ${validation.errors.join('; ')}`);
    assert.equal(validation.stats.passageCount, 3);
    assert.equal(validation.stats.totalQuestions, 40);
    assert.deepEqual(validation.stats.passageQuestions, [13, 13, 14]);
  });

  test('2. Independent Validator rejects invalid structural payload (missing passage & invalid question count)', () => {
    const invalidDraft = {
      examId: 'invalid-draft',
      title: 'Defective Exam',
      format: 'Academic',
      passages: [
        {
          passageNumber: 1,
          title: 'Single Passage Exam',
          text: 'Short text here.',
          questions: [
            { id: 1, type: 'true_false_not_given', prompt: 'Is this valid?', correctAnswer: 'MAYBE', explanation: 'Invalid answer string', passageEvidence: 'Short text' }
          ]
        }
      ]
    };

    const validation = validateAcademicReadingExam(invalidDraft);
    assert.equal(validation.passed, false);
    assert.equal(validation.structuralOk, false);
    assert.equal(validation.answersOk, false);
    assert.ok(validation.errors.some(e => e.includes('Expected exactly 3 passages')));
    assert.ok(validation.errors.some(e => e.includes('Expected exactly 40 questions total')));
  });

  test('3. Live Pilot Generation with Gemini 3.8 and persistence isolation', async () => {
    const testUserId = `test_user_reading_${Date.now()}`;
    
    // Create test user in DB to satisfy relationships
    serverDb.saveUser({
      id: testUserId,
      email: 'pilot_tester@example.com',
      name: 'Pilot Tester',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    console.log('--- Dispatching real Academic Reading Pilot generation via questionFactory ---');
    const result = await questionFactory.generateAcademicReadingPilot({
      userId: testUserId,
      topicSeed: 'Renewable Microgrids & Urban Forestry'
    });

    assert.ok(result.draft, 'Draft record was created');
    assert.ok(result.draft.id.startsWith('draft_reading_'));
    assert.equal(result.draft.userId, testUserId);
    assert.equal(result.draft.model, 'gemini-3.8-flash');
    assert.equal(result.draft.examType, 'academic_reading');

    // Check DB persistence isolation
    const userDrafts = serverDb.getUserAiDraftExams(testUserId);
    assert.ok(userDrafts.length >= 1);
    assert.ok(userDrafts.some(d => d.id === result.draft.id));

    // Verify draft is isolated from candidate MOCK_EXAM_SETS
    const staticIds = MOCK_EXAM_SETS.map(m => m.id);
    assert.equal(staticIds.includes(result.draft.id), false, 'Draft exam must NOT be present in candidate mock exam pool');

    // Check validation result
    console.log('Generation Status:', result.draft.status);
    console.log('Validation Status:', result.draft.validationStatus);
    console.log('Repair Attempts:', result.draft.repairAttempts);
    console.log('Validation Errors:', result.draft.validationFindings.errors);
    console.log('Token Usage:', result.draft.tokenUsage);

    assert.ok(['PENDING_REVIEW', 'APPROVED', 'VALIDATION_FAILED'].includes(result.draft.status));
    assert.ok(result.draft.content.passages.length === 3, 'Draft must contain 3 passages');
  });

});
