/**
 * BAND SPRINT — SHARED DASHBOARD, PROGRESS & HISTORICAL AGGREGATION ENGINE (Phase 3B.5)
 *
 * Single authoritative, read-time aggregation & eligibility layer shared across
 * HomeDashboard, HomeExtendedBlocks, ProgressPage, ProgressDonutCard, AIBandScorecard,
 * CandidateAnalyticsPage, MockTestPage, PrintablePracticeReportModal,
 * OfficialDiagnosticReportModal, DiagnosticScorecardModal, AuthModal, PracticeHeatmap,
 * and achievementService.
 *
 * Core Invariants:
 * 1. Read-time ONLY: never mutates, deletes, or silently normalizes stored historical records.
 * 2. Strict IELTS half-band validation: finite numbers on exact 0.5 increments within range.
 * 3. Missing/null/undefined/malformed/unavailable values NEVER become 0.
 * 4. Genuine measured 0.0 Listening/Reading scores (with attempted questions) are preserved
 *    and distinguished from missing/null values.
 * 5. Overall 4-skill bands are NEVER inferred from fewer than 4 valid skills.
 * 6. Only genuinely complete 4-skill Full Mocks count as completed Full Mocks.
 * 7. Incomplete or unassessed newer attempts NEVER overwrite valid historical bests or latest scores.
 * 8. Trends require >= 2 comparable valid evaluated data points; charts never plot missing values as 0.
 * 9. Date filtering and pagination never alter per-record score eligibility.
 */

import { ExamHistoryRecord } from '../types';
import { isFullMockExamRecord } from './userStorage';

export type IeltsSkillKey = 'listening' | 'reading' | 'writing' | 'speaking';

export type RecordClassification =
  | 'completed_full_mock'
  | 'incomplete_mock'
  | 'partial_multi_skill'
  | 'single_skill_evaluated'
  | 'diagnostic_or_unassessed';

export interface BandTrendSummary {
  status: 'up' | 'down' | 'flat' | 'insufficient_data';
  delta: number | null;
  previous: number | null;
  current: number | null;
  sampleCount: number;
}

export interface SkillAggregateStats {
  skill: IeltsSkillKey;
  latest: number | null;
  latestTimestamp: number | null;
  average: number | null;
  best: number | null;
  sampleCount: number;
  trend: BandTrendSummary;
}

export interface EvaluatedRecordView {
  record: ExamHistoryRecord;
  classification: RecordClassification;
  isCompletedFullMock: boolean;
  isIncompleteMock: boolean;
  isSingleSkillAttempt: boolean;
  isDiagnosticOrUnassessed: boolean;
  overallBand: number | null;
  listeningBand: number | null;
  readingBand: number | null;
  writingBand: number | null;
  speakingBand: number | null;
  hasAnyValidScore: boolean;
}

export interface ChartScorePoint {
  id: string;
  timestamp: number;
  dateLabel: string;
  classification: RecordClassification;
  isCompletedFullMock: boolean;
  overallBand: number | null;
  listeningBand: number | null;
  readingBand: number | null;
  writingBand: number | null;
  speakingBand: number | null;
}

export interface AggregatedHistoryMetrics {
  totalAttempts: number;
  completedFullMockCount: number;
  incompleteMockCount: number;
  partialMultiSkillCount: number;
  singleSkillEvaluatedCount: number;
  diagnosticOrUnassessedCount: number;
  evaluatedAnySkillCount: number;
  overall: {
    latest: number | null;
    latestTimestamp: number | null;
    average: number | null;
    best: number | null;
    sampleCount: number;
    trend: BandTrendSummary;
  };
  skills: Record<IeltsSkillKey, SkillAggregateStats>;
  evaluatedRecords: EvaluatedRecordView[];
  chartSeries: ChartScorePoint[];
  fullMockSparklinePoints: number[];
}

export interface DateRangeFilter {
  fromTimestamp?: number | null;
  toTimestamp?: number | null;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const NON_EVALUATED_STATUSES = new Set<string>([
  'unavailable',
  'insufficient_evidence',
  'partial_transcript_only',
  'structural_precheck',
  'precheck_ready',
  'diagnostic_only',
  'not_assessed'
]);

const SPEAKING_BLOCKED_STATUSES = new Set<string>([
  'partial_transcript_only',
  'insufficient_evidence',
  'unavailable',
  'not_assessed'
]);

/**
 * Validates that a value is a finite number in [min, max] strictly on a 0.5 increment.
 * Never coerces null, undefined, booleans, strings, NaN, or Infinity to 0.
 */
export function isValidHalfBand(
  value: unknown,
  min: number = 1.0,
  max: number = 9.0
): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return false;
  }
  if (value < min || value > max) {
    return false;
  }
  return Math.abs(value * 2 - Math.round(value * 2)) < 1e-6;
}

