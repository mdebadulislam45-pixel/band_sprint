import React from 'react';
import { LucideIcon } from 'lucide-react';

export type Icon3DVariant = 
  | 'blue' 
  | 'indigo' 
  | 'purple' 
  | 'emerald' 
  | 'amber' 
  | 'rose' 
  | 'cyan' 
  | 'gold' 
  | 'slate';

export type Icon3DSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface Icon3DPickerProps {
  icon?: LucideIcon;
  variant?: Icon3DVariant;
  size?: Icon3DSize;
  className?: string;
  glow?: boolean;
  animateHover?: boolean;
  children?: React.ReactNode;
}

const variantStyles: Record<Icon3DVariant, {
  bg: string;
  border: string;
  iconColor: string;
  shadow: string;
  glowColor: string;
}> = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-500 via-indigo-600 to-blue-700',
    border: 'border-blue-300/60 dark:border-blue-400/30',
    iconColor: 'text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]',
    shadow: 'shadow-[0_8px_16px_-4px_rgba(37,99,235,0.4),inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.25)]',
    glowColor: 'shadow-blue-500/30',
  },
  indigo: {
    bg: 'bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-800',
    border: 'border-indigo-300/60 dark:border-indigo-400/30',
    iconColor: 'text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]',
    shadow: 'shadow-[0_8px_16px_-4px_rgba(79,70,229,0.4),inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.25)]',
    glowColor: 'shadow-indigo-500/30',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-500 via-fuchsia-600 to-purple-800',
    border: 'border-purple-300/60 dark:border-purple-400/30',
    iconColor: 'text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]',
    shadow: 'shadow-[0_8px_16px_-4px_rgba(147,51,234,0.4),inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.25)]',
    glowColor: 'shadow-purple-500/30',
  },
  emerald: {
    bg: 'bg-gradient-to-br from-emerald-400 via-teal-600 to-emerald-800',
    border: 'border-emerald-300/60 dark:border-emerald-400/30',
    iconColor: 'text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]',
    shadow: 'shadow-[0_8px_16px_-4px_rgba(16,185,129,0.4),inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.25)]',
    glowColor: 'shadow-emerald-500/30',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-400 via-orange-500 to-amber-700',
    border: 'border-amber-200/70 dark:border-amber-400/30',
    iconColor: 'text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]',
    shadow: 'shadow-[0_8px_16px_-4px_rgba(245,158,11,0.4),inset_0_1.5px_1px_rgba(255,255,255,0.8),inset_0_-2px_4px_rgba(0,0,0,0.25)]',
    glowColor: 'shadow-amber-500/30',
  },
  rose: {
    bg: 'bg-gradient-to-br from-rose-400 via-red-500 to-pink-700',
    border: 'border-rose-200/70 dark:border-rose-400/30',
    iconColor: 'text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]',
    shadow: 'shadow-[0_8px_16px_-4px_rgba(244,63,94,0.4),inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.25)]',
    glowColor: 'shadow-rose-500/30',
  },
  cyan: {
    bg: 'bg-gradient-to-br from-cyan-400 via-teal-500 to-blue-700',
    border: 'border-cyan-200/70 dark:border-cyan-400/30',
    iconColor: 'text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]',
    shadow: 'shadow-[0_8px_16px_-4px_rgba(6,182,212,0.4),inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.25)]',
    glowColor: 'shadow-cyan-500/30',
  },
  gold: {
    bg: 'bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-700',
    border: 'border-yellow-200/80 dark:border-yellow-400/40',
    iconColor: 'text-slate-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]',
    shadow: 'shadow-[0_8px_16px_-4px_rgba(234,179,8,0.45),inset_0_1.5px_1px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.2)]',
    glowColor: 'shadow-yellow-500/40',
  },
  slate: {
    bg: 'bg-gradient-to-br from-slate-600 via-slate-700 to-slate-900',
    border: 'border-slate-400/40 dark:border-slate-500/30',
    iconColor: 'text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]',
    shadow: 'shadow-[0_8px_16px_-4px_rgba(71,85,105,0.4),inset_0_1.5px_1px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.3)]',
    glowColor: 'shadow-slate-500/30',
  }
};

const sizeStyles: Record<Icon3DSize, {
  container: string;
  iconSize: string;
}> = {
  xs: { container: 'w-6 h-6 rounded-lg border', iconSize: 'w-3 h-3' },
  sm: { container: 'w-8 h-8 rounded-xl border', iconSize: 'w-4 h-4' },
  md: { container: 'w-10 h-10 rounded-2xl border', iconSize: 'w-5 h-5' },
  lg: { container: 'w-12 h-12 rounded-2xl border-2', iconSize: 'w-6 h-6' },
  xl: { container: 'w-14 h-14 rounded-3xl border-2', iconSize: 'w-7 h-7' },
  '2xl': { container: 'w-16 h-16 rounded-[1.25rem] border-2', iconSize: 'w-8 h-8' }
};

export const Icon3D: React.FC<Icon3DPickerProps> = ({
  icon: Icon,
  variant = 'blue',
  size = 'md',
  className = '',
  glow = true,
  animateHover = true,
  children
}) => {
  const v = variantStyles[variant] || variantStyles.blue;
  const s = sizeStyles[size] || sizeStyles.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${s.container} ${v.bg} ${v.border} ${v.shadow} ${glow ? v.glowColor : ''} ${
        animateHover
          ? 'transition-all duration-300 hover:-translate-y-1 hover:rotate-2 hover:scale-105 active:translate-y-0 active:scale-95'
          : ''
      } ${className}`}
    >
      {/* 3D Top Specular Light Reflection Ring */}
      <span className="absolute inset-x-0 top-0 h-[40%] rounded-t-[inherit] bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />

      {/* 3D Bottom Ambient Occlusion Curve */}
      <span className="absolute inset-x-0 bottom-0 h-[30%] rounded-b-[inherit] bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />

      {/* Icon or Graphic Content */}
      {Icon && <Icon className={`${s.iconSize} ${v.iconColor} relative z-10 transition-transform duration-200`} />}
      {children}
    </div>
  );
};
