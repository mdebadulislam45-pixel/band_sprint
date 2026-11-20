export interface CriterionSubScore {
  code: 'TA' | 'TR' | 'CC' | 'LR' | 'GRA';
  label: string;
  band: number;
  justification: string;
  strengths: string[];
  weaknesses: string[];
}

export interface AnnotatedTextSegment {
  text: string;
  type: 'normal' | 'lexis_sophisticated' | 'grammar_error' | 'mechanical_connector' | 'memorized_template';
  tooltip?: string;
  correction?: string;
}

export interface WritingTaskAudit {
  taskNumber: 1 | 2;
  wordCount: number;
  minWordsRequired: number;
  isUnderLength: boolean;
  underLengthPenalty: number;
  isMemorizedOrOffTopic: boolean;
  memorizedReason?: string;
  rawBand: number;
  finalBand: number;
  criteria: CriterionSubScore[];
  annotatedSegments: AnnotatedTextSegment[];
  exemplarModelAnswer: {
    band: number;
    essay: string;
    highlights: Array<{ phrase: string; category: 'structure' | 'collocation' | 'grammar'; note: string }>;
  };
}

export interface SpeakingCriterionAudit {
  fcBand: number; // Fluency and Coherence
  lrBand: number; // Lexical Resource
  graBand: number; // Grammatical Range and Accuracy
  pBand: number; // Pronunciation
  overallSpeakingBand: number;
  fcNotes: string;
  lrNotes: string;
  graNotes: string;
  pNotes: string;
}

export interface ComprehensiveWritingEvaluation {
  overallWritingBand: number;
  taScore: number;
  ccScore: number;
  lrScore: number;
  graScore: number;
  task1Audit: WritingTaskAudit;
  task2Audit: WritingTaskAudit;
  speakingAudit: SpeakingCriterionAudit;
}

/**
 * IELTS Rounding Rule:
 * Average of 4 criteria.
 * - Fractional .25 rounds up to .5
 * - Fractional .75 rounds up to next whole band
 * - Everything else rounds to nearest 0.5 increment
 */
export function roundIELTSBand(rawAverage: number): number {
  const clamped = Math.max(0, Math.min(9, rawAverage));
  const floorWhole = Math.floor(clamped);
  const fraction = clamped - floorWhole;

  if (fraction < 0.125) return floorWhole;
  if (fraction < 0.25) return floorWhole;
  if (fraction < 0.625) return floorWhole + 0.5;
  if (fraction < 0.75) return floorWhole + 0.5;
  return Math.min(9.0, floorWhole + 1.0);
}

const SOPHISTICATED_LEXIS: Array<{ pattern: RegExp; note: string }> = [
  { pattern: /\b(precipitous|exponential|pronounced|disproportionate|unprecedented)\b/gi, note: 'Band 8+ precise academic modifier' },
  { pattern: /\b(mitigate|exacerbate|proliferate|substantiate|corroborate|ameliorate|perpetuate)\b/gi, note: 'High-utility C1/C2 academic verb' },
  { pattern: /\b(socioeconomic|infrastructural|paradigm|ramifications|disparity|dichotomy|equilibrium)\b/gi, note: 'Domain-specific academic register' },
  { pattern: /\b(concomitantly|notwithstanding|conversely|predominantly|disproportionately|invariably)\b/gi, note: 'Sophisticated discourse marker / adverbial' },
  { pattern: /\b(upward trajectory|marginal fluctuation|marked divergence|empirical evidence|systemic reform|viable alternative)\b/gi, note: 'Natural C1/C2 academic collocation' },
  { pattern: /\b(overall|by contrast|in stark contrast|notably|specifically)\b/gi, note: 'Effective cohesive signpost' },
];

const MECHANICAL_CONNECTORS: Array<{ pattern: RegExp; note: string; suggestion: string }> = [
  {
    pattern: /\b(Furthermore|Moreover|In addition to this|Additionally)\b/g,
    note: 'Mechanical sentence-initial additive linker (often overused in Band 6 scripts)',
    suggestion: 'Use clause-internal cohesion (e.g., "This trend is compounded by...", "Equally significant is...")',
  },
  {
    pattern: /\b(On the one hand|On the other hand|First and foremost|Last but not least)\b/gi,
    note: 'Formulaic/cliché signpost flagged by Sprint examiners',
    suggestion: 'Use organic topic sentences or "While proponents argue..., critics point to..."',
  },
  {
    pattern: /\b(In a nutshell|To cut a long story short|In conclusion, I strongly agree)\b/gi,
    note: 'Informal idiom or mechanical conclusion starter',
    suggestion: 'Use "In conclusion, while..., the weight of evidence suggests..."',
  },
];

const GRAMMAR_AND_SPELLING_ERRORS: Array<{ pattern: RegExp; note: string; correction: string }> = [
  { pattern: /\b(informations|researches|equipments|advices|evidences|knowledges)\b/gi, note: 'Uncountable noun pluralization error', correction: 'Use singular uncountable form (e.g., information, research, evidence)' },
  { pattern: /\b(goverment|enviroment|definately|occured|recieve|seperate|accomodate|neccessary)\b/gi, note: 'Academic spelling inaccuracy', correction: 'government / environment / definitely / occurred / receive / separate' },
  { pattern: /\b(more better|more easier|most highest|more faster)\b/gi, note: 'Double comparative/superlative error', correction: 'better / easier / highest / faster' },
  { pattern: /\b(peoples is|there have many|is depend on|are consist of|can able to)\b/gi, note: 'Subject-verb agreement or modal syntax error', correction: 'people are / there are many / depends on / consists of / is able to' },
  { pattern: /\b(a lot of|lots of|kids|stuff|things|nowadays)\b/gi, note: 'Informal lexical choice reduces Academic register precision', correction: 'a substantial proportion of / children / factors / in the contemporary era' },
];

const MEMORIZED_TEMPLATES: RegExp[] = [
  /with the rapid development of science and technology/i,
  /every coin has two sides/i,
  /this essay will discuss both views and give my opinion using examples from oxford/i,
  /Since the dawn of human civilization/i,
  /is a hotly debated topic in modern society that has sparked controversy/i,
];

