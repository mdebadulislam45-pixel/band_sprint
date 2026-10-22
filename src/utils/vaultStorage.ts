import { MistakeItem } from '../types';

const VAULT_KEY = 'ielts_sprint_mistake_vault_v1';

/**
 * Sanitizes and validates a mistake item to prevent any undefined/null field rendering crashes
 */
function sanitizeMistakeItem(raw: any, index: number): MistakeItem | null {
  if (!raw || typeof raw !== 'object') return null;

  const validModules = ['listening', 'reading', 'writing', 'speaking', 'vocab'] as const;
  let rawModule = typeof raw.module === 'string' ? raw.module.toLowerCase().trim() : 'vocab';
  if (!validModules.includes(rawModule as any)) {
    rawModule = 'vocab';
  }

  // Ensure safe timestamp
  let parsedTimestamp = typeof raw.timestamp === 'number' && !isNaN(raw.timestamp) ? raw.timestamp : Date.now();
  if (parsedTimestamp <= 0) parsedTimestamp = Date.now();

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `m_${Date.now()}_${index}`,
    timestamp: parsedTimestamp,
    module: rawModule as MistakeItem['module'],
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'IELTS Review Item',
    userAnswer: typeof raw.userAnswer === 'string' ? raw.userAnswer : (raw.userAnswer != null ? String(raw.userAnswer) : '—'),
    correctAnswer: typeof raw.correctAnswer === 'string' && raw.correctAnswer.trim() ? raw.correctAnswer.trim() : (raw.correctAnswer != null ? String(raw.correctAnswer) : 'Correct Form Required'),
    explanation: typeof raw.explanation === 'string' && raw.explanation.trim() ? raw.explanation.trim() : 'Review Cambridge grammar / vocabulary guidelines for this question.',
    mastered: Boolean(raw.mastered)
  };
}

export function getMistakes(): MistakeItem[] {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return [];
    
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const sanitized: MistakeItem[] = [];
    parsed.forEach((item, idx) => {
      const clean = sanitizeMistakeItem(item, idx);
      if (clean) sanitized.push(clean);
    });

    return sanitized;
  } catch (err) {
    console.warn('[MistakeVault] Error reading local mistakes:', err);
    return [];
  }
}

export function saveMistakes(mistakes: MistakeItem[]): void {
  try {
    const safeList = Array.isArray(mistakes)
      ? mistakes
          .map((m, idx) => sanitizeMistakeItem(m, idx))
          .filter((m): m is MistakeItem => m !== null)
      : [];
    localStorage.setItem(VAULT_KEY, JSON.stringify(safeList));
    window.dispatchEvent(new CustomEvent('vault_updated', { detail: safeList }));
  } catch (err) {
    console.warn('[MistakeVault] Storage write failed (quota or private mode):', err);
  }
}

export function addMistake(item: Omit<MistakeItem, 'id' | 'timestamp' | 'mastered'>): MistakeItem {
  const current = getMistakes();
  
  // Safe string sanitization
  const safeTitle = typeof item.title === 'string' ? item.title.trim() : 'IELTS Question';
  const safeModule = item.module || 'vocab';
  
  // Check if identical item exists
  const existing = current.find(m => m.title === safeTitle && m.module === safeModule);
  if (existing) {
    existing.userAnswer = typeof item.userAnswer === 'string' ? item.userAnswer : String(item.userAnswer || '');
    existing.correctAnswer = typeof item.correctAnswer === 'string' ? item.correctAnswer : String(item.correctAnswer || '');
    if (item.explanation) existing.explanation = item.explanation;
    existing.mastered = false;
    saveMistakes(current);
    return existing;
  }

  const newMistake: MistakeItem = {
    id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: Date.now(),
    module: safeModule,
    title: safeTitle,
    userAnswer: typeof item.userAnswer === 'string' ? item.userAnswer : String(item.userAnswer || '—'),
    correctAnswer: typeof item.correctAnswer === 'string' ? item.correctAnswer : String(item.correctAnswer || ''),
    explanation: typeof item.explanation === 'string' ? item.explanation : 'Cambridge exam review guidance.',
    mastered: false,
  };

  saveMistakes([newMistake, ...current]);
  return newMistake;
}

export function toggleMastery(id: string): void {
  if (!id) return;
  const current = getMistakes();
  const updated = current.map(m => m.id === id ? { ...m, mastered: !m.mastered } : m);
  saveMistakes(updated);
}

export function deleteMistake(id: string): void {
  if (!id) return;
  const current = getMistakes();
  saveMistakes(current.filter(m => m.id !== id));
}

export function clearMistakes(): void {
  saveMistakes([]);
}
