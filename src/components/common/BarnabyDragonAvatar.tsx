import React, { useId } from 'react';
import type { BarnabyMood } from '../../services/barnabyCompanionStore';

/**
 * Canonical 10 expressive companion states for Barnaby (BandSprint's sky-blue baby dragon).
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
  headTiltDeg: number;
  eyeShiftX: number;
  eyeShiftY: number;
  auraColor: string;
  rimColor: string;
}

export const BARNABY_STATE_META: Record<BarnabyAvatarState, BarnabyStateMeta> = {
  idle: {
    label: 'Ready',
    ariaStatus: 'calm and ready',
    headTiltDeg: 0,
    eyeShiftX: 0,
    eyeShiftY: 0,
    auraColor: 'rgba(86, 180, 233, 0.22)',
    rimColor: '#38BDF8'
  },
  greeting: {
    label: 'Greeting',
    ariaStatus: 'waving hello warmly',
    headTiltDeg: -4,
    eyeShiftX: 0,
    eyeShiftY: -0.6,
    auraColor: 'rgba(244, 166, 42, 0.24)',
    rimColor: '#F4A62A'
  },
  listening: {
    label: 'Listening',
    ariaStatus: 'listening attentively',
    headTiltDeg: 5,
    eyeShiftX: 0.8,
    eyeShiftY: 0.2,
    auraColor: 'rgba(31, 138, 112, 0.26)',
    rimColor: '#1F8A70'
  },
  thinking: {
    label: 'Thinking',
    ariaStatus: 'thinking carefully',
    headTiltDeg: -5,
    eyeShiftX: 2.2,
    eyeShiftY: -2.0,
    auraColor: 'rgba(244, 166, 42, 0.22)',
    rimColor: '#F4A62A'
  },
  speaking: {
    label: 'Speaking',
    ariaStatus: 'speaking aloud',
    headTiltDeg: 1.5,
    eyeShiftX: 0,
    eyeShiftY: 0,
    auraColor: 'rgba(56, 189, 248, 0.28)',
    rimColor: '#38BDF8'
  },
  teaching: {
    label: 'Teaching',
    ariaStatus: 'explaining an IELTS strategy',
    headTiltDeg: -2,
    eyeShiftX: 0.4,
    eyeShiftY: -0.5,
    auraColor: 'rgba(15, 76, 69, 0.24)',
    rimColor: '#1F8A70'
  },
  celebrating: {
    label: 'Celebrating',
    ariaStatus: 'celebrating progress',
    headTiltDeg: 3.5,
    eyeShiftX: 0,
    eyeShiftY: -1,
    auraColor: 'rgba(244, 166, 42, 0.30)',
    rimColor: '#F4A62A'
  },
  encouraging: {
    label: 'Encouraging',
    ariaStatus: 'offering warm encouragement',
    headTiltDeg: 2.5,
    eyeShiftX: 0,
    eyeShiftY: 0.4,
    auraColor: 'rgba(31, 138, 112, 0.24)',
    rimColor: '#1F8A70'
  },
  correcting: {
    label: 'Correcting',
    ariaStatus: 'pointing out a key improvement',
    headTiltDeg: -3.5,
    eyeShiftX: -0.6,
    eyeShiftY: 0.4,
    auraColor: 'rgba(217, 119, 6, 0.25)',
    rimColor: '#D97706'
  },
  sleeping: {
    label: 'Resting',
    ariaStatus: 'taking a quiet nap',
    headTiltDeg: 4,
    eyeShiftX: 0,
    eyeShiftY: 1,
    auraColor: 'rgba(148, 163, 184, 0.18)',
    rimColor: '#94A3B8'
  }
};

export interface BarnabyDragonAvatarProps {
  /** Primary semantic expression state (all 10 states supported). */
  state?: BarnabyAvatarState;
  /**
   * True ONLY when real TTS audio is actively playing.
   * Mouth speech animation is strictly gated on this flag.
   */
  isSpeaking?: boolean;
  /** Optional normalized speech openness (0..1) from an audio analyzer or adapter. */
  mouthOpenness?: number;
  /** Pauses autonomous CSS animations (used during active exams / live demonstrations). */
  paused?: boolean;
  /** Visual size preset or full-container studio mode. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'dashboard' | 'studio';
  /** Bust portrait (default for compact circular badges) vs unclipped full-body dragon silhouette. */
  variant?: 'bust' | 'full';
  /** Circular framing (floating launcher) vs rounded portrait/open stage. */
  framed?: 'circle' | 'rounded' | 'none';
  /** Optional subtle graduation cap toggle (defaults true to match canonical artwork). */
  showCap?: boolean;
  /** Optional extra Tailwind classes. */
  className?: string;
  /** Optional test ID override. */
  testId?: string;
}

/**
 * Maps BarnabyCompanionStore mood + live runtime flags into one of the 10 canonical avatar states.
 */
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

/**
 * Maps legacy MascotMood (ContextualAITutor / ChubbyMascotAvatar) into one of the 10 canonical states.
 */
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

/**
 * Maps Speaking Studio conversational state into one of the 10 canonical states.
 */
