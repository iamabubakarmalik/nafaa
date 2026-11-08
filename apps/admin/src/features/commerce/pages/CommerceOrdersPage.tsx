/**
 * Orders monitor (read only): find any online order across shops by order
 * number, phone or tracking number (CN) and see its timeline; plus the orders
 * stuck across the platform (pending over 24 hours, dispatched over 5 days).
 */

import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { adminCommerceApi, type OnlineOrderRow } from '@/api/admin-commerce.api';
import { formatPKRFull } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Card, CommerceHero, dateTime, Drawer, Empty, enumLabel, kindLabel, OrderStatus, Pill, Stat, tableHeadCls, tdCls, thCls, when } from '../components/CommerceUi';

const orderNo = (o: OnlineOrderRow) => String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#*/, '#');

export default function CommerceOrdersPage() {
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'pending' | 'inTransit'>('pending');
  const [open, setOpen] = useState<string | null>(null);

  const found = useQuery({ queryKey: ['admin-commerce-order-search', q], queryFn: () => adminCommerceApi.searchOrders(q), enabled: q.length >= 3 });
  const stuck = useQuery({ queryKey: ['admin-commerce-stuck'], queryFn: adminCommerceApi.stuckOrders });
  const s = stuck.data;

  return (
    <div className="space-y-6">
      <CommerceHero title="Orders monitor" subtitle="Find any online order in any shop, and see orders stuck across the platform. Read only: shops act on their own orders." />

      <Card title="Find an order" subtitle="Order number, customer phone or courier tracking number (CN)">
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); setQ(input.trim()); }}>
          <label className="relative min-w-[16rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="#1065, 03001234567 or a CN"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
          </label>
          <button type="submit" disabled={input.trim().length < 3} className="h-10 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50">Search</button>
        </form>
        {q.length >= 3 && (
          <div className="-mx-5 -mb-5 mt-4 border-t border-slate-100">
            {found.isLoading ? <Empty>Searching…</Empty> : found.error ? <Empty>Search failed.</Empty> : !found.data?.orders.length ? <Empty>No order matches “{q}”.</Empty>
              : <OrdersTable rows={found.data.orders} onOpen={setOpen} />}
          </div>
        )}
      </Card>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pending over 24 hours" value={s?.counts.pending ?? 0} tone={s?.counts.pending ? 'amber' : undefined} hint="Not confirmed yet" />
        <Stat label={`Dispatched over ${s?.rules.dispatchedDays ?? 5} days`} value={s?.counts.inTransit ?? 0} tone={s?.counts.inTransit ? 'rose' : undefined} hint="Not delivered or returned" />
        <Stat label="Shops affected" value={s?.byTenant.length ?? 0} />
        <Stat label="Looking back" value={`${s?.rules.lookbackDays ?? 60} days`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card title="Stuck orders by shop" className="lg:col-span-1">
          {!s?.byTenant.length ? <Empty>Nothing stuck.</Empty> : (
            <ul className="-mx-5 -mb-5 divide-y divide-slate-100 text-sm">
              {s.byTenant.map((t) => (
                <li key={t.tenantId} className="flex items-center justify-between gap-2 px-5 py-2.5">
                  <Link to={`/tenants/${t.tenantId}`} className="truncate font-semibold text-slate-900 hover:text-indigo-700">{t.name}</Link>
                  <span className="whitespace-nowrap text-xs text-slate-600">{t.pending} pending · {t.inTransit} in transit</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-0 lg:col-span-2">
          <div className="flex gap-1 border-b border-slate-100 p-3">
            {([['pending', `Pending over 24h (${s?.counts.pending ?? 0})`], ['inTransit', `Dispatched over ${s?.rules.dispatchedDays ?? 5} days (${s?.counts.inTransit ?? 0})`]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setTab(k)}
                className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold', tab === k ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100')}>{l}</button>
            ))}
          </div>
          {stuck.isLoading ? <Empty>Loading…</Empty> : stuck.error ? <Empty>Could not load stuck orders.</Empty>
            : !(s?.[tab].length) ? <Empty>Nothing stuck here.</Empty> : <OrdersTable rows={s[tab]} onOpen={setOpen} showAge={tab} />}
        </Card>
      </section>

      <OrderDrawer id={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function OrdersTable({ rows, onOpen, showAge }: { rows: OnlineOrderRow[]; onOpen: (id: string) => void; showAge?: 'pending' | 'inTransit' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[52rem] text-sm">
        <thead className={tableHeadCls}>
          <tr>
            <th className={thCls}>Order</th><th className={thCls}>Shop · channel</th><th className={thCls}>Customer</th>
            <th className={thCls}>Status</th><th className={thCls}>Courier</th><th className={`${thCls} text-right`}>Total</th>
            <th className={thCls}>{showAge === 'inTransit' ? 'Dispatched' : 'Received'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((o) => (
            <tr key={o.id} onClick={() => onOpen(o.id)} className="cursor-pointer hover:bg-slate-50/80">
              <td className={`${tdCls} font-semibold text-slate-900`}>{orderNo(o)}{o.deletedAt && <span className="ml-1 text-xs font-normal text-rose-600">deleted</span>}</td>
              <td className={tdCls}><div className="text-slate-900">{o.tenantName}</div><div className="text-xs text-slate-500">{o.integration.displayName} · {kindLabel(o.integration.type)}</div></td>
              <td className={tdCls}><div className="text-slate-900">{o.customerName}</div><div className="text-xs text-slate-500">{o.customerPhone ?? '—'}{o.customerCity ? ` · ${o.customerCity}` : ''}</div></td>
              <td className={tdCls}><OrderStatus status={o.orderStatus} />{o.stage && <div className="mt-1 text-xs text-slate-500">{enumLabel(o.stage.replace(/^custom:/, ''))}</div>}</td>
              <td className={tdCls}><div className="text-slate-700">{o.courierCode ?? o.courierName ?? '—'}</div>{o.trackingNumber && <div className="font-mono text-xs text-slate-500">{o.trackingNumber}</div>}</td>
              <td className={`${tdCls} text-right tabular-nums`}>{formatPKRFull(Number(o.total))}</td>
              <td className={`${tdCls} whitespace-nowrap text-slate-700`}>{when(showAge === 'inTransit' ? o.dispatchedAt : o.receivedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrderDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: o, isLoading, error } = useQuery({ queryKey: ['admin-commerce-order', id], queryFn: () => adminCommerceApi.order(id!), enabled: !!id });
  const steps: Array<[string, string | null]> = o ? [
    ['Received', o.receivedAt], ['Confirmed', o.acceptedAt], ['Courier booked', o.courierBookedAt], ['Dispatched', o.dispatchedAt],
    ['Delivered', o.deliveredAt], ['Returned', o.returnedAt], ['Cancelled', o.cancelledAt], ['COD settled', o.codSettledAt],
  ] : [];
  return (
    <Drawer open={!!id} onClose={onClose} title={o ? `Order ${orderNo(o)}` : 'Order'} subtitle={o ? `${o.tenant?.name ?? ''} · ${o.integration.displayName}` : undefined}>
      {isLoading ? <Empty>Loading…</Empty> : error || !o ? <Empty>Could not load this order.</Empty> : (
        <>
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatus status={o.orderStatus} />
              {o.stage && <Pill tone="amber">{enumLabel(o.stage.replace(/^custom:/, ''))}</Pill>}
              <Pill tone="indigo">{kindLabel(o.integration.type)}</Pill>
              {o.source && <Pill>Source: {enumLabel(o.source)}</Pill>}
              {o.deletedAt && <Pill tone="rose">Deleted by shop</Pill>}
              {o.tenant && <Link to={`/tenants/${o.tenant.id}`} className="ml-auto text-xs font-semibold text-indigo-700 hover:underline">Open shop</Link>}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Info label="Customer" value={o.customerName} />
              <Info label="Phone" value={o.customerPhone ?? '—'} />
              <Info label="City" value={o.customerCity ?? '—'} />
              <Info label="Total" value={formatPKRFull(Number(o.total))} />
              <Info label="Payment" value={`${o.paymentMethod ?? '—'} · ${enumLabel(o.paymentStatus)}`} />
              <Info label="Bill" value={o.sale ? <Link to={`/sales?search=${encodeURIComponent(o.sale.saleNumber)}`} className="text-indigo-700 hover:underline">{o.sale.saleNumber} · {enumLabel(o.sale.status)}</Link> : 'No bill yet'} />
              <Info label="Courier" value={o.courierCode ?? o.courierName ?? '—'} />
              <Info label="Tracking (CN)" value={o.trackingNumber ?? '—'} />
              <Info label="Courier status" value={o.shipment?.status ? enumLabel(o.shipment.status) : o.courierStatus ?? '—'} />
            </dl>
            {o.autoBookError && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">Courier booking: {o.autoBookError}</p>}
            {(o.cancelReason || o.returnReason) && <p className="mt-2 text-xs text-slate-600">{o.cancelReason ? `Cancel reason: ${o.cancelReason}` : `Return reason: ${o.returnReason}`}</p>}
          </Card>

          <Card title="Milestones">
            <ol className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {steps.map(([label, at]) => (
                <li key={label} className={cn('rounded-xl border px-3 py-2', at ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 text-slate-400')}>
                  <div className="text-xs font-semibold">{label}</div>
                  <div className="text-xs">{at ? dateTime(at) : '—'}</div>
                </li>
              ))}
            </ol>
          </Card>

          <Card title="Timeline" subtitle="Every change recorded on the order">
            {!o.timeline.length ? <Empty>No timeline entries.</Empty> : (
              <ol className="space-y-3 border-l-2 border-slate-200 pl-4 text-sm">
                {[...o.timeline].reverse().map((e, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-2 ring-white" />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {e.type ? enumLabel(String(e.type)) : typeof e.to === 'string' ? `${typeof e.from === 'string' ? `${enumLabel(e.from)} → ` : ''}${enumLabel(e.to)}` : 'Update'}
                      </span>
                      {typeof e.byName === 'string' && <span className="text-xs text-slate-500">by {e.byName}</span>}
                      <span className="ml-auto text-xs text-slate-500">{dateTime(e.at as string | undefined)}</span>
                    </div>
                    {!!(e.note || e.detail) && <p className="text-xs text-slate-600">{String(e.note ?? e.detail)}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </>
      )}
    </Drawer>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-slate-900">{value}</dd>
    </div>
  );
}
