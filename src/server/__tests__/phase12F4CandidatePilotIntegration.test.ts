import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import {
  handleGenerateReading,
  handleListReadingDrafts,
  handleGetReadingDraftById,
  handleGetReadingPilot,
  handleGenerateListening,
  handleListListeningDrafts,
  handleGetListeningDraftById,
  handleGetListeningPilot,
  handleGenerateWriting,
  handleListWritingDrafts,
  handleGetWritingDraftById,
  handleGetWritingPilot,
  handleGenerateSpeaking,
  handleListSpeakingDrafts,
  handleGetSpeakingDraftById,
  handleGetSpeakingPilot,
  handleAdminApproveAiDraft,
  handleAdminRejectAiDraft,
  inFlightAdminDraftReviewLocks,
  factoryGenerationRateLimitMap,
} from '../../../server.ts';
import { serverDb } from '../../server/db.ts';
import {
  questionFactory,
  verifyCandidatePilotDraftEligibility,
  inFlightFactoryGenerations,
} from '../../server/ai/questionFactory.ts';
import {
  resolveCandidateAuthHeaders,
  getCandidateDraftStatusDescriptor,
  shouldApplyCandidateDraftUpdate,
  createBoundedDraftPoller,
  generateCandidatePilotDraft,
  fetchCandidateModuleDrafts,
  fetchCandidateDraftStatusById,
  fetchApprovedCandidatePilotExamSet,
  adaptSpeakingPilotSetForExaminer,
  type CandidateDraftSummaryItem,
} from '../../services/candidateAiPilotService.ts';
import {
  convertDraftToWritingTestSet,
  ACADEMIC_WRITING_SETS,
  GENERAL_TRAINING_WRITING_SETS,
} from '../../components/cdielts/CDIELTSWritingExamRoom.tsx';
import { MOCK_EXAM_SETS } from '../../data/mockExams.ts';
import { extractActiveReadingPassage } from '../mockExamScoring.ts';

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
        prompt: `Statement for Academic Reading question ${qId} in passage ${pNum}.`,
        correctAnswer: 'TRUE',
        passageEvidence: `empirical research findings in passage ${pNum}`,
        explanation: `Directly supported by passage ${pNum}.`,
      };
    });
    return {
      id: `passage_${pNum}`,
      passageNumber: pNum,
      title: `Academic Reading Passage ${pNum}`,
      text: Array.from(
        { length: 70 },
        (_, i) =>
          `Paragraph ${(i % 5) + 1} sentence ${i + 1} presents empirical research findings in passage ${pNum} regarding climate resilience and ecological adaptation.`
      ).join(' '),
      wordCount: 770,
      questions,
    };
  });

  return {
    examId: 'rd_valid_12f4',
    title: 'Phase 12F.4 Academic Reading Pilot',
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
        prompt: `Listening section ${secNum} question ${qId} completion item.`,
        correctAnswer: 'library',
        scriptEvidence: `verified audio transcript evidence in section ${secNum}`,
        explanation: `Stated in section ${secNum}.`,
      };
    });
    return {
      id: `sec_${secNum}`,
      sectionNumber: secNum,
      title: `Listening Section ${secNum}`,
      speakers: ['Speaker A', 'Speaker B'],
      script: Array.from(
        { length: 25 },
        (_, i) =>
          `Turn ${i + 1}: This segment contains verified audio transcript evidence in section ${secNum} for university orientation.`
      ).join(' '),
      wordCount: 250,
      questions,
    };
  });

  return {
    examId: 'lst_valid_12f4',
    title: 'Phase 12F.4 Listening Pilot',
    format: 'Academic',
    difficulty: 'Band 6.5–7.5',
    targetBand: 7.5,
    sections,
  };
}

