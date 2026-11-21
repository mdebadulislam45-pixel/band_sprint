import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Server } from 'node:http';
import { app } from '../../../server.ts';
import { serverDb } from '../db.ts';
import {
  VERIFIED_PRIMARY_TEXT_MODEL,
  VERIFIED_FALLBACK_TEXT_MODEL,
  normalizeGeminiTextModelId,
  resolveTextModelCandidates,
  sanitizeConfigForModel,
  classifyGeminiError,
  generateContentWithFallback,
  setGeminiGenerateOverrideForTesting
} from '../ai/geminiModelPolicy.ts';
import {
  convertAcademicReadingRawScoreToBand,
  convertGeneralTrainingReadingRawScoreToBand,
  convertListeningRawScoreToBand
} from '../../utils/ieltsBandConversion.ts';
import { evaluateQuestionResponse } from '../../utils/mockExamScoring.ts';
import { MOCK_EXAM_SETS } from '../../data/mockExams.ts';

const SAMPLE_WRITING_ESSAY = [
  'Public transit modernization is increasingly recognized as a practical foundation for sustainable urban growth across fast-growing metropolitan areas.',
  'When commuters depend overwhelmingly on private vehicles, cities experience worsening congestion, elevated particulate emissions, and rising household transportation expenses.',
  'By reallocating municipal funding toward frequent electric buses, integrated metro networks, and safe cycling lanes, city planners can expand mobility while reducing carbon intensity.',
  'Although capital costs are substantial during initial construction, the cumulative benefits for public health, economic productivity, and urban livability justify sustained public investment.'
].join(' ');

const SAMPLE_SPEAKING_TRANSCRIPT =
  'In my city, public parks are genuinely essential because they provide quiet green spaces where families and students can unwind after busy weekdays. Personally, I visit a riverside park near my university twice a week to jog and clear my mind, which noticeably improves my concentration and overall wellbeing.';

function makeValidWritingEvalJson() {
  return JSON.stringify({
    overallBand: 7.5,
    proficiencyTitle: 'Good User',
    trScore: 7.5,
    trComment: 'Clearly addresses all parts of the prompt with well-developed reasoning.',
    ccScore: 7.5,
    ccComment: 'Logical progression with natural cohesive devices.',
    lrScore: 7.5,
    lrComment: 'Precise academic collocations such as municipal funding and carbon intensity.',
    graScore: 7.5,
    graComment: 'Controlled complex clauses with high grammatical accuracy.',
    strengths: ['Clear stance and logical paragraph development'],
    weaknesses: ['Could include one concrete municipal case study'],
    vocabUpgrades: [],
    grammaticalErrors: [],
    betterAnswerBand8: 'Sample band 8 model answer.',
    verdict: 'Strong Band 7.5 academic writing performance.'
  });
}

function makeValidDeepWritingJson() {
  return JSON.stringify({
    taScore: 7.5,
    taSummary: 'Addresses the prompt thoroughly with a consistent stance.',
    ccScore: 7.5,
    ccSummary: 'Well-structured progression between problem and policy solution.',
    lrScore: 7.5,
    lrSummary: 'Effective range of urban-policy vocabulary.',
    graScore: 7.0,
    graSummary: 'Accurate complex structures with minor room for variety.',
    cefrLevel: 'C1 Advanced',
    annotations: [
      {
        sentence: 'Public transit modernization is increasingly recognized as a practical foundation for sustainable urban growth across fast-growing metropolitan areas.',
        category: 'clean',
        errorTitle: 'Strong Thesis',
        identifiedIssue: 'Clear thesis statement.',
        suggestedCorrection: 'Public transit modernization is increasingly recognized as a practical foundation for sustainable urban growth across fast-growing metropolitan areas.',
        rationaleEn: 'Precise academic register.',
        rationaleBn: 'সুস্পষ্ট একাডেমিক সূচনা।'
      }
    ],
    upgradedParagraphs: [
      {
        original: 'Public transit modernization is increasingly recognized as a practical foundation.',
        upgraded: 'Modernizing metropolitan transit infrastructure has emerged as a cornerstone of sustainable urban growth.'
      }
    ]
  });
}

