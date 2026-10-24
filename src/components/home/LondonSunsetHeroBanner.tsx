import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  Calendar,
  Flame,
  ArrowRight,
  ClipboardCheck,
  Volume2,
  VolumeX,
  Sparkles,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Clock
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { ACADEMIC_COLLOCATIONS } from '../../data/collocationsData';

interface LondonSunsetHeroBannerProps {
  userName: string;
  targetBand: number;
  testDate: string;
  streakDays: number;
  onContinueLearning: () => void;
  onTakeDiagnostic: () => void;
  onOpenBandModal: () => void;
}

type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

interface TimeThemeConfig {
  period: TimePeriod;
  greeting: string;
  phaseLabel: string;
  subtitle: string;
  emoji: string;
  wrapperBg: string;
  overlayGrad: string;
  badgeStyle: string;
  ctaStyle: string;
  skyStops: [string, string, string, string];
  waterStops: [string, string];
  orbColor: string;
  orbCy: number;
  showStars: boolean;
}

const TIME_THEMES: Record<TimePeriod, TimeThemeConfig> = {
  morning: {
    period: 'morning',
    greeting: 'Good morning',
    phaseLabel: 'Morning Sprint',
    subtitle: 'Fresh morning focus — ideal time for Reading & Listening accuracy.',
    emoji: '🌅',
    wrapperBg: 'bg-[#0F2042] border-sky-500/30',
    overlayGrad: 'from-[#0B1933]/90 via-[#102447]/80 to-[#5C3A1D]/45',
    badgeStyle: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
    ctaStyle: 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20',
    skyStops: ['#0F2042', '#1D3B6E', '#7C5338', '#E09F5A'],
    waterStops: ['#1A3258', '#0C182E'],
    orbColor: '#FBBF24',
    orbCy: 155,
    showStars: false
  },
  afternoon: {
    period: 'afternoon',
    greeting: 'Good afternoon',
    phaseLabel: 'Afternoon Session',
    subtitle: 'Peak daytime momentum — sharpen your Writing & Speaking fluency.',
    emoji: '☀️',
    wrapperBg: 'bg-[#0C2346] border-blue-400/30',
    overlayGrad: 'from-[#091B38]/90 via-[#0E2952]/80 to-[#1B4982]/45',
    badgeStyle: 'bg-sky-400/15 text-sky-300 border-sky-400/30',
    ctaStyle: 'bg-sky-400 hover:bg-sky-300 text-slate-950 shadow-sky-500/20',
    skyStops: ['#0B2144', '#163E7A', '#2463A6', '#5694CE'],
    waterStops: ['#163B6E', '#0A1E3C'],
    orbColor: '#FEF08A',
    orbCy: 95,
    showStars: false
  },
  evening: {
    period: 'evening',
    greeting: 'Good evening',
    phaseLabel: 'Evening Review',
    subtitle: 'Golden hour sprint — review key collocations and timed mock questions.',
    emoji: '🌇',
    wrapperBg: 'bg-[#0B1224] border-orange-500/30',
    overlayGrad: 'from-[#0B1224]/95 via-[#181B38]/85 to-[#7C3A28]/45',
    badgeStyle: 'bg-orange-400/15 text-orange-300 border-orange-400/30',
    ctaStyle: 'bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 shadow-amber-500/20',
    skyStops: ['#141E38', '#3B2F5B', '#8E473E', '#DDA15E'],
    waterStops: ['#282C4A', '#0E1324'],
    orbColor: '#FB923C',
    orbCy: 175,
    showStars: false
  },
  night: {
    period: 'night',
    greeting: 'Good evening',
    phaseLabel: 'Night Focus',
    subtitle: 'Quiet night study — consolidate your vocabulary and mistake vault.',
    emoji: '🌙',
    wrapperBg: 'bg-[#070B19] border-indigo-500/30',
    overlayGrad: 'from-[#060A17]/95 via-[#0D132A]/88 to-[#1E1B4B]/55',
    badgeStyle: 'bg-indigo-400/15 text-indigo-300 border-indigo-400/30',
    ctaStyle: 'bg-indigo-400 hover:bg-indigo-300 text-slate-950 shadow-indigo-500/20',
    skyStops: ['#050814', '#0B1126', '#171C3E', '#252652'],
    waterStops: ['#111733', '#060916'],
    orbColor: '#E0E7FF',
    orbCy: 85,
    showStars: true
  }
};

