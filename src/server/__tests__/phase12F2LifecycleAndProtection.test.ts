import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import {
  app,
  handleGenerateReading,
  handleGenerateListening,
  handleGenerateWriting,
  handleGenerateSpeaking,
  handleListReadingDrafts,
  handleListListeningDrafts,
  handleListWritingDrafts,
  handleListSpeakingDrafts,
  handleGetReadingDraftById,
  handleGetListeningDraftById,
  handleGetWritingDraftById,
  handleGetSpeakingDraftById,
  handleRevalidateReadingDraft,
  handleRevalidateListeningDraft,
  handleRevalidateWritingDraft,
  handleRevalidateSpeakingDraft,
  handleGetReadingPilot,
  handleGetListeningPilot,
  handleGetWritingPilot,
  handleGetSpeakingPilot,
  factoryGenerationRateLimitMap,
  FACTORY_GENERATION_RATE_LIMIT
} from '../../../server';
import { serverDb, type AIDraftExam } from '../../server/db';
import {
  questionFactory,
  verifyCandidatePilotDraftEligibility,
  inFlightFactoryGenerations,
  buildFactoryGenerationDedupeKey
} from '../../server/ai/questionFactory';
import { analyticsService } from '../../server/analytics';
import { checkUserEntitlement } from '../../server/billing';

const STORE_PATH = path.resolve(process.cwd(), '.data', 'sprint_store.json');
let originalStoreBackup: string | null = null;

function createMockReqRes(options: {
  token?: string;
  params?: Record<string, string>;
  body?: Record<string, any>;
  query?: Record<string, string>;
}) {
  const req: any = {
    headers: options.token ? { authorization: `Bearer ${options.token}` } : {},
    params: options.params || {},
    body: options.body || {},
    query: options.query || {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' }
  };
  let statusCode = 200;
  let jsonBody: any = null;
  const res: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: any) {
      jsonBody = payload;
      return this;
    },
    getStatusCode: () => statusCode,
    getBody: () => jsonBody
  };
  return { req, res };
}

function createValidReadingContent() {
  const makePassage = (pNum: number) => ({
    passageNumber: pNum,
    title: `Academic Reading Passage ${pNum}`,
    topicDomain: 'Science & Technology',
    text: Array.from(
      { length: 90 },
      (_, idx) =>
        `Paragraph ${(idx % 6) + 1} sentence ${idx + 1} discusses empirical research findings in passage ${pNum} with verifiable evidence markers for question matching.`
    ).join(' '),
    wordCount: 950,
    questionGroups: [
      {
        groupId: `g_p${pNum}_1`,
        questionType: 'true_false_not_given',
        instructions: 'Do the following statements agree with the information given in the reading passage?',
        questionRangeStart: pNum === 1 ? 1 : pNum === 2 ? 14 : 27,
        questionRangeEnd: pNum === 1 ? 13 : pNum === 2 ? 26 : 40,
        questions: Array.from({ length: pNum === 3 ? 14 : 13 }, (_, qIdx) => {
          const qNum = (pNum === 1 ? 1 : pNum === 2 ? 14 : 27) + qIdx;
          return {
            questionNumber: qNum,
            questionType: 'true_false_not_given',
            prompt: `Statement ${qNum} regarding empirical research findings in passage ${pNum}.`,
            correctAnswer: 'TRUE',
            explanation: `Directly supported by passage ${pNum}.`,
            evidenceQuote: `discussions of empirical research findings in passage ${pNum}`
          };
        })
      }
    ]
  });

  return {
    examId: 'pkg_reading_valid_12f2',
    schemaVersion: '1.0',
    title: 'Phase 12F.2 Valid Academic Reading Package',
    format: 'Academic',
    createdAt: Date.now(),
    passages: [makePassage(1), makePassage(2), makePassage(3)]
  };
}

function createValidListeningContent() {
  const makeSection = (sNum: number) => ({
    sectionNumber: sNum as 1 | 2 | 3 | 4,
    title: `Section ${sNum}: Academic Dialogue`,
    contextDescription: `University discussion on research methods part ${sNum}.`,
    speakerCount: sNum === 2 || sNum === 4 ? 1 : 2,
    speakers: [{ id: 'S1', name: 'Dr. Evans', role: 'Lecturer' }],
    transcript: Array.from(
      { length: 45 },
      (_, idx) => `Speaker S1 line ${idx + 1} explains the primary schedule and laboratory registration requirements in section ${sNum}.`
    ).join(' '),
    wordCount: 520,
    questionGroups: [
      {
        groupId: `lg_s${sNum}_1`,
        questionType: 'multiple_choice_single',
        instructions: 'Choose the correct letter, A, B or C.',
        questionRangeStart: (sNum - 1) * 10 + 1,
        questionRangeEnd: sNum * 10,
        questions: Array.from({ length: 10 }, (_, qIdx) => {
          const qNum = (sNum - 1) * 10 + qIdx + 1;
          return {
            questionNumber: qNum,
            questionType: 'multiple_choice_single',
            prompt: `What does Dr. Evans state about item ${qNum} in section ${sNum}?`,
            options: ['A. Primary schedule', 'B. Secondary option', 'C. Postponed session'],
            correctAnswer: 'A',
            explanation: `Stated in section ${sNum}.`,
            evidenceQuote: `explains the primary schedule and laboratory registration requirements in section ${sNum}`
          };
        })
      }
    ]
  });

  return {
    examId: 'pkg_listening_valid_12f2',
    schemaVersion: '1.0',
    title: 'Phase 12F.2 Valid Listening Package',
    format: 'Academic',
    createdAt: Date.now(),
    sections: [makeSection(1), makeSection(2), makeSection(3), makeSection(4)]
  };
}

function createValidWritingContent() {
  return {
    examId: 'pkg_writing_valid_12f2',
    schemaVersion: '1.0',
    title: 'Phase 12F.2 Valid Writing Package',
    format: 'Academic' as const,
    createdAt: Date.now(),
    task1: {
      id: 'q_t1_12f2',
      schemaVersion: '1.0' as const,
      format: 'Academic' as const,
      taskCategory: 'task1' as const,
      questionType: 'line' as const,
      prompt: 'The line graph below shows the percentage of households with high-speed fiber internet access in three countries between 2015 and 2025.',
      instructions: 'Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
      suggestedTimeMinutes: 20 as const,
      minWordLimit: 150 as const,
      validationStatus: 'PASSED' as const,
      lifecycleStatus: 'PENDING_REVIEW' as const,
      createdAt: Date.now(),
      visualData: {
        chartTitle: 'Household Fiber Internet Access (2015–2025)',
        units: 'Percentage (%)',
        xAxisLabel: 'Year',
        yAxisLabel: 'Households (%)',
        categories: ['2015', '2020', '2025'],
        series: [
          { name: 'South Korea', data: [72, 86, 95] },
          { name: 'Germany', data: [18, 39, 64] }
        ]
      },
      keyFeaturesToReport: [
        'South Korea maintained the highest fiber adoption throughout the period.',
        'Germany more than tripled its fiber coverage between 2015 and 2025.'
      ]
    },
    task2: {
      id: 'q_t2_12f2',
      schemaVersion: '1.0' as const,
      format: 'Academic' as const,
      taskCategory: 'task2' as const,
      questionType: 'opinion' as const,
      topicCategory: 'technology' as const,
      prompt: 'Public investment in digital infrastructure is more important than investment in traditional road networks.',
      questionText: 'To what extent do you agree or disagree with this statement?',
      instructions: 'Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
      suggestedTimeMinutes: 40 as const,
      minWordLimit: 250 as const,
      validationStatus: 'PASSED' as const,
      lifecycleStatus: 'PENDING_REVIEW' as const,
      createdAt: Date.now(),
      keyArgumentsToConsider: {
        sideA: ['Enables remote work and digital education nationwide.'],
        sideB: ['Physical logistics and emergency transport depend on road maintenance.']
      }
    }
  };
}

