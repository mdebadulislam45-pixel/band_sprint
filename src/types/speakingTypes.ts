/**
 * IELTS SPRINT — SPEAKING TYPES & DATA SCHEMAS
 * Production-grade schemas for real-time AI Speaking test, state machine, audio ownership,
 * Speech-To-Text capture, fluency analytics, and 4-criterion IELTS evaluation.
 */

export type SpeakingTestState =
  | 'IDLE'
  | 'INTRO'
  | 'ASKING_QUESTION'
  | 'WAITING_FOR_RESPONSE'
  | 'LISTENING'
  | 'PROCESSING_RESPONSE'
  | 'DECIDING_FOLLOWUP'
  | 'FOLLOW_UP'
  | 'PART_TRANSITION'
  | 'PREPARATION'
  | 'LONG_TURN'
  | 'DISCUSSION'
  | 'TEST_COMPLETE'
  | 'EVALUATING'
  | 'RESULT'
  | 'ERROR_RECOVERY';

export type SpeakingPart = 0 | 1 | 2 | 3;
export type SpeakingMode = 'exam' | 'practice';

export interface SpeakingQuestionItem {
  id: string;
  part: SpeakingPart;
  topic: string;
  questionText: string;
  questionType: 'part1_interview' | 'part2_cue_card' | 'part3_discussion' | 'follow_up';
  difficulty?: 'easy' | 'medium' | 'hard';
  cueCardBulletPoints?: string[];
  followUpPrompt?: string;
  tags?: string[];
  audioId?: string;
  createdAt: number;
}

export interface AcousticTelemetry {
  volumeRms: number; // 0 to 100 normalized microphone energy
  pitchHz: number; // Estimated fundamental frequency in Hz
  pitchVarianceHz: number; // Standard deviation / spread of vocal pitch (expressiveness vs monotone)
  expressivenessScore: number; // 0 to 100 composite intonation score
  energyDropOffs: number; // Count of sudden mid-utterance volume drops
}

export interface SpeakingAnswerRecord {
  questionId: string;
  part: SpeakingPart;
  topic: string;
  questionText: string;
  transcript: string;
  startTime: number;
  endTime: number;
  durationSec: number;
  wordCount: number;
  wordsPerMinute: number;
  pauseCount: number;
  longPauseCount: number;
  fillerCount: number;
  detectedFillers: string[];
  clarityScore?: number;
  acousticMetrics?: AcousticTelemetry;
  strengths?: string[];
  improvements?: string[];
  sampleBandScore?: number;
  notes?: string;
  instantFeedback?: InstantSpeakingFeedback;
}

export interface DetailedGrammarError {
  id?: string;
  observed: string;
  corrected: string;
  explanation: string;
  ruleCategory:
    | 'Tense & Aspect'
    | 'Subject-Verb Agreement'
    | 'Articles & Determiners'
    | 'Prepositions'
    | 'Word Form & Plurality'
    | 'Modals & Conditionals'
    | 'Sentence Structure'
    | 'General Syntax';
  severity: 'minor' | 'moderate' | 'critical';
}

export interface PronunciationWordTip {
  word: string;
  ipa: string;
  syllableStress: string;
  commonMistake?: string;
  tip: string;
}

export interface PronunciationAnalysis {
  clarityBand: number;
  cadenceWpm: number;
  trickyWords: PronunciationWordTip[];
  connectedSpeechTips: string[];
  intonationPattern: string;
  rhythmVerdict: string;
}

export interface Band8ModelAnswer {
  bandScore: number;
  modelAnswer: string;
  highlightedCollocations: Array<{
    phrase: string;
    bandLevel: 'C1' | 'C2' | 'Band 8.5' | 'Band 9.0';
    meaning: string;
  }>;
  keyDiscourseMarkers: string[];
  examinerRationale: string;
  audioPromptText?: string;
}

