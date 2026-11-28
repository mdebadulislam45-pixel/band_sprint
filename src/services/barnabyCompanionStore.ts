import { loadExamSetup } from './examSetupService';
import { loadOnboardingSurvey } from './onboardingSurveyStore';
import { loadDiagnosticResult } from './diagnosticResultStore';
import { getMistakes } from '../utils/vaultStorage';
import { getActiveUser } from '../utils/userStorage';
import {
  aggregateExamHistory,
  IeltsSkillKey,
  validateOptionalHalfBand
} from '../utils/historyAggregation';
import { auth } from '../lib/firebase';
import { getStoredSessionToken } from './authService';

export const BARNABY_CORE_PHILOSOPHY =
  "I'm not here to study instead of you. I'm here to help you become better than yesterday.";

export type BarnabyMood =
  | 'happy'
  | 'excited'
  | 'proud'
  | 'curious'
  | 'playful'
  | 'cheering'
  | 'sleepy'
  | 'thinking'
  | 'petted'
  | 'eating';

export interface BarnabyQuizPayload {
  question: string;
  options: string[];
  correctIndex: number;
  explanationEn: string;
  explanationBn: string;
  selectedIndex?: number;
}

export interface BarnabyGuideAction {
  label: string;
  route: string;
}

export interface BarnabyMessage {
  id: string;
  sender: 'user' | 'barnaby';
  text: string;
  badge?: string;
  mood?: BarnabyMood;
  strategyTip?: string;
  bengaliTip?: string;
  collocations?: string[];
  suggestedAction?: BarnabyGuideAction;
  quiz?: BarnabyQuizPayload;
  rating?: 'up' | 'down' | null;
  createdAt: number;
}

export interface BarnabyCompanionState {
  messages: BarnabyMessage[];
  bondXp: number;
  petsCount: number;
  treatsFed: number;
  quizzesSolved: number;
  mood: BarnabyMood;
  activityText: string;
  freeRoam: boolean;
  lastInteractionAt: number;
}

export interface RecurringMistakePattern {
  category: string;
  count: number;
  module: string;
}

export interface DiagnosticEstimateContext {
  overall: number | null;
  weakest: IeltsSkillKey | null;
  completedAt: number;
}

export interface StudentContextSnapshot {
  userId: string | null;
  userName: string;
  targetBand: number;
  examMode: 'Academic' | 'General Training';
  daysUntilExam: number | null;
  /** Latest verified 4-skill Full Mock overall band, or strictly null if none exists. */
  latestVerifiedOverallBand: number | null;
  completedFullMockCount: number;
  evaluatedAttemptCount: number;
  practiceAttemptCount: number;
  /** Per-skill latest verified bands; missing/unassessed skills remain strictly null. */
  skillBands: Record<IeltsSkillKey, number | null>;
  /** Practice diagnostic estimate kept strictly separate from verified exam scores. */
  diagnosticEstimate: DiagnosticEstimateContext | null;
  /** Weakest skill derived from verified history, diagnostic estimate, or self-report — or null if unknown. */
  weakestSkill: IeltsSkillKey | null;
  weakestSkillSource: 'verified_history' | 'diagnostic_estimate' | 'self_reported' | 'none';
  mistakeCount: number;
  topMistake: string;
  recurringMistakePattern: RecurringMistakePattern | null;
  currentActivity: string;
  currentPage: string;
}

export const BARNABY_STATE_EVENT = 'bandsprint_barnaby_state_updated';

const STORAGE_PREFIX = 'bandsprint_barnaby_companion_v2_';

export const MOOD_META: Record<
  BarnabyMood,
  { label: string; emoji: string; ringClass: string; animClass: string }
> = {
  happy: {
    label: 'Cheerful',
    emoji: '✨',
    ringClass: 'ring-[#F4A62A]',
    animClass: 'animate-barnaby-float'
  },
  excited: {
    label: 'Hyped!',
    emoji: '🔥',
    ringClass: 'ring-[#F4A62A]',
    animClass: 'animate-barnaby-hop'
  },
  proud: {
    label: 'Proud of you',
    emoji: '🏆',
    ringClass: 'ring-[#1F8A70]',
    animClass: 'animate-barnaby-hop'
  },
  curious: {
    label: 'Curious',
    emoji: '🔍',
    ringClass: 'ring-[#0F4C45]',
    animClass: 'animate-barnaby-float'
  },
  playful: {
    label: 'Playful',
    emoji: '🎯',
    ringClass: 'ring-[#F4A62A]',
    animClass: 'animate-barnaby-wiggle'
  },
  cheering: {
    label: 'Cheering',
    emoji: '🎉',
    ringClass: 'ring-[#F4A62A]',
    animClass: 'animate-barnaby-hop'
  },
  sleepy: {
    label: 'Napping...',
    emoji: '💤',
    ringClass: 'ring-[#9EBEB8]',
    animClass: 'animate-barnaby-nap'
  },
  thinking: {
    label: 'Thinking...',
    emoji: '💭',
    ringClass: 'ring-[#1F8A70]',
    animClass: 'animate-barnaby-float'
  },
  petted: {
    label: 'Purring!',
    emoji: '❤️',
    ringClass: 'ring-rose-400',
    animClass: 'animate-barnaby-wiggle'
  },
  eating: {
    label: 'Munching!',
    emoji: '🍎',
    ringClass: 'ring-[#F4A62A]',
    animClass: 'animate-barnaby-wiggle'
  }
};

export interface BondStageInfo {
  level: number;
  title: string;
  currentXp: number;
  nextLevelXp: number;
  progressPct: number;
}

