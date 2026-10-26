/**
 * Desktop app update notice: download progress, "ready to install" with a
 * restart button, or the update error. Renders only inside Electron.
 */

import { useState } from 'react';
import { CheckCircle2, Download, RefreshCw, X } from 'lucide-react';
import { useAutoUpdate, useDesktop } from '@core/lib/desktop/useDesktop';
import { getElectron } from '@core/lib/desktop/electron';
import { cn } from '@core/lib/cn';
import { Button, IconButton } from '@/design-system/components';

const TONES = {
  info: { box: 'bg-blue-50 ring-blue-200', icon: 'bg-blue-100 text-blue-700', title: 'text-blue-900', text: 'text-blue-800' },
  success: { box: 'bg-success-50 ring-success-200', icon: 'bg-success-100 text-success-700', title: 'text-success-900', text: 'text-success-800' },
  danger: { box: 'bg-rose-50 ring-rose-200', icon: 'bg-rose-100 text-rose-700', title: 'text-rose-900', text: 'text-rose-800' },
} as const;

export function DesktopUpdateBanner() {
  const { isDesktop } = useDesktop();
  const update = useAutoUpdate();
  const [dismissed, setDismissed] = useState(false);

  if (!isDesktop || dismissed || update.state === 'idle') return null;

  const handleInstall = () => {
    const electron = getElectron();
    if (electron) electron.relaunch();
  };

  const tone = TONES[update.state === 'ready' ? 'success' : update.state === 'error' ? 'danger' : 'info'];
  const percent = update.percent || 0;

  return (
    <div className="mx-4 my-2">
      <div role="status" className={cn('flex items-start gap-3 rounded-xl p-4 ring-1 ring-inset', tone.box)}>
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tone.icon)}>
          {update.state === 'ready' ? <CheckCircle2 className="h-5 w-5" aria-hidden />
            : update.state === 'downloading' ? <Download className="h-5 w-5 animate-bounce" aria-hidden />
              : <RefreshCw className="h-5 w-5" aria-hidden />}
        </span>

        <div className="min-w-0 flex-1">
          {update.state === 'available' && (
            <>
              <p className={cn('text-sm font-semibold', tone.title)}>Nafaa ka naya version aa gaya</p>
              <p className={cn('mt-0.5 text-xs', tone.text)}>Version {update.version} download ho raha hai…</p>
            </>
          )}
          {update.state === 'downloading' && (
            <>
              <p className={cn('text-sm font-semibold', tone.title)}>Update download ho raha hai…</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${percent}%` }} />
              </div>
              <p className={cn('mt-1 text-xs font-medium tabular-nums', tone.text)}>{percent}% ho gaya</p>
            </>
          )}
          {update.state === 'ready' && (
            <>
              <p className={cn('text-sm font-semibold', tone.title)}>Update install ke liye tayyar</p>
              <p className={cn('mt-0.5 text-xs', tone.text)}>Version {update.version} install karne ke liye app restart karein.</p>
              <Button size="sm" variant="success" className="mt-3" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={handleInstall}>
                Restart & Install
              </Button>
            </>
          )}
          {update.state === 'error' && (
            <>
              <p className={cn('text-sm font-semibold', tone.title)}>Update nahi hua</p>
              <p className={cn('mt-0.5 text-xs', tone.text)}>{update.message}</p>
            </>
          )}
        </div>

        <IconButton label="Band karein" size="sm" variant="ghost" onClick={() => setDismissed(true)}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  );
}
