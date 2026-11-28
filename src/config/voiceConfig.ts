/**
 * BandSprint - Centralized Voice Configuration
 *
 * Single source of truth for the entire platform's audio system.
 * Locks and enforces one consistent, natural professional British voice across:
 * - CD-IELTS Listening Test (Parts 1, 2, 3, and 4)
 * - Listening Lab & Section Practice
 * - Vocabulary & Collocation Pronunciation
 * - Idioms, Phrases, Grammar & Spelling Drills
 * - Speaking Lab & Live AI Examiner Mock Tests
 *
 * Guarantees that the selected voice NEVER changes, drifts, or switches engines
 * even after running continuously for 30+ minutes.
 */

export interface ExaminerVoiceRegistryEntry {
  examinerId: 'arthur' | 'clara';
  speakerId: 'speaker_04' | 'speaker_05';
  personaName: string;
  displayName: string;
  shortLabel: string;
  gender: 'male' | 'female';
  locale: 'en-GB';
  accent: 'British';
  preferredCloudVoiceId:
    | 'gemini-3.8-flash-lite-tts:Charon'
    | 'gemini-3.8-flash-lite-tts:Aoede'
    | 'en-GB-RyanNeural'
    | 'en-GB-SoniaNeural';
  edgeNeuralVoiceId: 'en-GB-RyanNeural' | 'en-GB-SoniaNeural';
  preferredBrowserVoiceNames: string[];
  geminiVoiceName: 'Charon' | 'Fenrir' | 'Aoede';
  acousticSignatureId: 'uk_rp_baritone_arthur_v12' | 'uk_rp_soprano_clara_v12';
  fundamentalFreqTargetHz: number;
  speakingRatePreference: number;
  browserRatePreference: number;
  pitchPreference: number;
  rate: number;
  pitch: number;
  fallbackPolicy: 'error_or_distinct_acoustic' | 'strict_distinct' | 'cloud_then_en_gb_then_en';
  personaDescription: string;
}

export const EXAMINER_VOICE_REGISTRY: Record<'arthur' | 'clara', ExaminerVoiceRegistryEntry> = {
  arthur: {
    examinerId: 'arthur',
    speakerId: 'speaker_04',
    personaName: 'Prof. Arthur Pendelton',
    displayName: 'Prof. Arthur Pendelton · Standard Southern British Examiner Persona',
    shortLabel: 'Prof. Arthur — Male',
    gender: 'male',
    locale: 'en-GB',
    accent: 'British',
    preferredCloudVoiceId: 'gemini-3.8-flash-lite-tts:Charon',
    edgeNeuralVoiceId: 'en-GB-RyanNeural',
    preferredBrowserVoiceNames: [
      'Microsoft Ryan Online (Natural) - English (United Kingdom)',
      'Microsoft George - English (United Kingdom)',
      'Google UK English Male',
      'Daniel',
      'Arthur',
      'Oliver'
    ],
    geminiVoiceName: 'Charon',
    acousticSignatureId: 'uk_rp_baritone_arthur_v12',
    fundamentalFreqTargetHz: 120,
    speakingRatePreference: 1.0,
    browserRatePreference: 0.95,
    pitchPreference: 1.0,
    rate: 1.0,
    pitch: 1.0,
    fallbackPolicy: 'strict_distinct',
    personaDescription:
      'Contemporary standard Southern British pronunciation; thoughtful, measured, composed, and clear.'
  },
  clara: {
    examinerId: 'clara',
    speakerId: 'speaker_05',
    personaName: 'Dr. Clara Sterling',
    displayName: 'Dr. Clara Sterling · Standard Southern British Examiner Persona',
    shortLabel: 'Dr. Clara — Female',
    gender: 'female',
    locale: 'en-GB',
    accent: 'British',
    preferredCloudVoiceId: 'gemini-3.8-flash-lite-tts:Aoede',
    edgeNeuralVoiceId: 'en-GB-SoniaNeural',
    preferredBrowserVoiceNames: [
      'Microsoft Sonia Online (Natural) - English (United Kingdom)',
      'Microsoft Libby Online (Natural) - English (United Kingdom)',
      'Microsoft Hazel - English (United Kingdom)',
      'Google UK English Female',
      'Serena',
      'Kate',
      'Martha'
    ],
    geminiVoiceName: 'Aoede',
    acousticSignatureId: 'uk_rp_soprano_clara_v12',
    fundamentalFreqTargetHz: 210,
    speakingRatePreference: 1.0,
    browserRatePreference: 0.96,
    pitchPreference: 1.0,
    rate: 1.0,
    pitch: 1.0,
    fallbackPolicy: 'strict_distinct',
    personaDescription:
      'Standard Southern British/RP-like pronunciation; calm, articulate, reassuring, and professionally neutral.'
  }
};

