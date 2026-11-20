import React, { useState } from 'react';
import {
  Volume2,
  Copy,
  Check,
  Search,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Filter,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Maximize2,
  X,
  VolumeX,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { VocabCard } from '../../types';
import { soundManager } from '../../utils/audioEffects';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { VocabVisualBanner } from './VocabVisualCue';
import { AudioPlaybackWaveform } from '../audio/AudioPlaybackWaveform';

interface PhrasesViewProps {
  phrases: VocabCard[];
  onToggleMastery: (id: string, e?: React.MouseEvent) => void;
  onSendToVault: (card: VocabCard, e?: React.MouseEvent) => void;
  onCopy: (card: VocabCard, e?: React.MouseEvent) => void;
  copiedId: string | null;
}

/**
 * Intelligent context fallbacks to prevent phrase details blanking
 */
function getGuaranteedDefinition(phrase: VocabCard): string {
  if (phrase.definition && phrase.definition.trim().length > 3 && !phrase.definition.includes('পরিস্থিতি')) {
    return phrase.definition;
  }
  return `An authentic Band 7.5–9 academic collocation/discourse device used to express sophisticated nuances in ${phrase.topic || 'IELTS Speaking and Writing'}.`;
}

function getGuaranteedIeltsUsage(phrase: VocabCard): string {
  if (phrase.ieltsUsage && phrase.ieltsUsage.trim().length > 3) {
    return phrase.ieltsUsage;
  }
  const itemLower = phrase.item.toLowerCase();
  if (itemLower.includes('opinion') || itemLower.includes('perspective') || itemLower.includes('believe')) {
    return 'Speaking Part 3 & Writing Task 2: High-yield thesis opener to establish a measured, nuanced point of view.';
  }
  if (itemLower.includes('hand') || itemLower.includes('contrast') || itemLower.includes('whereas')) {
    return 'Writing Task 2 & Speaking Part 3: Exemplary cohesive device for balancing counter-arguments and dual perspectives.';
  }
  if (itemLower.includes('example') || itemLower.includes('point') || itemLower.includes('illustrate')) {
    return 'Task 2 Body Paragraphs: Transition to specific real-world illustrations or empirical cases.';
  }
  return 'Speaking Part 1, 2 & 3 / Academic Writing: Elevates Lexical Resource and Grammatical Range without awkward hesitation.';
}

function getGuaranteedCollocations(phrase: VocabCard): string[] {
  if (phrase.collocations && phrase.collocations.length > 0) {
    return phrase.collocations;
  }
  const words = phrase.item.split(' ').filter((w) => w.length > 3);
  if (words.length >= 2) {
    return [
      `adopt a ${words[words.length - 1]} stance`,
      `profound ${words[0]} impact`,
      `consistently ${words.slice(0, 2).join(' ')}`
    ];
  }
  return ['highly recommended in Task 2', 'natural conversational stress', 'examiner-approved collocation'];
}

function getGuaranteedMistake(phrase: VocabCard): string {
  if (phrase.commonMistakes && phrase.commonMistakes.trim().length > 3) {
    return phrase.commonMistakes;
  }
  return '⚠️ Candidate Pitfall: Avoid using in consecutive sentences; ensure natural British sentence rhythm rather than mechanical recitation.';
}

function getGuaranteedUpgrade(phrase: VocabCard): string {
  if (phrase.beginnerPhrase && phrase.beginnerPhrase.trim().length > 1) {
    return phrase.beginnerPhrase;
  }
  return 'ordinary everyday phrasing';
}

export const PhrasesView: React.FC<PhrasesViewProps> = ({
  phrases,
  onToggleMastery,
  onSendToVault,
  onCopy,
  copiedId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedObjective, setSelectedObjective] = useState<string>('All');
  const [expandedPhraseId, setExpandedPhraseId] = useState<string | null>(null);
  const [modalPhrase, setModalPhrase] = useState<VocabCard | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeSpeakingPhrase, setActiveSpeakingPhrase] = useState<string | null>(null);

  // Group phrases into practical IELTS communicative objectives
  const objectives = [
    'All',
    'Giving Opinions',
    'Agreeing & Disagreeing',
    'Giving Examples',
    'Comparing & Contrasting',
    'Buying Time & Fillers',
    'Clarification & Questioning',
    'Storytelling & Part 2'
  ];

  const filtered = phrases.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      p.item.toLowerCase().includes(q) ||
      p.banglaMeaning.toLowerCase().includes(q) ||
      (p.definition && p.definition.toLowerCase().includes(q)) ||
      (p.exampleSentence && p.exampleSentence.toLowerCase().includes(q));

    if (selectedObjective === 'All') return matchSearch;

    const lowerItem = p.item.toLowerCase();
    const lowerTopic = (p.topic || '').toLowerCase();

    if (selectedObjective === 'Giving Opinions') {
      return (
        matchSearch &&
        (lowerItem.includes('opinion') ||
          lowerItem.includes('believe') ||
          lowerItem.includes('perspective') ||
          lowerItem.includes('conviction') ||
          lowerTopic.includes('opinion'))
      );
    } else if (selectedObjective === 'Agreeing & Disagreeing') {
      return (
        matchSearch &&
        (lowerItem.includes('agree') ||
          lowerItem.includes('extent') ||
          lowerItem.includes('coin') ||
          lowerItem.includes('validity') ||
          lowerTopic.includes('agree'))
      );
    } else if (selectedObjective === 'Giving Examples') {
      return (
        matchSearch &&
        (lowerItem.includes('example') ||
          lowerItem.includes('illustrate') ||
          lowerItem.includes('instance') ||
          lowerItem.includes('case in point'))
      );
    } else if (selectedObjective === 'Comparing & Contrasting') {
      return (
        matchSearch &&
        (lowerItem.includes('contrast') ||
          lowerItem.includes('hand') ||
          lowerItem.includes('whereas') ||
          lowerItem.includes('opposite'))
      );
    } else if (selectedObjective === 'Buying Time & Fillers') {
      return (
        matchSearch &&
        (lowerItem.includes('intriguing') ||
          lowerItem.includes('thought') ||
          lowerItem.includes('off the top') ||
          lowerItem.includes('suppose'))
      );
    } else if (selectedObjective === 'Clarification & Questioning') {
      return (
        matchSearch &&
        (lowerItem.includes('rephrase') ||
          lowerItem.includes('clarify') ||
          lowerItem.includes('mean'))
      );
    } else if (selectedObjective === 'Storytelling & Part 2') {
      return (
        matchSearch &&
        (lowerItem.includes('springs to mind') ||
          lowerItem.includes('hindsight') ||
          lowerItem.includes('remember') ||
          lowerItem.includes('reminisce'))
      );
    }

    return matchSearch;
  });

  const handlePronounce = (text: string, phraseId?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    stopSpeech();
    setIsPlayingAudio(true);
    if (phraseId) setActiveSpeakingPhrase(phraseId);
    speakBritish(text, {
      onEnd: () => {
        setIsPlayingAudio(false);
        setActiveSpeakingPhrase(null);
      },
      onError: () => {
        setIsPlayingAudio(false);
        setActiveSpeakingPhrase(null);
      }
    });
    soundManager.playBeep(560, 0.06);
  };

  return (
    <div className="w-full space-y-6">
      {/* Search & Objective Pills */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search phrases by English or Bangla (e.g. In my opinion, মুদ্রা, intriguing)..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-400 bg-slate-50/70"
          />
        </div>

        {/* Objective Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          <span className="text-[11px] font-mono font-bold uppercase text-slate-400 shrink-0">
            IELTS Purpose:
          </span>
          {objectives.map((obj) => {
            const isSelected = selectedObjective === obj;
            return (
              <button
                key={obj}
                type="button"
                onClick={() => {
                  setSelectedObjective(obj);
                  soundManager.playBeep(600, 0.03);
                }}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-black'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {obj}
              </button>
            );
          })}
        </div>
      </div>

      {/* Phrases List with Expandable Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-2">
            <MessageSquare className="w-7 h-7 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No phrases found for this filter</h4>
            <p className="text-xs text-slate-500">Try selecting 'All' or clearing your search query.</p>
          </div>
        ) : (
          filtered.map((phrase) => {
            const isExpanded = expandedPhraseId === phrase.id;
            const definition = getGuaranteedDefinition(phrase);
            const ieltsUsage = getGuaranteedIeltsUsage(phrase);
            const collocations = getGuaranteedCollocations(phrase);
            const commonMistakes = getGuaranteedMistake(phrase);
            const upgradeText = getGuaranteedUpgrade(phrase);

            return (
              <div
                key={phrase.id}
                className="bg-white rounded-3xl border-2 border-slate-200/80 p-5 shadow-xs transition hover:border-blue-300 space-y-3"
              >
                {/* Phrase Title & Action Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-mono font-bold border border-blue-200">
                        {phrase.ieltsSkill || 'IELTS Speaking & Writing'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {phrase.topic}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                      "{phrase.item}"
                    </h3>

                    {/* Visual Frequency Waveform during pronunciation */}
                    {isPlayingAudio && activeSpeakingPhrase === phrase.id && (
                      <div className="pt-1 animate-fade-in">
                        <AudioPlaybackWaveform
                          isPlaying={true}
                          isLoading={false}
                          height={24}
                          barCount={14}
                          variant="compact"
                          showLabel={true}
                          label="British Audio"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handlePronounce(`${phrase.item}. For example: ${phrase.exampleSentence}`, phrase.id, e)}
                      aria-label="Listen to phrase"
                      className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition active:scale-95 flex items-center justify-center shadow-2xs"
                      title="Listen to British Audio"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => onCopy(phrase, e)}
                      aria-label="Copy phrase"
                      className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition active:scale-95 flex items-center justify-center shadow-2xs"
                      title="Copy phrase"
                    >
                      {copiedId === phrase.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalPhrase(phrase);
                        soundManager.playBeep(640, 0.04);
                      }}
                      aria-label="Inspect phrase modal"
                      className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition active:scale-95 flex items-center justify-center shadow-2xs"
                      title="Open full detailed dialog"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => onToggleMastery(phrase.id, e)}
                      className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 border flex items-center gap-1 ${
                        phrase.mastered
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          phrase.mastered ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      />
                      <span>{phrase.mastered ? 'Mastered' : 'Mark'}</span>
                    </button>
                  </div>
                </div>

                {/* Visual Cue & Topic Banner */}
                <VocabVisualBanner
                  item={phrase.item}
                  topic={phrase.topic}
                  category="phrase"
                />

                {/* Bangla Meaning Card */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs sm:text-sm text-slate-900 font-medium font-bengali">
                  <span className="font-bold text-amber-900 mr-1.5 font-mono">বাংলা অর্থ:</span>
                  <span className="font-bold text-slate-950 font-bengali">{phrase.banglaMeaning}</span>
                  {phrase.banglaExplanation && (
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed font-bengali">
                      {phrase.banglaExplanation}
                    </p>
                  )}
                </div>

                {/* Practice Example Sentence */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-serif italic text-slate-800 leading-relaxed">
                  "{phrase.exampleSentence}"
                </div>

                {/* Interactive Detail Expansion Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setExpandedPhraseId(isExpanded ? null : phrase.id);
                    soundManager.playBeep(isExpanded ? 500 : 650, 0.03);
                  }}
                  className="w-full pt-1 pb-0.5 flex items-center justify-between text-xs font-bold text-blue-600 hover:text-blue-800 transition"
                >
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    <span>{isExpanded ? 'Hide Detailed Context & IELTS Tips' : 'View Detailed Context & IELTS Tips'}</span>
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {/* Expanded Details Drawer — Always populated, never blanks */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-150 space-y-3 animate-fade-in text-xs">
                    {/* Academic Definition */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed">
                      <strong className="text-slate-900 font-bold block mb-0.5 font-mono text-[10px] uppercase">
                        Academic English Nuance & Meaning:
                      </strong>
                      {definition}
                    </div>

                    {/* Collocations */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
                        Frequent Collocations:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {collocations.map((col, cIdx) => (
                          <span
                            key={cIdx}
                            className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-medium text-[11px]"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* IELTS Usage */}
                    <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 leading-relaxed">
                      <strong className="text-indigo-800 font-bold block mb-0.5 font-mono text-[10px] uppercase">
                        🎯 IELTS Speaking & Writing Band 8+ Strategy:
                      </strong>
                      {ieltsUsage}
                    </div>

                    {/* Common Candidate Mistake */}
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 leading-relaxed">
                      <strong className="text-rose-800 font-bold block mb-0.5 font-mono text-[10px] uppercase">
                        ⚠️ Common Candidate Mistake:
                      </strong>
                      {commonMistakes}
                    </div>

                    {/* Upgrade comparison */}
                    <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 text-[11px]">
                      <span className="font-bold">Upgrade Everyday Phrasing: </span>
                      Replace <span className="line-through text-rose-600 font-semibold">"{upgradeText}"</span> with <span className="text-emerald-700 font-bold font-mono">"{phrase.item}"</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Focused Phrase Details Modal — Never Blanks Out */}
      {modalPhrase && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalPhrase(null);
          }}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border-2 border-slate-200 relative my-auto animate-fade-in text-slate-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-200">
                  {modalPhrase.topic || 'Discourse Phrase'}
                </span>
                <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {modalPhrase.cefr || 'C1 Band 8+'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalPhrase(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95"
                title="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Audio */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                  "{modalPhrase.item}"
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    handlePronounce(`${modalPhrase.item}. For example: ${modalPhrase.exampleSentence}`, modalPhrase.id)
                  }
                  className="p-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition shrink-0 shadow-2xs active:scale-95"
                  title="Pronounce in British accent"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Visual Frequency Waveform inside modal */}
              {isPlayingAudio && activeSpeakingPhrase === modalPhrase.id && (
                <div className="py-1 animate-fade-in">
                  <AudioPlaybackWaveform
                    isPlaying={true}
                    isLoading={false}
                    height={28}
                    barCount={18}
                    showLabel={true}
                    label="British Pronunciation & Example"
                  />
                </div>
              )}

              {/* Visual Banner */}
              <VocabVisualBanner
                item={modalPhrase.item}
                topic={modalPhrase.topic}
                category="phrase"
              />

              {/* Bangla Meaning Box */}
              <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 text-slate-900 text-xs sm:text-sm font-medium shadow-2xs space-y-1">
                <div className="font-mono text-[11px] uppercase font-bold text-amber-900">
                  বাংলা অর্থ:
                </div>
                <div className="font-extrabold text-slate-900 text-sm sm:text-base font-bengali leading-relaxed">
                  {modalPhrase.banglaMeaning}
                </div>
              </div>
            </div>

            {/* Practice Context & Details */}
            <div className="space-y-2.5 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1 font-mono">
                  Practice Example in Context
                </span>
                <p className="text-slate-800 italic font-serif leading-relaxed text-xs sm:text-sm">
                  "{modalPhrase.exampleSentence}"
                </p>
              </div>

              <div className="bg-indigo-50/80 p-3 rounded-2xl border border-indigo-200">
                <span className="text-[10px] uppercase font-bold text-indigo-700 block mb-1 font-mono">
                  🎯 IELTS Exam Application & Criteria
                </span>
                <p className="text-slate-800 leading-relaxed font-medium">
                  {getGuaranteedIeltsUsage(modalPhrase)}
                </p>
              </div>

              <div className="bg-rose-50/80 p-3 rounded-2xl border border-rose-200">
                <span className="text-[10px] uppercase font-bold text-rose-700 block mb-1 font-mono">
                  ⚠️ Candidate Pitfall:
                </span>
                <p className="text-slate-800 leading-relaxed font-medium">
                  {getGuaranteedMistake(modalPhrase)}
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 gap-2">
              <button
                type="button"
                onClick={(e) => onCopy(modalPhrase, e)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
              >
                {copiedId === modalPhrase.id ? (
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
                onClick={() => setModalPhrase(null)}
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
