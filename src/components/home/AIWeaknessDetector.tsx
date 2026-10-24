import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Zap,
  Target
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

interface AIWeaknessDetectorProps {
  onNavigate: (module: string) => void;
  onShowToast?: (msg: string) => void;
  unmasteredMistakeCount?: number;
}

interface TrapItem {
  id: string;
  module: string;
  moduleName: string;
  trapTitle: string;
  description: string;
  frequency: string;
  bandImpact: string;
  severity: 'High' | 'Medium';
  remedy: string;
  drillTitle: string;
}

const IELTS_TRAPS: TrapItem[] = [
  {
    id: 'reading_tfng_trap',
    module: 'reading',
    moduleName: 'Academic Reading',
    trapTitle: 'TFNG vs False Inference Trap',
    description: 'You tend to mark logical inferences as "False" when the text merely omits confirmation.',
    frequency: '3 slip-ups recorded',
    bandImpact: '-0.5 Reading Band',
    severity: 'High',
    remedy: 'Cambridge Rule: "False" means the text directly refutes the claim. If the author never took a stand, it is strictly "Not Given".',
    drillTitle: 'Launch 3-Min TFNG Micro-Drill'
  },
  {
    id: 'listening_distractor_trap',
    module: 'listening',
    moduleName: 'Listening Section 3',
    trapTitle: 'Speaker Reversal & Consensus Trap',
    description: 'Prematurely selecting option A before speaker 2 gently corrects or amends the decision.',
    frequency: '2 slip-ups recorded',
    bandImpact: '-0.5 Listening Band',
    severity: 'High',
    remedy: 'Listen past the initial mention for discourse pivots like "Actually, looking back at the budget..." before noting the answer.',
    drillTitle: 'Launch Reversal Filter Drill'
  },
  {
    id: 'writing_linker_trap',
    module: 'writing',
    moduleName: 'Writing Task 2',
    trapTitle: 'Over-reliance on Mechanical Linkers',
    description: 'Beginning consecutive sentences with "Moreover", "Furthermore", and "In addition".',
    frequency: 'Detected in latest draft',
    bandImpact: 'Caps CC at Band 6.5',
    severity: 'Medium',
    remedy: 'Replace mechanical sentence-head linkers with referential pronouns, thematic fronting, and semicolon coordination.',
    drillTitle: 'Practice Natural Cohesion'
  },
  {
    id: 'speaking_pacing_trap',
    module: 'speaking',
    moduleName: 'Speaking Part 2',
    trapTitle: 'Part 2 Pacing Cliff (Early Exhaustion)',
    description: 'Speaking at high speed and running dry of content around the 1m15s mark.',
    frequency: 'Pacing alert',
    bandImpact: '-0.5 Fluency Band',
    severity: 'Medium',
    remedy: 'Structure your Cue Card response into 3 chapters: Background past context, present core memory, and future personal reflection.',
    drillTitle: 'Practice 2-Min Pacing Run'
  }
];

export const AIWeaknessDetector: React.FC<AIWeaknessDetectorProps> = ({
  onNavigate,
  onShowToast,
  unmasteredMistakeCount = 0
}) => {
  const [expandedTrapId, setExpandedTrapId] = useState<string | null>('reading_tfng_trap');

  const handleLaunchDrill = (trap: TrapItem) => {
    soundManager.playBeep(640, 0.04);
    if (onShowToast) {
      onShowToast(`Launching targeted micro-drill: ${trap.trapTitle}...`);
    }
    onNavigate(trap.module);
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0B1224] border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                AI Weakness Radar & Trap Alerts
              </h2>
              <span className="text-[10px] font-mono font-bold uppercase text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-500/20 px-1.5 py-0.5 rounded">
                Trap Detection
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Recurring examination traps identified across your practice mock history
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(540, 0.03);
            window.dispatchEvent(new CustomEvent('open_vault_modal'));
          }}
          className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
        >
          <span>Open Mistake Vault ({unmasteredMistakeCount})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Trap List */}
      <div className="space-y-2">
        {IELTS_TRAPS.map((trap) => {
          const isExpanded = expandedTrapId === trap.id;
          return (
            <div
              key={trap.id}
              className={`rounded-xl border transition overflow-hidden ${
                isExpanded
                  ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                  : 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/20 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div
                onClick={() => {
                  soundManager.playBeep(480, 0.02);
                  setExpandedTrapId(isExpanded ? null : trap.id);
                }}
                className="p-3 flex items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      trap.severity === 'High' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {trap.trapTitle}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        ({trap.moduleName})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {trap.frequency} · <span className="font-mono text-rose-500 font-semibold">{trap.bandImpact}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                      trap.severity === 'High'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {trap.severity} Priority
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-rose-200/50 dark:border-rose-900/40 space-y-2 text-xs">
                  <p className="text-slate-700 dark:text-slate-300">
                    {trap.description}
                  </p>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#0B1224] border border-rose-200/60 dark:border-rose-900/50 text-[11px] text-slate-800 dark:text-slate-200">
                    <span className="font-bold text-rose-600 dark:text-rose-400">Examiner Advice: </span>
                    {trap.remedy}
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleLaunchDrill(trap)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{trap.drillTitle}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
