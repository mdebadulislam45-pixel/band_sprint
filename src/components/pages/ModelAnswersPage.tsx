import React, { useState } from 'react';
import {
  ArrowLeft,
  Search,
  Volume2,
  VolumeX,
  Sparkles,
  BookOpen,
  Award,
  CheckCircle2,
  Filter,
  Eye,
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react';
import { BAND_9_MODEL_ANSWERS, ModelAnswerItem } from '../../data/band9ModelAnswers';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';

interface ModelAnswersPageProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

export const ModelAnswersPage: React.FC<ModelAnswersPageProps> = ({ onBack, onShowToast }) => {
  const [selectedTaskType, setSelectedTaskType] = useState<'All' | 'Task 1' | 'Task 2'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAnswerId, setSelectedAnswerId] = useState<string>(BAND_9_MODEL_ANSWERS[0].id);
  const [highlightFilter, setHighlightFilter] = useState<'ALL' | 'TR' | 'CC' | 'LR' | 'GRA'>('ALL');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'annotated' | 'examiner' | 'vocab'>('annotated');

  const filteredAnswers = BAND_9_MODEL_ANSWERS.filter((item) => {
    const matchType = selectedTaskType === 'All' || item.taskType === selectedTaskType;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.subType.toLowerCase().includes(q) ||
      item.prompt.toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  const activeAnswer =
    BAND_9_MODEL_ANSWERS.find((item) => item.id === selectedAnswerId) ||
    filteredAnswers[0] ||
    BAND_9_MODEL_ANSWERS[0];

  const handlePlayVoice = () => {
    if (isPlayingAudio) {
      stopSpeech();
      setIsPlayingAudio(false);
      return;
    }
    setIsPlayingAudio(true);
    speakBritish(activeAnswer.fullText, {
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false)
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeAnswer.fullText);
    setCopied(true);
    onShowToast('Model answer copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getHighlightBadge = (type?: string) => {
    switch (type) {
      case 'TR':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'CC':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'LR':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'GRA':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      default:
        return '';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] hover:border-[#0F4C45] text-[#0E1F1E] dark:text-[#EEF3F1] text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Learn</span>
        </button>

        <div className="text-right">
          <div className="text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1] font-mono">BAND 9 MODEL ANSWERS</div>
          <div className="text-[11px] text-[#566664] dark:text-[#96B0AC]">Color-Coded Examiner Analysis</div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-[#0F4C45] dark:bg-[#0D3833] text-white p-6 sm:p-7 rounded-2xl border border-[#1F8A70]/35 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-2 text-xs font-mono">
          <span className="text-[#F4A62A] font-bold uppercase tracking-wider">
            BAND 9 WRITING SAMPLES
          </span>
          <span className="text-white/50">·</span>
          <span className="text-white/80">
            Task 1 &amp; Task 2 Annotated Responses
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
          IELTS Band 9.0 Model Answer Bank
        </h1>
        <p className="text-xs sm:text-sm text-white/80 mt-1.5 max-w-2xl leading-relaxed">
          Study high-scoring sample essays with color-coded annotations for Lexical Resource, Grammar, Cohesion, and Task Response, paired with British voice read-aloud.
        </p>
      </div>

      {/* Selector and Filter Strip */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Task Type Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(['All', 'Task 1', 'Task 2'] as const).map((type) => {
            const isActive = selectedTaskType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setSelectedTaskType(type);
                  soundManager.playBeep(600, 0.04);
                }}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                  isActive
                    ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                    : 'bg-white dark:bg-[#11201E] text-[#566664] dark:text-[#96B0AC] border-[#D3DDDA] dark:border-[#1E3330] hover:border-[#0F4C45]'
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topic or chart type..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Essay Picker Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {filteredAnswers.map((item) => {
          const isSelected = activeAnswer.id === item.id;
          return (
            <div
              key={item.id}
              onClick={() => {
                setSelectedAnswerId(item.id);
                soundManager.playBeep(700, 0.04);
              }}
              className={`p-3 rounded-2xl border transition cursor-pointer text-left ${
                isSelected
                  ? 'bg-amber-50 border-amber-500 shadow-2xs ring-1 ring-amber-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 mb-1">
                <span>{item.taskType}</span>
                <span className="text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                  {item.subType}
                </span>
              </div>
              <h3 className="text-xs font-black text-slate-900 truncate">
                {item.title}
              </h3>
              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                {item.prompt}
              </p>
            </div>
          );
        })}
      </div>

      {/* Active Model Answer Viewer */}
      {activeAnswer && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-5">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-mono font-bold text-[10px]">
                  BAND 9.0 BENCHMARK
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px]">
                  {activeAnswer.taskType} · {activeAnswer.subType}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {activeAnswer.wordCount} words
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                {activeAnswer.title}
              </h2>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayVoice}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              >
                {isPlayingAudio ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    <span>Stop Audio</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Listen (UK Audio)</span>
                  </>
                )}
              </button>

              <button
                onClick={handleCopy}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                title="Copy essay"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Exam Prompt Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
            <div className="text-[10px] font-mono font-bold uppercase text-slate-400">
              Exam Prompt:
            </div>
            <p className="text-slate-800 font-medium italic">
              "{activeAnswer.prompt}"
            </p>
          </div>

          {/* Navigation Tabs (Annotated Text vs Examiner Commentary vs Key Vocabulary) */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('annotated')}
              className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 -mb-[2px] ${
                activeTab === 'annotated'
                  ? 'border-amber-600 text-amber-900'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              Annotated Response
            </button>
            <button
              onClick={() => setActiveTab('examiner')}
              className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 -mb-[2px] ${
                activeTab === 'examiner'
                  ? 'border-amber-600 text-amber-900'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              Examiner Commentary
            </button>
            <button
              onClick={() => setActiveTab('vocab')}
              className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 -mb-[2px] ${
                activeTab === 'vocab'
                  ? 'border-amber-600 text-amber-900'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              Key Vocabulary ({activeAnswer.keyVocabulary.length})
            </button>
          </div>

          {/* Tab 1: Annotated Response */}
          {activeTab === 'annotated' && (
            <div className="space-y-4">
              {/* Highlight Toggles */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 rounded-2xl border border-slate-100 text-[11px]">
                <span className="font-mono text-slate-400 font-bold px-1.5">Filter by Criterion:</span>
                <button
                  onClick={() => setHighlightFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    highlightFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  All Elements
                </button>
                <button
                  onClick={() => setHighlightFilter('TR')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    highlightFilter === 'TR'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-900 border border-amber-200'
                  }`}
                >
                  🟠 Task Response / Achievement
                </button>
                <button
                  onClick={() => setHighlightFilter('CC')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    highlightFilter === 'CC'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  }`}
                >
                  🟢 Coherence & Cohesion
                </button>
                <button
                  onClick={() => setHighlightFilter('LR')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    highlightFilter === 'LR'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-50 text-purple-900 border border-purple-200'
                  }`}
                >
                  🟣 Lexical Resource
                </button>
                <button
                  onClick={() => setHighlightFilter('GRA')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    highlightFilter === 'GRA'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-900 border border-blue-200'
                  }`}
                >
                  🔵 Grammar Range & Accuracy
                </button>
              </div>

              {/* Annotated Essay Paragraphs */}
              <div className="space-y-3.5 text-xs sm:text-sm text-slate-800 leading-relaxed font-serif">
                {activeAnswer.annotatedParagraphs.map((paragraph, pIdx) => (
                  <p key={pIdx} className="p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100">
                    {paragraph.map((seg, sIdx) => {
                      const shouldHighlight =
                        seg.type && (highlightFilter === 'ALL' || highlightFilter === seg.type);

                      return (
                        <span
                          key={sIdx}
                          title={seg.note ? `[${seg.type}]: ${seg.note}` : undefined}
                          className={`${
                            shouldHighlight
                              ? `px-1 py-0.5 rounded border ${getHighlightBadge(seg.type)} font-sans font-medium`
                              : ''
                          }`}
                        >
                          {seg.text}
                        </span>
                      );
                    })}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Examiner Commentary */}
          {activeTab === 'examiner' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
                <div className="text-[11px] font-mono font-bold text-emerald-900 uppercase">
                  Overall Band 9.0 Assessment
                </div>
                <p className="text-emerald-950 font-medium leading-relaxed">
                  {activeAnswer.examinerCommentary.overall}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-1">
                  <div className="font-bold text-amber-900 flex items-center gap-1">
                    <span>Task Achievement / Response (TR)</span>
                  </div>
                  <p className="text-amber-950 leading-relaxed">
                    {activeAnswer.examinerCommentary.taskAchievement}
                  </p>
                </div>

                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-1">
                  <div className="font-bold text-emerald-900 flex items-center gap-1">
                    <span>Coherence and Cohesion (CC)</span>
                  </div>
                  <p className="text-emerald-950 leading-relaxed">
                    {activeAnswer.examinerCommentary.coherenceCohesion}
                  </p>
                </div>

                <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-1">
                  <div className="font-bold text-purple-900 flex items-center gap-1">
                    <span>Lexical Resource (LR)</span>
                  </div>
                  <p className="text-purple-950 leading-relaxed">
                    {activeAnswer.examinerCommentary.lexicalResource}
                  </p>
                </div>

                <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-1">
                  <div className="font-bold text-blue-900 flex items-center gap-1">
                    <span>Grammatical Range and Accuracy (GRA)</span>
                  </div>
                  <p className="text-blue-950 leading-relaxed">
                    {activeAnswer.examinerCommentary.grammarAccuracy}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Key Vocabulary */}
          {activeTab === 'vocab' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {activeAnswer.keyVocabulary.map((vocab, vIdx) => (
                <div
                  key={vIdx}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1"
                >
                  <div className="font-bold text-slate-900 text-sm">
                    {vocab.word}
                  </div>
                  <div className="text-purple-800 font-bold">
                    🇧🇩 {vocab.meaning_bn}
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {vocab.definition}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