function buildValidWritingContent(format: 'Academic' | 'General Training' = 'Academic') {
  if (format === 'General Training') {
    return {
      examId: 'wrt_gt_valid_12f4',
      schemaVersion: '1.0' as const,
      title: 'Phase 12F.4 General Training Writing Pilot',
      format: 'General Training' as const,
      difficulty: 'Band 6.5–7.5' as const,
      targetBand: 7.5,
      task1: {
        id: 'wrt_gt_t1_12f4',
        schemaVersion: '1.0' as const,
        format: 'General Training' as const,
        taskCategory: 'task1' as const,
        questionType: 'formal' as const,
        scenarioCategory: 'complaint' as const,
        salutationInstruction: 'Dear Sir or Madam,',
        prompt:
          'You recently attended a professional conference at a local convention centre and experienced an issue with the audio-visual equipment. Write a letter to the venue manager.',
        instructions: 'Write at least 150 words. You do NOT need to write any addresses.',
        suggestedTimeMinutes: 20,
        minWordLimit: 150,
        bulletPoints: [
          'Give details of the conference and when it took place',
          'Explain the problem with the audio-visual equipment',
          'Suggest how the venue should prevent this issue in future',
        ],
        keyFeaturesToReport: [
          'Clear purpose stated in opening paragraph',
          'Specific description of equipment malfunction',
          'Constructive recommendation for venue management',
        ],
      },
      task2: {
        id: 'wrt_gt_t2_12f4',
        schemaVersion: '1.0' as const,
        format: 'General Training' as const,
        taskCategory: 'task2' as const,
        questionType: 'discuss_both_views' as const,
        topicCategory: 'society' as const,
        prompt:
          'Some people believe municipal governments should prioritise public parks, while others argue public libraries deserve more funding. Discuss both views and give your own opinion.',
        questionText: 'Discuss both views and give your own opinion.',
        instructions:
          'Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
        suggestedTimeMinutes: 40,
        minWordLimit: 250,
        keyArgumentsToConsider: {
          sideA: ['Physical health and outdoor recreation benefits of urban parks'],
          sideB: ['Educational equity and digital access provided by public libraries'],
        },
      },
    };
  }

  return {
    examId: 'wrt_acad_valid_12f4',
    schemaVersion: '1.0' as const,
    title: 'Phase 12F.4 Academic Writing Pilot',
    format: 'Academic' as const,
    difficulty: 'Band 6.5–7.5' as const,
    targetBand: 7.5,
    task1: {
      id: 'wrt_acad_t1_12f4',
      schemaVersion: '1.0' as const,
      format: 'Academic' as const,
      taskCategory: 'task1' as const,
      questionType: 'bar' as const,
      prompt:
        'The bar chart below shows grid battery storage capacity (GWh) across three regions between 2015 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
      instructions: 'Write at least 150 words.',
      suggestedTimeMinutes: 20,
      minWordLimit: 150,
      visualData: {
        chartTitle: 'Grid Battery Storage Capacity (GWh)',
        units: 'GWh',
        xAxisLabel: 'Region',
        yAxisLabel: 'Capacity (GWh)',
        categories: ['North America', 'Europe', 'East Asia'],
        series: [
          { name: '2015', data: [4, 3, 6] },
          { name: '2025', data: [42, 38, 65] },
        ],
      },
      keyFeaturesToReport: [
        'Storage capacity expanded substantially across all three regions',
        'East Asia recorded the largest capacity in both 2015 and 2025',
        'North America and Europe experienced more than tenfold growth',
      ],
    },
    task2: {
      id: 'wrt_acad_t2_12f4',
      schemaVersion: '1.0' as const,
      format: 'Academic' as const,
      taskCategory: 'task2' as const,
      questionType: 'discuss_both_views' as const,
      topicCategory: 'environment' as const,
      prompt:
        'Some people think governments should fund household renewable energy installations directly, while others believe private companies and consumers should bear the cost. Discuss both views and give your own opinion.',
      questionText: 'Discuss both views and give your own opinion.',
      instructions:
        'Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
      suggestedTimeMinutes: 40,
      minWordLimit: 250,
      keyArgumentsToConsider: {
        sideA: ['Accelerated carbon reduction and equitable access through public subsidies'],
        sideB: ['Fiscal pressure on public budgets and market efficiency arguments'],
      },
    },
  };
}

