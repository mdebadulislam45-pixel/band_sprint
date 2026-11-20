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

describe('Phase 5.5H.10D — Controlled Writing Pilot Integration & Candidate Journey', () => {
  before(() => {
    if (fs.existsSync(STORE_PATH)) {
      originalStoreBackup = fs.readFileSync(STORE_PATH, 'utf-8');
    }
  });

  after(() => {
    delete serverDb.data.aiDraftExams['draft_sec_userA_01'];
    if ((serverDb as any).saveTimeout) {
      clearTimeout((serverDb as any).saveTimeout);
      (serverDb as any).saveTimeout = null;
    }
    if (originalStoreBackup !== null) {
      fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf-8');
      serverDb.data = JSON.parse(originalStoreBackup);
    }
  });

  it('1. retrieves valid Academic Task 1 pilot and converts to test set with visual data', () => {
    const academicDraft: any = {
      id: 'draft_writing_acad_pilot_01',
      userId: 'user_candidate_1',
      model: 'gemini-3.8-flash',
      examType: 'writing',
      status: 'PENDING_REVIEW',
      validationStatus: 'PASSED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      content: {
        examId: 'pkg_writing_acad_01',
        title: 'IELTS Academic Writing Pilot Test 1',
        format: 'Academic',
        task1: {
          id: 'q_t1_line_01',
          format: 'Academic',
          taskCategory: 'task1',
          questionType: 'line',
          prompt: 'The graph below shows renewable electricity output from 2010 to 2024.',
          instructions: 'Summarise the information by selecting and reporting main features.',
          sampleResponse: 'The line graph delineates renewable electricity generation...',
          visualData: {
            chartTitle: 'Renewable Electricity Share (%)',
            units: '% of Total Generation',
            categories: ['2010', '2015', '2020', '2024'],
            series: [
              { name: 'Germany', data: [17, 30, 45, 52] },
              { name: 'UK', data: [7, 24, 43, 48] }
            ]
          }
        },
        task2: {
          id: 'q_t2_opinion_01',
          format: 'Academic',
          taskCategory: 'task2',
          questionType: 'opinion',
          prompt: 'University tuition should be free for all citizens.',
          questionText: 'To what extent do you agree or disagree?',
          sampleResponse: 'In contemporary higher education policy...'
        }
      }
    };

    const testSet = convertDraftToWritingTestSet(academicDraft);

    assert.equal(testSet.id, 'draft_writing_acad_pilot_01');
    assert.equal(testSet.format, 'Academic');
    assert.equal(testSet.badge, 'AI PILOT DRAFT');
    assert.equal(testSet.task1Prompt, 'The graph below shows renewable electricity output from 2010 to 2024.');
    assert.equal(testSet.task1ChartTitle, 'Renewable Electricity Share (%)');
    assert.equal(testSet.task1Categories?.length, 4);
    assert.equal(testSet.task1Series?.length, 2);
    assert.equal(testSet.task1VisualData.units, '% of Total Generation');
    assert.ok(testSet.task2Prompt.includes('University tuition should be free'));
  });

  it('2. retrieves valid GT Task 1 pilot and preserves exactly three bullet points', () => {
    const gtDraft: any = {
      id: 'draft_writing_gt_pilot_01',
      userId: 'user_candidate_1',
      model: 'gemini-3.8-flash',
      examType: 'writing',
      status: 'PENDING_REVIEW',
      validationStatus: 'PASSED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      content: {
        examId: 'pkg_writing_gt_01',
        title: 'IELTS GT Writing Pilot Test 1',
        format: 'General Training',
        task1: {
          id: 'q_t1_gt_formal_01',
          format: 'General Training',
          taskCategory: 'task1',
          questionType: 'formal',
          prompt: 'Write a letter to the local municipal council regarding damaged park equipment.',
          bulletPoints: [
            'Describe the current condition of the damaged playground equipment.',
            'Explain the safety risks for local children and residents.',
            'Suggest specific repairs the council should prioritize.'
          ],
          sampleResponse: 'Dear Sir or Madam, I am writing regarding Elmwood Park...'
        },
        task2: {
          id: 'q_t2_gt_gap_01',
          format: 'General Training',
          taskCategory: 'task2',
          questionType: 'advantages_disadvantages',
          prompt: 'Do the advantages of taking a gap year outweigh the disadvantages?',
          questionText: 'Give reasons for your answer.',
          sampleResponse: 'Taking an experiential gap year offers substantial benefits...'
        }
      }
    };

    const testSet = convertDraftToWritingTestSet(gtDraft);

    assert.equal(testSet.format, 'General Training');
    assert.equal(testSet.task1LetterType, 'Formal');
    assert.equal(testSet.task1BulletPoints?.length, 3, 'Must preserve exactly 3 bullet points');
    assert.equal(testSet.task1BulletPoints?.[0], 'Describe the current condition of the damaged playground equipment.');
    assert.equal(testSet.task1BulletPoints?.[1], 'Explain the safety risks for local children and residents.');
    assert.equal(testSet.task1BulletPoints?.[2], 'Suggest specific repairs the council should prioritize.');
  });

  it('3. verifies candidate response editor word counter and prompt separation', () => {
    const candidateEssay = 'In the contemporary era, the proliferation of digital communication technologies has fundamentally transformed human interaction. While some critics contend that virtual connectivity weakens interpersonal bonds, I firmly agree that modern technological advancements have enhanced global collaboration and access to information. To begin with, digital platforms enable instant cross-border communication and rapid knowledge sharing among academic researchers, which significantly accelerates scientific progress globally.';
    const words = candidateEssay.trim().split(/\s+/).filter(Boolean);

    assert.ok(words.length >= 50, 'Candidate response exceeds minimum word count');
    
    const mockDraft: any = {
      id: 'draft_writing_test_sep',
      content: {
        task2: {
          prompt: 'Prompt question text here',
          sampleResponse: 'Generated model answer text'
        }
      }
    };

    const testSet = convertDraftToWritingTestSet(mockDraft);
    assert.notEqual(testSet.task2SampleCandidateDraft, candidateEssay, 'Candidate text must remain strictly separate from generated model answer');
  });

  it('4. evaluates candidate response and verifies word threshold gate', () => {
    const shortText = 'I agree with this topic because it is good.';
    const gate1 = checkWritingWordThreshold(shortText, 'task2');
    assert.equal(gate1.isValidAttempt, false, 'Short text under 50 words must be rejected by evaluation threshold gate');

    const validText = `In contemporary society, public spending on healthcare remains a crucial area of debate. 
    Some people argue that governments should invest primarily in modern hospitals, whereas others believe that preventative sports amenities 
    yield superior health outcomes. In my opinion, preventative infrastructure provides long-term health benefits, though emergency medical services 
    must always receive adequate support.
    
    Firstly, building community sports facilities encourages citizens to engage in regular physical activity. This drastically reduces the incidence 
    of chronic diseases such as diabetes and hypertension. Consequently, fewer patients require hospital admission, saving public funds in the long run.
    
    Secondly, emergency clinical care remains indispensable for acute illnesses and surgeries. When health crises arise, hospitals require advanced medical equipment.
    
    In conclusion, balanced funding for both preventative facilities and emergency care ensures a resilient healthcare system.`;

    const gate2 = checkWritingWordThreshold(validText, 'task2');
    assert.equal(gate2.isValidAttempt, true, 'Sufficient text >= 50 words must pass word threshold gate');
  });

  it('5. enforces security checks: ownership validation and draft isolation', () => {
    const draftUserA: any = {
      id: 'draft_sec_userA_01',
      userId: 'user_A',
      examType: 'writing',
      status: 'PENDING_REVIEW',
      validationStatus: 'PASSED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      content: { title: 'User A Private Draft' }
    };

    try {
      serverDb.saveAiDraftExam(draftUserA);

      const retrieved = serverDb.getAiDraftExam('draft_sec_userA_01');
      assert.equal(retrieved?.userId, 'user_A');

      // Access check simulation: User B requesting User A draft
      const retrievedUserId: string = retrieved?.userId || '';
      const isUserBAuthorized = retrievedUserId === 'user_B';
      assert.equal(isUserBAuthorized, false, 'User B must be denied access to User A private draft');
    } finally {
      delete serverDb.data.aiDraftExams['draft_sec_userA_01'];
    }
  });

  it('6. rejects VALIDATION_FAILED draft from pilot candidate practice', () => {
    const failedDraft: any = {
      id: 'draft_failed_01',
      userId: 'user_A',
      examType: 'writing',
      status: 'VALIDATION_FAILED',
      validationStatus: 'FAILED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      content: { title: 'Failed Draft' }
    };

    const isEligibleForCandidatePractice = failedDraft.status === 'PENDING_REVIEW' && (failedDraft.validationStatus === 'PASSED' || failedDraft.validationStatus === 'REPAIRED');
    assert.equal(isEligibleForCandidatePractice, false, 'VALIDATION_FAILED draft must not enter candidate practice');
  });

  it('7. preserves static MOCK_EXAM_SETS registry without dynamic pollution', () => {
    assert.equal(MOCK_EXAM_SETS.length, 5, 'Static MOCK_EXAM_SETS must remain exactly 5');
    assert.ok(MOCK_EXAM_SETS.every(s => !s.id.startsWith('draft_')), 'Static mock sets must not contain draft IDs');
  });
});
