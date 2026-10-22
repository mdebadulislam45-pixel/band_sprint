import React from 'react';

interface LogoProps {
  variant?: 'full' | 'symbol' | 'monochrome';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadge?: boolean;
}

/**
 * IELTS Sprint Flagship Brand Mark
 *
 * Precision architectural crest combining a royal-blue squircle shield,
 * dual ascending velocity chevrons, and a four-point golden Band-9 apex star.
 */
export const IELTSSprintLogo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  showBadge = false
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7 sm:w-8 sm:h-8',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }[size];

  const textSize = {
    sm: 'text-sm sm:text-base',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  }[size];

  const isMonochrome = variant === 'monochrome';

  const SymbolSvg = (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${iconDimensions} shrink-0 drop-shadow-2xs`}
      aria-label="IELTS Sprint Emblem"
    >
      <defs>
        <linearGradient id="sprintCrestBg" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E40AF" />
          <stop offset="52%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="sprintWingPrimary" x1="16" y1="16" x2="46" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#DBEAFE" />
        </linearGradient>
        <linearGradient id="sprintGoldApex" x1="38" y1="10" x2="50" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      {/* Precision Squircle Shield Base */}
      <rect
        x="3"
        y="3"
        width="58"
        height="58"
        rx="16"
        fill={isMonochrome ? 'currentColor' : 'url(#sprintCrestBg)'}
      />

      {!isMonochrome && (
        <rect
          x="4.5"
          y="4.5"
          width="55"
          height="55"
          rx="14.5"
          stroke="white"
          strokeOpacity="0.2"
          strokeWidth="1.5"
        />
      )}

      {/* Primary Ascending Wing (Academic Foundation) */}
      <path
        d="M15 45L26.5 19H33.5L22 45H15Z"
        fill={isMonochrome ? 'white' : '#93C5FD'}
        fillOpacity={isMonochrome ? '0.65' : '0.7'}
      />

      {/* Secondary High-Velocity Sprint Chevron */}
      <path
        d="M26.5 45L38 19H45L33.5 45H26.5Z"
        fill={isMonochrome ? 'white' : 'url(#sprintWingPrimary)'}
      />

      {/* Golden Band 9 Four-Point Star Apex */}
      <path
        d="M44 10L45.6 14.4L50 16L45.6 17.6L44 22L42.4 17.6L38 16L42.4 14.4L44 10Z"
        fill={isMonochrome ? 'white' : 'url(#sprintGoldApex)'}
      />
    </svg>
  );

  if (variant === 'symbol') {
    return <div className={`inline-flex items-center ${className}`}>{SymbolSvg}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {SymbolSvg}
      <div className="flex flex-col text-left leading-none">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-black tracking-tight ${textSize} ${
              isMonochrome ? 'text-current' : 'text-slate-900 dark:text-white'
            }`}
          >
            IELTS <span className={isMonochrome ? 'text-current' : 'text-blue-600 dark:text-blue-400'}>SPRINT</span>
          </span>
          {showBadge && (
            <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
              · PRO
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-wide mt-1">
          Cambridge Preparation Suite
        </span>
      </div>
    </div>
  );
};
