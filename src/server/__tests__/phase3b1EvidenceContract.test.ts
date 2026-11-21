/**
 * BAND SPRINT — PHASE 3B.1 EVIDENCE CONTRACT, AUTH HEADER & UI NULL-SAFETY VERIFICATION SUITE
 *
 * Verifies:
 * 1. Core Speaking evidence contract (transcript-only partial index, null overallBand/pr, audio-backed complete, insufficient/unavailable null)
 * 2. Core Writing evidence contract (insufficient/unavailable null scores, never 0)
 * 3. Removal of unnormalized pauseCount >= 6 Fluency cap
 * 4. Client Bearer Authorization header attachment & fail-closed handling (401, 503, network error, 200 transcript-only)
 * 5. GrammarFeedbackEngine Speaking/Writing null contract & dead offline fallback removal
 * 6. Server route audio-evidence hardening & dead server fallback removal
 * 7. Coordinated UI null-safety (SSR rendering of InstantSpeakingFeedbackModal & BritishCouncilSpeakingResult + SpeakingLabPage / VoiceExaminer / LiveMockTest / LiveAvatarSpeakingPartner / CueScratchpad integrity checks)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  validateSpeakingAiPayload,
  validateWritingAiPayload
} from '../../utils/scoringIntegrity';
import {
  evaluateSingleSpeakingTurn,
  evaluateSpeakingSession,
  generateDiagnosticTurnFeedback
} from '../../services/SpeakingEvaluationService';
import { grammarFeedbackEngine } from '../../services/GrammarFeedbackEngine';
import { InstantSpeakingFeedbackModal } from '../../components/speaking/InstantSpeakingFeedbackModal';
import { BritishCouncilSpeakingResult } from '../../components/speaking/BritishCouncilSpeakingResult';
import {
  InstantSpeakingFeedback,
  SpeakingEvaluationReport
} from '../../types/speakingTypes';

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

async function runPhase3B1Tests() {
  console.log('\n=== BAND SPRINT: PHASE 3B.1 EVIDENCE CONTRACT & NULL-SAFETY SUITE ===\n');

  // -------------------------------------------------------------------------
  // 1. SPEAKING EVIDENCE CONTRACT
  // -------------------------------------------------------------------------
  console.log('1. Core Speaking Evidence Contract');

  await test('Transcript-only speaking strips LLM pronunciation & overallBand to null and exposes partialThreeCriterionIndex', () => {
    const res = validateSpeakingAiPayload(
      {
        criteria: { fc: 7.0, lr: 6.5, gra: 7.0, pr: 8.5 },
        overallBand: 8.0
      },
      {
        transcript:
          'I genuinely appreciate walking through local botanical gardens on Sunday afternoons because the tranquil atmosphere restores my concentration before the working week resumes.',
        hasAudioEvidence: false,
        durationSec: 22
      }
    );
    assert.equal(res.valid, true);
    assert.equal(res.assessmentStatus, 'partial_transcript_only');
    assert.equal(res.pronunciationObservable, false);
    assert.equal(res.isPartialAssessment, true);
    assert.deepEqual(res.unassessedCriteria, ['pronunciation']);
    assert.equal(res.criteria.fc, 7.0);
    assert.equal(res.criteria.lr, 6.5);
    assert.equal(res.criteria.gra, 7.0);
    assert.equal(res.criteria.pr, null);
    assert.equal(res.overallBand, null);
    assert.equal(res.partialThreeCriterionIndex, 7.0);
  });

  await test('Audio-backed speaking requires all 4 criteria, computes official overallBand, and sets partialThreeCriterionIndex to null', () => {
    const res = validateSpeakingAiPayload(
      {
        criteria: { fc: 7.0, lr: 6.5, gra: 6.5, pr: 7.0 },
        overallBand: 8.5
      },
      {
        transcript:
          'Remote collaboration software has significantly reduced daily commuting stress while allowing specialized teams to coordinate seamlessly across distant geographical time zones.',
        hasAudioEvidence: true,
        durationSec: 20
      }
    );
    assert.equal(res.valid, true);
    assert.equal(res.assessmentStatus, 'evaluated');
    assert.equal(res.pronunciationObservable, true);
    assert.equal(res.isPartialAssessment, false);
    assert.deepEqual(res.unassessedCriteria, []);
    assert.equal(res.criteria.pr, 7.0);
    assert.equal(res.overallBand, 7.0); // (7 + 6.5 + 6.5 + 7)/4 = 6.75 -> 7.0
    assert.equal(res.partialThreeCriterionIndex, null);
  });

  await test('Audio-backed speaking with missing pronunciation fails closed as unavailable with all null scores', () => {
    const res = validateSpeakingAiPayload(
      {
        criteria: { fc: 7.0, lr: 7.0, gra: 7.0 }
      },
      {
        transcript:
          'Learning a second language deepens cultural empathy and opens meaningful academic opportunities throughout adulthood.',
        hasAudioEvidence: true,
        durationSec: 15
      }
    );
    assert.equal(res.valid, false);
    assert.equal(res.assessmentStatus, 'unavailable');
    assert.equal(res.overallBand, null);
    assert.equal(res.partialThreeCriterionIndex, null);
    assert.deepEqual(res.criteria, { fc: null, lr: null, gra: null, pr: null });
  });

  await test('Insufficient / gibberish speaking returns null criteria and null overallBand (never 0)', () => {
    const shortRes = validateSpeakingAiPayload(
      { criteria: { fc: 6.5, lr: 6.5, gra: 6.5, pr: 6.5 } },
      { transcript: 'Just three words', hasAudioEvidence: false }
    );
    assert.equal(shortRes.valid, false);
    assert.equal(shortRes.assessmentStatus, 'insufficient_evidence');
    assert.equal(shortRes.overallBand, null);
    assert.equal(shortRes.partialThreeCriterionIndex, null);
    assert.deepEqual(shortRes.criteria, { fc: null, lr: null, gra: null, pr: null });

    const gibberishRes = validateSpeakingAiPayload(
      { criteria: { fc: 6.5, lr: 6.5, gra: 6.5 } },
      { transcript: 'asdf1234 qwer5678 zxcv9012 hjkl3456 mnbv7890 poiu2345', hasAudioEvidence: false }
    );
    assert.equal(gibberishRes.valid, false);
    assert.equal(gibberishRes.assessmentStatus, 'insufficient_evidence');
    assert.equal(gibberishRes.overallBand, null);
    assert.deepEqual(gibberishRes.criteria, { fc: null, lr: null, gra: null, pr: null });
  });

  await test('Unnormalized pauseCount >= 6 does NOT penalize Fluency on a clean extended Part 2 monologue', () => {
    const monologue =
      'Two summers ago I travelled to a historic mountain village in northern Japan with two close university colleagues. Throughout the week we stayed in a traditional timber guesthouse overlooking cedar valleys and natural hot springs. What stood out most vividly was the remarkable balance between architectural preservation and modern hospitality, which prompted me to reconsider how rapidly expanding cities might protect their local heritage without discouraging economic vitality.';
    const res = validateSpeakingAiPayload(
      {
        criteria: { fc: 8.0, lr: 8.0, gra: 8.0, pr: 7.5 }
      },
      {
        transcript: monologue,
        hasAudioEvidence: true,
        pauseCount: 12,
        durationSec: 110
      }
    );
    assert.equal(res.valid, true);
    assert.equal(res.criteria.fc, 8.0, `Clean monologue should not be penalized by raw pauseCount; got FC=${res.criteria.fc}`);
  });

  // -------------------------------------------------------------------------
  // 2. WRITING EVIDENCE CONTRACT
  // -------------------------------------------------------------------------
  console.log('\n2. Core Writing Evidence Contract');

  await test('Writing insufficient_evidence and unavailable paths return null scores (never 0)', () => {
    const shortRes = validateWritingAiPayload(
      { trScore: 7.0, ccScore: 7.0, lrScore: 7.0, graScore: 7.0 },
      { essayText: 'Short essay text only.', taskType: 'task2' }
    );
    assert.equal(shortRes.valid, false);
    assert.equal(shortRes.assessmentStatus, 'insufficient_evidence');
    assert.equal(shortRes.overallBand, null);
    assert.deepEqual(shortRes.criteria, { ta: null, cc: null, lr: null, gra: null });

    const malformedRes = validateWritingAiPayload(
      { trScore: 7.0, ccScore: 7.0, lrScore: 7.0 },
      {
        essayText:
          'Public investment in renewable energy networks accelerates industrial decarbonisation while improving long-term grid resilience. Although initial capital outlay remains substantial, declining battery costs and reduced healthcare expenditure from cleaner urban air generate enduring fiscal dividends for future generations. Consequently, policymakers should pair clean-power subsidies with transparent transition plans for legacy workers.',
        taskType: 'task2'
      }
    );
    assert.equal(malformedRes.valid, false);
    assert.equal(malformedRes.assessmentStatus, 'unavailable');
    assert.equal(malformedRes.overallBand, null);
    assert.deepEqual(malformedRes.criteria, { ta: null, cc: null, lr: null, gra: null });
  });

  // -------------------------------------------------------------------------
  // 3. CLIENT AUTH HEADER & FAIL-CLOSED SPEAKING/WRITING SERVICES
  // -------------------------------------------------------------------------
  console.log('\n3. Client Authentication Headers & Fail-Closed Service Behavior');

  const originalFetch = globalThis.fetch;
  const originalLocalStorage = (globalThis as any).localStorage;
  const storageMap = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => (storageMap.has(key) ? storageMap.get(key)! : null),
    setItem: (key: string, val: string) => storageMap.set(key, String(val)),
    removeItem: (key: string) => storageMap.delete(key)
  };
  storageMap.set('ielts_session_token_v2', 'test-token-3b1');

  try {
    await test('evaluateSingleSpeakingTurn attaches Authorization Bearer header and preserves transcript-only null overallBand on 200', async () => {
      let capturedAuthHeader: string | null = null;
      (globalThis as any).fetch = async (_url: string, init?: RequestInit) => {
        const headers = init?.headers as Record<string, string> | undefined;
        capturedAuthHeader = headers?.Authorization || headers?.authorization || null;
        return new Response(
          JSON.stringify({
            isValidAttempt: true,
            assessmentStatus: 'partial_transcript_only',
            evidenceMode: 'transcript_only',
            pronunciationObservable: false,
            isPartialAssessment: true,
            unassessedCriteria: ['pronunciation'],
            overallBand: null,
            partialThreeCriterionIndex: 7.0,
            criteria: { fc: 7.0, lr: 6.5, gra: 7.0, pr: null },
            estimatedBands: { fluency: 7.0, lexical: 6.5, grammar: 7.0, pronunciation: null, overall: null },
            grammaticalErrors: [],
            pronunciation: {
              clarityBand: null,
              cadenceWpm: 120,
              trickyWords: [],
              connectedSpeechTips: [],
              intonationPattern: 'Unassessed',
              rhythmVerdict: 'Transcript-only evaluation: acoustic pronunciation was not measured.'
            },
            band8Answer: {
              bandScore: 8.5,
              modelAnswer: 'Sample Band 8.5 model response.',
              highlightedCollocations: [],
              keyDiscourseMarkers: [],
              examinerRationale: 'Strong lexical precision.'
            },
            actionableTips: ['Vary complex clause structures.']
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };

      const res = await evaluateSingleSpeakingTurn({
        questionId: 'turn_200',
        part: 1,
        topic: 'Reading',
        questionText: 'Do you enjoy reading books?',
        transcript: 'I read non-fiction history books every evening because they deepen my understanding of modern politics.',
        durationSec: 12,
        wordsPerMinute: 120
      });

      assert.equal(capturedAuthHeader, 'Bearer test-token-3b1');
      assert.equal(res.isValidAttempt, true);
      assert.equal(res.assessmentStatus, 'partial_transcript_only');
      assert.equal(res.pronunciationObservable, false);
      assert.equal(res.overallBand, null);
      assert.equal(res.partialThreeCriterionIndex, 7.0);
      assert.equal(res.criteria?.pr, null);
      assert.equal(res.pronunciation.clarityBand, null);
    });

    await test('evaluateSingleSpeakingTurn handles HTTP 401 with authRequired: true and all null scores', async () => {
      (globalThis as any).fetch = async () =>
        new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });

      const res = await evaluateSingleSpeakingTurn({
        questionId: 'turn_401',
        part: 1,
        topic: 'Work',
        questionText: 'What do you do for work?',
        transcript: 'I work as a civil engineer designing municipal water distribution pipelines across regional towns.',
        durationSec: 11,
        wordsPerMinute: 115
      });

      assert.equal(res.isValidAttempt, false);
      assert.equal(res.assessmentStatus, 'unavailable');
      assert.equal(res.authRequired, true);
      assert.equal(res.overallBand, null);
      assert.equal(res.partialThreeCriterionIndex, null);
      assert.deepEqual(res.criteria, { fc: null, lr: null, gra: null, pr: null });
    });

    await test('evaluateSingleSpeakingTurn handles HTTP 503 with canRetry: true and all null scores (never fabricates fallback)', async () => {
      (globalThis as any).fetch = async () =>
        new Response(JSON.stringify({ error: 'AI examiner temporarily unavailable' }), { status: 503 });

      const res = await evaluateSingleSpeakingTurn({
        questionId: 'turn_503',
        part: 2,
        topic: 'Travel',
        questionText: 'Describe a memorable journey.',
        transcript: 'Last autumn I travelled by overnight train through the Scottish Highlands with my younger sister.',
        durationSec: 14,
        wordsPerMinute: 110
      });

      assert.equal(res.isValidAttempt, false);
      assert.equal(res.assessmentStatus, 'unavailable');
      assert.equal(res.canRetry, true);
      assert.equal(res.overallBand, null);
      assert.equal(res.partialThreeCriterionIndex, null);
      assert.deepEqual(res.criteria, { fc: null, lr: null, gra: null, pr: null });
    });

    await test('GrammarFeedbackEngine.analyzeSpeaking attaches Bearer token, preserves partial transcript-only null overallBand, and fails closed with null on 503', async () => {
      let seenAuth: string | null = null;
      (globalThis as any).fetch = async (_url: string, init?: RequestInit) => {
        const headers = init?.headers as Record<string, string> | undefined;
        seenAuth = headers?.Authorization || headers?.authorization || null;
        return new Response(
          JSON.stringify({
            isValidAttempt: true,
            assessmentStatus: 'partial_transcript_only',
            evidenceMode: 'transcript_only',
            pronunciationObservable: false,
            isPartialAssessment: true,
            unassessedCriteria: ['pronunciation'],
            overallBand: null,
            partialThreeCriterionIndex: 6.5,
            criteria: { fc: 6.5, lr: 6.5, gra: 6.5, pr: null },
            estimatedBands: { fluency: 6.5, lexical: 6.5, grammar: 6.5, pronunciation: null, overall: null },
            grammaticalErrors: [],
            pronunciation: { clarityBand: null, trickyWords: [], connectedSpeechTips: [], intonationPattern: '', rhythmVerdict: '' },
            band8Answer: { bandScore: 8.5, modelAnswer: 'Model answer.', highlightedCollocations: [], keyDiscourseMarkers: [], examinerRationale: '' },
            actionableTips: []
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };

      const okRes = await grammarFeedbackEngine.analyzeSpeaking({
        transcript:
          'I regularly visit our neighbourhood library because the quiet study rooms help me concentrate on exam preparation.',
        question: 'Where do you study?'
      });
      assert.equal(seenAuth, 'Bearer test-token-3b1');
      assert.equal(okRes.assessmentStatus, 'partial_transcript_only');
      assert.equal(okRes.overallBand, null);
      assert.equal(okRes.partialThreeCriterionIndex, 6.5);
      assert.equal(okRes.estimatedBands.pronunciation, null);
      const prJust = okRes.bandJustifications.find((j) => j.criterion === 'pronunciation');
      assert.equal(prJust?.estimatedBand, null);

      (globalThis as any).fetch = async () => new Response(JSON.stringify({ error: 'Unavailable' }), { status: 503 });
      const failRes = await grammarFeedbackEngine.analyzeSpeaking({
        transcript:
          'I regularly visit our neighbourhood library because the quiet study rooms help me concentrate on exam preparation.',
        question: 'Where do you study?'
      });
      assert.equal(failRes.isValidAttempt, false);
      assert.equal(failRes.assessmentStatus, 'unavailable');
      assert.equal(failRes.overallBand, null);
      assert.equal(failRes.estimatedBands.fluency, null);
      assert.equal(failRes.estimatedBands.pronunciation, null);
      assert.equal(failRes.estimatedBands.overall, null);
    });

    await test('GrammarFeedbackEngine.analyzeWriting returns null scores (never 0) when API returns 503', async () => {
      (globalThis as any).fetch = async () => new Response(JSON.stringify({ error: 'Unavailable' }), { status: 503 });
      const failRes = await grammarFeedbackEngine.analyzeWriting({
        essayText:
          'Governments face ongoing debate over whether municipal infrastructure funding should prioritize public rail networks or highway expansion. While road upgrades support regional freight movement, high-capacity public transit reduces congestion and carbon emissions sustainably across dense metropolitan corridors.',
        testType: 'task2',
        prompt: 'Public transport vs roads'
      });
      assert.equal(failRes.isValidAttempt, false);
      assert.equal(failRes.assessmentStatus, 'unavailable');
      assert.equal(failRes.estimatedBands.overall, null);
      assert.equal(failRes.estimatedBands.taskAchievement, null);
      assert.equal(failRes.estimatedBands.coherenceCohesion, null);
      assert.equal(failRes.estimatedBands.lexicalResource, null);
      assert.equal(failRes.estimatedBands.grammaticalRange, null);
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocalStorage === undefined) {
      delete (globalThis as any).localStorage;
    } else {
      (globalThis as any).localStorage = originalLocalStorage;
    }
  }

  // -------------------------------------------------------------------------
  // 4. UI NULL-SAFETY SSR RENDERING & ANTI-FABRICATION AUDIT
  // -------------------------------------------------------------------------
  console.log('\n4. UI Null-Safety (SSR Render) & Anti-Fabrication Source Checks');

  await test('InstantSpeakingFeedbackModal renders partial_transcript_only (null overall/pr/clarityBand) without crashing', () => {
    const partialFeedback: InstantSpeakingFeedback = {
      questionId: 'ui_partial_1',
      questionText: 'Describe your hometown.',
      part: 1,
      topic: 'Hometown',
      candidateTranscript: 'I grew up in a coastal town famous for its fishing harbour and lively morning markets.',
      isValidAttempt: true,
      assessmentStatus: 'partial_transcript_only',
      evidenceMode: 'transcript_only',
      pronunciationObservable: false,
      isPartialAssessment: true,
      unassessedCriteria: ['pronunciation'],
      wordCount: 16,
      durationSec: 10,
      wordsPerMinute: 96,
      overallBand: null,
      partialThreeCriterionIndex: 6.5,
      estimatedBand: null,
      criteria: { fc: 6.5, lr: 6.5, gra: 6.5, pr: null },
      estimatedBands: { fluency: 6.5, lexical: 6.5, grammar: 6.5, pronunciation: null, overall: null },
      grammaticalErrors: [],
      pronunciation: {
        clarityBand: null,
        cadenceWpm: 96,
        trickyWords: [],
        connectedSpeechTips: [],
        intonationPattern: 'Unassessed',
        rhythmVerdict: 'Pronunciation unassessed in transcript-only mode.'
      },
      band8Answer: {
        bandScore: 8.5,
        modelAnswer: 'I come from a vibrant coastal town renowned for its bustling harbour.',
        highlightedCollocations: [],
        keyDiscourseMarkers: [],
        examinerRationale: 'Natural lexical range.'
      },
      actionableTips: ['Extend answers with a specific personal example.']
    };

    const html = renderToStaticMarkup(
      React.createElement(InstantSpeakingFeedbackModal, {
        isOpen: true,
        feedback: partialFeedback,
        onClose: () => {},
        onContinue: () => {},
        onRetake: () => {}
      })
    );
    assert.ok(html.includes('Partial Index (3/4)'), 'Expected Partial Index (3/4) label');
    assert.ok(html.includes('6.5'), 'Expected partialThreeCriterionIndex 6.5');
    assert.ok(html.includes('Unassessed'), 'Expected Unassessed label for null Pronunciation');
  });

  await test('InstantSpeakingFeedbackModal renders unavailable (all null scores) without crashing', () => {
    const unavailableFeedback = generateDiagnosticTurnFeedback(
      'ui_unavail_1',
      'What hobbies do you enjoy?',
      1,
      'Hobbies',
      'I enjoy playing chess and cycling along the riverfront on weekends.',
      10,
      100
    );
    unavailableFeedback.authRequired = true;

    const html = renderToStaticMarkup(
      React.createElement(InstantSpeakingFeedbackModal, {
        isOpen: true,
        feedback: unavailableFeedback,
        onClose: () => {},
        onContinue: () => {},
        onRetake: () => {}
      })
    );
    assert.ok(html.includes('No Score Generated'), 'Expected No Score Generated status display');
    assert.ok(html.includes('Authentication Required'), 'Expected Authentication Required header when authRequired is true');
  });

  await test('BritishCouncilSpeakingResult renders transcript-only report (null overallBand & pronunciationBand) without crashing or official claim', () => {
    const report: SpeakingEvaluationReport = evaluateSpeakingSession([
      {
        questionId: 'bc_q1',
        part: 1,
        topic: 'Studies',
        questionText: 'What are you studying?',
        transcript:
          'I am currently studying environmental engineering with a focus on sustainable urban drainage systems and clean water filtration.',
        startTime: Date.now() - 12000,
        endTime: Date.now(),
        durationSec: 12,
        wordCount: 18,
        wordsPerMinute: 90,
        pauseCount: 0,
        longPauseCount: 0,
        fillerCount: 0,
        detectedFillers: []
      }
    ]);

    assert.equal(report.overallBand, null);
    assert.equal(report.pronunciationBand, null);

    const html = renderToStaticMarkup(
      React.createElement(BritishCouncilSpeakingResult, {
        evaluationReport: report,
        analytics: {
          totalSpeakingTimeSec: 12,
          totalWordsSpoken: 18,
          averageWpm: 90,
          totalPauses: 0,
          totalLongPauses: 0,
          totalFillers: 0,
          mostFrequentFillers: [],
          uniqueVocabularyCount: 16,
          lexicalDiversityRatio: 0.88
        },
        candidateName: 'Test Candidate',
        onRetakeExam: () => {}
      })
    );
    assert.ok(html.includes('Unassessed'), 'Expected Unassessed for null pronunciation');
    assert.ok(html.includes('Partial') || html.includes('PARTIAL'), 'Expected explicit partial transcript labeling');
    assert.equal(html.includes('IELTS Official Speaking Assessment'), false, 'Must not claim official IELTS assessment');
  });

  await test('Server & client source integrity checks confirm dead fallbacks, client hasAudioEvidence trust, and fabricated pauses are eliminated', () => {
    const root = process.cwd();
    const serverSrc = fs.readFileSync(path.join(root, 'server.ts'), 'utf8');
    assert.equal(serverSrc.includes('function generateServerDiagnosticEvaluation'), false, 'Dead server diagnostic fallback must be removed');
    assert.equal(serverSrc.includes('function generateServerSpeakingTurnEvaluation'), false, 'Dead server turn fallback must be removed');
    assert.ok(serverSrc.includes('const hasVerifiedAudioEvidence = false;'), 'Server must enforce verified audio evidence rather than trusting client boolean');

    const grammarSrc = fs.readFileSync(path.join(root, 'src/services/GrammarFeedbackEngine.ts'), 'utf8');
    assert.equal(grammarSrc.includes('generateOfflineSpeakingFallback'), false, 'Dead offline speaking fallback must be removed');
    assert.equal(grammarSrc.includes('generateOfflineWritingFallback'), false, 'Dead offline writing fallback must be removed');

    const voiceExaminerSrc = fs.readFileSync(path.join(root, 'src/components/VoiceExaminer.tsx'), 'utf8');
    assert.equal(voiceExaminerSrc.includes('generateDiagnosticTurnFeedback'), false, 'VoiceExaminer must not fall back to generateDiagnosticTurnFeedback');
    assert.equal(/pauseCount:\s*Math\.floor\(/.test(voiceExaminerSrc), false, 'VoiceExaminer must not fabricate pauseCount from duration');

    const liveMockSrc = fs.readFileSync(path.join(root, 'src/components/LiveMockTest.tsx'), 'utf8');
    assert.equal(liveMockSrc.includes('generateDiagnosticTurnFeedback'), false, 'LiveMockTest must not fall back to generateDiagnosticTurnFeedback');
    assert.equal(/pauseCount:\s*Math\.floor\(/.test(liveMockSrc), false, 'LiveMockTest must not fabricate pauseCount from duration');

    const speakingEngineSrc = fs.readFileSync(path.join(root, 'src/services/SpeakingEngine.ts'), 'utf8');
    assert.equal(/pauseCount:\s*Math\.floor\(/.test(speakingEngineSrc), false, 'SpeakingEngine must not fabricate pauseCount from duration');

    const speakingLabSrc = fs.readFileSync(path.join(root, 'src/components/pages/SpeakingLabPage.tsx'), 'utf8');
    assert.equal(/pronunciation\s*\?\?\s*0/.test(speakingLabSrc), false, 'SpeakingLabPage must not coerce nullable pronunciation to 0');
    assert.equal(/Math\.max\(5\.0/.test(speakingLabSrc), false, 'SpeakingLabPage must not impose a 5.0 radar floor');
    assert.ok(speakingLabSrc.includes("p !== null ? 'Grammar & Pronunciation' : 'Grammar Accuracy'"), 'SpeakingLabPage must not halve Grammar with null Pronunciation');

    const liveAvatarSrc = fs.readFileSync(path.join(root, 'src/components/speaking/LiveAvatarSpeakingPartner.tsx'), 'utf8');
    assert.equal(liveAvatarSrc.includes('words >= 25 ? 6.5 : 5.5'), false, 'LiveAvatarSpeakingPartner must not fabricate 6.5/5.5 fallback bands');
  });

  console.log(`\n=== PHASE 3B.1 SUMMARY: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3B1Tests().catch((err) => {
  console.error('Phase 3B.1 test runner crashed:', err);
  process.exit(1);
});
