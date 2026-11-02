import { useEffect } from 'react';
import { toast } from 'sonner';
import { getElectron, isElectron } from './electron';
import { t } from '@core/i18n';

/**
 * Listen for memory-critical events from main process.
 * Suggests app restart when memory usage is too high.
 */
export function useDesktopMemory() {
  useEffect(() => {
    if (!isElectron()) return;
    const electron = getElectron() as any;
    if (!electron?.onMemoryCritical) return;

    return electron.onMemoryCritical((data: { rss: number; heap: number }) => {
      toast.warning(t('⚠️ App memory usage zyada hai'), {
        description: t('{{rss}} MB — bahetar performance ke liye restart karein', { rss: data.rss }),
        duration: 12000,
        action: {
          label: t('Restart'),
          onClick: () => electron.relaunch?.(),
        },
      });
    });
  }, []);
}

/**
 * React to power events (battery vs AC).
 * Can be used to adjust sync frequency.
 */
export function useDesktopPower() {
  useEffect(() => {
    if (!isElectron()) return;
    const electron = getElectron() as any;

    const cleanups: Array<() => void> = [];

    if (electron?.onPowerChanged) {
      cleanups.push(electron.onPowerChanged((data: { source: 'ac' | 'battery' }) => {
        if (data.source === 'battery') {
          console.log('[power] On battery — reducing sync frequency');
        } else {
          console.log('[power] On AC — full performance');
        }
      }));
    }

    if (electron?.onPowerResume) {
      cleanups.push(electron.onPowerResume(() => {
        toast.info(t('💤 System wake-up — sync trigger karte hain'));
        // Trigger sync
        import('@core/lib/offline/syncEngine').then(({ fullSync }) => {
          fullSync(true, true).catch(() => {});
        });
      }));
    }

    return () => cleanups.forEach((c) => c());
  }, []);
}
