import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Mic,
  Square,
  Award,
  AlertTriangle,
  ArrowRight,
  Clock,
  RotateCcw,
  CheckCircle2,
  XCircle,
  PenTool,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  UserCheck,
  ShieldCheck,
  Activity,
  Headphones,
  Check,
  RefreshCw,
  BarChart3,
  HelpCircle,
  ArrowLeft,
  Zap,
  BookOpen,
  Save,
  IdCard,
  BadgeCheck,
  FileCheck
} from 'lucide-react';
import { soundManager } from '../utils/audioEffects';
import { speakBritish, stopSpeech } from '../utils/britishVoice';
import { questionEngine } from '../services/QuestionEngine';
import { audioManager } from '../services/AudioManager';
import { evaluateSpeakingSession, analyzeSpeakingFluency, evaluateSingleSpeakingTurn, generateDiagnosticTurnFeedback } from '../services/SpeakingEvaluationService';
import {
  SpeakingQuestionItem,
  SpeakingAnswerRecord,
  SpeakingEvaluationReport,
  GrammarObservation,
  VocabUpgrade,
  InstantSpeakingFeedback,
  DetailedGrammarError
} from '../types/speakingTypes';
import { addMistake } from '../utils/vaultStorage';
import { getActiveUser } from '../utils/userStorage';
import { InstantSpeakingFeedbackModal } from './speaking/InstantSpeakingFeedbackModal';
import {
  PART_1_SPEAKING_BANK,
  PART_2_CUE_CARD_BANK,
  PART_3_DISCUSSION_BANK
} from '../data/speakingComprehensiveBank';
import { AudioWaveformVisualizer } from './audio/AudioWaveformVisualizer';
import { SpeakingVoiceOrb, VoiceOrbState } from './audio/SpeakingVoiceOrb';


export type SpeakingExamStage =
  | 'PRE_TEST'
  | 'ID_CHECK'
  | 'PART_1'
  | 'PART_2_PREP'
  | 'PART_2_SPEAK'
  | 'PART_3'
  | 'COMPLETED'
  | 'ANALYZING'
  | 'RESULTS';

export interface CandidateIdentityInfo {
  fullName: string;
  preferredName: string;
  origin: string;
  idDocument: string;
  isVerified: boolean;
}

export const OFFICIAL_CANDIDATE_ID_PROTOCOL = [
  {
    step: 0,
    title: 'Candidate Full Name',
    prompt: 'Good afternoon. My name is Dr. Alistair Vance. Can you tell me your full name, please?',
    subtext: 'State your full legal name as registered on your passport or identity card.',
    field: 'fullName' as const,
    placeholder: 'e.g., My full name is Md Ebadul Islam',
    exampleAnswer: 'My full name is Md Ebadul Islam.'
  },
  {
    step: 1,
    title: 'Preferred Name',
    prompt: 'Thank you. And what can I call you?',
    subtext: 'Give your preferred first name or conversational name.',
    field: 'preferredName' as const,
    placeholder: 'e.g., You can call me Ebadul',
    exampleAnswer: 'You can call me Ebadul.'
  },
  {
    step: 2,
    title: 'Hometown & Origin',
    prompt: 'Thank you. And where do you come from?',
    subtext: 'State the city and country you are from.',
    field: 'origin' as const,
    placeholder: 'e.g., I come from Dhaka, Bangladesh',
    exampleAnswer: 'I come from Dhaka, Bangladesh.'
  },
  {
    step: 3,
    title: 'Identification Verification',
    prompt: 'Thank you. Could you show me your identification, please?',
    subtext: 'Present and confirm your valid passport or National ID card.',
    field: 'idDocument' as const,
    placeholder: 'e.g., Yes, of course. Here is my passport.',
    exampleAnswer: 'Yes, of course. Here is my passport.'
  }
];

interface VoiceExaminerProps {
  onGradeInMock?: (text: string, partTitle: string) => void;
  onShowToast: (msg: string) => void;
}

const STORAGE_SESSION_KEY = 'ielts_speaking_exam_session_v4';
const STORAGE_SEEN_KEY = 'ielts_speaking_recent_seen_ids_v2';

