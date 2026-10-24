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
  ListFilter
} from 'lucide-react';
import { soundManager } from '../utils/audioEffects';
import { addMistake } from '../utils/vaultStorage';
import { speakBritish, stopSpeech } from '../utils/britishVoice';
import { IELTSAudioPlayer } from './audio/IELTSAudioPlayer';
import { AudioPlaybackWaveform } from './audio/AudioPlaybackWaveform';
import { questionEngine, IELTSQuestion } from '../services/QuestionEngine';
import { audioService, DialogueLine, AudioPlaybackState, isInterruptedPlaybackError } from '../services/audioService';
import { audioManager } from '../services/AudioManager';
import { AuthenticIELTSListeningTest } from './listening/AuthenticIELTSListeningTest';
import { testPersistenceService } from '../services/testPersistenceService';
import { AudioErrorBoundary } from './common/AudioErrorBoundary';
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
  formatIELTSSpeechText
} from '../utils/listeningAnswerEvaluator';
import { ListeningMapDiagram } from './listening/ListeningMapDiagram';

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
}

export const ListeningLab: React.FC<ListeningLabProps> = React.memo(({ onShowToast }) => {
  // Primary IELTS Listening Mode: Authentic 40-question mock exam vs Section Practice
  const [viewMode, setViewMode] = useState<'authentic_mock' | 'section_practice'>('authentic_mock');

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
  const [hasRestoredSession, setHasRestoredSession] = useState(false);
  const [isLoadingListening, setIsLoadingListening] = useState(false);

  // Focus ref for text inputs
  const inputRef = useRef<HTMLInputElement>(null);

  // Real-time audio playback state for visual waveform feedback
  const [audioPlaybackState, setAudioPlaybackState] = useState<AudioPlaybackState>(audioService.getState());

  useEffect(() => {
    const unsub = audioService.subscribe((s) => {
      setAudioPlaybackState(s);
    });
    return unsub;
  }, []);

  // 1. Initial State Restoration from localStorage with IndexedDB fallback
  useEffect(() => {
    let isCancelled = false;

    const restoreSession = async () => {
      try {
        const raw = localStorage.getItem(LISTENING_STORAGE_KEY);
        if (raw) {
          const parsed: ListeningPersistedState = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.questionIds) && parsed.questionIds.length > 0) {
            const restoredQuestions: IELTSQuestion[] = [];
            for (const qId of parsed.questionIds) {
              const found = questionEngine.getQuestionById(qId);
              if (found) {
                restoredQuestions.push(found);
              }
            }

            if (restoredQuestions.length > 0 && !isCancelled) {
              setActiveSection(parsed.activeSection || 1);
              setMode(parsed.mode || 'adaptive_10');
              setQuestions(restoredQuestions);
              setActiveQuestionIndex(
                parsed.activeQuestionIndex >= 0 && parsed.activeQuestionIndex < restoredQuestions.length
                  ? parsed.activeQuestionIndex
                  : 0
              );
              setUserAnswers(parsed.userAnswers || {});
              setFlaggedQuestions(parsed.flaggedQuestions || {});
              setIsEvaluated(Boolean(parsed.isEvaluated));
              setScoreSummary(parsed.scoreSummary || null);
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
            setActiveSection((idbSession.activeSection as any) || 1);
            setMode(idbSession.meta.mode || 'adaptive_10');
            setQuestions(restoredQuestions);
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
        console.warn('Failed to restore listening state from storage:', e);
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

  // When candidate switches entire section or scenario, cleanly reset prior audio
  useEffect(() => {
    audioManager.reset(`switch_section_${activeSection}`);
  }, [activeSection, activeScenarioTopic]);

  // Handle Section Tab switching
  const handleSelectSection = (sec: 1 | 2 | 3 | 4) => {
    if (sec === activeSection && questions.length > 0) return;
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

  // Compile full audio dialogue for active topic/scenario with realistic Cambridge test duration
  const currentDialogue = useMemo(() => {
    const currentTopic = activeScenarioTopic || questions[0]?.topic || 'Cambridge Standard Audio';
    const scenarioQuestions = questions.filter((q) => q.topic === currentTopic);
    const partMeta = getListeningPartMeta(activeSection);

    const mergedLines: DialogueLine[] = [];
    const seenTexts = new Set<string>();

    // 1. Original Practice Examiner Intro
    mergedLines.push({
      speaker: 'British Examiner (Arthur)',
      speakerId: 'speaker_04',
      gender: 'male',
      text: `International English Language Testing System. Section Practice Mode. Part ${activeSection}, ${partMeta.questionRangeLabel}. You will hear a recording concerning ${currentTopic}. First, you have some time to look at the questions below.`,
      pauseAfterMs: 1050
    });

    mergedLines.push({
      speaker: 'British Examiner (Arthur)',
      speakerId: 'speaker_04',
      gender: 'male',
      text: `Now listen carefully to the recording and answer the questions.`,
      pauseAfterMs: 700
    });

    // 2. Scenario dialogue lines: guaranteed-distinct speakers across 2-speaker and 3-speaker sections, single-speaker in Parts 2 & 4
    if (scenarioQuestions.length > 0) {
      const rawScenarioLines: Array<{
        speaker?: string;
        speakerId?: string;
        gender?: 'male' | 'female';
        text: string;
        pauseAfterMs?: number;
      }> = [];

      scenarioQuestions.forEach((q) => {
        if (q.dialogue && q.dialogue.length > 0) {
          q.dialogue.forEach((line) => {
            const t = formatIELTSSpeechText((line.text || '').trim());
            if (t && !seenTexts.has(t)) {
              seenTexts.add(t);
              rawScenarioLines.push({
                speaker: line.speaker,
                speakerId: line.speakerId,
                gender: line.gender,
                text: t,
                pauseAfterMs: line.pauseAfterMs || (activeSection === 4 ? 700 : 580)
              });
            }
          });
        }
      });

      const resolvedScenarioLines = assignSectionDialogueSpeakers(
        rawScenarioLines,
        activeSection,
        activeSection === 2 ? 'Community Guide (Charlotte)' : activeSection === 4 ? 'University Lecturer (Arthur)' : 'Speaker'
      );
      resolvedScenarioLines.forEach((rl) => {
        mergedLines.push({
          speaker: rl.speaker,
          speakerName: rl.speakerName,
          speakerId: rl.speakerId,
          gender: rl.gender,
          text: rl.text,
          pauseAfterMs: rl.pauseAfterMs
        });
      });
    }

    // Fallback if no questions had dialogue
    if (seenTexts.size === 0) {
      const firstQ = questions[0];
      if (firstQ?.dialogue && firstQ.dialogue.length > 0) {
        firstQ.dialogue.forEach((l) => mergedLines.push(l));
      } else {
        mergedLines.push({
          speaker: 'Charlotte (Student - Asking Questions)',
          speakerId: 'speaker_05',
          gender: 'female',
          text: `Good morning. I am inquiring about the registration requirements and schedule for ${currentTopic}. Could you please explain what documentation is needed?`,
          pauseAfterMs: 650
        });
        mergedLines.push({
          speaker: 'Arthur (Registrar - Giving Answers)',
          speakerId: 'speaker_04',
          gender: 'male',
          text: `Certainly! Let me retrieve the details for you. Please listen carefully as we go through each of the specifications and criteria.`,
          pauseAfterMs: 650
        });
      }
    }

    // 3. Official Cambridge Section Conclusion
    mergedLines.push({
      speaker: 'Cambridge Examiner (Arthur)',
      speakerId: 'speaker_04',
      gender: 'male',
      text: `That is the end of Part ${activeSection}. You now have half a minute to check your answers.`,
      pauseAfterMs: 700
    });

    return mergedLines;
  }, [questions, activeSection, activeScenarioTopic]);

  // Audio Playback using professional audioManager & audioService (Asynchronous non-blocking)
  const handlePlayAudio = useCallback(() => {
    try {
      audioService.unlockAudio();
      soundManager.playBeep(600, 0.1);

      if (questions.length === 0) return;

      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            const dialogueLines: DialogueLine[] = currentDialogue.map((line) => {
              const speakerId = resolveDialogueLineSpeakerId(line, activeSection);
              return {
                speakerId,
                speakerName: line.speaker,
                gender: line.gender,
                text: line.text,
                pauseAfterMs: line.pauseAfterMs || 550
              };
            });

            // Create stable section-level audio metadata
            const firstQ = questions[0] || {
              questionType: 'multiple_choice' as const,
              difficulty: 'medium' as const,
              skillTags: ['listening'],
              source: 'cambridge_standard' as const,
              version: 1,
              createdAt: Date.now()
            };
            const sectionDialogueQuestion: IELTSQuestion = {
              ...firstQ,
              id: `listening_sec_${activeSection}`,
              module: 'listening',
              section: activeSection,
              topic: activeScenarioTopic || 'Cambridge Official Recording',
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
              allowReplay: true,
              onError: (err) => {
                if (isInterruptedPlaybackError(err)) return;
                onShowToast('Audio stream reconnection in progress...');
              }
            });
          } catch (playbackErr) {
            console.error('Audio playback execution error:', playbackErr);
            onShowToast('Audio playback error. Please try clicking play again.');
          }
        }, 20);
      });
    } catch (err) {
      console.error('Audio unlock or trigger error:', err);
      onShowToast('Audio initialization error.');
    }
  }, [currentDialogue, activeSection, questions, activeScenarioTopic, onShowToast]);

  const handleStopAudio = useCallback(() => {
    audioManager.pause();
  }, []);

  // Answer handler
  const handleSelectAnswer = (qId: string, val: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: val
    }));
  };

  // Evaluate candidate answers strictly against Cambridge raw-score conversion table
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
          explanation: q.explanation || 'Review Cambridge audio transcript clues carefully.'
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

  if (viewMode === 'authentic_mock') {
    return (
      <div className="space-y-4">
        {/* Switch to Section Practice mode button bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-800 font-mono uppercase tracking-wider">
              Computer-Delivered IELTS Listening Test · 40 Questions (30m Audio + 2m Check)
            </span>
          </div>

          <button
            onClick={() => {
              setViewMode('section_practice');
              soundManager.playBeep(600, 0.04);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200 flex items-center gap-1.5"
          >
            <span>Section Practice Mode (Single Part)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <AuthenticIELTSListeningTest
          onShowToast={onShowToast}
          onSwitchToPracticeMode={() => setViewMode('section_practice')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in pb-16">
      {/* Return to Full Mock Test Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-slate-800">
        <div className="flex items-center gap-2.5 text-xs">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>
            You are in <strong>Section Practice Mode</strong>. For authentic examination conditions, take the full 40-question mock test.
          </span>
        </div>

        <button
          onClick={() => {
            setViewMode('authentic_mock');
            soundManager.playBeep(660, 0.05);
          }}
          className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shrink-0 shadow-2xs transition flex items-center gap-1.5"
        >
          <span>← Launch Authentic 40-Question Mock Test</span>
        </button>
      </div>

      {/* Top Banner & Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold font-mono">
                <Volume2 className="w-3.5 h-3.5" /> Cambridge Computer-Delivered Suite
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold font-mono border border-slate-200">
                <Layers className="w-3 h-3 text-slate-500" />
                {bankStats.total} Questions in Bank
              </span>
              {hasRestoredSession && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold font-mono">
                  <Save className="w-3 h-3" /> Resumed Session
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              IELTS Listening Laboratory
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Authentic British multi-speaker audio, interactive form filling, map labelling, and academic lectures.
              Integrated with the adaptive QuestionEngine.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Mode selector */}
            <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => handleSelectMode('adaptive_10')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  mode === 'adaptive_10' ? 'bg-white text-blue-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="10 Questions calibrated adaptively"
              >
                Adaptive 10
              </button>
              <button
                onClick={() => handleSelectMode('all')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  mode === 'all' ? 'bg-white text-blue-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Practice all available questions for this section"
              >
                All Section
              </button>
              <button
                onClick={() => handleSelectMode('weakness')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  mode === 'weakness' ? 'bg-white text-rose-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Focus on mistake review and low accuracy questions"
              >
                Weak Areas
              </button>
            </div>

            <button
              onClick={handleShuffleFreshScenario}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs border border-purple-200 flex items-center gap-1.5 transition active:scale-95 shadow-2xs"
              title="Load fresh questions without repetition"
            >
              <Shuffle className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline">Fresh Set</span>
            </button>

            <button
              onClick={handleResetSession}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1.5 transition active:scale-95"
              title="Reset current session"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Live Progress Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-700">
              Progress: {answeredCount} of {questions.length} completed
            </span>
            {flaggedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <Flag className="w-3 h-3 fill-amber-500 text-amber-500" /> {flaggedCount} Flagged
              </span>
            )}
          </div>

          <div className="w-full sm:w-64 bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Section Switcher Tabs (1 to 4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200">
        <button
          onClick={() => handleSelectSection(1)}
          className={`flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 rounded-xl text-xs font-bold transition text-left ${
            activeSection === 1
              ? 'bg-white text-blue-900 shadow-xs border border-slate-200/90'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Users className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">Section 1: Social & Forms</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
            {bankStats.s1} Qs
          </span>
        </button>

        <button
          onClick={() => handleSelectSection(2)}
          className={`flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 rounded-xl text-xs font-bold transition text-left ${
            activeSection === 2
              ? 'bg-white text-blue-900 shadow-xs border border-slate-200/90'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Compass className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="truncate">Section 2: Maps & Guides</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
            {bankStats.s2} Qs
          </span>
        </button>

        <button
          onClick={() => handleSelectSection(3)}
          className={`flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 rounded-xl text-xs font-bold transition text-left ${
            activeSection === 3
              ? 'bg-white text-blue-900 shadow-xs border border-slate-200/90'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">Section 3: Academic Debate</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
            {bankStats.s3} Qs
          </span>
        </button>

        <button
          onClick={() => handleSelectSection(4)}
          className={`flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 rounded-xl text-xs font-bold transition text-left ${
            activeSection === 4
              ? 'bg-white text-blue-900 shadow-xs border border-slate-200/90'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <BookOpen className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="truncate">Section 4: University Lecture</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
            {bankStats.s4} Qs
          </span>
        </button>
      </div>

      {/* 🎧 Interactive Audio Scenario / Track Selector (Prevents Repeated Audio Tracks) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/70 to-slate-50 border border-blue-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase text-blue-700 tracking-wider">
                Active Audio Track · Section {activeSection}
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono font-bold">
                {availableTopicsForSection.length} Scenarios
              </span>
            </div>
            <div className="text-sm font-black text-slate-900 truncate">
              {activeScenarioTopic || currentQ?.topic || 'Official Cambridge Audio'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Dropdown to pick any specific scenario */}
          <div className="relative">
            <select
              aria-label="Select audio scenario"
              value={activeScenarioTopic || currentQ?.topic || ''}
              onChange={(e) => handleSwitchScenario(e.target.value)}
              className="appearance-none bg-white border border-slate-300 hover:border-blue-400 text-slate-800 text-xs font-bold py-2 pl-3 pr-8 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[200px] sm:max-w-[260px] truncate"
            >
              {availableTopicsForSection.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* 🎲 Different Audio Button */}
          <button
            onClick={() => handleSwitchScenario()}
            className="min-h-[36px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Load a completely different scenario and audio track"
          >
            <Shuffle className="w-3.5 h-3.5" />
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
          subtitle="Original Practice Audio · British RP Multi-Speaker Studio (Cambridge-Calibrated)"
          questionId={`listening_sec_${activeSection}_${activeScenarioTopic || 'default'}`}
          audioId={computeContentFingerprint(currentDialogue.map((d) => d.text).join('|'), `sec${activeSection}`)}
          onPlay={handlePlayAudio}
          onPause={handleStopAudio}
          onRetry={handlePlayAudio}
        />
      </AudioErrorBoundary>

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
                  Question {activeQuestionIndex + 1} of {questions.length}
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
                        onClick={() => handleSelectAnswer(currentQ.id, parsed.letter)}
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
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={userAnswers[currentQ?.id] || ''}
                      onChange={(e) => currentQ && handleSelectAnswer(currentQ.id, e.target.value)}
                      placeholder="Type your answer (e.g. BRAITHWAITE, 18TH, 780)..."
                      className="w-full px-4 py-3.5 text-sm sm:text-base rounded-2xl border-2 border-slate-300 bg-white font-mono font-bold text-slate-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 focus:outline-hidden transition placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Cambridge standard: Spelling, plurals, and number formats are marked strictly.</span>
                    <span className="font-mono text-blue-700 font-bold">
                      {(userAnswers[currentQ?.id] || '').trim().split(/\s+/).filter(Boolean).length} word(s)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Post-evaluation Explanation Display */}
            {isEvaluated && currentQ && (
              <div
                className={`p-4 rounded-2xl border text-xs space-y-2 animate-fade-in ${
                  isAnswerCorrect(currentQ, userAnswers[currentQ.id] || '')
                    ? 'bg-emerald-50/80 border-emerald-300'
                    : 'bg-rose-50/80 border-rose-300'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-700">Official Correct Answer:</span>
                  <span className="font-mono font-black text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                    {formatDisplayedCorrectAnswer(currentQ)}
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed font-serif italic">
                  <strong>Examiner Clue:</strong> {currentQ.explanation}
                </p>
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
                <div className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono text-xs font-black flex items-center gap-1.5 self-start sm:self-auto">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>
                    Band {scoreSummary.band} ({scoreSummary.correct}/{scoreSummary.total})
                  </span>
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
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {idx + 1}
                      </span>
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
                Verify answers to see Cambridge Band score and log mistakes in your Vault.
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
                    <span>{idx + 1}</span>
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
                          onClick={() => speakBritish(line.text)}
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
              <span>Section {activeSection} Cambridge Strategy</span>
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
