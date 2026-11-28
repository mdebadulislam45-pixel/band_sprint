import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, Minus, TrendingUp } from 'lucide-react';
import { ExamHistoryRecord } from '../../types';
import { DiagnosticResult } from '../../services/diagnosticResultStore';
import { aggregateExamHistory, validateOptionalHalfBand } from '../../utils/historyAggregation';
import { localDateKey } from '../../services/streakService';
import { soundManager } from '../../utils/audioEffects';

export interface DailyModuleBandPoint {
  dateKey: string;
  dateLabel: string;
  fullDateLabel: string;
  listening: number | null;
  reading: number | null;
  writing: number | null;
  speaking: number | null;
  sessionsCount: number;
  includesDiagnostic: boolean;
}

export type BandTrendRange = '7d' | '30d' | '90d' | 'all';

type ModuleKey = 'listening' | 'reading' | 'writing' | 'speaking';

function roundHalfBand(val: number): number {
  return Math.round(val * 2) / 2;
}

function formatDateLabels(dateKey: string): { short: string; full: string } {
  const d = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return { short: dateKey, full: dateKey };
  }
  return {
    short: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    full: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  };
}

/**
 * Pure daily time-series builder aggregating validated Listening, Reading, Writing (and Speaking)
 * IELTS band scores per local calendar day. Missing modules stay null (never coerced to 0).
 */
export function buildDailyModuleBandSeries(
  examHistory: ExamHistoryRecord[],
  diagnostic: DiagnosticResult | null,
  range: BandTrendRange = '30d',
  nowMs: number = Date.now()
): DailyModuleBandPoint[] {
  const agg = aggregateExamHistory(examHistory || []);

  const buckets = new Map<
    string,
    {
      listening: number[];
      reading: number[];
      writing: number[];
      speaking: number[];
      sessionsCount: number;
      includesDiagnostic: boolean;
    }
  >();

  const ensureBucket = (dateKey: string) => {
    let bucket = buckets.get(dateKey);
    if (!bucket) {
      bucket = {
        listening: [],
        reading: [],
        writing: [],
        speaking: [],
        sessionsCount: 0,
        includesDiagnostic: false
      };
      buckets.set(dateKey, bucket);
    }
    return bucket;
  };

  for (const ev of agg.evaluatedRecords) {
    if (!ev.hasAnyValidScore) continue;
    const ts = typeof ev.record.timestamp === 'number' && Number.isFinite(ev.record.timestamp)
      ? ev.record.timestamp
      : nowMs;
    const key = localDateKey(new Date(ts));
    const bucket = ensureBucket(key);
    if (ev.listeningBand !== null) bucket.listening.push(ev.listeningBand);
    if (ev.readingBand !== null) bucket.reading.push(ev.readingBand);
    if (ev.writingBand !== null) bucket.writing.push(ev.writingBand);
    if (ev.speakingBand !== null) bucket.speaking.push(ev.speakingBand);
    bucket.sessionsCount += 1;
  }

  // Include validated diagnostic baseline on its sitting date if no real sitting overwrote that skill on the same day
  if (diagnostic?.scores && typeof diagnostic.createdAt === 'number' && Number.isFinite(diagnostic.createdAt)) {
    const diagL = validateOptionalHalfBand(diagnostic.scores.listening, 0.0);
    const diagR = validateOptionalHalfBand(diagnostic.scores.reading, 0.0);
    const diagW = validateOptionalHalfBand(diagnostic.scores.writing, 1.0);
    const diagS = validateOptionalHalfBand(diagnostic.scores.speaking, 1.0);

    if (diagL !== null || diagR !== null || diagW !== null || diagS !== null) {
      const key = localDateKey(new Date(diagnostic.createdAt));
      const bucket = ensureBucket(key);
      if (diagL !== null && bucket.listening.length === 0) bucket.listening.push(diagL);
      if (diagR !== null && bucket.reading.length === 0) bucket.reading.push(diagR);
      if (diagW !== null && bucket.writing.length === 0) bucket.writing.push(diagW);
      if (diagS !== null && bucket.speaking.length === 0) bucket.speaking.push(diagS);
      if (bucket.sessionsCount === 0) bucket.sessionsCount = 1;
      bucket.includesDiagnostic = true;
    }
  }

  let cutoffKey: string | null = null;
  if (range !== 'all') {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const cutoffDate = new Date(nowMs);
    cutoffDate.setDate(cutoffDate.getDate() - (days - 1));
    cutoffKey = localDateKey(cutoffDate);
  }

  const avgOrNull = (arr: number[]): number | null => {
    if (arr.length === 0) return null;
    const sum = arr.reduce((acc, v) => acc + v, 0);
    return roundHalfBand(sum / arr.length);
  };

  return Array.from(buckets.entries())
    .filter(([dateKey]) => !cutoffKey || dateKey >= cutoffKey)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, bucket]) => {
      const labels = formatDateLabels(dateKey);
      return {
        dateKey,
        dateLabel: labels.short,
        fullDateLabel: labels.full,
        listening: avgOrNull(bucket.listening),
        reading: avgOrNull(bucket.reading),
        writing: avgOrNull(bucket.writing),
        speaking: avgOrNull(bucket.speaking),
        sessionsCount: bucket.sessionsCount,
        includesDiagnostic: bucket.includesDiagnostic
      };
    });
}

