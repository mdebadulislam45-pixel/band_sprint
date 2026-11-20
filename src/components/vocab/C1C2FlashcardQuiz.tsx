import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  Volume2,
  ArrowRight,
  RotateCcw,
  RotateCw,
  Sparkles,
  Award,
  BookOpen,
  Flame,
  Shuffle,
  Archive,
  Lightbulb,
  HelpCircle,
  Trophy,
  Check,
  ChevronLeft,
  Layers
} from 'lucide-react';
import { VocabCard } from '../../types';
import { soundManager } from '../../utils/audioEffects';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';

export type QuizChallengeType = 'dual_meaning' | 'bangla' | 'definition' | 'reverse';
export type QuizCefrFilter = 'all_c1_c2' | 'C1' | 'C2';
export type QuizCategoryFilter = 'all' | 'word' | 'phrase' | 'idiom';

interface C1C2FlashcardQuizProps {
  cards: VocabCard[];
  onToggleMastery: (id: string, e?: React.MouseEvent) => void;
  onSendToVault: (card: VocabCard, e?: React.MouseEvent) => void;
  onShowToast: (msg: string) => void;
  onPronounce?: (text: string, e?: React.MouseEvent) => void;
}

interface QuizAttemptRecord {
  card: VocabCard;
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  challengeType: QuizChallengeType;
}

function deterministicShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = Math.floor((s / 4294967296) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const C1C2FlashcardQuiz: React.FC<C1C2FlashcardQuizProps> = ({
  cards,
  onToggleMastery,
  onSendToVault,
  onShowToast,
  onPronounce
}) => {
  const [cefrFilter, setCefrFilter] = useState<QuizCefrFilter>('all_c1_c2');
  const [categoryFilter, setCategoryFilter] = useState<QuizCategoryFilter>('all');
  const [challengeType, setChallengeType] = useState<QuizChallengeType>('dual_meaning');
  const [deckSize, setDeckSize] = useState<10 | 20 | 0>(10);
  const [shuffleSeed, setShuffleSeed] = useState<number>(() => Date.now());

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [isHintVisible, setIsHintVisible] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [attempts, setAttempts] = useState<QuizAttemptRecord[]>([]);
  const [retryMissedOnlyIds, setRetryMissedOnlyIds] = useState<string[] | null>(null);
  const [vaultSavedIds, setVaultSavedIds] = useState<Record<string, boolean>>({});

  // Filter pool for C1/C2 items (falls back to full cards only if a filter combination has < 4 cards)
  const c1c2Pool = useMemo(() => {
    const baseC1C2 = cards.filter((c) => {
      const level = (c.cefr || '').toUpperCase();
      if (cefrFilter === 'C1') return level === 'C1';
      if (cefrFilter === 'C2') return level === 'C2';
      return level === 'C1' || level === 'C2';
    });

    const poolWithLevel = baseC1C2.length >= 4 ? baseC1C2 : cards;
    const byCategory =
      categoryFilter === 'all'
        ? poolWithLevel
        : poolWithLevel.filter((c) => c.category === categoryFilter);

    return byCategory.length >= 4 ? byCategory : poolWithLevel;
  }, [cards, cefrFilter, categoryFilter]);

  // Active quiz deck
  const quizDeck = useMemo(() => {
    if (retryMissedOnlyIds && retryMissedOnlyIds.length > 0) {
      const missedCards = cards.filter((c) => retryMissedOnlyIds.includes(c.id));
      if (missedCards.length > 0) return missedCards;
    }
    const shuffled = deterministicShuffle(c1c2Pool, shuffleSeed);
    if (deckSize === 0) return shuffled;
    return shuffled.slice(0, Math.min(deckSize, shuffled.length));
  }, [c1c2Pool, cards, deckSize, shuffleSeed, retryMissedOnlyIds]);

  const activeCard = quizDeck[currentIndex] || quizDeck[0];
  const isQuizFinished = quizDeck.length > 0 && currentIndex >= quizDeck.length;

  // Build 4 multiple-choice options for the current card and challengeType
  const optionItems = useMemo(() => {
    if (!activeCard) return [];

    // Pick 3 distinct distractors from the C1/C2 pool (prefer same category)
    const sameCatDistractors = c1c2Pool.filter(
      (c) =>
        c.id !== activeCard.id &&
        c.item !== activeCard.item &&
        c.banglaMeaning !== activeCard.banglaMeaning &&
        c.definition !== activeCard.definition &&
        c.category === activeCard.category
    );
    const otherDistractors = c1c2Pool.filter(
      (c) =>
        c.id !== activeCard.id &&
        c.item !== activeCard.item &&
        c.banglaMeaning !== activeCard.banglaMeaning &&
        c.definition !== activeCard.definition &&
        c.category !== activeCard.category
    );

    const combinedDistractorPool = [...sameCatDistractors, ...otherDistractors];
    const cardSeed =
      shuffleSeed +
      currentIndex * 997 +
      activeCard.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

    const chosenDistractors = deterministicShuffle(combinedDistractorPool, cardSeed).slice(0, 3);
    const fourCards = deterministicShuffle([activeCard, ...chosenDistractors], cardSeed + 31);

    return fourCards.map((c) => ({
      card: c,
      isCorrect: c.id === activeCard.id
    }));
  }, [activeCard, c1c2Pool, shuffleSeed, currentIndex]);

  const handleSpeak = useCallback(
    (text: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (onPronounce) {
        onPronounce(text, e);
        return;
      }
      stopSpeech();
      speakBritish(text);
      soundManager.playBeep(560, 0.05);
    },
    [onPronounce]
  );

  const resetRound = useCallback((newSeed?: number, customMissedIds?: string[] | null) => {
    setShuffleSeed(newSeed ?? Date.now());
    setRetryMissedOnlyIds(customMissedIds ?? null);
    setCurrentIndex(0);
    setSelectedOptionIdx(null);
    setIsCardFlipped(false);
    setIsHintVisible(false);
    setStreak(0);
    setAttempts([]);
  }, []);

  const handleSelectOption = useCallback(
    (idx: number) => {
      if (selectedOptionIdx !== null || !activeCard) return;
      const chosen = optionItems[idx];
      if (!chosen) return;

      setSelectedOptionIdx(idx);
      const correctIdx = optionItems.findIndex((o) => o.isCorrect);
      const isCorrect = chosen.isCorrect;

      if (isCorrect) {
        soundManager.playSuccess();
        setStreak((prev) => {
          const next = prev + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
      } else {
        soundManager.playBeep(420, 0.12);
        setStreak(0);
        // Flip the flashcard automatically on a wrong answer so the learner sees the full C1/C2 explanation
        setIsCardFlipped(true);
      }

      setAttempts((prev) => [
        ...prev,
        {
          card: activeCard,
          selectedIndex: idx,
          correctIndex: correctIdx,
          isCorrect,
          challengeType
        }
      ]);
    },
    [selectedOptionIdx, activeCard, optionItems, challengeType]
  );

  const handleNextCard = useCallback(() => {
    soundManager.playBeep(600, 0.04);
    setSelectedOptionIdx(null);
    setIsCardFlipped(false);
    setIsHintVisible(false);
    setCurrentIndex((prev) => prev + 1);
  }, []);

  const handlePrevCard = useCallback(() => {
    if (currentIndex <= 0) return;
    soundManager.playBeep(540, 0.04);
    setSelectedOptionIdx(null);
    setIsCardFlipped(false);
    setIsHintVisible(false);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, [currentIndex]);

  // Keyboard shortcuts for fast flashcard quiz navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }
      if (isQuizFinished || !activeCard) return;

      if (e.key === '1' || e.key.toLowerCase() === 'a') {
        handleSelectOption(0);
      } else if (e.key === '2' || e.key.toLowerCase() === 'b') {
        handleSelectOption(1);
      } else if (e.key === '3' || e.key.toLowerCase() === 'c') {
        handleSelectOption(2);
      } else if (e.key === '4' || e.key.toLowerCase() === 'd') {
        handleSelectOption(3);
      } else if (e.key === ' ' && selectedOptionIdx !== null) {
        e.preventDefault();
        setIsCardFlipped((prev) => !prev);
      } else if (e.key === 'Enter' && selectedOptionIdx !== null) {
        e.preventDefault();
        handleNextCard();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isQuizFinished, activeCard, selectedOptionIdx, handleSelectOption, handleNextCard]);

  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const accuracyPercent =
    attempts.length > 0 ? Math.round((correctCount / attempts.length) * 100) : 100;
  const missedAttempts = attempts.filter((a) => !a.isCorrect);

  const handleSaveCardToVault = (card: VocabCard, e?: React.MouseEvent) => {
    onSendToVault(card, e);
    setVaultSavedIds((prev) => ({ ...prev, [card.id]: true }));
  };

  const handleSaveAllMissedToVault = () => {
    let savedCount = 0;
    missedAttempts.forEach(({ card }) => {
      if (!vaultSavedIds[card.id]) {
        onSendToVault(card);
        savedCount++;
      }
    });
    const nextMap: Record<string, boolean> = { ...vaultSavedIds };
    missedAttempts.forEach(({ card }) => {
      nextMap[card.id] = true;
    });
    setVaultSavedIds(nextMap);
    if (savedCount > 0) {
      onShowToast(`Saved ${savedCount} missed C1/C2 terms to Mistake Vault!`);
    }
  };

  const totalC1Count = useMemo(
    () => cards.filter((c) => (c.cefr || '').toUpperCase() === 'C1').length,
    [cards]
  );
  const totalC2Count = useMemo(
    () => cards.filter((c) => (c.cefr || '').toUpperCase() === 'C2').length,
    [cards]
  );

  // ==================== QUIZ SUMMARY VIEW ====================
  if (isQuizFinished) {
    const bandEstimate =
      accuracyPercent >= 90
        ? 'Band 8.5–9.0 (C2 Mastery)'
        : accuracyPercent >= 75
        ? 'Band 7.5–8.0 (Strong C1)'
        : accuracyPercent >= 60
        ? 'Band 7.0 (Developing C1)'
        : 'Band 6.5 (Review Needed)';

    return (
      <div className="w-full max-w-3xl mx-auto bg-white rounded-3xl border-2 border-indigo-200 p-6 sm:p-8 shadow-md space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Trophy className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-mono font-bold uppercase">
                C1/C2 Flashcard Quiz Complete
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
                {correctCount} / {attempts.length} Correct ({accuracyPercent}%)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Estimated Lexical Readiness: <strong className="text-indigo-700">{bandEstimate}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => resetRound(Date.now(), null)}
              className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5 text-amber-300" />
              <span>New Shuffled Quiz</span>
            </button>
          </div>
        </div>

        {/* Score Telemetry Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
            <div className="text-[10px] font-mono uppercase font-bold text-emerald-700">Accuracy</div>
            <div className="text-xl font-black text-emerald-950 font-mono mt-0.5">{accuracyPercent}%</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-center">
            <div className="text-[10px] font-mono uppercase font-bold text-amber-800">Best Streak</div>
            <div className="text-xl font-black text-amber-950 font-mono mt-0.5">{bestStreak} 🔥</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-center">
            <div className="text-[10px] font-mono uppercase font-bold text-indigo-700">Mastered</div>
            <div className="text-xl font-black text-indigo-950 font-mono mt-0.5">{correctCount} Cards</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-center">
            <div className="text-[10px] font-mono uppercase font-bold text-rose-700">To Review</div>
            <div className="text-xl font-black text-rose-950 font-mono mt-0.5">{missedAttempts.length} Cards</div>
          </div>
        </div>

        {/* Missed Words Breakdown */}
        {missedAttempts.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Missed C1/C2 Vocabulary ({missedAttempts.length}) — বাংলা অর্থ ও সংজ্ঞা</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    resetRound(
                      Date.now(),
                      missedAttempts.map((m) => m.card.id)
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Missed Only ({missedAttempts.length})</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveAllMissedToVault}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Save All to Vault</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {missedAttempts.map(({ card }, idx) => (
                <div
                  key={`${card.id}_${idx}`}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-mono font-bold">
                        {card.cefr || 'C1'}
                      </span>
                      <span className="font-black text-slate-900 text-sm sm:text-base">
                        {card.item}
                      </span>
                      {card.banglaPronunciation && (
                        <span className="text-[11px] font-mono text-purple-700 font-semibold">
                          [{card.banglaPronunciation}]
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleSpeak(card.item, e)}
                        className="p-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                        title="Listen to pronunciation"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-xs font-bold text-amber-950 bg-amber-50/90 border border-amber-200 px-2.5 py-1 rounded-lg inline-block">
                      বাংলা অর্থ: {card.banglaMeaning}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-800">C1/C2 Definition:</strong> {card.definition}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleSaveCardToVault(card, e)}
                    disabled={!!vaultSavedIds[card.id]}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 flex items-center gap-1.5 transition cursor-pointer ${
                      vaultSavedIds[card.id]
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {vaultSavedIds[card.id] ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <Archive className="w-3.5 h-3.5" />
                        <span>Save to Vault</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1.5">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <div className="text-base font-black text-emerald-950">
              Flawless C1/C2 Score! 100% Accuracy
            </div>
            <p className="text-xs text-emerald-800">
              You mastered every C1/C2 academic definition and Bangla meaning in this flashcard set.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!activeCard) {
    return null;
  }

  const isAnswered = selectedOptionIdx !== null;
  const currentAttempt = isAnswered ? attempts[attempts.length - 1] : null;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 animate-fade-in">
      {/* ================= TOP QUIZ CONTROL & TELEMETRY BAR ================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs">
              <Award className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black uppercase tracking-wider text-indigo-700">
                  C1/C2 Flashcard Vocabulary Quiz
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-mono font-bold">
                  Band 7.5–9.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Interactive flashcard recall testing Practice C1/C2 definitions & বাংলা অর্থ
              </p>
            </div>
          </div>

          {/* Live Score, Streak & Accuracy Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-800">
              Card {currentIndex + 1} / {quizDeck.length}
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-mono font-bold text-emerald-800">
              Score: {correctCount}/{attempts.length} ({accuracyPercent}%)
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-mono font-bold text-amber-900 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{streak}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(620, 0.04);
                resetRound(Date.now(), null);
                onShowToast('Shuffled C1/C2 flashcard quiz deck!');
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
              title="Shuffle & Restart Quiz"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quiz Mode, CEFR Level & Deck Size Selectors */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Challenge Type Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200 overflow-x-auto">
            {[
              { id: 'dual_meaning' as const, label: 'Definition + বাংলা অর্থ' },
              { id: 'bangla' as const, label: 'বাংলা অর্থ (Bangla)' },
              { id: 'definition' as const, label: 'C1/C2 Definition' },
              { id: 'reverse' as const, label: 'Reverse Card (Guess Word)' }
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  soundManager.playBeep(580, 0.04);
                  setChallengeType(mode.id);
                  setSelectedOptionIdx(null);
                  setIsCardFlipped(false);
                }}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                  challengeType === mode.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* CEFR Level & Category Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="inline-flex p-1 bg-purple-50 rounded-xl border border-purple-200 text-[11px] font-bold">
              {[
                { id: 'all_c1_c2' as const, label: `C1 + C2 (${totalC1Count + totalC2Count})` },
                { id: 'C1' as const, label: `C1 (${totalC1Count})` },
                { id: 'C2' as const, label: `C2 (${totalC2Count})` }
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => {
                    soundManager.playBeep(600, 0.04);
                    setCefrFilter(lvl.id);
                    resetRound(Date.now(), null);
                  }}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                    cefrFilter === lvl.id
                      ? 'bg-purple-700 text-white shadow-2xs'
                      : 'text-purple-800 hover:bg-purple-100'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>

            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-[11px] font-bold">
              {[
                { size: 10 as const, label: '10 Cards' },
                { size: 20 as const, label: '20 Cards' },
                { size: 0 as const, label: 'All' }
              ].map((d) => (
                <button
                  key={d.size}
                  type="button"
                  onClick={() => {
                    soundManager.playBeep(580, 0.04);
                    setDeckSize(d.size);
                    resetRound(Date.now(), null);
                  }}
                  className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                    deckSize === d.size
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Filter Sub-Row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { id: 'all' as const, label: 'সব (All C1/C2)', icon: Layers },
              { id: 'word' as const, label: 'C1/C2 Words', icon: BookOpen },
              { id: 'phrase' as const, label: 'Collocations & Phrases', icon: Sparkles },
              { id: 'idiom' as const, label: 'Idioms', icon: Lightbulb }
            ].map((cat) => {
              const Icon = cat.icon;
              const active = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    soundManager.playBeep(580, 0.04);
                    setCategoryFilter(cat.id);
                    resetRound(Date.now(), null);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 whitespace-nowrap border transition cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="hidden sm:flex items-center gap-2 w-40">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
              <div
                className="bg-gradient-to-r from-indigo-600 to-purple-600 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.round(((currentIndex + (isAnswered ? 1 : 0)) / Math.max(1, quizDeck.length)) * 100))}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= INTERACTIVE FLASHCARD PROMPT STAGE ================= */}
      <div className="bg-gradient-to-br from-white via-slate-50/70 to-indigo-50/40 rounded-3xl border-2 border-indigo-200/80 p-5 sm:p-7 shadow-sm space-y-5 relative overflow-hidden">
        {/* Card Header Metadata */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-black border ${
                (activeCard.cefr || 'C1').toUpperCase() === 'C2'
                  ? 'bg-amber-100 text-amber-950 border-amber-300'
                  : 'bg-purple-100 text-purple-900 border-purple-200'
              }`}
            >
              CEFR {activeCard.cefr || 'C1'} · {activeCard.cefr === 'C2' ? 'Band 8.5–9.0' : 'Band 7.5–8.0'}
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
              {activeCard.topic}
            </span>
            {activeCard.partOfSpeech && (
              <span className="text-xs font-mono italic text-slate-500">
                ({activeCard.partOfSpeech})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {challengeType !== 'reverse' && (
              <button
                type="button"
                onClick={(e) => handleSpeak(activeCard.item, e)}
                className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Listen to British RP Pronunciation"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Pronounce</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(640, 0.05);
                setIsHintVisible((prev) => !prev);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition cursor-pointer ${
                isHintVisible
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Show Contextual Hint"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Hint</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(550, 0.06);
                setIsCardFlipped((prev) => !prev);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                isCardFlipped
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
              }`}
              title="Flip Flashcard to inspect full C1/C2 nuance & example"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{isCardFlipped ? 'Front of Card' : 'Flip Card'}</span>
            </button>
          </div>
        </div>

        {/* Flashcard Front vs Flipped Study Side */}
        {!isCardFlipped ? (
          <div className="text-center py-4 sm:py-6 space-y-3">
            {challengeType === 'reverse' ? (
              <>
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600">
                  Identify the C1/C2 Term from its Definition & বাংলা অর্থ:
                </div>
                <div className="max-w-xl mx-auto p-4 rounded-2xl bg-amber-50/90 border-2 border-amber-300 text-slate-900 shadow-2xs space-y-1.5">
                  <div className="text-[11px] font-mono font-bold uppercase text-amber-800">
                    বাংলা অর্থ (Bangla Meaning):
                  </div>
                  <div className="text-base sm:text-lg font-extrabold text-slate-950">
                    {activeCard.banglaMeaning}
                  </div>
                </div>
                <div className="max-w-xl mx-auto p-3.5 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <strong className="text-slate-900">Practice C1/C2 Definition:</strong>{' '}
                  {activeCard.definition}
                </div>
              </>
            ) : (
              <>
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  {challengeType === 'dual_meaning'
                    ? 'Select the matching C1/C2 Definition & বাংলা অর্থ for:'
                    : challengeType === 'bangla'
                    ? 'Select the correct বাংলা অর্থ (Bangla Meaning) for:'
                    : 'Select the accurate Practice C1/C2 Definition for:'}
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  "{activeCard.item}"
                </h2>
                {activeCard.banglaPronunciation && (
                  <div className="text-xs font-mono text-purple-700 font-semibold">
                    উচ্চারণ: [{activeCard.banglaPronunciation}]
                  </div>
                )}
              </>
            )}

            {/* Optional Contextual Hint */}
            {isHintVisible && (
              <div className="max-w-xl mx-auto p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1 animate-fade-in">
                {activeCard.beginnerPhrase && (
                  <div>
                    <strong className="font-bold">Replaces simple phrase:</strong>{' '}
                    <span className="italic">"{activeCard.beginnerPhrase}"</span>
                  </div>
                )}
                <div className="font-serif italic text-slate-700">
                  Context:{' '}
                  "
                  {activeCard.exampleSentence.replace(
                    new RegExp(activeCard.item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
                    '_____'
                  )}
                  "
                </div>
              </div>
            )}
          </div>
        ) : (
          /* FLIPPED FLASHCARD BACK: Full C1/C2 Definition, Bangla Meaning & Example */
          <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-indigo-200 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black uppercase text-indigo-700">
                  Flashcard Back · Full C1/C2 Breakdown
                </span>
                <span className="font-black text-slate-900 text-base">"{activeCard.item}"</span>
              </div>
              <button
                type="button"
                onClick={(e) => handleSpeak(activeCard.exampleSentence, e)}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Hear Example</span>
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 space-y-1">
              <div className="text-[11px] font-mono font-bold uppercase text-amber-900">
                বাংলা অর্থ ও ব্যাখ্যা:
              </div>
              <div className="text-sm sm:text-base font-extrabold text-slate-950">
                {activeCard.banglaMeaning}
              </div>
              {activeCard.banglaExplanation && (
                <p className="text-xs text-slate-700 leading-relaxed pt-0.5">
                  {activeCard.banglaExplanation}
                </p>
              )}
            </div>

            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">Practice C1/C2 Definition:</strong>{' '}
              {activeCard.definition}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-serif italic text-slate-800">
              "{activeCard.exampleSentence}"
            </div>
          </div>
        )}

        {/* ================= 4 MULTIPLE CHOICE FLASHCARD OPTIONS ================= */}
        <div className="grid grid-cols-1 gap-2.5">
          {optionItems.map((option, idx) => {
            const isSelected = selectedOptionIdx === idx;
            const isCorrect = option.isCorrect;

            let cardStyle =
              'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 text-slate-800';
            if (isAnswered) {
              if (isCorrect) {
                cardStyle = 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-2xs';
              } else if (isSelected && !isCorrect) {
                cardStyle = 'bg-rose-50 border-rose-400 text-rose-950';
              } else {
                cardStyle = 'bg-white/60 border-slate-200 text-slate-400 opacity-75';
              }
            }

            return (
              <button
                key={`${option.card.id}_${idx}`}
                type="button"
                disabled={isAnswered}
                onClick={() => handleSelectOption(idx)}
                className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition flex items-start justify-between gap-3 cursor-pointer ${cardStyle}`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono text-xs font-black shrink-0 mt-0.5 ${
                      isAnswered && isCorrect
                        ? 'bg-emerald-600 text-white'
                        : isAnswered && isSelected && !isCorrect
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>

                  <div className="space-y-1 min-w-0">
                    {challengeType === 'dual_meaning' && (
                      <>
                        <div className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                          বাংলা অর্থ: {option.card.banglaMeaning}
                        </div>
                        <div className="text-xs text-slate-600 leading-relaxed">
                          <span className="font-mono text-[10px] uppercase font-bold text-indigo-700 mr-1">
                            Definition:
                          </span>
                          {option.card.definition}
                        </div>
                      </>
                    )}

                    {challengeType === 'bangla' && (
                      <div className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                        {option.card.banglaMeaning}
                      </div>
                    )}

                    {challengeType === 'definition' && (
                      <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                        {option.card.definition}
                      </div>
                    )}

                    {challengeType === 'reverse' && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 text-sm sm:text-base">
                          {option.card.item}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                          {option.card.cefr || 'C1'}
                        </span>
                        {option.card.banglaPronunciation && (
                          <span className="text-[11px] font-mono text-purple-700">
                            [{option.card.banglaPronunciation}]
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {isAnswered && isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                {isAnswered && isSelected && !isCorrect && (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* ================= POST-ANSWER EXPLANATION & ACTION FOOTER ================= */}
        {isAnswered && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-indigo-200 space-y-3.5 animate-fade-in shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {currentAttempt?.isCorrect ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-black">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>সঠিক উত্তর! Correct C1/C2 Match</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-100 text-rose-900 text-xs font-black">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>ভুল উত্তর · Review C1/C2 Nuance Below</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={(e) => handleSpeak(activeCard.exampleSentence, e)}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Hear Example</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleSaveCardToVault(activeCard, e)}
                  disabled={!!vaultSavedIds[activeCard.id]}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition cursor-pointer ${
                    vaultSavedIds[activeCard.id]
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{vaultSavedIds[activeCard.id] ? 'Saved in Vault' : 'Add to Vault'}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => onToggleMastery(activeCard.id, e)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition cursor-pointer ${
                    activeCard.mastered
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{activeCard.mastered ? '✓ Mastered' : 'Mark Mastered'}</span>
                </button>
              </div>
            </div>

            {/* Complete Bilingual C1/C2 Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 space-y-1">
                <div className="font-mono text-[10px] uppercase font-bold text-amber-900">
                  বাংলা অর্থ ও ব্যাখ্যা (Bangla Meaning):
                </div>
                <div className="font-extrabold text-slate-900 text-sm">
                  {activeCard.banglaMeaning}
                </div>
                {activeCard.banglaExplanation && (
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    {activeCard.banglaExplanation}
                  </p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-mono text-[10px] uppercase font-bold text-indigo-800">
                  Practice C1/C2 Definition & Example:
                </div>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {activeCard.definition}
                </p>
                <p className="text-slate-600 font-serif italic pt-0.5">
                  "{activeCard.exampleSentence}"
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handlePrevCard}
                disabled={currentIndex === 0}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={handleNextCard}
                className="flex-1 sm:flex-initial sm:min-w-[220px] min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>
                  {currentIndex + 1 >= quizDeck.length
                    ? 'Finish Quiz & View C1/C2 Report'
                    : 'Next C1/C2 Flashcard'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
