/**
 * BandSprint — Root-Cause Distractor Classifier for IELTS Mistake Vault
 * Classifies every mistake by the underlying IELTS cognitive error pattern so
 * candidates and adaptive sprints fix the real trap rather than just repeating modules.
 */

import type { MistakeItem } from '../types';

export type DistractorRootCauseId =
  | 'paraphrase_miss'
  | 'extreme_qualifier'
  | 'self_correction'
  | 'word_limit_spelling'
  | 'cohesion_logic'
  | 'lexical_register';

export interface DistractorRootCauseMeta {
  id: DistractorRootCauseId;
  label: string;
  shortLabel: string;
  description: string;
  fixRule: string;
  accentClasses: string;
}

export const DISTRACTOR_ROOT_CAUSES: Record<DistractorRootCauseId, DistractorRootCauseMeta> = {
  paraphrase_miss: {
    id: 'paraphrase_miss',
    label: 'Paraphrase Miss',
    shortLabel: 'Paraphrase',
    description: 'Matched surface keywords instead of recognizing synonymous meaning in the text or audio.',
    fixRule: 'Underline the question concept, then scan for synonyms/antonyms rather than exact words.',
    accentClasses: 'text-[#0F4C45] dark:text-[#6EE7B7] bg-[#0F4C45]/10 dark:bg-[#1F8A70]/20'
  },
  extreme_qualifier: {
    id: 'extreme_qualifier',
    label: 'Extreme Qualifier Trap',
    shortLabel: 'Qualifier Trap',
    description: 'Missed absolute modifiers (only, exclusively, never, always, all) that flip TRUE to FALSE.',
    fixRule: 'Circle every frequency or scope modifier in TFNG/YNNG statements before choosing.',
    accentClasses: 'text-rose-700 dark:text-rose-300 bg-rose-500/10 dark:bg-rose-500/20'
  },
  self_correction: {
    id: 'self_correction',
    label: 'Self-Correction Distractor',
    shortLabel: 'Self-Correction',
    description: 'Wrote the first number, date, or option spoken before the speaker corrected themselves.',
    fixRule: 'Hold final judgment until contrast pivots ("actually", "oh wait", "sorry") resolve.',
    accentClasses: 'text-amber-800 dark:text-amber-300 bg-amber-500/15 dark:bg-amber-500/20'
  },
  word_limit_spelling: {
    id: 'word_limit_spelling',
    label: 'Word Limit & Spelling',
    shortLabel: 'Spelling / Limit',
    description: 'Lost an easy mark due to plural -s omission, misspelling, postcode reversal, or word-count breach.',
    fixRule: 'Check singular/plural grammar agreement and verify exact word-limit instructions.',
    accentClasses: 'text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 dark:bg-indigo-500/20'
  },
  cohesion_logic: {
    id: 'cohesion_logic',
    label: 'Cohesion & Logic Flow',
    shortLabel: 'Cohesion / Logic',
    description: 'Mechanical linker stacking, contradictory transitions, or unlinked clause progression.',
    fixRule: 'Use one precise discourse marker per logical shift and keep reference pronouns unambiguous.',
    accentClasses: 'text-sky-700 dark:text-sky-300 bg-sky-500/10 dark:bg-sky-500/20'
  },
  lexical_register: {
    id: 'lexical_register',
    label: 'Lexical Register & Precision',
    shortLabel: 'Lexical Register',
    description: 'Relied on vague B1/B2 fillers or informal phrasing where C1/C2 collocation precision was needed.',
    fixRule: 'Replace generic adjectives ("big", "good", "a lot") with domain-specific C1 collocations.',
    accentClasses: 'text-purple-700 dark:text-purple-300 bg-purple-500/10 dark:bg-purple-500/20'
  }
};

export const DISTRACTOR_ROOT_CAUSE_LIST: DistractorRootCauseMeta[] = Object.values(
  DISTRACTOR_ROOT_CAUSES
);

export function classifyMistakeRootCause(
  item: Pick<
    MistakeItem,
    'module' | 'title' | 'prompt' | 'questionType' | 'explanation' | 'trapExplanationEn' | 'rootCauseTag'
  >
): DistractorRootCauseId {
  if (item.rootCauseTag && item.rootCauseTag in DISTRACTOR_ROOT_CAUSES) {
    return item.rootCauseTag;
  }

  const haystack = [
    item.title,
    item.prompt,
    item.questionType,
    item.explanation,
    item.trapExplanationEn
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    /self-correction|apologies|actually|oh wait|correction|distractor|changed|originally|revised/.test(
      haystack
    )
  ) {
    return 'self_correction';
  }
  if (
    /exclusively|solely|never|always|only|extreme|qualifier|absolute|contradict|not given|tfng|ynng/.test(
      haystack
    )
  ) {
    return 'extreme_qualifier';
  }
  if (/spell|postcode|word limit|plural|singular|hyphen|number|digit/.test(haystack)) {
    return 'word_limit_spelling';
  }
  if (/cohesion|coherence|linker|furthermore|conversely|transition|clause|subordinat/.test(haystack)) {
    return 'cohesion_logic';
  }
  if (/collocation|register|lexical|vague|quantifier|idiom|vocabulary|c1|c2/.test(haystack)) {
    return 'lexical_register';
  }
  if (item.module === 'writing') return 'cohesion_logic';
  if (item.module === 'speaking' || item.module === 'vocab') return 'lexical_register';
  if (item.module === 'listening') return 'self_correction';
  return 'paraphrase_miss';
}

export interface RootCauseSummaryRow {
  meta: DistractorRootCauseMeta;
  count: number;
  sharePct: number;
}

export function summarizeRootCauseBreakdown(mistakes: MistakeItem[]): RootCauseSummaryRow[] {
  const unresolved = mistakes.filter((m) => !m.mastered);
  const total = unresolved.length;
  const counts: Record<DistractorRootCauseId, number> = {
    paraphrase_miss: 0,
    extreme_qualifier: 0,
    self_correction: 0,
    word_limit_spelling: 0,
    cohesion_logic: 0,
    lexical_register: 0
  };

  unresolved.forEach((m) => {
    const tag = classifyMistakeRootCause(m);
    counts[tag] = (counts[tag] || 0) + 1;
  });

  return DISTRACTOR_ROOT_CAUSE_LIST.map((meta) => ({
    meta,
    count: counts[meta.id],
    sharePct: total > 0 ? Math.round((counts[meta.id] / total) * 100) : 0
  }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
}
