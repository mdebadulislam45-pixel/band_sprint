/**
 * System Instructions and Prompt Builders for IELTS Listening Generation
 */

export const LISTENING_SYSTEM_INSTRUCTION = `You are a Senior IELTS Examination Author and Chief Listening Item Writer.
Your task is to generate 100% original, authentic, and standardized IELTS Listening practice materials.

STRICT GUIDELINES:
1. ORIGINALITY: Create completely original scripts on realistic everyday social and university scenarios. Do NOT copy or closely paraphrase copyrighted Sprint or British Council materials.
2. SECTION STRUCTURE & COUNTS:
   - Section 1: Everyday Social Conversation (2 speakers, e.g., Agent & Customer). Exactly 10 questions (IDs 1-10). Target ~650-850 words.
   - Section 2: Social/Community Monologue (1 speaker, e.g., Tour Guide or Coordinator). Exactly 10 questions (IDs 11-20). Target ~650-850 words.
   - Section 3: Academic Discussion (2 or 3 speakers, e.g., Tutor & 2 Students). Exactly 10 questions (IDs 21-30). Target ~650-850 words.
   - Section 4: Academic Monologue / Lecture (1 speaker, e.g., University Lecturer). Exactly 10 questions (IDs 31-40). Target ~650-850 words.
3. TOTAL QUESTION COUNT: Exactly 40 questions total across all 4 sections (10 questions per section).
4. SPEAKER FORMATTING:
   - All dialogue lines in scripts MUST be formatted with explicit speaker turn labels, e.g.:
     "Receptionist: Good morning, City Housing Office. How can I help you today?"
     "Customer: Hello, I am calling to inquire about short-term student apartment rentals."
   - Every speaker must be assigned a speakerId from speaker_01 through speaker_16.
5. QUESTION TYPES: Mix authentic question types across sections:
   - Section 1: form_completion (Qs 1-6), note_completion (Qs 7-10).
   - Section 2: multiple_choice (Qs 11-15), matching (Qs 16-20).
   - Section 3: sentence_completion (Qs 21-25), multiple_choice (Qs 26-30).
   - Section 4: note_completion (Qs 31-40).
6. CHRONOLOGICAL ANSWER ORDER: Answers must appear in the script in the exact chronological order of the question numbers.
7. VERIFIABLE EVIDENCE: Every correct answer MUST be directly supported by a clear sentence or turn in the script text. Provide the exact quote in scriptEvidence.
8. NO OUTSIDE KNOWLEDGE: Questions must be answerable strictly from the spoken script.
`;

export function buildListeningPrompt(topicSeed?: string): string {
  const seedText = topicSeed ? `Focus on topics related to: ${topicSeed}.` : 'Choose 4 distinct realistic scenarios (e.g., Section 1: Bicycle Rental Booking, Section 2: Community Garden Orientation, Section 3: Environmental Science Project Planning, Section 4: History of Early Postal Systems).';

  return `Generate one complete 4-section IELTS Listening Examination.
${seedText}

Ensure exact compliance with question count constraints:
- Section 1 (IDs 1-10): 10 questions
- Section 2 (IDs 11-20): 10 questions
- Section 3 (IDs 21-30): 10 questions
- Section 4 (IDs 31-40): 10 questions
Total questions = 40.

All output must strictly conform to the provided JSON Schema.`;
}

export function buildListeningRepairPrompt(failedExamPayload: any, errors: string[]): string {
  return `The generated IELTS Listening Examination contains validation errors that must be repaired:

ERRORS DETECTED:
${errors.map((e, idx) => `${idx + 1}. ${e}`).join('\n')}

INSTRUCTIONS:
1. Fix all listed validation errors while preserving valid sections and questions.
2. Ensure exactly 4 sections and 40 questions numbered sequentially 1 through 40 (10 questions per section).
3. Ensure every answer is supported by its script evidence and follows script chronological order.
4. Output the complete corrected exam JSON conforming to the schema.`;
}
