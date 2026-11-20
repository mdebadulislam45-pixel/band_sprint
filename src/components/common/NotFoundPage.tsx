import React from 'react';
import { Home, Compass, ArrowLeft } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

interface NotFoundPageProps {
  onNavigateHome: () => void;
  onGoBack: () => void;
  currentPath?: string;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  onNavigateHome,
  onGoBack,
  currentPath = ''
}) => {
  return (
    <div className="w-full max-w-xl mx-auto py-16 px-4 text-center space-y-6 select-none animate-fade-in">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
        <Compass className="w-10 h-10 animate-spin-slow" />
      </div>

      <div className="space-y-2">
        <div className="text-xs font-mono font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase">
          404 · Page Not Found
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Lost in the Practice Vaults?
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
          The page <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200">{currentPath || 'requested'}</code> does not exist or has been moved to one of our 5 main hubs.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            soundManager.playSuccess();
            onNavigateHome();
          }}
          className="min-h-[44px] w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Home className="w-4 h-4" />
          <span>Return to Home Hub</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(520, 0.03);
            onGoBack();
          }}
          className="min-h-[44px] w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go Back</span>
        </button>
      </div>
    </div>
  );
};
