import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Headphones,
  BookOpen,
  PenLine,
  Mic,
  Target,
  Calendar,
  Clock,
  CheckCircle2,
  Sparkles,
  Volume2,
  Square,
  RotateCcw,
  TrendingUp,
  Award,
  Play,
} from 'lucide-react';
import { generatePersonalizedStudyPlan } from '../../services/aiStudyPlanService';
import { soundManager } from '../../utils/audioEffects';
import { analyzeTextQualitySignals, roundOfficialIELTSBand } from '../../utils/scoringIntegrity';
import { saveDiagnosticResult } from '../../services/diagnosticResultStore';
import type {
  DiagnosticResult,
  DiagnosticSkill,
} from '../../services/diagnosticResultStore';
export type { DiagnosticResult, DiagnosticSkill } from '../../services/diagnosticResultStore';
export { loadDiagnosticResult } from '../../services/diagnosticResultStore';

/**
 * BandSprint Diagnostic Test — a real 10-minute skills test, not a questionnaire.
 * Listening (audio via device speech, British voice when available), Reading,
 * Writing (Task 2, locally scored with a transparent rubric estimate) and
 * Speaking (cue-card recording + self-rating). All original BandSprint content.
 * Scores are diagnostic estimates, clearly labelled as such.
 */

const SKILL_LABEL: Record<DiagnosticSkill, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
};

const SKILL_TIP: Record<DiagnosticSkill, string> = {
  listening:
    'Trap answers change numbers and times mid-sentence. Practise Section 1 first, then move to Sections 3–4. / সংখ্যা ও সময় মাঝপথে বদলে যায় — Section 1 দিয়ে শুরু করুন।',
  reading:
    'Skim the questions first, then scan for keywords. True / False / Not Given is about what the text actually says, not what you think. / প্রশ্ন আগে পড়ুন, তারপর keyword খুঁজুন।',
  writing:
    'Plan 5 minutes, write 30, check 5. One clear idea per paragraph, with a linking word at the start of each. / প্রতি paragraph-এ একটি ধারণা, শুরুতে linking word।',
  speaking:
    'Speak for the full 2 minutes on Part 2. Slow down, use one example, and do not memorise whole answers. / Part 2-তে পুরো ২ মিনিট বলুন, একটি উদাহরণ দিন।',
};

/* ---------------- Listening: original dialogue, read aloud by the device ---------------- */

const LISTENING_SCRIPT = `Good morning, Riverside Library, how can I help you? Hi, I'd like to book a study room for next Tuesday, please. Of course. Which day exactly? Tuesday the 14th of October. And what time would you like? From half past nine in the morning until quarter past twelve. Let me check. Room 3 is free at that time, but Room 5 is already booked until eleven. Room 3 is fine. How many people will be using the room? There will be four of us, and we need the whiteboard. No problem, Room 3 has a whiteboard. The cost is six pounds per hour. So for three hours, that is eighteen pounds in total. Can I pay by card when I arrive? Yes, you can pay at the front desk. Could I have your name, please? It's Daniel Rahman. R-A-H-M-A-N. Thank you, Mr Rahman. Your booking is confirmed for Tuesday the 14th of October, from nine thirty until twelve fifteen, Room 3. Please arrive ten minutes early. I will, thank you very much.`;

