import {
  SpeakingTestState,
  SpeakingPart,
  SpeakingMode,
  SpeakingQuestionItem,
  SpeakingAnswerRecord,
  ActiveSpeakingSessionSnapshot
} from '../types/speakingTypes';
import { questionEngine } from './QuestionEngine';
import { audioManager } from './AudioManager';
import { speechRecognitionService } from './SpeechRecognitionService';
import { speakingStorageService } from './SpeakingStorageService';
import { evaluateSpeakingSession } from './SpeakingEvaluationService';

export interface SpeakingEngineListener {
  onStateChange: (state: SpeakingTestState) => void;
  onQuestionChange: (question: SpeakingQuestionItem, part: SpeakingPart, turnIndex: number, totalTurns: number) => void;
  onTranscriptUpdate: (interim: string, isFinal: boolean) => void;
  onTimerTick: (elapsedSec: number, countdownSec?: number) => void;
  onError: (error: string) => void;
  onTestComplete: (answers: SpeakingAnswerRecord[]) => void;
}

export class SpeakingEngineService {
  private state: SpeakingTestState = 'IDLE';
  private mode: SpeakingMode = 'exam';
  private testId: string = '';
  private currentPart: SpeakingPart = 1;
  private currentTurnIndex: number = 0;
  private questions: SpeakingQuestionItem[] = [];
  private answers: SpeakingAnswerRecord[] = [];
  private listeners: Set<SpeakingEngineListener> = new Set();

  // Timers
  private prepTimer: NodeJS.Timeout | null = null;
  private speakingTimer: NodeJS.Timeout | null = null;
  private prepSecondsLeft: number = 60;
  private maxSpeakingTimeSec: number = 45; // Default for Part 1/3
  private turnStartTime: number = 0;

  // Active question and follow-up tracking
  private activeQuestion: SpeakingQuestionItem | null = null;
  private hasAskedFollowUpForCurrentTurn: boolean = false;

  constructor() {
    this.testId = `spk_test_${Date.now()}`;
  }

