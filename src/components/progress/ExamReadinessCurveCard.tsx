import React, { useMemo } from 'react';
import { Calendar, Compass, ArrowUpRight } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

export interface ExamRunwayPoint {
  label: string;
  projectedBand: number;
  targetBand: number;
}

export interface ExamRunwayPlan {
  daysUntilExam: number | null;
  phaseName: 'Foundation Build' | 'Consolidation' | 'Peak Mock Taper' | 'Final 7-Day Sharpening';
  mockRatioPct: number;
  skillDrillRatioPct: number;
  weeklyFullMocks: number;
  dailyFocusMinutes: number;
  strategyNote: string;
  trajectoryPoints: ExamRunwayPoint[];
}

export function computeExamRunwayPlan(params: {
  examDate?: string | null;
  currentBand: number | null;
  targetBand: number;
  streakDays: number;
}): ExamRunwayPlan {
  const target = Math.max(5.5, Math.min(9.0, params.targetBand || 7.5));
  const baseline = params.currentBand !== null ? params.currentBand : Math.max(5.5, target - 1.0);

  let daysUntil: number | null = null;
  if (params.examDate) {
    const parsed = new Date(params.examDate);
    if (!Number.isNaN(parsed.getTime())) {
      const diffMs = parsed.getTime() - Date.now();
      daysUntil = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }
  }

  let phaseName: ExamRunwayPlan['phaseName'] = 'Foundation Build';
  let mockRatioPct = 25;
  let skillDrillRatioPct = 75;
  let weeklyFullMocks = 1;
  let dailyFocusMinutes = 45;
  let strategyNote =
    'Prioritize targeted Mistake Vault repair, C1 collocations, and single-section accuracy before scaling mock volume.';

  if (daysUntil !== null && daysUntil <= 7) {
    phaseName = 'Final 7-Day Sharpening';
    mockRatioPct = 60;
    skillDrillRatioPct = 40;
    weeklyFullMocks = 2;
    dailyFocusMinutes = 60;
    strategyNote =
      'Switch to strict CD-IELTS timed conditions, review your top 2 recurring Vault traps, and avoid cramming brand-new vocab lists.';
  } else if (daysUntil !== null && daysUntil <= 14) {
    phaseName = 'Peak Mock Taper';
    mockRatioPct = 55;
    skillDrillRatioPct = 45;
    weeklyFullMocks = 3;
    dailyFocusMinutes = 75;
    strategyNote =
      'Peak exam-stamina phase: run 3 full timed sittings per week and audit every Reading/Listening miss by distractor root cause.';
  } else if (daysUntil !== null && daysUntil <= 30) {
    phaseName = 'Consolidation';
    mockRatioPct = 40;
    skillDrillRatioPct = 60;
    weeklyFullMocks = 2;
    dailyFocusMinutes = 60;
    strategyNote =
      'Balance 2 timed mock sittings per week with high-frequency grammar, Writing Task 2 structure, and Part 2/3 speaking stress drills.';
  }

  const horizonDays = daysUntil !== null ? Math.max(7, Math.min(60, daysUntil)) : 30;
  const steps = 6;
  const gap = Math.max(0, target - baseline);
  const consistencyMultiplier = params.streakDays >= 7 ? 1.0 : params.streakDays >= 3 ? 0.92 : 0.84;

  const trajectoryPoints: ExamRunwayPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const progressRatio = i / steps;
    const eased = 1 - Math.pow(1 - progressRatio, 1.45);
    const projected = Math.min(
      9.0,
      Number((baseline + gap * eased * consistencyMultiplier).toFixed(2))
    );
    const dayOffset = Math.round(horizonDays * progressRatio);
    const label =
      i === 0 ? 'Today' : i === steps ? (daysUntil !== null ? 'Exam Day' : `Day ${horizonDays}`) : `D+${dayOffset}`;
    trajectoryPoints.push({
      label,
      projectedBand: projected,
      targetBand: target
    });
  }

  return {
    daysUntilExam: daysUntil,
    phaseName,
    mockRatioPct,
    skillDrillRatioPct,
    weeklyFullMocks,
    dailyFocusMinutes,
    strategyNote,
    trajectoryPoints
  };
}

interface ExamReadinessCurveCardProps {
  examDate?: string | null;
  currentBand: number | null;
  targetBand: number;
  streakDays: number;
  onNavigate: (path: string) => void;
  onOpenBandModal: () => void;
}

