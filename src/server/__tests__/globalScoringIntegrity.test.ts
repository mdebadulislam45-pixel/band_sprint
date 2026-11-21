/**
 * BAND SPRINT — GLOBAL IELTS SCORING INTEGRITY & ANTI-FABRICATION REGRESSION SUITE
 *
 * Verifies:
 * 1. Official IELTS rounding & strict 4-skill overall calculation
 * 2. Speaking AI payload validation, criterion independence, anti-inflation caps,
 *    transcript-only pronunciation honesty, and malformed/out-of-range rejection
 * 3. Speaking session acoustic vs transcript-only handling
 * 4. Shadowing DP word alignment, timing/pace telemetry, failure states, and zero band fabrication
 * 5. Writing AI payload validation, heuristic anti-repetition/anti-floor guards, dynamic lexical upgrades,
 *    and CD-IELTS Writing Suite non-fabrication of Speaking scores
 * 6. Reading, Listening, duplicate-ID deduplication, Academic vs GT differentiation, and incomplete mock null overall
 */

import assert from 'node:assert/strict';
import {
  roundOfficialIELTSBand,
  validateCriterionBand,
  calculateStrictFourPartBand,
  analyzeTextQualitySignals,
  validateSpeakingAiPayload,
  validateWritingAiPayload,
  evaluateShadowingAttempt
} from '../../utils/scoringIntegrity';
import {
  checkWritingWordThreshold,
  evaluateWritingSubmission
} from '../../services/WritingEvaluationService';
import { evaluateCDIELTSWritingSuite } from '../../utils/cdieltsEvaluationEngine';
import {
  checkSpeakingInputGate,
  evaluateSpeakingSession
} from '../../services/SpeakingEvaluationService';
import { calculateMockExamScores } from '../../utils/mockExamScoring';
import {
  calculateOfficialListeningBand,
  calculateOfficialAcademicReadingBand,
  calculateOfficialGeneralTrainingReadingBand
} from '../../utils/listeningAnswerEvaluator';
import { QuestionItem } from '../../data/mockExams';
import { SpeakingAnswerRecord } from '../../types/speakingTypes';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  [PASS] ${name}`);
  } catch (err: any) {
    failed++;
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err?.message || err}`);
  }
}

console.log('\n=== BAND SPRINT: GLOBAL SCORING INTEGRITY TEST SUITE ===\n');

// ---------------------------------------------------------------------------
// 1. OFFICIAL IELTS ROUNDING & STRICT 4-PART CALCULATION
// ---------------------------------------------------------------------------
console.log('1. Official IELTS Rounding & Strict 4-Part Band Math');

test('Official IELTS rounding obeys .25 -> .5 and .75 -> next whole band', () => {
  assert.equal(roundOfficialIELTSBand(6.125), 6.0);
  assert.equal(roundOfficialIELTSBand(6.25), 6.5);
  assert.equal(roundOfficialIELTSBand(6.625), 6.5);
  assert.equal(roundOfficialIELTSBand(6.75), 7.0);
  assert.equal(roundOfficialIELTSBand(6.875), 7.0);
  assert.equal(roundOfficialIELTSBand(0), 0);
  assert.equal(roundOfficialIELTSBand(9.4), 9.0);
});

test('validateCriterionBand rejects NaN, Infinity, <1.0, >9.0, null, and booleans', () => {
  assert.equal(validateCriterionBand(NaN), null);
  assert.equal(validateCriterionBand(Infinity), null);
  assert.equal(validateCriterionBand(-1), null);
  assert.equal(validateCriterionBand(0), null);
  assert.equal(validateCriterionBand(0.5), null);
  assert.equal(validateCriterionBand(9.5), null);
  assert.equal(validateCriterionBand(null), null);
  assert.equal(validateCriterionBand(true), null);
  assert.equal(validateCriterionBand('7.0'), 7.0);
  assert.equal(validateCriterionBand(4.5), 4.5);
  assert.equal(validateCriterionBand(1.0), 1.0);
  assert.equal(validateCriterionBand(9.0), 9.0);
});

