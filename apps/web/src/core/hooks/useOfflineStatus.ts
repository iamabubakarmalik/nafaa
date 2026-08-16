import { useEffect, useState } from 'react';
import { subscribeSyncStatus, type SyncStatus } from '@core/lib/offline/syncEngine';

export interface OfflineStatus extends SyncStatus {
  isOnline: boolean;
  hasPending: boolean;
}

export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [sync, setSync] = useState<SyncStatus>({
    isSyncing: false,
    lastSync: null,
    pendingSales: 0,
    pendingQueue: 0,
    failedTotal: 0,
    lastError: null,
    progress: null,
  });

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const unsub = subscribeSyncStatus((s) => setSync(s));
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      unsub();
    };
  }, []);

  return {
    ...sync,
    isOnline,
    hasPending: sync.pendingSales + sync.pendingQueue > 0,
  };
}
