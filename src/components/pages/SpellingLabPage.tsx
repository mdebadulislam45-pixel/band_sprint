import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Search,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  List,
  Eye,
  X
} from 'lucide-react';
import {
  IELTS_SPELLING_TRAPS,
  CORE_SPELLING_TRAPS_COUNT,
  SpellingCategory,
  SpellingTrapItem
} from '../../data/ieltsSpellingData';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';
import {
  loadSpellingProgress,
  saveSpellingProgress
} from '../../utils/spellingProgressStore';

interface SpellingLabPageProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

const CATEGORIES: Array<'All' | SpellingCategory> = [
  'All',
  'Listening Traps',
  'Double Letters',
  'Silent Letters',
  'Tricky Vowels',
  'Academic Writing'
];

const WORDS_PER_PAGE = 24;

export const SpellingLabPage: React.FC<SpellingLabPageProps> = ({ onBack, onShowToast }) => {
  const [deckMode, setDeckMode] = useState<'all' | 'core'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'All' | SpellingCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [userSpellingInput, setUserSpellingInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [slowMode, setSlowMode] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [score, setScore] = useState(() => {
    const saved = loadSpellingProgress();
    return { correct: saved.correctCount, attempted: saved.attemptedCount };
  });
  const [studiedWords, setStudiedWords] = useState<Record<string, 'correct' | 'wrong'>>(() => {
    const saved = loadSpellingProgress();
    const map: Record<string, 'correct' | 'wrong'> = {};
    saved.wrongWords.forEach((id) => {
      map[id] = 'wrong';
    });
    saved.masteredWords.forEach((id) => {
      map[id] = 'correct';
    });
    return map;
  });
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserPage, setBrowserPage] = useState(0);

  useEffect(() => {
    const handleCloudSync = () => {
      const saved = loadSpellingProgress();
      setScore({ correct: saved.correctCount, attempted: saved.attemptedCount });
      const map: Record<string, 'correct' | 'wrong'> = {};
      saved.wrongWords.forEach((id) => {
        map[id] = 'wrong';
      });
      saved.masteredWords.forEach((id) => {
        map[id] = 'correct';
      });
      setStudiedWords(map);
    };
    window.addEventListener('bandsprint_cloud_sync_updated', handleCloudSync);
    return () => window.removeEventListener('bandsprint_cloud_sync_updated', handleCloudSync);
  }, []);

  const deckBase = useMemo(
    () => (deckMode === 'core' ? IELTS_SPELLING_TRAPS.filter((w) => w.isCoreTrap) : IELTS_SPELLING_TRAPS),
    [deckMode]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: deckBase.length };
    for (const item of deckBase) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, [deckBase]);

  const filteredTraps = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return deckBase.filter((item) => {
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        item.word.toLowerCase().includes(q) ||
        item.meaning_bn.toLowerCase().includes(q) ||
        item.commonError.toLowerCase().includes(q) ||
        (item.topic || '').toLowerCase().includes(q)
      );
    });
  }, [deckBase, selectedCategory, searchQuery]);

  const safeIndex =
    filteredTraps.length > 0 ? Math.min(activeWordIndex, filteredTraps.length - 1) : 0;
  const currentWord: SpellingTrapItem | undefined = filteredTraps[safeIndex];

  const totalBrowserPages = Math.max(1, Math.ceil(filteredTraps.length / WORDS_PER_PAGE));
  const safeBrowserPage = Math.min(browserPage, totalBrowserPages - 1);
  const browserSlice = useMemo(
    () =>
      filteredTraps.slice(
        safeBrowserPage * WORDS_PER_PAGE,
        (safeBrowserPage + 1) * WORDS_PER_PAGE
      ),
    [filteredTraps, safeBrowserPage]
  );

  const resetCardState = () => {
    stopSpeech();
    setIsDictating(false);
    setShowAnswer(false);
    setShowHint(false);
    setUserSpellingInput('');
  };

  const selectWordAt = (idx: number) => {
    resetCardState();
    setActiveWordIndex(idx);
  };

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
      rate: slowMode ? 0.74 : 0.92,
      onEnd: () => setIsDictating(false)
    });
  };

  const handleCheckSpelling = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentWord) return;
    if (showAnswer) {
      handleNextWord();
      return;
    }
    if (!userSpellingInput.trim()) return;

    const isMatch =
      userSpellingInput.trim().toLowerCase() === currentWord.word.toLowerCase();

    const nextScore = {
      correct: isMatch ? score.correct + 1 : score.correct,
      attempted: score.attempted + 1
    };
    const nextStudied: Record<string, 'correct' | 'wrong'> = {
      ...studiedWords,
      [currentWord.id]: isMatch ? 'correct' : 'wrong'
    };

    setShowAnswer(true);
    setScore(nextScore);
    setStudiedWords(nextStudied);

    const masteredWords = Object.entries(nextStudied)
      .filter(([, status]) => status === 'correct')
      .map(([id]) => id);
    const wrongWords = Object.entries(nextStudied)
      .filter(([, status]) => status === 'wrong')
      .map(([id]) => id);

    saveSpellingProgress({
      correctCount: nextScore.correct,
      attemptedCount: nextScore.attempted,
      masteredWords,
      wrongWords
    });

    if (isMatch) {
      soundManager.playSuccess();
      onShowToast(`Correct — "${currentWord.word}"`);
    } else {
      soundManager.playBeep(350, 0.08);
      onShowToast(`Review the spelling of "${currentWord.word}".`);
    }
  };

  const handleNextWord = () => {
    if (filteredTraps.length === 0) return;
    selectWordAt((safeIndex + 1) % filteredTraps.length);
  };

  const handlePrevWord = () => {
    if (filteredTraps.length === 0) return;
    selectWordAt((safeIndex - 1 + filteredTraps.length) % filteredTraps.length);
  };

  const handleShuffle = () => {
    if (filteredTraps.length <= 1) return;
    let randomIdx = Math.floor(Math.random() * filteredTraps.length);
    if (randomIdx === safeIndex) {
      randomIdx = (safeIndex + 1) % filteredTraps.length;
    }
    soundManager.playBeep(620, 0.04);
    selectWordAt(randomIdx);
  };

  const accuracy =
    score.attempted > 0 ? Math.round((score.correct / score.attempted) * 100) : 0;

  const isExactMatch =
    showAnswer &&
    currentWord &&
    userSpellingInput.trim().toLowerCase() === currentWord.word.toLowerCase();

  const renderHighlightedSentence = (sentence: string, word: string) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped}\\w*)`, 'gi');
    const parts = sentence.split(regex);
    return parts.map((part, i) =>
      part.toLowerCase().startsWith(word.toLowerCase()) ? (
        <strong
          key={i}
          className="font-semibold text-[#0F4C45] dark:text-[#F4A62A] not-italic"
        >
          {part}
        </strong>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 animate-fade-in pb-16">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45] text-[#0E1F1E] dark:text-[#EEF3F1] text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Learn</span>
        </button>

        {/* Inline Tabular Session Stats */}
        <div className="flex items-center gap-4 text-xs text-[#566664] dark:text-slate-300 font-mono tabular-nums">
          <span>
            Attempted: <strong className="text-[#0E1F1E] dark:text-white">{score.attempted}</strong>
          </span>
          <span>
            Correct:{' '}
            <strong className="text-[#1F8A70] dark:text-emerald-400">{score.correct}</strong>
          </span>
          <span>
            Accuracy: <strong className="text-[#0E1F1E] dark:text-white">{accuracy}%</strong>
          </span>
        </div>
      </div>

      {/* BandSprint Pine Header */}
      <section className="rounded-2xl bg-[#0F4C45] text-white p-5 sm:p-7 border border-[#0B3833]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#F4A62A] font-semibold">
              IELTS Spelling &amp; Dictation Lab · {IELTS_SPELLING_TRAPS.length.toLocaleString()} Words
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Train accurate British spelling under dictation
            </h1>
            <p className="text-sm text-[#EEF3F1]/80 leading-relaxed">
              Listening Section 1–4 answers are marked wrong for a single missing letter. Practice the {CORE_SPELLING_TRAPS_COUNT} highest-risk examiner traps or drill all {IELTS_SPELLING_TRAPS.length.toLocaleString()} BandSprint academic words.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex rounded-xl bg-[#0B3833] p-1 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setDeckMode('all');
                  setSelectedCategory('All');
                  setBrowserPage(0);
                  selectWordAt(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  deckMode === 'all'
                    ? 'bg-[#F4A62A] text-[#0E1F1E]'
                    : 'text-[#EEF3F1]/80 hover:text-white'
                }`}
              >
                All Words ({IELTS_SPELLING_TRAPS.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeckMode('core');
                  setSelectedCategory('All');
                  setBrowserPage(0);
                  selectWordAt(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  deckMode === 'core'
                    ? 'bg-[#F4A62A] text-[#0E1F1E]'
                    : 'text-[#EEF3F1]/80 hover:text-white'
                }`}
              >
                Top {CORE_SPELLING_TRAPS_COUNT} Traps
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Category Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#566664] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveWordIndex(0);
                setBrowserPage(0);
                setShowAnswer(false);
                setShowHint(false);
                setUserSpellingInput('');
              }}
              placeholder="Search any English word, বাংলা অর্থ, or topic..."
              className="w-full min-h-[44px] pl-10 pr-9 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-sm text-[#0E1F1E] dark:text-[#EEF3F1] placeholder:text-[#566664] focus:outline-none focus:border-[#0F4C45]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveWordIndex(0);
                  setBrowserPage(0);
                }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#566664] hover:text-[#0E1F1E] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleShuffle}
              disabled={filteredTraps.length <= 1}
              className="min-h-[44px] px-3.5 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45] text-[#0E1F1E] dark:text-[#EEF3F1] text-xs font-semibold inline-flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#F4A62A]" />
              <span>Random Word</span>
            </button>

            <button
              type="button"
              onClick={() => setBrowserOpen((v) => !v)}
              className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${
                browserOpen
                  ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                  : 'bg-[#EEF3F1] dark:bg-[#0B1514] border-[#D3DDDA] dark:border-[#1F8A70]/30 text-[#0E1F1E] dark:text-[#EEF3F1] hover:border-[#0F4C45]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Browse List ({filteredTraps.length})</span>
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            const count = categoryCounts[cat] || 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setBrowserPage(0);
                  selectWordAt(0);
                  soundManager.playBeep(600, 0.03);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border cursor-pointer tabular-nums ${
                  isActive
                    ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                    : 'bg-[#F7F9F8] dark:bg-[#0B1514] text-[#566664] dark:text-slate-300 border-[#D3DDDA] dark:border-[#1F8A70]/25 hover:border-[#0F4C45]'
                }`}
              >
                {cat} <span className="opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty Search State */}
      {!currentWord ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-center space-y-3">
          <div className="text-base font-bold text-[#0E1F1E] dark:text-white">
            No spelling entries match "{searchQuery}"
          </div>
          <p className="text-xs text-[#566664] dark:text-slate-400">
            Try switching to "All Words" or clearing your search filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setDeckMode('all');
              setActiveWordIndex(0);
            }}
            className="px-4 py-2 rounded-xl bg-[#0F4C45] text-white text-xs font-semibold cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Active Dictation Workbench */
        <section className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 p-5 sm:p-8 space-y-6">
          {/* Card Header Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EEF3F1] dark:border-[#1F8A70]/20">
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className="font-mono font-semibold text-[#0F4C45] dark:text-[#F4A62A] uppercase tracking-wide">
                {currentWord.category}
              </span>
              <span className="text-[#D3DDDA] dark:text-slate-700">|</span>
              <span className="font-mono text-[#566664] dark:text-slate-400 tabular-nums">
                Word {safeIndex + 1} of {filteredTraps.length}
              </span>
              {currentWord.cefr && (
                <>
                  <span className="text-[#D3DDDA] dark:text-slate-700">|</span>
                  <span className="font-mono font-semibold text-[#0E1F1E] dark:text-slate-200">
                    CEFR {currentWord.cefr}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevWord}
                aria-label="Previous word"
                className="w-9 h-9 rounded-lg border border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45] flex items-center justify-center text-[#0E1F1E] dark:text-[#EEF3F1] transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextWord}
                aria-label="Next word"
                className="w-9 h-9 rounded-lg border border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45] flex items-center justify-center text-[#0E1F1E] dark:text-[#EEF3F1] transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Meaning Prompt + Audio Controls */}
          <div className="flex flex-col items-center text-center space-y-4 py-2">
            <div className="space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#566664] dark:text-slate-400">
                Meaning Clue (বাংলা)
              </div>
              <div className="text-base sm:text-lg font-bold text-[#0E1F1E] dark:text-white">
                {currentWord.meaning_bn}
              </div>
              {currentWord.topic && (
                <div className="text-xs text-[#566664] dark:text-slate-400">
                  Topic: {currentWord.topic}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => handlePlayDictation(false)}
                className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-semibold text-sm inline-flex items-center gap-2 transition cursor-pointer"
              >
                {isDictating ? (
                  <>
                    <VolumeX className="w-4 h-4 text-[#F4A62A]" />
                    <span>Stop Audio</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-[#F4A62A]" />
                    <span>Play Dictation (British)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handlePlayDictation(true)}
                className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45] text-[#0E1F1E] dark:text-[#EEF3F1] font-semibold text-xs transition cursor-pointer"
              >
                Sentence Only
              </button>

              <button
                type="button"
                onClick={() => setSlowMode((s) => !s)}
                className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-xs font-mono font-semibold transition cursor-pointer ${
                  slowMode
                    ? 'bg-[#F4A62A]/15 border-[#F4A62A] text-[#9B6314] dark:text-[#F4A62A]'
                    : 'bg-white dark:bg-[#0B1514] border-[#D3DDDA] dark:border-[#1F8A70]/30 text-[#566664] dark:text-slate-300'
                }`}
              >
                {slowMode ? '0.75x Slow' : '1.0x Normal'}
              </button>
            </div>

            {showHint && !showAnswer && (
              <div className="px-4 py-2 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-xs text-[#0E1F1E] dark:text-[#EEF3F1]">
                <span className="font-mono font-semibold text-[#0F4C45] dark:text-[#F4A62A] mr-2">
                  {currentWord.word[0].toUpperCase()}
                  {' _ '.repeat(Math.max(1, currentWord.word.length - 1))}
                </span>
                <span className="text-[#566664] dark:text-slate-400">
                  ({currentWord.word.length} letters · {currentWord.hint})
                </span>
              </div>
            )}
          </div>

          {/* Spelling Input Form */}
          <form onSubmit={handleCheckSpelling} className="space-y-3 max-w-lg mx-auto">
            <input
              type="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              disabled={showAnswer}
              value={userSpellingInput}
              onChange={(e) => setUserSpellingInput(e.target.value)}
              placeholder="Type exact spelling here..."
              className="w-full text-center text-lg sm:text-xl font-mono font-bold py-3.5 px-4 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] text-[#0E1F1E] dark:text-white border-2 border-[#D3DDDA] dark:border-[#1F8A70]/40 focus:border-[#0F4C45] dark:focus:border-[#F4A62A] focus:outline-none transition disabled:opacity-75"
            />

            {!showAnswer ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={!userSpellingInput.trim()}
                  className="flex-1 min-h-[46px] py-2.5 px-4 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-semibold text-sm disabled:opacity-45 transition cursor-pointer"
                >
                  Verify Spelling
                </button>
                <button
                  type="button"
                  onClick={() => setShowHint((h) => !h)}
                  className="min-h-[46px] px-4 py-2.5 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-[#0E1F1E] dark:text-[#EEF3F1] font-semibold text-xs hover:border-[#0F4C45] transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-[#F4A62A]" />
                  <span>{showHint ? 'Hide Hint' : 'Hint'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAnswer(true)}
                  className="min-h-[46px] px-4 py-2.5 rounded-xl bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-[#566664] dark:text-slate-300 font-semibold text-xs hover:border-[#0F4C45] transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Reveal</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleNextWord}
                className="w-full min-h-[46px] py-2.5 rounded-xl bg-[#F4A62A] hover:bg-[#d98f1d] text-[#0E1F1E] font-bold text-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Next Word</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Answer Reveal & Memory Trick */}
          {showAnswer && (
            <div className="p-5 rounded-2xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-4 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#D3DDDA]/70 dark:border-[#1F8A70]/20">
                <div className="flex items-center gap-2.5">
                  {isExactMatch ? (
                    <CheckCircle2 className="w-5 h-5 text-[#1F8A70] dark:text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-amber-600 dark:text-[#F4A62A] shrink-0" />
                  )}
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#566664] dark:text-slate-400">
                      Correct Spelling
                    </div>
                    <div className="text-xl sm:text-2xl font-mono font-bold text-[#0F4C45] dark:text-emerald-400">
                      {currentWord.word}
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#566664] dark:text-slate-400">
                    Common Misspelling Trap
                  </div>
                  <div className="text-sm font-mono line-through text-red-600 dark:text-red-400">
                    {currentWord.commonError}
                  </div>
                  <div className="text-[11px] font-mono text-[#566664] dark:text-slate-400">
                    {currentWord.phonetic}
                  </div>
                </div>
              </div>

              {/* Memory Trick */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/25 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-[#0E1F1E] dark:text-white">
                  <Lightbulb className="w-3.5 h-3.5 text-[#F4A62A] shrink-0" />
                  <span>Memory Trick: {currentWord.memoryTrick}</span>
                </div>
                <p className="text-[#566664] dark:text-slate-300 pl-5 leading-relaxed">
                  {currentWord.memoryTrick_bn}
                </p>
              </div>

              {/* Context Sentence */}
              <div className="text-xs sm:text-sm text-[#566664] dark:text-slate-300 italic leading-relaxed">
                "{renderHighlightedSentence(currentWord.dictationSentence, currentWord.word)}"
              </div>
            </div>
          )}
        </section>
      )}

      {/* Paginated Collapsible Word Browser (fast for 1,000+ entries) */}
      {browserOpen && filteredTraps.length > 0 && (
        <section className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EEF3F1] dark:border-[#1F8A70]/20">
            <div>
              <h2 className="font-display text-base font-bold text-[#0E1F1E] dark:text-white">
                Word Bank Browser
              </h2>
              <p className="text-xs text-[#566664] dark:text-slate-400 tabular-nums">
                Showing {safeBrowserPage * WORDS_PER_PAGE + 1}–
                {Math.min((safeBrowserPage + 1) * WORDS_PER_PAGE, filteredTraps.length)} of{' '}
                {filteredTraps.length} matching words. Click any entry to practice it.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
              <button
                type="button"
                disabled={safeBrowserPage === 0}
                onClick={() => setBrowserPage((p) => Math.max(0, p - 1))}
                className="px-2.5 py-1.5 rounded-lg border border-[#D3DDDA] dark:border-[#1F8A70]/30 disabled:opacity-40 text-[#0E1F1E] dark:text-[#EEF3F1] cursor-pointer"
              >
                Prev
              </button>
              <span className="text-[#566664] dark:text-slate-400">
                Page {safeBrowserPage + 1} / {totalBrowserPages}
              </span>
              <button
                type="button"
                disabled={safeBrowserPage >= totalBrowserPages - 1}
                onClick={() => setBrowserPage((p) => Math.min(totalBrowserPages - 1, p + 1))}
                className="px-2.5 py-1.5 rounded-lg border border-[#D3DDDA] dark:border-[#1F8A70]/30 disabled:opacity-40 text-[#0E1F1E] dark:text-[#EEF3F1] cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {browserSlice.map((item, localIdx) => {
              const absoluteIdx = safeBrowserPage * WORDS_PER_PAGE + localIdx;
              const isSelected = absoluteIdx === safeIndex;
              const status = studiedWords[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectWordAt(absoluteIdx)}
                  className={`p-3 rounded-xl border text-left transition flex items-start justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-[#EEF3F1] dark:bg-[#0F4C45]/35 border-[#0F4C45]'
                      : 'bg-[#F7F9F8] dark:bg-[#0B1514] border-[#D3DDDA]/70 dark:border-[#1F8A70]/20 hover:border-[#0F4C45]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-mono font-bold text-[#0E1F1E] dark:text-white truncate">
                      {item.word}
                    </div>
                    <div className="text-[11px] text-[#566664] dark:text-slate-400 truncate">
                      {item.meaning_bn}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    {status === 'correct' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1F8A70] dark:text-emerald-400" />
                    )}
                    {status === 'wrong' && (
                      <XCircle className="w-3.5 h-3.5 text-amber-600 dark:text-[#F4A62A]" />
                    )}
                    {item.cefr && (
                      <span className="text-[10px] font-mono text-[#566664] dark:text-slate-400">
                        {item.cefr}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