const BOND_LEVELS = [
  { level: 1, minXp: 0, title: 'Hatchling Buddy' },
  { level: 2, minXp: 40, title: 'Word Explorer' },
  { level: 3, minXp: 110, title: 'Band 7 Wingmate' },
  { level: 4, minXp: 220, title: 'C2 Sky Scholar' },
  { level: 5, minXp: 380, title: 'Band 9 Dragon Sage' }
];

export function getBondStage(bondXp: number): BondStageInfo {
  const safeXp = Math.max(0, Math.floor(bondXp || 0));
  let idx = 0;
  for (let i = 0; i < BOND_LEVELS.length; i++) {
    if (safeXp >= BOND_LEVELS[i].minXp) idx = i;
  }
  const current = BOND_LEVELS[idx];
  const next = BOND_LEVELS[idx + 1];
  if (!next) {
    return {
      level: current.level,
      title: current.title,
      currentXp: safeXp,
      nextLevelXp: current.minXp,
      progressPct: 100
    };
  }
  const span = next.minXp - current.minXp;
  const gained = safeXp - current.minXp;
  return {
    level: current.level,
    title: current.title,
    currentXp: safeXp,
    nextLevelXp: next.minXp,
    progressPct: Math.min(100, Math.max(5, Math.round((gained / span) * 100)))
  };
}

export const WORD_TREATS = [
  {
    word: 'A double-edged sword',
    badge: 'WORD TREAT · C2 IDIOM',
    meaning: 'Something that brings strong benefits along with unintended drawbacks.',
    example: '“Rapid AI adoption is a double-edged sword: it accelerates productivity while reshaping entry-level jobs.”',
    bengali: 'দুধারী তলোয়ার — যার ভালো ও খারাপ দুই দিকই আছে। Speaking Part 3 বা Writing Task 2-তে দারুণ কাজে লাগে!'
  },
  {
    word: 'Mitigate the adverse effects',
    badge: 'WORD TREAT · BAND 8.5 COLLOCATION',
    meaning: 'To reduce the severity of harmful consequences.',
    example: '“Urban tree canopies help mitigate the adverse effects of rising summer heat.”',
    bengali: 'ক্ষতিকর প্রভাব কমানো — “reduce bad effects”-এর বদলে এটা লিখলে Lexical Resource ঝকঝকে হয়।'
  },
  {
    word: 'By the same token',
    badge: 'WORD TREAT · BAND 9 LINKER',
    meaning: 'In the same way, or for the exact same logical reason.',
    example: '“Remote work lowers commuting stress; by the same token, it can blur work–life boundaries.”',
    bengali: 'একই কারণে / একইভাবে — “Also” বা “Similarly” বারবার না লিখে এটা ব্যবহার করো!'
  },
  {
    word: 'To walk a tightrope',
    badge: 'WORD TREAT · C2 EXPRESSION',
    meaning: 'To balance two risky or opposing demands carefully.',
    example: '“Governments must walk a tightrope between economic expansion and climate targets.”',
    bengali: 'দড়ির ওপর হাঁটার মতো সূক্ষ্ম ভারসাম্য বজায় রাখা।'
  },
  {
    word: 'A catalyst for change',
    badge: 'WORD TREAT · ACADEMIC PHRASE',
    meaning: 'An event or factor that triggers rapid transformation.',
    example: '“Affordable solar storage has acted as a catalyst for change in rural energy grids.”',
    bengali: 'পরিবর্তনের অনুঘটক — কোনো বড় পরিবর্তনের মূল চালিকাশক্তি।'
  },
  {
    word: 'Ubiquitous',
    badge: 'WORD TREAT · C1/C2 ADJECTIVE',
    meaning: 'Present, appearing, or found everywhere.',
    example: '“Contactless payment terminals have become virtually ubiquitous across major cities.”',
    bengali: 'সর্বব্যাপী / সব জায়গায় পাওয়া যায় — “everywhere”-এর Band 8.5 বিকল্প!'
  },
  {
    word: 'Strike a delicate balance',
    badge: 'WORD TREAT · BAND 8+ PHRASE',
    meaning: 'To find a fair middle ground between two competing priorities.',
    example: '“Schools must strike a delicate balance between digital fluency and distraction-free study.”',
    bengali: 'দুটি বিপরীত বিষয়ের মধ্যে চমৎকার ভারসাম্য তৈরি করা।'
  },
  {
    word: 'Exacerbate an existing issue',
    badge: 'WORD TREAT · ACADEMIC VERB',
    meaning: 'To make a problem or bad situation significantly worse.',
    example: '“Unregulated urban sprawl can exacerbate existing traffic congestion.”',
    bengali: 'আগের সমস্যাকে আরও তীব্র বা খারাপ করে তোলা (“make worse”-এর Band 8.5 রূপ)।'
  }
];

