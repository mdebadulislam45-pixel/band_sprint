import React from 'react';
import type { BarnabyMood } from '../../services/barnabyCompanionStore';
import type { BarnabyFacing, BarnabyLocomotionState } from '../../services/barnabyRoamEngine';
import type { BarnabyPoseState } from '../../utils/getBarnabyState';
import type { BarnabyExpression, BarnabyMode } from '../../types/barnaby';
import { BarnabyRig } from '../BarnabyRig';

/**
 * Canonical 10 expressive companion states mapped onto Barnaby's 5 official
 * Eclipse Celestial Familiar poses.
 */
export const BARNABY_AVATAR_STATES = [
  'idle',
  'greeting',
  'listening',
  'thinking',
  'speaking',
  'teaching',
  'celebrating',
  'encouraging',
  'correcting',
  'sleeping'
] as const;

export type BarnabyAvatarState = (typeof BARNABY_AVATAR_STATES)[number];

export interface BarnabyStateMeta {
  label: string;
  ariaStatus: string;
  pose: BarnabyPoseState;
  auraColor: string;
  rimColor: string;
}

export const BARNABY_STATE_META: Record<BarnabyAvatarState, BarnabyStateMeta> = {
  idle: {
    label: 'Ready',
    ariaStatus: 'calm and ready to study',
    pose: 'studying',
    auraColor: 'rgba(19, 78, 65, 0.14)',
    rimColor: '#134E41'
  },
  greeting: {
    label: 'Greeting',
    ariaStatus: 'waving hello warmly',
    pose: 'greeting',
    auraColor: 'rgba(245, 158, 11, 0.18)',
    rimColor: '#F59E0B'
  },
  listening: {
    label: 'Listening',
    ariaStatus: 'listening attentively',
    pose: 'analyzing',
    auraColor: 'rgba(19, 78, 65, 0.18)',
    rimColor: '#134E41'
  },
  thinking: {
    label: 'Analyzing',
    ariaStatus: 'analyzing carefully',
    pose: 'analyzing',
    auraColor: 'rgba(245, 158, 11, 0.16)',
    rimColor: '#F59E0B'
  },
  speaking: {
    label: 'Coaching',
    ariaStatus: 'coaching aloud',
    pose: 'encouraging',
    auraColor: 'rgba(19, 78, 65, 0.18)',
    rimColor: '#134E41'
  },
  teaching: {
    label: 'Studying',
    ariaStatus: 'explaining an IELTS strategy',
    pose: 'studying',
    auraColor: 'rgba(19, 78, 65, 0.16)',
    rimColor: '#134E41'
  },
  celebrating: {
    label: 'Celebrating',
    ariaStatus: 'celebrating verified progress',
    pose: 'celebrating',
    auraColor: 'rgba(245, 158, 11, 0.22)',
    rimColor: '#F59E0B'
  },
  encouraging: {
    label: 'Encouraging',
    ariaStatus: 'offering calm encouragement',
    pose: 'encouraging',
    auraColor: 'rgba(19, 78, 65, 0.16)',
    rimColor: '#134E41'
  },
  correcting: {
    label: 'Analyzing',
    ariaStatus: 'pinpointing a key improvement',
    pose: 'analyzing',
    auraColor: 'rgba(217, 119, 6, 0.18)',
    rimColor: '#D97706'
  },
  sleeping: {
    label: 'Resting',
    ariaStatus: 'taking a brief rest',
    pose: 'studying',
    auraColor: 'rgba(167, 139, 250, 0.16)',
    rimColor: '#A78BFA'
  }
};

export interface BarnabyDragonAvatarProps {
  /** Primary semantic expression state (mapped onto Barnaby's 5 official poses). */
  state?: BarnabyAvatarState;
  /** True when TTS audio is actively playing. */
  isSpeaking?: boolean;
  /** Optional normalized speech openness (0..1) retained for caller compatibility. */
  mouthOpenness?: number;
  /** Pauses subtle animations when needed. */
  paused?: boolean;
  /** Visual size preset. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'dashboard' | 'studio';
  /** Bust vs full preset retained for caller compatibility. */
  variant?: 'bust' | 'full';
  /** Framing preset. */
  framed?: 'circle' | 'rounded' | 'none';
  /** Legacy prop retained for caller compatibility (ignored — no graduation cap). */
  showCap?: boolean;
  /** Optional extra Tailwind classes. */
  className?: string;
  /** Optional test ID override. */
  testId?: string;
  /** Retained for caller compatibility. */
  locomotion?: BarnabyLocomotionState;
  /** Optional horizontal facing direction. */
  facing?: BarnabyFacing;
}

export function mapBarnabyMoodToAvatarState(
  mood: BarnabyMood | string | undefined,
  opts?: {
    isSpeaking?: boolean;
    isListening?: boolean;
    isThinking?: boolean;
    isGreeting?: boolean;
    isTeaching?: boolean;
    isCorrecting?: boolean;
  }
): BarnabyAvatarState {
  if (opts?.isSpeaking) return 'speaking';
  if (opts?.isThinking) return 'thinking';
  if (opts?.isListening) return 'listening';
  if (opts?.isCorrecting) return 'correcting';
  if (opts?.isTeaching) return 'teaching';
  if (opts?.isGreeting) return 'greeting';

  switch (mood) {
    case 'sleepy':
      return 'sleeping';
    case 'thinking':
      return 'thinking';
    case 'curious':
      return 'teaching';
    case 'excited':
    case 'proud':
    case 'cheering':
      return 'celebrating';
    case 'petted':
    case 'eating':
      return 'encouraging';
    case 'playful':
      return 'greeting';
    case 'happy':
    default:
      return 'idle';
  }
}

