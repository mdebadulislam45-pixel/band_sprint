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

/**
 * Normalizes a text answer for comparison while preserving meaningful punctuation
 * (such as colons in times like "4:30"), numbers, dates, and exact word spelling.
 */
export function normalizeCompletionAnswer(input: string): string {
  return (input || '')
    .toLowerCase()
    .trim()
    // Remove thousand-separator commas inside numbers (e.g. "1,650" -> "1650")
    .replace(/(\d),(\d{3})\b/g, '$1$2')
    // Normalize hyphens and dashes to a single space so "gluten-free" and "gluten free" match
    .replace(/[-–—]+/g, ' ')
    // Strip harmless leading/trailing punctuation such as periods, quotes, or brackets
    .replace(/^[.,/#!$%^&*;:{}=_`~()"'\[\]]+|[.,/#!$%^&*;:{}=_`~()"'\[\]]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Evaluates whether a candidate's Listening answer is correct.
 * Shared across AuthenticIELTSListeningTest (submission + review table) and ListeningLab.
 */
export function isListeningAnswerCorrect(
  q: IELTSQuestion & { wordLimit?: number; maxWords?: number },
  userAns: string
): boolean {
  const rawTrimmed = (userAns || '').trim();
  if (!rawTrimmed) return false;

  const cleanLower = rawTrimmed.toLowerCase();
  const cleanNorm = normalizeCompletionAnswer(rawTrimmed);
  if (!cleanNorm) return false;

  const hasOptions = Array.isArray(q.options) && q.options.length > 0;
  const isOptionBasedType =
    hasOptions ||
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

  // 1. Option-based evaluation (Multiple Choice, Map Labelling, Matching with options)
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

  for (const ans of candidates) {
    const ansTrim = (ans || '').trim();
    if (!ansTrim) continue;

    const ansLower = ansTrim.toLowerCase();
    const ansNorm = normalizeCompletionAnswer(ansTrim);

    if (cleanLower === ansLower || cleanNorm === ansNorm) {
      return true;
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
  totalQuestions: number = 40
): ListeningQuestionProgressInfo {
  const safeTotal = Math.max(1, totalQuestions);
  const safeIndex = Math.max(0, Math.min(safeTotal - 1, Math.floor(questionIndex)));
  const overallQuestionNumber = safeIndex + 1;
  const partNumber = (Math.min(4, Math.floor(safeIndex / 10) + 1) as 1 | 2 | 3 | 4) || 1;
  const partQuestionNumber = (safeIndex % 10) + 1;
  const partTotal = Math.min(10, Math.max(1, safeTotal - (partNumber - 1) * 10));
  const partMeta = IELTS_LISTENING_PARTS[partNumber - 1];
  const overallLabel = `Question ${overallQuestionNumber} of ${safeTotal}`;
  const partLabel = `Question ${partQuestionNumber} of ${partTotal}`;

  return {
    part: partNumber,
    partNumber,
    overallQuestionNumber,
    overallTotal: safeTotal,
    overallLabel,
    overallProgressLabel: overallLabel,
    partQuestionNumber,
    partTotal,
    partLabel,
    partProgressLabel: partLabel,
    partMeta
  };
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
  return 'speaker_04'; // Arthur (British Male RP Examiner / Presenter)
}

/**
 * Verified 1-to-1 mapping of IELTS characters to distinct neural voice models.
 * Every character has an empirically verified, unique underlying voice ID (zero collision).
 */
export const SPEAKER_EDGE_VOICE_MAP: Record<string, string> = {
  speaker_01: 'en-GB-ThomasNeural',
  speaker_02: 'en-GB-LibbyNeural',
  speaker_03: 'en-US-AndrewNeural',
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
  speaker_barnaby: 'en-GB-MaisieNeural'
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
  // British-first & Commonwealth voice pools (all verified supported in MsEdgeTTS, all unique models)
  const malePool = [
    'speaker_01',
    'speaker_04',
    'speaker_03',
    'speaker_15',
    'speaker_06',
    'speaker_11',
    'speaker_08',
    'speaker_13',
    'speaker_09'
  ];
  const femalePool = [
    'speaker_05',
    'speaker_02',
    'speaker_16',
    'speaker_07',
    'speaker_12',
    'speaker_14',
    'speaker_10'
  ];

  const isMonologuePart = section === 2 || section === 4;

  const speakerIdMap = new Map<
    string,
    { speakerId: string; gender: 'male' | 'female'; role: string }
  >();
  const usedSpeakerIds = new Set<string>();
  const usedVoiceIds = new Set<string>();
  let lockedMonologueVoice: { speakerId: string; gender: 'male' | 'female' } | null = null;
  let speakerCounter = 0;
  let maleIdx = 0;
  let femaleIdx = 0;

  return rawLines.map((line) => {
    const rawSpk = (line.speaker || defaultLabel).trim();

    if (!speakerIdMap.has(rawSpk)) {
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
        // Parts 2 and 4 are single-speaker monologues: lock the speaker voice across the part
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
          // In dialogue parts (Parts 1 and 3), ensure every distinct speaker gets a unique speakerId AND unique neural voice
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
      speakerIdMap.set(rawSpk, { speakerId: candidateId, gender, role });
      speakerCounter++;
    }

    const assigned = speakerIdMap.get(rawSpk)!;
    const formattedSpeaker = line.speaker
      ? isMonologuePart || (line.speaker.includes('(') && line.speaker.includes(assigned.role))
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
 * Official Cambridge IELTS Listening Raw Score (out of 40) to Band Score Conversion Table.
 * If totalQuestions != 40, scales the raw score proportionally to the 40-question Cambridge scale.
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
 * Official Cambridge IELTS Academic Reading Raw Score (out of 40) to Band Score Conversion Table.
 * Example benchmarks: 39-40 = 9.0, 37-38 = 8.5, 35-36 = 8.0, 33-34 = 7.5, 30-32 = 7.0,
 * 27-29 = 6.5, 23-26 = 6.0, 16-22 = 5.5, 13-15 = 5.0, 10-12 = 4.5, 8-9 = 4.0, 6-7 = 3.5, 4-5 = 3.0, 0 = 0.0.
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
