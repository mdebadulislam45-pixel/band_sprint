import {
  DAILY_MASTERY_EXAM_QUESTIONS,
  DAILY_SPEAKING_CONFIDENCE_CARDS,
  DAILY_SPRINT_GRAMMAR_RULES,
  DAILY_SPRINT_IDIOMS,
  DAILY_SPRINT_PHRASES,
  DAILY_SPRINT_SPELLING_TARGETS,
  DAILY_SPRINT_VOCABULARY,
  DailyMasteryExamQuestion,
  DailySpeakingConfidenceCard,
  DailySprintGrammarRule,
  DailySprintIdiomItem,
  DailySprintPhraseItem,
  DailySprintSpellingItem,
  DailySprintVocabItem,
  SprintQuotaTier
} from '../data/dailyBanglaSprintData';
import { MASTER_1000_VOCAB_DATABASE } from '../data/masterVocabDatabase';
import { C1_IDIOMS_AND_PHRASES } from '../data/c1IdiomsAndPhrasesData';
import { IELTS_SPELLING_TRAPS } from '../data/ieltsSpellingData';
import { IELTS_GRAMMAR_DATA } from '../data/grammarData';
import { loadDiagnosticResult, DiagnosticSkill } from '../services/diagnosticResultStore';
import { loadOnboardingSurvey, WEAK_SKILL_META } from '../services/onboardingSurveyStore';
import { getMistakes } from './vaultStorage';
import { aggregateExamHistory } from './historyAggregation';
import {
  DailySprintProgressState,
  getTodayDateKey,
  isReviewItemDueToday
} from './dailySprintProgressStore';
import { UserProfile, MistakeItem } from '../types';
import {
  AdaptiveDifficultyTier,
  AdaptivePathSummary,
  buildVaultFrequencyProfile,
  loadDifficultyPreference,
  prioritizeDailyGrammar,
  prioritizeDailyVocabulary
} from './adaptiveLearningPath';

export type SmartSprintTabId = 'vocabulary' | 'idioms' | 'phrases' | 'spelling' | 'grammar';

export interface SmartSprintBrief {
  dateKey: string;
  weakestSkill: DiagnosticSkill;
  weakestLabel: string;
  recommendedPreset: '15_5' | '25_5' | '50_10';
  recommendedPresetReason: string;
  recommendedTab: SmartSprintTabId;
  recommendedTabReason: string;
  coachHeadline: string;
  dueReviewCount: number;
  vaultMistakeCount: number;
  dailyGoalMinutes: number;
  todayReadinessPct: number;
}

export interface DailySprintRotatedPools {
  cycleLabel: string;
  vocabulary: DailySprintVocabItem[];
  idioms: DailySprintIdiomItem[];
  phrases: DailySprintPhraseItem[];
  spelling: DailySprintSpellingItem[];
  grammar: DailySprintGrammarRule[];
  speakingCards: DailySpeakingConfidenceCard[];
  adaptivePath: AdaptivePathSummary;
}

// =============================================================================
// 1. EXPANDED BANGLA-ENRICHED POOLS (ROTATED DETERMINISTICALLY BY DATE)
// =============================================================================

let cachedFullVocabPool: DailySprintVocabItem[] | null = null;
let cachedFullIdiomPool: DailySprintIdiomItem[] | null = null;
let cachedFullPhrasePool: DailySprintPhraseItem[] | null = null;
let cachedFullSpellingPool: DailySprintSpellingItem[] | null = null;
let cachedFullGrammarPool: DailySprintGrammarRule[] | null = null;

function mapPos(raw?: string): DailySprintVocabItem['pos'] {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('verb') && !lower.includes('adverb')) return 'Verb';
  if (lower.includes('adj')) return 'Adjective';
  if (lower.includes('adv')) return 'Adverb';
  return 'Noun';
}

function mapBandLevel(cefr?: string): DailySprintVocabItem['bandLevel'] {
  if (cefr === 'C2') return 'Band 9.0';
  if (cefr === 'C1') return 'Band 8.5';
  if (cefr === 'B2') return 'Band 8.0';
  return 'Band 7.5';
}

