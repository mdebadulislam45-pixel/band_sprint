import React, { useState, useRef, useEffect } from 'react';
import {
  Zap,
  CheckCircle2,
  XCircle,
  Volume2,
  ArrowRight,
  Flame,
  Award,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Mic,
  MicOff,
  Square
} from 'lucide-react';
import { ResponsiveModal } from '../common/ResponsiveModal';
import { soundManager } from '../../utils/audioEffects';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { SpeechRecognitionService } from '../../services/SpeechRecognitionService';
import { SHADOWING_ITEMS } from '../../data/shadowingSentences';

interface DailySprintChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  onStreakUpdate?: () => void;
}

interface QuestionItem {
  id: number;
  skill: 'Listening' | 'Reading' | 'Collocation' | 'Grammar' | 'Speaking';
  title: string;
  badge: string;
  prompt: string;
  audioPrompt?: string;
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
  targetSpeakingPhrase?: string;
}

const LISTENING_POOL: Omit<QuestionItem, 'id'>[] = [
  {
    skill: 'Listening',
    title: 'Question 1: Numerical & Date Trap',
    badge: 'Listening · Section 1 Form Filling',
    prompt: 'Listen to the registrar and identify the confirmed start date of the symposium.',
    audioPrompt: 'The orientation symposium was originally scheduled for Wednesday the 15th of October, but due to venue renovation, it has been rescheduled definitively to Tuesday the 14th of October.',
    options: [
      'A) Wednesday, 15th October',
      'B) Tuesday, 14th October',
      'C) Thursday, 16th October',
      'D) Monday, 13th October'
    ],
    correctAnswer: 1,
    explanation: 'The speaker uses a classic distractor: "originally scheduled for the 15th... but rescheduled definitively to Tuesday the 14th". The correct answer is B.'
  },
  {
    skill: 'Listening',
    title: 'Question 1: Self-Correction Fee Trap',
    badge: 'Listening · Section 1 Registration',
    prompt: 'Listen to the librarian and select the exact annual membership fee for postgraduate students.',
    audioPrompt: 'Standard external membership is 85 pounds per year, and until last term postgraduates paid 45 pounds—actually, excuse me, the senate lowered that rate to 30 pounds starting this autumn.',
    options: [
      'A) £85 per year',
      'B) £45 per year',
      'C) £30 per year',
      'D) £55 per year'
    ],
    correctAnswer: 2,
    explanation: 'Watch for the mid-sentence self-correction ("actually, excuse me, the senate lowered that rate to 30 pounds"). The confirmed fee is C.'
  },
  {
    skill: 'Listening',
    title: 'Question 1: Venue Change Distractor',
    badge: 'Listening · Section 2 Campus Tour',
    prompt: 'Listen to the coordinator and identify where the afternoon seminar will take place.',
    audioPrompt: 'Your printed timetable lists the Darwin Auditorium for the afternoon seminar, though because the projector is being replaced, we have moved everyone across to the Newton Lecture Hall on level two.',
    options: [
      'A) Darwin Auditorium',
      'B) Newton Lecture Hall',
      'C) Faraday Lab',
      'D) Main Library Annex'
    ],
    correctAnswer: 1,
    explanation: 'The printed timetable is an outdated distractor; the confirmed room is the Newton Lecture Hall (Option B).'
  }
];

