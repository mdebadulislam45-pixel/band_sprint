/**
 * IELTS SPRINT — SPEAKING EVALUATION SERVICE
 * Evaluates candidate responses across the 4 IELTS Speaking criteria:
 * 1. Fluency and Coherence (25%)
 * 2. Lexical Resource (25%)
 * 3. Grammatical Range and Accuracy (25%)
 * 4. Pronunciation (25%)
 *
 * Strictly enforces the 5-word minimum input gate. Zero mock or hardcoded scores
 * are generated when speech is missing, inaudible, or under 5 words.
 */

import {
  SpeakingAnswerRecord,
  SpeakingEvaluationReport,
  SpeakingTestAnalytics,
  CriterionFeedback,
  InstantSpeakingFeedback,
  DetailedGrammarError,
  PronunciationWordTip,
  SpeakingPart,
  GrammarObservation
} from '../types/speakingTypes';
import {
  analyzeTextQualitySignals,
  roundOfficialIELTSBand
} from '../utils/scoringIntegrity';
import { getStoredSessionToken } from './authService';
import { setBarnabyAnalyzing } from '../utils/getBarnabyState';

export interface SpeakingInputGateResult {
  isValidAttempt: boolean;
  assessmentStatus?: 'insufficient_evidence';
  wordCount: number;
  overallBand: number | null;
  criteria: { fc: number | null; lr: number | null; gra: number | null; pr: number | null };
  feedbackTitle: string;
  feedbackEn: string;
  feedbackBn: string;
}

/**
 * Official Strict Input Gate for IELTS Speaking Evaluation.
 * Rejects empty, unattempted, or sub-5-word transcripts with null (unassessed) scores.
 */
export function checkSpeakingInputGate(transcript: string): SpeakingInputGateResult {
  const cleanWords = (transcript || '').trim().split(/\s+/).filter(Boolean);
  if (cleanWords.length < 5) {
    return {
      isValidAttempt: false,
      assessmentStatus: 'insufficient_evidence',
      wordCount: cleanWords.length,
      overallBand: null,
      criteria: { fc: null, lr: null, gra: null, pr: null },
      feedbackTitle: "No Candidate Speech Detected",
      feedbackEn: "You spoke fewer than 5 words. The examiner cannot assess your English without audible, sustained speech.",
      feedbackBn: "পর্যাপ্ত শব্দ শনাক্ত করা যায়নি (কমপক্ষে ৫টি শব্দ প্রয়োজন)। অনুগ্রহ করে মাইক্রোফোন অন করে স্পষ্টভাবে কথা বলুন।"
    };
  }

  return {
    isValidAttempt: true,
    wordCount: cleanWords.length,
    overallBand: null,
    criteria: { fc: null, lr: null, gra: null, pr: null },
    feedbackTitle: "Valid Speech Detected",
    feedbackEn: "",
    feedbackBn: ""
  };
}

const COMMON_FILLERS = [
  'um',
  'uh',
  'like',
  'you know',
  'basically',
  'actually',
  'literally',
  'kind of',
  'sort of',
  'i mean',
  'well'
];

const ADVANCED_VOCAB_PATTERNS = [
  /\b(furthermore|moreover|consequently|nevertheless|nonetheless|albeit|notwithstanding)\b/gi,
  /\b(ubiquitous|proliferation|mitigate|exacerbate|indispensable|paramount|detrimental|catalyst)\b/gi,
  /\b(perspective|implications|infrastructure|sustainability|socioeconomic|paradigm|juxtaposition)\b/gi,
  /\b(substantially|predominantly|fundamentally|inevitably|exponentially|intrinsically)\b/gi,
  /\b(crucial|significant|vital|essential|compelling|profound|nuanced|multifaceted)\b/gi
];

const COMPLEX_GRAMMAR_PATTERNS = [
  /\b(although|even though|despite the fact that|whereas|while|provided that|unless)\b/gi,
  /\b(which|who|whom|whose|whereby|in which)\b/gi,
  /\b(had been|have been|has been|would have|could have|should have|might have)\b/gi,
  /\b(have|has|had)\s+[a-z]+ed\b/gi,
  /\b(having\s+[a-z]+ed|having\s+said)\b/gi,
  /\b(not only .* but also|neither .* nor|either .* or)\b/gi,
  /\b(if .* were|were .* to)\b/gi
];

export function calculateIELTSOverallBand(fc: number, gra: number, lr: number, pr: number): {
  rawAverage: number;
  overallBand: number;
  formulaString: string;
} {
  const rawAverage = (fc + gra + lr + pr) / 4;
  const decimal = rawAverage - Math.floor(rawAverage);
  let overallBand = Math.floor(rawAverage);

  if (decimal < 0.25) {
    overallBand += 0.0;
  } else if (decimal < 0.75) {
    overallBand += 0.5;
  } else {
    overallBand += 1.0;
  }

  return {
    rawAverage: Number(rawAverage.toFixed(3)),
    overallBand,
    formulaString: `(${fc.toFixed(1)} + ${gra.toFixed(1)} + ${lr.toFixed(1)} + ${pr.toFixed(1)}) ÷ 4 = ${rawAverage.toFixed(3)} → ${overallBand.toFixed(1)}`
  };
}

export function getIELTSBandDescriptor(band: number | null): string {
  if (band === null || !Number.isFinite(band)) return 'Not assessed';
  if (band >= 9.0) return 'Expert user';
  if (band >= 8.5) return 'Very good user (Upper)';
  if (band >= 8.0) return 'Very good user';
  if (band >= 7.5) return 'Good user (Upper)';
  if (band >= 7.0) return 'Good user';
  if (band >= 6.5) return 'Competent user (Upper)';
  if (band >= 6.0) return 'Competent user';
  if (band >= 5.5) return 'Modest user (Upper)';
  if (band >= 5.0) return 'Modest user';
  if (band >= 4.0) return 'Limited user';
  if (band >= 3.0) return 'Extremely limited user';
  if (band >= 2.0) return 'Intermittent user';
  if (band >= 1.0) return 'Non-user';
  return 'Did not attempt / Inaudible';
}

function roundToHalfBand(score: number): number {
  const clamped = Math.max(0.0, Math.min(9.0, score));
  return Math.round(clamped * 2) / 2;
}

