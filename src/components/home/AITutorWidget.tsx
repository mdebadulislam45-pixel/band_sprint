import React, { useState } from 'react';
import { Send, Sparkles, ChevronRight, Volume2, VolumeX, Gift, Flame } from 'lucide-react';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { ChubbyMascotAvatar, MascotMood } from '../common/ChubbyMascotAvatar';
import { soundManager } from '../../utils/audioEffects';

interface AITutorWidgetProps {
  userName: string;
  onNavigateToAITools: () => void;
  onShowToast: (msg: string) => void;
}

const SURPRISE_DROPS = [
  {
    type: 'c2_idiom',
    badge: 'C2 IDIOM SURPRISE',
    title: '“A double-edged sword”',
    text: 'C2 Idiom Gem: “A double-edged sword” — something that brings both significant advantages and unintended drawbacks. Example: “Rapid automation is a double-edged sword, bolstering industrial productivity while displacing routine labour.”'
  },
  {
    type: 'motivation',
    badge: 'MOTIVATION BOOST',
    title: 'Unstoppable Band 8+ Momentum!',
    text: 'Barnaby’s Boost: Every 15 minutes of focused Cambridge practice sharpens your ear for distractor traps and builds effortless lexical fluency. Keep going — your Target Band is within reach!'
  },
  {
    type: 'c2_idiom',
    badge: 'C2 LEXICAL PHRASE',
    title: '“To walk a tightrope”',
    text: 'C2 Idiom Gem: “To walk a tightrope” — to navigate a delicate situation requiring extreme caution between two opposing pressures. Example: “Policymakers must walk a tightrope between economic expansion and ecological preservation.”'
  },
  {
    type: 'c2_idiom',
    badge: 'BAND 9 DISCOURSE GEM',
    title: '“By the same token”',
    text: 'Band 9 Linker: “By the same token” — in the exact same way or for the same compelling reason. Use it in Speaking Part 3 or Writing Task 2 to transition seamlessly between parallel arguments.'
  },
  {
    type: 'motivation',
    badge: 'CONFIDENCE SURGE',
    title: 'Examiner Secret Unlocked!',
    text: 'Barnaby reminds you: Cambridge Speaking examiners do not grade your opinions — they reward natural rhythm, precise collocations, and self-assurance. Speak boldly today!'
  }
];

export const AITutorWidget: React.FC<AITutorWidgetProps> = ({
  userName,
  onNavigateToAITools,
  onShowToast
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; badge?: string }>>([
    {
      sender: 'ai',
      badge: 'LIVE COMPANION',
      text: `Cheerio ${userName}! I'm Barnaby, your chubby Cambridge AI Tutor. Ask me anything or tap "Surprise Me" for a C2 idiom or confidence boost!`
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [mascotMood, setMascotMood] = useState<MascotMood>('idle');
  const [surpriseIndex, setSurpriseIndex] = useState(0);

  const suggestedQuestions = [
    'Give me a C2 idiom for Speaking Part 3',
    'Give me a plan for Writing Task 2.',
    'Explain True / False / Not Given traps.'
  ];

  const handleTriggerSurprise = () => {
    const drop = SURPRISE_DROPS[surpriseIndex % SURPRISE_DROPS.length];
    setSurpriseIndex((prev) => prev + 1);
    setMascotMood('surprise');
    soundManager.playSuccess();

    setMessages((prev) => [
      ...prev,
      {
        sender: 'ai',
        badge: drop.badge,
        text: drop.text
      }
    ]);
    onShowToast(`🎁 Barnaby dropped a ${drop.badge}: ${drop.title}`);

    setIsPlayingAudio(true);
    speakBritish(drop.text, {
      speakerId: 'speaker_barnaby',
      onStart: () => setMascotMood('speaking'),
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

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query) return;

    const userMsg = { sender: 'user' as const, text: query };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);
    setMascotMood('thinking');

    try {
      const res = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, module: 'general' })
      });
      const data = await res.json();
      const reply =
        data.reply ||
        'Focus on consistent daily practice and analyze your recurring errors in the Mistake Vault.';
      setMessages((prev) => [...prev, { sender: 'ai', badge: 'CAMBRIDGE ADVICE', text: reply }]);
      setMascotMood('surprise');
      setTimeout(() => setMascotMood('idle'), 1800);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          badge: 'BAND 8+ STRATEGY',
          text: 'To score Band 7.5+, combine high-frequency collocations with clear paragraph cohesion and active listening to Cambridge Section 3 & 4 recordings.'
        }
      ]);
      setMascotMood('idle');
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
      setMascotMood('idle');
      return;
    }

    setIsPlayingAudio(true);
    setMascotMood('speaking');
    speakBritish(lastAiMsg.text, {
      speakerId: 'speaker_barnaby',
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

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0B1224] border border-slate-200/90 dark:border-slate-800 shadow-2xs p-4 sm:p-5 space-y-3.5">
      {/* Header with Cute Chubby Animal Mascot */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 border border-amber-200/80 dark:border-slate-700 flex items-center justify-center shadow-2xs">
              <ChubbyMascotAvatar mood={mascotMood} size="md" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#0B1224] rounded-full" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="truncate">Barnaby · Live AI Tutor</span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                • Live
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Chubby Cambridge Companion & C2 Coach
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleTriggerSurprise}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
            title="Get a random C2 Idiom or Motivation Boost from Barnaby!"
          >
            <Gift className="w-3.5 h-3.5 text-amber-500" />
            <span>Surprise</span>
          </button>

          <button
            type="button"
            onClick={handleSpeakLast}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isPlayingAudio
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border-slate-200 dark:border-slate-700'
            }`}
            title={isPlayingAudio ? 'Stop British Audio' : 'Listen with British Voice'}
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
            className={`p-3 rounded-2xl leading-relaxed ${
              m.sender === 'ai'
                ? 'bg-blue-50/70 dark:bg-blue-950/40 text-slate-800 dark:text-slate-200 border border-blue-100 dark:border-blue-900/40'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white ml-6 font-medium text-right'
            }`}
          >
            {m.badge && (
              <div className="text-[9px] font-mono font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                <span>{m.badge}</span>
              </div>
            )}
            <div>{m.text}</div>
          </div>
        ))}
        {isLoading && (
          <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 text-slate-500 text-xs italic flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <span>Barnaby is fluffing his feathers and crafting guidance...</span>
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
            className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-slate-200/70 dark:border-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-left transition flex items-center justify-between group cursor-pointer"
          >
            <span className="truncate">{q}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition shrink-0" />
          </button>
        ))}
      </div>

      {/* Input Field */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="relative pt-1"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask Barnaby for Band 9 tips..."
          className="w-full pl-3.5 pr-10 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="absolute right-2 top-3 p-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
