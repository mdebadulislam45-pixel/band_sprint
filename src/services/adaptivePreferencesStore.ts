import {
  ADAPTIVE_DIFFICULTY_UPDATED_EVENT,
  DifficultyModePreference,
  loadDifficultyPreference,
  saveDifficultyPreference
} from '../utils/adaptiveLearningPath';

export type ListeningAccentMode = 'uk' | 'au' | 'us' | 'mixed';

export interface AdaptivePreferencesState {
  difficultyPreference: DifficultyModePreference;
  reminderEnabled: boolean;
  reminderTime: string;
  listeningAccent: ListeningAccentMode;
  strictExamListening: boolean;
  updatedAt: number;
}

export interface ActiveLabDraftsState {
  activeModule: 'writing' | 'reading' | 'listening' | 'speaking' | '';
  writingTask1PromptId: string;
  writingTask1Draft: string;
  writingTask2Draft: string;
  readingPassageId: string;
  listeningSection: 1 | 2 | 3 | 4;
  updatedAt: number;
}

export const ADAPTIVE_PREFERENCES_STORAGE_KEY = 'bandsprint_adaptive_preferences_v1';
export const ACTIVE_LAB_DRAFTS_STORAGE_KEY = 'bandsprint_active_lab_drafts_v1';
export const LISTENING_ACCENT_STORAGE_KEY = 'bandsprint_listening_accent_v1';
export const ADAPTIVE_PREFERENCES_SAVED_EVENT = 'bandsprint_adaptive_preferences_saved';
export const ACTIVE_LAB_DRAFTS_SAVED_EVENT = 'bandsprint_active_lab_drafts_saved';

const VALID_DIFFICULTIES: ReadonlySet<DifficultyModePreference> = new Set([
  'auto',
  'recovery',
  'balanced',
  'stretch'
]);

const VALID_ACCENTS: ReadonlySet<ListeningAccentMode> = new Set([
  'uk',
  'au',
  'us',
  'mixed'
]);

const VALID_MODULES = new Set(['writing', 'reading', 'listening', 'speaking', '']);

function safeReadReminder(): { enabled: boolean; time: string } {
  if (typeof localStorage === 'undefined') {
    return { enabled: false, time: '20:00' };
  }
  try {
    const raw =
      localStorage.getItem('bandsprint_daily_reminder_v1') ||
      localStorage.getItem('bandsprint_streak_reminder_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      const rawTime = parsed?.reminderTime ?? parsed?.time;
      return {
        enabled: Boolean(parsed?.enabled),
        time:
          typeof rawTime === 'string' && /^\d{2}:\d{2}$/.test(rawTime)
            ? rawTime
            : '20:00'
      };
    }
  } catch {
    // ignore
  }
  return { enabled: false, time: '20:00' };
}

export function sanitizeAdaptivePreferences(raw: unknown): AdaptivePreferencesState {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const diffRaw = typeof obj.difficultyPreference === 'string' ? obj.difficultyPreference : 'auto';
  const difficultyPreference: DifficultyModePreference = VALID_DIFFICULTIES.has(
    diffRaw as DifficultyModePreference
  )
    ? (diffRaw as DifficultyModePreference)
    : 'auto';

  const accentRaw = typeof obj.listeningAccent === 'string' ? obj.listeningAccent : 'uk';
  const listeningAccent: ListeningAccentMode = VALID_ACCENTS.has(accentRaw as ListeningAccentMode)
    ? (accentRaw as ListeningAccentMode)
    : 'uk';

  const reminderTime =
    typeof obj.reminderTime === 'string' && /^\d{2}:\d{2}$/.test(obj.reminderTime)
      ? obj.reminderTime
      : '20:00';

  const updatedAt =
    typeof obj.updatedAt === 'number' && Number.isFinite(obj.updatedAt) && obj.updatedAt > 0
      ? Math.floor(obj.updatedAt)
      : Date.now();

  return {
    difficultyPreference,
    reminderEnabled: Boolean(obj.reminderEnabled),
    reminderTime,
    listeningAccent,
    strictExamListening: Boolean(obj.strictExamListening),
    updatedAt
  };
}

