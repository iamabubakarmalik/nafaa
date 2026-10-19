/**
 * End of the business day for a restaurant: orders still open (each one a
 * bill not made yet), cash still with riders, and the day's money by order
 * type, waiter and table. Money comes from the day's bills, so the total is
 * the day book's net sale; a mismatch would show at once.
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bike, CheckCircle2, Printer } from 'lucide-react';
import { Button, Skeleton } from '@/design-system/components';
import { usePrinter, type PrintDoc } from '@core/print';
import { formatPKR } from '@core/lib/format';
import { ordersApi, type DayClose } from '../api/orders.api';
import { MODE_META, STATUS_META, duration, minutesSince } from '../lib/orderMeta';

const modeLabel = (k: string) => (k === 'COUNTER' ? 'Counter (bina order)' : MODE_META[k as keyof typeof MODE_META]?.label ?? k);

function closeDoc(d: DayClose): PrintDoc {
  const rows = (list: DayClose['byMode'], label: (k: string, l: string) => string) => list.map((r) => [label(r.key, r.label), String(r.bills), formatPKR(r.amount)]);
  return {
    title: 'Din band — restaurant',
    subtitle: d.date,
    sections: [
      { kind: 'rows', rows: [
        { label: 'Net sale (day book)', value: formatPKR(d.figures.net), strong: true },
        { label: 'Bill', value: String(d.figures.bills) },
        { label: 'Cash + online mila', value: formatPKR(d.figures.cashIn) },
        { label: 'Udhaar', value: formatPKR(d.figures.credit) },
        { label: 'Discount', value: formatPKR(d.figures.discount) },
        { label: 'Service / tax / delivery', value: formatPKR(d.figures.service) },
        { label: 'Return', value: formatPKR(d.figures.refunds) },
        { label: 'Khule order', value: `${d.openOrders.length} · ${formatPKR(d.openAmount)}` },
        { label: 'Void dishes', value: `${d.voids.count} · ${formatPKR(d.voids.amount)}` },
      ] },
      { kind: 'table', title: 'Order type', columns: [{ label: 'Type' }, { label: 'Bill', align: 'right' }, { label: 'Amount', align: 'right' }], rows: rows(d.byMode, (k) => modeLabel(k)) },
      { kind: 'table', title: 'Waiter', columns: [{ label: 'Waiter' }, { label: 'Bill', align: 'right' }, { label: 'Amount', align: 'right' }], rows: rows(d.byWaiter, (_k, l) => l) },
      { kind: 'table', title: 'Table', columns: [{ label: 'Table' }, { label: 'Bill', align: 'right' }, { label: 'Amount', align: 'right' }], rows: rows(d.byTable, (_k, l) => l) },
    ],
  };
}

export function DayClosePanel({ date }: { date?: string }) {
  const { print } = usePrinter();
  const { data: d, isLoading } = useQuery({ queryKey: ['restaurant-day-close', date], queryFn: () => ordersApi.dayClose(date), refetchInterval: 60_000 });
  if (isLoading || !d) return <div className="grid gap-4 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}</div>;
  const matches = Math.abs(d.groupedTotal - d.figures.net) < 0.01;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <Figure label="Net sale (day book)" value={formatPKR(d.figures.net)} strong />
          <Figure label="Bill" value={String(d.figures.bills)} />
          <Figure label="Mila" value={formatPKR(d.figures.cashIn)} />
          <Figure label="Udhaar" value={formatPKR(d.figures.credit)} />
          <Figure label="Discount" value={formatPKR(d.figures.discount)} />
          {d.tips > 0 && <Figure label="Tip" value={formatPKR(d.tips)} />}
        </div>
        <Button variant="secondary" size="sm" onClick={() => print(closeDoc(d))}><Printer className="h-4 w-4" />Print</Button>
      </div>
      {!matches && (
        <p className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-[0.8125rem] font-medium text-rose-800 ring-1 ring-rose-100">
          <AlertTriangle className="h-4 w-4" /> Neeche ka jor ({formatPKR(d.groupedTotal)}) day book ({formatPKR(d.figures.net)}) se nahi milta — support ko batayein.
        </p>
      )}

      {d.openOrders.length > 0 ? (
        <section className="overflow-hidden rounded-3xl bg-amber-50 ring-1 ring-amber-200">
          <header className="flex items-center gap-2 px-4 py-3 text-[0.875rem] font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" /> {d.openOrders.length} order abhi khule hain · {formatPKR(d.openAmount)} — din band karne se pehle payment lein ya cancel karein
          </header>
          <ul className="divide-y divide-amber-100 bg-white">
            {d.openOrders.map((o) => (
              <li key={o.id}>
                <Link to={`/restaurant/orders/${o.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50/60">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.875rem] font-semibold text-slate-900">{o.table ? `Table ${o.table.tableNumber}` : o.customerName || MODE_META[o.mode].label} · {o.orderNumber}</span>
                    <span className="block text-[0.75rem] text-slate-500">{STATUS_META[o.status].label} · {duration(minutesSince(o.createdAt))} se{o.delivery?.rider ? ` · rider ${o.delivery.rider.name}` : ''}</span>
                  </span>
                  <span className="text-[0.875rem] font-bold tabular-nums">{formatPKR(o.due)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-[0.8125rem] font-medium text-emerald-800 ring-1 ring-emerald-100"><CheckCircle2 className="h-4 w-4" /> Koi order khula nahi — din band ho sakta hai</p>
      )}

      {d.riderCash.length > 0 && (
        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <h3 className="flex items-center gap-2 text-[0.875rem] font-semibold text-slate-900"><Bike className="h-4 w-4 text-violet-600" /> Riders ke paas cash</h3>
          <ul className="mt-2 space-y-1 text-[0.8125rem]">
            {d.riderCash.map((r) => <li key={r.riderId} className="flex justify-between"><span>{r.name} · {r.orders} order</span><b className="tabular-nums">{formatPKR(r.amount)}</b></li>)}
          </ul>
          <Link to="/restaurant/delivery" className="mt-2 inline-block text-[0.8125rem] font-semibold text-brand-700 hover:underline">Cash wasool karein →</Link>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Breakdown title="Order type" rows={d.byMode.map((r) => ({ ...r, label: modeLabel(r.key) }))} total={d.figures.net} />
        <Breakdown title="Waiter" rows={d.byWaiter} total={d.figures.net} />
        <Breakdown title="Table" rows={d.byTable} total={d.figures.net} empty="Aaj kisi table ka bill nahi" />
      </div>

      {(d.voids.count > 0 || d.cancelled.count > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
            <h3 className="text-[0.875rem] font-semibold text-slate-900">Void dishes · {d.voids.count} · {formatPKR(d.voids.amount)}</h3>
            {d.voids.cookedAmount > 0 && <p className="text-[0.75rem] text-rose-600">{formatPKR(d.voids.cookedAmount)} ki dishes ban chuki thin (zaya)</p>}
            <ul className="mt-2 max-h-60 space-y-1 overflow-y-auto text-[0.8125rem]">
              {d.voids.items.map((v) => (
                <li key={v.id} className="flex justify-between gap-2"><Link to={`/restaurant/orders/${v.order.id}`} className="truncate hover:underline">{v.quantity}× {v.product?.name} · {v.order.orderNumber}</Link><span className="shrink-0 text-slate-500">{v.returnReason}</span></li>
              ))}
            </ul>
          </section>
          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
            <h3 className="text-[0.875rem] font-semibold text-slate-900">Cancel orders · {d.cancelled.count} · {formatPKR(d.cancelled.amount)}</h3>
            <ul className="mt-2 max-h-60 space-y-1 overflow-y-auto text-[0.8125rem]">
              {d.cancelled.orders.map((c) => (
                <li key={c.id} className="flex justify-between gap-2"><Link to={`/restaurant/orders/${c.id}`} className="hover:underline">{c.orderNumber} · {formatPKR(c.total)}</Link><span className="truncate text-slate-500">{c.cancellationReason}</span></li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div><p className="text-[0.75rem] text-slate-500">{label}</p><p className={strong ? 'text-[1.25rem] font-bold tabular-nums text-slate-900' : 'text-[0.9375rem] font-semibold tabular-nums text-slate-800'}>{value}</p></div>;
}

function Breakdown({ title, rows, total, empty = 'Abhi kuch nahi' }: { title: string; rows: Array<{ key: string; label: string; bills: number; amount: number }>; total: number; empty?: string }) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <h3 className="text-[0.875rem] font-semibold text-slate-900">{title}</h3>
      {!rows.length ? <p className="mt-3 text-[0.8125rem] text-slate-500">{empty}</p> : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => {
            const pct = total > 0 ? Math.max(0, Math.min(100, (r.amount / total) * 100)) : 0;
            return (
              <li key={r.key}>
                <div className="flex justify-between text-[0.8125rem]"><span className="truncate text-slate-700">{r.label} <span className="text-slate-400">· {r.bills} bill</span></span><b className="tabular-nums">{formatPKR(r.amount)}</b></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} /></div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
