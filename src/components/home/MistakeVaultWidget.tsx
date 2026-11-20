import React, { useState, useEffect } from 'react';
import { Lightbulb, ArrowRight, ShieldCheck, Brain, Sparkles, Clock } from 'lucide-react';
import { getMistakes, getDueMistakes, getVaultRetentionStats, seedHighYieldMistakes } from '../../utils/vaultStorage';
import { MistakeItem } from '../../types';
import { soundManager } from '../../utils/audioEffects';

interface MistakeVaultWidgetProps {
  onOpenVault: () => void;
  onNavigate: (module: string) => void;
}

export const MistakeVaultWidget: React.FC<MistakeVaultWidgetProps> = ({
  onOpenVault
}) => {
  const [allMistakes, setAllMistakes] = useState<MistakeItem[]>([]);
  const [dueList, setDueList] = useState<MistakeItem[]>([]);
  const [stats, setStats] = useState(() => getVaultRetentionStats());

  const loadMistakes = () => {
    const all = getMistakes();
    setAllMistakes(all);
    setDueList(getDueMistakes());
    setStats(getVaultRetentionStats());
  };

  useEffect(() => {
    loadMistakes();
    const handleUpdate = () => loadMistakes();
    window.addEventListener('ielts_mistakes_updated', handleUpdate);
    window.addEventListener('vault_updated', handleUpdate);
    return () => {
      window.removeEventListener('ielts_mistakes_updated', handleUpdate);
      window.removeEventListener('vault_updated', handleUpdate);
    };
  }, []);

  const unmasteredList = allMistakes.filter((m) => !m.mastered);
  const count = unmasteredList.length;
  const sampleMistake = dueList[0] || unmasteredList[0];

  const handleSeedSamples = () => {
    soundManager.playSuccess();
    seedHighYieldMistakes();
    loadMistakes();
  };

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0B1224] border border-slate-200/90 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>SM-2 Mistake Vault</span>
              {stats.dueCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-mono text-[10px] font-black">
                  {stats.dueCount} Due
                </span>
              )}
            </h3>
            <span className="text-[10px] text-slate-400">
              SuperMemo SM-2 Spaced Repetition
            </span>
          </div>
        </div>

        <button
          onClick={onOpenVault}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        >
          Open Vault ({allMistakes.length})
        </button>
      </div>

      {/* SM-2 Retention Mini Telemetry Strip */}
      <div className="grid grid-cols-3 gap-2 text-center font-mono">
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
          <span className="text-[9px] uppercase text-slate-400 block font-bold">Due Today</span>
          <span className={`text-xs font-black ${stats.dueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {stats.dueCount}
          </span>
        </div>
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
          <span className="text-[9px] uppercase text-slate-400 block font-bold">Mastered</span>
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
            {stats.masteredCount}/{stats.total}
          </span>
        </div>
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
          <span className="text-[9px] uppercase text-slate-400 block font-bold">Retention</span>
          <span className="text-xs font-black text-blue-600 dark:text-blue-400">
            {stats.retentionRate}%
          </span>
        </div>
      </div>

      {count > 0 && sampleMistake ? (
        <div className="space-y-2.5">
          <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                {sampleMistake.module.toUpperCase()} TRAP
              </span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                Int: {sampleMistake.intervalDays || 0}d · EF {(sampleMistake.easeFactor || 2.5).toFixed(1)}
              </span>
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {sampleMistake.title}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
              {sampleMistake.explanation}
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playSuccess();
              onOpenVault();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
          >
            <span>Start 5-Min SM-2 Recall ({stats.dueCount || count} Cards)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-center space-y-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {allMistakes.length > 0 ? 'All SM-2 Cards Mastered!' : 'Mistake Vault Ready'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {allMistakes.length > 0
              ? 'Zero cards due right now. Your memory retention is sharp!'
              : 'Load 5 high-yield Practice distractor traps to test SM-2 active recall.'}
          </div>
          {allMistakes.length === 0 && (
            <button
              onClick={handleSeedSamples}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load 5 Practice Traps (EN/বাংলা)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