export function computeSpeakingAnalytics(answers: SpeakingAnswerRecord[]): SpeakingTestAnalytics {
  let totalSpeakingTimeSec = 0;
  let totalWordsSpoken = 0;
  let totalFillers = 0;

  const fillerCounts: Record<string, number> = {};
  const allWords: string[] = [];

  let totalPausesMeasured = 0;
  let totalLongPausesMeasured = 0;
  let hasMeasuredPauses = false;
  let hasMeasuredLongPauses = false;

  for (const ans of answers) {
    const cleanWords = (ans.transcript || '').trim().split(/\s+/).filter(Boolean);
    totalSpeakingTimeSec += ans.durationSec || 0;
    totalWordsSpoken += typeof ans.wordCount === 'number' && ans.wordCount > 0 ? ans.wordCount : cleanWords.length;

    if (typeof ans.pauseCount === 'number' && Number.isFinite(ans.pauseCount) && ans.pauseCount >= 0) {
      totalPausesMeasured += ans.pauseCount;
      hasMeasuredPauses = true;
    }
    if (typeof ans.longPauseCount === 'number' && Number.isFinite(ans.longPauseCount) && ans.longPauseCount >= 0) {
      totalLongPausesMeasured += ans.longPauseCount;
      hasMeasuredLongPauses = true;
    }
    if (typeof ans.fillerCount === 'number' && Number.isFinite(ans.fillerCount) && ans.fillerCount >= 0) {
      totalFillers += ans.fillerCount;
    }

    if (ans.detectedFillers) {
      for (const f of ans.detectedFillers) {
        const lower = f.toLowerCase();
        fillerCounts[lower] = (fillerCounts[lower] || 0) + 1;
      }
    }

    const words = (ans.transcript || '')
      .toLowerCase()
      .replace(/[^a-z\s']/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1);
    allWords.push(...words);
  }

  const averageWpm =
    totalSpeakingTimeSec > 5 ? Math.round((totalWordsSpoken / totalSpeakingTimeSec) * 60) : 0;

  const uniqueSet = new Set(allWords);
  const uniqueVocabularyCount = uniqueSet.size;
  const lexicalDiversityRatio =
    allWords.length > 0 ? Number((uniqueVocabularyCount / allWords.length).toFixed(2)) : 0;

  const mostFrequentFillers = Object.entries(fillerCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalSpeakingTimeSec,
    totalWordsSpoken,
    averageWpm,
    totalPauses: hasMeasuredPauses ? totalPausesMeasured : null,
    totalLongPauses: hasMeasuredLongPauses ? totalLongPausesMeasured : null,
    pauseTelemetryAvailable: hasMeasuredPauses || hasMeasuredLongPauses,
    totalFillers,
    mostFrequentFillers,
    uniqueVocabularyCount,
    lexicalDiversityRatio
  };
}

export const analyzeSpeakingFluency = computeSpeakingAnalytics;

export function analyzeSingleTranscriptMetrics(
  transcript: string,
  durationSec: number
): {
  wordCount: number;
  wordsPerMinute: number;
  fillerCount: number;
  detectedFillers: string[];
} {
  const clean = (transcript || '').trim();
  const words = clean ? clean.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const safeDuration = Math.max(1, durationSec);
  const wordsPerMinute = wordCount >= 5 ? Math.round((wordCount / safeDuration) * 60) : 0;

  const lower = clean.toLowerCase();
  const detectedFillers: string[] = [];
  let fillerCount = 0;

  for (const filler of COMMON_FILLERS) {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = lower.match(regex);
    if (matches && matches.length > 0) {
      fillerCount += matches.length;
      for (let i = 0; i < matches.length; i++) {
        detectedFillers.push(filler);
      }
    }
  }

  return {
    wordCount,
    wordsPerMinute,
    fillerCount,
    detectedFillers
  };
}

export function evaluateSpeakingSession(
  answers: SpeakingAnswerRecord[],
  analyticsOrTarget?: SpeakingTestAnalytics | number
): SpeakingEvaluationReport {
  const analytics: SpeakingTestAnalytics =
    typeof analyticsOrTarget === 'object' && analyticsOrTarget !== null
      ? analyticsOrTarget
      : computeSpeakingAnalytics(answers);
  const combinedTranscript = answers
    .map((a) => (a.transcript || '').trim())
    .filter(Boolean)
    .join(' ');

  // Strict 5-Word Input Gate for the session
  const gate = checkSpeakingInputGate(combinedTranscript);
  if (!gate.isValidAttempt) {
    const emptyCriterion = (
      name: 'Fluency & Coherence' | 'Lexical Resource' | 'Grammatical Range & Accuracy' | 'Pronunciation'
    ): CriterionFeedback => ({
      band: null,
      criterionName: name,
      strengths: [],
      improvements: [gate.feedbackEn],
      evidenceQuotes: []
    });

    return {
      isValidAttempt: false,
      assessmentStatus: 'insufficient_evidence',
      evidenceMode: 'transcript_only',
      pronunciationObservable: false,
      isPartialAssessment: true,
      unassessedCriteria: [
        'Fluency & Coherence',
        'Lexical Resource',
        'Grammatical Range & Accuracy',
        'Pronunciation'
      ],
      wordCount: gate.wordCount,
      overallBand: null,
      partialThreeCriterionIndex: null,
      fluencyBand: null,
      lexicalBand: null,
      grammarBand: null,
      pronunciationBand: null,
      feedbackTitle: gate.feedbackTitle,
      feedbackEn: gate.feedbackEn,
      feedbackBn: gate.feedbackBn,
      criteria: {
        fc: null,
        lr: null,
        gra: null,
        pr: null,
        fluency: emptyCriterion('Fluency & Coherence'),
        lexical: emptyCriterion('Lexical Resource'),
        grammar: emptyCriterion('Grammatical Range & Accuracy'),
        pronunciation: emptyCriterion('Pronunciation')
      },
      keyStrengths: [],
      holdingYouBack: [gate.feedbackEn, gate.feedbackBn],
      topPriorities: [
        'Ensure your microphone is enabled and speak clearly for at least 5 words per response.'
      ],
      recommendedModules: [],
      grammarObservations: [],
      vocabUpgrades: [],
      overallSummary: `${gate.feedbackTitle}: ${gate.feedbackEn} (${gate.feedbackBn})`,
      questionBreakdowns: []
    };
  }

  let advancedVocabHits = 0;
  for (const pattern of ADVANCED_VOCAB_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = combinedTranscript.match(pattern);
    if (matches) advancedVocabHits += matches.length;
  }

  let complexGrammarHits = 0;
  for (const pattern of COMPLEX_GRAMMAR_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = combinedTranscript.match(pattern);
    if (matches) complexGrammarHits += matches.length;
  }

  // Extract REAL grammatical errors from the candidate's spoken turns
  const realGrammarObservations: GrammarObservation[] = [];
  for (const ans of answers) {
    const turnGate = checkSpeakingInputGate(ans.transcript);
    if (!turnGate.isValidAttempt) continue;
    const turnDiag = generateDiagnosticTurnFeedback(
      ans.questionId,
      ans.questionText,
      ans.part,
      ans.topic,
      ans.transcript,
      ans.durationSec,
      ans.wordsPerMinute
    );
    for (const gErr of turnDiag.grammaticalErrors) {
      if (!realGrammarObservations.some((o) => o.observed === gErr.observed)) {
        realGrammarObservations.push({
          observed: gErr.observed,
          corrected: gErr.corrected,
          explanation: gErr.explanation
        });
      }
    }
  }

  // Extract anti-repetition & coherence signals across the combined transcript
  const sessionSignals = analyzeTextQualitySignals(combinedTranscript);

  // 1. Fluency & Coherence Scoring based on real speech continuity, repetition, fillers & pauses
  let rawFluency = 4.5;
  if (!sessionSignals.isHighlyRepetitive && sessionSignals.lexicalDiversityRatio >= 0.35) {
    if (analytics.totalWordsSpoken >= 250) rawFluency += 1.5;
    else if (analytics.totalWordsSpoken >= 120) rawFluency += 1.0;
    else if (analytics.totalWordsSpoken >= 50) rawFluency += 0.5;
  } else if (analytics.totalWordsSpoken >= 50) {
    // Repetitive speech must never be rewarded for raw word count
    rawFluency -= 0.5;
  }
  if (analytics.totalWordsSpoken < 20) rawFluency -= 1.0;

  if (analytics.averageWpm >= 105 && analytics.averageWpm <= 165) rawFluency += 0.5;
  else if (analytics.averageWpm > 0 && analytics.averageWpm < 75) rawFluency -= 0.5;

  const fillerRatio =
    analytics.totalWordsSpoken > 0 ? analytics.totalFillers / analytics.totalWordsSpoken : 0;
  if (fillerRatio > 0.14) rawFluency -= 1.0;
  else if (fillerRatio > 0.08) rawFluency -= 0.5;
  if (typeof analytics.totalLongPauses === 'number' && analytics.totalLongPauses > 4) rawFluency -= 0.5;
  if (sessionSignals.isHighlyRepetitive) rawFluency = Math.min(rawFluency, 4.5);

  const fluencyBand = roundToHalfBand(rawFluency);

  // 2. Lexical Resource Scoring
  let rawLexical = 4.5;
  if (analytics.uniqueVocabularyCount >= 110 && sessionSignals.lexicalDiversityRatio >= 0.42) rawLexical += 1.5;
  else if (analytics.uniqueVocabularyCount >= 65 && sessionSignals.lexicalDiversityRatio >= 0.38) rawLexical += 1.0;
  else if (analytics.uniqueVocabularyCount >= 30) rawLexical += 0.5;
  else if (analytics.uniqueVocabularyCount < 15) rawLexical -= 0.5;

  if (advancedVocabHits >= 5) rawLexical += 1.0;
  else if (advancedVocabHits >= 2) rawLexical += 0.5;
  if (sessionSignals.isHighlyRepetitive) rawLexical = Math.min(rawLexical, 4.5);

  const lexicalBand = roundToHalfBand(rawLexical);

  // 3. Grammatical Range & Accuracy Scoring
  let rawGrammar = 5.0;
  if (complexGrammarHits >= 6) rawGrammar += 1.5;
  else if (complexGrammarHits >= 3) rawGrammar += 1.0;
  else if (complexGrammarHits >= 1) rawGrammar += 0.5;
  else if (analytics.totalWordsSpoken < 25) rawGrammar -= 0.5;

  if (realGrammarObservations.length >= 3) rawGrammar -= 1.0;
  else if (realGrammarObservations.length >= 1) rawGrammar -= 0.5;

  const grammarBand = roundToHalfBand(rawGrammar);

  // 4. Pronunciation & Intelligibility Scoring — NEVER fabricate from hardcoded 80/75/68 defaults
  const answersWithMeasuredAudio = answers.filter(
    (a) =>
      (typeof a.clarityScore === 'number' && a.clarityScore > 0) ||
      (a.acousticMetrics?.isMeasured !== false &&
        typeof a.acousticMetrics?.expressivenessScore === 'number' &&
        a.acousticMetrics.expressivenessScore > 0)
  );
  const hasRealAcousticMetrics = answersWithMeasuredAudio.length > 0;

  let pronunciationBand: number | null = null;
  let overallBand: number | null = null;
  let partialThreeCriterionIndex: number | null = null;
  let measuredAvgClarity = 0;

  if (hasRealAcousticMetrics) {
    const claritySamples = answersWithMeasuredAudio
      .map((a) => a.clarityScore)
      .filter((v): v is number => typeof v === 'number' && v > 0);
    const exprSamples = answersWithMeasuredAudio
      .map((a) => a.acousticMetrics?.expressivenessScore)
      .filter((v): v is number => typeof v === 'number' && v > 0);

    const avgClarity =
      claritySamples.length > 0
        ? claritySamples.reduce((acc, v) => acc + v, 0) / claritySamples.length
        : 0;
    measuredAvgClarity = avgClarity;
    const avgExpressiveness =
      exprSamples.length > 0
        ? exprSamples.reduce((acc, v) => acc + v, 0) / exprSamples.length
        : 0;
    const totalEnergyDrops = answersWithMeasuredAudio.reduce(
      (acc, a) => acc + (a.acousticMetrics?.energyDropOffs || 0),
      0
    );

    let rawPronunciation = 5.0;
    if (avgClarity >= 90) rawPronunciation += 1.5;
    else if (avgClarity >= 82) rawPronunciation += 1.0;
    else if (avgClarity >= 72) rawPronunciation += 0.5;
    else if (avgClarity > 0 && avgClarity < 65) rawPronunciation -= 0.5;

    if (avgExpressiveness >= 82) rawPronunciation += 0.5;
    else if (avgExpressiveness > 0 && avgExpressiveness < 48) rawPronunciation -= 0.5;

    if (totalEnergyDrops > 5) rawPronunciation -= 0.5;

    pronunciationBand = roundToHalfBand(rawPronunciation);
    const bandCalculation = calculateIELTSOverallBand(
      fluencyBand,
      grammarBand,
      lexicalBand,
      pronunciationBand
    );
    overallBand = bandCalculation.overallBand;
    partialThreeCriterionIndex = null;
  } else {
    // Transcript-only session: Pronunciation is NOT acoustically observable;
    // overallBand MUST remain null so partial results are never treated as a complete 4-criterion IELTS Speaking band.
    pronunciationBand = null;
    overallBand = null;
    partialThreeCriterionIndex = roundOfficialIELTSBand((fluencyBand + grammarBand + lexicalBand) / 3);
  }

  const sampleQuotes = answers
    .map((a) => (a.transcript || '').trim())
    .filter((t) => t.split(/\s+/).filter(Boolean).length >= 5)
    .slice(0, 3);

  const fluencyFeedback: CriterionFeedback = {
    band: fluencyBand,
    criterionName: 'Fluency & Coherence',
    strengths: [
      analytics.averageWpm >= 105
        ? `Maintained a natural conversational pace (${analytics.averageWpm} WPM).`
        : `Produced ${analytics.totalWordsSpoken} spoken words across ${answers.length} recorded turn(s).`
    ],
    improvements: [
      analytics.totalFillers > 2
        ? `Reduce vocal fillers (${analytics.totalFillers} detected) by using brief silent pauses.`
        : 'Use cohesive discourse markers ("From my perspective", "Having said that") to extend ideas.',
      typeof analytics.totalLongPauses === 'number' && analytics.totalLongPauses > 1
        ? 'Avoid hesitations exceeding 2.5 seconds between clauses.'
        : 'Develop Part 2 & Part 3 answers with concrete examples.'
    ],
    evidenceQuotes: sampleQuotes
  };

  const lexicalFeedback: CriterionFeedback = {
    band: lexicalBand,
    criterionName: 'Lexical Resource',
    strengths: [
      `Used ${analytics.uniqueVocabularyCount} unique words (lexical diversity ratio: ${analytics.lexicalDiversityRatio}).`,
      advancedVocabHits > 0
        ? `Incorporated ${advancedVocabHits} academic/C1 lexical item(s).`
        : 'Maintained relevant topic vocabulary.'
    ],
    improvements: [
      'Replace high-frequency adjectives ("good", "important", "big") with precise C1 collocations.',
      'Paraphrase words from the examiner prompt instead of repeating them verbatim.'
    ],
    evidenceQuotes: sampleQuotes
  };

  const grammarFeedback: CriterionFeedback = {
    band: grammarBand,
    criterionName: 'Grammatical Range & Accuracy',
    strengths: [
      complexGrammarHits > 0
        ? `Used ${complexGrammarHits} subordinate or relative clause structure(s).`
        : 'Constructed comprehensible declarative sentences.'
    ],
    improvements: [
      realGrammarObservations.length > 0
        ? `Review the ${realGrammarObservations.length} grammatical error(s) detected in your transcript below.`
        : 'Introduce a wider mix of conditional clauses, passive constructions, and relative clauses.'
    ],
    evidenceQuotes: sampleQuotes
  };

  const pronunciationFeedback: CriterionFeedback = hasRealAcousticMetrics
    ? {
        band: pronunciationBand,
        criterionName: 'Pronunciation',
        strengths: [
          `Measured speech intelligibility index: ${Math.round(measuredAvgClarity)}%.`
        ],
        improvements: [
          'Emphasize primary syllable stress on multisyllabic academic words.',
          'Maintain vocal projection through the final words of each sentence.'
        ],
        evidenceQuotes: sampleQuotes
      }
    : {
        band: null,
        criterionName: 'Pronunciation',
        strengths: [
          'Unassessed: acoustic audio telemetry was not available for this turn (transcript-only).'
        ],
        improvements: [
          'Acoustic audio evaluation is required to measure pronunciation, stress, and intonation directly.',
          'The partial index reflects the 3 observable criteria (Fluency, Lexical Resource, Grammar) only and is not a complete IELTS Speaking band.'
        ],
        evidenceQuotes: []
      };

  const summaryScoreText =
    overallBand !== null
      ? `Overall Band ${overallBand.toFixed(1)} (FC ${fluencyBand.toFixed(1)} · LR ${lexicalBand.toFixed(1)} · GRA ${grammarBand.toFixed(1)} · PR ${pronunciationBand !== null ? pronunciationBand.toFixed(1) : 'Unassessed'})`
      : `Partial Transcript Index (3/4 criteria) ${partialThreeCriterionIndex !== null ? partialThreeCriterionIndex.toFixed(1) : 'N/A'} (FC ${fluencyBand.toFixed(1)} · LR ${lexicalBand.toFixed(1)} · GRA ${grammarBand.toFixed(1)} · PR Unassessed — not a complete IELTS Speaking band)`;

  return {
    isValidAttempt: true,
    assessmentStatus: hasRealAcousticMetrics ? 'evaluated' : 'partial_transcript_only',
    evidenceMode: hasRealAcousticMetrics ? 'audio_and_transcript' : 'transcript_only',
    pronunciationObservable: hasRealAcousticMetrics,
    isPartialAssessment: !hasRealAcousticMetrics,
    unassessedCriteria: hasRealAcousticMetrics ? [] : ['Pronunciation'],
    wordCount: analytics.totalWordsSpoken,
    overallBand,
    partialThreeCriterionIndex,
    fluencyBand,
    lexicalBand,
    grammarBand,
    pronunciationBand,
    criteria: {
      fc: fluencyBand,
      lr: lexicalBand,
      gra: grammarBand,
      pr: pronunciationBand,
      fluency: fluencyFeedback,
      lexical: lexicalFeedback,
      grammar: grammarFeedback,
      pronunciation: pronunciationFeedback
    },
    keyStrengths: [
      ...fluencyFeedback.strengths,
      ...lexicalFeedback.strengths
    ].slice(0, 3),
    holdingYouBack: [
      ...fluencyFeedback.improvements.slice(0, 1),
      ...grammarFeedback.improvements.slice(0, 1),
      ...lexicalFeedback.improvements.slice(0, 1)
    ],
    topPriorities: [
      'Extend spoken responses with structured reasons and real-world examples.',
      'Eliminate subject-verb agreement and tense slips during spontaneous speech.',
      'Use C1 discourse markers to signpost transitions.'
    ],
    recommendedModules: [
      {
        moduleId: 'speaking',
        title: 'Part 2 & 3 Fluency & Discourse Drills',
        description: 'Practice structured 2-minute monologues and abstract follow-up questions.',
        actionRoute: 'speaking'
      },
      {
        moduleId: 'vocab',
        title: 'C1 Academic Collocations & Idioms',
        description: 'Upgrade everyday vocabulary to Band 8.0+ lexical precision.',
        actionRoute: 'vocab'
      }
    ],
    grammarObservations: realGrammarObservations,
    vocabUpgrades: [
      { regex: /\bvery important\b/i, original: 'very important', upgraded: 'of paramount importance / indispensable', reason: 'Demonstrates C1 lexical resource in Part 3 discussions.' },
      { regex: /\bmany people think\b/i, original: 'many people think', upgraded: 'a widespread consensus suggests', reason: 'Elevates informal generalizations into formal academic discourse.' },
      { regex: /\ba lot of\b/i, original: 'a lot of', upgraded: 'a substantial proportion of / a plethora of', reason: 'Replaces informal conversational quantifier with C1 academic register.' },
      { regex: /\bbig problem\b/i, original: 'big problem', upgraded: 'pressing conundrum / formidable challenge', reason: 'Replaces generic noun phrase with precise lexical expression.' },
      { regex: /\bgood idea\b/i, original: 'good idea', upgraded: 'viable proposition / judicious approach', reason: 'Elevates everyday conversational phrasing to Band 8+ standard.' },
      { regex: /\bvery (big|good|bad)\b/i, original: 'very big / good / bad', upgraded: 'substantial / commendable / detrimental', reason: 'Replaces basic modifier + adjective with a single C1 lexical item.' }
    ]
      .filter((u) => u.regex.test(combinedTranscript))
      .map((u) => ({ original: u.original, upgraded: u.upgraded, reason: u.reason })),
    overallSummary: `Assessed across ${analytics.totalWordsSpoken} spoken words (${analytics.averageWpm} WPM): ${summaryScoreText}.`
  };
}

/**
 * Evaluates a single candidate speaking turn immediately after they finish speaking.
 * Enforces the strict < 5 words input gate BEFORE making any API calls or scoring.
 */
export async function evaluateSingleSpeakingTurn(
  params: {
    questionId: string;
    questionText: string;
    part: SpeakingPart;
    topic: string;
    cueCardBulletPoints?: string[];
    transcript: string;
    durationSec: number;
    wordsPerMinute: number;
  },
  optionalBulletPoints?: string[]
): Promise<InstantSpeakingFeedback> {
  const {
    questionId,
    questionText,
    part,
    topic,
    transcript,
    durationSec,
    wordsPerMinute
  } = params;
  const cueCardBulletPoints = params.cueCardBulletPoints || optionalBulletPoints || [];

  // STRICT INPUT GATE: < 5 words returns immediate null unassessed state without calling API or fabricating scores
  const gate = checkSpeakingInputGate(transcript);
  if (!gate.isValidAttempt) {
    return {
      questionId,
      questionText,
      part,
      topic,
      candidateTranscript: (transcript || '').trim(),
      isValidAttempt: false,
      assessmentStatus: 'insufficient_evidence',
      evidenceMode: 'transcript_only',
      pronunciationObservable: false,
      isPartialAssessment: true,
      unassessedCriteria: [
        'Fluency & Coherence',
        'Lexical Resource',
        'Grammatical Range & Accuracy',
        'Pronunciation'
      ],
      wordCount: gate.wordCount,
      overallBand: null,
      partialThreeCriterionIndex: null,
      criteria: { fc: null, lr: null, gra: null, pr: null },
      feedbackTitle: gate.feedbackTitle,
      feedbackEn: gate.feedbackEn,
      feedbackBn: gate.feedbackBn,
      durationSec,
      wordsPerMinute: 0,
      estimatedBand: null,
      estimatedBands: {
        fluency: null,
        lexical: null,
        grammar: null,
        pronunciation: null,
        overall: null
      },
      grammaticalErrors: [],
      pronunciation: {
        clarityBand: null,
        cadenceWpm: 0,
        trickyWords: [],
        connectedSpeechTips: [],
        intonationPattern: 'No audible speech recorded.',
        rhythmVerdict: 'Insufficient speech sample to assess pronunciation.'
      },
      band8Answer: {
        bandScore: 8.5,
        modelAnswer: '',
        highlightedCollocations: [],
        keyDiscourseMarkers: [],
        examinerRationale: ''
      },
      actionableTips: [gate.feedbackEn, gate.feedbackBn]
    };
  }

  const buildUnavailableTurnFeedback = (
    title: string,
    reasonEn: string,
    reasonBn: string,
    opts?: { canRetry?: boolean; authRequired?: boolean; status?: 'unavailable' | 'insufficient_evidence' }
  ): InstantSpeakingFeedback => ({
    isValidAttempt: false,
    assessmentStatus: opts?.status || 'unavailable',
    evidenceMode: 'transcript_only',
    pronunciationObservable: false,
    isPartialAssessment: true,
    unassessedCriteria: [
      'Fluency & Coherence',
      'Lexical Resource',
      'Grammatical Range & Accuracy',
      'Pronunciation'
    ],
    canRetry: opts?.canRetry ?? true,
    authRequired: opts?.authRequired ?? false,
    error: reasonEn,
    wordCount: gate.wordCount,
    overallBand: null,
    partialThreeCriterionIndex: null,
    criteria: { fc: null, lr: null, gra: null, pr: null },
    feedbackTitle: title,
    feedbackEn: reasonEn,
    feedbackBn: reasonBn,
    questionId,
    questionText,
    part,
    topic,
    candidateTranscript: transcript.trim(),
    durationSec,
    wordsPerMinute,
    estimatedBand: null,
    estimatedBands: {
      fluency: null,
      lexical: null,
      grammar: null,
      pronunciation: null,
      overall: null
    },
    grammaticalErrors: [],
    pronunciation: {
      clarityBand: null,
      cadenceWpm: wordsPerMinute,
      trickyWords: [],
      connectedSpeechTips: [],
      intonationPattern: 'Unassessed — AI speaking evaluation unavailable.',
      rhythmVerdict: 'Assessment unavailable'
    },
    band8Answer: {
      bandScore: 8.5,
      modelAnswer: '',
      highlightedCollocations: [],
      keyDiscourseMarkers: [],
      examinerRationale: '',
      audioPromptText: ''
    },
    actionableTips: [reasonEn]
  });

  setBarnabyAnalyzing(true, 'Grading Speaking response against IELTS descriptors...');
  try {
    const token = getStoredSessionToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/evaluate-speaking-turn', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        questionId,
        question: questionText,
        part,
        topic,
        cueCardBulletPoints,
        transcript: transcript.trim(),
        durationSec,
        wordsPerMinute
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        return buildUnavailableTurnFeedback(
          'Sign In Required for AI Evaluation',
          errData?.error || 'Please sign in to evaluate your speaking response. No fallback score was generated.',
          'AI স্পিকিং মূল্যায়নের জন্য অনুগ্রহ করে সাইন ইন করুন। কোনো আনুমানিক স্কোর তৈরি করা হয়নি।',
          { canRetry: false, authRequired: true }
        );
      }
      if (response.status === 403) {
        return buildUnavailableTurnFeedback(
          'Evaluation Limit Reached',
          errData?.error || 'Active subscription or daily allowance required for AI speaking evaluation.',
          'AI স্পিকিং মূল্যায়নের দৈনিক সীমা পূর্ণ হয়েছে।',
          { canRetry: false, authRequired: false }
        );
      }
      return buildUnavailableTurnFeedback(
        'AI Assessment Temporarily Unavailable',
        errData?.error || `Speaking evaluation service returned status ${response.status}. No score was fabricated.`,
        'AI স্পিকিং মূল্যায়ন এই মুহূর্তে উপলব্ধ নয়। অনুগ্রহ করে পুনরায় চেষ্টা করুন।',
        { canRetry: true, authRequired: false }
      );
    }

    const data = await response.json();
    if (!data || data.isValidAttempt === false) {
      const status = data?.assessmentStatus === 'insufficient_evidence' ? 'insufficient_evidence' : 'unavailable';
      return buildUnavailableTurnFeedback(
        data?.feedbackTitle || (status === 'insufficient_evidence' ? 'Insufficient Speech Sample' : 'AI Assessment Unavailable'),
        data?.feedbackEn || data?.error || 'Speaking turn could not be assessed. No band score was generated.',
        data?.feedbackBn || 'এই উত্তরটি মূল্যায়ন করা যায়নি। অনুগ্রহ করে স্পষ্টভাবে পুনরায় বলুন।',
        { canRetry: status === 'unavailable', status }
      );
    }

    if (data.estimatedBands && typeof data.estimatedBands === 'object') {
      const fc = typeof data.criteria?.fc === 'number'
        ? data.criteria.fc
        : (typeof data.estimatedBands.fluency === 'number' ? data.estimatedBands.fluency : null);
      const lr = typeof data.criteria?.lr === 'number'
        ? data.criteria.lr
        : (typeof data.estimatedBands.lexical === 'number' ? data.estimatedBands.lexical : null);
      const gra = typeof data.criteria?.gra === 'number'
        ? data.criteria.gra
        : (typeof data.estimatedBands.grammar === 'number' ? data.estimatedBands.grammar : null);
      const pr = typeof data.criteria?.pr === 'number'
        ? data.criteria.pr
        : (typeof data.estimatedBands.pronunciation === 'number' ? data.estimatedBands.pronunciation : null);
      const pronunciationObservable = Boolean(data.pronunciationObservable) && pr !== null;
      const overallBand = pronunciationObservable && typeof data.overallBand === 'number'
        ? data.overallBand
        : (pronunciationObservable && typeof data.estimatedBands.overall === 'number' ? data.estimatedBands.overall : null);
      const partialThreeCriterionIndex = !pronunciationObservable
        ? (typeof data.partialThreeCriterionIndex === 'number'
          ? data.partialThreeCriterionIndex
          : (fc !== null && lr !== null && gra !== null ? roundOfficialIELTSBand((fc + lr + gra) / 3) : null))
        : null;

      return {
        ...data,
        isValidAttempt: true,
        assessmentStatus: data.assessmentStatus || (pronunciationObservable ? 'evaluated' : 'partial_transcript_only'),
        evidenceMode: data.evidenceMode || (pronunciationObservable ? 'audio_and_transcript' : 'transcript_only'),
        pronunciationObservable,
        isPartialAssessment: typeof data.isPartialAssessment === 'boolean' ? data.isPartialAssessment : !pronunciationObservable,
        unassessedCriteria: Array.isArray(data.unassessedCriteria)
          ? data.unassessedCriteria
          : (pronunciationObservable ? [] : ['Pronunciation']),
        questionId,
        questionText,
        part,
        topic,
        candidateTranscript: transcript.trim(),
        wordCount: typeof data.wordCount === 'number' ? data.wordCount : gate.wordCount,
        overallBand,
        partialThreeCriterionIndex,
        estimatedBand: overallBand,
        criteria: { fc, lr, gra, pr },
        estimatedBands: {
          fluency: fc,
          lexical: lr,
          grammar: gra,
          pronunciation: pr,
          overall: overallBand
        },
        pronunciation: {
          clarityBand: pr,
          cadenceWpm: data.pronunciation?.cadenceWpm ?? wordsPerMinute,
          trickyWords: Array.isArray(data.pronunciation?.trickyWords) ? data.pronunciation.trickyWords : [],
          connectedSpeechTips: Array.isArray(data.pronunciation?.connectedSpeechTips) ? data.pronunciation.connectedSpeechTips : [],
          intonationPattern: data.pronunciation?.intonationPattern || (pronunciationObservable ? 'Assessed from audio recording.' : 'Not observable from transcript-only input.'),
          rhythmVerdict: data.pronunciation?.rhythmVerdict || (pronunciationObservable ? 'Assessed from audio recording.' : 'Unassessed — audio recording analysis required for acoustic pronunciation scoring.')
        },
        durationSec,
        wordsPerMinute
      };
    }

    return buildUnavailableTurnFeedback(
      'AI Assessment Temporarily Unavailable',
      data?.error || 'AI speaking assessment returned an incomplete response. Please retry.',
      'AI স্পিকিং মূল্যায়ন এই মুহূর্তে উপলব্ধ নয়। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
      { canRetry: true }
    );
  } catch {
    // Do NOT silently fabricate an IELTS Band Score when the backend AI service fails
    return buildUnavailableTurnFeedback(
      'AI Assessment Unavailable',
      'Could not reach the AI speaking evaluation service. No fallback IELTS band score was fabricated — please sign in or retry.',
      'AI স্পিকিং মূল্যায়ন সার্ভারের সাথে সংযোগ করা যায়নি। কোনো আনুমানিক ভুয়া ব্যান্ড স্কোর তৈরি করা হয়নি — অনুগ্রহ করে পুনরায় চেষ্টা করুন।',
      { canRetry: true }
    );
  } finally {
    setBarnabyAnalyzing(false);
  }
}

