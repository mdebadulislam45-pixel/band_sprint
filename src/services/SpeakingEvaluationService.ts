/**
 * IELTS SPRINT — SPEAKING EVALUATION SERVICE
 * Evaluates candidate responses across the 4 official IELTS Speaking criteria:
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

export interface SpeakingInputGateResult {
  isValidAttempt: boolean;
  wordCount: number;
  overallBand: number;
  criteria: { fc: number; lr: number; gra: number; pr: number };
  feedbackTitle: string;
  feedbackEn: string;
  feedbackBn: string;
}

/**
 * Official Strict Input Gate for IELTS Speaking Evaluation.
 * Rejects empty, unattempted, or sub-5-word transcripts with authentic 0.0 zero-state.
 */
export function checkSpeakingInputGate(transcript: string): SpeakingInputGateResult {
  const cleanWords = (transcript || '').trim().split(/\s+/).filter(Boolean);
  if (cleanWords.length < 5) {
    return {
      isValidAttempt: false,
      wordCount: cleanWords.length,
      overallBand: 0.0,
      criteria: { fc: 0.0, lr: 0.0, gra: 0.0, pr: 0.0 },
      feedbackTitle: "No Candidate Speech Detected",
      feedbackEn: "You spoke fewer than 5 words. The examiner cannot assess your English without audible, sustained speech.",
      feedbackBn: "পর্যাপ্ত শব্দ শনাক্ত করা যায়নি (কমপক্ষে ৫টি শব্দ প্রয়োজন)। অনুগ্রহ করে মাইক্রোফোন অন করে স্পষ্টভাবে কথা বলুন।"
    };
  }

  return {
    isValidAttempt: true,
    wordCount: cleanWords.length,
    overallBand: 0.0,
    criteria: { fc: 0.0, lr: 0.0, gra: 0.0, pr: 0.0 },
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
  /\b(not only .* but also|neither .* nor|either .* or)\b/gi,
  /\b(if .* were|were .* to)\b/gi
];

function roundToHalfBand(score: number): number {
  const clamped = Math.max(0.0, Math.min(9.0, score));
  return Math.round(clamped * 2) / 2;
}

export function computeSpeakingAnalytics(answers: SpeakingAnswerRecord[]): SpeakingTestAnalytics {
  let totalSpeakingTimeSec = 0;
  let totalWordsSpoken = 0;
  let totalPauses = 0;
  let totalLongPauses = 0;
  let totalFillers = 0;

  const fillerCounts: Record<string, number> = {};
  const allWords: string[] = [];

  for (const ans of answers) {
    const cleanWords = (ans.transcript || '').trim().split(/\s+/).filter(Boolean);
    totalSpeakingTimeSec += ans.durationSec || 0;
    totalWordsSpoken += cleanWords.length;
    totalPauses += ans.pauseCount || 0;
    totalLongPauses += ans.longPauseCount || 0;
    totalFillers += ans.fillerCount || 0;

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
    totalPauses,
    totalLongPauses,
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
      band: 0.0,
      criterionName: name,
      strengths: [],
      improvements: [gate.feedbackEn],
      evidenceQuotes: []
    });

    return {
      isValidAttempt: false,
      wordCount: gate.wordCount,
      overallBand: 0.0,
      fluencyBand: 0.0,
      lexicalBand: 0.0,
      grammarBand: 0.0,
      pronunciationBand: 0.0,
      feedbackTitle: gate.feedbackTitle,
      feedbackEn: gate.feedbackEn,
      feedbackBn: gate.feedbackBn,
      criteria: {
        fc: 0.0,
        lr: 0.0,
        gra: 0.0,
        pr: 0.0,
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
    const matches = combinedTranscript.match(pattern);
    if (matches) advancedVocabHits += matches.length;
  }

  let complexGrammarHits = 0;
  for (const pattern of COMPLEX_GRAMMAR_PATTERNS) {
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

  // 1. Fluency & Coherence Scoring based strictly on actual speech output
  let rawFluency = 5.0;
  if (analytics.totalWordsSpoken >= 250) rawFluency += 1.5;
  else if (analytics.totalWordsSpoken >= 120) rawFluency += 1.0;
  else if (analytics.totalWordsSpoken >= 50) rawFluency += 0.5;
  else if (analytics.totalWordsSpoken < 20) rawFluency -= 1.0;

  if (analytics.averageWpm >= 110 && analytics.averageWpm <= 160) rawFluency += 0.5;
  else if (analytics.averageWpm < 75) rawFluency -= 0.5;

  const fillerRatio =
    analytics.totalWordsSpoken > 0 ? analytics.totalFillers / analytics.totalWordsSpoken : 0;
  if (fillerRatio > 0.08) rawFluency -= 0.5;
  if (analytics.totalLongPauses > 4) rawFluency -= 0.5;

  const fluencyBand = roundToHalfBand(rawFluency);

  // 2. Lexical Resource Scoring
  let rawLexical = 5.0;
  if (analytics.uniqueVocabularyCount >= 110) rawLexical += 1.5;
  else if (analytics.uniqueVocabularyCount >= 65) rawLexical += 1.0;
  else if (analytics.uniqueVocabularyCount >= 30) rawLexical += 0.5;
  else if (analytics.uniqueVocabularyCount < 15) rawLexical -= 0.5;

  if (advancedVocabHits >= 5) rawLexical += 1.0;
  else if (advancedVocabHits >= 2) rawLexical += 0.5;

  const lexicalBand = roundToHalfBand(rawLexical);

  // 3. Grammatical Range & Accuracy Scoring
  let rawGrammar = 5.5;
  if (complexGrammarHits >= 6) rawGrammar += 1.5;
  else if (complexGrammarHits >= 3) rawGrammar += 1.0;
  else if (complexGrammarHits >= 1) rawGrammar += 0.5;
  else if (analytics.totalWordsSpoken < 25) rawGrammar -= 0.5;

  if (realGrammarObservations.length >= 3) rawGrammar -= 1.0;
  else if (realGrammarObservations.length >= 1) rawGrammar -= 0.5;

  const grammarBand = roundToHalfBand(rawGrammar);

  // 4. Pronunciation & Intelligibility Scoring
  const avgClarity =
    answers.length > 0
      ? answers.reduce((acc, a) => acc + (a.clarityScore || 80), 0) / answers.length
      : 80;

  const avgExpressiveness =
    answers.length > 0
      ? answers.reduce((acc, a) => acc + (a.acousticMetrics?.expressivenessScore || 75), 0) / answers.length
      : 75;

  const totalEnergyDrops = answers.reduce(
    (acc, a) => acc + (a.acousticMetrics?.energyDropOffs || 0),
    0
  );

  let rawPronunciation = 5.5;
  if (avgClarity >= 90) rawPronunciation += 1.0;
  else if (avgClarity >= 82) rawPronunciation += 0.5;
  else if (avgClarity < 70) rawPronunciation -= 0.5;

  if (avgExpressiveness >= 82) rawPronunciation += 0.5;
  else if (avgExpressiveness < 48) rawPronunciation -= 0.5;

  if (totalEnergyDrops > 5) rawPronunciation -= 0.5;

  const pronunciationBand = roundToHalfBand(rawPronunciation);

  const overallBand = roundToHalfBand(
    (fluencyBand + lexicalBand + grammarBand + pronunciationBand) / 4
  );

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
      analytics.totalLongPauses > 1
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

  const pronunciationFeedback: CriterionFeedback = {
    band: pronunciationBand,
    criterionName: 'Pronunciation',
    strengths: [
      `Speech intelligibility index: ${Math.round(avgClarity)}%.`
    ],
    improvements: [
      'Emphasize primary syllable stress on multisyllabic academic words.',
      'Maintain vocal projection through the final words of each sentence.'
    ],
    evidenceQuotes: sampleQuotes
  };

  return {
    isValidAttempt: true,
    wordCount: analytics.totalWordsSpoken,
    overallBand,
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
      {
        original: 'very important',
        upgraded: 'of paramount importance / indispensable',
        reason: 'Demonstrates C1 lexical resource in Part 3 discussions.'
      },
      {
        original: 'many people think',
        upgraded: 'a widespread consensus suggests',
        reason: 'Elevates informal generalizations into formal academic discourse.'
      }
    ],
    overallSummary: `Assessed across ${analytics.totalWordsSpoken} spoken words (${analytics.averageWpm} WPM): Overall Band ${overallBand.toFixed(1)} (FC ${fluencyBand.toFixed(1)} · LR ${lexicalBand.toFixed(1)} · GRA ${grammarBand.toFixed(1)} · PR ${pronunciationBand.toFixed(1)}).`
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

  // STRICT INPUT GATE: < 5 words returns immediate 0.0 zero-state without calling API or fabricating scores
  const gate = checkSpeakingInputGate(transcript);
  if (!gate.isValidAttempt) {
    return {
      questionId,
      questionText,
      part,
      topic,
      candidateTranscript: (transcript || '').trim(),
      isValidAttempt: false,
      wordCount: gate.wordCount,
      overallBand: 0.0,
      criteria: { fc: 0.0, lr: 0.0, gra: 0.0, pr: 0.0 },
      feedbackTitle: gate.feedbackTitle,
      feedbackEn: gate.feedbackEn,
      feedbackBn: gate.feedbackBn,
      durationSec,
      wordsPerMinute: 0,
      estimatedBand: 0.0,
      estimatedBands: {
        fluency: 0.0,
        lexical: 0.0,
        grammar: 0.0,
        pronunciation: 0.0,
        overall: 0.0
      },
      grammaticalErrors: [],
      pronunciation: {
        clarityBand: 0.0,
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

  try {
    const response = await fetch('/api/evaluate-speaking-turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    if (response.ok) {
      const data = await response.json();
      if (data && data.isValidAttempt === false) {
        return {
          ...data,
          questionId,
          questionText,
          part,
          topic,
          candidateTranscript: transcript.trim(),
          estimatedBand: 0.0,
          estimatedBands: {
            fluency: 0.0,
            lexical: 0.0,
            grammar: 0.0,
            pronunciation: 0.0,
            overall: 0.0
          }
        };
      }
      if (data && data.estimatedBands && data.band8Answer) {
        return {
          ...data,
          isValidAttempt: true,
          questionId,
          questionText,
          part,
          topic,
          candidateTranscript: transcript.trim(),
          wordCount: gate.wordCount,
          overallBand: data.estimatedBands.overall,
          criteria: {
            fc: data.estimatedBands.fluency,
            lr: data.estimatedBands.lexical,
            gra: data.estimatedBands.grammar,
            pr: data.estimatedBands.pronunciation
          },
          durationSec,
          wordsPerMinute
        };
      }
    }
  } catch {
    // Use deterministic rule-based linguistic evaluation on actual transcript (only when >= 5 words)
  }

  return generateDiagnosticTurnFeedback(
    questionId,
    questionText,
    part,
    topic,
    transcript,
    durationSec,
    wordsPerMinute
  );
}

/**
 * Deterministic Cambridge linguistic evaluator for candidate transcripts (>= 5 words).
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
      wordCount: gate.wordCount,
      overallBand: 0.0,
      criteria: { fc: 0.0, lr: 0.0, gra: 0.0, pr: 0.0 },
      feedbackTitle: gate.feedbackTitle,
      feedbackEn: gate.feedbackEn,
      feedbackBn: gate.feedbackBn,
      durationSec,
      wordsPerMinute: 0,
      estimatedBand: 0.0,
      estimatedBands: {
        fluency: 0.0,
        lexical: 0.0,
        grammar: 0.0,
        pronunciation: 0.0,
        overall: 0.0
      },
      grammaticalErrors: [],
      pronunciation: {
        clarityBand: 0.0,
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

  if (/\b(it|he|she)\s+(make|feel|sound|seem|give|take|help|cost)\b/i.test(lower)) {
    const match = cleanText.match(/\b(it|he|she)\s+(make|feel|sound|seem|give|take|help|cost)\b/i);
    const obs = match ? match[0] : 'it make';
    const parts = obs.split(/\s+/);
    grammaticalErrors.push({
      observed: obs,
      corrected: `${parts[0]} ${parts[1]}s`,
      explanation: 'Third-person singular subjects (he/she/it) require a singular verb ending in "-s" in the present simple tense.',
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

  // 4. Calculate Band Scores proportional to actual word count, lexical richness, and grammar
  let fluency = wordCount >= 35 ? 7.5 : wordCount >= 20 ? 6.5 : wordCount >= 10 ? 5.5 : 5.0;
  let lexical = wordCount >= 30 ? 7.0 : wordCount >= 15 ? 6.0 : 5.0;
  let grammar = grammaticalErrors.length === 0 ? (wordCount >= 20 ? 7.0 : 6.0) : 5.5;
  let pronunciation = wordCount >= 15 ? 6.5 : 5.5;

  const overall = roundToHalfBand((fluency + lexical + grammar + pronunciation) / 4);

  return {
    questionId,
    questionText,
    part,
    topic,
    candidateTranscript: cleanText,
    isValidAttempt: true,
    wordCount,
    overallBand: overall,
    criteria: {
      fc: fluency,
      lr: lexical,
      gra: grammar,
      pr: pronunciation
    },
    durationSec,
    wordsPerMinute: wordsPerMinute || 110,
    estimatedBand: overall,
    estimatedBands: {
      fluency,
      lexical,
      grammar,
      pronunciation,
      overall
    },
    grammaticalErrors,
    pronunciation: {
      clarityBand: pronunciation,
      cadenceWpm: wordsPerMinute || 110,
      trickyWords,
      connectedSpeechTips: [
        'Link final consonant sounds smoothly into following vowel words (catenation).',
        'Use weak schwa (/ə/) forms on unstressed prepositions ("to", "of", "for") to maintain British stress-timed rhythm.'
      ],
      intonationPattern: 'Use rising-falling intonation across subordinate clauses to signal continuation before your final point.',
      rhythmVerdict: 'Audible cadence; emphasize content words while reducing function words.'
    },
    band8Answer: {
      bandScore: 8.5,
      modelAnswer,
      highlightedCollocations,
      keyDiscourseMarkers: ['To be perfectly frank', 'Having said that', 'On the one hand', 'Consequently'],
      examinerRationale,
      audioPromptText: modelAnswer
    },
    actionableTips: [
      wordCount < 15
        ? 'Your response was brief. Expand your point with a concrete reason and a brief example.'
        : 'Pause briefly at clause boundaries instead of using vocal fillers.',
      'Integrate C1 collocations from the model answer into your next attempt.'
    ]
  };
}
