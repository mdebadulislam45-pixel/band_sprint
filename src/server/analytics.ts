import crypto from 'node:crypto';
import { serverDb } from './db.ts';

/**
 * Supported IELTS module identifiers
 */
export type AnalyticsModuleId = 'reading' | 'listening' | 'writing' | 'speaking';

/**
 * Candidate-permitted event types
 */
export type CandidateEventType =
  | 'practice_started'
  | 'practice_completed'
  | 'practice_exited'
  | 'module_evaluated';

/**
 * Server-only AI factory operational event types
 */
export type FactoryEventType =
  | 'ai_generation_completed'
  | 'ai_generation_failed'
  | 'ai_validation_completed';

export type AnalyticsEventType = CandidateEventType | FactoryEventType;

/**
 * Strict Candidate Practice Event Payload
 */
export interface CandidateEventPayload {
  moduleId: AnalyticsModuleId;
  format?: 'Academic' | 'General Training';
  completionStatus?: 'completed' | 'abandoned' | 'in_progress';
  overallBandScore?: number;
  criterionScores?: Record<string, number>;
  sectionScores?: Record<string, number>;
  durationSeconds?: number;
  questionCount?: number;
  answeredCount?: number;
  isAiPilot?: boolean;
}

/**
 * Strict Server-Only AI Factory Operational Payload
 */
export interface FactoryEventPayload {
  moduleId: AnalyticsModuleId;
  format?: 'Academic' | 'General Training';
  success: boolean;
  status: string;
  validationStatus?: 'PASSED' | 'FAILED' | 'REPAIRED';
  repairAttempts?: number;
  durationMs: number;
  sanitizedErrorCategory?: string;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    thoughtsTokens?: number;
  };
}

/**
 * Stored Analytics Record
 */
export interface AnalyticsEventRecord {
  id: string;
  schemaVersion: '1.0';
  category: 'candidate' | 'factory_operational';
  eventType: AnalyticsEventType;
  userId?: string; // Pseudonymous internal ID for candidate events; omitted/undefined for anonymous factory operational events
  serverTimestamp: number;
  clientTimestamp?: number;
  idempotencyKey?: string;
  payload: CandidateEventPayload | FactoryEventPayload;
}

export interface CandidateEventInput {
  eventType: CandidateEventType;
  idempotencyKey?: string;
  clientTimestamp?: number;
  payload: CandidateEventPayload;
}

const ALLOWED_CANDIDATE_EVENTS = new Set<CandidateEventType>([
  'practice_started',
  'practice_completed',
  'practice_exited',
  'module_evaluated'
]);

const ALLOWED_MODULES = new Set<AnalyticsModuleId>([
  'reading',
  'listening',
  'writing',
  'speaking'
]);

const ALLOWED_FORMATS = new Set(['Academic', 'General Training']);
const ALLOWED_COMPLETION_STATUSES = new Set(['completed', 'abandoned', 'in_progress']);

// Prohibited keys that MUST NEVER exist in any candidate payload
const PROHIBITED_KEYS = new Set([
  'audio',
  'audioUrl',
  'audioBlob',
  'audioBuffer',
  'recording',
  'recordingUrl',
  'transcript',
  'transcription',
  'rawTranscript',
  'spokenText',
  'text',
  'essay',
  'response',
  'essayText',
  'writingText',
  'candidateResponse',
  'email',
  'phone',
  'password',
  'token',
  'cookie',
  'apiKey',
  'googleId',
  'ip',
  'userAgent'
]);

export class AnalyticsValidationResult {
  public valid: boolean;
  public error?: string;

  constructor(valid: boolean, error?: string) {
    this.valid = valid;
    this.error = error;
  }
}

/**
 * Validates candidate-submitted event payloads for strict schema compliance,
 * numerical bounds, size limits, and privacy guarantees.
 */
