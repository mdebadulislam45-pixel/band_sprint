import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Volume2,
  VolumeX,
  Copy,
  Check,
  ArrowRight,
  BookOpen,
  Lightbulb,
  Maximize2,
  Minimize2,
  RefreshCw,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { getMistakes } from '../../utils/vaultStorage';
import { ChubbyMascotAvatar, MascotMood } from './ChubbyMascotAvatar';
import { C1_IDIOMS_AND_PHRASES, C1IdiomEntry } from '../../data/c1IdiomsAndPhrasesData';

export interface TutorContextPayload {
  module?: string;
  currentQuestion?: string;
  questionType?: string;
  userAnswer?: string;
  correctAnswer?: string;
  examMode?: 'Academic' | 'General Training';
}

interface TutorResponse {
  reply: string;
  strategyTip?: string;
  academicCollocations?: string[];
  suggestedNextAction?: {
    label: string;
    route: string;
  };
  bengaliTip?: string;
  isAiPowered?: boolean;
  disclaimer?: string;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'tutor';
  text: string;
  timestamp: number;
  data?: TutorResponse;
}

const LIVE_PAGE_GUIDANCE: Record<string, string> = {
  home: 'Welcome back! Start a 5-Minute Sprint Drill or test your ear in the Listening Lab.',
  listening: 'Listening Tip: Read the question stem first and watch out for self-correction words like "actually" or "Wait, no".',
  reading: 'Reading Tip: Remember — "False" means the passage proves the opposite; "Not Given" means there is zero evidence.',
  writing: 'Writing Tip: Never include raw numbers in your Task 1 Overview paragraph — save exact figures for Body Paragraphs!',
  speaking: 'Speaking Tip: Expand every Part 1 answer with a reason + brief personal example (2–3 natural sentences).',
  cdielts: 'CD-IELTS Simulator: Use the built-in Notepad and Highlight tools just like on the official computer test!',
  essayarchitect: 'Essay Architect: Tap "Listen" on any Cambridge model paragraph to absorb natural C2 rhythm and cohesion!',
  vocab: 'Lexical Tip: Learn words in 2–3 word collocation chunks rather than isolated single words.'
};

type LexiconFilter = 'all' | 'c2_idiom' | 'c1_idiom' | 'c2_vocab' | 'c1_vocab';

interface ContextualAITutorProps {
  currentPage: string;
  examMode: 'Academic' | 'General Training';
  onNavigate: (page: string) => void;
  onShowToast: (msg: string) => void;
}

