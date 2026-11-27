import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Human-readable name of the area being guarded, shown in the fallback UI. */
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render errors (including failed lazy chunk loads) anywhere below it
 * and shows a friendly recovery screen instead of a blank page.
 *
 * Retry reloads the current route, which re-fetches a failed code chunk.
 * Navigating to another route remounts the boundary (callers pass a
 * route-derived `key`), so a broken page never poisons the rest of the app.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Auto-recover once if a stale tab hits a dynamic module fetch error after restart/deploy
    const msg = String(error?.message || '');
    const isDynamicImportError =
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      error?.name === 'ChunkLoadError';

    if (isDynamicImportError && typeof window !== 'undefined') {
      try {
        const key = 'bandsprint_chunk_reload_at';
        const lastReload = Number(sessionStorage.getItem(key) || '0');
        if (!Number.isFinite(lastReload) || Date.now() - lastReload > 15000) {
          sessionStorage.setItem(key, String(Date.now()));
          window.location.reload();
          return;
        }
      } catch {}
    }

    // Diagnostics only — never sent anywhere.
    console.error('[BandSprint] Error boundary caught:', error, info.componentStack);
  }

  private handleRetry = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        className="w-full max-w-2xl mx-auto px-4 py-16 sm:py-24 flex flex-col items-center text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-2xl font-black text-amber-600 dark:text-amber-300">
          !
        </div>
        <h1 className="mt-5 text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
          {this.props.label ? `The ${this.props.label} could not load. ` : ''}
          Your progress is saved — try loading this page again.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={this.handleRetry}
            className="min-h-[48px] w-full sm:w-auto px-6 rounded-xl bg-[#0F4C45] hover:bg-[#0d3d38] text-white text-sm font-bold transition cursor-pointer"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={this.handleGoHome}
            className="min-h-[48px] w-full sm:w-auto px-6 rounded-xl bg-white dark:bg-[#0E1526] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold transition cursor-pointer"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }
}
