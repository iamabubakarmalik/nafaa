/**
 * Sheets for a running order (web OrderDialogs): void a dish, cancel the
 * order, change the bill's charges, merge another order in, move some dishes
 * to a separate bill, and assign a rider. Each shows what will happen before
 * it is saved; the server checks the same rules again (PIN for a dish the
 * kitchen already has).
 */

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { chargesPreview, splitAmount, splitProblem } from '@nafaa/core/restaurant';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { useOfflineList } from '@/core/offline';
import { Amount, Badge, Button, Card, Chip, EmptyState, Icon, Input, ListRow, Row, Select, Sheet, SkeletonRows, Text, useTheme } from '@/design';
import { Stepper } from '@/modules/pos/components/parts';
import { ordersApi, ridersApi, type OrderCharges, type OrderItem, type RestaurantOrder } from '../api';
import { itemName, lineExtras, orderTitle } from '../meta';

const VOID_REASONS = [msg('Customer ne mana kar diya'), msg('Ghalat order likha'), msg('Bohat der ho gayi'), msg('Khana kharab tha'), msg('Item khatam')];
const CANCEL_REASONS = [msg('Customer chala gaya'), msg('Ghalat order'), msg('Duplicate order'), msg('Kitchen nahi bana saka')];

function Reasons({ value, onChange, reasons }: { value: string; onChange: (v: string) => void; reasons: string[] }) {
  const th = useTheme();
  return (
    <View style={{ gap: th.space(2) }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(1.5) }}>
        {reasons.map((r) => <Chip key={r} label={t(r)} selected={value === t(r)} onPress={() => onChange(t(r))} />)}
      </View>
      <Input value={value} onChangeText={(v) => onChange(v.slice(0, 200))} placeholder={t('Wajah likhein')}
        error={value.trim().length > 0 && value.trim().length < 3 ? t('Wajah thori aur wazeh likhein') : undefined} />
    </View>
  );
}

function Warn({ children, tone = 'warning' }: { children: string; tone?: 'warning' | 'danger' }) {
  const th = useTheme();
  return (
    <Row gap={2} align="start" style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors[tone].soft }}>
      <Icon icon={AlertTriangle} size={16} color={th.colors[tone].text} />
      <Text size="sm" color={th.colors[tone].text} style={{ flex: 1 }}>{children}</Text>
    </Row>
  );
}

/** Take a dish (or part of it) off the bill. */
export function VoidItemSheet({ item, saving, onConfirm, onClose }: {
  item: OrderItem | null; saving?: boolean; onConfirm: (d: { quantity: number; reason: string }) => void; onClose: () => void;
}) {
  const th = useTheme();
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (!item) return;
    setQty(item.quantity);
    setReason(item.sentToKitchenAt ? '' : t('Kitchen se pehle hataya'));
  }, [item]);
  const sent = !!item?.sentToKitchenAt;
  const unit = (item?.basePrice ?? 0) + (item?.modifierTotal ?? 0);
  const ok = reason.trim().length >= 3 && qty > 0;
  return (
    <Sheet open={!!item} onClose={onClose} title={t('{{value}} hatayein', { value: item?.product?.name ?? t('Item') })}
      description={sent ? t('Ye dish kitchen ja chuki hai — void hogi, record me rahegi aur kitchen ko cancel ticket jayega.') : t('Abhi kitchen nahi gayi — seedha hat jayegi.')}
      footer={<Button size="lg" fullWidth variant="danger" loading={saving} disabled={!ok} onPress={() => onConfirm({ quantity: qty, reason: reason.trim() })}>
        {`${sent ? t('Void karein') : t('Hatayein')} · ${formatMoney(unit * qty)}`}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {(item?.quantity ?? 0) > 1 && (
          <Row justify="between" style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
            <Text size="sm">{t('Kitne hatane hain?')}</Text>
            <Stepper value={qty} unit={`/ ${item?.quantity}`} onMinus={() => setQty((q) => Math.max(1, q - 1))} onPlus={() => setQty((q) => Math.min(item?.quantity ?? 1, q + 1))} />
          </Row>
        )}
        {sent && <Warn>{t('Is ke liye "Bill void" ki ijazat ya malik/manager ka PIN chahiye.')}</Warn>}
        <Reasons value={reason} onChange={setReason} reasons={VOID_REASONS} />
      </View>
    </Sheet>
  );
}

