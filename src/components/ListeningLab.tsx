import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  Eye,
  EyeOff,
  MapPin,
  AlertCircle,
  Sparkles,
  Users,
  Compass,
  GraduationCap,
  BookOpen,
  Award,
  Layers,
  Shuffle,
  Flag,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Save,
  Clock,
  Radio,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Filter,
  CheckCheck,
  Flame,
  ListFilter,
  Globe,
  Lock,
  Unlock
} from 'lucide-react';
import { soundManager } from '../utils/audioEffects';
import { addMistake } from '../utils/vaultStorage';
import { speakBritish, stopSpeech } from '../utils/britishVoice';
import { getPreferredAccent, OfficialIELTSAccent } from '../config/voiceConfig';
import { IELTSAudioPlayer } from './audio/IELTSAudioPlayer';
import { AudioPlaybackWaveform } from './audio/AudioPlaybackWaveform';
import { questionEngine, IELTSQuestion } from '../services/QuestionEngine';
import { audioService, DialogueLine, AudioPlaybackState, isInterruptedPlaybackError } from '../services/audioService';
import { audioManager } from '../services/AudioManager';
import { RealisticIELTSListeningTest } from './listening/RealisticIELTSListeningTest';
import { testPersistenceService } from '../services/testPersistenceService';
import { AudioErrorBoundary } from './common/AudioErrorBoundary';
import { AskMentorContextualWidget } from './common/AskMentorPanel';
import { zeroRepetitionEngine, computeContentFingerprint } from '../services/ZeroRepetitionEngine';
import {
  parseOptionItem,
  isListeningAnswerCorrect,
  isListeningOptionCorrect,
  formatDisplayedCorrectAnswer,
  resolveDialogueLineSpeakerId,
  assignSectionDialogueSpeakers,
  IELTS_LISTENING_PARTS,
  getListeningPartMeta,
  getListeningQuestionProgress,
  formatIELTSSpeechText,
  computeListeningAudioSyncMap,
  findActiveQuestionIndexForTimestamp,
  formatAudioTimestamp,
  QuestionAudioSyncCue
} from '../utils/listeningAnswerEvaluator';
import { ListeningMapDiagram } from './listening/ListeningMapDiagram';
import { CandidateAiPilotPanel } from './common/CandidateAiPilotPanel';
import { CDIELTSExamMode } from './cdielts/CDIELTSExamMode';
import { BarnabyHintCard, HintLoopPhase } from './common/BarnabyHintCard';
import { requestBarnabyPracticeHint } from '../services/geminiService';
import { setBarnabyAnalyzing } from '../utils/getBarnabyState';
import { triggerBarnabyCelebration } from '../utils/barnabyStateEngine';
import { recordHintRecoveryXp, XP_HINT_RECOVERY } from '../services/streakService';
import type { MockExamSet } from '../data/mockExams';
import {
  ListeningAccentMode,
  loadAdaptivePreferences,
  saveAdaptivePreferences,
  saveActiveLabDrafts,
  resolveListeningSpeakerForAccent
} from '../services/adaptivePreferencesStore';

const LISTENING_STORAGE_KEY = 'ielts_sprint_listening_state_v3';

interface ListeningPersistedState {
  activeSection: 1 | 2 | 3 | 4;
  questionIds: string[];
  activeQuestionIndex: number;
  userAnswers: Record<string, string>;
  flaggedQuestions: Record<string, boolean>;
  isEvaluated: boolean;
  scoreSummary: { correct: number; total: number; band: number } | null;
  savedAt: number;
  mode: 'adaptive_10' | 'all' | 'weakness';
}

interface ListeningLabProps {
  onShowToast: (msg: string) => void;
  onBack?: () => void;
}

function getListeningBanglaTrapNote(q: IELTSQuestion, section: 1 | 2 | 3 | 4): string {
  const qType = (q.questionType || '').toLowerCase();
  const prompt = (q.prompt || '').toLowerCase();
  const exp = (q.explanation || '').trim();

  if (qType.includes('map') || prompt.includes('map') || prompt.includes('opposite') || prompt.includes('located')) {
    return `ম্যাপ ও দিকনির্দেশনার ফাঁদ (Section ${section}): স্পিকার শুরুর ল্যান্ডমার্ক থেকে বাম/ডান বা উত্তর/দক্ষিণ বলে দিক পরিবর্তন করেন। প্রথমে বলা ভুল জায়গার নাম লিখে ফেলবেন না—চূড়ান্ত অবস্থানটি মিলিয়ে নিন।${exp ? ` (${exp})` : ''}`;
  }
  if (section === 1 || qType.includes('form') || prompt.includes('postcode') || prompt.includes('phone') || prompt.includes('surname')) {
    return `Section 1 সেল্ফ-কারেকশন ও স্পেলিং ফাঁদ: স্পিকার প্রথমে একটি সংখ্যা, তারিখ বা বানান বলেই 'Sorry', 'Actually' বা 'Wait' বলে সংশোধন করেন। সর্বশেষ সংশোধিত তথ্য ও সঠিক একবচন/বহুবচন খেয়াল রাখুন।${exp ? ` (${exp})` : ''}`;
  }
  if (section === 2) {
    return `Section 2 মনোলগ ডিস্ট্র্যাক্টর: গাইড প্রথমে পুরোনো তথ্য বা বন্ধ হয়ে যাওয়া সুবিধার কথা বলে পরে বর্তমান বা নতুন তথ্যটি দেন। সাইনপোস্ট শব্দ ('however', 'nowadays', 'instead') শুনে সঠিক উত্তর ধরুন।${exp ? ` (${exp})` : ''}`;
  }
  if (section === 3) {
    return `Section 3 ডায়ালগ মতৈক্য ফাঁদ: দুই ছাত্র বা টিউটরের মধ্যে প্রথমজন একটি আইডিয়া প্রস্তাব করলেও দ্বিতীয়জন সেটি নাকচ করে দেন। দুজন যে অপশনে শেষ পর্যন্ত একমত হন সেটিই সঠিক উত্তর।${exp ? ` (${exp})` : ''}`;
  }
  return `Section 4 একাডেমিক সাইনপোস্ট ও প্যারাফ্রেজ: লেকচারে প্রশ্নের হুবহু শব্দের বদলে সমার্থক শব্দ (synonym) ব্যবহার করা হয়। শূন্যস্থানের আগে ও পরের গ্রামার (noun/adjective/plural) মিলিয়ে চূড়ান্ত শব্দটি লিখুন।${exp ? ` (${exp})` : ''}`;
}

