/**
 * System Instructions and Prompt Builders for AI IELTS Speaking Question Factory
 */

export const SPEAKING_SYSTEM_INSTRUCTION = `You are a Senior IELTS Speaking Test Item Writer and Chief Examiner.
Your task is to generate 100% original, authentic, and standardized IELTS Speaking Examination materials.

STRICT SPEAKING FACTORY CONSTRAINTS:
1. ORIGINALITY: Create completely original prompts, cue cards, and discussion topics. Do NOT copy or paraphrase copyrighted Sprint or British Council test papers.
2. PART 1 — INTRODUCTION & INTERVIEW:
   - Provide 2 to 3 distinct everyday topic groups (e.g., Hometown, Work/Study, Free Time, Daily Routine, Weather, Transport).
   - Each topic group must contain 3 to 4 short, direct, conversational questions.
   - Questions must be natural, accessible, and suitable for warm-up personal discussion. Avoid overly complex academic jargon in Part 1.
3. PART 2 — INDIVIDUAL LONG TURN (CUE CARD):
   - Provide EXACTLY ONE cue-card task topic (e.g. "Describe a memorable journey you took", "Describe a person who inspired you").
   - Provide clear candidate instructions: "You should say: [bullet 1], [bullet 2], [bullet 3], and explain why...".
   - Include 3 to 4 clear, coherent, non-overlapping bullet prompts.
   - Preparation time must be set to 60 seconds; speaking time must be set to 120 seconds.
   - Include a short, optional rounding-off question asked by the examiner after the presentation.
4. PART 3 — TWO-WAY ABSTRACT DISCUSSION:
   - Provide 2 abstract discussion themes directly connected to the overarching topic of Part 2.
   - Each theme must contain 3 analytical, high-level discussion questions.
   - Questions must encourage explanation, comparison, justification, speculation, evaluation, or future prediction.
   - Part 3 questions must NOT repeat Part 1 or Part 2 wording.
5. EXAMINER TONE & PHRASING:
   - Use professional, polite British-English examiner phrasing (e.g., "Now, let's move on to discuss...", "What factors do you think contribute to...").
6. NO FABRICATED ANSWERS:
   - Do NOT generate candidate responses, transcripts, or sample band scores in the test paper package.
`;

export function buildSpeakingPrompt(params: {
  format?: 'Academic' | 'General Training';
  topicSeed?: string;
  difficulty?: 'Standard' | 'Challenging';
}): string {
  const format = params.format || 'Academic';
  const difficulty = params.difficulty || 'Standard';
  const seedText = params.topicSeed
    ? `Focus the central theme around: ${params.topicSeed}.`
    : 'Choose a compelling contemporary global theme (e.g., Technology and Communication, Environmental Sustainability, Urban Architecture, Cultural Heritage, Modern Workplaces).';

  return `Generate one complete IELTS Speaking Examination Package containing Part 1, Part 2, and Part 3.

Exam Format: ${format}
Difficulty Level: ${difficulty}
${seedText}

STRUCTURE REQUIREMENTS:
1. Part 1: Provide 2 or 3 familiar topic groups with 3 to 4 short introductory questions per topic.
2. Part 2: Provide 1 clear cue card task with 3 or 4 coherent bullet prompts. Set preparationTimeSeconds = 60, speakingTimeSeconds = 120.
3. Part 3: Provide 2 thematic abstract discussion sections (3 questions each) directly extending the Part 2 topic.
4. Ensure all IDs are unique across all parts (e.g., q_p1_01, q_p2_cue_01, q_p3_01).
5. Output must conform strictly to the provided JSON Schema.`;
}

export function buildSpeakingRepairPrompt(failedPayload: any, errors: string[]): string {
  return `The generated IELTS Speaking Examination Package contains validation errors that must be repaired:

ERRORS DETECTED:
${errors.map((e, idx) => `${idx + 1}. ${e}`).join('\n')}

INSTRUCTIONS:
1. Fix all listed validation errors while preserving valid prompt text and topic structures.
2. Ensure Part 1 contains valid topic groups with non-empty questions.
3. Ensure Part 2 contains exactly 1 cue card with 3 to 4 bullet points, prep time 60s, and speaking time 120s.
4. Ensure Part 3 contains abstract discussion questions connected to the Part 2 theme.
5. Ensure all question IDs are unique and no questions are empty.
6. Output the complete corrected exam JSON conforming strictly to the schema.`;
}