interface Mcq {
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

const LISTENING_QS: Mcq[] = [
  {
    q: 'On which date is the study room booked?',
    options: ['Monday 13th October', 'Tuesday 14th October', 'Tuesday 4th October', 'Thursday 14th October'],
    answer: 1,
    explain: 'The caller says "Tuesday the 14th of October".',
  },
  {
    q: 'What time does the booking end?',
    options: ['11:00', '12:00', '12:15', '12:30'],
    answer: 2,
    explain: 'The booking runs from 9:30 until quarter past twelve — 12:15.',
  },
  {
    q: 'Which room is booked?',
    options: ['Room 3', 'Room 5', 'Room 4', 'Room 1'],
    answer: 0,
    explain: 'Room 5 is booked until eleven, so the caller takes Room 3.',
  },
  {
    q: 'How much does the booking cost in total?',
    options: ['£6', '£12', '£18', '£24'],
    answer: 2,
    explain: 'Six pounds per hour for three hours is eighteen pounds.',
  },
  {
    q: 'How should the caller spell his surname?',
    options: ['R-A-M-A-N', 'R-A-H-M-A-N', 'R-A-H-M-A-N-N', 'R-A-M-A-N-N'],
    answer: 1,
    explain: 'He spells it R-A-H-M-A-N — Rahman.',
  },
];

/* ---------------- Reading: original passage ---------------- */

const READING_PASSAGE = `Night trains are coming back to Europe. After years of decline, when cheap flights took most long-distance passengers, several railway companies have started new overnight routes between major cities. A sleeper train from Paris to Vienna, for example, now carries hundreds of passengers every night, and bookings for the summer months are often full weeks in advance.

There are several reasons for this change. First, many travellers are worried about the environmental cost of flying, and a train journey produces far less carbon dioxide per passenger. Second, a night train saves the cost of a hotel: passengers sleep on the train and arrive in the morning, ready to start the day. Third, new trains are more comfortable than the old ones, with private cabins, showers in some carriages, and a dining car that serves breakfast.

Not everyone is convinced, however. Tickets are often more expensive than a budget flight, especially if a traveller wants a private cabin. The network is also limited: many routes still require a change of train in the middle of the night, and some cities have no direct sleeper service at all. Railway managers say the solution is investment — more trains, more routes, and simpler booking — but that will take years and a great deal of money.

For now, the return of the night train is a small but growing trend, driven less by nostalgia than by practical concerns: cost, comfort, and the climate.`;

const READING_QS: Mcq[] = [
  {
    q: 'Night trains declined in the past mainly because of cheap flights.',
    options: ['True', 'False', 'Not Given'],
    answer: 0,
    explain: 'The passage says cheap flights "took most long-distance passengers".',
  },
  {
    q: 'The Paris to Vienna sleeper train is usually empty in summer.',
    options: ['True', 'False', 'Not Given'],
    answer: 1,
    explain: 'Bookings are "often full weeks in advance" — the opposite.',
  },
  {
    q: 'A night train journey produces more carbon dioxide per passenger than a flight.',
    options: ['True', 'False', 'Not Given'],
    answer: 1,
    explain: 'The passage says a train produces "far less carbon dioxide".',
  },
  {
    q: 'Every sleeper carriage on the new trains has a shower.',
    options: ['True', 'False', 'Not Given'],
    answer: 2,
    explain: 'The passage says showers are in "some carriages" — it does not say every carriage.',
  },
  {
    q: 'What do railway managers say is needed for the network to grow?',
    options: [
      'Cheaper tickets for students',
      'More trains, more routes, and simpler booking',
      'Faster trains only',
      'More flights to compete with',
    ],
    answer: 1,
    explain: 'The passage lists "more trains, more routes, and simpler booking".',
  },
];

/* ---------------- Scoring ---------------- */

function rawToBand(correct: number, total: number): number {
  if (total <= 0 || correct <= 0) return 1.0;
  const ratio = correct / total;
  if (ratio >= 0.99) return 7.5;
  if (ratio >= 0.79) return 6.5;
  if (ratio >= 0.59) return 5.5;
  if (ratio >= 0.39) return 4.5;
  if (ratio >= 0.19) return 3.5;
  return 2.0;
}

const LINKING_WORDS = [
  'however', 'furthermore', 'moreover', 'firstly', 'secondly', 'finally', 'in conclusion',
  'on the other hand', 'for example', 'for instance', 'in my opinion', 'as a result',
  'in addition', 'therefore', 'although', 'despite', 'nevertheless', 'overall',
];

function scoreWriting(text: string): { band: number; words: number; feedback: string[] } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = text.trim() ? words.length : 0;
  const signals = analyzeTextQualitySignals(text);
  const lower = text.toLowerCase();
  const paragraphs = text.split(/\n+/).filter((p) => p.trim().length > 20).length;
  const linking = LINKING_WORDS.filter((w) => lower.includes(w)).length;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 3);
  const avgSentence = sentences.length ? wordCount / sentences.length : 0;
  const lexicalRatio = signals.lexicalDiversityRatio;

  if (wordCount < 30 || signals.isGibberish) {
    return {
      band: 0.0,
      words: wordCount,
      feedback: [
        wordCount < 30
          ? `Write at least 30 words to generate a diagnostic estimate (${wordCount} written; Task 2 target is 250+).`
          : 'Draft appears unassessable or gibberish. Write clear, complete sentences.'
      ]
    };
  }

  let band = 4.5;
  if (wordCount >= 250) band += 1.0;
  else if (wordCount >= 200) band += 0.5;
  else if (wordCount < 120) band -= 1.0;
  if (paragraphs >= 4) band += 0.5;
  if (linking >= 4) band += 0.5;
  else if (linking >= 2) band += 0.25;
  if (avgSentence >= 12 && avgSentence <= 24) band += 0.5;
  if (lexicalRatio > 0.55) band += 0.5;
  else if (lexicalRatio < 0.3) band -= 1.5;

  if (signals.isHighlyRepetitive || signals.repeatedSentenceRatio >= 0.35) {
    band = Math.min(band - 2.0, 3.5);
  }
  if (signals.memorizedTemplateHits.length > 0) {
    band -= 0.5;
  }

  band = roundOfficialIELTSBand(Math.max(1.0, Math.min(8.0, band)));

  const feedback: string[] = [];
  if (wordCount < 250) feedback.push(`Aim for 250+ words — you wrote ${wordCount}. Task 2 needs at least 250.`);
  else feedback.push(`Good length — ${wordCount} words.`);
  if (paragraphs < 4) feedback.push('Use 4 paragraphs: introduction, two main ideas, conclusion.');
  else feedback.push('Clear paragraph structure.');
  if (linking < 2) feedback.push('Add linking words — however, furthermore, for example, in conclusion.');
  else feedback.push(`Good linking — ${linking} linking phrases found.`);
  if (signals.isHighlyRepetitive) feedback.push('High sentence or word repetition detected — write original ideas without repeating lines.');
  else if (lexicalRatio <= 0.55) feedback.push('Vary your vocabulary — avoid repeating the same words.');
  return { band, words: wordCount, feedback };
}

