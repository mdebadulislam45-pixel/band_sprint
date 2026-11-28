/**
 * Barnaby Companion Flair & Milestone Evolution (Finch-inspired)
 * Ties Barnaby's unlockable academic accessories directly to real BandSprint Achievements.
 */

import { loadAchievementsState } from '../services/achievementService';

export type BarnabyFlairId =
  | 'classic'
  | 'early_bird_mug'
  | 'grammar_spectacles'
  | 'sprint_laurel'
  | 'focus_chronometer'
  | 'acoustic_crest';

export interface BarnabyFlairItem {
  id: BarnabyFlairId;
  label: string;
  shortLabel: string;
  requiredBadgeIds: string[];
  unlockHint: string;
  accentHex: string;
}

export const BARNABY_FLAIR_STORAGE_KEY = 'bandsprint_barnaby_flair_v1';
export const BARNABY_FLAIR_UPDATED_EVENT = 'bandsprint_barnaby_flair_updated';

export const BARNABY_FLAIRS: BarnabyFlairItem[] = [
  {
    id: 'classic',
    label: 'Classic Scholar Collar',
    shortLabel: 'Classic',
    requiredBadgeIds: [],
    unlockHint: 'Default BandSprint companion attire',
    accentHex: '#0F4C45'
  },
  {
    id: 'early_bird_mug',
    label: 'Early Bird Brew',
    shortLabel: 'Early Brew',
    requiredBadgeIds: ['early_bird'],
    unlockHint: 'Unlock the Early Bird badge (study before 9:00 AM)',
    accentHex: '#D97706'
  },
  {
    id: 'grammar_spectacles',
    label: 'Grammar Guru Monocle',
    shortLabel: 'Scholar Lens',
    requiredBadgeIds: ['grammar_guru'],
    unlockHint: 'Unlock the Grammar Guru badge in Daily Sprint',
    accentHex: '#0F766E'
  },
  {
    id: 'focus_chronometer',
    label: 'Focus Chronometer',
    shortLabel: 'Chronometer',
    requiredBadgeIds: ['deep_focus', 'streak_7', 'daily_finisher'],
    unlockHint: 'Unlock Daily Finisher, Week of Fire, or Focus Architect',
    accentHex: '#2563EB'
  },
  {
    id: 'acoustic_crest',
    label: 'Studio Acoustic Crest',
    shortLabel: 'Acoustic Crest',
    requiredBadgeIds: ['speaking_maestro', 'listening_ace', 'perfect_listening'],
    unlockHint: 'Unlock Band 8.0+ Listening or Speaking Maestro',
    accentHex: '#7C3AED'
  },
  {
    id: 'sprint_laurel',
    label: 'Band 8.5 Gold Laurel',
    shortLabel: 'Gold Laurel',
    requiredBadgeIds: ['sprint_legend', 'sprint_elite', 'streak_30'],
    unlockHint: 'Unlock Sprint Legend, Sprint Elite, or Iron Discipline',
    accentHex: '#F4A62A'
  }
];

export function getUnlockedBarnabyFlairs(
  unlockedMap: Record<string, number> = loadAchievementsState().unlockedAtById
): BarnabyFlairItem[] {
  return BARNABY_FLAIRS.filter(
    (item) =>
      item.requiredBadgeIds.length === 0 ||
      item.requiredBadgeIds.some((badgeId) => Boolean(unlockedMap[badgeId]))
  );
}

export function isBarnabyFlairUnlocked(
  flairId: BarnabyFlairId,
  unlockedMap: Record<string, number> = loadAchievementsState().unlockedAtById
): boolean {
  const item = BARNABY_FLAIRS.find((f) => f.id === flairId);
  if (!item) return false;
  if (item.requiredBadgeIds.length === 0) return true;
  return item.requiredBadgeIds.some((badgeId) => Boolean(unlockedMap[badgeId]));
}

export function loadSelectedBarnabyFlair(): BarnabyFlairId {
  if (typeof localStorage === 'undefined') return 'classic';
  try {
    const raw = localStorage.getItem(BARNABY_FLAIR_STORAGE_KEY) as BarnabyFlairId | null;
    if (raw && BARNABY_FLAIRS.some((f) => f.id === raw) && isBarnabyFlairUnlocked(raw)) {
      return raw;
    }
  } catch {
    // ignore
  }
  return 'classic';
}

export function saveSelectedBarnabyFlair(flairId: BarnabyFlairId): BarnabyFlairId {
  const safeId: BarnabyFlairId = isBarnabyFlairUnlocked(flairId) ? flairId : 'classic';
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(BARNABY_FLAIR_STORAGE_KEY, safeId);
    } catch {
      // ignore
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BARNABY_FLAIR_UPDATED_EVENT, { detail: safeId }));
  }
  return safeId;
}
