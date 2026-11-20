/**
 * Independent Second-Pass IELTS Exam Solver
 * 
 * Complies with Quality Pass Step 1g & Step 3:
 * - Solves every question from the passage or script alone WITHOUT seeing the answer key or generator evidence.
 * - For True/False/Not Given and Yes/No/Not Given items, provides:
 *   - solvedAnswer
 *   - exact quote from passage
 *   - strongest alternative answer with strength score from 0 to 3
 *   - Flags item if alternativeStrength >= 2
 * - Treats roman numerals and roman numeral + heading text as matches (Rule 1g)
 * - Uses a stronger solver model (defaults to process.env.SOLVER_MODEL || 'gemini-3.5-flash-lite' with fallback to 'gemini-3.5-flash' / 'gemini-3.5-flash-lite').
 */

import { GoogleGenAI, Type } from '@google/genai';
import { resolveGeminiApiKey } from './apiKeyResolver.ts';
import { normalizeHeadingAnswer } from './codeOnlyReadingChecks.ts';

export interface SolverQuestionItem {
  qNum: number;
  type: string;
  prompt: string;
  options?: string[];
  generatorAnswer: string;
  acceptableAnswers?: string[];
  passageText?: string;
}

export interface SolverQuestionResult {
  qNum: number;
  questionType: string;
  prompt: string;
  generatorAnswer: string;
  solverAnswer: string;
  solverEvidenceQuote: string;
  solverRationale: string;
  isMatch: boolean;
  notes?: string;
  strongestAlternative?: string;
  alternativeStrength?: number;
  alternativeRationale?: string;
}

export interface SecondPassSolverReport {
  solverModel: string;
  testedAt: number;
  passed: boolean;
  totalQuestions: number;
  matchCount: number;
  mismatchCount: number;
  needsReview: boolean;
  summary: string;
  details: SolverQuestionResult[];
  tokenUsage?: {
    promptTokens?: number;
    candidatesTokens?: number;
    totalTokens?: number;
  };
}

const INDEPENDENT_SOLVER_SYSTEM_INSTRUCTION = `You are an independent, blind IELTS Quality Assurance Verification Officer and Senior Examiner.
Your objective is to solve the examination questions strictly using ONLY the provided passage or script context.

CRITICAL INSTRUCTIONS:
1. You DO NOT have access to any answer key, teacher annotations, or author hints.
2. Rely strictly on facts directly stated in the text. Do NOT use outside world knowledge.
3. For True/False/Not Given:
   - "TRUE" if the statement agrees with the information in the passage.
   - "FALSE" if the statement contradicts the information in the passage.
   - "NOT GIVEN" if there is no information on this.
4. For Yes/No/Not Given:
   - "YES" if the statement agrees with the claims/opinions of the writer.
   - "NO" if the statement contradicts the claims/opinions of the writer.
   - "NOT GIVEN" if it is impossible to say what the writer thinks about this.
5. For Multiple Choice:
   - Provide the single uppercase letter of the option (e.g. "A", "B", "C", or "D").
6. For Completion / Short Answer:
   - Extract the exact word or words directly from the text within the stated word count limit.
7. For every question, you MUST provide the exact textual quote from the passage that justifies your solution.
8. For True/False/Not Given and Yes/No/Not Given questions, you MUST evaluate potential ambiguity:
   - Provide the "strongestAlternative" answer (e.g. "NOT GIVEN" if your answer is "FALSE").
   - Rate "alternativeStrength" as an integer from 0 to 3:
     0 = Negligible / no support for alternative.
     1 = Weak alternative / easily dismissed.
     2 = Plausible ambiguity / moderate counter-evidence exists.
     3 = Strong alternative interpretation / high ambiguity.
   - Explain your rationale in "alternativeRationale".`;

/**
 * Normalizes answer text for standardized comparison
 */