export function validateCandidateEvent(input: any): AnalyticsValidationResult {
  if (!input || typeof input !== 'object') {
    return new AnalyticsValidationResult(false, 'Request body must be a JSON object.');
  }

  // Check eventType
  if (!input.eventType || typeof input.eventType !== 'string') {
    return new AnalyticsValidationResult(false, 'Missing or invalid "eventType".');
  }

  // Reject unauthorized client attempts to send factory operational events
  if (
    input.eventType.startsWith('ai_') ||
    input.category === 'factory_operational'
  ) {
    return new AnalyticsValidationResult(false, 'Factory operational events cannot be submitted via candidate endpoints.');
  }

  if (!ALLOWED_CANDIDATE_EVENTS.has(input.eventType as CandidateEventType)) {
    return new AnalyticsValidationResult(
      false,
      `Invalid candidate eventType "${input.eventType}". Allowed: ${Array.from(ALLOWED_CANDIDATE_EVENTS).join(', ')}`
    );
  }

  // Check idempotencyKey if present
  if (input.idempotencyKey !== undefined) {
    if (typeof input.idempotencyKey !== 'string' || input.idempotencyKey.length > 128) {
      return new AnalyticsValidationResult(false, '"idempotencyKey" must be a string <= 128 characters.');
    }
  }

  // Check clientTimestamp if present
  if (input.clientTimestamp !== undefined) {
    if (typeof input.clientTimestamp !== 'number' || !Number.isFinite(input.clientTimestamp)) {
      return new AnalyticsValidationResult(false, '"clientTimestamp" must be a valid finite number.');
    }
  }

  // Check payload
  if (!input.payload || typeof input.payload !== 'object' || Array.isArray(input.payload)) {
    return new AnalyticsValidationResult(false, 'Missing or invalid "payload" object.');
  }

  const rawPayload = input.payload;

  // Strict Payload size check (reject payloads > 4KB)
  const payloadStr = JSON.stringify(rawPayload);
  if (payloadStr.length > 4096) {
    return new AnalyticsValidationResult(false, 'Payload size exceeds the 4KB maximum limit.');
  }

  // Prohibited field scan (privacy & data minimization enforcement)
  for (const key of Object.keys(rawPayload)) {
    if (PROHIBITED_KEYS.has(key)) {
      return new AnalyticsValidationResult(false, `Prohibited field "${key}" detected. Raw responses, audio, transcripts, and PII are strictly excluded.`);
    }
  }

  // Required moduleId
  if (!rawPayload.moduleId || typeof rawPayload.moduleId !== 'string') {
    return new AnalyticsValidationResult(false, 'Missing or invalid "payload.moduleId".');
  }

  if (!ALLOWED_MODULES.has(rawPayload.moduleId as AnalyticsModuleId)) {
    return new AnalyticsValidationResult(
      false,
      `Invalid moduleId "${rawPayload.moduleId}". Allowed: reading, listening, writing, speaking.`
    );
  }

  // Optional format
  if (rawPayload.format !== undefined && !ALLOWED_FORMATS.has(rawPayload.format)) {
    return new AnalyticsValidationResult(
      false,
      `Invalid format "${rawPayload.format}". Allowed: Academic, General Training.`
    );
  }

  // Optional completionStatus
  if (
    rawPayload.completionStatus !== undefined &&
    !ALLOWED_COMPLETION_STATUSES.has(rawPayload.completionStatus)
  ) {
    return new AnalyticsValidationResult(
      false,
      `Invalid completionStatus "${rawPayload.completionStatus}". Allowed: completed, abandoned, in_progress.`
    );
  }

  // Numerical validation: overallBandScore (0 to 9, half-band steps standard, 0-9 range)
  if (rawPayload.overallBandScore !== undefined) {
    if (
      typeof rawPayload.overallBandScore !== 'number' ||
      !Number.isFinite(rawPayload.overallBandScore) ||
      rawPayload.overallBandScore < 0 ||
      rawPayload.overallBandScore > 9
    ) {
      return new AnalyticsValidationResult(false, 'Invalid "overallBandScore". Must be a number between 0.0 and 9.0.');
    }
  }

  // Numerical validation: durationSeconds
  if (rawPayload.durationSeconds !== undefined) {
    if (
      typeof rawPayload.durationSeconds !== 'number' ||
      !Number.isFinite(rawPayload.durationSeconds) ||
      rawPayload.durationSeconds < 0 ||
      rawPayload.durationSeconds > 86400 // max 24 hours
    ) {
      return new AnalyticsValidationResult(false, 'Invalid "durationSeconds". Must be between 0 and 86400.');
    }
  }

  // Numerical validation: questionCount & answeredCount
  if (rawPayload.questionCount !== undefined) {
    if (
      typeof rawPayload.questionCount !== 'number' ||
      rawPayload.questionCount < 0 ||
      rawPayload.questionCount > 100
    ) {
      return new AnalyticsValidationResult(false, 'Invalid "questionCount". Must be between 0 and 100.');
    }
  }

  if (rawPayload.answeredCount !== undefined) {
    if (
      typeof rawPayload.answeredCount !== 'number' ||
      rawPayload.answeredCount < 0 ||
      rawPayload.answeredCount > 100
    ) {
      return new AnalyticsValidationResult(false, 'Invalid "answeredCount". Must be between 0 and 100.');
    }
  }

  // Criterion scores (e.g. { ta: 7.0, cc: 6.5, lr: 7.0, gra: 6.5 } or { fc, lr, gra, pr })
  if (rawPayload.criterionScores !== undefined) {
    if (typeof rawPayload.criterionScores !== 'object' || Array.isArray(rawPayload.criterionScores)) {
      return new AnalyticsValidationResult(false, '"criterionScores" must be an object of criterion band scores.');
    }
    for (const [k, v] of Object.entries(rawPayload.criterionScores)) {
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 9) {
        return new AnalyticsValidationResult(false, `Invalid criterion score for "${k}". Must be a number between 0 and 9.`);
      }
    }
  }

  // Section scores (e.g. { sec1: 8, sec2: 7, sec3: 6, sec4: 7 })
  if (rawPayload.sectionScores !== undefined) {
    if (typeof rawPayload.sectionScores !== 'object' || Array.isArray(rawPayload.sectionScores)) {
      return new AnalyticsValidationResult(false, '"sectionScores" must be an object.');
    }
    for (const [k, v] of Object.entries(rawPayload.sectionScores)) {
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 40) {
        return new AnalyticsValidationResult(false, `Invalid section score for "${k}". Must be between 0 and 40.`);
      }
    }
  }

  return new AnalyticsValidationResult(true);
}

