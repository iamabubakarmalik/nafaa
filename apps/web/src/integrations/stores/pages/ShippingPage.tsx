/**
 * Delivery charges for the website: zones by city or province, each with
 * one or more rates (flat, by weight or by order amount), COD on/off and
 * its fee, and the delivery time text. A zone with no cities and no
 * provinces covers the rest of Pakistan. Free delivery above an amount
 * applies to every zone.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Banknote, GraduationCap, MapPin, Plus, Save, Search, Trash2, Truck, X } from 'lucide-react';
import { Button, Card, Input, PageShell, Select, Skeleton, Switch, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { t } from '@core/i18n';
import { cn } from '@core/lib/cn';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { storesApi, type ShippingRate, type ShippingSettings, type ShippingZone } from '../api/stores.api';
import { StoreGate, WebsiteHero, type StoreCtx } from '../components/StoreGate';
import { SK } from '../lib/hooks';
import { PROVINCES } from '../lib/pk-places';
import { newId } from '../lib/sections';
import { rs } from '../lib/format';

export default function ShippingPage() {
  return (
    <PageShell>
      <StoreGate title={t('Delivery charges')}>{(ctx) => <Shipping ctx={ctx} />}</StoreGate>
    </PageShell>
  );
}

const newRate = (): ShippingRate => ({ id: newId('r'), name: t('Delivery'), type: 'flat', price: 250, min: null, max: null, freeAbove: null, eta: null });

function Shipping({ ctx }: { ctx: StoreCtx }) {
  const id = ctx.store.id;
  const qc = useQueryClient();
  const guide = usePageGuide();
  const q = useQuery({ queryKey: SK.shipping(id), queryFn: () => storesApi.shipping(id) });
  const [d, setD] = useState<ShippingSettings | null>(null);
  useEffect(() => { if (q.data) setD(q.data); }, [q.data]);
  const dirty = !!d && JSON.stringify(d) !== JSON.stringify(q.data);
  const save = useMutation({
    mutationFn: () => storesApi.saveShipping(id, d!),
    onSuccess: (r) => { qc.setQueryData(SK.shipping(id), r); setD(r); toast.success(t('Save ho gaya')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const setZone = (zid: string, patch: Partial<ShippingZone>) => setD((x) => (x ? { ...x, zones: x.zones.map((z) => (z.id === zid ? { ...z, ...patch } : z)) } : x));
  const removeZone = (zid: string) => {
    const before = d;
    setD((x) => (x ? { ...x, zones: x.zones.filter((z) => z.id !== zid) } : x));
    toast(t('Zone hata diya (Save dabane tak pakka nahi)'), { action: { label: t('Wapas'), onClick: () => setD(before) } });
  };
  const addZone = () => setD((x) => (x ? { ...x, zones: [{ id: newId('z'), name: t('Naya zone'), provinces: [], cities: [], codEnabled: true, codFee: null, eta: null, rates: [newRate()] }, ...x.zones] } : x));
  const prices = (d?.zones ?? []).flatMap((z) => z.rates.map((r) => r.price));

  return (
    <>
      <WebsiteHero ctx={ctx} title={t('Delivery charges')} loading={q.isLoading}
        meta={t('Shehar ya suba ke hisaab se delivery charge. Checkout par customer ko yahi dikhta hai.')}
        actions={<>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Button disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Save className="h-4 w-4" />}>{t('Save')}</Button>
        </>}
        stats={[
          { label: t('Zones'), value: String(d?.zones.length ?? 0) },
          { label: t('Sab se kam charge'), value: prices.length ? rs(Math.min(...prices)) : '—' },
          { label: t('Free delivery'), value: d?.freeShippingThreshold ? t('{{a}} se upar', { a: rs(d.freeShippingThreshold) }) : t('Nahi') },
          { label: t('COD fee'), value: d?.codFee ? rs(d.codFee) : t('Koi nahi') },
        ]} />

      {!d ? <Skeleton className="h-96 rounded-2xl" /> : (
        <>
          <Card title={t('Sab zones ke liye')}>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Switch label={t('Itne ke order par free delivery')} checked={d.freeShippingThreshold != null}
                  onChange={(e) => setD({ ...d, freeShippingThreshold: e.target.checked ? 3000 : null })} />
                {d.freeShippingThreshold != null && <Input className="mt-2" type="number" min={0} value={d.freeShippingThreshold} leftIcon={<span className="text-[0.75rem] text-slate-400">Rs</span>}
                  onChange={(e) => setD({ ...d, freeShippingThreshold: Number(e.target.value) || 0 })} />}
              </div>
              <Input type="number" label={t('COD fee (Rs)')} hint={t('COD par extra charge. 0 = koi nahi')} min={0} value={d.codFee} onChange={(e) => setD({ ...d, codFee: Number(e.target.value) || 0 })} />
              <Input label={t('Delivery kab tak (aam)')} value={d.defaultEta ?? ''} placeholder={t('3-5 din')} onChange={(e) => setD({ ...d, defaultEta: e.target.value || null })} />
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-[0.8125rem] text-slate-500">{t('Pehle shehar wala zone milta hai, phir suba wala, phir "Baqi Pakistan".')}</p>
            <Button size="sm" variant="secondary" onClick={addZone} leftIcon={<Plus className="h-4 w-4" />}>{t('Zone add karein')}</Button>
          </div>

          <div className="grid gap-4 2xl:grid-cols-2">
            {d.zones.map((z) => <ZoneCard key={z.id} zone={z} defaultCodFee={d.codFee} onChange={(p) => setZone(z.id, p)} onRemove={d.zones.length > 1 ? () => removeZone(z.id) : undefined} />)}
          </div>
        </>
      )}

      {guide.isOpen && (
        <PageGuide title={t('Delivery charges — aasaan tareeqa')} onClose={guide.close}
          flow={[
            { label: t('Zone'), hint: t('Shehar ya suba'), icon: MapPin, color: '#2563eb' },
            { label: t('Rate'), hint: t('Ek ya zyada'), icon: Truck, color: '#ea580c' },
            { label: t('COD'), hint: t('Chalu / band, fee'), icon: Banknote, color: '#16a34a' },
          ]}
          steps={[
            { icon: MapPin, color: '#2563eb', title: t('Apna shehar sasta'), text: t('Ek zone banayein, apna shehar chunein aur kam rate lagayein. "Baqi Pakistan" wala zone sab ke liye.') },
            { icon: Truck, color: '#ea580c', title: t('Wazan ya bill par'), text: t('Rate ki qisam "Wazan" ho to kg ki had likhein; "Bill" ho to Rs ki had. Customer ko sahi rate khud milta hai.') },
          ]} />
      )}
    </>
  );
}

function ZoneCard({ zone, defaultCodFee, onChange, onRemove }: { zone: ShippingZone; defaultCodFee: number; onChange: (p: Partial<ShippingZone>) => void; onRemove?: () => void }) {
  const [city, setCity] = useState('');
  const rest = !zone.cities.length && !zone.provinces.length;
  const cityOptions = PROVINCES.flatMap((p) => p.cities).filter((c) => !zone.cities.includes(c) && c.toLowerCase().includes(city.toLowerCase())).slice(0, 8);
  const setRate = (rid: string, patch: Partial<ShippingRate>) => onChange({ rates: zone.rates.map((r) => (r.id === rid ? { ...r, ...patch } : r)) });
  return (
    <Card>
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 shrink-0 text-brand-600" />
        <input value={zone.name} onChange={(e) => onChange({ name: e.target.value })} aria-label={t('Zone ka naam')}
          className="min-w-0 flex-1 rounded-lg border-0 bg-transparent px-1 py-0.5 text-[1rem] font-semibold text-slate-900 hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-brand-300" />
        {rest && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-slate-600">{t('Baqi Pakistan')}</span>}
        {onRemove && <button type="button" onClick={onRemove} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={t('Hatayein')}><Trash2 className="h-4 w-4" /></button>}
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wider text-slate-500">{t('Suba')}</p>
        <div className="flex flex-wrap gap-1.5">
          {PROVINCES.map((p) => {
            const on = zone.provinces.includes(p.code);
            return (
              <button key={p.code} type="button" onClick={() => onChange({ provinces: on ? zone.provinces.filter((x) => x !== p.code) : [...zone.provinces, p.code] })}
                className={cn('rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ring-1', on ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
                {p.name}
              </button>
            );
          })}
        </div>
        <p className="mb-1.5 mt-3 text-[0.75rem] font-semibold uppercase tracking-wider text-slate-500">{t('Shehar')}</p>
        <div className="flex flex-wrap gap-1.5">
          {zone.cities.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pe-1 ps-2.5 text-[0.75rem] font-semibold text-slate-700">
              {c}<button type="button" onClick={() => onChange({ cities: zone.cities.filter((x) => x !== c) })} aria-label={t('Hatayein')} className="rounded-full p-0.5 hover:bg-slate-200"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
        <div className="relative mt-1.5">
          <Input size="sm" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t('Shehar add karein')} leftIcon={<Search className="h-3.5 w-3.5" />}
            onKeyDown={(e) => { if (e.key === 'Enter' && city.trim()) { e.preventDefault(); onChange({ cities: [...zone.cities, cityOptions[0] ?? city.trim()] }); setCity(''); } }} />
          {city.trim() && (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200">
              {(cityOptions.length ? cityOptions : [city.trim()]).map((c) => (
                <li key={c}><button type="button" onClick={() => { onChange({ cities: [...zone.cities, c] }); setCity(''); }} className="w-full px-3 py-1.5 text-start text-[0.8125rem] hover:bg-slate-50">{c}</button></li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-[0.75rem] font-semibold uppercase tracking-wider text-slate-500">{t('Rates')}</p>
        {zone.rates.map((r) => (
          <div key={r.id} className="grid gap-1.5 rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200/70 sm:grid-cols-[minmax(0,1fr)_7rem_6rem_auto]">
            <Input size="sm" value={r.name} onChange={(e) => setRate(r.id, { name: e.target.value })} aria-label={t('Rate ka naam')} />
            <Select size="sm" value={r.type} onChange={(e) => setRate(r.id, { type: e.target.value as ShippingRate['type'] })} aria-label={t('Qisam')}
              options={[{ value: 'flat', label: t('Ek rate') }, { value: 'weight', label: t('Wazan (kg)') }, { value: 'price', label: t('Bill (Rs)') }]} />
            <Input size="sm" type="number" min={0} value={r.price} onChange={(e) => setRate(r.id, { price: Number(e.target.value) || 0 })} aria-label={t('Charge')} leftIcon={<span className="text-[0.6875rem] text-slate-400">Rs</span>} />
            <button type="button" disabled={zone.rates.length < 2} onClick={() => onChange({ rates: zone.rates.filter((x) => x.id !== r.id) })} className="justify-self-end rounded p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30" aria-label={t('Hatayein')}><X className="h-4 w-4" /></button>
            {r.type !== 'flat' && (
              <div className="grid grid-cols-2 gap-1.5 sm:col-span-4">
                <Input size="sm" type="number" min={0} value={r.min ?? ''} placeholder={t('Se')} onChange={(e) => setRate(r.id, { min: e.target.value === '' ? null : Number(e.target.value) })} aria-label={t('Se')} />
                <Input size="sm" type="number" min={0} value={r.max ?? ''} placeholder={t('Tak')} onChange={(e) => setRate(r.id, { max: e.target.value === '' ? null : Number(e.target.value) })} aria-label={t('Tak')} />
              </div>
            )}
          </div>
        ))}
        <Button size="xs" variant="ghost" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => onChange({ rates: [...zone.rates, newRate()] })}>{t('Rate add karein')}</Button>
      </div>

      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
        <Switch label={t('Is zone me COD')} checked={zone.codEnabled} onChange={(e) => onChange({ codEnabled: e.target.checked })} />
        <Input size="sm" type="number" min={0} label={t('COD fee (khali = {{f}})', { f: rs(defaultCodFee) })} value={zone.codFee ?? ''} disabled={!zone.codEnabled}
          onChange={(e) => onChange({ codFee: e.target.value === '' ? null : Number(e.target.value) })} />
        <Input size="sm" label={t('Delivery kab tak')} value={zone.eta ?? ''} placeholder={t('1-2 din')} onChange={(e) => onChange({ eta: e.target.value || null })} wrapperClassName="sm:col-span-2" />
      </div>
    </Card>
  );
}
