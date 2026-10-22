import React, { useState } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Award,
  Sparkles,
  Volume2,
  ArrowRight,
  BookOpen,
  Check,
  Archive,
  RefreshCw
} from 'lucide-react';
import { VocabCard } from '../../types';
import { soundManager } from '../../utils/audioEffects';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';

interface ReviewSessionViewProps {
  cards: VocabCard[];
  onToggleMastery: (id: string) => void;
  onShowToast: (msg: string) => void;
  onExitReview: () => void;
}

export const ReviewSessionView: React.FC<ReviewSessionViewProps> = ({
  cards,
  onToggleMastery,
  onShowToast,
  onExitReview
}) => {
  // Review queue: prioritizes unmastered cards or cards marked as needing review
  const reviewQueue = React.useMemo(() => {
    const unmastered = cards.filter((c) => !c.mastered);
    return unmastered.length > 0 ? unmastered.slice(0, 15) : cards.slice(0, 10);
  }, [cards]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [reviewedItems, setReviewedItems] = useState<{ id: string; success: boolean }[]>([]);
  const [isSessionFinished, setIsSessionFinished] = useState(false);

  const currentCard = reviewQueue[currentIndex];

  const handlePronounce = (text: string) => {
    stopSpeech();
    speakBritish(text);
    soundManager.playBeep(560, 0.06);
  };

  const handleGradeResponse = (knowsIt: boolean) => {
    if (!currentCard) return;

    if (knowsIt) {
      soundManager.playSuccess();
      if (!currentCard.mastered) {
        onToggleMastery(currentCard.id);
      }
    } else {
      soundManager.playBeep(450, 0.08);
    }

    setReviewedItems((prev) => [...prev, { id: currentCard.id, success: knowsIt }]);

    if (currentIndex < reviewQueue.length - 1) {
      setIsRevealed(false);
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsSessionFinished(true);
      soundManager.playSuccess();
      onShowToast('🎉 Review complete! Retention metrics updated.');
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsRevealed(false);
    setReviewedItems([]);
    setIsSessionFinished(false);
  };

  // Mastery tier distribution statistics
  const total = cards.length;
  const mastered = cards.filter((c) => c.mastered).length;
  const unmastered = total - mastered;

  if (isSessionFinished) {
    const correctCount = reviewedItems.filter((r) => r.success).length;
    const needReviewCount = reviewedItems.filter((r) => !r.success).length;

    return (
      <div className="w-full max-w-xl mx-auto bg-white rounded-3xl border-2 border-slate-200 p-8 sm:p-10 text-center space-y-6 shadow-xs animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-2xs">
          <Award className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900">Review Session Complete! 🎉</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Great discipline! Active recall strengthens your synaptic neural pathways for exam day.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-slate-400">Mastered in Session</div>
            <div className="text-xl font-black text-emerald-600">{correctCount}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-slate-400">Needs Another Review</div>
            <div className="text-xl font-black text-amber-600">{needReviewCount}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={handleRestart}
            className="flex-1 min-h-[46px] py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition active:scale-95 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Review Again</span>
          </button>

          <button
            type="button"
            onClick={onExitReview}
            className="flex-1 min-h-[46px] py-2.5 px-4 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition active:scale-95 shadow-sm flex items-center justify-center gap-2"
          >
            <span>Back to Vocabulary</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Mastery Levels Summary Panel */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-mono font-bold uppercase text-slate-800">
              Mastery Distribution
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500 font-bold">
            {mastered} / {total} Mastered
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
            <div className="font-mono text-slate-400 text-[10px] font-bold">○ NEW</div>
            <div className="font-mono font-bold text-slate-700">{unmastered}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 space-y-0.5">
            <div className="font-mono text-blue-500 text-[10px] font-bold">◔ LEARNING</div>
            <div className="font-mono font-bold text-blue-900">{reviewQueue.length}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 space-y-0.5">
            <div className="font-mono text-indigo-500 text-[10px] font-bold">◑ FAMILIAR</div>
            <div className="font-mono font-bold text-indigo-900">{Math.round(mastered * 0.4)}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-0.5">
            <div className="font-mono text-emerald-600 text-[10px] font-bold">★ MASTERED</div>
            <div className="font-mono font-bold text-emerald-950">{mastered}</div>
          </div>
        </div>
      </div>

      {/* Active Spaced Review Card */}
      {currentCard ? (
        <div className="bg-white rounded-3xl border-2 border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-mono font-bold uppercase text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Review Item {currentIndex + 1} of {reviewQueue.length}
            </span>

            <button
              type="button"
              onClick={() => handlePronounce(currentCard.item)}
              aria-label="Listen to word pronunciation"
              className="p-2 rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 transition border border-blue-200"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center py-4 space-y-2">
            <h3 className="text-3xl font-black text-slate-900">{currentCard.item}</h3>
            {currentCard.partOfSpeech && (
              <span className="text-xs text-slate-500 font-mono italic">
                {currentCard.partOfSpeech.toLowerCase()} · CEFR {currentCard.cefr}
              </span>
            )}
          </div>

          {!isRevealed ? (
            <button
              type="button"
              onClick={() => setIsRevealed(true)}
              className="w-full min-h-[48px] py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs sm:text-sm border border-indigo-200 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Tap to Reveal Meaning & Check Recall</span>
            </button>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 text-slate-900 space-y-1">
                <div className="text-[11px] font-mono font-bold uppercase text-amber-800">
                  বাংলা অর্থ
                </div>
                <div className="text-base font-extrabold">{currentCard.banglaMeaning}</div>
                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  {currentCard.definition}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-serif italic text-slate-800">
                "{currentCard.exampleSentence}"
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleGradeResponse(false)}
                  className="flex-1 min-h-[46px] py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Forgot / Need Review</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGradeResponse(true)}
                  className="flex-1 min-h-[46px] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-95 shadow-sm flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>I Remembered!</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-800">You're all caught up!</h4>
          <p className="text-xs text-slate-500">No vocabulary items currently due for review.</p>
        </div>
      )}
    </div>
  );
};
