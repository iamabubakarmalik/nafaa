import { useEffect, useState } from 'react';
import { getElectron, isElectron } from './electron';

interface PrintQueueStatus {
  total: number;
  pending: number;
  printing: number;
  failed: number;
}

/**
 * Print queue status — shows in Topbar/StatusBar when receipts are queued.
 */
export function usePrintQueue() {
  const [status, setStatus] = useState<PrintQueueStatus>({
    total: 0,
    pending: 0,
    printing: 0,
    failed: 0,
  });

  useEffect(() => {
    if (!isElectron()) return;
    const electron = getElectron() as any;
    if (!electron?.onPrintQueueUpdated) return;

    return electron.onPrintQueueUpdated((data: PrintQueueStatus) => {
      setStatus(data);
    });
  }, []);

  const retry = async (id: string) => {
    const electron = getElectron() as any;
    return electron?.printQueueRetry?.(id);
  };

  const clear = async () => {
    const electron = getElectron() as any;
    return electron?.printQueueClear?.();
  };

  return { status, retry, clear, hasActivity: status.total > 0 };
}
