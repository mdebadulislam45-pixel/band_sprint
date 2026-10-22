/**
 * IELTS Sprint — Cambridge IELTS 11–21 Practice Library Data Models
 * Typed schemas for Volumes 11–21, Academic & General Training tracks,
 * four module test content, and validated import pipeline.
 */

export type CambridgeEdition = 'Academic' | 'General Training';

export type CambridgeVolumeNumber = 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21;

export type CambridgeTestNumber = 1 | 2 | 3 | 4;

export type CambridgeModuleType = 'listening' | 'reading' | 'writing' | 'speaking';

export type CambridgeContentProvenance = 'authentic_calibrated' | 'original_practice' | 'catalogue_only';

export interface CambridgeQuestionItem {
  id: string; // e.g. "c18-a-t1-l-q1"
  questionNumber: number; // 1 to 40
  partOrSection: 1 | 2 | 3 | 4; // Part 1-4 for L/S, Section 1-3 for R
  type: string; // "multiple_choice" | "note_completion" | "true_false_not_given" | "matching" | "sentence_completion"
  prompt: string;
  options?: string[];
  correctAnswer: string | string[];
  acceptableAnswers?: string[];
  explanation: string;
  wordLimit?: number;
  locationReference?: string; // e.g. "Paragraph B, lines 4-6"
}

export interface CambridgeListeningContent {
  title: string;
  contextDescription: string;
  parts: Array<{
    partNumber: 1 | 2 | 3 | 4;
    title: string;
    description: string;
    audioScript: string;
    dialogue?: Array<{
      speaker: string;
      text: string;
      speakerId?: string;
      gender?: 'male' | 'female';
      pauseAfterMs?: number;
    }>;
    questions: CambridgeQuestionItem[];
  }>;
}

export interface CambridgeReadingContent {
  title: string;
  passages: Array<{
    passageNumber: 1 | 2 | 3;
    title: string;
    subheading?: string;
    text: string;
    questions: CambridgeQuestionItem[];
  }>;
}

export interface CambridgeWritingContent {
  task1: {
    prompt: string;
    type: 'Academic Chart / Graph' | 'General Training Letter';
    minimumWords: number; // 150
    chartDescription?: string;
    bulletPoints?: string[];
    modelAnswer?: string;
    examinerComments?: string;
  };
  task2: {
    prompt: string;
    topic: string;
    minimumWords: number; // 250
    modelAnswer?: string;
    examinerComments?: string;
  };
}

export interface CambridgeSpeakingContent {
  part1: {
    topic: string;
    questions: Array<{
      question: string;
      suggestedIdeas?: string[];
      band9Sample?: string;
    }>;
  };
  part2: {
    cueCardTopic: string;
    bulletPoints: string[];
    followUpQuestion?: string;
    modelResponse?: string;
  };
  part3: {
    theme: string;
    questions: Array<{
      question: string;
      sampleResponse?: string;
      keyCollocations?: string[];
    }>;
  };
}

export interface CambridgeTestSet {
  id: string; // e.g. "cambridge-18-academic-test-1"
  volume: CambridgeVolumeNumber;
  edition: CambridgeEdition;
  testNumber: CambridgeTestNumber;
  title: string;
  description: string;
  provenance: CambridgeContentProvenance;
  provenanceNote: string;
  version: number;
  updatedAt: number;
  availableModules: CambridgeModuleType[];
  listening?: CambridgeListeningContent;
  reading?: CambridgeReadingContent;
  writing?: CambridgeWritingContent;
  speaking?: CambridgeSpeakingContent;
}

export interface CambridgeVolumeCatalogueEntry {
  volume: CambridgeVolumeNumber;
  title: string;
  publicationYear: number;
  availableEditions: CambridgeEdition[];
  coverColor: string; // Tailwind color class or hex
  accentColor: string;
  difficultyRating: string; // e.g. "Band 6.0 – 9.0"
  testsCount: number; // 4
  description: string;
  verifiedTests: Record<CambridgeEdition, number[]>; // e.g. { Academic: [1, 2], 'General Training': [1] }
}

export interface CambridgePracticeSession {
  sessionId: string;
  testId: string;
  volume: CambridgeVolumeNumber;
  edition: CambridgeEdition;
  testNumber: CambridgeTestNumber;
  module: CambridgeModuleType;
  startedAt: number;
  lastActiveAt: number;
  status: 'instructions' | 'in_progress' | 'submitted';
  currentPart: number;
  userAnswers: Record<string, string>;
  flaggedQuestionIds: Record<string, boolean>;
  writingDrafts?: { task1?: string; task2?: string };
  speakingRecordings?: Record<string, { durationSec: number; transcript?: string }>;
  timeRemainingSec: number;
  scoreResult?: {
    rawScore: number;
    maxScore: number;
    estimatedBand: number;
    submittedAt: number;
    feedbackSummary?: string;
  };
}

export interface CambridgeContentImportValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    volume: CambridgeVolumeNumber;
    edition: CambridgeEdition;
    testNumber: CambridgeTestNumber;
    modulesDetected: CambridgeModuleType[];
    totalQuestions: number;
  };
}
