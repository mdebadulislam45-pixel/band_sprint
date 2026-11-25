import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  Flag,
  Highlighter,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
  HelpCircle,
  StickyNote,
  BookOpen,
  PenTool,
  Headphones,
  Maximize2,
  Minimize2,
  Mic,
  Play,
  Square,
  RotateCcw,
  Radio,
  Sliders,
  Sparkles,
  ArrowRight,
  Settings
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { getCurrentUser, recordExamAttempt } from '../../utils/userStorage';
import { MOCK_EXAM_SETS, MockExamSet, QuestionItem, getExamListeningSection, ListeningSectionDetail } from '../../data/mockExams';
import { audioManager } from '../../services/AudioManager';
import { audioService } from '../../services/audioService';
import { PostTestDiagnosticReport } from './PostTestDiagnosticReport';
import {
  loadExamSetup,
  daysUntilExam,
  formatExamDate,
  correctAnswersNeeded,
  type ExamSetup
} from '../../services/examSetupService';
import { useCDIELTSAutoSave } from '../../hooks/useCDIELTSAutoSave';
import {
  evaluateCDIELTSWritingSuite,
  roundIELTSBand,
  saveListeningAudioState,
  loadListeningAudioState,
  clearListeningAudioState,
  PersistedListeningAudioState,
  CDIELTS_PRE_READ_SECONDS,
  CDIELTS_SECTION_REVIEW_SECONDS,
  CDIELTS_FINAL_CHECK_SECONDS,
  SPRINT_18_PART_AUDIO_SECONDS,
  EXAM_SECTION_AUDIO_DURATIONS,
  getExamSectionAudioDurations,
  CDIELTS_LISTENING_EXACT_TOTAL_SECONDS,
  CDIELTS_LISTENING_INITIAL_CLOCK_SECONDS,
  CDIELTSListeningTimerState,
  calculateListeningTotalDurationSec,
  getCDIELTSSkillDurationSec,
  calculateSynchronizedListeningRemainingSec,
  createInitialListeningTimerState,
  stepListeningPhaseState,
  completeListeningSectionAudioState,
  skipListeningPreReadState,
  advanceListeningSectionState,
  submitListeningExamOnce
} from '../../utils/cdieltsEvaluationEngine';

export {
  CDIELTS_PRE_READ_SECONDS,
  CDIELTS_SECTION_REVIEW_SECONDS,
  CDIELTS_FINAL_CHECK_SECONDS,
  SPRINT_18_PART_AUDIO_SECONDS,
  CDIELTS_LISTENING_EXACT_TOTAL_SECONDS,
  CDIELTS_LISTENING_INITIAL_CLOCK_SECONDS,
  calculateListeningTotalDurationSec,
  getCDIELTSSkillDurationSec,
  calculateSynchronizedListeningRemainingSec,
  createInitialListeningTimerState,
  stepListeningPhaseState,
  completeListeningSectionAudioState,
  skipListeningPreReadState,
  advanceListeningSectionState,
  submitListeningExamOnce
};
import {
  evaluateRawScoreDetailed
} from '../../utils/ieltsBandConversion';
import { isListeningAnswerCorrect } from '../../utils/listeningAnswerEvaluator';
import { deriveActiveReadingHeading, extractActiveReadingPassage } from '../../utils/mockExamScoring';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { CDIELTSListeningSheet } from './CDIELTSListeningSheet';
import { CDIELTSReadingSheet } from './CDIELTSReadingSheet';

interface NoteItem {
  id: string;
  text: string;
  selectedQuote: string;
  timestamp: string;
}

interface CDIELTSExamModeProps {
  onExit: () => void;
  onShowToast: (msg: string) => void;
  candidateName?: string;
  candidateId?: string;
  initialSkill?: 'reading' | 'listening' | 'writing' | 'full_mock';
  onNavigateToSpeaking?: () => void;
  customPilotSet?: MockExamSet | null;
  standaloneSkill?: boolean;
  secondaryModeLabel?: string;
  onOpenSecondaryMode?: () => void;
  onOpenAiPilots?: () => void;
}

export type ColorScheme = 'standard' | 'black-on-yellow' | 'yellow-on-black' | 'white-on-black';
export type ZoomLevel = '100%' | '125%' | '150%';
export type ListeningAudioPhase = 'pre_read' | 'playing' | 'section_check' | 'end_of_test_buffer' | 'completed';