export const MINI_QUIZZES: Omit<BarnabyQuizPayload, 'selectedIndex'>[] = [
  {
    question:
      'Reading TFNG Trap: The passage says "Solar power costs fell sharply after 2015." Statement: "Wind power became cheaper than solar in 2015." What is the answer?',
    options: ['TRUE', 'FALSE', 'NOT GIVEN'],
    correctIndex: 2,
    explanationEn: 'The passage never compares solar with wind power — so it is NOT GIVEN, not FALSE.',
    explanationBn: 'প্যাসেজে wind power-এর সাথে কোনো তুলনাই নেই! তাই তথ্য অনুপস্থিত = NOT GIVEN।'
  },
  {
    question:
      'Listening Distractor: "We booked the hall for £140 — oh wait, with the student discount it dropped to £115, plus £10 for the projector." What is the total cost?',
    options: ['£140', '£125', '£115'],
    correctIndex: 1,
    explanationEn: 'Self-correction replaces £140 with £115, then adds £10 for the projector (£125 total).',
    explanationBn: 'প্রথম সংখ্যা £140 বাদ দিয়ে £115 + £10 প্রজেক্টর = £125। Listening-এ “oh wait” সবসময় ট্র্যাপ সিগন্যাল!'
  },
  {
    question: 'Writing Task 1 Academic: Which sentence is mandatory for Band 7.0+ in Task Achievement?',
    options: [
      'A personal opinion about why the chart changed',
      'A clear Overview summarizing the main trends without listing every number',
      'A dramatic conclusion predicting the year 2050'
    ],
    correctIndex: 1,
    explanationEn: 'Without a clear Overview paragraph, Academic Task 1 Task Achievement is capped around Band 5–6.',
    explanationBn: 'Task 1-এ স্পষ্ট Overview না থাকলে ব্যান্ড ৬-এর ওপরে ওঠা খুব কঠিন! আর নিজের মতামত বা অনুমান একদমই দেওয়া যাবে না।'
  },
  {
    question: 'Speaking Part 3 Upgrade: Which phrase sounds most natural for Band 8+ hedging?',
    options: [
      'It is 100% undeniable that every single person agrees...',
      'To a large extent, it tends to depend on local infrastructure...',
      'I will now enumerate three reasons in chronological order...'
    ],
    correctIndex: 1,
    explanationEn: 'Natural hedging ("To a large extent", "tends to depend on") sounds fluent and academic rather than memorized.',
    explanationBn: 'অতিরিক্ত চরম দাবি না করে “To a large extent” বা “tends to” ব্যবহার করলে এক্সামিনাররা Band 8+ ফ্লুয়েন্সি দেয়।'
  },
  {
    question: 'Grammar Accuracy: Spot the Band 8+ correct sentence:',
    options: [
      'Despite of the heavy rainfall, the marathon continued.',
      'Although the rainfall was heavy, yet the marathon continued.',
      'Despite the heavy rainfall, the marathon went ahead as scheduled.'
    ],
    correctIndex: 2,
    explanationEn: '"Despite" never takes "of", and "Although" never pairs with "but/yet" in the same sentence.',
    explanationBn: 'মনে রেখো: “Despite”-এর পরে কখনো “of” বসে না, আর “Although”-এর সাথে “but/yet” বসে না!'
  },
  {
    question: 'Writing Task 2 Lexical Precision: Choose the strongest replacement for "a lot of people think":',
    options: [
      'It is widely contended that...',
      'Many humankinds are thinking that...',
      'A gigantic amount of persons believe...'
    ],
    correctIndex: 0,
    explanationEn: '"It is widely contended that..." is crisp, natural C1 academic register without awkward word choices.',
    explanationBn: '“a lot of people think”-এর বদলে “It is widely contended that...” লিখলে প্রথম লাইনেই এক্সামিনারের নজর কাড়ে।'
  }
];

const PET_REPLIES = [
  '*happy wing-flaps!* Hehe, behind the ears is my favourite spot! Now let’s crush one IELTS trap together!',
  '*purrs like a tiny campfire!* Thanks for the head-pats! My dragon energy is at 100% — ready to sprint?',
  '*wiggles tail joyfully!* Aww, you’re the best study partner! Want a crunchy C2 word treat next?',
  '*tiny blue sparkles pop!* Feeling super proud of our streak — every small session adds up!'
];

function getStorageKey(): string {
  const uid = auth?.currentUser?.uid;
  if (uid) return `${STORAGE_PREFIX}${uid}`;
  try {
    const rawUser = localStorage.getItem('bandsprint_user_v1');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.id) return `${STORAGE_PREFIX}${String(parsed.id).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    }
    const activeProfile = getActiveUser();
    if (activeProfile?.id) {
      return `${STORAGE_PREFIX}${String(activeProfile.id).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    }
  } catch {}
  return `${STORAGE_PREFIX}guest`;
}

function resolveCurrentActivityLabel(currentPage: string): string {
  const path = (currentPage || '/').toLowerCase();
  if (path.includes('/practice/reading')) return 'Reading Practice';
  if (path.includes('/practice/writing')) return 'Writing Studio';
  if (path.includes('/practice/speaking')) return 'Speaking Studio';
  if (path.includes('/practice/listening')) return 'Listening Lab';
  if (path.includes('/practice/mock-tests')) return 'Full Mock Exam';
  if (path.includes('/practice/question-bank')) return 'Question Bank Drills';
  if (path.includes('/progress/mistakes') || path.includes('/progress/saved') || path.includes('/learn/vault')) {
    return 'Mistake Vault Review';
  }
  if (path.includes('/learn/vocabulary') || path.includes('/learn/vocab')) return 'Vocabulary Lab';
  if (path.includes('/learn/grammar')) return 'Grammar Lab';
  if (path.includes('/learn/diagnostic')) return 'Diagnostic Assessment';
  if (path.includes('/progress')) return 'Progress & Analytics';
  return 'BandSprint Study Desk';
}

function isIeltsSkillKey(value: unknown): value is IeltsSkillKey {
  return value === 'listening' || value === 'reading' || value === 'writing' || value === 'speaking';
}

function detectRecurringMistakePattern(
  unresolvedMistakes: ReturnType<typeof getMistakes>
): RecurringMistakePattern | null {
  if (unresolvedMistakes.length === 0) return null;

  const freqMap = new Map<string, { count: number; module: string }>();
  for (const m of unresolvedMistakes) {
    const rawCat = (m.questionType || m.title || '').trim();
    if (!rawCat) continue;
    const prev = freqMap.get(rawCat);
    if (prev) {
      prev.count += 1;
    } else {
      freqMap.set(rawCat, { count: 1, module: m.module });
    }
  }

  let best: RecurringMistakePattern | null = null;
  for (const [category, info] of freqMap.entries()) {
    if (!best || info.count > best.count) {
      best = { category, count: info.count, module: info.module };
    }
  }
  return best;
}

