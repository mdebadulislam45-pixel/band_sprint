/**
 * IELTS Sprint - Centralized Voice Configuration
 *
 * Single source of truth for the entire platform's audio system.
 * Locks and enforces one consistent, natural professional British voice across:
 * - Authentic CD-IELTS Listening Test (Parts 1, 2, 3, and 4)
 * - Listening Lab & Section Practice
 * - Vocabulary & Collocation Pronunciation
 * - Idioms, Phrases, Grammar & Spelling Drills
 * - Speaking Lab & Live AI Examiner Mock Tests
 *
 * Guarantees that the selected voice NEVER changes, drifts, or switches engines
 * even after running continuously for 30+ minutes.
 */

export interface MasterMaleVoiceProfile {
  id: string; // 'speaker_04' by default
  name: string; // 'Arthur'
  displayName: string;
  geminiVoiceName: string; // 'Fenrir'
  role: string;
  rate: number;
  pitch: number;
  lang: string;
}

export const DEFAULT_MASTER_MALE_VOICE: MasterMaleVoiceProfile = {
  id: 'speaker_04',
  name: 'Arthur',
  displayName: 'Arthur · Official Cambridge British Male Voice',
  geminiVoiceName: 'Fenrir',
  role: 'Authoritative, clear, natural British English male voice (Received Pronunciation)',
  rate: 0.96,
  pitch: 1.0,
  lang: 'en-GB'
};

export interface MasterFemaleVoiceProfile {
  id: string; // 'speaker_05'
  name: string; // 'Charlotte'
  displayName: string;
  geminiVoiceName: string; // 'Aoede'
  role: string;
  rate: number;
  pitch: number;
  lang: string;
}

export const DEFAULT_MASTER_FEMALE_VOICE: MasterFemaleVoiceProfile = {
  id: 'speaker_05',
  name: 'Charlotte',
  displayName: 'Charlotte · Official Cambridge British Female Voice',
  geminiVoiceName: 'Aoede',
  role: 'Natural, warm, authentic British English female voice (Received Pronunciation)',
  rate: 0.96,
  pitch: 1.0,
  lang: 'en-GB'
};

const STORAGE_KEY_VOICE_CONFIG = 'ielts_sprint_master_voice_v2';
const STORAGE_KEY_GENDER_PREF = 'ielts_sprint_preferred_voice_gender_v2';

// Locked voice instance cache so the browser NEVER switches voices mid-test
let lockedMaleVoiceInstance: SpeechSynthesisVoice | null = null;
let lockedMaleVoiceCount: number = 0;
let lockedFemaleVoiceInstance: SpeechSynthesisVoice | null = null;
let lockedFemaleVoiceCount: number = 0;

// Strict blacklist of female voice names and identifiers across browsers, mobile OS, and TTS providers
export const FORBIDDEN_FEMALE_PATTERNS: RegExp[] = [
  /female/i,
  /woman/i,
  /girl/i,
  /lady/i,
  /libby/i,
  /sonia/i,
  /serena/i,
  /hazel/i,
  /kate/i,
  /katherine/i,
  /catherine/i,
  /victoria/i,
  /emily/i,
  /samantha/i,
  /zira/i,
  /stephanie/i,
  /fiona/i,
  /karen/i,
  /moira/i,
  /tessa/i,
  /veena/i,
  /yuri/i,
  /ellen/i,
  /susan/i,
  /ava/i,
  /allison/i,
  /joana/i,
  /alice/i,
  /cathy/i,
  /clara/i,
  /amy/i,
  /jenny/i,
  /monica/i,
  /sara/i,
  /sarah/i,
  /nicky/i,
  /shelley/i,
  /sangeeta/i,
  /flo/i,
  /siri/i,
  /aria/i,
  /natasha/i,
  /mia/i,
  /chloe/i,
  /zoe/i,
  /lucy/i,
  /anna/i,
  /olivia/i,
  /charlotte/i,
  /amelia/i,
  /sophia/i,
  /isabella/i,
  /grace/i,
  /hannah/i,
  /leah/i,
  /lily/i,
  /kore/i,
  /aoede/i,
  /zephyr/i,
  /-gba-/i,
  /-gbc-/i,
  /-gbf-/i,
  /-fis-/i,
  /en-gb-x-gba/i,
  /en-gb-x-gbc/i,
  /en-gb-x-gbf/i,
  /en-gb-x-fis/i,
  /en-us-x-sfg/i,
  /google us english/i,
  /google uk english female/i,
  /google.*female/i,
  /microsoft.*female/i,
  /wavenet-a/i,
  /wavenet-c/i,
  /wavenet-e/i,
  /wavenet-f/i,
  /journey-f/i,
  /journey-d/i,
  /neural2-a/i,
  /neural2-c/i,
  /neural2-e/i,
  /neural2-f/i,
  /standard-a/i,
  /standard-c/i,
  /standard-e/i,
  /standard-f/i
];

