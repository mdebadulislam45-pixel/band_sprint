/**
 * IELTS SPRINT — WRITING EVALUATION SERVICE
 * AI-powered IELTS Psychometric Evaluation Engine for Academic & General Training Writing.
 *
 * Enforces the Strict Minimum Word Threshold Guard:
 * - Task 1 Minimum: 30 words
 * - Task 2 Minimum: 50 words
 *
 * If a candidate submits an empty, trivial, or gibberish draft under these thresholds:
 * - Does NOT generate 4-criteria scores (TA/TR, CC, LR, GRA) or Band 6.5/7.0 summaries.
 * - Returns overallBand: 0.0 with explicit English and Bangla guidance.
 */

import {
  analyzeTextQualitySignals,
  roundOfficialIELTSBand
} from '../utils/scoringIntegrity';

export interface WritingThresholdGateResult {
  isValidAttempt: boolean;
  assessmentStatus: 'eligible' | 'insufficient_evidence';
  wordCount: number;
  minRequiredWords: number;
  overallBand: number | null;
  criteria: {
    ta: number | null;
    cc: number | null;
    lr: number | null;
    gra: number | null;
  };
  feedbackTitle: string;
  feedbackEn: string;
  feedbackBn: string;
}

export interface WritingInlineDiagnostic {
  id: string;
  type: 'error' | 'warning' | 'upgrade';
  phrase: string;
  suggestion: string;
  criterion: 'TA' | 'CC' | 'LR' | 'GRA';
  explanation: string;
  banglaExplanation?: string;
}

export interface WritingEvaluationReport {
  isValidAttempt: boolean;
  taskType: 'task1' | 'task2';
  wordCount: number;
  minRequiredWords: number;
  targetWords: number;
  overallBand: number;
  proficiencyTitle: string;
  taScore: number;
  ccScore: number;
  lrScore: number;
  graScore: number;
  feedbackTitle: string;
  feedbackEn: string;
  feedbackBn: string;
  annotations: WritingInlineDiagnostic[];
  lexicalUpgrades: Array<{
    from: string;
    to: string;
    context: string;
    banglaMeaning: string;
  }>;
  examinerSummary: string;
  banglaSummary: string;
}

/**
 * Checks whether a draft meets the minimum word count and non-gibberish requirements
 * for IELTS Writing evaluation (Task 1 >= 30 words, Task 2 >= 50 words).
 */
