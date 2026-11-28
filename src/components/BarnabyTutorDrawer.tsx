import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  Check,
  Clock,
  Eye,
  HelpCircle,
  Loader2,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { BarnabyPoseState } from '../utils/getBarnabyState';
import {
  poseToDefaultExpression,
  triggerBarnabyCelebration,
} from '../utils/barnabyStateEngine';
import { askBarnabyCompanion, enforceBarnabyCompanionConstraints } from '../services/geminiService';
import {
  BarnabyActiveScreenContext,
  BarnabyProgressionSnapshot,
  detectEmotionalCueFromMessage,
  getBarnabyProgressionSnapshot,
  getBarnabyScreenContext,
  recordBarnabyMilestone,
} from '../services/barnabyBrain';
import { BARNABY_CORE_TAGLINE } from '../types/barnaby';
import { BarnabyCrest } from './common/BarnabyCrest';
import { BarnabyRig } from './BarnabyRig';
import { soundManager } from '../utils/audioEffects';
import { speakBritish, stopSpeech } from '../utils/britishVoice';
import { recordSpokenWarmupComplete } from '../services/streakService';
import {
  ACHIEVEMENTS_SAVED_EVENT,
  loadAchievementsState,
} from '../services/achievementService';
import {
  BARNABY_FLAIRS,
  BarnabyFlairId,
  isBarnabyFlairUnlocked,
  loadSelectedBarnabyFlair,
  saveSelectedBarnabyFlair,
} from '../utils/barnabyFlair';

export type BarnabyDrawerTab = 'coach' | 'warmup' | 'flair';

export interface BarnabyTutorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  userName?: string;
  currentEstimate: number | null;
  targetBand: number;
  examMode?: 'Academic' | 'General Training';
  topWeakness?: string | null;
  screenContextOverride?: Partial<BarnabyActiveScreenContext>;
  initialTab?: BarnabyDrawerTab;
}

interface DrawerMessage {
  id: string;
  role: 'user' | 'barnaby';
  text: string;
  strategyTip?: string;
  suggestedNextAction?: { label: string; route: string };
  isSocraticHint?: boolean;
  originalQuestion?: string;
}

interface WarmupTurn {
  prompt: string;
  answer: string;
  feedback: string;
}

const WARMUP_PROMPTS = [
  'What part of your daily routine helps you stay focused when you have a busy week?',
  'Do you prefer studying in a quiet library or somewhere with light background noise, and why?',
  'Describe a small skill you would like to improve over the next few months.',
];

function getQuickPromptsForScreen(
  screen: BarnabyActiveScreenContext['screen'],
  topWeakness?: string | null
): string[] {
  const weaknessLabel = topWeakness || 'my weakest skill';
  if (screen === 'learn') {
    return [
      `Which deck helps most with ${weaknessLabel}?`,
      'Explain how to spot paraphrase traps in IELTS Reading.',
      'I feel tired today—give me a light 5-minute study win.',
    ];
  }
  if (screen === 'progress') {
    return [
      'Interpret my band progress honestly.',
      `How do I move ${weaknessLabel} up by 0.5 band?`,
      'Should I take a full mock test next or drill one skill?',
    ];
  }
  return [
    `Give me a 10-minute plan for ${weaknessLabel}.`,
    'Explain True / False / Not Given traps simply.',
    'I feel overwhelmed—break today into one 5-minute step.',
  ];
}