function makeValidSpeakingEvalJson() {
  return JSON.stringify({
    estimatedBands: {
      fluency: 7.5,
      lexical: 7.5,
      grammar: 7.0,
      pronunciation: null,
      overall: null
    },
    evidenceSummary: 'Coherent response with natural linking and specific personal example.',
    grammaticalErrors: [],
    pronunciation: {
      clarityBand: null,
      cadenceWpm: 132,
      trickyWords: [
        {
          word: 'concentration',
          ipa: '/ˌkɒn.sənˈtreɪ.ʃən/',
          syllableStress: 'con-cen-TRA-tion',
          tip: 'Place primary stress on the third syllable.'
        }
      ],
      connectedSpeechTips: ['Link "clear my mind" smoothly without hard pauses.'],
      intonationPattern: 'Not observable from transcript-only input.',
      rhythmVerdict: 'Acoustic pronunciation was not assessed from text alone.'
    },
    band8Answer: {
      bandScore: 8.5,
      modelAnswer: 'Urban parks serve as indispensable sanctuaries where residents can decompress and stay physically active.',
      highlightedCollocations: [
        { phrase: 'indispensable sanctuaries', bandLevel: 'C2', meaning: 'essential peaceful refuges' }
      ],
      keyDiscourseMarkers: ['Personally', 'which noticeably'],
      examinerRationale: 'Expands lexical precision while preserving natural spoken cadence.'
    },
    actionableTips: ['Vary complex subordinate clauses in Part 3 follow-ups.']
  });
}

