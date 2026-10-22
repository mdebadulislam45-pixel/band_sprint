import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Volume2, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onRetry?: () => void;
  isolateAudio?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AudioErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AudioErrorBoundary] Caught error in audio or child component:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 text-slate-800 space-y-2 shadow-xs my-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
            <Volume2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{this.props.fallbackTitle || 'Audio Track Stream Protected'}</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            The media segment encountered a decoding or network stream issue. Your test answers, timers, and question inputs remain fully preserved.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Audio Track</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
