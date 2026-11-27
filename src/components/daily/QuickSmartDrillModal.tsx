import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Zap,
  Clock,
  Volume2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  BookmarkCheck,
  SpellCheck,
  BookOpen,
  Award,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDueMistakes, getMistakes, recordSM2Review, addMistake } from '../../utils/vaultStorage';
import { IELTS_SPELLING_TRAPS, SpellingTrapItem } from '../../data/ieltsSpellingData';
import { loadSpellingProgress, saveSpellingProgress } from '../../utils/spellingProgressStore';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';
import { MistakeItem } from '../../types';
import { EASE_EDITORIAL } from '../common/MotionPrimitives';
import { triggerBarnabyCelebration } from '../../utils/barnabyStateEngine';

interface TFNGTrapQuestion {
  id: string;
  passage: string;
  statement: string;
  correct: 'TRUE' | 'FALSE' | 'NOT GIVEN';
  explanationEn: string;
  explanationBn: string;
}

const HIGH_YIELD_TFNG_BANK: TFNGTrapQuestion[] = [
  {
    id: 'tfng_1',
    passage:
      'Although early solar panels were prohibitively expensive for residential households, sustained manufacturing scale-ups in East Asia reduced photovoltaic module costs by over 80% between 2010 and 2020.',
    statement: 'Residential households were the primary buyers of solar panels prior to 2010.',
    correct: 'FALSE',
    explanationEn:
      'The passage states early panels were "prohibitively expensive for residential households", which directly contradicts the claim that they were primary buyers.',
    explanationBn:
      'প্যাসেজে বলা হয়েছে প্রথমদিকের সোলার প্যানেল সাধারণ পরিবারের জন্য অত্যন্ত ব্যয়বহুল ছিল—যা “প্রধান ক্রেতা” দাবির সরাসরি বিরোধী, তাই উত্তর FALSE।'
  },
  {
    id: 'tfng_2',
    passage:
      'Urban vertical farms can cut water consumption by up to 95% compared with open-field agriculture, though their reliance on artificial LED lighting results in substantially higher electricity bills.',
    statement: 'Vertical farms produce vegetables with higher vitamin content than traditional farms.',
    correct: 'NOT GIVEN',
    explanationEn:
      'The text compares water usage and electricity costs, but makes zero mention of vitamin content or nutritional density.',
    explanationBn:
      'প্যাসেজে পানি সাশ্রয় ও বিদ্যুৎ খরচের কথা বলা আছে, কিন্তু ভিটামিন বা পুষ্টিগুণ নিয়ে কোনো তথ্যই নেই—তাই উত্তর NOT GIVEN।'
  },
  {
    id: 'tfng_3',
    passage:
      'While bilingual children occasionally mix vocabulary from both languages during early speech acquisition, longitudinal studies confirm they match or surpass monolingual peers in executive attention by age seven.',
    statement: 'Occasional language mixing in early childhood prevents bilinguals from matching monolinguals in attention skills.',
    correct: 'FALSE',
    explanationEn:
      'Longitudinal studies confirm bilingual children match or surpass monolingual peers by age seven—the opposite of the statement.',
    explanationBn:
      'গবেষণায় দেখা গেছে ৭ বছর বয়সের মধ্যে দ্বিভাষী শিশুরা মনোযোগের দক্ষতায় একভাষীদের সমান বা এগিয়ে থাকে, তাই “prevents” দাবিটি সরাসরি FALSE।'
  },
  {
    id: 'tfng_4',
    passage:
      'Municipal congestion charges introduced in Stockholm led to an immediate 20% drop in peak-hour traffic, prompting voters to approve making the trial permanent in a 2006 referendum.',
    statement: 'Public support for Stockholm’s congestion charge was confirmed through a formal vote.',
    correct: 'TRUE',
    explanationEn:
      '"Voters approved making the trial permanent in a 2006 referendum" directly paraphrases confirmation through a formal vote.',
    explanationBn:
      '২০০৬ সালের গণভোটে (referendum) ভোটাররা এটি স্থায়ী করার অনুমোদন দেয়—যা formal vote-এর সরাসরি সমার্থক, তাই উত্তর TRUE।'
  },
  {
    id: 'tfng_5',
    passage:
      'Deep-sea hydrothermal vents sustain dense colonies of tube worms and shrimp without sunlight, relying instead on chemosynthetic bacteria that convert dissolved hydrogen sulphide into organic nutrients.',
    statement: 'Sunlight plays no role in sustaining ecosystems around deep-sea hydrothermal vents.',
    correct: 'TRUE',
    explanationEn:
      'The passage explicitly notes these colonies are sustained "without sunlight" via chemosynthetic bacteria.',
    explanationBn:
      'প্যাসেজে স্পষ্ট লেখা আছে এই বাস্তুতন্ত্র সূর্যালোক ছাড়াই (without sunlight) টিকে থাকে—তাই উত্তর TRUE।'
  },
  {
    id: 'tfng_6',
    passage:
      'Historians generally agree that the printing press accelerated literacy across Renaissance Europe, yet debates persist over whether manuscript scribes suffered immediate unemployment in every region.',
    statement: 'All manuscript scribes in Renaissance Europe lost their livelihoods immediately after the printing press arrived.',
    correct: 'FALSE',
    explanationEn:
      'Watch the extreme qualifier "All... immediately". The passage explicitly states debates persist over whether scribes suffered immediate unemployment in every region.',
    explanationBn:
      '“All” ও “immediately” হলো চরম শব্দ (extreme qualifier)। প্যাসেজে বলা আছে এ নিয়ে ঐতিহাসিকদের মধ্যে এখনো বিতর্ক রয়েছে, তাই সর্বজনীন দাবিটি FALSE।'
  }
];