const READING_POOL: Omit<QuestionItem, 'id'>[] = [
  {
    skill: 'Reading',
    title: 'Question 2: Academic Inference (TFNG)',
    badge: 'Reading · Passage 2 Logic',
    prompt: 'Read the academic excerpt: "While early robotic automation predominantly displaced manual manufacturing laborers, contemporary machine learning algorithms increasingly perform high-order cognitive tasks once considered the exclusive province of white-collar analysts."\n\nStatement: Modern artificial intelligence is now capable of performing analytical tasks previously restricted to human professionals.',
    options: ['A) TRUE', 'B) FALSE', 'C) NOT GIVEN'],
    correctAnswer: 0,
    explanation: 'TRUE. The text explicitly confirms contemporary algorithms perform cognitive tasks once considered "the exclusive province of white-collar analysts".'
  },
  {
    skill: 'Reading',
    title: 'Question 2: Extreme Qualifier Trap (TFNG)',
    badge: 'Reading · Passage 3 Precision',
    prompt: 'Read the excerpt: "Although urban rooftop gardens consistently lower building cooling costs during peak summer months, municipal surveys indicate that maintenance expenses remain prohibitive for many older residential blocks."\n\nStatement: Installing rooftop gardens has proven financially affordable for all residential buildings.',
    options: ['A) TRUE', 'B) FALSE', 'C) NOT GIVEN'],
    correctAnswer: 1,
    explanation: 'FALSE. The statement claims "affordable for all", which directly contradicts "maintenance expenses remain prohibitive for many older residential blocks".'
  },
  {
    skill: 'Reading',
    title: 'Question 2: Unstated Comparison (TFNG)',
    badge: 'Reading · Passage 1 Logic',
    prompt: 'Read the excerpt: "Deep-sea hydrothermal vents sustain thriving colonies of tube worms through chemosynthesis, a biochemical process driven by dissolved minerals rather than sunlight."\n\nStatement: Tube worms living near hydrothermal vents grow faster than shallow-water marine species.',
    options: ['A) TRUE', 'B) FALSE', 'C) NOT GIVEN'],
    correctAnswer: 2,
    explanation: 'NOT GIVEN. The excerpt explains how tube worms obtain energy, but makes no comparison of growth speed against shallow-water species.'
  }
];

const COLLOCATION_POOL: Omit<QuestionItem, 'id'>[] = [
  {
    skill: 'Collocation',
    title: 'Question 3: Band 8.5+ Academic Collocation',
    badge: 'Lexical Resource · High-Yield Collocation',
    prompt: 'Select the precise native collocation to complete the sentence:\n\n"The conflicting survey results have cast profound ________ on the validity of the preliminary hypothesis."',
    options: ['A) suspicion', 'B) doubt', 'C) distrust', 'D) uncertainty'],
    correctAnswer: 1,
    explanation: '"Cast doubt on" is the fixed academic collocation recognized by IELTS examiners.'
  },
  {
    skill: 'Collocation',
    title: 'Question 3: Band 8.5+ Policy Collocation',
    badge: 'Lexical Resource · Task 2 Precision',
    prompt: 'Select the precise collocation to complete the sentence:\n\n"Governments must ________ stringent regulations to curb industrial carbon emissions."',
    options: ['A) impose', 'B) do', 'C) push', 'D) force'],
    correctAnswer: 0,
    explanation: '"Impose stringent regulations" is the natural Band 8.5+ academic verb-noun collocation.'
  },
  {
    skill: 'Collocation',
    title: 'Question 3: Band 8.5+ Research Collocation',
    badge: 'Lexical Resource · Academic Register',
    prompt: 'Select the precise collocation to complete the sentence:\n\n"Longitudinal trials have ________ compelling evidence linking sleep deprivation to impaired memory consolidation."',
    options: ['A) made', 'B) yielded', 'C) done', 'D) brought out'],
    correctAnswer: 1,
    explanation: '"Yield compelling evidence" is an authentic C1/C2 academic collocation ideal for Writing Task 2 and Speaking Part 3.'
  }
];

const GRAMMAR_POOL: Omit<QuestionItem, 'id'>[] = [
  {
    skill: 'Grammar',
    title: 'Question 4: Inverted Conditional',
    badge: 'Grammar Range & Accuracy · Band 9 Inversion',
    prompt: 'Which sentence demonstrates flawless Band 9 inverted conditional syntax?',
    options: [
      'A) Had the government intervened sooner, the economic recession would have been mitigated.',
      'B) If had the government intervened sooner, the recession would be mitigated.',
      'C) Should the government had intervened sooner, the recession would have mitigated.',
      'D) Had the government intervene sooner, the recession would had been mitigated.'
    ],
    correctAnswer: 0,
    explanation: 'Inverted third conditionals follow: "Had + Subject + Past Participle, Subject + would have + Past Participle". Option A is grammatically pristine.'
  },
  {
    skill: 'Grammar',
    title: 'Question 4: Negative Adverbial Inversion',
    badge: 'Grammar Range & Accuracy · Band 8.5 Syntax',
    prompt: 'Which sentence correctly applies negative inversion at the start of the clause?',
    options: [
      'A) Not only public transport reduces traffic, but it also lowers emissions.',
      'B) Not only does public transport reduce traffic, but it also lowers emissions.',
      'C) Not only does public transport reduces traffic, but it also lowers emissions.',
      'D) Not only public transport does reduce traffic, it also lowers emissions.'
    ],
    correctAnswer: 1,
    explanation: 'After front-placed "Not only", invert the auxiliary verb before the subject and keep the main verb in base form: "Not only does public transport reduce...".'
  },
  {
    skill: 'Grammar',
    title: 'Question 4: Concession Clause Control',
    badge: 'Grammar Range & Accuracy · Band 8.5 Linking',
    prompt: 'Which sentence uses "Despite" with accurate grammatical structure?',
    options: [
      'A) Despite she had limited funding, the researcher completed the study.',
      'B) Despite of the limited funding, the researcher completed the study.',
      'C) Despite facing severe funding constraints, the researcher completed the study.',
      'D) Despite that funding was limited, the researcher completed the study.'
    ],
    correctAnswer: 2,
    explanation: '"Despite" must be followed by a noun phrase or gerund (-ing) without "of": "Despite facing severe funding constraints...".'
  }
];

