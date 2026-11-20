import { Type } from '@google/genai';

/**
 * Enforces 100% deterministic JSON output for IELTS Academic Reading generation via Gemini 3.8
 */
export const AcademicReadingExamSchema = {
  type: Type.OBJECT,
  properties: {
    examId: { type: Type.STRING, description: "Unique exam identifier, e.g., ai-reading-acad-001" },
    title: { type: Type.STRING, description: "Exam title, e.g., IELTS Academic Reading Practice Set 1" },
    format: { type: Type.STRING, description: "Must be 'Academic'" },
    passages: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          passageNumber: { type: Type.INTEGER, description: "Passage number: 1, 2, or 3" },
          title: { type: Type.STRING, description: "Passage headline" },
          text: { type: Type.STRING, description: "Full passage text (750-1100 words)" },
          wordCount: { type: Type.INTEGER, description: "Word count of the passage text" },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER, description: "Sequential question number from 1 to 40" },
                type: {
                  type: Type.STRING,
                  description: "One of: true_false_not_given, yes_no_not_given, multiple_choice, matching_headings, sentence_completion, summary_completion"
                },
                prompt: { type: Type.STRING, description: "Question statement or prompt" },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Options for multiple choice or matching headings (A, B, C, D, etc.)"
                },
                correctAnswer: { type: Type.STRING, description: "Exact correct answer string or letter" },
                acceptableAnswers: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Acceptable variations (e.g. ['TRUE', 'True'], ['250', 'two hundred fifty'])"
                },
                explanation: { type: Type.STRING, description: "Pedagogical explanation of why this answer is correct" },
                passageEvidence: { type: Type.STRING, description: "Exact or near-exact quote from passage supporting answer" }
              },
              required: ["id", "type", "prompt", "correctAnswer", "explanation", "passageEvidence"]
            }
          }
        },
        required: ["passageNumber", "title", "text", "questions"]
      }
    }
  },
  required: ["examId", "title", "format", "passages"]
};

export const SingleReadingPassageSchema = {
  type: Type.OBJECT,
  properties: {
    passageNumber: { type: Type.INTEGER, description: "Passage number: 1, 2, or 3" },
    title: { type: Type.STRING, description: "Passage headline" },
    text: { type: Type.STRING, description: "Full authentic passage text (750-1100 words)" },
    wordCount: { type: Type.INTEGER, description: "Word count of the passage text" },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER, description: "Sequential question number" },
          type: {
            type: Type.STRING,
            description: "One of: true_false_not_given, yes_no_not_given, multiple_choice, matching_headings, sentence_completion, summary_completion"
          },
          prompt: { type: Type.STRING, description: "Question statement or prompt" },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Options for multiple choice or matching headings (A, B, C, D, etc.)"
          },
          correctAnswer: { type: Type.STRING, description: "Exact correct answer string or letter" },
          acceptableAnswers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Acceptable variations (e.g. ['TRUE', 'True'], alternative noun-phrase lengths)"
          },
          explanation: { type: Type.STRING, description: "Pedagogical explanation of why this answer is correct" },
          passageEvidence: { type: Type.STRING, description: "Exact verbatim quote from passage supporting answer" }
        },
        required: ["id", "type", "prompt", "correctAnswer", "explanation", "passageEvidence"]
      }
    }
  },
  required: ["passageNumber", "title", "text", "questions"]
};
