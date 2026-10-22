import React, { useState } from 'react';
import {
  ArrowLeft,
  Search,
  Volume2,
  VolumeX,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Copy,
  Check,
  Filter,
  X,
  HelpCircle,
  Award,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { IELTS_GRAMMAR_DATA, GRAMMAR_CATEGORIES, GrammarRule } from '../../data/grammarData';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';

interface GrammarLabPageProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

export const GrammarLabPage: React.FC<GrammarLabPageProps> = ({ onBack, onShowToast }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedBand, setSelectedBand] = useState<string>('All');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  const filteredRules = IELTS_GRAMMAR_DATA.filter((rule) => {
    const matchCategory = selectedCategory === 'All' || rule.category === selectedCategory;
    const matchBand = selectedBand === 'All' || rule.bandTarget === selectedBand;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      rule.title.toLowerCase().includes(q) ||
      rule.title_bn.toLowerCase().includes(q) ||
      rule.formula.toLowerCase().includes(q) ||
      rule.explanation_en.toLowerCase().includes(q) ||
      rule.explanation_bn.toLowerCase().includes(q) ||
      rule.bandBoostExample.toLowerCase().includes(q) ||
      rule.memoryTrick.toLowerCase().includes(q) ||
      rule.memoryTrick_bn.toLowerCase().includes(q);

    return matchCategory && matchBand && matchSearch;
  });

  const handlePlayVoice = (rule: GrammarRule) => {
    if (playingId === rule.id) {
      stopSpeech();
      setPlayingId(null);
      return;
    }
    setPlayingId(rule.id);
    speakBritish(`${rule.title}. Model sentence: ${rule.bandBoostExample}`, {
      onEnd: () => setPlayingId(null)
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onShowToast(`Copied formula: "${text}"`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelectAnswer = (ruleId: string, optionIdx: number, correctIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [ruleId]: optionIdx }));
    if (optionIdx === correctIdx) {
      soundManager.playSuccess();
      onShowToast('Correct! Great grammatical precision.');
    } else {
      soundManager.playBeep(400, 0.08);
      onShowToast('Incorrect option. Review the explanation below.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Top Bar with Back Button & Breadcrumbs */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Learn</span>
        </button>

        <div className="text-right">
          <div className="text-xs font-bold text-slate-900 font-mono">GRAMMAR LAB</div>
          <div className="text-[10px] text-slate-400">{filteredRules.length} Core Rules Available</div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-md border border-teal-800/40">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-teal-400/30">
            25% OF WRITING & SPEAKING SCORE
          </span>
          <span className="text-[11px] text-teal-200">
            🇬🇧 Grammatical Range & Accuracy (GRA)
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          IELTS Master Grammar & Memory Tricks
        </h1>
        <p className="text-xs sm:text-sm text-teal-100 mt-1 max-w-xl">
          High-yield academic syntax, complex sentence formulas, negative inversion, and catchy memory tricks designed to unlock Band 7.5 to 9.0 without memorizing endless textbook jargon.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search rule, formula, or trick (e.g. Although, Inversion, Uncountable, The number of, Cleft)..."
          className="w-full pl-9 pr-9 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white shadow-2xs"
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
          <Filter className="w-3.5 h-3.5 text-teal-600" />
          Topic:
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {GRAMMAR_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  soundManager.playBeep(600, 0.04);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                  isActive
                    ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Band Target Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap shrink-0 font-mono uppercase">
          Target Band:
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {['All', 'Essential Accuracy', 'Band 7.0+', 'Band 8.0+'].map((b) => {
            const isActive = selectedBand === b;
            return (
              <button
                key={b}
                onClick={() => {
                  setSelectedBand(b);
                  soundManager.playBeep(600, 0.04);
                }}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition border ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {b}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grammar Rules List */}
      <div className="space-y-4">
        {filteredRules.map((rule) => {
          const isQuizOpen = expandedQuizId === rule.id;
          const userSelectedIdx = selectedAnswers[rule.id];
          const hasAnswered = userSelectedIdx !== undefined;

          return (
            <div
              key={rule.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4 hover:border-slate-300 transition"
            >
              {/* Rule Card Header */}
              <div className="flex flex-wrap items-start justify-between gap-2.5">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 font-mono font-bold text-[10px] border border-teal-200">
                      {rule.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono font-bold text-[10px] ${
                        rule.bandTarget === 'Band 8.0+'
                          ? 'bg-purple-100 text-purple-800'
                          : rule.bandTarget === 'Band 7.0+'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {rule.bandTarget}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Relevance: {rule.moduleRelevance}
                    </span>
                  </div>

                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    {rule.title}
                  </h2>
                  <p className="text-xs font-bold text-teal-700 mt-0.5">
                    {rule.title_bn}
                  </p>
                </div>

                {/* Voice and Copy Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handlePlayVoice(rule)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-teal-100 text-slate-700 hover:text-teal-800 transition"
                    title="Listen to authentic British pronunciation"
                  >
                    {playingId === rule.id ? (
                      <VolumeX className="w-4 h-4 text-teal-600 animate-pulse" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => handleCopy(rule.formula, rule.id)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    title="Copy grammar formula"
                  >
                    {copiedId === rule.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Formula Strip */}
              <div className="p-3 bg-slate-900 text-amber-300 font-mono text-xs rounded-2xl border border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">
                    📐 Formula:
                  </span>
                  <span className="font-semibold text-white whitespace-nowrap">{rule.formula}</span>
                </div>
              </div>

              {/* Explanations (Dual English & Bengali) */}
              <div className="space-y-1 text-xs leading-relaxed">
                <p className="text-slate-600">{rule.explanation_en}</p>
                <p className="text-slate-800 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  🇧🇩 <strong>সহজ ব্যাখ্যা:</strong> {rule.explanation_bn}
                </p>
              </div>

              {/* Before vs After Examples */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Weak / Erroneous */}
                <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1 font-mono">
                    <X className="w-3.5 h-3.5 text-rose-600" />
                    Weak / Common Candidate Trap
                  </div>
                  <p className="text-rose-950 font-medium italic">
                    "{rule.weakExample}"
                  </p>
                </div>

                {/* Band Boost */}
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Band 8+ Academic Polish
                  </div>
                  <p className="text-emerald-950 font-medium">
                    "{rule.bandBoostExample}"
                  </p>
                </div>
              </div>

              {/* 💡 Highlighted Memory Trick */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 font-mono uppercase tracking-wide">
                  <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>💡 Memory Trick: {rule.memoryTrick}</span>
                </div>
                <p className="text-xs text-amber-950 font-medium leading-relaxed pl-5">
                  {rule.memoryTrick_bn}
                </p>
              </div>

              {/* ⚠️ Trap Alert */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">IELTS Examiner Trap: </strong>
                  <span>{rule.commonTrap}</span>
                </div>
              </div>

              {/* Mini Practice Quiz Drawer */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() =>
                    setExpandedQuizId(isQuizOpen ? null : rule.id)
                  }
                  className="w-full py-1.5 flex items-center justify-between text-xs font-bold text-teal-700 hover:text-teal-900 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4" />
                    <span>Test Yourself: Rapid Check Question</span>
                  </span>
                  {isQuizOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {isQuizOpen && (
                  <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-fadeIn text-xs">
                    <p className="font-bold text-slate-900">
                      {rule.practiceQuestion.question}
                    </p>

                    <div className="space-y-1.5">
                      {rule.practiceQuestion.options.map((opt, optIdx) => {
                        const isSelected = userSelectedIdx === optIdx;
                        const isCorrect =
                          hasAnswered && optIdx === rule.practiceQuestion.correctIndex;
                        const isWrongSelection =
                          hasAnswered && isSelected && !isCorrect;

                        return (
                          <button
                            key={optIdx}
                            disabled={hasAnswered}
                            onClick={() =>
                              handleSelectAnswer(
                                rule.id,
                                optIdx,
                                rule.practiceQuestion.correctIndex
                              )
                            }
                            className={`w-full p-2.5 rounded-xl text-left font-medium transition border flex items-center justify-between ${
                              isCorrect
                                ? 'bg-emerald-100 text-emerald-950 border-emerald-400 font-bold'
                                : isWrongSelection
                                ? 'bg-rose-100 text-rose-950 border-rose-400'
                                : isSelected
                                ? 'bg-teal-50 text-teal-900 border-teal-300'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>{opt}</span>
                            {isCorrect && (
                              <Check className="w-4 h-4 text-emerald-700 shrink-0 ml-2" />
                            )}
                            {isWrongSelection && (
                              <X className="w-4 h-4 text-rose-700 shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {hasAnswered && (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                        <strong className="text-slate-900">Explanation: </strong>
                        {rule.practiceQuestion.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredRules.length === 0 && (
        <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No grammar rules found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query or reset category and band filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setSelectedBand('All');
            }}
            className="px-4 py-2 rounded-xl bg-teal-700 text-white font-bold text-xs"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};
