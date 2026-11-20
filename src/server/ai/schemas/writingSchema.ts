import { Type } from '@google/genai';

export type WritingFormat = 'Academic' | 'General Training';
export type WritingTaskCategory = 'task1' | 'task2';
export type AcademicTask1Type = 'line' | 'bar' | 'pie' | 'table' | 'map' | 'process' | 'mixed';
export type GTTask1LetterType = 'formal' | 'semi_formal' | 'informal';
export type GTTask1Scenario = 'complaint' | 'request' | 'enquiry' | 'apology' | 'invitation' | 'explanation';
export type Task2EssayType = 'opinion' | 'discuss_both_views' | 'advantages_disadvantages' | 'problem_solution' | 'two_part' | 'positive_negative';
export type Task2TopicCategory = 'technology' | 'education' | 'environment' | 'society' | 'health' | 'culture' | 'work' | 'economy';

export interface BaseQuestionMetadata {
  id: string;
  schemaVersion: '1.0';
  format: WritingFormat;
  taskCategory: WritingTaskCategory;
  questionType: string;
  prompt: string;
  instructions: string;
  suggestedTimeMinutes: number;
  minWordLimit: number;
  validationStatus: 'PASSED' | 'FAILED' | 'REPAIRED';
  lifecycleStatus: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED';
  createdAt: number;
  updatedAt?: number;
  modelMetadata?: {
    modelName: string;
    generationTimestamp: number;
    repairAttempts?: number;
  };
  sampleModelAnswerBand9?: string;
  modelAnswerDisclaimer?: string;
}

export interface WritingTask1AcademicVisualData {
  chartTitle: string;
  units?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  categories?: string[];
  series?: Array<{ name: string; data: number[] }>;
  labels?: string[];
  values?: number[];
  tableHeaders?: string[];
  tableRows?: Array<Array<string | number>>;
  pastYear?: string;
  presentYear?: string;
  mapFeatures?: Array<{ name: string; pastState: string; presentState: string }>;
  processTitle?: string;
  processSteps?: Array<{ stepNumber: number; title: string; description: string }>;
  mixedComponents?: Array<{
    type: 'line' | 'bar' | 'pie' | 'table';
    title: string;
    categories?: string[];
    series?: Array<{ name: string; data: number[] }>;
    values?: number[];
    labels?: string[];
  }>;
}

export interface WritingTask1AcademicQuestion extends BaseQuestionMetadata {
  format: 'Academic';
  taskCategory: 'task1';
  questionType: AcademicTask1Type;
  visualData: WritingTask1AcademicVisualData;
  keyFeaturesToReport: string[];
}

export interface WritingTask1GeneralQuestion extends BaseQuestionMetadata {
  format: 'General Training';
  taskCategory: 'task1';
  questionType: GTTask1LetterType;
  scenarioCategory: GTTask1Scenario;
  situationContext: string;
  recipient: string;
  writingPurpose: string;
  salutationInstruction: string;
  bulletPoints: [string, string, string];
}

export type WritingTask1Question = WritingTask1AcademicQuestion | WritingTask1GeneralQuestion;

export interface WritingTask2Question extends BaseQuestionMetadata {
  taskCategory: 'task2';
  questionType: Task2EssayType;
  topicCategory: Task2TopicCategory;
  questionText: string;
  keyArgumentsToConsider: {
    sideA: string[];
    sideB: string[];
  };
}

export interface WritingExamPackage {
  examId: string;
  schemaVersion: '1.0';
  title: string;
  format: WritingFormat;
  createdAt: number;
  task1: WritingTask1Question;
  task2: WritingTask2Question;
}

/**
 * Gemini responseSchema for structured IELTS Writing Exam Package generation
 */
