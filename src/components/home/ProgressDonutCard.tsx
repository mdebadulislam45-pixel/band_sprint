import React, { useMemo } from 'react';
import { ArrowRight, Headphones, BookOpen, PenTool, Mic } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { ExamHistoryRecord } from '../../types';
import { aggregateExamHistory, validateOptionalHalfBand } from '../../utils/historyAggregation';

interface ProgressDonutCardProps {
  overallPercentage?: number;
  estimatedBand?: number | null;
  targetBand?: number;
  completedCount?: number;
  examHistory?: ExamHistoryRecord[];
  onViewAnalytics?: () => void;
  onNavigate?: (module: string) => void;
}

export const ProgressDonutCard: React.FC<ProgressDonutCardProps> = ({
  overallPercentage = 0,
  estimatedBand = null,
  targetBand = 7.5,
  completedCount,
  examHistory = [],
  onViewAnalytics,
  onNavigate
}) => {
  const agg = useMemo(() => aggregateExamHistory(examHistory), [examHistory]);

  const validatedBand =
    agg.overall.latest ?? validateOptionalHalfBand(estimatedBand, 0.5);
  const hasScore = validatedBand !== null;
  const safePercent = Math.max(0, Math.min(100, Math.round(Number.isFinite(overallPercentage) ? overallPercentage : 0)));
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safePercent / 100) * circumference;

  const listeningScore =
    agg.skills.listening.latest !== null ? agg.skills.listening.latest.toFixed(1) : '—';
  const readingScore =
    agg.skills.reading.latest !== null ? agg.skills.reading.latest.toFixed(1) : '—';
  const writingScore =
    agg.skills.writing.latest !== null ? agg.skills.writing.latest.toFixed(1) : '—';
  const speakingScore =
    agg.skills.speaking.latest !== null ? agg.skills.speaking.latest.toFixed(1) : '—';

  const completedFullMocks =
    typeof completedCount === 'number' && Number.isFinite(completedCount) && examHistory.length === 0
      ? Math.max(0, Math.floor(completedCount))
      : agg.completedFullMockCount;

  const sparklineGeometry = useMemo(() => {
    const pts = agg.fullMockSparklinePoints;
    if (pts.length < 2) return null;
    const minVal = Math.max(0, Math.min(...pts) - 0.5);
    const maxVal = Math.min(9, Math.max(...pts) + 0.5);
    const span = Math.max(1, maxVal - minVal);
    const coords = pts.map((v, idx) => {
      const x = pts.length === 1 ? 60 : (idx / (pts.length - 1)) * 120;
      const y = 24 - ((v - minVal) / span) * 20;
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    });
    const linePath = coords.map((c, idx) => `${idx === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ');
    const areaPath = `${linePath} L${coords[coords.length - 1].x},28 L${coords[0].x},28 Z`;
    return {
      linePath,
      areaPath,
      last: coords[coords.length - 1],
      trend: agg.overall.trend
    };
  }, [agg.fullMockSparklinePoints, agg.overall.trend]);

  const skillPills = [
    {
      id: 'listening',
      short: 'L',
      label: 'Listening',
      score: listeningScore,
      icon: Headphones,
      bg: 'bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100/80 dark:hover:bg-blue-900/50',
      border: 'border-blue-200/70 dark:border-blue-900/50',
      text: 'text-blue-600 dark:text-blue-400'
    },
    {
      id: 'reading',
      short: 'R',
      label: 'Reading',
      score: readingScore,
      icon: BookOpen,
      bg: 'bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50',
      border: 'border-emerald-200/70 dark:border-emerald-900/50',
      text: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      id: 'writing',
      short: 'W',
      label: 'Writing',
      score: writingScore,
      icon: PenTool,
      bg: 'bg-purple-50/70 dark:bg-purple-950/40 hover:bg-purple-100/80 dark:hover:bg-purple-900/50',
      border: 'border-purple-200/70 dark:border-purple-900/50',
      text: 'text-purple-600 dark:text-purple-400'
    },
    {
      id: 'speaking',
      short: 'S',
      label: 'Speaking',
      score: speakingScore,
      icon: Mic,
      bg: 'bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-900/50',
      border: 'border-amber-200/70 dark:border-amber-900/50',
      text: 'text-amber-600 dark:text-amber-400'
    }
  ];

  const bandGap =
    validatedBand !== null ? Math.max(0, +(targetBand - validatedBand).toFixed(1)) : null;

  const subtitleText =
    agg.totalAttempts === 0
      ? 'No mock test recorded yet · Take a practice test'
      : `${completedFullMocks} completed full mock${completedFullMocks === 1 ? '' : 's'} · ${agg.totalAttempts} total attempt${agg.totalAttempts === 1 ? '' : 's'}`;

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0B1224] border border-slate-200/90 dark:border-slate-800 shadow-2xs p-4 sm:p-5 space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            Band Readiness Index
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {subtitleText}
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
          Goal {targetBand.toFixed(1)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* Circular Progress Ring */}
        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-slate-100 dark:stroke-slate-800"
              strokeWidth="10"
              fill="transparent"
            />
            <defs>
              <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="50%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#7C3AED" />
              </linearGradient>
            </defs>
            {safePercent > 0 && (
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="url(#donutGrad)"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">
              {hasScore ? 'Readiness' : 'Syllabus'}
            </span>
            <span className="text-base font-black text-slate-900 dark:text-white font-mono leading-none mt-0.5">
              {safePercent}%
            </span>
          </div>
        </div>

        {/* Estimated Band & Gap Indicator */}
        <div className="flex-1 space-y-2 min-w-0">
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {agg.overall.latest !== null
                ? 'Latest Full Mock Band'
                : hasScore
                ? 'Diagnostic Baseline Band'
                : 'Overall Band: Not assessed'}
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base sm:text-xl font-black text-slate-900 dark:text-white font-mono">
                {validatedBand !== null ? `Band ${validatedBand.toFixed(1)}` : '—'}
              </span>
            </div>
            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {bandGap === null
                ? `Target Band: ${targetBand.toFixed(1)} · Complete a 4-skill mock to establish an overall band`
                : bandGap > 0
                ? `+${bandGap.toFixed(1)} band needed to reach Target ${targetBand.toFixed(1)}`
                : `On track for Target Band ${targetBand.toFixed(1)}`}
            </div>
          </div>

          {/* Data-Driven Mini Sparkline (rendered ONLY when >= 2 completed 4-skill Full Mocks exist) */}
          <div className="w-full h-7 relative flex items-center">
            {sparklineGeometry ? (
              <svg viewBox="0 0 120 28" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="sparklineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={sparklineGeometry.areaPath} fill="url(#sparklineGrad)" />
                <path
                  d={sparklineGeometry.linePath}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                />
                <circle cx={sparklineGeometry.last.x} cy={sparklineGeometry.last.y} r="3" fill="#3B82F6" />
              </svg>
            ) : (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                Complete 2+ full mocks to see band trend
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4-Module Interactive Skill Breakdown */}
      <div className="grid grid-cols-4 gap-1.5 pt-1">
        {skillPills.map((pill) => (
          <button
            key={pill.id}
            type="button"
            onClick={() => {
              soundManager.playBeep(580, 0.04);
              onNavigate?.(pill.id);
            }}
            className={`p-2 rounded-xl border ${pill.bg} ${pill.border} text-center transition cursor-pointer group`}
            title={`Practice ${pill.label} (${pill.score !== '—' ? `Band ${pill.score}` : 'Not assessed'})`}
          >
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block group-hover:text-slate-800 dark:group-hover:text-white">
              {pill.short}
            </span>
            <span className={`text-xs font-mono font-black ${pill.text} block mt-0.5`}>
              {pill.score}
            </span>
          </button>
        ))}
      </div>

      {!hasScore ? (
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(640, 0.04);
            onNavigate?.('mocktest');
          }}
          className="w-full pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center justify-between group cursor-pointer"
        >
          <span>Complete a 4-Skill Mock Test to Establish Your Overall Band</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition shrink-0" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(640, 0.04);
            if (onViewAnalytics) {
              onViewAnalytics();
            } else {
              onNavigate?.('/progress/analytics');
            }
          }}
          className="w-full pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-between group cursor-pointer"
        >
          <span>Open Full Band Analytics &amp; Heatmaps</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
        </button>
      )}
    </div>
  );
};
