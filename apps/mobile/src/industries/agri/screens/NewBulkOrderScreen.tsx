/** New bulk order (web NewBulkOrderPage): farmer, season and crop, items with rates, delivery, advance. Stock moves only when the order is delivered. */

import { router, useLocalSearchParams } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { orderTotals } from '@nafaa/core/industries/agri';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useQuery } from '@tanstack/react-query';
import { Amount, Button, Card, ChipGroup, DatePicker, DetailRow, FormSection, FormTemplate, IconButton, Input, MoneyInput, Row, Select, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { NumberInput } from '@/modules/inventory/components/fields';
import { OfflineNote, dateToKey, errorText, useDeskOnline } from '../../_shared/deskKit';
import { FarmerField } from '../components/FarmerField';
import { bulkOrdersApi, farmersApi, type Farmer } from '../api';
import { useAgriFacts } from '../facts';
import { AGRI_KEYS, AGRI_UNITS, PAY_METHODS, SEASONS, refreshAgri } from '../meta';

interface Line { key: string; productId?: string; productName: string; category?: string; unit: string; quantity: number | null; pricePerUnit: number | null; discount: number | null; bulkMin?: number; bulkPct?: number }
const seasonNow = () => { const m = new Date().getMonth() + 1; return m >= 4 && m <= 9 ? 'KHARIF' : 'RABI'; };
const lineTotal = (l: Line) => Math.max((l.quantity ?? 0) * (l.pricePerUnit ?? 0) - (l.discount ?? 0), 0);

export function NewBulkOrderScreen() {
  const th = useTheme();
  const { farmer: farmerParam } = useLocalSearchParams<{ farmer?: string }>();
  const { guard } = useDeskOnline('agriDesk');
  const facts = useAgriFacts();
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [walkIn, setWalkIn] = useState({ name: '', phone: '' });
  const [season, setSeason] = useState(seasonNow());
  const [crop, setCrop] = useState('');
  const [acres, setAcres] = useState<number | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [picking, setPicking] = useState(false);
  const [discount, setDiscount] = useState<number | null>(null);
  const [delivery, setDelivery] = useState({ on: false, address: '', charges: null as number | null, vehicle: '', date: null as string | null });
  const [other, setOther] = useState<number | null>(null);
  const [credit, setCredit] = useState(true);
  const [advance, setAdvance] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const mark = <T,>(fn: (v: T) => void) => (v: T) => { setDirty(true); fn(v); };

  const fq = useQuery({ queryKey: [AGRI_KEYS.farmer, farmerParam, 'one'], queryFn: () => farmersApi.getOne(farmerParam!), enabled: !!farmerParam });
  useEffect(() => { if (fq.data) setFarmer(fq.data); }, [fq.data]);
  useEffect(() => {
    if (!farmer) return;
    setAcres((a) => a ?? farmer.landAreaAcres ?? null);
    setCrop((c) => c || farmer.currentCrop || farmer.primaryCrops?.[0] || '');
    setDelivery((d) => ({ ...d, address: d.address || farmer.address || [farmer.village, farmer.district].filter(Boolean).join(', ') }));
  }, [farmer]);

  const setLine = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => {
    if (l.key !== key) return l;
    const next = { ...l, ...patch };
    // The product's bulk rate follows the quantity, as at the counter.
    if (patch.quantity !== undefined && next.bulkMin && next.bulkPct && patch.pricePerUnit === undefined) {
      const reached = (l.quantity ?? 0) >= next.bulkMin;
      const base = (l.pricePerUnit ?? 0) / (reached ? 1 - next.bulkPct / 100 : 1);
      const rate = (patch.quantity ?? 0) >= next.bulkMin ? base * (1 - next.bulkPct / 100) : base;
      next.pricePerUnit = Math.round(rate * 100) / 100;
    }
    return next;
  }));

  const totals = orderTotals(lines.map((l) => ({ quantity: l.quantity ?? 0, pricePerUnit: l.pricePerUnit ?? 0, discount: l.discount ?? 0 })), { bulkDiscount: discount ?? 0, deliveryCharges: delivery.on ? delivery.charges ?? 0 : 0, otherCharges: other ?? 0 });
  const adv = advance ?? 0;
  const problems: string[] = [];
  if (!farmer && !walkIn.name.trim()) problems.push(t('Farmer chunein ya naam likhein'));
  if (!lines.length) problems.push(t('Kam az kam ek cheez daalein'));
  lines.forEach((l) => {
    if (!((l.quantity ?? 0) > 0)) problems.push(t('{{productName}}: quantity likhein', { productName: l.productName }));
    if (l.pricePerUnit == null) problems.push(t('{{productName}}: rate likhein', { productName: l.productName }));
  });
  if ((discount ?? 0) > totals.subtotal) problems.push(t('Discount maal se zyada hai'));
  if (adv > totals.total + 0.01) problems.push(t('Advance kul se zyada hai'));
  if (credit && farmer?.status === 'SUSPENDED') problems.push(t('{{fullName}} ka udhaar roka hua hai — "Baqi udhaar me" band karein', { fullName: farmer.fullName }));

  const save = async () => {
    setTried(true);
    if (problems.length) { toast.error(problems[0]); return; }
    setSaving(true);
    try {
      const order = await bulkOrdersApi.create({
        farmerId: farmer?.id, customerName: farmer?.fullName ?? walkIn.name.trim(), customerPhone: farmer?.phone ?? (walkIn.phone.trim() || undefined), season, cropTarget: crop || undefined, landAreaAcres: acres ?? undefined,
        deliveryDate: delivery.date ?? undefined, isDelivery: delivery.on, deliveryAddress: delivery.on ? delivery.address || undefined : undefined, deliveryCharges: delivery.on ? delivery.charges ?? 0 : 0,
        vehicleNumber: delivery.on ? delivery.vehicle || undefined : undefined, bulkDiscount: discount ?? 0, otherCharges: other ?? 0, isCredit: credit, farmerNotes: notes.trim() || undefined,
        items: lines.map((l) => ({ productId: l.productId, productName: l.productName, category: l.category, unit: l.unit, quantity: l.quantity ?? 0, pricePerUnit: l.pricePerUnit ?? 0, discount: l.discount ?? 0 })),
      });
      let advanceSaved = true;
      if (adv > 0) { try { await bulkOrdersApi.addPayment(order.id, adv, method); } catch { advanceSaved = false; } }
      refreshAgri([AGRI_KEYS.orders, AGRI_KEYS.farmers], adv > 0);
      setDirty(false);
      if (advanceSaved) toast.success(t('Order {{orderNumber}} ban gaya{{value}}', { orderNumber: order.orderNumber, value: adv > 0 ? t(' — {{adv}} advance khate me', { adv: formatMoney(adv) }) : '' }));
      else toast.error(t('Order {{orderNumber}} ban gaya magar advance nahi likha — order khol kar "Advance" se dobara likhein', { orderNumber: order.orderNumber }));
      router.replace('/agri/bulk-orders' as never);
    } catch (e) { toast.error(errorText(e, t('Order nahi bana'))); } finally { setSaving(false); }
  };

  return (
    <FormTemplate title={t('Naya bulk order')} dirty={dirty} saving={saving} saveLabel={t('Order banayein')} onSave={() => guard(() => void save())}>
      <OfflineNote feature="agriDesk" />
      <FormSection title={t('Farmer')} description={t('Farmer chunein — order aur advance usi ke khate me jate hain. Naya ho to sirf naam aur phone likh dein.')}>
        <FarmerField value={farmer} onChange={mark(setFarmer)} error={tried && !farmer && !walkIn.name.trim() ? problems[0] : undefined} />
        {!farmer && (
          <>
            <Input label={t('Customer ka naam')} value={walkIn.name} onChangeText={(v) => mark(setWalkIn)({ ...walkIn, name: v })} hint={t('Isi naam/phone se customer khata banega')} />
            <Input label={t('Phone')} keyboardType="phone-pad" ltr value={walkIn.phone} onChangeText={(v) => mark(setWalkIn)({ ...walkIn, phone: v })} />
          </>
        )}
        <Text size="sm" weight="medium" tone="secondary">{t('Season')}</Text>
        <ChipGroup value={season} onChange={mark(setSeason)} options={SEASONS.map((s) => ({ value: s.value, label: `${s.emoji} ${t(s.label)}` }))} />
        <Input label={t('Fasal')} value={crop} onChangeText={mark(setCrop)} />
        <NumberInput label={t('Zameen (acre)')} value={acres} onChangeValue={mark(setAcres)} />
      </FormSection>

      <FormSection title={t('Maal')} description={t('Naam ya fasal likh kar maal chunein. Bulk rate wali cheez par quantity poori hote hi rate khud kam hota hai.')}>
        {lines.map((l) => (
          <Card key={l.key}>
            <Row justify="between" gap={2}><Text weight="semibold" style={{ flex: 1 }} numberOfLines={2}>{l.productName}</Text><IconButton icon={Trash2} label={t('Hatayein')} size="sm" variant="ghost" onPress={() => { setDirty(true); setLines((ls) => ls.filter((x) => x.key !== l.key)); }} /></Row>
            <Row gap={2}>
              <View style={{ flex: 1 }}><NumberInput label={t('Quantity')} value={l.quantity} onChangeValue={(v) => { setDirty(true); setLine(l.key, { quantity: v }); }} /></View>
              <View style={{ flex: 1 }}><Select label={t('Unit')} value={l.unit} onChange={(unit) => setLine(l.key, { unit })} options={[...new Set([l.unit, ...AGRI_UNITS.map((u) => u.value)])].map((u) => ({ value: u, label: AGRI_UNITS.find((x) => x.value === u) ? t(AGRI_UNITS.find((x) => x.value === u)!.label) : u }))} /></View>
            </Row>
            <Row gap={2}>
              <View style={{ flex: 1 }}><MoneyInput label={t('Rate')} value={l.pricePerUnit} onChangeValue={(v) => { setDirty(true); setLine(l.key, { pricePerUnit: v }); }} /></View>
              <View style={{ flex: 1 }}><MoneyInput label={t('Discount (Rs)')} value={l.discount} onChangeValue={(v) => { setDirty(true); setLine(l.key, { discount: v }); }} /></View>
            </Row>
            <Row justify="between"><Text size="xs" tone="muted">{l.bulkMin ? t('{{bulkDiscountThreshold}}+ par {{bulkDiscountPct}}%', { bulkDiscountThreshold: l.bulkMin, bulkDiscountPct: l.bulkPct }) : ''}</Text><Amount value={lineTotal(l)} weight="bold" /></Row>
          </Card>
        ))}
        <Button variant="secondary" icon={Plus} onPress={() => setPicking(true)}>{t('Cheez jorein')}</Button>
      </FormSection>

      <FormSection title={t('Delivery')}>
        <DatePicker label={t('Kab chahiye')} value={delivery.date ? new Date(`${delivery.date}T12:00:00`) : null} onChange={(d) => { setDirty(true); setDelivery({ ...delivery, date: dateToKey(d) }); }} />
        <Switch value={delivery.on} onChange={(on) => { setDirty(true); setDelivery({ ...delivery, on }); }} label={t('Gaon tak pohanchana hai')} />
        {delivery.on && (
          <>
            <Input label={t('Pata')} value={delivery.address} onChangeText={(address) => { setDirty(true); setDelivery({ ...delivery, address }); }} placeholder={t('Chak, raasta')} />
            <MoneyInput label={t('Kiraya (Rs)')} value={delivery.charges} onChangeValue={(charges) => { setDirty(true); setDelivery({ ...delivery, charges }); }} hint={t('Kiraya bill me jurta hai')} />
            <Input label={t('Gaari number')} value={delivery.vehicle} onChangeText={(vehicle) => { setDirty(true); setDelivery({ ...delivery, vehicle }); }} placeholder="LHR-1234" ltr autoCapitalize="characters" />
          </>
        )}
      </FormSection>

      <FormSection title={t('Hisaab')}>
        <MoneyInput label={t('Discount (Rs)')} value={discount} onChangeValue={mark(setDiscount)} error={tried && (discount ?? 0) > totals.subtotal ? t('Discount maal se zyada hai') : undefined} />
        <MoneyInput label={t('Doosre charges')} value={other} onChangeValue={mark(setOther)} hint={t('Loading, mazdoori')} />
        <Switch value={credit} onChange={mark(setCredit)} label={t('Baqi season ke udhaar me')} />
        <MoneyInput label={t('Advance abhi (Rs)')} value={advance} onChangeValue={mark(setAdvance)} hint={t('Jo paisa abhi mila wo likhein — aaj ki day book me aata hai. Baqi pahunchne par season ke udhaar me jata hai.')} error={tried && adv > totals.total + 0.01 ? t('Advance kul se zyada hai') : undefined} />
        {adv > 0 && <ChipGroup wrap value={method} onChange={setMethod} options={PAY_METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} />}
        <Card flush>
          <DetailRow label={t('Maal')} value={formatMoney(totals.subtotal)} />
          <DetailRow label={t('Kul')} value={<Amount value={totals.total} weight="bold" />} />
          <DetailRow label={t('Advance')} value={formatMoney(adv)} />
          <DetailRow label={t('Baqi')} value={<Amount value={Math.max(totals.total - adv, 0)} weight="bold" tone="danger" />} last />
        </Card>
        <TextArea label={t('Note')} value={notes} onChangeText={mark(setNotes)} placeholder={t('Farmer ki farmaish, delivery ka waqt…')} />
      </FormSection>

      <ProductPicker open={picking} onClose={() => setPicking(false)} title={t('Maal')} variants={false} includeRaw={false}
        onPick={({ product }) => {
          const f = facts.get(product.id);
          const bulk = Number(f?.bulkDiscountThreshold) > 0 && Number(f?.bulkDiscountPct) > 0;
          setDirty(true);
          setLines((ls) => [...ls, { key: `${product.id}-${Date.now()}`, productId: product.id, productName: product.name, category: f?.category, unit: product.unit || 'bag', quantity: 1, pricePerUnit: product.price, discount: null, bulkMin: bulk ? Number(f!.bulkDiscountThreshold) : undefined, bulkPct: bulk ? Number(f!.bulkDiscountPct) : undefined }]);
          setPicking(false);
        }}
        onCreate={(name) => { setDirty(true); setLines((ls) => [...ls, { key: `x-${Date.now()}`, productName: name, unit: 'bag', quantity: 1, pricePerUnit: null, discount: null }]); setPicking(false); }} />
      <View style={{ height: th.space(4) }} />
    </FormTemplate>
  );
}
