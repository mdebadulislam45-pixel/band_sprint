import { UserProfile, UserProgress, ExamHistoryRecord } from '../types';
import { trackLogin } from '../services/analyticsService';

export const ACTIVE_USER_KEY = 'ielts_active_user_id_v1';
export const USERS_DIR_KEY = 'ielts_users_directory_v1';

const getTodayString = () => new Date().toISOString().split('T')[0];

export const createDefaultProgress = (targetBand: number = 7.5, name: string = 'Candidate'): UserProgress => ({
  completedModules: ['beginner'],
  targetBand,
  targetCountry: 'United Kingdom / Canada / Australia',
  intendedFormat: 'Academic',
  examHistory: [],
  streakDays: 1,
  lastActiveDate: getTodayString(),
  wordsWrittenTotal: 0,
});

// Seed default accounts if directory is completely empty
export function getAllUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(USERS_DIR_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Returns currently logged in user, or null if no user is authenticated.
 */
export function getActiveUser(): UserProfile | null {
  try {
    const activeId = localStorage.getItem(ACTIVE_USER_KEY);
    if (!activeId) return null;
    if (activeId.startsWith('demo_candidate_')) {
      localStorage.removeItem(ACTIVE_USER_KEY);
      return null;
    }

    const users = getAllUsers();
    const found = users.find(u => u.id === activeId);
    if (found && !found.id.startsWith('demo_candidate_')) {
      return found;
    }
    // Stale or deleted active ID
    localStorage.removeItem(ACTIVE_USER_KEY);
    return null;
  } catch {
    return null;
  }
}

/**
 * Convenience alias for active user
 */
export function getCurrentUser(): UserProfile | null {
  return getActiveUser();
}

/**
 * Check if someone is currently authenticated
 */
export function isUserLoggedIn(): boolean {
  return getActiveUser() !== null;
}

export function checkAndUpdateStreak(user: UserProfile): void {
  const today = getTodayString();
  if (user.progress.lastActiveDate === today) return;

  const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().split('T')[0];
  if (user.progress.lastActiveDate === yesterday) {
    user.progress.streakDays = (user.progress.streakDays || 1) + 1;
  } else {
    user.progress.streakDays = 1;
  }
  user.progress.lastActiveDate = today;
  saveUser(user);
}

export function saveUser(user: UserProfile): void {
  try {
    const users = getAllUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(USERS_DIR_KEY, JSON.stringify(users));
      if (localStorage.getItem(ACTIVE_USER_KEY) === user.id && typeof window !== 'undefined') {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('user_progress_updated', { detail: user }));
        }, 0);
      }
    }
  } catch (e) {
    console.error('Failed to save user', e);
  }
}

export function loginUser(
  emailOrName: string,
  password?: string
): { success: boolean; message: string; user?: UserProfile } {
  const users = getAllUsers();
  const query = emailOrName.trim().toLowerCase();
  const found = users.find(
    u => u.email.toLowerCase() === query || u.name.toLowerCase() === query
  );

  if (!found) {
    return {
      success: false,
      message: 'No registered candidate found with this email or name. Please register first!'
    };
  }

  if (found.password && password && found.password !== password) {
    return {
      success: false,
      message: 'Incorrect password. Please verify and try again.'
    };
  }

  // Set active session in memory
  localStorage.setItem(ACTIVE_USER_KEY, found.id);
  checkAndUpdateStreak(found);
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: found }));
  }, 0);
  trackLogin({ id: found.id, name: found.name, email: found.email });
  return { success: true, message: `Welcome back, ${found.name}!`, user: found };
}

