/**
 * Customer measurements (web MeasurementsPage): a customer can have several
 * naap profiles (inch or cm). The list searches by customer; a profile starts
 * a stitching order in one tap; the form takes all body measurements.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus, Ruler, Scissors, Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDate } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, ChipGroup, EmptyState, FormSection, FormTemplate, Input, ListRow, ListTemplate, MoneyInput, Row, Segmented, Switch, SwipeRow, TextArea, toast, useDebouncedValue, useTheme } from '@/design';
import { OfflineNote } from '../../_shared/deskKit';
import { MEASURE_FIELDS, measurementsApi, type MeasurementInput, type MeasurementProfile } from '../api';
import { CustomerBox, emptyCustomer, type CustomerValue } from '../components/kit';
import { GENDERS, MEASURE_KEY, measureLabel, opt, refreshGarments } from '../meta';

export function MeasurementsScreen() {
  const can = usePermission();
  const manage = can(P.POS_USE);
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 250);
  const list = useQuery({ queryKey: [MEASURE_KEY, 'page', q], queryFn: () => measurementsApi.page({ page: 1, limit: 60, search: q || undefined }), placeholderData: (p) => p });
  return (
    <ListTemplate<MeasurementProfile> title={t('Measurements')} search={{ value: search, onChange: setSearch, placeholder: t('Customer ya phone') }}
      summary={<View style={{ gap: 8 }}><OfflineNote feature="garmentsDesk" /></View>}
      data={list.data?.items ?? []} loading={list.isLoading} error={!list.data ? list.error : undefined} onRetry={() => void list.refetch()}
      refreshing={list.isRefetching} onRefresh={() => void list.refetch()} keyExtractor={(m) => m.id} empty={<EmptyState icon={Ruler} title={t('Koi naap nahi')} />}
      renderItem={({ item: m }) => (
        <SwipeRow end={manage ? [{ icon: Scissors, label: t('Silai order'), tone: 'brand', onPress: () => router.push({ pathname: '/garments/tailoring/new', params: { customer: m.customerId, naap: m.id } } as never) }] : []}>
          <ListRow divider icon={Ruler} iconTone="accent" title={m.customer?.name ?? t('Customer')} subtitle={`${m.profileName} · ${m.unit === 'CM' ? 'cm' : t('Inch')} · ${formatDate(m.measuredAt)}`}
            trailing={m.isDefault ? <Badge tone="warning" icon={Star}>{t('Main')}</Badge> : undefined} chevron onPress={() => manage && router.push(`/garments/measurements/${m.id}` as never)} />
        </SwipeRow>
      )}
      fab={manage ? { icon: Plus, label: t('New'), onPress: () => router.push('/garments/measurements/new' as never) } : undefined} />
  );
}

export function MeasurementFormScreen() {
  const th = useTheme();
  const params = useLocalSearchParams<{ id?: string; customerId?: string }>();
  const id = params.id && params.id !== 'new' ? params.id : undefined;
  const [customer, setCustomer] = useState<CustomerValue>(emptyCustomer);
  const [name, setName] = useState(t('Aam naap'));
  const [gender, setGender] = useState('');
  const [unit, setUnit] = useState<'INCH' | 'CM'>('INCH');
  const [vals, setVals] = useState<Record<string, number | null>>({});
  const [posture, setPosture] = useState('');
  const [fitting, setFitting] = useState('');
  const [isDefault, setDefault] = useState(false);
  const [dirty, setDirty] = useState(false);
  const one = useQuery({ queryKey: [MEASURE_KEY, 'one', id], enabled: !!id, queryFn: async () => (await measurementsApi.page({ page: 1, limit: 200 })).items.find((m) => m.id === id) ?? null });
  const byCustomer = useQuery({ queryKey: [MEASURE_KEY, 'customer', params.customerId], enabled: !!params.customerId && !id, queryFn: () => measurementsApi.byCustomer(params.customerId!) });
  useEffect(() => {
    const m = one.data;
    if (!m) return;
    setCustomer({ customerId: m.customerId, name: m.customer?.name ?? '', phone: m.customer?.phone ?? '' });
    setName(m.profileName); setGender(m.gender ?? ''); setUnit(m.unit); setPosture(m.postureNotes ?? ''); setFitting(m.fittingNotes ?? ''); setDefault(m.isDefault);
    setVals(Object.fromEntries(MEASURE_FIELDS.map((k) => [k, (m[k] as number | null) ?? null])));
  }, [one.data]);
  useEffect(() => { if (params.customerId && !id && !customer.customerId) setCustomer({ customerId: params.customerId, name: '', phone: '' }); }, [params.customerId, id, customer.customerId]);
  useEffect(() => { if (byCustomer.data && !byCustomer.data.length) setDefault(true); }, [byCustomer.data]);
  const set = (k: string, v: number | null) => { setDirty(true); setVals((x) => ({ ...x, [k]: v })); };
  const save = useMutation({
    mutationFn: () => {
      const body = { customerId: customer.customerId, profileName: name.trim() || undefined, gender: opt(gender), unit, postureNotes: opt(posture), fittingNotes: opt(fitting), isDefault,
        ...Object.fromEntries(MEASURE_FIELDS.filter((k) => (vals[k] ?? 0) > 0).map((k) => [k, vals[k]])) } as MeasurementInput;
      return id ? measurementsApi.update(id, body) : measurementsApi.create(body);
    },
    onSuccess: () => { toast.success(t('Naap save ho gaya')); setDirty(false); refreshGarments([MEASURE_KEY]); router.back(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  const ready = !!customer.customerId;
  return (
    <FormTemplate title={id ? t('Edit naap') : t('Naya naap')} dirty={dirty} saving={save.isPending} saveDisabled={!ready} onSave={() => save.mutate()}>
      <FormSection title={t('Customer')}>
        <CustomerBox value={customer} locked={!!id} onChange={(v) => { setDirty(true); setCustomer(v); }} />
        {!ready && <Button variant="ghost" disabled>{t('Pehle saved customer chunein')}</Button>}
      </FormSection>
      <FormSection title={t('Measurement')}>
        <Input label={t('Profile ka naam')} value={name} onChangeText={(v) => { setDirty(true); setName(v); }} />
        <ChipGroup wrap value={gender} onChange={(v) => { setDirty(true); setGender(v); }} options={GENDERS.map((g) => ({ value: g.value, label: t(g.label) }))} />
        <Segmented value={unit} onChange={(v) => { setDirty(true); setUnit(v); }} options={[{ value: 'INCH', label: t('Inch') }, { value: 'CM', label: 'cm' }]} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          {MEASURE_FIELDS.map((k) => (
            <View key={k} style={{ width: '48%' }}><MoneyInput label={measureLabel(k)} value={vals[k] ?? null} onChangeValue={(v) => set(k, v)} prefix="" size="md" /></View>
          ))}
        </View>
      </FormSection>
      <FormSection title={t('Notes')}>
        <TextArea label={t('Jism ka andaz (posture)')} value={posture} onChangeText={(v) => { setDirty(true); setPosture(v); }} />
        <TextArea label={t('Fitting notes')} value={fitting} onChangeText={(v) => { setDirty(true); setFitting(v); }} />
        <Switch value={isDefault} onChange={(v) => { setDirty(true); setDefault(v); }} label={t('Is customer ka main naap')} />
      </FormSection>
    </FormTemplate>
  );
}
