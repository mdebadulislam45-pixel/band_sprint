import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Server } from 'node:http';

import {
  app,
  inFlightAdminDraftReviewLocks,
  factoryGenerationRateLimitMap,
} from '../../../server.ts';
import { serverDb } from '../../server/db.ts';
import {
  inFlightFactoryGenerations,
} from '../../server/ai/questionFactory.ts';
import {
  convertDraftToWritingTestSet,
} from '../../components/cdielts/CDIELTSWritingExamRoom.tsx';
import {
  adaptSpeakingPilotSetForExaminer,
} from '../../services/candidateAiPilotService.ts';

const STORE_PATH = path.resolve(process.cwd(), '.data', 'sprint_store.json');

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
      id: `passage_http_${pNum}`,
      passageNumber: pNum,
      title: `Academic Reading Passage ${pNum} — HTTP Integration`,
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
    examId: 'rd_http_valid_12f10',
    title: 'Academic Reading HTTP Integration Test',
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
      id: `sec_http_${secNum}`,
      sectionNumber: secNum,
      title: `Listening Section ${secNum} — Student Housing`,
      speakers: ['Officer', 'Applicant'],
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
    examId: 'ls_http_valid_12f10',
    title: 'Listening HTTP Integration Test',
    format: 'Academic',
    difficulty: 'Band 6.5–7.5',
    targetBand: 7.5,
    sections,
  };
}