export function getFullVocabPool(): DailySprintVocabItem[] {
  if (cachedFullVocabPool) return cachedFullVocabPool;
  const seenWords = new Set<string>(
    DAILY_SPRINT_VOCABULARY.map((v) => v.word.trim().toLowerCase())
  );
  const extras: DailySprintVocabItem[] = [];

  for (const card of MASTER_1000_VOCAB_DATABASE) {
    const cleanWord = (card.item || '').trim();
    if (
      !cleanWord ||
      cleanWord.includes('(Application') ||
      cleanWord.includes(' ') ||
      seenWords.has(cleanWord.toLowerCase()) ||
      !card.banglaMeaning
    ) {
      continue;
    }
    seenWords.add(cleanWord.toLowerCase());
    extras.push({
      id: `mv_${card.id}`,
      word: cleanWord,
      phonetic: card.banglaPronunciation ? `[${card.banglaPronunciation}]` : `/${cleanWord.toLowerCase()}/`,
      pos: mapPos(card.partOfSpeech),
      bandLevel: mapBandLevel(card.cefr),
      banglaMeaning: card.banglaMeaning,
      englishDefinition: card.definition || `Academic ${card.topic} term for IELTS precision.`,
      synonyms:
        Array.isArray(card.synonyms) && card.synonyms.length > 0
          ? card.synonyms.slice(0, 4)
          : ['Substantial', 'Notable'],
      exampleSentence:
        card.exampleSentence ||
        `In IELTS ${card.topic}, "${cleanWord.toLowerCase()}" conveys nuanced academic precision.`,
      banglaTip:
        card.ieltsUsage ||
        card.commonMistakes ||
        `${card.topic} বিষয়ক Task 2 ও Speaking Part 3-তে ব্যবহার উপযোগী শব্দ।`
    });
    if (extras.length >= 100) break;
  }

  cachedFullVocabPool = [...DAILY_SPRINT_VOCABULARY, ...extras];
  return cachedFullVocabPool;
}

export function getFullIdiomPool(): DailySprintIdiomItem[] {
  if (cachedFullIdiomPool) return cachedFullIdiomPool;
  const seen = new Set<string>(DAILY_SPRINT_IDIOMS.map((i) => i.idiom.trim().toLowerCase()));
  const extras: DailySprintIdiomItem[] = [];

  for (const entry of C1_IDIOMS_AND_PHRASES) {
    const isIdiomLike =
      entry.type === 'Idiom' || entry.type === 'Phrasal idiom' || entry.type === 'Verb/Idiom';
    if (!isIdiomLike) continue;
    const label = entry.phrase.trim();
    if (!label || seen.has(label.toLowerCase()) || !entry.banglaMeaning) continue;
    seen.add(label.toLowerCase());
    extras.push({
      id: `ci_i_${entry.id}`,
      idiom: label,
      banglaMeaning: entry.banglaMeaning,
      naturalMeaning:
        entry.category === 'Action & Problem'
          ? 'Natural idiomatic expression for describing challenges or solutions.'
          : 'Natural C1 conversational idiom for fluent IELTS Speaking.',
      usageTip: `${entry.ieltsSuitability} · ${entry.category} context`,
      exampleSentence: entry.exampleSentence,
      speakingPart: entry.ieltsSuitability.includes('Writing') ? 'Part 3' : 'Parts 2 & 3'
    });
    if (extras.length >= 50) break;
  }

  cachedFullIdiomPool = [...DAILY_SPRINT_IDIOMS, ...extras];
  return cachedFullIdiomPool;
}

export function getFullPhrasePool(): DailySprintPhraseItem[] {
  if (cachedFullPhrasePool) return cachedFullPhrasePool;
  const seen = new Set<string>(DAILY_SPRINT_PHRASES.map((p) => p.phrase.trim().toLowerCase()));
  const extras: DailySprintPhraseItem[] = [];

  for (const entry of C1_IDIOMS_AND_PHRASES) {
    const isPhraseLike =
      entry.type === 'Phrase' || entry.type === 'Collocation' || entry.type === 'Adjective/Phrase';
    if (!isPhraseLike) continue;
    const label = entry.phrase.trim();
    if (!label || seen.has(label.toLowerCase()) || !entry.banglaMeaning) continue;
    seen.add(label.toLowerCase());
    extras.push({
      id: `ci_p_${entry.id}`,
      phrase: label,
      category: entry.ieltsSuitability.includes('Writing') ? 'Writing Task 2' : 'Speaking Part 3',
      banglaMeaning: entry.banglaMeaning,
      englishFunction: `High-band ${entry.category.toLowerCase()} expression (${entry.ieltsSuitability}).`,
      synonyms: [entry.category, entry.cefrLevel || 'C1'],
      exampleSentence: entry.exampleSentence
    });
    if (extras.length >= 50) break;
  }

  cachedFullPhrasePool = [...DAILY_SPRINT_PHRASES, ...extras];
  return cachedFullPhrasePool;
}