export function checkWritingWordThreshold(
  text: string,
  taskType: 'task1' | 'task2' = 'task2'
): WritingThresholdGateResult {
  const cleanWords = (text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const wordCount = cleanWords.length;
  const minRequiredWords = taskType === 'task1' ? 30 : 50;

  // Check for gibberish or single-word repetition (e.g., "test test test..." or random keyboard mash)
  const alphaWords = cleanWords.filter((w) => /[a-zA-Z]{2,}/.test(w));
  const uniqueLower = new Set(alphaWords.map((w) => w.toLowerCase()));
  const isGibberish =
    wordCount > 0 && (alphaWords.length < Math.min(5, wordCount * 0.5) || uniqueLower.size < 4);

  if (wordCount < minRequiredWords || isGibberish) {
    return {
      isValidAttempt: false,
      assessmentStatus: 'insufficient_evidence',
      wordCount,
      minRequiredWords,
      overallBand: null,
      criteria: { ta: null, cc: null, lr: null, gra: null },
      feedbackTitle: isGibberish && wordCount >= minRequiredWords
        ? 'Unassessable / Repetitive Draft Detected'
        : 'Submission Too Short for Assessment',
      feedbackEn: `Submission Too Short for Assessment (${wordCount} words written; minimum ${minRequiredWords} words required). Academic essays require sustained argument development to evaluate.`,
      feedbackBn: 'প্রয়োজনীয় ন্যূনতম শব্দসংখ্যা পূরণ হয়নি। মূল্যায়ন পেতে পর্যাপ্ত বাক্য লিখুন।'
    };
  }

  return {
    isValidAttempt: true,
    assessmentStatus: 'eligible',
    wordCount,
    minRequiredWords,
    overallBand: null,
    criteria: { ta: null, cc: null, lr: null, gra: null },
    feedbackTitle: 'Valid Writing Submission',
    feedbackEn: '',
    feedbackBn: ''
  };
}

/**
 * Evaluates a candidate's Task 1 or Task 2 response strictly based on their actual text.
 * Never fabricates Band 6.5/7.0 scores for short, empty, or gibberish drafts.
 */
export function evaluateWritingSubmission(
  text: string,
  taskType: 'task1' | 'task2' = 'task2'
): WritingEvaluationReport {
  const gate = checkWritingWordThreshold(text, taskType);
  const targetWords = taskType === 'task1' ? 150 : 250;

  if (!gate.isValidAttempt) {
    return {
      isValidAttempt: false,
      taskType,
      wordCount: gate.wordCount,
      minRequiredWords: gate.minRequiredWords,
      targetWords,
      overallBand: 0.0,
      proficiencyTitle: 'Not Assessed (Below Minimum Word Threshold)',
      taScore: 0.0,
      ccScore: 0.0,
      lrScore: 0.0,
      graScore: 0.0,
      feedbackTitle: gate.feedbackTitle,
      feedbackEn: gate.feedbackEn,
      feedbackBn: gate.feedbackBn,
      annotations: [],
      lexicalUpgrades: [],
      examinerSummary: gate.feedbackEn,
      banglaSummary: gate.feedbackBn
    };
  }

  const cleanText = text.trim();
  const lower = cleanText.toLowerCase();
  const wordCount = gate.wordCount;
  const paragraphs = cleanText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  const annotations: WritingInlineDiagnostic[] = [];

  // Check real grammatical & lexical patterns in the candidate's actual text
  if (/\ba lot of\b/i.test(cleanText)) {
    const match = cleanText.match(/\ba lot of\b/i)?.[0] || 'a lot of';
    annotations.push({
      id: 'diag_lot_of',
      type: 'upgrade',
      phrase: match,
      suggestion: 'a substantial proportion of / a considerable number of',
      criterion: 'LR',
      explanation: 'Informal quantifier. Academic writing requires formal quantification.',
      banglaExplanation: '"a lot of" একটি অনানুষ্ঠানিক ফ্রেজ। এর পরিবর্তে "a substantial proportion of" ব্যবহার করুন।'
    });
  }

  if (/\bvery (big|good|bad|important|high|low)\b/i.test(cleanText)) {
    const match = cleanText.match(/\bvery (big|good|bad|important|high|low)\b/i)?.[0] || 'very important';
    annotations.push({
      id: 'diag_very_adj',
      type: 'upgrade',
      phrase: match,
      suggestion: 'paramount / substantial / detrimental / pronounced',
      criterion: 'LR',
      explanation: 'Avoid "very + basic adjective". Replace with a single high-precision C1 adjective.',
      banglaExplanation: '"very + সাধারণ বিশেষণ" পরিহার করে সুনির্দিষ্ট C1 শব্দ ব্যবহার করলে Lexical Resource স্কোর বাড়ে।'
    });
  }

  if (/\b(people|governments|companies|universities) is\b/i.test(cleanText)) {
    const match = cleanText.match(/\b(people|governments|companies|universities) is\b/i)?.[0] || 'people is';
    annotations.push({
      id: 'diag_sv_plural',
      type: 'error',
      phrase: match,
      suggestion: match.replace(/\bis\b/i, 'are'),
      criterion: 'GRA',
      explanation: 'Subject-verb agreement error: plural subjects require the plural auxiliary "are".',
      banglaExplanation: 'বহুবচন কর্তার (Plural Subject) সাথে বহুবচন ক্রিয়া ("are") ব্যবহার করা আবশ্যক।'
    });
  }

  if (/\bthere is many\b/i.test(cleanText)) {
    const match = cleanText.match(/\bthere is many\b/i)?.[0] || 'there is many';
    annotations.push({
      id: 'diag_there_is_many',
      type: 'error',
      phrase: match,
      suggestion: 'there are numerous',
      criterion: 'GRA',
      explanation: 'Existential "there are" is required before plural count nouns.',
      banglaExplanation: 'বহুবচন বিশেষ্যের আগে "there are" বসে, "there is" নয়।'
    });
  }

  if (/\b(informations|advices|furnitures|equipments|researches)\b/i.test(cleanText)) {
    const match = cleanText.match(/\b(informations|advices|furnitures|equipments|researches)\b/i)?.[0] || 'informations';
    annotations.push({
      id: 'diag_uncountable',
      type: 'error',
      phrase: match,
      suggestion: match.replace(/s$/i, ''),
      criterion: 'GRA',
      explanation: `"${match.replace(/s$/i, '')}" is an uncountable noun in academic English and cannot take a plural "-s".`,
      banglaExplanation: `ইংরেজিতে "${match.replace(/s$/i, '')}" একটি Uncountable Noun; এর সাথে 's' যোগ করে বহুবচন করা যায় না।`
    });
  }

  if (/\bin conclusion\b/i.test(cleanText) && taskType === 'task1') {
    const match = cleanText.match(/\bin conclusion\b/i)?.[0] || 'In conclusion';
    annotations.push({
      id: 'diag_t1_conclusion',
      type: 'warning',
      phrase: match,
      suggestion: 'Overall, it is evident that',
      criterion: 'CC',
      explanation: 'Task 1 requires an objective Overview ("Overall,"), whereas "In conclusion" belongs to Task 2 essays.',
      banglaExplanation: 'Writing Task 1-এ ব্যক্তিগত মতামত বা "In conclusion" এর বদলে "Overall, it is evident that..." দিয়ে সারসংক্ষেপ লিখতে হয়।'
    });
  }

  // Cohesive linkers check
  const linkers = [
    'overall',
    'furthermore',
    'moreover',
    'consequently',
    'however',
    'nevertheless',
    'in contrast',
    'conversely',
    'whereas',
    'while',
    'although',
    'in conclusion',
    'for instance',
    'specifically'
  ];
  const linkerMatches = linkers.filter((l) => lower.includes(l)).length;

  // Academic vocabulary check
  const academicLexicon = [
    'proportion',
    'trajectory',
    'substantial',
    'significant',
    'predominantly',
    'consequently',
    'mitigate',
    'infrastructure',
    'socioeconomic',
    'paradigm',
    'detrimental',
    'indispensable',
    'proliferation',
    'equilibrium',
    'disparity',
    'substantiate',
    'contemporary',
    'empirical'
  ];
  const academicHits = academicLexicon.filter((w) => lower.includes(w)).length;

  const signals = analyzeTextQualitySignals(cleanText);
  const roundHalf = (n: number) => roundOfficialIELTSBand(Math.max(1.0, Math.min(9.0, n)));

  // Calculate 4 criteria strictly from length, lexical diversity, repetition integrity, paragraphing, and grammar accuracy
  const lengthRatio = Math.min(1.15, wordCount / targetWords);
  let rawTa = 4.5 + (lengthRatio >= 1.0 ? 1.5 : lengthRatio >= 0.75 ? 0.5 : lengthRatio >= 0.5 ? -0.5 : -1.5);
  if (taskType === 'task1' && /\boverall\b/i.test(cleanText)) rawTa += 0.5;
  if (taskType === 'task2' && paragraphs.length >= 4) rawTa += 0.5;
  if (signals.lexicalDiversityRatio >= 0.48 && wordCount >= targetWords) rawTa += 0.5;
  if (signals.isHighlyRepetitive || signals.repeatedSentenceRatio >= 0.35) rawTa -= 2.5;
  else if (signals.repeatedBigramRatio >= 0.35) rawTa -= 1.5;
  if (signals.memorizedTemplateHits.length > 0) rawTa -= 1.0;

  let rawCc = 4.0 + Math.min(1.5, paragraphs.length * 0.4) + Math.min(1.0, linkerMatches * 0.25);
  if (wordCount < targetWords * 0.7) rawCc -= 0.5;
  if (wordCount < targetWords * 0.45) rawCc -= 1.0;
  if (signals.isHighlyRepetitive || signals.repeatedSentenceRatio >= 0.35) rawCc -= 2.0;

  let rawLr = 4.5 + Math.min(2.0, academicHits * 0.35);
  if (signals.lexicalDiversityRatio >= 0.52 && wordCount >= 100) rawLr += 1.0;
  else if (signals.lexicalDiversityRatio >= 0.42 && wordCount >= 100) rawLr += 0.5;
  else if (signals.lexicalDiversityRatio < 0.3) rawLr -= 1.5;
  if (wordCount < targetWords * 0.6) rawLr -= 0.5;
  if (signals.isHighlyRepetitive) rawLr -= 1.5;
  if (signals.memorizedTemplateHits.length > 0) rawLr -= 0.5;

  const errorCount = annotations.filter((a) => a.type === 'error').length;
  const complexClauseMatches = (
    cleanText.match(/\b(although|whereas|while|which|whose|despite|provided that|unless|because)\b/gi) || []
  ).length;
  let rawGra = 5.0 - errorCount * 0.5 + Math.min(1.5, complexClauseMatches * 0.35);
  if (wordCount < targetWords * 0.6) rawGra -= 0.5;
  if (signals.isHighlyRepetitive || signals.repeatedSentenceRatio >= 0.35) rawGra -= 2.0;

  if (signals.isHighlyRepetitive || signals.repeatedSentenceRatio >= 0.5) {
    rawTa = Math.min(rawTa, 3.5);
    rawCc = Math.min(rawCc, 3.5);
    rawLr = Math.min(rawLr, 3.5);
    rawGra = Math.min(rawGra, 3.5);
  }

  const taScore = roundHalf(rawTa);
  const ccScore = roundHalf(rawCc);
  const lrScore = roundHalf(rawLr);
  const graScore = roundHalf(rawGra);
  const overallBand = roundOfficialIELTSBand((taScore + ccScore + lrScore + graScore) / 4);

  const proficiencyTitle =
    overallBand >= 8.0
      ? 'Very Good User (C1/C2 Academic)'
      : overallBand >= 7.0
      ? 'Good User (C1 Operational Command)'
      : overallBand >= 6.0
      ? 'Competent User (B2 Effective Command)'
      : overallBand >= 5.0
      ? 'Modest User (Developing Academic Control)'
      : overallBand >= 4.0
      ? 'Limited User (Foundational Control)'
      : 'Extremely Limited / Developing User';

  const underTargetNote =
    wordCount < targetWords
      ? ` Note: Your response is ${wordCount} words, which is below the recommended ${targetWords}-word target for ${taskType.toUpperCase()}.`
      : ` You met the recommended ${targetWords}-word length requirement (${wordCount} words written).`;

  const repetitionNote = signals.isHighlyRepetitive
    ? ' High repetition / low lexical diversity detected; scores are capped accordingly.'
    : '';

  // Evidence-based lexical upgrades strictly matched against actual candidate phrasing
  const dynamicLexicalUpgrades: WritingEvaluationReport['lexicalUpgrades'] = [];
  if (/\b(big|huge|large) (change|increase|growth|rise)\b/i.test(cleanText)) {
    const m = cleanText.match(/\b(big|huge|large) (change|increase|growth|rise)\b/i)?.[0] || 'big increase';
    dynamicLexicalUpgrades.push({
      from: m,
      to: 'pronounced upward trajectory',
      context: 'Detected in your draft — Academic Data & Trend Synthesis',
      banglaMeaning: 'সুস্পষ্ট ঊর্ধ্বমুখী প্রবণতা'
    });
  }
  if (/\bvery (important|big|good|bad)\b/i.test(cleanText)) {
    const m = cleanText.match(/\bvery (important|big|good|bad)\b/i)?.[0] || 'very important';
    dynamicLexicalUpgrades.push({
      from: m,
      to: 'of paramount importance / substantial / detrimental',
      context: 'Detected in your draft — Discursive Precision',
      banglaMeaning: 'অত্যন্ত গুরুত্বপূর্ণ / সুনির্দিষ্ট বিশেষণ'
    });
  }
  if (/\ba lot of\b/i.test(cleanText)) {
    dynamicLexicalUpgrades.push({
      from: 'a lot of',
      to: 'a substantial proportion of / a considerable number of',
      context: 'Detected in your draft — Formal Academic Quantification',
      banglaMeaning: 'উল্লেখযোগ্য অংশ / পরিমাণ'
    });
  }
  if (/\bbad (effects|results|impacts|outcomes)\b/i.test(cleanText)) {
    const m = cleanText.match(/\bbad (effects|results|impacts|outcomes)\b/i)?.[0] || 'bad results';
    dynamicLexicalUpgrades.push({
      from: m,
      to: 'detrimental ramifications / adverse outcomes',
      context: 'Detected in your draft — Cause & Effect Precision',
      banglaMeaning: 'নেতিবাচক দীর্ঘমেয়াদী ফলাফল'
    });
  }

  return {
    isValidAttempt: true,
    taskType,
    wordCount,
    minRequiredWords: gate.minRequiredWords,
    targetWords,
    overallBand,
    proficiencyTitle,
    taScore,
    ccScore,
    lrScore,
    graScore,
    feedbackTitle: `Sprint ${taskType === 'task1' ? 'Task 1' : 'Task 2'} Heuristic Diagnostic Report`,
    feedbackEn: `Evaluated ${wordCount} words across 4 IELTS criteria.${underTargetNote}${repetitionNote}`,
    feedbackBn: `আপনার ${wordCount} শব্দের লেখাটি IELTS-এর ৪টি মানদণ্ডে (TA/TR, CC, LR, GRA) মূল্যায়ন করা হয়েছে।`,
    annotations,
    lexicalUpgrades: dynamicLexicalUpgrades,
    examinerSummary: `Your ${taskType === 'task1' ? 'Task 1 report' : 'Task 2 essay'} (${wordCount} words) received a heuristic diagnostic estimate of Band ${overallBand.toFixed(1)}.${underTargetNote}${repetitionNote}`,
    banglaSummary: `আপনার ${wordCount} শব্দের ড্রাফটটি বিশ্লেষণ করে সম্ভাব্য Band ${overallBand.toFixed(1)} নির্ধারণ করা হয়েছে। ${
      wordCount < targetWords
        ? `পূর্ণ স্কোর পেতে কমপক্ষে ${targetWords} শব্দ লেখার চেষ্টা করুন।`
        : signals.isHighlyRepetitive
        ? 'একই বাক্য বা শব্দ পুনরাবৃত্তি না করে বৈচিত্র্যময় একাডেমিক শব্দ ব্যবহার করুন।'
        : 'শব্দসংখ্যা এবং প্যারাগ্রাফ কাঠামো যথাযথ রয়েছে।'
    }`
  };
}

// ============================================================================
// OPTION A: OFFLINE WRITING STRUCTURAL PRE-CHECK (STRICTLY NON-SCORING)
// ============================================================================

export interface WritingStructuralChecklistItem {
  id: string;
  label: string;
  status: 'pass' | 'warn';
  detail: string;
}

export interface WritingStructuralPrecheckResult {
  isScoringAssessment: false;
  assessmentStatus: 'precheck_ready' | 'insufficient_evidence';
  isValidAttempt: boolean;
  /** Always null — offline structural pre-checks NEVER generate or imply an IELTS band score. */
  overallBand: null;
  taskType: 'task1' | 'task2';
  wordCount: number;
  minRequiredWords: number;
  targetWords: number;
  meetsTargetWordCount: boolean;
  wordsRemainingToTarget: number;
  paragraphCount: number;
  sentenceCount: number;
  lexicalDiversityPct: number;
  cohesiveMarkerCount: number;
  detectedCohesiveMarkers: string[];
  isHighlyRepetitive: boolean;
  memorizedTemplateHits: string[];
  checklist: WritingStructuralChecklistItem[];
  grammarAlerts: WritingInlineDiagnostic[];
  lexicalSuggestions: Array<{
    from: string;
    to: string;
    context: string;
    banglaMeaning: string;
  }>;
  feedbackTitle: string;
  feedbackEn: string;
  feedbackBn: string;
  nonScoringNotice: string;
}

const PRECHECK_COHESIVE_MARKERS = [
  'overall',
  'furthermore',
  'moreover',
  'consequently',
  'however',
  'nevertheless',
  'in contrast',
  'conversely',
  'whereas',
  'while',
  'although',
  'in conclusion',
  'for instance',
  'specifically',
  'therefore',
  'on the other hand'
];

/**
 * Option A Offline Structural Pre-Check:
 * Inspects word count, paragraphing, repetition, memorized clichés, discourse markers,
 * and observable grammar/register patterns strictly from the candidate's actual text.
 * NEVER computes, returns, or implies an IELTS band score (overallBand is always null).
 */
export function runOfflineWritingStructuralPrecheck(
  text: string,
  taskType: 'task1' | 'task2' = 'task2'
): WritingStructuralPrecheckResult {
  const gate = checkWritingWordThreshold(text, taskType);
  const targetWords = taskType === 'task1' ? 150 : 250;
  const nonScoringNotice =
    'Offline Structural Pre-Check Only — Not an IELTS Band Score or Official Assessment. Open the Full Writing Studio to run a live 4-criterion AI evaluation.';

  if (!gate.isValidAttempt) {
    return {
      isScoringAssessment: false,
      assessmentStatus: 'insufficient_evidence',
      isValidAttempt: false,
      overallBand: null,
      taskType,
      wordCount: gate.wordCount,
      minRequiredWords: gate.minRequiredWords,
      targetWords,
      meetsTargetWordCount: false,
      wordsRemainingToTarget: Math.max(0, targetWords - gate.wordCount),
      paragraphCount: 0,
      sentenceCount: 0,
      lexicalDiversityPct: 0,
      cohesiveMarkerCount: 0,
      detectedCohesiveMarkers: [],
      isHighlyRepetitive: false,
      memorizedTemplateHits: [],
      checklist: [
        {
          id: 'min_threshold',
          label: 'Minimum Draft Length',
          status: 'warn',
          detail: `Write at least ${gate.minRequiredWords} coherent words (${targetWords}+ recommended) before running structural or AI checks.`
        }
      ],
      grammarAlerts: [],
      lexicalSuggestions: [],
      feedbackTitle: gate.feedbackTitle,
      feedbackEn: gate.feedbackEn,
      feedbackBn: gate.feedbackBn,
      nonScoringNotice
    };
  }

  const cleanText = text.trim();
  const lower = cleanText.toLowerCase();
  const signals = analyzeTextQualitySignals(cleanText);
  const paragraphs = cleanText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const paragraphCount = paragraphs.length;
  const meetsTargetWordCount = signals.wordCount >= targetWords;
  const wordsRemainingToTarget = Math.max(0, targetWords - signals.wordCount);

  const detectedCohesiveMarkers = PRECHECK_COHESIVE_MARKERS.filter((m) =>
    new RegExp(`\\b${m.replace(/\s+/g, '\\s+')}\\b`, 'i').test(lower)
  );

  const grammarAlerts: WritingInlineDiagnostic[] = [];
  if (/\b(people|governments|companies|universities) is\b/i.test(cleanText)) {
    const match = cleanText.match(/\b(people|governments|companies|universities) is\b/i)?.[0] || 'people is';
    grammarAlerts.push({
      id: 'precheck_sv_plural',
      type: 'error',
      phrase: match,
      suggestion: match.replace(/\bis\b/i, 'are'),
      criterion: 'GRA',
      explanation: 'Plural subjects require the plural auxiliary "are".',
      banglaExplanation: 'বহুবচন কর্তার (Plural Subject) সাথে "are" ব্যবহার করুন।'
    });
  }
  if (/\bthere is many\b/i.test(cleanText)) {
    const match = cleanText.match(/\bthere is many\b/i)?.[0] || 'there is many';
    grammarAlerts.push({
      id: 'precheck_there_is_many',
      type: 'error',
      phrase: match,
      suggestion: 'there are numerous',
      criterion: 'GRA',
      explanation: 'Use "there are" before plural count nouns.',
      banglaExplanation: 'বহুবচন বিশেষ্যের আগে "there are" বসবে।'
    });
  }
  if (/\b(informations|advices|furnitures|equipments|researches)\b/i.test(cleanText)) {
    const match = cleanText.match(/\b(informations|advices|furnitures|equipments|researches)\b/i)?.[0] || 'informations';
    grammarAlerts.push({
      id: 'precheck_uncountable',
      type: 'error',
      phrase: match,
      suggestion: match.replace(/s$/i, ''),
      criterion: 'GRA',
      explanation: `"${match.replace(/s$/i, '')}" is uncountable in academic English and does not take plural "-s".`,
      banglaExplanation: `"${match.replace(/s$/i, '')}" Uncountable Noun, তাই শেষে 's' যোগ করবেন না।`
    });
  }
  if (/\bin conclusion\b/i.test(cleanText) && taskType === 'task1') {
    const match = cleanText.match(/\bin conclusion\b/i)?.[0] || 'In conclusion';
    grammarAlerts.push({
      id: 'precheck_t1_conclusion',
      type: 'warning',
      phrase: match,
      suggestion: 'Overall, it is evident that',
      criterion: 'CC',
      explanation: 'Task 1 reports need an objective Overview ("Overall,") rather than a Task 2 conclusion.',
      banglaExplanation: 'Task 1-এ "In conclusion" এর বদলে "Overall..." দিয়ে Overview লিখুন।'
    });
  }

  const lexicalSuggestions: WritingStructuralPrecheckResult['lexicalSuggestions'] = [];
  if (/\b(big|huge|large) (change|increase|growth|rise)\b/i.test(cleanText)) {
    const m = cleanText.match(/\b(big|huge|large) (change|increase|growth|rise)\b/i)?.[0] || 'big increase';
    lexicalSuggestions.push({
      from: m,
      to: 'pronounced upward trajectory',
      context: 'Detected in your draft — Academic Data & Trend Synthesis',
      banglaMeaning: 'সুস্পষ্ট ঊর্ধ্বমুখী প্রবণতা'
    });
  }
  if (/\bvery (important|big|good|bad|high|low)\b/i.test(cleanText)) {
    const m = cleanText.match(/\bvery (important|big|good|bad|high|low)\b/i)?.[0] || 'very important';
    lexicalSuggestions.push({
      from: m,
      to: 'paramount / substantial / detrimental / pronounced',
      context: 'Detected in your draft — Replace "very + basic adjective"',
      banglaMeaning: 'অত্যন্ত গুরুত্বপূর্ণ / সুনির্দিষ্ট একাডেমিক বিশেষণ'
    });
  }
  if (/\ba lot of\b/i.test(cleanText)) {
    lexicalSuggestions.push({
      from: 'a lot of',
      to: 'a substantial proportion of / a considerable number of',
      context: 'Detected in your draft — Formal Academic Quantification',
      banglaMeaning: 'উল্লেখযোগ্য অংশ / পরিমাণ'
    });
  }
  if (/\bbad (effects|results|impacts|outcomes)\b/i.test(cleanText)) {
    const m = cleanText.match(/\bbad (effects|results|impacts|outcomes)\b/i)?.[0] || 'bad results';
    lexicalSuggestions.push({
      from: m,
      to: 'detrimental ramifications / adverse outcomes',
      context: 'Detected in your draft — Cause & Effect Precision',
      banglaMeaning: 'নেতিবাচক দীর্ঘমেয়াদী ফলাফল'
    });
  }

  const hasTask1Overview = taskType === 'task1' && /\b(overall|in summary|in general)\b/i.test(cleanText);
  const hasTask2Conclusion = taskType === 'task2' && /\b(in conclusion|to conclude|to summarize|in summary|to sum up)\b/i.test(cleanText);
  const targetParagraphs = taskType === 'task1' ? 3 : 4;

  const checklist: WritingStructuralChecklistItem[] = [
    {
      id: 'word_target',
      label: `Target Length (${targetWords}+ words)`,
      status: meetsTargetWordCount ? 'pass' : 'warn',
      detail: meetsTargetWordCount
        ? `Met target length (${signals.wordCount} words).`
        : `${signals.wordCount} / ${targetWords} words (${wordsRemainingToTarget} more recommended).`
    },
    {
      id: 'paragraphing',
      label: 'Paragraph Organization',
      status: paragraphCount >= targetParagraphs ? 'pass' : 'warn',
      detail:
        paragraphCount >= targetParagraphs
          ? `${paragraphCount} clear paragraphs detected.`
          : `${paragraphCount} paragraph(s) detected; ${targetParagraphs}+ distinct paragraphs recommended.`
    },
    {
      id: 'key_section',
      label: taskType === 'task1' ? 'Overview Signal' : 'Closing Synthesis Signal',
      status: (taskType === 'task1' ? hasTask1Overview : hasTask2Conclusion) ? 'pass' : 'warn',
      detail:
        taskType === 'task1'
          ? hasTask1Overview
            ? 'Detected an overview marker ("Overall / In general").'
            : 'No explicit "Overall" overview signal detected — Task 1 requires a clear macro-trend overview.'
          : hasTask2Conclusion
          ? 'Detected a closing synthesis marker.'
          : 'No explicit conclusion marker detected — ensure your final paragraph synthesizes your stance.'
    },
    {
      id: 'cohesion',
      label: 'Discourse Linkers',
      status: detectedCohesiveMarkers.length >= 2 ? 'pass' : 'warn',
      detail:
        detectedCohesiveMarkers.length >= 2
          ? `${detectedCohesiveMarkers.length} discourse marker(s) observed (${detectedCohesiveMarkers.slice(0, 4).join(', ')}).`
          : 'Few explicit discourse markers observed; verify logical transitions between paragraphs.'
    },
    {
      id: 'originality',
      label: 'Repetition & Template Guard',
      status: !signals.isHighlyRepetitive && signals.memorizedTemplateHits.length === 0 ? 'pass' : 'warn',
      detail: signals.isHighlyRepetitive
        ? 'High repetition detected — diversify sentence patterns and vocabulary.'
        : signals.memorizedTemplateHits.length > 0
        ? `Formulaic phrase detected ("${signals.memorizedTemplateHits[0]}") — replace with topic-specific phrasing.`
        : 'No severe repetition or stock memorized clichés detected.'
    }
  ];

  return {
    isScoringAssessment: false,
    assessmentStatus: 'precheck_ready',
    isValidAttempt: true,
    overallBand: null,
    taskType,
    wordCount: signals.wordCount,
    minRequiredWords: gate.minRequiredWords,
    targetWords,
    meetsTargetWordCount,
    wordsRemainingToTarget,
    paragraphCount,
    sentenceCount: signals.sentenceCount,
    lexicalDiversityPct: Math.round(signals.lexicalDiversityRatio * 100),
    cohesiveMarkerCount: detectedCohesiveMarkers.length,
    detectedCohesiveMarkers,
    isHighlyRepetitive: signals.isHighlyRepetitive,
    memorizedTemplateHits: signals.memorizedTemplateHits,
    checklist,
    grammarAlerts,
    lexicalSuggestions,
    feedbackTitle: `Offline ${taskType === 'task1' ? 'Task 1' : 'Task 2'} Structural Pre-Check (Non-Scoring)`,
    feedbackEn: `Checked ${signals.wordCount} words across ${paragraphCount} paragraph(s). ${
      meetsTargetWordCount
        ? 'Length target satisfied.'
        : `${wordsRemainingToTarget} more word(s) recommended to meet the ${targetWords}-word target.`
    } Open the Full Writing Studio for a live 4-criterion AI evaluation.`,
    feedbackBn: `আপনার ${signals.wordCount} শব্দের ড্রাফটটির কাঠামো, প্যারাগ্রাফ ও লিঙ্কার যাচাই করা হয়েছে (এটি কোনো IELTS ব্যান্ড স্কোর নয়)।`,
    nonScoringNotice
  };
}
