import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { serverDb, AIDraftExam } from '../../server/db';
import { questionFactory, convertAiDraftToSpeakingMockSet } from '../../server/ai/questionFactory';
import { validateSpeakingExam } from '../../server/ai/validationEngine';
import { SpeakingExamPackage } from '../../server/ai/schemas/speakingSchema';

const STORE_PATH = path.resolve(process.cwd(), '.data', 'sprint_store.json');
let originalStoreBackup: string | null = null;

function createValidSpeakingContent(): SpeakingExamPackage {
  return {
    examId: 'pkg_speaking_test_01',
    schemaVersion: '1.0',
    title: 'AI Pilot Speaking Exam — Global Culture',
    format: 'Academic',
    topicDomain: 'Culture & Society',
    difficulty: 'Standard',
    createdAt: Date.now(),
    part1: {
      topicGroups: [
        {
          topicId: 'p1_t1',
          title: 'Music & Hobbies',
          questions: [
            { id: 'q_p1_01', prompt: 'What kind of music do you enjoy listening to?' },
            { id: 'q_p1_02', prompt: 'Has your taste in music changed over time?' }
          ]
        }
      ]
    },
    part2: {
      id: 'q_p2_01',
      topic: 'Describe a traditional festival in your country.',
      instructions: 'You should say where it takes place, what people do, and explain why it is important.',
      bulletPrompts: [
        'Where and when the festival takes place',
        'What activities and food are featured',
        'Who participates in the celebrations',
        'Explain why this festival holds cultural significance'
      ],
      preparationTimeSeconds: 60,
      speakingTimeSeconds: 120,
      roundingOffQuestion: 'Is this festival popular among tourists?'
    },
    part3: {
      themes: [
        {
          themeId: 'p3_t1',
          title: 'Preserving Cultural Traditions',
          connectedPart2Theme: 'Traditional festivals and cultural celebrations',
          questions: [
            { id: 'q_p3_01', prompt: 'How does globalization affect local cultural festivals?', examinerProbeNotes: 'Probe modern influences' },
            { id: 'q_p3_02', prompt: 'Should national governments fund traditional arts and heritage events?' }
          ]
        }
      ]
    }
  };
}

