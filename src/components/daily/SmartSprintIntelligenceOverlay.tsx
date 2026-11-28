import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Brain,
  CheckCircle2,
  Gauge,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X
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
  AdaptiveDifficultyTier,
  AdaptivePathSummary,
  DifficultyModePreference,
  saveDifficultyPreference,
  SmartSprintIntelligenceReport
} from '../../utils/adaptiveLearningPath';
import {
  DailySprintVocabItem,
  DailySprintGrammarRule,
  SprintQuotaTier
} from '../../data/dailyBanglaSprintData';
import { loadDailySprintProgress, saveDailySprintProgress } from '../../utils/dailySprintProgressStore';
import { audioManager } from '../../services/AudioManager';
import { EASE_EDITORIAL } from '../common/MotionPrimitives';

export interface SmartSprintIntelligenceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  intelligence: SmartSprintIntelligenceReport;
  adaptivePath: AdaptivePathSummary;
  topVocabItems: DailySprintVocabItem[];
  topGrammarRules: DailySprintGrammarRule[];
  onDifficultyApplied?: (pref: DifficultyModePreference) => void;
  onNavigate?: (path: string) => void;
  onShowToast?: (msg: string) => void;
}

const DIFFICULTY_OPTIONS: Array<{
  id: DifficultyModePreference;
  label: string;
  sublabel: string;
}> = [
  { id: 'auto', label: 'Auto-Calibrate', sublabel: 'Engine adapts live' },
  { id: 'recovery', label: 'Recovery', sublabel: 'Band 7.5–8.0 Core' },
  { id: 'balanced', label: 'Balanced', sublabel: 'Band 8.0 Standard' },
  { id: 'stretch', label: 'Stretch', sublabel: 'Band 8.5–9.0 C1/C2' }
];

const TIER_TONE: Record<AdaptiveDifficultyTier, string> = {
  recovery: 'text-amber-700 dark:text-amber-300',
  balanced: 'text-[#0F4C45] dark:text-[#6EE7B7]',
  stretch: 'text-indigo-700 dark:text-indigo-300'
};

