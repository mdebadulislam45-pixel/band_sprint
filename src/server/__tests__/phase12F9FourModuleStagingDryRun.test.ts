import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import {
  handleAdminListAiDrafts,
  handleAdminGetAiDraftById,
  handleAdminApproveAiDraft,
  handleAdminRejectAiDraft,
  handleGetReadingPilot,
  handleGetListeningPilot,
  handleGetWritingPilot,
  handleGetSpeakingPilot,
  handleListReadingDrafts,
  handleListListeningDrafts,
  handleListWritingDrafts,
  handleListSpeakingDrafts,
  inFlightAdminDraftReviewLocks,
  factoryGenerationRateLimitMap,
} from '../../../server.ts';
import { serverDb } from '../../server/db.ts';
import {
  inFlightFactoryGenerations,
  verifyCandidatePilotDraftEligibility,
  runModuleValidatorForDraft,
} from '../../server/ai/questionFactory.ts';
import {
  resolveCandidateAuthHeaders,
  getCandidateDraftStatusDescriptor,
  adaptSpeakingPilotSetForExaminer,
  fetchApprovedCandidatePilotExamSet,
} from '../../services/candidateAiPilotService.ts';
import { convertDraftToWritingTestSet } from '../../components/cdielts/CDIELTSWritingExamRoom.tsx';

const STORE_PATH = path.resolve(process.cwd(), '.data', 'sprint_store.json');

function createMockReqRes(options: {
  token?: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: Record<string, any>;
}) {
  let statusCode = 200;
  let bodyPayload: any = undefined;

  const req: any = {
    headers: options.token ? { authorization: `Bearer ${options.token}` } : {},
    params: options.params || {},
    query: options.query || {},
    body: options.body || {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
  };

  const res: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: any) {
      bodyPayload = payload;
      return this;
    },
    getStatusCode: () => statusCode,
    getBody: () => bodyPayload,
  };

  return { req, res };
}

function buildValidReadingContent() {
  const counts = [13, 13, 14];
  let qCounter = 1;
  const passages = counts.map((count, pIdx) => {
    const pNum = pIdx + 1;
    const questions = Array.from({ length: count }, () => {
      const qId = qCounter++;
      return {
        id: qId,
        type: 'true_false_not_given',
        prompt: `Academic Reading statement ${qId} in passage ${pNum}.`,
        correctAnswer: 'TRUE',
        passageEvidence: `empirical climate data in passage ${pNum}`,
        explanation: `Confirmed by passage ${pNum} empirical findings.`,
      };
    });
    return {
      id: `passage_stage_${pNum}`,
      passageNumber: pNum,
      title: `Academic Reading Passage ${pNum} — Staging Simulation`,
      text: Array.from(
        { length: 70 },
        (_, i) =>
          `Paragraph ${(i % 5) + 1} sentence ${i + 1} presents empirical climate data in passage ${pNum} exploring urban hydrology and sustainable infrastructure.`
      ).join(' '),
      wordCount: 770,
      questions,
    };
  });

  return {
    examId: 'rd_stage_valid_12f9',
    title: 'Academic Reading Staging Rehearsal',
    format: 'Academic',
    difficulty: 'Band 6.5–7.5',
    targetBand: 7.5,
    passages,
  };
}

function buildValidListeningContent() {
  let qCounter = 1;
  const sections = [1, 2, 3, 4].map((secNum) => {
    const questions = Array.from({ length: 10 }, () => {
      const qId = qCounter++;
      return {
        id: qId,
        type: 'form_completion',
        prompt: `Listening section ${secNum} item ${qId} form completion.`,
        correctAnswer: 'campus',
        scriptEvidence: `verified audio transcript evidence in section ${secNum}`,
        explanation: `Stated directly in section ${secNum} audio script.`,
      };
    });
    return {
      id: `sec_stage_${secNum}`,
      sectionNumber: secNum,
      title: `Listening Section ${secNum} — University Admissions`,
      speakers: ['Advisor', 'Student'],
      script: Array.from(
        { length: 25 },
        (_, i) =>
          `Turn ${i + 1}: This dialogue provides verified audio transcript evidence in section ${secNum} regarding student accommodation and library facilities.`
      ).join(' '),
      wordCount: 260,
      questions,
    };
  });

  return {
    examId: 'ls_stage_valid_12f9',
    title: 'Listening Staging Rehearsal',
    format: 'Academic',
    difficulty: 'Band 6.5–7.5',
    targetBand: 7.5,
    sections,
  };
}

