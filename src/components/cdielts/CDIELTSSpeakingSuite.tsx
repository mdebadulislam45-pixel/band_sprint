import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  Volume2,
  Clock,
  Play,
  RotateCcw,
  CheckCircle2,
  Award,
  AlertCircle,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowRight,
  Loader2,
  UserCheck,
  ShieldCheck,
  Settings,
  HelpCircle,
  BookOpen,
  Eye,
  EyeOff
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { getPreferredVoiceGender, setPreferredVoiceGender } from '../../config/voiceConfig';
import { firebaseSyncService } from '../../services/firebaseSyncService';
import { getStoredSessionToken } from '../../services/authService';
import { SpeakingAssessmentStatus } from '../../types/speakingTypes';
import { roundOfficialIELTSBand } from '../../utils/scoringIntegrity';
import { setBarnabyAnalyzing } from '../../utils/getBarnabyState';
import {
  CDIELTSColorScheme,
  CDIELTSZoomLevel,
  getCDIELTSThemeClasses,
  getCDIELTSFontSizeClass
} from './CDIELTSThemeContainer';
import { SprintTRFModal } from './SprintTRFModal';
import { ExaminerHumanoidCanvas } from '../speaking/ExaminerHumanoidCanvas';

interface CDIELTSSpeakingSuiteProps {
  onExit: () => void;
  onShowToast: (msg: string) => void;
  candidateName?: string;
  onOpenPracticeLabs?: () => void;
}

type SpeakingStage = 'intro' | 'part1' | 'part2_prep' | 'part2_speak' | 'part3' | 'result';

export interface CDIELTSSpeakingEvaluation {
  assessmentStatus: SpeakingAssessmentStatus;
  evidenceMode: 'audio_and_transcript' | 'transcript_only' | 'unavailable';
  pronunciationObservable: boolean;
  isPartialAssessment: boolean;
  unassessedCriteria: string[];
  overallBand: number | null;
  partialThreeCriterionIndex: number | null;
  fluencyBand: number | null;
  lexicalBand: number | null;
  grammarBand: number | null;
  pronunciationBand: number | null;
  examinerFeedback: string;
  disclaimer?: string;
  error?: string;
  canRetry?: boolean;
  authRequired?: boolean;
  wordCount: number;
}

function parseOptionalBand(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 1.0 || value > 9.0) return null;
  if (Math.abs(value * 2 - Math.round(value * 2)) > 1e-6) return null;
  return Math.round(value * 2) / 2;
}

export function buildCDIELTSAuthHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const cleanToken = typeof token === 'string' ? token.trim() : '';
  if (cleanToken) {
    headers['Authorization'] = `Bearer ${cleanToken}`;
  }
  return headers;
}

export function buildCDIELTSInsufficientEvaluation(wordCount: number): CDIELTSSpeakingEvaluation {
  return {
    assessmentStatus: 'insufficient_evidence',
    evidenceMode: 'transcript_only',
    pronunciationObservable: false,
    isPartialAssessment: true,
    unassessedCriteria: [
      'Fluency & Coherence',
      'Lexical Resource',
      'Grammatical Range & Accuracy',
      'Pronunciation'
    ],
    overallBand: null,
    partialThreeCriterionIndex: null,
    fluencyBand: null,
    lexicalBand: null,
    grammarBand: null,
    pronunciationBand: null,
    examinerFeedback:
      'No sufficient spoken response was recorded during this session (minimum 5 spoken words required). No synthetic band score was generated.',
    canRetry: false,
    authRequired: false,
    wordCount
  };
}

export function buildCDIELTSUnavailableEvaluation(params: {
  wordCount: number;
  message: string;
  authRequired?: boolean;
  canRetry?: boolean;
}): CDIELTSSpeakingEvaluation {
  return {
    assessmentStatus: 'unavailable',
    evidenceMode: 'unavailable',
    pronunciationObservable: false,
    isPartialAssessment: true,
    unassessedCriteria: [
      'Fluency & Coherence',
      'Lexical Resource',
      'Grammatical Range & Accuracy',
      'Pronunciation'
    ],
    overallBand: null,
    partialThreeCriterionIndex: null,
    fluencyBand: null,
    lexicalBand: null,
    grammarBand: null,
    pronunciationBand: null,
    examinerFeedback: params.message,
    error: params.message,
    authRequired: Boolean(params.authRequired),
    canRetry: Boolean(params.canRetry),
    wordCount: params.wordCount
  };
}

/**
 * Maps a `/api/evaluate-speaking-turn` Phase 3B.1 response into a null-safe CDIELTSSpeakingEvaluation.
 * Never fabricates fallback bands or copies overall scores into unassessed Pronunciation.
 */
export function mapSpeakingTurnApiResponseToCDIELTS(
  data: Record<string, any> | null | undefined,
  wordCount: number
): CDIELTSSpeakingEvaluation {
  if (!data || typeof data !== 'object') {
    return buildCDIELTSUnavailableEvaluation({
      wordCount,
      message: 'AI speaking evaluation returned an empty response. No band score was generated.',
      canRetry: true
    });
  }

  if (data.assessmentStatus === 'insufficient_evidence') {
    return {
      ...buildCDIELTSInsufficientEvaluation(
        typeof data.wordCount === 'number' && Number.isFinite(data.wordCount) ? data.wordCount : wordCount
      ),
      examinerFeedback:
        data.feedbackEn ||
        data.error ||
        'Insufficient speech sample recorded. Speak at least 5 words to receive an evaluation.'
    };
  }

  if (data.assessmentStatus === 'unavailable' || data.isValidAttempt === false) {
    return buildCDIELTSUnavailableEvaluation({
      wordCount,
      message:
        data.feedbackEn ||
        data.error ||
        'AI speaking evaluation is currently unavailable. No fallback score was generated.',
      authRequired: Boolean(data.authRequired),
      canRetry: data.canRetry !== false && !data.authRequired
    });
  }

  const fc = parseOptionalBand(data.criteria?.fc ?? data.estimatedBands?.fluency);
  const lr = parseOptionalBand(data.criteria?.lr ?? data.estimatedBands?.lexical);
  const gra = parseOptionalBand(data.criteria?.gra ?? data.estimatedBands?.grammar);
  const pr = parseOptionalBand(data.criteria?.pr ?? data.estimatedBands?.pronunciation);

  if (fc === null || lr === null || gra === null) {
    return buildCDIELTSUnavailableEvaluation({
      wordCount,
      message:
        'AI speaking response was missing required criterion scores. No fallback score was fabricated.',
      canRetry: true
    });
  }

  const pronunciationObservable =
    data.pronunciationObservable === true &&
    data.evidenceMode === 'audio_and_transcript' &&
    pr !== null;

  const feedbackParts: string[] = [];
  if (typeof data.feedbackEn === 'string' && data.feedbackEn.trim()) {
    feedbackParts.push(data.feedbackEn.trim());
  } else if (typeof data.examinerFeedback === 'string' && data.examinerFeedback.trim()) {
    feedbackParts.push(data.examinerFeedback.trim());
  }
  if (Array.isArray(data.actionableTips) && data.actionableTips.length > 0) {
    const cleanTips = data.actionableTips
      .filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
      .slice(0, 3);
    if (cleanTips.length > 0) {
      feedbackParts.push(cleanTips.join(' '));
    }
  }
  const examinerFeedback =
    feedbackParts.join(' ') ||
    (pronunciationObservable
      ? 'Evaluated across Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, and Pronunciation.'
      : 'Evaluated on transcript evidence across Fluency & Coherence, Lexical Resource, and Grammatical Range & Accuracy. Pronunciation requires audio evidence and remains unassessed.');

  const unassessedCriteria: string[] = Array.isArray(data.unassessedCriteria)
    ? data.unassessedCriteria.filter((c: unknown): c is string => typeof c === 'string' && c.trim().length > 0)
    : pronunciationObservable
    ? []
    : ['Pronunciation'];

  const resolvedWordCount =
    typeof data.wordCount === 'number' && Number.isFinite(data.wordCount) ? data.wordCount : wordCount;

  if (pronunciationObservable && pr !== null) {
    const rawOverall = parseOptionalBand(data.overallBand ?? data.estimatedBands?.overall);
    const computedOverall = rawOverall ?? roundOfficialIELTSBand((fc + lr + gra + pr) / 4);
    return {
      assessmentStatus: 'evaluated',
      evidenceMode: 'audio_and_transcript',
      pronunciationObservable: true,
      isPartialAssessment: false,
      unassessedCriteria: [],
      overallBand: computedOverall,
      partialThreeCriterionIndex: null,
      fluencyBand: fc,
      lexicalBand: lr,
      grammarBand: gra,
      pronunciationBand: pr,
      examinerFeedback,
      disclaimer: typeof data.disclaimer === 'string' ? data.disclaimer : undefined,
      canRetry: false,
      authRequired: false,
      wordCount: resolvedWordCount
    };
  }

  // Transcript-only partial assessment: preserve overallBand: null and partialThreeCriterionIndex separately
  const parsedPartial = parseOptionalBand(data.partialThreeCriterionIndex);
  const partialThreeCriterionIndex = parsedPartial ?? roundOfficialIELTSBand((fc + lr + gra) / 3);

  return {
    assessmentStatus: 'partial_transcript_only',
    evidenceMode: 'transcript_only',
    pronunciationObservable: false,
    isPartialAssessment: true,
    unassessedCriteria: unassessedCriteria.length > 0 ? unassessedCriteria : ['Pronunciation'],
    overallBand: null,
    partialThreeCriterionIndex,
    fluencyBand: fc,
    lexicalBand: lr,
    grammarBand: gra,
    pronunciationBand: null,
    examinerFeedback,
    disclaimer:
      typeof data.disclaimer === 'string' && data.disclaimer.trim()
        ? data.disclaimer
        : 'Transcript-only assessment: Pronunciation cannot be evaluated without audio. Overall Speaking Band is omitted; 3-criterion transcript index is shown separately.',
    canRetry: false,
    authRequired: false,
    wordCount: resolvedWordCount
  };
}

/**
 * Only complete 4-criterion Speaking assessments with observable Pronunciation and a valid
 * numeric overallBand may be persisted to Firestore /users/{uid}/submissions.
 */
export function shouldPersistCDIELTSSpeakingToFirestore(
  evaluation: CDIELTSSpeakingEvaluation | null
): boolean {
  if (!evaluation) return false;
  return (
    evaluation.assessmentStatus === 'evaluated' &&
    evaluation.evidenceMode === 'audio_and_transcript' &&
    evaluation.pronunciationObservable === true &&
    evaluation.isPartialAssessment === false &&
    typeof evaluation.overallBand === 'number' &&
    Number.isFinite(evaluation.overallBand) &&
    evaluation.overallBand >= 1.0 &&
    evaluation.overallBand <= 9.0 &&
    typeof evaluation.pronunciationBand === 'number'
  );
}

interface SpeakingTestSet {
  id: string;
  title: string;
  topicArea: string;
  part1Questions: string[];
  part2CueCard: {
    title: string;
    cues: string[];
  };
  part3Questions: string[];
  practiceGuide: {
    part1Model: string;
    part2Model: string;
    part3Model: string;
    keyVocabulary: string[];
    examinerTip: string;
  };
}