export const WritingExamSchema = {
  type: Type.OBJECT,
  properties: {
    examId: { type: Type.STRING, description: "Unique exam identifier, e.g. ai-writing-acad-1794125000" },
    schemaVersion: { type: Type.STRING, description: "Must be '1.0'" },
    title: { type: Type.STRING, description: "Exam title, e.g. IELTS Writing Practice Set — Environmental Policy" },
    format: { type: Type.STRING, description: "'Academic' or 'General Training'" },
    task1: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: "Task 1 Question ID" },
        schemaVersion: { type: Type.STRING, description: "Must be '1.0'" },
        format: { type: Type.STRING, description: "'Academic' or 'General Training'" },
        taskCategory: { type: Type.STRING, description: "Must be 'task1'" },
        questionType: { type: Type.STRING, description: "For Academic: 'line', 'bar', 'pie', 'table', 'map', 'process', 'mixed'. For GT: 'formal', 'semi_formal', 'informal'" },
        prompt: { type: Type.STRING, description: "Official task 1 prompt description" },
        instructions: { type: Type.STRING, description: "Standard instruction text" },
        suggestedTimeMinutes: { type: Type.INTEGER, description: "Must be 20" },
        minWordLimit: { type: Type.INTEGER, description: "Must be 150" },
        validationStatus: { type: Type.STRING, description: "'PASSED'" },
        lifecycleStatus: { type: Type.STRING, description: "'PENDING_REVIEW'" },
        createdAt: { type: Type.INTEGER, description: "Timestamp ms" },
        
        // Academic Task 1 fields
        visualData: {
          type: Type.OBJECT,
          properties: {
            chartTitle: { type: Type.STRING, description: "Title of visual chart/data" },
            units: { type: Type.STRING, description: "Units of measurement (e.g. %, tonnes, £ millions)" },
            xAxisLabel: { type: Type.STRING },
            yAxisLabel: { type: Type.STRING },
            categories: { type: Type.ARRAY, items: { type: Type.STRING } },
            series: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  data: { type: Type.ARRAY, items: { type: Type.NUMBER } }
                },
                required: ["name", "data"]
              }
            },
            labels: { type: Type.ARRAY, items: { type: Type.STRING } },
            values: { type: Type.ARRAY, items: { type: Type.NUMBER } },
            tableHeaders: { type: Type.ARRAY, items: { type: Type.STRING } },
            tableRows: {
              type: Type.ARRAY,
              items: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            pastYear: { type: Type.STRING },
            presentYear: { type: Type.STRING },
            mapFeatures: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  pastState: { type: Type.STRING },
                  presentState: { type: Type.STRING }
                },
                required: ["name", "pastState", "presentState"]
              }
            },
            processTitle: { type: Type.STRING },
            processSteps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["stepNumber", "title", "description"]
              }
            }
          },
          required: ["chartTitle"]
        },
        keyFeaturesToReport: { type: Type.ARRAY, items: { type: Type.STRING } },

        // General Training Task 1 fields
        scenarioCategory: { type: Type.STRING, description: "'complaint', 'request', 'enquiry', 'apology', 'invitation', 'explanation'" },
        situationContext: { type: Type.STRING },
        recipient: { type: Type.STRING },
        writingPurpose: { type: Type.STRING },
        salutationInstruction: { type: Type.STRING },
        bulletPoints: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Must be exactly 3 bullet points"
        },
        sampleModelAnswerBand9: { type: Type.STRING, description: "Optional Band 9 exemplar" }
      },
      required: ["id", "schemaVersion", "format", "taskCategory", "questionType", "prompt", "instructions", "suggestedTimeMinutes", "minWordLimit"]
    },
    task2: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: "Task 2 Question ID" },
        schemaVersion: { type: Type.STRING, description: "Must be '1.0'" },
        format: { type: Type.STRING, description: "'Academic' or 'General Training'" },
        taskCategory: { type: Type.STRING, description: "Must be 'task2'" },
        questionType: { type: Type.STRING, description: "'opinion', 'discuss_both_views', 'advantages_disadvantages', 'problem_solution', 'two_part', 'positive_negative'" },
        topicCategory: { type: Type.STRING, description: "'technology', 'education', 'environment', 'society', 'health', 'culture', 'work', 'economy'" },
        prompt: { type: Type.STRING, description: "Core topic statement" },
        questionText: { type: Type.STRING, description: "Direct essay question e.g. To what extent do you agree or disagree?" },
        instructions: { type: Type.STRING, description: "Standard Task 2 instructions" },
        suggestedTimeMinutes: { type: Type.INTEGER, description: "Must be 40" },
        minWordLimit: { type: Type.INTEGER, description: "Must be 250" },
        validationStatus: { type: Type.STRING, description: "'PASSED'" },
        lifecycleStatus: { type: Type.STRING, description: "'PENDING_REVIEW'" },
        createdAt: { type: Type.INTEGER, description: "Timestamp ms" },
        keyArgumentsToConsider: {
          type: Type.OBJECT,
          properties: {
            sideA: { type: Type.ARRAY, items: { type: Type.STRING } },
            sideB: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["sideA", "sideB"]
        },
        sampleModelAnswerBand9: { type: Type.STRING, description: "Optional Band 9 exemplar essay" }
      },
      required: ["id", "schemaVersion", "format", "taskCategory", "questionType", "topicCategory", "prompt", "questionText", "instructions", "suggestedTimeMinutes", "minWordLimit"]
    }
  },
  required: ["examId", "schemaVersion", "title", "format", "task1", "task2"]
};
