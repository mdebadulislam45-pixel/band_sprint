import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { validateWritingQuestion, validateWritingExam } from '../../server/ai/validationEngine';
import { convertAiDraftToWritingMockSet } from '../../server/ai/questionFactory';
import { serverDb } from '../../server/db';
import {
  WritingTask1AcademicQuestion,
  WritingTask1GeneralQuestion,
  WritingTask2Question,
  WritingExamPackage
} from '../../server/ai/schemas/writingSchema';

const STORE_PATH = path.resolve(process.cwd(), '.data', 'sprint_store.json');
let originalStoreBackup: string | null = null;

describe('Phase 5.5H.10B — Writing Factory Foundation & Independent Validation', () => {

  it('1. validates a valid Academic Task 1 line graph question', () => {
    const validLineGraph: WritingTask1AcademicQuestion = {
      id: 'q_t1_acad_line_01',
      schemaVersion: '1.0',
      format: 'Academic',
      taskCategory: 'task1',
      questionType: 'line',
      prompt: 'The graph below shows the percentage of electricity generated from renewable sources in three European countries between 2010 and 2024.',
      instructions: 'Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
      suggestedTimeMinutes: 20,
      minWordLimit: 150,
      validationStatus: 'PASSED',
      lifecycleStatus: 'PENDING_REVIEW',
      createdAt: Date.now(),
      visualData: {
        chartTitle: 'Renewable Electricity Generation Share (2010-2024)',
        units: '% of Total Generation',
        xAxisLabel: 'Year',
        yAxisLabel: 'Percentage (%)',
        categories: ['2010', '2015', '2020', '2024'],
        series: [
          { name: 'Germany', data: [17, 30, 45, 52] },
          { name: 'Spain', data: [33, 37, 44, 50] },
          { name: 'UK', data: [7, 24, 43, 48] }
        ]
      },
      keyFeaturesToReport: [
        'UK experienced the steepest increase from 7% in 2010 to 48% in 2024.',
        'Spain maintained the highest initial share at 33% in 2010.',
        'All three countries converged between 48% and 52% by 2024.'
      ]
    };

    const result = validateWritingQuestion(validLineGraph);
    assert.equal(result.passed, true, 'Valid line graph must pass validation');
    assert.equal(result.errors.length, 0);
  });

  it('2. validates bar, pie, table, map, process, and mixed visual data types', () => {
    // Bar Chart
    const barQ: WritingTask1AcademicQuestion = {
      id: 'q_t1_acad_bar_01',
      schemaVersion: '1.0',
      format: 'Academic',
      taskCategory: 'task1',
      questionType: 'bar',
      prompt: 'The chart shows average weekly hours spent on leisure by gender in 2023.',
      instructions: 'Summarise main features.',
      suggestedTimeMinutes: 20,
      minWordLimit: 150,
      validationStatus: 'PASSED',
      lifecycleStatus: 'PENDING_REVIEW',
      createdAt: Date.now(),
      visualData: {
        chartTitle: 'Weekly Leisure Hours by Gender',
        categories: ['Unemployed', 'Full-Time Employed', 'Retired'],
        series: [
          { name: 'Male', data: [84, 42, 80] },
          { name: 'Female', data: [78, 36, 76] }
        ]
      },
      keyFeaturesToReport: ['Unemployed males have highest leisure hours.']
    };
    assert.equal(validateWritingQuestion(barQ).passed, true);

    // Pie Chart
    const pieQ: WritingTask1AcademicQuestion = {
      id: 'q_t1_acad_pie_01',
      schemaVersion: '1.0',
      format: 'Academic',
      taskCategory: 'task1',
      questionType: 'pie',
      prompt: 'The pie charts compare household expenditure in 1990 and 2020.',
      instructions: 'Summarise main features.',
      suggestedTimeMinutes: 20,
      minWordLimit: 150,
      validationStatus: 'PASSED',
      lifecycleStatus: 'PENDING_REVIEW',
      createdAt: Date.now(),
      visualData: {
        chartTitle: 'Household Spending 1990 vs 2020',
        labels: ['Housing', 'Food', 'Transport', 'Other'],
        values: [35, 25, 20, 20]
      },
      keyFeaturesToReport: ['Housing was the largest expenditure item.']
    };
    assert.equal(validateWritingQuestion(pieQ).passed, true);

    // Table
    const tableQ: WritingTask1AcademicQuestion = {
      id: 'q_t1_acad_table_01',
      schemaVersion: '1.0',
      format: 'Academic',
      taskCategory: 'task1',
      questionType: 'table',
      prompt: 'The table compares rail network metrics across five countries.',
      instructions: 'Summarise main features.',
      suggestedTimeMinutes: 20,
      minWordLimit: 150,
      validationStatus: 'PASSED',
      lifecycleStatus: 'PENDING_REVIEW',
      createdAt: Date.now(),
      visualData: {
        chartTitle: 'National Rail System Metrics',
        tableHeaders: ['Country', 'Track Length (km)', 'Annual Passengers (m)'],
        tableRows: [
          ['Japan', '27000', '7500'],
          ['France', '29000', '1400']
        ]
      },
      keyFeaturesToReport: ['Japan has significantly higher passenger volume.']
    };
    assert.equal(validateWritingQuestion(tableQ).passed, true);

    // Map
    const mapQ: WritingTask1AcademicQuestion = {
      id: 'q_t1_acad_map_01',
      schemaVersion: '1.0',
      format: 'Academic',
      taskCategory: 'task1',
      questionType: 'map',
      prompt: 'The maps show development of Oakfield town center between 1995 and 2020.',
      instructions: 'Summarise main features.',
      suggestedTimeMinutes: 20,
      minWordLimit: 150,
      validationStatus: 'PASSED',
      lifecycleStatus: 'PENDING_REVIEW',
      createdAt: Date.now(),
      visualData: {
        chartTitle: 'Oakfield Town Center (1995 vs 2020)',
        pastYear: '1995',
        presentYear: '2020',
        mapFeatures: [
          { name: 'Central Car Park', pastState: 'Open grassland', presentState: 'Multi-story car park' },
          { name: 'Main Street', pastState: 'Two-way traffic', presentState: 'Pedestrianized mall' }
        ]
      },
      keyFeaturesToReport: ['Main street was fully pedestrianized.']
    };
    assert.equal(validateWritingQuestion(mapQ).passed, true);

    // Process
    const processQ: WritingTask1AcademicQuestion = {
      id: 'q_t1_acad_proc_01',
      schemaVersion: '1.0',
      format: 'Academic',
      taskCategory: 'task1',
      questionType: 'process',
      prompt: 'The diagram illustrates the glass bottle recycling process.',
      instructions: 'Summarise main features.',
      suggestedTimeMinutes: 20,
      minWordLimit: 150,
      validationStatus: 'PASSED',
      lifecycleStatus: 'PENDING_REVIEW',
      createdAt: Date.now(),
      visualData: {
        chartTitle: 'Glass Recycling Flow',
        processTitle: 'Recycling Lifecycle',
        processSteps: [
          { stepNumber: 1, title: 'Collection', description: 'Used glass bottles gathered from bins.' },
          { stepNumber: 2, title: 'Washing & Crushing', description: 'Glass cleaned and broken into cullet.' }
        ]
      },
      keyFeaturesToReport: ['Process consists of two main loops.']
    };
    assert.equal(validateWritingQuestion(processQ).passed, true);

    // Mixed
    const mixedQ: WritingTask1AcademicQuestion = {
      id: 'q_t1_acad_mixed_01',
      schemaVersion: '1.0',
      format: 'Academic',
      taskCategory: 'task1',
      questionType: 'mixed',
      prompt: 'The charts show energy consumption sources and greenhouse gas emissions.',
      instructions: 'Summarise main features.',
      suggestedTimeMinutes: 20,
      minWordLimit: 150,
      validationStatus: 'PASSED',
      lifecycleStatus: 'PENDING_REVIEW',
      createdAt: Date.now(),
      visualData: {
        chartTitle: 'Energy & Emissions Dual Overview',
        mixedComponents: [
          { type: 'bar', title: 'Energy Sources', categories: ['Coal', 'Solar'], series: [{ name: 'GW', data: [50, 20] }] },
          { type: 'pie', title: 'Emissions Share', labels: ['Power', 'Transport'], values: [60, 40] }
        ]
      },
      keyFeaturesToReport: ['Power generation accounts for majority emissions.']
    };
    assert.equal(validateWritingQuestion(mixedQ).passed, true);
  });

  it('3. rejects invalid or missing visual datasets in Academic Task 1', () => {
    // Missing visualData object
    const missingVd: any = {
      id: 'q_bad_01',
      schemaVersion: '1.0',
      format: 'Academic',
      taskCategory: 'task1',
      questionType: 'line',
      prompt: 'The graph shows data.',
      instructions: 'Summarise information.',
      suggestedTimeMinutes: 20,
      minWordLimit: 150
    };
    const res1 = validateWritingQuestion(missingVd);
    assert.equal(res1.passed, false);
    assert.ok(res1.errors.some(e => e.includes('visualData')));

    // Mismatched categories and series data length
    const mismatchedData: any = {
      id: 'q_bad_02',
      schemaVersion: '1.0',
      format: 'Academic',
      taskCategory: 'task1',
      questionType: 'bar',
      prompt: 'Bar chart prompt.',
      instructions: 'Summarise information.',
      visualData: {
        chartTitle: 'Test Bar',
        categories: ['A', 'B', 'C'], // 3 categories
        series: [{ name: 'Series 1', data: [10, 20] }] // only 2 data points
      }
    };
    const res2 = validateWritingQuestion(mismatchedData);
    assert.equal(res2.passed, false);
    assert.ok(res2.errors.some(e => e.includes('does not match categories count')));
  });

  it('4. validates GT formal, semi-formal, and informal letters', () => {
    const gtFormal: WritingTask1GeneralQuestion = {
      id: 'q_t1_gt_formal_01',
      schemaVersion: '1.0',
      format: 'General Training',
      taskCategory: 'task1',
      questionType: 'formal',
      scenarioCategory: 'complaint',
      situationContext: 'You recently stayed at a hotel and experienced significant noise disturbances.',
      recipient: 'Hotel Manager',
      writingPurpose: 'Complain about noise and request partial refund.',
      prompt: 'You recently stayed at a hotel and were dissatisfied with the service.',
      salutationInstruction: 'Dear Sir or Madam,',
      instructions: 'Write a letter to the hotel manager.',
      suggestedTimeMinutes: 20,
      minWordLimit: 150,
      validationStatus: 'PASSED',
      lifecycleStatus: 'PENDING_REVIEW',
      createdAt: Date.now(),
      bulletPoints: [
        'Give details of your stay and room number.',
        'Explain the nature of the noise problem.',
        'State what action you expect the manager to take.'
      ]
    };

    const res = validateWritingQuestion(gtFormal);
    assert.equal(res.passed, true, 'Valid GT formal letter must pass validation');
  });

  it('5. rejects GT letters with missing or extra bullet points', () => {
    const badGt: any = {
      id: 'q_t1_gt_bad_01',
      schemaVersion: '1.0',
      format: 'General Training',
      taskCategory: 'task1',
      questionType: 'formal',
      scenarioCategory: 'request',
      prompt: 'Write a letter.',
      salutationInstruction: 'Dear Sir,',
      bulletPoints: ['Point 1', 'Point 2'] // Only 2 bullet points instead of 3
    };

    const res = validateWritingQuestion(badGt);
    assert.equal(res.passed, false);
    assert.ok(res.errors.some(e => e.includes('EXACTLY 3 mandatory bullet points')));
  });

  it('6. validates all six Task 2 essay types', () => {
    const essayTypes: Array<WritingTask2Question['questionType']> = [
      'opinion',
      'discuss_both_views',
      'advantages_disadvantages',
      'problem_solution',
      'two_part',
      'positive_negative'
    ];

    essayTypes.forEach((eType, idx) => {
      const q: WritingTask2Question = {
        id: `q_t2_essay_${idx}`,
        schemaVersion: '1.0',
        format: 'Academic',
        taskCategory: 'task2',
        questionType: eType,
        topicCategory: 'technology',
        prompt: 'Some people believe that artificial intelligence will automate most jobs.',
        questionText: eType === 'opinion' ? 'To what extent do you agree or disagree?' : 'Discuss both views and give your opinion.',
        instructions: 'Give reasons for your answer and include any relevant examples from your own knowledge or experience.',
        suggestedTimeMinutes: 40,
        minWordLimit: 250,
        validationStatus: 'PASSED',
        lifecycleStatus: 'PENDING_REVIEW',
        createdAt: Date.now(),
        keyArgumentsToConsider: {
          sideA: ['AI increases productivity and eliminates tedious labor.'],
          sideB: ['AI causes technological unemployment and reduces human agency.']
        }
      };

      const res = validateWritingQuestion(q);
      assert.equal(res.passed, true, `Task 2 essay type ${eType} must pass validation`);
    });
  });

  it('7. rejects Task 2 question with missing questionText', () => {
    const badT2: any = {
      id: 'q_t2_bad_01',
      schemaVersion: '1.0',
      format: 'Academic',
      taskCategory: 'task2',
      questionType: 'opinion',
      topicCategory: 'education',
      prompt: 'University education should be free.',
      instructions: 'Write an essay.'
      // Missing questionText
    };

    const res = validateWritingQuestion(badT2);
    assert.equal(res.passed, false);
    assert.ok(res.errors.some(e => e.includes('questionText is missing')));
  });

  it('8. validates complete WritingExamPackage and detects duplicate IDs or format mismatch', () => {
    const validPackage: WritingExamPackage = {
      examId: 'pkg_writing_acad_01',
      schemaVersion: '1.0',
      title: 'IELTS Academic Writing Practice Test 1',
      format: 'Academic',
      createdAt: Date.now(),
      task1: {
        id: 'q_t1_acad_line_01',
        schemaVersion: '1.0',
        format: 'Academic',
        taskCategory: 'task1',
        questionType: 'line',
        prompt: 'Line graph prompt.',
        instructions: 'Summarise main features.',
        suggestedTimeMinutes: 20,
        minWordLimit: 150,
        validationStatus: 'PASSED',
        lifecycleStatus: 'PENDING_REVIEW',
        createdAt: Date.now(),
        visualData: {
          chartTitle: 'Energy Share',
          categories: ['2010', '2020'],
          series: [{ name: 'Solar', data: [10, 30] }]
        },
        keyFeaturesToReport: ['Solar energy tripled.']
      },
      task2: {
        id: 'q_t2_acad_essay_01',
        schemaVersion: '1.0',
        format: 'Academic',
        taskCategory: 'task2',
        questionType: 'opinion',
        topicCategory: 'environment',
        prompt: 'Governments should tax carbon emissions.',
        questionText: 'To what extent do you agree or disagree?',
        instructions: 'Write an essay.',
        suggestedTimeMinutes: 40,
        minWordLimit: 250,
        validationStatus: 'PASSED',
        lifecycleStatus: 'PENDING_REVIEW',
        createdAt: Date.now(),
        keyArgumentsToConsider: { sideA: ['Taxation incentivizes green transition.'], sideB: ['Taxes increase consumer energy costs.'] }
      }
    };

    const res = validateWritingExam(validPackage);
    assert.equal(res.passed, true, 'Valid exam package must pass validation');

    // Duplicate ID test
    const dupPkg: any = {
      ...validPackage,
      task2: { ...validPackage.task2, id: 'q_t1_acad_line_01' } // Duplicate ID
    };
    const dupRes = validateWritingExam(dupPkg);
    assert.equal(dupRes.passed, false);
    assert.ok(dupRes.errors.some(e => e.includes('Duplicate Question ID')));
  });

  it('9. handles optional model answers gracefully', () => {
    const qWithModelAnswer: WritingTask2Question = {
      id: 'q_t2_model_01',
      schemaVersion: '1.0',
      format: 'Academic',
      taskCategory: 'task2',
      questionType: 'opinion',
      topicCategory: 'technology',
      prompt: 'Technology alters communication.',
      questionText: 'Do you agree or disagree?',
      instructions: 'Write an essay.',
      suggestedTimeMinutes: 40,
      minWordLimit: 250,
      validationStatus: 'PASSED',
      lifecycleStatus: 'PENDING_REVIEW',
      createdAt: Date.now(),
      keyArgumentsToConsider: { sideA: ['Connects global peers.'], sideB: ['Erodes face-to-face rapport.'] },
      sampleModelAnswerBand9: 'In the contemporary era, the proliferation of digital communication technologies has fundamentally transformed human interaction. While some critics contend that virtual connectivity weakens interpersonal bonds, I firmly agree that modern technological advancements have enhanced global collaboration and access to information. To begin with, digital platforms enable instant cross-border communication...', // >250 words model answer
      modelAnswerDisclaimer: 'Optional AI-generated exemplar essay for reference only. Diagnostic model answer, not an official IELTS test response.'
    };

    const res = validateWritingQuestion(qWithModelAnswer);
    assert.equal(res.passed, true, 'Question with optional model answer must pass validation');
  });
});

