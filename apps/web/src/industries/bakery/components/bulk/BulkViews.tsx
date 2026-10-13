/**
 * Bulk order views: one order in the record, the kitchen list of what
 * booked orders need against stock, and analytics by month, kind and item.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Ban, Building2, CalendarDays, ChefHat, ChevronDown, Clock, Layers, MapPin, MessageCircle, Package, Pencil, Phone, Printer, Receipt, ShoppingBag,
  Undo2, Users, Wallet, Wrench,
} from 'lucide-react';
import { Button, Card, Skeleton } from '@/design-system/components';
import { PrintButton, type PrintDoc } from '@core/print';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { bulkOrdersApi, type BulkOrder } from '../../api/bulk-orders.api';
import type { BakeryOrderStatus } from '../../api/cake-orders.api';
import { AnalyticsSkeleton, CardTitle, LoadFailed, RankedBars, StatTile } from '../charts';
import { BULK_COMMITTED, BULK_KEY, BULK_PREV, bulkNext, bulkPrice, bulkTypeOf, dateTime, fmtQty, hoursTo, isClosed, keyLabel, leftText, statusOf, waLink } from '../meta';
import { bulkMessage, printBulkSlip } from '../orderSlip';
import { bulkLines } from './useBulkActions';

interface BulkRowActions {
  canManage: boolean;
  busyId?: string;
  shopName: string;
  next: (o: BulkOrder) => void;
  back: (o: BulkOrder) => void;
  pay: (o: BulkOrder) => void;
  cancel: (o: BulkOrder) => void;
}

export function BulkOrderRow({ o, a }: { o: BulkOrder; a: BulkRowActions }) {
  const [open, setOpen] = useState(false);
  const st = statusOf(o.status);
  const closed = isClosed(o.status);
  const left = hoursTo(o.eventDate);
  const late = !closed && left !== null && left < 0;
  const soon = !closed && left !== null && left >= 0 && left <= 72;
  const total = bulkPrice(o);
  const due = Math.max(total - o.paidAmount, 0);
  const noAdvance = !closed && BULK_COMMITTED.includes(o.status) && o.paidAmount <= 0;
  const next = bulkNext(o.status);
  const lines = bulkLines(o);
  const wa = waLink(o.contactPhone, bulkMessage(o, a.shopName));
  const busy = a.busyId === o.id;
  const type = bulkTypeOf(o.orderType);

  return (
    <li className={cn(closed && 'bg-slate-50/60')}>
      <div className="flex items-start gap-3 px-3 py-3 sm:px-4">
        <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg', late ? 'bg-rose-50' : soon ? 'bg-amber-50' : 'bg-slate-100')}>{type.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-semibold text-slate-900">{o.organizationName}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}>{st.label}</span>
            <span className="font-mono text-[0.6875rem] text-slate-400">{o.orderNumber}</span>
          </div>
          <p className="mt-0.5 truncate text-[0.8125rem] text-slate-600">{type.label}{o.totalGuests ? ` · ${o.totalGuests} mehmaan` : ''} · {lines.length} cheezein{o.contactPerson ? ` · ${o.contactPerson}` : ''}</p>
          <p className={cn('mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.75rem]', late ? 'font-semibold text-rose-700' : soon ? 'font-semibold text-amber-700' : 'text-slate-500')}>
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{closed ? dateTime(o.eventDate) : `${leftText(left)} · ${dateTime(o.eventDate)}`}</span>
            {o.venue && <span className="inline-flex items-center gap-1 font-normal text-slate-500"><MapPin className="h-3 w-3" />{o.venue}</span>}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold tabular-nums text-slate-900">{formatPKR(total)}</p>
          {o.status === 'DELIVERED' ? <p className="text-[0.6875rem] text-slate-500">{due > 0.5 ? `${formatPKR(due)} khate me` : 'Poora mila'}</p>
            : due > 0.5 ? <p className="text-[0.6875rem] font-semibold tabular-nums text-amber-700">{formatPKR(due)} baqi</p> : <p className="text-[0.6875rem] font-medium text-success-700">Poora mila</p>}
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Aur kaam" aria-expanded={open} className="mt-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} /></button>
      </div>
      {noAdvance && <p className="mx-3 mb-2 rounded-lg bg-rose-50 px-3 py-1.5 text-[0.75rem] text-rose-800 ring-1 ring-rose-200 sm:mx-4 sm:ml-[4.25rem]">Pakka order hai magar advance nahi aaya — itna saamaan bina advance ke na khareedein.</p>}
      {a.canManage && !closed && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-3 sm:px-4 sm:pl-[4.25rem]">
          {next && <Button size="sm" variant={next.to === 'DELIVER' ? 'success' : 'primary'} loading={busy} onClick={() => a.next(o)} leftIcon={next.to === 'DELIVER' ? <Receipt className="h-4 w-4" /> : <ChefHat className="h-4 w-4" />}>{next.label}</Button>}
          {due > 0.5 && <Button size="sm" variant="secondary" onClick={() => a.pay(o)} leftIcon={<Wallet className="h-4 w-4" />}>Paisa mila</Button>}
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-semibold text-success-700 ring-1 ring-success-200 hover:bg-success-50"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
        </div>
      )}
      {open && (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-[0.8125rem] sm:pl-[4.25rem]">
          {lines.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-xl bg-white ring-1 ring-slate-200">
              {lines.map((l, i) => <li key={i} className="flex justify-between gap-3 px-3 py-1.5"><span className="truncate text-slate-800">{l.name}{!l.productId && <span className="ml-1 text-[0.6875rem] text-amber-700">(maal se nahi juri)</span>}</span><span className="shrink-0 tabular-nums text-slate-600">{fmtQty(l.qty)} {l.unit ?? ''} × {formatPKR(l.rate)}</span></li>)}
            </ul>
          )}
          {(o.requiresDelivery || o.requiresSetup || o.specialInstructions) && (
            <p className="text-slate-600">{[o.requiresDelivery && `Pahunchana: ${o.deliveryAddress || o.venue || 'pata nahi likha'}`, o.requiresSetup && `Setup ${o.setupTime ?? ''}`, o.specialInstructions].filter(Boolean).join(' · ')}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => printBulkSlip(o, a.shopName)} leftIcon={<Printer className="h-4 w-4" />}>Parchi</Button>
            <Button size="sm" variant="secondary" onClick={() => printBulkSlip(o, a.shopName, true)} leftIcon={<ChefHat className="h-4 w-4" />}>Kitchen parchi</Button>
            <a href={`tel:${o.contactPhone}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Phone className="h-4 w-4" />{o.contactPhone}</a>
            {wa && (closed || !a.canManage) && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 font-semibold text-success-700 ring-1 ring-slate-200"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
            {a.canManage && !closed && <>
              <Link to={`/bakery/bulk-orders/${o.id}/edit`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Pencil className="h-4 w-4" />Badlein</Link>
              {BULK_PREV[o.status as BakeryOrderStatus] && <Button size="sm" variant="ghost" disabled={busy} onClick={() => a.back(o)} leftIcon={<Undo2 className="h-4 w-4" />}>Ek qadam peeche</Button>}
              <Button size="sm" variant="ghost" className="text-rose-700" onClick={() => a.cancel(o)} leftIcon={<Ban className="h-4 w-4" />}>Cancel</Button>
            </>}
          </div>
        </div>
      )}
    </li>
  );
}

/** What booked orders in the next days need, against stock, for the kitchen. */
export function BulkKitchen({ days }: { days: number }) {
  const ordersQ = useQuery({ queryKey: [BULK_KEY, 'open'], queryFn: () => bulkOrdersApi.list({ open: 'true' }) });
  const productsQ = useQuery({ queryKey: ['bakery-all-products'], queryFn: () => fetchAllProducts({ isActive: undefined }), staleTime: 60_000 });
  const data = useMemo(() => {
    const limit = days * 24;
    const orders = (ordersQ.data ?? []).filter((o) => BULK_COMMITTED.includes(o.status) && (hoursTo(o.eventDate) ?? 1e9) <= limit);
    const stock = new Map(((productsQ.data?.items ?? []) as Array<{ id: string; unit?: string; shopStock?: number; stock?: number }>).map((p) => [p.id, p]));
    const m = new Map<string, { key: string; name: string; unit?: string; qty: number; productId?: string; orders: string[] }>();
    for (const o of orders) {
      for (const l of bulkLines(o)) {
        const key = l.productId ?? `n:${l.name.trim().toLowerCase()}`;
        const e = m.get(key) ?? { key, name: l.name, unit: l.unit, qty: 0, productId: l.productId, orders: [] };
        e.qty += l.qty;
        if (!e.orders.includes(o.orderNumber)) e.orders.push(o.orderNumber);
        m.set(key, e);
      }
    }
    const items = [...m.values()].map((e) => {
      const p = e.productId ? stock.get(e.productId) : undefined;
      const have = p ? Number(p.shopStock ?? p.stock ?? 0) : null;
      return { ...e, unit: e.unit ?? p?.unit, have, make: have === null ? e.qty : Math.max(e.qty - have, 0) };
    }).sort((a, b) => b.make - a.make);
    return { orders, items };
  }, [ordersQ.data, productsQ.data, days]);

  if (ordersQ.isError && !ordersQ.data) return <LoadFailed what="Orders" retry={() => ordersQ.refetch()} />;
  if (!ordersQ.data) return <Skeleton className="h-64 rounded-3xl" />;
  if (!data.items.length) return (
    <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
      <ChefHat className="mx-auto h-10 w-10 text-slate-300" />
      <p className="mt-3 font-semibold text-slate-900">Agle {days} din me koi pakka order nahi</p>
      <p className="mt-1 text-sm text-slate-500">Sirf "Pakka", "Advance mila", "Ban raha hai" aur "Tayyar" wale order ginte hain.</p>
    </div>
  );
  const doc = (): PrintDoc => ({
    title: `Kya banana hai — agle ${days} din`,
    meta: [['Orders', String(data.orders.length)], ['Cheezein', String(data.items.length)]],
    sections: [
      { kind: 'table', columns: [{ label: 'Cheez' }, { label: 'Chahiye', align: 'right' }, { label: 'Stock', align: 'right', wideOnly: true }, { label: 'Banana', align: 'right' }],
        rows: data.items.map((i) => [i.name, `${fmtQty(i.qty)} ${i.unit ?? ''}`, i.have === null ? '—' : fmtQty(i.have), i.make > 0 ? `${fmtQty(i.make)} ${i.unit ?? ''}` : 'Kaafi']) },
      { kind: 'table', title: 'Orders', columns: [{ label: 'Order' }, { label: 'Kis ka' }, { label: 'Event', align: 'right' }],
        rows: data.orders.map((o) => [o.orderNumber, o.organizationName, dateTime(o.eventDate)]) },
    ],
  });
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
        <p className="text-[0.8125rem] text-slate-600">{data.orders.length} pakke orders · {data.items.filter((i) => i.make > 0).length} cheezein banani hain</p>
        <PrintButton doc={doc} size="sm" label="Kitchen ke liye" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-[0.8125rem]">
          <thead>
            <tr className="bg-slate-50/70 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5">Cheez</th><th className="px-2 py-2.5 text-right">Chahiye</th><th className="px-2 py-2.5 text-right">Stock me</th><th className="px-2 py-2.5 text-right">Banana hai</th><th className="px-4 py-2.5">Orders</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.items.map((i) => (
              <tr key={i.key} className={cn(i.make <= 0 && 'opacity-60')}>
                <td className="px-4 py-2 font-medium text-slate-900">{i.name}{!i.productId && <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-amber-800">Maal se nahi juri</span>}</td>
                <td className="px-2 py-2 text-right tabular-nums">{fmtQty(i.qty)} {i.unit ?? ''}</td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-500">{i.have === null ? '—' : fmtQty(i.have)}</td>
                <td className={cn('px-2 py-2 text-right font-semibold tabular-nums', i.make > 0 ? 'text-amber-700' : 'text-success-700')}>{i.make > 0 ? `${fmtQty(i.make)} ${i.unit ?? ''}` : 'Kaafi hai'}</td>
                <td className="px-4 py-2 text-[0.75rem] text-slate-500">{i.orders.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-1 border-t border-slate-100 px-4 py-3 text-[0.75rem] text-slate-600">
        {data.orders.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center gap-x-2">
            <span className="font-semibold text-slate-900">{o.orderNumber}</span> {o.organizationName} · <span className="text-amber-700">{dateTime(o.eventDate)}</span>
            {o.requiresDelivery && <span className="inline-flex items-center gap-1"><ShoppingBag className="h-3 w-3" />pahunchana</span>}
            {o.requiresSetup && <span className="inline-flex items-center gap-1"><Wrench className="h-3 w-3" />setup {o.setupTime ?? ''}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BulkAnalytics({ range, onType }: { range: { from: string; to: string } | null; onType: (t: string) => void }) {
  const theme = useChartTheme();
  const { sales } = useMasked();
  const q = useQuery({ queryKey: [BULK_KEY, 'summary', range], queryFn: () => bulkOrdersApi.summary(range ?? undefined), placeholderData: (p) => p });
  const d = q.data;
  if (q.isError && !d) return <LoadFailed what="Analytics" retry={() => q.refetch()} />;
  if (!d) return <AnalyticsSkeleton />;
  const t = d.totals;
  const months = d.byMonth.map((b) => ({ ...b, label: keyLabel(b.key) }));
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={ShoppingBag} label="Orders" value={t.orders} sub={`${t.delivered} poore · ${t.cancelled} cancel`} />
        <StatTile icon={Wallet} label="Kul rakam" value={sales(t.value)} sub={`Mila ${sales(t.collected)}`} tone="green" />
        <StatTile icon={Layers} label="Ausat order" value={sales(t.avgOrder)} sub="Poore hue orders ka" tone="violet" />
        <StatTile icon={Users} label="Mehmaan" value={t.guests.toLocaleString('en-PK')} sub="Sab orders me" tone="sky" />
      </div>
      <Card className="rounded-2xl" title={<CardTitle icon={CalendarDays}>Har mahine</CardTitle>} description="Event ki tareekh se">
        {!months.length ? <p className="py-10 text-center text-sm text-slate-500">Is muddat me koi order nahi</p> : (
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <Tooltip formatter={(v) => [formatPKR(Number(v)), 'Rakam']} {...theme.tooltip} />
                <Bar dataKey="value" fill={theme.primary} radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<CardTitle icon={Building2}>Qisam</CardTitle>} description="Shadi, daftar, school — click karein to sirf woh">
          <RankedBars onPick={onType} rows={d.byType.map((b) => ({ key: b.key, label: `${bulkTypeOf(b.key).emoji} ${bulkTypeOf(b.key).label}`, value: b.value, display: `${b.count} · ${sales(b.value)}` }))} />
        </Card>
        <Card className="rounded-2xl" title={<CardTitle icon={Package}>Sab se zyada kya mangwaya</CardTitle>} description="Cheezon ki ginti">
          <RankedBars rows={d.topItems.map((b) => ({ key: b.key, label: b.key, value: b.qty, display: `${fmtQty(b.qty)} · ${sales(b.value)}`, color: '#d97706' }))} />
        </Card>
      </div>
    </div>
  );
}
