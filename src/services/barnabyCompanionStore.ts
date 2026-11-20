import { loadExamSetup } from './examSetupService';
import { loadOnboardingSurvey } from './onboardingSurveyStore';
import { getMistakes } from '../utils/vaultStorage';
import { auth } from '../lib/firebase';

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

export interface StudentContextSnapshot {
  userName: string;
  targetBand: number;
  examMode: 'Academic' | 'General Training';
  daysUntilExam: number | null;
  weakestSkill: string;
  mistakeCount: number;
  topMistake: string;
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
  } catch {}
  return `${STORAGE_PREFIX}guest`;
}

export function getStudentContextSnapshot(currentPage = '/'): StudentContextSnapshot {
  const setup = loadExamSetup();
  const survey = loadOnboardingSurvey();
  const mistakes = getMistakes().filter((m) => !m.mastered && m.status !== 'mastered');

  let userName = 'Friend';
  try {
    if (auth?.currentUser?.displayName) {
      userName = auth.currentUser.displayName.split(' ')[0];
    } else {
      const rawUser = localStorage.getItem('bandsprint_user_v1');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (parsed?.name) userName = String(parsed.name).split(' ')[0];
      }
    }
  } catch {}

  let daysUntilExam: number | null = null;
  const dateStr = setup.examDate || survey?.examDate || null;
  if (dateStr) {
    const diffMs = new Date(`${dateStr}T00:00:00`).getTime() - Date.now();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (Number.isFinite(days) && days >= 0 && days <= 730) {
      daysUntilExam = days;
    }
  }

  return {
    userName,
    targetBand: setup.targetBand || survey?.targetBand || 7.5,
    examMode: setup.examMode || survey?.examTrack || 'Academic',
    daysUntilExam,
    weakestSkill: survey?.weakestSkill || 'speaking',
    mistakeCount: mistakes.length,
    topMistake: mistakes[0]?.title || mistakes[0]?.prompt || '',
    currentPage
  };
}

function buildPersonalizedWelcome(ctx: StudentContextSnapshot): BarnabyMessage {
  const parts: string[] = [
    `Hi ${ctx.userName}! I'm Barnaby — your free-roaming dragon pet, guide & IELTS tutor.`
  ];
  if (ctx.daysUntilExam !== null) {
    parts.push(`Only ${ctx.daysUntilExam} days until your Band ${ctx.targetBand.toFixed(1)} goal!`);
  } else {
    parts.push(`We're aiming for Band ${ctx.targetBand.toFixed(1)} (${ctx.examMode}) together.`);
  }
  if (ctx.mistakeCount > 0) {
    parts.push(
      `I spotted ${ctx.mistakeCount} unmastered trap${ctx.mistakeCount > 1 ? 's' : ''} in your Mistake Vault — drag me anywhere, pet me, feed me a word treat, or ask me anything!`
    );
  } else {
    parts.push(`Drag me anywhere on screen, tap Pet or Word Treat, or ask me any IELTS question!`);
  }

  return {
    id: 'barnaby_welcome',
    sender: 'barnaby',
    badge: 'PERSONAL GUIDE',
    mood: 'happy',
    text: parts.join(' '),
    suggestedAction:
      ctx.mistakeCount > 0
        ? { label: `Review ${ctx.mistakeCount} Vault Traps`, route: '/learn/vault' }
        : { label: 'Try a Blind-Verified Drill', route: '/practice/question-bank' },
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
          activityText: parsed.activityText || 'Hovering near your study desk',
          freeRoam: parsed.freeRoam !== false,
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
    activityText: 'Exploring your BandSprint desk',
    freeRoam: true,
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
    vocab: '/learn/vocab',
    grammar: '/learn/grammar',
    livemock: '/practice/mock-tests',
    vault: '/learn/vault',
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
      suggestedAction: { label: 'Open Vocabulary Lab', route: '/learn/vocab' }
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
  if (q.includes('mistake') || q.includes('vault') || q.includes('weak')) {
    return {
      mood: 'cheering',
      text:
        ctx.mistakeCount > 0
          ? `You have ${ctx.mistakeCount} unmastered trap${ctx.mistakeCount > 1 ? 's' : ''} waiting in your Mistake Vault! Reviewing old mistakes raises your band faster than taking random new tests.`
          : `Your Mistake Vault is spotless! Let’s sharpen your ${ctx.weakestSkill} skill with a quick timed drill.`,
      bengaliTip: 'পুরোনো ভুলগুলো ঠিক করলেই ব্যান্ড স্কোর সবচেয়ে দ্রুত ০.৫–১.০ বাড়ে!',
      suggestedAction:
        ctx.mistakeCount > 0
          ? { label: 'Open Mistake Vault', route: '/learn/vault' }
          : { label: `Train ${ctx.weakestSkill}`, route: `/practice/${ctx.weakestSkill}` }
    };
  }
  return {
    mood: 'happy',
    text: `I’ve got your back, ${ctx.userName}! Ask me for a Writing Task 2 plan, a Reading TFNG trap, a Speaking Part 3 upgrade, or tap “Word Treat” / “15s Quiz” above to play & learn!`,
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
    const res = await fetch('/api/tutor/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: query,
        history,
        persona: 'lexical_barnaby',
        model: 'gemini-4-hydrogen',
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
          weakestSkill: ctx.weakestSkill,
          topMistake: ctx.topMistake,
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
  if (currentPage.includes('/learn/vocab')) {
    return {
      mood: 'eating',
      text: 'Mmm, juicy C2 words! Tap me and feed me a Word Treat!'
    };
  }
  if (currentPage.includes('/learn/vault')) {
    return {
      mood: 'cheering',
      text:
        ctx.mistakeCount > 0
          ? `Let’s squash those ${ctx.mistakeCount} traps together — you’ve got this!`
          : 'Zero traps left in your Vault! *proud dragon flaps*'
    };
  }
  if (ctx.mistakeCount > 0) {
    return {
      mood: 'curious',
      text: `Hey ${ctx.userName}! ${ctx.mistakeCount} trap${ctx.mistakeCount > 1 ? 's are' : ' is'} hiding in your Mistake Vault. Quick 15-sec quiz?`,
      action: { label: 'Open Vault', route: '/learn/vault' }
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
    text: `Psst ${ctx.userName}! I can roam freely now — drag me, pet me, or ask for a Band 8.5 tip!`
  };
}
