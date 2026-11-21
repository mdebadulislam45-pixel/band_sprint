/**
 * BAND SPRINT — PHASE 3B.4 WRITING EVIDENCE INTEGRITY, ANTI-FABRICATION & NULL-SAFE UI SUITE
 *
 * Covers all 10 mandatory verification scenarios:
 *  1. Valid four-criterion Writing evaluation
 *  2. Null overallBand and null criteria on insufficient evidence
 *  3. Null overallBand and null criteria on unavailable API response
 *  4. Malformed AI response rejection
 *  5. Invalid and non-half-band score rejection
 *  6. Null-safe Writing UI SSR rendering
 *  7. Offline structural pre-check without IELTS band generation
 *  8. Writing evaluation failure without fabricated fallback
 *  9. No persistence of incomplete Writing scores
 * 10. No incomplete Writing result qualifying a Full Mock
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Minimal in-memory localStorage polyfill for Node verification of userStorage persistence guards
const memoryStorage = new Map<string, string>();
if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (k: string) => (memoryStorage.has(k) ? memoryStorage.get(k)! : null),
    setItem: (k: string, v: string) => {
      memoryStorage.set(k, String(v));
    },
    removeItem: (k: string) => {
      memoryStorage.delete(k);
    },
    clear: () => {
      memoryStorage.clear();
    }
  };
}

import {
  validateCriterionBand,
  validateWritingAiPayload,
  validateClientWritingEvaluation,
  formatNullableBand
} from '../../utils/scoringIntegrity';
import {
  checkWritingWordThreshold,
  runOfflineWritingStructuralPrecheck
} from '../../services/WritingEvaluationService';
import { grammarFeedbackEngine } from '../../services/GrammarFeedbackEngine';
import { parseAIMockWritingResponse, AIMockSuite } from '../../components/AIMockSuite';
import {
  parseArchitectWritingResponse,
  Band9EssayArchitect
} from '../../components/writing/Band9EssayArchitect';
import {
  buildWritingStructuralPrecheck,
  mapDeepWritingResponseToDiagnostic,
  shouldPersistWritingDiagnostic,
  WritingDiagnosticResult
} from '../../components/cdielts/CDIELTSWritingExamRoom';
import { WritingBandDiffStudio } from '../../components/writing/WritingBandDiffStudio';
import { AIWritingQuickEvaluator } from '../../components/home/AIWritingQuickEvaluator';
import { calculateMockExamScores } from '../../utils/mockExamScoring';
import {
  ACTIVE_USER_KEY,
  USERS_DIR_KEY,
  createDefaultProgress,
  getCurrentUser,
  recordExamAttempt,
  isFullMockExamRecord
} from '../../utils/userStorage';
import { MOCK_EXAM_SETS, SPEAKING_TOPIC_BANK } from '../../data/mockExams';
import { SpeakingAnswerRecord } from '../../types/speakingTypes';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  [PASS] ${name}`);
  } catch (err: any) {
    failed++;
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err?.message || err}`);
  }
}

const VALID_TASK2_ESSAY = `
In contemporary society, university education is widely regarded as an important driver of both personal upward mobility and national economic competitiveness. While some observers contend that governments should prioritize vocational apprenticeships over academic degrees, I firmly believe that balanced public investment in higher education remains indispensable for sustainable innovation, civic resilience, and long-term social equity across evolving economies.

On the one hand, tertiary institutions cultivate rigorous analytical reasoning, scientific literacy, and interdisciplinary problem-solving capacities that short-term training programmes rarely replicate. In fields such as clinical medicine, civil infrastructure, and environmental engineering, practitioners rely on years of structured empirical study to make safe, evidence-based decisions under complex real-world conditions. Furthermore, university research laboratories generate foundational discoveries that underpin technological breakthroughs across the private sector, creating entirely new industries that sustain high-value employment for future generations.

On the other hand, expanding university access without pragmatic alignment to labour market realities can leave graduates burdened by substantial tuition debt and prolonged underemployment. Vocational pathways in digital maintenance, specialized manufacturing, and healthcare support frequently offer direct employability and immediate earnings for school leavers. Consequently, modern university curricula should integrate applied internships, industry mentorship, and digital competencies alongside theoretical inquiry so students transition smoothly into productive careers without sacrificing intellectual depth.

In conclusion, although vocational training offers immediate operational benefits, robust support for university education yields enduring intellectual, civic, and macroeconomic dividends. Policymakers should therefore modernize university programmes and pair them with targeted technical pathways rather than diminish public funding for higher learning, thereby ensuring resilient national prosperity across generations.
`.trim();

const VALID_TASK1_REPORT = `
The line graph delineates the proportion of electricity generated from renewable sources across three European countries—Norway, Germany, and Spain—between 2005 and 2020.

Overall, all three nations recorded steady upward trajectories in clean energy adoption over the fifteen-year interval, with Norway maintaining a commanding lead throughout the entire period while Germany achieved the steepest proportional expansion after 2010.

In 2005, Norway already produced approximately 62% of its national electricity from renewable sources, far exceeding both comparative nations. Following minor plateaus between 2006 and 2009, Norwegian hydroelectric and wind output climbed steadily to reach an impressive peak of 88% by 2020. By contrast, Germany began at a modest 14% in the initial year and rose slowly to 22% by 2010 before accelerating sharply over the subsequent decade to culminate at 56% at the close of the timeframe. Meanwhile, Spain demonstrated moderate yet consistent progress, expanding from 20% in 2005 to 31% in 2013 and ultimately reaching 44% in 2020, narrowing the gap with Germany while remaining substantially below Norway.
`.trim();

async function runPhase3B4Tests() {
  console.log('\n=== BAND SPRINT: PHASE 3B.4 WRITING EVIDENCE INTEGRITY & NULL-SAFE UI SUITE ===\n');

  // -------------------------------------------------------------------------
  // 1. VALID FOUR-CRITERION WRITING EVALUATION
  // -------------------------------------------------------------------------
  console.log('1. Valid Four-Criterion Writing Evaluation');

  await test('validateWritingAiPayload & validateClientWritingEvaluation accept complete valid 4-criterion Task 2 response', () => {
    const serverRes = validateWritingAiPayload(
      {
        trScore: 7.5,
        ccScore: 7.0,
        lrScore: 7.5,
        graScore: 7.0,
        overallBand: 9.0 // intentionally mismatched; server helper computes authoritative average (7.25 -> 7.5)
      },
      { essayText: VALID_TASK2_ESSAY, taskType: 'task2' }
    );
    assert.equal(serverRes.valid, true);
    assert.equal(serverRes.assessmentStatus, 'evaluated');
    assert.deepEqual(serverRes.criteria, { ta: 7.5, cc: 7.0, lr: 7.5, gra: 7.0 });
    assert.equal(serverRes.overallBand, 7.5);

    const clientRes = validateClientWritingEvaluation({
      assessmentStatus: serverRes.assessmentStatus,
      isValidAttempt: true,
      trScore: serverRes.criteria.ta,
      ccScore: serverRes.criteria.cc,
      lrScore: serverRes.criteria.lr,
      graScore: serverRes.criteria.gra,
      overallBand: serverRes.overallBand
    });
    assert.equal(clientRes.valid, true);
    assert.equal(clientRes.assessmentStatus, 'evaluated');
    assert.equal(clientRes.overallBand, 7.5);
  });

  await test('AIMockSuite, CDIELTSWritingExamRoom, Band9EssayArchitect, and GrammarFeedbackEngine accept valid 4-criterion payloads', async () => {
    const validPayload = {
      isValidAttempt: true,
      assessmentStatus: 'evaluated',
      evaluationSource: 'gemini-4-hydrogen',
      trScore: 7.0,
      ccScore: 7.5,
      lrScore: 7.0,
      graScore: 7.5,
      overallBand: 7.5,
      taScore: 7.0,
      taSummary: 'Clear position throughout.',
      ccSummary: 'Logical paragraph progression.',
      lrSummary: 'Precise academic collocations.',
      graSummary: 'Good control of complex clauses.',
      proficiencyTitle: 'Good User',
      trComment: 'Clear thesis.',
      ccComment: 'Effective progression.',
      lrComment: 'Appropriate lexis.',
      graComment: 'Few slips.',
      verdict: 'Well-balanced academic essay.'
    };

    const aiMockParsed = parseAIMockWritingResponse({
      httpOk: true,
      httpStatus: 200,
      data: validPayload,
      testType: 'task2'
    });
    assert.equal(aiMockParsed.assessmentStatus, 'evaluated');
    assert.equal(aiMockParsed.overallBand, 7.5);
    assert.equal(aiMockParsed.trScore, 7.0);

    const architectParsed = parseArchitectWritingResponse({
      httpOk: true,
      httpStatus: 200,
      data: validPayload
    });
    assert.equal(architectParsed.status, 'evaluated');
    assert.equal(architectParsed.scores.overall, 7.5);
    assert.equal(architectParsed.scores.gra, 7.5);

    const precheck = buildWritingStructuralPrecheck(VALID_TASK2_ESSAY, 2, 7.5);
    const deepMapped = mapDeepWritingResponseToDiagnostic({
      httpOk: true,
      httpStatus: 200,
      data: validPayload,
      fallbackPrecheck: precheck
    });
    assert.equal(deepMapped.assessmentStatus, 'evaluated');
    assert.equal(deepMapped.overallBand, 7.5);
    assert.equal(shouldPersistWritingDiagnostic(deepMapped), true);

    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async () =>
        new Response(JSON.stringify(validPayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })) as any;
      const gfe = await grammarFeedbackEngine.analyzeWriting({
        essayText: VALID_TASK2_ESSAY,
        prompt: 'Discuss university education funding.',
        testType: 'task2'
      });
      assert.equal(gfe.assessmentStatus, 'evaluated');
      assert.equal(gfe.estimatedBands.overall, 7.5);
      assert.equal(gfe.estimatedBands.taskAchievement, 7.0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------------------
  // 2. NULL OVERALLBAND & CRITERIA ON INSUFFICIENT EVIDENCE
  // -------------------------------------------------------------------------
  console.log('2. Insufficient Evidence Null Contract');

  await test('Short Task 1 (<30w), short Task 2 (<50w), and gibberish return insufficient_evidence with all null scores (never 0.0)', () => {
    const shortT1 = checkWritingWordThreshold('The chart shows two percentages.', 'task1');
    assert.equal(shortT1.isValidAttempt, false);
    assert.equal(shortT1.assessmentStatus, 'insufficient_evidence');
    assert.equal(shortT1.overallBand, null);
    assert.equal(shortT1.criteria.ta, null);

    const shortT2 = checkWritingWordThreshold('Education is good for people.', 'task2');
    assert.equal(shortT2.isValidAttempt, false);
    assert.equal(shortT2.assessmentStatus, 'insufficient_evidence');
    assert.equal(shortT2.overallBand, null);

    const gibberish = checkWritingWordThreshold(
      'aaaa bbbb cccc dddd eeee ffff gggg hhhh iiii jjjj kkkk llll mmmm nnnn oooo pppp qqqq rrrr ssss tttt',
      'task2'
    );
    assert.equal(gibberish.isValidAttempt, false);
    assert.equal(gibberish.assessmentStatus, 'insufficient_evidence');

    const serverShort = validateWritingAiPayload(
      { criteria: { ta: 6.5, cc: 6.5, lr: 6.5, gra: 6.5 }, overallBand: 6.5 },
      { essayText: 'Too short to evaluate.', taskType: 'task2' }
    );
    assert.equal(serverShort.valid, false);
    assert.equal(serverShort.assessmentStatus, 'insufficient_evidence');
    assert.equal(serverShort.overallBand, null);
    assert.equal(serverShort.criteria.ta, null);

    const precheckShort = buildWritingStructuralPrecheck('Short draft.', 2, 7.5);
    assert.equal(precheckShort.assessmentStatus, 'insufficient_evidence');
    assert.equal(precheckShort.overallBand, null);
    assert.equal(precheckShort.taScore, null);
    assert.equal(precheckShort.ccScore, null);
    assert.equal(precheckShort.lrScore, null);
    assert.equal(precheckShort.graScore, null);
  });

  await test('Client mappers honor server assessmentStatus: insufficient_evidence with all null scores', () => {
    const payload = {
      isValidAttempt: false,
      assessmentStatus: 'insufficient_evidence',
      overallBand: null,
      error: 'Submission Too Short for Assessment (12 words).'
    };

    const aiMockRes = parseAIMockWritingResponse({
      httpOk: false,
      httpStatus: 400,
      data: payload,
      testType: 'task2'
    });
    assert.equal(aiMockRes.assessmentStatus, 'insufficient_evidence');
    assert.equal(aiMockRes.overallBand, null);
    assert.equal(aiMockRes.trScore, null);

    const architectRes = parseArchitectWritingResponse({
      httpOk: false,
      httpStatus: 400,
      data: payload
    });
    assert.equal(architectRes.status, 'insufficient_evidence');
    assert.equal(architectRes.scores.overall, null);

    const deepRes = mapDeepWritingResponseToDiagnostic({
      httpOk: false,
      httpStatus: 400,
      data: payload,
      fallbackPrecheck: buildWritingStructuralPrecheck(VALID_TASK2_ESSAY, 2, 7.5)
    });
    assert.equal(deepRes.assessmentStatus, 'insufficient_evidence');
    assert.equal(deepRes.overallBand, null);
  });

  // -------------------------------------------------------------------------
  // 3. NULL OVERALLBAND & CRITERIA ON UNAVAILABLE API RESPONSE
  // -------------------------------------------------------------------------
  console.log('3. Unavailable API Response Null Contract');

  await test('HTTP 401, 502, 503 and network errors return unavailable with all null scores across all Writing services & UI mappers', async () => {
    for (const status of [401, 502, 503]) {
      const aiMock = parseAIMockWritingResponse({
        httpOk: false,
        httpStatus: status,
        data: { error: `HTTP ${status} failure` },
        testType: 'task2'
      });
      assert.equal(aiMock.assessmentStatus, 'unavailable');
      assert.equal(aiMock.overallBand, null);
      assert.equal(aiMock.trScore, null);
      assert.equal(aiMock.ccScore, null);
      assert.equal(aiMock.lrScore, null);
      assert.equal(aiMock.graScore, null);
      assert.equal(aiMock.canRetry, true);

      const arch = parseArchitectWritingResponse({
        httpOk: false,
        httpStatus: status,
        data: { error: `HTTP ${status} failure` }
      });
      assert.equal(arch.status, 'unavailable');
      assert.equal(arch.scores.overall, null);

      const precheck = buildWritingStructuralPrecheck(VALID_TASK2_ESSAY, 2, 7.5);
      const deep = mapDeepWritingResponseToDiagnostic({
        httpOk: false,
        httpStatus: status,
        data: { error: `HTTP ${status} failure` },
        fallbackPrecheck: precheck
      });
      assert.equal(deep.assessmentStatus, 'unavailable');
      assert.equal(deep.overallBand, null);
      assert.equal(deep.taScore, null);
      assert.equal(deep.canRetry, true);
      // Preserves structural precheck annotations for learner review
      assert.ok(deep.annotations.length > 0);
    }

    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async () => {
        throw new Error('Network unreachable');
      }) as any;
      const gfeErr = await grammarFeedbackEngine.analyzeWriting({
        essayText: VALID_TASK2_ESSAY,
        prompt: 'Discuss university education funding.',
        testType: 'task2'
      });
      assert.equal(gfeErr.assessmentStatus, 'unavailable');
      assert.equal(gfeErr.isValidAttempt, false);
      assert.equal(gfeErr.estimatedBands.overall, null);
      assert.equal(gfeErr.estimatedBands.taskAchievement, null);
      assert.equal(gfeErr.estimatedBands.coherenceCohesion, null);
      assert.equal(gfeErr.estimatedBands.lexicalResource, null);
      assert.equal(gfeErr.estimatedBands.grammaticalRange, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------------------
  // 4. MALFORMED AI RESPONSE REJECTION
  // -------------------------------------------------------------------------
  console.log('4. Malformed AI Response Rejection');

  await test('Rejects null, partial criteria, missing assessmentStatus: evaluated, and mismatched overallBand', () => {
    const malformedPayloads = [
      null,
      'not-an-object',
      {},
      { assessmentStatus: 'evaluated', trScore: 7.0, ccScore: 7.0, lrScore: 7.0, overallBand: 7.0 }, // missing graScore
      { trScore: 7.0, ccScore: 7.0, lrScore: 7.0, graScore: 7.0, overallBand: 7.0 }, // missing assessmentStatus
      {
        assessmentStatus: 'evaluated',
        trScore: 6.0,
        ccScore: 6.0,
        lrScore: 6.0,
        graScore: 6.0,
        overallBand: 7.5 // disagrees with 4-criterion average (6.0)
      },
      {
        assessmentStatus: 'unavailable',
        trScore: 7.0,
        ccScore: 7.0,
        lrScore: 7.0,
        graScore: 7.0,
        overallBand: 7.0
      }
    ];

    for (const payload of malformedPayloads) {
      const clientCheck = validateClientWritingEvaluation(payload);
      assert.equal(clientCheck.valid, false, `Expected invalid for ${JSON.stringify(payload)}`);
      assert.equal(clientCheck.overallBand, null);
      assert.equal(clientCheck.criteria.ta, null);

      const aiMock = parseAIMockWritingResponse({
        httpOk: true,
        httpStatus: 200,
        data: payload,
        testType: 'task2'
      });
      assert.notEqual(aiMock.assessmentStatus, 'evaluated');
      assert.equal(aiMock.overallBand, null);

      const arch = parseArchitectWritingResponse({
        httpOk: true,
        httpStatus: 200,
        data: payload
      });
      assert.notEqual(arch.status, 'evaluated');
      assert.equal(arch.scores.overall, null);
    }

    // Server-side payload validation also rejects partial/empty LLM payloads
    assert.equal(
      validateWritingAiPayload({ criteria: { ta: 7.0, cc: 7.0, lr: 7.0 } }, { essayText: VALID_TASK2_ESSAY, taskType: 'task2' }).valid,
      false
    );
  });

  // -------------------------------------------------------------------------
  // 5. INVALID AND NON-HALF-BAND SCORE REJECTION
  // -------------------------------------------------------------------------
  console.log('5. Invalid & Non-Half-Band Score Rejection');

  await test('validateCriterionBand and validateClientWritingEvaluation reject non-half-band and out-of-range values', () => {
    const invalidValues: any[] = [0, 0.5, 9.5, 6.3, '6.3', 7.25, 7.7, -1, NaN, Infinity, -Infinity, null, undefined, '', 'abc', true, {}];
    for (const val of invalidValues) {
      assert.equal(validateCriterionBand(val), null, `Expected validateCriterionBand(${String(val)}) === null`);
    }

    assert.equal(validateCriterionBand(1.0), 1.0);
    assert.equal(validateCriterionBand(6.5), 6.5);
    assert.equal(validateCriterionBand(9.0), 9.0);

    const nonHalfClient = validateClientWritingEvaluation({
      assessmentStatus: 'evaluated',
      trScore: 6.3,
      ccScore: 7.0,
      lrScore: 7.0,
      graScore: 7.0,
      overallBand: 7.0
    });
    assert.equal(nonHalfClient.valid, false);
    assert.equal(nonHalfClient.assessmentStatus, 'unavailable');
    assert.equal(nonHalfClient.overallBand, null);
  });

  // -------------------------------------------------------------------------
  // 6. NULL-SAFE WRITING UI SSR RENDERING
  // -------------------------------------------------------------------------
  console.log('6. Null-Safe Writing UI SSR Rendering');

  await test('WritingBandDiffStudio, AIWritingQuickEvaluator, AIMockSuite, and Band9EssayArchitect render safely with null/unavailable states', () => {
    const nullUnavailableDiagnostic: WritingDiagnosticResult = {
      isValidAttempt: false,
      assessmentStatus: 'unavailable',
      evaluationSource: 'unavailable',
      error: 'AI service timed out.',
      canRetry: true,
      taskType: 2,
      wordCount: 270,
      minWords: 250,
      overallBand: null,
      targetBand: 7.5,
      cefrLevel: 'Evaluation Unavailable',
      taScore: null,
      taSummary: 'Offline structural check note.',
      ccScore: null,
      ccSummary: 'Offline structural check note.',
      lrScore: null,
      lrSummary: 'Offline structural check note.',
      graScore: null,
      graSummary: 'Offline structural check note.',
      annotations: [
        {
          id: 's1',
          sentence: 'Fees is very big problem for students.',
          category: 'grammar',
          errorTitle: 'Agreement Slip',
          identifiedIssue: 'Plural subject with singular verb',
          suggestedCorrection: 'Tuition fees represent a substantial barrier for students.',
          rationaleEn: 'Ensure subject-verb agreement.'
        }
      ],
      upgradedModelParagraphs: []
    };

    const diffHtml = renderToStaticMarkup(
      React.createElement(WritingBandDiffStudio, {
        diagnosticResult: nullUnavailableDiagnostic,
        examFormat: 'Academic',
        testTitle: 'Cambridge Mock Test 1',
        onApplySingleFix: () => {},
        onApplyAllFixes: () => {},
        onShowToast: () => {},
        onRunGeminiDeepEvaluation: () => {},
        isRunningGeminiEval: false,
        geminiEvalError: 'Service temporarily unreachable.'
      })
    );
    assert.ok(diffHtml.includes('AI Score Unavailable'));
    assert.ok(!diffHtml.includes('NaN'));
    assert.ok(!diffHtml.includes('Band 0.0'));

    const quickHtml = renderToStaticMarkup(
      React.createElement(AIWritingQuickEvaluator, {
        onNavigate: () => {}
      })
    );
    assert.ok(quickHtml.includes('Offline · Non-Scoring'));
    assert.ok(!quickHtml.includes('Estimated Band'));
    assert.ok(!quickHtml.includes('Band 0.0'));

    const mockHtml = renderToStaticMarkup(
      React.createElement(AIMockSuite, {
        onShowToast: () => {}
      })
    );
    assert.ok(mockHtml.includes('AI Mock Exam Suite'));
    assert.ok(!mockHtml.includes('NaN'));

    const archHtml = renderToStaticMarkup(React.createElement(Band9EssayArchitect));
    assert.ok(archHtml.includes('IELTS Band 9 Writing Architect'));
    assert.ok(!archHtml.includes('NaN'));

    assert.equal(formatNullableBand(null), '—');
    assert.equal(formatNullableBand(undefined), '—');
    assert.equal(formatNullableBand(NaN), '—');
    assert.equal(formatNullableBand(7.5), '7.5');
  });

  // -------------------------------------------------------------------------
  // 7. OFFLINE STRUCTURAL PRE-CHECK WITHOUT IELTS BAND GENERATION
  // -------------------------------------------------------------------------
  console.log('7. Offline Structural Pre-Check Without IELTS Band Generation');

  await test('runOfflineWritingStructuralPrecheck and buildWritingStructuralPrecheck provide structural feedback with overallBand: null', () => {
    const precheck = runOfflineWritingStructuralPrecheck(
      `${VALID_TASK2_ESSAY}\n\nFurthermore, there are a lot of very big benefits for people.`,
      'task2'
    );
    assert.equal(precheck.isScoringAssessment, false);
    assert.equal(precheck.assessmentStatus, 'precheck_ready');
    assert.equal(precheck.overallBand, null);
    assert.ok(precheck.wordCount >= 200);
    assert.ok(precheck.paragraphCount >= 4);
    assert.ok(precheck.checklist.length >= 4);
    assert.ok(precheck.nonScoringNotice.toLowerCase().includes('not an ielts band score'));
    assert.ok(precheck.lexicalSuggestions.length >= 1);

    const examRoomPrecheck = buildWritingStructuralPrecheck(
      'Nowadays, university tuition fees is becoming a huge debate in many countries. ' + VALID_TASK2_ESSAY,
      2,
      7.5
    );
    assert.equal(examRoomPrecheck.assessmentStatus, 'structural_precheck');
    assert.equal(examRoomPrecheck.overallBand, null);
    assert.equal(examRoomPrecheck.taScore, null);
    assert.equal(examRoomPrecheck.ccScore, null);
    assert.equal(examRoomPrecheck.lrScore, null);
    assert.equal(examRoomPrecheck.graScore, null);
    assert.ok(examRoomPrecheck.annotations.some((a) => a.category !== 'clean'));
  });

  // -------------------------------------------------------------------------
  // 8. WRITING EVALUATION FAILURE WITHOUT FABRICATED FALLBACK
  // -------------------------------------------------------------------------
  console.log('8. Evaluation Failure Without Fabricated Fallback');

  await test('Removed dead local fallback scorers and static Band 7.0/6.0 fabrication from Writing components', () => {
    const aiMockSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/AIMockSuite.tsx'),
      'utf8'
    );
    assert.equal(
      aiMockSrc.includes('generateDiagnosticEvaluation'),
      false,
      'AIMockSuite.tsx must not retain local fallback generateDiagnosticEvaluation()'
    );
    assert.equal(
      aiMockSrc.includes('Diagnostic Heuristic Fallback'),
      false,
      'AIMockSuite.tsx must not retain heuristic fallback banners'
    );

    const archSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/writing/Band9EssayArchitect.tsx'),
      'utf8'
    );
    assert.equal(
      archSrc.includes('calculateScores'),
      false,
      'Band9EssayArchitect.tsx must not retain heuristic calculateScores()'
    );

    const examRoomSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/cdielts/CDIELTSWritingExamRoom.tsx'),
      'utf8'
    );
    assert.equal(
      examRoomSrc.includes('function evaluateCandidateWriting'),
      false,
      'CDIELTSWritingExamRoom.tsx must not retain local heuristic evaluateCandidateWriting()'
    );
    assert.equal(
      examRoomSrc.includes('Live Est:'),
      false,
      'CDIELTSWritingExamRoom.tsx must not render fake live keystroke IELTS band telemetry'
    );
  });

  // -------------------------------------------------------------------------
  // 9. NO PERSISTENCE OF INCOMPLETE WRITING SCORES
  // -------------------------------------------------------------------------
  console.log('9. Persistence Safeguards for Writing Evaluations');

  await test('shouldPersistWritingDiagnostic rejects incomplete/unavailable/precheck results and recordExamAttempt preserves existing valid history', () => {
    memoryStorage.clear();
    const testUser = {
      id: 'usr_phase3b4_test',
      name: 'Writing Integrity Candidate',
      email: 'writing.integrity@example.com',
      createdAt: Date.now(),
      progress: createDefaultProgress(7.5, 'Writing Integrity Candidate')
    };
    localStorage.setItem(USERS_DIR_KEY, JSON.stringify([testUser]));
    localStorage.setItem(ACTIVE_USER_KEY, testUser.id);

    // Seed an existing valid record
    recordExamAttempt({
      id: 'valid_writing_1',
      examType: 'writing_only',
      writingBand: 7.5,
      readingBand: null,
      listeningBand: null,
      speakingBand: null,
      overallBand: null,
      completedSkills: { writing: true },
      wordCount: 280,
      correctCount: 0,
      totalQuestions: 0,
      submissionType: 'manual'
    });

    const precheck = buildWritingStructuralPrecheck(VALID_TASK2_ESSAY, 2, 7.5);
    assert.equal(shouldPersistWritingDiagnostic(precheck), false);

    const unavailable = mapDeepWritingResponseToDiagnostic({
      httpOk: false,
      httpStatus: 503,
      data: { error: 'Upstream unavailable' },
      fallbackPrecheck: precheck
    });
    assert.equal(shouldPersistWritingDiagnostic(unavailable), false);

    const insufficient = buildWritingStructuralPrecheck('Too short.', 2, 7.5);
    assert.equal(shouldPersistWritingDiagnostic(insufficient), false);

    const partialScoreResult: WritingDiagnosticResult = {
      ...precheck,
      isValidAttempt: true,
      assessmentStatus: 'evaluated',
      overallBand: 7.0,
      taScore: 7.0,
      ccScore: null, // missing criterion
      lrScore: 7.0,
      graScore: 7.0
    };
    assert.equal(shouldPersistWritingDiagnostic(partialScoreResult), false);

    const validEvaluated = mapDeepWritingResponseToDiagnostic({
      httpOk: true,
      httpStatus: 200,
      data: {
        isValidAttempt: true,
        assessmentStatus: 'evaluated',
        trScore: 7.0,
        ccScore: 7.5,
        lrScore: 7.0,
        graScore: 7.5,
        overallBand: 7.5
      },
      fallbackPrecheck: precheck
    });
    assert.equal(shouldPersistWritingDiagnostic(validEvaluated), true);

    // Verify historical valid record remained intact and was not overwritten by null
    const user = getCurrentUser();
    assert.ok(user);
    assert.equal(user.progress.examHistory.length, 1);
    assert.equal(user.progress.examHistory[0].id, 'valid_writing_1');
    assert.equal(user.progress.examHistory[0].writingBand, 7.5);
    assert.equal(isFullMockExamRecord(user.progress.examHistory[0]), false);
  });

  // -------------------------------------------------------------------------
  // 10. NO INCOMPLETE WRITING RESULT QUALIFYING A FULL MOCK
  // -------------------------------------------------------------------------
  console.log('10. Full Mock Completeness Guard for Incomplete Writing');

  await test('Under-length or single-task Writing prevents Full Mock completion while preserving valid Writing diagnostics', () => {
    const examSet = MOCK_EXAM_SETS[0];
    const topicSet = SPEAKING_TOPIC_BANK[0];
    const answers: Record<number, string> = {};
    for (const q of examSet.questions) {
      answers[q.id] = q.correctAnswer;
    }

    const makeAudioTurn = (
      part: 1 | 2 | 3,
      questionId: string,
      questionText: string,
      transcript: string
    ): SpeakingAnswerRecord => ({
      questionId,
      part,
      topic: topicSet.title,
      questionText,
      transcript,
      startTime: 0,
      endTime: 25_000,
      durationSec: 25,
      wordCount: transcript.trim().split(/\s+/).filter(Boolean).length,
      wordsPerMinute: 125,
      pauseCount: null,
      longPauseCount: null,
      fillerCount: 0,
      detectedFillers: [],
      instantFeedback: {
        questionId,
        questionText,
        part,
        topic: topicSet.title,
        candidateTranscript: transcript,
        isValidAttempt: true,
        assessmentStatus: 'evaluated',
        evidenceMode: 'audio_and_transcript',
        pronunciationObservable: true,
        isPartialAssessment: false,
        unassessedCriteria: [],
        wordCount: transcript.trim().split(/\s+/).filter(Boolean).length,
        overallBand: 7.0,
        partialThreeCriterionIndex: null,
        criteria: { fc: 7.0, lr: 7.0, gra: 7.0, pr: 7.0 },
        durationSec: 25,
        wordsPerMinute: 125,
        estimatedBand: 7.0,
        estimatedBands: {
          fluency: 7.0,
          lexical: 7.0,
          grammar: 7.0,
          pronunciation: 7.0,
          overall: 7.0
        },
        grammaticalErrors: [],
        pronunciation: {
          clarityBand: 7.0,
          cadenceWpm: 125,
          trickyWords: [],
          connectedSpeechTips: [],
          intonationPattern: 'Natural pitch variation',
          rhythmVerdict: 'Consistent'
        },
        band8Answer: {
          bandScore: 8.5,
          modelAnswer: 'Sample Band 8.5 response.',
          highlightedCollocations: [],
          keyDiscourseMarkers: [],
          examinerRationale: 'Strong cohesion.'
        },
        actionableTips: []
      }
    });

    const completeSpeaking: SpeakingAnswerRecord[] = [
      ...topicSet.part1Questions.map((q, idx) =>
        makeAudioTurn(
          1,
          `${topicSet.id}_p1_${idx}`,
          q,
          'I have spent the past several years studying engineering in my hometown while participating in community technology workshops.'
        )
      ),
      makeAudioTurn(
        2,
        `${topicSet.id}_p2`,
        topicSet.part2CueCard.topic,
        'One memorable mentor who shaped my academic direction was my secondary physics instructor, whose patient demonstrations transformed abstract mechanics into tangible experiments.'
      ),
      ...topicSet.part3Questions.map((q, idx) =>
        makeAudioTurn(
          3,
          `${topicSet.id}_p3_${idx}`,
          q,
          'Technological automation will steadily shift routine administrative duties toward specialized oversight, making adaptable lifelong education more valuable than static credentials.'
        )
      )
    ];

    // Case A: Only Task 2 is complete (>= 250w); Task 1 is short (< 150w, >= 30w diagnostic)
    const underTargetTask1 =
      'The chart compares renewable energy across three nations from 2005 to 2020. Overall, Norway stayed highest while Germany grew steadily over the observed years, and Spain rose more slowly across the entire interval shown.';
    const partialMock = calculateMockExamScores({
      questions: examSet.questions,
      answers,
      task1Text: underTargetTask1,
      essayText: VALID_TASK2_ESSAY,
      speakingAnswers: completeSpeaking,
      format: 'Academic',
      speakingTopicSet: topicSet
    });

    assert.equal(partialMock.isListeningComplete, true);
    assert.equal(partialMock.isReadingComplete, true);
    assert.equal(partialMock.isSpeakingComplete, true);
    assert.equal(partialMock.isWritingComplete, false);
    assert.equal(partialMock.isWritingPartial, true);
    assert.equal(partialMock.wBand, null);
    assert.ok(partialMock.wDiagnosticBand !== null);
    assert.equal(partialMock.isCompleteFullMock, false);
    assert.equal(partialMock.overall, null);
    assert.ok(partialMock.incompleteSkills.includes('writing'));

    // Case B: Empty Writing does not yield any Writing or Overall band
    const missingWritingMock = calculateMockExamScores({
      questions: examSet.questions,
      answers,
      task1Text: '',
      essayText: '',
      speakingAnswers: completeSpeaking,
      format: 'Academic',
      speakingTopicSet: topicSet
    });
    assert.equal(missingWritingMock.isWritingComplete, false);
    assert.equal(missingWritingMock.wBand, null);
    assert.equal(missingWritingMock.wDiagnosticBand, null);
    assert.equal(missingWritingMock.overall, null);
    assert.equal(missingWritingMock.isCompleteFullMock, false);

    // Case C: Complete Task 1 (>=150w) + Task 2 (>=250w) qualifies Writing & Full Mock
    const completeMock = calculateMockExamScores({
      questions: examSet.questions,
      answers,
      task1Text: VALID_TASK1_REPORT,
      essayText: VALID_TASK2_ESSAY,
      speakingAnswers: completeSpeaking,
      format: 'Academic',
      speakingTopicSet: topicSet
    });
    assert.equal(completeMock.isWritingComplete, true);
    assert.ok(completeMock.wBand !== null);
    assert.equal(completeMock.isCompleteFullMock, true);
    assert.ok(completeMock.overall !== null);
  });

  console.log(`\nPhase 3B.4 Summary: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3B4Tests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