/**
 * Resolves any examiner identifier ('arthur' | 'clara' | 'speaker_04' | 'speaker_05' | 'male' | 'female')
 * to its strongly typed ExaminerVoiceRegistryEntry.
 */
export function resolveExaminerVoiceProfile(
  identifier?: string | null,
  fallbackGender: 'male' | 'female' = 'male'
): ExaminerVoiceRegistryEntry {
  const norm = (identifier || '').trim().toLowerCase();
  if (
    norm === 'clara' ||
    norm === 'speaker_05' ||
    norm === 'speaker_02' ||
    norm === 'female' ||
    norm.includes('clara') ||
    norm.includes('sonia') ||
    norm.includes('charlotte')
  ) {
    return EXAMINER_VOICE_REGISTRY.clara;
  }
  if (
    norm === 'arthur' ||
    norm === 'speaker_04' ||
    norm === 'speaker_01' ||
    norm === 'speaker_03' ||
    norm === 'male' ||
    norm.includes('arthur') ||
    norm.includes('ryan') ||
    norm.includes('alistair')
  ) {
    return EXAMINER_VOICE_REGISTRY.arthur;
  }
  return fallbackGender === 'female' ? EXAMINER_VOICE_REGISTRY.clara : EXAMINER_VOICE_REGISTRY.arthur;
}

export interface CompanionVoiceProfile {
  companionId: 'barnaby';
  speakerId: 'speaker_barnaby';
  personaName: string;
  displayName: string;
  shortLabel: string;
  gender: 'female' | 'male';
  locale: 'en-GB';
  accent: 'British';
  preferredCloudVoiceId: 'gemini-3.8-flash-tts:Puck' | 'gemini-3.8-flash-lite-tts:Puck';
  geminiVoiceName: 'Puck';
  edgeNeuralVoiceId: string;
  preferredBrowserVoiceNames: string[];
  acousticSignatureId: string;
  speakingRatePreference: number;
  browserRatePreference: number;
  pitchPreference: number;
  deliveryProfile: 'barnaby_companion';
  cacheVersionPrefix: string;
  styleInstruction: string;
  personaDescription: string;
}

export const BARNABY_VOICE_PROFILE: CompanionVoiceProfile = {
  companionId: 'barnaby',
  speakerId: 'speaker_barnaby',
  personaName: 'Barnaby',
  displayName: 'Barnaby · Duolingo-Style IELTS Mascot',
  shortLabel: 'Barnaby — Duo Mascot',
  gender: 'female',
  locale: 'en-GB',
  accent: 'British',
  preferredCloudVoiceId: 'gemini-3.8-flash-tts:Puck',
  geminiVoiceName: 'Puck',
  edgeNeuralVoiceId: 'en-GB-LibbyNeural',
  preferredBrowserVoiceNames: [
    'Microsoft Libby Online (Natural) - English (United Kingdom)',
    'Microsoft Sonia Online (Natural) - English (United Kingdom)',
    'Microsoft Jenny Online (Natural) - English (United States)',
    'Google UK English Female',
    'Serena',
    'Kate'
  ],
  acousticSignatureId: 'companion-duo-barnaby-mascot-v4',
  speakingRatePreference: 1.07,
  browserRatePreference: 1.07,
  pitchPreference: 1.14,
  deliveryProfile: 'barnaby_companion',
  cacheVersionPrefix: 'v4_barnaby_duo_style',
  styleInstruction:
    'Barnaby, a playful, upbeat, witty Duolingo-style IELTS study mascot companion. Speak with snappy conversational punch, bright cheerful encouragement, expressive mascot warmth, and crisp friendly clarity—energetic and motivating like Duo!',
  personaDescription:
    'Upbeat, snappy Duolingo-style mascot voice—bright, playful, expressive, and motivating!'
};

export function isBarnabyCompanionVoice(identifier?: string | null): boolean {
  const norm = (identifier || '').trim().toLowerCase();
  return norm === 'barnaby' || norm === 'speaker_barnaby' || norm === 'lexical_barnaby' || norm.includes('barnaby');
}

