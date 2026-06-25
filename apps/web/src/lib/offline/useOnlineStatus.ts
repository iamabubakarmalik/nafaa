import { useEffect, useState } from 'react';

/**
 * Tracks browser online/offline status.
 * Returns true when connected to internet.
 *
 * Note: navigator.onLine can be unreliable (sometimes false positives).
 * For critical operations, do an actual ping to your API.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * More accurate connectivity check — pings actual API.
 * Use sparingly (every 30s max).
 */
export async function pingAPI(): Promise<boolean> {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
    const res = await fetch(`${apiUrl.replace(/\/api$/, '')}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}
