import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  handleAdminListAiDrafts,
  handleAdminGetAiDraftById,
  handleAdminApproveAiDraft,
  handleAdminRejectAiDraft,
  handleGetReadingPilot,
  handleGetListeningPilot,
  handleGetWritingPilot,
  handleGetSpeakingPilot,
  handleRevalidateWritingDraft,
  inFlightAdminDraftReviewLocks
} from '../../../server';
import { serverDb, type AIDraftExam } from '../../server/db';

const STORE_PATH = path.resolve(process.cwd(), '.data', 'sprint_store.json');

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
        explanation: `Directly supported by passage ${pNum}.`
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
      questions
    };
  });

  return {
    examId: 'rd_valid_12f3',
    title: 'IELTS Academic Reading Test — Phase 12F.3',
    format: 'Academic',
    difficulty: 'Band 6.5–7.5',
    targetBand: 7.5,
    passages
  };
}

function createValidListeningContent() {
  let qCounter = 1;
  const sections = [1, 2, 3, 4].map(secNum => {
    const questions = Array.from({ length: 10 }, () => {
      const qId = qCounter++;
      return {
        id: qId,
        type: 'form_completion',
        prompt: `Listening section ${secNum} question ${qId} completion item.`,
        correctAnswer: 'library',
        scriptEvidence: `verified audio transcript evidence in section ${secNum}`,
        explanation: `Stated in section ${secNum}.`
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
      questions
    };
  });

  return {
    examId: 'lst_valid_12f3',
    title: 'IELTS Listening Test — Phase 12F.3',
    format: 'Academic',
    difficulty: 'Band 6.5–7.5',
    targetBand: 7.5,
    sections
  };
}

function createValidWritingContent() {
  return {
    examId: 'wrt_valid_12f3',
    schemaVersion: '1.0' as const,
    title: 'IELTS Academic Writing Test — Phase 12F.3',
    format: 'Academic' as const,
    difficulty: 'Band 6.5–7.5' as const,
    targetBand: 7.5,
    task1: {
      id: 'wrt_t1_12f3',
      schemaVersion: '1.0' as const,
      format: 'Academic' as const,
      taskCategory: 'task1' as const,
      questionType: 'bar' as const,
      prompt:
        'The bar chart below shows the percentage of households adopting solar energy across four European nations between 2015 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
      instructions: 'Write at least 150 words.',
      suggestedTimeMinutes: 20,
      minWordLimit: 150,
      visualData: {
        chartTitle: 'Household Solar Energy Adoption (2015–2025)',
        units: 'Percentage (%)',
        xAxisLabel: 'Country',
        yAxisLabel: 'Households (%)',
        categories: ['Netherlands', 'Germany', 'Spain', 'UK'],
        series: [
          { name: '2015', data: [18, 25, 14, 12] },
          { name: '2025', data: [52, 61, 47, 36] }
        ]
      },
      keyFeaturesToReport: [
        'Solar adoption rose substantially in all four nations',
        'Germany maintained the highest adoption rate in both years',
        'Spain and the Netherlands more than tripled their shares'
      ]
    },
    task2: {
      id: 'wrt_t2_12f3',
      schemaVersion: '1.0' as const,
      format: 'Academic' as const,
      taskCategory: 'task2' as const,
      questionType: 'discuss_both_views' as const,
      topicCategory: 'environment' as const,
      prompt:
        'Some people think governments should fund household renewable energy installations directly, while others believe private companies and consumers should bear the cost. Discuss both views and give your own opinion.',
      questionText: 'Discuss both views and give your own opinion.',
      instructions: 'Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
      suggestedTimeMinutes: 40,
      minWordLimit: 250,
      keyArgumentsToConsider: {
        sideA: ['Accelerated carbon reduction and equitable access through public subsidies'],
        sideB: ['Fiscal pressure on public budgets and market efficiency arguments']
      }
    }
  };
}

function createValidSpeakingContent() {
  return {
    examId: 'spk_valid_12f3',
    title: 'IELTS Speaking Test — Phase 12F.3',
    format: 'Academic' as const,
    difficulty: 'Band 6.5–7.5' as const,
    targetBand: 7.5,
    part1: {
      introFrame: 'Good afternoon. Can you tell me your full name, please?',
      durationMinutes: '4-5 minutes',
      topicGroups: [
        {
          topic: 'Studies & Daily Routine',
          isCoreOpeningTopic: true,
          questions: [
            { id: 'sp1_1', prompt: 'Do you work or are you currently a student?' },
            { id: 'sp1_2', prompt: 'What part of your daily study or work schedule do you enjoy most?' },
            { id: 'sp1_3', prompt: 'How do you usually organise your tasks at the start of the week?' }
          ]
        },
        {
          topic: 'Reading Habits',
          isCoreOpeningTopic: false,
          questions: [
            { id: 'sp1_4', prompt: 'Do you prefer reading printed books or digital articles?' },
            { id: 'sp1_5', prompt: 'What kind of non-fiction topics interest you the most?' },
            { id: 'sp1_6', prompt: 'Have your reading habits changed since you were a child?' }
          ]
        }
      ]
    },
    part2: {
      id: 'sp2_cue_12f3',
      topic: 'A useful skill you learned outside school',
      instructions: 'Describe a practical skill you learned outside formal education.',
      bulletPrompts: [
        'What the skill was',
        'How and where you learned it',
        'Why you decided to learn this skill',
        'And explain how this skill has helped you in daily life'
      ],
      prepTimeSeconds: 60,
      talkTimeSeconds: 120,
      roundingOffQuestion: 'Do you think this skill is easy for most people to learn?'
    },
    part3: {
      durationMinutes: '4-5 minutes',
      themes: [
        {
          title: 'Practical vs Academic Learning',
          connectedPart2Theme: 'Practical Skills',
          questions: [
            {
              id: 'sp3_1',
              prompt: 'Why do some employers value practical experience more than academic qualifications?',
              targetFunction: 'Analyze' as const
            },
            {
              id: 'sp3_2',
              prompt: 'Should universities integrate mandatory workplace internships into every degree programme?',
              targetFunction: 'Evaluate' as const
            }
          ]
        },
        {
          title: 'Lifelong Learning in the Digital Era',
          connectedPart2Theme: 'Practical Skills',
          questions: [
            {
              id: 'sp3_3',
              prompt: 'How has online learning changed the way adults acquire new professional skills?',
              targetFunction: 'Compare' as const
            },
            {
              id: 'sp3_4',
              prompt: 'What kinds of skills might become obsolete over the next twenty years?',
              targetFunction: 'Speculate' as const
            }
          ]
        }
      ]
    }
  };
}

describe('Phase 5.5H.12F.3 — Admin AI Draft Review, Validation & Explicit Approval Workflow', { concurrency: false }, () => {
  let initialStoreHash = '';
  let initialStoreSize = 0;
  let originalPersistSync: any = null;
  let inMemoryStoreSnapshot: string = '';

  let ADMIN_TOKEN = '';
  let CANDIDATE_A_TOKEN = '';
  let CANDIDATE_B_TOKEN = '';
  let EMPTY_EMAIL_ADMIN_TOKEN = '';
  let WHITESPACE_EMAIL_ADMIN_TOKEN = '';

  const ADMIN_USER_ID = 'user_12f3_admin';
  const CANDIDATE_A_ID = 'user_12f3_cand_a';
  const CANDIDATE_B_ID = 'user_12f3_cand_b';
  const EMPTY_EMAIL_USER_ID = 'user_12f3_empty_email';
  const WHITESPACE_EMAIL_USER_ID = 'user_12f3_ws_email';

  const readingDraftId = 'draft_12f3_reading_valid';
  const listeningDraftId = 'draft_12f3_listening_valid';
  const writingDraftId = 'draft_12f3_writing_valid';
  const speakingDraftId = 'draft_12f3_speaking_valid';

  before(() => {
    // Record baseline persistent store hash and size before any test activity
    const rawDisk = fs.readFileSync(STORE_PATH);
    initialStoreSize = rawDisk.length;
    initialStoreHash = crypto.createHash('sha256').update(rawDisk).digest('hex');

    // Snapshot in-memory store and stub persistSync so no test ever writes to disk
    inMemoryStoreSnapshot = JSON.stringify(serverDb.data);
    originalPersistSync = (serverDb as any).persistSync;
    if ((serverDb as any).saveTimeout) {
      clearTimeout((serverDb as any).saveTimeout);
      (serverDb as any).saveTimeout = null;
    }
    (serverDb as any).persistSync = () => {
      // No-op during isolated test execution to guarantee zero disk mutations
    };

    const now = Date.now();
    for (const [id, email, name] of [
      [ADMIN_USER_ID, 'mdebadulislam45@gmail.com', 'Sprint Admin Reviewer'],
      [CANDIDATE_A_ID, 'candidate.a.12f3@example.com', 'Candidate A'],
      [CANDIDATE_B_ID, 'candidate.b.12f3@example.com', 'Candidate B'],
      [EMPTY_EMAIL_USER_ID, '', 'Empty Email User'],
      [WHITESPACE_EMAIL_USER_ID, '   ', 'Whitespace Email User']
    ] as const) {
      serverDb.data.users[id] = {
        id,
        email,
        name,
        createdAt: now,
        updatedAt: now
      };
    }

    ADMIN_TOKEN = serverDb.createSession(ADMIN_USER_ID, 'test-agent', '127.0.0.1').token;
    CANDIDATE_A_TOKEN = serverDb.createSession(CANDIDATE_A_ID, 'test-agent', '127.0.0.1').token;
    CANDIDATE_B_TOKEN = serverDb.createSession(CANDIDATE_B_ID, 'test-agent', '127.0.0.1').token;
    EMPTY_EMAIL_ADMIN_TOKEN = serverDb.createSession(EMPTY_EMAIL_USER_ID, 'test-agent', '127.0.0.1').token;
    WHITESPACE_EMAIL_ADMIN_TOKEN = serverDb.createSession(WHITESPACE_EMAIL_USER_ID, 'test-agent', '127.0.0.1').token;

    // Seed the 4 valid PENDING_REVIEW drafts across all 4 modules
    const draftsToAdd: AIDraftExam[] = [
      {
        id: readingDraftId,
        userId: CANDIDATE_A_ID,
        model: 'gemini-3.8-flash',
        examType: 'academic_reading',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        createdAt: now - 4000,
        updatedAt: now - 4000,
        validationFindings: {
          passed: true,
          structuralOk: true,
          answersOk: true,
          evidenceOk: true,
          qualityOk: true,
          errors: [],
          warnings: []
        },
        content: {
          ...createValidReadingContent(),
          rawPrompt: 'SECRET SYSTEM PROMPT SHOULD BE STRIPPED',
          systemInstruction: 'SECRET INSTRUCTION',
          candidateTranscript: 'PRIVATE TRANSCRIPT'
        }
      },
      {
        id: listeningDraftId,
        userId: CANDIDATE_A_ID,
        model: 'gemini-3.8-flash',
        examType: 'listening',
        status: 'PENDING_REVIEW',
        validationStatus: 'REPAIRED',
        repairAttempts: 1,
        createdAt: now - 3000,
        updatedAt: now - 3000,
        validationFindings: {
          passed: true,
          structuralOk: true,
          answersOk: true,
          evidenceOk: true,
          qualityOk: true,
          errors: [],
          warnings: ['Minor pacing note']
        },
        content: createValidListeningContent()
      },
      {
        id: writingDraftId,
        userId: CANDIDATE_A_ID,
        model: 'gemini-3.8-flash',
        examType: 'writing',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        createdAt: now - 2000,
        updatedAt: now - 2000,
        validationFindings: {
          passed: true,
          structuralOk: true,
          answersOk: true,
          evidenceOk: true,
          qualityOk: true,
          errors: [],
          warnings: []
        },
        content: createValidWritingContent()
      },
      {
        id: speakingDraftId,
        userId: CANDIDATE_A_ID,
        model: 'gemini-3.8-flash',
        examType: 'speaking',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        createdAt: now - 1000,
        updatedAt: now - 1000,
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
      }
    ];
    for (const d of draftsToAdd) {
      serverDb.data.aiDraftExams[d.id] = d;
    }
  });

  after(() => {
    try {
      inFlightAdminDraftReviewLocks.clear();
      if ((serverDb as any).saveTimeout) {
        clearTimeout((serverDb as any).saveTimeout);
        (serverDb as any).saveTimeout = null;
      }
      serverDb.data = JSON.parse(inMemoryStoreSnapshot);
    } finally {
      if (originalPersistSync) {
        (serverDb as any).persistSync = originalPersistSync;
      }
    }

    // Verify persistent store on disk was never modified
    const finalDisk = fs.readFileSync(STORE_PATH);
    const finalHash = crypto.createHash('sha256').update(finalDisk).digest('hex');
    assert.equal(finalDisk.length, initialStoreSize, 'Persistent store byte size must remain unchanged');
    assert.equal(finalHash, initialStoreHash, 'Persistent store SHA-256 must remain unchanged');
  });

  describe('1. Admin Authentication & Strict Allowlist Authorization', { concurrency: false }, () => {
    it('denies unauthenticated requests (401) across list, detail, approve, and reject endpoints', async () => {
      const listCall = createMockReqRes({});
      await handleAdminListAiDrafts(listCall.req, listCall.res);
      assert.equal(listCall.res.getStatusCode(), 401);

      const detailCall = createMockReqRes({ params: { id: 'any_id' } });
      await handleAdminGetAiDraftById(detailCall.req, detailCall.res);
      assert.equal(detailCall.res.getStatusCode(), 401);

      const approveCall = createMockReqRes({ params: { id: 'any_id' } });
      await handleAdminApproveAiDraft(approveCall.req, approveCall.res);
      assert.equal(approveCall.res.getStatusCode(), 401);

      const rejectCall = createMockReqRes({ params: { id: 'any_id' } });
      await handleAdminRejectAiDraft(rejectCall.req, rejectCall.res);
      assert.equal(rejectCall.res.getStatusCode(), 401);
    });

    it('denies non-admin candidate sessions (403) across list, detail, approve, and reject endpoints', async () => {
      const listCall = createMockReqRes({ token: CANDIDATE_A_TOKEN });
      await handleAdminListAiDrafts(listCall.req, listCall.res);
      assert.equal(listCall.res.getStatusCode(), 403);

      const detailCall = createMockReqRes({ token: CANDIDATE_A_TOKEN, params: { id: 'any_id' } });
      await handleAdminGetAiDraftById(detailCall.req, detailCall.res);
      assert.equal(detailCall.res.getStatusCode(), 403);

      const approveCall = createMockReqRes({ token: CANDIDATE_A_TOKEN, params: { id: 'any_id' } });
      await handleAdminApproveAiDraft(approveCall.req, approveCall.res);
      assert.equal(approveCall.res.getStatusCode(), 403);

      const rejectCall = createMockReqRes({ token: CANDIDATE_A_TOKEN, params: { id: 'any_id' } });
      await handleAdminRejectAiDraft(rejectCall.req, rejectCall.res);
      assert.equal(rejectCall.res.getStatusCode(), 403);
    });

    it('denies sessions with missing, empty, or whitespace-only email (403)', async () => {
      for (const badToken of [EMPTY_EMAIL_ADMIN_TOKEN, WHITESPACE_EMAIL_ADMIN_TOKEN]) {
        const listCall = createMockReqRes({ token: badToken });
        await handleAdminListAiDrafts(listCall.req, listCall.res);
        assert.equal(listCall.res.getStatusCode(), 403);

        const approveCall = createMockReqRes({ token: badToken, params: { id: 'any_id' } });
        await handleAdminApproveAiDraft(approveCall.req, approveCall.res);
        assert.equal(approveCall.res.getStatusCode(), 403);
      }
    });

    it('allows verified allowlisted admin session (200) to list the review queue', async () => {
      const listCall = createMockReqRes({ token: ADMIN_TOKEN });
      await handleAdminListAiDrafts(listCall.req, listCall.res);
      assert.equal(listCall.res.getStatusCode(), 200);
      const body = listCall.res.getBody();
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.drafts));
      assert.ok(body.summary);
      assert.equal(typeof body.summary.pendingTotal, 'number');
    });
  });

  describe('2. Admin Review Queue & Detail Inspection Privacy & Module Structure', { concurrency: false }, () => {
    it('defaults queue listing to PENDING_REVIEW and supports module/status filtering and bounded pagination', async () => {
      const defaultList = createMockReqRes({ token: ADMIN_TOKEN, query: {} });
      await handleAdminListAiDrafts(defaultList.req, defaultList.res);
      assert.equal(defaultList.res.getStatusCode(), 200);
      const defaultBody = defaultList.res.getBody();
      assert.equal(defaultBody.filters.status, 'PENDING_REVIEW');
      assert.ok(defaultBody.drafts.every((d: any) => d.status === 'PENDING_REVIEW'));

      // Filter by module = writing
      const writingList = createMockReqRes({
        token: ADMIN_TOKEN,
        query: { module: 'writing', status: 'PENDING_REVIEW', limit: '5', offset: '0' }
      });
      await handleAdminListAiDrafts(writingList.req, writingList.res);
      assert.equal(writingList.res.getStatusCode(), 200);
      const writingBody = writingList.res.getBody();
      assert.ok(writingBody.drafts.length >= 1);
      assert.ok(writingBody.drafts.every((d: any) => d.examType === 'writing'));
      assert.equal(writingBody.pagination.limit, 5);

      // Rejects unrecognized module filter with 400
      const badModList = createMockReqRes({
        token: ADMIN_TOKEN,
        query: { module: 'invalid_module' }
      });
      await handleAdminListAiDrafts(badModList.req, badModList.res);
      assert.equal(badModList.res.getStatusCode(), 400);
    });

    it('strips candidate userId, reviewedBy raw ID, and prohibited prompt/transcript keys from list and detail responses', async () => {
      const listCall = createMockReqRes({ token: ADMIN_TOKEN, query: { module: 'reading' } });
      await handleAdminListAiDrafts(listCall.req, listCall.res);
      const listDrafts = listCall.res.getBody().drafts;
      const summaryItem = listDrafts.find((d: any) => d.id === readingDraftId);
      assert.ok(summaryItem);
      assert.equal('userId' in summaryItem, false, 'Admin summary must not expose candidate userId');
      assert.equal('reviewedBy' in summaryItem, false, 'Admin summary must not expose raw reviewedBy ID');

      const detailCall = createMockReqRes({ token: ADMIN_TOKEN, params: { id: readingDraftId } });
      await handleAdminGetAiDraftById(detailCall.req, detailCall.res);
      assert.equal(detailCall.res.getStatusCode(), 200);
      const detailDraft = detailCall.res.getBody().draft;
      assert.equal('userId' in detailDraft, false, 'Admin detail must not expose candidate userId');
      assert.equal('reviewedBy' in detailDraft, false, 'Admin detail must not expose raw reviewedBy ID');
      assert.equal('rawPrompt' in detailDraft.content, false, 'rawPrompt must be stripped');
      assert.equal('systemInstruction' in detailDraft.content, false, 'systemInstruction must be stripped');
      assert.equal('candidateTranscript' in detailDraft.content, false, 'candidateTranscript must be stripped');
    });

    it('preserves full module-specific structures in detail endpoint across Reading, Listening, Writing, and Speaking', async () => {
      // Reading
      const rdCall = createMockReqRes({ token: ADMIN_TOKEN, params: { id: readingDraftId } });
      await handleAdminGetAiDraftById(rdCall.req, rdCall.res);
      const rd = rdCall.res.getBody().draft;
      assert.equal(rd.canApprove, true);
      assert.equal(rd.content.passages.length, 3);

      // Listening
      const lstCall = createMockReqRes({ token: ADMIN_TOKEN, params: { id: listeningDraftId } });
      await handleAdminGetAiDraftById(lstCall.req, lstCall.res);
      const lst = lstCall.res.getBody().draft;
      assert.equal(lst.canApprove, true);
      assert.equal(lst.content.sections.length, 4);

      // Writing
      const wrtCall = createMockReqRes({ token: ADMIN_TOKEN, params: { id: writingDraftId } });
      await handleAdminGetAiDraftById(wrtCall.req, wrtCall.res);
      const wrt = wrtCall.res.getBody().draft;
      assert.equal(wrt.canApprove, true);
      assert.ok(wrt.content.task1.visualData);
      assert.ok(wrt.content.task2.questionText);

      // Speaking
      const spkCall = createMockReqRes({ token: ADMIN_TOKEN, params: { id: speakingDraftId } });
      await handleAdminGetAiDraftById(spkCall.req, spkCall.res);
      const spk = spkCall.res.getBody().draft;
      assert.equal(spk.canApprove, true);
      assert.ok(Array.isArray(spk.content.part1.topicGroups));
      assert.ok(spk.content.part2.topic);
      assert.ok(Array.isArray(spk.content.part3.themes));
    });
  });

  describe('3. Explicit Approval & Rejection Lifecycle, Module Coverage & Concurrency Safety', { concurrency: false }, () => {
    it('approves valid PENDING_REVIEW drafts across all 4 modules (Reading, Listening, Writing, Speaking) and records audit metadata', async () => {
      const moduleDraftIds: Array<{ id: string; examType: string }> = [
        { id: readingDraftId, examType: 'academic_reading' },
        { id: listeningDraftId, examType: 'listening' },
        { id: writingDraftId, examType: 'writing' },
        { id: speakingDraftId, examType: 'speaking' }
      ];

      for (const item of moduleDraftIds) {
        const approveCall = createMockReqRes({
          token: ADMIN_TOKEN,
          params: { id: item.id },
          body: { module: item.examType }
        });
        await handleAdminApproveAiDraft(approveCall.req, approveCall.res);
        assert.equal(approveCall.res.getStatusCode(), 200, `Expected 200 approving ${item.id}`);
        const resBody = approveCall.res.getBody();
        assert.equal(resBody.success, true);
        assert.equal(resBody.idempotent, false);
        assert.equal(resBody.draft.status, 'APPROVED');
        assert.equal(resBody.draft.isReviewed, true);
        assert.equal(typeof resBody.draft.reviewedAt, 'number');

        // Verify stored record in serverDb has reviewedBy and reviewedAt
        const stored = serverDb.getAiDraftExam(item.id);
        assert.ok(stored);
        assert.equal(stored.status, 'APPROVED');
        assert.equal(stored.reviewedBy, ADMIN_USER_ID);
        assert.equal(typeof stored.reviewedAt, 'number');
      }
    });

    it('handles repeated approval of an already APPROVED draft idempotently (200) without mutating reviewedAt', async () => {
      const beforeDraft = serverDb.getAiDraftExam(writingDraftId)!;
      const originalReviewedAt = beforeDraft.reviewedAt;

      const repeatCall = createMockReqRes({
        token: ADMIN_TOKEN,
        params: { id: writingDraftId },
        body: { module: 'writing' }
      });
      await handleAdminApproveAiDraft(repeatCall.req, repeatCall.res);
      assert.equal(repeatCall.res.getStatusCode(), 200);
      const body = repeatCall.res.getBody();
      assert.equal(body.success, true);
      assert.equal(body.idempotent, true);
      assert.equal(body.alreadyApproved, true);

      const afterDraft = serverDb.getAiDraftExam(writingDraftId)!;
      assert.equal(afterDraft.reviewedAt, originalReviewedAt);
    });

    it('denies approval when optional module parameter mismatches draft examType (400 MODULE_MISMATCH)', async () => {
      const mismatchDraftId = 'draft_12f3_mod_mismatch';
      serverDb.data.aiDraftExams[mismatchDraftId] = {
        id: mismatchDraftId,
        userId: CANDIDATE_A_ID,
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
          warnings: []
        },
        content: createValidWritingContent()
      };

      const call = createMockReqRes({
        token: ADMIN_TOKEN,
        params: { id: mismatchDraftId },
        body: { module: 'listening' }
      });
      await handleAdminApproveAiDraft(call.req, call.res);
      assert.equal(call.res.getStatusCode(), 400);
      assert.equal(call.res.getBody().code, 'MODULE_MISMATCH');
      assert.equal(serverDb.getAiDraftExam(mismatchDraftId)?.status, 'PENDING_REVIEW');
    });

    it('denies approval when a PENDING_REVIEW draft fails fresh module structural validation (400 STRUCTURAL_VALIDATION_FAILED)', async () => {
      const brokenReadingId = 'draft_12f3_broken_reading';
      serverDb.data.aiDraftExams[brokenReadingId] = {
        id: brokenReadingId,
        userId: CANDIDATE_A_ID,
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
          warnings: []
        },
        // Only 1 passage instead of required 3 passages / 40 questions
        content: {
          examId: 'rd_broken',
          passages: [{ id: 'p1', title: 'Only 1 Passage', text: 'Short text', questions: [] }]
        }
      };

      const call = createMockReqRes({
        token: ADMIN_TOKEN,
        params: { id: brokenReadingId }
      });
      await handleAdminApproveAiDraft(call.req, call.res);
      assert.equal(call.res.getStatusCode(), 400);
      assert.equal(call.res.getBody().code, 'STRUCTURAL_VALIDATION_FAILED');
      // Must remain PENDING_REVIEW and not be auto-approved
      assert.equal(serverDb.getAiDraftExam(brokenReadingId)?.status, 'PENDING_REVIEW');
    });

    it('denies approval when content is malformed (null or array) or validationStatus is FAILED', async () => {
      const nullContentId = 'draft_12f3_null_content';
      const failedValStatusId = 'draft_12f3_failed_val_status';
      serverDb.data.aiDraftExams[nullContentId] = {
        id: nullContentId,
        userId: CANDIDATE_A_ID,
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
          warnings: []
        },
        content: null
      };
      serverDb.data.aiDraftExams[failedValStatusId] = {
        id: failedValStatusId,
        userId: CANDIDATE_A_ID,
        model: 'gemini-3.8-flash',
        examType: 'writing',
        status: 'PENDING_REVIEW',
        validationStatus: 'FAILED',
        repairAttempts: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        validationFindings: {
          passed: false,
          structuralOk: false,
          answersOk: false,
          evidenceOk: false,
          qualityOk: false,
          errors: ['Task 2 missing'],
          warnings: []
        },
        content: createValidWritingContent()
      };

      const call1 = createMockReqRes({ token: ADMIN_TOKEN, params: { id: nullContentId } });
      await handleAdminApproveAiDraft(call1.req, call1.res);
      assert.equal(call1.res.getStatusCode(), 400);
      assert.equal(call1.res.getBody().code, 'MALFORMED_DRAFT_CONTENT');

      const call2 = createMockReqRes({ token: ADMIN_TOKEN, params: { id: failedValStatusId } });
      await handleAdminApproveAiDraft(call2.req, call2.res);
      assert.equal(call2.res.getStatusCode(), 400);
      assert.equal(call2.res.getBody().code, 'VALIDATION_STATUS_INVALID');
    });

    it('rejects a PENDING_REVIEW draft, sanitizes/truncates optional reason, preserves draft in store, and blocks subsequent approval or candidate revalidation', async () => {
      const rejectTargetId = 'draft_12f3_to_reject';
      serverDb.data.aiDraftExams[rejectTargetId] = {
        id: rejectTargetId,
        userId: CANDIDATE_A_ID,
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
          warnings: []
        },
        content: createValidWritingContent()
      };

      const longReason = `   Inaccurate Task 1 chart values \u0007 and mismatched units. ${'X'.repeat(350)}   `;
      const rejectCall = createMockReqRes({
        token: ADMIN_TOKEN,
        params: { id: rejectTargetId },
        body: { module: 'writing', reason: longReason }
      });
      await handleAdminRejectAiDraft(rejectCall.req, rejectCall.res);
      assert.equal(rejectCall.res.getStatusCode(), 200);
      const rejectBody = rejectCall.res.getBody();
      assert.equal(rejectBody.success, true);
      assert.equal(rejectBody.draft.status, 'REJECTED');
      assert.ok(rejectBody.draft.rejectionReason.length <= 300);
      assert.equal(rejectBody.draft.rejectionReason.includes('\u0007'), false);

      // Verify stored draft still exists in serverDb with REJECTED status and audit metadata
      const stored = serverDb.getAiDraftExam(rejectTargetId);
      assert.ok(stored, 'Rejected draft must not be deleted');
      assert.equal(stored.status, 'REJECTED');
      assert.equal(stored.reviewedBy, ADMIN_USER_ID);
      assert.equal(typeof stored.reviewedAt, 'number');

      // Subsequent approval of REJECTED draft must fail with 400 INVALID_REVIEW_STATE
      const approveAfterReject = createMockReqRes({
        token: ADMIN_TOKEN,
        params: { id: rejectTargetId }
      });
      await handleAdminApproveAiDraft(approveAfterReject.req, approveAfterReject.res);
      assert.equal(approveAfterReject.res.getStatusCode(), 400);
      assert.equal(approveAfterReject.res.getBody().code, 'INVALID_REVIEW_STATE');
      assert.equal(serverDb.getAiDraftExam(rejectTargetId)?.status, 'REJECTED');

      // Candidate revalidation must NOT be able to reset a REJECTED draft back to PENDING_REVIEW
      const candReval = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: rejectTargetId }
      });
      await handleRevalidateWritingDraft(candReval.req, candReval.res);
      assert.equal(candReval.res.getStatusCode(), 400);
      assert.equal(serverDb.getAiDraftExam(rejectTargetId)?.status, 'REJECTED');
    });

    it('blocks conflicting concurrent review transitions when an in-flight review lock is active (409 REVIEW_IN_PROGRESS)', async () => {
      const lockedDraftId = 'draft_12f3_locked_concurrent';
      serverDb.data.aiDraftExams[lockedDraftId] = {
        id: lockedDraftId,
        userId: CANDIDATE_A_ID,
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
          warnings: []
        },
        content: createValidSpeakingContent()
      };

      // Simulate an active in-flight review operation on lockedDraftId
      inFlightAdminDraftReviewLocks.add(lockedDraftId);
      try {
        const concurrentApprove = createMockReqRes({
          token: ADMIN_TOKEN,
          params: { id: lockedDraftId }
        });
        await handleAdminApproveAiDraft(concurrentApprove.req, concurrentApprove.res);
        assert.equal(concurrentApprove.res.getStatusCode(), 409);
        assert.equal(concurrentApprove.res.getBody().code, 'REVIEW_IN_PROGRESS');

        const concurrentReject = createMockReqRes({
          token: ADMIN_TOKEN,
          params: { id: lockedDraftId }
        });
        await handleAdminRejectAiDraft(concurrentReject.req, concurrentReject.res);
        assert.equal(concurrentReject.res.getStatusCode(), 409);
        assert.equal(concurrentReject.res.getBody().code, 'REVIEW_IN_PROGRESS');
      } finally {
        inFlightAdminDraftReviewLocks.delete(lockedDraftId);
      }
    });
  });

  describe('4. Candidate Pilot Eligibility Regression & Ownership Isolation', { concurrency: false }, () => {
    it('allows candidate owner to retrieve approved valid pilot drafts across all 4 modules while blocking non-owners (403) and unapproved/rejected drafts (400 DRAFT_NOT_APPROVED)', async () => {
      // Candidate A can now retrieve the 4 approved drafts from section 3
      const rdPilot = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: readingDraftId }
      });
      await handleGetReadingPilot(rdPilot.req, rdPilot.res);
      assert.equal(rdPilot.res.getStatusCode(), 200);
      assert.equal(rdPilot.res.getBody().examSet.id, readingDraftId);

      const lstPilot = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: listeningDraftId }
      });
      await handleGetListeningPilot(lstPilot.req, lstPilot.res);
      assert.equal(lstPilot.res.getStatusCode(), 200);
      assert.equal(lstPilot.res.getBody().examSet.id, listeningDraftId);

      const wrtPilot = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: writingDraftId }
      });
      await handleGetWritingPilot(wrtPilot.req, wrtPilot.res);
      assert.equal(wrtPilot.res.getStatusCode(), 200);
      assert.equal(wrtPilot.res.getBody().examSet.id, writingDraftId);

      const spkPilot = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: speakingDraftId }
      });
      await handleGetSpeakingPilot(spkPilot.req, spkPilot.res);
      assert.equal(spkPilot.res.getStatusCode(), 200);
      assert.equal(spkPilot.res.getBody().examSet.id, speakingDraftId);

      // Non-owner Candidate B is denied (403) even when draft is APPROVED
      const nonOwnerCall = createMockReqRes({
        token: CANDIDATE_B_TOKEN,
        params: { id: writingDraftId }
      });
      await handleGetWritingPilot(nonOwnerCall.req, nonOwnerCall.res);
      assert.equal(nonOwnerCall.res.getStatusCode(), 403);

      // Rejected draft is denied (400 DRAFT_NOT_APPROVED) to owner Candidate A
      const rejectedPilotCall = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: 'draft_12f3_to_reject' }
      });
      await handleGetWritingPilot(rejectedPilotCall.req, rejectedPilotCall.res);
      assert.equal(rejectedPilotCall.res.getStatusCode(), 400);
      assert.equal(rejectedPilotCall.res.getBody().code, 'DRAFT_NOT_APPROVED');

      // Pending review draft is denied (400 DRAFT_NOT_APPROVED) to owner Candidate A
      const pendingPilotCall = createMockReqRes({
        token: CANDIDATE_A_TOKEN,
        params: { id: 'draft_12f3_mod_mismatch' }
      });
      await handleGetWritingPilot(pendingPilotCall.req, pendingPilotCall.res);
      assert.equal(pendingPilotCall.res.getStatusCode(), 400);
      assert.equal(pendingPilotCall.res.getBody().code, 'DRAFT_NOT_APPROVED');
    });

    it('preserves REJECTED, APPROVED, and PENDING_REVIEW drafts during pruneUserAiDraftExams retention pruning', () => {
      const pruneUserId = 'user_12f3_prune_check';
      const now = Date.now();
      for (let i = 1; i <= 5; i++) {
        serverDb.data.aiDraftExams[`draft_12f3_prune_vf_${i}`] = {
          id: `draft_12f3_prune_vf_${i}`,
          userId: pruneUserId,
          model: 'gemini-3.8-flash',
          examType: 'writing',
          status: 'VALIDATION_FAILED',
          validationStatus: 'FAILED',
          repairAttempts: 1,
          createdAt: now - i * 1000,
          updatedAt: now - i * 1000,
          validationFindings: {
            passed: false,
            structuralOk: false,
            answersOk: false,
            evidenceOk: false,
            qualityOk: false,
            errors: ['Invalid'],
            warnings: []
          }
        };
      }
      serverDb.data.aiDraftExams['draft_12f3_prune_rejected'] = {
        id: 'draft_12f3_prune_rejected',
        userId: pruneUserId,
        model: 'gemini-3.8-flash',
        examType: 'writing',
        status: 'REJECTED',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        reviewedBy: ADMIN_USER_ID,
        reviewedAt: now - 10_000,
        rejectionReason: 'Historical rejection audit record',
        createdAt: now - 20_000,
        updatedAt: now - 10_000,
        validationFindings: {
          passed: true,
          structuralOk: true,
          answersOk: true,
          evidenceOk: true,
          qualityOk: true,
          errors: [],
          warnings: []
        }
      };

      const removedCount = serverDb.pruneUserAiDraftExams(pruneUserId, 'writing', 2);
      assert.equal(removedCount, 3);
      assert.ok(
        serverDb.getAiDraftExam('draft_12f3_prune_rejected'),
        'REJECTED draft must never be pruned by pruneUserAiDraftExams'
      );
    });

    it('preserves all baseline historical drafts in .data/sprint_store.json without approving or mutating any existing record on disk', () => {
      const diskParsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
      const baselineParsed = JSON.parse(inMemoryStoreSnapshot);
      assert.deepEqual(
        Object.keys(diskParsed.aiDraftExams).sort(),
        Object.keys(baselineParsed.aiDraftExams).sort()
      );
      for (const id of Object.keys(baselineParsed.aiDraftExams)) {
        assert.equal(
          diskParsed.aiDraftExams[id].status,
          baselineParsed.aiDraftExams[id].status,
          `Historical draft ${id} status on disk must remain unchanged`
        );
      }
    });
  });
});
