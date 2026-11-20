import React, { useState, useEffect } from 'react';
import {
  Zap,
  Clock,
  Sparkles,
  Trophy,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Volume2,
  X,
  Flame,
  Award,
  ChevronRight
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { fireAchievementConfetti } from '../../services/achievementService';
import { ResponsiveModal } from '../common/ResponsiveModal';

interface IELTSSpeedBlitzModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardXp?: (xp: number) => void;
}

interface BlitzQuestion {
  id: string;
  category: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const BLITZ_QUESTIONS_POOL: BlitzQuestion[] = [
  {
    id: 'bz_1',
    category: 'Collocations (Band 8+)',
    prompt: 'Which phrase is the most natural Band 8+ academic collocation for "make a problem worse"?',
    options: ['Exacerbate the predicament', 'Enlarge the bad situation', 'Make critical issues bigger', 'Develop severe dilemmas'],
    correctIndex: 0,
    explanation: '"Exacerbate the predicament" is an authentic C2 academic collocation highly valued in Task 2 essays.'
  },
  {
    id: 'bz_2',
    category: 'British Spelling Check',
    prompt: 'Which spelling is standard British English required for top accuracy in IELTS Listening?',
    options: ['Accomodation', 'Accommodation', 'Acommodation', 'Acomadation'],
    correctIndex: 1,
    explanation: 'Double "c" and double "m" (Accommodation) is one of the top 3 most tested spelling traps in Practice Section 1!'
  },
  {
    id: 'bz_3',
    category: 'Discourse Markers',
    prompt: 'Which linker signals an analytical concession without sounding robotic?',
    options: ['First and foremost', 'While this holds validity, significant counter-considerations exist', 'On the opposing extreme side', 'In my personal thought'],
    correctIndex: 1,
    explanation: 'This concession formula smoothly bridges two sides of an argument for a high Coherence & Cohesion score.'
  },
  {
    id: 'bz_4',
    category: 'Speaking Part 3 Fillers',
    prompt: 'Which native filler buys you 3 seconds of formulation time when asked an abstract philosophical question?',
    options: ['Um, let me see what I can say', 'That is a rather intriguing question to consider...', 'I have never learned this topic before', 'My mind is totally empty right now'],
    correctIndex: 1,
    explanation: '"That is a rather intriguing question to consider..." showcases natural poise and British conversational rhythm.'
  },
  {
    id: 'bz_5',
    category: 'Lexical Precision',
    prompt: 'What preposition naturally completes the phrase: "Pave the way _____ sustainable development"?',
    options: ['to', 'for', 'with', 'in'],
    correctIndex: 1,
    explanation: 'The collocation is always "pave the way for [something]"!'
  },
  {
    id: 'bz_6',
    category: 'Task 2 Cohesion',
    prompt: 'Which transitional device best introduces a compelling illustrative example?',
    options: ['For example like', 'A classic case in point would be...', 'Example number one is', 'Such as like this'],
    correctIndex: 1,
    explanation: '"A classic case in point would be..." avoids the repetitive "For example" and elevates Lexical Resource.'
  },
  {
    id: 'bz_7',
    category: 'Speaking Part 2 Cadence',
    prompt: 'To describe a formative memory in Part 2, which idiomatic phrase sounds most natural?',
    options: ['The first memory that springs to mind is...', 'I start my mind with...', 'At the first place of memory...', 'Looking through my head...'],
    correctIndex: 0,
    explanation: '"Springs to mind" is a natural native English idiom that boosts Fluency & Lexical Resource.'
  }
];

const DAILY_EXAMINER_SECRETS = [
  {
    title: 'Natural Pausing in Speaking',
    tip: 'In Speaking Part 2 and 3, pauses for content (thinking about what to say) are completely natural. Only pauses for language (searching for basic words or grammar) reduce your Fluency score. Use discourse fillers like "That is a rather nuanced issue..." to buy time seamlessly!'
  },
  {
    title: 'The "Singular vs Plural" Listening Trap',
    tip: 'Over 30% of lost marks in IELTS Listening come from missing a final "s" (e.g., writing "ticket" instead of "tickets"). Always check grammatical agreement in sentence completions before the 10-minute transfer time ends!'
  },
  {
    title: 'Avoid Memorized Idiom Clutter',
    tip: 'Examiners immediately penalize shoehorning cliches like "Every coin has two sides" or "It is raining cats and dogs". Instead, use topic-specific collocations like "striking a delicate balance" or "bearing the brunt of".'
  }
];

export const IELTSSpeedBlitzModal: React.FC<IELTSSpeedBlitzModalProps> = ({
  isOpen,
  onClose,
  onRewardXp
}) => {
  const [activeTab, setActiveTab] = useState<'blitz' | 'secret'>('blitz');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isFinished, setIsFinished] = useState(false);
  const [secretIndex, setSecretIndex] = useState(0);

