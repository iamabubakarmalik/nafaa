import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });
  reload = () => window.location.reload();

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-3xl bg-white border-2 border-rose-200 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-br from-rose-600 to-rose-700 text-white p-6">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider font-extrabold text-rose-100">Error</div>
                  <h2 className="text-2xl font-extrabold">Kuch masla ho gaya</h2>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 font-semibold">
                Page load karne mein masla hua. Try again ya reload karein.
              </p>
              {this.state.error && (
                <details className="rounded-lg bg-slate-50 border-2 border-slate-200 p-3">
                  <summary className="text-xs font-extrabold text-slate-700 cursor-pointer">Details</summary>
                  <div className="mt-2 text-[11px] font-mono text-slate-600 max-h-40 overflow-auto">
                    <div className="font-extrabold text-rose-700">{this.state.error.name}: {this.state.error.message}</div>
                  </div>
                </details>
              )}
              <div className="flex gap-2">
                <button onClick={this.reset} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-md">
                  <RefreshCw className="h-4 w-4" /> Try Again
                </button>
                <button onClick={this.reload} className="h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-extrabold inline-flex items-center gap-2 border-2 border-slate-200">
                  <RefreshCw className="h-4 w-4" /> Reload
                </button>
                <Link to="/dashboard" className="h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center border-2 border-slate-200">
                  <Home className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
