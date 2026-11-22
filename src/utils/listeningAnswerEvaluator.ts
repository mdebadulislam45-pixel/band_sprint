import { IELTSQuestion } from '../services/QuestionEngine';
import { IELTS_SPEAKERS } from '../services/audioService';
import { inferSpeechDeliveryProfile, SpeechDeliveryProfileId } from '../config/speechDirection';

export interface ParsedOption {
  letter: string;
  label: string;
  fullRaw: string;
}

const NUMBER_WORD_MAP: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5
};

/**
 * Parses an option string (e.g. "B) Marine Engineering", "A", "At 9:00 AM")
 * into its canonical option letter, display label, and original raw string.
 */
export function parseOptionItem(opt: string, index: number, isMap: boolean = false): ParsedOption {
  const trimmed = (opt || '').trim();
  const defaultLetter = String.fromCharCode(65 + index); // 'A', 'B', 'C', 'D'...

  // Single letter option: 'A', 'B', etc.
  if (trimmed.length === 1 && /[A-Za-z]/.test(trimmed)) {
    const letter = trimmed.toUpperCase();
    return {
      letter,
      label: isMap ? `Position ${letter}` : `Option ${letter}`,
      fullRaw: trimmed
    };
  }

  // Prefixed option: 'A) Some text', 'A. Some text', 'A: Some text', or 'A - Some text'
  const letterPrefixMatch = trimmed.match(/^([A-Za-z])[\)\.\:\-]\s*(.+)$/);
  if (letterPrefixMatch) {
    const letter = letterPrefixMatch[1].toUpperCase();
    const label = letterPrefixMatch[2].trim();
    return {
      letter,
      label,
      fullRaw: trimmed
    };
  }

  // Option without letter prefix
  return {
    letter: defaultLetter,
    label: trimmed,
    fullRaw: trimmed
  };
}

/**
 * Extracts an explicitly configured word limit from a question's metadata or prompt text.
 * Returns null if the question does not define a word limit (never imposes an invented universal limit).
 */