  // Pick 5 random questions for each blitz round
  const [roundQuestions, setRoundQuestions] = useState<BlitzQuestion[]>([]);

  const startRound = () => {
    const shuffled = [...BLITZ_QUESTIONS_POOL].sort(() => 0.5 - Math.random()).slice(0, 5);
    setRoundQuestions(shuffled);
    setCurrentIndex(0);
    setSelectedOption(null);
    setScore(0);
    setCombo(0);
    setTimeLeft(45);
    setIsFinished(false);
    setIsPlaying(true);
    soundManager.playBeep(660, 0.1);
  };

  useEffect(() => {
    if (!isPlaying || isFinished) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishRound();
          return 0;
        }
        if (prev <= 6) {
          soundManager.playChime10s();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, isFinished]);

  const handleSelectOption = (idx: number) => {
    if (selectedOption !== null || isFinished) return;
    setSelectedOption(idx);

    const q = roundQuestions[currentIndex];
    const isCorrect = idx === q.correctIndex;

    if (isCorrect) {
      soundManager.playSuccess();
      const points = 100 + combo * 25;
      setScore((s) => s + points);
      setCombo((c) => c + 1);
    } else {
      soundManager.playWarning();
      setCombo(0);
    }

    setTimeout(() => {
      if (currentIndex + 1 < roundQuestions.length) {
        setCurrentIndex((i) => i + 1);
        setSelectedOption(null);
      } else {
        handleFinishRound();
      }
    }, 1100);
  };

  const handleFinishRound = () => {
    setIsFinished(true);
    setIsPlaying(false);
    fireAchievementConfetti();
    if (onRewardXp) {
      onRewardXp(250);
    }
  };

  const handleListenSecret = (text: string) => {
    stopSpeech();
    speakBritish(text);
    soundManager.playBeep(520, 0.05);
  };

  if (!isOpen) return null;

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('blitz')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'blitz'
                ? 'bg-amber-500 text-slate-950 font-black shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Speed Blitz (60s)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('secret')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'secret'
                ? 'bg-blue-600 text-white font-black shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Daily Examiner Secret</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">

