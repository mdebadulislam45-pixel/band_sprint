import React, { useState, useEffect } from 'react';
import {
  BarnabyReferenceExpression,
  resolveBarnabyExpression
} from '../../config/avatarReferenceRegistry';

export type MascotMood =
  | 'idle'
  | 'speaking'
  | 'listening'
  | 'surprise'
  | 'thinking'
  | 'motivating'
  | 'celebrating';

interface ChubbyMascotAvatarProps {
  mood?: MascotMood;
  expressionOverride?: BarnabyReferenceExpression;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Barnaby — Cute, Chubby Anime Boy AI Learning Companion (Visual Reference Implementation)
 *
 * Matches the BandSprint Visual Reference:
 * - Cute, chubby anime-style boy mascot with fluffy dark-brown wavy hair
 * - Large expressive warm dark-brown anime eyes with glossy specular catchlights
 * - Soft round rosy cheeks and warm, playful expressions
 * - Royal-blue "BandSprint" hoodie with dark backpack straps
 * - 6 Reference Expressions: Happy, Excited, Thinking, Encouraging (thumbs-up), Listening, Cheerful
 * - Audio-synchronized mouth cadence when speaking and respects `prefers-reduced-motion`
 */
export const ChubbyMascotAvatar: React.FC<ChubbyMascotAvatarProps> = ({
  mood = 'idle',
  expressionOverride,
  size = 'md',
  className = ''
}) => {
  const [blink, setBlink] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [talkFrame, setTalkFrame] = useState<0 | 1 | 2>(0);

  const expression: BarnabyReferenceExpression = resolveBarnabyExpression(mood, expressionOverride);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  // Natural blinking loop (disabled when prefers-reduced-motion is active)
  useEffect(() => {
    if (reducedMotion) {
      setBlink(false);
      return;
    }
    let timeoutId: ReturnType<typeof setTimeout>;
    let innerId: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      const delay = 2800 + Math.random() * 2400;
      timeoutId = setTimeout(() => {
        setBlink(true);
        innerId = setTimeout(() => {
          setBlink(false);
          scheduleBlink();
        }, 115);
      }, delay);
    };
    scheduleBlink();
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(innerId);
    };
  }, [reducedMotion]);

  // Synchronized mouth cadence ONLY when Barnaby is actively speaking
  useEffect(() => {
    if (mood !== 'speaking' || reducedMotion) {
      setTalkFrame(mood === 'speaking' ? 1 : 0);
      return;
    }
    const intervalId = setInterval(() => {
      setTalkFrame((prev) => ((prev + 1) % 3) as 0 | 1 | 2);
    }, 125);
    return () => clearInterval(intervalId);
  }, [mood, reducedMotion]);

  const dim = {
    sm: 'w-9 h-9',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  }[size];

  const isSpeaking = mood === 'speaking';
  const isListening = expression === 'listening';
  const isThinking = expression === 'thinking';
  const isEncouraging = expression === 'encouraging';
  const isCheerful = expression === 'cheerful';
  const isExcited = expression === 'excited';

  const headTiltDeg = reducedMotion
    ? 0
    : isListening
    ? 3
    : isThinking
    ? -3
    : isCheerful || isExcited
    ? 2
    : 0;

  // Happy & Cheerful expressions feature joyful arched smiling eyes (`^_^`)
  const hasSmilingClosedEyes = blink || isCheerful;

  return (
    <div
      data-testid="barnaby-companion-avatar"
      data-expression={expression}
      className={`relative inline-flex items-center justify-center shrink-0 select-none transition-transform duration-300 ${dim} ${className}`}
      style={{
        transform: headTiltDeg !== 0 ? `rotate(${headTiltDeg}deg)` : undefined
      }}
      role="img"
      aria-label={`Barnaby — AI Learning Companion (${expression})`}
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md overflow-visible"
      >
        <defs>
          {/* Warm Fair-Peach Chubby Anime Skin Gradient */}
          <radialGradient id="barnabyBoySkin" cx="50%" cy="42%" r="56%">
            <stop offset="0%" stopColor="#FFF9F4" />
            <stop offset="60%" stopColor="#FFE6D4" />
            <stop offset="90%" stopColor="#F7C9AC" />
            <stop offset="100%" stopColor="#E6B192" />
          </radialGradient>

          {/* Fluffy Dark-Brown Wavy Hair Gradient */}
          <linearGradient id="barnabyBoyHair" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5C3824" />
            <stop offset="48%" stopColor="#3E2315" />
            <stop offset="100%" stopColor="#23120A" />
          </linearGradient>

          {/* Warm Chestnut-Amber Anime Iris Gradient */}
          <linearGradient id="barnabyBoyIris" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#261005" />
            <stop offset="42%" stopColor="#5C2E14" />
            <stop offset="80%" stopColor="#9A5226" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>

          {/* Soft Coral-Pink Chubby Cheek Blush */}
          <radialGradient id="barnabyBoyBlush" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FB7185" stopOpacity="0.58" />
            <stop offset="68%" stopColor="#FDA4AF" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#FDA4AF" stopOpacity="0" />
          </radialGradient>

          {/* Royal-Blue BandSprint Hoodie Gradient */}
          <linearGradient id="barnabySprintHoodie" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="55%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>
        </defs>

        {/* Soft Companion Aura Ring */}
        <circle
          cx="60"
          cy="62"
          r="52"
          fill={isSpeaking || isExcited ? 'rgba(59, 130, 246, 0.16)' : 'rgba(219, 234, 254, 0.22)'}
        />

        {/* Back Hair & Hoodie Hood Collar */}
        <ellipse cx="32" cy="84" rx="14" ry="8" fill="#1E3A8A" />
        <ellipse cx="88" cy="84" rx="14" ry="8" fill="#1E3A8A" />

        {/* Royal-Blue "BandSprint" Hoodie Torso */}
        <path
          d="M 20 116 C 21 90 36 80 60 80 C 84 80 99 90 100 116 Z"
          fill="url(#barnabySprintHoodie)"
          stroke="#172554"
          strokeWidth="2"
        />

        {/* Dark Backpack Straps on Both Shoulders */}
        <path
          d="M 34 83 C 31 94 31 105 33 116 L 40 116 C 38 105 38 94 41 82 Z"
          fill="#27272A"
        />
        <path
          d="M 86 83 C 89 94 89 105 87 116 L 80 116 C 82 105 82 94 79 82 Z"
          fill="#27272A"
        />

        {/* Hoodie Drawstrings */}
        <path
          d="M 52 85 L 51 98 M 68 85 L 69 98"
          stroke="#1E3A8A"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Crisp White "BandSprint" Chest Logo */}
        <text
          x="60"
          y="103"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="8.5"
          fontWeight="900"
          fontFamily="sans-serif"
          letterSpacing="0.3"
        >
          IELTS
        </text>
        <text
          x="62"
          y="111.5"
          textAnchor="middle"
          fill="#DBEAFE"
          fontSize="7.5"
          fontWeight="800"
          fontFamily="sans-serif"
        >
          ≡Sprint
        </text>

        {/* Cute Neck */}
        <rect x="51" y="73" width="18" height="12" rx="6" fill="url(#barnabyBoySkin)" />

        {/* Round Anime Boy Ears */}
        <circle cx="22" cy="56" r="8" fill="url(#barnabyBoySkin)" stroke="#D49A7D" strokeWidth="1.6" />
        <path d="M 20 54 Q 23 56 21 59" stroke="#C6886B" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="98" cy="56" r="8" fill="url(#barnabyBoySkin)" stroke="#D49A7D" strokeWidth="1.6" />
        <path d="M 100 54 Q 97 56 99 59" stroke="#C6886B" strokeWidth="1.4" strokeLinecap="round" />

        {/* Plump, Cute Chubby Anime Boy Head & Squishy Cheeks */}
        <path
          d="M 24 48 C 24 22 96 22 96 48 C 99 66 92 81 60 81 C 28 81 21 66 24 48 Z"
          fill="url(#barnabyBoySkin)"
          stroke="#C88A6D"
          strokeWidth="1.8"
        />

        {/* Soft Coral-Pink Chubby Cheek Blush */}
        <ellipse cx="35" cy="63" rx="9.5" ry="5.8" fill="url(#barnabyBoyBlush)" />
        <ellipse cx="85" cy="63" rx="9.5" ry="5.8" fill="url(#barnabyBoyBlush)" />

        {/* Expressive Dark-Brown Eyebrows */}
        <path
          d={
            isThinking
              ? 'M 33 41 Q 42 38 50 42'
              : isExcited || isCheerful
              ? 'M 33 38 Q 42 33 50 38'
              : 'M 34 40 Q 42 36 50 39'
          }
          stroke="#2E160B"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d={
            isThinking
              ? 'M 70 38 Q 78 33 87 38'
              : isExcited || isCheerful
              ? 'M 70 38 Q 78 33 87 38'
              : 'M 70 39 Q 78 36 86 40'
          }
          stroke="#2E160B"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Large Expressive Warm Brown Anime Eyes */}
        {hasSmilingClosedEyes ? (
          <g>
            <path
              d={
                isCheerful
                  ? 'M 34 53 Q 43 44 52 53'
                  : 'M 34 54 Q 43 59 52 54'
              }
              stroke="#2A140A"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path
              d={
                isCheerful
                  ? 'M 68 53 Q 77 44 86 53'
                  : 'M 68 54 Q 77 59 86 54'
              }
              stroke="#2A140A"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
          </g>
        ) : (
          <g>
            {/* Sclera */}
            <ellipse cx="43" cy="53" rx="10.2" ry="11.2" fill="#FFFFFF" />
            <ellipse cx="77" cy="53" rx="10.2" ry="11.2" fill="#FFFFFF" />

            {/* Warm Chestnut-Amber Anime Irises */}
            <ellipse
              cx={isThinking ? 44.5 : 43.5}
              cy={isThinking ? 51.5 : 53.5}
              rx="7.8"
              ry="9"
              fill="url(#barnabyBoyIris)"
            />
            <ellipse
              cx={isThinking ? 78.5 : 76.5}
              cy={isThinking ? 51.5 : 53.5}
              rx="7.8"
              ry="9"
              fill="url(#barnabyBoyIris)"
            />

            {/* Deep Pupils */}
            <circle cx={isThinking ? 44.5 : 43.5} cy={isThinking ? 51.5 : 53.5} r="4.1" fill="#180A04" />
            <circle cx={isThinking ? 78.5 : 76.5} cy={isThinking ? 51.5 : 53.5} r="4.1" fill="#180A04" />

            {/* Warm Lower Iris Crescent */}
            <path
              d="M 38.5 58 Q 43.5 61.5 48.5 58"
              stroke="#FDE68A"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.85"
            />
            <path
              d="M 71.5 58 Q 76.5 61.5 81.5 58"
              stroke="#FDE68A"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.85"
            />

            {/* Glossy Anime Specular Catchlights */}
            <circle cx="40" cy="48.5" r="3.1" fill="#FFFFFF" />
            <circle cx="46.5" cy="56.5" r="1.5" fill="#FFFFFF" opacity="0.9" />
            <circle cx="73" cy="48.5" r="3.1" fill="#FFFFFF" />
            <circle cx="79.5" cy="56.5" r="1.5" fill="#FFFFFF" opacity="0.9" />

            {/* Upper Eyelash Arc */}
            <path
              d="M 32.5 50 Q 43 40.5 53 49.5"
              stroke="#231007"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path
              d="M 67 49.5 Q 77 40.5 87.5 50"
              stroke="#231007"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* Cute Anime Button Nose */}
        <path
          d="M 59 57 Q 60 59.5 61.5 58"
          stroke="#BC7B5C"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Expressive Mouth (Audio-Synced when speaking, or matching Reference Expression) */}
        {isSpeaking ? (
          talkFrame === 1 ? (
            <g>
              <path
                d="M 51 64.5 Q 60 63 69 64.5 Q 60 76 51 64.5 Z"
                fill="#9F1239"
                stroke="#6B2130"
                strokeWidth="1.4"
              />
              <path d="M 53.5 65 Q 60 66.5 66.5 65 Z" fill="#FFFFFF" />
              <ellipse cx="60" cy="70.5" rx="4.8" ry="2.7" fill="#FB7185" />
            </g>
          ) : talkFrame === 2 ? (
            <g>
              <ellipse
                cx="60"
                cy="68.5"
                rx="5"
                ry="5.2"
                fill="#9F1239"
                stroke="#6B2130"
                strokeWidth="1.4"
              />
              <ellipse cx="60" cy="70.5" rx="3.4" ry="2" fill="#FB7185" />
            </g>
          ) : (
            <path
              d="M 53 66 Q 60 70 67 66"
              stroke="#6B2130"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          )
        ) : isThinking ? (
          <path
            d="M 56 67 Q 60 65.5 64 67"
            stroke="#6B2130"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        ) : isListening ? (
          <path
            d="M 53 66 Q 60 71 67 66"
            stroke="#6B2130"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
        ) : isCheerful || isEncouraging || isExcited ? (
          /* Joyful Open Anime Smile with Cute Upper Teeth & Warm Tongue (Excited / Encouraging / Cheerful) */
          <g data-mouth-state="expression-open">
            <path
              d="M 51.5 64.5 Q 60 63.5 68.5 64.5 Q 60 75 51.5 64.5 Z"
              fill="#9F1239"
              stroke="#6B2130"
              strokeWidth="1.4"
            />
            <path d="M 54 64.8 Q 60 66.2 66 64.8 Z" fill="#FFFFFF" />
            <ellipse cx="60" cy="70" rx="4.6" ry="2.6" fill="#FB7185" />
          </g>
        ) : (
          /* Idle / Non-Speaking Neutral State: Closed, Friendly Smile */
          <path
            id="barnaby-mascot-idle-closed-smile"
            data-mouth-state="idle-closed-smile"
            d="M 52.5 65.5 Q 60 71.5 67.5 65.5"
            stroke="#6B2130"
            strokeWidth="2.3"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Fluffy, Voluminous Dark-Brown Wavy Boy Hair & Curls */}
        <path
          d="M 21 50 C 17 24 40 12 60 13 C 82 12 103 24 99 50 C 94 34 83 28 72 34 C 65 24 50 24 44 35 C 34 29 25 36 21 50 Z"
          fill="url(#barnabyBoyHair)"
          stroke="#1E0E06"
          strokeWidth="1.5"
        />
        {/* Fluffy Top Curl Tuft & Wavy Forehead Locks */}
        <path
          d="M 48 15 C 53 7 66 7 70 15 C 63 13 55 13 48 15 Z"
          fill="url(#barnabyBoyHair)"
        />
        <path
          d="M 34 25 C 38 35 46 41 54 42 C 51 32 45 24 34 25 Z"
          fill="url(#barnabyBoyHair)"
        />
        <path
          d="M 56 22 C 60 34 68 40 76 41 C 73 30 66 22 56 22 Z"
          fill="url(#barnabyBoyHair)"
        />
        {/* Warm Chestnut Hair Highlights */}
        <path
          d="M 36 28 Q 48 21 58 26 M 64 25 Q 76 21 86 29"
          stroke="#855439"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.65"
        />

        {/* Expression-Specific Hand Gestures & Visual Reference Accents */}
        {isEncouraging && (
          /* Thumbs-Up Hand Gesture (Encouraging Reference Card) */
          <g transform="translate(14, 74)">
            <circle cx="10" cy="14" r="8" fill="url(#barnabyBoySkin)" stroke="#C88A6D" strokeWidth="1.5" />
            <rect x="8" y="2" width="5" height="9" rx="2.5" fill="url(#barnabyBoySkin)" stroke="#C88A6D" strokeWidth="1.5" />
          </g>
        )}

        {isThinking && (
          /* Thoughtful Hand on Chin + Orange '?' Accent (Thinking Reference Card) */
          <g>
            <circle cx="67" cy="76" r="6.5" fill="url(#barnabyBoySkin)" stroke="#C88A6D" strokeWidth="1.5" />
            <text x="95" y="26" fill="#F59E0B" fontSize="15" fontWeight="900" fontFamily="sans-serif">
              ?
            </text>
          </g>
        )}

        {(isCheerful || isExcited) && (
          /* Cheering / Waving Hands + Blue Sparkle Accents */
          <g>
            <circle cx="15" cy="72" r="7" fill="url(#barnabyBoySkin)" stroke="#C88A6D" strokeWidth="1.5" />
            <circle cx="105" cy="72" r="7" fill="url(#barnabyBoySkin)" stroke="#C88A6D" strokeWidth="1.5" />
            <path d="M 96 18 L 99 24 L 105 21 L 99 27 L 96 33 L 93 27 L 87 21 L 93 24 Z" fill="#3B82F6" opacity="0.85" />
          </g>
        )}
      </svg>
    </div>
  );
};
