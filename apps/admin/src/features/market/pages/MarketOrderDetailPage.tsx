/**
 * One Market order: items with their options, customer uploads, status
 * history, the shop's Online Orders record and POS bill, customer and
 * payment. Staff can cancel an open order; it is cancelled at the shop as
 * well (the POS bill is voided) and wallet money or points go back.
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, CircleAlert, ExternalLink, History, Package, Receipt, ShoppingBag, Store } from 'lucide-react';
import { Alert, Card, EmptyState, PageHero, PageShell, Skeleton, Table, TBody, Td, Th, THead, Tr, heroButton } from '@/design-system/components';
import { usePageGuide } from '@core/components/PageGuide';
import { adminMarketApi } from '@/api/admin-market.api';
import { DetailList, StatusBadge } from '@/ui';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { formatPKRFull } from '@/lib/format';
import { Empty, Pill } from '@/features/shared/kit';
import { TextActionModal } from '@/features/stores/components/TextActionModal';
import { GuideButton, MarketGuide, OrderStatusBadge, PAYMENT_LABEL, dateTime, orderStatusLabel } from '../components/MarketUi';

/** Item options are free-form JSON (cake message, slot, substitutes); print them as short "key: value" pairs. */
function optionText(v: unknown): string | null {
  if (!v) return null;
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' && x ? (x as any).name ?? (x as any).label ?? JSON.stringify(x) : String(x))).join(', ');
  if (typeof v === 'object') return Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== null && x !== '' && x !== false).map(([k, x]) => `${k}: ${typeof x === 'object' ? JSON.stringify(x) : String(x)}`).join(' · ');
  return String(v);
}

const money = (v: number) => formatPKRFull(v);

