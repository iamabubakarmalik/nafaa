/**
 * Season rate wizard (web RatePlansPage form): name and type, dates, how much
 * the price moves (percent or amount), the nights, days of the week, room
 * types and booking sources it covers, with a live example of the new rate.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { ChipGroup, DatePicker, FormSection, FormTemplate, Input, Row, Segmented, Select, Skeleton, Switch, Text, toast, useTheme } from '@/design';
import { dateToKey, errorText, keyToDate, numIn, todayKey } from '../../_shared/deskKit';
import { clean } from '../../_shared/serviceKit';
import { hotelApi } from '../api';
import { HOTEL_KEYS, MEAL_PLANS, SOURCES, opts, refreshHotel } from '../meta';

const PLAN_TYPES = [['SEASON', 'Season'], ['PEAK', 'Peak'], ['OFF_SEASON', 'Off season'], ['WEEKEND', 'Weekend'], ['PROMO', 'Offer'], ['CORPORATE', 'Company'], ['LONG_STAY', 'Lamba qayam']] as const;
const DAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];

export function RatePlanFormScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id && id !== 'new';
  const canEdit = usePermission()(P.PRODUCTS_EDIT);
  const plans = useQuery({ queryKey: [HOTEL_KEYS.ratePlans], queryFn: () => hotelApi.ratePlans.list(), enabled: editing });
  const types = useQuery({ queryKey: [HOTEL_KEYS.roomTypes, 'all'], queryFn: () => hotelApi.roomTypes.list() });
  const [f, setF] = useState({ name: '', code: '', description: '', planType: 'SEASON', startDate: todayKey(), endDate: todayKey(), isPercentage: true, adjustment: 10 as number | null, mealPlan: 'ROOM_ONLY',
    minNights: null as number | null, maxNights: null as number | null, days: [] as number[], roomTypeIds: [] as string[], sources: [] as string[], isActive: true });
  const [sign, setSign] = useState<'up' | 'down'>('up');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const p = plans.data?.find((x) => x.id === id);
    if (!p) return;
    setF({ name: p.name, code: p.code, description: p.description ?? '', planType: p.planType, startDate: p.startDate.slice(0, 10), endDate: p.endDate.slice(0, 10), isPercentage: p.isPercentage, adjustment: Math.abs(p.adjustment),
      mealPlan: p.mealPlan ?? 'ROOM_ONLY', minNights: p.minNights ?? null, maxNights: p.maxNights ?? null, days: p.applicableDays ?? [], roomTypeIds: p.applicableRoomTypeIds ?? [], sources: p.applicableSources ?? [], isActive: p.isActive });
    setSign(p.adjustment < 0 ? 'down' : 'up');
  }, [plans.data, id]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((x) => ({ ...x, [k]: v })); setDirty(true); };
  const signed = (f.adjustment ?? 0) * (sign === 'down' ? -1 : 1);
  const sample = types.data?.find((x) => !f.roomTypeIds.length || f.roomTypeIds.includes(x.id));
  const example = sample ? Math.max(Math.round(f.isPercentage ? sample.basePrice * (1 + signed / 100) : sample.basePrice + signed), 0) : null;
  const err = f.name.trim().length < 2 ? t('Naam likhein') : !f.code.trim() ? t('Code likhein') : f.endDate < f.startDate ? t('Khatam ki tareekh pehle nahi ho sakti') : f.adjustment == null ? t('Farq likhein') : undefined;
  const save = async () => {
    if (err) { toast.warning(err); return; }
    setSaving(true);
    try {
      const body = clean({ name: f.name.trim(), code: f.code.trim().toUpperCase(), description: f.description.trim(), planType: f.planType, startDate: f.startDate, endDate: f.endDate, mealPlan: f.mealPlan, isPercentage: f.isPercentage, adjustment: signed,
        minNights: f.minNights, maxNights: f.maxNights, applicableDays: f.days, applicableRoomTypeIds: f.roomTypeIds, applicableSources: f.sources, isActive: f.isActive });
      if (editing) await hotelApi.ratePlans.update(id!, body); else await hotelApi.ratePlans.create(body);
      refreshHotel(); toast.success(t('Save ho gaya')); setDirty(false); router.back();
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setSaving(false); }
  };
  if (editing && plans.isLoading) return <View style={{ padding: th.space(4) }}><Skeleton height={200} /></View>;
  return (
    <FormTemplate title={editing ? t('Edit season rate') : t('New season rate')} dirty={dirty} saving={saving} saveDisabled={!canEdit} onSave={() => void save()}>
      <FormSection title={t('Rate')}>
        <Input label={t('Naam')} value={f.name} onChangeText={(v) => set('name', v)} />
        <Row gap={2}>
          <View style={{ flex: 1 }}><Input label={t('Code')} value={f.code} onChangeText={(v) => set('code', v)} autoCapitalize="characters" ltr /></View>
          <View style={{ flex: 1 }}><Select label={t('Qism')} value={f.planType} onChange={(v) => set('planType', v)} options={PLAN_TYPES.map(([value, label]) => ({ value, label: t(label) }))} /></View>
        </Row>
        <Input label={t('Tafseel')} value={f.description} onChangeText={(v) => set('description', v)} multiline />
      </FormSection>
      <FormSection title={t('Kab')}>
        <Row gap={2}>
          <View style={{ flex: 1 }}><DatePicker label={t('Se')} value={keyToDate(f.startDate)!} onChange={(d) => set('startDate', dateToKey(d))} /></View>
          <View style={{ flex: 1 }}><DatePicker label={t('Tak')} value={keyToDate(f.endDate)!} onChange={(d) => set('endDate', dateToKey(d))} /></View>
        </Row>
        <ChipGroup multiple wrap value={f.days.map(String)} onChange={(v) => set('days', v.map(Number))} options={DAYS.map((d, i) => ({ value: String(i), label: t(d) }))} />
        <Text size="xs" tone="muted">{t('Khali chhorein to har din lagega')}</Text>
      </FormSection>
      <FormSection title={t('Farq (+ mehnga, − sasta)')}>
        <Segmented value={sign} onChange={(v) => { setSign(v as 'up' | 'down'); setDirty(true); }} options={[{ value: 'up', label: t('Mehnga') }, { value: 'down', label: t('Sasta') }]} />
        <Switch label={t('Percent me')} value={f.isPercentage} onChange={(v) => set('isPercentage', v)} />
        <Input label={f.isPercentage ? t('Percent') : t('Rakam')} keyboardType="decimal-pad" ltr value={f.adjustment == null ? '' : String(f.adjustment)} onChangeText={(v) => set('adjustment', numIn(v))} />
        {example !== null && sample && <Text size="sm" tone="muted">{t('Misaal: {{name}} {{from}} se {{to}}', { name: sample.name, from: formatMoney(sample.basePrice), to: formatMoney(example) })}</Text>}
        <Row gap={2}>
          <View style={{ flex: 1 }}><Input label={t('Kam az kam raatein')} keyboardType="number-pad" ltr value={f.minNights ? String(f.minNights) : ''} onChangeText={(v) => set('minNights', numIn(v))} /></View>
          <View style={{ flex: 1 }}><Input label={t('Ziyada se ziyada raatein')} keyboardType="number-pad" ltr value={f.maxNights ? String(f.maxNights) : ''} onChangeText={(v) => set('maxNights', numIn(v))} /></View>
        </Row>
        <Select label={t('Khana')} value={f.mealPlan} onChange={(v) => set('mealPlan', v)} options={opts(MEAL_PLANS)} />
      </FormSection>
      <FormSection title={t('Kin par lagega')}>
        <ChipGroup multiple wrap value={f.roomTypeIds} onChange={(v) => set('roomTypeIds', v)} options={(types.data ?? []).map((x) => ({ value: x.id, label: x.name }))} />
        <ChipGroup multiple wrap value={f.sources} onChange={(v) => set('sources', v)} options={opts(SOURCES)} />
        <Text size="xs" tone="muted">{t('Khali chhorein to sab room types aur sab sources par lagega')}</Text>
        <Switch label={t('Chalu')} value={f.isActive} onChange={(v) => set('isActive', v)} />
      </FormSection>
    </FormTemplate>
  );
}