  public subscribe(listener: SpeakingEngineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(newState: SpeakingTestState): void {
    this.state = newState;
    this.saveSnapshot();
    this.listeners.forEach((l) => l.onStateChange(newState));
  }

  public getState(): SpeakingTestState {
    return this.state;
  }

  public getMode(): SpeakingMode {
    return this.mode;
  }

  public getCurrentPart(): SpeakingPart {
    return this.currentPart;
  }

  public getActiveQuestion(): SpeakingQuestionItem | null {
    return this.activeQuestion;
  }

  public getAnswers(): SpeakingAnswerRecord[] {
    return this.answers;
  }

  public getTestId(): string {
    return this.testId;
  }

  /**
   * Builds an authentic, non-repetitive Sprint test plan:
   * Part 1: 3-4 natural questions across familiar personal topics
   * Part 2: 1 authentic individual cue card
   * Part 3: 3 analytical discussion questions linked to Part 2 theme
   */
  public initializeTest(mode: SpeakingMode = 'exam', customTestId?: string): void {
    this.reset();
    this.mode = mode;
    this.testId = customTestId || `spk_test_${Date.now()}`;

    // Select questions adaptively from QuestionEngine with zero repetition
    const p1 = questionEngine.selectAdaptiveQuestions({
      module: 'speaking',
      section: 1,
      count: 3,
      mode: 'practice'
    });

    const p2 = questionEngine.selectAdaptiveQuestions({
      module: 'speaking',
      section: 2,
      count: 1,
      mode: 'practice'
    });

    const p3 = questionEngine.selectAdaptiveQuestions({
      module: 'speaking',
      section: 3,
      count: 3,
      mode: 'practice'
    });

    const plannedQuestions: SpeakingQuestionItem[] = [
      ...p1.map((q) => ({
        id: q.id,
        part: 1 as const,
        topic: q.topic,
        questionText: q.prompt,
        questionType: 'part1_interview' as const,
        createdAt: q.createdAt
      })),
      ...p2.map((q) => ({
        id: q.id,
        part: 2 as const,
        topic: q.topic,
        questionText: q.prompt,
        questionType: 'part2_cue_card' as const,
        cueCardBulletPoints: q.cueCardBulletPoints || [
          'What the topic involves',
          'When and where it occurred',
          'Who was involved',
          'And explain why it was significant to you'
        ],
        createdAt: q.createdAt
      })),
      ...p3.map((q) => ({
        id: q.id,
        part: 3 as const,
        topic: q.topic,
        questionText: q.prompt,
        questionType: 'part3_discussion' as const,
        createdAt: q.createdAt
      }))
    ];

    this.questions = plannedQuestions;
    this.currentTurnIndex = 0;
    this.currentPart = 1;
    this.answers = [];

    this.setState('INTRO');
  }

  /**
   * Resumes an interrupted speaking session safely
   */
  public resumeFromSnapshot(snapshot: ActiveSpeakingSessionSnapshot): boolean {
    this.reset();
    this.testId = snapshot.testId;
    this.mode = snapshot.mode;
    this.currentPart = snapshot.currentPart;
    this.currentTurnIndex = snapshot.currentTurnIndex;
    this.answers = snapshot.answers;

    // Reload question objects by ID from QuestionEngine
    const loadedQuestions: SpeakingQuestionItem[] = [];
    snapshot.questionIds.forEach((id) => {
      const q = questionEngine.getQuestionById(id);
      if (q) {
        loadedQuestions.push({
          id: q.id,
          part: (q.section as SpeakingPart) || 1,
          topic: q.topic,
          questionText: q.prompt,
          questionType: (q.questionType as any) || 'part1_interview',
          cueCardBulletPoints: q.cueCardBulletPoints,
          createdAt: q.createdAt
        });
      }
    });

    if (loadedQuestions.length === 0) {
      return false;
    }

    this.questions = loadedQuestions;
    this.activeQuestion = this.questions[this.currentTurnIndex] || this.questions[0];

    // Transition back to speaking or asking question
    this.playCurrentTurn();
    return true;
  }

  /**
   * Begins the spoken IELTS interview
   */
  public async startInterview(): Promise<void> {
    const greeting =
      "Good afternoon. My name is Arthur, and I will be your IELTS speaking examiner today. Could you please tell me your full name and where you are from?";

    this.setState('ASKING_QUESTION');

    await audioManager.playCustomAudio('examiner_greeting', greeting, {
      speakerId: 'speaker_04',
      onEnd: () => {
        this.beginCandidateAnswerTurn();
      },
      onError: () => {
        this.beginCandidateAnswerTurn();
      }
    });
  }

  /**
   * Progresses to the next question turn in the state machine
   */
  public async playCurrentTurn(): Promise<void> {
    this.clearTimers();
    speechRecognitionService.stopListening(true);

    if (this.currentTurnIndex >= this.questions.length) {
      this.completeTest();
      return;
    }

    const currentQ = this.questions[this.currentTurnIndex];
    this.activeQuestion = currentQ;
    this.currentPart = currentQ.part;
    this.hasAskedFollowUpForCurrentTurn = false;

    this.listeners.forEach((l) =>
      l.onQuestionChange(currentQ, this.currentPart, this.currentTurnIndex + 1, this.questions.length)
    );

    // Part 2 requires special 1-minute prep countdown
    if (currentQ.part === 2) {
      this.startPart2Preparation(currentQ);
      return;
    }

    // Part 1 and Part 3: Examiner speaks the prompt with verified audioId
    this.setState('ASKING_QUESTION');

    await audioManager.playCustomAudio(currentQ.id, currentQ.questionText, {
      speakerId: 'speaker_04',
      onEnd: () => {
        this.beginCandidateAnswerTurn();
      },
      onError: () => {
        this.beginCandidateAnswerTurn();
      }
    });
  }

  /**
   * Activates microphone recording and candidate listening state
   */
  private beginCandidateAnswerTurn(): void {
    this.setState('LISTENING');
    this.turnStartTime = Date.now();

    const currentQ = this.activeQuestion!;
    const maxDurationSec = currentQ.part === 2 ? 120 : currentQ.part === 3 ? 60 : 45;
    this.maxSpeakingTimeSec = maxDurationSec;

    // Start timer tick loop
    this.speakingTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.turnStartTime) / 1000);
      const remaining = Math.max(0, this.maxSpeakingTimeSec - elapsed);

      this.listeners.forEach((l) => l.onTimerTick(elapsed, remaining));