function getTimePeriodFromHour(hour: number): TimePeriod {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export const LondonSunsetHeroBanner: React.FC<LondonSunsetHeroBannerProps> = ({
  userName,
  targetBand,
  testDate,
  streakDays,
  onContinueLearning,
  onTakeDiagnostic,
  onOpenBandModal
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [overridePeriod, setOverridePeriod] = useState<TimePeriod | null>(null);

  // Live clock tick every 15 seconds so greeting & time theme update automatically
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const livePeriod = getTimePeriodFromHour(currentTime.getHours());
  const activePeriod = overridePeriod || livePeriod;
  const theme = TIME_THEMES[activePeriod];

  const formattedClock = useMemo(() => {
    try {
      return currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  }, [currentTime]);

  const handleCycleTimePreview = () => {
    soundManager.playBeep(580, 0.03);
    const order: TimePeriod[] = ['morning', 'afternoon', 'evening', 'night'];
    if (!overridePeriod) {
      const nextIdx = (order.indexOf(livePeriod) + 1) % order.length;
      setOverridePeriod(order[nextIdx]);
    } else {
      const nextIdx = (order.indexOf(overridePeriod) + 1) % order.length;
      if (order[nextIdx] === livePeriod) {
        setOverridePeriod(null);
      } else {
        setOverridePeriod(order[nextIdx]);
      }
    }
  };

  // Deterministic Collocation of the Day
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
  );
  const collocationIndex = Math.abs(dayOfYear) % (ACADEMIC_COLLOCATIONS.length || 1);
  const dailyCollocation = ACADEMIC_COLLOCATIONS[collocationIndex] || {
    phrase: 'paramount importance',
    definition: 'more important than anything else; supreme significance',
    ieltsExample: 'Proper time management is of paramount importance in the Academic Reading module.',
    type: 'Academic Adjective + Noun'
  };

  const handleSpeakCollocation = () => {
    if (isPlayingAudio) {
      stopSpeech();
      setIsPlayingAudio(false);
      return;
    }
    setIsPlayingAudio(true);
    soundManager.playBeep(640, 0.04);
    speakBritish(`${dailyCollocation.phrase}. Example: ${dailyCollocation.ieltsExample}`, {
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false)
    });
  };

  const formattedTestDate = useMemo(() => {
    if (!testDate) return 'Sep 20, 2025';
    try {
      const d = new Date(testDate);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      }
    } catch {}
    return testDate;
  }, [testDate]);

  const TimeIcon =
    activePeriod === 'morning'
      ? Sunrise
      : activePeriod === 'afternoon'
      ? Sun
      : activePeriod === 'evening'
      ? Sunset
      : Moon;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border shadow-md text-white select-none transition-colors duration-500 ${theme.wrapperBg}`}
    >
      {/* Dynamic Time-of-Day Westminster Skyline SVG */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35 sm:opacity-45">
        <svg
          viewBox="0 0 1000 220"
          preserveAspectRatio="xMaxYMid slice"
          className="w-full h-full object-cover"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`skyGrad_${activePeriod}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={theme.skyStops[0]} />
              <stop offset="45%" stopColor={theme.skyStops[1]} />
              <stop offset="75%" stopColor={theme.skyStops[2]} />
              <stop offset="100%" stopColor={theme.skyStops[3]} />
            </linearGradient>
            <linearGradient id={`waterGrad_${activePeriod}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={theme.waterStops[0]} />
              <stop offset="100%" stopColor={theme.waterStops[1]} />
            </linearGradient>
            <radialGradient id="clockGlowCompact" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFF2B2" stopOpacity="1" />
              <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#B45309" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="1000" height="220" fill={`url(#skyGrad_${activePeriod})`} />

          {/* Night Stars */}
          {theme.showStars && (
            <g fill="#E2E8F0" opacity="0.65">
              <circle cx="620" cy="35" r="1.2" />
              <circle cx="680" cy="55" r="1.5" />
              <circle cx="740" cy="28" r="1" />
              <circle cx="790" cy="48" r="1.4" />
              <circle cx="885" cy="30" r="1.3" />
              <circle cx="930" cy="60" r="1.1" />
            </g>
          )}

          {/* Celestial Orb (Sun or Moon positioned by time of day) */}
          <circle
            cx="815"
            cy={theme.orbCy}
            r={activePeriod === 'night' ? 22 : 52}
            fill={theme.orbColor}
            opacity={activePeriod === 'night' ? 0.85 : 0.32}
            filter={activePeriod === 'night' ? 'blur(2px)' : 'blur(18px)'}
          />

          {/* River Thames */}
          <rect y="175" width="1000" height="45" fill={`url(#waterGrad_${activePeriod})`} />

          {/* Westminster & Big Ben Silhouette */}
          <path
            d="M740,175 L740,140 L755,140 L755,120 L760,115 L765,120 L765,140 L780,140 L785,110 L795,110 L800,140 L825,140 L830,75 L835,75 L835,50 L840,40 L845,50 L845,75 L850,75 L850,175 Z"
            fill="#0B0F1E"
          />

          {/* Big Ben Illuminated Clock Face */}
          <circle cx="840" cy="65" r="7" fill="url(#clockGlowCompact)" />
          <circle cx="840" cy="65" r="4" fill="#FDF6B2" />
        </svg>
      </div>

      {/* High-Contrast Readability Gradient Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-r ${theme.overlayGrad} pointer-events-none z-10`} />

      {/* Compact Foreground Content */}
      <div className="relative z-20 px-4 py-3.5 sm:px-5 sm:py-4 space-y-2.5">
        {/* Top Row: Time Greeting + Inline Metrics + Compact Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Dynamic Time Kicker & Editorial Greeting */}
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <button
                type="button"
                onClick={handleCycleTimePreview}
                title="Live time-of-day theme (click to preview Morning / Afternoon / Evening / Night)"
                className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-amber-300 hover:text-amber-200 transition cursor-pointer"
              >
                <TimeIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{theme.phaseLabel}</span>
                {formattedClock && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formattedClock}</span>
                  </>
                )}
              </button>
              <span aria-hidden="true" className="text-slate-400">·</span>
              <span className="text-[11px] text-slate-300 truncate">{theme.subtitle}</span>
            </div>

            <h1 className="font-display text-lg sm:text-xl lg:text-2xl font-semibold text-white tracking-tight truncate">
              {theme.greeting}, {userName}
            </h1>
          </div>

          {/* Right: Interactive Metric Controls + Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Target Band Control */}
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(520, 0.04);
                onOpenBandModal();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-950/85 border border-white/15 flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
              title="Click to adjust Target Band"
            >
              <Target className="w-3.5 h-3.5 text-sky-300 shrink-0" />
              <span className="text-xs font-mono font-semibold text-white tabular-nums">
                Band {targetBand.toFixed(1)}
              </span>
            </button>

            {/* Exam Date Control */}
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(520, 0.04);
                onOpenBandModal();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-950/85 border border-white/15 flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
              title="Click to adjust Exam Date"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              <span className="text-xs font-mono font-semibold text-white tabular-nums">
                {formattedTestDate}
              </span>
            </button>

            {/* Streak Indicator */}
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-white/15 flex items-center gap-1.5 whitespace-nowrap">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
              <span className="text-xs font-mono font-semibold text-amber-300 tabular-nums">
                {streakDays}d
              </span>
            </div>

            {/* Continue Button */}
            <button
              type="button"
              onClick={() => {
                soundManager.playSuccess();
                onContinueLearning();
              }}
              className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap ${theme.ctaStyle}`}
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Diagnostic Button */}
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(600, 0.04);
                onTakeDiagnostic();
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-950/85 text-white font-semibold text-xs border border-white/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-slate-300" />
              <span>Diagnostic</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Compact Editorial Collocation Strip */}
        <div className="px-3 py-2 rounded-xl bg-slate-950/60 border border-white/10 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
            <span className="font-mono text-[11px] text-amber-300 font-semibold shrink-0">
              Daily Collocation ·
            </span>
            <span className="font-display italic font-medium text-white">“{dailyCollocation.phrase}”</span>
            <span className="text-slate-300 text-xs truncate">
              — {dailyCollocation.definition || dailyCollocation.ieltsExample}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSpeakCollocation}
            className={`p-1.5 rounded-lg border shrink-0 transition cursor-pointer ${
              isPlayingAudio
                ? 'bg-amber-400 text-slate-950 border-amber-400'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
            }`}
            title="Listen with British RP Voice"
            aria-label="Listen to collocation pronunciation"
          >
            {isPlayingAudio ? (
              <VolumeX className="w-3.5 h-3.5 text-slate-950" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