export function getStudentContextSnapshot(currentPage = '/'): StudentContextSnapshot {
  const setup = loadExamSetup();
  const survey = loadOnboardingSurvey();
  const activeProfile = getActiveUser();

  // Strictly resolve current student identity so records never bleed across accounts
  const authUid = auth?.currentUser?.uid || null;
  let legacyUser: { id?: string; name?: string } | null = null;
  try {
    const rawUser = localStorage.getItem('bandsprint_user_v1');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed && typeof parsed === 'object') {
        legacyUser = parsed;
      }
    }
  } catch {}

  const userId =
    authUid ||
    activeProfile?.id ||
    (legacyUser?.id ? String(legacyUser.id) : null);

  // Only read activeProfile's history when it belongs to the currently active identity
  const ownsActiveProfile = Boolean(
    activeProfile && (!authUid || activeProfile.id === authUid)
  );
  const studentProfile = ownsActiveProfile ? activeProfile : null;

  let userName = 'Friend';
  try {
    if (auth?.currentUser?.displayName) {
      userName = auth.currentUser.displayName.split(' ')[0];
    } else if (studentProfile?.name) {
      userName = String(studentProfile.name).split(' ')[0];
    } else if (!authUid && legacyUser?.name) {
      userName = String(legacyUser.name).split(' ')[0];
    }
  } catch {}

  // Aggregate ONLY the active student's real exam history via Phase 3B.5 integrity rules
  const rawHistory = Array.isArray(studentProfile?.progress?.examHistory)
    ? studentProfile.progress.examHistory
    : [];
  const agg = aggregateExamHistory(rawHistory);

  const skillBands: Record<IeltsSkillKey, number | null> = {
    listening: agg.skills.listening.latest,
    reading: agg.skills.reading.latest,
    writing: agg.skills.writing.latest,
    speaking: agg.skills.speaking.latest
  };

  // Completed diagnostic estimate is preserved separately from verified exam scores
  const rawDiag = loadDiagnosticResult();
  const diagnosticEstimate: DiagnosticEstimateContext | null = rawDiag
    ? {
        overall: validateOptionalHalfBand(rawDiag.scores?.overall, 1.0),
        weakest: isIeltsSkillKey(rawDiag.weakest) ? rawDiag.weakest : null,
        completedAt: typeof rawDiag.createdAt === 'number' && Number.isFinite(rawDiag.createdAt)
          ? rawDiag.createdAt
          : 0
      }
    : null;

  // Derive weakest skill transparently without guessing when data is absent
  let weakestSkill: IeltsSkillKey | null = null;
  let weakestSkillSource: StudentContextSnapshot['weakestSkillSource'] = 'none';

  const scoredSkills = (Object.entries(skillBands) as Array<[IeltsSkillKey, number | null]>).filter(
    (entry): entry is [IeltsSkillKey, number] => entry[1] !== null
  );
  if (scoredSkills.length >= 2) {
    scoredSkills.sort((a, b) => a[1] - b[1]);
    weakestSkill = scoredSkills[0][0];
    weakestSkillSource = 'verified_history';
  } else if (diagnosticEstimate?.weakest) {
    weakestSkill = diagnosticEstimate.weakest;
    weakestSkillSource = 'diagnostic_estimate';
  } else if (isIeltsSkillKey(survey?.weakestSkill)) {
    weakestSkill = survey.weakestSkill;
    weakestSkillSource = 'self_reported';
  }

  // Unresolved Mistake Vault items and genuine recurring category detection
  const mistakes = getMistakes().filter((m) => !m.mastered && m.status !== 'mastered');
  const recurringMistakePattern = detectRecurringMistakePattern(mistakes);

  const targetBandCandidate =
    studentProfile?.progress?.targetBand ||
    setup.targetBand ||
    survey?.targetBand ||
    7.0;
  const targetBand =
    typeof targetBandCandidate === 'number' && Number.isFinite(targetBandCandidate)
      ? Math.min(9.0, Math.max(4.0, Math.round(targetBandCandidate * 2) / 2))
      : 7.0;

  const examMode: 'Academic' | 'General Training' =
    studentProfile?.progress?.intendedFormat === 'General Training' ||
    setup.examMode === 'General Training' ||
    survey?.examTrack === 'General Training'
      ? 'General Training'
      : 'Academic';

  let daysUntilExam: number | null = null;
  const dateStr = studentProfile?.progress?.examDate || setup.examDate || survey?.examDate || null;
  if (dateStr) {
    const diffMs = new Date(`${dateStr}T00:00:00`).getTime() - Date.now();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (Number.isFinite(days) && days >= 0 && days <= 730) {
      daysUntilExam = days;
    }
  }

  return {
    userId,
    userName,
    targetBand,
    examMode,
    daysUntilExam,
    latestVerifiedOverallBand: agg.overall.latest,
    completedFullMockCount: agg.completedFullMockCount,
    evaluatedAttemptCount: agg.evaluatedAnySkillCount,
    practiceAttemptCount: Math.max(0, agg.totalAttempts - agg.completedFullMockCount),
    skillBands,
    diagnosticEstimate,
    weakestSkill,
    weakestSkillSource,
    mistakeCount: mistakes.length,
    topMistake: mistakes[0]?.title || mistakes[0]?.prompt || '',
    recurringMistakePattern,
    currentActivity: resolveCurrentActivityLabel(currentPage),
    currentPage
  };
}

/**
 * Generates an honest, evidence-backed coaching recommendation based strictly on the student's
 * verified history, practice diagnostics, and genuine unresolved Mistake Vault entries.
 * Never fabricates band scores or claims weaknesses absent from underlying data.
 */