/**
 * Builds a deterministic, collision-proof synthesis cache key incorporating provider,
 * speakerId, voiceId, gender, locale, deliveryProfile, rate, pitch, and normalized text.
 * Uses a separate cache namespace for Barnaby ('v2_barnaby_mentor') so changing Barnaby
 * never invalidates or collides with Arthur or Clara ('v24_studio_neural').
 */
export function buildVoiceSynthesisCacheKey(params: {
  provider: string;
  speakerId: string;
  voiceId: string;
  gender: 'male' | 'female';
  locale: string;
  deliveryProfile?: string;
  rate?: number | string;
  pitch?: number | string;
  text: string;
}): string {
  const cleanText = params.text.trim().replace(/\s+/g, ' ');
  const isBarnaby = isBarnabyCompanionVoice(params.speakerId) || params.deliveryProfile === 'barnaby_companion';
  const namespace = isBarnaby ? BARNABY_VOICE_PROFILE.cacheVersionPrefix : 'v24_studio_neural';
  return [
    namespace,
    params.provider.trim().toLowerCase(),
    params.speakerId.trim().toLowerCase(),
    params.voiceId.trim().toLowerCase(),
    params.gender,
    params.locale.trim().toLowerCase(),
    (params.deliveryProfile || 'default').trim().toLowerCase(),
    String(params.rate ?? 1.0),
    String(params.pitch ?? 1.0),
    cleanText
  ].join('|');
}

export interface MasterMaleVoiceProfile {
  id: string; // 'speaker_04' by default
  name: string; // 'Arthur'
  displayName: string;
  geminiVoiceName: string; // 'Charon'
  role: string;
  rate: number;
  pitch: number;
  lang: string;
}

export const DEFAULT_MASTER_MALE_VOICE: MasterMaleVoiceProfile = {
  id: 'speaker_04',
  name: 'Arthur',
  displayName: 'Prof. Arthur Pendelton · Senior British Examiner (RP)',
  geminiVoiceName: 'Charon',
  role: 'Mature, confident, measured British Received Pronunciation IELTS examiner',
  rate: 1.0,
  pitch: 1.0,
  lang: 'en-GB'
};

export interface MasterFemaleVoiceProfile {
  id: string; // 'speaker_05'
  name: string; // 'Clara'
  displayName: string;
  geminiVoiceName: string; // 'Aoede'
  role: string;
  rate: number;
  pitch: number;
  lang: string;
}

export const DEFAULT_MASTER_FEMALE_VOICE: MasterFemaleVoiceProfile = {
  id: 'speaker_05',
  name: 'Clara',
  displayName: 'Dr. Clara Sterling · Senior British Examiner (RP)',
  geminiVoiceName: 'Aoede',
  role: 'Formal, composed, articulate British Received Pronunciation IELTS examiner',
  rate: 1.0,
  pitch: 1.0,
  lang: 'en-GB'
};

const STORAGE_KEY_VOICE_CONFIG = 'ielts_sprint_master_voice_v2';
const STORAGE_KEY_GENDER_PREF = 'ielts_sprint_preferred_voice_gender_v2';
const STORAGE_KEY_EXAMINER_GENDER = 'ielts_selected_examiner_gender_v1';

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

// Voices whose names signal a modern neural / studio-quality engine. These sound
// professional; old local system voices (David, Zira, Pico, Alex) do not, even
// though they are installed on the device. Always prefer a premium voice over a
// local one — the speech engine already skips a dead utterance and moves on, so
// a remote voice that drops costs one clause, not the exam.
export const PREMIUM_VOICE_SIGNALS: RegExp =
  /natural|online|neural|enhanced|wavenet|studio|premium/i;