export function mapMascotMoodToAvatarState(
  mood: string | undefined,
  opts?: { isSpeaking?: boolean }
): BarnabyAvatarState {
  if (opts?.isSpeaking || mood === 'speaking') return 'speaking';
  switch (mood) {
    case 'listening':
      return 'listening';
    case 'thinking':
      return 'thinking';
    case 'celebrating':
      return 'celebrating';
    case 'motivating':
      return 'encouraging';
    case 'surprise':
      return 'correcting';
    case 'idle':
    default:
      return 'idle';
  }
}

export function mapExaminerStateToAvatarState(
  conversationalState: string | undefined,
  opts?: { isSpeaking?: boolean; expression?: string }
): BarnabyAvatarState {
  if (opts?.isSpeaking || conversationalState === 'speaking') return 'speaking';
  if (
    opts?.expression === 'thinking' ||
    conversationalState === 'processing' ||
    conversationalState === 'loading'
  ) {
    return 'thinking';
  }
  switch (conversationalState) {
    case 'listening':
      return 'listening';
    case 'completed':
      return 'celebrating';
    case 'transitioning':
      return 'encouraging';
    case 'error':
      return 'correcting';
    case 'paused':
      return 'sleeping';
    case 'idle':
    default:
      if (opts?.expression === 'encouraging') return 'encouraging';
      if (opts?.expression === 'cheerful' || opts?.expression === 'excited') return 'greeting';
      return 'idle';
  }
}

const SIZE_CLASSES: Record<NonNullable<BarnabyDragonAvatarProps['size']>, string> = {
  xs: 'w-8 h-8',
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
  dashboard: 'w-[144px] h-[144px] sm:w-[168px] sm:h-[168px]',
  studio: 'w-full h-full max-w-[240px] sm:max-w-[270px]'
};

const FRAME_CLASSES: Record<NonNullable<BarnabyDragonAvatarProps['framed']>, string> = {
  circle: 'rounded-full overflow-visible bg-[#F8FAF9] dark:bg-[#10201E] border border-[#134E41]/20 p-1',
  rounded: 'rounded-2xl overflow-visible bg-[#F8FAF9] dark:bg-[#10201E] border border-[#134E41]/20 p-1',
  none: 'overflow-visible'
};

function mapAvatarStateToExpression(state: BarnabyAvatarState): BarnabyExpression {
  switch (state) {
    case 'greeting':
      return 'welcoming';
    case 'listening':
      return 'listening';
    case 'thinking':
      return 'analytical';
    case 'speaking':
      return 'encouraging';
    case 'teaching':
      return 'focused';
    case 'celebrating':
      return 'celebrating';
    case 'encouraging':
      return 'encouraging';
    case 'correcting':
      return 'curious';
    case 'sleeping':
      return 'sleepy';
    case 'idle':
    default:
      return 'neutral';
  }
}

/**
 * BarnabyDragonAvatar — Legacy-Compatible Wrapper Rendering the Articulated 2D Vector <BarnabyRig />
 *
 * Replaces all static PNGs and legacy dragon artwork with Barnaby's self-contained
 * spring-damper 2D vector character rig while preserving exported prop types and helpers.
 */
export const BarnabyDragonAvatar: React.FC<BarnabyDragonAvatarProps> = ({
  state = 'idle',
  isSpeaking = false,
  paused = false,
  size = 'md',
  variant = 'bust',
  framed = 'rounded',
  className = '',
  testId = 'barnaby-avatar',
  locomotion = 'perched',
  facing = 'right'
}) => {
  const resolvedState: BarnabyAvatarState = isSpeaking
    ? 'speaking'
    : state === 'speaking'
    ? 'idle'
    : state;
  const meta = BARNABY_STATE_META[resolvedState] || BARNABY_STATE_META.idle;
  const expression = mapAvatarStateToExpression(resolvedState);
  const mode: BarnabyMode =
    resolvedState === 'celebrating'
      ? 'celebration'
      : resolvedState === 'teaching' || resolvedState === 'correcting'
      ? 'tutor'
      : 'ambient';

  return (
    <div
      data-testid={testId}
      data-character="barnaby-celestial-companion"
      data-pose={meta.pose}
      data-variant={variant}
      data-avatar-state={resolvedState}
      data-locomotion={locomotion}
      data-facing={facing}
      data-is-speaking={isSpeaking && !paused ? 'true' : 'false'}
      data-paused={paused ? 'true' : 'false'}
      role="img"
      aria-label={`Barnaby — ${meta.ariaStatus}`}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${SIZE_CLASSES[size]} ${FRAME_CLASSES[framed]} ${className}`}
    >
      <div className={`w-full h-full ${facing === 'left' ? '-scale-x-100' : ''}`}>
        <BarnabyRig
          expression={expression}
          mode={mode}
          animationState={
            resolvedState === 'celebrating'
              ? 'celebratory'
              : resolvedState === 'sleeping'
              ? 'sleeping'
              : resolvedState === 'speaking'
              ? 'speaking'
              : resolvedState === 'thinking' || resolvedState === 'teaching'
              ? 'focused'
              : 'idle'
          }
          isSpeaking={isSpeaking && !paused}
          interactive={!paused}
          testId={`${testId}-rig`}
        />
      </div>
    </div>
  );
};