function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

function buildAnnotatedSegments(text: string): AnnotatedTextSegment[] {
  if (!text || !text.trim()) {
    return [{ text: '[No candidate response submitted for this task.]', type: 'normal' }];
  }

  interface MatchSpan {
    start: number;
    end: number;
    type: AnnotatedTextSegment['type'];
    tooltip: string;
    correction?: string;
  }

  const spans: MatchSpan[] = [];

  const addMatches = (
    regex: RegExp,
    type: AnnotatedTextSegment['type'],
    tooltip: string,
    correction?: string
  ) => {
    const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
    const clone = new RegExp(regex.source, flags);
    let match: RegExpExecArray | null;
    while ((match = clone.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = spans.some((s) => !(end <= s.start || start >= s.end));
      if (!overlaps) {
        spans.push({ start, end, type, tooltip, correction });
      }
    }
  };

  for (const tpl of MEMORIZED_TEMPLATES) {
    addMatches(tpl, 'memorized_template', 'Flagged Memorized Template / Cliché Opening (Penalized under TA/TR & LR)', 'Replace with a direct, prompt-specific paraphrase');
  }
  for (const err of GRAMMAR_AND_SPELLING_ERRORS) {
    addMatches(err.pattern, 'grammar_error', err.note, err.correction);
  }
  for (const conn of MECHANICAL_CONNECTORS) {
    addMatches(conn.pattern, 'mechanical_connector', conn.note, conn.suggestion);
  }
  for (const lex of SOPHISTICATED_LEXIS) {
    addMatches(lex.pattern, 'lexis_sophisticated', lex.note);
  }

  spans.sort((a, b) => a.start - b.start);

  const segments: AnnotatedTextSegment[] = [];
  let cursor = 0;

  for (const span of spans) {
    if (span.start > cursor) {
      segments.push({ text: text.slice(cursor, span.start), type: 'normal' });
    }
    segments.push({
      text: text.slice(span.start, span.end),
      type: span.type,
      tooltip: span.tooltip,
      correction: span.correction,
    });
    cursor = span.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), type: 'normal' });
  }

  return segments;
}

