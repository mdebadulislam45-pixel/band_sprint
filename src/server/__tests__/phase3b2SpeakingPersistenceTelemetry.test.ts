/**
 * BAND SPRINT — PHASE 3B.2 FOCUSED VERIFICATION SUITE
 * Verifies:
 *  1. CDIELTS Speaking Bearer authentication header + 401/403/503/network/insufficient handling
 *  2. Phase 3B.1 nullable evidence contract mapping (partial_transcript_only vs evaluated)
 *  3. Removal of fallback scoring and hardcoded 7.0 TRF fabrication in CDIELTSSpeakingSuite
 *  4. firebaseSyncService null-safe persistence validation & hydration without 6.0 / 0.0 fabrication
 *  5. SpeakingStorageService local persistence & hydration (preserving valid complete + partial sessions)
 *  6. userStorage.recordExamAttempt band sanitization
 *  7. Acoustic telemetry integrity (null = unmeasured vs 0 = measured zero, no fake 68/76/24 defaults)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  CDIELTSSpeakingSuite,
  buildCDIELTSAuthHeaders,
  buildCDIELTSInsufficientEvaluation,
  buildCDIELTSUnavailableEvaluation,
  mapSpeakingTurnApiResponseToCDIELTS,
  shouldPersistCDIELTSSpeakingToFirestore
} from '../../components/cdielts/CDIELTSSpeakingSuite';
import {
  firebaseSyncService,
  isValidPersistedIeltsBand,
  validateSubmissionForPersistence,
  hydrateSubmissionDocToExamHistory
} from '../../services/firebaseSyncService';
import {
  SpeakingStorageService,
  sanitizeSpeakingSessionRecord
} from '../../services/SpeakingStorageService';
import { SpeechRecognitionService } from '../../services/SpeechRecognitionService';
import {
  computeSpeakingAnalytics,
  evaluateSpeakingSession
} from '../../services/SpeakingEvaluationService';
import {
  ACTIVE_USER_KEY,
  recordExamAttempt,
  getActiveUser,
  saveUser,
  createDefaultProgress
} from '../../utils/userStorage';
import {
  SpeakingAnswerRecord,
  SpeakingSessionRecord
} from '../../types/speakingTypes';

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed += 1;
    console.log(`  [PASS] ${name}`);
  } catch (err: any) {
    failed += 1;
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err?.message || err}`);
  }
}

function makeSpeakingAnswer(overrides: Partial<SpeakingAnswerRecord> = {}): SpeakingAnswerRecord {
  return {
    questionId: 'q_test_1',
    part: 2,
    topic: 'Environment',
    questionText: 'Describe an environmental project you know about.',
    transcript:
      'In my hometown, a municipal reforestation project has gradually transformed abandoned industrial land into sustainable green corridors that mitigate urban heat and foster biodiversity.',
    startTime: Date.now() - 45_000,
    endTime: Date.now(),
    durationSec: 45,
    wordCount: 25,
    wordsPerMinute: 120,
    pauseCount: null,
    longPauseCount: null,
    fillerCount: 0,
    detectedFillers: [],
    ...overrides
  };
}

async function main() {
  console.log('\n==============================================================');
  console.log('BAND SPRINT — PHASE 3B.2 VERIFICATION SUITE');
  console.log('==============================================================\n');

  // ------------------------------------------------------------------
  // 1. CDIELTS SPEAKING AUTHENTICATION & CONTRACT MAPPING
  // ------------------------------------------------------------------
  await runTest('1. buildCDIELTSAuthHeaders attaches Authorization: Bearer token when present and omits when absent', () => {
    const withToken = buildCDIELTSAuthHeaders('jwt_session_abc123');
    assert.equal(withToken['Content-Type'], 'application/json');
    assert.equal(withToken['Authorization'], 'Bearer jwt_session_abc123');

    const withoutToken = buildCDIELTSAuthHeaders(null);
    assert.equal(withoutToken['Content-Type'], 'application/json');
    assert.equal('Authorization' in withoutToken, false);

    const blankToken = buildCDIELTSAuthHeaders('   ');
    assert.equal('Authorization' in blankToken, false);
  });

  await runTest('2. Transcript-only API response maps to overallBand: null + separate partialThreeCriterionIndex and blocks Firestore write', () => {
    const apiPayload = {
      isValidAttempt: true,
      assessmentStatus: 'partial_transcript_only',
      evidenceMode: 'transcript_only',
      pronunciationObservable: false,
      isPartialAssessment: true,
      unassessedCriteria: ['Pronunciation'],
      overallBand: null,
      partialThreeCriterionIndex: 6.5,
      criteria: { fc: 6.5, lr: 7.0, gra: 6.5, pr: null },
      estimatedBands: {
        fluency: 6.5,
        lexical: 7.0,
        grammar: 6.5,
        pronunciation: null,
        overall: null
      },
      feedbackEn: 'Clear structure with strong vocabulary; Pronunciation unassessed without audio.',
      disclaimer: 'Transcript-only evaluation: Pronunciation was not observed.',
      wordCount: 84
    };

    const mapped = mapSpeakingTurnApiResponseToCDIELTS(apiPayload, 84);
    assert.equal(mapped.assessmentStatus, 'partial_transcript_only');
    assert.equal(mapped.evidenceMode, 'transcript_only');
    assert.equal(mapped.pronunciationObservable, false);
    assert.equal(mapped.isPartialAssessment, true);
    assert.deepEqual(mapped.unassessedCriteria, ['Pronunciation']);
    assert.equal(mapped.overallBand, null);
    assert.equal(mapped.partialThreeCriterionIndex, 6.5);
    assert.equal(mapped.fluencyBand, 6.5);
    assert.equal(mapped.lexicalBand, 7.0);
    assert.equal(mapped.grammarBand, 6.5);
    assert.equal(mapped.pronunciationBand, null);
    assert.equal(shouldPersistCDIELTSSpeakingToFirestore(mapped), false);
  });

  await runTest('3. Complete audio_and_transcript API response maps to evaluated 4-criterion result and allows Firestore persistence', () => {
    const apiPayload = {
      isValidAttempt: true,
      assessmentStatus: 'evaluated',
      evidenceMode: 'audio_and_transcript',
      pronunciationObservable: true,
      isPartialAssessment: false,
      unassessedCriteria: [],
      overallBand: 7.0,
      partialThreeCriterionIndex: null,
      criteria: { fc: 7.0, lr: 7.5, gra: 7.0, pr: 6.5 },
      estimatedBands: {
        fluency: 7.0,
        lexical: 7.5,
        grammar: 7.0,
        pronunciation: 6.5,
        overall: 7.0
      },
      feedbackEn: 'Consistent fluency and natural intonation throughout Part 2.',
      wordCount: 152
    };

    const mapped = mapSpeakingTurnApiResponseToCDIELTS(apiPayload, 152);
    assert.equal(mapped.assessmentStatus, 'evaluated');
    assert.equal(mapped.evidenceMode, 'audio_and_transcript');
    assert.equal(mapped.pronunciationObservable, true);
    assert.equal(mapped.isPartialAssessment, false);
    assert.deepEqual(mapped.unassessedCriteria, []);
    assert.equal(mapped.overallBand, 7.0);
    assert.equal(mapped.partialThreeCriterionIndex, null);
    assert.equal(mapped.pronunciationBand, 6.5);
    assert.equal(shouldPersistCDIELTSSpeakingToFirestore(mapped), true);
  });

  await runTest('4. Unavailable (401 auth / 503 retryable / malformed) and insufficient (<5 words) results never fabricate bands or persist', () => {
    const authErr = buildCDIELTSUnavailableEvaluation({
      wordCount: 40,
      message: 'Sign in required.',
      authRequired: true,
      canRetry: false
    });
    assert.equal(authErr.assessmentStatus, 'unavailable');
    assert.equal(authErr.authRequired, true);
    assert.equal(authErr.canRetry, false);
    assert.equal(authErr.overallBand, null);
    assert.equal(authErr.partialThreeCriterionIndex, null);
    assert.equal(shouldPersistCDIELTSSpeakingToFirestore(authErr), false);

    const retryableErr = buildCDIELTSUnavailableEvaluation({
      wordCount: 40,
      message: 'Upstream AI unavailable.',
      authRequired: false,
      canRetry: true
    });
    assert.equal(retryableErr.assessmentStatus, 'unavailable');
    assert.equal(retryableErr.canRetry, true);
    assert.equal(retryableErr.overallBand, null);
    assert.equal(shouldPersistCDIELTSSpeakingToFirestore(retryableErr), false);

    const malformed = mapSpeakingTurnApiResponseToCDIELTS({ foo: 'bar' }, 42);
    assert.equal(malformed.assessmentStatus, 'unavailable');
    assert.equal(malformed.overallBand, null);
    assert.equal(malformed.canRetry, true);
    assert.equal(shouldPersistCDIELTSSpeakingToFirestore(malformed), false);

    const insufficient = buildCDIELTSInsufficientEvaluation(2);
    assert.equal(insufficient.assessmentStatus, 'insufficient_evidence');
    assert.equal(insufficient.overallBand, null);
    assert.equal(insufficient.fluencyBand, null);
    assert.equal(insufficient.pronunciationBand, null);
    assert.equal(shouldPersistCDIELTSSpeakingToFirestore(insufficient), false);
  });

  await runTest('5. CDIELTSSpeakingSuite source removes catch fallback scoring and hardcoded 7.0 TRF bands & SSR renders cleanly', () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/cdielts/CDIELTSSpeakingSuite.tsx'),
      'utf8'
    );
    assert.equal(source.includes('getStoredSessionToken'), true, 'Must import and use getStoredSessionToken');
    assert.equal(source.includes('Authorization'), true, 'Must attach Authorization header');
    assert.equal(source.includes('listeningBand: 7.0'), false, 'Must NOT hardcode listeningBand: 7.0');
    assert.equal(source.includes('readingBand: 7.0'), false, 'Must NOT hardcode readingBand: 7.0');
    assert.equal(source.includes('writingBand: 7.0'), false, 'Must NOT hardcode writingBand: 7.0');
    assert.equal(source.includes('data.overallBand || 6.5'), false, 'Must NOT default missing overallBand to 6.5');
    assert.equal(source.includes('words >= 140 ? 7.5'), false, 'Must NOT have catch-block word-count fallback scoring');

    const markup = renderToStaticMarkup(
      React.createElement(CDIELTSSpeakingSuite, {
        onExit: () => {},
        onShowToast: () => {},
        candidateName: 'Audit Candidate'
      })
    );
    assert.equal(markup.includes('CD-IELTS SPEAKING'), true);
  });

  // ------------------------------------------------------------------
  // 2. FIREBASE SYNC SERVICE — PERSISTENCE & HYDRATION INTEGRITY
  // ------------------------------------------------------------------
  await runTest('6. validateSubmissionForPersistence blocks null, NaN, out-of-range, non-half-band, partial, and unavailable scores', async () => {
    assert.equal(isValidPersistedIeltsBand('speaking', null), false);
    assert.equal(isValidPersistedIeltsBand('speaking', undefined), false);
    assert.equal(isValidPersistedIeltsBand('speaking', Number.NaN), false);
    assert.equal(isValidPersistedIeltsBand('speaking', Number.POSITIVE_INFINITY), false);
    assert.equal(isValidPersistedIeltsBand('speaking', 0), false);
    assert.equal(isValidPersistedIeltsBand('speaking', -1), false);
    assert.equal(isValidPersistedIeltsBand('speaking', 9.5), false);
    assert.equal(isValidPersistedIeltsBand('speaking', 6.3), false);
    assert.equal(isValidPersistedIeltsBand('speaking', 7.0), true);
    assert.equal(isValidPersistedIeltsBand('listening', 0, 0), false);
    assert.equal(isValidPersistedIeltsBand('listening', 0, 40), true);

    assert.equal(
      validateSubmissionForPersistence({
        module: 'speaking',
        bandScore: null,
        metadata: { assessmentStatus: 'partial_transcript_only', pronunciationObservable: false }
      }).valid,
      false
    );
    assert.equal(
      validateSubmissionForPersistence({
        module: 'speaking',
        bandScore: 6.5,
        metadata: { assessmentStatus: 'partial_transcript_only', pronunciationObservable: false }
      }).valid,
      false
    );
    assert.equal(
      validateSubmissionForPersistence({
        module: 'speaking',
        bandScore: 6.5,
        metadata: { assessmentStatus: 'unavailable' }
      }).valid,
      false
    );
    assert.equal(
      validateSubmissionForPersistence({
        module: 'speaking',
        bandScore: 6.5,
        metadata: { isPartialAssessment: true }
      }).valid,
      false
    );
    assert.equal(
      validateSubmissionForPersistence({
        module: 'speaking',
        bandScore: 7.0,
        metadata: { assessmentStatus: 'evaluated', isPartialAssessment: false, pronunciationObservable: true }
      }).valid,
      true
    );

    // Direct method guard: recordTestSubmission returns false without throwing on invalid/null/partial payloads
    assert.equal(
      await firebaseSyncService.recordTestSubmission('speaking', 'test-1', null, 1, 1, 60, {
        assessmentStatus: 'partial_transcript_only',
        pronunciationObservable: false
      }),
      false
    );
    assert.equal(
      await firebaseSyncService.recordTestSubmission('speaking', 'test-2', Number.NaN, 1, 1, 60),
      false
    );
    assert.equal(
      await firebaseSyncService.recordTestSubmission('speaking', 'test-3', 0, 1, 1, 60),
      false
    );
  });

  await runTest('7. hydrateSubmissionDocToExamHistory preserves valid history and skips corrupted/missing docs without fabricating 6.0 or 0.0', () => {
    // Corrupted/invalid docs MUST return null (never default to 6.0 or 0.0)
    assert.equal(hydrateSubmissionDocToExamHistory('doc_missing_score', { module: 'speaking' }), null);
    assert.equal(hydrateSubmissionDocToExamHistory('doc_null_score', { module: 'speaking', bandScore: null }), null);
    assert.equal(hydrateSubmissionDocToExamHistory('doc_nan_score', { module: 'writing', bandScore: Number.NaN }), null);
    assert.equal(hydrateSubmissionDocToExamHistory('doc_string_score', { module: 'reading', bandScore: '7.0' }), null);
    assert.equal(hydrateSubmissionDocToExamHistory('doc_oob_score', { module: 'full_mock', bandScore: 10.5 }), null);
    assert.equal(hydrateSubmissionDocToExamHistory('doc_zero_speaking', { module: 'speaking', bandScore: 0 }), null);
    assert.equal(hydrateSubmissionDocToExamHistory('doc_bad_module', { module: 'shadowing', bandScore: 7.0 }), null);
    assert.equal(
      hydrateSubmissionDocToExamHistory('doc_partial_speaking', {
        module: 'speaking',
        bandScore: 6.5,
        assessmentStatus: 'partial_transcript_only',
        pronunciationObservable: false
      }),
      null
    );

    // Valid single-skill Speaking doc preserves speakingBand and keeps overallBand: null
    const validSpeaking = hydrateSubmissionDocToExamHistory('doc_valid_speaking', {
      module: 'speaking',
      bandScore: 7.5,
      correctCount: 1,
      totalQuestions: 1,
      createdAt: '2026-10-01T10:00:00.000Z'
    });
    assert.ok(validSpeaking);
    assert.equal(validSpeaking.examType, 'speaking_only');
    assert.equal(validSpeaking.speakingBand, 7.5);
    assert.equal(validSpeaking.overallBand, null);

    // Valid Listening 0/40 (genuine Band 0.0) is preserved
    const validListeningZero = hydrateSubmissionDocToExamHistory('doc_valid_listening_0', {
      module: 'listening',
      bandScore: 0,
      correctCount: 0,
      totalQuestions: 40,
      createdAt: '2026-10-01T10:00:00.000Z'
    });
    assert.ok(validListeningZero);
    assert.equal(validListeningZero.listeningBand, 0);
    assert.equal(validListeningZero.overallBand, null);

    // Valid Full Mock preserves overallBand
    const validFullMock = hydrateSubmissionDocToExamHistory('doc_valid_full', {
      module: 'full_mock',
      bandScore: 7.0,
      createdAt: '2026-10-01T10:00:00.000Z'
    });
    assert.ok(validFullMock);
    assert.equal(validFullMock.examType, 'full_mock');
    assert.equal(validFullMock.overallBand, 7.0);
  });

  // ------------------------------------------------------------------
  // 3. SPEAKING STORAGE SERVICE — LOCAL PERSISTENCE & HYDRATION
  // ------------------------------------------------------------------
  await runTest('8. SpeakingStorageService preserves valid complete & partial transcript-only sessions while rejecting unavailable/corrupted records', () => {
    const store = new Map<string, string>();
    const prevWindow = (globalThis as any).window;
    const prevLocalStorage = (globalThis as any).localStorage;
    try {
      (globalThis as any).window = {
        dispatchEvent: () => true
      };
      (globalThis as any).localStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k)
      };

      const storage = new SpeakingStorageService();
      const baseAnswer = makeSpeakingAnswer();
      const analytics = computeSpeakingAnalytics([baseAnswer]);

      const partialEval = evaluateSpeakingSession([baseAnswer], analytics);
      assert.equal(partialEval.assessmentStatus, 'partial_transcript_only');
      assert.equal(partialEval.overallBand, null);
      assert.equal(typeof partialEval.partialThreeCriterionIndex, 'number');

      const partialSession: SpeakingSessionRecord = {
        testId: 'spk_partial_1',
        userId: 'user_1',
        date: Date.now(),
        mode: 'exam',
        totalDurationSec: 45,
        overallBand: null,
        partialThreeCriterionIndex: partialEval.partialThreeCriterionIndex,
        fluencyBand: partialEval.fluencyBand,
        lexicalBand: partialEval.lexicalBand,
        grammarBand: partialEval.grammarBand,
        pronunciationBand: null,
        topicsCovered: ['Environment'],
        answers: [baseAnswer],
        analytics,
        evaluation: partialEval
      };

      assert.equal(storage.saveCompletedSession(partialSession), true);

      // Unavailable session MUST be rejected without disturbing saved history
      const unavailableSession: SpeakingSessionRecord = {
        ...partialSession,
        testId: 'spk_unavail_1',
        evaluation: {
          ...partialEval,
          isValidAttempt: false,
          assessmentStatus: 'unavailable'
        }
      };
      assert.equal(storage.saveCompletedSession(unavailableSession), false);

      // Inject a corrupted record directly into localStorage alongside valid session
      const existingRaw = JSON.parse(store.get('ielts_speaking_session_history_v1') || '[]');
      existingRaw.push({
        testId: 'spk_corrupt_nan',
        userId: 'user_1',
        overallBand: 11.5,
        fluencyBand: 'bad',
        evaluation: { assessmentStatus: 'evaluated' }
      });
      store.set('ielts_speaking_session_history_v1', JSON.stringify(existingRaw));

      const hydrated = storage.getAllSessions('user_1');
      assert.equal(hydrated.length, 1);
      assert.equal(hydrated[0].testId, 'spk_partial_1');
      assert.equal(hydrated[0].overallBand, null);
      assert.equal(hydrated[0].pronunciationBand, null);
      assert.equal(hydrated[0].partialThreeCriterionIndex, partialEval.partialThreeCriterionIndex);
      assert.equal(hydrated[0].evaluation.assessmentStatus, 'partial_transcript_only');

      // sanitizeSpeakingSessionRecord preserves valid 4-criterion complete record
      const completeSanitized = sanitizeSpeakingSessionRecord({
        ...partialSession,
        testId: 'spk_complete_1',
        overallBand: 7.0,
        partialThreeCriterionIndex: null,
        fluencyBand: 7.0,
        lexicalBand: 7.0,
        grammarBand: 7.0,
        pronunciationBand: 7.0,
        evaluation: {
          ...partialEval,
          assessmentStatus: 'evaluated',
          evidenceMode: 'audio_and_transcript',
          pronunciationObservable: true,
          isPartialAssessment: false,
          unassessedCriteria: [],
          overallBand: 7.0,
          partialThreeCriterionIndex: null,
          pronunciationBand: 7.0
        }
      });
      assert.ok(completeSanitized);
      assert.equal(completeSanitized.overallBand, 7.0);
      assert.equal(completeSanitized.pronunciationBand, 7.0);
      assert.equal(completeSanitized.partialThreeCriterionIndex, null);
    } finally {
      (globalThis as any).window = prevWindow;
      (globalThis as any).localStorage = prevLocalStorage;
    }
  });

  // ------------------------------------------------------------------
  // 4. ACOUSTIC TELEMETRY INTEGRITY (0 = MEASURED ZERO vs NULL = UNMEASURED)
  // ------------------------------------------------------------------
  await runTest('9. computeSpeakingAnalytics distinguishes unmeasured pauseCount: null from genuinely measured pauseCount: 0', () => {
    const unmeasuredTurn = makeSpeakingAnswer({
      pauseCount: null,
      longPauseCount: null,
      fillerCount: 2,
      detectedFillers: ['um', 'like']
    });
    const unmeasuredAnalytics = computeSpeakingAnalytics([unmeasuredTurn]);
    assert.equal(unmeasuredAnalytics.totalPauses, null);
    assert.equal(unmeasuredAnalytics.totalLongPauses, null);
    assert.equal(unmeasuredAnalytics.pauseTelemetryAvailable, false);
    assert.equal(unmeasuredAnalytics.totalFillers, 2);

    const measuredZeroTurn = makeSpeakingAnswer({
      pauseCount: 0,
      longPauseCount: 0,
      fillerCount: 0,
      detectedFillers: []
    });
    const measuredZeroAnalytics = computeSpeakingAnalytics([measuredZeroTurn]);
    assert.equal(measuredZeroAnalytics.totalPauses, 0);
    assert.equal(measuredZeroAnalytics.totalLongPauses, 0);
    assert.equal(measuredZeroAnalytics.pauseTelemetryAvailable, true);
    assert.equal(measuredZeroAnalytics.totalFillers, 0);

    // Unmeasured acousticMetrics (isMeasured: false) must NOT trigger Pronunciation scoring
    const unmeasuredAcousticTurn = makeSpeakingAnswer({
      acousticMetrics: {
        volumeRms: 0,
        pitchHz: 0,
        pitchVarianceHz: null,
        expressivenessScore: null,
        energyDropOffs: 0,
        isMeasured: false
      }
    });
    const report = evaluateSpeakingSession([unmeasuredAcousticTurn]);
    assert.equal(report.assessmentStatus, 'partial_transcript_only');
    assert.equal(report.overallBand, null);
    assert.equal(report.pronunciationBand, null);
  });

  await runTest('10. SpeechRecognitionService returns undefined before real Web Audio samples exist (no fake expressivenessScore: 68)', () => {
    const stt = new SpeechRecognitionService();
    assert.equal(stt.getLastAcousticTelemetry(), undefined);
  });

  await runTest('11. SpeakingEngine source emits null pause telemetry and real transcript filler analysis', () => {
    const engineSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/services/SpeakingEngine.ts'),
      'utf8'
    );
    assert.equal(engineSrc.includes('pauseCount: null'), true);
    assert.equal(engineSrc.includes('longPauseCount: null'), true);
    assert.equal(engineSrc.includes('pauseCount: 0'), false);
    assert.equal(engineSrc.includes('longPauseCount: 0'), false);
    assert.equal(engineSrc.includes('analyzeSingleTranscriptMetrics'), true);
  });

  await runTest('12. userStorage.recordExamAttempt sanitizes NaN/out-of-range scores to null while preserving valid bands', async () => {
    const store = new Map<string, string>();
    const prevWindow = (globalThis as any).window;
    const prevLocalStorage = (globalThis as any).localStorage;
    try {
      (globalThis as any).window = { dispatchEvent: () => true };
      (globalThis as any).localStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k)
      };

      const seedUser = {
        id: 'phase3b2_user',
        name: 'Phase 3B.2 User',
        email: 'audit@bandsprint.test',
        targetBand: 7.5,
        examDate: '2026-12-01',
        createdAt: Date.now(),
        progress: createDefaultProgress()
      };
      store.set(ACTIVE_USER_KEY, seedUser.id);
      saveUser(seedUser as any);

      recordExamAttempt({
        id: 'attempt_corrupt',
        examType: 'speaking_only',
        overallBand: Number.NaN,
        speakingBand: 12.5,
        writingBand: 0,
        listeningBand: 7.0,
        wordCount: 50,
        submissionType: 'manual'
      });

      const updated = getActiveUser();
      assert.ok(updated);
      const saved = updated.progress.examHistory.find((h) => h.id === 'attempt_corrupt');
      assert.ok(saved);
      assert.equal(saved.overallBand, null);
      assert.equal(saved.speakingBand, null);
      assert.equal(saved.writingBand, null);
      assert.equal(saved.listeningBand, 7.0);
      assert.equal(updated.progress.completedModules.includes('speaking'), false);
      assert.equal(updated.progress.completedModules.includes('listening'), true);
      // Allow saveUser()'s 0ms CustomEvent dispatch timer to flush before restoring global window
      await new Promise((resolve) => setTimeout(resolve, 15));
    } finally {
      (globalThis as any).window = prevWindow;
      (globalThis as any).localStorage = prevLocalStorage;
    }
  });

  console.log('\n--------------------------------------------------------------');
  console.log(`PHASE 3B.2 SUITE SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('--------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});