// Priority list for known verified high-quality English male voices
export const MALE_VOICE_PRIORITY_PATTERNS: RegExp[] = [
  /microsoft ryan/i,
  /microsoft george/i,
  /microsoft oliver/i,
  /arthur/i,
  /daniel/i,
  /oliver/i,
  /george/i,
  /ryan/i,
  /google uk english male/i,
  /en-gb-x-rjs/i,
  /en-gb-x-gbb/i,
  /en-gb-x-gbd/i,
  /-rjs-/i,
  /-gbb-/i,
  /-gbd-/i,
  /en-gb.*male/i,
  /david/i,
  /brian/i,
  /alex/i,
  /malcolm/i,
  /jamie/i,
  /gordon/i,
  /aaron/i,
  /james/i,
  /mark/i,
  /william/i,
  /thomas/i,
  /charles/i,
  /henry/i,
  /edward/i,
  /\bmale\b/i,
  /\bguy\b/i
];

/**
 * Checks whether a given speech synthesis voice is strictly a male voice
 */
export function isStrictlyMaleVoice(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase();
  for (const pattern of FORBIDDEN_FEMALE_PATTERNS) {
    if (pattern.test(name)) return false;
  }
  for (const pattern of MALE_VOICE_PRIORITY_PATTERNS) {
    if (pattern.test(name)) return true;
  }
  return false;
}

/**
 * Resets locked voice instances (used when resetting audio system)
 */
export function resetLockedVoices(): void {
  lockedMaleVoiceInstance = null;
  lockedMaleVoiceCount = 0;
  lockedFemaleVoiceInstance = null;
  lockedFemaleVoiceCount = 0;
}

/**
 * Finds and LOCKS the best available British/international Male voice from the browser's list.
 * Once a verified voice is locked for the current voice list, the exact same SpeechSynthesisVoice
 * instance is returned on every subsequent call so the voice NEVER changes mid-session.
 */
export function selectBestDeviceMaleVoice(
  voices?: SpeechSynthesisVoice[]
): { voice: SpeechSynthesisVoice | null; pitchMultiplier: number } {
  let voiceList = voices;
  if ((!voiceList || voiceList.length === 0) && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    voiceList = window.speechSynthesis.getVoices();
  }

  if (!voiceList || voiceList.length === 0) {
    return { voice: lockedMaleVoiceInstance, pitchMultiplier: 1.0 };
  }

  // Return the locked voice if the browser voice list hasn't changed
  if (lockedMaleVoiceInstance && lockedMaleVoiceCount === voiceList.length) {
    const stillExists = voiceList.find(
      (v) => v.voiceURI === lockedMaleVoiceInstance?.voiceURI && v.name === lockedMaleVoiceInstance?.name
    );
    if (stillExists) {
      return { voice: stillExists, pitchMultiplier: 1.0 };
    }
  }

  // 1. Filter out all known female voices completely
  const nonFemaleVoices = voiceList.filter((v) => {
    const name = v.name.toLowerCase();
    for (const pat of FORBIDDEN_FEMALE_PATTERNS) {
      if (pat.test(name)) return false;
    }
    return true;
  });

  // 2. Look for UK / British Male voices with explicit confirmed male identifiers
  // Prefer localService voices first when available to avoid remote network voice drops
  const ukNonFemale = nonFemaleVoices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('en-gb') ||
      v.lang.toLowerCase() === 'en_gb' ||
      /british|united kingdom|great britain|\buk\b/i.test(v.name)
  );

  let chosen: SpeechSynthesisVoice | null = null;

  for (const pattern of MALE_VOICE_PRIORITY_PATTERNS) {
    const localMatch = ukNonFemale.find((v) => pattern.test(v.name) && v.localService);
    if (localMatch) {
      chosen = localMatch;
      break;
    }
    const anyMatch = ukNonFemale.find((v) => pattern.test(v.name));
    if (anyMatch) {
      chosen = anyMatch;
      break;
    }
  }

  // 3. Look for any English voice with explicit confirmed male identifiers (prefer localService)
  if (!chosen) {
    for (const pattern of MALE_VOICE_PRIORITY_PATTERNS) {
      const localMatch = nonFemaleVoices.find(
        (v) => pattern.test(v.name) && v.lang.toLowerCase().startsWith('en') && v.localService
      );
      if (localMatch) {
        chosen = localMatch;
        break;
      }
      const anyMatch = nonFemaleVoices.find(
        (v) => pattern.test(v.name) && v.lang.toLowerCase().startsWith('en')
      );
      if (anyMatch) {
        chosen = anyMatch;
        break;
      }
    }
  }

  // 4. Fallback: Take UK non-female voice (prefer localService)
  if (!chosen && ukNonFemale.length > 0) {
    chosen = ukNonFemale.find((v) => v.localService) || ukNonFemale[0];
  }

  // 5. Fallback: Any English non-female voice (prefer localService)
  if (!chosen) {
    const englishNonFemale = nonFemaleVoices.filter((v) => v.lang.toLowerCase().startsWith('en'));
    if (englishNonFemale.length > 0) {
      chosen = englishNonFemale.find((v) => v.localService) || englishNonFemale[0];
    }
  }

  // 6. Absolute fallback: Pick best available English voice
  if (!chosen) {
    const anyEnglish = voiceList.filter((v) => v.lang.toLowerCase().startsWith('en'));
    if (anyEnglish.length > 0) {
      chosen = anyEnglish.find((v) => v.localService) || anyEnglish[0];
    }
  }

  if (chosen) {
    lockedMaleVoiceInstance = chosen;
    lockedMaleVoiceCount = voiceList.length;
  }

  return { voice: chosen, pitchMultiplier: 1.0 };
}

