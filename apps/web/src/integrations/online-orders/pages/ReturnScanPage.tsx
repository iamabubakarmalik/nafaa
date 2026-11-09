/**
 * RTO returns desk. Scan a returned parcel's CN or order number; the order
 * is marked returned through the normal RTO path (its bill is voided, which
 * puts every item back in the order's branch). Items that came back broken
 * are marked damaged and written off as a stock loss instead. The parcel's
 * courier and return charges are kept on the order.
 *
 * Below the scanner: parcels the courier is bringing back (or has marked
 * returned) that are not scanned in yet, and parcels received today.
 */

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertOctagon, BarChart3, CheckCircle2, GraduationCap, Minus, Package, PackageCheck, PackageX, Plus, RotateCcw, ScanLine, Truck, Warehouse } from 'lucide-react';
import { Button, Card, EmptyState, PageHero, PageShell, Skeleton, heroButton, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { apiErrorMessage } from '../api/online-orders.api';
import { scanApi, type DeskParcel, type ScanOrder } from '../api/order-money.api';
import { ParcelList, type ParcelRow } from '../components/dispatch/ParcelList';
import { beep } from '../lib/pack';
import { courierBrand, rs } from '../lib/labels';
import { t as tr } from '@core/i18n';

const DESK_KEY = ['online-orders', 'rto-desk'] as const;

const parcelRow = (p: DeskParcel, received: boolean): ParcelRow => ({
  id: p.id, number: p.number, customerName: p.customerName, city: p.city, total: p.total,
  courierCode: p.courierCode, courierLabel: p.courierName, trackingNumber: p.trackingNumber, at: p.at,
  status: received
    ? (p.damaged ? { label: tr('{{count}} kharab', { count: p.damaged }), variant: 'danger' } : { label: tr('Shelf par'), variant: 'success' })
    : p.orderStatus === 'RETURNED' ? { label: 'Returned', variant: 'warning' } : { label: 'Returning', variant: 'info' },
  note: received && p.rtoCost > 0 ? <span className="shrink-0 tabular-nums text-rose-600">· RTO {rs(p.rtoCost)}</span> : undefined,
});

const REASONS = [tr('Customer ne parcel nahi liya'), tr('Phone band / nahi utha'), tr('Address ghalat'), tr('Customer ne mana kar diya'), tr('Fake order')];

export default function ReturnScanPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const desk = useQuery({ queryKey: DESK_KEY, queryFn: scanApi.rtoDesk, refetchInterval: 60_000 });
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [order, setOrder] = useState<ScanOrder | null>(null);
  const [damaged, setDamaged] = useState<Record<number, number>>({});
  const [reason, setReason] = useState(REASONS[0]);
  const [error, setError] = useState<string | null>(null);
  const focus = () => window.setTimeout(() => inputRef.current?.focus(), 0);

  const lookup = useMutation({
    mutationFn: (code: string) => scanApi.lookup(code),
    onSuccess: (o) => {
      setOrder(o); setDamaged({}); setValue('');
      if (o.canReturn) { setError(null); beep(true); } else { setError(o.returnProblem); beep(false); }
      focus();
    },
    onError: (e) => { setOrder(null); setError(apiErrorMessage(e)); setValue(''); beep(false); focus(); },
  });

  const receive = useMutation({
    mutationFn: () => scanApi.rtoReceive(order!.id, damaged, order!.orderStatus === 'RETURNED' ? undefined : reason),
    onSuccess: (r) => {
      beep(true);
      if (r.failed.length) toast.error(tr('Kuch kharab maal nahi likha gaya: {{value}}', { value: r.failed.join(', ') }));
      else toast.success(tr('#{{number}} wapas — {{restocked}} shelf par{{value}}', { number: r.order.number, restocked: r.restocked, value: r.damaged ? tr(', {{damaged}} kharab likhe', { damaged: r.damaged }) : '' }));
      qc.invalidateQueries({ queryKey: DESK_KEY });
      ['online-orders', 'cod-summary', 'cod-history', 'online-profit'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      setOrder(null); setDamaged({}); setValue(''); focus();
    },
    onError: (e) => { beep(false); setError(apiErrorMessage(e)); },
  });

  const setDamage = (i: number, n: number, max: number) => setDamaged((d) => ({ ...d, [i]: Math.max(0, Math.min(max, n)) }));
  const damagedQty = Object.values(damaged).reduce((t, n) => t + n, 0);
  const totalQty = order?.lines.reduce((t, l) => t + l.quantity, 0) ?? 0;

  const d = desk.data;
  return (
    <PageShell>
      <PageHero title={tr('RTO returns')} chip={<><RotateCcw />{tr('Wapas aaye parcel')}</>}
        meta={tr('CN ya order # scan karein — maal shelf par wapas, kharab ho to alag likhein')}
        busy={desk.isFetching && !desk.isLoading} loading={desk.isLoading}
        actions={<>
          <Link to="/online-orders/pack" className={heroButton}><ScanLine className="h-4 w-4" /> <span className="hidden sm:inline">{tr('Packing')}</span></Link>
          <Link to="/online-orders/dispatch-report" className={heroButton}><BarChart3 className="h-4 w-4" /> <span className="hidden sm:inline">{tr('Dispatch report')}</span></Link>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: tr('Wapas aa rahe'), value: String(d?.returning ?? 0), hint: tr('scan baqi') },
          { label: tr('Aaj receive'), value: String(d?.receivedToday ?? 0) },
          { label: tr('Aaj kharab'), value: String(d?.damagedToday ?? 0), hint: tr('pieces') },
        ]} />

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <Card title={tr('Parcel scan karein')} description={tr('Scanner se CN ya order # — ya likh kar Enter')}>
        <form onSubmit={(e) => { e.preventDefault(); if (value.trim()) lookup.mutate(value.trim()); }} className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <ScanLine className="pointer-events-none absolute start-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input ref={inputRef} autoFocus value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" spellCheck={false} aria-label={tr('CN ya order number')}
              placeholder={tr('Wapas aaye parcel ka CN ya order # scan karein…')}
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white ps-11 pe-3 font-mono text-lg text-slate-900 outline-none focus:border-brand-500" />
          </div>
          <Button type="submit" size="lg" className="h-14" loading={lookup.isPending} disabled={!value.trim()}>{tr('Scan')}</Button>
        </form>

        {error && (
          <div role="alert" className="mt-4 flex items-center gap-3 rounded-2xl bg-rose-600 px-4 py-4 text-white">
            <AlertOctagon className="h-8 w-8 shrink-0" />
            <div className="min-w-0 flex-1 text-[0.9375rem] font-semibold">{order ? `#${order.number}: ` : ''}{error}</div>
            <Button variant="secondary" size="sm" onClick={() => { setError(null); focus(); }}>{tr('Theek hai')}</Button>
          </div>
        )}

        {lookup.isPending && <Skeleton className="mt-4 h-40 rounded-2xl" />}

        {order && order.canReturn && (
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-3">
              {order.courierCode && <BrandLogo name={courierBrand(order.courierCode)} size={36} />}
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xl font-bold text-slate-900">#{order.number}</div>
                <div className="text-[0.8125rem] text-slate-500">{order.customerName}{order.customerCity ? ` · ${order.customerCity}` : ''} · {rs(order.total)}{order.trackingNumber ? tr(' · CN {{trackingNumber}}', { trackingNumber: order.trackingNumber }) : ''}</div>
              </div>
              {order.orderStatus === 'RETURNED' && <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">{tr('Courier ne wapas likh diya — ab maal check karein')}</span>}
            </div>

            <ul className="mt-3 divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
              {order.lines.map((l) => {
                const bad = damaged[l.index] ?? 0;
                return (
                  <li key={l.index} className="flex flex-wrap items-center gap-3 px-3 py-3 sm:px-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                      {l.image ? <img src={l.image} alt="" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-slate-400" />}
                    </span>
                    <div className="min-w-[10rem] flex-1">
                      <div className="truncate text-[0.9375rem] font-semibold text-slate-900">{l.name}{l.variant ? <span className="text-slate-500"> · {l.variant}</span> : null}</div>
                      <div className="text-[0.75rem] text-slate-500">
                        <span className="font-semibold text-success-700">{tr('{{value}} shelf par', { value: l.quantity - bad })}</span>
                        {bad > 0 && <span className="font-semibold text-rose-600"> {' '}{tr('· {{bad}} kharab', { bad })}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[0.75rem] font-semibold text-slate-500">{tr('Kharab')}</span>
                      <button type="button" aria-label={tr('Kam')} onClick={() => setDamage(l.index, bad - 1, l.quantity)} disabled={!bad} className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-30"><Minus className="h-4 w-4" /></button>
                      <span className={cn('w-8 text-center text-lg font-bold tabular-nums', bad ? 'text-rose-600' : 'text-slate-400')}>{bad}</span>
                      <button type="button" aria-label={tr('Zyada')} onClick={() => setDamage(l.index, bad + 1, l.quantity)} disabled={bad >= l.quantity} className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-30"><Plus className="h-4 w-4" /></button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {order.orderStatus !== 'RETURNED' && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {REASONS.map((r) => (
                  <button key={r} type="button" onClick={() => setReason(r)}
                    className={cn('rounded-lg border px-2.5 py-1.5 text-xs font-semibold', reason === r ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50')}>{r}</button>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button size="lg" variant="primary" className="min-w-[12rem] flex-1" loading={receive.isPending} onClick={() => receive.mutate()} leftIcon={<CheckCircle2 className="h-5 w-5" />}>
                {tr('Wapas receive karein · {{value}} shelf par{{value2}}', { value: totalQty - damagedQty, value2: damagedQty ? tr(', {{damagedQty}} kharab', { damagedQty }) : '' })}
              </Button>
              <Button size="lg" variant="ghost" onClick={() => { setOrder(null); setDamaged({}); focus(); }}>{tr('Chhorein')}</Button>
            </div>
            <p className="mt-2 text-[0.75rem] text-slate-500">{tr('Bill void hoga aur maal is order ki branch me wapas aayega. Kharab maal "Damage" ke taur par stock se niklega (nuksan cost par). Courier aur wapsi ka kharcha order par likha jayega.')}</p>
          </div>
        )}

        {!order && !lookup.isPending && !error && (
          <EmptyState icon={<PackageX className="h-6 w-6" />} title={tr('Courier se wapas aaya parcel scan karein')}
            description={tr('Label ka CN ya order number — Nafaa order dhoond kar maal ki list dikhayega.')} className="py-8" />
        )}
      </Card>

        <ParcelList title={tr('Aaj receive kiye ({{count}})', { count: d?.receivedToday ?? 0 })} description={tr('Aaj shelf par wapas aaye parcel')}
          rows={(d?.received ?? []).map((p) => parcelRow(p, true))} loading={desk.isLoading}
          empty={{ icon: <PackageCheck className="h-6 w-6" />, title: tr('Aaj abhi koi parcel receive nahi hua'), text: tr('Parcel scan karein — yahan list banti jayegi.') }} />
      </div>

      <ParcelList title={tr('RTO aana baqi ({{count}})', { count: d?.returning ?? 0 })}
        description={tr('Courier ne wapas likha ya wapas aa raha hai, abhi dukaan par scan nahi hua — row dabayein to scan khul jayega')}
        rows={(d?.pending ?? []).map((p) => parcelRow(p, false))} loading={desk.isLoading}
        onOpen={(r) => lookup.mutate(r.number)}
        empty={{ icon: <Truck className="h-6 w-6" />, title: tr('Koi parcel wapas nahi aa raha'), text: tr('Jab courier parcel wapas bhejega, woh yahan dikhega.'), action: <Link to="/online-orders?board=RETURNING" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{tr('Returning orders dekhein')}</Link> }} />

      {guide.isOpen && (
        <PageGuide title={tr('RTO returns')} onClose={guide.close}
          flow={[
            { label: 'Returning', hint: tr('Courier wapas la raha'), icon: Truck, color: '#c026d3' },
            { label: tr('Scan'), hint: tr('CN ya order #'), icon: ScanLine, color: '#0284c7' },
            { label: tr('Kharab check'), hint: tr('Kharab alag likhein'), icon: AlertOctagon, color: '#dc2626' },
            { label: tr('Shelf par'), hint: tr('Stock wapas'), icon: Warehouse, color: '#16a34a' },
          ]}
          steps={[
            { icon: ScanLine, color: '#0284c7', title: tr('Parcel scan karein'), text: tr('Label ka CN ya order number scan karein. Nafaa order aur us ka maal dikhata hai.') },
            { icon: AlertOctagon, color: '#dc2626', title: tr('Kharab maal alag'), text: tr('Jo cheez toot ya kharab aayi, us ki ginti "Kharab" me likhein. Woh stock me wapas nahi jayegi, nuksan me likhi jayegi.') },
            { icon: Truck, color: '#c026d3', title: tr('RTO aana baqi'), text: tr('Neeche woh parcel hain jo courier ne wapas likhe par dukaan par scan nahi hue. Courier se poochein ya pahunchne par scan karein.') },
          ]}
          shortcuts={[['Enter', tr('scan')], ['G', tr('guide')]]}
        />
      )}
    </PageShell>
  );
}
