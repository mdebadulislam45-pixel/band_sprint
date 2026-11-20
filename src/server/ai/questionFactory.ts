import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { AcademicReadingExamSchema } from './schemas/readingSchema.ts';
import { ListeningExamSchema } from './schemas/listeningSchema.ts';
import { WritingExamSchema } from './schemas/writingSchema.ts';
import { SpeakingExamSchema } from './schemas/speakingSchema.ts';
import {
  ACADEMIC_READING_SYSTEM_INSTRUCTION,
  buildAcademicReadingPrompt,
  buildRepairPrompt
} from './prompts/readingPrompts.ts';
import {
  LISTENING_SYSTEM_INSTRUCTION,
  buildListeningPrompt,
  buildListeningRepairPrompt
} from './prompts/listeningPrompts.ts';
import {
  ACADEMIC_WRITING_SYSTEM_INSTRUCTION,
  GENERAL_TRAINING_WRITING_SYSTEM_INSTRUCTION,
  buildWritingPrompt,
  buildWritingRepairPrompt
} from './prompts/writingPrompts.ts';
import {
  SPEAKING_SYSTEM_INSTRUCTION,
  buildSpeakingPrompt,
  buildSpeakingRepairPrompt
} from './prompts/speakingPrompts.ts';
import { validateAcademicReadingExam, validateListeningExam, validateWritingExam, validateSpeakingExam, type ValidationResult } from './validationEngine.ts';
import { serverDb, type AIDraftExam } from '../db.ts';
import { analyticsService } from '../analytics.ts';
import type { MockExamSet, ListeningSectionDetail, QuestionItem } from '../../data/mockExams.ts';

/**
 * Converts an AI-generated Academic Reading Draft Exam into the standard MockExamSet interface.
 */
export function convertAiDraftToReadingMockSet(draft: AIDraftExam): MockExamSet {
  const content = draft.content || {};
  const rawPassages = Array.isArray(content.passages) ? content.passages : [];
  const allQuestions: QuestionItem[] = [];

  const passageBlocks = rawPassages.map((p: any, idx: number) => {
    const pNum = (Number(p.passageNumber) || idx + 1) as 1 | 2 | 3;
    const rawQuestions: any[] = [];
    if (Array.isArray(p.questions)) {
      rawQuestions.push(...p.questions);
    } else if (Array.isArray(p.questionGroups)) {
      p.questionGroups.forEach((g: any) => {
        if (Array.isArray(g.questions)) {
          g.questions.forEach((q: any) => {
            rawQuestions.push({
              ...q,
              type: q.type || q.questionType || g.groupType,
              options: q.options || g.options || g.headingList || g.summaryWordBank
            });
          });
        }
      });
    }

    rawQuestions.forEach((q: any) => {
      allQuestions.push({
        id: Number(q.id ?? q.questionNumber ?? allQuestions.length + 1),
        section: 'reading',
        passage: pNum,
        type: (q.type || q.questionType || 'short_answer') as any,
        prompt: q.prompt || q.question || q.statement || '',
        options: Array.isArray(q.options) ? q.options : undefined,
        correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer,
        acceptableAnswers: Array.isArray(q.acceptableAnswers) ? q.acceptableAnswers : [],
        explanation: q.explanation || q.passageEvidence || q.evidenceQuote || ''
      });
    });

    const passageText = p.text || p.content || p.passageText || '';
    return `### Passage ${pNum}: ${p.title || ''}\n\n${passageText}`;
  });

  return {
    id: draft.id,
    title: content.title || `AI Pilot Academic Reading (${draft.id})`,
    source: `AI Question Factory (${draft.model || 'gemini-3.5-flash-lite'})`,
    badge: 'AI PILOT',
    level: 'B2-C1',
    format: 'Academic',
    listeningTitle: 'AI Pilot Listening (N/A)',
    listeningScript: '',
    readingTitle: content.title || 'AI Pilot Academic Reading',
    readingPassage: passageBlocks.join('\n\n---\n\n'),
    writingPrompt: '',
    modelEssay: '',
    questions: allQuestions
  };
}

/**
 * Verifies strict candidate pilot retrieval gates (Phase 5.5H.12F.2 — HIGH-02 & Phase 5.5H.12F.4).
 * Enforces exact module examType, APPROVED status (never treating PENDING_REVIEW or failed/in-progress
 * states as candidate-approved), PASSED or REPAIRED validationStatus, and well-formed module content.
 */
export function verifyCandidatePilotDraftEligibility(
  draft: AIDraftExam | null | undefined,
  expectedExamType: AIDraftExam['examType']
): { eligible: boolean; httpStatus: number; code?: string; error?: string } {
  if (!draft) {
    return { eligible: false, httpStatus: 404, code: 'DRAFT_NOT_FOUND', error: 'Draft exam not found.' };
  }

  if (draft.examType !== expectedExamType) {
    return {
      eligible: false,
      httpStatus: 400,
      code: 'MODULE_MISMATCH',
      error: `Draft module mismatch. Expected "${expectedExamType}" draft.`
    };
  }

  if (draft.status !== 'APPROVED') {
    return {
      eligible: false,
      httpStatus: 400,
      code: 'DRAFT_NOT_APPROVED',
      error: `Draft exam is in status "${draft.status}" and is not approved for candidate pilot practice. Only APPROVED drafts may be retrieved.`
    };
  }

  if (draft.validationStatus !== 'PASSED' && draft.validationStatus !== 'REPAIRED') {
    return {
      eligible: false,
      httpStatus: 400,
      code: 'VALIDATION_NOT_PASSED',
      error: `Draft exam validationStatus is "${draft.validationStatus}". Candidate pilot retrieval requires PASSED or REPAIRED validation.`
    };
  }

  const content = draft.content;
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return {
      eligible: false,
      httpStatus: 400,
      code: 'INVALID_DRAFT_CONTENT',
      error: 'Draft exam contains missing or malformed content.'
    };
  }

  let contentValid = false;
  if (expectedExamType === 'academic_reading') {
    if (Array.isArray(content.passages) && content.passages.length > 0) {
      contentValid = content.passages.every((p: any) => {
        const hasText = typeof (p?.text || p?.content || p?.passageText) === 'string' &&
          Boolean((p?.text || p?.content || p?.passageText).trim());
        const directQs = Array.isArray(p?.questions) ? p.questions.length : 0;
        const groupQs = Array.isArray(p?.questionGroups)
          ? p.questionGroups.reduce((acc: number, g: any) => acc + (Array.isArray(g?.questions) ? g.questions.length : 0), 0)
          : 0;
        return hasText && (directQs + groupQs > 0);
      });
    }
  } else if (expectedExamType === 'listening') {
    if (Array.isArray(content.sections) && content.sections.length > 0) {
      contentValid = content.sections.every((s: any) => {
        const hasScript = typeof (s?.script || s?.transcript) === 'string' &&
          Boolean((s?.script || s?.transcript).trim());
        const directQs = Array.isArray(s?.questions) ? s.questions.length : 0;
        const groupQs = Array.isArray(s?.questionGroups)
          ? s.questionGroups.reduce((acc: number, g: any) => acc + (Array.isArray(g?.questions) ? g.questions.length : 0), 0)
          : 0;
        return hasScript && (directQs + groupQs > 0);
      });
    }
  } else if (expectedExamType === 'writing') {
    contentValid =
      Boolean(content.task1 && typeof content.task1.prompt === 'string' && content.task1.prompt.trim()) &&
      Boolean(content.task2 && typeof content.task2.prompt === 'string' && content.task2.prompt.trim());
  } else if (expectedExamType === 'speaking') {
    const p1Groups = content.part1?.topicGroups;
    const p2 = content.part2;
    const p3Themes = content.part3?.themes;
    const p1HasQuestions =
      Array.isArray(p1Groups) &&
      p1Groups.length > 0 &&
      p1Groups.every((g: any) => Array.isArray(g?.questions) && g.questions.length > 0 && g.questions.every((q: any) => typeof q?.prompt === 'string' && q.prompt.trim()));
    const p2Valid =
      Boolean(p2 && typeof p2.topic === 'string' && p2.topic.trim()) &&
      Array.isArray(p2?.bulletPrompts) &&
      p2.bulletPrompts.length > 0;
    const p3HasQuestions =
      Array.isArray(p3Themes) &&
      p3Themes.length > 0 &&
      p3Themes.every((t: any) => Array.isArray(t?.questions) && t.questions.length > 0 && t.questions.every((q: any) => typeof q?.prompt === 'string' && q.prompt.trim()));
    contentValid = p1HasQuestions && p2Valid && p3HasQuestions;
  }

  if (!contentValid) {
    return {
      eligible: false,
      httpStatus: 400,
      code: 'INVALID_DRAFT_CONTENT',
      error: `Draft exam contains incomplete or malformed ${expectedExamType} content.`
    };
  }

  return { eligible: true, httpStatus: 200 };
}