export function getFullSpellingPool(): DailySprintSpellingItem[] {
  if (cachedFullSpellingPool) return cachedFullSpellingPool;
  const seen = new Set<string>(DAILY_SPRINT_SPELLING_TARGETS.map((s) => s.word.trim().toLowerCase()));
  const extras: DailySprintSpellingItem[] = [];

  for (const item of IELTS_SPELLING_TRAPS) {
    const w = item.word.trim();
    if (!w || seen.has(w.toLowerCase()) || !item.meaning_bn) continue;
    seen.add(w.toLowerCase());
    extras.push({
      id: `sp_${item.id}`,
      word: w,
      phonetic: item.phonetic || `/${w.toLowerCase()}/`,
      banglaMeaning: item.meaning_bn,
      trapNote: item.memoryTrick_bn || item.memoryTrick || item.hint,
      sectionContext:
        item.category === 'Listening Traps'
          ? 'Listening Sec 1'
          : item.category === 'Academic Writing'
          ? 'Writing Task 2'
          : 'Listening Sec 3'
    });
    if (extras.length >= 160) break;
  }

  cachedFullSpellingPool = [...DAILY_SPRINT_SPELLING_TARGETS, ...extras];
  return cachedFullSpellingPool;
}

export function getFullGrammarPool(): DailySprintGrammarRule[] {
  if (cachedFullGrammarPool) return cachedFullGrammarPool;
  const seen = new Set<string>(DAILY_SPRINT_GRAMMAR_RULES.map((g) => g.title.toLowerCase()));
  const extras: DailySprintGrammarRule[] = [];

  for (const rule of IELTS_GRAMMAR_DATA) {
    if (seen.has(rule.title.toLowerCase())) continue;
    seen.add(rule.title.toLowerCase());
    extras.push({
      id: `gr_${rule.id}`,
      title: rule.title,
      bandImpact: rule.bandTarget,
      englishExplanation: rule.explanation_en,
      banglaExplanation: rule.explanation_bn,
      commonMistake: rule.weakExample,
      band8Correction: rule.bandBoostExample,
      whyItMattersBangla: rule.memoryTrick_bn || rule.commonTrap,
      quickCheck: {
        question: rule.practiceQuestion.question,
        options: rule.practiceQuestion.options,
        correctIndex: rule.practiceQuestion.correctIndex,
        explanationBangla: rule.practiceQuestion.explanation
      }
    });
  }

  cachedFullGrammarPool = [...DAILY_SPRINT_GRAMMAR_RULES, ...extras];
  return cachedFullGrammarPool;
}

// =============================================================================
// 2. DETERMINISTIC DAILY ROTATION + SMART PERSONALIZED ORDERING
// =============================================================================

export function getDayNumberFromDateKey(dateKey: string = getTodayDateKey()): number {
  const parsed = Date.parse(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(parsed)) return 0;
  return Math.floor(parsed / (1000 * 60 * 60 * 24));
}

function rotateSlice<T>(items: T[], count: number, offsetSteps: number): T[] {
  if (items.length <= count) return items.slice(0, count);
  const start = ((offsetSteps % items.length) + items.length) % items.length;
  const out: T[] = [];
  for (let i = 0; i < count; i++) {
    out.push(items[(start + i) % items.length]);
  }
  return out;
}