export function registerUser(
  name: string,
  email: string,
  targetBand: number,
  intendedFormat: 'Academic' | 'General Training',
  targetCountry: string,
  examDate?: string,
  password?: string
): { success: boolean; message: string; user?: UserProfile } {
  const users = getAllUsers();
  const cleanEmail = email.trim().toLowerCase();

  if (!name.trim()) {
    return { success: false, message: 'Please enter your full name.' };
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'Please enter a valid email address.' };
  }
  if (password && password.length < 4) {
    return { success: false, message: 'Password must be at least 4 characters long.' };
  }

  if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
    return {
      success: false,
      message: 'An account with this email address already exists. Please switch to Sign In.'
    };
  }

  const newUser: UserProfile = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    name: name.trim(),
    email: cleanEmail,
    password: password || undefined,
    createdAt: Date.now(),
    progress: {
      ...createDefaultProgress(targetBand, name),
      targetCountry: targetCountry || 'United Kingdom / Canada / Australia',
      intendedFormat,
      examDate: examDate || undefined,
    }
  };

  saveUser(newUser);
  localStorage.setItem(ACTIVE_USER_KEY, newUser.id);
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: newUser }));
  }, 0);
  trackLogin({ id: newUser.id, name: newUser.name, email: newUser.email });
  return {
    success: true,
    message: `Account registered successfully! Welcome to BandSprint, ${newUser.name}.`,
    user: newUser
  };
}

export function logoutUser(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(ACTIVE_USER_KEY);
    localStorage.removeItem('ielts_auth_session');
    localStorage.removeItem('ielts_session_token_v2');
    localStorage.removeItem('ielts_user_subscription_v2');
  }
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: null }));
    }, 0);
  }
}

export function switchActiveUser(userId: string): UserProfile | null {
  const users = getAllUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    localStorage.setItem(ACTIVE_USER_KEY, user.id);
    checkAndUpdateStreak(user);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: user }));
    }, 0);
    return user;
  }
  return null;
}

export function updateCurrentUserProfile(
  updates: {
    name?: string;
    email?: string;
    targetBand?: number;
    intendedFormat?: 'Academic' | 'General Training';
    targetCountry?: string;
    examDate?: string;
    password?: string;
  }
): UserProfile | null {
  const current = getActiveUser();
  if (!current) return null;

  if (updates.name !== undefined) current.name = updates.name.trim();
  if (updates.email !== undefined) current.email = updates.email.trim();
  if (updates.password !== undefined && updates.password.trim()) current.password = updates.password;

  if (updates.targetBand !== undefined) current.progress.targetBand = updates.targetBand;
  if (updates.intendedFormat !== undefined) current.progress.intendedFormat = updates.intendedFormat;
  if (updates.targetCountry !== undefined) current.progress.targetCountry = updates.targetCountry;
  if (updates.examDate !== undefined) current.progress.examDate = updates.examDate;

  saveUser(current);
  window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: current }));
  return current;
}

export function deleteUserAccount(userId: string): boolean {
  try {
    let users = getAllUsers();
    users = users.filter(u => u.id !== userId);
    localStorage.setItem(USERS_DIR_KEY, JSON.stringify(users));

    if (localStorage.getItem(ACTIVE_USER_KEY) === userId) {
      logoutUser();
    }
    return true;
  } catch {
    return false;
  }
}

export function toggleModuleCompleted(moduleId: string): boolean {
  const user = getActiveUser();
  if (!user) return false;
  const exists = user.progress.completedModules.includes(moduleId);
  if (exists) {
    user.progress.completedModules = user.progress.completedModules.filter(m => m !== moduleId);
  } else {
    user.progress.completedModules.push(moduleId);
  }
  saveUser(user);
  return !exists;
}

function isValidHistoryHalfBand(value: unknown, min: number): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  if (value < min || value > 9.0) return false;
  return Math.abs(value * 2 - Math.round(value * 2)) < 1e-6;
}

/**
 * Conservative, backward-compatible discriminator between genuinely complete four-skill
 * full mock exams and incomplete, partial, or single-skill attempts.
 * - Never mutates or deletes historical records.
 * - Rejects partial/transcript-only Speaking provenance, missing/null/0 Speaking or Writing,
 *   and incomplete skill metadata.
 * - Preserves valid historical four-skill full mock records with all four verified bands.
 */
