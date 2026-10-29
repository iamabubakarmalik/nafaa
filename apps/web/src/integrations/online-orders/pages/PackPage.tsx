/**
 * Scan to pack. Scan (or type) the order number or courier CN to open the
 * order, then scan every item's barcode or SKU. A wrong item or one piece
 * too many stops the screen with a loud red warning until it is cleared;
 * when every line is complete, "Pack ho gaya" marks the order ready. Works
 * with a USB scanner (it types and presses Enter) and on a phone. Below,
 * the orders waiting to be packed, with packing slips and courier labels
 * printed for the ticked ones.
 *
 * Keys: Enter scan · Esc clear a warning · F2 next order.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertOctagon, CheckCircle2, Hand, Package, PackageCheck, Printer, RotateCcw, ScanLine, Tag, Truck } from 'lucide-react';
import { Button, Checkbox, PageHero, PageShell, Skeleton, heroButton } from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { apiErrorMessage, couriersApi, onlineOrdersApi } from '../api/online-orders.api';
import { scanApi, type ScanOrder } from '../api/order-money.api';
import { beep, matchScan } from '../lib/pack';
import { courierBrand, rs, STATUS_LABEL } from '../lib/labels';

type Alarm = { title: string; text: string } | null;

export default function PackPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [order, setOrder] = useState<ScanOrder | null>(null);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [manual, setManual] = useState<number[]>([]);
  const [alarm, setAlarm] = useState<Alarm>(null);
  const [flash, setFlash] = useState<number | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const focus = () => window.setTimeout(() => inputRef.current?.focus(), 0);
  useEffect(() => { focus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const queue = useQuery({
    queryKey: ['online-orders', 'pack-queue'],
    queryFn: () => onlineOrdersApi.list({ status: 'ACTIVE', limit: 100 }),
    refetchInterval: 30_000,
  });
  const waiting = (queue.data?.items ?? []).filter((o) => ['CONFIRMED', 'PREPARING', 'READY'].includes(o.orderStatus));

  const reset = () => { setOrder(null); setCounts({}); setManual([]); setAlarm(null); setValue(''); focus(); };

  const lookup = useMutation({
    mutationFn: (code: string) => scanApi.lookup(code),
    onSuccess: (o) => {
      setOrder(o); setCounts({}); setManual([]); setValue('');
      if (!o.canPack) { beep(false); setAlarm({ title: `Order #${o.number}`, text: o.packProblem ?? 'Ye order pack nahi ho sakta' }); }
      else beep(true);
      focus();
    },
    onError: (e) => { beep(false); setAlarm({ title: 'Order nahi mila', text: apiErrorMessage(e) }); setValue(''); },
  });

  const pack = useMutation({
    mutationFn: () => scanApi.packed(order!.id, counts, manual),
    onSuccess: (r) => {
      beep(true);
      toast.success(`#${r.order.number} pack ho gaya — Ready`, {
        action: { label: 'Slip print', onClick: () => window.open(`/online-orders/print?auto=1&ids=${r.order.id}`, '_blank') },
      });
      qc.invalidateQueries({ queryKey: ['online-orders'] });
      reset();
    },
    onError: (e) => { beep(false); setAlarm({ title: 'Pack nahi hua', text: apiErrorMessage(e) }); },
  });

  const lines = order?.lines ?? [];
  const complete = !!order && order.canPack && lines.every((l) => (!l.codes.length && manual.includes(l.index)) || (counts[l.index] ?? 0) === l.quantity);
  const totalQty = lines.reduce((t, l) => t + l.quantity, 0);
  const doneQty = lines.reduce((t, l) => t + Math.min(l.quantity, (!l.codes.length && manual.includes(l.index)) ? l.quantity : counts[l.index] ?? 0), 0);

  const onScan = (raw: string) => {
    const code = raw.trim();
    if (!code || alarm) return;
    // No order open, or the open one is done: this scan is an order number or CN.
    if (!order || !order.canPack) { lookup.mutate(code); return; }
    if (complete) { lookup.mutate(code); return; }
    const r = matchScan(lines, counts, code);
    setValue('');
    if (r.kind === 'WRONG') {
      beep(false);
      setAlarm({ title: 'Ghalat cheez!', text: `"${code}" is order me nahi hai — ye parcel me mat daalein.` });
      return;
    }
    if (r.kind === 'EXTRA') {
      beep(false);
      const l = lines[r.index];
      setAlarm({ title: 'Zyada ho gaya!', text: `${l.name}${l.variant ? ` (${l.variant})` : ''} sirf ${l.quantity} chahiye — ek wapas nikal dein.` });
      return;
    }
    beep(true);
    setCounts((c) => ({ ...c, [r.index]: (c[r.index] ?? 0) + 1 }));
    setFlash(r.index);
    window.setTimeout(() => setFlash((f) => (f === r.index ? null : f)), 600);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && alarm) { e.preventDefault(); setAlarm(null); focus(); }
      if (e.key === 'F2') { e.preventDefault(); reset(); }
      if (e.key === 'Enter' && complete && !alarm && !value.trim() && !pack.isPending) { e.preventDefault(); pack.mutate(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const pickedOrders = useMemo(() => waiting.filter((o) => picked.has(o.id)), [waiting, picked]);
  const printSlips = () => window.open(`/online-orders/print?auto=1&ids=${pickedOrders.map((o) => o.id).join(',')}`, '_blank');
  const labels = useMutation({
    mutationFn: async () => {
      const byCourier = new Map<string, string[]>();
      for (const o of pickedOrders) if (o.courierBooked && o.trackingNumber && o.courierCode) byCourier.set(o.courierCode, [...(byCourier.get(o.courierCode) ?? []), o.trackingNumber]);
      if (!byCourier.size) throw new Error('Chune orders me koi courier par book nahi — label nahi bana');
      for (const [code, tns] of byCourier) await couriersApi.openLabels(code, tns);
      return byCourier.size;
    },
    onError: (e) => toast.error(apiErrorMessage(e, (e as Error).message)),
  });

  return (
    <PageShell>
      <PageHero title="Packing" chip={<><ScanLine />Scan karke pack</>}
        meta="Order ya CN scan karein, phir har cheez — ghalat ya zyada cheez par screen ruk jayegi"
        actions={<Link to="/online-orders/returns-scan" className={heroButton}><RotateCcw className="h-4 w-4" /> RTO returns</Link>} />

      <section className={cn('rounded-3xl bg-white p-4 shadow-sm ring-1 sm:p-5', alarm ? 'ring-rose-300' : 'ring-slate-200/80')}>
        <form onSubmit={(e) => { e.preventDefault(); onScan(value); }} className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <ScanLine className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)} disabled={!!alarm}
              inputMode="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-label="Scan"
              placeholder={!order || complete || !order.canPack ? 'Order # ya CN scan karein…' : 'Cheez ka barcode / SKU scan karein…'}
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-3 font-mono text-lg text-slate-900 outline-none focus:border-brand-500 disabled:opacity-50" />
          </div>
          <Button type="submit" size="lg" className="h-14" loading={lookup.isPending} disabled={!value.trim() || !!alarm}>Scan</Button>
        </form>

        {alarm && (
          <div role="alert" className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-rose-600 px-5 py-6 text-center text-white shadow-lg sm:flex-row sm:text-left">
            <AlertOctagon className="h-12 w-12 shrink-0 animate-pulse" />
            <div className="min-w-0 flex-1">
              <div className="text-2xl font-black tracking-tight">{alarm.title}</div>
              <div className="mt-1 text-[0.9375rem] font-semibold text-white/90">{alarm.text}</div>
            </div>
            <Button size="lg" variant="secondary" onClick={() => { setAlarm(null); focus(); }}>Theek hai (Esc)</Button>
          </div>
        )}

        {lookup.isPending && !order && <Skeleton className="mt-4 h-40 rounded-2xl" />}

        {order && (
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-3">
              {order.courierCode && <BrandLogo name={courierBrand(order.courierCode)} size={36} />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xl font-bold text-slate-900">#{order.number}</span>
                  <span className={cn('rounded-lg px-2 py-0.5 text-xs font-bold', (STATUS_LABEL as any)[order.orderStatus]?.tone)}>{(STATUS_LABEL as any)[order.orderStatus]?.label ?? order.orderStatus}</span>
                </div>
                <div className="text-[0.8125rem] text-slate-500">{order.customerName}{order.customerCity ? ` · ${order.customerCity}` : ''} · {rs(order.total)}{order.trackingNumber ? ` · CN ${order.trackingNumber}` : ''}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black tabular-nums text-slate-900">{doneQty}<span className="text-slate-400">/{totalQty}</span></div>
                <div className="text-[0.6875rem] font-semibold text-slate-500">scan hue</div>
              </div>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={cn('h-full rounded-full transition-all', complete ? 'bg-success-500' : 'bg-brand-500')} style={{ width: `${totalQty ? (doneQty / totalQty) * 100 : 0}%` }} />
            </div>

            <ul className="mt-3 divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
              {lines.map((l) => {
                const n = counts[l.index] ?? 0;
                const done = (!l.codes.length && manual.includes(l.index)) || n === l.quantity;
                return (
                  <li key={l.index} className={cn('flex items-center gap-3 px-3 py-3 transition-colors sm:px-4', flash === l.index && 'bg-success-50', done && 'bg-success-50/50')}>
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                      {l.image ? <img src={l.image} alt="" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-slate-400" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[0.9375rem] font-semibold text-slate-900">{l.name}{l.variant ? <span className="text-slate-500"> · {l.variant}</span> : null}</div>
                      <div className="truncate font-mono text-[0.75rem] text-slate-500">{l.codes.length ? l.codes.join(' · ') : 'Barcode / SKU nahi — haath se gin kar tick karein'}</div>
                    </div>
                    {l.codes.length ? (
                      <span className={cn('min-w-[4.5rem] rounded-xl px-2.5 py-1.5 text-center text-lg font-black tabular-nums', done ? 'bg-success-600 text-white' : n > 0 ? 'bg-brand-50 text-brand-800' : 'bg-slate-100 text-slate-600')}>
                        {n}/{l.quantity}
                      </span>
                    ) : (
                      <button type="button" onClick={() => { setManual((m) => (m.includes(l.index) ? m.filter((x) => x !== l.index) : [...m, l.index])); focus(); }}
                        className={cn('inline-flex min-w-[4.5rem] items-center justify-center gap-1 rounded-xl px-2.5 py-2 text-sm font-bold', done ? 'bg-success-600 text-white' : 'bg-amber-100 text-amber-900')}>
                        <Hand className="h-4 w-4" />{done ? 'Gin liya' : `${l.quantity} gine`}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button size="lg" variant="success" className="min-w-[12rem] flex-1" disabled={!complete || !!alarm} loading={pack.isPending} onClick={() => pack.mutate()} leftIcon={<PackageCheck className="h-5 w-5" />}>
                Pack ho gaya
              </Button>
              <Button size="lg" variant="outline" onClick={() => window.open(`/online-orders/print?auto=1&ids=${order.id}`, '_blank')} leftIcon={<Printer className="h-4 w-4" />}>Slip</Button>
              {order.courierBooked && (
                <Button size="lg" variant="outline" onClick={() => couriersApi.openLabel(order.id).catch((e) => toast.error(apiErrorMessage(e)))} leftIcon={<Tag className="h-4 w-4" />}>Label</Button>
              )}
              <Button size="lg" variant="ghost" onClick={reset}>Agla order (F2)</Button>
            </div>
          </div>
        )}

        {!order && !lookup.isPending && !alarm && (
          <div className="mt-6 flex flex-col items-center py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50 text-brand-600"><ScanLine className="h-8 w-8" /></span>
            <p className="mt-3 text-[0.9375rem] font-semibold text-slate-800">Order ka number ya courier CN scan karein</p>
            <p className="mt-1 max-w-md text-[0.8125rem] text-slate-500">Scanner type karke Enter dabata hai — yahan bas scan karte jayein. Phone par number likh kar Scan dabayein.</p>
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <header className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">Pack hone wale orders</h2>
            <p className="text-[0.75rem] text-slate-500">Accept ho chuke, abhi courier ko nahi diye — chun kar slips ya labels ek saath print karein</p>
          </div>
          <Button size="sm" variant="secondary" disabled={!pickedOrders.length} onClick={printSlips} leftIcon={<Printer className="h-4 w-4" />}>Slips ({pickedOrders.length})</Button>
          <Button size="sm" variant="secondary" disabled={!pickedOrders.some((o) => o.courierBooked)} loading={labels.isPending} onClick={() => labels.mutate()} leftIcon={<Tag className="h-4 w-4" />}>Labels</Button>
        </header>
        {queue.isLoading ? <div className="p-4"><Skeleton className="h-24 rounded-xl" /></div> : !waiting.length ? (
          <p className="px-6 py-10 text-center text-[0.8125rem] text-slate-500">Koi order pack hone ka intezar nahi kar raha.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            <li className="flex items-center gap-3 px-4 py-2 sm:px-5">
              <Checkbox aria-label="Sab chunein" checked={waiting.every((o) => picked.has(o.id))} onChange={(e) => setPicked(e.target.checked ? new Set(waiting.map((o) => o.id)) : new Set())} />
              <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">Order · customer · courier</span>
            </li>
            {waiting.map((o) => {
              const num = String(o.externalOrderNumber ?? o.externalOrderId);
              const packed = !!(o.metadata as any)?.packed;
              return (
                <li key={o.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                  <Checkbox aria-label={`#${num}`} checked={picked.has(o.id)} onChange={() => setPicked((p) => { const n = new Set(p); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); return n; })} />
                  <button type="button" onClick={() => lookup.mutate(num)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[0.875rem] font-semibold text-slate-900">#{num} <span className="font-normal text-slate-600">· {o.customerName}{o.customerCity ? ` · ${o.customerCity}` : ''}</span></span>
                    <span className="flex items-center gap-1.5 text-[0.75rem] text-slate-500">
                      {o.courierCode ? <><BrandLogo name={courierBrand(o.courierCode)} size={14} />{o.courierLabel}{o.trackingNumber ? ` · ${o.trackingNumber}` : ''}</> : <><Truck className="h-3.5 w-3.5" />Courier abhi nahi</>}
                    </span>
                  </button>
                  {packed || o.orderStatus === 'READY'
                    ? <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-success-700"><CheckCircle2 className="h-3 w-3" />Ready</span>
                    : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-800">Pack baqi</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
