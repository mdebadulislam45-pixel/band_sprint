import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Volume2, VolumeX, Minus, Sparkles } from 'lucide-react';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';

interface FloatingBarnabyProps {
  onNavigate: (path: string) => void;
  currentPath?: string;
}

interface ChatMsg {
  id: string;
  sender: 'user' | 'barnaby';
  text: string;
}

const GREETED_KEY = 'bandsprint_barnaby_greeted_v1';
const OPEN_KEY = 'bandsprint_barnaby_open_v1';

// Routes where FloatingBarnaby must stay hidden so it never covers exam controls,
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
  'Give me a C2 idiom for Speaking Part 3',
  'How do I plan Writing Task 2?',
  'Explain True / False / Not Given traps'
];

// Built-in answers used while the AI server is not deployed yet.
// (The live site is static, so /api/tutor/chat 404s until Cloud Run is up.)
// Kept short and honest — Barnaby never invents a score or a review.
function localBarnabyReply(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('idiom')) {
    return 'Here is a C2 idiom for Speaking Part 3: "a double-edged sword" — something with both big advantages and unintended drawbacks. Example: "Rapid automation is a double-edged sword — it boosts productivity while displacing routine jobs." Try it in your next Part 3 answer, then open the Idioms deck in the Learn hub for 200+ more.';
  }
  if (q.includes('writing') || q.includes('task 2')) {
    return 'Writing Task 2 plan that works for Band 7+: 1) Paraphrase the question in your introduction and give a clear opinion. 2) Two body paragraphs — one idea each, with a reason and a concrete example. 3) A short conclusion that repeats your opinion. Aim for 260–280 words and save 3 minutes to check your articles and verb tenses.';
  }
  if (q.includes('true') || q.includes('false') || q.includes('not given') || q.includes('reading')) {
    return 'True / False / Not Given trap: only use what the passage actually says. If the passage says something different from the statement, it is False. If the passage never mentions it, it is Not Given — even if it sounds true in real life. Underline the key words in the statement first, then find them in the passage.';
  }
  if (q.includes('listening')) {
    return 'Listening tip: read the questions before the audio starts and underline numbers, names and dates — those are where the traps hide. The speaker often says a wrong number first, then corrects it. The corrected one is the answer.';
  }
  if (q.includes('speaking')) {
    return 'Speaking tip: in Part 2, use your 1 minute to write 4–5 keywords, not full sentences — then speak for the full 2 minutes. In Part 3, give an opinion, a reason, and an example. Fluency and linking words matter more than perfect grammar.';
  }
  if (q.includes('plan') || q.includes('study') || q.includes('diagnostic') || q.includes('band')) {
    return 'Best next step: take the free 10-minute diagnostic in the Learn hub — it gives you a starting band in all four skills and builds a personal study plan for your target band. Every mistake makes you stronger!';
  }
  return 'Good question! I can help with idioms, Writing Task 2 plans, Reading traps, Listening tips and Speaking practice. Try one of the suggestions above — and remember, every mistake makes you stronger.';
}

