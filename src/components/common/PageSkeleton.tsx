import React from 'react';

export const PageSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-pulse py-6 select-none">
      <div className="h-40 rounded-3xl bg-slate-200/80 dark:bg-slate-800/80 w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="h-36 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
        <div className="h-36 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
        <div className="h-36 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
      </div>
    </div>
  );
};