export function getRotatedDailySprintPools(
  quotaTier: SprintQuotaTier,
  dateKey: string = getTodayDateKey(),
  manualCycleOffset: number = 0,
  adaptiveOptions?: {
    difficultyTier?: AdaptiveDifficultyTier;
    mistakes?: MistakeItem[];
    reviewSchedule?: DailySprintProgressState['reviewSchedule'];
  }
): DailySprintRotatedPools {
  const vocabCount = quotaTier === 'standard' ? 20 : 10;
  const idiomCount = quotaTier === 'standard' ? 10 : 5;
  const phraseCount = quotaTier === 'standard' ? 10 : 5;
  const spellingCount = quotaTier === 'standard' ? 40 : 20;
  const grammarCount = quotaTier === 'standard' ? 6 : 4;

  // Deterministic day offset so sets refresh cleanly each day while staying stable throughout that day
  const dayNum = getDayNumberFromDateKey(dateKey);
  const stepIndex = Math.max(0, (dayNum % 7) + manualCycleOffset);

  const vocabPool = getFullVocabPool();
  const idiomPool = getFullIdiomPool();
  const phrasePool = getFullPhrasePool();
  const spellingPool = getFullSpellingPool();
  const grammarPool = getFullGrammarPool();

  const pref = loadDifficultyPreference();
  const activeDifficulty: AdaptiveDifficultyTier =
    adaptiveOptions?.difficultyTier ?? (pref === 'auto' ? 'balanced' : pref);

  const baselineVocab = rotateSlice(vocabPool, vocabCount, stepIndex * 10);
  const baselineGrammar = rotateSlice(grammarPool, grammarCount, stepIndex * 2);

  const prioritizedVocab = prioritizeDailyVocabulary(
    vocabPool,
    baselineVocab,
    vocabCount,
    activeDifficulty,
    adaptiveOptions?.mistakes,
    adaptiveOptions?.reviewSchedule
  );

  const prioritizedGrammar = prioritizeDailyGrammar(
    grammarPool,
    baselineGrammar,
    grammarCount,
    activeDifficulty,
    adaptiveOptions?.mistakes,
    adaptiveOptions?.reviewSchedule
  );

  const vaultProfile = buildVaultFrequencyProfile(
    adaptiveOptions?.mistakes,
    adaptiveOptions?.reviewSchedule
  );

  const adaptivePath: AdaptivePathSummary = {
    difficultyTier: activeDifficulty,
    prioritizedVocabIds: prioritizedVocab.prioritizedIds,
    prioritizedGrammarIds: prioritizedGrammar.prioritizedIds,
    priorityByItemId: {
      ...prioritizedVocab.priorityReasons,
      ...prioritizedGrammar.priorityReasons
    },
    topErrorClusters: vaultProfile.clusters.slice(0, 5),
    totalVaultMistakesAnalyzed: vaultProfile.totalAnalyzed
  };

  return {
    cycleLabel:
      manualCycleOffset > 0
        ? `Bonus Rotation #${manualCycleOffset + 1}`
        : prioritizedVocab.prioritizedIds.length > 0 || prioritizedGrammar.prioritizedIds.length > 0
        ? `Adaptive Vault Path · ${dateKey}`
        : `Daily Adaptive Set · ${dateKey}`,
    vocabulary: prioritizedVocab.items,
    idioms: rotateSlice(idiomPool, idiomCount, stepIndex * 5),
    phrases: rotateSlice(phrasePool, phraseCount, stepIndex * 5),
    spelling: rotateSlice(spellingPool, spellingCount, stepIndex * 20),
    grammar: prioritizedGrammar.items,
    speakingCards: rotateSlice(DAILY_SPEAKING_CONFIDENCE_CARDS, DAILY_SPEAKING_CONFIDENCE_CARDS.length, stepIndex),
    adaptivePath
  };
}

// =============================================================================
// 3. SMART DIAGNOSIS & ADAPTIVE SPRINT BRIEFING
// =============================================================================

