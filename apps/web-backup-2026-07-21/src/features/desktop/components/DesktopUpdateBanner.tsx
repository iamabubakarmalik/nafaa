import { useState } from 'react';
import { Download, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAutoUpdate, useDesktop } from '@/lib/desktop/useDesktop';
import { getElectron } from '@/lib/desktop/electron';

/**
 * Shows update notification when desktop app has update available.
 * Only renders in Electron — invisible in browser.
 */
export function DesktopUpdateBanner() {
  const { isDesktop } = useDesktop();
  const update = useAutoUpdate();
  const [dismissed, setDismissed] = useState(false);

  if (!isDesktop || dismissed || update.state === 'idle') return null;

  const handleInstall = () => {
    const electron = getElectron();
    if (electron) electron.relaunch();
  };

  return (
    <div className="mx-4 my-2">
      <div
        className="rounded-2xl p-4 border-2"
        style={{
          backgroundColor:
            update.state === 'ready' ? '#dcfce7' :
            update.state === 'error' ? '#fee2e2' :
            '#dbeafe',
          borderColor:
            update.state === 'ready' ? '#86efac' :
            update.state === 'error' ? '#fca5a5' :
            '#93c5fd',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="h-10 w-10 rounded-2xl flex items-center justify-center"
            style={{
              backgroundColor:
                update.state === 'ready' ? '#16a34a' :
                update.state === 'error' ? '#dc2626' :
                '#2563eb',
            }}
          >
            {update.state === 'ready' ? (
              <CheckCircle2 className="h-5 w-5 text-white" />
            ) : update.state === 'downloading' ? (
              <Download className="h-5 w-5 text-white animate-bounce" />
            ) : (
              <RefreshCw className="h-5 w-5 text-white" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {update.state === 'available' && (
              <>
                <div className="font-extrabold text-blue-900">
                  Nafaa Update Available
                </div>
                <div className="text-xs text-blue-800 mt-0.5">
                  Version {update.version} download ho raha hai...
                </div>
              </>
            )}
            {update.state === 'downloading' && (
              <>
                <div className="font-extrabold text-blue-900">
                  Downloading Update...
                </div>
                <div className="mt-2 h-2 bg-white rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${update.percent || 0}%` }}
                  />
                </div>
                <div className="text-xs text-blue-700 mt-1 font-semibold">
                  {update.percent || 0}% complete
                </div>
              </>
            )}
            {update.state === 'ready' && (
              <>
                <div className="font-extrabold text-emerald-900">
                  Update Ready to Install
                </div>
                <div className="text-xs text-emerald-800 mt-0.5">
                  Version {update.version} install karne ke liye restart karein
                </div>
                <button
                  onClick={handleInstall}
                  className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700"
                >
                  Restart & Install
                </button>
              </>
            )}
            {update.state === 'error' && (
              <>
                <div className="font-extrabold text-rose-900">Update Error</div>
                <div className="text-xs text-rose-800 mt-0.5">
                  {update.message}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="h-6 w-6 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
