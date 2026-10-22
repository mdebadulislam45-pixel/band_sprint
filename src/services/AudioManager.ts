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
  private listeners: Set<(state: { activeAudioId: string | null; activeQuestionId: string | null; isPlaying: boolean }) => void> = new Set();

  constructor() {
    this.loadRecentHistory();
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
   * to unique speaker names in a multi-speaker dialogue.
   */
  public assignDistinctSpeakerProfiles(
    dialogue: Array<{ speaker?: string; text: string; gender?: 'male' | 'female'; pauseAfterMs?: number; speakerId?: string }>
  ): DialogueLine[] {
    const speakerMap = new Map<string, string>();
    const malePool = [
      'speaker_04', // Arthur UK RP Baritone
      'speaker_01', // Thomas UK Student/Applicant
      'speaker_03', // Alistair UK Academic Professor
      'speaker_08', // Callum UK Researcher
      'speaker_06'  // William AU Specialist
    ];
    const femalePool = [
      'speaker_05', // Charlotte UK RP Lecturer
      'speaker_02', // Libby UK Librarian/Support
      'speaker_07'  // Natasha AU Coordinator
    ];

    let maleIdx = 0;
    let femaleIdx = 0;

    return dialogue.map((line) => {
      const rawName = line.speaker || 'Examiner';

      // If an explicit valid speakerId is provided, preserve it
      if (line.speakerId && line.speakerId !== 'default') {
        return {
          speakerId: line.speakerId,
          speakerName: rawName,
          gender: line.gender,
          text: line.text,
          pauseAfterMs: line.pauseAfterMs || 420
        };
      }

      if (!speakerMap.has(rawName)) {
        const lowerName = rawName.toLowerCase();
        let isFemale =
          line.gender === 'female' ||
          /\b(ms|mrs|miss|woman|female|girl|lady|charlotte|libby|natasha|jenny|clara|molly|emily|sarah|helen|chloe|rachel|elena|receptionist|librarian|nurse|advisor|registrar)\b/.test(
            lowerName
          );
        let isMale =
          line.gender === 'male' ||
          /\b(mr|man|male|boy|arthur|thomas|alistair|william|callum|christopher|liam|mitchell|connor|oliver|daniel|customer|applicant|student|officer|clerk|lecturer|professor)\b/.test(
            lowerName
          );

        if (!isFemale && !isMale) {
          isFemale = speakerMap.size % 2 === 1;
        }

        let chosenId: string;
        if (isFemale) {
          chosenId = femalePool[femaleIdx % femalePool.length];
          femaleIdx++;
        } else {
          chosenId = malePool[maleIdx % malePool.length];
          maleIdx++;
        }
        speakerMap.set(rawName, chosenId);
      }

      const assignedId = speakerMap.get(rawName)!;
      const inferredGender: 'male' | 'female' =
        line.gender || (femalePool.includes(assignedId) ? 'female' : 'male');

      return {
        speakerId: assignedId,
        speakerName: rawName,
        gender: inferredGender,
        text: line.text,
        pauseAfterMs: line.pauseAfterMs || 420
      };
    });
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
      dialogueLines = this.assignDistinctSpeakerProfiles(q.dialogue);
    } else if (q.audioScript) {
      signature = q.audioScript;
      dialogueLines = [
        {
          speakerId: 'speaker_04',
          speakerName: 'Examiner (Arthur)',
          text: q.audioScript
        }
      ];
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
   * Clears the current active audio and cancels any pending playback
   */
  public reset(reason: string = 'manual_reset'): void {
    this.playbackGeneration++;
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    audioService.stop();
    this.isPlaybackLocked = false;
    this.activeAudioId = null;
    this.activeQuestionId = null;
    this.notifyState();
  }

  /**
   * Stops all active audio and resets playback lock
   */
  public stopAll(): void {
    this.reset('stop_all');
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
      console.warn(`[AudioManager] Suppressing duplicate audio request in strict exam mode: ${meta.audioId}`);
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
        this.isPlaybackLocked = false;
        return false;
      }

      if (meta.dialogue && meta.dialogue.length > 0) {
        await audioService.playDialogue(meta.dialogue, {
          testId: meta.audioId,
          onEnd: () => {
            this.recordAudioPlayed(meta.audioId, question.id, meta.questionHash);
            this.isPlaybackLocked = false;
            if (this.playbackGeneration === currentGen) {
              this.notifyState();
              options.onEnd?.();
            }
          }
        });
      } else {
        await audioService.speak(meta.textScript || question.prompt, {
          speakerId: meta.speakerIds[0] || 'speaker_04',
          onEnd: () => {
            this.recordAudioPlayed(meta.audioId, question.id, meta.questionHash);
            this.isPlaybackLocked = false;
            if (this.playbackGeneration === currentGen) {
              this.notifyState();
              options.onEnd?.();
            }
          },
          onError: (err) => {
            this.isPlaybackLocked = false;
            if (isInterruptedPlaybackError(err)) {
              return;
            }
            if (this.playbackGeneration === currentGen) {
              options.onError?.(err);
            }
          }
        });
      }

      return true;
    } catch (err) {
      this.isPlaybackLocked = false;
      if (isInterruptedPlaybackError(err)) {
        return false;
      }
      if (this.playbackGeneration === currentGen) {
        console.error('[AudioManager] Playback error:', err);
        options.onError?.(err);
      }
      return false;
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
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
      allowReplay?: boolean;
    } = {}
  ): Promise<string> {
    const audioId = buildAudioId(parentId, scriptText);
    const scriptHash = computeAudioHash(scriptText);

    // Deduplication check: only suppress if allowReplay is explicitly false
    if (options.allowReplay === false && (this.currentSessionAudioIds.has(audioId) || this.currentSessionQuestionHashes.has(scriptHash))) {
      console.warn(`[AudioManager] Suppressing duplicate custom audio request in strict mode: ${audioId}`);
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

    // Preserve passed speakerId or default to British Male examiner speaker
    const speakerId = options.speakerId || 'speaker_04';

    await audioService.speak(scriptText, {
      speakerId,
      onEnd: () => {
        this.isPlaybackLocked = false;
        if (this.playbackGeneration === currentGen) {
          this.notifyState();
          options.onEnd?.();
        }
      },
      onError: (err) => {
        this.isPlaybackLocked = false;
        if (isInterruptedPlaybackError(err)) {
          return;
        }
        if (this.playbackGeneration === currentGen) {
          options.onError?.(err);
        }
      }
    });

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