test('calculateStrictFourPartBand returns null if ANY skill is missing or invalid', () => {
  assert.equal(calculateStrictFourPartBand(7.0, 7.0, 7.0, null), null);
  assert.equal(calculateStrictFourPartBand(7.0, 0, 7.0, 7.0), null);
  assert.equal(calculateStrictFourPartBand(6.5, 6.5, 6.0, 6.0), 6.5); // avg 6.25 -> 6.5
  assert.equal(calculateStrictFourPartBand(7.0, 7.0, 6.5, 6.5), 7.0); // avg 6.75 -> 7.0
});

// ---------------------------------------------------------------------------
// 2. SPEAKING AI PAYLOAD VALIDATION & ANTI-FABRICATION
// ---------------------------------------------------------------------------
console.log('\n2. Speaking Assessment Integrity & Anti-Inflation');

test('Transcript-only speaking NEVER fabricates Pronunciation band and marks partial_transcript_only', () => {
  const res = validateSpeakingAiPayload(
    {
      criteria: { fc: 7.0, lr: 6.5, gra: 7.0, pr: 8.5 }, // LLM tried to invent PR 8.5 without audio
      overallBand: 8.0 // LLM tried to inflate overall
    },
    {
      transcript:
        'I enjoy spending my weekends cycling along the riverfront because it helps me unwind after a demanding workweek and keeps my physical stamina consistent.',
      hasAudioEvidence: false,
      durationSec: 18
    }
  );
  assert.equal(res.valid, true);
  assert.equal(res.criteria.pr, null);
  assert.equal(res.pronunciationObservable, false);
  assert.equal(res.isPartialAssessment, true);
  assert.equal(res.assessmentStatus, 'partial_transcript_only');
  assert.ok(res.unassessedCriteria.includes('pronunciation'));
  // Phase 3B.1 contract: transcript-only MUST NOT emit an overallBand; 3-criterion index goes to partialThreeCriterionIndex
  // (7.0 + 6.5 + 7.0) / 3 = 6.833 -> 7.0 (NOT LLM's inflated 8.0)
  assert.equal(res.overallBand, null);
  assert.equal(res.partialThreeCriterionIndex, 7.0);
});

test('Audio-evidence speaking uses all 4 criteria with official IELTS rounding and overrides conflicting LLM overall', () => {
  const res = validateSpeakingAiPayload(
    {
      criteria: { fc: 6.5, lr: 6.0, gra: 6.5, pr: 6.0 },
      overallBand: 7.5 // Conflicting LLM math
    },
    {
      transcript:
        'Public transport plays a crucial role in modern urban planning because it reduces traffic congestion and lowers daily carbon emissions for commuters.',
      hasAudioEvidence: true,
      durationSec: 16
    }
  );
  assert.equal(res.valid, true);
  assert.equal(res.criteria.pr, 6.0);
  assert.equal(res.pronunciationObservable, true);
  assert.equal(res.isPartialAssessment, false);
  assert.equal(res.assessmentStatus, 'evaluated');
  // (6.5 + 6.0 + 6.5 + 6.0) / 4 = 6.25 -> 6.5
  assert.equal(res.overallBand, 6.5);
  assert.equal(res.partialThreeCriterionIndex, null);
});

test('Speaking preserves genuine low/weak bands (Band 2.5 - 4.5) without floor inflation', () => {
  const res = validateSpeakingAiPayload(
    {
      criteria: { fc: 3.5, lr: 4.0, gra: 3.5, pr: 4.0 },
      overallBand: 3.5
    },
    {
      transcript: 'I like my city because it is good and big and have many shops for people.',
      hasAudioEvidence: true,
      durationSec: 14
    }
  );
  assert.equal(res.valid, true);
  assert.equal(res.criteria.fc, 3.5);
  assert.equal(res.criteria.lr, 4.0);
  assert.equal(res.criteria.gra, 3.5);
  assert.equal(res.overallBand, 4.0); // avg 3.75 -> 4.0
});

test('Speaking preserves criterion independence (good grammar/vocab does NOT lift poor fluency)', () => {
  const res = validateSpeakingAiPayload(
    {
      criteria: { fc: 4.5, lr: 7.5, gra: 7.5, pr: 6.0 },
      overallBand: 7.5
    },
    {
      transcript:
        'Um, well, I suppose that, uh, sustainable infrastructure is, like, um, indispensable, you know, for contemporary metropolitan regions.',
      hasAudioEvidence: true,
      pauseCount: 7,
      durationSec: 30
    }
  );
  assert.equal(res.valid, true);
  assert.ok(res.criteria.fc <= 4.5, `Expected FC <= 4.5, got ${res.criteria.fc}`);
  assert.equal(res.criteria.lr, 7.5);
  assert.equal(res.criteria.gra, 7.5);
  // (4.5 + 7.5 + 7.5 + 6.0) / 4 = 6.375 -> 6.5 (not inflated to 7.5!)
  assert.equal(res.overallBand, 6.5);
});

