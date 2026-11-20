import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  Send,
  Volume2,
  VolumeX,
  Minus,
  Sparkles,
  Heart,
  Apple,
  Zap,
  Compass,
  Pin,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';
import {
  BARNABY_STATE_EVENT,
  BarnabyCompanionState,
  BarnabyMessage,
  MOOD_META,
  answerBarnabyMiniQuiz,
  clearBarnabyChat,
  feedBarnabyWordTreat,
  getBondStage,
  getContextualWhisper,
  getStudentContextSnapshot,
  loadBarnabyState,
  petBarnaby,
  rateBarnabyMessage,
  sendBarnabyChatMessage,
  startBarnabyMiniQuiz,
  toggleBarnabyFreeRoam,
  updateBarnabyMoodAndActivity
} from '../../services/barnabyCompanionStore';

interface FloatingBarnabyProps {
  onNavigate: (path: string) => void;
  currentPath?: string;
}

interface FloatingParticle {
  id: number;
  symbol: string;
  offsetX: number;
}

const OPEN_KEY = 'bandsprint_barnaby_open_v1';
const POS_KEY = 'bandsprint_barnaby_pos_v2';

// Routes where FloatingBarnaby stays hidden so he never covers exam controls,
// microphone buttons, model answer actions, or the inline Barnaby card on /progress.
const HIDDEN_ROUTE_PREFIXES = [
  '/practice/speaking',
  '/practice/mock-tests',
  '/practice/listening',
  '/practice/reading',
  '/practice/writing',
  '/practice/ai-tools',
  '/learn/diagnostic',
  '/learn/shadowing',
  '/progress'
];

const QUICK_CHIPS = [
  'What should I practise next?',
  'Give me a Band 8.5 idiom + Bangla',
  'Explain True / False / Not Given traps',
  'Plan a 20-min Writing Task 2 sprint'
];

const IDLE_ACTIVITIES: Array<{
  mood: 'curious' | 'playful' | 'happy' | 'sleepy';
  activity: string;
  whisper: string;
}> = [
  {
    mood: 'curious',
    activity: 'Sniffing around for C2 idioms...',
    whisper: 'Sniffing for C2 idioms... tap me for a Band 8.5 Word Treat!'
  },
  {
    mood: 'playful',
    activity: 'Doing tiny dragon wing-hops!',
    whisper: 'Ready for a 15-second IELTS trap quiz? Tap me!'
  },
  {
    mood: 'sleepy',
    activity: 'Taking a cozy dragon nap...',
    whisper: 'Zzz... dreaming of Band 8.5... tap or drag me to wake me up!'
  },
  {
    mood: 'happy',
    activity: 'Watching over your IELTS sprint',
    whisper: 'Tip: You can drag me anywhere on screen so I sit right where you like!'
  }
];

