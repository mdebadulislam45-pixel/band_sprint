/**
 * System Instructions and Prompt Builders for IELTS Writing Question Factory
 */

export const ACADEMIC_WRITING_SYSTEM_INSTRUCTION = `You are a Senior IELTS Author and Chief Writing Test Item Writer.
Your task is to generate 100% original, authentic, and standardized IELTS Academic Writing Examination materials.

STRICT WRITING FACTORY CONSTRAINTS:
1. ORIGINALITY: Create completely original prompts and datasets. Do NOT copy or paraphrase copyrighted Sprint/BC test papers.
2. ACADEMIC TASK 1 VISUAL DATA:
   - Provide real structured numerical or geographical/procedural data in the visualData object.
   - For line/bar charts: provide categories array and series array with actual numbers.
   - For pie charts: provide labels array and values array.
   - For tables: provide tableHeaders array and tableRows matrix.
   - For maps: provide pastYear, presentYear, and mapFeatures array detailing past vs present changes.
   - For processes: provide processTitle and processSteps array detailing step-by-step stages.
   - Minimum word requirement must be set to 150 words. Suggested time: 20 minutes.
3. TASK 2 ESSAY:
   - Must present a balanced, engaging, contemporary topic statement in the prompt field.
   - Must specify direct questionText e.g. "To what extent do you agree or disagree?" or "Discuss both views and give your opinion."
   - Provide keyArgumentsToConsider for sideA and sideB.
   - Minimum word requirement must be set to 250 words. Suggested time: 40 minutes.
4. MODEL ESSAY DISCLAIMER:
   - If a Band 9 model answer is included, append the explicit disclaimer:
     "Optional AI-generated exemplar essay for reference only. Diagnostic model answer, not an official IELTS test response."
`;

export const GENERAL_TRAINING_WRITING_SYSTEM_INSTRUCTION = `You are a Senior IELTS Author specializing in General Training Writing.
Your task is to generate 100% original, authentic General Training Writing Examination materials.

STRICT GENERAL TRAINING CONSTRAINTS:
1. GT TASK 1 LETTER:
   - Provide a realistic situationContext, recipient description, and clear writingPurpose.
   - Specify letterType: 'formal', 'semi_formal', or 'informal'.
   - Specify scenarioCategory: 'complaint', 'request', 'enquiry', 'apology', 'invitation', or 'explanation'.
   - Provide salutationInstruction e.g. "Dear Sir or Madam," or "Dear [Name],".
   - MUST provide EXACTLY THREE mandatory bullet points in the bulletPoints array.
   - Minimum word requirement must be 150 words. Suggested time: 20 minutes.
2. TASK 2 ESSAY:
   - Must present a clear practical or social topic suitable for General Training candidates.
   - Minimum word requirement must be 250 words. Suggested time: 40 minutes.
3. MODEL ESSAY DISCLAIMER:
   - Append explicit AI diagnostic disclaimer to sample model answers.
`;

export function buildWritingPrompt(params: {
  format?: 'Academic' | 'General Training';
  topicSeed?: string;
  task1Type?: string;
  essayType?: string;
}): string {
  const format = params.format || 'Academic';
  const seedText = params.topicSeed
    ? `Focus on the theme: ${params.topicSeed}.`
    : 'Choose engaging, contemporary global themes (e.g. renewable energy transition, artificial intelligence in workplace, urban green spaces, remote education).';

  const t1Constraint = params.task1Type
    ? `For Task 1, generate a ${params.task1Type} task.`
    : 'For Task 1, choose a suitable visual chart or letter scenario.';

  const t2Constraint = params.essayType
    ? `For Task 2, generate an ${params.essayType} essay type.`
    : 'For Task 2, choose a balanced IELTS essay format (e.g. opinion, discuss both views, problem and solution).';

  return `Generate one complete IELTS ${format} Writing Examination Package containing both Task 1 and Task 2.

Format: ${format}
${seedText}
${t1Constraint}
${t2Constraint}

REQUIREMENTS:
1. Task 1 suggested time = 20 minutes, min word limit = 150.
2. Task 2 suggested time = 40 minutes, min word limit = 250.
3. Ensure all structured data arrays (categories, series, tableRows, mapFeatures, bulletPoints, keyArgumentsToConsider) are fully populated.
4. Output must conform strictly to the provided JSON Schema.`;
}

export function buildWritingRepairPrompt(failedPayload: any, errors: string[]): string {
  return `The generated IELTS Writing Examination Package contains validation errors that must be repaired:

ERRORS DETECTED:
${errors.map((e, idx) => `${idx + 1}. ${e}`).join('\n')}

INSTRUCTIONS:
1. Fix all listed validation errors while preserving valid prompt text and question structures.
2. Ensure Task 1 contains complete visual datasets or exactly 3 bullet points for GT letters.
3. Ensure Task 2 contains clear prompt text and question instructions.
4. Output the complete corrected exam JSON conforming strictly to the schema.`;
}
