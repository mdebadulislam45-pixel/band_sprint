import { ChubbyAvatarCharacter, ExaminerConversationalState } from '../components/speaking/CuteChubbyExaminerAvatar';
import { MascotMood } from '../components/common/ChubbyMascotAvatar';
import { EXAMINER_VOICE_REGISTRY } from './voiceConfig';

export type { ChubbyAvatarCharacter, ExaminerConversationalState };

export type ExaminerReferenceExpression =
  | 'neutral'
  | 'speaking'
  | 'listening'
  | 'thinking'
  | 'encouraging';

export type BarnabyReferenceExpression =
  | 'happy'
  | 'excited'
  | 'thinking'
  | 'encouraging'
  | 'listening'
  | 'cheerful';

export interface ExaminerReferenceSpec {
  id: 'arthur' | 'clara';
  fullName: string;
  roleLabel: string;
  shortTitle: string;
  certBadge: string;
  traits: string[];
  expressions: ExaminerReferenceExpression[];
  palette: {
    hairPrimary: string;
    hairSecondary: string;
    hairHighlight: string;
    skinLight: string;
    skinMid: string;
    skinShadow: string;
    irisTop: string;
    irisMid: string;
    irisGlow: string;
    jacketPrimary: string;
    jacketSecondary: string;
    jacketLapel: string;
    shirtColor: string;
    accentColor: string;
  };
}

export interface BarnabyCompanionSpec {
  id: 'barnaby';
  fullName: string;
  roleLabel: string;
  tagline: string;
  /** Canonical look from docs/barnaby-character-bible.md (blue baby dragon). */
  appearance: string;
  traits: Array<{ label: string; icon: 'cute' | 'friendly' | 'supportive' | 'motivating' }>;
  voiceSummary: string;
  expressions: BarnabyReferenceExpression[];
  palette: {
    hairPrimary: string;
    hairSecondary: string;
    hairHighlight: string;
    skinLight: string;
    skinMid: string;
    cheekBlush: string;
    irisTop: string;
    irisMid: string;
    irisGlow: string;
    hoodiePrimary: string;
    hoodieSecondary: string;
    hoodieShadow: string;
    strapColor: string;
  };
}

export const EXAMINER_VISUAL_REFERENCE: Record<'arthur' | 'clara', ExaminerReferenceSpec> = {
  arthur: {
    id: 'arthur',
    fullName: 'Prof. Arthur Pendelton',
    roleLabel: 'Male Examiner',
    shortTitle: 'IELTS Speaking Examiner · British RP',
    certBadge: 'Senior Examiner',
    traits: ['Calm', 'Professional', 'Encouraging', 'Friendly'],
    expressions: ['neutral', 'speaking', 'listening', 'thinking', 'encouraging'],
    palette: {
      hairPrimary: '#3B251B',
      hairSecondary: '#24150E',
      hairHighlight: '#634130',
      skinLight: '#FFF6EE',
      skinMid: '#F8DEC9',
      skinShadow: '#DCA98E',
      irisTop: '#0F172A',
      irisMid: '#1E3A8A',
      irisGlow: '#93C5FD',
      jacketPrimary: '#1E2D5A',
      jacketSecondary: '#152044',
      jacketLapel: '#283B70',
      shirtColor: '#F8FAFC',
      accentColor: '#25386B'
    }
  },
  clara: {
    id: 'clara',
    fullName: 'Dr. Clara Sterling',
    roleLabel: 'Female Examiner',
    shortTitle: 'IELTS Speaking Examiner · British RP',
    certBadge: 'Senior Examiner',
    traits: ['Warm', 'Professional', 'Supportive', 'Friendly'],
    expressions: ['neutral', 'speaking', 'listening', 'thinking', 'encouraging'],
    palette: {
      hairPrimary: '#523222',
      hairSecondary: '#361E12',
      hairHighlight: '#80523B',
      skinLight: '#FFF8F3',
      skinMid: '#FCE5D6',
      skinShadow: '#E0AF99',
      irisTop: '#3B1D0E',
      irisMid: '#6E3B1E',
      irisGlow: '#FCD34D',
      jacketPrimary: '#EAD9C9',
      jacketSecondary: '#DAC3AE',
      jacketLapel: '#C5AA92',
      shirtColor: '#FFFFFF',
      accentColor: '#7C3AED'
    }
  }
};

