/**
 * Full order edit: items, discount, delivery charges, weight, customer and
 * address, notes, with live totals. When the channel supports it the change
 * can also be sent to the channel (Shopify, WooCommerce); the result of
 * that sync is shown after saving.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { Alert, Button, Card, Input, Switch, Textarea } from '@/design-system/components';
import { apiErrorMessage, unmatchedFromError, type OnlineOrderDetail } from '../../api/online-orders.api';
import { orderBoardApi, type SyncResult } from '../../api/order-board.api';
import { sourceOf } from '../../lib/labels';
import { ItemsEditor, TotalsBox, lineKey, subtotalOf, type ItemLine } from './ItemsEditor';
import { useBoardRefresh } from './useMoveOrder';
import { t } from '@core/i18n';

/** Channels Nafaa can change an order on. */
export function channelSync(o: OnlineOrderDetail): 'yes' | 'no' | 'manual' {
  const type = o.integration?.type;
  if (type === 'MANUAL') return 'manual';
  if (typeof o.canSyncEdit === 'boolean') return o.canSyncEdit ? 'yes' : 'no';
  if (type === 'SHOPIFY' || type === 'WOOCOMMERCE' || o.platform === 'woocommerce') return 'yes';
  return 'no';
}

const linesOf = (o: OnlineOrderDetail): ItemLine[] => o.lines.map((l) => ({
  key: lineKey(), productId: l.match?.productId ?? l.productId ?? null, variantId: l.match?.variantId ?? null,
  name: l.name, sku: l.sku ?? l.match?.sku ?? null, variant: l.variant ?? null, quantity: Number(l.quantity) || 0, price: Number(l.price) || 0,
  image: l.image ?? l.match?.image ?? null,
}));

export function EditOrderForm({ order, money, onSaved }: { order: OnlineOrderDetail; money: (n: number) => string; onSaved: (sync: SyncResult | null) => void }) {
  const refresh = useBoardRefresh();
  const qc = useQueryClient();
  const [items, setItems] = useState<ItemLine[]>(() => linesOf(order));
  const [discount, setDiscount] = useState(Number(order.discount) || 0);
  const [deliveryFee, setDeliveryFee] = useState(Number(order.deliveryFee) || 0);
  const [weight, setWeight] = useState(order.weightKg ? String(order.weightKg) : '');
  const [customer, setCustomer] = useState({ name: order.customerName ?? '', phone: order.customerPhone ?? '', address: order.customerAddress ?? '', city: order.customerCity ?? '' });
  const [notes, setNotes] = useState(order.notes ?? '');
  const sync = channelSync(order);
  const [syncOn, setSyncOn] = useState(sync === 'yes');
  const subtotal = useMemo(() => subtotalOf(items), [items]);
  const src = sourceOf(order);
  const valid = items.length > 0 && items.every((i) => i.quantity > 0) && customer.name.trim().length > 0;

  const save = useMutation({
    mutationFn: () => orderBoardApi.editFull(order.id, {
      items: items.map((i) => ({
        productId: i.productId ?? undefined, variantId: i.variantId ?? undefined, name: i.name, sku: i.sku ?? undefined,
        variant: i.variant ?? undefined, quantity: Number(i.quantity), price: Number(i.price),
      })),
      discount, deliveryFee,
      weightKg: weight ? Number(weight) : null,
      customerName: customer.name.trim(), customerPhone: customer.phone.trim(), customerAddress: customer.address.trim(), customerCity: customer.city.trim(),
      notes: notes.trim(),
      syncToChannel: sync === 'yes' && syncOn,
    }),
    onSuccess: (r) => {
      toast.success(t('Order save ho gaya'));
      if (r.sync && !r.sync.ok) toast.error(t('{{channel}} par nahi badla: {{message}}', { channel: r.sync.channel, message: r.sync.message }), { duration: 10_000 });
      refresh(order.id);
      qc.invalidateQueries({ queryKey: ['online-order-edit', order.id] });
      onSaved(r.sync ?? null);
    },
    onError: (e) => toast.error(unmatchedFromError(e) !== null ? t('Bill wale order me har cheez Nafaa product se juri honi chahiye — peeli lines jorein') : apiErrorMessage(e, t('Save nahi hua'))),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-4">
        <Card title={t('Cheezein')} description={t('Qty, price badlein, hatayein ya nayi cheez jorein')}>
          <ItemsEditor items={items} onChange={setItems} money={money} requireProduct={!!order.nafaaSaleId} />
        </Card>
        <Card title={t('Customer')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('Naam')} value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} required />
            <Input label={t('Phone')} value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} inputMode="tel" />
            <Input label={t('Shehar')} value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} />
            <Input label={t('Address')} value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} wrapperClassName="sm:col-span-2" />
          </div>
          {order.courierBooked && <Alert tone="warning" className="mt-3">{t('Courier book ho chuka hai. Address ya COD amount badalna ho to pehle booking cancel karein.')}</Alert>}
        </Card>
        <Card title={t('Note')}>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('Order ke saath note (slip par chhapta hai)')} />
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <Card title={t('Charges')}>
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" min={0} label={t('Discount')} value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} />
            <Input type="number" min={0} label={t('Delivery charges')} value={deliveryFee} onChange={(e) => setDeliveryFee(Math.max(0, Number(e.target.value)))} />
            <Input type="number" min={0} step="0.1" label={t('Wazan (kg)')} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0.5" wrapperClassName="col-span-2" />
          </div>
          <div className="mt-4"><TotalsBox subtotal={subtotal} discount={discount} deliveryFee={deliveryFee} money={money} advance={order.money?.advance} /></div>
        </Card>
        <Card>
          {sync === 'yes' ? (
            <Switch checked={syncOn} onChange={(e) => setSyncOn(e.target.checked)} label={t('{{channel}} par bhi badlein', { channel: src.label })}
              description={t('Order {{channel}} par bhi isi tarah badal jayega. Customer ko email nahi jati.', { channel: src.label })} />
          ) : sync === 'no' ? (
            <p className="text-[0.8125rem] text-slate-600">{t('{{channel}} par order badla nahi ja sakta — sirf Nafaa me badlega. Wahan khud badal dein.', { channel: src.label })}</p>
          ) : (
            <p className="text-[0.8125rem] text-slate-600">{t('Ye order Nafaa me hi bana tha — sirf yahin badlega.')}</p>
          )}
          {order.sale && <p className="mt-3 text-[0.75rem] text-slate-500">{t('Bill {{bill}} dobara banega: stock, cost aur khata khud theek ho jayenge.', { bill: order.sale.saleNumber })}</p>}
          <Button className="mt-4 w-full" leftIcon={<Save className="h-4 w-4" />} loading={save.isPending} disabled={!valid} onClick={() => save.mutate()}>{t('Save karein')}</Button>
        </Card>
      </div>
    </div>
  );
}