/**
 * Validates an optional diagnostic or self-estimate band value strictly on [min, 9.0] half-bands.
 */
export function validateOptionalHalfBand(
  value: unknown,
  min: number = 1.0
): number | null {
  if (!isValidHalfBand(value, min, 9.0)) return null;
  return Math.round(value * 2) / 2;
}

function isSpeakingProvenanceBlocked(rec: ExamHistoryRecord): boolean {
  const ext = rec as ExamHistoryRecord & Record<string, unknown>;
  if (
    typeof rec.speakingAssessmentStatus === 'string' &&
    SPEAKING_BLOCKED_STATUSES.has(rec.speakingAssessmentStatus)
  ) {
    return true;
  }
  if (rec.speakingPronunciationObservable === false) {
    return true;
  }
  if (ext.speakingEvidenceMode === 'transcript_only' || ext.evidenceMode === 'transcript_only') {
    return true;
  }
  if (ext.isPartialAssessment === true) {
    return true;
  }
  if (ext.pronunciationObservable === false) {
    return true;
  }
  if (Array.isArray(ext.unassessedCriteria) && ext.unassessedCriteria.length > 0) {
    return true;
  }
  if (
    rec.examType === 'speaking_only' &&
    typeof ext.assessmentStatus === 'string' &&
    NON_EVALUATED_STATUSES.has(ext.assessmentStatus)
  ) {
    return true;
  }
  if (rec.examType === 'speaking_only' && ext.isValidAttempt === false) {
    return true;
  }
  return false;
}

function isWritingProvenanceBlocked(rec: ExamHistoryRecord): boolean {
  const ext = rec as ExamHistoryRecord & Record<string, unknown>;
  if (
    typeof ext.writingAssessmentStatus === 'string' &&
    NON_EVALUATED_STATUSES.has(ext.writingAssessmentStatus)
  ) {
    return true;
  }
  if (ext.writingEvaluationSource === 'structural_precheck' || ext.evaluationSource === 'structural_precheck') {
    return true;
  }
  if (
    rec.examType === 'writing_only' &&
    typeof ext.assessmentStatus === 'string' &&
    NON_EVALUATED_STATUSES.has(ext.assessmentStatus)
  ) {
    return true;
  }
  if (rec.examType === 'writing_only' && ext.isValidAttempt === false) {
    return true;
  }
  return false;
}

function isRecordDiagnosticOnly(rec: ExamHistoryRecord): boolean {
  const ext = rec as ExamHistoryRecord & Record<string, unknown>;
  if (ext.isDiagnosticOnly === true || ext.isNonScoring === true) {
    return true;
  }
  if (
    typeof ext.assessmentStatus === 'string' &&
    (ext.assessmentStatus === 'structural_precheck' ||
      ext.assessmentStatus === 'precheck_ready' ||
      ext.assessmentStatus === 'diagnostic_only')
  ) {
    return true;
  }
  if (
    typeof rec.examType === 'string' &&
    (rec.examType as string).toLowerCase().includes('diagnostic')
  ) {
    return true;
  }
  return false;
}

/**
 * Extracts a single skill band from an ExamHistoryRecord conservatively at read time.
 * - Never mutates the record.
 * - Preserves genuine measured 0.0 Listening/Reading scores when questions were genuinely attempted.
 * - Rejects null, undefined, malformed, non-half-band, unavailable, insufficient,
 *   diagnostic-only, or transcript-only Speaking values.
 */
export function extractValidSkillBand(
  rec: ExamHistoryRecord | null | undefined,
  skill: IeltsSkillKey
): number | null {
  if (!rec || typeof rec !== 'object') return null;
  if (isRecordDiagnosticOnly(rec)) return null;

  if (Array.isArray(rec.incompleteSkills) && rec.incompleteSkills.includes(skill)) {
    return null;
  }
  if (rec.completedSkills && rec.completedSkills[skill] === false) {
    return null;
  }

  if (skill === 'listening' || skill === 'reading') {
    const raw = skill === 'listening' ? rec.listeningBand : rec.readingBand;
    const explicitComplete = rec.completedSkills?.[skill] === true;
    const hasAttemptedObjectiveQuestions =
      typeof rec.totalQuestions === 'number' &&
      Number.isFinite(rec.totalQuestions) &&
      rec.totalQuestions > 0 &&
      (explicitComplete ||
        (skill === 'listening' && rec.examType === 'listening_only') ||
        (skill === 'reading' && rec.examType === 'reading_only'));

    // Genuine 0/40 is valid ONLY when actual attempted-question evidence (totalQuestions > 0) exists.
    // completedSkills[skill] === true alone without attempted-question evidence must NEVER qualify 0.0.
    const minBand = hasAttemptedObjectiveQuestions ? 0.0 : 0.5;
    if (!isValidHalfBand(raw, minBand, 9.0)) return null;
    return Math.round(raw * 2) / 2;
  }

  if (skill === 'writing') {
    if (isWritingProvenanceBlocked(rec)) return null;
    const raw = rec.writingBand;
    if (!isValidHalfBand(raw, 1.0, 9.0)) return null;
    return Math.round(raw * 2) / 2;
  }

  // Speaking
  if (isSpeakingProvenanceBlocked(rec)) return null;
  const raw = rec.speakingBand;
  if (!isValidHalfBand(raw, 1.0, 9.0)) return null;
  return Math.round(raw * 2) / 2;
}

