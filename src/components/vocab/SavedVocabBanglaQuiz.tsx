import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Bookmark,
  CheckCircle2,
  XCircle,
  Volume2,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Award,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Flame,
  Check,
  Send,
  Eye,
  Archive,
  Star,
  Zap,
  RefreshCw,
  Layers,
  ChevronRight
} from 'lucide-react';
import { VocabCard } from '../../types';
import { soundManager } from '../../utils/audioEffects';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { addMistake } from '../../utils/vaultStorage';

interface SavedVocabBanglaQuizProps {
  allCards: VocabCard[];
  savedIds?: string[];
  onToggleSave?: (id: string) => void;
  onToggleMastery?: (id: string) => void;
  onShowToast?: (msg: string) => void;
}

export const SavedVocabBanglaQuiz: React.FC<SavedVocabBanglaQuizProps> = ({
  allCards,
  savedIds = [],
  onToggleSave,
  onToggleMastery,
  onShowToast
}) => {
  // Mode: 'type' (user types English word) or 'mcq' (4 multiple-choice English options)
  const [inputMode, setInputMode] = useState<'type' | 'mcq'>('type');

  // Local fallback saved IDs if none passed in
  const [localSavedIds, setLocalSavedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ielts_saved_vocab_ids');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return savedIds;
  });

  // Sync prop changes
  useEffect(() => {
    if (savedIds && savedIds.length > 0) {
      setLocalSavedIds(savedIds);
    }
  }, [savedIds]);

  // Persist local saved IDs
  const handleToggleLocalSave = (id: string) => {
    if (onToggleSave) {
      onToggleSave(id);
    }
    setLocalSavedIds((prev) => {
      const exists = prev.includes(id);
      const updated = exists ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('ielts_saved_vocab_ids', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Get saved cards pool
  const activeSavedCards = useMemo(() => {
    const matched = allCards.filter((c) => localSavedIds.includes(c.id));
    return matched;
  }, [allCards, localSavedIds]);

  // Quiz state
  const [quizPool, setQuizPool] = useState<VocabCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userTypedInput, setUserTypedInput] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [missedCards, setMissedCards] = useState<VocabCard[]>([]);
  const [correctCards, setCorrectCards] = useState<VocabCard[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset quiz session
  const startQuiz = (customCards?: VocabCard[]) => {
    const cardsToUse = customCards || (activeSavedCards.length > 0 ? activeSavedCards : []);
    // Shuffle cards
    const shuffled = [...cardsToUse].sort(() => 0.5 - Math.random());
    setQuizPool(shuffled);
    setCurrentIndex(0);
    setUserTypedInput('');
    setSelectedOption(null);
    setIsAnswered(false);
    setIsCorrect(null);
    setShowHint(false);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setIsFinished(false);
    setMissedCards([]);
    setCorrectCards([]);
    soundManager.playBeep(650, 0.06);
  };

  useEffect(() => {
    if (activeSavedCards.length > 0 && quizPool.length === 0 && !isFinished) {
      startQuiz(activeSavedCards);
    }
  }, [activeSavedCards]);

  // Focus input field when question changes in type mode
  useEffect(() => {
    if (inputMode === 'type' && !isAnswered && !isFinished) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [currentIndex, inputMode, isAnswered, isFinished]);

  const currentCard = quizPool[currentIndex] || null;

  // Generate 4 MCQ options (1 correct English item + 3 distractor English items)
  const mcqOptions = useMemo(() => {
    if (!currentCard) return [];

    const correctItem = currentCard.item;
    // Get distractors from allCards
    const distractors = allCards
      .filter((c) => c.id !== currentCard.id && c.item.toLowerCase() !== correctItem.toLowerCase())
      .map((c) => c.item);

    // Pick 3 random distractors
    const shuffledDistractors = [...distractors].sort(() => 0.5 - Math.random()).slice(0, 3);
    const combined = [correctItem, ...shuffledDistractors];
    return combined.sort(() => 0.5 - Math.random());
  }, [currentCard, allCards]);

  // Handle Type Mode Submission
  const handleTypeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentCard || isAnswered || !userTypedInput.trim()) return;

    const typedClean = userTypedInput.trim().toLowerCase().replace(/[-_'".,]/g, '');
    const targetClean = currentCard.item.trim().toLowerCase().replace(/[-_'".,]/g, '');
    const beginnerClean = currentCard.beginnerPhrase
      ? currentCard.beginnerPhrase.trim().toLowerCase().replace(/[-_'".,]/g, '')
      : '';

    // Check exact or near match
    const isRight = typedClean === targetClean || (beginnerClean && typedClean === beginnerClean);

    setIsAnswered(true);
    setIsCorrect(isRight);

    if (isRight) {
      soundManager.playSuccess();
      setScore((s) => s + 1);
      setStreak((st) => {
        const next = st + 1;
        if (next > maxStreak) setMaxStreak(next);
        return next;
      });
      setCorrectCards((prev) => [...prev, currentCard]);
    } else {
      soundManager.playBeep(420, 0.12);
      setStreak(0);
      setMissedCards((prev) => [...prev, currentCard]);
    }
  };

  // Handle MCQ Option Selection
  const handleSelectMcq = (opt: string) => {
    if (!currentCard || isAnswered) return;

    setSelectedOption(opt);
    setIsAnswered(true);

    const isRight = opt.toLowerCase() === currentCard.item.toLowerCase();
    setIsCorrect(isRight);

    if (isRight) {
      soundManager.playSuccess();
      setScore((s) => s + 1);
      setStreak((st) => {
        const next = st + 1;
        if (next > maxStreak) setMaxStreak(next);
        return next;
      });
      setCorrectCards((prev) => [...prev, currentCard]);
    } else {
      soundManager.playBeep(420, 0.12);
      setStreak(0);
      setMissedCards((prev) => [...prev, currentCard]);
    }
  };

  // Move to Next Question
  const handleNextQuestion = () => {
    if (currentIndex + 1 < quizPool.length) {
      setCurrentIndex((i) => i + 1);
      setUserTypedInput('');
      setSelectedOption(null);
      setIsAnswered(false);
      setIsCorrect(null);
      setShowHint(false);
    } else {
      setIsFinished(true);
      soundManager.playSuccess();
    }
  };

  // Pronounce British RP
  const handlePronounce = (text: string) => {
    stopSpeech();
    speakBritish(text);
    soundManager.playBeep(560, 0.05);
  };

  // Save card to vault
  const handleSendToVault = (card: VocabCard) => {
    addMistake({
      module: 'vocab',
      title: `${card.item} (${card.banglaMeaning})`,
      userAnswer: 'Practice via Saved Bangla Quiz',
      correctAnswer: card.exampleSentence,
      explanation: `${card.banglaMeaning} — ${card.definition}`
    });
    if (onShowToast) {
      onShowToast(`Saved "${card.item}" to Mistake Vault for Spaced Practice!`);
    }
    soundManager.playSuccess();
  };

  // Quick Preset Handlers for Empty State
  const handleLoadC1C2Preset = () => {
    const c1c2Cards = allCards.filter((c) => c.cefr === 'C1' || c.cefr === 'C2').slice(0, 20);
    const newIds = c1c2Cards.map((c) => c.id);
    setLocalSavedIds(newIds);
    try {
      localStorage.setItem('ielts_saved_vocab_ids', JSON.stringify(newIds));
    } catch {}
    startQuiz(c1c2Cards);
    if (onShowToast) onShowToast('Loaded 20 Band 8+ C1/C2 Academic Words into your Saved List!');
  };

  const handleLoadMasteredPreset = () => {
    const mastered = allCards.filter((c) => c.mastered).slice(0, 20);
    if (mastered.length === 0) {
      handleLoadC1C2Preset();
      return;
    }
    const newIds = mastered.map((c) => c.id);
    setLocalSavedIds(newIds);
    try {
      localStorage.setItem('ielts_saved_vocab_ids', JSON.stringify(newIds));
    } catch {}
    startQuiz(mastered);
    if (onShowToast) onShowToast(`Loaded ${mastered.length} Mastered Words into Saved List!`);
  };

  // First letter & length hint text
  const hintText = useMemo(() => {
    if (!currentCard) return '';
    const word = currentCard.item;
    const parts = word.split(' ');
    return parts
      .map((p) => {
        if (p.length <= 1) return p;
        return `${p[0]}${'_ '.repeat(p.length - 1)}`;
      })
      .join('   ');
  }, [currentCard]);

  // Calculate Band Score
  const performanceBand = useMemo(() => {
    if (quizPool.length === 0) return 'Band 6.0';
    const pct = (score / quizPool.length) * 100;
    if (pct >= 90) return 'Band 9.0';
    if (pct >= 80) return 'Band 8.5';
    if (pct >= 70) return 'Band 8.0';
    if (pct >= 60) return 'Band 7.5';
    if (pct >= 50) return 'Band 7.0';
    return 'Band 6.5';
  }, [score, quizPool]);

  // ================= RENDER 1: EMPTY STATE =================
  if (activeSavedCards.length === 0 && quizPool.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl border-2 border-indigo-200 p-6 sm:p-8 shadow-lg text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
          <Bookmark className="w-8 h-8 fill-amber-400 text-amber-600" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Saved Vocab Quiz (বাংলা অর্থ দেখে ইংরেজি শব্দ)</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-bengali">
            আপনার সেভ করা কোনো ভোকাবুলারি খুঁজে পাওয়া যায়নি!
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            VocabDeck-এর ফ্ল্যাশ কার্ড বা তালিকা ভিউ থেকে শব্দগুলির <Bookmark className="w-3.5 h-3.5 inline text-amber-500" /> সেভ/বুকমার্ক বাটনে ক্লিক করে আপনার পছন্দমতো ভোকাবুলারি লিস্ট তৈরি করুন।
          </p>
        </div>

        {/* Quick Start Buttons */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="text-xs font-bold text-slate-700 font-mono uppercase tracking-wider">
            তাত্ক্ষণিক প্র্যাকটিস শুরু করতে যেকোনো একটি বেছে নিন:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleLoadC1C2Preset}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>C1/C2 Band 8+ শব্দ সেভ করুন (20 items)</span>
            </button>

            <button
              type="button"
              onClick={handleLoadMasteredPreset}
              className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Mastered Words সেভ করে পরীক্ষা দিন</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= RENDER 2: QUIZ COMPLETED SUMMARY =================
  if (isFinished) {
    const accuracy = quizPool.length > 0 ? Math.round((score / quizPool.length) * 100) : 0;

    return (
      <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl border-2 border-indigo-200 p-6 sm:p-8 shadow-xl space-y-6 animate-fade-in text-slate-900">
        {/* Header Badge */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-amber-400 text-slate-950 flex items-center justify-center mx-auto shadow-md">
            <Award className="w-8 h-8 fill-slate-950" />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold font-mono">
            <span>{performanceBand} Master Rating</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Saved Vocabulary Quiz Completed!
          </h2>

          <p className="text-xs text-slate-500 font-bengali">
            আপনার সেভ করা লিস্টের সকল বাংলা অর্থ দেখে ইংরেজি শব্দ টেস্ট সম্পন্ন করেছেন।
          </p>
        </div>

        {/* Telemetry Dashboard Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-0.5">
            <div className="text-[10px] uppercase font-mono text-slate-400 font-bold">Accuracy</div>
            <div className="text-xl sm:text-2xl font-black text-indigo-600 font-mono">{accuracy}%</div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-0.5">
            <div className="text-[10px] uppercase font-mono text-emerald-800 font-bold">Correct</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
              {score} / {quizPool.length}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-0.5">
            <div className="text-[10px] uppercase font-mono text-amber-800 font-bold">Best Streak</div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 font-mono flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span>{maxStreak}</span>
            </div>
          </div>
        </div>

        {/* Missed Words Breakdown */}
        {missedCards.length > 0 && (
          <div className="space-y-3 p-4 rounded-2xl bg-rose-50/70 border border-rose-200">
            <div className="flex items-center justify-between text-rose-900 font-bold text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>ভুল হওয়া শব্দসমূহ ({missedCards.length} Items)</span>
              </span>
              <span>Review Needed</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {missedCards.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-white border border-rose-200 flex items-center justify-between text-xs gap-2"
                >
                  <div>
                    <span className="font-extrabold text-slate-900 text-sm">"{c.item}"</span>
                    <span className="text-slate-500 font-bengali ml-2">({c.banglaMeaning})</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handlePronounce(c.item)}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                      title="Listen"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendToVault(c)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition"
                      title="Save to Mistake Vault"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => startQuiz(missedCards)}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>কেবল ভুল হওয়া শব্দগুলির আবার পরীক্ষা দিন ({missedCards.length})</span>
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => startQuiz()}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-amber-300" />
            <span>সম্পূর্ণ কুইজ পুনরায় শুরু করুন</span>
          </button>
        </div>
      </div>
    );
  }

  if (!currentCard) return null;

  // ================= RENDER 3: ACTIVE QUIZ QUESTION =================
  const progressPercent = Math.round(((currentIndex + 1) / quizPool.length) * 100);
  const isSavedInLocal = localSavedIds.includes(currentCard.id);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 animate-fade-in">
      {/* Top Header Card: Mode Switcher & Telemetry Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Saved Vocab Quiz Badge & Telemetry */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-mono font-black uppercase text-slate-800 tracking-wider">
              Saved Vocab Quiz
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-mono text-xs font-bold flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>Streak: {streak}</span>
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 font-mono text-xs font-bold">
              Score: {score}/{currentIndex + (isAnswered ? 1 : 0)}
            </span>
          </div>
        </div>

        {/* Right: Input Mode Selector */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold self-end sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setInputMode('type');
              soundManager.playBeep(600, 0.04);
            }}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              inputMode === 'type' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-purple-600" />
            <span>ইংরেজি টাইপ করুন</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setInputMode('mcq');
              soundManager.playBeep(600, 0.04);
            }}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              inputMode === 'mcq' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>এমসিকিউ (4 Choices)</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500">
          <span>
            প্রশ্ন {currentIndex + 1} / {quizPool.length}
          </span>
          <span>{progressPercent}% Complete</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
          <div
            className="bg-gradient-to-r from-amber-400 via-purple-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-white rounded-3xl border-2 border-indigo-200 p-6 sm:p-8 shadow-md space-y-6 relative overflow-hidden">
        {/* Card Top Sub-Bar */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-xs font-mono font-black border border-purple-200">
              CEFR {currentCard.cefr || 'B2'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-semibold">
              {currentCard.category === 'idiom'
                ? 'বাগধারা'
                : currentCard.category === 'phrase'
                ? 'বাক্যাংশ'
                : 'শব্দ'}
            </span>
            <span className="text-xs text-slate-400 font-medium">{currentCard.topic}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleToggleLocalSave(currentCard.id)}
              className={`p-2 rounded-xl border transition ${
                isSavedInLocal
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
              }`}
              title={isSavedInLocal ? 'Remove from Saved' : 'Save/Bookmark Word'}
            >
              <Bookmark className={`w-4 h-4 ${isSavedInLocal ? 'fill-amber-500 text-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* PROMPT: BANGLA MEANING CALLOUT DISPLAY */}
        <div className="text-center py-2 space-y-3">
          <div className="text-xs text-amber-800 font-mono font-bold uppercase tracking-widest">
            বাংলা অর্থ দেখে ইংরেজি শব্দ বলুন/টাইপ করুন:
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 via-amber-100/40 to-orange-50 border-2 border-amber-300 text-slate-900 shadow-xs space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 font-bengali tracking-tight leading-snug">
              "{currentCard.banglaMeaning}"
            </h2>

            {currentCard.banglaPronunciation && (
              <div className="text-xs text-purple-800 font-mono font-semibold">
                উচ্চারণ সংকেত: [{currentCard.banglaPronunciation}]
              </div>
            )}
          </div>

          {currentCard.banglaExplanation && (
            <p className="text-xs text-slate-600 font-bengali italic max-w-lg mx-auto">
              {currentCard.banglaExplanation}
            </p>
          )}

          {/* HINT BUTTON & REVEAL */}
          {!isAnswered && (
            <div className="pt-1">
              {!showHint ? (
                <button
                  type="button"
                  onClick={() => setShowHint(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>ইঙ্গিত / Hint দেখুন (First Letter & Length)</span>
                </button>
              ) : (
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-mono text-indigo-900 font-bold animate-fade-in inline-block">
                  <span>Hint: {hintText} ({currentCard.item.length} letters)</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* INPUT MODE 1: TYPE ENGLISH WORD */}
        {inputMode === 'type' && (
          <form onSubmit={handleTypeSubmit} className="space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                disabled={isAnswered}
                value={userTypedInput}
                onChange={(e) => setUserTypedInput(e.target.value)}
                placeholder="সঠিক ইংরেজি শব্দ বা ফ্রেজ টাইপ করুন (e.g. Ubiquitous)..."
                className={`w-full px-4 py-3.5 rounded-2xl border-2 text-sm sm:text-base font-semibold focus:outline-none transition ${
                  isAnswered
                    ? isCorrect
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                      : 'bg-rose-50 border-rose-500 text-rose-950'
                    : 'border-indigo-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 bg-white text-slate-900'
                }`}
              />

              {!isAnswered && (
                <button
                  type="submit"
                  disabled={!userTypedInput.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <span>যাচাই করুন</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {!isAnswered && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">Press Enter to submit</span>
                <button
                  type="button"
                  onClick={() => {
                    setUserTypedInput('idk');
                    setIsAnswered(true);
                    setIsCorrect(false);
                    soundManager.playBeep(420, 0.12);
                    setStreak(0);
                    setMissedCards((prev) => [...prev, currentCard]);
                  }}
                  className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                >
                  উত্তর জানা নেই (Show Answer)
                </button>
              </div>
            )}
          </form>
        )}

        {/* INPUT MODE 2: MCQ 4 OPTIONS */}
        {inputMode === 'mcq' && (
          <div className="space-y-2.5">
            {mcqOptions.map((opt, idx) => {
              const isSelected = selectedOption === opt;
              const isOptionCorrect = opt.toLowerCase() === currentCard.item.toLowerCase();

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => handleSelectMcq(opt)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition flex items-center justify-between gap-3 cursor-pointer ${
                    isAnswered && isOptionCorrect
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-extrabold shadow-sm'
                      : isAnswered && isSelected && !isOptionCorrect
                      ? 'bg-rose-50 border-rose-500 text-rose-950 font-bold'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-800 font-bold'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                        isAnswered && isOptionCorrect
                          ? 'bg-emerald-600 text-white'
                          : isAnswered && isSelected && !isOptionCorrect
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-sm sm:text-base font-mono">{opt}</span>
                  </div>

                  {isAnswered && isOptionCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  {isAnswered && isSelected && !isOptionCorrect && (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ANSWER FEEDBACK CARD */}
        {isAnswered && (
          <div
            className={`p-5 rounded-2xl border-2 space-y-4 animate-fade-in ${
              isCorrect ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950' : 'bg-rose-50/90 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="text-emerald-900 font-black">অসাধারণ! সঠিক উত্তর! (Correct Answer)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span className="text-rose-900 font-black">ভুল হয়েছে! (Incorrect)</span>
                  </>
                )}
              </div>

              {/* Pronunciation Button */}
              <button
                type="button"
                onClick={() => handlePronounce(currentCard.item)}
                className="px-3 py-1.5 rounded-xl bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 transition text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>British Pronunciation</span>
              </button>
            </div>

            {/* Target English Word Display */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-1">
              <div className="text-[10px] font-mono font-bold uppercase text-slate-400">
                সঠিক ইংরেজি শব্দ / Expression:
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                "{currentCard.item}"
              </div>
              {currentCard.definition && (
                <p className="text-xs text-slate-700 leading-relaxed pt-1 border-t border-slate-100">
                  <strong className="text-slate-900">Definition:</strong> {currentCard.definition}
                </p>
              )}
            </div>

            {/* Example Sentence */}
            {currentCard.exampleSentence && (
              <div className="p-3 rounded-xl bg-white/80 border border-slate-200 text-xs italic font-serif text-slate-800 leading-relaxed">
                "{currentCard.exampleSentence}"
              </div>
            )}

            {/* Action Buttons inside feedback */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSendToVault(currentCard)}
                  className="px-3 py-1.5 rounded-xl bg-white text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5 text-rose-600" />
                  <span>Vault-এ যোগ করুন</span>
                </button>

                {onToggleMastery && (
                  <button
                    type="button"
                    onClick={() => onToggleMastery(currentCard.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      currentCard.mastered
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {currentCard.mastered ? '✓ Mastered' : 'Mark Mastered'}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleNextQuestion}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer ml-auto"
              >
                <span>পরবর্তী প্রশ্ন (Next)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
