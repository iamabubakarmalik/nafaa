import { useEffect } from 'react';
import { toast } from 'sonner';
import { getElectron, isElectron } from './electron';

/**
 * Session recovery — saves cart state every 10s, restores on crash.
 * Wire in POS page: pass getCartState function.
 */
export function useSessionAutoSave(getCartState: () => any, enabled = true) {
  useEffect(() => {
    if (!isElectron() || !enabled) return;
    const electron = getElectron() as any;
    if (!electron?.sessionSave) return;

    const interval = setInterval(() => {
      try {
        const state = getCartState();
        // Only save if there's meaningful state (non-empty cart)
        if (state && (state.items?.length > 0 || state.customerId)) {
          electron.sessionSave(state);
        }
      } catch {}
    }, 10_000);

    return () => clearInterval(interval);
  }, [getCartState, enabled]);
}

/**
 * On mount, check if crashed session exists — offer restore.
 */
export function useSessionRestore(onRestore: (state: any) => void) {
  useEffect(() => {
    if (!isElectron()) return;
    const electron = getElectron() as any;
    if (!electron?.sessionLoad) return;

    electron.sessionLoad().then((session: any) => {
      if (!session || !session.data) return;

      const ageMinutes = Math.round((Date.now() - session.savedAt) / 60000);

      toast.info('🔄 Previous session recovered', {
        description: `${ageMinutes} min pehle ki cart mili — restore karein?`,
        duration: 15000,
        action: {
          label: 'Restore',
          onClick: () => {
            onRestore(session.data);
            electron.sessionClear?.();
            toast.success('Cart restore ho gaya');
          },
        },
        cancel: {
          label: 'Ignore',
          onClick: () => electron.sessionClear?.(),
        },
      });
    });
  }, [onRestore]);
}
