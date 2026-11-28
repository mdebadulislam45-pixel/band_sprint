export type SmartCoachFocusMode =
  | 'daily_plan'
  | 'weakness_fix'
  | 'band8_push'
  | 'exam_strategy';

export interface SmartCoachMicroStep {
  title: string;
  detail: string;
  durationMinutes: number;
  route: string;
}

export interface SmartCoachBrief {
  headline: string;
  diagnosis: string;
  priorityAction: {
    label: string;
    route: string;
    durationMinutes: number;
  };
  microSteps: SmartCoachMicroStep[];
  banglaInsight: string;
  bandImpactNote: string;
  focusMode: SmartCoachFocusMode;
  modelUsed?: string;
  generatedAt: string;
}

export interface SmartCoachRequestPayload {
  candidateName: string;
  examTrack: 'Academic' | 'General Training';
  currentBand: number | null;
  targetBand: number;
  daysRemaining: number;
  weakestSkill: string | null;
  unresolvedMistakes: number;
  topMistakeTopics: string[];
  todayCompletedTasks: number;
  todayTotalTasks: number;
  streakDays: number;
  focusMode: SmartCoachFocusMode;
  customQuestion?: string;
}

const SESSION_CACHE_PREFIX = 'bandsprint_ai_smart_coach_v1_';

export function readCachedSmartCoachBrief(focusMode: SmartCoachFocusMode): SmartCoachBrief | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${focusMode}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SmartCoachBrief;
    if (!parsed || typeof parsed.headline !== 'string' || !Array.isArray(parsed.microSteps)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedSmartCoachBrief(
  focusMode: SmartCoachFocusMode,
  brief: SmartCoachBrief
): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(`${SESSION_CACHE_PREFIX}${focusMode}`, JSON.stringify(brief));
  } catch {
    // Ignore storage quota errors
  }
}

export async function requestSmartCoachBrief(
  payload: SmartCoachRequestPayload,
  signal?: AbortSignal
): Promise<SmartCoachBrief> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 22_000);

  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort, { once: true });

  try {
    const res = await fetch('/api/ai/smart-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.brief) {
      throw new Error(
        data?.error || `AI Smart Coach could not respond right now (HTTP ${res.status}).`
      );
    }

    const brief = data.brief as SmartCoachBrief;
    if (!payload.customQuestion?.trim()) {
      writeCachedSmartCoachBrief(payload.focusMode, brief);
    }
    return brief;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('AI Smart Coach took too long to reply. Please tap Refresh to try again.');
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}