function summarizeSeriesSkill(points: DailyModuleBandPoint[], key: ModuleKey) {
  const vals = points
    .map((p) => p[key])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (vals.length === 0) {
    return { latest: null as number | null, delta: null as number | null, count: 0 };
  }
  const latest = vals[vals.length - 1];
  const delta = vals.length >= 2 ? roundHalfBand(latest - vals[0]) : null;
  return { latest, delta, count: vals.length };
}

interface DailyBandTrendChartProps {
  examHistory: ExamHistoryRecord[];
  diagnostic: DiagnosticResult | null;
  targetBand: number;
  onNavigate: (path: string) => void;
}

const MODULE_SERIES_CONFIG: Array<{
  key: ModuleKey;
  label: string;
  color: string;
  defaultOn: boolean;
}> = [
  { key: 'listening', label: 'Listening', color: '#0F766E', defaultOn: true },
  { key: 'reading', label: 'Reading', color: '#2563EB', defaultOn: true },
  { key: 'writing', label: 'Writing', color: '#D97706', defaultOn: true },
  { key: 'speaking', label: 'Speaking', color: '#7C3AED', defaultOn: false }
];

export const DailyBandTrendChart: React.FC<DailyBandTrendChartProps> = ({
  examHistory,
  diagnostic,
  targetBand,
  onNavigate
}) => {
  const [range, setRange] = useState<BandTrendRange>('30d');
  const [visibleModules, setVisibleModules] = useState<Record<ModuleKey, boolean>>({
    listening: true,
    reading: true,
    writing: true,
    speaking: false
  });

  const allSeries = useMemo(
    () => buildDailyModuleBandSeries(examHistory, diagnostic, 'all'),
    [examHistory, diagnostic]
  );

  const series = useMemo(
    () => buildDailyModuleBandSeries(examHistory, diagnostic, range),
    [examHistory, diagnostic, range]
  );

  const hasAnyPointsInRange = useMemo(
    () =>
      series.some(
        (p) =>
          (visibleModules.listening && p.listening !== null) ||
          (visibleModules.reading && p.reading !== null) ||
          (visibleModules.writing && p.writing !== null) ||
          (visibleModules.speaking && p.speaking !== null)
      ),
    [series, visibleModules]
  );

  const skillSummaries = useMemo(
    () => ({
      listening: summarizeSeriesSkill(series, 'listening'),
      reading: summarizeSeriesSkill(series, 'reading'),
      writing: summarizeSeriesSkill(series, 'writing')
    }),
    [series]
  );

  const toggleModule = (key: ModuleKey) => {
    soundManager.playBeep(540, 0.03);
    setVisibleModules((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Keep at least one module active so the chart is never blank by accident
      if (!next.listening && !next.reading && !next.writing && !next.speaking) {
        return prev;
      }
      return next;
    });
  };

  const rangeOptions: Array<{ id: BandTrendRange; label: string }> = [
    { id: '7d', label: '7D' },
    { id: '30d', label: '30D' },
    { id: '90d', label: '90D' },
    { id: 'all', label: 'All' }
  ];

  return (
    <section
      data-testid="daily-band-trend-chart"
      className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 p-5 sm:p-6 space-y-5"
    >
      {/* Header & Range Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#EEF3F1] dark:border-[#1F8A70]/25">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-mono font-semibold text-[#0F4C45] dark:text-[#F4A62A]">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Daily Performance Trajectory</span>
          </div>
          <h3 className="font-display text-lg font-bold text-[#0E1F1E] dark:text-white tracking-tight">
            IELTS Band Trends Over Time
          </h3>
          <p className="text-xs text-[#566664] dark:text-slate-400">
            Daily averaged band scores across Listening, Reading, and Writing compared against your Band {targetBand.toFixed(1)} goal.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/25 self-start md:self-auto">
          {rangeOptions.map((opt) => {
            const active = range === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  soundManager.playBeep(520, 0.025);
                  setRange(opt.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#0F4C45] text-white'
                    : 'text-[#566664] dark:text-slate-300 hover:text-[#0E1F1E] dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary L / R / W Summary Metrics + Interactive Series Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="grid grid-cols-3 gap-4 sm:gap-6">
          {(
            [
              { key: 'listening' as const, label: 'Listening', color: '#0F766E' },
              { key: 'reading' as const, label: 'Reading', color: '#2563EB' },
              { key: 'writing' as const, label: 'Writing', color: '#D97706' }
            ] as const
          ).map((item) => {
            const summary = skillSummaries[item.key];
            return (
              <div key={item.key} className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs text-[#566664] dark:text-slate-400">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="font-medium">{item.label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-lg font-bold text-[#0E1F1E] dark:text-white tabular-nums">
                    {summary.latest !== null ? summary.latest.toFixed(1) : '—'}
                  </span>
                  {summary.delta !== null && (
                    <span
                      className={`inline-flex items-center gap-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                        summary.delta > 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : summary.delta < 0
                          ? 'text-rose-700 dark:text-rose-400'
                          : 'text-[#566664] dark:text-slate-400'
                      }`}
                    >
                      {summary.delta > 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : summary.delta < 0 ? (
                        <ArrowDownRight className="w-3 h-3" />
                      ) : (
                        <Minus className="w-3 h-3" />
                      )}
                      <span>
                        {summary.delta > 0 ? `+${summary.delta.toFixed(1)}` : summary.delta.toFixed(1)}
                      </span>
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#6B7B79] dark:text-slate-400 tabular-nums">
                  {summary.count} {summary.count === 1 ? 'day' : 'days'} logged
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Module Line Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {MODULE_SERIES_CONFIG.map((mod) => {
            const active = visibleModules[mod.key];
            return (
              <button
                key={mod.key}
                type="button"
                aria-pressed={active}
                onClick={() => toggleModule(mod.key)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold border transition inline-flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#EEF3F1] dark:bg-[#0B1514] border-[#0F4C45] dark:border-[#1F8A70] text-[#0E1F1E] dark:text-white'
                    : 'bg-transparent border-[#D3DDDA] dark:border-[#1F8A70]/25 text-[#6B7B79] dark:text-slate-500 hover:text-[#0E1F1E] dark:hover:text-slate-200'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{
                    backgroundColor: active ? mod.color : 'transparent',
                    border: `2px solid ${mod.color}`
                  }}
                  aria-hidden="true"
                />
                <span>{mod.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Canvas or Clean Empty State */}
      {hasAnyPointsInRange ? (
        <div className="space-y-2">
          <div className="w-full h-[290px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 14, right: 16, left: -12, bottom: 6 }}>
                <CartesianGrid
                  strokeDasharray="3 4"
                  vertical={false}
                  stroke="rgba(148, 163, 184, 0.25)"
                />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={{ stroke: 'rgba(148, 163, 184, 0.35)' }}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  domain={[4, 9]}
                  ticks={[4, 5, 6, 7, 8, 9]}
                  tickFormatter={(v: number) => v.toFixed(1)}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const point = payload[0]?.payload as DailyModuleBandPoint | undefined;
                    if (!point) return null;
                    return (
                      <div className="rounded-xl bg-[#0E1F1E] text-white border border-[#1F8A70]/45 px-3.5 py-2.5 shadow-lg text-xs space-y-1.5 min-w-[180px]">
                        <div className="font-mono font-semibold text-[#F4A62A] border-b border-white/10 pb-1">
                          {point.fullDateLabel}
                        </div>
                        {payload.map((entry) => {
                          if (entry.value === null || entry.value === undefined) return null;
                          const val = Number(entry.value);
                          const gap = roundHalfBand(val - targetBand);
                          return (
                            <div
                              key={String(entry.dataKey)}
                              className="flex items-center justify-between gap-4 tabular-nums"
                            >
                              <span className="inline-flex items-center gap-1.5 text-slate-200">
                                <span
                                  className="w-2 h-2 rounded-xs shrink-0"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span>{entry.name}</span>
                              </span>
                              <span className="font-mono font-bold text-white">
                                Band {val.toFixed(1)}{' '}
                                <span className="text-[10px] font-normal text-slate-300">
                                  ({gap >= 0 ? `+${gap.toFixed(1)}` : gap.toFixed(1)})
                                </span>
                              </span>
                            </div>
                          );
                        })}
                        <div className="pt-1 border-t border-white/10 text-[11px] text-slate-300 font-mono tabular-nums">
                          {point.sessionsCount}{' '}
                          {point.sessionsCount === 1 ? 'sitting' : 'sittings'}
                          {point.includesDiagnostic ? ' · includes baseline' : ''}
                        </div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  y={targetBand}
                  stroke="#F4A62A"
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Target ${targetBand.toFixed(1)}`,
                    position: 'insideTopRight',
                    fill: '#D97706',
                    fontSize: 11,
                    fontWeight: 600
                  }}
                />

                {visibleModules.listening && (
                  <Line
                    type="monotone"
                    dataKey="listening"
                    name="Listening"
                    stroke="#0F766E"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#0F766E', stroke: '#ffffff', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: '#0F766E', stroke: '#F4A62A', strokeWidth: 2 }}
                    connectNulls
                  />
                )}
                {visibleModules.reading && (
                  <Line
                    type="monotone"
                    dataKey="reading"
                    name="Reading"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#2563EB', stroke: '#ffffff', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: '#2563EB', stroke: '#F4A62A', strokeWidth: 2 }}
                    connectNulls
                  />
                )}
                {visibleModules.writing && (
                  <Line
                    type="monotone"
                    dataKey="writing"
                    name="Writing"
                    stroke="#D97706"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#D97706', stroke: '#ffffff', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: '#D97706', stroke: '#0F4C45', strokeWidth: 2 }}
                    connectNulls
                  />
                )}
                {visibleModules.speaking && (
                  <Line
                    type="monotone"
                    dataKey="speaking"
                    name="Speaking"
                    stroke="#7C3AED"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={{ r: 3.5, fill: '#7C3AED', stroke: '#ffffff', strokeWidth: 1.5 }}
                    activeDot={{ r: 5.5, fill: '#7C3AED', stroke: '#F4A62A', strokeWidth: 2 }}
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {series.length === 1 && (
            <p className="text-xs text-[#566664] dark:text-slate-400 text-center">
              One active day plotted so far — complete another Listening, Reading, or Writing session on a new day to draw multi-day trend lines.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-[#FAFBFB] dark:bg-[#0B1514] border border-dashed border-[#D3DDDA] dark:border-[#1F8A70]/35 px-5 py-9 text-center space-y-4">
          <div className="space-y-1.5 max-w-md mx-auto">
            <h4 className="font-display text-sm font-bold text-[#0E1F1E] dark:text-white">
              {allSeries.length > 0
                ? `No practice sessions recorded in the last ${range.toUpperCase()}`
                : 'Your daily IELTS band chart starts with your first sitting'}
            </h4>
            <p className="text-xs text-[#566664] dark:text-slate-400 leading-relaxed">
              {allSeries.length > 0
                ? 'Switch to All Time to view earlier sittings, or log a new practice drill today.'
                : 'BandSprint only plots real, validated IELTS half-band scores. Complete a Listening, Reading, or Writing session to plot your first trajectory point.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {allSeries.length > 0 && range !== 'all' && (
              <button
                type="button"
                onClick={() => setRange('all')}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-semibold transition cursor-pointer"
              >
                View All History
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('/practice/listening')}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-[#0E1F1E] dark:text-white hover:border-[#0F4C45] text-xs font-semibold transition cursor-pointer"
            >
              Listening Practice
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/practice/reading')}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-[#0E1F1E] dark:text-white hover:border-[#0F4C45] text-xs font-semibold transition cursor-pointer"
            >
              Reading Practice
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/practice/writing')}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-semibold transition cursor-pointer"
            >
              Writing Lab
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