export function generateContextAwareCoachTip(ctx: StudentContextSnapshot): {
  mood: BarnabyMood;
  text: string;
  suggestedAction: BarnabyGuideAction;
} {
  // 1. Recurring mistake pattern backed by real Mistake Vault entries
  if (ctx.recurringMistakePattern && ctx.mistakeCount > 0) {
    const { category, count, module } = ctx.recurringMistakePattern;
    const isTfng = /true\s*\/\s*false|tfng|not\s*given/i.test(category);
    const targetedGuidance = isTfng
      ? 'Pause before answering: FALSE means the passage contradicts the claim, while NOT GIVEN means the passage never states it.'
      : 'Review why the distractor looked tempting before trying a fresh timed set.';

    return {
      mood: 'curious',
      text: `You have ${count} unresolved ${category} item${count > 1 ? 's' : ''} (${module}) in your Mistake Vault. ${targetedGuidance}`,
      suggestedAction: { label: `Review ${ctx.mistakeCount} Vault Trap${ctx.mistakeCount > 1 ? 's' : ''}`, route: '/progress/mistakes' }
    };
  }

  // 2. Verified exam history with measurable weakest skill
  if (ctx.weakestSkill && ctx.weakestSkillSource === 'verified_history') {
    const weakBand = ctx.skillBands[ctx.weakestSkill];
    const overallNote =
      ctx.latestVerifiedOverallBand !== null
        ? `Your latest verified Full Mock is Band ${ctx.latestVerifiedOverallBand.toFixed(1)} toward your Band ${ctx.targetBand.toFixed(1)} goal.`
        : `You have ${ctx.evaluatedAttemptCount} evaluated practice result${ctx.evaluatedAttemptCount > 1 ? 's' : ''} toward your Band ${ctx.targetBand.toFixed(1)} goal.`;
    const weakNote =
      weakBand !== null
        ? `${ctx.weakestSkill.charAt(0).toUpperCase() + ctx.weakestSkill.slice(1)} is currently your lowest verified skill (Band ${weakBand.toFixed(1)}) — one focused drill there will pay off fastest.`
        : `Let's sharpen ${ctx.weakestSkill} next.`;

    return {
      mood: 'happy',
      text: `${overallNote} ${weakNote}`,
      suggestedAction: {
        label: `Train ${ctx.weakestSkill.charAt(0).toUpperCase() + ctx.weakestSkill.slice(1)}`,
        route: `/practice/${ctx.weakestSkill}`
      }
    };
  }

  // 3. Practice diagnostic estimate (explicitly distinguished from verified Full Mock scores)
  if (ctx.diagnosticEstimate && ctx.diagnosticEstimate.weakest) {
    const diagOverallText =
      ctx.diagnosticEstimate.overall !== null
        ? `Your practice diagnostic estimate sits around Band ${ctx.diagnosticEstimate.overall.toFixed(1)} (practice check, not a verified Full Mock).`
        : 'You completed a practice diagnostic check.';
    const skillLabel =
      ctx.diagnosticEstimate.weakest.charAt(0).toUpperCase() + ctx.diagnosticEstimate.weakest.slice(1);
    return {
      mood: 'curious',
      text: `${diagOverallText} ${skillLabel} showed the biggest gap — let's build steady daily momentum there.`,
      suggestedAction: {
        label: `Practise ${skillLabel}`,
        route: `/practice/${ctx.diagnosticEstimate.weakest}`
      }
    };
  }

  // 4. Honest starting point when no verified scores exist yet
  if (ctx.weakestSkill && ctx.weakestSkillSource === 'self_reported') {
    const skillLabel = ctx.weakestSkill.charAt(0).toUpperCase() + ctx.weakestSkill.slice(1);
    return {
      mood: 'happy',
      text: `You haven't logged a verified Full Mock score yet, and you marked ${skillLabel} as your priority for Band ${ctx.targetBand.toFixed(1)}. Let's run a focused drill to set an honest baseline.`,
      suggestedAction: {
        label: `Start ${skillLabel} Drill`,
        route: `/practice/${ctx.weakestSkill}`
      }
    };
  }

  return {
    mood: 'happy',
    text: `No verified IELTS score is recorded yet — and that's a great clean slate! ${BARNABY_CORE_PHILOSOPHY}`,
    suggestedAction: { label: 'Take a Quick Diagnostic', route: '/learn/diagnostic' }
  };
}

function buildPersonalizedWelcome(ctx: StudentContextSnapshot): BarnabyMessage {
  const coachTip = generateContextAwareCoachTip(ctx);
  const parts: string[] = [
    `Hi ${ctx.userName}! I'm Barnaby — your dragon study companion and IELTS mentor.`,
    BARNABY_CORE_PHILOSOPHY
  ];
  if (ctx.daysUntilExam !== null) {
    parts.push(`${ctx.daysUntilExam} days left for your Band ${ctx.targetBand.toFixed(1)} (${ctx.examMode}) target.`);
  } else {
    parts.push(`We're working steadily toward Band ${ctx.targetBand.toFixed(1)} (${ctx.examMode}).`);
  }
  parts.push(coachTip.text);

  return {
    id: 'barnaby_welcome',
    sender: 'barnaby',
    badge: 'PERSONAL MENTOR',
    mood: coachTip.mood,
    text: parts.join(' '),
    suggestedAction: coachTip.suggestedAction,
    createdAt: Date.now()
  };
}

