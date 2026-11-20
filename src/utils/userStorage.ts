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

/**
 * Backward-compatible discriminator between full 4-skill mock exams and single-skill (Listening-only) attempts.
 * Legacy Listening-only attempts recorded readingBand: 0 and writingBand: 0 without examType,
 * whereas full mock attempts in LiveMockTest always record positive readingBand and writingBand scores.
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

  if (rec.completedSkills) {
    if (
      rec.completedSkills.listening === false ||
      rec.completedSkills.reading === false ||
      rec.completedSkills.writing === false ||
      rec.completedSkills.speaking === false
    ) {
      return false;
    }
  }

  const explicitlyAllFourComplete =
    rec.completedSkills?.listening === true &&
    rec.completedSkills?.reading === true &&
    rec.completedSkills?.writing === true &&
    rec.completedSkills?.speaking === true;

  if (explicitlyAllFourComplete && rec.examType === 'full_mock' && typeof rec.overallBand === 'number') {
    return true;
  }

  const hasValidOverall = typeof rec.overallBand === 'number' && rec.overallBand > 0;
  const hasValidListening = typeof rec.listeningBand === 'number' && rec.listeningBand > 0;
  const hasValidReading = typeof rec.readingBand === 'number' && rec.readingBand > 0;
  const hasValidWriting = typeof rec.writingBand === 'number' && rec.writingBand > 0;
  const hasInvalidSpeaking =
    rec.speakingBand !== undefined &&
    rec.speakingBand !== null &&
    rec.speakingBand <= 0;

  if (
    !hasValidOverall ||
    !hasValidListening ||
    !hasValidReading ||
    !hasValidWriting ||
    hasInvalidSpeaking
  ) {
    return false;
  }

  return true;
}

export interface ExamHistorySummaryCounts {
  total: number;
  completedCount: number;
  incompleteCount: number;
  headerBadgeText: string;
}

export function summarizeExamHistoryCounts(
  history: ExamHistoryRecord[] | null | undefined
): ExamHistorySummaryCounts {
  const list = Array.isArray(history) ? history : [];
  const incompleteCount = list.filter((rec) => rec?.examType === 'incomplete_mock').length;
  const completedCount = list.length - incompleteCount;
  const headerBadgeText =
    incompleteCount > 0
      ? `${completedCount} Completed · ${incompleteCount} Incomplete`
      : `${completedCount} Completed`;

  return {
    total: list.length,
    completedCount,
    incompleteCount,
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
  const isFullMock = isFullMockExamRecord(test);
  const isIncompleteMock = test.examType === 'incomplete_mock';
  const hasExplicitSkills = Boolean(test.completedSkills);

  const lBand =
    typeof test.listeningBand === 'number' &&
    (hasExplicitSkills ? test.completedSkills?.listening === true : test.listeningBand > 0)
      ? test.listeningBand
      : null;
  const rBand =
    typeof test.readingBand === 'number' &&
    (hasExplicitSkills ? test.completedSkills?.reading === true : test.readingBand > 0)
      ? test.readingBand
      : null;
  const wBand =
    typeof test.writingBand === 'number' &&
    (hasExplicitSkills ? test.completedSkills?.writing === true : test.writingBand > 0)
      ? test.writingBand
      : null;
  const sBand =
    typeof test.speakingBand === 'number' &&
    (hasExplicitSkills ? test.completedSkills?.speaking === true : test.speakingBand > 0)
      ? test.speakingBand
      : null;
  const oBand =
    isFullMock && typeof test.overallBand === 'number' && test.overallBand >= 0
      ? test.overallBand
      : null;

  if (isFullMock) {
    const parts = [
      `L: ${lBand !== null ? lBand.toFixed(1) : '—'}`,
      `R: ${rBand !== null ? rBand.toFixed(1) : '—'}`,
      `W: ${wBand !== null ? wBand.toFixed(1) : '—'}`
    ];
    if (sBand !== null) parts.push(`S: ${sBand.toFixed(1)}`);

    return {
      title: `Full Mock Test #${attemptNumber}`,
      badgeScore: oBand !== null ? oBand.toFixed(1) : '—',
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
      statusNote: null
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
      statusNote: null
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
      statusNote: null
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
    statusNote: null
  };
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

  const newRecord: ExamHistoryRecord = {
    ...record,
    id: examId,
    timestamp: Date.now()
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
