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
  ArrowRight
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
import { CDIELTSSVGMap, CDIELTSMatchingHeadingsPicker } from './CDIELTSInteractiveVisuals';

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
  const [activeWritingTask, setActiveWritingTask] = useState<1 | 2>(2);
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
  const [showListeningScript, setShowListeningScript] = useState(false);

  // Warning Modals (10-minute and 5-minute mandatory alerts)
  const [hasShown10mWarning, setHasShown10mWarning] = useState(false);
  const [hasShown5mWarning, setHasShown5mWarning] = useState(false);
  const [warningModalText, setWarningModalText] = useState<string | null>(null);

  // Strict Listening Audio State Machine (IndexedDB persisted)
  const [listeningSection, setListeningSection] = useState<1 | 2 | 3 | 4>(1);
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
        className = 'underline decoration-2 decoration-[#002F6C] text-[#0F172A] font-semibold cursor-pointer';
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

  // Official CD-IELTS Keyboard Navigation:
  // Alt+N (Next), Alt+P (Previous), Alt+R (Toggle Review Flag), Alt+V (Toggle Margin Notes & Highlighter Panel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setActiveQuestionIdx((prev) => Math.max(0, prev - 1));
        soundManager.playBeep(480, 0.03);
      } else if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setActiveQuestionIdx((prev) => Math.min(skillQuestions.length - 1, prev + 1));
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
  }, [skillQuestions.length, activeQuestionId, toggleFlag]);

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
          setListeningSection(1);
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
  const { activePassageText } = extractActiveReadingPassage(currentSet, activeQuestionObj);

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

      {/* ================= 1. BANDSPRINT CD-IELTS EXAM HEADER (RESTRAINED SINGLE-BAR WORKSTATION) ================= */}
      <header className={`w-full ${theme.headerBg} border-b ${theme.borderStrong || 'border-[#0B3833]'} shrink-0 flex flex-col font-mono select-none z-20`}>
        {customPilotSet && (
          <div className="w-full px-3 sm:px-4 py-1 bg-emerald-950 text-emerald-100 border-b border-emerald-600/60 flex items-center justify-between gap-2 text-xs font-mono font-bold">
            <div className="flex items-center gap-2 truncate">
              <span className="uppercase tracking-wider text-emerald-300 whitespace-nowrap">
                AI PILOT — APPROVED PRACTICE
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{customPilotSet.title}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                stopSpeech();
                audioService.stop();
                onExit();
              }}
              className="px-2.5 py-0.5 bg-emerald-900 hover:bg-emerald-800 text-white border border-emerald-500 rounded text-[11px] font-bold cursor-pointer shrink-0 whitespace-nowrap"
            >
              Exit AI Pilot
            </button>
          </div>
        )}

        {/* Primary Examination Top Bar — Single Row on Desktop (>=lg), Clean 2-Line Flex on Narrow Mobile */}
        <div className="w-full min-h-12 px-2.5 sm:px-4 py-1.5 flex items-center justify-between gap-2">
          {/* Left: Exit + Module Status + Candidate ID */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setShowExitConfirmModal(true)}
              className="px-2.5 py-1 border border-white/25 bg-white/10 hover:bg-white/20 text-current font-mono font-bold text-xs rounded cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1"
              title="Exit Exam Session"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>

            <div className="h-4 w-px bg-white/20 hidden sm:block shrink-0" />

            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <span className="hidden sm:inline text-xs font-bold uppercase tracking-wide text-[#F4A62A] truncate">
                {activeSkill === 'listening'
                  ? `Listening · Part ${listeningSection}/4`
                  : activeSkill === 'reading'
                  ? activeReadingBadge
                  : `Writing · Task ${activeWritingTask}`}
              </span>
              <span className="sm:hidden text-[11px] font-bold uppercase tracking-wide text-[#F4A62A] truncate">
                {activeSkill === 'listening'
                  ? `L·P${listeningSection}`
                  : activeSkill === 'reading'
                  ? `R·Q${activeQuestionIdx + 1}`
                  : `W·T${activeWritingTask}`}
              </span>
              <span className="hidden xl:inline text-[11px] opacity-80 truncate">
                · {candidateName} ({candidateId})
              </span>
            </div>
          </div>

          {/* Center: Prominent Countdown Timer + Set Selector */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div
              data-testid="exam-countdown-timer"
              className={`flex items-center gap-1.5 font-mono font-bold text-xs sm:text-sm px-2.5 py-1 border rounded whitespace-nowrap ${
                timeRemainingSec <= 300
                  ? 'bg-rose-950 text-rose-200 border-rose-400 animate-pulse'
                  : timeRemainingSec <= 600
                  ? 'bg-amber-950 text-[#F4A62A] border-[#F4A62A]/70'
                  : 'bg-black/30 text-white border-white/25'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#F4A62A] shrink-0" />
              <span className="tabular-nums tracking-wide">
                {isAudioNetworkStalled
                  ? `Buffering ${formatTimer(timeRemainingSec)}`
                  : isTimeHidden
                  ? '••:••'
                  : formatTimer(timeRemainingSec)}
              </span>
              <button
                type="button"
                onClick={() => setIsTimeHidden(!isTimeHidden)}
                className="ml-0.5 opacity-75 hover:opacity-100 cursor-pointer"
                title={isTimeHidden ? 'Show countdown timer' : 'Hide countdown timer'}
                aria-label={isTimeHidden ? 'Show countdown timer' : 'Hide countdown timer'}
              >
                <span className="text-[10px] underline hidden md:inline">{isTimeHidden ? 'Show' : 'Hide'}</span>
              </button>
            </div>

            {!customPilotSet && (
              <select
                aria-label="Select IELTS Practice Set"
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
                  setListeningPhase('pre_read');
                  setPhaseCountdownSec(CDIELTS_PRE_READ_SECONDS);
                  setAudioPlaybackSec(0);
                  if (activeSkill === 'listening') {
                    const targetExamId = MOCK_EXAM_SETS[idx]?.id;
                    const targetDurations = getExamSectionAudioDurations(targetExamId);
                    const initListSec = getCDIELTSSkillDurationSec('listening', targetDurations);
                    setTimeRemainingSec(initListSec);
                    endTimeRef.current = Date.now() + initListSec * 1000;
                  }
                  soundManager.playBeep(550, 0.04);
                  onShowToast(`Loaded ${MOCK_EXAM_SETS[idx]?.title}`);
                }}
                className="bg-black/30 text-white text-[11px] font-mono font-bold px-2 py-1 border border-white/25 rounded outline-none cursor-pointer hidden lg:block max-w-[165px] truncate"
                title="Select IELTS Practice Set"
              >
                {MOCK_EXAM_SETS.map((s, idx) => (
                  <option key={s.id} value={idx} className="bg-white text-[#0E1F1E]">
                    {s.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Right: Accessibility Display Controls, Notes, Help, Optional Mode Switch, Finish */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Font Resizer (Desktop) */}
            <div className="hidden md:flex items-center border border-white/25 font-mono text-[11px] font-bold rounded overflow-hidden bg-black/20">
              {(['100%', '125%', '150%'] as ZoomLevel[]).map((lvl, idx) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setZoomLevel(lvl)}
                  className={`px-2 py-1 cursor-pointer transition whitespace-nowrap ${idx > 0 ? 'border-l border-white/20' : ''} ${
                    zoomLevel === lvl ? 'bg-[#F4A62A] text-[#0E1F1E] font-black' : 'hover:bg-white/10 opacity-85'
                  }`}
                  title={`Text size ${lvl}`}
                >
                  {lvl === '100%' ? 'A' : lvl === '125%' ? 'A+' : 'A++'}
                </button>
              ))}
            </div>

            {/* Contrast Switcher */}
            <select
              aria-label="Display Contrast Mode"
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value as ColorScheme)}
              className="hidden sm:block bg-black/30 text-current text-[11px] font-mono font-bold px-2 py-1 border border-white/25 rounded outline-none cursor-pointer max-w-[125px] truncate"
              title="Switch Color Contrast Mode"
            >
              <option value="standard" className="bg-white text-[#0E1F1E]">Standard</option>
              <option value="black-on-yellow" className="bg-[#FFF100] text-black">Black / Yellow</option>
              <option value="yellow-on-black" className="bg-black text-[#FFF100]">Yellow / Black</option>
              <option value="white-on-black" className="bg-black text-white">White / Black</option>
            </select>

            {/* Notes Drawer Toggle (Alt+V) */}
            <button
              type="button"
              onClick={() => setShowNotesDrawer((prev) => !prev)}
              className={`hidden sm:flex px-2 py-1 border text-[11px] font-mono font-bold items-center gap-1 cursor-pointer rounded transition whitespace-nowrap ${
                showNotesDrawer ? 'bg-[#F4A62A] text-[#0E1F1E] border-[#F4A62A]' : 'border-white/25 hover:bg-white/10'
              }`}
              title="Toggle Margin Notes & Highlights (Alt+V)"
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Notes ({notes.length})</span>
            </button>

            {/* Instructions / Help Modal */}
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="hidden lg:inline-flex px-2 py-1 hover:bg-white/10 border border-white/25 cursor-pointer rounded font-mono text-[11px] font-bold whitespace-nowrap"
              title="Exam Instructions & Shortcuts"
            >
              Help
            </button>

            {/* Optional Secondary Lab / AI Pilots Switch (Standalone Skill Practice) */}
            {onOpenSecondaryMode && secondaryModeLabel && (
              <button
                type="button"
                onClick={onOpenSecondaryMode}
                className="hidden xl:inline-flex px-2.5 py-1 hover:bg-white/15 bg-white/10 border border-white/25 cursor-pointer rounded font-mono text-[11px] font-bold whitespace-nowrap"
                title={secondaryModeLabel}
              >
                {secondaryModeLabel}
              </button>
            )}

            {onOpenAiPilots && (
              <button
                type="button"
                onClick={onOpenAiPilots}
                className="hidden 2xl:inline-flex px-2.5 py-1 hover:bg-white/15 bg-white/10 border border-white/25 cursor-pointer rounded font-mono text-[11px] font-bold whitespace-nowrap"
                title="Open AI Pilot Sets"
              >
                AI Pilots
              </button>
            )}

            {/* Primary Finish & Submit CTA */}
            <button
              type="button"
              data-testid="exam-finish-btn"
              onClick={() => setShowReviewModal(true)}
              className="px-3 py-1 bg-[#F4A62A] hover:bg-[#D0891F] text-[#0E1F1E] font-mono font-bold text-xs rounded cursor-pointer transition whitespace-nowrap shrink-0"
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

      {/* ================= 2B. COMPACT LISTENING SINGLE-PLAY AUDIO BAR (WHEN ACTIVE SKILL IS LISTENING) ================= */}
      {activeSkill === 'listening' && (
        <div
          data-testid="listening-audio-bar"
          className={`w-full px-3 sm:px-5 py-2 border-b ${theme.border} ${colorScheme === 'standard' ? 'bg-[#EEF3F1]' : theme.cardBg} shrink-0 font-mono text-xs`}
        >
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
            {/* Part 1–4 Switcher */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map((s) => {
                const isCompleted = Boolean(completedListeningParts[s]);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      if (isCompleted) {
                        onShowToast(`Section ${s} audio has already played once (Single-Play Rule). Viewing questions only.`);
                      } else if (s !== listeningSection) {
                        activePlaybackTokenRef.current += 1;
                        stopSpeech();
                        audioService.stop();
                        setIsAudioPlaying(false);
                        setListeningAudioError(null);
                        setListeningPhase('pre_read');
                        setPhaseCountdownSec(35);
                      }
                      setListeningSection(s as 1 | 2 | 3 | 4);
                      const firstPartIdx = (s - 1) * 10;
                      if (firstPartIdx < skillQuestions.length) {
                        setActiveQuestionIdx(firstPartIdx);
                      }
                    }}
                    className={`px-2.5 py-1 border rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap transition ${
                      listeningSection === s ? theme.activeTile : `${theme.cardBg} ${theme.border} hover:opacity-90`
                    }`}
                  >
                    <span>Part {s}</span>
                    {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                  </button>
                );
              })}
            </div>

            {/* Playback Phase + Single-Play Primary Action */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-1 rounded border text-[11px] font-bold tabular-nums whitespace-nowrap ${theme.cardBg} ${theme.border}`}>
                {listeningPhase === 'pre_read' && `Pre-Read · ${formatTimer(phaseCountdownSec)}`}
                {listeningPhase === 'playing' && `Single-Play Active · ${audioPlaybackSec}s`}
                {listeningPhase === 'section_check' && `Check Answers · ${formatTimer(phaseCountdownSec)}`}
                {listeningPhase === 'end_of_test_buffer' && `Final Check · ${formatTimer(phaseCountdownSec)}`}
                {listeningPhase === 'completed' && 'Audio Finished (Locked)'}
              </span>

              {listeningPhase === 'pre_read' && (
                <button
                  type="button"
                  data-testid="listening-start-audio-btn"
                  onClick={handleSkipPreReadAndStartAudio}
                  className={`px-3 py-1 rounded font-bold text-[11px] uppercase flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${theme.accentBtn}`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Start Audio</span>
                </button>
              )}

              {listeningPhase === 'section_check' && (
                <button
                  type="button"
                  onClick={handleAdvanceSection}
                  className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] uppercase flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <span>{listeningSection < 4 ? `Next: Part ${listeningSection + 1}` : 'Final Check'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={handleRunSoundCheck}
                disabled={isAudioPlaying}
                className={`px-2.5 py-1 rounded border text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap ${theme.cardBg} ${theme.border}`}
                title="Verify headset audio output"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isSoundCheckPlaying ? 'Testing...' : hasTestedHeadset ? 'Sound OK' : 'Sound Check'}</span>
              </button>
            </div>

            {/* Compact Headset Volume + Optional Script Context Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const nextMuted = !isListeningMuted;
                  setIsListeningMuted(nextMuted);
                  audioService.setVolume(nextMuted ? 0 : listeningVolume);
                  soundManager.playBeep(600, 0.02);
                }}
                className={`p-1 rounded border cursor-pointer ${theme.cardBg} ${theme.border}`}
                aria-label="Toggle Headset Mute"
                title="Toggle Headset Mute"
              >
                {isListeningMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-600" /> : <Volume2 className="w-3.5 h-3.5 text-[#0F4C45]" />}
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
                className="w-20 sm:w-24 accent-[#0F4C45] cursor-pointer h-1.5"
                aria-label="Listening Headset Volume"
              />
              <span className="text-[11px] font-bold tabular-nums w-8 text-right">
                {Math.round((isListeningMuted ? 0 : listeningVolume) * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setShowListeningScript((v) => !v)}
                className={`px-2 py-1 rounded border text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                  showListeningScript ? theme.activeTile : `${theme.cardBg} ${theme.border}`
                }`}
                title="Show or hide section reference context"
              >
                {showListeningScript ? 'Hide Context' : 'Context'}
              </button>
            </div>
          </div>

          {/* Inline Audio Error or Live Spoken Status */}
          {listeningAudioError && listeningAudioError.sectionNum === listeningSection && (
            <div className="max-w-6xl mx-auto mt-2 px-3 py-2 rounded border border-amber-500 bg-amber-50 text-amber-950 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-sans">{listeningAudioError.message}</span>
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
                    className="px-2.5 py-1 rounded bg-[#0F4C45] text-white font-bold text-[11px] cursor-pointer"
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
                  className="px-2.5 py-1 rounded bg-white border border-amber-400 text-amber-950 font-bold text-[11px] cursor-pointer"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {listeningPhase === 'playing' && currentSpokenLine && (!listeningAudioError || listeningAudioError.sectionNum !== listeningSection) && (
            <div className="max-w-6xl mx-auto mt-1.5 px-2.5 py-1 rounded border border-[#0F4C45]/25 bg-white text-[#0E1F1E] text-[11px] flex items-center justify-between gap-2">
              <span className="truncate font-sans">{currentSpokenLine}</span>
              <span className="text-[10px] font-mono uppercase text-[#0F4C45] shrink-0">Single-Play Lock</span>
            </div>
          )}
        </div>
      )}

      {/* ================= 2C. MOBILE SEGMENTED PANE SWITCHER (READING & WRITING ON <768px) ================= */}
      {activeSkill !== 'listening' && (
        <div className={`md:hidden w-full flex border-b ${theme.border} ${theme.cardBg} shrink-0 font-mono text-xs`}>
          <button
            type="button"
            onClick={() => setMobilePane('left')}
            className={`flex-1 min-h-[42px] py-2 font-bold border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
              mobilePane === 'left'
                ? 'border-[#0F4C45] text-[#0F4C45] bg-[#0F4C45]/5'
                : 'border-transparent opacity-70'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{activeSkill === 'reading' ? 'Reading Passage' : 'Writing Prompt'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('right')}
            className={`flex-1 min-h-[42px] py-2 font-bold border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
              mobilePane === 'right'
                ? 'border-[#0F4C45] text-[#0F4C45] bg-[#0F4C45]/5'
                : 'border-transparent opacity-70'
            }`}
          >
            <span className="tabular-nums">
              {activeSkill === 'reading' ? `Questions (${answeredCount}/${totalQuestions})` : 'Essay Sheet'}
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
        {/* Left Column: Reading Passage / Writing Prompt / Optional Listening Context */}
        {(activeSkill !== 'listening' || showListeningScript) && (
        <div
          ref={leftPaneScrollRef}
          className={`${
            activeSkill === 'listening'
              ? 'flex w-full md:w-[38%] h-[38%] md:h-full'
              : mobilePane === 'left'
              ? 'flex w-full md:w-[var(--cd-left-width)] h-full'
              : 'hidden md:flex md:w-[var(--cd-left-width)] h-full'
          } p-4 sm:p-6 overflow-y-auto flex-col space-y-4 border-b md:border-b-0 md:border-r ${theme.border} ${colorScheme === 'standard' ? 'bg-white' : theme.cardBg}`}
          onMouseUp={handleTextSelection}
          onTouchEnd={handleTextSelection}
        >
          {activeSkill === 'reading' && (
            <div className="space-y-4">
              <div className={`border-b ${theme.border} pb-2.5 flex flex-wrap items-center justify-between gap-2 font-mono`}>
                <span className={`text-xs font-mono font-bold uppercase ${colorScheme === 'standard' ? 'text-[#0F4C45]' : ''}`}>
                  Reading Practice Set {selectedSetIdx + 1} of {MOCK_EXAM_SETS.length}
                </span>
                <div className="flex items-center gap-1 font-mono text-xs">
                  {MOCK_EXAM_SETS.map((set, pIdx) => (
                    <button
                      key={set.id}
                      onClick={() => {
                        activePlaybackTokenRef.current += 1;
                        setSelectedSetIdx(pIdx);
                        setActiveQuestionIdx(0);
                        if (leftPaneScrollRef.current) leftPaneScrollRef.current.scrollTop = 0;
                        passageScrollPosRef.current = 0;
                        soundManager.playBeep(540, 0.03);
                        onShowToast(`Viewing ${MOCK_EXAM_SETS[pIdx]?.title || `Practice Set ${pIdx + 1}`}`);
                      }}
                      className={`px-3 py-1.5 min-h-[38px] border rounded-md cursor-pointer font-bold transition ${
                        selectedSetIdx === pIdx
                          ? theme.activeTile
                          : `${theme.cardBg} ${theme.border} hover:opacity-85`
                      }`}
                    >
                      Set {pIdx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`flex flex-wrap items-center justify-between gap-2 text-xs font-mono opacity-85 p-2.5 rounded-md border ${theme.border} ${theme.cardBg}`}>
                <span>{activeReadingBadge} · {activeReadingTitle}</span>
                <span>{(activePassageText || currentSet.readingPassage || '').trim().split(/\s+/).filter(Boolean).length} words</span>
              </div>

              <h1 className={`text-xl sm:text-2xl font-bold leading-tight font-display ${colorScheme === 'standard' ? 'text-[#0F4C45]' : ''}`}>
                {activeReadingTitle}
              </h1>

              <div className="space-y-4 leading-relaxed font-sans select-text">
                {(activePassageText || currentSet.readingPassage || '').split('\n\n').map((paragraph, pIdx) => (
                  <p key={pIdx} className="leading-relaxed">
                    {renderParagraphWithHighlights(paragraph)}
                  </p>
                ))}
              </div>

              <div className={`pt-4 border-t ${theme.border} flex flex-wrap items-center justify-between gap-3 font-mono`}>
                <span className="text-xs opacity-75">
                  Select any text to highlight, underline, or add a margin note (Alt+V)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSwitchMobilePane('right')}
                    className={`md:hidden px-4 py-2 font-mono font-bold text-xs uppercase tracking-wider rounded-md flex items-center gap-2 cursor-pointer min-h-[44px] ${theme.accentBtn}`}
                  >
                    <span>Go to Questions ({answeredCount}/{totalQuestions})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleProceedToWriting}
                    className={`hidden sm:flex px-4 py-2 font-mono font-bold text-xs uppercase tracking-wider rounded-md items-center gap-2 cursor-pointer ${theme.accentBtn}`}
                  >
                    <span>Proceed to Writing (60 min)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSkill === 'listening' && showListeningScript && (
            <div className="space-y-3">
              {(() => {
                const secDetail = getExamListeningSection(currentSet, listeningSection);
                return (
                  <div className="space-y-3">
                    <div className={`flex items-center justify-between border-b ${theme.border} pb-2 font-mono`}>
                      <h3 className="font-bold text-xs uppercase">
                        Section {listeningSection} Reference Context
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowListeningScript(false)}
                        className="text-[11px] underline cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                    {secDetail.isAvailable && secDetail.script ? (
                      <div className="space-y-3 font-sans text-sm leading-relaxed select-text">
                        {secDetail.script.split('\n\n').map((para, idx) => (
                          <p key={idx} className={`p-3 border rounded ${theme.border}`}>
                            {renderParagraphWithHighlights(para)}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 border border-amber-300 bg-amber-50 text-amber-900 font-mono text-xs space-y-1.5 rounded">
                        <div className="font-bold">Section {listeningSection} Context Notice</div>
                        <p className="font-sans text-xs leading-relaxed">
                          {secDetail.missingReason || `Listening dialogue script for Section ${listeningSection} is not available in this practice set.`}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {activeSkill === 'writing' && (
            <div className="space-y-4">
              <div className={`border-b ${theme.border} pb-2.5 flex items-center justify-between font-mono`}>
                <span className={`text-xs font-mono font-bold uppercase ${colorScheme === 'standard' ? 'text-[#0F4C45]' : ''}`}>
                  Academic Writing · Task {activeWritingTask}
                </span>
                <div className="flex items-center gap-2 font-mono">
                  <button
                    onClick={() => setActiveWritingTask(1)}
                    className={`px-3 py-1 text-xs font-mono font-bold border rounded cursor-pointer ${
                      activeWritingTask === 1 ? theme.activeTile : `${theme.cardBg} ${theme.border}`
                    }`}
                  >
                    Task 1 (Min 150w)
                  </button>
                  <button
                    onClick={() => setActiveWritingTask(2)}
                    className={`px-3 py-1 text-xs font-mono font-bold border rounded cursor-pointer ${
                      activeWritingTask === 2 ? theme.activeTile : `${theme.cardBg} ${theme.border}`
                    }`}
                  >
                    Task 2 (Min 250w)
                  </button>
                </div>
              </div>

              <div className={`p-4 border rounded ${theme.border} ${theme.cardBg} space-y-2 font-mono`}>
                <div className={`text-xs font-mono font-bold uppercase ${colorScheme === 'standard' ? 'text-[#0F4C45]' : ''}`}>
                  Writing Prompt · Task {activeWritingTask}
                </div>
                <p className="font-semibold leading-relaxed text-sm sm:text-base font-sans">
                  {activeWritingTask === 1
                    ? currentSet.task1Prompt || 'Summarise the main features of the statistical chart and make comparisons where relevant. Write at least 150 words.'
                    : currentSet.writingPrompt}
                </p>
                <p className={`text-xs opacity-75 pt-2 border-t ${theme.border}`}>
                  {activeWritingTask === 1
                    ? 'Recommended time: 20 minutes. Minimum length: 150 words.'
                    : 'Recommended time: 40 minutes. Minimum length: 250 words.'}
                </p>
              </div>
            </div>
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
            className={`hidden md:flex w-2 hover:w-2.5 bg-[#D3DDDA] focus:bg-[#0F4C45] focus:outline-none cursor-col-resize items-center justify-center transition-colors shrink-0 ${
              isDraggingSplitter ? 'bg-[#0F4C45] w-2.5' : ''
            }`}
            title="Drag or press Left/Right arrow keys to resize panes"
          >
            <div className="w-0.5 h-10 bg-[#0F4C45]/60 rounded-full" />
          </div>
        )}

        {/* Right Column (or Centered Sheet in Listening): Question Panel OR Writing Editor Area */}
        <div
          ref={rightPaneScrollRef}
          className={`${
            activeSkill === 'listening'
              ? 'flex flex-1 h-full'
              : mobilePane === 'right'
              ? 'flex w-full md:w-[var(--cd-right-width)] h-full'
              : 'hidden md:flex md:w-[var(--cd-right-width)] h-full'
          } p-4 sm:p-6 overflow-y-auto flex-col justify-between bg-inherit`}
        >
          <div className={activeSkill === 'listening' ? 'max-w-4xl w-full mx-auto flex-1 flex flex-col justify-between' : 'flex-1 flex flex-col justify-between'}>
          {activeSkill === 'writing' ? (
            <div className="flex-1 flex flex-col space-y-3 font-mono">
              <div className={`flex items-center justify-between border-b ${theme.border} pb-2`}>
                <span className={`text-xs font-mono font-bold uppercase ${colorScheme === 'standard' ? 'text-[#0F4C45]' : ''}`}>
                  Candidate Essay Response · Task {activeWritingTask}
                </span>
                <span
                  className={`text-xs font-mono font-bold px-3 py-1 border rounded-md tabular-nums ${
                    (activeWritingTask === 1 ? task1WordCount < 150 : task2WordCount < 250)
                      ? 'border-amber-600 text-amber-800 bg-amber-50'
                      : 'border-emerald-600 text-emerald-800 bg-emerald-50'
                  }`}
                >
                  Words: {activeWritingTask === 1 ? task1WordCount : task2WordCount} / {activeWritingTask === 1 ? 150 : 250} min
                </span>
              </div>

              <textarea
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
                placeholder={`Type your Writing Task ${activeWritingTask} practice response here... (Auto-saved every 30s)`}
                className={`flex-1 min-h-[380px] w-full p-4 border rounded-lg ${theme.border} ${theme.inputBg} focus:border-[#0F4C45] font-sans text-sm sm:text-base leading-relaxed outline-none resize-none select-text`}
              />

              <div className={`flex flex-wrap items-center justify-between pt-1 text-xs opacity-80 font-mono border-t ${theme.border}`}>
                <span>Spellcheck disabled for timed practice</span>
                <span>4-criterion diagnostic evaluation on submit</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between space-y-6 font-mono">
              <div className="space-y-4">
                <div className={`flex items-center justify-between border-b ${theme.border} pb-2 font-mono`}>
                  <span className={`text-xs font-mono font-bold uppercase ${colorScheme === 'standard' ? 'text-[#0F4C45]' : ''}`}>
                    Question {activeQuestionIdx + 1} of {skillQuestions.length} · {activeQuestionObj?.type}
                  </span>

                  {/* Flag for Review Checkbox (Alt+R) */}
                  <label
                    className={`flex items-center gap-2 text-xs font-mono font-bold cursor-pointer px-2.5 py-1 border rounded-md ${theme.border} ${theme.cardBg}`}
                    title="Flag question for review (Shortcut: Alt+R)"
                  >
                    <input
                      type="checkbox"
                      checked={flaggedQuestions.has(activeQuestionId)}
                      onChange={() => toggleFlag(activeQuestionId)}
                      className="accent-[#D97706] w-4 h-4 cursor-pointer"
                    />
                    <span>Flag (Alt+R)</span>
                  </label>
                </div>

                {/* Current Active Question Display */}
                {activeQuestionObj && (
                  <div className="space-y-4 font-mono">
                    <div className={`p-4 border rounded-lg ${theme.border} ${theme.cardBg} space-y-2`}>
                      <div className={`flex items-center justify-between text-xs font-mono font-bold ${colorScheme === 'standard' ? 'text-[#0F4C45]' : ''}`}>
                        <span>Question {activeQuestionObj.id}</span>
                        <span className="opacity-75 uppercase">{activeQuestionObj.type}</span>
                      </div>
                      <div className="font-semibold text-sm sm:text-base leading-snug font-sans">
                        {activeQuestionObj.prompt}
                      </div>
                    </div>

                    {/* Interactive Practice Visual Aids: Campus Map Labeling or Matching Headings */}
                    {(activeQuestionObj.type.toLowerCase().includes('map') ||
                      activeQuestionObj.prompt.toLowerCase().includes('located') ||
                      activeQuestionObj.prompt.toLowerCase().includes('layout') ||
                      activeQuestionObj.prompt.toLowerCase().includes('pin')) && (
                      <CDIELTSSVGMap
                        currentAnswer={userAnswers[activeQuestionId] || ''}
                        onSelectPin={(pin) => {
                          setUserAnswers((prev) => ({ ...prev, [activeQuestionId]: pin }));
                          soundManager.playBeep(560, 0.03);
                        }}
                        disabled={activeSkill === 'listening' && isListeningLocked}
                      />
                    )}

                    {(activeQuestionObj.type.toLowerCase().includes('heading') ||
                      activeQuestionObj.prompt.toLowerCase().includes('heading')) && (
                      <CDIELTSMatchingHeadingsPicker
                        currentAnswer={userAnswers[activeQuestionId] || ''}
                        onSelectHeading={(roman) => {
                          setUserAnswers((prev) => ({ ...prev, [activeQuestionId]: roman }));
                          soundManager.playBeep(560, 0.03);
                        }}
                        disabled={activeSkill === 'listening' && isListeningLocked}
                      />
                    )}

                    {/* Question Input Paradigms (Tab / Shift+Tab Sequential Focus) */}
                    {activeQuestionObj.options && activeQuestionObj.options.length > 0 ? (
                      <div className="space-y-2 pt-1 font-mono">
                        {activeQuestionObj.options.map((opt, optIdx) => {
                          const optionLetter = opt.split('.')[0]?.trim() || opt;
                          const isSelected =
                            userAnswers[activeQuestionId] === opt ||
                            userAnswers[activeQuestionId] === optionLetter;
                          const isDisabled = activeSkill === 'listening' && isListeningLocked;

                          return (
                            <label
                              key={opt}
                              onClick={() => {
                                if (isDisabled) return;
                                setUserAnswers((prev) => ({
                                  ...prev,
                                  [activeQuestionId]: optionLetter
                                }));
                                soundManager.playBeep(540, 0.03);
                              }}
                              className={`flex items-center gap-3 p-3.5 border rounded-lg font-mono transition ${
                                isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                              } ${
                                isSelected
                                  ? `${theme.activeTile} font-bold`
                                  : `${theme.cardBg} ${theme.border} hover:opacity-90 font-medium`
                              }`}
                            >
                              <input
                                tabIndex={optIdx + 1}
                                type="radio"
                                disabled={isDisabled}
                                name={`q_${activeQuestionId}`}
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 accent-[#0F4C45] cursor-pointer shrink-0"
                              />
                              <span className="font-mono font-bold text-xs px-1.5 py-0.5 border border-current rounded shrink-0">
                                {optionLetter}
                              </span>
                              <span className="text-xs sm:text-sm font-sans">{opt.replace(/^[A-Z]\.\s*/, '')}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      /* Short Answer / Fill in the Blanks (Sequential Tab Focus) */
                      <div className="space-y-2 pt-2 font-mono">
                        <label className="block text-xs font-mono font-bold uppercase opacity-80">
                          Type Answer (Tab / Shift+Tab for next question):
                        </label>
                        <input
                          tabIndex={1}
                          type="text"
                          disabled={activeSkill === 'listening' && isListeningLocked}
                          value={userAnswers[activeQuestionId] || ''}
                          onChange={(e) =>
                            setUserAnswers((prev) => ({
                              ...prev,
                              [activeQuestionId]: e.target.value
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              if (e.shiftKey) {
                                setActiveQuestionIdx((q) => Math.max(0, q - 1));
                              } else {
                                setActiveQuestionIdx((q) => Math.min(skillQuestions.length - 1, q + 1));
                              }
                              soundManager.playBeep(500, 0.02);
                            }
                          }}
                          placeholder={
                            activeSkill === 'listening' && isListeningLocked
                              ? 'Listening answers locked after 2-minute check period'
                              : 'Type your answer here...'
                          }
                          className={`w-full p-3 border-2 rounded-lg ${theme.border} ${theme.inputBg} focus:border-[#0F4C45] font-mono font-bold text-sm outline-none disabled:opacity-60`}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Prev / Next Buttons flanking question */}
              <div className={`pt-4 border-t ${theme.border} flex items-center justify-between gap-3 font-mono`}>
                <button
                  disabled={activeQuestionIdx <= 0}
                  onClick={() => {
                    setActiveQuestionIdx((q) => Math.max(0, q - 1));
                    soundManager.playBeep(480, 0.03);
                  }}
                  className={`px-4 py-2 border rounded-md text-xs font-mono font-bold disabled:opacity-30 flex items-center gap-1 cursor-pointer ${theme.cardBg} ${theme.border}`}
                  title="Previous Question (Alt+P)"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  onClick={() => setShowReviewModal(true)}
                  className={`px-3.5 py-2 border rounded-md text-xs font-mono font-bold uppercase cursor-pointer ${theme.cardBg} ${theme.border}`}
                >
                  Review &amp; Submit ({answeredCount}/{totalQuestions})
                </button>

                <button
                  disabled={activeQuestionIdx >= skillQuestions.length - 1}
                  onClick={() => {
                    setActiveQuestionIdx((q) => Math.min(skillQuestions.length - 1, q + 1));
                    soundManager.playBeep(520, 0.03);
                  }}
                  className={`px-4 py-2 rounded-md text-xs font-mono font-bold disabled:opacity-30 flex items-center gap-1 cursor-pointer ${theme.accentBtn}`}
                  title="Next Question (Alt+N)"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
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

      {/* ================= 4. BOTTOM QUESTION NAVIGATION DOCK ================= */}
      <footer className={`w-full border-t ${theme.border} px-3 sm:px-4 py-2.5 shrink-0 ${colorScheme === 'standard' ? 'bg-[#E9EFEC]' : theme.bg} select-none z-10 font-mono`}>
        {/* Dock Header: Response Metrics & Review Status */}
        <div className="flex items-center justify-between gap-2 mb-2 text-xs font-mono font-bold">
          {/* Status Metrics Legend */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-[11px] sm:text-xs">
            <span className="flex items-center gap-1.5">
              <span className={`w-3.5 h-3.5 rounded-sm inline-block ${theme.activeTile}`} />
              <span>Answered ({answeredCount})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`w-3.5 h-3.5 rounded-sm border inline-block ${theme.cardBg} ${theme.border}`} />
              <span>Unanswered ({totalQuestions - answeredCount})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`w-3.5 h-3.5 rounded-sm inline-block ${theme.flaggedTile}`} />
              <span>Flagged ({flaggedQuestions.size})</span>
            </span>
          </div>

          {/* Review Summary Trigger (Separated from Question Tiles Rail) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReviewModal(true)}
              className={`px-3 py-1 border rounded-md text-[11px] sm:text-xs font-mono font-bold cursor-pointer uppercase ${theme.cardBg} ${theme.border}`}
            >
              Review Summary ({answeredCount}/{totalQuestions})
            </button>
            <button
              onClick={() => setShowPalette(!showPalette)}
              className={`text-[11px] font-mono px-2.5 py-1 border rounded-md cursor-pointer hidden min-[420px]:inline ${theme.cardBg} ${theme.border}`}
            >
              {showPalette ? 'Hide Palette' : 'Show Palette'}
            </button>
          </div>
        </div>

        {/* Clean, Horizontally Scrollable Question Tiles Rail (Fixed Height, No Stacking/Crowding) */}
        {showPalette && (
          <div className={`w-full overflow-x-auto whitespace-nowrap scrollbar-thin py-2 px-1.5 flex items-center gap-1.5 border rounded-lg ${theme.border} ${theme.cardBg} touch-pan-x`}>
            {activeSkill === 'writing' ? (
              <div className="flex items-center gap-2 px-1">
                <button
                  onClick={() => {
                    setActiveWritingTask(1);
                    soundManager.playBeep(520, 0.02);
                  }}
                  className={`px-4 py-2 font-mono text-xs font-bold border rounded-md cursor-pointer flex items-center gap-2 ${
                    activeWritingTask === 1
                      ? theme.activeTile
                      : `${theme.cardBg} ${theme.border}`
                  }`}
                >
                  <span>Task 1 (150w)</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums ${task1WordCount >= 150 ? 'bg-emerald-600 text-white' : 'bg-black/15'}`}>
                    {task1WordCount}w
                  </span>
                </button>
                <button
                  onClick={() => {
                    setActiveWritingTask(2);
                    soundManager.playBeep(520, 0.02);
                  }}
                  className={`px-4 py-2 font-mono text-xs font-bold border rounded-md cursor-pointer flex items-center gap-2 ${
                    activeWritingTask === 2
                      ? theme.activeTile
                      : `${theme.cardBg} ${theme.border}`
                  }`}
                >
                  <span>Task 2 (250w)</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums ${task2WordCount >= 250 ? 'bg-emerald-600 text-white' : 'bg-black/15'}`}>
                    {task2WordCount}w
                  </span>
                </button>
              </div>
            ) : (
              skillQuestions.map((q, idx) => {
                const isAnswered = Boolean(userAnswers[q.id]?.trim());
                const isFlagged = flaggedQuestions.has(q.id);
                const isActive = activeQuestionIdx === idx;

                let tileStyle = `${theme.cardBg} border ${theme.border} hover:border-[#0F4C45]`;
                if (isAnswered) tileStyle = `${theme.activeTile} font-bold`;
                if (isFlagged) tileStyle = `${theme.flaggedTile} font-black`;

                const isSectionDivider = idx > 0 && idx % 10 === 0;

                return (
                  <React.Fragment key={q.id}>
                    {/* Subtle Part/Section Boundary Marker */}
                    {isSectionDivider && (
                      <div
                        className={`px-2 py-1 font-mono text-[10px] font-bold tracking-wider shrink-0 border rounded select-none ${theme.border} opacity-80`}
                      >
                        Part {Math.floor(idx / 10) + 1}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setActiveQuestionIdx(idx);
                        if (window.innerWidth < 768) handleSwitchMobilePane('right');
                        soundManager.playBeep(520, 0.02);
                      }}
                      className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center font-mono text-xs sm:text-sm font-bold transition cursor-pointer rounded-md relative tabular-nums ${tileStyle} ${
                        isActive ? 'ring-2 ring-[#F4A62A] ring-offset-1 font-black z-10' : ''
                      }`}
                      title={`Question ${idx + 1} (${isAnswered ? 'Answered' : 'Unanswered'}${isFlagged ? ', Flagged' : ''})`}
                      aria-current={isActive ? 'step' : undefined}
                    >
                      {isFlagged && (
                        <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#D97706]" title="Flagged" />
                      )}
                      {idx + 1}
                    </button>
                  </React.Fragment>
                );
              })
            )}
          </div>
        )}
      </footer>

      {/* ================= 5. HELP, REVIEW & ROUTE GUARD MODALS ================= */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white text-[#0E1F1E] p-6 border border-[#D3DDDA] rounded-2xl max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#D3DDDA] pb-2.5">
              <h2 className="text-base sm:text-lg font-bold uppercase font-mono text-[#0F4C45]">BandSprint Exam Instructions &amp; Shortcuts</h2>
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

              <p className="font-bold">2. Listening Audio Rules:</p>
              <p>Audio tracks play once with no scrubbing, matching timed computer-delivered practice rules (35s pre-read buffer, 60s section check, and 2-minute final check).</p>

              <p className="font-bold">3. Highlighting &amp; Margin Notes:</p>
              <p>Select any text in the reading passage to open the Highlight, Underline, and Note toolbar.</p>
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
                <div>Writing Task 1 Words: {task1WordCount} (Min 150)</div>
                <div>Writing Task 2 Words: {task2WordCount} (Min 250)</div>
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
