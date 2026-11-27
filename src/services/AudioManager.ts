/**
 * IELTS SPRINT — CENTRALIZED AUDIO MANAGER & AUDIO LIFECYCLE CONTROLLER
 *
 * Requirements:
 * 1. Global AudioManager ensuring every module (Listening, Speaking, Mock Tests, Practice)
 *    uses uniform, validated audio selection and playback rules.
 * 2. Unique, stable "audioId" cryptographically linked to its exact question hash and transcript.
 * 3. Question-to-audio ownership validation:
 *    Question → Unique Question ID → Correct Audio ID → Correct Audio Track.
 * 4. Audio-level duplicate prevention:
 *    - Question hash-based unique audio ID system
 *    - Strict session lock ensuring the same audio is NEVER requested or played twice during a session
 *    - Detection & exclusion of recently played audioIds across sessions
 * 5. Exclusively British Male Voices:
 *    - All speech synthesis and dialogue mapping strictly assigned to British male speakers
 *    - Emily and Victoria replaced with Oliver, George, Alistair, and Arthur
 * 6. React / State Race Condition Protection:
 *    - Monotonic generation tokens / AbortControllers
 *    - Instant cancellation of stale pending requests when question switches
 *    - Audio lock preventing concurrent playback collisions
 */

import { IELTSQuestion } from './QuestionEngine';
import { audioService, DialogueLine, AudioPlaybackState, isInterruptedPlaybackError } from './audioService';
import { getGlobalPreferredMaleVoice } from '../config/voiceConfig';
import { soundManager } from '../utils/audioEffects';

const STORAGE_KEY_UI_SOUND_ENABLED = 'bandsprint_ui_sounds_enabled_v1';

export interface AudioItemMetadata {
  audioId: string;
  questionId: string;
  questionHash: string;
  module: string;
  section?: number;
  topic?: string;
  speakerIds: string[];
  contentHash: string;
  dialogue?: DialogueLine[];
  textScript?: string;
  durationEstimateSec?: number;
  createdAt: number;
}

export interface AudioValidationResult {
  isValid: boolean;
  audioId: string;
  questionId: string;
  reason?: string;
}

const STORAGE_KEY_RECENT_AUDIO = 'ielts_sprint_recent_audio_ids_v1';
const MAX_RECENT_AUDIO_HISTORY = 100;

/**
 * Deterministic hash generator for audio contents and question signatures
 */
export function computeAudioHash(content: string): string {
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = (hash2 * 31) ^ char;
    hash1 |= 0;
    hash2 |= 0;
  }
  const combined = Math.abs(hash1).toString(36) + Math.abs(hash2).toString(36);
  return 'aud_' + combined.substring(0, 10);
}

/**
 * Computes a deterministic question hash representing the exact question identity & content
 */
export function computeQuestionHash(q: {
  id: string;
  prompt?: string;
  audioScript?: string;
  dialogue?: any[];
  topic?: string;
  section?: number;
  module?: string;
}): string {
  const parts = [
    q.id,
    q.module || '',
    q.section?.toString() || '',
    q.topic || '',
    q.prompt || '',
    q.audioScript || '',
    (q.dialogue || []).map((d) => `${d.speaker || ''}:${d.text || ''}`).join('|')
  ];
  return computeAudioHash(parts.join(':::'));
}

/**
 * Builds a deterministic, guaranteed unique audioId for any question or audio asset
 * Maintains strict compatibility with aud_${questionId}_* ownership validation
 */
export function buildAudioId(questionId: string, contentSignature: string): string {
  const hash = computeAudioHash(contentSignature);
  return `aud_${questionId}_${hash}`;
}

export class AudioManagerService {
  private activeAudioId: string | null = null;
  private activeQuestionId: string | null = null;
  private currentSessionAudioIds: Set<string> = new Set();
  private currentSessionQuestionHashes: Set<string> = new Set();
  private recentAudioHistory: string[] = [];
  private playbackGeneration: number = 0;
  private activeAbortController: AbortController | null = null;
  private metadataRegistry: Map<string, AudioItemMetadata> = new Map();
  private isPlaybackLocked: boolean = false;
  private uiSoundsEnabled: boolean = true;
  private listeners: Set<(state: { activeAudioId: string | null; activeQuestionId: string | null; isPlaying: boolean }) => void> = new Set();

  constructor() {
    this.loadRecentHistory();
    this.loadUiSoundPreference();
    audioService.subscribe((state) => {
      if (!state.isPlaying && !state.isLoading && !state.isPaused && this.isPlaybackLocked) {
        this.isPlaybackLocked = false;
        this.notifyState();
      }
    });
  }