export function computeSmartSprintBrief(
  user: UserProfile | null | undefined,
  sprintState: DailySprintProgressState
): SmartSprintBrief {
  const diagnostic = loadDiagnosticResult();
  const survey = loadOnboardingSurvey();
  const agg = aggregateExamHistory(user?.progress?.examHistory || []);
  const dateKey = getTodayDateKey();

  // Identify weakest skill across Latest Exam History -> Diagnostic -> Survey -> Default Writing
  const skillPairs: Array<[DiagnosticSkill, number | null]> = [
    ['listening', agg.skills.listening.latest ?? diagnostic?.scores?.listening ?? null],
    ['reading', agg.skills.reading.latest ?? diagnostic?.scores?.reading ?? null],
    ['writing', agg.skills.writing.latest ?? diagnostic?.scores?.writing ?? null],
    ['speaking', agg.skills.speaking.latest ?? diagnostic?.scores?.speaking ?? null]
  ];
  const scored = skillPairs.filter((pair): pair is [DiagnosticSkill, number] => pair[1] !== null);
  let weakestSkill: DiagnosticSkill =
    diagnostic?.weakest ||
    (user?.progress?.weakestSkill as DiagnosticSkill | undefined) ||
    (survey?.weakestSkill as DiagnosticSkill | undefined) ||
    'writing';
  if (scored.length > 0) {
    scored.sort((a, b) => a[1] - b[1]);
    weakestSkill = scored[0][0];
  }

  const weakestLabel = WEAK_SKILL_META[weakestSkill]?.label || 'Writing';

  let vaultMistakeCount = 0;
  let topVaultModule: string | null = null;
  try {
    const unresolved = getMistakes().filter((m) => !m.mastered);
    vaultMistakeCount = unresolved.length;
    if (unresolved.length > 0) {
      const counts: Record<string, number> = {};
      unresolved.forEach((m) => {
        counts[m.module] = (counts[m.module] || 0) + 1;
      });
      topVaultModule = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    }
  } catch {}

  const dueReviewCount = sprintState.reviewQueueIds.filter((id) =>
    isReviewItemDueToday(sprintState.reviewSchedule[id])
  ).length;

  const dailyGoalMinutes =
    diagnostic?.dailyMinutes || user?.progress?.dailyMinutes || survey?.dailyMinutes || 30;

  // Smart Pomodoro Preset recommendation
  let recommendedPreset: SmartSprintBrief['recommendedPreset'] = '25_5';
  let recommendedPresetReason = '25/5 classic focus rhythm matches balanced IELTS retention.';
  if (dailyGoalMinutes <= 25 || dueReviewCount >= 5) {
    recommendedPreset = '15_5';
    recommendedPresetReason =
      dueReviewCount >= 5
        ? `${dueReviewCount} due recall cards — a sharp 15m warm-up clears backlog fast.`
        : `Matches your ${dailyGoalMinutes}m/day pace without fatigue.`;
  } else if (dailyGoalMinutes >= 60) {
    recommendedPreset = '50_10';
    recommendedPresetReason = `Deep 50m block aligned to your ${dailyGoalMinutes}m/day Band target.`;
  }

  // Smart Tab Priority based on Weakest Skill + Top Mistake Vault Pattern
  let recommendedTab: SmartSprintTabId = 'vocabulary';
  let recommendedTabReason = 'Boost Lexical Resource across Writing & Speaking.';
  if (weakestSkill === 'writing' || topVaultModule === 'writing') {
    recommendedTab = 'grammar';
    recommendedTabReason = 'Writing priority: lock in Band 8+ grammar & cohesion fixes first.';
  } else if (weakestSkill === 'listening' || topVaultModule === 'listening') {
    recommendedTab = 'spelling';
    recommendedTabReason = 'Listening priority: eliminate double-letter & silent-letter spelling losses.';
  } else if (weakestSkill === 'speaking' || topVaultModule === 'speaking') {
    recommendedTab = 'idioms';
    recommendedTabReason = 'Speaking priority: practise natural Part 2 & 3 idioms with audio.';
  } else if (weakestSkill === 'reading' || topVaultModule === 'reading') {
    recommendedTab = 'vocabulary';
    recommendedTabReason = 'Reading priority: master C1 academic synonyms for TFNG & paraphrasing.';
  }

  let coachHeadline = recommendedTabReason;
  if (dueReviewCount > 0) {
    coachHeadline = `Start with ${dueReviewCount} due review ${dueReviewCount === 1 ? 'card' : 'cards'}${vaultMistakeCount > 0 ? ` (${vaultMistakeCount} from Mistake Vault)` : ''}, then target ${weakestLabel} (${recommendedTab}).`;
  } else if (sprintState.pomodoroBlocksCompleted === 0) {
    coachHeadline = `Recommended first: ${recommendedTab.charAt(0).toUpperCase() + recommendedTab.slice(1)} sprint (${recommendedPreset.replace('_', '/')}m) for ${weakestLabel}.`;
  }

  // Compute today's smart readiness percentage (Pomodoro + Targets + Clear SR Queue)
  const quotaTargetCount = sprintState.quotaTier === 'standard' ? 86 : 44;
  const doneCount =
    sprintState.masteredVocabIds.length +
    sprintState.masteredIdiomIds.length +
    sprintState.masteredPhraseIds.length +
    sprintState.masteredSpellingIds.length +
    sprintState.masteredGrammarIds.length;
  const targetRatio = Math.min(1, doneCount / Math.max(1, quotaTargetCount));
  const focusRatio = Math.min(1, sprintState.pomodoroFocusMinutesLogged / Math.max(15, dailyGoalMinutes));
  const examBonus = sprintState.lastExamSummary?.dateKey === dateKey ? 0.2 : 0;
  const todayReadinessPct = Math.min(
    100,
    Math.round((targetRatio * 0.45 + focusRatio * 0.35 + examBonus) * 100)
  );

  return {
    dateKey,
    weakestSkill,
    weakestLabel,
    recommendedPreset,
    recommendedPresetReason,
    recommendedTab,
    recommendedTabReason,
    coachHeadline,
    dueReviewCount,
    vaultMistakeCount,
    dailyGoalMinutes,
    todayReadinessPct
  };
}

// =============================================================================
// 4. DYNAMIC MASTERY EXAM BUILDER & ID RESOLVER (SMART SPACED-REPETITION LOOP)
// =============================================================================