export function loadBarnabyState(currentPage = '/'): BarnabyCompanionState {
  const ctx = getStudentContextSnapshot(currentPage);
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BarnabyCompanionState>;
      if (parsed && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        return {
          messages: parsed.messages.slice(-30),
          bondXp: Number(parsed.bondXp) || 0,
          petsCount: Number(parsed.petsCount) || 0,
          treatsFed: Number(parsed.treatsFed) || 0,
          quizzesSolved: Number(parsed.quizzesSolved) || 0,
          mood: (parsed.mood as BarnabyMood) || 'happy',
          activityText: parsed.activityText || 'Docked beside your BandSprint desk',
          freeRoam: parsed.freeRoam === true,
          lastInteractionAt: Number(parsed.lastInteractionAt) || Date.now()
        };
      }
    }
  } catch {}

  return {
    messages: [buildPersonalizedWelcome(ctx)],
    bondXp: 10,
    petsCount: 0,
    treatsFed: 0,
    quizzesSolved: 0,
    mood: 'happy',
    activityText: 'Ready at your BandSprint desk',
    freeRoam: false,
    lastInteractionAt: Date.now()
  };
}

export function saveBarnabyState(state: BarnabyCompanionState): BarnabyCompanionState {
  const trimmed: BarnabyCompanionState = {
    ...state,
    messages: state.messages.slice(-30)
  };
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(trimmed));
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BARNABY_STATE_EVENT, { detail: trimmed }));
  }
  return trimmed;
}

export function updateBarnabyMoodAndActivity(
  mood: BarnabyMood,
  activityText: string
): BarnabyCompanionState {
  const state = loadBarnabyState();
  return saveBarnabyState({
    ...state,
    mood,
    activityText
  });
}

export function toggleBarnabyFreeRoam(): BarnabyCompanionState {
  const state = loadBarnabyState();
  const nextRoam = !state.freeRoam;
  return saveBarnabyState({
    ...state,
    freeRoam: nextRoam,
    mood: nextRoam ? 'playful' : 'happy',
    activityText: nextRoam ? 'Stretching wings to roam freely!' : 'Perched right where you put me'
  });
}

export function petBarnaby(): { state: BarnabyCompanionState; quip: string } {
  const state = loadBarnabyState();
  const quip = PET_REPLIES[state.petsCount % PET_REPLIES.length];
  const next = saveBarnabyState({
    ...state,
    bondXp: state.bondXp + 5,
    petsCount: state.petsCount + 1,
    mood: 'petted',
    activityText: 'Purring happily from head-pats!',
    lastInteractionAt: Date.now()
  });
  return { state: next, quip };
}

export function feedBarnabyWordTreat(): {
  state: BarnabyCompanionState;
  treat: (typeof WORD_TREATS)[number];
  message: BarnabyMessage;
} {
  const state = loadBarnabyState();
  const treat = WORD_TREATS[state.treatsFed % WORD_TREATS.length];
  const msg: BarnabyMessage = {
    id: `treat_${Date.now()}`,
    sender: 'barnaby',
    badge: treat.badge,
    mood: 'eating',
    text: `*crunch crunch!* Yummy Band 8.5 treat: “${treat.word}” — ${treat.meaning} Example: ${treat.example}`,
    bengaliTip: treat.bengali,
    rating: null,
    createdAt: Date.now()
  };

  const next = saveBarnabyState({
    ...state,
    bondXp: state.bondXp + 10,
    treatsFed: state.treatsFed + 1,
    mood: 'eating',
    activityText: `Munching on “${treat.word}”!`,
    messages: [...state.messages, msg],
    lastInteractionAt: Date.now()
  });
  return { state: next, treat, message: msg };
}

export function startBarnabyMiniQuiz(): { state: BarnabyCompanionState; message: BarnabyMessage } {
  const state = loadBarnabyState();
  const quiz = MINI_QUIZZES[(state.quizzesSolved + state.messages.length) % MINI_QUIZZES.length];
  const msg: BarnabyMessage = {
    id: `quiz_${Date.now()}`,
    sender: 'barnaby',
    badge: '15-SEC DRAGON QUIZ',
    mood: 'playful',
    text: quiz.question,
    quiz: { ...quiz },
    rating: null,
    createdAt: Date.now()
  };

  const next = saveBarnabyState({
    ...state,
    mood: 'playful',
    activityText: 'Challenging you to a 15-sec IELTS trap!',
    messages: [...state.messages, msg],
    lastInteractionAt: Date.now()
  });
  return { state: next, message: msg };
}

export function answerBarnabyMiniQuiz(
  messageId: string,
  selectedIndex: number
): { state: BarnabyCompanionState; isCorrect: boolean } {
  const state = loadBarnabyState();
  let isCorrect = false;
  const updatedMessages = state.messages.map((m) => {
    if (m.id !== messageId || !m.quiz || m.quiz.selectedIndex !== undefined) return m;
    isCorrect = selectedIndex === m.quiz.correctIndex;
    return {
      ...m,
      quiz: {
        ...m.quiz,
        selectedIndex
      }
    };
  });

  const next = saveBarnabyState({
    ...state,
    bondXp: state.bondXp + (isCorrect ? 15 : 6),
    quizzesSolved: state.quizzesSolved + 1,
    mood: isCorrect ? 'cheering' : 'curious',
    activityText: isCorrect ? 'Doing a victory flip for you!' : 'No worries — traps make us sharper!',
    messages: updatedMessages,
    lastInteractionAt: Date.now()
  });
  return { state: next, isCorrect };
}

export function rateBarnabyMessage(
  messageId: string,
  rating: 'up' | 'down'
): BarnabyCompanionState {
  const state = loadBarnabyState();
  const alreadyRated = state.messages.find((m) => m.id === messageId)?.rating;
  const updatedMessages = state.messages.map((m) =>
    m.id === messageId ? { ...m, rating } : m
  );

  return saveBarnabyState({
    ...state,
    bondXp: alreadyRated ? state.bondXp : state.bondXp + 3,
    mood: rating === 'up' ? 'proud' : 'curious',
    activityText:
      rating === 'up'
        ? 'Beaming with pride — glad that helped!'
        : 'Noted! I’ll explain even more clearly next time.',
    messages: updatedMessages,
    lastInteractionAt: Date.now()
  });
}