function buildValidWritingContent() {
  return {
    examId: 'wrt_stage_valid_12f9',
    schemaVersion: '1.0' as const,
    title: 'Writing Staging Rehearsal — Academic',
    format: 'Academic' as const,
    difficulty: 'Band 6.5–7.5' as const,
    targetBand: 7.5,
    task1: {
      id: 'wrt_stage_t1_12f9',
      schemaVersion: '1.0' as const,
      format: 'Academic' as const,
      taskCategory: 'task1' as const,
      questionType: 'bar' as const,
      prompt: 'The bar chart below shows solar power generation in three countries between 2015 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
      instructions: 'Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
      suggestedTimeMinutes: 20,
      minWordLimit: 150,
      visualData: {
        chartType: 'bar' as const,
        chartTitle: 'Solar Power Generation 2015-2025',
        units: 'GWh',
        xAxisLabel: 'Country',
        yAxisLabel: 'Generation (GWh)',
        categories: ['Country A', 'Country B', 'Country C'],
        series: [
          { name: '2015', data: [10, 15, 20] },
          { name: '2025', data: [80, 95, 110] },
        ],
      },
      keyFeaturesToReport: [
        'Generation increased across all three countries between 2015 and 2025',
        'Country C demonstrated the highest total production in both measured years',
      ],
    },
    task2: {
      id: 'wrt_stage_t2_12f9',
      schemaVersion: '1.0' as const,
      format: 'Academic' as const,
      taskCategory: 'task2' as const,
      questionType: 'discuss_both_views' as const,
      topicCategory: 'environment' as const,
      prompt: 'Some people argue that public transportation should be completely free, funded by general taxation. Others believe users should pay for the service they use. Discuss both views and give your own opinion.',
      questionText: 'Discuss both views and give your own opinion.',
      instructions: 'Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
      suggestedTimeMinutes: 40,
      minWordLimit: 250,
      keyArgumentsToConsider: {
        sideA: ['Reduced traffic congestion and accelerated emissions cuts through free transit'],
        sideB: ['Fiscal sustainability and quality of service maintenance via user fare recovery'],
      },
    },
  };
}

function buildValidSpeakingContent() {
  return {
    examId: 'spk_stage_valid_12f9',
    title: 'Phase 12F.9 Speaking Staging Rehearsal — Civic Architecture',
    format: 'Academic' as const,
    difficulty: 'Band 6.5–7.5' as const,
    targetBand: 7.5,
    part1: {
      introFrame: 'Good afternoon. Can you tell me your full name, please?',
      durationMinutes: '4-5 minutes',
      topicGroups: [
        {
          topicId: 'tg_studies',
          title: 'Studies & Daily Routine',
          topic: 'Studies & Daily Routine',
          isCoreOpeningTopic: true,
          questions: [
            { id: 'sp1_1', prompt: 'Do you work or are you currently a student?' },
            { id: 'sp1_2', prompt: 'What part of your daily study or work schedule do you enjoy most?' },
            { id: 'sp1_3', prompt: 'How do you usually organise your tasks at the start of the week?' },
            { id: 'sp1_4', prompt: 'Would you prefer to study or work in the morning or in the evening?' },
          ],
        },
        {
          topicId: 'tg_architecture',
          title: 'Neighbourhood Architecture',
          topic: 'Neighbourhood Architecture',
          isCoreOpeningTopic: false,
          questions: [
            { id: 'sp1_5', prompt: 'What kind of public buildings are common in your neighbourhood?' },
            { id: 'sp1_6', prompt: 'Has the architecture in your town changed much in recent years?' },
            { id: 'sp1_7', prompt: 'Do you prefer spending time in modern or historic buildings?' },
            { id: 'sp1_8', prompt: 'How important are public parks in urban areas?' },
          ],
        },
      ],
    },
    part2: {
      id: 'sp2_cue_stage_12f9',
      topic: 'Describe a well-designed public building or library you have visited.',
      instructions: 'You should say:',
      bulletPrompts: [
        'where the building is located',
        'what it looks like on the outside and inside',
        'what people use this building for',
        'and explain why you think its design is successful.',
      ],
      prepTimeSeconds: 60,
      talkTimeSeconds: 120,
      preparationTimeSeconds: 60,
      speakingTimeSeconds: 120,
      roundingOffQuestion: 'Would you recommend visiting this building to architecture students?',
      examinerIntro: 'Now I am going to give you a topic and I would like you to talk about it for one to two minutes.',
    },
    part3: {
      durationMinutes: '4-5 minutes',
      themes: [
        {
          themeId: 'th_civic',
          title: 'Civic Architecture & Community Identity',
          connectedPart2Theme: 'Public Buildings',
          questions: [
            {
              id: 'sp3_1',
              prompt: 'How does the design of public buildings influence civic pride in a city?',
              targetFunction: 'Analyze' as const,
              examinerProbeNotes: 'Ask candidate to compare functional utility versus symbolic aesthetics.',
            },
            {
              id: 'sp3_2',
              prompt: 'Should municipal governments preserve historic structures even when maintenance is costly?',
              targetFunction: 'Evaluate' as const,
              examinerProbeNotes: 'Probe economic trade-offs in rapidly growing cities.',
            },
          ],
        },
        {
          themeId: 'th_sustainable',
          title: 'Sustainable Urban Planning',
          connectedPart2Theme: 'Public Buildings',
          questions: [
            {
              id: 'sp3_3',
              prompt: 'Why do some high-density cities struggle to provide adequate green space?',
              targetFunction: 'Compare' as const,
              examinerProbeNotes: 'Challenge candidate on land-value pressures.',
            },
            {
              id: 'sp3_4',
              prompt: 'Who should bear the cost of retrofitting older buildings for energy efficiency?',
              targetFunction: 'Speculate' as const,
              examinerProbeNotes: 'Compare state subsidies versus developer mandates.',
            },
          ],
        },
      ],
    },
  };
}

