import { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { useOfflineStatus } from '@core/hooks/useOfflineStatus';
import { fullSync } from '@core/lib/offline/syncEngine';
import { PendingSalesDrawer } from './PendingSalesDrawer';

export function SyncStatusBadge() {
  const status = useOfflineStatus();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const totalPending = status.pendingSales + status.pendingQueue;

  let icon = <Cloud className="w-4 h-4" />;
  let color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let label = 'Synced';

  if (!status.isOnline) {
    icon = <CloudOff className="w-4 h-4" />;
    color = 'bg-slate-100 text-slate-700 border-slate-300';
    label = 'Offline';
  } else if (status.isSyncing) {
    icon = <RefreshCw className="w-4 h-4 animate-spin" />;
    color = 'bg-blue-50 text-blue-700 border-blue-200';
    label = 'Syncing…';
  } else if (totalPending > 0) {
    icon = <AlertCircle className="w-4 h-4" />;
    color = 'bg-amber-50 text-amber-700 border-amber-200';
    label = `${totalPending} pending`;
  } else if (status.lastError) {
    icon = <AlertCircle className="w-4 h-4" />;
    color = 'bg-rose-50 text-rose-700 border-rose-200';
    label = 'Sync error';
  } else {
    icon = <Check className="w-4 h-4" />;
  }

  return (
    <>
      <button
        onClick={() => {
          if (totalPending > 0 || status.lastError) setDrawerOpen(true);
          else if (status.isOnline) fullSync(false, true);
        }}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all hover:shadow-sm ${color}`}
        title={
          status.lastSync
            ? `Last sync: ${new Date(status.lastSync).toLocaleTimeString()}`
            : 'Not synced yet'
        }
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
        {totalPending > 0 && (
          <span className="sm:hidden bg-white/60 rounded-full px-1.5 text-[10px] font-bold">
            {totalPending}
          </span>
        )}
      </button>

      <PendingSalesDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
