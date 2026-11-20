import React, { useState, useEffect, useMemo } from 'react';
import { audioService } from '../../services/audioService';
import {
  ExaminerReferenceExpression,
  BarnabyReferenceExpression,
  resolveExaminerExpression,
  resolveBarnabyExpression,
  getExpressionBadgeLabel
} from '../../config/avatarReferenceRegistry';

export type ChubbyAvatarCharacter = 'clara' | 'arthur' | 'barnaby';

export type ExaminerConversationalState =
  | 'idle'
  | 'speaking'
  | 'listening'
  | 'processing'
  | 'transitioning'
  | 'paused'
  | 'loading'
  | 'error'
  | 'completed';

export interface PersonaAccessoryConfig {
  spectacles: {
    enabled: boolean;
    style: 'practice_gold_half_rim' | 'oxbridge_horn_rim' | 'none';
    lensReflection: boolean;
    eyeSpacing: number;
    centerY: number;
  };
  lapelPin: {
    enabled: boolean;
    style: 'practice_shield' | 'oxbridge_crown' | 'academic_medallion';
    x: number;
    y: number;
    rotation: number;
    scale: number;
    label: string;
  };
  pocketChain?: {
    enabled: boolean;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    dip: number;
  };
}

export const PERSONA_ACCESSORIES: Record<ChubbyAvatarCharacter, PersonaAccessoryConfig> = {
  clara: {
    spectacles: {
      enabled: false,
      style: 'none',
      lensReflection: false,
      eyeSpacing: 52,
      centerY: 138
    },
    lapelPin: {
      enabled: true,
      style: 'practice_shield',
      x: 112,
      y: 256,
      rotation: -4,
      scale: 0.9,
      label: 'IELTS Examiner Crest'
    }
  },
  arthur: {
    spectacles: {
      enabled: true,
      style: 'oxbridge_horn_rim',
      lensReflection: true,
      eyeSpacing: 54,
      centerY: 136
    },
    lapelPin: {
      enabled: true,
      style: 'oxbridge_crown',
      x: 190,
      y: 256,
      rotation: 4,
      scale: 0.9,
      label: 'Oxbridge Lead Oral Examiner Seal'
    }
  },
  barnaby: {
    spectacles: {
      enabled: false,
      style: 'none',
      lensReflection: false,
      eyeSpacing: 0,
      centerY: 146
    },
    lapelPin: {
      enabled: false,
      style: 'academic_medallion',
      x: 150,
      y: 248,
      rotation: 0,
      scale: 1.0,
      label: 'BandSprint Companion'
    }
  }
};

export interface CuteChubbyExaminerAvatarProps {
  gender: 'female' | 'male';
  characterOverride?: ChubbyAvatarCharacter;
  conversationalState?: ExaminerConversationalState;
  expressionOverride?: ExaminerReferenceExpression | BarnabyReferenceExpression;
  isSpeaking: boolean;
  isListening: boolean;
  isThinking?: boolean;
  isTransitioning?: boolean;
  isCompleted?: boolean;
  isMuted?: boolean;
  isPaused?: boolean;
  spokenText?: string;
  mouthOpenness?: number;
  candidateVolumeRms?: number;
  examinerName?: string;
  activePartLabel?: string;
  compact?: boolean;
  allowCompanionSelection?: boolean;
  showPersonaSwitcher?: boolean;
  studioTheme?: 'navy' | 'slate' | 'daylight';
  errorMessage?: string | null;
  onCharacterChange?: (char: ChubbyAvatarCharacter) => void;
  onSelectExaminerGender?: (gender: 'female' | 'male') => void;
}

/**
 * BandSprint — Visual Reference Character Implementation
 *
 * 1. Prof. Arthur Pendelton (Male IELTS Examiner):
 *    - Approachable, intelligent anime adult male with dark brown wavy hair,
 *      full-rim dark rectangular glasses, navy suit jacket, white collared shirt, and navy tie.
 *    - 5 Reference Expressions: Neutral, Speaking, Listening, Thinking, Encouraging.
 *
 * 2. Dr. Clara Sterling (Female IELTS Examiner):
 *    - Warm, confident anime adult female with long wavy chestnut-brown hair,
 *      luminous warm brown eyes, pearl stud earrings, and a tailored beige blazer over a white V-neck top.
 *    - 5 Reference Expressions: Neutral, Speaking, Listening, Thinking, Encouraging.
 *
 * 3. Barnaby (AI Learning Companion):
 *    - Cute, chubby anime boy mascot with fluffy dark-brown wavy hair, large expressive brown eyes,
 *      rosy cheeks, backpack straps, and a royal-blue "BandSprint" hoodie.
 *    - 6 Reference Expressions: Happy, Excited, Thinking, Encouraging, Listening, Cheerful.
 *    - Visually and functionally distinct from both IELTS examiners.
 */
