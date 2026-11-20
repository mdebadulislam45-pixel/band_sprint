import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  RotateCcw,
  Sparkles,
  Volume2,
  X,
  Play,
  Square,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  Mic,
  Dices,
  Award,
  ArrowRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';
import { SpeechRecognitionService } from '../../services/SpeechRecognitionService';

interface CueCardIdea {
  topic: string;
  cueCard: string;
  whoWhereWhen: string[];
  coreIncident: string[];
  sensoryVocab: string[];
  reflectionIdioms: string[];
  modelAnswer: string;
}

const CUE_CARD_SPINNER_DATA: CueCardIdea[] = [
  {
    topic: 'Challenging Decision',
    cueCard: 'Describe a difficult decision that you once made. You should say: what the decision was, why it was difficult, what choices you had, and explain how you felt about the result.',
    whoWhereWhen: ['Final undergraduate semester', 'University Career Advisory Centre', 'Spring 2023'],
    coreIncident: ['Choosing between a fully funded research scholarship and an immediate corporate role', 'Weighed financial independence against long-term academic ambitions'],
    sensoryVocab: ['agonizing dilemma', 'pivotal crossroad', 'weighed the pros and cons', 'unprecedented leap of faith'],
    reflectionIdioms: ['"A blessing in disguise"', '"Bite the bullet"', '"Came out on top"', '"Hindsight is 20/20"'],
    modelAnswer: 'I would like to talk about a profoundly challenging dilemma I encountered during my final undergraduate semester in early 2023. At the time, I was standing at a pivotal crossroad: on the one hand, I had been awarded a prestigious, fully funded master\'s research scholarship in sustainable development, while on the other, I received an attractive corporate job offer from a prominent consulting firm. It was an agonizing dilemma because it forced me to weigh immediate financial independence against my long-term academic aspirations. After consulting my mentors and weighing the pros and cons meticulously, I decided to bite the bullet and decline the corporate offer to pursue the research path. In hindsight, that decision was an absolute blessing in disguise, as it equipped me with invaluable analytical rigor.'
  },
  {
    topic: 'Historical Building',
    cueCard: 'Describe a historic building or landmark you have visited. You should say: where it is, what it looks like, what it was used for, and explain why you found it memorable.',
    whoWhereWhen: ['Edinburgh Castle / Historic Fortress', 'Mid-autumn excursion', 'Ancient cobblestone citadel'],
    coreIncident: ['Navigating the cavernous medieval chambers', 'Discovering the centuries-old royal insignia carved in weathered granite'],
    sensoryVocab: ['imposing gothic facade', 'weather-beaten masonry', 'evocative acoustic resonance', 'architectural grandeur'],
    reflectionIdioms: ['"Steeped in history"', '"Stood the test of time"', '"A window into the past"', '"Took my breath away"'],
    modelAnswer: 'A truly memorable historical landmark that immediately comes to mind is Edinburgh Castle, perched majestically atop an ancient volcanic plug in the heart of Scotland. Visited during a crisp mid-autumn excursion, its imposing gothic facade and weather-beaten granite masonry left an indelible impression upon me. Historically, this formidable fortress served as both a royal residence and a military stronghold. What made this visit extraordinary was standing within the medieval Great Hall; the evocative acoustic resonance and preserved royal regalia truly offered a vivid window into the past. It demonstrated to me how heritage architecture can stand the test of time across centuries.'
  },
  {
    topic: 'Environmental Law or Project',
    cueCard: 'Describe an environmental law or initiative you think is effective. You should say: what it is, how you learned about it, who is responsible for it, and explain why you think it helps.',
    whoWhereWhen: ['Single-use plastic moratorium', 'Municipal city council project', 'Adopted nationally in 2024'],
    coreIncident: ['Transitioning local grocers to biodegradable seaweed packaging', 'Witnessing substantial drop in riverbank refuse'],
    sensoryVocab: ['drastic reduction', 'biodegradable substitutes', 'ecological preservation', 'tangible ripple effect'],
    reflectionIdioms: ['"Stem the tide"', '"A drop in the ocean"', '"Turn over a new leaf"', '"Food for thought"'],
    modelAnswer: 'I would like to highlight a remarkably effective environmental initiative: the nationwide moratorium on single-use plastics introduced in 2024. I initially learned about this policy through an environmental symposium at my local municipality. The mandate requires commercial vendors to substitute non-recyclable polymers with biodegradable seaweed-based alternatives. In my observation, this policy has spearheaded a tangible ripple effect throughout suburban communities. Rather than merely being a drop in the ocean, it has successfully stemmed the tide of urban riverbank pollution and catalyzed a collective willingness to turn over a new ecological leaf.'
  },
  {
    topic: 'Technological Innovation',
    cueCard: 'Describe an electronic device or app that you find indispensable. You should say: what it is, how often you use it, what features it has, and explain how it influences your daily life.',
    whoWhereWhen: ['AI language transcription tool', 'Used daily during academic research', 'Cross-platform sync'],
    coreIncident: ['Synthesizing a 3-hour symposium into structured executive summaries in seconds', 'Eliminated tedious manual transcription'],
    sensoryVocab: ['intuitive user interface', 'seamless algorithmic execution', 'indispensable asset', 'exponentially streamlined'],
    reflectionIdioms: ['"Cut out the middleman"', '"State of the art"', '"Changed the game entirely"', '"Worth its weight in gold"'],
    modelAnswer: 'An electronic tool that has become virtually indispensable in my daily routine is an AI-powered academic transcription and summarization platform. As a researcher, I utilize it on a daily basis to process lengthy academic seminars and panel discussions. Its intuitive interface and state-of-the-art acoustic algorithms allow it to distill multi-speaker symposiums into structured bullet points in seconds. It has truly changed the game entirely for my workflow, cutting out the tedious manual transcription hours and proving worth its weight in gold.'
  }
];

interface SpeakingPrepScratchpadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

type StepMode = 'prep' | 'speaking' | 'evaluation';

export const SpeakingPrepScratchpadModal: React.FC<SpeakingPrepScratchpadModalProps> = ({
  isOpen,
  onClose,
  onShowToast
}) => {
  const [stepMode, setStepMode] = useState<StepMode>('prep');
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(0);

  // 60-Second Prep Timer
  const [countdownSec, setCountdownSec] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // 120-Second Speech Timer
  const [speechSecRemaining, setSpeechSecRemaining] = useState(120);
  const [isSpeakingRecording, setIsSpeakingRecording] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionService | null>(null);

  // Quadrant scratchpad notes
  const [quadrant1, setQuadrant1] = useState('');
  const [quadrant2, setQuadrant2] = useState('');
  const [quadrant3, setQuadrant3] = useState('');
  const [quadrant4, setQuadrant4] = useState('');

  const currentTopic = CUE_CARD_SPINNER_DATA[selectedTopicIndex];

  // 60-Second Prep Countdown Effect
  useEffect(() => {
    let interval: any = null;
    if (stepMode === 'prep' && isTimerRunning && countdownSec > 0) {
      interval = setInterval(() => {
        setCountdownSec((prev) => {
          if (prev === 11) {
            soundManager.playBeep(640, 0.15);
          }
          if (prev <= 1) {
            setIsTimerRunning(false);
            soundManager.playSuccess();
            onShowToast('⏰ 60-Second Preparation Expired! Ready to begin your 2-minute monologue.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [stepMode, isTimerRunning, countdownSec, onShowToast]);

  // 120-Second Speech Turn Countdown Effect
  useEffect(() => {
    let interval: any = null;
    if (stepMode === 'speaking' && isSpeakingRecording && speechSecRemaining > 0) {
      interval = setInterval(() => {
        setSpeechSecRemaining((prev) => {
          if (prev === 15) {
            soundManager.playBeep(520, 0.1);
          }
          if (prev <= 1) {
            handleFinishSpeaking();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [stepMode, isSpeakingRecording, speechSecRemaining]);

  useEffect(() => {
    return () => {
      stopSpeech();
      if (recognitionRef.current) {
        recognitionRef.current.stopListening();
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleStartTimer = () => {
    setCountdownSec(60);
    setIsTimerRunning(true);
    soundManager.playBeep(520, 0.05);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setCountdownSec(60);
    soundManager.playBeep(440, 0.05);
  };

  const handleSpinRandom = () => {
    const nextIdx = (selectedTopicIndex + 1) % CUE_CARD_SPINNER_DATA.length;
    setSelectedTopicIndex(nextIdx);
    setCountdownSec(60);
    setIsTimerRunning(false);
    soundManager.playBeep(600, 0.04);
  };

  const handleAutoFillQuadrantIdeas = () => {
    setQuadrant1(currentTopic.whoWhereWhen.join(', '));
    setQuadrant2(currentTopic.coreIncident.join('. '));
    setQuadrant3(currentTopic.sensoryVocab.join(', '));
    setQuadrant4(currentTopic.reflectionIdioms.join(' | '));
    soundManager.playSuccess();
    onShowToast('Band 9 model notes loaded into 4 quadrants!');
  };

  const handleTransitionToSpeaking = () => {
    setIsTimerRunning(false);
    setStepMode('speaking');
    setSpeechSecRemaining(120);
    setSpokenTranscript('');
    soundManager.playBeep(580, 0.04);

    try {
      if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognitionService();
      }
      setIsSpeakingRecording(true);
      recognitionRef.current.startListening({
        onInterimResult: (text: string) => {
          setSpokenTranscript(text);
        },
        onFinalResult: (text: string) => {
          setSpokenTranscript(text);
        },
        onStatusChange: (status) => {
          if (status === 'stopped' || status === 'error') {
            setIsSpeakingRecording(false);
          }
        }
      });
    } catch {
      setIsSpeakingRecording(false);
      onShowToast('Microphone initialising... Tap record when ready.');
    }
  };

  const handleFinishSpeaking = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stopListening();
    }
    setIsSpeakingRecording(false);
    setStepMode('evaluation');
    soundManager.playSuccess();
    onShowToast('Evaluation complete! Practice rubric analysis generated.');
  };

  // Calculate Scores
  const words = spokenTranscript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const calculateCriteriaScores = () => {
    // Fluency & Coherence
    let fc = 6.0;
    if (wordCount >= 160) fc = 7.5;
    else if (wordCount >= 110) fc = 7.0;
    else if (wordCount >= 70) fc = 6.5;

    // Lexical Resource
    let lr = 6.0;
    const lower = spokenTranscript.toLowerCase();
    const hasAcademic = /dilemma|pivotal|crossroad|facade|acoustic|moratorium|polymer|biodegradable|indispensable|algorithmic|symposium|streamlined|initiative/i.test(lower);
    const hasIdiom = /blessing in disguise|bite the bullet|came out on top|hindsight|steeped in|stood the test of time|drop in the ocean|turn over a new leaf|game entirely|worth its weight/i.test(lower);
    if (hasAcademic && hasIdiom) lr = 8.0;
    else if (hasAcademic || hasIdiom) lr = 7.5;
    else if (wordCount >= 100) lr = 7.0;

    // Grammatical Range & Accuracy
    let gra = 6.5;
    const hasComplex = /because|although|whereas|while|which|that|had i|if|unless|despite|subsequently/i.test(lower);
    if (hasComplex && wordCount >= 100) gra = 7.5;
    else if (hasComplex) gra = 7.0;

    // Pronunciation
    let pr = 7.0;
    if (wordCount >= 120) pr = 7.5;

    const overall = Math.round(((fc + lr + gra + pr) / 4) * 2) / 2;
    return { fc, lr, gra, pr, overall };
  };

  const criteria = calculateCriteriaScores();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in select-none">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Speaking Part 2 · Official Long Turn Simulator
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {stepMode === 'prep' && 'Step 1: 60-Second Note-Taking & Brainstorming'}
                {stepMode === 'speaking' && 'Step 2: 2-Minute Continuous Speech Recording'}
                {stepMode === 'evaluation' && 'Step 3: Practice Band 9 Diagnostic Feedback'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {stepMode === 'prep' && (
              <button
                onClick={handleSpinRandom}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                title="Spin random challenging cue card"
              >
                <Dices className="w-4 h-4 text-purple-500" />
                <span className="hidden sm:inline">Spin Cue Card</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Cue Card Banner */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Candidate Task Card · {currentTopic.topic}
            </span>
            <button
              onClick={() => speakBritish(currentTopic.cueCard)}
              className="p-1 text-slate-500 hover:text-blue-600 transition cursor-pointer"
              title="Examiner reads prompt"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
            {currentTopic.cueCard}
          </p>
        </div>

        {/* ================= STEP 1: PREPARATION MODE ================= */}
        {stepMode === 'prep' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* 60-Second Visual Timer Bar */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`text-3xl font-mono font-black ${countdownSec <= 10 ? 'text-red-600 animate-pulse' : 'text-amber-700 dark:text-amber-400'}`}>
                  00:{countdownSec.toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <div className="font-bold">1-Minute Preparation Window</div>
                  <div className="text-[11px] opacity-75">Examiner: "You will have one minute to prepare your notes."</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isTimerRunning ? (
                  <button
                    onClick={handleStartTimer}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start 60s Timer</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsTimerRunning(false)}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </button>
                )}

                <button
                  onClick={handleResetTimer}
                  className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 4-Quadrant Practice Scratchpad */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  4-Quadrant Candidate Brainstorm Notes
                </span>
                <button
                  onClick={handleAutoFillQuadrantIdeas}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Load Band 9 Model Notes</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Q1: Who, When, Where */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#162340] border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <span>1. Origin & Background</span>
                    <span className="text-[10px] opacity-75">(Who / When / Where)</span>
                  </div>
                  <textarea
                    value={quadrant1}
                    onChange={(e) => setQuadrant1(e.target.value)}
                    placeholder="Brief keywords: final semester, university advisory centre..."
                    className="w-full h-20 p-2 text-xs bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Q2: Core Incident */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#162340] border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span>2. Core Incident</span>
                    <span className="text-[10px] opacity-75">(What happened step-by-step)</span>
                  </div>
                  <textarea
                    value={quadrant2}
                    onChange={(e) => setQuadrant2(e.target.value)}
                    placeholder="Turning point: research grant vs corporate role..."
                    className="w-full h-20 p-2 text-xs bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Q3: Sensory & Descriptive Lexis */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#162340] border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="text-[11px] font-mono font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                    <span>3. Sensory & Academic Lexis</span>
                    <span className="text-[10px] opacity-75">(Show, don't tell)</span>
                  </div>
                  <textarea
                    value={quadrant3}
                    onChange={(e) => setQuadrant3(e.target.value)}
                    placeholder="Collocations: agonizing dilemma, pivotal crossroad..."
                    className="w-full h-20 p-2 text-xs bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* Q4: Reflection & C1 Idioms */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#162340] border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <span>4. Philosophical Reflection</span>
                    <span className="text-[10px] opacity-75">(Idioms & Conclusion)</span>
                  </div>
                  <textarea
                    value={quadrant4}
                    onChange={(e) => setQuadrant4(e.target.value)}
                    placeholder="C1 idioms: blessing in disguise, bite the bullet, hindsight..."
                    className="w-full h-20 p-2 text-xs bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Transition Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 pt-3 text-xs">
              <div className="text-slate-500 dark:text-slate-400">
                💡 <strong>Strategy:</strong> In the real exam, your notes stay in front of you while speaking.
              </div>
              <button
                type="button"
                onClick={handleTransitionToSpeaking}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>Begin 2-Minute Speech Recording</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: LIVE 2-MINUTE SPEAKING MODE ================= */}
        {stepMode === 'speaking' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* 120-Second Countdown Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-950 text-white flex items-center justify-between border border-blue-500/30 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center animate-pulse">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-blue-200 font-bold uppercase tracking-wide">
                    Live 2-Minute Monologue Active
                  </div>
                  <div className="text-2xl font-mono font-black text-white">
                    {Math.floor(speechSecRemaining / 60)}:{(speechSecRemaining % 60).toString().padStart(2, '0')} remaining
                  </div>
                </div>
              </div>

              <button
                onClick={handleFinishSpeaking}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-sm cursor-pointer"
              >
                Finish & Evaluate
              </button>
            </div>

            {/* Split Screen: Live Transcript on Left, Candidate Notes on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Live Speech Transcript:</span>
                  <span className="font-mono text-slate-500">{wordCount} words recorded</span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 min-h-36 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-mono">
                  {spokenTranscript || (
                    <span className="text-slate-400 italic">
                      Listening to speech through your microphone... Deliver your response steadily without long pauses.
                    </span>
                  )}
                </div>
              </div>

              {/* Candidate Notes Reference */}
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-2">
                <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide block">
                  Your Scratchpad Notes:
                </span>
                <div className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                  <div><strong>1. Origin:</strong> {quadrant1 || 'No notes'}</div>
                  <div><strong>2. Event:</strong> {quadrant2 || 'No notes'}</div>
                  <div><strong>3. Lexis:</strong> {quadrant3 || 'No notes'}</div>
                  <div><strong>4. Reflection:</strong> {quadrant4 || 'No notes'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: CAMBRIDGE EVALUATION MODE ================= */}
        {stepMode === 'evaluation' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Overall Band Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950 text-white flex items-center justify-between border border-blue-500/30 shadow-md">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-300">
                  Practice Speaking Part 2 Diagnostic
                </span>
                <h3 className="text-base sm:text-lg font-black mt-0.5">
                  Performance Evaluation · {currentTopic.topic}
                </h3>
                <div className="text-xs text-blue-200 mt-1">
                  Total Delivery: <strong>{wordCount} words</strong> (Optimal target: 160–220 words)
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-amber-300 uppercase">Estimated Band</span>
                <div className="text-4xl font-mono font-black text-amber-300">
                  {criteria.overall.toFixed(1)}
                </div>
              </div>
            </div>

            {/* 4 Practice Criteria Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[11px] font-bold text-slate-500">Fluency & Coherence</div>
                <div className="text-xl font-mono font-black text-blue-600 dark:text-blue-400">Band {criteria.fc.toFixed(1)}</div>
                <p className="text-[10px] text-slate-500">Pacing, continuity, and discourse connectors.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[11px] font-bold text-slate-500">Lexical Resource</div>
                <div className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400">Band {criteria.lr.toFixed(1)}</div>
                <p className="text-[10px] text-slate-500">C1/C2 collocations & topic vocabulary.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[11px] font-bold text-slate-500">Grammar & Accuracy</div>
                <div className="text-xl font-mono font-black text-purple-600 dark:text-purple-400">Band {criteria.gra.toFixed(1)}</div>
                <p className="text-[10px] text-slate-500">Complex subordination & tenses.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[11px] font-bold text-slate-500">Pronunciation</div>
                <div className="text-xl font-mono font-black text-amber-600 dark:text-amber-400">Band {criteria.pr.toFixed(1)}</div>
                <p className="text-[10px] text-slate-500">Intonation rhythm & phoneme stress.</p>
              </div>
            </div>

            {/* Model Band 9 Answer Audio Comparison */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5 uppercase tracking-wide">
                  <Award className="w-4 h-4 text-emerald-600" />
                  Band 9 Model Monologue Benchmark
                </span>
                <button
                  type="button"
                  onClick={() => speakBritish(currentTopic.modelAnswer)}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Listen to Model</span>
                </button>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                "{currentTopic.modelAnswer}"
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => {
                  setStepMode('prep');
                  setCountdownSec(60);
                  setSpeechSecRemaining(120);
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
              >
                Practice Another Cue Card
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
