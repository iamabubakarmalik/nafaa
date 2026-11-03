/** New or edit weight order (web NewWeightOrderPage): customer, items with kg and rate, cutting, when and where, discount and an advance taken now. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Building2, Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { orderTotals } from '@nafaa/core/industries/meat';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Button, Card, ChipGroup, DatePicker, DetailRow, FormSection, FormTemplate, IconButton, Input, ListRow, MoneyInput, Row, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { CustomerPickerSheet, type PickedCustomer } from '@/modules/customers/components/CustomerPickerSheet';
import { NumberInput } from '@/modules/inventory/components/fields';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { OfflineNote, dateToKey, errorText, keyToDate, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { weightOrdersApi, wholesaleApi, type OrderInput } from '../api';
import { CUT_STYLES, MEAT_KEYS, OCCASIONS, PAY_METHODS, kg, opt, phoneOk, refreshMeat } from '../meta';

interface Line { productId: string; name: string; kg: number | null; rate: number | null; note: string; unit: string }
const stamp = (dayKey: string | null, time: Date | null) => {
  if (!dayKey) return null;
  const hh = time ? String(time.getHours()).padStart(2, '0') : '12';
  const mm = time ? String(time.getMinutes()).padStart(2, '0') : '00';
  return new Date(`${dayKey}T${hh}:${mm}:00+05:00`).toISOString();
};

export function WeightOrderFormScreen() {
  const th = useTheme();
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const { guard } = useDeskOnline('meatDesk');
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [pickCustomer, setPickCustomer] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [picking, setPicking] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<Date | null>(null);
  const [isDelivery, setIsDelivery] = useState(false);
  const [address, setAddress] = useState('');
  const [deliveryCharges, setDeliveryCharges] = useState<number | null>(null);
  const [discount, setDiscount] = useState<number | null>(null);
  const [occasion, setOccasion] = useState('');
  const [cuttingStyle, setCuttingStyle] = useState('');
  const [notes, setNotes] = useState('');
  const [advance, setAdvance] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const mark = <T,>(fn: (v: T) => void) => (v: T) => { setDirty(true); fn(v); };

  const existing = useQuery({ queryKey: [MEAT_KEYS.orders, 'one', editId], queryFn: () => weightOrdersApi.getOne(editId!), enabled: !!editId, staleTime: 0 });
  const account = useQuery({ queryKey: [MEAT_KEYS.wholesale, 'by-customer', customer?.id], queryFn: () => wholesaleApi.byCustomer(customer!.id).catch(() => null), enabled: !!customer?.id && !editId });
  useEffect(() => {
    const o = existing.data;
    if (!o) return;
    setCustomer(o.customerId ? { id: o.customerId, name: o.customerName ?? t('Customer'), phone: o.customerPhone ?? null, balance: 0, creditLimit: 0 } : null);
    setName(o.customerName ?? ''); setPhone(o.customerPhone ?? '');
    setLines(o.items.map((i) => ({ productId: i.productId ?? '', name: i.productName, kg: i.requestedKg, rate: i.pricePerKg, note: i.cuttingInstructions ?? '', unit: 'kg' })));
    if (o.neededBy) { setDay(dateToKey(new Date(o.neededBy))); setTime(new Date(o.neededBy)); }
    setIsDelivery(o.isDelivery); setAddress(o.deliveryAddress ?? ''); setDeliveryCharges(o.deliveryCharges || null); setDiscount(o.discount || null);
    setOccasion(o.occasion ?? ''); setCuttingStyle(o.cuttingStyle ?? ''); setNotes(o.specialInstructions ?? '');
    setDirty(false);
  }, [existing.data]);

  const totals = orderTotals(lines.map((l) => ({ kg: l.kg ?? 0, rate: l.rate ?? 0 })), { deliveryCharges: isDelivery ? deliveryCharges ?? 0 : 0, discount: discount ?? 0 });
  const paid = existing.data?.paidAmount ?? 0;
  const acc = account.data?.isActive ? account.data : null;
  const accDiscount = acc ? Math.round(totals.subtotal * acc.discountPct) / 100 : 0;

  const errors: Record<string, string> = {};
  if (!customer && !name.trim() && !phone.trim()) errors.customer = t('Customer chunein ya naam / phone likhein');
  if (!phoneOk(phone)) errors.phone = t('Phone theek likhein (03xx-xxxxxxx)');
  if (!lines.length) errors.lines = t('Kam se kam ek item jorein');
  lines.forEach((l, i) => { if (!((l.kg ?? 0) > 0)) errors[`kg${i}`] = t('Kg likhein'); if (!((l.rate ?? 0) > 0)) errors[`rate${i}`] = t('Rate likhein'); });
  if (isDelivery && !address.trim()) errors.address = t('Delivery ka pata likhein');
  if ((discount ?? 0) > totals.subtotal + (deliveryCharges ?? 0)) errors.discount = t('Discount order se zyada nahi ho sakta');
  if (!editId && (advance ?? 0) > totals.total + 0.005) errors.advance = t('Advance order ({{formatPKR}}) se zyada nahi ho sakta', { formatPKR: formatMoney(totals.total) });
  if (editId && totals.total + 0.005 < paid) errors.total = t('{{formatPKR}} advance mil chuka — order is se kam nahi ho sakta', { formatPKR: formatMoney(paid) });
  const show = (k: string) => (tried ? errors[k] : undefined);

  const save = async () => {
    setTried(true);
    const first = Object.values(errors)[0];
    if (first) { toast.error(first); return; }
    const body: OrderInput = {
      customerId: customer?.id ?? null, customerName: customer?.name ?? opt(name), customerPhone: (customer?.phone ?? phone.trim()) || undefined, neededBy: stamp(day, time), isDelivery,
      deliveryAddress: isDelivery ? address.trim() : undefined, deliveryCharges: isDelivery ? deliveryCharges ?? 0 : 0, discount: discount ?? 0, occasion: opt(occasion), cuttingStyle: opt(cuttingStyle), specialInstructions: opt(notes),
      items: lines.map((l) => ({ productId: l.productId, requestedKg: l.kg ?? 0, pricePerKg: l.rate ?? 0, cuttingInstructions: opt(l.note) })),
    };
    setSaving(true);
    try {
      const o = editId ? await weightOrdersApi.update(editId, body) : await weightOrdersApi.create({ ...body, advance: advance ?? 0, paymentMethod: method });
      refreshMeat([MEAT_KEYS.orders], !editId && (advance ?? 0) > 0);
      setDirty(false);
      toast.success(editId ? t('{{orderNumber}} badal diya', { orderNumber: o.orderNumber }) : t('Order {{orderNumber}} ban gaya', { orderNumber: o.orderNumber }));
      router.replace('/meat/weight-orders' as never);
    } catch (e) { toast.error(errorText(e, t('Order save nahi hua'))); } finally { setSaving(false); }
  };

  const setLine = (i: number, patch: Partial<Line>) => { setDirty(true); setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l))); };
  return (
    <FormTemplate title={editId ? t('Order {{value}} badlein', { value: existing.data?.orderNumber ?? '' }) : t('Naya wazan wala order')} dirty={dirty} saving={saving} saveLabel={editId ? t('Badlav save karein') : t('Order save karein')} onSave={() => guard(() => void save())}>
      <OfflineNote feature="meatDesk" />
      <FormSection title={t('Customer')} description={t('Purana customer chunein — khata usi ka. Naya ho to naam aur phone kaafi hai')}>
        <Card flush tone={show('customer') ? 'danger' : 'default'}>
          <ListRow icon={Building2} title={customer ? customer.name : t('Customer chunein')} subtitle={customer?.phone ?? t('Naam ya phone likhein')} chevron={!editId} onPress={editId ? undefined : () => setPickCustomer(true)} />
        </Card>
        {customer && !editId && <Button variant="ghost" onPress={() => { setCustomer(null); setDirty(true); }}>{t('Hatayein')}</Button>}
        {!customer && (
          <>
            <Input label={t('Ya naam (walk-in)')} value={name} onChangeText={mark(setName)} placeholder={t('Ahmed sahab')} maxLength={120} error={show('customer')} />
            <Input label={t('Phone')} keyboardType="phone-pad" ltr value={phone} onChangeText={mark(setPhone)} hint={t('Tayyar hone par isi par batayein')} error={show('phone')} />
          </>
        )}
        {acc && (
          <Card tone="info">
            <Text size="sm" weight="medium">{t('{{businessName}} — wholesale account{{value}}', { businessName: acc.businessName, value: acc.discountPct ? t(', {{discountPct}}% discount', { discountPct: acc.discountPct }) : '' })}</Text>
            {acc.discountPct > 0 && <Button size="sm" variant="soft" onPress={() => { setDiscount(accDiscount); setDirty(true); }}>{t('Lagayein')}</Button>}
          </Card>
        )}
      </FormSection>

      <FormSection title={t('Kya chahiye')} description={t('Rate aaj ka lagta hai; is order ke liye badal sakte hain')}>
        {lines.map((l, i) => (
          <Card key={`${l.productId}-${i}`}>
            <Row justify="between" gap={2}><Text weight="semibold" style={{ flex: 1 }} numberOfLines={2}>{l.name}</Text><IconButton icon={Trash2} label={t('Hatayein')} size="sm" variant="ghost" onPress={() => { setDirty(true); setLines((ls) => ls.filter((_, j) => j !== i)); }} /></Row>
            <Row gap={2}>
              <View style={{ flex: 1 }}><NumberInput label={t('Kitne {{unit}}', { unit: l.unit })} value={l.kg} onChangeValue={(v) => setLine(i, { kg: v })} error={show(`kg${i}`)} autoFocus={!l.kg && i === lines.length - 1} /></View>
              <View style={{ flex: 1 }}><MoneyInput label={t('Rate')} value={l.rate} onChangeValue={(v) => setLine(i, { rate: v })} error={show(`rate${i}`)} /></View>
            </Row>
            <Input label={t('Hidayat')} value={l.note} onChangeText={(v) => setLine(i, { note: v })} maxLength={300} placeholder={t('Hidayat: chhoti boti, charbi alag…')} />
            <Row justify="end"><Amount value={(l.kg ?? 0) * (l.rate ?? 0)} weight="bold" /></Row>
          </Card>
        ))}
        {!!show('lines') && <Text size="xs" tone="danger">{errors.lines}</Text>}
        <Button variant="secondary" icon={Plus} onPress={() => setPicking(true)}>{t('Item jorein')}</Button>
        <Text size="sm" weight="medium" tone="secondary">{t('Cutting kaisi')}</Text>
        <ChipGroup wrap value={cuttingStyle} onChange={(v) => { setCuttingStyle(cuttingStyle === v ? '' : v); setDirty(true); }} options={CUT_STYLES.map((c) => ({ value: t(c), label: t(c) }))} />
      </FormSection>

      <FormSection title={t('Kab aur kahan')}>
        <DatePicker label={t('Kab chahiye')} value={keyToDate(day)} onChange={(d) => { setDay(dateToKey(d)); setDirty(true); }} minimumDate={keyToDate(todayKey()) ?? undefined} hint={t('Isi se Aaj dene aur Late ka pata chalta hai')} />
        <DatePicker mode="time" label={t('Waqt')} value={time} onChange={(d) => { setTime(d); setDirty(true); }} />
        <Text size="sm" weight="medium" tone="secondary">{t('Mauqa (marzi)')}</Text>
        <ChipGroup wrap value={occasion} onChange={(v) => { setOccasion(occasion === v ? '' : v); setDirty(true); }} options={OCCASIONS.map((c) => ({ value: t(c), label: t(c) }))} />
        <Switch value={isDelivery} onChange={mark(setIsDelivery)} label={t('Ghar / restaurant par pohanchana hai')} />
        {isDelivery && (
          <>
            <Input label={t('Pata')} value={address} onChangeText={mark(setAddress)} maxLength={1000} placeholder={t('Ghar #, gali, mohalla')} error={show('address')} />
            <MoneyInput label={t('Delivery charge')} value={deliveryCharges} onChangeValue={mark(setDeliveryCharges)} />
          </>
        )}
        <TextArea label={t('Note (marzi)')} value={notes} onChangeText={mark(setNotes)} maxLength={2000} placeholder={t('Subah 9 baje se pehle, gate par call karein…')} />
      </FormSection>

      <FormSection title={t('Hisaab')}>
        <Card flush>
          <DetailRow label={t('Items')} value={formatMoney(totals.subtotal)} />
          {isDelivery && <DetailRow label={t('Delivery')} value={formatMoney(deliveryCharges ?? 0)} />}
          <DetailRow label={t('Wazan')} value={kg(lines.reduce((s, l) => s + (l.kg ?? 0), 0))} />
          <DetailRow label={t('Kul')} value={<Amount value={totals.total} weight="bold" />} last />
        </Card>
        <MoneyInput label={t('Discount')} value={discount} onChangeValue={mark(setDiscount)} error={show('discount')} />
        {!!show('total') && <Text size="xs" tone="danger">{errors.total}</Text>}
        {editId ? (
          <Card><Text size="sm">{t('Mil chuka:')} <Text weight="bold" ltr>{formatMoney(paid)}</Text></Text><Text size="xs" tone="muted">{t('Mazeed advance orders ki list se "Paisa mila" se lein.')}</Text></Card>
        ) : (
          <>
            <MoneyInput label={t('Advance')} value={advance} onChangeValue={mark(setAdvance)} hint={t('Abhi jo mila — aaj ke galle aur customer ke khate me jata hai')} error={show('advance')} />
            <ChipGroup value="" onChange={(v) => { setAdvance(Math.round(totals.total * Number(v))); setDirty(true); }} options={[{ value: '0.5', label: t('Aadha') }, { value: '1', label: t('Poora') }]} />
            {(advance ?? 0) > 0 && <ChipGroup wrap value={method} onChange={setMethod} options={PAY_METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} />}
          </>
        )}
      </FormSection>

      <ProductPicker open={picking} onClose={() => setPicking(false)} title={t('Item jorein')} variants={false} includeRaw={false} pickedIds={new Set(lines.map((l) => l.productId))}
        onPick={({ product }) => { setDirty(true); setLines((ls) => [...ls, { productId: product.id, name: product.name, kg: null, rate: product.price, note: '', unit: product.unit || 'kg' }]); setPicking(false); }} />
      <CustomerPickerSheet open={pickCustomer} title={t('Customer chunein')} onPick={(c) => { setCustomer(c); setPickCustomer(false); setDirty(true); }} onClose={() => setPickCustomer(false)} />
      <View style={{ height: th.space(4) }} />
    </FormTemplate>
  );
}