export function mapExaminerStateToAvatarState(
  conversationalState: string | undefined,
  opts?: { isSpeaking?: boolean; expression?: string }
): BarnabyAvatarState {
  if (opts?.isSpeaking || conversationalState === 'speaking') return 'speaking';
  if (opts?.expression === 'thinking' || conversationalState === 'processing' || conversationalState === 'loading') {
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
  dashboard: 'w-[144px] h-[156px] sm:w-[178px] sm:h-[194px] md:w-[192px] md:h-[210px]',
  studio: 'w-full h-full max-w-[270px] sm:max-w-[310px]'
};

const FRAME_CLASSES: Record<NonNullable<BarnabyDragonAvatarProps['framed']>, string> = {
  circle: 'rounded-full overflow-hidden bg-gradient-to-b from-[#D7EEFC] via-[#BEE3FA] to-[#9CD2F5]',
  rounded: 'rounded-2xl overflow-hidden bg-gradient-to-b from-[#D7EEFC] via-[#BEE3FA] to-[#9CD2F5]',
  none: ''
};

/**
 * BarnabyDragonAvatar — Unified, Lightweight 2.5D Animated Dragon Companion
 *
 * Preserves BandSprint's canonical sky-blue baby dragon character across FloatingBarnaby,
 * AITutorWidget, ContextualAITutor, and Speaking Studio:
 * - Sky-blue scales with 2.5D layered depth gradients and cream muzzle/belly
 * - Three ribbed golden horns & sky-blue side ear frills
 * - Oversized navy-blue round glasses with animated specular lens glint
 * - Navy graduation cap with swaying golden tassel & navy BandSprint hoodie
 * - Articulated blue wings with golden filigree membranes & curled spiked tail
 * - 10 expressive states with natural blinking, breathing, head tilt, eye tracking, and
 *   mouth articulation strictly bound to actual TTS playback (`isSpeaking === true`)
 * - GPU-composited CSS (`transform`/`opacity`) only; honors `paused` and `prefers-reduced-motion`
 */
export const BarnabyDragonAvatar: React.FC<BarnabyDragonAvatarProps> = ({
  state = 'idle',
  isSpeaking = false,
  mouthOpenness = 0,
  paused = false,
  size = 'md',
  variant = 'bust',
  framed = 'none',
  showCap = true,
  className = '',
  testId = 'barnaby-dragon-avatar'
}) => {
  const uid = useId().replace(/:/g, '');
  const isFullBody = variant === 'full';
  // Effective state promotes to speaking ONLY when actual audio is speaking;
  // conversely, mouth speech animation NEVER runs unless `isSpeaking === true`.
  const resolvedState: BarnabyAvatarState = isSpeaking ? 'speaking' : state === 'speaking' ? 'idle' : state;
  const meta = BARNABY_STATE_META[resolvedState] || BARNABY_STATE_META.idle;
  const isActivelySpeakingMouth = Boolean(isSpeaking && !paused);

  const isSleeping = resolvedState === 'sleeping';
  const isCelebrating = resolvedState === 'celebrating';
  const isGreeting = resolvedState === 'greeting';
  const isThinking = resolvedState === 'thinking';
  const isTeaching = resolvedState === 'teaching';
  const isEncouraging = resolvedState === 'encouraging';
  const isCorrecting = resolvedState === 'correcting';
  const isListening = resolvedState === 'listening';

  // Clamp optional audio analyzer mouth amplitude for live TTS sync
  const clampedMouthOpen = Math.max(0, Math.min(1, Number.isFinite(mouthOpenness) ? mouthOpenness : 0));
  const useAmplitudeMouth = isActivelySpeakingMouth && clampedMouthOpen > 0.08;

  const headTransform = paused
    ? undefined
    : `rotate(${meta.headTiltDeg}deg)`;

  const leftWingAnimClass = paused
    ? ''
    : isGreeting || isTeaching
    ? 'barnaby-rig-wing-wave'
    : isCelebrating
    ? 'barnaby-rig-wing-celebrate-left'
    : isSleeping
    ? ''
    : 'barnaby-rig-wing-left';

  const rightWingAnimClass = paused
    ? ''
    : isCelebrating
    ? 'barnaby-rig-wing-celebrate-right'
    : isSleeping
    ? ''
    : 'barnaby-rig-wing-right';

  const tailAnimClass = paused
    ? ''
    : isCelebrating || isGreeting
    ? 'barnaby-rig-tail-fast'
    : isSleeping
    ? ''
    : 'barnaby-rig-tail';

  const bodyAnimClass = paused
    ? ''
    : isSleeping
    ? 'barnaby-rig-breathe-slow'
    : isEncouraging
    ? 'barnaby-rig-nod'
    : 'barnaby-rig-breathe';

  const eyeShiftX = paused ? 0 : meta.eyeShiftX;
  const eyeShiftY = paused ? 0 : meta.eyeShiftY;

  return (
    <div
      data-testid={testId}
      data-character="barnaby-dragon"
      data-variant={variant}
      data-avatar-state={resolvedState}
      data-is-speaking={isActivelySpeakingMouth ? 'true' : 'false'}
      data-paused={paused ? 'true' : 'false'}
      role="img"
      aria-label={`Barnaby the blue dragon — ${meta.ariaStatus}`}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${SIZE_CLASSES[size]} ${FRAME_CLASSES[framed]} ${
        paused ? 'barnaby-anim-paused' : ''
      } ${className}`}
    >
      <svg
        viewBox={isFullBody ? '-18 6 244 256' : '0 0 200 200'}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* 2.5D Sky-Blue Dragon Head & Scales Gradient */}
          <radialGradient id={`${uid}-blueHead`} cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#9ED9FB" />
            <stop offset="52%" stopColor="#66BCEF" />
            <stop offset="88%" stopColor="#3B9AD9" />
            <stop offset="100%" stopColor="#2679B5" />
          </radialGradient>

          {/* Deeper Sky-Blue for Wings, Tail & Shadow Side */}
          <linearGradient id={`${uid}-blueDeep`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6EC0F2" />
            <stop offset="55%" stopColor="#3D98D4" />
            <stop offset="100%" stopColor="#1E6A9E" />
          </linearGradient>

          {/* Fluffy Warm Cream Muzzle & Belly Gradient */}
          <radialGradient id={`${uid}-cream`} cx="50%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#FFFDF7" />
            <stop offset="68%" stopColor="#FBF3E0" />
            <stop offset="100%" stopColor="#E9D9BC" />
          </radialGradient>

          {/* Ribbed Golden Horns, Spikes & Wing Filigree */}
          <linearGradient id={`${uid}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="48%" stopColor="#F5B731" />
            <stop offset="100%" stopColor="#C47D12" />
          </linearGradient>

          {/* Navy BandSprint Hoodie Gradient */}
          <linearGradient id={`${uid}-hoodie`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#27437A" />
            <stop offset="52%" stopColor="#1A2F59" />
            <stop offset="100%" stopColor="#0F1E3D" />
          </linearGradient>

          {/* Navy Graduation Cap Gradient */}
          <linearGradient id={`${uid}-cap`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2B406E" />
            <stop offset="60%" stopColor="#1A294D" />
            <stop offset="100%" stopColor="#0F1933" />
          </linearGradient>

          {/* Expressive Chestnut-Amber Dragon Eyes */}
          <radialGradient id={`${uid}-iris`} cx="45%" cy="40%" r="58%">
            <stop offset="0%" stopColor="#9A4E1C" />
            <stop offset="65%" stopColor="#5C280B" />
            <stop offset="100%" stopColor="#2B1004" />
          </radialGradient>

          {/* Soft Rosy Cheek Warmth */}
          <radialGradient id={`${uid}-blush`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FB7185" stopOpacity="0.42" />
            <stop offset="70%" stopColor="#FDA4AF" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#FDA4AF" stopOpacity="0" />
          </radialGradient>

          {/* Glasses Lens Tint */}
          <linearGradient id={`${uid}-lens`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.34" />
            <stop offset="50%" stopColor="#E0F2FE" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.14" />
          </linearGradient>
        </defs>

        {/* Subtle Ambient 2.5D Depth Aura */}
        {isFullBody ? (
          <g>
            <ellipse cx="102" cy="134" rx="96" ry="112" fill={meta.auraColor} opacity="0.68" />
            {/* Soft Ground Contact Shadow Under Dragon Feet */}
            <ellipse cx="100" cy="245" rx="64" ry="9" fill="#0F4C45" opacity="0.16" />
            <ellipse cx="100" cy="245" rx="44" ry="5" fill="#0F4C45" opacity="0.12" />
          </g>
        ) : (
          <circle cx="100" cy="108" r="82" fill={meta.auraColor} />
        )}

        {/* Listening Acoustic Waves */}
        {isListening && (
          <g opacity="0.72" stroke={meta.rimColor} strokeWidth="2.4" strokeLinecap="round">
            <path d="M 24 88 Q 16 100 24 112" />
            <path d="M 16 80 Q 6 100 16 120" opacity="0.5" />
            <path d="M 176 88 Q 184 100 176 112" />
            <path d="M 184 80 Q 194 100 184 120" opacity="0.5" />
          </g>
        )}

        {/* ================= WHOLE DRAGON BODY RIG (Breathing / Nodding) ================= */}
        <g className={bodyAnimClass} data-anatomy={isFullBody ? 'full-body' : 'bust'}>
          {/* 1. Expressive Curled Dragon Tail with Golden Spikes (Right Side) */}
          <g className={tailAnimClass} data-anatomy-part="tail">
            {isFullBody ? (
              <>
                <path
                  d="M 134 188 C 170 194 198 176 196 144 C 195 130 184 127 179 136 C 175 150 162 166 138 172 Z"
                  fill={`url(#${uid}-blueDeep)`}
                  stroke="#1E5D8A"
                  strokeWidth="2.1"
                  strokeLinejoin="round"
                />
                <path
                  d="M 142 183 C 169 185 188 170 189 147"
                  stroke="#FBF3E0"
                  strokeWidth="3.6"
                  strokeLinecap="round"
                  opacity="0.76"
                />
                <path d="M 162 175 L 176 172 L 169 183 Z" fill={`url(#${uid}-gold)`} stroke="#9A5E08" strokeWidth="1.2" />
                <path d="M 178 164 L 194 162 L 185 173 Z" fill={`url(#${uid}-gold)`} stroke="#9A5E08" strokeWidth="1.2" />
                <path d="M 186 150 L 201 146 L 193 158 Z" fill={`url(#${uid}-gold)`} stroke="#9A5E08" strokeWidth="1.2" />
                <path d="M 184 136 L 196 129 L 191 142 Z" fill={`url(#${uid}-gold)`} stroke="#9A5E08" strokeWidth="1.2" />
              </>
            ) : (
              <>
                <path
                  d="M 140 164 C 166 164 182 146 177 120 C 175 112 167 110 164 118 C 162 132 152 142 138 148 Z"
                  fill={`url(#${uid}-blueDeep)`}
                  stroke="#1E5D8A"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                {/* Cream underside ridge of tail */}
                <path
                  d="M 146 158 C 164 156 174 143 172 126"
                  stroke="#FBF3E0"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  opacity="0.7"
                />
                {/* Three Golden Tail Spikes */}
                <path d="M 164 149 L 176 144 L 171 155 Z" fill={`url(#${uid}-gold)`} stroke="#9A5E08" strokeWidth="1.2" />
                <path d="M 169 135 L 182 131 L 175 142 Z" fill={`url(#${uid}-gold)`} stroke="#9A5E08" strokeWidth="1.2" />
                <path d="M 168 122 L 179 116 L 174 127 Z" fill={`url(#${uid}-gold)`} stroke="#9A5E08" strokeWidth="1.2" />
              </>
            )}
          </g>

          {/* 2. Articulated Dragon Wings with Golden Filigree Membranes */}
          {/* Left Wing (Waves warmly in greeting / teaching) */}
          <g className={leftWingAnimClass}>
            {isGreeting || isTeaching ? (
              /* Raised Waving / Presenting Wing with Gold Filigree */
              <g transform="translate(-4, -18) rotate(-14 54 128)">
                <path
                  d="M 56 132 C 36 122 20 108 18 86 C 34 88 46 94 56 106 C 52 114 53 124 56 132 Z"
                  fill={`url(#${uid}-blueDeep)`}
                  stroke="#1B5580"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M 52 125 C 38 117 28 106 25 92 C 36 94 45 99 52 108 Z"
                  fill={`url(#${uid}-gold)`}
                  opacity="0.92"
                />
                <path
                  d="M 50 120 L 32 103 M 51 114 L 38 97"
                  stroke="#9A5E08"
                  strokeWidth="1.2"
                  opacity="0.75"
                />
              </g>
            ) : (
              /* Resting / Fluttering Left Wing */
              <g>
                <path
                  d="M 56 136 C 32 132 18 118 20 98 C 35 102 46 110 58 122 Z"
                  fill={`url(#${uid}-blueDeep)`}
                  stroke="#1B5580"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M 52 130 C 36 126 27 116 26 104 C 36 107 45 113 53 122 Z"
                  fill={`url(#${uid}-gold)`}
                  opacity="0.88"
                />
              </g>
            )}
          </g>

          {/* Right Wing */}
          <g className={rightWingAnimClass}>
            <path
              d="M 144 136 C 166 131 178 119 177 101 C 163 105 153 113 142 123 Z"
              fill={`url(#${uid}-blueDeep)`}
              stroke="#1B5580"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M 147 130 C 162 126 170 117 171 106 C 161 109 154 114 146 123 Z"
              fill={`url(#${uid}-gold)`}
              opacity="0.85"
            />
          </g>

          {/* 2.5 Full-Body Legs & Feet (Rendered behind hoodie hem when variant="full") */}
          {isFullBody && (
            <g data-anatomy-part="legs-and-feet">
              {/* Left Sky-Blue Dragon Leg & 3-Toed Clawed Foot */}
              <g>
                <path
                  d="M 59 190 C 55 204 58 218 62 229 L 85 229 C 87 216 88 202 88 190 Z"
                  fill={`url(#${uid}-blueDeep)`}
                  stroke="#1B5580"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                {/* Soft inner thigh 2.5D highlight */}
                <path
                  d="M 65 196 C 64 206 65 215 67 223"
                  stroke="#9ED9FB"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.45"
                />
                {/* Plump Left Dragon Foot */}
                <path
                  d="M 50 237 C 49 226 60 221 74 223 C 86 225 91 232 88 240 C 85 245 53 245 50 237 Z"
                  fill={`url(#${uid}-blueHead)`}
                  stroke="#1B5580"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                {/* Foot Cream Toe Claws (3 toes) */}
                <path d="M 53 238 C 47 239 47 244 54 243 Z" fill={`url(#${uid}-cream)`} stroke="#9A6E38" strokeWidth="1.2" />
                <path d="M 63 241 C 59 245 64 247 68 242 Z" fill={`url(#${uid}-cream)`} stroke="#9A6E38" strokeWidth="1.2" />
                <path d="M 75 240 C 74 245 80 246 82 240 Z" fill={`url(#${uid}-cream)`} stroke="#9A6E38" strokeWidth="1.2" />
              </g>

              {/* Right Sky-Blue Dragon Leg & 3-Toed Clawed Foot */}
              <g>
                <path
                  d="M 112 190 C 112 202 113 216 115 229 L 138 229 C 142 218 145 204 141 190 Z"
                  fill={`url(#${uid}-blueDeep)`}
                  stroke="#1B5580"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M 135 196 C 136 206 135 215 133 223"
                  stroke="#9ED9FB"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.45"
                />
                {/* Plump Right Dragon Foot */}
                <path
                  d="M 112 240 C 109 232 114 225 126 223 C 140 221 151 226 150 237 C 147 245 115 245 112 240 Z"
                  fill={`url(#${uid}-blueHead)`}
                  stroke="#1B5580"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                {/* Foot Cream Toe Claws (3 toes) */}
                <path d="M 118 240 C 120 246 126 245 125 240 Z" fill={`url(#${uid}-cream)`} stroke="#9A6E38" strokeWidth="1.2" />
                <path d="M 132 242 C 136 247 141 245 137 241 Z" fill={`url(#${uid}-cream)`} stroke="#9A6E38" strokeWidth="1.2" />
                <path d="M 146 243 C 153 244 153 239 147 238 Z" fill={`url(#${uid}-cream)`} stroke="#9A6E38" strokeWidth="1.2" />
              </g>
            </g>
          )}

          {/* 3. Navy-Blue BandSprint Hoodie & Cream Dragon Belly */}
          <g data-anatomy-part="hoodie-and-belly">
            {/* Hoodie Collar / Back Hood Fold */}
            <path
              d="M 56 134 C 66 122 134 122 144 134 C 150 142 144 152 136 150 L 64 150 C 56 152 50 142 56 134 Z"
              fill="#15264B"
              stroke="#0D1933"
              strokeWidth="1.8"
            />

            {/* Main Hoodie Torso */}
            <path
              d={
                isFullBody
                  ? 'M 47 195 C 47 152 64 136 100 136 C 136 136 153 152 153 195 C 142 201 58 201 47 195 Z'
                  : 'M 46 194 C 48 152 64 136 100 136 C 136 136 152 152 154 194 Z'
              }
              fill={`url(#${uid}-hoodie)`}
              stroke="#0F1C38"
              strokeWidth="2.2"
            />

            {/* Open Zip Hoodie Center Showing Fluffy Cream Belly */}
            <path
              d={
                isFullBody
                  ? 'M 78 140 C 86 137 114 137 122 140 C 128 156 128 178 124 198 Q 100 204 76 198 C 72 178 72 156 78 140 Z'
                  : 'M 78 140 C 86 137 114 137 122 140 C 127 156 128 176 124 194 L 76 194 C 72 176 73 156 78 140 Z'
              }
              fill={`url(#${uid}-cream)`}
            />
            {/* Subtle Belly Plastron Lines for 2.5D Depth */}
            <path
              d="M 85 162 Q 100 166 115 162 M 84 176 Q 100 180 116 176 M 85 189 Q 100 193 115 189"
              stroke="#DFCDA8"
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity="0.72"
            />

            {/* Hoodie Zip Borders, Ribbed Hem & Drawstrings */}
            <path
              d="M 78 140 C 74 156 73 175 76 197 M 122 140 C 126 156 127 175 124 197"
              stroke="#0E1B36"
              strokeWidth="2.2"
            />
            {isFullBody && (
              <path
                d="M 48 190 Q 62 194 75 193 M 125 193 Q 138 194 152 190"
                stroke="#3B5B9A"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.75"
              />
            )}
            <path
              d="M 73 144 L 71 168 M 127 144 L 129 168"
              stroke="#3B5B9A"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <circle cx="71" cy="170" r="2.2" fill="#F5B731" />
            <circle cx="129" cy="170" r="2.2" fill="#F5B731" />

            {/* Gold & Pine BandSprint Crest Pin + Wordmark on Hoodie Chest */}
            <circle cx="136" cy="158" r="4.8" fill="#0F4C45" stroke="#F4A62A" strokeWidth="1.3" />
            <path d="M 134 158 L 135.5 159.6 L 138.4 156.4" stroke="#FDE68A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            {isFullBody && (
              <text
                x="136"
                y="169"
                textAnchor="middle"
                fill="#FDE68A"
                fontSize="4.1"
                fontWeight="700"
                fontFamily="sans-serif"
                letterSpacing="0.15"
              >
                BandSprint
              </text>
            )}

            {/* Full-Body Hoodie Sleeves & Cute Dragon Paws */}
            {isFullBody && (
              <g data-anatomy-part="arms-and-paws">
                {/* Left Sleeve + Paw (Raised warmly when greeting/teaching, relaxed at side otherwise) */}
                {isGreeting || isTeaching ? (
                  <g transform="translate(-4, -4) rotate(-24 52 152)">
                    <path
                      d="M 55 144 C 41 146 31 153 28 162 C 33 168 44 168 53 161 Z"
                      fill={`url(#${uid}-hoodie)`}
                      stroke="#0F1C38"
                      strokeWidth="1.8"
                    />
                    <ellipse cx="26" cy="161" rx="7.5" ry="6.5" fill={`url(#${uid}-blueHead)`} stroke="#1D5C8A" strokeWidth="1.5" />
                    <circle cx="20" cy="157" r="2.2" fill="#7ACAF7" stroke="#1D5C8A" strokeWidth="1" />
                    <circle cx="24" cy="154" r="2.4" fill="#7ACAF7" stroke="#1D5C8A" strokeWidth="1" />
                    <circle cx="29" cy="155" r="2.2" fill="#7ACAF7" stroke="#1D5C8A" strokeWidth="1" />
                  </g>
                ) : (
                  <g>
                    <path
                      d="M 54 146 C 41 154 38 168 41 178 C 47 181 55 178 57 167 Z"
                      fill={`url(#${uid}-hoodie)`}
                      stroke="#0F1C38"
                      strokeWidth="1.8"
                    />
                    <ellipse cx="44" cy="181" rx="7" ry="6" fill={`url(#${uid}-blueHead)`} stroke="#1D5C8A" strokeWidth="1.5" />
                  </g>
                )}

                {/* Right Sleeve + Paw */}
                <g>
                  <path
                    d="M 146 146 C 159 154 162 168 159 178 C 153 181 145 178 143 167 Z"
                    fill={`url(#${uid}-hoodie)`}
                    stroke="#0F1C38"
                    strokeWidth="1.8"
                  />
                  <ellipse cx="156" cy="181" rx="7" ry="6" fill={`url(#${uid}-blueHead)`} stroke="#1D5C8A" strokeWidth="1.5" />
                </g>
              </g>
            )}

            {/* Cute Blue Dragon Paw Accent in Bust Greeting Mode */}
            {!isFullBody && isGreeting && (
              <g transform="translate(36, 126) rotate(-18)">
                <ellipse cx="10" cy="12" rx="9" ry="8" fill={`url(#${uid}-blueHead)`} stroke="#1D5C8A" strokeWidth="1.6" />
                <circle cx="4" cy="6" r="2.8" fill="#7ACAF7" stroke="#1D5C8A" strokeWidth="1.2" />
                <circle cx="10" cy="4" r="3" fill="#7ACAF7" stroke="#1D5C8A" strokeWidth="1.2" />
                <circle cx="16" cy="6" r="2.8" fill="#7ACAF7" stroke="#1D5C8A" strokeWidth="1.2" />
              </g>
            )}
          </g>

          {/* ================= 4. EXPRESSIVE DRAGON HEAD GROUP (Tilt-Responsive) ================= */}
          <g
            style={{
              transform: headTransform,
              transformOrigin: '100px 96px',
              transition: 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)'
            }}
          >
            {/* Sky-Blue Dragon Side Ear Frills / Cheek Fins */}
            <g>
              <path
                d="M 48 86 C 36 81 33 91 42 96 C 34 99 35 108 46 106 Z"
                fill={`url(#${uid}-blueDeep)`}
                stroke="#1E6394"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M 152 86 C 164 81 167 91 158 96 C 166 99 165 108 154 106 Z"
                fill={`url(#${uid}-blueDeep)`}
                stroke="#1E6394"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </g>

            {/* Two Ribbed Golden Side Horns */}
            <g>
              <path
                d="M 65 56 C 58 44 60 34 69 36 C 74 37 77 45 78 54 Z"
                fill={`url(#${uid}-gold)`}
                stroke="#9E620C"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M 63 46 Q 69 44 74 47 M 65 41 Q 70 39 73 42" stroke="#B47211" strokeWidth="1.2" strokeLinecap="round" />

              <path
                d="M 135 56 C 142 44 140 34 131 36 C 126 37 123 45 122 54 Z"
                fill={`url(#${uid}-gold)`}
                stroke="#9E620C"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M 137 46 Q 131 44 126 47 M 135 41 Q 130 39 127 42" stroke="#B47211" strokeWidth="1.2" strokeLinecap="round" />
            </g>

            {/* Plump 2.5D Sky-Blue Baby Dragon Head */}
            <path
              d="M 48 92 C 46 58 70 46 100 46 C 130 46 154 58 152 92 C 154 122 135 142 100 142 C 65 142 46 122 48 92 Z"
              fill={`url(#${uid}-blueHead)`}
              stroke="#206698"
              strokeWidth="2"
            />

            {/* Soft Top Head Specular Highlight for 2.5D Volume */}
            <ellipse cx="92" cy="59" rx="22" ry="8" fill="#FFFFFF" opacity="0.22" />

            {/* Fluffy Cream Dragon Muzzle & Plump Cheeks */}
            <path
              d="M 53 103 C 54 90 73 88 100 88 C 127 88 146 90 147 103 C 148 124 132 140 100 140 C 68 140 52 124 53 103 Z"
              fill={`url(#${uid}-cream)`}
            />

            {/* Warm Cheek Blush */}
            <ellipse cx="66" cy="111" rx="11" ry="6.5" fill={`url(#${uid}-blush)`} />
            <ellipse cx="134" cy="111" rx="11" ry="6.5" fill={`url(#${uid}-blush)`} />

            {/* Small Central Golden Forehead Horn */}
            <path
              d="M 94 56 C 95 43 105 43 106 56 C 103 58 97 58 94 56 Z"
              fill={`url(#${uid}-gold)`}
              stroke="#9E620C"
              strokeWidth="1.5"
            />
            <path d="M 96 51 Q 100 49 104 51" stroke="#B47211" strokeWidth="1.1" strokeLinecap="round" />

            {/* Navy Graduation Cap (Mortarboard) with Swaying Golden Tassel */}
            {showCap && (
              <g>
                {/* Cap Crown */}
                <path
                  d="M 74 49 L 76 34 C 86 30 114 30 124 34 L 126 49 C 114 45 86 45 74 49 Z"
                  fill={`url(#${uid}-cap)`}
                  stroke="#0C152B"
                  strokeWidth="1.6"
                />
                {/* Mortarboard Flat Diamond Top */}
                <polygon
                  points="100,14 152,33 100,45 48,33"
                  fill={`url(#${uid}-cap)`}
                  stroke="#0C152B"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                {/* Top Edge Rim Highlight */}
                <path d="M 55 32 L 100 17 L 145 32" stroke="#5372B0" strokeWidth="1.3" opacity="0.65" />
                {/* Cap Center Button + Tassel Cord */}
                <circle cx="100" cy="30" r="2.5" fill="#F5B731" />
                <path d="M 100 30 Q 126 32 146 39" stroke="#F5B731" strokeWidth="2.2" strokeLinecap="round" />
                {/* Swaying Golden Tassel */}
                <g className={paused || isSleeping ? '' : 'barnaby-rig-tassel'}>
                  <line x1="146" y1="39" x2="146" y2="54" stroke="#F5B731" strokeWidth="2.4" strokeLinecap="round" />
                  <circle cx="146" cy="54" r="3" fill="#D98B14" />
                  <path d="M 142 56 L 150 56 L 152 68 L 140 68 Z" fill={`url(#${uid}-gold)`} stroke="#9E620C" strokeWidth="1.1" />
                </g>
              </g>
            )}

            {/* Expressive Dark-Navy Eyebrows */}
            <path
              d={
                isThinking
                  ? 'M 68 68 Q 79 64 89 69'
                  : isCorrecting
                  ? 'M 68 66 Q 79 70 89 68'
                  : isCelebrating || isGreeting
                  ? 'M 67 65 Q 78 59 89 65'
                  : isSleeping
                  ? 'M 69 72 Q 79 70 88 72'
                  : 'M 68 67 Q 79 62 89 67'
              }
              stroke="#192A4D"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path
              d={
                isThinking
                  ? 'M 111 65 Q 121 59 132 65'
                  : isCorrecting
                  ? 'M 111 68 Q 121 63 132 66'
                  : isCelebrating || isGreeting
                  ? 'M 111 65 Q 122 59 133 65'
                  : isSleeping
                  ? 'M 112 72 Q 121 70 131 72'
                  : 'M 111 67 Q 121 62 132 67'
              }
              stroke="#192A4D"
              strokeWidth="3.2"
              strokeLinecap="round"
            />

            {/* Expressive Eyes (Natural CSS Blink / Joyful Arches / Peaceful Closed in Sleep) */}
            {isSleeping ? (
              <g data-eye-state="sleeping">
                <path d="M 67 89 Q 79 96 91 89" stroke="#192A4D" strokeWidth="3.4" strokeLinecap="round" />
                <path d="M 109 89 Q 121 96 133 89" stroke="#192A4D" strokeWidth="3.4" strokeLinecap="round" />
              </g>
            ) : isCelebrating ? (
              <g data-eye-state="celebrating">
                <path d="M 67 90 Q 79 78 91 90" stroke="#1E293B" strokeWidth="3.8" strokeLinecap="round" />
                <path d="M 109 90 Q 121 78 133 90" stroke="#1E293B" strokeWidth="3.8" strokeLinecap="round" />
              </g>
            ) : (
              <g className={paused ? '' : 'barnaby-rig-blink'} data-eye-state="open">
                {/* Sclera */}
                <ellipse cx="79" cy="87" rx="12.5" ry="13.2" fill="#FFFFFF" />
                <ellipse cx="121" cy="87" rx="12.5" ry="13.2" fill="#FFFFFF" />

                {/* Warm Chestnut Irises */}
                <circle cx={79.5 + eyeShiftX} cy={87.5 + eyeShiftY} r="8.6" fill={`url(#${uid}-iris)`} />
                <circle cx={120.5 + eyeShiftX} cy={87.5 + eyeShiftY} r="8.6" fill={`url(#${uid}-iris)`} />

                {/* Deep Pupils */}
                <circle cx={79.5 + eyeShiftX} cy={87.5 + eyeShiftY} r="4.8" fill="#180A04" />
                <circle cx={120.5 + eyeShiftX} cy={87.5 + eyeShiftY} r="4.8" fill="#180A04" />

                {/* Glossy Dual Catchlights */}
                <circle cx={76.5 + eyeShiftX} cy={83.8 + eyeShiftY} r="2.9" fill="#FFFFFF" />
                <circle cx={82.5 + eyeShiftX} cy={90.5 + eyeShiftY} r="1.4" fill="#FFFFFF" opacity="0.9" />
                <circle cx={117.5 + eyeShiftX} cy={83.8 + eyeShiftY} r="2.9" fill="#FFFFFF" />
                <circle cx={123.5 + eyeShiftX} cy={90.5 + eyeShiftY} r="1.4" fill="#FFFFFF" opacity="0.9" />

                {/* Soft Upper Lid Outline */}
                <path d="M 66.5 84 Q 79 72.5 91.5 84" stroke="#1C2942" strokeWidth="2.4" strokeLinecap="round" />
                <path d="M 108.5 84 Q 121 72.5 133.5 84" stroke="#1C2942" strokeWidth="2.4" strokeLinecap="round" />
              </g>
            )}

            {/* Cute Rounded Dragon Nose Bridge & Nostrils */}
            <path
              d="M 90 100 C 93 95 107 95 110 100"
              stroke="#D8C4A0"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <ellipse cx="95" cy="100.5" rx="2.1" ry="1.3" transform="rotate(-18 95 100.5)" fill="#8FA8B8" />
            <ellipse cx="105" cy="100.5" rx="2.1" ry="1.3" transform="rotate(18 105 100.5)" fill="#8FA8B8" />

            {/* Oversized Navy-Blue Round Glasses with Subtle Animated Glint */}
            <g>
              {/* Glass Lenses */}
              <circle cx="77" cy="87" r="19" fill={`url(#${uid}-lens)`} />
              <circle cx="123" cy="87" r="19" fill={`url(#${uid}-lens)`} />

              {/* Animated Specular Glint Strip */}
              <g className={paused || isSleeping ? '' : 'barnaby-rig-glint'} opacity={isTeaching || isCorrecting ? '0.45' : '0.28'}>
                <path d="M 68 75 L 75 75 L 67 99 L 61 99 Z" fill="#FFFFFF" />
                <path d="M 114 75 L 121 75 L 113 99 L 107 99 Z" fill="#FFFFFF" />
              </g>

              {/* Thick Signature Navy Frames */}
              <circle cx="77" cy="87" r="19" stroke="#1B2C54" strokeWidth="4.4" fill="none" />
              <circle cx="123" cy="87" r="19" stroke="#1B2C54" strokeWidth="4.4" fill="none" />
              {/* Inner Rim Depth Highlight */}
              <circle cx="77" cy="87" r="17.2" stroke="#3B5998" strokeWidth="0.9" fill="none" opacity="0.65" />
              <circle cx="123" cy="87" r="17.2" stroke="#3B5998" strokeWidth="0.9" fill="none" opacity="0.65" />
              {/* Nose Bridge & Side Temples */}
              <path d="M 96 86 Q 100 82 104 86" stroke="#1B2C54" strokeWidth="4.2" strokeLinecap="round" />
              <path d="M 55 83 L 58 84 M 142 84 L 145 83" stroke="#1B2C54" strokeWidth="4.5" strokeLinecap="round" />
            </g>

            {/* ================= MOUTH LAYER (STRICTLY GATED ON `isSpeaking === true`) ================= */}
            {isActivelySpeakingMouth ? (
              <g data-mouth-state="speaking-active">
                <g
                  className={useAmplitudeMouth ? '' : 'barnaby-rig-speak-jaw'}
                  style={
                    useAmplitudeMouth
                      ? {
                          transform: `scaleY(${0.35 + clampedMouthOpen * 0.85})`,
                          transformOrigin: '100px 111px'
                        }
                      : undefined
                  }
                >
                  <path
                    d="M 84 111 Q 100 109 116 111 Q 100 129 84 111 Z"
                    fill="#7F1D3A"
                    stroke="#4C1D2D"
                    strokeWidth="1.8"
                  />
                  <path d="M 88 111.5 Q 100 113.5 112 111.5 Z" fill="#FFFFFF" />
                  <ellipse cx="100" cy="120.5" rx="6.8" ry="3.6" fill="#FB7185" />
                </g>
              </g>
            ) : isThinking ? (
              /* Thoughtful slight purse */
              <path
                data-mouth-state="thinking-closed"
                d="M 92 115 Q 100 112.5 108 115.5"
                stroke="#4C261F"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            ) : isCorrecting ? (
              /* Honest, gentle mentor expression */
              <path
                data-mouth-state="correcting-closed"
                d="M 89 114 Q 100 116 111 113"
                stroke="#4C261F"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            ) : isSleeping ? (
              /* Soft resting smile */
              <path
                data-mouth-state="sleeping-closed"
                d="M 92 115 Q 100 119 108 115"
                stroke="#4C261F"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            ) : isCelebrating || isGreeting ? (
              /* Warm broad closed/joyful dragon grin (NOT animated speech) */
              <g data-mouth-state="joyful-smile">
                <path
                  d="M 81 111 Q 100 125 119 111"
                  stroke="#4C261F"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M 89 115 Q 100 121 111 115"
                  fill="#9F1239"
                  opacity="0.72"
                />
              </g>
            ) : (
              /* Idle / Listening / Teaching / Encouraging: Warm Closed Dragon Smile */
              <path
                data-mouth-state="idle-closed-smile"
                d={isEncouraging || isTeaching ? 'M 82 112 Q 100 123 118 112' : 'M 84 112 Q 100 121 116 112'}
                stroke="#4C261F"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            )}
          </g>
        </g>

        {/* ================= CONTEXT-SENSITIVE STATE ACCENTS ================= */}
        {isThinking && (
          <g className={paused ? '' : 'barnaby-rig-sparkle'}>
            <circle cx="164" cy="48" r="11" fill="#FEF6E8" stroke="#F4A62A" strokeWidth="1.6" />
            <text x="164" y="53" textAnchor="middle" fill="#B45309" fontSize="14" fontWeight="900" fontFamily="sans-serif">
              ?
            </text>
          </g>
        )}

        {isCelebrating && (
          <g className={paused ? '' : 'barnaby-rig-sparkle'}>
            <path
              d="M 32 42 L 35 49 L 42 52 L 35 55 L 32 62 L 29 55 L 22 52 L 29 49 Z"
              fill="#F4A62A"
            />
            <path
              d="M 168 54 L 170 59 L 175 61 L 170 63 L 168 68 L 166 63 L 161 61 L 166 59 Z"
              fill="#38BDF8"
            />
          </g>
        )}

        {isEncouraging && (
          <g className={paused ? '' : 'barnaby-rig-sparkle'}>
            <path
              d="M 164 56 C 164 52 159 50 156 54 C 153 50 148 52 148 56 C 148 61 156 66 156 66 C 156 66 164 61 164 56 Z"
              fill="#FB7185"
            />
          </g>
        )}

        {isTeaching && (
          <g className={paused ? '' : 'barnaby-rig-sparkle'}>
            <circle cx="166" cy="52" r="9" fill="#0F4C45" stroke="#F4A62A" strokeWidth="1.5" />
            <path d="M 166 47 L 166 54 M 166 56.5 L 166 57.5" stroke="#FDE68A" strokeWidth="2.2" strokeLinecap="round" />
          </g>
        )}

        {isCorrecting && (
          <g className={paused ? '' : 'barnaby-rig-sparkle'}>
            <circle cx="166" cy="52" r="10" fill="#FEF6E8" stroke="#D97706" strokeWidth="1.6" />
            <path d="M 162 52 L 165 55 L 171 49" stroke="#B45309" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}

        {isSleeping && (
          <g className={paused ? '' : 'barnaby-rig-zzz'}>
            <text x="155" y="54" fill="#64748B" fontSize="14" fontWeight="800" fontFamily="monospace">
              z
            </text>
            <text x="166" y="42" fill="#94A3B8" fontSize="11" fontWeight="800" fontFamily="monospace">
              z
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