export const ListeningLab: React.FC<ListeningLabProps> = React.memo(({ onShowToast, onBack }) => {
  // Primary IELTS Listening Mode: Distraction-free CD-IELTS Workstation, Realistic Mock, or Section Practice
  const [viewMode, setViewMode] = useState<'cdielts_workstation' | 'authentic_mock' | 'section_practice'>('cdielts_workstation');
  const [showAiPilotPanel, setShowAiPilotPanel] = useState<boolean>(false);
  const [activeListeningPilotSet, setActiveListeningPilotSet] = useState<MockExamSet | null>(null);

  // Active IELTS Listening Section (1 to 4)
  const [activeSection, setActiveSection] = useState<1 | 2 | 3 | 4>(1);
  const [mode, setMode] = useState<'adaptive_10' | 'all' | 'weakness'>('adaptive_10');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showTranscript, setShowTranscript] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Loaded questions for current section
  const [questions, setQuestions] = useState<IELTSQuestion[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [activeScenarioTopic, setActiveScenarioTopic] = useState<string>('');

  // User input answers map: { [questionId]: string }
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  // Flagged questions for review
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});

  const [isEvaluated, setIsEvaluated] = useState(false);
  const [scoreSummary, setScoreSummary] = useState<{ correct: number; total: number; band: number } | null>(null);
  const [explanationLang, setExplanationLang] = useState<'en' | 'bn'>('en');
  const [pushedMissedToSprint, setPushedMissedToSprint] = useState(false);
  const [hasRestoredSession, setHasRestoredSession] = useState(false);
  const [isLoadingListening, setIsLoadingListening] = useState(false);

  // Interactive Hint-Before-Reveal Loop state (strictly active in untimed Section Practice Mode)
  const [hintLoopByQId, setHintLoopByQId] = useState<
    Record<
      string,
      {
        phase: HintLoopPhase;
        attempt1Answer: string;
        attempt2Answer?: string;
        hintHeadline?: string;
        hintBody?: string;
        distractorAnalysis?: string;
        revealExplanation?: string;
      }
    >
  >({});

  // Focus ref for text inputs
  const inputRef = useRef<HTMLInputElement>(null);

  // Real-time audio playback state for visual waveform feedback
  const [audioPlaybackState, setAudioPlaybackState] = useState<AudioPlaybackState>(audioService.getState());
  const [autoFollowAudio, setAutoFollowAudio] = useState<boolean>(true);

  // Accent Rotation (UK / AU / US / Mixed) + Strict 1-Play Exam Mode with 30s Check-Your-Answers Countdown
  const mapProfileAccentToListeningMode = (accent: OfficialIELTSAccent): ListeningAccentMode => {
    if (accent === 'Australian') return 'au';
    if (accent === 'American' || accent === 'Canadian') return 'us';
    if (accent === 'British') return 'uk';
    return 'mixed';
  };

  const [accentMode, setAccentMode] = useState<ListeningAccentMode>(
    () => loadAdaptivePreferences().listeningAccent || mapProfileAccentToListeningMode(getPreferredAccent())
  );
  const [strictOnePlayMode, setStrictOnePlayMode] = useState<boolean>(
    () => loadAdaptivePreferences().strictExamListening
  );
  const [sectionAudioConsumed, setSectionAudioConsumed] = useState<boolean>(false);
  const [checkAnswersCountdownSec, setCheckAnswersCountdownSec] = useState<number | null>(null);
  const wasPlayingRef = useRef<boolean>(false);

  useEffect(() => {
    const onProfileAccentChange = (e: Event) => {
      const detail = (e as CustomEvent<{ accent?: OfficialIELTSAccent }>).detail;
      if (detail?.accent) {
        const mapped = mapProfileAccentToListeningMode(detail.accent);
        setAccentMode(mapped);
        saveAdaptivePreferences({ listeningAccent: mapped });
      }
    };
    window.addEventListener('ielts_accent_changed', onProfileAccentChange);
    const unsub = audioService.subscribe((s) => {
      setAudioPlaybackState(s);
    });
    return () => {
      window.removeEventListener('ielts_accent_changed', onProfileAccentChange);
      unsub();
    };
  }, []);

  // Detect natural completion of section audio to lock 1-Play Exam Mode & start 30s Check-Your-Answers timer
  useEffect(() => {
    const isNowPlaying = audioPlaybackState.isPlaying;
    const dur = audioPlaybackState.duration || 0;
    const cur = audioPlaybackState.currentTime || 0;
    const nearEnd = dur > 5 && cur >= dur - 1.5;

    if (wasPlayingRef.current && !isNowPlaying && nearEnd && strictOnePlayMode) {
      setSectionAudioConsumed(true);
      setCheckAnswersCountdownSec(30);
      soundManager.playBeep(720, 0.08);
      onShowToast('Section audio complete — 30 seconds to check your answers.');
    }
    wasPlayingRef.current = isNowPlaying;
  }, [audioPlaybackState.isPlaying, audioPlaybackState.currentTime, audioPlaybackState.duration, strictOnePlayMode, onShowToast]);

  // 30-second Check-Your-Answers countdown ticker
  useEffect(() => {
    if (checkAnswersCountdownSec === null) return;
    if (checkAnswersCountdownSec <= 0) {
      soundManager.playChimeTimeUp();
      onShowToast('30-second answer check complete. Advance to the next section or submit.');
      return;
    }
    const timer = window.setTimeout(() => {
      setCheckAnswersCountdownSec((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [checkAnswersCountdownSec, onShowToast]);

  // Sync active listening section across devices
  useEffect(() => {
    saveActiveLabDrafts({ activeModule: 'listening', listeningSection: activeSection });
  }, [activeSection]);

  const handleAccentChange = (nextAccent: ListeningAccentMode) => {
    setAccentMode(nextAccent);
    saveAdaptivePreferences({ listeningAccent: nextAccent });
    audioService.stop();
    stopSpeech();
    soundManager.playBeep(560, 0.04);
    const labels: Record<ListeningAccentMode, string> = {
      uk: 'British RP (UK)',
      au: 'Australian (AU)',
      us: 'American (US)',
      mixed: 'Mixed Exam Rotation (UK · AU · US)'
    };
    onShowToast(`Listening accent set to ${labels[nextAccent]}.`);
  };

  const handleToggleStrictExamMode = () => {
    const next = !strictOnePlayMode;
    setStrictOnePlayMode(next);
    setSectionAudioConsumed(false);
    setCheckAnswersCountdownSec(null);
    saveAdaptivePreferences({ strictExamListening: next });
    soundManager.playBeep(next ? 680 : 480, 0.05);
    onShowToast(
      next
        ? 'Strict 1-Play Exam Mode enabled: audio plays once per section followed by a 30s review timer.'
        : 'Practice Replay Mode restored: you can replay and seek freely.'
    );
  };

  // 1. Initial State Restoration from localStorage with IndexedDB fallback
  useEffect(() => {
    let isCancelled = false;

    const restoreSession = async () => {
      try {
        const raw = localStorage.getItem(LISTENING_STORAGE_KEY);
        if (raw) {
          const parsed: ListeningPersistedState = JSON.parse(raw);
          if (parsed && parsed.isEvaluated) {
            // Do not trap returning learners on an already-completed test; clear and load a fresh scenario
            localStorage.removeItem(LISTENING_STORAGE_KEY);
          } else if (parsed && Array.isArray(parsed.questionIds) && parsed.questionIds.length > 0) {
            const restoredQuestions: IELTSQuestion[] = [];
            for (const qId of parsed.questionIds) {
              const found = questionEngine.getQuestionById(qId);
              if (found) {
                restoredQuestions.push(found);
              }
            }

            if (restoredQuestions.length > 0 && !isCancelled) {
              const secNum = parsed.activeSection || 1;
              setActiveSection(secNum);
              setMode(parsed.mode || 'adaptive_10');
              setQuestions(restoredQuestions);
              setActiveScenarioTopic(restoredQuestions[0]?.topic || `Section ${secNum}`);
              setActiveQuestionIndex(
                parsed.activeQuestionIndex >= 0 && parsed.activeQuestionIndex < restoredQuestions.length
                  ? parsed.activeQuestionIndex
                  : 0
              );
              setUserAnswers(parsed.userAnswers || {});
              setFlaggedQuestions(parsed.flaggedQuestions || {});
              setIsEvaluated(false);
              setScoreSummary(null);
              setHasRestoredSession(true);
              return;
            }
          }
        }

        // Secondary fallback: IndexedDB testPersistenceService
        const idbSession = await testPersistenceService.getProgress('listening_lab_sec_1') ||
                           await testPersistenceService.getProgress('listening_lab_sec_2') ||
                           await testPersistenceService.getProgress('listening_lab_sec_3') ||
                           await testPersistenceService.getProgress('listening_lab_sec_4');

        if (idbSession && idbSession.meta?.questionIds && Array.isArray(idbSession.meta.questionIds) && !isCancelled) {
          const restoredQuestions: IELTSQuestion[] = [];
          for (const qId of idbSession.meta.questionIds) {
            const found = questionEngine.getQuestionById(qId);
            if (found) restoredQuestions.push(found);
          }

          if (restoredQuestions.length > 0) {
            const secNum = (idbSession.activeSection as any) || 1;
            setActiveSection(secNum);
            setMode(idbSession.meta.mode || 'adaptive_10');
            setQuestions(restoredQuestions);
            setActiveScenarioTopic(restoredQuestions[0]?.topic || `Section ${secNum}`);
            setActiveQuestionIndex(idbSession.currentQuestionIndex || 0);
            setUserAnswers(idbSession.answers || {});
            setFlaggedQuestions(idbSession.flagged || {});
            setIsEvaluated(Boolean(idbSession.meta.isEvaluated));
            setScoreSummary(idbSession.meta.scoreSummary || null);
            setHasRestoredSession(true);
            return;
          }
        }
      } catch (e) {
      }

      if (!isCancelled) {
        // Default load if nothing stored
        loadSectionQuestions(1, 'adaptive_10', false);
      }
    };

    restoreSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Available scenarios/topics for the active section (17 in S1, 7 in S2, 10 in S3, 9 in S4)
  const availableTopicsForSection = useMemo(() => {
    const secQuestions = questionEngine
      .getAllQuestions()
      .filter((q) => q.module === 'listening' && q.section === activeSection);
    return Array.from(new Set(secQuestions.map((q) => q.topic).filter(Boolean)));
  }, [activeSection]);

  // 2. Load questions for a chosen section and mode with Zero-Repetition guarantee (Asynchronous non-blocking)
  const loadSectionQuestions = useCallback(
    (
      sectionNumber: 1 | 2 | 3 | 4,
      targetMode: 'adaptive_10' | 'all' | 'weakness' = mode,
      showFeedback = true,
      targetTopic?: string
    ) => {
      setIsLoadingListening(true);
      audioService.stop();
      stopSpeech();
      setIsEvaluated(false);
      setScoreSummary(null);
      setPushedMissedToSprint(false);

      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            const allSecQuestions = questionEngine
              .getAllQuestions()
              .filter((q) => q.module === 'listening' && q.section === sectionNumber);

            let loaded: IELTSQuestion[] = [];
            let statusNote = '';

            if (targetMode === 'all') {
              loaded = allSecQuestions;
              const firstTopic = loaded[0]?.topic || `Section ${sectionNumber}`;
              setActiveScenarioTopic(firstTopic);
              statusNote = `Section ${sectionNumber} Complete Bank Loaded (${loaded.length} questions).`;
            } else if (targetMode === 'weakness') {
              loaded = questionEngine.selectAdaptiveQuestions({
                module: 'listening',
                section: sectionNumber,
                count: 10,
                mode: 'weakness'
              });
              const firstTopic = loaded[0]?.topic || `Section ${sectionNumber}`;
              setActiveScenarioTopic(firstTopic);
              statusNote = `Section ${sectionNumber} Weakness Drill Loaded (${loaded.length} questions).`;
            } else {
              // Zero-Repetition Engine: selects unseen curated scenario or synthesizes brand-new Original Practice scenario
              const uniqueResult = zeroRepetitionEngine.selectUniqueSectionScenario(
                sectionNumber,
                10,
                targetTopic
              );
              loaded = uniqueResult.questions;
              const chosenTopicName = loaded[0]?.topic || targetTopic || `Section ${sectionNumber}`;
              setActiveScenarioTopic(chosenTopicName);
              statusNote = uniqueResult.inventoryReport.statusMessage;
            }

            if (loaded.length === 0) {
              loaded = allSecQuestions;
            }

            setQuestions(loaded);
            setActiveQuestionIndex(0);

            const initialAns: Record<string, string> = {};
            const initialFlags: Record<string, boolean> = {};
            loaded.forEach((q) => {
              initialAns[q.id] = '';
              initialFlags[q.id] = false;
            });

            setUserAnswers(initialAns);
            setFlaggedQuestions(initialFlags);
            setHasRestoredSession(false);

            saveSessionState(sectionNumber, loaded, 0, initialAns, initialFlags, false, null, targetMode);

            if (showFeedback) {
              soundManager.playBeep(600, 0.08);
              onShowToast(statusNote || `Section ${sectionNumber} Loaded (${loaded.length} questions ready).`);
            }
          } catch (err) {
            console.error('Error loading listening section questions:', err);
            onShowToast('Error loading listening section. Reverting to default question bank.');
            const fallback = questionEngine.getAllQuestions().filter((q) => q.module === 'listening' && q.section === sectionNumber);
            setQuestions(fallback);
          } finally {
            setIsLoadingListening(false);
          }
        }, 20);
      });
    },
    [mode, onShowToast]
  );

  // Helper to persist state to localStorage
  const saveSessionState = (
    sec: 1 | 2 | 3 | 4,
    qs: IELTSQuestion[],
    idx: number,
    ans: Record<string, string>,
    flags: Record<string, boolean>,
    evaluated: boolean,
    summary: { correct: number; total: number; band: number } | null,
    currentMode: 'adaptive_10' | 'all' | 'weakness'
  ) => {
    try {
      const stateToSave: ListeningPersistedState = {
        activeSection: sec,
        questionIds: qs.map((q) => q.id),
        activeQuestionIndex: idx,
        userAnswers: ans,
        flaggedQuestions: flags,
        isEvaluated: evaluated,
        scoreSummary: summary,
        savedAt: Date.now(),
        mode: currentMode
      };
      localStorage.setItem(LISTENING_STORAGE_KEY, JSON.stringify(stateToSave));

      // Also persist to IndexedDB service to withstand buffering and browser unmounts
      testPersistenceService.saveProgress({
        sessionId: `listening_lab_sec_${sec}`,
        testType: 'listening_lab',
        activeSection: sec,
        currentQuestionIndex: idx,
        answers: ans,
        flagged: flags,
        status: evaluated ? 'review' : 'active',
        updatedAt: Date.now(),
        meta: {
          questionIds: qs.map((q) => q.id),
          isEvaluated: evaluated,
          scoreSummary: summary,
          mode: currentMode
        }
      });
    } catch (e) {
      console.warn('Failed to save listening session to localStorage:', e);
    }
  };

  // Auto-save on answer change or question switch with debouncing
  useEffect(() => {
    if (questions.length === 0) return;
    const timer = setTimeout(() => {
      saveSessionState(
        activeSection,
        questions,
        activeQuestionIndex,
        userAnswers,
        flaggedQuestions,
        isEvaluated,
        scoreSummary,
        mode
      );
    }, 800);

    return () => clearTimeout(timer);
  }, [activeSection, questions, activeQuestionIndex, userAnswers, flaggedQuestions, isEvaluated, scoreSummary, mode]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      audioManager.killAllAudio();
    };
  }, []);

  // When candidate intentionally switches entire section or scenario after initialization, cleanly reset prior audio
  const prevScenarioKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeScenarioTopic) return;
    const nextKey = `${activeSection}::${activeScenarioTopic}`;
    if (prevScenarioKeyRef.current !== null && prevScenarioKeyRef.current !== nextKey) {
      audioManager.reset(`switch_section_${activeSection}`);
    }
    prevScenarioKeyRef.current = nextKey;
  }, [activeSection, activeScenarioTopic]);

  // Handle Section Tab switching
  const handleSelectSection = (sec: 1 | 2 | 3 | 4) => {
    if (sec === activeSection && questions.length > 0) return;
    setSectionAudioConsumed(false);
    setCheckAnswersCountdownSec(null);
    setActiveSection(sec);
    loadSectionQuestions(sec, mode, true);
  };

  // Switch Mode (10 adaptive vs All vs Weakness)
  const handleSelectMode = (newMode: 'adaptive_10' | 'all' | 'weakness') => {
    setMode(newMode);
    loadSectionQuestions(activeSection, newMode, true);
  };

  // Switch to a new or different scenario track and audio
  const handleSwitchScenario = (newTopic?: string) => {
    audioService.stop();
    stopSpeech();
    audioManager.reset('switch_scenario');

    const topics = availableTopicsForSection;
    let nextTopic = newTopic;
    if (!nextTopic && topics.length > 0) {
      const candidates = topics.filter((t) => t !== activeScenarioTopic);
      const pool = candidates.length > 0 ? candidates : topics;
      nextTopic = pool[Math.floor(Math.random() * pool.length)];
    }

    if (nextTopic) {
      loadSectionQuestions(activeSection, mode, true, nextTopic);
      soundManager.playBeep(650, 0.08);
      onShowToast(`🎧 Switched scenario: "${nextTopic}"`);
    }
  };

  // Shuffle fresh questions & audio scenario for current section
  const handleShuffleFreshScenario = () => {
    handleSwitchScenario();
  };

  // Reset session
  const handleResetSession = () => {
    localStorage.removeItem(LISTENING_STORAGE_KEY);
    handleSwitchScenario();
    onShowToast('Session cleared. Fresh audio scenario ready.');
  };

  // Toggle flag for the current question
  const handleToggleFlag = (qId: string) => {
    setFlaggedQuestions((prev) => {
      const next = { ...prev, [qId]: !prev[qId] };
      soundManager.playBeep(next[qId] ? 700 : 450, 0.05);
      return next;
    });
  };

  // Compile full audio dialogue covering ALL active questions in the session with authentic Practice test structure
  const currentDialogue = useMemo(() => {
    if (questions.length === 0) return [];

    const partMeta = getListeningPartMeta(activeSection);
    const mergedLines: DialogueLine[] = [];
    const seenTexts = new Set<string>();

    const totalQuestions = questions.length;
    // Practice authentic split: 1-5 and 6-10 for 10 questions, or halfway
    const splitPoint = totalQuestions > 5 ? Math.min(5, Math.ceil(totalQuestions / 2)) : totalQuestions;

    // Determine representative topic labels
    const distinctTopics = Array.from(new Set(questions.map((q) => q.topic).filter(Boolean)));
    const topicsLabel =
      distinctTopics.length === 1
        ? distinctTopics[0]
        : distinctTopics.length > 1
        ? `${distinctTopics[0]} and ${distinctTopics[1]}`
        : activeScenarioTopic || 'Practice Audio';

    const startQNum = (activeSection - 1) * 10 + 1;
    const midQNum = (activeSection - 1) * 10 + splitPoint;
    const endQNum = (activeSection - 1) * 10 + totalQuestions;

    // 1. Practice Examiner Intro
    mergedLines.push({
      speaker: 'British Examiner (Arthur)',
      speakerId: 'speaker_04',
      gender: 'male',
      text: `International English Language Testing System. Section Practice Mode. Part ${activeSection}, ${partMeta.questionRangeLabel}. You will hear a recording concerning ${topicsLabel}. First, you have some time to look at Questions ${startQNum} to ${midQNum}.`,
      pauseAfterMs: 750
    });

    mergedLines.push({
      speaker: 'British Examiner (Arthur)',
      speakerId: 'speaker_04',
      gender: 'male',
      text: `Now listen carefully to the recording and answer Questions ${startQNum} to ${midQNum}.`,
      pauseAfterMs: 450
    });

    // Helper to process question dialogue lines with speaker assignment
    const processQuestionBatch = (startIdx: number, endIdx: number) => {
      const rawBatchLines: Array<{
        speaker?: string;
        speakerId?: string;
        gender?: 'male' | 'female';
        text: string;
        pauseAfterMs?: number;
      }> = [];

      for (let i = startIdx; i < endIdx; i++) {
        const q = questions[i];
        if (!q) continue;

        if (q.dialogue && q.dialogue.length > 0) {
          q.dialogue.forEach((line) => {
            const t = formatIELTSSpeechText((line.text || '').trim());
            if (t && !seenTexts.has(t)) {
              seenTexts.add(t);
              rawBatchLines.push({
                speaker: line.speaker,
                speakerId: line.speakerId,
                gender: line.gender,
                text: t,
                pauseAfterMs: line.pauseAfterMs ?? (activeSection === 4 ? 320 : 260)
              });
            }
          });
        } else if (q.audioScript) {
          const sentences = q.audioScript.split(/(?<=[.?!])\s+/).filter((s) => s.trim().length > 0);
          sentences.forEach((s) => {
            const t = formatIELTSSpeechText(s.trim());
            if (t && !seenTexts.has(t)) {
              seenTexts.add(t);
              rawBatchLines.push({
                speaker: activeSection === 2 ? 'Community Guide' : activeSection === 4 ? 'Lecturer' : 'Speaker',
                gender: activeSection === 2 ? 'female' : 'male',
                text: t,
                pauseAfterMs: 300
              });
            }
          });
        } else {
          // Synthesize an authentic spoken dialogue turn directly providing context and answer for this question
          const ans = Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer || '';
          const promptClean = q.prompt.replace(/\[\d+\]/g, '').trim();
          const qNum = (activeSection - 1) * 10 + i + 1;
          const turnLineA = `Regarding Question ${qNum}, ${promptClean}, let us note the exact detail.`;
          const turnLineB = `The confirmed specification is ${ans}. That directly satisfies Question ${qNum}.`;
          rawBatchLines.push({
            speaker: 'Advisor (Oliver)',
            gender: 'male',
            text: turnLineA,
            pauseAfterMs: 260
          });
          rawBatchLines.push({
            speaker: 'Student (Eleanor)',
            gender: 'female',
            text: turnLineB,
            pauseAfterMs: 300
          });
        }
      }

      const resolvedLines = assignSectionDialogueSpeakers(
        rawBatchLines,
        activeSection,
        activeSection === 2
          ? 'Community Guide (Charlotte)'
          : activeSection === 4
          ? 'University Lecturer (Arthur)'
          : 'Speaker'
      );

      resolvedLines.forEach((rl) => {
        mergedLines.push({
          speaker: rl.speaker,
          speakerName: rl.speakerName,
          speakerId: rl.speakerId,
          gender: rl.gender,
          text: rl.text,
          pauseAfterMs: rl.pauseAfterMs
        });
      });
    };

    // 2. Part A: Questions 1 to splitPoint
    processQuestionBatch(0, splitPoint);

    // 3. Practice Mid-Section Pause & Transition if more questions remain
    if (totalQuestions > splitPoint) {
      mergedLines.push({
        speaker: 'British Examiner (Arthur)',
        speakerId: 'speaker_04',
        gender: 'male',
        text: `Before you hear the rest of the recording, you have some time to look at Questions ${midQNum + 1} to ${endQNum}.`,
        pauseAfterMs: 800
      });

      mergedLines.push({
        speaker: 'British Examiner (Arthur)',
        speakerId: 'speaker_04',
        gender: 'male',
        text: `Now listen and answer Questions ${midQNum + 1} to ${endQNum}.`,
        pauseAfterMs: 450
      });

      // Part B: Questions (splitPoint + 1) to totalQuestions
      processQuestionBatch(splitPoint, totalQuestions);
    }

    // 4. Practice Section Conclusion
    mergedLines.push({
      speaker: 'Practice Examiner (Arthur)',
      speakerId: 'speaker_04',
      gender: 'male',
      text: `That is the end of Part ${activeSection}. You now have half a minute to check your answers.`,
      pauseAfterMs: 0
    });

    return mergedLines;
  }, [questions, activeSection, activeScenarioTopic]);

  // Audio Playback using professional audioManager & audioService (Synchronous user-gesture trigger)
  const handlePlayAudio = useCallback(() => {
    try {
      if (strictOnePlayMode && sectionAudioConsumed) {
        soundManager.playBeep(320, 0.08);
        onShowToast('Strict 1-Play Exam Mode: this section audio has already played once. Switch sections or toggle Exam Mode off to replay.');
        return;
      }

      audioService.unlockAudio();
      soundManager.playBeep(600, 0.1);

      if (questions.length === 0) return;

      const dialogueLines: DialogueLine[] = currentDialogue.map((line, idx) => {
        const baseSpeakerId = resolveDialogueLineSpeakerId(line, activeSection);
        const isExaminerAnnouncer = /examiner/i.test(line.speaker || '');
        const accentResolved = resolveListeningSpeakerForAccent(
          accentMode,
          line.gender || 'male',
          idx,
          activeSection
        );
        const speakerId =
          accentMode === 'uk' && !isExaminerAnnouncer
            ? baseSpeakerId
            : isExaminerAnnouncer && accentMode === 'uk'
            ? baseSpeakerId
            : accentResolved.speakerId;
        const isLast = idx === currentDialogue.length - 1;
        return {
          speakerId,
          speakerName: line.speaker,
          gender: line.gender,
          text: line.text,
          pauseAfterMs: isLast ? 0 : (line.pauseAfterMs ?? 260)
        };
      });

      // Create stable section-level audio metadata
      const firstQ = questions[0] || {
        questionType: 'multiple_choice' as const,
        difficulty: 'medium' as const,
        skillTags: ['listening'],
        source: 'sprint_standard' as const,
        version: 1,
        createdAt: Date.now()
      };
      const sectionDialogueQuestion: IELTSQuestion = {
        ...firstQ,
        id: `listening_sec_${activeSection}_${activeScenarioTopic || 'default'}_${accentMode}`,
        module: 'listening',
        section: activeSection,
        topic: activeScenarioTopic || 'Practice Recording',
        prompt: `Listening Section ${activeSection}`,
        dialogue: dialogueLines.map((l) => ({
          speaker: l.speakerName || 'Speaker',
          speakerId: l.speakerId,
          gender: l.gender,
          text: l.text,
          pauseAfterMs: l.pauseAfterMs
        }))
      };

      audioManager.playQuestionAudio(sectionDialogueQuestion, {
        allowReplay: !strictOnePlayMode,
        onError: (err) => {
          if (isInterruptedPlaybackError(err)) return;
          onShowToast('Audio stream reconnection in progress...');
        }
      });
    } catch (err) {
      console.error('Audio unlock or trigger error:', err);
      onShowToast('Audio initialization error.');
    }
  }, [currentDialogue, activeSection, questions, activeScenarioTopic, accentMode, strictOnePlayMode, sectionAudioConsumed, onShowToast]);

  const handleStopAudio = useCallback(() => {
    audioManager.pause();
  }, []);

  // Synchronized question audio cues mapping all questions (e.g. 10 questions) across recording duration
  const audioDurationForSync = audioPlaybackState.duration > 15 ? audioPlaybackState.duration : 47;
  const audioSyncCues = useMemo(() => {
    return computeListeningAudioSyncMap(
      questions,
      audioDurationForSync,
      currentDialogue,
      activeSection
    );
  }, [questions, audioDurationForSync, currentDialogue, activeSection]);

  // Active question cue matching the current audio timestamp
  const activeAudioCueIdx = useMemo(() => {
    if (!audioSyncCues.length) return 0;
    return findActiveQuestionIndexForTimestamp(audioPlaybackState.currentTime || 0, audioSyncCues);
  }, [audioPlaybackState.currentTime, audioSyncCues]);

  // Auto-follow audio when enabled during playback
  useEffect(() => {
    if (autoFollowAudio && audioPlaybackState.isPlaying && audioSyncCues.length > 0) {
      if (activeAudioCueIdx !== activeQuestionIndex && activeAudioCueIdx >= 0 && activeAudioCueIdx < questions.length) {
        setActiveQuestionIndex(activeAudioCueIdx);
      }
    }
  }, [autoFollowAudio, audioPlaybackState.isPlaying, activeAudioCueIdx, activeQuestionIndex, audioSyncCues.length, questions.length]);

  // Handler to seek audio playback directly to a question's audio cue
  const handleSeekToQuestionAudio = useCallback(
    (questionIdx: number) => {
      if (!audioSyncCues[questionIdx]) return;
      const targetTime = audioSyncCues[questionIdx].startTime;
      audioService.seek(targetTime);
      setActiveQuestionIndex(questionIdx);
      if (!audioPlaybackState.isPlaying) {
        handlePlayAudio();
      }
    },
    [audioSyncCues, audioPlaybackState.isPlaying, handlePlayAudio]
  );

  const evaluatePracticeAttempt = (qObj: IELTSQuestion, candidateVal: string) => {
    if (viewMode !== 'section_practice' || isEvaluated) return;
    const cleanVal = candidateVal.trim();
    if (!cleanVal) return;

    const existing = hintLoopByQId[qObj.id];
    const isRight = isAnswerCorrect(qObj, cleanVal);
    const correctDisplay = formatDisplayedCorrectAnswer(qObj);

    if (!existing) {
      if (!isRight) {
        // Attempt 1 incorrect intercept -> Barnaby analyzing -> encouraging hint without revealing answer
        setHintLoopByQId((prev) => ({
          ...prev,
          [qObj.id]: {
            phase: 'analyzing',
            attempt1Answer: cleanVal
          }
        }));
        setBarnabyAnalyzing(true, 'Analyzing Listening audio distractor...');
        soundManager.playBeep(420, 0.06);

        const transcriptSnippet = currentDialogue
          .slice(0, 10)
          .map((d) => `${d.speaker}: ${d.text}`)
          .join('\n');

        requestBarnabyPracticeHint({
          module: 'listening',
          questionPrompt: qObj.prompt,
          questionType: qObj.questionType,
          topic: `Section ${activeSection}: ${activeScenarioTopic || qObj.topic || 'Listening Practice'}`,
          evidenceContext: transcriptSnippet,
          userAnswer: cleanVal,
          correctAnswer: correctDisplay,
          trapNote: qObj.explanation,
          isAnswerRevealed: false,
          attemptMode: 'hint_before_reveal'
        })
          .then((res) => {
            setHintLoopByQId((prev) => {
              const cur = prev[qObj.id];
              if (!cur || cur.phase !== 'analyzing') return prev;
              return {
                ...prev,
                [qObj.id]: {
                  ...cur,
                  phase: 'hint_attempt_1',
                  hintHeadline: res.headline,
                  hintBody: res.stepByStepExplanation,
                  distractorAnalysis: res.distractorTrapAnalysis
                }
              };
            });
          })
          .catch(() => {
            setHintLoopByQId((prev) => {
              const cur = prev[qObj.id];
              if (!cur || cur.phase !== 'analyzing') return prev;
              return {
                ...prev,
                [qObj.id]: {
                  ...cur,
                  phase: 'hint_attempt_1',
                  hintHeadline: `Re-listen for a speaker self-correction or paraphrase around "${cleanVal}"`,
                  hintBody:
                    'Check whether the speaker corrected an earlier detail or used a synonym instead of repeating the exact wording from the question.',
                  distractorAnalysis:
                    'Listening distractors often appear right before markers like "actually", "sorry", or "instead".'
                }
              };
            });
          })
          .finally(() => {
            setBarnabyAnalyzing(false);
          });
      }
      return;
    }

    if (existing.phase === 'hint_attempt_1' || existing.phase === 'analyzing') {
      if (cleanVal.toLowerCase() === existing.attempt1Answer.toLowerCase()) {
        return;
      }
      if (isRight) {
        soundManager.playSuccess();
        recordHintRecoveryXp(`listening_${qObj.id}`);
        triggerBarnabyCelebration('Listening Attempt 2 recovered');
        setHintLoopByQId((prev) => ({
          ...prev,
          [qObj.id]: {
            ...existing,
            phase: 'recovered_attempt_2',
            attempt2Answer: cleanVal,
            revealExplanation:
              qObj.explanation || 'You caught the audio paraphrase on your second attempt.'
          }
        }));
        onShowToast(`Attempt 2 correct — +${XP_HINT_RECOVERY} XP awarded.`);
      } else {
        soundManager.playBeep(340, 0.08);
        addMistake({
          module: 'listening',
          title: `Listening Section ${activeSection}: ${qObj.prompt}`,
          userAnswer: cleanVal,
          correctAnswer: correctDisplay,
          explanation: qObj.explanation || 'Review the audio transcript clue for the distractor trap.',
          trapExplanationBn: getListeningBanglaTrapNote(qObj, activeSection)
        });
        setHintLoopByQId((prev) => ({
          ...prev,
          [qObj.id]: {
            ...existing,
            phase: 'revealed_attempt_2',
            attempt2Answer: cleanVal,
            revealExplanation:
              qObj.explanation || 'Compare your response against the verified speaker detail in the transcript.'
          }
        }));
      }
    }
  };

  // Answer handler
  const handleSelectAnswer = (qId: string, val: string, triggerHintCheck = false) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: val
    }));

    if (triggerHintCheck && viewMode === 'section_practice' && !isEvaluated) {
      const qObj = questions.find((item) => item.id === qId);
      if (qObj) {
        evaluatePracticeAttempt(qObj, val);
      }
    }
  };

  // Evaluate candidate answers strictly against Practice raw-score conversion table
  const handleVerifyAnswers = () => {
    setIsEvaluated(true);
    let correctCount = 0;

    questions.forEach((q) => {
      const userRaw = (userAnswers[q.id] || '').trim();
      const isUnanswered = userRaw.length === 0;
      const isCorrect = !isUnanswered && isAnswerCorrect(q, userRaw);

      if (isCorrect) {
        correctCount++;
      } else if (!isUnanswered) {
        // Record actual candidate mistake in vault
        addMistake({
          module: 'listening',
          title: `Listening Section ${activeSection}: ${q.prompt}`,
          userAnswer: userRaw,
          correctAnswer: formatDisplayedCorrectAnswer(q),
          explanation: q.explanation || 'Review Practice audio transcript clues carefully.',
          trapExplanationBn: getListeningBanglaTrapNote(q, activeSection)
        });
      }

      // Record in centralized QuestionEngine (mark skipped questions explicitly as unanswered with 0 points)
      questionEngine.recordAttempt({
        questionId: q.id,
        module: 'listening',
        questionType: q.questionType,
        topic: q.topic,
        userAnswer: isUnanswered ? 'unanswered' : userRaw,
        isCorrect,
        score: isCorrect ? 1 : 0,
        explanation: q.explanation,
        skipMistakeVault: true
      });
    });

    const total = questions.length;
    const scaledRaw = total > 0 ? Math.round((correctCount / total) * 40) : 0;
    let band = 0.0;
    if (correctCount <= 0 || total <= 0) band = 0.0;
    else if (scaledRaw >= 39) band = 9.0;
    else if (scaledRaw >= 37) band = 8.5;
    else if (scaledRaw >= 35) band = 8.0;
    else if (scaledRaw >= 32) band = 7.5;
    else if (scaledRaw >= 30) band = 7.0;
    else if (scaledRaw >= 26) band = 6.5;
    else if (scaledRaw >= 23) band = 6.0;
    else if (scaledRaw >= 18) band = 5.5;
    else if (scaledRaw >= 16) band = 5.0;
    else if (scaledRaw >= 13) band = 4.5;
    else if (scaledRaw >= 10) band = 4.0;
    else if (scaledRaw >= 7) band = 3.5;
    else if (scaledRaw >= 4) band = 3.0;
    else if (scaledRaw >= 2) band = 2.5;
    else band = 2.0;

    const summary = { correct: correctCount, total, band };
    setScoreSummary(summary);

    if (correctCount === total && total > 0) {
      soundManager.playSuccess();
      onShowToast(`Sensational! Perfect ${correctCount}/${total} — Band ${band.toFixed(1)}`);
    } else {
      soundManager.playBeep(480, 0.1);
      onShowToast(`Scored ${correctCount}/${total} (Band ${band.toFixed(1)}).`);
    }
  };

  // Keyboard navigation and shortcut answering
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentQ = questions[activeQuestionIndex];
      if (!currentQ) return;

      // Arrow navigation
      if (e.key === 'ArrowLeft') {
        setActiveQuestionIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setActiveQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1));
      }

      // Option selection by letters A, B, C, D
      if (currentQ.options && currentQ.options.length > 0 && !isEvaluated) {
        const key = e.key.toUpperCase();
        const validLetters = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, currentQ.options.length);
        if (validLetters.includes(key)) {
          handleSelectAnswer(currentQ.id, key);
          soundManager.playBeep(650, 0.04);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [questions, activeQuestionIndex, isEvaluated]);

  const currentQ = questions[activeQuestionIndex] || questions[0];
  const answeredCount = questions.filter((q) => (userAnswers[q.id] || '').trim().length > 0).length;
  const flaggedCount = questions.filter((q) => flaggedQuestions[q.id]).length;

  const currentProgress = useMemo(() => {
    return getListeningQuestionProgress(activeQuestionIndex, questions.length, activeSection);
  }, [activeQuestionIndex, questions.length, activeSection]);

  // Filtered view if user toggles question types
  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => set.add(q.questionType));
    return Array.from(set);
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    if (typeFilter === 'all') return questions;
    return questions.filter((q) => q.questionType === typeFilter);
  }, [questions, typeFilter]);

  // Overall bank statistics
  const bankStats = useMemo(() => {
    const allLis = questionEngine.getAllQuestions().filter((q) => q.module === 'listening');
    return {
      total: allLis.length,
      s1: allLis.filter((q) => q.section === 1).length,
      s2: allLis.filter((q) => q.section === 2).length,
      s3: allLis.filter((q) => q.section === 3).length,
      s4: allLis.filter((q) => q.section === 4).length
    };
  }, []);

  if (activeListeningPilotSet) {
    return (
      <div className="fixed inset-0 z-40 bg-slate-100 dark:bg-slate-950 overflow-hidden">
        <CDIELTSExamMode
          customPilotSet={activeListeningPilotSet}
          initialSkill="listening"
          onShowToast={onShowToast}
          onExit={() => {
            setActiveListeningPilotSet(null);
            onShowToast('Exited Listening AI Pilot and returned to Listening Lab.');
          }}
        />
      </div>
    );
  }

  if (viewMode === 'cdielts_workstation') {
    return (
      <div className="fixed inset-0 z-40 bg-[#F5F7F6] overflow-hidden">
        <CDIELTSExamMode
          initialSkill="listening"
          standaloneSkill={true}
          secondaryModeLabel="Section Drills"
          onOpenSecondaryMode={() => {
            audioService.stop();
            stopSpeech();
            audioManager.killAllAudio();
            setViewMode('section_practice');
          }}
          onOpenAiPilots={() => {
            audioService.stop();
            stopSpeech();
            audioManager.killAllAudio();
            setViewMode('section_practice');
            setShowAiPilotPanel(true);
          }}
          onShowToast={onShowToast}
          onExit={() => {
            audioService.stop();
            stopSpeech();
            audioManager.killAllAudio();
            if (onBack) {
              onBack();
            } else {
              setViewMode('section_practice');
            }
          }}
        />
      </div>
    );
  }

  if (viewMode === 'authentic_mock') {
    return (
      <div className="space-y-4">
        {/* Switch between CD-IELTS Exam Workstation & Section Practice */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 font-mono uppercase tracking-wider">
              Computer-Delivered IELTS Listening Test · 40 Questions (30m Audio + 2m Check)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                audioService.stop();
                stopSpeech();
                setViewMode('cdielts_workstation');
              }}
              className="px-3 py-1.5 min-h-[40px] rounded-md bg-[#0F4C45] hover:bg-[#145E55] text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>CD-IELTS Exam Screen</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAiPilotPanel((prev) => !prev);
                soundManager.playBeep(620, 0.04);
              }}
              className={`px-3 py-1.5 min-h-[40px] rounded-md font-bold text-xs transition border flex items-center gap-1.5 cursor-pointer ${
                showAiPilotPanel
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showAiPilotPanel ? 'Hide AI Pilots' : 'AI Listening Pilots'}</span>
            </button>

            <button
              onClick={() => {
                setViewMode('section_practice');
                soundManager.playBeep(600, 0.04);
              }}
              className="px-3 py-1.5 min-h-[40px] rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Section Practice Mode</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {showAiPilotPanel && (
          <CandidateAiPilotPanel
            module="listening"
            moduleTitle="Listening"
            onLaunchApprovedPilot={(examSet) => {
              audioService.stop();
              stopSpeech();
              audioManager.killAllAudio();
              setActiveListeningPilotSet(examSet);
              soundManager.playSuccess();
              onShowToast(`Launched Approved Listening AI Pilot: "${examSet.title}"`);
            }}
          />
        )}

        <RealisticIELTSListeningTest
          onShowToast={onShowToast}
          onSwitchToPracticeMode={() => setViewMode('section_practice')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in pb-16">
      {/* Return to CD-IELTS Exam Workstation Banner */}
      <div className="p-3.5 rounded-lg bg-[#0F4C45] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#0B3B36]">
        <div className="flex items-center gap-2.5 text-xs">
          <Sparkles className="w-4 h-4 text-[#F4A62A] shrink-0" />
          <span>
            You are in <strong>Listening Section Drills</strong>. Switch back to the full-screen computer-delivered IELTS Listening examination anytime.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowAiPilotPanel((prev) => !prev);
              soundManager.playBeep(620, 0.04);
            }}
            className="px-3 py-1.5 min-h-[40px] rounded-md bg-white/10 hover:bg-white/20 text-white font-semibold text-xs shrink-0 transition flex items-center gap-1.5 border border-white/20 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{showAiPilotPanel ? 'Hide AI Pilots' : 'AI Listening Pilots'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode('cdielts_workstation');
              soundManager.playBeep(660, 0.05);
            }}
            className="px-3.5 py-1.5 min-h-[40px] rounded-md bg-[#F4A62A] hover:bg-[#E0951E] text-[#11201E] font-bold text-xs shrink-0 transition flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to CD-IELTS Listening Exam</span>
          </button>
        </div>
      </div>

      {showAiPilotPanel && (
        <CandidateAiPilotPanel
          module="listening"
          moduleTitle="Listening"
          onLaunchApprovedPilot={(examSet) => {
            audioService.stop();
            stopSpeech();
            audioManager.killAllAudio();
            setActiveListeningPilotSet(examSet);
            soundManager.playSuccess();
            onShowToast(`Launched Approved Listening AI Pilot: "${examSet.title}"`);
          }}
        />
      )}

      {/* Top Banner & Header (Editorial Deep Forest Teal + Dark Mode Parity) */}
      <div className="bg-white dark:bg-[#11201E] rounded-2xl border border-[#D3DDDA] dark:border-[#1F8A70]/35 p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono font-bold text-[#566664] dark:text-slate-400">
              <span className="text-[#0F4C45] dark:text-[#6EE7B7] uppercase tracking-wider inline-flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[#F4A62A]" />
                <span>Computer-Delivered Listening Suite</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{bankStats.total} Questions in Bank</span>
              {hasRestoredSession && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-700 dark:text-emerald-300">Session Resumed</span>
                </>
              )}
            </div>

            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0E1F1E] dark:text-[#EEF3F1] tracking-tight">
              IELTS Listening Laboratory
            </h2>
            <p className="text-xs sm:text-sm text-[#566664] dark:text-slate-400 max-w-2xl">
              Multi-accent IELTS audio (UK · AU · US · Mixed), strict 1-play exam mode with 30-second review timers, map labelling, and academic lectures.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex bg-[#EEF3F1] dark:bg-[#0B1514] p-1 rounded-xl border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-xs font-bold">
              <button
                onClick={() => handleSelectMode('adaptive_10')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  mode === 'adaptive_10'
                    ? 'bg-[#0F4C45] text-white'
                    : 'text-[#566664] dark:text-slate-300 hover:text-[#0E1F1E]'
                }`}
                title="10 Questions calibrated adaptively"
              >
                Adaptive 10
              </button>
              <button
                onClick={() => handleSelectMode('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  mode === 'all'
                    ? 'bg-[#0F4C45] text-white'
                    : 'text-[#566664] dark:text-slate-300 hover:text-[#0E1F1E]'
                }`}
                title="Practice all available questions for this section"
              >
                All Section
              </button>
              <button
                onClick={() => handleSelectMode('weakness')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  mode === 'weakness'
                    ? 'bg-rose-700 text-white'
                    : 'text-[#566664] dark:text-slate-300 hover:text-[#0E1F1E]'
                }`}
                title="Focus on mistake review and low accuracy questions"
              >
                Weak Areas
              </button>
            </div>

            <button
              onClick={handleShuffleFreshScenario}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] hover:bg-[#D3DDDA] dark:hover:bg-[#1F8A70]/25 text-[#0F4C45] dark:text-[#6EE7B7] font-bold text-xs border border-[#D3DDDA] dark:border-[#1F8A70]/30 flex items-center gap-1.5 transition cursor-pointer"
              title="Load fresh questions without repetition"
            >
              <Shuffle className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span className="hidden sm:inline">Fresh Set</span>
            </button>

            <button
              onClick={handleResetSession}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#0B1514] hover:bg-[#F7F9F8] dark:hover:bg-[#11201E] text-[#0E1F1E] dark:text-slate-200 font-bold text-xs border border-[#D3DDDA] dark:border-[#1F8A70]/30 flex items-center gap-1.5 transition cursor-pointer"
              title="Reset current session"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#566664]" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Accent Rotation + Strict 1-Play Exam Mode Realism Controls */}
        <div className="mt-4 pt-4 border-t border-[#EEF3F1] dark:border-[#1F8A70]/25 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1.5 font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">
              <Globe className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#F4A62A]" />
              <span>Accent Rotation:</span>
            </div>
            <div
              data-testid="listening-accent-selector"
              className="inline-flex bg-[#EEF3F1] dark:bg-[#0B1514] p-0.5 rounded-lg border border-[#D3DDDA] dark:border-[#1F8A70]/30 font-mono text-[11px] font-bold"
            >
              {(['uk', 'au', 'us', 'mixed'] as ListeningAccentMode[]).map((acc) => (
                <button
                  key={acc}
                  type="button"
                  onClick={() => handleAccentChange(acc)}
                  className={`px-2.5 py-1 rounded-md uppercase transition cursor-pointer ${
                    accentMode === acc
                      ? 'bg-[#0F4C45] text-white'
                      : 'text-[#566664] dark:text-slate-300 hover:text-[#0E1F1E]'
                  }`}
                >
                  {acc}
                </button>
              ))}
            </div>

            <button
              type="button"
              data-testid="strict-exam-mode-toggle"
              onClick={handleToggleStrictExamMode}
              className={`min-h-[34px] px-3 py-1 rounded-lg border font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer ${
                strictOnePlayMode
                  ? 'bg-[#FEF6E8] dark:bg-[#F4A62A]/15 text-[#9B6314] dark:text-[#F4A62A] border-[#F4A62A]/60'
                  : 'bg-[#F7F9F8] dark:bg-[#0B1514] text-[#566664] dark:text-slate-300 border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45]'
              }`}
            >
              {strictOnePlayMode ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>Strict 1-Play Exam Mode: {strictOnePlayMode ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-bold text-[#0E1F1E] dark:text-[#EEF3F1] font-mono tabular-nums">
              {answeredCount}/{questions.length} answered
            </span>
            {flaggedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#9B6314] dark:text-[#F4A62A]">
                <Flag className="w-3 h-3 fill-[#F4A62A] text-[#F4A62A]" /> {flaggedCount}
              </span>
            )}
            <div className="w-36 sm:w-44 bg-[#EEF3F1] dark:bg-[#0B1514] rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#0F4C45] dark:bg-[#1F8A70] h-full rounded-full transition-all duration-300"
                style={{ width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Real 30-Second "Check Your Answers" Countdown Banner (Strict Exam Pacing) */}
      {checkAnswersCountdownSec !== null && (
        <div
          data-testid="check-answers-countdown-banner"
          className="p-4 rounded-2xl bg-[#0F4C45] text-white border border-[#1F8A70]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B3833] border border-[#F4A62A]/40 flex items-center justify-center font-mono font-bold text-base text-[#F4A62A] tabular-nums shrink-0">
              {checkAnswersCountdownSec}s
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider font-bold text-[#F4A62A]">
                IELTS Exam Pacing · Check Your Answers
              </div>
              <p className="text-xs text-[#EEF3F1]/90">
                {checkAnswersCountdownSec > 0
                  ? `You now have ${checkAnswersCountdownSec} seconds to check spelling, plurals, and word limits for Section ${activeSection}.`
                  : `Answer check window complete for Section ${activeSection}.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeSection < 4 && (
              <button
                type="button"
                onClick={() => handleSelectSection((activeSection + 1) as 1 | 2 | 3 | 4)}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#F4A62A] hover:bg-[#d98f1d] text-[#0E1F1E] font-bold text-xs cursor-pointer"
              >
                Next Section ({activeSection + 1}) →
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setCheckAnswersCountdownSec(null);
                setSectionAudioConsumed(false);
              }}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Section Switcher Tabs (1 to 4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-[#EEF3F1] dark:bg-[#0B1514] p-1.5 rounded-2xl border border-[#D3DDDA] dark:border-[#1F8A70]/30">
        {[
          { sec: 1 as const, label: 'Section 1: Social & Forms', count: bankStats.s1, Icon: Users },
          { sec: 2 as const, label: 'Section 2: Maps & Guides', count: bankStats.s2, Icon: Compass },
          { sec: 3 as const, label: 'Section 3: Academic Debate', count: bankStats.s3, Icon: GraduationCap },
          { sec: 4 as const, label: 'Section 4: University Lecture', count: bankStats.s4, Icon: BookOpen }
        ].map(({ sec, label, count, Icon }) => (
          <button
            key={sec}
            onClick={() => handleSelectSection(sec)}
            className={`flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
              activeSection === sec
                ? 'bg-[#0F4C45] text-white'
                : 'text-[#566664] dark:text-slate-300 hover:bg-white/70 dark:hover:bg-[#11201E]'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <Icon className={`w-4 h-4 shrink-0 ${activeSection === sec ? 'text-[#F4A62A]' : 'text-[#0F4C45] dark:text-[#6EE7B7]'}`} />
              <span className="truncate">{label}</span>
            </div>
            <span
              className={`text-[10px] font-mono tabular-nums shrink-0 ${
                activeSection === sec ? 'text-[#EEF3F1]/80' : 'text-[#566664] dark:text-slate-400'
              }`}
            >
              {count} Qs
            </span>
          </button>
        ))}
      </div>

      {/* Interactive Audio Scenario / Track Selector */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#EEF3F1] dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#0F4C45] text-[#F4A62A] flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
              <span className="uppercase tracking-wider">
                Active Track · Section {activeSection} · {accentMode.toUpperCase()} Voice
              </span>
              <span aria-hidden="true">·</span>
              <span>{availableTopicsForSection.length} Scenarios</span>
            </div>
            <div className="text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1] truncate">
              {activeScenarioTopic || currentQ?.topic || 'Practice Audio'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <select
              aria-label="Select audio scenario"
              value={activeScenarioTopic || currentQ?.topic || ''}
              onChange={(e) => handleSwitchScenario(e.target.value)}
              className="appearance-none bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/35 hover:border-[#0F4C45] text-[#0E1F1E] dark:text-[#EEF3F1] text-xs font-bold py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F4C45] cursor-pointer max-w-[200px] sm:max-w-[260px] truncate"
            >
              {availableTopicsForSection.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#566664] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => handleSwitchScenario()}
            className="min-h-[38px] px-3.5 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Load a completely different scenario and audio track"
          >
            <Shuffle className="w-3.5 h-3.5 text-[#F4A62A]" />
            <span className="whitespace-nowrap">Different Audio</span>
          </button>
        </div>
      </div>

      {/* Central Audio Player Protected by Boundary */}
      <AudioErrorBoundary
        fallbackTitle={`Section ${activeSection} Audio Stream Guard`}
        onRetry={handlePlayAudio}
      >
        <IELTSAudioPlayer
          title={`Listening Section ${activeSection}: ${activeScenarioTopic || currentQ?.topic || 'Original Practice Recording'}`}
          subtitle={
            strictOnePlayMode && sectionAudioConsumed
              ? 'Strict 1-Play Mode: Recording completed once (locked)'
              : `Multi-Accent IELTS Studio · ${accentMode.toUpperCase()} Rotation${strictOnePlayMode ? ' · 1-Play Exam Lock' : ''}`
          }
          questionId={`listening_sec_${activeSection}_${activeScenarioTopic || 'default'}_${accentMode}`}
          audioId={computeContentFingerprint(currentDialogue.map((d) => d.text).join('|'), `sec${activeSection}_${accentMode}`)}
          onPlay={handlePlayAudio}
          onPause={handleStopAudio}
          onRetry={handlePlayAudio}
        />
      </AudioErrorBoundary>

      {/* Interactive 10-Question Audio Timestamp Sync Strip */}
      {audioSyncCues.length > 0 && (
        <div className="bg-white dark:bg-[#11201E] rounded-2xl border border-[#D3DDDA] dark:border-[#1F8A70]/35 p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EEF3F1] dark:border-[#1F8A70]/25">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-[#0F4C45] dark:text-[#6EE7B7] flex items-center justify-center shrink-0">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#0E1F1E] dark:text-[#EEF3F1] font-mono">
                    Audio Sync Timeline ({questions.length} Qs)
                  </h4>
                  <span className="text-[11px] font-mono text-[#566664] dark:text-slate-400 tabular-nums">
                    · {formatAudioTimestamp(audioDurationForSync)}
                  </span>
                </div>
                <p className="text-[11px] text-[#566664] dark:text-slate-400">
                  {audioPlaybackState.isPlaying
                    ? `Playing cue for Q${audioSyncCues[activeAudioCueIdx]?.questionNumber || 1} (${audioSyncCues[activeAudioCueIdx]?.timeRangeLabel || ''})`
                    : strictOnePlayMode
                    ? 'Strict 1-Play Mode active — cues highlight live as the track plays.'
                    : 'Click any question cue to jump audio and sync active question.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <div className="px-2.5 py-1 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 font-mono text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1] tabular-nums">
                {formatAudioTimestamp(audioPlaybackState.currentTime || 0)} / {formatAudioTimestamp(audioDurationForSync)}
              </div>

              <button
                type="button"
                onClick={() => setAutoFollowAudio((prev) => !prev)}
                className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer border ${
                  autoFollowAudio
                    ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                    : 'bg-[#F7F9F8] dark:bg-[#0B1514] text-[#566664] dark:text-slate-300 border-[#D3DDDA] dark:border-[#1F8A70]/30'
                }`}
                title="When ON, active question automatically switches as audio plays"
              >
                <Sparkles className="w-3 h-3 text-[#F4A62A]" />
                <span>Auto-Follow: {autoFollowAudio ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            {audioSyncCues.map((cue, idx) => {
              const isPlayingCue = audioPlaybackState.isPlaying && activeAudioCueIdx === idx;
              const isSelectedView = activeQuestionIndex === idx;
              const isAnswered = Boolean((userAnswers[cue.questionId] || '').trim());
              const isRight = isEvaluated && isListeningAnswerCorrect(questions[idx], userAnswers[cue.questionId] || '');
              const isWrong = isEvaluated && isAnswered && !isRight;

              return (
                <button
                  key={cue.questionId}
                  type="button"
                  onClick={() => {
                    if (strictOnePlayMode) {
                      setActiveQuestionIndex(idx);
                      return;
                    }
                    handleSeekToQuestionAudio(idx);
                  }}
                  className={`group relative p-2 rounded-xl border text-center transition flex flex-col items-center justify-between min-h-[56px] cursor-pointer ${
                    isPlayingCue
                      ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                      : isSelectedView
                      ? 'bg-[#EEF3F1] dark:bg-[#1F8A70]/25 text-[#0F4C45] dark:text-[#EEF3F1] border-[#0F4C45]'
                      : isRight
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 border-emerald-400/50'
                      : isWrong
                      ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 border-rose-400/50'
                      : isAnswered
                      ? 'bg-[#F7F9F8] dark:bg-[#0B1514] text-[#0E1F1E] dark:text-[#EEF3F1] border-[#1F8A70]/40'
                      : 'bg-[#F7F9F8] dark:bg-[#0B1514] text-[#566664] dark:text-slate-300 border-[#D3DDDA] dark:border-[#1F8A70]/25 hover:border-[#0F4C45]'
                  }`}
                  title={`Question ${cue.questionNumber} · Spoken at ${cue.timeRangeLabel}: ${cue.promptPreview}`}
                >
                  <div className="flex items-center justify-between w-full px-1">
                    <span className={`font-mono text-xs font-bold ${isPlayingCue ? 'text-white' : ''}`}>
                      Q{cue.questionNumber}
                    </span>
                    {isAnswered && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isPlayingCue
                            ? 'bg-[#F4A62A]'
                            : isRight
                            ? 'bg-emerald-500'
                            : isWrong
                            ? 'bg-rose-500'
                            : 'bg-[#0F4C45] dark:bg-[#1F8A70]'
                        }`}
                      />
                    )}
                  </div>
                  <span
                    className={`font-mono text-[10px] font-bold mt-1 tabular-nums ${
                      isPlayingCue ? 'text-[#F4A62A]' : 'text-[#566664] dark:text-slate-400'
                    }`}
                  >
                    {cue.timestampLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Split Layout: Active Question Card vs Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Focused Question Card & Options Flow */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Question Focus Card */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-5 sm:p-8 shadow-xs space-y-6">
            {/* Top Bar of Active Question */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-blue-100 text-blue-800 font-mono text-xs font-black">
                  Question {currentProgress.overallQuestionNumber} of {currentProgress.overallTotal} (Part {currentProgress.part})
                </span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                  {currentQ?.topic}
                </span>

                {/* Live frequency waveform animation giving clear feedback that audio is processing */}
                {(audioPlaybackState.isPlaying || audioPlaybackState.isLoading) && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 animate-fade-in">
                    <AudioPlaybackWaveform
                      isPlaying={audioPlaybackState.isPlaying}
                      isLoading={audioPlaybackState.isLoading}
                      height={24}
                      barCount={14}
                      variant="compact"
                      showLabel={true}
                      label={audioPlaybackState.isLoading ? 'Processing Audio...' : 'Audio Stream Active'}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Direct audio jump button to this question's cue */}
                {audioSyncCues[activeQuestionIndex] && (
                  <button
                    type="button"
                    onClick={() => handleSeekToQuestionAudio(activeQuestionIndex)}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-mono font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                    title={`Jump audio to ${audioSyncCues[activeQuestionIndex]?.timestampLabel}`}
                  >
                    <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Audio Cue: {audioSyncCues[activeQuestionIndex]?.timestampLabel}</span>
                  </button>
                )}

                {/* Flag for Review button */}
                <button
                  onClick={() => currentQ && handleToggleFlag(currentQ.id)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                    currentQ && flaggedQuestions[currentQ.id]
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Flag question to review before final scoring"
                >
                  <Flag
                    className={`w-3.5 h-3.5 ${
                      currentQ && flaggedQuestions[currentQ.id]
                        ? 'fill-amber-500 text-amber-500'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>
                    {currentQ && flaggedQuestions[currentQ.id] ? 'Flagged for Review' : 'Flag Question'}
                  </span>
                </button>
              </div>
            </div>

            {/* Map Diagram Blueprint (Displayed if map labelling) */}
            {currentQ?.questionType === 'map_labelling' && (
              <ListeningMapDiagram topic={currentQ.topic} />
            )}

            {/* Prompt */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-blue-700 uppercase tracking-wider font-mono">
                {currentQ?.questionType === 'multiple_choice'
                  ? 'Choose the correct letter, A, B, or C'
                  : currentQ?.questionType === 'map_labelling'
                  ? 'Select the correct map position, A-D'
                  : 'Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer'}
              </div>

              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                {currentQ?.prompt}
              </h3>
            </div>

            {/* Question Option Interface: Multiple Choice, Map Labelling, or Form Text */}
            <div className="pt-2">
              {currentQ && currentQ.options && currentQ.options.length > 0 ? (
                <div className="space-y-2.5">
                  {currentQ.options.map((opt, optIdx) => {
                    const parsed = parseOptionItem(
                      opt,
                      optIdx,
                      currentQ.questionType === 'map_labelling'
                    );

                    const userVal = (userAnswers[currentQ.id] || '').trim().toUpperCase();
                    const isSelected =
                      userVal === parsed.letter ||
                      userVal === parsed.fullRaw.toUpperCase() ||
                      userVal === parsed.label.toUpperCase();

                    // Check if this option is correct using shared Listening evaluator
                    const isRightOption =
                      isEvaluated && isListeningOptionCorrect(currentQ, opt, optIdx);

                    const isWrongSelection = isEvaluated && isSelected && !isRightOption;

                    return (
                      <button
                        key={`${currentQ.id}_opt_${optIdx}`}
                        type="button"
                        onClick={() => handleSelectAnswer(currentQ.id, parsed.letter, true)}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition flex items-center justify-between gap-3 min-h-[52px] ${
                          isRightOption
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                            : isWrongSelection
                            ? 'bg-rose-50 border-rose-400 text-rose-900'
                            : isSelected
                            ? 'bg-blue-50/90 border-blue-600 text-blue-900 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <span
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-black shrink-0 transition ${
                              isRightOption
                                ? 'bg-emerald-600 text-white'
                                : isWrongSelection
                                ? 'bg-rose-600 text-white'
                                : isSelected
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {parsed.letter}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold">{parsed.label}</span>
                        </div>

                        {isSelected && !isEvaluated && (
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4" />
                          </div>
                        )}

                        {isEvaluated && isRightOption && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        )}

                        {isEvaluated && isWrongSelection && (
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Form / Summary Completion Text Input */
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={userAnswers[currentQ?.id] || ''}
                      onChange={(e) => currentQ && handleSelectAnswer(currentQ.id, e.target.value, false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && currentQ && (userAnswers[currentQ.id] || '').trim()) {
                          evaluatePracticeAttempt(currentQ, userAnswers[currentQ.id] || '');
                        }
                      }}
                      placeholder="Type your answer (e.g. BRAITHWAITE, 18TH, 780)..."
                      className="flex-1 min-w-0 px-4 py-3.5 text-sm sm:text-base rounded-2xl border-2 border-slate-300 bg-white font-mono font-bold text-slate-900 focus:border-[#134E41] focus:ring-4 focus:ring-[#134E41]/15 focus:outline-hidden transition placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal"
                    />
                    {!isEvaluated && currentQ && (
                      <button
                        type="button"
                        disabled={!(userAnswers[currentQ.id] || '').trim()}
                        onClick={() => evaluatePracticeAttempt(currentQ, userAnswers[currentQ.id] || '')}
                        className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-[#134E41] hover:bg-[#0D3A30] disabled:opacity-45 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer"
                      >
                        {hintLoopByQId[currentQ.id]?.phase === 'hint_attempt_1'
                          ? 'Check Attempt 2'
                          : 'Check Answer'}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Practice standard: Spelling, plurals, and number formats are marked strictly.</span>
                    <span className="font-mono text-blue-700 font-bold">
                      {(userAnswers[currentQ?.id] || '').trim().split(/\s+/).filter(Boolean).length} word(s)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Barnaby Hint-Before-Reveal Card (Untimed Section Practice Mode only) */}
            {!isEvaluated && currentQ && hintLoopByQId[currentQ.id] && (
              <BarnabyHintCard
                phase={hintLoopByQId[currentQ.id].phase}
                module="listening"
                attempt1Answer={hintLoopByQId[currentQ.id].attempt1Answer}
                attempt2Answer={hintLoopByQId[currentQ.id].attempt2Answer}
                correctAnswerDisplay={formatDisplayedCorrectAnswer(currentQ)}
                hintHeadline={hintLoopByQId[currentQ.id].hintHeadline}
                hintBody={hintLoopByQId[currentQ.id].hintBody}
                distractorAnalysis={hintLoopByQId[currentQ.id].distractorAnalysis}
                revealExplanation={hintLoopByQId[currentQ.id].revealExplanation}
                partialXpAwarded={XP_HINT_RECOVERY}
              />
            )}

            {/* Post-evaluation Explanation Display (EN | বাংলা Distractor Breakdown) */}
            {isEvaluated && currentQ && (
              <div
                className={`p-4 rounded-2xl border text-xs space-y-2.5 animate-fade-in ${
                  isAnswerCorrect(currentQ, userAnswers[currentQ.id] || '')
                    ? 'bg-emerald-50/80 border-emerald-300'
                    : 'bg-rose-50/80 border-rose-300'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-700">Correct Answer:</span>
                    <span className="font-mono font-black text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                      {formatDisplayedCorrectAnswer(currentQ)}
                    </span>
                  </div>
                  <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-mono font-bold">
                    <button
                      type="button"
                      onClick={() => setExplanationLang('en')}
                      className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                        explanationLang === 'en' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => setExplanationLang('bn')}
                      className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                        explanationLang === 'bn' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      বাংলা
                    </button>
                  </div>
                </div>
                {explanationLang === 'bn' ? (
                  <p className="text-slate-800 leading-relaxed font-bengali">
                    <strong>বাংলা ডিস্ট্র্যাক্টর বিশ্লেষণ:</strong> {getListeningBanglaTrapNote(currentQ, activeSection)}
                  </p>
                ) : (
                  <p className="text-slate-700 leading-relaxed font-serif italic">
                    <strong>Examiner Clue:</strong> {currentQ.explanation}
                  </p>
                )}
              </div>
            )}

            {/* Contextual Gemini 'Ask Mentor' Button & On-Demand Explanation Panel */}
            {currentQ && (
              <div className="pt-1">
                <AskMentorContextualWidget
                  module="listening"
                  questionPrompt={currentQ.prompt}
                  questionType={currentQ.questionType}
                  topic={`Section ${activeSection}: ${activeScenarioTopic || currentQ.topic || 'Practice Listening'}`}
                  evidenceContext={currentDialogue
                    .slice(0, 8)
                    .map((d) => `${d.speaker}: ${d.text}`)
                    .join('\n')}
                  userAnswer={userAnswers[currentQ.id] || ''}
                  correctAnswer={formatDisplayedCorrectAnswer(currentQ)}
                  trapNote={currentQ.explanation}
                  isAnswerRevealed={isEvaluated}
                  buttonLabel={isEvaluated ? 'Ask Mentor to Explain Answer' : 'Ask Mentor'}
                />
              </div>
            )}

            {/* Bottom Question Step Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
                disabled={activeQuestionIndex === 0}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="text-xs font-mono font-bold text-slate-500">
                {activeQuestionIndex + 1} / {questions.length}
              </div>

              <button
                onClick={() => setActiveQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                disabled={activeQuestionIndex === questions.length - 1}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold disabled:opacity-40 transition flex items-center gap-1.5 shadow-xs"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Complete Questions Overview Accordion / List */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-black text-slate-900">
                  Questions in Section {activeSection} ({questions.length} items)
                </h4>
              </div>

              {scoreSummary && (
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <div className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono text-xs font-black flex items-center gap-1.5 tabular-nums">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>
                      Band {scoreSummary.band} ({scoreSummary.correct}/{scoreSummary.total})
                    </span>
                  </div>
                  {scoreSummary.total - scoreSummary.correct > 0 && (
                    <button
                      type="button"
                      disabled={pushedMissedToSprint}
                      onClick={() => {
                        const missed = questions.filter(
                          (q) => !isAnswerCorrect(q, (userAnswers[q.id] || '').trim())
                        );
                        missed.forEach((q) => {
                          const userRaw = (userAnswers[q.id] || '').trim();
                          addMistake({
                            module: 'listening',
                            title: `Listening Section ${activeSection}: ${q.prompt}`,
                            userAnswer: userRaw || '(Unanswered)',
                            correctAnswer: formatDisplayedCorrectAnswer(q),
                            explanation: q.explanation || 'Review Practice audio transcript clues carefully.',
                            trapExplanationBn: getListeningBanglaTrapNote(q, activeSection)
                          });
                        });
                        setPushedMissedToSprint(true);
                        soundManager.playSuccess();
                        onShowToast(
                          `Sent ${missed.length} missed item${missed.length > 1 ? 's' : ''} to your Daily Sprint & Mistake Vault.`
                        );
                      }}
                      className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                        pushedMissedToSprint
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 cursor-default'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-900 text-white'
                      }`}
                    >
                      {pushedMissedToSprint ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Queued in Daily Sprint</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>
                            Send {scoreSummary.total - scoreSummary.correct} Missed to Daily Sprint
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const userVal = (userAnswers[q.id] || '').trim();
                const isSelected = activeQuestionIndex === idx;
                const isRight = isEvaluated && isAnswerCorrect(q, userVal);
                const isWrong = isEvaluated && !isAnswerCorrect(q, userVal);

                return (
                  <div
                    key={q.id}
                    onClick={() => setActiveQuestionIndex(idx)}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 min-h-[48px] ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 shadow-2xs ring-1 ring-blue-300'
                        : isRight
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : isWrong
                        ? 'bg-rose-50/50 border-rose-200'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {(activeSection - 1) * 10 + idx + 1}
                      </span>
                      {audioSyncCues[idx] && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSeekToQuestionAudio(idx);
                          }}
                          className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 border border-slate-200 transition shrink-0"
                          title={`Seek audio to ${audioSyncCues[idx].timestampLabel}`}
                        >
                          {audioSyncCues[idx].timestampLabel}
                        </button>
                      )}
                      <p className="text-xs font-semibold text-slate-800 truncate">{q.prompt}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {flaggedQuestions[q.id] && (
                        <Flag className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      )}

                      {userVal ? (
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 max-w-[120px] truncate">
                          {userVal}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">unanswered</span>
                      )}

                      {isEvaluated && (
                        <div>
                          {isRight ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <X className="w-4 h-4 text-rose-600" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Score & Submit Action Bar */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Verify answers to see Practice Band score and log mistakes in your Vault.
              </span>

              <button
                onClick={handleVerifyAnswers}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify Answers & Score Section</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Question Palette, Transcript Inspector & Strategies */}
        <div className="lg:col-span-4 space-y-5">
          {/* Question Palette Grid */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
                  Question Palette
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-500 font-bold">
                {answeredCount}/{questions.length} answered
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isSelected = activeQuestionIndex === idx;
                const isAnswered = Boolean((userAnswers[q.id] || '').trim());
                const isFlagged = flaggedQuestions[q.id];
                const isRight = isEvaluated && isAnswerCorrect(q, userAnswers[q.id] || '');
                const isWrong = isEvaluated && !isAnswerCorrect(q, userAnswers[q.id] || '');

                return (
                  <button
                    key={q.id}
                    onClick={() => setActiveQuestionIndex(idx)}
                    className={`relative min-h-[42px] rounded-xl font-mono text-xs font-bold transition flex items-center justify-center ${
                      isSelected
                        ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                        : isEvaluated && isRight
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : isEvaluated && isWrong
                        ? 'bg-rose-100 text-rose-900 border border-rose-300'
                        : isAnswered
                        ? 'bg-blue-50 text-blue-800 border border-blue-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <span>{(activeSection - 1) * 10 + idx + 1}</span>
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-600" /> Active
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-100 border border-blue-400" /> Answered
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Flagged
              </span>
            </div>
          </div>

          {/* Transcript Inspector */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
                  Transcript Inspector
                </h4>
              </div>

              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="text-xs text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 min-h-[36px]"
              >
                {showTranscript ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showTranscript ? 'Hide' : 'Reveal Clues'}</span>
              </button>
            </div>

            {showTranscript ? (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 text-xs">
                {currentDialogue.map((line, i) => {
                  const hasSelfCorrectionTrap = /\b(apologies|sorry|wait|actually|no,|mistake|instead|old contact|used to)\b/i.test(
                    line.text
                  );
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border space-y-1.5 transition ${
                        hasSelfCorrectionTrap
                          ? 'bg-amber-50/70 border-amber-300'
                          : 'bg-slate-50 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-blue-800 text-[11px]">{line.speaker}</span>
                          {hasSelfCorrectionTrap && (
                            <span className="text-[10px] font-mono font-bold uppercase text-amber-800 bg-amber-200/70 px-1.5 py-0.5 rounded">
                              Distractor / Self-Correction Trap
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => speakBritish(line.text, { speakerId: line.speakerId, gender: line.gender })}
                          className="text-[11px] font-bold text-slate-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                          title="Replay this line in British RP"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Listen</span>
                        </button>
                      </div>
                      <p className="text-slate-700 font-serif leading-relaxed italic">"{line.text}"</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                <AlertCircle className="w-5 h-5 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500">
                  Transcripts are concealed during practice to mirror exam conditions. Reveal if analyzing audio clues.
                </p>
              </div>
            )}
          </div>

          {/* Section Strategy Tip Card */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
              <Sparkles className="w-4 h-4" />
              <span>Section {activeSection} Practice Strategy</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {activeSection === 1 &&
                'Beware of the self-correction trap! Speakers frequently utter an initial number or street name, then say "Oh apologies, that was my old contact...", followed by the true answer.'}
              {activeSection === 2 &&
                'In directional map tasks, orient yourself with the starting entrance landmark before the speaker moves north, east, or west.'}
              {activeSection === 3 &&
                'Track who agrees with whom. Multiple-choice questions often test consensus between student researchers, not just isolated suggestions.'}
              {activeSection === 4 &&
                'In academic monologues, listen for discourse signposts ("Crucially...", "Subsequent trials revealed...") which indicate incoming answers.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Universal answer matching helper delegating to shared listeningAnswerEvaluator
 */
function isAnswerCorrect(q: IELTSQuestion, userAns: string): boolean {
  return isListeningAnswerCorrect(q, userAns);
}
