import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Clock,
  Globe,
  Loader2,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Shuffle,
  Volume2,
  CheckCircle2,
} from 'lucide-react';
import {
  ACCENT_METADATA,
  getPreferredAccent,
  IELTS_ACCENTS,
  OfficialIELTSAccent,
  PROFESSIONAL_STUDIO_VOICES,
} from '../../config/voiceConfig';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { askBarnabyCompanion } from '../../services/geminiService';
import { soundManager } from '../../utils/audioEffects';
import { recordActivity } from '../../services/streakService';

interface CueCardTopic {
  id: string;
  topic: string;
  prompt: string;
  bullets: string[];
  part3SeedQuestions: string[];
}

const STRESS_TEST_TOPICS: CueCardTopic[] = [
  {
    id: 'urban_green',
    topic: 'Urban Public Space',
    prompt: 'Describe a public park, waterfront, or civic space in your city that brings people together.',
    bullets: [
      'where it is located and what it looks like',
      'how often you visit it and what people do there',
      'what makes it different from commercial shopping areas',
      'and explain why spaces like this matter for modern urban well-being.'
    ],
    part3SeedQuestions: [
      'Should municipal governments prioritize green infrastructure even when housing land is scarce?',
      'How has remote work altered the way citizens use public spaces on weekdays?',
      'To what extent can urban architecture influence social cohesion across different age groups?'
    ]
  },
  {
    id: 'skill_mastery',
    topic: 'Complex Skill Mastery',
    prompt: 'Describe a demanding practical or intellectual skill that took you a long time to develop.',
    bullets: [
      'what the skill is and why you decided to learn it',
      'what obstacles or setbacks you faced along the way',
      'how you stayed disciplined during plateaus',
      'and explain how mastering it changed your confidence.'
    ],
    part3SeedQuestions: [
      'Why do some people abandon complex skills right before they reach fluency?',
      'Is AI-assisted coaching making deep craftsmanship rarer, or simply shifting which skills matter?',
      'Should schools assess long-term project mastery rather than single timed examinations?'
    ]
  },
  {
    id: 'local_innovation',
    topic: 'Local Sustainable Innovation',
    prompt: 'Describe an innovative solution or community initiative you have seen that reduces waste or saves energy.',
    bullets: [
      'what the initiative is and who started it',
      'how it works in everyday life',
      'how local residents initially reacted to it',
      'and explain whether it could be scaled nationwide.'
    ],
    part3SeedQuestions: [
      'Who bears greater responsibility for environmental habits: individual consumers or corporations?',
      'Why do environmentally beneficial policies often encounter public resistance at first?',
      'How can developing economies balance rapid industrial growth with low-carbon targets?'
    ]
  }
];

interface Part3Turn {
  question: string;
  answer: string;
  feedback: string;
  accentUsed: OfficialIELTSAccent;
  speakerName: string;
}

interface Part23StressTestStudioProps {
  onShowToast: (msg: string) => void;
}