export function isFullMockExamRecord(rec: ExamHistoryRecord | null | undefined): boolean {
  if (!rec) return false;
  if (
    rec.examType === 'incomplete_mock' ||
    rec.examType === 'partial_lrw' ||
    rec.examType === 'listening_only' ||
    rec.examType === 'reading_only' ||
    rec.examType === 'writing_only' ||
    rec.examType === 'speaking_only'
  ) {
    return false;
  }

  // Reject any record carrying explicit incomplete-skill or partial-speaking provenance
  if (Array.isArray(rec.incompleteSkills) && rec.incompleteSkills.length > 0) {
    return false;
  }
  if (
    rec.speakingAssessmentStatus === 'partial_transcript_only' ||
    rec.speakingAssessmentStatus === 'insufficient_evidence' ||
    rec.speakingAssessmentStatus === 'unavailable'
  ) {
    return false;
  }
  if (rec.speakingPronunciationObservable === false) {
    return false;
  }

  if (rec.completedSkills) {
    if (
      rec.completedSkills.listening !== true ||
      rec.completedSkills.reading !== true ||
      rec.completedSkills.writing !== true ||
      rec.completedSkills.speaking !== true
    ) {
      return false;
    }
  }

  const ext = rec as ExamHistoryRecord & Record<string, unknown>;
  if ('writingTasksCompleted' in ext && ext.writingTasksCompleted !== undefined) {
    if (
      typeof ext.writingTasksCompleted !== 'number' ||
      !Number.isFinite(ext.writingTasksCompleted) ||
      ext.writingTasksCompleted < 2
    ) {
      return false;
    }
  } else {
    // Legacy records without writingTasksCompleted cannot silently bypass the 2-task Writing requirement
    // when combined wordCount is below the minimum 2-task threshold (Task 1 >= 150w + Task 2 >= 250w = 400w).
    if (typeof rec.wordCount !== 'number' || !Number.isFinite(rec.wordCount) || rec.wordCount < 400) {
      return false;
    }
  }

  const explicitlyAllFourComplete =
    rec.completedSkills?.listening === true &&
    rec.completedSkills?.reading === true &&
    rec.completedSkills?.writing === true &&
    rec.completedSkills?.speaking === true;

  const hasAttemptedObjectiveQuestions =
    typeof rec.totalQuestions === 'number' &&
    Number.isFinite(rec.totalQuestions) &&
    rec.totalQuestions > 0;

  // Genuine 0/40 Listening/Reading is valid ONLY when completedSkills confirms completion AND questions were actually attempted
  const objectiveMin = explicitlyAllFourComplete && hasAttemptedObjectiveQuestions ? 0.0 : 0.5;
  const hasValidOverall = isValidHistoryHalfBand(rec.overallBand, 0.5);
  const hasValidListening = isValidHistoryHalfBand(rec.listeningBand, objectiveMin);
  const hasValidReading = isValidHistoryHalfBand(rec.readingBand, objectiveMin);
  const hasValidWriting = isValidHistoryHalfBand(rec.writingBand, 1.0);
  const hasValidSpeaking = isValidHistoryHalfBand(rec.speakingBand, 1.0);

  return (
    hasValidOverall &&
    hasValidListening &&
    hasValidReading &&
    hasValidWriting &&
    hasValidSpeaking
  );
}

export interface ExamHistorySummaryCounts {
  total: number;
  completedCount: number;
  incompleteCount: number;
  completedFullMockCount: number;
  singleSkillCount: number;
  unassessedCount: number;
  headerBadgeText: string;
}

const HISTORY_NON_EVALUATED_STATUSES = new Set<string>([
  'unavailable',
  'insufficient_evidence',
  'partial_transcript_only',
  'structural_precheck',
  'precheck_ready',
  'diagnostic_only',
  'not_assessed'
]);

