import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Volume2,
  VolumeX,
  BookOpen,
  Sparkles,
  Copy,
  Check,
  Filter,
  CheckCircle2,
  Shuffle,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  AlertTriangle,
  Award,
  Layers,
  HelpCircle,
  Bookmark,
  X
} from 'lucide-react';
import {
  C1_IDIOMS_AND_PHRASES,
  C1_GUIDE_METADATA,
  C1IdiomPhrase
} from '../../data/c1IdiomsAndPhrasesData';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';
import { VocabVisualBanner } from '../vocab/VocabVisualCue';

interface C1IdiomsPageProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

export const C1IdiomsPage: React.FC<C1IdiomsPageProps> = ({ onBack, onShowToast }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'All' | 'C1' | 'C2'>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedSuitability, setSelectedSuitability] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'browse' | 'flashcards' | 'quiz'>('browse');
  const [selectedDetailItem, setSelectedDetailItem] = useState<C1IdiomPhrase | null>(null);

  // Audio state
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Mastered items state in localStorage
  const [masteredIds, setMasteredIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('c1_idioms_mastered_ids_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleMastered = (id: number) => {
    setMasteredIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try {
        localStorage.setItem('c1_idioms_mastered_ids_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
    soundManager.playBeep(600, 0.04);
  };

  // Types list
  const allTypes = useMemo(() => {
    const set = new Set<string>();
    C1_IDIOMS_AND_PHRASES.forEach(item => set.add(item.type));
    return ['All', ...Array.from(set)];
  }, []);

  // Filtered idioms
  const filteredList = useMemo(() => {
    return C1_IDIOMS_AND_PHRASES.filter(item => {
      const itemLevel = item.cefrLevel || (item.category === 'C2 Band-9 Mastery' ? 'C2' : 'C1');
      const matchesLevel = selectedLevel === 'All' || itemLevel === selectedLevel;
      const matchesType = selectedType === 'All' || item.type === selectedType;
      const matchesSuit = selectedSuitability === 'All' || item.ieltsSuitability === selectedSuitability;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.phrase.toLowerCase().includes(q) ||
        item.banglaMeaning.toLowerCase().includes(q) ||
        item.exampleSentence.toLowerCase().includes(q) ||
        item.id.toString() === q;

      return matchesLevel && matchesType && matchesSuit && matchesQuery;
    });
  }, [searchQuery, selectedLevel, selectedType, selectedSuitability]);

  // Flashcards state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz state
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);

  // Audio playback
  const handlePlayVoice = (item: C1IdiomPhrase, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (playingId === item.id) {
      stopSpeech();
      setPlayingId(null);
      return;
    }

    setPlayingId(item.id);
    const textToSpeak = `${item.phrase}. For example: ${item.exampleSentence}`;
    speakBritish(textToSpeak, {
      onEnd: () => setPlayingId(null),
      onError: () => setPlayingId(null)
    });
  };

  const handleCopy = (item: C1IdiomPhrase, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(
      `"${item.phrase}" (${item.banglaMeaning})\nExample: ${item.exampleSentence}`
    );
    setCopiedId(item.id);
    onShowToast(`Copied #${item.id} "${item.phrase}" to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Quiz questions generation
  const currentQuizItem = filteredList[quizIndex % Math.max(1, filteredList.length)];
  const quizOptions = useMemo(() => {
    if (!currentQuizItem) return [];
    const others = C1_IDIOMS_AND_PHRASES.filter(x => x.id !== currentQuizItem.id);
    const shuffledOthers = [...others].sort(() => 0.5 - Math.random()).slice(0, 3);
    const choices = [currentQuizItem, ...shuffledOthers].sort(() => 0.5 - Math.random());
    return choices;
  }, [currentQuizItem]);

  const handleQuizChoice = (meaning: string) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(meaning);
    if (meaning === currentQuizItem.banglaMeaning) {
      soundManager.playSuccess();
      setQuizScore(prev => prev + 1);
    } else {
      soundManager.playWarning();
    }
  };

  const handleNextQuiz = () => {
    setSelectedAnswer(null);
    if (quizIndex + 1 >= 10 || quizIndex + 1 >= filteredList.length) {
      setQuizFinished(true);
    } else {
      setQuizIndex(prev => prev + 1);
    }
  };

  const resetQuiz = () => {
    setQuizIndex(0);
    setQuizScore(0);
    setSelectedAnswer(null);
    setQuizFinished(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold text-sm bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Hub</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            {masteredIds.length} / {C1_IDIOMS_AND_PHRASES.length} Mastered
          </span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{C1_IDIOMS_AND_PHRASES.length} C1 & C2 Idioms, Phrases & Academic Vocabulary</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
            C1 & C2 Idioms & Advanced Vocabulary
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {C1_GUIDE_METADATA.purpose}
          </p>

          {/* Examiner Notice Card */}
          <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md text-xs text-blue-100 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5 font-semibold">
                Practice Examiner Study Tip:
              </strong>
              <span>
                "{C1_GUIDE_METADATA.studyTip}"
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Switcher & CEFR C1 / C2 Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'browse'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Browse All ({C1_IDIOMS_AND_PHRASES.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('flashcards');
              setCardIndex(0);
              setIsFlipped(false);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'flashcards'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Flashcards</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('quiz');
              resetQuiz();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'quiz'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Speed Quiz</span>
          </button>
        </div>

        {/* CEFR Level Quick Filter */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {(['All', 'C1', 'C2'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => {
                setSelectedLevel(lvl);
                setCardIndex(0);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedLevel === lvl
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lvl === 'All' ? 'All Levels' : lvl === 'C2' ? 'C2 Mastery' : 'C1 Advanced'}
            </button>
          ))}
        </div>

        <span className="text-xs font-mono font-bold text-slate-400 pr-2">
          Showing {filteredList.length} of {C1_IDIOMS_AND_PHRASES.length} Expressions
        </span>
      </div>

      {/* TAB 1: BROWSE ALL 200 */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
            <div className="md:col-span-5 relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search English idiom, Bangla meaning, or sentence..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-4">
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {allTypes.map(t => (
                  <option key={t} value={t}>
                    Type: {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                value={selectedSuitability}
                onChange={e => setSelectedSuitability(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All IELTS Contexts</option>
                <option value="Speaking (Recommended)">Speaking (Recommended)</option>
                <option value="Speaking & Writing">Speaking & Writing</option>
                <option value="Writing Formal">Writing Formal</option>
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredList.map(item => {
              const isMastered = masteredIds.includes(item.id);
              const isAudioActive = playingId === item.id;
              const isCopied = copiedId === item.id;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border p-5 transition flex flex-col justify-between shadow-2xs hover:shadow-md ${
                    isMastered ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div>
                    {/* Header: Number, Type & Badges */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-mono font-black text-xs flex items-center justify-center border border-blue-200">
                          #{item.id}
                        </span>
                        <span className="text-[11px] font-mono font-extrabold text-indigo-700">
                          {item.cefrLevel || (item.category === 'C2 Band-9 Mastery' ? 'C2' : 'C1')}
                        </span>
                        <span className="text-slate-300" aria-hidden="true">·</span>
                        <span className="text-slate-600 font-medium text-[11px]">
                          {item.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${
                            item.ieltsSuitability === 'Writing Formal'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : item.ieltsSuitability === 'Speaking (Recommended)'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {item.ieltsSuitability}
                        </span>

                        <button
                          onClick={() => toggleMastered(item.id)}
                          className={`p-1 rounded-md transition ${
                            isMastered ? 'text-emerald-600 bg-emerald-50' : 'text-slate-300 hover:text-slate-500'
                          }`}
                          title={isMastered ? 'Marked as Mastered' : 'Mark as Mastered'}
                        >
                          <Bookmark className={`w-4 h-4 ${isMastered ? 'fill-emerald-600' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Phrase Name */}
                    <div className="flex items-baseline justify-between gap-3 mb-1.5">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        {item.phrase}
                      </h3>
                      <button
                        onClick={e => handlePlayVoice(item, e)}
                        className={`p-1.5 rounded-xl border transition ${
                          isAudioActive
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                        title="Listen with British Audio"
                      >
                        {isAudioActive ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Bangla Meaning */}
                    <div className="mb-3 p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-blue-950 font-semibold text-xs sm:text-sm">
                      <span className="text-[10px] uppercase font-bold text-blue-700 font-mono block mb-0.5">
                        বাংলা অর্থ:
                      </span>
                      {item.banglaMeaning}
                    </div>

                    {/* Example Sentence */}
                    <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-150 leading-relaxed mb-3">
                      <span className="font-bold text-slate-800 block mb-0.5 text-[11px] font-mono uppercase">
                        Practice Example:
                      </span>
                      "{item.exampleSentence}"
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playBeep(640, 0.04);
                        setSelectedDetailItem(item);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold font-bengali flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-2xs"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-blue-700" />
                      <span>বিস্তারিত অর্থ ও ব্যবহার →</span>
                    </button>

                    <button
                      onClick={e => handleCopy(item, e)}
                      className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-bold transition text-[11px] p-1 rounded-md hover:bg-slate-100"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredList.length === 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <Search className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No matching expressions found</h3>
              <p className="text-xs text-slate-500">
                Try searching for another keyword or change your filter selection.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('All');
                  setSelectedSuitability('All');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
              >
                Reset Search
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FLASHCARD MODE */}
      {activeTab === 'flashcards' && filteredList.length > 0 && (
        <div className="max-w-xl mx-auto space-y-5">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-500">
            <span>
              Card {cardIndex + 1} of {filteredList.length}
            </span>
            <button
              onClick={() => {
                setCardIndex(Math.floor(Math.random() * filteredList.length));
                setIsFlipped(false);
              }}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Shuffle</span>
            </button>
          </div>

          {/* Flip Card */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full min-h-[300px] bg-white rounded-3xl border-2 border-slate-200 hover:border-blue-400 shadow-md p-8 flex flex-col justify-between cursor-pointer transition transform active:scale-99"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-mono font-black text-xs border border-blue-200">
                #{filteredList[cardIndex].id} · {filteredList[cardIndex].type}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Click anywhere to {isFlipped ? 'flip back' : 'reveal meaning'} ↻
              </span>
            </div>

            <div className="text-center py-6 space-y-3">
              {!isFlipped ? (
                <>
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-bold font-mono">
                    English Expression
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                    {filteredList[cardIndex].phrase}
                  </h2>
                  <div className="pt-2">
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                      {filteredList[cardIndex].ieltsSuitability}
                    </span>
                  </div>
                </>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-emerald-600 font-bold font-mono">
                      বাংলা অর্থ
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                      {filteredList[cardIndex].banglaMeaning}
                    </h2>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 text-left">
                    <span className="font-bold text-slate-900 block font-mono text-[10px] uppercase mb-1">
                      Example:
                    </span>
                    "{filteredList[cardIndex].exampleSentence}"
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={e => handlePlayVoice(filteredList[cardIndex], e)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                title="Play Audio"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  toggleMastered(filteredList[cardIndex].id);
                }}
                className="text-xs font-bold text-slate-600 hover:text-emerald-600 flex items-center gap-1"
              >
                <Bookmark
                  className={`w-4 h-4 ${
                    masteredIds.includes(filteredList[cardIndex].id) ? 'fill-emerald-600 text-emerald-600' : ''
                  }`}
                />
                <span>Mastered</span>
              </button>
            </div>
          </div>

          {/* Card Navigation */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => {
                setCardIndex(prev => (prev > 0 ? prev - 1 : filteredList.length - 1));
                setIsFlipped(false);
              }}
              className="flex-1 py-3 rounded-2xl bg-white border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => {
                setCardIndex(prev => (prev + 1 < filteredList.length ? prev + 1 : 0));
                setIsFlipped(false);
              }}
              className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:bg-blue-700 flex items-center justify-center gap-1 transition"
            >
              <span>Next Card</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: SPEED QUIZ */}
      {activeTab === 'quiz' && (
        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          {!quizFinished && currentQuizItem ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-mono font-bold text-slate-400">
                  Question {quizIndex + 1} of 10
                </span>
                <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Score: {quizScore} / {quizIndex}
                </span>
              </div>

              <div>
                <span className="text-xs uppercase font-bold text-slate-400 font-mono">
                  Select the correct Bangla meaning for:
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  "{currentQuizItem.phrase}"
                </h2>
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
                  {currentQuizItem.type}
                </span>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {quizOptions.map((opt, i) => {
                  const isChosen = selectedAnswer === opt.banglaMeaning;
                  const isCorrect = opt.banglaMeaning === currentQuizItem.banglaMeaning;

                  let btnStyle = 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800';
                  if (selectedAnswer !== null) {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold';
                    } else if (isChosen) {
                      btnStyle = 'bg-rose-50 border-rose-300 text-rose-900 font-bold';
                    }
                  }

                  return (
                    <button
                      key={opt.id + '_' + i}
                      onClick={() => handleQuizChoice(opt.banglaMeaning)}
                      disabled={selectedAnswer !== null}
                      className={`w-full p-3.5 rounded-2xl border text-left text-xs sm:text-sm transition flex items-center justify-between ${btnStyle}`}
                    >
                      <span>{opt.banglaMeaning}</span>
                      {selectedAnswer !== null && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedAnswer !== null && (
                <div className="pt-2 animate-fade-in flex items-center justify-between">
                  <div className="text-xs text-slate-500 font-mono">
                    Example: "{currentQuizItem.exampleSentence}"
                  </div>
                  <button
                    onClick={handleNextQuiz}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
                  >
                    Next Question →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <Award className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Quiz Completed!</h2>
              <p className="text-sm text-slate-600">
                You scored <strong className="text-emerald-600">{quizScore}</strong> out of{' '}
                <strong className="text-slate-900">10</strong> on C1 expressions.
              </p>
              <button
                onClick={resetQuiz}
                className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
              >
                Take Another Quiz
              </button>
            </div>
          )}
        </div>
      )}

      {/* C1/C2 Expression Details Modal */}
      {selectedDetailItem && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedDetailItem(null);
          }}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border-2 border-indigo-200 relative my-auto animate-fade-in text-slate-900"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-150">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-xs font-mono font-black border border-indigo-200">
                  {selectedDetailItem.cefrLevel || (selectedDetailItem.category === 'C2 Band-9 Mastery' ? 'C2' : 'C1')}
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">
                  #{selectedDetailItem.id} · {selectedDetailItem.type}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95 cursor-pointer"
                title="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Expression Header & British Audio */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                  "{selectedDetailItem.phrase}"
                </h2>
                <button
                  type="button"
                  onClick={(e) => handlePlayVoice(selectedDetailItem, e)}
                  className="p-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition shrink-0 shadow-2xs active:scale-95 cursor-pointer"
                  title="Listen in British accent"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Visual Banner */}
              <VocabVisualBanner
                item={selectedDetailItem.phrase}
                topic={selectedDetailItem.category}
                category="phrase"
              />

              {/* Highlighted Bangla Meaning Box */}
              <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 text-slate-900 shadow-2xs space-y-1">
                <div className="font-mono text-[11px] uppercase font-bold text-amber-900">
                  বাংলা অর্থ ও ভাবার্থ:
                </div>
                <div className="font-bengali font-bold text-base sm:text-lg text-slate-950 leading-relaxed">
                  {selectedDetailItem.banglaMeaning}
                </div>
              </div>
            </div>

            {/* Practice Context & Exam Suitability */}
            <div className="space-y-2.5 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1 font-mono">
                  Practice Example in Context
                </span>
                <p className="text-slate-800 italic font-serif leading-relaxed text-xs sm:text-sm">
                  "{selectedDetailItem.exampleSentence}"
                </p>
              </div>

              <div className="bg-indigo-50/80 p-3 rounded-2xl border border-indigo-200 text-indigo-950 font-bengali">
                <span className="text-[10px] uppercase font-bold text-indigo-800 block mb-0.5 font-sans">
                  🎯 IELTS পরীক্ষায় ব্যবহারের নির্দেশিকা (Exam Suitability):
                </span>
                <div className="font-semibold text-slate-800">
                  {selectedDetailItem.ieltsSuitability === 'Writing Formal'
                    ? 'এটি একাডেমিক রাইটিং টাস্ক ২-এর জন্য অত্যন্ত মানসম্মত ও ফরমাল অভিব্যক্তি।'
                    : selectedDetailItem.ieltsSuitability === 'Speaking (Recommended)'
                    ? 'এটি স্পিকিং পার্ট ১, ২ ও ৩-এ স্বাভাবিক সাবলীলতা ও ব্যান্ড ৮+ অর্জনে অত্যন্ত কার্যকরী।'
                    : 'এটি স্পিকিং ও অ্যাকাডেমিক রাইটিং উভয় মডিউলেই ব্যবহারের উপযোগী।'
                  }
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 gap-2">
              <button
                type="button"
                onClick={(e) => handleCopy(selectedDetailItem, e)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                {copiedId === selectedDetailItem.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>কপি করুন (Copy)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedDetailItem(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition cursor-pointer"
              >
                বন্ধ করুন (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
