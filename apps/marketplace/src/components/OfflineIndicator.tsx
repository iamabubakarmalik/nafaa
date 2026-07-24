import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowBackOnline(true);
        setTimeout(() => setShowBackOnline(false), 3000);
        setWasOffline(false);
      }
    };
    const goOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [wasOffline]);

  if (!isOnline) {
    return (
      <div className="fixed top-16 lg:top-20 inset-x-0 z-50 flex justify-center px-4 animate-slide-down">
        <div className="glass border border-danger/30 bg-danger/10 rounded-full px-4 py-2 shadow-lg flex items-center gap-2 text-sm font-bold">
          <WifiOff className="h-4 w-4 text-danger" />
          <span className="text-content">You're offline. Some features may not work.</span>
        </div>
      </div>
    );
  }

  if (showBackOnline) {
    return (
      <div className="fixed top-16 lg:top-20 inset-x-0 z-50 flex justify-center px-4 animate-slide-down">
        <div className="glass border border-brand-500/30 bg-brand-50 dark:bg-brand-950/40 rounded-full px-4 py-2 shadow-lg flex items-center gap-2 text-sm font-bold">
          <RefreshCw className="h-4 w-4 text-brand-600" />
          <span className="text-brand-700 dark:text-brand-300">Back online ✓</span>
        </div>
      </div>
    );
  }

  return null;
}
