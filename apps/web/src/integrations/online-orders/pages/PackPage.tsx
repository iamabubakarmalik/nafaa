/**
 * Scan to pack. Scan (or type) the order number or courier CN to open the
 * order, then scan every item's barcode or SKU. A wrong item or one piece
 * too many stops the screen with a loud red warning until it is cleared;
 * when every line is complete, "Pack ho gaya" marks the order ready. Works
 * with a USB scanner (it types and presses Enter) and on a phone. Below,
 * the orders waiting to be packed, with packing slips and courier labels
 * printed for the ticked ones. Wrong scans are counted per order and saved
 * with the packing, so the hero shows today's mistakes.
 *
 * Keys: Enter scan · Esc clear a warning · F2 next order.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertOctagon, GraduationCap, Hand, Package, PackageCheck, Printer, RotateCcw, ScanLine, Send, Tag } from 'lucide-react';
import { Button, Card, EmptyState, PageHero, PageShell, Skeleton, heroButton, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { ParcelList, type ParcelRow } from '../components/dispatch/ParcelList';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { apiErrorMessage, couriersApi, onlineOrdersApi } from '../api/online-orders.api';
import { scanApi, type ScanOrder } from '../api/order-money.api';
import { beep, matchScan } from '../lib/pack';
import { courierBrand, rs, STATUS_LABEL } from '../lib/labels';
import { t as tr } from '@core/i18n';

type Alarm = { title: string; text: string } | null;

const DESK_KEY = ['online-orders', 'pack-desk'] as const;

export default function PackPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const desk = useQuery({ queryKey: DESK_KEY, queryFn: scanApi.packDesk, refetchInterval: 60_000 });
  const [mistakes, setMistakes] = useState(0);
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

  const reset = () => { setOrder(null); setCounts({}); setManual([]); setAlarm(null); setValue(''); setMistakes(0); focus(); };

  const lookup = useMutation({
    mutationFn: (code: string) => scanApi.lookup(code),
    onSuccess: (o) => {
      setOrder(o); setCounts({}); setManual([]); setValue(''); setMistakes(0);
      if (!o.canPack) { beep(false); setAlarm({ title: tr('Order #{{number}}', { number: o.number }), text: o.packProblem ?? tr('Ye order pack nahi ho sakta') }); }
      else beep(true);
      focus();
    },
    onError: (e) => { beep(false); setAlarm({ title: tr('Order nahi mila'), text: apiErrorMessage(e) }); setValue(''); },
  });

  const pack = useMutation({
    mutationFn: () => scanApi.packed(order!.id, counts, manual, mistakes),
    onSuccess: (r) => {
      beep(true);
      toast.success(tr('#{{number}} pack ho gaya — Ready', { number: r.order.number }), {
        action: { label: tr('Slip print'), onClick: () => window.open(`/online-orders/print?auto=1&ids=${r.order.id}`, '_blank') },
      });
      qc.invalidateQueries({ queryKey: ['online-orders'] });
      qc.invalidateQueries({ queryKey: DESK_KEY });
      reset();
    },
    onError: (e) => { beep(false); setAlarm({ title: tr('Pack nahi hua'), text: apiErrorMessage(e) }); },
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
      setMistakes((n) => n + 1);
      setAlarm({ title: tr('Ghalat cheez!'), text: tr('"{{code}}" is order me nahi hai — ye parcel me mat daalein.', { code }) });
      return;
    }
    if (r.kind === 'EXTRA') {
      beep(false);
      setMistakes((n) => n + 1);
      const l = lines[r.index];
      setAlarm({ title: tr('Zyada ho gaya!'), text: tr('{{name}}{{value}} sirf {{quantity}} chahiye — ek wapas nikal dein.', { name: l.name, value: l.variant ? ` (${l.variant})` : '', quantity: l.quantity }) });
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
      if (!byCourier.size) throw new Error(tr('Chune orders me koi courier par book nahi — label nahi bana'));
      for (const [code, tns] of byCourier) await couriersApi.openLabels(code, tns);
      return byCourier.size;
    },
    onError: (e) => toast.error(apiErrorMessage(e, (e as Error).message)),
  });

  const d = desk.data;
  const rows: ParcelRow[] = waiting.map((o) => ({
    id: o.id, number: String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#/, ''), customerName: o.customerName, city: o.customerCity ?? null,
    total: Number(o.total) || 0, courierCode: o.courierCode ?? null, courierLabel: o.courierLabel ?? null, trackingNumber: o.trackingNumber ?? null,
    at: o.acceptedAt ?? o.receivedAt,
    status: (o.metadata as any)?.packed || o.orderStatus === 'READY' ? { label: 'Ready', variant: 'success' } : { label: tr('Pack baqi'), variant: 'warning' },
  }));
  return (
    <PageShell>
      <PageHero title={tr('Packing')} chip={<><ScanLine />{tr('Scan karke pack')}</>}
        meta={tr('Order ya CN scan karein, phir har cheez — ghalat ya zyada cheez par screen ruk jayegi')}
        busy={desk.isFetching && !desk.isLoading} loading={desk.isLoading}
        actions={<>
          <Link to="/online-orders/dispatch-scan" className={heroButton}><Send className="h-4 w-4" /> <span className="hidden sm:inline">{tr('Dispatch scan')}</span></Link>
          <Link to="/online-orders/returns-scan" className={heroButton}><RotateCcw className="h-4 w-4" /> <span className="hidden sm:inline">{tr('RTO returns')}</span></Link>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: tr('Pack karne hain'), value: String(d?.toPack ?? waiting.filter((o) => o.orderStatus !== 'READY').length) },
          { label: tr('Aaj pack hue'), value: String(d?.packedToday ?? 0) },
          { label: tr('Aaj ghalat scan'), value: String(d?.mistakesToday ?? 0), hint: tr('ghalat ya zyada cheez') },
        ]} />

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <Card title={tr('Scan karke pack karein')} description={tr('Pehle order # ya CN, phir har cheez ka barcode / SKU')} className={cn(alarm && 'border-rose-300')}>
        <form onSubmit={(e) => { e.preventDefault(); onScan(value); }} className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <ScanLine className="pointer-events-none absolute start-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)} disabled={!!alarm}
              inputMode="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-label={tr('Scan')}
              placeholder={!order || complete || !order.canPack ? tr('Order # ya CN scan karein…') : tr('Cheez ka barcode / SKU scan karein…')}
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white ps-11 pe-3 font-mono text-lg text-slate-900 outline-none focus:border-brand-500 disabled:opacity-50" />
          </div>
          <Button type="submit" size="lg" className="h-14" loading={lookup.isPending} disabled={!value.trim() || !!alarm}>{tr('Scan')}</Button>
        </form>

        {alarm && (
          <div role="alert" className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-rose-600 px-5 py-6 text-center text-white shadow-lg sm:flex-row sm:text-start">
            <AlertOctagon className="h-12 w-12 shrink-0 animate-pulse" />
            <div className="min-w-0 flex-1">
              <div className="text-2xl font-black tracking-tight">{alarm.title}</div>
              <div className="mt-1 text-[0.9375rem] font-semibold text-white/90">{alarm.text}</div>
            </div>
            <Button size="lg" variant="secondary" onClick={() => { setAlarm(null); focus(); }}>{tr('Theek hai (Esc)')}</Button>
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
                <div className="text-[0.8125rem] text-slate-500">{order.customerName}{order.customerCity ? ` · ${order.customerCity}` : ''} · {rs(order.total)}{order.trackingNumber ? tr(' · CN {{trackingNumber}}', { trackingNumber: order.trackingNumber }) : ''}</div>
              </div>
              <div className="text-end">
                <div className="text-2xl font-black tabular-nums text-slate-900">{doneQty}<span className="text-slate-400">/{totalQty}</span></div>
                <div className="text-[0.6875rem] font-semibold text-slate-500">{tr('scan hue')}</div>
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
                      <div className="truncate font-mono text-[0.75rem] text-slate-500">{l.codes.length ? l.codes.join(' · ') : tr('Barcode / SKU nahi — haath se gin kar tick karein')}</div>
                    </div>
                    {l.codes.length ? (
                      <span className={cn('min-w-[4.5rem] rounded-xl px-2.5 py-1.5 text-center text-lg font-black tabular-nums', done ? 'bg-success-600 text-white' : n > 0 ? 'bg-brand-50 text-brand-800' : 'bg-slate-100 text-slate-600')}>
                        {n}/{l.quantity}
                      </span>
                    ) : (
                      <button type="button" onClick={() => { setManual((m) => (m.includes(l.index) ? m.filter((x) => x !== l.index) : [...m, l.index])); focus(); }}
                        className={cn('inline-flex min-w-[4.5rem] items-center justify-center gap-1 rounded-xl px-2.5 py-2 text-sm font-bold', done ? 'bg-success-600 text-white' : 'bg-amber-100 text-amber-900')}>
                        <Hand className="h-4 w-4" />{done ? tr('Gin liya') : tr('{{quantity}} gine', { quantity: l.quantity })}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button size="lg" variant="success" className="min-w-[12rem] flex-1" disabled={!complete || !!alarm} loading={pack.isPending} onClick={() => pack.mutate()} leftIcon={<PackageCheck className="h-5 w-5" />}>
                {tr('Pack ho gaya')}
              </Button>
              <Button size="lg" variant="outline" onClick={() => window.open(`/online-orders/print?auto=1&ids=${order.id}`, '_blank')} leftIcon={<Printer className="h-4 w-4" />}>{tr('Slip')}</Button>
              {order.courierBooked && (
                <Button size="lg" variant="outline" onClick={() => couriersApi.openLabel(order.id).catch((e) => toast.error(apiErrorMessage(e)))} leftIcon={<Tag className="h-4 w-4" />}>{tr('Label')}</Button>
              )}
              <Button size="lg" variant="ghost" onClick={reset}>{tr('Agla order (F2)')}</Button>
            </div>
          </div>
        )}

        {!order && !lookup.isPending && !alarm && (
          <EmptyState icon={<ScanLine className="h-6 w-6" />} title={tr('Order ka number ya courier CN scan karein')}
            description={tr('Scanner type karke Enter dabata hai — yahan bas scan karte jayein. Phone par number likh kar Scan dabayein.')} className="py-8" />
        )}
      </Card>

      <ParcelList title={tr('Pack hone wale orders ({{count}})', { count: waiting.length })}
        description={tr('Accept ho chuke, abhi courier ko nahi diye — row dabayein to scan khulega, chun kar slips ya labels print karein')}
        actions={<>
          <Button size="sm" variant="secondary" disabled={!pickedOrders.length} onClick={printSlips} leftIcon={<Printer className="h-4 w-4" />}>{tr('Slips ({{count}})', { count: pickedOrders.length })}</Button>
          <Button size="sm" variant="secondary" disabled={!pickedOrders.some((o) => o.courierBooked)} loading={labels.isPending} onClick={() => labels.mutate()} leftIcon={<Tag className="h-4 w-4" />}>{tr('Labels')}</Button>
        </>}
        rows={rows} loading={queue.isLoading}
        picked={picked}
        onToggle={(id) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
        onToggleAll={(on) => setPicked(on ? new Set(waiting.map((o) => o.id)) : new Set())}
        onOpen={(r) => lookup.mutate(r.number)}
        empty={{ icon: <PackageCheck className="h-6 w-6" />, title: tr('Koi order pack hone ka intezar nahi kar raha.'), text: tr('Naye orders accept karein — woh yahan aa jayenge.'), action: <Link to="/online-orders?board=NEW" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{tr('New orders dekhein')}</Link> }} />
      </div>

      {guide.isOpen && (
        <PageGuide title={tr('Packing')} onClose={guide.close}
          flow={[
            { label: 'Confirmed', hint: tr('Pack karna hai'), icon: PackageCheck, color: '#0284c7' },
            { label: tr('Order scan'), hint: tr('Order # ya CN'), icon: ScanLine, color: '#7c3aed' },
            { label: tr('Har cheez scan'), hint: tr('Ghalat par screen rukti hai'), icon: Package, color: '#ea580c' },
            { label: 'Ready', hint: tr('Slip, label, courier'), icon: Send, color: '#16a34a' },
          ]}
          steps={[
            { icon: ScanLine, color: '#7c3aed', title: tr('Order kholein'), text: tr('Slip ka order number ya courier CN scan karein, ya neeche list me order dabayein.') },
            { icon: Package, color: '#ea580c', title: tr('Har cheez scan karein'), text: tr('Har piece ka barcode ya SKU scan karein. Ghalat ya zyada cheez par lal screen aati hai — Esc se band karein aur cheez nikal dein.') },
            { icon: Printer, color: '#16a34a', title: tr('Pack ho gaya'), text: tr('Sab poora hone par Enter ya "Pack ho gaya" — order Ready ho jata hai. Slip aur label yahin se print karein.') },
          ]}
          shortcuts={[['Enter', tr('scan / pack')], ['Esc', tr('warning band')], ['F2', tr('agla order')], ['G', tr('guide')]]}
        />
      )}
    </PageShell>
  );
}