/**
 * Extracts a valid 4-skill Full Mock overall band ONLY when the record satisfies
 * strict 4-skill Full Mock completeness AND all 4 underlying skill bands are valid.
 * Never infers an overall band from fewer than 4 valid skills.
 * Never trusts a bare examType or completion flag without verifying underlying skill evidence.
 */
export function extractValidFullMockOverallBand(
  rec: ExamHistoryRecord | null | undefined
): number | null {
  if (!rec || typeof rec !== 'object') return null;
  if (isRecordDiagnosticOnly(rec)) return null;
  if (isWritingProvenanceBlocked(rec) || isSpeakingProvenanceBlocked(rec)) return null;

  // Enforce explicit 2-task Writing completeness when present, and prevent silent bypass on under-length records
  const ext = rec as ExamHistoryRecord & Record<string, unknown>;
  if ('writingTasksCompleted' in ext && ext.writingTasksCompleted !== undefined) {
    if (
      typeof ext.writingTasksCompleted !== 'number' ||
      !Number.isFinite(ext.writingTasksCompleted) ||
      ext.writingTasksCompleted < 2
    ) {
      return null;
    }
  } else if (
    typeof rec.wordCount !== 'number' ||
    !Number.isFinite(rec.wordCount) ||
    rec.wordCount < 400
  ) {
    return null;
  }

  if (!isFullMockExamRecord(rec)) {
    return null;
  }

  const l = extractValidSkillBand(rec, 'listening');
  const r = extractValidSkillBand(rec, 'reading');
  const w = extractValidSkillBand(rec, 'writing');
  const s = extractValidSkillBand(rec, 'speaking');
  if (l === null || r === null || w === null || s === null) {
    return null;
  }

  if (!isValidHalfBand(rec.overallBand, 0.5, 9.0)) {
    return null;
  }

  return Math.round(rec.overallBand * 2) / 2;
}

/**
 * Evaluates a single ExamHistoryRecord conservatively at read time without mutating it.
 */
export function evaluateExamHistoryRecord(rec: ExamHistoryRecord): EvaluatedRecordView {
  const listeningBand = extractValidSkillBand(rec, 'listening');
  const readingBand = extractValidSkillBand(rec, 'reading');
  const writingBand = extractValidSkillBand(rec, 'writing');
  const speakingBand = extractValidSkillBand(rec, 'speaking');
  const overallBand = extractValidFullMockOverallBand(rec);

  const isCompletedFullMock = overallBand !== null;
  const isIncompleteMock =
    !isCompletedFullMock &&
    (rec.examType === 'incomplete_mock' || rec.examType === 'full_mock');
  const hasAnyValidScore =
    overallBand !== null ||
    listeningBand !== null ||
    readingBand !== null ||
    writingBand !== null ||
    speakingBand !== null;

  let classification: RecordClassification;
  if (isCompletedFullMock) {
    classification = 'completed_full_mock';
  } else if (isIncompleteMock) {
    classification = 'incomplete_mock';
  } else if (rec.examType === 'partial_lrw') {
    classification = 'partial_multi_skill';
  } else if (isRecordDiagnosticOnly(rec) || !hasAnyValidScore) {
    classification = 'diagnostic_or_unassessed';
  } else {
    classification = 'single_skill_evaluated';
  }

  const isSingleSkillAttempt =
    classification === 'single_skill_evaluated' ||
    rec.examType === 'listening_only' ||
    rec.examType === 'reading_only' ||
    rec.examType === 'writing_only' ||
    rec.examType === 'speaking_only';

  return {
    record: rec,
    classification,
    isCompletedFullMock,
    isIncompleteMock,
    isSingleSkillAttempt,
    isDiagnosticOrUnassessed: classification === 'diagnostic_or_unassessed',
    overallBand,
    listeningBand,
    readingBand,
    writingBand,
    speakingBand,
    hasAnyValidScore
  };
}

/**
 * Filters records by timestamp range without mutating input or altering eligibility rules.
 */
