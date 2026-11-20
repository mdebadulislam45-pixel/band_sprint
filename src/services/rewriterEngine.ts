/**
 * BandSprint AI Rewriter — fully offline, local engine. No API call.
 *
 * Takes a Task 2 essay or sentence and produces:
 *  (1) an improved version — Band 6 words swapped for Band 7+ alternatives,
 *      plus fixes for common mechanical errors;
 *  (2) linking-word suggestions based on what the text is actually missing;
 *  (3) a short explanation of the biggest changes;
 *  (4) a Band estimate that is explicitly labelled as an estimate.
 *
 * The engine is rule-based, so it never invents content: every change is a
 * traceable replacement shown to the user. It cannot judge ideas, task
 * response or coherence the way a human examiner would.
 *
 * NOTE (server): if a server evaluation endpoint ever exists
 * (`POST /api/rewrite`), it can replace `rewriteText` as the primary path
 * and this engine stays as the offline fallback. Do NOT call any endpoint
 * from here — /api/* returns 404 on the static site.
 */

export interface RewriteChange {
  type: 'lexical' | 'grammar' | 'style';
  original: string;
  replacement: string;
  explanation: string;
}

export interface LinkingSuggestion {
  kind: 'contrast' | 'example' | 'addition' | 'conclusion' | 'cause';
  suggestion: string;
  bangla: string;
}

export interface RewriteResult {
  original: string;
  improved: string;
  changes: RewriteChange[];
  topChanges: RewriteChange[];
  linkingSuggestions: LinkingSuggestion[];
  bandEstimate: number;
  bandNote: string;
  stats: {
    words: number;
    upgradesApplied: number;
    correctionsApplied: number;
    sentences: number;
    avgSentenceLength: number;
  };
}

interface LexicalUpgrade {
  from: string;
  to: string;
  note: string;
}

/**
 * ~50 common Band 6 words/phrases → Band 7+ alternatives.
 * Each entry is a whole-word (or whole-phrase) match; the engine preserves
 * the original capitalisation of the first letter.
 */
const LEXICAL_UPGRADES: LexicalUpgrade[] = [
  { from: 'very important', to: 'crucial', note: '"Crucial" signals that something is decisive, not just important.' },
  { from: 'very big', to: 'substantial', note: '"Substantial" is the academic form of "very big".' },
  { from: 'very small', to: 'negligible', note: '"Negligible" means too small to matter — precise and formal.' },
  { from: 'a lot of', to: 'a considerable number of', note: '"A lot of" is informal; use a precise quantifier.' },
  { from: 'lots of', to: 'a significant proportion of', note: '"Lots of" is spoken English, not academic writing.' },
  { from: 'in modern days', to: 'in contemporary society', note: '"In modern days" is unidiomatic in formal writing.' },
  { from: 'in the modern world', to: 'in contemporary society', note: 'Same idea, more formal phrasing.' },
  { from: 'nowadays', to: 'in contemporary society', note: 'Use sparingly — "nowadays" is slightly informal for Task 2.' },
  { from: 'people think', to: 'it is widely believed', note: 'Impersonal structure — stronger for academic essays.' },
  { from: 'many people think', to: 'it is widely believed', note: 'Impersonal structure — stronger for academic essays.' },
  { from: 'i think', to: 'in my opinion', note: 'Clearer opinion marker for Task 2.' },
  { from: 'big problem', to: 'pressing issue', note: '"Pressing issue" is the standard academic collocation.' },
  { from: 'big', to: 'substantial', note: '"Substantial" carries more weight than "big".' },
  { from: 'small', to: 'modest', note: '"Modest" is the formal alternative to "small".' },
  { from: 'good', to: 'beneficial', note: '"Beneficial" is precise where "good" is vague.' },
  { from: 'bad', to: 'detrimental', note: '"Detrimental" is the academic word for harmful effects.' },
  { from: 'very bad', to: 'severely detrimental', note: 'Stronger, more precise than "very bad".' },
  { from: 'many', to: 'numerous', note: '"Numerous" is more formal than "many".' },
  { from: 'show', to: 'demonstrate', note: '"Demonstrate" is the academic verb for showing evidence.' },
  { from: 'important', to: 'crucial', note: '"Crucial" signals that something is decisive, not just important.' },
  { from: 'problem', to: 'challenge', note: '"Challenge" frames the issue more constructively.' },
  { from: 'thing', to: 'factor', note: '"Thing" is too vague for academic writing — name the factor.' },
  { from: 'things', to: 'factors', note: '"Things" is too vague for academic writing.' },
  { from: 'really', to: 'genuinely', note: '"Genuinely" is the formal alternative to "really".' },
  { from: 'cheap', to: 'cost-effective', note: '"Cost-effective" is the academic way to say cheap.' },
  { from: 'more easy', to: 'easier', note: 'One-syllable adjectives take "-er", not "more".' },
  { from: 'more cheap', to: 'more economical', note: '"Economical" is the formal alternative to "cheap".' },
  { from: 'kids', to: 'children', note: '"Kids" is informal — use "children" in essays.' },
  { from: 'a lot', to: 'significantly', note: '"A lot" is informal; "significantly" is precise.' },
  { from: 'in my view', to: 'from my perspective', note: 'A slightly more formal opinion marker.' },
  { from: 'first of all', to: 'firstly', note: '"Firstly" is cleaner than "first of all".' },
  { from: 'hard', to: 'challenging', note: '"Challenging" is the formal adjective for difficult tasks.' },
  { from: 'easy', to: 'straightforward', note: '"Straightforward" is the academic alternative to "easy".' },
  { from: 'fast', to: 'rapid', note: '"Rapid" is the formal adjective for fast change.' },
  { from: 'slow', to: 'gradual', note: '"Gradual" describes slow change precisely.' },
  { from: 'rich', to: 'affluent', note: '"Affluent" is the formal word for wealthy.' },
  { from: 'poor', to: 'disadvantaged', note: '"Disadvantaged" is the formal, sensitive term.' },
  { from: 'old people', to: 'the elderly', note: '"The elderly" is the standard formal noun phrase.' },
  { from: 'young people', to: 'younger generations', note: '"Younger generations" is more formal and precise.' },
  { from: 'every day', to: 'on a daily basis', note: 'Formal adverbial phrase for academic writing.' },
];

