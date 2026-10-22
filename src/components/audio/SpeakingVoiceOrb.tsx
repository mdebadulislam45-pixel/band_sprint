import React from 'react';
import { Volume2, Mic, Activity, CheckCircle2, Sparkles, HelpCircle } from 'lucide-react';

export type VoiceOrbState = 'idle' | 'examiner_speaking' | 'recording' | 'thinking' | 'feedback';

interface SpeakingVoiceOrbProps {
  state: VoiceOrbState;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  sublabel?: string;
  volumeLevel?: number; // 0 to 1
  onClick?: () => void;
  className?: string;
}

export const SpeakingVoiceOrb: React.FC<SpeakingVoiceOrbProps> = ({
  state,
  size = 'md',
  label,
  sublabel,
  volumeLevel = 0,
  onClick,
  className = ''
}) => {
  const sizeMap = {
    sm: { container: 'w-24 h-24', icon: 'w-6 h-6', ring1: 'w-28 h-28', ring2: 'w-32 h-32' },
    md: { container: 'w-36 h-36', icon: 'w-8 h-8', ring1: 'w-44 h-44', ring2: 'w-52 h-52' },
    lg: { container: 'w-48 h-48', icon: 'w-10 h-10', ring1: 'w-56 h-56', ring2: 'w-64 h-64' }
  };

  const currentSize = sizeMap[size];

  // Dynamic status text if not explicitly provided
  const resolvedLabel =
    label ||
    (state === 'examiner_speaking'
      ? 'Examiner Speaking'
      : state === 'recording'
      ? 'Listening to Candidate'
      : state === 'thinking'
      ? 'Analyzing Fluency & Grammar'
      : state === 'feedback'
      ? 'Diagnostic Feedback Ready'
      : 'Ready to Speak');

  const resolvedSublabel =
    sublabel ||
    (state === 'examiner_speaking'
      ? 'British Council Oral Calibration · Listen carefully'
      : state === 'recording'
      ? 'Speak continuously · Natural pause detection active'
      : state === 'thinking'
      ? 'Evaluating against 4 Cambridge descriptors...'
      : state === 'feedback'
      ? 'Instant Band 8+ suggestions loaded'
      : 'Click microphone or spacebar to begin');

  return (
    <div className={`flex flex-col items-center justify-center text-center p-4 select-none ${className}`}>
      {/* Outer Ripple Area */}
      <div className="relative flex items-center justify-center my-3">
        {/* Outermost Animated Ripple Ring */}
        {state === 'examiner_speaking' && (
          <div
            className={`absolute ${currentSize.ring2} rounded-full bg-blue-500/15 animate-ping pointer-events-none duration-1000`}
          />
        )}
        {state === 'recording' && (
          <div
            className={`absolute ${currentSize.ring2} rounded-full bg-emerald-500/20 animate-pulse pointer-events-none`}
            style={{ transform: `scale(${1 + volumeLevel * 0.4})` }}
          />
        )}
        {state === 'thinking' && (
          <div
            className={`absolute ${currentSize.ring2} rounded-full border-2 border-indigo-400/40 border-t-indigo-600 animate-spin pointer-events-none`}
          />
        )}

        {/* Secondary Concentric Ripple */}
        <div
          className={`absolute ${currentSize.ring1} rounded-full transition-all duration-300 pointer-events-none ${
            state === 'examiner_speaking'
              ? 'bg-blue-600/20 border border-blue-400/40 animate-pulse'
              : state === 'recording'
              ? 'bg-emerald-600/20 border border-emerald-400/40'
              : state === 'thinking'
              ? 'bg-indigo-600/20 border border-indigo-400/40 animate-spin'
              : state === 'feedback'
              ? 'bg-purple-600/20 border border-purple-400/40 animate-bounce'
              : 'bg-slate-200/50 dark:bg-slate-800/50'
          }`}
          style={state === 'recording' ? { transform: `scale(${1 + volumeLevel * 0.25})` } : undefined}
        />

        {/* Central Core Orb */}
        <button
          onClick={onClick}
          className={`relative ${currentSize.container} rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 z-10 cursor-pointer active:scale-95 ${
            state === 'examiner_speaking'
              ? 'bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 text-white ring-4 ring-blue-300/60 shadow-blue-500/30'
              : state === 'recording'
              ? 'bg-gradient-to-tr from-emerald-700 via-teal-600 to-green-500 text-white ring-4 ring-emerald-300/60 shadow-emerald-500/30'
              : state === 'thinking'
              ? 'bg-gradient-to-tr from-indigo-800 via-purple-700 to-pink-600 text-white ring-4 ring-purple-300/60 shadow-purple-500/30 animate-pulse'
              : state === 'feedback'
              ? 'bg-gradient-to-tr from-amber-500 via-orange-600 to-purple-600 text-white ring-4 ring-amber-300/60 shadow-amber-500/30'
              : 'bg-gradient-to-tr from-slate-800 via-slate-900 to-indigo-950 text-white ring-4 ring-slate-700/50 hover:ring-blue-500/60'
          }`}
        >
          {/* Dynamic Core Icon */}
          {state === 'examiner_speaking' && <Volume2 className={`${currentSize.icon} animate-bounce`} />}
          {state === 'recording' && <Mic className={`${currentSize.icon} animate-pulse`} />}
          {state === 'thinking' && <Activity className={`${currentSize.icon} animate-spin`} />}
          {state === 'feedback' && <Sparkles className={`${currentSize.icon} text-amber-300`} />}
          {state === 'idle' && <Mic className={`${currentSize.icon} text-slate-300`} />}

          {/* Sound wave bars underneath icon when speaking/recording */}
          {(state === 'examiner_speaking' || state === 'recording') && (
            <div className="flex items-center gap-1 mt-2">
              <span className="w-1 h-3 rounded-full bg-white/90 animate-pulse" />
              <span className="w-1 h-5 rounded-full bg-white/90 animate-[pulse_0.6s_infinite]" />
              <span className="w-1 h-4 rounded-full bg-white/90 animate-[pulse_0.8s_infinite]" />
              <span className="w-1 h-2 rounded-full bg-white/90 animate-pulse" />
            </div>
          )}
        </button>
      </div>

      {/* Label and Sublabel */}
      <div className="space-y-1 mt-2 max-w-sm">
        <div className="flex items-center justify-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              state === 'examiner_speaking'
                ? 'bg-blue-500 animate-ping'
                : state === 'recording'
                ? 'bg-emerald-500 animate-pulse'
                : state === 'thinking'
                ? 'bg-indigo-500 animate-spin'
                : state === 'feedback'
                ? 'bg-amber-500'
                : 'bg-slate-400'
            }`}
          />
          <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
            {resolvedLabel}
          </h4>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
          {resolvedSublabel}
        </p>
      </div>
    </div>
  );
};
