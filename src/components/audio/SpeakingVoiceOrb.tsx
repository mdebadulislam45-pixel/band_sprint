import React from 'react';
import { Volume2, Mic, Activity, Sparkles } from 'lucide-react';

export type VoiceOrbState = 'idle' | 'examiner_speaking' | 'recording' | 'thinking' | 'feedback';

interface SpeakingVoiceOrbProps {
  state: VoiceOrbState;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  compact?: boolean;
  label?: string;
  sublabel?: string;
  volumeLevel?: number; // 0 to 1
  onClick?: () => void;
  className?: string;
}

export const SpeakingVoiceOrb: React.FC<SpeakingVoiceOrbProps> = ({
  state,
  size = 'md',
  compact = false,
  label,
  sublabel,
  volumeLevel = 0,
  onClick,
  className = ''
}) => {
  const sizeMap = {
    xs: { container: 'w-12 h-12', icon: 'w-5 h-5', ring1: 'w-14 h-14', ring2: 'w-16 h-16' },
    sm: { container: 'w-16 h-16', icon: 'w-6 h-6', ring1: 'w-20 h-20', ring2: 'w-24 h-24' },
    md: { container: 'w-32 h-32', icon: 'w-8 h-8', ring1: 'w-40 h-40', ring2: 'w-48 h-48' },
    lg: { container: 'w-44 h-44', icon: 'w-10 h-10', ring1: 'w-52 h-52', ring2: 'w-60 h-60' }
  };

  const currentSize = sizeMap[size];

  const resolvedLabel =
    label ||
    (state === 'examiner_speaking'
      ? 'Examiner Speaking'
      : state === 'recording'
      ? 'Listening'
      : state === 'thinking'
      ? 'Analyzing Response'
      : state === 'feedback'
      ? 'Feedback Ready'
      : 'Ready to Speak');

  const resolvedSublabel =
    sublabel ||
    (state === 'examiner_speaking'
      ? 'Listen carefully to the question'
      : state === 'recording'
      ? 'Speak clearly at your natural pace'
      : state === 'thinking'
      ? 'Evaluating against 4 IELTS criteria…'
      : state === 'feedback'
      ? 'Band 8+ suggestions ready'
      : 'Tap microphone or press spacebar');

  const orbColors =
    state === 'examiner_speaking'
      ? 'bg-[#0F4C45] text-white ring-4 ring-[#1F8A70]/35'
      : state === 'recording'
      ? 'bg-emerald-600 text-white ring-4 ring-emerald-400/35'
      : state === 'thinking'
      ? 'bg-[#0F4C45] text-white ring-4 ring-[#F4A62A]/40'
      : state === 'feedback'
      ? 'bg-[#F4A62A] text-[#0E1F1E] ring-4 ring-[#F4A62A]/35'
      : 'bg-[#0E1F1E] text-white ring-4 ring-[#D3DDDA] dark:ring-[#1E3533] hover:ring-[#0F4C45]/50';

  if (compact) {
    return (
      <div className={`flex items-center gap-3 select-none min-w-0 ${className}`}>
        <button
          type="button"
          onClick={onClick}
          aria-label={resolvedLabel}
          className={`relative shrink-0 ${sizeMap.xs.container} rounded-full flex items-center justify-center shadow-sm transition-all duration-200 cursor-pointer active:scale-95 ${orbColors}`}
        >
          {state === 'examiner_speaking' && <Volume2 className="w-5 h-5" />}
          {state === 'recording' && <Mic className="w-5 h-5 animate-pulse" />}
          {state === 'thinking' && <Activity className="w-5 h-5 animate-spin" />}
          {state === 'feedback' && <Sparkles className="w-5 h-5" />}
          {state === 'idle' && <Mic className="w-5 h-5 text-white/90" />}
        </button>
        <div className="min-w-0 text-left">
          <div className="text-xs sm:text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1] leading-tight truncate">
            {resolvedLabel}
          </div>
          <div className="text-[11px] text-[#566664] dark:text-[#9AAEA9] leading-tight mt-0.5 truncate">
            {resolvedSublabel}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center text-center p-2 sm:p-4 select-none ${className}`}>
      {/* Outer Ripple Area */}
      <div className="relative flex items-center justify-center my-2">
        {state === 'recording' && (
          <div
            className={`absolute ${currentSize.ring2} rounded-full bg-emerald-500/15 pointer-events-none transition-transform duration-150`}
            style={{ transform: `scale(${1 + volumeLevel * 0.35})` }}
          />
        )}
        {state === 'thinking' && (
          <div
            className={`absolute ${currentSize.ring2} rounded-full border-2 border-[#0F4C45]/25 border-t-[#0F4C45] animate-spin pointer-events-none`}
          />
        )}

        {/* Secondary Concentric Ring */}
        <div
          className={`absolute ${currentSize.ring1} rounded-full transition-all duration-300 pointer-events-none ${
            state === 'examiner_speaking'
              ? 'bg-[#0F4C45]/15 border border-[#0F4C45]/30'
              : state === 'recording'
              ? 'bg-emerald-600/15 border border-emerald-400/40'
              : state === 'thinking'
              ? 'bg-[#F4A62A]/15 border border-[#F4A62A]/40'
              : state === 'feedback'
              ? 'bg-[#F4A62A]/20 border border-[#F4A62A]/40'
              : 'bg-[#EEF3F1] dark:bg-[#162927]'
          }`}
          style={state === 'recording' ? { transform: `scale(${1 + volumeLevel * 0.2})` } : undefined}
        />

        {/* Central Core Orb */}
        <button
          type="button"
          onClick={onClick}
          aria-label={resolvedLabel}
          className={`relative ${currentSize.container} rounded-full flex flex-col items-center justify-center shadow-lg transition-all duration-200 z-10 cursor-pointer active:scale-95 ${orbColors}`}
        >
          {state === 'examiner_speaking' && <Volume2 className={currentSize.icon} />}
          {state === 'recording' && <Mic className={`${currentSize.icon} animate-pulse`} />}
          {state === 'thinking' && <Activity className={`${currentSize.icon} animate-spin`} />}
          {state === 'feedback' && <Sparkles className={currentSize.icon} />}
          {state === 'idle' && <Mic className={`${currentSize.icon} text-white/90`} />}

          {(state === 'examiner_speaking' || state === 'recording') && size !== 'sm' && (
            <div className="flex items-center gap-1 mt-2">
              <span className="w-1 h-2.5 rounded-full bg-white/90 animate-pulse" />
              <span className="w-1 h-4 rounded-full bg-white/90 animate-[pulse_0.6s_infinite]" />
              <span className="w-1 h-3 rounded-full bg-white/90 animate-[pulse_0.8s_infinite]" />
              <span className="w-1 h-2 rounded-full bg-white/90 animate-pulse" />
            </div>
          )}
        </button>
      </div>

      {/* Label and Sublabel */}
      <div className="space-y-0.5 mt-2 max-w-[220px]">
        <h4 className="text-xs sm:text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1] tracking-tight">
          {resolvedLabel}
        </h4>
        <p className="text-[11px] text-[#566664] dark:text-[#9AAEA9] leading-snug">
          {resolvedSublabel}
        </p>
      </div>
    </div>
  );
};
