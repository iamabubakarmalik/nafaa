import { WifiOff, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useOfflineStatus } from '@core/hooks/useOfflineStatus';
import { t } from '@core/i18n';

export function OfflineBanner() {
  const status = useOfflineStatus();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissal when connection state changes
  useEffect(() => {
    setDismissed(false);
  }, [status.isOnline]);

  if (status.isOnline || dismissed) return null;

  return (
    <div className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <WifiOff className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">
              {t('Aap offline hain — sales queue me save hongi')}
            </p>
            <p className="text-xs text-white/85 leading-tight">
              {t('Jab connection wapis aayega, sab kuch automatically sync ho jayega{{value}}', { value: status.pendingSales > 0 ? t(' • {{pendingSales}} sales pending', { pendingSales: status.pendingSales }) : '' })}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-full hover:bg-white/20 transition"
          aria-label={t('Dismiss')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
