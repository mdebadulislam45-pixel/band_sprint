import { getStoredSessionToken } from './authService';
import type { MockExamSet } from '../data/mockExams';

export type CandidatePilotModule = 'academic_reading' | 'listening' | 'writing' | 'speaking';

export type CandidateDraftLifecycleStatus =
  | 'GENERATING'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'VALIDATION_FAILED'
  | 'FAILED';

export type CandidateDraftValidationStatus = 'PASSED' | 'REPAIRED' | 'FAILED';

export interface CandidateDraftSummaryItem {
  id: string;
  createdAt: number;
  updatedAt?: number;
  examType: CandidatePilotModule;
  status: CandidateDraftLifecycleStatus;
  validationStatus: CandidateDraftValidationStatus;
  repairAttempts: number;
  reviewedAt?: number;
  rejectionReason?: string;
  title?: string;
  format?: 'Academic' | 'General Training';
  difficulty?: string;
  topicDomain?: string;
  canLaunch?: boolean;
  validationFindings?: {
    passed: boolean;
    structuralOk: boolean;
    answersOk: boolean;
    evidenceOk: boolean;
    qualityOk: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface CandidateDraftStatusDescriptor {
  status: CandidateDraftLifecycleStatus;
  badgeLabel: string;
  headline: string;
  description: string;
  nextAction: string;
  isTerminal: boolean;
  canLaunch: boolean;
  canRetryGeneration: boolean;
  tone: 'amber' | 'blue' | 'emerald' | 'rose' | 'slate';
  rejectionReason?: string;
}

export interface SpeakingPilotNestedExamSet {
  id: string;
  examId: string;
  title: string;
  source: string;
  badge: string;
  format: 'Academic' | 'General Training';
  difficulty: string;
  topicDomain: string;
  isAiPilot: boolean;
  part1: {
    topicGroups: Array<{
      topicId: string;
      title: string;
      questions: Array<{
        id: string;
        prompt: string;
      }>;
    }>;
  };
  part2: {
    id: string;
    topic: string;
    instructions: string;
    bulletPrompts: string[];
    preparationTimeSeconds: number;
    speakingTimeSeconds: number;
    roundingOffQuestion?: string;
    examinerIntro?: string;
  };
  part3: {
    themes: Array<{
      themeId: string;
      title: string;
      connectedPart2Theme: string;
      questions: Array<{
        id: string;
        prompt: string;
        examinerProbeNotes?: string;
      }>;
    }>;
  };
}

export interface SpeakingQuestionItem {
  id: string;
  part: 1 | 2 | 3;
  topic: string;
  question: string;
  prompt?: string;
  followUps?: string[];
  cueCardBullets?: string[];
  cueCardPrompts?: string[];
  followUpQuestions?: string[];
  sampleBand8Response?: string;
  keyLexicalItems?: string[];
  targetBand?: number | string;
}

export interface AdaptedSpeakingPilotForExaminer {
  id: string;
  examId: string;
  title: string;
  format: 'Academic' | 'General Training';
  difficulty: string;
  topicDomain: string;
  bannerText: 'AI PILOT — APPROVED PRACTICE';
  part1TopicGroups: SpeakingPilotNestedExamSet['part1']['topicGroups'];
  part1Questions: Array<SpeakingQuestionItem & { topicId?: string }>;
  part2CueCard: SpeakingQuestionItem & {
    instructions?: string;
    preparationTimeSeconds: number;
    speakingTimeSeconds: number;
    roundingOffQuestion?: string;
    examinerIntro?: string;
  };
  part3Themes: SpeakingPilotNestedExamSet['part3']['themes'];
  part3Questions: Array<
    SpeakingQuestionItem & {
      themeId?: string;
      connectedPart2Theme?: string;
      examinerProbeNotes?: string;
    }
  >;
}

const MODULE_ENDPOINTS: Record<
  CandidatePilotModule,
  {
    generate: string;
    listDrafts: string;
    draftById: (id: string) => string;
    pilotById: (id: string) => string;
  }
> = {
  academic_reading: {
    generate: '/api/ai/reading/generate',
    listDrafts: '/api/ai/reading/drafts',
    draftById: (id: string) => `/api/ai/reading/drafts/${encodeURIComponent(id)}`,
    pilotById: (id: string) => `/api/ai/reading/pilot/${encodeURIComponent(id)}`,
  },
  listening: {
    generate: '/api/ai/listening/generate',
    listDrafts: '/api/ai/listening/drafts',
    draftById: (id: string) => `/api/ai/listening/drafts/${encodeURIComponent(id)}`,
    pilotById: (id: string) => `/api/ai/listening/pilot/${encodeURIComponent(id)}`,
  },
  writing: {
    generate: '/api/ai/writing/generate',
    listDrafts: '/api/ai/writing/drafts',
    draftById: (id: string) => `/api/ai/writing/drafts/${encodeURIComponent(id)}`,
    pilotById: (id: string) => `/api/ai/writing/pilot/${encodeURIComponent(id)}`,
  },
  speaking: {
    generate: '/api/ai/speaking/generate',
    listDrafts: '/api/ai/speaking/drafts',
    draftById: (id: string) => `/api/ai/speaking/drafts/${encodeURIComponent(id)}`,
    pilotById: (id: string) => `/api/ai/speaking/pilot/${encodeURIComponent(id)}`,
  },
};

const ACTIVE_DRAFT_STORAGE_PREFIX = 'ielts_candidate_active_ai_draft_v1_';
const memoryActiveDraftStore = new Map<CandidatePilotModule, string>();

export function getActiveCandidateDraftId(module: CandidatePilotModule): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(`${ACTIVE_DRAFT_STORAGE_PREFIX}${module}`);
    }
  } catch {
    // Fallback to in-memory map
  }
  return memoryActiveDraftStore.get(module) || null;
}

