import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Wifi, WifiOff, RefreshCw, Check, AlertCircle, CloudUpload,
  Clock, X, Database, Zap, TrendingUp, ShieldCheck, ArrowRight,
  Package, Users, Activity,
} from 'lucide-react';
import { subscribeSyncStatus, fullSync, type SyncStatus } from '@core/lib/offline/syncEngine';
import { useOnlineStatus } from '@core/lib/offline/useOnlineStatus';
import { db } from '@core/lib/offline/db';
import { toast } from 'sonner';

/**
 * Offline sync status in the top bar.
 *
 * The pill shows the current state (synced, syncing with progress, pending,
 * offline, failed) and a pending-count badge. Clicking it opens a panel with
 * a snapshot of local data, a manual sync button and a link to the full
 * Sync Center (/sync).
 */

function formatRelativeTime(ts: number | null): string {
  if (!ts) return 'Never';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'Just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} hr ago`;
  return new Date(ts).toLocaleDateString();
}

export function SyncStatusIndicator() {
  const isOnline = useOnlineStatus();
  const [status, setStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSync: null,
    pendingSales: 0,
    pendingQueue: 0,
    failedTotal: 0,
    lastError: null,
    progress: null,
  });
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState({ products: 0, customers: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus(setStatus);
    return unsubscribe;
  }, []);

  // Dropdown open hone pe data snapshot fresh karo
  useEffect(() => {
    if (open) {
      Promise.all([db.products.count(), db.customers.count()]).then(([p, c]) => {
        setStats({ products: p, customers: c });
      });
    }
  }, [open, status]);

  // Escape key se band
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const totalPending = status.pendingSales + status.pendingQueue;
  const hasPending = totalPending > 0;
  const hasFailed = status.failedTotal > 0;
  const hasError = !!status.lastError || hasFailed;

  // ═══ STATE → VISUALS ═══
  let icon = <Check className="h-3.5 w-3.5 text-success-600 dark:text-success-400" />;
  let btnClass = 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.07]';
  let label = 'Synced';

  if (status.isSyncing) {
    icon = <RefreshCw className="h-3.5 w-3.5 animate-spin" />;
    btnClass = 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300';
    label = status.progress
      ? `${status.progress.done}/${status.progress.total}`
      : 'Syncing…';
  } else if (!isOnline) {
    icon = <WifiOff className="h-3.5 w-3.5" />;
    btnClass = hasPending
      ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
      : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300';
    label = hasPending ? `Offline • ${totalPending}` : 'Offline';
  } else if (hasError) {
    icon = <AlertCircle className="h-3.5 w-3.5" />;
    btnClass = 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300';
    label = hasFailed ? `${status.failedTotal} failed` : 'Sync error';
  } else if (hasPending) {
    icon = <CloudUpload className="h-3.5 w-3.5" />;
    btnClass = 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300';
    label = `${totalPending} pending`;
  }

  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error('Internet connect karein pehle');
      return;
    }
    await fullSync(false, true);
  };

  // Progress percentage (button ke andar mini bar)
  const progressPct =
    status.progress && status.progress.total > 0
      ? Math.round((status.progress.done / status.progress.total) * 100)
      : 0;

  return (
    <div className="relative">
      {/* ═══ MAIN BUTTON ═══ */}
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className={`relative inline-flex h-9 items-center gap-1.5 overflow-visible rounded-lg border px-2.5 text-[0.8125rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${btnClass}`}
        title={label}
      >
        {icon}
        <span className="hidden tabular-nums xl:inline">{label}</span>

        {/* Mini progress bar — syncing ke waqt button ke neeche */}
        {status.isSyncing && status.progress && status.progress.total > 0 && (
          <span className="absolute inset-x-1 bottom-0.5 h-0.5 overflow-hidden rounded-full bg-current/15">
            <span
              className="block h-full bg-current transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </span>
        )}

        {/* Pending badge — top-right */}
        {hasPending && !status.isSyncing && (
          <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-rose-600 text-white text-[0.6875rem] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-md">
            {totalPending > 9 ? '9+' : totalPending}
          </span>
        )}

        {/* Failed badge — alag, rose wala (jab pending badge bhi ho to dono dikhein) */}
        {hasFailed && hasPending && !status.isSyncing && (
          <span className="absolute -bottom-1.5 -right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-rose-700 text-white text-[0.625rem] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-md">
            !
          </span>
        )}

      </button>

      {/* ═══ DROPDOWN PANEL ═══ */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-[340px] rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">

            {/* ── Header (gradient) ── */}
            <div className={`px-4 py-3.5 text-white relative overflow-hidden ${
              isOnline
                ? 'bg-gradient-to-br from-success-600 via-success-700 to-success-800'
                : 'bg-gradient-to-br from-amber-500 via-orange-600 to-orange-700'
            }`}>
              <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/15 blur-2xl pointer-events-none" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/25">
                    {isOnline ? <Wifi className="h-4.5 w-4.5" /> : <WifiOff className="h-4.5 w-4.5" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm leading-tight">
                      {isOnline ? 'Connected' : 'Offline Mode'}
                    </h3>
                    <p className="text-[0.6875rem] text-white/80 font-bold">
                      {isOnline ? 'Auto-sync active hai' : 'Data device pe safe hai'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="h-7 w-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Sync progress — header ke andar */}
              {status.isSyncing && status.progress && status.progress.total > 0 && (
                <div className="relative mt-3">
                  <div className="flex justify-between text-[0.6875rem] font-extrabold text-white/90 mb-1">
                    <span className="inline-flex items-center gap-1">
                      <Zap className="h-3 w-3" /> Uploading…
                    </span>
                    <span className="tabular-nums">{status.progress.done} / {status.progress.total}</span>
                  </div>
                  <div className="h-1.5 bg-white/25 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Body ── */}
            <div className="p-4 space-y-3">

              {/* Last sync row */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-bold text-xs">Last sync</span>
                </div>
                <span className="font-extrabold text-slate-900 dark:text-white text-xs tabular-nums">
                  {formatRelativeTime(status.lastSync)}
                </span>
              </div>

              {/* Data snapshot */}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <Database className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-[0.6875rem] uppercase tracking-widest font-extrabold text-slate-500 dark:text-slate-400">
                    Offline Data Cached
                  </span>
                  <ShieldCheck className="h-3 w-3 text-success-500 ml-auto" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center shadow-sm">
                      <Package className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white tabular-nums text-sm leading-none">
                        {stats.products.toLocaleString()}
                      </div>
                      <div className="text-[0.6875rem] text-slate-500 dark:text-slate-400 font-bold mt-0.5">Products</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-sm">
                      <Users className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white tabular-nums text-sm leading-none">
                        {stats.customers.toLocaleString()}
                      </div>
                      <div className="text-[0.6875rem] text-slate-500 dark:text-slate-400 font-bold mt-0.5">Customers</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending breakdown */}
              {hasPending && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CloudUpload className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                    <span className="text-[0.6875rem] uppercase tracking-widest font-extrabold text-amber-800 dark:text-amber-300">
                      Sync ke liye taiyar
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {status.pendingSales > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-amber-700 dark:text-amber-300 font-bold">🧾 Sales</span>
                        <span className="font-extrabold text-amber-900 dark:text-amber-100 tabular-nums bg-amber-100 dark:bg-amber-500/20 rounded-full px-2 py-0.5">
                          {status.pendingSales}
                        </span>
                      </div>
                    )}
                    {status.pendingQueue > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-amber-700 dark:text-amber-300 font-bold">⚙️ Other changes</span>
                        <span className="font-extrabold text-amber-900 dark:text-amber-100 tabular-nums bg-amber-100 dark:bg-amber-500/20 rounded-full px-2 py-0.5">
                          {status.pendingQueue}
                        </span>
                      </div>
                    )}
                  </div>
                  {!isOnline && (
                    <p className="text-[0.6875rem] text-amber-700 dark:text-amber-300 font-bold mt-2 flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      Internet aane par auto-sync ho jayega
                    </p>
                  )}
                </div>
              )}

              {/* Failed alert */}
              {hasFailed && (
                <Link
                  to="/sync"
                  onClick={() => setOpen(false)}
                  className="block rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition group"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-rose-700 dark:text-rose-400" />
                    <span className="text-[0.6875rem] uppercase tracking-widest font-extrabold text-rose-800 dark:text-rose-300">
                      {status.failedTotal} items failed
                    </span>
                    <ArrowRight className="h-3 w-3 text-rose-500 ml-auto group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[0.6875rem] text-rose-600 dark:text-rose-400 font-bold mt-1">
                    Sync Center me review karein
                  </p>
                </Link>
              )}

              {/* Last error (jab failed na ho) */}
              {!hasFailed && status.lastError && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-3.5 w-3.5 text-rose-700 dark:text-rose-400" />
                    <span className="text-[0.6875rem] uppercase tracking-widest font-extrabold text-rose-800 dark:text-rose-300">
                      Last error
                    </span>
                  </div>
                  <p className="text-[0.6875rem] text-rose-700 dark:text-rose-300 font-semibold leading-snug">
                    {status.lastError}
                  </p>
                </div>
              )}

              {/* Sync Now button */}
              <button
                onClick={handleManualSync}
                disabled={!isOnline || status.isSyncing}
                className="w-full h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 active:scale-[0.98] disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-700 dark:disabled:to-slate-800 disabled:cursor-not-allowed text-white font-extrabold text-sm transition-all shadow-md shadow-brand-500/30 inline-flex items-center justify-center gap-2"
              >
                {status.isSyncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Syncing…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Sync Now
                  </>
                )}
              </button>

              {/* Sync Center link */}
              <Link
                to="/sync"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 text-[0.6875rem] font-extrabold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition group"
              >
                <TrendingUp className="h-3 w-3" />
                Full history — Sync Center kholein
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