/**
 * Privacy-First Analytics Service
 */
export class AnalyticsService {
  /**
   * Records a validated candidate practice event with server-authoritative ownership and timestamp.
   */
  public recordCandidateEvent(params: {
    userId: string;
    eventInput: CandidateEventInput;
  }): { success: boolean; eventId?: string; isDuplicate?: boolean; error?: string } {
    const { userId, eventInput } = params;

    if (!userId || typeof userId !== 'string') {
      return { success: false, error: 'Authenticated userId is required.' };
    }

    const validation = validateCandidateEvent(eventInput);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Check duplicate / idempotency
    const idempotencyKey = eventInput.idempotencyKey;
    if (idempotencyKey) {
      const existing = serverDb.getAnalyticsEventByIdempotencyKey(userId, idempotencyKey);
      if (existing) {
        return { success: true, eventId: existing.id, isDuplicate: true };
      }
    }

    const now = Date.now();
    const eventId = `evt_cand_${now}_${crypto.randomBytes(6).toString('hex')}`;

    // Whitelist clean payload structure only
    const cleanPayload: CandidateEventPayload = {
      moduleId: eventInput.payload.moduleId,
      format: eventInput.payload.format,
      completionStatus: eventInput.payload.completionStatus,
      overallBandScore: eventInput.payload.overallBandScore,
      criterionScores: eventInput.payload.criterionScores ? { ...eventInput.payload.criterionScores } : undefined,
      sectionScores: eventInput.payload.sectionScores ? { ...eventInput.payload.sectionScores } : undefined,
      durationSeconds: eventInput.payload.durationSeconds,
      questionCount: eventInput.payload.questionCount,
      answeredCount: eventInput.payload.answeredCount,
      isAiPilot: !!eventInput.payload.isAiPilot
    };

    const record: AnalyticsEventRecord = {
      id: eventId,
      schemaVersion: '1.0',
      category: 'candidate',
      eventType: eventInput.eventType,
      userId, // Derived server-side from session
      serverTimestamp: now,
      clientTimestamp: eventInput.clientTimestamp,
      idempotencyKey,
      payload: cleanPayload
    };

    try {
      serverDb.saveAnalyticsEvent(record);
      return { success: true, eventId, isDuplicate: false };
    } catch (err: any) {
      console.error('[Analytics] Failed to save candidate event:', err);
      return { success: false, error: 'Database persistence error.' };
    }
  }

  /**
   * Records a trusted server-side AI Factory operational event (no client access).
   */
  public recordFactoryOperationalEvent(params: {
    eventType: FactoryEventType;
    payload: FactoryEventPayload;
    userId?: string;
  }): { success: boolean; eventId?: string } {
    const now = Date.now();
    const eventId = `evt_fact_${now}_${crypto.randomBytes(6).toString('hex')}`;

    const cleanPayload: FactoryEventPayload = {
      moduleId: params.payload.moduleId,
      format: params.payload.format,
      success: !!params.payload.success,
      status: params.payload.status,
      validationStatus: params.payload.validationStatus,
      repairAttempts: Number(params.payload.repairAttempts || 0),
      durationMs: Number(params.payload.durationMs || 0),
      sanitizedErrorCategory: params.payload.sanitizedErrorCategory,
      tokenUsage: params.payload.tokenUsage ? { ...params.payload.tokenUsage } : undefined
    };

    const record: AnalyticsEventRecord = {
      id: eventId,
      schemaVersion: '1.0',
      category: 'factory_operational',
      eventType: params.eventType,
      userId: params.userId,
      serverTimestamp: now,
      payload: cleanPayload
    };

    try {
      serverDb.saveAnalyticsEvent(record);
      return { success: true, eventId };
    } catch (err) {
      console.error('[Analytics] Failed to save factory operational event:', err);
      return { success: false };
    }
  }

  /**
   * Retrieves candidate events strictly belonging to the authenticated user.
   */
  public getCandidateEvents(userId: string, limit = 100): AnalyticsEventRecord[] {
    if (!userId) return [];
    return serverDb.getUserAnalyticsEvents(userId, limit);
  }

  /**
   * Admin-only retrieval of factory operational metrics (internal records).
   */
  public getFactoryOperationalEvents(limit = 200): AnalyticsEventRecord[] {
    return serverDb.getFactoryOperationalEvents(limit);
  }

  /**
   * Admin-only retrieval of factory operational metrics with candidate identifiers projected out (DEF-PRIV-01).
   */
  public getSanitizedFactoryOperationalEvents(limit = 200): Omit<AnalyticsEventRecord, 'userId'>[] {
    const rawEvents = serverDb.getFactoryOperationalEvents(limit);
    return rawEvents.map(({ userId, ...safeEvent }) => safeEvent);
  }
}

export const analyticsService = new AnalyticsService();