export function pickPremiumVoice(
  candidates: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  return candidates.find((v) => PREMIUM_VOICE_SIGNALS.test(v.name)) || null;
}

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

  // 2a. Premium neural voice first: a remote "Natural / Online" voice sounds like a
  // professional recording; a local system voice sounds robotic. Take the premium
  // one even though it is not localService.
  chosen = pickPremiumVoice(ukNonFemale);

  for (const pattern of MALE_VOICE_PRIORITY_PATTERNS) {
    if (chosen) break;
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

  // 4. Fallback: Take UK non-female voice (premium neural first, then local)
  if (!chosen && ukNonFemale.length > 0) {
    chosen =
      pickPremiumVoice(ukNonFemale) ||
      ukNonFemale.find((v) => v.localService) ||
      ukNonFemale[0];
  }

  // 5. Fallback: Any English non-female voice (premium neural first, then local)
  if (!chosen) {
    const englishNonFemale = nonFemaleVoices.filter((v) => v.lang.toLowerCase().startsWith('en'));
    if (englishNonFemale.length > 0) {
      chosen =
        pickPremiumVoice(englishNonFemale) ||
        englishNonFemale.find((v) => v.localService) ||
        englishNonFemale[0];
    }
  }

  // 6. Absolute fallback: Pick best available English voice
  if (!chosen) {
    const anyEnglish = voiceList.filter((v) => v.lang.toLowerCase().startsWith('en'));
    if (anyEnglish.length > 0) {
      chosen =
        pickPremiumVoice(anyEnglish) ||
        anyEnglish.find((v) => v.localService) ||
        anyEnglish[0];
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
  /microsoft sonia/i,
  /microsoft libby/i,
  /serena.*natural/i,
  /serena/i,
  /kate/i,
  /hazel/i,
  /martha/i,
  /charlotte/i,
  /clara/i,
  /google uk english female/i,
  /alice/i,
  /victoria/i,
  /samantha/i,
  /fiona/i,
  /moira/i,
  /karen/i,
  /en-gb.*female/i
];

/**
 * Finds and LOCKS the best available natural British female voice from the browser's list.
 * Strictly excludes known male voices so a browser fallback can NEVER route Dr. Clara to a male voice.
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

  // Filter out strictly male voices so Dr. Clara never receives a male voice
  const nonMaleVoices = voiceList.filter((v) => {
    if (lockedMaleVoiceInstance && v.voiceURI === lockedMaleVoiceInstance.voiceURI && v.name === lockedMaleVoiceInstance.name) {
      return false;
    }
    return !MALE_VOICE_PRIORITY_PATTERNS.some((pat) => pat.test(v.name));
  });

  let chosen: SpeechSynthesisVoice | null = null;

  // 0. Premium neural voice first: a remote "Natural / Online" voice sounds like a
  // professional recording; a local system voice sounds robotic. Take the premium
  // one even though it is not localService.
  chosen = pickPremiumVoice(
    nonMaleVoices.filter(
      (v) =>
        v.lang.toLowerCase().startsWith('en-gb') || v.lang.toLowerCase() === 'en_gb'
    )
  );

  // 1. Look for confirmed natural British female voices
  for (const pattern of FEMALE_BRITISH_VOICE_PATTERNS) {
    if (chosen) break;
    const match = nonMaleVoices.find(
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
    const ukFemale = nonMaleVoices.filter((v) => {
      const isUk = v.lang.toLowerCase().startsWith('en-gb') || v.lang.toLowerCase() === 'en_gb';
      const isFemale = FORBIDDEN_FEMALE_PATTERNS.some((p) => p.test(v.name));
      return isUk && isFemale;
    });
    if (ukFemale.length > 0) {
      chosen =
        pickPremiumVoice(ukFemale) ||
        ukFemale.find((v) => v.localService) ||
        ukFemale[0];
    }
  }

  // 3. Look for any English female voice across Commonwealth/English locales
  if (!chosen) {
    const anyEnFemale = nonMaleVoices.filter((v) => {
      const isEn = v.lang.toLowerCase().startsWith('en');
      const isFemale = FORBIDDEN_FEMALE_PATTERNS.some((p) => p.test(v.name));
      return isEn && isFemale;
    });
    if (anyEnFemale.length > 0) {
      chosen =
        pickPremiumVoice(anyEnFemale) ||
        anyEnFemale.find((v) => v.localService) ||
        anyEnFemale[0];
    }
  }

  // 4. Look for any non-male en-GB voice (never selecting a male voice)
  if (!chosen) {
    const ukNonMale = nonMaleVoices.filter((v) => v.lang.toLowerCase().startsWith('en-gb'));
    if (ukNonMale.length > 0) {
      chosen =
        pickPremiumVoice(ukNonMale) ||
        ukNonMale.find((v) => v.localService) ||
        ukNonMale[0];
    }
  }

  if (chosen) {
    lockedFemaleVoiceInstance = chosen;
    lockedFemaleVoiceCount = voiceList.length;
  }

  return { voice: chosen, pitchMultiplier: 1.0 };
}

/**
 * Universal British voice selector supporting both certified Male (Prof. Arthur) and Female (Dr. Clara)
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
    const examinerPref = localStorage.getItem(STORAGE_KEY_EXAMINER_GENDER);
    if (examinerPref === 'female' || examinerPref === 'male') return examinerPref;
    const pref = localStorage.getItem(STORAGE_KEY_GENDER_PREF);
    if (pref === 'female' || pref === 'male') return pref;
  } catch {}
  return 'male';
}

/**
 * Sets preferred examiner voice gender and synchronizes across all speaking/listening modules
 */
export function setPreferredVoiceGender(gender: 'male' | 'female'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_GENDER_PREF, gender);
    localStorage.setItem(STORAGE_KEY_EXAMINER_GENDER, gender);
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
          rate: 1.0,
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
      rate: 1.0,
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
  }
}