export const Part23StressTestStudio: React.FC<Part23StressTestStudioProps> = ({ onShowToast }) => {
  const [topicIdx, setTopicIdx] = useState(0);
  const [accentMode, setAccentMode] = useState<OfficialIELTSAccent | 'Surprise'>(() =>
    getPreferredAccent()
  );
  const [activeExaminerAccent, setActiveExaminerAccent] = useState<OfficialIELTSAccent>(() =>
    getPreferredAccent()
  );
  const [activeSpeakerId, setActiveSpeakerId] = useState<string>('speaker_04');
  const [activeSpeakerName, setActiveSpeakerName] = useState<string>('Prof. Arthur Pendelton');

  const [phase, setPhase] = useState<'ready' | 'prep' | 'part2' | 'part3' | 'complete'>('ready');
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [prepNotes, setPrepNotes] = useState('');
  const [part2Transcript, setPart2Transcript] = useState('');
  const [part3Step, setPart3Step] = useState(0);
  const [currentPart3Question, setCurrentPart3Question] = useState('');
  const [part3Draft, setPart3Draft] = useState('');
  const [part3Turns, setPart3Turns] = useState<Part3Turn[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [finalSummary, setFinalSummary] = useState<string | null>(null);
  const [isListeningMic, setIsListeningMic] = useState(false);

  const recognitionRef = useRef<any>(null);
  const topic = STRESS_TEST_TOPICS[topicIdx];

  const pickVoiceForRound = (mode: OfficialIELTSAccent | 'Surprise') => {
    const resolvedAccent: OfficialIELTSAccent =
      mode === 'Surprise'
        ? IELTS_ACCENTS[Math.floor(Math.random() * IELTS_ACCENTS.length)]
        : mode;
    const pool = PROFESSIONAL_STUDIO_VOICES.filter((v) => v.accent === resolvedAccent);
    const chosen = pool[Math.floor(Math.random() * pool.length)] || PROFESSIONAL_STUDIO_VOICES[0];
    setActiveExaminerAccent(chosen.accent);
    setActiveSpeakerId(chosen.speakerId);
    setActiveSpeakerName(chosen.name);
    return chosen;
  };

  useEffect(() => {
    return () => {
      stopSpeech();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Countdown for 1-minute Prep and 2-minute Part 2 Monologue
  useEffect(() => {
    if (phase !== 'prep' && phase !== 'part2') return;
    if (secondsLeft <= 0) {
      if (phase === 'prep') {
        beginPart2Monologue();
      } else if (phase === 'part2') {
        beginPart3Interrogation();
      }
      return;
    }
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, secondsLeft]);

  const stopMic = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListeningMic(false);
  };

  const toggleMic = (target: 'part2' | 'part3') => {
    if (isListeningMic) {
      stopMic();
      return;
    }
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      onShowToast('Live microphone transcription unavailable here—type your spoken response below.');
      return;
    }
    stopSpeech();
    const rec = new SpeechRec();
    rec.lang = 'en-GB';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event: any) => {
      let combined = '';
      for (let i = 0; i < event.results.length; i++) {
        combined += event.results[i][0]?.transcript || '';
      }
      if (target === 'part2') {
        setPart2Transcript(combined.trim());
      } else {
        setPart3Draft(combined.trim());
      }
    };
    rec.onerror = () => setIsListeningMic(false);
    rec.onend = () => setIsListeningMic(false);
    recognitionRef.current = rec;
    setIsListeningMic(true);
    try {
      rec.start();
    } catch {
      setIsListeningMic(false);
    }
  };

  const startStressTest = () => {
    soundManager.playBeep(620, 0.05);
    const voice = pickVoiceForRound(accentMode);
    setPrepNotes('');
    setPart2Transcript('');
    setPart3Turns([]);
    setPart3Step(0);
    setPart3Draft('');
    setFinalSummary(null);
    setPhase('prep');
    setSecondsLeft(60);

    speakBritish(
      `Part Two cue card. You have one minute to prepare notes on: ${topic.prompt}`,
      {
        speakerId: voice.speakerId,
        accent: voice.accent,
        gender: voice.gender,
        deliveryProfile: 'examiner_question'
      }
    );
  };

  const beginPart2Monologue = () => {
    soundManager.playBeep(700, 0.06);
    setPhase('part2');
    setSecondsLeft(120);
    speakBritish('Your one minute preparation time is up. Please begin speaking for up to two minutes.', {
      speakerId: activeSpeakerId,
      accent: activeExaminerAccent,
      deliveryProfile: 'examiner_question'
    });
  };

  const beginPart3Interrogation = async () => {
    stopMic();
    setPhase('part3');
    setPart3Step(0);
    const voice = accentMode === 'Surprise' ? pickVoiceForRound('Surprise') : {
      speakerId: activeSpeakerId,
      accent: activeExaminerAccent,
      gender: PROFESSIONAL_STUDIO_VOICES.find((v) => v.speakerId === activeSpeakerId)?.gender || 'male'
    };

    const seedQuestion = topic.part3SeedQuestions[0];
    setCurrentPart3Question(seedQuestion);
    speakBritish(`Thank you. Moving straight into Part Three: ${seedQuestion}`, {
      speakerId: voice.speakerId,
      accent: voice.accent,
      gender: voice.gender,
      deliveryProfile: 'examiner_question'
    });
  };

  const handleSubmitPart3Answer = async () => {
    const answer = part3Draft.trim();
    if (!answer || isEvaluating) return;
    stopMic();
    setIsEvaluating(true);

    let feedback = 'Clear stance. Next time add a counter-perspective and one concrete C1 collocation.';
    let nextDynamicQuestion = topic.part3SeedQuestions[part3Step + 1] || '';

    try {
      const res = await askBarnabyCompanion({
        message: [
          `Part 3 Examiner Question: "${currentPart3Question}"`,
          `Candidate Answer: "${answer}"`,
          part3Step < 2
            ? `Give 1 sharp sentence of Band 8+ Fluency/Lexical critique, then on a new line write "FOLLOW-UP:" followed by one unscripted probing IELTS Part 3 follow-up question that challenges the candidate's reasoning.`
            : `Give a crisp 2-sentence final Part 2/3 Stress-Test verdict highlighting strongest criterion and #1 Band 8 upgrade.`
        ].join('\n'),
        context: {
          module: 'speaking',
          currentActivity: 'Timed Part 2/3 Stress-Test',
          spokenWarmupMode: true,
          socraticMode: false
        }
      });

      if (res.reply) {
        const parts = res.reply.split(/FOLLOW-UP:/i);
        feedback = parts[0].trim() || feedback;
        if (parts[1] && parts[1].trim().length > 10) {
          nextDynamicQuestion = parts[1].trim().replace(/^["']|["']$/g, '');
        }
      }
    } catch {
      // Keep built-in fallback
    }

    const updatedTurns: Part3Turn[] = [
      ...part3Turns,
      {
        question: currentPart3Question,
        answer,
        feedback,
        accentUsed: activeExaminerAccent,
        speakerName: activeSpeakerName
      }
    ];
    setPart3Turns(updatedTurns);
    setPart3Draft('');
    setIsEvaluating(false);

    if (part3Step + 1 >= 3) {
      setPhase('complete');
      setFinalSummary(feedback);
      recordActivity('mock', 35, `part23_stress_${Date.now()}`, 6);
      soundManager.playSuccess();
      onShowToast('Part 2/3 Stress-Test complete! +35 XP logged.');
    } else {
      const nextIdx = part3Step + 1;
      setPart3Step(nextIdx);
      const voice = accentMode === 'Surprise' ? pickVoiceForRound('Surprise') : {
        speakerId: activeSpeakerId,
        accent: activeExaminerAccent,
        gender: PROFESSIONAL_STUDIO_VOICES.find((v) => v.speakerId === activeSpeakerId)?.gender || 'male'
      };
      const q = nextDynamicQuestion || topic.part3SeedQuestions[nextIdx];
      setCurrentPart3Question(q);
      speakBritish(q, {
        speakerId: voice.speakerId,
        accent: voice.accent,
        gender: voice.gender,
        deliveryProfile: 'examiner_question'
      });
    }
  };

  const formatTimer = (sec: number) =>
    `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  return (
    <section
      data-testid="part23-stress-test-studio"
      className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 p-5 sm:p-6 space-y-5"
    >
      {/* Header & Accent Mixer */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-4 border-b border-[#D3DDDA]/70 dark:border-[#1F8A70]/25">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-[#0F4C45] dark:text-[#6EE7B7]">
            <Globe className="w-3.5 h-3.5 text-[#F4A62A]" />
            <span>Timed Part 2/3 Stress-Test &amp; Accent Mixer</span>
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-[#0E1F1E] dark:text-white">
            Unscripted Cue Card + Live Part 3 Interrogation
          </h2>
          <p className="text-xs text-[#566664] dark:text-slate-400">
            1-minute prep, 2-minute monologue, then 3 live follow-up challenges across British, Australian, American, Canadian, Kiwi, or Irish studio voices.
          </p>
        </div>

        {/* Accent Mixer Selector */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {(['Surprise', ...IELTS_ACCENTS] as const).map((acc) => {
            const active = accentMode === acc;
            return (
              <button
                key={acc}
                type="button"
                disabled={phase === 'prep' || phase === 'part2'}
                onClick={() => {
                  setAccentMode(acc);
                  if (acc !== 'Surprise') pickVoiceForRound(acc);
                }}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition cursor-pointer inline-flex items-center gap-1 ${
                  active
                    ? 'bg-[#0F4C45] text-white'
                    : 'bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/25 text-[#566664] dark:text-slate-300 hover:border-[#0F4C45]'
                }`}
              >
                {acc === 'Surprise' && <Shuffle className="w-3 h-3 text-[#F4A62A]" />}
                <span>{acc === 'Surprise' ? 'Accent Mixer' : ACCENT_METADATA[acc].label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Topic Switcher (when ready/complete) */}
      {(phase === 'ready' || phase === 'complete') && (
        <div className="flex flex-wrap items-center gap-2">
          {STRESS_TEST_TOPICS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTopicIdx(i);
                setPhase('ready');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                i === topicIdx
                  ? 'bg-[#0F4C45]/10 dark:bg-[#1F8A70]/20 text-[#0F4C45] dark:text-[#6EE7B7] border border-[#0F4C45]/35'
                  : 'bg-[#F7F9F8] dark:bg-[#0B1514] text-[#566664] dark:text-slate-400 border border-[#D3DDDA] dark:border-[#1F8A70]/20'
              }`}
            >
              {t.topic}
            </button>
          ))}
        </div>
      )}

      {/* Cue Card Preview */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/25 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#566664] dark:text-slate-400">
          <span>
            Active Examiner: <strong className="text-[#0E1F1E] dark:text-white">{activeSpeakerName}</strong> ({activeExaminerAccent})
          </span>
          {(phase === 'prep' || phase === 'part2') && (
            <span className="inline-flex items-center gap-1 font-bold text-[#9A630B] dark:text-[#F4A62A] tabular-nums">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {phase === 'prep' ? 'Prep' : 'Speak'}: {formatTimer(secondsLeft)}
              </span>
            </span>
          )}
        </div>

        <h3 className="font-display text-base font-bold text-[#0E1F1E] dark:text-white">
          {topic.prompt}
        </h3>
        <ul className="list-disc pl-5 space-y-1 text-xs text-[#566664] dark:text-slate-300">
          {topic.bullets.map((b, idx) => (
            <li key={idx}>{b}</li>
          ))}
        </ul>
      </div>

      {/* Phase Controls */}
      {phase === 'ready' && (
        <button
          type="button"
          data-testid="start-part23-stress-test-btn"
          onClick={startStressTest}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition"
        >
          <Play className="w-4 h-4 text-[#F4A62A] fill-[#F4A62A]" />
          <span>Start Timed Part 2/3 Stress-Test</span>
        </button>
      )}

      {phase === 'prep' && (
        <div className="space-y-3">
          <textarea
            rows={4}
            value={prepNotes}
            onChange={(e) => setPrepNotes(e.target.value)}
            placeholder="Jot down 4–5 rapid bullet keywords (avoid writing full sentences)..."
            className="w-full p-3.5 rounded-xl bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-xs text-[#0E1F1E] dark:text-white focus:outline-none focus:border-[#0F4C45]"
          />
          <button
            type="button"
            onClick={beginPart2Monologue}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Skip Prep &amp; Begin 2-Min Monologue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {phase === 'part2' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => toggleMic('part2')}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                isListeningMic
                  ? 'bg-rose-600 text-white'
                  : 'bg-[#0F4C45] text-white'
              }`}
            >
              {isListeningMic ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-[#F4A62A]" />}
              <span>{isListeningMic ? 'Stop Recording' : 'Record Monologue'}</span>
            </button>
            <button
              type="button"
              onClick={beginPart3Interrogation}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#F4A62A] hover:bg-[#d98f1d] text-[#0E1F1E] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Proceed to Part 3 Interrogation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <textarea
            rows={4}
            value={part2Transcript}
            onChange={(e) => setPart2Transcript(e.target.value)}
            placeholder="Your live Part 2 monologue transcript appears here (or type notes if testing silently)..."
            className="w-full p-3.5 rounded-xl bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-xs text-[#0E1F1E] dark:text-white focus:outline-none focus:border-[#0F4C45]"
          />
        </div>
      )}

      {phase === 'part3' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#0F4C45]/6 dark:bg-[#1F8A70]/15 border border-[#0F4C45]/30 space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#0F4C45] dark:text-[#6EE7B7] font-bold">
              <span>Part 3 Follow-Up Challenge {part3Step + 1} / 3 · {activeExaminerAccent}</span>
              <button
                type="button"
                onClick={() =>
                  speakBritish(currentPart3Question, {
                    speakerId: activeSpeakerId,
                    accent: activeExaminerAccent,
                    deliveryProfile: 'examiner_question'
                  })
                }
                className="inline-flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Replay Audio</span>
              </button>
            </div>
            <p className="text-sm font-bold text-[#0E1F1E] dark:text-white">
              &ldquo;{currentPart3Question}&rdquo;
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => toggleMic('part3')}
              className={`min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                isListeningMic
                  ? 'bg-rose-600 text-white'
                  : 'bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-[#0F4C45] dark:text-[#6EE7B7]'
              }`}
            >
              {isListeningMic ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-[#F4A62A]" />}
              <span>{isListeningMic ? 'Stop Mic' : 'Speak Part 3 Answer'}</span>
            </button>
          </div>

          <textarea
            rows={3}
            value={part3Draft}
            onChange={(e) => setPart3Draft(e.target.value)}
            placeholder="Deliver a structured Part 3 answer (claim -> reason -> example -> nuance)..."
            className="w-full p-3.5 rounded-xl bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-xs text-[#0E1F1E] dark:text-white focus:outline-none focus:border-[#0F4C45]"
          />

          <button
            type="button"
            disabled={isEvaluating || !part3Draft.trim()}
            onClick={handleSubmitPart3Answer}
            className="min-h-[42px] px-5 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            {isEvaluating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Examiner formulating follow-up...</span>
              </>
            ) : (
              <>
                <span>{part3Step < 2 ? 'Submit & Trigger Next Challenge' : 'Complete Stress-Test (+35 XP)'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}

      {phase === 'complete' && (
        <div className="p-4 rounded-xl bg-[#0F4C45]/10 dark:bg-[#1F8A70]/20 border border-[#0F4C45]/30 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
            <CheckCircle2 className="w-4 h-4" />
            <span>Stress-Test Complete · +35 XP Awarded</span>
          </div>
          {finalSummary && (
            <p className="text-xs text-[#0E1F1E] dark:text-[#EEF3F1] leading-relaxed">{finalSummary}</p>
          )}
          <button
            type="button"
            onClick={startStressTest}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F4C45] dark:text-[#F4A62A] hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Run Another Round</span>
          </button>
        </div>
      )}

      {/* Turn-by-Turn Part 3 Critique Log */}
      {part3Turns.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#566664] dark:text-slate-400">
            Interrogation Critique Log
          </div>
          {part3Turns.map((t, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA]/80 dark:border-[#1F8A70]/25 space-y-1.5 text-xs"
            >
              <div className="text-[11px] font-mono text-[#566664] dark:text-slate-400">
                Q{idx + 1} · {t.speakerName} ({t.accentUsed})
              </div>
              <div className="font-semibold text-[#0E1F1E] dark:text-white">{t.question}</div>
              <div className="italic text-[#566664] dark:text-slate-300">&ldquo;{t.answer}&rdquo;</div>
              <div className="pt-1 border-t border-[#D3DDDA]/60 dark:border-[#1F8A70]/20 text-[#0F4C45] dark:text-[#6EE7B7]">
                <strong>Examiner Note:</strong> {t.feedback}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