function isRecordDiagnosticOrNonScoring(rec: ExamHistoryRecord): boolean {
  const ext = rec as ExamHistoryRecord & Record<string, unknown>;
  if (ext.isDiagnosticOnly === true || ext.isNonScoring === true) return true;
  if (
    typeof ext.assessmentStatus === 'string' &&
    (ext.assessmentStatus === 'structural_precheck' ||
      ext.assessmentStatus === 'precheck_ready' ||
      ext.assessmentStatus === 'diagnostic_only')
  ) {
    return true;
  }
  if (typeof rec.examType === 'string' && (rec.examType as string).toLowerCase().includes('diagnostic')) {
    return true;
  }
  return false;
}

function isHistorySpeakingBlocked(test: ExamHistoryRecord): boolean {
  const ext = test as ExamHistoryRecord & Record<string, unknown>;
  return (
    test.speakingAssessmentStatus === 'partial_transcript_only' ||
    test.speakingAssessmentStatus === 'insufficient_evidence' ||
    test.speakingAssessmentStatus === 'unavailable' ||
    test.speakingPronunciationObservable === false ||
    ext.speakingEvidenceMode === 'transcript_only' ||
    ext.evidenceMode === 'transcript_only' ||
    ext.isPartialAssessment === true ||
    ext.pronunciationObservable === false ||
    (Array.isArray(ext.unassessedCriteria) && ext.unassessedCriteria.length > 0) ||
    (test.examType === 'speaking_only' &&
      typeof ext.assessmentStatus === 'string' &&
      HISTORY_NON_EVALUATED_STATUSES.has(ext.assessmentStatus)) ||
    (test.examType === 'speaking_only' && ext.isValidAttempt === false)
  );
}

function isHistoryWritingBlocked(test: ExamHistoryRecord): boolean {
  const ext = test as ExamHistoryRecord & Record<string, unknown>;
  return (
    (typeof ext.writingAssessmentStatus === 'string' &&
      HISTORY_NON_EVALUATED_STATUSES.has(ext.writingAssessmentStatus)) ||
    ext.writingEvaluationSource === 'structural_precheck' ||
    ext.evaluationSource === 'structural_precheck' ||
    (test.examType === 'writing_only' &&
      typeof ext.assessmentStatus === 'string' &&
      HISTORY_NON_EVALUATED_STATUSES.has(ext.assessmentStatus)) ||
    (test.examType === 'writing_only' && ext.isValidAttempt === false)
  );
}

export function summarizeExamHistoryCounts(
  history: ExamHistoryRecord[] | null | undefined
): ExamHistorySummaryCounts {
  const list = Array.isArray(history) ? history : [];
  let incompleteCount = 0;
  let completedFullMockCount = 0;
  let singleSkillCount = 0;
  let unassessedCount = 0;

  for (const rec of list) {
    if (!rec) continue;
    const isFull = isFullMockExamRecord(rec);
    const isInc =
      rec.examType === 'incomplete_mock' ||
      (rec.examType === 'full_mock' && !isFull);

    if (isInc) {
      incompleteCount++;
      continue;
    }
    if (isFull) {
      completedFullMockCount++;
      continue;
    }

    const desc = describeExamHistoryDisplay(rec, 1);
    const hasValidSkill =
      desc.lBand !== null ||
      desc.rBand !== null ||
      desc.wBand !== null ||
      desc.sBand !== null;
    if (isRecordDiagnosticOrNonScoring(rec) || !hasValidSkill) {
      unassessedCount++;
    } else {
      singleSkillCount++;
    }
  }

  const completedCount = list.length - incompleteCount;
  const headerBadgeText =
    incompleteCount > 0
      ? `${completedCount} Completed · ${incompleteCount} Incomplete`
      : `${completedCount} Completed`;

  return {
    total: list.length,
    completedCount,
    incompleteCount,
    completedFullMockCount,
    singleSkillCount,
    unassessedCount,
    headerBadgeText
  };
}

export interface ExamHistoryDisplayDescriptor {
  title: string;
  badgeScore: string;
  isFullMock: boolean;
  isIncompleteMock: boolean;
  lBand: number | null;
  rBand: number | null;
  wBand: number | null;
  sBand: number | null;
  oBand: number | null;
  skillSummaryParts: string[];
  statusNote: string | null;
}