function buildDailySprintQuestions(roundSeed: number): QuestionItem[] {
  const lItem = LISTENING_POOL[roundSeed % LISTENING_POOL.length];
  const rItem = READING_POOL[roundSeed % READING_POOL.length];
  const cItem = COLLOCATION_POOL[roundSeed % COLLOCATION_POOL.length];
  const gItem = GRAMMAR_POOL[roundSeed % GRAMMAR_POOL.length];

  const shadowPool = SHADOWING_ITEMS.length > 0 ? SHADOWING_ITEMS : [];
  const shadowItem = shadowPool[roundSeed % Math.max(1, shadowPool.length)];
  const speakingItem: Omit<QuestionItem, 'id'> = shadowItem
    ? {
        skill: 'Speaking',
        title: `Question 5: Pronunciation & Fluency (${shadowItem.topic})`,
        badge: `Speaking · ${shadowItem.bandTarget} Shadowing Turn`,
        prompt: 'Speak this IELTS Band 8.5+ sentence clearly into your microphone with natural British intonation:',
        targetSpeakingPhrase: shadowItem.targetSentence,
        correctAnswer: 'speaking',
        explanation: `${shadowItem.focusTip} Key phonetic focus: ${shadowItem.phoneticKeyWords.join(', ')}.`
      }
    : {
        skill: 'Speaking',
        title: 'Question 5: Pronunciation & Fluency Rapid Turn',
        badge: 'Speaking · Intonation & Stress',
        prompt: 'Speak this Band 9 academic sentence into your microphone clearly with natural British intonation:',
        targetSpeakingPhrase: 'The university comprehensively substantiated the socioeconomic disparity with empirical evidence.',
        correctAnswer: 'speaking',
        explanation: 'Key stress points: com-pre-HEN-sive-ly, sub-STAN-ti-a-ted, so-ci-o-ec-o-NOM-ic, dis-PAR-i-ty, em-PIR-i-cal.'
      };

  return [
    { ...lItem, id: 1 },
    { ...rItem, id: 2 },
    { ...cItem, id: 3 },
    { ...gItem, id: 4 },
    { ...speakingItem, id: 5 }
  ];
}

