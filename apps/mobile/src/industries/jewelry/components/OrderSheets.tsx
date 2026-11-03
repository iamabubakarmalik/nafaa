/** Custom order sheets (web CustomOrdersPage modals): the order form, customer gold as advance, gold to the karigar and the piece back, delivery price and cancel. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { orderEstimate, metalOf, oldGoldValue, r3, type Purity } from '@nafaa/core/industries/jewelry';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, Card, DatePicker, FormSection, Input, MoneyInput, Select, Sheet, Text, TextArea, toast, useTheme } from '@/design';
import { MethodChips, dateToKey, errorText, keyToDate } from '@/industries/_shared/deskKit';
import { NumberInput } from '@/modules/inventory/components/fields';
import { PhotoField } from '@/modules/inventory/components/PhotoField';
import { customOrdersApi, karigarsApi, type CustomOrderRow } from '../api';
import { CATEGORY_LABEL, KEYS, MAIN_CATEGORIES, categoryLabel, grams, purityLabel, refreshJewelry, useMetalRates } from '../meta';
import { PurityPicker } from './ui';

const refresh = () => refreshJewelry([KEYS.orders, KEYS.karigars, KEYS.metal, KEYS.exchanges, 'metal-stock-balance'], true);

export function OrderFormSheet({ order, open, onClose }: { order: CustomOrderRow | null; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const { rates } = useMetalRates();
  const karigars = useQuery({ queryKey: [KEYS.karigars, 'list', { isActive: 'true' }], queryFn: () => karigarsApi.list({ isActive: 'true' }), staleTime: 60_000, enabled: open });
  const blank = {
    customerName: '', customerPhone: '', category: 'RING', purity: 'KARAT_22' as Purity, expectedGrossWeight: null as number | null, expectedMakingCharges: null as number | null,
    estimatedPrice: null as number | null, promisedDate: null as Date | null, assignedKarigarId: '', designDescription: '', engravingText: '', referenceImageUrls: [] as string[],
    advancePayment: null as number | null, paymentMethod: 'CASH', internalNotes: '',
  };
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setF(order ? {
      customerName: order.customerName, customerPhone: order.customerPhone, category: order.category, purity: order.purity as Purity, expectedGrossWeight: order.expectedGrossWeight || null,
      expectedMakingCharges: order.expectedMakingCharges ?? null, estimatedPrice: order.estimatedPrice || null, promisedDate: order.promisedDate ? keyToDate(order.promisedDate) : null,
      assignedKarigarId: order.assignedKarigarId ?? '', designDescription: order.designDescription, engravingText: order.engravingText ?? '', referenceImageUrls: order.referenceImageUrls ?? [],
      advancePayment: null, paymentMethod: 'CASH', internalNotes: order.internalNotes ?? '',
    } : blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order]);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const rate = rates.get(`${metalOf(f.purity)}_${f.purity}`)?.ratePerGram ?? 0;
  const estimate = orderEstimate(f.expectedGrossWeight ?? 0, rate, f.expectedMakingCharges ?? 0);
  const save = useMutation({
    mutationFn: () => {
      const body = {
        customerName: f.customerName.trim(), customerPhone: f.customerPhone.trim(), category: f.category, purity: f.purity, metalType: metalOf(f.purity),
        expectedGrossWeight: f.expectedGrossWeight ?? 0, expectedMakingCharges: f.expectedMakingCharges ?? undefined, estimatedPrice: f.estimatedPrice ?? 0,
        promisedDate: f.promisedDate ? dateToKey(f.promisedDate) : undefined, assignedKarigarId: f.assignedKarigarId || null, designDescription: f.designDescription.trim(),
        engravingText: f.engravingText.trim() || undefined, hasEngraving: !!f.engravingText.trim(), referenceImageUrls: f.referenceImageUrls, internalNotes: f.internalNotes.trim() || undefined,
      };
      return order ? customOrdersApi.update(order.id, body) : customOrdersApi.create({ ...body, advancePayment: f.advancePayment ?? 0, paymentMethod: f.paymentMethod });
    },
    onSuccess: () => { toast.success(order ? t('Order update ho gaya') : t('Order ban gaya')); refresh(); onClose(); },
    onError: (e) => setErrors({ form: errorText(e, t('Order save nahi hua')) }),
  });
  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.customerName.trim()) e.customerName = t('Customer ka naam likhein');
    if (!/^[\d+\-\s]{7,20}$/.test(f.customerPhone.trim())) e.customerPhone = t('Sahi phone number likhein');
    if (!f.designDescription.trim()) e.designDescription = t('Design ki details likhein');
    if (!((f.estimatedPrice ?? 0) > 0)) e.estimatedPrice = t('Andaza qeemat likhein');
    if ((f.advancePayment ?? 0) > (f.estimatedPrice ?? 0)) e.advancePayment = t('Advance qeemat se zyada hai');
    setErrors(e);
    if (!Object.keys(e).length) save.mutate();
  };
  return (
    <Sheet open={open} onClose={onClose} title={order ? order.orderNumber : t('Naya zewar order')} height={0.94}
      footer={<Button fullWidth size="lg" loading={save.isPending} onPress={submit}>{t('Save karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Customer')} value={f.customerName} onChangeText={(v) => set({ customerName: v })} error={errors.customerName} maxLength={80} />
        <Input label={t('Phone')} value={f.customerPhone} onChangeText={(v) => set({ customerPhone: v })} error={errors.customerPhone} keyboardType="phone-pad" ltr placeholder="03xx xxxxxxx" hint={t('Tayyar hone par isi par batayenge')} />
        <DatePicker label={t('Dene ki date')} value={f.promisedDate} onChange={(d) => set({ promisedDate: d })} minimumDate={new Date()} />
        <Select label={t('Zewar')} value={f.category} onChange={(v) => set({ category: v })} options={MAIN_CATEGORIES.map((c) => ({ value: c, label: t(CATEGORY_LABEL[c]) }))} />
        <PurityPicker label={t('Karat')} value={f.purity} onChange={(p) => set({ purity: p })} />
        <NumberInput label={t('Andaza wazan (g)')} value={f.expectedGrossWeight} onChangeValue={(v) => set({ expectedGrossWeight: v })} />
        <MoneyInput label={t('Banwai (Rs)')} value={f.expectedMakingCharges} onChangeValue={(v) => set({ expectedMakingCharges: v })} />
        <MoneyInput label={t('Andaza qeemat (Rs)')} value={f.estimatedPrice} onChangeValue={(v) => set({ estimatedPrice: v })} error={errors.estimatedPrice}
          hint={estimate > 0 ? t('Aaj ke rate se {{value}}', { value: formatMoney(estimate) }) : t('Karat ka aaj ka rate set nahi')} />
        {estimate > 0 && f.estimatedPrice !== estimate && <Button variant="soft" size="sm" onPress={() => set({ estimatedPrice: Math.round(estimate) })}>{t('Yehi qeemat lagayein')}</Button>}
        <TextArea label={t('Design')} value={f.designDescription} onChangeText={(v) => set({ designDescription: v })} error={errors.designDescription} maxLength={500} placeholder={t('Jaise: bridal set, kundan, 3 tola')} />
        <Input label={t('Naam / likhai (engraving)')} value={f.engravingText} onChangeText={(v) => set({ engravingText: v })} maxLength={60} />
        <Select label={t('Karigar')} value={f.assignedKarigarId} onChange={(v) => set({ assignedKarigarId: v })} options={[{ value: '', label: t('Baad me') }, ...(karigars.data ?? []).map((k) => ({ value: k.id, label: k.fullName }))]} />
        <PhotoField value={f.referenceImageUrls.map((url) => ({ url }))} onChange={(v) => set({ referenceImageUrls: v.map((x) => x.url) })} max={4} />
        {!order && (
          <FormSection title={t('Advance')}>
            <MoneyInput label={t('Cash advance (Rs)')} value={f.advancePayment} onChangeValue={(v) => set({ advancePayment: v })} error={errors.advancePayment} hint={t('Purana sona baad me "Sona" se lein')} />
            {(f.advancePayment ?? 0) > 0 && <><Text size="sm" weight="semibold" tone="secondary">{t('Advance kaise mila')}</Text><MethodChips value={f.paymentMethod} onChange={(m) => set({ paymentMethod: m })} /></>}
          </FormSection>
        )}
        <TextArea label={t('Andar ka note')} value={f.internalNotes} onChangeText={(v) => set({ internalNotes: v })} maxLength={500} />
        {!!errors.form && <Card tone="danger"><Text size="sm">{errors.form}</Text></Card>}
      </View>
    </Sheet>
  );
}

export function GoldAdvanceSheet({ o, onClose }: { o: CustomOrderRow | null; onClose: () => void }) {
  const th = useTheme();
  const { rates } = useMetalRates();
  const [purity, setPurity] = useState<Purity>('KARAT_22');
  const [g, setG] = useState<number | null>(null);
  const [kaat, setKaat] = useState<number | null>(0);
  const [own, setOwn] = useState<number | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { if (o) { setPurity((o.purity as Purity) || 'KARAT_22'); setG(null); setKaat(0); setOwn(null); setError(''); } }, [o?.id]);
  const calc = oldGoldValue(g ?? 0, purity, rates, kaat ?? 0);
  const value = own ?? calc.value;
  const save = useMutation({
    mutationFn: () => customOrdersApi.goldAdvance(o!.id, { grams: g ?? 0, purity, deductionPct: kaat ?? 0, ...(own ? { value: own } : {}) }),
    onSuccess: () => { toast.success(t('Customer ka sona jama — metal stock me gaya')); refresh(); onClose(); },
    onError: (e) => setError(errorText(e, t('Save nahi hua'))),
  });
  const submit = () => {
    if (!(g && g > 0)) return setError(t('Wazan likhein'));
    if (!(value > 0)) return setError(t('Qeemat likhein — is karat ka rate set nahi'));
    setError('');
    save.mutate();
  };
  return (
    <Sheet open={!!o} onClose={onClose} title={t('Customer ka sona (advance)')} description={o ? t('{{no}} · baqi {{due}}', { no: o.orderNumber, due: formatMoney(o.due) }) : undefined}
      footer={<Button fullWidth size="lg" loading={save.isPending} onPress={submit}>{t('Sona jama karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <PurityPicker label={t('Karat (test ke baad)')} value={purity} onChange={setPurity} />
        <NumberInput label={t('Wazan (g)')} value={g} onChangeValue={setG} />
        <NumberInput label={t('Kaat %')} value={kaat} onChangeValue={setKaat} />
        <MoneyInput label={t('Qeemat (Rs)')} value={own ?? (calc.value || null)} onChangeValue={setOwn} hint={calc.perGram ? t('Khareed rate {{rate}}/g', { rate: formatMoney(calc.perGram) }) : t('Is karat ka rate set nahi')} />
        {!!error && <Card tone="danger"><Text size="sm">{error}</Text></Card>}
      </View>
    </Sheet>
  );
}

export function OrderMetalSheet({ o, mode, onClose }: { o: CustomOrderRow | null; mode: 'issue' | 'receive'; onClose: () => void }) {
  const th = useTheme();
  const issue = mode === 'issue';
  const karigars = useQuery({ queryKey: [KEYS.karigars, 'list', { isActive: 'true' }], queryFn: () => karigarsApi.list({ isActive: 'true' }), staleTime: 60_000, enabled: !!o });
  const [karigarId, setKarigarId] = useState('');
  const [g, setG] = useState({ grams: null as number | null, piece: null as number | null, wastage: null as number | null, back: null as number | null });
  const [error, setError] = useState('');
  useEffect(() => { if (o) { setKarigarId(o.assignedKarigarId ?? ''); setG({ grams: null, piece: null, wastage: null, back: null }); setError(''); } }, [o?.id, mode]);
  const save = useMutation({
    mutationFn: () => issue ? customOrdersApi.issueMetal(o!.id, { grams: g.grams ?? 0, karigarId: karigarId || undefined })
      : customOrdersApi.receiveMetal(o!.id, { receivedGrams: g.piece ?? 0, wastageGrams: g.wastage ?? 0, returnedGrams: g.back ?? 0 }),
    onSuccess: () => { toast.success(issue ? t('Karigar ko sona diya') : t('Zewar wapas aa gaya')); refresh(); onClose(); },
    onError: (e) => setError(errorText(e, t('Save nahi hua'))),
  });
  const submit = () => {
    if (issue && !karigarId) return setError(t('Karigar chunein'));
    if (issue && !(g.grams && g.grams > 0)) return setError(t('Grams likhein'));
    if (!issue && !(g.piece && g.piece > 0)) return setError(t('Bane zewar ka wazan likhein'));
    setError('');
    save.mutate();
  };
  return (
    <Sheet open={!!o} onClose={onClose} title={issue ? t('Karigar ko sona dein') : t('Zewar aaya')} description={o ? `${o.orderNumber} · ${categoryLabel(o.category)} · ${purityLabel(o.purity)}` : undefined}
      footer={<Button fullWidth size="lg" loading={save.isPending} onPress={submit}>{issue ? t('Sona dein') : t('Wapas lein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {issue ? (
          <>
            <Select label={t('Karigar')} value={karigarId} onChange={setKarigarId} options={[{ value: '', label: t('Chunein…') }, ...(karigars.data ?? []).map((k) => ({ value: k.id, label: k.fullName }))]} />
            <NumberInput label={t('{{purity}} sona (g)', { purity: o ? purityLabel(o.purity) : '' })} value={g.grams} onChangeValue={(v) => setG({ ...g, grams: v })} hint={t('Tijori (metal stock) se nikalta hai')} />
          </>
        ) : (
          <>
            <NumberInput label={t('Bana zewar (g)')} value={g.piece} onChangeValue={(v) => setG({ ...g, piece: v })} hint={t('Diya tha {{grams}}', { grams: grams(o?.metalIssuedGrams ?? 0) })} />
            <NumberInput label={t('Wastage (g)')} value={g.wastage} onChangeValue={(v) => setG({ ...g, wastage: v })} />
            <NumberInput label={t('Bacha sona (g)')} value={g.back} onChangeValue={(v) => setG({ ...g, back: v })} hint={t('Tijori me wapas')} />
            {r3((g.piece ?? 0) + (g.wastage ?? 0) + (g.back ?? 0)) > (o?.metalIssuedGrams ?? 0) + 0.001 && <Card tone="warning"><Text size="sm">{t('Yeh diye hue sone se zyada hai')}</Text></Card>}
          </>
        )}
        {!!error && <Card tone="danger"><Text size="sm">{error}</Text></Card>}
      </View>
    </Sheet>
  );
}

export function DeliverSheet({ o, loading, onConfirm, onClose }: { o: CustomOrderRow | null; loading: boolean; onConfirm: (finalPrice: number) => void; onClose: () => void }) {
  const th = useTheme();
  const [price, setPrice] = useState<number | null>(null);
  useEffect(() => { if (o) setPrice(o.finalPrice ?? o.estimatedPrice); }, [o?.id]);
  const paid = (o?.paidAmount ?? 0) + (o?.goldAdvance.value ?? 0);
  const left = Math.max((price ?? 0) - paid, 0);
  return (
    <Sheet open={!!o} onClose={onClose} title={t('Order de dein')} description={o ? `${o.orderNumber} · ${o.customerName}` : undefined}
      footer={<Button fullWidth size="lg" variant="success" loading={loading} disabled={!((price ?? 0) > 0)} onPress={() => onConfirm(price ?? 0)}>{t('De dein — bill banayein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Final qeemat (Rs)')} value={price} onChangeValue={setPrice} size="xl" hint={t('Asal wazan aur aaj ke rate ke hisaab se')} />
        <Card tone="info"><Text size="sm">{t('Advance {{paid}} katega, baqi {{left}} customer ke khate me udhaar jayega.', { paid: formatMoney(paid), left: formatMoney(left) })}</Text></Card>
      </View>
    </Sheet>
  );
}

export function ReasonSheet({ open, title, label, placeholder, cta, loading, onConfirm, onClose }: {
  open: boolean; title: string; label: string; placeholder?: string; cta: string; loading?: boolean; onConfirm: (reason: string) => void; onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title={title} footer={<Button fullWidth size="lg" variant="danger" loading={loading} disabled={!reason.trim()} onPress={() => onConfirm(reason.trim())}>{cta}</Button>}>
      <TextArea label={label} value={reason} onChangeText={setReason} maxLength={200} placeholder={placeholder} autoFocus />
    </Sheet>
  );
}