export function loadAdaptivePreferences(): AdaptivePreferencesState {
  const localDiff = loadDifficultyPreference();
  const localReminder = safeReadReminder();

  if (typeof localStorage === 'undefined') {
    return {
      difficultyPreference: localDiff,
      reminderEnabled: localReminder.enabled,
      reminderTime: localReminder.time,
      listeningAccent: 'uk',
      strictExamListening: false,
      updatedAt: 0
    };
  }

  try {
    const raw = localStorage.getItem(ADAPTIVE_PREFERENCES_STORAGE_KEY);
    if (raw) {
      const parsed = sanitizeAdaptivePreferences(JSON.parse(raw));
      return {
        ...parsed,
        difficultyPreference: localDiff || parsed.difficultyPreference
      };
    }
    const legacyAccent = localStorage.getItem(LISTENING_ACCENT_STORAGE_KEY);
    return sanitizeAdaptivePreferences({
      difficultyPreference: localDiff,
      reminderEnabled: localReminder.enabled,
      reminderTime: localReminder.time,
      listeningAccent: legacyAccent || 'uk',
      strictExamListening: false,
      updatedAt: Date.now()
    });
  } catch {
    return {
      difficultyPreference: localDiff,
      reminderEnabled: localReminder.enabled,
      reminderTime: localReminder.time,
      listeningAccent: 'uk',
      strictExamListening: false,
      updatedAt: Date.now()
    };
  }
}

export function saveAdaptivePreferences(
  partial: Partial<AdaptivePreferencesState>,
  options?: { skipCloud?: boolean }
): AdaptivePreferencesState {
  const current = loadAdaptivePreferences();
  const next = sanitizeAdaptivePreferences({
    ...current,
    ...partial,
    updatedAt: partial.updatedAt ?? Date.now()
  });

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(ADAPTIVE_PREFERENCES_STORAGE_KEY, JSON.stringify(next));
      localStorage.setItem(LISTENING_ACCENT_STORAGE_KEY, next.listeningAccent);
      // Mirror difficulty preference cleanly without creating event loops
      if (loadDifficultyPreference() !== next.difficultyPreference) {
        saveDifficultyPreference(next.difficultyPreference);
      }
      // Mirror reminder settings cleanly into canonical bandsprint_daily_reminder_v1
      const existingRem =
        localStorage.getItem('bandsprint_daily_reminder_v1') ||
        localStorage.getItem('bandsprint_streak_reminder_v1');
      let remObj: Record<string, unknown> = {};
      if (existingRem) {
        try {
          remObj = JSON.parse(existingRem) || {};
        } catch {
          remObj = {};
        }
      }
      const mergedReminder = {
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        skipIfCompletedToday: true,
        lastTriggeredDate: '',
        snoozeUntil: null,
        ...remObj,
        enabled: next.reminderEnabled,
        reminderTime: next.reminderTime
      };
      localStorage.setItem('bandsprint_daily_reminder_v1', JSON.stringify(mergedReminder));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('bandsprint_streak_reminder_updated', { detail: mergedReminder })
        );
      }
    } catch {
      // ignore storage quota failures
    }
  }

  if (typeof window !== 'undefined' && !options?.skipCloud) {
    window.dispatchEvent(
      new CustomEvent(ADAPTIVE_PREFERENCES_SAVED_EVENT, { detail: next })
    );
  }

  return next;
}

export function sanitizeActiveLabDrafts(raw: unknown): ActiveLabDraftsState {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const modRaw = typeof obj.activeModule === 'string' ? obj.activeModule : '';
  const activeModule = (
    VALID_MODULES.has(modRaw) ? modRaw : ''
  ) as ActiveLabDraftsState['activeModule'];

  const secRaw = Number(obj.listeningSection);
  const listeningSection: 1 | 2 | 3 | 4 =
    secRaw === 1 || secRaw === 2 || secRaw === 3 || secRaw === 4 ? secRaw : 1;

  const updatedAt =
    typeof obj.updatedAt === 'number' && Number.isFinite(obj.updatedAt) && obj.updatedAt > 0
      ? Math.floor(obj.updatedAt)
      : 0;

  return {
    activeModule,
    writingTask1PromptId:
      typeof obj.writingTask1PromptId === 'string'
        ? obj.writingTask1PromptId.slice(0, 64)
        : 'renewable_chart',
    writingTask1Draft:
      typeof obj.writingTask1Draft === 'string' ? obj.writingTask1Draft.slice(0, 6000) : '',
    writingTask2Draft:
      typeof obj.writingTask2Draft === 'string' ? obj.writingTask2Draft.slice(0, 6000) : '',
    readingPassageId:
      typeof obj.readingPassageId === 'string' ? obj.readingPassageId.slice(0, 128) : '',
    listeningSection,
    updatedAt
  };
}

