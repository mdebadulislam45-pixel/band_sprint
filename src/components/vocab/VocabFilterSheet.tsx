import React from 'react';
import {
  Sliders,
  Filter,
  RotateCcw,
  X,
  Check,
  Layers,
  BookOpen,
  Sparkles,
  Lightbulb
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

interface VocabFilterSheetProps {
  selectedCategory: 'all' | 'word' | 'phrase' | 'idiom';
  onSelectCategory: (cat: 'all' | 'word' | 'phrase' | 'idiom') => void;
  selectedLevel: 'all' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  onSelectLevel: (lvl: 'all' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2') => void;
  selectedTopic: string;
  onSelectTopic: (topic: string) => void;
  topics: string[];
  searchQuery: string;
  onClearSearch: () => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  totalFilteredCount: number;
}

export const VocabFilterSheet: React.FC<VocabFilterSheetProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedLevel,
  onSelectLevel,
  selectedTopic,
  onSelectTopic,
  topics,
  searchQuery,
  onClearSearch,
  onResetFilters,
  hasActiveFilters,
  totalFilteredCount
}) => {
  const levels: Array<'all' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'> = [
    'all',
    'A2',
    'B1',
    'B2',
    'C1',
    'C2'
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5">
      {/* Category selector row */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
        {[
          { id: 'all' as const, label: 'All Items', icon: Layers },
          { id: 'word' as const, label: 'Words', icon: BookOpen },
          { id: 'phrase' as const, label: 'Phrases', icon: Sparkles },
          { id: 'idiom' as const, label: 'Idioms', icon: Lightbulb }
        ].map((c) => {
          const Icon = c.icon;
          const isSelected = selectedCategory === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                soundManager.playBeep(600, 0.03);
                onSelectCategory(c.id);
              }}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-2xs font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* CEFR Level filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
        <span className="text-[11px] font-mono font-bold uppercase text-slate-400 shrink-0">
          CEFR Level:
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {levels.map((lvl) => {
            const isSelected = selectedLevel === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => {
                  soundManager.playBeep(600, 0.03);
                  onSelectLevel(lvl);
                }}
                className={`min-h-[32px] px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {lvl === 'all' ? 'All' : lvl}
              </button>
            );
          })}
        </div>
      </div>

      {/* Topic selection pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
        <span className="text-[11px] font-mono font-bold uppercase text-slate-400 shrink-0">
          Topic:
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {topics.map((t) => {
            const isSelected = selectedTopic === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  soundManager.playBeep(600, 0.03);
                  onSelectTopic(t);
                }}
                className={`min-h-[32px] px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                  isSelected
                    ? 'bg-indigo-900 text-white border-indigo-900'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Summary & Reset Button */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
        <span className="font-bold text-slate-700">
          {totalFilteredCount} items match current filters
        </span>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 transition bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>
    </div>
  );
};
