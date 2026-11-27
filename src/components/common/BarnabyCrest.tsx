import React from 'react';

export interface BarnabyCrestProps {
  size?: number;
  variant?: 'badge' | 'inline' | 'constellation';
  animated?: boolean;
  className?: string;
  label?: string;
}

/**
 * Custom Eclipse-Star Crest for Barnaby (STUDEXO — IELTS Sprint / BandSprint).
 * Combines an abstract eclipse ring, subtle crescent, and tiny four-point star
 * in warm gold (#F59E0B) on deep emerald (#134E41).
 */
export const BarnabyCrest: React.FC<BarnabyCrestProps> = ({
  size = 28,
  variant = 'inline',
  animated = false,
  className = '',
  label = 'Barnaby Eclipse-Star Crest',
}) => {
  const wrapperClass =
    variant === 'badge'
      ? 'inline-flex items-center justify-center rounded-full bg-[#134E41] border border-[#F59E0B]/45 p-1.5 shadow-xs'
      : variant === 'constellation'
      ? 'inline-flex items-center justify-center rounded-xl bg-[#134E41] border border-[#F59E0B]/50 p-2 shadow-xs'
      : 'inline-flex items-center justify-center';

  return (
    <span
      role="img"
      aria-label={label}
      data-testid="barnaby-eclipse-crest"
      className={`${wrapperClass} ${animated ? 'barnaby-spark-accent' : ''} ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="block shrink-0"
      >
        {/* Deep Emerald Crest Field */}
        <circle cx="18" cy="18" r="16.5" fill="#134E41" stroke="#F59E0B" strokeOpacity="0.45" strokeWidth="1.2" />

        {/* Abstract Eclipse Outer Ring */}
        <circle
          cx="18"
          cy="18"
          r="11.2"
          stroke="#F59E0B"
          strokeWidth="1.6"
          strokeOpacity="0.92"
        />

        {/* Subtle Inner Crescent Shadow */}
        <path
          d="M21.8 11.2C17.8 11.5 14.8 14.8 14.8 18.8C14.8 22.8 17.8 26.1 21.8 26.4C17.3 27.3 12.6 24.4 11.7 19.9C10.8 15.4 13.7 10.9 18.2 10C19.4 9.8 20.6 10.3 21.8 11.2Z"
          fill="#F59E0B"
          fillOpacity="0.95"
        />

        {/* Tiny Four-Point Celestial Star */}
        <path
          d="M24.2 11.4L24.95 13.45L27 14.2L24.95 14.95L24.2 17L23.45 14.95L21.4 14.2L23.45 13.45L24.2 11.4Z"
          fill="#FDE68A"
        />
      </svg>
    </span>
  );
};
