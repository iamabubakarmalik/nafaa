/**
 * Offline sync status in the top bar.
 *
 * The pill shows the current state — synced, syncing (with progress),
 * pending, offline or failed — plus a pending-count badge. The panel shows
 * the connection, last sync time, how much data is cached on this device,
 * what is waiting to upload, failures, a manual sync button and a link to
 * the full Sync Center (/sync).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertCircle, ArrowRight, Check, CloudUpload, Database, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { fullSync, subscribeSyncStatus, type SyncStatus } from '@core/lib/offline/syncEngine';
import { useOnlineStatus } from '@core/lib/offline/useOnlineStatus';
import { db } from '@core/lib/offline/db';
import { cn } from '@core/lib/cn';
import { Panel, useDismiss } from '../ui';

function formatRelativeTime(ts: number | null): string {
  if (!ts) return 'Never';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`;
  return new Date(ts).toLocaleDateString('en-PK');
}

type State = 'synced' | 'syncing' | 'pending' | 'offline' | 'failed';

const PILL: Record<State, string> = {
  synced: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
  syncing: 'border-blue-200 bg-blue-50 text-blue-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  offline: 'border-slate-200 bg-slate-100 text-slate-600',
  failed: 'border-rose-200 bg-rose-50 text-rose-700',
};

const INITIAL: SyncStatus = {
  isSyncing: false, lastSync: null, pendingSales: 0, pendingQueue: 0, failedTotal: 0, lastError: null, progress: null,
};

export function SyncStatusIndicator() {
  const isOnline = useOnlineStatus();
  const [status, setStatus] = useState<SyncStatus>(INITIAL);
  const [open, setOpen] = useState(false);
  const [cached, setCached] = useState({ products: 0, customers: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  useEffect(() => subscribeSyncStatus(setStatus), []);

  useEffect(() => {
    if (!open) return;
    Promise.all([db.products.count(), db.customers.count()]).then(([products, customers]) => setCached({ products, customers }));
  }, [open, status]);

  const pending = status.pendingSales + status.pendingQueue;
  const failed = status.failedTotal > 0;
  const progressPct = status.progress && status.progress.total > 0 ? Math.round((status.progress.done / status.progress.total) * 100) : 0;

  const state: State = status.isSyncing ? 'syncing'
    : !isOnline ? (pending ? 'pending' : 'offline')
      : failed || status.lastError ? 'failed'
        : pending ? 'pending'
          : 'synced';

  const label = state === 'syncing' ? (status.progress ? `${status.progress.done}/${status.progress.total}` : 'Syncing…')
    : state === 'offline' ? 'Offline'
      : state === 'pending' ? (isOnline ? `${pending} pending` : `Offline · ${pending}`)
        : state === 'failed' ? (failed ? `${status.failedTotal} failed` : 'Sync error')
          : 'Synced';

  const icon = state === 'syncing' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
    : state === 'offline' || (state === 'pending' && !isOnline) ? <WifiOff className="h-3.5 w-3.5" />
      : state === 'failed' ? <AlertCircle className="h-3.5 w-3.5" />
        : state === 'pending' ? <CloudUpload className="h-3.5 w-3.5" />
          : <Check className="h-3.5 w-3.5 text-success-600" />;

  const syncNow = async () => {
    if (!isOnline) { toast.error('Connect to the internet first'); return; }
    await fullSync(false, true);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Sync status: ${label}`}
        title={label}
        className={cn(
          'relative inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[0.8125rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          PILL[state],
        )}
      >
        {icon}
        <span className="hidden tabular-nums xl:inline">{label}</span>
        {state === 'syncing' && progressPct > 0 && (
          <span className="absolute inset-x-1.5 bottom-1 h-0.5 overflow-hidden rounded-full bg-blue-200">
            <span className="block h-full bg-blue-600 transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </span>
        )}
        {pending > 0 && !status.isSyncing && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[0.625rem] font-bold tabular-nums text-white ring-2 ring-shell-bar xl:hidden">
            {pending > 9 ? '9+' : pending}
          </span>
        )}
      </button>

      <Panel open={open} onClose={close} widthClass="sm:w-[20rem]" label="Sync status">
        <div className="flex items-center gap-3 px-4 pb-3 pt-3">
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', isOnline ? 'bg-success-50 text-success-600' : 'bg-amber-50 text-amber-600')}>
            {isOnline ? <Wifi className="h-[1.125rem] w-[1.125rem]" /> : <WifiOff className="h-[1.125rem] w-[1.125rem]" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">{isOnline ? 'Connected' : 'Offline mode'}</h2>
            <p className="text-[0.75rem] text-slate-500">{isOnline ? 'Changes sync automatically' : 'Keep selling — data is saved on this device'}</p>
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-200 px-4 py-3">
          {status.isSyncing && status.progress && status.progress.total > 0 && (
            <div>
              <div className="mb-1 flex justify-between text-[0.75rem] font-medium text-slate-600">
                <span>Uploading</span>
                <span className="tabular-nums">{status.progress.done} / {status.progress.total}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              ['Last sync', formatRelativeTime(status.lastSync)],
              ['Products', cached.products.toLocaleString('en-PK')],
              ['Customers', cached.customers.toLocaleString('en-PK')],
            ].map(([term, value]) => (
              <div key={term} className="flex flex-col-reverse rounded-lg bg-slate-50 px-2 py-2 ring-1 ring-inset ring-slate-200">
                <dt className="text-[0.6875rem] text-slate-500">{term}</dt>
                <dd className="truncate text-[0.8125rem] font-semibold tabular-nums text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="flex items-center gap-1.5 text-[0.75rem] text-slate-500">
            <Database className="h-3.5 w-3.5 shrink-0" /> Products and customers are cached for offline selling.
          </p>

          {pending > 0 && (
            <div className="rounded-lg bg-amber-50 px-3 py-2.5 ring-1 ring-inset ring-amber-200">
              <div className="flex items-center gap-2 text-[0.8125rem] font-semibold text-amber-800">
                <CloudUpload className="h-4 w-4" /> Waiting to upload
              </div>
              <div className="mt-1.5 space-y-1 text-[0.75rem] text-amber-800">
                {status.pendingSales > 0 && <div className="flex justify-between"><span>Sales</span><span className="font-semibold tabular-nums">{status.pendingSales}</span></div>}
                {status.pendingQueue > 0 && <div className="flex justify-between"><span>Other changes</span><span className="font-semibold tabular-nums">{status.pendingQueue}</span></div>}
              </div>
              {!isOnline && <p className="mt-1.5 text-[0.75rem] text-amber-700">They upload by themselves when the internet is back.</p>}
            </div>
          )}

          {(failed || status.lastError) && (
            <Link to="/sync" onClick={close} className="block rounded-lg bg-rose-50 px-3 py-2.5 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-100">
              <div className="flex items-center gap-2 text-[0.8125rem] font-semibold text-rose-700">
                <AlertCircle className="h-4 w-4" />
                {failed ? `${status.failedTotal} item${status.failedTotal > 1 ? 's' : ''} failed` : 'Last sync error'}
                <ArrowRight className="ml-auto h-3.5 w-3.5" />
              </div>
              <p className="mt-1 line-clamp-2 text-[0.75rem] text-rose-700">{failed ? 'Review them in the Sync Center.' : status.lastError}</p>
            </Link>
          )}

          <button
            type="button"
            onClick={syncNow}
            disabled={!isOnline || status.isSyncing}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-[0.8125rem] font-semibold text-brand-fg transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            <RefreshCw className={cn('h-4 w-4', status.isSyncing && 'animate-spin')} />
            {status.isSyncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>

        <Link to="/sync" onClick={close}
          className="flex items-center justify-center gap-1 border-t border-slate-200 px-4 py-2.5 text-[0.8125rem] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900">
          Open Sync Center <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Panel>
    </div>
  );
}
