/**
 * Distribution fields of a customer, for the shared customer form and
 * profile: shop (business) name, STRN, drug/trade licence and its expiry,
 * credit days, price list, route and visit order, and the shop's GPS point
 * ("use my location" fills it from the phone or laptop). Shown only while
 * distribution is on; with it off the form sends none of these fields.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Crosshair, ExternalLink, MapPin, Route as RouteIcon, Tag, Truck } from 'lucide-react';
import { Button, Card, Input, Select } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { distSetupApi, distributionApi, type CustomerDistFields } from '../api/distribution.api';
import { PRICE_LISTS_KEY, ROUTES_KEY } from '../setup/shared';

export interface DistForm {
  businessName: string; strn: string; licenseNo: string; licenseExpiry: string; creditDays: string;
  priceListId: string; routeId: string; routeSeq: string; latitude: string; longitude: string;
}

export const EMPTY_DIST: DistForm = {
  businessName: '', strn: '', licenseNo: '', licenseExpiry: '', creditDays: '', priceListId: '', routeId: '', routeSeq: '', latitude: '', longitude: '',
};

type WithDist = Partial<Record<keyof CustomerDistFields, unknown>>;

/** Customer record → form strings. */
export function distFormFrom(c: WithDist | null | undefined): DistForm {
  const s = (v: unknown) => (v == null ? '' : String(v));
  return {
    businessName: s(c?.businessName), strn: s(c?.strn), licenseNo: s(c?.licenseNo), licenseExpiry: s(c?.licenseExpiry).slice(0, 10),
    creditDays: s(c?.creditDays), priceListId: s(c?.priceListId), routeId: s(c?.routeId), routeSeq: s(c?.routeSeq),
    latitude: s(c?.latitude), longitude: s(c?.longitude),
  };
}

const n = (v: string) => (v.trim() === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/** Form → API fields. On edit an empty box clears the field; on create it is left out. */
export function distPayload(f: DistForm, editing: boolean): CustomerDistFields {
  const text = (v: string) => (v.trim() ? v.trim() : editing ? '' : undefined);
  const id = (v: string) => (v ? v : editing ? null : undefined);
  const num = (v: string) => (n(v) ?? (editing ? null : undefined));
  const out: CustomerDistFields = {
    businessName: text(f.businessName), strn: text(f.strn), licenseNo: text(f.licenseNo),
    licenseExpiry: f.licenseExpiry || (editing ? null : undefined),
    creditDays: num(f.creditDays), priceListId: id(f.priceListId), routeId: id(f.routeId),
    routeSeq: f.routeId ? num(f.routeSeq) : (editing ? null : undefined),
    latitude: num(f.latitude), longitude: num(f.longitude),
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined)) as CustomerDistFields;
}

/** First problem with the distribution fields, or null. */
export function distProblem(f: DistForm): string | null {
  const days = n(f.creditDays);
  if (f.creditDays.trim() && (days == null || days < 0 || days > 365)) return 'Udhaar ke din 0 se 365';
  const lat = n(f.latitude), lng = n(f.longitude);
  if ((f.latitude.trim() || f.longitude.trim()) && (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180)) return 'GPS location theek nahi';
  return null;
}

function useLists() {
  const lists = useQuery({ queryKey: PRICE_LISTS_KEY, queryFn: distSetupApi.priceLists, staleTime: 60_000 });
  const routes = useQuery({ queryKey: ROUTES_KEY, queryFn: () => distributionApi.routes(), staleTime: 60_000 });
  return { lists: lists.data ?? [], routes: routes.data ?? [] };
}

