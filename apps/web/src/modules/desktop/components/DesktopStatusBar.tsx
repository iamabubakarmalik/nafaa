import { useDesktop } from '@core/lib/desktop/useDesktop';
import { useOfflineStatus } from '@core/hooks/useOfflineStatus';
import { Wifi, WifiOff, RefreshCw, Zap, HardDrive } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Bottom status bar — shows only in Electron desktop app.
 * Displays: online/offline, version, pending sync, storage.
 */
export function DesktopStatusBar() {
  const { isDesktop, version, platform, arch } = useDesktop();
  const status = useOfflineStatus();

  if (!isDesktop) return null;

  const platformLabel = platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : 'Linux';

  return (
    <div className="h-7 flex items-center px-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-[11px] font-semibold text-slate-600 dark:text-slate-400 print:hidden select-none">
      {/* Left — connection */}
      <div className="flex items-center gap-1.5">
        {status.isOnline ? (
          <>
            <Wifi className="h-3 w-3 text-emerald-600" />
            <span className="text-emerald-700 dark:text-emerald-400">Online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 text-amber-600" />
            <span className="text-amber-700 dark:text-amber-400">Offline</span>
          </>
        )}
      </div>

      <span className="mx-2 opacity-30">|</span>

      {/* Sync status */}
      {status.isSyncing ? (
        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Syncing…</span>
          {status.progress && status.progress.total > 0 && (
            <span className="text-slate-500">
              {status.progress.done}/{status.progress.total}
            </span>
          )}
        </div>
      ) : status.pendingSales + status.pendingQueue > 0 ? (
        <Link
          to="/sync"
          className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 hover:underline"
        >
          <Zap className="h-3 w-3" />
          <span>{status.pendingSales + status.pendingQueue} pending</span>
        </Link>
      ) : (
        <Link
          to="/sync"
          className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 hover:underline"
        >
          <HardDrive className="h-3 w-3" />
          <span>All synced</span>
        </Link>
      )}

      {/* Right — version */}
      <div className="ml-auto flex items-center gap-2">
        <span className="opacity-70">{platformLabel} ({arch})</span>
        <span className="opacity-30">|</span>
        <span className="font-mono">v{version || '…'}</span>
      </div>
    </div>
  );
}
