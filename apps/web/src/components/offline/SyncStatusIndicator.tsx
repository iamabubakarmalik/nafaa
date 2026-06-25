import { useEffect, useState } from 'react';
import {
  Wifi, WifiOff, RefreshCw, Check, AlertCircle, CloudUpload,
  Clock, X, Database,
} from 'lucide-react';
import { subscribeSyncStatus, fullSync, type SyncStatus } from '@/lib/offline/syncEngine';
import { useOnlineStatus } from '@/lib/offline/useOnlineStatus';
import { db } from '@/lib/offline/db';
import { toast } from 'sonner';

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
    lastError: null,
  });
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState({ products: 0, customers: 0 });

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus(setStatus);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (open) {
      Promise.all([db.products.count(), db.customers.count()]).then(([p, c]) => {
        setStats({ products: p, customers: c });
      });
    }
  }, [open, status]);

  const totalPending = status.pendingSales + status.pendingQueue;
  const hasPending = totalPending > 0;
  const hasError = !!status.lastError;

  let icon = <Check className="h-3.5 w-3.5" />;
  let bgColor = 'bg-emerald-500';
  let ringColor = 'ring-emerald-200';
  let label = 'Synced';
  let pulse = false;

  if (status.isSyncing) {
    icon = <RefreshCw className="h-3.5 w-3.5 animate-spin" />;
    bgColor = 'bg-blue-500';
    ringColor = 'ring-blue-200';
    label = 'Syncing...';
    pulse = true;
  } else if (!isOnline) {
    icon = <WifiOff className="h-3.5 w-3.5" />;
    bgColor = hasPending ? 'bg-amber-500' : 'bg-slate-500';
    ringColor = hasPending ? 'ring-amber-200' : 'ring-slate-200';
    label = hasPending ? `Offline (${totalPending} pending)` : 'Offline';
    pulse = hasPending;
  } else if (hasError) {
    icon = <AlertCircle className="h-3.5 w-3.5" />;
    bgColor = 'bg-rose-500';
    ringColor = 'ring-rose-200';
    label = 'Sync error';
  } else if (hasPending) {
    icon = <CloudUpload className="h-3.5 w-3.5" />;
    bgColor = 'bg-amber-500';
    ringColor = 'ring-amber-200';
    label = `${totalPending} pending`;
    pulse = true;
  }

  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error('Internet connect karein pehle');
      return;
    }
    await fullSync();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-white text-xs font-extrabold ${bgColor} hover:opacity-90 transition shadow-sm ring-2 ${ringColor} ${pulse ? 'animate-pulse' : ''}`}
        title={label}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
        {hasPending && (
          <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white shadow-md">
            {totalPending > 9 ? '9+' : totalPending}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className={`px-4 py-3 ${bgColor} text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                  <h3 className="font-extrabold text-sm">
                    {isOnline ? 'Connected' : 'Offline Mode'}
                  </h3>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="h-7 w-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-white/85 mt-1 font-semibold">
                {isOnline ? 'Sab kuch sync ho raha hai' : 'Internet ke baghair kaam jari hai'}
              </p>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-semibold">Last sync</span>
                </div>
                <span className="font-extrabold text-slate-900">
                  {formatRelativeTime(status.lastSync)}
                </span>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-3.5 w-3.5 text-slate-600" />
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-600">
                    Offline Data
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-slate-500 font-semibold">Products</div>
                    <div className="font-extrabold text-slate-900 tabular-nums">
                      {stats.products.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-semibold">Customers</div>
                    <div className="font-extrabold text-slate-900 tabular-nums">
                      {stats.customers.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {hasPending && (
                <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CloudUpload className="h-3.5 w-3.5 text-amber-700" />
                    <span className="text-[11px] uppercase tracking-wider font-extrabold text-amber-800">
                      Sync ke liye taiyar
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    {status.pendingSales > 0 && (
                      <div className="flex justify-between">
                        <span className="text-amber-700 font-semibold">Sales</span>
                        <span className="font-extrabold text-amber-900 tabular-nums">
                          {status.pendingSales}
                        </span>
                      </div>
                    )}
                    {status.pendingQueue > 0 && (
                      <div className="flex justify-between">
                        <span className="text-amber-700 font-semibold">Other changes</span>
                        <span className="font-extrabold text-amber-900 tabular-nums">
                          {status.pendingQueue}
                        </span>
                      </div>
                    )}
                  </div>
                  {!isOnline && (
                    <p className="text-[10px] text-amber-700 font-bold mt-2">
                      Internet aane par auto-sync ho jaye ga
                    </p>
                  )}
                </div>
              )}

              {hasError && (
                <div className="rounded-xl bg-rose-50 border-2 border-rose-200 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-3.5 w-3.5 text-rose-700" />
                    <span className="text-[11px] uppercase tracking-wider font-extrabold text-rose-800">
                      Last error
                    </span>
                  </div>
                  <p className="text-xs text-rose-700 font-semibold">{status.lastError}</p>
                </div>
              )}

              <button
                onClick={handleManualSync}
                disabled={!isOnline || status.isSyncing}
                className="w-full h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white font-extrabold text-sm transition shadow-md inline-flex items-center justify-center gap-2"
              >
                {status.isSyncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Sync Now
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