/**
 * Canonical set of recognized AI Question Factory module examType identifiers (Phase 5.5H.12F.3).
 */
export const RECOGNIZED_FACTORY_EXAM_TYPES = new Set<AIDraftExam['examType']>([
  'academic_reading',
  'listening',
  'writing',
  'speaking'
]);

/**
 * Executes the exact module-specific structural validator on a stored AI draft's content.
 * Returns null if the draft is missing or does not belong to one of the four recognized factory modules.
 */
export function runModuleValidatorForDraft(
  draft: Pick<AIDraftExam, 'examType' | 'content'> | null | undefined
): ValidationResult | null {
  if (!draft || !RECOGNIZED_FACTORY_EXAM_TYPES.has(draft.examType)) {
    return null;
  }
  switch (draft.examType) {
    case 'academic_reading':
      return validateAcademicReadingExam(draft.content);
    case 'listening':
      return validateListeningExam(draft.content);
    case 'writing':
      return validateWritingExam(draft.content);
    case 'speaking':
      return validateSpeakingExam(draft.content);
    default:
      return null;
  }
}

/**
 * Normalizes an admin module filter string ('ALL', 'reading', 'academic_reading', 'listening', 'writing', 'speaking').
 */
export function normalizeAdminDraftModuleFilter(rawModule: unknown): {
  valid: boolean;
  examType: AIDraftExam['examType'] | 'ALL';
} {
  if (rawModule === undefined || rawModule === null || rawModule === '') {
    return { valid: true, examType: 'ALL' };
  }
  if (typeof rawModule !== 'string') {
    return { valid: false, examType: 'ALL' };
  }
  const clean = rawModule.trim().toLowerCase();
  if (!clean || clean === 'all') {
    return { valid: true, examType: 'ALL' };
  }
  if (clean === 'reading' || clean === 'academic_reading') {
    return { valid: true, examType: 'academic_reading' };
  }
  if (clean === 'listening') {
    return { valid: true, examType: 'listening' };
  }
  if (clean === 'writing') {
    return { valid: true, examType: 'writing' };
  }
  if (clean === 'speaking') {
    return { valid: true, examType: 'speaking' };
  }
  return { valid: false, examType: 'ALL' };
}

/**
 * Sanitizes and length-limits an optional admin rejection reason (Phase 5.5H.12F.3).
 */
export function sanitizeRejectionReason(
  rawReason: unknown,
  maxLength = 300
): { valid: boolean; sanitized?: string; error?: string } {
  if (rawReason === undefined || rawReason === null || rawReason === '') {
    return { valid: true, sanitized: undefined };
  }
  if (typeof rawReason !== 'string') {
    return { valid: false, error: 'Rejection reason must be a string.' };
  }
  const cleaned = rawReason
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, Math.max(1, maxLength));

  return {
    valid: true,
    sanitized: cleaned.length > 0 ? cleaned : undefined
  };
}

/**
 * Converts an AI-generated Listening Draft Exam into the standard MockExamSet interface
 * used by CD-IELTS evaluation engines and test player components.
 */
export function convertAiDraftToListeningMockSet(draft: AIDraftExam): MockExamSet {
  const content = draft.content || {};
  const rawSections = Array.isArray(content.sections) ? content.sections : [];

  const listeningSectionsMap: Record<1 | 2 | 3 | 4, ListeningSectionDetail> = {
    1: { sectionNumber: 1, title: 'Section 1 (Dialogue / Social Context)', isAvailable: false },
    2: { sectionNumber: 2, title: 'Section 2 (Monologue / Social Context)', isAvailable: false },
    3: { sectionNumber: 3, title: 'Section 3 (Academic Discussion / Study Group)', isAvailable: false },
    4: { sectionNumber: 4, title: 'Section 4 (Academic Lecture / Presentation)', isAvailable: false },
  };

  const allQuestions: QuestionItem[] = [];

  rawSections.forEach((sec: any, idx: number) => {
    const secNum = (sec.sectionNumber || (idx + 1)) as 1 | 2 | 3 | 4;
    const scriptText = sec.script || sec.transcript || '';
    listeningSectionsMap[secNum] = {
      sectionNumber: secNum,
      title: sec.title || `Section ${secNum}`,
      isAvailable: true,
      script: scriptText,
    };

    const rawQuestions: any[] = [];
    if (Array.isArray(sec.questions)) {
      rawQuestions.push(...sec.questions);
    } else if (Array.isArray(sec.questionGroups)) {
      sec.questionGroups.forEach((g: any) => {
        if (Array.isArray(g.questions)) {
          g.questions.forEach((q: any) => {
            rawQuestions.push({
              ...q,
              type: q.type || q.questionType || g.groupType,
              options: q.options || g.options
            });
          });
        }
      });
    }

    rawQuestions.forEach((q: any) => {
      allQuestions.push({
        id: Number(q.id ?? q.questionNumber ?? allQuestions.length + 1),
        section: 'listening',
        type: (q.type || q.questionType || 'short_answer') as any,
        prompt: q.prompt || q.question || q.statement || '',
        options: Array.isArray(q.options) ? q.options : undefined,
        correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer,
        acceptableAnswers: Array.isArray(q.acceptableAnswers) ? q.acceptableAnswers : [],
        explanation: q.explanation || q.scriptEvidence || q.evidenceQuote || ''
      });
    });
  });

  const sec1Script = listeningSectionsMap[1]?.script || '';
  const sec1Title = listeningSectionsMap[1]?.title || 'Section 1 Dialogue';

  return {
    id: draft.id,
    title: content.title || `AI Pilot Academic Listening (${draft.id})`,
    source: `AI Question Factory (${draft.model || 'gemini-3.5-flash-lite'})`,
    badge: 'AI PILOT',
    level: 'B2-C1',
    format: 'Academic',
    listeningTitle: sec1Title,
    listeningScript: sec1Script,
    listeningSections: listeningSectionsMap,
    readingTitle: 'AI Pilot Reading (N/A)',
    readingPassage: '',
    writingPrompt: '',
    modelEssay: '',
    questions: allQuestions
  };
}

/**
 * Converts an AI-generated Writing Draft Exam into the standard MockExamSet interface
 * used by CD-IELTS evaluation engines and test player components.
 */
