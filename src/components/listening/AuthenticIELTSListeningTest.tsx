import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Clock,
  Flag,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Sparkles,
  AlertTriangle,
  Play,
  Check,
  CheckCheck,
  ChevronRight,
  Headphones,
  Sliders,
  ShieldCheck,
  Radio,
  Pause
} from 'lucide-react';
import { questionEngine, IELTSQuestion } from '../../services/QuestionEngine';
import { audioService, DialogueLine, AudioPlaybackState, IELTS_SPEAKERS } from '../../services/audioService';
import { audioManager } from '../../services/AudioManager';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';
import { testPersistenceService } from '../../services/testPersistenceService';
import { AudioPlaybackWaveform } from '../audio/AudioPlaybackWaveform';
import {
  zeroRepetitionEngine,
  UniqueExamGenerationResult,
  AudioProvenanceType,
  extractQuestionScriptText
} from '../../services/ZeroRepetitionEngine';
import {
  parseOptionItem,
  isListeningAnswerCorrect,
  formatDisplayedCorrectAnswer,
  extractWordLimitFromQuestion,
  assignSectionDialogueSpeakers,
  IELTS_LISTENING_PARTS,
  getListeningPartMeta,
  getListeningQuestionProgress,
  formatIELTSSpeechText
} from '../../utils/listeningAnswerEvaluator';
import { ListeningMapDiagram } from './ListeningMapDiagram';
import { recordExamAttempt } from '../../utils/userStorage';
import { addMistake } from '../../utils/vaultStorage';

export const LISTENING_AUDIO_TIME = 1800; // 30 minutes in seconds
export const ANSWER_CHECK_TIME = 120; // 2 minutes in seconds

const CD_LISTENING_STORAGE_KEY = 'ielts_cd_listening_exam_v2';

export interface CDListeningState {
  testId: string;
  status: 'instruction' | 'in_progress' | 'checking' | 'submitted';
  startTime: number | null;
  checkStartTime: number | null;
  questions: IELTSQuestion[];
  userAnswers: Record<string, string>;
  flaggedQuestions: Record<string, boolean>;
  currentIndex: number;
  submittedAt: number | null;
  provenance?: AudioProvenanceType;
  registrationCommitted?: boolean;
  scoreSummary: {
    correct: number;
    total: number;
    bandScore: number;
    partScores: {
      part1: { correct: number; total: number };
      part2: { correct: number; total: number };
      part3: { correct: number; total: number };
      part4: { correct: number; total: number };
    };
  } | null;
}

export function calculateListeningBandScore(correctCount: number): number {
  if (correctCount >= 39) return 9.0;
  if (correctCount >= 37) return 8.5;
  if (correctCount >= 35) return 8.0;
  if (correctCount >= 32) return 7.5;
  if (correctCount >= 30) return 7.0;
  if (correctCount >= 26) return 6.5;
  if (correctCount >= 23) return 6.0;
  if (correctCount >= 18) return 5.5;
  if (correctCount >= 16) return 5.0;
  if (correctCount >= 13) return 4.5;
  if (correctCount >= 10) return 4.0;
  if (correctCount >= 7) return 3.5;
  if (correctCount >= 4) return 3.0;
  return 2.5;
}

interface AuthenticIELTSListeningTestProps {
  onShowToast: (msg: string) => void;
  onSwitchToPracticeMode?: () => void;
}