const CONTRAST_LINKERS = ['however', 'nevertheless', 'nonetheless', 'on the other hand', 'in contrast', 'whereas', 'although', 'despite'];
const EXAMPLE_LINKERS = ['for example', 'for instance', 'such as', 'to illustrate'];
const ADDITION_LINKERS = ['furthermore', 'moreover', 'in addition', 'additionally'];
const CONCLUSION_LINKERS = ['in conclusion', 'to conclude', 'overall', 'in summary'];
const CAUSE_LINKERS = ['therefore', 'consequently', 'as a result', 'thus', 'hence'];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function capitaliseFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
}

interface CorrectionRule {
  pattern: RegExp;
  replacement: string | ((m: string) => string);
  explanation: string;
}

const CORRECTION_RULES: CorrectionRule[] = [
  { pattern: /\bpeople is\b/gi, replacement: 'people are', explanation: '"People" is plural — it takes "are", not "is".' },
  { pattern: /\bpeople has\b/gi, replacement: 'people have', explanation: '"People" is plural — it takes "have", not "has".' },
  { pattern: /\bchildren is\b/gi, replacement: 'children are', explanation: '"Children" is plural — it takes "are".' },
  { pattern: /\bhe have\b/gi, replacement: 'he has', explanation: 'Third-person singular takes "has", not "have".' },
  { pattern: /\bshe have\b/gi, replacement: 'she has', explanation: 'Third-person singular takes "has", not "have".' },
  { pattern: /\bit have\b/gi, replacement: 'it has', explanation: 'Third-person singular takes "has", not "have".' },
  { pattern: /\bhe go\b/gi, replacement: 'he goes', explanation: 'Third-person singular verb needs "-s": "he goes".' },
  { pattern: /\bshe go\b/gi, replacement: 'she goes', explanation: 'Third-person singular verb needs "-s": "she goes".' },
  { pattern: /\bhe do\b/gi, replacement: 'he does', explanation: 'Third-person singular: "he does", not "he do".' },
  { pattern: /\ban university\b/gi, replacement: 'a university', explanation: '"University" starts with a "y" sound, so it takes "a", not "an".' },
  { pattern: /\ban european\b/gi, replacement: 'a European', explanation: '"European" starts with a "y" sound, so it takes "a".' },
  { pattern: /\bdont\b/gi, replacement: "don't", explanation: 'Missing apostrophe in the contraction.' },
  { pattern: /\bcant\b/gi, replacement: "can't", explanation: 'Missing apostrophe in the contraction.' },
  { pattern: /\bwont\b/gi, replacement: "won't", explanation: 'Missing apostrophe in the contraction.' },
  { pattern: /\bisnt\b/gi, replacement: "isn't", explanation: 'Missing apostrophe in the contraction.' },
  { pattern: /\bdoesnt\b/gi, replacement: "doesn't", explanation: 'Missing apostrophe in the contraction.' },
];