export function filterRecordsByDateRange<T extends { timestamp?: number }>(
  records: readonly T[] | null | undefined,
  range?: DateRangeFilter
): T[] {
  if (!Array.isArray(records)) return [];
  const from =
    typeof range?.fromTimestamp === 'number' && Number.isFinite(range.fromTimestamp)
      ? range.fromTimestamp
      : null;
  const to =
    typeof range?.toTimestamp === 'number' && Number.isFinite(range.toTimestamp)
      ? range.toTimestamp
      : null;

  if (from === null && to === null) {
    return [...records];
  }

  return records.filter((rec) => {
    const ts = rec?.timestamp;
    if (typeof ts !== 'number' || !Number.isFinite(ts)) return false;
    if (from !== null && ts < from) return false;
    if (to !== null && ts > to) return false;
    return true;
  });
}

/**
 * Pure read-time pagination helper that preserves order and eligibility.
 */
export function paginateRecords<T>(
  records: readonly T[] | null | undefined,
  options: PaginationOptions
): PaginatedResult<T> {
  const list = Array.isArray(records) ? records : [];
  const pageSize = Math.max(1, Math.floor(Number(options.pageSize) || 10));
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(totalPages, Math.max(1, Math.floor(Number(options.page) || 1)));
  const start = (page - 1) * pageSize;

  return {
    items: list.slice(start, start + pageSize),
    page,
    pageSize,
    totalItems,
    totalPages
  };
}

/**
 * Computes trend safely from chronological (oldest -> newest) valid evaluated values.
 * Returns status 'insufficient_data' and delta: null when fewer than 2 comparable points exist.
 */
export function computeBandTrend(chronologicalValues: readonly number[]): BandTrendSummary {
  const valid = chronologicalValues.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (valid.length === 0) {
    return {
      status: 'insufficient_data',
      delta: null,
      previous: null,
      current: null,
      sampleCount: 0
    };
  }
  if (valid.length === 1) {
    return {
      status: 'insufficient_data',
      delta: null,
      previous: null,
      current: valid[0],
      sampleCount: 1
    };
  }
  const previous = valid[valid.length - 2];
  const current = valid[valid.length - 1];
  const delta = Math.round((current - previous) * 10) / 10;
  return {
    status: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    delta,
    previous,
    current,
    sampleCount: valid.length
  };
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function computeSeriesSummary(
  chronologicalPoints: Array<{ band: number; timestamp: number }>
): {
  latest: number | null;
  latestTimestamp: number | null;
  average: number | null;
  best: number | null;
  sampleCount: number;
  trend: BandTrendSummary;
} {
  if (chronologicalPoints.length === 0) {
    return {
      latest: null,
      latestTimestamp: null,
      average: null,
      best: null,
      sampleCount: 0,
      trend: computeBandTrend([])
    };
  }

  const values = chronologicalPoints.map((p) => p.band);
  const latestPoint = chronologicalPoints[chronologicalPoints.length - 1];
  const sum = values.reduce((acc, v) => acc + v, 0);
  const best = values.reduce((max, v) => (v > max ? v : max), values[0]);

  return {
    latest: latestPoint.band,
    latestTimestamp: latestPoint.timestamp,
    average: roundToOneDecimal(sum / values.length),
    best,
    sampleCount: values.length,
    trend: computeBandTrend(values)
  };
}

function formatShortDate(timestamp: number): string {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return '—';
  try {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short'
    });
  } catch {
    return '—';
  }
}

/**
 * Single shared read-time historical aggregator for all Dashboard, Progress, Analytics,
 * History, Report, and Achievement consumers.
 *
 * - Never mutates input records.
 * - Sorts chronologically by timestamp for trend/latest/chart computation while preserving
 *   descending order for `evaluatedRecords`.
 * - Incomplete newer attempts NEVER overwrite valid historical latest or personal-best scores.
 */
