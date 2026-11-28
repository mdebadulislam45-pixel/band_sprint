/**
 * BandSprint — Offline-First Mobile PWA Study & Audio Pack Service
 * Uses IndexedDB (`idb`) for Daily Sprint decks + Cache Storage (`bandsprint-audio-pack-v1`)
 * for pre-cached multi-accent neural MP3 listening & speaking warm-up clips.
 */

import { openDB, IDBPDatabase } from 'idb';
import {
  getPreferredAccent,
  getPreferredStudioSpeakerId,
  OfficialIELTSAccent,
  PROFESSIONAL_STUDIO_VOICES
} from '../config/voiceConfig';
import { audioService } from './audioService';

const OFFLINE_DB_NAME = 'bandsprint_offline_packs_v1';
const OFFLINE_DB_VERSION = 1;
const STORE_PACKS = 'study_packs';
const AUDIO_CACHE_NAME = 'bandsprint-audio-pack-v1';

export interface OfflineStudyPackMeta {
  id: string;
  accent: OfficialIELTSAccent;
  speakerId: string;
  cachedDecksCount: number;
  cachedAudioClipsCount: number;
  updatedAt: number;
  items: Array<{ id: string; title: string; term: string; example: string }>;
}

export interface OfflinePackStatus {
  isReady: boolean;
  accent: OfficialIELTSAccent | null;
  cachedDecksCount: number;
  cachedAudioClipsCount: number;
  updatedAt: number | null;
}

const HIGH_YIELD_OFFLINE_ITEMS = [
  {
    id: 'off_1',
    title: 'Paraphrase Pivot',
    term: 'mitigate adverse impacts',
    example: 'Urban green corridors help mitigate the adverse impacts of rising summer temperatures.'
  },
  {
    id: 'off_2',
    title: 'Academic Contrast',
    term: 'notwithstanding this trend',
    example: 'Notwithstanding this trend, rural rail investment remains critical for regional equity.'
  },
  {
    id: 'off_3',
    title: 'Listening Self-Correction',
    term: 'actually, let me correct that',
    example: 'The conference begins on Tuesday the fourteenth; actually, let me correct that, it was moved to Thursday the sixteenth.'
  },
  {
    id: 'off_4',
    title: 'Task 2 Precision',
    term: 'a compelling body of evidence',
    example: 'A compelling body of evidence indicates that early bilingual education strengthens executive attention.'
  },
  {
    id: 'off_5',
    title: 'Speaking Part 3 Hedging',
    term: 'it is plausible to argue',
    example: 'It is plausible to argue that automation reshapes entry-level careers rather than eliminating human judgment.'
  },
  {
    id: 'off_6',
    title: 'Data Description (Task 1)',
    term: 'experienced a pronounced surge',
    example: 'Renewable solar capacity experienced a pronounced surge between twenty eighteen and twenty twenty-four.'
  }
];

let dbPromise: Promise<IDBPDatabase> | null = null;

function getOfflineDb(): Promise<IDBPDatabase> | null {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return null;
  if (!dbPromise) {
    dbPromise = openDB(OFFLINE_DB_NAME, OFFLINE_DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_PACKS)) {
          db.createObjectStore(STORE_PACKS, { keyPath: 'id' });
        }
      }
    });
  }
  return dbPromise;
}

export async function getOfflinePackStatus(): Promise<OfflinePackStatus> {
  try {
    const db = await getOfflineDb();
    let audioCount = 0;
    if (typeof caches !== 'undefined') {
      const cache = await caches.open(AUDIO_CACHE_NAME);
      const keys = await cache.keys();
      audioCount = keys.length;
    }
    if (!db) {
      return {
        isReady: audioCount > 0,
        accent: audioCount > 0 ? getPreferredAccent() : null,
        cachedDecksCount: 0,
        cachedAudioClipsCount: audioCount,
        updatedAt: null
      };
    }
    const pack = (await db.get(STORE_PACKS, 'daily_sprint_core')) as
      | OfflineStudyPackMeta
      | undefined;
    if (!pack) {
      return {
        isReady: audioCount > 0,
        accent: audioCount > 0 ? getPreferredAccent() : null,
        cachedDecksCount: 0,
        cachedAudioClipsCount: audioCount,
        updatedAt: null
      };
    }
    return {
      isReady: true,
      accent: pack.accent,
      cachedDecksCount: pack.cachedDecksCount,
      cachedAudioClipsCount: Math.max(pack.cachedAudioClipsCount, audioCount),
      updatedAt: pack.updatedAt
    };
  } catch {
    return {
      isReady: false,
      accent: null,
      cachedDecksCount: 0,
      cachedAudioClipsCount: 0,
      updatedAt: null
    };
  }
}

export async function downloadOfflineStudyPack(
  onProgress?: (done: number, total: number) => void
): Promise<OfflinePackStatus> {
  const accent = getPreferredAccent();
  const speakerId = getPreferredStudioSpeakerId();
  const accentVoice = PROFESSIONAL_STUDIO_VOICES.find((v) => v.speakerId === speakerId);
  const total = HIGH_YIELD_OFFLINE_ITEMS.length;
  let cachedClips = 0;

  // 1. Pre-cache neural MP3 clips into Service Worker's Cache Storage (`bandsprint-audio-pack-v1`)
  if (typeof caches !== 'undefined') {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    for (let i = 0; i < HIGH_YIELD_OFFLINE_ITEMS.length; i++) {
      const item = HIGH_YIELD_OFFLINE_ITEMS[i];
      const streamUrl = audioService.buildStreamUrl(
        item.example,
        speakerId,
        accentVoice?.gender,
        1.0,
        { accent, deliveryProfile: 'vocabulary_example' }
      );
      try {
        const res = await fetch(streamUrl);
        if (res.ok) {
          await cache.put(streamUrl, res.clone());
          cachedClips += 1;
        }
      } catch {
        // Non-fatal: continue caching remaining items
      }
      onProgress?.(i + 1, total);
    }
  } else {
    onProgress?.(total, total);
  }

  // 2. Store structured Daily Sprint offline deck in IndexedDB
  const now = Date.now();
  const packRecord: OfflineStudyPackMeta = {
    id: 'daily_sprint_core',
    accent,
    speakerId,
    cachedDecksCount: HIGH_YIELD_OFFLINE_ITEMS.length,
    cachedAudioClipsCount: cachedClips,
    updatedAt: now,
    items: HIGH_YIELD_OFFLINE_ITEMS
  };

  try {
    const db = await getOfflineDb();
    if (db) {
      await db.put(STORE_PACKS, packRecord);
    }
  } catch {
    // ignore storage errors
  }

  return {
    isReady: true,
    accent,
    cachedDecksCount: packRecord.cachedDecksCount,
    cachedAudioClipsCount: cachedClips,
    updatedAt: now
  };
}

export async function clearOfflineStudyPack(): Promise<void> {
  try {
    const db = await getOfflineDb();
    if (db) {
      await db.delete(STORE_PACKS, 'daily_sprint_core');
    }
    if (typeof caches !== 'undefined') {
      await caches.delete(AUDIO_CACHE_NAME);
    }
  } catch {
    // ignore
  }
}