function createSpellingMisspellingDistractors(word: string): string[] {
  const lower = word.toLowerCase();
  const candidates = new Set<string>();
  // Common IELTS mistakes: drop a double letter, swap ie/ei, swap e/a
  const collapsed = lower.replace(/([a-z])\1/, '$1');
  if (collapsed !== lower) candidates.add(collapsed);
  if (lower.includes('ie')) candidates.add(lower.replace('ie', 'ei'));
  if (lower.includes('ei')) candidates.add(lower.replace('ei', 'ie'));
  if (lower.includes('ence')) candidates.add(lower.replace('ence', 'ance'));
  if (lower.includes('ance')) candidates.add(lower.replace('ance', 'ence'));
  if (lower.includes('able')) candidates.add(lower.replace('able', 'ible'));
  if (lower.includes('ible')) candidates.add(lower.replace('ible', 'able'));
  if (lower.includes('n')) candidates.add(lower.replace(/n([aeiou])/i, '$1'));
  if (lower.length > 5) candidates.add(lower.slice(0, -1));
  candidates.add(`${lower}e`);

  const list = Array.from(candidates).filter((c) => c !== lower && c.length >= 4);
  while (list.length < 3) {
    list.push(`${lower.slice(0, Math.max(3, lower.length - 2))}et`);
  }
  return list.slice(0, 3);
}

function buildQuestionFromVocab(item: DailySprintVocabItem, allPool: DailySprintVocabItem[]): DailyMasteryExamQuestion {
  const distractors = allPool
    .filter((v) => v.id !== item.id && v.word !== item.word)
    .slice(0, 3)
    .map((v) => v.word);
  const options = [item.word, ...distractors];
  const shift = item.word.length % options.length;
  const rotated = [...options.slice(shift), ...options.slice(0, shift)];
  const correctIndex = rotated.indexOf(item.word);

  return {
    id: `dyn_v_${item.id}`,
    section: 'vocabulary',
    sectionLabel: 'Vocabulary & Synonyms',
    prompt: `Choose the Band 8+ academic word matching "${item.englishDefinition}" (Synonyms: ${item.synonyms.slice(0, 2).join(', ')}):`,
    options: rotated,
    correctIndex,
    targetTerm: item.word,
    banglaMeaning: item.banglaMeaning,
    explanationEnglish: `"${item.word}" means: ${item.englishDefinition}`,
    explanationBangla: `"${item.word}" অর্থ: ${item.banglaMeaning}। ${item.banglaTip}`
  };
}

function buildQuestionFromIdiom(item: DailySprintIdiomItem, allPool: DailySprintIdiomItem[]): DailyMasteryExamQuestion {
  const distractors = allPool
    .filter((i) => i.id !== item.id && i.idiom !== item.idiom)
    .slice(0, 3)
    .map((i) => i.idiom);
  const options = [item.idiom, ...distractors];
  const shift = item.idiom.length % options.length;
  const rotated = [...options.slice(shift), ...options.slice(0, shift)];
  const correctIndex = rotated.indexOf(item.idiom);

  return {
    id: `dyn_i_${item.id}`,
    section: 'idioms_phrases',
    sectionLabel: 'Idioms & Collocations',
    prompt: `Which natural ${item.speakingPart} idiom means "${item.naturalMeaning}"?`,
    options: rotated,
    correctIndex,
    targetTerm: item.idiom,
    banglaMeaning: item.banglaMeaning,
    explanationEnglish: `"${item.idiom}" (${item.speakingPart}): ${item.usageTip}`,
    explanationBangla: `"${item.idiom}" অর্থ: ${item.banglaMeaning}। উদাহরণ: "${item.exampleSentence}"`
  };
}

function buildQuestionFromSpelling(item: DailySprintSpellingItem): DailyMasteryExamQuestion {
  const distractors = createSpellingMisspellingDistractors(item.word);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const target = cap(item.word);
  const options = [target, ...distractors.map(cap)];
  const shift = item.word.length % options.length;
  const rotated = [...options.slice(shift), ...options.slice(0, shift)];
  const correctIndex = rotated.indexOf(target);

  return {
    id: `dyn_s_${item.id}`,
    section: 'spelling',
    sectionLabel: 'IELTS Spelling Accuracy',
    prompt: `Select the 100% accurate ${item.sectionContext} spelling for "${item.banglaMeaning}" (${item.phonetic}):`,
    options: rotated,
    correctIndex,
    targetTerm: item.word,
    banglaMeaning: item.banglaMeaning,
    explanationEnglish: `Accurate spelling: "${item.word}".`,
    explanationBangla: `${item.word} — ${item.trapNote}`
  };
}