describe('Phase 5.5H.10C — Writing Factory Generation, Draft Persistence & Adapter Integration', () => {
  before(() => {
    if (fs.existsSync(STORE_PATH)) {
      originalStoreBackup = fs.readFileSync(STORE_PATH, 'utf-8');
    }
  });

  after(() => {
    delete serverDb.data.aiDraftExams['draft_writing_userA_01'];
    delete serverDb.data.aiDraftExams['draft_writing_userB_01'];
    if ((serverDb as any).saveTimeout) {
      clearTimeout((serverDb as any).saveTimeout);
      (serverDb as any).saveTimeout = null;
    }
    if (originalStoreBackup !== null) {
      fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf-8');
      serverDb.data = JSON.parse(originalStoreBackup);
    }
  });

  it('10. converts a valid Writing AIDraftExam into a standard MockExamSet', () => {
    const mockDraft: any = {
      id: 'draft_writing_12345_abc',
      userId: 'user_test_1',
      model: 'gemini-3.8-flash',
      examType: 'writing',
      status: 'PENDING_REVIEW',
      validationStatus: 'PASSED',
      repairAttempts: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      content: {
        examId: 'pkg_writing_acad_01',
        title: 'IELTS Academic Writing Practice Test 1',
        format: 'Academic',
        task1: {
          id: 'q_t1_01',
          task1Type: 'chart',
          prompt: 'The chart shows renewable energy generation.',
          sampleResponse: 'The bar chart illustrates renewable energy shares...'
        },
        task2: {
          id: 'q_t2_01',
          essayType: 'opinion',
          prompt: 'Governments should invest in public transportation.',
          sampleResponse: 'Public transit investment provides significant urban benefits...'
        }
      }
    };

    const examSet = convertAiDraftToWritingMockSet(mockDraft);

    assert.equal(examSet.id, 'draft_writing_12345_abc');
    assert.equal(examSet.title, 'IELTS Academic Writing Practice Test 1');
    assert.equal(examSet.badge, 'AI PILOT');
    assert.equal(examSet.format, 'Academic');
    assert.equal(examSet.task1Type, 'chart');
    assert.equal(examSet.task1Prompt, 'The chart shows renewable energy generation.');
    assert.equal(examSet.writingPrompt, 'Governments should invest in public transportation.');
    assert.equal(examSet.modelEssay, 'Public transit investment provides significant urban benefits...');
    assert.deepEqual(examSet.questions, []);
  });

  it('11. verifies draft exam persistence and user ownership filtering', () => {
    const draft1: any = {
      id: 'draft_writing_userA_01',
      userId: 'user_A',
      examType: 'writing',
      status: 'PENDING_REVIEW',
      validationStatus: 'PASSED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      content: { title: 'User A Writing Draft' }
    };

    const draft2: any = {
      id: 'draft_writing_userB_01',
      userId: 'user_B',
      examType: 'writing',
      status: 'PENDING_REVIEW',
      validationStatus: 'PASSED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      content: { title: 'User B Writing Draft' }
    };

    try {
      serverDb.saveAiDraftExam(draft1);
      serverDb.saveAiDraftExam(draft2);

      const fetchedA = serverDb.getAiDraftExam('draft_writing_userA_01');
      assert.equal(fetchedA?.id, 'draft_writing_userA_01');
      assert.equal(fetchedA?.userId, 'user_A');

      const userADrafts = serverDb.getUserAiDraftExams('user_A').filter((d: any) => d.examType === 'writing');
      assert.ok(userADrafts.some((d: any) => d.id === 'draft_writing_userA_01'));
      assert.ok(!userADrafts.some((d: any) => d.id === 'draft_writing_userB_01'), 'User A must not see User B draft');
    } finally {
      delete serverDb.data.aiDraftExams['draft_writing_userA_01'];
      delete serverDb.data.aiDraftExams['draft_writing_userB_01'];
    }
  });

  it('12. simulates targeted repair loop behavior when validation fails initially', () => {
    const invalidExamPayload: any = {
      examId: 'pkg_writing_invalid',
      title: 'Invalid Exam Package',
      format: 'Academic',
      task1: {
        id: 'q_t1_bad',
        format: 'Academic',
        taskCategory: 'task1',
        questionType: 'line',
        prompt: 'Invalid prompt missing visualData',
        instructions: 'Summarise'
        // missing visualData
      },
      task2: {
        id: 'q_t2_bad',
        format: 'Academic',
        taskCategory: 'task2',
        questionType: 'opinion',
        prompt: 'Some prompt',
        // missing questionText
        instructions: 'Write essay'
      }
    };

    const initialValidation = validateWritingExam(invalidExamPayload);
    assert.equal(initialValidation.passed, false);
    assert.ok(initialValidation.errors.length >= 2, 'Initial invalid payload must produce multiple validation errors');

    // Repaired payload
    const repairedExamPayload: WritingExamPackage = {
      examId: 'pkg_writing_repaired',
      schemaVersion: '1.0',
      title: 'Repaired Exam Package',
      format: 'Academic',
      createdAt: Date.now(),
      task1: {
        id: 'q_t1_fixed',
        schemaVersion: '1.0',
        format: 'Academic',
        taskCategory: 'task1',
        questionType: 'line',
        prompt: 'Fixed line graph prompt.',
        instructions: 'Summarise main features.',
        suggestedTimeMinutes: 20,
        minWordLimit: 150,
        validationStatus: 'PASSED',
        lifecycleStatus: 'PENDING_REVIEW',
        createdAt: Date.now(),
        visualData: {
          chartTitle: 'Fixed Chart',
          categories: ['2020', '2025'],
          series: [{ name: 'Data', data: [10, 20] }]
        },
        keyFeaturesToReport: ['Data doubled over period.']
      },
      task2: {
        id: 'q_t2_fixed',
        schemaVersion: '1.0',
        format: 'Academic',
        taskCategory: 'task2',
        questionType: 'opinion',
        topicCategory: 'technology',
        prompt: 'Fixed opinion prompt.',
        questionText: 'Do you agree or disagree?',
        instructions: 'Write an essay.',
        suggestedTimeMinutes: 40,
        minWordLimit: 250,
        validationStatus: 'PASSED',
        lifecycleStatus: 'PENDING_REVIEW',
        createdAt: Date.now(),
        keyArgumentsToConsider: { sideA: ['Argument 1'], sideB: ['Argument 2'] }
      }
    };

    const repairedValidation = validateWritingExam(repairedExamPayload);
    assert.equal(repairedValidation.passed, true, 'Repaired payload must pass validation');
    assert.equal(repairedValidation.errors.length, 0);
  });
});

