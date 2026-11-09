/**
 * Full edit of an order (web EditOrderForm): items (product search, qty,
 * price), Discount, delivery, weight, customer and note. When the channel
 * accepts edits from Nafaa (`canSyncEdit`) a switch also changes the order
 * there. An order with a bill keeps its bill in step on the server.
 */

import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react-native';
import { orderNo } from '@nafaa/core/online-store';
import { haptic } from '@/core/device/haptics';
import { t } from '@/core/i18n';
import { Button, Card, ErrorState, HeroAmount, Input, MoneyInput, Screen, SectionHeader, SkeletonRows, Switch, TextArea, toast, useTheme } from '@/design';
import { apiErrorMessage, unmatchedFromError } from '../api/online';
import { boardApi, type BoardOrderDetail } from '../api/board';
import { CommerceHero } from '../components/CommerceHero';
import { Note } from '../components/bits';
import { ItemsEditor, TotalsBox, lineKey, subtotalOf, type ItemLine } from '../components/order/ItemsEditor';
import { KEYS, refreshOrders, useOnlineGuard } from '../lib/online';

/** Whether Nafaa can change this order on its channel. */
function channelSync(o: BoardOrderDetail): 'yes' | 'no' | 'manual' {
  const type = o.integration?.type;
  if (type === 'MANUAL') return 'manual';
  if (typeof o.canSyncEdit === 'boolean') return o.canSyncEdit ? 'yes' : 'no';
  return type === 'SHOPIFY' || type === 'WOOCOMMERCE' || o.platform === 'woocommerce' ? 'yes' : 'no';
}

const linesOf = (o: BoardOrderDetail): ItemLine[] => o.lines.map((l) => ({
  key: lineKey(), productId: l.match?.productId ?? l.productId ?? null, variantId: l.match?.variantId ?? null, name: l.name,
  sku: l.sku ?? l.match?.sku, variant: l.variant, quantity: Number(l.quantity) || 0, price: Number(l.price) || 0,
}));

export function EditOrderScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: KEYS.order(id), queryFn: () => boardApi.detail(id), enabled: !!id });
  const o = q.data;
  return (
    <Screen title={o ? t('#{{no}} edit', { no: orderNo(o) }) : t('Edit order')} keyboard>
      {o ? <EditForm order={o} /> : q.isError ? <ErrorState error={q.error} onRetry={q.refetch} /> : <View style={{ gap: th.space(3) }}><SkeletonRows count={5} /></View>}
    </Screen>
  );
}