        {/* TAB 1: SPEED BLITZ MINI-GAME */}
        {activeTab === 'blitz' && (
          <div className="space-y-4">
            {!isPlaying && !isFinished && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center shadow-xs">
                  <Flame className="w-8 h-8 animate-pulse text-amber-600" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900">
                    Band 9 Collocation & Trap Blitz!
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    5 rapid-fire Practice traps, collocations, and idioms. Earn streak multipliers and boost your XP!
                  </p>
                </div>

                <div className="flex items-center justify-center gap-4 text-xs font-mono text-slate-600">
                  <div className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-xl">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>45 Seconds</span>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl border border-amber-200">
                    <Trophy className="w-3.5 h-3.5 text-amber-600" />
                    <span>+250 XP Reward</span>
                  </div>
                </div>

                <button
                  onClick={startRound}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-sm shadow-md transition active:scale-98 flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>Start Blitz Round Now!</span>
                </button>
              </div>
            )}

            {isPlaying && roundQuestions.length > 0 && (
              <div className="space-y-4">
                {/* Stats Header Bar */}
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                      Q {currentIndex + 1} / {roundQuestions.length}
                    </span>
                    {combo > 1 && (
                      <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5 animate-bounce">
                        <Flame className="w-3 h-3 text-orange-500" />
                        {combo}x Combo!
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="font-mono text-sm font-black text-amber-700">
                      {score} XP
                    </div>
                    <div
                      className={`flex items-center gap-1 font-mono font-bold px-2.5 py-0.5 rounded-lg text-xs ${
                        timeLeft <= 10
                          ? 'bg-rose-100 text-rose-700 animate-pulse'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{timeLeft}s</span>
                    </div>
                  </div>
                </div>

                {/* Question */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                    {roundQuestions[currentIndex].category}
                  </span>
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                    {roundQuestions[currentIndex].prompt}
                  </h4>
                </div>

                {/* Options */}
                <div className="space-y-2">
                  {roundQuestions[currentIndex].options.map((opt, idx) => {
                    const isPicked = selectedOption === idx;
                    const isCorrect = idx === roundQuestions[currentIndex].correctIndex;
                    let style = 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100';

                    if (selectedOption !== null) {
                      if (isCorrect) {
                        style = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold';
                      } else if (isPicked) {
                        style = 'bg-rose-50 border-rose-300 text-rose-900';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectOption(idx)}
                        disabled={selectedOption !== null}
                        className={`w-full p-3 rounded-2xl border text-left text-xs sm:text-sm transition flex items-center justify-between gap-2 ${style}`}
                      >
                        <span>{opt}</span>
                        {selectedOption !== null && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        {selectedOption !== null && isPicked && !isCorrect && (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation on answer */}
                {selectedOption !== null && (
                  <div className="p-3 bg-blue-50/90 rounded-2xl border border-blue-200 text-xs text-blue-900 animate-fade-in">
                    <strong className="block font-bold mb-0.5">Examiner Insight:</strong>
                    {roundQuestions[currentIndex].explanation}
                  </div>
                )}
              </div>
            )}

            {isFinished && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-xs">
                  <Trophy className="w-8 h-8 text-emerald-600" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900">Round Completed!</h3>
                  <p className="text-xs text-slate-500">
                    Outstanding reflexes! You scored <strong className="text-amber-700">{score} Points</strong> and earned <strong className="text-emerald-700">+250 XP</strong>.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={startRound}
                    className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Play Another Round</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DAILY EXAMINER SECRET */}
        {activeTab === 'secret' && (
          <div className="space-y-4 py-2">
            <div className="bg-gradient-to-br from-indigo-900 to-blue-900 text-white p-5 rounded-3xl shadow-sm border border-indigo-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 px-2.5 py-0.5 rounded-full text-blue-200">
                  Practice Examiner Insight #{secretIndex + 1}
                </span>

                <button
                  onClick={() =>
                    handleListenSecret(
                      `${DAILY_EXAMINER_SECRETS[secretIndex].title}. ${DAILY_EXAMINER_SECRETS[secretIndex].tip}`
                    )
                  }
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-blue-200 transition"
                  title="Listen in British English"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              <h4 className="text-base sm:text-lg font-black text-white">
                {DAILY_EXAMINER_SECRETS[secretIndex].title}
              </h4>

              <p className="text-xs text-blue-100 leading-relaxed font-medium">
                "{DAILY_EXAMINER_SECRETS[secretIndex].tip}"
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={() =>
                  setSecretIndex((prev) => (prev + 1) % DAILY_EXAMINER_SECRETS.length)
                }
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Next Examiner Tip →</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('blitz');
                  startRound();
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Play Speed Blitz</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
};