function roundHalf(n: number): number {
  return roundOfficialIELTSBand(n);
}

type Step = 'setup' | 'listening' | 'reading' | 'writing' | 'speaking' | 'results';

interface DiagnosticTestProps {
  onBack: () => void;
  onNavigateToPlan: () => void;
  onShowToast: (msg: string) => void;
}

export const DiagnosticTest: React.FC<DiagnosticTestProps> = ({ onBack, onNavigateToPlan, onShowToast }) => {
  const [step, setStep] = useState<Step>('setup');
  const [targetBand, setTargetBand] = useState(7.5);
  const [examDate, setExamDate] = useState(() => new Date(Date.now() + 42 * 86400000).toISOString().split('T')[0]);
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [examType, setExamType] = useState<'Academic' | 'General Training'>('Academic');

  const [listeningAnswers, setListeningAnswers] = useState<Record<number, number>>({});
  const [readingAnswers, setReadingAnswers] = useState<Record<number, number>>({});
  const [writingText, setWritingText] = useState('');
  const [listeningPlayed, setListeningPlayed] = useState(false);
  const [speakingRatings, setSpeakingRatings] = useState({ fluency: 3, vocabulary: 3, grammar: 3, pronunciation: 3 });
  const [speakingRecorded, setSpeakingRecorded] = useState(false);
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState('');
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [planBuilt, setPlanBuilt] = useState(false);
  const [buildingPlan, setBuildingPlan] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    startedAtRef.current = Date.now();
    return () => {
      try { window.speechSynthesis?.cancel(); } catch {}
      try { mediaStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    };
  }, []);

  const elapsedMin = useMemo(() => Math.max(1, Math.round((Date.now() - startedAtRef.current) / 60000)), [step]);

  const playListening = () => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) { onShowToast('Audio is not supported on this device — read the questions and answer from the script below.'); return; }
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(LISTENING_SCRIPT);
      const voices = synth.getVoices();
      const gb = voices.find((v) => /en-GB/i.test(v.lang) || /British/i.test(v.name));
      if (gb) utter.voice = gb;
      utter.rate = 0.95;
      utter.onend = () => setListeningPlayed(true);
      synth.speak(utter);
      setListeningPlayed(true);
      soundManager.playBeep(520, 0.04);
    } catch {
      onShowToast('Could not play audio on this device.');
    }
  };

  const stopListening = () => {
    try { window.speechSynthesis?.cancel(); } catch {}
  };

  const startRecording = async () => {
    setMicError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setMicError('Microphone is not available — you can still finish the Speaking rating below without recording.');
    }
  };

  const stopRecording = () => {
    try { mediaRecorderRef.current?.stop(); } catch {}
    try { mediaStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    setRecording(false);
    setSpeakingRecorded(true);
    soundManager.playSuccess();
  };

  const listeningCorrect = LISTENING_QS.reduce((n, q, i) => n + (listeningAnswers[i] === q.answer ? 1 : 0), 0);
  const readingCorrect = READING_QS.reduce((n, q, i) => n + (readingAnswers[i] === q.answer ? 1 : 0), 0);
  const writingScore = useMemo(() => scoreWriting(writingText), [writingText]);

  const finishDiagnostic = () => {
    const listeningBand = rawToBand(listeningCorrect, LISTENING_QS.length);
    const readingBand = rawToBand(readingCorrect, READING_QS.length);
    const speakingAvg = (speakingRatings.fluency + speakingRatings.vocabulary + speakingRatings.grammar + speakingRatings.pronunciation) / 4;
    const speakingBand = roundHalf(3.0 + (speakingAvg - 1) * 1.125);
    const scores = {
      listening: listeningBand,
      reading: readingBand,
      writing: writingScore.band,
      speaking: speakingBand,
      overall: roundHalf((listeningBand + readingBand + writingScore.band + speakingBand) / 4),
    };
    const weakest = (Object.keys(scores).filter((k) => k !== 'overall') as DiagnosticSkill[])
      .sort((a, b) => scores[a] - scores[b])[0];
    const res: DiagnosticResult = {
      id: `diag_${Date.now()}`,
      createdAt: Date.now(),
      targetBand,
      examDate,
      dailyMinutes,
      examType,
      scores,
      correct: { listening: listeningCorrect, reading: readingCorrect },
      weakest,
      writingWords: writingScore.words,
      speakingRecorded,
    };
    saveDiagnosticResult(res);
    setResult(res);
    setStep('results');
    soundManager.playSuccess();
    window.scrollTo({ top: 0 });
  };

  const buildPlan = async () => {
    if (!result) return;
    setBuildingPlan(true);
    try {
      const weaknessMap: Record<DiagnosticSkill, 'writing' | 'speaking' | 'reading' | 'listening' | 'balanced'> = {
        listening: 'listening', reading: 'reading', writing: 'writing', speaking: 'speaking',
      };
      await generatePersonalizedStudyPlan({
        targetBand: result.targetBand,
        currentBand: result.scores.overall,
        examDate: result.examDate,
        dailyMinutes: result.dailyMinutes,
        weakness: weaknessMap[result.weakest],
        examType: result.examType === 'Academic' ? 'academic' : 'general',
        candidateName: 'Candidate',
      });
      setPlanBuilt(true);
      onShowToast('Your personal study plan is ready!');
      onNavigateToPlan();
    } catch {
      onShowToast('Could not build the plan — please try again from the Study Plan page.');
    } finally {
      setBuildingPlan(false);
    }
  };

  const steps: Step[] = ['setup', 'listening', 'reading', 'writing', 'speaking', 'results'];
  const stepIndex = steps.indexOf(step);
  const stepLabel: Record<Step, string> = {
    setup: 'Your goal', listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking', results: 'Your results',
  };

  const goTo = (s: Step) => {
    stopListening();
    setStep(s);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 pb-16 animate-fade-in">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <section className="rounded-2xl bg-[#0F4C45] text-white border border-[#1F8A70]/40 p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#F4A62A]"><Target className="w-4 h-4" /> BandSprint Diagnostic · about 10 minutes</div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-2">Find your starting band</h1>
        <p className="text-sm text-[#EEF3F1]/90 mt-2 leading-relaxed">
          A real mini-test in all four skills. Answer honestly — your result builds your personal study plan.
          Scores are diagnostic estimates, not official IELTS results.
        </p>
        <div className="flex items-center gap-4 mt-4 text-xs text-[#EEF3F1]/80">
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> ~{elapsedMin} min so far</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Step {stepIndex + 1} of 6 · {stepLabel[step]}</span>
        </div>
        <div className="h-2 bg-white/15 rounded-full mt-4 overflow-hidden">
          <div className="h-full bg-[#F4A62A] rounded-full transition-all" style={{ width: `${((stepIndex + 1) / 6) * 100}%` }} />
        </div>
      </section>

      {step === 'setup' && (
        <section className="rounded-2xl bg-white dark:bg-[#11201E] border border-slate-200 dark:border-[#1F8A70]/40 p-6 space-y-5">
          <h2 className="font-bold text-lg text-slate-900 dark:text-white">First, your goal</h2>
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Target band</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {[6.0, 6.5, 7.0, 7.5, 8.0, 8.5].map((b) => (
                <button key={b} type="button" onClick={() => setTargetBand(b)} className={`px-4 py-2 rounded-xl font-bold text-sm min-h-[44px] cursor-pointer ${targetBand === b ? 'bg-[#0F4C45] text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200'}`}>
                  Band {b.toFixed(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Exam date</label>
              <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#0B1A18] text-slate-900 dark:text-white min-h-[48px]" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Study time per day</label>
              <div className="flex gap-2 mt-2">
                {[30, 60, 90].map((m) => (
                  <button key={m} type="button" onClick={() => setDailyMinutes(m)} className={`flex-1 px-3 py-3 rounded-xl font-bold text-sm min-h-[48px] cursor-pointer ${dailyMinutes === m ? 'bg-[#0F4C45] text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200'}`}>{m} min</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Test type</label>
            <div className="flex gap-2 mt-2">
              {(['Academic', 'General Training'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setExamType(t)} className={`flex-1 px-3 py-3 rounded-xl font-bold text-sm min-h-[48px] cursor-pointer ${examType === t ? 'bg-[#0F4C45] text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200'}`}>{t}</button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => goTo('listening')} className="w-full min-h-[52px] px-6 py-3.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer">
            Start Listening <ArrowRight className="w-5 h-5" />
          </button>
        </section>
      )}

      {step === 'listening' && (
        <section className="rounded-2xl bg-white dark:bg-[#11201E] border border-slate-200 dark:border-[#1F8A70]/40 p-6 space-y-5">
          <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2"><Headphones className="w-5 h-5 text-[#0F4C45]" /> Listening — book a study room</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Press play and listen to the phone call. You can play it twice. Then answer the 5 questions — the answers are hidden until you finish.</p>
          <div className="flex gap-2">
            <button type="button" onClick={playListening} className="flex-1 min-h-[52px] px-4 py-3 rounded-xl bg-[#0F4C45] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"><Volume2 className="w-5 h-5" /> Play dialogue</button>
            <button type="button" onClick={stopListening} className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/10 font-bold text-sm flex items-center gap-2 cursor-pointer"><Square className="w-4 h-4" /> Stop</button>
          </div>
          {LISTENING_QS.map((q, qi) => (
            <div key={qi} className="border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-2">
              <p className="font-semibold text-sm text-slate-900 dark:text-white">Q{qi + 1}. {q.q}</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {q.options.map((opt, oi) => (
                  <button key={oi} type="button" onClick={() => setListeningAnswers((p) => ({ ...p, [qi]: oi }))} className={`text-left px-3 py-2.5 rounded-lg text-sm min-h-[44px] cursor-pointer border ${listeningAnswers[qi] === oi ? 'bg-[#0F4C45] text-white border-[#0F4C45]' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200'}`}>{opt}</button>
                ))}
              </div>
            </div>
          ))}
          <button type="button" disabled={Object.keys(listeningAnswers).length < 5} onClick={() => goTo('reading')} className="w-full min-h-[52px] px-6 py-3.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40">
            Continue to Reading <ArrowRight className="w-5 h-5" />
          </button>
          {Object.keys(listeningAnswers).length < 5 && <p className="text-xs text-center text-slate-500">Answer all 5 questions to continue.</p>}
        </section>
      )}

      {step === 'reading' && (
        <section className="rounded-2xl bg-white dark:bg-[#11201E] border border-slate-200 dark:border-[#1F8A70]/40 p-6 space-y-5">
          <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2"><BookOpen className="w-5 h-5 text-[#0F4C45]" /> Reading — night trains return</h2>
          <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-line">{READING_PASSAGE}</div>
          {READING_QS.map((q, qi) => (
            <div key={qi} className="border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-2">
              <p className="font-semibold text-sm text-slate-900 dark:text-white">Q{qi + 1}. {q.q}</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {q.options.map((opt, oi) => (
                  <button key={oi} type="button" onClick={() => setReadingAnswers((p) => ({ ...p, [qi]: oi }))} className={`text-left px-3 py-2.5 rounded-lg text-sm min-h-[44px] cursor-pointer border ${readingAnswers[qi] === oi ? 'bg-[#0F4C45] text-white border-[#0F4C45]' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200'}`}>{opt}</button>
                ))}
              </div>
            </div>
          ))}
          <button type="button" disabled={Object.keys(readingAnswers).length < 5} onClick={() => goTo('writing')} className="w-full min-h-[52px] px-6 py-3.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40">
            Continue to Writing <ArrowRight className="w-5 h-5" />
          </button>
        </section>
      )}

      {step === 'writing' && (
        <section className="rounded-2xl bg-white dark:bg-[#11201E] border border-slate-200 dark:border-[#1F8A70]/40 p-6 space-y-5">
          <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2"><PenLine className="w-5 h-5 text-[#0F4C45]" /> Writing — Task 2</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>Some people think university education should be free for all students. To what extent do you agree or disagree?</strong><br />
            Write at least 250 words. Give reasons and examples from your own experience.
          </p>
          <textarea value={writingText} onChange={(e) => setWritingText(e.target.value)} rows={10} placeholder="Start with your opinion in the first paragraph…" className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#0B1A18] text-slate-900 dark:text-white text-sm leading-relaxed" />
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{writingScore.words} words {writingScore.words >= 250 ? '· target reached' : '· target 250'}</span>
            <span className="text-slate-500">Estimated band so far: {writingScore.band.toFixed(1)}</span>
          </div>
          <button type="button" disabled={writingScore.words < 80} onClick={() => goTo('speaking')} className="w-full min-h-[52px] px-6 py-3.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40">
            Continue to Speaking <ArrowRight className="w-5 h-5" />
          </button>
          {writingScore.words < 80 && <p className="text-xs text-center text-slate-500">Write at least 80 words to continue (250 is the real Task 2 target).</p>}
        </section>
      )}

      {step === 'speaking' && (
        <section className="rounded-2xl bg-white dark:bg-[#11201E] border border-slate-200 dark:border-[#1F8A70]/40 p-6 space-y-5">
          <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2"><Mic className="w-5 h-5 text-[#0F4C45]" /> Speaking — answer out loud</h2>
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
            <p><strong>Part 1:</strong> Describe your hometown. What do you like most about it?</p>
            <p><strong>Part 2 — cue card (speak for 1–2 minutes):</strong> Describe a skill you learned outside formal education. You should say what the skill is, how you learned it, and why it is useful.</p>
            <p><strong>Part 3:</strong> How has technology changed the way people learn new skills?</p>
          </div>
          <div className="flex gap-2">
            {!recording ? (
              <button type="button" onClick={startRecording} className="flex-1 min-h-[52px] px-4 py-3 rounded-xl bg-[#0F4C45] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"><Mic className="w-5 h-5" /> Record my Part 2 answer</button>
            ) : (
              <button type="button" onClick={stopRecording} className="flex-1 min-h-[52px] px-4 py-3 rounded-xl bg-red-600 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"><Square className="w-5 h-5" /> Stop recording</button>
            )}
          </div>
          {speakingRecorded && <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Recorded — well done. Now rate yourself honestly below.</p>}
          {micError && <p className="text-sm text-amber-700 dark:text-amber-400">{micError}</p>}
          <div className="space-y-4">
            {([['fluency', 'Fluency — I spoke without long pauses'], ['vocabulary', 'Vocabulary — I used a range of words'], ['grammar', 'Grammar — my sentences were mostly correct'], ['pronunciation', 'Pronunciation — I was easy to understand']] as const).map(([key, label]) => (
              <div key={key}>
                <div className="flex justify-between text-sm font-semibold text-slate-700 dark:text-slate-200"><span>{label}</span><span>{speakingRatings[key]} / 5</span></div>
                <input type="range" min={1} max={5} step={1} value={speakingRatings[key]} onChange={(e) => setSpeakingRatings((p) => ({ ...p, [key]: Number(e.target.value) }))} className="w-full accent-[#0F4C45]" />
              </div>
            ))}
          </div>
          <button type="button" onClick={finishDiagnostic} className="w-full min-h-[52px] px-6 py-3.5 rounded-xl bg-[#F4A62A] hover:bg-[#d98f1d] text-[#0E1F1E] font-bold text-sm flex items-center justify-center gap-2 cursor-pointer">
            <Award className="w-5 h-5" /> See my results
          </button>
        </section>
      )}

      {step === 'results' && result && (
        <section className="space-y-5">
          <div className="rounded-2xl bg-white dark:bg-[#11201E] border border-slate-200 dark:border-[#1F8A70]/40 p-6 text-center">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Your starting band · diagnostic estimate</div>
            <div className="text-5xl font-black text-[#0F4C45] dark:text-[#F4A62A] mt-2">Band {result.scores.overall.toFixed(1)}</div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
              Target Band {result.targetBand.toFixed(1)} · gap {Math.max(0, result.targetBand - result.scores.overall).toFixed(1)} band{result.targetBand - result.scores.overall > 1 ? 's' : ''} · weakest skill: <strong>{SKILL_LABEL[result.weakest]}</strong>
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Listening {listeningCorrect}/5 correct · Reading {readingCorrect}/5 correct · Writing {result.writingWords} words (heuristic estimate) · Speaking: Self-Estimated{result.speakingRecorded ? ' (audio recorded locally, not AI-scored)' : ' (self-rated only)'}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {(Object.keys(SKILL_LABEL) as DiagnosticSkill[]).map((skill) => (
              <div key={skill} className={`rounded-2xl border p-4 ${result.weakest === skill ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700' : 'bg-white dark:bg-[#11201E] border-slate-200 dark:border-[#1F8A70]/40'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {SKILL_LABEL[skill]}
                    {skill === 'speaking' ? ' (Self-Rated)' : ''}
                    {result.weakest === skill ? ' · focus here' : ''}
                  </span>
                  <span className="font-black text-lg text-[#0F4C45] dark:text-[#F4A62A]">Band {result.scores[skill].toFixed(1)}</span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-[#0F4C45] rounded-full" style={{ width: `${(result.scores[skill] / 9) * 100}%` }} />
                </div>
                {result.weakest === skill && <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{SKILL_TIP[skill]}</p>}
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#11201E] border border-slate-200 dark:border-[#1F8A70]/40 p-6">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-[#0F4C45]" /> Writing feedback</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {writingScore.feedback.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>

          <button type="button" disabled={buildingPlan || planBuilt} onClick={buildPlan} className="w-full min-h-[56px] px-6 py-4 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
            <Sparkles className="w-5 h-5" /> {buildingPlan ? 'Building your plan…' : planBuilt ? 'Plan built — opening it…' : `Build my ${result.examDate ? '' : ''}study plan for Band ${result.targetBand.toFixed(1)}`}
          </button>
          <button type="button" onClick={() => { setResult(null); setListeningAnswers({}); setReadingAnswers({}); setWritingText(''); setSpeakingRecorded(false); goTo('setup'); }} className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-slate-100 dark:bg-white/10 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer text-slate-700 dark:text-slate-200">
            <RotateCcw className="w-4 h-4" /> Retake diagnostic
          </button>
          <p className="text-xs text-center text-slate-500">Scores are estimates from this short diagnostic, not official IELTS results. Your plan is saved on this device.</p>
        </section>
      )}

      {step !== 'results' && step !== 'setup' && (
        <button type="button" onClick={() => goTo(steps[Math.max(0, stepIndex - 1)])} className="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1.5 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Previous step
        </button>
      )}
      <div className="hidden"><Play className="w-4 h-4" /></div>
    </div>
  );
};