// Pre-warm and refresh browser voices when asynchronous voiceschanged fires (critical on Android Chrome & desktop Chrome)
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const refreshDeviceVoices = () => {
    try {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        resetLockedVoices();
        const male = selectBestDeviceMaleVoice(v);
        const female = selectBestDeviceFemaleVoice(v);
        window.dispatchEvent(
          new CustomEvent('ielts_browser_voices_ready', {
            detail: {
              totalVoices: v.length,
              maleVoiceName: male.voice?.name || null,
              femaleVoiceName: female.voice?.name || null
            }
          })
        );
      }
    } catch {}
  };

  try {
    refreshDeviceVoices();
    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', refreshDeviceVoices);
    } else if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = refreshDeviceVoices;
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
    const matchingSpeaker = resolveSpeakerForAccentAndGender(accent, getPreferredVoiceGender());
    localStorage.setItem(STORAGE_KEY_STUDIO_SPEAKER, matchingSpeaker);
    resetLockedVoices();
    window.dispatchEvent(new CustomEvent('ielts_accent_changed', { detail: { accent, speakerId: matchingSpeaker } }));
  } catch {
  }
}

export interface StudioVoicePersona {
  speakerId: string;
  name: string;
  role: string;
  accent: OfficialIELTSAccent;
  gender: 'male' | 'female';
  locale: string;
  styleTag: string;
  voiceCategory?: 'examiner' | 'lecturer' | 'elder';
  sampleLine: string;
}

