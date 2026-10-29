/**
 * RTO returns desk. Scan a returned parcel's CN or order number; the order
 * is marked returned through the normal RTO path (its bill is voided, which
 * puts every item back in the order's branch). Items that came back broken
 * are marked damaged and written off as a stock loss instead. The parcel's
 * courier and return charges are kept on the order.
 */

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertOctagon, CheckCircle2, Minus, Package, PackageX, Plus, RotateCcw, ScanLine } from 'lucide-react';
import { Button, PageHero, PageShell, Skeleton, heroButton } from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { apiErrorMessage } from '../api/online-orders.api';
import { scanApi, type ScanOrder } from '../api/order-money.api';
import { beep } from '../lib/pack';
import { courierBrand, rs } from '../lib/labels';

const REASONS = ['Customer ne parcel nahi liya', 'Phone band / nahi utha', 'Address ghalat', 'Customer ne mana kar diya', 'Fake order'];

export default function ReturnScanPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [order, setOrder] = useState<ScanOrder | null>(null);
  const [damaged, setDamaged] = useState<Record<number, number>>({});
  const [reason, setReason] = useState(REASONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Array<{ number: string; restocked: number; damaged: number; rtoCost: number; courierCode: string | null }>>([]);
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
      setDone((d) => [{ number: r.order.number, restocked: r.restocked, damaged: r.damaged, rtoCost: r.rtoCost, courierCode: r.order.courierCode }, ...d].slice(0, 20));
      if (r.failed.length) toast.error(`Kuch kharab maal nahi likha gaya: ${r.failed.join(', ')}`);
      else toast.success(`#${r.order.number} wapas — ${r.restocked} shelf par${r.damaged ? `, ${r.damaged} kharab likhe` : ''}`);
      ['online-orders', 'cod-summary', 'cod-history', 'online-profit'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      setOrder(null); setDamaged({}); setValue(''); focus();
    },
    onError: (e) => { beep(false); setError(apiErrorMessage(e)); },
  });

  const setDamage = (i: number, n: number, max: number) => setDamaged((d) => ({ ...d, [i]: Math.max(0, Math.min(max, n)) }));
  const damagedQty = Object.values(damaged).reduce((t, n) => t + n, 0);
  const totalQty = order?.lines.reduce((t, l) => t + l.quantity, 0) ?? 0;

  return (
    <PageShell className="max-w-4xl">
      <PageHero title="RTO returns" chip={<><RotateCcw />Wapas aaye parcel</>}
        meta="CN ya order # scan karein — maal shelf par wapas, kharab ho to alag likhein"
        actions={<Link to="/online-orders/pack" className={heroButton}><ScanLine className="h-4 w-4" /> Packing</Link>} />

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
        <form onSubmit={(e) => { e.preventDefault(); if (value.trim()) lookup.mutate(value.trim()); }} className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <ScanLine className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input ref={inputRef} autoFocus value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" spellCheck={false} aria-label="CN ya order number"
              placeholder="Wapas aaye parcel ka CN ya order # scan karein…"
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-3 font-mono text-lg text-slate-900 outline-none focus:border-brand-500" />
          </div>
          <Button type="submit" size="lg" className="h-14" loading={lookup.isPending} disabled={!value.trim()}>Scan</Button>
        </form>

        {error && (
          <div role="alert" className="mt-4 flex items-center gap-3 rounded-2xl bg-rose-600 px-4 py-4 text-white">
            <AlertOctagon className="h-8 w-8 shrink-0" />
            <div className="min-w-0 flex-1 text-[0.9375rem] font-semibold">{order ? `#${order.number}: ` : ''}{error}</div>
            <Button variant="secondary" size="sm" onClick={() => { setError(null); focus(); }}>Theek hai</Button>
          </div>
        )}

        {lookup.isPending && <Skeleton className="mt-4 h-40 rounded-2xl" />}

        {order && order.canReturn && (
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-3">
              {order.courierCode && <BrandLogo name={courierBrand(order.courierCode)} size={36} />}
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xl font-bold text-slate-900">#{order.number}</div>
                <div className="text-[0.8125rem] text-slate-500">{order.customerName}{order.customerCity ? ` · ${order.customerCity}` : ''} · {rs(order.total)}{order.trackingNumber ? ` · CN ${order.trackingNumber}` : ''}</div>
              </div>
              {order.orderStatus === 'RETURNED' && <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Courier ne wapas likh diya — ab maal check karein</span>}
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
                        <span className="font-semibold text-success-700">{l.quantity - bad} shelf par</span>
                        {bad > 0 && <span className="font-semibold text-rose-600"> · {bad} kharab</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[0.75rem] font-semibold text-slate-500">Kharab</span>
                      <button type="button" aria-label="Kam" onClick={() => setDamage(l.index, bad - 1, l.quantity)} disabled={!bad} className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-30"><Minus className="h-4 w-4" /></button>
                      <span className={cn('w-8 text-center text-lg font-bold tabular-nums', bad ? 'text-rose-600' : 'text-slate-400')}>{bad}</span>
                      <button type="button" aria-label="Zyada" onClick={() => setDamage(l.index, bad + 1, l.quantity)} disabled={bad >= l.quantity} className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-30"><Plus className="h-4 w-4" /></button>
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
                Wapas receive karein · {totalQty - damagedQty} shelf par{damagedQty ? `, ${damagedQty} kharab` : ''}
              </Button>
              <Button size="lg" variant="ghost" onClick={() => { setOrder(null); setDamaged({}); focus(); }}>Chhorein</Button>
            </div>
            <p className="mt-2 text-[0.75rem] text-slate-500">Bill void hoga aur maal is order ki branch me wapas aayega. Kharab maal "Damage" ke taur par stock se niklega (nuksan cost par). Courier aur wapsi ka kharcha order par likha jayega.</p>
          </div>
        )}

        {!order && !lookup.isPending && !error && (
          <div className="mt-6 flex flex-col items-center py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-600"><PackageX className="h-8 w-8" /></span>
            <p className="mt-3 text-[0.9375rem] font-semibold text-slate-800">Courier se wapas aaya parcel scan karein</p>
            <p className="mt-1 max-w-md text-[0.8125rem] text-slate-500">Label ka CN ya order number — Nafaa order dhoond kar maal ki list dikhayega.</p>
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <header className="border-b border-slate-100 px-4 py-3 text-[0.9375rem] font-semibold text-slate-900 sm:px-5">Abhi receive kiye ({done.length})</header>
          <ul className="divide-y divide-slate-100">
            {done.map((d) => (
              <li key={d.number} className="flex items-center gap-3 px-4 py-2.5 text-[0.8125rem] sm:px-5">
                {d.courierCode && <BrandLogo name={courierBrand(d.courierCode)} size={18} />}
                <span className="font-semibold text-slate-900">#{d.number}</span>
                <span className="min-w-0 flex-1 text-slate-600">{d.restocked} shelf par{d.damaged ? ` · ${d.damaged} kharab` : ''}</span>
                {d.rtoCost > 0 && <span className="tabular-nums text-rose-600">RTO {rs(d.rtoCost)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageShell>
  );
}