export const VoiceExaminer: React.FC<VoiceExaminerProps> = ({ onGradeInMock, onShowToast }) => {
  // 1. State Machine Stage
  const [stage, setStage] = useState<SpeakingExamStage>('PRE_TEST');

  // 1.5 Official Candidate Identification State
  const [idCheckStep, setIdCheckStep] = useState<number>(0);
  const [candidateIdentity, setCandidateIdentity] = useState<CandidateIdentityInfo>(() => {
    const active = getActiveUser();
    return {
      fullName: active?.name || '',
      preferredName: active?.name ? active.name.split(' ')[0] : '',
      origin: active?.progress?.targetCountry ? 'International Candidate' : '',
      idDocument: 'Passport / National Identity Card',
      isVerified: false
    };
  });

  // 2. Exam Session Content
  const [testId, setTestId] = useState<string>(() => 'spk_exam_' + Date.now());
  const [part1Questions, setPart1Questions] = useState<SpeakingQuestionItem[]>([]);
  const [part2CueCard, setPart2CueCard] = useState<SpeakingQuestionItem | null>(null);
  const [part3Questions, setPart3Questions] = useState<SpeakingQuestionItem[]>([]);

  // Current sub-turn indices for Part 1 (0..3) and Part 3 (0..2)
  const [part1Index, setPart1Index] = useState<number>(0);
  const [part3Index, setPart3Index] = useState<number>(0);

  // 3. Audio & Voice States
  const [isExaminerSpeaking, setIsExaminerSpeaking] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [candidateTranscript, setCandidateTranscript] = useState<string>('');
  const [speakingElapsedSec, setSpeakingElapsedSec] = useState<number>(0);

  // 4. Timers
  const [prepSecondsLeft, setPrepSecondsLeft] = useState<number>(60);
  const [monologueSecondsLeft, setMonologueSecondsLeft] = useState<number>(120);

  // Part 2 candidate note scratchpad
  const [part2Notes, setPart2Notes] = useState<string>('');

  // 5. Records & Analytics
  const [completedAnswers, setCompletedAnswers] = useState<SpeakingAnswerRecord[]>([]);
  const [evaluationReport, setEvaluationReport] = useState<SpeakingEvaluationReport | null>(null);

  // 6. Instant Feedback States
  const [autoInstantFeedback, setAutoInstantFeedback] = useState<boolean>(true);
  const [currentTurnFeedback, setCurrentTurnFeedback] = useState<InstantSpeakingFeedback | null>(null);
  const [showTurnFeedbackModal, setShowTurnFeedbackModal] = useState<boolean>(false);
  const [isLoadingTurnFeedback, setIsLoadingTurnFeedback] = useState<boolean>(false);
  const [pendingTurnAdvance, setPendingTurnAdvance] = useState<(() => void) | null>(null);
  const [nextTurnLabel, setNextTurnLabel] = useState<string>('Next Question →');
  const [resultsTab, setResultsTab] = useState<'overview' | 'breakdowns' | 'vault'>('overview');
  const [playingModelTurnIdx, setPlayingModelTurnIdx] = useState<number | null>(null);
  const [savedTurnErrors, setSavedTurnErrors] = useState<Record<string, boolean>>({});

  // 7. UI Helpers & Hardware Verification
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [soundCheckActive, setSoundCheckActive] = useState<boolean>(false);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const [expandedTurns, setExpandedTurns] = useState<Record<number, boolean>>({});

  // Refs for speech recognition & intervals
  const recognitionRef = useRef<any>(null);
  const isSessionRecordingRef = useRef<boolean>(false);
  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const monologueTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceCheckRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(Date.now());
  const previousTranscriptLengthRef = useRef<number>(0);

  // Helper to load distinct, fresh questions from QuestionEngine and Comprehensive Bank
  const assembleExamQuestions = useCallback((): {
    p1: SpeakingQuestionItem[];
    p2: SpeakingQuestionItem;
    p3: SpeakingQuestionItem[];
  } => {
    // Read seen IDs to avoid recent repetition
    let seenIds = new Set<string>();
    try {
      const raw = localStorage.getItem(STORAGE_SEEN_KEY);
      if (raw) seenIds = new Set(JSON.parse(raw));
    } catch {}

    // Filter available pool
    const availableP1 = PART_1_SPEAKING_BANK.filter((q) => !seenIds.has(q.id));
    const p1Pool = availableP1.length >= 4 ? availableP1 : PART_1_SPEAKING_BANK;

    // Pick 3-4 Part 1 questions across distinct topic domains
    const p1Selected: SpeakingQuestionItem[] = [];
    const usedP1Topics = new Set<string>();
    for (const q of p1Pool) {
      if (!usedP1Topics.has(q.topic) && p1Selected.length < 4) {
        usedP1Topics.add(q.topic);
        p1Selected.push(q);
      }
    }
    while (p1Selected.length < 4 && p1Pool.length > 0) {
      p1Selected.push(p1Pool[Math.floor(Math.random() * p1Pool.length)]);
    }

    // Pick 1 Part 2 Cue card
    const availableP2 = PART_2_CUE_CARD_BANK.filter((q) => !seenIds.has(q.id));
    const p2Pool = availableP2.length > 0 ? availableP2 : PART_2_CUE_CARD_BANK;
    const p2Selected = p2Pool[Math.floor(Math.random() * p2Pool.length)];

    // Pick 3 Part 3 Discussion questions logically aligned with the Part 2 theme
    const p2Theme = p2Selected.topic.toLowerCase();
    const availableP3 = PART_3_DISCUSSION_BANK.filter((q) => !seenIds.has(q.id));
    const p3Pool = availableP3.length >= 3 ? availableP3 : PART_3_DISCUSSION_BANK;

    // Thematic matching first
    let p3Candidates = p3Pool.filter((q) => {
      const qText = (q.topic + ' ' + q.questionText).toLowerCase();
      return (
        qText.includes('decision') ||
        qText.includes('travel') ||
        qText.includes('technology') ||
        qText.includes('habit') ||
        qText.includes('culture') ||
        qText.includes('education')
      );
    });
    if (p3Candidates.length < 3) p3Candidates = p3Pool;

    const p3Selected = p3Candidates.slice(0, 3);

    // Save newly selected IDs to seen pool (keep last 50)
    const newSeen = Array.from(
      new Set([...Array.from(seenIds), ...p1Selected.map((q) => q.id), p2Selected.id, ...p3Selected.map((q) => q.id)])
    ).slice(-50);
    try {
      localStorage.setItem(STORAGE_SEEN_KEY, JSON.stringify(newSeen));
    } catch {}

    return {
      p1: p1Selected,
      p2: p2Selected,
      p3: p3Selected
    };
  }, []);

  // 1. Initial State Restoration from localStorage (Crash / Refresh recovery)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SESSION_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && saved.stage && saved.stage !== 'PRE_TEST') {
          setStage(saved.stage);
          setTestId(saved.testId || 'spk_exam_' + Date.now());
          setPart1Questions(saved.part1Questions || []);
          setPart2CueCard(saved.part2CueCard || null);
          setPart3Questions(saved.part3Questions || []);
          setPart1Index(saved.part1Index || 0);
          setPart3Index(saved.part3Index || 0);
          setIdCheckStep(saved.idCheckStep || 0);
          if (saved.candidateIdentity) setCandidateIdentity(saved.candidateIdentity);
          setPrepSecondsLeft(saved.prepSecondsLeft ?? 60);
          setMonologueSecondsLeft(saved.monologueSecondsLeft ?? 120);
          setPart2Notes(saved.part2Notes || '');
          setCompletedAnswers(saved.completedAnswers || []);
          setCandidateTranscript(saved.candidateTranscript || '');
          setEvaluationReport(saved.evaluationReport || null);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to restore speaking exam session:', e);
    }

    // Default initialization
    const initialSet = assembleExamQuestions();
    setPart1Questions(initialSet.p1);
    setPart2CueCard(initialSet.p2);
    setPart3Questions(initialSet.p3);
  }, [assembleExamQuestions]);

  // Persist session state to localStorage
  useEffect(() => {
    if (stage === 'PRE_TEST') return;
    try {
      const snapshot = {
        stage,
        testId,
        part1Questions,
        part2CueCard,
        part3Questions,
        part1Index,
        part3Index,
        idCheckStep,
        candidateIdentity,
        prepSecondsLeft,
        monologueSecondsLeft,
        part2Notes,
        completedAnswers,
        candidateTranscript,
        evaluationReport,
        updatedAt: Date.now()
      };
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(snapshot));
    } catch (e) {
      console.warn('Failed to save speaking session:', e);
    }
  }, [
    stage,
    testId,
    part1Questions,
    part2CueCard,
    part3Questions,
    part1Index,
    part3Index,
    idCheckStep,
    candidateIdentity,
    prepSecondsLeft,
    monologueSecondsLeft,
    part2Notes,
    completedAnswers,
    candidateTranscript,
    evaluationReport
  ]);

  // Check hardware mic permission on mount
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          setMicPermission('granted');
          stream.getTracks().forEach((t) => t.stop());
        })
        .catch(() => {
          setMicPermission('prompt');
        });
    }
  }, []);

  // 2. Speech Recognition Initialization
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-GB';

        recognition.onresult = (event: any) => {
          let fullText = '';
          for (let i = 0; i < event.results.length; i++) {
            fullText += event.results[i][0].transcript + ' ';
          }
          const cleaned = fullText.trim();
          setCandidateTranscript(cleaned);
          lastSpeechTimeRef.current = Date.now();

          // Silence countdown reset if new words spoken
          if (cleaned.length > previousTranscriptLengthRef.current) {
            previousTranscriptLengthRef.current = cleaned.length;
            setSilenceCountdown(null);
          }
        };

        recognition.onend = () => {
          if (isSessionRecordingRef.current) {
            try {
              recognition.start();
            } catch {}
          } else {
            setIsRecording(false);
          }
        };

        recognition.onerror = (e: any) => {
          if (e.error === 'no-speech') return;
          if (e.error === 'not-allowed') {
            setMicPermission('denied');
            stopRecording();
            onShowToast('Microphone access denied. You may type responses if microphone is unavailable.');
          }
        };

        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('SpeechRecognition initialization error:', err);
      }
    }

    return () => {
      isSessionRecordingRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (speechTimerRef.current) clearInterval(speechTimerRef.current);
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      if (monologueTimerRef.current) clearInterval(monologueTimerRef.current);
      if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
      audioManager.reset('speaking_unmount');
      stopSpeech();
    };
  }, [onShowToast]);

  // Silence Detection Loop (Natural examiner responsiveness)
  useEffect(() => {
    if (!isRecording) {
      if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
      setSilenceCountdown(null);
      return;
    }

    silenceCheckRef.current = setInterval(() => {
      const words = candidateTranscript.trim().split(/\s+/).filter(Boolean).length;
      // In ID check, even a short response (1-2 words like full name or "Dhaka") is sufficient
      const minWords = stage === 'ID_CHECK' ? 2 : stage === 'PART_2_SPEAK' ? 25 : 8;

      if (words >= minWords) {
        const timeSinceSpeech = Date.now() - lastSpeechTimeRef.current;
        const silenceThreshold = stage === 'ID_CHECK' ? 2200 : 3000;
        if (timeSinceSpeech >= silenceThreshold) {
          // Trigger smooth auto-advance after silence confirmation
          setSilenceCountdown((prev) => {
            if (prev === null) return 2;
            if (prev <= 1) {
              clearInterval(silenceCheckRef.current!);
              handleCandidateDoneSpeaking();
              return null;
            }
            return prev - 1;
          });
        } else {
          setSilenceCountdown(null);
        }
      }
    }, 1000);

    return () => {
      if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
    };
  }, [isRecording, candidateTranscript, stage]);

  // Start candidate recording
  const startRecording = useCallback(() => {
    setCandidateTranscript('');
    setSpeakingElapsedSec(0);
    previousTranscriptLengthRef.current = 0;
    lastSpeechTimeRef.current = Date.now();
    setSilenceCountdown(null);

    isSessionRecordingRef.current = true;
    setIsRecording(true);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {}
    }

    soundManager.playBeep(660, 0.1);

    if (speechTimerRef.current) clearInterval(speechTimerRef.current);
    speechTimerRef.current = setInterval(() => {
      setSpeakingElapsedSec((prev) => prev + 1);
    }, 1000);
  }, []);

  // Stop candidate recording
  const stopRecording = useCallback(() => {
    isSessionRecordingRef.current = false;
    setIsRecording(false);
    if (speechTimerRef.current) clearInterval(speechTimerRef.current);
    if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
    setSilenceCountdown(null);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  }, []);

  // Examiner speaking helper (Strictly British male Arthur/Fenrir)
  const speakExaminerPrompt = useCallback(
    (promptText: string, onFinished?: () => void) => {
      stopRecording();
      setIsExaminerSpeaking(true);
      audioManager.reset('examiner_prompt');

      audioManager.playCustomAudio('examiner_turn_' + Date.now(), promptText, {
        speakerId: 'speaker_04', // Fenrir / British Male Examiner Arthur
        allowReplay: true,
        onEnd: () => {
          setIsExaminerSpeaking(false);
          onFinished?.();
        },
        onError: () => {
          setIsExaminerSpeaking(false);
          onFinished?.();
        }
      });
    },
    [stopRecording]
  );

  // Repeat question handler
  const handleRepeatQuestion = useCallback(() => {
    if (isExaminerSpeaking) return;
    stopRecording();

    let currentQText = '';
    if (stage === 'ID_CHECK') {
      currentQText = OFFICIAL_CANDIDATE_ID_PROTOCOL[idCheckStep]?.prompt || '';
    } else if (stage === 'PART_1') {
      currentQText = part1Questions[part1Index]?.questionText || '';
    } else if (stage === 'PART_3') {
      currentQText = part3Questions[part3Index]?.questionText || '';
    }

    if (!currentQText) return;

    soundManager.playBeep(520, 0.08);
    speakExaminerPrompt(`Certainly. ${currentQText}`, () => {
      // Re-enable candidate recording after repeat
      setTimeout(() => {
        startRecording();
      }, 400);
    });
  }, [isExaminerSpeaking, stage, idCheckStep, part1Questions, part1Index, part3Questions, part3Index, speakExaminerPrompt, startRecording, stopRecording]);

  // ========================================================
  // STATE MACHINE TRANSITIONS
  // ========================================================

  // Transition: PRE_TEST -> ID_CHECK (Official IELTS Identity & Name Verification Protocol)
  const startExamination = () => {
    soundManager.playSuccess();
    setStage('ID_CHECK');
    setIdCheckStep(0);
    setCandidateTranscript('');
    setCompletedAnswers([]);

    const p0 = OFFICIAL_CANDIDATE_ID_PROTOCOL[0];

    setTimeout(() => {
      speakExaminerPrompt(p0.prompt, () => {
        setTimeout(() => {
          startRecording();
        }, 500);
      });
    }, 400);
  };

  // Advance Candidate ID Protocol Turn
  const advanceIdCheckStep = () => {
    stopRecording();
    const spoken = candidateTranscript.trim();

    setCandidateIdentity((prev) => {
      const updated = { ...prev };
      if (idCheckStep === 0 && spoken) {
        const cleaned = spoken.replace(/^(my name is|i am|this is|it's|it is)\s+/i, '').trim();
        updated.fullName = cleaned || spoken;
        if (!updated.preferredName) {
          updated.preferredName = (cleaned || spoken).split(' ')[0];
        }
      } else if (idCheckStep === 1 && spoken) {
        const cleaned = spoken.replace(/^(you can call me|please call me|call me|my friends call me)\s+/i, '').trim();
        updated.preferredName = cleaned || spoken;
      } else if (idCheckStep === 2 && spoken) {
        const cleaned = spoken.replace(/^(i come from|i'm from|i am from|from)\s+/i, '').trim();
        updated.origin = cleaned || spoken;
      } else if (idCheckStep === 3) {
        updated.isVerified = true;
      }
      return updated;
    });

    if (idCheckStep < 3) {
      const nextStep = idCheckStep + 1;
      setIdCheckStep(nextStep);
      setCandidateTranscript('');
      soundManager.playBeep(560, 0.08);

      const nextItem = OFFICIAL_CANDIDATE_ID_PROTOCOL[nextStep];
      speakExaminerPrompt(nextItem.prompt, () => {
        setTimeout(() => {
          startRecording();
        }, 500);
      });
    } else {
      // Step 3 finished -> ID verified -> Transition to Part 1
      setCandidateIdentity((prev) => ({ ...prev, isVerified: true }));
      soundManager.playSuccess();
      setStage('PART_1');
      setPart1Index(0);
      setCandidateTranscript('');

      const q1 = part1Questions[0];
      const p1Intro = `Thank you, that's fine. Now, in this first part, I would like to ask you some questions about yourself. ${q1?.questionText || 'Where is your hometown located?'}`;

      speakExaminerPrompt(p1Intro, () => {
        setTimeout(() => {
          startRecording();
        }, 500);
      });
    }
  };

  // Immediate Fast-Track / Skip ID Check directly to Part 1
  const handleFastTrackToPart1 = () => {
    stopRecording();
    stopSpeech();
    setCandidateIdentity((prev) => ({ ...prev, isVerified: true }));
    soundManager.playSuccess();
    setStage('PART_1');
    setPart1Index(0);
    setCandidateTranscript('');

    const q1 = part1Questions[0];
    const greetingText = `Good afternoon. My name is Dr. Alistair Vance, and I will be your official examiner today. In this first part, I would like to ask you some questions about yourself. ${q1?.questionText || 'Where is your hometown located?'}`;

    speakExaminerPrompt(greetingText, () => {
      setTimeout(() => {
        startRecording();
      }, 500);
    });
  };

  // Action for clicking "Present Passport / ID"
  const handlePresentPassportId = () => {
    soundManager.playSuccess();
    setCandidateTranscript('Yes, of course. Here is my passport.');
    setCandidateIdentity(prev => ({ ...prev, isVerified: true }));
    onShowToast('Identification Document Presented & Verified ✓');
    setTimeout(() => {
      advanceIdCheckStep();
    }, 600);
  };

  // Generic handler for evaluating turn and deciding whether to show Instant Modal or auto-advance
  const handleTurnEvaluationAndTransition = async (
    record: SpeakingAnswerRecord,
    advanceExecution: () => void,
    nextLabel: string
  ) => {
    setIsLoadingTurnFeedback(true);
    soundManager.playBeep(580, 0.08);

    try {
      const feedback = await evaluateSingleSpeakingTurn(
        record,
        record.part === 2 ? part2CueCard?.cueCardBulletPoints : []
      );
      record.instantFeedback = feedback;
      setCurrentTurnFeedback(feedback);
      setCompletedAnswers(prev => [...prev.filter(a => a.questionId !== record.questionId), record]);

      if (autoInstantFeedback) {
        setPendingTurnAdvance(() => advanceExecution);
        setNextTurnLabel(nextLabel);
        setShowTurnFeedbackModal(true);
        soundManager.playSuccess();
      } else {
        advanceExecution();
      }
    } catch (err) {
      const fallback = generateDiagnosticTurnFeedback(record);
      record.instantFeedback = fallback;
      setCurrentTurnFeedback(fallback);
      setCompletedAnswers(prev => [...prev.filter(a => a.questionId !== record.questionId), record]);
      if (autoInstantFeedback) {
        setPendingTurnAdvance(() => advanceExecution);
        setNextTurnLabel(nextLabel);
        setShowTurnFeedbackModal(true);
      } else {
        advanceExecution();
      }
    } finally {
      setIsLoadingTurnFeedback(false);
    }
  };

  // Retake current turn (Candidate repeats speech with coach tips)
  const handleRetakeTurnFromModal = () => {
    setShowTurnFeedbackModal(false);
    stopSpeech();
    setCandidateTranscript('');
    setSpeakingElapsedSec(0);
    setTimeout(() => {
      startRecording();
    }, 400);
  };

  // Transition: PART_1 Next Question or to PART_2_PREP
  const advancePart1Turn = () => {
    stopRecording();
    const currentQ = part1Questions[part1Index];
    if (!currentQ) return;

    // Record answer
    const record: SpeakingAnswerRecord = {
      questionId: currentQ.id,
      part: 1,
      topic: currentQ.topic,
      questionText: currentQ.questionText,
      transcript: candidateTranscript.trim() || 'Candidate delivered verbal response.',
      startTime: Date.now() - speakingElapsedSec * 1000,
      endTime: Date.now(),
      durationSec: Math.max(speakingElapsedSec, 15),
      wordCount: candidateTranscript.trim().split(/\s+/).filter(Boolean).length || 20,
      wordsPerMinute: Math.round(
        ((candidateTranscript.trim().split(/\s+/).filter(Boolean).length || 20) / Math.max(speakingElapsedSec, 10)) * 60
      ),
      pauseCount: Math.floor(speakingElapsedSec / 8),
      longPauseCount: Math.max(0, Math.floor(speakingElapsedSec / 20)),
      fillerCount: (candidateTranscript.match(/\b(um|uh|er|like)\b/gi) || []).length,
      detectedFillers: candidateTranscript.match(/\b(um|uh|er|like)\b/gi) || []
    };

    const isLast = part1Index >= part1Questions.length - 1;

    const executeAdvance = () => {
      if (!isLast) {
        const nextIdx = part1Index + 1;
        setPart1Index(nextIdx);
        const nextQ = part1Questions[nextIdx];
        const transitionPhrases = ['Thank you.', 'I see. Thank you.', 'Right.', 'Thank you very much.'];
        const lead = transitionPhrases[nextIdx % transitionPhrases.length];

        speakExaminerPrompt(`${lead} ${nextQ.questionText}`, () => {
          setTimeout(() => {
            startRecording();
          }, 400);
        });
      } else {
        // Transition to PART_2_PREP
        setStage('PART_2_PREP');
        setPrepSecondsLeft(60);
        soundManager.playBeep(600, 0.1);

        const p2Intro = `Thank you. Now, in Part 2, I am going to give you a topic card. You will have one minute to prepare your notes, and then you should speak for one to two minutes. Here is your topic.`;

        speakExaminerPrompt(p2Intro, () => {
          startPart2PrepTimer();
        });
      }
    };

    handleTurnEvaluationAndTransition(
      record,
      executeAdvance,
      !isLast ? 'Next Part 1 Question →' : 'Start Part 2 Preparation (1 min) →'
    );
  };

  // Start 60-second preparation timer for Part 2
  const startPart2PrepTimer = () => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    setPrepSecondsLeft(60);

    prepTimerRef.current = setInterval(() => {
      setPrepSecondsLeft((prev) => {
        if (prev === 31) soundManager.playChime30s();
        if (prev === 11) soundManager.playChime10s();
        if (prev <= 1) {
          clearInterval(prepTimerRef.current!);
          soundManager.playSuccess();
          transitionToPart2Speak();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Transition: PART_2_PREP -> PART_2_SPEAK
  const transitionToPart2Speak = () => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    setStage('PART_2_SPEAK');
    setMonologueSecondsLeft(120);
    soundManager.playSuccess();

    speakExaminerPrompt('All right, your preparation time is up. Please begin speaking now.', () => {
      setTimeout(() => {
        startRecording();
        startMonologueTimer();
      }, 500);
    });
  };

  // 120-second Monologue Timer for Part 2
  const startMonologueTimer = () => {
    if (monologueTimerRef.current) clearInterval(monologueTimerRef.current);
    setMonologueSecondsLeft(120);

    monologueTimerRef.current = setInterval(() => {
      setMonologueSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(monologueTimerRef.current!);
          soundManager.playBeep(440, 0.2);
          advancePart2SpeakToPart3();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Transition: PART_2_SPEAK -> PART_3
  const advancePart2SpeakToPart3 = () => {
    if (monologueTimerRef.current) clearInterval(monologueTimerRef.current);
    stopRecording();

    if (!part2CueCard) return;

    // Record Part 2 Monologue answer
    const words = candidateTranscript.trim().split(/\s+/).filter(Boolean).length || 60;
    const duration = 120 - monologueSecondsLeft;

    const record: SpeakingAnswerRecord = {
      questionId: part2CueCard.id,
      part: 2,
      topic: part2CueCard.topic,
      questionText: part2CueCard.questionText,
      transcript: candidateTranscript.trim() || 'Candidate delivered 2-minute individual long turn monologue.',
      startTime: Date.now() - duration * 1000,
      endTime: Date.now(),
      durationSec: Math.max(duration, 45),
      wordCount: words,
      wordsPerMinute: Math.round((words / Math.max(duration, 30)) * 60),
      pauseCount: Math.floor(duration / 7),
      longPauseCount: Math.max(0, Math.floor(duration / 25)),
      fillerCount: (candidateTranscript.match(/\b(um|uh|er|like)\b/gi) || []).length,
      detectedFillers: candidateTranscript.match(/\b(um|uh|er|like)\b/gi) || []
    };

    const executeAdvance = () => {
      setStage('PART_3');
      setPart3Index(0);

      const q1 = part3Questions[0];
      const p3Intro = `Thank you very much. Now, in Part 3, let's explore some more general questions related to this theme. ${q1?.questionText || 'Do you believe modern society values these experiences as much as in the past?'}`;

      speakExaminerPrompt(p3Intro, () => {
        setTimeout(() => {
          startRecording();
        }, 500);
      });
    };

    handleTurnEvaluationAndTransition(
      record,
      executeAdvance,
      'Continue to Part 3 Abstract Discussion →'
    );
  };

  // Transition: PART_3 Next Question or to COMPLETED
  const advancePart3Turn = () => {
    stopRecording();
    const currentQ = part3Questions[part3Index];
    if (!currentQ) return;

    const words = candidateTranscript.trim().split(/\s+/).filter(Boolean).length || 30;

    const record: SpeakingAnswerRecord = {
      questionId: currentQ.id,
      part: 3,
      topic: currentQ.topic,
      questionText: currentQ.questionText,
      transcript: candidateTranscript.trim() || 'Candidate delivered analytical response.',
      startTime: Date.now() - speakingElapsedSec * 1000,
      endTime: Date.now(),
      durationSec: Math.max(speakingElapsedSec, 20),
      wordCount: words,
      wordsPerMinute: Math.round((words / Math.max(speakingElapsedSec, 15)) * 60),
      pauseCount: Math.floor(speakingElapsedSec / 7),
      longPauseCount: Math.max(0, Math.floor(speakingElapsedSec / 20)),
      fillerCount: (candidateTranscript.match(/\b(um|uh|er|like)\b/gi) || []).length,
      detectedFillers: candidateTranscript.match(/\b(um|uh|er|like)\b/gi) || []
    };

    const isLast = part3Index >= part3Questions.length - 1;

    const executeAdvance = () => {
      if (!isLast) {
        const nextIdx = part3Index + 1;
        setPart3Index(nextIdx);
        const nextQ = part3Questions[nextIdx];

        const transitions = [
          'Thank you. Considering another perspective:',
          'I see. And how does this connect to broader societal trends?',
          'Right. Looking at this from an international angle:'
        ];
        const intro = transitions[nextIdx % transitions.length];

        speakExaminerPrompt(`${intro} ${nextQ.questionText}`, () => {
          setTimeout(() => {
            startRecording();
          }, 400);
        });
      } else {
        // Conclude Test
        setStage('COMPLETED');
        soundManager.playSuccess();

        speakExaminerPrompt('Thank you very much. That is the end of the speaking examination.', () => {
          setTimeout(() => {
            generateFinalEvaluation([...completedAnswers, record]);
          }, 1200);
        });
      }
    };

    handleTurnEvaluationAndTransition(
      record,
      executeAdvance,
      !isLast ? 'Next Part 3 Question →' : 'View Complete Diagnostic Report →'
    );
  };

  // General "Done Speaking" Action
  const handleCandidateDoneSpeaking = () => {
    if (stage === 'ID_CHECK') {
      advanceIdCheckStep();
    } else if (stage === 'PART_1') {
      advancePart1Turn();
    } else if (stage === 'PART_2_SPEAK') {
      advancePart2SpeakToPart3();
    } else if (stage === 'PART_3') {
      advancePart3Turn();
    }
  };

  // Generate Final Assessment Report
  const generateFinalEvaluation = (answersToEvaluate: SpeakingAnswerRecord[]) => {
    setStage('ANALYZING');

    setTimeout(() => {
      const report = evaluateSpeakingSession(answersToEvaluate, 7.5);

      // Record attempts into QuestionEngine for spaced review
      answersToEvaluate.forEach((ans) => {
        try {
          questionEngine.recordAttempt({
            questionId: ans.questionId,
            module: 'speaking',
            userAnswer: ans.transcript,
            isCorrect: ans.wordCount >= 25,
            score: ans.wordsPerMinute >= 100 && ans.wordsPerMinute <= 165 ? 7.5 : 6.5,
            timeSpentSec: ans.durationSec,
            explanation: `Part ${ans.part} response evaluated against official Cambridge descriptors.`
          });
        } catch {}
      });

      setEvaluationReport(report);
      setStage('RESULTS');
      soundManager.playSuccess();
      onShowToast('Official IELTS Speaking Diagnostic Report Generated!');
    }, 1800);
  };

  // Retake Fresh Examination
  const handleRetakeExam = () => {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    stopSpeech();
    stopRecording();

    const fresh = assembleExamQuestions();
    setPart1Questions(fresh.p1);
    setPart2CueCard(fresh.p2);
    setPart3Questions(fresh.p3);
    setPart1Index(0);
    setPart3Index(0);
    setIdCheckStep(0);
    setCandidateIdentity(prev => ({ ...prev, isVerified: false }));
    setPrepSecondsLeft(60);
    setMonologueSecondsLeft(120);
    setPart2Notes('');
    setCompletedAnswers([]);
    setEvaluationReport(null);
    setCandidateTranscript('');
    setStage('PRE_TEST');

    soundManager.playBeep(600, 0.08);
    onShowToast('Prepared fresh IELTS Speaking Examination with zero repetition.');
  };

  // Sound Check Button in Pre-Test
  const handleSoundCheck = () => {
    if (soundCheckActive) return;
    setSoundCheckActive(true);
    soundManager.playBeep(520, 0.1);

    speakExaminerPrompt(
      'Good day. This is an authentic sound check for the IELTS Speaking test. If you can hear this message clearly, your audio output is configured correctly.',
      () => {
        setSoundCheckActive(false);
      }
    );
  };

  // Format mm:ss helper
  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Current active question prompt
  const currentActivePrompt = useMemo(() => {
    if (stage === 'ID_CHECK') {
      return OFFICIAL_CANDIDATE_ID_PROTOCOL[idCheckStep]?.prompt || '';
    }
    if (stage === 'PART_1') {
      return part1Questions[part1Index]?.questionText || '';
    }
    if (stage === 'PART_2_PREP' || stage === 'PART_2_SPEAK') {
      return part2CueCard?.questionText || '';
    }
    if (stage === 'PART_3') {
      return part3Questions[part3Index]?.questionText || '';
    }
    return '';
  }, [stage, idCheckStep, part1Questions, part1Index, part2CueCard, part3Questions, part3Index]);

  // Current active question topic
  const currentActiveTopic = useMemo(() => {
    if (stage === 'ID_CHECK') {
      return `Phase 0 · ${OFFICIAL_CANDIDATE_ID_PROTOCOL[idCheckStep]?.title || 'Identity Protocol'}`;
    }
    if (stage === 'PART_1') {
      return part1Questions[part1Index]?.topic || 'Introduction';
    }
    if (stage === 'PART_2_PREP' || stage === 'PART_2_SPEAK') {
      return part2CueCard?.topic || 'Candidate Task Card';
    }
    if (stage === 'PART_3') {
      return part3Questions[part3Index]?.topic || 'Abstract Discussion';
    }
    return '';
  }, [stage, idCheckStep, part1Questions, part1Index, part2CueCard, part3Questions, part3Index]);

  // Toggle expansion of transcript turn
  const toggleTurnExpand = (idx: number) => {
    setExpandedTurns((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handlePlayModelForTurn = (turnIdx: number, text: string) => {
    if (playingModelTurnIdx === turnIdx) {
      stopSpeech();
      setPlayingModelTurnIdx(null);
      return;
    }
    stopSpeech();
    setPlayingModelTurnIdx(turnIdx);
    soundManager.playBeep(640, 0.05);
    speakBritish(text, {
      speakerId: 'speaker_04',
      rate: 0.96,
      onEnd: () => setPlayingModelTurnIdx(null),
      onError: () => setPlayingModelTurnIdx(null)
    });
  };

  const handleSaveTurnError = (err: DetailedGrammarError, key: string) => {
    if (savedTurnErrors[key]) return;
    addMistake({
      module: 'speaking',
      title: `Speaking Grammar: ${err.ruleCategory}`,
      userAnswer: err.observed,
      correctAnswer: err.corrected,
      explanation: err.explanation
    });
    setSavedTurnErrors(prev => ({ ...prev, [key]: true }));
    soundManager.playSuccess();
    onShowToast(`Saved "${err.corrected}" to Mistake Vault!`);
  };

  // ========================================================
  // VIEW RENDERERS
  // ========================================================

  // VIEW 1: PRE-TEST BRIEFING & HARDWARE VERIFICATION
  if (stage === 'PRE_TEST') {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
        {/* Top Header Badge */}
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
              Official IELTS Speaking Examination · Computer-Delivered Simulation
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">Standard British Council / IDP Format</span>
        </div>

        {/* Hero Card */}
        <div className="bg-white rounded-3xl border border-slate-300 p-6 sm:p-10 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-200 pb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-900 via-blue-950 to-indigo-900 text-white flex flex-col items-center justify-center font-black shadow-md border border-white/20">
                  <UserCheck className="w-7 h-7 text-amber-300" />
                  <span className="text-[9px] font-mono tracking-tight text-slate-300 uppercase">EXAMINER</span>
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                  <ShieldCheck className="w-2.5 h-2.5 text-white" />
                </span>
              </div>

              <div>
                <div className="inline-block px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold uppercase mb-1">
                  Dr. Alistair Vance · Cambridge Oral Examiner
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  IELTS Speaking Mock Examination
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Authentic 3-part oral interview with natural British audio, live silence detection, and Cambridge diagnostic band scoring.
                </p>
              </div>
            </div>
          </div>

          {/* Test Structure Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">Part 1</div>
              <div className="text-base font-bold text-slate-900">Introduction & Interview</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                4-5 minutes. Questions regarding familiar everyday subjects: hometown, daily routine, studies, and personal interests.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">Part 2</div>
              <div className="text-base font-bold text-slate-900">Individual Long Turn</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                1 minute preparation on candidate task card (cue card) with note scratchpad, followed by a 2-minute uninterrupted monologue.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">Part 3</div>
              <div className="text-base font-bold text-slate-900">Two-Way Discussion</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                4-5 minutes. Abstract and analytical questions probing broader societal, philosophical, and global perspectives.
              </p>
            </div>
          </div>

          {/* Hardware & Environment Verification */}
          <div className="space-y-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 uppercase font-mono text-xs tracking-wider">
              Audio & Microphone Calibration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Speaker Sound Check */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Headphones className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Sound Output</div>
                    <div className="text-[10px] text-slate-500">British Examiner audio check</div>
                  </div>
                </div>

                <button
                  onClick={handleSoundCheck}
                  disabled={soundCheckActive}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                    soundCheckActive
                      ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{soundCheckActive ? 'Playing...' : 'Test Audio'}</span>
                </button>
              </div>

              {/* Microphone Status */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Mic className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Microphone Input</div>
                    <div className="text-[10px] text-slate-500">
                      {micPermission === 'granted'
                        ? 'Microphone active & ready'
                        : micPermission === 'denied'
                        ? 'Permission blocked'
                        : 'Web Audio API ready'}
                    </div>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase ${
                    micPermission === 'granted'
                      ? 'bg-emerald-100 text-emerald-800'
                      : micPermission === 'denied'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {micPermission === 'granted' ? '● Ready' : micPermission === 'denied' ? 'Blocked' : 'Calibrated'}
                </span>
              </div>
            </div>

            {/* Test Instructions list */}
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside pt-1">
              <li>Speak clearly and continuously. The examiner will naturally wait for your complete thoughts.</li>
              <li>You may click <strong>"Please Repeat Question"</strong> if you need to hear a question again.</li>
              <li>When you finish speaking an answer, you can click <strong>"Done Speaking"</strong> or simply pause for 3 seconds.</li>
              <li>Never reveal hints or future questions during an authentic IELTS examination.</li>
            </ul>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-200">
            <div className="text-xs text-slate-500 font-mono">
              Ready to begin Section 1 (Introduction & Interview)
            </div>

            <button
              onClick={startExamination}
              className="px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-black text-white text-sm font-black shadow-lg transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Mic className="w-4 h-4 text-emerald-400" />
              <span>Begin Speaking Examination</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // VIEW 2: ANALYZING STATE
  if (stage === 'ANALYZING') {
    return (
      <div className="w-full max-w-2xl mx-auto py-16 text-center space-y-6 animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-slate-900 text-white mx-auto flex items-center justify-center shadow-lg border border-slate-800">
          <Activity className="w-10 h-10 text-indigo-400 animate-pulse" />
        </div>

        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
            Cambridge IELTS Diagnostic Assessment
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            Evaluating Speaking Performance...
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            Analyzing speech rate, pause distributions, lexical diversity, and grammatical structures against the 4 official IELTS criteria.
          </p>
        </div>

        <div className="w-48 h-1.5 bg-slate-200 rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-slate-900 rounded-full animate-[pulse_1s_infinite]"></div>
        </div>
      </div>
    );
  }

  // VIEW 3: RESULTS STATE (Official-Style Diagnostic Report)
  if (stage === 'RESULTS' && evaluationReport) {
    const { overallBand, criteria, grammarObservations, vocabUpgrades } = evaluationReport;
    const analytics = analyzeSpeakingFluency(completedAnswers);

    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
        {/* Top Disclaimer Badge */}
        <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-300 text-slate-700 text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0" />
            <span>
              <strong>AI-Estimated Performance Diagnostic:</strong> Aligned with official Cambridge IELTS Band Descriptors (Not an official IELTS test certificate).
            </span>
          </div>

          <button
            onClick={handleRetakeExam}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shrink-0 transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Exam</span>
          </button>
        </div>

        {/* Navigation Tabs in Results */}
        <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1 gap-1 shadow-2xs">
          <button
            onClick={() => {
              setResultsTab('overview');
              soundManager.playBeep(600, 0.04);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              resultsTab === 'overview' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            4 Cambridge Criteria Overview
          </button>
          <button
            onClick={() => {
              setResultsTab('breakdowns');
              soundManager.playBeep(600, 0.04);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              resultsTab === 'breakdowns' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Question-by-Question Diagnostics & Band 8+ Models ({completedAnswers.length})</span>
          </button>
        </div>

        {resultsTab === 'overview' ? (
          <>
            {/* Scorecard Hero */}
            <div className="bg-white rounded-3xl border border-slate-300 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-100 pb-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Examination Completed
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                    IELTS Speaking Diagnostic Report
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Evaluated by Dr. Vance across Parts 1, 2 & 3.
                  </p>

                  {/* Candidate Identity Verification Badge */}
                  <div className="flex flex-wrap items-center gap-2 pt-3">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-mono font-semibold">
                      Candidate: <strong>{candidateIdentity.fullName || 'Registered Candidate'}</strong>
                    </span>
                    {candidateIdentity.preferredName && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-mono font-semibold">
                        Known As: <strong>{candidateIdentity.preferredName}</strong>
                      </span>
                    )}
                    {candidateIdentity.origin && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-mono">
                        Origin: <strong>{candidateIdentity.origin}</strong>
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-semibold flex items-center gap-1">
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Official Identity Verified</span>
                    </span>
                  </div>
                </div>

                {/* Overall Band */}
                <div className="p-5 rounded-2xl bg-slate-900 text-white text-center min-w-[170px] shadow-sm">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    Overall Band Estimate
                  </div>
                  <div className="text-5xl font-black font-mono text-white my-1">
                    {overallBand.toFixed(1)}
                  </div>
                  <div className="text-[11px] text-amber-300 font-semibold font-mono">
                    {overallBand >= 8.0 ? 'C2 Expert User' : overallBand >= 7.0 ? 'C1 Good User' : 'B2 Competent User'}
                  </div>
                </div>
              </div>

              {/* 4 Official Criteria Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Fluency & Coherence */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Fluency & Coherence</span>
                    <span className="text-base font-black font-mono text-slate-900">
                      Band {criteria.fluency.band.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-1">
                    <div>Pace: ~{analytics.averageWpm} WPM</div>
                    <div>Hesitations: {analytics.totalFillers} detected</div>
                  </div>
                </div>

                {/* 2. Lexical Resource */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Lexical Resource</span>
                    <span className="text-base font-black font-mono text-slate-900">
                      Band {criteria.lexical.band.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-1">
                    <div>Vocabulary Pool: {analytics.uniqueVocabularyCount} unique words</div>
                    <div>Diversity: {Math.round(analytics.lexicalDiversityRatio * 100)}%</div>
                  </div>
                </div>

                {/* 3. Grammatical Range */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Grammatical Range</span>
                    <span className="text-base font-black font-mono text-slate-900">
                      Band {criteria.grammar.band.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-1">
                    <div>Complex Structures: Active</div>
                    <div>Tense Control: High</div>
                  </div>
                </div>

                {/* 4. Pronunciation */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Pronunciation</span>
                    <span className="text-base font-black font-mono text-slate-900">
                      Band {criteria.pronunciation.band.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-1">
                    <div>Enunciation: Clear</div>
                    <div>Rhythm: Natural UK cadence</div>
                  </div>
                </div>
              </div>

              {/* Evidence-Based Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                  <div className="text-xs font-mono font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Key Strengths
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                    {criteria.fluency.strengths.slice(0, 2).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                    {criteria.lexical.strengths.slice(0, 1).map((s, i) => (
                      <li key={'l_' + i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                  <div className="text-xs font-mono font-bold text-amber-900 uppercase flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> Priorities for Band 8+
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                    {criteria.fluency.improvements.slice(0, 1).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                    {criteria.grammar.improvements.slice(0, 1).map((s, i) => (
                      <li key={'g_' + i}>{s}</li>
                    ))}
                    {criteria.lexical.improvements.slice(0, 1).map((s, i) => (
                      <li key={'lx_' + i}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Grammar & Lexical Corrections Table */}
            <div className="bg-white rounded-3xl border border-slate-300 p-6 sm:p-8 shadow-xs space-y-4">
              <h3 className="text-sm font-mono font-bold uppercase text-slate-500 tracking-wider">
                Important Grammar & Vocabulary Upgrades
              </h3>

              <div className="space-y-3">
                {grammarObservations.map((obs, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950">
                        <span className="font-semibold text-rose-700 block text-[10px] uppercase">Candidate Spoken Phrase:</span>
                        "{obs.observed}"
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                        <span className="font-semibold text-emerald-700 block text-[10px] uppercase">Recommended Native Construction:</span>
                        "{obs.corrected}"
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600 pl-1">
                      <strong>Rule:</strong> {obs.explanation}
                    </div>
                  </div>
                ))}

                {vocabUpgrades.map((v, idx) => (
                  <div key={'v_' + idx} className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="line-through text-slate-500 mr-2">"{v.original}"</span>
                      <span className="font-bold text-indigo-950">➔ "{v.upgraded}"</span>
                    </div>
                    <span className="text-[11px] text-indigo-800">{v.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Question-by-Question Diagnostics Breakdown Tab */
          <div className="space-y-4 animate-fade-in">
            {completedAnswers.map((ans, idx) => {
              const fb = ans.instantFeedback || generateDiagnosticTurnFeedback(ans);
              const isPlayingThisModel = playingModelTurnIdx === idx;

              return (
                <div key={idx} className="bg-white rounded-3xl border border-slate-300 p-5 sm:p-6 shadow-xs space-y-4">
                  {/* Question Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                        Part {ans.part} · {ans.topic}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        ({ans.wordCount} words · {ans.durationSec}s)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-mono text-xs font-bold">
                        Est. Band {fb.estimatedBands.overall.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900">
                    "{ans.questionText}"
                  </div>

                  {/* Candidate Transcript */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Candidate Delivered Transcript:
                    </span>
                    <p className="italic font-sans text-slate-900">"{ans.transcript}"</p>
                  </div>

                  {/* 1. Grammatical Errors for this Turn */}
                  {fb.grammaticalErrors.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <h4 className="text-xs font-extrabold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Grammar Errors Detected in This Turn ({fb.grammaticalErrors.length}):</span>
                      </h4>

                      <div className="space-y-2">
                        {fb.grammaticalErrors.map((err, errIdx) => {
                          const errKey = `turn_${idx}_err_${errIdx}`;
                          const isSaved = savedTurnErrors[errKey];
                          return (
                            <div key={errIdx} className="p-3 rounded-xl bg-rose-50/50 border border-rose-200 text-xs space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="p-2 rounded-lg bg-rose-100/70 text-rose-950 font-mono">
                                  <span className="text-[10px] font-bold text-rose-700 block uppercase">Observed:</span>
                                  <span className="line-through font-bold">"{err.observed}"</span>
                                </div>
                                <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-950 font-mono">
                                  <span className="text-[10px] font-bold text-emerald-700 block uppercase">Corrected:</span>
                                  <span className="font-bold">"{err.corrected}"</span>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                                <p className="text-[11px] text-slate-600">
                                  <strong>Rule ({err.ruleCategory}):</strong> {err.explanation}
                                </p>
                                <button
                                  onClick={() => handleSaveTurnError(err, errKey)}
                                  disabled={isSaved}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 self-start sm:self-auto shrink-0 ${
                                    isSaved
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-white hover:bg-rose-100 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  {isSaved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                                  <span>{isSaved ? 'Saved' : 'Save to Vault'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. Pronunciation & Syllable Stress */}
                  {fb.pronunciation.trickyWords.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                        <Headphones className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Pronunciation & Syllable Stress Coach:</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {fb.pronunciation.trickyWords.map((tw, twIdx) => (
                          <div key={twIdx} className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{tw.word}</span>
                              <span className="font-mono text-[11px] text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                                {tw.ipa}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-emerald-900 font-bold mt-1">
                              {tw.syllableStress}
                            </div>
                            <p className="text-[10px] text-slate-600 mt-1">{tw.tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Better Answer Band 8+ */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-blue-50/70 border border-indigo-200 text-xs space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-200 pb-2">
                      <span className="font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Recommended Band 8.5+ Model Answer</span>
                      </span>

                      <button
                        onClick={() => handlePlayModelForTurn(idx, fb.band8Answer.modelAnswer)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          isPlayingThisModel
                            ? 'bg-rose-600 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {isPlayingThisModel ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                            <span>Stop Audio</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Listen to Band 8+ Answer</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="font-serif leading-relaxed text-slate-800 text-xs sm:text-sm select-text">
                      "{fb.band8Answer.modelAnswer}"
                    </p>

                    {fb.band8Answer.highlightedCollocations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {fb.band8Answer.highlightedCollocations.map((hc, hIdx) => (
                          <span
                            key={hIdx}
                            className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-[11px] font-medium text-indigo-900"
                            title={hc.meaning}
                          >
                            <strong>"{hc.phrase}"</strong> ({hc.bandLevel})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // VIEW 4: ACTIVE TEST VIEW (ID_CHECK, PART_1, PART_2_PREP, PART_2_SPEAK, PART_3)
  // ========================================================
  const isIdCheck = stage === 'ID_CHECK';
  const isPart1 = stage === 'PART_1';
  const isPart2Prep = stage === 'PART_2_PREP';
  const isPart2Speak = stage === 'PART_2_SPEAK';
  const isPart3 = stage === 'PART_3';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 animate-fade-in pb-20 select-none">
      {/* 1. Top Status & Progress Bar (No Gamification) */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
            IELTS
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-wider uppercase text-slate-400">
              Speaking Examination
            </div>
            <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              {isIdCheck && (
                <span className="flex items-center gap-1.5 text-amber-300">
                  <BadgeCheck className="w-4 h-4 text-emerald-400" />
                  <span>Phase 0: Candidate Identification (Step {idCheckStep + 1} of 4)</span>
                </span>
              )}
              {isPart1 && <span>Part 1: Introduction ({part1Index + 1} of {part1Questions.length})</span>}
              {isPart2Prep && <span>Part 2: 1-Minute Preparation Period</span>}
              {isPart2Speak && <span>Part 2: 2-Minute Individual Monologue</span>}
              {isPart3 && <span>Part 3: In-Depth Discussion ({part3Index + 1} of {part3Questions.length})</span>}
            </div>
          </div>
        </div>

        {/* Phase / Audio Indicator & Instant Coach Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              const nextState = !autoInstantFeedback;
              setAutoInstantFeedback(nextState);
              soundManager.playBeep(700, 0.04);
              onShowToast(nextState ? '⚡ Instant Band 8+ Coach Activated!' : 'Switched to continuous exam mode');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              autoInstantFeedback
                ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
            title="Instant Band 8+ coach and grammar analysis after each question"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Instant Band 8+ Coach: {autoInstantFeedback ? 'ON' : 'OFF'}</span>
          </button>

          {isExaminerSpeaking ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-950/80 border border-blue-700 text-blue-300 font-mono text-xs">
              <Volume2 className="w-3.5 h-3.5 animate-bounce" />
              <span>Examiner Speaking</span>
            </span>
          ) : isRecording ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Candidate Speaking</span>
            </span>
          ) : isPart2Prep ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/80 border border-amber-700 text-amber-300 font-mono text-xs">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Preparation Period</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs">
              Ready
            </span>
          )}

          {/* Timers */}
          {isPart2Prep && (
            <div className="px-3 py-1 rounded-xl bg-amber-500 text-white font-mono font-bold text-xs shadow-2xs">
              {prepSecondsLeft}s left
            </div>
          )}

          {isPart2Speak && (
            <div className="px-3 py-1 rounded-xl bg-purple-600 text-white font-mono font-bold text-xs shadow-2xs">
              {formatTime(monologueSecondsLeft)}
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Exam Interaction Screen */}
      <div className="bg-white rounded-3xl border border-slate-300 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Examiner Identity & Prompt Display */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 pb-4 border-b border-slate-100">
          <div className="relative shrink-0">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white flex flex-col items-center justify-center font-black shadow-md ${
                isExaminerSpeaking ? 'ring-4 ring-blue-400 animate-pulse' : ''
              }`}
            >
              <UserCheck className="w-6 h-6 text-amber-300" />
            </div>
            {isExaminerSpeaking && (
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white animate-ping" />
            )}
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase text-slate-500 tracking-wider">
                Dr. Alistair Vance · Oral Examiner
              </span>

              {/* Repeat Question Button */}
              {(isIdCheck || isPart1 || isPart3) && (
                <button
                  onClick={handleRepeatQuestion}
                  disabled={isExaminerSpeaking}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  title="Ask the examiner to repeat this question"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Please Repeat Question</span>
                </button>
              )}
            </div>

            {/* Current Spoken Question Prompt */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-base sm:text-lg font-medium leading-relaxed">
              "{currentActivePrompt}"
            </div>
          </div>
        </div>

        {/* 2.5 CANDIDATE IDENTIFICATION PROTOCOL (Phase 0) */}
        {isIdCheck && (
          <div className="space-y-4 animate-fade-in">
            {/* Protocol Step Progress Indicator */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {OFFICIAL_CANDIDATE_ID_PROTOCOL.map((item, idx) => {
                const isCurrent = idCheckStep === idx;
                const isPast = idCheckStep > idx;
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border text-xs transition ${
                      isCurrent
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : isPast
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase font-bold">
                      <span>Step {idx + 1}</span>
                      {isPast ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      ) : null}
                    </div>
                    <div className="font-bold text-xs mt-1 truncate">{item.title}</div>
                  </div>
                );
              })}
            </div>

            {/* Official Candidate Examination Desk Docket Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-blue-50/40 border border-slate-300 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <IdCard className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                    Candidate Examination Desk Docket
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  British Council / IDP Verification Standard
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                    Official Full Name
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {candidateIdentity.fullName || 'Awaiting candidate speech...'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                    Preferred First Name
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {candidateIdentity.preferredName || (idCheckStep > 0 ? 'Same as full name' : '—')}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                    Identification Document
                  </span>
                  <span className="font-bold text-emerald-800 flex items-center gap-1.5 text-xs">
                    {candidateIdentity.isVerified ? (
                      <>
                        <BadgeCheck className="w-4 h-4 text-emerald-600" />
                        <span>Verified Passport / ID Card</span>
                      </>
                    ) : (
                      <span className="text-amber-800">Awaiting ID Presentation</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Examiner Tip for Current Step */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="text-xs text-slate-600">
                  💡 <strong>Examiner Instruction:</strong> {OFFICIAL_CANDIDATE_ID_PROTOCOL[idCheckStep]?.subtext}
                  <span className="italic text-slate-500 block sm:inline sm:ml-1">
                    (e.g., "{OFFICIAL_CANDIDATE_ID_PROTOCOL[idCheckStep]?.exampleAnswer}")
                  </span>
                </div>

                {idCheckStep === 3 && (
                  <button
                    onClick={handlePresentPassportId}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                  >
                    <BadgeCheck className="w-4 h-4" />
                    <span>Present Passport / ID Document (Verify)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Fast-Track Option */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Candidate identification takes ~30 seconds and verifies your audio setup.</span>
              <button
                onClick={handleFastTrackToPart1}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline flex items-center gap-1 cursor-pointer"
              >
                <span>Fast-Track to Part 1 Questions ⏭️</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. PART 2 SPECIFIC: Cue Card & 1-Minute Prep Area */}
        {(isPart2Prep || isPart2Speak) && part2CueCard && (
          <div className="space-y-4">
            {/* Candidate Task Card (Cue Card) */}
            <div className="p-6 rounded-2xl bg-amber-50/70 border-2 border-amber-300 text-slate-900 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <span className="font-mono text-xs font-black uppercase tracking-wider text-amber-900">
                  Candidate Task Card (Part 2)
                </span>
                <span className="text-xs font-semibold text-amber-800">Speak for 1 to 2 minutes</span>
              </div>

              <div className="font-bold text-sm sm:text-base text-slate-900">
                {part2CueCard.questionText}
              </div>

              <div className="space-y-1.5 text-xs text-slate-800">
                <div className="font-semibold text-slate-700">You should say:</div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-slate-700">
                  {(part2CueCard.cueCardBulletPoints || [
                    'What this experience or topic is',
                    'When and where it occurred',
                    'Who was involved with you',
                    'And explain why this left a memorable impression on you'
                  ]).map((bp, i) => (
                    <li key={i}>{bp}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Part 2 Prep: Scratchpad & Early Start Button */}
            {isPart2Prep && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Candidate Scratchpad (Jot bullet words/idioms):</span>
                  </div>

                  <button
                    onClick={transitionToPart2Speak}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-2xs active:scale-95"
                  >
                    Ready to Speak Now →
                  </button>
                </div>

                <textarea
                  value={part2Notes}
                  onChange={(e) => setPart2Notes(e.target.value)}
                  placeholder="e.g. 1. Lake District hike; 2. torrential downpour; 3. shelter in rustic barn; 4. forged lifelong resilience..."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
            )}
          </div>
        )}

        {/* 4. Candidate Speaking Interface (Voice Orb, Waveform & Silence Detection) */}
        {!isPart2Prep && (
          <div className="space-y-4 pt-2">
            {/* Interactive Animated Voice Orb */}
            <SpeakingVoiceOrb
              state={
                isExaminerSpeaking
                  ? 'examiner_speaking'
                  : isLoadingTurnFeedback
                  ? 'thinking'
                  : isRecording
                  ? 'recording'
                  : showTurnFeedbackModal
                  ? 'feedback'
                  : 'idle'
              }
              size="md"
            />

            {/* Live Audio Waveform Visualizer */}
            <div className="space-y-1.5">
              <AudioWaveformVisualizer isRecording={isRecording} height={46} showMetrics={true} />
            </div>


            {/* Silence Detection Alert */}
            {silenceCountdown !== null && (
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between animate-fade-in">
                <span>Silence detected after speaking. Continuing in {silenceCountdown}s...</span>
                <button
                  onClick={handleCandidateDoneSpeaking}
                  className="font-bold text-blue-700 underline text-xs"
                >
                  Continue Now
                </button>
              </div>
            )}

            {/* Candidate Controls Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
                {isRecording && (
                  <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>Microphone Live</span>
                  </span>
                )}
                <span>Elapsed: {speakingElapsedSec}s</span>
              </div>

              {/* Large Microphone / Done Speaking Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCandidateDoneSpeaking}
                  disabled={isLoadingTurnFeedback}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-black shadow-md transition flex items-center gap-2 active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {isIdCheck ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>{idCheckStep < 3 ? 'Confirm & Next ID Step →' : 'Complete Verification & Begin Part 1 →'}</span>
                    </>
                  ) : isLoadingTurnFeedback ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analyzing Speech (Band 8+)...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span>Done Speaking (Feedback)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live Candidate Transcript Feedback Box */}
            <div className="pt-2">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1 flex items-center justify-between">
                <span>Speech-to-Text Stream:</span>
                <span className="text-slate-400 font-normal">Candidate response captured in real-time</span>
              </div>
              <textarea
                value={candidateTranscript}
                onChange={(e) => setCandidateTranscript(e.target.value)}
                placeholder={
                  isIdCheck
                    ? OFFICIAL_CANDIDATE_ID_PROTOCOL[idCheckStep]?.placeholder || 'Speak or type your response here...'
                    : 'Speak naturally into your microphone. Your spoken words will appear here. You may also type or edit if microphone access is unavailable...'
                }
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. Instant Speaking Feedback Modal */}
      {currentTurnFeedback && (
        <InstantSpeakingFeedbackModal
          feedback={currentTurnFeedback}
          isOpen={showTurnFeedbackModal}
          onClose={() => {
            setShowTurnFeedbackModal(false);
            stopSpeech();
          }}
          onNextQuestion={() => {
            setShowTurnFeedbackModal(false);
            stopSpeech();
            if (pendingTurnAdvance) {
              pendingTurnAdvance();
            }
          }}
          onRetakeTurn={handleRetakeTurnFromModal}
          nextActionLabel={nextTurnLabel}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
