'use client';
/** Location chip in the header and the picker sheet (city list or GPS). */
import { ChevronDown, LocateFixed, MapPin, Check } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { Button, Sheet, cn } from '@/components/ui';
import { DEFAULT_CITIES } from '@/lib/site';

export function LocationChip({ className }: { className?: string }) {
  const { t, loc, setLoc, cities } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const list = cities.length ? cities : DEFAULT_CITIES;

  const gps = () => {
    setErr(null);
    if (!navigator.geolocation) return setErr(t('location.gpsDenied'));
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setBusy(false);
        setLoc({ city: loc?.city || list[0] || 'Lahore', lat: Math.round(p.coords.latitude * 1e5) / 1e5, lng: Math.round(p.coords.longitude * 1e5) / 1e5 });
        setOpen(false);
      },
      () => {
        setBusy(false);
        setErr(t('location.gpsDenied'));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn('flex min-w-0 items-center gap-1.5 rounded-full px-2 py-1 text-start hover:bg-gray-100', className)}>
        <MapPin className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
        <span className="min-w-0 leading-tight">
          <span className="block text-2xs text-gray-500">{t('location.deliveringTo')}</span>
          <span className="block truncate text-sm font-semibold text-gray-900">
            {loc ? (loc.lat ? `${t('location.nearYou')} · ${loc.city}` : loc.city) : t('location.pick')}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('location.title')} closeLabel={t('common.close')}>
        <Button variant="outline" block onClick={gps} loading={busy} icon={<LocateFixed className="h-4 w-4 text-brand-600" />}>
          {t('location.useGps')}
        </Button>
        {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">{t('location.choose')}</p>
        <ul className="grid grid-cols-2 gap-2">
          {list.map((c) => {
            const on = loc?.city === c && !loc.lat;
            return (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => {
                    setLoc({ city: c });
                    setOpen(false);
                  }}
                  className={cn('flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium ring-1', on ? 'bg-brand-50 text-brand-800 ring-brand-300' : 'bg-white text-gray-800 ring-gray-200 hover:bg-gray-50')}
                >
                  {c}
                  {on && <Check className="h-4 w-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}