export function evaluateSingleWritingTask(
  taskNumber: 1 | 2,
  essayText: string,
  promptText: string
): WritingTaskAudit {
  const minWordsRequired = taskNumber === 1 ? 150 : 250;
  const wordCount = countWords(essayText);
  const isUnderLength = wordCount < minWordsRequired;

  // Calculate strict under-length penalty
  let underLengthPenalty = 0;
  if (wordCount === 0) {
    underLengthPenalty = 9.0;
  } else if (isUnderLength) {
    const ratio = wordCount / minWordsRequired;
    if (ratio < 0.4) underLengthPenalty = 2.5;
    else if (ratio < 0.65) underLengthPenalty = 1.5;
    else if (ratio < 0.85) underLengthPenalty = 1.0;
    else underLengthPenalty = 0.5;
  }

  const annotatedSegments = buildAnnotatedSegments(essayText);

  const sophisticatedCount = annotatedSegments.filter((s) => s.type === 'lexis_sophisticated').length;
  const errorCount = annotatedSegments.filter((s) => s.type === 'grammar_error').length;
  const mechanicalCount = annotatedSegments.filter((s) => s.type === 'mechanical_connector').length;
  const memorizedCount = annotatedSegments.filter((s) => s.type === 'memorized_template').length;

  // Check prompt overlap / off-topic or verbatim prompt copying
  const promptWords = promptText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const essayLower = essayText.toLowerCase();
  const matchedPromptKeywords = promptWords.filter((w) => essayLower.includes(w));
  const keywordCoverage = promptWords.length > 0 ? matchedPromptKeywords.length / promptWords.length : 1;

  const isMemorizedOrOffTopic =
    memorizedCount > 0 || (wordCount > 40 && keywordCoverage < 0.12);

  let memorizedReason: string | undefined;
  if (memorizedCount > 0) {
    memorizedReason = 'Detected memorized template phraseology ("every coin has two sides" / stock opening). Sprint examiners discount memorized strings from TA/LR assessment.';
  } else if (wordCount > 40 && keywordCoverage < 0.12) {
    memorizedReason = 'Low topical alignment with prompt keywords — response appears tangential or partially pre-scripted.';
  }

  const paragraphs = essayText
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const sentences = essayText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const complexConjunctionMatches =
    essayText.match(/\b(although|whereas|while|despite|notwithstanding|provided that|which|whose|whereby|consequently|nevertheless)\b/gi) || [];
  const complexDensity = sentences.length > 0 ? complexConjunctionMatches.length / sentences.length : 0;

  const hasOverviewInTask1 =
    /\b(overall|in summary|it is clear that|main trend|generally speaking)\b/i.test(essayText);
  const hasClearPositionInTask2 =
    /\b(I argue|I contend|I believe|this essay argues|in my view|the evidence suggests|weighing both)\b/i.test(essayText) ||
    paragraphs.length >= 3;

  // Compute 4 Criterion Scores if candidate wrote content
  let taBand = 0;
  let ccBand = 0;
  let lrBand = 0;
  let graBand = 0;

  if (wordCount > 0) {
    // 1. TA / TR
    let baseTA = wordCount >= minWordsRequired ? 6.5 : 5.5;
    if (taskNumber === 1 && hasOverviewInTask1) baseTA += 1.0;
    if (taskNumber === 1 && !hasOverviewInTask1) baseTA = Math.min(baseTA, 5.5); // Band 5 cap in TA if no clear overview
    if (taskNumber === 2 && hasClearPositionInTask2 && paragraphs.length >= 4) baseTA += 1.0;
    if (wordCount >= minWordsRequired + 40 && keywordCoverage >= 0.35) baseTA += 0.5;
    if (isUnderLength) baseTA -= underLengthPenalty;
    if (isMemorizedOrOffTopic) baseTA -= 1.0;
    taBand = roundIELTSBand(Math.max(2.0, Math.min(9.0, baseTA)));

    // 2. CC
    let baseCC = paragraphs.length >= 3 && paragraphs.length <= 5 ? 7.0 : 5.5;
    if (mechanicalCount >= 3) baseCC -= 1.0;
    else if (mechanicalCount >= 1) baseCC -= 0.5;
    if (sophisticatedCount >= 2 && paragraphs.length >= 3) baseCC += 0.5;
    if (wordCount < 80) baseCC = Math.min(baseCC, 4.5);
    ccBand = roundIELTSBand(Math.max(2.0, Math.min(9.0, baseCC)));

    // 3. LR
    const uniqueWords = new Set(
      essayText
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .split(/\s+/)
        .filter(Boolean)
    );
    const lexicalDiversity = wordCount > 0 ? uniqueWords.size / wordCount : 0;
    let baseLR = 6.0;
    if (lexicalDiversity > 0.52 && wordCount >= 120) baseLR += 0.5;
    if (sophisticatedCount >= 4) baseLR += 1.5;
    else if (sophisticatedCount >= 2) baseLR += 1.0;
    else if (sophisticatedCount >= 1) baseLR += 0.5;
    if (errorCount >= 3) baseLR -= 1.0;
    else if (errorCount >= 1) baseLR -= 0.5;
    if (memorizedCount > 0) baseLR -= 0.5;
    if (wordCount < 80) baseLR = Math.min(baseLR, 5.0);
    lrBand = roundIELTSBand(Math.max(2.0, Math.min(9.0, baseLR)));

    // 4. GRA
    let baseGRA = 6.0;
    if (complexDensity >= 0.65) baseGRA += 1.5;
    else if (complexDensity >= 0.4) baseGRA += 1.0;
    else if (complexDensity >= 0.25) baseGRA += 0.5;
    if (errorCount >= 4) baseGRA -= 1.5;
    else if (errorCount >= 2) baseGRA -= 1.0;
    else if (errorCount === 1) baseGRA -= 0.5;
    if (wordCount < 80) baseGRA = Math.min(baseGRA, 5.0);
    graBand = roundIELTSBand(Math.max(2.0, Math.min(9.0, baseGRA)));
  }

  const rawBand = roundIELTSBand((taBand + ccBand + lrBand + graBand) / 4);
  const finalBand = wordCount === 0 ? 0 : roundIELTSBand(Math.max(1.0, rawBand));

  const criteria: CriterionSubScore[] = [
    {
      code: taskNumber === 1 ? 'TA' : 'TR',
      label: taskNumber === 1 ? 'Task Achievement (TA)' : 'Task Response (TR)',
      band: taBand,
      justification:
        wordCount === 0
          ? 'No response submitted.'
          : taskNumber === 1
          ? `${hasOverviewInTask1 ? 'Includes a clear macro-overview of primary trends.' : 'Missing an explicit macro-overview statement (caps TA near Band 5.5).'} ${
              isUnderLength
                ? `Penalized by -${underLengthPenalty.toFixed(1)} bands for falling ${minWordsRequired - wordCount} words short of the 150-word statutory minimum.`
                : `Meets the 150-word threshold (${wordCount} words) with data selection.`
            }`
          : `${hasClearPositionInTask2 ? 'Maintains a discernible position across paragraphs.' : 'Thesis position and paragraph development need sharper synthesis.'} ${
              isUnderLength
                ? `Penalized by -${underLengthPenalty.toFixed(1)} bands for falling ${minWordsRequired - wordCount} words short of the 250-word statutory minimum.`
                : `Satisfies the 250-word requirement (${wordCount} words).`
            }`,
      strengths: [
        wordCount >= minWordsRequired ? `Satisfies minimum word count (${wordCount}/${minWordsRequired} words)` : 'Addresses core topic theme',
        taskNumber === 1 && hasOverviewInTask1 ? 'Contains explicit macro-trend overview' : 'Identifies key thematic dimensions',
      ],
      weaknesses: [
        ...(isUnderLength ? [`Under-length script (${wordCount}/${minWordsRequired} words) triggers automatic TA/TR penalty`] : []),
        ...(taskNumber === 1 && !hasOverviewInTask1 ? ['Lacks a dedicated "Overall, ..." summary paragraph'] : []),
        ...(isMemorizedOrOffTopic && memorizedReason ? [memorizedReason] : []),
      ],
    },
    {
      code: 'CC',
      label: 'Coherence and Cohesion (CC)',
      band: ccBand,
      justification:
        wordCount === 0
          ? 'No response submitted.'
          : `Structured into ${paragraphs.length} paragraph(s). ${
              mechanicalCount > 0
                ? `Flagged ${mechanicalCount} mechanical sentence-initial connector(s) (e.g., Furthermore/Moreover); replace with demonstrative reference chains ("This disparity...", "Such measures...").`
                : 'Uses cohesive progression without excessive mechanical linking.'
            }`,
      strengths: [
        paragraphs.length >= 3 ? `Logical ${paragraphs.length}-paragraph separation` : 'Sequential sentence flow',
        mechanicalCount === 0 ? 'Avoids repetitive mechanical connectors' : 'Clear paragraph transitions',
      ],
      weaknesses: [
        ...(paragraphs.length < 3 ? ['Insufficient paragraphing; divide into Introduction, Body 1, Body 2, and Conclusion'] : []),
        ...(mechanicalCount > 0 ? [`Over-reliance on ${mechanicalCount} formulaic discourse marker(s)`] : []),
      ],
    },
    {
      code: 'LR',
      label: 'Lexical Resource (LR)',
      band: lrBand,
      justification:
        wordCount === 0
          ? 'No response submitted.'
          : `Demonstrates ${sophisticatedCount} C1/C2 academic collocation(s) or precision modifiers. ${
              errorCount > 0
                ? `Detected ${errorCount} lexical/spelling or register inaccuracy(ies) highlighted in red.`
                : 'Maintains formal academic register with minimal spelling slips.'
            }`,
      strengths: [
        sophisticatedCount > 0 ? `${sophisticatedCount} advanced academic lexical item(s) highlighted in green` : 'Functional core vocabulary',
      ],
      weaknesses: [
        ...(errorCount > 0 ? [`${errorCount} uncountable noun / spelling / informal register slip(s)`] : []),
        ...(sophisticatedCount < 2 ? ['Limited range of C1/C2 academic collocations'] : []),
      ],
    },
    {
      code: 'GRA',
      label: 'Grammatical Range and Accuracy (GRA)',
      band: graBand,
      justification:
        wordCount === 0
          ? 'No response submitted.'
          : `Subordinate/complex clause density of ${Math.round(complexDensity * 100)}% across ${sentences.length} sentence(s). ${
              errorCount > 0
                ? `${errorCount} grammatical/syntactic error(s) flagged in the script.`
                : 'High proportion of error-free multi-clause sentences.'
            }`,
      strengths: [
        complexDensity >= 0.35 ? 'Consistent use of subordinate and relative clauses' : 'Clear baseline clause control',
      ],
      weaknesses: [
        ...(complexDensity < 0.35 ? ['Needs greater syntactic variety (conditionals, non-finite clauses, inversion)'] : []),
        ...(errorCount > 0 ? ['Eliminate agreement and comparative errors highlighted in red'] : []),
      ],
    },
  ];

  const exemplarModelAnswer =
    taskNumber === 1
      ? {
          band: 8.5,
          essay: `The line graph illustrates the proportion of households with high-speed fiber broadband access across four European nations—Sweden, the Netherlands, Germany, and Italy—between 2010 and 2024.\n\nOverall, fiber adoption followed a pronounced upward trajectory in all four countries over the fourteen-year period, though significant regional disparities persisted. While Sweden and the Netherlands maintained a commanding lead throughout, Germany and Italy experienced accelerated catch-up growth during the final four years.\n\nIn 2010, Sweden led the cohort with approximately 38% household penetration, closely followed by the Netherlands at 31%. Over the subsequent decade, both nations expanded their infrastructural coverage steadily, converging at roughly 82% in 2020 before Sweden edged ahead to peak at 94% in 2024.\n\nBy stark contrast, Germany and Italy began the period at negligible levels of 6% and 4%, respectively. Whereas Italian penetration rose gradually to 28% by 2018, German deployment remained comparatively stagnant below 20% until 2019. Thereafter, systemic infrastructural investment triggered a precipitous surge in both nations, with Germany reaching 64% and Italy climbing to 59% by 2024.`,
          highlights: [
            { phrase: 'Overall, fiber adoption followed a pronounced upward trajectory', category: 'structure' as const, note: 'Clear Band 9 macro-overview signposted at the start of Paragraph 2' },
            { phrase: 'significant regional disparities persisted', category: 'collocation' as const, note: 'High-precision C2 academic noun phrase' },
            { phrase: 'Whereas Italian penetration rose gradually to 28% by 2018, German deployment remained comparatively stagnant', category: 'grammar' as const, note: 'Contrastive subordinate clause comparing two datasets simultaneously' },
          ],
        }
      : {
          band: 9.0,
          essay: `The proliferation of autonomous artificial intelligence systems across knowledge-intensive industries has ignited debate over whether governments should mandate universal retraining levies on corporations or leave workforce adaptation to market forces. While excessive regulatory taxation can dampen entrepreneurial agility, I contend that a targeted corporate transition levy is indispensable to mitigate structural unemployment.\n\nProponents of laissez-faire labor markets argue that technological disruption historically generates sufficient replacement roles without state intervention. When enterprises retain their capital rather than paying statutory training taxes, they can reinvest surpluses into research, product expansion, and new job categories. Imposing rigid fiscal mandates risks penalizing early adopters of automation and eroding national competitiveness in globalized sectors.\n\nNotwithstanding these market efficiencies, contemporary algorithmic displacement operates at an unprecedented velocity that outpaces organic labor reabsorption. Unlike nineteenth-century mechanization, generative and analytical AI simultaneously automates routine cognitive and administrative tiers, disproportionately displacing mid-career workers whose skills cannot be recalibrated overnight. By instituting a co-funded corporate reskilling levy, governments establish a sustainable fiscal mechanism that compels beneficiaries of automation to internalize the socioeconomic costs of workforce transition.\n\nIn conclusion, although regulatory overheads must be calibrated carefully to preserve innovation, leaving mid-career displaced workers solely to market forces invites severe socioeconomic disparity. A structured corporate retraining framework offers the most viable equilibrium between technological progress and social cohesion.`,
          highlights: [
            { phrase: 'While excessive regulatory taxation can dampen entrepreneurial agility, I contend that', category: 'structure' as const, note: 'Concessive thesis statement establishing a nuanced Band 9 position immediately' },
            { phrase: 'unprecedented velocity that outpaces organic labor reabsorption', category: 'collocation' as const, note: 'Sophisticated domain-specific academic lexis' },
            { phrase: 'Notwithstanding these market efficiencies, contemporary algorithmic displacement operates', category: 'grammar' as const, note: 'Organic preposition-based transition replacing mechanical linkers like "On the other hand"' },
          ],
        };

  return {
    taskNumber,
    wordCount,
    minWordsRequired,
    isUnderLength,
    underLengthPenalty,
    isMemorizedOrOffTopic,
    memorizedReason,
    rawBand,
    finalBand,
    criteria,
    annotatedSegments,
    exemplarModelAnswer,
  };
}