export function clearBarnabyChat(currentPage = '/'): BarnabyCompanionState {
  const state = loadBarnabyState(currentPage);
  const ctx = getStudentContextSnapshot(currentPage);
  return saveBarnabyState({
    ...state,
    mood: 'happy',
    activityText: 'Fresh page, fresh Band 8+ focus!',
    messages: [buildPersonalizedWelcome(ctx)],
    lastInteractionAt: Date.now()
  });
}

function normalizeGuideRoute(rawRoute?: string): string | undefined {
  if (!rawRoute) return undefined;
  const r = rawRoute.trim().toLowerCase();
  if (r.startsWith('/')) return r;
  const map: Record<string, string> = {
    listening: '/practice/listening',
    reading: '/practice/reading',
    writing: '/practice/writing',
    speaking: '/practice/speaking',
    vocab: '/learn/vocabulary',
    grammar: '/learn/grammar',
    livemock: '/practice/mock-tests',
    vault: '/progress/mistakes',
    diagnostic: '/learn/diagnostic',
    'question-bank': '/practice/question-bank'
  };
  return map[r] || '/practice';
}

function smartOfflineReply(query: string, ctx: StudentContextSnapshot): Partial<BarnabyMessage> {
  const q = query.toLowerCase();
  if (q.includes('idiom') || q.includes('vocab') || q.includes('word')) {
    return {
      mood: 'excited',
      text: `Ooh, my favourite snack! Try “a double-edged sword” in Speaking Part 3: “Remote learning is a double-edged sword — it adds flexibility while reducing face-to-face mentorship.”`,
      bengaliTip: '“দুধারী তলোয়ার” — যেকোনো টেকনোলজি বা সোশ্যাল মিডিয়া টপিকে সহজেই বসাতে পারবে!',
      suggestedAction: { label: 'Open Vocabulary Lab', route: '/learn/vocabulary' }
    };
  }
  if (q.includes('writing') || q.includes('task 2') || q.includes('essay')) {
    return {
      mood: 'curious',
      text: `For your Band ${ctx.targetBand.toFixed(1)} Writing Task 2: 1) Paraphrase + clear stance in Intro, 2) Two focused body paragraphs (Idea → Reason → Specific Example), 3) Short summary conclusion (260–290 words).`,
      bengaliTip: 'প্রতিটি বডি প্যারাগ্রাফে একটিই মূল আইডিয়া রাখো, আর শেষ ৩ মিনিট বানান ও আর্টিকেল চেক করো।',
      suggestedAction: { label: 'Open Writing Studio', route: '/practice/writing' }
    };
  }
  if (q.includes('true') || q.includes('false') || q.includes('not given') || q.includes('reading')) {
    return {
      mood: 'playful',
      text: `Reading TFNG secret: FALSE means the passage actively contradicts the statement. NOT GIVEN means the passage simply never mentions it — even if it sounds logical in real life!`,
      bengaliTip: 'বাইরের সাধারণ জ্ঞান একদম ব্যবহার করবে না — প্যাসেজে না থাকলে সরাসরি NOT GIVEN!',
      suggestedAction: { label: 'Try Blind-Verified Reading', route: '/practice/question-bank' }
    };
  }
  if (q.includes('mistake') || q.includes('vault') || q.includes('weak') || q.includes('next') || q.includes('focus')) {
    const coach = generateContextAwareCoachTip(ctx);
    return {
      mood: coach.mood,
      text: coach.text,
      bengaliTip: 'পুরোনো ভুলগুলো ঠিক করলেই ব্যান্ড স্কোর সবচেয়ে দ্রুত ০.৫–১.০ বাড়ে!',
      suggestedAction: coach.suggestedAction
    };
  }
  return {
    mood: 'happy',
    text: `I’ve got your back, ${ctx.userName}! ${BARNABY_CORE_PHILOSOPHY} Ask me for a Writing Task 2 plan, a Reading TFNG strategy, a Speaking Part 3 upgrade, or tap “Word Treat” / “15s Quiz” above!`,
    bengaliTip: 'যেকোনো IELTS প্রশ্ন বাংলা বা ইংরেজিতে নির্দ্বিধায় জিজ্ঞেস করো!',
    suggestedAction: { label: 'Explore Question Bank', route: '/practice/question-bank' }
  };
}

