import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2, Send, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { BarnabyPoseState } from '../utils/getBarnabyState';
import { poseToDefaultExpression } from '../utils/barnabyStateEngine';
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
}

interface DrawerMessage {
  id: string;
  role: 'user' | 'barnaby';
  text: string;
  strategyTip?: string;
  suggestedNextAction?: { label: string; route: string };
}

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
}) => {
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
            `Hello ${firstName}. ${contextDetail} Ask anything about traps, scoring criteria, or your next concrete step.`
          ),
        },
      ];
    });

    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
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
  }, [messages, isReplying]);

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

  const handleSendMessage = async (rawText?: string) => {
    const query = (rawText ?? input).trim();
    if (!query || isReplying) return;

    soundManager.playBeep(560, 0.035);
    const cue = detectEmotionalCueFromMessage(query);
    const userMsg: DrawerMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: query,
    };

    const nextHistory = messages.slice(-8).map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('model' as const),
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsReplying(true);
    setPose('analyzing');

    try {
      const updatedSnap = recordBarnabyMilestone('tutor_question_asked');
      setProgression(updatedSnap);

      const response = await askBarnabyCompanion({
        message: query,
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

  const drawerExpression = isReplying ? 'analytical' : poseToDefaultExpression(pose);

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
                  isReplying
                    ? 'focused'
                    : pose === 'celebrating'
                    ? 'celebratory'
                    : isAvatarSpeaking
                    ? 'speaking'
                    : 'idle'
                }
                moodState={
                  isReplying
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
              <span className="hidden sm:inline">Speak Aloud</span>
            </button>
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

        {/* Loaded Context Summary Strip */}
        <div className="px-5 py-2.5 bg-[#F4F7F6] dark:bg-[#11201E] border-b border-[#134E41]/10 dark:border-[#1F8A70]/20 text-[11px] text-[#566664] dark:text-slate-300 space-y-1 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="tabular-nums">
              Target Band <strong className="text-[#0E1F1E] dark:text-white">{targetBand.toFixed(1)}</strong> ·{' '}
              {currentEstimate !== null ? `Current ${currentEstimate.toFixed(1)}` : 'Not assessed'}
            </span>
            {(mergedContext.mistakeCount ?? 0) > 0 && (
              <span className="text-[#B45309] dark:text-[#FBBF24] font-semibold tabular-nums">
                {mergedContext.mistakeCount} vault items loaded
              </span>
            )}
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
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.role === 'barnaby' && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleToggleMessageAudio(msg.id, msg.text)}
                      aria-label={isAvatarSpeaking && spokenMessageId === msg.id ? 'Stop reading' : 'Read reply aloud'}
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
            placeholder="Ask about a trap, essay criterion, or 5-min plan..."
            className="flex-1 min-w-0 min-h-[42px] px-3.5 py-2 rounded-xl bg-[#F4F7F6] dark:bg-[#11201E] border border-[#134E41]/15 dark:border-[#1F8A70]/30 text-xs text-[#0E1F1E] dark:text-[#EEF3F1] placeholder:text-[#566664]/75 focus:outline-none focus:border-[#134E41]"
          />
          <button
            type="submit"
            disabled={isReplying || !input.trim()}
            aria-label="Send message to Barnaby"
            className="min-w-[42px] min-h-[42px] rounded-xl bg-[#134E41] hover:bg-[#0D3A30] disabled:opacity-50 text-white flex items-center justify-center transition cursor-pointer shrink-0"
          >
            {isReplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </aside>
    </div>
  );
};
