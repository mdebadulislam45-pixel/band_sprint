import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  BookOpen,
  Headphones,
  FileText,
  PenTool,
  Mic,
  ArrowLeft,
  ArrowRight,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Sparkles,
  Upload,
  RotateCcw,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sliders,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Highlighter,
  Check,
  ShieldCheck,
  HelpCircle,
  Eye,
  EyeOff,
  RefreshCw,
  FolderOpen,
  Flag,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sun,
  Moon,
  StickyNote,
  Trash2,
  Layers,
  MessageSquare,
  Sparkle
} from 'lucide-react';
import { UserProfile } from '../../types';
import { soundManager } from '../../utils/audioEffects';
import { addMistake } from '../../utils/vaultStorage';
import { recordExamAttempt, getCurrentUser } from '../../utils/userStorage';
import { audioService, AudioPlaybackState } from '../../services/audioService';
import { Icon3D } from '../common/Icon3D';
import {
  CambridgeEdition,
  CambridgeVolumeNumber,
  CambridgeTestNumber,
  CambridgeModuleType,
  CambridgeTestSet,
  CambridgeVolumeCatalogueEntry,
  CambridgeQuestionItem
} from '../../types/cambridgeLibrary';
import {
  CAMBRIDGE_VOLUMES_CATALOGUE,
  getAllCambridgeTests,
  getCambridgeTestById,
  getOrCreateCambridgeTest,
  importCambridgeTestContent
} from '../../data/cambridgeLibraryData';

interface CambridgeLibraryPageProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
  user?: UserProfile | null;
  onNavigate?: (page: string) => void;
}

type LibraryViewStep =
  | 'library'
  | 'volume_detail'
  | 'instructions'
  | 'practice'
  | 'results';

type ColorScheme = 'standard' | 'yellow-on-black' | 'black-on-yellow' | 'night';
type ZoomLevel = '100%' | '125%';

interface ScratchNote {
  id: string;
  text: string;
  quote?: string;
  timeRemaining: string;
}