function buildQuestionFromGrammar(rule: DailySprintGrammarRule): DailyMasteryExamQuestion {
  return {
    id: `dyn_g_${rule.id}`,
    section: 'grammar',
    sectionLabel: 'IELTS Grammar Mastery',
    prompt: `${rule.title}: ${rule.quickCheck.question}`,
    options: rule.quickCheck.options,
    correctIndex: rule.quickCheck.correctIndex,
    targetTerm: rule.title,
    banglaMeaning: rule.whyItMattersBangla,
    explanationEnglish: rule.englishExplanation,
    explanationBangla: rule.quickCheck.explanationBangla || rule.banglaExplanation
  };
}

function buildQuestionFromVaultMistake(questionId: string, m: ReturnType<typeof getMistakes>[number]): DailyMasteryExamQuestion {
  const section: DailyMasteryExamQuestion['section'] =
    m.module === 'writing'
      ? 'grammar'
      : m.module === 'speaking'
      ? 'idioms_phrases'
      : m.module === 'listening'
      ? 'spelling'
      : 'vocabulary';

  const correctAns = (m.correctAnswer || 'Apply Band 8+ precision').trim();
  const wrongCandidate = (m.userWrongAnswer || m.userAnswer || '').trim();

  const optionSet = new Set<string>([correctAns]);
  if (
    wrongCandidate &&
    wrongCandidate !== '—' &&
    wrongCandidate !== '(Unanswered)' &&
    wrongCandidate.toLowerCase() !== correctAns.toLowerCase() &&
    wrongCandidate.length <= 120
  ) {
    optionSet.add(wrongCandidate);
  }

  if (m.module === 'reading' && ['TRUE', 'FALSE', 'NOT GIVEN'].includes(correctAns.toUpperCase())) {
    for (const tf of ['TRUE', 'FALSE', 'NOT GIVEN']) {
      optionSet.add(tf);
    }
    optionSet.add('CANNOT BE INFERRED');
  } else if (section === 'spelling' && !correctAns.includes(' ') && correctAns.length >= 4) {
    for (const d of createSpellingMisspellingDistractors(correctAns)) {
      optionSet.add(d);
    }
  } else {
    const fallbackDistractors =
      m.module === 'writing'
        ? [
            'Keep repetitive conversational phrases and basic linkers.',
            'Combine contrasting linkers like "Furthermore, on the other hand".',
            'Use informal abbreviations and vague quantifiers like "a lot of things".'
          ]
        : m.module === 'speaking'
        ? [
            'Use hesitation fillers ("um", "you know") while searching for vocabulary.',
            'Repeat simple adjectives like "good" and "big" throughout Part 3.',
            'Memorize rigid scripted openings unrelated to the cue card.'
          ]
        : [
            'Accept the speaker’s initial statement before any self-correction cue.',
            'Match isolated keywords even if the passage meaning contradicts them.',
            'Assume extra background knowledge not explicitly written in the text.'
          ];
    for (const fd of fallbackDistractors) {
      if (optionSet.size >= 4) break;
      optionSet.add(fd);
    }
  }

  const rawOptions = Array.from(optionSet).slice(0, 4);
  const shift = correctAns.length % Math.max(1, rawOptions.length);
  const rotated = [...rawOptions.slice(shift), ...rawOptions.slice(0, shift)];
  const correctIndex = Math.max(0, rotated.indexOf(correctAns));

  const shortTitle = m.title.length > 68 ? `${m.title.slice(0, 68)}…` : m.title;
  const banglaNote =
    m.trapExplanationBn ||
    (m.module === 'writing'
      ? `Writing ভুল সংশোধন: "${correctAns}" ফর্মটি নিয়মিত চর্চা করলে GRA ও LR ব্যান্ড বাড়বে।`
      : m.module === 'speaking'
      ? `Speaking টিপস: জড়তা কাটিয়ে "${correctAns}"-এর মতো স্বাভাবিক C1 এক্সপ্রেশন ব্যবহার করুন।`
      : `সঠিক উত্তর "${correctAns}"। প্রশ্নের মূল ফাঁদ ও প্যারাফ্রেজ ভালোভাবে লক্ষ্য করুন।`);

  return {
    id: questionId,
    section,
    sectionLabel: `${m.module.toUpperCase()} Vault · ${m.questionType || 'Smart Review'}`,
    prompt: m.prompt ? `${shortTitle} — ${m.prompt}` : shortTitle,
    options: rotated,
    correctIndex,
    targetTerm: shortTitle,
    banglaMeaning: banglaNote,
    explanationEnglish: m.trapExplanationEn || m.explanation || `Correct target: "${correctAns}".`,
    explanationBangla: banglaNote
  };
}