export async function sendBarnabyChatMessage(
  rawText: string,
  currentPage = '/'
): Promise<{ state: BarnabyCompanionState; replyMessage: BarnabyMessage }> {
  const query = rawText.trim();
  const state = loadBarnabyState(currentPage);
  const ctx = getStudentContextSnapshot(currentPage);
  const bond = getBondStage(state.bondXp);

  const userMsg: BarnabyMessage = {
    id: `u_${Date.now()}`,
    sender: 'user',
    text: query,
    createdAt: Date.now()
  };

  const withUser = saveBarnabyState({
    ...state,
    mood: 'thinking',
    activityText: 'Thinking up a Band 8.5+ tip...',
    messages: [...state.messages, userMsg],
    lastInteractionAt: Date.now()
  });

  const history = withUser.messages.slice(-10).map((m) => ({
    role: m.sender === 'user' ? 'user' : 'model',
    text: m.text
  }));

  try {
    const token = getStoredSessionToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch('/api/tutor/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: query,
        history,
        persona: 'lexical_barnaby',
        context: {
          module: currentPage.includes('reading')
            ? 'reading'
            : currentPage.includes('writing')
            ? 'writing'
            : currentPage.includes('listening')
            ? 'listening'
            : currentPage.includes('speaking')
            ? 'speaking'
            : 'general',
          examMode: ctx.examMode,
          mistakeCount: ctx.mistakeCount,
          userName: ctx.userName,
          targetBand: ctx.targetBand,
          daysUntilExam: ctx.daysUntilExam,
          latestVerifiedOverallBand: ctx.latestVerifiedOverallBand,
          completedFullMockCount: ctx.completedFullMockCount,
          diagnosticEstimateBand: ctx.diagnosticEstimate?.overall ?? null,
          weakestSkill: ctx.weakestSkill || '',
          weakestSkillSource: ctx.weakestSkillSource,
          topMistake: ctx.topMistake,
          recurringMistakeCategory: ctx.recurringMistakePattern?.category || '',
          recurringMistakeCount: ctx.recurringMistakePattern?.count || 0,
          currentActivity: ctx.currentActivity,
          currentPage,
          bondStage: bond.title
        }
      })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const mood: BarnabyMood = [
      'happy',
      'excited',
      'proud',
      'curious',
      'playful',
      'cheering',
      'thinking'
    ].includes(data?.mood)
      ? data.mood
      : 'happy';

    const guideRoute = normalizeGuideRoute(data?.suggestedNextAction?.route);
    const replyMsg: BarnabyMessage = {
      id: `b_${Date.now()}`,
      sender: 'barnaby',
      badge: data?.isAiPowered ? 'BARNABY AI TUTOR' : 'BARNABY GUIDE',
      mood,
      text: String(data?.reply || 'Let’s tackle your next IELTS step together!'),
      strategyTip: typeof data?.strategyTip === 'string' && data.strategyTip.trim() ? data.strategyTip.trim() : undefined,
      bengaliTip: typeof data?.bengaliTip === 'string' && data.bengaliTip.trim() ? data.bengaliTip.trim() : undefined,
      collocations: Array.isArray(data?.academicCollocations)
        ? data.academicCollocations.filter((c: any) => typeof c === 'string' && c.trim()).slice(0, 3)
        : undefined,
      suggestedAction:
        guideRoute && data?.suggestedNextAction?.label
          ? { label: String(data.suggestedNextAction.label), route: guideRoute }
          : undefined,
      rating: null,
      createdAt: Date.now()
    };

    const next = saveBarnabyState({
      ...withUser,
      bondXp: withUser.bondXp + 8,
      mood,
      activityText: 'Happy to coach you anytime!',
      messages: [...withUser.messages, replyMsg],
      lastInteractionAt: Date.now()
    });
    return { state: next, replyMessage: replyMsg };
  } catch {
    const offline = smartOfflineReply(query, ctx);
    const replyMsg: BarnabyMessage = {
      id: `b_${Date.now()}`,
      sender: 'barnaby',
      badge: 'BARNABY GUIDE',
      mood: offline.mood || 'happy',
      text: offline.text || 'Every mistake makes you stronger — ask me about Reading, Writing, Listening, or Speaking!',
      bengaliTip: offline.bengaliTip,
      suggestedAction: offline.suggestedAction,
      rating: null,
      createdAt: Date.now()
    };

    const next = saveBarnabyState({
      ...withUser,
      bondXp: withUser.bondXp + 5,
      mood: offline.mood || 'happy',
      activityText: 'Sharing built-in IELTS strategy',
      messages: [...withUser.messages, replyMsg],
      lastInteractionAt: Date.now()
    });
    return { state: next, replyMessage: replyMsg };
  }
}

export function getContextualWhisper(currentPage: string, ctx: StudentContextSnapshot): {
  mood: BarnabyMood;
  text: string;
  action?: BarnabyGuideAction;
} {
  if (currentPage.includes('/question-bank')) {
    return {
      mood: 'excited',
      text: 'Ooh! Try a 2-Pass Blind-Verified drill or open your Private PDF Exam Room!'
    };
  }
  if (currentPage.includes('/learn/vocabulary') || currentPage.includes('/learn/vocab')) {
    return {
      mood: 'eating',
      text: 'Mmm, juicy C2 words! Tap me and feed me a Word Treat!'
    };
  }
  if (
    currentPage.includes('/progress/mistakes') ||
    currentPage.includes('/progress/saved') ||
    currentPage.includes('/learn/vault')
  ) {
    return {
      mood: 'cheering',
      text:
        ctx.mistakeCount > 0
          ? `Let’s squash those ${ctx.mistakeCount} traps together — you’ve got this!`
          : 'Zero traps left in your Vault! *proud dragon flaps*'
    };
  }
  if (ctx.recurringMistakePattern && ctx.mistakeCount > 0) {
    return {
      mood: 'curious',
      text: `Hey ${ctx.userName}! You have ${ctx.recurringMistakePattern.count} unresolved ${ctx.recurringMistakePattern.category} item${ctx.recurringMistakePattern.count > 1 ? 's' : ''} in your Mistake Vault. Ready to clear them?`,
      action: { label: 'Open Vault', route: '/progress/mistakes' }
    };
  }
  if (ctx.mistakeCount > 0) {
    return {
      mood: 'curious',
      text: `Hey ${ctx.userName}! ${ctx.mistakeCount} trap${ctx.mistakeCount > 1 ? 's are' : ' is'} waiting in your Mistake Vault. Quick 15-sec quiz?`,
      action: { label: 'Open Vault', route: '/progress/mistakes' }
    };
  }
  if (ctx.daysUntilExam !== null) {
    return {
      mood: 'happy',
      text: `${ctx.daysUntilExam} days to Band ${ctx.targetBand.toFixed(1)}! Drag me anywhere or tap for a 15-sec quiz!`
    };
  }
  return {
    mood: 'playful',
    text: `Psst ${ctx.userName}! ${BARNABY_CORE_PHILOSOPHY}`
  };
}