/**
 * Deterministic Sprint linguistic evaluator for candidate transcripts (>= 5 words).
 * Strictly enforces the 5-word input gate and never injects fake grammar errors.
 */
export function generateDiagnosticTurnFeedback(
  questionIdOrRecord:
    | string
    | {
        questionId: string;
        questionText: string;
        part: SpeakingPart;
        topic: string;
        transcript: string;
        durationSec: number;
        wordsPerMinute: number;
      },
  questionTextArg?: string,
  partArg?: SpeakingPart,
  topicArg?: string,
  transcriptArg?: string,
  durationSecArg?: number,
  wordsPerMinuteArg?: number
): InstantSpeakingFeedback {
  const questionId: string =
    typeof questionIdOrRecord === 'string'
      ? questionIdOrRecord
      : questionIdOrRecord.questionId;
  const questionText: string =
    typeof questionIdOrRecord === 'string'
      ? questionTextArg || ''
      : questionIdOrRecord.questionText;
  const part: SpeakingPart =
    typeof questionIdOrRecord === 'string'
      ? partArg || 1
      : questionIdOrRecord.part;
  const topic: string =
    typeof questionIdOrRecord === 'string'
      ? topicArg || 'General'
      : questionIdOrRecord.topic;
  const transcript: string =
    typeof questionIdOrRecord === 'string'
      ? transcriptArg || ''
      : questionIdOrRecord.transcript;
  const durationSec: number =
    typeof questionIdOrRecord === 'string'
      ? durationSecArg || 15
      : questionIdOrRecord.durationSec;
  const wordsPerMinute: number =
    typeof questionIdOrRecord === 'string'
      ? wordsPerMinuteArg || 0
      : questionIdOrRecord.wordsPerMinute;

  const gate = checkSpeakingInputGate(transcript);
  if (!gate.isValidAttempt) {
    return {
      questionId,
      questionText,
      part,
      topic,
      candidateTranscript: (transcript || '').trim(),
      isValidAttempt: false,
      assessmentStatus: 'insufficient_evidence',
      evidenceMode: 'transcript_only',
      pronunciationObservable: false,
      isPartialAssessment: true,
      unassessedCriteria: [
        'Fluency & Coherence',
        'Lexical Resource',
        'Grammatical Range & Accuracy',
        'Pronunciation'
      ],
      wordCount: gate.wordCount,
      overallBand: null,
      partialThreeCriterionIndex: null,
      criteria: { fc: null, lr: null, gra: null, pr: null },
      feedbackTitle: gate.feedbackTitle,
      feedbackEn: gate.feedbackEn,
      feedbackBn: gate.feedbackBn,
      durationSec,
      wordsPerMinute: 0,
      estimatedBand: null,
      estimatedBands: {
        fluency: null,
        lexical: null,
        grammar: null,
        pronunciation: null,
        overall: null
      },
      grammaticalErrors: [],
      pronunciation: {
        clarityBand: null,
        cadenceWpm: 0,
        trickyWords: [],
        connectedSpeechTips: [],
        intonationPattern: 'No audible speech recorded.',
        rhythmVerdict: 'Insufficient speech sample to assess pronunciation.'
      },
      band8Answer: {
        bandScore: 8.5,
        modelAnswer: '',
        highlightedCollocations: [],
        keyDiscourseMarkers: [],
        examinerRationale: ''
      },
      actionableTips: [gate.feedbackEn, gate.feedbackBn]
    };
  }

  const cleanText = transcript.trim();
  const words = cleanText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lower = cleanText.toLowerCase();

  // 1. Detect REAL grammatical errors present in the candidate's transcript
  const grammaticalErrors: DetailedGrammarError[] = [];

  if (/\b(it|he|she|my brother|my sister|my friend)\s+(make|feel|sound|seem|give|take|help|cost|live|work|have)\b/i.test(lower)) {
    const match = cleanText.match(/\b(it|he|she|my brother|my sister|my friend)\s+(make|feel|sound|seem|give|take|help|cost|live|work|have)\b/i);
    const obs = match ? match[0] : 'he have';
    const parts = obs.split(/\s+/);
    const verb = parts[parts.length - 1].toLowerCase();
    const correctedVerb = verb === 'have' ? 'has' : `${verb}s`;
    grammaticalErrors.push({
      observed: obs,
      corrected: `${parts.slice(0, parts.length - 1).join(' ')} ${correctedVerb}`,
      explanation: `Third-person singular subjects require a singular verb ("${correctedVerb}") in the present simple tense.`,
      ruleCategory: 'Subject-Verb Agreement',
      severity: 'moderate'
    });
  }

  if (/\b(i\s+am\s+living|i\s+am\s+studying|i\s+am\s+working)\s+.*(since|for)\b/i.test(lower)) {
    grammaticalErrors.push({
      observed: 'I am living / working ... since/for',
      corrected: 'I have been living / working ... since/for',
      explanation: 'Use the Present Perfect Continuous ("have been + -ing") for actions that began in the past and continue up to the present.',
      ruleCategory: 'Tense & Aspect',
      severity: 'moderate'
    });
  }

  if (/\bdiscuss\s+about\b/i.test(lower)) {
    grammaticalErrors.push({
      observed: 'discuss about',
      corrected: 'discuss',
      explanation: 'The transitive verb "discuss" takes a direct object without the preposition "about".',
      ruleCategory: 'Prepositions',
      severity: 'minor'
    });
  }

  if (/\b(informations|advices|furnitures|equipments)\b/i.test(lower)) {
    const match = cleanText.match(/\b(informations|advices|furnitures|equipments)\b/i);
    const word = match ? match[0] : 'informations';
    grammaticalErrors.push({
      observed: word,
      corrected: word.replace(/s$/i, ''),
      explanation: `"${word.replace(/s$/i, '')}" is an uncountable noun in English and does not take a plural "-s".`,
      ruleCategory: 'Word Form & Plurality',
      severity: 'moderate'
    });
  }

  if (/\bpeople\s+is\b/i.test(lower)) {
    grammaticalErrors.push({
      observed: 'people is',
      corrected: 'people are',
      explanation: '"People" is a plural noun and requires the plural verb "are".',
      ruleCategory: 'Subject-Verb Agreement',
      severity: 'critical'
    });
  }

  // 2. Pronunciation analysis for words in transcript
  const pronunciationLexicon: Record<string, PronunciationWordTip> = {
    comfortable: {
      word: 'comfortable',
      ipa: '/ˈkʌmftəbl/',
      syllableStress: 'COM-ftuh-buhl (3 syllables)',
      tip: 'Drop the middle "-or-" syllable in natural British RP.'
    },
    particularly: {
      word: 'particularly',
      ipa: '/pəˈtɪkjələli/',
      syllableStress: 'puh-TIK-yuh-luh-lee',
      tip: 'Place primary stress on the second syllable "TIK".'
    },
    environment: {
      word: 'environment',
      ipa: '/ɪnˈvaɪrənmənt/',
      syllableStress: 'in-VAI-ruhn-muhnt',
      tip: 'Stress the diphthong /aɪ/ on the second syllable.'
    },
    development: {
      word: 'development',
      ipa: '/dɪˈveləpmənt/',
      syllableStress: 'di-VEL-uhp-muhnt',
      tip: 'Primary stress falls on "VEL", with weak schwa vowels in surrounding syllables.'
    },
    technology: {
      word: 'technology',
      ipa: '/tekˈnɒlədʒi/',
      syllableStress: 'tek-NOL-uh-jee',
      tip: 'Stress the second syllable "NOL" (/nɒl/), not the first syllable.'
    },
    opportunity: {
      word: 'opportunity',
      ipa: '/ˌɒpəˈtjuːnəti/',
      syllableStress: 'op-uh-TYOO-nuh-tee',
      tip: 'In British RP, pronounce "-tu-" with a clear /tjuː/ glide.'
    },
    difference: {
      word: 'difference',
      ipa: '/ˈdɪfrəns/',
      syllableStress: 'DIF-uhns (2 syllables)',
      tip: 'Elide the unstressed middle "-er-" vowel in natural British RP (/ˈdɪfrəns/).'
    },
    devices: {
      word: 'devices',
      ipa: '/dɪˈvaɪsɪz/',
      syllableStress: 'di-VAI-siz',
      tip: 'Place primary stress on the second syllable diphthong /aɪ/.'
    },
    upgraded: {
      word: 'upgraded',
      ipa: '/ʌpˈɡreɪdɪd/',
      syllableStress: 'up-GRAY-did',
      tip: 'Stress the root verb syllable "GRAY" and articulate the /-ɪd/ past suffix.'
    }
  };

  const trickyWords: PronunciationWordTip[] = [];
  for (const [key, val] of Object.entries(pronunciationLexicon)) {
    if (lower.includes(key)) {
      trickyWords.push(val);
    }
  }

  // 3. Band 8.5+ Model Answer reference
  let modelAnswer = '';
  let examinerRationale = '';
  const highlightedCollocations: Array<{
    phrase: string;
    bandLevel: 'C1' | 'C2' | 'Band 8.5' | 'Band 9.0';
    meaning: string;
  }> = [];

  if (part === 1) {
    modelAnswer = `To be perfectly frank, what appeals to me most about ${topic.toLowerCase()} is the remarkable sense of balance it brings to my daily routine. Having reliable amenities within arm's reach streamlines my schedule considerably, while still preserving a genuine sense of local community.`;
    examinerRationale = 'Directly answers the Part 1 prompt with idiomatic British openers, zero repetition of the question stem, and natural C1 collocations.';
    highlightedCollocations.push(
      { phrase: 'within arm\'s reach', bandLevel: 'Band 8.5', meaning: 'Very close and easily accessible.' },
      { phrase: 'streamlines my schedule', bandLevel: 'C1', meaning: 'Makes daily tasks much more efficient.' }
    );
  } else if (part === 2) {
    modelAnswer = `If memory serves me right, a particularly memorable experience regarding ${topic.toLowerCase()} took place a couple of years ago at a pivotal juncture in my studies. Initially, the sheer scale of the challenge felt somewhat daunting; however, by adopting a methodical approach, I managed to turn the situation around. Looking back, it was an immensely formative milestone.`;
    examinerRationale = 'Sustains a cohesive 2-minute narrative arc (past context -> turning point -> retrospective reflection) using C2 adverbial modifiers.';
    highlightedCollocations.push(
      { phrase: 'pivotal juncture', bandLevel: 'C2', meaning: 'A critical turning point.' },
      { phrase: 'immensely formative milestone', bandLevel: 'Band 9.0', meaning: 'An experience that deeply shaped personal growth.' }
    );
  } else {
    modelAnswer = `That is a multifaceted question that warrants careful consideration. On the one hand, widespread adoption has undeniably catalyzed economic efficiency. Having said that, policy makers must not overlook the broader societal ramifications—particularly the risk of widening socioeconomic disparities if left unregulated.`;
    examinerRationale = 'Demonstrates Band 9.0 Part 3 analytical depth by weighing competing societal perspectives using impersonal academic structures.';
    highlightedCollocations.push(
      { phrase: 'multifaceted question', bandLevel: 'C1', meaning: 'An issue with many complex dimensions.' },
      { phrase: 'societal ramifications', bandLevel: 'C2', meaning: 'Long-term consequences for society as a whole.' }
    );
  }

  // Non-scoring linguistic observation helper ONLY.
  // Never emits IELTS band estimates, pronunciation scores, overall bands, or score floors.
  return {
    questionId,
    questionText,
    part,
    topic,
    candidateTranscript: cleanText,
    isValidAttempt: false,
    assessmentStatus: 'unavailable',
    evidenceMode: 'transcript_only',
    pronunciationObservable: false,
    isPartialAssessment: true,
    unassessedCriteria: [
      'Fluency & Coherence',
      'Lexical Resource',
      'Grammatical Range & Accuracy',
      'Pronunciation'
    ],
    wordCount,
    overallBand: null,
    partialThreeCriterionIndex: null,
    criteria: {
      fc: null,
      lr: null,
      gra: null,
      pr: null
    },
    feedbackTitle: 'Linguistic Observations Only (No Band Score Assigned)',
    feedbackEn: 'Local transcript diagnostics identify observable grammar patterns and vocabulary references only; no IELTS band score is calculated offline.',
    feedbackBn: 'অফলাইন ডায়াগনস্টিক শুধুমাত্র ব্যাকরণগত পর্যবেক্ষণ দেখায়; কোনো IELTS ব্যান্ড স্কোর নির্ধারণ করা হয় না।',
    durationSec,
    wordsPerMinute: wordsPerMinute || 0,
    estimatedBand: null,
    estimatedBands: {
      fluency: null,
      lexical: null,
      grammar: null,
      pronunciation: null,
      overall: null
    },
    grammaticalErrors,
    pronunciation: {
      clarityBand: null,
      cadenceWpm: wordsPerMinute || 0,
      trickyWords,
      connectedSpeechTips: [
        'Link final consonant sounds smoothly into following vowel words (catenation).',
        'Use weak schwa (/ə/) forms on unstressed prepositions ("to", "of", "for") to maintain British stress-timed rhythm.'
      ],
      intonationPattern: 'Not observable from transcript-only input.',
      rhythmVerdict: 'Unassessed — audio recording analysis required for acoustic pronunciation scoring.'
    },
    pronunciationAnalysis: {
      clarityBand: null,
      cadenceWpm: wordsPerMinute || 0,
      trickyWords,
      problemWords: trickyWords.map((w) => ({
        word: w.word,
        phoneticIpa: w.ipa,
        stressedSyllable: w.syllableStress,
        advice: w.tip
      })),
      connectedSpeechTips: [
        'Link final consonant sounds smoothly into following vowel words (catenation).',
        'Use weak schwa (/ə/) forms on unstressed prepositions ("to", "of", "for") to maintain British stress-timed rhythm.'
      ],
      intonationPattern: 'Not observable from transcript-only input.',
      intonationGuidance: 'Not observable from transcript-only input.',
      rhythmVerdict: 'Unassessed — audio recording analysis required for acoustic pronunciation scoring.'
    },
    band8Answer: {
      bandScore: 8.5,
      modelAnswer,
      highlightedCollocations,
      keyDiscourseMarkers: ['To be perfectly frank', 'Having said that', 'On the one hand', 'Consequently'],
      examinerRationale,
      audioPromptText: modelAnswer
    },
    betterAnswer: {
      bandScore: 8.5,
      modelAnswer,
      modelResponse: modelAnswer,
      highlightedPhrases: highlightedCollocations.map((c) => c.phrase),
      highlightedCollocations,
      keyDiscourseMarkers: ['To be perfectly frank', 'Having said that', 'On the one hand', 'Consequently'],
      examinerRationale
    },
    actionableTips: [
      wordCount < 15
        ? 'Your response was brief. Expand your point with a concrete reason and a brief example.'
        : 'Pause briefly at clause boundaries instead of using vocal fillers.',
      'Sign in and run AI Evaluation to obtain an evidence-backed assessment.'
    ]
  };
}
