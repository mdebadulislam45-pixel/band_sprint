import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  Timer,
  CheckCircle2,
  XCircle,
  Flag,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Volume2,
  BookOpen,
  Award,
  Archive,
  Save,
  HelpCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  Grid,
  Eye,
  Check,
  Copy,
  FileText,
  Shuffle,
  AlertTriangle,
  Wifi,
  WifiOff,
  Mic,
  MicOff,
  RefreshCw,
  VolumeX,
  Headphones
} from 'lucide-react';
import { soundManager } from '../utils/audioEffects';
import { addMistake } from '../utils/vaultStorage';
import { recordExamAttempt } from '../utils/userStorage';
import {
  MOCK_EXAM_SETS,
  MockExamSet,
  QuestionItem,
  getFreshMockExam,
  SPEAKING_TOPIC_BANK,
  SpeakingTopicSet,
  getExamListeningSection
} from '../data/mockExams';
import { recordSeenQuestion, recordSeenQuestions } from '../utils/antiRepetition';
import { speakBritish, stopSpeech } from '../utils/britishVoice';
import { IELTSAudioPlayer } from './audio/IELTSAudioPlayer';
import { audioManager, buildAudioId } from '../services/AudioManager';
import { testPersistenceService } from '../services/testPersistenceService';
import { AudioErrorBoundary } from './common/AudioErrorBoundary';
import { zeroRepetitionEngine } from '../services/ZeroRepetitionEngine';
import { InstantSpeakingFeedbackModal } from './speaking/InstantSpeakingFeedbackModal';
import {
  evaluateSingleSpeakingTurn
} from '../services/SpeakingEvaluationService';
import {
  SpeakingAnswerRecord,
  InstantSpeakingFeedback,
  DetailedGrammarError
} from '../types/speakingTypes';
import {
  isAnswerCorrect
} from '../utils/listeningAnswerEvaluator';
import {
  checkWritingWordThreshold
} from '../services/WritingEvaluationService';
import {
  calculateMockExamScores,
  evaluateQuestionResponse,
  getQuestionsForMistakeVault,
  deriveActiveListeningHeading,
  deriveActiveReadingHeading,
  extractActiveReadingPassage
} from '../utils/mockExamScoring';

import { QuestionProblemReportModal } from './common/QuestionProblemReportModal';

const MOCK_TEST_PERSISTENCE_KEY = 'ielts_sprint_live_mock_active_session';

interface LiveMockTestProps {
  onShowToast: (msg: string) => void;
  onNavigateToVault: () => void;
}

