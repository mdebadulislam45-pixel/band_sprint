import React, { useState, useEffect } from 'react';
import { Lightbulb, ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { getMistakes } from '../../utils/vaultStorage';
import { MistakeItem } from '../../types';
import { soundManager } from '../../utils/audioEffects';

interface MistakeVaultWidgetProps {
  onOpenVault: () => void;
  onNavigate: (module: string) => void;
}

export const MistakeVaultWidget: React.FC<MistakeVaultWidgetProps> = ({
  onOpenVault,
  onNavigate
}) => {
  const [unmasteredList, setUnmasteredList] = useState<MistakeItem[]>([]);

  const loadMistakes = () => {
    const all = getMistakes();
    setUnmasteredList(all.filter((m) => !m.mastered));
  };

  useEffect(() => {
    loadMistakes();
    const handleUpdate = () => loadMistakes();
    window.addEventListener('ielts_mistakes_updated', handleUpdate);
    return () => window.removeEventListener('ielts_mistakes_updated', handleUpdate);
  }, []);

  const count = unmasteredList.length;
  const sampleMistake = unmasteredList[0];

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0B1224] border border-slate-200/90 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Mistake Vault & Drills
            </h3>
            <span className="text-[10px] text-slate-400">
              Active Recurring Error Triage
            </span>
          </div>
        </div>

        <button
          onClick={onOpenVault}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
        >
          View All ({count})
        </button>
      </div>

      {count > 0 ? (
        <div className="space-y-2.5">
          <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                {sampleMistake?.module?.toUpperCase() || 'EXAM'} RECOVERY
              </span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                {count} item{count > 1 ? 's' : ''} to master
              </span>
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {sampleMistake?.title}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
              {sampleMistake?.explanation}
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playSuccess();
              onOpenVault();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
          >
            <span>Launch Mistake Elimination Drill</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-center space-y-1.5">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Mistake Vault Clean
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            No active error flags recorded. Your retention is sharp!
          </div>
        </div>
      )}
    </div>
  );
};
