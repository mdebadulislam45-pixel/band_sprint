import React from 'react';

export type MascotMood = 'idle' | 'speaking' | 'surprise' | 'thinking' | 'motivating';

interface ChubbyMascotAvatarProps {
  mood?: MascotMood;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Barnaby — The Cute Chubby Cambridge Scholar Mascot
 *
 * A plump, round-cheeked British academic owl-bear companion wearing
 * a tiny Cambridge mortarboard cap, golden spectacles, and a royal-blue scarf.
 */
export const ChubbyMascotAvatar: React.FC<ChubbyMascotAvatarProps> = ({
  mood = 'idle',
  size = 'md',
  className = ''
}) => {
  const dim = {
    sm: 'w-9 h-9',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  }[size];

  const isSpeaking = mood === 'speaking';
  const isSurprise = mood === 'surprise' || mood === 'motivating';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${dim} ${
        isSurprise ? 'animate-bounce' : ''
      } ${className}`}
      aria-label="Barnaby Chubby AI Tutor Mascot"
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm overflow-visible"
      >
        <defs>
          <radialGradient id="chubbyBodyGrad" cx="50%" cy="45%" r="52%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="55%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </radialGradient>
          <radialGradient id="chubbyBellyGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFBEB" />
            <stop offset="100%" stopColor="#FEF3C7" />
          </radialGradient>
          <linearGradient id="scarfGrad" x1="20" y1="60" x2="80" y2="75" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1D4ED8" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
        </defs>

        {/* Cute Plump Round Ears */}
        <circle cx="24" cy="28" r="11" fill="#D97706" />
        <circle cx="24" cy="28" r="6" fill="#FDE68A" />
        <circle cx="76" cy="28" r="11" fill="#D97706" />
        <circle cx="76" cy="28" r="6" fill="#FDE68A" />

        {/* Ultra-Chubby Plump Body & Cheeks */}
        <ellipse cx="50" cy="57" rx="37" ry="34" fill="url(#chubbyBodyGrad)" />
        {/* Extra Chubby Lower Cheek Pouches */}
        <circle cx="23" cy="56" r="14" fill="url(#chubbyBodyGrad)" />
        <circle cx="77" cy="56" r="14" fill="url(#chubbyBodyGrad)" />

        {/* Soft Cream Chubby Tummy Patch */}
        <ellipse cx="50" cy="68" rx="23" ry="19" fill="url(#chubbyBellyGrad)" />
        {/* Cute Tummy Tuft Marks */}
        <path
          d="M44 63 Q47 66 50 63 M50 63 Q53 66 56 63 M47 70 Q50 73 53 70"
          stroke="#F59E0B"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />

        {/* Chubby Little Waving Paws / Wings */}
        <ellipse
          cx="13"
          cy={isSurprise || isSpeaking ? '50' : '58'}
          rx="8"
          ry="11"
          transform={isSurprise || isSpeaking ? 'rotate(-28 13 50)' : 'rotate(15 13 58)'}
          fill="#D97706"
        />
        <ellipse
          cx="87"
          cy={isSurprise || isSpeaking ? '50' : '58'}
          rx="8"
          ry="11"
          transform={isSurprise || isSpeaking ? 'rotate(28 87 50)' : 'rotate(-15 87 58)'}
          fill="#D97706"
        />

        {/* Rosy Chubby Blush Cheeks */}
        <ellipse cx="24" cy="53" rx="6.5" ry="4.2" fill="#FB7185" opacity="0.65" />
        <ellipse cx="76" cy="53" rx="6.5" ry="4.2" fill="#FB7185" opacity="0.65" />

        {/* White Eye Patches */}
        <circle cx="36" cy="45" r="11" fill="#FFFBEB" />
        <circle cx="64" cy="45" r="11" fill="#FFFBEB" />

        {/* Big Glossy Kawaii Eyes */}
        <circle cx="37" cy="45" r="6.8" fill="#0F172A" />
        <circle cx="63" cy="45" r="6.8" fill="#0F172A" />
        {/* Eye Sparkles */}
        <circle cx="35" cy="42.5" r="2.4" fill="#FFFFFF" />
        <circle cx="39.2" cy="47" r="1.1" fill="#FFFFFF" />
        <circle cx="61" cy="42.5" r="2.4" fill="#FFFFFF" />
        <circle cx="65.2" cy="47" r="1.1" fill="#FFFFFF" />

        {/* Golden Cambridge Spectacles */}
        <circle cx="36" cy="45" r="10.5" stroke="#B45309" strokeWidth="2.2" fill="none" />
        <circle cx="64" cy="45" r="10.5" stroke="#B45309" strokeWidth="2.2" fill="none" />
        <path d="M46.5 45 Q50 42.5 53.5 45" stroke="#B45309" strokeWidth="2.2" fill="none" />

        {/* Cute Button Nose & Expressive Mouth */}
        <ellipse cx="50" cy="50" rx="4.2" ry="3" fill="#78350F" />
        {isSpeaking ? (
          <ellipse cx="50" cy="56" rx="4.5" ry="4" fill="#EF4444" stroke="#78350F" strokeWidth="1.5" />
        ) : isSurprise ? (
          <path
            d="M44 54 Q50 61 56 54 Z"
            fill="#FB7185"
            stroke="#78350F"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M45 54 Q47.5 57 50 54 Q52.5 57 55 54"
            stroke="#78350F"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Cozy Cambridge Royal-Blue Scarf */}
        <path
          d="M23 63 Q50 71 77 63 L75 70 Q50 78 25 70 Z"
          fill="url(#scarfGrad)"
        />
        {/* Scarf Gold Stripes & Hanging Tail */}
        <path d="M62 67 L67 83 L57 83 L56 68 Z" fill="#1D4ED8" />
        <path d="M57 78 L66 78" stroke="#FBBF24" strokeWidth="2.5" />

        {/* Cute Little Plump Feet */}
        <ellipse cx="36" cy="89" rx="7.5" ry="4.5" fill="#B45309" />
        <ellipse cx="64" cy="89" rx="7.5" ry="4.5" fill="#B45309" />

        {/* Miniature Cambridge Mortarboard Academic Cap */}
        <polygon points="50,6 76,16 50,25 24,16" fill="#0F172A" stroke="#334155" strokeWidth="1.2" />
        <path d="M35 20 L35 27 Q50 32 65 27 L65 20" fill="#1E293B" />
        {/* Golden Tassel */}
        <circle cx="50" cy="15.5" r="2.2" fill="#FBBF24" />
        <path d="M50 15.5 Q66 18 71 27" stroke="#FBBF24" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="71" cy="27.5" r="2.5" fill="#F59E0B" />
      </svg>
    </div>
  );
};