export function aggregateExamHistory(
  records: readonly ExamHistoryRecord[] | null | undefined,
  options?: { dateRange?: DateRangeFilter }
): AggregatedHistoryMetrics {
  const filtered = filterRecordsByDateRange(records, options?.dateRange);

  // Pair with original index for deterministic tie-breaking when timestamps are equal
  const indexed = filtered.map((record, originalIndex) => ({
    record,
    originalIndex,
    ts: typeof record?.timestamp === 'number' && Number.isFinite(record.timestamp) ? record.timestamp : 0
  }));

  // Descending (newest first) for history feed display
  const newestFirst = [...indexed].sort((a, b) => {
    if (b.ts !== a.ts) return b.ts - a.ts;
    return a.originalIndex - b.originalIndex;
  });

  // Chronological (oldest first) for trend & chart progression
  const oldestFirst = [...indexed].sort((a, b) => {
    if (a.ts !== b.ts) return a.ts - b.ts;
    return b.originalIndex - a.originalIndex;
  });

  const evaluatedNewestFirst = newestFirst.map((item) => evaluateExamHistoryRecord(item.record));
  const evaluatedOldestFirst = oldestFirst.map((item) => evaluateExamHistoryRecord(item.record));

  const overallPoints: Array<{ band: number; timestamp: number }> = [];
  const skillPoints: Record<IeltsSkillKey, Array<{ band: number; timestamp: number }>> = {
    listening: [],
    reading: [],
    writing: [],
    speaking: []
  };

  let completedFullMockCount = 0;
  let incompleteMockCount = 0;
  let partialMultiSkillCount = 0;
  let singleSkillEvaluatedCount = 0;
  let diagnosticOrUnassessedCount = 0;
  let evaluatedAnySkillCount = 0;

  const chartSeries: ChartScorePoint[] = [];

  for (const ev of evaluatedOldestFirst) {
    const ts = typeof ev.record.timestamp === 'number' && Number.isFinite(ev.record.timestamp) ? ev.record.timestamp : 0;

    if (ev.classification === 'completed_full_mock') completedFullMockCount++;
    else if (ev.classification === 'incomplete_mock') incompleteMockCount++;
    else if (ev.classification === 'partial_multi_skill') partialMultiSkillCount++;
    else if (ev.classification === 'single_skill_evaluated') singleSkillEvaluatedCount++;
    else diagnosticOrUnassessedCount++;

    if (ev.hasAnyValidScore) evaluatedAnySkillCount++;

    if (ev.overallBand !== null) {
      overallPoints.push({ band: ev.overallBand, timestamp: ts });
    }
    if (ev.listeningBand !== null) {
      skillPoints.listening.push({ band: ev.listeningBand, timestamp: ts });
    }
    if (ev.readingBand !== null) {
      skillPoints.reading.push({ band: ev.readingBand, timestamp: ts });
    }
    if (ev.writingBand !== null) {
      skillPoints.writing.push({ band: ev.writingBand, timestamp: ts });
    }
    if (ev.speakingBand !== null) {
      skillPoints.speaking.push({ band: ev.speakingBand, timestamp: ts });
    }

    // Include chart points with strict nulls (never 0 for missing skills)
    if (ev.hasAnyValidScore) {
      chartSeries.push({
        id: ev.record.id,
        timestamp: ts,
        dateLabel: formatShortDate(ts),
        classification: ev.classification,
        isCompletedFullMock: ev.isCompletedFullMock,
        overallBand: ev.overallBand,
        listeningBand: ev.listeningBand,
        readingBand: ev.readingBand,
        writingBand: ev.writingBand,
        speakingBand: ev.speakingBand
      });
    }
  }

  const overallSummary = computeSeriesSummary(overallPoints);

  const skills: Record<IeltsSkillKey, SkillAggregateStats> = {
    listening: { skill: 'listening', ...computeSeriesSummary(skillPoints.listening) },
    reading: { skill: 'reading', ...computeSeriesSummary(skillPoints.reading) },
    writing: { skill: 'writing', ...computeSeriesSummary(skillPoints.writing) },
    speaking: { skill: 'speaking', ...computeSeriesSummary(skillPoints.speaking) }
  };

  return {
    totalAttempts: evaluatedNewestFirst.length,
    completedFullMockCount,
    incompleteMockCount,
    partialMultiSkillCount,
    singleSkillEvaluatedCount,
    diagnosticOrUnassessedCount,
    evaluatedAnySkillCount,
    overall: overallSummary,
    skills,
    evaluatedRecords: evaluatedNewestFirst,
    chartSeries,
    fullMockSparklinePoints: overallPoints.map((p) => p.band)
  };
}

// ============================================================================
// CANDIDATE ANALYTICS EVENT VALIDATION & SAFE AGGREGATION
// ============================================================================

export interface CandidateAnalyticsEventLike {
  id: string;
  schemaVersion?: string;
  category?: string;
  eventType: 'practice_started' | 'practice_completed' | 'practice_exited' | 'module_evaluated';
  userId?: string;
  serverTimestamp: number;
  clientTimestamp?: number;
  payload: {
    moduleId: IeltsSkillKey;
    format?: 'Academic' | 'General Training';
    completionStatus?: 'completed' | 'abandoned' | 'in_progress';
    overallBandScore?: number | null;
    criterionScores?: Record<string, number | null | undefined>;
    sectionScores?: Record<string, number>;
    durationSeconds?: number;
    questionCount?: number;
    answeredCount?: number;
    isAiPilot?: boolean;
    assessmentStatus?: string;
    isPartialAssessment?: boolean;
    pronunciationObservable?: boolean;
    evidenceMode?: string;
    isFullMock?: boolean;
  };
}

export interface CriterionAveragesResult {
  values: Record<string, number | null>;
  counts: Record<string, number>;
  hasAnyCriterion: boolean;
}

