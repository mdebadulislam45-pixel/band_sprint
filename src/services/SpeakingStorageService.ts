import { SpeakingSessionRecord, ActiveSpeakingSessionSnapshot } from '../types/speakingTypes';

const STORAGE_KEY_SPEAKING_HISTORY = 'ielts_speaking_session_history_v1';
const STORAGE_KEY_UNFINISHED_SESSION = 'ielts_speaking_unfinished_session_v1';

export class SpeakingStorageService {
  public getAllSessions(userId?: string): SpeakingSessionRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SPEAKING_HISTORY);
      if (!raw) return [];
      const list: SpeakingSessionRecord[] = JSON.parse(raw);
      if (userId) {
        return list.filter((s) => s.userId === userId || !s.userId);
      }
      return list;
    } catch {
      return [];
    }
  }

  public saveCompletedSession(session: SpeakingSessionRecord): void {
    if (typeof window === 'undefined') return;
    try {
      const existing = this.getAllSessions();
      // Remove matching testId if already saved
      const updated = existing.filter((s) => s.testId !== session.testId);
      updated.unshift(session);
      localStorage.setItem(STORAGE_KEY_SPEAKING_HISTORY, JSON.stringify(updated.slice(0, 50)));

      // Clear any unfinished session state
      this.clearUnfinishedSession();

      // Trigger global event so UI updates immediately
      window.dispatchEvent(new CustomEvent('speaking_history_updated', { detail: session }));
    } catch (e) {
      console.warn('Could not save speaking session:', e);
    }
  }

  public getSessionById(testId: string): SpeakingSessionRecord | undefined {
    const list = this.getAllSessions();
    return list.find((s) => s.testId === testId);
  }

  public deleteSession(testId: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const existing = this.getAllSessions();
      const updated = existing.filter((s) => s.testId !== testId);
      localStorage.setItem(STORAGE_KEY_SPEAKING_HISTORY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('speaking_history_updated'));
      return true;
    } catch {
      return false;
    }
  }

  // --- Session Recovery & Unfinished Session Preservation ---
  public saveUnfinishedSession(snapshot: ActiveSpeakingSessionSnapshot): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_UNFINISHED_SESSION, JSON.stringify(snapshot));
    } catch {}
  }

  public getUnfinishedSession(): ActiveSpeakingSessionSnapshot | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_UNFINISHED_SESSION);
      if (!raw) return null;
      const parsed: ActiveSpeakingSessionSnapshot = JSON.parse(raw);
      // Valid if saved in the previous 4 hours
      if (Date.now() - parsed.updatedAt < 4 * 60 * 60 * 1000) {
        return parsed;
      }
      this.clearUnfinishedSession();
      return null;
    } catch {
      return null;
    }
  }

  public clearUnfinishedSession(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEY_UNFINISHED_SESSION);
    } catch {}
  }
}

export const speakingStorageService = new SpeakingStorageService();
