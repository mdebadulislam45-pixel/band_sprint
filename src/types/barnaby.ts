export type BarnabyMode =
  | 'ambient'
  | 'companion'
  | 'tutor'
  | 'focus'
  | 'celebration';

export type BarnabyMoodState =
  | 'neutral'
  | 'focused'
  | 'bored'
  | 'celebratory'
  | 'curious'
  | 'sleepy'
  | 'encouraging';

export type BarnabyFelineBehavior =
  | 'patrol'
  | 'walking'
  | 'paw-licking'
  | 'grooming'
  | 'energetic'
  | 'bored'
  | 'hovering'
  | 'thinking'
  | 'speaking'
  | 'sleeping';

export type BarnabyAnimationState =
  | 'idle'
  | 'walking'
  | 'paw-licking'
  | 'grooming'
  | 'energetic'
  | 'hovering'
  | 'focused'
  | 'thinking'
  | 'bored'
  | 'celebratory'
  | 'patrol'
  | 'speaking'
  | 'sleeping'
  | 'affectionate';

export type BarnabyVisibilitySetting =
  | 'ambient_and_tutor'
  | 'minimal_badge'
  | 'hidden_focus_only';

export type BarnabyCanonicalPose =
  | 'greeting'
  | 'analyzing'
  | 'encouraging'
  | 'studying'
  | 'celebrating';

export type BarnabyAuraTone = 'emerald' | 'gold' | 'lavender';

export type BarnabyExpression =
  | 'neutral'
  | 'happy'
  | 'curious'
  | 'thinking'
  | 'analytical'
  | 'focused'
  | 'encouraging'
  | 'proud'
  | 'excited'
  | 'celebrating'
  | 'confused'
  | 'surprised'
  | 'sleepy'
  | 'relaxed'
  | 'empathetic'
  | 'determined'
  | 'playful'
  | 'shy'
  | 'listening'
  | 'welcoming';

export interface BarnabyExpressionConfig {
  expression: BarnabyExpression;
  pose: BarnabyCanonicalPose;
  spritePath: string;
  statusLabel: string;
  auraTone: BarnabyAuraTone;
  auraHex: string;
  ringClasses: string;
  pillClasses: string;
  hoverDurationSec: number;
}

export const BARNABY_CORE_TAGLINE = 'Your little companion for big dreams.';