describe('Phase 5.5H.12F.9 — Four-Module Admin Staging Review & Non-Mutating Candidate Launch Dry-Run', { concurrency: false }, () => {
  let preTestDiskSize = 0;
  let preTestDiskSha256 = '';
  let inMemorySnapshot = '';
  let originalPersistSync: any = null;

  const ADMIN_ID = 'usr_stage_admin_12f9';
  let ADMIN_TOKEN = '';
  const CANDIDATE_A_ID = 'usr_stage_cand_a_12f9';
  let CANDIDATE_A_TOKEN = '';
  const CANDIDATE_B_ID = 'usr_stage_cand_b_12f9';
  let CANDIDATE_B_TOKEN = '';
  const NON_ADMIN_ID = 'usr_stage_nonadmin_12f9';
  let NON_ADMIN_TOKEN = '';

  before(() => {
    // 1. Capture exact baseline from disk
    const rawDisk = fs.readFileSync(STORE_PATH);
    preTestDiskSize = rawDisk.length;
    preTestDiskSha256 = crypto.createHash('sha256').update(rawDisk).digest('hex');
    inMemorySnapshot = JSON.stringify(serverDb.data);

    // 2. Prevent any persistent store writes during simulation
    originalPersistSync = (serverDb as any).persistSync;
    if ((serverDb as any).saveTimeout) {
      clearTimeout((serverDb as any).saveTimeout);
      (serverDb as any).saveTimeout = null;
    }
    (serverDb as any).persistSync = () => {
      // In-memory isolated simulation: zero disk writes allowed
    };

    const now = Date.now();
    serverDb.data.users[ADMIN_ID] = {
      id: ADMIN_ID,
      email: 'mdebadulislam45@gmail.com',
      name: 'Sprint Staging Administrator',
      createdAt: now,
      updatedAt: now,
    };
    serverDb.data.users[CANDIDATE_A_ID] = {
      id: CANDIDATE_A_ID,
      email: 'candidate.a.staging@example.com',
      name: 'Candidate Alpha Staging',
      createdAt: now,
      updatedAt: now,
    };
    serverDb.data.users[CANDIDATE_B_ID] = {
      id: CANDIDATE_B_ID,
      email: 'candidate.b.staging@example.com',
      name: 'Candidate Beta Staging',
      createdAt: now,
      updatedAt: now,
    };
    serverDb.data.users[NON_ADMIN_ID] = {
      id: NON_ADMIN_ID,
      email: 'regular.user.staging@example.com',
      name: 'Regular Candidate',
      createdAt: now,
      updatedAt: now,
    };

    for (const uid of [CANDIDATE_A_ID, CANDIDATE_B_ID, NON_ADMIN_ID]) {
      serverDb.saveSubscription({
        userId: uid,
        planId: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false,
        currentPeriodStart: now - 5 * 86400_000,
        currentPeriodEnd: now + 25 * 86400_000,
        updatedAt: now,
      });
    }

    ADMIN_TOKEN = serverDb.createSession(ADMIN_ID, 'staging-admin-agent', '127.0.0.1').token;
    CANDIDATE_A_TOKEN = serverDb.createSession(CANDIDATE_A_ID, 'staging-cand-agent', '127.0.0.1').token;
    CANDIDATE_B_TOKEN = serverDb.createSession(CANDIDATE_B_ID, 'staging-cand-agent', '127.0.0.1').token;
    NON_ADMIN_TOKEN = serverDb.createSession(NON_ADMIN_ID, 'staging-cand-agent', '127.0.0.1').token;
  });

  after(() => {
    try {
      inFlightFactoryGenerations.clear();
      inFlightAdminDraftReviewLocks.clear();
      factoryGenerationRateLimitMap.clear();
      if ((serverDb as any).saveTimeout) {
        clearTimeout((serverDb as any).saveTimeout);
        (serverDb as any).saveTimeout = null;
      }
      // Revert in-memory database to pristine snapshot
      serverDb.data = JSON.parse(inMemorySnapshot);
    } finally {
      if (originalPersistSync) {
        (serverDb as any).persistSync = originalPersistSync;
      }
    }

    // Verify bit-for-bit file integrity
    const postRawDisk = fs.readFileSync(STORE_PATH);
    const postSha256 = crypto.createHash('sha256').update(postRawDisk).digest('hex');
    assert.equal(postRawDisk.length, preTestDiskSize, '.data/sprint_store.json byte size must match baseline exactly');
    assert.equal(postSha256, preTestDiskSha256, '.data/sprint_store.json SHA-256 must match baseline exactly');
  });

  describe('1. Academic Reading Module Workflow & Security Gate Dry-Run', { concurrency: false }, () => {
    const DRAFT_READING_PENDING = 'stage_draft_rd_pending_12f9';
    const DRAFT_READING_REJECT = 'stage_draft_rd_reject_12f9';
    const DRAFT_READING_INVALID = 'stage_draft_rd_invalid_12f9';

    it('Scenario A: verifies PENDING_REVIEW retrieval and candidate launch prohibition', () => {
      serverDb.data.aiDraftExams[DRAFT_READING_PENDING] = {
        id: DRAFT_READING_PENDING,
        userId: CANDIDATE_A_ID,
        examType: 'academic_reading',
        model: 'gemini-3.8-flash',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: buildValidReadingContent(),
        validationFindings: {
          passed: true,
          structuralOk: true,
          answersOk: true,
          evidenceOk: true,
          qualityOk: true,
          errors: [],
          warnings: [],
        },
        createdAt: Date.now() - 60_000,
        updatedAt: Date.now() - 60_000,
      };

      // Admin can retrieve detail
      const adminGet = createMockReqRes({
        token: ADMIN_TOKEN,
        params: { id: DRAFT_READING_PENDING },
      });
      handleAdminGetAiDraftById(adminGet.req, adminGet.res);
      assert.equal(adminGet.res.getStatusCode(), 200);
      assert.equal(adminGet.res.getBody().draft.id, DRAFT_READING_PENDING);
      assert.equal(adminGet.res.getBody().draft.status, 'PENDING_REVIEW');

      // Candidate cannot launch pending draft
      const candLaunch = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: DRAFT_READING_PENDING },
      });
      handleGetReadingPilot(candLaunch.req, candLaunch.res);
      assert.equal(candLaunch.res.getStatusCode(), 400);
      assert.equal(candLaunch.res.getBody().code, 'DRAFT_NOT_APPROVED');
    });

    it('Scenario B: simulates successful admin approval and candidate pilot launch with passage structure', async () => {
      const approveCall = createMockReqRes({
        token: ADMIN_TOKEN,
        params: { id: DRAFT_READING_PENDING },
        body: { action: 'approve', module: 'academic_reading', notes: 'Verified academic passage depth' },
      });
      await handleAdminApproveAiDraft(approveCall.req, approveCall.res);
      assert.equal(approveCall.res.getStatusCode(), 200);
      assert.equal(approveCall.res.getBody().success, true);
      assert.equal(approveCall.res.getBody().draft.status, 'APPROVED');

      // Candidate can now launch the approved draft
      const candLaunch = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: DRAFT_READING_PENDING },
      });
      handleGetReadingPilot(candLaunch.req, candLaunch.res);
      assert.equal(candLaunch.res.getStatusCode(), 200);
      const examSet = candLaunch.res.getBody().examSet;
      assert.ok(examSet);
      assert.equal(examSet.format, 'Academic');
      assert.ok(examSet.readingPassage.includes('Passage 1:'));
      assert.ok(examSet.readingPassage.includes('Passage 2:'));
      assert.ok(examSet.readingPassage.includes('Passage 3:'));
      assert.equal(examSet.questions.length, 40);
      assert.ok(examSet.questions[0].explanation.length > 0);
    });

    it('Scenario C: simulates admin rejection and verifies candidate launch denial', async () => {
      serverDb.data.aiDraftExams[DRAFT_READING_REJECT] = {
        id: DRAFT_READING_REJECT,
        userId: CANDIDATE_A_ID,
        examType: 'academic_reading',
        model: 'gemini-3.8-flash',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: buildValidReadingContent(),
        validationFindings: { passed: true, structuralOk: true, answersOk: true, evidenceOk: true, qualityOk: true, errors: [], warnings: [] },
        createdAt: Date.now() - 30_000,
        updatedAt: Date.now() - 30_000,
      };

      const rejectCall = createMockReqRes({
        token: ADMIN_TOKEN,
        params: { id: DRAFT_READING_REJECT },
        body: { action: 'reject', reason: 'Passage 2 text complexity insufficient for academic tier.' },
      });
      await handleAdminRejectAiDraft(rejectCall.req, rejectCall.res);
      assert.equal(rejectCall.res.getStatusCode(), 200);
      assert.equal(rejectCall.res.getBody().draft.status, 'REJECTED');
      assert.match(rejectCall.res.getBody().draft.rejectionReason, /Passage 2 text complexity/);

      // Candidate launch is blocked
      const candLaunch = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: DRAFT_READING_REJECT },
      });
      handleGetReadingPilot(candLaunch.req, candLaunch.res);
      assert.equal(candLaunch.res.getStatusCode(), 400);
      assert.equal(candLaunch.res.getBody().code, 'DRAFT_NOT_APPROVED');
    });

    it('Scenario D: blocks approval of malformed Reading draft (missing passage)', async () => {
      serverDb.data.aiDraftExams[DRAFT_READING_INVALID] = {
        id: DRAFT_READING_INVALID,
        userId: CANDIDATE_A_ID,
        examType: 'academic_reading',
        model: 'gemini-3.8-flash',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED', // Falsified status to test server-side validator re-check
        repairAttempts: 0,
        content: {
          examId: 'rd_malformed_12f9',
          title: 'Truncated Reading Draft',
          format: 'Academic',
          passages: [
            {
              id: 'p1',
              passageNumber: 1,
              title: 'Only One Passage',
              text: 'Short text',
              wordCount: 10,
              questions: [],
            },
          ],
        },
        validationFindings: { passed: true, structuralOk: true, answersOk: true, evidenceOk: true, qualityOk: true, errors: [], warnings: [] },
        createdAt: Date.now() - 20_000,
        updatedAt: Date.now() - 20_000,
      };

      const approveCall = createMockReqRes({
        token: ADMIN_TOKEN,
        params: { id: DRAFT_READING_INVALID },
        body: { action: 'approve' },
      });
      await handleAdminApproveAiDraft(approveCall.req, approveCall.res);
      assert.equal(approveCall.res.getStatusCode(), 400);
      assert.equal(approveCall.res.getBody().code, 'STRUCTURAL_VALIDATION_FAILED');
    });

    it('Scenario E: enforces cross-user isolation and non-admin approval rejection', async () => {
      // Non-admin cannot approve
      const nonAdminCall = createMockReqRes({
        token: NON_ADMIN_TOKEN,
        params: { id: DRAFT_READING_PENDING },
        body: { action: 'approve' },
      });
      await handleAdminApproveAiDraft(nonAdminCall.req, nonAdminCall.res);
      assert.equal(nonAdminCall.res.getStatusCode(), 403);

      // Candidate B cannot launch Candidate A's draft
      const crossUserCall = createMockReqRes({
        token: CANDIDATE_B_TOKEN,
        params: { id: DRAFT_READING_PENDING },
      });
      handleGetReadingPilot(crossUserCall.req, crossUserCall.res);
      assert.equal(crossUserCall.res.getStatusCode(), 403);
    });
  });

  describe('2. Listening Module Workflow & Security Gate Dry-Run', { concurrency: false }, () => {
    const DRAFT_LISTENING_PENDING = 'stage_draft_ls_pending_12f9';
    const DRAFT_LISTENING_REJECT = 'stage_draft_ls_reject_12f9';
    const DRAFT_LISTENING_INVALID = 'stage_draft_ls_invalid_12f9';

    it('Scenario A: verifies PENDING_REVIEW state and launch gate', () => {
      serverDb.data.aiDraftExams[DRAFT_LISTENING_PENDING] = {
        id: DRAFT_LISTENING_PENDING,
        userId: CANDIDATE_A_ID,
        examType: 'listening',
        model: 'gemini-3.8-flash',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: buildValidListeningContent(),
        validationFindings: { passed: true, structuralOk: true, answersOk: true, evidenceOk: true, qualityOk: true, errors: [], warnings: [] },
        createdAt: Date.now() - 50_000,
        updatedAt: Date.now() - 50_000,
      };

      const candLaunch = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: DRAFT_LISTENING_PENDING },
      });
      handleGetListeningPilot(candLaunch.req, candLaunch.res);
      assert.equal(candLaunch.res.getStatusCode(), 400);
      assert.equal(candLaunch.res.getBody().code, 'DRAFT_NOT_APPROVED');
    });

    it('Scenario B: simulates approval and verifies 4 sections, 40 questions, and script evidence', async () => {
      const approveCall = createMockReqRes({
        token: ADMIN_TOKEN,
        params: { id: DRAFT_LISTENING_PENDING },
        body: { action: 'approve', module: 'listening' },
      });
      await handleAdminApproveAiDraft(approveCall.req, approveCall.res);
      assert.equal(approveCall.res.getStatusCode(), 200);

      const candLaunch = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: DRAFT_LISTENING_PENDING },
      });
      handleGetListeningPilot(candLaunch.req, candLaunch.res);
      assert.equal(candLaunch.res.getStatusCode(), 200);
      const examSet = candLaunch.res.getBody().examSet;
      assert.ok(examSet);
      assert.ok(examSet.listeningSections[1]);
      assert.ok(examSet.listeningSections[2]);
      assert.ok(examSet.listeningSections[3]);
      assert.ok(examSet.listeningSections[4]);
      assert.ok(examSet.listeningSections[1].script.length > 50);
      assert.ok(examSet.listeningSections[4].script.length > 50);
      assert.equal(examSet.questions.length, 40);
      assert.ok(examSet.questions[0].explanation.length > 0);
    });

    it('Scenario C: simulates rejection with reason and asserts launch blocked', async () => {
      serverDb.data.aiDraftExams[DRAFT_LISTENING_REJECT] = {
        id: DRAFT_LISTENING_REJECT,
        userId: CANDIDATE_A_ID,
        examType: 'listening',
        model: 'gemini-3.8-flash',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: buildValidListeningContent(),
        validationFindings: { passed: true, structuralOk: true, answersOk: true, evidenceOk: true, qualityOk: true, errors: [], warnings: [] },
        createdAt: Date.now() - 40_000,
        updatedAt: Date.now() - 40_000,
      };

      const rejectCall = createMockReqRes({
        token: ADMIN_TOKEN,
        params: { id: DRAFT_LISTENING_REJECT },
        body: { action: 'reject', reason: 'Section 4 monologue script is repetitive.' },
      });
      await handleAdminRejectAiDraft(rejectCall.req, rejectCall.res);
      assert.equal(rejectCall.res.getStatusCode(), 200);
      assert.equal(rejectCall.res.getBody().draft.status, 'REJECTED');

      const candLaunch = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: DRAFT_LISTENING_REJECT },
      });
      handleGetListeningPilot(candLaunch.req, candLaunch.res);
      assert.equal(candLaunch.res.getStatusCode(), 400);
      assert.equal(candLaunch.res.getBody().code, 'DRAFT_NOT_APPROVED');
    });

    it('Scenario D: rejects approval if Listening section question count is below 40', async () => {
      serverDb.data.aiDraftExams[DRAFT_LISTENING_INVALID] = {
        id: DRAFT_LISTENING_INVALID,
        userId: CANDIDATE_A_ID,
        examType: 'listening',
        model: 'gemini-3.8-flash',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: {
          examId: 'ls_trunc_12f9',
          title: 'Truncated Listening',
          format: 'Academic',
          sections: [
            { id: 's1', sectionNumber: 1, title: 'Sec 1', speakers: ['A'], script: 'Short script', questions: [] },
          ],
        },
        validationFindings: { passed: true, structuralOk: true, answersOk: true, evidenceOk: true, qualityOk: true, errors: [], warnings: [] },
        createdAt: Date.now() - 10_000,
        updatedAt: Date.now() - 10_000,
      };

      const approveCall = createMockReqRes({
        token: ADMIN_TOKEN,
        params: { id: DRAFT_LISTENING_INVALID },
        body: { action: 'approve' },
      });
      await handleAdminApproveAiDraft(approveCall.req, approveCall.res);
      assert.equal(approveCall.res.getStatusCode(), 400);
      assert.equal(approveCall.res.getBody().code, 'STRUCTURAL_VALIDATION_FAILED');
    });

    it('Scenario E: blocks module mismatch on approval route', async () => {
      const mismatchCall = createMockReqRes({
        token: ADMIN_TOKEN,
        params: { id: DRAFT_LISTENING_PENDING },
        body: { action: 'approve', module: 'writing' }, // Draft is listening
      });
      await handleAdminApproveAiDraft(mismatchCall.req, mismatchCall.res);
      assert.equal(mismatchCall.res.getStatusCode(), 400);
      assert.equal(mismatchCall.res.getBody().code, 'MODULE_MISMATCH');
    });
  });

  describe('3. Writing Module Workflow & Security Gate Dry-Run', { concurrency: false }, () => {
    const DRAFT_WRITING_PENDING = 'stage_draft_wrt_pending_12f9';
    const DRAFT_WRITING_REJECT = 'stage_draft_wrt_reject_12f9';
    const DRAFT_WRITING_INVALID = 'stage_draft_wrt_invalid_12f9';

    it('Scenario A: verifies PENDING_REVIEW draft status and launch block', () => {
      serverDb.data.aiDraftExams[DRAFT_WRITING_PENDING] = {
        id: DRAFT_WRITING_PENDING,
        userId: CANDIDATE_A_ID,
        examType: 'writing',
        model: 'gemini-3.8-flash',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: buildValidWritingContent(),
        validationFindings: { passed: true, structuralOk: true, answersOk: true, evidenceOk: true, qualityOk: true, errors: [], warnings: [] },
        createdAt: Date.now() - 40_000,
        updatedAt: Date.now() - 40_000,
      };

      const candLaunch = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: DRAFT_WRITING_PENDING },
      });
      handleGetWritingPilot(candLaunch.req, candLaunch.res);
      assert.equal(candLaunch.res.getStatusCode(), 400);
      assert.equal(candLaunch.res.getBody().code, 'DRAFT_NOT_APPROVED');
    });

    it('Scenario B: approves draft and converts to CDIELTSWritingExamRoom test set structure', async () => {
      const approveCall = createMockReqRes({
        token: ADMIN_TOKEN,
        params: { id: DRAFT_WRITING_PENDING },
        body: { action: 'approve', module: 'writing' },
      });
      await handleAdminApproveAiDraft(approveCall.req, approveCall.res);
      assert.equal(approveCall.res.getStatusCode(), 200);

      const candLaunch = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: DRAFT_WRITING_PENDING },
      });
      handleGetWritingPilot(candLaunch.req, candLaunch.res);
      assert.equal(candLaunch.res.getStatusCode(), 200);
      const rawExamSet = candLaunch.res.getBody().examSet;

      // Adapt to exam room format
      const roomTestSet = convertDraftToWritingTestSet(rawExamSet);
      assert.ok(roomTestSet);
      assert.equal(roomTestSet.badge, 'AI PILOT — APPROVED PRACTICE');
      assert.ok(roomTestSet.task1Prompt.length > 20);
      assert.equal(roomTestSet.task1ChartTitle, 'Solar Power Generation 2015-2025');
      assert.equal(roomTestSet.task1VisualData.chartType, 'bar');
      assert.ok(roomTestSet.task2Prompt.length > 20);
      assert.equal(rawExamSet.task1.suggestedTimeMinutes, 20);
      assert.equal(rawExamSet.task1.minWordLimit, 150);
      assert.equal(rawExamSet.task2.suggestedTimeMinutes, 40);
      assert.equal(rawExamSet.task2.minWordLimit, 250);
    });

    it('Scenario C: rejects draft and verifies rejectionReason', async () => {
      serverDb.data.aiDraftExams[DRAFT_WRITING_REJECT] = {
        id: DRAFT_WRITING_REJECT,
        userId: CANDIDATE_A_ID,
        examType: 'writing',
        model: 'gemini-3.8-flash',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: buildValidWritingContent(),
        validationFindings: { passed: true, structuralOk: true, answersOk: true, evidenceOk: true, qualityOk: true, errors: [], warnings: [] },
        createdAt: Date.now() - 30_000,
        updatedAt: Date.now() - 30_000,
      };

      const rejectCall = createMockReqRes({
        token: ADMIN_TOKEN,
        params: { id: DRAFT_WRITING_REJECT },
        body: { action: 'reject', reason: 'Task 1 bar chart data points do not match summary description.' },
      });
      await handleAdminRejectAiDraft(rejectCall.req, rejectCall.res);
      assert.equal(rejectCall.res.getStatusCode(), 200);
      assert.equal(rejectCall.res.getBody().draft.status, 'REJECTED');
    });

    it('Scenario D: rejects approval if Writing Task 1 visualData is missing', async () => {
      const invalidWritingContent = buildValidWritingContent();
      delete (invalidWritingContent.task1 as any).visualData;

      serverDb.data.aiDraftExams[DRAFT_WRITING_INVALID] = {
        id: DRAFT_WRITING_INVALID,
        userId: CANDIDATE_A_ID,
        examType: 'writing',
        model: 'gemini-3.8-flash',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: invalidWritingContent,
        validationFindings: { passed: true, structuralOk: true, answersOk: true, evidenceOk: true, qualityOk: true, errors: [], warnings: [] },
        createdAt: Date.now() - 10_000,
        updatedAt: Date.now() - 10_000,
      };

      const approveCall = createMockReqRes({
        token: ADMIN_TOKEN,
        params: { id: DRAFT_WRITING_INVALID },
        body: { action: 'approve' },
      });
      await handleAdminApproveAiDraft(approveCall.req, approveCall.res);
      assert.equal(approveCall.res.getStatusCode(), 400);
      assert.equal(approveCall.res.getBody().code, 'STRUCTURAL_VALIDATION_FAILED');
    });

    it('Scenario E: handles idempotent approval and locks against concurrent review actions', async () => {
      // Re-approving already APPROVED draft returns idempotent 200
      const reApproveCall = createMockReqRes({
        token: ADMIN_TOKEN,
        params: { id: DRAFT_WRITING_PENDING },
        body: { action: 'approve' },
      });
      await handleAdminApproveAiDraft(reApproveCall.req, reApproveCall.res);
      assert.equal(reApproveCall.res.getStatusCode(), 200);
      assert.equal(reApproveCall.res.getBody().idempotent, true);
      assert.equal(reApproveCall.res.getBody().alreadyApproved, true);

      // Lock contention returns 409
      inFlightAdminDraftReviewLocks.add('stage_locked_test_draft');
      try {
        const lockedCall = createMockReqRes({
          token: ADMIN_TOKEN,
          params: { id: 'stage_locked_test_draft' },
          body: { action: 'approve' },
        });
        await handleAdminApproveAiDraft(lockedCall.req, lockedCall.res);
        assert.equal(lockedCall.res.getStatusCode(), 409);
        assert.equal(lockedCall.res.getBody().code, 'REVIEW_IN_PROGRESS');
      } finally {
        inFlightAdminDraftReviewLocks.delete('stage_locked_test_draft');
      }
    });
  });

  describe('4. Speaking Module Workflow & Security Gate Dry-Run', { concurrency: false }, () => {
    const DRAFT_SPEAKING_PENDING = 'stage_draft_spk_pending_12f9';
    const DRAFT_SPEAKING_REJECT = 'stage_draft_spk_reject_12f9';
    const DRAFT_SPEAKING_INVALID = 'stage_draft_spk_invalid_12f9';

    it('Scenario A: verifies PENDING_REVIEW draft status and launch block', () => {
      serverDb.data.aiDraftExams[DRAFT_SPEAKING_PENDING] = {
        id: DRAFT_SPEAKING_PENDING,
        userId: CANDIDATE_A_ID,
        examType: 'speaking',
        model: 'gemini-3.8-flash',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: buildValidSpeakingContent(),
        validationFindings: { passed: true, structuralOk: true, answersOk: true, evidenceOk: true, qualityOk: true, errors: [], warnings: [] },
        createdAt: Date.now() - 30_000,
        updatedAt: Date.now() - 30_000,
      };

      const candLaunch = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: DRAFT_SPEAKING_PENDING },
      });
      handleGetSpeakingPilot(candLaunch.req, candLaunch.res);
      assert.equal(candLaunch.res.getStatusCode(), 400);
      assert.equal(candLaunch.res.getBody().code, 'DRAFT_NOT_APPROVED');
    });

    it('Scenario B: approves Speaking draft and adapts for VoiceExaminer turn structure', async () => {
      const approveCall = createMockReqRes({
        token: ADMIN_TOKEN,
        params: { id: DRAFT_SPEAKING_PENDING },
        body: { action: 'approve', module: 'speaking' },
      });
      await handleAdminApproveAiDraft(approveCall.req, approveCall.res);
      assert.equal(approveCall.res.getStatusCode(), 200);

      const candLaunch = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: DRAFT_SPEAKING_PENDING },
      });
      handleGetSpeakingPilot(candLaunch.req, candLaunch.res);
      assert.equal(candLaunch.res.getStatusCode(), 200);
      const rawExamSet = candLaunch.res.getBody().examSet;

      // Adapt nested set for VoiceExaminer
      const adapted = adaptSpeakingPilotSetForExaminer(rawExamSet);
      assert.ok(adapted);
      assert.equal(adapted.bannerText, 'AI PILOT — APPROVED PRACTICE');
      assert.equal(adapted.part1Questions.length, 8); // 4 in studies, 4 in architecture
      assert.equal(adapted.part2CueCard.preparationTimeSeconds, 60);
      assert.equal(adapted.part2CueCard.speakingTimeSeconds, 120);
      assert.equal(adapted.part2CueCard.cueCardPrompts.length, 4);
      assert.equal(adapted.part3Questions.length, 4);
      assert.ok(adapted.part3Questions[0].followUps.length > 0);
    });

    it('Scenario C: rejects Speaking draft and verifies rejection reasons', async () => {
      serverDb.data.aiDraftExams[DRAFT_SPEAKING_REJECT] = {
        id: DRAFT_SPEAKING_REJECT,
        userId: CANDIDATE_A_ID,
        examType: 'speaking',
        model: 'gemini-3.8-flash',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: buildValidSpeakingContent(),
        validationFindings: { passed: true, structuralOk: true, answersOk: true, evidenceOk: true, qualityOk: true, errors: [], warnings: [] },
        createdAt: Date.now() - 20_000,
        updatedAt: Date.now() - 20_000,
      };

      const rejectCall = createMockReqRes({
        token: ADMIN_TOKEN,
        params: { id: DRAFT_SPEAKING_REJECT },
        body: { action: 'reject', reason: 'Part 3 questions do not connect logically to Part 2 facility topic.' },
      });
      await handleAdminRejectAiDraft(rejectCall.req, rejectCall.res);
      assert.equal(rejectCall.res.getStatusCode(), 200);
      assert.equal(rejectCall.res.getBody().draft.status, 'REJECTED');
      assert.match(rejectCall.res.getBody().draft.rejectionReason, /Part 3 questions do not connect/);
    });

    it('Scenario D: rejects approval if Part 2 cue card is missing bullet prompts', async () => {
      const invalidSpeakingContent = buildValidSpeakingContent();
      (invalidSpeakingContent.part2 as any).bulletPrompts = [];

      serverDb.data.aiDraftExams[DRAFT_SPEAKING_INVALID] = {
        id: DRAFT_SPEAKING_INVALID,
        userId: CANDIDATE_A_ID,
        examType: 'speaking',
        model: 'gemini-3.8-flash',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: invalidSpeakingContent,
        validationFindings: { passed: true, structuralOk: true, answersOk: true, evidenceOk: true, qualityOk: true, errors: [], warnings: [] },
        createdAt: Date.now() - 5_000,
        updatedAt: Date.now() - 5_000,
      };

      const approveCall = createMockReqRes({
        token: ADMIN_TOKEN,
        params: { id: DRAFT_SPEAKING_INVALID },
        body: { action: 'approve' },
      });
      await handleAdminApproveAiDraft(approveCall.req, approveCall.res);
      assert.equal(approveCall.res.getStatusCode(), 400);
      assert.equal(approveCall.res.getBody().code, 'STRUCTURAL_VALIDATION_FAILED');
    });

    it('Scenario E: blocks wrong-module pilot launch attempt (requesting Speaking ID via Reading endpoint)', () => {
      const wrongModuleCall = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: DRAFT_SPEAKING_PENDING }, // Speaking draft ID
      });
      handleGetReadingPilot(wrongModuleCall.req, wrongModuleCall.res);
      assert.equal(wrongModuleCall.res.getStatusCode(), 400);
      assert.equal(wrongModuleCall.res.getBody().code, 'MODULE_MISMATCH');
    });
  });

  describe('5. Cross-Module Isolation, Deduplication, Replay & Invariant Verification', { concurrency: false }, () => {
    it('verifies that no synthetic draft IDs leaked into disk store', () => {
      const rawDisk = fs.readFileSync(STORE_PATH, 'utf8');
      assert.equal(rawDisk.includes('stage_draft_rd_pending_12f9'), false);
      assert.equal(rawDisk.includes('stage_draft_ls_pending_12f9'), false);
      assert.equal(rawDisk.includes('stage_draft_wrt_pending_12f9'), false);
      assert.equal(rawDisk.includes('stage_draft_spk_pending_12f9'), false);
      assert.equal(rawDisk.includes('usr_stage_admin_12f9'), false);
      assert.equal(rawDisk.includes('usr_stage_cand_a_12f9'), false);
    });

    it('verifies that pre-existing drafts in disk store were never modified, approved, or rejected', () => {
      const storeOnDisk = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
      const drafts = Object.values(storeOnDisk.aiDraftExams || {});
      assert.equal(drafts.length, 22);

      const statusCounts = drafts.reduce((acc: any, d: any) => {
        acc[d.status] = (acc[d.status] || 0) + 1;
        return acc;
      }, {});
      assert.equal(statusCounts['PENDING_REVIEW'], 11);
      assert.equal(statusCounts['VALIDATION_FAILED'], 7);
      assert.equal(statusCounts['GENERATING'], 4);
      assert.equal(statusCounts['APPROVED'] || 0, 0);
      assert.equal(statusCounts['REJECTED'] || 0, 0);
    });
  });
});
