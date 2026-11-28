import { audioService, IELTS_SPEAKERS, SpeakerDefinition, DialogueLine } from '../services/audioService';
import { audioManager } from '../services/AudioManager';
import {
  selectBestDeviceMaleVoice,
  getPreferredVoiceGender,
  getPreferredAccent,
  getPreferredStudioSpeakerId,
  resolveSpeakerForAccentAndGender,
  OfficialIELTSAccent,
  BritishRegionalAccent,
  resolveRegionalExaminerSpeaker
} from '../config/voiceConfig';
import { SpeechDeliveryProfileId, inferSpeechDeliveryProfile } from '../config/speechDirection';

export { IELTS_SPEAKERS, audioService };
export type { SpeakerDefinition, DialogueLine, BritishRegionalAccent };

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
  regionalAccent?: BritishRegionalAccent;
  deliveryProfile?: SpeechDeliveryProfileId;
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
 * Speaks a single text passage using the studio-mastered multi-accent neural MP3 stream.
 * Respects explicit `options.speakerId`, `options.accent`, `options.regionalAccent`, and `options.gender`,
 * falling back seamlessly to the candidate's Profile Accent & Professional Studio Voice preference.
 */
export function speakBritish(text: string, options: SpeakOptions = {}): void {
  const cleanText = text.replace(/[\u0980-\u09FF]+/g, '').trim();
  if (!cleanText) {
    options.onEnd?.();
    return;
  }

  const preferredAccent = getPreferredAccent();
  const preferredStudioSpeaker = getPreferredStudioSpeakerId();

  let targetSpeakerId = options.speakerId;
  if (!targetSpeakerId) {
    if (options.accent && ['British', 'Australian', 'American', 'Canadian', 'New Zealand', 'Irish'].includes(options.accent)) {
      targetSpeakerId = resolveSpeakerForAccentAndGender(
        options.accent as OfficialIELTSAccent,
        options.gender || getPreferredVoiceGender()
      );
    } else if (options.gender) {
      targetSpeakerId = resolveSpeakerForAccentAndGender(preferredAccent, options.gender);
    } else {
      targetSpeakerId = preferredStudioSpeaker;
    }
  }

  const speakerDef = targetSpeakerId ? IELTS_SPEAKERS[targetSpeakerId] : undefined;
  const resolvedGender: 'male' | 'female' =
    options.gender || speakerDef?.gender || getPreferredVoiceGender();

  if (options.regionalAccent) {
    const regional = resolveRegionalExaminerSpeaker(resolvedGender, options.regionalAccent);
    targetSpeakerId = regional.speakerId;
  }

  const inferredProfile: SpeechDeliveryProfileId =
    options.deliveryProfile ||
    (targetSpeakerId === 'speaker_barnaby'
      ? 'barnaby_companion'
      : cleanText.split(/\s+/).length <= 3
      ? 'pronunciation_model'
      : /meaning:|definition:|example:|idiom:|phrase:/i.test(cleanText)
      ? 'vocabulary_example'
      : cleanText.endsWith('?')
      ? 'examiner_question'
      : 'natural_conversation');

  audioService
    .speakText(cleanText, targetSpeakerId, {
      rate: options.rate,
      gender: resolvedGender,
      accent: options.accent || options.regionalAccent || speakerDef?.accent || preferredAccent,
      deliveryProfile: inferredProfile,
      onStart: options.onStart,
      onEnd: options.onEnd,
      onError: options.onError
    })
    .catch((err) => {
      options.onError?.(err);
    });
}

/**
 * Speaks a multi-speaker dialogue sequentially while preserving each turn's
 * distinct male/female speaker identity (`speaker_04` Arthur vs `speaker_05` Clara, etc.).
 */
export function speakDialogue(
  lines: Array<{
    speaker: string;
    speakerId?: string;
    gender?: 'male' | 'female';
    text: string;
    pauseAfterMs?: number;
    deliveryProfile?: SpeechDeliveryProfileId;
  }>,
  options: {
    onLineChange?: (index: number, speaker: string) => void;
    onEnd?: () => void;
    onError?: () => void;
  } = {}
): void {
  const mappedLines: DialogueLine[] = lines.map((line, index) => {
    const inferredGender: 'male' | 'female' =
      line.gender ||
      (line.speakerId && IELTS_SPEAKERS[line.speakerId]?.gender) ||
      (/clara|charlotte|sonia|libby|female|woman|sarah|emily|natasha|molly|alice|beatrice/i.test(line.speaker)
        ? 'female'
        : /arthur|thomas|oliver|ryan|william|liam|connor|mitchell|male|man|george|professor|officer/i.test(line.speaker)
        ? 'male'
        : index % 2 === 0
        ? 'male'
        : 'female');

    const preferredAccent = getPreferredAccent();
    const resolvedSpeakerId =
      line.speakerId || resolveSpeakerForAccentAndGender(preferredAccent, inferredGender);

    return {
      speakerId: resolvedSpeakerId,
      speakerName: line.speaker,
      gender: inferredGender,
      text: line.text,
      pauseAfterMs: line.pauseAfterMs || 450,
      deliveryProfile:
        line.deliveryProfile ||
        inferSpeechDeliveryProfile({
          text: line.text,
          speaker: line.speaker,
          speakerId: resolvedSpeakerId
        })
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
