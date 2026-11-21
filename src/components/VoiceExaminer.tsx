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
import { speakBritish, stopSpeech, audioService } from '../utils/britishVoice';
import { ieltsAudioEngine } from '../services/IELTSAudioEngine';
import {
  BritishRegionalAccent,
  BRITISH_REGIONAL_ACCENT_LIST,
  BRITISH_REGIONAL_ACCENT_METADATA,
  getPreferredBritishRegionalAccent,
  setPreferredBritishRegionalAccent,
  resolveRegionalExaminerSpeaker
} from '../config/voiceConfig';
import { questionEngine } from '../services/QuestionEngine';
import { audioManager } from '../services/AudioManager';
import { evaluateSpeakingSession, analyzeSpeakingFluency, evaluateSingleSpeakingTurn } from '../services/SpeakingEvaluationService';
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
import { BritishCouncilSpeakingResult } from './speaking/BritishCouncilSpeakingResult';
import {
  PART_1_SPEAKING_BANK,
  PART_2_CUE_CARD_BANK,
  PART_3_DISCUSSION_BANK
} from '../data/speakingComprehensiveBank';
import { AudioWaveformVisualizer } from './audio/AudioWaveformVisualizer';
import { SpeakingVoiceOrb, VoiceOrbState } from './audio/SpeakingVoiceOrb';
import { ExaminerHumanoidCanvas, ExaminerArtStyle } from './speaking/ExaminerHumanoidCanvas';
import { adaptSpeakingPilotSetForExaminer } from '../services/candidateAiPilotService';
import { CandidateCameraBooth } from './speaking/CandidateCameraBooth';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend
} from 'recharts';


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