export function describeExamHistoryDisplay(
  test: ExamHistoryRecord,
  attemptNumber: number
): ExamHistoryDisplayDescriptor {
  const diagnosticOnly = isRecordDiagnosticOrNonScoring(test);
  const isFullMock = !diagnosticOnly && isFullMockExamRecord(test);
  const isIncompleteMock =
    !isFullMock &&
    (test.examType === 'incomplete_mock' || test.examType === 'full_mock');
  const hasExplicitSkills = Boolean(test.completedSkills);
  const incompleteSet = new Set(Array.isArray(test.incompleteSkills) ? test.incompleteSkills : []);

  const hasListeningQuestions =
    typeof test.totalQuestions === 'number' &&
    Number.isFinite(test.totalQuestions) &&
    test.totalQuestions > 0 &&
    (test.completedSkills?.listening === true || test.examType === 'listening_only');
  const hasReadingQuestions =
    typeof test.totalQuestions === 'number' &&
    Number.isFinite(test.totalQuestions) &&
    test.totalQuestions > 0 &&
    (test.completedSkills?.reading === true || test.examType === 'reading_only');

  const lMin = hasListeningQuestions ? 0.0 : 0.5;
  const rMin = hasReadingQuestions ? 0.0 : 0.5;

  const lBand =
    !diagnosticOnly &&
    !incompleteSet.has('listening') &&
    (!hasExplicitSkills || test.completedSkills?.listening === true) &&
    isValidHistoryHalfBand(test.listeningBand, lMin)
      ? Math.round(test.listeningBand * 2) / 2
      : null;

  const rBand =
    !diagnosticOnly &&
    !incompleteSet.has('reading') &&
    (!hasExplicitSkills || test.completedSkills?.reading === true) &&
    isValidHistoryHalfBand(test.readingBand, rMin)
      ? Math.round(test.readingBand * 2) / 2
      : null;

  const wBand =
    !diagnosticOnly &&
    !incompleteSet.has('writing') &&
    !isHistoryWritingBlocked(test) &&
    (!hasExplicitSkills || test.completedSkills?.writing === true) &&
    isValidHistoryHalfBand(test.writingBand, 1.0)
      ? Math.round(test.writingBand * 2) / 2
      : null;

  const sBand =
    !diagnosticOnly &&
    !incompleteSet.has('speaking') &&
    !isHistorySpeakingBlocked(test) &&
    (!hasExplicitSkills || test.completedSkills?.speaking === true) &&
    isValidHistoryHalfBand(test.speakingBand, 1.0)
      ? Math.round(test.speakingBand * 2) / 2
      : null;

  const oBand =
    isFullMock &&
    lBand !== null &&
    rBand !== null &&
    wBand !== null &&
    sBand !== null &&
    isValidHistoryHalfBand(test.overallBand, 0.5)
      ? Math.round(test.overallBand * 2) / 2
      : null;

  if (diagnosticOnly) {
    return {
      title: `Diagnostic Pre-Check #${attemptNumber}`,
      badgeScore: 'DIAG',
      isFullMock: false,
      isIncompleteMock: false,
      lBand: null,
      rBand: null,
      wBand: null,
      sBand: null,
      oBand: null,
      skillSummaryParts: ['Non-scoring diagnostic / structural check'],
      statusNote: 'Diagnostic only — not an IELTS band'
    };
  }

  if (isFullMock && oBand !== null) {
    const parts = [
      `L: ${lBand !== null ? lBand.toFixed(1) : '—'}`,
      `R: ${rBand !== null ? rBand.toFixed(1) : '—'}`,
      `W: ${wBand !== null ? wBand.toFixed(1) : '—'}`
    ];
    if (sBand !== null) parts.push(`S: ${sBand.toFixed(1)}`);

    return {
      title: `Full Mock Test #${attemptNumber}`,
      badgeScore: oBand.toFixed(1),
      isFullMock: true,
      isIncompleteMock: false,
      lBand,
      rBand,
      wBand,
      sBand,
      oBand,
      skillSummaryParts: parts,
      statusNote: null
    };
  }

  if (isIncompleteMock) {
    return {
      title: `Incomplete Mock Test #${attemptNumber}`,
      badgeScore: 'INC',
      isFullMock: false,
      isIncompleteMock: true,
      lBand,
      rBand,
      wBand,
      sBand,
      oBand: null,
      skillSummaryParts: [
        `L: ${lBand !== null ? lBand.toFixed(1) : '—'}`,
        `R: ${rBand !== null ? rBand.toFixed(1) : '—'}`,
        `W: ${wBand !== null ? wBand.toFixed(1) : '—'}`,
        `S: ${sBand !== null ? sBand.toFixed(1) : '—'}`
      ],
      statusNote: 'Incomplete — No Overall Band'
    };
  }

  if (test.examType === 'partial_lrw') {
    return {
      title: `3-Skill Mock (L/R/W) #${attemptNumber}`,
      badgeScore: '3-S',
      isFullMock: false,
      isIncompleteMock: false,
      lBand,
      rBand,
      wBand,
      sBand,
      oBand: null,
      skillSummaryParts: [
        `L: ${lBand !== null ? lBand.toFixed(1) : '—'}`,
        `R: ${rBand !== null ? rBand.toFixed(1) : '—'}`,
        `W: ${wBand !== null ? wBand.toFixed(1) : '—'}`
      ],
      statusNote: 'Speaking not administered'
    };
  }

  if (test.examType === 'reading_only') {
    return {
      title: `Reading Practice Test #${attemptNumber}`,
      badgeScore: rBand !== null ? rBand.toFixed(1) : '—',
      isFullMock: false,
      isIncompleteMock: false,
      lBand,
      rBand,
      wBand,
      sBand,
      oBand: null,
      skillSummaryParts: [
        `${rBand !== null ? `Reading Band ${rBand.toFixed(1)}` : 'Band not evaluated'} (${test.correctCount ?? 0}/${test.totalQuestions ?? 0})`
      ],
      statusNote: rBand === null ? 'Not assessed' : null
    };
  }

  if (test.examType === 'writing_only') {
    return {
      title: `Writing Assessment #${attemptNumber}`,
      badgeScore: wBand !== null ? wBand.toFixed(1) : '—',
      isFullMock: false,
      isIncompleteMock: false,
      lBand,
      rBand,
      wBand,
      sBand,
      oBand: null,
      skillSummaryParts: [
        `${wBand !== null ? `Writing Band ${wBand.toFixed(1)}` : 'Band not evaluated'} (${test.wordCount ?? 0} words)`
      ],
      statusNote: wBand === null ? 'Evaluation unavailable' : null
    };
  }

  if (test.examType === 'speaking_only') {
    return {
      title: `Speaking Assessment #${attemptNumber}`,
      badgeScore: sBand !== null ? sBand.toFixed(1) : '—',
      isFullMock: false,
      isIncompleteMock: false,
      lBand,
      rBand,
      wBand,
      sBand,
      oBand: null,
      skillSummaryParts: [
        sBand !== null ? `Speaking Band ${sBand.toFixed(1)}` : 'Band not evaluated'
      ],
      statusNote:
        sBand === null
          ? isHistorySpeakingBlocked(test)
            ? 'Insufficient Speaking evidence'
            : 'Not assessed'
          : null
    };
  }

  // Legacy single-skill fallback
  if (lBand !== null && rBand === null) {
    return {
      title: `Listening Mock Test #${attemptNumber}`,
      badgeScore: lBand.toFixed(1),
      isFullMock: false,
      isIncompleteMock: false,
      lBand,
      rBand,
      wBand,
      sBand,
      oBand: null,
      skillSummaryParts: [
        `Listening Band ${lBand.toFixed(1)} (${test.correctCount ?? 0}/${test.totalQuestions ?? 0})`
      ],
      statusNote: null
    };
  }

  if (rBand !== null && lBand === null) {
    return {
      title: `Reading Practice Test #${attemptNumber}`,
      badgeScore: rBand.toFixed(1),
      isFullMock: false,
      isIncompleteMock: false,
      lBand,
      rBand,
      wBand,
      sBand,
      oBand: null,
      skillSummaryParts: [
        `Reading Band ${rBand.toFixed(1)} (${test.correctCount ?? 0}/${test.totalQuestions ?? 0})`
      ],
      statusNote: null
    };
  }

  return {
    title: `Practice Test #${attemptNumber}`,
    badgeScore: '—',
    isFullMock: false,
    isIncompleteMock: false,
    lBand,
    rBand,
    wBand,
    sBand,
    oBand: null,
    skillSummaryParts: ['Band not evaluated'],
    statusNote: 'Not assessed'
  };
}

