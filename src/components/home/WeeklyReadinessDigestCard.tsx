import React, { useMemo } from 'react';
import { ArrowRight, CheckCircle2, Compass, ShieldCheck, TrendingUp } from 'lucide-react';
import { UserProfile } from '../../types';
import { DiagnosticResult, DiagnosticSkill } from '../../services/diagnosticResultStore';
import { aggregateExamHistory, validateOptionalHalfBand } from '../../utils/historyAggregation';
import { getMistakes } from '../../utils/vaultStorage';
import { getStreakState, localDateKey } from '../../services/streakService';

interface WeeklyReadinessDigestCardProps {
  user?: UserProfile | null;
  diagnostic?: DiagnosticResult | null;
  targetBand: number;
  onNavigate: (path: string) => void;
}

export const WeeklyReadinessDigestCard: React.FC<WeeklyReadinessDigestCardProps> = ({
  user,
  diagnostic = null,
  targetBand,
  onNavigate
}) => {
  const digest = useMemo(() => {
    const history = user?.progress?.examHistory || [];
    const agg = aggregateExamHistory(history);
    const streak = getStreakState();

    // 7-day active days & minutes
    const now = new Date();
    let activeDaysLast7 = 0;
    let weeklyMinutes = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = localDateKey(d);
      const mins = Number(streak.minutesByDate?.[key] || 0);
      const xp = Number(streak.xpByDate?.[key] || 0);
      if (mins > 0 || xp > 0) {
        activeDaysLast7++;
        weeklyMinutes += mins > 0 ? mins : Math.round(xp / 4);
      }
    }

    // Mistake Vault resolution rate
    let totalMistakes = 0;
    let masteredMistakes = 0;
    try {
      const all = getMistakes();
      totalMistakes = all.length;
      masteredMistakes = all.filter((m) => m.mastered).length;
    } catch {
      // ignore
    }
    const resolutionRate =
      totalMistakes > 0 ? Math.round((masteredMistakes / totalMistakes) * 100) : 100;

    // 4-skill Band trajectory
    const skills: Array<{
      id: DiagnosticSkill;
      label: string;
      band: number | null;
      gap: number | null;
      route: string;
    }> = (['listening', 'reading', 'writing', 'speaking'] as DiagnosticSkill[]).map((id) => {
      const minBand = id === 'listening' || id === 'reading' ? 0.0 : 1.0;
      const band =
        agg.skills[id].latest ?? validateOptionalHalfBand(diagnostic?.scores?.[id], minBand);
      return {
        id,
        label: id.charAt(0).toUpperCase() + id.slice(1),
        band,
        gap: band !== null ? Number((targetBand - band).toFixed(1)) : null,
        route: `/practice/${id}`
      };
    });

    const assessed = skills.filter((s) => s.band !== null) as Array<{
      id: DiagnosticSkill;
      label: string;
      band: number;
      gap: number;
      route: string;
    }>;

    const weakest =
      assessed.length > 0
        ? [...assessed].sort((a, b) => a.band - b.band)[0]
        : skills.find((s) => s.id === diagnostic?.weakest) || skills[0];

    const avgBand =
      assessed.length > 0
        ? Math.round((assessed.reduce((acc, s) => acc + s.band, 0) / assessed.length) * 2) / 2
        : null;

    let statusHeadline = 'Complete a diagnostic or mock section to unlock your 4-skill band trajectory.';
    if (avgBand !== null) {
      const gap = Number((targetBand - avgBand).toFixed(1));
      if (gap <= 0) {
        statusHeadline = `On target at Band ${avgBand.toFixed(1)}. Maintain weekly timed mocks to lock in consistency.`;
      } else {
        statusHeadline = `${gap.toFixed(1)} band to target (${targetBand.toFixed(1)}). Focus this week on ${weakest.label}.`;
      }
    }

    return {
      activeDaysLast7,
      weeklyMinutes,
      totalMistakes,
      masteredMistakes,
      resolutionRate,
      skills,
      weakest,
      avgBand,
      statusHeadline
    };
  }, [diagnostic, targetBand, user?.progress?.examHistory]);

  return (
    <section
      data-testid="weekly-readiness-digest-card"
      className="p-5 rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 space-y-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
            <TrendingUp className="w-3.5 h-3.5 text-[#F4A62A]" />
            <span>Weekly Readiness Digest</span>
          </div>
          <h3 className="font-display text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1] mt-0.5">
            4-Skill Band Trajectory
          </h3>
        </div>
        <div className="text-right font-mono tabular-nums">
          <div className="text-lg font-bold text-[#0F4C45] dark:text-[#F4A62A] leading-none">
            {digest.avgBand !== null ? digest.avgBand.toFixed(1) : '—'}
          </div>
          <div className="text-[10px] text-[#566664] dark:text-slate-400">
            Goal {targetBand.toFixed(1)}
          </div>
        </div>
      </div>

      {/* 4-Skill Compact Matrix */}
      <div className="grid grid-cols-2 gap-2">
        {digest.skills.map((s) => {
          const pct = s.band !== null ? Math.min(100, Math.round((s.band / targetBand) * 100)) : 0;
          const isWeakest = digest.weakest.id === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onNavigate(s.route)}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                isWeakest
                  ? 'bg-[#FEF6E8]/60 dark:bg-[#F4A62A]/10 border-[#F4A62A]/50'
                  : 'bg-[#F7F9F8] dark:bg-[#0B1514] border-[#EEF3F1] dark:border-[#1F8A70]/25 hover:border-[#0F4C45]'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">{s.label}</span>
                <span className="font-mono font-bold tabular-nums text-[#0F4C45] dark:text-[#6EE7B7]">
                  {s.band !== null ? s.band.toFixed(1) : '—'}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#D3DDDA]/70 dark:bg-[#11201E] mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${isWeakest ? 'bg-[#F4A62A]' : 'bg-[#0F4C45] dark:bg-[#1F8A70]'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* 7-Day Activity & Vault Resolution Strip */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#EEF3F1] dark:border-[#1F8A70]/25 text-center font-mono tabular-nums">
        <div className="p-2 rounded-lg bg-[#F7F9F8] dark:bg-[#0B1514]">
          <div className="text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
            {digest.activeDaysLast7}/7d
          </div>
          <div className="text-[10px] font-sans text-[#566664] dark:text-slate-400">Active</div>
        </div>
        <div className="p-2 rounded-lg bg-[#F7F9F8] dark:bg-[#0B1514]">
          <div className="text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
            {digest.weeklyMinutes}m
          </div>
          <div className="text-[10px] font-sans text-[#566664] dark:text-slate-400">7-Day Study</div>
        </div>
        <div className="p-2 rounded-lg bg-[#F7F9F8] dark:bg-[#0B1514]">
          <div className="text-sm font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
            {digest.resolutionRate}%
          </div>
          <div className="text-[10px] font-sans text-[#566664] dark:text-slate-400">Vault Fixed</div>
        </div>
      </div>

      <p className="text-xs text-[#566664] dark:text-slate-300 leading-relaxed flex items-start gap-2">
        {digest.avgBand !== null && digest.avgBand >= targetBand ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        ) : digest.totalMistakes > 0 ? (
          <ShieldCheck className="w-4 h-4 text-[#F4A62A] shrink-0 mt-0.5" />
        ) : (
          <Compass className="w-4 h-4 text-[#0F4C45] dark:text-[#6EE7B7] shrink-0 mt-0.5" />
        )}
        <span>{digest.statusHeadline}</span>
      </p>

      <button
        type="button"
        onClick={() => onNavigate(digest.weakest.route)}
        className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <span>Target {digest.weakest.label} Now</span>
        <ArrowRight className="w-3.5 h-3.5 text-[#F4A62A]" />
      </button>
    </section>
  );
};
