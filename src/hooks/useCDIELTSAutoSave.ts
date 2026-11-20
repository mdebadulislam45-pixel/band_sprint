import { useEffect, useRef, useCallback } from 'react';

export interface CDIELTSSessionData {
  selectedSetIdx: number;
  activeSkill: 'reading' | 'listening' | 'writing';
  userAnswers: Record<number, string>;
  flaggedQuestions: number[];
  task1Essay: string;
  task2Essay: string;
  timeRemainingSec: number;
  highlights: string[];
  underlines?: string[];
  notes: any[];
  savedAtTimestamp?: number;
}

export const AUTO_SAVE_STORAGE_KEY = 'cdielts_session_data';

/**
 * Custom React hook for the CD-IELTS simulator that performs a background save
 * of the user's progress into localStorage every 30 seconds (and on beforeunload),
 * including question answers, essays, notes, highlights, and countdown timer state.
 */
export function useCDIELTSAutoSave(
  data: CDIELTSSessionData,
  options: {
    intervalMs?: number;
    enabled?: boolean;
    onAutoSaveSuccess?: (timestampFormatted: string) => void;
  } = {}
) {
  const { intervalMs = 30000, enabled = true, onAutoSaveSuccess } = options;
  const dataRef = useRef<CDIELTSSessionData>(data);

  // Synchronize latest state into ref to avoid resetting the timer on every keystroke
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const saveToStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const current = dataRef.current;
      const payload: CDIELTSSessionData = {
        ...current,
        savedAtTimestamp: Date.now()
      };
      localStorage.setItem(AUTO_SAVE_STORAGE_KEY, JSON.stringify(payload));
      const timeStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      onAutoSaveSuccess?.(timeStr);
    } catch (err) {
      console.warn('Failed to auto-save CD-IELTS simulator state to localStorage:', err);
    }
  }, [onAutoSaveSuccess]);

  // 30-Second recurring interval timer
  useEffect(() => {
    if (!enabled) return;

    const timer = window.setInterval(() => {
      saveToStorage();
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs, saveToStorage]);

  // Accidental tab close / browser refresh beforeunload safety hook
  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      saveToStorage();
      const current = dataRef.current;
      const hasContent =
        (current.task1Essay && current.task1Essay.trim().length > 0) ||
        (current.task2Essay && current.task2Essay.trim().length > 0) ||
        (current.userAnswers && Object.keys(current.userAnswers).length > 0);

      if (hasContent) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, saveToStorage]);

  return { saveNow: saveToStorage };
}