function createValidSpeakingContent() {
  return {
    examId: 'pkg_speaking_valid_12f2',
    schemaVersion: '1.0' as const,
    title: 'Phase 12F.2 Valid Speaking Package',
    format: 'Academic' as const,
    topicDomain: 'Technology & Daily Life',
    difficulty: 'Standard' as const,
    createdAt: Date.now(),
    part1: {
      topicGroups: [
        {
          topicId: 'p1_g1',
          title: 'Daily Routines & Study',
          questions: [
            { id: 'p1_q1', prompt: 'How do you usually organize your study schedule during the week?' },
            { id: 'p1_q2', prompt: 'Do you prefer studying in the morning or in the evening?' },
            { id: 'p1_q3', prompt: 'Has your daily routine changed much over the past two years?' },
            { id: 'p1_q4', prompt: 'What digital tools help you manage your time effectively?' }
          ]
        },
        {
          topicId: 'p1_g2',
          title: 'Public Libraries',
          questions: [
            { id: 'p1_q5', prompt: 'How often do you visit public or university libraries?' },
            { id: 'p1_q6', prompt: 'What kinds of resources do you usually look for in a library?' },
            { id: 'p1_q7', prompt: 'Do you think libraries are quiet enough for focused work?' },
            { id: 'p1_q8', prompt: 'How might libraries change in the next decade?' }
          ]
        }
      ]
    },
    part2: {
      id: 'p2_cue_01',
      topic: 'Describe a piece of technology that helped you learn a new skill.',
      instructions: 'You will have to talk about the topic for one to two minutes. You have one minute to think about what you are going to say.',
      bulletPrompts: [
        'what the technology or software was',
        'when and why you started using it',
        'how it helped you develop the skill',
        'and explain how you felt after mastering the skill'
      ],
      preparationTimeSeconds: 60 as const,
      speakingTimeSeconds: 120 as const,
      roundingOffQuestion: 'Would you recommend this tool to other learners?'
    },
    part3: {
      themes: [
        {
          themeId: 'p3_th1',
          title: 'Digital Learning in Higher Education',
          connectedPart2Theme: 'Technology-assisted skill acquisition',
          questions: [
            { id: 'p3_q1', prompt: 'How has online learning changed the role of university lecturers?' },
            { id: 'p3_q2', prompt: 'Do practical skills still require face-to-face mentorship compared to theoretical subjects?' },
            { id: 'p3_q3', prompt: 'What challenges do older adults face when adapting to digital learning platforms?' }
          ]
        },
        {
          themeId: 'p3_th2',
          title: 'Future of Automation & Skills',
          connectedPart2Theme: 'Long-term impact of learning technologies',
          questions: [
            { id: 'p3_q4', prompt: 'Which human skills are least likely to be replaced by automated software in the workplace?' },
            { id: 'p3_q5', prompt: 'Should governments subsidize lifelong technical retraining programs for workers?' },
            { id: 'p3_q6', prompt: 'How can educational institutions balance screen-based learning with critical thinking?' }
          ]
        }
      ]
    }
  };
}