export function normalizeAnswer(ans: string | undefined | null): string {
  if (!ans || typeof ans !== 'string') return '';
  let clean = ans.trim().toLowerCase();

  // Strip leading option letters like "a) ", "b. "
  clean = clean.replace(/^[a-d][).:\s]\s*/, '');

  // Strip trailing punctuation
  clean = clean.replace(/[.,;!?]+$/, '');

  // Standardize boolean responses
  if (['true', 't'].includes(clean)) return 'true';
  if (['false', 'f'].includes(clean)) return 'false';
  if (['not given', 'ng', 'notgiven'].includes(clean)) return 'not given';
  if (['yes', 'y'].includes(clean)) return 'yes';
  if (['no', 'n'].includes(clean)) return 'no';

  // Standardize single letters
  if (/^[a-d]$/.test(clean)) return clean.toUpperCase();

  // Strip articles (a, an, the)
  clean = clean.replace(/^(a|an|the)\s+/, '');

  // Collapse whitespaces
  return clean.replace(/\s+/g, ' ').trim();
}

/**
 * Compares solver answer with generator answer, taking into account acceptable alternate spellings,
 * noun phrase length variations, and Roman numeral heading matches (Rule 1g).
 */
export function compareAnswers(
  generatorAnswer: string,
  solverAnswer: string,
  acceptableAnswers?: string[]
): boolean {
  const normGen = normalizeAnswer(generatorAnswer);
  const normSol = normalizeAnswer(solverAnswer);

  if (normGen === normSol) return true;

  // Rule 1g: Roman numeral and Roman numeral + heading text match
  const romanGen = normalizeHeadingAnswer(generatorAnswer);
  const romanSol = normalizeHeadingAnswer(solverAnswer);
  if (romanGen && romanSol && romanGen === romanSol) {
    return true;
  }

  // Check acceptable alternatives if provided by generator
  if (Array.isArray(acceptableAnswers)) {
    for (const alt of acceptableAnswers) {
      if (normalizeAnswer(alt) === normSol) return true;
      const rAlt = normalizeHeadingAnswer(alt);
      if (rAlt && romanSol && rAlt === romanSol) return true;
    }
  }

  // Handle case where solver provided option letter or option text
  if (normGen.length === 1 && normSol.startsWith(normGen.toLowerCase())) {
    return true;
  }
  if (normSol.length === 1 && normGen.startsWith(normSol.toLowerCase())) {
    return true;
  }

  // Accept shorter or longer version of the same noun phrase within the word limit (<= 3 words)
  const genWords = normGen.split(/\s+/).filter(Boolean);
  const solWords = normSol.split(/\s+/).filter(Boolean);
  if (genWords.length > 0 && solWords.length > 0) {
    const isSubPhrase = normSol.includes(normGen) || normGen.includes(normSol);
    if (isSubPhrase && genWords.length <= 3 && solWords.length <= 3) {
      return true;
    }
  }

  return false;
}