function getViewportBounds() {
  if (typeof window === 'undefined') {
    return { width: 1200, height: 800, isMobile: false };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  return { width, height, isMobile: width < 768 };
}

function clampPosition(x: number, y: number): { x: number; y: number } {
  const { width, height, isMobile } = getViewportBounds();
  const size = isMobile ? 54 : 60;
  const padX = isMobile ? 12 : 20;
  const topMin = isMobile ? 76 : 84;
  const bottomReserve = isMobile ? 92 : 24;
  return {
    x: Math.max(padX, Math.min(width - size - padX, x)),
    y: Math.max(topMin, Math.min(height - size - bottomReserve, y))
  };
}

function getDefaultPosition(): { x: number; y: number } {
  const { width, height, isMobile } = getViewportBounds();
  const size = isMobile ? 54 : 60;
  const padX = isMobile ? 14 : 24;
  const bottomReserve = isMobile ? 96 : 28;
  return clampPosition(width - size - padX, height - size - bottomReserve);
}

function pickEdgeRoamSpot(currentX: number, currentY: number): { x: number; y: number } {
  const { width, height, isMobile } = getViewportBounds();
  const size = isMobile ? 54 : 60;
  const padX = isMobile ? 14 : 24;
  const topMin = isMobile ? 84 : 96;
  const bottomMax = height - size - (isMobile ? 96 : 28);
  const midY = Math.round((topMin + bottomMax) * 0.55);
  const upperY = Math.round(topMin + (bottomMax - topMin) * 0.22);

  // Perimeter spots only — keeps Barnaby lively & free without blocking center reading text
  const spots = isMobile
    ? [
        { x: width - size - padX, y: bottomMax },
        { x: padX, y: bottomMax },
        { x: width - size - padX, y: midY },
        { x: padX, y: midY }
      ]
    : [
        { x: width - size - padX, y: bottomMax },
        { x: width - size - padX, y: midY },
        { x: width - size - padX, y: upperY },
        { x: padX, y: bottomMax },
        { x: padX, y: midY }
      ];

  const farSpots = spots.filter(
    (s) => Math.hypot(s.x - currentX, s.y - currentY) > 100
  );
  const pool = farSpots.length > 0 ? farSpots : spots;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  return clampPosition(chosen.x, chosen.y);
}

export const FloatingBarnaby: React.FC<FloatingBarnabyProps> = ({
  onNavigate,
  currentPath = '/'
}) => {
  const [state, setState] = useState<BarnabyCompanionState>(() => loadBarnabyState(currentPath));
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(OPEN_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [isHiddenForExam, setIsHiddenForExam] = useState(false);

  // Free-roam position & drag state
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          return clampPosition(parsed.x, parsed.y);
        }
      }
    } catch {}
    return getDefaultPosition();
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragMetaRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);

  // Whisper bubble & particles
  const [whisper, setWhisper] = useState<{ text: string; action?: { label: string; route: string } } | null>(null);
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  const isHiddenOnRoute = HIDDEN_ROUTE_PREFIXES.some(
    (prefix) => currentPath === prefix || currentPath.startsWith(`${prefix}/`)
  );

  const spawnParticles = useCallback((symbol: string, count = 3) => {
    const batch: FloatingParticle[] = Array.from({ length: count }).map((_, i) => ({
      id: Date.now() + Math.random() * 1000 + i,
      symbol,
      offsetX: (i - (count - 1) / 2) * 16
    }));
    setParticles((prev) => [...prev.slice(-6), ...batch]);
    window.setTimeout(() => {
      const ids = new Set(batch.map((b) => b.id));
      setParticles((prev) => prev.filter((p) => !ids.has(p.id)));
    }, 1350);
  }, []);

  // Sync with shared barnabyCompanionStore (keeps AITutorWidget & FloatingBarnaby identical!)
  useEffect(() => {
    const onSync = (e: Event) => {
      const detail = (e as CustomEvent<BarnabyCompanionState>).detail;
      if (detail) setState(detail);
      else setState(loadBarnabyState(currentPath));
    };
    window.addEventListener(BARNABY_STATE_EVENT, onSync);
    return () => window.removeEventListener(BARNABY_STATE_EVENT, onSync);
  }, [currentPath]);

  // Keep inside viewport on window resize
  useEffect(() => {
    const onResize = () => {
      setPos((prev) => clampPosition(prev.x, prev.y));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Hide during CD-IELTS active exam
  useEffect(() => {
    const hide = () => setIsHiddenForExam(true);
    const show = () => setIsHiddenForExam(false);
    window.addEventListener('barnaby-float-hide', hide);
    window.addEventListener('barnaby-float-show', show);
    return () => {
      window.removeEventListener('barnaby-float-hide', hide);
      window.removeEventListener('barnaby-float-show', show);
    };
  }, []);

  // Persist open state
  useEffect(() => {
    try {
      localStorage.setItem(OPEN_KEY, isOpen ? '1' : '0');
    } catch {}
  }, [isOpen]);

  // Smooth auto-scroll on new messages
  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [state.messages, isSending, isOpen]);

  // Contextual whisper when landing on a meaningful page
  useEffect(() => {
    if (isHiddenForExam || isHiddenOnRoute || isOpen) return;
    const t = window.setTimeout(() => {
      const ctx = getStudentContextSnapshot(currentPath);
      const nextWhisper = getContextualWhisper(currentPath, ctx);
      updateBarnabyMoodAndActivity(nextWhisper.mood, nextWhisper.text.slice(0, 48));
      setWhisper({ text: nextWhisper.text, action: nextWhisper.action });
    }, 2400);
    return () => window.clearTimeout(t);
  }, [currentPath, isHiddenForExam, isHiddenOnRoute, isOpen]);

  // Auto-hide whisper gently after 9 seconds so screen stays uncluttered
  useEffect(() => {
    if (!whisper) return;
    const t = window.setTimeout(() => setWhisper(null), 9000);
    return () => window.clearTimeout(t);
  }, [whisper]);

  // Autonomous Free-Roam & Idle Pet Activities!
  useEffect(() => {
    if (isHiddenForExam || isHiddenOnRoute || isOpen || isDragging) return;
    const interval = window.setInterval(() => {
      const latest = loadBarnabyState(currentPath);
      if (latest.freeRoam) {
        const nextSpot = pickEdgeRoamSpot(posRef.current.x, posRef.current.y);
        setPos(nextSpot);
        try {
          localStorage.setItem(POS_KEY, JSON.stringify(nextSpot));
        } catch {}
      }

      const idleMs = Date.now() - (latest.lastInteractionAt || 0);
      const picked =
        idleMs > 90_000
          ? IDLE_ACTIVITIES[2] // sleepy nap
          : IDLE_ACTIVITIES[Math.floor(Math.random() * IDLE_ACTIVITIES.length)];

      updateBarnabyMoodAndActivity(picked.mood, picked.activity);
      if (picked.mood === 'sleepy') {
        spawnParticles('💤', 2);
      } else if (picked.mood === 'playful') {
        spawnParticles('✨', 2);
      }
    }, 24_000);

    return () => window.clearInterval(interval);
  }, [isHiddenForExam, isHiddenOnRoute, isOpen, isDragging, currentPath, spawnParticles]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => stopSpeech();
  }, []);

  // Pointer drag handlers for dragging Barnaby freely anywhere on screen
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragMetaRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      moved: false
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const meta = dragMetaRef.current;
    if (!meta || meta.pointerId !== e.pointerId) return;
    const dx = e.clientX - meta.startClientX;
    const dy = e.clientY - meta.startClientY;
    if (!meta.moved && Math.hypot(dx, dy) > 6) {
      meta.moved = true;
      setIsDragging(true);
      setWhisper(null);
    }
    if (meta.moved) {
      const next = clampPosition(meta.origX + dx, meta.origY + dy);
      setPos(next);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const meta = dragMetaRef.current;
    if (!meta || meta.pointerId !== e.pointerId) return;
    dragMetaRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (meta.moved) {
      setIsDragging(false);
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(posRef.current));
      } catch {}
      updateBarnabyMoodAndActivity('playful', 'Wheee! Cozy new perch!');
      spawnParticles('✨', 3);
      soundManager.playBeep(660, 0.04);
    } else {
      // Genuine click/tap: open or close Barnaby
      setIsOpen((v) => !v);
      setWhisper(null);
      if (state.mood === 'sleepy') {
        updateBarnabyMoodAndActivity('happy', 'Wide awake and ready to study!');
      }
      soundManager.playBeep(600, 0.04);
    }
  };

  const handlePet = () => {
    const { state: next, quip } = petBarnaby();
    setState(next);
    spawnParticles('❤️', 4);
    soundManager.playSuccess();
    if (!isOpen) {
      setWhisper({ text: quip });
    }
  };

  const handleFeedTreat = () => {
    const { state: next, message } = feedBarnabyWordTreat();
    setState(next);
    spawnParticles('🍎', 3);
    soundManager.playSuccess();
    setIsOpen(true);
    setPlayingId(message.id);
    speakBritish(message.text, {
      speakerId: 'speaker_barnaby',
      onEnd: () => setPlayingId(null),
      onError: () => setPlayingId(null)
    });
  };

  const handleStartQuiz = () => {
    const { state: next } = startBarnabyMiniQuiz();
    setState(next);
    spawnParticles('⚡', 3);
    soundManager.playBeep(720, 0.05);
    setIsOpen(true);
  };

  const handleQuizAnswer = (msgId: string, optIdx: number) => {
    const { state: next, isCorrect } = answerBarnabyMiniQuiz(msgId, optIdx);
    setState(next);
    if (isCorrect) {
      spawnParticles('🎉', 4);
      soundManager.playSuccess();
    } else {
      soundManager.playBeep(360, 0.06);
    }
  };

  const handleRate = (msgId: string, rating: 'up' | 'down') => {
    const next = rateBarnabyMessage(msgId, rating);
    setState(next);
    if (rating === 'up') {
      spawnParticles('🏆', 3);
      soundManager.playSuccess();
    } else {
      soundManager.playBeep(480, 0.04);
    }
  };

  const handleToggleRoam = () => {
    const next = toggleBarnabyFreeRoam();
    setState(next);
    spawnParticles(next.freeRoam ? '🦋' : '📌', 2);
    soundManager.playBeep(620, 0.04);
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || isSending) return;
    setInput('');
    setWhisper(null);
    setIsSending(true);
    try {
      const { state: next } = await sendBarnabyChatMessage(query, currentPath);
      setState(next);
      spawnParticles('✨', 2);
    } finally {
      setIsSending(false);
    }
  };

  const toggleSpeak = (msg: BarnabyMessage) => {
    if (playingId === msg.id) {
      stopSpeech();
      setPlayingId(null);
      return;
    }
    stopSpeech();
    setPlayingId(msg.id);
    speakBritish(msg.text, {
      speakerId: 'speaker_barnaby',
      onEnd: () => setPlayingId(null),
      onError: () => setPlayingId(null)
    });
  };

  if (isHiddenForExam || isHiddenOnRoute) return null;

  const moodMeta = MOOD_META[state.mood] || MOOD_META.happy;
  const bond = getBondStage(state.bondXp);
  const { width: vw } = getViewportBounds();
  const isOnLeftHalf = pos.x < vw / 2;

  return (
    <>
      {/* Open Companion Drawer — clean, responsive, never clipped off-screen */}
      {isOpen && (
        <div
          className={`fixed bottom-[84px] md:bottom-6 z-50 w-[calc(100vw-1.5rem)] max-w-[400px] h-[560px] max-h-[78vh] rounded-2xl bg-white dark:bg-[#11201F] border border-[#D3DDDA] dark:border-[#1E3533] shadow-2xl overflow-hidden flex flex-col animate-fade-in ${
            isOnLeftHalf ? 'left-3 md:left-6' : 'right-3 md:right-6'
          }`}
        >
          {/* Living Pet + Bond Header */}
          <div className="px-4 py-3 bg-[#0F4C45] text-white space-y-2.5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePet}
                title="Pet Barnaby!"
                className="relative shrink-0 cursor-pointer group"
              >
                <img
                  src="/barnaby-dragon-avatar.webp"
                  alt="Barnaby"
                  className={`w-11 h-11 rounded-full object-cover bg-sky-200 ring-2 ${moodMeta.ringClass} ${moodMeta.animClass}`}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/barnaby-dragon-avatar.png';
                  }}
                />
                <span className="absolute -bottom-1 -right-1 text-xs leading-none bg-white dark:bg-[#0B1514] rounded-full w-5 h-5 flex items-center justify-center shadow">
                  {moodMeta.emoji}
                </span>
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold leading-tight">Barnaby</p>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/15 text-[#F4A62A] font-bold">
                    Lv.{bond.level} {bond.title}
                  </span>
                </div>
                <p className="text-[11px] text-[#EEF3F1]/85 truncate mt-0.5">
                  {moodMeta.label} · {state.activityText}
                </p>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleRoam}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    state.freeRoam ? 'bg-white/15 text-[#F4A62A]' : 'hover:bg-white/10 text-white/75'
                  }`}
                  title={state.freeRoam ? 'Free Roam ON (click to perch still)' : 'Perched still (click to let Barnaby roam)'}
                  aria-label="Toggle Barnaby free roam"
                >
                  {state.freeRoam ? <Compass className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setState(clearBarnabyChat(currentPath))}
                  className="p-2 rounded-xl hover:bg-white/10 text-white/80 transition cursor-pointer"
                  title="Fresh conversation"
                  aria-label="Fresh conversation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    soundManager.playBeep(520, 0.04);
                  }}
                  className="p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
                  title="Minimise Barnaby"
                  aria-label="Minimise Barnaby"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bond XP Progress Bar */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-white/80">
              <span>Bond XP</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-[#F4A62A] rounded-full transition-all duration-500"
                  style={{ width: `${bond.progressPct}%` }}
                />
              </div>
              <span>{bond.currentXp} XP</span>
            </div>
          </div>

          {/* Interactive Pet & Mini-Activity Bar */}
          <div className="px-3 py-2 bg-[#F7F9F8] dark:bg-[#0D1A19] border-b border-[#D3DDDA] dark:border-[#1E3533] grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={handlePet}
              className="min-h-[38px] px-2 py-1.5 rounded-xl bg-white dark:bg-[#11201F] border border-[#D3DDDA] dark:border-[#1E3533] hover:border-rose-400 text-[11px] font-bold text-[#0E1F1E] dark:text-[#EEF3F1] flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
            >
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>Pet (+5)</span>
            </button>
            <button
              type="button"
              onClick={handleFeedTreat}
              className="min-h-[38px] px-2 py-1.5 rounded-xl bg-white dark:bg-[#11201F] border border-[#D3DDDA] dark:border-[#1E3533] hover:border-[#F4A62A] text-[11px] font-bold text-[#0E1F1E] dark:text-[#EEF3F1] flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
            >
              <Apple className="w-3.5 h-3.5 text-[#D97706] dark:text-[#F4A62A]" />
              <span>Word Treat</span>
            </button>
            <button
              type="button"
              onClick={handleStartQuiz}
              className="min-h-[38px] px-2 py-1.5 rounded-xl bg-white dark:bg-[#11201F] border border-[#D3DDDA] dark:border-[#1E3533] hover:border-[#0F4C45] text-[11px] font-bold text-[#0E1F1E] dark:text-[#EEF3F1] flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#7CD4C4]" />
              <span>15s Quiz</span>
            </button>
          </div>

          {/* Synchronized Message Stream */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 bg-[#F7F9F8] dark:bg-[#0B1514]"
          >
            {state.messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[90%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed space-y-2 ${
                    m.sender === 'user'
                      ? 'bg-[#0F4C45] text-white rounded-br-md'
                      : 'bg-white dark:bg-[#11201F] text-[#0E1F1E] dark:text-[#EEF3F1] border border-[#D3DDDA] dark:border-[#1E3533] rounded-bl-md'
                  }`}
                >
                  {m.sender === 'barnaby' && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold tracking-wide text-[#0F4C45] dark:text-[#F4A62A]">
                        <Sparkles className="w-3 h-3 text-[#F4A62A]" />
                        {m.badge || 'BARNABY'}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSpeak(m)}
                        className="p-1 rounded-lg hover:bg-[#EEF3F1] dark:hover:bg-white/10 text-[#566664] dark:text-[#9AAEA9] transition cursor-pointer"
                        title="Hear Barnaby read this"
                        aria-label="Hear Barnaby read this"
                      >
                        {playingId === m.id ? (
                          <VolumeX className="w-3.5 h-3.5 text-[#F4A62A]" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  <p className="whitespace-pre-line">{m.text}</p>

                  {/* Interactive 15s Mini Quiz */}
                  {m.quiz && (
                    <div className="space-y-1.5 pt-1">
                      {m.quiz.options.map((opt, idx) => {
                        const answered = m.quiz!.selectedIndex !== undefined;
                        const isPicked = m.quiz!.selectedIndex === idx;
                        const isRight = m.quiz!.correctIndex === idx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={answered}
                            onClick={() => handleQuizAnswer(m.id, idx)}
                            className={`w-full text-left px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer disabled:cursor-default ${
                              answered
                                ? isRight
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                                  : isPicked
                                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-700 dark:text-rose-300'
                                  : 'bg-[#F7F9F8] dark:bg-[#0B1514] border-[#D3DDDA] dark:border-[#1E3533] opacity-60'
                                : 'bg-[#F7F9F8] dark:bg-[#0B1514] border-[#D3DDDA] dark:border-[#1E3533] hover:border-[#0F4C45]'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                      {m.quiz.selectedIndex !== undefined && (
                        <div className="p-2.5 rounded-xl bg-[#0F4C45]/5 dark:bg-[#0F4C45]/20 border border-[#0F4C45]/20 text-xs space-y-1">
                          <p className="font-medium text-[#0E1F1E] dark:text-[#EEF3F1]">
                            {m.quiz.selectedIndex === m.quiz.correctIndex ? ' Spot on! (+15 XP) ' : 'Close! (+6 XP) '}
                            {m.quiz.explanationEn}
                          </p>
                          <p className="text-[#0F4C45] dark:text-[#7CD4C4] font-bengali">
                            <strong>বাংলা:</strong> {m.quiz.explanationBn}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Strategy Tip */}
                  {m.strategyTip && (
                    <div className="text-[11px] p-2 rounded-lg bg-[#FDF6E7] dark:bg-[#F4A62A]/10 text-[#66410B] dark:text-[#F9D590] border border-[#F4A62A]/30">
                      <strong>Exam Trap Tip:</strong> {m.strategyTip}
                    </div>
                  )}

                  {/* Bengali Memory Hook */}
                  {m.bengaliTip && (
                    <div className="text-[11px] p-2 rounded-lg bg-[#0F4C45]/5 dark:bg-[#0F4C45]/20 text-[#0F4C45] dark:text-[#9EBEB8] font-bengali">
                      <strong>বাংলা টিপস:</strong> {m.bengaliTip}
                    </div>
                  )}

                  {/* Academic Collocations */}
                  {m.collocations && m.collocations.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {m.collocations.map((c, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EEF3F1] dark:bg-[#1A2F2C] text-[#0F4C45] dark:text-[#9EBEB8]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Smart Guide Navigation Action */}
                  {m.suggestedAction && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onNavigate(m.suggestedAction!.route);
                      }}
                      className="w-full min-h-[36px] px-3 py-1.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold flex items-center justify-between gap-2 transition cursor-pointer"
                    >
                      <span>{m.suggestedAction.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  )}

                  {/* Helpful / Needs Work Rating Bar */}
                  {m.sender === 'barnaby' && m.id !== 'barnaby_welcome' && (
                    <div className="flex items-center justify-between pt-1.5 border-t border-[#D3DDDA]/50 dark:border-[#1E3533] text-[10px] text-[#566664] dark:text-[#9AAEA9]">
                      <span>{m.rating ? 'Thanks for rating Barnaby!' : 'Was this helpful?'}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleRate(m.id, 'up')}
                          className={`p-1 rounded-md transition cursor-pointer ${
                            m.rating === 'up'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                              : 'hover:bg-[#EEF3F1] dark:hover:bg-white/10'
                          }`}
                          aria-label="Rate helpful"
                          title="Helpful"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRate(m.id, 'down')}
                          className={`p-1 rounded-md transition cursor-pointer ${
                            m.rating === 'down'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                              : 'hover:bg-[#EEF3F1] dark:hover:bg-white/10'
                          }`}
                          aria-label="Rate needs improvement"
                          title="Could be clearer"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white dark:bg-[#11201F] border border-[#D3DDDA] dark:border-[#1E3533] text-xs text-[#566664] dark:text-[#9AAEA9]">
                  Barnaby is flapping his wings &amp; drafting your answer…
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 pt-2 pb-1 flex gap-1.5 overflow-x-auto bg-white dark:bg-[#11201F] scrollbar-none">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSend(chip)}
                className="shrink-0 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl bg-[#FDF6E7] dark:bg-[#F4A62A]/10 text-[#8A5A0A] dark:text-[#F4A62A] border border-[#F4A62A]/30 hover:bg-[#F4A62A]/20 transition cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-[#D3DDDA] dark:border-[#1E3533] bg-white dark:bg-[#11201F] flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder="Ask Barnaby (English or বাংলা)…"
              className="flex-1 min-w-0 min-h-[42px] px-3.5 py-2 rounded-xl border border-[#D3DDDA] dark:border-[#1E3533] bg-[#F7F9F8] dark:bg-[#0B1514] text-sm text-[#0E1F1E] dark:text-white placeholder:text-[#566664] focus:outline-none focus:ring-2 focus:ring-[#0F4C45]"
              aria-label="Ask Barnaby anything"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={isSending || !input.trim()}
              className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] disabled:opacity-40 text-white transition cursor-pointer"
              title="Send to Barnaby"
              aria-label="Send to Barnaby"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Free-Roaming Draggable Barnaby Pet Avatar */}
      <div
        style={{
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          transition: isDragging
            ? 'none'
            : 'left 1.35s cubic-bezier(0.22, 1, 0.36, 1), top 1.35s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
        className="fixed z-40 select-none touch-none"
      >
        {/* Floating Reaction Particles (hearts, sparkles, zzz) */}
        <div className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2">
          {particles.map((p) => (
            <span
              key={p.id}
              style={{ left: `${p.offsetX}px` }}
              className="absolute text-base animate-barnaby-particle"
            >
              {p.symbol}
            </span>
          ))}
        </div>

        {/* Contextual Pet Activity / Guide Whisper Bubble */}
        {whisper && !isOpen && !isDragging && (
          <div
            className={`absolute bottom-[66px] w-[240px] max-w-[74vw] bg-white dark:bg-[#11201F] border border-[#D3DDDA] dark:border-[#1E3533] rounded-2xl shadow-xl px-3.5 py-2.5 animate-fade-in ${
              isOnLeftHalf ? 'left-0 rounded-bl-sm' : 'right-0 rounded-br-sm'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs leading-snug text-[#0E1F1E] dark:text-[#EEF3F1]">
                {whisper.text}
              </p>
              <button
                type="button"
                onClick={() => setWhisper(null)}
                className="p-0.5 rounded-lg hover:bg-[#EEF3F1] dark:hover:bg-white/10 text-[#566664] cursor-pointer shrink-0"
                aria-label="Dismiss Barnaby whisper"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {whisper.action && (
              <button
                type="button"
                onClick={() => {
                  setWhisper(null);
                  onNavigate(whisper.action!.route);
                }}
                className="mt-2 text-[11px] font-bold text-[#0F4C45] dark:text-[#F4A62A] flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>{whisper.action.label}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Draggable Living Dragon Button */}
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handlePet}
          className={`relative w-[54px] h-[54px] md:w-[60px] md:h-[60px] rounded-full shadow-lg ring-2 ${
            isOpen ? 'ring-[#0F4C45]' : moodMeta.ringClass
          } ${isDragging ? 'scale-110 cursor-grabbing shadow-2xl' : `${moodMeta.animClass} cursor-grab hover:scale-105`} transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F4A62A]`}
          title={
            isOpen
              ? 'Close Barnaby'
              : `Barnaby (${moodMeta.label}) — Tap to chat, double-tap to pet, drag to move anywhere!`
          }
          aria-label={isOpen ? 'Close Barnaby' : 'Chat with Barnaby'}
        >
          {isOpen ? (
            <span className="w-full h-full rounded-full bg-[#0F4C45] text-white flex items-center justify-center">
              <X className="w-5 h-5" />
            </span>
          ) : (
            <>
              <img
                src="/barnaby-dragon-avatar.webp"
                alt="Barnaby — your free-roaming AI study pet & tutor"
                draggable={false}
                className="w-full h-full rounded-full object-cover bg-sky-200 pointer-events-none"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/barnaby-dragon-avatar.png';
                }}
              />
              {/* Expressive Mood Badge */}
              <span
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1E3533] text-[11px] flex items-center justify-center shadow-sm pointer-events-none"
                aria-hidden="true"
              >
                {moodMeta.emoji}
              </span>
            </>
          )}
        </button>
      </div>
    </>
  );
};