describe('Phase 5.5H.12F.2 — Draft Lifecycle Gating, Generation Abuse Protection & Retention', () => {
  const OWNER_ID = 'usr_synth_12f2_owner';
  const OTHER_ID = 'usr_synth_12f2_other';
  const UNENTITLED_ID = 'usr_synth_12f2_unentitled';
  let ownerToken = '';
  let otherToken = '';
  let unentitledToken = '';
  const createdDraftIds = new Set<string>();

  const FREE_USER_A = 'usr_synth_12f22_free_a';
  const FREE_USER_B = 'usr_synth_12f22_free_b';
  const PRO_USER = 'usr_synth_12f22_pro';
  const TRIAL_USER = 'usr_synth_12f22_trial';
  const MASTER_USER = 'usr_synth_12f22_master';
  let freeTokenA = '';
  let freeTokenB = '';
  let proToken = '';
  let trialToken = '';
  let masterToken = '';

  before(() => {
    if (fs.existsSync(STORE_PATH)) {
      originalStoreBackup = fs.readFileSync(STORE_PATH, 'utf-8');
    }

    const now = Date.now();
    for (const [id, email, name] of [
      [OWNER_ID, 'owner.12f2@example.test', 'Owner Candidate 12F2'],
      [OTHER_ID, 'other.12f2@example.test', 'Other Candidate 12F2'],
      [UNENTITLED_ID, 'unentitled.12f2@example.test', 'Unentitled Candidate 12F2'],
      [FREE_USER_A, 'free.a.12f22@example.test', 'Free Candidate A'],
      [FREE_USER_B, 'free.b.12f22@example.test', 'Free Candidate B'],
      [PRO_USER, 'pro.12f22@example.test', 'Pro Candidate'],
      [TRIAL_USER, 'trial.12f22@example.test', 'Trial Candidate'],
      [MASTER_USER, 'master.12f22@example.test', 'Master Candidate']
    ] as const) {
      serverDb.data.users[id] = {
        id,
        email,
        name,
        createdAt: now,
        updatedAt: now
      };
    }

    // OWNER_ID and OTHER_ID have active pro subscriptions for general lifecycle tests
    for (const uid of [OWNER_ID, OTHER_ID, PRO_USER]) {
      serverDb.saveSubscription({
        userId: uid,
        planId: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false,
        currentPeriodStart: now - 5 * 86400_000,
        currentPeriodEnd: now + 25 * 86400_000,
        updatedAt: now
      });
    }

    // Trial user on pro plan (3-day active trial)
    serverDb.saveSubscription({
      userId: TRIAL_USER,
      planId: 'pro',
      status: 'trialing',
      cancelAtPeriodEnd: false,
      currentPeriodStart: now - 86400_000,
      currentPeriodEnd: now + 2 * 86400_000,
      trialStart: now - 86400_000,
      trialEnd: now + 2 * 86400_000,
      updatedAt: now
    });

    // Master user on master plan
    serverDb.saveSubscription({
      userId: MASTER_USER,
      planId: 'master',
      status: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodStart: now - 5 * 86400_000,
      currentPeriodEnd: now + 85 * 86400_000,
      updatedAt: now
    });

    // Unentitled user has an expired subscription
    serverDb.saveSubscription({
      userId: UNENTITLED_ID,
      planId: 'pro',
      status: 'expired',
      cancelAtPeriodEnd: true,
      currentPeriodStart: now - 60 * 86400_000,
      currentPeriodEnd: now - 30 * 86400_000,
      updatedAt: now
    });

    ownerToken = serverDb.createSession(OWNER_ID, 'test-agent', '127.0.0.1').token;
    otherToken = serverDb.createSession(OTHER_ID, 'test-agent', '127.0.0.1').token;
    unentitledToken = serverDb.createSession(UNENTITLED_ID, 'test-agent', '127.0.0.1').token;
    freeTokenA = serverDb.createSession(FREE_USER_A, 'test-agent', '127.0.0.1').token;
    freeTokenB = serverDb.createSession(FREE_USER_B, 'test-agent', '127.0.0.1').token;
    proToken = serverDb.createSession(PRO_USER, 'test-agent', '127.0.0.1').token;
    trialToken = serverDb.createSession(TRIAL_USER, 'test-agent', '127.0.0.1').token;
    masterToken = serverDb.createSession(MASTER_USER, 'test-agent', '127.0.0.1').token;
  });

  beforeEach(() => {
    factoryGenerationRateLimitMap.clear();
    inFlightFactoryGenerations.clear();
    for (const uid of [OWNER_ID, OTHER_ID, UNENTITLED_ID, FREE_USER_A, FREE_USER_B, PRO_USER, TRIAL_USER, MASTER_USER]) {
      delete serverDb.data.dailyUsage[uid];
    }
  });

  after(() => {
    try {
      factoryGenerationRateLimitMap.clear();
      inFlightFactoryGenerations.clear();
      for (const id of createdDraftIds) {
        delete serverDb.data.aiDraftExams[id];
      }
      for (const uid of [OWNER_ID, OTHER_ID, UNENTITLED_ID, FREE_USER_A, FREE_USER_B, PRO_USER, TRIAL_USER, MASTER_USER]) {
        delete serverDb.data.users[uid];
        delete serverDb.data.subscriptions[uid];
        delete serverDb.data.dailyUsage[uid];
      }
    } finally {
      if ((serverDb as any).saveTimeout) {
        clearTimeout((serverDb as any).saveTimeout);
        (serverDb as any).saveTimeout = null;
      }
      if (originalStoreBackup !== null) {
        serverDb.data = JSON.parse(originalStoreBackup);
        fs.writeFileSync(STORE_PATH, originalStoreBackup, 'utf-8');
      }
    }
  });

  function saveTrackedDraft(
    draft: Partial<AIDraftExam> & Pick<AIDraftExam, 'id' | 'userId' | 'examType' | 'status' | 'validationStatus'>
  ) {
    createdDraftIds.add(draft.id);
    const fullDraft: AIDraftExam = {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: 'gemini-3-flash-preview',
      repairAttempts: 0,
      validationFindings: {
        passed: draft.validationStatus === 'PASSED' || draft.validationStatus === 'REPAIRED',
        structuralOk: draft.validationStatus === 'PASSED' || draft.validationStatus === 'REPAIRED',
        answersOk: draft.validationStatus === 'PASSED' || draft.validationStatus === 'REPAIRED',
        evidenceOk: draft.validationStatus === 'PASSED' || draft.validationStatus === 'REPAIRED',
        qualityOk: draft.validationStatus === 'PASSED' || draft.validationStatus === 'REPAIRED',
        errors: [],
        warnings: []
      },
      ...draft
    };
    return serverDb.saveAiDraftExam(fullDraft);
  }

  describe('A. Module Isolation Across Draft List, Detail, Revalidate & Pilot Endpoints (HIGH-02)', () => {
    it('1. GET /api/ai/:module/drafts returns only drafts matching that exact module examType', () => {
      const now = Date.now();
      saveTrackedDraft({
        id: 'draft_12f2_mod_reading',
        createdAt: now,
        updatedAt: now,
        userId: OWNER_ID,
        model: 'gemini-3-flash-preview',
        examType: 'academic_reading',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: { title: 'Reading Draft' }
      });
      saveTrackedDraft({
        id: 'draft_12f2_mod_listening',
        createdAt: now,
        updatedAt: now,
        userId: OWNER_ID,
        model: 'gemini-3-flash-preview',
        examType: 'listening',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: { title: 'Listening Draft' }
      });
      saveTrackedDraft({
        id: 'draft_12f2_mod_writing',
        createdAt: now,
        updatedAt: now,
        userId: OWNER_ID,
        model: 'gemini-3-flash-preview',
        examType: 'writing',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: { title: 'Writing Draft' }
      });
      saveTrackedDraft({
        id: 'draft_12f2_mod_speaking',
        createdAt: now,
        updatedAt: now,
        userId: OWNER_ID,
        model: 'gemini-3-flash-preview',
        examType: 'speaking',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: { title: 'Speaking Draft' }
      });

      const rList = createMockReqRes({ token: ownerToken });
      handleListReadingDrafts(rList.req, rList.res);
      assert.equal(rList.res.getStatusCode(), 200);
      assert.ok(rList.res.getBody().drafts.every((d: any) => d.examType === 'academic_reading'));
      assert.ok(rList.res.getBody().drafts.some((d: any) => d.id === 'draft_12f2_mod_reading'));

      const lList = createMockReqRes({ token: ownerToken });
      handleListListeningDrafts(lList.req, lList.res);
      assert.equal(lList.res.getStatusCode(), 200);
      assert.ok(lList.res.getBody().drafts.every((d: any) => d.examType === 'listening'));

      const wList = createMockReqRes({ token: ownerToken });
      handleListWritingDrafts(wList.req, wList.res);
      assert.equal(wList.res.getStatusCode(), 200);
      assert.ok(wList.res.getBody().drafts.every((d: any) => d.examType === 'writing'));

      const sList = createMockReqRes({ token: ownerToken });
      handleListSpeakingDrafts(sList.req, sList.res);
      assert.equal(sList.res.getStatusCode(), 200);
      assert.ok(sList.res.getBody().drafts.every((d: any) => d.examType === 'speaking'));
    });

    it('2. GET /api/ai/:module/drafts/:id rejects cross-module draft IDs with 400 across all 4 modules', () => {
      const rWrong = createMockReqRes({ token: ownerToken, params: { id: 'draft_12f2_mod_writing' } });
      handleGetReadingDraftById(rWrong.req, rWrong.res);
      assert.equal(rWrong.res.getStatusCode(), 400);

      const lWrong = createMockReqRes({ token: ownerToken, params: { id: 'draft_12f2_mod_reading' } });
      handleGetListeningDraftById(lWrong.req, lWrong.res);
      assert.equal(lWrong.res.getStatusCode(), 400);

      const wWrong = createMockReqRes({ token: ownerToken, params: { id: 'draft_12f2_mod_speaking' } });
      handleGetWritingDraftById(wWrong.req, wWrong.res);
      assert.equal(wWrong.res.getStatusCode(), 400);

      const sWrong = createMockReqRes({ token: ownerToken, params: { id: 'draft_12f2_mod_listening' } });
      handleGetSpeakingDraftById(sWrong.req, sWrong.res);
      assert.equal(sWrong.res.getStatusCode(), 400);
    });

    it('3. POST /api/ai/:module/revalidate/:id rejects cross-module draft IDs with 400 before running validator', () => {
      const rWrong = createMockReqRes({ token: ownerToken, params: { id: 'draft_12f2_mod_listening' } });
      handleRevalidateReadingDraft(rWrong.req, rWrong.res);
      assert.equal(rWrong.res.getStatusCode(), 400);
      // Confirm status of listening draft was not mutated by reading validator
      assert.equal(serverDb.getAiDraftExam('draft_12f2_mod_listening')?.status, 'PENDING_REVIEW');

      const lWrong = createMockReqRes({ token: ownerToken, params: { id: 'draft_12f2_mod_writing' } });
      handleRevalidateListeningDraft(lWrong.req, lWrong.res);
      assert.equal(lWrong.res.getStatusCode(), 400);

      const wWrong = createMockReqRes({ token: ownerToken, params: { id: 'draft_12f2_mod_speaking' } });
      handleRevalidateWritingDraft(wWrong.req, wWrong.res);
      assert.equal(wWrong.res.getStatusCode(), 400);

      const sWrong = createMockReqRes({ token: ownerToken, params: { id: 'draft_12f2_mod_reading' } });
      handleRevalidateSpeakingDraft(sWrong.req, sWrong.res);
      assert.equal(sWrong.res.getStatusCode(), 400);
    });

    it('4. GET /api/ai/:module/pilot/:id rejects cross-module draft IDs with 400 across all 4 modules', () => {
      const rWrong = createMockReqRes({ token: ownerToken, params: { id: 'draft_12f2_mod_speaking' } });
      handleGetReadingPilot(rWrong.req, rWrong.res);
      assert.equal(rWrong.res.getStatusCode(), 400);
      assert.equal(rWrong.res.getBody().code, 'MODULE_MISMATCH');

      const lWrong = createMockReqRes({ token: ownerToken, params: { id: 'draft_12f2_mod_reading' } });
      handleGetListeningPilot(lWrong.req, lWrong.res);
      assert.equal(lWrong.res.getStatusCode(), 400);
      assert.equal(lWrong.res.getBody().code, 'MODULE_MISMATCH');

      const wWrong = createMockReqRes({ token: ownerToken, params: { id: 'draft_12f2_mod_listening' } });
      handleGetWritingPilot(wWrong.req, wWrong.res);
      assert.equal(wWrong.res.getStatusCode(), 400);
      assert.equal(wWrong.res.getBody().code, 'MODULE_MISMATCH');

      const sWrong = createMockReqRes({ token: ownerToken, params: { id: 'draft_12f2_mod_writing' } });
      handleGetSpeakingPilot(sWrong.req, sWrong.res);
      assert.equal(sWrong.res.getStatusCode(), 400);
      assert.equal(sWrong.res.getBody().code, 'MODULE_MISMATCH');
    });
  });

  describe('B. Candidate Pilot Lifecycle & Validation Gates (HIGH-02)', () => {
    it('5. rejects GENERATING, VALIDATING, REPAIRING, VALIDATION_FAILED, FAILED, PENDING_REVIEW, REJECTED, and APPROVED+FAILED drafts on candidate pilot endpoints', () => {
      const disallowedStates: Array<{
        status: AIDraftExam['status'];
        validationStatus: AIDraftExam['validationStatus'];
        expectedCode: string;
      }> = [
        { status: 'REQUESTED', validationStatus: 'FAILED', expectedCode: 'DRAFT_NOT_APPROVED' },
        { status: 'GENERATING', validationStatus: 'FAILED', expectedCode: 'DRAFT_NOT_APPROVED' },
        { status: 'VALIDATING', validationStatus: 'FAILED', expectedCode: 'DRAFT_NOT_APPROVED' },
        { status: 'REPAIRING', validationStatus: 'FAILED', expectedCode: 'DRAFT_NOT_APPROVED' },
        { status: 'VALIDATION_FAILED', validationStatus: 'FAILED', expectedCode: 'DRAFT_NOT_APPROVED' },
        { status: 'FAILED', validationStatus: 'FAILED', expectedCode: 'DRAFT_NOT_APPROVED' },
        { status: 'PENDING_REVIEW', validationStatus: 'PASSED', expectedCode: 'DRAFT_NOT_APPROVED' },
        { status: 'PENDING_REVIEW', validationStatus: 'REPAIRED', expectedCode: 'DRAFT_NOT_APPROVED' },
        { status: 'REJECTED', validationStatus: 'PASSED', expectedCode: 'DRAFT_NOT_APPROVED' },
        { status: 'APPROVED', validationStatus: 'FAILED', expectedCode: 'VALIDATION_NOT_PASSED' }
      ];

      for (const [idx, state] of disallowedStates.entries()) {
        const draftId = `draft_12f2_gate_${idx}`;
        saveTrackedDraft({
          id: draftId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          userId: OWNER_ID,
          model: 'gemini-3-flash-preview',
          examType: 'writing',
          status: state.status,
          validationStatus: state.validationStatus,
          repairAttempts: 0,
          content: createValidWritingContent()
        });

        const { req, res } = createMockReqRes({ token: ownerToken, params: { id: draftId } });
        handleGetWritingPilot(req, res);
        assert.equal(res.getStatusCode(), 400, `State ${state.status}/${state.validationStatus} must be rejected with 400`);
        assert.equal(res.getBody().code, state.expectedCode);
      }
    });

    it('6. allows APPROVED+PASSED and APPROVED+REPAIRED drafts across all 4 modules for owner only, and rejects non-owner with 403', () => {
      const modules: Array<{
        examType: AIDraftExam['examType'];
        content: any;
        handler: (req: any, res: any) => any;
      }> = [
        { examType: 'academic_reading', content: createValidReadingContent(), handler: handleGetReadingPilot },
        { examType: 'listening', content: createValidListeningContent(), handler: handleGetListeningPilot },
        { examType: 'writing', content: createValidWritingContent(), handler: handleGetWritingPilot },
        { examType: 'speaking', content: createValidSpeakingContent(), handler: handleGetSpeakingPilot }
      ];

      for (const mod of modules) {
        for (const vStatus of ['PASSED', 'REPAIRED'] as const) {
          const draftId = `draft_12f2_ok_${mod.examType}_${vStatus}`;
          saveTrackedDraft({
            id: draftId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            userId: OWNER_ID,
            model: 'gemini-3-flash-preview',
            examType: mod.examType,
            status: 'APPROVED',
            validationStatus: vStatus,
            repairAttempts: vStatus === 'REPAIRED' ? 1 : 0,
            content: mod.content
          });

          // Owner succeeds with 200
          const ownerCall = createMockReqRes({ token: ownerToken, params: { id: draftId } });
          mod.handler(ownerCall.req, ownerCall.res);
          assert.equal(ownerCall.res.getStatusCode(), 200, `${mod.examType} ${vStatus} should succeed for owner`);
          assert.equal(ownerCall.res.getBody().success, true);
          assert.equal(ownerCall.res.getBody().examSet.id, draftId);

          // Non-owner fails with 403
          const otherCall = createMockReqRes({ token: otherToken, params: { id: draftId } });
          mod.handler(otherCall.req, otherCall.res);
          assert.equal(otherCall.res.getStatusCode(), 403, `${mod.examType} ${vStatus} must reject non-owner with 403`);
        }
      }
    });

    it('7. revalidation updates both status and validationStatus consistently without auto-approving drafts', () => {
      // 1. Draft with invalid content -> status becomes VALIDATION_FAILED, validationStatus becomes FAILED
      const badDraftId = 'draft_12f2_reval_bad';
      saveTrackedDraft({
        id: badDraftId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: OWNER_ID,
        model: 'gemini-3-flash-preview',
        examType: 'writing',
        status: 'APPROVED', // Even if previously APPROVED, failing revalidation must demote to VALIDATION_FAILED
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: { examId: 'broken', format: 'Academic' }
      });

      const badCall = createMockReqRes({ token: ownerToken, params: { id: badDraftId } });
      handleRevalidateWritingDraft(badCall.req, badCall.res);
      assert.equal(badCall.res.getStatusCode(), 200);
      assert.equal(badCall.res.getBody().validationStatus, 'FAILED');
      assert.equal(badCall.res.getBody().status, 'VALIDATION_FAILED');
      assert.equal(serverDb.getAiDraftExam(badDraftId)?.status, 'VALIDATION_FAILED');

      // 2. Draft with valid content and repairAttempts=1 -> validationStatus becomes REPAIRED, status becomes PENDING_REVIEW (not auto-approved)
      const repairedDraftId = 'draft_12f2_reval_repaired';
      saveTrackedDraft({
        id: repairedDraftId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: OWNER_ID,
        model: 'gemini-3-flash-preview',
        examType: 'speaking',
        status: 'VALIDATION_FAILED',
        validationStatus: 'FAILED',
        repairAttempts: 1,
        content: createValidSpeakingContent()
      });

      const repairedCall = createMockReqRes({ token: ownerToken, params: { id: repairedDraftId } });
      handleRevalidateSpeakingDraft(repairedCall.req, repairedCall.res);
      assert.equal(repairedCall.res.getStatusCode(), 200);
      assert.equal(repairedCall.res.getBody().validationStatus, 'REPAIRED');
      assert.equal(repairedCall.res.getBody().status, 'PENDING_REVIEW');
      assert.equal(serverDb.getAiDraftExam(repairedDraftId)?.status, 'PENDING_REVIEW');
    });
  });

  describe('C. Generation Rate Limiting & Entitlement Enforcement (HIGH-03)', () => {
    it('8. unauthenticated generation requests return 401 across all 4 modules', async () => {
      for (const handler of [handleGenerateReading, handleGenerateListening, handleGenerateWriting, handleGenerateSpeaking]) {
        const { req, res } = createMockReqRes({});
        await handler(req, res);
        assert.equal(res.getStatusCode(), 401);
      }
    });

    it('9. unentitled user receives 403 across all 4 generation endpoints before any draft or Gemini call is made', async () => {
      let geminiCalled = false;
      const origInvoke = (questionFactory as any).invokeGeminiGenerateContent;
      (questionFactory as any).invokeGeminiGenerateContent = async () => {
        geminiCalled = true;
        throw new Error('Should not be called');
      };

      const recordedEvents: any[] = [];
      const origRecord = analyticsService.recordFactoryOperationalEvent.bind(analyticsService);
      analyticsService.recordFactoryOperationalEvent = ((params: any) => {
        recordedEvents.push(params);
        return { success: true };
      }) as any;

      try {
        for (const handler of [handleGenerateReading, handleGenerateListening, handleGenerateWriting, handleGenerateSpeaking]) {
          const { req, res } = createMockReqRes({ token: unentitledToken, body: { topicSeed: 'Entitlement Test' } });
          await handler(req, res);
          assert.equal(res.getStatusCode(), 403);
          assert.equal(res.getBody().code, 'ENTITLEMENT_REQUIRED');
        }
        assert.equal(geminiCalled, false, 'Gemini must never be called for unentitled users');
        assert.equal(recordedEvents.length, 4);
        assert.ok(recordedEvents.every(e => e.payload.status === 'ENTITLEMENT_DENIED'));
      } finally {
        (questionFactory as any).invokeGeminiGenerateContent = origInvoke;
        analyticsService.recordFactoryOperationalEvent = origRecord;
      }
    });

    it('10. rate-limited user receives 429 across all 4 generation endpoints after exceeding per-user window limit', async () => {
      // Pre-fill rate limit bucket for OWNER_ID with maxRequests timestamps
      const now = Date.now();
      factoryGenerationRateLimitMap.set(
        `factory_gen_${OWNER_ID}`,
        Array.from({ length: FACTORY_GENERATION_RATE_LIMIT.maxRequests }, () => now)
      );

      let geminiCalled = false;
      const origInvoke = (questionFactory as any).invokeGeminiGenerateContent;
      (questionFactory as any).invokeGeminiGenerateContent = async () => {
        geminiCalled = true;
        throw new Error('Should not be called');
      };

      const recordedEvents: any[] = [];
      const origRecord = analyticsService.recordFactoryOperationalEvent.bind(analyticsService);
      analyticsService.recordFactoryOperationalEvent = ((params: any) => {
        recordedEvents.push(params);
        return { success: true };
      }) as any;

      try {
        for (const handler of [handleGenerateReading, handleGenerateListening, handleGenerateWriting, handleGenerateSpeaking]) {
          const { req, res } = createMockReqRes({ token: ownerToken, body: { topicSeed: 'Rate Limit Test' } });
          await handler(req, res);
          assert.equal(res.getStatusCode(), 429);
          assert.equal(res.getBody().code, 'RATE_LIMIT_EXCEEDED');
        }
        assert.equal(geminiCalled, false, 'Gemini must never be called when rate-limited');
        assert.equal(recordedEvents.length, 4);
        assert.ok(recordedEvents.every(e => e.payload.status === 'RATE_LIMITED'));
      } finally {
        (questionFactory as any).invokeGeminiGenerateContent = origInvoke;
        analyticsService.recordFactoryOperationalEvent = origRecord;
      }
    });
  });

  describe('D. In-Flight Generation Deduplication (HIGH-03)', () => {
    it('11. deduplicates concurrent identical requests for the same user/module/params and cleans up after completion', async () => {
      let geminiInvocations = 0;
      const origInvoke = (questionFactory as any).invokeGeminiGenerateContent;
      const origRecord = analyticsService.recordFactoryOperationalEvent.bind(analyticsService);
      analyticsService.recordFactoryOperationalEvent = (() => ({ success: true })) as any;

      (questionFactory as any).invokeGeminiGenerateContent = async () => {
        geminiInvocations++;
        await new Promise(resolve => setTimeout(resolve, 40));
        return {
          text: JSON.stringify(createValidSpeakingContent()),
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 200, totalTokenCount: 300 }
        };
      };

      try {
        const params = {
          userId: OWNER_ID,
          format: 'Academic' as const,
          topicSeed: 'Dedupe Topic Alpha',
          difficulty: 'Standard' as const
        };

        const [res1, res2] = await Promise.all([
          questionFactory.generateSpeakingPilot(params),
          questionFactory.generateSpeakingPilot(params)
        ]);
        createdDraftIds.add(res1.draft.id);
        createdDraftIds.add(res2.draft.id);

        assert.equal(geminiInvocations, 1, 'Underlying Gemini call must execute only once for concurrent identical requests');
        assert.equal(res1.draft.id, res2.draft.id, 'Both concurrent callers must receive the same draft result');
        assert.equal(inFlightFactoryGenerations.size, 0, 'In-flight deduplication map must be empty after completion');
      } finally {
        (questionFactory as any).invokeGeminiGenerateContent = origInvoke;
        analyticsService.recordFactoryOperationalEvent = origRecord;
      }
    });

    it('12. does not merge concurrent requests with different parameters or different users, and cleans up after failure', async () => {
      let geminiInvocations = 0;
      const origInvoke = (questionFactory as any).invokeGeminiGenerateContent;
      const origRecord = analyticsService.recordFactoryOperationalEvent.bind(analyticsService);
      analyticsService.recordFactoryOperationalEvent = (() => ({ success: true })) as any;

      (questionFactory as any).invokeGeminiGenerateContent = async () => {
        geminiInvocations++;
        await new Promise(resolve => setTimeout(resolve, 30));
        return {
          text: JSON.stringify(createValidSpeakingContent()),
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 200, totalTokenCount: 300 }
        };
      };

      try {
        const [resA, resB] = await Promise.all([
          questionFactory.generateSpeakingPilot({ userId: OWNER_ID, topicSeed: 'Topic A' }),
          questionFactory.generateSpeakingPilot({ userId: OTHER_ID, topicSeed: 'Topic A' })
        ]);
        createdDraftIds.add(resA.draft.id);
        createdDraftIds.add(resB.draft.id);

        assert.equal(geminiInvocations, 2, 'Different users must not share in-flight generation promises');
        assert.notEqual(resA.draft.id, resB.draft.id);
        assert.equal(inFlightFactoryGenerations.size, 0);
      } finally {
        (questionFactory as any).invokeGeminiGenerateContent = origInvoke;
        analyticsService.recordFactoryOperationalEvent = origRecord;
      }
    });
  });

  describe('E. Upstream Gemini Request Timeout & Retry Budget (MED-01)', () => {
    it('13. times out a hanging Gemini request cleanly, marks draft as FAILED, emits failure telemetry once, and clears timers', async () => {
      const origInvoke = (questionFactory as any).invokeGeminiGenerateContent;
      const origTimeout = questionFactory.requestTimeoutMs;
      const origBudget = questionFactory.totalRetryBudgetMs;
      const origDelay = questionFactory.retryBaseDelayMs;
      const origRecord = analyticsService.recordFactoryOperationalEvent.bind(analyticsService);

      const telemetryCalls: any[] = [];
      analyticsService.recordFactoryOperationalEvent = ((params: any) => {
        telemetryCalls.push(params);
        return { success: true };
      }) as any;

      questionFactory.requestTimeoutMs = 35;
      questionFactory.totalRetryBudgetMs = 60;
      questionFactory.retryBaseDelayMs = 10;

      // Simulate a never-resolving upstream Gemini call
      (questionFactory as any).invokeGeminiGenerateContent = () => new Promise(() => {});

      try {
        await assert.rejects(
          async () => {
            await questionFactory.generateWritingPilot({
              userId: OWNER_ID,
              topicSeed: 'Timeout Test Seed'
            });
          },
          /timed out|retry budget/i
        );

        // Locate the created draft for OWNER_ID with FAILED status
        const failedDrafts = serverDb
          .getUserAiDraftExams(OWNER_ID)
          .filter(d => d.status === 'FAILED');
        for (const d of failedDrafts) {
          createdDraftIds.add(d.id);
        }
        assert.ok(failedDrafts.length >= 1, 'Hanging generation must transition draft to FAILED');
        assert.equal(telemetryCalls.length, 1, 'Failure telemetry must be emitted exactly once');
        assert.equal(telemetryCalls[0].payload.status, 'FAILED');
        assert.equal(telemetryCalls[0].payload.sanitizedErrorCategory, 'GeminiTimeoutError');
        assert.equal(inFlightFactoryGenerations.size, 0, 'In-flight deduplication entry must be cleaned up on timeout');
      } finally {
        (questionFactory as any).invokeGeminiGenerateContent = origInvoke;
        questionFactory.requestTimeoutMs = origTimeout;
        questionFactory.totalRetryBudgetMs = origBudget;
        questionFactory.retryBaseDelayMs = origDelay;
        analyticsService.recordFactoryOperationalEvent = origRecord;
      }
    });
  });

  describe('F. Bounded Per-User Draft Retention Policy (MED-02)', () => {
    it('14. prunes excess terminal failed/rejected drafts per user while preserving PENDING_REVIEW, APPROVED, active drafts, and other users', () => {
      const origCap = serverDb.maxRetainedFailedDraftsPerUser;
      serverDb.maxRetainedFailedDraftsPerUser = 3;

      const retentionUser = 'usr_synth_12f2_retention';
      const baseTime = Date.now() - 100_000;

      try {
        // Save 2 preserved drafts (APPROVED and PENDING_REVIEW)
        const approvedDraft = saveTrackedDraft({
          id: 'draft_12f2_ret_approved',
          createdAt: baseTime,
          updatedAt: baseTime,
          userId: retentionUser,
          model: 'gemini-3-flash-preview',
          examType: 'writing',
          status: 'APPROVED',
          validationStatus: 'PASSED',
          repairAttempts: 0,
          content: { title: 'Approved Draft' }
        });
        const pendingDraft = saveTrackedDraft({
          id: 'draft_12f2_ret_pending',
          createdAt: baseTime + 1000,
          updatedAt: baseTime + 1000,
          userId: retentionUser,
          model: 'gemini-3-flash-preview',
          examType: 'writing',
          status: 'PENDING_REVIEW',
          validationStatus: 'PASSED',
          repairAttempts: 0,
          content: { title: 'Pending Review Draft' }
        });
        const generatingDraft = saveTrackedDraft({
          id: 'draft_12f2_ret_generating',
          createdAt: baseTime + 2000,
          updatedAt: baseTime + 2000,
          userId: retentionUser,
          model: 'gemini-3-flash-preview',
          examType: 'writing',
          status: 'GENERATING',
          validationStatus: 'FAILED',
          repairAttempts: 0,
          content: null
        });

        // Save 5 terminal failed/rejected drafts with increasing timestamps
        for (let i = 1; i <= 5; i++) {
          saveTrackedDraft({
            id: `draft_12f2_ret_failed_${i}`,
            createdAt: baseTime + i * 5000,
            updatedAt: baseTime + i * 5000,
            userId: retentionUser,
            model: 'gemini-3-flash-preview',
            examType: 'writing',
            status: i % 2 === 0 ? 'FAILED' : 'VALIDATION_FAILED',
            validationStatus: 'FAILED',
            repairAttempts: 1,
            content: null
          });
        }

        const remainingForUser = serverDb.getUserAiDraftExams(retentionUser);
        const remainingIds = remainingForUser.map(d => d.id);

        // Approved, Pending Review, and Generating drafts must be preserved
        assert.ok(remainingIds.includes(approvedDraft.id), 'APPROVED draft must never be pruned');
        assert.ok(remainingIds.includes(pendingDraft.id), 'PENDING_REVIEW draft must never be pruned');
        assert.ok(remainingIds.includes(generatingDraft.id), 'In-progress GENERATING draft must never be pruned');

        // Only the 3 newest failed drafts (3, 4, 5) should remain; oldest 1 and 2 must be pruned
        assert.ok(!remainingIds.includes('draft_12f2_ret_failed_1'), 'Oldest failed draft 1 must be pruned');
        assert.ok(!remainingIds.includes('draft_12f2_ret_failed_2'), 'Oldest failed draft 2 must be pruned');
        assert.ok(remainingIds.includes('draft_12f2_ret_failed_3'), 'Newest failed draft 3 must be retained');
        assert.ok(remainingIds.includes('draft_12f2_ret_failed_4'), 'Newest failed draft 4 must be retained');
        assert.ok(remainingIds.includes('draft_12f2_ret_failed_5'), 'Newest failed draft 5 must be retained');

        // Other user's drafts must remain untouched
        assert.ok(serverDb.getAiDraftExam('draft_12f2_mod_reading'), 'Other user drafts must not be affected');
      } finally {
        serverDb.maxRetainedFailedDraftsPerUser = origCap;
      }
    });
  });

  describe('G. Speaking Parameter Normalization Error Boundary (LOW-01)', () => {
    it('15. catches invalid Speaking format/difficulty inside try/catch, marks draft VALIDATION_FAILED, and records isolated failure telemetry', async () => {
      const telemetryCalls: any[] = [];
      const origRecord = analyticsService.recordFactoryOperationalEvent.bind(analyticsService);
      analyticsService.recordFactoryOperationalEvent = ((params: any) => {
        telemetryCalls.push(params);
        throw new Error('Simulated telemetry storage failure');
      }) as any;

      try {
        await assert.rejects(
          async () => {
            await questionFactory.generateSpeakingPilot({
              userId: OWNER_ID,
              format: 'InvalidFormatValue' as any,
              difficulty: 'Standard'
            });
          },
          /Invalid format "InvalidFormatValue"/
        );

        const userDrafts = serverDb.getUserAiDraftExams(OWNER_ID);
        const normFailedDraft = userDrafts.find(
          d => d.examType === 'speaking' && d.status === 'VALIDATION_FAILED'
        );
        if (normFailedDraft) {
          createdDraftIds.add(normFailedDraft.id);
        }
        assert.ok(normFailedDraft, 'Draft must transition to VALIDATION_FAILED when Speaking format normalization fails');
        assert.equal(normFailedDraft?.validationStatus, 'FAILED');
        assert.equal(telemetryCalls.length, 1, 'Failure telemetry must be attempted inside Speaking catch block');
        assert.equal(telemetryCalls[0].payload.moduleId, 'speaking');
        assert.equal(telemetryCalls[0].payload.status, 'VALIDATION_FAILED');
      } finally {
        analyticsService.recordFactoryOperationalEvent = origRecord;
      }
    });
  });

  describe('H. Phase 5.5H.12F.2.2 — Entitlement Quota Enforcement (DEF-ENTITLE-01)', () => {
    it('16. Free user (quota=1) succeeds on 1st generation (usage=1), is denied with 403 on 2nd request (0 new drafts, 0 Gemini calls), while 2nd Free user has independent quota', async () => {
      let geminiCalls = 0;
      const origInvoke = (questionFactory as any).invokeGeminiGenerateContent;
      const origRecord = analyticsService.recordFactoryOperationalEvent.bind(analyticsService);
      const telemetryEvents: any[] = [];
      analyticsService.recordFactoryOperationalEvent = ((params: any) => {
        telemetryEvents.push(params);
        return { success: true };
      }) as any;

      (questionFactory as any).invokeGeminiGenerateContent = async () => {
        geminiCalls++;
        return {
          text: JSON.stringify(createValidWritingContent()),
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 200, totalTokenCount: 300 }
        };
      };

      try {
        // 1. Free user A with 0 usage -> allowed
        assert.equal(serverDb.getMonthlyUsage(FREE_USER_A).mockExamsPerMonth, 0);
        const firstCall = createMockReqRes({
          token: freeTokenA,
          body: { format: 'Academic', topicSeed: 'Free Quota First Run' }
        });
        await handleGenerateWriting(firstCall.req, firstCall.res);
        assert.equal(firstCall.res.getStatusCode(), 200, 'First generation for Free user A must succeed');
        createdDraftIds.add(firstCall.res.getBody().draftId);
        assert.equal(serverDb.getMonthlyUsage(FREE_USER_A).mockExamsPerMonth, 1, 'Free user A monthly usage must increment to 1');
        assert.equal(geminiCalls, 1);

        // 2. Same Free user A on 2nd request in same period -> denied with 403 ENTITLEMENT_REQUIRED
        const draftsBeforeSecond = serverDb.getUserAiDraftExams(FREE_USER_A).length;
        const secondCall = createMockReqRes({
          token: freeTokenA,
          body: { format: 'Academic', topicSeed: 'Free Quota Second Run' }
        });
        await handleGenerateWriting(secondCall.req, secondCall.res);
        assert.equal(secondCall.res.getStatusCode(), 403, 'Second generation for Free user A must be rejected with 403');
        assert.equal(secondCall.res.getBody().code, 'ENTITLEMENT_REQUIRED');
        assert.match(secondCall.res.getBody().error, /monthly limit of 1 AI Mock Exam/i);
        assert.equal(geminiCalls, 1, 'No Gemini call may occur when quota is exhausted');
        assert.equal(serverDb.getUserAiDraftExams(FREE_USER_A).length, draftsBeforeSecond, 'No new draft may be created when quota is exhausted');
        assert.equal(serverDb.getMonthlyUsage(FREE_USER_A).mockExamsPerMonth, 1, 'Rejected request must not increment usage');

        // 3. Second Free user B with independent quota -> allowed
        assert.equal(serverDb.getMonthlyUsage(FREE_USER_B).mockExamsPerMonth, 0);
        const userBCall = createMockReqRes({
          token: freeTokenB,
          body: { format: 'Academic', topicSeed: 'Free User B First Run' }
        });
        await handleGenerateWriting(userBCall.req, userBCall.res);
        assert.equal(userBCall.res.getStatusCode(), 200, 'First generation for Free user B must succeed');
        createdDraftIds.add(userBCall.res.getBody().draftId);
        assert.equal(serverDb.getMonthlyUsage(FREE_USER_B).mockExamsPerMonth, 1, 'Second Free user B has independent quota');
      } finally {
        (questionFactory as any).invokeGeminiGenerateContent = origInvoke;
        analyticsService.recordFactoryOperationalEvent = origRecord;
      }
    });

    it('17. enforces numeric mockExamsPerMonth limits for pro (10), trialing (10), and master (9999), and fails closed on expired, canceled, unknown, or malformed subscriptions', async () => {
      // Pro user: allowed up to 9 used, denied at 10 used
      for (let i = 0; i < 9; i++) {
        serverDb.incrementDailyUsage(PRO_USER, 'mockExamsGenerated', '2026-11-09');
      }
      assert.equal(checkUserEntitlement(PRO_USER, 'mockExamsPerMonth', { dateStr: '2026-11-09' }).hasAccess, true);
      serverDb.incrementDailyUsage(PRO_USER, 'mockExamsGenerated', '2026-11-09');
      const proAtLimit = checkUserEntitlement(PRO_USER, 'mockExamsPerMonth', { dateStr: '2026-11-09' });
      assert.equal(proAtLimit.hasAccess, false);
      assert.match(proAtLimit.reason || '', /monthly limit of 10/i);

      // Endpoint verification when PRO_USER is at 10/10 quota
      const origRecord = analyticsService.recordFactoryOperationalEvent.bind(analyticsService);
      analyticsService.recordFactoryOperationalEvent = (() => ({ success: true })) as any;
      try {
        const proDenied = createMockReqRes({ token: proToken, body: { topicSeed: 'Pro Over Limit' } });
        await handleGenerateReading(proDenied.req, proDenied.res);
        assert.equal(proDenied.res.getStatusCode(), 403);
        assert.equal(proDenied.res.getBody().code, 'ENTITLEMENT_REQUIRED');
      } finally {
        analyticsService.recordFactoryOperationalEvent = origRecord;
      }

      // Trialing user on pro plan: allowed up to 10/month, fails closed if trialEnd has passed
      for (let i = 0; i < 9; i++) {
        serverDb.incrementDailyUsage(TRIAL_USER, 'mockExamsGenerated', '2026-11-09');
      }
      assert.equal(checkUserEntitlement(TRIAL_USER, 'mockExamsPerMonth', { dateStr: '2026-11-09' }).hasAccess, true);
      serverDb.incrementDailyUsage(TRIAL_USER, 'mockExamsGenerated', '2026-11-09');
      assert.equal(checkUserEntitlement(TRIAL_USER, 'mockExamsPerMonth', { dateStr: '2026-11-09' }).hasAccess, false);

      // Expired trial timestamp check (fail closed)
      delete serverDb.data.dailyUsage[TRIAL_USER];
      const futureMs = Date.now() + 10 * 86400_000;
      const expiredTrialCheck = checkUserEntitlement(TRIAL_USER, 'mockExamsPerMonth', { dateStr: '2026-11-09', nowMs: futureMs });
      assert.equal(expiredTrialCheck.hasAccess, false);
      assert.match(expiredTrialCheck.reason || '', /expired/i);

      // Master user: allowed above 10 (e.g. 50 used), denied at 9999
      serverDb.data.dailyUsage[MASTER_USER] = {
        '2026-11-09': {
          speakingEvaluations: 0,
          writingEvaluations: 0,
          mockExamsGenerated: 50
        }
      };
      assert.equal(checkUserEntitlement(MASTER_USER, 'mockExamsPerMonth', { dateStr: '2026-11-09' }).hasAccess, true);
      serverDb.data.dailyUsage[MASTER_USER]['2026-11-09'].mockExamsGenerated = 9999;
      assert.equal(checkUserEntitlement(MASTER_USER, 'mockExamsPerMonth', { dateStr: '2026-11-09' }).hasAccess, false);

      // Fail-closed checks for missing userId, canceled status, and unknown planId
      assert.equal(checkUserEntitlement('', 'mockExamsPerMonth').hasAccess, false);
      const malformedUser = 'usr_synth_12f22_malformed';
      serverDb.data.subscriptions[malformedUser] = {
        userId: malformedUser,
        planId: 'non_existent_plan' as any,
        status: 'active',
        cancelAtPeriodEnd: false,
        currentPeriodStart: Date.now() - 1000,
        currentPeriodEnd: Date.now() + 100000,
        updatedAt: Date.now()
      };
      try {
        assert.equal(checkUserEntitlement(malformedUser, 'mockExamsPerMonth').hasAccess, false);
        serverDb.data.subscriptions[malformedUser].planId = 'pro';
        serverDb.data.subscriptions[malformedUser].status = 'canceled';
        assert.equal(checkUserEntitlement(malformedUser, 'mockExamsPerMonth').hasAccess, false);
      } finally {
        delete serverDb.data.subscriptions[malformedUser];
      }
    });

    it('18. concurrent identical requests consume only 1 quota unit total, different requests consume separate units, and 401/429 consume 0 units', async () => {
      const origInvoke = (questionFactory as any).invokeGeminiGenerateContent;
      const origRecord = analyticsService.recordFactoryOperationalEvent.bind(analyticsService);
      analyticsService.recordFactoryOperationalEvent = (() => ({ success: true })) as any;

      let geminiCalls = 0;
      (questionFactory as any).invokeGeminiGenerateContent = async () => {
        geminiCalls++;
        await new Promise(resolve => setTimeout(resolve, 40));
        return {
          text: JSON.stringify(createValidWritingContent()),
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 200, totalTokenCount: 300 }
        };
      };

      try {
        // 1. Unauthenticated request (401) consumes 0 quota units
        const unauthCall = createMockReqRes({ body: { format: 'Academic', topicSeed: 'Unauth' } });
        await handleGenerateWriting(unauthCall.req, unauthCall.res);
        assert.equal(unauthCall.res.getStatusCode(), 401);

        // 2. Rate-limited request (429) consumes 0 quota units
        const now = Date.now();
        factoryGenerationRateLimitMap.set(
          `factory_gen_${FREE_USER_A}`,
          Array.from({ length: FACTORY_GENERATION_RATE_LIMIT.maxRequests }, () => now)
        );
        const rateLimitedCall = createMockReqRes({
          token: freeTokenA,
          body: { format: 'Academic', topicSeed: 'RateLimited' }
        });
        await handleGenerateWriting(rateLimitedCall.req, rateLimitedCall.res);
        assert.equal(rateLimitedCall.res.getStatusCode(), 429);
        assert.equal(serverDb.getMonthlyUsage(FREE_USER_A).mockExamsPerMonth, 0, 'Rate-limited request must consume 0 quota');
        factoryGenerationRateLimitMap.clear();

        // 3. Concurrent identical requests from Free user A (quota=1): both succeed via deduplication and consume 1 unit total
        const dupReq1 = createMockReqRes({
          token: freeTokenA,
          body: { format: 'Academic', topicSeed: 'Concurrent Identical Seed' }
        });
        const dupReq2 = createMockReqRes({
          token: freeTokenA,
          body: { format: 'Academic', topicSeed: 'Concurrent Identical Seed' }
        });

        await Promise.all([
          handleGenerateWriting(dupReq1.req, dupReq1.res),
          handleGenerateWriting(dupReq2.req, dupReq2.res)
        ]);

        assert.equal(dupReq1.res.getStatusCode(), 200, 'Primary in-flight request must succeed');
        assert.equal(dupReq2.res.getStatusCode(), 200, 'Deduplicated concurrent request must attach and succeed without double-counting quota');
        assert.equal(dupReq1.res.getBody().draftId, dupReq2.res.getBody().draftId);
        createdDraftIds.add(dupReq1.res.getBody().draftId);
        assert.equal(geminiCalls, 1);
        assert.equal(serverDb.getMonthlyUsage(FREE_USER_A).mockExamsPerMonth, 1, 'Concurrent identical requests must consume exactly 1 quota unit');

        // 4. Concurrent DIFFERENT requests for Free user B (quota=1): first consumes the 1 quota unit, second different request is denied with 403
        const diffReq1 = createMockReqRes({
          token: freeTokenB,
          body: { format: 'Academic', topicSeed: 'Different Seed Alpha' }
        });
        const diffReq2 = createMockReqRes({
          token: freeTokenB,
          body: { format: 'Academic', topicSeed: 'Different Seed Beta' }
        });

        await Promise.all([
          handleGenerateWriting(diffReq1.req, diffReq1.res),
          handleGenerateWriting(diffReq2.req, diffReq2.res)
        ]);

        assert.equal(diffReq1.res.getStatusCode(), 200);
        createdDraftIds.add(diffReq1.res.getBody().draftId);
        assert.equal(diffReq2.res.getStatusCode(), 403, 'Concurrent different request exceeding Free user quota must be rejected with 403');
        assert.equal(serverDb.getMonthlyUsage(FREE_USER_B).mockExamsPerMonth, 1);
      } finally {
        (questionFactory as any).invokeGeminiGenerateContent = origInvoke;
        analyticsService.recordFactoryOperationalEvent = origRecord;
      }
    });

    it('19. resets monthly quota cleanly across controlled YYYY-MM calendar period rollover without waiting for real time', () => {
      // Record 1 mock exam on 2026-11-30 for FREE_USER_A (quota = 1)
      serverDb.incrementDailyUsage(FREE_USER_A, 'mockExamsGenerated', '2026-11-30');
      assert.equal(serverDb.getMonthlyUsage(FREE_USER_A, '2026-11-30').mockExamsPerMonth, 1);

      const novCheck = checkUserEntitlement(FREE_USER_A, 'mockExamsPerMonth', { dateStr: '2026-11-30' });
      assert.equal(novCheck.hasAccess, false, 'Free user must be blocked on 2026-11-30 after 1 generation in November');

      // Rollover to 2026-12-01
      assert.equal(serverDb.getMonthlyUsage(FREE_USER_A, '2026-12-01').mockExamsPerMonth, 0);
      const decCheck = checkUserEntitlement(FREE_USER_A, 'mockExamsPerMonth', { dateStr: '2026-12-01' });
      assert.equal(decCheck.hasAccess, true, 'Free user quota must reset on 2026-12-01');
    });
  });

  describe('I. Phase 5.5H.12F.2.2 — Operation-Wide 120s Deadline, Late-Resolution Guard & Non-Evicting Deduplication (DEF-BUDGET-01)', () => {
    it('20. shares one operation-wide deadline across initial generation and repair attempts across all 4 factories without resetting per repair', async () => {
      const origInvoke = (questionFactory as any).invokeGeminiGenerateContent;
      const origTimeout = questionFactory.requestTimeoutMs;
      const origBudget = questionFactory.totalRetryBudgetMs;
      const origDelay = questionFactory.retryBaseDelayMs;
      const origRecord = analyticsService.recordFactoryOperationalEvent.bind(analyticsService);
      analyticsService.recordFactoryOperationalEvent = (() => ({ success: true })) as any;

      // Per-request timeout = 115ms, total operation budget = 120ms
      questionFactory.requestTimeoutMs = 115;
      questionFactory.totalRetryBudgetMs = 120;
      questionFactory.retryBaseDelayMs = 5;

      const factories: Array<{
        name: string;
        run: () => Promise<any>;
      }> = [
        {
          name: 'Reading',
          run: () => questionFactory.generateAcademicReadingPilot({ userId: OWNER_ID, topicSeed: 'OpBudget Reading' })
        },
        {
          name: 'Listening',
          run: () => questionFactory.generateListeningPilot({ userId: OWNER_ID, topicSeed: 'OpBudget Listening' })
        },
        {
          name: 'Writing',
          run: () => questionFactory.generateWritingPilot({ userId: OWNER_ID, topicSeed: 'OpBudget Writing' })
        },
        {
          name: 'Speaking',
          run: () => questionFactory.generateSpeakingPilot({ userId: OWNER_ID, topicSeed: 'OpBudget Speaking' })
        }
      ];

      try {
        for (const f of factories) {
          let callIndex = 0;
          const observedAbortSignals: Array<AbortSignal | undefined> = [];

          (questionFactory as any).invokeGeminiGenerateContent = async (params: any) => {
            callIndex++;
            const signal: AbortSignal | undefined = params?.config?.abortSignal;
            observedAbortSignals.push(signal);

            if (callIndex === 1) {
              // Initial call takes 25ms (well within 115ms per-request and 120ms total budget)
              // and returns structurally invalid JSON so the factory enters the repair loop
              await new Promise(resolve => setTimeout(resolve, 25));
              return {
                text: JSON.stringify({ examId: 'invalid_initial_pkg' }),
                usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10, totalTokenCount: 20 }
              };
            }

            // Repair call 1: only ~90ms remains in the operation-wide 120ms budget!
            // If repair received a fresh 120ms budget (and 115ms per-request timeout), a 105ms call would succeed.
            // With shared operationDeadlineMs, this repair call must abort at ~90ms!
            await new Promise((resolve, reject) => {
              const timer = setTimeout(resolve, 108);
              if (signal) {
                signal.addEventListener(
                  'abort',
                  () => {
                    clearTimeout(timer);
                    reject(signal.reason || new Error('Aborted'));
                  },
                  { once: true }
                );
              }
            });

            return {
              text: JSON.stringify({ examId: 'should_never_reach' }),
              usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10, totalTokenCount: 20 }
            };
          };

          const startedAt = Date.now();
          await assert.rejects(
            async () => {
              await f.run();
            },
            /timed out|retry budget/i,
            `${f.name} factory must time out when initial + repair exceeds operation-wide totalRetryBudgetMs`
          );
          const elapsed = Date.now() - startedAt;

          assert.equal(callIndex, 2, `${f.name} must invoke initial call + 1st repair call before budget exhaustion (no 2nd repair after deadline)`);
          assert.ok(observedAbortSignals[0] instanceof AbortSignal, `${f.name} initial call must receive an AbortSignal in config.abortSignal`);
          assert.ok(observedAbortSignals[1] instanceof AbortSignal, `${f.name} repair call must receive an AbortSignal in config.abortSignal`);
          assert.equal(observedAbortSignals[1]?.aborted, true, `${f.name} repair AbortSignal must be aborted when remaining budget expires`);
          assert.ok(elapsed < 220, `${f.name} total elapsed time (${elapsed}ms) must respect the shared 120ms budget rather than resetting per repair`);
        }

        for (const d of serverDb.getUserAiDraftExams(OWNER_ID)) {
          createdDraftIds.add(d.id);
        }
      } finally {
        (questionFactory as any).invokeGeminiGenerateContent = origInvoke;
        questionFactory.requestTimeoutMs = origTimeout;
        questionFactory.totalRetryBudgetMs = origBudget;
        questionFactory.retryBaseDelayMs = origDelay;
        analyticsService.recordFactoryOperationalEvent = origRecord;
      }
    });

    it('21. prevents a late upstream resolution from overwriting a terminal FAILED draft or emitting duplicate telemetry', async () => {
      const origInvoke = (questionFactory as any).invokeGeminiGenerateContent;
      const origTimeout = questionFactory.requestTimeoutMs;
      const origBudget = questionFactory.totalRetryBudgetMs;
      const origRecord = analyticsService.recordFactoryOperationalEvent.bind(analyticsService);

      const telemetryCalls: any[] = [];
      analyticsService.recordFactoryOperationalEvent = ((params: any) => {
        telemetryCalls.push(params);
        return { success: true };
      }) as any;

      questionFactory.requestTimeoutMs = 30;
      questionFactory.totalRetryBudgetMs = 45;

      // Simulate an uncooperative mock that ignores abortSignal and resolves at 80ms with valid content
      (questionFactory as any).invokeGeminiGenerateContent = async () => {
        await new Promise(resolve => setTimeout(resolve, 80));
        return {
          text: JSON.stringify(createValidWritingContent()),
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 200, totalTokenCount: 300 }
        };
      };

      try {
        await assert.rejects(
          async () => {
            await questionFactory.generateWritingPilot({
              userId: OWNER_ID,
              topicSeed: 'Late Resolution Guard Test'
            });
          },
          /timed out|retry budget/i
        );

        // Wait until after the 80ms late upstream resolution has completed
        await new Promise(resolve => setTimeout(resolve, 75));

        const drafts = serverDb
          .getUserAiDraftExams(OWNER_ID)
          .filter(d => d.examType === 'writing');
        for (const d of drafts) {
          createdDraftIds.add(d.id);
        }

        // Find the most recent writing draft created in this test
        const targetDraft = drafts[0];
        assert.ok(targetDraft, 'Draft must exist');
        assert.equal(targetDraft.status, 'FAILED', 'Terminal FAILED draft must never be overwritten after timeout');
        assert.equal(targetDraft.validationStatus, 'FAILED');
        assert.equal(telemetryCalls.length, 1, 'Exactly one terminal telemetry event must be emitted');
        assert.equal(telemetryCalls[0].payload.status, 'FAILED');
      } finally {
        (questionFactory as any).invokeGeminiGenerateContent = origInvoke;
        questionFactory.requestTimeoutMs = origTimeout;
        questionFactory.totalRetryBudgetMs = origBudget;
        analyticsService.recordFactoryOperationalEvent = origRecord;
      }
    });

    it('22. never evicts an active in-flight promise before settlement and cleans up inFlightFactoryGenerations upon settlement', async () => {
      const origInvoke = (questionFactory as any).invokeGeminiGenerateContent;
      const origTimeout = questionFactory.requestTimeoutMs;
      const origBudget = questionFactory.totalRetryBudgetMs;
      const origRecord = analyticsService.recordFactoryOperationalEvent.bind(analyticsService);
      analyticsService.recordFactoryOperationalEvent = (() => ({ success: true })) as any;

      questionFactory.requestTimeoutMs = 200;
      questionFactory.totalRetryBudgetMs = 200;

      let invocations = 0;
      (questionFactory as any).invokeGeminiGenerateContent = async () => {
        invocations++;
        await new Promise(resolve => setTimeout(resolve, 70));
        return {
          text: JSON.stringify(createValidSpeakingContent()),
          usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 100, totalTokenCount: 150 }
        };
      };

      try {
        const params = {
          userId: OWNER_ID,
          format: 'Academic' as const,
          topicSeed: 'NonEvicting Dedupe Seed',
          difficulty: 'Standard' as const
        };
        const dedupeKey = buildFactoryGenerationDedupeKey({
          userId: OWNER_ID,
          moduleId: 'speaking',
          format: 'Academic',
          topicSeed: 'NonEvicting Dedupe Seed',
          difficulty: 'Standard'
        });

        const p1 = questionFactory.generateSpeakingPilot(params);
        // Artificially backdate startedAt by 200 seconds to prove runWithInFlightDeduplication
        // never evicts an active promise based on age while it is still running
        const entry = inFlightFactoryGenerations.get(dedupeKey);
        assert.ok(entry, 'In-flight entry must be registered');
        entry.startedAt = Date.now() - 200_000;

        const p2 = questionFactory.generateSpeakingPilot(params);
        const [r1, r2] = await Promise.all([p1, p2]);
        createdDraftIds.add(r1.draft.id);
        createdDraftIds.add(r2.draft.id);

        assert.equal(invocations, 1, 'Backdated active in-flight entry must not be evicted while still running');
        assert.equal(r1.draft.id, r2.draft.id);
        assert.equal(inFlightFactoryGenerations.has(dedupeKey), false, 'In-flight entry must be removed upon settlement');
      } finally {
        (questionFactory as any).invokeGeminiGenerateContent = origInvoke;
        questionFactory.requestTimeoutMs = origTimeout;
        questionFactory.totalRetryBudgetMs = origBudget;
        analyticsService.recordFactoryOperationalEvent = origRecord;
      }
    });
  });

  describe('J. Phase 5.5H.12F.2.2 — Test Persistence Hygiene & Timer Cancellation (DEF-TEST-HYGIENE-01)', () => {
    it('23. cancels pending serverDb.saveTimeout before store restoration so no delayed 100ms write can overwrite .data/sprint_store.json', async () => {
      const preTestSnapshot = fs.readFileSync(STORE_PATH, 'utf-8');

      // Trigger a debounced 100ms save timer via scheduleSave()
      (serverDb as any).scheduleSave();
      assert.ok((serverDb as any).saveTimeout !== null, 'scheduleSave() must arm a 100ms saveTimeout');

      // Mutate in-memory state temporarily and immediately execute the exact cleanup pattern
      // used in candidateAnalyticsDashboard.test.ts and analyticsEngine.test.ts
      const tempMarkerId = 'usr_temp_hygiene_marker';
      serverDb.data.users[tempMarkerId] = {
        id: tempMarkerId,
        email: 'hygiene@example.test',
        name: 'Temp Hygiene Marker',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      try {
        // Simulated test body completion
      } finally {
        if ((serverDb as any).saveTimeout) {
          clearTimeout((serverDb as any).saveTimeout);
          (serverDb as any).saveTimeout = null;
        }
        serverDb.data = JSON.parse(preTestSnapshot);
        fs.writeFileSync(STORE_PATH, preTestSnapshot, 'utf-8');
      }

      assert.equal((serverDb as any).saveTimeout, null, 'saveTimeout must be cleared and nulled');

      // Wait 140ms (> 100ms debounce delay) to confirm no delayed timer fires and mutates the file
      await new Promise(resolve => setTimeout(resolve, 140));

      const postWaitSnapshot = fs.readFileSync(STORE_PATH, 'utf-8');
      assert.equal(postWaitSnapshot, preTestSnapshot, '.data/sprint_store.json must remain byte-for-byte identical after 140ms');
      assert.equal(serverDb.data.users[tempMarkerId], undefined);
    });
  });
});

