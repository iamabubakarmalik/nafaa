import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Copy, ChevronDown } from 'lucide-react';

/* ═════════════════════════════════════════════════════════════
   ERROR BOUNDARY — safed safha ab nahi aayega
   ─────────────────────────────────────────────────────────────
   React me agar kisi bhi page ke render me error aa jaye aur
   koi boundary na ho, to poora app un-mount ho jata hai aur
   sirf SAFED SCREEN bachti hai — na koi paighaam, na koi
   ishara ke masla kahan hai.

   Nafaa me abhi tak koi boundary nahi thi. Ab har page isme
   lipta hua hai: error aane par safha ruk jata hai, saaf
   Urdu me batata hai ke kya hua, aur "dobara koshish" ka
   button deta hai. Tafseel (stack) chhupi rehti hai magar
   ek click par khul jati hai taake report ki ja sake.
   ═════════════════════════════════════════════════════════════ */

interface Props {
  children: ReactNode;
  /** Route badalne par boundary khud reset ho jaye */
  resetKey?: string;
  /** Chhoti jagah ke liye halka sa nazara */
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
    // Console me poori tafseel — developer tools se dekhi ja sakti hai
    console.error('[Nafaa] Page crash:', error, info.componentStack);
    this.setState({ info });
  }

  componentDidUpdate(prev: Props) {
    // Naya safha khulte hi purana error saaf
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
        <div className="rounded-2xl border-2 border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 p-4 text-center">
          <AlertTriangle className="h-6 w-6 text-rose-600 mx-auto mb-1.5" />
          <p className="text-sm font-extrabold text-rose-900 dark:text-rose-200">Ye hissa khul nahi saka</p>
          <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300 mt-0.5">{error.message}</p>
          <button onClick={this.reset}
            className="mt-3 h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition">
            <RefreshCw className="h-3.5 w-3.5" /> Dobara
          </button>
        </div>
      );
    }

    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-3xl bg-[#ffffff] dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
          <div className="relative bg-gradient-to-br from-slate-950 via-rose-900 to-red-700 text-white p-6 text-center overflow-hidden">
            <div className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-rose-400/25 blur-3xl" />
            <div className="relative">
              <div className="h-16 w-16 rounded-3xl bg-white/15 border-2 border-white/25 mx-auto flex items-center justify-center">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h2 className="mt-3 text-xl sm:text-2xl font-black">Ye safha khul nahi saka</h2>
              <p className="mt-1 text-sm font-bold text-white/85">
                Aap ka koi data zaya nahi hua — bas ye safha ruk gaya hai.
              </p>
            </div>
          </div>

          <div className="p-5 space-y-3">
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Masla</div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white break-words">
                {error.name}: {error.message}
              </div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 font-mono break-all">
                {window.location.pathname}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={this.reset}
                className="h-12 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-700 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98]">
                <RefreshCw className="h-4 w-4" /> Dobara Koshish
              </button>
              <button onClick={() => { window.location.href = '/dashboard'; }}
                className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-black inline-flex items-center justify-center gap-2 transition">
                <Home className="h-4 w-4" /> Dashboard
              </button>
            </div>

            <button onClick={() => this.setState({ showDetails: !showDetails })}
              className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-[11px] font-extrabold inline-flex items-center justify-center gap-1.5 transition">
              <ChevronDown className={`h-3.5 w-3.5 transition ${showDetails ? 'rotate-180' : ''}`} />
              Tafseel {showDetails ? 'chhupayein' : 'dekhein'}
            </button>

            {showDetails && (
              <div className="rounded-2xl bg-slate-900 dark:bg-black p-3 max-h-56 overflow-auto">
                <pre className="text-[10px] leading-relaxed text-slate-300 whitespace-pre-wrap break-words font-mono">
                  {error.stack}
                  {info?.componentStack}
                </pre>
              </div>
            )}

            {showDetails && (
              <button onClick={this.copyDetails}
                className="w-full h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-extrabold inline-flex items-center justify-center gap-1.5 transition">
                <Copy className="h-3.5 w-3.5" /> Tafseel copy karein (report ke liye)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}

/** Route ke sath reset hone wali boundary */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary resetKey={window.location.pathname}>{children}</ErrorBoundary>;
}