export const LiveMockTest: React.FC<LiveMockTestProps> = ({ onShowToast, onNavigateToVault }) => {
  // Test states: 'intro' | 'active' | 'review'
  const [examState, setExamState] = useState<'intro' | 'active' | 'review'>('intro');
  const [currentSection, setCurrentSection] = useState<'listening' | 'reading' | 'writing' | 'speaking'>('listening');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Student Problem Report Modal state
  const [reportedQuestionTarget, setReportedQuestionTarget] = useState<{
    id: number | string;
    module: 'reading' | 'listening' | 'writing' | 'speaking';
    examId?: string;
    examTitle?: string;
  } | null>(null);

  // Dynamic Original Practice Mock Sets generated when static bank is exhausted
  const [dynamicExamSets, setDynamicExamSets] = useState<MockExamSet[]>([]);

  // Selected Exam Set (Intelligently randomized on initial load with anti-repetition)
  const [selectedExamId, setSelectedExamId] = useState<string>(() => {
    const fresh = getFreshMockExam();
    return fresh.id;
  });

  const allAvailableExamSets = useMemo(
    () => [...MOCK_EXAM_SETS, ...dynamicExamSets],
    [dynamicExamSets]
  );

  const currentExam =
    allAvailableExamSets.find((e) => e.id === selectedExamId) || MOCK_EXAM_SETS[0];
  const questions: QuestionItem[] = currentExam.questions;
  const listeningAudioScript = currentExam.listeningScript;
  const readingPassage = currentExam.readingPassage;
  const writingPrompt = currentExam.writingPrompt;

  // Current Speaking Topic Set matching selectedExamId
  const speakingTopicSet: SpeakingTopicSet = useMemo(() => {
    const idx = MOCK_EXAM_SETS.findIndex(e => e.id === selectedExamId);
    if (idx >= 0 && SPEAKING_TOPIC_BANK[idx % SPEAKING_TOPIC_BANK.length]) {
      return SPEAKING_TOPIC_BANK[idx % SPEAKING_TOPIC_BANK.length];
    }
    return SPEAKING_TOPIC_BANK[0];
  }, [selectedExamId]);

  // Speaking Simulation & Instant Feedback States
  const [speakingAnswers, setSpeakingAnswers] = useState<SpeakingAnswerRecord[]>([]);
  const [speakingDrafts, setSpeakingDrafts] = useState<Record<string, string>>({});
  const [activeRecordingQId, setActiveRecordingQId] = useState<string | null>(null);
  const [currentSpeakingPart, setCurrentSpeakingPart] = useState<0 | 1 | 2 | 3>(0);
  const [currentSpeakingQIdx, setCurrentSpeakingQIdx] = useState(0);
  const [speakingTranscript, setSpeakingTranscript] = useState('');
  const [isSpeakingRecording, setIsSpeakingRecording] = useState(false);
  const [speakingSeconds, setSpeakingSeconds] = useState(0);
  const [cueCardPrepSeconds, setCueCardPrepSeconds] = useState(60);
  const [isCueCardPrepRunning, setIsCueCardPrepRunning] = useState(false);
  const [selectedSpeakingFeedback, setSelectedSpeakingFeedback] = useState<InstantSpeakingFeedback | null>(null);
  const [showSpeakingFeedbackModal, setShowSpeakingFeedbackModal] = useState(false);
  const [isEvaluatingSpeakingTurn, setIsEvaluatingSpeakingTurn] = useState(false);
  const [playingSpeakingModelId, setPlayingSpeakingModelId] = useState<string | null>(null);
  const [playingExaminerPromptId, setPlayingExaminerPromptId] = useState<string | null>(null);
  const [savedSpeakingMistakes, setSavedSpeakingMistakes] = useState<Record<string, boolean>>({});

  const updateSpeakingDraft = (qId: string, val: string) => {
    setSpeakingDrafts(prev => ({ ...prev, [qId]: val }));
    setSpeakingTranscript(val);
  };

  // Writing Instant Feedback State
  const [isEvaluatingWritingInstant, setIsEvaluatingWritingInstant] = useState(false);
  const [writingInstantFeedback, setWritingInstantFeedback] = useState<{
    grammaticalErrors: { observed: string; corrected: string; explanation: string; ruleCategory?: string }[];
    vocabUpgrades: { original: string; upgraded: string; explanation: string }[];
    modelBand8?: string;
    verdict?: string;
  } | null>(null);
  const [showWritingFeedbackCard, setShowWritingFeedbackCard] = useState(false);
  const [savedWritingMistakes, setSavedWritingMistakes] = useState<Record<string, boolean>>({});

  const recognitionRef = useRef<any>(null);
  const speakingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cueCardTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeRecordingQIdRef = useRef<string | null>(null);

  // Mobile segmented view: 'material' (Audio/Passage) or 'questions'
  const [mobileTab, setMobileTab] = useState<'material' | 'questions'>('material');

  // Full 4-skill mock timer: 165 minutes (2h 45m = 30m Listening + 60m Reading + 60m Writing [20m T1 + 40m T2] + 15m Speaking)
  const FULL_MOCK_DURATION_SECONDS = 165 * 60;
  const [timeLeft, setTimeLeft] = useState(FULL_MOCK_DURATION_SECONDS);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Candidate answers
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [flagged, setFlagged] = useState<{ [key: number]: boolean }>({});
  const [essayText, setEssayText] = useState('');
  const [task1Text, setTask1Text] = useState('');
  const [writingActiveTask, setWritingActiveTask] = useState<'task1' | 'task2'>('task1');

  // Submission tracking & review filters
  const [submissionReason, setSubmissionReason] = useState<'timer' | 'manual'>('manual');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'listening' | 'reading' | 'writing' | 'speaking' | 'incorrect'>('all');
  const [copiedModelEssay, setCopiedModelEssay] = useState(false);
  const [copiedTask1Model, setCopiedTask1Model] = useState(false);

  // Audio synthesizer state for listening section
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Show question palette drawer on mobile
  const [showPalette, setShowPalette] = useState(false);

  // Submit confirmation dialog state
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Network & Audio Error Handling States (without losing exam answers or timer state)
  const [examErrorState, setExamErrorState] = useState<{
    hasError: boolean;
    type: 'network' | 'audio' | 'microphone' | null;
    title: string;
    message: string;
  }>({
    hasError: false,
    type: null,
    title: '',
    message: ''
  });
  const [isMicReconnecting, setIsMicReconnecting] = useState(false);
  const [micStatusMessage, setMicStatusMessage] = useState<string | null>(null);

  const hasRestoredPersistenceRef = useRef(false);

  // 1. Initial State Restoration from IndexedDB / Storage mirror (restores both active and incomplete review sessions)
  useEffect(() => {
    let isMounted = true;
    testPersistenceService
      .getProgress(MOCK_TEST_PERSISTENCE_KEY)
      .then((saved) => {
        if (!isMounted || !saved) return;
        if ((saved.status === 'active' || saved.status === 'review') && saved.testSetId) {
          setSelectedExamId(saved.testSetId);
          setCurrentSection((saved.activeSection as any) || 'listening');
          setCurrentQuestionIndex(saved.currentQuestionIndex || 0);
          setAnswers((saved.answers as any) || {});
          setFlagged((saved.flagged as any) || {});
          setEssayText(saved.essayText || '');
          setTask1Text(saved.task1Text || '');
          setSpeakingAnswers(Array.isArray(saved.speakingAnswers) ? saved.speakingAnswers : []);
          if (saved.meta && saved.meta.speakingDrafts) {
            setSpeakingDrafts(saved.meta.speakingDrafts);
          }
          if (typeof saved.timeLeftSeconds === 'number' && saved.timeLeftSeconds >= 0) {
            setTimeLeft(saved.timeLeftSeconds);
          }

          if (saved.status === 'active') {
            setExamState('active');
            setIsTimerRunning(true);
            onShowToast('✓ Resumed active mock test from persistent storage.');
          } else if (saved.status === 'review') {
            setSubmissionReason(saved.submissionReason === 'timer' ? 'timer' : 'manual');
            setExamState('review');
            setIsTimerRunning(false);
            onShowToast('✓ Restored incomplete mock review session from persistent storage.');
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          hasRestoredPersistenceRef.current = true;
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Persistent Auto-Save on user progress, answer selection, speaking evaluations, and section switch
  useEffect(() => {
    if (!hasRestoredPersistenceRef.current) return;

    if (examState === 'active') {
      testPersistenceService.saveProgress({
        sessionId: MOCK_TEST_PERSISTENCE_KEY,
        testType: 'live_mock',
        testSetId: selectedExamId,
        activeSection: currentSection,
        currentQuestionIndex,
        answers,
        flagged,
        essayText,
        task1Text,
        speakingAnswers,
        timeLeftSeconds: timeLeft,
        isTimerRunning,
        status: examState,
        updatedAt: Date.now(),
        meta: {
          speakingDrafts
        }
      });
    } else if (examState === 'review') {
      const currentScores = calculateMockExamScores({
        questions,
        answers,
        essayText,
        task1Text,
        speakingAnswers,
        format: currentExam.format,
        speakingTopicSet
      });
      if (currentScores.isCompleteFullMock) {
        testPersistenceService.clearProgress(MOCK_TEST_PERSISTENCE_KEY);
      } else {
        testPersistenceService.saveProgress({
          sessionId: MOCK_TEST_PERSISTENCE_KEY,
          testType: 'live_mock',
          testSetId: selectedExamId,
          activeSection: currentSection,
          currentQuestionIndex,
          answers,
          flagged,
          essayText,
          task1Text,
          speakingAnswers,
          submissionReason,
          timeLeftSeconds: timeLeft,
          isTimerRunning: false,
          status: 'review',
          updatedAt: Date.now(),
          meta: {
            speakingDrafts,
            isCompleteFullMock: false,
            incompleteSections: currentScores.incompleteSections
          }
        });
      }
    }
  }, [
    examState,
    selectedExamId,
    currentSection,
    currentQuestionIndex,
    answers,
    flagged,
    essayText,
    task1Text,
    speakingAnswers,
    submissionReason,
    timeLeft,
    isTimerRunning,
    speakingTopicSet
  ]);

  // Online / Offline & Audio error listener
  useEffect(() => {
    const handleOffline = () => {
      if (examState === 'active') {
        setExamErrorState({
          hasError: true,
          type: 'network',
          title: 'Internet Connection Interrupted',
          message: 'Your network went offline. Your answers, essays, and timer have been securely frozen in browser storage.'
        });
      }
    };

    const handleOnline = () => {
      onShowToast('🌐 Network reconnected! Exam session is active.');
      if (examErrorState.type === 'network') {
        setExamErrorState({ hasError: false, type: null, title: '', message: '' });
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [examState, examErrorState.type]);

  // Reconnect Microphone handler
  const handleReconnectMicrophone = async () => {
    setIsMicReconnecting(true);
    setMicStatusMessage('Requesting microphone permissions...');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone API not supported on this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release test stream immediately
      stream.getTracks().forEach(track => track.stop());
      soundManager.playSuccess();
      setMicStatusMessage('Microphone successfully verified and connected!');
      onShowToast('🎙️ Microphone connected! Audio telemetry resumed.');
      setTimeout(() => {
        setIsMicReconnecting(false);
        setMicStatusMessage(null);
        setExamErrorState({ hasError: false, type: null, title: '', message: '' });
      }, 1000);
    } catch (err: any) {
      soundManager.playWarning();
      setIsMicReconnecting(false);
      setMicStatusMessage('Microphone access was denied or hardware not found.');
      onShowToast('⚠️ Could not access microphone. Check browser permissions.');
    }
  };

  // Resume Exam handler without state loss
  const handleResumeExam = () => {
    setExamErrorState({ hasError: false, type: null, title: '', message: '' });
    soundManager.playSuccess();
    onShowToast('▶ Exam resumed. Continuing from your current question.');
    if (!isTimerRunning && timeLeft > 0) {
      setIsTimerRunning(true);
    }
    // Attempt audio retry if listening section
    if (currentSection === 'listening') {
      try {
        handlePlayAudio();
      } catch {}
    }
  };

  // Generate or select a guaranteed-unique exam set with Zero-Repetition Engine
  const handlePickRandomExam = () => {
    audioManager.reset('mock_test_switch');
    stopSpeech();
    setIsPlayingAudio(false);
    const uniqueRes = zeroRepetitionEngine.getUniqueMockExamSet(selectedExamId);
    const chosen = uniqueRes.examSet;
    if (uniqueRes.isNewlySynthesized) {
      setDynamicExamSets((prev) => [...prev, chosen]);
    }
    setSelectedExamId(chosen.id);
    setAnswers({});
    setFlagged({});
    setEssayText('');
    setTask1Text('');
    setSpeakingAnswers([]);
    testPersistenceService.clearProgress(MOCK_TEST_PERSISTENCE_KEY);
    soundManager.playBeep(650, 0.08);
    onShowToast(uniqueRes.statusMessage);
  };

  // Timer handling
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === 600) onShowToast('⏳ 10 minutes remaining in live mock exam!');
          if (prev === 60) {
            soundManager.playChime10s();
            onShowToast('⚠️ 1 minute remaining! Finalize your answers.');
          }
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsTimerRunning(false);
            soundManager.playChimeTimeUp();
            handleSubmitExam('timer');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopSpeech();
    };
  }, [isTimerRunning]);

  const handleStartExam = () => {
    recordSeenQuestion(currentExam.id);
    recordSeenQuestions(questions.map(q => `${currentExam.id}_q_${q.id}`));
    setExamState('active');
    setIsTimerRunning(true);
    setCurrentSection('listening');
    setCurrentQuestionIndex(0);
    soundManager.playSuccess();
    onShowToast(`Live Exam Started: ${currentExam.title}! Clock is running.`);
  };

  // Clean up audio on unmount or section changes
  useEffect(() => {
    return () => {
      audioManager.reset('mock_test_unmount');
      stopSpeech();
    };
  }, []);

  useEffect(() => {
    if (currentSection !== 'listening') {
      audioManager.reset('mock_test_section_change');
      setIsPlayingAudio(false);
    }
  }, [currentSection]);

  const listeningQuestionsForAudio = questions.filter(q => q.section === 'listening');
  const currentQForAudio = questions[currentQuestionIndex];
  const lIdxForAudio = currentQForAudio ? listeningQuestionsForAudio.findIndex(q => q.id === currentQForAudio.id) : 0;
  const activeSecForAudio = (lIdxForAudio >= 0 && listeningQuestionsForAudio.length >= 4
    ? Math.min(4, Math.floor(lIdxForAudio / Math.ceil(listeningQuestionsForAudio.length / 4)) + 1)
    : 1) as 1 | 2 | 3 | 4;
  const activeSecDetail = getExamListeningSection(currentExam, activeSecForAudio);
  const mockAudioId = buildAudioId(`${currentExam.id}_sec${activeSecForAudio}`, activeSecDetail.script || currentExam.listeningScript);

  const handlePlayAudio = () => {
    if (isPlayingAudio) {
      audioManager.pause();
      setIsPlayingAudio(false);
      return;
    }

    const sectionDetail = activeSecDetail;
    const sectionScript = sectionDetail.script || currentExam.listeningScript;
    const sectionAudioId = `${currentExam.id}_sec${activeSecForAudio}`;

    setIsPlayingAudio(true);
    soundManager.playBeep(520, 0.1);
    audioManager.playCustomAudio(sectionAudioId, sectionScript, {
      speakerId: 'speaker_04',
      allowReplay: true,
      onEnd: () => setIsPlayingAudio(false),
      onError: () => {
        setIsPlayingAudio(false);
        onShowToast('Audio playback encountered an issue.');
        setExamErrorState({
          hasError: true,
          type: 'audio',
          title: 'Audio Playback Interrupted',
          message: 'The Practice listening audio track could not be loaded due to an audio stream or device issue. Your answers are completely intact.'
        });
      }
    });
  };

  const handleSelectAnswer = (qId: number, val: string) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
    soundManager.playBeep(650, 0.05);
  };

  const handleToggleFlag = (qId: number) => {
    setFlagged(prev => ({ ...prev, [qId]: !prev[qId] }));
    soundManager.playBeep(450, 0.05);
  };

  const handleSubmitExam = (reason: 'timer' | 'manual' = 'manual') => {
    if (examState === 'review') return;
    setIsTimerRunning(false);
    stopSpeech();
    setIsPlayingAudio(false);
    setSubmissionReason(reason);
    setExamState('review');
    soundManager.playSuccess();

    // Record attempt: only persist as a completed 'full_mock' when all 4 skills (and both Writing tasks) are complete.
    try {
      const currentScores = calculateScores();
      const writingTasksCompleted =
        (currentScores.isTask1Complete ? 1 : 0) + (currentScores.isTask2Complete ? 1 : 0);

      if (currentScores.isCompleteFullMock && currentScores.overall !== null) {
        recordExamAttempt({
          examType: 'full_mock',
          overallBand: currentScores.overall,
          listeningBand: currentScores.lBand,
          readingBand: currentScores.rBand,
          writingBand: currentScores.wBand,
          speakingBand: currentScores.sBand,
          wordCount: currentScores.wordCount + currentScores.task1WordCount,
          submissionType: reason,
          correctCount: currentScores.listeningCorrect + currentScores.readingCorrect,
          totalQuestions: questions.length,
          completedSkills: {
            listening: true,
            reading: true,
            writing: true,
            speaking: true
          },
          speakingAssessmentStatus: currentScores.speakingAssessmentStatus,
          speakingPronunciationObservable: currentScores.speakingPronunciationObservable,
          incompleteSkills: [],
          writingTasksCompleted
        });
      } else {
        const hasAnyAttempt =
          currentScores.listeningAttempted > 0 ||
          currentScores.readingAttempted > 0 ||
          currentScores.isTask1Valid ||
          currentScores.isTask2Valid ||
          currentScores.speakingEvaluatedCount > 0 ||
          currentScores.speakingTranscriptOnlyCount > 0;

        if (hasAnyAttempt) {
          recordExamAttempt({
            examType: 'incomplete_mock',
            overallBand: null,
            listeningBand: currentScores.isListeningComplete ? currentScores.lBand : null,
            readingBand: currentScores.isReadingComplete ? currentScores.rBand : null,
            writingBand: currentScores.isWritingComplete ? currentScores.wBand : null,
            speakingBand: currentScores.isSpeakingComplete ? currentScores.sBand : null,
            wordCount: currentScores.wordCount + currentScores.task1WordCount,
            submissionType: reason,
            correctCount: currentScores.listeningCorrect + currentScores.readingCorrect,
            totalQuestions: questions.length,
            completedSkills: {
              listening: currentScores.isListeningComplete,
              reading: currentScores.isReadingComplete,
              writing: currentScores.isWritingComplete,
              speaking: currentScores.isSpeakingComplete
            },
            speakingAssessmentStatus: currentScores.speakingAssessmentStatus,
            speakingPronunciationObservable: currentScores.speakingPronunciationObservable,
            incompleteSkills: currentScores.incompleteSkills,
            writingTasksCompleted
          });
        }
      }
    } catch (e) {
      console.error('Failed to record exam history to profile', e);
    }

    if (reason === 'timer') {
      onShowToast('⏱️ Time Expired! Exam submitted automatically. Review your results below.');
    } else {
      onShowToast('🏁 Exam Submitted! Review your diagnostic feedback below.');
    }
  };

  // Production Psychometric Score Calculations delegated to reusable pure scoring module
  const calculateScores = () =>
    calculateMockExamScores({
      questions,
      answers,
      essayText,
      task1Text,
      speakingAnswers,
      format: currentExam.format,
      speakingTopicSet
    });

  const results = calculateScores();

  // Speaking Recording Handlers
  const startSpeakingRecording = (qId?: string) => {
    stopSpeech();
    setIsSpeakingRecording(true);
    if (qId) {
      activeRecordingQIdRef.current = qId;
      setActiveRecordingQId(qId);
    }
    setSpeakingTranscript(qId && speakingDrafts[qId] ? speakingDrafts[qId] : '');
    setSpeakingSeconds(0);
    soundManager.playBeep(520, 0.08);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-GB';

        recognition.onresult = (event: any) => {
          let full = '';
          for (let i = 0; i < event.results.length; i++) {
            full += event.results[i][0].transcript + ' ';
          }
          const text = full.trim();
          setSpeakingTranscript(text);
          if (activeRecordingQIdRef.current) {
            const targetQId = activeRecordingQIdRef.current;
            setSpeakingDrafts(prev => ({ ...prev, [targetQId]: text }));
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition warning:', e);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('Could not launch speech recognition:', e);
      }
    }

    if (speakingTimerRef.current) clearInterval(speakingTimerRef.current);
    speakingTimerRef.current = setInterval(() => {
      setSpeakingSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopSpeakingRecording = () => {
    setIsSpeakingRecording(false);
    if (speakingTimerRef.current) clearInterval(speakingTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    soundManager.playBeep(440, 0.08);
  };

  const handlePlayExaminerPrompt = (promptId: string, text: string) => {
    if (playingExaminerPromptId === promptId) {
      stopSpeech();
      setPlayingExaminerPromptId(null);
      return;
    }
    stopSpeech();
    setPlayingExaminerPromptId(promptId);
    soundManager.playBeep(600, 0.05);
    speakBritish(text, {
      speakerId: 'speaker_01',
      rate: 0.95,
      onEnd: () => setPlayingExaminerPromptId(null),
      onError: () => setPlayingExaminerPromptId(null)
    });
  };

  const handleToggleCueCardPrep = () => {
    if (isCueCardPrepRunning) {
      setIsCueCardPrepRunning(false);
      if (cueCardTimerRef.current) clearInterval(cueCardTimerRef.current);
      return;
    }
    setIsCueCardPrepRunning(true);
    soundManager.playBeep(640, 0.08);
    if (cueCardPrepSeconds <= 0) setCueCardPrepSeconds(60);

    if (cueCardTimerRef.current) clearInterval(cueCardTimerRef.current);
    cueCardTimerRef.current = setInterval(() => {
      setCueCardPrepSeconds(prev => {
        if (prev <= 1) {
          setIsCueCardPrepRunning(false);
          if (cueCardTimerRef.current) clearInterval(cueCardTimerRef.current);
          soundManager.playSuccess();
          onShowToast('1-minute prep finished! You may now begin speaking for 2 minutes.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Instant AI Feedback for Speaking Turn
  const handleEvaluateSpeakingTurn = async (
    qId: string,
    part: 1 | 2 | 3,
    promptText: string,
    topicName: string,
    bulletPoints: string[] = []
  ) => {
    if (isSpeakingRecording) {
      stopSpeakingRecording();
    }

    const transcriptToEvaluate = (speakingDrafts[qId] || speakingTranscript || '').trim();
    const duration = Math.max(speakingSeconds, 1);
    const words = transcriptToEvaluate ? transcriptToEvaluate.split(/\s+/).filter(Boolean).length : 0;
    const wpm = duration > 0 && words > 0 ? Math.round((words / duration) * 60) : 0;

    const record: SpeakingAnswerRecord = {
      questionId: qId,
      part,
      topic: topicName,
      questionText: promptText,
      transcript: transcriptToEvaluate,
      startTime: Date.now() - duration * 1000,
      endTime: Date.now(),
      durationSec: duration,
      wordCount: words,
      wordsPerMinute: wpm,
      pauseCount: null,
      longPauseCount: null,
      fillerCount: (transcriptToEvaluate.match(/\b(um|uh|er|like)\b/gi) || []).length,
      detectedFillers: transcriptToEvaluate.match(/\b(um|uh|er|like)\b/gi) || []
    };

    setIsEvaluatingSpeakingTurn(true);
    soundManager.playBeep(580, 0.08);

    try {
      const feedback = await evaluateSingleSpeakingTurn(record, bulletPoints);
      record.instantFeedback = feedback;
      setSelectedSpeakingFeedback(feedback);
      setSpeakingAnswers(prev => [...prev.filter(a => a.questionId !== qId), record]);
      setShowSpeakingFeedbackModal(true);
      if (feedback.isValidAttempt === false || feedback.assessmentStatus === 'unavailable' || feedback.assessmentStatus === 'insufficient_evidence') {
        soundManager.playBeep(360, 0.12);
        onShowToast(feedback.feedbackEn || feedback.error || 'AI speaking evaluation unavailable — no score generated.');
      } else {
        soundManager.playSuccess();
        if (typeof feedback.overallBand === 'number') {
          onShowToast(`Evaluated: Band ${feedback.overallBand.toFixed(1)} with Instant Feedback!`);
        } else if (typeof feedback.partialThreeCriterionIndex === 'number') {
          onShowToast(`Partial Transcript Feedback (3/4 Criteria): Index ${feedback.partialThreeCriterionIndex.toFixed(1)} (Pronunciation unassessed)`);
        } else {
          onShowToast('Speaking turn feedback generated.');
        }
      }
    } catch {
      const unavailableFeedback: InstantSpeakingFeedback = {
        questionId: record.questionId,
        part: record.part,
        topic: record.topic,
        questionText: record.questionText,
        candidateTranscript: record.transcript,
        durationSec: record.durationSec,
        wordsPerMinute: record.wordsPerMinute,
        isValidAttempt: false,
        assessmentStatus: 'unavailable',
        evidenceMode: 'unavailable',
        pronunciationObservable: false,
        isPartialAssessment: false,
        unassessedCriteria: ['fluency', 'lexical', 'grammar', 'pronunciation'],
        overallBand: null,
        partialThreeCriterionIndex: null,
        estimatedBand: null,
        wordCount: record.wordCount,
        feedbackTitle: 'AI Speaking Evaluation Unavailable',
        feedbackEn: 'The AI speaking evaluator could not be reached. No band score was generated. Please sign in and retry.',
        feedbackBn: 'AI স্পিকিং ইভালুয়েটরে সংযোগ করা যায়নি। কোনো ব্যান্ড স্কোর তৈরি করা হয়নি।',
        error: 'AI speaking evaluation unavailable.',
        canRetry: true,
        criteria: { fc: null, lr: null, gra: null, pr: null },
        estimatedBands: { fluency: null, lexical: null, grammar: null, pronunciation: null, overall: null },
        grammaticalErrors: [],
        pronunciation: {
          clarityBand: null,
          cadenceWpm: record.wordsPerMinute,
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
      };
      record.instantFeedback = unavailableFeedback;
      setSelectedSpeakingFeedback(unavailableFeedback);
      setSpeakingAnswers(prev => [...prev.filter(a => a.questionId !== qId), record]);
      setShowSpeakingFeedbackModal(true);
      soundManager.playBeep(360, 0.12);
      onShowToast('AI speaking evaluation unavailable — no score generated.');
    } finally {
      setIsEvaluatingSpeakingTurn(false);
    }
  };

  const formatSpeakingTurnBadge = (fb: InstantSpeakingFeedback): string => {
    if (fb.isValidAttempt === false || fb.assessmentStatus === 'unavailable' || fb.assessmentStatus === 'insufficient_evidence') {
      return fb.assessmentStatus === 'insufficient_evidence' ? 'Insufficient Speech' : 'Unavailable';
    }
    if (typeof fb.overallBand === 'number') {
      return `✓ Evaluated: Band ${fb.overallBand.toFixed(1)}`;
    }
    if (typeof fb.partialThreeCriterionIndex === 'number') {
      return `Partial 3/4 Index: ${fb.partialThreeCriterionIndex.toFixed(1)}`;
    }
    return 'Unassessed';
  };

  const handlePlaySpeakingModelAudio = (id: string, text: string) => {
    if (playingSpeakingModelId === id) {
      stopSpeech();
      setPlayingSpeakingModelId(null);
      return;
    }
    stopSpeech();
    setPlayingSpeakingModelId(id);
    soundManager.playBeep(640, 0.05);
    speakBritish(text, {
      speakerId: 'speaker_04',
      rate: 0.96,
      onEnd: () => setPlayingSpeakingModelId(null),
      onError: () => setPlayingSpeakingModelId(null)
    });
  };

  const handleSaveSpeakingTurnMistake = (err: DetailedGrammarError, key: string) => {
    if (savedSpeakingMistakes[key]) return;
    addMistake({
      module: 'speaking',
      title: `Speaking Grammar: ${err.ruleCategory}`,
      userAnswer: err.observed,
      correctAnswer: err.corrected,
      explanation: err.explanation
    });
    setSavedSpeakingMistakes(prev => ({ ...prev, [key]: true }));
    soundManager.playSuccess();
    onShowToast(`Saved "${err.corrected}" to Mistake Vault!`);
  };

  // Instant AI Feedback for Writing Task 2 (Strictly guarded by 50-word Task 2 minimum threshold)
  const handleEvaluateWritingInstant = async () => {
    const gate = checkWritingWordThreshold(essayText, 'task2');
    if (!gate.isValidAttempt) {
      soundManager.playBeep(360, 0.1);
      setWritingInstantFeedback({
        grammaticalErrors: [],
        vocabUpgrades: [],
        modelBand8: '',
        verdict: `${gate.feedbackEn} | ${gate.feedbackBn}`
      });
      setShowWritingFeedbackCard(true);
      onShowToast(gate.feedbackTitle);
      return;
    }

    const wordCount = gate.wordCount;
    setIsEvaluatingWritingInstant(true);
    soundManager.playBeep(580, 0.08);

    try {
      const token = localStorage.getItem('ielts_session_token_v2');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/evaluate-writing', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          essayText,
          prompt: writingPrompt,
          testType: 'task2'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setWritingInstantFeedback({
          grammaticalErrors: data.grammaticalErrors || [],
          vocabUpgrades: data.vocabUpgrades || [],
          modelBand8: data.betterAnswerBand8 || writingModelEssay,
          verdict: data.verdict || 'Grammar and lexical review completed.'
        });
        setShowWritingFeedbackCard(true);
        soundManager.playSuccess();
        onShowToast('Instant grammar & Band 8.5+ analysis generated!');
        setIsEvaluatingWritingInstant(false);
        return;
      }
    } catch {}

    // Algorithmic Fallback — only flag real errors present in essayText
    const grammarErrors: { observed: string; corrected: string; explanation: string; ruleCategory?: string }[] = [];
    if (/it make\b/i.test(essayText)) {
      grammarErrors.push({
        observed: 'it make',
        corrected: 'it makes',
        explanation: 'Subject-verb agreement: third-person singular subjects take "-s" in present simple.',
        ruleCategory: 'Subject-Verb Agreement'
      });
    }
    if (/people is\b/i.test(essayText)) {
      grammarErrors.push({
        observed: 'people is',
        corrected: 'people are',
        explanation: '"People" is a plural collective noun requiring the plural verb "are".',
        ruleCategory: 'Subject-Verb Agreement'
      });
    }
    if (/they has\b/i.test(essayText)) {
      grammarErrors.push({
        observed: 'they has',
        corrected: 'they have',
        explanation: 'Plural pronoun "they" requires "have" instead of third-person singular "has".',
        ruleCategory: 'Subject-Verb Agreement'
      });
    }

    const vocabOpportunities = [
      { regex: /\btaking a gap year\b/i, original: 'taking a gap year', upgraded: 'undertaking an experiential sabbatical', explanation: 'Replaces colloquial phrasing with formal academic vocabulary.' },
      { regex: /\blearn practical life skills\b/i, original: 'learn practical life skills', upgraded: 'cultivate pragmatic acumen and occupational discernment', explanation: 'Demonstrates Band 9.0 lexical resource precision.' },
      { regex: /\bhelps get a good job\b/i, original: 'helps get a good job', upgraded: 'substantially bolsters post-tertiary employability', explanation: 'Elevates casual expression to high-tier academic discourse.' },
      { regex: /\ba lot of\b/i, original: 'a lot of', upgraded: 'a substantial proportion of', explanation: 'Replaces informal quantifier with academic register.' },
      { regex: /\bvery important\b/i, original: 'very important', upgraded: 'of paramount importance', explanation: 'Replaces "very + adjective" with formal C1 register.' },
      { regex: /\bbig (problem|impact)\b/i, original: 'big problem/impact', upgraded: 'pressing impediment / profound ramification', explanation: 'Elevates everyday phrasing into academic discourse.' }
    ];
    const realUpgrades = vocabOpportunities
      .filter(item => item.regex.test(essayText))
      .map(item => ({ original: item.original, upgraded: item.upgraded, explanation: item.explanation }));

    setWritingInstantFeedback({
      grammaticalErrors: grammarErrors,
      vocabUpgrades: realUpgrades,
      modelBand8: writingModelEssay,
      verdict: `Assessed ${wordCount} words against official descriptors. ${realUpgrades.length > 0 ? 'Review identified vocabulary upgrades.' : 'Grammar checked against candidate draft.'}`
    });
    setShowWritingFeedbackCard(true);
    soundManager.playSuccess();
    onShowToast('Instant grammar & Band 8.5+ analysis generated!');
    setIsEvaluatingWritingInstant(false);
  };

  const handleSaveWritingMistake = (item: { observed: string; corrected: string; explanation: string; ruleCategory?: string }, idx: number) => {
    if (savedWritingMistakes[`w_err_${idx}`]) return;
    addMistake({
      module: 'writing',
      title: `Writing Grammar: ${item.ruleCategory || 'Grammar Rule'}`,
      userAnswer: item.observed,
      correctAnswer: item.corrected,
      explanation: item.explanation
    });
    setSavedWritingMistakes(prev => ({ ...prev, [`w_err_${idx}`]: true }));
    soundManager.playSuccess();
    onShowToast(`Saved "${item.corrected}" to Mistake Vault!`);
  };

  // Send all missed questions to Mistake Vault using the unified production answer evaluator
  const handleSyncAllErrorsToVault = () => {
    const mistakesToSync = getQuestionsForMistakeVault(questions, answers, false);
    mistakesToSync.forEach(item => {
      addMistake({
        module: item.module,
        title: item.title,
        userAnswer: item.userAnswer,
        correctAnswer: item.correctAnswer,
        explanation: item.explanation
      });
    });

    soundManager.playSuccess();
    onShowToast(`Successfully synced ${mistakesToSync.length} errors to your Mistake Vault!`);
  };

  const currentQ = questions[currentQuestionIndex];

  // ================= RENDER INTRO SCREEN =================
  if (examState === 'intro') {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 sm:p-10 shadow-xl relative overflow-hidden box-border">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-700/60 border border-blue-500/40 text-blue-200 text-xs font-bold font-mono">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                {currentExam.badge}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-mono font-bold">
                {currentExam.title}
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight break-words">
              IELTS Live Mock Test & Diagnostic Suite
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Experience authentic computer-delivered test conditions with natural British voice audio synthesis, academic reading, a timed essay console, and automated Practice band scoring.
            </p>

            {/* Exam Set Selector Pills */}
            <div className="pt-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200 mb-2 font-mono">
                Choose Exam Set or Let System Pick Randomly:
              </div>
              <div className="flex flex-wrap gap-2.5">
                {allAvailableExamSets.map((exam) => (
                  <button
                    key={exam.id}
                    onClick={() => {
                      audioManager.reset('mock_test_select');
                      stopSpeech();
                      setIsPlayingAudio(false);
                      setSelectedExamId(exam.id);
                      setAnswers({});
                      setFlagged({});
                      setEssayText('');
                      setTask1Text('');
                      setSpeakingAnswers([]);
                      setTimeLeft(FULL_MOCK_DURATION_SECONDS);
                      testPersistenceService.clearProgress(MOCK_TEST_PERSISTENCE_KEY);
                      soundManager.playBeep(550, 0.05);
                      onShowToast(`Selected: ${exam.title} (${exam.level})`);
                    }}
                    className={`min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 border active:scale-95 ${
                      selectedExamId === exam.id
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-extrabold ring-2 ring-amber-300/30'
                        : 'bg-white/10 hover:bg-white/20 text-blue-100 border-white/20'
                    }`}
                  >
                    <span>{exam.title}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        selectedExamId === exam.id ? 'bg-slate-950 text-amber-300' : 'bg-white/20 text-white'
                      }`}
                    >
                      {exam.level}
                    </span>
                  </button>
                ))}
                <button
                  onClick={handlePickRandomExam}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white font-bold text-xs border border-purple-400/40 transition flex items-center gap-2 active:scale-95 shadow-sm"
                  title="Intelligently Pick a Fresh Unseen Exam Set"
                >
                  <Shuffle className="w-3.5 h-3.5 text-amber-300" />
                  <span>🎲 Fresh Test (Unseen First)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-white/10 border border-white/10 text-center">
                <div className="text-[10px] text-blue-200 uppercase font-semibold">Listening</div>
                <div className="font-mono text-xs sm:text-base font-bold text-amber-300">
                  {currentExam.questions.filter(q => q.section === 'listening').length} Questions
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white/10 border border-white/10 text-center">
                <div className="text-[10px] text-blue-200 uppercase font-semibold">Reading</div>
                <div className="font-mono text-xs sm:text-base font-bold text-emerald-300">
                  {currentExam.questions.filter(q => q.section === 'reading').length} {currentExam.format === 'General Training' ? 'GT Qs' : 'Academic Qs'}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white/10 border border-white/10 text-center">
                <div className="text-[10px] text-blue-200 uppercase font-semibold">Writing</div>
                <div className="font-mono text-xs sm:text-base font-bold text-purple-300">Task 1 & Task 2</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/10 border border-white/10 text-center">
                <div className="text-[10px] text-blue-200 uppercase font-semibold">Speaking</div>
                <div className="font-mono text-xs sm:text-base font-bold text-rose-300">Parts 1-3 AI Feedback</div>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap gap-3">
              <button
                onClick={handleStartExam}
                className="min-h-[44px] w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm shadow-lg transition flex items-center justify-center gap-2 active:scale-95"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Begin Timed Live Examination ({currentExam.title})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile-Friendly Instructions Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-700" />
            Official Candidate Testing Directives
          </h3>
          <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>
              <span><strong>Timed Lifecycle:</strong> The full 4-skill mock examination is set to 2 hours 45 minutes (165 minutes: Listening ~30m, Reading 60m, Writing 60m [Task 1 ~20m · Task 2 ~40m], Speaking 11–14m). The countdown clock runs continuously.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>
              <span><strong>All 4 IELTS Skills:</strong> Practice Listening (4 Sections, 40 Qs), Reading (3 Passages, 40 Qs), Writing Task 1 &amp; Task 2, and live Speaking Simulation (Parts 1–3) with Instant Feedback.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>
              <span><strong>Instant Feedback (Band 8+):</strong> In Writing and Speaking, click the instant feedback buttons to detect grammatical errors, get pronunciation phonetics, and unlock Band 8+ Practice model answers.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>
              <span><strong>Automated Post-Exam Review:</strong> When submitted, all answers are scored against Practice keys with line-by-line evidence, and mistakes can be logged to your Mistake Vault with one click.</span>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // ================= RENDER LIVE ACTIVE EXAM =================
  if (examState === 'active') {
    return (
      <div className="space-y-4 pb-20 sm:pb-8 animate-fadeIn">
        {/* Top Floating Exam Status Bar */}
        <div className="sticky top-16 z-30 bg-slate-900 text-white rounded-2xl p-3 sm:p-4 shadow-lg flex items-center justify-between gap-3 border border-slate-800">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Section Badges */}
            <div className="flex gap-1">
              {(['listening', 'reading', 'writing', 'speaking'] as const).map(sec => (
                <button
                  key={sec}
                  onClick={() => {
                    setCurrentSection(sec);
                    if (sec === 'listening') setCurrentQuestionIndex(0);
                    if (sec === 'reading') {
                      const rIdx = questions.findIndex(q => q.section === 'reading');
                      setCurrentQuestionIndex(rIdx !== -1 ? rIdx : 0);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold capitalize transition ${currentSection === sec ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                >
                  {sec === 'speaking' ? '🎙️ Speaking' : sec}
                </button>
              ))}
            </div>

            {/* Question Palette Trigger for Mobile */}
            <button
              onClick={() => setShowPalette(!showPalette)}
              className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5"
            >
              <Grid className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Palette</span>
              <span className="font-mono text-[10px]">({Object.keys(answers).length}/{questions.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Simulation Button for Testing Timer Auto-Submission */}
            <button
              onClick={() => {
                setTimeLeft(3);
                onShowToast('⚡ Timer fast-forwarded: 3 seconds remaining...');
              }}
              title="Fast-forward timer to 3s to test auto-submission"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-bold transition"
            >
              <span>⚡ Expire in 3s</span>
            </button>

            {/* Timer Display */}
            <div className="flex items-center gap-1.5 font-mono text-sm sm:text-base font-bold text-amber-400">
              <Timer className="w-4 h-4" />
              <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
            </div>

            {/* Submit Exam Button */}
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition"
            >
              Finish & Review
            </button>
          </div>
        </div>

        {/* In-App Submit Confirmation Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base">Submit Live Mock Exam?</h3>
                </div>
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="text-slate-400 hover:text-slate-700 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Are you ready to submit your answers? You will immediately receive a comprehensive Practice diagnostic review comparing your responses side-by-side with recommended model answers.
              </p>

              <div className="grid grid-cols-3 gap-2 py-1">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Answered</div>
                  <div className="font-mono text-sm font-bold text-blue-700">{Object.keys(answers).length}/{questions.length}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Flagged</div>
                  <div className="font-mono text-sm font-bold text-amber-600">{Object.values(flagged).filter(Boolean).length}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Essay Words</div>
                  <div className="font-mono text-sm font-bold text-purple-700">{essayText.trim().split(/\s+/).filter(Boolean).length}</div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Keep Testing
                </button>
                <button
                  onClick={() => {
                    setShowSubmitModal(false);
                    handleSubmitExam('manual');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                >
                  Confirm & Grade
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Robust Error Handling UI Modal (Silent Network / Audio / Microphone Interruption Recovery) */}
        {examErrorState.hasError && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border-2 border-rose-300 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  {examErrorState.type === 'network' ? (
                    <WifiOff className="w-6 h-6 animate-pulse" />
                  ) : examErrorState.type === 'microphone' ? (
                    <MicOff className="w-6 h-6 text-rose-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-rose-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
                    System Interruption Guard
                  </div>
                  <h3 className="text-lg font-black text-slate-900 leading-snug">
                    {examErrorState.title || 'Exam Stream Interruption Detected'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {examErrorState.message ||
                      'A temporary interruption occurred in audio or network connectivity. Your candidate answers and countdown clock are completely safe and preserved.'}
                  </p>
                </div>
              </div>

              {/* Preserved Status Snapshot */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Exam Timer</div>
                  <div className="font-mono font-bold text-amber-600">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Saved Answers</div>
                  <div className="font-mono font-bold text-blue-700">{Object.keys(answers).length}/{questions.length}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Current Section</div>
                  <div className="font-mono font-bold capitalize text-slate-800">{currentSection}</div>
                </div>
              </div>

              {micStatusMessage && (
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium flex items-center gap-2">
                  <RefreshCw className={`w-3.5 h-3.5 ${isMicReconnecting ? 'animate-spin' : ''}`} />
                  <span>{micStatusMessage}</span>
                </div>
              )}

              {/* Primary Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  onClick={handleReconnectMicrophone}
                  disabled={isMicReconnecting}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-2 border border-slate-200 disabled:opacity-50"
                >
                  <Mic className="w-4 h-4 text-slate-600" />
                  <span>{isMicReconnecting ? 'Testing Mic...' : 'Reconnect Microphone'}</span>
                </button>

                <button
                  onClick={handleResumeExam}
                  className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Resume Exam</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Question Palette Drawer Modal / Dropdown */}
        {showPalette && (
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
              <span>Question Palette & Status Overview</span>
              <button onClick={() => setShowPalette(false)} className="text-slate-400 hover:text-slate-700">
                ✕ Close
              </button>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isFlagged = !!flagged[q.id];
                const isCurrent = currentQuestionIndex === idx;

                let bg = 'bg-slate-100 border-slate-300 text-slate-700';
                if (isCurrent) bg = 'ring-2 ring-blue-600 bg-blue-50 text-blue-900 border-blue-600 font-bold';
                else if (isFlagged) bg = 'bg-amber-100 border-amber-400 text-amber-900 font-bold';
                else if (isAnswered) bg = 'bg-blue-600 border-blue-700 text-white font-bold';

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentSection(q.section);
                      setCurrentQuestionIndex(idx);
                      setShowPalette(false);
                      setMobileTab('questions');
                    }}
                    className={`py-2 rounded-xl text-xs font-mono border text-center transition flex flex-col items-center justify-center relative ${bg}`}
                  >
                    <span>{q.id}</span>
                    {isFlagged && <span className="w-1.5 h-1.5 rounded-full bg-amber-600 absolute top-1 right-1"></span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= SECTION: LISTENING OR READING ================= */}
        {(currentSection === 'listening' || currentSection === 'reading') && (
          <div>
            {/* Mobile Tab Segmented Switcher (Visible on small screens) */}
            <div className="flex sm:hidden gap-1 p-1 bg-slate-200 rounded-xl mb-3">
              <button
                onClick={() => setMobileTab('material')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${mobileTab === 'material' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
              >
                {currentSection === 'listening' ? '🎧 Audio Player' : '📄 Reading Passage'}
              </button>
              <button
                onClick={() => setMobileTab('questions')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${mobileTab === 'questions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
              >
                ✏️ Questions ({currentQuestionIndex + 1}/{questions.length})
              </button>
            </div>

            {/* Main Split-Screen Grid (Side-by-Side on desktop, Tabs on mobile) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Test Material (Audio Controls or Reading Passage) */}
              <div className={`lg:col-span-6 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4 max-h-[600px] overflow-y-auto ${mobileTab === 'material' ? 'block' : 'hidden sm:block'}`}>
                {currentSection === 'listening' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-xs font-bold text-blue-700 uppercase font-mono">
                          {deriveActiveListeningHeading(currentExam, currentQ).badge}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900">
                          {deriveActiveListeningHeading(currentExam, currentQ).title}
                        </h3>
                      </div>
                      <Volume2 className="w-5 h-5 text-blue-600" />
                    </div>

                    <AudioErrorBoundary
                      fallbackTitle="Listening Audio Stream Guard"
                      onRetry={handlePlayAudio}
                    >
                      <IELTSAudioPlayer
                        title={currentExam.title + ' · Original Practice Audio'}
                        subtitle="Original Practice Audio · British RP Multi-Speaker Studio (Practice-Calibrated)"
                        questionId={currentExam.id}
                        audioId={mockAudioId}
                        isMockExamMode={true}
                        onPlay={handlePlayAudio}
                        onPause={() => setIsPlayingAudio(false)}
                        onRetry={handlePlayAudio}
                      />
                    </AudioErrorBoundary>

                    {/* Quick Diagnostic / Reconnect Bar */}
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[11px] font-medium">Stream Guard: Active</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleReconnectMicrophone}
                          disabled={isMicReconnecting}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-bold transition flex items-center gap-1"
                          title="Verify or Reconnect Microphone"
                        >
                          <Mic className="w-3 h-3 text-slate-500" />
                          <span>{isMicReconnecting ? 'Testing...' : 'Test Mic'}</span>
                        </button>
                        <button
                          onClick={handleResumeExam}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition flex items-center gap-1"
                          title="Refresh Audio & Resume Exam"
                        >
                          <RefreshCw className="w-3 h-3 text-blue-600" />
                          <span>Resume Audio</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900">
                      <strong>Candidate Notice:</strong> In official Computer-Delivered IELTS, headphones are provided. Listen attentively and enter your answers directly into the input fields on the right. Audio speed is locked to 1.0× to maintain test validity.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <span className="text-xs font-bold text-emerald-700 uppercase font-mono">
                        {deriveActiveReadingHeading(currentExam, currentQ).badge}
                      </span>
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                        {deriveActiveReadingHeading(currentExam, currentQ).title}
                      </h3>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-700 leading-relaxed font-serif space-y-3 select-text">
                      {(extractActiveReadingPassage(currentExam, currentQ).activePassageText || readingPassage)
                        .split('\n\n')
                        .map((para, idx) => (
                          <p key={idx}>{para}</p>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Question Station */}
              <div className={`lg:col-span-6 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5 scroll-mt-28 sm:scroll-mt-32 ${mobileTab === 'questions' ? 'block' : 'hidden sm:block'}`}>
                {currentQ ? (
                  <>
                    {/* Question Header & Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-800 font-mono text-xs font-extrabold">
                          Question {currentQ.id} of {questions.length}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">({currentQ.type})</span>
                        {((currentExam as any)?.isBeta || currentExam?.badge === 'AI PILOT') && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Beta practice material
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setReportedQuestionTarget({
                            id: currentQ.id,
                            module: currentSection,
                            examId: currentExam?.id,
                            examTitle: currentExam?.title
                          })}
                          className="px-2 py-1 rounded-xl text-xs font-semibold border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition flex items-center gap-1 cursor-pointer"
                          title="Report a problem with this question"
                        >
                          <Flag className="w-3.5 h-3.5 text-rose-500" />
                          <span className="hidden sm:inline">Report a problem</span>
                        </button>

                        <button
                          onClick={() => handleToggleFlag(currentQ.id)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition flex items-center gap-1 ${flagged[currentQ.id] ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                        >
                          <Flag className={`w-3.5 h-3.5 ${flagged[currentQ.id] ? 'fill-amber-600 text-amber-600' : ''}`} />
                          <span>{flagged[currentQ.id] ? 'Flagged' : 'Flag'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
                      {currentQ.prompt}
                    </div>

                {/* Answer Options / Text Input */}
                <div className="space-y-2">
                  {currentQ.options ? (
                    currentQ.options.map((opt, optIdx) => {
                      const isSelected = answers[currentQ.id] === opt;
                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSelectAnswer(currentQ.id, opt)}
                          className={`w-full p-3.5 rounded-2xl border text-xs sm:text-sm font-medium text-left transition flex items-center justify-between min-h-[44px] ${
                            isSelected
                              ? 'bg-blue-700 border-blue-700 text-white shadow-sm font-bold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{opt}</span>
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-white bg-white/20' : 'border-slate-300'}`}>
                            {isSelected && <span className="w-2 h-2 rounded-full bg-white"></span>}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={answers[currentQ.id] || ''}
                        onChange={(e) => handleSelectAnswer(currentQ.id, e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full p-3.5 text-xs sm:text-sm rounded-2xl border border-slate-300 bg-white font-mono uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Tip: Use ALL-CAPS to avoid spelling ambiguity.</p>
                    </div>
                  )}
                </div>

                {/* Bottom Navigation Buttons (Prev / Next) */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    disabled={currentQuestionIndex === 0}
                    onClick={() => {
                      if (currentQuestionIndex > 0) {
                        const newIdx = currentQuestionIndex - 1;
                        setCurrentQuestionIndex(newIdx);
                        setCurrentSection(questions[newIdx].section);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition disabled:opacity-30 flex items-center gap-1.5 min-h-[44px]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <button
                    onClick={() => {
                      if (currentQuestionIndex < questions.length - 1) {
                        const newIdx = currentQuestionIndex + 1;
                        setCurrentQuestionIndex(newIdx);
                        setCurrentSection(questions[newIdx].section);
                      } else {
                        setCurrentSection('writing');
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 min-h-[44px]"
                  >
                    <span>{currentQuestionIndex === questions.length - 1 ? 'Go to Writing' : 'Next Question'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                  </>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No questions configured for this module.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION: WRITING (TASK 1 & TASK 2) ================= */}
        {currentSection === 'writing' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-purple-700 uppercase font-mono">
                  Writing Section · {currentExam.format === 'General Training' ? 'General Training' : 'Academic'}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">Timed Writing Console</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
                  <button
                    onClick={() => setWritingActiveTask('task1')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      writingActiveTask === 'task1' ? 'bg-white text-purple-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Task 1 ({currentExam.format === 'General Training' ? 'Letter' : 'Report'})</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      task1Text.trim().split(/\s+/).filter(Boolean).length >= 150 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {task1Text.trim().split(/\s+/).filter(Boolean).length}/150
                    </span>
                  </button>
                  <button
                    onClick={() => setWritingActiveTask('task2')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      writingActiveTask === 'task2' ? 'bg-white text-purple-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Task 2 (Essay)</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      essayText.trim().split(/\s+/).filter(Boolean).length >= 250 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {essayText.trim().split(/\s+/).filter(Boolean).length}/250
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {writingActiveTask === 'task1' ? (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 text-xs sm:text-sm font-serif font-bold text-slate-900 leading-relaxed">
                  "{currentExam.task1Prompt || (currentExam.format === 'General Training' ? 'Write a formal letter of at least 150 words based on the situation.' : 'Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.')}"
                </div>

                <textarea
                  value={task1Text}
                  onChange={(e) => setTask1Text(e.target.value)}
                  placeholder={`Begin drafting your official Task 1 response here (${currentExam.format === 'General Training' ? 'formal or semi-formal letter' : 'data summary report'}). Write at least 150 words...`}
                  rows={12}
                  className="w-full p-4 rounded-2xl border border-slate-300 font-serif text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 leading-relaxed"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-serif font-bold text-slate-900 leading-relaxed">
                  "{writingPrompt}"
                </div>

                <textarea
                  value={essayText}
                  onChange={(e) => setEssayText(e.target.value)}
                  placeholder="Begin drafting your official Task 2 response here. Write at least 250 words..."
                  rows={12}
                  className="w-full p-4 rounded-2xl border border-slate-300 font-serif text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 leading-relaxed"
                />
              </div>
            )}

            {/* Instant AI Feedback Action Button */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                onClick={handleEvaluateWritingInstant}
                disabled={isEvaluatingWritingInstant}
                className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-sm transition flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{isEvaluatingWritingInstant ? 'Analyzing Essay with Practice AI...' : '⚡ Get Instant AI Feedback & Grammar Check'}</span>
              </button>

              {showWritingFeedbackCard && (
                <button
                  onClick={() => setShowWritingFeedbackCard(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                >
                  Hide Feedback Card
                </button>
              )}
            </div>

            {/* Instant Writing Feedback Card */}
            {showWritingFeedbackCard && writingInstantFeedback && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/70 to-indigo-50/70 border border-purple-200 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-purple-200/60 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-700">
                      Instant Practice AI Diagnostic
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                      Grammar Errors, Upgrades & Band 8.5+ Model Comparison
                    </h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-purple-200 text-purple-900 text-xs font-mono font-bold">
                    {writingInstantFeedback.grammaticalErrors.length} Issue{writingInstantFeedback.grammaticalErrors.length > 1 ? 's' : ''} Identified
                  </span>
                </div>

                {/* Grammatical Errors */}
                {writingInstantFeedback.grammaticalErrors.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-800 uppercase block">Grammatical Errors Identified</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {writingInstantFeedback.grammaticalErrors.map((err, idx) => {
                        const isSaved = !!savedWritingMistakes[`w_err_${idx}`];
                        return (
                          <div key={idx} className="p-3.5 rounded-xl bg-white border border-rose-200 text-xs space-y-1.5 flex flex-col justify-between shadow-2xs">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                                  {err.ruleCategory || 'Grammar Rule'}
                                </span>
                              </div>
                              <div className="text-rose-700 line-through mt-1 font-mono text-[11px]">"{err.observed}"</div>
                              <div className="text-emerald-800 font-bold flex items-center gap-1 mt-0.5 font-mono text-xs">
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>"{err.corrected}"</span>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{err.explanation}</p>
                            </div>

                            <button
                              onClick={() => handleSaveWritingMistake(err, idx)}
                              disabled={isSaved}
                              className={`mt-2 pt-1.5 border-t border-slate-100 text-[11px] font-bold flex items-center gap-1 ${
                                isSaved ? 'text-emerald-600 cursor-default' : 'text-purple-700 hover:text-purple-900 cursor-pointer'
                              }`}
                            >
                              {isSaved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                              <span>{isSaved ? 'Saved in Vault' : 'Save to Mistake Vault'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Lexical Resource Upgrades */}
                {writingInstantFeedback.vocabUpgrades.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-bold text-slate-800 uppercase block">Band 8.5+ Lexical Upgrades</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {writingInstantFeedback.vocabUpgrades.slice(0, 4).map((upg, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1 shadow-2xs">
                          <div className="text-slate-400 line-through text-[11px]">"{upg.original}"</div>
                          <div className="text-indigo-900 font-bold">➔ "{upg.upgraded}"</div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">{upg.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  setCurrentSection('reading');
                  const firstReadingIdx = questions.findIndex(q => q.section === 'reading');
                  setCurrentQuestionIndex(firstReadingIdx !== -1 ? firstReadingIdx : 40);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Reading
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentSection('speaking')}
                  className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Proceed to Speaking Simulation →</span>
                </button>

                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  Submit All & Grade
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION: SPEAKING SIMULATION ================= */}
        {currentSection === 'speaking' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-6">
            {/* Speaking Header */}
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
                  <span className="text-xs font-bold text-rose-700 uppercase font-mono">Official Speaking Simulation</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  Practice Examiner Station: {speakingTopicSet.topicName}
                </h3>
                <p className="text-xs text-slate-500">
                  Deliver answers via microphone or text. Get instant evaluation on grammatical errors, pronunciation phonetics, and Band 8+ answers.
                </p>
              </div>

              {/* Sub-Part Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl shrink-0 self-start sm:self-auto">
                <button
                  onClick={() => setCurrentSpeakingPart(0)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    currentSpeakingPart === 0 ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Phase 0 (ID Protocol)
                </button>
                <button
                  onClick={() => setCurrentSpeakingPart(1)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    currentSpeakingPart === 1 ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Part 1 ({speakingTopicSet.part1Questions.length} Qs)
                </button>
                <button
                  onClick={() => setCurrentSpeakingPart(2)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    currentSpeakingPart === 2 ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Part 2 (Cue Card)
                </button>
                <button
                  onClick={() => setCurrentSpeakingPart(3)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    currentSpeakingPart === 3 ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Part 3 ({speakingTopicSet.part3Questions.length} Qs)
                </button>
              </div>
            </div>

            {/* PHASE 0: CANDIDATE IDENTIFICATION & ID VERIFICATION */}
            {currentSpeakingPart === 0 && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="space-y-1">
                    <span className="font-bold text-amber-950 uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <span>Official Practice Identification Protocol</span>
                    </span>
                    <p className="text-slate-700">
                      In the real IELTS Speaking Test, the examiner verifies your identity before Part 1 begins. Speak your name, preferred name, origin, and confirm your ID.
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentSpeakingPart(1)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shrink-0 cursor-pointer self-start sm:self-auto"
                  >
                    Skip to Part 1 Questions →
                  </button>
                </div>

                {[
                  {
                    id: `${speakingTopicSet.id}_id_0`,
                    title: 'Turn 1 · Candidate Full Name',
                    question: 'Good afternoon. My name is Dr. Arthur Vance. Can you tell me your full name, please?',
                    examinerTip: 'State your full legal name as registered on your passport or ID document (e.g. "My full name is...")'
                  },
                  {
                    id: `${speakingTopicSet.id}_id_1`,
                    title: 'Turn 2 · Preferred Name',
                    question: 'Thank you. And what can I call you?',
                    examinerTip: 'Give your preferred first name or conversational name (e.g. "You can call me...")'
                  },
                  {
                    id: `${speakingTopicSet.id}_id_2`,
                    title: 'Turn 3 · Hometown & Origin',
                    question: 'Thank you. And where do you come from?',
                    examinerTip: 'State your home city and country clearly (e.g. "I come from Dhaka, Bangladesh...")'
                  },
                  {
                    id: `${speakingTopicSet.id}_id_3`,
                    title: 'Turn 4 · Identification Check',
                    question: 'Thank you. Could you show me your identification, please?',
                    examinerTip: 'Present and confirm your valid passport or national ID (e.g. "Yes, of course. Here is my passport.")'
                  }
                ].map((item, idx) => {
                  const qId = item.id;
                  const isPlayingPrompt = playingExaminerPromptId === qId;

                  return (
                    <div key={qId} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-700">
                            {item.title}
                          </span>
                          <h4 className="text-sm sm:text-base font-bold text-slate-900">
                            "{item.question}"
                          </h4>
                          <p className="text-[11px] text-slate-500 italic">
                            💡 Examiner Tip: {item.examinerTip}
                          </p>
                        </div>

                        <button
                          onClick={() => handlePlayExaminerPrompt(qId, item.question)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 shrink-0 self-start cursor-pointer shadow-2xs"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>{isPlayingPrompt ? 'Speaking...' : 'Examiner Audio'}</span>
                        </button>
                      </div>

                      {/* Candidate Answer Input */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">Your Spoken Response:</span>
                          <div className="flex items-center gap-2">
                            {isSpeakingRecording ? (
                              <button
                                onClick={stopSpeakingRecording}
                                className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 animate-pulse cursor-pointer"
                              >
                                <MicOff className="w-3.5 h-3.5" />
                                <span>Stop Recording ({speakingSeconds}s)</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => startSpeakingRecording()}
                                className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <Mic className="w-3.5 h-3.5" />
                                <span>Record Microphone</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <textarea
                          placeholder="Speak into microphone or type your response here..."
                          defaultValue=""
                          rows={2}
                          className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setCurrentSpeakingPart(1);
                      soundManager.playSuccess();
                      onShowToast('Identification verified! Starting Part 1 Questions.');
                    }}
                    className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>Begin Part 1 Interview Questions →</span>
                  </button>
                </div>
              </div>
            )}

            {/* PART 1 QUESTIONS */}
            {currentSpeakingPart === 1 && (
              <div className="space-y-6">
                {speakingTopicSet.part1Questions.map((qItem, qIdx) => {
                  const qId = `${speakingTopicSet.id}_p1_${qIdx}`;
                  const answeredRecord = speakingAnswers.find(a => a.questionId === qId);
                  const isPlayingPrompt = playingExaminerPromptId === qId;

                  return (
                    <div key={qId} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                      {/* Question Header & Examiner Prompt Audio */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-700">
                            Part 1 · Question {qIdx + 1}
                          </span>
                          <h4 className="text-sm sm:text-base font-bold text-slate-900">
                            "{qItem.question}"
                          </h4>
                          <p className="text-[11px] text-slate-500 italic">
                            💡 Examiner Tip: {qItem.examinerTip}
                          </p>
                        </div>

                        <button
                          onClick={() => handlePlayExaminerPrompt(qId, qItem.question)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 shrink-0 self-start cursor-pointer shadow-2xs"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>{isPlayingPrompt ? 'Speaking...' : 'Examiner Audio'}</span>
                        </button>
                      </div>

                      {/* Candidate Answer Input Console */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">Your Spoken Response:</span>
                          <div className="flex items-center gap-2">
                            {isSpeakingRecording && activeRecordingQId === qId ? (
                              <button
                                onClick={stopSpeakingRecording}
                                className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 animate-pulse cursor-pointer"
                              >
                                <MicOff className="w-3.5 h-3.5" />
                                <span>Stop Recording ({speakingSeconds}s)</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => startSpeakingRecording(qId)}
                                className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <Mic className="w-3.5 h-3.5" />
                                <span>Record Microphone</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <textarea
                          value={speakingDrafts[qId] || ''}
                          onChange={(e) => updateSpeakingDraft(qId, e.target.value)}
                          placeholder="Speak into your microphone or type your response here..."
                          rows={3}
                          className="w-full p-3.5 rounded-2xl border border-slate-300 font-serif text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 leading-relaxed bg-white"
                        />
                      </div>

                      {/* Instant AI Feedback Trigger Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <button
                          onClick={() => handleEvaluateSpeakingTurn(qId, 1, qItem.question, speakingTopicSet.topicName)}
                          disabled={isEvaluatingSpeakingTurn}
                          className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs shadow-sm transition flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>{isEvaluatingSpeakingTurn ? 'Evaluating...' : '⚡ Get Instant AI Feedback (Band 8+)'}</span>
                        </button>

                        {answeredRecord && answeredRecord.instantFeedback && (
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-mono font-bold">
                              {formatSpeakingTurnBadge(answeredRecord.instantFeedback)}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedSpeakingFeedback(answeredRecord.instantFeedback!);
                                setShowSpeakingFeedbackModal(true);
                              }}
                              className="px-3 py-1 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition cursor-pointer"
                            >
                              View Feedback (Band 8+)
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* PART 2 CUE CARD */}
            {currentSpeakingPart === 2 && (
              <div className="space-y-5">
                <div className="p-6 rounded-3xl bg-amber-50/70 border border-amber-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800">
                        Part 2 · Candidate Individual Long Turn Cue Card
                      </span>
                      <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
                        "{speakingTopicSet.part2CueCard.prompt}"
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleToggleCueCardPrep}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                          isCueCardPrepRunning
                            ? 'bg-amber-600 text-white animate-pulse'
                            : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{isCueCardPrepRunning ? `Prep Time: ${cueCardPrepSeconds}s` : `Start 1-Min Prep (${cueCardPrepSeconds}s)`}</span>
                      </button>

                      <button
                        onClick={() => handlePlayExaminerPrompt(`${speakingTopicSet.id}_p2`, speakingTopicSet.part2CueCard.prompt)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                        <span>Prompt Audio</span>
                      </button>
                    </div>
                  </div>

                  {/* Bullet Points Checklist */}
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <span className="font-bold text-slate-900">You should say:</span>
                    <ul className="space-y-1 pl-4 list-disc font-serif text-slate-800">
                      {speakingTopicSet.part2CueCard.bulletPoints.map((bp, bpIdx) => (
                        <li key={bpIdx}>{bp}</li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-[11px] text-amber-900 italic pt-1">
                    💡 Examiner Tip: {speakingTopicSet.part2CueCard.examinerTip}
                  </p>
                </div>

                {/* Part 2 Speech Recording Console */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Deliver 2-Minute Monologue:</span>
                    {isSpeakingRecording && activeRecordingQId === `${speakingTopicSet.id}_p2` ? (
                      <button
                        onClick={stopSpeakingRecording}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 animate-pulse cursor-pointer"
                      >
                        <MicOff className="w-3.5 h-3.5" />
                        <span>Stop Recording ({speakingSeconds}s / 120s)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => startSpeakingRecording(`${speakingTopicSet.id}_p2`)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>Record Monologue</span>
                      </button>
                    )}
                  </div>

                  <textarea
                    value={speakingDrafts[`${speakingTopicSet.id}_p2`] || ''}
                    onChange={(e) => updateSpeakingDraft(`${speakingTopicSet.id}_p2`, e.target.value)}
                    placeholder="Speak your monologue or review candidate transcript here..."
                    rows={4}
                    className="w-full p-3.5 rounded-2xl border border-slate-300 font-serif text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 leading-relaxed bg-white"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <button
                      onClick={() => handleEvaluateSpeakingTurn(
                        `${speakingTopicSet.id}_p2`,
                        2,
                        speakingTopicSet.part2CueCard.prompt,
                        speakingTopicSet.topicName,
                        speakingTopicSet.part2CueCard.bulletPoints
                      )}
                      disabled={isEvaluatingSpeakingTurn}
                      className="px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs shadow-sm transition flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isEvaluatingSpeakingTurn ? 'Evaluating...' : '⚡ Get Instant AI Feedback (Band 8+)'}</span>
                    </button>

                    {(() => {
                      const ans = speakingAnswers.find(a => a.questionId === `${speakingTopicSet.id}_p2`);
                      if (ans && ans.instantFeedback) {
                        return (
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-mono font-bold">
                              {formatSpeakingTurnBadge(ans.instantFeedback)}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedSpeakingFeedback(ans.instantFeedback!);
                                setShowSpeakingFeedbackModal(true);
                              }}
                              className="px-3 py-1 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition cursor-pointer"
                            >
                              View Feedback (Band 8+)
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* PART 3 QUESTIONS */}
            {currentSpeakingPart === 3 && (
              <div className="space-y-6">
                {speakingTopicSet.part3Questions.map((qItem, qIdx) => {
                  const qId = `${speakingTopicSet.id}_p3_${qIdx}`;
                  const answeredRecord = speakingAnswers.find(a => a.questionId === qId);
                  const isPlayingPrompt = playingExaminerPromptId === qId;

                  return (
                    <div key={qId} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-700">
                            Part 3 · Abstract Analytical Discussion Q{qIdx + 1}
                          </span>
                          <h4 className="text-sm sm:text-base font-bold text-slate-900">
                            "{qItem.question}"
                          </h4>
                          <p className="text-[11px] text-slate-500 italic">
                            💡 Examiner Tip: {qItem.examinerTip}
                          </p>
                        </div>

                        <button
                          onClick={() => handlePlayExaminerPrompt(qId, qItem.question)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 shrink-0 self-start cursor-pointer shadow-2xs"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>{isPlayingPrompt ? 'Speaking...' : 'Examiner Audio'}</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">Your Analytical Response:</span>
                          {isSpeakingRecording && activeRecordingQId === qId ? (
                            <button
                              onClick={stopSpeakingRecording}
                              className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 animate-pulse cursor-pointer"
                            >
                              <MicOff className="w-3.5 h-3.5" />
                              <span>Stop Recording ({speakingSeconds}s)</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => startSpeakingRecording(qId)}
                              className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Mic className="w-3.5 h-3.5" />
                              <span>Record Microphone</span>
                            </button>
                          )}
                        </div>

                        <textarea
                          value={speakingDrafts[qId] || ''}
                          onChange={(e) => updateSpeakingDraft(qId, e.target.value)}
                          placeholder="Deliver balanced analytical response with cohesive transition markers..."
                          rows={3}
                          className="w-full p-3.5 rounded-2xl border border-slate-300 font-serif text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 leading-relaxed bg-white"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <button
                          onClick={() => handleEvaluateSpeakingTurn(qId, 3, qItem.question, speakingTopicSet.topicName)}
                          disabled={isEvaluatingSpeakingTurn}
                          className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs shadow-sm transition flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>{isEvaluatingSpeakingTurn ? 'Evaluating...' : '⚡ Get Instant AI Feedback (Band 8+)'}</span>
                        </button>

                        {answeredRecord && answeredRecord.instantFeedback && (
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-mono font-bold">
                              {formatSpeakingTurnBadge(answeredRecord.instantFeedback)}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedSpeakingFeedback(answeredRecord.instantFeedback!);
                                setShowSpeakingFeedbackModal(true);
                              }}
                              className="px-3 py-1 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition cursor-pointer"
                            >
                              View Feedback (Band 8+)
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Speaking Bottom Action Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentSection('writing')}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Writing
              </button>

              <button
                onClick={() => setShowSubmitModal(true)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Submit All 4 Sections & Grade Exam
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ================= RENDER REVIEW SUBMISSION SCREEN =================
  const writingModelEssay = currentExam.modelEssay || `In contemporary society, a burgeoning cohort of secondary school graduates elect to undertake an experiential gap year prior to matriculating at university. While this hiatus carries potential pitfalls regarding academic inertia and financial strain, I firmly contend that the pragmatic benefits—predominantly career clarity, intercultural maturity, and experiential autonomy—substantially outweigh any drawbacks.

On the one hand, skeptics argue that postponing tertiary enrollment may disrupt an adolescent's educational momentum. Students who remain detached from rigorous scholarly routines for twelve months often encounter cognitive friction when attempting to re-acclimate to demanding collegiate curricula. Furthermore, ill-conceived or unguided sabbaticals can devolve into protracted leisure, imposing an unnecessary fiscal burden upon parents without cultivating discernible skills. If graduates lack disciplined structure, the gap period risks becoming an expensive impediment rather than an enriching voyage.

Nevertheless, when strategically harnessed, a gap year functions as an invaluable catalyst for holistic personal maturation. Immersing oneself in vocational internships or foreign volunteer programs exposes young adults to real-world workplace dynamics and socioeconomic realities that secondary academia fails to replicate. Consequently, candidates acquire refined self-discipline and occupational discernment, preventing the prevalent phenomenon of tertiary students switching degrees halfway due to premature career selection. Moreover, stepping beyond familial comfort zones nurtures intercultural competence and resilience, traits highly prized by contemporary multinational employers.

In conclusion, although an unstructured interlude may induce temporary academic dislocation, the profound personal, vocational, and psychological dividends yielded by a productive gap year indisputably tip the balance. Educational institutions should therefore establish formalized sabbatical mentorship to optimize this transformative transition.`;

  const task1ModelAnswer = currentExam.task1Model || '';

  const handleCopyTask1Model = () => {
    if (!task1ModelAnswer) return;
    navigator.clipboard.writeText(task1ModelAnswer);
    setCopiedTask1Model(true);
    soundManager.playSuccess();
    onShowToast('Band 9.0 Task 1 Model Answer copied to clipboard!');
    setTimeout(() => setCopiedTask1Model(false), 2000);
  };

  const writingLexicalUpgrades = [
    {
      colloquial: 'taking a gap year',
      modelBand9: 'undertaking an experiential sabbatical',
      reason: 'Replaces everyday phrasal verb with formal academic terminology.'
    },
    {
      colloquial: 'learn practical life skills',
      modelBand9: 'cultivate pragmatic acumen and occupational discernment',
      reason: 'Demonstrates Band 9.0 lexical resource precision.'
    },
    {
      colloquial: 'helps get a good job later',
      modelBand9: 'substantially bolsters post-tertiary employability',
      reason: 'Elevates casual expression to high-tier academic discourse.'
    },
    {
      colloquial: 'forget how to study',
      modelBand9: 'encounter cognitive friction and academic inertia',
      reason: 'Precise psychological terminology for loss of study habits.'
    }
  ];

  const handleCopyModelEssay = () => {
    navigator.clipboard.writeText(writingModelEssay);
    setCopiedModelEssay(true);
    soundManager.playSuccess();
    onShowToast('Band 9.0 Model Essay copied to clipboard!');
    setTimeout(() => setCopiedModelEssay(false), 2000);
  };

  const handleSaveSingleMistake = (q: QuestionItem) => {
    addMistake({
      module: q.section,
      title: `Live Mock: Q${q.id} (${q.type})`,
      userAnswer: answers[q.id] || '(unanswered)',
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    });
    soundManager.playSuccess();
    onShowToast(`Saved Q${q.id} to Mistake Vault!`);
  };

  const filteredReviewQuestions = questions.filter(q => {
    const evalRes = evaluateQuestionResponse(q, answers[q.id]);

    if (reviewFilter === 'listening') return q.section === 'listening';
    if (reviewFilter === 'reading') return q.section === 'reading';
    if (reviewFilter === 'incorrect') return !evalRes.isCorrect;
    return true; // 'all'
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Review Submission Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-blue-800/60 pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-500/40">
                Review Submission
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                results.isCompleteFullMock
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
              }`}>
                {results.isCompleteFullMock
                  ? (submissionReason === 'timer' ? '⏱️ Time Expired — Full Mock Completed' : '🏁 Full Mock Completed & Scored')
                  : '⚠️ Incomplete Attempt — Diagnostic Review Only'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black">Official Test Diagnostic Review</h2>
            <p className="text-xs sm:text-sm text-blue-200 mt-1 max-w-xl">
              Inspect your submitted responses side-by-side with Practice recommended model answers, examine quoted evidence, and review the Band 9.0 benchmark essay.
            </p>
            {!results.isCompleteFullMock && results.incompleteSections.length > 0 && (
              <div className="mt-3 p-3 rounded-2xl bg-amber-950/70 border border-amber-500/40 text-amber-200 text-xs space-y-1 max-w-2xl">
                <div className="font-bold text-amber-300">
                  Overall IELTS Band Not Awarded — Incomplete Sections:
                </div>
                <div>{results.incompleteSections.join(' · ')}</div>
              </div>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-3xl text-center shrink-0 min-w-[144px]">
            <span className="text-[10px] uppercase font-bold text-blue-200">Overall Band</span>
            {results.isCompleteFullMock && results.overall !== null ? (
              <>
                <div className="font-mono text-5xl font-black text-amber-300 my-1">
                  {results.overall.toFixed(1)}
                </div>
                <span className="text-[10px] text-emerald-300 font-semibold">Scale: 0.0 - 9.0</span>
              </>
            ) : (
              <>
                <div className="font-mono text-xl font-black text-amber-300 my-2">
                  Incomplete
                </div>
                <span className="text-[10px] text-amber-200 font-semibold">All 4 Skills Required</span>
              </>
            )}
          </div>
        </div>

      {/* Sub-Bands Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
          <div className="text-[10px] text-blue-200 uppercase font-semibold">Listening</div>
          <div className="font-mono text-xl font-bold text-white mt-0.5">
            {results.isListeningComplete && results.lBand !== null
              ? `Band ${results.lBand.toFixed(1)}`
              : results.isListeningAssessed && results.lBand !== null
              ? `Band ${results.lBand.toFixed(1)} (Partial)`
              : 'Incomplete'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {results.listeningCorrect}/{results.listeningTotal} Correct
            {results.listeningUnanswered > 0 ? ` · ${results.listeningUnanswered} Unanswered` : ''}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
          <div className="text-[10px] text-blue-200 uppercase font-semibold">Reading</div>
          <div className="font-mono text-xl font-bold text-white mt-0.5">
            {results.isReadingComplete && results.rBand !== null
              ? `Band ${results.rBand.toFixed(1)}`
              : results.isReadingAssessed && results.rBand !== null
              ? `Band ${results.rBand.toFixed(1)} (Partial)`
              : 'Incomplete'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {results.readingCorrect}/{results.readingTotal} Correct
            {results.readingUnanswered > 0 ? ` · ${results.readingUnanswered} Unanswered` : ''}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
          <div className="text-[10px] text-blue-200 uppercase font-semibold">Writing</div>
          <div className="font-mono text-xl font-bold text-white mt-0.5">
            {results.isWritingComplete && results.wBand !== null
              ? `Band ${results.wBand.toFixed(1)}*`
              : results.isWritingPartial
              ? `Incomplete${results.wDiagnosticBand !== null ? ` (Diag. ${results.wDiagnosticBand.toFixed(1)}*)` : ''}`
              : 'Incomplete'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {results.isWritingComplete
              ? '*Weighted 1/3 T1 (≥150w) + 2/3 T2 (≥250w)'
              : results.isWritingPartial
              ? `T1: ${results.task1WordCount}/${results.task1TargetWords}w · T2: ${results.wordCount}/${results.task2TargetWords}w`
              : `Requires T1 ≥ ${results.task1TargetWords}w & T2 ≥ ${results.task2TargetWords}w`}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
          <div className="text-[10px] text-blue-200 uppercase font-semibold">
            {results.isSpeakingComplete
              ? 'Speaking (Assessed)'
              : results.isSpeakingTranscriptOnly
              ? 'Speaking (Transcript-Only)'
              : results.isSpeakingPartial
              ? 'Speaking (Partial)'
              : 'Speaking'}
          </div>
          <div className="font-mono text-xl font-bold text-white mt-0.5">
            {results.isSpeakingComplete && results.sBand !== null
              ? `Band ${results.sBand.toFixed(1)}`
              : results.isSpeakingTranscriptOnly && results.sDiagnosticBand !== null
              ? `Incomplete (3-Crit. ${results.sDiagnosticBand.toFixed(1)}*)`
              : results.isSpeakingPartial && results.sDiagnosticBand !== null
              ? `Incomplete (Diag. ${results.sDiagnosticBand.toFixed(1)}*)`
              : 'Incomplete'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {results.isSpeakingComplete
              ? `${results.speakingEvaluatedCount}/${results.speakingRequiredCount} Audio-Backed Turns (Parts 1–3)`
              : results.isSpeakingTranscriptOnly
              ? `${results.speakingTranscriptOnlyCount}/${results.speakingRequiredCount} Transcript-Only · Pronunciation Unassessed`
              : `${results.speakingEvaluatedCount}/${results.speakingRequiredCount} Required Turns (Parts 1–3)`}
          </div>
        </div>
      </div>
    </div>

    {/* Timer Auto-Submission Alert Banner */}
    {submissionReason === 'timer' && (
      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-xs">
        <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
            <span>Examination Session Ended: Full Mock Examination Timer (2h 45m) Reached 00:00</span>
          </h4>
          <p className="text-xs text-amber-800 leading-relaxed">
            Your live examination was automatically submitted when the session timer expired. All responses captured in the system before time ran out are graded below. Review your answers side-by-side with official Practice Recommended Model Answers.
          </p>
        </div>
      </div>
    )}

    {/* Global Review Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="text-xs text-slate-600 font-medium">
          Transfer all missed questions to your spaced repetition error log with one click:
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncAllErrorsToVault}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
          >
            <Archive className="w-4 h-4" />
            <span>Send Missed Questions to Mistake Vault</span>
          </button>
          <button
            onClick={() => {
              handlePickRandomExam();
              setExamState('intro');
              setTimeLeft(FULL_MOCK_DURATION_SECONDS);
            }}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
          >
            <Shuffle className="w-4 h-4 text-amber-300" />
            <span>Try Different Random Exam</span>
          </button>
          <button
            onClick={() => {
              setExamState('intro');
              setAnswers({});
              setFlagged({});
              setEssayText('');
              setTask1Text('');
              setSpeakingAnswers([]);
              setTimeLeft(FULL_MOCK_DURATION_SECONDS);
              testPersistenceService.clearProgress(MOCK_TEST_PERSISTENCE_KEY);
            }}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retake This Exam</span>
          </button>
        </div>
      </div>

      {/* Interactive Category Filter Switcher Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: `All Questions (${questions.length})` },
          { id: 'listening', label: `🎧 Listening (${results.listeningTotal})` },
          { id: 'reading', label: `📖 Reading (${results.readingTotal})` },
          { id: 'writing', label: `✍️ Writing (${results.isWritingComplete ? 'Complete' : results.isWritingPartial ? 'Partial / Under Target' : 'Incomplete'})` },
          { id: 'speaking', label: `🎙️ Speaking Simulation (${results.speakingEvaluatedCount}/${results.speakingRequiredCount})` },
          { id: 'incorrect', label: `⚠️ Incorrect / Needs Review (${(results.listeningTotal + results.readingTotal) - (results.listeningCorrect + results.readingCorrect)})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setReviewFilter(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition cursor-pointer ${
              reviewFilter === tab.id
                ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= SECTION: QUESTIONS SIDE-BY-SIDE REVIEW ================= */}
      {reviewFilter !== 'writing' && reviewFilter !== 'speaking' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Item-By-Item Response vs. Model Answer Review
              </h3>
              <p className="text-xs text-slate-500">
                Inspect your answers directly alongside recommended Practice keys and transcript/passage citations.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">
              Showing {filteredReviewQuestions.length} Items
            </span>
          </div>

          <div className="space-y-4">
            {filteredReviewQuestions.map((q) => {
              const rawUserAns = answers[q.id] || '';
              const userAns = rawUserAns.trim();
              const isUnanswered = userAns.length === 0;
              const isCorrect = !isUnanswered && isAnswerCorrect(q as any, rawUserAns);
              const targetAns = q.correctAnswer;

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border transition space-y-4 ${
                    isCorrect
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : isUnanswered
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-rose-50/40 border-rose-200'
                  }`}
                >
                  {/* Question Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-800">
                        Question {q.id}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        {q.section} · {q.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : isUnanswered
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {isCorrect ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : isUnanswered ? (
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        <span>{isCorrect ? 'Correct (+1)' : isUnanswered ? 'Unanswered (0)' : 'Incorrect (0)'}</span>
                      </span>

                      {!isCorrect && (
                        <button
                          onClick={() => handleSaveSingleMistake(q)}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-300 transition flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" />
                          <span>Save to Vault</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
                    {q.prompt}
                  </div>

                  {/* Side-by-Side Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {/* Left: Candidate's Submitted Response */}
                    <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
                      isCorrect
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                        : isUnanswered
                        ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                        : 'bg-rose-50/70 border-rose-300 text-rose-950'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide mb-1.5">
                          <span className={isCorrect ? 'text-emerald-800' : isUnanswered ? 'text-amber-800' : 'text-rose-800'}>
                            Your Submitted Response
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                            isCorrect
                              ? 'bg-emerald-200 text-emerald-900'
                              : isUnanswered
                              ? 'bg-amber-200 text-amber-900'
                              : 'bg-rose-200 text-rose-900'
                          }`}>
                            {isCorrect ? '✓ Exact / Accepted Match' : isUnanswered ? '— Unanswered' : '✗ Deviation'}
                          </span>
                        </div>
                        <div className="font-mono text-sm sm:text-base font-bold mt-1 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                          {userAns ? (
                            `"${userAns}"`
                          ) : (
                            <span className="text-slate-400 italic font-normal text-xs">
                              {submissionReason === 'timer'
                                ? '⏱️ (Unanswered — exam timer elapsed)'
                                : '(No answer recorded — left blank)'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-2.5 flex items-center justify-between font-mono">
                        <span>Status: {userAns ? 'Captured in submission' : (submissionReason === 'timer' ? 'Timer reached 00:00' : 'Unanswered')}</span>
                        <span className={isCorrect ? 'text-emerald-700 font-bold' : isUnanswered ? 'text-amber-700 font-bold' : 'text-rose-700 font-bold'}>
                          {isCorrect ? '1.0 / 1.0' : '0.0 / 1.0'}
                        </span>
                      </div>
                    </div>

                    {/* Right: Recommended Practice Model Answer */}
                    <div className="p-4 rounded-2xl border bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border-blue-200 text-slate-900 flex flex-col justify-between shadow-xs">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                          <span className="text-blue-900 flex items-center gap-1 font-bold">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            Recommended Model Answer
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold border border-blue-200">
                            Practice Key
                          </span>
                        </div>
                        <div className="font-mono text-sm sm:text-base font-extrabold text-blue-950 mt-1 p-2.5 rounded-xl bg-white border border-blue-200 shadow-xs">
                          "{targetAns}"
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-2.5 flex items-center justify-between font-mono">
                        <span>Spelling variations accepted</span>
                        <span className="text-blue-700 font-bold">Official Standard</span>
                      </div>
                    </div>
                  </div>

                  {/* Practice Examiner Proof & Rationale */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1">
                    <strong className="text-slate-900 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                      Examiner Analysis & Audio/Passage Evidence:
                    </strong>
                    <p className="text-slate-600 font-serif italic">
                      "{q.explanation}"
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= SECTION: WRITING TASK 2 SIDE-BY-SIDE REVIEW ================= */}
      {(reviewFilter === 'all' || reviewFilter === 'writing') && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-8">
          {/* ================= WRITING TASK 1 ================= */}
          {(currentExam.task1Prompt || currentExam.task1Model || task1Text) && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-purple-700 uppercase font-mono">
                    Writing Task 1 · {currentExam.format === 'General Training' ? 'Letter' : 'Data Report'}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    Submitted Task 1 vs. Band 9.0 Model Response
                  </h3>
                  <p className="text-xs text-slate-500">
                    Compare key feature reporting, factual accuracy, and paragraph organization against an official examiner model.
                  </p>
                </div>

                {task1ModelAnswer && (
                  <button
                    onClick={handleCopyTask1Model}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                  >
                    {copiedTask1Model ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTask1Model ? 'Copied Task 1 Model' : 'Copy Task 1 Model'}</span>
                  </button>
                )}
              </div>

              {/* Task 1 Prompt */}
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 text-xs sm:text-sm font-serif font-bold text-slate-900 leading-relaxed">
                "{currentExam.task1Prompt || (currentExam.format === 'General Training' ? 'Write a formal letter of at least 150 words.' : 'Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.')}"
              </div>

              {/* Side-by-Side Task 1 Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div>
                      <span className="text-xs font-bold text-slate-800 uppercase block">Your Submitted Response</span>
                      <span className="text-[11px] text-slate-500">Recorded during live exam</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                      results.task1WordCount >= 150
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {results.task1WordCount} Words {results.task1WordCount >= 150 ? '✓' : '(Under 150)'}
                    </span>
                  </div>

                  {task1Text.trim() ? (
                    <div className="text-xs sm:text-sm text-slate-800 font-serif leading-relaxed space-y-3 whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                      {task1Text}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500 italic text-xs space-y-2">
                      <p className="font-bold text-slate-700">No response was submitted for Writing Task 1.</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm mx-auto">
                        Review the Band 9.0 benchmark model response on the right to master standard 3-4 paragraph structure.
                      </p>
                    </div>
                  )}
                </div>

                {task1ModelAnswer && (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/70 to-indigo-50/70 border border-purple-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                      <div>
                        <span className="text-xs font-bold text-purple-900 uppercase block">Recommended Band 9.0 Model</span>
                        <span className="text-[11px] text-purple-700">Official Practice Examiner Benchmark</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-700 text-white shadow-xs">
                        Band 9.0 · {task1ModelAnswer.trim().split(/\s+/).filter(Boolean).length} Words
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm text-slate-800 font-serif leading-relaxed space-y-3 max-h-[500px] overflow-y-auto">
                      {task1ModelAnswer.split('\n\n').map((para, pIdx) => (
                        <p key={pIdx}>{para}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= WRITING TASK 2 ================= */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-purple-700 uppercase font-mono">Writing Task 2 Model Comparison</span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  Submitted Essay vs. Band 9.0 Benchmark Model Essay
                </h3>
                <p className="text-xs text-slate-500">
                  Compare your paragraph development, cohesive devices, and lexical density against an authentic Band 9 response.
                </p>
              </div>

              <button
                onClick={handleCopyModelEssay}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 self-start sm:self-auto shrink-0"
              >
                {copiedModelEssay ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedModelEssay ? 'Copied Model Essay' : 'Copy Band 9.0 Essay'}</span>
              </button>
            </div>

            {/* Assigned Task Prompt */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-serif font-bold text-slate-900 leading-relaxed">
              "{writingPrompt}"
            </div>

            {/* Side-by-Side Essay Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: Candidate's Submitted Essay */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800 uppercase block">Your Submitted Response</span>
                    <span className="text-[11px] text-slate-500">Recorded during live exam</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                    results.wordCount >= 250
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {results.wordCount} Words {results.wordCount >= 250 ? '✓' : '(Under 250)'}
                  </span>
                </div>

                {essayText.trim() ? (
                  <div className="text-xs sm:text-sm text-slate-800 font-serif leading-relaxed space-y-3 whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                    {essayText}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 italic text-xs space-y-2">
                    <p className="font-bold text-slate-700">
                      {submissionReason === 'timer'
                        ? '⏱️ Session timer reached 00:00 before essay response was finalized.'
                        : 'No essay response was submitted for Writing Task 2.'}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm mx-auto">
                      Review the Practice Band 9.0 benchmark model response on the right to master four-paragraph structure, thesis development, and cohesive transition devices.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Recommended Band 9.0 Benchmark Model Essay */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-blue-50/70 border border-indigo-200 space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                  <div>
                    <span className="text-xs font-bold text-indigo-900 uppercase block">Recommended Band 9.0 Model Essay</span>
                    <span className="text-[11px] text-indigo-700">Official Practice Examiner Benchmark</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-700 text-white shadow-xs">
                    Band 9.0 · {writingModelEssay.trim().split(/\s+/).filter(Boolean).length} Words
                  </span>
                </div>

                <div className="text-xs sm:text-sm text-slate-800 font-serif leading-relaxed space-y-3 max-h-[500px] overflow-y-auto">
                  {writingModelEssay.split('\n\n').map((para, pIdx) => (
                    <p key={pIdx}>{para}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Four-Criteria Writing Diagnostic Assessment Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/80 via-indigo-50/50 to-slate-50 border border-purple-200/80 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/60 pb-3">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-700">
                  Practice Set 4-Criteria Diagnostic
                </span>
                <h4 className="font-bold text-slate-900 text-sm">
                  {results.isWritingComplete
                    ? 'Writing Diagnostic Criteria Breakdown (Task 1 ≥ 150w & Task 2 ≥ 250w)'
                    : results.isWritingPartial
                    ? 'Partial / Under-Target Writing Diagnostic (Full Mock Requires 150w + 250w)'
                    : 'Writing Assessment Status'}
                </h4>
              </div>
              <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold self-start sm:self-auto ${
                results.isWritingComplete
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                {results.isWritingComplete && results.wBand !== null
                  ? `Writing Band ${results.wBand.toFixed(1)}*`
                  : results.isWritingPartial && results.wDiagnosticBand !== null
                  ? `Incomplete (Diag. Est. ${results.wDiagnosticBand.toFixed(1)}*)`
                  : 'Incomplete (Not Assessed)'}
              </span>
            </div>

            {results.isWritingPartial && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5">
                <p className="font-bold">
                  Writing Section Incomplete for Full Mock — A completed IELTS Writing band requires Task 1 (≥ {results.task1TargetWords} words) and Task 2 (≥ {results.task2TargetWords} words).
                </p>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  <strong>Task 1:</strong> {results.task1WordCount}/{results.task1TargetWords} target words ({results.isTask1Complete ? 'Target met' : results.isTask1Valid ? `Diagnostic available (≥ ${results.task1MinWords}w), below ${results.task1TargetWords}w full-mock target` : `Below ${results.task1MinWords}w diagnostic minimum`})
                  {' · '}
                  <strong>Task 2:</strong> {results.wordCount}/{results.task2TargetWords} target words ({results.isTask2Complete ? 'Target met' : results.isTask2Valid ? `Diagnostic available (≥ ${results.task2MinWords}w), below ${results.task2TargetWords}w full-mock target` : `Below ${results.task2MinWords}w diagnostic minimum`}).
                </p>
              </div>
            )}

            {(results.t1Report || results.t2Report) ? (
              <div className="space-y-4">
                {results.t1Report && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                      <span>Task 1 Diagnostic Criteria ({results.task1WordCount} words · Weight 1/3)</span>
                      <span className="font-mono">Task 1 Band {results.t1Report.overallBand.toFixed(1)}*</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 rounded-xl bg-white border border-purple-100 text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Task Achievement</div>
                        <div className="font-mono text-base font-extrabold text-purple-900 mt-0.5">
                          Band {results.t1Report.taScore.toFixed(1)}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-purple-100 text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Coherence & Cohesion</div>
                        <div className="font-mono text-base font-extrabold text-purple-900 mt-0.5">
                          Band {results.t1Report.ccScore.toFixed(1)}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-purple-100 text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Lexical Resource</div>
                        <div className="font-mono text-base font-extrabold text-purple-900 mt-0.5">
                          Band {results.t1Report.lrScore.toFixed(1)}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-purple-100 text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Grammar & Accuracy</div>
                        <div className="font-mono text-base font-extrabold text-purple-900 mt-0.5">
                          Band {results.t1Report.graScore.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    {results.t1Report.examinerSummary && (
                      <p className="text-xs text-slate-700 bg-white/80 p-3 rounded-xl border border-purple-100 leading-relaxed font-serif">
                        <strong>Task 1 Examiner Note:</strong> {results.t1Report.examinerSummary}
                      </p>
                    )}
                  </div>
                )}

                {results.t2Report && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                      <span>Task 2 Diagnostic Criteria ({results.wordCount} words · Weight 2/3)</span>
                      <span className="font-mono">Task 2 Band {results.t2Report.overallBand.toFixed(1)}*</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 rounded-xl bg-white border border-purple-100 text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Task Response</div>
                        <div className="font-mono text-base font-extrabold text-purple-900 mt-0.5">
                          Band {results.t2Report.taScore.toFixed(1)}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-purple-100 text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Coherence & Cohesion</div>
                        <div className="font-mono text-base font-extrabold text-purple-900 mt-0.5">
                          Band {results.t2Report.ccScore.toFixed(1)}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-purple-100 text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Lexical Resource</div>
                        <div className="font-mono text-base font-extrabold text-purple-900 mt-0.5">
                          Band {results.t2Report.lrScore.toFixed(1)}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-purple-100 text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Grammar & Accuracy</div>
                        <div className="font-mono text-base font-extrabold text-purple-900 mt-0.5">
                          Band {results.t2Report.graScore.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    {results.t2Report.examinerSummary && (
                      <p className="text-xs text-slate-700 bg-white/80 p-3 rounded-xl border border-purple-100 leading-relaxed font-serif">
                        <strong>Task 2 Examiner Note:</strong> {results.t2Report.examinerSummary}
                      </p>
                    )}
                  </div>
                )}

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 italic font-mono">
                  <span>* Practice Diagnostic Heuristic: Weighted 2/3 Task 2 + 1/3 Task 1 when both tasks are completed. Evaluated against Practice public descriptors.</span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-white border border-amber-200 text-xs text-amber-950 space-y-1">
                <p className="font-bold">Minimum length requirement not met for scoring.</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  IELTS Writing Task 1 requires at least 30 words (submitted: {results.task1WordCount} words) and Task 2 requires at least 50 words (submitted: {results.wordCount} words) for heuristic assessment.
                </p>
              </div>
            )}
          </div>

          {/* Side-by-Side Lexical Resource Upgrades */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Key Lexical Upgrades (Everyday ➔ Band 9.0 Collocations)</h4>
              <p className="text-xs text-slate-500">Transform conversational vocabulary into high-tier academic prose.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {writingLexicalUpgrades.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] text-slate-400 line-through">"{item.colloquial}"</div>
                    <div className="text-xs font-bold text-indigo-900">➔ "{item.modelBand9}"</div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{item.reason}</p>
                  </div>
                  <button
                    onClick={() => {
                      addMistake({
                        module: 'writing',
                        title: `Essay Collocation: "${item.colloquial}" ➔ "${item.modelBand9}"`,
                        userAnswer: item.colloquial,
                        correctAnswer: item.modelBand9,
                        explanation: item.reason
                      });
                      soundManager.playSuccess();
                      onShowToast(`Saved "${item.modelBand9}" to Mistake Vault!`);
                    }}
                    className="mt-2 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 self-start"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save to Mistake Vault</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION: SPEAKING SIMULATION DIAGNOSTIC REVIEW ================= */}
      {(reviewFilter === 'all' || reviewFilter === 'speaking') && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
                <span className="text-xs font-bold text-rose-700 uppercase font-mono">Speaking Diagnostic Assessment</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                Spoken Responses, Grammatical Errors & Band 8+ Better Answers
              </h3>
              <p className="text-xs text-slate-500">
                Detailed turn-by-turn analysis against Practice Band descriptors: Fluency, Lexical Resource, Grammatical Accuracy, and Pronunciation.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border ${
                results.isSpeakingComplete
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                {results.isSpeakingComplete && results.sBand !== null
                  ? `Speaking Band: ${results.sBand.toFixed(1)}`
                  : results.isSpeakingTranscriptOnly && results.sDiagnosticBand !== null
                  ? `Transcript-Only (${results.speakingTranscriptOnlyCount}/${results.speakingRequiredCount} Turns · 3-Crit. ${results.sDiagnosticBand.toFixed(1)}*)`
                  : results.isSpeakingPartial && results.sDiagnosticBand !== null
                  ? `Incomplete (${results.speakingEvaluatedCount}/${results.speakingRequiredCount} Turns · Diag. ${results.sDiagnosticBand.toFixed(1)}*)`
                  : `Incomplete (0/${results.speakingRequiredCount} Complete Turns)`}
              </span>
            </div>
          </div>

          {results.isSpeakingPartial && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
              <div className="space-y-0.5">
                <p className="font-bold">
                  {results.isSpeakingTranscriptOnly
                    ? `Speaking Incomplete — Transcript-Only Assessment (${results.speakingTranscriptOnlyCount} of ${results.speakingRequiredCount} turns)`
                    : `Speaking Section Incomplete (${results.speakingEvaluatedCount} of ${results.speakingRequiredCount} required prompts completely evaluated across Parts 1, 2, and 3)`}
                </p>
                <p className="text-[11px] text-amber-900">
                  {results.isSpeakingTranscriptOnly
                    ? 'Pronunciation cannot be scored from text transcripts alone. Your individual turn diagnostics, grammar feedback, and model answers remain reviewable below, but an official four-skill Overall Band requires complete audio-backed Speaking evaluation.'
                    : `Part 1: ${results.speakingPart1Evaluated}/2 · Part 2 (Cue Card): ${results.speakingPart2Evaluated}/1 · Part 3: ${results.speakingPart3Evaluated}/2. Partial turn diagnostics are shown below, but a full-mock Speaking band requires complete 4-criterion evaluation across all 3 parts.`}
                </p>
              </div>
              <button
                onClick={() => {
                  setExamState('active');
                  setCurrentSection('speaking');
                  onShowToast('Switched to Speaking Station. Complete the remaining turns!');
                }}
                className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs shrink-0 transition cursor-pointer"
              >
                Complete Remaining Speaking Turns →
              </button>
            </div>
          )}

          {speakingAnswers.length > 0 ? (
            <div className="space-y-6">
              {speakingAnswers.map((ans, aIdx) => {
                const fb = ans.instantFeedback;
                const isPlayingModel = playingSpeakingModelId === ans.questionId;

                return (
                  <div key={ans.questionId} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-700">
                          Part {ans.part} · {ans.topic}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                          "{ans.questionText}"
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <span className="px-2.5 py-1 rounded-full bg-slate-900 text-white text-xs font-mono font-bold">
                          {fb ? formatSpeakingTurnBadge(fb) : 'Awaiting Assessment'}
                        </span>
                        {fb && (
                          <button
                            onClick={() => {
                              setSelectedSpeakingFeedback(fb);
                              setShowSpeakingFeedbackModal(true);
                            }}
                            className="px-3 py-1 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-2xs transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>Instant Coach Card</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Candidate Transcript vs Model Answer Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Left: Candidate Spoken Transcript */}
                      <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 border-b border-slate-100 pb-1.5">
                          <span>Your Transcript ({ans.wordCount} words)</span>
                          <span className="font-mono text-slate-700">{ans.wordsPerMinute} WPM</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-800 font-serif leading-relaxed italic">
                          "{ans.transcript}"
                        </p>
                      </div>

                      {/* Right: Band 8+ Better Answer */}
                      {fb?.betterAnswer && (
                        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/70 to-blue-50/70 border border-indigo-200 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900 border-b border-indigo-200/60 pb-1.5">
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              <span>Band 8+ Better Answer</span>
                            </span>
                            <button
                              onClick={() => handlePlaySpeakingModelAudio(ans.questionId, fb.betterAnswer?.modelResponse || fb.betterAnswer?.modelAnswer || '')}
                              className="px-2 py-0.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              <Volume2 className="w-3 h-3" />
                              <span>{isPlayingModel ? 'Stop Audio' : 'Listen (British Voice)'}</span>
                            </button>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-800 font-serif leading-relaxed">
                            "{fb.betterAnswer.modelResponse || fb.betterAnswer.modelAnswer || ''}"
                          </p>
                          {fb.betterAnswer.highlightedPhrases && fb.betterAnswer.highlightedPhrases.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {fb.betterAnswer.highlightedPhrases.map((phrase, pIdx) => (
                                <span key={pIdx} className="px-1.5 py-0.5 rounded bg-indigo-200 text-indigo-900 text-[10px] font-mono font-medium">
                                  {phrase}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Grammatical Errors Analysis */}
                    {fb?.grammaticalErrors && fb.grammaticalErrors.length > 0 && (
                      <div className="p-4 rounded-xl bg-white border border-rose-200 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-rose-100 pb-1.5">
                          <span className="text-xs font-bold text-rose-900 uppercase flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Grammatical Errors & Corrections ({fb.grammaticalErrors.length})</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {fb.grammaticalErrors.map((err, errIdx) => {
                            const errKey = `spk_${ans.questionId}_${errIdx}`;
                            const isSaved = !!savedSpeakingMistakes[errKey];

                            return (
                              <div key={errKey} className="p-3 rounded-lg bg-rose-50/50 border border-rose-200/80 text-xs space-y-1.5 flex flex-col justify-between">
                                <div>
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-200 text-rose-900">
                                    {err.ruleCategory}
                                  </span>
                                  <div className="text-rose-700 line-through mt-1 font-mono text-[11px]">"{err.observed}"</div>
                                  <div className="text-emerald-800 font-bold flex items-center gap-1 font-mono text-xs">
                                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>"{err.corrected}"</span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{err.explanation}</p>
                                </div>

                                <button
                                  onClick={() => handleSaveSpeakingTurnMistake(err, errKey)}
                                  disabled={isSaved}
                                  className={`mt-2 pt-1 border-t border-rose-200/60 text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                                    isSaved ? 'text-emerald-700' : 'text-rose-700 hover:text-rose-900'
                                  }`}
                                >
                                  {isSaved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                                  <span>{isSaved ? 'Saved in Vault' : 'Save Error to Mistake Vault'}</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Pronunciation Coach */}
                    {fb?.pronunciationAnalysis && (
                      <div className="p-4 rounded-xl bg-white border border-blue-200 space-y-2">
                        <span className="text-xs font-bold text-blue-900 uppercase flex items-center gap-1.5">
                          <Headphones className="w-3.5 h-3.5 text-blue-600" />
                          <span>Pronunciation & Syllable Stress Coach</span>
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                          {fb.pronunciationAnalysis.problemWords && fb.pronunciationAnalysis.problemWords.slice(0, 3).map((w, wIdx) => (
                            <div key={wIdx} className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200 text-xs space-y-0.5">
                              <div className="font-bold text-slate-900 font-mono">{w.word}</div>
                              <div className="text-blue-700 font-mono text-[11px]">{w.phoneticIpa}</div>
                              <div className="text-emerald-700 font-bold text-[11px]">Stress: {w.stressedSyllable}</div>
                              <p className="text-[10px] text-slate-500 leading-tight pt-0.5">{w.advice}</p>
                            </div>
                          ))}
                        </div>
                        <div className="text-[11px] text-slate-600 pt-1">
                          <strong>Cadence Guidance:</strong> {fb.pronunciationAnalysis.intonationGuidance}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
              <Mic className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="space-y-1">
                <p className="font-bold text-slate-700 text-sm">
                  No Speaking Simulations were recorded during this test session.
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  You can practice any of the authentic Practice speaking questions from this set below to get instant AI evaluation, pronunciation coaching, and Band 8+ answers.
                </p>
              </div>

              {/* Quick Practice Trigger Button */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setExamState('active');
                    setCurrentSection('speaking');
                    onShowToast('Switched to Speaking Station. Record or type your answer!');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs shadow-md transition inline-flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Practice Speaking Questions Now →</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Root Modal: Instant Speaking Feedback */}
      {selectedSpeakingFeedback && (
        <InstantSpeakingFeedbackModal
          feedback={selectedSpeakingFeedback}
          isOpen={showSpeakingFeedbackModal}
          onClose={() => {
            setShowSpeakingFeedbackModal(false);
            stopSpeech();
          }}
          onRetakeTurn={() => {
            setShowSpeakingFeedbackModal(false);
            stopSpeech();
            setSpeakingTranscript('');
            setSpeakingSeconds(0);
          }}
          nextActionLabel="Continue Exam"
          onShowToast={onShowToast}
        />
      )}

      {/* Root Modal: Report Question Problem */}
      {reportedQuestionTarget && (
        <QuestionProblemReportModal
          isOpen={Boolean(reportedQuestionTarget)}
          onClose={() => setReportedQuestionTarget(null)}
          questionId={reportedQuestionTarget.id}
          moduleId={reportedQuestionTarget.module}
          examId={reportedQuestionTarget.examId}
          examTitle={reportedQuestionTarget.examTitle}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