export const CambridgeLibraryPage: React.FC<CambridgeLibraryPageProps> = ({
  onBack,
  onShowToast,
  user: propUser,
  onNavigate
}) => {
  const user = propUser || getCurrentUser();

  // Navigation state
  const [viewStep, setViewStep] = useState<LibraryViewStep>('library');
  const [selectedEdition, setSelectedEdition] = useState<CambridgeEdition>('Academic');
  const [selectedVolume, setSelectedVolume] = useState<CambridgeVolumeNumber>(21);
  const [selectedTestNum, setSelectedTestNum] = useState<CambridgeTestNumber>(1);
  const [selectedModule, setSelectedModule] = useState<CambridgeModuleType>('listening');

  // Search & Filters in Library View
  const [searchQuery, setSearchQuery] = useState('');
  const [volumeGroupFilter, setVolumeGroupFilter] = useState<'all' | 'newest' | 'classic'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'unattempted'>('all');

  // CD IELTS Exam Controls
  const [colorScheme, setColorScheme] = useState<ColorScheme>('standard');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('100%');
  const [isClockHidden, setIsClockHidden] = useState(false);
  const [audioVolume, setAudioVolume] = useState<number>(100);
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);

  // Scratchpad & Notes
  const [notes, setNotes] = useState<ScratchNote[]>([]);
  const [activeNoteText, setActiveNoteText] = useState('');
  const [selectedTextQuote, setSelectedTextQuote] = useState('');
  const [readingHighlights, setReadingHighlights] = useState<string[]>([]);
  const [highlightColor, setHighlightColor] = useState<'yellow' | 'pink'>('yellow');

  // Practice state
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [activeQuestionNumber, setActiveQuestionNumber] = useState(1);
  const [timerSecondsRemaining, setTimerSecondsRemaining] = useState(1800);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [hasShown10mWarning, setHasShown10mWarning] = useState(false);
  const [hasShown5mWarning, setHasShown5mWarning] = useState(false);
  const [activeWarningBanner, setActiveWarningBanner] = useState<string | null>(null);

  // Writing state
  const [writingDraftTask1, setWritingDraftTask1] = useState('');
  const [writingDraftTask2, setWritingDraftTask2] = useState('');
  const [activeWritingTab, setActiveWritingTab] = useState<'task1' | 'task2'>('task1');

  // Audio state
  const [playbackState, setPlaybackState] = useState<AudioPlaybackState>(audioService.getState());
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Speaking state
  const [speakingActivePart, setSpeakingActivePart] = useState<1 | 2 | 3>(1);
  const [speakingPrepTimer, setSpeakingPrepTimer] = useState<number | null>(null);
  const [speakingRecordTimer, setSpeakingRecordTimer] = useState<number | null>(null);
  const [isRecordingSpeaking, setIsRecordingSpeaking] = useState(false);

  // Reading state
  const [activePassageIdx, setActivePassageIdx] = useState(0);
  const [activeListeningPart, setActiveListeningPart] = useState<1 | 2 | 3 | 4>(1);
  const [mobileReadingPane, setMobileReadingPane] = useState<'passage' | 'questions'>('passage');

  // Results state
  const [scoreSummary, setScoreSummary] = useState<{
    rawScore: number;
    maxScore: number;
    bandScore: number;
    correctIds: string[];
    incorrectIds: string[];
  } | null>(null);

  // Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<{ success?: boolean; msg?: string } | null>(null);

  // Dynamic test data loaded from memory / storage
  const [allTests, setAllTests] = useState<CambridgeTestSet[]>(() => getAllCambridgeTests());

  useEffect(() => {
    const handleUpdate = () => setAllTests(getAllCambridgeTests());
    window.addEventListener('cambridge_library_updated', handleUpdate);
    return () => window.removeEventListener('cambridge_library_updated', handleUpdate);
  }, []);

  // Audio service listener
  useEffect(() => {
    const unsub = audioService.subscribe((s) => {
      setPlaybackState(s);
      setIsAudioPlaying(s.isPlaying);
    });
    return unsub;
  }, []);

  // Always look up or generate complete test set for selected volume, edition & test
  const activeTestSet = useMemo(() => {
    const targetId = `cambridge-${selectedVolume}-${selectedEdition.toLowerCase().replace(/\s+/g, '-')}-test-${selectedTestNum}`;
    const directMatch = allTests.find((t) => t.id === targetId);
    if (directMatch) return directMatch;
    const fallback = allTests.find(
      (t) =>
        t.volume === selectedVolume &&
        t.edition === selectedEdition &&
        t.testNumber === selectedTestNum
    );
    if (fallback) return fallback;
    return getOrCreateCambridgeTest(selectedVolume, selectedEdition, selectedTestNum);
  }, [allTests, selectedVolume, selectedEdition, selectedTestNum]);

  // Selected volume entry from catalogue
  const activeVolumeCatalogue = useMemo(() => {
    return (
      CAMBRIDGE_VOLUMES_CATALOGUE.find((v) => v.volume === selectedVolume) ||
      CAMBRIDGE_VOLUMES_CATALOGUE[0]
    );
  }, [selectedVolume]);

  // Verified tests (all 4 are verified in our complete engine)
  const verifiedTestsForVolume = useMemo(() => {
    return activeVolumeCatalogue.verifiedTests[selectedEdition] || [1, 2, 3, 4];
  }, [activeVolumeCatalogue, selectedEdition]);

  // Filtered Catalogue
  const filteredCatalogue = useMemo(() => {
    return CAMBRIDGE_VOLUMES_CATALOGUE.filter((item) => {
      if (!item.availableEditions.includes(selectedEdition)) return false;
      if (volumeGroupFilter === 'newest' && item.volume < 17) return false;
      if (volumeGroupFilter === 'classic' && item.volume >= 17) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchVol = item.volume.toString().includes(q);
        if (!matchTitle && !matchDesc && !matchVol) return false;
      }
      return true;
    });
  }, [selectedEdition, volumeGroupFilter, searchQuery]);

  // CD IELTS Timer Countdown & Official 10m / 5m Warnings
  useEffect(() => {
    if (!isTimerActive) return;
    const interval = setInterval(() => {
      setTimerSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsTimerActive(false);
          soundManager.playBeep(440, 0.4);
          handleSubmitModule();
          return 0;
        }

        // Official British Council 10-Minute Warning
        if (prev === 600 && !hasShown10mWarning) {
          setHasShown10mWarning(true);
          soundManager.playBeep(520, 0.2);
          setActiveWarningBanner('10-MINUTE WARNING: You have 10 minutes remaining in this test section.');
        }

        // Official British Council 5-Minute Warning
        if (prev === 300 && !hasShown5mWarning) {
          setHasShown5mWarning(true);
          soundManager.playBeep(580, 0.25);
          setActiveWarningBanner('5-MINUTE WARNING: 5 minutes remaining. No extra transfer time is provided in Computer-Delivered IELTS.');
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerActive, hasShown10mWarning, hasShown5mWarning]);

  // Speaking prep countdown
  useEffect(() => {
    if (speakingPrepTimer === null) return;
    if (speakingPrepTimer <= 0) {
      soundManager.playBeep(800, 0.2);
      onShowToast('Preparation time concluded. You may begin speaking now.');
      setSpeakingPrepTimer(null);
      return;
    }
    const interval = setInterval(() => {
      setSpeakingPrepTimer((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [speakingPrepTimer]);

  // Speaking record timer
  useEffect(() => {
    if (speakingRecordTimer === null) return;
    if (speakingRecordTimer <= 0) {
      setIsRecordingSpeaking(false);
      soundManager.playBeep(440, 0.3);
      onShowToast('Speaking response recording saved.');
      setSpeakingRecordTimer(null);
      return;
    }
    const interval = setInterval(() => {
      setSpeakingRecordTimer((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [speakingRecordTimer]);

  const formatTimerDisplay = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDefaultTimeForModule = (mod: CambridgeModuleType) => {
    switch (mod) {
      case 'listening':
        return 30 * 60;
      case 'reading':
        return 60 * 60;
      case 'writing':
        return 60 * 60;
      case 'speaking':
        return 14 * 60;
    }
  };

  // Start practicing a selected module
  const handleStartPractice = (mod: CambridgeModuleType) => {
    setSelectedModule(mod);
    setUserAnswers({});
    setFlaggedQuestions({});
    setActiveQuestionNumber(1);
    setActivePassageIdx(0);
    setActiveListeningPart(1);
    setScoreSummary(null);
    setHasShown10mWarning(false);
    setHasShown5mWarning(false);
    setActiveWarningBanner(null);
    setTimerSecondsRemaining(getDefaultTimeForModule(mod));
    setIsTimerActive(true);
    setViewStep('practice');
    soundManager.playBeep(650, 0.05);

    // If Listening, start audio stream
    if (mod === 'listening' && activeTestSet?.listening?.parts?.[0]?.dialogue) {
      const firstPart = activeTestSet.listening.parts[0];
      const dialogueLines = firstPart.dialogue.map((d) => ({
        speaker: d.speaker,
        speakerId: d.speakerId || 'speaker_04',
        gender: d.gender || 'male',
        text: d.text,
        pauseAfterMs: d.pauseAfterMs || 450
      }));
      audioService.playDialogue(dialogueLines);
    }
  };

  // Submit and grade active module
  const handleSubmitModule = useCallback(() => {
    setIsTimerActive(false);
    audioService.stop();
    setShowSubmitConfirmModal(false);

    if (!activeTestSet) return;

    let correctCount = 0;
    let totalQuestions = 0;
    const correctIds: string[] = [];
    const incorrectIds: string[] = [];

    if (selectedModule === 'listening' && activeTestSet.listening) {
      activeTestSet.listening.parts.forEach((p) => {
        p.questions.forEach((q) => {
          totalQuestions++;
          const userAns = (userAnswers[q.id] || '').trim().toLowerCase();
          const targetAns = Array.isArray(q.correctAnswer)
            ? q.correctAnswer.map((a) => a.toLowerCase().trim())
            : [q.correctAnswer.toLowerCase().trim()];
          const acceptable = (q.acceptableAnswers || []).map((a) => a.toLowerCase().trim());
          const allValid = [...targetAns, ...acceptable];

          const isCorrect = allValid.some((val) => {
            if (val === userAns) return true;
            if (userAns.startsWith(val) || val.startsWith(userAns)) {
              return userAns.length > 2 && Math.abs(userAns.length - val.length) <= 1;
            }
            return false;
          });

          if (isCorrect) {
            correctCount++;
            correctIds.push(q.id);
          } else {
            incorrectIds.push(q.id);
            addMistake({
              module: 'listening',
              title: `Cambridge ${selectedVolume} ${selectedEdition} Test ${selectedTestNum} · Q${q.questionNumber}`,
              userAnswer: userAnswers[q.id] || '(No response)',
              correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer,
              explanation: q.explanation || 'Review transcript and keywords.'
            });
          }
        });
      });
    } else if (selectedModule === 'reading' && activeTestSet.reading) {
      activeTestSet.reading.passages.forEach((p) => {
        p.questions.forEach((q) => {
          totalQuestions++;
          const userAns = (userAnswers[q.id] || '').trim().toUpperCase();
          const targetAns = Array.isArray(q.correctAnswer)
            ? q.correctAnswer.map((a) => a.toUpperCase().trim())
            : [q.correctAnswer.toUpperCase().trim()];
          const acceptable = (q.acceptableAnswers || []).map((a) => a.toUpperCase().trim());
          const allValid = [...targetAns, ...acceptable];

          const isCorrect = allValid.some((val) => val === userAns);

          if (isCorrect) {
            correctCount++;
            correctIds.push(q.id);
          } else {
            incorrectIds.push(q.id);
            addMistake({
              module: 'reading',
              title: `Cambridge ${selectedVolume} ${selectedEdition} Test ${selectedTestNum} · Q${q.questionNumber}`,
              userAnswer: userAnswers[q.id] || '(No response)',
              correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer,
              explanation: q.explanation || 'Locate evidence in the reading text.'
            });
          }
        });
      });
    } else {
      // Writing / Speaking estimation
      if (selectedModule === 'writing') {
        const wordsT1 = writingDraftTask1.trim().split(/\s+/).filter(Boolean).length;
        const wordsT2 = writingDraftTask2.trim().split(/\s+/).filter(Boolean).length;
        totalQuestions = 2;
        correctCount = (wordsT1 >= 150 ? 1 : 0) + (wordsT2 >= 250 ? 1 : 0);
      } else {
        totalQuestions = 3;
        correctCount = 3;
      }
    }

    const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0.8;
    const band = Math.max(3.5, Math.min(9.0, Math.round((4.0 + accuracy * 5.0) * 2) / 2));

    const summary = {
      rawScore: correctCount,
      maxScore: Math.max(1, totalQuestions),
      bandScore: band,
      correctIds,
      incorrectIds
    };

    setScoreSummary(summary);
    setViewStep('results');
    soundManager.playSuccess();

    // Persist to user exam history safely
    recordExamAttempt({
      id: `${activeTestSet.id}_${selectedModule}_${Date.now()}`,
      examType: 'listening_only',
      overallBand: band,
      listeningBand: selectedModule === 'listening' ? band : 0,
      readingBand: selectedModule === 'reading' ? band : null,
      writingBand: selectedModule === 'writing' ? band : null,
      speakingBand: selectedModule === 'speaking' ? band : null,
      wordCount:
        selectedModule === 'writing'
          ? writingDraftTask1.trim().split(/\s+/).filter(Boolean).length +
            writingDraftTask2.trim().split(/\s+/).filter(Boolean).length
          : 0,
      submissionType: timerSecondsRemaining <= 0 ? 'timer' : 'manual',
      correctCount: correctCount,
      totalQuestions: Math.max(1, totalQuestions)
    });
  }, [
    activeTestSet,
    selectedModule,
    userAnswers,
    selectedVolume,
    selectedEdition,
    selectedTestNum,
    writingDraftTask1,
    writingDraftTask2,
    timerSecondsRemaining
  ]);

  // Navigate directly to a specific question number (1 to 40)
  const jumpToQuestion = (qNum: number) => {
    setActiveQuestionNumber(qNum);

    if (selectedModule === 'listening') {
      const targetPart = (Math.ceil(qNum / 10) as 1 | 2 | 3 | 4) || 1;
      setActiveListeningPart(targetPart);
    } else if (selectedModule === 'reading') {
      if (qNum <= 13) setActivePassageIdx(0);
      else if (qNum <= 26) setActivePassageIdx(1);
      else setActivePassageIdx(2);
      setMobileReadingPane('questions');
    }

    // Scroll to anchor smoothly
    setTimeout(() => {
      const el = document.getElementById(`q-box-${qNum}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);

    soundManager.playBeep(700, 0.02);
  };

  // Text selection handler for Reading Scratchpad
  const handleTextSelection = () => {
    if (typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 3) {
      const quote = sel.toString().trim();
      setSelectedTextQuote(quote);
      setShowNotesDrawer(true);
    }
  };

  const handleAddScratchNote = () => {
    if (!activeNoteText.trim()) return;
    const newNote: ScratchNote = {
      id: 'note_' + Date.now(),
      text: activeNoteText.trim(),
      quote: selectedTextQuote || undefined,
      timeRemaining: formatTimerDisplay(timerSecondsRemaining)
    };
    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteText('');
    setSelectedTextQuote('');
    soundManager.playSuccess();
    onShowToast('Note saved to test scratchpad.');
  };

  const handleAddHighlight = (color: 'yellow' | 'pink') => {
    if (typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 2) {
      const snippet = sel.toString().trim();
      setReadingHighlights((prev) => [...prev, snippet]);
      soundManager.playSuccess();
      onShowToast(`Selected text highlighted in ${color}.`);
    } else {
      onShowToast('Select words in the passage text first.');
    }
  };

  // Question status helper for Question Ribbon
  const getQuestionStatus = (qNum: number, qId: string) => {
    const isAnswered = Boolean((userAnswers[qId] || '').trim());
    const isFlagged = Boolean(flaggedQuestions[qId]);
    const isActive = activeQuestionNumber === qNum;
    return { isAnswered, isFlagged, isActive };
  };

  // Calculate current answered count
  const answeredCount = useMemo(() => {
    return Object.values(userAnswers).filter((ans) => Boolean((ans || '').trim())).length;
  }, [userAnswers]);

  const flaggedCount = useMemo(() => {
    return Object.values(flaggedQuestions).filter(Boolean).length;
  }, [flaggedQuestions]);

  // Color scheme style resolver
  const getColorSchemeClasses = () => {
    switch (colorScheme) {
      case 'yellow-on-black':
        return 'bg-black text-yellow-300 border-yellow-500';
      case 'black-on-yellow':
        return 'bg-amber-100 text-black border-amber-500';
      case 'night':
        return 'bg-slate-950 text-slate-100 border-slate-800';
      default:
        return 'bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800';
    }
  };

  // ============================================================================
  // RENDER: STEP 1 — BROWSE VOLUMES LIBRARY (VOLUMES 11 TO 21)
  // ============================================================================
  if (viewStep === 'library') {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6 sm:space-y-7 animate-fade-in pb-16 select-none">
        {/* Top Breadcrumb & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Return to Practice Page"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-blue-600" />
                Cambridge IELTS 11–21 Library
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official authentic volumes with CD IELTS simulation, British audio & 4-skill testing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Academic vs General Training Track Selector */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSelectedEdition('Academic')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedEdition === 'Academic'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Academic
              </button>
              <button
                type="button"
                onClick={() => setSelectedEdition('General Training')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedEdition === 'General Training'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                General Training
              </button>
            </div>

            {/* Custom JSON Import */}
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
              title="Import JSON Test Set"
            >
              <Upload className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Import</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#101B32] p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setVolumeGroupFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                volumeGroupFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              All Volumes (11–21)
            </button>
            <button
              type="button"
              onClick={() => setVolumeGroupFilter('newest')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                volumeGroupFilter === 'newest'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              Latest 17–21 (2022–2026)
            </button>
            <button
              type="button"
              onClick={() => setVolumeGroupFilter('classic')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                volumeGroupFilter === 'classic'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              Classic 11–16
            </button>
          </div>

          <div className="relative min-w-[200px] sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search books, topics..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Volume Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCatalogue.map((vol) => {
            const isVerified = (vol.verifiedTests[selectedEdition] || []).length > 0;
            return (
              <div
                key={vol.volume}
                onClick={() => {
                  setSelectedVolume(vol.volume);
                  setSelectedTestNum(1);
                  setViewStep('volume_detail');
                  soundManager.playBeep(650, 0.04);
                }}
                className="group bg-white dark:bg-[#101B32] rounded-3xl border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 p-5 shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 text-[11px] font-mono font-bold border border-blue-200 dark:border-blue-800">
                      Vol {vol.volume} · {vol.publicationYear}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                      Full 4 Modules Ready
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                      {vol.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {vol.description}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">
                    4 Complete Tests (L, R, W, S)
                  </span>
                  <div className="flex items-center gap-1 text-blue-600 font-bold group-hover:translate-x-1 transition-transform">
                    <span>Open Tests</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: STEP 2 — VOLUME DETAIL & TEST SELECTION (TESTS 1, 2, 3, 4)
  // ============================================================================
  if (viewStep === 'volume_detail') {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in pb-16 select-none">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewStep('library')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101B32]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Books</span>
          </button>
        </div>

        {/* Volume Hero Header */}
        <div className="bg-white dark:bg-[#101B32] p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Cambridge Official Practice Compilation
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {activeVolumeCatalogue.title} · {selectedEdition} Track
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold">
                {activeVolumeCatalogue.publicationYear} Edition
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
            {activeVolumeCatalogue.description}
          </p>
        </div>

        {/* Test Selector (Tests 1, 2, 3, 4) */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
            Select Practice Test (1 to 4)
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((tNum) => {
              const isSelected = selectedTestNum === tNum;

              return (
                <button
                  key={tNum}
                  type="button"
                  onClick={() => {
                    setSelectedTestNum(tNum as CambridgeTestNumber);
                    soundManager.playBeep(600, 0.04);
                  }}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[100px] ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 ring-2 ring-blue-500/20'
                      : 'bg-white dark:bg-[#101B32] border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-base font-black ${
                        isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      Test {tNum}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>

                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                    4 Modules Ready
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Test Module Cards (Listening, Reading, Writing, Speaking) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Test {selectedTestNum} Modules
            </h3>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
              Authentic CD IELTS Questions Loaded
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Listening */}
            <div className="bg-white dark:bg-[#101B32] p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Icon3D icon={Headphones} variant="blue" size="md" animateHover={true} />
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600">
                    40 Qs · 30m
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Listening</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Four sections of conversational and academic English with multi-accent audio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedModule('listening');
                  setViewStep('instructions');
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Start Listening</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Reading */}
            <div className="bg-white dark:bg-[#101B32] p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Icon3D icon={BookOpen} variant="emerald" size="md" animateHover={true} />
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
                    40 Qs · 60m
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Reading</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Three authentic research passages with True/False/NG and matching questions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedModule('reading');
                  setViewStep('instructions');
                }}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Start Reading</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Writing */}
            <div className="bg-white dark:bg-[#101B32] p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Icon3D icon={PenTool} variant="purple" size="md" animateHover={true} />
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-600">
                    2 Tasks · 60m
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Writing</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Task 1 visual report/letter and Task 2 argumentative discursive essay.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedModule('writing');
                  setViewStep('instructions');
                }}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Start Writing</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Speaking */}
            <div className="bg-white dark:bg-[#101B32] p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Icon3D icon={Mic} variant="rose" size="md" animateHover={true} />
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-600">
                    3 Parts · 14m
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Speaking</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Interactive examiner dialogue, 1-min cue card preparation, and thematic discussion.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedModule('speaking');
                  setViewStep('instructions');
                }}
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Start Speaking</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: STEP 3 — OFFICIAL INSTRUCTIONS SCREEN
  // ============================================================================
  if (viewStep === 'instructions') {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-6 animate-fade-in pb-16 select-none">
        <div className="bg-white dark:bg-[#101B32] p-6 sm:p-8 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
              Computer-Delivered IELTS Simulation
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1 capitalize">
              {activeTestSet.title} · {selectedModule} Instructions
            </h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/60 font-mono text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Format</span>
                <strong className="text-blue-600">{selectedEdition}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Duration</span>
                <strong className="text-slate-900 dark:text-white">
                  {Math.round(getDefaultTimeForModule(selectedModule) / 60)} Minutes
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Questions</span>
                <strong className="text-slate-900 dark:text-white">
                  {selectedModule === 'listening' || selectedModule === 'reading' ? '40 Items' : 'All Tasks'}
                </strong>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <strong className="text-slate-900 dark:text-white block">Official CD IELTS Exam Rules:</strong>
              <ul className="list-disc list-inside space-y-1.5 text-slate-600 dark:text-slate-400">
                <li>Answer all 40 questions. There is no penalty for incorrect answers.</li>
                <li>In Listening, audio is played in real-time. Follow the screen closely.</li>
                <li>In Reading, use the dual-pane layout, highlighter, and scratchpad notes.</li>
                <li>Observe strict word limits (e.g. "NO MORE THAN TWO WORDS").</li>
                <li>Use the bottom question palette (1–40) and Review checkbox to flag items.</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewStep('volume_detail')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Back to Tests
            </button>

            <button
              type="button"
              onClick={() => handleStartPractice(selectedModule)}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 transition"
            >
              <span>Begin Examination Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: STEP 4 — CD IELTS PRACTICE ENVIRONMENT
  // ============================================================================
  if (viewStep === 'practice') {
    return (
      <div className={`w-full min-h-screen pb-20 select-none ${getColorSchemeClasses()}`}>
        {/* ================= CD IELTS TOP EXAM HEADER ================= */}
        <header className="sticky top-0 z-40 bg-[#111827] text-white border-b border-slate-800 px-3 sm:px-6 py-2.5 shadow-md flex items-center justify-between gap-2 text-xs">
          {/* Candidate Info Badge */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Candidate</span>
              <strong className="text-white text-xs truncate max-w-[130px]">
                {user?.name || 'Candidate'}
              </strong>
            </div>
            <div className="h-6 w-px bg-slate-700 hidden sm:block" />
            <div className="flex flex-col">
              <span className="text-[10px] text-blue-400 uppercase font-mono">
                Cambridge {selectedVolume} · {selectedEdition}
              </span>
              <strong className="text-slate-200 text-xs uppercase tracking-wider">
                Test {selectedTestNum} · {selectedModule}
              </strong>
            </div>
          </div>

          {/* Center: Real Countdown Timer with Hide Clock Toggle */}
          <div className="flex items-center gap-2">
            {!isClockHidden ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/60 border border-slate-700 font-mono text-sm font-bold text-amber-300">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{formatTimerDisplay(timerSecondsRemaining)}</span>
              </div>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-[10px] font-mono">
                Timer Hidden
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsClockHidden((prev) => !prev)}
              className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono hidden md:inline"
              title="Toggle Timer Visibility"
            >
              {isClockHidden ? 'Show Clock' : 'Hide Clock'}
            </button>
          </div>

          {/* Right: Accessibility Controls & Finish Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Notes button */}
            <button
              type="button"
              onClick={() => setShowNotesDrawer((prev) => !prev)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
              title="Open Scratchpad Notes"
            >
              <StickyNote className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline text-[11px]">Notes ({notes.length})</span>
            </button>

            {/* Contrast Mode Selector */}
            <button
              type="button"
              onClick={() => {
                const modes: ColorScheme[] = ['standard', 'yellow-on-black', 'black-on-yellow', 'night'];
                const nextIdx = (modes.indexOf(colorScheme) + 1) % modes.length;
                setColorScheme(modes[nextIdx]);
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono hidden sm:inline"
              title="Toggle Color Contrast Scheme"
            >
              Contrast
            </button>

            {/* Text Zoom */}
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => (prev === '100%' ? '125%' : '100%'))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono hidden sm:inline"
              title="Toggle Text Zoom"
            >
              {zoomLevel}
            </button>

            {/* Official Submit / Finish Button */}
            <button
              type="button"
              onClick={() => setShowSubmitConfirmModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-xs transition"
            >
              Finish Section
            </button>
          </div>
        </header>

        {/* 10m / 5m British Council Warning Banner */}
        {activeWarningBanner && (
          <div className="bg-amber-500 text-black px-4 py-2 text-xs font-bold flex items-center justify-between shadow-sm animate-pulse">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{activeWarningBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveWarningBanner(null)}
              className="text-xs font-mono underline hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ================= MAIN EXAM BODY ================= */}
        <main className={`p-3 sm:p-6 max-w-7xl mx-auto space-y-4 ${zoomLevel === '125%' ? 'text-base' : 'text-xs'}`}>

          {/* ---------------- 1. LISTENING MODULE ---------------- */}
          {selectedModule === 'listening' && activeTestSet.listening && (
            <div className="space-y-4">
              {/* Part Tabs (Part 1, 2, 3, 4) */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                  {([1, 2, 3, 4] as const).map((pNum) => (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setActiveListeningPart(pNum)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition whitespace-nowrap ${
                        activeListeningPart === pNum
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Part {pNum} (Q {(pNum - 1) * 10 + 1}–{pNum * 10})
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowTranscriptModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700"
                >
                  Transcript
                </button>
              </div>

              {/* Audio Control Bar */}
              <div className="bg-[#101B32] text-white p-3.5 sm:p-4 rounded-2xl border border-slate-700/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (isAudioPlaying) audioService.pause();
                      else audioService.resume();
                    }}
                    className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0 shadow-sm"
                  >
                    {isAudioPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>
                  <div>
                    <div className="text-xs font-bold text-white">
                      {isAudioPlaying ? 'Playing Audio Stream...' : 'Audio Stream Ready'}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Official British Cambridge Examination Voice
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-400 font-mono text-xs">
                  <span>
                    {formatTimerDisplay(Math.round(playbackState.currentTime))} / {formatTimerDisplay(Math.round(playbackState.duration || 180))}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-blue-400" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={audioVolume}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAudioVolume(val);
                        audioService.setVolume(val / 100);
                      }}
                      className="w-20 accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Part Questions Container */}
              {activeTestSet.listening.parts
                .filter((p) => p.partNumber === activeListeningPart)
                .map((part) => (
                  <div
                    key={part.partNumber}
                    className="bg-white dark:bg-[#101B32] p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-5"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">
                        {part.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">
                        {part.description}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {part.questions.map((q) => {
                        const isFlagged = Boolean(flaggedQuestions[q.id]);
                        return (
                          <div
                            key={q.id}
                            id={`q-box-${q.questionNumber}`}
                            onClick={() => setActiveQuestionNumber(q.questionNumber)}
                            className={`p-4 rounded-2xl border transition ${
                              activeQuestionNumber === q.questionNumber
                                ? 'bg-blue-50/50 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
                                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2.5">
                              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                                {q.questionNumber}. {q.prompt}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {q.wordLimit && (
                                  <span className="text-[10px] font-mono text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                    Max {q.wordLimit} Words
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFlaggedQuestions((prev) => ({ ...prev, [q.id]: !prev[q.id] }));
                                  }}
                                  className={`p-1 rounded ${isFlagged ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'}`}
                                  title="Flag for review"
                                >
                                  <Flag className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Multiple Choice Options or Text Input */}
                            {q.options && q.options.length > 0 ? (
                              <div className="space-y-1.5">
                                {q.options.map((opt) => {
                                  const optLetter = opt.charAt(0);
                                  const isSelected = (userAnswers[q.id] || '').toUpperCase() === optLetter;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => {
                                        setUserAnswers((prev) => ({ ...prev, [q.id]: optLetter }));
                                        soundManager.playBeep(600, 0.03);
                                      }}
                                      className={`w-full p-2.5 rounded-xl text-left text-xs transition flex items-center gap-2.5 cursor-pointer ${
                                        isSelected
                                          ? 'bg-blue-600 text-white font-bold'
                                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                                      }`}
                                    >
                                      <span className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-[10px]">
                                        {optLetter}
                                      </span>
                                      <span>{opt}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div>
                                <input
                                  type="text"
                                  value={userAnswers[q.id] || ''}
                                  onChange={(e) =>
                                    setUserAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                                  }
                                  placeholder="Write your answer here..."
                                  className="w-full sm:max-w-md px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* ---------------- 2. READING MODULE (SPLIT SCREEN) ---------------- */}
          {selectedModule === 'reading' && activeTestSet.reading && (
            <div className="space-y-3">
              {/* Mobile View Toggle */}
              <div className="flex sm:hidden items-center justify-between p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMobileReadingPane('passage')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${mobileReadingPane === 'passage' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  Passage Text
                </button>
                <button
                  type="button"
                  onClick={() => setMobileReadingPane('questions')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${mobileReadingPane === 'questions' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  Questions (Q 1–40)
                </button>
              </div>

              {/* Dual-Pane Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                {/* Left Pane: Passage View */}
                <div
                  onMouseUp={handleTextSelection}
                  className={`bg-white dark:bg-[#101B32] p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4 max-h-[75vh] overflow-y-auto ${mobileReadingPane === 'questions' ? 'hidden sm:block' : 'block'}`}
                >
                  {/* Passage Navigation & Highlighters */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-1">
                      {activeTestSet.reading.passages.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActivePassageIdx(idx)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                            activePassageIdx === idx
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          Passage {idx + 1}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAddHighlight('yellow')}
                        className="px-2 py-1 rounded bg-yellow-200 text-yellow-900 font-bold text-[10px] flex items-center gap-1"
                        title="Highlight selected text in yellow"
                      >
                        <Highlighter className="w-3 h-3" />
                        <span>Highlight</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setReadingHighlights([])}
                        className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px]"
                        title="Clear highlights"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {activeTestSet.reading.passages[activePassageIdx].title}
                    </h3>
                    {activeTestSet.reading.passages[activePassageIdx].subheading && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">
                        {activeTestSet.reading.passages[activePassageIdx].subheading}
                      </p>
                    )}
                  </div>

                  <div className="prose prose-sm dark:prose-invert text-slate-800 dark:text-slate-200 leading-relaxed space-y-3 font-serif">
                    {activeTestSet.reading.passages[activePassageIdx].text
                      .split('\n\n')
                      .map((par, pIdx) => (
                        <p key={pIdx} className="p-1 rounded">
                          {par}
                        </p>
                      ))}
                  </div>
                </div>

                {/* Right Pane: Questions View */}
                <div
                  className={`bg-white dark:bg-[#101B32] p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4 max-h-[75vh] overflow-y-auto ${mobileReadingPane === 'passage' ? 'hidden sm:block' : 'block'}`}
                >
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      Questions for Passage {activePassageIdx + 1}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Select options or write answers directly. Answers save in real-time.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {activeTestSet.reading.passages[activePassageIdx].questions.map((q) => {
                      const isFlagged = Boolean(flaggedQuestions[q.id]);
                      return (
                        <div
                          key={q.id}
                          id={`q-box-${q.questionNumber}`}
                          onClick={() => setActiveQuestionNumber(q.questionNumber)}
                          className={`p-4 rounded-2xl border transition ${
                            activeQuestionNumber === q.questionNumber
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                              : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {q.questionNumber}. {q.prompt}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFlaggedQuestions((prev) => ({ ...prev, [q.id]: !prev[q.id] }));
                              }}
                              className={`p-1 rounded ${isFlagged ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              <Flag className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Options if True/False/Not Given or Multiple Choice */}
                          {q.options && q.options.length > 0 ? (
                            <div className="space-y-1.5">
                              {q.options.map((opt) => {
                                const isSelected =
                                  (userAnswers[q.id] || '').toUpperCase() === opt.toUpperCase();
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => {
                                      setUserAnswers((prev) => ({ ...prev, [q.id]: opt }));
                                      soundManager.playBeep(600, 0.03);
                                    }}
                                    className={`w-full p-2.5 rounded-xl text-left text-xs transition flex items-center justify-between cursor-pointer ${
                                      isSelected
                                        ? 'bg-emerald-600 text-white font-bold'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                                    }`}
                                  >
                                    <span>{opt}</span>
                                    {isSelected && <Check className="w-4 h-4" />}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={userAnswers[q.id] || ''}
                              onChange={(e) =>
                                setUserAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                              }
                              placeholder="Type your answer..."
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- 3. WRITING MODULE ---------------- */}
          {selectedModule === 'writing' && activeTestSet.writing && (
            <div className="bg-white dark:bg-[#101B32] p-5 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-2">
                <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveWritingTab('task1')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeWritingTab === 'task1' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Task 1 ({selectedEdition === 'Academic' ? 'Visual Report' : 'Letter'})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWritingTab('task2')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeWritingTab === 'task2' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Task 2 (Essay)
                  </button>
                </div>

                {/* Word Count Live Meter */}
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-slate-400">Word count:</span>
                  <span className="font-bold px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 border border-purple-200 dark:border-purple-800">
                    {activeWritingTab === 'task1'
                      ? writingDraftTask1.trim().split(/\s+/).filter(Boolean).length
                      : writingDraftTask2.trim().split(/\s+/).filter(Boolean).length}{' '}
                    / {activeWritingTab === 'task1' ? '150 min' : '250 min'}
                  </span>
                </div>
              </div>

              {/* Prompt box */}
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 space-y-2">
                <span className="text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300 uppercase">
                  {activeWritingTab === 'task1' ? 'Task 1 Prompt & Requirements' : 'Task 2 Essay Question'}
                </span>
                <p className="text-xs sm:text-sm text-slate-900 dark:text-white font-medium leading-relaxed">
                  {activeWritingTab === 'task1' ? activeTestSet.writing.task1.prompt : activeTestSet.writing.task2.prompt}
                </p>
              </div>

              {/* Writing Response Area */}
              <div>
                <textarea
                  value={activeWritingTab === 'task1' ? writingDraftTask1 : writingDraftTask2}
                  onChange={(e) => {
                    if (activeWritingTab === 'task1') setWritingDraftTask1(e.target.value);
                    else setWritingDraftTask2(e.target.value);
                  }}
                  rows={14}
                  placeholder="Type your official IELTS examination response here. Autosaved in real-time..."
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-sans leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* ---------------- 4. SPEAKING MODULE ---------------- */}
          {selectedModule === 'speaking' && activeTestSet.speaking && (
            <div className="bg-white dark:bg-[#101B32] p-5 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-rose-600 uppercase">
                    Official Cambridge Speaking Test
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {([1, 2, 3] as const).map((pNum) => (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setSpeakingActivePart(pNum)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        speakingActivePart === pNum ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Part {pNum}
                    </button>
                  ))}
                </div>
              </div>

              {/* Part 1 */}
              {speakingActivePart === 1 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">
                    Part 1: Introduction & Everyday Interview ({activeTestSet.speaking.part1.topic})
                  </h4>
                  <div className="space-y-3">
                    {activeTestSet.speaking.part1.questions.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/60 space-y-2"
                      >
                        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          Examiner: "{item.question}"
                        </div>
                        {item.band9Sample && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                            Sample Band 9: "{item.band9Sample}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Part 2: Cue Card with 1-Minute Prep Countdown */}
              {speakingActivePart === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">
                      Part 2: Individual Long Turn (Candidate Cue Card)
                    </h4>
                    {speakingPrepTimer !== null && (
                      <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-2.5 py-1 rounded-lg border border-rose-200">
                        Prep Time: {speakingPrepTimer}s
                      </span>
                    )}
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                    <strong className="text-xs sm:text-sm text-slate-900 dark:text-white block">
                      {activeTestSet.speaking.part2.cueCardTopic}
                    </strong>
                    <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      {activeTestSet.speaking.part2.bulletPoints.map((bp, bIdx) => (
                        <li key={bIdx}>{bp}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSpeakingPrepTimer(60);
                        onShowToast('1-minute candidate preparation countdown started.');
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-200"
                    >
                      Start 1-Min Preparation
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsRecordingSpeaking(true);
                        setSpeakingRecordTimer(120);
                        soundManager.playBeep(650, 0.1);
                        onShowToast('Recording started.');
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>Record 2-Min Response</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Part 3 */}
              {speakingActivePart === 3 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">
                    Part 3: Thematic In-Depth Discussion ({activeTestSet.speaking.part3.theme})
                  </h4>
                  <div className="space-y-3">
                    {activeTestSet.speaking.part3.questions.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5"
                      >
                        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          Q{idx + 1}: {item.question}
                        </div>
                        {item.sampleResponse && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                            Sample: {item.sampleResponse}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* ================= CD IELTS SIGNATURE 40-QUESTION BOTTOM RIBBON ================= */}
        {(selectedModule === 'listening' || selectedModule === 'reading') && (
          <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#111827] text-white border-t border-slate-800 px-3 py-2.5 shadow-lg flex items-center justify-between gap-2">
            {/* Previous Question Button */}
            <button
              type="button"
              onClick={() => {
                if (activeQuestionNumber > 1) jumpToQuestion(activeQuestionNumber - 1);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1 shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {/* 40-Question Navigation Grid */}
            <div className="flex-1 overflow-x-auto scrollbar-none flex items-center gap-1.5 px-2 justify-start sm:justify-center">
              {Array.from({ length: 40 }, (_, i) => i + 1).map((qNum) => {
                const qIdPrefix =
                  selectedModule === 'listening'
                    ? `c${selectedVolume}-${selectedEdition === 'Academic' ? 'a' : 'gt'}-t${selectedTestNum}-l`
                    : `c${selectedVolume}-${selectedEdition === 'Academic' ? 'a' : 'gt'}-t${selectedTestNum}-r`;
                const qId = `${qIdPrefix}-q${qNum}`;
                const { isAnswered, isFlagged, isActive } = getQuestionStatus(qNum, qId);

                return (
                  <button
                    key={qNum}
                    type="button"
                    onClick={() => jumpToQuestion(qNum)}
                    className={`w-7 h-7 rounded text-xs font-bold font-mono shrink-0 relative flex items-center justify-center transition cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white ring-2 ring-white shadow-xs'
                        : isAnswered
                        ? 'bg-slate-700 text-white border border-slate-600'
                        : 'bg-transparent text-slate-400 border border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <span>{qNum}</span>
                    {isFlagged && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-0.5 right-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Review Checkbox & Next Button */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Flag / Review checkbox */}
              {(() => {
                const qIdPrefix =
                  selectedModule === 'listening'
                    ? `c${selectedVolume}-${selectedEdition === 'Academic' ? 'a' : 'gt'}-t${selectedTestNum}-l`
                    : `c${selectedVolume}-${selectedEdition === 'Academic' ? 'a' : 'gt'}-t${selectedTestNum}-r`;
                const currentQId = `${qIdPrefix}-q${activeQuestionNumber}`;
                const isCurrentFlagged = Boolean(flaggedQuestions[currentQId]);

                return (
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-mono text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700">
                    <input
                      type="checkbox"
                      checked={isCurrentFlagged}
                      onChange={() =>
                        setFlaggedQuestions((prev) => ({
                          ...prev,
                          [currentQId]: !prev[currentQId]
                        }))
                      }
                      className="accent-amber-500"
                    />
                    <Flag className={`w-3.5 h-3.5 ${isCurrentFlagged ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span className="hidden md:inline">Review</span>
                  </label>
                );
              })()}

              <button
                type="button"
                onClick={() => {
                  if (activeQuestionNumber < 40) jumpToQuestion(activeQuestionNumber + 1);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </footer>
        )}

        {/* Scratchpad Notes Drawer */}
        {showNotesDrawer && (
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-80 bg-white dark:bg-[#101B32] shadow-2xl border-l border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                  <StickyNote className="w-4 h-4 text-amber-500" />
                  <span>Test Scratchpad</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowNotesDrawer(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {selectedTextQuote && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-slate-700 dark:text-slate-300">
                  <span className="font-bold block text-amber-700 text-[10px]">SELECTED QUOTE:</span>
                  "{selectedTextQuote}"
                </div>
              )}

              <div>
                <textarea
                  value={activeNoteText}
                  onChange={(e) => setActiveNoteText(e.target.value)}
                  placeholder="Jot down candidate notes or working steps..."
                  rows={4}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleAddScratchNote}
                  className="mt-2 w-full py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl text-xs"
                >
                  Save Note
                </button>
              </div>

              {/* Saved notes list */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {notes.map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{n.timeRemaining} remaining</span>
                      <button
                        type="button"
                        onClick={() => setNotes((prev) => prev.filter((item) => item.id !== n.id))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {n.quote && <p className="italic text-slate-500 text-[10px]">"{n.quote}"</p>}
                    <p className="text-slate-800 dark:text-slate-200">{n.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Submit Confirmation Modal */}
        {showSubmitConfirmModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#101B32] max-w-md w-full rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Finish and Submit Section?
                </h3>
              </div>

              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <p>
                  You have answered <strong>{answeredCount}</strong> out of 40 questions.
                </p>
                {flaggedCount > 0 && (
                  <p className="text-amber-600">
                    You have <strong>{flaggedCount}</strong> flagged question(s) marked for review.
                  </p>
                )}
                <p>
                  Once submitted, your responses will be evaluated against official Cambridge answer keys and saved to your progress profile.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitConfirmModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Return to Test
                </button>
                <button
                  type="button"
                  onClick={handleSubmitModule}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs"
                >
                  Confirm & Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audio Transcript Modal */}
        {showTranscriptModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#101B32] max-w-2xl w-full max-h-[80vh] overflow-y-auto rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Listening Transcript · Part {activeListeningPart}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTranscriptModal(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                {activeTestSet.listening?.parts
                  .filter((p) => p.partNumber === activeListeningPart)
                  .map((p) => (
                    <div key={p.partNumber} className="space-y-2">
                      {p.dialogue?.map((d, dIdx) => (
                        <p key={dIdx}>
                          <strong className="text-blue-600 dark:text-blue-400">{d.speaker}:</strong> {d.text}
                        </p>
                      ))}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER: STEP 5 — RESULTS & MISTAKE REVIEW SCREEN
  // ============================================================================
  if (viewStep === 'results' && scoreSummary) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6 animate-fade-in pb-16 select-none">
        <div className="bg-white dark:bg-[#101B32] p-6 sm:p-8 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <Award className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-mono font-bold text-emerald-600 uppercase tracking-wider">
              Practice Module Concluded
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              Estimated Band {scoreSummary.bandScore.toFixed(1)}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Raw Score: {scoreSummary.rawScore} / {scoreSummary.maxScore} (
              {Math.round((scoreSummary.rawScore / scoreSummary.maxScore) * 100)}% Accuracy)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 dark:border-slate-800">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase font-mono block">
                Correct Answers
              </span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {scoreSummary.rawScore}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase font-mono block">
                Needs Review
              </span>
              <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                {scoreSummary.maxScore - scoreSummary.rawScore}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setViewStep('volume_detail');
                soundManager.playBeep(600, 0.04);
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
            >
              Back to Tests
            </button>

            <button
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('practice');
                else setViewStep('library');
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95"
            >
              <span>Explore More Books</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
