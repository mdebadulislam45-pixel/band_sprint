import React, { useState } from 'react';
import {
  ArrowLeft,
  Search,
  Volume2,
  VolumeX,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Filter,
  X,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { RICH_PHRASES_DATABASE } from '../../data/richVocabulary';
import { BAND_7_9_PHRASES_AND_IDIOMS } from '../../data/band7to9PhrasesAndIdioms';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';
import { VocabVisualBanner } from '../vocab/VocabVisualCue';

interface UsefulPhrasesPageProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

interface PhraseItem {
  id: string;
  phrase: string;
  meaning_bn: string;
  category: string;
  example: string;
  explanation?: string;
  situation?: string;
  formality?: string;
  ielts_speaking?: string;
  ielts_writing?: string;
  warning?: string;
}

export const UsefulPhrasesPage: React.FC<UsefulPhrasesPageProps> = ({ onBack, onShowToast }) => {
  // Combine rich phrases and 200 items filtered by phrase
  const combinedPhrases: PhraseItem[] = React.useMemo(() => {
    const list: PhraseItem[] = [];
    const seen = new Set<string>();

    // 1. From RICH_PHRASES_DATABASE
    for (const p of RICH_PHRASES_DATABASE) {
      if (!seen.has(p.phrase.toLowerCase())) {
        seen.add(p.phrase.toLowerCase());
        list.push({
          id: p.id,
          phrase: p.phrase,
          meaning_bn: p.banglaMeaning,
          category: p.category,
          example: p.exampleSentence,
          explanation: p.explanation || 'Band 8+ conversational and academic discourse device.',
          situation: p.situation || 'IELTS Speaking Part 3 and Academic Writing Task 2 discussion.',
          formality: p.formality || 'Formal / Neutral',
          ielts_speaking: p.ieltsSpeakingUsefulness || 'Prevents hesitation pauses and demonstrates natural conversational rhythm.',
          ielts_writing: p.ieltsWritingUsefulness || 'High-yield cohesive connector for Task 2 academic essays.',
          warning: 'Ensure varied opening structures rather than starting multiple consecutive sentences with the same phrase.'
        });
      }
    }

    // 2. From BAND_7_9_PHRASES_AND_IDIOMS (type phrase)
    for (const item of BAND_7_9_PHRASES_AND_IDIOMS) {
      if (item.category === 'phrase' && !seen.has(item.word.toLowerCase())) {
        seen.add(item.word.toLowerCase());
        let cat = 'Speaking';
        const w = item.word.toLowerCase();
        if (w.includes('opinion') || w.includes('perspective') || w.includes('concerned')) cat = 'Opinion';
        else if (w.includes('contrast') || w.includes('hand') || w.includes('comparison') || w.includes('opposed')) cat = 'Comparison';
        else if (w.includes('agree') || w.includes('consensus') || w.includes('terms with')) cat = 'Agreement';
        else if (w.includes('instance') || w.includes('particular')) cat = 'Examples';
        else if (w.includes('extent') || w.includes('degree') || w.includes('large') || w.includes('saying')) cat = 'Everyday';
        else cat = 'Speaking';

        list.push({
          id: item.id,
          phrase: item.word,
          meaning_bn: item.meaning_bn,
          category: cat,
          example: item.example,
          explanation: item.definition && !item.definition.includes('পরিস্থিতি') ? item.definition : 'High-impact lexical device to improve cohesion, range, and band descriptors in IELTS.',
          situation: item.topic || 'Speaking Part 2/3 and Academic Writing Task 2.',
          formality: 'Formal / Neutral',
          ielts_speaking: item.ielts_usage || 'Use naturally to express complex logical relationships without robotic pauses.',
          ielts_writing: 'Suitable for Task 2 academic essays to boost Coherence & Cohesion.',
          warning: item.warning || 'Do not overuse; use naturally according to the argument flow.'
        });
      }
    }

    return list;
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPhrase, setSelectedPhrase] = useState<PhraseItem | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    'All',
    'Everyday',
    'Speaking',
    'IELTS Part 1',
    'IELTS Part 2',
    'IELTS Part 3',
    'Opinion',
    'Agreement',
    'Disagreement',
    'Examples',
    'Comparison'
  ];

  const filteredPhrases = combinedPhrases.filter((p) => {
    const matchCategory =
      selectedCategory === 'All' ||
      p.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      selectedCategory.toLowerCase().includes(p.category.toLowerCase());

    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      p.phrase.toLowerCase().includes(q) ||
      p.meaning_bn.toLowerCase().includes(q) ||
      p.example.toLowerCase().includes(q);

    return matchCategory && matchSearch;
  });

  const handlePlayVoice = (item: PhraseItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (playingId === item.id) {
      stopSpeech();
      setPlayingId(null);
      return;
    }
    setPlayingId(item.id);
    speakBritish(`${item.phrase}. For example: ${item.example}`, {
      onEnd: () => setPlayingId(null)
    });
  };

  const handleCopy = (text: string, id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onShowToast(`Copied: "${text}"`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 animate-fade-in pb-16">
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
          <div className="text-xs font-bold text-slate-900 font-mono">USEFUL PHRASES</div>
          <div className="text-[10px] text-slate-400">{filteredPhrases.length} Items Available</div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-sm border border-blue-800/50">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold">
            BAND 7–9 DISCOURSE
          </span>
          <span className="text-[11px] text-blue-200">🇬🇧 British Pronunciation</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white">
          IELTS Useful Phrases Lab
        </h1>
        <p className="text-xs text-blue-100 mt-1 max-w-xl">
          High-yield connective phrases, opinion expressions, discourse markers, and natural discussion openers for Speaking and Writing.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search phrase in English or Bengali (e.g. In the long run, তীব্র বৈপরীত্যে, In my opinion)..."
          className="w-full pl-9 pr-9 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap shrink-0 flex items-center gap-1 font-mono uppercase">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          Category:
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  soundManager.playBeep(600, 0.04);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Phrase Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredPhrases.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedPhrase(item)}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs transition cursor-pointer flex flex-col justify-between space-y-3 group"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                  {item.category}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handlePlayVoice(item, e)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 transition"
                    title="Listen in British English"
                  >
                    {playingId === item.id ? (
                      <VolumeX className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={(e) => handleCopy(item.phrase, item.id, e)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    title="Copy phrase"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-700 transition">
                  {item.phrase}
                </h3>
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-700 mt-0.5 font-bengali leading-relaxed">
                  বাংলা অর্থ: {item.meaning_bn}
                </p>
              </div>

              {/* Visual Category & Mnemonic Cue */}
              <VocabVisualBanner
                item={item.phrase}
                topic={item.category}
                category="phrase"
                compact={true}
              />

              <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                "{item.example}"
              </p>
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-[11px] font-bengali flex items-center gap-1 transition">
                <BookOpen className="w-3.5 h-3.5 text-blue-700" />
                <span>বিস্তারিত অর্থ ও পরীক্ষার টিপস দেখুন →</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredPhrases.length === 0 && (
        <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No phrases found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query or reset the category filter to view more IELTS phrases.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Phrase Details Modal - Light-themed, accessible, mobile-first, zero blanking */}
      {selectedPhrase && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPhrase(null);
          }}
          className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border-2 border-slate-200 animate-fade-in my-auto relative text-slate-900 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-200">
                  {selectedPhrase.category}
                </span>
                <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {selectedPhrase.formality || 'Formal / Band 8+'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhrase(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95"
                title="Close dialog"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Phrase Title & Audio */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                  "{selectedPhrase.phrase}"
                </h2>
                <button
                  type="button"
                  onClick={() => handlePlayVoice(selectedPhrase)}
                  className="p-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition shrink-0 shadow-2xs active:scale-95"
                  title="Listen in British accent"
                  aria-label="Pronounce in British accent"
                >
                  {playingId === selectedPhrase.id ? (
                    <VolumeX className="w-4 h-4 text-blue-600 animate-pulse" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Visual Banner */}
              <VocabVisualBanner
                item={selectedPhrase.phrase}
                topic={selectedPhrase.category}
                category="phrase"
              />

              {/* Bangla Meaning Box */}
              <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 text-slate-900 text-xs sm:text-sm font-medium shadow-2xs space-y-1">
                <div className="font-mono text-[11px] uppercase font-bold text-amber-900">
                  বাংলা অর্থ ও মূল ভাব:
                </div>
                <div className="font-extrabold text-slate-900 text-sm sm:text-base font-bengali leading-snug">
                  {selectedPhrase.meaning_bn}
                </div>
              </div>
            </div>

            {/* Practice Context & Deep IELTS Details */}
            <div className="space-y-2.5 text-xs max-h-[48vh] overflow-y-auto pr-1">
              {/* Practice Example */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1 font-mono">
                  Practice Example in Context
                </span>
                <p className="text-slate-800 italic font-serif leading-relaxed text-xs sm:text-sm">
                  "{selectedPhrase.example}"
                </p>
              </div>

              {/* Academic Meaning & Explanation */}
              <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-200">
                <span className="text-[10px] uppercase font-bold text-blue-800 block mb-1 font-mono">
                  📖 Academic English Nuance & Purpose
                </span>
                <p className="text-slate-800 leading-relaxed font-medium">
                  {selectedPhrase.explanation || 'Band 7.5–9 discourse marker to maintain coherence and analytical sophistication.'}
                </p>
              </div>

              {/* Exam Timing & Situation */}
              {selectedPhrase.situation && (
                <div className="bg-slate-100/80 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-600 block mb-1 font-mono">
                    ⏱️ Optimal Exam Setting & Timing
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {selectedPhrase.situation}
                  </p>
                </div>
              )}

              {/* IELTS Speaking Application */}
              <div className="bg-rose-50/80 p-3 rounded-2xl border border-rose-200">
                <span className="text-[10px] uppercase font-bold text-rose-700 block mb-1 font-mono">
                  🗣️ IELTS Speaking Application (Band 8+)
                </span>
                <p className="text-slate-800 leading-relaxed font-medium">
                  {selectedPhrase.ielts_speaking || 'Use smoothly to transition between complex thoughts and display natural native cadence.'}
                </p>
              </div>

              {/* IELTS Writing Application */}
              <div className="bg-purple-50/80 p-3 rounded-2xl border border-purple-200">
                <span className="text-[10px] uppercase font-bold text-purple-700 block mb-1 font-mono">
                  ✍️ IELTS Writing Application (Task 2)
                </span>
                <p className="text-slate-800 leading-relaxed font-medium">
                  {selectedPhrase.ielts_writing || 'Suitable for thesis statements, counter-arguments, and conclusion transitions in Academic Writing.'}
                </p>
              </div>

              {/* Candidate Pitfall / Warning */}
              {selectedPhrase.warning && (
                <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200 text-amber-950">
                  <span className="text-[10px] uppercase font-bold text-amber-800 block mb-0.5 font-mono">
                    ⚠️ Candidate Note
                  </span>
                  <p className="leading-relaxed font-medium text-[11px]">
                    {selectedPhrase.warning}
                  </p>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 gap-2">
              <button
                type="button"
                onClick={(e) => handleCopy(selectedPhrase.phrase, selectedPhrase.id, e)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
              >
                {copiedId === selectedPhrase.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Phrase</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedPhrase(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
