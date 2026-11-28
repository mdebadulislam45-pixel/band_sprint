import React from 'react';
import {
  ArrowUpRight,
  Brain,
  SlidersHorizontal,
  TrendingUp
} from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  AdaptivePathSummary,
  SmartSprintIntelligenceReport
} from '../../utils/adaptiveLearningPath';
import { audioManager } from '../../services/AudioManager';
import { SprintVelocityGauge } from './SprintVelocityGauge';

export interface SprintVelocityCardProps {
  intelligence: SmartSprintIntelligenceReport;
  adaptivePath: AdaptivePathSummary;
  onOpenIntelligenceOverlay: () => void;
  onNavigate: (path: string) => void;
}

export const SprintVelocityCard: React.FC<SprintVelocityCardProps> = ({
  intelligence,
  adaptivePath,
  onOpenIntelligenceOverlay,
  onNavigate
}) => {
  const prioritizedCount =
    adaptivePath.prioritizedVocabIds.length + adaptivePath.prioritizedGrammarIds.length;

  const deltaPrefix = intelligence.velocityDeltaPct > 0 ? '+' : '';

  return (
    <section
      data-testid="home-sprint-velocity-card"
      className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 p-5 space-y-4"
    >
      {/* Clean Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#566664] dark:text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[#0F4C45] dark:text-[#6EE7B7] inline-flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span>Sprint Velocity &amp; Predictive Trend</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">
              {intelligence.difficultyLabel} ({intelligence.difficultyBandFocus})
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              data-testid="sprint-velocity-score"
              className="font-mono text-2xl sm:text-3xl font-bold text-[#0E1F1E] dark:text-white tabular-nums"
            >
              {intelligence.velocityScore}
              <span className="text-sm font-normal text-[#566664] dark:text-slate-400">/100</span>
            </span>
            <span
              className={`text-xs font-mono font-semibold tabular-nums ${
                intelligence.velocityDeltaPct >= 0
                  ? 'text-[#0F4C45] dark:text-[#6EE7B7]'
                  : 'text-amber-700 dark:text-amber-300'
              }`}
            >
              {deltaPrefix}
              {intelligence.velocityDeltaPct}% vs 7d avg · {intelligence.velocityTrendLabel}
            </span>
          </div>

          <p className="text-xs text-[#566664] dark:text-slate-400 leading-relaxed">
            {intelligence.difficultyRationale}
          </p>
        </div>

        <button
          type="button"
          data-testid="open-smart-intelligence-overlay-btn"
          onClick={() => {
            audioManager.playUiClick('soft');
            onOpenIntelligenceOverlay();
          }}
          className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] hover:bg-[#D3DDDA] dark:hover:bg-[#17302C] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-[#0F4C45] dark:text-[#6EE7B7] text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#F4A62A]" />
          <span>Smart Intelligence</span>
        </button>
      </div>

      {/* Sprint Velocity Gauge + Progress-Predictive Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-5 flex flex-col">
          <SprintVelocityGauge intelligence={intelligence} />
        </div>

        {/* Progress-Predictive Trend Chart (7d Actual + 5d Projected) */}
        <div
          data-testid="sprint-velocity-trend-chart"
          className="lg:col-span-7 p-4 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA]/80 dark:border-[#1F8A70]/25 flex flex-col justify-between space-y-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#566664] dark:text-slate-400">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-[#0F4C45] dark:bg-[#1F8A70] inline-block" />
                <span>Actual (7d)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 border-t-2 border-dashed border-[#F4A62A] inline-block" />
                <span>Predicted (+5d)</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 border-t border-dashed border-[#1F8A70] inline-block" />
                <span>Band 8 Target (75)</span>
              </span>
            </div>
            <span className="font-semibold text-[#0F4C45] dark:text-[#6EE7B7] tabular-nums">
              5-Day Forecast: {intelligence.projectedSevenDayReadiness}%
            </span>
          </div>

          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={intelligence.velocityTrendPoints}
                margin={{ top: 8, right: 6, left: -24, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="homeSprintVelocityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F4C45" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#0F4C45" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" strokeOpacity={0.2} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0E1F1E',
                    borderColor: '#1F8A70',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#EEF3F1'
                  }}
                  formatter={(val: unknown, name: unknown) => [
                    `${val}/100`,
                    name === 'actualVelocity' ? 'Actual Velocity' : 'Predicted Trend'
                  ]}
                />
                <ReferenceLine
                  y={75}
                  stroke="#1F8A70"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />
                <Area
                  type="monotone"
                  dataKey="actualVelocity"
                  stroke="#0F4C45"
                  strokeWidth={2.5}
                  fill="url(#homeSprintVelocityFill)"
                  connectNulls={false}
                  dot={{ r: 3, fill: '#0F4C45', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#F4A62A' }}
                />
                <Line
                  type="monotone"
                  dataKey="predictedVelocity"
                  stroke="#F4A62A"
                  strokeWidth={2.5}
                  strokeDasharray="5 4"
                  connectNulls
                  dot={{ r: 3, fill: '#F4A62A', strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Adaptive Path Summary Strip (Unboxed Metadata + Clean Direct Link) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-[#566664] dark:text-slate-400">
          <Brain className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#6EE7B7] shrink-0" />
          <span>
            <strong className="text-[#0E1F1E] dark:text-white tabular-nums">
              {intelligence.adjustedRemainingTargets}
            </strong>{' '}
            remaining targets calibrated
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {prioritizedCount > 0 ? (
              <>
                <strong className="text-[#0F4C45] dark:text-[#6EE7B7] tabular-nums">
                  {prioritizedCount}
                </strong>{' '}
                Vault-frequency lessons prioritized
              </>
            ) : (
              'Adaptive Vault prioritization ready'
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            audioManager.playUiClick('soft');
            onNavigate('/learn/daily-sprint');
          }}
          className="text-xs font-bold text-[#0F4C45] dark:text-[#6EE7B7] hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <span>Run Adaptive Sprint</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
};
