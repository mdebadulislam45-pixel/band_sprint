import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import 'dotenv/config';
import { validateListeningExam } from '../../server/ai/validationEngine.ts';
import { questionFactory } from '../../server/ai/questionFactory.ts';
import { serverDb } from '../../server/db.ts';
import { MOCK_EXAM_SETS } from '../../data/mockExams.ts';
import { audioManager } from '../../services/AudioManager.ts';

describe('Phase 5.5H.9B — Listening Question Factory Pilot & Audio Compatibility Test Suite', () => {

  test('1. Independent Validator correctly accepts a valid 4-section 40-question Listening draft', () => {
    const validDraft = {
      examId: 'test-listening-001',
      title: 'IELTS Practice Listening Examination Set 1',
      format: 'Academic',
      sections: [
        {
          sectionNumber: 1,
          title: 'Section 1: Rental Bike Booking Inquiry',
          script: 'Agent: "Good morning, City Bike Rentals. How may I assist you today?"\nCustomer: "Hello, I would like to inquire about hiring a hybrid bicycle for three days starting this Thursday."\nAgent: "Certainly. Our daily rental rate for a hybrid bike is fifteen pounds per day, which includes a helmet and lock."',
          speakers: [
            { speakerId: 'speaker_01', roleName: 'Agent', gender: 'male' },
            { speakerId: 'speaker_05', roleName: 'Customer', gender: 'female' }
          ],
          questions: Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            type: i < 6 ? 'form_completion' : 'note_completion',
            prompt: `Question ${i + 1} regarding bike rental booking (NO MORE THAN TWO WORDS).`,
            correctAnswer: 'fifteen pounds',
            explanation: `Explanation for question ${i + 1}`,
            scriptEvidence: 'rental rate for a hybrid bike is fifteen pounds per day'
          }))
        },
        {
          sectionNumber: 2,
          title: 'Section 2: Community Garden Orientation',
          script: 'Guide: "Welcome everyone to the Meadowbrook Community Garden orientation. My name is Sarah, and I am the head coordinator. Today I will outline our plots, compost guidelines, and opening hours. We operate Tuesday through Sunday from eight in the morning until six in the evening."',
          speakers: [
            { speakerId: 'speaker_02', roleName: 'Guide', gender: 'female' }
          ],
          questions: Array.from({ length: 10 }, (_, i) => ({
            id: i + 11,
            type: i < 5 ? 'multiple_choice' : 'matching',
            prompt: `Question ${i + 11} regarding garden orientation.`,
            options: ['A) Tuesday to Sunday', 'B) Monday to Friday', 'C) Weekends only', 'D) Daily'],
            correctAnswer: 'A',
            explanation: `Explanation for question ${i + 11}`,
            scriptEvidence: 'operate Tuesday through Sunday from eight in the morning'
          }))
        },
        {
          sectionNumber: 3,
          title: 'Section 3: Environmental Science Research Project Planning',
          script: 'Professor: "Good afternoon Marcus and Chloe. Let us review your proposal on urban microclimates."\nMarcus: "Thank you Professor Lawson. We plan to measure temperature differentials across five public parks."\nChloe: "We have calibrated our digital thermal sensors and selected three sampling times daily."',
          speakers: [
            { speakerId: 'speaker_03', roleName: 'Professor', gender: 'male' },
            { speakerId: 'speaker_15', roleName: 'Marcus', gender: 'male' },
            { speakerId: 'speaker_02', roleName: 'Chloe', gender: 'female' }
          ],
          questions: Array.from({ length: 10 }, (_, i) => ({
            id: i + 21,
            type: i < 5 ? 'sentence_completion' : 'multiple_choice',
            prompt: i < 5 ? `Question ${i + 21} (NO MORE THAN TWO WORDS).` : `Question ${i + 21}?`,
            options: i >= 5 ? ['A) Five parks', 'B) Ten parks', 'C) Two parks', 'D) One park'] : undefined,
            correctAnswer: i < 5 ? 'public parks' : 'A',
            explanation: `Explanation for question ${i + 21}`,
            passageEvidence: 'temperature differentials across five public parks',
            scriptEvidence: 'temperature differentials across five public parks'
          }))
        },
        {
          sectionNumber: 4,
          title: 'Section 4: History of Early Postal Communication',
          script: 'Lecturer: "In today\'s lecture on historical telecommunications, we examine the development of organized mail delivery systems. Long before electric telegraphy, ancient empires developed relay stations where horse-mounted couriers transmitted royal decrees across thousands of kilometers."',
          speakers: [
            { speakerId: 'speaker_04', roleName: 'Lecturer', gender: 'male' }
          ],
          questions: Array.from({ length: 10 }, (_, i) => ({
            id: i + 31,
            type: 'note_completion',
            prompt: `Question ${i + 31} (NO MORE THAN TWO WORDS).`,
            correctAnswer: 'horse-mounted couriers',
            explanation: `Explanation for question ${i + 31}`,
            scriptEvidence: 'relay stations where horse-mounted couriers transmitted royal decrees'
          }))
        }
      ]
    };

    const validation = validateListeningExam(validDraft);
    assert.equal(validation.passed, true, `Validation failed: ${validation.errors.join('; ')}`);
    assert.equal(validation.stats.passageCount, 4);
    assert.equal(validation.stats.totalQuestions, 40);
    assert.deepEqual(validation.stats.passageQuestions, [10, 10, 10, 10]);
  });

  test('2. Audio Parser Compatibility: Multi-speaker scripts parse into valid dialogue turns', () => {
    const sampleScript = `Agent: "Good morning, City Bike Rentals. How may I assist you today?"
Customer: "Hello, I would like to inquire about hiring a hybrid bicycle for three days."
Agent: "Certainly. Our daily rental rate is fifteen pounds per day."`;

    const turns = audioManager.parseMultiSpeakerScript(sampleScript);
    assert.ok(Array.isArray(turns));
    assert.ok(turns.length >= 3, `Expected at least 3 turns, found ${turns.length}`);
    assert.ok(turns.some(t => t.text.includes('City Bike Rentals')));
    assert.ok(turns.some(t => t.text.includes('fifteen pounds')));
  });

  test('3. Live Listening Pilot Generation with Gemini 3.8 & persistence isolation', async () => {
    const testUserId = `test_user_listening_${Date.now()}`;
    
    serverDb.saveUser({
      id: testUserId,
      email: 'listening_pilot@example.com',
      name: 'Listening Pilot Tester',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    console.log('--- Dispatching real Listening Pilot generation via questionFactory ---');
    const result = await questionFactory.generateListeningPilot({
      userId: testUserId,
      topicSeed: 'Marine Biology Research Expedition'
    });

    assert.ok(result.draft, 'Listening draft record created');
    assert.ok(result.draft.id.startsWith('draft_listening_'));
    assert.equal(result.draft.userId, testUserId);
    assert.equal(result.draft.examType, 'listening');

    // Verify DB persistence
    const userDrafts = serverDb.getUserAiDraftExams(testUserId);
    assert.ok(userDrafts.length >= 1);
    assert.ok(userDrafts.some(d => d.id === result.draft.id));

    // Verify draft isolation from candidate mock exam pool
    const staticIds = MOCK_EXAM_SETS.map(m => m.id);
    assert.equal(staticIds.includes(result.draft.id), false, 'Listening draft must NOT be present in published candidate mock pool');

    // Check status and structure
    console.log('Generation Status:', result.draft.status);
    console.log('Validation Status:', result.draft.validationStatus);
    console.log('Repair Attempts:', result.draft.repairAttempts);
    console.log('Validation Errors:', result.draft.validationFindings.errors);
    console.log('Token Usage:', result.draft.tokenUsage);

    assert.ok(['PENDING_REVIEW', 'APPROVED', 'VALIDATION_FAILED'].includes(result.draft.status));
    assert.equal(result.draft.content.sections.length, 4, 'Must contain 4 listening sections');

    // Audio parser compatibility test on generated Section 1 script
    const sec1Script = result.draft.content.sections[0].script;
    const parsedTurns = audioManager.parseMultiSpeakerScript(sec1Script);
    assert.ok(parsedTurns.length > 0, 'Generated Section 1 script must parse into valid dialogue turns');
  });

});