export function CustomerDistributionCard({ value, onChange, title }: { value: DistForm; onChange: (patch: Partial<DistForm>) => void; title: React.ReactNode }) {
  const { lists, routes } = useLists();
  const [locating, setLocating] = useState(false);
  const route = routes.find((r) => r.id === value.routeId);

  const locate = () => {
    if (!navigator.geolocation) { toast.error('Is device par location nahi milti'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        onChange({ latitude: p.coords.latitude.toFixed(6), longitude: p.coords.longitude.toFixed(6) });
        toast.success(`Location mil gayi (±${Math.round(p.coords.accuracy)} m)`);
      },
      (e) => { setLocating(false); toast.error(e.code === 1 ? 'Location ki ijazat nahi di — browser me allow karein' : 'Location nahi mili, dobara koshish karein'); },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  };
  const mapUrl = n(value.latitude) != null && n(value.longitude) != null ? `https://www.google.com/maps?q=${value.latitude},${value.longitude}` : null;

  return (
    <Card className="rounded-2xl" title={title} description="Wholesale customer ki dukaan — booker app aur Invoice par aata hai">
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Dukaan / business ka naam" value={value.businessName} onChange={(e) => onChange({ businessName: e.target.value })} maxLength={120}
            placeholder="Noor Traders" leftIcon={<Building2 className="h-4 w-4" />} hint="Invoice aur booker app me pehle yahi naam" />
          <Input label="Udhaar ke din" inputMode="numeric" value={value.creditDays} onChange={(e) => onChange({ creditDays: e.target.value.replace(/\D/g, '').slice(0, 3) })}
            placeholder="15" hint="Itne din se purana udhaar 'overdue' ginta hai" />
          <Select label="Price list" value={value.priceListId} onChange={(e) => onChange({ priceListId: e.target.value })}
            options={[{ value: '', label: '— Default list —' }, ...lists.filter((l) => l.isActive || l.id === value.priceListId).map((l) => ({ value: l.id, label: l.name }))]}
            hint="POS aur booker app par isi list ka rate" />
          <Input label="STRN" value={value.strn} onChange={(e) => onChange({ strn: e.target.value })} maxLength={30} className="font-mono" hint="Sales tax number — tax Invoice par" />
          <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2 sm:col-span-2">
            <Select label="Route" value={value.routeId} onChange={(e) => onChange({ routeId: e.target.value })}
              options={[{ value: '', label: '— Koi route nahi —' }, ...routes.filter((r) => r.isActive || r.id === value.routeId).map((r) => ({ value: r.id, label: r.name }))]}
              hint={route?.bookerName ? `Booker: ${route.bookerName}` : 'Kis route par visit hoti hai'} />
            <Input label="Visit number" inputMode="numeric" value={value.routeSeq} disabled={!value.routeId} onChange={(e) => onChange({ routeSeq: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              placeholder="Aakhir" />
          </div>
          <Input label="Licence #" value={value.licenseNo} onChange={(e) => onChange({ licenseNo: e.target.value })} maxLength={40} className="font-mono" hint="Drug / trade licence" />
          <Input label="Licence expiry" type="date" value={value.licenseExpiry} onChange={(e) => onChange({ licenseExpiry: e.target.value })} />
        </div>

        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-end gap-2">
            <Input size="sm" label="Latitude" inputMode="decimal" value={value.latitude} onChange={(e) => onChange({ latitude: e.target.value.replace(/[^\d.-]/g, '') })} placeholder="31.5204" wrapperClassName="w-32" className="font-mono" />
            <Input size="sm" label="Longitude" inputMode="decimal" value={value.longitude} onChange={(e) => onChange({ longitude: e.target.value.replace(/[^\d.-]/g, '') })} placeholder="74.3587" wrapperClassName="w-32" className="font-mono" />
            <Button size="sm" variant="secondary" loading={locating} onClick={locate} leftIcon={<Crosshair className="h-4 w-4" />}>Meri location</Button>
            {mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1 px-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline"><MapPin className="h-4 w-4" />Map</a>}
          </div>
          <p className="mt-1.5 text-[0.6875rem] text-slate-500">Dukaan par khare ho kar "Meri location" dabayein — booker ki visit isi jagah se check hoti hai.</p>
        </div>
      </div>
    </Card>
  );
}

/** Read-only panel on the customer profile. */
export function CustomerDistributionPanel({ customer, canEdit }: { customer: WithDist & { id: string }; canEdit: boolean }) {
  const { lists, routes } = useLists();
  const f = distFormFrom(customer);
  const list = lists.find((l) => l.id === f.priceListId);
  const route = routes.find((r) => r.id === f.routeId);
  const expired = f.licenseExpiry && f.licenseExpiry < new Date().toISOString().slice(0, 10);
  const mapUrl = f.latitude && f.longitude ? `https://www.google.com/maps?q=${f.latitude},${f.longitude}` : null;
  const rows: Array<[React.ReactNode, React.ReactNode]> = [
    [<><Building2 className="h-3.5 w-3.5" />Dukaan</>, f.businessName || '—'],
    [<><Tag className="h-3.5 w-3.5" />Price list</>, list?.name ?? (f.priceListId ? '…' : 'Default list')],
    [<><RouteIcon className="h-3.5 w-3.5" />Route</>, route ? `${route.name}${f.routeSeq ? ` · #${f.routeSeq}` : ''}` : 'Koi route nahi'],
    [<><Truck className="h-3.5 w-3.5" />Booker</>, route?.bookerName ?? '—'],
    ['Udhaar ke din', f.creditDays ? `${f.creditDays} din` : '—'],
    ['STRN', f.strn || '—'],
    ['Licence', f.licenseNo ? <span className={cn(expired && 'text-rose-700')}>{f.licenseNo}{f.licenseExpiry ? ` · ${f.licenseExpiry}${expired ? ' (khatam)' : ''}` : ''}</span> : '—'],
    ['GPS', mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">{Number(f.latitude).toFixed(4)}, {Number(f.longitude).toFixed(4)}<ExternalLink className="h-3 w-3" /></a> : <span className="text-amber-700">Nahi lagi</span>],
  ];
  return (
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-teal-700" />Distribution</span>}
      actions={canEdit ? <Link to={`/customers/${customer.id}/edit`} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Badlein</Link> : undefined}>
      <dl className="grid gap-x-8 sm:grid-cols-2">
        {rows.map(([k, v], i) => (
          <div key={i} className="flex justify-between gap-3 border-b border-slate-100 py-2 text-[0.8125rem]">
            <dt className="inline-flex items-center gap-1.5 text-slate-500">{k}</dt><dd className="text-right font-medium text-slate-800">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