export const ContextualAITutor: React.FC<ContextualAITutorProps> = ({
  currentPage,
  examMode,
  onNavigate,
  onShowToast
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'lexicon'>('chat');
  const [lexiconFilter, setLexiconFilter] = useState<LexiconFilter>('all');
  const [lexiconIndex, setLexiconIndex] = useState(0);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeContext, setActiveContext] = useState<TutorContextPayload>({
    module: currentPage,
    examMode
  });
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mascotMood, setMascotMood] = useState<MascotMood>('idle');
  const [liveHintBubble, setLiveHintBubble] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const mistakes = getMistakes();
  const unmasteredCount = mistakes.filter((m) => !m.mastered).length;

  // Curated C1 & C2 Idioms and Vocabulary items (newest items first so users immediately see new C2/C1 idioms & vocab)
  const lexiconItems: C1IdiomEntry[] = React.useMemo(() => {
    const reversed = [...C1_IDIOMS_AND_PHRASES].reverse();
    return reversed.filter((item) => {
      const level = item.cefrLevel || (item.category === 'C2 Band-9 Mastery' ? 'C2' : 'C1');
      const isVocab =
        item.type === 'C1 Vocabulary' ||
        item.type === 'C2 Vocabulary' ||
        item.type === 'Adjective' ||
        item.type === 'Adverb';
      if (lexiconFilter === 'c2_idiom') return level === 'C2' && !isVocab;
      if (lexiconFilter === 'c1_idiom') return level === 'C1' && !isVocab;
      if (lexiconFilter === 'c2_vocab') return level === 'C2' && isVocab;
      if (lexiconFilter === 'c1_vocab') return level === 'C1' && isVocab;
      return true;
    });
  }, [lexiconFilter]);

  const currentLexiconItem = lexiconItems[lexiconIndex % Math.max(1, lexiconItems.length)];

  const [messages, setMessages] = useState<MessageItem[]>(() => [
    {
      id: 'welcome_1',
      sender: 'tutor',
      text: `Cheerio! I'm Barnaby, your Cambridge AI Companion. I'm guiding you live through ${currentPage.toUpperCase()} (${examMode}). Ask me any exam question or switch to the C1 & C2 Idiom + Vocabulary tab to master Band 8.5–9.0 expressions!`,
      timestamp: Date.now(),
      data: {
        reply: `Cheerio! I'm Barnaby, your Cambridge AI Companion. I'm guiding you live through ${currentPage.toUpperCase()} (${examMode}). Ask me any exam question or explore our new C1 & C2 Idioms and Vocabulary deck!`,
        strategyTip:
          'Always focus on the four Cambridge criteria: Task Achievement/Response, Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy.',
        academicCollocations: ['watershed moment', 'walk a tightrope', 'insurmountable barrier', 'bridging the chasm'],
        suggestedNextAction: { label: 'Open C1 & C2 Idiom Lab', route: 'c1idioms' }
      }
    }
  ]);

  // Live Page-Aware Guidance Bubble whenever the user navigates to a new section
  useEffect(() => {
    setActiveContext((prev) => ({
      ...prev,
      module: currentPage,
      examMode
    }));

    const hint =
      LIVE_PAGE_GUIDANCE[currentPage] ||
      `Barnaby is watching over your ${currentPage.toUpperCase()} session — tap me if you spot a tricky question!`;
    setLiveHintBubble(hint);
    setMascotMood('motivating');

    const hideTimer = setTimeout(() => {
      setLiveHintBubble(null);
      setMascotMood('idle');
    }, 8500);

    return () => clearTimeout(hideTimer);
  }, [currentPage, examMode]);

  // Listen for global custom event to open tutor with specific question/context
  useEffect(() => {
    const handleOpenTutorEvent = (e: any) => {
      const payload: TutorContextPayload | undefined = e?.detail;
      setIsOpen(true);
      setIsMinimized(false);
      setActiveTab('chat');
      soundManager.playBeep(650, 0.05);

      if (payload) {
        setActiveContext((prev) => ({
          ...prev,
          ...payload
        }));

        if (payload.currentQuestion) {
          const prompt = `Can you explain the key trap and strategy for this ${payload.module || currentPage} question: "${payload.currentQuestion}"?`;
          sendMessage(prompt, payload);
        }
      }
    };

    window.addEventListener('open_ai_tutor', handleOpenTutorEvent);
    return () => window.removeEventListener('open_ai_tutor', handleOpenTutorEvent);
  }, [currentPage, examMode]);

  useEffect(() => {
    if (isOpen && !isMinimized && activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isLoading, activeTab]);

  const sendMessage = async (textToSend?: string, customContext?: TutorContextPayload) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    setActiveTab('chat');
    soundManager.playBeep(520, 0.04);
    setInputMessage('');
    setMascotMood('thinking');

    const userMsg: MessageItem = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const mergedContext = {
      ...activeContext,
      ...customContext,
      module: customContext?.module || activeContext.module || currentPage,
      examMode: customContext?.examMode || activeContext.examMode || examMode,
      mistakeCount: unmasteredCount
    };

    try {
      const res = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          context: mergedContext
        })
      });

      if (res.ok) {
        const data: TutorResponse = await res.json();
        const tutorMsg: MessageItem = {
          id: 'tut_' + Date.now(),
          sender: 'tutor',
          text: data.reply,
          timestamp: Date.now(),
          data
        };
        setMessages((prev) => [...prev, tutorMsg]);
        setMascotMood('motivating');
        soundManager.playSuccess();
        setTimeout(() => setMascotMood('idle'), 2000);
      } else {
        throw new Error(`Server returned ${res.status}`);
      }
    } catch {
      const fallbackMsg: MessageItem = {
        id: 'tut_err_' + Date.now(),
        sender: 'tutor',
        text: `In IELTS ${currentPage.toUpperCase()}, mastering recurring question types and C1/C2 lexical precision is crucial. Underline key constraints in the question stem, avoid hasty assumptions, and verify that your answer strictly respects word limits.`,
        timestamp: Date.now(),
        data: {
          reply: `In IELTS ${currentPage.toUpperCase()}, mastering recurring question types and C1/C2 lexical precision is crucial.`,
          strategyTip: 'Check whether the question requires NO MORE THAN TWO WORDS AND/OR A NUMBER.',
          academicCollocations: ['watershed moment', 'bridging the chasm', 'empirical validation'],
          suggestedNextAction: { label: 'Open C1 & C2 Idioms', route: 'c1idioms' }
        }
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      setMascotMood('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakTutor = (text: string) => {
    if (isPlayingAudio) {
      stopSpeech();
      setIsPlayingAudio(false);
      setMascotMood('idle');
      return;
    }

    soundManager.playBeep(600, 0.04);
    setIsPlayingAudio(true);
    setMascotMood('speaking');
    speakBritish(text, {
      speakerId: 'speaker_barnaby',
      gender: 'female',
      rate: 1.02,
      onEnd: () => {
        setIsPlayingAudio(false);
        setMascotMood('idle');
      },
      onError: () => {
        setIsPlayingAudio(false);
        setMascotMood('idle');
      }
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    onShowToast('Copied C1/C2 expression to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    {
      label: 'C2 Idioms & Usage',
      prompt: 'Teach me 3 high-scoring C2 idioms suitable for IELTS Speaking Part 3 with Bangla meaning and Band 9 examples.'
    },
    {
      label: 'C1/C2 Academic Vocab',
      prompt: `Give me 5 Band 9 C1 and C2 vocabulary words for ${examMode} Writing Task 2 with collocations and examples.`
    },
    {
      label: 'Explain Traps',
      prompt: `What are the most common trap distractors in IELTS ${currentPage} and how can I avoid them?`
    },
    {
      label: 'Band 9 Collocations',
      prompt: `Give me 5 Band 8.5+ academic collocations suitable for ${examMode} Task 2.`
    }
  ];

  // ================= FLOATING LIVE AI COMPANION (WHEN CHAT DRAWER IS CLOSED) =================
  if (!isOpen) {
    return (
      <aside
        aria-label="Barnaby Live Cambridge AI Companion"
        className="fixed bottom-20 md:bottom-5 right-2.5 sm:right-5 z-40 flex flex-col items-end gap-2 max-w-[92vw] sm:max-w-xs"
      >
        {/* Live Contextual Guidance Speech Bubble */}
        {liveHintBubble && (
          <div className="w-64 sm:w-72 rounded-2xl bg-white/95 dark:bg-[#0B1224]/95 backdrop-blur-md border border-blue-200 dark:border-slate-700 shadow-xl p-2.5 sm:p-3 animate-fade-in text-left flex items-start justify-between gap-2">
            <div
              onClick={() => setIsOpen(true)}
              className="text-[11px] text-slate-700 dark:text-slate-200 font-medium leading-snug cursor-pointer"
            >
              <span className="font-black text-blue-600 dark:text-blue-400 mr-1">Barnaby Live:</span>
              {liveHintBubble}
            </div>
            <button
              type="button"
              onClick={() => setLiveHintBubble(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white shrink-0"
              aria-label="Dismiss hint"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Cute Chubby Animal Launcher Bar */}
        <div className="flex items-center gap-1.5 bg-[#0B1224] text-white p-1.5 pr-2.5 rounded-full border border-slate-700/90 shadow-xl hover:border-blue-400/60 transition-all">
          {/* Chubby Mascot Button -> Opens Full Live AI Tutor */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setActiveTab('chat');
              soundManager.playBeep(600, 0.04);
            }}
            className="flex items-center gap-2 cursor-pointer group focus:outline-none"
            title="Open Barnaby — Your Live Cambridge AI Tutor"
          >
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-amber-100 via-amber-50 to-blue-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center border border-amber-300/60 shadow-inner">
              <ChubbyMascotAvatar mood={mascotMood} size="sm" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0B1224]" />
            </div>

            <div className="hidden sm:flex flex-col text-left pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-tight text-white group-hover:text-amber-300 transition-colors">
                  Barnaby AI
                </span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 uppercase">
                  LIVE
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Cambridge Guide · C1/C2 Lexicon</span>
            </div>
          </button>

          {/* Direct C1 & C2 Idiom & Vocabulary Deck Launcher Button */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
              setActiveTab('lexicon');
              soundManager.playBeep(640, 0.04);
            }}
            className="px-2.5 h-8 rounded-full bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-400/40 text-indigo-200 flex items-center justify-center gap-1 text-[10px] font-mono font-bold transition cursor-pointer active:scale-95"
            title="Explore C1 & C2 Idioms and Academic Vocabulary"
            aria-label="Open C1 and C2 Idioms and Vocabulary"
          >
            <GraduationCap className="w-3.5 h-3.5 text-indigo-300" />
            <span>C1/C2</span>
          </button>
        </div>
      </aside>
    );
  }

  // ================= EXPANDED LIVE AI TUTOR DRAWER =================
  return (
    <aside
      aria-label="Barnaby Cambridge AI Tutor Chat"
      className={`fixed z-50 transition-all duration-200 shadow-2xl ${
        isMinimized
          ? 'bottom-20 md:bottom-6 right-2.5 sm:right-6 w-[calc(100vw-1.25rem)] sm:w-80 rounded-2xl bg-[#0B1224] text-white border border-slate-700 p-3'
          : 'bottom-20 md:bottom-6 inset-x-2.5 sm:inset-x-auto sm:right-6 sm:w-[430px] max-h-[78vh] sm:max-h-[650px] rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0B1224] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden'
      }`}
    >
      {/* Top Header with Cute Chubby Mascot */}
      <div className="p-3 sm:p-3.5 bg-[#0B1224] text-white flex items-center justify-between gap-2.5 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-100 to-blue-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shrink-0 border border-amber-300/50">
            <ChubbyMascotAvatar mood={mascotMood} size="sm" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-black truncate text-white">
                Barnaby · Live AI Tutor
              </h3>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50 uppercase">
                {activeContext.module || currentPage}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              Cambridge Guide · C1 & C2 Idioms & Vocabulary
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsMinimized(false);
              setActiveTab(activeTab === 'lexicon' ? 'chat' : 'lexicon');
            }}
            className={`px-2 py-1 rounded-xl border text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
              activeTab === 'lexicon'
                ? 'bg-indigo-600 border-indigo-400 text-white'
                : 'bg-indigo-500/20 hover:bg-indigo-500/30 border-indigo-400/40 text-indigo-200'
            }`}
            title="Switch between Live AI Chat and C1/C2 Idioms & Vocabulary"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{activeTab === 'lexicon' ? 'AI Chat' : 'C1/C2 Vocab'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              stopSpeech();
              setIsPlayingAudio(false);
              setMascotMood('idle');
              soundManager.playBeep(480, 0.04);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close Tutor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Mode Switcher Bar: Live Tutor Chat vs C1 & C2 Idiom + Vocabulary Vault */}
          <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-900/90 p-1 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Live AI Tutor</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lexicon')}
              className={`py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'lexicon'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>C1 & C2 Idiom + Vocab ({C1_IDIOMS_AND_PHRASES.length})</span>
            </button>
          </div>

          {activeTab === 'lexicon' ? (
            /* ================= C1 & C2 IDIOM & VOCABULARY EXPLORER ================= */
            <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3 bg-slate-50/60 dark:bg-slate-950/50">
              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1">
                {(
                  [
                    { id: 'all', label: 'All C1 & C2' },
                    { id: 'c2_idiom', label: 'C2 Idioms' },
                    { id: 'c1_idiom', label: 'C1 Idioms' },
                    { id: 'c2_vocab', label: 'C2 Vocabulary' },
                    { id: 'c1_vocab', label: 'C1 Vocabulary' }
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setLexiconFilter(tab.id);
                      setLexiconIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      lexiconFilter === tab.id
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {currentLexiconItem && (
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-black uppercase ${
                          (currentLexiconItem.cefrLevel ||
                            (currentLexiconItem.category === 'C2 Band-9 Mastery' ? 'C2' : 'C1')) === 'C2'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300/60'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300/60'
                        }`}
                      >
                        {currentLexiconItem.cefrLevel ||
                          (currentLexiconItem.category === 'C2 Band-9 Mastery' ? 'C2' : 'C1')}{' '}
                        · {currentLexiconItem.type}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {currentLexiconItem.ieltsSuitability}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      {(lexiconIndex % lexiconItems.length) + 1} / {lexiconItems.length}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                      {currentLexiconItem.phrase}
                    </h4>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleSpeakTutor(
                            `${currentLexiconItem.phrase.replace(/\s*\(C[12] Vocabulary\)\s*/i, '')}. Example: ${currentLexiconItem.exampleSentence}`
                          )
                        }
                        className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer"
                        title="Listen in British RP pronunciation"
                      >
                        {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            `${currentLexiconItem.phrase} — ${currentLexiconItem.exampleSentence}`,
                            `lex_${currentLexiconItem.id}`
                          )
                        }
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                        title="Copy expression & example"
                      >
                        {copiedId === `lex_${currentLexiconItem.id}` ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Bangla Meaning */}
                  <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/50 text-xs text-indigo-950 dark:text-indigo-200 font-semibold">
                    <span className="text-[10px] font-mono uppercase font-bold text-indigo-600 dark:text-indigo-400 block mb-0.5">
                      বাংলা অর্থ (Meaning):
                    </span>
                    {currentLexiconItem.banglaMeaning}
                  </div>

                  {/* Cambridge Band 9 Example */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-0.5">
                      Band 9 IELTS Context:
                    </span>
                    “{currentLexiconItem.exampleSentence}”
                  </div>

                  {/* Navigation Controls */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setLexiconIndex((prev) => (prev - 1 + lexiconItems.length) % lexiconItems.length)
                      }
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        sendMessage(
                          `Show me how to use "${currentLexiconItem.phrase.replace(/\s*\(C[12] Vocabulary\)\s*/i, '')}" in an IELTS ${examMode} Writing Task 2 paragraph and Speaking Part 3 answer.`
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold transition cursor-pointer"
                    >
                      Practice with Barnaby
                    </button>

                    <button
                      type="button"
                      onClick={() => setLexiconIndex((prev) => (prev + 1) % lexiconItems.length)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Direct Links to Full C1/C2 Idiom Lab & Vocabulary Deck */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('c1idioms');
                    setIsOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between transition cursor-pointer"
                >
                  <span>Full C1/C2 Idioms ({C1_IDIOMS_AND_PHRASES.length})</span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('vocab');
                    setIsOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between transition cursor-pointer"
                >
                  <span>Full Vocabulary Vault</span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                </button>
              </div>
            </div>
          ) : (
            /* ================= LIVE AI TUTOR CHAT TAB ================= */
            <>
              {/* Active Context Banner */}
              {activeContext.currentQuestion && (
                <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2 shrink-0">
                  <div className="truncate flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="truncate italic">"{activeContext.currentQuestion}"</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveContext((p) => ({ ...p, currentQuestion: undefined }))}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 shrink-0"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Messages Scroll Area */}
              <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 min-h-[220px] max-h-[360px] bg-slate-50/50 dark:bg-slate-950/40">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    <div
                      className={`max-w-[88%] p-3 rounded-2xl text-xs sm:text-[13px] leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs border border-slate-200/90 dark:border-slate-700 shadow-2xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>

                      {/* Tutor Extra Educational Highlights */}
                      {m.data && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/80 space-y-2">
                          {/* Strategy Tip */}
                          {m.data.strategyTip && (
                            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-200 space-y-0.5">
                              <span className="font-bold flex items-center gap-1 text-[10px] uppercase font-mono tracking-wider text-amber-700 dark:text-amber-300">
                                <Lightbulb className="w-3 h-3 text-amber-500" /> Barnaby's Strategy Tip
                              </span>
                              <p>{m.data.strategyTip}</p>
                            </div>
                          )}

                          {/* Academic Collocations */}
                          {m.data.academicCollocations && m.data.academicCollocations.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-slate-500 block">
                                Band 8.5+ C1/C2 Collocations:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {m.data.academicCollocations.map((c, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleCopy(c, `${m.id}_col_${i}`)}
                                    className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[10px] font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 flex items-center gap-1 transition cursor-pointer"
                                    title="Click to copy collocation"
                                  >
                                    {copiedId === `${m.id}_col_${i}` ? (
                                      <Check className="w-2.5 h-2.5 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-2.5 h-2.5 text-slate-400" />
                                    )}
                                    <span>{c}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Bengali Memory Tip */}
                          {m.data.bengaliTip && (
                            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-[11px] text-emerald-900 dark:text-emerald-200">
                              <span className="font-bold block text-[10px] uppercase font-mono text-emerald-700 dark:text-emerald-400 mb-0.5">
                                সহজ বাংলা টিপস:
                              </span>
                              <p>{m.data.bengaliTip}</p>
                            </div>
                          )}

                          {/* Suggested Next Action & Voice Readout */}
                          <div className="pt-1 flex items-center justify-between">
                            {m.data.suggestedNextAction ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (m.data?.suggestedNextAction?.route) {
                                    onNavigate(m.data.suggestedNextAction.route);
                                    setIsOpen(false);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 text-[11px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/60 flex items-center gap-1 transition cursor-pointer"
                              >
                                <span>{m.data.suggestedNextAction.label}</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <span />
                            )}

                            <button
                              type="button"
                              onClick={() => handleSpeakTutor(m.text)}
                              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                              title="Read aloud with British Examiner voice"
                            >
                              {isPlayingAudio ? (
                                <VolumeX className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                              ) : (
                                <Volume2 className="w-3.5 h-3.5" />
                              )}
                              <span>{isPlayingAudio ? 'Stop' : 'Listen'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <span className="text-[9px] text-slate-400 px-1 font-mono">
                      {m.sender === 'tutor' ? 'Barnaby (Cambridge Guide)' : 'Candidate'}
                    </span>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 w-fit">
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin" />
                    <span>Barnaby is checking the Cambridge rubric...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts Carousel */}
              <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                {quickPrompts.map((qp, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => sendMessage(qp.prompt)}
                    className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap transition shrink-0 border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={`Ask Barnaby about ${currentPage} or C1/C2 idioms...`}
                  disabled={isLoading}
                  className="flex-1 h-10 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="h-10 px-3 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold transition flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </>
          )}
        </>
      )}
    </aside>
  );
};
