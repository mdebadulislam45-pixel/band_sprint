import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Volume2,
  ArrowRight,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Award,
  BookOpen
} from 'lucide-react';
import { VocabCard } from '../../types';
import { soundManager } from '../../utils/audioEffects';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';

interface VocabQuizInteractiveProps {
  card: VocabCard;
  allCards: VocabCard[];
  onAnswerCorrect: () => void;
  onAnswerIncorrect: () => void;
  onNext: () => void;
}

export const VocabQuizInteractive: React.FC<VocabQuizInteractiveProps> = ({
  card,
  allCards,
  onAnswerCorrect,
  onAnswerIncorrect,
  onNext
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizMode, setQuizMode] = useState<'meaning' | 'fillBlank'>('meaning');

  // Generate 4 randomized options (1 correct + 3 plausible distractors)
  const options = React.useMemo(() => {
    const distractors = allCards
      .filter((c) => c.id !== card.id && c.banglaMeaning !== card.banglaMeaning)
      .map((c) => c.banglaMeaning);

    // Shuffle distractors
    const shuffledDistractors = [...distractors].sort(() => 0.5 - Math.random()).slice(0, 3);
    const combined = [card.banglaMeaning, ...shuffledDistractors];
    return combined.sort(() => 0.5 - Math.random());
  }, [card, allCards]);

  const handleSelectOption = (opt: string) => {
    if (isAnswered) return;
    setSelectedOption(opt);
    setIsAnswered(true);

    const isCorrect = opt === card.banglaMeaning;
    if (isCorrect) {
      soundManager.playSuccess();
      onAnswerCorrect();
    } else {
      soundManager.playBeep(450, 0.1);
      onAnswerIncorrect();
    }
  };

  const handlePronounce = (text: string) => {
    stopSpeech();
    speakBritish(text);
    soundManager.playBeep(560, 0.06);
  };

  const maskedSentence = React.useMemo(() => {
    const regex = new RegExp(`\\b${card.item}\\b`, 'gi');
    return card.exampleSentence.replace(regex, '__________');
  }, [card]);

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl border-2 border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-5">
      {/* Quiz Mode Switcher Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase text-slate-500">
            Active Recall Quiz
          </span>
        </div>

        <div className="flex items-center p-1 bg-slate-100 rounded-xl text-[11px] font-bold">
          <button
            type="button"
            onClick={() => {
              setQuizMode('meaning');
              setSelectedOption(null);
              setIsAnswered(false);
            }}
            className={`px-2.5 py-1 rounded-lg transition ${
              quizMode === 'meaning' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Meaning
          </button>
          <button
            type="button"
            onClick={() => {
              setQuizMode('fillBlank');
              setSelectedOption(null);
              setIsAnswered(false);
            }}
            className={`px-2.5 py-1 rounded-lg transition ${
              quizMode === 'fillBlank' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Sentence Blank
          </button>
        </div>
      </div>

      {/* Target Word Display */}
      <div className="text-center py-2 space-y-2">
        {quizMode === 'meaning' ? (
          <>
            <div className="text-xs text-slate-400 font-mono font-semibold">
              Select the correct meaning for:
            </div>
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">{card.item}</h3>
              <button
                type="button"
                onClick={() => handlePronounce(card.item)}
                aria-label="Listen to word"
                className="p-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            {card.partOfSpeech && (
              <span className="text-xs text-slate-500 font-mono italic">
                ({card.partOfSpeech.toLowerCase()}) · {card.cefr}
              </span>
            )}
          </>
        ) : (
          <>
            <div className="text-xs text-slate-400 font-mono font-semibold">
              Complete the sentence with the appropriate term:
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-serif italic text-slate-800 leading-relaxed">
              "{maskedSentence}"
            </div>
            <div className="text-xs font-bold text-indigo-700 pt-1">
              Hint: বাংলা অর্থ — {card.banglaMeaning}
            </div>
          </>
        )}
      </div>

      {/* Options List */}
      <div className="space-y-2.5">
        {options.map((opt, idx) => {
          const isSelected = selectedOption === opt;
          const isCorrect = opt === card.banglaMeaning;

          return (
            <button
              key={idx}
              type="button"
              disabled={isAnswered}
              onClick={() => handleSelectOption(opt)}
              className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition flex items-center justify-between gap-3 ${
                isAnswered && isCorrect
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                  : isAnswered && isSelected && !isCorrect
                  ? 'bg-rose-50 border-rose-400 text-rose-950'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                    isAnswered && isCorrect
                      ? 'bg-emerald-600 text-white'
                      : isAnswered && isSelected && !isCorrect
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-xs sm:text-sm">{opt}</span>
              </div>

              {isAnswered && isCorrect && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              )}
              {isAnswered && isSelected && !isCorrect && (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback Panel and Next Action */}
      {isAnswered && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800">
              {selectedOption === card.banglaMeaning ? '🎉 Correct Answer!' : '❌ Not Quite Right'}
            </span>
            <button
              type="button"
              onClick={() => handlePronounce(card.exampleSentence)}
              className="text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Hear in sentence</span>
            </button>
          </div>

          <p className="text-slate-600 font-serif italic">"{card.exampleSentence}"</p>

          <button
            type="button"
            onClick={() => {
              setSelectedOption(null);
              setIsAnswered(false);
              onNext();
            }}
            className="w-full min-h-[44px] py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-2"
          >
            <span>Next Question</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