function buildValidSpeakingContent() {
  return {
    examId: 'spk_valid_12f4',
    title: 'Phase 12F.4 Speaking Pilot — Architecture & Civic Space',
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
      id: 'sp2_cue_12f4',
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
      examinerIntro:
        'Now I am going to give you a topic and I would like you to talk about it for one to two minutes.',
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

describe('Phase 5.5H.12F.4 — Candidate AI Pilot Integration, Approval-Status UX & Launch Readiness', { concurrency: false }, () => {
  let preTestDiskSize = 0;
  let preTestDiskSha256 = '';
  let inMemorySnapshot = '';
  let originalPersistSync: any = null;

  const CANDIDATE_A_ID = 'usr_12f4_cand_a';
  let CANDIDATE_A_TOKEN = '';
  const CANDIDATE_B_ID = 'usr_12f4_cand_b';
  let CANDIDATE_B_TOKEN = '';
  const ADMIN_ID = 'usr_12f4_admin';
  let ADMIN_TOKEN = '';

  before(() => {
    const rawDisk = fs.readFileSync(STORE_PATH);
    preTestDiskSize = rawDisk.length;
    preTestDiskSha256 = crypto.createHash('sha256').update(rawDisk).digest('hex');
    inMemorySnapshot = JSON.stringify(serverDb.data);

    // Stub persistSync and clear any pending saveTimeout so no test ever writes to disk
    originalPersistSync = (serverDb as any).persistSync;
    if ((serverDb as any).saveTimeout) {
      clearTimeout((serverDb as any).saveTimeout);
      (serverDb as any).saveTimeout = null;
    }
    (serverDb as any).persistSync = () => {
      // No-op during isolated test execution
    };

    const now = Date.now();
    serverDb.data.users[CANDIDATE_A_ID] = {
      id: CANDIDATE_A_ID,
      email: 'candidate.a.12f4@example.com',
      name: 'Candidate Alpha',
      createdAt: now,
      updatedAt: now,
    };
    serverDb.data.users[CANDIDATE_B_ID] = {
      id: CANDIDATE_B_ID,
      email: 'candidate.b.12f4@example.com',
      name: 'Candidate Beta',
      createdAt: now,
      updatedAt: now,
    };
    serverDb.data.users[ADMIN_ID] = {
      id: ADMIN_ID,
      email: 'mdebadulislam45@gmail.com',
      name: 'Sprint Admin Reviewer',
      createdAt: now,
      updatedAt: now,
    };

    for (const uid of [CANDIDATE_A_ID, CANDIDATE_B_ID]) {
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

    CANDIDATE_A_TOKEN = serverDb.createSession(CANDIDATE_A_ID, 'test-agent', '127.0.0.1').token;
    CANDIDATE_B_TOKEN = serverDb.createSession(CANDIDATE_B_ID, 'test-agent', '127.0.0.1').token;
    ADMIN_TOKEN = serverDb.createSession(ADMIN_ID, 'test-agent', '127.0.0.1').token;
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
      serverDb.data = JSON.parse(inMemorySnapshot);
    } finally {
      if (originalPersistSync) {
        (serverDb as any).persistSync = originalPersistSync;
      }
    }

    const postRawDisk = fs.readFileSync(STORE_PATH);
    const postSha256 = crypto.createHash('sha256').update(postRawDisk).digest('hex');
    assert.equal(postRawDisk.length, preTestDiskSize, '.data/sprint_store.json byte size must remain unchanged');
    assert.equal(postSha256, preTestDiskSha256, '.data/sprint_store.json SHA-256 must remain unchanged');
  });

  describe('1. Session Token Resolution & Authentication Enforcement', { concurrency: false }, () => {
    it('resolves valid candidate Bearer session headers and rejects missing/empty tokens with 401 AUTH_SESSION_REQUIRED', () => {
      const headers = resolveCandidateAuthHeaders(CANDIDATE_A_TOKEN);
      assert.equal(headers.Authorization, `Bearer ${CANDIDATE_A_TOKEN}`);

      assert.throws(
        () => resolveCandidateAuthHeaders(''),
        (err: any) => err.status === 401 && err.code === 'AUTH_SESSION_REQUIRED'
      );
      assert.throws(
        () => resolveCandidateAuthHeaders(null),
        (err: any) => err.status === 401 && err.code === 'AUTH_SESSION_REQUIRED'
      );
    });

    it('rejects unauthenticated or user.id pseudo-tokens with 401 across all 4 module draft and pilot endpoints', () => {
      // Passing user.id instead of a real session token must fail with 401
      const wrongTokenCall = createMockReqRes({
        token: CANDIDATE_A_ID,
        params: { id: 'any_draft_id' },
      });
      handleListSpeakingDrafts(wrongTokenCall.req, wrongTokenCall.res);
      assert.equal(wrongTokenCall.res.getStatusCode(), 401);

      const pilotCall = createMockReqRes({
        token: CANDIDATE_A_ID,
        params: { id: 'any_draft_id' },
      });
      handleGetSpeakingPilot(pilotCall.req, pilotCall.res);
      assert.equal(pilotCall.res.getStatusCode(), 401);

      // Expired session token must fail with 401
      const expiredToken = 'tok_expired_session_test';
      serverDb.data.sessions[expiredToken] = {
        token: expiredToken,
        userId: CANDIDATE_A_ID,
        createdAt: Date.now() - 20_000,
        expiresAt: Date.now() - 10_000,
      };
      const expiredCall = createMockReqRes({
        token: expiredToken,
        params: { id: 'any_draft_id' },
      });
      handleGetReadingPilot(expiredCall.req, expiredCall.res);
      assert.equal(expiredCall.res.getStatusCode(), 401);
    });
  });

  describe('2. Candidate Status UX Descriptors, Monotonic Stale-Response Guard & Bounded Polling', { concurrency: false }, () => {
    it('maps all 6 persisted lifecycle states and derived UI presentation variants truthfully, never marking PENDING_REVIEW or non-APPROVED drafts as launchable', () => {
      // 1 of 6 persisted states: GENERATING
      const generating = getCandidateDraftStatusDescriptor({
        status: 'GENERATING',
        validationStatus: 'PASSED',
      });
      assert.equal(generating.canLaunch, false);
      assert.equal(generating.isTerminal, false);

      // 2 of 6 persisted states: PENDING_REVIEW
      const pending = getCandidateDraftStatusDescriptor({
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
      });
      assert.equal(pending.canLaunch, false);
      assert.equal(pending.isTerminal, false);
      assert.match(pending.badgeLabel, /Awaiting Administrator Review/i);
      assert.match(pending.headline, /Waiting for administrator review/i);
      assert.match(pending.nextAction, /Refresh Status/i);

      // 3 of 6 persisted states: APPROVED (valid / eligible variant)
      const approved = getCandidateDraftStatusDescriptor({
        status: 'APPROVED',
        validationStatus: 'PASSED',
      });
      assert.equal(approved.canLaunch, true);
      assert.equal(approved.isTerminal, true);
      assert.match(approved.badgeLabel, /Approved — Ready to Start/i);
      assert.match(approved.nextAction, /Start Approved AI Pilot/i);

      // Derived UI Presentation State: Persisted status is APPROVED, but validationStatus FAILED (ineligible)
      const approvedButIneligible = getCandidateDraftStatusDescriptor({
        status: 'APPROVED',
        validationStatus: 'FAILED',
      });
      assert.equal(approvedButIneligible.canLaunch, false);
      assert.equal(approvedButIneligible.isTerminal, true);
      assert.match(approvedButIneligible.badgeLabel, /Approved — Ineligible to Launch/i);
      assert.match(approvedButIneligible.headline, /structural checks are incomplete/i);
      assert.match(approvedButIneligible.nextAction, /cannot be launched/i);

      // Derived UI Presentation State: Persisted status is APPROVED, but validationStatus undefined
      const approvedMissingValidation = getCandidateDraftStatusDescriptor({
        status: 'APPROVED',
        validationStatus: undefined as any,
      });
      assert.equal(approvedMissingValidation.canLaunch, false);
      assert.equal(approvedMissingValidation.isTerminal, true);
      assert.match(approvedMissingValidation.badgeLabel, /Ineligible to Launch/i);

      // 4 of 6 persisted states: REJECTED
      const rejected = getCandidateDraftStatusDescriptor({
        status: 'REJECTED',
        validationStatus: 'PASSED',
        rejectionReason: 'Part 2 bullet points did not match topic.',
      });
      assert.equal(rejected.canLaunch, false);
      assert.equal(rejected.isTerminal, true);
      assert.equal(rejected.rejectionReason, 'Part 2 bullet points did not match topic.');
      assert.match(rejected.nextAction, /request a new practice draft/i);

      // 5 of 6 persisted states: VALIDATION_FAILED
      const valFailed = getCandidateDraftStatusDescriptor({
        status: 'VALIDATION_FAILED',
        validationStatus: 'FAILED',
      });
      assert.equal(valFailed.canLaunch, false);
      assert.equal(valFailed.isTerminal, true);
      assert.match(valFailed.nextAction, /Sprint practice tests/i);

      // 6 of 6 persisted states: FAILED
      const failed = getCandidateDraftStatusDescriptor({
        status: 'FAILED',
        validationStatus: 'FAILED',
      });
      assert.equal(failed.canLaunch, false);
      assert.equal(failed.isTerminal, true);
      assert.match(failed.description, /monthly generation quota/i);
      assert.doesNotMatch(failed.description, /daily/i);
      assert.match(failed.nextAction, /generating a new draft/i);
    });

    it('prevents stale polling responses or older timestamps from overwriting newer APPROVED/REJECTED states', () => {
      const approvedDraft: CandidateDraftSummaryItem = {
        id: 'draft_seq_1',
        createdAt: 1000,
        updatedAt: 2000,
        examType: 'writing',
        status: 'APPROVED',
        validationStatus: 'PASSED',
        repairAttempts: 0,
      };
      const stalePendingDraft: CandidateDraftSummaryItem = {
        id: 'draft_seq_1',
        createdAt: 1000,
        updatedAt: 1500,
        examType: 'writing',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
      };

      // 1. Stale sequence must be rejected
      assert.equal(
        shouldApplyCandidateDraftUpdate(approvedDraft, stalePendingDraft, 2, 3),
        false
      );
      // 2. Older timestamp must be rejected even if request sequence is higher
      assert.equal(
        shouldApplyCandidateDraftUpdate(approvedDraft, stalePendingDraft, 4, 3),
        false
      );
      // 3. Regressing from terminal APPROVED back to PENDING_REVIEW must be rejected even with newer timestamp
      assert.equal(
        shouldApplyCandidateDraftUpdate(
          approvedDraft,
          { ...stalePendingDraft, updatedAt: 2500 },
          4,
          3
        ),
        false
      );
      // 4. Regressing from terminal REJECTED back to GENERATING or PENDING_REVIEW must be rejected
      const rejectedDraft: CandidateDraftSummaryItem = {
        ...approvedDraft,
        status: 'REJECTED',
        rejectionReason: 'Topic mismatch',
      };
      assert.equal(
        shouldApplyCandidateDraftUpdate(
          rejectedDraft,
          { ...stalePendingDraft, status: 'GENERATING', updatedAt: 3000 },
          5,
          4
        ),
        false
      );
      // 5. Conflicting terminal states on equal or older timestamps must be rejected
      assert.equal(
        shouldApplyCandidateDraftUpdate(
          approvedDraft,
          { ...rejectedDraft, updatedAt: 2000 },
          4,
          3
        ),
        false
      );
      assert.equal(
        shouldApplyCandidateDraftUpdate(
          rejectedDraft,
          { ...approvedDraft, updatedAt: 2000 },
          4,
          3
        ),
        false
      );
      // 6. Missing or malformed timestamps must not bypass lifecycle protections
      const malformedDraft: CandidateDraftSummaryItem = {
        ...stalePendingDraft,
        updatedAt: undefined,
        createdAt: 0,
      };
      assert.equal(
        shouldApplyCandidateDraftUpdate(approvedDraft, malformedDraft, 4, 3),
        false
      );
      // 7. Non-terminal to terminal on equal timestamp must be accepted
      const pendingDraft: CandidateDraftSummaryItem = {
        id: 'draft_seq_2',
        createdAt: 1000,
        updatedAt: 1000,
        examType: 'academic_reading',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
      };
      const approvedDraftSameTs: CandidateDraftSummaryItem = {
        ...pendingDraft,
        status: 'APPROVED',
      };
      assert.equal(
        shouldApplyCandidateDraftUpdate(pendingDraft, approvedDraftSameTs, 3, 2),
        true
      );
    });

    it('pauses bounded polling when tab is hidden and stops automatically when draft reaches APPROVED or REJECTED', async () => {
      let hidden = true;
      let pollCalls = 0;
      const observedStatuses: string[] = [];
      let stopReason: string | null = null;

      const poller = createBoundedDraftPoller({
        intervalMs: 15,
        maxAttempts: 10,
        isHidden: () => hidden,
        pollFn: async () => {
          pollCalls += 1;
          return {
            id: 'draft_poll_test',
            createdAt: 1000,
            updatedAt: 1000 + pollCalls * 100,
            examType: 'speaking',
            status: pollCalls >= 2 ? 'APPROVED' : 'PENDING_REVIEW',
            validationStatus: 'PASSED',
            repairAttempts: 0,
          };
        },
        onUpdate: (draft) => {
          observedStatuses.push(draft.status);
        },
        onStop: (reason) => {
          stopReason = reason;
        },
      });

      poller.start();
      await new Promise((r) => setTimeout(r, 40));
      assert.equal(pollCalls, 0);

      hidden = false;
      await new Promise((r) => setTimeout(r, 70));
      assert.equal(poller.isRunning(), false);
      assert.equal(stopReason, 'terminal_status');
      assert.deepEqual(observedStatuses, ['PENDING_REVIEW', 'APPROVED']);
    });

    it('deduplicates concurrent in-flight candidate generation and pilot launch requests', async () => {
      let generateNetworkCalls = 0;
      const slowFetch: any = async () => {
        generateNetworkCalls += 1;
        await new Promise((r) => setTimeout(r, 40));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            draftId: 'draft_dedup_1',
            status: 'PENDING_REVIEW',
            validationStatus: 'PASSED',
          }),
        };
      };

      const p1 = generateCandidatePilotDraft({
        module: 'academic_reading',
        token: CANDIDATE_A_TOKEN,
        fetchImpl: slowFetch,
      });

      await assert.rejects(
        () =>
          generateCandidatePilotDraft({
            module: 'academic_reading',
            token: CANDIDATE_A_TOKEN,
            fetchImpl: slowFetch,
          }),
        (err: any) => err.status === 409 && err.code === 'GENERATION_ALREADY_IN_FLIGHT'
      );

      const res1 = await p1;
      assert.equal(res1.draftId, 'draft_dedup_1');
      assert.equal(generateNetworkCalls, 1);

      let launchNetworkCalls = 0;
      const slowLaunchFetch: any = async () => {
        launchNetworkCalls += 1;
        await new Promise((r) => setTimeout(r, 30));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            examSet: { id: 'draft_dedup_1', title: 'Approved Set' },
          }),
        };
      };

      const [l1, l2] = await Promise.all([
        fetchApprovedCandidatePilotExamSet('academic_reading', 'draft_dedup_1', {
          token: CANDIDATE_A_TOKEN,
          fetchImpl: slowLaunchFetch,
        }),
        fetchApprovedCandidatePilotExamSet('academic_reading', 'draft_dedup_1', {
          token: CANDIDATE_A_TOKEN,
          fetchImpl: slowLaunchFetch,
        }),
      ]);
      assert.equal(launchNetworkCalls, 1);
      assert.equal((l1 as any).id, 'draft_dedup_1');
      assert.equal((l2 as any).id, 'draft_dedup_1');
    });
  });

  describe('3. Negative Eligibility, Cross-User Ownership, Status & Malformed-Content Gates', { concurrency: false }, () => {
    before(() => {
      const now = Date.now();
      const states = [
        'GENERATING',
        'PENDING_REVIEW',
        'REJECTED',
        'VALIDATION_FAILED',
        'FAILED',
      ] as const;

      states.forEach((st) => {
        serverDb.data.aiDraftExams![`draft_state_${st}`] = {
          id: `draft_state_${st}`,
          userId: CANDIDATE_A_ID,
          model: 'gemini-3.8-flash',
          examType: 'speaking',
          status: st,
          validationStatus: st === 'VALIDATION_FAILED' || st === 'FAILED' ? 'FAILED' : 'PASSED',
          repairAttempts: 0,
          rejectionReason: st === 'REJECTED' ? 'Rejected during review' : undefined,
          createdAt: now,
          updatedAt: now,
          validationFindings: {
            passed: true,
            structuralOk: true,
            answersOk: true,
            evidenceOk: true,
            qualityOk: true,
            errors: [],
            warnings: [],
          },
          content: buildValidSpeakingContent(),
        };
      });

      // Malformed drafts marked APPROVED + PASSED across all 4 modules
      serverDb.data.aiDraftExams!['draft_malformed_reading'] = {
        id: 'draft_malformed_reading',
        userId: CANDIDATE_A_ID,
        model: 'gemini-3.8-flash',
        examType: 'academic_reading',
        status: 'APPROVED',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        createdAt: now,
        updatedAt: now,
        validationFindings: {
          passed: true,
          structuralOk: true,
          answersOk: true,
          evidenceOk: true,
          qualityOk: true,
          errors: [],
          warnings: [],
        },
        content: { title: 'Broken Reading', passages: [{ passageNumber: 1, text: 'Some text', questions: [] }] },
      };
      serverDb.data.aiDraftExams!['draft_malformed_listening'] = {
        id: 'draft_malformed_listening',
        userId: CANDIDATE_A_ID,
        model: 'gemini-3.8-flash',
        examType: 'listening',
        status: 'APPROVED',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        createdAt: now,
        updatedAt: now,
        validationFindings: {
          passed: true,
          structuralOk: true,
          answersOk: true,
          evidenceOk: true,
          qualityOk: true,
          errors: [],
          warnings: [],
        },
        content: { title: 'Broken Listening', sections: [{ sectionNumber: 1, script: '', questions: [{ id: 1, prompt: 'Q1' }] }] },
      };
      serverDb.data.aiDraftExams!['draft_malformed_writing'] = {
        id: 'draft_malformed_writing',
        userId: CANDIDATE_A_ID,
        model: 'gemini-3.8-flash',
        examType: 'writing',
        status: 'APPROVED',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        createdAt: now,
        updatedAt: now,
        validationFindings: {
          passed: true,
          structuralOk: true,
          answersOk: true,
          evidenceOk: true,
          qualityOk: true,
          errors: [],
          warnings: [],
        },
        content: { title: 'Broken Writing', task1: { prompt: 'Valid Task 1' }, task2: { prompt: '   ' } },
      };
      serverDb.data.aiDraftExams!['draft_malformed_speaking'] = {
        id: 'draft_malformed_speaking',
        userId: CANDIDATE_A_ID,
        model: 'gemini-3.8-flash',
        examType: 'speaking',
        status: 'APPROVED',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        createdAt: now,
        updatedAt: now,
        validationFindings: {
          passed: true,
          structuralOk: true,
          answersOk: true,
          evidenceOk: true,
          qualityOk: true,
          errors: [],
          warnings: [],
        },
        content: {
          title: 'Broken Speaking',
          part1: { topicGroups: [{ topicId: 'tg1', title: 'T1', questions: [] }] },
          part2: { topic: 'Cue Card', bulletPrompts: [] },
          part3: { themes: [] },
        },
      };
    });

    it('blocks launching GENERATING, PENDING_REVIEW, REJECTED, VALIDATION_FAILED, and FAILED drafts with 400 DRAFT_NOT_APPROVED', () => {
      for (const st of ['GENERATING', 'PENDING_REVIEW', 'REJECTED', 'VALIDATION_FAILED', 'FAILED']) {
        const call = createMockReqRes({
          token: CANDIDATE_A_TOKEN,
          params: { id: `draft_state_${st}` },
        });
        handleGetSpeakingPilot(call.req, call.res);
        assert.equal(call.res.getStatusCode(), 400, `Expected 400 for status ${st}`);
        assert.equal(call.res.getBody().code, 'DRAFT_NOT_APPROVED');
      }
    });

    it('blocks launching malformed drafts even if status is APPROVED and validationStatus is PASSED (400 INVALID_DRAFT_CONTENT)', () => {
      const rCall = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: 'draft_malformed_reading' },
      });
      handleGetReadingPilot(rCall.req, rCall.res);
      assert.equal(rCall.res.getStatusCode(), 400);
      assert.equal(rCall.res.getBody().code, 'INVALID_DRAFT_CONTENT');

      const lCall = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: 'draft_malformed_listening' },
      });
      handleGetListeningPilot(lCall.req, lCall.res);
      assert.equal(lCall.res.getStatusCode(), 400);
      assert.equal(lCall.res.getBody().code, 'INVALID_DRAFT_CONTENT');

      const wCall = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: 'draft_malformed_writing' },
      });
      handleGetWritingPilot(wCall.req, wCall.res);
      assert.equal(wCall.res.getStatusCode(), 400);
      assert.equal(wCall.res.getBody().code, 'INVALID_DRAFT_CONTENT');

      const sCall = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: 'draft_malformed_speaking' },
      });
      handleGetSpeakingPilot(sCall.req, sCall.res);
      assert.equal(sCall.res.getStatusCode(), 400);
      assert.equal(sCall.res.getBody().code, 'INVALID_DRAFT_CONTENT');
    });

    it('strips unpublished exam content, userId, and reviewedBy from candidate draft list and detail endpoints', () => {
      const detailCall = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: 'draft_state_PENDING_REVIEW' },
      });
      handleGetSpeakingDraftById(detailCall.req, detailCall.res);
      assert.equal(detailCall.res.getStatusCode(), 200);
      const draftMeta = detailCall.res.getBody().draft;
      assert.equal(draftMeta.id, 'draft_state_PENDING_REVIEW');
      assert.equal(draftMeta.status, 'PENDING_REVIEW');
      assert.equal(draftMeta.canLaunch, false);
      assert.equal('content' in draftMeta, false, 'Unpublished exam content must not be leaked in status endpoint');
      assert.equal('userId' in draftMeta, false);
      assert.equal('reviewedBy' in draftMeta, false);

      // Candidate B cannot view Candidate A's draft status (403)
      const crossUserCall = createMockReqRes({
        token: CANDIDATE_B_TOKEN,
        params: { id: 'draft_state_PENDING_REVIEW' },
      });
      handleGetSpeakingDraftById(crossUserCall.req, crossUserCall.res);
      assert.equal(crossUserCall.res.getStatusCode(), 403);
    });
  });

  describe('4. Positive End-to-End Candidate Journey Across All 4 Modules (Generate -> Await Review -> Admin Approve -> Candidate Launch)', { concurrency: false }, () => {
    let readingDraftId = '';
    let listeningDraftId = '';
    let writingAcademicDraftId = '';
    let writingGtDraftId = '';
    let speakingDraftId = '';

    it('generates valid drafts across all 4 modules using mocked factory output (no live Gemini calls), leaving each in PENDING_REVIEW', async () => {
      const origGenReading = questionFactory.generateAcademicReadingPilot;
      const origGenListening = questionFactory.generateListeningPilot;
      const origGenWriting = questionFactory.generateWritingPilot;
      const origGenSpeaking = questionFactory.generateSpeakingPilot;

      try {
        questionFactory.generateAcademicReadingPilot = async ({ userId }) => {
          const draft: any = {
            id: 'draft_e2e_reading',
            userId,
            model: 'gemini-3.8-flash',
            examType: 'academic_reading',
            status: 'PENDING_REVIEW',
            validationStatus: 'PASSED',
            repairAttempts: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            validationFindings: {
              passed: true,
              structuralOk: true,
              answersOk: true,
              evidenceOk: true,
              qualityOk: true,
              errors: [],
              warnings: [],
            },
            content: buildValidReadingContent(),
          };
          serverDb.saveAiDraftExam(draft);
          return {
            draft,
            validation: {
              passed: true,
              structuralOk: true,
              answersOk: true,
              evidenceOk: true,
              qualityOk: true,
              errors: [],
              warnings: [],
              stats: { passageCount: 3, totalQuestions: 40, passageQuestions: [13, 13, 14], wordCounts: [770, 770, 770] },
            },
          };
        };

        questionFactory.generateListeningPilot = async ({ userId }) => {
          const draft: any = {
            id: 'draft_e2e_listening',
            userId,
            model: 'gemini-3.8-flash',
            examType: 'listening',
            status: 'PENDING_REVIEW',
            validationStatus: 'PASSED',
            repairAttempts: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            validationFindings: {
              passed: true,
              structuralOk: true,
              answersOk: true,
              evidenceOk: true,
              qualityOk: true,
              errors: [],
              warnings: [],
            },
            content: buildValidListeningContent(),
          };
          serverDb.saveAiDraftExam(draft);
          return {
            draft,
            validation: {
              passed: true,
              structuralOk: true,
              answersOk: true,
              evidenceOk: true,
              qualityOk: true,
              errors: [],
              warnings: [],
              stats: { passageCount: 4, totalQuestions: 40, passageQuestions: [10, 10, 10, 10], wordCounts: [250, 250, 250, 250] },
            },
          };
        };

        questionFactory.generateWritingPilot = async ({ userId, format }) => {
          const isGt = format === 'General Training';
          const draft: any = {
            id: isGt ? 'draft_e2e_writing_gt' : 'draft_e2e_writing_acad',
            userId,
            model: 'gemini-3.8-flash',
            examType: 'writing',
            status: 'PENDING_REVIEW',
            validationStatus: 'PASSED',
            repairAttempts: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            validationFindings: {
              passed: true,
              structuralOk: true,
              answersOk: true,
              evidenceOk: true,
              qualityOk: true,
              errors: [],
              warnings: [],
            },
            content: buildValidWritingContent(isGt ? 'General Training' : 'Academic'),
          };
          serverDb.saveAiDraftExam(draft);
          return {
            draft,
            validation: {
              passed: true,
              structuralOk: true,
              answersOk: true,
              evidenceOk: true,
              qualityOk: true,
              errors: [],
              warnings: [],
              stats: { passageCount: 2, totalQuestions: 2, passageQuestions: [1, 1], wordCounts: [175, 280] },
            },
          };
        };

        questionFactory.generateSpeakingPilot = async ({ userId }) => {
          const draft: any = {
            id: 'draft_e2e_speaking',
            userId,
            model: 'gemini-3.8-flash',
            examType: 'speaking',
            status: 'PENDING_REVIEW',
            validationStatus: 'PASSED',
            repairAttempts: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            validationFindings: {
              passed: true,
              structuralOk: true,
              answersOk: true,
              evidenceOk: true,
              qualityOk: true,
              errors: [],
              warnings: [],
            },
            content: buildValidSpeakingContent(),
          };
          serverDb.saveAiDraftExam(draft);
          return {
            draft,
            validation: {
              passed: true,
              structuralOk: true,
              answersOk: true,
              evidenceOk: true,
              qualityOk: true,
              errors: [],
              warnings: [],
              stats: { passageCount: 3, totalQuestions: 13, passageQuestions: [8, 1, 4], wordCounts: [120, 90, 150] },
            },
          };
        };

        const rGen = createMockReqRes({ token: CANDIDATE_A_TOKEN, body: { topicSeed: 'Hydrology' } });
        await handleGenerateReading(rGen.req, rGen.res);
        assert.equal(rGen.res.getStatusCode(), 200);
        assert.equal(rGen.res.getBody().status, 'PENDING_REVIEW');
        readingDraftId = rGen.res.getBody().draftId;

        factoryGenerationRateLimitMap.clear();
        const lGen = createMockReqRes({ token: CANDIDATE_A_TOKEN, body: { topicSeed: 'Seminar' } });
        await handleGenerateListening(lGen.req, lGen.res);
        assert.equal(lGen.res.getStatusCode(), 200);
        assert.equal(lGen.res.getBody().status, 'PENDING_REVIEW');
        listeningDraftId = lGen.res.getBody().draftId;

        factoryGenerationRateLimitMap.clear();
        const wAcadGen = createMockReqRes({ token: CANDIDATE_A_TOKEN, body: { format: 'Academic' } });
        await handleGenerateWriting(wAcadGen.req, wAcadGen.res);
        assert.equal(wAcadGen.res.getStatusCode(), 200);
        assert.equal(wAcadGen.res.getBody().status, 'PENDING_REVIEW');
        writingAcademicDraftId = wAcadGen.res.getBody().draftId;

        factoryGenerationRateLimitMap.clear();
        const wGtGen = createMockReqRes({ token: CANDIDATE_A_TOKEN, body: { format: 'General Training' } });
        await handleGenerateWriting(wGtGen.req, wGtGen.res);
        assert.equal(wGtGen.res.getStatusCode(), 200);
        assert.equal(wGtGen.res.getBody().status, 'PENDING_REVIEW');
        writingGtDraftId = wGtGen.res.getBody().draftId;

        factoryGenerationRateLimitMap.clear();
        const sGen = createMockReqRes({ token: CANDIDATE_A_TOKEN, body: { format: 'Academic', difficulty: 'Challenging' } });
        await handleGenerateSpeaking(sGen.req, sGen.res);
        assert.equal(sGen.res.getStatusCode(), 200);
        assert.equal(sGen.res.getBody().status, 'PENDING_REVIEW');
        speakingDraftId = sGen.res.getBody().draftId;
      } finally {
        questionFactory.generateAcademicReadingPilot = origGenReading;
        questionFactory.generateListeningPilot = origGenListening;
        questionFactory.generateWritingPilot = origGenWriting;
        questionFactory.generateSpeakingPilot = origGenSpeaking;
      }
    });

    it('blocks candidate from launching any of the newly generated PENDING_REVIEW drafts before admin review', () => {
      const rPilot = createMockReqRes({ token: CANDIDATE_A_TOKEN, params: { id: readingDraftId } });
      handleGetReadingPilot(rPilot.req, rPilot.res);
      assert.equal(rPilot.res.getStatusCode(), 400);
      assert.equal(rPilot.res.getBody().code, 'DRAFT_NOT_APPROVED');

      const lPilot = createMockReqRes({ token: CANDIDATE_A_TOKEN, params: { id: listeningDraftId } });
      handleGetListeningPilot(lPilot.req, lPilot.res);
      assert.equal(lPilot.res.getStatusCode(), 400);

      const wPilot = createMockReqRes({ token: CANDIDATE_A_TOKEN, params: { id: writingAcademicDraftId } });
      handleGetWritingPilot(wPilot.req, wPilot.res);
      assert.equal(wPilot.res.getStatusCode(), 400);

      const sPilot = createMockReqRes({ token: CANDIDATE_A_TOKEN, params: { id: speakingDraftId } });
      handleGetSpeakingPilot(sPilot.req, sPilot.res);
      assert.equal(sPilot.res.getStatusCode(), 400);
    });

    it('transitions drafts to APPROVED via explicit admin review and unlocks candidate pilot retrieval & adapters across all 4 modules', async () => {
      for (const id of [
        readingDraftId,
        listeningDraftId,
        writingAcademicDraftId,
        writingGtDraftId,
        speakingDraftId,
      ]) {
        const appCall = createMockReqRes({ token: ADMIN_TOKEN, params: { id } });
        await handleAdminApproveAiDraft(appCall.req, appCall.res);
        assert.equal(appCall.res.getStatusCode(), 200, `Admin approval failed for ${id}: ${JSON.stringify(appCall.res.getBody())}`);
      }

      // 1. Academic Reading Pilot Retrieval & Passage Extraction
      const rPilot = createMockReqRes({ token: CANDIDATE_A_TOKEN, params: { id: readingDraftId } });
      handleGetReadingPilot(rPilot.req, rPilot.res);
      assert.equal(rPilot.res.getStatusCode(), 200);
      const readingExamSet = rPilot.res.getBody().examSet;
      assert.equal(readingExamSet.badge, 'AI PILOT');
      assert.equal(readingExamSet.questions.length, 40);
      const extractedP2 = extractActiveReadingPassage(readingExamSet, readingExamSet.questions[15]);
      assert.equal(extractedP2.passageNumber, 2);
      assert.equal(extractedP2.allPassageBlocks.length, 3);
      assert.match(extractedP2.activePassageText, /Passage 2/i);

      // 2. Listening Pilot Retrieval & Section Verification
      const lPilot = createMockReqRes({ token: CANDIDATE_A_TOKEN, params: { id: listeningDraftId } });
      handleGetListeningPilot(lPilot.req, lPilot.res);
      assert.equal(lPilot.res.getStatusCode(), 200);
      const listeningExamSet = lPilot.res.getBody().examSet;
      assert.equal(listeningExamSet.badge, 'AI PILOT');
      assert.equal(listeningExamSet.questions.length, 40);
      assert.equal(listeningExamSet.listeningSections[1].isAvailable, true);
      assert.equal(listeningExamSet.listeningSections[4].isAvailable, true);

      // 3. Writing Academic & General Training Pilot Retrieval & convertDraftToWritingTestSet Adaptation
      const wAcadPilot = createMockReqRes({ token: CANDIDATE_A_TOKEN, params: { id: writingAcademicDraftId } });
      handleGetWritingPilot(wAcadPilot.req, wAcadPilot.res);
      assert.equal(wAcadPilot.res.getStatusCode(), 200);
      const writingAcadSet = convertDraftToWritingTestSet(wAcadPilot.res.getBody().examSet);
      assert.equal(writingAcadSet.badge, 'AI PILOT — APPROVED PRACTICE');
      assert.equal(writingAcadSet.format, 'Academic');
      assert.deepEqual(writingAcadSet.task1Categories, ['North America', 'Europe', 'East Asia']);
      assert.equal(writingAcadSet.task1Series?.length, 2);

      const wGtPilot = createMockReqRes({ token: CANDIDATE_A_TOKEN, params: { id: writingGtDraftId } });
      handleGetWritingPilot(wGtPilot.req, wGtPilot.res);
      assert.equal(wGtPilot.res.getStatusCode(), 200);
      const writingGtSet = convertDraftToWritingTestSet(wGtPilot.res.getBody().examSet);
      assert.equal(writingGtSet.badge, 'AI PILOT — APPROVED PRACTICE');
      assert.equal(writingGtSet.format, 'General Training');
      assert.equal(writingGtSet.task1LetterType, 'Formal');
      assert.equal(writingGtSet.task1BulletPoints?.length, 3);

      // 4. Speaking Pilot Retrieval & Nested Schema Adaptation (part1.topicGroups, part2, part3.themes)
      const sPilot = createMockReqRes({ token: CANDIDATE_A_TOKEN, params: { id: speakingDraftId } });
      handleGetSpeakingPilot(sPilot.req, sPilot.res);
      assert.equal(sPilot.res.getStatusCode(), 200);
      const speakingExamSet = sPilot.res.getBody().examSet;
      assert.equal(Array.isArray(speakingExamSet.part1.topicGroups), true);
      assert.equal(speakingExamSet.part1.topicGroups.length, 2);
      assert.equal(Array.isArray(speakingExamSet.part2.bulletPrompts), true);
      assert.equal(speakingExamSet.part2.bulletPrompts.length, 4);
      assert.equal(Array.isArray(speakingExamSet.part3.themes), true);
      assert.equal(speakingExamSet.part3.themes.length, 2);

      const adaptedSpeaking = adaptSpeakingPilotSetForExaminer(speakingExamSet);
      assert.equal(adaptedSpeaking.bannerText, 'AI PILOT — APPROVED PRACTICE');
      assert.equal(adaptedSpeaking.part1TopicGroups.length, 2);
      assert.equal(adaptedSpeaking.part1Questions.length, 8);
      assert.equal(adaptedSpeaking.part2CueCard.cueCardPrompts?.length, 4);
      assert.equal(adaptedSpeaking.part2CueCard.preparationTimeSeconds, 60);
      assert.equal(adaptedSpeaking.part2CueCard.speakingTimeSeconds, 120);
      assert.equal(adaptedSpeaking.part3Themes.length, 2);
      assert.equal(adaptedSpeaking.part3Questions.length, 4);
      assert.ok(adaptedSpeaking.part3Questions[0].examinerProbeNotes);
    });

    it('preserves static Sprint & Writing practice sets untouched without pollution', () => {
      assert.equal(MOCK_EXAM_SETS.length, 5);
      assert.ok(ACADEMIC_WRITING_SETS.length >= 1);
      assert.ok(GENERAL_TRAINING_WRITING_SETS.length >= 1);
      assert.equal(
        MOCK_EXAM_SETS.some((s) => s.id.startsWith('draft_e2e')),
        false
      );
    });
  });
});