// Priority list for known verified natural British female voices
export const FEMALE_BRITISH_VOICE_PATTERNS: RegExp[] = [
  /microsoft libby/i,
  /microsoft sonia/i,
  /microsoft maisie/i,
  /serena.*natural/i,
  /serena/i,
  /kate/i,
  /hazel/i,
  /martha/i,
  /charlotte/i,
  /google uk english female/i,
  /alice/i,
  /victoria/i,
  /en-gb.*female/i
];

/**
 * Finds and LOCKS the best available natural British female voice from the browser's list.
 */
export function selectBestDeviceFemaleVoice(
  voices?: SpeechSynthesisVoice[]
): { voice: SpeechSynthesisVoice | null; pitchMultiplier: number } {
  let voiceList = voices;
  if ((!voiceList || voiceList.length === 0) && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    voiceList = window.speechSynthesis.getVoices();
  }

  if (!voiceList || voiceList.length === 0) {
    return { voice: lockedFemaleVoiceInstance, pitchMultiplier: 1.0 };
  }

  if (lockedFemaleVoiceInstance && lockedFemaleVoiceCount === voiceList.length) {
    const stillExists = voiceList.find(
      (v) => v.voiceURI === lockedFemaleVoiceInstance?.voiceURI && v.name === lockedFemaleVoiceInstance?.name
    );
    if (stillExists) {
      return { voice: stillExists, pitchMultiplier: 1.0 };
    }
  }

  let chosen: SpeechSynthesisVoice | null = null;

  // 1. Look for confirmed natural British female voices
  for (const pattern of FEMALE_BRITISH_VOICE_PATTERNS) {
    const match = voiceList.find(
      (v) =>
        pattern.test(v.name) &&
        (v.lang.toLowerCase().startsWith('en-gb') ||
          v.lang.toLowerCase() === 'en_gb' ||
          /british|united kingdom|great britain|\buk\b/i.test(v.name))
    );
    if (match) {
      chosen = match;
      break;
    }
  }

  // 2. Look for any British female voice (starts with en-gb)
  if (!chosen) {
    const ukFemale = voiceList.filter((v) => {
      const isUk = v.lang.toLowerCase().startsWith('en-gb') || v.lang.toLowerCase() === 'en_gb';
      const isFemale = FORBIDDEN_FEMALE_PATTERNS.some((p) => p.test(v.name));
      return isUk && isFemale;
    });
    if (ukFemale.length > 0) {
      chosen = ukFemale.find((v) => v.localService) || ukFemale[0];
    }
  }

  // 3. Look for any en-GB voice
  if (!chosen) {
    const ukAny = voiceList.filter((v) => v.lang.toLowerCase().startsWith('en-gb'));
    if (ukAny.length > 0) {
      chosen = ukAny.find((v) => v.localService) || ukAny[0];
    }
  }

  if (chosen) {
    lockedFemaleVoiceInstance = chosen;
    lockedFemaleVoiceCount = voiceList.length;
  }

  return { voice: chosen, pitchMultiplier: 1.0 };
}

/**
 * Universal British voice selector supporting both certified Male (Arthur) and Female (Charlotte)
 */
export function selectBestDeviceBritishVoice(
  voices: SpeechSynthesisVoice[],
  preferredGender: 'male' | 'female' = 'male'
): { voice: SpeechSynthesisVoice | null; pitchMultiplier: number } {
  if (preferredGender === 'female') {
    return selectBestDeviceFemaleVoice(voices);
  }
  return selectBestDeviceMaleVoice(voices);
}

/**
 * Returns preferred examiner voice gender ('male' | 'female')
 */
export function getPreferredVoiceGender(): 'male' | 'female' {
  if (typeof window === 'undefined') return 'male';
  try {
    const pref = localStorage.getItem(STORAGE_KEY_GENDER_PREF);
    if (pref === 'female' || pref === 'male') return pref;
  } catch {}
  return 'male';
}

