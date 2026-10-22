import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Copy,
  Check,
  Archive,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Search,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Filter
} from 'lucide-react';
import { VocabCard } from '../../types';
import { soundManager } from '../../utils/audioEffects';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { audioService, AudioPlaybackState } from '../../services/audioService';
import { AudioPlaybackWaveform } from '../audio/AudioPlaybackWaveform';
import { VocabVisualBanner } from './VocabVisualCue';

interface IdiomsViewProps {
  idioms: VocabCard[];
  onToggleMastery: (id: string, e?: React.MouseEvent) => void;
  onSendToVault: (card: VocabCard, e?: React.MouseEvent) => void;
  onCopy: (card: VocabCard, e?: React.MouseEvent) => void;
  copiedId: string | null;
}

export const IdiomsView: React.FC<IdiomsViewProps> = ({
  idioms,
  onToggleMastery,
  onSendToVault,
  onCopy,
  copiedId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [activeIdiomIndex, setActiveIdiomIndex] = useState(0);
  const [pronouncingItem, setPronouncingItem] = useState<string | null>(null);
  const [audioPlaybackState, setAudioPlaybackState] = useState<AudioPlaybackState>(audioService.getState());

  useEffect(() => {
    const unsub = audioService.subscribe((s) => {
      setAudioPlaybackState(s);
      if (!s.isPlaying && !s.isLoading) {
        setPronouncingItem(null);
      }
    });
    return unsub;
  }, []);

  const filtered = idioms.filter((item) => {
    const matchDiff = selectedDifficulty === 'all' || item.cefr === selectedDifficulty;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      item.item.toLowerCase().includes(q) ||
      item.banglaMeaning.toLowerCase().includes(q) ||
      item.definition.toLowerCase().includes(q) ||
      item.exampleSentence.toLowerCase().includes(q);

    return matchDiff && matchSearch;
  });

  const activeIdiom = filtered[activeIdiomIndex] || filtered[0];

  const handlePronounce = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    stopSpeech();
    setPronouncingItem(text);
    speakBritish(text, {
      onEnd: () => setPronouncingItem(null),
      onError: () => setPronouncingItem(null)
    });
    soundManager.playBeep(560, 0.06);
  };

  return (
    <div className="w-full space-y-6">
      {/* Search & Difficulty Filter Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setActiveIdiomIndex(0);
            }}
            placeholder="Search idioms or meanings (e.g. break the ice, blue moon)..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-400 bg-slate-50/70"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl overflow-x-auto border border-slate-200/80">
          {['all', 'B1', 'B2', 'C1'].map((diff) => (
            <button
              key={diff}
              type="button"
              onClick={() => {
                setSelectedDifficulty(diff);
                setActiveIdiomIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedDifficulty === diff
                  ? 'bg-white text-slate-900 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {diff === 'all' ? 'All Levels' : diff}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
          <Lightbulb className="w-8 h-8 text-amber-500 mx-auto" />
          <h4 className="text-base font-bold text-slate-800">No idioms found</h4>
          <p className="text-xs text-slate-500">Try adjusting your search query or level filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Focused Idiom Card (Dedicated IELTS Treatment) */}
          <div className="lg:col-span-8 bg-white rounded-3xl border-2 border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5">
            {/* Header with Badges & Actions */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-900 font-mono text-xs font-black border border-purple-200">
                  {activeIdiom.cefr || 'B2'}
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                  IELTS Speaking Band 8.0+
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => handlePronounce(activeIdiom.item, e)}
                  aria-label="Listen to pronunciation"
                  className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition active:scale-95 flex items-center justify-center shadow-2xs"
                  title="Hear British Pronunciation"
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={(e) => onCopy(activeIdiom, e)}
                  aria-label="Copy idiom"
                  className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition active:scale-95 flex items-center justify-center shadow-2xs"
                  title="Copy idiom text"
                >
                  {copiedId === activeIdiom.id ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={(e) => onSendToVault(activeIdiom, e)}
                  aria-label="Save to review vault"
                  className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition active:scale-95 flex items-center justify-center shadow-2xs"
                  title="Add to Review Vault"
                >
                  <Archive className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Large Uppercase Idiom Title */}
            <div className="space-y-1">
              <div className="text-[11px] font-mono font-bold text-purple-600 uppercase tracking-wider">
                Target Expression
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
                {activeIdiom.item}
              </h2>

              {/* Visual Frequency Waveform during pronunciation */}
              {(pronouncingItem === activeIdiom.item || (audioPlaybackState.isPlaying && pronouncingItem === activeIdiom.item)) && (
                <div className="flex items-center gap-2 py-1 animate-fade-in">
                  <AudioPlaybackWaveform
                    isPlaying={audioPlaybackState.isPlaying}
                    isLoading={audioPlaybackState.isLoading}
                    height={28}
                    barCount={20}
                    showLabel={true}
                    label={audioPlaybackState.isLoading ? 'Processing Pronunciation...' : 'British RP Voice'}
                  />
                </div>
              )}
            </div>

            {/* Visual Cue & Mnemonic Banner */}
            <VocabVisualBanner
              item={activeIdiom.item}
              topic={activeIdiom.topic}
              category="idiom"
            />

            {/* Meaning & Bangla Meaning Block */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 text-slate-900 space-y-1.5 shadow-2xs font-bengali">
              <div className="text-[11px] font-mono font-bold uppercase text-amber-800">
                Meaning (অর্থ)
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-950 font-bengali leading-snug">
                {activeIdiom.banglaMeaning}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed pt-0.5 font-sans">
                {activeIdiom.definition}
              </p>
            </div>

            {/* Practical Speaking Situation */}
            <div className="space-y-1.5 font-bengali">
              <div className="text-[11px] font-mono font-bold uppercase text-slate-400 font-sans">
                When & Where to Use (ব্যবহারের পরিস্থিতি)
              </div>
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-xs sm:text-sm text-indigo-950 font-medium leading-relaxed font-bengali">
                {activeIdiom.banglaExplanation ||
                  activeIdiom.ieltsUsage ||
                  'Naturally used in IELTS Speaking Parts 1 & 2 when conveying personal feelings or narrative color.'}
              </div>
            </div>

            {/* Cambridge Example Sentence */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase text-slate-400">
                  Cambridge Sample Response
                </span>
                <button
                  type="button"
                  onClick={() => handlePronounce(activeIdiom.exampleSentence)}
                  className="text-blue-700 hover:text-blue-900 text-xs font-bold flex items-center gap-1"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Listen</span>
                </button>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-serif italic text-slate-800 leading-relaxed">
                "{activeIdiom.exampleSentence}"
              </div>

              {/* Visual Frequency Waveform during example pronunciation */}
              {(pronouncingItem === activeIdiom.exampleSentence || (audioPlaybackState.isPlaying && pronouncingItem === activeIdiom.exampleSentence)) && (
                <div className="flex items-center gap-2 py-1 animate-fade-in">
                  <AudioPlaybackWaveform
                    isPlaying={audioPlaybackState.isPlaying}
                    isLoading={audioPlaybackState.isLoading}
                    height={26}
                    barCount={18}
                    showLabel={true}
                    label={audioPlaybackState.isLoading ? 'Buffering Example...' : 'Sample Speech Output'}
                  />
                </div>
              )}
            </div>

            {/* Strict Examiner Caution Badge */}
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-700">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Examiner Caution / সতর্কতা</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Use in <strong>IELTS Speaking Parts 1 & 2</strong> to demonstrate idiomatic fluency. Avoid using in Academic Writing Task 1 reports or formal essays.
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                Idiom {activeIdiomIndex + 1} of {filtered.length}
              </span>

              <button
                type="button"
                onClick={(e) => onToggleMastery(activeIdiom.id, e)}
                className={`min-h-[44px] px-5 py-2.5 rounded-2xl text-xs font-bold transition active:scale-95 flex items-center gap-2 ${
                  activeIdiom.mastered
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-900 hover:bg-black text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{activeIdiom.mastered ? 'Mastered ✓' : 'Mark as Mastered'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Browseable Idiom Library List */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-xs font-mono font-bold uppercase text-slate-700">
                All Idioms ({filtered.length})
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">Tap to inspect</span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filtered.map((item, idx) => {
                const isSelected = activeIdiomIndex === idx;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveIdiomIndex(idx)}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-purple-50/80 border-purple-400 shadow-2xs'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate uppercase">
                        {item.item}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate font-bengali">
                        {item.banglaMeaning}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.mastered && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
