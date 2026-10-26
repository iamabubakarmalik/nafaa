import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Copy, ChevronDown } from 'lucide-react';
import { Button } from '@/design-system/components';

/**
 * Error boundary around every page. A render error stops only the page, not
 * the whole app: the user sees what happened in plain Roman Urdu, can retry
 * or go to the dashboard, and can open or copy the stack for a report.
 */

interface Props {
  children: ReactNode;
  /** Resets the boundary when this value changes (e.g. the route). */
  resetKey?: string;
  /** Small inline fallback for a section instead of a full page. */
  compact?: boolean;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null, showDetails: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Full details go to the console for developers.
    console.error('[Nafaa] Page crash:', error, info.componentStack);
    this.setState({ info });
  }

  componentDidUpdate(prev: Props) {
    // Clear the error when a new page opens.
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null, info: null, showDetails: false });
    }
  }

  private reset = () => this.setState({ error: null, info: null, showDetails: false });

  private copyDetails = () => {
    const { error, info } = this.state;
    const text = [
      `Safha: ${window.location.pathname}`,
      `Waqt: ${new Date().toISOString()}`,
      `Error: ${error?.name}: ${error?.message}`,
      '',
      error?.stack ?? '',
      '',
      info?.componentStack ?? '',
    ].join('\n');
    navigator.clipboard?.writeText(text);
  };

  render() {
    const { error, info, showDetails } = this.state;
    if (!error) return this.props.children;

    if (this.props.compact) {
      return (
        <div className="rounded-2xl bg-rose-50 p-4 text-center ring-1 ring-inset ring-rose-200">
          <AlertTriangle className="mx-auto mb-1.5 h-6 w-6 text-rose-600" />
          <p className="text-sm font-bold text-rose-900">Ye hissa khul nahi saka</p>
          <p className="mt-0.5 text-[0.75rem] text-rose-700">{error.message}</p>
          <Button size="xs" variant="critical" className="mt-3" onClick={this.reset} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>Dobara</Button>
        </div>
      );
    }

    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">
          <div className="border-b border-slate-200 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h2 className="mt-3 text-xl font-bold text-slate-900 sm:text-[1.375rem]">Ye safha khul nahi saka</h2>
            <p className="mt-1 text-sm text-slate-600">Aap ka koi data waste nahi hua — bas ye safha ruk gaya hai.</p>
          </div>

          <div className="space-y-3 p-5">
            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
              <div className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">Masla</div>
              <div className="break-words text-sm font-semibold text-slate-900">{error.name}: {error.message}</div>
              <div className="mt-0.5 break-all font-mono text-[0.6875rem] text-slate-500">{window.location.pathname}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button size="lg" onClick={this.reset} leftIcon={<RefreshCw className="h-4 w-4" />}>Dobara Koshish</Button>
              <Button size="lg" variant="secondary" onClick={() => { window.location.href = '/dashboard'; }} leftIcon={<Home className="h-4 w-4" />}>Dashboard</Button>
            </div>

            <Button size="sm" variant="ghost" fullWidth onClick={() => this.setState({ showDetails: !showDetails })}
              leftIcon={<ChevronDown className={showDetails ? 'h-3.5 w-3.5 rotate-180 transition' : 'h-3.5 w-3.5 transition'} />}>
              Details {showDetails ? 'chhupayein' : 'dekhein'}
            </Button>

            {showDetails && (
              <div className="max-h-56 overflow-auto rounded-xl bg-slate-900 p-3">
                <pre className="whitespace-pre-wrap break-words font-mono text-[0.6875rem] leading-relaxed text-slate-300">
                  {error.stack}
                  {info?.componentStack}
                </pre>
              </div>
            )}

            {showDetails && (
              <Button size="sm" variant="secondary" fullWidth onClick={this.copyDetails} leftIcon={<Copy className="h-3.5 w-3.5" />}>
                Details copy karein (report ke liye)
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }
}

/** Boundary that resets when the route changes. */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary resetKey={window.location.pathname}>{children}</ErrorBoundary>;
}
