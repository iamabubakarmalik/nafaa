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

/* ═════════════════════════════════════════════════════════════
   SYNC STATUS INDICATOR — PREMIUM v2
   ─────────────────────────────────────────────────────────────
   🎨 Gradient glow states + live pulse ring
   📊 Sync progress bar (23/50 syncing…) — button ke andar
   ❌ Failed count badge (rose) — alag se dikhta hai
   ⚡ Dropdown: data snapshot + quick actions + /sync deep-link
   🌙 Dark mode complete
   ═════════════════════════════════════════════════════════════ */

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
  let icon = <Check className="h-3.5 w-3.5" />;
  let btnClass = 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/40 ring-emerald-300/60';
  let label = 'Synced';
  let pulse = false;
  let glow = false;

  if (status.isSyncing) {
    icon = <RefreshCw className="h-3.5 w-3.5 animate-spin" />;
    btnClass = 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/40 ring-blue-300/60';
    label = status.progress
      ? `${status.progress.done}/${status.progress.total}`
      : 'Syncing…';
    pulse = true;
  } else if (!isOnline) {
    icon = <WifiOff className="h-3.5 w-3.5" />;
    btnClass = hasPending
      ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/40 ring-amber-300/60'
      : 'bg-gradient-to-br from-slate-500 to-slate-600 shadow-slate-500/40 ring-slate-300/60';
    label = hasPending ? `Offline • ${totalPending}` : 'Offline';
    pulse = hasPending;
    glow = hasPending;
  } else if (hasError) {
    icon = <AlertCircle className="h-3.5 w-3.5" />;
    btnClass = 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-500/40 ring-rose-300/60';
    label = hasFailed ? `${status.failedTotal} failed` : 'Sync error';
    glow = true;
  } else if (hasPending) {
    icon = <CloudUpload className="h-3.5 w-3.5" />;
    btnClass = 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/40 ring-amber-300/60';
    label = `${totalPending} pending`;
    pulse = true;
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
        className={`relative inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-xl text-white text-xs font-extrabold shadow-lg ${btnClass} hover:scale-[1.03] active:scale-95 transition-all duration-200 ring-2 overflow-hidden`}
        title={label}
      >
        {/* Glow animation (jab pending/failed ho) */}
        {glow && (
          <span className="absolute inset-0 rounded-xl bg-white/20 animate-ping opacity-30 pointer-events-none" />
        )}

        {icon}
        <span className="hidden sm:inline tabular-nums relative z-10">{label}</span>

        {/* Mini progress bar — syncing ke waqt button ke neeche */}
        {status.isSyncing && status.progress && status.progress.total > 0 && (
          <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/20">
            <span
              className="block h-full bg-white/90 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </span>
        )}

        {/* Pending badge — top-right */}
        {hasPending && !status.isSyncing && (
          <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-md">
            {totalPending > 9 ? '9+' : totalPending}
          </span>
        )}

        {/* Failed badge — alag, rose wala (jab pending badge bhi ho to dono dikhein) */}
        {hasFailed && hasPending && !status.isSyncing && (
          <span className="absolute -bottom-1.5 -right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-rose-700 text-white text-[9px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-md">
            !
          </span>
        )}

        {pulse && !glow && (
          <span className="absolute inset-0 rounded-xl ring-2 ring-white/40 animate-pulse pointer-events-none" />
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
                ? 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800'
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
                    <p className="text-[10px] text-white/80 font-bold">
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
                  <div className="flex justify-between text-[10px] font-extrabold text-white/90 mb-1">
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
                  <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-500 dark:text-slate-400">
                    Offline Data Cached
                  </span>
                  <ShieldCheck className="h-3 w-3 text-emerald-500 ml-auto" />
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
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">Products</div>
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
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">Customers</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending breakdown */}
              {hasPending && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CloudUpload className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                    <span className="text-[10px] uppercase tracking-widest font-extrabold text-amber-800 dark:text-amber-300">
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
                    <p className="text-[10px] text-amber-700 dark:text-amber-300 font-bold mt-2 flex items-center gap-1">
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
                    <span className="text-[10px] uppercase tracking-widest font-extrabold text-rose-800 dark:text-rose-300">
                      {status.failedTotal} items failed
                    </span>
                    <ArrowRight className="h-3 w-3 text-rose-500 ml-auto group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-1">
                    Sync Center me review karein
                  </p>
                </Link>
              )}

              {/* Last error (jab failed na ho) */}
              {!hasFailed && status.lastError && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-3.5 w-3.5 text-rose-700 dark:text-rose-400" />
                    <span className="text-[10px] uppercase tracking-widest font-extrabold text-rose-800 dark:text-rose-300">
                      Last error
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 font-semibold leading-snug">
                    {status.lastError}
                  </p>
                </div>
              )}

              {/* Sync Now button */}
              <button
                onClick={handleManualSync}
                disabled={!isOnline || status.isSyncing}
                className="w-full h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 active:scale-[0.98] disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-700 dark:disabled:to-slate-800 disabled:cursor-not-allowed text-white font-extrabold text-sm transition-all shadow-md shadow-emerald-500/30 inline-flex items-center justify-center gap-2"
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
                className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition group"
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
