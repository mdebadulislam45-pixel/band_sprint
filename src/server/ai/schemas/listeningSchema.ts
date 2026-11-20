import { Type } from '@google/genai';

/**
 * Enforces 100% deterministic JSON output for IELTS Academic Listening generation via Gemini 3.8
 */
export const ListeningExamSchema = {
  type: Type.OBJECT,
  properties: {
    examId: { type: Type.STRING, description: "Unique exam identifier, e.g., ai-listening-acad-001" },
    title: { type: Type.STRING, description: "Exam title, e.g., IELTS Practice Listening Examination Set 1" },
    format: { type: Type.STRING, description: "Must be 'Academic'" },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sectionNumber: { type: Type.INTEGER, description: "Section number: 1, 2, 3, or 4" },
          title: { type: Type.STRING, description: "Section descriptive title" },
          script: { type: Type.STRING, description: "Full multi-speaker dialogue or monologue transcript (650-850 words)" },
          wordCount: { type: Type.INTEGER, description: "Word count of the section script" },
          speakers: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                speakerId: { type: Type.STRING, description: "speaker_01 through speaker_16" },
                roleName: { type: Type.STRING, description: "Character role or job title e.g. Admissions Officer, Student" },
                gender: { type: Type.STRING, description: "male or female" }
              },
              required: ["speakerId", "roleName", "gender"]
            }
          },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER, description: "Sequential question number from 1 to 40" },
                type: {
                  type: Type.STRING,
                  description: "One of: form_completion, note_completion, table_completion, sentence_completion, multiple_choice, matching, map_labelling, short_answer"
                },
                prompt: { type: Type.STRING, description: "Question statement or prompt" },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Options for multiple choice or matching (A, B, C, D, etc.)"
                },
                correctAnswer: { type: Type.STRING, description: "Exact correct answer string or letter" },
                acceptableAnswers: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Acceptable variations (e.g. ['250', 'two hundred fifty'])"
                },
                explanation: { type: Type.STRING, description: "Pedagogical explanation of why this answer is correct" },
                scriptEvidence: { type: Type.STRING, description: "Exact or near-exact quote from section script supporting answer" }
              },
              required: ["id", "type", "prompt", "correctAnswer", "explanation", "scriptEvidence"]
            }
          }
        },
        required: ["sectionNumber", "title", "script", "speakers", "questions"]
      }
    }
  },
  required: ["examId", "title", "format", "sections"]
};
