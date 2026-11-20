import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, ArrowRight, RefreshCw, Clock, TrendingUp, CheckCircle, Flame } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { getHighestFrequencyErrorCategory, getUnresolvedMistakesCount } from '../../utils/vaultStorage';

interface SmartRecommendationBannerProps {
  onNavigate: (module: string) => void;
  onShowToast?: (msg: string) => void;
  targetBand?: number;
  estimatedBand?: number;
}

interface RecommendationItem {
  id: string;
  module: string;
  category: string;
  title: string;
  reason: string;
  impact: string;
  durationMins: number;
  difficulty: 'Band 7.0 Focus' | 'Band 7.5 Boost' | 'Band 8.0 Master';
  badgeColor: string;
}

const STATIC_RECOMMENDATIONS: RecommendationItem[] = [
  {
    id: 'writing_cohesion',
    module: 'writing',
    category: 'Writing Task 2',
    title: 'Discursive Essay Cohesion & Topic Sentences',
    reason: 'Diagnostic indicates frequent linker repetition. Upgrading to cohesive discourse markers bridges your band from 6.5 to 7.5.',
    impact: '+0.5 Band Potential',
    durationMins: 12,
    difficulty: 'Band 7.5 Boost',
    badgeColor: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800'
  },
  {
    id: 'reading_tfng',
    module: 'reading',
    category: 'Academic Reading',
    title: 'True / False / Not Given Distractor Trap Filter',
    reason: 'Eliminate false inference errors in Passage 2. Learn the Practice benchmark for statements unmentioned in text.',
    impact: '+2 Raw Marks',
    durationMins: 10,
    difficulty: 'Band 7.0 Focus',
    badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
  },
  {
    id: 'speaking_part2',
    module: 'speaking',
    category: 'Speaking Part 2',
    title: '2-Minute Long Turn Stamina & PPF Framework',
    reason: 'Avoid drying up at 1m15s. Train the Past-Present-Future pacing framework to maintain continuous Band 8.0 fluency.',
    impact: '+0.5 Fluency Band',
    durationMins: 8,
    difficulty: 'Band 8.0 Master',
    badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800'
  },
  {
    id: 'listening_sec3',
    module: 'listening',
    category: 'Listening Section 3',
    title: 'Multiple Speaker Reversals & Agreement Traps',
    reason: 'Tackle seminar dialogue questions where speaker B modifies speaker A\'s statement before reaching consensus.',
    impact: '+3 Raw Marks',
    durationMins: 11,
    difficulty: 'Band 7.5 Boost',
    badgeColor: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800'
  }
];

export const SmartRecommendationBanner: React.FC<SmartRecommendationBannerProps> = ({
  onNavigate,
  onShowToast,
  targetBand = 7.5,
  estimatedBand = 7.0
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [vaultTopCategory, setVaultTopCategory] = useState<{ category: string; count: number; module: string } | null>(null);

  const syncVault = () => {
    const top = getHighestFrequencyErrorCategory();
    setVaultTopCategory(top);
  };

  useEffect(() => {
    syncVault();
    window.addEventListener('vault_updated', syncVault);
    window.addEventListener('ielts_mistakes_updated', syncVault);
    return () => {
      window.removeEventListener('vault_updated', syncVault);
      window.removeEventListener('ielts_mistakes_updated', syncVault);
    };
  }, []);

  const recommendations = useMemo(() => {
    if (!vaultTopCategory) return STATIC_RECOMMENDATIONS;

    const dynamicRec: RecommendationItem = {
      id: 'vault_highest_error',
      module: vaultTopCategory.module,
      category: `${vaultTopCategory.module.toUpperCase()} MISTAKE VAULT`,
      title: `Eliminate Recurring Errors: ${vaultTopCategory.category}`,
      reason: `Mistake Vault analysis shows ${vaultTopCategory.count} unresolved error${vaultTopCategory.count > 1 ? 's' : ''} in ${vaultTopCategory.category}. Launch a targeted elimination drill now!`,
      impact: 'Targeted Fix',
      durationMins: 5,
      difficulty: 'Band 7.5 Boost',
      badgeColor: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800'
    };

    return [dynamicRec, ...STATIC_RECOMMENDATIONS];
  }, [vaultTopCategory]);

  const currentRec = recommendations[currentIndex] || recommendations[0];

  const handleNext = () => {
    soundManager.playBeep(520, 0.03);
    setCurrentIndex((prev) => (prev + 1) % recommendations.length);
  };

  const handleStart = () => {
    soundManager.playBeep(640, 0.04);
    if (currentRec.id === 'vault_highest_error') {
      if (onShowToast) onShowToast(`Opening Mistake Vault for ${currentRec.title}...`);
      window.dispatchEvent(new CustomEvent('open_vault_modal'));
    } else {
      if (onShowToast) onShowToast(`Launching ${currentRec.title}...`);
      onNavigate(currentRec.module);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 p-4 sm:p-4.5 text-slate-900 dark:text-white shadow-sm">
      {/* Background ambient accents */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-purple-500/10 blur-2xl" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Left: Indicator & Content */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                <Flame className="w-3 h-3 text-amber-500" />
                AI Smart Recommendation
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${currentRec.badgeColor}`}>
                {currentRec.difficulty}
              </span>
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {currentRec.durationMins} mins
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
              {currentRec.title}
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 max-w-2xl">
              {currentRec.reason}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3 self-end md:self-center shrink-0 pt-1 md:pt-0">
          <button
            type="button"
            onClick={handleNext}
            title="Next recommendation"
            className="p-2 sm:px-2.5 sm:py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Next</span>
          </button>

          <button
            type="button"
            onClick={handleStart}
            className="px-4 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            <span className="font-mono tabular-nums">{currentRec.impact}</span>
            <span>· Start Drill</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