export interface AggregatedAnalyticsView {
  totalRecorded: number;
  completedCount: number;
  evaluatedCount: number;
  exitedCount: number;
  incompleteOrUnassessedCount: number;
  moduleAttemptCounts: Record<IeltsSkillKey, number>;
  moduleEvaluatedCounts: Record<IeltsSkillKey, number>;
  latestModuleBand: Record<IeltsSkillKey, number | null>;
  bestModuleBand: Record<IeltsSkillKey, number | null>;
  averageModuleBand: Record<IeltsSkillKey, number | null>;
  moduleTrends: Record<IeltsSkillKey, BandTrendSummary>;
  scorePoints: Array<{
    index: number;
    id: string;
    timestamp: number;
    date: string;
    band: number;
    module: string;
    moduleId: IeltsSkillKey;
    format: string;
  }>;
  latestComparableTrend: {
    latestBand: number | null;
    latestModule: string | null;
    latestDate: string | null;
    trend: BandTrendSummary;
  };
  speakingCriteria: CriterionAveragesResult;
  writingCriteria: CriterionAveragesResult;
  moduleComparisonData: Array<{
    name: string;
    moduleId: IeltsSkillKey;
    attempts: number;
    evaluatedCount: number;
    latestBand: number | null;
    bestBand: number | null;
  }>;
  strongestModule: { name: string; band: number } | null;
  weakestModule: { name: string; band: number } | null;
}

/**
 * Extracts a strictly valid half-band score from an analytics event payload.
 * Rejects unavailable, insufficient, partial transcript-only, null, NaN, out-of-range,
 * or non-half-band values. Preserves genuine 0.0 L/R ONLY when questionCount > 0.
 */
export function extractValidAnalyticsEventBand(
  event: CandidateAnalyticsEventLike | null | undefined
): number | null {
  if (!event || !event.payload) return null;
  const p = event.payload;

  if (
    typeof p.assessmentStatus === 'string' &&
    NON_EVALUATED_STATUSES.has(p.assessmentStatus)
  ) {
    return null;
  }
  if (p.isPartialAssessment === true) return null;
  if (p.moduleId === 'speaking') {
    if (p.pronunciationObservable === false || p.evidenceMode === 'transcript_only') {
      return null;
    }
  }
  if (p.completionStatus === 'abandoned' || p.completionStatus === 'in_progress') {
    return null;
  }

  const isObjective = p.moduleId === 'listening' || p.moduleId === 'reading';
  const hasAttemptedQuestions =
    typeof p.questionCount === 'number' &&
    Number.isFinite(p.questionCount) &&
    p.questionCount > 0;
  const minBand = isObjective ? (hasAttemptedQuestions ? 0.0 : 0.5) : 1.0;

  if (!isValidHalfBand(p.overallBandScore, minBand, 9.0)) {
    return null;
  }
  return Math.round(p.overallBandScore * 2) / 2;
}

/**
 * Safely converts ExamHistoryRecord[] into honest CandidateAnalyticsEventLike[] fallback events
 * when server analytics events are empty/unavailable.
 * - Never coerces `full_mock` into `'reading'`.
 * - Never marks incomplete/unassessed attempts as evaluated scores.
 * - Emits valid individual skill events even when other skills in a mock are incomplete.
 */
export function buildSafeHistoryFallbackEvents(
  history: readonly ExamHistoryRecord[] | null | undefined,
  intendedFormat: 'Academic' | 'General Training' = 'Academic',
  userId?: string
): CandidateAnalyticsEventLike[] {
  const agg = aggregateExamHistory(history);
  const events: CandidateAnalyticsEventLike[] = [];

  const skills: IeltsSkillKey[] = ['listening', 'reading', 'writing', 'speaking'];

  for (const ev of agg.evaluatedRecords) {
    const rec = ev.record;
    const ts = typeof rec.timestamp === 'number' && Number.isFinite(rec.timestamp) ? rec.timestamp : 0;
    const skillBands: Record<IeltsSkillKey, number | null> = {
      listening: ev.listeningBand,
      reading: ev.readingBand,
      writing: ev.writingBand,
      speaking: ev.speakingBand
    };

    let emittedAny = false;
    for (const sk of skills) {
      const b = skillBands[sk];
      if (b !== null) {
        emittedAny = true;
        events.push({
          id: `${rec.id}_${sk}`,
          schemaVersion: '1.0',
          category: 'candidate',
          eventType: 'module_evaluated',
          userId,
          serverTimestamp: ts,
          payload: {
            moduleId: sk,
            format: intendedFormat,
            completionStatus: 'completed',
            overallBandScore: b,
            questionCount: sk === 'listening' || sk === 'reading' ? rec.totalQuestions : undefined,
            isFullMock: ev.isCompletedFullMock
          }
        });
      }
    }

    // Preserve unassessed / incomplete attempts as non-scoring activity without a fake band
    if (!emittedAny) {
      const inferredModule: IeltsSkillKey =
        rec.examType === 'listening_only'
          ? 'listening'
          : rec.examType === 'writing_only'
          ? 'writing'
          : rec.examType === 'speaking_only'
          ? 'speaking'
          : 'reading';

      events.push({
        id: `${rec.id}_attempt`,
        schemaVersion: '1.0',
        category: 'candidate',
        eventType: ev.isIncompleteMock ? 'practice_exited' : 'practice_started',
        userId,
        serverTimestamp: ts,
        payload: {
          moduleId: inferredModule,
          format: intendedFormat,
          completionStatus: ev.isIncompleteMock ? 'abandoned' : 'in_progress',
          overallBandScore: null,
          assessmentStatus: 'not_assessed'
        }
      });
    }
  }

  return events;
}