test('Speaking preserves criterion independence (strong fluency + limited vocabulary)', () => {
  const res = validateSpeakingAiPayload(
    {
      criteria: { fc: 7.5, lr: 5.0, gra: 6.0, pr: 7.0 }
    },
    {
      transcript:
        'I go to the park every morning with my friend and we walk around the lake and talk about work and family and then we buy coffee near the gate.',
      hasAudioEvidence: true,
      durationSec: 15
    }
  );
  assert.equal(res.valid, true);
  assert.equal(res.criteria.fc, 7.5);
  assert.equal(res.criteria.lr, 5.0);
  assert.equal(res.overallBand, 6.5); // 25.5 / 4 = 6.375 -> 6.5
});

test('Very short speaking answer (<12 words) caps criteria and cannot receive Band 7.0+', () => {
  const res = validateSpeakingAiPayload(
    {
      criteria: { fc: 8.0, lr: 8.0, gra: 8.0, pr: 8.0 }
    },
    {
      transcript: 'Yes, I really love travelling with my family.',
      hasAudioEvidence: true,
      durationSec: 4
    }
  );
  assert.equal(res.valid, true);
  assert.ok(res.criteria.fc <= 5.0, `Expected FC <= 5.0 for 8-word answer, got ${res.criteria.fc}`);
  assert.ok(res.criteria.lr <= 5.5, `Expected LR <= 5.5 for 8-word answer, got ${res.criteria.lr}`);
  assert.ok(res.calibrationNotes.some((n) => n.toLowerCase().includes('<12 words')));
});

test('Long repetitive speaking transcript is detected and capped at <= 4.5', () => {
  const repetitive = Array(12).fill('I like to read books every day because books are very good.').join(' ');
  const res = validateSpeakingAiPayload(
    {
      criteria: { fc: 8.0, lr: 7.5, gra: 7.5, pr: 7.5 }
    },
    {
      transcript: repetitive,
      hasAudioEvidence: true,
      durationSec: 60
    }
  );
  assert.equal(res.valid, true);
  assert.ok(res.criteria.fc <= 4.5, `Expected repetitive FC <= 4.5, got ${res.criteria.fc}`);
  assert.ok(res.criteria.lr <= 4.5, `Expected repetitive LR <= 4.5, got ${res.criteria.lr}`);
  assert.ok(res.calibrationNotes.some((n) => n.toLowerCase().includes('repetition')));
});

test('Memorized template response triggers anti-memorization moderation', () => {
  const memorized =
    'Well, that is a very interesting question. To be honest with you, every coin has two sides, and with the rapid development of science and technology, people have different views on this hotly debated topic in modern society.';
  const res = validateSpeakingAiPayload(
    {
      criteria: { fc: 8.0, lr: 8.0, gra: 8.0, pr: 7.5 }
    },
    {
      transcript: memorized,
      hasAudioEvidence: false,
      durationSec: 18
    }
  );
  assert.equal(res.valid, true);
  assert.ok(res.criteria.fc !== null && res.criteria.fc <= 6.0, `Expected memorized FC <= 6.0, got ${res.criteria.fc}`);
  assert.equal(res.overallBand, null);
  assert.ok(res.calibrationNotes.some((n) => n.toLowerCase().includes('memorized')));
});

test('High filler density and long pauses cap Fluency independently at <= 5.5', () => {
  const fillery =
    'Um, like, you know, basically I uh went to, um, like the university and uh you know um studied like basically science um yeah.';
  const res = validateSpeakingAiPayload(
    {
      criteria: { fc: 7.5, lr: 6.5, gra: 6.5, pr: 6.5 }
    },
    {
      transcript: fillery,
      hasAudioEvidence: true,
      pauseCount: 6,
      durationSec: 25
    }
  );
  assert.equal(res.valid, true);
  assert.ok(res.criteria.fc <= 5.5, `Expected high-filler + pause FC <= 5.5, got ${res.criteria.fc}`);
});

