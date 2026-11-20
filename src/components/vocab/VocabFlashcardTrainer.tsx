import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Volume2,
  RotateCw,
  CheckCircle,
  Clock,
  Flame,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Award
} from 'lucide-react';
import { speakBritish } from '../../utils/britishVoice';
import { AudioPlaybackWaveform } from '../audio/AudioPlaybackWaveform';

export interface VocabFlashcard {
  id: string;
  word: string;
  phonetic: string;
  band: string;
  partOfSpeech: string;
  definition: string;
  academicExample: string;
  collocations: string[];
  banglaMeaning?: string;
}

const DEFAULT_FLASHCARDS: VocabFlashcard[] = [
  {
    id: 'vf_01',
    word: 'Exacerbate',
    phonetic: '/ɪɡˈzæs.ə.beɪt/',
    band: 'Band 8.5 · C2',
    partOfSpeech: 'Verb',
    definition: 'To make an already problematic or volatile situation significantly worse or more acute.',
    academicExample:
      'Unchecked rapid urbanization threatens to exacerbate existing infrastructural deficits and sanitary strain across major metropolitan areas.',
    collocations: ['exacerbate the problem', 'exacerbate inequality', 'further exacerbate'],
    banglaMeaning: 'আরও খারাপ বা তীব্র করা'
  },
  {
    id: 'vf_02',
    word: 'Mitigate',
    phonetic: '/ˈmɪt.ɪ.ɡeɪt/',
    band: 'Band 8.0 · C1',
    partOfSpeech: 'Verb',
    definition: 'To make something bad, painful, or harmful less severe, intense, or damaging.',
    academicExample:
      'Proactive municipal investment in public transit infrastructure serves to mitigate carbon emissions and commute congestion.',
    collocations: ['mitigate the impact', 'mitigate climate change', 'mitigate risk'],
    banglaMeaning: 'প্রশমিত বা লাঘব করা'
  },
  {
    id: 'vf_03',
    word: 'Prevalent',
    phonetic: '/ˈprev.əl.ənt/',
    band: 'Band 8.0 · C1',
    partOfSpeech: 'Adjective',
    definition: 'Existing commonly, generally accepted, or widespread in a particular area at a particular time.',
    academicExample:
      'Sedentary lifestyle habits are increasingly prevalent among younger demographics who spend extensive hours engaged with digital media.',
    collocations: ['widely prevalent', 'prevalent belief', 'prevalent condition'],
    banglaMeaning: 'ব্যাপক বা প্রচলিত'
  },
  {
    id: 'vf_04',
    word: 'Detrimental',
    phonetic: '/ˌdet.rɪˈmen.təl/',
    band: 'Band 8.5 · C2',
    partOfSpeech: 'Adjective',
    definition: 'Causing clear harm, impairment, disadvantage, or destruction.',
    academicExample:
      'Excessive screen exposure before sleep exercises a demonstrably detrimental influence on circadian rhythms and scholastic focus.',
    collocations: ['detrimental effect', 'detrimental impact', 'highly detrimental'],
    banglaMeaning: 'ক্ষতিকর বা হানিকর'
  },
  {
    id: 'vf_05',
    word: 'Substantiate',
    phonetic: '/səbˈstæn.ʃi.eɪt/',
    band: 'Band 8.5 · C2',
    partOfSpeech: 'Verb',
    definition: 'To establish by verified proof, empirical research, or competent evidence.',
    academicExample:
      'Empirical studies conducted by Practice economists substantiate the correlation between early childhood education and long-term vocational earnings.',
    collocations: ['substantiate the claim', 'substantiate an assertion', 'empirically substantiate'],
    banglaMeaning: 'প্রমাণ বা যাচাই করা'
  },
  {
    id: 'vf_06',
    word: 'Prerequisite',
    phonetic: '/priːˈrek.wɪ.zɪt/',
    band: 'Band 8.0 · C1',
    partOfSpeech: 'Noun',
    definition: 'Something that is required as an indispensable prior condition for something else to occur.',
    academicExample:
      'A thorough command of academic vocabulary is an indispensable prerequisite for securing an overall Band 8.0 in IELTS Writing.',
    collocations: ['indispensable prerequisite', 'essential prerequisite', 'prerequisite for success'],
    banglaMeaning: 'পূর্বশর্ত'
  },
  {
    id: 'vf_07',
    word: 'Ubiquitous',
    phonetic: '/juːˈbɪk.wɪ.təs/',
    band: 'Band 9.0 · C2',
    partOfSpeech: 'Adjective',
    definition: 'Present, appearing, or found omnipresently in every modern context.',
    academicExample:
      'Smartphones have transformed from optional luxury gadgets into ubiquitous instruments indispensable to modern commerce and interpersonal correspondence.',
    collocations: ['ubiquitous presence', 'become ubiquitous', 'virtually ubiquitous'],
    banglaMeaning: 'সর্বব্যাপী বা সর্বত্র বিদ্যমান'
  },
  {
    id: 'vf_08',
    word: 'Proliferate',
    phonetic: '/prəˈlɪf.ər.eɪt/',
    band: 'Band 8.5 · C2',
    partOfSpeech: 'Verb',
    definition: 'To reproduce or multiply rapidly, proliferating in volume or quantity.',
    academicExample:
      'Over the past decade, low-cost flight carriers have proliferated across European airspace, making international travel accessible to the broader public.',
    collocations: ['rapidly proliferate', 'threaten to proliferate', 'proliferate exponentially'],
    banglaMeaning: 'দ্রুত বৃদ্ধি বা বিস্তার লাভ করা'
  }
];