function applyCorrections(text: string, changes: RewriteChange[]): string {
  let out = text;
  // Collapse double spaces and add missing space after punctuation.
  const collapsed = out.replace(/ {2,}/g, ' ');
  if (collapsed !== out) {
    changes.push({ type: 'grammar', original: 'double spaces', replacement: 'single spaces', explanation: 'Extra spaces were removed.' });
    out = collapsed;
  }
  const spaced = out.replace(/([,;:])(?=\S)/g, '$1 ');
  if (spaced !== out) {
    changes.push({ type: 'grammar', original: 'missing space after punctuation', replacement: 'space added', explanation: 'A space always follows a comma, semicolon or colon.' });
    out = spaced;
  }
  // Capitalise the first letter of every sentence.
  const capitalised = out.replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (m) => m.toUpperCase());
  if (capitalised !== out) {
    changes.push({ type: 'grammar', original: 'lowercase sentence start', replacement: 'capitalised sentence start', explanation: 'Every sentence starts with a capital letter.' });
    out = capitalised;
  }
  // Standalone "i" → "I".
  const fixedI = out.replace(/\bi\b/g, 'I');
  if (fixedI !== out) {
    changes.push({ type: 'grammar', original: 'i', replacement: 'I', explanation: 'The pronoun "I" is always capitalised.' });
    out = fixedI;
  }
  for (const rule of CORRECTION_RULES) {
    out = out.replace(rule.pattern, (match) => {
      const replacement = typeof rule.replacement === 'string' ? rule.replacement : rule.replacement(match);
      const finalReplacement =
        match.charAt(0) === match.charAt(0).toUpperCase() && match.charAt(0) !== match.charAt(0).toLowerCase()
          ? capitaliseFirst(replacement)
          : replacement;
      if (match.toLowerCase() !== finalReplacement.toLowerCase()) {
        changes.push({ type: 'grammar', original: match, replacement: finalReplacement, explanation: rule.explanation });
      }
      return finalReplacement;
    });
  }
  return out;
}

function applyLexicalUpgrades(text: string, changes: RewriteChange[]): string {
  let out = text;
  // Longest phrases first so "very important" wins over "important".
  const sorted = [...LEXICAL_UPGRADES].sort((a, b) => b.from.length - a.from.length);
  for (const upgrade of sorted) {
    const pattern = new RegExp(`\\b${escapeRegExp(upgrade.from)}\\b`, 'gi');
    out = out.replace(pattern, (match, offset: number, full: string) => {
      // Capitalise the replacement only when the match starts a sentence.
      // ("I think" mid-sentence must become "in my opinion", not "In my opinion".)
      const before = full.slice(0, offset).trimEnd();
      const sentenceStart = before.length === 0 || /[.!?]$/.test(before);
      const replacement = sentenceStart
        ? capitaliseFirst(upgrade.to)
        : upgrade.to.charAt(0).toLowerCase() + upgrade.to.slice(1);
      if (match.toLowerCase() !== replacement.toLowerCase()) {
        changes.push({ type: 'lexical', original: match, replacement, explanation: upgrade.note });
      }
      return replacement;
    });
  }
  return out;
}

