import { useState, useEffect } from 'react';
import { X, MapPin, Search, Navigation, Home, Briefcase, Loader2 } from 'lucide-react';
import { useLocationStore } from '@/stores/location.store';
import { Button, Card, Input } from '@/ui';
import { toast } from 'sonner';
import { useDebouncedCallback } from '@/hooks/useDebounce';

const PAKISTAN_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan',
  'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala', 'Hyderabad', 'Bahawalpur',
  'Sargodha', 'Sukkur', 'Larkana', 'Sheikhupura', 'Mardan', 'Gujrat',
  'Mingora', 'Kasur', 'Sahiwal', 'Okara', 'Wah Cantonment', 'Dera Ghazi Khan',
];

interface Props {
  onClose: () => void;
}

export function LocationPickerModal({ onClose }: Props) {
  const { setLocation, requestGeolocation, isDetecting } = useLocationStore();
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const debouncedSearch = useDebouncedCallback(async (q: string) => {
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoadingSearch(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ', Pakistan')}&limit=6&addressdetails=1`,
      );
      const data = await res.json();
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSearch(false);
    }
  }, 500);

  useEffect(() => {
    debouncedSearch(search);
  }, [search]);

  const detectMyLocation = async () => {
    toast.loading('Detecting your location...', { id: 'loc' });
    const ok = await requestGeolocation();
    if (ok) {
      toast.success('Location detected!', { id: 'loc' });
      onClose();
    } else {
      toast.error('Location access denied', { id: 'loc' });
    }
  };

  const selectCity = (city: string) => {
    setLocation({ city, area: null, address: null, lat: null, lng: null });
    toast.success(`Delivering to ${city}`);
    onClose();
  };

  const selectSuggestion = (s: any) => {
    setLocation({
      lat: parseFloat(s.lat),
      lng: parseFloat(s.lon),
      city: s.address?.city || s.address?.town || s.address?.village || null,
      area: s.address?.suburb || s.address?.neighbourhood || null,
      address: s.display_name,
    });
    toast.success('Location set!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <Card
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-surface p-4 border-b border-border flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-brand-600" />
            <h3 className="font-black text-lg">Select delivery location</h3>
          </div>
          <button onClick={onClose} className="text-content-subtle hover:text-content">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Detect location button */}
          <Button
            variant="gradient"
            size="lg"
            fullWidth
            loading={isDetecting}
            onClick={detectMyLocation}
            leftIcon={<Navigation className="h-4 w-4" />}
          >
            Use my current location
          </Button>

          {/* Search input */}
          <Input
            leftIcon={<Search className="h-4 w-4" />}
            placeholder="Search area, street, landmark..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            inputSize="lg"
            rightIcon={loadingSearch ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
          />

          {/* Search results */}
          {suggestions.length > 0 && (
            <div className="space-y-1">
              <div className="text-2xs font-black text-content-muted uppercase tracking-wider px-1">
                Search results
              </div>
              {suggestions.map((s: any, i: number) => (
                <button
                  key={i}
                  onClick={() => selectSuggestion(s)}
                  className="w-full text-left p-3 rounded-xl hover:bg-surface-muted transition flex items-start gap-3"
                >
                  <MapPin className="h-4 w-4 text-content-subtle shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-content line-clamp-1">
                      {s.address?.suburb || s.address?.neighbourhood || s.address?.city || s.name}
                    </div>
                    <div className="text-2xs text-content-muted line-clamp-1">
                      {s.display_name}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Popular cities */}
          {!search && (
            <div>
              <div className="text-2xs font-black text-content-muted uppercase tracking-wider mb-2 px-1">
                Popular cities in Pakistan
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {PAKISTAN_CITIES.map((city) => (
                  <button
                    key={city}
                    onClick={() => selectCity(city)}
                    className="p-3 rounded-xl border border-border hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition text-sm font-bold text-left"
                  >
                    📍 {city}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