function sanitizeOptionalExamBand(
  value: number | null | undefined,
  allowZero: boolean = false
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value > 9.0 || value < (allowZero ? 0.0 : 1.0)) return null;
  if (Math.abs(value * 2 - Math.round(value * 2)) > 1e-6) return null;
  return Math.round(value * 2) / 2;
}

export function recordExamAttempt(
  record: Omit<ExamHistoryRecord, 'id' | 'timestamp'> & { id?: string }
): void {
  const user = getActiveUser();
  if (!user) return;
  if (!Array.isArray(user.progress.examHistory)) {
    user.progress.examHistory = [];
  }
  const examId = record.id || `exam_${Date.now()}`;
  // Guard against duplicate recording of the same exam attempt ID
  if (user.progress.examHistory.some((existing) => existing.id === examId)) {
    return;
  }

  const allowZeroObjective = typeof record.totalQuestions === 'number' && record.totalQuestions > 0;
  const sanitizedOverall = sanitizeOptionalExamBand(record.overallBand, false) ?? null;
  const sanitizedListening = sanitizeOptionalExamBand(record.listeningBand, allowZeroObjective);
  const sanitizedReading = sanitizeOptionalExamBand(record.readingBand, allowZeroObjective);
  const sanitizedWriting = sanitizeOptionalExamBand(record.writingBand, false);
  const sanitizedSpeaking = sanitizeOptionalExamBand(record.speakingBand, false);

  const newRecord: ExamHistoryRecord = {
    ...record,
    id: examId,
    timestamp: Date.now(),
    overallBand: sanitizedOverall,
    listeningBand: sanitizedListening,
    readingBand: sanitizedReading,
    writingBand: sanitizedWriting,
    speakingBand: sanitizedSpeaking
  };

  user.progress.examHistory.unshift(newRecord);
  user.progress.wordsWrittenTotal += record.wordCount || 0;

  if (isFullMockExamRecord(newRecord)) {
    if (!user.progress.completedModules.includes('livemock')) {
      user.progress.completedModules.push('livemock');
    }
  } else {
    if (typeof newRecord.listeningBand === 'number' && newRecord.listeningBand > 0) {
      if (!user.progress.completedModules.includes('listening')) {
        user.progress.completedModules.push('listening');
      }
    }
    if (typeof newRecord.readingBand === 'number' && newRecord.readingBand > 0) {
      if (!user.progress.completedModules.includes('reading')) {
        user.progress.completedModules.push('reading');
      }
    }
    if (typeof newRecord.writingBand === 'number' && newRecord.writingBand > 0) {
      if (!user.progress.completedModules.includes('writing')) {
        user.progress.completedModules.push('writing');
      }
    }
    if (typeof newRecord.speakingBand === 'number' && newRecord.speakingBand > 0) {
      if (!user.progress.completedModules.includes('speaking')) {
        user.progress.completedModules.push('speaking');
      }
    }
  }

  saveUser(user);
}

