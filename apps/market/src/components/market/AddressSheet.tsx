'use client';
/** New address form with map pin; saves through the bridge and hands back the address. */
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { Button, Input, Sheet, Skeleton, cn } from '@/components/ui';
import { m } from '@/lib/client';
import { normalizePhone } from '@/lib/format';
import { DEFAULT_CITIES } from '@/lib/site';
import type { Address, Customer } from '@/lib/types';

const MapPicker = dynamic(() => import('./MapPicker').then((x) => x.MapPicker), { ssr: false, loading: () => <Skeleton className="h-56 rounded-2xl" /> });

type Kind = 'HOME' | 'OFFICE' | 'OTHER';

export function AddressSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (a: Address) => void }) {
  const app = useApp();
  const { t } = app;
  const cities = app.cities.length ? app.cities : DEFAULT_CITIES;
  const [kind, setKind] = useState<Kind>('HOME');
  const [f, setF] = useState({ fullName: '', phone: '', addressLine1: '', area: '', city: app.loc?.city ?? cities[0] ?? 'Lahore', landmark: '' });
  const [pt, setPt] = useState<{ lat: number; lng: number } | null>(app.loc?.lat && app.loc.lng ? { lat: app.loc.lat, lng: app.loc.lng } : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    m<Customer>('me')
      .then((c) => setF((x) => ({ ...x, fullName: x.fullName || c.fullName || '', phone: x.phone || c.phone || '' })))
      .catch(() => undefined);
  }, [open]);

  const save = async () => {
    const e: Record<string, string> = {};
    if (f.fullName.trim().length < 2) e.fullName = t('checkout.addr.required');
    if (!normalizePhone(f.phone)) e.phone = t('checkout.addr.phoneInvalid');
    if (f.addressLine1.trim().length < 3) e.addressLine1 = t('checkout.addr.required');
    if (!f.area.trim()) e.area = t('checkout.addr.required');
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const label = kind === 'HOME' ? t('checkout.addr.home') : kind === 'OFFICE' ? t('checkout.addr.work') : t('checkout.addr.other');
      const a = await m<Address>('addresses', {
        body: { ...f, phone: normalizePhone(f.phone), label, addressType: kind, lat: pt?.lat, lng: pt?.lng, landmark: f.landmark || undefined },
      });
      onSaved(a);
      onClose();
    } catch (err) {
      app.toast(app.errorText(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <Sheet open={open} onClose={onClose} title={t('checkout.addr.title')} size="lg" closeLabel={t('common.close')} footer={<Button block size="lg" loading={busy} onClick={save}>{t('checkout.addr.save')}</Button>}>
      <div className="space-y-4">
        {open && <MapPicker value={pt} onChange={setPt} gpsLabel={t('checkout.addr.useGps')} hint={t('checkout.addr.pin')} />}
        <div>
          <p className="mb-1.5 text-xs font-semibold text-gray-700">{t('checkout.addr.label')}</p>
          <div className="flex gap-2">
            {(['HOME', 'OFFICE', 'OTHER'] as Kind[]).map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={cn('rounded-full px-4 py-2 text-sm font-semibold ring-1', kind === k ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-gray-700 ring-gray-200')}>
                {k === 'HOME' ? t('checkout.addr.home') : k === 'OFFICE' ? t('checkout.addr.work') : t('checkout.addr.other')}
              </button>
            ))}
          </div>
        </div>
        <Input label={t('checkout.addr.line1')} value={f.addressLine1} onChange={set('addressLine1')} error={errors.addressLine1} autoComplete="address-line1" maxLength={200} />
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('checkout.addr.area')} value={f.area} onChange={set('area')} error={errors.area} maxLength={100} />
          <div>
            <label htmlFor="addr-city" className="mb-1.5 block text-xs font-semibold text-gray-700">{t('checkout.addr.city')}</label>
            <select id="addr-city" value={f.city} onChange={set('city')} className="block h-11 w-full rounded-xl bg-white px-3 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
              {[...new Set([f.city, ...cities])].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <Input label={t('checkout.addr.landmark')} value={f.landmark} onChange={set('landmark')} maxLength={200} />
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('checkout.addr.fullName')} value={f.fullName} onChange={set('fullName')} error={errors.fullName} autoComplete="name" maxLength={100} />
          <Input label={t('checkout.addr.phone')} value={f.phone} onChange={set('phone')} error={errors.phone} inputMode="tel" autoComplete="tel" placeholder="03001234567" maxLength={16} />
        </div>
      </div>
    </Sheet>
  );
}
