import { MapPin, ChevronDown, Navigation } from 'lucide-react';
import { useLocationStore } from '@/stores/location.store';
import { toast } from 'sonner';

export function LocationBar() {
  const { address, city, setLocation, requestGeolocation } = useLocationStore();

  const detectLocation = async () => {
    toast.loading('Location detect ho rahi hai...', { id: 'loc' });
    const ok = await requestGeolocation();
    if (ok) {
      toast.success('Location mil gayi! 📍', { id: 'loc' });
    } else {
      toast.error('Location access denied — manually select karein', { id: 'loc' });
    }
  };

  return (
    <div className="bg-gradient-to-r from-brand-50 via-emerald-50 to-brand-50 dark:from-brand-950/30 dark:via-emerald-950/20 dark:to-brand-950/30 border-b border-brand-100 dark:border-brand-900/40">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-2">
        <div className="h-6 w-6 rounded-lg bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center shrink-0">
          <MapPin className="h-3 w-3 text-brand-700 dark:text-brand-400" />
        </div>
        <div className="flex-1 min-w-0 text-xs">
          <div className="text-[10px] text-brand-700 dark:text-brand-400 font-extrabold uppercase tracking-wider">
            Deliver to
          </div>
          <div className="flex items-center gap-1 text-slate-900 dark:text-white font-bold truncate">
            {address ?? city ?? 'Location select karein'}
            <ChevronDown className="h-3 w-3" />
          </div>
        </div>
        <button
          onClick={detectLocation}
          className="h-8 px-3 rounded-lg bg-white dark:bg-neutral-800 border border-brand-200 dark:border-brand-800 hover:bg-brand-50 dark:hover:bg-brand-900/30 text-brand-700 dark:text-brand-400 text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition shrink-0"
        >
          <Navigation className="h-3 w-3" />
          <span className="hidden sm:inline">Detect</span>
        </button>
      </div>
    </div>
  );
}
