import React, { useState, useEffect, useRef } from 'react';
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
  ChevronRight,
  X,
  ArrowRight,
  Loader2,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { getPreferredVoiceGender, setPreferredVoiceGender } from '../../config/voiceConfig';
import { firebaseSyncService } from '../../services/firebaseSyncService';
import { getStoredSessionToken } from '../../services/authService';
import { SpeakingAssessmentStatus } from '../../types/speakingTypes';
import { roundOfficialIELTSBand } from '../../utils/scoringIntegrity';
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

export const CDIELTSSpeakingSuite: React.FC<CDIELTSSpeakingSuiteProps> = ({
  onExit,
  onShowToast,
  candidateName = 'Candidate'
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

  // Part 1 index
  const [part1QuestionIdx, setPart1QuestionIdx] = useState<number>(0);
  // Part 3 index
  const [part3QuestionIdx, setPart3QuestionIdx] = useState<number>(0);

  // Audio recording & speech recognition refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const part1Questions = [
    'Good afternoon. Can you tell me your full name, please?',
    'Where are you from, and what do you like most about your hometown?',
    'Do you work, or are you currently a student?',
    'How do you usually like to relax after a busy day or week?'
  ];

  const part2CueCard = {
    title: 'Describe a significant environmental project or initiative you know about.',
    cues: [
      'What the project or initiative is',
      'Where and when it was implemented',
      'How it addresses specific environmental challenges',
      'And explain why you think this initiative is important or successful.'
    ]
  };

  const part3Questions = [
    'To what extent do you believe individuals are responsible for environmental conservation compared to governments?',
    'How has public awareness of climate change shifted over the last decade in your country?',
    'Do you think technology will solve our environmental crises or create new ones?'
  ];

  // Clean up TTS and recording on unmount
  useEffect(() => {
    return () => {
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

  // Part 2 60-Second Prep Timer
  useEffect(() => {
    let interval: any = null;
    if (stage === 'part2_prep' && isPrepTimerRunning && prepSecondsLeft > 0) {
      interval = setInterval(() => {
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
    }
    return () => clearInterval(interval);
  }, [stage, isPrepTimerRunning, prepSecondsLeft, onShowToast]);

  // Part 2 120-Second Speaking Timer
  useEffect(() => {
    let interval: any = null;
    if (stage === 'part2_speak' && isRecording && speakSecondsLeft > 0) {
      interval = setInterval(() => {
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
    }
    return () => clearInterval(interval);
  }, [stage, isRecording, speakSecondsLeft, onShowToast]);

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
    soundManager.playSuccess();
    recordedChunksRef.current = [];

    // Start Web Speech API live transcription if supported by browser
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

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setSpeakSecondsLeft(120);
    } catch {
      setIsRecording(true);
      setSpeakSecondsLeft(120);
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

  return (
    <div className={`min-h-screen ${theme.bg} ${fontSizeClass} flex flex-col font-sans select-none`}>
      {/* CD-IELTS Top Exam Bar */}
      <header className={`px-4 sm:px-6 py-3 border-b ${theme.border} ${theme.headerBg} flex items-center justify-between font-mono`}>
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 bg-sky-600 text-white font-bold text-xs uppercase tracking-wider">
            CD-IELTS SPEAKING
          </span>
          <span className="hidden sm:inline text-xs text-slate-300">
            Candidate: <strong>{candidateName}</strong> · Standard Practice Interview
          </span>
        </div>

        {/* Accessibility & Options */}
        <div className="flex items-center gap-3">
          {/* Zoom Selector */}
          <div className="flex items-center gap-1 border border-gray-600 px-2 py-1 text-xs text-gray-200">
            <span>Zoom:</span>
            {(['100%', '125%', '150%'] as CDIELTSZoomLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setZoomLevel(lvl)}
                className={`px-1.5 py-0.5 font-bold cursor-pointer transition ${
                  zoomLevel === lvl ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-400'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Color Scheme Selector */}
          <select
            value={colorScheme}
            onChange={(e) => setColorScheme(e.target.value as CDIELTSColorScheme)}
            className="border border-gray-600 bg-gray-900 text-gray-200 text-xs px-2 py-1 outline-none cursor-pointer"
          >
            <option value="standard">Standard Contrast</option>
            <option value="black-on-yellow">Black on Yellow</option>
            <option value="yellow-on-black">Yellow on Black</option>
            <option value="white-on-black">White on Black</option>
          </select>

          <button
            onClick={() => {
              stopSpeech();
              handleStopRecording();
              onExit();
            }}
            className="px-3 py-1.5 border border-gray-600 hover:bg-gray-800 text-xs font-semibold text-gray-200 flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit Room</span>
          </button>
        </div>
      </header>

      {/* Main Suite Container */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {/* ================= INTRO STAGE ================= */}
        {stage === 'intro' && (
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-950 border border-slate-800 space-y-6 text-center animate-fade-in max-w-4xl mx-auto w-full">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 mx-auto flex items-center justify-center">
              <Mic className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-300 text-xs font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>IELTS Oral Simulation</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                1:1 IELTS Speaking Interview
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
                Featuring interactive AI Speaking Examiners with authentic British RP pronunciation, lip-synced articulation, and real-time Practice Band 9 assessment.
              </p>
            </div>

            {/* Examiner Persona Selector */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-3 max-w-xl mx-auto">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Select Your IELTS Speaking Examiner:</span>
              </span>

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
                  className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${
                    examinerGender === 'female'
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-500 via-pink-400 to-indigo-500 flex items-center justify-center text-xl shadow-inner border border-white/20 shrink-0">
                    👩‍🏫
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">Dr. Clara Sterling</div>
                    <div className="text-[10px] text-blue-300 font-mono">Senior Female Assessor Persona</div>
                    <div className="text-[10px] text-slate-400">Standard Southern British (RP)</div>
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
                  className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${
                    examinerGender === 'male'
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 via-indigo-500 to-amber-500 flex items-center justify-center text-xl shadow-inner border border-white/20 shrink-0">
                    👨‍🏫
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">Prof. Arthur Pendelton</div>
                    <div className="text-[10px] text-blue-300 font-mono">Senior Male Assessor Persona</div>
                    <div className="text-[10px] text-slate-400">Standard Southern British (RP)</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-lg mx-auto text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="font-bold text-blue-400 mb-0.5">Part 1 (4–5 mins)</div>
                <div className="text-slate-400">Familiar introductory questions</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="font-bold text-amber-400 mb-0.5">Part 2 (3–4 mins)</div>
                <div className="text-slate-400">1-min prep + 2-min cue card</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="font-bold text-emerald-400 mb-0.5">Part 3 (4–5 mins)</div>
                <div className="text-slate-400">In-depth thematic analysis</div>
              </div>
            </div>

            <button
              onClick={() => {
                setStage('part1');
                soundManager.playSuccess();
                speakPrompt(part1Questions[0]);
              }}
              className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Begin Speaking Interview</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ================= PART 1: INTRODUCTORY QUESTIONS ================= */}
        {stage === 'part1' && (
          <div className="p-5 sm:p-7 rounded-3xl bg-slate-950 border border-slate-800 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold text-blue-400 uppercase">
                PART 1 · QUESTION {part1QuestionIdx + 1} OF {part1Questions.length}
              </span>
              <button
                onClick={() => speakPrompt(part1Questions[part1QuestionIdx])}
                className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" /> Repeat Question
              </button>
            </div>

            {/* Split Screen: Live Animated Practice Examiner + Interactive Question Console */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <div className="lg:col-span-5">
                <ExaminerHumanoidCanvas
                  gender={examinerGender}
                  isSpeaking={isExaminerSpeaking}
                  isListening={isRecording}
                  spokenText={activeSpokenPrompt || part1Questions[part1QuestionIdx]}
                  candidateVolumeRms={isRecording ? 50 : 0}
                  activePartLabel="Part 1: Introduction"
                  compact={true}
                />
              </div>

              <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="text-[11px] font-mono text-slate-400 uppercase">
                    Examiner Spoken Question:
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                    "{part1Questions[part1QuestionIdx]}"
                  </h2>
                  <p className="text-xs text-slate-400 pt-1">
                    Speak naturally into your microphone for 20–30 seconds.
                  </p>
                </div>

                {/* Candidate Recording Button & Live Speech Feedback */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-300">
                      {isRecording ? 'Candidate Microphone Active · Speaking...' : 'Ready to Answer'}
                    </span>
                    {!isRecording ? (
                      <button
                        onClick={handleStartRecording}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>Start Speaking</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleStopRecording}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <span>Done Speaking</span>
                      </button>
                    )}
                  </div>

                  {spokenTranscript && (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 italic">
                      "{spokenTranscript}"
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500 font-mono">
                    Target: Fluency without long hesitations
                  </span>

                  {part1QuestionIdx < part1Questions.length - 1 ? (
                    <button
                      onClick={() => {
                        handleStopRecording();
                        const next = part1QuestionIdx + 1;
                        setPart1QuestionIdx(next);
                        soundManager.playBeep(520, 0.03);
                        speakPrompt(part1Questions[next]);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Next Question</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleStopRecording();
                        stopSpeech();
                        setIsExaminerSpeaking(false);
                        setStage('part2_prep');
                        soundManager.playSuccess();
                      }}
                      className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Proceed to Part 2 (Cue Card)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= PART 2: CUE CARD PREP (1-MINUTE TIMER) ================= */}
        {stage === 'part2_prep' && (
          <div className="p-5 sm:p-7 rounded-3xl bg-slate-950 border border-slate-800 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                PART 2 · CANDIDATE CUE CARD & 1-MINUTE PREP
              </span>
              <div className="flex items-center gap-2 font-mono font-bold text-sm text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                <Clock className="w-4 h-4" />
                <span>00:{prepSecondsLeft.toString().padStart(2, '0')}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <div className="lg:col-span-5">
                <ExaminerHumanoidCanvas
                  gender={examinerGender}
                  isSpeaking={isExaminerSpeaking}
                  isListening={false}
                  spokenText={activeSpokenPrompt || 'Please take one minute to prepare your notes on the cue card.'}
                  activePartLabel="Part 2: 1-Min Preparation"
                  compact={true}
                />
              </div>

              <div className="lg:col-span-7 space-y-4">
                {/* Cue Card Display */}
                <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2.5">
                  <div className="text-xs font-mono font-bold text-amber-500 uppercase">Topic Prompt:</div>
                  <h2 className="text-base sm:text-lg font-bold text-white">{part2CueCard.title}</h2>
                  <p className="text-xs text-slate-300">You should say:</p>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc pl-5">
                    {part2CueCard.cues.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>

                {/* Digital Scratchpad Note Taker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>Candidate Margin Scratchpad (Jot Keywords & Structure)</span>
                  </label>
                  <textarea
                    value={candidateNotes}
                    onChange={(e) => setCandidateNotes(e.target.value)}
                    placeholder="e.g. 1. Solar desalination project, 2. Arabian Gulf, 3. Reduces brine pollution, 4. Scalable & green..."
                    rows={3}
                    className="w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-xs sm:text-sm text-slate-200 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 flex-wrap gap-3">
                  {!isPrepTimerRunning ? (
                    <button
                      onClick={handleStartPrep}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start 1-Minute Prep Timer</span>
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      Prep timer running... jot down key vocabulary.
                    </span>
                  )}

                  <button
                    onClick={() => {
                      stopSpeech();
                      setIsExaminerSpeaking(false);
                      setStage('part2_speak');
                      soundManager.playBeep(520, 0.05);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Ready to Speak (Start 2-Min Turn)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= PART 2: 2-MINUTE SPEAKING TURN ================= */}
        {stage === 'part2_speak' && (
          <div className="p-5 sm:p-7 rounded-3xl bg-slate-950 border border-slate-800 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                PART 2 · CANDIDATE LONG TURN (2 MINUTES)
              </span>
              <div
                className={`flex items-center gap-2 font-mono font-bold text-sm px-3 py-1 rounded-lg border ${
                  speakSecondsLeft < 30
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/20 animate-pulse'
                    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>
                  {Math.floor(speakSecondsLeft / 60)}:
                  {(speakSecondsLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <div className="lg:col-span-5">
                <ExaminerHumanoidCanvas
                  gender={examinerGender}
                  isSpeaking={false}
                  isListening={isRecording}
                  candidateVolumeRms={isRecording ? 60 : 0}
                  activePartLabel="Part 2: 2-Min Monologue"
                  compact={true}
                />
              </div>

              <div className="lg:col-span-7 space-y-4">
                {/* Note reference drawer */}
                {candidateNotes && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <span className="font-bold text-slate-400 uppercase font-mono text-[10px]">
                      Your Prep Notes:
                    </span>
                    <p className="text-slate-300 mt-1">{candidateNotes}</p>
                  </div>
                )}

                {/* Audio Voice Recording Controls */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-600/20 text-blue-400">
                      <Mic className={`w-6 h-6 ${isRecording ? 'text-rose-500 animate-pulse' : ''}`} />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-bold text-white">
                        {isRecording ? 'Examiner Listening · Candidate Recording Active' : 'Press Start to Begin 2-Minute Monologue'}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Aim to speak continuously for at least 1 minute 30 seconds.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    {!isRecording ? (
                      <button
                        onClick={handleStartRecording}
                        className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Mic className="w-4 h-4" />
                        <span>Start Speaking</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleStopRecording}
                        className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition inline-flex items-center gap-2 cursor-pointer"
                      >
                        <span>Stop Recording</span>
                      </button>
                    )}
                  </div>

                  {audioUrl && (
                    <div className="pt-1">
                      <audio src={audioUrl} controls className="mx-auto h-8" />
                    </div>
                  )}

                  {/* Real-Time Live Speech Analytics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-left font-mono">
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Speech Rate</div>
                      <div className={`text-xs font-bold mt-0.5 ${currentWpm >= 115 && currentWpm <= 160 ? 'text-emerald-400' : currentWpm > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {currentWpm > 0 ? `${currentWpm} WPM` : 'Measuring...'}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Fillers</div>
                      <div className={`text-xs font-bold mt-0.5 ${detectedFillers > 3 ? 'text-rose-400' : 'text-slate-200'}`}>
                        {detectedFillers} words
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">C1 Lexis</div>
                      <div className="text-xs font-bold text-sky-400 mt-0.5">
                        {detectedAcademicWords.length} collocations
                      </div>
                    </div>
                  </div>
                </div>

                {/* Captured Transcript Box */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-bold uppercase text-slate-400">
                    Live Captured Speech Transcript:
                  </label>
                  <textarea
                    value={spokenTranscript}
                    onChange={(e) => setSpokenTranscript(e.target.value)}
                    placeholder="Your spoken words will appear here automatically while recording..."
                    rows={2}
                    className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-xs text-slate-200 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      handleStopRecording();
                      setStage('part3');
                      soundManager.playSuccess();
                      speakPrompt(part3Questions[0]);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Proceed to Part 3 (Discussion)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= PART 3: THEMATIC DISCUSSION ================= */}
        {stage === 'part3' && (
          <div className="p-5 sm:p-7 rounded-3xl bg-slate-950 border border-slate-800 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold text-blue-400 uppercase">
                PART 3 · THEMATIC DISCUSSION ({part3QuestionIdx + 1} OF {part3Questions.length})
              </span>
              <button
                onClick={() => speakPrompt(part3Questions[part3QuestionIdx])}
                className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" /> Repeat Prompt
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <div className="lg:col-span-5">
                <ExaminerHumanoidCanvas
                  gender={examinerGender}
                  isSpeaking={isExaminerSpeaking}
                  isListening={isRecording}
                  spokenText={activeSpokenPrompt || part3Questions[part3QuestionIdx]}
                  candidateVolumeRms={isRecording ? 50 : 0}
                  activePartLabel="Part 3: Discussion"
                  compact={true}
                />
              </div>

              <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="text-[11px] font-mono text-slate-400 uppercase">
                    Discussion Question:
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                    "{part3Questions[part3QuestionIdx]}"
                  </h2>
                  <p className="text-xs text-slate-400 pt-1">
                    Develop arguments with concrete real-world examples and nuanced perspectives.
                  </p>
                </div>

                {/* Candidate Recording Button */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-300">
                      {isRecording ? 'Candidate Microphone Active · Speaking...' : 'Ready to Answer'}
                    </span>
                    {!isRecording ? (
                      <button
                        onClick={handleStartRecording}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>Start Speaking</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleStopRecording}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <span>Done Speaking</span>
                      </button>
                    )}
                  </div>

                  {spokenTranscript && (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 italic">
                      "{spokenTranscript}"
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
                  <span className="text-xs text-slate-400 italic">
                    Abstract analysis & C1 discourse markers.
                  </span>

                  {part3QuestionIdx < part3Questions.length - 1 ? (
                    <button
                      onClick={() => {
                        handleStopRecording();
                        const next = part3QuestionIdx + 1;
                        setPart3QuestionIdx(next);
                        soundManager.playBeep(520, 0.03);
                        speakPrompt(part3Questions[next]);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Next Question</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleCompleteInterview}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Complete Interview & Evaluate</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= RESULT STAGE: AI BAND SCORECARD ================= */}
        {stage === 'result' && (
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-950 border border-slate-800 space-y-6 animate-fade-in max-w-4xl mx-auto w-full">
            {isEvaluating ? (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto" />
                <h3 className="text-lg font-bold text-white">Evaluating Speaking Performance...</h3>
                <p className="text-xs text-slate-400">
                  Analyzing fluency, lexical resource, grammatical range, and pronunciation against Practice descriptors.
                </p>
              </div>
                ) : evaluation &&
                  (evaluation.assessmentStatus === 'evaluated' ||
                    evaluation.assessmentStatus === 'partial_transcript_only') ? (
              <>
                <div className="text-center space-y-2">
                  <div
                    className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${
                      evaluation.assessmentStatus === 'evaluated'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    <Award className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">
                    {evaluation.assessmentStatus === 'evaluated'
                      ? 'Speaking Assessment Complete'
                      : 'Partial Speaking Assessment (Transcript-Only)'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    AI IELTS Examiner (Practice Rubric-Aligned) · {evaluation.wordCount} Words Analyzed
                  </p>
                </div>

                {evaluation.assessmentStatus === 'partial_transcript_only' && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1.5">
                    <div className="font-bold uppercase font-mono text-amber-300 flex items-center gap-1.5">
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
                    <div key={c.title} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] uppercase font-mono text-slate-400">{c.title}</div>
                      {typeof c.band === 'number' ? (
                        <div className="text-2xl font-black font-mono text-emerald-400 my-1">
                          Band {c.band.toFixed(1)}
                        </div>
                      ) : (
                        <div className="text-sm font-bold font-mono text-amber-300 my-2">
                          Unassessed
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-2">
                  <div className="font-bold text-blue-400 flex items-center gap-1.5 uppercase font-mono">
                    <Sparkles className="w-4 h-4" />
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
                  <p className="text-slate-300 leading-relaxed">{evaluation.examinerFeedback}</p>
                </div>
              </>
            ) : evaluation && evaluation.assessmentStatus === 'unavailable' ? (
              <div className="text-center space-y-4 py-6">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-white">
                  {evaluation.authRequired ? 'Sign In Required for AI Evaluation' : 'AI Speaking Evaluation Unavailable'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                  {evaluation.examinerFeedback}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {evaluation.canRetry && (
                    <button
                      onClick={handleCompleteInterview}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Retry AI Evaluation</span>
                    </button>
                  )}
                  <button
                    onClick={() => setStage('part2_speak')}
                    className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Return to Part 2 Transcript</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4 py-6">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-white">Insufficient Spoken Response Recorded</h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                  {evaluation?.examinerFeedback ||
                    'We do not assign a synthetic band score when fewer than 5 spoken words are recorded. Return to Part 2 to record your voice or enter your spoken transcript.'}
                </p>
                <button
                  onClick={() => setStage('part2_speak')}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retry Part 2 Recording</span>
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              {shouldPersistCDIELTSSpeakingToFirestore(evaluation) && (
                <button
                  onClick={() => setShowTRFModal(true)}
                  className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition inline-flex items-center gap-2 cursor-pointer"
                >
                  <Award className="w-4 h-4 text-slate-950" />
                  <span>Speaking Practice Summary</span>
                </button>
              )}
              <button
                onClick={onExit}
                className="px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

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
