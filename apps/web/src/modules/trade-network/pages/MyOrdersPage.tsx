/**
 * The shop's orders to its suppliers, with each order's journey (sent,
 * approved, invoice, on the way, delivered), the invoice lines and the
 * purchase it became.
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, ClipboardList, PackageCheck, RefreshCw, ShoppingCart, X } from 'lucide-react';
import { Button, Modal, PageHero, PageShell, Skeleton, ViewTabs, confirmDialog, heroIconButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { Empty, Fact, Pill } from '@modules/distribution/components/parts';
import { useMoney } from '@modules/distribution/hooks/useDistribution';
import { dayTime } from '@modules/distribution/lib/meta';
import { TRADE_KEY, tradeApi, tradeError, type TradeOrderDetail, type TradeOrderRow } from '../api/trade.api';
import { ORDER_STATUS, RECEIVE_STATE, STEPS, packText, stepIndex } from '../lib/meta';
import { BizAvatar } from '../components/shared';

type Tab = 'OPEN' | 'DONE' | 'ALL';
const TAB_STATUS: Record<Tab, string | undefined> = { OPEN: 'BOOKED,APPROVED,INVOICED,LOADED', DONE: 'DELIVERED,PARTIAL,RETURNED,CANCELLED', ALL: undefined };

export default function MyOrdersPage() {
  const qc = useQueryClient();
  const money = useMoney();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('OPEN');
  const [page, setPage] = useState(1);
  const openId = params.get('id');
  useEffect(() => setPage(1), [tab]);
  const q = useQuery({
    queryKey: [TRADE_KEY, 'orders', tab, page],
    queryFn: () => tradeApi.orders({ status: TAB_STATUS[tab], page, limit: 30 }),
    placeholderData: keepPreviousData, refetchInterval: 60_000,
  });
  const rows = q.data?.orders ?? [];
  const c = q.data?.counts ?? {};
  const open = ['BOOKED', 'APPROVED', 'INVOICED', 'LOADED'].reduce((s, k) => s + (c[k] ?? 0), 0);

  return (
    <PageShell>
      <PageHero
        back="/network" backLabel="Suppliers"
        title="Supplier orders"
        chip={<><ClipboardList /> My orders</>}
        meta="Har Order ki halat supplier ki taraf se khud badalti hai"
        busy={q.isFetching && !q.isLoading} loading={q.isLoading}
        actions={<button type="button" onClick={() => qc.invalidateQueries({ queryKey: [TRADE_KEY] })} className={heroIconButton} aria-label="Taaza karein"><RefreshCw className={cn('h-4 w-4', q.isFetching && 'animate-spin')} /></button>}
        stats={[{ label: 'Open', value: String(open) }, { label: 'Raste me', value: String(c.LOADED ?? 0) }, { label: 'Delivered', value: String((c.DELIVERED ?? 0) + (c.PARTIAL ?? 0)) }]}
      />
      <ViewTabs value={tab} onChange={setTab} tabs={[{ id: 'OPEN', label: 'Open', count: open }, { id: 'DONE', label: 'Done' }, { id: 'ALL', label: 'All' }]} />
      <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {q.isLoading ? <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          : !rows.length ? <Empty icon={<ShoppingCart className="h-5 w-5" />} text={tab === 'OPEN' ? 'Koi chalta Order nahi.' : 'Is tab me koi Order nahi.'} action={<Link to="/network"><Button variant="secondary">Suppliers</Button></Link>} />
            : (
              <ul className="divide-y divide-slate-100">
                {rows.map((o) => <OrderRow key={o.id} o={o} money={money} onOpen={() => setParams({ id: o.id })} />)}
              </ul>
            )}
        {q.data && q.data.total > q.data.limit && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[0.8125rem] text-slate-600 sm:px-5">
            <span>{(page - 1) * q.data.limit + 1}–{Math.min(page * q.data.limit, q.data.total)} / {q.data.total}</span>
            <span className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button size="sm" variant="secondary" disabled={page * q.data.limit >= q.data.total} onClick={() => setPage(page + 1)}>Next</Button>
            </span>
          </div>
        )}
      </section>
      {openId && <OrderModal id={openId} onClose={() => { params.delete('id'); setParams(params, { replace: true }); }} />}
    </PageShell>
  );
}

function OrderRow({ o, money, onOpen }: { o: TradeOrderRow; money: (n: number) => string; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/80 sm:px-5">
        <BizAvatar card={o.seller} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[0.875rem] font-semibold text-slate-900">{o.seller?.name ?? 'Supplier'}</span>
            <span className="shrink-0 text-[0.75rem] text-slate-500">{o.orderNumber}</span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <Pill tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Pill>
            {['DRAFT', 'NEEDS_MAP'].includes(o.receiveState) && <Pill tone={RECEIVE_STATE[o.receiveState].tone}>{RECEIVE_STATE[o.receiveState].label}</Pill>}
            {o.receiveState === 'RECEIVED' && <Pill tone="green">Stock me</Pill>}
            <span className="text-[0.75rem] text-slate-500">{dayTime(o.createdAt)} · {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}</span>
          </span>
        </span>
        <span className="text-right">
          <span className="block text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(o.deliveredValue ?? o.invoiceTotal ?? o.total)}</span>
          {o.invoiceNumber && <span className="block text-[0.6875rem] text-slate-500">{o.invoiceNumber}</span>}
        </span>
      </button>
    </li>
  );
}

function Journey({ o }: { o: TradeOrderDetail }) {
  const at = stepIndex(o.status);
  const times = [o.createdAt, o.approvedAt, o.invoicedAt, o.loadedAt, o.deliveredAt];
  if (o.status === 'CANCELLED') return <div className="rounded-2xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">Order cancel ho gaya{o.cancelledAt ? ` · ${dayTime(o.cancelledAt)}` : ''}</div>;
  return (
    <ol className="grid grid-cols-5 gap-1">
      {STEPS.map((s, i) => {
        const done = i <= at;
        return (
          <li key={s.key} className="flex flex-col items-center text-center">
            <span className={cn('flex h-8 w-8 items-center justify-center rounded-full text-[0.75rem] font-bold ring-2',
              done ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-400 ring-slate-200', i === at && 'ring-4 ring-brand-200')}>
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cn('mt-1 text-[0.6875rem] font-semibold', done ? 'text-slate-900' : 'text-slate-400')}>
              {i === 4 && (o.status === 'PARTIAL' || o.status === 'RETURNED') ? ORDER_STATUS[o.status].label : s.label}
            </span>
            <span className="text-[0.625rem] text-slate-400">{times[i] ? dayTime(times[i]) : ''}</span>
          </li>
        );
      })}
    </ol>
  );
}

function OrderModal({ id, onClose }: { id: string; onClose: () => void }) {
  const money = useMoney();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [TRADE_KEY, 'order', id], queryFn: () => tradeApi.order(id) });
  const cancel = useMutation({
    mutationFn: () => tradeApi.cancelOrder(id),
    onSuccess: () => { toast.success('Order wapas le liya'); qc.invalidateQueries({ queryKey: [TRADE_KEY] }); },
    onError: (e) => toast.error(tradeError(e)),
  });
  const o = q.data;
  return (
    <Modal open onClose={onClose} size="lg" title={o ? `${o.seller?.name ?? 'Supplier'} · ${o.orderNumber ?? ''}` : 'Order'}
      footer={o && <>
        {o.status === 'BOOKED' && <Button variant="ghost" leftIcon={<X className="h-4 w-4" />} loading={cancel.isPending} onClick={async () => {
          if (await confirmDialog({ title: 'Order wapas lein?', text: 'Supplier ne abhi approve nahi kiya — Order cancel ho jayega.', yes: 'Undo', danger: true })) cancel.mutate();
        }}>Cancel order</Button>}
        {['DRAFT', 'NEEDS_MAP'].includes(o.receiveState) && <Link to={`/network/receiving?id=${o.id}`}><Button leftIcon={<PackageCheck className="h-4 w-4" />}>Receive</Button></Link>}
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </>}>
      {!o ? <Skeleton className="h-64 rounded-2xl" /> : (
        <div className="space-y-4">
          <Journey o={o} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact label="Order">{money(o.total)}</Fact>
            <Fact label="Invoice">{o.invoiceTotal != null ? `${money(o.invoiceTotal)}${o.invoiceNumber ? ` · ${o.invoiceNumber}` : ''}` : '—'}</Fact>
            <Fact label="Wapsi">{o.returnsValue ? money(o.returnsValue) : '—'}</Fact>
            <Fact label="Purchase">{o.purchase ? `${o.purchase.purchaseNumber}` : RECEIVE_STATE[o.receiveState].label}</Fact>
          </div>
          <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200/80">
            <ul className="divide-y divide-slate-100">
              {o.lines.map((l) => (
                <li key={l.id} className="flex items-start gap-3 px-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{l.name}</span>
                    <span className="block text-[0.75rem] text-slate-500">
                      {l.qty} {l.unitName ?? l.baseUnit} × {money(l.price)}
                      {l.deliveredBaseQty != null && l.deliveredBaseQty < l.baseQty ? ` · deliver ${packText(l.deliveredBaseQty, l.baseUnit, l.unitName, l.conversionRate)}` : ''}
                    </span>
                    {(l.schemeNote || l.freeBaseQty > 0) && <span className="block text-[0.6875rem] font-medium text-success-700">{l.schemeNote}{l.freeBaseQty > 0 ? ` · ${l.freeBaseQty} ${l.freeProductName ?? l.baseUnit} free` : ''}</span>}
                  </span>
                  <span className="text-right text-[0.8125rem] font-semibold tabular-nums text-slate-900">{money(l.total)}</span>
                </li>
              ))}
            </ul>
            {o.totals && (
              <div className="space-y-0.5 border-t border-slate-100 bg-slate-50 px-3 py-2 text-[0.8125rem]">
                {o.totals.schemeDiscount > 0 && <div className="flex justify-between text-success-700"><span>Scheme</span><span>− {money(o.totals.schemeDiscount)}</span></div>}
                <div className="flex justify-between font-bold text-slate-900"><span>Total</span><span className="tabular-nums">{money(o.totals.total)}</span></div>
              </div>
            )}
          </div>
          {o.note && <p className="text-[0.8125rem] text-slate-600">Note: {o.note}</p>}
        </div>
      )}
    </Modal>
  );
}