export const BARNABY_VISUAL_REFERENCE: BarnabyCompanionSpec = {
  id: 'barnaby',
  fullName: 'Barnaby',
  roleLabel: 'Your AI Learning Companion',
  tagline: 'Every mistake makes you stronger. Every practice brings you closer to your dream score.',
  appearance:
    'Cute sky-blue baby dragon with a cream belly and muzzle, small golden horns, large expressive brown eyes, oversized dark-blue round glasses, a navy-blue BandSprint hoodie, a navy graduation cap with a golden tassel, small blue wings with golden interior details, and a blue tail with golden spikes. Friendly and intelligent expression. Artwork: docs/barnaby-dragon.png (the floating corner bubble uses it; the animated in-studio avatar still uses the code drawing). (See docs/barnaby-character-bible.md.)',
  traits: [
    { label: 'Friendly', icon: 'friendly' },
    { label: 'Intelligent', icon: 'motivating' },
    { label: 'Patient', icon: 'supportive' },
    { label: 'Supportive', icon: 'supportive' },
    { label: 'Playful', icon: 'friendly' },
    { label: 'Curious', icon: 'friendly' },
    { label: 'Encouraging', icon: 'motivating' },
    { label: 'Honest', icon: 'supportive' },
    { label: 'Motivational', icon: 'motivating' }
  ],
  voiceSummary: "Barnaby's voice · Warm masculine young-adult · Medium, slightly bright pitch · Clear international English · Natural speed · Expressive but controlled · Friendly and reassuring",
  expressions: ['happy', 'excited', 'thinking', 'encouraging', 'listening', 'cheerful'],
  palette: {
    hairPrimary: '#432818',
    hairSecondary: '#2A170D',
    hairHighlight: '#6F452C',
    skinLight: '#FFF7F0',
    skinMid: '#FDE2CE',
    cheekBlush: '#FB7185',
    irisTop: '#2E1508',
    irisMid: '#6B381B',
    irisGlow: '#FBBF24',
    hoodiePrimary: '#2563EB',
    hoodieSecondary: '#1D4ED8',
    hoodieShadow: '#1E3A8A',
    strapColor: '#27272A'
  }
};

/**
 * Resolves the canonical visual-reference expression for Prof. Arthur or Dr. Clara
 * from the active conversational state.
 */
export function resolveExaminerExpression(
  state: ExaminerConversationalState,
  explicitExpression?: ExaminerReferenceExpression
): ExaminerReferenceExpression {
  if (explicitExpression) return explicitExpression;
  switch (state) {
    case 'speaking':
      return 'speaking';
    case 'listening':
      return 'listening';
    case 'processing':
    case 'loading':
      return 'thinking';
    case 'completed':
    case 'transitioning':
      return 'encouraging';
    case 'idle':
    case 'paused':
    case 'error':
    default:
      return 'neutral';
  }
}

/**
 * Resolves the canonical visual-reference expression for Barnaby (AI Learning Companion)
 * from either a conversational state or a MascotMood.
 */
export function resolveBarnabyExpression(
  stateOrMood?: ExaminerConversationalState | MascotMood,
  explicitExpression?: BarnabyReferenceExpression
): BarnabyReferenceExpression {
  if (explicitExpression) return explicitExpression;
  switch (stateOrMood) {
    case 'speaking':
    case 'surprise':
      return 'excited';
    case 'thinking':
    case 'processing':
    case 'loading':
      return 'thinking';
    case 'motivating':
    case 'transitioning':
      return 'encouraging';
    case 'listening':
      return 'listening';
    case 'celebrating':
    case 'completed':
      return 'cheerful';
    case 'idle':
    case 'paused':
    case 'error':
    default:
      return 'happy';
  }
}

