import React, { useEffect, useRef, useState } from 'react';
import {
  Send,
  Sparkles,
  ChevronRight,
  Volume2,
  VolumeX,
  Heart,
  Apple,
  Zap,
  ThumbsUp,
  ThumbsDown,
  ArrowRight
} from 'lucide-react';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';
import {
  BARNABY_STATE_EVENT,
  BarnabyCompanionState,
  MOOD_META,
  answerBarnabyMiniQuiz,
  feedBarnabyWordTreat,
  getBondStage,
  loadBarnabyState,
  petBarnaby,
  rateBarnabyMessage,
  sendBarnabyChatMessage,
  startBarnabyMiniQuiz
} from '../../services/barnabyCompanionStore';

interface AITutorWidgetProps {
  userName: string;
  onNavigateToAITools: () => void;
  onShowToast: (msg: string) => void;
}

export const AITutorWidget: React.FC<AITutorWidgetProps> = ({
  onNavigateToAITools,
  onShowToast
}) => {
  const [state, setState] = useState<BarnabyCompanionState>(() => loadBarnabyState('/progress'));
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);

  // Stay 100% synchronized with FloatingBarnaby in real time!
  useEffect(() => {
    const onSync = (e: Event) => {
      const detail = (e as CustomEvent<BarnabyCompanionState>).detail;
      if (detail) setState(detail);
      else setState(loadBarnabyState('/progress'));
    };
    window.addEventListener(BARNABY_STATE_EVENT, onSync);
    return () => {
      window.removeEventListener(BARNABY_STATE_EVENT, onSync);
      stopSpeech();
    };
  }, []);

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.messages, isLoading]);

  const suggestedQuestions = [
    'What should I focus on next for my target band?',
    'Give me a Band 8.5 Writing Task 2 plan.',
    'Explain True / False / Not Given traps.'
  ];

  const handlePet = () => {
    const { state: next, quip } = petBarnaby();
    setState(next);
    soundManager.playSuccess();
    onShowToast(`Barnaby (+5 Bond XP): ${quip}`);
  };

  const handleWordTreat = () => {
    const { state: next, treat, message } = feedBarnabyWordTreat();
    setState(next);
    soundManager.playSuccess();
    onShowToast(`Barnaby munched a Word Treat: “${treat.word}” (+10 XP)`);

    setIsPlayingAudio(true);
    speakBritish(message.text, {
      speakerId: 'speaker_barnaby',
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false)
    });
  };

  const handleQuiz = () => {
    const { state: next } = startBarnabyMiniQuiz();
    setState(next);
    soundManager.playBeep(700, 0.04);
  };

  const handleAnswerQuiz = (msgId: string, optIdx: number) => {
    const { state: next, isCorrect } = answerBarnabyMiniQuiz(msgId, optIdx);
    setState(next);
    if (isCorrect) {
      soundManager.playSuccess();
      onShowToast('Nice catch! +15 Bond XP with Barnaby!');
    } else {
      soundManager.playBeep(380, 0.05);
    }
  };

  const handleRate = (msgId: string, rating: 'up' | 'down') => {
    const next = rateBarnabyMessage(msgId, rating);
    setState(next);
    onShowToast(
      rating === 'up' ? 'Barnaby is beaming with pride! (+3 Bond XP)' : 'Feedback saved — Barnaby will sharpen his tips!'
    );
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;
    setInputMessage('');
    setIsLoading(true);
    try {
      const { state: next } = await sendBarnabyChatMessage(query, '/progress');
      setState(next);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakLast = () => {
    const lastAiMsg = [...state.messages].reverse().find((m) => m.sender === 'barnaby');
    if (!lastAiMsg) return;
    if (isPlayingAudio) {
      stopSpeech();
      setIsPlayingAudio(false);
      return;
    }
    setIsPlayingAudio(true);
    speakBritish(lastAiMsg.text, {
      speakerId: 'speaker_barnaby',
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false)
    });
  };

  const moodMeta = MOOD_META[state.mood] || MOOD_META.happy;
  const bond = getBondStage(state.bondXp);

  return (
    <div className="rounded-2xl bg-white dark:bg-[#11201F] border border-[#D3DDDA] dark:border-[#1E3533] p-4 sm:p-5 space-y-3.5">
      {/* Unified Living Barnaby Header */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handlePet}
            title="Tap to pet Barnaby!"
            className="relative shrink-0 cursor-pointer"
          >
            <img
              src="/barnaby-dragon-avatar.webp"
              alt="Barnaby AI Study Companion"
              className={`w-11 h-11 rounded-2xl object-cover bg-[#EEF3F1] ring-2 ${moodMeta.ringClass} ${moodMeta.animClass}`}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/barnaby-dragon-avatar.png';
              }}
            />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1E3533] text-[11px] flex items-center justify-center shadow-xs">
              {moodMeta.emoji}
            </span>
          </button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1] leading-tight">
                Barnaby
              </span>
              <span className="text-[10px] font-mono font-bold text-[#0F4C45] dark:text-[#F4A62A]">
                Lv.{bond.level} · {bond.title}
              </span>
            </div>
            <div className="text-xs text-[#566664] dark:text-[#9AAEA9] leading-tight mt-0.5 truncate">
              {moodMeta.label} · {state.activityText}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSpeakLast}
          className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border transition cursor-pointer shrink-0 ${
            isPlayingAudio
              ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
              : 'bg-[#F7F9F8] dark:bg-[#0B1514] text-[#566664] dark:text-[#9AAEA9] hover:text-[#0F4C45] dark:hover:text-[#F4A62A] border-[#D3DDDA] dark:border-[#1E3533]'
          }`}
          title={isPlayingAudio ? 'Stop Barnaby Voice' : 'Listen with Barnaby Voice'}
          aria-label={isPlayingAudio ? 'Stop Barnaby Voice' : 'Listen with Barnaby Voice'}
        >
          {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Bond XP Bar */}
      <div className="flex items-center gap-2 text-[10px] font-mono text-[#566664] dark:text-[#9AAEA9]">
        <span>Bond XP</span>
        <div className="flex-1 h-1.5 rounded-full bg-[#EEF3F1] dark:bg-[#0B1514] overflow-hidden">
          <div
            className="h-full bg-[#F4A62A] rounded-full transition-all duration-500"
            style={{ width: `${bond.progressPct}%` }}
          />
        </div>
        <span className="font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">{bond.currentXp} XP</span>
      </div>

      {/* Interactive Pet + Mini-Quiz Bar */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={handlePet}
          className="min-h-[38px] px-2 py-1.5 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1E3533] hover:border-rose-400 text-xs font-semibold text-[#0E1F1E] dark:text-[#EEF3F1] flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
        >
          <Heart className="w-3.5 h-3.5 text-rose-500" />
          <span>Pet</span>
        </button>
        <button
          type="button"
          onClick={handleWordTreat}
          className="min-h-[38px] px-2 py-1.5 rounded-xl bg-[#FDF6E7] dark:bg-[#F4A62A]/15 border border-[#F4A62A]/40 hover:bg-[#F4A62A]/25 text-xs font-semibold text-[#8A5A0A] dark:text-[#F4A62A] flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
        >
          <Apple className="w-3.5 h-3.5" />
          <span>Treat</span>
        </button>
        <button
          type="button"
          onClick={handleQuiz}
          className="min-h-[38px] px-2 py-1.5 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1E3533] hover:border-[#0F4C45] text-xs font-semibold text-[#0E1F1E] dark:text-[#EEF3F1] flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
        >
          <Zap className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#7CD4C4]" />
          <span>15s Quiz</span>
        </button>
      </div>

      {/* Synchronized Message Stream */}
      <div ref={streamRef} className="space-y-2.5 max-h-64 overflow-y-auto pr-1 text-xs">
        {state.messages.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded-xl leading-relaxed space-y-2 ${
              m.sender === 'barnaby'
                ? 'bg-[#F7F9F8] dark:bg-[#0B1514] text-[#0E1F1E] dark:text-[#EEF3F1] border border-[#D3DDDA] dark:border-[#1E3533]'
                : 'bg-[#0F4C45] text-white ml-6 font-medium text-right'
            }`}
          >
            {m.badge && (
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0F4C45] dark:text-[#F4A62A] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#F4A62A]" />
                <span>{m.badge}</span>
              </div>
            )}
            <div className="whitespace-pre-line">{m.text}</div>

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
                      onClick={() => handleAnswerQuiz(m.id, idx)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg border text-xs font-semibold transition cursor-pointer disabled:cursor-default ${
                        answered
                          ? isRight
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                            : isPicked
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-700 dark:text-rose-300'
                            : 'opacity-60 border-[#D3DDDA] dark:border-[#1E3533]'
                          : 'bg-white dark:bg-[#11201F] border-[#D3DDDA] dark:border-[#1E3533] hover:border-[#0F4C45]'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
                {m.quiz.selectedIndex !== undefined && (
                  <div className="p-2 rounded-lg bg-[#0F4C45]/5 dark:bg-[#0F4C45]/20 text-[11px] space-y-1">
                    <p>{m.quiz.explanationEn}</p>
                    <p className="text-[#0F4C45] dark:text-[#7CD4C4] font-bengali">
                      <strong>বাংলা:</strong> {m.quiz.explanationBn}
                    </p>
                  </div>
                )}
              </div>
            )}

            {m.bengaliTip && (
              <div className="text-[11px] p-2 rounded-lg bg-[#0F4C45]/5 dark:bg-[#0F4C45]/20 text-[#0F4C45] dark:text-[#9EBEB8] font-bengali">
                <strong>বাংলা টিপস:</strong> {m.bengaliTip}
              </div>
            )}

            {m.suggestedAction && (
              <button
                type="button"
                onClick={onNavigateToAITools}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0F4C45] dark:text-[#F4A62A] hover:underline cursor-pointer"
              >
                <span>{m.suggestedAction.label}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}

            {m.sender === 'barnaby' && m.id !== 'barnaby_welcome' && (
              <div className="flex items-center justify-between pt-1.5 border-t border-[#D3DDDA]/50 dark:border-[#1E3533] text-[10px] text-[#566664]">
                <span>{m.rating ? 'Rated' : 'Helpful?'}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleRate(m.id, 'up')}
                    className={`p-1 rounded cursor-pointer ${
                      m.rating === 'up' ? 'text-emerald-600 bg-emerald-50' : 'hover:text-[#0F4C45]'
                    }`}
                    aria-label="Rate helpful"
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRate(m.id, 'down')}
                    className={`p-1 rounded cursor-pointer ${
                      m.rating === 'down' ? 'text-rose-600 bg-rose-50' : 'hover:text-rose-600'
                    }`}
                    aria-label="Rate could be better"
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="p-3 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1E3533] text-[#566664] dark:text-[#9AAEA9] text-xs">
            Barnaby is flapping his wings &amp; drafting your tip…
          </div>
        )}
      </div>

      {/* Suggested Prompt Chips */}
      <div className="space-y-1.5 pt-1">
        {suggestedQuestions.map((q, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSend(q)}
            className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] hover:bg-[#EEF3F1] dark:hover:bg-[#172B29] border border-[#D3DDDA] dark:border-[#1E3533] text-xs font-semibold text-[#0E1F1E] dark:text-[#EEF3F1] hover:text-[#0F4C45] dark:hover:text-[#F4A62A] text-left transition flex items-center justify-between gap-2 group cursor-pointer"
          >
            <span className="truncate">{q}</span>
            <ChevronRight className="w-4 h-4 text-[#566664] group-hover:text-[#0F4C45] dark:group-hover:text-[#F4A62A] group-hover:translate-x-0.5 transition shrink-0" />
          </button>
        ))}
      </div>

      {/* Input Field */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 pt-1"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask Barnaby in English or বাংলা…"
          className="flex-1 min-w-0 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1E3533] text-xs sm:text-sm text-[#0E1F1E] dark:text-[#EEF3F1] placeholder:text-[#566664] focus:outline-none focus:border-[#0F4C45]"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] disabled:opacity-40 text-white transition cursor-pointer"
          aria-label="Send message to Barnaby"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