export function loadActiveLabDrafts(): ActiveLabDraftsState {
  if (typeof localStorage === 'undefined') {
    return sanitizeActiveLabDrafts({});
  }
  try {
    const raw = localStorage.getItem(ACTIVE_LAB_DRAFTS_STORAGE_KEY);
    if (!raw) return sanitizeActiveLabDrafts({});
    return sanitizeActiveLabDrafts(JSON.parse(raw));
  } catch {
    return sanitizeActiveLabDrafts({});
  }
}

export function saveActiveLabDrafts(
  partial: Partial<ActiveLabDraftsState>,
  options?: { skipCloud?: boolean }
): ActiveLabDraftsState {
  const current = loadActiveLabDrafts();
  const next = sanitizeActiveLabDrafts({
    ...current,
    ...partial,
    updatedAt: partial.updatedAt ?? Date.now()
  });

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(ACTIVE_LAB_DRAFTS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  if (typeof window !== 'undefined' && !options?.skipCloud) {
    window.dispatchEvent(
      new CustomEvent(ACTIVE_LAB_DRAFTS_SAVED_EVENT, { detail: next })
    );
  }

  return next;
}

export function mergeActiveLabDrafts(
  local: ActiveLabDraftsState,
  remoteRaw: unknown
): ActiveLabDraftsState {
  const remote = sanitizeActiveLabDrafts(remoteRaw);
  if (remote.updatedAt >= local.updatedAt) {
    return {
      ...remote,
      writingTask1Draft: remote.writingTask1Draft || local.writingTask1Draft,
      writingTask2Draft: remote.writingTask2Draft || local.writingTask2Draft,
      readingPassageId: remote.readingPassageId || local.readingPassageId
    };
  }
  return {
    ...local,
    writingTask1Draft: local.writingTask1Draft || remote.writingTask1Draft,
    writingTask2Draft: local.writingTask2Draft || remote.writingTask2Draft,
    readingPassageId: local.readingPassageId || remote.readingPassageId
  };
}

/**
 * Resolves a speaker ID & accent metadata for IELTS Listening Accent Rotation (`uk`, `au`, `us`, `mixed`).
 * Maps cleanly to verified server studio voices in `IELTS_SPEAKERS` (`speaker_04/05`, `speaker_06/07`, `speaker_09/10`).
 */
export function resolveListeningSpeakerForAccent(
  accentMode: ListeningAccentMode,
  gender: 'male' | 'female' = 'male',
  lineIndex: number = 0,
  section: 1 | 2 | 3 | 4 = 1
): { speakerId: string; accentLabel: string; accentCode: string } {
  const effectiveAccent: 'uk' | 'au' | 'us' =
    accentMode === 'mixed'
      ? (['uk', 'au', 'us'] as const)[(section - 1 + (lineIndex % 2)) % 3]
      : accentMode;

  if (effectiveAccent === 'au') {
    return {
      speakerId: gender === 'female' ? 'speaker_07' : 'speaker_06',
      accentLabel: 'Australian (en-AU)',
      accentCode: 'en-AU'
    };
  }
  if (effectiveAccent === 'us') {
    return {
      speakerId: gender === 'female' ? 'speaker_10' : 'speaker_09',
      accentLabel: 'American (en-US)',
      accentCode: 'en-US'
    };
  }
  return {
    speakerId: gender === 'female' ? 'speaker_05' : 'speaker_04',
    accentLabel: 'British RP (en-GB)',
    accentCode: 'en-GB'
  };
}

export { ADAPTIVE_DIFFICULTY_UPDATED_EVENT };