export const BarnabyTutorDrawer: React.FC<BarnabyTutorDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
  userName = 'Candidate',
  currentEstimate,
  targetBand,
  examMode = 'Academic',
  topWeakness = null,
  screenContextOverride,
  initialTab = 'coach',
}) => {
  const [activeTab, setActiveTab] = useState<BarnabyDrawerTab>(initialTab);
  const [socraticMode, setSocraticMode] = useState(true);
  const [input, setInput] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [pose, setPose] = useState<BarnabyPoseState>('studying');
  const [progression, setProgression] = useState<BarnabyProgressionSnapshot>(() =>
    getBarnabyProgressionSnapshot()
  );
  const [messages, setMessages] = useState<DrawerMessage[]>([]);
  const [spokenMessageId, setSpokenMessageId] = useState<string | null>(null);
  const [spokenMessageText, setSpokenMessageText] = useState<string | null>(null);
  const [speakSignal, setSpeakSignal] = useState(0);
  const [stopSpeakSignal, setStopSpeakSignal] = useState(0);
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [speakAloudEnabled, setSpeakAloudEnabled] = useState(false);

  // 60-Second Spoken Warm-Up Micro-Call state
  const [warmupActive, setWarmupActive] = useState(false);
  const [warmupSecondsLeft, setWarmupSecondsLeft] = useState(60);
  const [warmupStep, setWarmupStep] = useState(0);
  const [warmupDraft, setWarmupDraft] = useState('');
  const [warmupTurns, setWarmupTurns] = useState<WarmupTurn[]>([]);
  const [warmupEvaluating, setWarmupEvaluating] = useState(false);
  const [warmupComplete, setWarmupComplete] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Flair Locker state
  const [selectedFlair, setSelectedFlair] = useState<BarnabyFlairId>(() =>
    loadSelectedBarnabyFlair()
  );
  const [unlockedBadgesMap, setUnlockedBadgesMap] = useState<Record<string, number>>(
    () => loadAchievementsState().unlockedAtById
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync activeTab when drawer opens with a requested initialTab
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setUnlockedBadgesMap(loadAchievementsState().unlockedAtById);
      setSelectedFlair(loadSelectedBarnabyFlair());
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const syncAchievements = () => {
      setUnlockedBadgesMap(loadAchievementsState().unlockedAtById);
      setSelectedFlair(loadSelectedBarnabyFlair());
    };
    window.addEventListener(ACHIEVEMENTS_SAVED_EVENT, syncAchievements);
    return () => window.removeEventListener(ACHIEVEMENTS_SAVED_EVENT, syncAchievements);
  }, []);

  // Countdown timer during active 60-second spoken warm-up
  useEffect(() => {
    if (!warmupActive || warmupComplete || !isOpen) return;
    if (warmupSecondsLeft <= 0) {
      finishWarmupCall();
      return;
    }
    const id = window.setInterval(() => {
      setWarmupSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [warmupActive, warmupComplete, warmupSecondsLeft, isOpen]);

  // Stop mic & speech cleanly on unmount / close
  useEffect(() => {
    if (!isOpen) {
      stopWarmupMic();
      stopSpeech();
    }
  }, [isOpen]);

  const stopWarmupMic = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListeningMic(false);
  };

  const handleToggleMessageAudio = (msgId: string, text: string) => {
    if (isAvatarSpeaking && spokenMessageId === msgId) {
      setStopSpeakSignal((n) => n + 1);
      setSpokenMessageId(null);
      return;
    }
    setSpokenMessageId(msgId);
    setSpokenMessageText(text);
    setSpeakSignal((n) => n + 1);
  };

  const handleToggleSpeakAloudMode = () => {
    if (speakAloudEnabled) {
      setSpeakAloudEnabled(false);
      setStopSpeakSignal((n) => n + 1);
      setSpokenMessageId(null);
      return;
    }
    setSpeakAloudEnabled(true);
    const latestBarnabyMsg = [...messages].reverse().find((m) => m.role === 'barnaby');
    if (latestBarnabyMsg) {
      setSpokenMessageId(latestBarnabyMsg.id);
      setSpokenMessageText(latestBarnabyMsg.text);
      setSpeakSignal((n) => n + 1);
    }
  };

  const mergedContext: BarnabyActiveScreenContext = {
    ...getBarnabyScreenContext(),
    ...screenContextOverride,
    topWeakness: screenContextOverride?.topWeakness ?? topWeakness ?? getBarnabyScreenContext().topWeakness,
    currentEstimate: currentEstimate ?? getBarnabyScreenContext().currentEstimate ?? null,
    targetBand,
    examMode,
  };

  // Refresh progression + greeting when drawer opens
  useEffect(() => {
    if (!isOpen) return;
    const snap = getBarnabyProgressionSnapshot();
    setProgression(snap);
    setPose(mergedContext.screen === 'progress' ? 'analyzing' : 'studying');

    setMessages((prev) => {
      if (prev.length > 0) return prev;
      const firstName = (userName || 'Candidate').trim().split(/\s+/)[0] || 'Candidate';
      const contextDetail = mergedContext.essayDraft
        ? 'I have your active Writing draft in view.'
        : mergedContext.passageSnippet
        ? 'I have your current passage context loaded.'
        : mergedContext.topWeakness
        ? `I have your priority focus (${mergedContext.topWeakness}) and recent mistakes loaded.`
        : `I have your Band ${targetBand.toFixed(1)} ${examMode} plan loaded.`;

      return [
        {
          id: 'barnaby-intro',
          role: 'barnaby',
          text: enforceBarnabyCompanionConstraints(
            `Hello ${firstName}. ${contextDetail} Socratic Hinting is active so I will nudge you toward the clue first—or switch it off anytime for direct walkthroughs.`
          ),
        },
      ];
    });

    if (initialTab === 'coach') {
      const timer = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close cleanly on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isReplying, warmupTurns]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('bandsprint_barnaby_speaking', {
        detail: { speaking: Boolean(isOpen && isAvatarSpeaking) },
      })
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent('bandsprint_barnaby_speaking', {
          detail: { speaking: false },
        })
      );
    };
  }, [isAvatarSpeaking, isOpen]);

  if (!isOpen) return null;

  const quickPrompts = getQuickPromptsForScreen(mergedContext.screen, mergedContext.topWeakness);

  const handleSendMessage = async (
    rawText?: string,
    options?: { forceDirectWalkthrough?: boolean }
  ) => {
    const query = (rawText ?? input).trim();
    if (!query || isReplying) return;

    const useSocratic = options?.forceDirectWalkthrough ? false : socraticMode;

    soundManager.playBeep(560, 0.035);
    const cue = detectEmotionalCueFromMessage(query);
    const userMsg: DrawerMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: options?.forceDirectWalkthrough ? `Reveal full walkthrough: ${query}` : query,
    };

    const nextHistory = messages.slice(-8).map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('model' as const),
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    if (!rawText) setInput('');
    setIsReplying(true);
    setPose('analyzing');

    try {
      const updatedSnap = recordBarnabyMilestone('tutor_question_asked');
      setProgression(updatedSnap);

      const response = await askBarnabyCompanion({
        message: options?.forceDirectWalkthrough
          ? `Now provide the complete, direct Band 8.0+ walkthrough for: ${query}`
          : query,
        history: nextHistory,
        context: {
          module: mergedContext.screen,
          currentActivity: mergedContext.screenTitle,
          currentPage: mergedContext.route,
          userName,
          targetBand,
          examMode,
          daysUntilExam: mergedContext.daysRemaining ?? null,
          latestVerifiedOverallBand: currentEstimate,
          weakestSkill: mergedContext.topWeakness || '',
          mistakeCount: mergedContext.mistakeCount ?? 0,
          topMistake: mergedContext.mistakeSummary || '',
          currentQuestion: mergedContext.activeQuestion || '',
          passageSnippet: mergedContext.passageSnippet || '',
          essayDraft: mergedContext.essayDraft || '',
          bandTrendSummary: mergedContext.bandTrendSummary || '',
          bondStage: `Stage ${updatedSnap.stage}: ${updatedSnap.title}`,
          emotionalState: cue,
          socraticMode: useSocratic,
          spokenWarmupMode: false,
        },
      });

      const resolvedPose: BarnabyPoseState =
        cue === 'overwhelmed_or_tired' || cue === 'repeated_mistakes'
          ? 'encouraging'
          : cue === 'genuine_achievement'
          ? 'celebrating'
          : 'studying';
      setPose(resolvedPose);

      const replyId = `b-${Date.now()}`;
      const replyText = enforceBarnabyCompanionConstraints(response.reply);
      setMessages((prev) => [
        ...prev,
        {
          id: replyId,
          role: 'barnaby',
          text: replyText,
          strategyTip: response.strategyTip
            ? enforceBarnabyCompanionConstraints(response.strategyTip)
            : undefined,
          suggestedNextAction: response.suggestedNextAction,
          isSocraticHint: useSocratic,
          originalQuestion: query,
        },
      ]);

      if (speakAloudEnabled) {
        setSpokenMessageId(replyId);
        setSpokenMessageText(replyText);
        setSpeakSignal((n) => n + 1);
      }
    } catch {
      setPose('encouraging');
      setMessages((prev) => [
        ...prev,
        {
          id: `b-err-${Date.now()}`,
          role: 'barnaby',
          text:
            cue === 'overwhelmed_or_tired'
              ? 'Take a breath and keep today small. Pick one 5-minute vocabulary or mistake review item, then step away cleanly.'
              : 'I could not reach the live tutor connection right now. Try sending that again in a moment, or jump straight into one focused practice block.',
        },
      ]);
    } finally {
      setIsReplying(false);
    }
  };

  // --- 60-Second Spoken Warm-Up Helpers ---
  const playWarmupPromptAudio = (text: string) => {
    setIsAvatarSpeaking(true);
    speakBritish(text, {
      speakerId: 'speaker_barnaby',
      deliveryProfile: 'barnaby_companion',
      onEnd: () => setIsAvatarSpeaking(false),
      onError: () => setIsAvatarSpeaking(false),
    });
  };

  const startWarmupCall = () => {
    soundManager.playBeep(620, 0.05);
    setWarmupActive(true);
    setWarmupComplete(false);
    setWarmupSecondsLeft(60);
    setWarmupStep(0);
    setWarmupTurns([]);
    setWarmupDraft('');
    setSpeechNotice(null);
    setPose('studying');
    playWarmupPromptAudio(WARMUP_PROMPTS[0]);
  };

  const finishWarmupCall = () => {
    stopWarmupMic();
    setWarmupActive(false);
    setWarmupComplete(true);
    setPose('celebrating');
    recordSpokenWarmupComplete();
    triggerBarnabyCelebration('spoken_warmup_complete');
    soundManager.playBeep(780, 0.08);
  };

  const toggleWarmupMicrophone = () => {
    if (isListeningMic) {
      stopWarmupMic();
      return;
    }
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechNotice('Voice capture is unavailable in this browser—type your spoken answer below.');
      return;
    }
    setSpeechNotice(null);
    stopSpeech();
    const recognition = new SpeechRec();
    recognition.lang = 'en-GB';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0]?.transcript || '';
      }
      setWarmupDraft(transcript.trim());
    };
    recognition.onerror = () => {
      setIsListeningMic(false);
      setSpeechNotice('Microphone paused. You can tap the mic again or type your reply.');
    };
    recognition.onend = () => {
      setIsListeningMic(false);
    };
    recognitionRef.current = recognition;
    setIsListeningMic(true);
    try {
      recognition.start();
    } catch {
      setIsListeningMic(false);
    }
  };

  const handleSubmitWarmupReply = async () => {
    const answer = warmupDraft.trim();
    if (!answer || warmupEvaluating) return;
    stopWarmupMic();
    setWarmupEvaluating(true);
    setPose('analyzing');

    const currentPrompt = WARMUP_PROMPTS[warmupStep] || WARMUP_PROMPTS[0];
    let feedbackText = 'Good momentum—aim to add one specific example and a natural discourse marker.';
    try {
      const res = await askBarnabyCompanion({
        message: `Spoken Warm-Up Question: "${currentPrompt}"\nCandidate Spoken Answer: "${answer}"`,
        context: {
          module: 'speaking',
          currentActivity: '60-Second Spoken Warm-Up',
          userName,
          targetBand,
          examMode,
          spokenWarmupMode: true,
          socraticMode: false,
        },
      });
      if (res.reply) {
        feedbackText = enforceBarnabyCompanionConstraints(res.reply);
      }
    } catch {
      // Keep calm built-in fallback feedback
    }

    const nextTurns = [
      ...warmupTurns,
      { prompt: currentPrompt, answer, feedback: feedbackText },
    ];
    setWarmupTurns(nextTurns);
    setWarmupDraft('');
    setWarmupEvaluating(false);

    if (warmupStep + 1 >= WARMUP_PROMPTS.length) {
      finishWarmupCall();
      playWarmupPromptAudio(`${feedbackText} Warm-up complete—plus 15 XP logged.`);
    } else {
      const nextIndex = warmupStep + 1;
      setWarmupStep(nextIndex);
      setPose('studying');
      playWarmupPromptAudio(`${feedbackText} Next question: ${WARMUP_PROMPTS[nextIndex]}`);
    }
  };

  const handleEquipFlair = (flairId: BarnabyFlairId) => {
    if (!isBarnabyFlairUnlocked(flairId, unlockedBadgesMap)) return;
    soundManager.playBeep(680, 0.05);
    const saved = saveSelectedBarnabyFlair(flairId);
    setSelectedFlair(saved);
    setPose('celebrating');
  };

  const drawerExpression =
    isReplying || warmupEvaluating ? 'analytical' : poseToDefaultExpression(pose);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Ask Barnaby IELTS Tutor Drawer"
      data-testid="barnaby-tutor-drawer"
      data-barnaby-mode="companion"
    >
      {/* Clean Subtle Backdrop */}
      <button
        type="button"
        aria-label="Close Ask Barnaby drawer"
        onClick={onClose}
        className="fixed inset-0 bg-[#0E1F1E]/35 dark:bg-black/60 backdrop-blur-[2px] cursor-pointer"
      />

      {/* Non-Overlapping Slide-Over Panel */}
      <aside className="relative z-10 w-full max-w-md h-full bg-white dark:bg-[#0D1A19] border-l border-[#134E41]/15 dark:border-[#1F8A70]/35 flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <header className="px-5 py-4 border-b border-[#134E41]/15 dark:border-[#1F8A70]/30 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-16 h-16 rounded-xl bg-transparent flex items-center justify-center shrink-0 overflow-visible p-0.5">
              <BarnabyRig
                expression={drawerExpression}
                mode={pose === 'celebrating' ? 'celebration' : 'companion'}
                animationState={
                  isReplying || warmupEvaluating
                    ? 'focused'
                    : pose === 'celebrating'
                    ? 'celebratory'
                    : isAvatarSpeaking
                    ? 'speaking'
                    : 'idle'
                }
                moodState={
                  isReplying || warmupEvaluating
                    ? 'focused'
                    : pose === 'celebrating'
                    ? 'celebratory'
                    : 'neutral'
                }
                spokenText={spokenMessageText}
                speakSignal={speakSignal}
                stopSpeakSignal={stopSpeakSignal}
                enableVoiceCues={false}
                onSpeakingChange={(speaking) => {
                  setIsAvatarSpeaking(speaking);
                  if (!speaking) setSpokenMessageId(null);
                }}
                isSpeaking={isReplying || isAvatarSpeaking}
                interactive
                canvasClassName="w-full h-full pointer-events-none select-none"
                testId="barnaby-drawer-rig"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1] truncate">
                  Ask Barnaby
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B45309] dark:text-[#FBBF24] whitespace-nowrap">
                  <BarnabyCrest size={14} variant="inline" animated={pose === 'celebrating'} />
                  <span>
                    Stage {progression.stage} · {progression.title}
                  </span>
                </span>
              </div>
              <p className="text-[11px] text-[#566664] dark:text-slate-400 truncate mt-0.5">
                Context: {mergedContext.screenTitle}
                {mergedContext.topWeakness ? ` · Focus: ${mergedContext.topWeakness}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {activeTab === 'coach' && (
              <button
                type="button"
                data-testid="barnaby-speak-aloud-toggle"
                aria-pressed={speakAloudEnabled}
                onClick={handleToggleSpeakAloudMode}
                title={speakAloudEnabled ? 'Turn off Speak Aloud' : 'One-tap Speak Aloud'}
                className={`inline-flex items-center gap-1 px-2.5 h-9 rounded-xl text-[11px] font-semibold border transition cursor-pointer ${
                  speakAloudEnabled
                    ? 'bg-[#134E41] text-white border-[#134E41] shadow-xs'
                    : 'bg-[#F4F7F6] dark:bg-[#11201E] text-[#0E1F1E] dark:text-[#EEF3F1] border-[#134E41]/15 hover:bg-[#E5ECEA] dark:hover:bg-[#18302C]'
                }`}
              >
                {speakAloudEnabled || isAvatarSpeaking ? (
                  <Volume2 className="w-3.5 h-3.5 text-[#F59E0B]" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-[#566664] dark:text-slate-400" />
                )}
                <span className="hidden sm:inline">Voice</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Barnaby drawer"
              className="w-9 h-9 rounded-xl bg-[#F4F7F6] dark:bg-[#11201E] hover:bg-[#E5ECEA] dark:hover:bg-[#18302C] text-[#0E1F1E] dark:text-[#EEF3F1] flex items-center justify-center transition cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 3-Mode Segmented Tab Switcher (Coach / 60s Warm-Up / Flair Locker) */}
        <nav
          aria-label="Barnaby Modes"
          className="px-5 py-2.5 border-b border-[#134E41]/10 dark:border-[#1F8A70]/25 bg-[#F4F7F6] dark:bg-[#11201E] flex items-center gap-1.5 shrink-0"
        >
          {(
            [
              { id: 'coach', label: 'Coach', icon: MessageSquare },
              { id: 'warmup', label: '60s Warm-Up', icon: Mic },
              { id: 'flair', label: 'Flair Locker', icon: Award },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`barnaby-tab-${tab.id}`}
                onClick={() => {
                  soundManager.playBeep(520, 0.03);
                  setActiveTab(tab.id);
                }}
                className={`flex-1 min-h-[34px] px-2.5 py-1.5 rounded-xl text-[11px] font-semibold inline-flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#0F4C45] text-white shadow-xs'
                    : 'bg-white/70 dark:bg-[#0B1514] text-[#566664] dark:text-slate-300 hover:text-[#0E1F1E] dark:hover:text-white border border-[#134E41]/12 dark:border-[#1F8A70]/25'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* TAB 1: SOCRATIC & DIRECT COACH */}
        {activeTab === 'coach' && (
          <>
            {/* Context + Socratic Hinting Toggle Strip */}
            <div className="px-5 py-2.5 bg-white dark:bg-[#0D1A19] border-b border-[#134E41]/10 dark:border-[#1F8A70]/20 text-[11px] text-[#566664] dark:text-slate-300 space-y-2 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="tabular-nums">
                  Target <strong className="text-[#0E1F1E] dark:text-white">{targetBand.toFixed(1)}</strong> ·{' '}
                  {currentEstimate !== null ? `Current ${currentEstimate.toFixed(1)}` : 'Not assessed'}
                </span>
                <button
                  type="button"
                  data-testid="barnaby-socratic-toggle"
                  aria-pressed={socraticMode}
                  onClick={() => {
                    soundManager.playBeep(540, 0.03);
                    setSocraticMode((prev) => !prev);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                    socraticMode
                      ? 'bg-[#0F4C45]/10 dark:bg-[#1F8A70]/20 border-[#0F4C45]/30 dark:border-[#1F8A70]/45 text-[#0F4C45] dark:text-[#6EE7B7]'
                      : 'bg-[#F4F7F6] dark:bg-[#11201E] border-[#134E41]/15 text-[#566664] dark:text-slate-400'
                  }`}
                >
                  <HelpCircle className="w-3 h-3 text-[#F4A62A]" />
                  <span>Socratic Hinting: {socraticMode ? 'ON' : 'Direct'}</span>
                </button>
              </div>
              {currentEstimate === null && (
                <p className="text-[11px] italic text-[#134E41]/80 dark:text-[#6EE7B7]/85">
                  {BARNABY_CORE_TAGLINE}
                </p>
              )}
            </div>

            {/* Message Stream */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 min-h-0">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed space-y-2 ${
                      msg.role === 'user'
                        ? 'bg-[#134E41] text-white'
                        : 'bg-[#F4F7F6] dark:bg-[#11201E] text-[#0E1F1E] dark:text-[#EEF3F1] border border-[#134E41]/12 dark:border-[#1F8A70]/25'
                    }`}
                  >
                    {msg.role === 'barnaby' && msg.isSocraticHint && (
                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#9A630B] dark:text-[#F4A62A]">
                        Socratic Nudge
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.role === 'barnaby' && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                        {msg.isSocraticHint && msg.originalQuestion ? (
                          <button
                            type="button"
                            disabled={isReplying}
                            onClick={() =>
                              handleSendMessage(msg.originalQuestion, {
                                forceDirectWalkthrough: true,
                              })
                            }
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0F4C45] dark:text-[#6EE7B7] hover:underline cursor-pointer disabled:opacity-50"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Reveal Full Walkthrough</span>
                          </button>
                        ) : (
                          <span />
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleMessageAudio(msg.id, msg.text)}
                          aria-label={
                            isAvatarSpeaking && spokenMessageId === msg.id
                              ? 'Stop reading'
                              : 'Read reply aloud'
                          }
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#566664] hover:text-[#134E41] dark:text-slate-400 dark:hover:text-[#6EE7B7] transition-colors cursor-pointer"
                        >
                          {isAvatarSpeaking && spokenMessageId === msg.id ? (
                            <>
                              <VolumeX className="w-3 h-3" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3 h-3" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    {msg.strategyTip && (
                      <div className="pt-2 border-t border-[#134E41]/12 dark:border-[#1F8A70]/25 text-[11px] text-[#566664] dark:text-slate-300">
                        <span className="font-semibold text-[#134E41] dark:text-[#6EE7B7]">
                          Strategy note:{' '}
                        </span>
                        {msg.strategyTip}
                      </div>
                    )}
                    {msg.suggestedNextAction?.route && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigate(msg.suggestedNextAction!.route);
                        }}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#134E41] dark:text-[#FBBF24] hover:underline cursor-pointer pt-0.5"
                      >
                        <span>{msg.suggestedNextAction.label}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {isReplying && (
                <div className="flex items-center gap-2 text-xs text-[#566664] dark:text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#134E41] dark:text-[#FBBF24]" />
                  <span>Barnaby is analyzing your question...</span>
                </div>
              )}

              {/* Contextual Quick Prompts */}
              {messages.length <= 2 && !isReplying && (
                <div className="pt-2 space-y-2">
                  <div className="text-[11px] font-semibold text-[#566664] dark:text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>Quick questions for this screen</span>
                  </div>
                  <div className="space-y-1.5">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSendMessage(prompt)}
                        className="w-full text-left px-3 py-2 rounded-xl bg-white dark:bg-[#11201E] hover:bg-[#F4F7F6] dark:hover:bg-[#17302C] border border-[#134E41]/15 dark:border-[#1F8A70]/30 text-xs text-[#0E1F1E] dark:text-[#EEF3F1] transition cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-4 border-t border-[#134E41]/15 dark:border-[#1F8A70]/30 bg-white dark:bg-[#0D1A19] flex items-center gap-2 shrink-0"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  socraticMode
                    ? 'Ask a question for a Socratic clue...'
                    : 'Ask for a direct Band 8 walkthrough...'
                }
                className="flex-1 min-w-0 min-h-[42px] px-3.5 py-2 rounded-xl bg-[#F4F7F6] dark:bg-[#11201E] border border-[#134E41]/15 dark:border-[#1F8A70]/30 text-xs text-[#0E1F1E] dark:text-[#EEF3F1] placeholder:text-[#566664]/75 focus:outline-none focus:border-[#134E41]"
              />
              <button
                type="submit"
                disabled={isReplying || !input.trim()}
                aria-label="Send message to Barnaby"
                className="min-w-[42px] min-h-[42px] rounded-xl bg-[#134E41] hover:bg-[#0D3A30] disabled:opacity-50 text-white flex items-center justify-center transition cursor-pointer shrink-0"
              >
                {isReplying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </>
        )}

        {/* TAB 2: 60-SECOND SPOKEN WARM-UP MICRO-CALL */}
        {activeTab === 'warmup' && (
          <div
            data-testid="barnaby-voice-warmup"
            className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0"
          >
            <div className="p-4 rounded-2xl bg-[#F4F7F6] dark:bg-[#11201E] border border-[#134E41]/15 dark:border-[#1F8A70]/30 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-bold text-[#0E1F1E] dark:text-white">
                  60-Second Spoken Warm-Up
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#0F4C45] dark:text-[#6EE7B7] tabular-nums">
                  <Clock className="w-3.5 h-3.5 text-[#F4A62A]" />
                  <span>{warmupSecondsLeft}s</span>
                </span>
              </div>
              <p className="text-xs text-[#566664] dark:text-slate-300 leading-relaxed">
                Three brisk Part 1 speaking prompts with live British RP audio and 1-sentence
                lexical upgrades from Barnaby. Earns <strong>+15 XP</strong> toward your streak.
              </p>

              {!warmupActive && !warmupComplete && (
                <button
                  type="button"
                  data-testid="start-barnaby-warmup-btn"
                  onClick={startWarmupCall}
                  className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0D3A30] text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Mic className="w-4 h-4 text-[#F4A62A]" />
                  <span>Start 60-Second Warm-Up</span>
                </button>
              )}

              {warmupComplete && (
                <div className="p-3 rounded-xl bg-[#0F4C45]/10 dark:bg-[#1F8A70]/20 border border-[#0F4C45]/25 dark:border-[#1F8A70]/40 space-y-2">
                  <div className="text-xs font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
                    Warm-Up Complete · +15 XP Logged
                  </div>
                  <p className="text-[11px] text-[#566664] dark:text-slate-300">
                    Your articulation is warmed up and your daily streak progress is updated.
                  </p>
                  <button
                    type="button"
                    onClick={startWarmupCall}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0F4C45] dark:text-[#F4A62A] hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Run Another 60s Call</span>
                  </button>
                </div>
              )}
            </div>

            {/* Active Prompt Card */}
            {warmupActive && !warmupComplete && (
              <div className="p-4 rounded-2xl bg-white dark:bg-[#11201E] border border-[#0F4C45]/25 dark:border-[#1F8A70]/40 space-y-3">
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#566664] dark:text-slate-400">
                  <span>
                    Prompt {warmupStep + 1} of {WARMUP_PROMPTS.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => playWarmupPromptAudio(WARMUP_PROMPTS[warmupStep])}
                    className="inline-flex items-center gap-1 text-[#0F4C45] dark:text-[#6EE7B7] font-semibold hover:underline cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Replay RP Voice</span>
                  </button>
                </div>

                <p className="text-sm font-semibold text-[#0E1F1E] dark:text-white leading-snug">
                  &ldquo;{WARMUP_PROMPTS[warmupStep]}&rdquo;
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleWarmupMicrophone}
                    className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                      isListeningMic
                        ? 'bg-rose-600 text-white'
                        : 'bg-[#EEF3F1] dark:bg-[#0B1514] text-[#0F4C45] dark:text-[#6EE7B7] border border-[#134E41]/20'
                    }`}
                  >
                    {isListeningMic ? (
                      <>
                        <MicOff className="w-3.5 h-3.5" />
                        <span>Stop Mic</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5" />
                        <span>Speak Answer</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={finishWarmupCall}
                    className="text-[11px] font-semibold text-[#566664] dark:text-slate-400 hover:underline cursor-pointer ml-auto"
                  >
                    Finish Early
                  </button>
                </div>

                {speechNotice && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">{speechNotice}</p>
                )}

                <textarea
                  rows={3}
                  value={warmupDraft}
                  onChange={(e) => setWarmupDraft(e.target.value)}
                  placeholder="Speak using the mic or type 1–2 spoken sentences..."
                  className="w-full p-3 rounded-xl bg-[#F4F7F6] dark:bg-[#0B1514] border border-[#134E41]/15 dark:border-[#1F8A70]/30 text-xs text-[#0E1F1E] dark:text-[#EEF3F1] focus:outline-none focus:border-[#0F4C45]"
                />

                <button
                  type="button"
                  disabled={warmupEvaluating || !warmupDraft.trim()}
                  onClick={handleSubmitWarmupReply}
                  className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0D3A30] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {warmupEvaluating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Barnaby is grading your phrasing...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Spoken Turn</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Completed Turn Feedback Log */}
            {warmupTurns.length > 0 && (
              <div className="space-y-2.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#566664] dark:text-slate-400">
                  Live Phrasing Feedback
                </div>
                {warmupTurns.map((turn, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#F4F7F6] dark:bg-[#11201E] border border-[#134E41]/12 dark:border-[#1F8A70]/25 space-y-1.5 text-xs"
                  >
                    <div className="text-[11px] text-[#566664] dark:text-slate-400">
                      Q{idx + 1}: {turn.prompt}
                    </div>
                    <div className="text-[#0E1F1E] dark:text-white italic">
                      &ldquo;{turn.answer}&rdquo;
                    </div>
                    <div className="pt-1 border-t border-[#134E41]/10 dark:border-[#1F8A70]/20 text-[11px] text-[#0F4C45] dark:text-[#6EE7B7]">
                      <strong>Barnaby:</strong> {turn.feedback}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ACHIEVEMENT FLAIR LOCKER */}
        {activeTab === 'flair' && (
          <div
            data-testid="barnaby-flair-locker"
            className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0"
          >
            <div className="space-y-1">
              <h3 className="font-display text-sm font-bold text-[#0E1F1E] dark:text-white">
                Barnaby Academic Flair Locker
              </h3>
              <p className="text-xs text-[#566664] dark:text-slate-400 leading-relaxed">
                Unlock real scholarly emblems for Barnaby by earning BandSprint Achievements.
              </p>
            </div>

            <div className="space-y-2.5">
              {BARNABY_FLAIRS.map((item) => {
                const unlocked = isBarnabyFlairUnlocked(item.id, unlockedBadgesMap);
                const equipped = selectedFlair === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => handleEquipFlair(item.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                      equipped
                        ? 'bg-[#0F4C45]/10 dark:bg-[#1F8A70]/20 border-[#0F4C45] dark:border-[#6EE7B7] cursor-pointer'
                        : unlocked
                        ? 'bg-[#F4F7F6] dark:bg-[#11201E] border-[#134E41]/15 dark:border-[#1F8A70]/30 hover:border-[#0F4C45] cursor-pointer'
                        : 'bg-[#F7F9F8]/60 dark:bg-[#0B1514]/70 border-[#D3DDDA]/60 dark:border-[#1F8A70]/15 opacity-65 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 mt-0.5"
                        style={{ backgroundColor: unlocked ? item.accentHex : '#64748B' }}
                      >
                        {unlocked ? (
                          <Award className="w-4 h-4" />
                        ) : (
                          <Lock className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#0E1F1E] dark:text-white">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-[#566664] dark:text-slate-400 mt-0.5">
                          {item.unlockHint}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-[11px] font-bold">
                      {equipped ? (
                        <span className="inline-flex items-center gap-1 text-[#0F4C45] dark:text-[#6EE7B7]">
                          <Check className="w-3.5 h-3.5" />
                          <span>Equipped</span>
                        </span>
                      ) : unlocked ? (
                        <span className="text-[#566664] dark:text-slate-300">Equip</span>
                      ) : (
                        <span className="text-slate-400">Locked</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
