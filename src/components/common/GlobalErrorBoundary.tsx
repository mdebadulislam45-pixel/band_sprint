import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  pageName?: string;
  onReset?: () => void;
  onNavigateHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GlobalErrorBoundary] Caught unhandled React UI render error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public componentDidUpdate(prevProps: Props) {
    // If the active page changes, auto-reset the error boundary so other pages work immediately
    if (this.props.pageName !== prevProps.pageName && this.state.hasError) {
      this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    if (this.props.onNavigateHome) {
      this.props.onNavigateHome();
    } else if (typeof window !== 'undefined') {
      window.location.hash = '';
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      const pageTitle = this.props.pageName
        ? this.props.pageName.charAt(0).toUpperCase() + this.props.pageName.slice(1)
        : 'Section';

      return (
        <div className="min-h-[380px] w-full flex items-center justify-center p-4 sm:p-6 my-4 animate-fade-in">
          <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xl shadow-slate-200/50 space-y-5 text-center">
            {/* Reassuring status badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Study Progress Safely Preserved</span>
            </div>

            {/* Error icon */}
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-2xs">
              <AlertTriangle className="w-7 h-7 text-amber-600" />
            </div>

            {/* Title & description */}
            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {this.props.fallbackTitle || `${pageTitle} Display Paused`}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                An unexpected view error occurred while rendering this component. Your profile, test answers, and mistake vault are intact.
              </p>
            </div>

            {/* Action buttons with minimum 44px touch targets */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 border border-slate-200 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Return to Dashboard</span>
              </button>
            </div>

            {/* Technical details disclosure */}
            {this.state.error && (
              <div className="pt-3 border-t border-slate-100 text-left">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="min-h-[36px] w-full flex items-center justify-between text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition py-1"
                >
                  <span>Technical Diagnostic Details</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {this.state.showDetails && (
                  <div className="mt-2 p-3 rounded-xl bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-48 leading-relaxed">
                    <p className="text-rose-400 font-bold mb-1">{this.state.error.name}: {this.state.error.message}</p>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="text-[10px] text-slate-400 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack.trim().slice(0, 500)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
