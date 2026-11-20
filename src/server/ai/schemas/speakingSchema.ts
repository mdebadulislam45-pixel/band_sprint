import { Type } from '@google/genai';

export type SpeakingFormat = 'Academic' | 'General Training';
export type SpeakingPartCategory = 'part1' | 'part2' | 'part3';
export type QuestionValidationStatus = 'PASSED' | 'FAILED' | 'REPAIRED';
export type LifecycleStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED';

export interface SpeakingPart1Question {
  id: string;
  prompt: string;
}

export interface SpeakingPart1TopicGroup {
  topicId: string;
  title: string;
  questions: SpeakingPart1Question[];
}

export interface SpeakingPart1Section {
  topicGroups: SpeakingPart1TopicGroup[];
}

export interface SpeakingPart2Task {
  id: string;
  topic: string;
  instructions: string;
  bulletPrompts: string[];
  preparationTimeSeconds: number; // default 60
  speakingTimeSeconds: number;    // default 120
  roundingOffQuestion?: string;
  examinerIntro?: string;
}

export interface SpeakingPart3Question {
  id: string;
  prompt: string;
  examinerProbeNotes?: string;
}

export interface SpeakingPart3Theme {
  themeId: string;
  title: string;
  connectedPart2Theme: string;
  questions: SpeakingPart3Question[];
}

export interface SpeakingPart3Section {
  themes: SpeakingPart3Theme[];
}

export interface SpeakingExamPackage {
  examId: string;
  schemaVersion: '1.0';
  title: string;
  format: SpeakingFormat;
  topicDomain: string;
  difficulty: 'Standard' | 'Challenging';
  createdAt: number;
  updatedAt?: number;
  validationStatus?: QuestionValidationStatus;
  lifecycleStatus?: LifecycleStatus;
  modelMetadata?: {
    modelName: string;
    generationTimestamp: number;
    repairAttempts?: number;
  };
  part1: SpeakingPart1Section;
  part2: SpeakingPart2Task;
  part3: SpeakingPart3Section;
}

/**
 * Gemini responseSchema for structured IELTS Speaking Exam Package generation
 */
export const SpeakingExamSchema = {
  type: Type.OBJECT,
  properties: {
    examId: { type: Type.STRING, description: "Unique exam identifier e.g. ai-speaking-001" },
    schemaVersion: { type: Type.STRING, description: "Must be '1.0'" },
    title: { type: Type.STRING, description: "Descriptive exam title e.g. IELTS Speaking Practice Exam — Urban Life & Technology" },
    format: { type: Type.STRING, description: "'Academic' or 'General Training'" },
    topicDomain: { type: Type.STRING, description: "Primary domain e.g. Environment, Technology, Education" },
    difficulty: { type: Type.STRING, description: "'Standard' or 'Challenging'" },
    createdAt: { type: Type.INTEGER, description: "Creation timestamp in milliseconds" },
    
    part1: {
      type: Type.OBJECT,
      properties: {
        topicGroups: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topicId: { type: Type.STRING, description: "Topic ID e.g. p1_topic_hometown" },
              title: { type: Type.STRING, description: "Topic title e.g. Hometown & Local Area" },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "Question ID e.g. q_p1_01" },
                    prompt: { type: Type.STRING, description: "Natural introductory interview question" }
                  },
                  required: ["id", "prompt"]
                }
              }
            },
            required: ["topicId", "title", "questions"]
          }
        }
      },
      required: ["topicGroups"]
    },

    part2: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: "Cue card ID e.g. q_p2_cue_01" },
        topic: { type: Type.STRING, description: "Cue card main topic e.g. Describe a park or garden you enjoy visiting" },
        instructions: { type: Type.STRING, description: "Candidate instructions e.g. You should say: where it is..." },
        bulletPrompts: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "3 to 4 prompt points candidate must address"
        },
        preparationTimeSeconds: { type: Type.INTEGER, description: "Must be 60" },
        speakingTimeSeconds: { type: Type.INTEGER, description: "Must be 120" },
        roundingOffQuestion: { type: Type.STRING, description: "Short follow-up question after candidate finishes" },
        examinerIntro: { type: Type.STRING, description: "Examiner introduction prompt" }
      },
      required: ["id", "topic", "instructions", "bulletPrompts", "preparationTimeSeconds", "speakingTimeSeconds"]
    },

    part3: {
      type: Type.OBJECT,
      properties: {
        themes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              themeId: { type: Type.STRING, description: "Theme ID e.g. p3_theme_public_spaces" },
              title: { type: Type.STRING, description: "Abstract discussion theme e.g. Public Spaces in Cities" },
              connectedPart2Theme: { type: Type.STRING, description: "Must reference the Part 2 cue card theme" },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "Question ID e.g. q_p3_01" },
                    prompt: { type: Type.STRING, description: "Abstract analytical question" },
                    examinerProbeNotes: { type: Type.STRING, description: "Optional notes for examiner follow-up" }
                  },
                  required: ["id", "prompt"]
                }
              }
            },
            required: ["themeId", "title", "connectedPart2Theme", "questions"]
          }
        }
      },
      required: ["themes"]
    }
  },
  required: ["examId", "schemaVersion", "title", "format", "topicDomain", "difficulty", "part1", "part2", "part3"]
};