export const PROFESSIONAL_STUDIO_VOICES: StudioVoicePersona[] = [
  {
    speakerId: 'speaker_04',
    name: 'Prof. Arthur Pendelton',
    role: 'Chief IELTS Examiner (RP)',
    accent: 'British',
    gender: 'male',
    locale: 'en-GB',
    styleTag: 'Formal RP Baritone',
    voiceCategory: 'examiner',
    sampleLine: 'Good afternoon. I am Professor Arthur Pendelton, your British Received Pronunciation IELTS examiner.'
  },
  {
    speakerId: 'speaker_05',
    name: 'Dr. Clara Sterling',
    role: 'Senior Oral Assessor (RP)',
    accent: 'British',
    gender: 'female',
    locale: 'en-GB',
    styleTag: 'Articulate RP',
    voiceCategory: 'examiner',
    sampleLine: 'Welcome to the exam room. I am Doctor Clara Sterling, speaking in standard Southern British English.'
  },
  {
    speakerId: 'speaker_17',
    name: 'Oliver Vance',
    role: 'BBC-Style Broadcast Academic',
    accent: 'British',
    gender: 'male',
    locale: 'en-GB',
    styleTag: 'Part 4 Lecture',
    voiceCategory: 'lecturer',
    sampleLine: 'In Part Four, you will hear a university lecture on urban climate resilience and sustainable architecture.'
  },
  {
    speakerId: 'speaker_18',
    name: 'Dr. Eleanor Vance',
    role: 'Oxbridge Tutorial Fellow',
    accent: 'British',
    gender: 'female',
    locale: 'en-GB',
    styleTag: 'Seminar Clarity',
    voiceCategory: 'lecturer',
    sampleLine: 'Let us examine how paraphrasing transforms key claims in academic reading passages.'
  },
  {
    speakerId: 'speaker_06',
    name: 'William Fraser',
    role: 'Australian Marine Tutor',
    accent: 'Australian',
    gender: 'male',
    locale: 'en-AU',
    styleTag: 'Sydney Natural',
    sampleLine: 'G’day and welcome to today’s listening briefing on coastal reef conservation in Queensland.'
  },
  {
    speakerId: 'speaker_07',
    name: 'Natasha Reid',
    role: 'Australian Community Guide',
    accent: 'Australian',
    gender: 'female',
    locale: 'en-AU',
    styleTag: 'Warm AU Cadence',
    sampleLine: 'Before we begin the campus orientation tour, please check your timetable and registration details.'
  },
  {
    speakerId: 'speaker_21',
    name: 'Dr. Freya Callaghan',
    role: 'Melbourne Senior Lecturer',
    accent: 'Australian',
    gender: 'female',
    locale: 'en-AU',
    styleTag: 'Cultivated AU',
    sampleLine: 'Recent ecological surveys across southern Australia show a measurable recovery in native wetlands.'
  },
  {
    speakerId: 'speaker_09',
    name: 'Christopher Brooks',
    role: 'American Visiting Scholar',
    accent: 'American',
    gender: 'male',
    locale: 'en-US',
    styleTag: 'General American',
    sampleLine: 'Good morning. Let us review the economic data from our metropolitan transport study.'
  },
  {
    speakerId: 'speaker_19',
    name: 'Prof. Guy Holloway',
    role: 'US Ivy League Professor',
    accent: 'American',
    gender: 'male',
    locale: 'en-US',
    styleTag: 'Academic Lecture',
    sampleLine: 'Notice how the speaker signals a counterargument before introducing the primary statistical evidence.'
  },
  {
    speakerId: 'speaker_20',
    name: 'Aria Bennett',
    role: 'US Academic Moderator',
    accent: 'American',
    gender: 'female',
    locale: 'en-US',
    styleTag: 'Studio Interviewer',
    sampleLine: 'In Part Three, I would like to ask you a few more abstract questions related to your cue card topic.'
  },
  {
    speakerId: 'speaker_22',
    name: 'Andrew Mercer',
    role: 'North American Studio Narrator',
    accent: 'American',
    gender: 'male',
    locale: 'en-US',
    styleTag: 'Broadcast Studio',
    sampleLine: 'You now have thirty seconds to check your answers before we move on to the final section.'
  },
  {
    speakerId: 'speaker_11',
    name: 'Liam MacLeod',
    role: 'Canadian Fieldwork Director',
    accent: 'Canadian',
    gender: 'male',
    locale: 'en-CA',
    styleTag: 'Standard Canadian',
    sampleLine: 'Hello from Toronto. Today’s fieldwork seminar covers boreal forest carbon monitoring.'
  },
  {
    speakerId: 'speaker_12',
    name: 'Clara Tremblay',
    role: 'Canadian University Registrar',
    accent: 'Canadian',
    gender: 'female',
    locale: 'en-CA',
    styleTag: 'Crisp Canadian',
    sampleLine: 'Please confirm your student identification number and preferred accommodation wing.'
  },
  {
    speakerId: 'speaker_13',
    name: 'Mitchell Hale',
    role: 'New Zealand Ecology Warden',
    accent: 'New Zealand',
    gender: 'male',
    locale: 'en-NZ',
    styleTag: 'Authentic Kiwi',
    sampleLine: 'Welcome to the wildlife reserve briefing. We will discuss island habitat restoration.'
  },
  {
    speakerId: 'speaker_14',
    name: 'Molly Sinclair',
    role: 'New Zealand Student Officer',
    accent: 'New Zealand',
    gender: 'female',
    locale: 'en-NZ',
    styleTag: 'Friendly Kiwi',
    sampleLine: 'The student union workshops run every Wednesday afternoon in the main lecture theatre.'
  },
  {
    speakerId: 'speaker_15',
    name: 'Connor Gallagher',
    role: 'Irish Heritage Curator',
    accent: 'Irish',
    gender: 'male',
    locale: 'en-IE',
    styleTag: 'Dublin Academic',
    sampleLine: 'Welcome to the cultural archives. Today we trace nineteenth-century maritime trade routes.'
  },
  {
    speakerId: 'speaker_16',
    name: 'Dr. Emily Byrne',
    role: 'Irish Linguistics Scholar',
    accent: 'Irish',
    gender: 'female',
    locale: 'en-IE',
    styleTag: 'Melodious Irish',
    voiceCategory: 'lecturer',
    sampleLine: 'Pay close attention to connected speech and vowel reductions across regional English accents.'
  },
  {
    speakerId: 'speaker_23',
    name: 'Grandpa Reginald Whitmore',
    role: 'Deep British Elder & Emeritus Chair',
    accent: 'British',
    gender: 'male',
    locale: 'en-GB',
    styleTag: 'Deep Grandpa Bass',
    voiceCategory: 'elder',
    sampleLine: 'Take a calm breath, my friend. I am Sir Reginald Whitmore—let us walk steadily through your IELTS preparation together.'
  },
  {
    speakerId: 'speaker_24',
    name: 'Grandpa Roger Holloway',
    role: 'Deep American Elder & Retired Dean',
    accent: 'American',
    gender: 'male',
    locale: 'en-US',
    styleTag: 'Deep Grandpa Baritone',
    voiceCategory: 'elder',
    sampleLine: 'Good evening. Settle in and listen carefully—clear, unhurried structure is the hallmark of a Band Eight speaker.'
  },
  {
    speakerId: 'speaker_25',
    name: 'Uncle Graham Reid',
    role: 'Deep Australian Elder Historian',
    accent: 'Australian',
    gender: 'male',
    locale: 'en-AU',
    styleTag: 'Deep AU Elder',
    voiceCategory: 'elder',
    sampleLine: 'Welcome along. Over forty years in marine research, I have learned that listening for key signposts changes everything.'
  },
  {
    speakerId: 'speaker_26',
    name: 'Grandpa Seamus Doyle',
    role: 'Deep Irish Elder Storyteller',
    accent: 'Irish',
    gender: 'male',
    locale: 'en-IE',
    styleTag: 'Deep Irish Elder',
    voiceCategory: 'elder',
    sampleLine: 'Welcome to the study hall. Take your time with every question, and let the rhythm of natural English guide your ear.'
  }
];