export default function MarketOrderDetailPage() {
  const { id = '' } = useParams();
  const guide = usePageGuide();
  const can = useCan();
  const qc = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const detail = useQuery({ queryKey: ['admin-market-order', id], queryFn: () => adminMarketApi.order(id), enabled: !!id });
  const cancel = useMutation({
    mutationFn: (reason: string) => adminMarketApi.cancelOrder(id, reason),
    onSuccess: (d) => {
      qc.setQueryData(['admin-market-order', id], d);
      void qc.invalidateQueries({ queryKey: ['admin-market-orders'] });
      void qc.invalidateQueries({ queryKey: ['admin-market-overview'] });
      toast.success('Order cancelled. The customer was told.');
      setCancelOpen(false);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  if (detail.isError) {
    return (
      <PageShell>
        <PageHero title="Order" back="/market/orders" />
        <EmptyState icon={<CircleAlert className="h-6 w-6" />} title="Order not found" action={<Link to="/market/orders" className="font-semibold text-brand-700 hover:underline">Back to orders</Link>} />
      </PageShell>
    );
  }
  const o = detail.data;
  if (!o) return <PageShell><PageHero title="Order" back="/market/orders" loading /><Skeleton className="h-96 rounded-3xl" /></PageShell>;

  const m = o.money;
  const funded = m.walletUsed + m.loyaltyDiscount;
  const addr = (o.address ?? {}) as Record<string, string | null | undefined>;

  return (
    <PageShell>
      <PageHero
        title={`Order #${o.orderNumber}`}
        back="/market/orders"
        chip={<OrderStatusBadge status={o.status} />}
        meta={<span>{dateTime(o.createdAt)} · {o.shop.name}</span>}
        busy={detail.isFetching || cancel.isPending}
        actions={
          <>
            {can('marketplace.manage') && o.canCancel && (
              <button type="button" className={heroButton} onClick={() => setCancelOpen(true)}><Ban className="h-4 w-4" /> Cancel order</button>
            )}
            <GuideButton onClick={guide.open} />
          </>
        }
        stats={[
          { label: 'Total', value: money(m.total), hint: PAYMENT_LABEL[o.payment.method] ?? o.payment.method },
          { label: 'Items', value: String(o.items.reduce((s, i) => s + i.quantity, 0)), hint: `${o.items.length} lines` },
          { label: 'Paid by Nafaa', value: money(funded), hint: 'Wallet and points' },
          { label: 'POS bill', value: o.bill ? `#${o.bill.number}` : '—', hint: o.bill ? o.bill.status : o.channel ? 'Not accepted yet' : 'Not sent to shop' },
        ]}
      />

      {!o.channel && o.status === 'PENDING' && (
        <Alert tone="danger" title="Not sent to the shop yet">The order did not reach the shop's POS. It is retried for 10 minutes and then cancelled with a refund. Cancel now if the customer asked.</Alert>
      )}
      {o.cancel && <Alert tone="warning" title={`Cancelled ${dateTime(o.cancel.at)} by ${o.cancel.by ?? 'unknown'}`}>{o.cancel.reason ?? 'No reason given.'}</Alert>}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card flush title="Items">
            <Table minWidth="36rem">
              <THead><Tr><Th>Item</Th><Th align="right">Price</Th><Th align="right">Qty</Th><Th align="right">Total</Th></Tr></THead>
              <TBody>
                {o.items.map((i) => (
                  <Tr key={i.id}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        {i.imageUrl ? <img src={i.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" /> : <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400"><Package className="h-4 w-4" /></div>}
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900">{i.name}{i.variant ? ` · ${i.variant}` : ''}</div>
                          {optionText(i.modifiers) && <div className="text-[0.75rem] text-slate-500">Add-ons: {optionText(i.modifiers)}</div>}
                          {optionText(i.options) && <div className="text-[0.75rem] text-slate-500">{optionText(i.options)}</div>}
                          {i.notes && <div className="text-[0.75rem] text-slate-500">Note: {i.notes}</div>}
                        </div>
                      </div>
                    </Td>
                    <Td align="right">{money(i.unitPrice)}</Td>
                    <Td align="right">{i.quantity}</Td>
                    <Td align="right">{money(i.total)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
              <DetailList cols={3} items={[
                { label: 'Item value', value: money(m.subtotal) },
                { label: 'Delivery fee', value: money(m.deliveryFee) },
                { label: 'Shop coupon', value: m.couponDiscount ? `${money(m.couponDiscount)}${m.couponCode ? ` (${m.couponCode})` : ''}` : null },
                { label: 'Wallet used', value: m.walletUsed ? money(m.walletUsed) : null },
                { label: 'Points used', value: m.loyaltyPointsUsed ? `${m.loyaltyPointsUsed} (${money(m.loyaltyDiscount)})` : null },
                { label: 'Customer pays', value: <span className="font-semibold">{money(m.total)}</span> },
              ]} />
            </div>
          </Card>

          {!!o.attachments.length && (
            <Card title="Customer uploads" description="Prescriptions and other files sent with the order">
              <div className="flex flex-wrap gap-3">
                {o.attachments.map((a, n) => (
                  <a key={n} href={String(a.url ?? '#')} target="_blank" rel="noreferrer" className="group block w-32">
                    {/\.(png|jpe?g|webp|gif)(\?|$)/i.test(String(a.url ?? ''))
                      ? <img src={String(a.url)} alt="" className="h-24 w-32 rounded-lg border border-slate-200 object-cover" />
                      : <div className="grid h-24 w-32 place-items-center rounded-lg border border-slate-200 text-slate-400"><ExternalLink className="h-5 w-5" /></div>}
                    <div className="mt-1 truncate text-[0.75rem] text-slate-600 group-hover:text-brand-700">{String(a.kind ?? 'File')}</div>
                  </a>
                ))}
              </div>
            </Card>
          )}

          <Card title="Status history" description="Every change, newest last">
            {!o.history.length ? <Empty>No history yet.</Empty> : (
              <ol className="space-y-3">
                {o.history.map((h) => (
                  <li key={h.id} className="flex gap-3">
                    <History className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <div className="text-[0.8125rem] font-medium text-slate-900">{orderStatusLabel(h.status)} <span className="font-normal text-slate-500">· {dateTime(h.at)}{h.by ? ` · ${h.by}` : ''}</span></div>
                      {h.note && <div className="text-[0.75rem] text-slate-500">{h.note}</div>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Shop's Online Orders" description="The record the shop works from in the POS">
            {!o.channel ? <Empty>Not sent to the shop.</Empty> : (
              <DetailList items={[
                { label: 'Status at the shop', value: <StatusBadge value={o.channel.status} /> },
                { label: 'POS bill', value: o.bill ? <span>#{o.bill.number} <Pill tone={o.bill.status === 'VOIDED' ? 'rose' : 'emerald'}>{o.bill.status}</Pill></span> : 'Not made yet' },
                { label: 'Received', value: dateTime(o.channel.receivedAt) },
                { label: 'Accepted', value: o.channel.acceptedAt ? dateTime(o.channel.acceptedAt) : null },
                { label: 'Sent', value: o.channel.dispatchedAt ? dateTime(o.channel.dispatchedAt) : null },
                { label: 'Delivered', value: o.channel.deliveredAt ? dateTime(o.channel.deliveredAt) : null },
                { label: 'Courier', value: o.channel.courier ? `${o.channel.courier}${o.channel.trackingNumber ? ` · ${o.channel.trackingNumber}` : ''}` : null },
                { label: 'Rider', value: o.rider ? `${o.rider.name}${o.rider.phone ? ` · ${o.rider.phone}` : ''}` : null },
              ]} />
            )}
          </Card>

          <Card title="Customer">
            <DetailList items={[
              { label: 'Name', value: <Link to={`/market/customers/${o.customer.id}`} className="font-medium text-brand-700 hover:underline">{o.customer.fullName}</Link> },
              { label: 'Phone', value: o.customer.phone },
              { label: 'Email', value: o.customer.email },
              { label: 'Blocked', value: o.customer.isBanned ? <Pill tone="rose">Blocked</Pill> : null, hidden: !o.customer.isBanned },
              { label: o.deliveryType === 'DELIVERY' ? 'Deliver to' : 'Fulfilment', value: o.deliveryType === 'DELIVERY' ? [addr.addressLine1, addr.area, addr.city].filter(Boolean).join(', ') || null : o.deliveryType.replace(/_/g, ' ').toLowerCase() },
              { label: 'Slot', value: o.slot ? `${dateTime(o.slot.start)}${o.slot.end ? ` – ${dateTime(o.slot.end)}` : ''}` : null, hidden: !o.slot },
              { label: 'Customer note', value: o.notes.customer, hidden: !o.notes.customer },
            ]} />
          </Card>

          <Card title="Payment">
            <DetailList items={[
              { label: 'Method', value: PAYMENT_LABEL[o.payment.method] ?? o.payment.method },
              { label: 'Status', value: <StatusBadge value={o.payment.status} /> },
              { label: 'Reference', value: o.payment.ref, hidden: !o.payment.ref },
              { label: 'Paid', value: o.payment.paidAt ? dateTime(o.payment.paidAt) : null },
            ]} />
          </Card>

          <Card title="Shop">
            <DetailList items={[
              { label: 'Shop', value: <Link to={`/market/shops/${o.shop.shopId}`} className="font-medium text-brand-700 hover:underline">{o.shop.name}</Link> },
              { label: 'City', value: o.shop.city },
              { label: 'Phone', value: o.shop.phone },
            ]} />
          </Card>
        </div>
      </div>

      <TextActionModal open={cancelOpen} onClose={() => setCancelOpen(false)} busy={cancel.isPending} danger
        title={`Cancel order #${o.orderNumber}?`}
        description={o.channel ? 'The order is cancelled at the shop too: the POS bill is voided and the stock comes back. Wallet money and points go back to the customer.' : 'The order never reached the shop. Wallet money and points go back to the customer.'}
        label="Reason (the customer and the shop see it)" placeholder="e.g. The shop did not answer for 30 minutes." yes="Cancel order"
        onConfirm={(reason) => cancel.mutate(reason)} />

      {guide.isOpen && (
        <MarketGuide
          search={false}
          title="Order"
          description="Everything about one Market order."
          flowTitle="Where this order lives"
          flow={[
            { label: 'Market order', hint: 'What the customer sees', icon: ShoppingBag, color: '#4f46e5' },
            { label: 'Online Orders', hint: "Shop's POS record", icon: Store, color: '#0284c7' },
            { label: 'POS bill', hint: 'Stock and money', icon: Receipt, color: '#16a34a' },
          ]}
          steps={[
            { icon: Store, color: '#0284c7', title: 'Check the shop side', text: 'The Online Orders card shows what the shop did and when.' },
            { icon: History, color: '#4f46e5', title: 'Read the history', text: 'Every status change with who made it.' },
            { icon: Ban, color: '#e11d48', title: 'Cancel if needed', text: 'Cancel voids the POS bill, returns stock and refunds wallet money and points.' },
          ]}
          tips={['A delivered order cannot be cancelled here; the shop makes a return in the POS.', 'Paid by Nafaa is the wallet and points part Nafaa settles with the shop.']}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
