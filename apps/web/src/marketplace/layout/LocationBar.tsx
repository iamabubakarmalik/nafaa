import { MapPin, ChevronDown } from 'lucide-react';
import { useLocationStore } from '../_shared/stores/location.store';

export function LocationBar() {
  const { address, city } = useLocationStore();
  return (
    <div className="bg-emerald-50 border-b border-emerald-100">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-2 text-xs">
        <MapPin className="h-3.5 w-3.5 text-emerald-700" />
        <span className="text-slate-700">
          Deliver to: <span className="font-bold text-slate-900">{address ?? city ?? 'Set your location'}</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
      </div>
    </div>
  );
}
