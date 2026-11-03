/**
 * New or edited stitching order (web NewTailoringOrderPage): customer and
 * measurement, the garments with fabric and stitching rates, due date,
 * priority, karigar, discount, and the advance taken now. The total is worked
 * out as you type and checked before saving.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus, Ruler, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { r2 } from '@nafaa/core/industries/garments';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Button, Chip, ChipGroup, DatePicker, FormSection, FormTemplate, IconButton, Input, ListRow, MoneyInput, Row, Segmented, Select, Text, TextArea, toast, useTheme } from '@/design';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { measurementsApi, tailoringApi, type Priority, type TailoringInput, type TailoringOrder } from '../api';
import { CustomerBox, TailorSelect, emptyCustomer, type CustomerValue } from '../components/kit';
import { GARMENT_TYPES, MEASURE_KEY, PRIORITIES, TAILORING_KEY, dateISO, garmentLabel, opt, plusDays, refreshGarments } from '../meta';

interface Line {
  key: string; categoryType: string; garmentName: string; quantity: number | null; size: string; colorName: string; fabricFrom: 'customer' | 'shop' | 'stock';
  fabric?: { productId: string; variantId?: string; name: string; price: number }; fabricMeters: number | null; fabricCost: number | null;
  stitching: number | null; embroidery: number | null; accessory: number | null; designNotes: string;
}
let seq = 0;
const newLine = (): Line => ({ key: `n${++seq}`, categoryType: 'SHALWAR_KAMEEZ', garmentName: '', quantity: 1, size: '', colorName: '', fabricFrom: 'customer', fabricMeters: null, fabricCost: null, stitching: null, embroidery: null, accessory: null, designNotes: '' });
const qtyOf = (l: Line) => Math.max(Math.floor(l.quantity ?? 1), 1);
const fabricOf = (l: Line) => (l.fabricFrom === 'customer' ? 0 : l.fabricFrom === 'stock' ? r2((l.fabricMeters ?? 0) * (l.fabric?.price ?? 0)) : l.fabricCost ?? 0);
const lineTotal = (l: Line) => r2(((l.stitching ?? 0) + (l.embroidery ?? 0) + (l.accessory ?? 0)) * qtyOf(l) + fabricOf(l));
const QUICK_DAYS = [3, 5, 7, 10, 15];

export function TailoringFormScreen() {
  const th = useTheme();
  const params = useLocalSearchParams<{ edit?: string; customer?: string; naap?: string }>();
  const editId = params.edit;
  const orderQ = useQuery({ queryKey: [TAILORING_KEY, 'one', editId], queryFn: () => tailoringApi.getOne(editId!), enabled: !!editId });
  const order = orderQ.data;

  const [customer, setCustomer] = useState<CustomerValue>(emptyCustomer);
  const [profileId, setProfileId] = useState('');
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [promised, setPromised] = useState<Date | null>(plusDays(7));
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [tailorId, setTailorId] = useState('');
  const [design, setDesign] = useState('');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState<number | null>(null);
  const [advance, setAdvance] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [startAs, setStartAs] = useState<'CONFIRMED' | 'QUOTED'>('CONFIRMED');
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!order) return;
    setCustomer({ customerId: order.customerId ?? '', name: order.customerName ?? '', phone: order.customerPhone ?? '', balance: order.customer?.balance });
    setProfileId(order.measurementProfileId ?? '');
    setLines(order.items.map((i) => ({
      key: i.id, categoryType: i.categoryType ?? 'OTHER', garmentName: i.garmentName, quantity: i.quantity, size: i.size ?? '', colorName: i.colorName ?? '',
      fabricFrom: i.fabricProductId ? 'stock' : i.fabricCost > 0 ? 'shop' : 'customer',
      fabric: i.fabricProductId ? { productId: i.fabricProductId, variantId: i.fabricVariantId ?? undefined, name: i.fabricName ?? t('Kapra'), price: i.fabricMeters ? r2(i.fabricCost / i.fabricMeters) : 0 } : undefined,
      fabricMeters: i.fabricMeters ?? null, fabricCost: i.fabricCost || null,
      stitching: i.quantity ? r2(i.stitchingCost / i.quantity) || null : null, embroidery: i.quantity ? r2(i.embroideryCost / i.quantity) || null : null,
      accessory: i.quantity ? r2(i.accessoryCost / i.quantity) || null : null, designNotes: i.designNotes ?? '',
    })));
    setPromised(order.promisedDate ? new Date(order.promisedDate) : null);
    setPriority(order.priority); setTailorId(order.tailorId ?? ''); setDesign(order.designInstructions ?? ''); setNotes(order.internalNotes ?? '');
    setDiscount(order.discount || null);
  }, [order]);

  useEffect(() => { if (params.customer && !editId && params.naap) setProfileId(params.naap); }, [params.customer, params.naap, editId]);

  const profilesQ = useQuery({ queryKey: [MEASURE_KEY, 'customer', customer.customerId], queryFn: () => measurementsApi.byCustomer(customer.customerId), enabled: !!customer.customerId });
  const profiles = profilesQ.data ?? [];
  useEffect(() => {
    if (!profiles.length || profileId) return;
    setProfileId((profiles.find((p) => p.isDefault) ?? profiles[0]).id);
  }, [profiles, profileId]);

  const edit = (patch: Partial<Line>, key: string) => { setDirty(true); setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l))); };
  const subtotal = r2(lines.reduce((s, l) => s + lineTotal(l), 0));
  const disc = r2(discount ?? 0);
  const total = r2(Math.max(subtotal - disc, 0));
  const adv = r2(advance ?? 0);
  const paidBefore = Number(order?.paidAmount ?? 0);
  const editing = !!editId;

  const problems = useMemo(() => {
    const out: string[] = [];
    if (!customer.customerId && !customer.name.trim()) out.push(t('Customer ka naam likhein'));
    lines.forEach((l, i) => {
      const tag = l.garmentName.trim() || t('Kapra {{n}}', { n: i + 1 });
      if (!l.garmentName.trim()) out.push(t('Kapra {{n}}: naam likhein', { n: i + 1 }));
      if (l.fabricFrom === 'stock' && !l.fabric) out.push(t('{{tag}}: dukaan ka kapra chunein', { tag }));
      if (l.fabricFrom === 'stock' && !((l.fabricMeters ?? 0) > 0)) out.push(t('{{tag}}: kitne meter kapra lagega', { tag }));
      if (lineTotal(l) <= 0) out.push(t('{{tag}}: silai ka rate likhein', { tag }));
    });
    if (disc > subtotal) out.push(t('Discount kul amount se zyada nahi ho sakta'));
    if (!editing && adv > total + 0.01) out.push(t('Advance {{total}} se zyada nahi ho sakta', { total: formatMoney(total) }));
    if (editing && total + 0.01 < paidBefore) out.push(t('{{paid}} pehle mil chuke — kul is se kam nahi ho sakta', { paid: formatMoney(paidBefore) }));
    return out;
  }, [customer, lines, disc, subtotal, adv, total, editing, paidBefore]);

  const save = useMutation({
    mutationFn: async (): Promise<TailoringOrder> => {
      const items = lines.map((l) => ({
        garmentName: l.garmentName.trim(), categoryType: l.categoryType || undefined, quantity: qtyOf(l), size: opt(l.size), colorName: opt(l.colorName), designNotes: opt(l.designNotes),
        stitchingCost: l.stitching ?? 0, embroideryCost: l.embroidery ?? 0, accessoryCost: l.accessory ?? 0, fabricCost: fabricOf(l),
        ...(l.fabricFrom === 'stock' && l.fabric ? { fabricProductId: l.fabric.productId, fabricVariantId: l.fabric.variantId, fabricMeters: l.fabricMeters ?? 0 } : {}),
      }));
      const body = {
        customerId: customer.customerId || undefined, customerName: customer.name.trim() || undefined, customerPhone: opt(customer.phone),
        measurementProfileId: profileId || undefined, priority, tailorId: tailorId || undefined, promisedDate: dateISO(promised), discount: disc,
        designInstructions: opt(design), internalNotes: opt(notes), items,
      };
      if (editing) return tailoringApi.update(editId!, body);
      const input: TailoringInput = { ...body, status: startAs, ...(adv > 0 ? { advanceAmount: adv, advanceMethod: method } : {}) };
      return tailoringApi.create(input);
    },
    onSuccess: (o) => {
      refreshGarments([TAILORING_KEY, MEASURE_KEY], true);
      toast.success(editing ? t('{{orderNumber}} badal gaya', { orderNumber: o.orderNumber }) : t('Order {{orderNumber}} ban gaya', { orderNumber: o.orderNumber }));
      setDirty(false);
      router.replace(`/garments/tailoring/${o.id}` as never);
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Order save nahi hua'))),
  });
  const submit = () => {
    setTouched(true);
    if (problems.length) { toast.warning(problems[0]); return; }
    save.mutate();
  };

  return (
    <FormTemplate title={editing ? t('Edit order') : t('Naya silai order')} dirty={dirty} saving={save.isPending} onSave={submit} saveLabel={editing ? t('Save') : startAs === 'QUOTED' ? t('Rate bataya') : t('Order pakka karein')}>
      <FormSection title={t('Customer')}>
        <CustomerBox value={customer} onChange={(v) => { setDirty(true); setCustomer(v); if (v.customerId !== customer.customerId) setProfileId(''); }} locked={editing && paidBefore > 0}
          error={touched && !customer.customerId && !customer.name.trim() ? t('Customer ka naam likhein') : undefined} />
        {!!customer.customerId && (
          <View style={{ gap: th.space(2) }}>
            <Text size="sm" weight="semibold" tone="secondary">{t('Measurement')}</Text>
            {profiles.length > 0 ? (
              <ChipGroup wrap value={profileId} onChange={(v) => { setDirty(true); setProfileId(v); }} options={profiles.map((p) => ({ value: p.id, label: p.profileName }))} />
            ) : <Text size="sm" tone="muted">{t('Is customer ka naap nahi liya')}</Text>}
            <Button variant="soft" icon={Ruler} onPress={() => router.push({ pathname: '/garments/measurements/new', params: { customerId: customer.customerId } } as never)}>{t('Naya naap lein')}</Button>
          </View>
        )}
      </FormSection>

      <FormSection title={t('Kapre')}>
        {lines.map((l, i) => (
          <View key={l.key} style={{ gap: th.space(2), paddingBottom: th.space(3), borderBottomWidth: i < lines.length - 1 ? 1 : 0, borderBottomColor: th.colors.divider }}>
            <Row gap={2} style={{ alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Select label={t('Kapre ki type')} value={l.categoryType} searchable options={GARMENT_TYPES.map((g) => ({ value: g.value, label: t(g.label) }))}
                  onChange={(v) => edit({ categoryType: v, garmentName: l.garmentName || garmentLabel(v) }, l.key)} />
              </View>
              {lines.length > 1 && <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => { setDirty(true); setLines(lines.filter((x) => x.key !== l.key)); }} />}
            </Row>
            <Input label={t('Naam')} value={l.garmentName} onChangeText={(v) => edit({ garmentName: v }, l.key)} error={touched && !l.garmentName.trim() ? t('Kapra {{n}}: naam likhein', { n: i + 1 }) : undefined} />
            <Row gap={2}>
              <Input containerStyle={{ flex: 1 }} label={t('Piece')} value={String(l.quantity ?? '')} keyboardType="number-pad" onChangeText={(v) => edit({ quantity: v ? Number(v.replace(/\D/g, '')) : null }, l.key)} />
              <Input containerStyle={{ flex: 1 }} label={t('Size')} value={l.size} onChangeText={(v) => edit({ size: v }, l.key)} />
              <Input containerStyle={{ flex: 1 }} label={t('Rang')} value={l.colorName} onChangeText={(v) => edit({ colorName: v }, l.key)} />
            </Row>
            <Text size="sm" weight="semibold" tone="secondary">{t('Kapra kahan se')}</Text>
            <Segmented value={l.fabricFrom} onChange={(v) => edit({ fabricFrom: v }, l.key)}
              options={[{ value: 'customer', label: t('Customer ka') }, { value: 'shop', label: t('Dukaan se') }, { value: 'stock', label: t('Stock se') }]} />
            {l.fabricFrom === 'stock' && (
              <>
                <ListRow dense title={l.fabric?.name ?? t('Kapra chunein')} chevron onPress={() => setPickFor(l.key)} />
                <MoneyInput label={t('Kitne meter')} value={l.fabricMeters} onChangeValue={(v) => edit({ fabricMeters: v }, l.key)} prefix="" hint={l.fabric ? t('{{name}} — {{rate}} har meter', { name: l.fabric.name, rate: formatMoney(l.fabric.price) }) : undefined} />
              </>
            )}
            {l.fabricFrom === 'shop' && <MoneyInput label={t('Kapre ki qeemat')} value={l.fabricCost} onChangeValue={(v) => edit({ fabricCost: v }, l.key)} />}
            <Row gap={2}>
              <MoneyInput containerStyle={{ flex: 1 }} label={t('Silai')} value={l.stitching} onChangeValue={(v) => edit({ stitching: v }, l.key)} />
              <MoneyInput containerStyle={{ flex: 1 }} label={t('Kadhai')} value={l.embroidery} onChangeValue={(v) => edit({ embroidery: v }, l.key)} />
              <MoneyInput containerStyle={{ flex: 1 }} label={t('Accessory')} value={l.accessory} onChangeValue={(v) => edit({ accessory: v }, l.key)} />
            </Row>
            <Input label={t('Design notes')} value={l.designNotes} onChangeText={(v) => edit({ designNotes: v }, l.key)} />
            <Row style={{ justifyContent: 'space-between' }}><Text size="sm" tone="secondary">{t('Is kapre ka total')}</Text><Amount value={lineTotal(l)} weight="bold" /></Row>
          </View>
        ))}
        <Button variant="soft" icon={Plus} onPress={() => { setDirty(true); setLines([...lines, newLine()]); }}>{t('Aur kapra jorein')}</Button>
      </FormSection>

      <FormSection title={t('Dene ki date')}>
        <DatePicker label={t('Kab dena hai')} value={promised} onChange={(d) => { setDirty(true); setPromised(d); }} />
        <ChipGroup wrap value="" onChange={(v) => { setDirty(true); setPromised(plusDays(Number(v))); }} options={QUICK_DAYS.map((d) => ({ value: String(d), label: t('{{d}} din', { d }) }))} />
        <ChipGroup wrap value={priority} onChange={(v) => { setDirty(true); setPriority(v); }} options={PRIORITIES.map((p) => ({ value: p.value, label: t(p.label) }))} />
        <TailorSelect value={tailorId} onChange={(v) => { setDirty(true); setTailorId(v); }} />
        <TextArea label={t('Design ki hidayat')} value={design} onChangeText={(v) => { setDirty(true); setDesign(v); }} />
        <TextArea label={t('Andar ke notes')} value={notes} onChangeText={(v) => { setDirty(true); setNotes(v); }} />
      </FormSection>

      <FormSection title={t('Hisaab')}>
        <MoneyInput label={t('Discount')} value={discount} onChangeValue={(v) => { setDirty(true); setDiscount(v); }} />
        <Row style={{ justifyContent: 'space-between' }}><Text size="sm" tone="secondary">{t('Kul')}</Text><Amount value={total} size="lg" weight="bold" /></Row>
        {!editing && (
          <>
            <Segmented value={startAs} onChange={setStartAs} options={[{ value: 'CONFIRMED', label: t('Order pakka') }, { value: 'QUOTED', label: t('Sirf rate bataya') }]} />
            <MoneyInput label={t('Advance abhi mila')} value={advance} onChangeValue={(v) => { setDirty(true); setAdvance(v); }} />
            {adv > 0 && <ChipGroup wrap value={method} onChange={setMethod} options={[['CASH', t('Cash')], ['JAZZCASH', t('JazzCash')], ['EASYPAISA', t('EasyPaisa')], ['BANK_TRANSFER', t('Bank')], ['CARD', t('Card')]].map(([value, label]) => ({ value, label }))} />}
            {adv > 0 && <Text size="xs" tone="muted">{t('Yeh paisa customer ke khate me advance ban kar jama hota hai; suit dete waqt bill me kat jata hai.')}</Text>}
          </>
        )}
      </FormSection>

      <ProductPicker open={!!pickFor} onClose={() => setPickFor(null)} title={t('Kapra chunein')} includeRaw={false}
        onPick={(p) => { if (pickFor) edit({ fabric: { productId: p.product.id, variantId: p.variantId ?? undefined, name: p.product.name, price: Number(p.product.price ?? 0) } }, pickFor); setPickFor(null); }} />
    </FormTemplate>
  );
}
