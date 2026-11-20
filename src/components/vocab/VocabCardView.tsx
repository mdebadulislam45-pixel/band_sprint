import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Copy,
  Check,
  Archive,
  CheckCircle2,
  RotateCw,
  Sparkles,
  BookOpen,
  HelpCircle,
  Lightbulb,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { VocabCard } from '../../types';
import { soundManager } from '../../utils/audioEffects';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { audioService } from '../../services/audioService';
import { AudioPlaybackWaveform } from '../audio/AudioPlaybackWaveform';
import { VocabVisualBanner } from './VocabVisualCue';

interface VocabCardViewProps {
  card: VocabCard;
  isFlipped: boolean;
  onFlip: () => void;
  onToggleMastery: (id: string, e?: React.MouseEvent) => void;
  onSendToVault: (card: VocabCard, e?: React.MouseEvent) => void;
  onCopy: (card: VocabCard, e?: React.MouseEvent) => void;
  copiedId: string | null;
  onNext?: () => void;
  onPrev?: () => void;
  currentIndex?: number;
  totalCards?: number;
}

export const VocabCardView: React.FC<VocabCardViewProps> = ({
  card,
  isFlipped,
  onFlip,
  onToggleMastery,
  onSendToVault,
  onCopy,
  copiedId,
  onNext,
  onPrev,
  currentIndex = 0,
  totalCards = 1
}) => {
  const [audioState, setAudioState] = useState(audioService.getState());

  useEffect(() => {
    return audioService.subscribe(setAudioState);
  }, []);

  const handlePronounce = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    audioService.unlockAudio();
    stopSpeech();
    speakBritish(text);
    soundManager.playBeep(560, 0.06);
  };

  const getCefrBadge = (cefr?: string) => {
    switch (cefr) {
      case 'C2':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'C1':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'B2':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'B1':
        return 'bg-teal-100 text-teal-900 border-teal-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Clean Flashcard Container with Conditional Rendering to prevent mobile upside-down transform bugs */}
      <div
        onClick={onFlip}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            onFlip();
          }
        }}
        aria-label={`Flashcard for ${card.item}. Tap to reveal meaning.`}
        className="cursor-pointer min-h-[380px] sm:min-h-[420px] w-full focus:outline-hidden focus:ring-4 focus:ring-blue-200 rounded-3xl"
      >
        {!isFlipped ? (
          /* ================= CARD FRONT (Minimal, Clean, Focused) ================= */
          <div className="relative w-full min-h-[380px] sm:min-h-[420px] bg-white rounded-3xl border-2 border-slate-200/90 p-5 sm:p-7 flex flex-col justify-between shadow-md hover:shadow-xl transition-all animate-fade-in">
            {/* Top Bar */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black border ${getCefrBadge(
                    card.cefr
                  )}`}
                >
                  {card.cefr || 'B2'}
                </span>

                {card.partOfSpeech && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-mono font-semibold">
                    {card.partOfSpeech.toLowerCase()}
                  </span>
                )}

                <span className="text-[11px] font-medium text-slate-400 truncate max-w-[140px] sm:max-w-none">
                  {card.topic}
                </span>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                {(audioState.isPlaying || audioState.isLoading) && (
                  <AudioPlaybackWaveform
                    isPlaying={audioState.isPlaying}
                    isLoading={audioState.isLoading}
                    height={28}
                    barCount={10}
                    variant="compact"
                    showLabel={false}
                  />
                )}

                <button
                  type="button"
                  onClick={(e) => handlePronounce(card.item, e)}
                  aria-label="Listen to pronunciation"
                  className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition active:scale-95 flex items-center justify-center shadow-2xs cursor-pointer"
                  title="Listen to British Audio"
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={(e) => onCopy(card, e)}
                  aria-label="Copy word and meaning"
                  className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition active:scale-95 flex items-center justify-center shadow-2xs cursor-pointer"
                  title="Copy word"
                >
                  {copiedId === card.id ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Center: The Word & Pronunciation */}
            <div className="text-center my-auto py-6 space-y-3">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                {card.category === 'idiom'
                  ? 'IELTS Speaking Idiom'
                  : card.category === 'phrase'
                  ? 'Academic Discourse Phrase'
                  : 'High-Yield Vocabulary'}
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight px-2 break-words">
                {card.item}
              </h2>

              {/* Visual Frequency Waveform during pronunciation */}
              {(audioState.isPlaying || audioState.isLoading) && (
                <div className="flex justify-center py-1 animate-fade-in">
                  <AudioPlaybackWaveform
                    isPlaying={audioState.isPlaying}
                    isLoading={audioState.isLoading}
                    height={28}
                    barCount={18}
                    showLabel={true}
                    label={audioState.isLoading ? 'Synthesizing Audio...' : 'British Audio Processing'}
                  />
                </div>
              )}

              {card.banglaPronunciation && (
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-purple-50 text-purple-800 text-xs font-semibold border border-purple-200 font-bengali">
                  <span>উচ্চারণ:</span>
                  <span className="font-bold">[{card.banglaPronunciation}]</span>
                </div>
              )}

              {card.beginnerPhrase && (
                <div className="text-xs text-slate-500 pt-1">
                  <span>Upgrades everyday term: </span>
                  <span className="font-semibold text-rose-600 line-through">
                    "{card.beginnerPhrase}"
                  </span>
                </div>
              )}

              {/* Visual Concept Banner & Iconography */}
              <div className="pt-2 text-left">
                <VocabVisualBanner
                  item={card.item}
                  topic={card.topic}
                  category={card.category}
                />
              </div>
            </div>

            {/* Bottom Callout */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-400">
              <span className="font-mono text-slate-500 font-bold">
                {currentIndex + 1} / {totalCards}
              </span>

              <div className="flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-800 transition">
                <RotateCw className="w-3.5 h-3.5" />
                <span>Tap card to reveal meaning</span>
              </div>
            </div>
          </div>
        ) : (
          /* ================= CARD BACK (Progressive Disclosure - Clean, Bright, High Contrast) ================= */
          <div className="relative w-full min-h-[380px] sm:min-h-[420px] bg-gradient-to-br from-white via-indigo-50/40 to-purple-50/40 text-slate-900 rounded-3xl border-2 border-purple-300 p-5 sm:p-7 flex flex-col justify-between shadow-md hover:shadow-xl transition-all overflow-y-auto animate-fade-in">
            {/* Back Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-purple-200">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-purple-900 truncate">{card.item}</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-mono font-bold border border-purple-200">
                  {card.cefr || 'B2'}
                </span>
              </div>

              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                {(audioState.isPlaying || audioState.isLoading) && (
                  <AudioPlaybackWaveform
                    isPlaying={audioState.isPlaying}
                    isLoading={audioState.isLoading}
                    height={26}
                    barCount={10}
                    variant="compact"
                    showLabel={false}
                  />
                )}

                <button
                  type="button"
                  onClick={(e) => handlePronounce(card.exampleSentence, e)}
                  aria-label="Listen to example sentence"
                  className="p-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 transition border border-purple-200 shadow-2xs cursor-pointer"
                  title="Read Example Sentence Aloud"
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={(e) => onSendToVault(card, e)}
                  aria-label="Save to mistake vault for active review"
                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition border border-rose-200 shadow-2xs cursor-pointer"
                  title="Save to Review Vault"
                >
                  <Archive className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Back Content Body (Progressive, Easy to read) */}
            <div className="space-y-3.5 my-auto py-3">
              {/* Meaning Block */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-slate-900 space-y-1 shadow-2xs">
                <div className="text-[11px] font-mono font-bold uppercase text-amber-800">
                  বাংলা অর্থ ও সংজ্ঞা
                </div>
                <div className="text-base font-extrabold text-slate-900 font-bengali leading-snug">{card.banglaMeaning}</div>
                <p className="text-xs text-slate-700 leading-relaxed pt-0.5">{card.definition}</p>
              </div>

              {/* Example Sentence */}
              <div className="space-y-1">
                <div className="text-[11px] font-mono font-bold uppercase text-blue-700">
                  Practice Example Sentence
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-serif italic text-slate-800 leading-relaxed">
                  "{card.exampleSentence}"
                </div>
              </div>

              {/* Collocations & Usage Accordion Toggle */}
              {card.collocations && card.collocations.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-mono font-bold uppercase text-slate-500">
                    High-Frequency Collocations
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {card.collocations.slice(0, 4).map((col, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-800 font-mono font-medium"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bangla Explanation & Nuance */}
              {card.banglaExplanation && (
                <div className="p-2.5 rounded-xl bg-purple-50/80 border border-purple-200 text-xs text-purple-950 font-bengali">
                  <strong className="text-purple-900 font-sans">💡 বাংলা ব্যাখ্যা ও ব্যবহার: </strong>
                  <span className="leading-relaxed">{card.banglaExplanation}</span>
                </div>
              )}

              {/* IELTS Usage Note */}
              {card.ieltsUsage && (
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
                  <strong className="text-indigo-800">🎯 IELTS Advice: </strong>
                  <span>{card.ieltsUsage}</span>
                </div>
              )}
            </div>

            {/* Back Quick Action Buttons (Thumb-friendly) */}
            <div
              className="pt-3 border-t border-purple-200 flex items-center justify-between gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => {
                  onSendToVault(card, e);
                  soundManager.playBeep(450, 0.08);
                }}
                className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>Need Review ✕</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  onToggleMastery(card.id, e);
                }}
                className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer ${
                  card.mastered
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{card.mastered ? 'Mastered ✓' : 'I Know It ✓'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Thumb-friendly Next / Previous Controls */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!onPrev}
          className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition active:scale-95 shadow-2xs flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
        >
          <span>← Previous</span>
        </button>

        <button
          type="button"
          onClick={onFlip}
          className="min-h-[44px] px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>{isFlipped ? 'Show Front' : 'Flip Card'}</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!onNext}
          className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition active:scale-95 shadow-sm flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
        >
          <span>Next →</span>
        </button>
      </div>
    </div>
  );
};