export function getPracticeCandidateIdProtocol(examinerName: string = 'Examiner Arthur, AI') {
  return [
    {
      step: 0,
      title: 'Candidate Full Name',
      prompt: `Good afternoon. My name is ${examinerName}. Can you tell me your full name, please?`,
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
}

export const Practice_CANDIDATE_ID_PROTOCOL = getPracticeCandidateIdProtocol('Examiner Arthur, AI');
// Legacy export preserved above via getPracticeCandidateIdProtocol

interface VoiceExaminerProps {
  onGradeInMock?: (text: string, partTitle: string) => void;
  onShowToast: (msg: string) => void;
  customMockSet?: any;
  onClearCustomMockSet?: () => void;
}

const STORAGE_SESSION_KEY = 'ielts_speaking_exam_session_v4';
const STORAGE_SEEN_KEY = 'ielts_speaking_recent_seen_ids_v2';

export const VoiceExaminer: React.FC<VoiceExaminerProps> = ({
  onGradeInMock,
  onShowToast,
  customMockSet,
  onClearCustomMockSet
}) => {
  // 1. State Machine Stage
  const [stage, setStage] = useState<SpeakingExamStage>('PRE_TEST');

  // 1.5 Practice Candidate Identification State
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
  const [resultsTab, setResultsTab] = useState<'overview' | 'breakdowns' | 'Scorecard_certificate'>('overview');
  const [playingModelTurnIdx, setPlayingModelTurnIdx] = useState<number | null>(null);
  const [savedTurnErrors, setSavedTurnErrors] = useState<Record<string, boolean>>({});

  // 7. UI Helpers & Hardware Verification
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [soundCheckActive, setSoundCheckActive] = useState<boolean>(false);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const [expandedTurns, setExpandedTurns] = useState<Record<number, boolean>>({});
  const [examinerArtStyle] = useState<ExaminerArtStyle>('humanoid');
  const [examinerGender, setExaminerGender] = useState<'male' | 'female'>(() => {
    try {
      const saved = localStorage.getItem('ielts_selected_examiner_gender_v1');
      if (saved === 'male' || saved === 'female') return saved;
    } catch {}
    return 'male';
  });
  const [regionalAccent, setRegionalAccent] = useState<BritishRegionalAccent>(() =>
    getPreferredBritishRegionalAccent()
  );
  const [isExaminerMuted, setIsExaminerMuted] = useState<boolean>(false);
  const [activeSpokenPrompt, setActiveSpokenPrompt] = useState<string>('');
  const [examinerMouthOpen, setExaminerMouthOpen] = useState<number>(0);

  useEffect(() => {
    const handleRegionalSync = (e: Event) => {
      const custom = e as CustomEvent<{ accent: BritishRegionalAccent }>;
      if (custom.detail?.accent) {
        setRegionalAccent(custom.detail.accent);
      }
    };
    const handleGenderSync = (e: Event) => {
      const custom = e as CustomEvent<{ gender: 'male' | 'female' }>;
      if (custom.detail?.gender === 'male' || custom.detail?.gender === 'female') {
        setExaminerGender(custom.detail.gender);
      }
    };
    window.addEventListener('ielts_british_regional_accent_changed', handleRegionalSync);
    window.addEventListener('ielts_voice_gender_changed', handleGenderSync);
    return () => {
      window.removeEventListener('ielts_british_regional_accent_changed', handleRegionalSync);
      window.removeEventListener('ielts_voice_gender_changed', handleGenderSync);
    };
  }, []);

  const activeExaminerName =
    examinerGender === 'female' ? 'Examiner Clara, AI' : 'Examiner Arthur, AI';
  const activeRegionConfig = BRITISH_REGIONAL_ACCENT_METADATA[regionalAccent];

  useEffect(() => {
    if (!isExaminerSpeaking || isExaminerMuted) {
      setExaminerMouthOpen(0);
      return;
    }
    const timer = window.setInterval(() => {
      setExaminerMouthOpen(0.25 + Math.random() * 0.72);
    }, 95);
    return () => clearInterval(timer);
  }, [isExaminerSpeaking, isExaminerMuted]);

  // Refs for speech recognition & intervals
  const recognitionRef = useRef<any>(null);
  const isSessionRecordingRef = useRef<boolean>(false);
  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const monologueTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceCheckRef = useRef<NodeJS.Timeout | null>(null);
  const examinerTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const examinerPromptTokenRef = useRef<number>(0);
  const lastSpeechTimeRef = useRef<number>(Date.now());
  const previousTranscriptLengthRef = useRef<number>(0);
  const currentTranscriptRef = useRef<string>('');
  const currentAttemptIdRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  // Sound check status & tokenized watchdogs
  const soundCheckTokenRef = useRef<number>(0);
  const soundCheckStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundCheckCompletionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSoundCheckTimers = useCallback(() => {
    if (soundCheckStartTimerRef.current) {
      clearTimeout(soundCheckStartTimerRef.current);
      soundCheckStartTimerRef.current = null;
    }
    if (soundCheckCompletionTimerRef.current) {
      clearTimeout(soundCheckCompletionTimerRef.current);
      soundCheckCompletionTimerRef.current = null;
    }
  }, []);

  const stopSoundCheck = useCallback(() => {
    soundCheckTokenRef.current += 1;
    clearSoundCheckTimers();
    setSoundCheckActive(false);
    ieltsAudioEngine.stopCurrentOperation('sound_check_stopped');
  }, [clearSoundCheckTimers]);

  const clearExaminerTransitionTimeout = useCallback(() => {
    if (examinerTransitionTimeoutRef.current) {
      clearTimeout(examinerTransitionTimeoutRef.current);
      examinerTransitionTimeoutRef.current = null;
    }
  }, []);

  const schedulePostPromptAction = useCallback(
    (action: () => void, delayMs: number = 380) => {
      clearExaminerTransitionTimeout();
      examinerTransitionTimeoutRef.current = setTimeout(() => {
        examinerTransitionTimeoutRef.current = null;
        action();
      }, delayMs);
    },
    [clearExaminerTransitionTimeout]
  );

  // Fisher-Yates unbiased shuffle helper so question banks never stay locked in fixed order
  const shuffleItems = <T,>(items: T[]): T[] => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Helper to load distinct, fresh questions from Comprehensive Bank with guaranteed non-repetition
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

    // 1. Part 1: Prefer unseen items; if exhausted, clear old Part 1 IDs so fresh shuffled items are picked
    let availableP1 = PART_1_SPEAKING_BANK.filter((q) => !seenIds.has(q.id));
    if (availableP1.length < 4) {
      PART_1_SPEAKING_BANK.forEach((q) => seenIds.delete(q.id));
      availableP1 = [...PART_1_SPEAKING_BANK];
    }
    const p1Pool = shuffleItems(availableP1);

    // Pick 4 distinct Part 1 questions across distinct topic domains
    const p1Selected: SpeakingQuestionItem[] = [];
    const usedP1Topics = new Set<string>();
    const usedP1Ids = new Set<string>();
    for (const q of p1Pool) {
      if (!usedP1Topics.has(q.topic) && !usedP1Ids.has(q.id) && p1Selected.length < 4) {
        usedP1Topics.add(q.topic);
        usedP1Ids.add(q.id);
        p1Selected.push(q);
      }
    }
    for (const q of p1Pool) {
      if (p1Selected.length >= 4) break;
      if (!usedP1Ids.has(q.id)) {
        usedP1Ids.add(q.id);
        p1Selected.push(q);
      }
    }

    // 2. Part 2 Cue Card: Prefer unseen; clear old Part 2 IDs once all cue cards have been practiced
    let availableP2 = PART_2_CUE_CARD_BANK.filter((q) => !seenIds.has(q.id));
    if (availableP2.length === 0) {
      PART_2_CUE_CARD_BANK.forEach((q) => seenIds.delete(q.id));
      availableP2 = [...PART_2_CUE_CARD_BANK];
    }
    const p2Pool = shuffleItems(availableP2);
    const p2Selected = p2Pool[0];

    // 3. Part 3 Discussion: Prefer unseen; clear old Part 3 IDs once exhausted; always shuffle
    let availableP3 = PART_3_DISCUSSION_BANK.filter((q) => !seenIds.has(q.id));
    if (availableP3.length < 3) {
      PART_3_DISCUSSION_BANK.forEach((q) => seenIds.delete(q.id));
      availableP3 = [...PART_3_DISCUSSION_BANK];
    }
    const p3Pool = shuffleItems(availableP3);

    // Light thematic preference aligned with Part 2 topic keywords, then fall back to shuffled pool
    const p2Keywords = (p2Selected?.topic || '')
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length >= 4);
    const p3Thematic = p3Pool.filter((q) => {
      const text = `${q.topic} ${q.questionText}`.toLowerCase();
      return p2Keywords.some((kw) => text.includes(kw));
    });
    const p3Selected: SpeakingQuestionItem[] = [];
    const usedP3Ids = new Set<string>();
    for (const q of [...p3Thematic, ...p3Pool]) {
      if (p3Selected.length >= 3) break;
      if (!usedP3Ids.has(q.id)) {
        usedP3Ids.add(q.id);
        p3Selected.push(q);
      }
    }

    // Save newly selected IDs to seen pool
    const newSeen = Array.from(
      new Set([...Array.from(seenIds), ...p1Selected.map((q) => q.id), p2Selected.id, ...p3Selected.map((q) => q.id)])
    );
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
        const activeUser = getActiveUser();
        if (saved && saved.stage && saved.stage !== 'PRE_TEST') {
          if (saved.userId && activeUser?.id && saved.userId !== activeUser.id) {
            localStorage.removeItem(STORAGE_SESSION_KEY);
          } else {
            setStage(saved.stage);
            setTestId(saved.testId || 'spk_exam_' + Date.now());
            setPart1Questions(saved.part1Questions || []);
            setPart2CueCard(saved.part2CueCard || null);
            setPart3Questions(saved.part3Questions || []);
            setPart1Index(saved.part1Index || 0);
            setPart3Index(saved.part3Index || 0);
            setIdCheckStep(saved.idCheckStep || 0);
            if (saved.candidateIdentity) {
              setCandidateIdentity({
                ...saved.candidateIdentity,
                fullName: activeUser?.name || saved.candidateIdentity.fullName || '',
                preferredName:
                  (activeUser?.name ? activeUser.name.split(' ')[0] : '') ||
                  saved.candidateIdentity.preferredName ||
                  ''
              });
            } else if (activeUser?.name) {
              setCandidateIdentity((prev) => ({
                ...prev,
                fullName: activeUser.name,
                preferredName: activeUser.name.split(' ')[0]
              }));
            }
            setPrepSecondsLeft(saved.prepSecondsLeft ?? 60);
            setMonologueSecondsLeft(saved.monologueSecondsLeft ?? 120);
            setPart2Notes(saved.part2Notes || '');
            setCompletedAnswers(saved.completedAnswers || []);
            setCandidateTranscript(saved.candidateTranscript || '');
            setEvaluationReport(saved.evaluationReport || null);
            return;
          }
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

  const prevCustomMockSetRef = useRef<any | null>(null);

  // Sync custom AI Pilot mock set if provided (adapting nested part1.topicGroups, part2, part3.themes), or restore standard bank only when clearing an active pilot
  useEffect(() => {
    if (customMockSet && customMockSet.part1 && customMockSet.part2 && customMockSet.part3) {
      prevCustomMockSetRef.current = customMockSet;
      try {
        if (Array.isArray(customMockSet.part1.topicGroups) && Array.isArray(customMockSet.part3.themes)) {
          const adapted = adaptSpeakingPilotSetForExaminer(customMockSet);
          setTestId(adapted.id || 'spk_draft_' + Date.now());
          setPart1Questions(adapted.part1Questions as any);
          setPart2CueCard(adapted.part2CueCard as any);
          setPart3Questions(adapted.part3Questions as any);
          setPrepSecondsLeft(adapted.part2CueCard.preparationTimeSeconds || 60);
          setMonologueSecondsLeft(adapted.part2CueCard.speakingTimeSeconds || 120);
        } else {
          setTestId(customMockSet.id || 'spk_draft_' + Date.now());
          setPart1Questions(Array.isArray(customMockSet.part1) ? customMockSet.part1 : []);
          setPart2CueCard(customMockSet.part2);
          setPart3Questions(Array.isArray(customMockSet.part3) ? customMockSet.part3 : []);
        }
      } catch (err) {
        console.error('[VoiceExaminer] Failed to adapt Speaking AI Pilot set:', err);
      }
    } else if (!customMockSet && prevCustomMockSetRef.current) {
      prevCustomMockSetRef.current = null;
      const stdSet = assembleExamQuestions();
      setTestId('spk_exam_' + Date.now());
      setPart1Questions(stdSet.p1);
      setPart2CueCard(stdSet.p2);
      setPart3Questions(stdSet.p3);
    }
  }, [customMockSet, assembleExamQuestions]);

  const handleExitCustomPilot = useCallback(() => {
    stopSpeech();
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    } catch {
      // ignore storage errors
    }
    setStage('PRE_TEST');
    setPart1Index(0);
    setPart3Index(0);
    setCompletedAnswers([]);
    setCandidateTranscript('');
    if (onClearCustomMockSet) {
      onClearCustomMockSet();
    }
  }, [onClearCustomMockSet]);

  // Persist session state to localStorage
  useEffect(() => {
    if (stage === 'PRE_TEST') return;
    try {
      const snapshot = {
        userId: getActiveUser()?.id || null,
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
          currentTranscriptRef.current = cleaned;
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
      }
    }

    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isSessionRecordingRef.current = false;
      examinerPromptTokenRef.current += 1;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (speechTimerRef.current) clearInterval(speechTimerRef.current);
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      if (monologueTimerRef.current) clearInterval(monologueTimerRef.current);
      if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
      if (examinerTransitionTimeoutRef.current) {
        clearTimeout(examinerTransitionTimeoutRef.current);
        examinerTransitionTimeoutRef.current = null;
      }
      audioManager.reset('speaking_unmount');
    };
  }, [onShowToast]);

  const latestDoneSpeakingRef = useRef<() => void>(() => {});
  const silenceCountdownValRef = useRef<number | null>(null);

  // Silence Detection Loop (Natural examiner responsiveness — always invokes latest handler via ref)
  useEffect(() => {
    if (!isRecording) {
      if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
      silenceCountdownValRef.current = null;
      setSilenceCountdown(null);
      return;
    }

    silenceCheckRef.current = setInterval(() => {
      const words = (currentTranscriptRef.current || candidateTranscript).trim().split(/\s+/).filter(Boolean).length;
      // In ID check, even a short response (1-2 words like full name or "Dhaka") is sufficient
      const minWords = stage === 'ID_CHECK' ? 2 : stage === 'PART_2_SPEAK' ? 25 : 8;

      if (words >= minWords) {
        const timeSinceSpeech = Date.now() - lastSpeechTimeRef.current;
        const silenceThreshold = stage === 'ID_CHECK' ? 2500 : stage === 'PART_2_SPEAK' ? 4500 : 3500;
        if (timeSinceSpeech >= silenceThreshold) {
          const prev = silenceCountdownValRef.current;
          if (prev === null) {
            silenceCountdownValRef.current = 2;
            setSilenceCountdown(2);
          } else if (prev <= 1) {
            if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
            silenceCountdownValRef.current = null;
            setSilenceCountdown(null);
            latestDoneSpeakingRef.current();
          } else {
            silenceCountdownValRef.current = prev - 1;
            setSilenceCountdown(prev - 1);
          }
        } else {
          silenceCountdownValRef.current = null;
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
    currentTranscriptRef.current = '';
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

  // Stop candidate recording & return flushed transcript
  const stopRecording = useCallback((): string => {
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
    return (currentTranscriptRef.current || '').trim();
  }, []);

  // Examiner speaking helper (supports British regional accents with explicit fallback disclosure)
  const speakExaminerPrompt = useCallback(
    (
      promptText: string,
      onFinished?: () => void,
      genderOverride?: 'male' | 'female',
      accentOverride?: BritishRegionalAccent
    ) => {
      examinerPromptTokenRef.current += 1;
      const myPromptToken = examinerPromptTokenRef.current;
      let hasSettled = false;

      clearExaminerTransitionTimeout();
      stopRecording();
      const targetGender = genderOverride || examinerGender;
      const targetRegion = accentOverride || regionalAccent;
      const resolvedVoice = resolveRegionalExaminerSpeaker(targetGender, targetRegion);
      setActiveSpokenPrompt(promptText);
      audioManager.reset('examiner_prompt');

      if (isExaminerMuted) {
        setIsExaminerSpeaking(false);
        schedulePostPromptAction(() => {
          if (examinerPromptTokenRef.current === myPromptToken && !hasSettled) {
            hasSettled = true;
            onFinished?.();
          }
        }, 250);
        return;
      }

      setIsExaminerSpeaking(true);
      audioManager.playCustomAudio('examiner_turn_' + myPromptToken + '_' + Date.now(), promptText, {
        speakerId: resolvedVoice.speakerId,
        gender: targetGender,
        accent: targetRegion,
        rate: resolvedVoice.rate,
        deliveryProfile: promptText.trim().endsWith('?') ? 'examiner_question' : 'examiner_instruction',
        allowReplay: true,
        onEnd: () => {
          if (!isMountedRef.current || hasSettled || examinerPromptTokenRef.current !== myPromptToken) return;
          hasSettled = true;
          setIsExaminerSpeaking(false);
          onFinished?.();
        },
        onError: () => {
          if (!isMountedRef.current || hasSettled || examinerPromptTokenRef.current !== myPromptToken) return;
          hasSettled = true;
          setIsExaminerSpeaking(false);
          onShowToast('Examiner audio encountered an interruption — continuing with written prompt.');
          onFinished?.();
        }
      });
    },
    [clearExaminerTransitionTimeout, schedulePostPromptAction, stopRecording, examinerGender, regionalAccent, isExaminerMuted, onShowToast]
  );

  const activeIdProtocol = useMemo(
    () => getPracticeCandidateIdProtocol(activeExaminerName),
    [activeExaminerName]
  );

  const handleSwitchMockExaminerGender = (nextGender: 'male' | 'female') => {
    clearExaminerTransitionTimeout();
    audioManager.reset('switch_examiner_gender');
    stopSpeech();
    setIsExaminerSpeaking(false);
    setExaminerGender(nextGender);
    try {
      localStorage.setItem('ielts_selected_examiner_gender_v1', nextGender);
      localStorage.setItem('ielts_sprint_preferred_voice_gender_v2', nextGender);
      window.dispatchEvent(new CustomEvent('ielts_voice_gender_changed', { detail: { gender: nextGender } }));
    } catch {}
    soundManager.playBeep(580, 0.04);
    const nextName = nextGender === 'female' ? 'Examiner Clara, AI' : 'Examiner Arthur, AI';
    onShowToast(
      `Switched examiner to ${nextName} (${activeRegionConfig.label} · ${nextGender === 'female' ? 'Female' : 'Practice Male'})`
    );

    if (stage === 'ID_CHECK' || stage === 'PART_1' || stage === 'PART_3') {
      const promptToSpeak =
        stage === 'ID_CHECK'
          ? getPracticeCandidateIdProtocol(nextName)[idCheckStep]?.prompt || ''
          : stage === 'PART_1'
          ? part1Questions[part1Index]?.questionText || ''
          : part3Questions[part3Index]?.questionText || '';
      if (promptToSpeak) {
        speakExaminerPrompt(
          promptToSpeak,
          () => {
            schedulePostPromptAction(() => {
              startRecording();
            }, 380);
          },
          nextGender,
          regionalAccent
        );
      }
    } else if (stage === 'PRE_TEST') {
      speakExaminerPrompt(
        `Good day. I am ${nextName}, your IELTS Speaking examiner persona for today's ${activeRegionConfig.label} practice session.`,
        undefined,
        nextGender,
        regionalAccent
      );
    } else if (activeSpokenPrompt) {
      const updatedPrompt = activeSpokenPrompt
        .replace(/Prof\. Arthur Pendelton|Dr\. Clara Sterling|Dr\. Alistair Vance/g, nextName);
      speakExaminerPrompt(updatedPrompt, undefined, nextGender, regionalAccent);
    }
  };

  const handleSwitchRegionalAccent = (nextAccent: BritishRegionalAccent) => {
    clearExaminerTransitionTimeout();
    audioManager.reset('switch_regional_accent');
    stopSpeech();
    setIsExaminerSpeaking(false);
    setRegionalAccent(nextAccent);
    setPreferredBritishRegionalAccent(nextAccent);
    soundManager.playBeep(610, 0.04);
    const cfg = BRITISH_REGIONAL_ACCENT_METADATA[nextAccent];
    onShowToast(
      cfg.isRegionalVoiceAvailable
        ? `Switched examiner accent to ${cfg.label} (${cfg.regionName})`
        : `Selected ${cfg.label} — ${cfg.fallbackDisclosure || 'Using British English fallback'}`
    );

    if (stage === 'ID_CHECK' || stage === 'PART_1' || stage === 'PART_3') {
      const promptToSpeak =
        stage === 'ID_CHECK'
          ? activeIdProtocol[idCheckStep]?.prompt || ''
          : stage === 'PART_1'
          ? part1Questions[part1Index]?.questionText || ''
          : part3Questions[part3Index]?.questionText || '';
      if (promptToSpeak) {
        speakExaminerPrompt(
          promptToSpeak,
          () => {
            schedulePostPromptAction(() => {
              startRecording();
            }, 380);
          },
          examinerGender,
          nextAccent
        );
      }
    } else if (stage === 'PRE_TEST') {
      speakExaminerPrompt(
        cfg.sampleGreeting,
        undefined,
        examinerGender,
        nextAccent
      );
    }
  };

  // Repeat question handler
  const handleRepeatQuestion = useCallback(() => {
    if (isExaminerSpeaking) return;
    clearExaminerTransitionTimeout();
    stopRecording();

    let currentQText = '';
    if (stage === 'ID_CHECK') {
      currentQText = activeIdProtocol[idCheckStep]?.prompt || '';
    } else if (stage === 'PART_1') {
      currentQText = part1Questions[part1Index]?.questionText || '';
    } else if (stage === 'PART_3') {
      currentQText = part3Questions[part3Index]?.questionText || '';
    }

    if (!currentQText) return;

    soundManager.playBeep(520, 0.08);
    speakExaminerPrompt(`Certainly. ${currentQText}`, () => {
      // Re-enable candidate recording after repeat with natural 650ms floor handover
      schedulePostPromptAction(() => {
        startRecording();
      }, 380);
    });
  }, [isExaminerSpeaking, clearExaminerTransitionTimeout, schedulePostPromptAction, stage, idCheckStep, activeIdProtocol, part1Questions, part1Index, part3Questions, part3Index, speakExaminerPrompt, startRecording, stopRecording]);

  // ========================================================
  // STATE MACHINE TRANSITIONS
  // ========================================================

  // Transition: PRE_TEST -> ID_CHECK (IELTS Identity & Name Verification Protocol)
  const startExamination = () => {
    clearExaminerTransitionTimeout();
    soundManager.playSuccess();
    setStage('ID_CHECK');
    setIdCheckStep(0);
    setCandidateTranscript('');
    setCompletedAnswers([]);

    const p0 = activeIdProtocol[0];

    schedulePostPromptAction(() => {
      speakExaminerPrompt(p0.prompt, () => {
        schedulePostPromptAction(() => {
          startRecording();
        }, 380);
      });
    }, 200);
  };

  // Advance Candidate ID Protocol Turn
  const advanceIdCheckStep = () => {
    clearExaminerTransitionTimeout();
    const flushedText = stopRecording();
    const spoken = (flushedText || currentTranscriptRef.current || candidateTranscript).trim();

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

      const nextItem = Practice_CANDIDATE_ID_PROTOCOL[nextStep];
      speakExaminerPrompt(nextItem.prompt, () => {
        schedulePostPromptAction(() => {
          startRecording();
        }, 380);
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
        schedulePostPromptAction(() => {
          startRecording();
        }, 380);
      });
    }
  };

  // Immediate Fast-Track / Skip ID Check directly to Part 1
  const handleFastTrackToPart1 = () => {
    clearExaminerTransitionTimeout();
    stopRecording();
    stopSpeech();
    setCandidateIdentity((prev) => ({ ...prev, isVerified: true }));
    soundManager.playSuccess();
    setStage('PART_1');
    setPart1Index(0);
    setCandidateTranscript('');

    const q1 = part1Questions[0];
    const greetingText = `Good afternoon. My name is ${activeExaminerName}, and I will be your examiner today. In this first part, I would like to ask you some questions about yourself. ${q1?.questionText || 'Where is your hometown located?'}`;

    speakExaminerPrompt(greetingText, () => {
      schedulePostPromptAction(() => {
        startRecording();
      }, 380);
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
    const attemptId = Date.now();
    currentAttemptIdRef.current = attemptId;
    soundManager.playBeep(580, 0.08);

    const buildUnavailableTurnFeedback = (ansRecord: SpeakingAnswerRecord): InstantSpeakingFeedback => ({
      questionId: ansRecord.questionId,
      part: ansRecord.part,
      topic: ansRecord.topic,
      questionText: ansRecord.questionText,
      candidateTranscript: ansRecord.transcript,
      durationSec: ansRecord.durationSec,
      wordsPerMinute: ansRecord.wordsPerMinute,
      isValidAttempt: false,
      assessmentStatus: 'unavailable',
      evidenceMode: 'unavailable',
      pronunciationObservable: false,
      isPartialAssessment: false,
      unassessedCriteria: ['fluency', 'lexical', 'grammar', 'pronunciation'],
      overallBand: null,
      partialThreeCriterionIndex: null,
      estimatedBand: null,
      wordCount: ansRecord.wordCount,
      feedbackTitle: 'AI Speaking Evaluation Unavailable',
      feedbackEn: 'The AI examiner service could not be reached. No IELTS band score was generated. Please sign in and retry.',
      feedbackBn: 'AI এক্সামিনার সার্ভিসে সংযোগ করা যায়নি। কোনো ব্যান্ড স্কোর তৈরি করা হয়নি। অনুগ্রহ করে সাইন ইন করে আবার চেষ্টা করুন।',
      error: 'AI speaking evaluation service unavailable.',
      canRetry: true,
      criteria: { fc: null, lr: null, gra: null, pr: null },
      estimatedBands: { fluency: null, lexical: null, grammar: null, pronunciation: null, overall: null },
      grammaticalErrors: [],
      pronunciation: {
        clarityBand: null,
        cadenceWpm: ansRecord.wordsPerMinute,
        trickyWords: [],
        connectedSpeechTips: [],
        intonationPattern: 'Unassessed — AI speaking evaluator unavailable.',
        rhythmVerdict: 'Pronunciation was not assessed because the AI speaking evaluator was unavailable.'
      },
      band8Answer: {
        bandScore: 8.5,
        modelAnswer: '',
        highlightedCollocations: [],
        keyDiscourseMarkers: [],
        examinerRationale: 'No score was generated because the AI evaluation service was unavailable.'
      },
      actionableTips: ['Sign in and retry when connected to the AI speaking evaluator.']
    });

    // When Instant Coaching Modal is disabled (standard exam flow), advance and speak the examiner's
    // next prompt immediately so turn evaluation never blocks or delays the examiner's voice transition.
    if (!autoInstantFeedback) {
      setCompletedAnswers((prev) => [...prev.filter((a) => a.questionId !== record.questionId), record]);
      advanceExecution();
      evaluateSingleSpeakingTurn(
        record,
        record.part === 2 ? part2CueCard?.cueCardBulletPoints : []
      )
        .then((feedback) => {
          record.instantFeedback = feedback;
          setCompletedAnswers((prev) => [...prev.filter((a) => a.questionId !== record.questionId), { ...record }]);
        })
        .catch(() => {
          const unavailableFeedback = buildUnavailableTurnFeedback(record);
          record.instantFeedback = unavailableFeedback;
          setCompletedAnswers((prev) => [...prev.filter((a) => a.questionId !== record.questionId), { ...record }]);
        });
      return;
    }

    setIsLoadingTurnFeedback(true);

    try {
      const feedback = await evaluateSingleSpeakingTurn(
        record,
        record.part === 2 ? part2CueCard?.cueCardBulletPoints : []
      );
      if (currentAttemptIdRef.current !== attemptId) return; // Discard out-of-order evaluation
      record.instantFeedback = feedback;
      setCurrentTurnFeedback(feedback);
      setCompletedAnswers(prev => [...prev.filter(a => a.questionId !== record.questionId), record]);

      setPendingTurnAdvance(() => advanceExecution);
      setNextTurnLabel(nextLabel);
      setShowTurnFeedbackModal(true);
      if (feedback.isValidAttempt === false) {
        soundManager.playBeep(360, 0.12);
      } else {
        soundManager.playSuccess();
      }
    } catch {
      if (currentAttemptIdRef.current !== attemptId) return;
      const unavailableFeedback = buildUnavailableTurnFeedback(record);
      record.instantFeedback = unavailableFeedback;
      setCurrentTurnFeedback(unavailableFeedback);
      setCompletedAnswers(prev => [...prev.filter(a => a.questionId !== record.questionId), record]);
      setPendingTurnAdvance(() => advanceExecution);
      setNextTurnLabel(nextLabel);
      setShowTurnFeedbackModal(true);
      soundManager.playBeep(360, 0.12);
    } finally {
      if (currentAttemptIdRef.current === attemptId) {
        setIsLoadingTurnFeedback(false);
      }
    }
  };

  // Retake current turn (Candidate repeats speech with coach tips)
  const handleRetakeTurnFromModal = () => {
    setShowTurnFeedbackModal(false);
    clearExaminerTransitionTimeout();
    stopSpeech();
    setCandidateTranscript('');
    setSpeakingElapsedSec(0);
    schedulePostPromptAction(() => {
      startRecording();
    }, 150);
  };

  // Transition: PART_1 Next Question or to PART_2_PREP
  const advancePart1Turn = () => {
    clearExaminerTransitionTimeout();
    const flushedText = stopRecording();
    const currentQ = part1Questions[part1Index];
    if (!currentQ) return;

    const cleanTranscript = (flushedText || currentTranscriptRef.current || candidateTranscript).trim();
    const realWordCount = cleanTranscript ? cleanTranscript.split(/\s+/).filter(Boolean).length : 0;

    // Record answer strictly from candidate's actual spoken words
    const record: SpeakingAnswerRecord = {
      questionId: currentQ.id,
      part: 1,
      topic: currentQ.topic,
      questionText: currentQ.questionText,
      transcript: cleanTranscript,
      startTime: Date.now() - speakingElapsedSec * 1000,
      endTime: Date.now(),
      durationSec: speakingElapsedSec,
      wordCount: realWordCount,
      wordsPerMinute:
        realWordCount >= 5 && speakingElapsedSec > 0
          ? Math.round((realWordCount / Math.max(speakingElapsedSec, 5)) * 60)
          : 0,
      pauseCount: null,
      longPauseCount: null,
      fillerCount: (cleanTranscript.match(/\b(um|uh|er|like)\b/gi) || []).length,
      detectedFillers: cleanTranscript.match(/\b(um|uh|er|like)\b/gi) || []
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
          schedulePostPromptAction(() => {
            startRecording();
          }, 380);
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
      schedulePostPromptAction(() => {
        startRecording();
        startMonologueTimer();
      }, 380);
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
    clearExaminerTransitionTimeout();
    const flushedText = stopRecording();

    if (!part2CueCard) return;

    // Record Part 2 Monologue answer strictly from candidate's actual spoken words
    const cleanTranscript = (flushedText || currentTranscriptRef.current || candidateTranscript).trim();
    const words = cleanTranscript ? cleanTranscript.split(/\s+/).filter(Boolean).length : 0;
    const duration = Math.max(0, 120 - monologueSecondsLeft);

    const record: SpeakingAnswerRecord = {
      questionId: part2CueCard.id,
      part: 2,
      topic: part2CueCard.topic,
      questionText: part2CueCard.questionText,
      transcript: cleanTranscript,
      startTime: Date.now() - duration * 1000,
      endTime: Date.now(),
      durationSec: duration,
      wordCount: words,
      wordsPerMinute: words >= 5 && duration > 0 ? Math.round((words / Math.max(duration, 10)) * 60) : 0,
      pauseCount: null,
      longPauseCount: null,
      fillerCount: (cleanTranscript.match(/\b(um|uh|er|like)\b/gi) || []).length,
      detectedFillers: cleanTranscript.match(/\b(um|uh|er|like)\b/gi) || []
    };

    const executeAdvance = () => {
      setStage('PART_3');
      setPart3Index(0);

      const q1 = part3Questions[0];
      const p3Intro = `Thank you very much. Now, in Part 3, let's explore some more general questions related to this theme. ${q1?.questionText || 'Do you believe modern society values these experiences as much as in the past?'}`;

      speakExaminerPrompt(p3Intro, () => {
        schedulePostPromptAction(() => {
          startRecording();
        }, 380);
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
    clearExaminerTransitionTimeout();
    const flushedText = stopRecording();
    const currentQ = part3Questions[part3Index];
    if (!currentQ) return;

    const cleanTranscript = (flushedText || currentTranscriptRef.current || candidateTranscript).trim();
    const words = cleanTranscript ? cleanTranscript.split(/\s+/).filter(Boolean).length : 0;

    const record: SpeakingAnswerRecord = {
      questionId: currentQ.id,
      part: 3,
      topic: currentQ.topic,
      questionText: currentQ.questionText,
      transcript: cleanTranscript,
      startTime: Date.now() - speakingElapsedSec * 1000,
      endTime: Date.now(),
      durationSec: speakingElapsedSec,
      wordCount: words,
      wordsPerMinute:
        words >= 5 && speakingElapsedSec > 0
          ? Math.round((words / Math.max(speakingElapsedSec, 5)) * 60)
          : 0,
      pauseCount: null,
      longPauseCount: null,
      fillerCount: (cleanTranscript.match(/\b(um|uh|er|like)\b/gi) || []).length,
      detectedFillers: cleanTranscript.match(/\b(um|uh|er|like)\b/gi) || []
    };

    const isLast = part3Index >= part3Questions.length - 1;

    const executeAdvance = () => {
      if (!isLast) {
        const nextIdx = part3Index + 1;
        setPart3Index(nextIdx);
        const nextQ = part3Questions[nextIdx];

        const transitions = [
          'Thank you. Considering another perspective,',
          'I see. Building on that idea,',
          'Right. Looking at this from a wider angle,'
        ];
        const intro = transitions[nextIdx % transitions.length];

        speakExaminerPrompt(`${intro} ${nextQ.questionText}`, () => {
          schedulePostPromptAction(() => {
            startRecording();
          }, 380);
        });
      } else {
        // Conclude Test
        setStage('COMPLETED');
        soundManager.playSuccess();

        speakExaminerPrompt('Thank you very much. That is the end of the speaking examination.', () => {
          schedulePostPromptAction(() => {
            generateFinalEvaluation([...completedAnswers, record]);
          }, 600);
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

  // Keep latestDoneSpeakingRef synced on every render so silence auto-advance never uses stale part1Index/part3Index
  latestDoneSpeakingRef.current = handleCandidateDoneSpeaking;

  // Immediate Skip to Next Question (bypasses feedback modal so candidate never feels stuck on one prompt)
  const handleSkipToNextQuestion = () => {
    clearExaminerTransitionTimeout();
    stopRecording();
    stopSpeech();
    soundManager.playBeep(600, 0.04);

    if (stage === 'ID_CHECK') {
      advanceIdCheckStep();
      return;
    }

    if (stage === 'PART_1') {
      if (part1Index < part1Questions.length - 1) {
        const nextIdx = part1Index + 1;
        setPart1Index(nextIdx);
        setCandidateTranscript('');
        const nextQ = part1Questions[nextIdx];
        speakExaminerPrompt(`Alright, moving on. ${nextQ.questionText}`, () => {
          schedulePostPromptAction(() => startRecording(), 380);
        });
      } else {
        setStage('PART_2_PREP');
        setPrepSecondsLeft(60);
        speakExaminerPrompt(
          'Thank you. Now, in Part 2, I am going to give you a topic card. You have one minute to prepare your notes.',
          () => startPart2PrepTimer()
        );
      }
      return;
    }

    if (stage === 'PART_3') {
      if (part3Index < part3Questions.length - 1) {
        const nextIdx = part3Index + 1;
        setPart3Index(nextIdx);
        setCandidateTranscript('');
        const nextQ = part3Questions[nextIdx];
        speakExaminerPrompt(`Let's explore another angle. ${nextQ.questionText}`, () => {
          schedulePostPromptAction(() => startRecording(), 380);
        });
      } else {
        advancePart3Turn();
      }
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
          const turnBand =
            ans.instantFeedback?.overallBand ??
            ans.instantFeedback?.partialThreeCriterionIndex ??
            report.overallBand ??
            report.partialThreeCriterionIndex;
          questionEngine.recordAttempt({
            questionId: ans.questionId,
            module: 'speaking',
            userAnswer: ans.transcript,
            isCorrect: typeof turnBand === 'number' && turnBand >= 6.0 && ans.wordCount >= 10,
            score: typeof turnBand === 'number' ? turnBand : 0,
            timeSpentSec: ans.durationSec,
            explanation: `Part ${ans.part} response recorded for spaced speaking practice.`
          });
        } catch {}
      });

      setEvaluationReport(report);
      setStage('RESULTS');
      soundManager.playSuccess();
      onShowToast('IELTS Speaking Diagnostic Report Generated!');
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

  // Sound Check Button in Pre-Test (via unified IELTSAudioEngine)
  const handleSoundCheck = () => {
    if (soundCheckActive) return;
    setSoundCheckActive(true);
    soundManager.playBeep(520, 0.1);

    const speakerId = examinerGender === 'female' ? 'speaker_05' : 'speaker_04';
    const sampleText =
      'Good day. This is an authentic sound check for the IELTS Speaking test. If you can hear this message clearly, your audio output is configured correctly.';

    ieltsAudioEngine.playSoundCheck({
      speakerId,
      sampleText,
      onStart: () => {
        setSoundCheckActive(true);
      },
      onEnd: () => {
        setSoundCheckActive(false);
      },
      onError: (err) => {
        setSoundCheckActive(false);
        const reason = typeof err?.message === 'string' ? err.message : 'Audio stream playback failed.';
        onShowToast(`⚠ Sound check failed: ${reason}`);
      }
    });
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
      return activeIdProtocol[idCheckStep]?.prompt || '';
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
  }, [stage, idCheckStep, activeIdProtocol, part1Questions, part1Index, part2CueCard, part3Questions, part3Index]);

  // Current active question topic
  const currentActiveTopic = useMemo(() => {
    if (stage === 'ID_CHECK') {
      return `Phase 0 · ${activeIdProtocol[idCheckStep]?.title || 'Identity Protocol'}`;
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
  }, [stage, idCheckStep, activeIdProtocol, part1Questions, part1Index, part2CueCard, part3Questions, part3Index]);

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
      gender: examinerGender,
      regionalAccent,
      rate: activeRegionConfig.defaultRate,
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
        {customMockSet ? (
          <div className="flex flex-wrap items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 px-4 py-3 rounded-2xl shadow-2xs gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200 block">
                  AI PILOT — APPROVED PRACTICE
                </span>
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  {customMockSet.title || customMockSet.topic} ({customMockSet.format || 'Academic'} · {customMockSet.difficulty || 'Standard'})
                  {Array.isArray(customMockSet.part1?.topicGroups) && Array.isArray(customMockSet.part3?.themes)
                    ? ` · ${customMockSet.part1.topicGroups.length} Part 1 Topic Groups · ${customMockSet.part3.themes.length} Part 3 Themes`
                    : ''}
                </span>
              </div>
            </div>
            {onClearCustomMockSet && (
              <button
                onClick={handleExitCustomPilot}
                className="px-3 py-1.5 min-h-[44px] rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-emerald-300 dark:border-emerald-700 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition cursor-pointer"
              >
                Exit Pilot & Reset to Standard Bank
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                AI Speaking Studio · Computer-Delivered Simulation
              </span>
            </div>
            <span className="text-xs text-slate-500 font-mono">Standard IELTS Speaking Format</span>
          </div>
        )}

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
                  {activeExaminerName} · {activeRegionConfig.label} ({examinerGender === 'female' ? 'Female' : 'Male'})
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  IELTS Speaking Mock Examination
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Realistic 3-part oral interview with natural British regional accents, live silence detection, and Practice diagnostic band scoring.
                </p>
              </div>
            </div>

            {/* Pre-Test Examiner Voice Persona & Regional Accent Selector */}
            <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
              <div className="flex flex-col items-start sm:items-end gap-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  Select Examiner Persona
                </span>
                <div
                  role="radiogroup"
                  aria-label="Select IELTS Speaking Examiner Persona"
                  className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={examinerGender === 'male'}
                    onClick={() => handleSwitchMockExaminerGender('male')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      examinerGender === 'male'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Prof. Arthur — Male
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={examinerGender === 'female'}
                    onClick={() => handleSwitchMockExaminerGender('female')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      examinerGender === 'female'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Dr. Clara — Female
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-start sm:items-end gap-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  British Regional Accent
                </span>
                <div
                  role="radiogroup"
                  aria-label="Select British Regional Accent"
                  className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-bold flex-wrap"
                >
                  {BRITISH_REGIONAL_ACCENT_LIST.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={regionalAccent === item.id}
                      onClick={() => handleSwitchRegionalAccent(item.id)}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        regionalAccent === item.id
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {item.shortLabel}
                    </button>
                  ))}
                </div>
                {activeRegionConfig.fallbackDisclosure && (
                  <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md max-w-xs text-right">
                    {activeRegionConfig.fallbackDisclosure}
                  </span>
                )}
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
            IELTS Diagnostic Assessment
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            Evaluating Speaking Performance...
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            Analyzing speech rate, pause distributions, lexical diversity, and grammatical structures against the 4 IELTS criteria.
          </p>
        </div>

        <div className="w-48 h-1.5 bg-slate-200 rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-slate-900 rounded-full animate-[pulse_1s_infinite]"></div>
        </div>
      </div>
    );
  }

  // VIEW 3: RESULTS STATE (Practice-Style Diagnostic Report)
  if (stage === 'RESULTS' && evaluationReport) {
    const { overallBand, partialThreeCriterionIndex, criteria, grammarObservations, vocabUpgrades } = evaluationReport;
    const analytics = analyzeSpeakingFluency(completedAnswers);
    const hasDisplayableSessionScore =
      (typeof overallBand === 'number' && overallBand > 0) ||
      (typeof partialThreeCriterionIndex === 'number' && partialThreeCriterionIndex > 0);

    if (evaluationReport.isValidAttempt === false || !hasDisplayableSessionScore || analytics.totalWordsSpoken < 5) {
      return (
        <div className="w-full max-w-2xl mx-auto py-8 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-800/80 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 text-white px-6 py-5 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-300" />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-rose-300 font-bold block">
                  Unattempted / Audio Inaudible
                </span>
                <h1 className="text-xl font-black text-white">
                  {evaluationReport.feedbackTitle || 'No Candidate Speech Detected'}
                </h1>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-rose-800 dark:text-rose-300">
                  <span>STRICT INPUT GATE · MINIMUM 5 WORDS REQUIRED</span>
                  <span className="px-2 py-0.5 rounded bg-rose-200/80 dark:bg-rose-900 text-rose-950 dark:text-rose-100">
                    {analytics.totalWordsSpoken} word{analytics.totalWordsSpoken === 1 ? '' : 's'} spoken
                  </span>
                </div>
                <p className="text-sm font-semibold text-rose-950 dark:text-rose-100 leading-relaxed">
                  {evaluationReport.feedbackEn ||
                    'You spoke fewer than 5 words. The examiner cannot assess your English without audible, sustained speech.'}
                </p>
                <p className="text-xs font-medium text-rose-800 dark:text-rose-300 leading-relaxed pt-2 border-t border-rose-200/60 dark:border-rose-800/60">
                  {evaluationReport.feedbackBn ||
                    'পর্যাপ্ত শব্দ শনাক্ত করা যায়নি (কমপক্ষে ৫টি শব্দ প্রয়োজন)। অনুগ্রহ করে মাইক্রোফোন অন করে স্পষ্টভাবে কথা বলুন।'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRetakeExam}
                  className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-black shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Try Again / Re-record</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
        {/* Top Disclaimer Badge */}
        <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-300 text-slate-700 text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0" />
            <span>
              <strong>AI-Estimated Performance Diagnostic:</strong> Aligned with Practice IELTS Band Descriptors (Not an IELTS test certificate).
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
        <div className="flex flex-wrap border-b border-slate-200 bg-white rounded-2xl p-1 gap-1 shadow-2xs">
          <button
            onClick={() => {
              setResultsTab('overview');
              soundManager.playBeep(600, 0.04);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              resultsTab === 'overview' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            4 Practice Criteria Overview
          </button>
          <button
            onClick={() => {
              setResultsTab('breakdowns');
              soundManager.playBeep(600, 0.04);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              resultsTab === 'breakdowns' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Question-by-Question Diagnostics & Band 8+ Models ({completedAnswers.length})</span>
          </button>
          <button
            onClick={() => {
              setResultsTab('Scorecard_certificate');
              soundManager.playBeep(600, 0.04);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              resultsTab === 'Scorecard_certificate' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-300" />
            <span>Practice Scorecard Scorecard</span>
          </button>
        </div>

        {resultsTab === 'overview' ? (
          <>
            {/* Modern Coach Card-Based Scorecard Interface */}
            <BritishCouncilSpeakingResult
              evaluationReport={evaluationReport}
              analytics={analytics}
              completedAnswers={completedAnswers}
              candidateName={candidateIdentity.preferredName || candidateIdentity.fullName || 'Candidate'}
              onRetakeExam={handleRetakeExam}
              onShowToast={onShowToast}
            />

            {/* Fluency vs. Coherence Recharts Spider Chart */}
            <div className="bg-white rounded-3xl border border-slate-300 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-mono font-bold uppercase text-indigo-700 tracking-wider">
                    Fluency vs. Coherence Spider Chart
                  </h3>
                  <p className="text-xs text-slate-500">
                    Multi-dimensional breakdown of your speech delivery pace, logical discourse linking, and sub-skill balance against the Band 8.0 benchmark.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg tabular-nums">
                  Target Benchmark: Band 8.0
                </span>
              </div>

              <div className="w-full h-[300px] sm:h-[330px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius="74%"
                    data={(() => {
                      const fcBand = criteria.fluency.band;
                      const lrBand = criteria.lexical.band;
                      const graBand = criteria.grammar.band;
                      const prBand = criteria.pronunciation.band;
                      const points: Array<{ subject: string; candidate: number; benchmark: number; fullMark: number }> = [];

                      if (typeof fcBand === 'number') {
                        points.push({
                          subject: 'Fluency Flow',
                          candidate: Number(fcBand.toFixed(1)),
                          benchmark: 8.0,
                          fullMark: 9.0
                        });
                      }
                      if (typeof fcBand === 'number' && typeof lrBand === 'number') {
                        points.push({
                          subject: 'Logical Coherence',
                          candidate: Number(
                            Math.min(
                              9.0,
                              Math.max(
                                1.0,
                                fcBand * 0.65 +
                                  lrBand * 0.35 +
                                  (analytics.totalFillers <= 3 ? 0.3 : -0.3)
                              )
                            ).toFixed(1)
                          ),
                          benchmark: 8.0,
                          fullMark: 9.0
                        });
                      }
                      if (typeof fcBand === 'number') {
                        points.push({
                          subject: 'Hesitation Control',
                          candidate: Number(
                            Math.min(
                              9.0,
                              Math.max(1.0, fcBand - analytics.totalFillers * 0.15 + 0.4)
                            ).toFixed(1)
                          ),
                          benchmark: 8.0,
                          fullMark: 9.0
                        });
                      }
                      if (typeof lrBand === 'number') {
                        points.push({
                          subject: 'Lexical Precision',
                          candidate: Number(lrBand.toFixed(1)),
                          benchmark: 8.0,
                          fullMark: 9.0
                        });
                      }
                      if (typeof graBand === 'number') {
                        points.push({
                          subject: 'Grammar Range',
                          candidate: Number(graBand.toFixed(1)),
                          benchmark: 8.0,
                          fullMark: 9.0
                        });
                      }
                      if (typeof prBand === 'number') {
                        points.push({
                          subject: 'Pronunciation',
                          candidate: Number(prBand.toFixed(1)),
                          benchmark: 8.0,
                          fullMark: 9.0
                        });
                      }
                      return points;
                    })()}
                  >
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 700 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 9]}
                      tickCount={6}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                    />
                    <Radar
                      name="Band 8.0 Benchmark"
                      dataKey="benchmark"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fill="#10b981"
                      fillOpacity={0.12}
                    />
                    <Radar
                      name="Candidate Score"
                      dataKey="candidate"
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      fill="#4f46e5"
                      fillOpacity={0.35}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Acoustic Fluency & Hesitation Timeline */}
            <div className="bg-white rounded-3xl border border-slate-300 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-mono font-bold uppercase text-slate-800 tracking-wider">
                    Acoustic Fluency & Speech Rate Telemetry
                  </h3>
                  <p className="text-xs text-slate-500">
                    Turn-by-turn speaking pace vs. Practice Optimal Native Cadence Zone (115–150 WPM).
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg tabular-nums">
                  Session Avg: {analytics.averageWpm} WPM · {analytics.totalFillers} Fillers
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {completedAnswers.map((ans, idx) => {
                  const turnWpm =
                    ans.durationSec > 0 ? Math.round((ans.wordCount / Math.max(ans.durationSec, 3)) * 60) : 125;
                  const fillerMatches = ans.transcript.match(/\b(um|uh|er|ah|like|you know|basically)\b/gi) || [];
                  const isOptimalPace = turnWpm >= 110 && turnWpm <= 155;
                  const barPct = Math.min(100, Math.max(15, Math.round((turnWpm / 180) * 100)));

                  return (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-slate-900">
                          Turn {idx + 1} · Part {ans.part} ({ans.topic})
                        </span>
                        <div className="flex items-center gap-3 font-mono tabular-nums">
                          <span className={isOptimalPace ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                            {turnWpm} WPM {isOptimalPace ? '(Optimal Cadence)' : turnWpm < 110 ? '(Slow / Hesitant)' : '(Rushed)'}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className={fillerMatches.length === 0 ? 'text-slate-600' : 'text-rose-600 font-bold'}>
                            {fillerMatches.length} filler{fillerMatches.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOptimalPace ? 'bg-emerald-600' : 'bg-amber-500'
                          }`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
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
        ) : resultsTab === 'breakdowns' ? (
          /* Question-by-Question Diagnostics Breakdown Tab */
          <div className="space-y-4 animate-fade-in">
            {completedAnswers.map((ans, idx) => {
              const fb = ans.instantFeedback;
              const isPlayingThisModel = playingModelTurnIdx === idx;
              const turnBadgeText = !fb
                ? 'Not Evaluated'
                : fb.isValidAttempt === false || fb.assessmentStatus === 'unavailable' || fb.assessmentStatus === 'insufficient_evidence'
                  ? 'No Score Generated'
                  : typeof fb.overallBand === 'number'
                    ? `Est. Band ${fb.overallBand.toFixed(1)}`
                    : typeof fb.partialThreeCriterionIndex === 'number'
                      ? `Partial 3/4 Index ${fb.partialThreeCriterionIndex.toFixed(1)}`
                      : 'Unassessed';

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
                        {turnBadgeText}
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

                  {!fb ? (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                      Turn-level AI evaluation is not available for this turn. No score was fabricated.
                    </div>
                  ) : (
                    <>
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
                      {fb.band8Answer.modelAnswer && (
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
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* TAB 3: Practice Coach / IDP-STYLE TEST REPORT FORM (Scorecard) SCORECARD */
          <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 sm:p-10 shadow-sm space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-slate-900">
              <div>
                <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-500">
                  INTERNATIONAL ENGLISH LANGUAGE TESTING SYSTEM
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                  TEST REPORT FORM · SPEAKING MODULE
                </h2>
                <p className="text-xs font-mono text-slate-600 mt-1">
                  Centre Number: <strong>GB599</strong> · Date: <strong>{new Date().toLocaleDateString('en-GB')}</strong> · Candidate Ref: <strong>{testId.slice(-8).toUpperCase()}</strong>
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer self-start sm:self-auto"
              >
                Print / Save Practice Scorecard PDF
              </button>
            </div>

            {/* Candidate Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono">
              <div>
                <span className="text-slate-400 uppercase block text-[10px]">Candidate Name</span>
                <strong className="text-slate-900 text-sm">{candidateIdentity.fullName || 'REGISTERED CANDIDATE'}</strong>
              </div>
              <div>
                <span className="text-slate-400 uppercase block text-[10px]">Country / Origin</span>
                <strong className="text-slate-900 text-sm">{candidateIdentity.origin || 'International'}</strong>
              </div>
              <div>
                <span className="text-slate-400 uppercase block text-[10px]">CEFR / Assessment Mode</span>
                <strong className="text-emerald-700 text-sm">
                  {typeof overallBand === 'number'
                    ? overallBand >= 8.0
                      ? 'C2 (Mastery)'
                      : overallBand >= 7.0
                        ? 'C1 (Effective Operational)'
                        : overallBand >= 5.5
                          ? 'B2 (Vantage)'
                          : 'B1 (Threshold)'
                    : 'Partial Transcript-Only (3/4 Criteria)'}
                </strong>
              </div>
            </div>

            {/* 4 Criteria Practice Score Boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center font-mono tabular-nums">
              <div className="p-4 rounded-2xl border border-slate-300 bg-slate-50">
                <div className="text-[10px] font-bold uppercase text-slate-500">Fluency & Coherence</div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {typeof criteria.fluency.band === 'number' ? criteria.fluency.band.toFixed(1) : 'N/A'}
                </div>
              </div>
              <div className="p-4 rounded-2xl border border-slate-300 bg-slate-50">
                <div className="text-[10px] font-bold uppercase text-slate-500">Lexical Resource</div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {typeof criteria.lexical.band === 'number' ? criteria.lexical.band.toFixed(1) : 'N/A'}
                </div>
              </div>
              <div className="p-4 rounded-2xl border border-slate-300 bg-slate-50">
                <div className="text-[10px] font-bold uppercase text-slate-500">Grammatical Range</div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {typeof criteria.grammar.band === 'number' ? criteria.grammar.band.toFixed(1) : 'N/A'}
                </div>
              </div>
              <div className="p-4 rounded-2xl border border-slate-300 bg-slate-50">
                <div className="text-[10px] font-bold uppercase text-slate-500">Pronunciation</div>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {typeof criteria.pronunciation.band === 'number' ? criteria.pronunciation.band.toFixed(1) : 'Unassessed'}
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-slate-900 text-white">
                <div className="text-[10px] font-bold uppercase text-amber-300">
                  {typeof overallBand === 'number' ? 'Overall Speaking' : 'Partial 3/4 Index'}
                </div>
                <div className="text-3xl font-black text-white mt-0.5">
                  {typeof overallBand === 'number'
                    ? overallBand.toFixed(1)
                    : typeof partialThreeCriterionIndex === 'number'
                      ? partialThreeCriterionIndex.toFixed(1)
                      : 'N/A'}
                </div>
                {typeof overallBand !== 'number' && (
                  <div className="text-[9px] text-amber-200 mt-1">Not an official IELTS overall band</div>
                )}
              </div>
            </div>

            {/* Examiner Remarks & Verification Stamp */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="font-mono font-bold uppercase text-slate-500">
                Senior Examiner Diagnostic Endorsement
              </div>
              <p className="text-slate-700 leading-relaxed font-serif">
                The candidate completed all three parts of the IELTS Speaking examination at a sustained speech rate of{' '}
                <strong>{analytics.averageWpm} WPM</strong> with <strong>{analytics.uniqueVocabularyCount} unique lexical items</strong>.{' '}
                {criteria.fluency.strengths[0] || 'Coherent discourse markers were maintained across abstract Part 3 turns.'}{' '}
                To advance further, focus on: <em>{criteria.grammar.improvements[0] || 'subordinate clause variety and zero-hesitation transitions'}</em>.
              </p>
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-slate-500">
                <span>Examiner: {activeExaminerName} (Cert. #{examinerGender === 'female' ? 'UK-5108' : 'UK-4092'})</span>
                <span>BandSprint Diagnostic Verification Seal · Validated</span>
              </div>
            </div>
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
    <div className="w-full max-w-4xl mx-auto flex flex-col min-h-[calc(100dvh-5.5rem)] md:min-h-0 space-y-4 animate-fade-in pb-24 md:pb-12 select-none">
      {/* 1. Sticky Top Header: Examiner Selection Tabs & Stage Status */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3 sm:p-4 shadow-md flex flex-col gap-2.5 border border-slate-800">
        {/* AI Pilot Banner if active */}
        {customMockSet && (
          <div className="flex items-center justify-between bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold">
            <span className="flex items-center gap-1.5 truncate">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
              <span className="truncate">AI PILOT — APPROVED PRACTICE ({customMockSet.title || customMockSet.topic})</span>
            </span>
            {onClearCustomMockSet && (
              <button
                onClick={handleExitCustomPilot}
                className="text-[11px] underline hover:text-white transition cursor-pointer shrink-0 ml-2"
              >
                Exit Pilot
              </button>
            )}
          </div>
        )}

        {/* Top Row: IELTS Stage, Title & Live Timers */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
              IELTS
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono tracking-wider uppercase text-slate-400">
                Speaking Examination
              </div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 truncate">
                {isIdCheck && (
                  <span className="flex items-center gap-1 text-amber-300 truncate">
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">Phase 0: ID Check ({idCheckStep + 1}/4)</span>
                  </span>
                )}
                {isPart1 && <span className="truncate">Part 1: Introduction ({part1Index + 1}/{part1Questions.length})</span>}
                {isPart2Prep && <span className="truncate">Part 2: 1-Min Prep</span>}
                {isPart2Speak && <span className="truncate">Part 2: 2-Min Monologue</span>}
                {isPart3 && <span className="truncate">Part 3: Discussion ({part3Index + 1}/{part3Questions.length})</span>}
              </div>
            </div>
          </div>

          {/* Phase / Audio Indicator & Timers */}
          <div className="flex items-center gap-2 shrink-0">
            {isExaminerSpeaking ? (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950/90 border border-blue-600 text-blue-300 font-mono text-[11px]">
                <Volume2 className="w-3 h-3 animate-bounce" />
                <span>Examiner Speaking</span>
              </span>
            ) : isRecording ? (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/90 border border-emerald-600 text-emerald-300 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Candidate Speaking</span>
              </span>
            ) : isPart2Prep ? (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/90 border border-amber-600 text-amber-300 font-mono text-[11px]">
                <Clock className="w-3 h-3 animate-spin" />
                <span>Prep Time</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono text-[11px]">
                Ready
              </span>
            )}

            {/* Timers */}
            {isPart2Prep && (
              <div className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-mono font-bold text-xs shadow-2xs">
                {prepSecondsLeft}s left
              </div>
            )}

            {isPart2Speak && (
              <div className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-mono font-bold text-xs shadow-2xs">
                {formatTime(monologueSecondsLeft)}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row: Examiner Selection Tabs & Instant Coach & Voice Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80">
          {/* Examiner Selection Segmented Control */}
          <div
            role="radiogroup"
            aria-label="Select IELTS Mock Examiner"
            className="inline-flex p-0.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-bold shrink-0"
          >
            <button
              type="button"
              role="radio"
              aria-checked={examinerGender === 'male'}
              onClick={() => handleSwitchMockExaminerGender('male')}
              className={`min-h-[34px] px-2.5 sm:px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                examinerGender === 'male' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Prof. Arthur</span>
              <span className="text-[10px] opacity-80">(Male)</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={examinerGender === 'female'}
              onClick={() => handleSwitchMockExaminerGender('female')}
              className={`min-h-[34px] px-2.5 sm:px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                examinerGender === 'female' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Dr. Clara</span>
              <span className="text-[10px] opacity-80">(Female)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const nextMuted = !isExaminerMuted;
                setIsExaminerMuted(nextMuted);
                if (nextMuted) {
                  audioManager.reset('examiner_muted');
                  stopSpeech();
                  setIsExaminerSpeaking(false);
                  onShowToast('Examiner voice muted — candidate microphone stays active.');
                } else {
                  onShowToast('Examiner voice unmuted.');
                }
              }}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                isExaminerMuted
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title={isExaminerMuted ? 'Unmute examiner voice' : 'Mute examiner voice'}
            >
              {isExaminerMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-sky-400" />}
              <span>{isExaminerMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            <button
              onClick={() => {
                const nextState = !autoInstantFeedback;
                setAutoInstantFeedback(nextState);
                soundManager.playBeep(700, 0.04);
                onShowToast(nextState ? '⚡ Instant Band 8+ Coach Activated!' : 'Switched to continuous exam mode');
              }}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                autoInstantFeedback
                  ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
              title="Instant Band 8+ coach and grammar analysis after each question"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Coach: {autoInstantFeedback ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Exam Interaction Screen */}
      <div className="bg-white rounded-3xl border border-slate-300 p-4 sm:p-6 shadow-xs flex flex-col flex-1 gap-4">
        {/* Assessment Stage: Dynamic flexible Avatar + Candidate Camera */}
        <div className="w-full pb-3 border-b border-slate-100 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
            {/* Examiner Portrait Studio: Dynamic Max-Height to Prevent Collision */}
            <div className="md:col-span-6 w-full max-h-[28vh] sm:max-h-[35vh] p-2.5 sm:p-3 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 text-white border border-slate-800 shadow-md ring-1 ring-white/5 flex flex-col justify-center items-center overflow-hidden shrink-0 relative">
              <ExaminerHumanoidCanvas
                gender={examinerGender}
                artStyle={examinerArtStyle}
                isSpeaking={isExaminerSpeaking && !isExaminerMuted}
                isListening={isRecording}
                isThinking={isLoadingTurnFeedback}
                isMuted={isExaminerMuted}
                spokenText={activeSpokenPrompt || currentActivePrompt}
                mouthOpenness={examinerMouthOpen}
                examinerName={activeExaminerName}
                compact={true}
              />
            </div>

            {/* Candidate Live WebRTC Video Camera Booth */}
            <div className="md:col-span-6 flex flex-col justify-between gap-2 min-h-0">
              <CandidateCameraBooth
                candidateName={candidateIdentity.preferredName || candidateIdentity.fullName || 'Candidate'}
                isCandidateSpeaking={isRecording}
                isIdCheckMode={isIdCheck && idCheckStep === 3}
                compact={true}
                onShowToast={onShowToast}
              />
            </div>
          </div>
        </div>

        {/* 3. Current Spoken Question Prompt Card */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 shrink-0 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase text-slate-500 tracking-wider truncate">
              Examiner Spoken Prompt · {currentActiveTopic}
            </span>

            {(isIdCheck || isPart1 || isPart3) && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleRepeatQuestion}
                  disabled={isExaminerSpeaking}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition flex items-center gap-1 disabled:opacity-40 cursor-pointer min-h-[32px] px-2"
                  title="Ask the examiner to repeat this question"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Repeat</span>
                </button>
                <button
                  onClick={handleSkipToNextQuestion}
                  className="text-xs text-[#0F4C45] hover:text-[#0B3833] bg-[#EEF3F1] hover:bg-[#E1ECE9] border border-[#D3DDDA] rounded-lg font-bold transition flex items-center gap-1 cursor-pointer min-h-[32px] px-2.5"
                  title="Move directly to the next speaking question"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <div className="text-slate-900 text-sm sm:text-base font-semibold leading-relaxed">
            “{currentActivePrompt}”
          </div>
        </div>

        {/* 4. Smoothly Scrollable Prompt/Transcript Container */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth space-y-3.5 pr-0.5 max-h-[54vh] sm:max-h-[50vh]">
          {/* CANDIDATE IDENTIFICATION PROTOCOL (Phase 0) */}
          {isIdCheck && (
            <div className="space-y-3.5 animate-fade-in">
              {/* Protocol Step Progress Indicator */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Practice_CANDIDATE_ID_PROTOCOL.map((item, idx) => {
                  const isCurrent = idCheckStep === idx;
                  const isPast = idCheckStep > idx;
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-xs transition ${
                        isCurrent
                          ? 'bg-[#0F4C45] text-white border-[#0F4C45] shadow-sm'
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
                          <span className="w-2 h-2 rounded-full bg-[#F4A62A]" />
                        ) : null}
                      </div>
                      <div className="font-bold text-xs mt-1 truncate">{item.title}</div>
                    </div>
                  );
                })}
              </div>

              {/* Candidate Examination Desk Docket Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#F7F9F8] via-white to-[#EEF3F1]/60 border border-[#D3DDDA] shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D3DDDA] pb-2">
                  <div className="flex items-center gap-1.5">
                    <IdCard className="w-4 h-4 text-[#0F4C45]" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#0E1F1E]">
                      Candidate Examination Desk Docket
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#566664]">
                    Standard IELTS ID Verification
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-[#D3DDDA]">
                    <span className="text-[10px] font-mono uppercase text-[#566664] block font-bold">
                      Candidate Full Name
                    </span>
                    <span className="font-bold text-[#0E1F1E] text-xs sm:text-sm truncate block mt-0.5">
                      {candidateIdentity.fullName || 'Awaiting candidate speech...'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                      Preferred First Name
                    </span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm truncate block">
                      {candidateIdentity.preferredName || (idCheckStep > 0 ? 'Same as full name' : '—')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                      Identification Document
                    </span>
                    <span className="font-bold text-emerald-800 flex items-center gap-1 text-xs truncate">
                      {candidateIdentity.isVerified ? (
                        <>
                          <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate">Verified Passport</span>
                        </>
                      ) : (
                        <span className="text-amber-800 truncate">Awaiting ID Presentation</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Examiner Tip for Current Step */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                  <div className="text-xs text-slate-600 leading-relaxed">
                    💡 <strong>Examiner Instruction:</strong> {Practice_CANDIDATE_ID_PROTOCOL[idCheckStep]?.subtext}
                    <span className="italic text-slate-500 block sm:inline sm:ml-1">
                      (e.g., "{Practice_CANDIDATE_ID_PROTOCOL[idCheckStep]?.exampleAnswer}")
                    </span>
                  </div>

                  {idCheckStep === 3 && (
                    <button
                      onClick={handlePresentPassportId}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                    >
                      <BadgeCheck className="w-4 h-4" />
                      <span>Present Passport / ID Document (Verify)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Fast-Track Option */}
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>Verification confirms microphone acoustic levels.</span>
                <button
                  onClick={handleFastTrackToPart1}
                  className="min-h-[36px] text-xs font-semibold text-slate-600 hover:text-slate-900 underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Fast-Track to Part 1 ⏭️</span>
                </button>
              </div>
            </div>
          )}

          {/* PART 2 SPECIFIC: Cue Card & 1-Minute Prep Area */}
          {(isPart2Prep || isPart2Speak) && part2CueCard && (
            <div className="space-y-3.5">
              {/* Candidate Task Card (Cue Card) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border-2 border-amber-300 text-slate-900 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <span className="font-mono text-xs font-black uppercase tracking-wider text-amber-900">
                    Candidate Task Card (Part 2)
                  </span>
                  <span className="text-xs font-semibold text-amber-800">Speak for 1 to 2 minutes</span>
                </div>

                <div className="font-bold text-sm sm:text-base text-slate-900">
                  {part2CueCard.questionText}
                </div>

                <div className="space-y-1 text-xs text-slate-800">
                  <div className="font-semibold text-slate-700">You should say:</div>
                  <ul className="list-disc list-inside space-y-0.5 pl-1 text-slate-700">
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
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Candidate Scratchpad:</span>
                    </div>

                    <button
                      onClick={transitionToPart2Speak}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-2xs active:scale-95 flex items-center justify-center cursor-pointer"
                    >
                      Ready to Speak Now →
                    </button>
                  </div>

                  <textarea
                    value={part2Notes}
                    onChange={(e) => setPart2Notes(e.target.value)}
                    placeholder="e.g. 1. Lake District hike; 2. torrential downpour; 3. shelter in rustic barn; 4. forged lifelong resilience..."
                    rows={2}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              )}
            </div>
          )}

          {/* Live Candidate Transcript Input / Stream */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center justify-between">
              <span>Speech-to-Text Capture Stream:</span>
              <span className="text-slate-400 font-normal">Transcribed in real-time</span>
            </div>
            <textarea
              value={candidateTranscript}
              onChange={(e) => setCandidateTranscript(e.target.value)}
              placeholder={
                isIdCheck
                  ? Practice_CANDIDATE_ID_PROTOCOL[idCheckStep]?.placeholder || 'Speak or type your response here...'
                  : 'Speak naturally into your microphone. Your spoken words will appear here. You may also type or edit if microphone access is unavailable...'
              }
              rows={2}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        {/* 5. Docked Bottom Controls & Voice Status */}
        {!isPart2Prep && (
          <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-[#11201F]/95 backdrop-blur-md border-t border-[#D3DDDA] dark:border-[#1E3533] pt-3 pb-3 px-1 rounded-b-2xl mt-auto shrink-0 space-y-2.5">
            {/* Responsive Compact Voice Orb + Audio Waveform */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <div className="shrink-0">
                <SpeakingVoiceOrb
                  compact={true}
                  onClick={() => {
                    if (isRecording) {
                      stopRecording();
                    } else if (!isExaminerSpeaking) {
                      startRecording();
                    }
                  }}
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
                />
              </div>
              <div className="flex-1 min-w-0">
                <AudioWaveformVisualizer isRecording={isRecording} height={36} showMetrics={false} />
              </div>
            </div>

            {/* Silence Detection Alert */}
            {silenceCountdown !== null && (
              <div className="p-2.5 rounded-xl bg-[#EEF3F1] border border-[#D3DDDA] text-[#0E1F1E] text-xs flex items-center justify-between gap-2 animate-fade-in">
                <span>Silence detected. Auto-continuing in {silenceCountdown}s…</span>
                <button
                  onClick={handleCandidateDoneSpeaking}
                  className="font-bold text-[#0F4C45] underline text-xs min-h-[36px] px-2 flex items-center cursor-pointer"
                >
                  Continue Now
                </button>
              </div>
            )}

            {/* Status & Primary Action Trigger */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
              <div className="text-xs text-[#566664] font-mono flex items-center gap-3 tabular-nums">
                {isRecording ? (
                  <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span>Microphone Live</span>
                  </span>
                ) : (
                  <span>Microphone Ready</span>
                )}
                <span>Elapsed: {speakingElapsedSec}s</span>
              </div>

              <button
                onClick={handleCandidateDoneSpeaking}
                disabled={isLoadingTurnFeedback}
                className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs sm:text-sm font-bold shadow-sm transition flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {isIdCheck ? (
                  <>
                    <Check className="w-4 h-4 text-[#F4A62A]" />
                    <span>{idCheckStep < 3 ? 'Confirm & Next ID Step →' : 'Complete Verification & Begin Part 1 →'}</span>
                  </>
                ) : isLoadingTurnFeedback ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing Speech…</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-[#F4A62A]" />
                    <span>Done Speaking (Get Feedback)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
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
            if (pendingTurnAdvance) {
              const fn = pendingTurnAdvance;
              setPendingTurnAdvance(null);
              fn();
            }
          }}
          onNextQuestion={() => {
            setShowTurnFeedbackModal(false);
            stopSpeech();
            if (pendingTurnAdvance) {
              const fn = pendingTurnAdvance;
              setPendingTurnAdvance(null);
              fn();
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
