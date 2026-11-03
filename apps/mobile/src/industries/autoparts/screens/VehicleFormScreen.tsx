/** Add or change a customer's vehicle (web VehicleFormModal): number plate, company / model / year, owner (linked to the khata by phone), meter, and paper dates that drive the reminders. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { digitsOf, plate } from '@nafaa/core/industries/autoparts';
import { apiErrorMessage } from '@/core/api/errors';
import { t } from '@/core/i18n';
import { ChipGroup, DatePicker, FormSection, FormTemplate, Input, Select, Skeleton, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { OfflineNote, dateToKey, keyToDate, useDeskOnline } from '../../_shared/deskKit';
import { customerVehiclesApi, vehicleMakesApi, vehicleModelsApi, type FuelType, type VehicleInput, type VehicleType } from '../api';
import { FUEL, MAKES_KEY, MODELS_KEY, VEHICLE_KEY, VEHICLE_TYPES, opt, refreshAuto, vehicleTypeOf } from '../meta';

const day = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');

export function VehicleFormScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const { guard } = useDeskOnline('autopartsDesk');
  const one = useQuery({ queryKey: [VEHICLE_KEY, 'one', id], queryFn: () => customerVehiclesApi.getOne(id!), enabled: editing });
  const [f, setF] = useState({
    reg: '', makeId: '', makeName: '', modelId: '', modelName: '', type: 'CAR' as VehicleType, year: null as number | null, color: '', fuel: 'PETROL' as FuelType, odometer: null as number | null,
    owner: '', phone: '', cnic: '', chassis: '', engine: '', insurer: '', insurance: '', token: '', fitness: '', notes: '',
  });
  const [dirty, setDirty] = useState(false);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (p: Partial<typeof f>) => { setDirty(true); setF((x) => ({ ...x, ...p })); };
  const v = one.data;
  useEffect(() => {
    if (!v) return;
    setF({ reg: v.registrationNumber, makeId: v.makeId ?? '', makeName: v.makeName ?? '', modelId: v.modelId ?? '', modelName: v.modelName ?? '', type: (v.vehicleType as VehicleType) ?? 'CAR', year: v.year ?? null, color: v.color ?? '', fuel: v.fuelType ?? 'PETROL',
      odometer: v.odometerKm ?? null, owner: v.ownerName ?? '', phone: v.ownerPhone ?? '', cnic: v.ownerCnic ?? '', chassis: v.chassisNumber ?? '', engine: v.engineNumber ?? '', insurer: v.insuranceProvider ?? '',
      insurance: day(v.insuranceExpiry), token: day(v.tokenTaxExpiry), fitness: day(v.fitnessExpiry), notes: v.notes ?? '' });
    setDirty(false);
  }, [v]);
  const makes = useQuery({ queryKey: [MAKES_KEY, 'active'], queryFn: () => vehicleMakesApi.list({ active: true }), staleTime: 5 * 60_000 });
  const models = useQuery({ queryKey: [MODELS_KEY, f.makeId], queryFn: () => vehicleModelsApi.list({ makeId: f.makeId, active: true }), enabled: !!f.makeId, staleTime: 5 * 60_000 });

  const errors: Record<string, string> = {};
  if (plate(f.reg).length < 3) errors.reg = t('Gaari ka number likhein');
  if (f.year && (f.year < 1950 || f.year > new Date().getFullYear() + 1)) errors.year = t('Saal sahi likhein');
  if (f.phone && digitsOf(f.phone).length < 10) errors.phone = t('Phone poora likhein');
  const err = (k: string) => (tried ? errors[k] : undefined);

  const submit = () => guard(async () => {
    setTried(true);
    if (Object.keys(errors).length) { toast.error(Object.values(errors)[0]); return; }
    const keep = (x: string) => (editing ? x.trim() : opt(x));
    const body: VehicleInput = {
      registrationNumber: plate(f.reg), makeId: opt(f.makeId), makeName: opt(f.makeName), modelId: opt(f.modelId), modelName: opt(f.modelName), vehicleType: f.type, year: f.year ?? undefined,
      color: keep(f.color), fuelType: f.fuel, odometerKm: f.odometer ?? undefined, ownerName: keep(f.owner), ownerPhone: keep(f.phone), ownerCnic: keep(f.cnic), chassisNumber: keep(f.chassis), engineNumber: keep(f.engine),
      insuranceProvider: keep(f.insurer), insuranceExpiry: editing ? f.insurance : opt(f.insurance), tokenTaxExpiry: editing ? f.token : opt(f.token), fitnessExpiry: editing ? f.fitness : opt(f.fitness), notes: keep(f.notes),
    };
    setSaving(true);
    try {
      const r = editing ? await customerVehiclesApi.update(id!, body) : await customerVehiclesApi.create(body);
      setDirty(false);
      refreshAuto([VEHICLE_KEY, 'customers-directory']);
      toast.success(editing ? t('Gaari save ho gayi') : t('{{registrationNumber}} darj ho gayi', { registrationNumber: r.registrationNumber }));
      if (editing) router.back(); else router.replace(`/autoparts/vehicles/${r.id}` as never);
    } catch (e) { toast.error(apiErrorMessage(e, t('Gaari save nahi hui'))); } finally { setSaving(false); }
  });

  if (editing && one.isLoading) return <FormTemplate title={t('Gaari')} onSave={() => undefined}><Skeleton height={300} /></FormTemplate>;
  return (
    <FormTemplate title={editing ? t('Gaari badlein — {{registrationNumber}}', { registrationNumber: v?.registrationNumber ?? '' }) : t('Nayi gaari darj karein')} subtitle={t('Malik ka phone likhein to gaari us ke khata se jur jati hai')} dirty={dirty} saving={saving} onSave={submit}>
      <View style={{ gap: th.space(4) }}>
        <OfflineNote feature="autopartsDesk" />
        <FormSection title={t('Gaari')}>
          <Input label={t('Gaari ka number')} value={f.reg} onChangeText={(x) => set({ reg: x.toUpperCase() })} placeholder={t('LEA-1234')} autoCapitalize="characters" ltr error={err('reg')} />
          <Select label={t('Gaari ki type')} value={f.type} searchable onChange={(x) => set({ type: x as VehicleType })} options={VEHICLE_TYPES.map((x) => ({ value: x, label: vehicleTypeOf(x) }))} />
          <ChipGroup wrap value={f.fuel} onChange={(x) => set({ fuel: x as FuelType })} options={FUEL.map((x) => ({ value: x.value, label: t(x.label) }))} />
          <Select label={t('Company')} value={f.makeId} searchable placeholder={f.makeName && !f.makeId ? f.makeName : t('Chunein')} onChange={(x) => set({ makeId: x, makeName: makes.data?.find((m) => m.id === x)?.name ?? '', modelId: '', modelName: '' })} options={(makes.data ?? []).map((m) => ({ value: m.id, label: m.name }))} />
          <Select label={t('Model')} value={f.modelId} searchable disabled={!f.makeId} placeholder={f.modelName && !f.modelId ? f.modelName : t('Chunein')}
            onChange={(x) => { const m = models.data?.find((y) => y.id === x); set({ modelId: x, modelName: m?.name ?? '', ...(m && { type: m.vehicleType }) }); }} options={(models.data ?? []).map((m) => ({ value: m.id, label: m.name }))} />
          <NumberInput label={t('Saal')} integer value={f.year} onChangeValue={(x) => set({ year: x })} placeholder="2016" error={err('year')} />
          <Input label={t('Rang')} value={f.color} onChangeText={(x) => set({ color: x })} placeholder={t('Safed')} />
          <NumberInput label={t('Meter (km)')} integer value={f.odometer} onChangeValue={(x) => set({ odometer: x })} placeholder="84500" />
          <Input label={t('Chassis number')} value={f.chassis} onChangeText={(x) => set({ chassis: x.toUpperCase() })} ltr hint={t('Marzi hai')} />
        </FormSection>
        <FormSection title={t('Malik')}>
          <Input label={t('Malik ka naam')} value={f.owner} onChangeText={(x) => set({ owner: x })} placeholder={t('Bilal Ahmad')} />
          <Input label={t('Phone')} keyboardType="phone-pad" ltr value={f.phone} onChangeText={(x) => set({ phone: x })} placeholder="03001234567" error={err('phone')} hint={t('Reminder WhatsApp isi par')} />
          <Input label={t('CNIC')} keyboardType="number-pad" ltr value={f.cnic} onChangeText={(x) => set({ cnic: x })} hint={t('Marzi hai')} />
        </FormSection>
        <FormSection title={t('Kaghzat')} description={t('Kaghzat ki date likhein — 30 din pehle reminder')}>
          <Input label={t('Insurance company')} value={f.insurer} onChangeText={(x) => set({ insurer: x })} placeholder={t('Adamjee')} />
          <DatePicker label={t('Insurance khatam')} value={keyToDate(f.insurance)} onChange={(x) => set({ insurance: dateToKey(x) })} />
          <DatePicker label={t('Token tax khatam')} value={keyToDate(f.token)} onChange={(x) => set({ token: dateToKey(x) })} />
          <DatePicker label={t('Fitness khatam')} value={keyToDate(f.fitness)} onChange={(x) => set({ fitness: dateToKey(x) })} hint={t('Commercial gaari')} />
          <Input label={t('Note')} value={f.notes} onChangeText={(x) => set({ notes: x })} placeholder={t('Customer hamesha synthetic oil leta hai…')} multiline />
        </FormSection>
      </View>
    </FormTemplate>
  );
}