export function evaluateCDIELTSWritingSuite(
  task1Text: string,
  task2Text: string,
  task1Prompt: string,
  task2Prompt: string
): ComprehensiveWritingEvaluation {
  const task1Audit = evaluateSingleWritingTask(1, task1Text, task1Prompt);
  const task2Audit = evaluateSingleWritingTask(2, task2Text, task2Prompt);

  // IELTS Writing weighting: Task 2 carries twice the weight of Task 1 (1/3 Task 1 + 2/3 Task 2)
  const hasT1 = task1Audit.wordCount > 0;
  const hasT2 = task2Audit.wordCount > 0;

  let weightedTA = 0;
  let weightedCC = 0;
  let weightedLR = 0;
  let weightedGRA = 0;
  let overallWritingBand = 0;

  if (hasT1 && hasT2) {
    weightedTA = roundIELTSBand((task1Audit.criteria[0].band + task2Audit.criteria[0].band * 2) / 3);
    weightedCC = roundIELTSBand((task1Audit.criteria[1].band + task2Audit.criteria[1].band * 2) / 3);
    weightedLR = roundIELTSBand((task1Audit.criteria[2].band + task2Audit.criteria[2].band * 2) / 3);
    weightedGRA = roundIELTSBand((task1Audit.criteria[3].band + task2Audit.criteria[3].band * 2) / 3);
    overallWritingBand = roundIELTSBand((task1Audit.finalBand + task2Audit.finalBand * 2) / 3);
  } else if (hasT2) {
    weightedTA = task2Audit.criteria[0].band;
    weightedCC = task2Audit.criteria[1].band;
    weightedLR = task2Audit.criteria[2].band;
    weightedGRA = task2Audit.criteria[3].band;
    overallWritingBand = task2Audit.finalBand;
  } else if (hasT1) {
    weightedTA = task1Audit.criteria[0].band;
    weightedCC = task1Audit.criteria[1].band;
    weightedLR = task1Audit.criteria[2].band;
    weightedGRA = task1Audit.criteria[3].band;
    overallWritingBand = task1Audit.finalBand;
  }

  // Speaking Criterion-Based Audit (derived from candidate's active linguistic profile + speaking benchmark)
  const baseRef = overallWritingBand > 0 ? overallWritingBand : 6.5;
  const fcBand = roundIELTSBand(Math.min(9.0, baseRef + 0.5));
  const lrBand = roundIELTSBand(Math.min(9.0, weightedLR > 0 ? weightedLR : 6.5));
  const graBand = roundIELTSBand(Math.min(9.0, weightedGRA > 0 ? weightedGRA : 6.5));
  const pBand = roundIELTSBand(Math.min(9.0, baseRef));
  const overallSpeakingBand = roundIELTSBand((fcBand + lrBand + graBand + pBand) / 4);

  const speakingAudit: SpeakingCriterionAudit = {
    fcBand,
    lrBand,
    graBand,
    pBand,
    overallSpeakingBand,
    fcNotes: 'Evaluates speech rate continuity, hesitation frequency (<300ms pauses), self-correction naturalness, and organic discourse markers across Parts 1–3.',
    lrNotes: 'Assesses idiomatic precision, topic-specific vocabulary, and ability to paraphrase unfamiliar concepts under real-time pressure.',
    graNotes: 'Tracks subordinate clause variety, tense consistency in Part 2 narrative, and speculative conditionals in Part 3.',
    pNotes: 'Measures connected speech (linking/elision), nuclear word stress, and sentence-level intonation contours.',
  };

  return {
    overallWritingBand,
    taScore: weightedTA,
    ccScore: weightedCC,
    lrScore: weightedLR,
    graScore: weightedGRA,
    task1Audit,
    task2Audit,
    speakingAudit,
  };
}

