import React, { useState } from 'react';
import {
  ArrowLeft,
  Search,
  Volume2,
  VolumeX,
  Sparkles,
  BookOpen,
  Filter,
  CheckCircle2,
  Copy,
  Check,
  RotateCcw,
  Award
} from 'lucide-react';
import { ACADEMIC_COLLOCATIONS, CollocationItem } from '../../data/collocationsData';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';

interface CollocationLabPageProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

export const CollocationLabPage: React.FC<CollocationLabPageProps> = ({ onBack, onShowToast }) => {
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const types = ['All', 'Verb + Noun', 'Adjective + Noun', 'Adverb + Adjective'];
  const topics = [
    'All',
    'Society & Culture',
    'Environment & Energy',
    'Technology & Science',
    'Education & Work',
    'Economy & Politics'
  ];

  const filteredCollocations = ACADEMIC_COLLOCATIONS.filter((item) => {
    const matchType = selectedType === 'All' || item.type === selectedType;
    const matchTopic = selectedTopic === 'All' || item.topic === selectedTopic;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      item.phrase.toLowerCase().includes(q) ||
      item.meaning_bn.toLowerCase().includes(q) ||
      item.definition.toLowerCase().includes(q) ||
      item.ieltsExample.toLowerCase().includes(q);

    return matchType && matchTopic && matchSearch;
  });

  const handlePlayVoice = (item: CollocationItem) => {
    if (playingId === item.id) {
      stopSpeech();
      setPlayingId(null);
      return;
    }
    setPlayingId(item.id);
    speakBritish(`${item.phrase}. Example: ${item.ieltsExample}`, {
      onEnd: () => setPlayingId(null)
    });
  };

  const handleCopy = (phrase: string, id: string) => {
    navigator.clipboard.writeText(phrase);
    setCopiedId(id);
    onShowToast(`Copied: "${phrase}"`);
    setTimeout(() => setCopiedId(null), 2000);
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
          <div className="text-xs font-bold text-slate-900 font-mono">COLLOCATION LAB</div>
          <div className="text-[10px] text-slate-400">Band 8.0–9.0 Lexical Resource</div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-7 rounded-3xl shadow-md border border-blue-800/40">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-blue-400/30">
            50% OF LEXICAL RESOURCE SCORE
          </span>
          <span className="text-[11px] text-blue-200">
            Natural Academic Word Pairings
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          IELTS Academic Collocation Dictionary
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
          Examiners reward candidates who use natural words that belong together (e.g. <em>"pose a threat"</em> instead of <em>"make a danger"</em>). Master high-yield pairings for Writing Task 2 & Speaking.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search collocation or meaning (e.g. pose a threat, stark contrast, deeply ingrained)..."
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
        />
      </div>

      {/* Type Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap shrink-0 uppercase font-mono">
          Type:
        </span>
        {types.map((type) => {
          const isActive = selectedType === type;
          return (
            <button
              key={type}
              onClick={() => {
                setSelectedType(type);
                soundManager.playBeep(600, 0.04);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                isActive
                  ? 'bg-blue-700 text-white border-blue-700 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {type}
            </button>
          );
        })}
      </div>

      {/* Collocation List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCollocations.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-mono font-bold border border-blue-200">
                  {item.type}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {item.topic}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {item.phrase}
                </h3>
                <div className="text-xs font-bold text-blue-700">
                  🇧🇩 {item.meaning_bn}
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                {item.definition}
              </p>

              {/* IELTS Example Sentence */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-800 italic leading-relaxed">
                "{item.ieltsExample}"
              </div>

              {/* Synonym Alternatives */}
              <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                <span className="font-mono text-slate-400">Synonyms:</span>
                {item.synonymAlternatives.map((syn, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px]"
                  >
                    {syn}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handlePlayVoice(item)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 text-xs font-bold transition flex items-center gap-1.5"
              >
                {playingId === item.id ? (
                  <VolumeX className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                <span>British Audio</span>
              </button>

              <button
                onClick={() => handleCopy(item.phrase, item.id)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                title="Copy collocation"
              >
                {copiedId === item.id ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
