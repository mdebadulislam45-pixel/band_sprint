import React from 'react';

/**
 * Shared loading UI for Suspense fallbacks and async views.
 * One look everywhere: a branded spinner, a short label, and skeleton bars
 * that hold the page layout so content does not jump when it arrives.
 */

export const LoadingSpinner: React.FC<{ label?: string; className?: string }> = ({
  label,
  className = ''
}) => (
  <span
    role="status"
    aria-label={label || 'Loading'}
    className={`inline-flex items-center gap-2.5 ${className}`}
  >
    <span
      aria-hidden="true"
      className="w-5 h-5 rounded-full border-[3px] border-slate-300 dark:border-slate-700 border-t-[#0F4C45] dark:border-t-amber-400 animate-spin"
    />
    {label && (
      <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{label}</span>
    )}
  </span>
);

export const PageLoader: React.FC<{ label?: string }> = ({
  label = 'Loading BandSprint…'
}) => (
  <div
    role="status"
    aria-live="polite"
    aria-label={label}
    className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-16 flex flex-col items-center gap-6 select-none"
  >
    <LoadingSpinner label={label} />
    <div className="w-full space-y-4 animate-pulse" aria-hidden="true">
      <div className="h-40 rounded-3xl bg-slate-200/80 dark:bg-slate-800/80 w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="h-36 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
        <div className="h-36 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
        <div className="h-36 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
      </div>
    </div>
  </div>
);

export const SectionLoader: React.FC<{ label?: string }> = ({
  label = 'Loading…'
}) => (
  <div
    role="status"
    aria-live="polite"
    aria-label={label}
    className="w-full py-10 flex items-center justify-center"
  >
    <LoadingSpinner label={label} />
  </div>
);