export const FloatingBarnaby: React.FC<FloatingBarnabyProps> = ({ onNavigate, currentPath = '/' }) => {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(OPEN_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [isHiddenForExam, setIsHiddenForExam] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'welcome',
      sender: 'barnaby',
      text: "Hi, I'm Barnaby — your IELTS study partner! Ask me for an idiom, a Writing plan, or a Reading trap. What are we working on today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [serverNoteShown, setServerNoteShown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isHiddenOnRoute = HIDDEN_ROUTE_PREFIXES.some(
    (prefix) => currentPath === prefix || currentPath.startsWith(`${prefix}/`)
  );

  // Hide while the CD-IELTS exam is running (the exam has its own Barnaby panel).
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

  // First-visit greeting bubble, once.
  useEffect(() => {
    if (isHiddenForExam) return;
    let greeted = false;
    try {
      greeted = localStorage.getItem(GREETED_KEY) === '1';
    } catch {
      greeted = true;
    }
    if (greeted) return;
    const t = window.setTimeout(() => setShowGreeting(true), 1500);
    return () => window.clearTimeout(t);
  }, [isHiddenForExam]);

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_KEY, isOpen ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading, isOpen]);

  const dismissGreeting = () => {
    setShowGreeting(false);
    try {
      localStorage.setItem(GREETED_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || isLoading) return;
    setInput('');
    dismissGreeting();
    setMessages((prev) => [...prev, { id: `u_${Date.now()}`, sender: 'user', text: query }]);
    setIsLoading(true);
    const history = messages.slice(-10).map((m) => ({
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
          model: 'gemini-3.5-flash-lite',
          context: { module: 'general', examMode: 'Academic' }
        })
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { id: `b_${Date.now()}`, sender: 'barnaby', text: data.reply || 'Sorry, I did not catch that — could you ask again?' }
      ]);
    } catch {
      if (!serverNoteShown) {
        setServerNoteShown(true);
        setMessages((prev) => [
          ...prev,
          {
            id: `b_note_${Date.now()}`,
            sender: 'barnaby',
            text: 'Quick note: my live AI brain is still being connected, so for now I am answering from my built-in tips. They are still real, useful advice!'
          }
        ]);
      }
      setMessages((prev) => [
        ...prev,
        { id: `b_${Date.now()}`, sender: 'barnaby', text: localBarnabyReply(query) }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSpeak = (msg: ChatMsg) => {
    if (playingId === msg.id) {
      stopSpeech();
      setPlayingId(null);
      return;
    }
    stopSpeech();
    setPlayingId(msg.id);
    speakBritish(msg.text, { onEnd: () => setPlayingId(null) });
  };

  if (isHiddenForExam || isHiddenOnRoute) return null;

  return (
    <div className="fixed bottom-[84px] md:bottom-6 right-3 md:right-6 z-40 flex flex-col items-end gap-2.5 select-none">
      {isOpen && (
        <div className="w-[calc(100vw-1.5rem)] max-w-[380px] h-[500px] max-h-[70vh] rounded-2xl bg-white dark:bg-[#11201F] border border-[#D3DDDA] dark:border-[#1E3533] shadow-2xl overflow-hidden flex flex-col animate-fade-in">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#0F4C45] text-white">
            <img
              src="/barnaby-dragon-avatar.webp"
              alt="Barnaby"
              className="w-9 h-9 rounded-full object-cover bg-sky-200 ring-2 ring-[#F4A62A]"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/barnaby-dragon-avatar.png';
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight">Barnaby</p>
              <p className="text-[11px] text-[#EEF3F1]/80 leading-tight">
                IELTS Study Tutor
              </p>
            </div>
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
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                dismissGreeting();
                soundManager.playBeep(520, 0.04);
              }}
              className="p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
              title="Close Barnaby"
              aria-label="Close Barnaby"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#F7F9F8] dark:bg-[#0B1514]">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#0F4C45] text-white rounded-br-md'
                      : 'bg-white dark:bg-[#11201F] text-[#0E1F1E] dark:text-[#EEF3F1] border border-[#D3DDDA] dark:border-[#1E3533] rounded-bl-md'
                  }`}
                >
                  {m.sender === 'barnaby' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-[#0F4C45] dark:text-[#F4A62A] mb-1">
                      <Sparkles className="w-3 h-3 text-[#F4A62A]" /> BARNABY
                    </span>
                  )}
                  <span>{m.text}</span>
                  {m.sender === 'barnaby' && (
                    <button
                      type="button"
                      onClick={() => toggleSpeak(m)}
                      className="ml-2 inline-flex align-middle p-1 rounded-lg hover:bg-[#EEF3F1] dark:hover:bg-white/10 text-[#566664] transition cursor-pointer"
                      title="Hear Barnaby read this"
                      aria-label="Hear Barnaby read this"
                    >
                      {playingId === m.id ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white dark:bg-[#11201F] border border-[#D3DDDA] dark:border-[#1E3533] text-[13px] text-[#566664] dark:text-[#9AAEA9]">
                  Barnaby is thinking…
                </div>
              </div>
            )}
          </div>

          <div className="px-3 pt-2 pb-1 flex gap-2 overflow-x-auto bg-white dark:bg-[#11201F]">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => sendMessage(chip)}
                className="shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-xl bg-[#FDF6E7] dark:bg-[#F4A62A]/10 text-[#8A5A0A] dark:text-[#F4A62A] border border-[#F4A62A]/30 hover:bg-[#F4A62A]/20 transition cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-[#D3DDDA] dark:border-[#1E3533] bg-white dark:bg-[#11201F] flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage();
              }}
              placeholder="Ask Barnaby anything…"
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-[#D3DDDA] dark:border-[#1E3533] bg-[#F7F9F8] dark:bg-[#0B1514] text-sm text-[#0E1F1E] dark:text-white placeholder:text-[#566664] focus:outline-none focus:ring-2 focus:ring-[#0F4C45]"
              aria-label="Ask Barnaby anything"
            />
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="p-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] disabled:opacity-40 text-white transition cursor-pointer"
              title="Send to Barnaby"
              aria-label="Send to Barnaby"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/practice/ai-tools')}
            className="px-4 pb-2.5 text-[11px] font-semibold text-center text-[#566664] hover:text-[#0F4C45] dark:hover:text-[#F4A62A] transition cursor-pointer"
          >
            Open the full AI Tools studio →
          </button>
        </div>
      )}

      {showGreeting && !isOpen && (
        <div className="hidden md:block max-w-[240px] bg-white dark:bg-[#11201F] border border-[#D3DDDA] dark:border-[#1E3533] rounded-2xl rounded-br-md shadow-xl px-4 py-3 animate-fade-in">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] leading-snug text-[#0E1F1E] dark:text-[#EEF3F1]">
              <strong>Hi, I&apos;m Barnaby!</strong> Ask me for IELTS tips, idioms, or study advice anytime.
            </p>
            <button
              type="button"
              onClick={dismissGreeting}
              className="p-1 rounded-lg hover:bg-[#EEF3F1] dark:hover:bg-white/10 text-[#566664] cursor-pointer"
              aria-label="Dismiss greeting"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setIsOpen((v) => !v);
          dismissGreeting();
          soundManager.playBeep(600, 0.04);
        }}
        className="relative w-12 h-12 md:w-14 md:h-14 rounded-full shadow-lg ring-2 ring-white dark:ring-[#1E3533] hover:scale-105 active:scale-95 transition cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F4A62A]"
        title={isOpen ? 'Close Barnaby' : 'Chat with Barnaby'}
        aria-label={isOpen ? 'Close Barnaby' : 'Chat with Barnaby'}
      >
        {isOpen ? (
          <span className="w-full h-full rounded-full bg-[#0F4C45] text-white flex items-center justify-center">
            <X className="w-5 h-5" />
          </span>
        ) : (
          <img
            src="/barnaby-dragon-avatar.webp"
            alt="Barnaby — chat with your AI study tutor"
            className="w-full h-full rounded-full object-cover bg-sky-200"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/barnaby-dragon-avatar.png';
            }}
          />
        )}
      </button>
    </div>
  );
};