export function convertAiDraftToWritingMockSet(draft: AIDraftExam): MockExamSet & { task1?: any; task2?: any; topicDomain?: string; difficulty?: string } {
  const content = draft.content || {};
  const task1 = content.task1 || {};
  const task2 = content.task2 || {};

  return {
    id: draft.id,
    title: content.title || `AI Pilot Writing Exam (${draft.id})`,
    source: `AI Question Factory (${draft.model || 'gemini-3.5-flash-lite'})`,
    badge: 'AI PILOT',
    level: 'B2-C1',
    format: (content.format || 'Academic') as 'Academic' | 'General Training',
    difficulty: content.difficulty || 'Band 6.5 - 7.5',
    topicDomain: content.topicDomain || 'General',
    listeningTitle: '',
    listeningScript: '',
    readingTitle: '',
    readingPassage: '',
    task1Type: task1.task1Type || task1.questionType || (content.format === 'General Training' ? 'letter' : 'chart'),
    task1Prompt: task1.prompt || '',
    task1Model: task1.sampleResponse || '',
    writingPrompt: task2.prompt || task2.questionText || '',
    modelEssay: task2.sampleResponse || '',
    task1,
    task2,
    questions: []
  };
}

/**
 * Converts an AI-generated Speaking Draft Exam into a candidate-compatible Speaking data structure.
 */
export function convertAiDraftToSpeakingMockSet(draft: AIDraftExam): any {
  if (!draft || draft.status === 'VALIDATION_FAILED' || !draft.content) {
    throw new Error(`Cannot convert invalid or failed Speaking draft (${draft?.id || 'unknown'}).`);
  }

  const content = draft.content || {};
  const part1 = content.part1 || { topicGroups: [] };
  const part2 = content.part2 || {};
  const part3 = content.part3 || { themes: [] };

  return {
    id: draft.id,
    examId: content.examId || draft.id,
    title: content.title || `AI Pilot Speaking Exam (${draft.id})`,
    source: `AI Question Factory (${draft.model || 'gemini-3.5-flash-lite'})`,
    badge: 'AI PILOT',
    format: content.format || 'Academic',
    difficulty: content.difficulty || 'Standard',
    topicDomain: content.topicDomain || 'General',
    isAiPilot: true,
    part1: {
      topicGroups: (part1.topicGroups || []).map((tg: any) => ({
        topicId: tg.topicId,
        title: tg.title,
        questions: (tg.questions || []).map((q: any) => ({
          id: q.id,
          prompt: q.prompt
        }))
      }))
    },
    part2: {
      id: part2.id || 'q_p2_cue_01',
      topic: part2.topic || '',
      instructions: part2.instructions || '',
      bulletPrompts: Array.isArray(part2.bulletPrompts) ? part2.bulletPrompts : [],
      preparationTimeSeconds: part2.preparationTimeSeconds || 60,
      speakingTimeSeconds: part2.speakingTimeSeconds || 120,
      roundingOffQuestion: part2.roundingOffQuestion || '',
      examinerIntro: part2.examinerIntro || ''
    },
    part3: {
      themes: (part3.themes || []).map((th: any) => ({
        themeId: th.themeId,
        title: th.title,
        connectedPart2Theme: th.connectedPart2Theme,
        questions: (th.questions || []).map((q: any) => ({
          id: q.id,
          prompt: q.prompt,
          examinerProbeNotes: q.examinerProbeNotes || ''
        }))
      }))
    }
  };
}

export function normalizeSpeakingFormat(rawFormat?: string): 'Academic' | 'General Training' {
  if (!rawFormat || typeof rawFormat !== 'string' || !rawFormat.trim()) {
    return 'Academic';
  }
  const clean = rawFormat.trim().toUpperCase();
  if (clean === 'ACADEMIC' || clean === 'ACADEMIC MODULE') {
    return 'Academic';
  }
  if (clean === 'GENERAL_TRAINING' || clean === 'GENERAL TRAINING' || clean === 'GENERAL') {
    return 'General Training';
  }
  if (rawFormat === 'Academic' || rawFormat === 'General Training') {
    return rawFormat;
  }
  throw new Error(`Invalid format "${rawFormat}". Allowed values are 'ACADEMIC' ('Academic') or 'GENERAL_TRAINING' ('General Training').`);
}

export function normalizeSpeakingDifficulty(rawDifficulty?: string): 'Standard' | 'Challenging' {
  if (!rawDifficulty || typeof rawDifficulty !== 'string' || !rawDifficulty.trim()) {
    return 'Standard';
  }
  const clean = rawDifficulty.trim().toUpperCase();
  if (clean === 'BAND_6_5' || clean === 'STANDARD') {
    return 'Standard';
  }
  if (clean === 'BAND_7_5' || clean === 'BAND_8_5' || clean === 'CHALLENGING') {
    return 'Challenging';
  }
  if (rawDifficulty === 'Standard' || rawDifficulty === 'Challenging') {
    return rawDifficulty;
  }
  throw new Error(`Invalid difficulty "${rawDifficulty}". Allowed values are 'BAND_6_5' ('Standard'), 'BAND_7_5' / 'BAND_8_5' ('Challenging').`);
}