test('Malformed / missing / out-of-range AI speaking payloads are REJECTED (never defaulted to Band 7.0)', () => {
  const missing = validateSpeakingAiPayload(
    { criteria: { fc: 7.0, lr: 7.0 } }, // missing gra
    { transcript: 'I enjoy studying foreign languages because they broaden my cultural outlook.', hasAudioEvidence: false }
  );
  assert.equal(missing.valid, false);
  assert.equal(missing.assessmentStatus, 'unavailable');
  assert.equal(missing.overallBand, null);
  assert.equal(missing.criteria.fc, null);

  const outOfRange = validateSpeakingAiPayload(
    { criteria: { fc: 9.5, lr: -1, gra: NaN, pr: 7.0 } },
    { transcript: 'I enjoy studying foreign languages because they broaden my cultural outlook.', hasAudioEvidence: true }
  );
  assert.equal(outOfRange.valid, false);
  assert.equal(outOfRange.overallBand, null);

  const tooShort = validateSpeakingAiPayload(
    { criteria: { fc: 7.0, lr: 7.0, gra: 7.0, pr: 7.0 } },
    { transcript: 'Yes okay', hasAudioEvidence: false }
  );
  assert.equal(tooShort.valid, false);
  assert.equal(tooShort.assessmentStatus, 'insufficient_evidence');
  assert.equal(tooShort.overallBand, null);
  assert.equal(tooShort.partialThreeCriterionIndex, null);
  assert.equal(tooShort.criteria.fc, null);
});

test('SpeakingEvaluationService transcript-only session sets pronunciationBand and overallBand to null and exposes partialThreeCriterionIndex', () => {
  const answers: SpeakingAnswerRecord[] = [
    {
      questionId: 'p1_q1',
      part: 1,
      topic: 'Hometown',
      questionText: 'Where do you live?',
      transcript:
        'I currently reside in a quiet coastal suburb where public parks and libraries make everyday life quite peaceful and convenient.',
      startTime: Date.now() - 12000,
      endTime: Date.now(),
      durationSec: 12,
      wordCount: 21,
      wordsPerMinute: 105,
      pauseCount: 0,
      longPauseCount: 0,
      fillerCount: 0,
      detectedFillers: []
    }
  ];
  const report = evaluateSpeakingSession(answers, 7.0);
  assert.equal(report.isValidAttempt, true);
  assert.equal(report.assessmentStatus, 'partial_transcript_only');
  assert.equal(report.pronunciationObservable, false);
  assert.equal(report.pronunciationBand, null);
  assert.equal(report.criteria.pronunciation.band, null);
  assert.equal(report.overallBand, null);
  assert.ok(/unassessed|not assessed/i.test(report.criteria.pronunciation.strengths[0]));
  assert.ok(
    typeof report.partialThreeCriterionIndex === 'number' &&
      report.partialThreeCriterionIndex >= 4.0 &&
      report.partialThreeCriterionIndex <= 9.0
  );
});

test('Speaking input gate rejects empty or <5-word speech with null band and insufficient_evidence', () => {
  const gate = checkSpeakingInputGate('hello yes');
  assert.equal(gate.isValidAttempt, false);
  assert.equal(gate.assessmentStatus, 'insufficient_evidence');
  assert.equal(gate.overallBand, null);
});

// ---------------------------------------------------------------------------
// 3. SHADOWING INTEGRITY (NO FAKE IELTS BAND SCORES)
// ---------------------------------------------------------------------------
console.log('\n3. Shadowing Practice Integrity (Non-Band Alignment & Timing)');

test('Shadowing perfect match returns 100% word accuracy and NEVER emits an IELTS band score', () => {
  const result = evaluateShadowingAttempt({
    targetText: 'Sustainable urban planning requires significant investment in public transit.',
    spokenTranscript: 'Sustainable urban planning requires significant investment in public transit',
    elapsedSec: 4.5,
    expectedDurationSec: 4.3,
    hasAudioBlob: true,
    recognitionConfidence: 0.94
  });
  assert.equal(result.status, 'valid');
  assert.equal(result.wordAccuracyPct, 100);
  assert.equal(result.missingCount, 0);
  assert.equal(result.substitutedCount, 0);
  assert.equal(result.extraCount, 0);
  assert.equal(result.timingSyncStatus, 'aligned');
  assert.equal(result.recordingQuality, 'audio_captured');
  assert.equal('bandEstimate' in result, false);
  assert.equal('overallBand' in result, false);
  assert.equal('ieltsBand' in result, false);
});