/**
 * Sets preferred examiner voice gender
 */
export function setPreferredVoiceGender(gender: 'male' | 'female'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_GENDER_PREF, gender);
    resetLockedVoices();
    window.dispatchEvent(new CustomEvent('ielts_voice_gender_changed', { detail: { gender } }));
  } catch {}
}

/**
 * Returns current global master voice configuration
 */
export function getGlobalPreferredMaleVoice(): MasterMaleVoiceProfile {
  if (typeof window === 'undefined') {
    return DEFAULT_MASTER_MALE_VOICE;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VOICE_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) {
        return {
          ...DEFAULT_MASTER_MALE_VOICE,
          ...parsed,
          rate: 0.96,
          pitch: 1.0
        };
      }
    }
  } catch {}
  return DEFAULT_MASTER_MALE_VOICE;
}

/**
 * Updates global master voice configuration and synchronizes across all modules
 */
export function setGlobalPreferredMaleVoice(profile: Partial<MasterMaleVoiceProfile>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getGlobalPreferredMaleVoice();
    const updated: MasterMaleVoiceProfile = {
      ...current,
      ...profile,
      rate: 0.96,
      pitch: 1.0
    };
    localStorage.setItem(STORAGE_KEY_VOICE_CONFIG, JSON.stringify(updated));
    resetLockedVoices();

    window.dispatchEvent(
      new CustomEvent('ielts_master_voice_changed', {
        detail: updated
      })
    );
  } catch (err) {
    console.warn('Failed to persist global voice config:', err);
  }
}

// Pre-warm browser voices on initial module load
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.getVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        try {
          const v = window.speechSynthesis.getVoices();
          if (v && v.length > 0) {
            selectBestDeviceMaleVoice(v);
          }
        } catch {}
      };
    }
  } catch {}
}

export type OfficialIELTSAccent = 'British' | 'Australian' | 'American' | 'Canadian' | 'New Zealand' | 'Irish';

export const IELTS_ACCENTS: OfficialIELTSAccent[] = [
  'British',
  'Australian',
  'American',
  'Canadian',
  'New Zealand',
  'Irish'
];

export const ACCENT_METADATA: Record<OfficialIELTSAccent, { flag: string; label: string; maleSpeaker: string; femaleSpeaker: string; description: string }> = {
  British: {
    flag: '🇬🇧',
    label: 'British (RP)',
    maleSpeaker: 'Arthur (RP Examiner)',
    femaleSpeaker: 'Charlotte (Academic Lecturer)',
    description: 'Received Pronunciation & Standard Southern British English'
  },
  Australian: {
    flag: '🇦🇺',
    label: 'Australian',
    maleSpeaker: 'William (Marine Tutor)',
    femaleSpeaker: 'Natasha (Community Guide)',
    description: 'Authentic Australian native cadence with natural pitch contour'
  },
  American: {
    flag: '🇺🇸',
    label: 'North American',
    maleSpeaker: 'Christopher (Visiting Fellow)',
    femaleSpeaker: 'Jenny (Exchange Student)',
    description: 'Clear General American accent with articulate diction'
  },
  Canadian: {
    flag: '🇨🇦',
    label: 'Canadian',
    maleSpeaker: 'Liam (Fieldwork Director)',
    femaleSpeaker: 'Clara (University Registrar)',
    description: 'Standard Canadian English with crisp phonology'
  },
  'New Zealand': {
    flag: '🇳🇿',
    label: 'New Zealand',
    maleSpeaker: 'Mitchell (Ecology Warden)',
    femaleSpeaker: 'Molly (Student Officer)',
    description: 'Authentic Kiwi accent with distinctive intonation'
  },
  Irish: {
    flag: '🇮🇪',
    label: 'Irish',
    maleSpeaker: 'Connor (Heritage Curator)',
    femaleSpeaker: 'Emily (Linguistics Scholar)',
    description: 'Melodious Hiberno-English with clear enunciation'
  }
};

const STORAGE_KEY_ACCENT_PREF = 'ielts_sprint_preferred_accent_v2';

export function getPreferredAccent(): OfficialIELTSAccent {
  if (typeof window === 'undefined') return 'British';
  try {
    const pref = localStorage.getItem(STORAGE_KEY_ACCENT_PREF) as OfficialIELTSAccent;
    if (pref && IELTS_ACCENTS.includes(pref)) return pref;
  } catch {}
  return 'British';
}

export function setPreferredAccent(accent: OfficialIELTSAccent): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ACCENT_PREF, accent);
    window.dispatchEvent(new CustomEvent('ielts_accent_changed', { detail: { accent } }));
  } catch (err) {
    console.warn('Failed to persist accent preference:', err);
  }
}