export const CDIELTSExamMode: React.FC<CDIELTSExamModeProps> = ({
  onExit,
  onShowToast,
  candidateName: propCandidateName,
  candidateId: propCandidateId,
  initialSkill,
  onNavigateToSpeaking,
  customPilotSet,
  standaloneSkill = false,
  secondaryModeLabel,
  onOpenSecondaryMode,
  onOpenAiPilots
}) => {
  const activeUser = getCurrentUser();
  const candidateName = propCandidateName || activeUser?.name || 'Candidate Student';
  const candidateId = propCandidateId || (activeUser?.id ? activeUser.id.slice(-6).toUpperCase() : '482910');

  // Exam Room setup (aim band / exam date / mode) chosen in ExamSetup.
  // Read once on mount — the exam room is a fixed session, not a live form.
  const [examSetup] = useState<ExamSetup>(() => loadExamSetup());
  const [showBarnabyGuide, setShowBarnabyGuide] = useState(false);
  const examDaysLeft = daysUntilExam(examSetup.examDate);

  // Load cached session state (skip cached set/answers when launching an isolated customPilotSet)
  const cachedState = React.useMemo(() => {
    if (customPilotSet) return null;
    try {
      const saved = localStorage.getItem('cdielts_session_data');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  }, [customPilotSet]);

  // Practice Exam Set Selector
  const [selectedSetIdx, setSelectedSetIdx] = useState<number>(() => cachedState?.selectedSetIdx ?? 0);
  const currentSet: MockExamSet = customPilotSet || MOCK_EXAM_SETS[selectedSetIdx] || MOCK_EXAM_SETS[0];

  // Resolve initial skill module from prop or cache
  const resolveInitialSkill = (): 'reading' | 'listening' | 'writing' => {
    if (initialSkill === 'listening' || initialSkill === 'full_mock') return 'listening';
    if (initialSkill === 'writing') return 'writing';
    if (initialSkill === 'reading') return 'reading';
    return cachedState?.activeSkill ?? 'listening';
  };

  // Active Skill Module & Navigation
  const [activeSkill, setActiveSkill] = useState<'reading' | 'listening' | 'writing'>(resolveInitialSkill);
  const [mobilePane, setMobilePane] = useState<'left' | 'right'>('left');
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(() => new Set(cachedState?.flaggedQuestions || []));
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>(() => cachedState?.userAnswers || {});
  
  // Writing Module State
  const [task1Essay, setTask1Essay] = useState<string>(() => cachedState?.task1Essay || '');
  const [task2Essay, setTask2Essay] = useState<string>(() => cachedState?.task2Essay || '');
  const [activeWritingTask, setActiveWritingTask] = useState<1 | 2>(1);
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string>('Just now');

  // Exam Countdown Timer State (skill-aware: exam-specific Listening duration, 60m [3600s] for Reading/Writing)
  const currentExamAudioDurations = getExamSectionAudioDurations(currentSet?.id);
  const defaultSkillTimerSec = getCDIELTSSkillDurationSec(activeSkill, currentExamAudioDurations);
  const initialTimerSec =
    cachedState?.activeSkill === activeSkill &&
    typeof cachedState?.timeRemainingSec === 'number' &&
    cachedState.timeRemainingSec > 0 &&
    cachedState.timeRemainingSec <= defaultSkillTimerSec
      ? cachedState.timeRemainingSec
      : defaultSkillTimerSec;
  const [timeRemainingSec, setTimeRemainingSec] = useState<number>(initialTimerSec);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [isTimeHidden, setIsTimeHidden] = useState<boolean>(false);
  const [isAudioNetworkStalled, setIsAudioNetworkStalled] = useState<boolean>(false);
  const endTimeRef = useRef<number>(Date.now() + initialTimerSec * 1000);
  const hasSubmittedRef = useRef<boolean>(false);

  // Audio Playback & Live Stream State
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [hasTestedHeadset, setHasTestedHeadset] = useState<boolean>(false);
  const [isSoundCheckPlaying, setIsSoundCheckPlaying] = useState<boolean>(false);
  const [currentSpokenLine, setCurrentSpokenLine] = useState<string>('');

  // Text Selection, Underlines & Margin Notes State
  const [highlights, setHighlights] = useState<string[]>(() => cachedState?.highlights || []);
  const [underlines, setUnderlines] = useState<string[]>(() => (cachedState as any)?.underlines || []);
  const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number; text: string } | null>(null);
  const [notes, setNotes] = useState<NoteItem[]>(() => cachedState?.notes || []);
  const [newNoteInput, setNewNoteInput] = useState('');
  const [activeQuote, setActiveQuote] = useState('');
  const leftPaneScrollRef = useRef<HTMLDivElement | null>(null);
  const rightPaneScrollRef = useRef<HTMLDivElement | null>(null);
  const passageScrollPosRef = useRef<number>(0);
  const questionsScrollPosRef = useRef<number>(0);

  // CD-IELTS Display Options (Color Schemes & Typography Controls)
  const [colorScheme, setColorScheme] = useState<ColorScheme>('standard');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('100%');
  const [showPalette, setShowPalette] = useState<boolean>(true);
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [activePracticeModal, setActivePracticeModal] = useState<'transcript' | 'reading_guide' | 'writing_model' | null>(null);
  const [showListeningOptionsMenu, setShowListeningOptionsMenu] = useState(false);
  const listeningOptionsRef = useRef<HTMLDivElement | null>(null);

  // Warning Modals (10-minute and 5-minute mandatory alerts)
  const [hasShown10mWarning, setHasShown10mWarning] = useState(false);
  const [hasShown5mWarning, setHasShown5mWarning] = useState(false);
  const [warningModalText, setWarningModalText] = useState<string | null>(null);

  // Strict Listening & Reading View State
  const [listeningSection, setListeningSection] = useState<1 | 2 | 3 | 4>(1);
  const [viewedListeningPart, setViewedListeningPart] = useState<1 | 2 | 3 | 4>(1);
  const [listeningScrollTrigger, setListeningScrollTrigger] = useState<{ questionId: number; nonce: number } | null>(null);
  const [viewedReadingPart, setViewedReadingPart] = useState<1 | 2 | 3>(1);
  const [readingScrollTrigger, setReadingScrollTrigger] = useState<{ questionId: number; nonce: number } | null>(null);
  const [showReadingStudyKey, setShowReadingStudyKey] = useState<boolean>(false);
  const [listeningVolume, setListeningVolume] = useState<number>(0.85);
  const [isListeningMuted, setIsListeningMuted] = useState<boolean>(false);
  const [listeningPhase, setListeningPhase] = useState<ListeningAudioPhase>('pre_read');
  const [phaseCountdownSec, setPhaseCountdownSec] = useState<number>(35);
  const [audioPlaybackSec, setAudioPlaybackSec] = useState<number>(0);
  const [completedListeningParts, setCompletedListeningParts] = useState<Record<number, number>>({});
  const [isListeningLocked, setIsListeningLocked] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasHydratedAudioStateRef = useRef<boolean>(false);
  const [listeningAudioError, setListeningAudioError] = useState<{
    sectionNum: 1 | 2 | 3 | 4;
    message: string;
    isUnavailable: boolean;
    canRetry?: boolean;
  } | null>(null);
  const activePlaybackTokenRef = useRef<number>(0);
  const audioRetryCountRef = useRef<Record<number, number>>({});

  // Resizable Split Pane Width (percentage for left pane)
  const [leftPanePercent, setLeftPanePercent] = useState<number>(50);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);

  // Post-Test Diagnostic Report State
  const [submittedResults, setSubmittedResults] = useState<any | null>(null);

  // Hydrate Listening Audio State from IndexedDB on mount (prevents audio track restart on refresh)
  useEffect(() => {
    let mounted = true;
    loadListeningAudioState().then((saved) => {
      if (!mounted || !saved) {
        hasHydratedAudioStateRef.current = true;
        return;
      }
      const validPart = ([1, 2, 3, 4].includes(saved.partIndex) ? saved.partIndex : 1) as 1 | 2 | 3 | 4;
      setListeningSection(validPart);
      setViewedListeningPart(validPart);
      // If a previous session left phase in 'playing' (where no audio element is actively playing on fresh mount)
      // or 'completed', reset to 'pre_read' so the candidate is never stuck in a silent broadcast or locked test.
      let hydratedPhase: ListeningAudioPhase = 'pre_read';
      let hydratedCountdown = CDIELTS_PRE_READ_SECONDS;
      let hydratedAudioPos = 0;
      if (saved.phase === 'playing' || saved.phase === 'completed') {
        setListeningPhase('pre_read');
        setPhaseCountdownSec(CDIELTS_PRE_READ_SECONDS);
        setAudioPlaybackSec(0);
        setIsListeningLocked(false);
      } else {
        hydratedPhase = saved.phase;
        hydratedCountdown = saved.phaseRemainingSeconds > 0 ? saved.phaseRemainingSeconds : CDIELTS_PRE_READ_SECONDS;
        hydratedAudioPos = saved.audioPlaybackPositionSec || 0;
        setListeningPhase(hydratedPhase);
        setPhaseCountdownSec(hydratedCountdown);
        setAudioPlaybackSec(hydratedAudioPos);
      }
      if (activeSkill === 'listening') {
        const syncedSec = calculateSynchronizedListeningRemainingSec({
          section: validPart,
          phase: hydratedPhase,
          phaseCountdownSec: hydratedCountdown,
          audioPlaybackSec: hydratedAudioPos,
          sectionAudioDurations: currentExamAudioDurations
        });
        setTimeRemainingSec(syncedSec);
        endTimeRef.current = Date.now() + syncedSec * 1000;
      }
      setCompletedListeningParts(saved.completedParts || {});
      hasHydratedAudioStateRef.current = true;
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Persist Listening Audio State to IndexedDB whenever section/phase/countdown updates
  useEffect(() => {
    if (!hasHydratedAudioStateRef.current || submittedResults) return;
    const payload: PersistedListeningAudioState = {
      partIndex: listeningSection,
      phase: listeningPhase,
      phaseRemainingSeconds: phaseCountdownSec,
      audioPlaybackPositionSec: audioPlaybackSec,
      completedParts: completedListeningParts,
      updatedAt: Date.now()
    };
    saveListeningAudioState(payload);
  }, [listeningSection, listeningPhase, phaseCountdownSec, audioPlaybackSec, completedListeningParts, submittedResults]);

  // Hide the floating Barnaby companion while the exam runs (flag prevents lazy-load race conditions)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__BANDSPRINT_ACTIVE_EXAM__ = true;
      window.dispatchEvent(new Event('barnaby-float-hide'));
    }
    return () => {
      if (typeof window !== 'undefined') {
        (window as unknown as Record<string, unknown>).__BANDSPRINT_ACTIVE_EXAM__ = false;
        window.dispatchEvent(new Event('barnaby-float-show'));
      }
    };
  }, []);

  // 30-Second Background Auto-Save Hook (Preserves questions, essays, timer, and notes against accidental refreshes)
  const { saveNow } = useCDIELTSAutoSave(
    {
      selectedSetIdx,
      activeSkill,
      userAnswers,
      flaggedQuestions: Array.from(flaggedQuestions),
      task1Essay,
      task2Essay,
      timeRemainingSec,
      highlights,
      underlines,
      notes
    },
    {
      intervalMs: 30000,
      enabled: isTimerRunning && !submittedResults,
      onAutoSaveSuccess: (timeFormatted) => {
        setLastAutoSavedTime(timeFormatted);
      }
    }
  );

  // Global beforeunload Navigation Interceptor while exam timer is active
  useEffect(() => {
    if (!isTimerRunning || submittedResults) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      saveNow();
      e.preventDefault();
      e.returnValue = 'You have an exam session in progress. Leaving now will submit your current answers.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isTimerRunning, submittedResults, saveNow]);

  // Questions filtered by active module skill
  const skillQuestions: QuestionItem[] =
    activeSkill === 'listening'
      ? currentSet.questions.filter((q) => q.section === 'listening')
      : activeSkill === 'reading'
      ? currentSet.questions.filter((q) => q.section === 'reading')
      : currentSet.questions;

  const activeQuestionObj: QuestionItem | undefined =
    skillQuestions[activeQuestionIdx] || skillQuestions[0] || currentSet.questions[0];

  const activeQuestionId = activeQuestionObj?.id || 1;

  // Keep endTimeRef synchronized when pausing/resuming or switching skills
  useEffect(() => {
    endTimeRef.current = Date.now() + timeRemainingSec * 1000;
  }, [isAudioNetworkStalled, isTimerRunning, activeSkill]);

  // Reading & Writing Wall-Clock Timer Countdown (Listening countdown is synchronized with the phase state machine below)
  useEffect(() => {
    if (activeSkill === 'listening') return;
    if (!isTimerRunning || isAudioNetworkStalled || submittedResults) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
      setTimeRemainingSec(diffSec);

      if (diffSec <= 0) {
        setIsTimerRunning(false);
        soundManager.playBeep(440, 0.4);
        setWarningModalText('TIME EXPIRED: The scheduled practice test duration has concluded. Please submit your responses.');
      } else if (diffSec <= 600 && diffSec > 598 && !hasShown10mWarning) {
        setHasShown10mWarning(true);
        setIsTimeHidden(false);
        soundManager.playBeep(520, 0.2);
        setWarningModalText('10-MINUTE WARNING: 10 minutes remaining. Check all flagged questions before time expires.');
      } else if (diffSec <= 300 && diffSec > 298 && !hasShown5mWarning) {
        setHasShown5mWarning(true);
        setIsTimeHidden(false);
        soundManager.playBeep(580, 0.25);
        setWarningModalText('5-MINUTE WARNING: 5 minutes remaining. No additional transfer time is provided.');
      }
    }, 500);

    return () => clearInterval(interval);
  }, [activeSkill, isTimerRunning, isAudioNetworkStalled, submittedResults, hasShown10mWarning, hasShown5mWarning]);

  // Helper to extract authentic section dialogue - guarantees Sections 2-4 never fall back to Section 1 or paragraph fragments
  const getSectionDialogueText = useCallback((sectionNum: 1 | 2 | 3 | 4): string => {
    const sectionDetail = getExamListeningSection(currentSet, sectionNum);
    if (!sectionDetail.isAvailable || !sectionDetail.script) {
      return '';
    }
    const raw = sectionDetail.script.trim();
    if (!raw) return '';

    // getExamListeningSection returns an isolated section script; return it directly to avoid closing-sentence truncation
    if (sectionDetail.sectionNumber === sectionNum && raw.length > 20) {
      return raw;
    }

    const sectionRegex = new RegExp(`(?:Section|Part)\\s*${sectionNum}[.:]?[\\s\\S]*?(?=(?:Section|Part)\\s*${sectionNum + 1}|$|That is the end of (?:Section|Part) ${sectionNum})`, 'i');
    const match = raw.match(sectionRegex);
    if (match && match[0].trim().length > 30) {
      return match[0].trim();
    }
    return raw;
  }, [currentSet]);

  // Audio Playback trigger using multi-speaker sequential dialogue and British RP voices
  // Enforces failure safety: playback failure NEVER marks section completed or advances examination
  const startListeningPlayback = useCallback((sectionNum: 1 | 2 | 3 | 4) => {
    const playbackToken = ++activePlaybackTokenRef.current;
    let hasCompletedOrFailed = false;

    // Phase 1 Safety Check: Verify section availability in the practice exam
    const secDetail = getExamListeningSection(currentSet, sectionNum);
    if (!secDetail.isAvailable || !secDetail.script) {
      setIsAudioPlaying(false);
      setListeningAudioError({
        sectionNum,
        message: secDetail.missingReason || `Realistic listening recording for Section ${sectionNum} is not available in this practice set.`,
        isUnavailable: true,
        canRetry: false
      });
      setCurrentSpokenLine(`Section ${sectionNum} Audio Unavailable (Content Not in Practice Set)`);
      return;
    }

    const sectionText = getSectionDialogueText(sectionNum);
    if (!sectionText) {
      setIsAudioPlaying(false);
      setListeningAudioError({
        sectionNum,
        message: `Realistic listening dialogue for Section ${sectionNum} is unavailable in this practice set.`,
        isUnavailable: true,
        canRetry: false
      });
      setCurrentSpokenLine(`Section ${sectionNum} Audio Unavailable`);
      return;
    }

    try {
      audioService.unlockAudio();
      stopSpeech();
      setIsAudioPlaying(true);
      setListeningAudioError(null);
      soundManager.playBeep(620, 0.08);

      let parsedDialogue = audioManager.parseMultiSpeakerScript(sectionText);

      // Duplicate callback protection: ensure handleSectionAudioSuccess is called at most once
      const handleSectionAudioSuccess = () => {
        if (activePlaybackTokenRef.current !== playbackToken) return;
        if (hasCompletedOrFailed) return;
        const transitionRes = completeListeningSectionAudioState(
          listeningTimerStateRef.current,
          sectionNum,
          Date.now()
        );
        if (!transitionRes.transitioned) return;
        hasCompletedOrFailed = true;

        listeningTimerStateRef.current = transitionRes.nextState;
        setIsAudioPlaying(false);
        setCompletedListeningParts(transitionRes.nextState.completedParts);
        setAudioPlaybackSec(0);
        setListeningPhase(transitionRes.nextState.phase);
        setPhaseCountdownSec(transitionRes.nextState.phaseCountdownSec);
        setTimeRemainingSec(transitionRes.nextState.timeRemainingSec);
        soundManager.playBeep(520, 0.08);
        onShowToast(`Section ${sectionNum} audio completed. You now have 60 seconds to check your answers.`);
      };

      // Playback failure safety: NEVER mark section completed on audio failure
      const handleSectionAudioFailure = (errorMessage?: string) => {
        if (activePlaybackTokenRef.current !== playbackToken) return;
        if (hasCompletedOrFailed) return;
        hasCompletedOrFailed = true;

        setIsAudioPlaying(false);
        const retryCount = audioRetryCountRef.current[sectionNum] || 0;
        const canRetry = retryCount < 2;

        setListeningAudioError({
          sectionNum,
          message: errorMessage || `Playback encountered an error during Section ${sectionNum}. You may retry or continue without audio.`,
          isUnavailable: false,
          canRetry
        });
        setCurrentSpokenLine(`Section ${sectionNum} Playback Interrupted`);
        soundManager.playBeep(320, 0.15);
      };

      setCurrentSpokenLine(`Section ${sectionNum} Broadcast: ${currentSet.listeningTitle}`);

      if (parsedDialogue.length < 2 && sectionText) {
        const lines = sectionText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10);
        if (lines.length >= 2) {
          // Single-speaker monologue (e.g. Section 2 guide or Section 4 academic lecture)
          const monologueFemale = sectionNum === 2;
          parsedDialogue = lines.map((lineText) => ({
            speakerId: monologueFemale ? 'speaker_05' : 'speaker_04',
            speakerName: monologueFemale ? 'Dr. Clara Sterling' : 'Prof. Arthur Pendelton',
            gender: monologueFemale ? ('female' as const) : ('male' as const),
            text: lineText.trim(),
            pauseAfterMs: 320
          }));
        }
      }

      if (parsedDialogue.length >= 2) {
        const fullDialogue = [
          {
            speakerId: 'speaker_04',
            speakerName: 'Announcer (Arthur)',
            gender: 'male' as const,
            text: `Section ${sectionNum}.`,
            pauseAfterMs: 400
          },
          ...parsedDialogue
        ];

        audioService.playDialogueSequentially(fullDialogue, {
          rate: 1.0,
          onStart: () => {
            if (activePlaybackTokenRef.current === playbackToken) {
              setIsAudioPlaying(true);
            }
          },
          onLineStart: (_index, line) => {
            if (activePlaybackTokenRef.current === playbackToken) {
              setIsAudioPlaying(true);
              setCurrentSpokenLine(`${line.speakerName || 'Speaker'}: "${line.text}"`);
            }
          },
          onComplete: handleSectionAudioSuccess,
          onError: (err) => {
            handleSectionAudioFailure(err?.message || 'Sequential dialogue stream error');
          }
        });
        return;
      }

      const textToSpeak = sectionText.toLowerCase().includes(`section ${sectionNum}`)
        ? sectionText
        : `Section ${sectionNum}. ${sectionText}`;

      audioService.speakText(textToSpeak, 'speaker_04', {
        rate: 1.0,
        gender: 'male',
        onStart: () => {
          if (activePlaybackTokenRef.current === playbackToken) {
            setIsAudioPlaying(true);
          }
        },
        onEnd: handleSectionAudioSuccess,
        onError: (err) => {
          // Fallback to browser Web Speech API British RP voice
          speakBritish(textToSpeak, {
            rate: 1.0,
            onStart: () => {
              if (activePlaybackTokenRef.current === playbackToken) {
                setIsAudioPlaying(true);
              }
            },
            onEnd: handleSectionAudioSuccess,
            onError: (fallbackErr) => {
              handleSectionAudioFailure(
                (fallbackErr as any)?.message || err?.message || 'British speech synthesis error'
              );
            }
          });
        }
      });
    } catch (e: any) {
      if (activePlaybackTokenRef.current === playbackToken) {
        setIsAudioPlaying(false);
        setListeningAudioError({
          sectionNum,
          message: e?.message || 'Could not start audio playback.',
          isUnavailable: false,
          canRetry: true
        });
      }
    }
  }, [getSectionDialogueText, currentSet, onShowToast]);

  // Practice Sound Check Handler
  const handleRunSoundCheck = useCallback(() => {
    try {
      audioService.unlockAudio();
      stopSpeech();
      setIsSoundCheckPlaying(true);
      soundManager.playBeep(650, 0.04);
      const testPrompt = "This is an audio check for your IELTS-style Listening practice test. If you can hear this clearly through your headphones, your audio is working.";
      setCurrentSpokenLine("Sound Check Active: Verifying Practice Audio Stream");

      let finished = false;
      const handleCheckSuccess = () => {
        if (finished) return;
        finished = true;
        setIsSoundCheckPlaying(false);
        setHasTestedHeadset(true);
        setCurrentSpokenLine("Sound Check Complete: Practice Audio Stream Verified");
        onShowToast('✓ Headset sound check verified. Audio stream is functional.');
      };

      const handleCheckFailure = (reason: string) => {
        if (finished) return;
        finished = true;
        stopSpeech();
        setIsSoundCheckPlaying(false);
        setHasTestedHeadset(false);
        setCurrentSpokenLine(`Sound Check Failed: ${reason}`);
        onShowToast(`⚠ ${reason}`);
      };

      const watchdog = window.setTimeout(() => {
        handleCheckFailure('Sound check playback timed out. Please check your volume and try again.');
      }, 10000);

      speakBritish(testPrompt, {
        speakerId: 'speaker_04',
        gender: 'male',
        rate: 1.0,
        onStart: () => setIsSoundCheckPlaying(true),
        onEnd: () => {
          window.clearTimeout(watchdog);
          handleCheckSuccess();
        },
        onError: () => {
          window.clearTimeout(watchdog);
          handleCheckFailure('Sound check audio playback failed or was blocked by your browser.');
        }
      });
    } catch {
      setIsSoundCheckPlaying(false);
      setHasTestedHeadset(false);
      onShowToast('⚠ Unable to start sound check audio playback.');
    }
  }, [onShowToast]);

  // Skip Pre-Read Buffer and Start Audio Immediately
  const handleSkipPreReadAndStartAudio = useCallback(() => {
    const res = skipListeningPreReadState(listeningTimerStateRef.current);
    if (!res.transitioned) return;
    listeningTimerStateRef.current = res.nextState;
    setListeningPhase(res.nextState.phase);
    setPhaseCountdownSec(res.nextState.phaseCountdownSec);
    setAudioPlaybackSec(0);
    setTimeRemainingSec(res.nextState.timeRemainingSec);
    startListeningPlayback(res.nextState.section);
  }, [startListeningPlayback]);

  // Advance Section Manually or from Timer
  const handleAdvanceSection = useCallback(() => {
    activePlaybackTokenRef.current += 1;
    stopSpeech();
    audioService.stop();
    setIsAudioPlaying(false);
    setListeningAudioError(null);
    const res = advanceListeningSectionState(listeningTimerStateRef.current);
    if (res.action === 'none') return;
    listeningTimerStateRef.current = res.nextState;
    setListeningSection(res.nextState.section);
    setViewedListeningPart(res.nextState.section);
    setListeningPhase(res.nextState.phase);
    setPhaseCountdownSec(res.nextState.phaseCountdownSec);
    setAudioPlaybackSec(0);
    setTimeRemainingSec(res.nextState.timeRemainingSec);
    if (res.action === 'next_section_pre_read') {
      soundManager.playBeep(580, 0.08);
    } else if (res.action === 'start_final_check') {
      soundManager.playBeep(660, 0.12);
      onShowToast('End of Part 4: You have exactly 2 minutes to check your answers.');
    }
  }, [onShowToast]);

  // Module Progression Handlers
  const handleProceedToReading = useCallback(() => {
    stopSpeech();
    audioService.stop();
    setIsAudioPlaying(false);
    setActiveSkill('reading');
    setActiveQuestionIdx(0);
    setViewedReadingPart(1);
    setMobilePane('left');
    const readingDur = getCDIELTSSkillDurationSec('reading');
    setTimeRemainingSec(readingDur);
    endTimeRef.current = Date.now() + readingDur * 1000;
    soundManager.playSuccess();
    onShowToast('Listening complete! Commencing 60-minute Academic Reading module.');
  }, [onShowToast]);

  const handleProceedToWriting = useCallback(() => {
    stopSpeech();
    audioService.stop();
    setIsAudioPlaying(false);
    setActiveSkill('writing');
    setActiveWritingTask(1);
    setMobilePane('left');
    const writingDur = getCDIELTSSkillDurationSec('writing');
    setTimeRemainingSec(writingDur);
    endTimeRef.current = Date.now() + writingDur * 1000;
    soundManager.playSuccess();
    onShowToast('Reading complete! Commencing 60-minute Academic Writing module.');
  }, [onShowToast]);

  // Mobile Pane Switcher — on small screens both panes stay visible (stacked split),
  // so these buttons are "jump to" shortcuts that scroll to the chosen pane.
  const handleSwitchMobilePane = useCallback((target: 'left' | 'right') => {
    setMobilePane(target);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      const el = target === 'left' ? leftPaneScrollRef.current : rightPaneScrollRef.current;
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Switch Module Tab in Workstation Bar
  const handleSwitchModule = useCallback((skill: 'listening' | 'reading' | 'writing') => {
    if (skill === activeSkill) return;
    if (activeSkill === 'listening') {
      activePlaybackTokenRef.current += 1;
      stopSpeech();
      audioService.stop();
      setIsAudioPlaying(false);
      setListeningAudioError(null);
    }
    setActiveSkill(skill);
    setActiveQuestionIdx(0);
    if (skill === 'reading') {
      setViewedReadingPart(1);
    }
    setMobilePane('left');
    if (skill === 'listening') {
      const synced = calculateSynchronizedListeningRemainingSec({
        section: listeningSection,
        phase: listeningPhase,
        phaseCountdownSec,
        audioPlaybackSec,
        sectionAudioDurations: currentExamAudioDurations
      });
      setTimeRemainingSec(synced);
      endTimeRef.current = Date.now() + synced * 1000;
    } else {
      const dur = getCDIELTSSkillDurationSec(skill);
      setTimeRemainingSec(dur);
      endTimeRef.current = Date.now() + dur * 1000;
    }
    soundManager.playBeep(600, 0.03);
    onShowToast(`Active Module: IELTS ${skill.toUpperCase()}`);
  }, [activeSkill, listeningSection, listeningPhase, phaseCountdownSec, audioPlaybackSec, onShowToast, currentExamAudioDurations]);

  // Cleanup audio when switching or unmounting
  useEffect(() => {
    return () => {
      activePlaybackTokenRef.current += 1;
      stopSpeech();
      audioService.stop();
    };
  }, []);

  // Android Browser Interruption & Background Tab Visibility Guard
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        if (isAudioPlaying) {
          activePlaybackTokenRef.current += 1;
          stopSpeech();
          audioService.stop();
          setIsAudioPlaying(false);
          setListeningAudioError({
            sectionNum: listeningSection,
            message: 'Audio playback was paused because the examination tab was minimized or hidden.',
            isUnavailable: false,
            canRetry: true
          });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAudioPlaying, listeningSection]);

  // Live refs for countdown interval so closure never reads stale audio/error/phase state or resets the 1s tick
  const isAudioPlayingRef = useRef(isAudioPlaying);
  isAudioPlayingRef.current = isAudioPlaying;
  const listeningAudioErrorRef = useRef(listeningAudioError);
  listeningAudioErrorRef.current = listeningAudioError;
  const listeningTimerStateRef = useRef<CDIELTSListeningTimerState>({
    section: listeningSection,
    phase: listeningPhase,
    phaseCountdownSec,
    audioPlaybackSec,
    timeRemainingSec,
    completedParts: completedListeningParts,
    isListeningLocked,
    hasSubmitted: hasSubmittedRef.current,
    submissionCount: hasSubmittedRef.current ? 1 : 0,
    sectionAudioDurations: currentExamAudioDurations
  });
  listeningTimerStateRef.current = {
    section: listeningSection,
    phase: listeningPhase,
    phaseCountdownSec,
    audioPlaybackSec,
    timeRemainingSec,
    completedParts: completedListeningParts,
    isListeningLocked,
    hasSubmitted: hasSubmittedRef.current,
    submissionCount: hasSubmittedRef.current ? 1 : 0,
    sectionAudioDurations: currentExamAudioDurations
  };

  // Strict Listening Audio Lifecycle State Machine (Pre-read 35s -> Event-Driven Complete Audio -> Check-time 60s -> End-of-Test 120s Buffer)
  useEffect(() => {
    if (activeSkill !== 'listening' || !isTimerRunning || submittedResults || isAudioNetworkStalled) return;
    if (listeningPhase === 'completed') return;

    const tick = setInterval(() => {
      const currentState = listeningTimerStateRef.current;
      if (currentState.phase === 'completed') return;

      const svcState = audioService.getState();
      const isAudioActiveOrLoading =
        Boolean(isAudioPlayingRef.current) || Boolean(svcState.isPlaying) || Boolean(svcState.isLoading);
      const hasAudioError = Boolean(listeningAudioErrorRef.current);

      const stepRes = stepListeningPhaseState(currentState, {
        isAudioActiveOrLoading,
        hasAudioError
      });
      const next = stepRes.nextState;
      listeningTimerStateRef.current = next;

      if (next.section !== currentState.section) {
        setViewedListeningPart(next.section);
      }
      setListeningSection(next.section);
      setListeningPhase(next.phase);
      setPhaseCountdownSec(next.phaseCountdownSec);
      setAudioPlaybackSec(next.audioPlaybackSec);
      setTimeRemainingSec(next.timeRemainingSec);
      endTimeRef.current = Date.now() + next.timeRemainingSec * 1000;

      if (next.timeRemainingSec === 600 && !hasShown10mWarning) {
        setHasShown10mWarning(true);
        setIsTimeHidden(false);
        soundManager.playBeep(520, 0.2);
        setWarningModalText('10-MINUTE WARNING: 10 minutes remaining. Check all flagged questions before time expires.');
      } else if (next.timeRemainingSec === 300 && !hasShown5mWarning) {
        setHasShown5mWarning(true);
        setIsTimeHidden(false);
        soundManager.playBeep(580, 0.25);
        setWarningModalText('5-MINUTE WARNING: 5 minutes remaining. No additional transfer time is provided.');
      }

      if (stepRes.action === 'start_audio') {
        startListeningPlayback(stepRes.section);
      } else if (stepRes.action === 'next_section_pre_read') {
        soundManager.playBeep(580, 0.08);
      } else if (stepRes.action === 'start_final_check') {
        soundManager.playBeep(660, 0.12);
        onShowToast('End of Part 4: You now have exactly 2 minutes to check your answers.');
      } else if (stepRes.action === 'complete_and_submit') {
        setIsListeningLocked(true);
        setIsTimerRunning(false);
        soundManager.playBeep(440, 0.4);
        onShowToast('Listening test completed. Answers are now locked.');
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [
    activeSkill,
    isTimerRunning,
    submittedResults,
    isAudioNetworkStalled,
    listeningPhase,
    hasShown10mWarning,
    hasShown5mWarning,
    startListeningPlayback,
    onShowToast
  ]);

  const formatTimer = (seconds: number) => {
    const safe = Math.max(0, Math.floor(seconds));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleFlag = useCallback((qId: number) => {
    let willBeFlagged = false;
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) {
        next.delete(qId);
        willBeFlagged = false;
      } else {
        next.add(qId);
        willBeFlagged = true;
      }
      return next;
    });
    setTimeout(() => {
      onShowToast(willBeFlagged ? `Question ${qId} flagged for review` : `Question ${qId} unflagged`);
    }, 0);
    soundManager.playBeep(640, 0.03);
  }, [onShowToast]);

  const toggleHighlight = (text: string) => {
    let isRemoved = false;
    setHighlights((prev) => {
      if (prev.includes(text)) {
        isRemoved = true;
        return prev.filter((h) => h !== text);
      } else {
        isRemoved = false;
        return [...prev, text];
      }
    });
    setSelectionMenu(null);
    setTimeout(() => {
      onShowToast(isRemoved ? 'Highlight removed' : 'Text highlighted in yellow');
    }, 0);
    soundManager.playBeep(680, 0.03);
  };

  const toggleUnderline = (text: string) => {
    let isRemoved = false;
    setUnderlines((prev) => {
      if (prev.includes(text)) {
        isRemoved = true;
        return prev.filter((u) => u !== text);
      } else {
        isRemoved = false;
        return [...prev, text];
      }
    });
    setSelectionMenu(null);
    setTimeout(() => {
      onShowToast(isRemoved ? 'Underline removed' : 'Text underlined');
    }, 0);
    soundManager.playBeep(670, 0.03);
  };

  const handleTextSelection = (e: React.MouseEvent | React.TouchEvent) => {
    if (typeof window === 'undefined') return;
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length >= 3) {
      const text = selection.toString().trim();
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectionMenu({
          x: rect.left + rect.width / 2,
          y: Math.max(10, rect.top - 8),
          text
        });
        setActiveQuote(text);
      } catch {
        setActiveQuote(text);
      }
    } else {
      const target = e.target as HTMLElement;
      if (!target.closest('.selection-tooltip-menu')) {
        setSelectionMenu(null);
      }
    }
  };

  const renderParagraphWithHighlights = (paragraph: string) => {
    const hasHighlights = highlights && highlights.length > 0;
    const hasUnderlines = underlines && underlines.length > 0;
    if (!hasHighlights && !hasUnderlines) return paragraph;

    type TextChunk = { text: string; isHighlight?: boolean; isUnderline?: boolean };
    let parts: TextChunk[] = [{ text: paragraph }];

    // Apply Highlights
    if (hasHighlights) {
      const activeHighlights = highlights
        .filter((h) => h && paragraph.includes(h))
        .sort((a, b) => b.length - a.length);

      activeHighlights.forEach((hl) => {
        const nextParts: TextChunk[] = [];
        parts.forEach((p) => {
          if (p.isHighlight) {
            nextParts.push(p);
          } else {
            const chunks = p.text.split(hl);
            chunks.forEach((chunk, idx) => {
              if (chunk) nextParts.push({ text: chunk, isUnderline: p.isUnderline });
              if (idx < chunks.length - 1) {
                nextParts.push({ text: hl, isHighlight: true, isUnderline: p.isUnderline });
              }
            });
          }
        });
        parts = nextParts;
      });
    }

    // Apply Underlines
    if (hasUnderlines) {
      const activeUnderlines = underlines
        .filter((u) => u && paragraph.includes(u))
        .sort((a, b) => b.length - a.length);

      activeUnderlines.forEach((u) => {
        const nextParts: TextChunk[] = [];
        parts.forEach((p) => {
          if (p.isUnderline) {
            nextParts.push(p);
          } else {
            const chunks = p.text.split(u);
            chunks.forEach((chunk, idx) => {
              if (chunk) nextParts.push({ text: chunk, isHighlight: p.isHighlight });
              if (idx < chunks.length - 1) {
                nextParts.push({ text: u, isHighlight: p.isHighlight, isUnderline: true });
              }
            });
          }
        });
        parts = nextParts;
      });
    }

    return parts.map((part, idx) => {
      let className = '';
      if (part.isHighlight && part.isUnderline) {
        className = 'bg-[#FFEB3B] text-black underline decoration-2 decoration-[#002F6C] font-semibold cursor-pointer px-1 py-0.5';
      } else if (part.isHighlight) {
        className = 'bg-[#FFEB3B] text-black rounded-none px-1 py-0.5 font-medium cursor-pointer';
      } else if (part.isUnderline) {
        className = 'underline decoration-2 decoration-[#0066CC] text-current font-semibold cursor-pointer';
      }

      if (className) {
        return (
          <span
            key={idx}
            className={className}
            onClick={() => {
              if (part.isHighlight) toggleHighlight(part.text);
              else if (part.isUnderline) toggleUnderline(part.text);
            }}
            title="Click to remove highlight/underline"
          >
            {part.text}
          </span>
        );
      }
      return <span key={idx}>{part.text}</span>;
    });
  };

  const handleAddNote = () => {
    if (!newNoteInput.trim()) return;
    const item: NoteItem = {
      id: 'note_' + Date.now(),
      text: newNoteInput.trim(),
      selectedQuote: activeQuote,
      timestamp: formatTimer(timeRemainingSec)
    };
    setNotes((prev) => [item, ...prev]);
    setNewNoteInput('');
    setActiveQuote('');
    soundManager.playSuccess();
    onShowToast('Note saved to Margin Notes');
  };

  // Reset scroll to top of passage & sheet when switching Reading Parts
  useEffect(() => {
    if (activeSkill === 'reading') {
      if (leftPaneScrollRef.current) leftPaneScrollRef.current.scrollTop = 0;
      if (rightPaneScrollRef.current) rightPaneScrollRef.current.scrollTop = 0;
    }
  }, [activeSkill, viewedReadingPart]);

  // Official CD-IELTS Keyboard Navigation:
  // Alt+N (Next), Alt+P (Previous), Alt+R (Toggle Review Flag), Alt+V (Toggle Margin Notes & Highlighter Panel)
  useEffect(() => {
    const getReadingPartForIdx = (idx: number): 1 | 2 | 3 => {
      const q = skillQuestions[idx];
      if (q?.passage === 1 || q?.passage === 2 || q?.passage === 3) return q.passage;
      return idx < 13 ? 1 : idx < 26 ? 2 : 3;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showListeningOptionsMenu) {
        setShowListeningOptionsMenu(false);
        return;
      }
      if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setActiveQuestionIdx((prev) => {
          const nextIdx = Math.max(0, prev - 1);
          const targetQ = skillQuestions[nextIdx];
          if (activeSkill === 'listening') {
            const nextPart = (Math.floor(nextIdx / 10) + 1) as 1 | 2 | 3 | 4;
            setViewedListeningPart(nextPart);
            if (targetQ) {
              setListeningScrollTrigger({ questionId: targetQ.id, nonce: Date.now() });
            }
          } else if (activeSkill === 'reading') {
            setViewedReadingPart(getReadingPartForIdx(nextIdx));
            if (targetQ) {
              setReadingScrollTrigger({ questionId: targetQ.id, nonce: Date.now() });
            }
          }
          return nextIdx;
        });
        soundManager.playBeep(480, 0.03);
      } else if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setActiveQuestionIdx((prev) => {
          const nextIdx = Math.min(skillQuestions.length - 1, prev + 1);
          const targetQ = skillQuestions[nextIdx];
          if (activeSkill === 'listening') {
            const nextPart = (Math.floor(nextIdx / 10) + 1) as 1 | 2 | 3 | 4;
            setViewedListeningPart(nextPart);
            if (targetQ) {
              setListeningScrollTrigger({ questionId: targetQ.id, nonce: Date.now() });
            }
          } else if (activeSkill === 'reading') {
            setViewedReadingPart(getReadingPartForIdx(nextIdx));
            if (targetQ) {
              setReadingScrollTrigger({ questionId: targetQ.id, nonce: Date.now() });
            }
          }
          return nextIdx;
        });
        soundManager.playBeep(520, 0.03);
      } else if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        toggleFlag(activeQuestionId);
      } else if (e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        setShowNotesDrawer((prev) => !prev);
        soundManager.playBeep(560, 0.03);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSkill, skillQuestions, activeQuestionId, toggleFlag, showListeningOptionsMenu]);

  // Close Options dropdown when clicking outside
  useEffect(() => {
    if (!showListeningOptionsMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (listeningOptionsRef.current && !listeningOptionsRef.current.contains(e.target as Node)) {
        setShowListeningOptionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showListeningOptionsMenu]);

  // Split-Screen Drag Handlers
  const handleSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplitter || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const percent = (currentX / rect.width) * 100;
      if (percent >= 25 && percent <= 75) {
        setLeftPanePercent(percent);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingSplitter) {
        setIsDraggingSplitter(false);
      }
    };

    if (isDraggingSplitter) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplitter]);

  // Color Scheme Styling Resolution (Practice CD-IELTS Workstation Specification)
  const getThemeClasses = () => {
    switch (colorScheme) {
      case 'black-on-yellow':
        return {
          bg: 'bg-[#FFF100] text-black',
          headerBg: 'bg-black text-[#FFF100]',
          subHeaderBg: 'bg-[#181818] text-[#FFF100]',
          border: 'border-black',
          borderStrong: 'border-black',
          cardBg: 'bg-[#FFF888]',
          inputBg: 'bg-white text-black',
          accentBtn: 'bg-black text-[#FFF100] hover:bg-neutral-900 border-2 border-black',
          activeTile: 'bg-black text-[#FFF100] border-2 border-black',
          flaggedTile: 'bg-[#FFF888] text-black border-2 border-black'
        };
      case 'yellow-on-black':
        return {
          bg: 'bg-black text-[#FFF100]',
          headerBg: 'bg-[#111111] text-[#FFF100]',
          subHeaderBg: 'bg-[#1a1a1a] text-[#FFF100]',
          border: 'border-[#FFF100]',
          borderStrong: 'border-[#FFF100]',
          cardBg: 'bg-[#111111]',
          inputBg: 'bg-[#222222] text-[#FFF100]',
          accentBtn: 'bg-[#FFF100] text-black hover:bg-yellow-400 border-2 border-[#FFF100]',
          activeTile: 'bg-[#FFF100] text-black border-2 border-[#FFF100]',
          flaggedTile: 'bg-[#333300] text-[#FFF100] border-2 border-[#FFF100]'
        };
      case 'white-on-black':
        return {
          bg: 'bg-black text-white',
          headerBg: 'bg-[#111111] text-white',
          subHeaderBg: 'bg-[#1a1a1a] text-white',
          border: 'border-white',
          borderStrong: 'border-white',
          cardBg: 'bg-[#181818]',
          inputBg: 'bg-[#262626] text-white',
          accentBtn: 'bg-white text-black hover:bg-gray-200 border-2 border-white',
          activeTile: 'bg-white text-black border-2 border-white',
          flaggedTile: 'bg-neutral-800 text-white border-2 border-white'
        };
      case 'standard':
      default:
        return {
          bg: 'bg-[#F5F7F6] text-[#0E1F1E]',
          headerBg: 'bg-[#0F4C45] text-white',
          subHeaderBg: 'bg-[#0B3833] text-[#E6F2EF]',
          border: 'border-[#D3DDDA]',
          borderStrong: 'border-[#0B3833]',
          cardBg: 'bg-white',
          inputBg: 'bg-white text-[#0E1F1E]',
          accentBtn: 'bg-[#0F4C45] hover:bg-[#0B3833] text-white border border-[#0B3833]',
          activeTile: 'bg-[#0F4C45] text-white border-2 border-[#0B3833]',
          flaggedTile: 'bg-[#FEF3C7] text-[#78350F] border-2 border-[#D97706]'
        };
    }
  };

  const theme = getThemeClasses();

  // Typography Size Resolution
  const getFontSizeClass = () => {
    switch (zoomLevel) {
      case '125%':
        return 'text-lg';
      case '150%':
        return 'text-xl';
      case '100%':
      default:
        return 'text-base';
    }
  };

  const task1WordCount = task1Essay.trim() ? task1Essay.trim().split(/\s+/).length : 0;
  const task2WordCount = task2Essay.trim() ? task2Essay.trim().split(/\s+/).length : 0;

  const answeredCount = skillQuestions.filter((q) => Boolean(userAnswers[q.id]?.trim())).length;
  const totalQuestions = skillQuestions.length;

  // Final Test Submission Handler with Official 4-Criterion AI Evaluation & Rounding (executes at most once per attempt)
  const handleFinalSubmit = () => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setShowReviewModal(false);
    setShowExitConfirmModal(false);
    setIsTimerRunning(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Calculate Listening & Reading scores
    let listeningCorrect = 0;
    let readingCorrect = 0;

    currentSet.questions.forEach((q) => {
      const userAns = userAnswers[q.id] || '';
      const isCorrect = isListeningAnswerCorrect(q as any, userAns);

      if (q.section === 'listening' && isCorrect) listeningCorrect++;
      if (q.section === 'reading' && isCorrect) readingCorrect++;
    });

    const listeningTotal = currentSet.questions.filter((q) => q.section === 'listening').length || 40;
    const readingTotal = currentSet.questions.filter((q) => q.section === 'reading').length || 40;

    const examEdition = currentSet.format === 'General Training' ? 'General Training' : 'Academic';

    const lEval = evaluateRawScoreDetailed(listeningCorrect, 'listening', {
      edition: examEdition,
      isAttempted: listeningTotal > 0
    });
    const rEval = evaluateRawScoreDetailed(readingCorrect, 'reading', {
      edition: examEdition,
      isAttempted: readingTotal > 0
    });

    const lBand = lEval.band;
    const rBand = rEval.band;

    const writingEvaluation = evaluateCDIELTSWritingSuite(
      task1Essay,
      task2Essay,
      currentSet.task1Prompt || 'Summarise the main features of the statistical chart and make comparisons where relevant. Write at least 150 words.',
      currentSet.writingPrompt
    );

    const wBand =
      writingEvaluation.overallWritingBand > 0
        ? writingEvaluation.overallWritingBand
        : null;

    const results = {
      listeningCorrect,
      listeningTotal,
      listeningBand: lBand,
      readingCorrect,
      readingTotal,
      readingBand: rBand,
      writingBand: wBand,
      overallBand: null,
      wordCount: task2WordCount,
      task1WordCount,
      task1Essay,
      task2Essay,
      task1Prompt: currentSet.task1Prompt || 'Summarise the main features of the statistical chart and make comparisons where relevant. Write at least 150 words.',
      writingPrompt: currentSet.writingPrompt,
      writingEvaluation,
      examType: 'partial_lrw' as const,
      completedSkills: {
        listening: listeningTotal > 0,
        reading: readingTotal > 0,
        writing: true,
        speaking: false
      }
    };

    setSubmittedResults(results);
    // In CDIELTSExamMode, the candidate completes Listening, Reading, and Writing.
    // Speaking is not taken in this computer exam, so this must be recorded as a
    // partial L/R/W attempt rather than a completed four-skill full_mock with overallBand.
    recordExamAttempt({
      overallBand: null, // MANDATORY: 3-skill L/R/W attempt must NEVER be recorded as 4-skill full_mock overallBand!
      readingBand: rBand,
      listeningBand: lBand,
      writingBand: wBand,
      speakingBand: null,
      wordCount: task2WordCount + task1WordCount,
      submissionType: 'manual',
      correctCount: listeningCorrect + readingCorrect,
      totalQuestions: listeningTotal + readingTotal,
      examType: 'partial_lrw',
      completedSkills: {
        listening: listeningTotal > 0,
        reading: readingTotal > 0,
        writing: true,
        speaking: false
      }
    });
    soundManager.playSuccess();
  };

  if (submittedResults) {
    const targetBand = examSetup.targetBand;
    const moduleBands: { label: string; band: number | null }[] = [
      { label: 'Listening', band: typeof submittedResults.listeningBand === 'number' ? submittedResults.listeningBand : null },
      { label: 'Reading', band: typeof submittedResults.readingBand === 'number' ? submittedResults.readingBand : null },
      { label: 'Writing', band: typeof submittedResults.writingBand === 'number' ? submittedResults.writingBand : null },
    ];
    const scored = moduleBands.filter((m): m is { label: string; band: number } => m.band !== null);
    const weakest = scored.length > 0 ? scored.reduce((a, b) => (b.band < a.band ? b : a)) : null;
    const openStudyPlan = () => {
      window.history.pushState({}, '', '/learn/study-plan');
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo(0, 0);
    };
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 font-sans">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
          <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 text-slate-900 p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                How you did against your target — Band {targetBand.toFixed(1)}
              </h2>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Estimates, not official scores
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {moduleBands.map((m) => {
                const gap = m.band === null ? null : Math.round((m.band - targetBand) * 2) / 2;
                return (
                  <div key={m.label} className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700">{m.label}</span>
                    <span className="text-right">
                      <span className="block font-mono font-black text-sm text-slate-900">
                        {m.band === null ? '—' : m.band.toFixed(1)}
                      </span>
                      <span className={`block text-[11px] font-bold ${gap === null ? 'text-slate-400' : gap >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {gap === null ? 'Not scored' : gap >= 0 ? 'On target' : `${Math.abs(gap).toFixed(1)} below target`}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              <span className="font-black text-[#0F4C45]">Barnaby: </span>
              {weakest && weakest.band < targetBand
                ? `your ${weakest.label} is ${Math.abs(Math.round((weakest.band - targetBand) * 2) / 2).toFixed(1)} below your target — that is your next focus. Every mistake makes you stronger.`
                : 'you are at or above your target in every scored module — keep it up with one timed mock a week.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openStudyPlan}
                className="px-4 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0d3d38] text-white text-xs font-black transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                Build my study plan
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onExit}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold transition cursor-pointer"
              >
                Back to Practice
              </button>
            </div>
          </div>
        </div>
      <PostTestDiagnosticReport
        candidateName={candidateName}
        testTitle={currentSet.title}
        testSetId={currentSet.id}
        activeSkill={activeSkill}
        results={submittedResults}
        questions={currentSet.questions}
        userAnswers={userAnswers}
        listeningScript={currentSet.listeningScript}
        readingPassage={currentSet.readingPassage}
        timeElapsedSec={Math.max(0, getCDIELTSSkillDurationSec(activeSkill, currentExamAudioDurations) - timeRemainingSec)}
        onRetake={() => {
          hasSubmittedRef.current = false;
          clearListeningAudioState();
          setSubmittedResults(null);
          const retakeDur = getCDIELTSSkillDurationSec(activeSkill, currentExamAudioDurations);
          setTimeRemainingSec(retakeDur);
          endTimeRef.current = Date.now() + retakeDur * 1000;
          setIsTimerRunning(true);
          setUserAnswers({});
          setFlaggedQuestions(new Set());
          setActiveQuestionIdx(0);
          setListeningSection(1);
          setViewedListeningPart(1);
          setViewedReadingPart(1);
          setShowReadingStudyKey(false);
          setListeningPhase('pre_read');
          setPhaseCountdownSec(CDIELTS_PRE_READ_SECONDS);
          setAudioPlaybackSec(0);
          setCompletedListeningParts({});
          setIsListeningLocked(false);
        }}
        onBackToDashboard={onExit}
        onShowToast={onShowToast}
      />
      </div>
    );
  }

  const { badge: activeReadingBadge, title: activeReadingTitle } = deriveActiveReadingHeading(currentSet, activeQuestionObj);
  const { activePassageText, allPassageBlocks } = extractActiveReadingPassage(currentSet, activeQuestionObj);

  const isGTReading = currentSet.format === 'General Training';
  const readingQuestionsList = currentSet.questions.filter((q) => q.section === 'reading');
  const getReadingPartOfEntry = (q: QuestionItem, idx: number): 1 | 2 | 3 => {
    if (q.passage === 1 || q.passage === 2 || q.passage === 3) return q.passage;
    return idx < 13 ? 1 : idx < 26 ? 2 : 3;
  };
  const readingPartGroups = ([1, 2, 3] as const)
    .map((partNum) => {
      const entries = readingQuestionsList
        .map((q, globalIdx) => ({ q, globalIdx }))
        .filter(({ q, globalIdx }) => getReadingPartOfEntry(q, globalIdx) === partNum);
      return {
        partNum,
        entries,
        startIdx: entries[0]?.globalIdx ?? 0,
        startNum: (entries[0]?.globalIdx ?? 0) + 1,
        endNum: (entries[entries.length - 1]?.globalIdx ?? 0) + 1,
        answered: entries.filter(({ q }) => Boolean(userAnswers[q.id]?.trim())).length
      };
    })
    .filter((g) => g.entries.length > 0);

  const viewedReadingGroup =
    readingPartGroups.find((g) => g.partNum === viewedReadingPart) || readingPartGroups[0];
  const rawViewedReadingBlock =
    (allPassageBlocks[viewedReadingPart - 1] || activePassageText || currentSet.readingPassage || '').trim();
  const rawReadingBlocksSplit = rawViewedReadingBlock
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean);
  const firstReadingHeaderMatch = rawReadingBlocksSplit[0]?.match(
    /^(?:#{1,3}\s*)?(?:PASSAGE|SECTION)\s*[123]\s*[:\-–]?\s*(.*)$/i
  );
  const viewedReadingTitle =
    firstReadingHeaderMatch && firstReadingHeaderMatch[1]?.trim()
      ? firstReadingHeaderMatch[1].trim()
      : activeReadingTitle;
  const viewedReadingParagraphs = firstReadingHeaderMatch
    ? rawReadingBlocksSplit.slice(1)
    : rawReadingBlocksSplit;

  // Barnaby's target-band guidance for the section the student is sitting now.
  const barnabySectionGuide =
    activeSkill === 'listening'
      ? {
          title: `Listening — Part ${listeningSection} of 4`,
          need: `For Band ${examSetup.targetBand.toFixed(1)} you need approximately ${correctAnswersNeeded(examSetup.targetBand)} correct out of 40 in Listening.`,
          time: '30 minutes of audio + 2 minutes to check your answers. The audio plays ONCE — there are no replays.',
          trap: 'Most common trap: spelling. Write exactly what you hear — numbers, dates and names are where marks disappear.',
        }
      : activeSkill === 'reading'
      ? {
          title: 'Reading — 3 passages',
          need:
            examSetup.examMode === 'General Training'
              ? `For Band ${examSetup.targetBand.toFixed(1)} you need about ${correctAnswersNeeded(examSetup.targetBand)} correct out of 40 in Reading. GT Reading uses a different scale — these are approximate Academic-scale guide numbers.`
              : `For Band ${examSetup.targetBand.toFixed(1)} you need about ${correctAnswersNeeded(examSetup.targetBand)} correct out of 40 in Reading (Academic scale, approximate).`,
          time: '60 minutes for 3 passages — aim for about 20 minutes per passage. Never leave a question blank.',
          trap: 'Most common trap: True / False / Not Given. "Not Given" means the passage never says it — not that it is false.',
        }
      : {
          title: `Writing — Task ${activeWritingTask} of 2`,
          need: `Writing has no fixed "correct answers" — for Band ${examSetup.targetBand.toFixed(1)} your essay needs a clear position, organised paragraphs and a range of vocabulary and grammar.`,
          time: '60 minutes in total: Task 1 in 20 minutes (150+ words), Task 2 in 40 minutes (250+ words). Task 2 counts double.',
          trap: 'Most common trap: answering only half the question. Read the Task 2 question twice and cover every part of it.',
        };

  return (
    <div
      className={`w-full h-screen flex flex-col ${theme.bg} ${getFontSizeClass()} font-sans select-none overflow-hidden`}
      onMouseUp={handleTextSelection}
    >
      {/* Selection Micro-Popup for Text Highlighting, Underlining & Note Making */}
      {selectionMenu && (
        <div
          className="fixed z-50 bg-[#0B3833] text-white text-xs font-mono font-bold py-1.5 px-3 rounded-lg shadow-2xl flex items-center gap-2 border border-white/25 selection-tooltip-menu"
          style={{
            left: `${Math.min(Math.max(selectionMenu.x, 110), (typeof window !== 'undefined' ? window.innerWidth : 800) - 130)}px`,
            top: `${selectionMenu.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <button
            onClick={() => toggleHighlight(selectionMenu.text)}
            className="hover:text-[#F4A62A] text-amber-300 flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded"
            title="Highlight selected text in yellow"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>Highlight</span>
          </button>
          <span className="text-white/30">|</span>
          <button
            onClick={() => toggleUnderline(selectionMenu.text)}
            className="hover:text-teal-200 text-teal-100 flex items-center gap-1 cursor-pointer px-1.5 py-0.5 underline font-bold rounded"
            title="Underline selected text"
          >
            <span><u>U</u> Underline</span>
          </button>
          <span className="text-white/30">|</span>
          <button
            onClick={() => {
              setActiveQuote(selectionMenu.text);
              setShowNotesDrawer(true);
              setSelectionMenu(null);
            }}
            className="hover:text-emerald-300 text-emerald-200 flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded"
            title="Add margin note for this selection"
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>Note</span>
          </button>
          <button
            onClick={() => setSelectionMenu(null)}
            className="text-white/60 hover:text-white cursor-pointer ml-1 p-0.5"
            title="Close menu"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ================= 1. TOP WORKSTATION HEADER (UNIFIED INSPERA EXAM INTERFACE) ================= */}
      <header
        className={`w-full shrink-0 z-20 select-none border-b ${
          colorScheme === 'standard'
            ? 'bg-white text-[#111827] border-[#CBD5E1]'
            : `${theme.headerBg} ${theme.borderStrong}`
        }`}
      >
          {customPilotSet && (
            <div className="w-full px-4 py-1 bg-[#1E293B] text-white flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium">
                Approved Practice · {customPilotSet.title}
              </span>
              <button
                type="button"
                onClick={() => {
                  stopSpeech();
                  audioService.stop();
                  onExit();
                }}
                className="px-2.5 py-0.5 bg-white/10 hover:bg-white/20 text-white border border-white/25 rounded text-[11px] font-medium cursor-pointer shrink-0 whitespace-nowrap"
              >
                Exit
              </button>
            </div>
          )}

          <div className="w-full h-12 px-3 sm:px-5 flex items-center justify-between gap-3">
            {/* Left: Exit + Candidate Identifier */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(true)}
                className={`px-2.5 py-1 text-xs font-medium rounded border cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
                  colorScheme === 'standard'
                    ? 'border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[#334155]'
                    : 'border-white/25 bg-white/10 hover:bg-white/20 text-current'
                }`}
                title="Exit Exam Session"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Exit</span>
              </button>
              <div className="min-w-0 truncate text-xs sm:text-sm font-semibold">
                <span>{candidateName}</span>
                <span className="hidden md:inline font-normal opacity-65 ml-2 tabular-nums">
                  ID {candidateId}
                </span>
              </div>
            </div>

            {/* Center: Official Clock & Remaining Time */}
            <div className="flex items-center gap-2 shrink-0">
              <div
                data-testid="exam-countdown-timer"
                className={`flex items-center gap-2 px-3 py-1 rounded border text-xs sm:text-sm font-semibold tabular-nums whitespace-nowrap ${
                  timeRemainingSec <= 300
                    ? 'bg-rose-50 text-rose-700 border-rose-400'
                    : timeRemainingSec <= 600
                    ? 'bg-amber-50 text-amber-800 border-amber-400'
                    : colorScheme === 'standard'
                    ? 'bg-[#F8FAFC] text-[#0F172A] border-[#CBD5E1]'
                    : 'bg-black/30 text-current border-white/30'
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0 opacity-75" />
                <span>
                  {isAudioNetworkStalled
                    ? `Buffering ${formatTimer(timeRemainingSec)}`
                    : isTimeHidden
                    ? '••:••'
                    : formatTimer(timeRemainingSec)}
                </span>
                <button
                  type="button"
                  onClick={() => setIsTimeHidden(!isTimeHidden)}
                  className="text-[11px] font-medium underline opacity-75 hover:opacity-100 cursor-pointer ml-1"
                  aria-label={isTimeHidden ? 'Show countdown timer' : 'Hide countdown timer'}
                >
                  {isTimeHidden ? 'Show' : 'Hide'}
                </button>
              </div>
            </div>

            {/* Right: Audio Volume (Listening only) + Notes + Help + Options Menu + Submit */}
            <div className="flex items-center gap-2 shrink-0 relative">
              {activeSkill === 'listening' && (
                <div
                  className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded border ${
                    colorScheme === 'standard'
                      ? 'border-[#CBD5E1] bg-[#F8FAFC]'
                      : 'border-white/25 bg-black/20'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const nextMuted = !isListeningMuted;
                      setIsListeningMuted(nextMuted);
                      audioService.setVolume(nextMuted ? 0 : listeningVolume);
                      soundManager.playBeep(600, 0.02);
                    }}
                    className="cursor-pointer opacity-80 hover:opacity-100"
                    aria-label="Toggle Headset Mute"
                    title="Mute / Unmute Headset"
                  >
                    {isListeningMuted ? (
                      <VolumeX className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isListeningMuted ? 0 : listeningVolume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setListeningVolume(val);
                      audioService.setVolume(val);
                      setIsListeningMuted(val === 0);
                    }}
                    className="w-16 md:w-20 accent-[#0066CC] cursor-pointer h-1.5"
                    aria-label="Listening Headset Volume"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowNotesDrawer((prev) => !prev)}
                className={`hidden md:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border cursor-pointer whitespace-nowrap ${
                  showNotesDrawer
                    ? 'bg-[#0066CC] text-white border-[#0066CC]'
                    : colorScheme === 'standard'
                    ? 'border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[#334155]'
                    : 'border-white/25 hover:bg-white/10'
                }`}
                title="Margin Notes (Alt+V)"
              >
                <StickyNote className="w-3.5 h-3.5" />
                <span>Notes</span>
              </button>

              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border cursor-pointer whitespace-nowrap ${
                  colorScheme === 'standard'
                    ? 'border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[#334155]'
                    : 'border-white/25 hover:bg-white/10'
                }`}
                title="Exam Instructions"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Help</span>
              </button>

              {/* Options Dropdown (Accessibility + Practice Aids tucked cleanly out of exam screen) */}
              <div className="relative" ref={listeningOptionsRef}>
                <button
                  type="button"
                  onClick={() => setShowListeningOptionsMenu((v) => !v)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border cursor-pointer whitespace-nowrap ${
                    showListeningOptionsMenu
                      ? 'bg-[#1E293B] text-white border-[#1E293B]'
                      : colorScheme === 'standard'
                      ? 'border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[#334155]'
                      : 'border-white/25 hover:bg-white/10'
                  }`}
                  aria-expanded={showListeningOptionsMenu}
                  title="Display Options & Practice Aids"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Options</span>
                </button>

                {showListeningOptionsMenu && (
                  <div className="absolute right-0 mt-1.5 w-72 bg-white text-[#111827] border border-[#CBD5E1] rounded-lg shadow-xl p-3.5 space-y-3.5 z-50 text-xs font-sans">
                    <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                      <span className="font-bold text-xs text-[#0F172A]">Display &amp; Practice Options</span>
                      <button
                        type="button"
                        onClick={() => setShowListeningOptionsMenu(false)}
                        className="p-0.5 hover:bg-slate-100 rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Text Size */}
                    <div className="space-y-1.5">
                      <div className="font-semibold text-[#475569]">Text Size</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['100%', '125%', '150%'] as ZoomLevel[]).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setZoomLevel(lvl)}
                            className={`py-1.5 rounded border text-xs font-medium cursor-pointer ${
                              zoomLevel === lvl
                                ? 'bg-[#0066CC] text-white border-[#0066CC]'
                                : 'bg-white text-[#334155] border-[#CBD5E1] hover:bg-slate-50'
                            }`}
                          >
                            {lvl === '100%' ? 'Standard' : lvl === '125%' ? 'Large' : 'XL'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Contrast */}
                    <div className="space-y-1.5">
                      <label className="block font-semibold text-[#475569]" htmlFor="exam-contrast-select">
                        Colour Contrast
                      </label>
                      <select
                        id="exam-contrast-select"
                        value={colorScheme}
                        onChange={(e) => setColorScheme(e.target.value as ColorScheme)}
                        className="w-full px-2.5 py-1.5 border border-[#CBD5E1] rounded bg-white text-[#111827] text-xs outline-none cursor-pointer"
                      >
                        <option value="standard">Black on white (Standard)</option>
                        <option value="black-on-yellow">Black on yellow</option>
                        <option value="yellow-on-black">Yellow on black</option>
                        <option value="white-on-black">White on black</option>
                      </select>
                    </div>

                    {/* Practice Aids */}
                    <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
                      <div className="font-semibold text-[#475569]">Practice Resources</div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {activeSkill === 'listening' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setShowListeningOptionsMenu(false);
                                handleRunSoundCheck();
                              }}
                              disabled={isAudioPlaying}
                              className="w-full px-3 py-1.5 rounded border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-left font-medium flex items-center justify-between cursor-pointer disabled:opacity-50"
                            >
                              <span className="flex items-center gap-2">
                                <Headphones className="w-3.5 h-3.5 text-[#0066CC]" />
                                <span>{isSoundCheckPlaying ? 'Testing Audio...' : hasTestedHeadset ? 'Sound Check Verified' : 'Headset Sound Check'}</span>
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setShowListeningOptionsMenu(false);
                                setActivePracticeModal('transcript');
                              }}
                              className="w-full px-3 py-1.5 rounded border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-left font-medium flex items-center justify-between cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-[#0F4C45]" />
                                <span>Audio Transcript (Part {viewedListeningPart})</span>
                              </span>
                            </button>
                          </>
                        ) : activeSkill === 'reading' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setShowListeningOptionsMenu(false);
                              setActivePracticeModal('reading_guide');
                            }}
                            className="w-full px-3 py-1.5 rounded border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-left font-medium flex items-center justify-between cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <BookOpen className="w-3.5 h-3.5 text-[#0F4C45]" />
                              <span>Passage Guide &amp; Study Key (Part {viewedReadingPart})</span>
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setShowListeningOptionsMenu(false);
                              setActivePracticeModal('writing_model');
                            }}
                            className="w-full px-3 py-1.5 rounded border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-left font-medium flex items-center justify-between cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-[#0F4C45]" />
                              <span>Model Response &amp; Guide (Part {activeWritingTask})</span>
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setShowListeningOptionsMenu(false);
                            setShowNotesDrawer((prev) => !prev);
                          }}
                          className="w-full px-3 py-1.5 rounded border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-left font-medium flex items-center justify-between cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                            <span>Margin Notes ({notes.length})</span>
                          </span>
                        </button>

                        {onOpenSecondaryMode && secondaryModeLabel && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowListeningOptionsMenu(false);
                              onOpenSecondaryMode();
                            }}
                            className="w-full px-3 py-1.5 rounded border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-left font-medium cursor-pointer"
                          >
                            Switch to {secondaryModeLabel}
                          </button>
                        )}

                        {onOpenAiPilots && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowListeningOptionsMenu(false);
                              onOpenAiPilots();
                            }}
                            className="w-full px-3 py-1.5 rounded border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-left font-medium cursor-pointer"
                          >
                            AI Pilot Practice Sets
                          </button>
                        )}
                      </div>

                      {!customPilotSet && (
                        <div className="pt-1 space-y-1">
                          <label className="block font-semibold text-[#475569]" htmlFor="exam-practice-set-select">
                            Practice Test Set
                          </label>
                          <select
                            id="exam-practice-set-select"
                            value={selectedSetIdx}
                            onChange={(e) => {
                              activePlaybackTokenRef.current += 1;
                              setListeningAudioError(null);
                              const idx = parseInt(e.target.value, 10);
                              setSelectedSetIdx(idx);
                              setActiveQuestionIdx(0);
                              stopSpeech();
                              audioService.stop();
                              setIsAudioPlaying(false);
                              setCompletedListeningParts({});
                              setListeningSection(1);
                              setViewedListeningPart(1);
                              setViewedReadingPart(1);
                              setShowReadingStudyKey(false);
                              setListeningPhase('pre_read');
                              setPhaseCountdownSec(CDIELTS_PRE_READ_SECONDS);
                              setAudioPlaybackSec(0);
                              if (leftPaneScrollRef.current) leftPaneScrollRef.current.scrollTop = 0;
                              if (rightPaneScrollRef.current) rightPaneScrollRef.current.scrollTop = 0;
                              passageScrollPosRef.current = 0;
                              if (activeSkill === 'listening') {
                                const targetExamId = MOCK_EXAM_SETS[idx]?.id;
                                const targetDurations = getExamSectionAudioDurations(targetExamId);
                                const initListSec = getCDIELTSSkillDurationSec('listening', targetDurations);
                                setTimeRemainingSec(initListSec);
                                endTimeRef.current = Date.now() + initListSec * 1000;
                              } else if (activeSkill === 'reading') {
                                const readDur = getCDIELTSSkillDurationSec('reading');
                                setTimeRemainingSec(readDur);
                                endTimeRef.current = Date.now() + readDur * 1000;
                              } else {
                                const writeDur = getCDIELTSSkillDurationSec('writing');
                                setActiveWritingTask(1);
                                setTimeRemainingSec(writeDur);
                                endTimeRef.current = Date.now() + writeDur * 1000;
                              }
                              setShowListeningOptionsMenu(false);
                              soundManager.playBeep(550, 0.04);
                              onShowToast(`Loaded ${MOCK_EXAM_SETS[idx]?.title}`);
                            }}
                            className="w-full px-2.5 py-1.5 border border-[#CBD5E1] rounded bg-white text-[#111827] text-xs outline-none cursor-pointer"
                          >
                            {MOCK_EXAM_SETS.map((s, idx) => (
                              <option key={s.id} value={idx}>
                                {s.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                data-testid="exam-finish-btn"
                onClick={() => setShowReviewModal(true)}
                className="px-3.5 py-1 bg-[#1E293B] hover:bg-[#0F172A] text-white font-semibold text-xs rounded cursor-pointer transition whitespace-nowrap shrink-0"
              >
                Finish Test
              </button>
            </div>
          </div>
        </header>

      {/* Barnaby guide panel — target-band help for the section in progress */}
      {showBarnabyGuide && (
        <div className="fixed top-0 right-0 bottom-0 w-full max-w-[340px] z-50 bg-white text-slate-900 shadow-2xl border-l-4 border-amber-400 overflow-y-auto font-sans">
          <div className="sticky top-0 bg-[#0F4C45] text-white px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-9 h-9 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-base shrink-0">
                B
              </span>
              <div className="min-w-0">
                <div className="text-sm font-black leading-tight">Barnaby&apos;s exam guide</div>
                <div className="text-[11px] text-teal-100 leading-tight">Your little dragon, your big IELTS dreams</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowBarnabyGuide(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer shrink-0"
              aria-label="Close Barnaby's guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-800">Your aim</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">
                Band {examSetup.targetBand.toFixed(1)} · {examSetup.examMode}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                {examSetup.examDate && examDaysLeft !== null
                  ? examDaysLeft === 0
                    ? 'Your exam is today — stay calm, trust your practice.'
                    : `Your exam is in ${examDaysLeft} day${examDaysLeft === 1 ? '' : 's'} (${formatExamDate(examSetup.examDate)}).`
                  : 'No exam date set — Barnaby is pacing you by your target band.'}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900">{barnabySectionGuide.title}</h3>
              <p className="text-xs text-slate-700 leading-relaxed">{barnabySectionGuide.need}</p>
              <p className="text-xs text-slate-700 leading-relaxed flex gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0F4C45] shrink-0 mt-0.5" />
                <span>{barnabySectionGuide.time}</span>
              </p>
              <p className="text-xs text-slate-700 leading-relaxed flex gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>{barnabySectionGuide.trap}</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0F4C45]/5 border border-[#0F4C45]/20">
              <p className="text-xs text-slate-700 leading-relaxed">
                <span className="font-black text-[#0F4C45]">Every mistake makes you stronger.</span>{' '}
                If a question is hard, flag it and move on — you can come back to it in the review time.
                Guessing is always better than leaving a blank.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= 2. FULL-MOCK MODULE SWITCHER (ONLY IN MULTI-SKILL MOCK) ================= */}
      {!standaloneSkill && (
        <div className={`w-full px-3 sm:px-4 py-1.5 border-b ${theme.border} flex items-center justify-between gap-2 shrink-0 ${colorScheme === 'standard' ? 'bg-[#E9EFEC] text-[#0F4C45]' : theme.cardBg} font-mono select-none overflow-x-auto`}>
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleSwitchModule('listening')}
              className={`px-2.5 py-1 font-bold border rounded flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition ${
                activeSkill === 'listening' ? theme.activeTile : `${theme.cardBg} ${theme.border} hover:opacity-90`
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>1. Listening</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchModule('reading')}
              className={`px-2.5 py-1 font-bold border rounded flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition ${
                activeSkill === 'reading' ? theme.activeTile : `${theme.cardBg} ${theme.border} hover:opacity-90`
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>2. Reading</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchModule('writing')}
              className={`px-2.5 py-1 font-bold border rounded flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition ${
                activeSkill === 'writing' ? theme.activeTile : `${theme.cardBg} ${theme.border} hover:opacity-90`
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>3. Writing</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onNavigateToSpeaking) {
                  stopSpeech();
                  audioService.stop();
                  onNavigateToSpeaking();
                } else {
                  onShowToast('Speaking Interview module is opening.');
                }
              }}
              className={`px-2.5 py-1 font-bold border rounded flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition ${theme.cardBg} ${theme.border} hover:opacity-90`}
            >
              <Mic className="w-3.5 h-3.5 text-[#D97706]" />
              <span>4. Speaking</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] font-bold shrink-0">
            <span className="opacity-75 tabular-nums">Saved {lastAutoSavedTime}</span>
            {activeSkill === 'listening' && (
              <button
                type="button"
                onClick={handleProceedToReading}
                className={`px-2.5 py-1 rounded cursor-pointer flex items-center gap-1 uppercase whitespace-nowrap ${theme.accentBtn}`}
              >
                <span>Next: Reading</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            {activeSkill === 'reading' && (
              <button
                type="button"
                onClick={handleProceedToWriting}
                className={`px-2.5 py-1 rounded cursor-pointer flex items-center gap-1 uppercase whitespace-nowrap ${theme.accentBtn}`}
              >
                <span>Next: Writing</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= 2B. OFFICIAL LISTENING AUDIO STATUS STRIP (PURE EXAM MODE) ================= */}
      {activeSkill === 'listening' && (
        <div
          data-testid="listening-audio-bar"
          className={`w-full px-3 sm:px-5 py-1.5 border-b shrink-0 font-sans text-xs ${
            colorScheme === 'standard'
              ? 'bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]'
              : `${theme.cardBg} ${theme.border}`
          }`}
        >
          <div className="max-w-[920px] mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium">
              <span className="font-bold">Audio Stream · Part {listeningSection}</span>
              <span aria-hidden="true">·</span>
              <span className="opacity-80 tabular-nums">
                Questions {(listeningSection - 1) * 10 + 1}–{listeningSection * 10}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {listeningPhase === 'pre_read' && (
                <>
                  <span className="tabular-nums font-medium">
                    Audio starts in {formatTimer(phaseCountdownSec)}
                  </span>
                  <button
                    type="button"
                    data-testid="listening-start-audio-btn"
                    onClick={handleSkipPreReadAndStartAudio}
                    className="px-2.5 py-1 rounded bg-[#0066CC] hover:bg-[#0052A3] text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Start Audio</span>
                  </button>
                </>
              )}

              {listeningPhase === 'playing' && (
                <div className="flex items-center gap-2 font-semibold text-[#0066CC]">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span className="tabular-nums">
                    Audio playing — Part {listeningSection} ({formatTimer(audioPlaybackSec)})
                  </span>
                </div>
              )}

              {listeningPhase === 'section_check' && (
                <>
                  <span className="tabular-nums font-medium">
                    Check your answers ({formatTimer(phaseCountdownSec)})
                  </span>
                  <button
                    type="button"
                    onClick={handleAdvanceSection}
                    className="px-2.5 py-1 rounded bg-[#1E293B] hover:bg-[#0F172A] text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <span>{listeningSection < 4 ? `Next: Part ${listeningSection + 1}` : 'Final Check'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {listeningPhase === 'end_of_test_buffer' && (
                <span className="tabular-nums font-semibold text-amber-700">
                  End of test — Final check ({formatTimer(phaseCountdownSec)})
                </span>
              )}

              {listeningPhase === 'completed' && (
                <span className="font-semibold opacity-75">
                  Audio finished — Answers locked
                </span>
              )}
            </div>
          </div>

          {listeningAudioError && listeningAudioError.sectionNum === listeningSection && (
            <div className="max-w-[920px] mx-auto mt-2 px-3 py-2 rounded border border-amber-500 bg-amber-50 text-amber-950 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>{listeningAudioError.message}</span>
              </div>
              <div className="flex items-center gap-2">
                {listeningAudioError.canRetry && (
                  <button
                    type="button"
                    onClick={() => {
                      const count = audioRetryCountRef.current[listeningSection] || 0;
                      audioRetryCountRef.current[listeningSection] = count + 1;
                      setListeningAudioError(null);
                      startListeningPlayback(listeningSection);
                    }}
                    className="px-2.5 py-1 rounded bg-[#1E293B] text-white font-semibold text-[11px] cursor-pointer"
                  >
                    Retry Audio
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setListeningAudioError(null);
                    setListeningPhase('section_check');
                    setPhaseCountdownSec(60);
                  }}
                  className="px-2.5 py-1 rounded bg-white border border-amber-400 text-amber-950 font-semibold text-[11px] cursor-pointer"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= 2B-READING. OFFICIAL READING PART SUB-BANNER (PURE INSPERA EXAM MODE) ================= */}
      {activeSkill === 'reading' && viewedReadingGroup && (
        <div
          data-testid="reading-part-bar"
          className={`w-full px-3 sm:px-5 py-1.5 border-b shrink-0 font-sans text-xs ${
            colorScheme === 'standard'
              ? 'bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]'
              : `${theme.cardBg} ${theme.border}`
          }`}
        >
          <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium">
              <span className="font-bold">
                {isGTReading ? `Section ${viewedReadingPart}` : `Part ${viewedReadingPart}`}
              </span>
              <span aria-hidden="true">·</span>
              <span className="opacity-85 tabular-nums">
                Read the text and answer questions {viewedReadingGroup.startNum}–{viewedReadingGroup.endNum}.
              </span>
            </div>
            <span className="hidden sm:inline text-[11px] opacity-70">
              Select text to Highlight or Add Note
            </span>
          </div>
        </div>
      )}

      {/* ================= 2B-WRITING. WRITING PART SUB-BANNER (PURE INSPERA EXAM MODE) ================= */}
      {activeSkill === 'writing' && (
        <div
          data-testid="writing-part-bar"
          className={`w-full px-3 sm:px-5 py-1.5 border-b shrink-0 font-sans text-xs ${
            colorScheme === 'standard'
              ? 'bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]'
              : `${theme.cardBg} ${theme.border}`
          }`}
        >
          <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium">
              <span className="font-bold">Part {activeWritingTask}</span>
              <span aria-hidden="true">·</span>
              <span className="opacity-85">
                {activeWritingTask === 1
                  ? 'You should spend about 20 minutes on this task. Write at least 150 words.'
                  : 'You should spend about 40 minutes on this task. Write at least 250 words.'}
              </span>
            </div>
            <span className="hidden sm:inline text-[11px] opacity-70 tabular-nums">
              Saved {lastAutoSavedTime}
            </span>
          </div>
        </div>
      )}

      {/* ================= 2C. MOBILE SEGMENTED PANE SWITCHER (READING & WRITING ON <768px) ================= */}
      {activeSkill !== 'listening' && (
        <div
          className={`md:hidden w-full flex border-b shrink-0 text-xs font-sans ${
            colorScheme === 'standard'
              ? 'bg-white border-[#CBD5E1]'
              : `${theme.border} ${theme.cardBg}`
          }`}
        >
          <button
            type="button"
            onClick={() => setMobilePane('left')}
            className={`flex-1 min-h-[42px] py-2 font-bold border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
              mobilePane === 'left'
                ? 'border-[#0066CC] text-[#0066CC] bg-[#EBF3FE]'
                : 'border-transparent opacity-70'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{activeSkill === 'reading' ? 'Reading Passage' : `Part ${activeWritingTask} Prompt`}</span>
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('right')}
            className={`flex-1 min-h-[42px] py-2 font-bold border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
              mobilePane === 'right'
                ? 'border-[#0066CC] text-[#0066CC] bg-[#EBF3FE]'
                : 'border-transparent opacity-70'
            }`}
          >
            <span className="tabular-nums">
              {activeSkill === 'reading'
                ? `Questions (${answeredCount}/${totalQuestions})`
                : `Response (${activeWritingTask === 1 ? task1WordCount : task2WordCount}w)`}
            </span>
          </button>
        </div>
      )}

      {/* ================= 3. WORKSTATION MAIN VIEWPORT ================= */}
      <div
        ref={splitContainerRef}
        style={{
          ['--cd-left-width' as string]: `${leftPanePercent}%`,
          ['--cd-right-width' as string]: `${100 - leftPanePercent}%`
        }}
        className="flex-1 w-full flex flex-col md:flex-row overflow-hidden relative min-h-0"
      >
        {/* Left Column: Reading Passage / Writing Prompt (Not shown in Listening real exam layout) */}
        {activeSkill !== 'listening' && (
        <div
          ref={leftPaneScrollRef}
          className={`${
            mobilePane === 'left'
              ? 'flex w-full md:w-[var(--cd-left-width)] h-full'
              : 'hidden md:flex md:w-[var(--cd-left-width)] h-full'
          } overflow-y-auto flex-col border-b md:border-b-0 md:border-r p-4 sm:p-5 ${
            colorScheme === 'standard'
              ? 'bg-[#EAEEF2] text-[#111827] border-[#CBD5E1]'
              : `${theme.bg} ${theme.border}`
          }`}
          onMouseUp={handleTextSelection}
          onTouchEnd={handleTextSelection}
        >
          {activeSkill === 'reading' && (
            <article
              className={`max-w-[760px] w-full mx-auto border shadow-2xs p-5 sm:p-7 space-y-5 font-sans ${
                colorScheme === 'standard'
                  ? 'bg-white text-[#111827] border-[#CBD5E1]'
                  : `${theme.cardBg} ${theme.border}`
              }`}
            >
              <header
                className={`border-b pb-3 space-y-1 ${
                  colorScheme === 'standard' ? 'border-[#E2E8F0]' : theme.border
                }`}
              >
                <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
                  {activeReadingBadge}
                </div>
                <h1 className="text-lg sm:text-xl font-bold leading-snug tracking-tight">
                  {viewedReadingTitle}
                </h1>
              </header>

              <div
                className={`space-y-4 leading-relaxed select-text ${
                  zoomLevel === '150%'
                    ? 'text-lg'
                    : zoomLevel === '125%'
                    ? 'text-[17px]'
                    : 'text-[15px]'
                }`}
              >
                {viewedReadingParagraphs.map((paragraph, pIdx) => {
                  const tagMatch = paragraph.match(/^(\[[A-Z]\])\s+([\s\S]+)$/);
                  return (
                    <p key={pIdx} className="leading-[1.72]">
                      {tagMatch ? (
                        <>
                          <span className="font-bold mr-2">{tagMatch[1]}</span>
                          {renderParagraphWithHighlights(tagMatch[2])}
                        </>
                      ) : (
                        renderParagraphWithHighlights(paragraph)
                      )}
                    </p>
                  );
                })}
              </div>
            </article>
          )}

          {activeSkill === 'writing' && (
            <article
              className={`max-w-[760px] w-full mx-auto border shadow-2xs p-5 sm:p-7 space-y-5 font-sans ${
                colorScheme === 'standard'
                  ? 'bg-white text-[#111827] border-[#CBD5E1]'
                  : `${theme.cardBg} ${theme.border}`
              }`}
            >
              <header
                className={`border-b pb-3 space-y-1 ${
                  colorScheme === 'standard' ? 'border-[#E2E8F0]' : theme.border
                }`}
              >
                <h1 className="text-base sm:text-lg font-bold tracking-tight">
                  Part {activeWritingTask}
                </h1>
                <p className="text-xs sm:text-sm opacity-80">
                  You should spend about {activeWritingTask === 1 ? '20' : '40'} minutes on this task.
                </p>
              </header>

              <div
                className={`p-4 sm:p-5 border leading-relaxed select-text space-y-3 ${
                  colorScheme === 'standard'
                    ? 'bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A]'
                    : `${theme.bg} ${theme.border}`
                } ${
                  zoomLevel === '150%'
                    ? 'text-lg'
                    : zoomLevel === '125%'
                    ? 'text-[17px]'
                    : 'text-[15px]'
                }`}
              >
                <p className="font-medium leading-[1.7]">
                  {renderParagraphWithHighlights(
                    activeWritingTask === 1
                      ? currentSet.task1Prompt ||
                          'Summarise the main features of the information provided and make comparisons where relevant.'
                      : currentSet.writingPrompt
                  )}
                </p>
              </div>

              <p className="text-xs sm:text-sm font-semibold">
                Write at least {activeWritingTask === 1 ? '150' : '250'} words.
              </p>
            </article>
          )}
        </div>
        )}

        {/* Draggable & Keyboard-Accessible Vertical Splitter Handle (Reading & Writing) */}
        {activeSkill !== 'listening' && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize left and right exam panes"
            aria-valuemin={25}
            aria-valuemax={75}
            aria-valuenow={Math.round(leftPanePercent)}
            tabIndex={0}
            onMouseDown={handleSplitterMouseDown}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setLeftPanePercent((p) => Math.max(25, p - 5));
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setLeftPanePercent((p) => Math.min(75, p + 5));
              }
            }}
            className={`hidden md:flex w-2 hover:w-2.5 cursor-col-resize items-center justify-center transition-colors shrink-0 focus:outline-none ${
              isDraggingSplitter
                ? 'bg-[#0066CC] w-2.5'
                : 'bg-[#CBD5E1] hover:bg-[#94A3B8] focus:bg-[#0066CC]'
            }`}
            title="Drag or press Left/Right arrow keys to resize panes"
          >
            <div className="w-0.5 h-10 rounded-full bg-[#475569]/60" />
          </div>
        )}

        {/* Right Column (or Full-Width Question Sheet in Listening): Question Panel OR Writing Editor Area */}
        <div
          ref={rightPaneScrollRef}
          className={`${
            activeSkill === 'listening'
              ? 'flex flex-1 h-full overflow-y-auto'
              : mobilePane === 'right'
              ? `flex w-full md:w-[var(--cd-right-width)] h-full overflow-y-auto ${
                  activeSkill === 'reading' ? 'p-0' : 'p-4 sm:p-5'
                }`
              : `hidden md:flex md:w-[var(--cd-right-width)] h-full overflow-y-auto ${
                  activeSkill === 'reading' ? 'p-0' : 'p-4 sm:p-5'
                }`
          } flex-col justify-between ${
            activeSkill === 'writing'
              ? colorScheme === 'standard'
                ? 'bg-[#EAEEF2] text-[#111827]'
                : theme.bg
              : 'bg-inherit'
          }`}
        >
          <div className="w-full flex-1 flex flex-col">
          {activeSkill === 'writing' ? (
            <div className="flex-1 flex flex-col max-w-[760px] w-full mx-auto font-sans">
              <textarea
                data-testid="mock-writing-textarea"
                tabIndex={1}
                value={activeWritingTask === 1 ? task1Essay : task2Essay}
                onChange={(e) =>
                  activeWritingTask === 1
                    ? setTask1Essay(e.target.value)
                    : setTask2Essay(e.target.value)
                }
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                autoComplete="off"
                placeholder=""
                aria-label={`Writing Part ${activeWritingTask} response`}
                className={`flex-1 min-h-[380px] w-full p-5 sm:p-6 border shadow-2xs leading-relaxed outline-none resize-none select-text focus:border-[#0066CC] ${
                  colorScheme === 'standard'
                    ? 'bg-white text-[#111827] border-[#CBD5E1]'
                    : `${theme.inputBg} ${theme.border}`
                } ${
                  zoomLevel === '150%'
                    ? 'text-lg'
                    : zoomLevel === '125%'
                    ? 'text-[17px]'
                    : 'text-[15px]'
                }`}
              />

              <div className="pt-2 flex items-center justify-between text-xs font-sans">
                <span className="font-medium tabular-nums">
                  Words: {activeWritingTask === 1 ? task1WordCount : task2WordCount}
                </span>
                <span className="opacity-70 tabular-nums">
                  Minimum {activeWritingTask === 1 ? 150 : 250} words
                </span>
              </div>
            </div>
          ) : activeSkill === 'listening' ? (
            <CDIELTSListeningSheet
              listeningSection={viewedListeningPart}
              allListeningQuestions={skillQuestions}
              userAnswers={userAnswers}
              flaggedQuestions={flaggedQuestions}
              activeQuestionId={activeQuestionId}
              isLocked={isListeningLocked}
              colorScheme={colorScheme}
              zoomLevel={zoomLevel}
              onAnswerChange={(qId, value) => {
                setUserAnswers((prev) => ({ ...prev, [qId]: value }));
                soundManager.playBeep(540, 0.02);
              }}
              onToggleFlag={toggleFlag}
              onFocusQuestion={(_qId, globalIdx) => {
                setActiveQuestionIdx(globalIdx);
              }}
              onSwitchPart={(p) => {
                setViewedListeningPart(p);
                const firstPartIdx = (p - 1) * 10;
                if (firstPartIdx < skillQuestions.length) {
                  setActiveQuestionIdx(firstPartIdx);
                }
              }}
              renderHighlightedText={renderParagraphWithHighlights}
              scrollTrigger={listeningScrollTrigger}
            />
          ) : (
            <CDIELTSReadingSheet
              readingPart={viewedReadingPart}
              allReadingQuestions={skillQuestions}
              examFormat={currentSet.format === 'General Training' ? 'General Training' : 'Academic'}
              userAnswers={userAnswers}
              flaggedQuestions={flaggedQuestions}
              activeQuestionId={activeQuestionId}
              colorScheme={colorScheme}
              zoomLevel={zoomLevel}
              onAnswerChange={(qId, value) => {
                setUserAnswers((prev) => ({ ...prev, [qId]: value }));
                soundManager.playBeep(540, 0.02);
              }}
              onToggleFlag={toggleFlag}
              onFocusQuestion={(_qId, globalIdx) => {
                setActiveQuestionIdx(globalIdx);
              }}
              renderHighlightedText={renderParagraphWithHighlights}
              scrollTrigger={readingScrollTrigger}
            />
          )}
          </div>
        </div>

        {/* ================= 3. MARGIN NOTES & HIGHLIGHTER SIDE PANEL (Alt+V) ================= */}
        {showNotesDrawer && (
          <div className="w-80 sm:w-96 h-full border-l-2 border-black bg-white text-black flex flex-col justify-between p-4 shadow-2xl z-30">
            <div className="space-y-4 overflow-y-auto pr-1">
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <div className="flex items-center gap-1.5 font-mono font-bold text-xs uppercase">
                  <StickyNote className="w-4 h-4 text-amber-600" />
                  <span>Margin Notes & Highlights (Alt+V)</span>
                </div>
                <button
                  onClick={() => setShowNotesDrawer(false)}
                  className="p-1 hover:bg-gray-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* New Note Composer */}
              <div className="space-y-2 p-3 border border-gray-400 bg-gray-50">
                {activeQuote && (
                  <div className="text-[11px] font-serif italic bg-yellow-100 p-2 border-l-2 border-yellow-500 text-gray-800">
                    "{activeQuote}"
                  </div>
                )}
                <textarea
                  value={newNoteInput}
                  onChange={(e) => setNewNoteInput(e.target.value)}
                  placeholder="Write a margin note for this passage..."
                  className="w-full p-2 border border-gray-400 bg-white text-black text-xs h-20 outline-none focus:border-black resize-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAddNote}
                    className="px-3 py-1 bg-black text-white font-mono font-bold text-xs cursor-pointer"
                  >
                    + Save Margin Note
                  </button>
                </div>
              </div>

              {/* Saved Notes List */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase block text-gray-600">
                  Saved Margin Notes ({notes.length})
                </span>
                {notes.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">
                    Select any text in the passage or press Alt+V to record margin notes.
                  </p>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="p-2.5 border border-gray-300 bg-yellow-50/60 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
                        <span>Clock: {n.timestamp}</span>
                        <button
                          onClick={() => setNotes((prev) => prev.filter((item) => item.id !== n.id))}
                          className="text-rose-600 hover:underline cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                      {n.selectedQuote && (
                        <div className="text-[11px] italic text-gray-700 border-l-2 border-amber-400 pl-2">
                          "{n.selectedQuote}"
                        </div>
                      )}
                      <p className="font-medium text-gray-900">{n.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Active Highlights List */}
              {highlights.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-300">
                  <span className="text-xs font-mono font-bold uppercase block text-gray-600">
                    Active Yellow Highlights ({highlights.length})
                  </span>
                  {highlights.map((hl, idx) => (
                    <div
                      key={idx}
                      className="p-2 border border-yellow-400 bg-yellow-100 text-xs flex items-center justify-between gap-2"
                    >
                      <span className="truncate font-serif">"{hl}"</span>
                      <button
                        onClick={() => toggleHighlight(hl)}
                        className="text-[10px] font-mono text-rose-700 hover:underline shrink-0 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Active Underlines List */}
              {underlines.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-300">
                  <span className="text-xs font-mono font-bold uppercase block text-blue-800">
                    Active Deep Blue Underlines ({underlines.length})
                  </span>
                  {underlines.map((ul, idx) => (
                    <div
                      key={idx}
                      className="p-2 border border-blue-400 bg-blue-50 text-xs flex items-center justify-between gap-2"
                    >
                      <span className="truncate font-serif underline decoration-blue-600 decoration-2">"{ul}"</span>
                      <button
                        onClick={() => toggleUnderline(ul)}
                        className="text-[10px] font-mono text-rose-700 hover:underline shrink-0 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= 4. BOTTOM QUESTION NAVIGATION DOCK (UNIFIED INSPERA BAR) ================= */}
      <footer
        className={`w-full border-t px-3 sm:px-5 py-2 shrink-0 select-none z-10 font-sans ${
          colorScheme === 'standard'
            ? 'bg-[#F8FAFC] text-[#111827] border-[#CBD5E1]'
            : `${theme.bg} ${theme.border}`
        }`}
      >
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Parts Bar with Active Part Expanded Numbered Squares (Listening/Reading) or Part 1 / Part 2 Tabs (Writing) */}
          <div className="flex items-center gap-2 overflow-x-auto py-0.5 flex-1 min-w-0">
            {activeSkill === 'writing' ? (
              <div className="flex items-center gap-2">
                {([1, 2] as const).map((partNum) => {
                  const isActive = activeWritingTask === partNum;
                  const words = partNum === 1 ? task1WordCount : task2WordCount;
                  return (
                    <button
                      key={partNum}
                      type="button"
                      onClick={() => {
                        setActiveWritingTask(partNum);
                        if (leftPaneScrollRef.current) leftPaneScrollRef.current.scrollTop = 0;
                        soundManager.playBeep(520, 0.02);
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded border cursor-pointer whitespace-nowrap transition flex items-center gap-2 ${
                        isActive
                          ? colorScheme === 'standard'
                            ? 'bg-[#1E293B] text-white border-[#1E293B]'
                            : theme.activeTile
                          : colorScheme === 'standard'
                          ? 'bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9]'
                          : `${theme.cardBg} ${theme.border}`
                      }`}
                    >
                      <span>Part {partNum}</span>
                      <span className="text-[11px] font-normal opacity-80 tabular-nums">
                        {words} {words === 1 ? 'word' : 'words'}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : activeSkill === 'listening'
              ? ([1, 2, 3, 4] as const).map((partNum) => {
                  const startIdx = (partNum - 1) * 10;
                  const partQs = skillQuestions.slice(startIdx, startIdx + 10);
                    if (partQs.length === 0) return null;
                    const partAnswered = partQs.filter((q) => Boolean(userAnswers[q.id]?.trim())).length;
                    const isViewedPart = viewedListeningPart === partNum;

                    return (
                      <div key={partNum} className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setViewedListeningPart(partNum);
                            if (startIdx < skillQuestions.length) {
                              const targetQ = skillQuestions[startIdx];
                              setActiveQuestionIdx(startIdx);
                              setListeningScrollTrigger({ questionId: targetQ.id, nonce: Date.now() });
                            }
                            soundManager.playBeep(520, 0.02);
                          }}
                          className={`px-2.5 py-1 text-xs font-bold rounded border cursor-pointer whitespace-nowrap transition ${
                            isViewedPart
                              ? colorScheme === 'standard'
                                ? 'bg-[#1E293B] text-white border-[#1E293B]'
                                : theme.activeTile
                              : colorScheme === 'standard'
                              ? 'bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9]'
                              : `${theme.cardBg} ${theme.border}`
                          }`}
                        >
                          <span>Part {partNum}</span>
                          {!isViewedPart && (
                            <span className="ml-1.5 text-[11px] font-normal opacity-75 tabular-nums">
                              {partAnswered}/{partQs.length}
                            </span>
                          )}
                        </button>

                        {isViewedPart && (
                          <div className="flex items-center gap-1 pl-1">
                            {partQs.map((q, localIdx) => {
                              const globalIdx = startIdx + localIdx;
                              const displayNum = globalIdx + 1;
                              const isAnswered = Boolean(userAnswers[q.id]?.trim());
                              const isFlagged = flaggedQuestions.has(q.id);
                              const isCurrent = activeQuestionIdx === globalIdx;

                              return (
                                <button
                                  key={q.id}
                                  type="button"
                                  onClick={() => {
                                    setActiveQuestionIdx(globalIdx);
                                    setListeningScrollTrigger({ questionId: q.id, nonce: Date.now() });
                                    soundManager.playBeep(520, 0.02);
                                  }}
                                  title={`Question ${displayNum} (${isAnswered ? 'Answered' : 'Unanswered'}${isFlagged ? ', Flagged' : ''})`}
                                  aria-current={isCurrent ? 'step' : undefined}
                                  className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs font-bold tabular-nums cursor-pointer transition shrink-0 ${
                                    isFlagged
                                      ? 'rounded-full border-2 border-[#D97706] bg-amber-50 text-[#92400E]'
                                      : isAnswered
                                      ? colorScheme === 'standard'
                                        ? 'rounded-[3px] bg-[#1E293B] text-white border border-[#1E293B]'
                                        : `rounded-[3px] ${theme.activeTile}`
                                      : colorScheme === 'standard'
                                      ? 'rounded-[3px] bg-white text-[#1E293B] border border-[#94A3B8] hover:border-[#0066CC]'
                                      : `rounded-[3px] ${theme.cardBg} border ${theme.border}`
                                  } ${isCurrent ? 'ring-2 ring-[#0066CC] ring-offset-1 z-10' : ''}`}
                                >
                                  {displayNum}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                : readingPartGroups.map((group) => {
                    const isViewedPart = viewedReadingPart === group.partNum;

                    return (
                      <div key={group.partNum} className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setViewedReadingPart(group.partNum);
                            const firstEntry = group.entries[0];
                            if (firstEntry) {
                              setActiveQuestionIdx(firstEntry.globalIdx);
                              setReadingScrollTrigger({ questionId: firstEntry.q.id, nonce: Date.now() });
                            }
                            soundManager.playBeep(520, 0.02);
                          }}
                          className={`px-2.5 py-1 text-xs font-bold rounded border cursor-pointer whitespace-nowrap transition ${
                            isViewedPart
                              ? colorScheme === 'standard'
                                ? 'bg-[#1E293B] text-white border-[#1E293B]'
                                : theme.activeTile
                              : colorScheme === 'standard'
                              ? 'bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9]'
                              : `${theme.cardBg} ${theme.border}`
                          }`}
                        >
                          <span>Part {group.partNum}</span>
                          {!isViewedPart && (
                            <span className="ml-1.5 text-[11px] font-normal opacity-75 tabular-nums">
                              {group.answered}/{group.entries.length}
                            </span>
                          )}
                        </button>

                        {isViewedPart && (
                          <div className="flex items-center gap-1 pl-1">
                            {group.entries.map(({ q, globalIdx }) => {
                              const displayNum = globalIdx + 1;
                              const isAnswered = Boolean(userAnswers[q.id]?.trim());
                              const isFlagged = flaggedQuestions.has(q.id);
                              const isCurrent = activeQuestionIdx === globalIdx;

                              return (
                                <button
                                  key={q.id}
                                  type="button"
                                  onClick={() => {
                                    setActiveQuestionIdx(globalIdx);
                                    setReadingScrollTrigger({ questionId: q.id, nonce: Date.now() });
                                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                                      setMobilePane('right');
                                    }
                                    soundManager.playBeep(520, 0.02);
                                  }}
                                  title={`Question ${displayNum} (${isAnswered ? 'Answered' : 'Unanswered'}${isFlagged ? ', Flagged' : ''})`}
                                  aria-current={isCurrent ? 'step' : undefined}
                                  className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs font-bold tabular-nums cursor-pointer transition shrink-0 ${
                                    isFlagged
                                      ? 'rounded-full border-2 border-[#D97706] bg-amber-50 text-[#92400E]'
                                      : isAnswered
                                      ? colorScheme === 'standard'
                                        ? 'rounded-[3px] bg-[#1E293B] text-white border border-[#1E293B]'
                                        : `rounded-[3px] ${theme.activeTile}`
                                      : colorScheme === 'standard'
                                      ? 'rounded-[3px] bg-white text-[#1E293B] border border-[#94A3B8] hover:border-[#0066CC]'
                                      : `rounded-[3px] ${theme.cardBg} border ${theme.border}`
                                  } ${isCurrent ? 'ring-2 ring-[#0066CC] ring-offset-1 z-10' : ''}`}
                                >
                                  {displayNum}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
            </div>

            {/* Bottom-Right Review Count + Classic Prev / Next Arrow Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {activeSkill === 'writing' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(true)}
                    className={`hidden sm:inline-flex px-2.5 py-1.5 text-xs font-medium rounded border cursor-pointer tabular-nums ${
                      colorScheme === 'standard'
                        ? 'bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9]'
                        : `${theme.cardBg} ${theme.border}`
                    }`}
                  >
                    Part {activeWritingTask} of 2
                  </button>

                  <button
                    type="button"
                    disabled={activeWritingTask === 1}
                    onClick={() => {
                      setActiveWritingTask(1);
                      soundManager.playBeep(480, 0.02);
                    }}
                    aria-label="Previous part"
                    title="Previous Part (Part 1)"
                    className={`w-8 h-8 flex items-center justify-center rounded border cursor-pointer disabled:opacity-35 ${
                      colorScheme === 'standard'
                        ? 'bg-white text-[#1E293B] border-[#94A3B8] hover:bg-[#F1F5F9]'
                        : `${theme.cardBg} ${theme.border}`
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={activeWritingTask === 2}
                    onClick={() => {
                      setActiveWritingTask(2);
                      soundManager.playBeep(520, 0.02);
                    }}
                    aria-label="Next part"
                    title="Next Part (Part 2)"
                    className={`w-8 h-8 flex items-center justify-center rounded border cursor-pointer disabled:opacity-35 ${
                      colorScheme === 'standard'
                        ? 'bg-[#1E293B] text-white border-[#1E293B] hover:bg-[#0F172A]'
                        : theme.accentBtn
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(true)}
                    className={`hidden sm:inline-flex px-2.5 py-1.5 text-xs font-medium rounded border cursor-pointer tabular-nums ${
                      colorScheme === 'standard'
                        ? 'bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9]'
                        : `${theme.cardBg} ${theme.border}`
                    }`}
                  >
                    {answeredCount}/{totalQuestions} Answered
                  </button>

                  <button
                    type="button"
                    disabled={activeQuestionIdx <= 0}
                    onClick={() => {
                      const prevIdx = Math.max(0, activeQuestionIdx - 1);
                      const targetQ = skillQuestions[prevIdx];
                      setActiveQuestionIdx(prevIdx);
                      if (activeSkill === 'listening') {
                        const prevPart = (Math.floor(prevIdx / 10) + 1) as 1 | 2 | 3 | 4;
                        setViewedListeningPart(prevPart);
                        if (targetQ) {
                          setListeningScrollTrigger({ questionId: targetQ.id, nonce: Date.now() });
                        }
                      } else {
                        const prevPart = getReadingPartOfEntry(targetQ, prevIdx);
                        setViewedReadingPart(prevPart);
                        if (targetQ) {
                          setReadingScrollTrigger({ questionId: targetQ.id, nonce: Date.now() });
                        }
                      }
                      soundManager.playBeep(480, 0.02);
                    }}
                    aria-label="Previous question"
                    title="Previous Question (Alt+P)"
                    className={`w-8 h-8 flex items-center justify-center rounded border cursor-pointer disabled:opacity-35 ${
                      colorScheme === 'standard'
                        ? 'bg-white text-[#1E293B] border-[#94A3B8] hover:bg-[#F1F5F9]'
                        : `${theme.cardBg} ${theme.border}`
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={activeQuestionIdx >= skillQuestions.length - 1}
                    onClick={() => {
                      const nextIdx = Math.min(skillQuestions.length - 1, activeQuestionIdx + 1);
                      const targetQ = skillQuestions[nextIdx];
                      setActiveQuestionIdx(nextIdx);
                      if (activeSkill === 'listening') {
                        const nextPart = (Math.floor(nextIdx / 10) + 1) as 1 | 2 | 3 | 4;
                        setViewedListeningPart(nextPart);
                        if (targetQ) {
                          setListeningScrollTrigger({ questionId: targetQ.id, nonce: Date.now() });
                        }
                      } else {
                        const nextPart = getReadingPartOfEntry(targetQ, nextIdx);
                        setViewedReadingPart(nextPart);
                        if (targetQ) {
                          setReadingScrollTrigger({ questionId: targetQ.id, nonce: Date.now() });
                        }
                      }
                      soundManager.playBeep(520, 0.02);
                    }}
                    aria-label="Next question"
                    title="Next Question (Alt+N)"
                    className={`w-8 h-8 flex items-center justify-center rounded border cursor-pointer disabled:opacity-35 ${
                      colorScheme === 'standard'
                        ? 'bg-[#1E293B] text-white border-[#1E293B] hover:bg-[#0F172A]'
                        : theme.accentBtn
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </footer>

      {/* ================= 5. HELP, REVIEW & ROUTE GUARD MODALS ================= */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white text-[#0E1F1E] p-6 border border-[#D3DDDA] rounded-2xl max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#D3DDDA] pb-2.5">
              <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">
                {activeSkill === 'listening'
                  ? 'IELTS on Computer — Listening Help & Shortcuts'
                  : activeSkill === 'reading'
                  ? 'IELTS on Computer — Reading Help & Shortcuts'
                  : 'IELTS on Computer — Writing Instructions & Shortcuts'}
              </h2>
              <button onClick={() => setShowHelpModal(false)} className="p-1 hover:bg-slate-100 rounded cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs leading-relaxed space-y-2 font-sans">
              <p className="font-bold">1. Keyboard Shortcuts:</p>
              <p>• <strong>Alt + N</strong>: Advance to the next question.</p>
              <p>• <strong>Alt + P</strong>: Return to the previous question.</p>
              <p>• <strong>Alt + R</strong>: Toggle the review flag for the active question.</p>
              <p>• <strong>Alt + V</strong>: Open or close the Margin Notes and Highlighter side panel.</p>
              <p>• <strong>Tab / Shift + Tab</strong>: Move focus sequentially across completion blanks.</p>

              <p className="font-bold">2. Listening Audio Rules (Single-Play Rule):</p>
              <p>Audio tracks follow the Single-Play Rule with no scrubbing, matching timed computer-delivered practice rules (35s pre-read buffer, 60s section check, and 2-minute final check).</p>

              <p className="font-bold">3. Highlighting &amp; Margin Notes:</p>
              <p>Select any text in the reading passage or writing prompt to open the Highlight, Underline, and Note toolbar.</p>

              <p className="font-bold">4. Writing Timing &amp; Word Count:</p>
              <p>You have 60 minutes in total across Part 1 (minimum 150 words) and Part 2 (minimum 250 words). Spellcheck is disabled, and you may switch between Part 1 and Part 2 at any time using the bottom bar.</p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-[#0F4C45] hover:bg-[#0B3833] text-white font-bold text-xs rounded-lg cursor-pointer"
              >
                Close Instructions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accidental Navigation / Exit Route Guard Modal */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-white text-black p-6 border-2 border-black max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <div className="flex items-center gap-2 font-mono font-bold text-sm uppercase text-rose-700">
                <AlertTriangle className="w-5 h-5" />
                <span>ACTIVE EXAM SESSION GUARD</span>
              </div>
              <button onClick={() => setShowExitConfirmModal(false)} className="p-1 hover:bg-gray-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-bold leading-relaxed font-mono">
              You have an exam session in progress. Leaving now will submit your current answers.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowExitConfirmModal(false)}
                className="px-3.5 py-2 border border-black font-bold text-xs cursor-pointer"
              >
                Stay in Exam
              </button>
              <button
                onClick={handleFinalSubmit}
                className="px-3.5 py-2 bg-rose-700 text-white font-bold text-xs hover:bg-rose-800 cursor-pointer"
              >
                Submit Current Answers
              </button>
              <button
                onClick={() => {
                  saveNow();
                  onExit();
                }}
                className="px-3 py-2 bg-gray-800 text-white font-bold text-xs hover:bg-black cursor-pointer"
              >
                Save Draft & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white text-black p-6 border-2 border-black max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <h2 className="text-lg font-bold uppercase font-mono">CONFIRM TEST SUBMISSION</h2>
              <button onClick={() => setShowReviewModal(false)} className="p-1 hover:bg-gray-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-2 font-mono">
              <p className="font-bold text-sm">Summary of Attempted Responses:</p>
              <div className="p-3 border border-gray-400 bg-gray-100 space-y-1">
                <div>Answered Questions: {answeredCount} of {totalQuestions}</div>
                <div>Unanswered Questions: {totalQuestions - answeredCount}</div>
                <div>Flagged for Review: {flaggedQuestions.size}</div>
                {(activeSkill === 'writing' || !standaloneSkill) && (
                  <>
                    <div>Writing Task 1 Words: {task1WordCount} (Min 150)</div>
                    <div>Writing Task 2 Words: {task2WordCount} (Min 250)</div>
                  </>
                )}
              </div>
              <p className="text-rose-700 font-bold pt-1">
                Once submitted, your answers will be locked and graded immediately using the 4-criterion Practice evaluation engine.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 border border-black font-bold text-xs cursor-pointer"
              >
                Return to Test
              </button>
              <button
                onClick={handleFinalSubmit}
                className="px-4 py-2 bg-rose-700 text-white font-bold text-xs hover:bg-rose-800 cursor-pointer"
              >
                Confirm & Grade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10-Minute & 5-Minute Warning Flash Alert Modal */}
      {/* Practice Mode Resource Modal (Transcripts, Reading Guides & Model Essays) */}
      {activePracticeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 p-6 border-2 border-slate-900 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl font-sans">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 font-mono">
              <div className="flex items-center gap-2 font-bold text-sm uppercase text-[#0F4C45]">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>
                  {activePracticeModal === 'transcript' && `Listening Part ${viewedListeningPart} — Audio Transcript`}
                  {activePracticeModal === 'reading_guide' && `Reading Practice Set ${selectedSetIdx + 1} — Passage Guide & Answer Explanations`}
                  {activePracticeModal === 'writing_model' && `Academic Writing — Model Essay & Band Criteria Guide`}
                </span>
              </div>
              <button onClick={() => setActivePracticeModal(null)} className="p-1 hover:bg-slate-100 rounded cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
              {activePracticeModal === 'transcript' && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                    <span className="font-bold">Practice Resource:</span> Audio transcripts are available in practice mode for post-listening review. In the real IELTS on Computer exam, audio plays once with no transcript.
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {([1, 2, 3, 4] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setViewedListeningPart(p)}
                        className={`px-3 py-1 rounded border text-xs font-semibold cursor-pointer ${
                          viewedListeningPart === p
                            ? 'bg-[#1E293B] text-white border-[#1E293B]'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Part {p}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="font-bold uppercase text-[#0F172A]">Part {viewedListeningPart} Transcript:</div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed">
                      {getExamListeningSection(currentSet, viewedListeningPart).script || currentSet.listeningScript || 'Transcript not available for this section.'}
                    </div>
                  </div>
                </div>
              )}

              {activePracticeModal === 'reading_guide' && (
                <div className="space-y-4">
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-900">
                    <span className="font-bold">Practice Resource:</span> Passage guides and answer explanations are available in practice mode via Options. In the real IELTS on Computer exam, only the passage and question sheet are displayed.
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {([1, 2, 3] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setViewedReadingPart(p)}
                        className={`px-3 py-1 rounded border text-xs font-semibold cursor-pointer ${
                          viewedReadingPart === p
                            ? 'bg-[#1E293B] text-white border-[#1E293B]'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Part {p}
                      </button>
                    ))}
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm leading-relaxed space-y-2">
                    <p><strong>Title:</strong> {viewedReadingTitle}</p>
                    <p>
                      <strong>Part {viewedReadingPart} Length:</strong>{' '}
                      {rawViewedReadingBlock.split(/\s+/).filter(Boolean).length} words (
                      Questions {viewedReadingGroup?.startNum ?? 1}–{viewedReadingGroup?.endNum ?? 13})
                    </p>
                    <p>
                      <strong>Exam Strategy:</strong> Skim paragraph topic sentences first, highlight proper nouns or dates directly in the left passage, and verify whether statements are contradicted (<em>FALSE</em>) or unmentioned (<em>NOT GIVEN</em>).
                    </p>
                  </div>

                  {viewedReadingGroup && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setShowReadingStudyKey((v) => !v)}
                        className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800 cursor-pointer"
                      >
                        {showReadingStudyKey
                          ? `Hide Part ${viewedReadingPart} Answer Key & Explanations`
                          : `Show Part ${viewedReadingPart} Answer Key & Explanations (${viewedReadingGroup.entries.length} questions)`}
                      </button>

                      {showReadingStudyKey && (
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {viewedReadingGroup.entries.map(({ q, globalIdx }) => (
                            <div
                              key={q.id}
                              className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-900">
                                  Q{globalIdx + 1} · {q.type}
                                </span>
                                <span className="font-bold text-emerald-700">
                                  Answer: {q.correctAnswer}
                                </span>
                              </div>
                              {q.explanation && (
                                <p className="text-slate-600 leading-relaxed">{q.explanation}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activePracticeModal === 'writing_model' && (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                    <span className="font-bold">Practice Resource:</span> Model responses and structural checklists are tucked inside Options for practice mode. In the real IELTS on Computer Writing test, only the prompt and plain-text editor are shown.
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {([1, 2] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setActiveWritingTask(p)}
                        className={`px-3 py-1 rounded border text-xs font-semibold cursor-pointer ${
                          activeWritingTask === p
                            ? 'bg-[#1E293B] text-white border-[#1E293B]'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Part {p} ({p === 1 ? '150+ words' : '250+ words'})
                      </button>
                    ))}
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                    <div className="font-bold uppercase text-[#0F172A]">
                      Part {activeWritingTask} Band 7–8+ Structure Checklist
                    </div>
                    {activeWritingTask === 1 ? (
                      <ul className="list-disc pl-4 space-y-1 text-slate-700">
                        <li>Paraphrase the prompt concisely in your opening sentence.</li>
                        <li>Include a clear overview summarising the main trends or overall purpose.</li>
                        <li>Group key comparisons logically with accurate data/tone (aim for 165–190 words).</li>
                      </ul>
                    ) : (
                      <ul className="list-disc pl-4 space-y-1 text-slate-700">
                        <li>State a clear position in your introduction and address every part of the prompt.</li>
                        <li>Develop 2 focused body paragraphs with specific explanations and examples.</li>
                        <li>Conclude by synthesising your position without introducing new arguments (aim for 270–310 words).</li>
                      </ul>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="font-bold uppercase text-[#0F172A]">
                      Part {activeWritingTask} Sample Response:
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed">
                      {activeWritingTask === 1
                        ? currentSet.task1Model || 'Part 1 sample response is available upon submission.'
                        : currentSet.modelEssay || 'Part 2 sample response is available upon submission.'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActivePracticeModal(null)}
                className="px-4 py-2 bg-[#0F4C45] hover:bg-[#0B3833] text-white font-bold text-xs rounded-lg cursor-pointer font-mono"
              >
                Close Practice Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {warningModalText && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-amber-400 text-black p-6 border-4 border-black max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 font-mono font-black text-base border-b-2 border-black pb-2">
              <AlertTriangle className="w-6 h-6 text-black" />
              <span>EXAM TIME ALERT</span>
            </div>
            <p className="text-xs font-bold leading-relaxed font-mono">{warningModalText}</p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setWarningModalText(null)}
                className="px-4 py-2 bg-black text-white font-bold text-xs cursor-pointer"
              >
                Acknowledge & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