const STORAGE_KEY_STUDIO_SPEAKER = 'ielts_sprint_preferred_studio_speaker_v1';

export function resolveSpeakerForAccentAndGender(
  accent: OfficialIELTSAccent,
  gender: 'male' | 'female' = getPreferredVoiceGender()
): string {
  const exact = PROFESSIONAL_STUDIO_VOICES.find((v) => v.accent === accent && v.gender === gender);
  if (exact) return exact.speakerId;
  const byAccent = PROFESSIONAL_STUDIO_VOICES.find((v) => v.accent === accent);
  if (byAccent) return byAccent.speakerId;
  return gender === 'female' ? 'speaker_05' : 'speaker_04';
}

export function getPreferredStudioSpeakerId(): string {
  if (typeof window === 'undefined') return 'speaker_04';
  try {
    const saved = localStorage.getItem(STORAGE_KEY_STUDIO_SPEAKER);
    if (saved && PROFESSIONAL_STUDIO_VOICES.some((v) => v.speakerId === saved)) {
      return saved;
    }
  } catch {}
  return resolveSpeakerForAccentAndGender(getPreferredAccent(), getPreferredVoiceGender());
}

export function setPreferredStudioSpeakerId(speakerId: string): StudioVoicePersona | null {
  const found = PROFESSIONAL_STUDIO_VOICES.find((v) => v.speakerId === speakerId);
  if (!found) return null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_STUDIO_SPEAKER, found.speakerId);
      localStorage.setItem(STORAGE_KEY_ACCENT_PREF, found.accent);
      setPreferredVoiceGender(found.gender);
      window.dispatchEvent(
        new CustomEvent('ielts_accent_changed', {
          detail: { accent: found.accent, speakerId: found.speakerId, persona: found }
        })
      );
    } catch {}
  }
  return found;
}

export type BritishRegionalAccent = 'london_rp' | 'northern' | 'scottish' | 'welsh_west';

export interface BritishRegionalAccentConfig {
  id: BritishRegionalAccent;
  label: string;
  shortLabel: string;
  regionName: string;
  phoneticNote: string;
  maleSpeakerId: string;
  femaleSpeakerId: string;
  defaultRate: number;
  sampleGreeting: string;
  isRegionalVoiceAvailable: boolean;
  fallbackDisclosure?: string;
}

