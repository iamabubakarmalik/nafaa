import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-3xl bg-white border-2 border-rose-200 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-br from-rose-600 to-rose-800 text-white p-6">
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg mb-3">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-extrabold">Kuch ghalat ho gaya</h2>
              <p className="text-sm text-white/85 mt-1 font-semibold">
                Page load karte waqt error aayi hai. Neeche button dabao — theek ho jayega.
              </p>
            </div>
            <div className="p-6 space-y-3">
              {this.state.error?.message && (
                <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3">
                  <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-1">Error Details</div>
                  <div className="text-xs font-mono text-slate-700 break-all">
                    {this.state.error.message}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={this.handleReset}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 shadow-md transition"
                >
                  <RefreshCw className="h-4 w-4" /> Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className="h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-sm inline-flex items-center gap-2 transition"
                >
                  <RefreshCw className="h-4 w-4" /> Reload Page
                </button>
                <a
                  href="/"
                  className="h-11 px-4 rounded-xl bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-sm inline-flex items-center gap-2 transition"
                >
                  <Home className="h-4 w-4" /> Home
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