type SmartDrillItem =
  | { kind: 'vault'; id: string; mistake: MistakeItem }
  | { kind: 'spelling'; id: string; trap: SpellingTrapItem }
  | { kind: 'tfng'; id: string; question: TFNGTrapQuestion };

function buildAdaptiveDrillDeck(): SmartDrillItem[] {
  const deck: SmartDrillItem[] = [];

  // 1. Pull up to 2 due or unresolved Mistake Vault items
  const due = getDueMistakes();
  const unresolved = getMistakes().filter((m) => !m.mastered);
  const vaultPool = due.length > 0 ? due : unresolved;
  vaultPool.slice(0, 2).forEach((m) => {
    deck.push({ kind: 'vault', id: `vault_${m.id}`, mistake: m });
  });

  // 2. Pull up to 2 weak or unmastered Spelling Lab words (683 bank)
  const sp = loadSpellingProgress();
  const masteredSet = new Set(sp.masteredWords);
  const wrongSet = new Set(sp.wrongWords);

  const prioritizedSpelling = [
    ...IELTS_SPELLING_TRAPS.filter((w) => wrongSet.has(w.id)),
    ...IELTS_SPELLING_TRAPS.filter((w) => !masteredSet.has(w.id) && !wrongSet.has(w.id))
  ];
  const shuffledSpelling = [...prioritizedSpelling.slice(0, 30)].sort(() => Math.random() - 0.5);
  shuffledSpelling.slice(0, 2).forEach((trap) => {
    deck.push({ kind: 'spelling', id: `spell_${trap.id}`, trap });
  });

  // 3. Fill remaining slots up to 6 total items with Reading TFNG trap drills
  const neededTfng = Math.max(2, 6 - deck.length);
  const shuffledTfng = [...HIGH_YIELD_TFNG_BANK].sort(() => Math.random() - 0.5);
  shuffledTfng.slice(0, neededTfng).forEach((q) => {
    deck.push({ kind: 'tfng', id: `tfng_${q.id}`, question: q });
  });

  return deck.slice(0, 6);
}