export interface InstantSpeakingFeedback {
  questionId: string;
  questionText: string;
  part: SpeakingPart;
  topic: string;
  candidateTranscript: string;
  isValidAttempt?: boolean;
  wordCount: number;
  overallBand?: number;
  criteria?: {
    fc: number;
    lr: number;
    gra: number;
    pr: number;
  };
  feedbackTitle?: string;
  feedbackEn?: string;
  feedbackBn?: string;
  durationSec: number;
  wordsPerMinute: number;
  estimatedBand?: number;
  estimatedBands: {
    fluency: number;
    lexical: number;
    grammar: number;
    pronunciation: number;
    overall: number;
  };
  grammaticalErrors: DetailedGrammarError[];
  pronunciation: PronunciationAnalysis;
  pronunciationAnalysis?: {
    clarityBand?: number;
    cadenceWpm?: number;
    problemWords?: Array<{ word: string; phoneticIpa: string; stressedSyllable: string; advice: string }>;
    trickyWords?: PronunciationWordTip[];
    connectedSpeechTips?: string[];
    intonationPattern?: string;
    intonationGuidance?: string;
    rhythmVerdict?: string;
  };
  band8Answer: Band8ModelAnswer;
  betterAnswer?: {
    bandScore?: number;
    modelAnswer?: string;
    modelResponse?: string;
    highlightedPhrases?: string[];
    highlightedCollocations?: Array<{
      phrase: string;
      bandLevel: 'C1' | 'C2' | 'Band 8.5' | 'Band 9.0';
      meaning: string;
    }>;
    keyDiscourseMarkers?: string[];
    examinerRationale?: string;
  };
  actionableTips: string[];
}

export interface CriterionFeedback {
  band: number; // 0.0 to 9.0 in 0.5 increments
  criterionName: 'Fluency & Coherence' | 'Lexical Resource' | 'Grammatical Range & Accuracy' | 'Pronunciation';
  strengths: string[];
  improvements: string[];
  evidenceQuotes: string[];
}

export interface GrammarObservation {
  observed: string;
  corrected: string;
  explanation: string;
}

export interface VocabUpgrade {
  original: string;
  upgraded: string;
  reason: string;
}

export interface SpeakingEvaluationReport {
  isValidAttempt?: boolean;
  wordCount?: number;
  overallBand: number; // e.g. 7.0 or 0.0 if unattempted
  fluencyBand: number;
  lexicalBand: number;
  grammarBand: number;
  pronunciationBand: number;
  feedbackTitle?: string;
  feedbackEn?: string;
  feedbackBn?: string;
  criteria: {
    fc?: number;
    lr?: number;
    gra?: number;
    pr?: number;
    fluency: CriterionFeedback;
    lexical: CriterionFeedback;
    grammar: CriterionFeedback;
    pronunciation: CriterionFeedback;
  };
  keyStrengths: string[];
  holdingYouBack: string[];
  topPriorities: string[];
  recommendedModules: Array<{
    moduleId: string;
    title: string;
    description: string;
    actionRoute: string;
  }>;
  grammarObservations: GrammarObservation[];
  vocabUpgrades: VocabUpgrade[];
  overallSummary: string;
  questionBreakdowns?: InstantSpeakingFeedback[];
}

export interface SpeakingTestAnalytics {
  totalSpeakingTimeSec: number;
  totalWordsSpoken: number;
  averageWpm: number;
  totalPauses: number;
  totalLongPauses: number;
  totalFillers: number;
  mostFrequentFillers: Array<{ word: string; count: number }>;
  uniqueVocabularyCount: number;
  lexicalDiversityRatio: number;
}

export interface SpeakingSessionRecord {
  testId: string;
  userId: string;
  date: number;
  mode: SpeakingMode;
  totalDurationSec: number;
  overallBand: number;
  fluencyBand: number;
  lexicalBand: number;
  grammarBand: number;
  pronunciationBand: number;
  topicsCovered: string[];
  answers: SpeakingAnswerRecord[];
  analytics: SpeakingTestAnalytics;
  evaluation: SpeakingEvaluationReport;
}

export interface ActiveSpeakingSessionSnapshot {
  testId: string;
  mode: SpeakingMode;
  currentPart: SpeakingPart;
  currentTurnIndex: number;
  questionIds: string[];
  answers: SpeakingAnswerRecord[];
  state: SpeakingTestState;
  prepSecondsLeft: number;
  speakingSecondsLeft: number;
  updatedAt: number;
}