export const AuthenticIELTSListeningTest: React.FC<AuthenticIELTSListeningTestProps> = React.memo(({
  onShowToast,
  onSwitchToPracticeMode
}) => {
  // Test State
  const [testState, setTestState] = useState<CDListeningState>(() => {
    // Attempt restoration from localStorage
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(CD_LISTENING_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as CDListeningState;
          if (parsed && Array.isArray(parsed.questions) && parsed.questions.length === 40) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Failed to parse saved CD listening state:', e);
      }
    }

    return {
      testId: 'cd_test_' + Date.now(),
      status: 'instruction',
      startTime: null,
      checkStartTime: null,
      questions: [],
      userAnswers: {},
      flaggedQuestions: {},
      currentIndex: 0,
      submittedAt: null,
      scoreSummary: null
    };
  });

  // Centralized Timers
  const [audioSecondsRemaining, setAudioSecondsRemaining] = useState<number>(LISTENING_AUDIO_TIME);
  const [checkSecondsRemaining, setCheckSecondsRemaining] = useState<number>(ANSWER_CHECK_TIME);

  // Audio status & live subscription to audioService
  const [playbackState, setPlaybackState] = useState<AudioPlaybackState>(audioService.getState());
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = audioService.subscribe((s) => {
      setPlaybackState(s);
      setIsAudioPlaying(s.isPlaying);
    });
    return unsub;
  }, []);

  // Focus ref for input
  const inputRef = useRef<HTMLInputElement>(null);

  // Sound check status
  const [isPlayingSoundCheck, setIsPlayingSoundCheck] = useState(false);
  const [examGenerationMeta, setExamGenerationMeta] = useState<UniqueExamGenerationResult | null>(null);
  const recordedExamIdRef = useRef<string | null>(
    testState.status === 'submitted' ? testState.testId : null
  );
  const isSubmittingRef = useRef<boolean>(testState.status === 'submitted');
  const handleSubmitTestRef = useRef<(submissionType?: 'timer' | 'manual') => void>(() => {});

  // 1. Generate 40 guaranteed-unique questions (10 per Part 1–4) via ZeroRepetitionEngine
  // Defer registration on instruction-screen mount so opening the screen alone does not mark all 40 questions used
  const initialize40Questions = useCallback((deferRegistration: boolean = true): IELTSQuestion[] => {
    const result = zeroRepetitionEngine.generateUniqueListeningExam40({ deferRegistration });
    setExamGenerationMeta(result);
    return result.questions;
  }, []);

  // Save to localStorage & IndexedDB with debouncing to prevent UI freeze during rapid clicks/typing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(CD_LISTENING_STORAGE_KEY, JSON.stringify(testState));

        testPersistenceService.saveProgress({
          sessionId: 'cd_listening_active_session',
          testType: 'authentic_40_listening',
          testSetId: testState.testId,
          activeSection: Math.floor(testState.currentIndex / 10) + 1,
          currentQuestionIndex: testState.currentIndex,
          answers: testState.userAnswers,
          flagged: testState.flaggedQuestions,
          status: testState.status,
          updatedAt: Date.now(),
          meta: {
            startTime: testState.startTime,
            checkStartTime: testState.checkStartTime,
            submittedAt: testState.submittedAt
          }
        });
      } catch (e) {
        console.warn('Failed to persist CD listening state:', e);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [testState]);

  // Initialize 40 questions immediately if empty (without marking as used until candidate starts or submits)
  useEffect(() => {
    if (testState.questions.length === 0) {
      const result = zeroRepetitionEngine.generateUniqueListeningExam40({ deferRegistration: true });
      setExamGenerationMeta(result);
      setTestState((prev) => {
        const nextState: CDListeningState = {
          ...prev,
          testId: result.examId,
          questions: result.questions,
          provenance: result.provenance.provenance,
          registrationCommitted: false
        };
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(CD_LISTENING_STORAGE_KEY, JSON.stringify(nextState));
          }
        } catch {}
        return nextState;
      });
    }
  }, [testState.questions.length]);

  // Proactively unlock and lock the session British voice while candidate reads instructions
  useEffect(() => {
    if (testState.status === 'instruction') {
      audioService.unlockAudio();
    }
  }, [testState.status]);

  // 2. Centralized Timing Engine
  useEffect(() => {
    if (testState.status === 'instruction' || testState.status === 'submitted') {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();

      if (testState.status === 'in_progress') {
        const start = testState.startTime || now;
        const elapsedSec = Math.floor((now - start) / 1000);
        const remaining = Math.max(0, LISTENING_AUDIO_TIME - elapsedSec);

        setAudioSecondsRemaining(remaining);

        // When 30-minute audio ends, enter 2-minute answer check period automatically
        if (remaining <= 0) {
          audioService.stop();
          stopSpeech();
          audioManager.reset('listening_audio_end');
          setIsAudioPlaying(false);

          soundManager.playChime30s();
          onShowToast('Audio completed. You now have 2 minutes to check your answers.');

          setTestState((prev) => ({
            ...prev,
            status: 'checking',
            checkStartTime: Date.now()
          }));
        }
      } else if (testState.status === 'checking') {
        const checkStart = testState.checkStartTime || now;
        const elapsedSec = Math.floor((now - checkStart) / 1000);
        const remaining = Math.max(0, ANSWER_CHECK_TIME - elapsedSec);

        setCheckSecondsRemaining(remaining);

        // When 2-minute answer check expires, automatically submit the test via latest handler ref
        if (remaining <= 0) {
          clearInterval(interval);
          handleSubmitTestRef.current('timer');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [testState.status, testState.startTime, testState.checkStartTime, onShowToast]);

  // Review filter for submitted results screen
  const [reviewPartFilter, setReviewPartFilter] = useState<'all' | 1 | 2 | 3 | 4>('all');

  // Determine current active question
  const currentQ = useMemo(() => {
    return testState.questions[testState.currentIndex] || null;
  }, [testState.questions, testState.currentIndex]);

  // Compute structured overall and part progress (e.g. Question 12 of 40 & Part 2 Question 2 of 10)
  const questionProgress = useMemo(() => {
    return getListeningQuestionProgress(testState.currentIndex, testState.questions.length || 40);
  }, [testState.currentIndex, testState.questions.length]);

  const activePart = questionProgress.part;
  const activePartMeta = useMemo(() => getListeningPartMeta(activePart), [activePart]);

  // Per-part completion and flag statistics for the 4-part navigator
  const partCompletionStats = useMemo(() => {
    return IELTS_LISTENING_PARTS.map((meta) => {
      const slice = testState.questions.slice(meta.startIndex, meta.endIndex + 1);
      let answered = 0;
      let flagged = 0;
      slice.forEach((q) => {
        if ((testState.userAnswers[q.id] || '').trim()) answered++;
        if (testState.flaggedQuestions[q.id]) flagged++;
      });
      return {
        ...meta,
        answered,
        flagged,
        total: slice.length || 10
      };
    });
  }, [testState.questions, testState.userAnswers, testState.flaggedQuestions]);

  // Build dialogue lines for all 4 parts of the examination with strict deduplication & authentic speaker separation
  const buildExamDialogue = useCallback((questions: IELTSQuestion[]): DialogueLine[] => {
    if (!questions || questions.length === 0) return [];

    const lines: DialogueLine[] = [];

    const appendPartQuestions = (
      partSlice: IELTSQuestion[],
      defaultLabel: string,
      sectionNum: 1 | 2 | 3 | 4 = 1
    ) => {
      const seenTexts = new Set<string>();
      const collectedDialogue: Array<{
        speaker?: string;
        speakerId?: string;
        gender?: 'male' | 'female';
        text: string;
        pauseAfterMs?: number;
      }> = [];

      let previousTopic: string | null = null;
      const partStartQuestionNumber = (sectionNum - 1) * 10 + 1;
      const partEndQuestionNumber = sectionNum * 10;

      partSlice.forEach((q, sliceIdx) => {
        const currentTopic = (q.topic || '').trim();
        const absoluteQuestionNumber = partStartQuestionNumber + sliceIdx;

        // If a part transitions to a second sub-topic (e.g., Questions 6-10), insert a natural examiner pause
        if (
          previousTopic &&
          currentTopic &&
          currentTopic !== previousTopic &&
          sliceIdx >= 3 &&
          sliceIdx <= 7
        ) {
          const transitionPrompt = `Before you hear the rest of Part ${sectionNum}, you have a moment to look at questions ${absoluteQuestionNumber} to ${partEndQuestionNumber}.`;
          if (!seenTexts.has(transitionPrompt)) {
            seenTexts.add(transitionPrompt);
            collectedDialogue.push({
              speaker: 'Cambridge Examiner (Arthur)',
              speakerId: 'speaker_04',
              gender: 'male',
              text: transitionPrompt,
              pauseAfterMs: 950
            });
          }
        }
        if (currentTopic) {
          previousTopic = currentTopic;
        }

        if (q.dialogue && q.dialogue.length > 0) {
          q.dialogue.forEach((d) => {
            const clean = formatIELTSSpeechText((d.text || '').trim());
            if (clean && !seenTexts.has(clean)) {
              seenTexts.add(clean);
              collectedDialogue.push({
                speaker: d.speaker,
                speakerId: d.speakerId,
                gender: d.gender,
                text: clean,
                pauseAfterMs: d.pauseAfterMs || (sectionNum === 4 ? 720 : 620)
              });
            }
          });
        } else if (q.audioScript) {
          const clean = formatIELTSSpeechText(q.audioScript.trim());
          if (clean && !seenTexts.has(clean)) {
            seenTexts.add(clean);
            collectedDialogue.push({
              speaker: defaultLabel,
              speakerId: 'speaker_04',
              gender: 'male',
              text: clean,
              pauseAfterMs: 750
            });
          }
        } else if (q.prompt) {
          const clean = formatIELTSSpeechText(q.prompt.trim());
          if (clean && !seenTexts.has(clean)) {
            seenTexts.add(clean);
            collectedDialogue.push({
              speaker: defaultLabel,
              speakerId: 'speaker_04',
              gender: 'male',
              text: clean,
              pauseAfterMs: 750
            });
          }
        }
      });

      const resolvedPartLines = assignSectionDialogueSpeakers(
        collectedDialogue,
        sectionNum,
        defaultLabel
      );
      resolvedPartLines.forEach((rl) => {
        lines.push({
          speakerId: rl.speakerId,
          speakerName: rl.speakerName,
          gender: rl.gender,
          text: rl.text,
          pauseAfterMs: rl.pauseAfterMs
        });
      });
    };

    // Official Cambridge Welcome & Test Opening
    lines.push({
      speakerId: 'speaker_04',
      speakerName: 'Cambridge Examiner (Arthur)',
      text: 'International English Language Testing System. Authentic Computer-Delivered Listening Examination. The test consists of four parts, with forty questions in total. You will hear each recording once only. Answer all questions as you listen. At the end of the test, you will have two minutes to check your answers.',
      pauseAfterMs: 1100
    });

    // Part 1: Everyday Social Conversation (Two Speakers)
    lines.push({
      speakerId: 'speaker_04',
      speakerName: 'Cambridge Examiner (Arthur)',
      text: 'Part 1. You will hear a conversation between two speakers in an everyday social context. First, you have some time to look at questions 1 to 10.',
      pauseAfterMs: 1100
    });

    appendPartQuestions(questions.slice(0, 10), 'Cambridge Speaker (Arthur)', 1);

    lines.push({
      speakerId: 'speaker_04',
      speakerName: 'Cambridge Examiner (Arthur)',
      text: 'That is the end of Part 1. You now have half a minute to check your answers to questions 1 to 10. Now turn to Part 2.',
      pauseAfterMs: 1100
    });

    // Part 2: Everyday Social Monologue (Single Speaker)
    lines.push({
      speakerId: 'speaker_04',
      speakerName: 'Cambridge Examiner (Arthur)',
      text: 'Part 2. You will hear a talk by a single speaker about local community facilities and public arrangements. First, you have some time to look at questions 11 to 20.',
      pauseAfterMs: 1100
    });

    appendPartQuestions(questions.slice(10, 20), 'Community Guide (Charlotte)', 2);

    lines.push({
      speakerId: 'speaker_04',
      speakerName: 'Cambridge Examiner (Arthur)',
      text: 'That is the end of Part 2. You now have half a minute to check your answers to questions 11 to 20. Now turn to Part 3.',
      pauseAfterMs: 1100
    });

    // Part 3: Academic Discussion (Two to Four Speakers)
    lines.push({
      speakerId: 'speaker_04',
      speakerName: 'Cambridge Examiner (Arthur)',
      text: 'Part 3. You will hear an academic discussion between university students and their tutor. First, you have some time to look at questions 21 to 30.',
      pauseAfterMs: 1100
    });

    appendPartQuestions(questions.slice(20, 30), 'Academic Tutor (Dr. Alistair)', 3);

    lines.push({
      speakerId: 'speaker_04',
      speakerName: 'Cambridge Examiner (Arthur)',
      text: 'That is the end of Part 3. You now have half a minute to check your answers to questions 21 to 30. Now turn to Part 4.',
      pauseAfterMs: 1100
    });

    // Part 4: Academic Lecture Monologue (Single Speaker)
    lines.push({
      speakerId: 'speaker_04',
      speakerName: 'Cambridge Examiner (Arthur)',
      text: 'Part 4. You will hear an academic lecture by a single speaker on a university subject. First, you have some time to look at questions 31 to 40.',
      pauseAfterMs: 1100
    });

    appendPartQuestions(questions.slice(30, 40), 'University Lecturer (Professor Arthur)', 4);

    // Final Conclusion
    lines.push({
      speakerId: 'speaker_04',
      speakerName: 'Cambridge Examiner (Arthur)',
      text: 'That is the end of Part 4 and the end of the listening audio recording. You now have two minutes to check and finalize your answers across all four parts.',
      pauseAfterMs: 1000
    });

    return lines;
  }, []);

  const fullExamDialogue = useMemo(() => {
    return buildExamDialogue(testState.questions);
  }, [testState.questions, buildExamDialogue]);

  // Start the Listening Examination
  const handleStartExam = () => {
    audioService.unlockAudio();
    if (isPlayingSoundCheck) {
      stopSpeech();
      setIsPlayingSoundCheck(false);
    }

    const qs = testState.questions.length === 40 ? testState.questions : initialize40Questions(false);
    const activeTestId = examGenerationMeta?.examId || testState.testId || 'cd_listening_' + Date.now();
    const activeProvenance =
      examGenerationMeta?.provenance.provenance ||
      testState.provenance ||
      'original_practice_synthesized';

    // Register exam questions as active/published when the candidate actually begins the test
    const combinedScript = qs.map((q) => extractQuestionScriptText(q)).join('\n');
    zeroRepetitionEngine.registerCompletedOrPublishedExam({
      examId: activeTestId,
      examType: 'cd_listening_40',
      questions: qs,
      rawScripts: [combinedScript],
      provenance: activeProvenance
    });

    const initialAnswers: Record<string, string> = {};
    const initialFlags: Record<string, boolean> = {};
    qs.forEach((q) => {
      initialAnswers[q.id] = testState.userAnswers[q.id] || '';
      initialFlags[q.id] = testState.flaggedQuestions[q.id] || false;
    });

    const startTime = Date.now();
    isSubmittingRef.current = false;
    recordedExamIdRef.current = null;

    const nextInProgressState: CDListeningState = {
      testId: activeTestId,
      status: 'in_progress',
      startTime,
      checkStartTime: null,
      questions: qs,
      userAnswers: initialAnswers,
      flaggedQuestions: initialFlags,
      currentIndex: 0,
      submittedAt: null,
      scoreSummary: null,
      provenance: activeProvenance,
      registrationCommitted: true
    };
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(CD_LISTENING_STORAGE_KEY, JSON.stringify(nextInProgressState));
      }
    } catch {}
    setTestState(nextInProgressState);

    setAudioSecondsRemaining(LISTENING_AUDIO_TIME);
    setCheckSecondsRemaining(ANSWER_CHECK_TIME);

    soundManager.playSuccess();
    onShowToast('Listening Test Started. Part 1 (Questions 1–10) British RP audio is now playing.');

    startUnifiedAudioPlayback(qs, activeTestId);
  };

  // Play unified audio across the 40 questions using the locked British voice engine at official 1.0x speed
  const startUnifiedAudioPlayback = (qs: IELTSQuestion[], activeExamId?: string) => {
    audioService.unlockAudio();
    if (playbackState.playbackRate !== 1.0) {
      audioService.setPlaybackRate(1.0);
    }

    setIsAudioPlaying(true);
    setAudioError(null);

    const dialogueLines = buildExamDialogue(qs);
    if (!dialogueLines || dialogueLines.length === 0) {
      return;
    }

    audioService.playDialogue(dialogueLines, {
      testId: activeExamId || testState.testId || 'cd_listening_unified',
      examId: activeExamId || testState.testId || 'cd_listening_unified',
      onEnd: () => {
        setIsAudioPlaying(false);
      }
    }).catch((err) => {
      console.warn('Audio playback warning:', err);
      setIsAudioPlaying(false);
    });
  };

  // In strict Exam Mode, if mobile browser interruption pauses the audio, allow the candidate to resume
  const handleResumeInterruptedExamAudio = () => {
    audioService.unlockAudio();
    if (playbackState.isPaused) {
      audioService.resume();
    } else if (!playbackState.isPlaying) {
      startUnifiedAudioPlayback(
        testState.questions.length > 0 ? testState.questions : initialize40Questions(false),
        testState.testId
      );
    }
  };

  // Sound Check function (Plays short British Male sample)
  const handleSoundCheck = () => {
    if (isPlayingSoundCheck) return;
    setIsPlayingSoundCheck(true);
    soundManager.playBeep(520, 0.1);

    speakBritish(
      'This is an authentic Cambridge IELTS sound check. If you can hear this recording clearly, your audio system is functioning correctly.',
      {
        speakerId: 'speaker_04',
        onEnd: () => setIsPlayingSoundCheck(false),
        onError: () => setIsPlayingSoundCheck(false)
      }
    );
  };

  // Answer handler
  const handleAnswerChange = (qId: string, value: string) => {
    setTestState((prev) => ({
      ...prev,
      userAnswers: {
        ...prev.userAnswers,
        [qId]: value
      }
    }));
  };

  // Toggle Flag
  const handleToggleFlag = (qId: string) => {
    setTestState((prev) => {
      const nextFlags = {
        ...prev.flaggedQuestions,
        [qId]: !prev.flaggedQuestions[qId]
      };
      soundManager.playBeep(nextFlags[qId] ? 700 : 450, 0.05);
      return {
        ...prev,
        flaggedQuestions: nextFlags
      };
    });
  };

  // Navigate between questions
  const handleGoToQuestion = (idx: number) => {
    if (idx < 0 || idx >= testState.questions.length) return;
    setTestState((prev) => ({
      ...prev,
      currentIndex: idx
    }));
    soundManager.playBeep(600, 0.03);
  };

  const handleNextQuestion = () => {
    if (testState.currentIndex < testState.questions.length - 1) {
      handleGoToQuestion(testState.currentIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (testState.currentIndex > 0) {
      handleGoToQuestion(testState.currentIndex - 1);
    }
  };

  // Jump to specific Part
  const handleJumpToPart = (partNum: 1 | 2 | 3 | 4) => {
    const targetIdx = (partNum - 1) * 10;
    handleGoToQuestion(targetIdx);
  };

  // Auto-focus input on question switch
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [testState.currentIndex]);

  // Submit and Evaluate Test
  const handleSubmitTest = useCallback(
    (submissionType: 'timer' | 'manual' = 'manual') => {
      if (
        testState.status === 'submitted' ||
        isSubmittingRef.current ||
        recordedExamIdRef.current === testState.testId
      ) {
        return;
      }
      isSubmittingRef.current = true;
      recordedExamIdRef.current = testState.testId;

      audioService.stop();
      stopSpeech();
      audioManager.reset('listening_submit');
      setIsAudioPlaying(false);

      let totalCorrect = 0;
      const partScores = {
        part1: { correct: 0, total: 10 },
        part2: { correct: 0, total: 10 },
        part3: { correct: 0, total: 10 },
        part4: { correct: 0, total: 10 }
      };

      testState.questions.forEach((q, idx) => {
        const rawUserAns = (testState.userAnswers[q.id] || '').trim();
        const isCorrect = isListeningAnswerCorrect(q, rawUserAns);

        if (isCorrect) {
          totalCorrect++;
          if (idx < 10) partScores.part1.correct++;
          else if (idx < 20) partScores.part2.correct++;
          else if (idx < 30) partScores.part3.correct++;
          else partScores.part4.correct++;
        } else {
          try {
            addMistake({
              module: 'listening',
              title: `CD-IELTS Listening Q${idx + 1}: ${q.prompt}`,
              userAnswer: rawUserAns || '(blank)',
              correctAnswer: formatDisplayedCorrectAnswer(q),
              explanation: q.explanation || 'Review Cambridge dialogue audio script.'
            });
          } catch (vaultErr) {
            console.warn('Could not log mistake to vault:', vaultErr);
          }
        }

        // Record in QuestionEngine for spaced repetition and mistake analytics (skip duplicate Mistake Vault write)
        try {
          questionEngine.recordAttempt({
            questionId: q.id,
            module: 'listening',
            questionType: q.questionType,
            topic: q.topic,
            userAnswer: rawUserAns || '(blank)',
            isCorrect,
            score: isCorrect ? 1 : 0,
            mistakeType: !isCorrect ? 'listening_comprehension' : undefined,
            explanation: q.explanation || 'Review Cambridge dialogue audio script.',
            skipMistakeVault: true
          });
        } catch (err) {
          console.warn('Could not record question attempt:', err);
        }
      });

      const bandScore = calculateListeningBandScore(totalCorrect);

      // Ensure completed exam is registered in ZeroRepetitionEngine and persisted once to user examHistory
      try {
        const combinedScript = testState.questions.map((q) => extractQuestionScriptText(q)).join('\n');
        zeroRepetitionEngine.registerCompletedOrPublishedExam({
          examId: testState.testId,
          examType: 'cd_listening_40',
          questions: testState.questions,
          rawScripts: [combinedScript],
          provenance:
            examGenerationMeta?.provenance.provenance ||
            testState.provenance ||
            'original_practice_synthesized'
        });
      } catch (regErr) {
        console.warn('Could not register completed exam in ZeroRepetitionEngine:', regErr);
      }

      try {
        recordExamAttempt({
          id: testState.testId,
          examType: 'listening_only',
          overallBand: null,
          listeningBand: bandScore,
          readingBand: null,
          writingBand: null,
          wordCount: 0,
          submissionType: submissionType === 'timer' ? 'timer' : 'manual',
          correctCount: totalCorrect,
          totalQuestions: testState.questions.length || 40
        });
      } catch (persistErr) {
        console.warn('Could not persist completed exam attempt to userStorage:', persistErr);
      }

      soundManager.playSuccess();
      onShowToast(`Listening Test Submitted! Band Score: ${bandScore.toFixed(1)} (${totalCorrect}/40)`);

      setTestState((prev) => {
        const nextSubmitted: CDListeningState = {
          ...prev,
          status: 'submitted',
          submittedAt: Date.now(),
          registrationCommitted: true,
          scoreSummary: {
            correct: totalCorrect,
            total: 40,
            bandScore,
            partScores
          }
        };
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(CD_LISTENING_STORAGE_KEY, JSON.stringify(nextSubmitted));
          }
        } catch {}
        return nextSubmitted;
      });
    },
    [
      testState.status,
      testState.questions,
      testState.userAnswers,
      testState.testId,
      testState.provenance,
      examGenerationMeta,
      onShowToast
    ]
  );

  handleSubmitTestRef.current = handleSubmitTest;

  // Restart / Generate New Unique Exam
  const handleRetakeExam = () => {
    audioService.stop();
    stopSpeech();
    localStorage.removeItem(CD_LISTENING_STORAGE_KEY);
    // Register current set before requesting a new unique exam so the new exam has 0% overlap with the previewed set
    if (testState.questions.length > 0) {
      const combinedScript = testState.questions.map((q) => extractQuestionScriptText(q)).join('\n');
      zeroRepetitionEngine.registerCompletedOrPublishedExam({
        examId: testState.testId,
        examType: 'cd_listening_40',
        questions: testState.questions,
        rawScripts: [combinedScript],
        provenance:
          examGenerationMeta?.provenance.provenance ||
          testState.provenance ||
          'original_practice_synthesized'
      });
    }
    const result = zeroRepetitionEngine.generateUniqueListeningExam40({ deferRegistration: true });
    setExamGenerationMeta(result);
    isSubmittingRef.current = false;
    recordedExamIdRef.current = null;
    const nextRetakeState: CDListeningState = {
      testId: result.examId,
      status: 'instruction',
      startTime: null,
      checkStartTime: null,
      questions: result.questions,
      userAnswers: {},
      flaggedQuestions: {},
      currentIndex: 0,
      submittedAt: null,
      scoreSummary: null,
      provenance: result.provenance.provenance,
      registrationCommitted: false
    };
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(CD_LISTENING_STORAGE_KEY, JSON.stringify(nextRetakeState));
      }
    } catch {}
    setTestState(nextRetakeState);
    setAudioSecondsRemaining(LISTENING_AUDIO_TIME);
    setCheckSecondsRemaining(ANSWER_CHECK_TIME);
    onShowToast(result.inventoryReport.statusMessage);
  };

  // Format time as MM:SS
  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ==========================================
  // VIEW 1: INSTRUCTION SCREEN
  // ==========================================
  if (testState.status === 'instruction') {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
        {/* Top Header Mode Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse"></span>
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-800">
              Full-Test Exam Mode · Strict Computer-Delivered IELTS Protocol
            </span>
          </div>

          {onSwitchToPracticeMode && (
            <button
              onClick={onSwitchToPracticeMode}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1"
            >
              <span>Switch to Section Practice Mode</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Official CD-IELTS Instruction Card */}
        <div className="bg-white rounded-3xl border border-slate-300 p-6 sm:p-10 shadow-sm space-y-8">
          <div className="border-b border-slate-200 pb-6">
            <div className="inline-block px-3 py-1 bg-slate-900 text-white text-[11px] font-mono font-bold rounded-md tracking-wider uppercase">
              Official Examination Protocol
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3 tracking-tight">
              IELTS Listening Examination
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Academic & General Training · Four-Part Computer-Delivered Format (40 Questions)
            </p>
          </div>

          {/* Test Structure Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-[11px] font-mono font-bold uppercase text-slate-500">Total Questions</div>
              <div className="text-2xl font-black text-slate-900">40 Questions</div>
              <div className="text-xs text-slate-600">4 Parts × 10 Questions</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-[11px] font-mono font-bold uppercase text-slate-500">Audio Duration</div>
              <div className="text-2xl font-black text-slate-900">~30 Minutes</div>
              <div className="text-xs text-slate-600">Plays once only (1.0x locked)</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-[11px] font-mono font-bold uppercase text-slate-500">Answer Checking</div>
              <div className="text-2xl font-black text-slate-900">2 Minutes</div>
              <div className="text-xs text-slate-600">Review & edit answers</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-[11px] font-mono font-bold uppercase text-slate-500">Exam Controls</div>
              <div className="text-2xl font-black text-slate-900">Strict CD-IELTS</div>
              <div className="text-xs text-slate-600">No replay or transcript</div>
            </div>
          </div>

          {/* Four-Part Examination Blueprint */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 uppercase font-mono text-xs tracking-wider">
                Four-Part Listening Structure (Questions 1–40)
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                British English (en-GB) Studio Voices
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {IELTS_LISTENING_PARTS.map((partMeta) => (
                <div
                  key={partMeta.part}
                  className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-mono font-bold uppercase">
                      Part {partMeta.part} · {partMeta.questionRangeLabel}
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {partMeta.speakerCountLabel}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {partMeta.shortTitle}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {partMeta.contextDescription}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Instructions */}
          <div className="space-y-3 bg-slate-50/80 p-5 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-700">
            <h3 className="font-bold text-slate-900 uppercase font-mono text-xs tracking-wider">
              Test Day Rules & Instructions
            </h3>
            <ul className="space-y-2 list-disc list-inside">
              <li>
                <strong>Single Continuous Broadcast:</strong> In Full-Test Exam Mode, the recording plays <strong>once only at 1.0x speed</strong> without rewind, scrubbing, or transcript display.
              </li>
              <li>
                <strong>Four Organised Parts:</strong> Progress sequentially through Part 1 (Q1–10), Part 2 (Q11–20), Part 3 (Q21–30), and Part 4 (Q31–40).
              </li>
              <li>
                <strong>Non-Interrupting Navigation:</strong> Switching between questions or parts updates your view immediately without restarting or regenerating audio.
              </li>
              <li>
                <strong>Review Period:</strong> When all 4 parts conclude, the system enters a <strong>2-minute final answer-checking period</strong>, after which your test submits automatically.
              </li>
              <li>
                <strong>Natural British Voice Separation:</strong> Parts 1 and 3 use clearly distinct British male and female voices; Parts 2 and 4 use single-speaker monologue delivery.
              </li>
            </ul>
          </div>

          {/* Zero-Repetition & Audio Provenance Verification Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-emerald-950">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero-Repetition Engine Active · Original Practice Audio</span>
                <span className="text-emerald-400">·</span>
                <span className="font-mono text-[11px] text-emerald-800">
                  ID: {examGenerationMeta?.examId || testState.testId}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                {examGenerationMeta?.inventoryReport.statusMessage ||
                  'Every generated exam uses 40 unused questions and a unique script fingerprint with zero overlap across your exam history.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetakeExam}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
              <span>Generate New Unique Exam</span>
            </button>
          </div>

          {/* Sound Check Bar */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-indigo-950">Audio Check Required</div>
                <div className="text-[11px] text-indigo-800">
                  Put on your headphones and test your sound level before starting.
                </div>
              </div>
            </div>

            <button
              onClick={handleSoundCheck}
              disabled={isPlayingSoundCheck}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
                isPlayingSoundCheck
                  ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                  : 'bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50 shadow-2xs'
              }`}
            >
              <Volume2 className="w-4 h-4 text-indigo-600" />
              <span>{isPlayingSoundCheck ? 'Playing Sound Sample...' : 'Test Sound'}</span>
            </button>
          </div>

          {/* Start Test Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <div className="text-xs text-slate-500 font-mono">
              Ready to begin Part 1 (Questions 1–10) · 40 Unique Questions Verified
            </div>

            <button
              onClick={handleStartExam}
              className="px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-black text-white text-sm font-black shadow-lg transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <Radio className="w-4 h-4 text-rose-400" />
              <span>Start Listening Test (30 Min Audio + 2 Min Check)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: SUBMITTED / RESULTS SCREEN
  // ==========================================
  if (testState.status === 'submitted' && testState.scoreSummary) {
    const { correct, total, bandScore, partScores } = testState.scoreSummary;

    const partScoreByNumber: Record<1 | 2 | 3 | 4, { correct: number; total: number }> = {
      1: partScores.part1,
      2: partScores.part2,
      3: partScores.part3,
      4: partScores.part4
    };

    const filteredReviewQuestions = testState.questions
      .map((q, idx) => ({ q, idx, partNum: (Math.floor(idx / 10) + 1) as 1 | 2 | 3 | 4 }))
      .filter((item) => reviewPartFilter === 'all' || item.partNum === reviewPartFilter);

    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
        {/* Header Results Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold uppercase">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Listening-Only Exam Completed & Evaluated
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                IELTS Listening Examination Result
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Authentic 40-question examination performance across Parts 1–4 based on standard Cambridge conversion scales.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRetakeExam}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake Listening Exam</span>
              </button>

              {onSwitchToPracticeMode && (
                <button
                  onClick={onSwitchToPracticeMode}
                  className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition"
                >
                  <span>Section Practice Mode</span>
                </button>
              )}
            </div>
          </div>

          {/* Scores Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex flex-col justify-between shadow-sm">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-300">Listening Band Score</div>
              <div className="my-2">
                <span className="text-5xl font-black text-white">{bandScore.toFixed(1)}</span>
                <span className="text-sm font-semibold text-slate-300 ml-1.5">/ 9.0</span>
              </div>
              <div className="text-xs text-indigo-200">
                {bandScore >= 8.0 ? 'Expert User (C2 Level)' : bandScore >= 7.0 ? 'Good User (C1 Level)' : 'Competent User (B2 Level)'}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-500">Raw Correct Count</div>
              <div className="my-2">
                <span className="text-5xl font-black text-slate-900">{correct}</span>
                <span className="text-sm font-semibold text-slate-500 ml-1.5">/ {total}</span>
              </div>
              <div className="text-xs text-slate-600">
                Accuracy: {Math.round((correct / total) * 100)}%
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-500">Mistakes Recorded</div>
              <div className="my-2">
                <span className="text-5xl font-black text-rose-600">{total - correct}</span>
                <span className="text-sm font-semibold text-slate-500 ml-1.5">questions</span>
              </div>
              <div className="text-xs text-slate-600">
                Logged to Mistake Vault for spaced review
              </div>
            </div>
          </div>

          {/* Part Breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-500 tracking-wider">
              Performance by Part (Click a Part to Filter Review)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {IELTS_LISTENING_PARTS.map((meta) => {
                const ps = partScoreByNumber[meta.part];
                const isSelected = reviewPartFilter === meta.part;
                return (
                  <button
                    key={meta.part}
                    type="button"
                    onClick={() => setReviewPartFilter(isSelected ? 'all' : meta.part)}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-900 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[11px] font-mono font-bold uppercase ${isSelected ? 'text-indigo-200' : 'text-slate-600'}`}>
                        Part {meta.part} ({meta.shortRangeLabel})
                      </span>
                      <span className={`text-[10px] font-mono ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {meta.speakerCountLabel}
                      </span>
                    </div>
                    <div className={`text-xs font-bold mt-1 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                      {meta.shortTitle}
                    </div>
                    <div className={`text-lg font-black mt-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                      {ps.correct} / {ps.total}
                    </div>
                    <div className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {ps.correct * 10}% accuracy
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detailed Review Table */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">
              Comprehensive Question Review & Diagnostic Explanations
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setReviewPartFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  reviewPartFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All (1–40)
              </button>
              {IELTS_LISTENING_PARTS.map((meta) => (
                <button
                  key={meta.part}
                  type="button"
                  onClick={() => setReviewPartFilter(meta.part)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                    reviewPartFilter === meta.part
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Part {meta.part} ({meta.shortRangeLabel})
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredReviewQuestions.map(({ q, idx, partNum }) => {
              const userAns = (testState.userAnswers[q.id] || '').trim();
              const isCorrect = isListeningAnswerCorrect(q, userAns);
              const expectedAnsText = formatDisplayedCorrectAnswer(q);
              const partMeta = getListeningPartMeta(partNum);
              const partQuestionIdx = (idx % 10) + 1;

              return (
                <div
                  key={q.id || idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCorrect
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/50 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center font-mono font-bold text-xs text-slate-800">
                        {idx + 1}
                      </span>
                      <span className="text-[11px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-700">
                        Part {partNum} · {partMeta.shortTitle} (Q{partQuestionIdx} of 10)
                      </span>
                      {isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4" /> Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-xs">
                          <XCircle className="w-4 h-4" /> Incorrect
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-2 text-xs sm:text-sm font-medium text-slate-800">
                    {q.prompt}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-slate-500 font-medium">Your Answer: </span>
                      <span className={userAns ? (isCorrect ? 'font-bold text-emerald-700' : 'font-bold text-rose-700') : 'italic text-slate-400'}>
                        {userAns || '(Blank)'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-slate-500 font-medium">Correct Answer: </span>
                      <span className="font-bold text-emerald-800">{expectedAnsText}</span>
                    </div>
                  </div>

                  {q.explanation && (
                    <div className="mt-2.5 p-3 rounded-xl bg-white/70 border border-slate-200/80 text-xs text-slate-700">
                      <strong>Cambridge Analysis:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: ACTIVE TEST VIEW (IN_PROGRESS or CHECKING)
  // ==========================================
  const isCheckingPhase = testState.status === 'checking';
  const remainingSeconds = isCheckingPhase ? checkSecondsRemaining : audioSecondsRemaining;

  const currentAnswer = currentQ ? testState.userAnswers[currentQ.id] || '' : '';
  const isCurrentFlagged = currentQ ? testState.flaggedQuestions[currentQ.id] || false : false;
  const activeSpeakerDisplay =
    playbackState.currentSpeakerName ||
    IELTS_SPEAKERS[playbackState.currentSpeakerId]?.name ||
    'Arthur (Cambridge Examiner)';
  const totalAnsweredOverall = Object.values(testState.userAnswers).filter((v) => String(v || '').trim().length > 0).length;
  const audioBroadcastProgressPct =
    playbackState.duration > 0
      ? Math.min(100, Math.round(((playbackState.currentTime || 0) / playbackState.duration) * 100))
      : Math.min(100, Math.round(((LISTENING_AUDIO_TIME - audioSecondsRemaining) / LISTENING_AUDIO_TIME) * 100));

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 animate-fade-in pb-20 select-none">
      {/* 1. Official CD-IELTS Top Examination Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-3 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-xs shrink-0">
            CD
          </div>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase text-slate-400">
              <span>Full-Test Exam Mode</span>
              <span>·</span>
              <span className="text-emerald-400 font-bold">{questionProgress.overallLabel}</span>
            </div>
            <div className="text-sm font-bold text-white flex flex-wrap items-center gap-2 mt-0.5">
              <span>Part {activePart} of 4: {activePartMeta.shortTitle}</span>
              <span className="text-xs text-slate-300 font-mono font-normal">
                ({activePartMeta.questionRangeLabel} · {questionProgress.partLabel})
              </span>
            </div>
          </div>
        </div>

        {/* Audio Progress / Phase Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
          {isCheckingPhase ? (
            <span className="flex items-center gap-1.5 text-amber-300 font-bold font-mono">
              <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Answer Checking Period (No Replay)</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-slate-200 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Single-Play Exam Broadcast · 1.0x</span>
            </span>
          )}
        </div>

        {/* Centralized Timer Countdown */}
        <div className="flex items-center gap-3">
          <div
            className={`px-3.5 py-1.5 rounded-xl font-mono text-sm font-extrabold flex items-center gap-2 border ${
              isCheckingPhase
                ? 'bg-amber-950/80 text-amber-300 border-amber-600 animate-pulse'
                : remainingSeconds < 300
                ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                : 'bg-slate-800 text-white border-slate-700'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>{formatTime(remainingSeconds)}</span>
            <span className="text-[10px] font-sans font-normal opacity-80">
              {isCheckingPhase ? 'review left' : 'remaining'}
            </span>
          </div>

          <button
            onClick={() => handleSubmitTest('manual')}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-2xs active:scale-95 cursor-pointer"
          >
            <span>Finish & Submit</span>
          </button>
        </div>
      </div>

      {/* 2. Four-Part Section Navigator Strip (Parts 1–4 with Context, Speakers & Progress) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {partCompletionStats.map((partItem) => {
          const isPartActive = activePart === partItem.part;
          return (
            <button
              key={partItem.part}
              type="button"
              onClick={() => handleJumpToPart(partItem.part)}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                isPartActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/20'
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span
                  className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
                    isPartActive ? 'text-rose-300' : 'text-slate-600'
                  }`}
                >
                  Part {partItem.part} · Q{partItem.shortRangeLabel}
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isPartActive
                      ? 'bg-slate-800 text-indigo-200 border border-slate-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {partItem.speakerCountLabel}
                </span>
              </div>

              <div className={`text-xs font-extrabold truncate ${isPartActive ? 'text-white' : 'text-slate-900'}`}>
                {partItem.shortTitle}
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-slate-200/20">
                <span className={isPartActive ? 'text-emerald-300 font-semibold' : 'text-slate-500'}>
                  {partItem.answered}/{partItem.total} answered
                </span>
                {partItem.flagged > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-amber-500 font-bold">
                    <Flag className="w-2.5 h-2.5 fill-amber-500" />
                    {partItem.flagged}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Official CD-IELTS Strict Exam Broadcast Strip (No Rewind / Scrubbing / Speed / Transcript) */}
      {!isCheckingPhase && (
        <div className="bg-white dark:bg-[#0B1224] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 sm:p-4 shadow-sm space-y-2.5 transition">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {/* Broadcast Status / Emergency Resume if Browser Paused */}
              {playbackState.isPlaying ? (
                <div
                  className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs"
                  title="Official Single-Play Exam Broadcast Active"
                >
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleResumeInterruptedExamAudio}
                  className="px-3 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs transition active:scale-95 cursor-pointer"
                  title="Resume Interrupted Exam Audio"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Resume Audio</span>
                </button>
              )}

              {/* Speaker & Broadcast Lock Info */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight">
                    {playbackState.isPlaying
                      ? 'Official CD-IELTS Audio Broadcast'
                      : 'Broadcast Paused — Tap Resume Audio'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                    <span>🇬🇧 en-GB</span>
                    <span>·</span>
                    <span>{activeSpeakerDisplay}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    1.0x Official Speed · Single Play
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  {activePartMeta.speakerFormatLabel} · Navigating questions does not interrupt audio
                </div>
              </div>
            </div>

            {/* Audio Waveform, Exam Tone & Volume (Strict Exam Mode Controls Only) */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <AudioPlaybackWaveform
                isPlaying={playbackState.isPlaying}
                isLoading={playbackState.isLoading}
                height={26}
                barCount={14}
                variant="compact"
                showLabel={false}
              />

              {/* Ambience exam tone button */}
              <button
                onClick={() => audioService.toggleAmbience()}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition border flex items-center gap-1.5 cursor-pointer ${
                  playbackState.isAmbienceEnabled
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                }`}
                title="Toggle Cambridge Exam Hall Acoustic Tone"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exam Tone</span>
              </button>

              {/* Volume control */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => audioService.setVolume(playbackState.volume > 0 ? 0 : 1)}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                  title="Mute / Unmute"
                >
                  {playbackState.volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-500" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={playbackState.volume}
                  onChange={(e) => audioService.setVolume(parseFloat(e.target.value))}
                  className="w-14 sm:w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  aria-label="Volume"
                />
              </div>
            </div>
          </div>

          {/* Read-only Broadcast Progress Bar (No seeking/scrubbing in strict exam mode) */}
          <div className="flex items-center gap-3 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
            <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400 w-12 text-left">
              {formatTime(Math.floor(playbackState.currentTime || 0))}
            </span>
            <div
              className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={audioBroadcastProgressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Exam Audio Broadcast Progress"
            >
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${audioBroadcastProgressPct}%` }}
              />
            </div>
            <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400 w-12 text-right">
              {formatTime(Math.floor(playbackState.duration > 0 ? playbackState.duration : LISTENING_AUDIO_TIME))}
            </span>
          </div>
        </div>
      )}

      {/* Answer Checking Notification Banner */}
      {isCheckingPhase && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 shadow-xs flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs sm:text-sm font-medium">
              <strong>Audio playback is complete.</strong> You now have 2 minutes to check and edit your answers across all 40 questions. When time expires, your test will submit automatically.
            </div>
          </div>

          <button
            onClick={() => handleSubmitTest('manual')}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 shadow-2xs cursor-pointer"
          >
            Submit Now
          </button>
        </div>
      )}

      {/* 4. Active Part Context & Dual Progress Banner */}
      <div className="bg-slate-100/90 border border-slate-200 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[11px] font-bold uppercase">
              {activePartMeta.title}
            </span>
            <span className="text-xs font-mono font-bold text-slate-700">
              {activePartMeta.questionRangeLabel}
            </span>
            <span className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {activePartMeta.speakerFormatLabel}
            </span>
          </div>
          <p className="text-xs text-slate-600">
            {activePartMeta.contextDescription}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold shadow-2xs">
            Overall: {questionProgress.overallLabel}
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-indigo-950 text-white font-bold shadow-2xs">
            Part {activePart}: {questionProgress.partLabel}
          </div>
        </div>
      </div>

      {/* 5. Main Question Display Card */}
      {currentQ && (
        <div className="bg-white rounded-3xl border border-slate-300 p-6 sm:p-8 shadow-xs space-y-6">
          {/* Question Title & Section Instructions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                <span className="text-slate-900">{questionProgress.overallLabel}</span>
                <span>·</span>
                <span className="text-indigo-700">Part {activePart} ({questionProgress.partLabel})</span>
                <span>·</span>
                <span>{currentQ.questionType.replace(/_/g, ' ').toUpperCase()}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                {currentQ.topic || `${activePartMeta.title} Scenario`}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleFlag(currentQ.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                  isCurrentFlagged
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Flag className={`w-3.5 h-3.5 ${isCurrentFlagged ? 'fill-amber-600 text-amber-600' : 'text-slate-400'}`} />
                <span>{isCurrentFlagged ? 'Flagged for Review' : 'Flag Question'}</span>
              </button>
            </div>
          </div>

          {/* Official Instructions note */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <strong>Official IELTS Instructions:</strong>{' '}
            {currentQ.questionType === 'map_labelling' ? (
              <span>
                Label the map below. Choose the correct letter, <strong>A–D</strong>.
              </span>
            ) : currentQ.options && currentQ.options.length > 0 ? (
              <span>
                Choose the correct letter, <strong>A, B, or C</strong>.
              </span>
            ) : extractWordLimitFromQuestion(currentQ) === 1 ? (
              <span>
                Write <strong>ONE WORD ONLY</strong> for this answer.
              </span>
            ) : (
              <span>
                Write <strong>NO MORE THAN TWO WORDS AND/OR A NUMBER</strong> for each answer unless stated otherwise.
              </span>
            )}
          </div>

          {/* Map Diagram Blueprint (Rendered when questionType is map_labelling) */}
          {currentQ.questionType === 'map_labelling' && (
            <ListeningMapDiagram topic={currentQ.topic} />
          )}

          {/* Prompt / Question body */}
          <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200 text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
            {currentQ.prompt}
          </div>

          {/* Answer Input Controls */}
          <div className="space-y-4 pt-2">
            {/* Multiple Choice / Map Labelling Options if applicable */}
            {currentQ.options && currentQ.options.length > 0 ? (
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-slate-500 font-bold block">
                  {currentQ.questionType === 'map_labelling' ? 'Select Map Position (A–D):' : 'Select One Option:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentQ.options.map((opt, oIdx) => {
                    const parsed = parseOptionItem(
                      opt,
                      oIdx,
                      currentQ.questionType === 'map_labelling'
                    );
                    const userUpper = currentAnswer.trim().toUpperCase();
                    const isSelected =
                      userUpper === parsed.letter ||
                      userUpper === parsed.fullRaw.toUpperCase() ||
                      userUpper === parsed.label.toUpperCase();

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => handleAnswerChange(currentQ.id, parsed.letter)}
                        className={`p-3.5 rounded-xl text-left text-xs sm:text-sm font-medium transition flex items-center gap-3 border cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-bold font-mono text-xs shrink-0 ${
                            isSelected ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {parsed.letter}
                        </span>
                        <span className="flex-1">{parsed.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Text Completion Field */
              <div className="space-y-2 max-w-xl">
                <label className="text-xs font-mono uppercase text-slate-500 font-bold block">
                  Type Your Answer:
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={currentAnswer}
                    onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleNextQuestion();
                      }
                    }}
                    placeholder="Enter answer (e.g. 15 March, 07700 900331)..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 shadow-2xs"
                  />
                  {currentAnswer && (
                    <span className="absolute right-3 top-3 text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Answer Saved
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Prev / Next Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={handlePrevQuestion}
              disabled={testState.currentIndex === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                testState.currentIndex === 0
                  ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200'
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous Question</span>
            </button>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
              <span>{questionProgress.overallLabel}</span>
              <span>·</span>
              <span className="text-indigo-700 font-bold">Part {activePart}: {questionProgress.partLabel}</span>
            </div>

            <button
              onClick={handleNextQuestion}
              disabled={testState.currentIndex === testState.questions.length - 1}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                testState.currentIndex === testState.questions.length - 1
                  ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200'
                  : 'bg-slate-900 text-white border-slate-900 hover:bg-black shadow-2xs'
              }`}
            >
              <span>Next Question</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 6. Computer-Delivered IELTS Four-Part Bottom Navigation Dock */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="text-xs font-mono font-bold text-slate-800">
            Section & Question Navigator ({totalAnsweredOverall} / 40 Answered)
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-slate-900"></span>
              <span>Current</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-600"></span>
              <span>Answered</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-white border border-slate-300"></span>
              <span>Unanswered</span>
            </span>
            <span className="flex items-center gap-1">
              <Flag className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
              <span>Flagged</span>
            </span>
          </div>
        </div>

        {/* Grouped 4-Part Question Number Palette */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {IELTS_LISTENING_PARTS.map((partMeta) => {
            const isPartCurrent = activePart === partMeta.part;
            const partQuestions = testState.questions.slice(partMeta.startIndex, partMeta.endIndex + 1);

            return (
              <div
                key={partMeta.part}
                className={`p-2.5 rounded-xl border transition ${
                  isPartCurrent
                    ? 'bg-slate-50/90 border-slate-400'
                    : 'bg-slate-50/40 border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <button
                    type="button"
                    onClick={() => handleJumpToPart(partMeta.part)}
                    className="text-[11px] font-mono font-bold text-slate-800 hover:text-indigo-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        isPartCurrent ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      Part {partMeta.part}
                    </span>
                    <span>{partMeta.shortTitle}</span>
                    <span className="text-slate-400">({partMeta.shortRangeLabel})</span>
                  </button>
                  <span className="text-[10px] font-mono text-slate-500">
                    {partMeta.speakerCountLabel}
                  </span>
                </div>

                <div className="grid grid-cols-10 gap-1">
                  {partQuestions.map((q, localIdx) => {
                    const globalIdx = partMeta.startIndex + localIdx;
                    const isAnswered = Boolean((testState.userAnswers[q.id] || '').trim());
                    const isCurrent = globalIdx === testState.currentIndex;
                    const isFlagged = Boolean(testState.flaggedQuestions[q.id]);

                    return (
                      <button
                        key={q.id || globalIdx}
                        type="button"
                        onClick={() => handleGoToQuestion(globalIdx)}
                        className={`relative h-8 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center border cursor-pointer ${
                          isCurrent
                            ? 'ring-2 ring-slate-900 border-slate-900 bg-slate-900 text-white'
                            : isAnswered
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        title={`Part ${partMeta.part} · Question ${globalIdx + 1} (Part Q${localIdx + 1} of 10)`}
                      >
                        <span>{globalIdx + 1}</span>
                        {isFlagged && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-1 ring-white"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