export const CuteChubbyExaminerAvatar: React.FC<CuteChubbyExaminerAvatarProps> = ({
  gender,
  characterOverride,
  conversationalState: propConversationalState,
  expressionOverride,
  isSpeaking,
  isListening,
  isThinking = false,
  isTransitioning = false,
  isCompleted = false,
  isMuted = false,
  isPaused = false,
  spokenText = '',
  mouthOpenness = 0,
  candidateVolumeRms = 0,
  examinerName,
  activePartLabel = 'IELTS Speaking Studio',
  compact = false,
  allowCompanionSelection = false,
  showPersonaSwitcher = false,
  studioTheme = 'navy',
  errorMessage = null,
  onCharacterChange,
  onSelectExaminerGender
}) => {
  const activeChar: ChubbyAvatarCharacter = useMemo(() => {
    if (characterOverride) return characterOverride;
    return gender === 'female' ? 'clara' : 'arthur';
  }, [characterOverride, gender]);

  // Subscribe to real-time audioService state so mouth movement is strictly bound to
  // actual audible playback (never animating while network TTS is still loading/buffering).
  const [audioEngineState, setAudioEngineState] = useState(() => audioService.getState());
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const unsubscribe = audioService.subscribe((st) => {
      setAudioEngineState(st);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  // Determine whether audio is actively loading over the network or actually audible
  const isAudioBuffering = Boolean(isSpeaking && audioEngineState.isLoading && !audioEngineState.isPlaying);
  const hasPlaybackError = Boolean(errorMessage || audioEngineState.error);
  const isActuallyAudible = Boolean(
    isSpeaking &&
      !isPaused &&
      !isMuted &&
      !isAudioBuffering &&
      !hasPlaybackError &&
      (audioEngineState.isPlaying || !audioEngineState.isLoading)
  );

  // Resolve the canonical conversational state machine
  const resolvedState: ExaminerConversationalState = useMemo(() => {
    if (propConversationalState) return propConversationalState;
    if (hasPlaybackError) return 'error';
    if (isPaused) return 'paused';
    if (isCompleted) return 'completed';
    if (isAudioBuffering) return 'loading';
    if (isActuallyAudible) return 'speaking';
    if (isListening) return 'listening';
    if (isThinking) return 'processing';
    if (isTransitioning) return 'transitioning';
    return 'idle';
  }, [
    propConversationalState,
    hasPlaybackError,
    isPaused,
    isCompleted,
    isAudioBuffering,
    isActuallyAudible,
    isListening,
    isThinking,
    isTransitioning
  ]);

  const activeExaminerExpression: ExaminerReferenceExpression = useMemo(
    () =>
      resolveExaminerExpression(
        resolvedState,
        activeChar !== 'barnaby' ? (expressionOverride as ExaminerReferenceExpression | undefined) : undefined
      ),
    [resolvedState, activeChar, expressionOverride]
  );

  const activeBarnabyExpression: BarnabyReferenceExpression = useMemo(
    () =>
      resolveBarnabyExpression(
        resolvedState,
        activeChar === 'barnaby' ? (expressionOverride as BarnabyReferenceExpression | undefined) : undefined
      ),
    [resolvedState, activeChar, expressionOverride]
  );

  const expressionLabel = useMemo(
    () => getExpressionBadgeLabel(activeChar, resolvedState),
    [activeChar, resolvedState]
  );

  // Animation states
  const [blink, setBlink] = useState(false);
  const [mouthViseme, setMouthViseme] = useState<'neutral' | 'openA' | 'openE' | 'roundO' | 'closedM'>('neutral');
  const [headTilt, setHeadTilt] = useState(0);
  const [nodOffset, setNodOffset] = useState(0);
  const [breathOffset, setBreathOffset] = useState(0);
  const [eyeDriftX, setEyeDriftX] = useState(0);
  const [eyeDriftY, setEyeDriftY] = useState(0);

  // 1. Natural Randomized Blink Loop (3.0s - 5.6s, disabled in reducedMotion)
  useEffect(() => {
    if (reducedMotion || resolvedState === 'paused') {
      setBlink(false);
      return;
    }
    let outerTimer: ReturnType<typeof setTimeout>;
    let innerTimer: ReturnType<typeof setTimeout>;
    let doubleTimer: ReturnType<typeof setTimeout>;

    const scheduleBlink = () => {
      const interval = Math.random() * 2600 + 3000;
      outerTimer = setTimeout(() => {
        setBlink(true);
        innerTimer = setTimeout(() => {
          setBlink(false);
          if (Math.random() < 0.15) {
            doubleTimer = setTimeout(() => {
              setBlink(true);
              innerTimer = setTimeout(() => setBlink(false), 105);
            }, 95);
          }
          scheduleBlink();
        }, 115);
      }, interval);
    };

    scheduleBlink();
    return () => {
      clearTimeout(outerTimer);
      clearTimeout(innerTimer);
      clearTimeout(doubleTimer);
    };
  }, [reducedMotion, resolvedState]);

  // 2. Subtle Breathing & Calm Eye Focus
  useEffect(() => {
    if (reducedMotion || resolvedState === 'paused') {
      setBreathOffset(0);
      setHeadTilt(0);
      setEyeDriftX(0);
      setEyeDriftY(0);
      setNodOffset(0);
      return;
    }

    if (resolvedState === 'listening') {
      setHeadTilt(activeChar === 'barnaby' ? 2.2 : 1.4);
      setEyeDriftX(0);
      setEyeDriftY(0.3);
      if (candidateVolumeRms > 12) {
        const nod = Math.min(2.8, (candidateVolumeRms / 100) * 3.8);
        setNodOffset(nod);
      } else {
        setNodOffset(0);
      }
      return;
    }

    if (resolvedState === 'processing' || resolvedState === 'loading') {
      setHeadTilt(-1.2);
      setEyeDriftX(1.4);
      setEyeDriftY(-1.3);
      setNodOffset(0);
      return;
    }

    if (resolvedState === 'transitioning') {
      setHeadTilt(0.9);
      setEyeDriftX(0.4);
      setEyeDriftY(-0.3);
      setNodOffset(-0.8);
      return;
    }

    if (resolvedState === 'completed') {
      setHeadTilt(1.1);
      setEyeDriftX(0);
      setEyeDriftY(0);
      setNodOffset(1.2);
      return;
    }

    setHeadTilt(0);
    setEyeDriftX(0);
    setEyeDriftY(0);
    if (resolvedState !== 'speaking') {
      setNodOffset(0);
    }
  }, [reducedMotion, resolvedState, candidateVolumeRms, activeChar]);

  // Subtle idle breathing wave
  useEffect(() => {
    if (reducedMotion || resolvedState === 'paused') {
      setBreathOffset(0);
      return;
    }
    const interval = setInterval(() => {
      const t = Date.now() / 1650;
      setBreathOffset(Math.sin(t) * 1.1);
    }, 80);
    return () => clearInterval(interval);
  }, [reducedMotion, resolvedState]);

  // 3. Real-Time Speech Viseme Synchronization (Strictly active ONLY during audible speech)
  useEffect(() => {
    if (resolvedState !== 'speaking' || !isActuallyAudible) {
      setMouthViseme('neutral');
      if (resolvedState !== 'listening' && resolvedState !== 'completed') {
        setNodOffset(0);
      }
      return;
    }

    if (reducedMotion) {
      setMouthViseme('openE');
      return;
    }

    let frameId: number;
    const textLen = Math.max(12, spokenText.length);

    const animateSpeechVisemes = () => {
      const now = Date.now();
      const time = now / 95;
      const harmonic =
        Math.sin(time * 1.45) * 0.45 +
        Math.sin(time * 2.85 + textLen * 0.1) * 0.32 +
        Math.cos(time * 0.75) * 0.23;
      const baseEnergy = Math.max(0, Math.min(1, harmonic + 0.35));
      const energy = mouthOpenness > 0.05 ? baseEnergy * 0.65 + mouthOpenness * 0.35 : baseEnergy;

      if (energy < 0.2) {
        setMouthViseme('closedM');
      } else if (energy < 0.46) {
        setMouthViseme('openE');
      } else if (Math.sin(time * 0.92) > 0.38) {
        setMouthViseme('roundO');
      } else {
        setMouthViseme('openA');
      }

      setNodOffset(Math.sin(time * 0.55) * 1.4);
      frameId = requestAnimationFrame(animateSpeechVisemes);
    };

    frameId = requestAnimationFrame(animateSpeechVisemes);
    return () => {
      cancelAnimationFrame(frameId);
      setMouthViseme('neutral');
    };
  }, [resolvedState, isActuallyAudible, reducedMotion, spokenText.length, mouthOpenness]);

  const displayName =
    examinerName ||
    (activeChar === 'clara'
      ? 'Dr. Clara Sterling'
      : activeChar === 'arthur'
      ? 'Prof. Arthur Pendelton'
      : 'Barnaby');

  const roleTitle =
    activeChar === 'clara'
      ? 'Female Examiner · Warm & Supportive'
      : activeChar === 'arthur'
      ? 'Male Examiner · Calm & Professional'
      : 'Your AI Learning Companion';

  const certBadge =
    activeChar === 'clara'
      ? 'Senior Examiner'
      : activeChar === 'arthur'
      ? 'Senior Examiner'
      : 'AI Companion';

  const handleCharacterSwitch = (target: ChubbyAvatarCharacter) => {
    onCharacterChange?.(target);
    if (target === 'clara') {
      onSelectExaminerGender?.('female');
    } else if (target === 'arthur') {
      onSelectExaminerGender?.('male');
    }
  };

  // Status badge configuration for all 8 conversational states
  const statusBadge = useMemo(() => {
    switch (resolvedState) {
      case 'speaking':
        return {
          label: activeChar === 'barnaby' ? 'Barnaby Speaking' : 'Examiner Speaking',
          bg: 'bg-blue-950/90 border-blue-400/60 text-blue-100',
          dot: 'bg-blue-400 animate-ping'
        };
      case 'listening':
        return {
          label: 'Listening to You',
          bg: 'bg-emerald-950/90 border-emerald-400/60 text-emerald-100',
          dot: 'bg-emerald-400 animate-pulse'
        };
      case 'processing':
        return {
          label: 'Evaluating Response',
          bg: 'bg-amber-950/90 border-amber-400/60 text-amber-100',
          dot: 'bg-amber-400 animate-spin'
        };
      case 'loading':
        return {
          label: 'Preparing Voice...',
          bg: 'bg-sky-950/90 border-sky-400/50 text-sky-100',
          dot: 'bg-sky-400 animate-pulse'
        };
      case 'transitioning':
        return {
          label: 'Next Question...',
          bg: 'bg-indigo-950/90 border-indigo-400/50 text-indigo-100',
          dot: 'bg-indigo-400 animate-pulse'
        };
      case 'paused':
        return {
          label: 'Session Paused',
          bg: 'bg-slate-900/95 border-amber-400/50 text-amber-200',
          dot: 'bg-amber-400'
        };
      case 'error':
        return {
          label: 'Text Prompt Active',
          bg: 'bg-rose-950/90 border-rose-400/60 text-rose-100',
          dot: 'bg-rose-400'
        };
      case 'completed':
        return {
          label: 'Exam Completed',
          bg: 'bg-emerald-950/90 border-emerald-400/60 text-emerald-100',
          dot: 'bg-emerald-400'
        };
      case 'idle':
      default:
        return {
          label: activeChar === 'barnaby' ? 'Companion Ready' : 'Examiner Ready',
          bg: 'bg-slate-900/85 border-white/15 text-slate-200',
          dot: 'bg-emerald-400'
        };
    }
  }, [resolvedState, activeChar]);

  const isEncouragingEyes =
    (activeChar !== 'barnaby' && activeExaminerExpression === 'encouraging') ||
    (activeChar === 'barnaby' && activeBarnabyExpression === 'cheerful');

  const isThinkingPose =
    (activeChar !== 'barnaby' && activeExaminerExpression === 'thinking') ||
    (activeChar === 'barnaby' && activeBarnabyExpression === 'thinking');

  return (
    <div
      data-testid="examiner-anime-avatar"
      data-character={activeChar}
      data-conversational-state={resolvedState}
      data-expression={activeChar === 'barnaby' ? activeBarnabyExpression : activeExaminerExpression}
      className={`relative w-full h-full max-h-[35vh] flex flex-col items-center justify-end select-none overflow-hidden ${
        activeChar === 'barnaby'
          ? 'bg-gradient-to-b from-[#1E3A8A] via-[#172554] to-[#0B132B] text-white'
          : studioTheme === 'daylight'
          ? 'bg-gradient-to-b from-[#DBEAFE] via-[#E2E8F0] to-[#CBD5E1] text-slate-900'
          : studioTheme === 'slate'
          ? 'bg-gradient-to-b from-[#1E293B] via-[#152033] to-[#0B111E] text-white'
          : 'bg-gradient-to-b from-[#162447] via-[#111C38] to-[#090F20] text-white'
      }`}
    >
      {/* ================= ACADEMIC STUDY / OFFICE ARCHITECTURAL BACKDROP ================= */}
      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full pointer-events-none opacity-45"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="studioWindowLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.32" />
            <stop offset="60%" stopColor="#60A5FA" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="warmWoodShelf" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#78350F" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#451A03" stopOpacity="0.22" />
          </linearGradient>
        </defs>

        {/* Sunlit Academic Office Window Panes (Left) */}
        <rect x="14" y="18" width="110" height="190" rx="6" fill="url(#studioWindowLight)" />
        <line x1="69" y1="18" x2="69" y2="208" stroke="#93C5FD" strokeOpacity="0.2" strokeWidth="2" />
        <line x1="14" y1="110" x2="124" y2="110" stroke="#93C5FD" strokeOpacity="0.2" strokeWidth="2" />

        {/* Warm Blurred Study Bookshelves (Right) */}
        <rect x="275" y="24" width="112" height="210" rx="4" fill="url(#warmWoodShelf)" />
        <line x1="275" y1="88" x2="387" y2="88" stroke="#B45309" strokeOpacity="0.35" strokeWidth="4" />
        <line x1="275" y1="154" x2="387" y2="154" stroke="#B45309" strokeOpacity="0.35" strokeWidth="4" />
        {/* Soft Academic Book Spines */}
        <rect x="286" y="42" width="12" height="44" rx="2" fill="#1E40AF" opacity="0.45" />
        <rect x="301" y="46" width="10" height="40" rx="2" fill="#991B1B" opacity="0.4" />
        <rect x="314" y="38" width="14" height="48" rx="2" fill="#065F46" opacity="0.4" />
        <rect x="332" y="44" width="11" height="42" rx="2" fill="#D97706" opacity="0.4" />
        <rect x="290" y="106" width="14" height="46" rx="2" fill="#3730A3" opacity="0.4" />
        <rect x="307" y="110" width="12" height="42" rx="2" fill="#9D174D" opacity="0.35" />
        <rect x="323" y="102" width="15" height="50" rx="2" fill="#1E293B" opacity="0.45" />

        {/* Executive Studio Chair Backrest Silhouette Behind Examiner */}
        {activeChar !== 'barnaby' && (
          <path
            d="M 88 295 L 96 155 C 98 134 120 124 200 124 C 280 124 302 134 304 155 L 312 295 Z"
            fill="#0F172A"
            opacity="0.55"
            stroke="#334155"
            strokeWidth="1.5"
          />
        )}
      </svg>

      {/* Subtle Dynamic State Rim Glow */}
      <div
        className={`absolute inset-x-8 top-6 bottom-8 rounded-full blur-3xl opacity-30 transition-colors duration-700 pointer-events-none ${
          resolvedState === 'speaking'
            ? 'bg-sky-400/45'
            : resolvedState === 'listening'
            ? 'bg-emerald-400/35'
            : resolvedState === 'processing' || resolvedState === 'loading'
            ? 'bg-amber-400/30'
            : 'bg-blue-400/25'
        }`}
      />

      {/* Acoustic Resonance Rings ONLY when examiner audio is genuinely playing */}
      {resolvedState === 'speaking' && !reducedMotion && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-56 h-56 sm:w-64 sm:h-64 rounded-full border border-sky-400/25 animate-ping opacity-40"
            style={{ animationDuration: '2.5s' }}
          />
        </div>
      )}

      {/* ================= MAIN CHARACTER PORTRAIT STAGE (TIGHT CHEST-UP FRAMING) ================= */}
      <div
        className="relative z-10 flex items-end justify-center w-full h-full pt-7 pb-9 px-2 transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${nodOffset + breathOffset}px) rotate(${headTilt}deg)`
        }}
      >
        <svg
          viewBox="32 42 236 248"
          className={`w-full h-full ${
            compact ? 'max-w-[248px] sm:max-w-[285px]' : 'max-w-[270px] sm:max-w-[330px]'
          } object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.55)]`}
          role="img"
          aria-label={
            activeChar === 'barnaby'
              ? `Barnaby — Cute Chubby Anime Study Companion (${activeBarnabyExpression})`
              : `${displayName} — IELTS Speaking Examiner (${activeExaminerExpression})`
          }
        >
          <defs>
            {/* Dr. Clara Sterling — Warm Porcelain-Peach Anime Skin */}
            <linearGradient id="refClaraSkin" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFF8F3" />
              <stop offset="58%" stopColor="#FCE6D7" />
              <stop offset="90%" stopColor="#F2C8B2" />
              <stop offset="100%" stopColor="#DFAC94" />
            </linearGradient>

            {/* Prof. Arthur Pendelton — Warm Fair-Peach Anime Skin */}
            <linearGradient id="refArthurSkin" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFF6EE" />
              <stop offset="55%" stopColor="#F9DFCC" />
              <stop offset="88%" stopColor="#EBC2A8" />
              <stop offset="100%" stopColor="#D5A084" />
            </linearGradient>

            {/* Anime Neck & Jaw Cel-Shadow */}
            <linearGradient id="refSkinShadow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D1967E" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#B57860" stopOpacity="0.82" />
            </linearGradient>

            {/* Subtle Anime Cheek Warmth */}
            <radialGradient id="refCheekGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FB7185" stopOpacity="0.26" />
              <stop offset="65%" stopColor="#FDA4AF" stopOpacity="0.09" />
              <stop offset="100%" stopColor="#FDA4AF" stopOpacity="0" />
            </radialGradient>

            {/* Dr. Clara Sterling — Long Flowing Chestnut-Brown Hair (Reference Match) */}
            <linearGradient id="refClaraChestnutHair" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6B422D" />
              <stop offset="45%" stopColor="#4E2F1E" />
              <stop offset="85%" stopColor="#351E12" />
              <stop offset="100%" stopColor="#24130A" />
            </linearGradient>

            {/* Prof. Arthur Pendelton — Dark Brown Wavy Hair (Reference Match) */}
            <linearGradient id="refArthurBrownHair" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4E3224" />
              <stop offset="48%" stopColor="#352016" />
              <stop offset="85%" stopColor="#22130C" />
              <stop offset="100%" stopColor="#160B06" />
            </linearGradient>

            {/* Dr. Clara — Warm Amber-Chestnut Anime Iris (Reference Match) */}
            <linearGradient id="refClaraAmberIris" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2A1207" />
              <stop offset="38%" stopColor="#5C2D16" />
              <stop offset="75%" stopColor="#9A5229" />
              <stop offset="100%" stopColor="#FCD34D" />
            </linearGradient>

            {/* Prof. Arthur — Deep Sapphire-Slate Anime Iris (Reference Match) */}
            <linearGradient id="refArthurSapphireIris" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="38%" stopColor="#1E3A8A" />
              <stop offset="75%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#93C5FD" />
            </linearGradient>

            {/* Dr. Clara — Tailored Warm Beige Blazer (Reference Match) */}
            <linearGradient id="refClaraBeigeBlazer" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F2E5D8" />
              <stop offset="55%" stopColor="#E4D0BC" />
              <stop offset="100%" stopColor="#CEB59E" />
            </linearGradient>

            {/* Prof. Arthur — Tailored Royal Navy Suit (Reference Match) */}
            <linearGradient id="refArthurNavySuit" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#24376E" />
              <stop offset="55%" stopColor="#1B2A56" />
              <stop offset="100%" stopColor="#111C3B" />
            </linearGradient>

            {/* Prof. Arthur — Deep Navy Silk Tie */}
            <linearGradient id="refArthurNavyTie" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2E4482" />
              <stop offset="60%" stopColor="#1E2F5E" />
              <stop offset="100%" stopColor="#121D3D" />
            </linearGradient>

            {/* Barnaby — Royal-Blue BandSprint Hoodie */}
            <linearGradient id="refBarnabyHoodie" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="55%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#1E3A8A" />
            </linearGradient>
          </defs>

          {/* =====================================================================
              CHARACTER 1: DR. CLARA STERLING — FEMALE EXAMINER (VISUAL REFERENCE)
              Long wavy brown hair, warm brown eyes, pearl studs, beige blazer & white V-neck
             ===================================================================== */}
          {activeChar === 'clara' && (
            <g id="clara-reference-anime-rig">
              {/* Long Flowing Chestnut-Brown Back & Shoulder Waves */}
              <path
                d="M 82 104 C 66 144 64 214 74 282 C 94 286 112 276 118 242 L 182 242 C 188 276 206 286 226 282 C 236 214 234 144 218 104 Z"
                fill="url(#refClaraChestnutHair)"
              />

              {/* Tailored Warm Beige Blazer & Shoulders */}
              <path
                d="M 52 292 L 64 232 C 72 216 104 208 150 208 C 196 208 228 216 236 232 L 248 292 Z"
                fill="url(#refClaraBeigeBlazer)"
                stroke="#B89B82"
                strokeWidth="1.5"
              />

              {/* Crisp White V-Neck Inner Blouse */}
              <path d="M 118 212 L 150 278 L 182 212 Z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />

              {/* Beige Blazer Notched Lapels & Subtle Tailoring Lines */}
              <path
                d="M 116 210 L 96 248 L 136 286 L 148 274 Z"
                fill="#DFC9B4"
                stroke="#B0937A"
                strokeWidth="1.3"
              />
              <path
                d="M 184 210 L 204 248 L 164 286 L 152 274 Z"
                fill="#DFC9B4"
                stroke="#B0937A"
                strokeWidth="1.3"
              />
              {/* Blazer Sleeve Seams & Buttons */}
              <path d="M 84 246 L 92 290 M 216 246 L 208 290" stroke="#B0937A" strokeWidth="1.2" opacity="0.7" />
              <circle cx="132" cy="280" r="2.6" fill="#57534E" />
              <circle cx="168" cy="280" r="2.6" fill="#57534E" />

              {/* Cascading Wavy Chestnut Hair Locks Over Blazer Shoulders */}
              <path
                d="M 86 122 C 74 162 76 214 90 258 C 102 248 108 224 106 192 C 102 168 96 144 86 122 Z"
                fill="url(#refClaraChestnutHair)"
              />
              <path
                d="M 214 122 C 226 162 224 214 210 258 C 198 248 192 224 194 192 C 198 168 204 144 214 122 Z"
                fill="url(#refClaraChestnutHair)"
              />

              {/* Graceful Neck & Collarbone Highlight */}
              <path
                d="M 134 182 L 134 222 Q 150 236 166 222 L 166 182 Z"
                fill="url(#refClaraSkin)"
              />
              <path
                d="M 134 188 Q 150 210 166 188 Q 150 199 134 188 Z"
                fill="url(#refSkinShadow)"
              />
              <path
                d="M 138 220 Q 150 227 162 220"
                fill="none"
                stroke="#D49B85"
                strokeWidth="1.2"
                opacity="0.65"
              />

              {/* Delicate Anime Ears & White Pearl Stud Earrings */}
              <path
                d="M 97 130 C 90 130 90 149 99 155"
                fill="url(#refClaraSkin)"
                stroke="#C88D78"
                strokeWidth="1.4"
              />
              <path
                d="M 203 130 C 210 130 210 149 201 155"
                fill="url(#refClaraSkin)"
                stroke="#C88D78"
                strokeWidth="1.4"
              />
              <circle cx="96" cy="154" r="3.1" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.9" />
              <circle cx="204" cy="154" r="3.1" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.9" />

              {/* Refined Anime Head & Warm Jawline */}
              <path
                d="M 98 114 C 98 72 202 72 202 114 C 202 148 192 173 174 189 C 162 199 155 202 150 202 C 145 202 138 199 126 189 C 108 173 98 148 98 114 Z"
                fill="url(#refClaraSkin)"
                stroke="#B97D68"
                strokeWidth="1.5"
              />

              {/* Soft Warm Cheek Blush */}
              <ellipse cx="115" cy="153" rx="14" ry="8.5" fill="url(#refCheekGlow)" />
              <ellipse cx="185" cy="153" rx="14" ry="8.5" fill="url(#refCheekGlow)" />

              {/* Expressive Chestnut Eyebrows */}
              <path
                d={
                  isThinkingPose
                    ? 'M 107 116 Q 122 112 137 116'
                    : resolvedState === 'listening' || isEncouragingEyes
                    ? 'M 106 113 Q 122 106 137 113'
                    : 'M 107 115 Q 122 109 137 114'
                }
                fill="none"
                stroke="#3B1F12"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <path
                d={
                  isThinkingPose
                    ? 'M 163 111 Q 178 104 193 111'
                    : resolvedState === 'listening' || isEncouragingEyes
                    ? 'M 163 113 Q 178 106 194 113'
                    : 'M 163 114 Q 178 109 193 115'
                }
                fill="none"
                stroke="#3B1F12"
                strokeWidth="2.6"
                strokeLinecap="round"
              />

              {/* Multi-Layered Warm Amber-Brown Anime Eyes (Dr. Clara Sterling) */}
              {blink || isEncouragingEyes ? (
                <g>
                  <path
                    d={
                      isEncouragingEyes
                        ? 'M 109 138 Q 124 127 139 138'
                        : 'M 109 139 Q 124 146 139 139'
                    }
                    fill="none"
                    stroke="#261008"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <path
                    d={
                      isEncouragingEyes
                        ? 'M 161 138 Q 176 127 191 138'
                        : 'M 161 139 Q 176 146 191 139'
                    }
                    fill="none"
                    stroke="#261008"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <path d="M 107 137 L 103 133 M 193 137 L 197 133" stroke="#261008" strokeWidth="2.2" strokeLinecap="round" />
                </g>
              ) : (
                <g>
                  {/* Upper Eyelid Fold Crease */}
                  <path
                    d="M 109 123 Q 124 117 138 123 M 162 123 Q 176 117 191 123"
                    fill="none"
                    stroke="#A36A56"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />

                  {/* Sclera */}
                  <ellipse cx="124" cy="137" rx="13.8" ry="11.8" fill="#FFFFFF" />
                  <ellipse cx="176" cy="137" rx="13.8" ry="11.8" fill="#FFFFFF" />

                  {/* Warm Chestnut-Amber Irises */}
                  <ellipse
                    cx={124 + eyeDriftX}
                    cy={137.5 + eyeDriftY}
                    rx="9.5"
                    ry="10.5"
                    fill="url(#refClaraAmberIris)"
                  />
                  <ellipse
                    cx={176 + eyeDriftX}
                    cy={137.5 + eyeDriftY}
                    rx="9.5"
                    ry="10.5"
                    fill="url(#refClaraAmberIris)"
                  />

                  {/* Deep Pupils */}
                  <ellipse cx={124 + eyeDriftX} cy={137.5 + eyeDriftY} rx="4.5" ry="5.2" fill="#1C0B05" />
                  <ellipse cx={176 + eyeDriftX} cy={137.5 + eyeDriftY} rx="4.5" ry="5.2" fill="#1C0B05" />

                  {/* Lower Iris Golden Crescent */}
                  <path
                    d={`M ${118 + eyeDriftX} ${142.5 + eyeDriftY} Q ${124 + eyeDriftX} ${146.5 + eyeDriftY} ${130 + eyeDriftX} ${142.5 + eyeDriftY}`}
                    fill="none"
                    stroke="#FDE68A"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                  <path
                    d={`M ${170 + eyeDriftX} ${142.5 + eyeDriftY} Q ${176 + eyeDriftX} ${146.5 + eyeDriftY} ${182 + eyeDriftX} ${142.5 + eyeDriftY}`}
                    fill="none"
                    stroke="#FDE68A"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    opacity="0.85"
                  />

                  {/* Dual Specular Catchlights */}
                  <circle cx={120 + eyeDriftX} cy={132.5 + eyeDriftY} r="3.3" fill="#FFFFFF" />
                  <circle cx={127.5 + eyeDriftX} cy={141.5 + eyeDriftY} r="1.6" fill="#FFFFFF" opacity="0.92" />
                  <circle cx={172 + eyeDriftX} cy={132.5 + eyeDriftY} r="3.3" fill="#FFFFFF" />
                  <circle cx={179.5 + eyeDriftX} cy={141.5 + eyeDriftY} r="1.6" fill="#FFFFFF" opacity="0.92" />

                  {/* Lush Sculpted Upper Eyelash Wing */}
                  <path
                    d="M 107.5 135 C 113 123.5 130 123.5 139.5 134"
                    fill="none"
                    stroke="#1C0B06"
                    strokeWidth="3.6"
                    strokeLinecap="round"
                  />
                  <path d="M 107.5 135 L 103 131" fill="none" stroke="#1C0B06" strokeWidth="2.5" strokeLinecap="round" />
                  <path
                    d="M 160.5 134 C 170 123.5 187 123.5 192.5 135"
                    fill="none"
                    stroke="#1C0B06"
                    strokeWidth="3.6"
                    strokeLinecap="round"
                  />
                  <path d="M 192.5 135 L 197 131" fill="none" stroke="#1C0B06" strokeWidth="2.5" strokeLinecap="round" />

                  {/* Subtle Lower Lash Line */}
                  <path
                    d="M 114 147.5 Q 124 150.5 134 147.5 M 166 147.5 Q 176 150.5 186 147.5"
                    fill="none"
                    stroke="#5C3424"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {/* Delicate Anime Nose Bridge & Tip */}
              <path
                d="M 149 142 L 148 157 Q 150 160 153 158"
                fill="none"
                stroke="#B87A64"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <polygon points="150,158 154,158 151,162" fill="#D49B85" opacity="0.55" />

              {/* Synchronized Mouth Visemes & Expressions (Dr. Clara) */}
              {mouthViseme === 'neutral' && (
                <g>
                  {isThinkingPose ? (
                    <path
                      d="M 144 176 Q 150 174.5 156 176"
                      fill="none"
                      stroke="#9F1239"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  ) : (
                    <>
                      <path
                        d={
                          resolvedState === 'listening' || isEncouragingEyes
                            ? 'M 139 174 Q 150 183 161 174'
                            : 'M 140 175 Q 150 181 160 175'
                        }
                        fill="none"
                        stroke="#9F1239"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 145 180 Q 150 182.5 155 180"
                        fill="none"
                        stroke="#FDA4AF"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        opacity="0.7"
                      />
                    </>
                  )}
                </g>
              )}

              {mouthViseme === 'closedM' && (
                <path
                  d="M 140 177 Q 150 179.5 160 177"
                  fill="none"
                  stroke="#9F1239"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
              )}

              {mouthViseme === 'openE' && (
                <g>
                  <path
                    d="M 139 173.5 Q 150 172 161 173.5 Q 150 187 139 173.5 Z"
                    fill="#881337"
                    stroke="#9F1239"
                    strokeWidth="1.2"
                  />
                  <path d="M 142 174 Q 150 176 158 174 Z" fill="#FFFFFF" />
                  <ellipse cx="150" cy="182" rx="5.2" ry="2.8" fill="#FB7185" />
                </g>
              )}

              {mouthViseme === 'openA' && (
                <g>
                  <path
                    d="M 137.5 172.5 Q 150 170 162.5 172.5 Q 150 192.5 137.5 172.5 Z"
                    fill="#881337"
                    stroke="#9F1239"
                    strokeWidth="1.3"
                  />
                  <path d="M 141 173 Q 150 175.5 159 173 Z" fill="#FFFFFF" />
                  <ellipse cx="150" cy="185" rx="6.5" ry="4.2" fill="#FB7185" />
                </g>
              )}

              {mouthViseme === 'roundO' && (
                <g>
                  <ellipse
                    cx="150"
                    cy="179"
                    rx="6.5"
                    ry="7.8"
                    fill="#881337"
                    stroke="#9F1239"
                    strokeWidth="1.3"
                  />
                  <ellipse cx="150" cy="182.5" rx="4.4" ry="2.8" fill="#FB7185" />
                </g>
              )}

              {/* Center-Parted Swept Chestnut-Brown Front Bangs & Flowing Side Waves */}
              <path
                d="M 90 126 C 86 66 138 58 152 68 C 168 58 214 66 210 126 C 198 92 174 84 152 94 C 130 84 104 94 90 126 Z"
                fill="url(#refClaraChestnutHair)"
              />
              {/* Soft Face-Framing Side Waves */}
              <path
                d="M 93 106 C 90 144 96 178 108 202 C 94 188 84 156 88 112 Z"
                fill="url(#refClaraChestnutHair)"
              />
              <path
                d="M 207 106 C 210 144 204 178 192 202 C 206 188 216 156 212 112 Z"
                fill="url(#refClaraChestnutHair)"
              />
              {/* Warm Caramel Specular Hair Highlights */}
              <path
                d="M 108 90 Q 128 80 146 88 M 158 88 Q 178 80 194 92"
                fill="none"
                stroke="#9A6548"
                strokeWidth="2.4"
                strokeLinecap="round"
                opacity="0.6"
              />

              {/* Expression-Specific Hand Gesture (Thinking Finger-on-Chin or Speaking Welcoming Hand) */}
              {isThinkingPose && (
                <g id="clara-thinking-hand">
                  <path
                    d="M 142 238 C 142 216 146 202 151 196 C 155 196 158 202 158 214 L 162 238 Z"
                    fill="url(#refClaraSkin)"
                    stroke="#B97D68"
                    strokeWidth="1.3"
                  />
                  <ellipse
                    cx="154"
                    cy="214"
                    rx="10"
                    ry="7.5"
                    fill="url(#refClaraSkin)"
                    stroke="#B97D68"
                    strokeWidth="1.3"
                  />
                </g>
              )}

              {resolvedState === 'speaking' && (
                <g id="clara-speaking-gesture" opacity="0.95">
                  <path
                    d="M 216 276 C 224 260 236 250 246 246 C 249 248 247 255 240 262 C 248 257 254 256 256 260 C 254 266 244 274 232 282 Z"
                    fill="url(#refClaraSkin)"
                    stroke="#B97D68"
                    strokeWidth="1.2"
                  />
                </g>
              )}
            </g>
          )}

          {/* =====================================================================
              CHARACTER 2: PROF. ARTHUR PENDELTON — MALE EXAMINER (VISUAL REFERENCE)
              Dark brown wavy hair, dark rectangular glasses, navy suit, white shirt & navy tie
             ===================================================================== */}
          {activeChar === 'arthur' && (
            <g id="arthur-reference-anime-rig">
              {/* Voluminous Dark-Brown Wavy Back Hair Silhouette */}
              <path
                d="M 88 124 C 80 62 220 62 212 124 Z"
                fill="url(#refArthurBrownHair)"
              />

              {/* Broad Tailored Royal-Navy Suit & Structured Shoulders */}
              <path
                d="M 46 292 L 58 228 C 66 212 102 206 150 206 C 198 206 234 212 242 228 L 254 292 Z"
                fill="url(#refArthurNavySuit)"
                stroke="#1E293B"
                strokeWidth="1.5"
              />
              {/* Subtle Rim-Light on Navy Suit Shoulders */}
              <path
                d="M 60 228 C 88 214 118 209 150 209 C 182 209 212 214 240 228"
                fill="none"
                stroke="#60A5FA"
                strokeWidth="1.2"
                opacity="0.35"
              />

              {/* Crisp White Dress Shirt */}
              <path d="M 118 208 L 150 280 L 182 208 Z" fill="#F8FAFC" />

              {/* Deep Navy Silk Tie (Matching Reference Image) */}
              <polygon points="142,230 158,230 155,244 145,244" fill="#172554" />
              <path d="M 145 244 L 155 244 L 158 290 L 150 295 L 142 290 Z" fill="url(#refArthurNavyTie)" />

              {/* Sharp Royal-Navy Suit Lapels */}
              <path
                d="M 116 208 L 94 248 L 136 290 L 146 274 Z"
                fill="#172347"
                stroke="#334155"
                strokeWidth="1.3"
              />
              <path
                d="M 184 208 L 206 248 L 164 290 L 154 274 Z"
                fill="#172347"
                stroke="#334155"
                strokeWidth="1.3"
              />

              {/* Sculpted Neck & Jaw Cel-Shadow */}
              <path
                d="M 130 182 L 130 220 Q 150 232 170 220 L 170 182 Z"
                fill="url(#refArthurSkin)"
              />
              <path
                d="M 130 188 Q 150 212 170 188 Q 150 200 130 188 Z"
                fill="url(#refSkinShadow)"
              />

              {/* Crisp White Shirt Collar Points */}
              <polygon points="129,206 146,232 120,224" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.1" />
              <polygon points="171,206 154,232 180,224" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.1" />

              {/* Sculpted Anime Ears */}
              <path
                d="M 94 128 C 87 128 87 150 96 156"
                fill="url(#refArthurSkin)"
                stroke="#B9856E"
                strokeWidth="1.5"
              />
              <path
                d="M 206 128 C 213 128 213 150 204 156"
                fill="url(#refArthurSkin)"
                stroke="#B9856E"
                strokeWidth="1.5"
              />

              {/* Clean-Shaven Handsome Anime Male Jawline & Facial Proportions */}
              <path
                d="M 95 112 C 95 72 205 72 205 112 C 205 148 195 174 178 190 C 166 200 157 203 150 203 C 143 203 134 200 122 190 C 105 174 95 148 95 112 Z"
                fill="url(#refArthurSkin)"
                stroke="#AD7862"
                strokeWidth="1.6"
              />

              {/* Subtle Warm Cheek Glow */}
              <ellipse cx="114" cy="153" rx="12" ry="7" fill="url(#refCheekGlow)" />
              <ellipse cx="186" cy="153" rx="12" ry="7" fill="url(#refCheekGlow)" />

              {/* Expressive Dark-Brown Eyebrows */}
              <path
                d={
                  isThinkingPose
                    ? 'M 105 116 Q 122 112 138 116'
                    : resolvedState === 'listening' || isEncouragingEyes
                    ? 'M 104 112 Q 121 106 138 112'
                    : 'M 104 114 Q 121 109 138 113'
                }
                fill="none"
                stroke="#2B1810"
                strokeWidth="3.3"
                strokeLinecap="round"
              />
              <path
                d={
                  isThinkingPose
                    ? 'M 162 110 Q 179 104 196 111'
                    : resolvedState === 'listening' || isEncouragingEyes
                    ? 'M 162 112 Q 179 106 196 112'
                    : 'M 162 113 Q 179 109 196 114'
                }
                fill="none"
                stroke="#2B1810"
                strokeWidth="3.3"
                strokeLinecap="round"
              />

              {/* Multi-Layered Anime Eyes (Prof. Arthur Pendelton) */}
              {blink || isEncouragingEyes ? (
                <g>
                  <path
                    d={
                      isEncouragingEyes
                        ? 'M 108 136 Q 123 126 139 136'
                        : 'M 108 137 Q 123 143 139 137'
                    }
                    fill="none"
                    stroke="#1E1B18"
                    strokeWidth="3.1"
                    strokeLinecap="round"
                  />
                  <path
                    d={
                      isEncouragingEyes
                        ? 'M 161 136 Q 177 126 192 136'
                        : 'M 161 137 Q 177 143 192 137'
                    }
                    fill="none"
                    stroke="#1E1B18"
                    strokeWidth="3.1"
                    strokeLinecap="round"
                  />
                </g>
              ) : (
                <g>
                  {/* Upper Eyelid Crease */}
                  <path
                    d="M 108 122 Q 123 118 138 122 M 162 122 Q 177 118 192 122"
                    fill="none"
                    stroke="#9C6B56"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />

                  {/* Crisp Anime Sclera */}
                  <ellipse cx="123" cy="136" rx="13.5" ry="10" fill="#FFFFFF" />
                  <ellipse cx="177" cy="136" rx="13.5" ry="10" fill="#FFFFFF" />

                  {/* Deep Sapphire-Slate Anime Irises */}
                  <ellipse
                    cx={123 + eyeDriftX}
                    cy={136 + eyeDriftY}
                    rx="8.8"
                    ry="9.2"
                    fill="url(#refArthurSapphireIris)"
                  />
                  <ellipse
                    cx={177 + eyeDriftX}
                    cy={136 + eyeDriftY}
                    rx="8.8"
                    ry="9.2"
                    fill="url(#refArthurSapphireIris)"
                  />

                  {/* Pupils */}
                  <circle cx={123 + eyeDriftX} cy={136 + eyeDriftY} r="4.2" fill="#090D16" />
                  <circle cx={177 + eyeDriftX} cy={136 + eyeDriftY} r="4.2" fill="#090D16" />

                  {/* Lower Iris Sky Crescent */}
                  <path
                    d={`M ${117 + eyeDriftX} ${140 + eyeDriftY} Q ${123 + eyeDriftX} ${143.5 + eyeDriftY} ${129 + eyeDriftX} ${140 + eyeDriftY}`}
                    fill="none"
                    stroke="#BAE6FD"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    opacity="0.88"
                  />
                  <path
                    d={`M ${171 + eyeDriftX} ${140 + eyeDriftY} Q ${177 + eyeDriftX} ${143.5 + eyeDriftY} ${183 + eyeDriftX} ${140 + eyeDriftY}`}
                    fill="none"
                    stroke="#BAE6FD"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    opacity="0.88"
                  />

                  {/* Dual Specular Catchlights */}
                  <circle cx={119.5 + eyeDriftX} cy={132 + eyeDriftY} r="2.8" fill="#FFFFFF" />
                  <circle cx={126.5 + eyeDriftX} cy={139.5 + eyeDriftY} r="1.4" fill="#FFFFFF" opacity="0.88" />
                  <circle cx={173.5 + eyeDriftX} cy={132 + eyeDriftY} r="2.8" fill="#FFFFFF" />
                  <circle cx={180.5 + eyeDriftX} cy={139.5 + eyeDriftY} r="1.4" fill="#FFFFFF" opacity="0.88" />

                  {/* Defined Upper Lash Line */}
                  <path
                    d="M 107 134 Q 123 124 139 134 M 161 134 Q 177 124 193 134"
                    fill="none"
                    stroke="#0F172A"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {/* Sculpted Straight Anime Nose Bridge & Subtle Shadow */}
              <path
                d="M 148 134 L 147 157 Q 150 160 154 158"
                fill="none"
                stroke="#9C6B56"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <polygon points="148,142 145,157 149,158" fill="#C59079" opacity="0.45" />

              {/* Sleek Dark Full-Rim Rectangular Glasses (Matching Reference Image) */}
              <g className="pointer-events-none">
                <rect
                  x="103"
                  y="123"
                  width="39"
                  height="25"
                  rx="5.5"
                  fill="rgba(255,255,255,0.04)"
                  stroke="#1E2430"
                  strokeWidth="2.6"
                />
                <rect
                  x="158"
                  y="123"
                  width="39"
                  height="25"
                  rx="5.5"
                  fill="rgba(255,255,255,0.04)"
                  stroke="#1E2430"
                  strokeWidth="2.6"
                />
                {/* Bridge & Temple Arms */}
                <path d="M 142 132 Q 150 129 158 132" fill="none" stroke="#1E2430" strokeWidth="2.4" />
                <path d="M 103 131 L 94 129 M 197 131 L 206 129" stroke="#1E2430" strokeWidth="2.2" />
                {/* Subtle Diagonal Lens Reflection */}
                <path
                  d="M 109 128 L 117 125 M 164 128 L 172 125"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              </g>

              {/* Synchronized Anime Mouth Visemes & Reference Expressions (Prof. Arthur) */}
              {mouthViseme === 'neutral' && (
                <g>
                  {isThinkingPose ? (
                    <path
                      d="M 143 177 Q 150 175.5 157 177"
                      fill="none"
                      stroke="#7C2D12"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  ) : (
                    <>
                      <path
                        d={
                          resolvedState === 'listening' || isEncouragingEyes
                            ? 'M 137 174 Q 150 183 163 174'
                            : 'M 138 175 Q 150 181 162 175'
                        }
                        fill="none"
                        stroke="#7C2D12"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                      {/* Subtle Chin Crease */}
                      <path
                        d="M 145 191 Q 150 193 155 191"
                        fill="none"
                        stroke="#B9856E"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        opacity="0.65"
                      />
                    </>
                  )}
                </g>
              )}

              {mouthViseme === 'closedM' && (
                <path
                  d="M 139 177 Q 150 179 161 177"
                  fill="none"
                  stroke="#7C2D12"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
              )}

              {mouthViseme === 'openE' && (
                <g>
                  <path
                    d="M 138 174 Q 150 172.5 162 174 Q 150 187 138 174 Z"
                    fill="#6B2130"
                    stroke="#7C2D12"
                    strokeWidth="1.2"
                  />
                  <path d="M 141 174.5 Q 150 176.5 159 174.5 Z" fill="#FFFFFF" />
                  <ellipse cx="150" cy="182.5" rx="5.2" ry="2.7" fill="#FB7185" />
                </g>
              )}

              {mouthViseme === 'openA' && (
                <g>
                  <path
                    d="M 137 173 Q 150 170.5 163 173 Q 150 192 137 173 Z"
                    fill="#6B2130"
                    stroke="#7C2D12"
                    strokeWidth="1.3"
                  />
                  <path d="M 140 173.5 Q 150 176 160 173.5 Z" fill="#FFFFFF" />
                  <ellipse cx="150" cy="185.5" rx="6.4" ry="4" fill="#FB7185" />
                </g>
              )}

              {mouthViseme === 'roundO' && (
                <g>
                  <ellipse
                    cx="150"
                    cy="179.5"
                    rx="6.4"
                    ry="7.6"
                    fill="#6B2130"
                    stroke="#7C2D12"
                    strokeWidth="1.3"
                  />
                  <ellipse cx="150" cy="183" rx="4.2" ry="2.6" fill="#FB7185" />
                </g>
              )}

              {/* Voluminous Wavy Dark-Brown Hair & Natural Parted Forehead Locks (Matching Reference) */}
              <path
                d="M 89 122 C 82 62 128 50 154 56 C 184 50 218 66 211 122 C 198 90 174 82 146 90 C 122 84 102 94 89 122 Z"
                fill="url(#refArthurBrownHair)"
                stroke="#160B06"
                strokeWidth="1.2"
              />
              {/* Wavy Forehead Strands Sweeping Naturally */}
              <path
                d="M 118 74 C 122 92 132 106 144 114 C 139 96 132 82 124 72 Z"
                fill="url(#refArthurBrownHair)"
              />
              <path
                d="M 148 70 C 156 88 168 102 180 110 C 174 92 164 78 154 68 Z"
                fill="url(#refArthurBrownHair)"
              />
              <path
                d="M 94 104 L 99 138 L 92 130 Z M 206 104 L 201 138 L 208 130 Z"
                fill="url(#refArthurBrownHair)"
              />
              {/* Warm Chestnut Wavy Hair Highlights */}
              <path
                d="M 106 82 Q 130 70 154 78 M 162 76 Q 182 72 196 86"
                fill="none"
                stroke="#7C523E"
                strokeWidth="2.3"
                strokeLinecap="round"
                opacity="0.65"
              />

              {/* Expression-Specific Hand Props (Thinking Chin-Rest or Speaking Examiner Pen) */}
              {isThinkingPose && (
                <g id="arthur-thinking-hand">
                  <path
                    d="M 134 242 L 138 202 C 142 194 158 194 164 202 L 166 242 Z"
                    fill="url(#refArthurSkin)"
                    stroke="#AD7862"
                    strokeWidth="1.4"
                  />
                  <rect x="131" y="236" width="38" height="14" rx="3" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
                </g>
              )}

              {resolvedState === 'speaking' && (
                <g id="arthur-examiner-pen-hand">
                  <path
                    d="M 176 286 C 182 266 196 254 210 254 C 218 254 222 262 218 272 L 206 290 Z"
                    fill="url(#refArthurSkin)"
                    stroke="#AD7862"
                    strokeWidth="1.4"
                  />
                  {/* Sleek Black Examiner Pen */}
                  <line
                    x1="184"
                    y1="274"
                    x2="232"
                    y2="246"
                    stroke="#0F172A"
                    strokeWidth="4.2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="226"
                    y1="249"
                    x2="235"
                    y2="244"
                    stroke="#94A3B8"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </g>
              )}
            </g>
          )}

          {/* =====================================================================
              CHARACTER 3: BARNABY — CUTE CHUBBY ANIME BOY IN BLUE "BandSprint" HOODIE
              Fluffy dark-brown hair, warm brown eyes, blue hoodie, backpack straps
             ===================================================================== */}
          {activeChar === 'barnaby' && (
            <g id="barnaby-reference-anime-rig">
              {/* Hoodie Hood Collar Behind Neck */}
              <ellipse cx="102" cy="218" rx="24" ry="14" fill="#1E3A8A" />
              <ellipse cx="198" cy="218" rx="24" ry="14" fill="#1E3A8A" />

              {/* Royal-Blue "BandSprint" Hoodie Torso */}
              <path
                d="M 62 292 C 64 234 94 212 150 212 C 206 212 236 234 238 292 Z"
                fill="url(#refBarnabyHoodie)"
                stroke="#172554"
                strokeWidth="2.2"
              />

              {/* Dark Charcoal Backpack Straps Over Shoulders */}
              <path
                d="M 92 216 C 86 240 86 266 89 292 L 105 292 C 102 266 102 240 107 214 Z"
                fill="#27272A"
              />
              <path
                d="M 208 216 C 214 240 214 266 211 292 L 195 292 C 198 266 198 240 193 214 Z"
                fill="#27272A"
              />

              {/* Hoodie Neck Seam & Drawstrings */}
              <path
                d="M 134 222 L 132 248 M 166 222 L 168 248"
                stroke="#172554"
                strokeWidth="3.2"
                strokeLinecap="round"
              />

              {/* Crisp White "BandSprint" Chest Branding */}
              <text
                x="150"
                y="258"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="17"
                fontWeight="900"
                fontFamily="sans-serif"
                letterSpacing="0.5"
              >
                IELTS
              </text>
              <text
                x="152"
                y="275"
                textAnchor="middle"
                fill="#DBEAFE"
                fontSize="15"
                fontWeight="800"
                fontFamily="sans-serif"
              >
                ≡Sprint
              </text>

              {/* Cute Neck */}
              <rect x="134" y="196" width="32" height="24" rx="10" fill="url(#refClaraSkin)" />

              {/* Round Chubby Boy Ears */}
              <circle cx="80" cy="154" r="14" fill="url(#refClaraSkin)" stroke="#C88A6D" strokeWidth="1.8" />
              <path d="M 77 150 Q 82 154 79 159" stroke="#B87A5D" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="220" cy="154" r="14" fill="url(#refClaraSkin)" stroke="#C88A6D" strokeWidth="1.8" />
              <path d="M 223 150 Q 218 154 221 159" stroke="#B87A5D" strokeWidth="1.6" strokeLinecap="round" />

              {/* Ultra-Cute Chubby Anime Boy Head & Plump Cheeks */}
              <path
                d="M 84 134 C 84 82 216 82 216 134 C 222 172 208 206 150 206 C 92 206 78 172 84 134 Z"
                fill="url(#refClaraSkin)"
                stroke="#C88A6D"
                strokeWidth="2"
              />

              {/* Rosy Chubby Cheek Blush */}
              <ellipse cx="104" cy="166" rx="17" ry="10.5" fill="url(#refCheekGlow)" />
              <ellipse cx="196" cy="166" rx="17" ry="10.5" fill="url(#refCheekGlow)" />

              {/* Friendly Expressive Dark-Brown Eyebrows */}
              <path
                d={
                  isThinkingPose
                    ? 'M 102 122 Q 118 116 134 124'
                    : activeBarnabyExpression === 'excited' || isEncouragingEyes
                    ? 'M 100 116 Q 118 106 134 116'
                    : 'M 102 119 Q 118 111 134 118'
                }
                fill="none"
                stroke="#2E160B"
                strokeWidth="4.2"
                strokeLinecap="round"
              />
              <path
                d={
                  isThinkingPose
                    ? 'M 166 116 Q 182 106 198 116'
                    : activeBarnabyExpression === 'excited' || isEncouragingEyes
                    ? 'M 166 116 Q 182 106 200 116'
                    : 'M 166 118 Q 182 111 198 119'
                }
                fill="none"
                stroke="#2E160B"
                strokeWidth="4.2"
                strokeLinecap="round"
              />

              {/* Large Expressive Warm Brown Anime Eyes */}
              {blink || isEncouragingEyes ? (
                <g>
                  <path
                    d={
                      isEncouragingEyes
                        ? 'M 103 148 Q 120 132 137 148'
                        : 'M 103 149 Q 120 158 137 149'
                    }
                    fill="none"
                    stroke="#2A140A"
                    strokeWidth="4.2"
                    strokeLinecap="round"
                  />
                  <path
                    d={
                      isEncouragingEyes
                        ? 'M 163 148 Q 180 132 197 148'
                        : 'M 163 149 Q 180 158 197 149'
                    }
                    fill="none"
                    stroke="#2A140A"
                    strokeWidth="4.2"
                    strokeLinecap="round"
                  />
                </g>
              ) : (
                <g>
                  <ellipse cx="120" cy="147" rx="18.5" ry="20.5" fill="#FFFFFF" />
                  <ellipse cx="180" cy="147" rx="18.5" ry="20.5" fill="#FFFFFF" />

                  <ellipse
                    cx={120 + eyeDriftX}
                    cy={148 + eyeDriftY}
                    rx="14"
                    ry="16"
                    fill="url(#refClaraAmberIris)"
                  />
                  <ellipse
                    cx={180 + eyeDriftX}
                    cy={148 + eyeDriftY}
                    rx="14"
                    ry="16"
                    fill="url(#refClaraAmberIris)"
                  />

                  <circle cx={120 + eyeDriftX} cy={148 + eyeDriftY} r="7.4" fill="#180A04" />
                  <circle cx={180 + eyeDriftX} cy={148 + eyeDriftY} r="7.4" fill="#180A04" />

                  {/* Warm Lower Iris Glow */}
                  <path
                    d={`M ${111 + eyeDriftX} ${156 + eyeDriftY} Q ${120 + eyeDriftX} ${162 + eyeDriftY} ${129 + eyeDriftX} ${156 + eyeDriftY}`}
                    fill="none"
                    stroke="#FDE68A"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    opacity="0.88"
                  />
                  <path
                    d={`M ${171 + eyeDriftX} ${156 + eyeDriftY} Q ${180 + eyeDriftX} ${162 + eyeDriftY} ${189 + eyeDriftX} ${156 + eyeDriftY}`}
                    fill="none"
                    stroke="#FDE68A"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    opacity="0.88"
                  />

                  {/* Big Glossy Catchlights */}
                  <circle cx={114 + eyeDriftX} cy={139.5 + eyeDriftY} r="5.4" fill="#FFFFFF" />
                  <circle cx={125.5 + eyeDriftX} cy={154 + eyeDriftY} r="2.6" fill="#FFFFFF" opacity="0.92" />
                  <circle cx={174 + eyeDriftX} cy={139.5 + eyeDriftY} r="5.4" fill="#FFFFFF" />
                  <circle cx={185.5 + eyeDriftX} cy={154 + eyeDriftY} r="2.6" fill="#FFFFFF" opacity="0.92" />

                  {/* Crisp Upper Eyelash Line */}
                  <path
                    d="M 100 141 Q 120 123 140 141 M 160 141 Q 180 123 200 141"
                    fill="none"
                    stroke="#231007"
                    strokeWidth="4.4"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {/* Cute Little Anime Nose */}
              <path
                d="M 148 156 Q 150 160 153 157.5"
                fill="none"
                stroke="#BC7B5C"
                strokeWidth="2.2"
                strokeLinecap="round"
              />

              {/* Barnaby Audio-Synced Mouth Visemes & Expressions */}
              {resolvedState === 'speaking' ? (
                mouthViseme === 'neutral' || mouthViseme === 'closedM' ? (
                  <path
                    data-mouth-state="speaking-closed"
                    d="M 139 172 Q 150 178 161 172"
                    fill="none"
                    stroke="#6B2130"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                ) : (
                  <g data-mouth-state="speaking-open">
                    <path
                      d={
                        mouthViseme === 'openA'
                          ? 'M 134 169 Q 150 166 166 169 Q 150 192 134 169 Z'
                          : 'M 136 170 Q 150 168 164 170 Q 150 187 136 170 Z'
                      }
                      fill="#9F1239"
                      stroke="#6B2130"
                      strokeWidth="1.8"
                    />
                    <path d="M 139 170 Q 150 172.5 161 170 Z" fill="#FFFFFF" />
                    <ellipse cx="150" cy="180" rx="7" ry="4.2" fill="#FB7185" />
                  </g>
                )
              ) : isThinkingPose ? (
                <path
                  data-mouth-state="thinking-closed"
                  d="M 143 175 Q 150 172 157 175"
                  fill="none"
                  stroke="#6B2130"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              ) : resolvedState === 'listening' ? (
                <path
                  data-mouth-state="listening-closed"
                  d="M 138 172 Q 150 180 162 172"
                  fill="none"
                  stroke="#6B2130"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              ) : activeBarnabyExpression === 'cheerful' ||
                activeBarnabyExpression === 'encouraging' ||
                activeBarnabyExpression === 'excited' ? (
                /* Open-Mouth Cheerful / Encouraging / Excited Expression with Cute Upper Teeth */
                <g data-mouth-state="expression-open">
                  <path
                    d="M 136 169.5 Q 150 168 164 169.5 Q 150 187 136 169.5 Z"
                    fill="#9F1239"
                    stroke="#6B2130"
                    strokeWidth="1.8"
                  />
                  <path d="M 139.5 170 Q 150 172.2 160.5 170 Z" fill="#FFFFFF" />
                  <ellipse cx="150" cy="179.5" rx="6.8" ry="3.8" fill="#FB7185" />
                </g>
              ) : (
                /* Idle / Paused / Non-Speaking Neutral Viseme: Closed, Friendly Smile */
                <path
                  id="barnaby-idle-closed-smile"
                  data-mouth-state="idle-closed-smile"
                  d="M 138 171.5 Q 150 180.5 162 171.5"
                  fill="none"
                  stroke="#6B2130"
                  strokeWidth="2.9"
                  strokeLinecap="round"
                />
              )}

              {/* Fluffy, Curly Dark-Brown Anime Boy Hair (Reference Match) */}
              <path
                d="M 78 138 C 70 84 112 58 150 60 C 188 58 230 84 222 138 C 212 108 192 96 172 106 C 160 88 134 88 122 108 C 102 96 86 110 78 138 Z"
                fill="url(#refArthurBrownHair)"
                stroke="#1E0E06"
                strokeWidth="1.8"
              />
              {/* Fluffy Top Curl Tuft & Wavy Bangs */}
              <path
                d="M 128 63 C 138 47 162 47 170 63 C 156 59 142 59 128 63 Z"
                fill="url(#refArthurBrownHair)"
              />
              <path
                d="M 104 86 C 110 106 124 118 140 120 C 134 100 122 86 104 86 Z"
                fill="url(#refArthurBrownHair)"
              />
              <path
                d="M 144 80 C 152 102 166 114 182 116 C 176 96 162 80 144 80 Z"
                fill="url(#refArthurBrownHair)"
              />
              {/* Warm Chestnut Hair Highlights */}
              <path
                d="M 106 92 Q 128 78 146 88 M 158 86 Q 180 78 198 94"
                fill="none"
                stroke="#855439"
                strokeWidth="2.8"
                strokeLinecap="round"
                opacity="0.65"
              />

              {/* Barnaby Friendly Waving Hand & Study Notebook (Matching Reference Sheet) */}
              {isThinkingPose ? (
                <g id="barnaby-thinking-pose">
                  <circle cx="164" cy="198" r="12" fill="url(#refClaraSkin)" stroke="#C88A6D" strokeWidth="1.8" />
                  <text x="208" y="88" fill="#F59E0B" fontSize="26" fontWeight="900" fontFamily="sans-serif">
                    ?
                  </text>
                </g>
              ) : (
                <g id="barnaby-wave-and-notebook">
                  {/* Friendly Waving Right Hand */}
                  <g transform="translate(46, 174) rotate(-14)">
                    <ellipse cx="18" cy="24" rx="13" ry="15" fill="url(#refClaraSkin)" stroke="#C88A6D" strokeWidth="1.8" />
                    <rect x="7" y="4" width="5.5" height="14" rx="2.7" transform="rotate(-18 7 4)" fill="url(#refClaraSkin)" stroke="#C88A6D" strokeWidth="1.4" />
                    <rect x="14" y="1" width="5.5" height="16" rx="2.7" transform="rotate(-4 14 1)" fill="url(#refClaraSkin)" stroke="#C88A6D" strokeWidth="1.4" />
                    <rect x="21" y="3" width="5.5" height="15" rx="2.7" transform="rotate(10 21 3)" fill="url(#refClaraSkin)" stroke="#C88A6D" strokeWidth="1.4" />
                    <rect x="27" y="9" width="5.5" height="12" rx="2.7" transform="rotate(26 27 9)" fill="url(#refClaraSkin)" stroke="#C88A6D" strokeWidth="1.4" />
                  </g>
                  {/* Dark Study Notebook Held Under Left Arm */}
                  <g transform="translate(188, 226) rotate(8)">
                    <rect x="0" y="0" width="36" height="48" rx="4" fill="#F8FAFC" stroke="#475569" strokeWidth="1.5" />
                    <rect x="3" y="2" width="34" height="48" rx="4" fill="#1E293B" stroke="#0F172A" strokeWidth="1.8" />
                    <circle cx="6" cy="24" r="11" fill="url(#refClaraSkin)" stroke="#C88A6D" strokeWidth="1.8" />
                  </g>
                </g>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* ================= TOP HUD BAR (NON-OVERLAPPING FLEX LAYOUT) ================= */}
      <div className="absolute top-2.5 inset-x-2.5 z-20 flex items-center justify-between gap-1.5 pointer-events-none">
        {/* Left: Optional Persona Switcher OR Character Expression Pill */}
        {showPersonaSwitcher ? (
          <div
            role="radiogroup"
            aria-label="Select Examiner Avatar Persona"
            className="pointer-events-auto flex items-center gap-0.5 p-0.5 rounded-full bg-slate-950/85 border border-white/15 backdrop-blur-md text-[10px] shrink-0"
          >
            <button
              type="button"
              role="radio"
              aria-checked={activeChar === 'clara'}
              onClick={() => handleCharacterSwitch('clara')}
              className={`px-2 py-0.5 rounded-full font-bold transition cursor-pointer ${
                activeChar === 'clara'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Dr. Clara Sterling — Female Examiner"
            >
              Dr. Clara
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={activeChar === 'arthur'}
              onClick={() => handleCharacterSwitch('arthur')}
              className={`px-2 py-0.5 rounded-full font-bold transition cursor-pointer ${
                activeChar === 'arthur'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Prof. Arthur Pendelton — Male Examiner"
            >
              Prof. Arthur
            </button>
            {(allowCompanionSelection || activeChar === 'barnaby') && (
              <button
                type="button"
                role="radio"
                aria-checked={activeChar === 'barnaby'}
                onClick={() => handleCharacterSwitch('barnaby')}
                className={`px-2 py-0.5 rounded-full font-bold transition cursor-pointer ${
                  activeChar === 'barnaby'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Barnaby — AI Learning Companion"
              >
                Barnaby
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/75 border border-white/15 backdrop-blur-md text-[10px] font-mono font-bold text-slate-200 shadow-xs truncate">
            <span className="text-sky-300">Mood:</span>
            <span>{expressionLabel}</span>
          </div>
        )}

        {/* Right: Conversational State Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] sm:text-[11px] font-bold backdrop-blur-md shadow-md transition-colors shrink-0 ${statusBadge.bg}`}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusBadge.dot}`} />
          <span className="whitespace-nowrap">{statusBadge.label}</span>
        </div>
      </div>

      {/* ================= BOTTOM EXAMINER CREDENTIALS & LIVE CADENCE PLACARD ================= */}
      <div className="absolute bottom-0 inset-x-0 px-3 py-2 flex items-center justify-between gap-2 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent z-20 backdrop-blur-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${
              resolvedState === 'error'
                ? 'bg-rose-400'
                : resolvedState === 'paused'
                ? 'bg-amber-400'
                : 'bg-emerald-400 animate-pulse'
            }`}
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs sm:text-sm font-black tracking-tight text-white leading-tight truncate">
                {displayName}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border shrink-0 ${
                  activeChar === 'barnaby'
                    ? 'bg-blue-900/90 text-blue-100 border-blue-400/40'
                    : activeChar === 'clara'
                    ? 'bg-purple-900/85 text-purple-100 border-purple-400/35'
                    : 'bg-blue-900/85 text-blue-100 border-blue-400/35'
                }`}
              >
                {certBadge}
              </span>
            </div>
            <span className="text-[10px] text-slate-300 font-medium leading-tight mt-0.5 truncate">
              {roleTitle} · {activePartLabel}
            </span>
          </div>
        </div>

        {/* Live Acoustic Cadence Indicator */}
        <div className="flex items-center gap-1 shrink-0" title="Audio Cadence & State">
          <div
            className={`w-1 rounded-full transition-all duration-150 ${
              resolvedState === 'speaking'
                ? 'h-4 bg-sky-400 animate-pulse'
                : resolvedState === 'listening'
                ? 'h-2.5 bg-emerald-400'
                : 'h-1.5 bg-slate-600'
            }`}
          />
          <div
            className={`w-1 rounded-full transition-all duration-150 ${
              resolvedState === 'speaking'
                ? 'h-6 bg-sky-400 animate-pulse'
                : resolvedState === 'listening'
                ? 'h-4 bg-emerald-400'
                : 'h-1.5 bg-slate-600'
            }`}
            style={{ animationDelay: '0.12s' }}
          />
          <div
            className={`w-1 rounded-full transition-all duration-150 ${
              resolvedState === 'speaking'
                ? 'h-3.5 bg-sky-400 animate-pulse'
                : resolvedState === 'listening'
                ? 'h-2.5 bg-emerald-400'
                : 'h-1.5 bg-slate-600'
            }`}
            style={{ animationDelay: '0.24s' }}
          />
        </div>
      </div>
    </div>
  );
};