export const ExamReadinessCurveCard: React.FC<ExamReadinessCurveCardProps> = ({
  examDate,
  currentBand,
  targetBand,
  streakDays,
  onNavigate,
  onOpenBandModal
}) => {
  const plan = useMemo(
    () =>
      computeExamRunwayPlan({
        examDate,
        currentBand,
        targetBand,
        streakDays
      }),
    [examDate, currentBand, targetBand, streakDays]
  );

  return (
    <section
      data-testid="exam-readiness-curve-card"
      className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 p-5 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#566664] dark:text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[#0F4C45] dark:text-[#6EE7B7] inline-flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span>Dynamic Exam Runway &amp; Readiness Curve</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-[#0E1F1E] dark:text-white">{plan.phaseName}</span>
          </div>
          <h3 className="font-display text-base sm:text-lg font-bold text-[#0E1F1E] dark:text-white">
            {plan.daysUntilExam !== null
              ? `${plan.daysUntilExam} days to Exam Day — auto-calibrated study split`
              : '30-Day Default Readiness Runway — set your Exam Date to recalibrate'}
          </h3>
          <p className="text-xs text-[#566664] dark:text-slate-400 leading-relaxed max-w-2xl">
            {plan.strategyNote}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenBandModal}
          className="min-h-[38px] px-3.5 py-2 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] hover:bg-[#D3DDDA] dark:hover:bg-[#17302C] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-[#0F4C45] dark:text-[#6EE7B7] text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition"
        >
          <Calendar className="w-3.5 h-3.5 text-[#F4A62A]" />
          <span>{plan.daysUntilExam !== null ? 'Update Exam Date' : 'Set Exam Date'}</span>
        </button>
      </div>

      {/* Auto-Recalibrated Study Ratio Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA]/80 dark:border-[#1F8A70]/25 text-xs">
        <div>
          <div className="text-[10px] font-mono uppercase text-[#566664] dark:text-slate-400">
            Mock vs. Drill Split
          </div>
          <div className="font-mono text-sm font-bold text-[#0E1F1E] dark:text-white tabular-nums mt-0.5">
            {plan.mockRatioPct}% / {plan.skillDrillRatioPct}%
          </div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase text-[#566664] dark:text-slate-400">
            Weekly Full Mocks
          </div>
          <div className="font-mono text-sm font-bold text-[#0F4C45] dark:text-[#6EE7B7] tabular-nums mt-0.5">
            {plan.weeklyFullMocks} / week
          </div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase text-[#566664] dark:text-slate-400">
            Daily Target Load
          </div>
          <div className="font-mono text-sm font-bold text-[#0E1F1E] dark:text-white tabular-nums mt-0.5">
            {plan.dailyFocusMinutes} min/day
          </div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase text-[#566664] dark:text-slate-400">
            Exam-Day Forecast
          </div>
          <div className="font-mono text-sm font-bold text-[#9A630B] dark:text-[#F4A62A] tabular-nums mt-0.5">
            Band {plan.trajectoryPoints[plan.trajectoryPoints.length - 1]?.projectedBand.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Recharts Readiness Curve */}
      <div className="w-full h-44 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={plan.trajectoryPoints} margin={{ top: 8, right: 10, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="examRunwayFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0F4C45" stopOpacity={0.32} />
                <stop offset="95%" stopColor="#0F4C45" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" strokeOpacity={0.2} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis domain={[4.5, 9]} ticks={[5, 6, 7, 8, 9]} tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0E1F1E',
                borderColor: '#1F8A70',
                borderRadius: '10px',
                fontSize: '12px',
                color: '#EEF3F1'
              }}
              formatter={(v: unknown) => [`Band ${Number(v).toFixed(1)}`, 'Projected Band']}
            />
            <ReferenceLine y={targetBand} stroke="#F4A62A" strokeDasharray="5 4" />
            <Area
              type="monotone"
              dataKey="projectedBand"
              stroke="#0F4C45"
              strokeWidth={2.5}
              fill="url(#examRunwayFill)"
              dot={{ r: 3.5, fill: '#0F4C45', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#F4A62A' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        <span className="text-[#566664] dark:text-slate-400">
          Dashed gold line marks your target <strong className="text-[#0E1F1E] dark:text-white">Band {targetBand.toFixed(1)}</strong>.
        </span>
        <button
          type="button"
          onClick={() => onNavigate('/practice/mock-tests')}
          className="font-bold text-[#0F4C45] dark:text-[#6EE7B7] hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <span>Launch Timed Mock Sitting</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
};