function buildValidWritingContent() {
  return {
    examId: 'wrt_http_valid_12f10',
    schemaVersion: '1.0' as const,
    title: 'Writing HTTP Integration Test — Academic',
    format: 'Academic' as const,
    difficulty: 'Band 6.5–7.5' as const,
    targetBand: 7.5,
    task1: {
      id: 'wrt_http_t1_12f10',
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
      id: 'wrt_http_t2_12f10',
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
    examId: 'spk_http_valid_12f10',
    title: 'Speaking HTTP Integration Test — Civic Architecture',
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
      id: 'sp2_cue_http_12f10',
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

describe('Phase 5.5H.12F.10 — Four-Module Real Application HTTP Integration & Acceptance', { concurrency: false }, () => {
  let preTestDiskSize = 0;
  let preTestDiskSha256 = '';
  let inMemorySnapshot = '';
  let originalPersistSync: any = null;

  let server: Server;
  let baseUrl = '';

  const ADMIN_ID = 'usr_http_admin_12f10';
  let ADMIN_TOKEN = '';
  const CANDIDATE_A_ID = 'usr_http_cand_a_12f10';
  let CANDIDATE_A_TOKEN = '';
  const CANDIDATE_B_ID = 'usr_http_cand_b_12f10';
  let CANDIDATE_B_TOKEN = '';
  const NON_ADMIN_ID = 'usr_http_nonadmin_12f10';
  let NON_ADMIN_TOKEN = '';

  before(async () => {
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
      email: 'candidate.a.http@example.com',
      name: 'Candidate Alpha HTTP',
      createdAt: now,
      updatedAt: now,
    };
    serverDb.data.users[CANDIDATE_B_ID] = {
      id: CANDIDATE_B_ID,
      email: 'candidate.b.http@example.com',
      name: 'Candidate Beta HTTP',
      createdAt: now,
      updatedAt: now,
    };
    serverDb.data.users[NON_ADMIN_ID] = {
      id: NON_ADMIN_ID,
      email: 'regular.user.http@example.com',
      name: 'Regular Candidate HTTP',
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

    ADMIN_TOKEN = serverDb.createSession(ADMIN_ID, 'http-admin-agent', '127.0.0.1').token;
    CANDIDATE_A_TOKEN = serverDb.createSession(CANDIDATE_A_ID, 'http-cand-agent', '127.0.0.1').token;
    CANDIDATE_B_TOKEN = serverDb.createSession(CANDIDATE_B_ID, 'http-cand-agent', '127.0.0.1').token;
    NON_ADMIN_TOKEN = serverDb.createSession(NON_ADMIN_ID, 'http-cand-agent', '127.0.0.1').token;

    // 3. Start ephemeral HTTP server on dynamic port
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    // 1. Close HTTP server
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }

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

    // 2. Verify bit-for-bit file integrity
    const postRawDisk = fs.readFileSync(STORE_PATH);
    const postSha256 = crypto.createHash('sha256').update(postRawDisk).digest('hex');
    assert.equal(postRawDisk.length, preTestDiskSize, '.data/sprint_store.json byte size must match baseline exactly');
    assert.equal(postSha256, preTestDiskSha256, '.data/sprint_store.json SHA-256 must match baseline exactly');
  });

  describe('1. Real HTTP Admin Authentication & Workflow Integration', { concurrency: false }, () => {
    it('rejects unauthenticated request to /api/admin/ai-drafts with 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ai-drafts`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Authentication required.');
    });

    it('rejects non-admin authenticated request with 403 Access denied', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ai-drafts`, {
        headers: { Authorization: `Bearer ${NON_ADMIN_TOKEN}` },
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /Administrator privileges required/i);
    });

    it('retrieves draft list via HTTP with pagination and module filter', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ai-drafts?limit=10&page=1`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(Array.isArray(data.drafts));
      assert.ok((data.pagination?.total ?? data.totalMatching) >= 0);
      assert.ok(data.counts);
    });

    it('rejects invalid or missing draft ID on detail endpoint with 404', async () => {
      const res = await fetch(`${baseUrl}/api/admin/ai-drafts/non_existent_draft_id`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      });
      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.code, 'DRAFT_NOT_FOUND');
    });

    it('enforces module mismatch protection on draft detail endpoint', async () => {
      // Seed a reading draft
      const draftId = 'stage_http_draft_rd_mismatch';
      serverDb.data.aiDraftExams[draftId] = {
        id: draftId,
        userId: CANDIDATE_A_ID,
        examType: 'academic_reading',
        model: 'gemini-3.8-flash',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: buildValidReadingContent(),
        validationFindings: { passed: true, structuralOk: true, answersOk: true, evidenceOk: true, qualityOk: true, errors: [], warnings: [] },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const res = await fetch(`${baseUrl}/api/admin/ai-drafts/${draftId}?module=listening`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.code, 'MODULE_MISMATCH');
    });
  });

  describe('2. Real HTTP Candidate Authentication & Gating Across All Modules', { concurrency: false }, () => {
    it('rejects unauthenticated candidate requests with 401 across all 4 module pilot endpoints', async () => {
      const endpoints = [
        `${baseUrl}/api/ai/reading/pilot/any_id`,
        `${baseUrl}/api/ai/listening/pilot/any_id`,
        `${baseUrl}/api/ai/writing/pilot/any_id`,
        `${baseUrl}/api/ai/speaking/pilot/any_id`,
      ];
      for (const ep of endpoints) {
        const res = await fetch(ep);
        assert.equal(res.status, 401);
        const data = await res.json();
        assert.equal(data.error, 'Authentication required.');
      }
    });

    it('rejects unapproved drafts with 400 DRAFT_NOT_APPROVED across all 4 modules', async () => {
      const moduleDrafts: Array<{ ep: string; type: any; content: any }> = [
        { ep: 'reading', type: 'academic_reading', content: buildValidReadingContent() },
        { ep: 'listening', type: 'listening', content: buildValidListeningContent() },
        { ep: 'writing', type: 'writing', content: buildValidWritingContent() },
        { ep: 'speaking', type: 'speaking', content: buildValidSpeakingContent() },
      ];

      for (const item of moduleDrafts) {
        const dId = `stage_http_pending_${item.ep}`;
        serverDb.data.aiDraftExams[dId] = {
          id: dId,
          userId: CANDIDATE_A_ID,
          examType: item.type,
          model: 'gemini-3.8-flash',
          status: 'PENDING_REVIEW',
          validationStatus: 'PASSED',
          repairAttempts: 0,
          content: item.content,
          validationFindings: { passed: true, structuralOk: true, answersOk: true, evidenceOk: true, qualityOk: true, errors: [], warnings: [] },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const res = await fetch(`${baseUrl}/api/ai/${item.ep}/pilot/${dId}`, {
          headers: { Authorization: `Bearer ${CANDIDATE_A_TOKEN}` },
        });
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.equal(data.code, 'DRAFT_NOT_APPROVED');
      }
    });

    it('enforces cross-user ownership isolation: candidate B cannot launch candidate A draft', async () => {
      const draftId = 'stage_http_ownership_test';
      serverDb.data.aiDraftExams[draftId] = {
        id: draftId,
        userId: CANDIDATE_A_ID,
        examType: 'academic_reading',
        model: 'gemini-3.8-flash',
        status: 'APPROVED',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: buildValidReadingContent(),
        validationFindings: { passed: true, structuralOk: true, answersOk: true, evidenceOk: true, qualityOk: true, errors: [], warnings: [] },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const res = await fetch(`${baseUrl}/api/ai/reading/pilot/${draftId}`, {
        headers: { Authorization: `Bearer ${CANDIDATE_B_TOKEN}` },
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.error, 'Access denied.');
    });

    it('blocks wrong-module pilot endpoint requests with 400 MODULE_MISMATCH', async () => {
      const draftId = 'stage_http_wrong_module_test';
      serverDb.data.aiDraftExams[draftId] = {
        id: draftId,
        userId: CANDIDATE_A_ID,
        examType: 'speaking',
        model: 'gemini-3.8-flash',
        status: 'APPROVED',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: buildValidSpeakingContent(),
        validationFindings: { passed: true, structuralOk: true, answersOk: true, evidenceOk: true, qualityOk: true, errors: [], warnings: [] },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Request speaking draft ID on reading endpoint
      const res = await fetch(`${baseUrl}/api/ai/reading/pilot/${draftId}`, {
        headers: { Authorization: `Bearer ${CANDIDATE_A_TOKEN}` },
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.code, 'MODULE_MISMATCH');
    });
  });

  describe('3. Real HTTP End-to-End Approval, Delivery & Adapter Handoff', { concurrency: false }, () => {
    it('Reading: approves via HTTP POST and launches into LiveMockTest structure', async () => {
      const draftId = 'stage_http_e2e_reading';
      serverDb.data.aiDraftExams[draftId] = {
        id: draftId,
        userId: CANDIDATE_A_ID,
        examType: 'academic_reading',
        model: 'gemini-3.8-flash',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: buildValidReadingContent(),
        validationFindings: { passed: true, structuralOk: true, answersOk: true, evidenceOk: true, qualityOk: true, errors: [], warnings: [] },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 1. Admin approves via HTTP
      const approveRes = await fetch(`${baseUrl}/api/admin/ai-drafts/${draftId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'approve', module: 'academic_reading' }),
      });
      assert.equal(approveRes.status, 200);
      const approveData = await approveRes.json();
      assert.equal(approveData.success, true);
      assert.equal(approveData.draft.status, 'APPROVED');

      // 2. Candidate retrieves examSet via HTTP
      const launchRes = await fetch(`${baseUrl}/api/ai/reading/pilot/${draftId}`, {
        headers: { Authorization: `Bearer ${CANDIDATE_A_TOKEN}` },
      });
      assert.equal(launchRes.status, 200);
      const launchData = await launchRes.json();
      assert.equal(launchData.success, true);
      const examSet = launchData.examSet;
      assert.ok(examSet);
      assert.equal(examSet.format, 'Academic');
      assert.ok(examSet.readingPassage.includes('Passage 1:'));
      assert.ok(examSet.readingPassage.includes('Passage 2:'));
      assert.ok(examSet.readingPassage.includes('Passage 3:'));
      assert.equal(examSet.questions.length, 40);
    });

    it('Listening: approves via HTTP POST and delivers 4 sections and 40 questions', async () => {
      const draftId = 'stage_http_e2e_listening';
      serverDb.data.aiDraftExams[draftId] = {
        id: draftId,
        userId: CANDIDATE_A_ID,
        examType: 'listening',
        model: 'gemini-3.8-flash',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: buildValidListeningContent(),
        validationFindings: { passed: true, structuralOk: true, answersOk: true, evidenceOk: true, qualityOk: true, errors: [], warnings: [] },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 1. Admin approves via HTTP
      const approveRes = await fetch(`${baseUrl}/api/admin/ai-drafts/${draftId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'approve', module: 'listening' }),
      });
      assert.equal(approveRes.status, 200);

      // 2. Candidate launches via HTTP
      const launchRes = await fetch(`${baseUrl}/api/ai/listening/pilot/${draftId}`, {
        headers: { Authorization: `Bearer ${CANDIDATE_A_TOKEN}` },
      });
      assert.equal(launchRes.status, 200);
      const launchData = await launchRes.json();
      const examSet = launchData.examSet;
      assert.ok(examSet.listeningSections[1]);
      assert.ok(examSet.listeningSections[2]);
      assert.ok(examSet.listeningSections[3]);
      assert.ok(examSet.listeningSections[4]);
      assert.equal(examSet.questions.length, 40);
    });

    it('Writing: approves via HTTP POST and adapts for CDIELTSWritingExamRoom', async () => {
      const draftId = 'stage_http_e2e_writing';
      serverDb.data.aiDraftExams[draftId] = {
        id: draftId,
        userId: CANDIDATE_A_ID,
        examType: 'writing',
        model: 'gemini-3.8-flash',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: buildValidWritingContent(),
        validationFindings: { passed: true, structuralOk: true, answersOk: true, evidenceOk: true, qualityOk: true, errors: [], warnings: [] },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 1. Admin approves via HTTP
      const approveRes = await fetch(`${baseUrl}/api/admin/ai-drafts/${draftId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'approve', module: 'writing' }),
      });
      assert.equal(approveRes.status, 200);

      // 2. Candidate launches via HTTP
      const launchRes = await fetch(`${baseUrl}/api/ai/writing/pilot/${draftId}`, {
        headers: { Authorization: `Bearer ${CANDIDATE_A_TOKEN}` },
      });
      assert.equal(launchRes.status, 200);
      const rawExamSet = (await launchRes.json()).examSet;

      // 3. Exam Room Adapter
      const roomTestSet = convertDraftToWritingTestSet(rawExamSet);
      assert.ok(roomTestSet);
      assert.equal(roomTestSet.badge, 'AI PILOT — APPROVED PRACTICE');
      assert.equal(roomTestSet.task1ChartTitle, 'Solar Power Generation 2015-2025');
      assert.equal(roomTestSet.task1VisualData.chartType, 'bar');
      assert.equal(rawExamSet.task1.minWordLimit, 150);
      assert.equal(rawExamSet.task2.minWordLimit, 250);
    });

    it('Speaking: approves via HTTP POST and adapts for VoiceExaminer turn structure', async () => {
      const draftId = 'stage_http_e2e_speaking';
      serverDb.data.aiDraftExams[draftId] = {
        id: draftId,
        userId: CANDIDATE_A_ID,
        examType: 'speaking',
        model: 'gemini-3.8-flash',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        content: buildValidSpeakingContent(),
        validationFindings: { passed: true, structuralOk: true, answersOk: true, evidenceOk: true, qualityOk: true, errors: [], warnings: [] },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 1. Admin approves via HTTP
      const approveRes = await fetch(`${baseUrl}/api/admin/ai-drafts/${draftId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'approve', module: 'speaking' }),
      });
      assert.equal(approveRes.status, 200);

      // 2. Candidate launches via HTTP
      const launchRes = await fetch(`${baseUrl}/api/ai/speaking/pilot/${draftId}`, {
        headers: { Authorization: `Bearer ${CANDIDATE_A_TOKEN}` },
      });
      assert.equal(launchRes.status, 200);
      const rawExamSet = (await launchRes.json()).examSet;

      // 3. Voice Examiner Adapter
      const adapted = adaptSpeakingPilotSetForExaminer(rawExamSet);
      assert.ok(adapted);
      assert.equal(adapted.bannerText, 'AI PILOT — APPROVED PRACTICE');
      assert.equal(adapted.part1Questions.length, 8);
      assert.equal(adapted.part2CueCard.preparationTimeSeconds, 60);
      assert.equal(adapted.part2CueCard.speakingTimeSeconds, 120);
      assert.equal(adapted.part3Questions.length, 4);
    });
  });

  describe('4. Persistent Store Invariant & Zero-Mutation Gate', { concurrency: false }, () => {
    it('verifies that no synthetic draft IDs leaked into disk store', () => {
      const rawDisk = fs.readFileSync(STORE_PATH, 'utf8');
      assert.equal(rawDisk.includes('stage_http_'), false);
      assert.equal(rawDisk.includes('usr_http_'), false);
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