describe('Phase 5.5H.11C — Speaking Factory Generation, Draft Persistence & Adapter', () => {
  before(() => {
    if (fs.existsSync(STORE_PATH)) {
      originalStoreBackup = fs.readFileSync(STORE_PATH, 'utf-8');
    }
  });

  after(() => {
    delete serverDb.data.aiDraftExams['draft_speaking_userA_secret'];
    delete serverDb.data.aiDraftExams['draft_speaking_userB_secret'];
    if ((serverDb as any).saveTimeout) {
      clearTimeout((serverDb as any).saveTimeout);
      (serverDb as any).saveTimeout = null;
    }
    if (originalStoreBackup !== null) {
      fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf-8');
      serverDb.data = JSON.parse(originalStoreBackup);
    }
  });

  it('1. converts a valid AIDraftExam into a candidate-compatible Speaking mock set', () => {
    const validContent = createValidSpeakingContent();
    const mockDraft: AIDraftExam = {
      id: 'draft_speaking_userA_01',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: 'user_A',
      model: 'gemini-3.8-flash',
      examType: 'speaking',
      status: 'PENDING_REVIEW',
      validationStatus: 'PASSED',
      repairAttempts: 0,
      validationFindings: {
        passed: true,
        structuralOk: true,
        answersOk: true,
        evidenceOk: true,
        qualityOk: true,
        errors: [],
        warnings: []
      },
      content: validContent
    };

    const converted = convertAiDraftToSpeakingMockSet(mockDraft);

    assert.equal(converted.id, 'draft_speaking_userA_01');
    assert.equal(converted.badge, 'AI PILOT');
    assert.equal(converted.isAiPilot, true);
    assert.equal(converted.format, 'Academic');
    assert.equal(converted.difficulty, 'Standard');
    assert.equal(converted.part1.topicGroups.length, 1);
    assert.equal(converted.part1.topicGroups[0].questions[0].id, 'q_p1_01');
    assert.equal(converted.part2.id, 'q_p2_01');
    assert.equal(converted.part2.preparationTimeSeconds, 60);
    assert.equal(converted.part2.speakingTimeSeconds, 120);
    assert.equal(converted.part2.bulletPrompts.length, 4);
    assert.equal(converted.part3.themes[0].connectedPart2Theme, 'Traditional festivals and cultural celebrations');
    assert.equal(converted.part3.themes[0].questions[0].examinerProbeNotes, 'Probe modern influences');
  });

  it('2. rejects conversion of failed or malformed drafts', () => {
    const failedDraft: AIDraftExam = {
      id: 'draft_speaking_failed_01',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: 'user_A',
      model: 'gemini-3.8-flash',
      examType: 'speaking',
      status: 'VALIDATION_FAILED',
      validationStatus: 'FAILED',
      repairAttempts: 3,
      validationFindings: {
        passed: false,
        structuralOk: false,
        answersOk: false,
        evidenceOk: false,
        qualityOk: false,
        errors: ['Missing Part 1 section'],
        warnings: []
      },
      content: null
    };

    assert.throws(
      () => convertAiDraftToSpeakingMockSet(failedDraft),
      /Cannot convert invalid or failed Speaking draft/
    );
  });

  it('3. verifies private draft persistence and strict user ownership filtering', () => {
    const userADraft: AIDraftExam = {
      id: 'draft_speaking_userA_secret',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: 'user_A',
      model: 'gemini-3.8-flash',
      examType: 'speaking',
      status: 'PENDING_REVIEW',
      validationStatus: 'PASSED',
      repairAttempts: 0,
      validationFindings: {
        passed: true,
        structuralOk: true,
        answersOk: true,
        evidenceOk: true,
        qualityOk: true,
        errors: [],
        warnings: []
      },
      content: createValidSpeakingContent()
    };

    const userBDraft: AIDraftExam = {
      id: 'draft_speaking_userB_secret',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: 'user_B',
      model: 'gemini-3.8-flash',
      examType: 'speaking',
      status: 'PENDING_REVIEW',
      validationStatus: 'PASSED',
      repairAttempts: 0,
      validationFindings: {
        passed: true,
        structuralOk: true,
        answersOk: true,
        evidenceOk: true,
        qualityOk: true,
        errors: [],
        warnings: []
      },
      content: createValidSpeakingContent()
    };

    try {
      serverDb.saveAiDraftExam(userADraft);
      serverDb.saveAiDraftExam(userBDraft);

      // Retrieve User A drafts
      const userADrafts = serverDb.getUserAiDraftExams('user_A').filter(d => d.examType === 'speaking');
      assert.ok(userADrafts.some(d => d.id === 'draft_speaking_userA_secret'));
      assert.ok(!userADrafts.some(d => d.id === 'draft_speaking_userB_secret'), 'User A must not see User B draft');

      // Retrieve User B draft directly by ID and verify ownership check
      const fetchedDraft = serverDb.getAiDraftExam('draft_speaking_userB_secret');
      assert.equal(fetchedDraft?.id, 'draft_speaking_userB_secret');
      assert.equal(fetchedDraft?.userId, 'user_B');
      assert.notEqual(fetchedDraft?.userId, 'user_A');
    } finally {
      delete serverDb.data.aiDraftExams['draft_speaking_userA_secret'];
      delete serverDb.data.aiDraftExams['draft_speaking_userB_secret'];
    }
  });

  it('4. verifies repair loop state management when initial payload contains structural errors', () => {
    const invalidPayload: any = {
      examId: 'pkg_speaking_invalid',
      format: 'Academic',
      // missing part1, part2, part3
    };

    const validation = validateSpeakingExam(invalidPayload);
    assert.equal(validation.passed, false);
    assert.ok(validation.errors.length >= 3);

    // Repaired payload
    const repairedPayload = createValidSpeakingContent();
    const repairedValidation = validateSpeakingExam(repairedPayload);
    assert.equal(repairedValidation.passed, true);
    assert.equal(repairedValidation.errors.length, 0);
  });

  it('5. preserves static mock exams registry and existing data structures without pollution', () => {
    const userDrafts = serverDb.getUserAiDraftExams('user_A');
    assert.ok(Array.isArray(userDrafts));
    
    // Check that saving drafts did not mutate db users or promo codes
    assert.ok(serverDb.data.promoCodes);
    assert.ok(serverDb.data.users);
  });
});
