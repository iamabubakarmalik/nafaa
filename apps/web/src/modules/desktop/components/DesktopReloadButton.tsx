import { RefreshCw } from 'lucide-react';
import { useDesktop, useDesktopReload } from '@core/lib/desktop/useDesktop';
import { toast } from 'sonner';

/**
 * Reload button — shows only in Electron.
 * Add to Topbar so users can reload without shortcuts.
 */
export function DesktopReloadButton() {
  const { isDesktop } = useDesktop();
  const { reload, forceReload, clearCacheAndReload } = useDesktopReload();

  if (!isDesktop) return null;

  return (
    <div className="relative group">
      <button
        onClick={reload}
        onContextMenu={(e) => {
          e.preventDefault();
          if (confirm('Force reload + clear cache?')) {
            clearCacheAndReload().then(() => toast.success('Cache cleared'));
          }
        }}
        className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 transition"
        title="Reload (Ctrl+R) — Right-click: force reload"
      >
        <RefreshCw className="h-4 w-4" />
      </button>
    </div>
  );
}
