import React from 'react';
import { ArrowLeft, ChevronRight, Home } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (path: string) => void;
  onBack?: () => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, onNavigate, onBack }) => {
  return (
    <div className="flex items-center justify-between gap-3 pb-3 mb-2 border-b border-slate-200/80 dark:border-slate-800/80">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(560, 0.03);
            onNavigate('/');
          }}
          className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition cursor-pointer min-h-[44px] px-1 font-medium"
          aria-label="Go to Home"
        >
          <Home className="w-3.5 h-3.5 text-slate-400" />
          <span>Home</span>
        </button>

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;

          return (
            <React.Fragment key={idx}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
              {isLast || !item.path ? (
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">
                  {item.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playBeep(560, 0.03);
                    onNavigate(item.path!);
                  }}
                  className="hover:text-slate-900 dark:hover:text-white transition cursor-pointer min-h-[44px] px-1 font-medium truncate max-w-[150px]"
                >
                  {item.label}
                </button>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {onBack && (
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(520, 0.03);
            onBack();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition shrink-0 cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      )}
    </div>
  );
};
