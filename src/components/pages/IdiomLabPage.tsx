import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Volume2,
  VolumeX,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
  Filter,
  X,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { RICH_IDIOMS_DATABASE } from '../../data/richVocabulary';
import { BAND_7_9_PHRASES_AND_IDIOMS } from '../../data/band7to9PhrasesAndIdioms';
import { B2_IDIOMS_AND_WORDS } from '../../data/b2IdiomsWords';
import { C1_IDIOMS_AND_PHRASES } from '../../data/c1IdiomsAndPhrasesData';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';
import { VocabVisualBanner } from '../vocab/VocabVisualCue';

interface IdiomLabPageProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

interface IdiomItem {
  id: string;
  idiom: string;
  banglaMeaning: string;
  englishMeaning: string;
  example: string;
  difficulty: string;
  warning?: string;
  speaking_suitability?: string;
}

export const IdiomLabPage: React.FC<IdiomLabPageProps> = ({ onBack, onShowToast }) => {
  const allIdioms: IdiomItem[] = React.useMemo(() => {
    const list: IdiomItem[] = [];
    const seen = new Set<string>();

    // 1. From RICH_IDIOMS_DATABASE
    for (const item of RICH_IDIOMS_DATABASE) {
      if (!seen.has(item.idiom.toLowerCase())) {
        seen.add(item.idiom.toLowerCase());
        list.push({
          id: item.id,
          idiom: item.idiom,
          banglaMeaning: item.banglaMeaning,
          englishMeaning: item.englishMeaning,
          example: item.exampleSentence,
          difficulty: item.difficulty,
          warning: item.warning,
          speaking_suitability: item.ieltsSpeakingSuitability
        });
      }
    }

    // 2. From BAND_7_9_PHRASES_AND_IDIOMS (type idiom)
    for (const item of BAND_7_9_PHRASES_AND_IDIOMS) {
      if (item.category === 'idiom' && !seen.has(item.word.toLowerCase())) {
        seen.add(item.word.toLowerCase());
        list.push({
          id: item.id,
          idiom: item.word,
          banglaMeaning: item.meaning_bn,
          englishMeaning: item.definition,
          example: item.example,
          difficulty: item.level,
          warning: item.warning,
          speaking_suitability: item.ielts_usage
        });
      }
    }

    // 3. From B2_IDIOMS_AND_WORDS (B2 idioms — the B2 ladder below C1/C2)
    for (const item of B2_IDIOMS_AND_WORDS) {
      if (item.type === 'Idiom' && !seen.has(item.phrase.toLowerCase())) {
        seen.add(item.phrase.toLowerCase());
        list.push({
          id: `b2_${item.id}`,
          idiom: item.phrase,
          banglaMeaning: item.banglaMeaning,
          englishMeaning: `B2 idiom for IELTS ${item.ieltsSuitability} — see the example sentence for its meaning in context.`,
          example: item.exampleSentence,
          difficulty: 'B2',
          speaking_suitability: item.ieltsSuitability
        });
      }
    }

    // 4. From C1_IDIOMS_AND_PHRASES (C1/C2 idioms — were never shown here before)
    for (const item of C1_IDIOMS_AND_PHRASES) {
      if (item.type === 'Idiom' && !seen.has(item.phrase.toLowerCase())) {
        seen.add(item.phrase.toLowerCase());
        const level = item.cefrLevel || (item.category === 'C2 Band-9 Mastery' ? 'C2' : 'C1');
        list.push({
          id: `c1c2_${item.id}`,
          idiom: item.phrase,
          banglaMeaning: item.banglaMeaning,
          englishMeaning: `${level} idiom for IELTS ${item.ieltsSuitability} — see the example sentence for its meaning in context.`,
          example: item.exampleSentence,
          difficulty: level,
          speaking_suitability: item.ieltsSuitability
        });
      }
    }

    return list;
  }, []);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedIdiom, setSelectedIdiom] = useState<IdiomItem | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredIdioms = allIdioms.filter((i) => {
    const matchDiff = selectedDifficulty === 'All' || i.difficulty === selectedDifficulty;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      i.idiom.toLowerCase().includes(q) ||
      i.banglaMeaning.toLowerCase().includes(q) ||
      i.englishMeaning.toLowerCase().includes(q) ||
      i.example.toLowerCase().includes(q);

    return matchDiff && matchSearch;
  });

  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedIdiom(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCardClick = (item: IdiomItem) => {
    // Toggle inline expansion for instant zero-modal view, or open preview
    setExpandedCardId(prev => (prev === item.id ? null : item.id));
    soundManager.playBeep(650, 0.04);
  };

  const handlePlayVoice = (item: IdiomItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (playingId === item.id) {
      stopSpeech();
      setPlayingId(null);
      return;
    }
    setPlayingId(item.id);
    speakBritish(`${item.idiom}. Meaning: ${item.englishMeaning}. Example: ${item.example}`, {
      deliveryProfile: 'vocabulary_example',
      onEnd: () => setPlayingId(null),
      onError: () => setPlayingId(null)
    });
  };

  const handleCopy = (text: string, id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onShowToast(`Copied idiom: "${text}"`);
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
          <div className="text-xs font-bold text-slate-900 font-mono">IDIOM LAB</div>
          <div className="text-[10px] text-slate-400">{filteredIdioms.length} Idioms Available</div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-yellow-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-sm border border-amber-800/40">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold">
            IELTS SPEAKING HIGH-SCORE
          </span>
          <span className="text-[11px] text-amber-200">🇬🇧 British Pronunciation</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white">
          IELTS Spoken Idioms Lab
        </h1>
        <p className="text-xs text-amber-100 mt-1 max-w-xl">
          Natural idiomatic expressions for Speaking Parts 1, 2, and 3 with clear warnings to protect your Academic Writing score.
        </p>
      </div>

      {/* Search & Level Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search idiom or Bangla meaning (e.g. Break the ice, কদাচিৎ, Piece of cake)..."
            className="w-full pl-9 pr-9 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white shadow-2xs"
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

        {/* Difficulty Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['All', 'B1', 'B2', 'C1', 'C2'].map((diff) => {
            const isActive = selectedDifficulty === diff;
            return (
              <button
                key={diff}
                onClick={() => {
                  setSelectedDifficulty(diff);
                  soundManager.playBeep(600, 0.04);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 font-black border-amber-500 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {diff === 'All' ? 'All Levels' : diff}
              </button>
            );
          })}
        </div>
      </div>

      {/* Idioms List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredIdioms.map((item) => {
          const isExpanded = expandedCardId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => handleCardClick(item)}
              className={`p-4 rounded-2xl bg-white border transition cursor-pointer flex flex-col justify-between space-y-3 group shadow-2xs hover:shadow-xs ${
                isExpanded ? 'border-amber-400 ring-2 ring-amber-100 bg-amber-50/10' : 'border-slate-200 hover:border-amber-300'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200">
                    {item.difficulty} Level
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handlePlayVoice(item, e)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 transition"
                      title="British English audio"
                    >
                      {playingId === item.id ? (
                        <VolumeX className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={(e) => handleCopy(item.idiom, item.id, e)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                      title="Copy idiom"
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
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-amber-800 transition">
                    {item.idiom}
                  </h3>
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-700 mt-0.5 font-bengali leading-relaxed">
                    বাংলা অর্থ: {item.banglaMeaning}
                  </p>
                </div>

                {/* Visual Metaphor & Idiomatic Cue */}
                <VocabVisualBanner
                  item={item.idiom}
                  category="idiom"
                  compact={true}
                />

                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.englishMeaning}
                </p>

                {/* Inline Expansion (No Black Screen) */}
                {isExpanded && (
                  <div className="pt-2 border-t border-amber-100 space-y-2.5 text-xs animate-fadeIn">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5 font-mono">
                        Practice Example:
                      </span>
                      <p className="text-slate-800 italic font-medium">
                        "{item.example}"
                      </p>
                    </div>

                    {item.speaking_suitability && (
                      <div className="bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 text-[11px] text-indigo-950 font-bengali">
                        <span className="font-bold text-indigo-700 block mb-0.5 font-sans">
                          🗣 Speaking Band 8+ Tip:
                        </span>
                        {item.speaking_suitability}
                      </div>
                    )}

                    {item.warning && (
                      <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-950 flex items-start gap-1.5 font-bengali">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-amber-900 font-sans">Task 2 Caution:</strong>
                          {item.warning}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Card Footer: Inline toggle + Full Details Modal Button */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setExpandedCardId(isExpanded ? null : item.id);
                    soundManager.playBeep(520, 0.03);
                  }}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  {isExpanded ? 'সংক্ষেপ করুন ▴' : 'উদাহরণ দেখুন ▾'}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    soundManager.playBeep(620, 0.04);
                    setSelectedIdiom(item);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 font-bold text-[11px] font-bengali flex items-center gap-1 transition cursor-pointer"
                >
                  <BookOpen className="w-3 h-3 text-amber-700" />
                  <span>বিস্তারিত অর্থ ও ব্যবহার →</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredIdioms.length === 0 && (
        <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Lightbulb className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No idioms found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query or reset the difficulty filter.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedDifficulty('All');
            }}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Idiom Details Modal with Clean Backdrop & Click-Outside Dismissal */}
      {selectedIdiom && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedIdiom(null);
          }}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 cursor-pointer overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-fadeIn my-auto cursor-default text-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-50 text-amber-900 px-2.5 py-0.5 rounded-md border border-amber-200">
                {selectedIdiom.difficulty} Difficulty · Idiom Details
              </span>
              <button
                onClick={() => setSelectedIdiom(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
                title="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">
                  {selectedIdiom.idiom}
                </h2>
                <button
                  onClick={() => handlePlayVoice(selectedIdiom)}
                  className="p-1.5 rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 transition cursor-pointer"
                  title="Listen in British accent"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Highlighted Bangla Meaning Box with Bangla Font */}
              <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 text-slate-900 mt-2.5 space-y-1">
                <div className="text-[11px] font-mono font-bold uppercase text-amber-900">
                  বাংলা অর্থ ও ভাবার্থ:
                </div>
                <div className="text-base font-extrabold text-slate-900 font-bengali leading-snug">
                  {selectedIdiom.banglaMeaning}
                </div>
              </div>

              <div className="text-xs text-slate-600 mt-2 leading-relaxed">
                <span className="font-bold text-slate-700">English Definition: </span>
                {selectedIdiom.englishMeaning}
              </div>
            </div>

            <div className="space-y-3 text-xs max-h-[45vh] overflow-y-auto pr-1">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1 font-mono">
                  Practice Example in Context
                </span>
                <p className="text-slate-800 italic font-serif leading-relaxed">
                  "{selectedIdiom.example}"
                </p>
              </div>

              {selectedIdiom.speaking_suitability && (
                <div className="bg-indigo-50/80 p-3 rounded-2xl border border-indigo-200 font-bengali">
                  <span className="text-[10px] uppercase font-bold text-indigo-800 block mb-1 font-sans">
                    🗣 IELTS Speaking Band 8+ টিপস:
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {selectedIdiom.speaking_suitability}
                  </p>
                </div>
              )}

              {selectedIdiom.warning && (
                <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 font-bengali">
                  <span className="text-[10px] uppercase font-bold text-amber-900 block mb-1 flex items-center gap-1 font-sans">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Writing Task 2 সতর্কতা (Safety Warning):
                  </span>
                  <p className="text-amber-950 font-medium leading-relaxed">
                    {selectedIdiom.warning}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedIdiom(null)}
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