test('Shadowing accurately classifies missing, substituted, and extra words via DP alignment', () => {
  const result = evaluateShadowingAttempt({
    targetText: 'Urban green spaces improve public health dramatically',
    spokenTranscript: 'Urban blue spaces improve dramatically right now today',
    elapsedSec: 4.0,
    expectedDurationSec: 3.5
  });
  assert.equal(result.status, 'valid');
  assert.ok(result.substitutedCount >= 1, 'Expected at least 1 substitution ("green" -> "blue")');
  assert.ok(result.missingCount >= 1, 'Expected missing word(s) ("public", "health")');
  assert.ok(result.extraCount >= 1, 'Expected extra word(s) ("right", "now", "today")');
  assert.ok(result.wordAccuracyPct < 75, `Expected accuracy < 75%, got ${result.wordAccuracyPct}%`);
});

test('Shadowing detects too-slow and too-fast pacing and out-of-sync timing', () => {
  const slow = evaluateShadowingAttempt({
    targetText: 'Renewable energy is gradually transforming national power grids worldwide',
    spokenTranscript: 'Renewable energy is gradually transforming national power grids worldwide',
    elapsedSec: 12.0,
    expectedDurationSec: 4.2
  });
  assert.equal(slow.paceStatus, 'too_slow');
  assert.equal(slow.timingSyncStatus, 'out_of_sync');

  const fast = evaluateShadowingAttempt({
    targetText: 'Renewable energy is gradually transforming national power grids worldwide',
    spokenTranscript: 'Renewable energy is gradually transforming national power grids worldwide',
    elapsedSec: 2.0,
    expectedDurationSec: 4.8
  });
  assert.equal(fast.paceStatus, 'too_fast');
  assert.equal(fast.timingSyncStatus, 'out_of_sync');
});

test('Shadowing handles empty / unintelligible speech and STT failure honestly', () => {
  const failedStt = evaluateShadowingAttempt({
    targetText: 'Renewable energy is transforming national power grids.',
    spokenTranscript: '',
    elapsedSec: 3.0,
    expectedDurationSec: 3.0,
    recognitionError: 'no-speech'
  });
  assert.equal(failedStt.status, 'recognition_failed');
  assert.equal(failedStt.wordAccuracyPct, 0);

  const emptySpeech = evaluateShadowingAttempt({
    targetText: 'Renewable energy is transforming national power grids.',
    spokenTranscript: '   ',
    elapsedSec: 3.0,
    expectedDurationSec: 3.0
  });
  assert.equal(emptySpeech.status, 'insufficient_speech');
  assert.equal(emptySpeech.wordAccuracyPct, 0);
});

// ---------------------------------------------------------------------------
// 4. WRITING ASSESSMENT & CD-IELTS NON-FABRICATION
// ---------------------------------------------------------------------------
console.log('\n4. Writing Assessment Integrity & CD-IELTS Non-Fabrication');

test('validateWritingAiPayload rejects short (<30w Task 1 / <50w Task 2), gibberish, and missing criteria', () => {
  const shortT1 = validateWritingAiPayload(
    { trScore: 7.0, ccScore: 7.0, lrScore: 7.0, graScore: 7.0 },
    { essayText: 'The graph goes up.', taskType: 'task1' }
  );
  assert.equal(shortT1.valid, false);
  assert.equal(shortT1.assessmentStatus, 'insufficient_evidence');

  const gibberish = validateWritingAiPayload(
    { trScore: 7.0, ccScore: 7.0, lrScore: 7.0, graScore: 7.0 },
    { essayText: Array(60).fill('asdf1234').join(' '), taskType: 'task2' }
  );
  assert.equal(gibberish.valid, false);

  const missingCrit = validateWritingAiPayload(
    { trScore: 7.0, ccScore: 7.0, lrScore: 7.0 }, // missing graScore
    {
      essayText:
        'University education plays an essential role in contemporary economic development. While some citizens contend that tuition subsidies strain public budgets, accessible tertiary schooling fosters social mobility and long-term productivity. Governments should therefore implement targeted need-based grants rather than universal fee waivers. This balanced policy preserves fiscal stability while ensuring talented students can pursue higher degrees.',
      taskType: 'task2'
    }
  );
  assert.equal(missingCrit.valid, false);
  assert.equal(missingCrit.assessmentStatus, 'unavailable');
});

