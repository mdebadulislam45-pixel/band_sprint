import React, { useState } from 'react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Search,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Award,
  Filter,
  Check,
  X
} from 'lucide-react';
import { IELTS_SPELLING_TRAPS, SpellingTrapItem } from '../../data/ieltsSpellingData';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';

interface SpellingLabPageProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

export const SpellingLabPage: React.FC<SpellingLabPageProps> = ({ onBack, onShowToast }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [userSpellingInput, setUserSpellingInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [score, setScore] = useState({ correct: 0, attempted: 0 });
  const [studiedWords, setStudiedWords] = useState<Record<string, 'correct' | 'wrong'>>({});

  const categories = [
    'All',
    'Double Letters',
    'Silent Letters',
    'Tricky Vowels',
    'Academic Writing',
    'Listening Traps'
  ];

  const filteredTraps = IELTS_SPELLING_TRAPS.filter((item) => {
    const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      item.word.toLowerCase().includes(q) ||
      item.meaning_bn.toLowerCase().includes(q) ||
      item.commonError.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const currentWord: SpellingTrapItem | undefined =
    filteredTraps[activeWordIndex] || filteredTraps[0];

  const handlePlayDictation = (sentenceOnly = false) => {
    if (!currentWord) return;
    if (isDictating) {
      stopSpeech();
      setIsDictating(false);
      return;
    }
    setIsDictating(true);
    const textToSpeak = sentenceOnly
      ? currentWord.dictationSentence
      : `Spell the word: ${currentWord.word}. In context: ${currentWord.dictationSentence}. The word again is: ${currentWord.word}.`;

    speakBritish(textToSpeak, {
      rate: 0.9,
      onEnd: () => setIsDictating(false)
    });
  };

  const handleCheckSpelling = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentWord || !userSpellingInput.trim()) return;

    const isMatch =
      userSpellingInput.trim().toLowerCase() === currentWord.word.toLowerCase();

    setShowAnswer(true);
    setScore((prev) => ({
      correct: isMatch ? prev.correct + 1 : prev.correct,
      attempted: prev.attempted + 1
    }));
    setStudiedWords((prev) => ({
      ...prev,
      [currentWord.id]: isMatch ? 'correct' : 'wrong'
    }));

    if (isMatch) {
      soundManager.playSuccess();
      onShowToast(`Spot on! "${currentWord.word}" spelled correctly.`);
    } else {
      soundManager.playBeep(350, 0.1);
      onShowToast(`Oops! Check the correct spelling and memory trick.`);
    }
  };

  const handleNextWord = () => {
    setShowAnswer(false);
    setUserSpellingInput('');
    setActiveWordIndex((prev) => (prev + 1) % filteredTraps.length);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Learn</span>
        </button>

        <div className="text-right">
          <div className="text-xs font-bold text-slate-900 font-mono">SPELLING LAB</div>
          <div className="text-[10px] text-slate-400">Audio Dictation & Traps</div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-7 rounded-3xl shadow-md border border-rose-800/40">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-rose-400/30">
            PREVENT LISTENING & WRITING BAND LOSS
          </span>
          <span className="text-[11px] text-rose-200">
            Top 80+ High-Frequency Traps
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          IELTS Spelling Trap & Dictation Lab
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
          Don't lose a full Band 7.5 to 6.5 in Listening or Writing Task 1/2 due to double consonants, silent letters, or tricky vowels. Practice audio dictations with unforgettable memory tricks.
        </p>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-white border border-slate-200 rounded-2xl text-center shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">Attempted</div>
          <div className="text-lg font-black text-slate-900">{score.attempted}</div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-2xl text-center shadow-2xs">
          <div className="text-[10px] font-bold text-emerald-600 uppercase font-mono">Correct</div>
          <div className="text-lg font-black text-emerald-600">{score.correct}</div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-2xl text-center shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">Accuracy</div>
          <div className="text-lg font-black text-slate-900">
            {score.attempted > 0 ? Math.round((score.correct / score.attempted) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setActiveWordIndex(0);
                setShowAnswer(false);
                setUserSpellingInput('');
                soundManager.playBeep(600, 0.04);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                isActive
                  ? 'bg-rose-700 text-white border-rose-700 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Active Dictation Card */}
      {currentWord && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 text-[10px] font-bold border border-rose-200">
                {currentWord.category}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Word {activeWordIndex + 1} of {filteredTraps.length}
              </span>
            </div>

            <span className="text-xs font-bold text-purple-700">
              🇧🇩 {currentWord.meaning_bn}
            </span>
          </div>

          {/* Audio Dictation Trigger */}
          <div className="text-center py-4 space-y-3">
            <button
              onClick={() => handlePlayDictation(false)}
              className="mx-auto w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition shadow-md hover:scale-105 active:scale-95"
            >
              {isDictating ? (
                <VolumeX className="w-8 h-8 animate-pulse text-amber-300" />
              ) : (
                <Volume2 className="w-8 h-8" />
              )}
            </button>
            <div>
              <div className="text-xs font-bold text-slate-800">
                Click to Hear Dictation (British Pronunciation)
              </div>
              <div className="text-[11px] text-slate-400">
                Listen carefully to the word and sentence context
              </div>
            </div>
          </div>

          {/* Spelling Input Form */}
          <form onSubmit={handleCheckSpelling} className="space-y-3 max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                autoFocus
                disabled={showAnswer}
                value={userSpellingInput}
                onChange={(e) => setUserSpellingInput(e.target.value)}
                placeholder="Type your spelling here..."
                className="w-full text-center text-lg sm:text-xl font-mono font-bold py-3 px-4 rounded-2xl border-2 border-slate-300 focus:border-rose-500 focus:outline-none transition shadow-2xs"
              />
            </div>

            {!showAnswer ? (
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!userSpellingInput.trim()}
                  className="flex-1 py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 disabled:opacity-50 transition shadow-2xs"
                >
                  Verify Spelling
                </button>
                <button
                  type="button"
                  onClick={() => setShowAnswer(true)}
                  className="px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
                >
                  Give Up / Reveal
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleNextWord}
                className="w-full py-3 rounded-2xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition shadow-2xs flex items-center justify-center gap-1.5"
              >
                <span>Next Word</span>
                <span>→</span>
              </button>
            )}
          </form>

          {/* Reveal & Memory Trick Card */}
          {showAnswer && (
            <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-fade-in text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Correct Spelling:</span>
                  <div className="text-xl font-mono font-black text-emerald-600">
                    {currentWord.word}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-rose-500 uppercase">Common Error:</span>
                  <div className="text-sm font-mono line-through text-rose-500">
                    {currentWord.commonError}
                  </div>
                </div>
              </div>

              {/* Memory Trick Box */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 font-mono">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>💡 Memory Trick: {currentWord.memoryTrick}</span>
                </div>
                <p className="text-amber-950 font-medium pl-5 leading-relaxed">
                  {currentWord.memoryTrick_bn}
                </p>
              </div>

              {/* Sentence Context */}
              <div className="text-slate-600 italic border-l-2 border-rose-500 pl-3">
                "{currentWord.dictationSentence}"
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
