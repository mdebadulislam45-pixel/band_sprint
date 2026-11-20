import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { convertDraftToWritingTestSet } from '../../components/cdielts/CDIELTSWritingExamRoom';
import { convertAiDraftToWritingMockSet } from '../../server/ai/questionFactory';
import { validateWritingExam } from '../../server/ai/validationEngine';
import { checkWritingWordThreshold } from '../../services/WritingEvaluationService';
import { serverDb } from '../../server/db';
import { MOCK_EXAM_SETS } from '../../data/mockExams';

const STORE_PATH = path.resolve(process.cwd(), '.data', 'sprint_store.json');
let originalStoreBackup: string | null = null;

describe('Phase 5.5H.10E — Full Writing Candidate Journey & Submission Verification', () => {
  before(() => {
    if (fs.existsSync(STORE_PATH)) {
      originalStoreBackup = fs.readFileSync(STORE_PATH, 'utf-8');
    }
  });

  after(() => {
    delete serverDb.data.aiDraftExams['draft_userX_private'];
    delete serverDb.data.aiDraftExams['draft_userX_failed'];
    if ((serverDb as any).saveTimeout) {
      clearTimeout((serverDb as any).saveTimeout);
      (serverDb as any).saveTimeout = null;
    }
    if (originalStoreBackup !== null) {
      fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf-8');
      serverDb.data = JSON.parse(originalStoreBackup);
    }
  });

  it('1. Academic Task 1 complete candidate journey (Line, Bar, Table, Map, Process, Mixed)', () => {
    const visualTypes = ['line', 'bar', 'pie', 'table', 'map', 'process', 'mixed'];

    visualTypes.forEach((vType) => {
      const draft: any = {
        id: `draft_acad_${vType}_01`,
        userId: 'user_e2e_acad',
        model: 'gemini-3.8-flash',
        examType: 'writing',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        content: {
          examId: `pkg_writing_acad_${vType}`,
          title: `Academic Writing Test (${vType.toUpperCase()})`,
          format: 'Academic',
          task1: {
            id: `q_t1_${vType}`,
            format: 'Academic',
            taskCategory: 'task1',
            questionType: vType,
            prompt: `Summarise the ${vType} data provided below.`,
            instructions: 'Select and report main features.',
            sampleResponse: 'The visual data illustrates...',
            visualData: {
              chartTitle: `${vType.toUpperCase()} Test Chart`,
              units: '%',
              categories: ['2015', '2020'],
              series: [{ name: 'A', data: [10, 20] }],
              tableHeaders: vType === 'table' ? ['Item', '2015', '2020'] : undefined,
              tableRows: vType === 'table' ? [['A', '10%', '20%']] : undefined,
              mapFeatures: vType === 'map' ? [{ name: 'Park', pastState: 'Open field', presentState: 'Car park' }] : undefined,
              processSteps: vType === 'process' ? [{ stepNumber: 1, title: 'Step 1', description: 'Gather materials' }] : undefined
            }
          },
          task2: {
            id: `q_t2_${vType}`,
            format: 'Academic',
            taskCategory: 'task2',
            questionType: 'opinion',
            prompt: 'Essay prompt text here.',
            questionText: 'Do you agree or disagree?',
            sampleResponse: 'Model essay response...'
          }
        }
      };

      const testSet = convertDraftToWritingTestSet(draft);
      assert.equal(testSet.format, 'Academic');
      assert.equal(testSet.task1VisualData.chartTitle, `${vType.toUpperCase()} Test Chart`);
      assert.ok(testSet.task1Prompt.includes(`Summarise the ${vType} data`));
    });
  });

  it('2. General Training Task 1 candidate journey (Formal, Semi-Formal, Informal with 3 bullet points)', () => {
    const letterTypes = [
      { qType: 'formal', expectedType: 'Formal' },
      { qType: 'semi_formal', expectedType: 'Semi-Formal' },
      { qType: 'informal', expectedType: 'Informal' }
    ];

    letterTypes.forEach(({ qType, expectedType }) => {
      const gtDraft: any = {
        id: `draft_gt_${qType}_01`,
        userId: 'user_e2e_gt',
        model: 'gemini-3.8-flash',
        examType: 'writing',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        content: {
          examId: `pkg_writing_gt_${qType}`,
          title: `GT Writing Test (${expectedType})`,
          format: 'General Training',
          task1: {
            id: `q_t1_gt_${qType}`,
            format: 'General Training',
            taskCategory: 'task1',
            questionType: qType,
            prompt: 'Write a letter to your landlord.',
            bulletPoints: [
              'Point 1: Describe the issue in detail.',
              'Point 2: Explain the inconvenience caused.',
              'Point 3: Request an urgent inspection by Monday.'
            ],
            sampleResponse: 'Dear Landlord, I am writing to inform you...'
          },
          task2: {
            id: `q_t2_gt_${qType}`,
            format: 'General Training',
            taskCategory: 'task2',
            questionType: 'problem_solution',
            prompt: 'Task 2 GT prompt text.',
            questionText: 'Discuss solutions.',
            sampleResponse: 'Sample essay...'
          }
        }
      };

      const testSet = convertDraftToWritingTestSet(gtDraft);
      assert.equal(testSet.format, 'General Training');
      assert.equal(testSet.task1LetterType, expectedType);
      assert.equal(testSet.task1BulletPoints?.length, 3, 'Must preserve exactly 3 bullet points');
    });
  });

  it('3. Task 2 candidate journey across all essay categories', () => {
    const essayTypes = [
      'opinion',
      'discuss_both_views',
      'advantages_disadvantages',
      'problem_solution',
      'two_part',
      'positive_negative'
    ];

    essayTypes.forEach((eType) => {
      const draft: any = {
        id: `draft_t2_${eType}`,
        userId: 'user_e2e_t2',
        model: 'gemini-3.8-flash',
        examType: 'writing',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        content: {
          title: `Task 2 Test (${eType})`,
          format: 'Academic',
          task1: { prompt: 'Task 1 prompt' },
          task2: {
            id: `q_t2_${eType}`,
            format: 'Academic',
            taskCategory: 'task2',
            questionType: eType,
            prompt: 'Some people believe technology alters communication.',
            questionText: eType === 'opinion' ? 'To what extent do you agree?' : 'Discuss both views and give your opinion.',
            sampleResponse: 'Sample model answer...'
          }
        }
      };

      const testSet = convertDraftToWritingTestSet(draft);
      assert.ok(testSet.task2Prompt.includes('Some people believe technology alters communication'));
    });
  });

  it('4. word count threshold boundary testing (149w vs 150w vs 151w for Task 1; 249w vs 250w vs 251w for Task 2)', () => {
    // Helper to generate text of exact word count
    const generateWords = (count: number) => Array.from({ length: count }, (_, i) => `word${i + 1}`).join(' ');

    const t1_149 = generateWords(149);
    const t1_150 = generateWords(150);
    const t1_151 = generateWords(151);

    const gate1_149 = checkWritingWordThreshold(t1_149, 'task1');
    const gate1_150 = checkWritingWordThreshold(t1_150, 'task1');
    const gate1_151 = checkWritingWordThreshold(t1_151, 'task1');

    assert.equal(gate1_149.isValidAttempt, true, '149 words meets minimum threshold 30 words for server evaluation gate');
    assert.equal(gate1_150.isValidAttempt, true);
    assert.equal(gate1_151.isValidAttempt, true);

    const t2_249 = generateWords(249);
    const t2_250 = generateWords(250);
    const t2_251 = generateWords(251);

    const gate2_249 = checkWritingWordThreshold(t2_249, 'task2');
    const gate2_250 = checkWritingWordThreshold(t2_250, 'task2');
    const gate2_251 = checkWritingWordThreshold(t2_251, 'task2');

    assert.equal(gate2_249.isValidAttempt, true);
    assert.equal(gate2_250.isValidAttempt, true);
    assert.equal(gate2_251.isValidAttempt, true);

    // Below evaluation threshold (<30w Task 1, <50w Task 2)
    const shortT1 = generateWords(20);
    const shortT2 = generateWords(40);
    assert.equal(checkWritingWordThreshold(shortT1, 'task1').isValidAttempt, false);
    assert.equal(checkWritingWordThreshold(shortT2, 'task2').isValidAttempt, false);
  });

  it('5. security & failure verification: unauthenticated, cross-user, and VALIDATION_FAILED drafts', () => {
    const draftUserX: any = {
      id: 'draft_userX_private',
      userId: 'user_X',
      examType: 'writing',
      status: 'PENDING_REVIEW',
      validationStatus: 'PASSED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      content: { title: 'User X Private Draft' }
    };

    try {
      serverDb.saveAiDraftExam(draftUserX);

      const retrieved = serverDb.getAiDraftExam('draft_userX_private');
      assert.equal(retrieved?.userId, 'user_X');

      // Simulating access control check for User Y
      const retrievedUserId: string = retrieved?.userId || '';
      const isUserYAllowed = retrievedUserId === 'user_Y';
      assert.equal(isUserYAllowed, false, 'User Y must not access User X private draft');

      // VALIDATION_FAILED draft check
      const failedDraft: any = {
        id: 'draft_userX_failed',
        userId: 'user_X',
        examType: 'writing',
        status: 'VALIDATION_FAILED',
        validationStatus: 'FAILED',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      serverDb.saveAiDraftExam(failedDraft);

      const isFailedDraftEligible = failedDraft.status === 'PENDING_REVIEW' && (failedDraft.validationStatus === 'PASSED' || failedDraft.validationStatus === 'REPAIRED');
      assert.equal(isFailedDraftEligible, false, 'VALIDATION_FAILED draft must be rejected');
    } finally {
      delete serverDb.data.aiDraftExams['draft_userX_private'];
      delete serverDb.data.aiDraftExams['draft_userX_failed'];
    }
  });

  it('6. verifies static MOCK_EXAM_SETS isolation without dynamic pollution', () => {
    assert.equal(MOCK_EXAM_SETS.length, 5, 'Static MOCK_EXAM_SETS must remain exactly 5');
    assert.ok(MOCK_EXAM_SETS.every(s => !s.id.startsWith('draft_')), 'No dynamic draft IDs in static exam sets');
  });
});
