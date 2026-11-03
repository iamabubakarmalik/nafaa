/**
 * New or edit a custom order (web CustomOrderFormPage): customer, what to
 * make (design, wood, polish, fabric, size, sketch), price with fitting,
 * advance asked, days to make, karigar and delivery address. An advance taken
 * while booking is recorded right after the order is saved (drawer + khata).
 * The price changes only while the order is a quotation.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { addDays, advanceFor, dayKey } from '@nafaa/core/industries/furniture';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, Card, ChipGroup, FormSection, FormTemplate, Input, MoneyInput, Row, Select, Skeleton, Switch, Text, toast, useTheme } from '@/design';
import { CustomerPickerSheet } from '@/modules/customers/components/CustomerPickerSheet';
import { PhotoField, type ImageDraft } from '@/modules/inventory/components/PhotoField';
import { NumberInput } from '@/modules/inventory/components/fields';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { PAY_METHODS } from '../../_shared/trade/sheets';
import { carpentersApi, customOrdersApi, type FurnitureCustomOrder, type OrderInput } from '../api';
import { CATEGORY_GROUPS, FABRICS, FURNITURE_KEYS, ITEMS, MATERIALS, POLISHES, WOODS, opt, phoneOk, refreshFurniture } from '../meta';

interface Draft {
  customerId: string; customerName: string; customerPhone: string; customerCnic: string; customerAddress: string;
  productType: string; categoryType: string; material: string; description: string; woodType: string; polishRequested: string; colorRequested: string; upholsteryFabric: string;
  lengthCm: number | null; widthCm: number | null; heightCm: number | null; customDimensions: string; designNotes: string; sketches: ImageDraft[];
  quotedPrice: number | null; depositAmount: number | null; estimatedDays: number | null; requiresInstallation: boolean; installationCharge: number | null; warrantyMonths: number | null;
  carpenterId: string; workshopLocation: string; deliveryAddress: string; deliveryCity: string; deliveryArea: string; notes: string;
  advanceNow: number | null; advanceMethod: string;
}
const EMPTY: Draft = {
  customerId: '', customerName: '', customerPhone: '', customerCnic: '', customerAddress: '',
  productType: '', categoryType: '', material: '', description: '', woodType: '', polishRequested: '', colorRequested: '', upholsteryFabric: '',
  lengthCm: null, widthCm: null, heightCm: null, customDimensions: '', designNotes: '', sketches: [],
  quotedPrice: null, depositAmount: null, estimatedDays: 21, requiresInstallation: false, installationCharge: null, warrantyMonths: 12,
  carpenterId: '', workshopLocation: '', deliveryAddress: '', deliveryCity: '', deliveryArea: '', notes: '',
  advanceNow: null, advanceMethod: 'CASH',
};
const DAYS = [7, 15, 21, 30, 45];
const s = (v?: string | number | null) => (v === null || v === undefined ? '' : String(v));

const fromOrder = (o: FurnitureCustomOrder): Draft => ({
  ...EMPTY, customerId: s(o.customerId), customerName: o.customerName, customerPhone: o.customerPhone, customerCnic: s(o.customerCnic), customerAddress: s(o.customerAddress),
  productType: o.productType, categoryType: s(o.categoryType), material: s(o.material), description: o.description, woodType: s(o.woodType),
  polishRequested: s(o.polishRequested), colorRequested: s(o.colorRequested), upholsteryFabric: s(o.upholsteryFabric),
  lengthCm: o.lengthCm ?? null, widthCm: o.widthCm ?? null, heightCm: o.heightCm ?? null, customDimensions: s(o.customDimensions), designNotes: s(o.designNotes), sketches: (o.sketchUrls ?? []).map((url) => ({ url })),
  quotedPrice: o.quotedPrice, depositAmount: o.depositAmount, estimatedDays: o.estimatedDays, requiresInstallation: o.requiresInstallation,
  installationCharge: o.installationCharge ?? null, warrantyMonths: o.warrantyMonths, carpenterId: s(o.carpenterId), workshopLocation: s(o.workshopLocation),
  deliveryAddress: s(o.deliveryAddress), deliveryCity: s(o.deliveryCity), deliveryArea: s(o.deliveryArea), notes: s(o.notes),
});

export function CustomOrderFormScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const can = usePermission();
  const { guard } = useDeskOnline('furnitureDesk');
  const canTakeMoney = can(P.POS_USE);
  const [d, setD] = useState<Draft>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const [picking, setPicking] = useState(false);
  const set = (p: Partial<Draft>) => { setDirty(true); setD((x) => ({ ...x, ...p })); };

  const orderQ = useQuery({ queryKey: [FURNITURE_KEYS.orders, 'one', id], queryFn: () => customOrdersApi.getOne(id!), enabled: editing });
  const carpenters = useQuery({ queryKey: [FURNITURE_KEYS.carpenters, 'active'], queryFn: () => carpentersApi.list({ active: true }), staleTime: 60_000 });
  const o = orderQ.data;
  useEffect(() => { if (o) { setD(fromOrder(o)); setDirty(false); } }, [o]);

  const priceOpen = !editing || o?.status === 'QUOTATION';
  const price = d.quotedPrice ?? 0;
  const fitting = d.requiresInstallation ? d.installationCharge ?? 0 : 0;
  const total = price + fitting;
  const advance = d.advanceNow ?? 0;
  const days = Math.round(d.estimatedDays ?? 0);
  const errors = {
    customerName: !d.customerName.trim() ? t('Customer ka naam likhein') : undefined,
    customerPhone: !d.customerPhone.trim() ? t('Phone likhein — khata isi se banta hai') : !phoneOk(d.customerPhone) ? t('10 se 15 hindse') : undefined,
    productType: !d.productType.trim() ? t('Kya banana hai') : undefined,
    description: !d.description.trim() ? t('Design ya tafseel likhein') : undefined,
    quotedPrice: !(price > 0) ? t('Qeemat likhein') : undefined,
    depositAmount: (d.depositAmount ?? 0) > total ? t('Advance qeemat se zyada hai') : undefined,
    estimatedDays: days < 1 || days > 365 ? t('1 se 365 din') : undefined,
    advanceNow: advance > total ? t('Kul {{total}} hai', { total: formatMoney(total) }) : undefined,
  };
  const first = Object.values(errors).find(Boolean);
  const e = (k: keyof typeof errors) => (tried ? errors[k] : undefined);

  const submit = () => guard(async () => {
    setTried(true);
    if (first) { toast.error(first); return; }
    const payload: OrderInput = {
      customerId: opt(d.customerId), customerName: d.customerName.trim(), customerPhone: d.customerPhone.trim(), customerCnic: opt(d.customerCnic), customerAddress: opt(d.customerAddress),
      productType: d.productType.trim(), description: d.description.trim(), categoryType: opt(d.categoryType), material: opt(d.material),
      woodType: opt(d.woodType), polishRequested: opt(d.polishRequested), colorRequested: opt(d.colorRequested), upholsteryFabric: opt(d.upholsteryFabric),
      lengthCm: d.lengthCm ?? undefined, widthCm: d.widthCm ?? undefined, heightCm: d.heightCm ?? undefined, customDimensions: opt(d.customDimensions), designNotes: opt(d.designNotes), sketchUrls: d.sketches.map((x) => x.url),
      quotedPrice: price, depositAmount: d.depositAmount ?? 0, estimatedDays: days, requiresInstallation: d.requiresInstallation,
      installationCharge: d.requiresInstallation ? d.installationCharge ?? 0 : undefined, warrantyMonths: d.warrantyMonths ?? undefined,
      carpenterId: editing ? undefined : opt(d.carpenterId), workshopLocation: opt(d.workshopLocation),
      deliveryAddress: opt(d.deliveryAddress), deliveryCity: opt(d.deliveryCity), deliveryArea: opt(d.deliveryArea), notes: opt(d.notes),
    };
    setSaving(true);
    try {
      const saved = editing ? await customOrdersApi.update(id!, payload) : await customOrdersApi.create(payload);
      if (!editing && advance > 0) {
        try { await customOrdersApi.recordPayment(saved.id, { amount: advance, paymentMethod: d.advanceMethod, isDeposit: true }); }
        catch (err) { toast.error(apiErrorMessage(err, t('Order ban gaya, advance save nahi hua — order kholkar dobara lein'))); }
      }
      setDirty(false);
      refreshFurniture([FURNITURE_KEYS.orders, FURNITURE_KEYS.carpenters]);
      toast.success(editing ? t('Order save') : t('{{orderNumber}} ban gaya', { orderNumber: saved.orderNumber }));
      router.replace(`/furniture/custom-orders/${saved.id}` as never);
    } catch (err) { toast.error(apiErrorMessage(err, t('Order save nahi hua'))); } finally { setSaving(false); }
  });

  if (editing && orderQ.isLoading) return <FormTemplate title={t('Naya custom order')} onSave={() => undefined}><Skeleton height={300} /></FormTemplate>;
  const chips = (list: string[], value: string, on: (v: string) => void) => <ChipGroup wrap value={value} onChange={(v) => on(value === v ? '' : v)} options={list.map((v) => ({ value: v, label: v }))} />;
  return (
    <FormTemplate title={editing ? t('{{orderNumber}} — badlein', { orderNumber: o?.orderNumber ?? '' }) : t('Naya custom order')}
      subtitle={editing ? (priceOpen ? t('Quotation hai — sab badal sakta hai') : t('Advance mil chuka — qeemat ab nahi badalti, baqi details badal sakti hain')) : t('Customer, design, qeemat aur advance')}
      dirty={dirty} saving={saving} onSave={submit}>
      <View style={{ gap: th.space(4) }}>
        <OfflineNote feature="furnitureDesk" />
        <FormSection title={t('Customer')}>
          {d.customerId ? (
            <Card tone="brand"><Row justify="between"><Text weight="semibold" numberOfLines={1} style={{ flex: 1 }}>{d.customerName} · {d.customerPhone}</Text>{!editing ? <Button size="sm" variant="ghost" onPress={() => set({ customerId: '' })}>{t('Hatayein')}</Button> : null}</Row></Card>
          ) : !editing ? <Button variant="secondary" size="sm" onPress={() => setPicking(true)}>{t('Purana customer chunein')}</Button> : null}
          <Input label={t('Naam')} value={d.customerName} onChangeText={(v) => set({ customerName: v })} placeholder={t('Imran Sahib')} error={e('customerName')} disabled={!!d.customerId} />
          <Input label={t('Phone')} keyboardType="phone-pad" ltr value={d.customerPhone} onChangeText={(v) => set({ customerPhone: v })} placeholder="03001234567" error={e('customerPhone')} disabled={!!d.customerId} hint={t('Advance aur baqi isi khate me')} />
          <Input label={t('CNIC')} keyboardType="number-pad" ltr value={d.customerCnic} onChangeText={(v) => set({ customerCnic: v })} placeholder="35202-1234567-1" hint={t('Bara order ho to likhein')} />
          <Input label={t('Ghar ka pata')} value={d.customerAddress} onChangeText={(v) => set({ customerAddress: v })} hint={t('Marzi hai')} />
        </FormSection>

        <FormSection title={t('Kya banana hai')}>
          <Input label={t('Cheez')} value={d.productType} onChangeText={(v) => set({ productType: v })} placeholder={t('Double bed with side tables')} error={e('productType')} />
          {chips(ITEMS, d.productType, (v) => set({ productType: v }))}
          <Select label={t('Kis cheez ka order')} value={d.categoryType} searchable onChange={(v) => set({ categoryType: v })} placeholder={t('Chunein')} hint={t('Reports me group isi se banta hai')}
            options={CATEGORY_GROUPS.flatMap((g) => g.items.map(([v, l]) => ({ value: v, label: `${t(g.label)} · ${t(l)}` })))} />
          <Select label={t('Main material')} value={d.material} searchable onChange={(v) => set({ material: v })} placeholder={t('Chunein')} options={Object.entries(MATERIALS).map(([value, label]) => ({ value, label: t(label) }))} />
          <Input label={t('Design / tafseel')} value={d.description} onChangeText={(v) => set({ description: v })} error={e('description')} multiline placeholder={t('Headboard par cushion, 2 side table, neeche storage box')} />
          <Input label={t('Lakri')} value={d.woodType} onChangeText={(v) => set({ woodType: v })} placeholder={t('Sheesham')} />
          {chips(WOODS, d.woodType, (v) => set({ woodType: v }))}
          <Input label={t('Polish')} value={d.polishRequested} onChangeText={(v) => set({ polishRequested: v })} placeholder={t('Walnut matte')} />
          {chips(POLISHES, d.polishRequested, (v) => set({ polishRequested: v }))}
          <Input label={t('Rang')} value={d.colorRequested} onChangeText={(v) => set({ colorRequested: v })} placeholder={t('Dark brown')} />
          <Input label={t('Kapra (sofa / cushion)')} value={d.upholsteryFabric} onChangeText={(v) => set({ upholsteryFabric: v })} placeholder={t('Velvet, grey')} />
          {chips(FABRICS, d.upholsteryFabric, (v) => set({ upholsteryFabric: v }))}
        </FormSection>

        <FormSection title={t('Size aur sketch')}>
          <Row gap={2}>
            <View style={{ flex: 1 }}><NumberInput label={t('Lambai (cm)')} value={d.lengthCm} onChangeValue={(v) => set({ lengthCm: v })} /></View>
            <View style={{ flex: 1 }}><NumberInput label={t('Chaurai (cm)')} value={d.widthCm} onChangeValue={(v) => set({ widthCm: v })} /></View>
            <View style={{ flex: 1 }}><NumberInput label={t('Unchai (cm)')} value={d.heightCm} onChangeValue={(v) => set({ heightCm: v })} /></View>
          </Row>
          <Input label={t('Ya size aise likhein')} value={d.customDimensions} onChangeText={(v) => set({ customDimensions: v })} placeholder={t('6.5 × 7 feet (king)')} />
          <Input label={t('Karigar ke liye note')} value={d.designNotes} onChangeText={(v) => set({ designNotes: v })} multiline placeholder={t('Drawer soft-close, handle golden')} />
          <Text size="sm" weight="medium" tone="secondary">{t('Sketch / photo')}</Text>
          <PhotoField value={d.sketches} onChange={(sketches) => set({ sketches })} max={20} />
        </FormSection>

        <FormSection title={t('Qeemat aur advance')}>
          <MoneyInput label={t('Qeemat (Rs)')} value={d.quotedPrice} onChangeValue={(v) => set({ quotedPrice: v })} error={e('quotedPrice')} hint={t('Furniture ki tay shuda qeemat')} disabled={!priceOpen} />
          <MoneyInput label={t('Advance kitna lena hai')} value={d.depositAmount} onChangeValue={(v) => set({ depositAmount: v })} error={e('depositAmount')} hint={t('Itna milne par order \'Advance mila\' ho jata hai')} disabled={!priceOpen} />
          <ChipGroup value="" onChange={(v) => set({ depositAmount: advanceFor(total, Number(v)) })} options={[25, 40, 50].map((p) => ({ value: String(p), label: `${p}%` }))} />
          <Switch value={d.requiresInstallation} onChange={(v) => set({ requiresInstallation: v })} label={t('Ghar par fitting')} description={t('Fitting ka charge bill me alag line')} disabled={!priceOpen} />
          {d.requiresInstallation && <MoneyInput label={t('Fitting charge (Rs)')} value={d.installationCharge} onChangeValue={(v) => set({ installationCharge: v })} hint={t('0 = free fitting')} disabled={!priceOpen} />}
          <Card tone="default">
            <Row justify="between"><Text size="sm">{t('Kul bill')}</Text><Text weight="bold" ltr>{formatMoney(total)}</Text></Row>
            {editing && o ? <Row justify="between"><Text size="sm" tone="secondary">{t('Mil chuka')}</Text><Text size="sm" ltr>{formatMoney(o.totalPaid)}</Text></Row> : null}
          </Card>
          {!editing && canTakeMoney && (
            <>
              <MoneyInput label={t('Advance abhi mila (Rs)')} value={d.advanceNow} onChangeValue={(v) => set({ advanceNow: v })} error={e('advanceNow')}
                hint={advance > 0 ? t('Drawer aur {{value}} ke khate me', { value: d.customerName || 'customer' }) : t('Nahi mila to khali chhorein')} />
              <ChipGroup wrap value={d.advanceMethod} onChange={(v) => set({ advanceMethod: v })} options={PAY_METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} />
            </>
          )}
        </FormSection>

        <FormSection title={t('Kab aur kaun banayega')}>
          <NumberInput label={t('Kitne din lagenge')} integer value={d.estimatedDays} onChangeValue={(v) => set({ estimatedDays: v })} error={e('estimatedDays')}
            hint={days > 0 ? t('Dene ki date {{shortDate}}', { shortDate: formatDate(`${addDays(editing && o ? dayKey(new Date(o.quotationDate)) : dayKey(), days)}T12:00:00`) }) : undefined} />
          <ChipGroup value={String(days)} onChange={(v) => set({ estimatedDays: Number(v) })} options={DAYS.map((n) => ({ value: String(n), label: t('{{n}} din', { n }) }))} />
          {!editing && (
            <Select label={t('Karigar')} value={d.carpenterId} onChange={(v) => set({ carpenterId: v })} placeholder={t('Baad me dein')} hint={t('Order page se bhi de sakte hain')}
              options={[{ value: '', label: t('Baad me dein') }, ...(carpenters.data ?? []).map((c) => ({ value: c.id, label: `${c.name}${c.activeProjects ? ` — ${t('{{n}} kaam haath me', { n: c.activeProjects })}` : ''}` }))]} />
          )}
          <Input label={t('Workshop')} value={d.workshopLocation} onChangeText={(v) => set({ workshopLocation: v })} placeholder={t('Main workshop')} hint={t('Marzi hai')} />
          <NumberInput label={t('Warranty (mahine)')} integer value={d.warrantyMonths} onChangeValue={(v) => set({ warrantyMonths: v })} />
        </FormSection>

        <FormSection title={t('Delivery')}>
          <Input label={t('Delivery ka pata')} value={d.deliveryAddress} onChangeText={(v) => set({ deliveryAddress: v })} placeholder={t('Ghar ka pata se alag ho to')} hint={t('Khali ho to ghar ka pata')} />
          <Input label={t('Shehar')} value={d.deliveryCity} onChangeText={(v) => set({ deliveryCity: v })} placeholder={t('Lahore')} />
          <Input label={t('Ilaqa')} value={d.deliveryArea} onChangeText={(v) => set({ deliveryArea: v })} placeholder={t('DHA Phase 5')} />
          <Input label={t('Note')} value={d.notes} onChangeText={(v) => set({ notes: v })} multiline />
        </FormSection>
      </View>
      <CustomerPickerSheet open={picking} title={t('Customer chunein')} onClose={() => setPicking(false)}
        onPick={(c) => { set({ customerId: c.id, customerName: c.name, customerPhone: c.phone ?? '' }); setPicking(false); }} />
    </FormTemplate>
  );
}
