/** New or edit karigar (web CarpentersPage FormModal): code, name, phone, what he makes, and his pay (daily wage or per job). */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { t } from '@/core/i18n';
import { ChipGroup, FormSection, FormTemplate, Input, MoneyInput, Skeleton, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { carpentersApi, type CarpenterInput } from '../api';
import { FURNITURE_KEYS, SKILLS, opt, phoneOk, refreshFurniture } from '../meta';

export function CarpenterFormScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const { guard } = useDeskOnline('furnitureDesk');
  const one = useQuery({ queryKey: [FURNITURE_KEYS.carpenters, 'one', id], queryFn: () => carpentersApi.getOne(id!), enabled: editing });
  const list = useQuery({ queryKey: [FURNITURE_KEYS.carpenters, 'list', ''], queryFn: () => carpentersApi.list(), enabled: !editing });
  const [v, setV] = useState({ employeeCode: '', name: '', phone: '', cnic: '', address: '', specializations: [] as string[], experienceYears: null as number | null, workshopLocation: '', dailyWage: null as number | null, perProjectRate: null as number | null, notes: '' });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const set = (p: Partial<typeof v>) => { setDirty(true); setV((x) => ({ ...x, ...p })); };
  const c = one.data;
  useEffect(() => {
    if (c) { setV({ employeeCode: c.employeeCode, name: c.name, phone: c.phone, cnic: c.cnic ?? '', address: c.address ?? '', specializations: c.specializations ?? [], experienceYears: c.experienceYears ?? null, workshopLocation: c.workshopLocation ?? '', dailyWage: c.dailyWage ?? null, perProjectRate: c.perProjectRate ?? null, notes: c.notes ?? '' }); setDirty(false); }
  }, [c]);
  useEffect(() => { if (!editing && list.data && !v.employeeCode) setV((x) => ({ ...x, employeeCode: `K-${String(list.data!.length + 1).padStart(3, '0')}` })); }, [editing, list.data, v.employeeCode]);

  const errors = {
    employeeCode: !v.employeeCode.trim() ? t('Code likhein') : undefined,
    name: !v.name.trim() ? t('Naam likhein') : undefined,
    phone: !v.phone.trim() ? t('Phone likhein') : !phoneOk(v.phone) ? t('10 se 15 hindse') : undefined,
  };
  const e = (k: keyof typeof errors) => (tried ? errors[k] : undefined);
  const submit = () => guard(async () => {
    setTried(true);
    const first = Object.values(errors).find(Boolean);
    if (first) { toast.error(first); return; }
    const payload: CarpenterInput = {
      employeeCode: v.employeeCode.trim(), name: v.name.trim(), phone: v.phone.trim(), cnic: opt(v.cnic), address: opt(v.address), specializations: v.specializations,
      experienceYears: v.experienceYears ? Math.round(v.experienceYears) : undefined, workshopLocation: opt(v.workshopLocation), dailyWage: v.dailyWage ?? undefined, perProjectRate: v.perProjectRate ?? undefined, notes: opt(v.notes),
    };
    setSaving(true);
    try {
      const r = editing ? await carpentersApi.update(id!, payload) : await carpentersApi.create(payload);
      setDirty(false);
      refreshFurniture([FURNITURE_KEYS.carpenters], false);
      toast.success(editing ? t('Karigar save') : t('Karigar add ho gaya'));
      if (editing) router.back(); else router.replace(`/furniture/carpenters/${r.id}` as never);
    } catch (err) { toast.error(apiErrorMessage(err, t('Save nahi hua'))); } finally { setSaving(false); }
  });

  if (editing && one.isLoading) return <FormTemplate title={t('Karigar')} onSave={() => undefined}><Skeleton height={300} /></FormTemplate>;
  return (
    <FormTemplate title={editing ? t('{{name}} — badlein', { name: c?.name ?? '' }) : t('Naya karigar')} dirty={dirty} saving={saving} onSave={submit}>
      <View style={{ gap: th.space(4) }}>
        <OfflineNote feature="furnitureDesk" />
        <FormSection title={t('Karigar')}>
          <Input label={t('Code')} value={v.employeeCode} onChangeText={(x) => set({ employeeCode: x })} error={e('employeeCode')} disabled={editing} ltr hint={editing ? t('Code nahi badalta') : t('Pay isi code se jurti hai')} />
          <Input label={t('Naam')} value={v.name} onChangeText={(x) => set({ name: x })} placeholder={t('Ustad Rafiq')} error={e('name')} />
          <Input label={t('Phone')} keyboardType="phone-pad" ltr value={v.phone} onChangeText={(x) => set({ phone: x })} placeholder="03001234567" error={e('phone')} />
          <Input label={t('CNIC')} keyboardType="number-pad" ltr value={v.cnic} onChangeText={(x) => set({ cnic: x })} hint={t('Marzi hai')} />
          <NumberInput label={t('Tajurba (saal)')} integer value={v.experienceYears} onChangeValue={(x) => set({ experienceYears: x })} />
          <Input label={t('Workshop')} value={v.workshopLocation} onChangeText={(x) => set({ workshopLocation: x })} placeholder={t('Main workshop')} />
          <Input label={t('Pata')} value={v.address} onChangeText={(x) => set({ address: x })} hint={t('Marzi hai')} />
        </FormSection>
        <FormSection title={t('Kya banata hai')}>
          <ChipGroup wrap multiple value={v.specializations} onChange={(specializations) => set({ specializations })} options={SKILLS.map((k) => ({ value: k, label: k }))} />
        </FormSection>
        <FormSection title={t('Pay')}>
          <MoneyInput label={t('Dihari (Rs / din)')} value={v.dailyWage} onChangeValue={(x) => set({ dailyWage: x })} hint={t('Rozana pay leta hai to')} />
          <MoneyInput label={t('Fi kaam (Rs)')} value={v.perProjectRate} onChangeValue={(x) => set({ perProjectRate: x })} hint={t('Har order ka thekay ka rate')} />
          <Input label={t('Note')} value={v.notes} onChangeText={(x) => set({ notes: x })} multiline />
        </FormSection>
      </View>
    </FormTemplate>
  );
}
