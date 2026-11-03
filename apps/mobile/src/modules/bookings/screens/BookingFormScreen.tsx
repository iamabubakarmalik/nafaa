/**
 * New booking: pick or add the customer, add items by name, SKU or barcode,
 * set the pickup date, discount and advance, then save. Stock is not taken at
 * booking. Saving needs the server (bookings are not part of the offline queue).
 */

import { router } from 'expo-router';
import { Plus, Trash2, UserRound } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { useOfflineManifest, type PaymentMethod } from '@/core/offline';
import { Amount, Button, Card, DatePicker, FormSection, FormTemplate, ListRow, MoneyInput, Row, Text, TextArea, toast, useTheme } from '@/design';
import { MethodGrid, Stepper } from '@/modules/pos/components/parts';
import { CustomerPickerSheet, type PickedCustomer } from '@/modules/customers/components/CustomerPickerSheet';
import { useCostMask } from '@/modules/sales/lib/mask';
import { bookingsApi } from '../api/bookings';
import { ProductPickerSheet, type PickedProduct } from '../components/ProductPickerSheet';
import { refreshBookings } from '../components/BookingSheets';
import { qtyText } from '../lib/meta';

interface Line extends PickedProduct { key: string; quantity: number; lineDiscount: number }
const noon = (d: Date) => { const x = new Date(d); x.setHours(12, 0, 0, 0); return x; };