describe('SP-2 AI Model Reliability & Four-Skill Demonstration Stability', () => {
  const storePath = path.join(process.cwd(), '.data', 'sprint_store.json');
  let storeBackup: string | null = null;
  let server: Server | null = null;
  let baseUrl = '';

  const testUserId = 'sp2_test_pro_user';
  let testUserToken = '';

  let origGeminiKey: string | undefined;
  let origApiKey: string | undefined;
  let origGeminiModel: string | undefined;

  before(async () => {
    origGeminiKey = process.env.GEMINI_API_KEY;
    origApiKey = process.env.API_KEY;
    origGeminiModel = process.env.GEMINI_MODEL;

    if (fs.existsSync(storePath)) {
      storeBackup = fs.readFileSync(storePath, 'utf-8');
    }

    const now = Date.now();
    serverDb.data.users[testUserId] = {
      id: testUserId,
      email: 'sp2.candidate@example.com',
      name: 'SP2 Demo Candidate',
      role: 'user',
      createdAt: now,
      updatedAt: now
    };
    serverDb.saveSubscription({
      userId: testUserId,
      planId: 'master',
      status: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodStart: now - 86_400_000,
      currentPeriodEnd: now + 29 * 86_400_000,
      updatedAt: now
    });
    testUserToken = serverDb.createSession(testUserId, 'sp2-test-agent', '127.0.0.1').token;

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server?.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  beforeEach(() => {
    setGeminiGenerateOverrideForTesting(null);
    process.env.GEMINI_API_KEY = 'sp2_test_dummy_key_not_real';
    delete process.env.API_KEY;
    delete process.env.GEMINI_MODEL;
  });

  after(async () => {
    setGeminiGenerateOverrideForTesting(null);

    if (origGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = origGeminiKey;
    if (origApiKey === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = origApiKey;
    if (origGeminiModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = origGeminiModel;

    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }

    try {
      const dbAny = serverDb as any;
      if (dbAny.saveTimeout) {
        clearTimeout(dbAny.saveTimeout);
        dbAny.saveTimeout = null;
      }
    } finally {
      if (storeBackup !== null) {
        serverDb.data = JSON.parse(storeBackup);
        fs.writeFileSync(storePath, storeBackup, 'utf-8');
      }
    }
  });

  describe('0. Model policy unit verification', () => {
    it('prefers valid GEMINI_MODEL, appends verified compatible fallbacks, and rejects deprecated/non-text models', () => {
      assert.equal(normalizeGeminiTextModelId('gemini-1.5-flash'), null);
      assert.equal(normalizeGeminiTextModelId('gemini-2.0-flash'), null);
      assert.equal(normalizeGeminiTextModelId('gemini-pro'), null);
      assert.equal(normalizeGeminiTextModelId('gemini-3.8-flash-lite-tts'), null);
      assert.equal(normalizeGeminiTextModelId('gemini-3.5-transcribe'), null);
      assert.equal(normalizeGeminiTextModelId('models/gemini-4-hydrogen'), 'gemini-4-hydrogen');

      const defaultPlan = resolveTextModelCandidates({ envModel: '' });
      assert.deepEqual(defaultPlan.candidates, [VERIFIED_PRIMARY_TEXT_MODEL, VERIFIED_FALLBACK_TEXT_MODEL]);

      const configuredPlan = resolveTextModelCandidates({ envModel: 'gemini-3.1-flash-lite' });
      assert.equal(configuredPlan.primaryModel, 'gemini-3.1-flash-lite');
      assert.deepEqual(configuredPlan.candidates, ['gemini-3.1-flash-lite', 'gemini-4-hydrogen']);

      const deprecatedEnvPlan = resolveTextModelCandidates({ envModel: 'gemini-2.0-flash' });
      assert.equal(deprecatedEnvPlan.configuredEnvModel, null);
      assert.deepEqual(deprecatedEnvPlan.candidates, [VERIFIED_PRIMARY_TEXT_MODEL, VERIFIED_FALLBACK_TEXT_MODEL]);

      const customEnvPlan = resolveTextModelCandidates({ envModel: 'gemini-3.5-flash-lite' });
      assert.deepEqual(customEnvPlan.candidates, ['gemini-3.5-flash-lite', 'gemini-4-hydrogen', 'gemini-3.1-flash-lite']);

      const sanitized = sanitizeConfigForModel('gemini-4-hydrogen', {
        responseMimeType: 'application/json',
        temperature: 0.4,
        topP: 0.9,
        topK: 40,
        candidateCount: 1,
        thinkingConfig: { thinkingBudget: 1024 }
      });
      assert.equal(sanitized?.temperature, undefined);
      assert.equal(sanitized?.topP, undefined);
      assert.equal(sanitized?.topK, undefined);
      assert.equal(sanitized?.candidateCount, undefined);
      assert.equal(sanitized?.thinkingConfig, undefined);
      assert.equal(sanitized?.responseMimeType, 'application/json');
    });

    it('classifies auth, quota, model-not-found, timeout, and transient errors accurately without leaking secrets', () => {
      const authErr = classifyGeminiError({ status: 400, message: 'API_KEY_INVALID for key AIzaSecretLeak123' });
      assert.equal(authErr.category, 'auth_invalid');
      assert.equal(authErr.retryable, false);
      assert.equal(authErr.httpStatus, 503);
      assert.equal(authErr.canRetry, false);
      assert.ok(!authErr.userMessage.includes('AIzaSecretLeak123'));

      const quotaErr = classifyGeminiError({ status: 429, message: 'RESOURCE_EXHAUSTED: quota exceeded' });
      assert.equal(quotaErr.category, 'quota_exhausted');
      assert.equal(quotaErr.retryable, false);
      assert.equal(quotaErr.httpStatus, 429);

      const notFoundErr = classifyGeminiError({ status: 404, message: 'Model gemini-3.5-flash-lite NOT_FOUND' });
      assert.equal(notFoundErr.category, 'model_unavailable');
      assert.equal(notFoundErr.retryable, true);

      const timeoutErr = classifyGeminiError(new Error('Gemini request timed out'));
      assert.equal(timeoutErr.category, 'timeout');
      assert.equal(timeoutErr.retryable, true);

      const transientErr = classifyGeminiError({ status: 503, message: 'Service UNAVAILABLE' });
      assert.equal(transientErr.category, 'transient_service');
      assert.equal(transientErr.retryable, true);
    });
  });

  describe('1 & 2. Writing evaluation with configured model and fallback behavior', () => {
    it('evaluates /api/evaluate-writing and /api/writing/deep-evaluate with configured GEMINI_MODEL', async () => {
      process.env.GEMINI_MODEL = 'gemini-3.1-flash-lite';
      const seenModels: string[] = [];

      setGeminiGenerateOverrideForTesting(async ({ model }) => {
        seenModels.push(model);
        return { text: seenModels.length === 1 ? makeValidWritingEvalJson() : makeValidDeepWritingJson() };
      });

      const res1 = await fetch(`${baseUrl}/api/evaluate-writing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`
        },
        body: JSON.stringify({
          essayText: SAMPLE_WRITING_ESSAY,
          prompt: 'Public transport investment essay',
          testType: 'task2'
        })
      });
      assert.equal(res1.status, 200);
      const data1 = await res1.json();
      assert.equal(data1.isValidAttempt, true);
      assert.equal(data1.assessmentStatus, 'evaluated');
      assert.equal(typeof data1.overallBand, 'number');
      assert.ok(data1.overallBand >= 1.0 && data1.overallBand <= 7.5);
      assert.equal(data1.modelUsed, 'gemini-3.1-flash-lite');
      assert.equal(data1.fallbackUsed, false);

      const res2 = await fetch(`${baseUrl}/api/writing/deep-evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`
        },
        body: JSON.stringify({
          essayText: SAMPLE_WRITING_ESSAY,
          taskType: 2,
          examFormat: 'Academic',
          promptText: 'Public transport investment essay'
        })
      });
      assert.equal(res2.status, 200);
      const data2 = await res2.json();
      assert.equal(data2.isValidAttempt, true);
      assert.equal(data2.evaluationSource, 'gemini-3.1-flash-lite');
      assert.equal(data2.modelUsed, 'gemini-3.1-flash-lite');
      assert.equal(data2.fallbackUsed, false);
      assert.equal(typeof data2.overallBand, 'number');
      assert.ok(data2.overallBand >= 1.0 && data2.overallBand <= 7.5);
      assert.deepEqual(seenModels, ['gemini-3.1-flash-lite', 'gemini-3.1-flash-lite']);
    });

    it('falls back to verified model on primary model failure (404/503) and returns null scores if all fail', async () => {
      process.env.GEMINI_MODEL = 'gemini-4-hydrogen';
      const attempted: string[] = [];

      // Case A: primary returns 503 -> fallback gemini-3.1-flash-lite succeeds
      setGeminiGenerateOverrideForTesting(async ({ model }) => {
        attempted.push(model);
        if (model === 'gemini-4-hydrogen') {
          const err: any = new Error('503 Service UNAVAILABLE');
          err.status = 503;
          throw err;
        }
        return { text: makeValidDeepWritingJson() };
      });

      const resFallback = await fetch(`${baseUrl}/api/writing/deep-evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`
        },
        body: JSON.stringify({
          essayText: SAMPLE_WRITING_ESSAY,
          taskType: 2,
          examFormat: 'Academic'
        })
      });
      assert.equal(resFallback.status, 200);
      const dataFallback = await resFallback.json();
      assert.equal(dataFallback.isValidAttempt, true);
      assert.equal(dataFallback.modelUsed, 'gemini-3.1-flash-lite');
      assert.equal(dataFallback.evaluationSource, 'gemini-3.1-flash-lite');
      assert.equal(dataFallback.fallbackUsed, true);
      assert.deepEqual(attempted, ['gemini-4-hydrogen', 'gemini-3.1-flash-lite']);

      // Case B: all models fail -> structured unavailable response, NO fabricated scores
      const allFailAttempted: string[] = [];
      setGeminiGenerateOverrideForTesting(async ({ model }) => {
        allFailAttempted.push(model);
        const err: any = new Error('503 Upstream overloaded');
        err.status = 503;
        throw err;
      });

      const resAllFail = await fetch(`${baseUrl}/api/writing/deep-evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`
        },
        body: JSON.stringify({
          essayText: SAMPLE_WRITING_ESSAY,
          taskType: 2,
          examFormat: 'Academic'
        })
      });
      assert.equal(resAllFail.status, 502);
      const dataFail = await resAllFail.json();
      assert.equal(dataFail.isValidAttempt, false);
      assert.equal(dataFail.assessmentStatus, 'unavailable');
      assert.equal(dataFail.overallBand, null);
      assert.equal(dataFail.taScore, null);
      assert.equal(dataFail.ccScore, null);
      assert.equal(dataFail.lrScore, null);
      assert.equal(dataFail.graScore, null);
      assert.equal(dataFail.errorCategory, 'transient_service');
      assert.deepEqual(allFailAttempted, ['gemini-4-hydrogen', 'gemini-3.1-flash-lite']);
    });
  });

  describe('3 & 4. Speaking evaluation with configured model and fallback behavior', () => {
    it('evaluates /api/evaluate-speaking-turn with configured model and falls back cleanly on primary failure', async () => {
      process.env.GEMINI_MODEL = 'gemini-4-hydrogen';
      const primaryCalls: string[] = [];

      // Configured primary succeeds
      setGeminiGenerateOverrideForTesting(async ({ model }) => {
        primaryCalls.push(model);
        return { text: makeValidSpeakingEvalJson() };
      });

      const resOk = await fetch(`${baseUrl}/api/evaluate-speaking-turn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`
        },
        body: JSON.stringify({
          transcript: SAMPLE_SPEAKING_TRANSCRIPT,
          question: 'Do you think public parks are important in cities?',
          part: 1,
          topic: 'Parks',
          durationSec: 25
        })
      });
      assert.equal(resOk.status, 200);
      const okBody = await resOk.json();
      assert.equal(okBody.isValidAttempt, true);
      assert.equal(okBody.modelUsed, 'gemini-4-hydrogen');
      assert.equal(okBody.fallbackUsed, false);
      assert.equal(okBody.overallBand, null);
      assert.equal(okBody.criteria.pr, null);
      assert.equal(okBody.criteria.fc, 7.5);
      assert.deepEqual(primaryCalls, ['gemini-4-hydrogen']);

      // Primary fails with 404 NOT_FOUND -> falls back to gemini-3.1-flash-lite
      const fallbackCalls: string[] = [];
      setGeminiGenerateOverrideForTesting(async ({ model }) => {
        fallbackCalls.push(model);
        if (model === 'gemini-4-hydrogen') {
          const err: any = new Error('404 NOT_FOUND');
          err.status = 404;
          throw err;
        }
        return { text: makeValidSpeakingEvalJson() };
      });

      const resFb = await fetch(`${baseUrl}/api/evaluate-speaking-turn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`
        },
        body: JSON.stringify({
          transcript: `${SAMPLE_SPEAKING_TRANSCRIPT} Moreover, trees help cool neighborhoods during summer.`,
          question: 'Do you think public parks are important in cities?',
          part: 1,
          topic: 'Parks',
          durationSec: 28
        })
      });
      assert.equal(resFb.status, 200);
      const fbBody = await resFb.json();
      assert.equal(fbBody.isValidAttempt, true);
      assert.equal(fbBody.modelUsed, 'gemini-3.1-flash-lite');
      assert.equal(fbBody.fallbackUsed, true);
      assert.equal(fbBody.overallBand, null);
      assert.deepEqual(fallbackCalls, ['gemini-4-hydrogen', 'gemini-3.1-flash-lite']);

      // All models fail -> unavailable with null criteria and zero fake score
      setGeminiGenerateOverrideForTesting(async () => {
        const err: any = new Error('503 Service UNAVAILABLE');
        err.status = 503;
        throw err;
      });

      const resDown = await fetch(`${baseUrl}/api/evaluate-speaking-turn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`
        },
        body: JSON.stringify({
          transcript: `${SAMPLE_SPEAKING_TRANSCRIPT} Green spaces also support local wildlife.`,
          question: 'Why do cities invest in parks?',
          part: 3,
          topic: 'Urban Planning',
          durationSec: 30
        })
      });
      assert.equal(resDown.status, 502);
      const downBody = await resDown.json();
      assert.equal(downBody.isValidAttempt, false);
      assert.equal(downBody.assessmentStatus, 'unavailable');
      assert.equal(downBody.overallBand, null);
      assert.equal(downBody.criteria.fc, null);
      assert.equal(downBody.criteria.lr, null);
      assert.equal(downBody.criteria.gra, null);
      assert.equal(downBody.criteria.pr, null);
    });
  });

  describe('5. Barnaby tutor chat with authentication & safe model policy', () => {
    it('uses configured GEMINI_MODEL when authenticated, rejects untrusted model overrides, and falls back honestly when unavailable', async () => {
      process.env.GEMINI_MODEL = 'gemini-3.1-flash-lite';
      const seenModels: string[] = [];

      setGeminiGenerateOverrideForTesting(async ({ model }) => {
        seenModels.push(model);
        return {
          text: JSON.stringify({
            reply: 'Focus on paraphrasing the question before stating your thesis.',
            mood: 'happy',
            strategyTip: 'State your position clearly in the introduction.',
            academicCollocations: ['municipal funding', 'carbon intensity', 'urban livability'],
            suggestedNextAction: { label: 'Open Writing Studio', route: '/practice/writing' },
            bengaliTip: 'ভূমিকাতেই নিজের অবস্থান স্পষ্ট করো।'
          })
        };
      });

      // Authenticated Barnaby request with untrusted paid/deprecated model attempt -> ignored in favor of configured GEMINI_MODEL
      const res = await fetch(`${baseUrl}/api/tutor/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`
        },
        body: JSON.stringify({
          message: 'How do I start a Writing Task 2 essay?',
          persona: 'lexical_barnaby',
          model: 'gemini-4-argon',
          context: { module: 'writing', examMode: 'Academic' }
        })
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.isAiPowered, true);
      assert.equal(body.modelUsed, 'gemini-3.1-flash-lite');
      assert.equal(body.fallbackUsed, false);
      assert.deepEqual(seenModels, ['gemini-3.1-flash-lite']);

      // On auth_invalid error -> stops immediately after 1 attempt and returns honest isAiPowered=false syllabus fallback
      const authFailModels: string[] = [];
      setGeminiGenerateOverrideForTesting(async ({ model }) => {
        authFailModels.push(model);
        const err: any = new Error('API_KEY_INVALID');
        err.status = 400;
        throw err;
      });

      const resAuthFail = await fetch(`${baseUrl}/api/tutor/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`
        },
        body: JSON.stringify({
          message: 'Give me a Reading TFNG tip',
          persona: 'lexical_barnaby',
          context: { module: 'reading' }
        })
      });
      assert.equal(resAuthFail.status, 200);
      const fbBody = await resAuthFail.json();
      assert.equal(fbBody.isAiPowered, false);
      assert.equal(fbBody.errorCategory, 'auth_invalid');
      assert.equal(authFailModels.length, 1, 'Must NOT retry fallback models on invalid API key');
    });
  });

  describe('6. ReadingLab terminology correction, Reading scoring integrity & static MOCK_EXAM_SETS preservation', () => {
    it('replaces all CAMBRIDGE PASSAGE labels with BANDSPRINT PASSAGE in ReadingLab.tsx', () => {
      const readingLabSrc = fs.readFileSync(
        path.join(process.cwd(), 'src/components/ReadingLab.tsx'),
        'utf-8'
      );
      assert.ok(!/CAMBRIDGE\s+PASSAGE/i.test(readingLabSrc), 'ReadingLab.tsx must not contain CAMBRIDGE PASSAGE labels');
      for (let i = 1; i <= 6; i++) {
        assert.ok(
          readingLabSrc.includes(`BANDSPRINT PASSAGE ${i} ·`),
          `ReadingLab.tsx must include BANDSPRINT PASSAGE ${i}`
        );
      }
    });

    it('preserves Reading answer evaluation, Academic vs GT band conversion, and static MOCK_EXAM_SETS integrity', () => {
      const tfngQuestion: any = {
        id: 1,
        section: 'Reading',
        type: 'true_false_not_given',
        prompt: 'Beavers decelerate river water flow.',
        correctAnswer: 'TRUE'
      };
      assert.equal(evaluateQuestionResponse(tfngQuestion, 'TRUE').isCorrect, true);
      assert.equal(evaluateQuestionResponse(tfngQuestion, 'true').isCorrect, true);
      assert.equal(evaluateQuestionResponse(tfngQuestion, 'NOT GIVEN').isIncorrect, true);
      assert.equal(evaluateQuestionResponse(tfngQuestion, '').isUnanswered, true);

      const completionQuestion: any = {
        id: 2,
        section: 'Reading',
        type: 'fill_in_blank',
        prompt: 'Stored water replenishes subterranean ___.',
        correctAnswer: 'aquifers'
      };
      assert.equal(evaluateQuestionResponse(completionQuestion, 'aquifers').isCorrect, true);
      assert.equal(evaluateQuestionResponse(completionQuestion, 'rivers').isIncorrect, true);

      assert.equal(convertAcademicReadingRawScoreToBand(30), 7.0);
      assert.equal(convertGeneralTrainingReadingRawScoreToBand(30), 6.0);
      assert.equal(convertListeningRawScoreToBand(35), 8.0);
      assert.equal(convertAcademicReadingRawScoreToBand(0), 0.0);

      assert.ok(Array.isArray(MOCK_EXAM_SETS) && MOCK_EXAM_SETS.length > 0, 'MOCK_EXAM_SETS must remain populated');
      for (const exam of MOCK_EXAM_SETS) {
        assert.ok(exam.id && exam.title, 'Each static mock exam must retain id and title');
        assert.ok(typeof exam.readingPassage === 'string' && exam.readingPassage.length > 0);
        assert.ok(typeof exam.listeningScript === 'string' && exam.listeningScript.length > 0);
        assert.ok(Array.isArray(exam.questions) && exam.questions.length > 0);
      }
    });
  });

  describe('7 & 8. Listening TTS voice catalog, streaming & fallback integrity', () => {
    it('serves TTS speaker catalog and handles /api/tts/stream cleanly with truthful provider headers', async () => {
      const speakersRes = await fetch(`${baseUrl}/api/tts/speakers`);
      assert.equal(speakersRes.status, 200);
      const speakersData = await speakersRes.json();
      assert.ok(
        speakersData.speakers &&
          typeof speakersData.speakers === 'object' &&
          Object.keys(speakersData.speakers).length > 0
      );

      // Missing text must return 400
      const badReq = await fetch(`${baseUrl}/api/tts/stream`);
      assert.equal(badReq.status, 400);

      // Live TTS stream request without Gemini API key exercises MsEdgeTTS / fallback cascade
      delete process.env.GEMINI_API_KEY;
      const streamRes = await fetch(
        `${baseUrl}/api/tts/stream?text=${encodeURIComponent('Good morning. Welcome to your IELTS listening test.')}&speakerId=speaker_04&speed=1.0`
      );

      // In online environments this returns 200 audio/mpeg with truthful fallback headers;
      // in restricted offline sandboxes it must fail cleanly with 503 (never crash with 500).
      assert.ok(
        streamRes.status === 200 || streamRes.status === 503,
        `Expected HTTP 200 or 503 from /api/tts/stream, got ${streamRes.status}`
      );
      if (streamRes.status === 200) {
        assert.equal(streamRes.headers.get('content-type'), 'audio/mpeg');
        const provider = streamRes.headers.get('x-audio-provider');
        const fallbackStatus = streamRes.headers.get('x-fallback-status');
        assert.ok(provider && ['gemini-neural-tts', 'edge-neural', 'translate-tts-fallback'].includes(provider));
        assert.ok(fallbackStatus);
        if (provider === 'translate-tts-fallback') {
          assert.match(String(streamRes.headers.get('cache-control') || ''), /no-store/i);
        }
        const buf = Buffer.from(await streamRes.arrayBuffer());
        assert.ok(buf.length > 256, 'Streamed MP3 audio buffer must be non-empty');
      }
    });

    it('verifies Gemini TTS auth-invalid fast-fail and degraded fallback non-cache policy in server.ts', () => {
      const serverSrc = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf-8');
      assert.ok(serverSrc.includes("if (classified.category === 'auth_invalid')"), 'Gemini Neural TTS must fast-fail on invalid API key');
      assert.ok(serverSrc.includes("'gemini-3.8-flash-lite-tts'") && serverSrc.includes("'gemini-3.8-flash-tts'"));
      assert.ok(serverSrc.includes("res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');"));
    });
  });

  describe('9. Invalid API key & quota exhaustion non-retry enforcement', () => {
    it('does NOT retry fallback models on invalid API key or permission failure and never exposes keys', async () => {
      process.env.GEMINI_MODEL = 'gemini-4-hydrogen';
      const secretMarker = 'AIzaSy_SUPER_SECRET_NEVER_EXPOSE_999';
      process.env.GEMINI_API_KEY = secretMarker;

      const attempted: string[] = [];
      setGeminiGenerateOverrideForTesting(async ({ model }) => {
        attempted.push(model);
        const err: any = new Error(`PERMISSION_DENIED: invalid API key ${secretMarker}`);
        err.status = 403;
        throw err;
      });

      const res = await fetch(`${baseUrl}/api/writing/deep-evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`
        },
        body: JSON.stringify({
          essayText: SAMPLE_WRITING_ESSAY,
          taskType: 2,
          examFormat: 'Academic'
        })
      });

      assert.equal(res.status, 503);
      const body = await res.json();
      assert.equal(attempted.length, 1, 'Must NOT attempt fallback model on auth/permission error');
      assert.equal(body.isValidAttempt, false);
      assert.equal(body.assessmentStatus, 'unavailable');
      assert.equal(body.errorCategory, 'auth_invalid');
      assert.equal(body.canRetry, false);
      assert.equal(body.overallBand, null);
      assert.ok(!JSON.stringify(body).includes(secretMarker), 'Response must NEVER leak API key or raw provider secret');
    });

    it('does NOT loop across fallbacks on 429 quota exhaustion and returns structured 429 with null scores', async () => {
      process.env.GEMINI_MODEL = 'gemini-4-hydrogen';
      const attempted: string[] = [];

      setGeminiGenerateOverrideForTesting(async ({ model }) => {
        attempted.push(model);
        const err: any = new Error('RESOURCE_EXHAUSTED: You exceeded your current quota.');
        err.status = 429;
        throw err;
      });

      const res = await fetch(`${baseUrl}/api/evaluate-writing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`
        },
        body: JSON.stringify({
          essayText: `${SAMPLE_WRITING_ESSAY} Expanding rail lines lowers commute stress.`,
          prompt: 'Public transit',
          testType: 'task2'
        })
      });

      assert.equal(res.status, 429);
      const body = await res.json();
      assert.equal(attempted.length, 1, 'Must NOT loop across fallback models on quota exhaustion');
      assert.equal(body.isValidAttempt, false);
      assert.equal(body.assessmentStatus, 'unavailable');
      assert.equal(body.errorCategory, 'quota_exhausted');
      assert.equal(body.overallBand, null);
      assert.equal(body.trScore, null);
    });

    it('bounds fallback execution directly via generateContentWithFallback', async () => {
      const calls: string[] = [];
      const outcome = await generateContentWithFallback({
        apiKey: 'dummy',
        contents: 'hello',
        envModel: 'gemini-3.5-flash-lite',
        timeoutMs: 1000,
        generateFn: async ({ model }) => {
          calls.push(model);
          const err: any = new Error('404 NOT_FOUND');
          err.status = 404;
          throw err;
        }
      });

      assert.equal(outcome.ok, false);
      assert.equal(calls.length, 3);
      assert.deepEqual(calls, ['gemini-3.5-flash-lite', 'gemini-4-hydrogen', 'gemini-3.1-flash-lite']);
    });
  });
});
