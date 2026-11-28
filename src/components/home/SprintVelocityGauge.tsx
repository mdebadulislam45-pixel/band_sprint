import React from 'react';
import { Gauge } from 'lucide-react';
import { SmartSprintIntelligenceReport } from '../../utils/adaptiveLearningPath';

export interface DailyVelocityPrediction {
  predictedDailyCompletionPct: number;
  currentCompletionPct: number;
  difficultyLoadFactor: number;
  estimatedMinutesRemaining: number;
  paceVerdict: 'Ahead of Target' | 'On Track' | 'Needs Acceleration' | 'Target Cleared';
}

/**
 * Pure prediction model estimating end-of-day Daily Sprint completion percentage
 * from current study pace, remaining calibrated target load, and active difficulty tier.
 */
export function computeDailyProgressPrediction(
  intelligence: SmartSprintIntelligenceReport
): DailyVelocityPrediction {
  const currentCompletionPct = Math.max(0, Math.min(100, Math.round(intelligence.todayCompletionPct)));
  const remaining = Math.max(0, intelligence.adjustedRemainingTargets);
  const difficultyLoadFactor =
    intelligence.activeDifficulty === 'stretch'
      ? 1.2
      : intelligence.activeDifficulty === 'recovery'
      ? 0.85
      : 1.0;

  if (currentCompletionPct >= 100 || remaining === 0) {
    return {
      predictedDailyCompletionPct: 100,
      currentCompletionPct: 100,
      difficultyLoadFactor,
      estimatedMinutesRemaining: 0,
      paceVerdict: 'Target Cleared'
    };
  }

  const paceRatio =
    intelligence.dailyGoalMinutes > 0
      ? Math.min(1.6, intelligence.focusMinutesToday / intelligence.dailyGoalMinutes)
      : 0;
  const velocityBoost = Math.round((intelligence.velocityScore / 100) * 38 / difficultyLoadFactor);
  const paceBoost = Math.round(paceRatio * 24);
  const predictedDailyCompletionPct = Math.max(
    currentCompletionPct,
    Math.min(100, Math.round(currentCompletionPct + velocityBoost + paceBoost * 0.45))
  );

  // Average minutes per remaining target scaled by active difficulty tier
  const minutesPerTarget = 2.4 * difficultyLoadFactor;
  const estimatedMinutesRemaining = Math.max(
    3,
    Math.min(90, Math.round(remaining * minutesPerTarget))
  );

  const paceVerdict: DailyVelocityPrediction['paceVerdict'] =
    predictedDailyCompletionPct >= 88
      ? 'Ahead of Target'
      : predictedDailyCompletionPct >= 65
      ? 'On Track'
      : 'Needs Acceleration';

  return {
    predictedDailyCompletionPct,
    currentCompletionPct,
    difficultyLoadFactor,
    estimatedMinutesRemaining,
    paceVerdict
  };
}

interface SprintVelocityGaugeProps {
  intelligence: SmartSprintIntelligenceReport;
}

/**
 * Semi-circular editorial SVG Sprint Velocity Gauge visualizing predicted daily progress
 * based on current study pace and remaining target difficulty.
 */