export const DailySprintChallengeModal: React.FC<DailySprintChallengeModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onStreakUpdate
}) => {
  const [roundCounter, setRoundCounter] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('ielts_daily_sprint_round_v1') || '0');
      return Number.isFinite(saved) ? saved : 0;
    } catch {
      return 0;
    }
  });
  const [questions, setQuestions] = useState<QuestionItem[]>(() => buildDailySprintQuestions(roundCounter));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, any>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<number, boolean>>({});
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Audio & Speech states
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionService | null>(null);

  const q = questions[currentIndex] || questions[0];

  useEffect(() => {
    if (isOpen && isFinished) {
      setQuestions(buildDailySprintQuestions(roundCounter));
      setCurrentIndex(0);
      setSelectedAnswers({});
      setSubmittedAnswers({});
      setScore(0);
      setIsFinished(false);
      setSpokenTranscript('');
    }
  }, [isOpen, isFinished, roundCounter]);

  useEffect(() => {
    return () => {
      stopSpeech();
      if (recognitionRef.current) {
        recognitionRef.current.stopListening();
      }
    };
  }, []);

  if (!isOpen) return null;

  const handlePlayAudio = () => {
    if (!q.audioPrompt || isPlayingAudio) return;
    setIsPlayingAudio(true);
    speakBritish(q.audioPrompt, {
      speakerId: 'speaker_04',
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false)
    });
  };

  const handleSelectOption = (idx: number) => {
    if (submittedAnswers[q.id]) return;
    setSelectedAnswers(prev => ({ ...prev, [q.id]: idx }));
    soundManager.playBeep(520, 0.03);
  };

  const handleCheckAnswer = () => {
    if (q.skill === 'Speaking') {
      // For speaking, accept if user spoken anything or let them self-evaluate
      const isCorrect = spokenTranscript.length > 15;
      setSubmittedAnswers(prev => ({ ...prev, [q.id]: true }));
      if (isCorrect) {
        setScore(prev => prev + 1);
        soundManager.playSuccess();
      } else {
        soundManager.playBeep(440, 0.06);
      }
      return;
    }

    const selected = selectedAnswers[q.id];
    if (selected === undefined) return;

    setSubmittedAnswers(prev => ({ ...prev, [q.id]: true }));
    if (selected === q.correctAnswer) {
      setScore(prev => prev + 1);
      soundManager.playSuccess();
    } else {
      soundManager.playBeep(380, 0.08);
    }
  };

  const handleNext = () => {
    stopSpeech();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      soundManager.playBeep(580, 0.03);
    } else {
      // Finished all 5 questions
      setIsFinished(true);
      soundManager.playSuccess();
      try {
        const todayKey = new Date().toISOString().split('T')[0];
        localStorage.setItem(`ielts_daily_sprint_done_${todayKey}`, 'true');
        const nextRound = roundCounter + 1;
        localStorage.setItem('ielts_daily_sprint_round_v1', String(nextRound));
        setRoundCounter(nextRound);
        onStreakUpdate?.();
      } catch {}
      onShowToast(`🎉 Daily Sprint Complete! Score: ${score} / 5`);
    }
  };

  const handleStartSpeaking = () => {
    try {
      if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognitionService();
      }
      setSpokenTranscript('');
      setIsRecording(true);
      soundManager.playBeep(640, 0.05);

      recognitionRef.current.startListening({
        onInterimResult: (text: string) => {
          setSpokenTranscript(text);
        },
        onFinalResult: (text: string) => {
          setSpokenTranscript(text);
        },
        onStatusChange: (status) => {
          if (status === 'stopped' || status === 'error') {
            setIsRecording(false);
          }
        }
      });
    } catch {
      setIsRecording(false);
      onShowToast('Microphone access unavailable. Using text self-evaluation.');
    }
  };

  const handleStopSpeaking = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stopListening();
    }
    setIsRecording(false);
    soundManager.playBeep(480, 0.05);
  };

  const handleRestart = () => {
    const nextRound = roundCounter + 1;
    setRoundCounter(nextRound);
    try {
      localStorage.setItem('ielts_daily_sprint_round_v1', String(nextRound));
    } catch {}
    setQuestions(buildDailySprintQuestions(nextRound));
    setCurrentIndex(0);
    setSelectedAnswers({});
    setSubmittedAnswers({});
    setScore(0);
    setIsFinished(false);
    setSpokenTranscript('');
    soundManager.playBeep(520, 0.03);
  };

  const isCurrentSubmitted = submittedAnswers[q.id];
  const isCurrentCorrect = q.skill === 'Speaking'
    ? spokenTranscript.length > 15
    : selectedAnswers[q.id] === q.correctAnswer;

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      icon={
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Zap className="w-5 h-5 fill-current" />
        </div>
      }
      title="5-Minute Daily Sprint Diagnostic"
      subtitle="Bite-sized Practice exam challenge to protect your study streak and sharpen instincts."
    >
      <div className="space-y-5">
        {/* Progress Bar & Header Stats */}
        <div className="flex items-center justify-between text-xs font-mono font-bold">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <Flame className="w-4 h-4 fill-current" />
            <span>Daily Streak Booster</span>
          </div>

          <div className="text-slate-500 dark:text-slate-400">
            Question <span className="text-slate-900 dark:text-white font-black">{currentIndex + 1}</span> of 5
          </div>
        </div>

        {/* Progress Track */}
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-amber-500 to-blue-600 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / 5) * 100}%` }}
          />
        </div>

        {!isFinished ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Question Badge and Title */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
                  {q.badge}
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {q.skill} Drill
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug whitespace-pre-line">
                {q.prompt}
              </h3>

              {/* Audio Prompt Button if applicable */}
              {q.audioPrompt && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handlePlayAudio}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border cursor-pointer ${
                      isPlayingAudio
                        ? 'bg-amber-100 border-amber-300 text-amber-900 animate-pulse'
                        : 'bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-2xs hover:bg-blue-50'
                    }`}
                  >
                    <Volume2 className="w-4 h-4 text-blue-600" />
                    <span>{isPlayingAudio ? 'Listening to British Audio...' : '▶ Play British Audio Snippet (3s)'}</span>
                  </button>
                </div>
              )}

              {/* Speaking Target Phrase */}
              {q.targetSpeakingPhrase && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200 font-semibold italic">
                  "{q.targetSpeakingPhrase}"
                </div>
              )}
            </div>

            {/* Answer Options for Multiple Choice */}
            {q.options && (
              <div className="space-y-2">
                {q.options.map((opt, oIdx) => {
                  const isSelected = selectedAnswers[q.id] === oIdx;
                  const isCorrect = q.correctAnswer === oIdx;

                  let borderClass = 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700';
                  let bgClass = 'bg-white dark:bg-slate-900';

                  if (isCurrentSubmitted) {
                    if (isCorrect) {
                      borderClass = 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200';
                    } else if (isSelected) {
                      borderClass = 'border-rose-500 ring-1 ring-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
                    }
                  } else if (isSelected) {
                    borderClass = 'border-blue-600 ring-1 ring-blue-600 bg-blue-50/60 dark:bg-blue-950/40';
                  }

                  return (
                    <div
                      key={oIdx}
                      onClick={() => handleSelectOption(oIdx)}
                      className={`p-3 sm:p-3.5 rounded-xl border text-xs sm:text-sm font-medium transition cursor-pointer flex items-center justify-between ${bgClass} ${borderClass}`}
                    >
                      <span className="text-slate-800 dark:text-slate-200">{opt}</span>
                      {isCurrentSubmitted && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                      )}
                      {isCurrentSubmitted && isSelected && !isCorrect && (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0 ml-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Speaking Voice Recorder */}
            {q.skill === 'Speaking' && (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Live Microphone Test:
                  </span>
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={handleStartSpeaking}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>Start Speaking</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopSpeaking}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 animate-pulse cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop Recording</span>
                    </button>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs font-mono min-h-16 text-slate-700 dark:text-slate-300">
                  {spokenTranscript || (
                    <span className="text-slate-400 italic">
                      {isRecording ? 'Listening to speech... Speak clearly.' : 'Tap "Start Speaking" and read the sentence aloud.'}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Explanation card after submit */}
            {isCurrentSubmitted && (
              <div className={`p-4 rounded-2xl border text-xs space-y-1.5 animate-in fade-in duration-200 ${
                isCurrentCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200'
              }`}>
                <div className="flex items-center gap-1.5 font-bold">
                  {isCurrentCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>{isCurrentCorrect ? 'Spot On! Practice Verified' : 'Incorrect. Notice the Examiner Traps:'}</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  {q.explanation}
                </p>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-mono font-bold text-slate-500">
                Score: {score} / 5
              </span>

              {!isCurrentSubmitted ? (
                <button
                  type="button"
                  onClick={handleCheckAnswer}
                  disabled={selectedAnswers[q.id] === undefined && q.skill !== 'Speaking'}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <span>Check Answer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <span>{currentIndex < 4 ? 'Next Question' : 'View Sprint Results'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Finished Screen */
          <div className="p-6 rounded-3xl bg-linear-to-b from-blue-900/10 via-slate-50 to-white dark:from-blue-950/30 dark:via-slate-900 dark:to-[#0B1224] border border-blue-200 dark:border-blue-900 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-600 flex items-center justify-center mx-auto shadow-md">
              <Award className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Daily Sprint Accomplished!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You successfully completed today's 5-minute Practice multi-skill diagnostic.
              </p>
            </div>

            <div className="inline-flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs font-mono">
              <div className="text-center px-3 border-r border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Score</span>
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{score} / 5</span>
              </div>
              <div className="text-center px-3">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Accuracy</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{Math.round((score / 5) * 100)}%</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRestart}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Sprint</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Close & Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
};