      // Part 2 authoritative 2-minute endpoint
      if (elapsed >= this.maxSpeakingTimeSec) {
        this.handleCandidateFinishedSpeaking();
      }
    }, 1000);

    // Start robust browser STT
    speechRecognitionService.setSilenceThreshold(currentQ.part === 2 ? 4000 : 3200);

    speechRecognitionService.startListening({
      onInterimResult: (txt) => {
        this.listeners.forEach((l) => l.onTranscriptUpdate(txt, false));
      },
      onFinalResult: (txt) => {
        this.listeners.forEach((l) => l.onTranscriptUpdate(txt, true));
      },
      onSilenceTimeout: () => {
        // Natural candidate completion pause detected
        if (this.state === 'LISTENING') {
          this.handleCandidateFinishedSpeaking();
        }
      },
      onError: (err) => {
        this.listeners.forEach((l) => l.onError(err));
      }
    });
  }

  /**
   * Part 2: 1-Minute Preparation Countdown
   */
  private async startPart2Preparation(cueCard: SpeakingQuestionItem): Promise<void> {
    this.setState('PREPARATION');
    this.prepSecondsLeft = 60;

    const introText =
      "For Part 2, I am going to give you a topic and I would like you to speak about it for one to two minutes. You will have one minute to prepare and make notes if you wish. Here is your cue card.";

    await audioManager.playCustomAudio('cuecard_intro', introText, {
      speakerId: 'speaker_04',
      onEnd: () => {
        this.runPrepCountdown();
      },
      onError: () => {
        this.runPrepCountdown();
      }
    });
  }

  private runPrepCountdown(): void {
    this.prepTimer = setInterval(() => {
      this.prepSecondsLeft -= 1;
      this.listeners.forEach((l) => l.onTimerTick(60 - this.prepSecondsLeft, this.prepSecondsLeft));

      if (this.prepSecondsLeft <= 0) {
        this.clearTimers();
        this.startPart2LongTurn();
      }
    }, 1000);
  }

  public skipPreparationDirectly(): void {
    if (this.state === 'PREPARATION') {
      this.clearTimers();
      this.startPart2LongTurn();
    }
  }

  private async startPart2LongTurn(): Promise<void> {
    this.setState('LONG_TURN');
    const startLead = "All right, your preparation time is complete. Please begin speaking now.";

    await audioManager.playCustomAudio('longturn_start', startLead, {
      speakerId: 'speaker_04',
      onEnd: () => {
        this.beginCandidateAnswerTurn();
      },
      onError: () => {
        this.beginCandidateAnswerTurn();
      }
    });
  }

  /**
   * Finalizes candidate answer for current turn and decides next step
   */
  public handleCandidateFinishedSpeaking(): void {
    if (this.state !== 'LISTENING' && this.state !== 'LONG_TURN') return;

    this.clearTimers();
    const finalTranscript = speechRecognitionService.stopListening(true);
    const duration = Math.max(1, Math.floor((Date.now() - this.turnStartTime) / 1000));
    const words = finalTranscript.trim().split(/\s+/).filter(Boolean);

    const currentQ = this.activeQuestion!;

    const answerRecord: SpeakingAnswerRecord = {
      questionId: currentQ.id,
      part: currentQ.part,
      topic: currentQ.topic,
      questionText: currentQ.questionText,
      transcript: finalTranscript.trim(),
      startTime: this.turnStartTime,
      endTime: Date.now(),
      durationSec: duration,
      wordCount: words.length,
      wordsPerMinute: Math.round((words.length / Math.max(0.1, duration / 60))),
      pauseCount: Math.floor(duration / 12),
      longPauseCount: Math.floor(duration / 25),
      fillerCount: 0,
      detectedFillers: []
    };

    this.answers.push(answerRecord);
    this.saveSnapshot();

    this.setState('PROCESSING_RESPONSE');

    // Natural brief thinking pause before examiner delivers acknowledgement or follow-up
    setTimeout(() => {
      this.advanceToNextTurn();
    }, 700);
  }

  private advanceToNextTurn(): void {
    this.currentTurnIndex += 1;

    if (this.currentTurnIndex >= this.questions.length) {
      this.completeTest();
    } else {
      this.playCurrentTurn();
    }
  }

  /**
   * Completes test and triggers comprehensive AI evaluation
   */
  public completeTest(): void {
    this.clearTimers();
    speechRecognitionService.stopListening(true);
    audioManager.reset('speaking_test_complete');

    this.setState('TEST_COMPLETE');
    speakingStorageService.clearUnfinishedSession();

    this.listeners.forEach((l) => l.onTestComplete(this.answers));
  }

  private saveSnapshot(): void {
    if (this.answers.length > 0 && this.state !== 'TEST_COMPLETE' && this.state !== 'RESULT') {
      speakingStorageService.saveUnfinishedSession({
        testId: this.testId,
        mode: this.mode,
        currentPart: this.currentPart,
        currentTurnIndex: this.currentTurnIndex,
        questionIds: this.questions.map((q) => q.id),
        answers: this.answers,
        state: this.state,
        prepSecondsLeft: this.prepSecondsLeft,
        speakingSecondsLeft: this.maxSpeakingTimeSec,
        updatedAt: Date.now()
      });
    }
  }

  private clearTimers(): void {
    if (this.prepTimer) {
      clearInterval(this.prepTimer);
      this.prepTimer = null;
    }
    if (this.speakingTimer) {
      clearInterval(this.speakingTimer);
      this.speakingTimer = null;
    }
  }

  public reset(): void {
    this.clearTimers();
    speechRecognitionService.stopListening(false);
    audioManager.reset('speaking_engine_reset');
    this.state = 'IDLE';
    this.currentTurnIndex = 0;
    this.currentPart = 1;
    this.activeQuestion = null;
    this.answers = [];
  }
}

export const speakingEngine = new SpeakingEngineService();