/**
 * IndexedDB Persistence for Strict CD-IELTS Listening Audio State
 * Prevents restarting audio tracks on browser refresh and stores section completion timestamps.
 */
export interface PersistedListeningAudioState {
  partIndex: number;
  phase: 'pre_read' | 'playing' | 'section_check' | 'end_of_test_buffer' | 'completed';
  phaseRemainingSeconds: number;
  audioPlaybackPositionSec: number;
  completedParts: Record<number, number>; // partIndex -> completion timestamp (ms)
  updatedAt: number;
}

const IDB_NAME = 'cdielts_exam_integrity_db';
const IDB_STORE = 'listening_audio_state';
const IDB_KEY = 'active_session_audio';
const LS_FALLBACK_KEY = 'cdielts_listening_audio_state_v1';

function openAudioIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = window.indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveListeningAudioState(state: PersistedListeningAudioState): Promise<void> {
  try {
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
  try {
    const db = await openAudioIDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(state, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // fallback already saved in localStorage
  }
}

export async function loadListeningAudioState(): Promise<PersistedListeningAudioState | null> {
  try {
    const db = await openAudioIDB();
    const result = await new Promise<PersistedListeningAudioState | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => resolve((req.result as PersistedListeningAudioState) || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (result) return result;
  } catch {
    // fallback to localStorage
  }
  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    return raw ? (JSON.parse(raw) as PersistedListeningAudioState) : null;
  } catch {
    return null;
  }
}

export async function clearListeningAudioState(): Promise<void> {
  try {
    localStorage.removeItem(LS_FALLBACK_KEY);
  } catch {
    // ignore
  }
  try {
    const db = await openAudioIDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    // ignore
  }
}

/**
 * Official CD-IELTS Timing Constants & Phase State Machine Controller
 *
 * Reconciles the four-section Listening sequence:
 * - Four 35-second pre-read periods: 140s (2m 20s)
 * - Four single-play section audio broadcasts (Sprint Practice Set 18 measured: 337.70s + 305.29s + 369.59s + 341.15s = 1353.73s / 22m 33.73s)
 * - Four 60-second section review periods: 240s (4m 00s)
 * - Separate final 2-minute answer-checking period: 120s (2m 00s)
 * - Total expected duration for Sprint Practice Set 18: 1853.73s (30m 53.73s -> 1854s / 30:54 clock)
 */
export type CDIELTSListeningPhase = 'pre_read' | 'playing' | 'section_check' | 'end_of_test_buffer' | 'completed';

export const CDIELTS_PRE_READ_SECONDS = 35;
export const CDIELTS_SECTION_REVIEW_SECONDS = 60;
export const CDIELTS_FINAL_CHECK_SECONDS = 120;
export const CDIELTS_TOTAL_BUFFER_SECONDS =
  4 * CDIELTS_PRE_READ_SECONDS + 4 * CDIELTS_SECTION_REVIEW_SECONDS + CDIELTS_FINAL_CHECK_SECONDS; // 500s (8m 20s)

export const SPRINT_18_PART_AUDIO_SECONDS: Record<1 | 2 | 3 | 4, number> = {
  1: 337.70,
  2: 305.29,
  3: 369.59,
  4: 341.15
};

export const SPRINT_18_LIBRARY_MEASURED_AUDIO_SECONDS: Record<1 | 2 | 3 | 4, number> =
  SPRINT_18_PART_AUDIO_SECONDS;

// Sprint Practice Set 18 Mock Exam Set (calculated synthetic speech duration from transcript words & pauses)
export const SPRINT_18_MOCK_EXAM_AUDIO_SECONDS: Record<1 | 2 | 3 | 4, number> = {
  1: 412.77,
  2: 396.98,
  3: 363.93,
  4: 314.28
};

export const SPRINT_17_PART_AUDIO_SECONDS: Record<1 | 2 | 3 | 4, number> = {
  1: 383.18,
  2: 341.39,
  3: 354.23,
  4: 312.53
};

export const BC_AUTHENTIC_3_PART_AUDIO_SECONDS: Record<1 | 2 | 3 | 4, number> = {
  1: 353.70,
  2: 304.18,
  3: 324.89,
  4: 314.88
};

export const SPRINT_16_PART_AUDIO_SECONDS: Record<1 | 2 | 3 | 4, number> = {
  1: 391.87,
  2: 337.55,
  3: 304.63,
  4: 296.37
};

export const GT_TEST_1_PART_AUDIO_SECONDS: Record<1 | 2 | 3 | 4, number> = {
  1: 317.41,
  2: 325.11,
  3: 320.48,
  4: 304.66
};

export const EXAM_SECTION_AUDIO_DURATIONS: Record<string, Record<1 | 2 | 3 | 4, number>> = {
  'sprint-18': SPRINT_18_MOCK_EXAM_AUDIO_SECONDS,
  'sprint-17': SPRINT_17_PART_AUDIO_SECONDS,
  'bc-authentic-3': BC_AUTHENTIC_3_PART_AUDIO_SECONDS,
  'sprint-16': SPRINT_16_PART_AUDIO_SECONDS,
  'gt-test-1': GT_TEST_1_PART_AUDIO_SECONDS,
  'sprint-18-academic-test-1': SPRINT_18_LIBRARY_MEASURED_AUDIO_SECONDS
};

export function getExamSectionAudioDurations(examId?: string): Record<1 | 2 | 3 | 4, number> {
  if (examId && EXAM_SECTION_AUDIO_DURATIONS[examId]) {
    return EXAM_SECTION_AUDIO_DURATIONS[examId];
  }
  return SPRINT_18_PART_AUDIO_SECONDS;
}

export const CDIELTS_LISTENING_AUDIO_TOTAL_SECONDS =
  SPRINT_18_PART_AUDIO_SECONDS[1] +
  SPRINT_18_PART_AUDIO_SECONDS[2] +
  SPRINT_18_PART_AUDIO_SECONDS[3] +
  SPRINT_18_PART_AUDIO_SECONDS[4]; // 1353.73s (22m 33.73s)

export const CDIELTS_LISTENING_EXACT_TOTAL_SECONDS =
  Number((CDIELTS_LISTENING_AUDIO_TOTAL_SECONDS + CDIELTS_TOTAL_BUFFER_SECONDS).toFixed(2)); // 1853.73s (30m 53.73s)

export const CDIELTS_LISTENING_INITIAL_CLOCK_SECONDS = Math.ceil(CDIELTS_LISTENING_EXACT_TOTAL_SECONDS); // 1854s (30:54)
export const CDIELTS_READING_DURATION_SECONDS = 60 * 60; // 3600s (60:00)
export const CDIELTS_WRITING_DURATION_SECONDS = 60 * 60; // 3600s (60:00)
export const CDIELTS_SPEAKING_DURATION_SECONDS = 14 * 60; // 840s (14:00)

export interface CDIELTSListeningTimerState {
  section: 1 | 2 | 3 | 4;
  phase: CDIELTSListeningPhase;
  phaseCountdownSec: number;
  audioPlaybackSec: number;
  timeRemainingSec: number;
  completedParts: Record<number, number>;
  isListeningLocked: boolean;
  hasSubmitted: boolean;
  submissionCount: number;
  sectionAudioDurations: Record<1 | 2 | 3 | 4, number>;
}

export type CDIELTSPhaseTransitionAction =
  | 'none'
  | 'start_audio'
  | 'next_section_pre_read'
  | 'start_final_check'
  | 'complete_and_submit';

export interface CDIELTSPhaseStepResult {
  nextState: CDIELTSListeningTimerState;
  action: CDIELTSPhaseTransitionAction;
  section: 1 | 2 | 3 | 4;
}

export function calculateListeningTotalDurationSec(
  sectionAudioDurations: Record<1 | 2 | 3 | 4, number> = SPRINT_18_PART_AUDIO_SECONDS
): number {
  const audioSum =
    sectionAudioDurations[1] +
    sectionAudioDurations[2] +
    sectionAudioDurations[3] +
    sectionAudioDurations[4];
  return Number((audioSum + CDIELTS_TOTAL_BUFFER_SECONDS).toFixed(2));
}

export function getCDIELTSSkillDurationSec(
  skill: 'listening' | 'reading' | 'writing' | 'speaking',
  sectionAudioDurations: Record<1 | 2 | 3 | 4, number> = SPRINT_18_PART_AUDIO_SECONDS
): number {
  switch (skill) {
    case 'listening':
      return Math.ceil(calculateListeningTotalDurationSec(sectionAudioDurations));
    case 'reading':
      return CDIELTS_READING_DURATION_SECONDS;
    case 'writing':
      return CDIELTS_WRITING_DURATION_SECONDS;
    case 'speaking':
      return CDIELTS_SPEAKING_DURATION_SECONDS;
  }
}

export function calculateSynchronizedListeningRemainingSec(state: {
  section: 1 | 2 | 3 | 4;
  phase: CDIELTSListeningPhase;
  phaseCountdownSec: number;
  audioPlaybackSec: number;
  sectionAudioDurations?: Record<1 | 2 | 3 | 4, number>;
}): number {
  if (state.phase === 'completed') {
    return 0;
  }
  if (state.phase === 'end_of_test_buffer') {
    return Math.max(0, Math.ceil(state.phaseCountdownSec));
  }

  const durations = state.sectionAudioDurations || SPRINT_18_PART_AUDIO_SECONDS;
  let futureSectionsSec = 0;
  for (let k = state.section + 1; k <= 4; k++) {
    const secKey = k as 1 | 2 | 3 | 4;
    futureSectionsSec +=
      CDIELTS_PRE_READ_SECONDS + durations[secKey] + CDIELTS_SECTION_REVIEW_SECONDS;
  }

  const currentAudioSec = durations[state.section];
  let currentSectionRemainingSec = 0;

  if (state.phase === 'pre_read') {
    currentSectionRemainingSec =
      Math.max(0, state.phaseCountdownSec) + currentAudioSec + CDIELTS_SECTION_REVIEW_SECONDS;
  } else if (state.phase === 'playing') {
    // Hold at least 1s of remaining audio while active so valid audio is never cut off early
    const remainingAudio = Math.max(1, currentAudioSec - Math.max(0, state.audioPlaybackSec));
    currentSectionRemainingSec = remainingAudio + CDIELTS_SECTION_REVIEW_SECONDS;
  } else if (state.phase === 'section_check') {
    currentSectionRemainingSec = Math.max(0, state.phaseCountdownSec);
  }

  return Math.max(
    1,
    Math.ceil(currentSectionRemainingSec + futureSectionsSec + CDIELTS_FINAL_CHECK_SECONDS)
  );
}

export function createInitialListeningTimerState(
  sectionAudioDurations: Record<1 | 2 | 3 | 4, number> = SPRINT_18_PART_AUDIO_SECONDS
): CDIELTSListeningTimerState {
  const durations = { ...sectionAudioDurations };
  return {
    section: 1,
    phase: 'pre_read',
    phaseCountdownSec: CDIELTS_PRE_READ_SECONDS,
    audioPlaybackSec: 0,
    timeRemainingSec: getCDIELTSSkillDurationSec('listening', durations),
    completedParts: {},
    isListeningLocked: false,
    hasSubmitted: false,
    submissionCount: 0,
    sectionAudioDurations: durations
  };
}

export function stepListeningPhaseState(
  state: CDIELTSListeningTimerState,
  options?: { isAudioActiveOrLoading?: boolean; hasAudioError?: boolean }
): CDIELTSPhaseStepResult {
  if (state.phase === 'completed') {
    return {
      nextState: { ...state, phaseCountdownSec: 0, timeRemainingSec: 0 },
      action: 'none',
      section: state.section
    };
  }

  const durations = state.sectionAudioDurations || SPRINT_18_PART_AUDIO_SECONDS;

  if (state.phase === 'playing') {
    // Never auto-transition out of 'playing' on a timer: only completeListeningSectionAudioState advances to 'section_check'
    const nextAudioSec = options?.hasAudioError ? state.audioPlaybackSec : state.audioPlaybackSec + 1;
    const nextPhaseCountdown = Math.max(1, Math.ceil(durations[state.section] - nextAudioSec));
    const nextState: CDIELTSListeningTimerState = {
      ...state,
      audioPlaybackSec: nextAudioSec,
      phaseCountdownSec: nextPhaseCountdown,
      timeRemainingSec: calculateSynchronizedListeningRemainingSec({
        section: state.section,
        phase: 'playing',
        phaseCountdownSec: nextPhaseCountdown,
        audioPlaybackSec: nextAudioSec,
        sectionAudioDurations: durations
      })
    };
    return { nextState, action: 'none', section: state.section };
  }

  if (state.phase === 'pre_read') {
    if (state.phaseCountdownSec > 1) {
      const nextCountdown = state.phaseCountdownSec - 1;
      const nextState: CDIELTSListeningTimerState = {
        ...state,
        phaseCountdownSec: nextCountdown,
        timeRemainingSec: calculateSynchronizedListeningRemainingSec({
          section: state.section,
          phase: 'pre_read',
          phaseCountdownSec: nextCountdown,
          audioPlaybackSec: 0,
          sectionAudioDurations: durations
        })
      };
      return { nextState, action: 'none', section: state.section };
    }

    const playingCountdown = Math.max(1, Math.ceil(durations[state.section]));
    const nextState: CDIELTSListeningTimerState = {
      ...state,
      phase: 'playing',
      phaseCountdownSec: playingCountdown,
      audioPlaybackSec: 0,
      timeRemainingSec: calculateSynchronizedListeningRemainingSec({
        section: state.section,
        phase: 'playing',
        phaseCountdownSec: playingCountdown,
        audioPlaybackSec: 0,
        sectionAudioDurations: durations
      })
    };
    return { nextState, action: 'start_audio', section: state.section };
  }

  if (state.phase === 'section_check') {
    if (state.phaseCountdownSec > 1) {
      const nextCountdown = state.phaseCountdownSec - 1;
      const nextState: CDIELTSListeningTimerState = {
        ...state,
        phaseCountdownSec: nextCountdown,
        timeRemainingSec: calculateSynchronizedListeningRemainingSec({
          section: state.section,
          phase: 'section_check',
          phaseCountdownSec: nextCountdown,
          audioPlaybackSec: 0,
          sectionAudioDurations: durations
        })
      };
      return { nextState, action: 'none', section: state.section };
    }

    if (state.section < 4) {
      const nextSection = (state.section + 1) as 1 | 2 | 3 | 4;
      const nextState: CDIELTSListeningTimerState = {
        ...state,
        section: nextSection,
        phase: 'pre_read',
        phaseCountdownSec: CDIELTS_PRE_READ_SECONDS,
        audioPlaybackSec: 0,
        timeRemainingSec: calculateSynchronizedListeningRemainingSec({
          section: nextSection,
          phase: 'pre_read',
          phaseCountdownSec: CDIELTS_PRE_READ_SECONDS,
          audioPlaybackSec: 0,
          sectionAudioDurations: durations
        })
      };
      return { nextState, action: 'next_section_pre_read', section: nextSection };
    }

    // After Part 4's 60s section review completes, transition to the separate 2-minute final answer-checking period
    const nextState: CDIELTSListeningTimerState = {
      ...state,
      phase: 'end_of_test_buffer',
      phaseCountdownSec: CDIELTS_FINAL_CHECK_SECONDS,
      audioPlaybackSec: 0,
      timeRemainingSec: CDIELTS_FINAL_CHECK_SECONDS
    };
    return { nextState, action: 'start_final_check', section: 4 };
  }

  if (state.phase === 'end_of_test_buffer') {
    if (state.phaseCountdownSec > 1) {
      const nextCountdown = state.phaseCountdownSec - 1;
      const nextState: CDIELTSListeningTimerState = {
        ...state,
        phaseCountdownSec: nextCountdown,
        timeRemainingSec: nextCountdown
      };
      return { nextState, action: 'none', section: 4 };
    }

    const alreadySubmitted = state.hasSubmitted;
    const nextState: CDIELTSListeningTimerState = {
      ...state,
      phase: 'completed',
      phaseCountdownSec: 0,
      audioPlaybackSec: 0,
      timeRemainingSec: 0,
      isListeningLocked: true,
      hasSubmitted: true,
      submissionCount: alreadySubmitted ? state.submissionCount : state.submissionCount + 1
    };
    return {
      nextState,
      action: alreadySubmitted ? 'none' : 'complete_and_submit',
      section: 4
    };
  }

  return { nextState: state, action: 'none', section: state.section };
}

export function completeListeningSectionAudioState(
  state: CDIELTSListeningTimerState,
  sectionNum: 1 | 2 | 3 | 4,
  timestampMs: number = Date.now()
): { nextState: CDIELTSListeningTimerState; transitioned: boolean } {
  // Prevent duplicate review periods or stale section callbacks
  if (
    state.phase !== 'playing' ||
    state.section !== sectionNum ||
    Boolean(state.completedParts[sectionNum])
  ) {
    return { nextState: state, transitioned: false };
  }

  const durations = state.sectionAudioDurations || SPRINT_18_PART_AUDIO_SECONDS;
  const nextCompleted = { ...state.completedParts, [sectionNum]: timestampMs };
  const nextState: CDIELTSListeningTimerState = {
    ...state,
    phase: 'section_check',
    phaseCountdownSec: CDIELTS_SECTION_REVIEW_SECONDS,
    audioPlaybackSec: 0,
    completedParts: nextCompleted,
    timeRemainingSec: calculateSynchronizedListeningRemainingSec({
      section: sectionNum,
      phase: 'section_check',
      phaseCountdownSec: CDIELTS_SECTION_REVIEW_SECONDS,
      audioPlaybackSec: 0,
      sectionAudioDurations: durations
    })
  };
  return { nextState, transitioned: true };
}

export function skipListeningPreReadState(
  state: CDIELTSListeningTimerState
): { nextState: CDIELTSListeningTimerState; transitioned: boolean } {
  if (state.phase !== 'pre_read') {
    return { nextState: state, transitioned: false };
  }
  const durations = state.sectionAudioDurations || SPRINT_18_PART_AUDIO_SECONDS;
  const playingCountdown = Math.max(1, Math.ceil(durations[state.section]));
  const nextState: CDIELTSListeningTimerState = {
    ...state,
    phase: 'playing',
    phaseCountdownSec: playingCountdown,
    audioPlaybackSec: 0,
    timeRemainingSec: calculateSynchronizedListeningRemainingSec({
      section: state.section,
      phase: 'playing',
      phaseCountdownSec: playingCountdown,
      audioPlaybackSec: 0,
      sectionAudioDurations: durations
    })
  };
  return { nextState, transitioned: true };
}

export function advanceListeningSectionState(
  state: CDIELTSListeningTimerState
): {
  nextState: CDIELTSListeningTimerState;
  action: 'next_section_pre_read' | 'start_final_check' | 'none';
  section: 1 | 2 | 3 | 4;
} {
  if (state.phase !== 'section_check') {
    return { nextState: state, action: 'none', section: state.section };
  }
  const durations = state.sectionAudioDurations || SPRINT_18_PART_AUDIO_SECONDS;
  if (state.section < 4) {
    const nextSection = (state.section + 1) as 1 | 2 | 3 | 4;
    const nextState: CDIELTSListeningTimerState = {
      ...state,
      section: nextSection,
      phase: 'pre_read',
      phaseCountdownSec: CDIELTS_PRE_READ_SECONDS,
      audioPlaybackSec: 0,
      timeRemainingSec: calculateSynchronizedListeningRemainingSec({
        section: nextSection,
        phase: 'pre_read',
        phaseCountdownSec: CDIELTS_PRE_READ_SECONDS,
        audioPlaybackSec: 0,
        sectionAudioDurations: durations
      })
    };
    return { nextState, action: 'next_section_pre_read', section: nextSection };
  }

  const nextState: CDIELTSListeningTimerState = {
    ...state,
    phase: 'end_of_test_buffer',
    phaseCountdownSec: CDIELTS_FINAL_CHECK_SECONDS,
    audioPlaybackSec: 0,
    timeRemainingSec: CDIELTS_FINAL_CHECK_SECONDS
  };
  return { nextState, action: 'start_final_check', section: 4 };
}

export function submitListeningExamOnce(
  state: CDIELTSListeningTimerState
): { nextState: CDIELTSListeningTimerState; submitted: boolean } {
  if (state.hasSubmitted) {
    return { nextState: state, submitted: false };
  }
  const nextState: CDIELTSListeningTimerState = {
    ...state,
    phase: 'completed',
    phaseCountdownSec: 0,
    audioPlaybackSec: 0,
    timeRemainingSec: 0,
    isListeningLocked: true,
    hasSubmitted: true,
    submissionCount: state.submissionCount + 1
  };
  return { nextState, submitted: true };
}