test('validateWritingAiPayload enforces under-length TA/TR cap and authoritative 4-criterion math', () => {
  // ~65-word Task 2 essay (far below 250w target -> lengthRatio < 0.5 -> TA capped at 4.5)
  const shortEssay =
    'University education plays an essential role in contemporary economic development. While some citizens contend that tuition subsidies strain public budgets, accessible tertiary schooling fosters social mobility and long-term productivity. Governments should therefore implement targeted need-based grants rather than universal fee waivers. This balanced policy preserves fiscal stability while ensuring talented students from low-income backgrounds can pursue higher degrees without crippling debt burden across generations.';
  const res = validateWritingAiPayload(
    {
      trScore: 8.0,
      ccScore: 7.0,
      lrScore: 7.5,
      graScore: 7.5,
      overallBand: 8.5
    },
    { essayText: shortEssay, taskType: 'task2' }
  );
  assert.equal(res.valid, true);
  assert.ok(res.criteria.ta <= 4.5, `Expected severely under-length TA <= 4.5, got ${res.criteria.ta}`);
  // Authoritative recalculation: (4.5 + 7.0 + 7.5 + 7.5) / 4 = 6.625 -> 6.5 (NOT LLM's 8.5)
  assert.equal(res.overallBand, 6.5);
});

test('WritingEvaluationService caps repeated filler sentences ("The cat sat on the mat." x 50) at <= 3.5', () => {
  const repetitiveEssay = Array(50).fill('The cat sat on the mat.').join(' ');
  const report = evaluateWritingSubmission(repetitiveEssay, 'task2');
  assert.equal(report.isValidAttempt, true);
  assert.ok(
    report.overallBand <= 3.5,
    `Expected repetitive nonsense essay <= 3.5, got ${report.overallBand}`
  );
  assert.equal(report.lexicalUpgrades.length, 0, 'Should NOT emit fake lexical upgrades for words absent from draft');
});

test('WritingEvaluationService only emits lexicalUpgrades for phrases actually present in candidate text', () => {
  const cleanEssay =
    'Public libraries remain vital civic institutions across urban neighbourhoods. Beyond lending printed volumes, these facilities offer quiet study spaces, digital literacy workshops, and equitable internet access for residents of every age bracket. Furthermore, municipal investment in library infrastructure yields measurable educational returns by supporting lifelong learning and reducing socioeconomic disparities among local households. Although online databases have transformed how scholars retrieve reference material, physical community hubs foster collaborative dialogue that isolated screens cannot replicate. Consequently, city councils should preserve and modernize public libraries rather than diverting their budgets elsewhere.';
  const withInformal = cleanEssay + ' Many people think a lot of libraries are very important for bad results.';

  const cleanReport = evaluateWritingSubmission(cleanEssay, 'task2');
  const informalReport = evaluateWritingSubmission(withInformal, 'task2');
  assert.equal(cleanReport.lexicalUpgrades.length, 0);
  assert.ok(informalReport.lexicalUpgrades.length >= 2);
});