export function exportAllUserData(): string {
  const currentUser = getActiveUser();
  const allUsers = getAllUsers();
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    activeUserId: currentUser?.id || null,
    users: allUsers
  }, null, 2);
}

export function importUserData(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (data.users && Array.isArray(data.users)) {
      localStorage.setItem(USERS_DIR_KEY, JSON.stringify(data.users));
      if (data.activeUserId) {
        localStorage.setItem(ACTIVE_USER_KEY, data.activeUserId);
      } else if (data.users[0]) {
        localStorage.setItem(ACTIVE_USER_KEY, data.users[0].id);
      }
      window.dispatchEvent(new CustomEvent('user_auth_updated'));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const TOP_WEAKNESS_STORAGE_KEY = 'bandsprint_top_weakness_v1';
export const TOP_WEAKNESS_UPDATED_EVENT = 'bandsprint_weakness_updated';

export interface StoredTopWeakness {
  label: string;
  source: 'writing' | 'speaking' | 'reading' | 'listening' | 'diagnostic';
  updatedAt: number;
  userId?: string | null;
}

/**
 * Persists the learner's highest-priority weakness (e.g. "Coherence & Cohesion")
 * so <BarnabyCompanion /> automatically surfaces a targeted drill on the dashboard.
 */
export function setTopWeakness(
  label: string,
  source: StoredTopWeakness['source'] = 'writing'
): void {
  const clean = (label || '').trim();
  if (!clean) return;
  try {
    const active = getActiveUser();
    const record: StoredTopWeakness = {
      label: clean,
      source,
      updatedAt: Date.now(),
      userId: active?.id ?? null,
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOP_WEAKNESS_STORAGE_KEY, JSON.stringify(record));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TOP_WEAKNESS_UPDATED_EVENT, { detail: record }));
    }
  } catch {
    // ignore storage quota errors
  }
}

