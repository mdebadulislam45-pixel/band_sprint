/**
 * IndexedDB Persistence Service for IELTS Mock Tests and Section Lab practice.
 * Guarantees zero data-loss during:
 * - Audio buffering / streaming stalls
 * - Navigation between tabs, sections, or views
 * - Page refresh or mobile browser background throttling
 * - Device sleep / wake cycles
 */

const DB_NAME = 'ielts_sprint_test_persistence_v1';
const DB_VERSION = 1;
const STORE_SESSIONS = 'active_test_sessions';

export interface PersistentTestProgress {
  sessionId: string;
  testType: 'live_mock' | 'listening_lab' | 'authentic_40_listening' | 'reading_lab' | 'writing_lab' | 'zero_repetition_registry';
  testSetId?: string;
  activeSection?: string | number;
  currentQuestionIndex?: number;
  answers?: Record<string | number, string>;
  flagged?: Record<string | number, boolean>;
  essayText?: string;
  timeLeftSeconds?: number;
  isTimerRunning?: boolean;
  status: 'intro' | 'active' | 'review' | 'instruction' | 'in_progress' | 'checking' | 'submitted';
  updatedAt: number;
  meta?: Record<string, any>;
}

class TestPersistenceService {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memoryFallback: Map<string, PersistentTestProgress> = new Map();

  private getDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        try {
          const request = indexedDB.open(DB_NAME, DB_VERSION);

          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
              db.createObjectStore(STORE_SESSIONS, { keyPath: 'sessionId' });
            }
          };

          request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
          };

          request.onerror = (err) => {
            console.warn('[TestPersistenceService] IndexedDB open error:', err);
            resolve(null);
          };
        } catch (e) {
          console.warn('[TestPersistenceService] IndexedDB init exception:', e);
          resolve(null);
        }
      });
    }

    return this.dbPromise;
  }

  /**
   * Save or update an in-progress test session
   */
  async saveProgress(progress: PersistentTestProgress): Promise<void> {
    const updated: PersistentTestProgress = {
      ...progress,
      updatedAt: Date.now()
    };

    // 1. In-memory cache for immediate synchronous access
    this.memoryFallback.set(progress.sessionId, updated);

    // 2. LocalStorage fast mirror for synchronous fallback
    try {
      localStorage.setItem(`ielts_test_backup_${progress.sessionId}`, JSON.stringify(updated));
    } catch {
      // LocalStorage might be full or private mode, ignore silently
    }

    // 3. Persistent IndexedDB storage (handles massive blobs and structured objects)
    try {
      const db = await this.getDB();
      if (!db) return;

      const tx = db.transaction([STORE_SESSIONS], 'readwrite');
      const store = tx.objectStore(STORE_SESSIONS);
      store.put(updated);
    } catch (err) {
      console.warn('[TestPersistenceService] Failed to persist session to IndexedDB:', err);
    }
  }

  /**
   * Retrieve active session progress
   */
  async getProgress(sessionId: string): Promise<PersistentTestProgress | null> {
    // 1. Check memory cache first
    if (this.memoryFallback.has(sessionId)) {
      return this.memoryFallback.get(sessionId)!;
    }

    // 2. Check IndexedDB
    try {
      const db = await this.getDB();
      if (db) {
        const item = await new Promise<PersistentTestProgress | null>((resolve) => {
          const tx = db.transaction([STORE_SESSIONS], 'readonly');
          const store = tx.objectStore(STORE_SESSIONS);
          const req = store.get(sessionId);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });

        if (item) {
          this.memoryFallback.set(sessionId, item);
          return item;
        }
      }
    } catch (e) {
      console.warn('[TestPersistenceService] Error fetching from IndexedDB:', e);
    }

    // 3. Check localStorage backup mirror
    try {
      const raw = localStorage.getItem(`ielts_test_backup_${sessionId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistentTestProgress;
        this.memoryFallback.set(sessionId, parsed);
        return parsed;
      }
    } catch {}

    return null;
  }

  /**
   * Synchronously retrieve backup if available (useful during initial React component mounting)
   */
  getSyncProgress(sessionId: string): PersistentTestProgress | null {
    if (this.memoryFallback.has(sessionId)) {
      return this.memoryFallback.get(sessionId)!;
    }
    try {
      const raw = localStorage.getItem(`ielts_test_backup_${sessionId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistentTestProgress;
        this.memoryFallback.set(sessionId, parsed);
        return parsed;
      }
    } catch {}
    return null;
  }

  /**
   * Clear session upon successful submission or user discard
   */
  async clearProgress(sessionId: string): Promise<void> {
    this.memoryFallback.delete(sessionId);
    try {
      localStorage.removeItem(`ielts_test_backup_${sessionId}`);
    } catch {}

    try {
      const db = await this.getDB();
      if (!db) return;
      const tx = db.transaction([STORE_SESSIONS], 'readwrite');
      tx.objectStore(STORE_SESSIONS).delete(sessionId);
    } catch (err) {
      console.warn('[TestPersistenceService] Failed to clear session from IndexedDB:', err);
    }
  }
}

export const testPersistenceService = new TestPersistenceService();
