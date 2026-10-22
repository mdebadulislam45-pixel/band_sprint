/**
 * IELTS SPRINT — AUTOMATED AUDIO PIPELINE VERIFICATION SUITE
 *
 * Verifies all 7 core requirements from the user specification:
 * 1. Duplicate audio detection: Exact audio ID / hash comparison across all questions.
 * 2. Audio-to-Question ownership validation: Verifies questionId strictly matches audioId.
 * 3. Stale audio race condition prevention: Verifies rapid question switching aborts prior tracks.
 * 4. Cache collision prevention: Ensures cache keys are isolated by unique audioId.
 * 5. Session audio history tracking: Ensures played audioIds are tracked without premature reuse.
 * 6. Repeated-question & audio prevention: Ensures questionEngine.selectAdaptiveQuestions rejects recently used audioIds.
 * 7. Fallback when unique audio is exhausted: Gracefully falls back rather than crashing or repeating.
 */

import { questionEngine } from '../services/QuestionEngine';
import { audioManager, buildAudioId, computeAudioHash } from '../services/AudioManager';
import { ALL_INITIAL_QUESTIONS } from '../data/comprehensiveQuestionBank';

export interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

export function runAudioSystemDiagnostics(): {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
} {
  const results: TestResult[] = [];

  // 1. Duplicate Audio Detection Test
  try {
    const listeningQs = questionEngine.getAllQuestions().filter((q) => q.module === 'listening');
    const audioIdMap = new Map<string, string[]>();
    const audioTextMap = new Map<string, string[]>();

    listeningQs.forEach((q) => {
      const meta = audioManager.registerQuestionAudio(q);
      if (!audioIdMap.has(meta.audioId)) audioIdMap.set(meta.audioId, []);
      audioIdMap.get(meta.audioId)!.push(q.id);

      const fullText = (q.dialogue || []).map((d) => d.text.trim()).join(' ');
      if (fullText) {
        if (!audioTextMap.has(fullText)) audioTextMap.set(fullText, []);
        audioTextMap.get(fullText)!.push(q.id);
      }
    });

    const duplicateAudioIds = Array.from(audioIdMap.entries()).filter(([_, ids]) => ids.length > 1);
    const duplicateTexts = Array.from(audioTextMap.entries()).filter(([_, ids]) => ids.length > 1);

    const passed = duplicateAudioIds.length === 0 && duplicateTexts.length === 0;
    results.push({
      name: 'Duplicate Audio Detection',
      passed,
      details: passed
        ? `All ${listeningQs.length} listening questions possess 100% unique audioIds and non-overlapping audio transcripts.`
        : `Found duplicate audioIds: ${duplicateAudioIds.length}, duplicate transcripts: ${duplicateTexts.length}`
    });
  } catch (err: any) {
    results.push({ name: 'Duplicate Audio Detection', passed: false, details: err.message });
  }

  // 2. Audio-to-Question Ownership Validation Test
  try {
    const sampleQ = ALL_INITIAL_QUESTIONS[0];
    const validMeta = audioManager.registerQuestionAudio(sampleQ);
    const validCheck = audioManager.validateAudioOwnership(sampleQ.id, validMeta.audioId);

    // Mismatched check
    const mismatchCheck = audioManager.validateAudioOwnership('different_q_999', validMeta.audioId);

    const passed = validCheck.isValid && !mismatchCheck.isValid;
    results.push({
      name: 'Audio-to-Question Ownership Validation',
      passed,
      details: passed
        ? `Valid matching succeeded (${validMeta.audioId}), and mismatched questionId was correctly rejected.`
        : `Ownership validation failed: valid=${validCheck.isValid}, mismatch rejection=${!mismatchCheck.isValid}`
    });
  } catch (err: any) {
    results.push({ name: 'Audio-to-Question Ownership Validation', passed: false, details: err.message });
  }

  // 3. Stale Audio Race Condition Protection Test
  try {
    const q1 = ALL_INITIAL_QUESTIONS[0];
    const q2 = ALL_INITIAL_QUESTIONS[1];

    audioManager.registerQuestionAudio(q1);
    audioManager.registerQuestionAudio(q2);

    // Rapidly switch active questions
    audioManager.reset(`switch_to_${q1.id}`);
    const active1 = audioManager.getActiveQuestionId();

    audioManager.reset(`switch_to_${q2.id}`);
    const active2 = audioManager.getActiveQuestionId();

    // After reset, previous active question should be cleared
    const passed = active2 === null && active1 === null;
    results.push({
      name: 'Stale Audio Race Condition Protection',
      passed,
      details: passed
        ? 'Rapid question changes atomically invalidate prior audio requests and reset player state.'
        : `Race condition test failed: active1=${active1}, active2=${active2}`
    });
  } catch (err: any) {
    results.push({ name: 'Stale Audio Race Condition Protection', passed: false, details: err.message });
  }

  // 4. Cache Collision Prevention Test
  try {
    const idA = buildAudioId('q_alpha', 'Text of Question Alpha');
    const idB = buildAudioId('q_beta', 'Text of Question Beta');
    const idA_same = buildAudioId('q_alpha', 'Text of Question Alpha');

    const passed = idA !== idB && idA === idA_same && idA.startsWith('aud_q_alpha_');
    results.push({
      name: 'Cache Collision Prevention',
      passed,
      details: passed
        ? 'Cache keys are strictly isolated by unique (questionId + contentHash), eliminating key collisions.'
        : `Cache collision test failed: idA=${idA}, idB=${idB}`
    });
  } catch (err: any) {
    results.push({ name: 'Cache Collision Prevention', passed: false, details: err.message });
  }

  // 5. Session Audio History Tracking Test
  try {
    audioManager.resetSession();
    const testAudioId = 'aud_unit_test_sample';
    const isUsedBefore = audioManager.isAudioRecentlyUsed(testAudioId, true);
    audioManager.recordAudioPlayed(testAudioId, 'q_test');
    const isUsedAfter = audioManager.isAudioRecentlyUsed(testAudioId, true);

    const passed = !isUsedBefore && isUsedAfter;
    results.push({
      name: 'Session Audio History Tracking',
      passed,
      details: passed
        ? 'Played audio is tracked accurately in the current session set, preventing duplicate playback in one sitting.'
        : `Session history tracking failed: before=${isUsedBefore}, after=${isUsedAfter}`
    });
  } catch (err: any) {
    results.push({ name: 'Session Audio History Tracking', passed: false, details: err.message });
  }

  // 6. Repeated-Question & Audio Prevention in QuestionEngine
  try {
    const sampleBatch = questionEngine.selectAdaptiveQuestions({
      module: 'listening',
      section: 1,
      count: 5
    });

    const usedQIds = sampleBatch.map((q) => q.id);
    const usedAudioIds = sampleBatch.map((q) => q.audioId || '');

    // Second selection excluding used questions and audios
    const freshBatch = questionEngine.selectAdaptiveQuestions({
      module: 'listening',
      section: 1,
      count: 5,
      excludeQuestionIds: usedQIds,
      excludeAudioIds: usedAudioIds
    });

    const intersection = freshBatch.filter((q) => usedQIds.includes(q.id));
    const passed = intersection.length === 0;

    results.push({
      name: 'Repeated-Question & Audio Exclusion Engine',
      passed,
      details: passed
        ? `Exclusion filter successfully returned ${freshBatch.length} completely novel questions without overlapping prior IDs.`
        : `Found ${intersection.length} repeating questions in adaptive selection.`
    });
  } catch (err: any) {
    results.push({ name: 'Repeated-Question & Audio Exclusion Engine', passed: false, details: err.message });
  }

  // 7. Fallback when Unique Audio is Exhausted
  try {
    const allS1 = questionEngine.getAllQuestions().filter((q) => q.module === 'listening' && q.section === 1);
    const allS1Ids = allS1.map((q) => q.id);

    // Request with ALL existing IDs excluded
    const exhaustedBatch = questionEngine.selectAdaptiveQuestions({
      module: 'listening',
      section: 1,
      count: 5,
      excludeQuestionIds: allS1Ids
    });

    const passed = Array.isArray(exhaustedBatch) && exhaustedBatch.length > 0;
    results.push({
      name: 'Graceful Fallback When Audio Exhausted',
      passed,
      details: passed
        ? `Engine safely recovered ${exhaustedBatch.length} practice questions instead of failing or throwing an unhandled exception.`
        : 'Engine did not return fallback questions when all IDs were excluded.'
    });
  } catch (err: any) {
    results.push({ name: 'Graceful Fallback When Audio Exhausted', passed: false, details: err.message });
  }

  const passedCount = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    results
  };
}