export function BookingFormScreen() {
  const th = useTheme();
  const online = useOnlineStatus();
  const manifest = useOfflineManifest();
  const { costHidden } = useCostMask();
  const currentShop = useAuthStore((s) => s.currentShopId);
  const shopId = currentShop && currentShop !== 'all' ? currentShop : manifest.data?.shops.find((s) => s.isMain)?.id ?? manifest.data?.shops[0]?.id ?? '';
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [pickup, setPickup] = useState<Date | null>(null);
  const [expires, setExpires] = useState<Date | null>(null);
  const [discount, setDiscount] = useState<number | null>(null);
  const [advance, setAdvance] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [internal, setInternal] = useState('');
  const [pickCustomer, setPickCustomer] = useState(false);
  const [pickProduct, setPickProduct] = useState(false);
  const [saving, setSaving] = useState(false);

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const lineOff = lines.reduce((s, l) => s + l.lineDiscount, 0);
  const billOff = discount ?? 0;
  const total = Math.max(subtotal - lineOff - billOff, 0);
  const adv = advance ?? 0;
  const balance = Math.max(total - adv, 0);
  const cost = lines.reduce((s, l) => s + l.costPrice * l.quantity, 0);
  const issues = useMemo(() => {
    const out: string[] = [];
    if (!customer) out.push(t('Customer chunein'));
    if (!lines.length) out.push(t('Kam se kam ek cheez dalein'));
    if (adv > total + 0.01) out.push(t('Advance kul se zyada nahi ho sakta'));
    if (billOff > subtotal - lineOff + 0.01) out.push(t('Discount kul se zyada hai'));
    if (pickup && expires && expires < pickup) out.push(t('Aakhri din pickup se pehle nahi ho sakta'));
    if (!shopId) out.push(t('Pehle branch chunein'));
    return out;
  }, [customer, lines.length, adv, total, billOff, subtotal, lineOff, pickup, expires, shopId]);
  const warnings = [
    ...(pickup && pickup.getTime() < Date.now() - 86_400_000 ? [t('Pickup ki date guzar chuki hai')] : []),
    ...(lines.length && !adv && !pickup ? [t('Advance ya pickup ki date me se ek zaroor rakhein')] : []),
    ...(!costHidden && cost > 0 && total - cost < 0 ? [t('Ghaate ki booking: cost {{cost}} hai', { cost: formatMoney(cost) })] : []),
    ...lines.filter((l) => l.stock != null && l.quantity > l.stock).map((l) => t('{{value}}: stock kam hai — sale se pehle maal mangwayein', { value: l.name })),
  ];

  const add = (p: PickedProduct) => {
    setPickProduct(false);
    setLines((prev) => {
      const same = prev.find((l) => l.productId === p.productId && l.variantId === p.variantId);
      if (same) return prev.map((l) => (l === same ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { ...p, key: `${Date.now()}-${prev.length}`, quantity: 1, lineDiscount: 0 }];
    });
  };
  const patch = (key: string, p: Partial<Line>) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...p } : l)));

  const submit = async () => {
    if (!online) return toast.warning(t('Booking likhne ke liye internet chahiye'));
    if (issues.length) return toast.warning(issues[0]);
    setSaving(true);
    try {
      const b = await bookingsApi.create({
        shopId, customerId: customer!.id, expectedPickupAt: pickup ? noon(pickup).toISOString() : undefined, expiresAt: expires ? noon(expires).toISOString() : undefined,
        discount: billOff || undefined, paymentMethod: method, initialAdvance: adv || undefined, notes: notes.trim() || undefined, internalNotes: internal.trim() || undefined,
        items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity, price: l.price, costPrice: l.costPrice, lineDiscount: l.lineDiscount || undefined })),
      });
      toast.success(t('Booking {{bookingNumber}} ban gayi', { bookingNumber: b.bookingNumber }));
      refreshBookings();
      setLines([]);
      setTimeout(() => router.replace(`/bookings/${b.id}` as never), 0);
    } catch (e) { toast.error(apiErrorMessage(e, t('Booking nahi bani'))); } finally { setSaving(false); }
  };

  return (
    <>
      <FormTemplate title={t('Nayi booking')} dirty={lines.length > 0 || !!customer} saving={saving} onSave={() => void submit()} saveLabel={t('Booking save karein')} saveDisabled={issues.length > 0}>
        <FormSection title={t('Customer')}>
          <ListRow icon={UserRound} title={customer?.name ?? t('Customer chunein')} subtitle={customer?.phone ?? undefined} chevron onPress={() => setPickCustomer(true)} />
        </FormSection>

        <FormSection title={t('Cheezen')}>
          {lines.map((l) => (
            <View key={l.key} style={{ gap: th.space(2), paddingBottom: th.space(2), borderBottomWidth: 1, borderBottomColor: th.colors.divider }}>
              <Row justify="between" gap={2}>
                <View style={{ flex: 1 }}><Text weight="semibold" numberOfLines={2}>{l.name}</Text>
                  <Text size="xs" tone="muted">{`${formatMoney(l.price)} / ${l.unit}`}{l.stock != null && l.quantity > l.stock ? `  ·  ${t('stock {{count}}', { count: Number(l.stock.toFixed(2)) })}` : ''}</Text></View>
                <Amount value={l.price * l.quantity - l.lineDiscount} weight="bold" />
                <Button size="sm" variant="ghost" icon={Trash2} onPress={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}>{''}</Button>
              </Row>
              <Row gap={2} justify="between">
                <Stepper value={l.quantity} unit={l.unit} compact onMinus={() => patch(l.key, { quantity: Math.max(0, +(l.quantity - 1).toFixed(3)) })} onPlus={() => patch(l.key, { quantity: +(l.quantity + 1).toFixed(3) })} />
                <View style={{ width: 130 }}><MoneyInput size="sm" value={l.price} onChangeValue={(v) => patch(l.key, { price: v ?? 0 })} /></View>
              </Row>
            </View>
          ))}
          <Row gap={2}>
            <Button style={{ flex: 1 }} variant="secondary" icon={Plus} onPress={() => setPickProduct(true)}>{t('Cheez dalein')}</Button>
          </Row>
          {lines.some((l) => l.quantity <= 0) && <Text size="sm" tone="danger">{t('Har cheez ki quantity likhein')}</Text>}
        </FormSection>

        <FormSection title={t('Waqt')}>
          <DatePicker label={t('Pickup')} value={pickup} onChange={setPickup} placeholder={t('Marzi hai')} />
          <DatePicker label={t('Aakhri din')} value={expires} onChange={setExpires} placeholder={t('Marzi hai')} hint={t('Is din tak na aaye to faisla karein')} />
        </FormSection>

        <FormSection title={t('Payment')}>
          <MoneyInput label={t('Discount')} value={discount} onChangeValue={setDiscount} />
          <MoneyInput label={t('Advance mila')} value={advance} onChangeValue={setAdvance} error={adv > total + 0.01 ? t('Advance kul se zyada nahi ho sakta') : undefined} />
          {adv > 0 && <MethodGrid value={method} onChange={setMethod} />}
          <Card>
            <View style={{ gap: 6 }}>
              <Row justify="between"><Text tone="secondary">{t('Subtotal')}</Text><Amount value={subtotal} /></Row>
              {lineOff + billOff > 0 && <Row justify="between"><Text tone="secondary">{t('Discount')}</Text><Amount value={-(lineOff + billOff)} tone="warning" /></Row>}
              <Row justify="between"><Text weight="bold">{t('Kul')}</Text><Amount value={total} weight="bold" size="lg" /></Row>
              <Row justify="between"><Text tone="secondary">{t('Baqi')}</Text><Amount value={balance} tone="warning" /></Row>
            </View>
          </Card>
        </FormSection>

        <FormSection title={t('Note')}>
          <TextArea label={t('Customer ke liye')} value={notes} onChangeText={setNotes} numberOfLines={2} />
          <TextArea label={t('Team ke liye')} value={internal} onChangeText={setInternal} numberOfLines={2} />
        </FormSection>
        {warnings.map((w) => <Text key={w} size="sm" tone="warning">{w}</Text>)}
        {!online && <Text size="sm" tone="muted">{t('Booking likhne ke liye internet chahiye')}</Text>}
      </FormTemplate>
      <CustomerPickerSheet open={pickCustomer} title={t('Customer chunein')} onPick={(c) => { setCustomer(c); setPickCustomer(false); }} onClose={() => setPickCustomer(false)} />
      <ProductPickerSheet open={pickProduct} onPick={add} onClose={() => setPickProduct(false)} />
    </>
  );
}