test('evaluateCDIELTSWritingSuite NEVER fabricates Speaking scores from Writing submissions', () => {
  const t1 =
    'The line chart compares household solar panel installations across four countries between 2012 and 2024. Overall, adoption rose steadily across every nation, with Germany and Australia maintaining the largest shares throughout the period. In 2012, Germany led at 18 percent while Canada stood at 3 percent. By 2024, Australia reached 34 percent and Germany climbed to 31 percent, whereas Japan and Canada grew more modestly to 19 percent and 14 percent respectively.';
  const t2 =
    'Governments worldwide debate whether urban funding should prioritize public transit networks or highway expansion. I argue that investing in rail and bus infrastructure produces superior long-term outcomes for commuters and the environment.\n\nExpanding motorways frequently triggers induced demand, whereby additional lanes temporarily ease bottlenecks before attracting more private vehicles and restoring congestion. By contrast, high-capacity metro lines transport thousands of passengers per hour using a fraction of the land area and energy.\n\nFurthermore, accessible transit lowers household transport costs and cuts fine particulate emissions across densely populated districts. Although highway maintenance remains necessary for regional freight logistics, metropolitan budgets yield stronger social returns when directed toward clean mass transit.\n\nIn conclusion, prioritizing public transport offers a more sustainable and equitable solution to modern urban mobility challenges than widening urban roads.';

  const suite = evaluateCDIELTSWritingSuite(t1, t2, 'Describe the solar chart.', 'Public transit vs roads.');
  assert.ok(suite.overallWritingBand >= 5.5, `Valid essays should score honestly, got ${suite.overallWritingBand}`);
  assert.equal(suite.speakingAudit.isAssessed, false);
  assert.equal(suite.speakingAudit.overallSpeakingBand, 0);
  assert.equal(suite.speakingAudit.fcBand, 0);
  assert.equal(suite.speakingAudit.lrBand, 0);
  assert.equal(suite.speakingAudit.graBand, 0);
  assert.equal(suite.speakingAudit.pBand, 0);
});

// ---------------------------------------------------------------------------
// 5. READING, LISTENING & FULL MOCK INTEGRITY
// ---------------------------------------------------------------------------
console.log('\n5. Reading, Listening & Full Mock Exam Scoring Integrity');

test('Listening, Academic Reading, and General Training Reading band tables handle extremes & format differences', () => {
  assert.equal(calculateOfficialListeningBand(40, 40), 9.0);
  assert.equal(calculateOfficialListeningBand(0, 40), 0.0);
  assert.equal(calculateOfficialAcademicReadingBand(30, 40), 7.0);
  assert.equal(calculateOfficialGeneralTrainingReadingBand(30, 40), 6.0); // GT requires higher raw score for Band 7
  assert.equal(calculateOfficialGeneralTrainingReadingBand(34, 40), 7.0);
});

test('calculateMockExamScores deduplicates duplicate question IDs and separates unanswered vs incorrect', () => {
  const qs: QuestionItem[] = [
    { id: 1, section: 'listening', type: 'Short Answer', prompt: 'Q1', correctAnswer: 'library', explanation: '' },
    // Duplicate Q1 injected into input
    { id: 1, section: 'listening', type: 'Short Answer', prompt: 'Q1 dup', correctAnswer: 'library', explanation: '' },
    { id: 2, section: 'listening', type: 'Short Answer', prompt: 'Q2', correctAnswer: 'museum', explanation: '' },
    { id: 3, section: 'listening', type: 'Short Answer', prompt: 'Q3', correctAnswer: 'station', explanation: '' }
  ];

  const res = calculateMockExamScores({
    questions: qs,
    answers: { 1: 'library', 2: 'wrong' }, // Q3 unanswered
    essayText: '',
    task1Text: '',
    speakingAnswers: []
  });

  assert.equal(res.listeningTotal, 3, 'Duplicate Q1 must be deduplicated');
  assert.equal(res.listeningCorrect, 1);
  assert.equal(res.listeningIncorrect, 1);
  assert.equal(res.listeningUnanswered, 1);
  assert.equal(res.isListeningComplete, false);
  assert.equal(res.overall, null, 'Incomplete mock MUST return overall: null');
});

test('checkWritingWordThreshold rejects 0 words, short drafts, and repeated single-word spam', () => {
  assert.equal(checkWritingWordThreshold('', 'task2').isValidAttempt, false);
  assert.equal(checkWritingWordThreshold('Too short essay.', 'task2').isValidAttempt, false);
  assert.equal(checkWritingWordThreshold(Array(60).fill('hello').join(' '), 'task2').isValidAttempt, false);
});

test('analyzeTextQualitySignals accurately detects fillers, repetition, and memorized clichés', () => {
  const sig = analyzeTextQualitySignals(
    'Um, like, every coin has two sides. I like cats. I like cats. I like cats. I like cats.'
  );
  assert.ok(sig.fillerCount >= 2);
  assert.ok(sig.memorizedTemplateHits.length >= 1);
  assert.ok(sig.repeatedSentenceRatio >= 0.5);
  assert.equal(sig.isHighlyRepetitive, true);
});

console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) {
  process.exit(1);
}