export function resolveSmartExamQuestionById(questionId: string): DailyMasteryExamQuestion | null {
  const staticFound = DAILY_MASTERY_EXAM_QUESTIONS.find((q) => q.id === questionId);
  if (staticFound) return staticFound;

  if (questionId.startsWith('vault_')) {
    const rawVaultId = questionId.slice(6);
    try {
      const m = getMistakes().find((item) => item.id === rawVaultId);
      if (m) return buildQuestionFromVaultMistake(questionId, m);
    } catch {}
  }

  if (questionId.startsWith('dyn_v_')) {
    const rawId = questionId.slice(6);
    const pool = getFullVocabPool();
    const item = pool.find((v) => v.id === rawId);
    if (item) return buildQuestionFromVocab(item, pool);
  }
  if (questionId.startsWith('dyn_i_')) {
    const rawId = questionId.slice(6);
    const pool = getFullIdiomPool();
    const item = pool.find((i) => i.id === rawId);
    if (item) return buildQuestionFromIdiom(item, pool);
  }
  if (questionId.startsWith('dyn_s_')) {
    const rawId = questionId.slice(6);
    const pool = getFullSpellingPool();
    const item = pool.find((s) => s.id === rawId);
    if (item) return buildQuestionFromSpelling(item);
  }
  if (questionId.startsWith('dyn_g_')) {
    const rawId = questionId.slice(6);
    const pool = getFullGrammarPool();
    const item = pool.find((g) => g.id === rawId);
    if (item) return buildQuestionFromGrammar(item);
  }
  return null;
}

export function buildSmartMasteryExamQuestions(
  pools: DailySprintRotatedPools,
  sprintState: DailySprintProgressState
): DailyMasteryExamQuestion[] {
  const fullVocab = getFullVocabPool();
  const fullIdioms = getFullIdiomPool();

  const dueRecallQuestions = sprintState.reviewQueueIds
    .filter((id) => isReviewItemDueToday(sprintState.reviewSchedule[id]))
    .map((id) => resolveSmartExamQuestionById(id))
    .filter((q): q is DailyMasteryExamQuestion => Boolean(q));

  const pickedVocab: DailyMasteryExamQuestion[] = [];
  const pickedIdioms: DailyMasteryExamQuestion[] = [];
  const pickedSpelling: DailyMasteryExamQuestion[] = [];
  const pickedGrammar: DailyMasteryExamQuestion[] = [];

  for (const dq of dueRecallQuestions) {
    if (dq.section === 'vocabulary' && pickedVocab.length < 2) pickedVocab.push(dq);
    if (dq.section === 'idioms_phrases' && pickedIdioms.length < 2) pickedIdioms.push(dq);
    if (dq.section === 'spelling' && pickedSpelling.length < 2) pickedSpelling.push(dq);
    if (dq.section === 'grammar' && pickedGrammar.length < 2) pickedGrammar.push(dq);
  }

  const pushUnique = (list: DailyMasteryExamQuestion[], q: DailyMasteryExamQuestion, max: number) => {
    if (list.length >= max) return;
    if (!list.some((existing) => existing.id === q.id || existing.targetTerm === q.targetTerm)) {
      list.push(q);
    }
  };

  for (const v of pools.vocabulary) {
    pushUnique(pickedVocab, buildQuestionFromVocab(v, fullVocab), 4);
  }
  for (const i of pools.idioms) {
    pushUnique(pickedIdioms, buildQuestionFromIdiom(i, fullIdioms), 4);
  }
  for (const s of pools.spelling) {
    pushUnique(pickedSpelling, buildQuestionFromSpelling(s), 4);
  }
  for (const g of pools.grammar) {
    pushUnique(pickedGrammar, buildQuestionFromGrammar(g), 4);
  }

  // Fallback fill from curated bank if any bucket < 4
  for (const q of DAILY_MASTERY_EXAM_QUESTIONS) {
    if (q.section === 'vocabulary') pushUnique(pickedVocab, q, 4);
    if (q.section === 'idioms_phrases') pushUnique(pickedIdioms, q, 4);
    if (q.section === 'spelling') pushUnique(pickedSpelling, q, 4);
    if (q.section === 'grammar') pushUnique(pickedGrammar, q, 4);
  }

  return [...pickedVocab, ...pickedIdioms, ...pickedSpelling, ...pickedGrammar];
}