export const BRITISH_REGIONAL_ACCENT_METADATA: Record<BritishRegionalAccent, BritishRegionalAccentConfig> = {
  london_rp: {
    id: 'london_rp',
    label: 'Standard British (RP)',
    shortLabel: 'London RP',
    regionName: 'Southern British / Received Pronunciation',
    phoneticNote: 'Standard non-rhotic Southern British cadence with measured phrasing and clear consonants',
    maleSpeakerId: 'speaker_04',
    femaleSpeakerId: 'speaker_05',
    defaultRate: 1.0,
    sampleGreeting:
      'Good afternoon. We are using standard Southern British pronunciation for your IELTS Speaking practice today.',
    isRegionalVoiceAvailable: true
  },
  northern: {
    id: 'northern',
    label: 'Northern UK (Standard UK Fallback)',
    shortLabel: 'Northern (Fallback)',
    regionName: 'Manchester & Yorkshire · Standard en-GB Voice Fallback',
    phoneticNote: 'Uses standard British (en-GB) voice fallback when dedicated Northern regional synthesis is unavailable',
    maleSpeakerId: 'speaker_uk_northern_m',
    femaleSpeakerId: 'speaker_uk_northern_f',
    defaultRate: 1.0,
    sampleGreeting:
      'Good afternoon. Dedicated Northern regional synthesis is unavailable on this provider, so we are using our standard British voice.',
    isRegionalVoiceAvailable: false,
    fallbackDisclosure: 'Uses Standard British (en-GB) voice fallback'
  },
  scottish: {
    id: 'scottish',
    label: 'Scottish (Celtic/UK Fallback)',
    shortLabel: 'Scottish (Fallback)',
    regionName: 'Edinburgh & Glasgow · Celtic/Standard Voice Fallback',
    phoneticNote: 'Uses Celtic/Standard British voice fallback when dedicated Scottish synthesis is unavailable',
    maleSpeakerId: 'speaker_uk_scottish_m',
    femaleSpeakerId: 'speaker_uk_scottish_f',
    defaultRate: 1.0,
    sampleGreeting:
      'Good afternoon. Dedicated Scottish synthesis is unavailable on this provider, so we are using our closest available Celtic/British voice.',
    isRegionalVoiceAvailable: false,
    fallbackDisclosure: 'Uses Celtic / Standard British voice fallback'
  },
  welsh_west: {
    id: 'welsh_west',
    label: 'Welsh & Celtic (en-IE / UK Fallback)',
    shortLabel: 'Welsh / Celtic',
    regionName: 'Cardiff & Celtic Isles (Hiberno/Celtic Voice)',
    phoneticNote: 'Uses Hiberno-English (en-IE) / Standard British voice fallback',
    maleSpeakerId: 'speaker_15',
    femaleSpeakerId: 'speaker_16',
    defaultRate: 1.0,
    sampleGreeting:
      'Welcome to the speaking studio. Today we are practicing with our Celtic Isles voice profile.',
    isRegionalVoiceAvailable: false,
    fallbackDisclosure: 'Uses Hiberno-English (en-IE) / British voice fallback'
  }
};

export const BRITISH_REGIONAL_ACCENT_LIST: BritishRegionalAccentConfig[] = [
  BRITISH_REGIONAL_ACCENT_METADATA.london_rp,
  BRITISH_REGIONAL_ACCENT_METADATA.northern,
  BRITISH_REGIONAL_ACCENT_METADATA.scottish,
  BRITISH_REGIONAL_ACCENT_METADATA.welsh_west
];

const STORAGE_KEY_BRITISH_REGIONAL_ACCENT = 'ielts_speaking_british_regional_accent_v1';

export function getPreferredBritishRegionalAccent(): BritishRegionalAccent {
  if (typeof window === 'undefined') return 'london_rp';
  try {
    const saved = localStorage.getItem(STORAGE_KEY_BRITISH_REGIONAL_ACCENT) as BritishRegionalAccent | null;
    if (saved && saved in BRITISH_REGIONAL_ACCENT_METADATA) {
      return saved;
    }
  } catch {}
  return 'london_rp';
}

export function setPreferredBritishRegionalAccent(accent: BritishRegionalAccent): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_BRITISH_REGIONAL_ACCENT, accent);
    resetLockedVoices();
    window.dispatchEvent(
      new CustomEvent('ielts_british_regional_accent_changed', {
        detail: {
          accent,
          config: BRITISH_REGIONAL_ACCENT_METADATA[accent]
        }
      })
    );
  } catch (err) {
  }
}

export function resolveRegionalExaminerSpeaker(
  gender: 'male' | 'female',
  regionalAccent?: BritishRegionalAccent
): {
  speakerId: string;
  accentLabel: string;
  rate: number;
  regionalId: BritishRegionalAccent;
  isRegionalVoiceAvailable: boolean;
  fallbackDisclosure?: string;
} {
  const activeRegion = regionalAccent || getPreferredBritishRegionalAccent();
  const cfg = BRITISH_REGIONAL_ACCENT_METADATA[activeRegion] || BRITISH_REGIONAL_ACCENT_METADATA.london_rp;
  return {
    speakerId: gender === 'female' ? cfg.femaleSpeakerId : cfg.maleSpeakerId,
    accentLabel: `${cfg.label} (${gender === 'female' ? 'Female' : 'Male'})`,
    rate: cfg.defaultRate,
    regionalId: cfg.id,
    isRegionalVoiceAvailable: cfg.isRegionalVoiceAvailable,
    fallbackDisclosure: cfg.fallbackDisclosure
  };
}

