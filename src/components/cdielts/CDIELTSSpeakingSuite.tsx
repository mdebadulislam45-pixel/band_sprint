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

  return (
    <div className={`min-h-screen ${theme.bg} ${fontSizeClass} flex flex-col font-sans select-none transition-colors duration-150`}>
      {/* CD-IELTS Top Exam Bar (Restrained Single Row) */}
      <header className={`min-h-12 px-3 sm:px-5 py-1.5 border-b ${theme.border} ${theme.headerBg} flex items-center justify-between gap-2 font-mono shrink-0`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={handleRequestExit}
            className="px-2.5 py-1 border border-current/25 bg-white/10 hover:bg-white/20 rounded text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
          <span className="px-2 py-0.5 bg-[#F4A62A] text-[#0E1F1E] rounded font-bold text-[11px] uppercase tracking-wider shrink-0 whitespace-nowrap">
            CD-IELTS SPEAKING
          </span>
          <span className="hidden lg:inline text-xs opacity-90 truncate">
            {candidateName} · Timed Oral Assessment
          </span>
        </div>

        {/* Accessibility, Practice Labs & Options */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-0.5 border border-current/25 rounded px-1.5 py-0.5 text-[11px]">
            {(['100%', '125%', '150%'] as CDIELTSZoomLevel[]).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setZoomLevel(lvl)}
                className={`px-1.5 py-0.5 rounded font-bold cursor-pointer transition whitespace-nowrap ${
                  zoomLevel === lvl ? 'bg-[#F4A62A] text-[#0E1F1E]' : 'hover:bg-white/10 opacity-80'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <select
            aria-label="Speaking Display Contrast"
            value={colorScheme}
            onChange={(e) => setColorScheme(e.target.value as CDIELTSColorScheme)}
            className="hidden sm:block border border-current/25 bg-black/25 text-current rounded text-[11px] px-2 py-1 outline-none cursor-pointer font-bold max-w-[130px] truncate"
          >
            <option value="standard" className="bg-white text-[#0E1F1E]">Standard</option>
            <option value="black-on-yellow" className="bg-[#FFF100] text-black">Black / Yellow</option>
            <option value="yellow-on-black" className="bg-black text-[#FFF100]">Yellow / Black</option>
            <option value="white-on-black" className="bg-black text-white">White / Black</option>
          </select>

          {onOpenPracticeLabs && (
            <button
              type="button"
              onClick={() => {
                stopSpeech();
                handleStopRecording();
                onOpenPracticeLabs();
              }}
              className="px-2.5 py-1 border border-current/25 bg-white/10 hover:bg-white/20 rounded text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
            >
              Practice Labs
            </button>
          )}
        </div>
      </header>

      {/* Persistent Speaking Interview Stage Stepper */}
      {stage !== 'intro' && (
        <nav
          aria-label="Speaking interview progress"
          className={`w-full px-4 sm:px-6 py-2.5 border-b ${theme.border} ${isStandard ? 'bg-[#E9EFEC]' : theme.cardBg} font-mono text-xs overflow-x-auto`}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 min-w-max">
            {stageSteps.map((step, idx) => {
              const isCurrent = step.id === stage;
              const isDone = activeStepIdx > idx;
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 px-3 py-1 rounded-md border text-[11px] font-bold ${
                    isCurrent
                      ? isStandard
                        ? 'bg-[#0F4C45] text-white border-[#0B3833]'
                        : theme.contrastBadge
                      : isDone
                      ? isStandard
                        ? 'bg-white text-[#0F4C45] border-[#0F4C45]/40'
                        : `${theme.cardBg} ${theme.border} opacity-90`
                      : `${theme.cardBg} ${theme.border} opacity-60`
                  }`}
                >
                  <span className="tabular-nums">{idx + 1}.</span>
                  <span>{step.label}</span>
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                </div>
              );
            })}
          </div>
        </nav>
      )}

      {/* Main Suite Container */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {/* ================= INTRO STAGE ================= */}
        {stage === 'intro' && (
          <div className={`p-5 sm:p-7 rounded-lg border ${theme.border} ${theme.cardBg} space-y-5 text-center animate-fade-in max-w-4xl mx-auto w-full`}>
            <div className="space-y-1.5">
              <div className={`text-[11px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 ${isStandard ? 'text-[#0F4C45]' : theme.subtext}`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>BandSprint Computer-Delivered Speaking Room</span>
              </div>
              <h1 className={`text-xl sm:text-2xl font-bold tracking-tight font-display ${theme.text}`}>
                IELTS Speaking Interview (Parts 1, 2 &amp; 3)
              </h1>
              <p className={`text-xs sm:text-sm max-w-2xl mx-auto ${theme.subtext}`}>
                Complete all three speaking stages with timed prompts, microphone recording, playback review, and rubric-aligned transcript analysis.
              </p>
            </div>

            {/* Honest Evidence & Pronunciation Notice */}
            <div className={`p-3.5 rounded-xl border text-left max-w-2xl mx-auto text-xs leading-relaxed ${isStandard ? 'bg-amber-50 border-amber-300 text-amber-950' : `${theme.cardBg} ${theme.border}`}`}>
              <div className="font-mono font-bold uppercase text-[11px] flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Honest Evidence &amp; Pronunciation Policy</span>
              </div>
              <p>
                Transcript-only submissions evaluate Fluency &amp; Coherence, Lexical Resource, and Grammatical Range &amp; Accuracy. Acoustic Pronunciation requires verified audio evidence and remains marked <strong>Unassessed</strong> whenever only text transcripts are available.
              </p>
            </div>

            {/* Examiner Persona Selector */}
            <div className={`p-5 rounded-xl border ${theme.border} ${isStandard ? 'bg-[#F5F7F6]' : theme.bg} text-left space-y-3 max-w-2xl mx-auto`}>
              <span className={`text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${isStandard ? 'text-[#0F4C45]' : theme.subtext}`}>
                <UserCheck className="w-3.5 h-3.5" />
                <span>Select Your British Speaking Examiner</span>
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
                  className={`p-3.5 rounded-xl border-2 text-left transition flex items-center gap-3 cursor-pointer ${
                    examinerGender === 'female'
                      ? isStandard
                        ? 'bg-[#0F4C45] border-[#0B3833] text-white shadow-sm'
                        : theme.contrastBadge
                      : `${theme.cardBg} ${theme.border} ${theme.text} hover:border-[#0F4C45]`
                  }`}
                >
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center font-mono font-black text-sm shrink-0 border ${
                    examinerGender === 'female'
                      ? 'bg-[#F4A62A] text-[#0E1F1E] border-[#F4A62A]'
                      : 'bg-[#0F4C45]/10 text-[#0F4C45] border-[#0F4C45]/25'
                  }`}>
                    CS
                  </div>
                  <div>
                    <div className="font-bold text-xs">Dr. Clara Sterling</div>
                    <div className="text-[11px] font-mono opacity-80">Composed British Examiner (RP)</div>
                    <div className="text-[10px] opacity-75">Formal female assessor voice</div>
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
                  className={`p-3.5 rounded-xl border-2 text-left transition flex items-center gap-3 cursor-pointer ${
                    examinerGender === 'male'
                      ? isStandard
                        ? 'bg-[#0F4C45] border-[#0B3833] text-white shadow-sm'
                        : theme.contrastBadge
                      : `${theme.cardBg} ${theme.border} ${theme.text} hover:border-[#0F4C45]`
                  }`}
                >
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center font-mono font-black text-sm shrink-0 border ${
                    examinerGender === 'male'
                      ? 'bg-[#F4A62A] text-[#0E1F1E] border-[#F4A62A]'
                      : 'bg-[#0F4C45]/10 text-[#0F4C45] border-[#0F4C45]/25'
                  }`}>
                    AP
                  </div>
                  <div>
                    <div className="font-bold text-xs">Prof. Arthur Pendelton</div>
                    <div className="text-[11px] font-mono opacity-80">Senior British Examiner (RP)</div>
                    <div className="text-[10px] opacity-75">Mature male assessor voice</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-2xl mx-auto text-xs">
              <div className={`p-3.5 rounded-xl border ${theme.border} ${isStandard ? 'bg-[#F5F7F6]' : theme.bg}`}>
                <div className={`font-bold mb-0.5 ${isStandard ? 'text-[#0F4C45]' : ''}`}>Part 1 (4–5 mins)</div>
                <div className={theme.subtext}>Familiar introductory questions</div>
              </div>
              <div className={`p-3.5 rounded-xl border ${theme.border} ${isStandard ? 'bg-[#F5F7F6]' : theme.bg}`}>
                <div className={`font-bold mb-0.5 ${isStandard ? 'text-[#B45309]' : ''}`}>Part 2 (3–4 mins)</div>
                <div className={theme.subtext}>1-min prep + 2-min cue card</div>
              </div>
              <div className={`p-3.5 rounded-xl border ${theme.border} ${isStandard ? 'bg-[#F5F7F6]' : theme.bg}`}>
                <div className={`font-bold mb-0.5 ${isStandard ? 'text-[#0F4C45]' : ''}`}>Part 3 (4–5 mins)</div>
                <div className={theme.subtext}>In-depth thematic analysis</div>
              </div>
            </div>

            <button
              onClick={() => {
                setStage('part1');
                soundManager.playSuccess();
                speakPrompt(part1Questions[0]);
              }}
              className={`px-8 py-3 rounded-xl font-bold text-sm shadow-sm transition inline-flex items-center gap-2 cursor-pointer ${
                isStandard ? 'bg-[#0F4C45] hover:bg-[#0B3833] text-white' : theme.accentBtn
              }`}
            >
              <span>Begin Speaking Interview</span>
              <ArrowRight className="w-4 h-4 text-[#F4A62A]" />
            </button>
          </div>
        )}

        {/* ================= PART 1: INTRODUCTORY QUESTIONS ================= */}
        {stage === 'part1' && (
          <div className={`p-5 sm:p-7 rounded-2xl border space-y-5 shadow-sm ${theme.cardBg} ${theme.border}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${theme.border}`}>
              <span className={`text-xs font-mono font-bold uppercase ${isStandard ? 'text-[#0F4C45]' : ''}`}>
                PART 1 · QUESTION {part1QuestionIdx + 1} OF {part1Questions.length}
              </span>
              <button
                onClick={() => speakPrompt(part1Questions[part1QuestionIdx])}
                className={`text-xs hover:underline flex items-center gap-1.5 font-semibold cursor-pointer ${isStandard ? 'text-[#0F4C45]' : ''}`}
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
                <div className={`p-5 rounded-xl border space-y-2 ${theme.border} ${isStandard ? 'bg-[#F5F7F6]' : theme.bg}`}>
                  <div className={`text-[11px] font-mono uppercase font-semibold ${theme.subtext}`}>
                    Examiner Question
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold leading-relaxed">
                    "{part1Questions[part1QuestionIdx]}"
                  </h2>
                  <p className={`text-xs pt-1 ${theme.subtext}`}>
                    Speak naturally into your microphone for 20–30 seconds.
                  </p>
                </div>

                {/* Candidate Recording Button, Microphone Status & Live Transcript */}
                <div className={`p-4 rounded-lg border space-y-3 ${theme.border} ${isStandard ? 'bg-white' : theme.bg}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-mono font-semibold flex items-center gap-2">
                      {isRecording && <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />}
                      <span>
                        Mic Status: {isRecording ? 'Recording Live' : micError ? 'Permission / Device Issue' : audioUrl && capturedAudioStage === 'part1' ? `Audio Captured (${Math.max(1, Math.round(capturedAudioBytes / 1024))} KB)` : 'Ready'}
                      </span>
                    </span>
                    {!isRecording ? (
                      <button
                        type="button"
                        data-testid="speaking-record-btn"
                        onClick={handleStartRecording}
                        className="px-4 py-1.5 rounded bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>{micError ? 'Retry Recording' : 'Start Recording'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid="speaking-stop-btn"
                        onClick={handleStopRecording}
                        className={`px-4 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer transition ${
                          isStandard ? 'bg-[#0F4C45] hover:bg-[#0B3833] text-white' : theme.accentBtn
                        }`}
                      >
                        <span>Stop Recording</span>
                      </button>
                    )}
                  </div>

                  {micError && (
                    <div role="alert" data-testid="speaking-mic-error" className="p-2.5 rounded border border-rose-300 bg-rose-50 text-rose-900 text-xs flex items-start justify-between gap-2">
                      <span>{micError}</span>
                      <button type="button" onClick={() => setMicError(null)} className="font-mono text-[11px] underline shrink-0 cursor-pointer">
                        Dismiss
                      </button>
                    </div>
                  )}

                  {audioUrl && capturedAudioStage === 'part1' && (
                    <audio data-testid="speaking-part1-audio" src={audioUrl} controls className="w-full h-8" />
                  )}

                  <textarea
                    aria-label="Part 1 Spoken Transcript"
                    value={spokenTranscript}
                    onChange={(e) => setSpokenTranscript(e.target.value)}
                    placeholder="Live speech transcript appears here while recording (or type/edit response notes)..."
                    rows={2}
                    className={`w-full p-2.5 rounded border text-xs outline-none focus:ring-2 focus:ring-[#0F4C45] ${theme.inputBg} ${theme.text}`}
                  />
                </div>

                <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                  <span className={`text-xs font-mono ${theme.subtext}`}>
                    Target: Natural pace without prolonged pauses
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
                      className={`px-6 py-2.5 rounded-lg font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer ${
                        isStandard ? 'bg-[#0F4C45] hover:bg-[#0B3833] text-white' : theme.accentBtn
                      }`}
                    >
                      <span>Next Question</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
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
                      className={`px-6 py-2.5 rounded-lg font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer ${
                        isStandard ? 'bg-[#F4A62A] hover:bg-[#E09620] text-[#0E1F1E]' : theme.accentBtn
                      }`}
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
          <div className={`p-5 sm:p-7 rounded-2xl border space-y-5 shadow-sm ${theme.cardBg} ${theme.border}`}>
            <div className={`flex items-center justify-between border-b pb-3 flex-wrap gap-2 ${theme.border}`}>
              <span className={`text-xs font-mono font-bold uppercase ${isStandard ? 'text-[#B45309]' : ''}`}>
                PART 2 · CANDIDATE CUE CARD & 1-MINUTE PREPARATION
              </span>
              <div
                data-testid="speaking-prep-timer"
                className={`flex items-center gap-2 font-mono font-bold text-sm px-3 py-1 rounded-lg border ${
                  isStandard
                    ? 'text-[#0E1F1E] bg-[#F4A62A]/20 border-[#F4A62A]/60'
                    : `${theme.border} ${theme.bg}`
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="tabular-nums">{formatClock(prepSecondsLeft)}</span>
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
                <div className={`p-5 rounded-xl border space-y-2.5 ${
                  isStandard ? 'bg-[#FFFDF7] border-[#F4A62A]/50' : `${theme.bg} ${theme.border}`
                }`}>
                  <div className={`text-xs font-mono font-bold uppercase ${isStandard ? 'text-[#B45309]' : ''}`}>
                    Candidate Cue Card
                  </div>
                  <h2 className="text-base sm:text-lg font-bold">{part2CueCard.title}</h2>
                  <p className={`text-xs font-medium ${theme.subtext}`}>You should say:</p>
                  <ul className="text-xs sm:text-sm space-y-1.5 list-disc pl-5">
                    {part2CueCard.cues.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>

                {/* Digital Scratchpad Note Taker */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${theme.subtext}`}>
                    <FileText className={`w-4 h-4 ${isStandard ? 'text-[#0F4C45]' : ''}`} />
                    <span>Candidate Scratchpad (Keywords & Outline)</span>
                  </label>
                  <textarea
                    value={candidateNotes}
                    onChange={(e) => setCandidateNotes(e.target.value)}
                    placeholder="e.g. 1. Solar desalination project, 2. Arabian Gulf, 3. Reduces brine pollution, 4. Scalable & green..."
                    rows={3}
                    className={`w-full p-3 rounded-xl border text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#0F4C45] ${theme.inputBg} ${theme.text}`}
                  />
                </div>

                <div className="flex items-center justify-between pt-1 flex-wrap gap-3">
                  {!isPrepTimerRunning ? (
                    <button
                      onClick={handleStartPrep}
                      className={`px-5 py-2.5 rounded-lg font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer ${
                        isStandard ? 'bg-[#F4A62A] hover:bg-[#E09620] text-[#0E1F1E]' : theme.accentBtn
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start 1-Minute Prep Timer</span>
                    </button>
                  ) : (
                    <span className={`text-xs italic ${theme.subtext}`}>
                      Preparation timer active — outline key ideas and vocabulary.
                    </span>
                  )}

                  <button
                    onClick={() => {
                      stopSpeech();
                      setIsPrepTimerRunning(false);
                      setIsExaminerSpeaking(false);
                      clearStageAudio();
                      setSpeakSecondsLeft(120);
                      setStage('part2_speak');
                      soundManager.playBeep(520, 0.05);
                    }}
                    className={`px-5 py-2.5 rounded-lg font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer ${
                      isStandard ? 'bg-[#0F4C45] hover:bg-[#0B3833] text-white' : theme.accentBtn
                    }`}
                  >
                    <span>Begin 2-Minute Long Turn</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= PART 2: 2-MINUTE SPEAKING TURN ================= */}
        {stage === 'part2_speak' && (
          <div className={`p-5 sm:p-7 rounded-2xl border space-y-5 shadow-sm ${theme.cardBg} ${theme.border}`}>
            <div className={`flex items-center justify-between border-b pb-3 flex-wrap gap-2 ${theme.border}`}>
              <span className={`text-xs font-mono font-bold uppercase ${isStandard ? 'text-[#0F4C45]' : ''}`}>
                PART 2 · CANDIDATE LONG TURN (2 MINUTES)
              </span>
              <div
                data-testid="speaking-longturn-timer"
                className={`flex items-center gap-2 font-mono font-bold text-sm px-3 py-1 rounded-lg border ${
                  speakSecondsLeft < 30
                    ? 'text-rose-700 bg-rose-50 border-rose-300 animate-pulse'
                    : isStandard
                    ? 'text-[#0F4C45] bg-[#0F4C45]/10 border-[#0F4C45]/30'
                    : `${theme.border} ${theme.bg}`
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="tabular-nums">{formatClock(speakSecondsLeft)}</span>
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
                  <div className={`p-3 rounded-xl border text-xs ${theme.border} ${isStandard ? 'bg-[#FFFDF7]' : theme.bg}`}>
                    <span className={`font-bold uppercase font-mono text-[10px] ${theme.subtext}`}>
                      Your Prep Notes:
                    </span>
                    <p className="mt-1 whitespace-pre-wrap">{candidateNotes}</p>
                  </div>
                )}

                {/* Audio Voice Recording Controls */}
                <div className={`p-4 rounded-xl border text-center space-y-3 ${theme.border} ${isStandard ? 'bg-[#F5F7F6]' : theme.bg}`}>
                  <div className="flex items-center justify-center gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
                      isRecording ? 'bg-rose-600/15 text-rose-600' : isStandard ? 'bg-[#0F4C45]/15 text-[#0F4C45]' : 'border border-current'
                    }`}>
                      <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-bold">
                        {isRecording ? 'Examiner Listening · Candidate Recording Active' : 'Press Start to Begin 2-Minute Monologue'}
                      </h3>
                      <p className={`text-xs ${theme.subtext}`}>
                        Aim to speak continuously for at least 1 minute 30 seconds.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    {!isRecording ? (
                      <button
                        onClick={handleStartRecording}
                        className="px-6 py-2.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs shadow-sm transition inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Mic className="w-4 h-4" />
                        <span>{micError ? 'Retry Recording' : 'Start Recording'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleStopRecording}
                        className={`px-6 py-2 rounded-lg font-bold text-xs transition inline-flex items-center gap-2 cursor-pointer ${
                          isStandard ? 'bg-[#0F4C45] hover:bg-[#0B3833] text-white' : theme.accentBtn
                        }`}
                      >
                        <span>Stop Recording</span>
                      </button>
                    )}
                  </div>

                  {micError && (
                    <div role="alert" data-testid="speaking-mic-error" className="p-2.5 rounded border border-rose-300 bg-rose-50 text-rose-900 text-xs text-left flex items-start justify-between gap-2">
                      <span>{micError}</span>
                      <button type="button" onClick={() => setMicError(null)} className="font-mono text-[11px] underline shrink-0 cursor-pointer">
                        Dismiss
                      </button>
                    </div>
                  )}

                  {audioUrl && capturedAudioStage === 'part2_speak' && (
                    <div className="pt-1">
                      <audio data-testid="speaking-part2-audio" src={audioUrl} controls className="mx-auto h-8" />
                    </div>
                  )}

                  {/* Real-Time Live Speech Analytics */}
                  <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 border-t text-left font-mono ${theme.border}`}>
                    <div className={`p-2.5 rounded-lg border ${theme.border} ${theme.cardBg}`}>
                      <div className={`text-[10px] uppercase ${theme.subtext}`}>Speech Rate</div>
                      <div className={`text-xs font-bold mt-0.5 ${currentWpm >= 115 && currentWpm <= 160 ? (isStandard ? 'text-[#0F4C45]' : '') : currentWpm > 0 ? (isStandard ? 'text-[#B45309]' : '') : theme.subtext}`}>
                        {currentWpm > 0 ? `${currentWpm} WPM` : 'Measuring...'}
                      </div>
                    </div>

                    <div className={`p-2.5 rounded-lg border ${theme.border} ${theme.cardBg}`}>
                      <div className={`text-[10px] uppercase ${theme.subtext}`}>Fillers</div>
                      <div className={`text-xs font-bold mt-0.5 ${detectedFillers > 3 && isStandard ? 'text-rose-700' : ''}`}>
                        {detectedFillers} words
                      </div>
                    </div>

                    <div className={`p-2.5 rounded-lg border ${theme.border} ${theme.cardBg}`}>
                      <div className={`text-[10px] uppercase ${theme.subtext}`}>C1 Lexis</div>
                      <div className={`text-xs font-bold mt-0.5 ${isStandard ? 'text-[#0F4C45]' : ''}`}>
                        {detectedAcademicWords.length} collocations
                      </div>
                    </div>
                  </div>
                </div>

                {/* Captured Transcript Box */}
                <div className="space-y-1">
                  <label className={`text-[11px] font-mono font-bold uppercase ${theme.subtext}`}>
                    Live Captured Speech Transcript
                  </label>
                  <textarea
                    value={spokenTranscript}
                    onChange={(e) => setSpokenTranscript(e.target.value)}
                    placeholder="Your spoken words will appear here automatically while recording..."
                    rows={2}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-[#0F4C45] ${theme.inputBg} ${theme.text}`}
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      handleStopRecording();
                      clearStageAudio();
                      setStage('part3');
                      soundManager.playSuccess();
                      speakPrompt(part3Questions[0]);
                    }}
                    className={`px-6 py-2.5 rounded-lg font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer ${
                      isStandard ? 'bg-[#0F4C45] hover:bg-[#0B3833] text-white' : theme.accentBtn
                    }`}
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
          <div className={`p-5 sm:p-7 rounded-2xl border space-y-5 shadow-sm ${theme.cardBg} ${theme.border}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${theme.border}`}>
              <span className={`text-xs font-mono font-bold uppercase ${isStandard ? 'text-[#0F4C45]' : ''}`}>
                PART 3 · THEMATIC DISCUSSION ({part3QuestionIdx + 1} OF {part3Questions.length})
              </span>
              <button
                onClick={() => speakPrompt(part3Questions[part3QuestionIdx])}
                className={`text-xs hover:underline flex items-center gap-1.5 font-semibold cursor-pointer ${isStandard ? 'text-[#0F4C45]' : ''}`}
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
                <div className={`p-5 rounded-xl border space-y-2 ${theme.border} ${isStandard ? 'bg-[#F5F7F6]' : theme.bg}`}>
                  <div className={`text-[11px] font-mono uppercase font-semibold ${theme.subtext}`}>
                    Discussion Question
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold leading-relaxed">
                    "{part3Questions[part3QuestionIdx]}"
                  </h2>
                  <p className={`text-xs pt-1 ${theme.subtext}`}>
                    Develop arguments with concrete real-world examples and balanced perspectives.
                  </p>
                </div>

                {/* Candidate Recording Button, Microphone Status & Live Transcript */}
                <div className={`p-4 rounded-lg border space-y-3 ${theme.border} ${isStandard ? 'bg-white' : theme.bg}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span data-testid="speaking-part3-mic-status" className="text-xs font-mono font-semibold flex items-center gap-2">
                      {isRecording && <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />}
                      <span>
                        Mic Status: {isRecording ? 'Recording Live' : micError ? 'Permission / Device Issue' : audioUrl && capturedAudioStage === 'part3' ? `Audio Captured (${Math.max(1, Math.round(capturedAudioBytes / 1024))} KB)` : 'Ready'}
                      </span>
                    </span>
                    {!isRecording ? (
                      <button
                        type="button"
                        data-testid="speaking-part3-record-btn"
                        onClick={handleStartRecording}
                        className="px-4 py-1.5 rounded bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>{micError ? 'Retry Recording' : 'Start Recording'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid="speaking-part3-stop-btn"
                        onClick={handleStopRecording}
                        className={`px-4 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer transition ${
                          isStandard ? 'bg-[#0F4C45] hover:bg-[#0B3833] text-white' : theme.accentBtn
                        }`}
                      >
                        <span>Stop Recording</span>
                      </button>
                    )}
                  </div>

                  {micError && (
                    <div role="alert" data-testid="speaking-mic-error" className="p-2.5 rounded border border-rose-300 bg-rose-50 text-rose-900 text-xs flex items-start justify-between gap-2">
                      <span>{micError}</span>
                      <button type="button" onClick={() => setMicError(null)} className="font-mono text-[11px] underline shrink-0 cursor-pointer">
                        Dismiss
                      </button>
                    </div>
                  )}

                  {audioUrl && capturedAudioStage === 'part3' && (
                    <audio data-testid="speaking-part3-audio" src={audioUrl} controls className="w-full h-8" />
                  )}

                  <textarea
                    aria-label="Part 3 Spoken Transcript"
                    data-testid="speaking-part3-transcript"
                    value={spokenTranscript}
                    onChange={(e) => setSpokenTranscript(e.target.value)}
                    placeholder="Live speech transcript appears here while recording..."
                    rows={2}
                    className={`w-full p-2.5 rounded border text-xs outline-none focus:ring-2 focus:ring-[#0F4C45] ${theme.inputBg} ${theme.text}`}
                  />
                </div>

                <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
                  <span className={`text-xs italic ${theme.subtext}`}>
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
                      className={`px-6 py-2.5 rounded-lg font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer ${
                        isStandard ? 'bg-[#0F4C45] hover:bg-[#0B3833] text-white' : theme.accentBtn
                      }`}
                    >
                      <span>Next Question</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleCompleteInterview}
                      className={`px-6 py-2.5 rounded-lg font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer ${
                        isStandard ? 'bg-[#0F4C45] hover:bg-[#0B3833] text-white' : theme.accentBtn
                      }`}
                    >
                      <span>Complete Interview & Evaluate</span>
                      <CheckCircle2 className="w-4 h-4 text-[#F4A62A]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= RESULT STAGE: BAND SCORECARD ================= */}
        {stage === 'result' && (
          <div className={`p-6 sm:p-8 rounded-2xl border space-y-6 shadow-sm max-w-4xl mx-auto w-full ${theme.cardBg} ${theme.border}`}>
            {isEvaluating ? (
              <div className="py-12 text-center space-y-3">
                <Loader2 className={`w-10 h-10 animate-spin mx-auto ${isStandard ? 'text-[#0F4C45]' : ''}`} />
                <h3 className="text-lg font-bold">Evaluating Speaking Performance...</h3>
                <p className={`text-xs ${theme.subtext}`}>
                  Analyzing fluency, lexical resource, grammatical range, and pronunciation against BandSprint practice descriptors.
                </p>
              </div>
            ) : evaluation &&
              (evaluation.assessmentStatus === 'evaluated' ||
                evaluation.assessmentStatus === 'partial_transcript_only') ? (
              <>
                <div className="text-center space-y-2">
                  <div
                    className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
                      evaluation.assessmentStatus === 'evaluated'
                        ? isStandard ? 'bg-[#0F4C45] text-[#F4A62A]' : theme.contrastBadge
                        : isStandard ? 'bg-[#F4A62A]/25 text-[#B45309]' : theme.contrastBadge
                    }`}
                  >
                    <Award className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {evaluation.assessmentStatus === 'evaluated'
                      ? 'Speaking Assessment Complete'
                      : 'Partial Speaking Assessment (Transcript-Only)'}
                  </h2>
                  <p className={`text-xs ${theme.subtext}`}>
                    BandSprint Practice Rubric Assessment · {evaluation.wordCount} Words Analyzed
                  </p>
                </div>

                {evaluation.assessmentStatus === 'partial_transcript_only' && (
                  <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                    isStandard ? 'bg-[#FFFDF7] border-[#F4A62A]/60 text-[#0E1F1E]' : `${theme.bg} ${theme.border}`
                  }`}>
                    <div className={`font-bold uppercase font-mono flex items-center gap-1.5 ${isStandard ? 'text-[#B45309]' : ''}`}>
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
                    <div key={c.title} className={`p-3.5 rounded-xl border ${theme.border} ${isStandard ? 'bg-[#F5F7F6]' : theme.bg}`}>
                      <div className={`text-[10px] uppercase font-mono ${theme.subtext}`}>{c.title}</div>
                      {typeof c.band === 'number' ? (
                        <div className={`text-2xl font-black font-mono my-1 ${isStandard ? 'text-[#0F4C45]' : ''}`}>
                          Band {c.band.toFixed(1)}
                        </div>
                      ) : (
                        <div className={`text-sm font-bold font-mono my-2 ${isStandard ? 'text-[#B45309]' : ''}`}>
                          Unassessed
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                  isStandard ? 'bg-[#F5F7F6] border-[#0F4C45]/25' : `${theme.bg} ${theme.border}`
                }`}>
                  <div className={`font-bold flex items-center gap-1.5 uppercase font-mono ${isStandard ? 'text-[#0F4C45]' : ''}`}>
                    <Sparkles className="w-4 h-4 text-[#F4A62A]" />
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
                <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
                  isStandard ? 'bg-rose-50 text-rose-700 border border-rose-200' : theme.contrastBadge
                }`}>
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold">
                  {evaluation.authRequired ? 'Sign In Required for AI Evaluation' : 'AI Speaking Evaluation Unavailable'}
                </h2>
                <p className={`text-xs sm:text-sm max-w-md mx-auto leading-relaxed ${theme.subtext}`}>
                  {evaluation.examinerFeedback}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {evaluation.canRetry && (
                    <button
                      onClick={handleCompleteInterview}
                      className={`px-6 py-2.5 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                        isStandard ? 'bg-[#0F4C45] hover:bg-[#0B3833] text-white' : theme.accentBtn
                      }`}
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Retry AI Evaluation</span>
                    </button>
                  )}
                  <button
                    onClick={() => setStage('part2_speak')}
                    className={`px-6 py-2.5 rounded-lg border font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer ${theme.border}`}
                  >
                    <span>Return to Part 2 Transcript</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4 py-6">
                <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
                  isStandard ? 'bg-[#FFFDF7] text-[#B45309] border border-[#F4A62A]/50' : theme.contrastBadge
                }`}>
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold">Insufficient Spoken Response Recorded</h2>
                <p className={`text-xs sm:text-sm max-w-md mx-auto leading-relaxed ${theme.subtext}`}>
                  {evaluation?.examinerFeedback ||
                    'We do not assign a synthetic band score when fewer than 5 spoken words are recorded. Return to Part 2 to record your voice or enter your spoken transcript.'}
                </p>
                <button
                  onClick={() => setStage('part2_speak')}
                  className={`px-6 py-2.5 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                    isStandard ? 'bg-[#F4A62A] hover:bg-[#E09620] text-[#0E1F1E]' : theme.accentBtn
                  }`}
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
                  className="px-6 py-2.5 rounded-lg bg-[#F4A62A] hover:bg-[#E09620] text-[#0E1F1E] font-bold text-xs shadow-sm transition inline-flex items-center gap-2 cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>Speaking Practice Summary</span>
                </button>
              )}
              <button
                onClick={onExit}
                className={`px-8 py-2.5 rounded-lg font-bold text-xs shadow-sm transition cursor-pointer ${
                  isStandard ? 'bg-[#0F4C45] hover:bg-[#0B3833] text-white' : theme.accentBtn
                }`}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Exit Session Confirmation Dialog */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className={`max-w-md w-full p-6 rounded-2xl border ${theme.border} ${theme.cardBg} ${theme.text} space-y-4 shadow-2xl`}>
            <div className="flex items-center justify-between border-b border-current/15 pb-2.5">
              <div className="flex items-center gap-2 font-mono font-bold text-sm uppercase">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Leave Speaking Interview?</span>
              </div>
              <button
                onClick={() => setShowExitConfirmModal(false)}
                className="p-1 hover:bg-black/10 rounded cursor-pointer"
                aria-label="Close confirmation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className={`text-xs leading-relaxed ${theme.subtext}`}>
              Your active spoken transcript and Part 2 scratchpad notes have not been submitted for evaluation yet. Leaving now will discard this session.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setShowExitConfirmModal(false)}
                className={`px-4 py-2 rounded-lg border text-xs font-bold cursor-pointer ${theme.border}`}
              >
                Stay in Interview
              </button>
              <button
                onClick={handleConfirmExit}
                className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold cursor-pointer"
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
