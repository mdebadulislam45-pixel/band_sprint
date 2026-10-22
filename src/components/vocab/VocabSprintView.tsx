import React, { useState } from 'react';
import {
  Flame,
  CheckCircle2,
  XCircle,
  Volume2,
  ArrowRight,
  RotateCcw,
  Sparkles,
  BookOpen,
  Award,
  ChevronRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { VocabCard } from '../../types';
import { soundManager } from '../../utils/audioEffects';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { VocabCardView } from './VocabCardView';
import { VocabQuizInteractive } from './VocabQuizInteractive';

interface VocabSprintViewProps {
  cards: VocabCard[];
  onToggleMastery: (id: string) => void;
  onSendToVault: (card: VocabCard) => void;
  onShowToast: (msg: string) => void;
  onFinishSprint: () => void;
}

export const VocabSprintView: React.FC<VocabSprintViewProps> = ({
  cards,
  onToggleMastery,
  onSendToVault,
  onShowToast,
  onFinishSprint
}) => {
  // Build a curated 18-item daily sprint (10 words, 5 phrases, 3 idioms)
  const sprintItems = React.useMemo(() => {
    const words = cards.filter((c) => c.category === 'word').slice(0, 10);
    const phrases = cards.filter((c) => c.category === 'phrase').slice(0, 5);
    const idioms = cards.filter((c) => c.category === 'idiom').slice(0, 3);
    const combined = [...words, ...phrases, ...idioms];
    return combined.length > 0 ? combined : cards.slice(0, 18);
  }, [cards]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState<'card' | 'quiz'>('card');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const [isSprintComplete, setIsSprintComplete] = useState(false);

  const currentItem = sprintItems[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    if (!completedItems.includes(currentItem.id)) {
      setCompletedItems((prev) => [...prev, currentItem.id]);
    }

    if (currentIndex < sprintItems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      // Alternate between card exploration and interactive recall quiz
      setMode((prev) => (prev === 'card' && currentIndex % 2 === 1 ? 'quiz' : 'card'));
    } else {
      setIsSprintComplete(true);
      soundManager.playSuccess();
      onShowToast('🏆 Today\'s Sprint Finished! Daily goal achieved.');
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleCopy = (card: VocabCard) => {
    const text = `${card.item} (${card.banglaMeaning}) — ${card.exampleSentence}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(card.id);
      setTimeout(() => setCopiedId(null), 2000);
      onShowToast(`Copied "${card.item}"!`);
    }
  };

  if (isSprintComplete) {
    return (
      <div className="w-full max-w-xl mx-auto bg-white rounded-3xl border-2 border-slate-200 p-8 sm:p-10 text-center space-y-6 shadow-xs animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-2xs">
          <Flame className="w-8 h-8 fill-amber-500" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900">Sprint Concluded! 🏆</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            You reviewed 10 words, 5 discourse phrases, and 3 high-yield idioms today.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-900 font-medium space-y-1">
          <div className="font-bold">Daily Lexical Milestone Achieved</div>
          <p className="text-[11px] text-indigo-700">
            Your retention interval will automatically trigger spaced reviews over the next 48 hours.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setCurrentIndex(0);
              setIsSprintComplete(false);
              setCompletedItems([]);
            }}
            className="flex-1 min-h-[46px] py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition active:scale-95"
          >
            Restart Sprint
          </button>

          <button
            type="button"
            onClick={onFinishSprint}
            className="flex-1 min-h-[46px] py-2.5 px-4 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition active:scale-95 shadow-sm"
          >
            Continue to All Vocabulary
          </button>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / sprintItems.length) * 100);

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Sprint Progress Bar & Step Tracker */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-700">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Today's Sprint Item {currentIndex + 1} of {sprintItems.length}</span>
          </div>

          <span className="font-mono text-slate-400 font-bold">{progressPercent}%</span>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-amber-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Render either Card mode or Quiz mode for interactive variety */}
      {mode === 'card' ? (
        <VocabCardView
          card={currentItem}
          isFlipped={isFlipped}
          onFlip={() => setIsFlipped(!isFlipped)}
          onToggleMastery={onToggleMastery}
          onSendToVault={onSendToVault}
          onCopy={handleCopy}
          copiedId={copiedId}
          onNext={handleNext}
          onPrev={currentIndex > 0 ? handlePrev : undefined}
          currentIndex={currentIndex}
          totalCards={sprintItems.length}
        />
      ) : (
        <VocabQuizInteractive
          card={currentItem}
          allCards={cards}
          onAnswerCorrect={() => {
            if (!currentItem.mastered) onToggleMastery(currentItem.id);
          }}
          onAnswerIncorrect={() => {
            onSendToVault(currentItem);
          }}
          onNext={handleNext}
        />
      )}
    </div>
  );
};