export const SprintVelocityGauge: React.FC<SprintVelocityGaugeProps> = ({ intelligence }) => {
  const prediction = computeDailyProgressPrediction(intelligence);

  // Semi-circle geometry (180 degrees from left to right)
  const radius = 84;
  const cx = 112;
  const cy = 104;
  const arcLength = Math.PI * radius;

  const predictedDashOffset = arcLength * (1 - prediction.predictedDailyCompletionPct / 100);
  const currentDashOffset = arcLength * (1 - prediction.currentCompletionPct / 100);

  // Needle endpoint angle (PI = left/0%, 0 = right/100%)
  const angleRad = Math.PI * (1 - prediction.predictedDailyCompletionPct / 100);
  const needleLen = 64;
  const nx = cx + needleLen * Math.cos(angleRad);
  const ny = cy - needleLen * Math.sin(angleRad);

  const verdictTone =
    prediction.paceVerdict === 'Target Cleared' || prediction.paceVerdict === 'Ahead of Target'
      ? 'text-[#0F4C45] dark:text-[#6EE7B7]'
      : prediction.paceVerdict === 'On Track'
      ? 'text-[#9A630B] dark:text-[#F4A62A]'
      : 'text-rose-700 dark:text-rose-400';

  return (
    <div
      data-testid="sprint-velocity-gauge"
      className="p-4 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA]/80 dark:border-[#1F8A70]/25 flex flex-col justify-between gap-3"
    >
      <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#566664] dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">
          <Gauge className="w-3.5 h-3.5 text-[#F4A62A]" />
          <span>Daily Forecast Gauge</span>
        </span>
        <span className={`font-semibold ${verdictTone}`}>{prediction.paceVerdict}</span>
      </div>

      {/* Semi-Circular SVG Velocity Gauge */}
      <div className="flex flex-col items-center">
        <svg
          viewBox="0 0 224 122"
          className="w-full max-w-[224px] h-auto overflow-visible"
          role="img"
          aria-label={`Predicted daily progress ${prediction.predictedDailyCompletionPct} percent at ${intelligence.difficultyLabel} difficulty`}
        >
          {/* Base Track */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="currentColor"
            className="text-[#DDE6E3] dark:text-[#162B28]"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Predicted Progress Arc (Warm Gold) */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="#F4A62A"
            strokeOpacity="0.45"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={predictedDashOffset}
            className="transition-all duration-500"
          />

          {/* Completed Progress Arc (Deep Forest Teal) */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="#0F4C45"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={currentDashOffset}
            className="transition-all duration-500"
          />

          {/* Predictive Pace Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={nx}
            y2={ny}
            stroke="#F4A62A"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r="5" fill="#0F4C45" stroke="#F4A62A" strokeWidth="2" />

          {/* Scale Anchors */}
          <text x={cx - radius} y={cy + 16} textAnchor="middle" className="fill-slate-400 text-[9px] font-mono">
            0%
          </text>
          <text x={cx} y={cy - radius - 8} textAnchor="middle" className="fill-slate-400 text-[9px] font-mono">
            50%
          </text>
          <text x={cx + radius} y={cy + 16} textAnchor="middle" className="fill-slate-400 text-[9px] font-mono">
            100%
          </text>

          {/* Center Readout */}
          <text
            x={cx}
            y={cy - 22}
            textAnchor="middle"
            className="fill-[#0E1F1E] dark:fill-white font-mono text-[26px] font-bold"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {prediction.predictedDailyCompletionPct}%
          </text>
          <text
            x={cx}
            y={cy - 7}
            textAnchor="middle"
            className="fill-[#566664] dark:fill-slate-400 text-[10px] font-medium"
          >
            Predicted Today
          </text>
        </svg>
      </div>

      {/* Compact Tabular Pace & Remaining Difficulty Breakdown */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#D3DDDA]/70 dark:border-[#1F8A70]/20 text-center">
        <div>
          <div className="text-[10px] text-[#566664] dark:text-slate-400">Done Now</div>
          <div className="font-mono text-xs font-bold text-[#0E1F1E] dark:text-white tabular-nums">
            {prediction.currentCompletionPct}%
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#566664] dark:text-slate-400">Difficulty</div>
          <div className="font-mono text-xs font-bold text-[#0F4C45] dark:text-[#6EE7B7] capitalize">
            {intelligence.activeDifficulty}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#566664] dark:text-slate-400">Est. Left</div>
          <div className="font-mono text-xs font-bold text-[#0E1F1E] dark:text-white tabular-nums">
            {prediction.estimatedMinutesRemaining === 0 ? 'Done' : `${prediction.estimatedMinutesRemaining}m`}
          </div>
        </div>
      </div>
    </div>
  );
};