export function getExpressionBadgeLabel(
  character: ChubbyAvatarCharacter,
  state: ExaminerConversationalState
): string {
  if (character === 'barnaby') {
    const exp = resolveBarnabyExpression(state);
    return exp.charAt(0).toUpperCase() + exp.slice(1);
  }
  const exp = resolveExaminerExpression(state);
  return exp.charAt(0).toUpperCase() + exp.slice(1);
}

export interface SpeakingPartnerGreetingInput {
  character?: ChubbyAvatarCharacter;
  gender?: 'female' | 'male';
  mode: 'part1_drill' | 'ai_live_partner';
  topicName: string;
  firstQuestion: string;
  scenarioLabel: string;
  scenarioOpener: string;
}

export interface SpeakingPartnerGreetingResult {
  character: ChubbyAvatarCharacter;
  speakerName: string;
  roleTitle: string;
  speakerId: string;
  deliveryProfile: 'examiner_01' | 'examiner_02' | 'barnaby';
  voiceGender: 'female' | 'male';
  greeting: string;
  buildSwitchAnnouncement: (currentPrompt: string) => string;
}

/**
 * Resolves the active character identity, voice routing metadata, and session greeting
 * for LiveAvatarSpeakingPartner across initial open, character selection, mode switching,
 * topic/scenario shuffling, and session restart.
 */
export function buildSpeakingPartnerGreeting(
  input: SpeakingPartnerGreetingInput
): SpeakingPartnerGreetingResult {
  const resolvedCharacter: ChubbyAvatarCharacter =
    input.character || (input.gender === 'male' ? 'arthur' : 'clara');

  if (resolvedCharacter === 'barnaby') {
    const speakerName = BARNABY_VISUAL_REFERENCE.fullName;
    const roleTitle = BARNABY_VISUAL_REFERENCE.roleLabel;
    const greeting =
      input.mode === 'ai_live_partner'
        ? `Hello! I'm ${speakerName}, your AI Learning Companion. We are in Adaptive Free-Talk mode (${input.scenarioLabel}). ${input.scenarioOpener}`
        : `Hello! I'm ${speakerName}, your AI Learning Companion. Welcome to your 5-minute IELTS Part 1 focus drill on ${input.topicName}. ${input.firstQuestion}`;

    return {
      character: 'barnaby',
      speakerName,
      roleTitle,
      speakerId: 'speaker_barnaby',
      deliveryProfile: 'barnaby',
      voiceGender: 'male',
      greeting,
      buildSwitchAnnouncement: (currentPrompt: string) =>
        `Hi! I'm ${speakerName}, your AI learning companion. Let's practice this question together: ${currentPrompt}`
    };
  }

  const ref = EXAMINER_VISUAL_REFERENCE[resolvedCharacter];
  const voiceRef = EXAMINER_VOICE_REGISTRY[resolvedCharacter];
  const speakerName = ref.fullName;
  const roleTitle = ref.roleLabel;
  const voiceGender: 'female' | 'male' = voiceRef.gender;
  const greeting =
    input.mode === 'ai_live_partner'
      ? `Hello! I'm ${speakerName}, your AI Live Speaking Partner. We are in Adaptive Free-Talk mode (${input.scenarioLabel}). ${input.scenarioOpener}`
      : `Hello! I'm ${speakerName}. Welcome to your 5-minute IELTS Part 1 focus drill on ${input.topicName}. ${input.firstQuestion}`;

  return {
    character: resolvedCharacter,
    speakerName,
    roleTitle,
    speakerId: voiceRef.speakerId,
    deliveryProfile: resolvedCharacter === 'clara' ? 'examiner_02' : 'examiner_01',
    voiceGender,
    greeting,
    buildSwitchAnnouncement: (currentPrompt: string) =>
      `Hello, I am ${speakerName}. Let's continue: ${currentPrompt}`
  };
}

