export interface MistakeItem {
  id: string;
  timestamp: number;
  module: 'listening' | 'reading' | 'writing' | 'speaking' | 'vocab';
  title: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  mastered: boolean;
}

export interface VocabCard {
  id: string;
  topic: string;
  category: 'word' | 'phrase' | 'idiom';
  item: string;
  beginnerPhrase?: string;
  advancedCollocation?: string;
  banglaMeaning: string;
  banglaExplanation?: string;
  banglaPronunciation?: string;
  partOfSpeech?: string;
  ieltsSkill?: string;
  cefr: 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  definition: string;
  synonyms?: string[];
  antonyms?: string[];
  collocations?: string[];
  commonMistakes?: string;
  ieltsUsage?: string;
  exampleSentence: string;
  mastered: boolean;
}

export interface RichPhrase {
  id: string;
  phrase: string;
  banglaMeaning: string;
  explanation: string;
  exampleSentence: string;
  situation: string;
  formality: 'Formal' | 'Informal' | 'Neutral';
  ieltsSpeakingUsefulness: string;
  ieltsWritingUsefulness?: string;
  category:
    | 'Everyday'
    | 'Fillers'
    | 'Opinions'
    | 'Agreement/Disagreement'
    | 'Giving Examples'
    | 'Comparing'
    | 'Clarification'
    | 'Part 1'
    | 'Part 2'
    | 'Part 3';
  mastered?: boolean;
}

export interface RichIdiom {
  id: string;
  idiom: string;
  banglaMeaning: string;
  englishMeaning: string;
  exampleSentence: string;
  context: string;
  formality: 'Formal' | 'Informal' | 'Neutral';
  ieltsSpeakingSuitability: string;
  warning?: string;
  difficulty: 'B1' | 'B2' | 'C1' | 'C2';
  mastered?: boolean;
}

export interface CefrTerm {
  word: string;
  level: 'B2' | 'C1' | 'C2';
  phonetic: string;
  banglaMeaning: string;
  definition: string;
  collocations: string[];
  sample: string;
}

export interface ExamEvaluation {
  overallBand: number;
  proficiencyTitle: string;
  trScore: number;
  trComment: string;
  ccScore: number;
  ccComment: string;
  lrScore: number;
  lrComment: string;
  graScore: number;
  graComment: string;
  strengths: string[];
  weaknesses: string[];
  vocabUpgrades: { original: string; upgraded: string; explanation: string }[];
  grammaticalErrors?: { observed: string; corrected: string; explanation: string; ruleCategory?: string; severity?: string }[];
  betterAnswerBand8?: string;
  verdict: string;
}

export interface ExamHistoryRecord {
  id: string;
  timestamp: number;
  examType?: 'full_mock' | 'listening_only';
  overallBand?: number | null;
  listeningBand: number;
  readingBand?: number | null;
  writingBand?: number | null;
  speakingBand?: number | null;
  wordCount: number;
  submissionType: 'timer' | 'manual';
  correctCount: number;
  totalQuestions: number;
}

export interface UserProgress {
  completedModules: string[];
  targetBand: number;
  examDate?: string;
  targetCountry: string;
  intendedFormat: 'Academic' | 'General Training';
  examHistory: ExamHistoryRecord[];
  streakDays: number;
  lastActiveDate: string;
  wordsWrittenTotal: number;
  credits?: number;
  activeSession?: {
    module: string;
    title: string;
    subtitle: string;
    progressLabel: string;
    percent: number;
    timeLeftMins?: number;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password?: string;
  createdAt: number;
  hasCompletedDiagnostic?: boolean;
  tokens?: number;
  progress: UserProgress;
}
