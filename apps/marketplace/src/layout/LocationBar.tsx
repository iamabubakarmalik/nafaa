import { MapPin, ChevronDown, Navigation, Loader2 } from 'lucide-react';
import { useLocationStore } from '@/stores/location.store';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function LocationBar() {
  const { t } = useTranslation();
  const { address, city, area, isDetecting, requestGeolocation } = useLocationStore();

  const detectLocation = async () => {
    toast.loading('Finding your location...', { id: 'loc' });
    const ok = await requestGeolocation();
    if (ok) toast.success('Location detected! 📍', { id: 'loc' });
    else toast.error('Location access denied', { id: 'loc' });
  };

  const displayText = area && city ? `${area}, ${city}` : city ?? address ?? 'Select location';

  return (
    <div className="bg-gradient-to-r from-brand-50 via-emerald-50 to-brand-50 dark:from-brand-950/30 dark:via-emerald-950/20 dark:to-brand-950/30 border-b border-brand-100 dark:border-brand-900/40">
      <div className="container mx-auto py-2.5 flex items-center gap-2">
        <div className="h-6 w-6 rounded-lg bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center shrink-0">
          <MapPin className="h-3 w-3 text-brand-700 dark:text-brand-400" />
        </div>
        <div className="flex-1 min-w-0 text-xs">
          <div className="text-2xs text-brand-700 dark:text-brand-400 font-black uppercase tracking-wider">
            {t('home.deliverTo')}
          </div>
          <button className="flex items-center gap-1 text-content font-bold truncate">
            {displayText}
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
        <button
          onClick={detectLocation}
          disabled={isDetecting}
          className="h-8 px-3 rounded-lg bg-surface border border-brand-200 dark:border-brand-800 hover:bg-brand-50 dark:hover:bg-brand-900/30 text-brand-700 dark:text-brand-400 text-xs font-black flex items-center gap-1.5 shadow-sm transition shrink-0 disabled:opacity-50"
        >
          {isDetecting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Navigation className="h-3 w-3" />
          )}
          <span className="hidden sm:inline">Detect</span>
        </button>
      </div>
    </div>
  );
}