function aggregateCriteriaSafely(
  events: readonly CandidateAnalyticsEventLike[],
  keys: readonly string[],
  allowEvent: (e: CandidateAnalyticsEventLike) => boolean
): CriterionAveragesResult {
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const k of keys) {
    sums[k] = 0;
    counts[k] = 0;
  }

  for (const e of events) {
    if (!allowEvent(e)) continue;
    const cs = e.payload.criterionScores;
    if (!cs || typeof cs !== 'object') continue;
    for (const k of keys) {
      const raw = cs[k];
      if (isValidHalfBand(raw, 1.0, 9.0)) {
        sums[k] += raw;
        counts[k] += 1;
      }
    }
  }

  const values: Record<string, number | null> = {};
  let hasAnyCriterion = false;
  for (const k of keys) {
    if (counts[k] > 0) {
      values[k] = roundToOneDecimal(sums[k] / counts[k]);
      hasAnyCriterion = true;
    } else {
      values[k] = null;
    }
  }

  return { values, counts, hasAnyCriterion };
}

/**
 * Aggregates CandidateAnalyticsPage metrics safely at read time.
 * - Excludes invalid, non-half-band, unavailable, partial transcript-only, and incomplete scores.
 * - Never plots missing module scores as 0 (`latestBand: null`).
 * - Computes improvement/decline delta ONLY across comparable same-module evaluated sessions.
 * - Computes Writing & Speaking criterion averages with independent valid denominators.
 */