interface QuickSmartDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const QuickSmartDrillModal: React.FC<QuickSmartDrillModalProps> = ({
  isOpen,
  onClose,
  onShowToast
}) => {
  const [deck, setDeck] = useState<SmartDrillItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeftSec, setTimeLeftSec] = useState(300);
  const [isFinished, setIsFinished] = useState(false);

  // Per-item interaction states
  const [vaultRevealed, setVaultRevealed] = useState(false);
  const [spellingInput, setSpellingInput] = useState('');
  const [answeredState, setAnsweredState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [selectedTfng, setSelectedTfng] = useState<'TRUE' | 'FALSE' | 'NOT GIVEN' | null>(null);

  // Session score counters
  const [correctCount, setCorrectCount] = useState(0);
  const [vaultReviewedCount, setVaultReviewedCount] = useState(0);
  const [spellingUpdatedCount, setSpellingUpdatedCount] = useState(0);

  const startFreshSession = () => {
    stopSpeech();
    setDeck(buildAdaptiveDrillDeck());
    setCurrentIdx(0);
    setTimeLeftSec(300);
    setIsFinished(false);
    setVaultRevealed(false);
    setSpellingInput('');
    setAnsweredState('idle');
    setSelectedTfng(null);
    setCorrectCount(0);
    setVaultReviewedCount(0);
    setSpellingUpdatedCount(0);
  };

  useEffect(() => {
    if (isOpen) {
      startFreshSession();
    } else {
      stopSpeech();
    }
    return () => stopSpeech();
  }, [isOpen]);

  // 5:00 countdown timer
  useEffect(() => {
    if (!isOpen || isFinished) return;
    const timer = setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev <= 1) {
          setIsFinished(true);
          triggerBarnabyCelebration('5-Minute Smart Drill complete');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, isFinished]);

  const currentItem = deck[currentIdx];

  // Auto-speak spelling word when entering a spelling card
  useEffect(() => {
    if (isOpen && !isFinished && currentItem?.kind === 'spelling') {
      const t = setTimeout(() => {
        speakBritish(currentItem.trap.word, { rate: 0.92 });
      }, 250);
      return () => clearTimeout(t);
    }
  }, [isOpen, isFinished, currentItem]);

  const progressPct = useMemo(() => {
    if (deck.length === 0) return 0;
    return Math.round(((currentIdx + (answeredState !== 'idle' ? 1 : 0)) / deck.length) * 100);
  }, [currentIdx, answeredState, deck.length]);

  const formatClock = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const advanceNext = () => {
    stopSpeech();
    if (currentIdx + 1 >= deck.length) {
      setIsFinished(true);
      soundManager.playSuccess();
      triggerBarnabyCelebration('5-Minute Smart Drill complete');
      onShowToast('5-Minute Smart Drill complete! Progress synced.');
      return;
    }
    setCurrentIdx((prev) => prev + 1);
    setVaultRevealed(false);
    setSpellingInput('');
    setAnsweredState('idle');
    setSelectedTfng(null);
    soundManager.playBeep(600, 0.03);
  };

  const handleVaultRate = (quality: 1 | 5) => {
    if (!currentItem || currentItem.kind !== 'vault') return;
    recordSM2Review(currentItem.mistake.id, quality);
    setVaultReviewedCount((c) => c + 1);
    if (quality === 5) {
      setCorrectCount((c) => c + 1);
      setAnsweredState('correct');
      soundManager.playSuccess();
    } else {
      setAnsweredState('wrong');
      soundManager.playBeep(360, 0.06);
    }
  };

  const handleCheckSpelling = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem || currentItem.kind !== 'spelling' || answeredState !== 'idle') return;
    const cleanInput = spellingInput.trim().toLowerCase();
    const target = currentItem.trap.word.trim().toLowerCase();
    const isCorrect = cleanInput === target;

    const currentProgress = loadSpellingProgress();
    const mastered = new Set(currentProgress.masteredWords);
    const wrong = new Set(currentProgress.wrongWords);
    if (isCorrect) {
      mastered.add(currentItem.trap.id);
      wrong.delete(currentItem.trap.id);
      setCorrectCount((c) => c + 1);
      setAnsweredState('correct');
      soundManager.playSuccess();
    } else {
      wrong.add(currentItem.trap.id);
      setAnsweredState('wrong');
      soundManager.playBeep(340, 0.08);
    }
    saveSpellingProgress({
      correctCount: currentProgress.correctCount + (isCorrect ? 1 : 0),
      attemptedCount: currentProgress.attemptedCount + 1,
      masteredWords: Array.from(mastered),
      wrongWords: Array.from(wrong)
    });
    setSpellingUpdatedCount((c) => c + 1);
  };

  const handleSelectTfng = (choice: 'TRUE' | 'FALSE' | 'NOT GIVEN') => {
    if (!currentItem || currentItem.kind !== 'tfng' || answeredState !== 'idle') return;
    setSelectedTfng(choice);
    const isCorrect = choice === currentItem.question.correct;
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      setAnsweredState('correct');
      soundManager.playSuccess();
    } else {
      setAnsweredState('wrong');
      soundManager.playBeep(340, 0.08);
      addMistake({
        module: 'reading',
        title: `Smart Drill TFNG Trap: ${currentItem.question.statement.slice(0, 52)}...`,
        prompt: currentItem.question.statement,
        questionType: 'True / False / Not Given',
        userAnswer: choice,
        userWrongAnswer: choice,
        correctAnswer: currentItem.question.correct,
        explanation: currentItem.question.explanationEn,
        trapExplanationEn: currentItem.question.explanationEn,
        trapExplanationBn: currentItem.question.explanationBn
      });
    }
  };

  if (!isOpen) return null;

  const accuracyPct = deck.length > 0 ? Math.round((correctCount / deck.length) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#071110]/75 backdrop-blur-xs animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="5-Minute Smart Drill"
    >
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: EASE_EDITORIAL }}
        className="w-full max-w-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/45 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
      >
        {/* Modal Header */}
        <div className="bg-[#0F4C45] text-white px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#0B3833] border border-white/15 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-[#F4A62A]" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#F4A62A] font-bold">
                Adaptive Daily Warm-Up
              </div>
              <h2 className="font-display text-base sm:text-lg font-bold truncate">
                5-Minute Quick Smart Drill
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="px-2.5 py-1.5 rounded-lg bg-[#0B3833] border border-white/15 font-mono text-xs font-bold tabular-nums flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span>{formatClock(timeLeftSec)}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                stopSpeech();
                onClose();
              }}
              aria-label="Close smart drill"
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Progress Strip */}
        {!isFinished && (
          <div className="px-5 pt-3.5 pb-1 space-y-1.5 bg-[#F7F9F8] dark:bg-[#0B1514] border-b border-[#D3DDDA] dark:border-[#1F8A70]/25">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#566664] dark:text-slate-400 tabular-nums">
              <span>
                Card {Math.min(currentIdx + 1, deck.length)} of {deck.length}
              </span>
              <span>Score: {correctCount} / {deck.length}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#D3DDDA] dark:bg-[#1E3330] overflow-hidden">
              <motion.div
                className="h-full bg-[#0F4C45] dark:bg-[#F4A62A]"
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.25, ease: EASE_EDITORIAL }}
              />
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 sm:p-6">
          {isFinished ? (
            <div className="text-center space-y-5 py-3">
              <div className="w-14 h-14 rounded-2xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/40 text-[#0F4C45] dark:text-[#F4A62A] flex items-center justify-center mx-auto">
                <Award className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#0F4C45] dark:text-[#4DB6A4]">
                  Sprint Complete · Cloud Synced
                </span>
                <h3 className="font-display text-2xl font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                  {accuracyPct >= 80
                    ? 'Sharp Band 8.0+ Reflexes!'
                    : accuracyPct >= 50
                    ? 'Solid Daily Momentum!'
                    : 'Traps Identified & Vaulted!'}
                </h3>
                <p className="text-xs sm:text-sm text-[#566664] dark:text-slate-400 max-w-md mx-auto">
                  Every reviewed Mistake Vault card, Spelling word, and missed TFNG trap has been saved to your synced profile.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto font-mono tabular-nums">
                <div className="p-3 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30">
                  <div className="text-[10px] uppercase text-[#566664] dark:text-slate-400">Accuracy</div>
                  <div className="text-xl font-bold text-[#0F4C45] dark:text-[#F4A62A] mt-0.5">{accuracyPct}%</div>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30">
                  <div className="text-[10px] uppercase text-[#566664] dark:text-slate-400">Correct</div>
                  <div className="text-xl font-bold text-[#0E1F1E] dark:text-white mt-0.5">
                    {correctCount}/{deck.length}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30">
                  <div className="text-[10px] uppercase text-[#566664] dark:text-slate-400">Synced</div>
                  <div className="text-xl font-bold text-[#1F8A70] mt-0.5">
                    {vaultReviewedCount + spellingUpdatedCount}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={startFreshSession}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] hover:bg-[#E1ECE9] text-[#0E1F1E] dark:text-[#EEF3F1] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-xs font-bold flex items-center gap-2 cursor-pointer transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Run Another 5-Min Drill</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold cursor-pointer transition"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : currentItem ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentItem.id}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.18, ease: EASE_EDITORIAL }}
                className="space-y-4"
              >
                {/* TYPE 1: MISTAKE VAULT SM-2 ACTIVE RECALL */}
                {currentItem.kind === 'vault' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-[#0F4C45] dark:text-[#F4A62A]">
                      <BookmarkCheck className="w-4 h-4" />
                      <span>Mistake Vault Review · {currentItem.mistake.module}</span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-2.5">
                      <h3 className="font-display text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                        {currentItem.mistake.title}
                      </h3>
                      {currentItem.mistake.prompt && (
                        <p className="text-xs text-[#384543] dark:text-slate-300 leading-relaxed">
                          {currentItem.mistake.prompt}
                        </p>
                      )}
                      <div className="p-2.5 rounded-lg bg-[#FDF2F2] dark:bg-rose-950/35 border border-[#F5B8B8] dark:border-rose-900/50 text-xs">
                        <span className="font-mono text-[10px] uppercase font-bold text-[#B3261E] dark:text-rose-300 block">
                          Previous Slip:
                        </span>
                        <span className="line-through text-[#8C1D18] dark:text-rose-200">
                          {currentItem.mistake.userAnswer}
                        </span>
                      </div>
                    </div>

                    {!vaultRevealed ? (
                      <button
                        type="button"
                        onClick={() => {
                          setVaultRevealed(true);
                          soundManager.playBeep(560, 0.03);
                        }}
                        className="w-full min-h-[46px] py-3 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold cursor-pointer transition"
                      >
                        Reveal Band 8.5+ Fix &amp; Explanation
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl bg-[#EEF3F1] dark:bg-[#0F4C45]/30 border border-[#9EBEB8] dark:border-[#1F8A70]/50 space-y-2 text-xs">
                          <span className="font-mono text-[10px] uppercase font-bold text-[#0F4C45] dark:text-emerald-300 block">
                            Correct / Upgraded Answer:
                          </span>
                          <p className="font-bold text-sm text-[#0E1F1E] dark:text-white">
                            {currentItem.mistake.correctAnswer}
                          </p>
                          <p className="text-[#384543] dark:text-slate-300 leading-relaxed pt-1">
                            {currentItem.mistake.trapExplanationEn || currentItem.mistake.explanation}
                          </p>
                          {currentItem.mistake.trapExplanationBn && (
                            <p className="text-[#384543] dark:text-slate-300 leading-relaxed pt-1 border-t border-[#D3DDDA] dark:border-[#1F8A70]/30">
                              {currentItem.mistake.trapExplanationBn}
                            </p>
                          )}
                        </div>

                        {answeredState === 'idle' ? (
                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleVaultRate(1)}
                              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#FDF2F2] hover:bg-[#FCE4E4] dark:bg-rose-950/40 text-[#8C1D18] dark:text-rose-200 border border-[#F5B8B8] dark:border-rose-900 text-xs font-bold cursor-pointer transition"
                            >
                              Still Tricky (Review Soon)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVaultRate(5)}
                              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold cursor-pointer transition"
                            >
                              Got It! (Boost Mastery)
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}

                {/* TYPE 2: AUDIO SPELLING DICTATION FROM 683 BANK */}
                {currentItem.kind === 'spelling' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-[#0F4C45] dark:text-[#F4A62A]">
                        <SpellCheck className="w-4 h-4" />
                        <span>Listening Spelling Dictation · {currentItem.trap.category}</span>
                      </div>
                      <span className="text-[11px] font-mono text-[#566664] dark:text-slate-400">
                        {currentItem.trap.word.length} letters
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                            Listen carefully &amp; spell the IELTS trap word:
                          </div>
                          <div className="text-xs text-[#566664] dark:text-slate-400 mt-0.5">
                            Meaning: <strong>{currentItem.trap.meaning_bn}</strong> ({currentItem.trap.phonetic})
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => speakBritish(currentItem.trap.word, { rate: 0.72 })}
                            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1] hover:bg-[#EEF3F1] cursor-pointer transition"
                          >
                            0.7× Slow
                          </button>
                          <button
                            type="button"
                            onClick={() => speakBritish(currentItem.trap.word, { rate: 0.96 })}
                            className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-[#F4A62A]" />
                            <span>Hear Word</span>
                          </button>
                        </div>
                      </div>

                      <form onSubmit={handleCheckSpelling} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={spellingInput}
                          onChange={(e) => setSpellingInput(e.target.value)}
                          disabled={answeredState !== 'idle'}
                          autoFocus
                          autoComplete="off"
                          spellCheck={false}
                          placeholder="Type exact British/IELTS spelling..."
                          className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/40 text-sm font-mono font-bold text-[#0E1F1E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F4C45]"
                        />
                        {answeredState === 'idle' && (
                          <button
                            type="submit"
                            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F4A62A] hover:bg-[#d98f1d] text-[#0E1F1E] text-xs font-bold cursor-pointer transition shrink-0"
                          >
                            Check
                          </button>
                        )}
                      </form>

                      {answeredState !== 'idle' && (
                        <div
                          className={`p-3 rounded-xl border text-xs space-y-1 ${
                            answeredState === 'correct'
                              ? 'bg-[#EEF3F1] dark:bg-[#0F4C45]/35 border-[#9EBEB8] text-[#0F4C45] dark:text-emerald-200'
                              : 'bg-[#FDF2F2] dark:bg-rose-950/40 border-[#F5B8B8] text-[#8C1D18] dark:text-rose-200'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold">
                            {answeredState === 'correct' ? (
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 shrink-0" />
                            )}
                            <span>
                              {answeredState === 'correct'
                                ? `Spot-on! "${currentItem.trap.word}" mastered.`
                                : `Correct spelling: "${currentItem.trap.word}" (Common slip: ${currentItem.trap.commonError})`}
                            </span>
                          </div>
                          <p className="opacity-90 leading-relaxed">{currentItem.trap.memoryTrick}</p>
                          {currentItem.trap.memoryTrick_bn && (
                            <p className="opacity-85 leading-relaxed pt-1 border-t border-current/15">
                              {currentItem.trap.memoryTrick_bn}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TYPE 3: READING TFNG TRAP DRILL */}
                {currentItem.kind === 'tfng' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-[#0F4C45] dark:text-[#F4A62A]">
                      <BookOpen className="w-4 h-4" />
                      <span>Reading TFNG Trap Drill</span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-3">
                      <p className="text-xs sm:text-sm text-[#0E1F1E] dark:text-[#EEF3F1] leading-relaxed font-serif">
                        “{currentItem.question.passage}”
                      </p>
                      <div className="p-3 rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-xs">
                        <span className="font-mono text-[10px] uppercase font-bold text-[#566664] dark:text-slate-400 block mb-1">
                          Statement to Verify:
                        </span>
                        <strong className="text-[#0E1F1E] dark:text-white text-sm">
                          {currentItem.question.statement}
                        </strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      {(['TRUE', 'FALSE', 'NOT GIVEN'] as const).map((choice) => {
                        const isPicked = selectedTfng === choice;
                        const isRight = answeredState !== 'idle' && choice === currentItem.question.correct;
                        const isWrongPicked = answeredState === 'wrong' && isPicked;

                        return (
                          <button
                            key={choice}
                            type="button"
                            disabled={answeredState !== 'idle'}
                            onClick={() => handleSelectTfng(choice)}
                            className={`min-h-[46px] px-3 py-2.5 rounded-xl font-mono text-xs font-bold border transition cursor-pointer ${
                              isRight
                                ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                                : isWrongPicked
                                ? 'bg-[#CC3333] text-white border-[#CC3333]'
                                : 'bg-white dark:bg-[#0B1514] hover:bg-[#EEF3F1] dark:hover:bg-[#182C29] text-[#0E1F1E] dark:text-[#EEF3F1] border-[#D3DDDA] dark:border-[#1F8A70]/35'
                            }`}
                          >
                            {choice}
                          </button>
                        );
                      })}
                    </div>

                    {answeredState !== 'idle' && (
                      <div className="p-3.5 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-xs space-y-1.5">
                        <div className="font-bold text-[#0F4C45] dark:text-[#F4A62A] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {answeredState === 'correct'
                              ? 'Correct! Clean trap recognition.'
                              : `Answer: ${currentItem.question.correct} (Saved to Mistake Vault)`}
                          </span>
                        </div>
                        <p className="text-[#0E1F1E] dark:text-[#EEF3F1] leading-relaxed">
                          {currentItem.question.explanationEn}
                        </p>
                        <p className="text-[#566664] dark:text-slate-300 leading-relaxed pt-1 border-t border-[#D3DDDA] dark:border-[#1F8A70]/25">
                          {currentItem.question.explanationBn}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Next Card CTA */}
                {answeredState !== 'idle' && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={advanceNext}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition"
                    >
                      <span>{currentIdx + 1 >= deck.length ? 'Finish & View Summary' : 'Next Card'}</span>
                      <ArrowRight className="w-4 h-4 text-[#F4A62A]" />
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
};
