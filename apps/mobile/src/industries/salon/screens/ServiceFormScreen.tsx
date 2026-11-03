/**
 * Add or edit a salon service on one screen (web SalonServiceWizardPage): name
 * and category, rate with an offer rate and the shop's cost, time with gaps,
 * who it is for, the stylist commission and how it shows at the counter. The
 * profit line updates as the numbers change.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, ChipGroup, FormSection, FormTemplate, Input, MoneyInput, Row, Select, Skeleton, Switch, Text, toast, useTheme } from '@/design';
import { numIn } from '../../_shared/deskKit';
import { errorText } from '../../_shared/deskKit';
import { clean } from '../../_shared/serviceKit';
import { salonApi } from '../api';
import { SALON_KEYS, categoryOptions, minutesText, refreshSalon } from '../meta';

const TIMES = [15, 30, 45, 60, 90, 120, 180];
interface Draft {
  name: string; code: string; category: string; description: string; price: number | null; discountPrice: number | null; costPrice: number | null;
  durationMinutes: number | null; bufferBefore: number | null; bufferAfter: number | null; forMen: boolean; forWomen: boolean; forKids: boolean;
  commissionPct: number | null; commissionFixed: number | null; isPopular: boolean; isFeatured: boolean; isActive: boolean; displayOrder: number | null;
}
const EMPTY: Draft = { name: '', code: '', category: 'HAIR_CUT', description: '', price: null, discountPrice: null, costPrice: null, durationMinutes: 30, bufferBefore: 0, bufferAfter: 0, forMen: true, forWomen: true, forKids: false, commissionPct: null, commissionFixed: null, isPopular: false, isFeatured: false, isActive: true, displayOrder: 0 };

export function ServiceFormScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id && id !== 'new';
  const canEdit = usePermission()(P.PRODUCTS_EDIT);
  const [d, setD] = useState<Draft>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const q = useQuery({ queryKey: [SALON_KEYS.services, 'one', id], queryFn: () => salonApi.services.getOne(id!), enabled: editing });
  useEffect(() => {
    const s = q.data;
    if (!s) return;
    setD({ name: s.name, code: s.code ?? '', category: s.category, description: s.description ?? '', price: s.price, discountPrice: s.discountPrice ?? null, costPrice: s.costPrice ?? null,
      durationMinutes: s.durationMinutes, bufferBefore: s.bufferBefore ?? 0, bufferAfter: s.bufferAfter ?? 0, forMen: s.forMen, forWomen: s.forWomen, forKids: s.forKids,
      commissionPct: s.commissionPct || null, commissionFixed: s.commissionFixed || null, isPopular: s.isPopular, isFeatured: s.isFeatured, isActive: s.isActive, displayOrder: s.displayOrder ?? 0 });
  }, [q.data]);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setD((x) => ({ ...x, [k]: v })); setDirty(true); };
  const price = d.price ?? 0;
  const errors = {
    name: d.name.trim().length < 2 ? t('Service ka naam likhein') : undefined,
    price: d.price == null ? t('Rate likhein') : undefined,
    discountPrice: d.discountPrice != null && d.discountPrice >= price ? t('Discount rate asal rate se kam ho') : undefined,
    durationMinutes: !((d.durationMinutes ?? 0) >= 5) ? t('Kam az kam 5 minute') : undefined,
    commissionPct: d.commissionPct != null && d.commissionPct > 100 ? t('0 se 100 tak') : undefined,
    forWho: !d.forMen && !d.forWomen && !d.forKids ? t('Kam az kam ek chunein') : undefined,
  };
  const first = Object.values(errors).find(Boolean);
  const charged = d.discountPrice ?? price;
  const profit = charged - (d.costPrice ?? 0) - (charged * (d.commissionPct ?? 0)) / 100 - (d.commissionFixed ?? 0);
  const save = async () => {
    setTried(true);
    if (first) { toast.warning(first); return; }
    setSaving(true);
    try {
      const body = clean({ name: d.name.trim(), code: d.code.trim(), category: d.category, description: d.description.trim(), price, discountPrice: d.discountPrice, costPrice: d.costPrice,
        durationMinutes: d.durationMinutes ?? 30, bufferBefore: d.bufferBefore ?? 0, bufferAfter: d.bufferAfter ?? 0, forMen: d.forMen, forWomen: d.forWomen, forKids: d.forKids,
        commissionPct: d.commissionPct ?? 0, commissionFixed: d.commissionFixed ?? 0, isPopular: d.isPopular, isFeatured: d.isFeatured, isActive: d.isActive, displayOrder: d.displayOrder ?? 0 });
      const s = editing ? await salonApi.services.update(id!, body) : await salonApi.services.create(body);
      refreshSalon(['products-for-pos']);
      toast.success(editing ? t('{{name}} save ho gayi', { name: s.name }) : t('{{name}} ban gayi — ab counter aur booking me hai', { name: s.name }));
      setDirty(false);
      router.back();
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setSaving(false); }
  };
  if (editing && q.isLoading) return <View style={{ padding: th.space(4) }}><Skeleton height={200} /></View>;
  const err = (k: keyof typeof errors) => (tried ? errors[k] : undefined);
  return (
    <FormTemplate title={editing ? t('Edit service') : t('New service')} dirty={dirty} saving={saving} saveDisabled={!canEdit} onSave={() => void save()}
      subtitle={`${formatMoney(charged)} · ${minutesText(d.durationMinutes ?? 0)}`}>
      {!canEdit && <Text size="sm" tone="warning">{t('Service badalne ke liye "Products edit" ki permission chahiye. Aap sirf dekh sakte hain.')}</Text>}
      <FormSection title={t('Service')}>
        <Input label={t('Naam')} value={d.name} onChangeText={(v) => set('name', v)} error={err('name')} />
        <Select label={t('Category')} value={d.category} onChange={(v) => set('category', v)} options={categoryOptions()} />
        <Row gap={2}>
          <View style={{ flex: 1 }}><Input label={t('Code')} value={d.code} onChangeText={(v) => set('code', v)} autoCapitalize="characters" ltr /></View>
          <View style={{ flex: 1 }}><Input label={t('Tarteeb')} keyboardType="number-pad" ltr value={d.displayOrder == null ? '' : String(d.displayOrder)} onChangeText={(v) => set('displayOrder', numIn(v))} /></View>
        </Row>
        <Input label={t('Tafseel')} value={d.description} onChangeText={(v) => set('description', v)} multiline />
      </FormSection>
      <FormSection title={t('Rate aur Cost')}>
        <MoneyInput label={t('Rate')} value={d.price} onChangeValue={(v) => set('price', v)} error={err('price')} />
        <MoneyInput label={t('Discount rate')} value={d.discountPrice} onChangeValue={(v) => set('discountPrice', v)} error={err('discountPrice')} />
        <MoneyInput label={t('Dukaan ki Cost')} value={d.costPrice} onChangeValue={(v) => set('costPrice', v)} />
        <Row justify="between"><Text size="sm" tone="muted">{t('Dukaan ko bachega')}</Text><Amount value={profit} weight="bold" tone={profit < 0 ? 'danger' : undefined} /></Row>
      </FormSection>
      <FormSection title={t('Waqt')}>
        <ChipGroup wrap value={String(d.durationMinutes ?? '')} onChange={(v) => set('durationMinutes', Number(v))} options={TIMES.map((m) => ({ value: String(m), label: minutesText(m) }))} />
        <Input label={t('Kitne minute')} keyboardType="number-pad" ltr value={d.durationMinutes == null ? '' : String(d.durationMinutes)} onChangeText={(v) => set('durationMinutes', numIn(v))} error={err('durationMinutes')} />
        <Row gap={2}>
          <View style={{ flex: 1 }}><Input label={t('Pehle tayyari (min)')} keyboardType="number-pad" ltr value={String(d.bufferBefore ?? '')} onChangeText={(v) => set('bufferBefore', numIn(v))} /></View>
          <View style={{ flex: 1 }}><Input label={t('Baad me (min)')} keyboardType="number-pad" ltr value={String(d.bufferAfter ?? '')} onChangeText={(v) => set('bufferAfter', numIn(v))} /></View>
        </Row>
      </FormSection>
      <FormSection title={t('Stylist commission')}>
        <Row gap={2}>
          <View style={{ flex: 1 }}><Input label={t('Commission %')} keyboardType="decimal-pad" ltr value={d.commissionPct == null ? '' : String(d.commissionPct)} onChangeText={(v) => set('commissionPct', numIn(v))} error={err('commissionPct')} /></View>
          <View style={{ flex: 1 }}><MoneyInput label={t('Ya fixed Rs')} value={d.commissionFixed} onChangeValue={(v) => set('commissionFixed', v)} /></View>
        </Row>
        <Text size="xs" tone="muted">{t('Khali chhorein to har stylist ka apna rate lagta hai (Staff page). Package session par list rate par commission banti hai.')}</Text>
      </FormSection>
      <FormSection title={t('Kis ke liye aur counter')}>
        <Switch label={t('Mard')} value={d.forMen} onChange={(v) => set('forMen', v)} />
        <Switch label={t('Khawateen')} value={d.forWomen} onChange={(v) => set('forWomen', v)} />
        <Switch label={t('Bachay')} value={d.forKids} onChange={(v) => set('forKids', v)} />
        {tried && errors.forWho && <Text size="xs" tone="danger">{errors.forWho}</Text>}
        <Switch label={t('Popular')} description={t('Counter par sitara aur upar')} value={d.isPopular} onChange={(v) => set('isPopular', v)} />
        <Switch label={t('Khaas (featured)')} description={t('Rate list me sab se pehle')} value={d.isFeatured} onChange={(v) => set('isFeatured', v)} />
        <Switch label={t('Chalu')} description={t('Band ho to counter aur booking me nahi aati, history rehti hai')} value={d.isActive} onChange={(v) => set('isActive', v)} />
      </FormSection>
    </FormTemplate>
  );
}