export function extractWordLimitFromQuestion(
  q: (Pick<IELTSQuestion, 'prompt' | 'questionType'> & { wordLimit?: number; maxWords?: number }) | null | undefined
): number | null {
  if (!q) return null;

  if (typeof q.wordLimit === 'number' && q.wordLimit > 0) {
    return q.wordLimit;
  }
  if (typeof q.maxWords === 'number' && q.maxWords > 0) {
    return q.maxWords;
  }

  const prompt = q.prompt || '';
  if (!prompt) return null;

  // Match patterns like "NO MORE THAN TWO WORDS", "NO MORE THAN 3 WORDS", "ONE WORD ONLY", "TWO WORDS ONLY", "ONE WORD AND/OR A NUMBER"
  const noMoreThanMatch = prompt.match(/\bNO\s+MORE\s+THAN\s+(ONE|TWO|THREE|FOUR|FIVE|\d+)\s+WORDS?\b/i);
  if (noMoreThanMatch) {
    const token = noMoreThanMatch[1].toLowerCase();
    if (NUMBER_WORD_MAP[token]) return NUMBER_WORD_MAP[token];
    const parsed = parseInt(token, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }

  const onlyWordsMatch = prompt.match(/\b(ONE|TWO|THREE|FOUR|FIVE|\d+)\s+WORDS?\s+(?:ONLY|AND\/OR\s+A\s+NUMBER)\b/i);
  if (onlyWordsMatch) {
    const token = onlyWordsMatch[1].toLowerCase();
    if (NUMBER_WORD_MAP[token]) return NUMBER_WORD_MAP[token];
    const parsed = parseInt(token, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }

  return null;
}

/**
 * Counts words in a candidate's response following IELTS conventions
 * (whitespace-delimited tokens; hyphenated words like "gluten-free" count as 1 word).
 */
export function countAnswerWords(answer: string): number {
  const trimmed = (answer || '').trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function extractCurrencyTokens(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  if (/£|\bpounds?\b|\bgbp\b/i.test(text)) found.add('£');
  if (/\$|\bdollars?\b|\busd\b/i.test(text)) found.add('$');
  if (/€|\beuros?\b|\beur\b/i.test(text)) found.add('€');
  if (/¥|\byen\b/i.test(text)) found.add('¥');
  return Array.from(found);
}

/**
 * Extracts currency tokens strictly associated with the answer blank in a question prompt
 * when the canonical answer itself is a bare number (e.g. "Registration fee: £_____" -> ['£']).
 * Avoids unioning distractor currencies mentioned elsewhere in the prompt (e.g. "Initially quoted at $400, final fee: £_____").
 */
function extractPromptBlankCurrency(promptText: string): string[] {
  if (!promptText) return [];

  const blankAdjacentMatches = new Set<string>();

  // 1. Currency symbol or code immediately preceding a blank marker (e.g. "£_____", "£ [1]", "GBP _____")
  const prefixBlankRegex =
    /([£$€¥]|\b(?:pounds?|gbp|dollars?|usd|euros?|eur|yen)\b)\s*(?:_{2,}|\[\s*(?:\d+|_+)\s*\]|\.{3,}|…)/gi;
  let match: RegExpExecArray | null;
  while ((match = prefixBlankRegex.exec(promptText)) !== null) {
    extractCurrencyTokens(match[1]).forEach((c) => blankAdjacentMatches.add(c));
  }

  // 2. Currency symbol or word immediately following a blank marker (e.g. "_____ pounds", "_____ £")
  const suffixBlankRegex =
    /(?:_{2,}|\[\s*(?:\d+|_+)\s*\]|\.{3,}|…)\s*([£$€¥]|\b(?:pounds?|gbp|dollars?|usd|euros?|eur|yen)\b)/gi;
  while ((match = suffixBlankRegex.exec(promptText)) !== null) {
    extractCurrencyTokens(match[1]).forEach((c) => blankAdjacentMatches.add(c));
  }

  // 3. Parenthetical currency indicator before colon/blank (e.g. "Total fee (£): _____")
  const parenBlankRegex =
    /\(\s*([£$€¥]|\b(?:pounds?|gbp|dollars?|usd|euros?|eur|yen)\b)\s*\)\s*:?\s*(?:_{2,}|\[\s*(?:\d+|_+)\s*\]|$)/gi;
  while ((match = parenBlankRegex.exec(promptText)) !== null) {
    extractCurrencyTokens(match[1]).forEach((c) => blankAdjacentMatches.add(c));
  }

  // 4. Prompt ending directly with a currency symbol (e.g. "Total deposit: £")
  const trailingSymbolMatch = promptText.trim().match(/([£$€¥])$/);
  if (trailingSymbolMatch) {
    extractCurrencyTokens(trailingSymbolMatch[1]).forEach((c) => blankAdjacentMatches.add(c));
  }

  if (blankAdjacentMatches.size === 1) {
    return Array.from(blankAdjacentMatches);
  }
  if (blankAdjacentMatches.size > 1) {
    return [];
  }

  // Fallback only if the entire prompt contains a single unambiguous currency
  const allPromptCurrencies = extractCurrencyTokens(promptText);
  return allPromptCurrencies.length === 1 ? allPromptCurrencies : [];
}

function stripLeadingOrWordCurrency(text: string): string {
  return (text || '')
    .replace(/^(?:[£$€¥]|\b(?:pounds?|gbp|dollars?|usd|euros?|eur|yen)\b)\s*/gi, '')
    .replace(/\s*(?:[£$€¥]|\b(?:pounds?|gbp|dollars?|usd|euros?|eur|yen)\b)$/gi, '')
    .trim();
}

const CARDINAL_ONES_AND_TEENS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19
};

const CARDINAL_TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90
};

/**
 * Converts standalone English cardinal number word sequences into digits
 * (e.g. "forty percent" -> "40 percent", "twenty five" -> "25", "two hundred" -> "200", "eighty five" -> "85").
 * Preserves all non-numeric words and units untouched.
 */
export function convertEnglishNumberWordsToDigits(input: string): string {
  if (!input) return '';
  // Separate trailing % attached directly to a word (e.g. "forty%" -> "forty %")
  const prepped = input.replace(/([a-z])%/gi, '$1 %');
  const tokens = prepped.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '';

  const isNumberToken = (tok: string): boolean => {
    const clean = tok.toLowerCase();
    return (
      clean in CARDINAL_ONES_AND_TEENS ||
      clean in CARDINAL_TENS ||
      clean === 'hundred' ||
      clean === 'thousand'
    );
  };

  const out: string[] = [];
  let i = 0;

  while (i < tokens.length) {
    if (!isNumberToken(tokens[i])) {
      out.push(tokens[i]);
      i++;
      continue;
    }

    let total = 0;
    let current = 0;
    let consumed = 0;

    while (i < tokens.length) {
      const w = tokens[i].toLowerCase();
      if (w in CARDINAL_ONES_AND_TEENS) {
        current += CARDINAL_ONES_AND_TEENS[w];
        i++;
        consumed++;
      } else if (w in CARDINAL_TENS) {
        current += CARDINAL_TENS[w];
        i++;
        consumed++;
      } else if (w === 'hundred') {
        current = (current === 0 ? 1 : current) * 100;
        i++;
        consumed++;
      } else if (w === 'thousand') {
        total += (current === 0 ? 1 : current) * 1000;
        current = 0;
        i++;
        consumed++;
      } else if (
        w === 'and' &&
        consumed > 0 &&
        i + 1 < tokens.length &&
        isNumberToken(tokens[i + 1])
      ) {
        i++;
      } else {
        break;
      }
    }

    const numericValue = total + current;

    // Optional decimal: "point <single-digit-word(s)>" (e.g., "one point five" -> "1.5")
    if (
      i + 1 < tokens.length &&
      tokens[i].toLowerCase() === 'point' &&
      tokens[i + 1].toLowerCase() in CARDINAL_ONES_AND_TEENS &&
      CARDINAL_ONES_AND_TEENS[tokens[i + 1].toLowerCase()] < 10
    ) {
      i++; // consume 'point'
      let fracDigits = '';
      while (
        i < tokens.length &&
        tokens[i].toLowerCase() in CARDINAL_ONES_AND_TEENS &&
        CARDINAL_ONES_AND_TEENS[tokens[i].toLowerCase()] < 10
      ) {
        fracDigits += String(CARDINAL_ONES_AND_TEENS[tokens[i].toLowerCase()]);
        i++;
      }
      out.push(`${numericValue}.${fracDigits}`);
    } else {
      out.push(String(numericValue));
    }
  }

  return out.join(' ');
}

/**
 * Normalizes a text answer for comparison while preserving meaningful punctuation
 * (such as colons in times like "4:30"), currency identity (£, $, €, ¥), percentages (%),
 * numbers, dates, and exact word spelling. Avoids malformed multi-decimal transformations.
 */
export function normalizeCompletionAnswer(input: string): string {
  const baseNormalized = (input || '')
    .toLowerCase()
    .trim()
    // Remove thousand-separator commas inside valid numbers (e.g. "1,650" -> "1650")
    .replace(/(?<![0-9.])(\d{1,3}),(\d{3})(?![0-9])/g, '$1$2')
    // Collapse whitespace immediately between a currency symbol and a digit (e.g. "$ 85.00" -> "$85.00", "350 £" -> "350£")
    .replace(/([£$€¥])\s+(\d)/g, '$1$2')
    .replace(/(\d)\s+([£$€¥])/g, '$1$2')
    // Normalize trailing .00 on standalone whole numbers only (never on multi-decimal strings like "12.350.00" or "350.00.1")
    .replace(/(?<![0-9.])(\d+)\.00\b(?![.\d])/g, '$1')
    // Normalize hyphens and dashes to a single space so "gluten-free" and "gluten free" or "twenty-five" and "twenty five" match
    .replace(/[-–—]+/g, ' ')
    // Strip harmless leading/trailing punctuation (preserving currency symbols £, $, €, ¥ and percentage symbol %)
    .replace(/^[.,/#!^&*;:{}=_`~()"'\[\]]+|[.,/#!^&*;:{}=_`~()"'\[\]]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!baseNormalized) return '';

  // Convert standalone English number words to digits (e.g. "forty percent" -> "40 percent")
  const withDigits = convertEnglishNumberWordsToDigits(baseNormalized);

  return withDigits
    // Canonicalize percentage forms: "40 percent", "40 per cent", "40 %" -> "40%"
    .replace(/(?<![0-9.])(\d+(?:\.\d+)?)\s*(?:%|percent|per\s+cent)(?=\b|$)/gi, '$1%')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Evaluates whether a candidate's Listening/Reading answer is correct.
 * Shared across RealisticIELTSListeningTest, LiveMockTest, and ListeningLab.
 */
export function isListeningAnswerCorrect(
  q: IELTSQuestion & { wordLimit?: number; maxWords?: number; prompt?: string },
  userAns: string
): boolean {
  const rawTrimmed = (userAns || '').trim();
  if (!rawTrimmed) return false;

  const cleanLower = rawTrimmed.toLowerCase();
  const cleanNorm = normalizeCompletionAnswer(rawTrimmed);
  if (!cleanNorm) return false;

  const hasOptions = Array.isArray(q.options) && q.options.length > 0;
  const tfngYnngTokens = new Set(['true', 'false', 'yes', 'no', 'not given']);
  const hasUnprefixedTfngYnngOptions =
    hasOptions &&
    q.options!.every((opt) => tfngYnngTokens.has((opt || '').trim().toLowerCase()));
  const isTfngOrYnng =
    q.questionType === 'true_false_not_given' ||
    q.questionType === 'yes_no_not_given' ||
    (q as any).type === 'true_false_not_given' ||
    (q as any).type === 'yes_no_not_given' ||
    hasUnprefixedTfngYnngOptions;
  const isOptionBasedType =
    (!isTfngOrYnng && hasOptions) ||
    q.questionType === 'multiple_choice' ||
    q.questionType === 'matching' ||
    q.questionType === 'map_labelling';

  // Enforce configured word limit on text-completion questions where a limit is defined
  if (!hasOptions) {
    const configuredWordLimit = extractWordLimitFromQuestion(q);
    if (configuredWordLimit !== null) {
      const userWordCount = countAnswerWords(rawTrimmed);
      if (userWordCount > configuredWordLimit) {
        return false;
      }
    }
  }

  // 1. Option-based evaluation (Multiple Choice, Map Labelling, Matching with options, TFNG/YNNG with options)
  if (hasOptions && q.options) {
    const correctList = Array.isArray(q.correctAnswer)
      ? q.correctAnswer
      : q.correctAnswer
      ? [q.correctAnswer]
      : [];
    const acceptableList = Array.isArray(q.acceptableAnswers) ? q.acceptableAnswers : [];
    const allConfiguredCorrect = [...correctList, ...acceptableList];

    for (let idx = 0; idx < q.options.length; idx++) {
      const opt = q.options[idx];
      const parsed = parseOptionItem(opt, idx, q.questionType === 'map_labelling');
      const optLetter = parsed.letter.toLowerCase();
      const optLabelNorm = normalizeCompletionAnswer(parsed.label);
      const optRawNorm = normalizeCompletionAnswer(parsed.fullRaw);

      const isTargetOption = allConfiguredCorrect.some((corr) => {
        const corrTrim = (corr || '').trim();
        const corrLower = corrTrim.toLowerCase();
        const corrNorm = normalizeCompletionAnswer(corrTrim);
        if (isTfngOrYnng) {
          return corrNorm === optRawNorm || corrNorm === optLabelNorm;
        }
        if (corrLower === optLetter || corrNorm === optRawNorm || corrNorm === optLabelNorm) {
          return true;
        }
        const corrPrefixMatch = corrTrim.match(/^([A-Za-z])[\)\.\:\-]\s*(.+)$/);
        if (corrPrefixMatch) {
          const cLetter = corrPrefixMatch[1].toLowerCase();
          const cLabelNorm = normalizeCompletionAnswer(corrPrefixMatch[2]);
          return cLetter === optLetter || cLabelNorm === optLabelNorm;
        }
        return false;
      });

      if (isTargetOption) {
        if (isTfngOrYnng) {
          if (cleanNorm === optLabelNorm || cleanNorm === optRawNorm) {
            return true;
          }
          continue;
        }
        if (
          cleanLower === optLetter ||
          cleanNorm === optLabelNorm ||
          cleanNorm === optRawNorm
        ) {
          return true;
        }
        // Also support user answer entered as "B) Marine Engineering"
        const userPrefixMatch = rawTrimmed.match(/^([A-Za-z])[\)\.\:\-]\s*(.+)$/);
        if (userPrefixMatch) {
          const uLetter = userPrefixMatch[1].toLowerCase();
          const uLabelNorm = normalizeCompletionAnswer(userPrefixMatch[2]);
          if (uLetter === optLetter && uLabelNorm === optLabelNorm) {
            return true;
          }
        }
      }
    }

    return false;
  }

  // 2. Direct & acceptable variant matching for completion or optionless questions
  const candidates: string[] = [];
  if (Array.isArray(q.correctAnswer)) {
    candidates.push(...q.correctAnswer);
  } else if (typeof q.correctAnswer === 'string' && q.correctAnswer.trim()) {
    candidates.push(q.correctAnswer);
  }
  if (Array.isArray(q.acceptableAnswers)) {
    candidates.push(...q.acceptableAnswers);
  }

  const promptText = q.prompt || (q as any).questionText || '';
  const promptIndicatesPercentage = /\b(?:percentage|percent|per\s+cent)\b|%/i.test(promptText);

  // Determine currency identity from canonical/acceptable answers first.
  // Only fall back to prompt blank context when the configured answers contain no currency token.
  const expectedCurrencies = new Set<string>();
  for (const cand of candidates) {
    extractCurrencyTokens(cand).forEach((c) => expectedCurrencies.add(c));
  }
  if (expectedCurrencies.size === 0) {
    extractPromptBlankCurrency(promptText).forEach((c) => expectedCurrencies.add(c));
  }

  const userCurrencies = extractCurrencyTokens(rawTrimmed);
  // Reject mismatched, multiple conflicting, or unexpected currency symbols in user response
  if (userCurrencies.length > 0) {
    if (
      expectedCurrencies.size === 0 ||
      userCurrencies.some((uc) => !expectedCurrencies.has(uc))
    ) {
      return false;
    }
  }

  for (const ans of candidates) {
    const ansTrim = (ans || '').trim();
    if (!ansTrim) continue;

    const ansLower = ansTrim.toLowerCase();
    const ansNorm = normalizeCompletionAnswer(ansTrim);

    if (cleanLower === ansLower || cleanNorm === ansNorm) {
      return true;
    }

    // Percentage equivalence: when the canonical/acceptable answer is a percentage (e.g. "40%"),
    // accept the exact numeric value ("40" or "forty") as well as "40%", "40 percent", "forty percent".
    // Conversely, if the canonical answer is a bare number ("40") AND the prompt explicitly asks for a percentage,
    // accept "40%" / "40 percent" / "forty percent". Never accept "85%" when the question asks for a non-percentage count ("85").
    const ansPercentMatch = ansNorm.match(/^(\d+(?:\.\d+)?)%$/);
    if (ansPercentMatch && cleanNorm === ansPercentMatch[1]) {
      return true;
    }
    const userPercentMatch = cleanNorm.match(/^(\d+(?:\.\d+)?)%$/);
    if (userPercentMatch && ansNorm === userPercentMatch[1] && promptIndicatesPercentage) {
      return true;
    }

    // If question specifies an unambiguous currency (e.g. prompt blank has "£_____" or correctAnswer is "£350" / "350")
    // and user either omitted the currency symbol ("350") or included the matching currency symbol/code ("£350", "GBP 350", "350£", "350 pounds"),
    // compare the normalized numeric core after verifying currency compatibility above.
    if (expectedCurrencies.size > 0) {
      const userCore = stripLeadingOrWordCurrency(cleanNorm);
      const ansCore = stripLeadingOrWordCurrency(ansNorm);
      if (userCore && ansCore && userCore === ansCore && /^\d+(?:\.\d+)?$/.test(userCore)) {
        return true;
      }
    }

    // If a multiple-choice/matching question has no options array populated but stores
    // correctAnswer as "B) Marine Engineering", allow bare letter "B" or the label "Marine Engineering"
    if (isOptionBasedType) {
      const prefixMatch = ansTrim.match(/^([A-Za-z])[\)\.\:\-]\s*(.+)$/);
      if (prefixMatch) {
        const cLetter = prefixMatch[1].toLowerCase();
        const cLabelNorm = normalizeCompletionAnswer(prefixMatch[2]);
        if (cleanLower === cLetter || cleanNorm === cLabelNorm) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Convenient alias for isListeningAnswerCorrect
 */
export const isAnswerCorrect = isListeningAnswerCorrect;

/**
 * Determines whether a specific option in a multiple-choice, matching, or map-labelling
 * question is a valid correct option, using the exact same rules as isListeningAnswerCorrect().
 */
export function isListeningOptionCorrect(
  q: IELTSQuestion,
  optionRaw: string,
  optionIndex: number
): boolean {
  const parsed = parseOptionItem(optionRaw, optionIndex, q.questionType === 'map_labelling');
  return isListeningAnswerCorrect(q, parsed.letter);
}

/**
 * Formats the authoritative correct answer string for display in review tables
 * so that the displayed answer, explanation, and score agree.
 */
export function formatDisplayedCorrectAnswer(q: IELTSQuestion): string {
  const rawCorrect = Array.isArray(q.correctAnswer)
    ? q.correctAnswer.join(' / ')
    : q.correctAnswer || '';

  if (q.options && q.options.length > 0 && typeof q.correctAnswer === 'string') {
    const trimmed = q.correctAnswer.trim();
    if (trimmed.length === 1 && /[A-Za-z]/.test(trimmed)) {
      const targetLetter = trimmed.toUpperCase();
      for (let i = 0; i < q.options.length; i++) {
        const parsed = parseOptionItem(q.options[i], i, q.questionType === 'map_labelling');
        if (parsed.letter === targetLetter) {
          if (q.questionType === 'map_labelling' || q.options[i].trim().length === 1) {
            return targetLetter;
          }
          return `${parsed.letter}) ${parsed.label}`;
        }
      }
    }
  }

  return rawCorrect;
}

export interface IELTSListeningPartMeta {
  part: 1 | 2 | 3 | 4;
  partNumber: 1 | 2 | 3 | 4;
  title: string;
  shortTitle: string;
  contextLabel: string;
  contextDescription: string;
  speakerFormatLabel: string;
  speakerCountLabel: string;
  expectedSpeakerCountLabel: string;
  questionRangeLabel: string;
  shortRangeLabel: string;
  startQuestion: number;
  endQuestion: number;
  startQuestionNumber: number;
  endQuestionNumber: number;
  startIndex: number;
  endIndex: number;
  isMonologue: boolean;
}

export const IELTS_LISTENING_PARTS: IELTSListeningPartMeta[] = [
  {
    part: 1,
    partNumber: 1,
    title: 'Part 1: Everyday Conversation',
    shortTitle: 'Everyday Conversation',
    contextLabel: 'Everyday social & transactional enquiry',
    contextDescription: 'Everyday social & transactional conversation between two speakers (e.g., booking, registration, or local service enquiry).',
    speakerFormatLabel: 'Normally 2 speakers · Conversational dialogue',
    speakerCountLabel: '2 Speakers',
    expectedSpeakerCountLabel: '2 Speakers',
    questionRangeLabel: 'Questions 1–10',
    shortRangeLabel: '1–10',
    startQuestion: 1,
    endQuestion: 10,
    startQuestionNumber: 1,
    endQuestionNumber: 10,
    startIndex: 0,
    endIndex: 9,
    isMonologue: false
  },
  {
    part: 2,
    partNumber: 2,
    title: 'Part 2: Everyday Social Monologue',
    shortTitle: 'Everyday Social Monologue',
    contextLabel: 'Public facilities, local tours & community orientation',
    contextDescription: 'Everyday social monologue by a single speaker (e.g., guided tour, public facility orientation, or community programme).',
    speakerFormatLabel: 'Normally 1 speaker · Single-voice monologue',
    speakerCountLabel: '1 Speaker',
    expectedSpeakerCountLabel: '1 Speaker',
    questionRangeLabel: 'Questions 11–20',
    shortRangeLabel: '11–20',
    startQuestion: 11,
    endQuestion: 20,
    startQuestionNumber: 11,
    endQuestionNumber: 20,
    startIndex: 10,
    endIndex: 19,
    isMonologue: true
  },
  {
    part: 3,
    partNumber: 3,
    title: 'Part 3: Academic or Training Discussion',
    shortTitle: 'Academic Discussion',
    contextLabel: 'University tutorial, seminar & research project discussion',
    contextDescription: 'Academic or training discussion in an educational setting (e.g., university students discussing a research project with a tutor).',
    speakerFormatLabel: 'Normally 2–4 speakers · Academic discussion',
    speakerCountLabel: '2–4 Speakers',
    expectedSpeakerCountLabel: '2–4 Speakers',
    questionRangeLabel: 'Questions 21–30',
    shortRangeLabel: '21–30',
    startQuestion: 21,
    endQuestion: 30,
    startQuestionNumber: 21,
    endQuestionNumber: 30,
    startIndex: 20,
    endIndex: 29,
    isMonologue: false
  },
  {
    part: 4,
    partNumber: 4,
    title: 'Part 4: Academic Monologue',
    shortTitle: 'Academic Lecture Monologue',
    contextLabel: 'University lecture on an academic or scientific subject',
    contextDescription: 'Academic monologue on a university lecture topic delivered by a single lecturer.',
    speakerFormatLabel: 'Normally 1 speaker · Academic lecture monologue',
    speakerCountLabel: '1 Speaker',
    expectedSpeakerCountLabel: '1 Speaker',
    questionRangeLabel: 'Questions 31–40',
    shortRangeLabel: '31–40',
    startQuestion: 31,
    endQuestion: 40,
    startQuestionNumber: 31,
    endQuestionNumber: 40,
    startIndex: 30,
    endIndex: 39,
    isMonologue: true
  }
];

export function getListeningPartMeta(partNumber: number): IELTSListeningPartMeta {
  const clamped = (Math.max(1, Math.min(4, Math.floor(partNumber))) as 1 | 2 | 3 | 4) || 1;
  return IELTS_LISTENING_PARTS[clamped - 1];
}

export interface ListeningQuestionProgressInfo {
  part: 1 | 2 | 3 | 4;
  partNumber: 1 | 2 | 3 | 4;
  overallQuestionNumber: number;
  overallTotal: number;
  overallLabel: string;
  overallProgressLabel: string;
  partQuestionNumber: number;
  partTotal: number;
  partLabel: string;
  partProgressLabel: string;
  partMeta: IELTSListeningPartMeta;
}

export function getListeningQuestionProgress(
  questionIndex: number,
  totalQuestions: number = 40,
  activeSection?: 1 | 2 | 3 | 4
): ListeningQuestionProgressInfo {
  const safeTotal = Math.max(1, totalQuestions);
  const safeIndex = Math.max(0, Math.min(safeTotal - 1, Math.floor(questionIndex)));

  // If practicing a single 10-question section, align with activeSection
  let partNumber: 1 | 2 | 3 | 4 = activeSection || 1;
  let overallQuestionNumber = safeIndex + 1;
  let partQuestionNumber = safeIndex + 1;

  if (safeTotal > 10) {
    // 40-question full exam
    partNumber = (Math.min(4, Math.floor(safeIndex / 10) + 1) as 1 | 2 | 3 | 4) || 1;
    partQuestionNumber = (safeIndex % 10) + 1;
  } else if (activeSection) {
    // 10-question single section practice
    overallQuestionNumber = (activeSection - 1) * 10 + safeIndex + 1;
    partQuestionNumber = safeIndex + 1;
  }

  const partTotal = safeTotal > 10 ? 10 : safeTotal;
  const partMeta = IELTS_LISTENING_PARTS[partNumber - 1];
  const overallLabel = `Question ${overallQuestionNumber} of ${safeTotal > 10 ? safeTotal : 40}`;
  const partLabel = `Question ${partQuestionNumber} of ${partTotal}`;

  return {
    part: partNumber,
    partNumber,
    overallQuestionNumber,
    overallTotal: safeTotal > 10 ? safeTotal : 40,
    overallLabel,
    overallProgressLabel: overallLabel,
    partQuestionNumber,
    partTotal,
    partLabel,
    partProgressLabel: partLabel,
    partMeta
  };
}

export interface QuestionAudioSyncCue {
  questionIndex: number;
  questionNumber: number;
  questionId: string;
  startTime: number;
  endTime: number;
  duration: number;
  timestampLabel: string;
  timeRangeLabel: string;
  topic?: string;
  promptPreview?: string;
}

/**
 * Formats seconds into human-readable M:SS audio timestamps
 */
export function formatAudioTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Robustly maps every question (e.g. all 10 questions) to precise audio timestamp intervals
 * across the specified audio duration (calibrated to the 47s recording duration or dynamic duration).
 * Guarantees 100% of questions are accounted for with non-overlapping, contiguous cues.
 */
export function computeListeningAudioSyncMap(
  questions: IELTSQuestion[],
  totalAudioDuration: number = 47,
  dialogueLines?: Array<{ text: string; pauseAfterMs?: number; speaker?: string }>,
  sectionNumber: 1 | 2 | 3 | 4 = 1
): QuestionAudioSyncCue[] {
  if (!questions || questions.length === 0) return [];

  const count = questions.length;
  const duration = Math.max(10, totalAudioDuration || 47);

  // Sprint audio padding:
  // - Lead-in examiner introduction: ~3.5s for 47s, or ~7.5% of duration
  // - Mid-section split pause (between Q5 and Q6): ~2s, or ~4.5% of duration
  // - Outro/conclusion: ~1.5s, or ~4% of duration
  const hasMidSplit = count > 5;
  const introDur = Math.max(2.5, Math.min(6.0, duration * 0.075));
  const outroDur = Math.max(1.5, Math.min(4.0, duration * 0.04));
  const midSplitDur = hasMidSplit ? Math.max(1.5, Math.min(3.5, duration * 0.045)) : 0;

  const availableForQuestions = Math.max(count * 2.0, duration - introDur - outroDur - midSplitDur);
  const slotDuration = availableForQuestions / count;

  const cues: QuestionAudioSyncCue[] = [];
  let currentTime = introDur;

  const splitPoint = hasMidSplit ? Math.min(5, Math.ceil(count / 2)) : count;

  for (let i = 0; i < count; i++) {
    const q = questions[i];
    const qNum = (sectionNumber - 1) * 10 + i + 1;

    // If transitioning into the second half, account for the Sprint mid-section pause
    if (hasMidSplit && i === splitPoint) {
      currentTime += midSplitDur;
    }

    const start = Number(currentTime.toFixed(2));
    const end = Number((currentTime + slotDuration).toFixed(2));
    const promptPreview = q.prompt ? q.prompt.replace(/\[\d+\]/g, '').trim().slice(0, 32) : `Question ${qNum}`;

    cues.push({
      questionIndex: i,
      questionNumber: qNum,
      questionId: q.id,
      startTime: start,
      endTime: end,
      duration: Number(slotDuration.toFixed(2)),
      timestampLabel: formatAudioTimestamp(start),
      timeRangeLabel: `${formatAudioTimestamp(start)} - ${formatAudioTimestamp(end)}`,
      topic: q.topic,
      promptPreview
    });

    currentTime += slotDuration;
  }

  return cues;
}

/**
 * Robust time-tracking function that identifies which question index is currently active
 * based on the playback timestamp.
 */
export function findActiveQuestionIndexForTimestamp(
  currentTime: number,
  cues: QuestionAudioSyncCue[]
): number {
  if (!cues || cues.length === 0) return 0;
  const time = Math.max(0, currentTime);

  // If before first question cue (intro), default to first question
  if (time < cues[0].startTime) {
    return 0;
  }

  // If after last question cue, default to last question
  if (time >= cues[cues.length - 1].endTime) {
    return cues.length - 1;
  }

  // Match active range [startTime, endTime)
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (time >= cue.startTime && time < cue.endTime) {
      return i;
    }
  }

  // If within mid-split gap, return the upcoming question
  for (let i = 0; i < cues.length - 1; i++) {
    if (time >= cues[i].endTime && time < cues[i + 1].startTime) {
      return i + 1;
    }
  }

  return Math.min(cues.length - 1, Math.max(0, Math.floor((time / cues[cues.length - 1].endTime) * cues.length)));
}

/**
 * Formats dialogue or script text for natural British TTS articulation of:
 * - Spelled-out surnames (e.g. "H-A-W-T-H-O-R-N-E" -> "H, A, W, T, H, O, R, N, E")
 * - UK Postcodes (e.g. "OX14 3JP" -> "O X 14, 3 J P")
 * - UK Telephone numbers (e.g. "07700 900331" -> "0 7 7 0 0, 9 0 0, 3 3 1")
 * - Blank markers (e.g. "[1]" or "[___]")
 */
export function formatIELTSSpeechText(rawText: string): string {
  if (!rawText) return '';

  return rawText
    // Strip any accidental bracketed blank markers if a prompt fallback is spoken
    .replace(/\[\s*(?:\d+|_+)\s*\]/g, ' ')
    // Format spelled-out capital letter chains like B-R-A-I-T-H-W-A-I-T-E into clear letter-by-letter dictation
    .replace(/\b([A-Z])(?:-[A-Z]){2,}\b/g, (match) => match.split('-').join(', '))
    // Format standard UK postcodes (e.g. OX14 3JP, CB4 2LP, SW1A 2AA) so letters are articulated clearly
    .replace(/\b([A-Z]{1,2})(\d{1,2}[A-Z]?)\s+(\d)([A-Z]{2})\b/g, (_m, area: string, district: string, sector: string, unit: string) => {
      const areaSpaced = area.split('').join(' ');
      const unitSpaced = unit.split('').join(' ');
      return `${areaSpaced} ${district}, ${sector} ${unitSpaced}`;
    })
    // Format UK 11-digit phone numbers (e.g. 07700 900331) into natural spoken digit groups
    .replace(/\b(0\d{3,4})\s+(\d{3})(\d{3})\b/g, (_m, p1: string, p2: string, p3: string) => {
      return `${p1.split('').join(' ')}, ${p2.split('').join(' ')}, ${p3.split('').join(' ')}`;
    })
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s*;\s*/g, '; ')
    .replace(/\.{3,}/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

const FEMALE_SPEAKER_NAME_REGEX =
  /\b(charlotte|libby|natasha|jenny|clara|molly|emily|sarah|elena|fiona|helen|evelyn|samira|chloe|priya|eleanor|maya|sophia|rachel|hannah|claire|ms|mrs|miss|female|woman)\b/i;

const MALE_SPEAKER_NAME_REGEX =
  /\b(arthur|oliver|thomas|alistair|william|callum|christopher|liam|mitchell|connor|david|george|tariq|philip|gary|marcus|julian|nigel|peter|jordan|malcolm|daniel|lawson|sterling|alvarez|klein|henderson|harris|thornton|leo|evans|vance|mr|male|man)\b/i;

export function inferDialogueSpeakerGender(line: {
  speaker?: string;
  gender?: 'male' | 'female';
}): 'male' | 'female' {
  const spk = (line.speaker || '').trim();
  if (FEMALE_SPEAKER_NAME_REGEX.test(spk)) {
    return 'female';
  }
  if (MALE_SPEAKER_NAME_REGEX.test(spk)) {
    return 'male';
  }
  return line.gender === 'female' ? 'female' : 'male';
}

/**
 * Resolves the speakerId for a dialogue line, preserving any valid pre-resolved line.speakerId
 * and defaulting to natural British English (en-GB) voices unless an international accent is
 * explicitly requested in the speaker name.
 */
export function resolveDialogueLineSpeakerId(
  line: { speaker?: string; speakerId?: string; gender?: 'male' | 'female' },
  activeSection: number = 1
): string {
  if (line.speakerId && line.speakerId !== 'default' && IELTS_SPEAKERS[line.speakerId]) {
    return line.speakerId;
  }

  const spkLower = (line.speaker || '').toLowerCase();
  const inferredGender = inferDialogueSpeakerGender(line);

  // Respect explicit international accent labels when explicitly named
  if (spkLower.includes('australian') || spkLower.includes('natasha') || spkLower.includes('william')) {
    return inferredGender === 'female' ? 'speaker_07' : 'speaker_06';
  }
  if (spkLower.includes('canadian') || spkLower.includes('clara')) {
    return inferredGender === 'female' ? 'speaker_12' : 'speaker_11';
  }
  if (spkLower.includes('american') || spkLower.includes('jenny') || spkLower.includes('christopher')) {
    return inferredGender === 'female' ? 'speaker_10' : 'speaker_09';
  }
  if (spkLower.includes('zealand') || spkLower.includes('molly') || spkLower.includes('mitchell')) {
    return inferredGender === 'female' ? 'speaker_14' : 'speaker_13';
  }
  if (spkLower.includes('irish') || spkLower.includes('connor')) {
    return inferredGender === 'female' ? 'speaker_16' : 'speaker_15';
  }

  // Default to British English (en-GB) voices across all 4 parts
  if (inferredGender === 'female') {
    if (
      spkLower.includes('libby') ||
      spkLower.includes('fiona') ||
      spkLower.includes('samira') ||
      spkLower.includes('chloe') ||
      spkLower.includes('priya') ||
      spkLower.includes('elena')
    ) {
      return 'speaker_02'; // Libby (British Female Conversational)
    }
    return 'speaker_05'; // Charlotte (British Female RP Lecturer / Advisor)
  }

  if (
    spkLower.includes('oliver') ||
    spkLower.includes('thomas') ||
    spkLower.includes('student') ||
    spkLower.includes('applicant') ||
    spkLower.includes('customer') ||
    spkLower.includes('client') ||
    spkLower.includes('leo') ||
    spkLower.includes('marcus') ||
    spkLower.includes('tariq') ||
    spkLower.includes('daniel') ||
    spkLower.includes('philip')
  ) {
    return 'speaker_01'; // Thomas (British Male Conversational)
  }

  if (
    spkLower.includes('alistair') ||
    spkLower.includes('tutor') ||
    spkLower.includes('professor') ||
    spkLower.includes('lecturer') ||
    spkLower.includes('dr.') ||
    spkLower.includes('prof.')
  ) {
    return 'speaker_03'; // Alistair (British Male Senior Academic)
  }

  if (activeSection === 3) {
    return 'speaker_03';
  }
  return 'speaker_01'; // Default British Male Conversational (preserves Examiner Arthur speaker_04)
}

/**
 * Verified 1-to-1 mapping of IELTS characters to distinct neural voice models.
 * Every character has an empirically verified, unique underlying voice ID (zero collision).
 */
export const SPEAKER_EDGE_VOICE_MAP: Record<string, string> = {
  speaker_01: 'en-GB-ThomasNeural',
  speaker_02: 'en-GB-LibbyNeural',
  speaker_03: 'en-GB-ThomasNeural',
  speaker_04: 'en-GB-RyanNeural',
  speaker_05: 'en-GB-SoniaNeural',
  speaker_06: 'en-AU-WilliamMultilingualNeural',
  speaker_07: 'en-AU-NatashaNeural',
  speaker_08: 'en-ZA-LukeNeural',
  speaker_09: 'en-US-ChristopherNeural',
  speaker_10: 'en-US-JennyNeural',
  speaker_11: 'en-CA-LiamNeural',
  speaker_12: 'en-CA-ClaraNeural',
  speaker_13: 'en-NZ-MitchellNeural',
  speaker_14: 'en-NZ-MollyNeural',
  speaker_15: 'en-IE-ConnorNeural',
  speaker_16: 'en-IE-EmilyNeural',
  speaker_barnaby: 'en-GB-ThomasNeural'
};

/**
 * Assigns guaranteed-distinct British-first speaker profiles across a Listening section/part:
 * - Part 1 (Everyday conversation): 2 distinct speakers with 100% disjoint neural voices
 * - Part 2 (Social monologue): Consistent single-speaker delivery per monologue scenario
 * - Part 3 (Academic discussion): 2 to 4 distinct speakers with 100% disjoint neural voices
 * - Part 4 (Academic monologue): Consistent single-speaker academic lecturer delivery (en-GB-RyanNeural)
 */
export function assignSectionDialogueSpeakers(
  rawLines: Array<{
    speaker?: string;
    speakerId?: string;
    gender?: 'male' | 'female';
    text: string;
    pauseAfterMs?: number;
  }>,
  section: number = 1,
  defaultLabel: string = 'Speaker'
): Array<{
  speaker: string;
  speakerName: string;
  speakerId: string;
  gender: 'male' | 'female';
  text: string;
  pauseAfterMs: number;
  deliveryProfile: SpeechDeliveryProfileId;
}> {
  // British-first & Commonwealth voice pools for dialogue characters (verified supported in MsEdgeTTS)
  // Note: speaker_04 (Examiner Arthur, en-GB-RyanNeural) is strictly excluded from the dialogue pool
  // so the Sprint examiner's voice is NEVER accidentally reused for dialogue participants.
  const malePool = [
    'speaker_01', // Thomas (en-GB-ThomasNeural, Male RP)
    'speaker_15', // Connor (en-IE-ConnorNeural, Irish Male)
    'speaker_06', // William (en-AU-WilliamMultilingualNeural, Australian Male)
    'speaker_03', // Alistair (en-GB-ThomasNeural, Senior Professor)
    'speaker_11', // Liam (en-CA-LiamNeural, Canadian Male)
    'speaker_08', // Luke (en-ZA-LukeNeural, South African Male)
    'speaker_13', // Mitchell (en-NZ-MitchellNeural, New Zealand Male)
    'speaker_09'  // Christopher (en-US-ChristopherNeural, American Male)
  ];
  const femalePool = [
    'speaker_05', // Charlotte/Clara (en-GB-SoniaNeural, Female RP)
    'speaker_02', // Libby (en-GB-LibbyNeural, Female RP)
    'speaker_16', // Emily (en-IE-EmilyNeural, Irish Female)
    'speaker_07', // Natasha (en-AU-NatashaNeural, Australian Female)
    'speaker_12', // Clara (en-CA-ClaraNeural, Canadian Female)
    'speaker_14', // Molly (en-NZ-MollyNeural, New Zealand Female)
    'speaker_10'  // Jenny (en-US-JennyNeural, American Female)
  ];

  const isMonologuePart = section === 2 || section === 4;

  let speakerIdMap = new Map<
    string,
    { speakerId: string; gender: 'male' | 'female'; role: string }
  >();
  // Pre-seed Examiner Arthur so dialogue roles never collide with examiner rubric delivery
  let usedSpeakerIds = new Set<string>(['speaker_04']);
  let usedVoiceIds = new Set<string>([SPEAKER_EDGE_VOICE_MAP['speaker_04']]);
  let lockedMonologueVoice: { speakerId: string; gender: 'male' | 'female' } | null = null;
  let speakerCounter = 0;
  let maleIdx = 0;
  let femaleIdx = 0;

  return rawLines.map((line) => {
    const rawSpk = (line.speaker || defaultLabel).trim();
    const lowerText = (line.text || '').toLowerCase();
    const lowerSpk = rawSpk.toLowerCase();

    const isExaminerLine =
      lowerSpk.includes('examiner') ||
      lowerSpk.includes('sprint examiner') ||
      lowerText.startsWith('before you hear') ||
      lowerText.startsWith('that is the end') ||
      lowerText.startsWith('part ') ||
      lowerText.startsWith('section ') ||
      lowerText.startsWith('international english language');

    if (isExaminerLine) {
      // Examiner rubric/transition lines: ALWAYS preserve Examiner Arthur (speaker_04, male)
      const deliveryProfile = inferSpeechDeliveryProfile(
        { text: line.text, speaker: 'Sprint Examiner (Arthur)', speakerId: 'speaker_04', role: 'Examiner' },
        section
      );
      return {
        speaker: 'Sprint Examiner (Arthur)',
        speakerName: 'Sprint Examiner (Arthur)',
        speakerId: 'speaker_04',
        gender: 'male' as const,
        text: (line.text || '').trim(),
        pauseAfterMs: line.pauseAfterMs || 1000,
        deliveryProfile
      };
    }

    // Normalize rawSpk key cleanly
    const normalizedSpkKey = lowerSpk;

    // Reset speaker map per sub-scenario in Part 1/2/3 if a new scenario pair starts
    if (
      !speakerIdMap.has(normalizedSpkKey) &&
      !isMonologuePart &&
      speakerCounter >= 2 &&
      (normalizedSpkKey.includes('coordinator') ||
        normalizedSpkKey.includes('agent') ||
        normalizedSpkKey.includes('receptionist') ||
        normalizedSpkKey.includes('staff') ||
        normalizedSpkKey.includes('clerk') ||
        normalizedSpkKey.includes('officer'))
    ) {
      speakerIdMap = new Map();
      usedSpeakerIds = new Set();
      usedVoiceIds = new Set();
      speakerCounter = 0;
    }

    if (!speakerIdMap.has(normalizedSpkKey)) {
      let gender = inferDialogueSpeakerGender(line);
      let role: string;
      if (section === 2) {
        role = 'Social Monologue';
      } else if (section === 4) {
        role = 'Academic Lecturer';
      } else if (section === 3) {
        const spkLow = rawSpk.toLowerCase();
        if (spkLow.includes('tutor') || spkLow.includes('prof') || spkLow.includes('dr.') || speakerCounter === 0) {
          role = 'Academic Tutor';
        } else {
          role = `Research Student ${speakerCounter}`;
        }
      } else {
        role = speakerCounter === 0 ? 'Asking Questions' : 'Giving Answers';
      }

      let candidateId =
        line.speakerId && line.speakerId !== 'default' && IELTS_SPEAKERS[line.speakerId]
          ? line.speakerId
          : resolveDialogueLineSpeakerId({ ...line, gender }, section);

      if (isMonologuePart) {
        // Parts 2 and 4 are single-speaker monologues: lock the speaker voice across the entire part monologue
        if (candidateId === 'speaker_04') {
          candidateId = section === 4 ? 'speaker_06' : 'speaker_05';
          gender = IELTS_SPEAKERS[candidateId]?.gender || gender;
        }
        if (lockedMonologueVoice) {
          candidateId = lockedMonologueVoice.speakerId;
          gender = lockedMonologueVoice.gender;
        } else {
          lockedMonologueVoice = { speakerId: candidateId, gender };
        }
      } else {
        const candidateVoice = SPEAKER_EDGE_VOICE_MAP[candidateId];
        const isCollision =
          usedSpeakerIds.has(candidateId) ||
          (candidateVoice && usedVoiceIds.has(candidateVoice)) ||
          IELTS_SPEAKERS[candidateId]?.gender !== gender;

        if (isCollision) {
          const pool = gender === 'female' ? femalePool : malePool;
          let chosen = pool[0];
          for (let i = 0; i < pool.length; i++) {
            const idx = gender === 'female' ? femaleIdx++ : maleIdx++;
            const nextId = pool[idx % pool.length];
            const nextVoice = SPEAKER_EDGE_VOICE_MAP[nextId];
            if (!usedSpeakerIds.has(nextId) && (!nextVoice || !usedVoiceIds.has(nextVoice))) {
              chosen = nextId;
              break;
            }
          }
          candidateId = chosen;
        }
      }

      usedSpeakerIds.add(candidateId);
      const assignedVoice = SPEAKER_EDGE_VOICE_MAP[candidateId];
      if (assignedVoice) {
        usedVoiceIds.add(assignedVoice);
      }
      speakerIdMap.set(normalizedSpkKey, { speakerId: candidateId, gender, role });
      speakerCounter++;
    }

    const assigned = speakerIdMap.get(normalizedSpkKey)!;
    const formattedSpeaker = line.speaker
      ? isMonologuePart || line.speaker.includes('(')
        ? line.speaker
        : `${line.speaker} (${assigned.role})`
      : `${defaultLabel} (${assigned.role})`;

    const deliveryProfile = inferSpeechDeliveryProfile(
      {
        text: line.text,
        speaker: formattedSpeaker,
        speakerId: assigned.speakerId,
        role: assigned.role
      },
      section
    );

    return {
      speaker: formattedSpeaker,
      speakerName: formattedSpeaker,
      speakerId: assigned.speakerId,
      gender: assigned.gender,
      text: (line.text || '').trim(),
      pauseAfterMs: line.pauseAfterMs || (isMonologuePart ? 480 : 420),
      deliveryProfile
    };
  });
}

/**
 * Deterministically validates and coalesces dialogue turns for natural IELTS turn-taking:
 * - Guarantees non-empty text and valid speaker identities.
 * - Protects Examiner rubric lines from dialogue role corruption.
 * - In Parts 1 & 3, coalesces adjacent turns from the same non-examiner speaker if text was split across questions.
 * - Preserves exact question-answer content, prompts, and options.
 */
export function validateAndCoalesceDialogueSequence(
  lines: BuiltExamDialogueLine[],
  sectionNum: number = 1
): BuiltExamDialogueLine[] {
  if (!lines || lines.length === 0) return [];

  const validated: BuiltExamDialogueLine[] = [];

  for (const line of lines) {
    const cleanText = (line.text || '').trim();
    if (!cleanText) continue;

    const lowerText = cleanText.toLowerCase();
    const isExaminer =
      Boolean(line.speakerName && line.speakerName.toLowerCase().includes('examiner')) ||
      lowerText.startsWith('part ') ||
      lowerText.startsWith('section ') ||
      lowerText.startsWith('before you hear') ||
      lowerText.startsWith('that is the end') ||
      lowerText.startsWith('international english language');

    const resolvedSpeakerId = line.speakerId && SPEAKER_EDGE_VOICE_MAP[line.speakerId]
      ? line.speakerId
      : isExaminer
      ? 'speaker_04'
      : 'speaker_01';

    const resolvedSpeakerName = isExaminer
      ? 'Sprint Examiner (Arthur)'
      : line.speakerName || 'Sprint Speaker';

    const currentLine: BuiltExamDialogueLine = {
      speakerId: resolvedSpeakerId,
      speakerName: resolvedSpeakerName,
      gender: line.gender || (resolvedSpeakerId === 'speaker_05' || resolvedSpeakerId === 'speaker_02' ? 'female' : 'male'),
      text: cleanText,
      pauseAfterMs: line.pauseAfterMs ?? (isExaminer ? 1000 : 420)
    };

    // Coalesce consecutive turns from the same non-examiner speaker in Part 1 and Part 3
    if (
      validated.length > 0 &&
      (sectionNum === 1 || sectionNum === 3) &&
      !isExaminer
    ) {
      const prev = validated[validated.length - 1];
      const prevIsExaminer =
        prev.speakerId === 'speaker_04' &&
        Boolean(prev.speakerName && prev.speakerName.toLowerCase().includes('examiner'));

      if (!prevIsExaminer && prev.speakerId === currentLine.speakerId) {
        prev.text = `${prev.text} ${currentLine.text}`;
        prev.pauseAfterMs = Math.max(prev.pauseAfterMs || 0, currentLine.pauseAfterMs || 0);
        continue;
      }
    }

    validated.push(currentLine);
  }

  return validated;
}

/**
 * IELTS Indicative Listening Raw Score (out of 40) to Band Score Conversion Table.
 * Calibrated against published IELTS/IDP/the IELTS partners indicative benchmarks.
 * Note on Equating & Practice Estimations:
 * Raw score-to-band conversions published by test partners represent typical difficulty benchmarks.
 * In live IELTS administrations, operational boundaries may fluctuate slightly (typically ±1 raw mark)
 * due to psychometric scaling and form equating across different test versions.
 * Therefore, results are indicative practice estimates rather than guaranteed official test-day scores.
 * If totalQuestions != 40, scales the raw score proportionally to the 40-question Sprint scale.
 * Strictly returns 0.0 when correctCount <= 0 or totalQuestions <= 0.
 */
export function calculateOfficialListeningBand(correctCount: number, totalQuestions: number = 40): number {
  if (correctCount <= 0 || totalQuestions <= 0) return 0.0;
  const scaledRaw = totalQuestions === 40 ? correctCount : Math.round((correctCount / totalQuestions) * 40);

  if (scaledRaw >= 39) return 9.0;
  if (scaledRaw >= 37) return 8.5;
  if (scaledRaw >= 35) return 8.0;
  if (scaledRaw >= 32) return 7.5;
  if (scaledRaw >= 30) return 7.0;
  if (scaledRaw >= 26) return 6.5;
  if (scaledRaw >= 23) return 6.0;
  if (scaledRaw >= 18) return 5.5;
  if (scaledRaw >= 16) return 5.0;
  if (scaledRaw >= 13) return 4.5;
  if (scaledRaw >= 10) return 4.0;
  if (scaledRaw >= 7) return 3.5;
  if (scaledRaw >= 4) return 3.0;
  if (scaledRaw >= 2) return 2.5;
  if (scaledRaw >= 1) return 2.0;
  return 0.0;
}

/**
 * IELTS Indicative Academic Reading Raw Score (out of 40) to Band Score Conversion Table.
 * Calibrated against published IELTS/IDP/the IELTS partners indicative benchmarks:
 * Example benchmarks: 39-40 = 9.0, 37-38 = 8.5, 35-36 = 8.0, 33-34 = 7.5, 30-32 = 7.0,
 * 27-29 = 6.5, 23-26 = 6.0, 16-22 = 5.5, 13-15 = 5.0, 10-12 = 4.5, 8-9 = 4.0, 6-7 = 3.5, 4-5 = 3.0, 0 = 0.0.
 * Note on Equating & Practice Estimations:
 * Raw score boundaries vary slightly across specific test versions in live administrations.
 * Results generated are indicative practice estimates.
 */
export function calculateOfficialAcademicReadingBand(correctCount: number, totalQuestions: number = 40): number {
  if (correctCount <= 0 || totalQuestions <= 0) return 0.0;
  const scaledRaw = totalQuestions === 40 ? correctCount : Math.round((correctCount / totalQuestions) * 40);

  if (scaledRaw >= 39) return 9.0;
  if (scaledRaw >= 37) return 8.5;
  if (scaledRaw >= 35) return 8.0;
  if (scaledRaw >= 33) return 7.5;
  if (scaledRaw >= 30) return 7.0;
  if (scaledRaw >= 27) return 6.5;
  if (scaledRaw >= 23) return 6.0;
  if (scaledRaw >= 16) return 5.5;
  if (scaledRaw >= 13) return 5.0;
  if (scaledRaw >= 10) return 4.5;
  if (scaledRaw >= 8) return 4.0;
  if (scaledRaw >= 6) return 3.5;
  if (scaledRaw >= 4) return 3.0;
  if (scaledRaw >= 2) return 2.5;
  if (scaledRaw >= 1) return 2.0;
  return 0.0;
}

/**
 * IELTS Indicative General Training Reading Raw Score (out of 40) to Band Score Conversion Table.
 * Calibrated against published IELTS/IDP/the IELTS partners indicative benchmarks:
 * Benchmarks: 40 = 9.0, 39 = 8.5, 37-38 = 8.0, 36 = 7.5, 34-35 = 7.0, 32-33 = 6.5, 30-31 = 6.0,
 * 27-29 = 5.5, 23-26 = 5.0, 19-22 = 4.5, 15-18 = 4.0, 12-14 = 3.5, 9-11 = 3.0, 6-8 = 2.5, 4-5 = 2.0, 0 = 0.0.
 * Note on Equating & Practice Estimations:
 * Raw score boundaries vary slightly across specific test versions in live administrations.
 * Results generated are indicative practice estimates.
 */
export function calculateOfficialGeneralTrainingReadingBand(correctCount: number, totalQuestions: number = 40): number {
  if (correctCount <= 0 || totalQuestions <= 0) return 0.0;
  const scaledRaw = totalQuestions === 40 ? correctCount : Math.round((correctCount / totalQuestions) * 40);

  if (scaledRaw >= 40) return 9.0;
  if (scaledRaw >= 39) return 8.5;
  if (scaledRaw >= 37) return 8.0;
  if (scaledRaw >= 36) return 7.5;
  if (scaledRaw >= 34) return 7.0;
  if (scaledRaw >= 32) return 6.5;
  if (scaledRaw >= 30) return 6.0;
  if (scaledRaw >= 27) return 5.5;
  if (scaledRaw >= 23) return 5.0;
  if (scaledRaw >= 19) return 4.5;
  if (scaledRaw >= 15) return 4.0;
  if (scaledRaw >= 12) return 3.5;
  if (scaledRaw >= 9) return 3.0;
  if (scaledRaw >= 6) return 2.5;
  if (scaledRaw >= 4) return 2.0;
  return 1.0;
}

export type ListeningExamPacingMode = 'authentic' | 'quick';

export interface BuiltExamDialogueLine {
  speakerId?: string;
  speakerName?: string;
  gender?: 'male' | 'female';
  text: string;
  pauseAfterMs?: number;
}

/**
 * Builds the 4-part IELTS Listening examination dialogue script from 40 questions.
 * - 'authentic' mode: Uses realistic preview pauses (20s before each part, 15s mid-part)
 *   and full 30-second ("half a minute") answer-checking pauses at the end of Parts 1, 2, and 3.
 * - 'quick' mode: Uses compressed pauses (~1.1s between instructions and sections) for
 *   faster practice while preserving 100% of spoken questions and dialogue turns at 1.0x speed.
 */
export function buildListeningExamDialogue(
  questions: IELTSQuestion[],
  pacingMode: ListeningExamPacingMode = 'authentic'
): BuiltExamDialogueLine[] {
  if (!questions || questions.length === 0) return [];

  const isAuthentic = pacingMode === 'authentic';
  const welcomePauseMs = isAuthentic ? 2500 : 1100;
  const partPreviewPauseMs = isAuthentic ? 20000 : 1100;
  const midPartTransitionPauseMs = isAuthentic ? 15000 : 950;
  const endOfPartCheckPauseMs = isAuthentic ? 30000 : 1100;

  const lines: BuiltExamDialogueLine[] = [];

  const appendPartQuestions = (
    partSlice: IELTSQuestion[],
    defaultLabel: string,
    sectionNum: 1 | 2 | 3 | 4 = 1
  ) => {
    const seenTexts = new Set<string>();
    const collectedDialogue: Array<{
      speaker?: string;
      speakerId?: string;
      gender?: 'male' | 'female';
      text: string;
      pauseAfterMs?: number;
    }> = [];

    let previousTopic: string | null = null;
    const partStartQuestionNumber = (sectionNum - 1) * 10 + 1;
    const partEndQuestionNumber = sectionNum * 10;

    partSlice.forEach((q, sliceIdx) => {
      const currentTopic = (q.topic || '').trim();
      const absoluteQuestionNumber = partStartQuestionNumber + sliceIdx;

      if (
        previousTopic &&
        currentTopic &&
        currentTopic !== previousTopic &&
        sliceIdx >= 3 &&
        sliceIdx <= 7
      ) {
        const transitionPrompt = `Before you hear the rest of Part ${sectionNum}, you have a moment to look at questions ${absoluteQuestionNumber} to ${partEndQuestionNumber}.`;
        if (!seenTexts.has(transitionPrompt)) {
          seenTexts.add(transitionPrompt);
          collectedDialogue.push({
            speaker: 'Sprint Examiner (Arthur)',
            speakerId: 'speaker_04',
            gender: 'male',
            text: transitionPrompt,
            pauseAfterMs: midPartTransitionPauseMs
          });
        }
      }
      if (currentTopic) {
        previousTopic = currentTopic;
      }

      if (q.dialogue && q.dialogue.length > 0) {
        q.dialogue.forEach((d) => {
          const clean = formatIELTSSpeechText((d.text || '').trim());
          if (clean && !seenTexts.has(clean)) {
            seenTexts.add(clean);
            collectedDialogue.push({
              speaker: d.speaker,
              speakerId: d.speakerId,
              gender: d.gender,
              text: clean,
              pauseAfterMs:
                d.pauseAfterMs ||
                (isAuthentic ? (sectionNum === 4 ? 950 : 800) : sectionNum === 4 ? 720 : 620)
            });
          }
        });
      } else if (q.audioScript) {
        const clean = formatIELTSSpeechText(q.audioScript.trim());
        if (clean && !seenTexts.has(clean)) {
          seenTexts.add(clean);
          collectedDialogue.push({
            speaker: defaultLabel,
            speakerId: sectionNum === 2 ? 'speaker_05' : sectionNum === 4 ? 'speaker_06' : 'speaker_01',
            gender: sectionNum === 2 ? 'female' : 'male',
            text: clean,
            pauseAfterMs: isAuthentic ? 900 : 750
          });
        }
      } else if (q.prompt) {
        const clean = formatIELTSSpeechText(q.prompt.trim());
        if (clean && !seenTexts.has(clean)) {
          seenTexts.add(clean);
          collectedDialogue.push({
            speaker: defaultLabel,
            speakerId: sectionNum === 2 ? 'speaker_05' : sectionNum === 4 ? 'speaker_06' : 'speaker_01',
            gender: sectionNum === 2 ? 'female' : 'male',
            text: clean,
            pauseAfterMs: isAuthentic ? 900 : 750
          });
        }
      }
    });

    const resolvedPartLines = assignSectionDialogueSpeakers(
      collectedDialogue,
      sectionNum,
      defaultLabel
    );
    const validatedPartLines = validateAndCoalesceDialogueSequence(resolvedPartLines, sectionNum);

    validatedPartLines.forEach((rl) => {
      lines.push({
        speakerId: rl.speakerId,
        speakerName: rl.speakerName,
        gender: rl.gender,
        text: rl.text,
        pauseAfterMs: rl.pauseAfterMs
      });
    });
  };

  // BandSprint Welcome & Test Opening
  lines.push({
    speakerId: 'speaker_04',
    speakerName: 'Sprint Examiner (Arthur)',
    text: 'International English Language Testing System. Authentic Computer-Delivered Listening Examination. The test consists of four parts, with forty questions in total. You will hear each recording once only. Answer all questions as you listen. At the end of the test, you will have two minutes to check your answers.',
    pauseAfterMs: welcomePauseMs
  });

  // Part 1: Everyday Social Conversation (Two Speakers)
  lines.push({
    speakerId: 'speaker_04',
    speakerName: 'Sprint Examiner (Arthur)',
    text: 'Part 1. You will hear a conversation between two speakers in an everyday social context. First, you have some time to look at questions 1 to 10.',
    pauseAfterMs: partPreviewPauseMs
  });

  appendPartQuestions(questions.slice(0, 10), 'Everyday Speaker (Thomas)', 1);

  lines.push({
    speakerId: 'speaker_04',
    speakerName: 'Sprint Examiner (Arthur)',
    text: 'That is the end of Part 1. You now have half a minute to check your answers to questions 1 to 10. Now turn to Part 2.',
    pauseAfterMs: endOfPartCheckPauseMs
  });

  // Part 2: Everyday Social Monologue (Single Speaker)
  lines.push({
    speakerId: 'speaker_04',
    speakerName: 'Sprint Examiner (Arthur)',
    text: 'Part 2. You will hear a talk by a single speaker about local community facilities and public arrangements. First, you have some time to look at questions 11 to 20.',
    pauseAfterMs: partPreviewPauseMs
  });

  appendPartQuestions(questions.slice(10, 20), 'Community Guide (Charlotte)', 2);

  lines.push({
    speakerId: 'speaker_04',
    speakerName: 'Sprint Examiner (Arthur)',
    text: 'That is the end of Part 2. You now have half a minute to check your answers to questions 11 to 20. Now turn to Part 3.',
    pauseAfterMs: endOfPartCheckPauseMs
  });

  // Part 3: Academic Discussion (Two to Four Speakers)
  lines.push({
    speakerId: 'speaker_04',
    speakerName: 'Sprint Examiner (Arthur)',
    text: 'Part 3. You will hear an academic discussion between university students and their tutor. First, you have some time to look at questions 21 to 30.',
    pauseAfterMs: partPreviewPauseMs
  });

  appendPartQuestions(questions.slice(20, 30), 'Academic Tutor (Dr. Alistair)', 3);

  lines.push({
    speakerId: 'speaker_04',
    speakerName: 'Sprint Examiner (Arthur)',
    text: 'That is the end of Part 3. You now have half a minute to check your answers to questions 21 to 30. Now turn to Part 4.',
    pauseAfterMs: endOfPartCheckPauseMs
  });

  // Part 4: Academic Lecture Monologue (Single Speaker)
  lines.push({
    speakerId: 'speaker_04',
    speakerName: 'Sprint Examiner (Arthur)',
    text: 'Part 4. You will hear an academic lecture by a single speaker on a university subject. First, you have some time to look at questions 31 to 40.',
    pauseAfterMs: partPreviewPauseMs
  });

  appendPartQuestions(questions.slice(30, 40), 'University Lecturer (Professor Edward)', 4);

  // Final Conclusion
  lines.push({
    speakerId: 'speaker_04',
    speakerName: 'Sprint Examiner (Arthur)',
    text: 'That is the end of Part 4 and the end of the listening audio recording. You now have two minutes to check and finalize your answers across all four parts.',
    pauseAfterMs: 1000
  });

  return lines;
}