export function getTopWeakness(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(TOP_WEAKNESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredTopWeakness>;
    const active = getActiveUser();
    if (parsed.userId && active?.id && parsed.userId !== active.id) {
      return null;
    }
    return typeof parsed.label === 'string' && parsed.label.trim() ? parsed.label.trim() : null;
  } catch {
    return null;
  }
}

export function detectLowestWritingCriterion(
  scores: {
    ta?: number | null;
    cc?: number | null;
    lr?: number | null;
    gra?: number | null;
  },
  taskType: 1 | 2 = 2
): string | null {
  const candidates: Array<{ label: string; score: number }> = [];
  if (typeof scores.ta === 'number' && Number.isFinite(scores.ta)) {
    candidates.push({
      label: taskType === 1 ? 'Task 1 Task Achievement' : 'Task 2 Task Response',
      score: scores.ta,
    });
  }
  if (typeof scores.cc === 'number' && Number.isFinite(scores.cc)) {
    candidates.push({ label: 'Coherence & Cohesion', score: scores.cc });
  }
  if (typeof scores.lr === 'number' && Number.isFinite(scores.lr)) {
    candidates.push({ label: 'Lexical Resource', score: scores.lr });
  }
  if (typeof scores.gra === 'number' && Number.isFinite(scores.gra)) {
    candidates.push({ label: 'Grammatical Range & Accuracy', score: scores.gra });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.score - b.score);
  return candidates[0].label;
}

export function detectLowestSpeakingCriterion(scores: {
  fc?: number | null;
  lr?: number | null;
  gra?: number | null;
  pr?: number | null;
}): string | null {
  const candidates: Array<{ label: string; score: number }> = [];
  if (typeof scores.fc === 'number' && Number.isFinite(scores.fc)) {
    candidates.push({ label: 'Speaking Fluency & Coherence', score: scores.fc });
  }
  if (typeof scores.lr === 'number' && Number.isFinite(scores.lr)) {
    candidates.push({ label: 'Speaking Lexical Resource', score: scores.lr });
  }
  if (typeof scores.gra === 'number' && Number.isFinite(scores.gra)) {
    candidates.push({ label: 'Speaking Grammatical Range', score: scores.gra });
  }
  if (typeof scores.pr === 'number' && Number.isFinite(scores.pr)) {
    candidates.push({ label: 'Speaking Pronunciation', score: scores.pr });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.score - b.score);
  return candidates[0].label;
}