function EditForm({ order: o }: { order: BoardOrderDetail }) {
  const th = useTheme();
  const qc = useQueryClient();
  const { guard } = useOnlineGuard();
  const [items, setItems] = useState<ItemLine[]>(() => linesOf(o));
  const [discount, setDiscount] = useState(Number(o.discount) || 0);
  const [deliveryFee, setDeliveryFee] = useState(Number(o.deliveryFee) || 0);
  const [weight, setWeight] = useState(o.weightKg ? String(o.weightKg) : '');
  const [c, setC] = useState({ name: o.customerName ?? '', phone: o.customerPhone ?? '', address: o.customerAddress ?? '', city: o.customerCity ?? '' });
  const [notes, setNotes] = useState(o.notes ?? '');
  const sync = channelSync(o);
  const [syncOn, setSyncOn] = useState(sync === 'yes');
  useEffect(() => { setSyncOn(sync === 'yes'); }, [sync]);
  const subtotal = useMemo(() => subtotalOf(items), [items]);
  const total = Math.max(0, subtotal - discount + deliveryFee);
  const valid = items.length > 0 && items.every((i) => i.quantity > 0) && c.name.trim().length > 0;

  const save = useMutation({
    mutationFn: () => boardApi.editFull(o.id, {
      items: items.map((i) => ({ productId: i.productId ?? undefined, variantId: i.variantId ?? undefined, name: i.name, sku: i.sku, variant: i.variant, quantity: i.quantity, price: i.price })),
      discount, deliveryFee, weightKg: Number(weight) > 0 ? Number(weight) : null,
      customerName: c.name.trim(), customerPhone: c.phone.trim(), customerAddress: c.address.trim(), customerCity: c.city.trim(), notes: notes.trim(),
      syncToChannel: sync === 'yes' && syncOn,
    }),
    onSuccess: (r) => {
      haptic('success');
      toast.success(t('Order save ho gaya'));
      if (r.sync && !r.sync.ok) toast.error(t('{{channel}} par nahi badla: {{message}}', { channel: r.sync.channel, message: r.sync.message }), { duration: 10_000 });
      refreshOrders(qc, o.id);
      router.back();
    },
    onError: (e) => toast.error(unmatchedFromError(e) !== null ? t('Bill wale order me har cheez Nafaa product se juri honi chahiye — peeli lines jorein') : apiErrorMessage(e, t('Save nahi hua'))),
  });

  return (
    <View style={{ gap: th.space(4) }}>
      <CommerceHero chip={o.integration?.displayName ?? t('Order')}
        stats={[
          { label: t('Naya total'), value: <HeroAmount value={total} size="2xl" /> },
          { label: t('Pehle'), value: <HeroAmount value={o.total} size="lg" /> },
          { label: t('Cheezein'), value: String(items.reduce((a, i) => a + i.quantity, 0)) },
        ]} />
      {!!o.nafaaSaleId && <Note tone="info">{t('Bill ban chuka hai — save karne par bill aur stock bhi isi hisaab se badal jayenge.')}</Note>}
      <View style={{ gap: th.space(2) }}>
        <SectionHeader title={t('Cheezein')} />
        <ItemsEditor items={items} onChange={setItems} />
      </View>
      <Card title={t('Paisa')}>
        <View style={{ gap: th.space(3) }}>
          <View style={{ flexDirection: 'row', gap: th.space(2) }}>
            <MoneyInput containerStyle={{ flex: 1 }} label={t('Discount')} value={discount || null} onChangeValue={(v) => setDiscount(Math.max(0, v ?? 0))} />
            <MoneyInput containerStyle={{ flex: 1 }} label={t('Delivery charges')} value={deliveryFee || null} onChangeValue={(v) => setDeliveryFee(Math.max(0, v ?? 0))} />
          </View>
          <Input label={t('Wazan (kg)')} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
          <TotalsBox subtotal={subtotal} discount={discount} deliveryFee={deliveryFee} />
        </View>
      </Card>
      <Card title={t('Customer')}>
        <View style={{ gap: th.space(3) }}>
          <Input label={t('Naam')} value={c.name} onChangeText={(v) => setC((x) => ({ ...x, name: v }))} />
          <Input label={t('Phone')} value={c.phone} onChangeText={(v) => setC((x) => ({ ...x, phone: v }))} keyboardType="phone-pad" ltr />
          <Input label={t('Shehar')} value={c.city} onChangeText={(v) => setC((x) => ({ ...x, city: v }))} />
          <Input label={t('Address')} value={c.address} onChangeText={(v) => setC((x) => ({ ...x, address: v }))} multiline />
          <TextArea label={t('Note')} value={notes} onChangeText={setNotes} />
        </View>
      </Card>
      {sync === 'yes' && (
        <Switch value={syncOn} onChange={setSyncOn} label={t('{{channel}} par bhi badlein', { channel: o.integration?.displayName ?? '' })}
          description={t('Band karein to sirf Nafaa me badlega')} />
      )}
      {sync === 'no' && <Note tone="warning">{t('Ye channel Nafaa se badlav nahi leta — wahan haath se badlein.')}</Note>}
      <Button size="lg" fullWidth icon={Save} disabled={!valid} loading={save.isPending} onPress={guard(() => save.mutate())}>{t('Save karein')}</Button>
    </View>
  );
}