function detectLinkingSuggestions(text: string): LinkingSuggestion[] {
  const lower = text.toLowerCase();
  const hasAny = (list: string[]) => list.some((w) => lower.includes(w));
  const suggestions: LinkingSuggestion[] = [];
  if (!hasAny(CONTRAST_LINKERS)) {
    suggestions.push({
      kind: 'contrast',
      suggestion: 'Add a contrast linker: "However, some people argue that…"',
      bangla: 'বিপরীত মত দেখাতে "However" ব্যবহার করুন।',
    });
  }
  if (!hasAny(EXAMPLE_LINKERS)) {
    suggestions.push({
      kind: 'example',
      suggestion: 'Support a point with an example: "For instance, in Bangladesh…"',
      bangla: 'উদাহরণ দিতে "For instance" ব্যবহার করুন।',
    });
  }
  if (!hasAny(ADDITION_LINKERS)) {
    suggestions.push({
      kind: 'addition',
      suggestion: 'Add a second idea with "Furthermore, …" instead of starting with "And".',
      bangla: 'আরও একটি যুক্তি যোগ করতে "Furthermore" ব্যবহার করুন।',
    });
  }
  if (!hasAny(CONCLUSION_LINKERS)) {
    suggestions.push({
      kind: 'conclusion',
      suggestion: 'Close with a conclusion linker: "In conclusion, I believe that…"',
      bangla: 'শেষে "In conclusion" দিয়ে মতামত শেষ করুন।',
    });
  }
  if (!hasAny(CAUSE_LINKERS)) {
    suggestions.push({
      kind: 'cause',
      suggestion: 'Show cause and effect: "Therefore, governments should…"',
      bangla: 'কারণ-ফল দেখাতে "Therefore" ব্যবহার করুন।',
    });
  }
  return suggestions;
}

function estimateBand(
  words: number,
  sentences: number,
  avgSentenceLength: number,
  upgrades: number,
  corrections: number,
  linkingPresent: number
): number {
  let band = 5.5;
  if (words >= 250) band += 0.5;
  else if (words >= 180) band += 0.25;
  if (linkingPresent >= 3) band += 0.5;
  else if (linkingPresent >= 2) band += 0.25;
  if (upgrades >= 3) band += 0.5;
  else if (upgrades >= 1) band += 0.25;
  if (sentences >= 4 && avgSentenceLength >= 12 && avgSentenceLength <= 26) band += 0.5;
  if (corrections >= 6) band -= 0.5;
  else if (corrections >= 3) band -= 0.25;
  return Math.max(4.5, Math.min(8.0, Math.round(band * 2) / 2));
}

/**
 * Rewrite the given text entirely on-device.
 * NOTE (server): if POST /api/rewrite ever exists, call it first and use this
 * engine only as the offline fallback. No network call is made here.
 */
export function rewriteText(input: string): RewriteResult {
  const original = input.trim();
  const changes: RewriteChange[] = [];

  const corrected = applyCorrections(original, changes);
  const correctionsApplied = changes.filter((c) => c.type === 'grammar').length;
  const improved = applyLexicalUpgrades(corrected, changes);
  const upgradesApplied = changes.filter((c) => c.type === 'lexical').length;

  const sentences = splitSentences(improved);
  const words = improved.split(/\s+/).filter(Boolean).length;
  const avgSentenceLength = sentences.length > 0 ? Math.round((words / sentences.length) * 10) / 10 : 0;

  const linkingSuggestions = detectLinkingSuggestions(improved);
  const linkingPresent =
    [CONTRAST_LINKERS, EXAMPLE_LINKERS, ADDITION_LINKERS, CONCLUSION_LINKERS, CAUSE_LINKERS].filter((list) =>
      list.some((w) => improved.toLowerCase().includes(w))
    ).length;

  const bandEstimate = estimateBand(words, sentences.length, avgSentenceLength, upgradesApplied, correctionsApplied, linkingPresent);

  // Top 3: grammar corrections first (they matter most), then lexical upgrades.
  const topChanges = [
    ...changes.filter((c) => c.type === 'grammar'),
    ...changes.filter((c) => c.type === 'lexical'),
  ].slice(0, 3);

  return {
    original,
    improved,
    changes,
    topChanges,
    linkingSuggestions,
    bandEstimate,
    bandNote:
      'Estimate only — calculated on your device from length, linking words, vocabulary range and errors found. ' +
      'It is not an official IELTS score and does not judge your ideas or task response.',
    stats: {
      words,
      upgradesApplied,
      correctionsApplied,
      sentences: sentences.length,
      avgSentenceLength,
    },
  };
}