const SPEAKING_TEST_SETS: SpeakingTestSet[] = [
  {
    id: 'set-environment',
    title: 'Practice Set 1 · Environment & Sustainability',
    topicArea: 'Hometown, Work/Study & Environmental Initiatives',
    part1Questions: [
      'Good afternoon. Can you tell me your full name, please?',
      'Where are you from, and what do you like most about your hometown?',
      'Do you work, or are you currently a student?',
      'How do you usually like to relax after a busy day or week?'
    ],
    part2CueCard: {
      title: 'Describe a significant environmental project or initiative you know about.',
      cues: [
        'What the project or initiative is',
        'Where and when it was implemented',
        'How it addresses specific environmental challenges',
        'And explain why you think this initiative is important or successful.'
      ]
    },
    part3Questions: [
      'To what extent do you believe individuals are responsible for environmental conservation compared to governments?',
      'How has public awareness of climate change shifted over the last decade in your country?',
      'Do you think technology will solve our environmental crises or create new ones?'
    ],
    practiceGuide: {
      part1Model:
        '"I come from a lively coastal city that has undergone rapid modernisation over the past decade. What I appreciate most about it is the blend of historic neighbourhoods and green public waterfronts where residents gather in the evening."',
      part2Model:
        '"One environmental initiative that stands out to me is an urban mangrove restoration programme launched along our southern coastline about five years ago. Local environmental agencies collaborated with university researchers and coastal communities to replant native mangrove saplings across degraded tidal zones. It directly addresses two urgent challenges: coastal erosion caused by rising sea levels and the loss of marine biodiversity. Beyond acting as a natural storm barrier, mangroves sequester far more carbon per hectare than terrestrial forests. I consider the project genuinely successful because it combined ecological science with local livelihoods—fishermen now serve as paid stewards of the reserve, ensuring long-term protection rather than a short-lived campaign."',
      part3Model:
        '"While individual habits such as reducing single-use plastics certainly help cultivate environmental responsibility, systemic change rests predominantly with governments and industry. Policy instruments—like carbon pricing, renewable grid subsidies, and strict manufacturing regulations—operate at a scale that personal consumer choices alone cannot match."',
      keyVocabulary: [
        'carbon sequestration',
        'mitigate coastal erosion',
        'systemic policy reform',
        'long-term ecological stewardship',
        'grassroots participation',
        'viable sustainable alternative'
      ],
      examinerTip:
        'In Part 2, spend ~15 seconds on each of the first three bullets and ~60 seconds expanding on the final "explain why" bullet for natural depth and coherence.'
    }
  },
  {
    id: 'set-transport',
    title: 'Practice Set 2 · Travel & Urban Mobility',
    topicArea: 'Daily Commute, Memorable Journeys & Public Transit',
    part1Questions: [
      'Good afternoon. Could you tell me your full name, please?',
      'How do you usually travel to work or university each day?',
      'Do you prefer travelling alone or with family and friends?',
      'Is there a place in your country you would like to visit in the future?'
    ],
    part2CueCard: {
      title: 'Describe a memorable journey you made using public transport.',
      cues: [
        'Where you were going and why',
        'What type of public transport you used',
        'What happened during the journey',
        'And explain why this journey remains memorable to you.'
      ]
    },
    part3Questions: [
      'What are the main factors that discourage people from using public transport in large cities?',
      'Should governments subsidise public transit heavily even if it increases public spending?',
      'How might autonomous vehicles and high-speed rail reshape long-distance travel over the next twenty years?'
    ],
    practiceGuide: {
      part1Model:
        '"On weekdays I rely primarily on the suburban rail network because driving during peak hours is both unpredictable and exhausting. The thirty-minute commute actually gives me uninterrupted time to catch up on podcasts or read."',
      part2Model:
        '"A public transport journey I still remember vividly was an overnight sleeper train I took across the northern highlands two winters ago to attend a close friend’s graduation. Rather than taking a short domestic flight, I chose the rail route specifically to experience the mountain scenery. Halfway through the night, heavy snowfall forced a brief unscheduled stop at a tiny rural station, and passengers from several carriages gathered in the dining car over hot tea while engineers cleared the line. By sunrise, the train was gliding past snow-covered valleys under a clear sky. What made the trip unforgettable was not just the dramatic landscape, but the unexpected sense of camaraderie among complete strangers."',
      part3Model:
        '"Reliability and last-mile connectivity are usually the decisive barriers. Commuters are rarely reluctant to leave their cars behind if trains and buses arrive punctually, remain affordable, and connect smoothly to residential neighbourhoods."',
      keyVocabulary: [
        'last-mile connectivity',
        'congestion alleviation',
        'punctual and dependable',
        'publicly subsidised infrastructure',
        'sense of camaraderie',
        'modal shift away from private cars'
      ],
      examinerTip:
        'Use natural narrative signposts in Part 2 ("Initially...", "Halfway through...", "Looking back...") to demonstrate effortless Fluency & Coherence.'
    }
  },
  {
    id: 'set-education',
    title: 'Practice Set 3 · Technology & Modern Learning',
    topicArea: 'Reading Habits, Learning Skills & Digital Education',
    part1Questions: [
      'Good afternoon. Can you confirm your full name, please?',
      'What kind of things do you enjoy reading or watching in your spare time?',
      'Do you find it easy to concentrate when studying or working on a screen?',
      'What new skill would you like to learn over the next year?'
    ],
    part2CueCard: {
      title: 'Describe a useful skill you learned with the help of technology or the internet.',
      cues: [
        'What the skill is',
        'How you learned it online or using digital tools',
        'What difficulties you encountered while learning',
        'And explain how this skill has benefited you.'
      ]
    },
    part3Questions: [
      'In what ways has online education broadened access to learning, and what limitations remain?',
      'Do you think traditional university lectures will eventually be replaced by self-paced digital courses?',
      'How should schools teach students to evaluate the reliability of information they find online?'
    ],
    practiceGuide: {
      part1Model:
        '"I genuinely enjoy long-form essays and science documentaries because they unpack complex topics at a measured pace rather than compressing everything into thirty-second clips."',
      part2Model:
        '"Two years ago I taught myself statistical data visualisation using interactive online tutorials and open-source software. Initially I struggled to grasp how to clean messy datasets and write reproducible scripts without getting overwhelmed by technical jargon. To overcome that hurdle, I stopped passively watching videos and started rebuilding real public datasets—such as municipal energy reports—from scratch each weekend. Whenever I hit a snag, community forums helped me debug my approach. That skill has transformed my academic and professional work: I can now turn raw spreadsheets into clear visual arguments in a fraction of the time."',
      part3Model:
        '"Digital platforms have undeniably democratised access to world-class instruction for learners outside major urban centres. Nevertheless, self-paced courses still struggle to replicate the spontaneous debate, mentorship, and peer accountability of an in-person seminar."',
      keyVocabulary: [
        'democratise access to education',
        'critical information literacy',
        'peer accountability',
        'self-directed learning',
        'bridge the digital divide',
        'overcome an initial learning curve'
      ],
      examinerTip:
        'In Part 3, avoid repeating the question verbatim—open with a nuanced stance ("That depends largely on...", "While it is true that...") and support it with one concrete example.'
    }
  }
];

