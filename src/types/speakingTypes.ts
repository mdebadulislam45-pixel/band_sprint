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
  pitchVarianceHz: number | null; // Standard deviation of vocal pitch (null until enough active frames are measured)
  expressivenessScore: number | null; // 0 to 100 composite intonation score (null when unmeasured)
  energyDropOffs: number; // Count of sudden mid-utterance volume drops
  isMeasured?: boolean; // True only when live Web Audio frames were actually analyzed
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
  pauseCount: number | null; // null when acoustic pause detection was not measured
  longPauseCount: number | null; // null when acoustic long-pause detection was not measured
  fillerCount: number | null; // null when filler detection was not performed; 0 means zero fillers detected
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
  clarityBand: number | null;
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

export type SpeakingAssessmentStatus =
  | 'evaluated'
  | 'partial_transcript_only'
  | 'insufficient_evidence'
  | 'unavailable';

export interface InstantSpeakingFeedback {
  questionId: string;
  questionText: string;
  part: SpeakingPart;
  topic: string;
  candidateTranscript: string;
  isValidAttempt?: boolean;
  assessmentStatus?: SpeakingAssessmentStatus;
  evidenceMode?: 'audio_and_transcript' | 'transcript_only' | 'unavailable';
  pronunciationObservable?: boolean;
  isPartialAssessment?: boolean;
  unassessedCriteria?: string[];
  error?: string;
  canRetry?: boolean;
  authRequired?: boolean;
  disclaimer?: string;
  wordCount: number;
  overallBand?: number | null;
  partialThreeCriterionIndex?: number | null;
  criteria?: {
    fc: number | null;
    lr: number | null;
    gra: number | null;
    pr: number | null;
  };
  feedbackTitle?: string;
  feedbackEn?: string;
  feedbackBn?: string;
  durationSec: number;
  wordsPerMinute: number;
  estimatedBand?: number | null;
  estimatedBands: {
    fluency: number | null;
    lexical: number | null;
    grammar: number | null;
    pronunciation: number | null;
    overall: number | null;
  };
  grammaticalErrors: DetailedGrammarError[];
  pronunciation: PronunciationAnalysis;
  pronunciationAnalysis?: {
    clarityBand?: number | null;
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
  band: number | null; // 1.0 to 9.0 in 0.5 increments, or null when unassessed/unavailable
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
  assessmentStatus?: SpeakingAssessmentStatus;
  evidenceMode?: 'audio_and_transcript' | 'transcript_only' | 'unavailable';
  pronunciationObservable?: boolean;
  isPartialAssessment?: boolean;
  unassessedCriteria?: string[];
  wordCount?: number;
  overallBand: number | null; // null when unassessed, unavailable, or partial transcript-only
  partialThreeCriterionIndex?: number | null;
  fluencyBand: number | null;
  lexicalBand: number | null;
  grammarBand: number | null;
  pronunciationBand: number | null;
  feedbackTitle?: string;
  feedbackEn?: string;
  feedbackBn?: string;
  criteria: {
    fc?: number | null;
    lr?: number | null;
    gra?: number | null;
    pr?: number | null;
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
  totalPauses: number | null; // null when no turn recorded measured pause telemetry
  totalLongPauses: number | null; // null when no turn recorded measured long-pause telemetry
  pauseTelemetryAvailable?: boolean;
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
  overallBand: number | null;
  partialThreeCriterionIndex?: number | null;
  fluencyBand: number | null;
  lexicalBand: number | null;
  grammarBand: number | null;
  pronunciationBand: number | null;
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