export function setActiveCandidateDraftId(module: CandidatePilotModule, draftId: string | null): void {
  if (draftId) {
    memoryActiveDraftStore.set(module, draftId);
  } else {
    memoryActiveDraftStore.delete(module);
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (draftId) {
        window.localStorage.setItem(`${ACTIVE_DRAFT_STORAGE_PREFIX}${module}`, draftId);
      } else {
        window.localStorage.removeItem(`${ACTIVE_DRAFT_STORAGE_PREFIX}${module}`);
      }
    }
  } catch {
    // Ignore storage quota/access errors
  }
}

/**
 * Resolves the real authenticated session token from authService (never user.id).
 */
export function resolveCandidateAuthHeaders(explicitToken?: string | null): Record<string, string> {
  const token = explicitToken !== undefined ? explicitToken : getStoredSessionToken();
  if (!token || typeof token !== 'string' || !token.trim()) {
    const err = new Error('Please sign in with an active candidate session to access AI Pilot practice.');
    (err as any).status = 401;
    (err as any).code = 'AUTH_SESSION_REQUIRED';
    throw err;
  }
  return {
    Authorization: `Bearer ${token.trim()}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Maps any draft lifecycle state into a truthful, non-misleading candidate status descriptor.
 * 
 * Persisted Lifecycle States (exactly 6):
 * 1. 'GENERATING': Draft is being synthesized and validated by QuestionFactory.
 * 2. 'PENDING_REVIEW': Draft completed validation; awaiting explicit admin review before candidate access.
 * 3. 'APPROVED': Explicitly approved by admin. (Can launch if validationStatus is PASSED/REPAIRED).
 * 4. 'REJECTED': Explicitly rejected by admin with reason.
 * 5. 'VALIDATION_FAILED': Did not pass internal IELTS rubric / schema checks during generation.
 * 6. 'FAILED': Operational failure or timeout during generation.
 * 
 * Derived UI Presentation States:
 * - 'Approved — Ineligible to Launch': Persisted status is 'APPROVED' but validationStatus is FAILED
 *   or incomplete. Rendered with an amber warning badge to clearly convey that structural checks
 *   prevent practice launch despite admin approval.
 */
export function getCandidateDraftStatusDescriptor(
  draft: Pick<CandidateDraftSummaryItem, 'status' | 'validationStatus' | 'rejectionReason'>
): CandidateDraftStatusDescriptor {
  const isValidationOk =
    draft.validationStatus === 'PASSED' || draft.validationStatus === 'REPAIRED';

  switch (draft.status) {
    case 'GENERATING':
      return {
        status: 'GENERATING',
        badgeLabel: 'Generating & Validating',
        headline: 'Generating and validating your AI practice draft.',
        description:
          'Automated schema, answer-key, and IELTS rubric checks are currently running on your draft.',
        nextAction: 'Please wait a moment while generation and automated validation finish.',
        isTerminal: false,
        canLaunch: false,
        canRetryGeneration: false,
        tone: 'blue',
      };
    case 'PENDING_REVIEW':
      return {
        status: 'PENDING_REVIEW',
        badgeLabel: 'Awaiting Administrator Review',
        headline: 'Generated and validated. Waiting for administrator review before candidate access.',
        description:
          'Automated validation passed. An administrator must explicitly review and approve this draft before it can be launched for candidate practice.',
        nextAction: 'Check back later or click Refresh Status to see if an administrator has approved this draft.',
        isTerminal: false,
        canLaunch: false,
        canRetryGeneration: false,
        tone: 'amber',
      };
    case 'APPROVED':
      return {
        status: 'APPROVED',
        badgeLabel: isValidationOk ? 'Approved — Ready to Start' : 'Approved — Ineligible to Launch',
        headline: isValidationOk
          ? 'Approved for AI Pilot practice. You can now launch this exam.'
          : 'Administrator approved, but this practice set cannot currently be launched because its structural checks are incomplete.',
        description: isValidationOk
          ? 'This AI Pilot draft has been reviewed and approved by an administrator for candidate practice.'
          : 'Although marked approved by an administrator, the exam package does not satisfy structural integrity requirements and cannot be started.',
        nextAction: isValidationOk
          ? 'Click "Start Approved AI Pilot" to begin your timed practice session.'
          : 'This practice set cannot be launched. You may request a new practice draft on the left or practice standard Sprint sets.',
        isTerminal: true,
        canLaunch: isValidationOk,
        canRetryGeneration: !isValidationOk,
        tone: isValidationOk ? 'emerald' : 'amber',
      };
    case 'REJECTED':
      return {
        status: 'REJECTED',
        badgeLabel: 'Not Approved',
        headline: 'This draft was not approved for candidate practice.',
        description:
          'An administrator reviewed this draft and declined it for candidate practice.',
        nextAction: 'You may request a new practice draft on the left or practice standard Sprint sets.',
        isTerminal: true,
        canLaunch: false,
        canRetryGeneration: true,
        tone: 'rose',
        rejectionReason: draft.rejectionReason,
      };
    case 'VALIDATION_FAILED':
      return {
        status: 'VALIDATION_FAILED',
        badgeLabel: 'Quality Check Failed',
        headline: 'This draft did not pass automated quality checks and cannot be launched.',
        description:
          'The generated draft did not meet strict IELTS structural or answer-verifiability requirements.',
        nextAction: 'You may request a new practice draft or use static Sprint practice tests.',
        isTerminal: true,
        canLaunch: false,
        canRetryGeneration: true,
        tone: 'rose',
      };
    case 'FAILED':
    default:
      return {
        status: 'FAILED',
        badgeLabel: 'Generation Incomplete',
        headline: 'Generation could not be completed.',
        description:
          'You may try generating a new draft when within your monthly generation quota.',
        nextAction: 'You may try generating a new draft or practice existing static mock tests.',
        isTerminal: true,
        canLaunch: false,
        canRetryGeneration: true,
        tone: 'slate',
      };
  }
}

export function isTerminalCandidateDraftStatus(status: CandidateDraftLifecycleStatus): boolean {
  return (
    status === 'APPROVED' ||
    status === 'REJECTED' ||
    status === 'VALIDATION_FAILED' ||
    status === 'FAILED'
  );
}

/**
 * Monotonic guard that prevents stale out-of-order polling responses from overwriting newer draft state.
 * Required invariants:
 * 1. APPROVED must never be overwritten by stale GENERATING or PENDING_REVIEW.
 * 2. REJECTED must never be overwritten by stale GENERATING or PENDING_REVIEW.
 * 3. Conflicting terminal states (APPROVED vs REJECTED) must never be silently accepted as ordinary timestamp updates.
 * 4. Older timestamps must not overwrite newer lifecycle states.
 * 5. Equal timestamps must be handled deterministically.
 * 6. Missing or malformed timestamps must not bypass lifecycle protections.
 * 7. A terminal state must not be downgraded by a delayed network response.
 * 8. A newer authoritative server response may only change a terminal state through a valid server-side lifecycle transition.
 */
export function shouldApplyCandidateDraftUpdate(
  currentDraft: CandidateDraftSummaryItem | null,
  incomingDraft: CandidateDraftSummaryItem,
  requestSeq: number,
  latestAppliedSeq: number
): boolean {
  if (requestSeq < latestAppliedSeq) {
    return false;
  }
  if (!currentDraft) {
    return true;
  }
  if (currentDraft.id === incomingDraft.id) {
    const currentTs = Number(currentDraft.updatedAt) || Number(currentDraft.createdAt) || 0;
    const incomingTs = Number(incomingDraft.updatedAt) || Number(incomingDraft.createdAt) || 0;

    // Reject older timestamps regardless of sequence
    if (incomingTs < currentTs) {
      return false;
    }

    const currentIsTerminal = isTerminalCandidateDraftStatus(currentDraft.status);
    const incomingIsTerminal = isTerminalCandidateDraftStatus(incomingDraft.status);

    // Rule 1, 2, 7: Never regress from a terminal state back to non-terminal
    if (currentIsTerminal && !incomingIsTerminal) {
      return false;
    }

    // Rule 3: Conflicting terminal states (e.g. APPROVED vs REJECTED) must never be silently accepted
    if (
      (currentDraft.status === 'APPROVED' && incomingDraft.status === 'REJECTED') ||
      (currentDraft.status === 'REJECTED' && incomingDraft.status === 'APPROVED')
    ) {
      // Conflicting terminal states on equal or older timestamps are rejected
      if (incomingTs <= currentTs) {
        return false;
      }
      // If incoming timestamp is strictly newer and request sequence is strictly newer, it is only allowed if authoritative
    }

    // Rule 5: Equal timestamps must be handled deterministically
    if (incomingTs === currentTs) {
      // If both terminal, do not flip status on equal timestamps
      if (currentIsTerminal && incomingIsTerminal && currentDraft.status !== incomingDraft.status) {
        return false;
      }
      // If current is terminal and incoming is not, already rejected above.
      // If incoming is terminal and current is not, allow progression.
      if (!currentIsTerminal && incomingIsTerminal) {
        return true;
      }
      // Same status: accept only if strictly newer sequence
      return requestSeq > latestAppliedSeq;
    }
  }
  return true;
}

// Track in-flight candidate actions per module to prevent duplicate submissions
const inFlightGenerateByModule = new Map<CandidatePilotModule, Promise<any>>();
const inFlightLaunchByDraftId = new Map<string, Promise<any>>();

export function isModuleGenerationInFlight(module: CandidatePilotModule): boolean {
  return inFlightGenerateByModule.has(module);
}

export function isDraftLaunchInFlight(draftId: string): boolean {
  return inFlightLaunchByDraftId.has(draftId);
}

export interface GenerateCandidatePilotOptions {
  module: CandidatePilotModule;
  format?: 'Academic' | 'General Training';
  topicSeed?: string;
  difficulty?: string;
  task1Type?: string;
  essayType?: string;
  token?: string | null;
  fetchImpl?: typeof fetch;
}

export async function generateCandidatePilotDraft(
  options: GenerateCandidatePilotOptions
): Promise<{
  draftId: string;
  status: CandidateDraftLifecycleStatus;
  validationStatus: CandidateDraftValidationStatus;
  contentSummary?: any;
}> {
  const { module, fetchImpl = fetch } = options;
  if (inFlightGenerateByModule.has(module)) {
    const err = new Error('A draft generation request for this module is already in progress.');
    (err as any).status = 409;
    (err as any).code = 'GENERATION_ALREADY_IN_FLIGHT';
    throw err;
  }

  const task = (async () => {
    const headers = resolveCandidateAuthHeaders(options.token);
    const endpoint = MODULE_ENDPOINTS[module].generate;
    const payload: Record<string, any> = {};
    if (options.format) payload.format = options.format;
    if (options.topicSeed) payload.topicSeed = options.topicSeed;
    if (options.difficulty) payload.difficulty = options.difficulty;
    if (options.task1Type) payload.task1Type = options.task1Type;
    if (options.essayType) payload.essayType = options.essayType;

    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      const err = new Error(
        data.error || `Could not generate ${module.replace('_', ' ')} AI draft.`
      );
      (err as any).status = response.status;
      (err as any).code = data.code;
      throw err;
    }

    if (data.draftId) {
      setActiveCandidateDraftId(module, data.draftId);
    }

    return {
      draftId: String(data.draftId),
      status: (data.status || 'PENDING_REVIEW') as CandidateDraftLifecycleStatus,
      validationStatus: (data.validationStatus || 'PASSED') as CandidateDraftValidationStatus,
      contentSummary: data.contentSummary,
    };
  })();

  inFlightGenerateByModule.set(module, task);
  try {
    return await task;
  } finally {
    inFlightGenerateByModule.delete(module);
  }
}

export async function fetchCandidateModuleDrafts(
  module: CandidatePilotModule,
  options?: { token?: string | null; fetchImpl?: typeof fetch }
): Promise<CandidateDraftSummaryItem[]> {
  const fetchImpl = options?.fetchImpl || fetch;
  const headers = resolveCandidateAuthHeaders(options?.token);
  const response = await fetchImpl(MODULE_ENDPOINTS[module].listDrafts, {
    method: 'GET',
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    const err = new Error(data.error || 'Failed to load AI draft status list.');
    (err as any).status = response.status;
    (err as any).code = data.code;
    throw err;
  }

  return Array.isArray(data.drafts) ? data.drafts : [];
}

export async function fetchCandidateDraftStatusById(
  module: CandidatePilotModule,
  draftId: string,
  options?: { token?: string | null; fetchImpl?: typeof fetch }
): Promise<CandidateDraftSummaryItem> {
  const fetchImpl = options?.fetchImpl || fetch;
  const headers = resolveCandidateAuthHeaders(options?.token);
  const response = await fetchImpl(MODULE_ENDPOINTS[module].draftById(draftId), {
    method: 'GET',
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success || !data.draft) {
    const err = new Error(data.error || 'Failed to retrieve AI draft status.');
    (err as any).status = response.status;
    (err as any).code = data.code;
    throw err;
  }

  return data.draft as CandidateDraftSummaryItem;
}

export async function fetchApprovedCandidatePilotExamSet<T = MockExamSet | SpeakingPilotNestedExamSet>(
  module: CandidatePilotModule,
  draftId: string,
  options?: { token?: string | null; fetchImpl?: typeof fetch }
): Promise<T> {
  if (!draftId || !draftId.trim()) {
    throw new Error('Draft ID is required to launch an approved AI Pilot.');
  }
  const lockKey = `${module}:${draftId}`;
  if (inFlightLaunchByDraftId.has(lockKey)) {
    return inFlightLaunchByDraftId.get(lockKey) as Promise<T>;
  }

  const task = (async () => {
    const fetchImpl = options?.fetchImpl || fetch;
    const headers = resolveCandidateAuthHeaders(options?.token);
    const response = await fetchImpl(MODULE_ENDPOINTS[module].pilotById(draftId), {
      method: 'GET',
      headers,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success || !data.examSet) {
      const err = new Error(
        data.error ||
          'This AI draft is not approved for candidate practice yet. Only administrator-approved drafts can be launched.'
      );
      (err as any).status = response.status;
      (err as any).code = data.code;
      throw err;
    }

    setActiveCandidateDraftId(module, draftId);
    return data.examSet as T;
  })();

  inFlightLaunchByDraftId.set(lockKey, task);
  try {
    return await task;
  } finally {
    inFlightLaunchByDraftId.delete(lockKey);
  }
}

/**
 * Adapts a server-returned Speaking AI Pilot set (preserving nested part1.topicGroups, part2, and part3.themes)
 * into the turn structures consumed by VoiceExaminer.tsx.
 * Throws if the pilot set is missing required nested sections.
 */
export function adaptSpeakingPilotSetForExaminer(
  pilotSet: SpeakingPilotNestedExamSet | any
): AdaptedSpeakingPilotForExaminer {
  if (!pilotSet || typeof pilotSet !== 'object') {
    throw new Error('Invalid Speaking AI Pilot payload: missing examSet object.');
  }

  const topicGroups = pilotSet.part1?.topicGroups;
  const cueCard = pilotSet.part2;
  const themes = pilotSet.part3?.themes;

  if (!Array.isArray(topicGroups) || topicGroups.length === 0) {
    throw new Error('Invalid Speaking AI Pilot payload: part1.topicGroups is missing or empty.');
  }
  if (!cueCard || typeof cueCard !== 'object' || !String(cueCard.topic || '').trim()) {
    throw new Error('Invalid Speaking AI Pilot payload: part2 cue card topic is missing.');
  }
  if (!Array.isArray(cueCard.bulletPrompts) || cueCard.bulletPrompts.length === 0) {
    throw new Error('Invalid Speaking AI Pilot payload: part2.bulletPrompts is missing or empty.');
  }
  if (!Array.isArray(themes) || themes.length === 0) {
    throw new Error('Invalid Speaking AI Pilot payload: part3.themes is missing or empty.');
  }

  const part1Questions: Array<SpeakingQuestionItem & { topicId?: string }> = [];
  topicGroups.forEach((group: any, gIdx: number) => {
    const groupTitle = String(group?.title || `Topic ${gIdx + 1}`).trim();
    const groupTopicId = String(group?.topicId || `tg_${gIdx + 1}`);
    const questions = Array.isArray(group?.questions) ? group.questions : [];
    questions.forEach((q: any, qIdx: number) => {
      const prompt = String(q?.prompt || q?.question || '').trim();
      if (prompt) {
        part1Questions.push({
          id: String(q?.id || `p1_${gIdx + 1}_${qIdx + 1}`),
          part: 1,
          topic: groupTitle,
          question: prompt,
          followUps: [],
          targetBand: '7.0+',
          topicId: groupTopicId,
        });
      }
    });
  });

  if (part1Questions.length === 0) {
    throw new Error('Invalid Speaking AI Pilot payload: part1.topicGroups contains no valid questions.');
  }

  const part3Questions: Array<
    SpeakingQuestionItem & {
      themeId?: string;
      connectedPart2Theme?: string;
      examinerProbeNotes?: string;
    }
  > = [];
  themes.forEach((theme: any, tIdx: number) => {
    const themeTitle = String(theme?.title || `Discussion Theme ${tIdx + 1}`).trim();
    const themeId = String(theme?.themeId || `th_${tIdx + 1}`);
    const connectedPart2Theme = String(theme?.connectedPart2Theme || cueCard.topic || '');
    const questions = Array.isArray(theme?.questions) ? theme.questions : [];
    questions.forEach((q: any, qIdx: number) => {
      const prompt = String(q?.prompt || q?.question || '').trim();
      if (prompt) {
        const probe = String(q?.examinerProbeNotes || '').trim();
        part3Questions.push({
          id: String(q?.id || `p3_${tIdx + 1}_${qIdx + 1}`),
          part: 3,
          topic: themeTitle,
          question: prompt,
          followUps: probe ? [probe] : [],
          targetBand: '7.5+',
          themeId,
          connectedPart2Theme,
          examinerProbeNotes: probe || undefined,
        });
      }
    });
  });

  if (part3Questions.length === 0) {
    throw new Error('Invalid Speaking AI Pilot payload: part3.themes contains no valid questions.');
  }

  const part2CueCard: AdaptedSpeakingPilotForExaminer['part2CueCard'] = {
    id: String(cueCard.id || 'q_p2_cue_01'),
    part: 2,
    topic: String(cueCard.topic).trim(),
    question: String(cueCard.topic).trim(),
    cueCardPrompts: cueCard.bulletPrompts.map((b: any) => String(b)),
    instructions: String(cueCard.instructions || 'You should say:'),
    preparationTimeSeconds: Number(cueCard.preparationTimeSeconds) || 60,
    speakingTimeSeconds: Number(cueCard.speakingTimeSeconds) || 120,
    roundingOffQuestion: cueCard.roundingOffQuestion ? String(cueCard.roundingOffQuestion) : undefined,
    examinerIntro: cueCard.examinerIntro ? String(cueCard.examinerIntro) : undefined,
    targetBand: '7.5+',
  };

  return {
    id: String(pilotSet.id || pilotSet.examId || 'speaking_pilot'),
    examId: String(pilotSet.examId || pilotSet.id || 'speaking_pilot'),
    title: String(pilotSet.title || 'AI Pilot Speaking Exam'),
    format: pilotSet.format === 'General Training' ? 'General Training' : 'Academic',
    difficulty: String(pilotSet.difficulty || 'Standard'),
    topicDomain: String(pilotSet.topicDomain || 'General'),
    bannerText: 'AI PILOT — APPROVED PRACTICE',
    part1TopicGroups: topicGroups,
    part1Questions,
    part2CueCard,
    part3Themes: themes,
    part3Questions,
  };
}

export interface BoundedDraftPollerOptions {
  intervalMs?: number;
  maxAttempts?: number;
  isHidden?: () => boolean;
  pollFn: (seq: number) => Promise<CandidateDraftSummaryItem | null>;
  onUpdate: (draft: CandidateDraftSummaryItem, seq: number) => void;
  onStop?: (reason: 'terminal_status' | 'max_attempts' | 'manual_stop' | 'error') => void;
}

export interface BoundedDraftPollerController {
  start: () => void;
  stop: () => void;
  triggerNow: () => Promise<CandidateDraftSummaryItem | null>;
  isRunning: () => boolean;
  getAttemptCount: () => number;
}

/**
 * Bounded status poller for non-terminal drafts (GENERATING or PENDING_REVIEW).
 * Automatically skips hidden-tab ticks, ignores out-of-order responses, and stops on terminal states.
 */
export function createBoundedDraftPoller(
  options: BoundedDraftPollerOptions
): BoundedDraftPollerController {
  const intervalMs = options.intervalMs ?? 8000;
  const maxAttempts = options.maxAttempts ?? 30;
  const isHidden =
    options.isHidden ?? (() => typeof document !== 'undefined' && Boolean(document.hidden));

  let timer: ReturnType<typeof setInterval> | null = null;
  let running = false;
  let attempts = 0;
  let seqCounter = 0;
  let latestAppliedSeq = 0;
  let latestDraft: CandidateDraftSummaryItem | null = null;

  const stopInternal = (
    reason: 'terminal_status' | 'max_attempts' | 'manual_stop' | 'error'
  ) => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (running) {
      running = false;
      options.onStop?.(reason);
    }
  };

  const executeTick = async (): Promise<CandidateDraftSummaryItem | null> => {
    const mySeq = ++seqCounter;
    try {
      const draft = await options.pollFn(mySeq);
      if (!draft) {
        return null;
      }
      if (shouldApplyCandidateDraftUpdate(latestDraft, draft, mySeq, latestAppliedSeq)) {
        latestAppliedSeq = mySeq;
        latestDraft = draft;
        options.onUpdate(draft, mySeq);
        if (isTerminalCandidateDraftStatus(draft.status)) {
          stopInternal('terminal_status');
        }
      }
      return latestDraft;
    } catch {
      return null;
    }
  };

  return {
    start() {
      if (running) return;
      running = true;
      attempts = 0;
      timer = setInterval(() => {
        if (!running) return;
        if (isHidden()) {
          return;
        }
        attempts += 1;
        if (attempts > maxAttempts) {
          stopInternal('max_attempts');
          return;
        }
        void executeTick();
      }, intervalMs);
    },
    stop() {
      stopInternal('manual_stop');
    },
    async triggerNow() {
      return executeTick();
    },
    isRunning() {
      return running;
    },
    getAttemptCount() {
      return attempts;
    },
  };
}