export const CDIELTSSpeakingSuite: React.FC<CDIELTSSpeakingSuiteProps> = ({
  onExit,
  onShowToast,
  candidateName = 'Candidate',
  onOpenPracticeLabs
}) => {
  // Theme & Contrast state
  const [colorScheme, setColorScheme] = useState<CDIELTSColorScheme>('standard');
  const [zoomLevel, setZoomLevel] = useState<CDIELTSZoomLevel>('100%');

  // Examiner persona state
  const [examinerGender, setExaminerGender] = useState<'female' | 'male'>(() => getPreferredVoiceGender());
  const [isExaminerSpeaking, setIsExaminerSpeaking] = useState<boolean>(false);
  const [activeSpokenPrompt, setActiveSpokenPrompt] = useState<string>('');

  const [stage, setStage] = useState<SpeakingStage>('intro');
  const [prepSecondsLeft, setPrepSecondsLeft] = useState<number>(60);
  const [speakSecondsLeft, setSpeakSecondsLeft] = useState<number>(120);
  const [isPrepTimerRunning, setIsPrepTimerRunning] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [candidateNotes, setCandidateNotes] = useState<string>('');
  const [spokenTranscript, setSpokenTranscript] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<CDIELTSSpeakingEvaluation | null>(null);
  const [showTRFModal, setShowTRFModal] = useState<boolean>(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);

  // Inspera Options Menu, Practice Mode Guides & Exam Clock State
  const [selectedTopicSetIdx, setSelectedTopicSetIdx] = useState<number>(0);
  const [showOptionsMenu, setShowOptionsMenu] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showPracticeGuideModal, setShowPracticeGuideModal] = useState<boolean>(false);
  const [practiceGuideTab, setPracticeGuideTab] = useState<'part1' | 'part2' | 'part3'>('part1');
  const [showLiveMetrics, setShowLiveMetrics] = useState<boolean>(false);
  const [hidePromptText, setHidePromptText] = useState<boolean>(false);
  const [isTimeHidden, setIsTimeHidden] = useState<boolean>(false);
  const [elapsedSessionSec, setElapsedSessionSec] = useState<number>(0);
  const optionsMenuRef = useRef<HTMLDivElement | null>(null);

  const activeSet = SPEAKING_TEST_SETS[selectedTopicSetIdx] || SPEAKING_TEST_SETS[0];
  const candidateId = React.useMemo(() => {
    const clean = (candidateName || 'CANDIDATE').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return `SPK-${(clean.slice(0, 4) || 'USER').padEnd(4, '0')}`;
  }, [candidateName]);

  // Part 1 index
  const [part1QuestionIdx, setPart1QuestionIdx] = useState<number>(0);
  // Part 3 index
  const [part3QuestionIdx, setPart3QuestionIdx] = useState<number>(0);

  // Audio recording & speech recognition refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [capturedAudioBytes, setCapturedAudioBytes] = useState<number>(0);
  const [capturedAudioStage, setCapturedAudioStage] = useState<SpeakingStage | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const formatClock = (totalSeconds: number): string => {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const clearStageAudio = useCallback(() => {
    setAudioUrl((prev) => {
      if (prev) {
        try {
          URL.revokeObjectURL(prev);
        } catch {}
      }
      return null;
    });
    setCapturedAudioBytes(0);
    setCapturedAudioStage(null);
    setMicError(null);
  }, []);

  const part1Questions = activeSet.part1Questions;
  const part2CueCard = activeSet.part2CueCard;
  const part3Questions = activeSet.part3Questions;

  // Close Options dropdown on outside click or Escape
  useEffect(() => {
    if (!showOptionsMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowOptionsMenu(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showOptionsMenu]);

  // Elapsed speaking interview session clock (active during Part 1, Part 2, Part 3)
  useEffect(() => {
    if (stage === 'intro' || stage === 'result') return;
    const id = setInterval(() => {
      setElapsedSessionSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [stage]);

  // Hide floating Barnaby companion during timed Speaking exam & clean up audio on unmount
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
      stopSpeech();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Part 2 60-Second Prep Timer (stable 1s interval without per-tick teardown)
  useEffect(() => {
    if (stage !== 'part2_prep' || !isPrepTimerRunning) return;
    const interval = setInterval(() => {
      setPrepSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsPrepTimerRunning(false);
          soundManager.playBeep(600, 0.3);
          setTimeout(() => {
            onShowToast('Preparation time has ended. Please begin speaking.');
            setStage('part2_speak');
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, isPrepTimerRunning, onShowToast]);

  // Part 2 120-Second Speaking Timer (stable 1s interval; stops automatically on stage exit)
  useEffect(() => {
    if (stage !== 'part2_speak' || !isRecording) return;
    const interval = setInterval(() => {
      setSpeakSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(() => {
            handleStopRecording();
            onShowToast('2-minute long turn completed. Moving to Part 3 discussion.');
            setStage('part3');
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, isRecording, onShowToast]);

  const speakPrompt = (text: string) => {
    stopSpeech();
    setActiveSpokenPrompt(text);
    setIsExaminerSpeaking(true);
    speakBritish(text, {
      rate: 0.96,
      speakerId: examinerGender === 'female' ? 'speaker_05' : 'speaker_04',
      gender: examinerGender,
      onStart: () => setIsExaminerSpeaking(true),
      onEnd: () => setIsExaminerSpeaking(false),
      onError: () => setIsExaminerSpeaking(false)
    });
  };

  const handleStartPrep = () => {
    setPrepSecondsLeft(60);
    setIsPrepTimerRunning(true);
    soundManager.playBeep(520, 0.05);
    speakPrompt('You now have one minute to prepare your notes on the topic shown on the screen.');
  };

  const handleStartRecording = async () => {
    stopSpeech();
    setIsExaminerSpeaking(false);
    setMicError(null);
    recordedChunksRef.current = [];
    const activeCaptureStage = stage;

    if (audioUrl) {
      try {
        URL.revokeObjectURL(audioUrl);
      } catch {}
      setAudioUrl(null);
      setCapturedAudioBytes(0);
      setCapturedAudioStage(null);
    }

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function' ||
      typeof MediaRecorder === 'undefined'
    ) {
      setIsRecording(false);
      setMicError('Microphone recording is not supported in this browser. You may type your spoken response in the transcript box below.');
      onShowToast('Microphone recording unavailable in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onerror = () => {
        setIsRecording(false);
        setMicError('Audio recorder encountered an error. Click Start Recording to retry.');
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          setCapturedAudioBytes(blob.size);
          setCapturedAudioStage(activeCaptureStage);
        } else {
          setMicError('No audio data was captured. Please check your microphone input and try recording again.');
        }
        stream.getTracks().forEach((t) => t.stop());
      };

      // Start Web Speech API live transcription only after mic access succeeds
      if (typeof window !== 'undefined') {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          try {
            const rec = new SpeechRec();
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = 'en-GB';
            rec.onresult = (event: any) => {
              let finalChunk = '';
              for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                  finalChunk += event.results[i][0].transcript + ' ';
                }
              }
              if (finalChunk.trim()) {
                setSpokenTranscript((prev) => (prev + ' ' + finalChunk).trim());
              }
            };
            rec.start();
            recognitionRef.current = rec;
          } catch {}
        }
      }

      recorder.start(250);
      soundManager.playSuccess();
      setIsRecording(true);
      if (activeCaptureStage === 'part2_speak' && speakSecondsLeft <= 0) {
        setSpeakSecondsLeft(120);
      }
    } catch (err: any) {
      setIsRecording(false);
      const errName = err?.name || 'MicrophoneError';
      const msg =
        errName === 'NotAllowedError' || errName === 'PermissionDeniedError'
          ? 'Microphone permission was denied. Allow microphone access in your browser settings and click Retry Recording, or type your response below.'
          : errName === 'NotFoundError' || errName === 'DevicesNotFoundError'
          ? 'No microphone device was detected. Connect a microphone and click Retry Recording, or type your response below.'
          : `Unable to start microphone recording (${errName}). Click Retry Recording or type your response below.`;
      setMicError(msg);
      soundManager.playBeep(340, 0.12);
      onShowToast('Microphone unavailable — check permissions or use the transcript input.');
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
    soundManager.playBeep(440, 0.1);
  };

  const handleCompleteInterview = async () => {
    handleStopRecording();
    setIsPrepTimerRunning(false);
    stopSpeech();
    setIsExaminerSpeaking(false);
    setStage('result');

    const combinedText = (spokenTranscript || candidateNotes || '').trim();
    const words = combinedText ? combinedText.split(/\s+/).filter(Boolean).length : 0;

    if (words < 5) {
      setEvaluation(buildCDIELTSInsufficientEvaluation(words));
      return;
    }

    setIsEvaluating(true);
    setBarnabyAnalyzing(true, 'Grading Speaking response against IELTS descriptors...');
    try {
      const token = getStoredSessionToken();
      const headers = buildCDIELTSAuthHeaders(token);
      const durationSec = Math.max(10, 120 - speakSecondsLeft);
      const wordsPerMinute = Math.round((words / durationSec) * 60);

      const res = await fetch('/api/evaluate-speaking-turn', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          part: 2,
          question: part2CueCard.title,
          cueCardBulletPoints: part2CueCard.cues,
          transcript: combinedText,
          durationSec,
          wordsPerMinute
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 401) {
          const authEval = buildCDIELTSUnavailableEvaluation({
            wordCount: words,
            message:
              errData?.error ||
              'Sign in required to run AI Speaking evaluation. No fallback score was generated.',
            authRequired: true,
            canRetry: false
          });
          setEvaluation(authEval);
          onShowToast('Please sign in to evaluate your speaking response.');
          return;
        }
        if (res.status === 403) {
          const quotaEval = buildCDIELTSUnavailableEvaluation({
            wordCount: words,
            message:
              errData?.error ||
              'Active subscription or daily allowance required for AI Speaking evaluation. No fallback score was generated.',
            authRequired: false,
            canRetry: false
          });
          setEvaluation(quotaEval);
          onShowToast('AI Speaking evaluation allowance reached.');
          return;
        }
        const unavailableEval = buildCDIELTSUnavailableEvaluation({
          wordCount: words,
          message:
            errData?.error ||
            `AI Speaking evaluation is temporarily unavailable (HTTP ${res.status}). No fallback score was generated.`,
          authRequired: false,
          canRetry: true
        });
        setEvaluation(unavailableEval);
        onShowToast('AI Speaking evaluation unavailable — no score fabricated.');
        return;
      }

      const data = await res.json();
      const resultObj = mapSpeakingTurnApiResponseToCDIELTS(data, words);
      setEvaluation(resultObj);

      if (shouldPersistCDIELTSSpeakingToFirestore(resultObj)) {
        firebaseSyncService
          .recordTestSubmission(
            'speaking',
            'cd-ielts-speaking',
            resultObj.overallBand,
            1,
            1,
            Math.max(30, 120 - speakSecondsLeft),
            {
              assessmentStatus: resultObj.assessmentStatus,
              isPartialAssessment: resultObj.isPartialAssessment,
              pronunciationObservable: resultObj.pronunciationObservable
            }
          )
          .catch(() => {});
        soundManager.playSuccess();
      } else if (resultObj.assessmentStatus === 'partial_transcript_only') {
        soundManager.playSuccess();
      }
    } catch {
      const networkUnavailable = buildCDIELTSUnavailableEvaluation({
        wordCount: words,
        message:
          'Unable to reach the AI Speaking evaluation service. Please check your connection and retry. No fallback band score was generated.',
        authRequired: false,
        canRetry: true
      });
      setEvaluation(networkUnavailable);
      onShowToast('AI Speaking evaluation unavailable — please retry.');
    } finally {
      setIsEvaluating(false);
      setBarnabyAnalyzing(false);
    }
  };

  // Real-Time Live Speech Analytics
  const wordsArray = (spokenTranscript || '').trim().split(/\s+/).filter(Boolean);
  const wordCount = wordsArray.length;
  const elapsedMinutes = Math.max(0.08, (120 - speakSecondsLeft) / 60);
  const currentWpm = isRecording ? Math.round(wordCount / elapsedMinutes) : 0;
  
  // Filler words detector
  const fillerRegex = /\b(um|uh|like|you know|actually|basically|sort of|kind of)\b/gi;
  const detectedFillers = (spokenTranscript.match(fillerRegex) || []).length;

  // High-level academic lexis detector
  const academicLexisRegex = /\b(paramount|crucial|profound|consequently|sustainable|infrastructure|substantial|mitigate|pivotal|perspective|inevitable|significantly|predominantly|comprehensive)\b/gi;
  const detectedAcademicWords = Array.from(new Set((spokenTranscript.match(academicLexisRegex) || []).map(w => w.toLowerCase())));

  const theme = getCDIELTSThemeClasses(colorScheme);
  const fontSizeClass = getCDIELTSFontSizeClass(zoomLevel);
  const isStandard = colorScheme === 'standard';
  const stageSteps: Array<{ id: SpeakingStage; label: string }> = [
    { id: 'part1', label: 'Part 1 · Intro' },
    { id: 'part2_prep', label: 'Part 2 · Prep (1m)' },
    { id: 'part2_speak', label: 'Part 2 · Long Turn (2m)' },
    { id: 'part3', label: 'Part 3 · Discussion' },
    { id: 'result', label: 'Assessment' }
  ];
  const activeStepIdx = stageSteps.findIndex((s) => s.id === stage);

  const handleRequestExit = () => {
    const hasProgress =
      stage !== 'intro' &&
      stage !== 'result' &&
      (spokenTranscript.trim().length > 0 || candidateNotes.trim().length > 0 || isRecording);
    if (hasProgress) {
      setShowExitConfirmModal(true);
      return;
    }
    stopSpeech();
    handleStopRecording();
    onExit();
  };

  const handleConfirmExit = () => {
    setShowExitConfirmModal(false);
    stopSpeech();
    handleStopRecording();
    onExit();
  };

  const handleSwitchTopicSet = (idx: number) => {
    stopSpeech();
    handleStopRecording();
    clearStageAudio();
    setIsPrepTimerRunning(false);
    setSelectedTopicSetIdx(idx);
    setPart1QuestionIdx(0);
    setPart3QuestionIdx(0);
    setPrepSecondsLeft(60);
    setSpeakSecondsLeft(120);
    setCandidateNotes('');
    setSpokenTranscript('');
    setElapsedSessionSec(0);
    setEvaluation(null);
    setStage('intro');
    setShowOptionsMenu(false);
    soundManager.playBeep(550, 0.04);
    onShowToast(`Loaded ${SPEAKING_TEST_SETS[idx]?.title}`);
  };

  const examinerDisplayName = examinerGender === 'female' ? 'Dr. Clara Sterling' : 'Prof. Arthur Pendelton';
  const headerTimerLabel =
    stage === 'part2_prep'
      ? `Prep ${formatClock(prepSecondsLeft)}`
      : stage === 'part2_speak'
      ? `Long Turn ${formatClock(speakSecondsLeft)}`
      : stage === 'intro'
      ? '11–14 min'
      : formatClock(elapsedSessionSec);

  const stageBannerText =
    stage === 'intro'
      ? 'Identity Check & Room Setup · Complete Parts 1, 2 & 3 (11–14 minutes)'
      : stage === 'part1'
      ? `Part 1 · Introduction and Interview (4–5 minutes) · Question ${part1QuestionIdx + 1} of ${part1Questions.length}`
      : stage === 'part2_prep'
      ? 'Part 2 · Individual Long Turn — Preparation (1 minute)'
      : stage === 'part2_speak'
      ? 'Part 2 · Individual Long Turn — Speaking (1–2 minutes)'
      : stage === 'part3'
      ? `Part 3 · Two-Way Discussion (4–5 minutes) · Question ${part3QuestionIdx + 1} of ${part3Questions.length}`
      : 'Speaking Assessment Summary';

  return (
    <div
      className={`h-screen w-full flex flex-col font-sans select-none overflow-hidden transition-colors duration-150 ${
        isStandard ? 'bg-[#EAEEF2] text-[#111827]' : theme.bg
      } ${fontSizeClass}`}
    >
      {/* ================= 1. TOP WORKSTATION HEADER (UNIFIED INSPERA EXAM INTERFACE) ================= */}
      <header
        className={`w-full h-12 px-3 sm:px-5 border-b shrink-0 z-20 flex items-center justify-between gap-3 ${
          isStandard
            ? 'bg-white text-[#111827] border-[#CBD5E1]'
            : `${theme.headerBg} ${theme.border}`
        }`}
      >
        {/* Left: Exit + Candidate Identifier + CD-IELTS SPEAKING Tag */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={handleRequestExit}
            className={`px-2.5 py-1 text-xs font-medium rounded border cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
              isStandard
                ? 'border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[#334155]'
                : 'border-white/25 bg-white/10 hover:bg-white/20 text-current'
            }`}
            title="Exit Speaking Session"
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

          <span
            className={`hidden lg:inline-flex px-2 py-0.5 rounded border text-[10px] font-semibold tracking-wider uppercase whitespace-nowrap shrink-0 ${
              isStandard
                ? 'bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]'
                : 'border-current/30 opacity-90'
            }`}
          >
            CD-IELTS SPEAKING
          </span>
        </div>

        {/* Center: Clean Inspera Session / Stage Clock */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            data-testid="speaking-header-clock"
            className={`flex items-center gap-2 px-3 py-1 rounded border text-xs sm:text-sm font-semibold tabular-nums whitespace-nowrap ${
              stage === 'part2_speak' && speakSecondsLeft < 30
                ? 'bg-rose-50 text-rose-700 border-rose-400'
                : stage === 'part2_prep' && prepSecondsLeft <= 15
                ? 'bg-amber-50 text-amber-800 border-amber-400'
                : isStandard
                ? 'bg-[#F8FAFC] text-[#0F172A] border-[#CBD5E1]'
                : 'bg-black/30 text-current border-white/30'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0 opacity-75" />
            <span>{isTimeHidden ? '••:••' : headerTimerLabel}</span>
            <button
              type="button"
              onClick={() => setIsTimeHidden((v) => !v)}
              className="text-[11px] font-medium underline opacity-75 hover:opacity-100 cursor-pointer ml-1"
              aria-label={isTimeHidden ? 'Show timer' : 'Hide timer'}
            >
              {isTimeHidden ? 'Show' : 'Hide'}
            </button>
          </div>
        </div>

        {/* Right: Help + Options Dropdown + Finish Test */}
        <div className="flex items-center gap-2 shrink-0 relative">
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border cursor-pointer whitespace-nowrap ${
              isStandard
                ? 'border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[#334155]'
                : 'border-white/25 hover:bg-white/10'
            }`}
            title="Speaking Test Instructions"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help</span>
          </button>

          {/* Options Dropdown (Accessibility + Practice Resources tucked cleanly out of exam screen) */}
          <div className="relative" ref={optionsMenuRef}>
            <button
              type="button"
              onClick={() => setShowOptionsMenu((v) => !v)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border cursor-pointer whitespace-nowrap ${
                showOptionsMenu
                  ? 'bg-[#1E293B] text-white border-[#1E293B]'
                  : isStandard
                  ? 'border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[#334155]'
                  : 'border-white/25 hover:bg-white/10'
              }`}
              aria-expanded={showOptionsMenu}
              title="Display Options & Practice Resources"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Options</span>
            </button>

            {showOptionsMenu && (
              <div className="absolute right-0 mt-1.5 w-72 bg-white text-[#111827] border border-[#CBD5E1] rounded-lg shadow-xl p-3.5 space-y-3.5 z-50 text-xs font-sans">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                  <span className="font-bold text-xs text-[#0F172A]">Display &amp; Practice Options</span>
                  <button
                    type="button"
                    onClick={() => setShowOptionsMenu(false)}
                    className="p-0.5 hover:bg-slate-100 rounded cursor-pointer"
                    aria-label="Close options"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Text Size */}
                <div className="space-y-1.5">
                  <div className="font-semibold text-[#475569]">Text Size</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['100%', '125%', '150%'] as CDIELTSZoomLevel[]).map((lvl) => (
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

                {/* Colour Contrast */}
                <div className="space-y-1.5">
                  <label className="block font-semibold text-[#475569]" htmlFor="speaking-contrast-select">
                    Colour Contrast
                  </label>
                  <select
                    id="speaking-contrast-select"
                    aria-label="Speaking Display Contrast"
                    value={colorScheme}
                    onChange={(e) => setColorScheme(e.target.value as CDIELTSColorScheme)}
                    className="w-full px-2.5 py-1.5 border border-[#CBD5E1] rounded bg-white text-[#111827] text-xs outline-none cursor-pointer"
                  >
                    <option value="standard">Black on white (Standard)</option>
                    <option value="black-on-yellow">Black on yellow</option>
                    <option value="yellow-on-black">Yellow on black</option>
                    <option value="white-on-black">White on black</option>
                  </select>
                </div>

                {/* Examiner Voice Switcher */}
                <div className="space-y-1.5 pt-2 border-t border-[#E2E8F0]">
                  <div className="font-semibold text-[#475569]">Examiner Voice</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setExaminerGender('female');
                        setPreferredVoiceGender('female');
                        soundManager.playBeep(520, 0.03);
                      }}
                      className={`py-1.5 px-2 rounded border text-xs font-medium cursor-pointer ${
                        examinerGender === 'female'
                          ? 'bg-[#1E293B] text-white border-[#1E293B]'
                          : 'bg-white text-[#334155] border-[#CBD5E1] hover:bg-slate-50'
                      }`}
                    >
                      Dr. Clara Sterling
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExaminerGender('male');
                        setPreferredVoiceGender('male');
                        soundManager.playBeep(520, 0.03);
                      }}
                      className={`py-1.5 px-2 rounded border text-xs font-medium cursor-pointer ${
                        examinerGender === 'male'
                          ? 'bg-[#1E293B] text-white border-[#1E293B]'
                          : 'bg-white text-[#334155] border-[#CBD5E1] hover:bg-slate-50'
                      }`}
                    >
                      Prof. Arthur Pendelton
                    </button>
                  </div>
                </div>

                {/* Practice Resources */}
                <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
                  <div className="font-semibold text-[#475569]">Practice Resources</div>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        setPracticeGuideTab(
                          stage === 'part3' ? 'part3' : stage === 'part2_prep' || stage === 'part2_speak' ? 'part2' : 'part1'
                        );
                        setShowPracticeGuideModal(true);
                      }}
                      className="w-full px-3 py-1.5 rounded border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-left font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#0066CC]" />
                      <span>Band 8 Sample Answers &amp; Vocabulary</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowLiveMetrics((v) => !v);
                      }}
                      className="w-full px-3 py-1.5 rounded border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-left font-medium flex items-center justify-between cursor-pointer"
                    >
                      <span>Live Speech Metrics (WPM / Fillers)</span>
                      <span className={`font-bold ${showLiveMetrics ? 'text-[#0066CC]' : 'text-slate-400'}`}>
                        {showLiveMetrics ? 'ON' : 'OFF'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setHidePromptText((v) => !v);
                      }}
                      className="w-full px-3 py-1.5 rounded border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-left font-medium flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        {hidePromptText ? <EyeOff className="w-3.5 h-3.5 text-[#0066CC]" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
                        <span>Audio-Only Questions (Part 1 &amp; 3)</span>
                      </span>
                      <span className={`font-bold ${hidePromptText ? 'text-[#0066CC]' : 'text-slate-400'}`}>
                        {hidePromptText ? 'ON' : 'OFF'}
                      </span>
                    </button>

                    {onOpenPracticeLabs && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptionsMenu(false);
                          stopSpeech();
                          handleStopRecording();
                          onOpenPracticeLabs();
                        }}
                        className="w-full px-3 py-1.5 rounded border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-left font-medium cursor-pointer"
                      >
                        Switch to Auxiliary Speaking Labs
                      </button>
                    )}
                  </div>

                  {/* Speaking Topic Set Selector */}
                  <div className="pt-1 space-y-1">
                    <label className="block font-semibold text-[#475569]" htmlFor="speaking-topic-set-select">
                      Practice Speaking Set
                    </label>
                    <select
                      id="speaking-topic-set-select"
                      value={selectedTopicSetIdx}
                      onChange={(e) => handleSwitchTopicSet(parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1.5 border border-[#CBD5E1] rounded bg-white text-[#111827] text-xs outline-none cursor-pointer"
                    >
                      {SPEAKING_TEST_SETS.map((s, idx) => (
                        <option key={s.id} value={idx}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {stage !== 'intro' && stage !== 'result' && (
            <button
              type="button"
              data-testid="speaking-finish-btn"
              onClick={handleCompleteInterview}
              className="px-3.5 py-1 bg-[#1E293B] hover:bg-[#0F172A] text-white font-semibold text-xs rounded cursor-pointer transition whitespace-nowrap shrink-0"
            >
              Finish Test
            </button>
          )}
        </div>
      </header>

      {/* ================= 2. SUB-HEADER EXAM PART BANNER (PURE INSPERA STRIP) ================= */}
      <div
        data-testid="speaking-part-bar"
        className={`w-full px-3 sm:px-5 py-1.5 border-b shrink-0 font-sans text-xs ${
          isStandard
            ? 'bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]'
            : `${theme.cardBg} ${theme.border}`
        }`}
      >
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-2">
          <div className="font-medium truncate">{stageBannerText}</div>
          <span className="hidden sm:inline text-[11px] opacity-75 shrink-0">
            Examiner: {examinerDisplayName}
          </span>
        </div>
      </div>

      {/* ================= 3. MAIN WORKSPACE VIEWPORT ================= */}
      <main className="flex-1 w-full overflow-y-auto min-h-0">
        <div className="max-w-[1280px] w-full mx-auto p-4 sm:p-6">
          {/* ================= INTRO / WAITING ROOM STAGE ================= */}
          {stage === 'intro' && (
            <div
              className={`max-w-3xl mx-auto border shadow-2xs p-5 sm:p-7 space-y-5 font-sans ${
                isStandard
                  ? 'bg-white text-[#111827] border-[#CBD5E1]'
                  : `${theme.cardBg} ${theme.border}`
              }`}
            >
              <div className={`border-b pb-4 space-y-1.5 ${isStandard ? 'border-[#E2E8F0]' : theme.border}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-70 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Video-Call Speaking Workstation</span>
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded border border-[#CBD5E1] bg-[#F8FAFC] text-[#334155] lg:hidden">
                    CD-IELTS SPEAKING
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  IELTS Speaking Interview (Parts 1, 2 &amp; 3)
                </h1>
                <p className="text-xs sm:text-sm opacity-80 leading-relaxed">
                  Complete all three parts of the timed Video-Call Speaking test with spoken examiner prompts, microphone capture, and rubric-aligned assessment.
                </p>
              </div>

              {/* 3-Part Structure Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className={`p-3.5 border ${isStandard ? 'bg-[#F8FAFC] border-[#CBD5E1]' : `${theme.bg} ${theme.border}`}`}>
                  <div className="font-bold mb-0.5">Part 1 (4–5 minutes)</div>
                  <div className="opacity-75">Introduction and familiar topics</div>
                </div>
                <div className={`p-3.5 border ${isStandard ? 'bg-[#F8FAFC] border-[#CBD5E1]' : `${theme.bg} ${theme.border}`}`}>
                  <div className="font-bold mb-0.5">Part 2 (3–4 minutes)</div>
                  <div className="opacity-75">1-minute prep + 2-minute cue card</div>
                </div>
                <div className={`p-3.5 border ${isStandard ? 'bg-[#F8FAFC] border-[#CBD5E1]' : `${theme.bg} ${theme.border}`}`}>
                  <div className="font-bold mb-0.5">Part 3 (4–5 minutes)</div>
                  <div className="opacity-75">Two-way thematic discussion</div>
                </div>
              </div>

              {/* Examiner Persona Selector */}
              <div className={`p-4 border space-y-3 ${isStandard ? 'bg-[#F8FAFC] border-[#CBD5E1]' : `${theme.bg} ${theme.border}`}`}>
                <div className="text-xs font-bold uppercase tracking-wide opacity-80 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Select Your Speaking Examiner</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setExaminerGender('female');
                      setPreferredVoiceGender('female');
                      soundManager.playBeep(520, 0.04);
                      stopSpeech();
                      speakBritish('Good day. I am Doctor Clara Sterling, your IELTS Speaking examiner.', {
                        speakerId: 'speaker_05',
                        gender: 'female',
                        rate: 0.96,
                        onStart: () => setIsExaminerSpeaking(true),
                        onEnd: () => setIsExaminerSpeaking(false),
                        onError: () => setIsExaminerSpeaking(false)
                      });
                    }}
                    className={`p-3.5 rounded border text-left transition flex items-center gap-3 cursor-pointer ${
                      examinerGender === 'female'
                        ? isStandard
                          ? 'bg-[#1E293B] border-[#1E293B] text-white'
                          : theme.contrastBadge
                        : isStandard
                        ? 'bg-white border-[#CBD5E1] text-[#111827] hover:border-[#0066CC]'
                        : `${theme.cardBg} ${theme.border}`
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded flex items-center justify-center font-mono font-bold text-sm shrink-0 border ${
                        examinerGender === 'female'
                          ? 'bg-white text-[#1E293B] border-white'
                          : isStandard
                          ? 'bg-[#F1F5F9] text-[#1E293B] border-[#CBD5E1]'
                          : 'border-current/30'
                      }`}
                    >
                      CS
                    </div>
                    <div>
                      <div className="font-bold text-xs">Dr. Clara Sterling</div>
                      <div className="text-[11px] opacity-80">British Examiner (RP)</div>
                      <div className="text-[10px] opacity-70">Formal female assessor voice</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExaminerGender('male');
                      setPreferredVoiceGender('male');
                      soundManager.playBeep(520, 0.04);
                      stopSpeech();
                      speakBritish('Good day. I am Professor Arthur Pendelton, your IELTS Speaking examiner.', {
                        speakerId: 'speaker_04',
                        gender: 'male',
                        rate: 0.96,
                        onStart: () => setIsExaminerSpeaking(true),
                        onEnd: () => setIsExaminerSpeaking(false),
                        onError: () => setIsExaminerSpeaking(false)
                      });
                    }}
                    className={`p-3.5 rounded border text-left transition flex items-center gap-3 cursor-pointer ${
                      examinerGender === 'male'
                        ? isStandard
                          ? 'bg-[#1E293B] border-[#1E293B] text-white'
                          : theme.contrastBadge
                        : isStandard
                        ? 'bg-white border-[#CBD5E1] text-[#111827] hover:border-[#0066CC]'
                        : `${theme.cardBg} ${theme.border}`
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded flex items-center justify-center font-mono font-bold text-sm shrink-0 border ${
                        examinerGender === 'male'
                          ? 'bg-white text-[#1E293B] border-white'
                          : isStandard
                          ? 'bg-[#F1F5F9] text-[#1E293B] border-[#CBD5E1]'
                          : 'border-current/30'
                      }`}
                    >
                      AP
                    </div>
                    <div>
                      <div className="font-bold text-xs">Prof. Arthur Pendelton</div>
                      <div className="text-[11px] opacity-80">Senior British Examiner (RP)</div>
                      <div className="text-[10px] opacity-70">Mature male assessor voice</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Practice Set Selection */}
              <div className={`p-4 border space-y-2 ${isStandard ? 'bg-[#F8FAFC] border-[#CBD5E1]' : `${theme.bg} ${theme.border}`}`}>
                <label className="block text-xs font-bold uppercase tracking-wide opacity-80" htmlFor="intro-speaking-set">
                  Practice Speaking Topic Set
                </label>
                <select
                  id="intro-speaking-set"
                  value={selectedTopicSetIdx}
                  onChange={(e) => handleSwitchTopicSet(parseInt(e.target.value, 10))}
                  className={`w-full px-3 py-2 border rounded text-xs outline-none cursor-pointer ${
                    isStandard
                      ? 'bg-white text-[#111827] border-[#CBD5E1]'
                      : `${theme.inputBg} ${theme.border}`
                  }`}
                >
                  {SPEAKING_TEST_SETS.map((s, idx) => (
                    <option key={s.id} value={idx}>
                      {s.title} — {s.topicArea}
                    </option>
                  ))}
                </select>
              </div>

              {/* Honest Evidence & Pronunciation Notice */}
              <div
                className={`p-3.5 border text-xs leading-relaxed ${
                  isStandard
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : `${theme.bg} ${theme.border}`
                }`}
              >
                <div className="font-bold uppercase text-[11px] flex items-center gap-1.5 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Honest Evidence &amp; Pronunciation Policy</span>
                </div>
                <p>
                  Transcript-only submissions evaluate Fluency &amp; Coherence, Lexical Resource, and Grammatical Range &amp; Accuracy. Acoustic Pronunciation requires verified audio evidence and remains marked <strong>Unassessed</strong> whenever only text transcripts are available.
                </p>
              </div>

              <div className="pt-1 flex items-center justify-between flex-wrap gap-3">
                <span className="text-xs opacity-70">
                  Tip: Sample Band 8 answers &amp; vocabulary are available inside <strong>Options</strong>.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setElapsedSessionSec(0);
                    setPart1QuestionIdx(0);
                    setPart3QuestionIdx(0);
                    setStage('part1');
                    soundManager.playSuccess();
                    speakPrompt(part1Questions[0]);
                  }}
                  className={`px-6 py-2.5 rounded font-semibold text-xs sm:text-sm transition inline-flex items-center gap-2 cursor-pointer ${
                    isStandard
                      ? 'bg-[#1E293B] hover:bg-[#0F172A] text-white'
                      : theme.accentBtn
                  }`}
                >
                  <span>Begin Speaking Interview</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================= PART 1: INTRODUCTION & INTERVIEW ================= */}
          {stage === 'part1' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left: Examiner Video-Call Frame */}
              <div
                className={`lg:col-span-5 border shadow-2xs p-4 space-y-3 ${
                  isStandard
                    ? 'bg-white border-[#CBD5E1] text-[#111827]'
                    : `${theme.cardBg} ${theme.border}`
                }`}
              >
                <div className="flex items-center justify-between text-xs pb-2 border-b border-current/10">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span>Examiner Video Feed</span>
                  </span>
                  <span className="text-[11px] opacity-70">{examinerDisplayName}</span>
                </div>

                <ExaminerHumanoidCanvas
                  gender={examinerGender}
                  isSpeaking={isExaminerSpeaking}
                  isListening={isRecording}
                  spokenText={activeSpokenPrompt || part1Questions[part1QuestionIdx]}
                  candidateVolumeRms={isRecording ? 50 : 0}
                  activePartLabel="Part 1: Introduction"
                  studioTheme="slate"
                  compact={true}
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] opacity-75">
                    {isExaminerSpeaking ? 'Examiner speaking...' : isRecording ? 'Examiner listening...' : 'Awaiting candidate response'}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakPrompt(part1Questions[part1QuestionIdx])}
                    className={`px-2.5 py-1 rounded border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                      isStandard
                        ? 'bg-white border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#1E293B]'
                        : `${theme.cardBg} ${theme.border}`
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Repeat Question</span>
                  </button>
                </div>
              </div>

              {/* Right: Examiner Question Paper & Candidate Mic Console */}
              <div
                className={`lg:col-span-7 border shadow-2xs p-5 sm:p-6 space-y-5 ${
                  isStandard
                    ? 'bg-white border-[#CBD5E1] text-[#111827]'
                    : `${theme.cardBg} ${theme.border}`
                }`}
              >
                <div className={`border-b pb-3 flex items-center justify-between ${isStandard ? 'border-[#E2E8F0]' : theme.border}`}>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide opacity-65">
                      Part 1 · Question {part1QuestionIdx + 1} of {part1Questions.length}
                    </div>
                    <h2 className="text-base sm:text-lg font-bold mt-1 leading-snug">
                      {hidePromptText ? (
                        <span className="italic font-normal opacity-75">
                          Audio-only mode active — click &ldquo;Repeat Question&rdquo; to hear the examiner again.
                        </span>
                      ) : (
                        `"${part1Questions[part1QuestionIdx]}"`
                      )}
                    </h2>
                  </div>
                </div>

                {/* Microphone Controls & Transcript Capture */}
                <div className={`p-4 border space-y-3 ${isStandard ? 'bg-[#F8FAFC] border-[#CBD5E1]' : `${theme.bg} ${theme.border}`}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-medium flex items-center gap-2">
                      {isRecording && <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />}
                      <span>
                        Microphone:{' '}
                        <strong>
                          {isRecording
                            ? 'Recording'
                            : micError
                            ? 'Device / Permission Issue'
                            : audioUrl && capturedAudioStage === 'part1'
                            ? `Captured (${Math.max(1, Math.round(capturedAudioBytes / 1024))} KB)`
                            : 'Ready'}
                        </strong>
                      </span>
                    </span>

                    {!isRecording ? (
                      <button
                        type="button"
                        data-testid="speaking-record-btn"
                        onClick={handleStartRecording}
                        className="px-4 py-1.5 rounded bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>{micError ? 'Retry Recording' : 'Start Recording'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid="speaking-stop-btn"
                        onClick={handleStopRecording}
                        className={`px-4 py-1.5 rounded font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition ${
                          isStandard ? 'bg-[#1E293B] hover:bg-[#0F172A] text-white' : theme.accentBtn
                        }`}
                      >
                        <span>Stop Recording</span>
                      </button>
                    )}
                  </div>

                  {micError && (
                    <div
                      role="alert"
                      data-testid="speaking-mic-error"
                      className="p-2.5 rounded border border-rose-300 bg-rose-50 text-rose-900 text-xs flex items-start justify-between gap-2"
                    >
                      <span>{micError}</span>
                      <button
                        type="button"
                        onClick={() => setMicError(null)}
                        className="text-[11px] underline shrink-0 cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {audioUrl && capturedAudioStage === 'part1' && (
                    <audio data-testid="speaking-part1-audio" src={audioUrl} controls className="w-full h-8" />
                  )}

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold opacity-75">
                      Spoken Response Transcript (auto-captured or manual fallback)
                    </label>
                    <textarea
                      aria-label="Part 1 Spoken Transcript"
                      value={spokenTranscript}
                      onChange={(e) => setSpokenTranscript(e.target.value)}
                      placeholder="Speak naturally into your microphone for 20–30 seconds..."
                      rows={3}
                      className={`w-full p-3 border text-xs sm:text-sm leading-relaxed outline-none focus:border-[#0066CC] select-text ${
                        isStandard
                          ? 'bg-white text-[#111827] border-[#CBD5E1]'
                          : `${theme.inputBg} ${theme.border}`
                      }`}
                    />
                  </div>

                  {showLiveMetrics && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-current/10 text-xs">
                      <div className="p-2 border border-current/15 bg-white/60">
                        <div className="text-[10px] uppercase opacity-70">Words</div>
                        <div className="font-bold tabular-nums">{wordCount}</div>
                      </div>
                      <div className="p-2 border border-current/15 bg-white/60">
                        <div className="text-[10px] uppercase opacity-70">Fillers</div>
                        <div className="font-bold tabular-nums">{detectedFillers}</div>
                      </div>
                      <div className="p-2 border border-current/15 bg-white/60">
                        <div className="text-[10px] uppercase opacity-70">C1 Lexis</div>
                        <div className="font-bold tabular-nums">{detectedAcademicWords.length}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= PART 2: CUE CARD PREPARATION (1 MINUTE) ================= */}
          {stage === 'part2_prep' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left: Examiner Video Feed + Prep Countdown */}
              <div
                className={`lg:col-span-5 border shadow-2xs p-4 space-y-3 ${
                  isStandard
                    ? 'bg-white border-[#CBD5E1] text-[#111827]'
                    : `${theme.cardBg} ${theme.border}`
                }`}
              >
                <div className="flex items-center justify-between text-xs pb-2 border-b border-current/10">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span>Examiner Video Feed</span>
                  </span>
                  <div
                    data-testid="speaking-prep-timer"
                    className={`flex items-center gap-1.5 font-semibold text-xs px-2.5 py-0.5 rounded border tabular-nums ${
                      prepSecondsLeft <= 15
                        ? 'text-rose-700 bg-rose-50 border-rose-300'
                        : isStandard
                        ? 'text-[#0F172A] bg-[#F8FAFC] border-[#CBD5E1]'
                        : `${theme.border} ${theme.bg}`
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatClock(prepSecondsLeft)}</span>
                  </div>
                </div>

                <ExaminerHumanoidCanvas
                  gender={examinerGender}
                  isSpeaking={isExaminerSpeaking}
                  isListening={false}
                  spokenText={activeSpokenPrompt || 'You have one minute to make notes on the topic shown on your screen.'}
                  activePartLabel="Part 2: 1-Min Preparation"
                  studioTheme="slate"
                  compact={true}
                />

                <div className="pt-1 flex items-center justify-between gap-2">
                  {!isPrepTimerRunning ? (
                    <button
                      type="button"
                      onClick={handleStartPrep}
                      className={`w-full py-2 px-4 rounded font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition ${
                        isStandard
                          ? 'bg-[#0066CC] hover:bg-[#0052A3] text-white'
                          : theme.accentBtn
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start 1-Minute Prep Timer</span>
                    </button>
                  ) : (
                    <div className="w-full text-center text-xs opacity-80 py-1.5 border border-current/15 bg-black/5 rounded">
                      Preparation clock running — note key points only.
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Candidate Task Card + Paper Note Sheet */}
              <div
                className={`lg:col-span-7 border shadow-2xs p-5 sm:p-6 space-y-5 ${
                  isStandard
                    ? 'bg-white border-[#CBD5E1] text-[#111827]'
                    : `${theme.cardBg} ${theme.border}`
                }`}
              >
                {/* Candidate Task Card */}
                <div
                  className={`p-5 border space-y-3 select-text ${
                    isStandard
                      ? 'bg-[#F8FAFC] border-[#94A3B8] text-[#0F172A]'
                      : `${theme.bg} ${theme.border}`
                  }`}
                >
                  <div className="text-xs font-bold uppercase tracking-wide opacity-70">
                    Candidate Task Card · Part 2
                  </div>
                  <h2 className="text-base sm:text-lg font-bold leading-snug">
                    {part2CueCard.title}
                  </h2>
                  <p className="text-xs sm:text-sm font-medium">You should say:</p>
                  <ul className="text-xs sm:text-sm space-y-1.5 list-disc pl-5 leading-relaxed">
                    {part2CueCard.cues.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                  <p className="text-xs opacity-80 pt-2 border-t border-current/15">
                    You will have to talk about the topic for one to two minutes. You have one minute to think about what you are going to say. You can make some notes to help you if you wish.
                  </p>
                </div>

                {/* Candidate Note Sheet */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 opacity-70" />
                    <span>Candidate Note Sheet (keywords &amp; bullet points)</span>
                  </label>
                  <textarea
                    value={candidateNotes}
                    onChange={(e) => setCandidateNotes(e.target.value)}
                    placeholder="Jot brief bullet points for each cue..."
                    rows={4}
                    className={`w-full p-3.5 border text-xs sm:text-sm leading-relaxed outline-none focus:border-[#0066CC] select-text ${
                      isStandard
                        ? 'bg-white text-[#111827] border-[#CBD5E1]'
                        : `${theme.inputBg} ${theme.border}`
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= PART 2: 2-MINUTE INDIVIDUAL LONG TURN ================= */}
          {stage === 'part2_speak' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left: Examiner Feed + Task Card Reference */}
              <div className="lg:col-span-5 space-y-4">
                <div
                  className={`border shadow-2xs p-4 space-y-3 ${
                    isStandard
                      ? 'bg-white border-[#CBD5E1] text-[#111827]'
                      : `${theme.cardBg} ${theme.border}`
                  }`}
                >
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-current/10">
                    <span className="font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span>Examiner Video Feed</span>
                    </span>
                    <div
                      data-testid="speaking-longturn-timer"
                      className={`flex items-center gap-1.5 font-semibold text-xs px-2.5 py-0.5 rounded border tabular-nums ${
                        speakSecondsLeft < 30
                          ? 'text-rose-700 bg-rose-50 border-rose-300'
                          : isStandard
                          ? 'text-[#0F172A] bg-[#F8FAFC] border-[#CBD5E1]'
                          : `${theme.border} ${theme.bg}`
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatClock(speakSecondsLeft)}</span>
                    </div>
                  </div>

                  <ExaminerHumanoidCanvas
                    gender={examinerGender}
                    isSpeaking={false}
                    isListening={isRecording}
                    candidateVolumeRms={isRecording ? 60 : 0}
                    activePartLabel="Part 2: 2-Min Long Turn"
                    studioTheme="slate"
                    compact={true}
                  />
                </div>

                {/* Task Card kept visible on desk during monologue */}
                <div
                  className={`border shadow-2xs p-4 space-y-2 text-xs ${
                    isStandard
                      ? 'bg-white border-[#CBD5E1] text-[#111827]'
                      : `${theme.cardBg} ${theme.border}`
                  }`}
                >
                  <div className="font-bold uppercase tracking-wide opacity-65 text-[11px]">
                    Candidate Task Card
                  </div>
                  <div className="font-bold text-sm leading-snug">{part2CueCard.title}</div>
                  <ul className="list-disc pl-4 space-y-1 opacity-85">
                    {part2CueCard.cues.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right: Long Turn Recording Console & Notes */}
              <div
                className={`lg:col-span-7 border shadow-2xs p-5 sm:p-6 space-y-4 ${
                  isStandard
                    ? 'bg-white border-[#CBD5E1] text-[#111827]'
                    : `${theme.cardBg} ${theme.border}`
                }`}
              >
                <div className={`border-b pb-3 flex items-center justify-between gap-2 ${isStandard ? 'border-[#E2E8F0]' : theme.border}`}>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide opacity-65">
                      Part 2 · Individual Long Turn
                    </div>
                    <h2 className="text-base sm:text-lg font-bold mt-0.5">
                      {isRecording ? 'Recording Live — Speak Continuously (1–2 minutes)' : 'Press Start Recording When Ready'}
                    </h2>
                  </div>
                </div>

                {candidateNotes.trim() && (
                  <div
                    className={`p-3.5 border text-xs space-y-1 ${
                      isStandard
                        ? 'bg-[#F8FAFC] border-[#CBD5E1] text-[#1E293B]'
                        : `${theme.bg} ${theme.border}`
                    }`}
                  >
                    <div className="font-bold uppercase text-[10px] opacity-70">Your Prep Notes</div>
                    <p className="whitespace-pre-wrap leading-relaxed">{candidateNotes}</p>
                  </div>
                )}

                <div className={`p-4 border space-y-3 ${isStandard ? 'bg-[#F8FAFC] border-[#CBD5E1]' : `${theme.bg} ${theme.border}`}`}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5 text-xs">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                          isRecording
                            ? 'bg-rose-50 text-rose-700 border-rose-300'
                            : isStandard
                            ? 'bg-white text-[#1E293B] border-[#CBD5E1]'
                            : 'border-current/30'
                        }`}
                      >
                        <Mic className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
                      </span>
                      <div>
                        <div className="font-semibold">
                          {isRecording ? 'Microphone Active' : 'Microphone Standby'}
                        </div>
                        <div className="text-[11px] opacity-70">
                          Aim to speak for 1 minute 30 seconds to 2 minutes.
                        </div>
                      </div>
                    </div>

                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={handleStartRecording}
                        className="px-5 py-2 rounded bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>{micError ? 'Retry Recording' : 'Start Recording'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStopRecording}
                        className={`px-5 py-2 rounded font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer transition ${
                          isStandard ? 'bg-[#1E293B] hover:bg-[#0F172A] text-white' : theme.accentBtn
                        }`}
                      >
                        <span>Stop Recording</span>
                      </button>
                    )}
                  </div>

                  {micError && (
                    <div
                      role="alert"
                      data-testid="speaking-mic-error"
                      className="p-2.5 rounded border border-rose-300 bg-rose-50 text-rose-900 text-xs flex items-start justify-between gap-2"
                    >
                      <span>{micError}</span>
                      <button
                        type="button"
                        onClick={() => setMicError(null)}
                        className="text-[11px] underline shrink-0 cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {audioUrl && capturedAudioStage === 'part2_speak' && (
                    <audio data-testid="speaking-part2-audio" src={audioUrl} controls className="w-full h-8" />
                  )}

                  {showLiveMetrics && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-current/10 text-xs">
                      <div className="p-2 border border-current/15 bg-white/60">
                        <div className="text-[10px] uppercase opacity-70">Speech Rate</div>
                        <div className="font-bold tabular-nums">{currentWpm > 0 ? `${currentWpm} WPM` : '—'}</div>
                      </div>
                      <div className="p-2 border border-current/15 bg-white/60">
                        <div className="text-[10px] uppercase opacity-70">Fillers</div>
                        <div className="font-bold tabular-nums">{detectedFillers}</div>
                      </div>
                      <div className="p-2 border border-current/15 bg-white/60">
                        <div className="text-[10px] uppercase opacity-70">C1 Lexis</div>
                        <div className="font-bold tabular-nums">{detectedAcademicWords.length}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold opacity-75">
                    Captured Speech Transcript
                  </label>
                  <textarea
                    value={spokenTranscript}
                    onChange={(e) => setSpokenTranscript(e.target.value)}
                    placeholder="Your spoken words appear here automatically while recording (or type/edit response notes)..."
                    rows={4}
                    className={`w-full p-3 border text-xs sm:text-sm leading-relaxed outline-none focus:border-[#0066CC] select-text ${
                      isStandard
                        ? 'bg-white text-[#111827] border-[#CBD5E1]'
                        : `${theme.inputBg} ${theme.border}`
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= PART 3: TWO-WAY THEMATIC DISCUSSION ================= */}
          {stage === 'part3' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left: Examiner Video-Call Frame */}
              <div
                className={`lg:col-span-5 border shadow-2xs p-4 space-y-3 ${
                  isStandard
                    ? 'bg-white border-[#CBD5E1] text-[#111827]'
                    : `${theme.cardBg} ${theme.border}`
                }`}
              >
                <div className="flex items-center justify-between text-xs pb-2 border-b border-current/10">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span>Examiner Video Feed</span>
                  </span>
                  <span className="text-[11px] opacity-70">{examinerDisplayName}</span>
                </div>

                <ExaminerHumanoidCanvas
                  gender={examinerGender}
                  isSpeaking={isExaminerSpeaking}
                  isListening={isRecording}
                  spokenText={activeSpokenPrompt || part3Questions[part3QuestionIdx]}
                  candidateVolumeRms={isRecording ? 50 : 0}
                  activePartLabel="Part 3: Discussion"
                  studioTheme="slate"
                  compact={true}
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] opacity-75">
                    {isExaminerSpeaking ? 'Examiner speaking...' : isRecording ? 'Examiner listening...' : 'Awaiting candidate response'}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakPrompt(part3Questions[part3QuestionIdx])}
                    className={`px-2.5 py-1 rounded border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                      isStandard
                        ? 'bg-white border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#1E293B]'
                        : `${theme.cardBg} ${theme.border}`
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Repeat Question</span>
                  </button>
                </div>
              </div>

              {/* Right: Discussion Prompt & Recording Console */}
              <div
                className={`lg:col-span-7 border shadow-2xs p-5 sm:p-6 space-y-5 ${
                  isStandard
                    ? 'bg-white border-[#CBD5E1] text-[#111827]'
                    : `${theme.cardBg} ${theme.border}`
                }`}
              >
                <div className={`border-b pb-3 ${isStandard ? 'border-[#E2E8F0]' : theme.border}`}>
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-65">
                    Part 3 · Discussion Question {part3QuestionIdx + 1} of {part3Questions.length}
                  </div>
                  <h2 className="text-base sm:text-lg font-bold mt-1 leading-snug">
                    {hidePromptText ? (
                      <span className="italic font-normal opacity-75">
                        Audio-only mode active — click &ldquo;Repeat Question&rdquo; to hear the examiner again.
                      </span>
                    ) : (
                      `"${part3Questions[part3QuestionIdx]}"`
                    )}
                  </h2>
                </div>

                <div className={`p-4 border space-y-3 ${isStandard ? 'bg-[#F8FAFC] border-[#CBD5E1]' : `${theme.bg} ${theme.border}`}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span data-testid="speaking-part3-mic-status" className="text-xs font-medium flex items-center gap-2">
                      {isRecording && <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />}
                      <span>
                        Microphone:{' '}
                        <strong>
                          {isRecording
                            ? 'Recording Live'
                            : micError
                            ? 'Permission / Device Issue'
                            : audioUrl && capturedAudioStage === 'part3'
                            ? `Audio Captured (${Math.max(1, Math.round(capturedAudioBytes / 1024))} KB)`
                            : 'Ready'}
                        </strong>
                      </span>
                    </span>

                    {!isRecording ? (
                      <button
                        type="button"
                        data-testid="speaking-part3-record-btn"
                        onClick={handleStartRecording}
                        className="px-4 py-1.5 rounded bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>{micError ? 'Retry Recording' : 'Start Recording'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid="speaking-part3-stop-btn"
                        onClick={handleStopRecording}
                        className={`px-4 py-1.5 rounded font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition ${
                          isStandard ? 'bg-[#1E293B] hover:bg-[#0F172A] text-white' : theme.accentBtn
                        }`}
                      >
                        <span>Stop Recording</span>
                      </button>
                    )}
                  </div>

                  {micError && (
                    <div
                      role="alert"
                      data-testid="speaking-mic-error"
                      className="p-2.5 rounded border border-rose-300 bg-rose-50 text-rose-900 text-xs flex items-start justify-between gap-2"
                    >
                      <span>{micError}</span>
                      <button
                        type="button"
                        onClick={() => setMicError(null)}
                        className="text-[11px] underline shrink-0 cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {audioUrl && capturedAudioStage === 'part3' && (
                    <audio data-testid="speaking-part3-audio" src={audioUrl} controls className="w-full h-8" />
                  )}

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold opacity-75">
                      Part 3 Spoken Transcript
                    </label>
                    <textarea
                      aria-label="Part 3 Spoken Transcript"
                      data-testid="speaking-part3-transcript"
                      value={spokenTranscript}
                      onChange={(e) => setSpokenTranscript(e.target.value)}
                      placeholder="Develop your argument with concrete examples and balanced perspectives..."
                      rows={3}
                      className={`w-full p-3 border text-xs sm:text-sm leading-relaxed outline-none focus:border-[#0066CC] select-text ${
                        isStandard
                          ? 'bg-white text-[#111827] border-[#CBD5E1]'
                          : `${theme.inputBg} ${theme.border}`
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= RESULT STAGE: BAND SCORECARD ================= */}
          {stage === 'result' && (
            <div
              className={`max-w-3xl mx-auto border shadow-2xs p-6 sm:p-8 space-y-6 ${
                isStandard
                  ? 'bg-white border-[#CBD5E1] text-[#111827]'
                  : `${theme.cardBg} ${theme.border}`
              }`}
            >
              {isEvaluating ? (
                <div className="py-12 text-center space-y-3">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto text-[#0066CC]" />
                  <h3 className="text-lg font-bold">Evaluating Speaking Performance...</h3>
                  <p className="text-xs opacity-75">
                    Analyzing fluency, lexical resource, grammatical range, and pronunciation against BandSprint practice descriptors.
                  </p>
                </div>
              ) : evaluation &&
                (evaluation.assessmentStatus === 'evaluated' ||
                  evaluation.assessmentStatus === 'partial_transcript_only') ? (
                <>
                  <div className="text-center space-y-2">
                    <div
                      className={`w-12 h-12 rounded-xl mx-auto flex items-center justify-center ${
                        evaluation.assessmentStatus === 'evaluated'
                          ? isStandard
                            ? 'bg-[#1E293B] text-white'
                            : theme.contrastBadge
                          : isStandard
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : theme.contrastBadge
                      }`}
                    >
                      <Award className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                      {evaluation.assessmentStatus === 'evaluated'
                        ? 'Speaking Assessment Complete'
                        : 'Partial Speaking Assessment (Transcript-Only)'}
                    </h2>
                    <p className="text-xs opacity-75">
                      BandSprint Practice Rubric Assessment · {evaluation.wordCount} Words Analyzed
                    </p>
                  </div>

                  {evaluation.assessmentStatus === 'partial_transcript_only' && (
                    <div
                      className={`p-4 border text-xs space-y-1.5 ${
                        isStandard
                          ? 'bg-amber-50 border-amber-300 text-amber-950'
                          : `${theme.bg} ${theme.border}`
                      }`}
                    >
                      <div className="font-bold uppercase flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Incomplete Speaking Evidence — Pronunciation Unassessed</span>
                      </div>
                      <p className="leading-relaxed">
                        {evaluation.disclaimer ||
                          'Pronunciation cannot be scored from text transcripts alone. No complete 4-criterion Overall Speaking Band was awarded or persisted as a complete exam score.'}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    {[
                      { title: 'Fluency & Coherence', band: evaluation.fluencyBand },
                      { title: 'Lexical Resource', band: evaluation.lexicalBand },
                      { title: 'Grammar Accuracy', band: evaluation.grammarBand },
                      { title: 'Pronunciation', band: evaluation.pronunciationBand }
                    ].map((c) => (
                      <div
                        key={c.title}
                        className={`p-3.5 border ${
                          isStandard
                            ? 'bg-[#F8FAFC] border-[#CBD5E1]'
                            : `${theme.bg} ${theme.border}`
                        }`}
                      >
                        <div className="text-[10px] uppercase font-semibold opacity-70">{c.title}</div>
                        {typeof c.band === 'number' ? (
                          <div className="text-2xl font-bold tabular-nums my-1">
                            Band {c.band.toFixed(1)}
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-amber-700 my-2">
                            Unassessed
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div
                    className={`p-4 border text-xs space-y-2 ${
                      isStandard
                        ? 'bg-[#F8FAFC] border-[#CBD5E1]'
                        : `${theme.bg} ${theme.border}`
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 uppercase">
                      <Sparkles className="w-4 h-4 text-[#0066CC]" />
                      {evaluation.assessmentStatus === 'evaluated' && typeof evaluation.overallBand === 'number' ? (
                        <span>Overall Speaking Band: {evaluation.overallBand.toFixed(1)}</span>
                      ) : typeof evaluation.partialThreeCriterionIndex === 'number' ? (
                        <span>
                          3-Criterion Transcript Index: {evaluation.partialThreeCriterionIndex.toFixed(1)} (Overall Band Unassessed)
                        </span>
                      ) : (
                        <span>Overall Speaking Band: Unassessed</span>
                      )}
                    </div>
                    <p className="leading-relaxed">{evaluation.examinerFeedback}</p>
                  </div>
                </>
              ) : evaluation && evaluation.assessmentStatus === 'unavailable' ? (
                <div className="text-center space-y-4 py-6">
                  <div
                    className={`w-12 h-12 rounded-xl mx-auto flex items-center justify-center ${
                      isStandard
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : theme.contrastBadge
                    }`}
                  >
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold">
                    {evaluation.authRequired ? 'Sign In Required for AI Evaluation' : 'AI Speaking Evaluation Unavailable'}
                  </h2>
                  <p className="text-xs sm:text-sm max-w-md mx-auto leading-relaxed opacity-80">
                    {evaluation.examinerFeedback}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {evaluation.canRetry && (
                      <button
                        type="button"
                        onClick={handleCompleteInterview}
                        className={`px-5 py-2 rounded font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                          isStandard ? 'bg-[#1E293B] hover:bg-[#0F172A] text-white' : theme.accentBtn
                        }`}
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Retry AI Evaluation</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setStage('part2_speak')}
                      className={`px-5 py-2 rounded border font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                        isStandard ? 'border-[#CBD5E1] hover:bg-[#F1F5F9]' : theme.border
                      }`}
                    >
                      <span>Return to Part 2 Transcript</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4 py-6">
                  <div
                    className={`w-12 h-12 rounded-xl mx-auto flex items-center justify-center ${
                      isStandard
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : theme.contrastBadge
                    }`}
                  >
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold">Insufficient Spoken Response Recorded</h2>
                  <p className="text-xs sm:text-sm max-w-md mx-auto leading-relaxed opacity-80">
                    {evaluation?.examinerFeedback ||
                      'We do not assign a synthetic band score when fewer than 5 spoken words are recorded. Return to Part 2 to record your voice or enter your spoken transcript.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setStage('part2_speak')}
                    className={`px-5 py-2 rounded font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                      isStandard ? 'bg-[#1E293B] hover:bg-[#0F172A] text-white' : theme.accentBtn
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Retry Part 2 Recording</span>
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {shouldPersistCDIELTSSpeakingToFirestore(evaluation) && (
                  <button
                    type="button"
                    onClick={() => setShowTRFModal(true)}
                    className="px-5 py-2 rounded bg-[#0066CC] hover:bg-[#0052A3] text-white font-semibold text-xs transition inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Award className="w-4 h-4" />
                    <span>Speaking Practice Summary</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onExit}
                  className={`px-6 py-2 rounded font-semibold text-xs transition cursor-pointer ${
                    isStandard ? 'bg-[#1E293B] hover:bg-[#0F172A] text-white' : theme.accentBtn
                  }`}
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ================= 4. AUTHENTIC INSPERA BOTTOM NAVIGATION BAR ================= */}
      {stage !== 'intro' && (
        <footer
          className={`w-full border-t px-3 sm:px-5 py-2 shrink-0 select-none z-10 font-sans ${
            isStandard
              ? 'bg-[#F8FAFC] text-[#111827] border-[#CBD5E1]'
              : `${theme.bg} ${theme.border}`
          }`}
        >
          <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2">
            {/* Left: 5-Step Speaking Stage Indicator */}
            <nav aria-label="Speaking interview progress" className="flex items-center gap-1.5 overflow-x-auto py-0.5 flex-1 min-w-0">
              {stageSteps.map((step, idx) => {
                const isCurrent = step.id === stage;
                const isDone = activeStepIdx > idx;
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-semibold whitespace-nowrap shrink-0 ${
                      isCurrent
                        ? isStandard
                          ? 'bg-[#1E293B] text-white border-[#1E293B]'
                          : theme.contrastBadge
                        : isDone
                        ? isStandard
                          ? 'bg-white text-[#1E293B] border-[#94A3B8]'
                          : `${theme.cardBg} ${theme.border} opacity-90`
                        : isStandard
                        ? 'bg-white text-[#64748B] border-[#CBD5E1]'
                        : `${theme.cardBg} ${theme.border} opacity-60`
                    }`}
                  >
                    <span className="tabular-nums">{idx + 1}.</span>
                    <span>{step.label}</span>
                    {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </div>
                );
              })}
            </nav>

            {/* Right: Contextual Primary Exam Progression Button */}
            <div className="flex items-center gap-2 shrink-0">
              {stage === 'part1' &&
                (part1QuestionIdx < part1Questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleStopRecording();
                      const next = part1QuestionIdx + 1;
                      setPart1QuestionIdx(next);
                      soundManager.playBeep(520, 0.03);
                      speakPrompt(part1Questions[next]);
                    }}
                    className={`px-4 py-1.5 rounded font-semibold text-xs transition inline-flex items-center gap-1.5 cursor-pointer ${
                      isStandard ? 'bg-[#1E293B] hover:bg-[#0F172A] text-white' : theme.accentBtn
                    }`}
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleStopRecording();
                      clearStageAudio();
                      stopSpeech();
                      setIsExaminerSpeaking(false);
                      setPrepSecondsLeft(60);
                      setIsPrepTimerRunning(false);
                      setStage('part2_prep');
                      soundManager.playSuccess();
                    }}
                    className={`px-4 py-1.5 rounded font-semibold text-xs transition inline-flex items-center gap-1.5 cursor-pointer ${
                      isStandard ? 'bg-[#0066CC] hover:bg-[#0052A3] text-white' : theme.accentBtn
                    }`}
                  >
                    <span>Proceed to Part 2 (Cue Card)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ))}

              {stage === 'part2_prep' && (
                <button
                  type="button"
                  onClick={() => {
                    stopSpeech();
                    setIsPrepTimerRunning(false);
                    setIsExaminerSpeaking(false);
                    clearStageAudio();
                    setSpeakSecondsLeft(120);
                    setStage('part2_speak');
                    soundManager.playBeep(520, 0.05);
                  }}
                  className={`px-4 py-1.5 rounded font-semibold text-xs transition inline-flex items-center gap-1.5 cursor-pointer ${
                    isStandard ? 'bg-[#1E293B] hover:bg-[#0F172A] text-white' : theme.accentBtn
                  }`}
                >
                  <span>Begin 2-Minute Long Turn</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {stage === 'part2_speak' && (
                <button
                  type="button"
                  onClick={() => {
                    handleStopRecording();
                    clearStageAudio();
                    setStage('part3');
                    soundManager.playSuccess();
                    speakPrompt(part3Questions[0]);
                  }}
                  className={`px-4 py-1.5 rounded font-semibold text-xs transition inline-flex items-center gap-1.5 cursor-pointer ${
                    isStandard ? 'bg-[#1E293B] hover:bg-[#0F172A] text-white' : theme.accentBtn
                  }`}
                >
                  <span>Proceed to Part 3 (Discussion)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {stage === 'part3' &&
                (part3QuestionIdx < part3Questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleStopRecording();
                      const next = part3QuestionIdx + 1;
                      setPart3QuestionIdx(next);
                      soundManager.playBeep(520, 0.03);
                      speakPrompt(part3Questions[next]);
                    }}
                    className={`px-4 py-1.5 rounded font-semibold text-xs transition inline-flex items-center gap-1.5 cursor-pointer ${
                      isStandard ? 'bg-[#1E293B] hover:bg-[#0F172A] text-white' : theme.accentBtn
                    }`}
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCompleteInterview}
                    className={`px-4 py-1.5 rounded font-semibold text-xs transition inline-flex items-center gap-1.5 cursor-pointer ${
                      isStandard ? 'bg-[#0066CC] hover:bg-[#0052A3] text-white' : theme.accentBtn
                    }`}
                  >
                    <span>Complete Interview &amp; Evaluate</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                ))}
            </div>
          </div>
        </footer>
      )}

      {/* ================= HELP & EXAM INSTRUCTIONS MODAL ================= */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white text-[#111827] border border-[#CBD5E1] rounded-lg max-w-lg w-full p-6 space-y-4 shadow-2xl font-sans">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
              <h2 className="text-base font-bold text-[#0F172A]">
                IELTS Video-Call Speaking — Instructions
              </h2>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1 hover:bg-slate-100 rounded cursor-pointer"
                aria-label="Close help"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs leading-relaxed space-y-2.5 text-[#334155]">
              <p>
                <strong>Part 1 (4–5 minutes):</strong> Answer familiar introductory questions about yourself, home, work, or daily life. Aim for 2–4 natural sentences per answer.
              </p>
              <p>
                <strong>Part 2 (3–4 minutes):</strong> You receive a Candidate Task Card and 1 minute to write brief keywords on your note sheet, followed by a 1–2 minute continuous long turn.
              </p>
              <p>
                <strong>Part 3 (4–5 minutes):</strong> Two-way abstract discussion linked to your Part 2 topic. Develop ideas with reasons, comparisons, and examples.
              </p>
              <p>
                <strong>Practice Mode Aids:</strong> Open <strong>Options</strong> at any time for Band 8 sample answers, high-band vocabulary, Audio-Only question mode, or live WPM/filler tracking.
              </p>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-1.5 bg-[#1E293B] hover:bg-[#0F172A] text-white text-xs font-semibold rounded cursor-pointer"
              >
                Close Instructions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PRACTICE GUIDE: BAND 8 SAMPLE ANSWERS & VOCABULARY MODAL ================= */}
      {showPracticeGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white text-[#111827] border border-[#CBD5E1] rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl font-sans">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  Speaking Practice Guide · Band 8 Sample Responses
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">{activeSet.title}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopSpeech();
                  setShowPracticeGuideModal(false);
                }}
                className="p-1 hover:bg-slate-100 rounded cursor-pointer"
                aria-label="Close practice guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-[#CBD5E1] rounded text-xs text-[#334155]">
              <strong>Practice Resource:</strong> Sample answers and vocabulary lists are tucked inside Options so the active exam screen stays authentic to real Video-Call Speaking tests.
            </div>

            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'part1', label: 'Part 1 Model' },
                  { id: 'part2', label: 'Part 2 Cue Card Model' },
                  { id: 'part3', label: 'Part 3 Model' }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPracticeGuideTab(tab.id)}
                  className={`px-3 py-1.5 rounded border text-xs font-semibold cursor-pointer ${
                    practiceGuideTab === tab.id
                      ? 'bg-[#1E293B] text-white border-[#1E293B]'
                      : 'bg-white text-[#334155] border-[#CBD5E1] hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded leading-relaxed text-[#0F172A]">
                {practiceGuideTab === 'part1'
                  ? activeSet.practiceGuide.part1Model
                  : practiceGuideTab === 'part2'
                  ? activeSet.practiceGuide.part2Model
                  : activeSet.practiceGuide.part3Model}
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text =
                      practiceGuideTab === 'part1'
                        ? activeSet.practiceGuide.part1Model
                        : practiceGuideTab === 'part2'
                        ? activeSet.practiceGuide.part2Model
                        : activeSet.practiceGuide.part3Model;
                    speakPrompt(text.replace(/"/g, ''));
                  }}
                  className="px-3 py-1.5 rounded border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer text-[#1E293B]"
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#0066CC]" />
                  <span>Listen to Model Answer</span>
                </button>
                <span className="text-[11px] text-[#64748B]">
                  Spoken by {examinerDisplayName}
                </span>
              </div>

              <div className="p-3.5 bg-white border border-[#CBD5E1] rounded space-y-2">
                <div className="text-xs font-bold uppercase text-[#475569]">
                  High-Band Collocations &amp; Discourse Vocabulary
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeSet.practiceGuide.keyVocabulary.map((phrase) => (
                    <span
                      key={phrase}
                      className="px-2.5 py-1 rounded border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-[#0F172A] font-medium"
                    >
                      {phrase}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-950">
                <strong>Examiner Tip:</strong> {activeSet.practiceGuide.examinerTip}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  stopSpeech();
                  setShowPracticeGuideModal(false);
                }}
                className="px-4 py-1.5 bg-[#1E293B] hover:bg-[#0F172A] text-white text-xs font-semibold rounded cursor-pointer"
              >
                Close Practice Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Session Confirmation Dialog */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-lg border border-[#CBD5E1] bg-white text-[#111827] space-y-4 shadow-2xl font-sans">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Leave Speaking Interview?</span>
              </div>
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="p-1 hover:bg-slate-100 rounded cursor-pointer"
                aria-label="Close confirmation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-[#475569]">
              Your active spoken transcript and Part 2 scratchpad notes have not been submitted for evaluation yet. Leaving now will discard this session.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="px-4 py-1.5 rounded border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Stay in Interview
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                className="px-4 py-1.5 rounded bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer"
              >
                Exit Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Practice Speaking Summary Modal — ONLY for complete 4-criterion Speaking evaluations */}
      {evaluation && shouldPersistCDIELTSSpeakingToFirestore(evaluation) && (
        <SprintTRFModal
          isOpen={showTRFModal}
          onClose={() => setShowTRFModal(false)}
          data={{
            candidateName,
            testTitle: 'IELTS Academic Speaking Practice Simulation',
            examType: 'speaking_only',
            isFullMock: false,
            completedSkills: {
              listening: false,
              reading: false,
              writing: false,
              speaking: true
            },
            listeningBand: null,
            readingBand: null,
            writingBand: null,
            speakingBand: evaluation.overallBand,
            overallBand: null,
            testType: 'Academic'
          }}
        />
      )}
    </div>
  );
};