const STORAGE_KEY_SRS = 'ielts_vocab_srs_state_v1';

export const VocabFlashcardTrainer: React.FC = () => {
  const [cards] = useState<VocabFlashcard[]>(DEFAULT_FLASHCARDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'learning' | 'review' | 'mastered'>('all');
  const [srsState, setSrsState] = useState<Record<string, 'learning' | 'review' | 'mastered'>>(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_SRS);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_SRS, JSON.stringify(srsState));
      } catch {}
    }
  }, [srsState]);

  const filteredCards = cards.filter((c) => {
    const matchesSearch =
      c.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.definition.toLowerCase().includes(searchQuery.toLowerCase());
    const status = srsState[c.id] || 'learning';
    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && status === filterStatus;
  });

  const activeCard = filteredCards[currentIndex] || filteredCards[0];

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < filteredCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      setCurrentIndex(filteredCards.length - 1);
    }
  };

  const setCardStatus = (status: 'learning' | 'review' | 'mastered') => {
    if (!activeCard) return;
    setSrsState((prev) => ({ ...prev, [activeCard.id]: status }));
    handleNext();
  };

  const [speakingItem, setSpeakingItem] = useState<string | null>(null);

  const handleSpeak = (text: string) => {
    setSpeakingItem(text);
    const wordCount = text.trim().split(/\s+/).length;
    speakBritish(text, {
      deliveryProfile: wordCount <= 3 ? 'pronunciation_model' : 'vocabulary_example',
      onEnd: () => setSpeakingItem(null),
      onError: () => setSpeakingItem(null)
    });
  };

  const masteredCount = cards.filter((c) => srsState[c.id] === 'mastered').length;
  const reviewCount = cards.filter((c) => srsState[c.id] === 'review').length;
  const masteredPercent = Math.round((masteredCount / cards.length) * 100);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-3xl bg-linear-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Spaced Repetition Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            IELTS Academic Flashcards (Band 8.0 - 9.0)
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Memorize high-impact lexical items with interactive flipping cards, certified Practice British
            pronunciation, and three-stage spaced repetition review.
          </p>
        </div>

        {/* Progress Metric */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Award className="w-4 h-4" />
            <span>{masteredCount} Mastered ({masteredPercent}%)</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <Clock className="w-4 h-4" />
            <span>{reviewCount} Due for Review</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-400">
            <BookOpen className="w-4 h-4" />
            <span>{cards.length} Total Lexical Items</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto">
          <button
            onClick={() => {
              setFilterStatus('all');
              setCurrentIndex(0);
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            All Cards ({cards.length})
          </button>
          <button
            onClick={() => {
              setFilterStatus('mastered');
              setCurrentIndex(0);
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
              filterStatus === 'mastered'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Mastered ({masteredCount})
          </button>
          <button
            onClick={() => {
              setFilterStatus('review');
              setCurrentIndex(0);
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
              filterStatus === 'review'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Needs Review ({reviewCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentIndex(0);
            }}
            placeholder="Search academic vocabulary..."
            className="w-full pl-9 pr-3 py-2 rounded-2xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Main Flashcard Interactive Area */}
      {activeCard ? (
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Card Frame */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="min-h-[300px] p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#101B32] border-2 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 shadow-lg cursor-pointer transition flex flex-col justify-between relative group select-none"
          >
            {/* Top Row: Band & Category */}
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {activeCard.band}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400">
                  Card {currentIndex + 1} of {filteredCards.length}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak(activeCard.word);
                  }}
                  className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 hover:bg-blue-100 transition"
                  title="Listen (Realistic British Pronunciation)"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Middle: Front or Back */}
            {!isFlipped ? (
              // FRONT OF CARD
              <div className="text-center py-8 space-y-3">
                <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {activeCard.word}
                </h3>

                {/* Visual Frequency Waveform during pronunciation */}
                {speakingItem === activeCard.word && (
                  <div className="flex justify-center py-1 animate-fade-in">
                    <AudioPlaybackWaveform
                      isPlaying={true}
                      isLoading={false}
                      height={28}
                      barCount={20}
                      showLabel={true}
                      label="British RP Voice"
                    />
                  </div>
                )}

                <div className="text-sm font-mono text-slate-500 dark:text-slate-400">
                  {activeCard.phonetic} · <span className="italic">{activeCard.partOfSpeech}</span>
                </div>
                {activeCard.banglaMeaning && (
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400 font-sans">
                    বাংলা অর্থ: {activeCard.banglaMeaning}
                  </div>
                )}
                <div className="pt-4 text-xs text-slate-400 flex items-center justify-center gap-1.5 font-mono">
                  <RotateCw className="w-3.5 h-3.5 group-hover:rotate-180 transition duration-500" />
                  <span>Click card to reveal definition & Band 9 example</span>
                </div>
              </div>
            ) : (
              // BACK OF CARD
              <div className="py-4 space-y-4">
                <div className="space-y-1">
                  <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    Academic Definition
                  </div>
                  <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                    {activeCard.definition}
                  </p>
                </div>

                <div className="space-y-1 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center justify-between">
                    <span>IELTS Sentence</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSpeak(activeCard.academicExample);
                      }}
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <span>Listen 🔊</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed italic">
                    "{activeCard.academicExample}"
                  </p>

                  {/* Visual Frequency Waveform during example sentence playback */}
                  {speakingItem === activeCard.academicExample && (
                    <div className="flex justify-center pt-2 animate-fade-in">
                      <AudioPlaybackWaveform
                        isPlaying={true}
                        isLoading={false}
                        height={26}
                        barCount={18}
                        showLabel={true}
                        label="Practice Sentence Audio"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                    High-Frequency Collocations
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeCard.collocations.map((col, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Status Indicator */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-400">
              <span>Status: <strong className="capitalize text-slate-700 dark:text-slate-300">{srsState[activeCard.id] || 'Learning'}</strong></span>
              <span>Tap to Flip</span>
            </div>
          </div>

          {/* SRS Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setCardStatus('learning')}
              className="py-2.5 px-3 rounded-2xl bg-white dark:bg-[#101B32] border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <span>Hard / Learning</span>
            </button>
            <button
              onClick={() => setCardStatus('review')}
              className="py-2.5 px-3 rounded-2xl bg-white dark:bg-[#101B32] border border-amber-200 dark:border-amber-900/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <span>Needs Review</span>
            </button>
            <button
              onClick={() => setCardStatus('mastered')}
              className="py-2.5 px-3 rounded-2xl bg-white dark:bg-[#101B32] border border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Mastered!</span>
            </button>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handlePrev}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              <span>Next Card</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 space-y-2">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
          <h4 className="text-base font-bold text-slate-900 dark:text-white">All Cards Mastered in This Bucket!</h4>
          <p className="text-xs text-slate-500">Switch filter to "All Cards" or explore other categories.</p>
          <button
            onClick={() => setFilterStatus('all')}
            className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
          >
            View All Cards
          </button>
        </div>
      )}
    </div>
  );
};