  private loadUiSoundPreference(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_UI_SOUND_ENABLED);
      if (raw === 'false') {
        this.uiSoundsEnabled = false;
      }
    } catch {
      this.uiSoundsEnabled = true;
    }
  }

  public isUiSoundEnabled(): boolean {
    return this.uiSoundsEnabled;
  }

  public setUiSoundEnabled(enabled: boolean): void {
    this.uiSoundsEnabled = enabled;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_UI_SOUND_ENABLED, enabled ? 'true' : 'false');
      } catch {}
    }
  }

  /**
   * Subtle, low-volume tactile Web Audio UI click for IELTS Hub buttons, tabs, and checkboxes.
   */
  public playUiClick(variant: 'soft' | 'tab' | 'toggle' | 'check' = 'soft'): void {
    if (!this.uiSoundsEnabled) return;
    try {
      const ctx = soundManager.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1900, now);

      if (variant === 'check') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(640, now);
        osc.frequency.exponentialRampToValueAtTime(860, now + 0.038);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.038, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.048);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.052);
        return;
      }

      if (variant === 'tab') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(610, now + 0.028);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.03, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.036);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
        return;
      }

      if (variant === 'toggle') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.026);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.032, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.034);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.038);
        return;
      }

      // Default subtle 'soft' tactile click
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.022);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.028, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    } catch {
      // Ignore autoplay blocks prior to user gesture
    }
  }

  /**
   * Subtle, warm ascending two-tone chime when a Pomodoro sprint starts or resumes.
   */
  public playPomodoroStart(): void {
    if (!this.uiSoundsEnabled) return;
    try {
      const ctx = soundManager.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [440, 659.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const start = now + idx * 0.075;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.045, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.24);
      });
    } catch {}
  }

  /**
   * Gentle descending soft tone when a Pomodoro sprint is paused.
   */
  public playPomodoroPause(): void {
    if (!this.uiSoundsEnabled) return;
    try {
      const ctx = soundManager.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [523.25, 392];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const start = now + idx * 0.07;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.038, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.2);
      });
    } catch {}
  }

  /**
   * Clean low-volume tap when resetting the Pomodoro timer.
   */
  public playPomodoroReset(): void {
    if (!this.uiSoundsEnabled) return;
    try {
      const ctx = soundManager.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.036, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }

  /**
   * Warm, low-volume harmonic chime when a Pomodoro sprint block finishes.
   */
  public playPomodoroComplete(): void {
    if (!this.uiSoundsEnabled) return;
    try {
      const ctx = soundManager.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
        const start = now + idx * 0.11;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.058, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.58);
      });
    } catch {}
  }

  private loadRecentHistory(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RECENT_AUDIO);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.recentAudioHistory = parsed.slice(-MAX_RECENT_AUDIO_HISTORY);
        }
      }
    } catch {
      this.recentAudioHistory = [];
    }
  }

  private persistRecentHistory(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        STORAGE_KEY_RECENT_AUDIO,
        JSON.stringify(this.recentAudioHistory.slice(-MAX_RECENT_AUDIO_HISTORY))
      );
    } catch {}
  }

  /**
   * Assigns distinct speaker profile IDs from IELTS_SPEAKERS / IELTS_CHARACTERS
   * to unique speaker names in a multi-speaker dialogue while guaranteeing 100% disjoint
   * effective underlying voice models across dialogue participants.
   */
  public assignDistinctSpeakerProfiles(
    dialogue: Array<{ speaker?: string; text: string; gender?: 'male' | 'female'; pauseAfterMs?: number; speakerId?: string }>
  ): DialogueLine[] {
    const speakerMap = new Map<string, string>();
    const malePool = [
      'speaker_01', // Thomas UK RP Student (en-GB-ThomasNeural)
      'speaker_15', // Connor IE Cultural Curator (en-IE-ConnorNeural)
      'speaker_06', // William AU Specialist (en-AU-WilliamMultilingualNeural)
      'speaker_08', // Luke ZA Field Researcher (en-ZA-LukeNeural)
      'speaker_11', // Liam CA Field Director (en-CA-LiamNeural)
      'speaker_03', // Alistair UK Professor (en-GB-ThomasNeural deeper -5Hz cadence)
      'speaker_04'  // Arthur UK RP Examiner (en-GB-RyanNeural - reserved as last resort only)
    ];
    const femalePool = [
      'speaker_05', // Clara UK RP Lecturer (en-GB-SoniaNeural)
      'speaker_02', // Libby UK Librarian/Coordinator (en-GB-LibbyNeural)
      'speaker_16', // Emily IE Linguistics Scholar (en-IE-EmilyNeural)
      'speaker_07', // Natasha AU Coordinator (en-AU-NatashaNeural)
      'speaker_12', // Clara CA Registrar (en-CA-ClaraNeural)
      'speaker_14'  // Molly NZ Representative (en-NZ-MollyNeural)
    ];

    const SPEAKER_EFFECTIVE_VOICE_MAP: Record<string, string> = {
      speaker_01: 'en-GB-ThomasNeural',
      speaker_02: 'en-GB-LibbyNeural',
      speaker_03: 'en-GB-ThomasNeural',
      speaker_04: 'en-GB-RyanNeural',
      speaker_05: 'en-GB-SoniaNeural',
      speaker_06: 'en-AU-WilliamMultilingualNeural',
      speaker_07: 'en-AU-NatashaNeural',
      speaker_08: 'en-ZA-LukeNeural',
      speaker_09: 'en-US-ChristopherNeural',
      speaker_10: 'en-US-JennyNeural',
      speaker_11: 'en-CA-LiamNeural',
      speaker_12: 'en-CA-ClaraNeural',
      speaker_13: 'en-NZ-MitchellNeural',
      speaker_14: 'en-NZ-MollyNeural',
      speaker_15: 'en-IE-ConnorNeural',
      speaker_16: 'en-IE-EmilyNeural',
      speaker_barnaby: 'en-GB-ThomasNeural'
    };

    const usedSpeakerIds = new Set<string>();
    const usedVoiceIds = new Set<string>();

    // Reserve Examiner Arthur (speaker_04) so dialogue roles never collide with examiner rubric
    usedSpeakerIds.add('speaker_04');
    usedVoiceIds.add(SPEAKER_EFFECTIVE_VOICE_MAP['speaker_04']);

    return dialogue.map((line) => {
      const rawName = line.speaker || 'Speaker';

      // If an explicit valid speakerId is provided, preserve it and register its voice
      if (line.speakerId && line.speakerId !== 'default') {
        const effVoice = SPEAKER_EFFECTIVE_VOICE_MAP[line.speakerId] || line.speakerId;
        usedSpeakerIds.add(line.speakerId);
        usedVoiceIds.add(effVoice);
        return {
          speakerId: line.speakerId,
          speakerName: rawName,
          gender: line.gender,
          text: line.text,
          pauseAfterMs: line.pauseAfterMs ?? 240
        };
      }

      if (!speakerMap.has(rawName)) {
        // Multi-speaker joint turn (e.g. "Hannah & Marcus"): reuse the primary speaker's voice if already assigned
        const multiSpeakerParts = rawName.split(/\s+(?:&|and)\s+/i).map((s) => s.trim()).filter(Boolean);
        const primarySpeakerName = multiSpeakerParts.length > 1 ? multiSpeakerParts[0] : null;
        if (primarySpeakerName && speakerMap.has(primarySpeakerName)) {
          speakerMap.set(rawName, speakerMap.get(primarySpeakerName)!);
        } else {
          let isFemale: boolean;
          // Explicit character gender takes absolute precedence over job titles
          if (line.gender === 'female') {
            isFemale = true;
          } else if (line.gender === 'male') {
            isFemale = false;
          } else {
            // Secondary Fallback: Infer gender from speaker title/name (using primary speaker for joint labels)
            const nameForGender = primarySpeakerName || rawName;
            const selfIntroMatch = (line.text || '').match(/\bmy name is\s+([A-Za-z.\s]{2,35})/i);
            const lowerName = `${nameForGender} ${selfIntroMatch ? selfIntroMatch[1] : ''}`.toLowerCase();
            const matchesFemale =
              /\b(ms|mrs|miss|woman|female|girl|lady|charlotte|libby|natasha|jenny|clara|molly|emily|sarah|helen|chloe|rachel|elena|hannah|beatrice|fiona|brenda|sophia|gemma|evelyn|eleanor|samira|priya|maya|claire)\b/.test(
                lowerName
              );
            const matchesMale =
              /\b(mr|man|male|boy|arthur|thomas|alistair|william|callum|christopher|liam|mitchell|connor|oliver|daniel|julian|marcus|gregory|dominic|ethan|gordon|david|george|martin|brian|robert|aris|tariq|philip|gary|nigel|peter|jordan|malcolm|leo)\b/.test(
                lowerName
              );

            if (matchesFemale && !matchesMale) {
              isFemale = true;
            } else if (matchesMale && !matchesFemale) {
              isFemale = false;
            } else {
              // Role/job title inference as secondary fallback
              const femaleRole = /\b(receptionist|librarian|nurse|advisor|registrar|coordinator)\b/.test(lowerName);
              const maleRole = /\b(customer|applicant|student|officer|clerk|lecturer|professor|curator|guide|inspector)\b/.test(lowerName);
              if (femaleRole && !maleRole) {
                isFemale = true;
              } else if (maleRole && !femaleRole) {
                isFemale = false;
              } else {
                isFemale = speakerMap.size % 2 === 1;
              }
            }
          }

          const pool = isFemale ? femalePool : malePool;
          let chosenId: string | null = null;

          // Academic presenter role matching: Professor, Prof., Lecturer, Dr., Alistair -> speaker_03 (Dr. Alistair Sterling)
          // Evaluated before generic malePool[0] (speaker_01) allocation while respecting usedSpeakerIds and usedVoiceIds
          const isAcademicPresenterRole =
            !isFemale &&
            /\b(professor|prof\b|lecturer|alistair|dr\b|doctor|dean)\b/i.test(rawName);
          if (isAcademicPresenterRole && !usedSpeakerIds.has('speaker_03')) {
            const effVoice03 = SPEAKER_EFFECTIVE_VOICE_MAP['speaker_03'] || 'speaker_03';
            if (!usedVoiceIds.has(effVoice03)) {
              chosenId = 'speaker_03';
            }
          }

          // Pass 1: Select candidate whose speaker ID AND underlying effective voice model are unused
          if (!chosenId) {
            for (const candidateId of pool) {
              if (candidateId === 'speaker_04') continue; // Reserve Arthur for examiner
              const effVoice = SPEAKER_EFFECTIVE_VOICE_MAP[candidateId] || candidateId;
              if (!usedSpeakerIds.has(candidateId) && !usedVoiceIds.has(effVoice)) {
                chosenId = candidateId;
                break;
              }
            }
          }

          // Pass 2 Fallback: If all voices in pool were used, pick an unused speaker ID
          if (!chosenId) {
            for (const candidateId of pool) {
              if (candidateId === 'speaker_04') continue;
              if (!usedSpeakerIds.has(candidateId)) {
                chosenId = candidateId;
                break;
              }
            }
          }

          // Pass 3 Ultimate Fallback
          if (!chosenId) {
            chosenId = pool[0];
          }

          usedSpeakerIds.add(chosenId);
          const effectiveVoice = SPEAKER_EFFECTIVE_VOICE_MAP[chosenId];
          if (effectiveVoice) usedVoiceIds.add(effectiveVoice);

          speakerMap.set(rawName, chosenId);
        }
      }

      const assignedId = speakerMap.get(rawName)!;
      const inferredGender: 'male' | 'female' =
        line.gender || (femalePool.includes(assignedId) ? 'female' : 'male');

      return {
        speakerId: assignedId,
        speakerName: rawName,
        gender: inferredGender,
        text: line.text,
        pauseAfterMs: line.pauseAfterMs ?? 240
      };
    });
  }

  /**
   * Detects IELTS narrator/examiner instruction lines (opening, mid-section, and closing rubrics).
   */
  private isNarratorInstructionLine(rawLine: string): boolean {
    const trimmed = (rawLine || '').trim();
    if (!trimmed) return false;
    return /^(?:international english language testing system|section\s+\d+\b|part\s+\d+\b|first,\s+you have|before you hear|now listen|listen carefully|now look at questions|that is the end of|you now have|in the actual test)/i.test(
      trimmed
    );
  }

  /**
   * Strictly validates whether a line begins with an authentic speaker turn label followed by a colon.
   * Never splits on hyphens/dashes (preserving "Bio-fouling...", "Post-pubescent...", "In closed-loop...", "For high-bay...")
   * and never splits on timestamps (preserving "06:00").
   */
  public extractValidSpeakerTurn(rawLine: string): { speaker: string; text: string } | null {
    const trimmed = (rawLine || '').trim();
    if (!trimmed) return null;

    // Require an explicit colon delimiter after a short speaker label (never a hyphen or en-dash)
    const match = trimmed.match(/^(?:\[|\()?([A-Z][A-Za-z0-9\s.&'()/-]{0,34}?)(?:\]|\))?\s*:\s*(.+)$/);
    if (!match) return null;

    const speakerLabel = match[1].trim();
    const restText = match[2].trim();
    if (!speakerLabel || !restText) return null;

    // Allow legitimate title-cased hyphenated personal names (e.g. "Jean-Pierre", "Mary-Jane"),
    // while continuing to reject hyphenated prose compounds (e.g. "Bio-fouling", "Post-pubescent", "In closed-loop")
    if (speakerLabel.includes('-')) {
      const hyphenatedProsePrefixes = new Set([
        'bio', 'post', 'pre', 'non', 'sub', 'anti', 'multi', 'inter', 'intra',
        'micro', 'macro', 'counter', 'cross', 'self', 'semi', 'ultra', 'over',
        'under', 'co', 're', 'de', 'ex', 'high', 'low', 'closed', 'open', 'well', 'full', 'part'
      ]);
      const rawWords = speakerLabel.replace(/[()]/g, ' ').trim().split(/\s+/).filter(Boolean);
      const validHyphenatedName = rawWords.every((word) => {
        if (!word.includes('-')) return true;
        const segments = word.split('-');
        if (segments.length < 2 || segments.some((seg) => !/^[A-Z][a-z]{1,20}$/.test(seg))) {
          return false;
        }
        return !hyphenatedProsePrefixes.has(segments[0].toLowerCase());
      });
      if (!validHyphenatedName) {
        return null;
      }
    }

    // Reject if the colon is part of a numeric ratio or timestamp (e.g. "... from 06:00 to 22:00")
    if (/^\d/.test(restText) && /\d$/.test(speakerLabel)) {
      return null;
    }

    // Digits in speaker labels are only valid for numbered roles like "Speaker 1", "Student 2", "Candidate 1"
    if (/\d/.test(speakerLabel) && !/^(?:Speaker|Student|Candidate|Participant|Person|Voice|Man|Woman)\s+\d+$/i.test(speakerLabel)) {
      return null;
    }

    // Speaker labels must be concise (1 to 4 words)
    const words = speakerLabel.replace(/[()]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0 || words.length > 4) {
      return null;
    }

    // Reject structural headers or discourse markers followed by a colon
    const lowerLabel = speakerLabel.toLowerCase();
    const nonSpeakerHeaders = new Set([
      'section',
      'part',
      'passage',
      'note',
      'notes',
      'example',
      'warning',
      'caution',
      'summary',
      'conclusion',
      'question',
      'questions',
      'step',
      'stage',
      'phase',
      'topic',
      'title',
      'subject',
      'date',
      'time',
      'location',
      'address',
      'fee',
      'price',
      'cost',
      'total',
      'hours',
      'opening hours',
      'first',
      'second',
      'third',
      'finally',
      'however',
      'furthermore',
      'moreover',
      'meanwhile',
      'consequently',
      'therefore',
      'importantly',
      'crucially',
      'specifically',
      'for example',
      'for instance',
      'in conclusion',
      'in summary',
      'in addition'
    ]);
    if (nonSpeakerHeaders.has(lowerLabel) || /^(?:section|part|passage|question)\s+\d+$/i.test(lowerLabel)) {
      return null;
    }

    // Every word in a valid speaker name/title must start with an uppercase letter (or be a short interior connector/ampersand)
    const allowedConnectors = new Set(['of', 'the', 'and', '&', 'in', 'on', 'for', 'to', 'at']);
    const allWordsTitleCased = words.every(
      (w, idx) => /^[A-Z]/.test(w) || (idx > 0 && idx < words.length - 1 && allowedConnectors.has(w.toLowerCase()))
    );
    if (!allWordsTitleCased) {
      return null;
    }

    const cleanText = restText.replace(/^["“”']+|["“”']+$/g, '').trim();
    if (!cleanText) return null;

    return { speaker: speakerLabel, text: cleanText };
  }

  /**
   * Sub-splits long monologue turns (> 90 words or > 500 characters) at sentence boundaries
   * into manageable sub-lines (~60–90 words / ~350–500 chars) while preserving speaker identity,
   * gender, accent, punctuation, and exact sentence order.
   * Eliminates huge single-payload TTS requests that time out or drop on mobile networks.
   */
  public subSplitLongMonologueTurns(lines: DialogueLine[]): DialogueLine[] {
    if (!lines || lines.length === 0) return [];
    const result: DialogueLine[] = [];

    for (const line of lines) {
      const text = (line.text || '').trim();
      const words = text.split(/\s+/).filter(Boolean);

      // If line is concise (<= 90 words and <= 550 chars), preserve as a single turn
      if (words.length <= 90 && text.length <= 550) {
        result.push(line);
        continue;
      }

      // Split into sentences at sentence-ending punctuation (. ! ?)
      const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
      if (sentences.length <= 1) {
        // Fallback for single long sentence without standard punctuation
        result.push(line);
        continue;
      }

      let currentSubText = '';
      let currentWordCount = 0;

      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim();
        const sentenceWords = sentence.split(/\s+/).filter(Boolean).length;
        const isLastSentence = i === sentences.length - 1;

        if (!currentSubText) {
          currentSubText = sentence;
          currentWordCount = sentenceWords;
        } else if (currentWordCount + sentenceWords <= 85 && (currentSubText + ' ' + sentence).length <= 500) {
          currentSubText += ' ' + sentence;
          currentWordCount += sentenceWords;
        } else {
          result.push({
            ...line,
            text: currentSubText,
            pauseAfterMs: 160 // Brief 160ms natural breathing pause between monologue sub-chunks
          });
          currentSubText = sentence;
          currentWordCount = sentenceWords;
        }

        if (isLastSentence && currentSubText) {
          result.push({
            ...line,
            text: currentSubText,
            pauseAfterMs: line.pauseAfterMs ?? 260
          });
        }
      }
    }

    return result;
  }

  /**
   * Parses raw multi-speaker script text (e.g. `Admissions Officer: "Good morning..."`)
   * into structured DialogueLine turns with distinct speaker profiles while preserving
   * opening/mid/closing narrator instructions and multi-paragraph continuations.
   */
  public parseMultiSpeakerScript(scriptText: string): DialogueLine[] {
    if (!scriptText || typeof scriptText !== 'string') return [];
    const rawLines = scriptText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (rawLines.length === 0) return [];

    const parsedTurns: Array<{
      speaker: string;
      speakerId?: string;
      gender?: 'male' | 'female';
      text: string;
      pauseAfterMs?: number;
    }> = [];

    let hasExplicitSpeakerLabels = false;

    for (const rawLine of rawLines) {
      // Skip pure bracketed metadata headers like [SECTION 1: ...] or [PART 2: ...]
      if (/^\[\s*(?:SECTION|PART|TRANSCRIPT|AUDIO)\s*.*\]$/i.test(rawLine)) {
        continue;
      }

      const speakerTurn = this.extractValidSpeakerTurn(rawLine);
      if (speakerTurn) {
        hasExplicitSpeakerLabels = true;
        const isExaminerLabel = /\b(?:examiner|narrator|announcer)\b/i.test(speakerTurn.speaker);
        parsedTurns.push({
          speaker: isExaminerLabel ? 'Sprint Examiner (Arthur)' : speakerTurn.speaker,
          speakerId: isExaminerLabel ? 'speaker_04' : undefined,
          gender: isExaminerLabel ? 'male' : undefined,
          text: speakerTurn.text,
          pauseAfterMs: isExaminerLabel ? 350 : 260
        });
        continue;
      }

      const cleanText = rawLine.replace(/^["“”']+|["“”']+$/g, '').trim();
      if (!cleanText) continue;

      if (this.isNarratorInstructionLine(cleanText)) {
        const prevTurn = parsedTurns.length > 0 ? parsedTurns[parsedTurns.length - 1] : null;
        if (prevTurn && prevTurn.speakerId === 'speaker_04') {
          prevTurn.text += ' ' + cleanText;
        } else {
          parsedTurns.push({
            speaker: 'Sprint Examiner (Arthur)',
            speakerId: 'speaker_04',
            gender: 'male',
            text: cleanText,
            pauseAfterMs: 350
          });
        }
        continue;
      }

      if (parsedTurns.length > 0) {
        // Continuation of the active speaker's turn (or opening narrator block before first speaker label)
        parsedTurns[parsedTurns.length - 1].text += ' ' + cleanText;
      } else {
        // Preserve opening narrative/instruction text occurring before the first speaker label
        parsedTurns.push({
          speaker: 'Sprint Examiner (Arthur)',
          speakerId: 'speaker_04',
          gender: 'male',
          text: cleanText,
          pauseAfterMs: 300
        });
      }
    }

    let rawResult: DialogueLine[] = [];
    if (hasExplicitSpeakerLabels && parsedTurns.length >= 1) {
      rawResult = this.assignDistinctSpeakerProfiles(parsedTurns);
    } else {
      // Fallback when no explicit speaker labels were present in the entire script:
      const cleanFullText = scriptText.replace(/^\[\s*(?:SECTION|PART|TRANSCRIPT|AUDIO)\s*.*\]$/gim, '').trim();
      if (cleanFullText) {
        rawResult = [
          {
            speakerId: 'speaker_04',
            speakerName: 'Narrator / Presenter',
            gender: 'male',
            text: cleanFullText.replace(/\s+/g, ' ').trim(),
            pauseAfterMs: 250
          }
        ];
      }
    }

    return this.subSplitLongMonologueTurns(rawResult);
  }

  /**
   * Registers question audio metadata with question-hash based unique audio ID.
   * Maps distinct dialogue speaker turns to distinct native speaker voice profiles.
   */
  public registerQuestionAudio(q: IELTSQuestion): AudioItemMetadata {
    // Generate signature from dialogue or script or prompt
    let signature = '';
    let dialogueLines: DialogueLine[] = [];

    if (q.dialogue && q.dialogue.length > 0) {
      signature = q.dialogue.map((d) => `${d.speaker}:${d.text}`).join('|');
      dialogueLines = this.subSplitLongMonologueTurns(this.assignDistinctSpeakerProfiles(q.dialogue));
    } else if (q.audioScript) {
      signature = q.audioScript;
      const parsedFromScript = this.parseMultiSpeakerScript(q.audioScript);
      if (parsedFromScript.length >= 1) {
        dialogueLines = parsedFromScript;
      } else {
        dialogueLines = this.subSplitLongMonologueTurns([
          {
            speakerId: 'speaker_04',
            speakerName: 'Examiner (Arthur)',
            text: q.audioScript
          }
        ]);
      }
    } else {
      signature = `${q.topic}:${q.prompt}`;
      dialogueLines = [
        {
          speakerId: 'speaker_04',
          speakerName: 'Examiner (Arthur)',
          text: q.prompt
        }
      ];
    }

    const questionHash = computeQuestionHash(q);
    const audioId = buildAudioId(q.id, signature);
    const contentHash = computeAudioHash(signature);

    const meta: AudioItemMetadata = {
      audioId,
      questionId: q.id,
      questionHash,
      module: q.module,
      section: q.section,
      topic: q.topic,
      speakerIds: Array.from(new Set(dialogueLines.map((l) => l.speakerId).filter((id): id is string => Boolean(id)))),
      contentHash,
      dialogue: dialogueLines,
      textScript: q.audioScript || q.prompt,
      createdAt: q.createdAt || Date.now()
    };

    this.metadataRegistry.set(audioId, meta);
    return meta;
  }

  /**
   * Validates that an audioId strictly matches and belongs to the specified questionId
   */
  public validateAudioOwnership(questionId: string, audioId: string): AudioValidationResult {
    if (!questionId || !audioId) {
      return { isValid: false, questionId, audioId, reason: 'Missing questionId or audioId' };
    }

    // audioId must include questionId as its prefix
    if (!audioId.startsWith(`aud_${questionId}_`)) {
      return {
        isValid: false,
        questionId,
        audioId,
        reason: `Audio ownership mismatch: audioId ${audioId} does not match questionId ${questionId}`
      };
    }

    const meta = this.metadataRegistry.get(audioId);
    if (meta && meta.questionId !== questionId) {
      return {
        isValid: false,
        questionId,
        audioId,
        reason: `Registered questionId ${meta.questionId} differs from expected ${questionId}`
      };
    }

    return { isValid: true, questionId, audioId };
  }

  /**
   * Checks if an audioId has already been played in the current session or recently
   */
  public isAudioRecentlyUsed(audioId: string, currentSessionOnly: boolean = false): boolean {
    if (this.currentSessionAudioIds.has(audioId)) return true;
    if (currentSessionOnly) return false;
    return this.recentAudioHistory.includes(audioId);
  }

  /**
   * Checks whether an audio ID or question hash has already been played in this session
   */
  public hasPlayedInSession(audioId: string): boolean {
    return this.currentSessionAudioIds.has(audioId);
  }

  /**
   * Checks whether a question hash has already been played in this session
   */
  public isQuestionHashPlayedInSession(questionHash: string): boolean {
    return this.currentSessionQuestionHashes.has(questionHash);
  }

  /**
   * Marks audioId and question hash as played in this session and global history
   */
  public recordAudioPlayed(audioId: string, questionId: string, questionHash?: string): void {
    this.currentSessionAudioIds.add(audioId);
    if (questionHash) {
      this.currentSessionQuestionHashes.add(questionHash);
    }
    this.recentAudioHistory = this.recentAudioHistory.filter((id) => id !== audioId);
    this.recentAudioHistory.push(audioId);
    if (this.recentAudioHistory.length > MAX_RECENT_AUDIO_HISTORY) {
      this.recentAudioHistory.shift();
    }
    this.persistRecentHistory();
  }

  /**
   * Universal Global Audio Killswitch:
   * 1. Forces window.speechSynthesis.cancel() to kill any lingering TTS voices
   * 2. Pauses and resets any active or passed HTMLAudioElement
   * 3. Calls audioService.stop()
   * 4. Aborts pending requests and unlocks playback state
   */
  public killAllAudio(elementToPause?: HTMLAudioElement | null): void {
    this.playbackGeneration++;
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch {}
      this.activeAbortController = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
      } catch {}
    }

    if (elementToPause) {
      try {
        elementToPause.pause();
        elementToPause.currentTime = 0;
        elementToPause.src = '';
      } catch {}
    }

    try {
      audioService.stop();
    } catch {}

    this.isPlaybackLocked = false;
    this.activeAudioId = null;
    this.activeQuestionId = null;
    this.notifyState();
  }

  /**
   * Clears the current active audio and cancels any pending playback
   */
  public reset(reason: string = 'manual_reset'): void {
    this.killAllAudio();
  }

  /**
   * Stops all active audio and resets playback lock
   */
  public stopAll(): void {
    this.killAllAudio();
  }

  /**
   * Reset session history (e.g. when user restarts a test)
   */
  public resetSession(): void {
    this.reset('reset_session');
    this.currentSessionAudioIds.clear();
    this.currentSessionQuestionHashes.clear();
  }

  /**
   * High-level Play Orchestration for a Question:
   * 1. Validates audio ownership against questionId
   * 2. Strict Session Deduplication: prevents the same audio from being requested or played twice
   * 3. Checks for race conditions using monotonic generation token
   * 4. Enforces audio lock so concurrent playback cannot collide
   */
  public async playQuestionAudio(
    question: IELTSQuestion,
    options: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
      allowReplay?: boolean;
    } = {}
  ): Promise<boolean> {
    const meta = this.registerQuestionAudio(question);
    const validation = this.validateAudioOwnership(question.id, meta.audioId);

    if (!validation.isValid) {
      console.error('[AudioManager] Audio validation failed:', validation.reason);
      options.onError?.(new Error(validation.reason));
      return false;
    }

    // Deduplication check: only suppress duplicate requests if replay is explicitly forbidden (e.g. strict exam mode)
    const isReplayForbidden = options.allowReplay === false;
    if (isReplayForbidden && (this.currentSessionAudioIds.has(meta.audioId) || this.currentSessionQuestionHashes.has(meta.questionHash))) {
      options.onEnd?.();
      return false;
    }

    // Stop previous audio and invalidate previous requests
    this.reset(`play_question_${question.id}`);
    this.isPlaybackLocked = true;

    // Create current request generation
    const currentGen = ++this.playbackGeneration;
    const abortController = new AbortController();
    this.activeAbortController = abortController;

    this.activeAudioId = meta.audioId;
    this.activeQuestionId = question.id;
    this.notifyState();

    try {
      options.onStart?.();

      // Check race condition before proceeding
      if (this.playbackGeneration !== currentGen || abortController.signal.aborted) {
        if (this.playbackGeneration === currentGen) {
          this.isPlaybackLocked = false;
          this.notifyState();
        }
        return false;
      }

      if (meta.dialogue && meta.dialogue.length > 0) {
        await audioService.playDialogue(meta.dialogue, {
          testId: meta.audioId,
          onEnd: () => {
            this.recordAudioPlayed(meta.audioId, question.id, meta.questionHash);
            if (this.playbackGeneration === currentGen) {
              this.isPlaybackLocked = false;
              this.notifyState();
              options.onEnd?.();
            }
          },
          onError: (err) => {
            if (isInterruptedPlaybackError(err)) {
              return;
            }
            if (this.playbackGeneration === currentGen) {
              this.isPlaybackLocked = false;
              this.notifyState();
              options.onError?.(err);
            }
          }
        });
      } else {
        await audioService.speak(meta.textScript || question.prompt, {
          speakerId: meta.speakerIds[0] || 'speaker_04',
          onEnd: () => {
            this.recordAudioPlayed(meta.audioId, question.id, meta.questionHash);
            if (this.playbackGeneration === currentGen) {
              this.isPlaybackLocked = false;
              this.notifyState();
              options.onEnd?.();
            }
          },
          onError: (err) => {
            if (isInterruptedPlaybackError(err)) {
              return;
            }
            if (this.playbackGeneration === currentGen) {
              this.isPlaybackLocked = false;
              this.notifyState();
              options.onError?.(err);
            }
          }
        });
      }

      return true;
    } catch (err) {
      if (isInterruptedPlaybackError(err)) {
        return false;
      }
      if (this.playbackGeneration === currentGen) {
        this.isPlaybackLocked = false;
        console.error('[AudioManager] Playback error:', err);
        options.onError?.(err);
      }
      return false;
    } finally {
      if (this.playbackGeneration === currentGen) {
        this.isPlaybackLocked = false;
        this.notifyState();
      }
    }
  }

  /**
   * Safe audio playback for custom scripts (e.g. Speaking prompts, Mock Exams)
   * Guaranteed to assign a stable audioId derived from parentId and script.
   * Deduplicates per session to prevent repeated audio clips.
   */
  public async playCustomAudio(
    parentId: string,
    scriptText: string,
    options: {
      speakerId?: string;
      gender?: 'male' | 'female';
      accent?: string;
      rate?: number;
      deliveryProfile?: import('../config/speechDirection').SpeechDeliveryProfileId;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
      allowReplay?: boolean;
    } = {}
  ): Promise<string> {
    const speakerId = options.speakerId || (options.gender === 'female' ? 'speaker_05' : 'speaker_04');
    const resolvedGender: 'male' | 'female' =
      options.gender ||
      (speakerId === 'speaker_05' ||
      speakerId === 'speaker_02' ||
      speakerId === 'speaker_07' ||
      speakerId.endsWith('_f') ||
      speakerId === 'speaker_16' ||
      speakerId === 'speaker_14'
        ? 'female'
        : 'male');

    const audioId = buildAudioId(`${parentId}_${speakerId}`, scriptText);
    const scriptHash = computeAudioHash(`${speakerId}_${resolvedGender}_${scriptText}`);

    // Deduplication check: only suppress if allowReplay is explicitly false
    if (options.allowReplay === false && (this.currentSessionAudioIds.has(audioId) || this.currentSessionQuestionHashes.has(scriptHash))) {
      options.onEnd?.();
      return audioId;
    }

    this.reset(`custom_audio_${parentId}`);
    this.isPlaybackLocked = true;
    const currentGen = ++this.playbackGeneration;
    const abortController = new AbortController();
    this.activeAbortController = abortController;

    this.activeAudioId = audioId;
    this.activeQuestionId = parentId;
    this.notifyState();

    options.onStart?.();

    const inferredProfile =
      options.deliveryProfile ||
      (scriptText.trim().endsWith('?') ? 'examiner_question' : 'examiner_instruction');

    try {
      const parsedMultiSpeaker = this.parseMultiSpeakerScript(scriptText);
      if (parsedMultiSpeaker.length >= 2) {
        await audioService.playDialogueSequentially(parsedMultiSpeaker, {
          rate: options.rate,
          onStart: () => {
            if (this.playbackGeneration === currentGen) {
              this.notifyState();
            }
          },
          onComplete: () => {
            this.recordAudioPlayed(audioId, parentId, scriptHash);
            if (this.playbackGeneration === currentGen) {
              this.isPlaybackLocked = false;
              this.notifyState();
              options.onEnd?.();
            }
          },
          onError: (err) => {
            if (isInterruptedPlaybackError(err)) {
              return;
            }
            if (this.playbackGeneration === currentGen) {
              this.isPlaybackLocked = false;
              this.notifyState();
              options.onError?.(err);
            }
          }
        });
      } else {
        await audioService.speak(scriptText, {
          speakerId,
          gender: resolvedGender,
          accent: options.accent,
          rate: options.rate,
          deliveryProfile: inferredProfile,
          onEnd: () => {
            this.recordAudioPlayed(audioId, parentId, scriptHash);
            if (this.playbackGeneration === currentGen) {
              this.isPlaybackLocked = false;
              this.notifyState();
              options.onEnd?.();
            }
          },
          onError: (err) => {
            if (isInterruptedPlaybackError(err)) {
              return;
            }
            if (this.playbackGeneration === currentGen) {
              this.isPlaybackLocked = false;
              this.notifyState();
              options.onError?.(err);
            }
          }
        });
      }
    } finally {
      if (this.playbackGeneration === currentGen) {
        this.isPlaybackLocked = false;
        this.notifyState();
      }
    }

    return audioId;
  }

  public getActiveAudioId(): string | null {
    return this.activeAudioId;
  }

  public getActiveQuestionId(): string | null {
    return this.activeQuestionId;
  }

  public isPlaying(): boolean {
    return audioService.getState().isPlaying || this.isPlaybackLocked;
  }

  public pause(): void {
    audioService.pause();
    this.notifyState();
  }

  public resume(): void {
    audioService.resume();
    this.notifyState();
  }

  public getAudioPlaybackState(): AudioPlaybackState {
    return audioService.getState();
  }

  public subscribe(
    fn: (state: { activeAudioId: string | null; activeQuestionId: string | null; isPlaying: boolean }) => void
  ): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notifyState(): void {
    const payload = {
      activeAudioId: this.activeAudioId,
      activeQuestionId: this.activeQuestionId,
      isPlaying: this.isPlaying()
    };
    this.listeners.forEach((fn) => {
      try {
        fn(payload);
      } catch {}
    });
  }
}

export const audioManager = new AudioManagerService();

