/**
 * Orders monitor (read only): find any online order across shops by order
 * number, phone or tracking number (CN) and see its timeline; plus the orders
 * stuck across the platform (pending over 24 hours, dispatched over 5 days).
 * Both lists are paged on the server.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock, Lightbulb, Search, Truck } from 'lucide-react';
import { Card, FilterBar, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, Tabs, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminCommerceApi, type OnlineOrderRow } from '@/api/admin-commerce.api';
import { formatPKRFull } from '@/lib/format';
import { cn } from '@/lib/cn';
import { ListCard, useListParams } from '@/ui';
import { Empty, num } from '@/features/shared/kit';
import { dateTime, Drawer, enumLabel, Info, kindLabel, OrderStatus, Pill, when, Card as Panel } from '../components/CommerceUi';

const orderNo = (o: OnlineOrderRow) => String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#*/, '#');

export default function CommerceOrdersPage() {
  const guide = usePageGuide();
  const list = useListParams({}, { limit: 25 });
  const q = list.debouncedSearch;
  const [tab, setTab] = useState<'pending' | 'inTransit'>('pending');
  const [stuckPage, setStuckPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);

  const found = useQuery({
    queryKey: ['admin-commerce-order-search', q, list.page, list.limit],
    queryFn: () => adminCommerceApi.searchOrders(q, list.page, list.limit),
    enabled: q.length >= 3, placeholderData: (prev) => prev,
  });
  const stuck = useQuery({ queryKey: ['admin-commerce-stuck', stuckPage], queryFn: () => adminCommerceApi.stuckOrders(stuckPage, 25), placeholderData: (prev) => prev });
  const s = stuck.data;
  const stuckRows = s?.[tab] ?? [];
  const searching = q.length >= 3;

  return (
    <PageShell>
      <PageHero
        title="Orders monitor"
        chip="Read only"
        busy={found.isFetching || stuck.isFetching}
        loading={stuck.isLoading}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={s ? [
          { label: 'Pending over 24 hours', value: num(s.counts.pending), hint: 'Not confirmed yet' },
          { label: `Dispatched over ${s.rules.dispatchedDays} days`, value: num(s.counts.inTransit), hint: 'Not delivered or returned' },
          { label: 'Shops affected', value: num(s.byTenant.length) },
          { label: 'Looking back', value: `${s.rules.lookbackDays} days` },
        ] : undefined}
      />

      <FilterBar search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Find an order: #1065, customer phone or courier tracking number (CN)" />} />

      {searching && (
        <ListCard
          title={`Orders matching “${q}”`}
          loading={found.isLoading}
          empty={!!found.error || !found.data?.orders.length}
          emptyIcon={<Search className="h-6 w-6" />}
          emptyTitle={found.error ? 'Search failed' : 'No order matches'}
          emptyText={found.error ? 'Try again in a moment.' : 'Check the number, phone or tracking number.'}
          page={list.page} limit={list.limit} total={found.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
        >
          <OrdersTable rows={found.data?.orders ?? []} onOpen={setOpen} />
        </ListCard>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <Card flush title="Stuck orders by shop" className="lg:col-span-1">
          {!s?.byTenant.length ? <Empty>Nothing stuck.</Empty> : (
            <ul className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto text-[0.875rem]">
              {s.byTenant.map((t) => (
                <li key={t.tenantId} className="flex items-center justify-between gap-2 px-4 py-2.5 sm:px-5">
                  <Link to={`/tenants/${t.tenantId}`} className="truncate font-semibold text-slate-900 hover:text-brand-700">{t.name}</Link>
                  <span className="whitespace-nowrap text-[0.75rem] text-slate-600">{t.pending} pending · {t.inTransit} in transit</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="space-y-3 lg:col-span-2">
          <Tabs value={tab} onChange={(v) => { setTab(v); setStuckPage(1); }} label="Stuck orders"
            items={[
              { value: 'pending', label: 'Pending over 24 hours', count: s?.counts.pending ?? 0, tone: s?.counts.pending ? 'warning' : 'default' },
              { value: 'inTransit', label: `Dispatched over ${s?.rules.dispatchedDays ?? 5} days`, count: s?.counts.inTransit ?? 0, tone: s?.counts.inTransit ? 'danger' : 'default' },
            ]} />
          <ListCard
            loading={stuck.isLoading}
            empty={!!stuck.error || !stuckRows.length}
            emptyIcon={<Clock className="h-6 w-6" />}
            emptyTitle={stuck.error ? 'Could not load stuck orders' : 'Nothing stuck here'}
            page={stuckPage} limit={25} total={s?.counts[tab]} onPage={setStuckPage}
          >
            <OrdersTable rows={stuckRows} onOpen={setOpen} showAge={tab} />
          </ListCard>
        </div>
      </section>

      <OrderDrawer id={open} onClose={() => setOpen(null)} />

      {guide.isOpen && (
        <PageGuide
          title="Orders monitor"
          description="Look up any online order in any shop and see which orders are stuck. Shops act on their own orders; nothing is changed here."
          flowTitle="When an order counts as stuck"
          flow={[
            { label: 'Received', hint: 'From a channel', icon: Search, color: '#4f46e5' },
            { label: 'Pending 24h+', hint: 'Shop has not confirmed', icon: Clock, color: '#d97706' },
            { label: 'Dispatched 5d+', hint: 'No delivery or return', icon: Truck, color: '#e11d48' },
          ]}
          steps={[
            { icon: Search, color: '#4f46e5', title: 'Find an order', text: 'Type at least 3 characters: an order number, a customer phone or a courier tracking number (CN).' },
            { icon: AlertTriangle, color: '#d97706', title: 'Check stuck orders', text: 'Use the tabs to switch between orders waiting for a shop and orders waiting for a courier.' },
            { icon: Truck, color: '#059669', title: 'Open an order', text: 'Click a row for its milestones and full timeline.' },
          ]}
          tips={['Stuck orders look back 60 days.', 'Click a shop in the list to open its profile.']}
          shortcuts={[['/', 'Search'], ['↑ ↓', 'Move between rows'], ['Enter', 'Open order'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

function OrdersTable({ rows, onOpen, showAge }: { rows: OnlineOrderRow[]; onOpen: (id: string) => void; showAge?: 'pending' | 'inTransit' }) {
  return (
    <Table minWidth="52rem">
      <THead>
        <Tr>
          <Th>Order</Th><Th>Shop and channel</Th><Th>Customer</Th><Th>Status</Th><Th>Courier</Th><Th align="right">Total</Th>
          <Th>{showAge === 'inTransit' ? 'Dispatched' : 'Received'}</Th>
        </Tr>
      </THead>
      <TBody>
        {rows.map((o) => (
          <Tr key={o.id} interactive onClick={() => onOpen(o.id)}>
            <Td className="font-semibold text-slate-900">{orderNo(o)}{o.deletedAt && <span className="ms-1 text-[0.75rem] font-normal text-rose-600">deleted</span>}</Td>
            <Td><div className="text-slate-900">{o.tenantName}</div><div className="text-[0.75rem] text-slate-500">{o.integration.displayName} · {kindLabel(o.integration.type)}</div></Td>
            <Td><div className="text-slate-900">{o.customerName}</div><div className="text-[0.75rem] text-slate-500">{o.customerPhone ?? '—'}{o.customerCity ? ` · ${o.customerCity}` : ''}</div></Td>
            <Td><OrderStatus status={o.orderStatus} />{o.stage && <div className="mt-1 text-[0.75rem] text-slate-500">{enumLabel(o.stage.replace(/^custom:/, ''))}</div>}</Td>
            <Td><div className="text-slate-700">{o.courierCode ?? o.courierName ?? '—'}</div>{o.trackingNumber && <div className="font-mono text-[0.75rem] text-slate-500">{o.trackingNumber}</div>}</Td>
            <Td align="right">{formatPKRFull(Number(o.total))}</Td>
            <Td className="whitespace-nowrap">{when(showAge === 'inTransit' ? o.dispatchedAt : o.receivedAt)}</Td>
          </Tr>
        ))}
      </TBody>
    </Table>
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
          <Panel>
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatus status={o.orderStatus} />
              {o.stage && <Pill tone="amber">{enumLabel(o.stage.replace(/^custom:/, ''))}</Pill>}
              <Pill tone="indigo">{kindLabel(o.integration.type)}</Pill>
              {o.source && <Pill>Source: {enumLabel(o.source)}</Pill>}
              {o.deletedAt && <Pill tone="rose">Deleted by shop</Pill>}
              {o.tenant && <Link to={`/tenants/${o.tenant.id}`} className="ml-auto text-[0.75rem] font-semibold text-brand-700 hover:underline">Open shop</Link>}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Info label="Customer" value={o.customerName} />
              <Info label="Phone" value={o.customerPhone ?? '—'} />
              <Info label="City" value={o.customerCity ?? '—'} />
              <Info label="Total" value={formatPKRFull(Number(o.total))} />
              <Info label="Payment" value={`${o.paymentMethod ?? '—'} · ${enumLabel(o.paymentStatus)}`} />
              <Info label="Bill" value={o.sale ? <Link to={`/sales?search=${encodeURIComponent(o.sale.saleNumber)}`} className="text-brand-700 hover:underline">{o.sale.saleNumber} · {enumLabel(o.sale.status)}</Link> : 'No bill yet'} />
              <Info label="Courier" value={o.courierCode ?? o.courierName ?? '—'} />
              <Info label="Tracking (CN)" value={o.trackingNumber ?? '—'} />
              <Info label="Courier status" value={o.shipment?.status ? enumLabel(o.shipment.status) : o.courierStatus ?? '—'} />
            </dl>
            {o.autoBookError && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-800">Courier booking: {o.autoBookError}</p>}
            {(o.cancelReason || o.returnReason) && <p className="mt-2 text-[0.75rem] text-slate-600">{o.cancelReason ? `Cancel reason: ${o.cancelReason}` : `Return reason: ${o.returnReason}`}</p>}
          </Panel>

          <Panel title="Milestones">
            <ol className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {steps.map(([label, at]) => (
                <li key={label} className={cn('rounded-xl border px-3 py-2', at ? 'border-brand-200 bg-brand-50' : 'border-slate-200 text-slate-400')}>
                  <div className="text-[0.75rem] font-semibold">{label}</div>
                  <div className="text-[0.75rem]">{at ? dateTime(at) : '—'}</div>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Timeline" subtitle="Every change recorded on the order">
            {!o.timeline.length ? <Empty>No timeline entries.</Empty> : (
              <ol className="space-y-3 border-l-2 border-slate-200 pl-4 text-sm">
                {[...o.timeline].reverse().map((e, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-white" />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {e.type ? enumLabel(String(e.type)) : typeof e.to === 'string' ? `${typeof e.from === 'string' ? `${enumLabel(e.from)} → ` : ''}${enumLabel(e.to)}` : 'Update'}
                      </span>
                      {typeof e.byName === 'string' && <span className="text-[0.75rem] text-slate-500">by {e.byName}</span>}
                      <span className="ml-auto text-[0.75rem] text-slate-500">{dateTime(e.at as string | undefined)}</span>
                    </div>
                    {!!(e.note || e.detail) && <p className="text-[0.75rem] text-slate-600">{String(e.note ?? e.detail)}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </>
      )}
    </Drawer>
  );
}