export function aggregateCandidateAnalyticsEvents(
  rawEvents: readonly CandidateAnalyticsEventLike[] | null | undefined,
  options?: {
    format?: 'All' | 'Academic' | 'General Training';
    dateRange?: DateRangeFilter;
  }
): AggregatedAnalyticsView {
  const list = Array.isArray(rawEvents) ? rawEvents : [];
  const selectedFormat = options?.format || 'All';

  const filtered = list.filter((e) => {
    if (!e || !e.payload) return false;
    if (selectedFormat !== 'All' && e.payload.format && e.payload.format !== selectedFormat) {
      return false;
    }
    const ts = e.serverTimestamp;
    if (options?.dateRange) {
      if (
        typeof options.dateRange.fromTimestamp === 'number' &&
        Number.isFinite(options.dateRange.fromTimestamp) &&
        ts < options.dateRange.fromTimestamp
      ) {
        return false;
      }
      if (
        typeof options.dateRange.toTimestamp === 'number' &&
        Number.isFinite(options.dateRange.toTimestamp) &&
        ts > options.dateRange.toTimestamp
      ) {
        return false;
      }
    }
    return true;
  });

  const chronological = [...filtered].sort((a, b) => a.serverTimestamp - b.serverTimestamp);

  const totalRecorded = chronological.length;
  let completedCount = 0;
  let evaluatedCount = 0;
  let exitedCount = 0;
  let incompleteOrUnassessedCount = 0;

  const moduleAttemptCounts: Record<IeltsSkillKey, number> = {
    listening: 0,
    reading: 0,
    writing: 0,
    speaking: 0
  };
  const moduleScoredPoints: Record<IeltsSkillKey, Array<{ band: number; timestamp: number }>> = {
    listening: [],
    reading: [],
    writing: [],
    speaking: []
  };

  const scorePoints: AggregatedAnalyticsView['scorePoints'] = [];

  for (const e of chronological) {
    const mod = e.payload.moduleId;
    if (mod in moduleAttemptCounts) {
      moduleAttemptCounts[mod] += 1;
    }

    const validBand = extractValidAnalyticsEventBand(e);
    const isExited = e.eventType === 'practice_exited' || e.payload.completionStatus === 'abandoned';
    const isCompleted =
      !isExited &&
      (e.eventType === 'practice_completed' ||
        e.payload.completionStatus === 'completed' ||
        validBand !== null);

    if (isExited) exitedCount++;
    if (isCompleted) completedCount++;

    if (validBand !== null) {
      evaluatedCount++;
      moduleScoredPoints[mod].push({ band: validBand, timestamp: e.serverTimestamp });
      scorePoints.push({
        index: scorePoints.length + 1,
        id: e.id,
        timestamp: e.serverTimestamp,
        date: formatShortDate(e.serverTimestamp),
        band: validBand,
        module: mod.toUpperCase(),
        moduleId: mod,
        format: e.payload.format || 'Academic'
      });
    } else {
      incompleteOrUnassessedCount++;
    }
  }

  const listeningSum = computeSeriesSummary(moduleScoredPoints.listening);
  const readingSum = computeSeriesSummary(moduleScoredPoints.reading);
  const writingSum = computeSeriesSummary(moduleScoredPoints.writing);
  const speakingSum = computeSeriesSummary(moduleScoredPoints.speaking);

  const latestModuleBand: Record<IeltsSkillKey, number | null> = {
    listening: listeningSum.latest,
    reading: readingSum.latest,
    writing: writingSum.latest,
    speaking: speakingSum.latest
  };
  const bestModuleBand: Record<IeltsSkillKey, number | null> = {
    listening: listeningSum.best,
    reading: readingSum.best,
    writing: writingSum.best,
    speaking: speakingSum.best
  };
  const averageModuleBand: Record<IeltsSkillKey, number | null> = {
    listening: listeningSum.average,
    reading: readingSum.average,
    writing: writingSum.average,
    speaking: speakingSum.average
  };
  const moduleEvaluatedCounts: Record<IeltsSkillKey, number> = {
    listening: listeningSum.sampleCount,
    reading: readingSum.sampleCount,
    writing: writingSum.sampleCount,
    speaking: speakingSum.sampleCount
  };
  const moduleTrends: Record<IeltsSkillKey, BandTrendSummary> = {
    listening: listeningSum.trend,
    reading: readingSum.trend,
    writing: writingSum.trend,
    speaking: speakingSum.trend
  };

  // Latest evaluated score & comparable same-module trend (NEVER compares Reading vs Writing!)
  const latestPoint = scorePoints.length > 0 ? scorePoints[scorePoints.length - 1] : null;
  const latestComparableTrend = latestPoint
    ? {
        latestBand: latestPoint.band,
        latestModule: latestPoint.module,
        latestDate: latestPoint.date,
        trend: moduleTrends[latestPoint.moduleId]
      }
    : {
        latestBand: null,
        latestModule: null,
        latestDate: null,
        trend: computeBandTrend([])
      };

  // Independent valid criterion averages (Speaking excludes transcript-only / partial / unobservable PR)
  const speakingCriteria = aggregateCriteriaSafely(
    chronological.filter((e) => e.payload.moduleId === 'speaking'),
    ['fc', 'lr', 'gra', 'pr'],
    (e) => extractValidAnalyticsEventBand(e) !== null
  );
  const writingCriteria = aggregateCriteriaSafely(
    chronological.filter((e) => e.payload.moduleId === 'writing'),
    ['ta', 'cc', 'lr', 'gra'],
    (e) => extractValidAnalyticsEventBand(e) !== null
  );

  // Never convert missing scores to 0 in comparison data
  const moduleComparisonData: AggregatedAnalyticsView['moduleComparisonData'] = [
    {
      name: 'Listening',
      moduleId: 'listening',
      attempts: moduleAttemptCounts.listening,
      evaluatedCount: moduleEvaluatedCounts.listening,
      latestBand: latestModuleBand.listening,
      bestBand: bestModuleBand.listening
    },
    {
      name: 'Reading',
      moduleId: 'reading',
      attempts: moduleAttemptCounts.reading,
      evaluatedCount: moduleEvaluatedCounts.reading,
      latestBand: latestModuleBand.reading,
      bestBand: bestModuleBand.reading
    },
    {
      name: 'Writing',
      moduleId: 'writing',
      attempts: moduleAttemptCounts.writing,
      evaluatedCount: moduleEvaluatedCounts.writing,
      latestBand: latestModuleBand.writing,
      bestBand: bestModuleBand.writing
    },
    {
      name: 'Speaking',
      moduleId: 'speaking',
      attempts: moduleAttemptCounts.speaking,
      evaluatedCount: moduleEvaluatedCounts.speaking,
      latestBand: latestModuleBand.speaking,
      bestBand: bestModuleBand.speaking
    }
  ];

  const scoredModules = moduleComparisonData
    .filter((m): m is typeof m & { latestBand: number } => m.latestBand !== null)
    .map((m) => ({ name: m.name, band: m.latestBand }));

  let strongestModule: { name: string; band: number } | null = null;
  let weakestModule: { name: string; band: number } | null = null;
  if (scoredModules.length >= 2) {
    scoredModules.sort((a, b) => b.band - a.band);
    strongestModule = scoredModules[0];
    weakestModule = scoredModules[scoredModules.length - 1];
  }

  return {
    totalRecorded,
    completedCount,
    evaluatedCount,
    exitedCount,
    incompleteOrUnassessedCount,
    moduleAttemptCounts,
    moduleEvaluatedCounts,
    latestModuleBand,
    bestModuleBand,
    averageModuleBand,
    moduleTrends,
    scorePoints,
    latestComparableTrend,
    speakingCriteria,
    writingCriteria,
    moduleComparisonData,
    strongestModule,
    weakestModule
  };
}