/** Cancel an unpaid order with a reason. */
export function CancelOrderSheet({ order, open, saving, onConfirm, onClose }: {
  order: RestaurantOrder; open: boolean; saving?: boolean; onConfirm: (reason: string) => void; onClose: () => void;
}) {
  const th = useTheme();
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open]);
  const sent = order.items.some((it) => !it.isReturned && it.sentToKitchenAt);
  return (
    <Sheet open={open} onClose={onClose} title={t('{{order}} ka order cancel', { order: orderTitle(order) })}
      description={t('{{total}} ka bill nahi banega. Order record me "Cancel" dikhega.', { total: formatMoney(order.total) })}
      footer={<Button size="lg" fullWidth variant="danger" loading={saving} disabled={reason.trim().length < 3} onPress={() => onConfirm(reason.trim())}>{t('Order cancel karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {sent && <Warn>{t('Kuch dishes kitchen ja chuki hain — "Bill void" ki ijazat ya PIN chahiye, aur kitchen ko cancel ticket jayega.')}</Warn>}
        {order.paidAmount > 0 && <Warn tone="danger">{t('Is order par {{paidAmount}} pehle mil chuke hain — customer ko wapas karna hoga.', { paidAmount: formatMoney(order.paidAmount) })}</Warn>}
        <Reasons value={reason} onChange={setReason} reasons={CANCEL_REASONS} />
      </View>
    </Sheet>
  );
}

type ChargesSave = OrderCharges & { numberOfGuests?: number; waiterId?: string; customerName?: string; customerPhone?: string; specialRequests?: string };

/** Service charge, tax, discount, packing, delivery, tip, guests and waiter of an open order. */
export function ChargesSheet({ order, open, saving, onSave, onClose }: {
  order: RestaurantOrder; open: boolean; saving?: boolean; onSave: (d: ChargesSave) => void; onClose: () => void;
}) {
  const th = useTheme();
  const { data: staff = [] } = useOfflineList('seller');
  const init = () => ({
    servicePct: String(order.serviceChargePct || ''), taxPct: String(order.taxPct || ''), discount: String(order.discount || ''),
    packing: String(order.packagingFee || ''), deliveryFee: String(order.deliveryFee || ''), tip: String(order.tip || ''),
    guests: String(order.numberOfGuests || ''), waiterId: order.waiterId ?? '', customerName: order.customerName ?? '', customerPhone: order.customerPhone ?? '',
    note: order.specialRequests ?? '',
  });
  const [f, setF] = useState(init);
  useEffect(() => { if (open) setF(init()); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = (v: string) => Number(v) || 0;
  const pv = chargesPreview(order, { servicePct: n(f.servicePct), taxPct: n(f.taxPct), discount: n(f.discount), packing: n(f.packing), deliveryFee: n(f.deliveryFee), tip: n(f.tip) });
  const problem = pv.problem === 'percent' ? t('Percent 100 se zyada nahi') : pv.problem === 'discount' ? t('Discount bill se zyada hai')
    : pv.problem === 'paid' ? t('{{paidAmount}} pehle mil chuke — bill is se kam nahi ho sakta', { paidAmount: formatMoney(order.paidAmount) }) : null;
  const num = (k: keyof typeof f, label: string, hint?: string) => (
    <View style={{ width: '48%' }}>
      <Input label={label} hint={hint} value={f[k]} onChangeText={(v) => setF((x) => ({ ...x, [k]: v.replace(/[^\d.]/g, '').slice(0, 9) }))} keyboardType="decimal-pad" placeholder="0" ltr />
    </View>
  );
  const waiters = (staff as Array<{ userId: string; name: string }>).map((s) => ({ value: s.userId, label: s.name }));
  return (
    <Sheet open={open} onClose={onClose} height={0.9} title={t('Bill ke charges')} description={t('Service, tax aur discount badlein — naya total neeche dikhta hai')}
      footer={
        <Row gap={3}>
          <View style={{ flex: 1 }}><Text size="xs" tone="muted">{t('Naya total')}</Text><Amount value={pv.total} size="xl" weight="bold" /></View>
          <Button size="lg" loading={saving} disabled={!!problem} onPress={() => onSave({
            serviceChargePct: n(f.servicePct), taxPct: n(f.taxPct), discount: n(f.discount), packagingFee: n(f.packing), tip: n(f.tip),
            ...(order.mode === 'DELIVERY' && { deliveryFee: n(f.deliveryFee) }),
            ...(n(f.guests) > 0 && { numberOfGuests: Math.round(n(f.guests)) }),
            waiterId: f.waiterId, customerName: f.customerName, customerPhone: f.customerPhone, specialRequests: f.note,
          })}>{t('Save karein')}</Button>
        </Row>
      }>
      <View style={{ gap: th.space(3) }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: th.space(3) }}>
          {num('servicePct', t('Service charge %'))}
          {num('taxPct', t('Tax %'))}
          {num('discount', t('Discount (Rs)'), t('Had se zyada ho to payment par PIN'))}
          {num('packing', t('Packing (Rs)'))}
          {order.mode === 'DELIVERY' && num('deliveryFee', t('Delivery charge (Rs)'))}
          {num('tip', t('Tip (Rs)'))}
          {order.mode === 'DINE_IN' && num('guests', t('Mehman'))}
        </View>
        {waiters.length > 0 && <Select label={t('Waiter')} value={f.waiterId} onChange={(v) => setF((x) => ({ ...x, waiterId: String(v) }))} options={[{ value: '', label: '—' }, ...waiters]} />}
        <Input label={t('Customer ka naam')} value={f.customerName} onChangeText={(v) => setF((x) => ({ ...x, customerName: v.slice(0, 120) }))} />
        <Input label={t('Phone')} value={f.customerPhone} onChangeText={(v) => setF((x) => ({ ...x, customerPhone: v.replace(/[^\d+\s-]/g, '').slice(0, 30) }))} keyboardType="phone-pad" ltr />
        <Input label={t('Order note')} value={f.note} onChangeText={(v) => setF((x) => ({ ...x, note: v.slice(0, 500) }))} />
        {problem && <Warn tone="danger">{problem}</Warn>}
      </View>
    </Sheet>
  );
}

/** Bring another open order (another table) into this bill. */
export function MergeSheet({ order, open, saving, onConfirm, onClose }: {
  order: RestaurantOrder; open: boolean; saving?: boolean; onConfirm: (fromOrderId: string) => void; onClose: () => void;
}) {
  const { data = [], isLoading } = useQuery({ queryKey: ['restaurant-orders-open-merge'], queryFn: () => ordersApi.list({ open: true }), enabled: open });
  const others = data.filter((o) => o.id !== order.id && !o.saleId && o.status !== 'CANCELLED' && o.status !== 'COMPLETED');
  const [pick, setPick] = useState('');
  const chosen = others.find((o) => o.id === pick);
  return (
    <Sheet open={open} onClose={onClose} height={0.75} title={t('{{order}} me doosra order milayein', { order: orderTitle(order) })}
      description={t('Doosre order ki dishes, kitchen tickets aur payment is bill me aa jayengi; us ki table khaali ho jayegi.')}
      footer={<Button size="lg" fullWidth loading={saving} disabled={!chosen} onPress={() => chosen && onConfirm(chosen.id)}>{chosen ? t('{{chosen}} milayein', { chosen: orderTitle(chosen) }) : t('Order chunein')}</Button>}>
      {isLoading ? <SkeletonRows count={4} /> : !others.length ? <EmptyState compact title={t('Koi aur khula order nahi')} /> : (
        <View>
          {others.map((o) => (
            <ListRow key={o.id} title={orderTitle(o)} subtitle={t('{{orderNumber}} · {{count}} item', { orderNumber: o.orderNumber, count: o.items.length })}
              trailing={<Amount value={o.total} weight="bold" />} selected={pick === o.id} onPress={() => setPick(o.id)} />
          ))}
        </View>
      )}
    </Sheet>
  );
}

/** Some guests pay for what they ate: the chosen dishes move to a separate bill on the same table. */
export function SplitItemsSheet({ order, open, saving, onConfirm, onClose }: {
  order: RestaurantOrder; open: boolean; saving?: boolean; onConfirm: (lines: Array<{ itemId: string; quantity: number }>) => void; onClose: () => void;
}) {
  const th = useTheme();
  const live = order.items.filter((it) => !it.isReturned && it.id);
  const [qty, setQty] = useState<Record<string, number>>({});
  useEffect(() => { if (open) setQty({}); }, [open]);
  const lines = useMemo(() => live.map((it) => ({ id: it.id!, quantity: it.quantity, total: it.total ?? 0 })), [live]);
  const amount = splitAmount(lines, qty);
  const problem = splitProblem(lines, qty);
  return (
    <Sheet open={open} onClose={onClose} height={0.85} title={t('Bill alag karein (dishes se)')} description={t('Jo dishes alag bill par jani hain un ki tadaad chunein. Service aur tax ka % saath jata hai.')}
      footer={
        <Row gap={3}>
          <View style={{ flex: 1 }}><Text size="xs" tone="muted">{t('Naya bill ~')}</Text><Amount value={amount} size="xl" weight="bold" /></View>
          <Button size="lg" loading={saving} disabled={!!problem} onPress={() => onConfirm(live.filter((it) => (qty[it.id!] ?? 0) > 0).map((it) => ({ itemId: it.id!, quantity: qty[it.id!] })))}>
            {problem === 'all' ? t('Kuch dishes pehle bill par rehni chahiye') : t('Alag bill banayein')}
          </Button>
        </Row>
      }>
      <View style={{ gap: th.space(1) }}>
        {live.map((it) => {
          const q = qty[it.id!] ?? 0;
          return (
            <Row key={it.id} gap={3} style={{ paddingVertical: th.space(2), borderBottomWidth: 1, borderBottomColor: th.colors.divider }}>
              <View style={{ flex: 1 }}>
                <Text weight="semibold" numberOfLines={1}>{`${it.quantity}× ${itemName(it)}`}</Text>
                {!!lineExtras(it) && <Text size="xs" tone="muted" numberOfLines={1}>{lineExtras(it)}</Text>}
              </View>
              <Stepper compact value={q} onMinus={() => setQty((x) => ({ ...x, [it.id!]: Math.max(0, q - 1) }))} onPlus={() => setQty((x) => ({ ...x, [it.id!]: Math.min(it.quantity, q + 1) }))} />
            </Row>
          );
        })}
      </View>
    </Sheet>
  );
}

/** Assign or change the rider of a delivery order. */
export function RiderSheet({ order, open, saving, onConfirm, onClose }: {
  order: RestaurantOrder; open: boolean; saving?: boolean; onConfirm: (riderId: string) => void; onClose: () => void;
}) {
  const { data: riders = [], isLoading } = useQuery({ queryKey: ['restaurant-riders', 'active'], queryFn: () => ridersApi.list({ active: true }), enabled: open });
  const [riderId, setRiderId] = useState(order.delivery?.riderId ?? '');
  useEffect(() => { if (open) setRiderId(order.delivery?.riderId ?? ''); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const free = riders.filter((r) => r.status === 'ACTIVE' || r.status === 'BUSY' || r.id === riderId);
  return (
    <Sheet open={open} onClose={onClose} title={t('Rider chunein')} description={t('Rider lagte hi order delivery board par \'Rider laga\' me aa jata hai')}
      footer={<Button size="lg" fullWidth disabled={!riderId} loading={saving} onPress={() => onConfirm(riderId)}>{t('Rider lagayein')}</Button>}>
      {isLoading ? <SkeletonRows count={3} /> : !free.length ? <EmptyState compact title={t('Koi rider duty par nahi.')} /> : (
        <Card flush>
          {free.map((r) => (
            <ListRow key={r.id} title={r.name} subtitle={`${r.phone}${r.vehicleNumber ? ` · ${r.vehicleNumber}` : ''}`} selected={riderId === r.id} onPress={() => setRiderId(r.id)}
              trailing={<Badge tone={r.status === 'BUSY' ? 'warning' : 'success'}>{r.status === 'BUSY' ? t('{{value}} trip par', { value: r.activeTrips ?? 1 }) : t('Free')}</Badge>} />
          ))}
        </Card>
      )}
    </Sheet>
  );
}
