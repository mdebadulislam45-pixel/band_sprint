import { audioService, IELTS_SPEAKERS, SpeakerDefinition, DialogueLine } from '../services/audioService';
import { audioManager } from '../services/AudioManager';
import { selectBestDeviceMaleVoice, getPreferredVoiceGender } from '../config/voiceConfig';

export { IELTS_SPEAKERS, audioService };
export type { SpeakerDefinition, DialogueLine };

/**
 * Returns the globally cached natural British voice
 */
export function getBestBritishVoice(): SpeechSynthesisVoice | null {
  return selectBestDeviceMaleVoice().voice;
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  gender?: 'male' | 'female';
  speakerId?: string;
  accent?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err?: any) => void;
}

/**
 * Stops any ongoing speech or audio playback immediately
 */
export function stopSpeech(): void {
  audioManager.stopAll();
}

/**
 * Speaks a single text passage using the studio-mastered British MP3 stream.
 * Respects explicit `options.gender` and explicit `options.speakerId` / `options.accent`.
 */
export function speakBritish(text: string, options: SpeakOptions = {}): void {
  const cleanText = text.replace(/[\u0980-\u09FF]+/g, '').trim();
  if (!cleanText) {
    options.onEnd?.();
    return;
  }

  const resolvedGender =
    options.gender ||
    (options.speakerId === 'speaker_05' ||
    options.speakerId === 'speaker_barnaby' ||
    options.speakerId === 'speaker_02' ||
    options.speakerId === 'speaker_07' ||
    options.speakerId === 'speaker_10' ||
    options.speakerId === 'speaker_12' ||
    options.speakerId === 'speaker_14' ||
    options.speakerId === 'speaker_16'
      ? 'female'
      : getPreferredVoiceGender());

  const targetSpeakerId =
    options.speakerId || (resolvedGender === 'female' ? 'speaker_05' : 'speaker_04');

  audioService
    .speakText(cleanText, targetSpeakerId, {
      rate: options.rate,
      gender: resolvedGender,
      accent: options.accent,
      onStart: options.onStart,
      onEnd: options.onEnd,
      onError: options.onError
    })
    .catch((err) => {
      options.onError?.(err);
    });
}

/**
 * Speaks a multi-speaker dialogue sequentially using the locked session voice
 * so the voice never changes or degrades mid-test.
 */
export function speakDialogue(
  lines: Array<{
    speaker: string;
    gender?: 'male' | 'female';
    text: string;
    pauseAfterMs?: number;
  }>,
  options: {
    onLineChange?: (index: number, speaker: string) => void;
    onEnd?: () => void;
    onError?: () => void;
  } = {}
): void {
  const preferredGender = getPreferredVoiceGender();

  // Keep explicit speaker identity/gender per turn. Locking every line to the
  // user's preferred examiner voice collapses a multi-speaker dialogue into
  // one voice, even when the caller supplied male/female turns.
  const mappedLines: DialogueLine[] = lines.map((line) => {
    const label = line.speaker.trim().toLowerCase();
    const namedSpeaker = Object.values(IELTS_SPEAKERS).find((speaker) => {
      const canonicalName = speaker.name.split(' (')[0].trim().toLowerCase();
      const firstName = canonicalName.split(/\\s+/)[0];
      return label === canonicalName || label === firstName;
    });

    const resolvedSpeaker =
      namedSpeaker && (!line.gender || namedSpeaker.gender === line.gender)
        ? namedSpeaker
        : undefined;
    const speakerId =
      resolvedSpeaker?.id ||
      (line.gender === 'female'
        ? 'speaker_05'
        : line.gender === 'male'
          ? 'speaker_04'
          : undefined);

    return {
      ...(speakerId ? { speakerId } : {}),
      speakerName: line.speaker,
      ...(line.gender || resolvedSpeaker?.gender
        ? { gender: line.gender || resolvedSpeaker?.gender }
        : {}),
      text: line.text,
      pauseAfterMs: line.pauseAfterMs ?? 450
    };
  });

  audioService
    .playDialogueSequentially(mappedLines, {
      onLineStart: (idx, line) => {
        options.onLineChange?.(idx, line.speakerName || 'Examiner');
      },
      onComplete: () => {
        options.onEnd?.();
      },
      onError: () => {
        options.onError?.();
      }
    })
    .catch(() => {
      options.onError?.();
    });
}
