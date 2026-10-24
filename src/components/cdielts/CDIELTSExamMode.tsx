import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  Flag,
  Highlighter,
  FileText,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
  MessageSquare,
  HelpCircle,
  StickyNote,
  Play,
  Square,
  Award,
  BookOpen,
  PenTool,
  Headphones
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { getCurrentUser, recordExamAttempt } from '../../utils/userStorage';
import { MOCK_EXAM_SETS, MockExamSet, QuestionItem } from '../../data/mockExams';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { audioManager } from '../../services/AudioManager';
import { audioService, DialogueLine } from '../../services/audioService';
import { addMistake } from '../../utils/vaultStorage';
import { firebaseSyncService } from '../../services/firebaseSyncService';
import { PostTestDiagnosticReport } from './PostTestDiagnosticReport';

interface NoteItem {
  id: string;
  text: string;
  selectedQuote: string;
  timestamp: string;
}

interface CDIELTSExamModeProps {
  onExit: () => void;
  onShowToast: (msg: string) => void;
}

type ColorScheme = 'standard' | 'yellow-on-black' | 'cream';
type ZoomLevel = '100%' | '125%' | '150%';

export const CDIELTSExamMode: React.FC<CDIELTSExamModeProps> = ({
  onExit,
  onShowToast
}) => {
  const activeUser = getCurrentUser();
  const candidateName = activeUser?.name || 'Candidate Student';
  const candidateId = activeUser?.id ? activeUser.id.slice(-6).toUpperCase() : '894021';

  // Load cached exam state from local storage if valid
  const cachedState = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('cdielts_session_data');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore JSON parse errors
    }
    return null;
  }, []);

  // Practice Exam Set Selector
  const [selectedSetIdx, setSelectedSetIdx] = useState<number>(() => cachedState?.selectedSetIdx ?? 0);
  const currentSet: MockExamSet = MOCK_EXAM_SETS[selectedSetIdx] || MOCK_EXAM_SETS[0];

  // Test State
  const [activeSkill, setActiveSkill] = useState<'reading' | 'listening' | 'writing'>(() => cachedState?.activeSkill ?? 'reading');
  const [mobilePane, setMobilePane] = useState<'left' | 'right'>('left');
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(() => new Set(cachedState?.flaggedQuestions || []));
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>(() => cachedState?.userAnswers || {});
  const [task1Essay, setTask1Essay] = useState<string>(() => cachedState?.task1Essay || '');
  const [task2Essay, setTask2Essay] = useState<string>(() => cachedState?.task2Essay || '');
  const [activeWritingTask, setActiveWritingTask] = useState<1 | 2>(2);

  const initialTimerSec = cachedState?.timeRemainingSec ?? 60 * 60;
  const [timeRemainingSec, setTimeRemainingSec] = useState<number>(initialTimerSec);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [isTimeHidden, setIsTimeHidden] = useState<boolean>(false);

  // Target timestamp ref for unthrottled Date.now() timer countdown
  const endTimeRef = useRef<number>(Date.now() + initialTimerSec * 1000);

  // Session storage sync
  const [highlights, setHighlights] = useState<string[]>(() => cachedState?.highlights || []);
  const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number; text: string } | null>(null);
  const [notes, setNotes] = useState<NoteItem[]>(() => cachedState?.notes || []);
  const [newNoteInput, setNewNoteInput] = useState('');
  const [activeQuote, setActiveQuote] = useState('');

  // Save session state to localStorage on state changes
  useEffect(() => {
    try {
      localStorage.setItem(
        'cdielts_session_data',
        JSON.stringify({
          selectedSetIdx,
          activeSkill,
          userAnswers,
          flaggedQuestions: Array.from(flaggedQuestions),
          task1Essay,
          task2Essay,
          timeRemainingSec,
          highlights,
          notes
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [selectedSetIdx, activeSkill, userAnswers, flaggedQuestions, task1Essay, task2Essay, timeRemainingSec, highlights, notes]);

  // Cached Listening Session Persistence
  const cachedListeningState = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('cdielts_listening_session');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  }, []);

  // Multi-Speaker Listening Engine State & Visualizer
  const [listeningSection, setListeningSection] = useState<1 | 2 | 3 | 4>(() => cachedListeningState?.currentSection || 1);
  const [useMp3Stream, setUseMp3Stream] = useState<boolean>(true);
  const activeAudioSrc = currentSet.audioSrc
    ? currentSet.audioSrc.replace(/Track%200\d/, `Track%200${listeningSection}`)
    : `https://ia801503.us.archive.org/15/items/insightintoielts0000jake_o7m2/Track%200${listeningSection}.mp3`;
  const [isListeningReadingPhase, setIsListeningReadingPhase] = useState<boolean>(() => cachedListeningState?.isReadingPhase ?? false);
  const [listeningReadingSec, setListeningReadingSec] = useState<number>(30);
  const [listeningPlaybackTimeSec, setListeningPlaybackTimeSec] = useState<number>(() => cachedListeningState?.playbackTimeSec || 0);
  const [listeningVolume, setListeningVolume] = useState<number>(() => cachedListeningState?.volume ?? 0.85);
  const [isListeningMuted, setIsListeningMuted] = useState<boolean>(() => cachedListeningState?.isMuted ?? false);
  const [currentSpeaker, setCurrentSpeaker] = useState<{ name: string; role: string; accent: string; text: string } | null>(null);
  
  // Voice Persona Distinction & Captions
  const [activeSpeakerPersona, setActiveSpeakerPersona] = useState<'persona_a' | 'persona_b' | 'narrator'>('persona_a');
  const [showCaptions, setShowCaptions] = useState<boolean>(true);
  const [currentSubtitleText, setCurrentSubtitleText] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPersonaRef = useRef<'persona_a' | 'persona_b' | 'narrator' | null>(null);

  // System Voices Population State
  const [systemVoices, setSystemVoices] = useState<{
    voiceA: SpeechSynthesisVoice | null;
    voiceB: SpeechSynthesisVoice | null;
    isSingleVoice: boolean;
  }>({ voiceA: null, voiceB: null, isSingleVoice: true });

  // Register speechSynthesis.onvoiceschanged to populate system voices reliably
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const populateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      // Persona A: UK Admissions Officer (en-GB / UK / British / Female)
      const voiceA =
        voices.find(
          (v) =>
            v.lang.toLowerCase().includes('en-gb') ||
            v.name.toLowerCase().includes('uk') ||
            v.name.toLowerCase().includes('british') ||
            v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('charlotte') ||
            v.name.toLowerCase().includes('serena') ||
            v.name.toLowerCase().includes('hazel')
        ) || voices[0];

      // Persona B: Australian / International Candidate (en-AU / en-US / Male or distinct URI)
      let voiceB = voices.find(
        (v) =>
          v.voiceURI !== voiceA.voiceURI &&
          (v.lang.toLowerCase().includes('en-au') ||
           v.lang.toLowerCase().includes('en-us') ||
           v.name.toLowerCase().includes('australian') ||
           v.name.toLowerCase().includes('male') ||
           v.name.toLowerCase().includes('daniel') ||
           v.name.toLowerCase().includes('george') ||
           v.name.toLowerCase().includes('arthur'))
      );

      if (!voiceB) {
        voiceB = voices.find((v) => v.voiceURI !== voiceA.voiceURI) || null;
      }

      const isSingleVoice = !voiceB || voiceA.voiceURI === voiceB.voiceURI;
      setSystemVoices({ voiceA, voiceB: voiceB || voiceA, isSingleVoice });
    };

    populateVoices();
    window.speechSynthesis.onvoiceschanged = populateVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Sync listening session state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        'cdielts_listening_session',
        JSON.stringify({
          currentSection: listeningSection,
          playbackTimeSec: listeningPlaybackTimeSec,
          isReadingPhase: isListeningReadingPhase,
          volume: listeningVolume,
          isMuted: isListeningMuted,
          userAnswers
        })
      );
    } catch {
      // ignore
    }
  }, [listeningSection, listeningPlaybackTimeSec, isListeningReadingPhase, listeningVolume, isListeningMuted, userAnswers]);

  // Audio playback state for Listening Lab
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [hasPlayedListeningOnce, setHasPlayedListeningOnce] = useState<boolean>(false);

  // Post-Submission Results Modal State
  const [submittedResults, setSubmittedResults] = useState<{
    listeningCorrect: number;
    listeningTotal: number;
    listeningBand: number;
    readingCorrect: number;
    readingTotal: number;
    readingBand: number;
    writingBand: number;
    overallBand: number;
    wordCount: number;
  } | null>(null);

  // Resizable Split-Screen Pane state (percentage width of left passage, default 50%)
  const [leftPanePercent, setLeftPanePercent] = useState<number>(50);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);

  // CD-IELTS Display Options
  const [colorScheme, setColorScheme] = useState<ColorScheme>('standard');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('100%');
  const [showPalette, setShowPalette] = useState<boolean>(true);
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Warnings tracking (10m and 5m warnings per official British Council rules)
  const [hasShown10mWarning, setHasShown10mWarning] = useState(false);
  const [hasShown5mWarning, setHasShown5mWarning] = useState(false);
  const [warningModalText, setWarningModalText] = useState<string | null>(null);

  // Listening transfer review phase (2 minutes at the end)
  const [isListeningTransferPhase, setIsListeningTransferPhase] = useState(false);
  const [listeningTransferSec, setListeningTransferSec] = useState(120);

  const passageRef = useRef<HTMLDivElement | null>(null);

  // Global Audio Killswitch: kills lingering speech synthesis & pauses/resets HTML5 audio
  const stopAllActiveAudio = useCallback(() => {
    audioManager.killAllAudio(audioRef.current);
  }, []);

  // Stop any playing speech and reset audio elements on unmount
  useEffect(() => {
    return () => {
      audioManager.killAllAudio(audioRef.current);
    };
  }, []);

  // Filter questions by skill or show all questions in current set
  const skillQuestions: QuestionItem[] =
    activeSkill === 'listening'
      ? currentSet.questions.filter((q) => q.section === 'listening')
      : activeSkill === 'reading'
      ? currentSet.questions.filter((q) => q.section === 'reading')
      : currentSet.questions;

  const activeQuestionObj: QuestionItem | undefined =
    skillQuestions[activeQuestionIdx] || skillQuestions[0] || currentSet.questions[0];

  const activeQuestionId = activeQuestionObj?.id || 1;

  // Alt+P (Previous) and Alt+N (Next) Keyboard Hotkey Navigation
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [skillQuestions.length]);

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

  // Unthrottled Timer Countdown using Date.now() timestamp differentials
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
      setTimeRemainingSec(diffSec);

      if (diffSec <= 0) {
        setIsTimerRunning(false);
        soundManager.playBeep(440, 0.4);
        setWarningModalText('TIME EXPIRED: The test duration has concluded. Please submit your responses for grading.');
      } else if (diffSec <= 600 && diffSec > 598 && !hasShown10mWarning) {
        setHasShown10mWarning(true);
        setIsTimeHidden(false);
        soundManager.playBeep(520, 0.2);
        setWarningModalText('10-MINUTE WARNING: You have 10 minutes remaining. Check all flagged questions before time expires.');
      } else if (diffSec <= 300 && diffSec > 298 && !hasShown5mWarning) {
        setHasShown5mWarning(true);
        setIsTimeHidden(false);
        soundManager.playBeep(580, 0.25);
        setWarningModalText('5-MINUTE WARNING: You have 5 minutes remaining. No extra transfer time is provided in Computer-Delivered Reading.');
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isTimerRunning, hasShown10mWarning, hasShown5mWarning]);

  // Listening 2-minute transfer review countdown
  useEffect(() => {
    let interval: any = null;
    if (isListeningTransferPhase && listeningTransferSec > 0) {
      interval = setInterval(() => {
        setListeningTransferSec((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsListeningTransferPhase(false);
            soundManager.playBeep(440, 0.4);
            setWarningModalText('2-MINUTE CHECK CONCLUDED: Please submit your test.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isListeningTransferPhase, listeningTransferSec]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleFlag = (qId: number) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) {
        next.delete(qId);
        onShowToast(`Question ${qId} unflagged`);
      } else {
        next.add(qId);
        onShowToast(`Question ${qId} flagged for review`);
      }
      return next;
    });
    soundManager.playBeep(640, 0.03);
  };

  const toggleHighlight = (text: string) => {
    setHighlights((prev) => {
      if (prev.includes(text)) {
        onShowToast('Highlight removed');
        return prev.filter((h) => h !== text);
      } else {
        onShowToast('Highlighted selection in yellow');
        soundManager.playBeep(680, 0.03);
        return [...prev, text];
      }
    });
    setSelectionMenu(null);
  };

  const handleTextSelection = (e: React.MouseEvent) => {
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
    if (!highlights || highlights.length === 0) return paragraph;
    const activeHighlights = highlights
      .filter((h) => h && paragraph.includes(h))
      .sort((a, b) => b.length - a.length);
    if (activeHighlights.length === 0) return paragraph;

    let parts: { text: string; isHighlight: boolean }[] = [{ text: paragraph, isHighlight: false }];

    activeHighlights.forEach((hl) => {
      const nextParts: typeof parts = [];
      parts.forEach((p) => {
        if (p.isHighlight) {
          nextParts.push(p);
        } else {
          const chunks = p.text.split(hl);
          chunks.forEach((chunk, idx) => {
            if (chunk) nextParts.push({ text: chunk, isHighlight: false });
            if (idx < chunks.length - 1) {
              nextParts.push({ text: hl, isHighlight: true });
            }
          });
        }
      });
      parts = nextParts;
    });

    return parts.map((part, idx) =>
      part.isHighlight ? (
        <mark
          key={idx}
          onClick={() => toggleHighlight(part.text)}
          className="bg-yellow-200 dark:bg-yellow-800/80 text-slate-900 dark:text-yellow-100 rounded-xs px-1 py-0.5 font-medium cursor-pointer shadow-2xs hover:bg-yellow-300 dark:hover:bg-yellow-700 transition"
          title="Click to remove highlight"
        >
          {part.text}
        </mark>
      ) : (
        <span key={idx}>{part.text}</span>
      )
    );
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
    onShowToast('Note saved to candidate scratchpad');
  };

  // 30-Second Silent Reading Preview Timer Effect
  useEffect(() => {
    let interval: any = null;
    if (isListeningReadingPhase && listeningReadingSec > 0) {
      interval = setInterval(() => {
        setListeningReadingSec((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsListeningReadingPhase(false);
            handleStartMultiSpeakerAudio();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isListeningReadingPhase, listeningReadingSec]);

  // Speaker Profiles Map for Multi-Character IELTS Listening
  const LISTENING_SPEAKERS: Record<string, { name: string; role: string; accent: string; avatarColor: string; persona: 'persona_a' | 'persona_b' }> = {
    'Admissions Officer': {
      name: 'Arthur Davies',
      role: 'University Admissions Officer',
      accent: 'British RP (UK)',
      avatarColor: 'bg-blue-600',
      persona: 'persona_a'
    },
    'Liam': {
      name: 'Liam Henderson',
      role: 'Postgraduate Candidate',
      accent: 'Australian (AU)',
      avatarColor: 'bg-emerald-600',
      persona: 'persona_b'
    },
    'George Higgins': {
      name: 'George Higgins',
      role: 'Community Arts Coordinator',
      accent: 'British RP (UK)',
      avatarColor: 'bg-blue-600',
      persona: 'persona_a'
    },
    'Beatrice': {
      name: 'Beatrice Kensington',
      role: 'Festival Visitor',
      accent: 'Scottish (UK)',
      avatarColor: 'bg-emerald-600',
      persona: 'persona_b'
    },
    'Professor': {
      name: 'Dr. Aris Thorne',
      role: 'Senior Academic Lecturer',
      accent: 'British Academic (UK)',
      avatarColor: 'bg-indigo-600',
      persona: 'persona_a'
    },
    'Sarah': {
      name: 'Sarah Jenkins',
      role: 'Student Researcher',
      accent: 'North American (US)',
      avatarColor: 'bg-rose-600',
      persona: 'persona_b'
    }
  };

  const parseScriptLines = (script: string) => {
    const lines = script.split('\n').map((l) => l.trim()).filter(Boolean);
    const result: { speakerKey: string; speakerName: string; text: string; role: string; accent: string; persona: 'persona_a' | 'persona_b' }[] = [];

    lines.forEach((line) => {
      const match = line.match(/^([A-Za-z0-9\s]+):\s*"(.*)"$/) || line.match(/^([A-Za-z0-9\s]+):\s*(.*)$/);
      if (match) {
        const name = match[1].trim();
        const text = match[2].trim().replace(/^"/, '').replace(/"$/, '');
        const profile = LISTENING_SPEAKERS[name] || {
          name,
          role: 'Examiner Speaker',
          accent: 'British RP (UK)',
          avatarColor: 'bg-slate-600',
          persona: name === 'Liam' || name === 'Beatrice' || name === 'Sarah' ? 'persona_b' : 'persona_a'
        };
        result.push({
          speakerKey: name,
          speakerName: profile.name,
          role: profile.role,
          accent: profile.accent,
          persona: profile.persona,
          text
        });
      } else {
        result.push({
          speakerKey: 'Narrator',
          speakerName: 'Cambridge Voiceover',
          role: 'Official Audio Guidance',
          accent: 'Standard British (UK)',
          persona: 'persona_a',
          text: line
        });
      }
    });
    return result;
  };

  const startListeningSectionWithPreview = (sec: 1 | 2 | 3 | 4) => {
    stopAllActiveAudio();
    setIsAudioPlaying(false);
    setListeningSection(sec);
    setIsListeningReadingPhase(true);
    setListeningReadingSec(30);
    soundManager.playBeep(520, 0.04);
    onShowToast(`Section ${sec}: 30-second silent question preview started`);
  };

  const handleStartMultiSpeakerAudio = async () => {
    if (isAudioPlaying) {
      stopAllActiveAudio();
      setIsAudioPlaying(false);
      return;
    }

    stopAllActiveAudio();

    // Direct Real MP3 Audio Stream Playback (with studio engine fallback if stream is blocked/unsupported)
    if (activeAudioSrc && useMp3Stream) {
      if (audioRef.current) {
        audioRef.current.volume = isListeningMuted ? 0 : listeningVolume;
        try {
          await audioRef.current.play();
          setIsAudioPlaying(true);
          setHasPlayedListeningOnce(true);
          setIsListeningReadingPhase(false);
          onShowToast(`Playing authentic Cambridge MP3 audio stream (Section ${listeningSection})...`);
          return;
        } catch (err) {
          console.warn('Audio stream playback error, switching to studio engine:', err);
          setUseMp3Stream(false);
        }
      }
    }

    setIsAudioPlaying(true);
    setHasPlayedListeningOnce(true);
    setIsListeningReadingPhase(false);

    const parsedLines = parseScriptLines(currentSet.listeningScript);

    // Map parsed script turns to rich DialogueLine objects for studio-grade neural streaming
    const dialogueLines: DialogueLine[] = parsedLines.map((line) => {
      let speakerId = 'speaker_04'; // Default Arthur UK RP Male
      const nameLower = line.speakerKey.toLowerCase();
      if (nameLower.includes('admissions') || nameLower.includes('george') || nameLower.includes('arthur')) {
        speakerId = 'speaker_04'; // Arthur UK RP Baritone
      } else if (nameLower.includes('professor') || nameLower.includes('thorne')) {
        speakerId = 'speaker_03'; // Dr Sterling
      } else if (nameLower.includes('liam') || nameLower.includes('william')) {
        speakerId = 'speaker_06'; // William (AU Male)
      } else if (nameLower.includes('beatrice') || nameLower.includes('charlotte')) {
        speakerId = 'speaker_05'; // Charlotte (UK RP Female)
      } else if (nameLower.includes('sarah') || nameLower.includes('jenny')) {
        speakerId = 'speaker_10'; // Jenny (US Female)
      } else if (line.persona === 'persona_b') {
        speakerId = 'speaker_05';
      }

      return {
        speakerId,
        speakerName: line.speakerName,
        speaker: line.speakerName,
        gender: line.persona === 'persona_b' ? 'female' : 'male',
        accent: line.accent,
        text: line.text,
        pauseAfterMs: line.persona === 'persona_b' ? 380 : 250
      };
    });

    try {
      await audioService.playDialogueSequentially(dialogueLines, {
        examId: currentSet.id,
        onLineStart: (idx) => {
          const current = parsedLines[idx] || parsedLines[0];
          setActiveSpeakerPersona(current.persona);
          setCurrentSpeaker({
            name: current.speakerName,
            role: current.role,
            accent: current.accent,
            text: current.text
          });
          setCurrentSubtitleText(current.text);
          setListeningPlaybackTimeSec((prev) => prev + 4);
        },
        onComplete: () => {
          setIsAudioPlaying(false);
          setIsListeningTransferPhase(true);
          setListeningTransferSec(120);
          onShowToast('Listening audio recording finished. 2-minute answer check started.');
        },
        onError: (err) => {
          console.warn('Dialogue playback error:', err);
          setIsAudioPlaying(false);
        }
      });
    } catch (err) {
      console.warn('Studio dialogue engine error:', err);
      setIsAudioPlaying(false);
    }
  };

  const normalizeAnswer = (val: string) =>
    val.trim().toUpperCase().replace(/\s+/g, ' ');

  const isQuestionCorrect = (q: QuestionItem, rawUserVal?: string): boolean => {
    if (!rawUserVal) return false;
    const u = normalizeAnswer(rawUserVal);
    const c = normalizeAnswer(q.correctAnswer);
    if (u === c) return true;
    // Also handle stripped spaces for phone numbers/postcodes
    if (u.replace(/\s+/g, '') === c.replace(/\s+/g, '')) return true;
    return false;
  };

  const computeBandFromRatio = (correct: number, total: number): number => {
    if (total === 0) return 0;
    const ratio = correct / total;
    if (ratio >= 0.95) return 9.0;
    if (ratio >= 0.85) return 8.5;
    if (ratio >= 0.75) return 8.0;
    if (ratio >= 0.65) return 7.5;
    if (ratio >= 0.55) return 7.0;
    if (ratio >= 0.45) return 6.5;
    if (ratio >= 0.35) return 6.0;
    if (ratio >= 0.25) return 5.5;
    if (ratio > 0) return 5.0;
    return 0;
  };

  const countWords = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  };

  const handleFinalSubmit = () => {
    stopSpeech();
    setIsAudioPlaying(false);
    setIsTimerRunning(false);
    setShowReviewModal(false);

    const listeningQs = currentSet.questions.filter((q) => q.section === 'listening');
    const readingQs = currentSet.questions.filter((q) => q.section === 'reading');

    let listeningCorrect = 0;
    listeningQs.forEach((q) => {
      const userVal = userAnswers[q.id];
      if (isQuestionCorrect(q, userVal)) {
        listeningCorrect++;
      } else {
        const wrongVal = userVal && userVal.trim() ? userVal.trim() : 'Skipped / Unanswered';
        addMistake({
          module: 'listening',
          title: `${currentSet.title} · Q${q.id}`,
          prompt: q.prompt,
          questionType: q.type || 'Listening Trap',
          userAnswer: wrongVal,
          userWrongAnswer: wrongVal,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          trapExplanationEn: q.explanation,
          trapExplanationBn: `অডিওটি মনোযোগ দিয়ে শুনে এবং প্রশ্নোত্তরের গ্রামার সামঞ্জস্য বজায় রেখে লিখুন।`
        });
      }
    });

    let readingCorrect = 0;
    readingQs.forEach((q) => {
      const userVal = userAnswers[q.id];
      if (isQuestionCorrect(q, userVal)) {
        readingCorrect++;
      } else {
        const wrongVal = userVal && userVal.trim() ? userVal.trim() : 'Skipped / Unanswered';
        addMistake({
          module: 'reading',
          title: `${currentSet.title} · Q${q.id}`,
          prompt: q.prompt,
          questionType: q.type || 'Reading Trap',
          userAnswer: wrongVal,
          userWrongAnswer: wrongVal,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          trapExplanationEn: q.explanation,
          trapExplanationBn: `প্যাসেজের সমার্থক শব্দ (Synonyms) ও অনুচ্ছেদ সম্পর্কিত ব্যাকরণগত অর্থ মিলিয়ে দেখুন।`
        });
      }
    });

    const listeningBand = computeBandFromRatio(listeningCorrect, listeningQs.length);
    const readingBand = computeBandFromRatio(readingCorrect, readingQs.length);

    const t1Words = countWords(task1Essay);
    const t2Words = countWords(task2Essay);
    const totalWords = t1Words + t2Words;

    let writingBand = 0;
    if (totalWords >= 380) writingBand = 7.5;
    else if (totalWords >= 250) writingBand = 7.0;
    else if (totalWords >= 150) writingBand = 6.5;
    else if (totalWords >= 60) writingBand = 5.5;
    else if (totalWords > 0) writingBand = 5.0;

    const activeBands = [listeningBand, readingBand, writingBand].filter((b) => b > 0);
    const rawAvg =
      activeBands.length > 0
        ? activeBands.reduce((acc, b) => acc + b, 0) / activeBands.length
        : 0;
    const overallBand = rawAvg > 0 ? Math.round(rawAvg * 2) / 2 : 0;

    // Persist attempt if user answered at least 1 question or wrote an essay
    if (overallBand > 0) {
      recordExamAttempt({
        examType: readingBand > 0 && writingBand > 0 ? 'full_mock' : 'listening_only',
        overallBand,
        listeningBand: listeningBand || overallBand,
        readingBand: readingBand || overallBand,
        writingBand: writingBand || overallBand,
        wordCount: totalWords,
        submissionType: 'manual',
        correctCount: listeningCorrect + readingCorrect,
        totalQuestions: currentSet.questions.length
      });

      firebaseSyncService
        .recordTestSubmission(
          activeSkill,
          currentSet.id,
          overallBand,
          listeningCorrect + readingCorrect,
          currentSet.questions.length,
          Math.max(60, 3600 - timeRemainingSec)
        )
        .catch(() => {});
    }

    soundManager.playSuccess();
    setSubmittedResults({
      listeningCorrect,
      listeningTotal: listeningQs.length,
      listeningBand,
      readingCorrect,
      readingTotal: readingQs.length,
      readingBand,
      writingBand,
      overallBand,
      wordCount: totalWords
    });
    onShowToast('Test graded! Review your official answer breakdown below.');
  };

  // Color scheme class resolver
  const getColorSchemeClasses = () => {
    switch (colorScheme) {
      case 'yellow-on-black':
        return 'bg-black text-yellow-300 border-yellow-500';
      case 'cream':
        return 'bg-[#FFFDF7] text-[#2C2416] border-[#E8DFC8]';
      case 'standard':
      default:
        return 'bg-[#F4F5F7] text-[#1E293B] border-[#D1D5DB]';
    }
  };

  const getZoomClass = () => {
    switch (zoomLevel) {
      case '125%':
        return 'text-[17px] leading-relaxed';
      case '150%':
        return 'text-[19px] leading-loose';
      case '100%':
      default:
        return 'text-sm sm:text-base leading-relaxed';
    }
  };

  const totalQuestions = currentSet.questions.length;
  const answeredCount = currentSet.questions.filter((q) => Boolean(userAnswers[q.id]?.trim())).length;
  const unansweredCount = totalQuestions - answeredCount;
  const task1WordCount = countWords(task1Essay);
  const task2WordCount = countWords(task2Essay);

  if (submittedResults) {
    return (
      <PostTestDiagnosticReport
        candidateName={candidateName}
        testTitle={`${currentSet.title} (${currentSet.listeningTitle})`}
        testSetId={currentSet.id}
        activeSkill={activeSkill}
        results={submittedResults}
        questions={skillQuestions}
        userAnswers={userAnswers}
        listeningScript={currentSet.listeningScript}
        readingPassage={currentSet.readingPassage}
        timeElapsedSec={Math.max(60, 3600 - timeRemainingSec)}
        onRetake={() => {
          setSubmittedResults(null);
          setUserAnswers({});
          setFlaggedQuestions(new Set());
          setTimeRemainingSec(60 * 60);
          endTimeRef.current = Date.now() + 60 * 60 * 1000;
          setIsTimerRunning(true);
          setActiveQuestionIdx(0);
          stopAllActiveAudio();
          onShowToast('Test session reset. Best of luck on your retake!');
        }}
        onBackToDashboard={() => {
          stopAllActiveAudio();
          onExit();
        }}
        onShowToast={onShowToast}
      />
    );
  }

  return (
    <div className={`min-h-screen w-full flex flex-col select-none transition-colors duration-150 ${getColorSchemeClasses()}`}>
      {/* ================= 1. OFFICIAL CD-IELTS TOP TEST HEADER ================= */}
      <header className="sticky top-0 z-40 w-full border-b border-inherit px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 bg-inherit shadow-xs">
        {/* Left: Candidate Details, Set Selector & Module Switcher */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-xs tracking-wider uppercase px-2 py-0.5 rounded bg-blue-600 text-white">
              CD-IELTS
            </span>
            <div className="hidden xl:block text-xs font-semibold">
              <span className="font-bold">{candidateName}</span>
              <span className="opacity-60 ml-1.5">ID: {candidateId}</span>
            </div>
          </div>

          {/* Exam Set Selector */}
          <select
            value={selectedSetIdx}
            onChange={(e) => {
              const idx = Number(e.target.value);
              stopSpeech();
              setIsAudioPlaying(false);
              setSelectedSetIdx(idx);
              setActiveQuestionIdx(0);
              setUserAnswers({});
              setFlaggedQuestions(new Set());
              setSubmittedResults(null);
            }}
            aria-label="Select Practice Test Set"
            className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-inherit bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 outline-none"
          >
            {MOCK_EXAM_SETS.map((s, idx) => (
              <option key={s.id} value={idx}>
                {s.title} ({s.format})
              </option>
            ))}
          </select>

          {/* Module Switcher */}
          <div className="flex items-center gap-1 text-xs bg-slate-500/10 p-1 rounded-lg">
            <button
              onClick={() => {
                setActiveSkill('reading');
                setActiveQuestionIdx(0);
                soundManager.playBeep(520, 0.03);
              }}
              className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 ${
                activeSkill === 'reading'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'hover:bg-slate-500/10'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Reading</span>
            </button>
            <button
              onClick={() => {
                setActiveSkill('listening');
                setActiveQuestionIdx(0);
                soundManager.playBeep(520, 0.03);
              }}
              className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 ${
                activeSkill === 'listening'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'hover:bg-slate-500/10'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Listening</span>
            </button>
            <button
              onClick={() => {
                setActiveSkill('writing');
                soundManager.playBeep(520, 0.03);
              }}
              className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 ${
                activeSkill === 'writing'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'hover:bg-slate-500/10'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Writing</span>
            </button>
          </div>
        </div>

        {/* Center: Countdown Clock with [Hide Time] per British Council Specs */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-inherit font-mono font-black text-xs sm:text-sm tracking-widest ${
              timeRemainingSec < 600
                ? 'bg-rose-500/10 text-rose-600 border-rose-500/30 animate-pulse'
                : 'bg-white/80 dark:bg-slate-800/80'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isTimeHidden ? '--:--' : formatTimer(timeRemainingSec)}</span>
          </div>

          <button
            onClick={() => {
              setIsTimeHidden(!isTimeHidden);
              soundManager.playBeep(550, 0.02);
            }}
            className="px-2 py-1 rounded border border-inherit text-[11px] font-bold hover:bg-slate-500/10"
            title={isTimeHidden ? 'Show Time' : 'Hide Time'}
          >
            {isTimeHidden ? 'Show' : 'Hide'}
          </button>
        </div>

        {/* Right: Accessibility, Help, Review & Exit */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom Level Toggle */}
          <button
            onClick={() => {
              const levels: ZoomLevel[] = ['100%', '125%', '150%'];
              const nextIdx = (levels.indexOf(zoomLevel) + 1) % levels.length;
              setZoomLevel(levels[nextIdx]);
              soundManager.playBeep(600, 0.03);
            }}
            className="hidden md:flex px-2 py-1 rounded border border-inherit text-xs font-mono font-bold items-center gap-1"
            title="Adjust text magnification"
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span>{zoomLevel}</span>
          </button>

          {/* Color Schemes */}
          <div className="hidden lg:flex items-center gap-1 border-l border-inherit pl-2">
            <button
              onClick={() => setColorScheme('standard')}
              className={`px-2 py-1 rounded text-[11px] font-bold border ${colorScheme === 'standard' ? 'bg-blue-600 text-white' : 'border-slate-300'}`}
              title="Standard"
            >
              Standard
            </button>
            <button
              onClick={() => setColorScheme('cream')}
              className={`px-2 py-1 rounded text-[11px] font-bold border ${colorScheme === 'cream' ? 'bg-[#5A4A32] text-white' : 'border-[#E8DFC8]'}`}
              title="Soft Cream"
            >
              Cream
            </button>
            <button
              onClick={() => setColorScheme('yellow-on-black')}
              className={`px-2 py-1 rounded text-[11px] font-bold border ${colorScheme === 'yellow-on-black' ? 'bg-yellow-400 text-black' : 'border-yellow-500'}`}
              title="High Contrast"
            >
              Contrast
            </button>
          </div>

          {/* Help Dialog Button */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-1.5 rounded-lg border border-inherit hover:bg-slate-500/10"
            title="CD-IELTS Instructions & Help"
          >
            <HelpCircle className="w-4 h-4 text-blue-600" />
          </button>

          {/* Margin Notes */}
          <button
            onClick={() => setShowNotesDrawer(!showNotesDrawer)}
            className="px-2.5 py-1.5 rounded-lg border border-inherit text-xs font-bold flex items-center gap-1 hover:bg-slate-500/10"
          >
            <StickyNote className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Notes ({notes.length})</span>
          </button>

          {/* Exit Exam */}
          <button
            onClick={() => {
              stopSpeech();
              onExit();
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </header>

      {/* ================= MOBILE (< 768px) PANE SWITCHER ================= */}
      <div className="flex md:hidden border-b border-inherit bg-slate-500/5 p-1.5 gap-1.5">
        <button
          onClick={() => setMobilePane('left')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
            mobilePane === 'left'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'hover:bg-slate-500/10'
          }`}
        >
          {activeSkill === 'reading'
            ? '1. Reading Passage'
            : activeSkill === 'listening'
            ? '1. Audio Player'
            : '1. Writing Prompt'}
        </button>
        <button
          onClick={() => setMobilePane('right')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
            mobilePane === 'right'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'hover:bg-slate-500/10'
          }`}
        >
          {activeSkill === 'writing'
            ? `2. Essay Editor (${activeWritingTask === 1 ? task1WordCount : task2WordCount}w)`
            : `2. Questions (${answeredCount}/${totalQuestions})`}
        </button>
      </div>

      {/* ================= 2. MAIN RESIZABLE SPLIT SCREEN ================= */}
      <div
        ref={splitContainerRef}
        className="flex-1 flex flex-col md:flex-row overflow-hidden relative"
      >
        {/* Left Column: Passage / Audio Stream / Writing Prompt */}
        <div
          ref={passageRef}
          onMouseUp={handleTextSelection}
          style={{ width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${leftPanePercent}%` : '100%' }}
          className={`${
            mobilePane === 'left' ? 'block' : 'hidden md:block'
          } h-full p-5 sm:p-8 overflow-y-auto border-r border-inherit scrollbar-thin ${getZoomClass()}`}
        >
          <div className="max-w-2xl mx-auto space-y-5">
            {activeSkill === 'reading' && (
              <>
                <div className="border-b border-inherit pb-3">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600">
                    {currentSet.badge} · ACADEMIC READING PASSAGE
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black mt-1">
                    {currentSet.readingTitle}
                  </h1>
                  <p className="text-xs opacity-75 mt-1 italic">
                    Read the passage below and answer the questions in the right-hand panel. Select any text to save a margin note.
                  </p>
                </div>

                <div className="space-y-4 text-justify">
                  {currentSet.readingPassage
                    .split('\n\n')
                    .filter((para) => para.trim().length > 0)
                    .map((para, i) => (
                      <p key={i} className="leading-relaxed">
                        {renderParagraphWithHighlights(para)}
                      </p>
                    ))}
                </div>
              </>
            )}

            {activeSkill === 'listening' && (
              <>
                <div className="border-b border-inherit pb-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600">
                      {currentSet.source} · MULTI-SPEAKER LISTENING SIMULATOR
                    </span>
                    <h1 className="text-xl sm:text-2xl font-black mt-1">
                      {currentSet.listeningTitle}
                    </h1>
                  </div>

                  {/* Listening Section Navigation Tabs */}
                  <div className="flex items-center gap-1">
                    {([1, 2, 3, 4] as const).map((sec) => (
                      <button
                        key={sec}
                        onClick={() => startListeningSectionWithPreview(sec)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition border cursor-pointer ${
                          listeningSection === sec
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'border-inherit opacity-75 hover:opacity-100 hover:bg-slate-500/10'
                        }`}
                      >
                        Sec {sec}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 30-Second Silent Question Preview Banner */}
                {isListeningReadingPhase && (
                  <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between text-xs font-mono font-bold">
                      <span className="flex items-center gap-1.5 uppercase">
                        <Clock className="w-4 h-4 text-amber-500 animate-spin" />
                        30-Second Question Preview Phase (Section {listeningSection})
                      </span>
                      <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-600 font-mono text-sm font-black">
                        00:{listeningReadingSec.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <p className="text-xs opacity-90">
                      You have 30 seconds to review Questions 1 to 5. The multi-character audio recording will commence automatically when countdown reaches 00:00.
                    </p>
                    <div className="w-full h-1.5 rounded-full bg-amber-200 dark:bg-amber-900/60 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all duration-1000"
                        style={{ width: `${(listeningReadingSec / 30) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Multi-Speaker Audio Player & Synchronized Live Speaker Visualizer */}
                <div className="p-5 sm:p-6 rounded-2xl border border-inherit bg-slate-500/5 space-y-5">
                  {/* Native HTML5 Audio Bar with Controls for Direct MP3 Audio Stream */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 space-y-2 shadow-inner">
                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
                      <span className="flex items-center gap-2 text-blue-400 font-bold">
                        <Headphones className="w-4 h-4" />
                        🇬🇧 Official Cambridge MP3 Audio Stream · Section {listeningSection}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Insight Into IELTS (Official Recording)
                      </span>
                    </div>
                    <audio
                      ref={audioRef}
                      src={activeAudioSrc}
                      controls
                      preload="auto"
                      className="h-10 text-xs accent-blue-600 rounded-lg w-full bg-slate-800 border border-slate-700"
                      onPlay={() => {
                        setIsAudioPlaying(true);
                        setHasPlayedListeningOnce(true);
                        setIsListeningReadingPhase(false);
                      }}
                      onPause={() => setIsAudioPlaying(false)}
                      onError={() => {
                        console.warn(`Audio stream failed to load for source: ${activeAudioSrc}`);
                        setUseMp3Stream(false);
                      }}
                      onTimeUpdate={() => {
                        if (audioRef.current) {
                          const curr = Math.floor(audioRef.current.currentTime);
                          const dur = audioRef.current.duration || 330;
                          setListeningPlaybackTimeSec(curr);

                          // Sync live speaker card & subtitles based on MP3 playback progress
                          const parsed = parseScriptLines(currentSet.listeningScript);
                          if (parsed.length > 0 && dur > 0) {
                            const progress = audioRef.current.currentTime / dur;
                            const idx = Math.min(parsed.length - 1, Math.floor(progress * parsed.length));
                            const curLine = parsed[idx];
                            if (curLine) {
                              setActiveSpeakerPersona(curLine.persona);
                              setCurrentSpeaker({
                                name: curLine.speakerName,
                                role: curLine.role,
                                accent: curLine.accent,
                                text: curLine.text
                              });
                              setCurrentSubtitleText(curLine.text);
                            }
                          }
                        }
                      }}
                      onEnded={() => {
                        setIsAudioPlaying(false);
                        setIsListeningTransferPhase(true);
                        setListeningTransferSec(120);
                        onShowToast('Listening audio recording finished. 2-minute answer check started.');
                      }}
                    />
                  </div>

                  {/* Synchronized Live Speaker Visualizer Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card 1: Persona A (🇬🇧 Admissions Officer / Arthur Davies) */}
                    <div
                      className={`p-4 rounded-xl transition-all duration-300 relative overflow-hidden ${
                        isAudioPlaying && activeSpeakerPersona === 'persona_a'
                          ? 'bg-slate-900 border-2 border-blue-500 shadow-lg shadow-blue-500/25 opacity-100 scale-100'
                          : 'bg-slate-900/80 border border-slate-800 opacity-50 scale-98 hover:opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-md transition-transform ${
                              isAudioPlaying && activeSpeakerPersona === 'persona_a' ? 'bg-blue-600 ring-2 ring-blue-400 scale-105' : 'bg-slate-700'
                            }`}
                          >
                            🇬🇧
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-white">Arthur Davies</span>
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                UK RP
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block">Admissions Officer</span>
                          </div>
                        </div>

                        {/* Animated Equalizer or Speaking Badge */}
                        {isAudioPlaying && activeSpeakerPersona === 'persona_a' ? (
                          <div className="flex items-center gap-1.5 bg-blue-500/20 border border-blue-500/40 text-blue-300 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                            <span>SPEAKING</span>
                            <div className="flex items-end gap-0.5 h-3 ml-1">
                              <span className="w-0.5 bg-blue-400 h-full animate-bounce" />
                              <span className="w-0.5 bg-blue-400 h-2/3 animate-bounce [animation-delay:0.2s]" />
                              <span className="w-0.5 bg-blue-400 h-4/5 animate-bounce [animation-delay:0.4s]" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500 uppercase">
                            {isAudioPlaying ? 'LISTENING' : 'READY'}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-300 italic line-clamp-2 min-h-[32px] font-serif">
                        {isAudioPlaying && activeSpeakerPersona === 'persona_a'
                          ? `"${currentSpeaker?.text || currentSubtitleText}"`
                          : 'Awaiting turn in dialogue...'}
                      </div>
                    </div>

                    {/* Card 2: Persona B (🇦🇺 Liam Henderson) */}
                    <div
                      className={`p-4 rounded-xl transition-all duration-300 relative overflow-hidden ${
                        isAudioPlaying && activeSpeakerPersona === 'persona_b'
                          ? 'bg-slate-900 border-2 border-emerald-500 shadow-lg shadow-emerald-500/25 opacity-100 scale-100'
                          : 'bg-slate-900/80 border border-slate-800 opacity-50 scale-98 hover:opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-md transition-transform ${
                              isAudioPlaying && activeSpeakerPersona === 'persona_b' ? 'bg-emerald-600 ring-2 ring-emerald-400 scale-105' : 'bg-slate-700'
                            }`}
                          >
                            🇦🇺
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-white">Liam Henderson</span>
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                AU ACCENT
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block">Postgraduate Candidate</span>
                          </div>
                        </div>

                        {/* Animated Equalizer or Speaking Badge */}
                        {isAudioPlaying && activeSpeakerPersona === 'persona_b' ? (
                          <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>SPEAKING</span>
                            <div className="flex items-end gap-0.5 h-3 ml-1">
                              <span className="w-0.5 bg-emerald-400 h-full animate-bounce" />
                              <span className="w-0.5 bg-emerald-400 h-2/3 animate-bounce [animation-delay:0.2s]" />
                              <span className="w-0.5 bg-emerald-400 h-4/5 animate-bounce [animation-delay:0.4s]" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500 uppercase">
                            {isAudioPlaying ? 'LISTENING' : 'READY'}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-300 italic line-clamp-2 min-h-[32px] font-serif">
                        {isAudioPlaying && activeSpeakerPersona === 'persona_b'
                          ? `"${currentSpeaker?.text || currentSubtitleText}"`
                          : 'Awaiting turn in dialogue...'}
                      </div>
                    </div>
                  </div>

                  {/* Real-time Closed Caption Subtitle Strip */}
                  {showCaptions && (
                    <div className="p-4 rounded-xl bg-slate-900/90 text-white border border-slate-700/80 space-y-1.5 shadow-md">
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        <span className="flex items-center gap-1.5 text-blue-400">
                          <MessageSquare className="w-3.5 h-3.5" />
                          💬 Live Closed Captions
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {activeSpeakerPersona === 'persona_a' ? '🇬🇧 Arthur Davies (UK)' : activeSpeakerPersona === 'persona_b' ? '🇦🇺 Liam Henderson (AU)' : 'Narrator'}
                          </span>
                          <button
                            onClick={() => setShowCaptions(false)}
                            className="text-[10px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                          >
                            Hide
                          </button>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm font-medium italic text-slate-100 font-serif leading-relaxed">
                        {currentSpeaker?.text || currentSubtitleText || 'Audio playback is ready. Press play to begin Section 1 audio.'}
                      </p>
                    </div>
                  )}

                  {/* Pacing & Volume Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <button
                      onClick={handleStartMultiSpeakerAudio}
                      className={`px-6 py-3 rounded-xl font-bold text-xs text-white shadow-md transition inline-flex items-center gap-2 cursor-pointer ${
                        isAudioPlaying
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isAudioPlaying ? (
                        <>
                          <Square className="w-4 h-4 fill-current" />
                          <span>Pause Recording</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>{hasPlayedListeningOnce ? 'Replay Section Audio' : 'Play Multi-Speaker Recording'}</span>
                        </>
                      )}
                    </button>

                    {/* Anti-Scrubbing Read-Only Timestamp Bar */}
                    <div className="flex-1 max-w-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span>Progress (No Seeking in Exam)</span>
                        <span>{formatTimer(listeningPlaybackTimeSec)} / 05:30</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-300 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all duration-500"
                          style={{ width: `${Math.min(100, (listeningPlaybackTimeSec / 330) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Volume & Mute & Caption Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowCaptions(!showCaptions)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition flex items-center gap-1 cursor-pointer ${
                          showCaptions
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-inherit hover:bg-slate-500/10 text-slate-400'
                        }`}
                        title="Toggle Live Subtitles / Closed Captions"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{showCaptions ? 'Captions ON' : 'Captions OFF'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsListeningMuted(!isListeningMuted);
                          soundManager.playBeep(600, 0.02);
                        }}
                        className="p-2 rounded-lg border border-inherit hover:bg-slate-500/10 cursor-pointer"
                        title={isListeningMuted ? 'Unmute Audio' : 'Mute Audio'}
                      >
                        {isListeningMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-blue-600" />}
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
                          if (val === 0) setIsListeningMuted(true);
                          else setIsListeningMuted(false);
                        }}
                        className="w-20 accent-blue-600 cursor-pointer"
                        title="Adjust Master Volume"
                      />
                    </div>
                  </div>

                  {isListeningTransferPhase && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-mono text-xs font-bold text-center">
                      ⏳ 2-Minute Post-Audio Answer Check: {formatTimer(listeningTransferSec)} remaining
                    </div>
                  )}
                </div>
              </>
            )}

            {activeSkill === 'writing' && (
              <>
                <div className="border-b border-inherit pb-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600">
                      ACADEMIC WRITING MODULE · TASK {activeWritingTask}
                    </span>
                    <h1 className="text-xl sm:text-2xl font-black mt-1">
                      {activeWritingTask === 1
                        ? 'Writing Task 1 (Report · Min 150 Words)'
                        : 'Writing Task 2 (Essay · Min 250 Words)'}
                    </h1>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveWritingTask(1)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                        activeWritingTask === 1
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-inherit hover:bg-slate-500/10'
                      }`}
                    >
                      Task 1
                    </button>
                    <button
                      onClick={() => setActiveWritingTask(2)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                        activeWritingTask === 2
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-inherit hover:bg-slate-500/10'
                      }`}
                    >
                      Task 2
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-inherit bg-slate-500/5 space-y-3">
                  <div className="text-xs font-mono font-bold uppercase text-blue-600">
                    Prompt Instructions:
                  </div>
                  <p className="text-sm sm:text-base font-bold leading-relaxed">
                    {activeWritingTask === 1
                      ? currentSet.task1Prompt ||
                        'Summarise the main features of the statistical chart and make comparisons where relevant. Write at least 150 words.'
                      : currentSet.writingPrompt}
                  </p>
                  <p className="text-xs opacity-75">
                    {activeWritingTask === 1
                      ? 'You should spend about 20 minutes on this task. Write at least 150 words.'
                      : 'You should spend about 40 minutes on this task. Write at least 250 words.'}
                  </p>
                </div>
              </>
            )}

            <div className="p-3.5 rounded-xl border border-dashed border-inherit bg-slate-500/5 text-xs">
              <div className="flex items-center gap-2 font-bold mb-1">
                <Highlighter className="w-4 h-4 text-amber-500" />
                <span>Text Selection & Margin Notes Active</span>
              </div>
              <p className="opacity-80">
                Select any text in the passage or prompt to save a quote to your scratchpad notes.
              </p>
            </div>
          </div>
        </div>

        {/* Draggable Vertical Splitter Handle (Desktop) */}
        <div
          onMouseDown={handleSplitterMouseDown}
          className={`hidden md:flex w-2 hover:w-3 bg-slate-300 dark:bg-slate-700 cursor-col-resize items-center justify-center transition-all ${
            isDraggingSplitter ? 'bg-blue-600 w-3' : ''
          }`}
          title="Drag to resize passage and questions"
        >
          <div className="w-0.5 h-8 bg-slate-400 dark:bg-slate-500 rounded" />
        </div>

        {/* Right Column: Question Panel OR Writing Response Editor */}
        <div
          style={{ width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${100 - leftPanePercent}%` : '100%' }}
          className={`${
            mobilePane === 'right' ? 'flex' : 'hidden md:flex'
          } h-full p-5 sm:p-6 overflow-y-auto flex-col justify-between bg-inherit border-inherit`}
        >
          {activeSkill === 'writing' ? (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-inherit pb-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600">
                  CANDIDATE RESPONSE · TASK {activeWritingTask}
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                    (activeWritingTask === 1 ? task1WordCount >= 150 : task2WordCount >= 250)
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                  }`}
                >
                  Word Count: {activeWritingTask === 1 ? task1WordCount : task2WordCount} /{' '}
                  {activeWritingTask === 1 ? 150 : 250} min
                </span>
              </div>

              <textarea
                value={activeWritingTask === 1 ? task1Essay : task2Essay}
                onChange={(e) =>
                  activeWritingTask === 1
                    ? setTask1Essay(e.target.value)
                    : setTask2Essay(e.target.value)
                }
                placeholder={`Type your official Writing Task ${activeWritingTask} response here... (Auto-saved locally)`}
                className="flex-1 min-h-[320px] w-full p-4 rounded-xl border border-inherit bg-white/70 dark:bg-slate-900/50 text-sm sm:text-base leading-relaxed outline-none focus:ring-2 focus:ring-blue-500 resize-none font-sans"
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs opacity-75">
                  Spellcheck and grammar autocomplete are disabled per CD-IELTS rules.
                </span>
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
                >
                  Review & Submit Test
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-inherit pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600">
                      Question {activeQuestionIdx + 1} of {skillQuestions.length} ({activeQuestionObj?.type})
                    </span>
                  </div>
                  <button
                    onClick={() => toggleFlag(activeQuestionId)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${
                      flaggedQuestions.has(activeQuestionId)
                        ? 'bg-amber-500 text-black border-amber-600'
                        : 'border-inherit opacity-80 hover:opacity-100'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5 fill-current" />
                    <span>{flaggedQuestions.has(activeQuestionId) ? 'Flagged' : 'Flag for Review'}</span>
                  </button>
                </div>

                {/* Current Question Stem & Interactive Renderers */}
                {activeQuestionObj && (
                  <div id={`q-${activeQuestionObj.id}`} className="space-y-4">
                    <div className="p-4 rounded-xl border border-inherit bg-slate-500/5 text-sm sm:text-base space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-600 uppercase">
                          Question #{activeQuestionObj.id} · {activeQuestionObj.section.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
                          {activeQuestionObj.type}
                        </span>
                      </div>
                      <div className="font-bold leading-snug">{activeQuestionObj.prompt}</div>
                    </div>

                    {/* INTERACTIVE SVG MAP / DIAGRAM FLOORPLAN LABELING WIDGET */}
                    {activeQuestionObj.type.toLowerCase().includes('map') ||
                    activeQuestionObj.prompt.toLowerCase().includes('map') ||
                    activeQuestionObj.type.toLowerCase().includes('directional pin') ? (
                      <div className="space-y-3 pt-1">
                        <div className="p-4 rounded-2xl border border-inherit bg-slate-900/90 text-white space-y-3 shadow-xl">
                          <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-400">
                            <span>🗺️ Interactive University Campus Map</span>
                            <span>Click pin A–G to select location</span>
                          </div>

                          <svg viewBox="0 0 500 280" className="w-full h-auto rounded-xl border border-slate-700 bg-slate-950">
                            {/* Path and Grounds */}
                            <rect x="10" y="10" width="480" height="260" fill="#0b1329" rx="10" stroke="#1e293b" strokeWidth="2" />
                            <path d="M 50 140 L 450 140" stroke="#334155" strokeWidth="12" strokeDasharray="8 4" />
                            <text x="250" y="135" fill="#64748b" fontSize="10" fontFamily="sans-serif" textAnchor="middle">Pedestrian Gravel Path (North)</text>

                            {/* Buildings */}
                            <rect x="40" y="30" width="90" height="50" fill="#1e293b" stroke="#3b82f6" strokeWidth="1.5" rx="5" />
                            <text x="85" y="60" fill="#e2e8f0" fontSize="10" fontWeight="bold" textAnchor="middle">Clock Tower</text>

                            <rect x="160" y="30" width="100" height="50" fill="#1e293b" stroke="#3b82f6" strokeWidth="1.5" rx="5" />
                            <text x="210" y="60" fill="#e2e8f0" fontSize="10" fontWeight="bold" textAnchor="middle">Dining Hall</text>

                            <rect x="290" y="30" width="110" height="50" fill="#1e293b" stroke="#3b82f6" strokeWidth="1.5" rx="5" />
                            <text x="345" y="60" fill="#e2e8f0" fontSize="10" fontWeight="bold" textAnchor="middle">Central Library</text>

                            <rect x="50" y="180" width="120" height="60" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" rx="5" />
                            <text x="110" y="215" fill="#e2e8f0" fontSize="10" fontWeight="bold" textAnchor="middle">North Auditorium</text>

                            <rect x="210" y="180" width="130" height="60" fill="#0f172a" stroke="#10b981" strokeWidth="2" strokeDasharray="4 2" rx="5" />
                            <text x="275" y="210" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">Language Lab</text>
                            <text x="275" y="225" fill="#94a3b8" fontSize="8" textAnchor="middle">(Behind Auditorium)</text>

                            <rect x="370" y="180" width="90" height="60" fill="#1e293b" stroke="#3b82f6" strokeWidth="1.5" rx="5" />
                            <text x="415" y="215" fill="#e2e8f0" fontSize="10" fontWeight="bold" textAnchor="middle">Science Hub</text>

                            {/* Interactive Letter Pins */}
                            {[
                              { id: 'A', x: 85, y: 25, label: 'A) Opposite the Clock Tower' },
                              { id: 'B', x: 275, y: 170, label: 'B) Tucked behind the North Auditorium' },
                              { id: 'C', x: 415, y: 170, label: 'C) South of Science Hub' }
                            ].map((pin) => {
                              const isSelected = userAnswers[activeQuestionId] === pin.label;
                              return (
                                <g
                                  key={pin.id}
                                  onClick={() => {
                                    setUserAnswers((prev) => ({ ...prev, [activeQuestionId]: pin.label }));
                                    soundManager.playBeep(620, 0.03);
                                  }}
                                  className="cursor-pointer group"
                                >
                                  <circle
                                    cx={pin.x}
                                    cy={pin.y}
                                    r="14"
                                    fill={isSelected ? '#2563eb' : '#f59e0b'}
                                    stroke="#ffffff"
                                    strokeWidth="2"
                                  />
                                  <text
                                    x={pin.x}
                                    y={pin.y + 4}
                                    fill="#ffffff"
                                    fontSize="11"
                                    fontWeight="black"
                                    textAnchor="middle"
                                  >
                                    {pin.id}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>

                          {userAnswers[activeQuestionId] && (
                            <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-200 text-xs font-mono font-bold text-center">
                              Selected Pin: {userAnswers[activeQuestionId]}
                            </div>
                          )}
                        </div>

                        {/* Standard Option List Fallback */}
                        {activeQuestionObj.options && (
                          <div className="space-y-2 pt-1">
                            {activeQuestionObj.options.map((opt) => {
                              const isSelected = userAnswers[activeQuestionId] === opt;
                              return (
                                <label
                                  key={opt}
                                  onClick={() => {
                                    setUserAnswers((prev) => ({ ...prev, [activeQuestionId]: opt }));
                                    soundManager.playBeep(540, 0.03);
                                  }}
                                  className={`flex items-center gap-3 p-3 rounded-xl border border-inherit cursor-pointer transition ${
                                    isSelected ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-500/10 font-medium'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`q_${activeQuestionId}`}
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="accent-blue-600 w-4 h-4"
                                  />
                                  <span className="text-xs sm:text-sm">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : activeQuestionObj.type.toLowerCase().includes('heading') ||
                    activeQuestionObj.type.toLowerCase().includes('matching') ? (
                      <div className="space-y-3 pt-1">
                        <label className="block text-xs font-mono font-bold uppercase opacity-80">
                          Select Correct Heading / Section Match:
                        </label>
                        <select
                          value={userAnswers[activeQuestionId] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setUserAnswers((prev) => ({ ...prev, [activeQuestionId]: val }));
                            soundManager.playBeep(540, 0.03);
                          }}
                          className="w-full p-3.5 rounded-xl border border-inherit bg-white/90 dark:bg-slate-900 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="">-- Choose Heading Numeral --</option>
                          {['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'].map((num) => (
                            <option key={num} value={num}>
                              Heading {num}
                            </option>
                          ))}
                        </select>
                        {activeQuestionObj.options && activeQuestionObj.options.length > 0 && (
                          <div className="p-3 rounded-xl border border-inherit bg-slate-500/5 text-xs space-y-1">
                            <span className="font-bold block text-[10px] uppercase font-mono opacity-70">
                              Heading List Reference:
                            </span>
                            {activeQuestionObj.options.map((opt) => (
                              <div key={opt} className="opacity-90">{opt}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : activeQuestionObj.options && activeQuestionObj.options.length > 0 ? (
                      /* MULTIPLE CHOICE (SINGLE OR MULTI-SELECT) */
                      <div className="space-y-2.5 pt-1">
                        {activeQuestionObj.prompt.toUpperCase().includes('CHOOSE TWO') ||
                        activeQuestionObj.prompt.toUpperCase().includes('CHOOSE THREE') ? (
                          /* Multi-Select Checkboxes */
                          <div className="space-y-2">
                            <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 block">
                              ⚠️ MULTI-SELECT: {activeQuestionObj.prompt.toUpperCase().includes('CHOOSE THREE') ? 'Select THREE' : 'Select TWO'} letters
                            </span>
                            {activeQuestionObj.options.map((opt) => {
                              const letter = opt.split('.')[0]?.trim() || opt;
                              const currentSelected: string[] = (userAnswers[activeQuestionId] || '')
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean);
                              const isSelected = currentSelected.includes(letter);
                              const maxChoice = activeQuestionObj.prompt.toUpperCase().includes('CHOOSE THREE') ? 3 : 2;

                              return (
                                <label
                                  key={opt}
                                  onClick={() => {
                                    let updated: string[];
                                    if (isSelected) {
                                      updated = currentSelected.filter((item) => item !== letter);
                                    } else {
                                      if (currentSelected.length >= maxChoice) {
                                        updated = [...currentSelected.slice(1), letter];
                                      } else {
                                        updated = [...currentSelected, letter];
                                      }
                                    }
                                    setUserAnswers((prev) => ({
                                      ...prev,
                                      [activeQuestionId]: updated.join(', ')
                                    }));
                                    soundManager.playBeep(540, 0.03);
                                  }}
                                  className={`flex items-center gap-3 p-3.5 rounded-xl border border-inherit cursor-pointer transition ${
                                    isSelected
                                      ? 'bg-blue-600 text-white font-bold'
                                      : 'hover:bg-slate-500/10 font-medium'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="accent-blue-600 w-4 h-4 rounded"
                                  />
                                  <span className="text-xs sm:text-sm">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          /* Single-Choice Radio Cards */
                          activeQuestionObj.options.map((opt) => {
                            const optionLetter = opt.split('.')[0]?.trim() || opt;
                            const isSelected =
                              userAnswers[activeQuestionId] === opt ||
                              userAnswers[activeQuestionId] === optionLetter;
                            return (
                              <label
                                key={opt}
                                onClick={() => {
                                  setUserAnswers((prev) => ({
                                    ...prev,
                                    [activeQuestionId]: optionLetter
                                  }));
                                  soundManager.playBeep(540, 0.03);
                                }}
                                className={`flex items-center gap-3 p-3.5 rounded-xl border border-inherit cursor-pointer transition ${
                                  isSelected
                                    ? 'bg-blue-600 text-white font-bold'
                                    : 'hover:bg-slate-500/10 font-medium'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`q_${activeQuestionId}`}
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="accent-blue-600 w-4 h-4"
                                />
                                <span className="text-xs sm:text-sm">{opt}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    ) : activeQuestionObj.type.toLowerCase().includes('true / false') ||
                      activeQuestionObj.type.toLowerCase().includes('yes / no') ? (
                      /* TRUE / FALSE / NOT GIVEN CARDS */
                      <div className="space-y-2.5 pt-1">
                        {(activeQuestionObj.type.toLowerCase().includes('yes / no')
                          ? ['YES', 'NO', 'NOT GIVEN']
                          : ['TRUE', 'FALSE', 'NOT GIVEN']
                        ).map((opt) => {
                          const isSelected = userAnswers[activeQuestionId] === opt;
                          return (
                            <label
                              key={opt}
                              onClick={() => {
                                setUserAnswers((prev) => ({ ...prev, [activeQuestionId]: opt }));
                                soundManager.playBeep(540, 0.03);
                              }}
                              className={`flex items-center gap-3 p-3.5 rounded-xl border border-inherit cursor-pointer transition ${
                                isSelected
                                  ? 'bg-slate-900 text-white dark:bg-blue-600 font-black shadow-md border-slate-900'
                                  : 'hover:bg-slate-500/10 font-medium'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q_${activeQuestionId}`}
                                checked={isSelected}
                                onChange={() => {}}
                                className="accent-blue-600 w-4 h-4"
                              />
                              <span className="text-xs sm:text-sm">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      /* SUMMARY GAP-FILL / SHORT ANSWER INPUT */
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-mono font-bold uppercase opacity-80">
                            Type Exact Candidate Response:
                          </label>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            NO MORE THAN TWO WORDS AND/OR A NUMBER
                          </span>
                        </div>
                        <input
                          type="text"
                          value={userAnswers[activeQuestionId] || ''}
                          onChange={(e) =>
                            setUserAnswers((prev) => ({
                              ...prev,
                              [activeQuestionId]: e.target.value
                            }))
                          }
                          placeholder="Type response here (e.g., PENNINGTON, 6 WEEKS)..."
                          className="w-full p-3.5 rounded-xl border border-inherit bg-white/90 dark:bg-slate-900 text-sm sm:text-base font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {userAnswers[activeQuestionId] && (
                          <div className="text-[10px] font-mono text-slate-500">
                            Word count: {userAnswers[activeQuestionId].trim().split(/\s+/).length} words
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Question Navigation Buttons */}
              <div className="pt-6 border-t border-inherit flex items-center justify-between gap-3 mt-6">
                <button
                  disabled={activeQuestionIdx <= 0}
                  onClick={() => {
                    setActiveQuestionIdx((q) => Math.max(0, q - 1));
                    soundManager.playBeep(480, 0.03);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-inherit text-xs font-bold disabled:opacity-30 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  onClick={() => setShowReviewModal(true)}
                  className="px-3.5 py-2 rounded-xl border border-inherit text-xs font-mono font-bold hover:bg-slate-500/10"
                >
                  Review & Submit ({answeredCount}/{totalQuestions})
                </button>

                <button
                  disabled={activeQuestionIdx >= skillQuestions.length - 1}
                  onClick={() => {
                    setActiveQuestionIdx((q) => Math.min(skillQuestions.length - 1, q + 1));
                    soundManager.playBeep(520, 0.03);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-30 flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ================= 3. BOTTOM QUESTION PALETTE & STATUS BAR ================= */}
      <footer className="w-full border-t border-inherit p-3 bg-inherit backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 px-1 text-xs font-mono font-bold">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-600" /> Answered ({answeredCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-inherit" /> Unanswered ({unansweredCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500" /> Flagged ({flaggedQuestions.size})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowReviewModal(true)}
              className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
            >
              Finish & Grade Test
            </button>
            <button
              onClick={() => setShowPalette(!showPalette)}
              className="text-xs text-slate-500 hover:underline"
            >
              {showPalette ? 'Hide Palette' : 'Show Palette'}
            </button>
          </div>
        </div>

        {/* Question Button Matrix (Questions 1 to 40) with CD-IELTS tab styling */}
        {showPalette && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 px-1 uppercase tracking-wider">
              <span>Section 1 (1–5) · Section 2 (6–10)</span>
              <span>Tap tab to scroll & jump</span>
            </div>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-1 scrollbar-none">
              {currentSet.questions.map((q) => {
                const isAnswered = Boolean(userAnswers[q.id]?.trim());
                const isFlagged = flaggedQuestions.has(q.id);
                const isActive = activeQuestionId === q.id && activeSkill !== 'writing';

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setActiveSkill(q.section);
                      const sectionList = currentSet.questions.filter((item) => item.section === q.section);
                      const idxInSection = sectionList.findIndex((item) => item.id === q.id);
                      setActiveQuestionIdx(idxInSection >= 0 ? idxInSection : 0);
                      setMobilePane('right');
                      soundManager.playBeep(550, 0.025);

                      // Smooth scroll to question element if present
                      setTimeout(() => {
                        document.getElementById(`q-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 50);
                    }}
                    className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center border cursor-pointer ${
                      isActive ? 'ring-2 ring-blue-500 scale-105 z-10' : ''
                    } ${
                      isAnswered
                        ? 'bg-slate-900 text-white dark:bg-blue-600 border-slate-900 shadow-sm'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                    title={`Question ${q.id} (${q.section.toUpperCase()})${isAnswered ? ' - Answered' : ' - Unanswered'}${isFlagged ? ' - Flagged' : ''}`}
                  >
                    <span>{q.id}</span>
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-[8px] text-black font-black">
                        🚩
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </footer>

      {/* Floating Text Selection Annotation Tooltip Menu */}
      {selectionMenu && (
        <div
          style={{
            position: 'fixed',
            left: `${selectionMenu.x}px`,
            top: `${selectionMenu.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
          className="selection-tooltip-menu z-50 bg-slate-900 text-white rounded-xl shadow-2xl p-1.5 flex items-center gap-1.5 text-xs border border-slate-700 animate-fade-in"
        >
          <button
            onClick={() => toggleHighlight(selectionMenu.text)}
            className="px-2.5 py-1 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>{highlights.includes(selectionMenu.text) ? 'Clear Highlight' : 'Highlight (Yellow)'}</span>
          </button>
          <button
            onClick={() => {
              setActiveQuote(selectionMenu.text);
              setShowNotesDrawer(true);
              setSelectionMenu(null);
            }}
            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>Add Note</span>
          </button>
          <button
            onClick={() => setSelectionMenu(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            title="Close toolbar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ================= 4. SLIDE-OUT NOTES DRAWER ================= */}
      {showNotesDrawer && (
        <aside className="fixed top-12 right-0 bottom-0 w-80 bg-inherit border-l border-inherit p-4 z-50 shadow-2xl flex flex-col justify-between animate-fade-in">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-inherit pb-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <StickyNote className="w-4 h-4 text-amber-500" />
                <span>Candidate Notes Scratchpad</span>
              </div>
              <button
                onClick={() => setShowNotesDrawer(false)}
                className="p-1 rounded hover:bg-slate-500/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeQuote && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                <div className="font-bold text-[10px] uppercase font-mono text-amber-600">Selected Quote:</div>
                <div className="italic mt-1 line-clamp-3">"{activeQuote}"</div>
              </div>
            )}

            <div className="space-y-2">
              <textarea
                value={newNoteInput}
                onChange={(e) => setNewNoteInput(e.target.value)}
                placeholder="Type note or synonym observation..."
                className="w-full h-24 p-2.5 rounded-lg border border-inherit bg-transparent text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleAddNote}
                className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-bold transition hover:bg-blue-700"
              >
                Save Note
              </button>
            </div>

            {/* List of saved notes */}
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              {notes.map((n) => (
                <div key={n.id} className="p-2 rounded-lg border border-inherit text-xs space-y-1">
                  <div className="flex items-center justify-between font-mono text-[10px] opacity-70">
                    <span>At {n.timestamp}</span>
                  </div>
                  {n.selectedQuote && (
                    <div className="text-[11px] opacity-80 italic">"{n.selectedQuote}"</div>
                  )}
                  <div className="font-semibold">{n.text}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* ================= 5. HELP & INSTRUCTIONS MODAL ================= */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-inherit pb-2">
              <h3 className="text-base font-bold flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <span>CD-IELTS Simulator Instructions</span>
              </h3>
              <button onClick={() => setShowHelpModal(false)} className="p-1 rounded hover:bg-slate-500/10">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-3 leading-relaxed text-slate-600 dark:text-slate-300">
              <p>
                <strong>Navigating Questions:</strong> Click any question number in the bottom palette or use the Previous/Next buttons to move across Listening, Reading, and Writing tasks.
              </p>
              <p>
                <strong>Reviewing Questions:</strong> Click "Flag for Review" to mark a question with an amber indicator so you can return before submitting.
              </p>
              <p>
                <strong>Highlighting & Notes:</strong> Select any text in the passage with your cursor to open the candidate notes scratchpad.
              </p>
              <p>
                <strong>Instant Band Grading & Mistake Vault:</strong> When you click "Finish & Grade Test", your answers are evaluated against the Cambridge-aligned key, your Band Score is saved to your profile, and any incorrect answers are automatically added to your Mistake Vault.
              </p>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
            >
              Return to Test
            </button>
          </div>
        </div>
      )}

      {/* ================= 6. REVIEW STATUS & SUBMIT MODAL ================= */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold">Review Your Test Progress</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Check your unanswered or flagged items before grading {currentSet.title}.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2 text-center">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="text-lg font-black text-blue-600 font-mono">{answeredCount}</div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Answered</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="text-lg font-black text-amber-600 font-mono">{flaggedQuestions.size}</div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Flagged</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-500/10 border border-slate-500/20">
                <div className="text-lg font-black text-slate-600 dark:text-slate-300 font-mono">{unansweredCount}</div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Unanswered</div>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>You have {unansweredCount} unanswered questions in this set.</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setShowReviewModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs"
              >
                Continue Test
              </button>
              <button
                onClick={handleFinalSubmit}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
              >
                Grade & View Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 7. POST-SUBMISSION SCORECARD & EXPLANATION REVIEW MODAL ================= */}
      {submittedResults && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-3xl my-8 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xl space-y-6 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-mono font-bold uppercase text-emerald-600">
                    CD-IELTS Diagnostic Report
                  </span>
                  <h3 className="text-xl font-black">{currentSet.title} — Results</h3>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase text-slate-500">Overall Band</div>
                <div className="text-3xl font-black font-mono text-blue-600">
                  {submittedResults.overallBand > 0 ? submittedResults.overallBand.toFixed(1) : 'N/A'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-bold text-slate-500 uppercase">Listening</div>
                <div className="text-2xl font-black text-blue-600 font-mono mt-1">
                  {submittedResults.listeningBand > 0 ? `Band ${submittedResults.listeningBand.toFixed(1)}` : '—'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {submittedResults.listeningCorrect} / {submittedResults.listeningTotal} Correct
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-bold text-slate-500 uppercase">Academic Reading</div>
                <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
                  {submittedResults.readingBand > 0 ? `Band ${submittedResults.readingBand.toFixed(1)}` : '—'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {submittedResults.readingCorrect} / {submittedResults.readingTotal} Correct
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-bold text-slate-500 uppercase">Academic Writing</div>
                <div className="text-2xl font-black text-amber-600 font-mono mt-1">
                  {submittedResults.writingBand > 0 ? `Band ${submittedResults.writingBand.toFixed(1)}` : '—'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {submittedResults.wordCount} words written
                </div>
              </div>
            </div>

            {/* Detailed Question-by-Question Answer Key & Explanations */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                Answer Key & Examiner Explanations
              </h4>
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {currentSet.questions.map((q) => {
                  const userVal = userAnswers[q.id] || '';
                  const correct = isQuestionCorrect(q, userVal);
                  return (
                    <div
                      key={q.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                        correct
                          ? 'bg-emerald-500/5 border-emerald-500/30'
                          : 'bg-rose-500/5 border-rose-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 font-bold">
                        <span>
                          Q{q.id} ({q.section.toUpperCase()}): {q.prompt}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase ${
                            correct
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {correct ? 'Correct' : 'Review'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-[11px]">
                        <span>
                          <strong>Your Answer:</strong> {userVal || 'Unanswered'}
                        </span>
                        <span>
                          <strong>Correct Answer:</strong>{' '}
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {q.correctAnswer}
                          </span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        <strong>Examiner Note:</strong> {q.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSubmittedResults(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs"
              >
                Review Passage Again
              </button>
              <button
                onClick={onExit}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
              >
                Save & Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 8. OFFICIAL WARNING MODAL (10m / 5m) ================= */}
      {warningModalText && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Test Administration Alert
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {warningModalText}
            </p>
            <button
              onClick={() => {
                setWarningModalText(null);
                soundManager.playBeep(640, 0.03);
              }}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
            >
              Acknowledge & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

