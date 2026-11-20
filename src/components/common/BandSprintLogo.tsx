import React from 'react';
import { BandSprintMark } from './BandSprintMark';

interface LogoProps {
  variant?: 'full' | 'symbol' | 'monochrome';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadge?: boolean;
}

export const BandSprintLogo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  showBadge = false
}) => {
  const markSize = {
    sm: 28,
    md: 34,
    lg: 44,
    xl: 56
  }[size];

  const textSize = {
    sm: 'text-sm sm:text-base',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  }[size];

  if (variant === 'symbol') {
    return <div className={`inline-flex items-center ${className}`}><BandSprintMark size={markSize} /></div>;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <BandSprintMark size={markSize} />
      <div className="flex flex-col text-left leading-none">
        <div className="flex items-center gap-1.5">
          <span className={`font-display font-bold tracking-tight ${textSize} text-[#0E1F1E] dark:text-[#EEF3F1]`}>
            BandSprint
          </span>
          {showBadge && (
            <span className="text-[10px] font-mono font-bold text-[#0F4C45] dark:text-[#1F8A70]">
              · PRO
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium text-[#566664] dark:text-slate-400 tracking-wide mt-1">
          Reach your band.
        </span>
      </div>
    </div>
  );
};