export function sanitizeDiagnosticErrorMessage(err: any): string {
  const errName = typeof err?.name === 'string' && err.name.trim() ? err.name.trim() : 'GenerationError';
  const rawMessage = typeof err?.message === 'string'
    ? err.message
    : typeof err === 'string'
      ? err
      : 'Internal generation error';

  const redacted = rawMessage
    .replace(/AIza[0-9A-Za-z\-_]{10,}/g, '[REDACTED_API_KEY]')
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9\-._~+/]+=*/gi, '$1 [REDACTED_TOKEN]')
    .replace(/\b(?:sk|pk|rk|whsec|ghp|xox[baprs])_[0-9A-Za-z_]+/gi, '[REDACTED_SECRET]')
    .replace(/\bsess_[0-9A-Za-z_]+/g, '[REDACTED_SESSION]')
    .replace(
      /\b(api[_-]?key|apikey|secret[_-]?key|access[_-]?token|session[_-]?token|refresh[_-]?token|client[_-]?secret|password|secret|token|credential|authorization|key)\s*([=:])\s*([^\s,;'"&]+)/gi,
      '$1$2[REDACTED]'
    )
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
    .slice(0, 240);

  return `[${errName}] ${redacted}`;
}

/**
 * Builds a deterministic, privacy-safe SHA-256 deduplication key for in-flight AI factory requests
 * scoped strictly by authenticated userId, moduleId, and normalized generation parameters.
 */
export function buildFactoryGenerationDedupeKey(params: {
  userId: string;
  moduleId: 'reading' | 'listening' | 'writing' | 'speaking';
  format?: string;
  topicSeed?: string;
  task1Type?: string;
  essayType?: string;
  difficulty?: string;
}): string {
  const canonicalPayload = JSON.stringify({
    userId: String(params.userId || '').trim(),
    moduleId: params.moduleId,
    format: String(params.format || 'Academic').trim().toUpperCase(),
    topicSeed: String(params.topicSeed || '').trim().toLowerCase(),
    task1Type: String(params.task1Type || '').trim().toLowerCase(),
    essayType: String(params.essayType || '').trim().toLowerCase(),
    difficulty: String(params.difficulty || '').trim().toUpperCase()
  });
  const hash = crypto.createHash('sha256').update(canonicalPayload).digest('hex');
  return `fgen_${params.userId}_${params.moduleId}_${hash}`;
}

export const inFlightFactoryGenerations = new Map<
  string,
  {
    promise: Promise<{ draft: AIDraftExam; validation: ValidationResult }>;
    startedAt: number;
  }
>();

/**
 * Server-side AI Question Factory for IELTS SPRINT
 * Orchestrates generation, structured schema compliance, independent validation, and retry repairs.
 */
export class AIQuestionFactory {
  private ai: GoogleGenAI | null = null;
  public requestTimeoutMs = 45_000;
  public totalRetryBudgetMs = 120_000;
  public retryBaseDelayMs = 2_000;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    }
  }

  private getClient(): GoogleGenAI {
    if (!this.ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is missing from environment. Cannot initialize AI Question Factory.');
      }
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    }
    return this.ai;
  }

  protected async invokeGeminiGenerateContent(params: {
    model: string;
    contents: string;
    config: any;
  }): Promise<any> {
    const aiClient = this.getClient();
    return await aiClient.models.generateContent(params);
  }

  private createTimeoutError(timeoutMs: number): Error {
    const err = new Error(`Upstream AI generation timed out after ${timeoutMs}ms.`);
    err.name = 'GeminiTimeoutError';
    return err;
  }

  private async withFiniteTimeout<T>(
    operation: (abortSignal: AbortSignal) => Promise<T>,
    timeoutMs: number,
    parentSignal?: AbortSignal
  ): Promise<T> {
    const boundedMs = Math.max(1, Math.floor(timeoutMs));
    const abortController = new AbortController();
    let timeoutHandle: NodeJS.Timeout | null = null;

    const onParentAbort = () => {
      try {
        abortController.abort(parentSignal?.reason || this.createTimeoutError(boundedMs));
      } catch {
        // Ignore abort listener errors
      }
    };

    if (parentSignal) {
      if (parentSignal.aborted) {
        onParentAbort();
      } else {
        parentSignal.addEventListener('abort', onParentAbort, { once: true });
      }
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        const timeoutErr = this.createTimeoutError(boundedMs);
        try {
          abortController.abort(timeoutErr);
        } catch {
          // Ignore abort listener errors
        }
        reject(timeoutErr);
      }, boundedMs);
    });

    try {
      return await Promise.race([operation(abortController.signal), timeoutPromise]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      if (parentSignal) {
        parentSignal.removeEventListener('abort', onParentAbort);
      }
    }
  }

  private async callGeminiWithRetry(
    params: {
      model: string;
      contents: string;
      config: any;
    },
    maxRetries = 3,
    operationDeadlineMs?: number,
    parentSignal?: AbortSignal
  ): Promise<any> {
    const deadlineMs =
      typeof operationDeadlineMs === 'number' && Number.isFinite(operationDeadlineMs)
        ? operationDeadlineMs
        : Date.now() + this.totalRetryBudgetMs;
    let attempt = 0;

    while (true) {
      const remainingBudget = deadlineMs - Date.now();
      if (remainingBudget <= 0 || parentSignal?.aborted) {
        throw this.createTimeoutError(this.totalRetryBudgetMs);
      }

      const attemptTimeoutMs = Math.min(this.requestTimeoutMs, remainingBudget);

      try {
        return await this.withFiniteTimeout(
          (abortSignal) =>
            this.invokeGeminiGenerateContent({
              ...params,
              config: params.config ? { ...params.config, abortSignal } : { abortSignal }
            }),
          attemptTimeoutMs,
          parentSignal
        );
      } catch (err: any) {
        if (err?.name === 'AbortError' || parentSignal?.aborted || deadlineMs - Date.now() <= 0) {
          throw err?.name === 'GeminiTimeoutError' ? err : this.createTimeoutError(attemptTimeoutMs);
        }
        attempt++;
        const status = err?.status || err?.code;
        const isTransient =
          status === 503 ||
          status === 429 ||
          err?.message?.includes('503') ||
          err?.message?.includes('high demand');

        if (isTransient && attempt <= maxRetries) {
          const delayMs = attempt * this.retryBaseDelayMs;
          const remainingAfterFailure = deadlineMs - Date.now();
          if (remainingAfterFailure <= delayMs) {
            throw this.createTimeoutError(this.totalRetryBudgetMs);
          }
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        throw err;
      }
    }
  }

  private async callGeminiWithTimeoutBoundary(
    params: {
      model: string;
      contents: string;
      config: any;
    },
    maxRetries = 3,
    operationDeadlineMs?: number
  ): Promise<any> {
    const deadlineMs =
      typeof operationDeadlineMs === 'number' && Number.isFinite(operationDeadlineMs)
        ? operationDeadlineMs
        : Date.now() + this.totalRetryBudgetMs;
    const remainingBudget = deadlineMs - Date.now();
    if (remainingBudget <= 0) {
      throw this.createTimeoutError(this.totalRetryBudgetMs);
    }
    const boundaryTimeoutMs = Math.max(
      1,
      Math.min(this.requestTimeoutMs * (maxRetries + 1), remainingBudget)
    );
    return await this.withFiniteTimeout(
      (boundarySignal) => this.callGeminiWithRetry(params, maxRetries, deadlineMs, boundarySignal),
      boundaryTimeoutMs
    );
  }

  private async runWithInFlightDeduplication(
    dedupeKey: string,
    executor: () => Promise<{ draft: AIDraftExam; validation: ValidationResult }>
  ): Promise<{ draft: AIDraftExam; validation: ValidationResult }> {
    const existing = inFlightFactoryGenerations.get(dedupeKey);
    if (existing) {
      return await existing.promise;
    }

    const now = Date.now();
    const promise = executor().finally(() => {
      const current = inFlightFactoryGenerations.get(dedupeKey);
      if (current && current.promise === promise) {
        inFlightFactoryGenerations.delete(dedupeKey);
      }
    });

    inFlightFactoryGenerations.set(dedupeKey, { promise, startedAt: now });
    return await promise;
  }

  /**
   * Generates a complete 3-passage 40-question IELTS Academic Reading Practice Draft
   */
  public async generateAcademicReadingPilot(params: {
    userId: string;
    topicSeed?: string;
  }): Promise<{ draft: AIDraftExam; validation: ValidationResult }> {
    const dedupeKey = buildFactoryGenerationDedupeKey({
      userId: params.userId,
      moduleId: 'reading',
      format: 'Academic',
      topicSeed: params.topicSeed
    });

    return await this.runWithInFlightDeduplication(dedupeKey, async () => {
      const now = Date.now();
      const operationDeadlineMs = now + this.totalRetryBudgetMs;
      let isOperationTerminal = false;
      const draftId = `draft_reading_${now}_${Math.random().toString(36).substring(2, 8)}`;

      const draftRecord: AIDraftExam = {
        id: draftId,
        createdAt: now,
        updatedAt: now,
        userId: params.userId,
        model: 'gemini-3.8-flash',
        examType: 'academic_reading',
        status: 'GENERATING',
        validationStatus: 'FAILED',
        repairAttempts: 0,
        validationFindings: {
          passed: false,
          structuralOk: false,
          answersOk: false,
          evidenceOk: false,
          qualityOk: false,
          errors: [],
          warnings: []
        }
      };

      serverDb.saveAiDraftExam({ ...draftRecord });

      let rawExamPayload: any = null;
      let tokenUsage: { promptTokens?: number; completionTokens?: number; totalTokens?: number; thoughtsTokens?: number } = {};
      let repairAttempts = 0;
      const maxRepairs = 3;

      try {
        const initialPrompt = buildAcademicReadingPrompt(params.topicSeed);
        const response = await this.callGeminiWithTimeoutBoundary(
          {
            model: 'gemini-3.8-flash',
            contents: initialPrompt,
            config: {
              systemInstruction: ACADEMIC_READING_SYSTEM_INSTRUCTION,
              responseMimeType: 'application/json',
              responseSchema: AcademicReadingExamSchema
            }
          },
          3,
          operationDeadlineMs
        );

        if (isOperationTerminal || Date.now() > operationDeadlineMs) {
          throw this.createTimeoutError(this.totalRetryBudgetMs);
        }

        if (response.usageMetadata) {
          tokenUsage = {
            promptTokens: response.usageMetadata.promptTokenCount,
            completionTokens: response.usageMetadata.candidatesTokenCount,
            totalTokens: response.usageMetadata.totalTokenCount,
            ...(typeof response.usageMetadata.thoughtsTokenCount === 'number'
              ? { thoughtsTokens: response.usageMetadata.thoughtsTokenCount }
              : {})
          };
        }

        const rawText = (response.text || '').trim();
        rawExamPayload = JSON.parse(rawText || '{}');

        draftRecord.status = 'VALIDATING';
        serverDb.saveAiDraftExam({ ...draftRecord });

        let validation = validateAcademicReadingExam(rawExamPayload);

        while (!validation.passed && repairAttempts < maxRepairs) {
          if (isOperationTerminal || Date.now() >= operationDeadlineMs) {
            throw this.createTimeoutError(this.totalRetryBudgetMs);
          }
          repairAttempts++;

          const repairPrompt = buildRepairPrompt(rawExamPayload, validation.errors);
          const repairResponse = await this.callGeminiWithTimeoutBoundary(
            {
              model: 'gemini-3.8-flash',
              contents: repairPrompt,
              config: {
                systemInstruction: ACADEMIC_READING_SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
                responseSchema: AcademicReadingExamSchema
              }
            },
            3,
            operationDeadlineMs
          );

          if (isOperationTerminal || Date.now() > operationDeadlineMs) {
            throw this.createTimeoutError(this.totalRetryBudgetMs);
          }

          if (repairResponse.usageMetadata) {
            if (typeof repairResponse.usageMetadata.promptTokenCount === 'number') {
              tokenUsage.promptTokens = (tokenUsage.promptTokens || 0) + repairResponse.usageMetadata.promptTokenCount;
            }
            if (typeof repairResponse.usageMetadata.candidatesTokenCount === 'number') {
              tokenUsage.completionTokens = (tokenUsage.completionTokens || 0) + repairResponse.usageMetadata.candidatesTokenCount;
            }
            if (typeof repairResponse.usageMetadata.totalTokenCount === 'number') {
              tokenUsage.totalTokens = (tokenUsage.totalTokens || 0) + repairResponse.usageMetadata.totalTokenCount;
            }
            if (typeof repairResponse.usageMetadata.thoughtsTokenCount === 'number') {
              tokenUsage.thoughtsTokens = (tokenUsage.thoughtsTokens || 0) + repairResponse.usageMetadata.thoughtsTokenCount;
            }
          }

          const repairText = (repairResponse.text || '').trim();
          rawExamPayload = JSON.parse(repairText || '{}');
          validation = validateAcademicReadingExam(rawExamPayload);
        }

        if (isOperationTerminal || Date.now() > operationDeadlineMs) {
          throw this.createTimeoutError(this.totalRetryBudgetMs);
        }
        isOperationTerminal = true;

        draftRecord.updatedAt = Date.now();
        draftRecord.repairAttempts = repairAttempts;
        draftRecord.tokenUsage = tokenUsage;
        draftRecord.content = rawExamPayload;

        draftRecord.validationFindings = {
          passed: validation.passed,
          structuralOk: validation.structuralOk,
          answersOk: validation.answersOk,
          evidenceOk: validation.evidenceOk,
          qualityOk: validation.qualityOk,
          errors: validation.errors,
          warnings: validation.warnings
        };

        if (validation.passed) {
          draftRecord.status = 'PENDING_REVIEW';
          draftRecord.validationStatus = repairAttempts > 0 ? 'REPAIRED' : 'PASSED';
        } else {
          draftRecord.status = 'VALIDATION_FAILED';
          draftRecord.validationStatus = 'FAILED';
        }

        const savedDraft = serverDb.saveAiDraftExam({ ...draftRecord });

        try {
          analyticsService.recordFactoryOperationalEvent({
            eventType: validation.passed ? 'ai_generation_completed' : 'ai_generation_failed',
            payload: {
              moduleId: 'reading',
              format: 'Academic',
              success: validation.passed,
              status: savedDraft.status,
              validationStatus: savedDraft.validationStatus,
              repairAttempts,
              durationMs: Date.now() - now,
              tokenUsage: tokenUsage?.totalTokens ? tokenUsage : undefined
            },
            userId: params.userId
          });
        } catch (telemetryErr) {
        }

        return { draft: savedDraft, validation };
      } catch (err: any) {
        if (!isOperationTerminal) {
          isOperationTerminal = true;
          const safeDiagnostic = sanitizeDiagnosticErrorMessage(err);
          console.error('[QuestionFactory] Reading generation error:', safeDiagnostic);
          const terminalStatus = err?.name === 'GeminiTimeoutError' ? 'FAILED' : 'VALIDATION_FAILED';
          draftRecord.status = terminalStatus;
          draftRecord.validationStatus = 'FAILED';
          draftRecord.validationFindings.errors.push(`System Error: ${safeDiagnostic}`);
          draftRecord.updatedAt = Date.now();
          serverDb.saveAiDraftExam({ ...draftRecord });

          try {
            analyticsService.recordFactoryOperationalEvent({
              eventType: 'ai_generation_failed',
              payload: {
                moduleId: 'reading',
                format: 'Academic',
                success: false,
                status: terminalStatus,
                validationStatus: 'FAILED',
                repairAttempts,
                durationMs: Date.now() - now,
                sanitizedErrorCategory: err?.name || 'GenerationError'
              },
              userId: params.userId
            });
          } catch (telemetryErr) {
          }
        }

        throw err;
      }
    });
  }

  /**
   * Generates a complete 4-section 40-question IELTS Listening Practice Draft
   */
  public async generateListeningPilot(params: {
    userId: string;
    topicSeed?: string;
  }): Promise<{ draft: AIDraftExam; validation: ValidationResult }> {
    const dedupeKey = buildFactoryGenerationDedupeKey({
      userId: params.userId,
      moduleId: 'listening',
      format: 'Academic',
      topicSeed: params.topicSeed
    });

    return await this.runWithInFlightDeduplication(dedupeKey, async () => {
      const now = Date.now();
      const operationDeadlineMs = now + this.totalRetryBudgetMs;
      let isOperationTerminal = false;
      const draftId = `draft_listening_${now}_${Math.random().toString(36).substring(2, 8)}`;

      const draftRecord: AIDraftExam = {
        id: draftId,
        createdAt: now,
        updatedAt: now,
        userId: params.userId,
        model: 'gemini-3.8-flash',
        examType: 'listening',
        status: 'GENERATING',
        validationStatus: 'FAILED',
        repairAttempts: 0,
        validationFindings: {
          passed: false,
          structuralOk: false,
          answersOk: false,
          evidenceOk: false,
          qualityOk: false,
          errors: [],
          warnings: []
        }
      };

      serverDb.saveAiDraftExam({ ...draftRecord });

      let rawExamPayload: any = null;
      let tokenUsage: { promptTokens?: number; completionTokens?: number; totalTokens?: number; thoughtsTokens?: number } = {};
      let repairAttempts = 0;
      const maxRepairs = 3;

      try {
        const initialPrompt = buildListeningPrompt(params.topicSeed);
        const response = await this.callGeminiWithTimeoutBoundary(
          {
            model: 'gemini-3.8-flash',
            contents: initialPrompt,
            config: {
              systemInstruction: LISTENING_SYSTEM_INSTRUCTION,
              responseMimeType: 'application/json',
              responseSchema: ListeningExamSchema
            }
          },
          3,
          operationDeadlineMs
        );

        if (isOperationTerminal || Date.now() > operationDeadlineMs) {
          throw this.createTimeoutError(this.totalRetryBudgetMs);
        }

        if (response.usageMetadata) {
          tokenUsage = {
            promptTokens: response.usageMetadata.promptTokenCount,
            completionTokens: response.usageMetadata.candidatesTokenCount,
            totalTokens: response.usageMetadata.totalTokenCount,
            ...(typeof response.usageMetadata.thoughtsTokenCount === 'number'
              ? { thoughtsTokens: response.usageMetadata.thoughtsTokenCount }
              : {})
          };
        }

        const rawText = (response.text || '').trim();
        rawExamPayload = JSON.parse(rawText || '{}');

        draftRecord.status = 'VALIDATING';
        serverDb.saveAiDraftExam({ ...draftRecord });

        let validation = validateListeningExam(rawExamPayload);

        while (!validation.passed && repairAttempts < maxRepairs) {
          if (isOperationTerminal || Date.now() >= operationDeadlineMs) {
            throw this.createTimeoutError(this.totalRetryBudgetMs);
          }
          repairAttempts++;

          const repairPrompt = buildListeningRepairPrompt(rawExamPayload, validation.errors);
          const repairResponse = await this.callGeminiWithTimeoutBoundary(
            {
              model: 'gemini-3.8-flash',
              contents: repairPrompt,
              config: {
                systemInstruction: LISTENING_SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
                responseSchema: ListeningExamSchema
              }
            },
            3,
            operationDeadlineMs
          );

          if (isOperationTerminal || Date.now() > operationDeadlineMs) {
            throw this.createTimeoutError(this.totalRetryBudgetMs);
          }

          if (repairResponse.usageMetadata) {
            if (typeof repairResponse.usageMetadata.promptTokenCount === 'number') {
              tokenUsage.promptTokens = (tokenUsage.promptTokens || 0) + repairResponse.usageMetadata.promptTokenCount;
            }
            if (typeof repairResponse.usageMetadata.candidatesTokenCount === 'number') {
              tokenUsage.completionTokens = (tokenUsage.completionTokens || 0) + repairResponse.usageMetadata.candidatesTokenCount;
            }
            if (typeof repairResponse.usageMetadata.totalTokenCount === 'number') {
              tokenUsage.totalTokens = (tokenUsage.totalTokens || 0) + repairResponse.usageMetadata.totalTokenCount;
            }
            if (typeof repairResponse.usageMetadata.thoughtsTokenCount === 'number') {
              tokenUsage.thoughtsTokens = (tokenUsage.thoughtsTokens || 0) + repairResponse.usageMetadata.thoughtsTokenCount;
            }
          }

          const repairText = (repairResponse.text || '').trim();
          rawExamPayload = JSON.parse(repairText || '{}');
          validation = validateListeningExam(rawExamPayload);
        }

        if (isOperationTerminal || Date.now() > operationDeadlineMs) {
          throw this.createTimeoutError(this.totalRetryBudgetMs);
        }
        isOperationTerminal = true;

        draftRecord.updatedAt = Date.now();
        draftRecord.repairAttempts = repairAttempts;
        draftRecord.tokenUsage = tokenUsage;
        draftRecord.content = rawExamPayload;

        draftRecord.validationFindings = {
          passed: validation.passed,
          structuralOk: validation.structuralOk,
          answersOk: validation.answersOk,
          evidenceOk: validation.evidenceOk,
          qualityOk: validation.qualityOk,
          errors: validation.errors,
          warnings: validation.warnings
        };

        if (validation.passed) {
          draftRecord.status = 'PENDING_REVIEW';
          draftRecord.validationStatus = repairAttempts > 0 ? 'REPAIRED' : 'PASSED';
        } else {
          draftRecord.status = 'VALIDATION_FAILED';
          draftRecord.validationStatus = 'FAILED';
        }

        const savedDraft = serverDb.saveAiDraftExam({ ...draftRecord });

        try {
          analyticsService.recordFactoryOperationalEvent({
            eventType: validation.passed ? 'ai_generation_completed' : 'ai_generation_failed',
            payload: {
              moduleId: 'listening',
              format: 'Academic',
              success: validation.passed,
              status: savedDraft.status,
              validationStatus: savedDraft.validationStatus,
              repairAttempts,
              durationMs: Date.now() - now,
              tokenUsage: tokenUsage?.totalTokens ? tokenUsage : undefined
            },
            userId: params.userId
          });
        } catch (telemetryErr) {
        }

        return { draft: savedDraft, validation };
      } catch (err: any) {
        if (!isOperationTerminal) {
          isOperationTerminal = true;
          const safeDiagnostic = sanitizeDiagnosticErrorMessage(err);
          console.error('[QuestionFactory] Listening generation error:', safeDiagnostic);
          const terminalStatus = err?.name === 'GeminiTimeoutError' ? 'FAILED' : 'VALIDATION_FAILED';
          draftRecord.status = terminalStatus;
          draftRecord.validationStatus = 'FAILED';
          draftRecord.validationFindings.errors.push(`System Error: ${safeDiagnostic}`);
          draftRecord.updatedAt = Date.now();
          serverDb.saveAiDraftExam({ ...draftRecord });

          try {
            analyticsService.recordFactoryOperationalEvent({
              eventType: 'ai_generation_failed',
              payload: {
                moduleId: 'listening',
                format: 'Academic',
                success: false,
                status: terminalStatus,
                validationStatus: 'FAILED',
                repairAttempts,
                durationMs: Date.now() - now,
                sanitizedErrorCategory: err?.name || 'GenerationError'
              },
              userId: params.userId
            });
          } catch (telemetryErr) {
          }
        }

        throw err;
      }
    });
  }

  /**
   * Generates a complete IELTS Writing Practice Draft (Task 1 & Task 2)
   */
  public async generateWritingPilot(params: {
    userId: string;
    format?: 'Academic' | 'General Training';
    topicSeed?: string;
    task1Type?: string;
    essayType?: string;
  }): Promise<{ draft: AIDraftExam; validation: ValidationResult }> {
    const format = params.format || 'Academic';
    const dedupeKey = buildFactoryGenerationDedupeKey({
      userId: params.userId,
      moduleId: 'writing',
      format,
      topicSeed: params.topicSeed,
      task1Type: params.task1Type,
      essayType: params.essayType
    });

    return await this.runWithInFlightDeduplication(dedupeKey, async () => {
      const now = Date.now();
      const operationDeadlineMs = now + this.totalRetryBudgetMs;
      let isOperationTerminal = false;
      const draftId = `draft_writing_${now}_${Math.random().toString(36).substring(2, 8)}`;

      const draftRecord: AIDraftExam = {
        id: draftId,
        createdAt: now,
        updatedAt: now,
        userId: params.userId,
        model: 'gemini-3.8-flash',
        examType: 'writing',
        status: 'GENERATING',
        validationStatus: 'FAILED',
        repairAttempts: 0,
        validationFindings: {
          passed: false,
          structuralOk: false,
          answersOk: false,
          evidenceOk: false,
          qualityOk: false,
          errors: [],
          warnings: []
        }
      };

      serverDb.saveAiDraftExam({ ...draftRecord });

      let rawExamPayload: any = null;
      let tokenUsage: { promptTokens?: number; completionTokens?: number; totalTokens?: number; thoughtsTokens?: number } = {};
      let repairAttempts = 0;
      const maxRepairs = 3;

      try {
        const systemInstruction =
          format === 'General Training'
            ? GENERAL_TRAINING_WRITING_SYSTEM_INSTRUCTION
            : ACADEMIC_WRITING_SYSTEM_INSTRUCTION;

        const initialPrompt = buildWritingPrompt({
          format,
          topicSeed: params.topicSeed,
          task1Type: params.task1Type,
          essayType: params.essayType
        });

        const response = await this.callGeminiWithTimeoutBoundary(
          {
            model: 'gemini-3.8-flash',
            contents: initialPrompt,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: WritingExamSchema
            }
          },
          3,
          operationDeadlineMs
        );

        if (isOperationTerminal || Date.now() > operationDeadlineMs) {
          throw this.createTimeoutError(this.totalRetryBudgetMs);
        }

        if (response.usageMetadata) {
          tokenUsage = {
            promptTokens: response.usageMetadata.promptTokenCount,
            completionTokens: response.usageMetadata.candidatesTokenCount,
            totalTokens: response.usageMetadata.totalTokenCount,
            ...(typeof response.usageMetadata.thoughtsTokenCount === 'number'
              ? { thoughtsTokens: response.usageMetadata.thoughtsTokenCount }
              : {})
          };
        }

        const rawText = (response.text || '').trim();
        rawExamPayload = JSON.parse(rawText || '{}');

        draftRecord.status = 'VALIDATING';
        serverDb.saveAiDraftExam({ ...draftRecord });

        let validation = validateWritingExam(rawExamPayload);

        while (!validation.passed && repairAttempts < maxRepairs) {
          if (isOperationTerminal || Date.now() >= operationDeadlineMs) {
            throw this.createTimeoutError(this.totalRetryBudgetMs);
          }
          repairAttempts++;

          const repairPrompt = buildWritingRepairPrompt(rawExamPayload, validation.errors);
          const repairResponse = await this.callGeminiWithTimeoutBoundary(
            {
              model: 'gemini-3.8-flash',
              contents: repairPrompt,
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: WritingExamSchema
              }
            },
            3,
            operationDeadlineMs
          );

          if (isOperationTerminal || Date.now() > operationDeadlineMs) {
            throw this.createTimeoutError(this.totalRetryBudgetMs);
          }

          if (repairResponse.usageMetadata) {
            if (typeof repairResponse.usageMetadata.promptTokenCount === 'number') {
              tokenUsage.promptTokens = (tokenUsage.promptTokens || 0) + repairResponse.usageMetadata.promptTokenCount;
            }
            if (typeof repairResponse.usageMetadata.candidatesTokenCount === 'number') {
              tokenUsage.completionTokens = (tokenUsage.completionTokens || 0) + repairResponse.usageMetadata.candidatesTokenCount;
            }
            if (typeof repairResponse.usageMetadata.totalTokenCount === 'number') {
              tokenUsage.totalTokens = (tokenUsage.totalTokens || 0) + repairResponse.usageMetadata.totalTokenCount;
            }
            if (typeof repairResponse.usageMetadata.thoughtsTokenCount === 'number') {
              tokenUsage.thoughtsTokens = (tokenUsage.thoughtsTokens || 0) + repairResponse.usageMetadata.thoughtsTokenCount;
            }
          }

          const repairText = (repairResponse.text || '').trim();
          rawExamPayload = JSON.parse(repairText || '{}');
          validation = validateWritingExam(rawExamPayload);
        }

        if (isOperationTerminal || Date.now() > operationDeadlineMs) {
          throw this.createTimeoutError(this.totalRetryBudgetMs);
        }
        isOperationTerminal = true;

        draftRecord.updatedAt = Date.now();
        draftRecord.repairAttempts = repairAttempts;
        draftRecord.tokenUsage = tokenUsage;
        draftRecord.content = rawExamPayload;

        draftRecord.validationFindings = {
          passed: validation.passed,
          structuralOk: validation.structuralOk,
          answersOk: validation.answersOk,
          evidenceOk: validation.evidenceOk,
          qualityOk: validation.qualityOk,
          errors: validation.errors,
          warnings: validation.warnings
        };

        if (validation.passed) {
          draftRecord.status = 'PENDING_REVIEW';
          draftRecord.validationStatus = repairAttempts > 0 ? 'REPAIRED' : 'PASSED';
        } else {
          draftRecord.status = 'VALIDATION_FAILED';
          draftRecord.validationStatus = 'FAILED';
        }

        const savedDraft = serverDb.saveAiDraftExam({ ...draftRecord });

        try {
          analyticsService.recordFactoryOperationalEvent({
            eventType: validation.passed ? 'ai_generation_completed' : 'ai_generation_failed',
            payload: {
              moduleId: 'writing',
              format: format as 'Academic' | 'General Training',
              success: validation.passed,
              status: savedDraft.status,
              validationStatus: savedDraft.validationStatus,
              repairAttempts,
              durationMs: Date.now() - now,
              tokenUsage: tokenUsage?.totalTokens ? tokenUsage : undefined
            },
            userId: params.userId
          });
        } catch (telemetryErr) {
        }

        return { draft: savedDraft, validation };
      } catch (err: any) {
        if (!isOperationTerminal) {
          isOperationTerminal = true;
          const safeDiagnostic = sanitizeDiagnosticErrorMessage(err);
          console.error('[QuestionFactory] Writing generation error:', safeDiagnostic);
          const terminalStatus = err?.name === 'GeminiTimeoutError' ? 'FAILED' : 'VALIDATION_FAILED';
          draftRecord.status = terminalStatus;
          draftRecord.validationStatus = 'FAILED';
          draftRecord.validationFindings.errors.push(`System Error: ${safeDiagnostic}`);
          draftRecord.updatedAt = Date.now();
          serverDb.saveAiDraftExam({ ...draftRecord });

          try {
            analyticsService.recordFactoryOperationalEvent({
              eventType: 'ai_generation_failed',
              payload: {
                moduleId: 'writing',
                format: format as 'Academic' | 'General Training',
                success: false,
                status: terminalStatus,
                validationStatus: 'FAILED',
                repairAttempts,
                durationMs: Date.now() - now,
                sanitizedErrorCategory: err?.name || 'GenerationError'
              },
              userId: params.userId
            });
          } catch (telemetryErr) {
          }
        }

        throw err;
      }
    });
  }

  /**
   * Generates a complete IELTS Speaking Practice Draft (Part 1, Part 2, & Part 3)
   */
  public async generateSpeakingPilot(params: {
    userId: string;
    format?: 'Academic' | 'General Training' | string;
    topicSeed?: string;
    difficulty?: 'Standard' | 'Challenging' | string;
  }): Promise<{ draft: AIDraftExam; validation: ValidationResult }> {
    const dedupeKey = buildFactoryGenerationDedupeKey({
      userId: params.userId,
      moduleId: 'speaking',
      format: params.format,
      topicSeed: params.topicSeed,
      difficulty: params.difficulty
    });

    return await this.runWithInFlightDeduplication(dedupeKey, async () => {
      const now = Date.now();
      const operationDeadlineMs = now + this.totalRetryBudgetMs;
      let isOperationTerminal = false;
      const draftId = `draft_speaking_${now}_${Math.random().toString(36).substring(2, 8)}`;

      let format: 'Academic' | 'General Training' = 'Academic';
      let difficulty: 'Standard' | 'Challenging' = 'Standard';

      const draftRecord: AIDraftExam = {
        id: draftId,
        createdAt: now,
        updatedAt: now,
        userId: params.userId,
        model: 'gemini-3.8-flash',
        examType: 'speaking',
        status: 'GENERATING',
        validationStatus: 'FAILED',
        repairAttempts: 0,
        validationFindings: {
          passed: false,
          structuralOk: false,
          answersOk: false,
          evidenceOk: false,
          qualityOk: false,
          errors: [],
          warnings: []
        }
      };

      serverDb.saveAiDraftExam({ ...draftRecord });

      let rawExamPayload: any = null;
      let tokenUsage: { promptTokens?: number; completionTokens?: number; totalTokens?: number; thoughtsTokens?: number } = {};
      let repairAttempts = 0;
      const maxRepairs = 3;

      try {
        format = normalizeSpeakingFormat(params.format);
        difficulty = normalizeSpeakingDifficulty(params.difficulty);

        const initialPrompt = buildSpeakingPrompt({
          format,
          topicSeed: params.topicSeed,
          difficulty
        });

        const response = await this.callGeminiWithTimeoutBoundary(
          {
            model: 'gemini-3.8-flash',
            contents: initialPrompt,
            config: {
              systemInstruction: SPEAKING_SYSTEM_INSTRUCTION,
              responseMimeType: 'application/json',
              responseSchema: SpeakingExamSchema
            }
          },
          3,
          operationDeadlineMs
        );

        if (isOperationTerminal || Date.now() > operationDeadlineMs) {
          throw this.createTimeoutError(this.totalRetryBudgetMs);
        }

        if (response.usageMetadata) {
          tokenUsage = {
            promptTokens: response.usageMetadata.promptTokenCount,
            completionTokens: response.usageMetadata.candidatesTokenCount,
            totalTokens: response.usageMetadata.totalTokenCount,
            ...(typeof response.usageMetadata.thoughtsTokenCount === 'number'
              ? { thoughtsTokens: response.usageMetadata.thoughtsTokenCount }
              : {})
          };
        }

        const rawText = (response.text || '').trim();
        rawExamPayload = JSON.parse(rawText || '{}');

        draftRecord.status = 'VALIDATING';
        serverDb.saveAiDraftExam({ ...draftRecord });

        let validation = validateSpeakingExam(rawExamPayload);

        while (!validation.passed && repairAttempts < maxRepairs) {
          if (isOperationTerminal || Date.now() >= operationDeadlineMs) {
            throw this.createTimeoutError(this.totalRetryBudgetMs);
          }
          repairAttempts++;

          const repairPrompt = buildSpeakingRepairPrompt(rawExamPayload, validation.errors);
          const repairResponse = await this.callGeminiWithTimeoutBoundary(
            {
              model: 'gemini-3.8-flash',
              contents: repairPrompt,
              config: {
                systemInstruction: SPEAKING_SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
                responseSchema: SpeakingExamSchema
              }
            },
            3,
            operationDeadlineMs
          );

          if (isOperationTerminal || Date.now() > operationDeadlineMs) {
            throw this.createTimeoutError(this.totalRetryBudgetMs);
          }

          if (repairResponse.usageMetadata) {
            if (typeof repairResponse.usageMetadata.promptTokenCount === 'number') {
              tokenUsage.promptTokens = (tokenUsage.promptTokens || 0) + repairResponse.usageMetadata.promptTokenCount;
            }
            if (typeof repairResponse.usageMetadata.candidatesTokenCount === 'number') {
              tokenUsage.completionTokens = (tokenUsage.completionTokens || 0) + repairResponse.usageMetadata.candidatesTokenCount;
            }
            if (typeof repairResponse.usageMetadata.totalTokenCount === 'number') {
              tokenUsage.totalTokens = (tokenUsage.totalTokens || 0) + repairResponse.usageMetadata.totalTokenCount;
            }
            if (typeof repairResponse.usageMetadata.thoughtsTokenCount === 'number') {
              tokenUsage.thoughtsTokens = (tokenUsage.thoughtsTokens || 0) + repairResponse.usageMetadata.thoughtsTokenCount;
            }
          }

          const repairText = (repairResponse.text || '').trim();
          rawExamPayload = JSON.parse(repairText || '{}');
          validation = validateSpeakingExam(rawExamPayload);
        }

        if (isOperationTerminal || Date.now() > operationDeadlineMs) {
          throw this.createTimeoutError(this.totalRetryBudgetMs);
        }
        isOperationTerminal = true;

        draftRecord.updatedAt = Date.now();
        draftRecord.repairAttempts = repairAttempts;
        draftRecord.tokenUsage = tokenUsage;
        draftRecord.content = rawExamPayload;

        draftRecord.validationFindings = {
          passed: validation.passed,
          structuralOk: validation.structuralOk,
          answersOk: validation.answersOk,
          evidenceOk: validation.evidenceOk,
          qualityOk: validation.qualityOk,
          errors: validation.errors,
          warnings: validation.warnings
        };

        if (validation.passed) {
          draftRecord.status = 'PENDING_REVIEW';
          draftRecord.validationStatus = repairAttempts > 0 ? 'REPAIRED' : 'PASSED';
        } else {
          draftRecord.status = 'VALIDATION_FAILED';
          draftRecord.validationStatus = 'FAILED';
        }

        const savedDraft = serverDb.saveAiDraftExam({ ...draftRecord });

        try {
          analyticsService.recordFactoryOperationalEvent({
            eventType: validation.passed ? 'ai_generation_completed' : 'ai_generation_failed',
            payload: {
              moduleId: 'speaking',
              format,
              success: validation.passed,
              status: savedDraft.status,
              validationStatus: savedDraft.validationStatus,
              repairAttempts,
              durationMs: Date.now() - now,
              tokenUsage: tokenUsage?.totalTokens ? tokenUsage : undefined
            },
            userId: params.userId
          });
        } catch (telemetryErr) {
        }

        return { draft: savedDraft, validation };
      } catch (err: any) {
        if (!isOperationTerminal) {
          isOperationTerminal = true;
          const safeDiagnostic = sanitizeDiagnosticErrorMessage(err);
          console.error('[QuestionFactory] Speaking generation error:', safeDiagnostic);
          const terminalStatus = err?.name === 'GeminiTimeoutError' ? 'FAILED' : 'VALIDATION_FAILED';
          draftRecord.status = terminalStatus;
          draftRecord.validationStatus = 'FAILED';
          draftRecord.validationFindings.errors.push(`System Error: ${safeDiagnostic}`);
          draftRecord.updatedAt = Date.now();
          serverDb.saveAiDraftExam({ ...draftRecord });

          try {
            analyticsService.recordFactoryOperationalEvent({
              eventType: 'ai_generation_failed',
              payload: {
                moduleId: 'speaking',
                format,
                success: false,
                status: terminalStatus,
                validationStatus: 'FAILED',
                repairAttempts,
                durationMs: Date.now() - now,
                sanitizedErrorCategory: err?.name || 'GenerationError'
              },
              userId: params.userId
            });
          } catch (telemetryErr) {
          }
        }

        throw err;
      }
    });
  }
}

export const questionFactory = new AIQuestionFactory();