export class SecondPassSolver {
  private ai: GoogleGenAI;
  private solverModel: string;
  private fallbackModels = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];

  constructor(apiKey?: string) {
    const key = apiKey || resolveGeminiApiKey();
    this.solverModel = process.env.SOLVER_MODEL || 'gemini-3.5-flash';
    this.ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }

  public getModelName(): string {
    return this.solverModel;
  }

  /**
   * Generates content with automatic fallback across verified models
   */
  private async generateWithFallback(contents: string, config: any): Promise<{ text: string; modelUsed: string; usage: any }> {
    const candidateModels = [this.solverModel, ...this.fallbackModels.filter(m => m !== this.solverModel)];
    let lastError: any = null;

    for (const model of candidateModels) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const resp = await this.ai.models.generateContent({
            model,
            contents,
            config
          });
          return {
            text: resp.text || '',
            modelUsed: model,
            usage: resp.usageMetadata
          };
        } catch (err: any) {
          lastError = err;
          const is503 = err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('high demand');
          if (is503 && attempt < 3) {
            await new Promise(r => setTimeout(r, attempt * 2000));
            continue;
          }
          break;
        }
      }
    }
    throw lastError || new Error('All solver candidate models failed.');
  }

  /**
   * Solves Reading questions independently passage by passage without ever seeing the answer key.
   */
  public async solveAcademicReadingDraft(draftContent: any): Promise<SecondPassSolverReport> {
    const passages = Array.isArray(draftContent?.passages) ? draftContent.passages : [];
    const allResults: SolverQuestionResult[] = [];
    let activeModelUsed = this.solverModel;
    let totalPromptTokens = 0;
    let totalCandidatesTokens = 0;

    for (let pIdx = 0; pIdx < passages.length; pIdx++) {
      const p = passages[pIdx];
      const pNum = p.passageNumber || pIdx + 1;
      const pText = p.text || p.content || '';
      const rawQuestions: any[] = Array.isArray(p.questions) ? p.questions : [];

      if (rawQuestions.length === 0) continue;

      // STRIP ANSWER KEYS completely before feeding to solver!
      // The solver sees only id, type, prompt, and options. NO correct answers and NO passage evidence.
      const blindQuestions = rawQuestions.map((q: any) => ({
        id: q.id ?? q.questionNumber,
        type: q.type || q.questionType,
        prompt: q.prompt || q.question || q.statement,
        options: Array.isArray(q.options) ? q.options : undefined
      }));

      const solverPrompt = `You are evaluating Passage ${pNum}: "${p.title || 'Academic Reading Passage'}".
PASSAGE TEXT:
"""
${pText}
"""

QUESTIONS TO SOLVE (Answer strictly based on the text above, without any prior key):
${JSON.stringify(blindQuestions, null, 2)}

Provide your output as a JSON array of solved items.`;

      try {
        const { text, modelUsed, usage } = await this.generateWithFallback(solverPrompt, {
          systemInstruction: INDEPENDENT_SOLVER_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER, description: 'The question id/number' },
                solvedAnswer: { type: Type.STRING, description: 'Your derived answer strictly from the passage' },
                passageEvidenceQuote: { type: Type.STRING, description: 'Exact verbatim quote from the passage proving this answer' },
                strongestAlternative: { type: Type.STRING, description: 'Strongest counter-interpretation for TFNG/YNNG' },
                alternativeStrength: { type: Type.INTEGER, description: '0 to 3 ambiguity rating for alternative' },
                alternativeRationale: { type: Type.STRING, description: 'Why alternative was considered or rejected' },
                rationale: { type: Type.STRING, description: 'Brief rationale' }
              },
              required: ['id', 'solvedAnswer', 'passageEvidenceQuote']
            }
          }
        });

        activeModelUsed = modelUsed;
        totalPromptTokens += usage?.promptTokenCount || 0;
        totalCandidatesTokens += usage?.candidatesTokenCount || (usage?.totalTokenCount ? usage.totalTokenCount - (usage.promptTokenCount || 0) : 0);

        const cleanSolverText = (text || '').trim().replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
        const solvedArray: any[] = JSON.parse(cleanSolverText || '[]');
        const solvedMap = new Map<number, any>();
        for (const s of solvedArray) {
          if (typeof s.id === 'number') {
            solvedMap.set(s.id, s);
          }
        }

        // Compare each question with original generator answer key
        for (const originalQ of rawQuestions) {
          const qId = Number(originalQ.id ?? originalQ.questionNumber);
          const solvedItem = solvedMap.get(qId);
          const genAns = String(
            Array.isArray(originalQ.correctAnswer)
              ? originalQ.correctAnswer[0]
              : originalQ.correctAnswer || ''
          );
          const solAns = String(solvedItem?.solvedAnswer || 'NO_ANSWER_PROVIDED');
          let isMatch = compareAnswers(genAns, solAns, originalQ.acceptableAnswers);

          // Step 3: Check alternativeStrength for TFNG / YNNG items
          const isTfngOrYnng = ['true_false_not_given', 'yes_no_not_given'].includes(originalQ.type || originalQ.questionType);
          const altStrength = Number(solvedItem?.alternativeStrength || 0);

          let notes = isMatch ? 'Independent solver confirmed generator answer.' : 'Discrepancy detected between generator answer and independent solver derivation.';

          if (isTfngOrYnng && altStrength >= 2) {
            isMatch = false; // Flag item for human review if ambiguity score is 2 or higher
            notes = `FLAGGED (Ambiguity): Strongest alternative "${solvedItem?.strongestAlternative}" scored ${altStrength}/3 strength. Rationale: ${solvedItem?.alternativeRationale || solvedItem?.rationale}`;
          }

          allResults.push({
            qNum: qId,
            questionType: originalQ.type || originalQ.questionType || 'unknown',
            prompt: originalQ.prompt || originalQ.question || originalQ.statement || `Question ${qId}`,
            generatorAnswer: genAns,
            solverAnswer: solAns,
            solverEvidenceQuote: solvedItem?.passageEvidenceQuote || '',
            solverRationale: solvedItem?.rationale || '',
            strongestAlternative: solvedItem?.strongestAlternative,
            alternativeStrength: altStrength,
            alternativeRationale: solvedItem?.alternativeRationale,
            isMatch,
            notes
          });
        }
      } catch (err: any) {
        console.error(`[SecondPassSolver] Error solving passage ${pNum}:`, err);
        for (const originalQ of rawQuestions) {
          const qId = Number(originalQ.id ?? originalQ.questionNumber);
          allResults.push({
            qNum: qId,
            questionType: originalQ.type || 'reading',
            prompt: originalQ.prompt || `Question ${qId}`,
            generatorAnswer: String(originalQ.correctAnswer || ''),
            solverAnswer: 'SOLVER_ERROR',
            solverEvidenceQuote: '',
            solverRationale: `Solver execution warning: ${err?.message || 'Error'}`,
            isMatch: false,
            notes: 'Solver execution encountered an error.'
          });
        }
      }
    }

    const matchCount = allResults.filter((r) => r.isMatch).length;
    const mismatchCount = allResults.length - matchCount;
    const passed = mismatchCount === 0 && allResults.length > 0;

    return {
      solverModel: activeModelUsed,
      testedAt: Date.now(),
      passed,
      totalQuestions: allResults.length,
      matchCount,
      mismatchCount,
      needsReview: !passed,
      summary: passed
        ? `Independent solver (${activeModelUsed}) confirmed 100% agreement (${matchCount}/${allResults.length} questions).`
        : `Independent solver (${activeModelUsed}) detected ${mismatchCount} mismatch(es) out of ${allResults.length} questions. Item marked for human review.`,
      details: allResults,
      tokenUsage: {
        promptTokens: totalPromptTokens,
        candidatesTokens: totalCandidatesTokens,
        totalTokens: totalPromptTokens + totalCandidatesTokens
      }
    };
  }

  /**
   * Solves Writing prompt quality verification
   */
  public async solveWritingPromptQuality(writingDraft: any): Promise<SecondPassSolverReport> {
    const details: SolverQuestionResult[] = [];
    const tasks: Array<{ taskType: string; prompt: string; chartData?: any }> = [];

    if (writingDraft.task1) {
      tasks.push({
        taskType: 'Task 1',
        prompt: writingDraft.task1.prompt,
        chartData: writingDraft.task1.chartData
      });
    }
    if (writingDraft.task2) {
      tasks.push({
        taskType: 'Task 2',
        prompt: writingDraft.task2.prompt
      });
    }

    let mismatchCount = 0;
    let activeModel = this.solverModel;

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const solverPrompt = `Evaluate this IELTS ${task.taskType} prompt independently:
PROMPT:
"""
${task.prompt}
"""
${task.chartData ? `CHART DATA:\n${JSON.stringify(task.chartData, null, 2)}` : ''}

Verify:
1. Is the prompt 100% original (no Sprint/British Council reproduction)?
2. Does it clearly demand standard IELTS Band 9 response criteria (overview + key features for Task 1; clear position + supported arguments for Task 2)?
3. Are there any ambiguous, biased, or unsolvable instructions?`;

      try {
        const { text, modelUsed } = await this.generateWithFallback(solverPrompt, {
          systemInstruction: 'You are an independent IELTS Writing Task QA auditor. Review prompt validity and clarity.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isValid: { type: Type.BOOLEAN },
              clarityScore: { type: Type.NUMBER, description: '1 to 10 score' },
              isOriginal: { type: Type.BOOLEAN },
              feedback: { type: Type.STRING }
            },
            required: ['isValid', 'clarityScore', 'isOriginal', 'feedback']
          }
        });

        activeModel = modelUsed;
        const result = JSON.parse(text || '{}');
        const passed = Boolean(result.isValid && result.isOriginal && result.clarityScore >= 7);
        if (!passed) mismatchCount++;

        details.push({
          qNum: i + 1,
          questionType: task.taskType,
          prompt: task.prompt,
          generatorAnswer: 'Standard IELTS Writing Task specification',
          solverAnswer: passed ? 'PASSED_INDEPENDENT_AUDIT' : 'FLAGGED_NEEDS_REVIEW',
          solverEvidenceQuote: result.feedback || '',
          solverRationale: `Clarity: ${result.clarityScore}/10 | Original: ${result.isOriginal}`,
          isMatch: passed,
          notes: result.feedback
        });
      } catch (err: any) {
        mismatchCount++;
        details.push({
          qNum: i + 1,
          questionType: task.taskType,
          prompt: task.prompt,
          generatorAnswer: 'Valid',
          solverAnswer: 'ERROR',
          solverEvidenceQuote: '',
          solverRationale: String(err?.message),
          isMatch: false
        });
      }
    }

    const passed = mismatchCount === 0;
    return {
      solverModel: activeModel,
      testedAt: Date.now(),
      passed,
      totalQuestions: tasks.length,
      matchCount: tasks.length - mismatchCount,
      mismatchCount,
      needsReview: !passed,
      summary: passed
        ? `Independent writing task auditor confirmed prompt clarity and authenticity for all tasks.`
        : `Writing task auditor flagged ${mismatchCount} task(s) for human review.`,
      details
    };
  }

  /**
   * Solves Speaking question verification
   */
  public async solveSpeakingQuestionsQuality(speakingDraft: any): Promise<SecondPassSolverReport> {
    const details: SolverQuestionResult[] = [];
    const questions: string[] = [];

    if (speakingDraft.part1 && Array.isArray(speakingDraft.part1.questions)) {
      for (const q of speakingDraft.part1.questions) {
        if (typeof q === 'string') questions.push(q);
        else if (typeof q?.question === 'string') questions.push(q.question);
      }
    }

    let mismatchCount = 0;
    let activeModel = this.solverModel;

    for (let i = 0; i < questions.length; i++) {
      const qText = questions[i];
      const solverPrompt = `Audit this IELTS Speaking Part 1 question independently:
QUESTION: "${qText}"

Assess:
1. Is it a natural, conversational everyday question suitable for IELTS Speaking Part 1?
2. Is it 100% original and free of cultural bias or offensive material?
3. Can an IELTS candidate answer in 2-4 spoken sentences?`;

      try {
        const { text, modelUsed } = await this.generateWithFallback(solverPrompt, {
          systemInstruction: 'You are an independent IELTS Speaking Quality Auditor.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isSuitable: { type: Type.BOOLEAN },
              isOriginal: { type: Type.BOOLEAN },
              sampleBand9Response: { type: Type.STRING },
              assessmentNotes: { type: Type.STRING }
            },
            required: ['isSuitable', 'isOriginal', 'sampleBand9Response', 'assessmentNotes']
          }
        });

        activeModel = modelUsed;
        const res = JSON.parse(text || '{}');
        const passed = Boolean(res.isSuitable && res.isOriginal);
        if (!passed) mismatchCount++;

        details.push({
          qNum: i + 1,
          questionType: 'Speaking Part 1',
          prompt: qText,
          generatorAnswer: 'Authentic Part 1 Question',
          solverAnswer: passed ? 'PASSED_AUDIT' : 'REJECTED_AUDIT',
          solverEvidenceQuote: res.sampleBand9Response || '',
          solverRationale: res.assessmentNotes || '',
          isMatch: passed,
          notes: res.assessmentNotes
        });
      } catch (err: any) {
        mismatchCount++;
        details.push({
          qNum: i + 1,
          questionType: 'Speaking Part 1',
          prompt: qText,
          generatorAnswer: 'Authentic Part 1',
          solverAnswer: 'ERROR',
          solverEvidenceQuote: '',
          solverRationale: String(err?.message),
          isMatch: false
        });
      }
    }

    const passed = mismatchCount === 0;
    return {
      solverModel: activeModel,
      testedAt: Date.now(),
      passed,
      totalQuestions: questions.length,
      matchCount: questions.length - mismatchCount,
      mismatchCount,
      needsReview: !passed,
      summary: passed
        ? `Independent speaking auditor verified all ${questions.length} Part 1 questions as authentic and appropriate.`
        : `Independent speaking auditor flagged ${mismatchCount} question(s) for human review.`,
      details
    };
  }
}

export const secondPassSolver = new SecondPassSolver();