export const SmartSprintIntelligenceOverlay: React.FC<SmartSprintIntelligenceOverlayProps> = ({
  isOpen,
  onClose,
  intelligence,
  adaptivePath,
  topVocabItems,
  topGrammarRules,
  onDifficultyApplied,
  onNavigate,
  onShowToast
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        audioManager.playUiClick('soft');
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSelectDifficulty = (pref: DifficultyModePreference) => {
    audioManager.playUiClick('toggle');
    saveDifficultyPreference(pref);
    onDifficultyApplied?.(pref);
    const label =
      pref === 'auto'
        ? `Auto-calibrated (${intelligence.recommendedDifficulty.toUpperCase()})`
        : pref.charAt(0).toUpperCase() + pref.slice(1);
    onShowToast?.(`Smart Sprint difficulty updated: ${label}. Remaining lessons re-ranked.`);
  };

  const handleApplyRecommendedQuota = (targetQuota: SprintQuotaTier) => {
    audioManager.playUiClick('check');
    const current = loadDailySprintProgress();
    saveDailySprintProgress({
      ...current,
      quotaTier: targetQuota
    });
    saveDifficultyPreference('auto');
    onDifficultyApplied?.('auto');
    onShowToast?.(
      `Applied ${targetQuota === 'light' ? 'Light Recovery' : 'Standard'} quota with Auto-Calibrated difficulty.`
    );
  };

  const prioritizedVocabPreview = topVocabItems
    .filter((item) => Boolean(adaptivePath.priorityByItemId[item.id]))
    .slice(0, 3);
  const prioritizedGrammarPreview = topGrammarRules
    .filter((rule) => Boolean(adaptivePath.priorityByItemId[rule.id]))
    .slice(0, 2);

  const maxClusterWeight = Math.max(
    1,
    ...intelligence.topErrorClusters.map((c) => c.weight)
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Smart Sprint Intelligence Overlay"
          data-testid="smart-sprint-intelligence-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE_EDITORIAL }}
          className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex justify-end"
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.26, ease: EASE_EDITORIAL }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl h-full bg-white dark:bg-[#0D1A18] border-l border-[#D3DDDA] dark:border-[#1F8A70]/35 flex flex-col overflow-hidden"
          >
            {/* Sticky Header */}
            <div className="px-5 sm:px-6 py-4 bg-[#0F4C45] text-white border-b border-white/10 flex items-start justify-between gap-4 shrink-0">
              <div className="space-y-1">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#F4A62A] font-semibold flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" />
                  <span>Smart Sprint Intelligence</span>
                </div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-white leading-tight">
                  Adaptive Difficulty &amp; Sprint Velocity
                </h2>
                <p className="text-xs text-[#EEF3F1]/80">
                  Real-time target calibration powered by today’s progress and Mistake Vault frequency.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  audioManager.playUiClick('soft');
                  onClose();
                }}
                aria-label="Close Smart Sprint Intelligence"
                className="min-h-[40px] min-w-[40px] rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Analytical Workspace */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* 1. Key Velocity & Target Calibration KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#F7F9F8] dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30">
                  <div className="text-[11px] font-mono text-[#566664] dark:text-slate-400">
                    Sprint Velocity
                  </div>
                  <div className="text-xl font-mono font-bold text-[#0E1F1E] dark:text-white tabular-nums mt-0.5">
                    {intelligence.velocityScore}
                    <span className="text-xs font-normal text-[#566664] dark:text-slate-400">/100</span>
                  </div>
                  <div className="text-[11px] font-semibold text-[#0F4C45] dark:text-[#6EE7B7] mt-0.5">
                    {intelligence.velocityTrendLabel}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F7F9F8] dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30">
                  <div className="text-[11px] font-mono text-[#566664] dark:text-slate-400">
                    Remaining Target
                  </div>
                  <div className="text-xl font-mono font-bold text-[#0E1F1E] dark:text-white tabular-nums mt-0.5">
                    {intelligence.adjustedRemainingTargets}
                    <span className="text-xs font-normal text-[#566664] dark:text-slate-400">
                      /{intelligence.totalTargetsToday}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#566664] dark:text-slate-400 mt-0.5 tabular-nums">
                    {intelligence.todayCompletionPct}% done today
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F7F9F8] dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30">
                  <div className="text-[11px] font-mono text-[#566664] dark:text-slate-400">
                    5-Day Forecast
                  </div>
                  <div className="text-xl font-mono font-bold text-[#0F4C45] dark:text-[#F4A62A] tabular-nums mt-0.5">
                    {intelligence.projectedSevenDayReadiness}%
                  </div>
                  <div className="text-[11px] text-[#566664] dark:text-slate-400 mt-0.5 tabular-nums">
                    ~{intelligence.projectedWeeklyCompletions}d/wk pace
                  </div>
                </div>
              </div>

              {/* 2. Dynamic Remaining Target Difficulty Calibrator */}
              <section className="p-4 sm:p-5 rounded-2xl bg-[#F7F9F8] dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#566664] dark:text-slate-400 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#F4A62A]" />
                      <span>Dynamic Target Difficulty</span>
                    </div>
                    <h3 className="font-display text-base font-bold text-[#0E1F1E] dark:text-white flex items-center gap-2 flex-wrap">
                      <span className={TIER_TONE[intelligence.activeDifficulty]}>
                        {intelligence.difficultyLabel}
                      </span>
                      <span className="text-xs font-mono font-semibold text-[#566664] dark:text-slate-400">
                        · {intelligence.difficultyBandFocus}
                      </span>
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-[#384543] dark:text-slate-300 leading-relaxed">
                  {intelligence.difficultyRationale}
                </p>

                <div
                  role="radiogroup"
                  aria-label="Select Sprint Difficulty Calibration"
                  className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                >
                  {DIFFICULTY_OPTIONS.map((opt) => {
                    const isSelected = intelligence.difficultyPreference === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        data-testid={`difficulty-mode-${opt.id}`}
                        onClick={() => handleSelectDifficulty(opt.id)}
                        className={`min-h-[48px] px-2.5 py-2 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                            : 'bg-white dark:bg-[#0B1514] text-[#0E1F1E] dark:text-[#EEF3F1] border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45]'
                        }`}
                      >
                        <div className="text-xs font-bold leading-tight">{opt.label}</div>
                        <div
                          className={`text-[10px] mt-0.5 leading-tight ${
                            isSelected ? 'text-[#FDE68A]' : 'text-[#566664] dark:text-slate-400'
                          }`}
                        >
                          {opt.sublabel}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#D3DDDA]/70 dark:border-[#1F8A70]/25 text-xs">
                  <span className="text-[#566664] dark:text-slate-400">
                    Recommended Quota:{' '}
                    <strong className="text-[#0E1F1E] dark:text-white">
                      {intelligence.recommendedQuotaTier === 'light'
                        ? 'Light Recovery (44 targets)'
                        : 'Standard Sprint (86 targets)'}
                    </strong>
                  </span>
                  <button
                    type="button"
                    data-testid="apply-recommended-calibration-btn"
                    onClick={() => handleApplyRecommendedQuota(intelligence.recommendedQuotaTier)}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#F4A62A]" />
                    <span>Apply Recommended Plan</span>
                  </button>
                </div>
              </section>

              {/* 3. Progress-Predictive Velocity Trend Chart */}
              <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#0F4C45] dark:text-[#6EE7B7] font-semibold flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-[#F4A62A]" />
                      <span>7-Day Actual + 5-Day Predictive Velocity</span>
                    </div>
                    <p className="text-xs text-[#566664] dark:text-slate-400 mt-0.5">
                      Solid teal shows actual velocity; dashed gold projects readiness at current pace.
                    </p>
                  </div>
                </div>

                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={intelligence.velocityTrendPoints}
                      margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="overlayVelocityFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0F4C45" stopOpacity={0.32} />
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
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#EEF3F1'
                        }}
                        formatter={(val: unknown, name: unknown) => [
                          `${val}/100`,
                          name === 'actualVelocity' ? 'Actual Velocity' : 'Projected Pace'
                        ]}
                      />
                      <ReferenceLine
                        y={75}
                        stroke="#1F8A70"
                        strokeDasharray="4 4"
                        strokeOpacity={0.55}
                      />
                      <Area
                        type="monotone"
                        dataKey="actualVelocity"
                        stroke="#0F4C45"
                        strokeWidth={2.5}
                        fill="url(#overlayVelocityFill)"
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
              </section>

              {/* 4. Adaptive Learning Path: Mistake Vault Frequency Priorities */}
              <section className="p-4 sm:p-5 rounded-2xl bg-[#F7F9F8] dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-4">
                <div className="space-y-1">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#0F4C45] dark:text-[#6EE7B7] font-semibold flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#F4A62A]" />
                    <span>Adaptive Learning Path · Mistake Vault Priority</span>
                  </div>
                  <p className="text-xs text-[#566664] dark:text-slate-400">
                    High-frequency error patterns from your Mistake Vault automatically move matching vocabulary and grammar lessons to the front of each sprint.
                  </p>
                </div>

                {intelligence.topErrorClusters.length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/25 text-xs text-[#566664] dark:text-slate-400">
                    No Mistake Vault errors logged yet — your sprint uses Band 8+ balanced progression. Save any writing, reading, listening, or speaking mistake to activate frequency-based reordering.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {intelligence.topErrorClusters.map((cluster) => {
                      const pct = Math.max(12, Math.round((cluster.weight / maxClusterWeight) * 100));
                      return (
                        <div
                          key={cluster.key}
                          className="p-3 rounded-xl bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/25 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-bold text-[#0E1F1E] dark:text-white truncate">
                              {cluster.label}
                            </span>
                            <span className="font-mono text-[11px] text-[#566664] dark:text-slate-400 tabular-nums shrink-0">
                              {cluster.count}× logged · {cluster.unresolvedCount} active
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#EEF3F1] dark:bg-[#11201E] overflow-hidden">
                            <div
                              className="h-full bg-[#0F4C45] dark:bg-[#F4A62A] rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {cluster.sampleTerms.length > 0 && (
                            <div className="text-[11px] text-[#566664] dark:text-slate-400 truncate">
                              Targets: {cluster.sampleTerms.join(' · ')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {(prioritizedVocabPreview.length > 0 || prioritizedGrammarPreview.length > 0) && (
                  <div className="pt-3 border-t border-[#D3DDDA]/70 dark:border-[#1F8A70]/25 space-y-2">
                    <div className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[#9B6314] dark:text-[#F4A62A]">
                      Queued at #1 in Today’s Sprint
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {prioritizedVocabPreview.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-[#0B1514] border border-[#D3DDDA]/80 dark:border-[#1F8A70]/25"
                        >
                          <span className="font-bold text-[#0E1F1E] dark:text-white">
                            {v.word}{' '}
                            <span className="font-normal text-[#566664] dark:text-slate-400">
                              ({v.bandLevel})
                            </span>
                          </span>
                          <span className="text-[11px] text-[#0F4C45] dark:text-[#6EE7B7] truncate max-w-[55%] text-right">
                            {adaptivePath.priorityByItemId[v.id]?.reason}
                          </span>
                        </div>
                      ))}
                      {prioritizedGrammarPreview.map((g) => (
                        <div
                          key={g.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-[#0B1514] border border-[#D3DDDA]/80 dark:border-[#1F8A70]/25"
                        >
                          <span className="font-bold text-[#0E1F1E] dark:text-white truncate">
                            {g.title}
                          </span>
                          <span className="text-[11px] text-[#9B6314] dark:text-[#F4A62A] truncate max-w-[50%] text-right">
                            {adaptivePath.priorityByItemId[g.id]?.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Sticky Footer */}
            <div className="px-5 sm:px-6 py-4 bg-[#F7F9F8] dark:bg-[#11201E] border-t border-[#D3DDDA] dark:border-[#1F8A70]/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-[#566664] dark:text-slate-400 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#F4A62A]" />
                <span>
                  Focus today: <strong className="tabular-nums text-[#0E1F1E] dark:text-white">{intelligence.focusMinutesToday}m</strong> / {intelligence.dailyGoalMinutes}m goal
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  audioManager.playUiClick('check');
                  onClose();
                  onNavigate?.('/learn/daily-sprint');
                }}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F4A62A]" />
                <span>Launch Calibrated Sprint</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
