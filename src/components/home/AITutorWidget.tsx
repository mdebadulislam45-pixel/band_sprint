import React, { useState } from 'react';
import { Send, Sparkles, ChevronRight, Volume2, VolumeX, Gift } from 'lucide-react';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';

interface AITutorWidgetProps {
  userName: string;
  onNavigateToAITools: () => void;
  onShowToast: (msg: string) => void;
}

const SURPRISE_DROPS = [
  {
    type: 'c2_idiom',
    badge: 'C2 IDIOM',
    title: '“A double-edged sword”',
    text: 'C2 Idiom: “A double-edged sword” — something that brings both significant advantages and unintended drawbacks. Example: “Rapid automation is a double-edged sword, bolstering industrial productivity while displacing routine labour.”'
  },
  {
    type: 'motivation',
    badge: 'STUDY BOOST',
    title: 'Steady Band 8+ Momentum',
    text: 'Tip from Barnaby: Every 15 minutes of focused IELTS practice sharpens your ear for distractor traps and builds effortless lexical fluency. Keep going — your Target Band is within reach!'
  },
  {
    type: 'c2_idiom',
    badge: 'C2 EXPRESSION',
    title: '“To walk a tightrope”',
    text: 'C2 Idiom: “To walk a tightrope” — to navigate a delicate situation requiring extreme caution between two opposing pressures. Example: “Policymakers must walk a tightrope between economic expansion and ecological preservation.”'
  },
  {
    type: 'c2_idiom',
    badge: 'BAND 9 LINKER',
    title: '“By the same token”',
    text: 'Band 9 Linker: “By the same token” — in the exact same way or for the same compelling reason. Use it in Speaking Part 3 or Writing Task 2 to transition smoothly between parallel arguments.'
  },
  {
    type: 'motivation',
    badge: 'EXAMINER INSIGHT',
    title: 'How Speaking Is Graded',
    text: 'Reminder: IELTS Speaking examiners do not grade your opinions — they reward natural rhythm, precise collocations, and clear coherence. Speak steadily and develop each answer with a reason and example.'
  }
];

export const AITutorWidget: React.FC<AITutorWidgetProps> = ({
  userName,
  onShowToast
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; badge?: string }>>([
    {
      sender: 'ai',
      badge: 'AI STUDY TUTOR',
      text: `Hi ${userName}! I'm Barnaby, your IELTS study tutor. Ask me anything or tap "Surprise" for a C2 idiom or exam strategy tip.`
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [surpriseIndex, setSurpriseIndex] = useState(0);

  const suggestedQuestions = [
    'Give me a C2 idiom for Speaking Part 3',
    'Give me a plan for Writing Task 2.',
    'Explain True / False / Not Given traps.'
  ];

  const handleTriggerSurprise = () => {
    const drop = SURPRISE_DROPS[surpriseIndex % SURPRISE_DROPS.length];
    setSurpriseIndex((prev) => prev + 1);
    soundManager.playSuccess();

    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        badge: drop.badge,
        text: drop.text
      }
    ]);
    onShowToast(`Barnaby shared a ${drop.badge}: ${drop.title}`);

    setIsPlayingAudio(true);
    speakBritish(drop.text, {
      speakerId: 'speaker_barnaby',
      onEnd: () => {
        setIsPlayingAudio(false);
      },
      onError: () => {
        setIsPlayingAudio(false);
      }
    });
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query) return;

    const userMsg = { sender: 'user' as const, text: query };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, module: 'general' })
      });
      const data = await res.json();
      const reply =
        data.reply ||
        'Focus on consistent daily practice and review your recurring errors in the Mistake Vault.';
      setMessages((prev) => [...prev, { sender: 'ai', badge: 'EXAM ADVICE', text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          badge: 'BAND 8+ STRATEGY',
          text: 'To score Band 7.5+, combine high-frequency collocations with clear paragraph cohesion and active listening to IELTS Section 3 & 4 recordings.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakLast = () => {
    const lastAiMsg = [...messages].reverse().find((m) => m.sender === 'ai');
    if (!lastAiMsg) return;

    if (isPlayingAudio) {
      stopSpeech();
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    speakBritish(lastAiMsg.text, {
      speakerId: 'speaker_barnaby',
      onEnd: () => {
        setIsPlayingAudio(false);
      },
      onError: () => {
        setIsPlayingAudio(false);
      }
    });
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-[#11201F] border border-[#D3DDDA] dark:border-[#1E3533] p-4 sm:p-5 space-y-3.5">
      {/* Unified Barnaby Header (Clean, zero truncation on mobile) */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/barnaby-dragon-avatar.webp"
            alt="Barnaby AI Study Tutor"
            className="w-11 h-11 rounded-2xl object-cover bg-[#EEF3F1] border border-[#D3DDDA] dark:border-[#1E3533] shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/barnaby-dragon-avatar.png';
            }}
          />
          <div className="min-w-0">
            <div className="text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1] leading-tight">
              Barnaby
            </div>
            <div className="text-xs text-[#566664] dark:text-[#9AAEA9] leading-tight mt-0.5">
              IELTS Study Tutor &amp; C2 Coach
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleTriggerSurprise}
            className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#FDF6E7] dark:bg-[#F4A62A]/15 hover:bg-[#F4A62A]/25 border border-[#F4A62A]/40 text-[#8A5A0A] dark:text-[#F4A62A] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
            title="Get a random C2 Idiom or Exam Tip from Barnaby"
          >
            <Gift className="w-3.5 h-3.5 shrink-0" />
            <span>Surprise</span>
          </button>

          <button
            type="button"
            onClick={handleSpeakLast}
            className={`min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border transition cursor-pointer ${
              isPlayingAudio
                ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                : 'bg-[#F7F9F8] dark:bg-[#0B1514] text-[#566664] dark:text-[#9AAEA9] hover:text-[#0F4C45] dark:hover:text-[#F4A62A] border-[#D3DDDA] dark:border-[#1E3533]'
            }`}
            title={isPlayingAudio ? 'Stop British Audio' : 'Listen with British Voice'}
            aria-label={isPlayingAudio ? 'Stop British Audio' : 'Listen with British Voice'}
          >
            {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 text-xs">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl leading-relaxed ${
              m.sender === 'ai'
                ? 'bg-[#F7F9F8] dark:bg-[#0B1514] text-[#0E1F1E] dark:text-[#EEF3F1] border border-[#D3DDDA] dark:border-[#1E3533]'
                : 'bg-[#0F4C45] text-white ml-6 font-medium text-right'
            }`}
          >
            {m.badge && (
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0F4C45] dark:text-[#F4A62A] mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#F4A62A]" />
                <span>{m.badge}</span>
              </div>
            )}
            <div>{m.text}</div>
          </div>
        ))}
        {isLoading && (
          <div className="p-3 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1E3533] text-[#566664] dark:text-[#9AAEA9] text-xs">
            Barnaby is drafting your tip…
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
          placeholder="Ask Barnaby for Band 9 tips…"
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
